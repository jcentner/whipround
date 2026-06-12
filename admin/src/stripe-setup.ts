/**
 * `stripe-setup` — build a campaign's whole Stripe money path in one command.
 *
 * One Product, four Prices ($5/$10/$25 one-time + a customer-chooses-price,
 * min $5 per D13), and one Payment Link per Price (each redirects back to the
 * site with `?pledged=1`). The founder shouldn't click through the Stripe
 * dashboard for every campaign (D11: the admin surface is a CLI, not a panel).
 *
 * The pure part — the campaign.ts block printer — is unit-tested; the Stripe
 * round-trips are thin wrappers. Nothing is created without `--yes`.
 */
import type Stripe from "stripe";
import { formatUsd } from "../../web/lib/format";

/** Pledgers land back here after checkout (the page shows the thank-you + thermometer). */
export const REDIRECT_URL = "https://whipround.dev/?pledged=1";

/** A pledge tier: a fixed amount, or a customer-chooses-price with a minimum. */
export type PledgeTier =
  | { kind: "fixed"; amountCents: number }
  | { kind: "custom"; minCents: number };

/** The tiers every campaign sells, in the order they appear on the page. */
export const PLEDGE_TIERS: PledgeTier[] = [
  { kind: "fixed", amountCents: 500 },
  { kind: "fixed", amountCents: 1000 },
  { kind: "fixed", amountCents: 2500 },
  { kind: "custom", minCents: 500 }, // $5 floor — D13
];

/** Stripe Product name for a campaign. Used both to create and to guard duplicates. */
export function productName(beneficiary: string): string {
  return `Whipround — ${beneficiary}`;
}

/** One pasteable pledge link, matching the campaign.ts `pledgeLinks` shape. */
export interface PledgeLink {
  amountCents: number | "custom";
  url: string;
}

/**
 * The exact `campaign.ts` block to paste after setup — `stripeProductId` plus
 * the ordered `pledgeLinks`. Print, don't write the file (same philosophy as
 * `promote`). Pure + unit-tested: this is the one output a typo silently breaks.
 */
export function formatCampaignBlock(
  productId: string,
  links: PledgeLink[],
): string {
  const rows = links.map((l) => {
    const amount =
      typeof l.amountCents === "number" ? String(l.amountCents) : '"custom"';
    return `    { amountCents: ${amount}, url: "${l.url}" },`;
  });
  return [
    `  stripeProductId: "${productId}",`,
    "  pledgeLinks: [",
    ...rows,
    "  ],",
  ].join("\n");
}

/** Human-readable "here is what I will create" plan, printed before `--yes`. */
export function planSummary(beneficiary: string): string[] {
  const lines = [
    `Product:  ${productName(beneficiary)}`,
    `Payment Links (after-payment redirect → ${REDIRECT_URL}):`,
  ];
  for (const tier of PLEDGE_TIERS) {
    lines.push(
      tier.kind === "fixed"
        ? `  · ${formatUsd(tier.amountCents)} one-time`
        : `  · customer-chooses-price (min ${formatUsd(tier.minCents)})`,
    );
  }
  return lines;
}

/**
 * The active Product with this exact name, if any — the duplicate guard so a
 * re-run can't orphan a second set of Prices and Payment Links. Stripe has no
 * server-side name filter, so list active products and match here (the set is
 * tiny: one Product per campaign).
 */
export async function findActiveProductByName(
  stripe: Stripe,
  name: string,
): Promise<Stripe.Product | null> {
  for await (const product of stripe.products.list({ active: true, limit: 100 })) {
    if (product.name === name) return product;
  }
  return null;
}

/**
 * Create the Product, its four pledge Prices, and a Payment Link per Price.
 * Returns the id + links ready for `formatCampaignBlock`. Test vs live mode
 * follows the secret key, so the caller passes whichever Stripe instance it built.
 */
export async function createCampaignStripe(
  stripe: Stripe,
  beneficiary: string,
): Promise<{ productId: string; links: PledgeLink[] }> {
  const product = await stripe.products.create({ name: productName(beneficiary) });
  const links: PledgeLink[] = [];

  for (const tier of PLEDGE_TIERS) {
    const price = await stripe.prices.create(
      tier.kind === "fixed"
        ? { product: product.id, currency: "usd", unit_amount: tier.amountCents }
        : {
            product: product.id,
            currency: "usd",
            custom_unit_amount: { enabled: true, minimum: tier.minCents },
          },
    );
    const link = await stripe.paymentLinks.create({
      line_items: [{ price: price.id, quantity: 1 }],
      after_completion: { type: "redirect", redirect: { url: REDIRECT_URL } },
    });
    links.push({
      amountCents: tier.kind === "fixed" ? tier.amountCents : "custom",
      url: link.url,
    });
  }

  return { productId: product.id, links };
}
