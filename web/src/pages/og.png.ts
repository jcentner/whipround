import type { APIRoute } from "astro";
import { getProgress } from "../../lib/progress";
import { campaign } from "../../lib/campaign";
import { renderOgPng } from "../../lib/og";

// Rendered on demand so the share card reflects live thermometer state. Cached
// a few minutes; social scrapers re-fetch periodically.
export const prerender = false;

export const GET: APIRoute = async () => {
  const progress = await getProgress();
  const png = await renderOgPng({
    headline: campaign.headline,
    pledgedCents: progress.pledgedCents,
    goalCents: progress.goalCents,
    pledgerCount: progress.pledgerCount,
    fraction: progress.fraction,
  });

  return new Response(new Uint8Array(png), {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=300",
    },
  });
};
