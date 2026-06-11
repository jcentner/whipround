/**
 * Pledge progress — Stripe is the database (D3).
 *
 * Lists paid Checkout sessions for the campaign's Stripe product and
 * aggregates. No DB, no PII retained: aggregates only.
 *
 * TODO(opus) T4:
 *  - implement via Stripe API (list checkout sessions filtered to the
 *    campaign product, status=paid; exclude refunded amounts)
 *  - cache ~60s in-process (single long-lived Node process per D7; staleness beats hammering Stripe)
 *  - unit-test the aggregation math with fixture sessions, incl. a partial refund
 */

export interface Progress {
  pledgedCents: number;
  pledgerCount: number;
  goalCents: number;
  /** pledgedCents / goalCents, clamped to [0, 1] for the thermometer. */
  fraction: number;
}

export async function getProgress(): Promise<Progress> {
  // TODO(opus) T4
  throw new Error("not implemented");
}
