/**
 * Pledge progress — Stripe is the datastore.
 *
 * Pledges are paid Stripe Checkout sessions (created by the campaign's Payment
 * Links, all tied to one Product). This module lists the paid sessions for that
 * Product and reports aggregates only — no names, no emails, no database.
 *
 * The aggregation math is the one number we can't get wrong in public, so it
 * lives in pure, unit-tested functions (`aggregatePledges`, `buildProgress`);
 * the Stripe round-trip is a thin wrapper cached for ~60s.
 */

import Stripe from "stripe";
import { campaign } from "./campaign";

export interface Progress {
  pledgedCents: number;
  pledgerCount: number;
  goalCents: number;
  /** pledgedCents / goalCents, clamped to [0, 1] for the thermometer. */
  fraction: number;
}

/** One paid pledge, reduced to the only fields the math needs. */
export interface PledgeRecord {
  amountTotalCents: number;
  amountRefundedCents: number;
}

/** A Checkout session for the campaign Product, with the fields refunds need. */
export interface PledgeSession extends PledgeRecord {
  sessionId: string;
  paymentIntentId: string | null;
  paid: boolean;
}

/**
 * Sum net pledged cents and count backers. Net excludes refunds; a fully
 * refunded pledge contributes nothing and isn't counted. Pure + tested.
 */
export function aggregatePledges(records: PledgeRecord[]): {
  pledgedCents: number;
  pledgerCount: number;
} {
  let pledgedCents = 0;
  let pledgerCount = 0;
  for (const r of records) {
    const net = r.amountTotalCents - r.amountRefundedCents;
    if (net > 0) {
      pledgedCents += net;
      pledgerCount += 1;
    }
  }
  return { pledgedCents, pledgerCount };
}

/** Assemble a Progress with a clamped fraction. Pure + tested. */
export function buildProgress(
  pledgedCents: number,
  pledgerCount: number,
  goalCents: number,
): Progress {
  const fraction =
    goalCents > 0 ? Math.min(1, Math.max(0, pledgedCents / goalCents)) : 0;
  return { pledgedCents, pledgerCount, goalCents, fraction };
}

const CACHE_TTL_MS = 60_000;
let cached: { value: Progress; at: number } | null = null;

function isConfigured(value: string): boolean {
  return value !== "" && !value.startsWith("[");
}

/**
 * Live pledge progress for the campaign. Reads paid Checkout sessions for the
 * campaign's Stripe Product, cached ~60s. Degrades safely: with no Stripe key
 * (pre-launch / dev) it reports zero raised; on a transient Stripe error it
 * serves the last good value, or zero if there isn't one yet.
 */
export async function getProgress(): Promise<Progress> {
  const now = Date.now();
  if (cached && now - cached.at < CACHE_TTL_MS) {
    return cached.value;
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const productId =
    process.env.WHIPROUND_STRIPE_PRODUCT_ID ?? campaign.stripeProductId;

  if (!secretKey || !isConfigured(productId)) {
    // Pre-launch: nothing wired yet, nothing raised yet.
    const value = buildProgress(0, 0, campaign.goalCents);
    cached = { value, at: now };
    return value;
  }

  try {
    const stripe = new Stripe(secretKey);
    const sessions = await listCampaignPledges(stripe, productId);
    const { pledgedCents, pledgerCount } = aggregatePledges(
      sessions.filter((s) => s.paid),
    );
    const value = buildProgress(pledgedCents, pledgerCount, campaign.goalCents);
    cached = { value, at: now };
    return value;
  } catch {
    if (cached) return cached.value;
    return buildProgress(0, 0, campaign.goalCents);
  }
}

/**
 * List every completed Checkout session that pledged to the campaign Product
 * (paid or not), with the ids and amounts both the thermometer and the refund
 * command need. Shared so the two never drift apart.
 *
 * Scoping: pledges are only ever created by the Product's Stripe Payment Links
 * (see the module header), so we resolve which Payment Links sell the Product
 * once — a small, fixed set — then list sessions scoped to each link with the
 * `payment_link` filter. That avoids scanning every Checkout session on the
 * account (the operating entity has unrelated sessions) and the per-session
 * line-item lookup the old product match needed (a Checkout Session *list*
 * can't expand `line_items`), so the work scales with the handful of Payment
 * Links, not the pledge count.
 */
export async function listCampaignPledges(
  stripe: Stripe,
  productId: string,
): Promise<PledgeSession[]> {
  const out: PledgeSession[] = [];
  for (const paymentLink of await paymentLinksForProduct(stripe, productId)) {
    for await (const session of stripe.checkout.sessions.list({
      payment_link: paymentLink,
      status: "complete",
      limit: 100,
      expand: ["data.payment_intent.latest_charge"],
    })) {
      const pi = session.payment_intent;
      out.push({
        sessionId: session.id,
        paymentIntentId: pi ? (typeof pi === "string" ? pi : pi.id) : null,
        amountTotalCents: session.amount_total ?? 0,
        amountRefundedCents: refundedCentsOf(pi),
        paid: session.payment_status === "paid",
      });
    }
  }
  return out;
}

function refundedCentsOf(
  paymentIntent: string | Stripe.PaymentIntent | null,
): number {
  if (!paymentIntent || typeof paymentIntent === "string") return 0;
  const charge = paymentIntent.latest_charge;
  if (!charge || typeof charge === "string") return 0;
  return charge.amount_refunded ?? 0;
}

/**
 * The ids of the Payment Links that sell the given Product. Payment Links are a
 * small, fixed set (one per pledge amount), so this bounded lookup replaces the
 * old per-session line-item call — its cost doesn't grow with the pledge count.
 */
async function paymentLinksForProduct(
  stripe: Stripe,
  productId: string,
): Promise<string[]> {
  const ids: string[] = [];
  for await (const link of stripe.paymentLinks.list({ limit: 100 })) {
    const items = await stripe.paymentLinks.listLineItems(link.id, {
      limit: 100,
      expand: ["data.price"],
    });
    const sellsProduct = items.data.some((item) => {
      const product = item.price?.product;
      const id = typeof product === "string" ? product : product?.id;
      return id === productId;
    });
    if (sellsProduct) ids.push(link.id);
  }
  return ids;
}
