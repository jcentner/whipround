/**
 * Single source of truth for campaign content. Everything the page renders comes
 * from this object, so a future campaign is a config change, not a code change.
 * No other file hardcodes campaign facts.
 *
 * Beneficiary and Stripe fields stay as [CAMPAIGN-TBD] / [STRIPE-TBD] placeholders
 * until a campaign is chosen and its beneficiary has given their blessing.
 */

export interface Campaign {
  slug: string;
  /** e.g. `Put "Thanking Daniel for curl…" in 10,000 IDEs` */
  headline: string;
  /** The spinner line itself, ≤60 chars, gerund form to match native spinner verbs. */
  adCopy: string;
  /** Where ad clicks land — the beneficiary's sponsor/donate page. */
  clickUrl: string;
  beneficiaryName: string;
  /** Short pitch: why this tribute, why now. Markdown. */
  story: string;

  // — Economics (see "what your money buys" on the page) —
  goalCents: number;
  targetBlocks: number;
  /** Headroom multiplier for clicks, which bill at 50× the impression rate, e.g. 1.5. */
  clickBufferMultiplier: number;

  // — Mechanics —
  /** Stripe Product id; paid Checkout sessions for it are the pledge ledger. */
  stripeProductId: string;
  /** Stripe Payment Link URLs: one per preset amount + one customer-chooses-price. */
  pledgeLinks: { amountCents: number | "custom"; url: string }[];
  /** Hard refund-if-unfunded date, printed in bold on the page. */
  fundingDeadline: string; // ISO date
}

export const campaign: Campaign = {
  slug: "campaign-1",
  headline: "[CAMPAIGN-TBD]",
  adCopy: "[CAMPAIGN-TBD]",
  clickUrl: "[CAMPAIGN-TBD]",
  beneficiaryName: "[CAMPAIGN-TBD]",
  story: "[CAMPAIGN-TBD]",
  goalCents: 60000, // placeholder goal — re-sized from live top-of-book at launch (D14); floor = goal / targetBlocks (D15)
  targetBlocks: 3,
  clickBufferMultiplier: 1.5,
  stripeProductId: "[STRIPE-TBD]",
  pledgeLinks: [
    { amountCents: 500, url: "[STRIPE-TBD]" },
    { amountCents: 1000, url: "[STRIPE-TBD]" },
    { amountCents: 2500, url: "[STRIPE-TBD]" },
    { amountCents: "custom", url: "[STRIPE-TBD]" },
  ],
  fundingDeadline: "[SET-AT-LAUNCH]",
};
