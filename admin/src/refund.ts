import type Stripe from "stripe";
import type { PledgeSession } from "../../web/lib/progress";

/** Cents still refundable on a pledge: the paid total minus anything already refunded. */
export function refundableCents(s: PledgeSession): number {
  return s.paid ? Math.max(0, s.amountTotalCents - s.amountRefundedCents) : 0;
}

/**
 * The pledges a campaign refund would touch: paid, for this product (the caller
 * already scoped the list), and not already fully refunded. Pure + tested.
 */
export function selectRefundTargets(sessions: PledgeSession[]): PledgeSession[] {
  return sessions.filter((s) => refundableCents(s) > 0);
}

/** Total cents that would be refunded across the given targets. */
export function refundTotalCents(targets: PledgeSession[]): number {
  return targets.reduce((sum, s) => sum + refundableCents(s), 0);
}

/** Issue the refunds. With `dryRun`, computes the plan but charges nothing. */
export async function executeRefunds(
  stripe: Stripe,
  targets: PledgeSession[],
  opts: { dryRun: boolean },
): Promise<{ refunded: number; totalCents: number; skipped: string[] }> {
  let refunded = 0;
  let totalCents = 0;
  const skipped: string[] = [];

  for (const s of targets) {
    const amount = refundableCents(s);
    if (amount <= 0) continue;
    if (!s.paymentIntentId) {
      skipped.push(s.sessionId);
      continue;
    }
    if (!opts.dryRun) {
      await stripe.refunds.create({ payment_intent: s.paymentIntentId, amount });
    }
    refunded += 1;
    totalCents += amount;
  }

  return { refunded, totalCents, skipped };
}
