import type { APIRoute } from "astro";
import { getProgress } from "../../../lib/progress";
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

  const body = { ...progress, topBidCents, topBidStale };
  return new Response(JSON.stringify(body), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=60",
    },
  });
};
