/**
 * Campaign goal math — kept transparent because the page shows it.
 *
 * A "block" is 1,000 five-second impressions in the spinner. Clicks bill at 50×
 * the impression rate, so a campaign carries a click buffer on top of raw
 * inventory: goal = blocks × top-of-book price × clickBufferMultiplier. Pure
 * functions, unit-tested — this is money math.
 */

export const IMPRESSIONS_PER_BLOCK = 1000;

/** Size a funding goal from a per-block price: blocks × price × buffer, in cents. */
export function sizeGoalCents(
  blockPriceCents: number,
  blocks: number,
  clickBufferMultiplier: number,
): number {
  return Math.round(blockPriceCents * blocks * clickBufferMultiplier);
}

export interface GoalBreakdown {
  goalCents: number;
  targetBlocks: number;
  clickBufferMultiplier: number;
  impressions: number;
  /** The per-block price this goal implies: goal / (blocks × buffer). */
  impliedBlockPriceCents: number;
  /**
   * The funding floor: one block including its click buffer (goal / targetBlocks).
   * Below this the campaign refunds in full; at or above it the tribute runs (D15).
   */
  floorCents: number;
}

/** Explain a configured goal back into its parts, for the "what you're buying" panel. */
export function goalBreakdown(
  goalCents: number,
  targetBlocks: number,
  clickBufferMultiplier: number,
): GoalBreakdown {
  const denom = targetBlocks * clickBufferMultiplier;
  return {
    goalCents,
    targetBlocks,
    clickBufferMultiplier,
    impressions: targetBlocks * IMPRESSIONS_PER_BLOCK,
    impliedBlockPriceCents: denom > 0 ? Math.round(goalCents / denom) : 0,
    floorCents: targetBlocks > 0 ? Math.round(goalCents / targetBlocks) : 0,
  };
}
