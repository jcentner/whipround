/**
 * Displayed-goal resolver (D14 pre-launch clause).
 *
 * Pre-launch the campaign is a "preview": the goal and floor shown on the page
 * and the OG card are sized live from kickbacks.ai top-of-book, so they can't
 * contradict the live price line. At launch the goal is frozen into campaign.ts
 * (the deadline is set) and these helpers return those fixed values with zero
 * code change. A failed or stale market fetch also falls back to the frozen
 * campaign.ts values — the goal never silently tracks a flaky feed.
 */
import { campaign, type Campaign } from "./campaign";
import { sizeGoalCents } from "./economics";

export interface EffectiveGoal {
  goalCents: number;
  floorCents: number;
}

/** Reduced top-of-book snapshot the resolver needs (see market/topofbook.ts). */
export interface MarketSnapshot {
  topBidCents: number | null;
  stale: boolean;
}

function floorOf(goalCents: number, targetBlocks: number): number {
  return targetBlocks > 0 ? Math.round(goalCents / targetBlocks) : 0;
}

/** True until launch: the funding deadline is still the [SET-AT-LAUNCH] placeholder. */
export function isPreview(c: Campaign = campaign): boolean {
  return c.fundingDeadline.startsWith("[");
}

/**
 * Size the displayed goal + floor from a live per-block price:
 * goal = price × blocks × buffer; floor = one block = goal / blocks (D15).
 */
export function sizeGoal(
  topBidCents: number,
  targetBlocks: number,
  clickBufferMultiplier: number,
): EffectiveGoal {
  const goalCents = sizeGoalCents(
    topBidCents,
    targetBlocks,
    clickBufferMultiplier,
  );
  return { goalCents, floorCents: floorOf(goalCents, targetBlocks) };
}

/**
 * The goal + floor to display everywhere. In preview with a fresh top-of-book,
 * sized live; otherwise (launched, or the market stale/unavailable) the frozen
 * campaign.ts values. One source of truth for both /api/progress and the OG
 * card, so the page and the share image can never disagree.
 */
export function effectiveGoal(
  market: MarketSnapshot,
  c: Campaign = campaign,
): EffectiveGoal {
  if (
    isPreview(c) &&
    !market.stale &&
    typeof market.topBidCents === "number" &&
    market.topBidCents > 0
  ) {
    return sizeGoal(market.topBidCents, c.targetBlocks, c.clickBufferMultiplier);
  }
  return { goalCents: c.goalCents, floorCents: floorOf(c.goalCents, c.targetBlocks) };
}

const COFFEE_GOAL_THRESHOLD_CENTS = 50000; // $500

/**
 * Second sentence of the market line, which depends on the *displayed* goal G.
 * Fable-owned copy — paste verbatim. Returns an HTML fragment (numeric-only
 * interpolation, no user input) rendered identically by the page (SSR) and by
 * the island (live, in preview) so the two never disagree.
 */
export function marketCoverageHtml(goalCents: number): string {
  if (goalCents >= COFFEE_GOAL_THRESHOLD_CENTS) {
    return "Split a hundred ways, that's a coffee.";
  }
  const n = Math.ceil(goalCents / 500);
  return `<strong>${n}</strong> people at the $5 minimum cover the whole goal.`;
}
