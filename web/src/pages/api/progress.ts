import type { APIRoute } from "astro";
import { getProgress } from "../../../lib/progress";
import { effectiveGoal } from "../../../lib/preview";
import { getTopOfBook } from "../../../../market/topofbook";

// Rendered on demand so the thermometer reads live Stripe totals and the live
// top-of-book price. Cached ~60s in-process; the Cache-Control header lets
// Cloudflare absorb launch spikes.
export const prerender = false;

export const GET: APIRoute = async () => {
  const progress = await getProgress();

  let topBidCents: number | null = null;
  let topBidStale = true;
  try {
    const market = await getTopOfBook();
    topBidCents = market.topBidCents;
    topBidStale = market.stale;
  } catch {
    /* market unavailable — leave price null; the thermometer still works */
  }

  // Pre-launch the goal/floor are sized live from top-of-book (D14); at launch
  // effectiveGoal returns the frozen campaign.ts values. Substitute the goal and
  // recompute the fraction so the thermometer, ledger, and OG card all agree.
  const { goalCents, floorCents } = effectiveGoal({ topBidCents, stale: topBidStale });
  const fraction =
    goalCents > 0 ? Math.min(1, Math.max(0, progress.pledgedCents / goalCents)) : 0;

  const body = {
    pledgedCents: progress.pledgedCents,
    pledgerCount: progress.pledgerCount,
    goalCents,
    floorCents,
    fraction,
    topBidCents,
    topBidStale,
  };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
};
