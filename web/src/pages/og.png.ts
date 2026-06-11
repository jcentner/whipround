import type { APIRoute } from "astro";
import { getProgress } from "../../lib/progress";
import { campaign } from "../../lib/campaign";
import { renderOgPng } from "../../lib/og";

// Rendered on demand so the share card reflects live thermometer state. Cached
// a few minutes; social scrapers re-fetch periodically.
export const prerender = false;

// The render is synchronous native CPU work (satori + resvg) and this route
// takes no input, so a cache-busted flood (/og.png?x=1, ?x=2, …) would force a
// fresh render on every hit and pin the 1-vCPU box's event loop. Memoize the
// PNG on the progress snapshot it depicts (getProgress is itself ~60s-cached)
// and share one in-flight render across concurrent misses, so any burst
// collapses to a single render per snapshot.
let cached: { key: string; png: Uint8Array<ArrayBuffer> } | null = null;
let inflight: { key: string; png: Promise<Uint8Array<ArrayBuffer>> } | null = null;

export const GET: APIRoute = async () => {
  const progress = await getProgress();
  const key = `${progress.pledgedCents}:${progress.goalCents}:${progress.pledgerCount}`;

  let png: Uint8Array<ArrayBuffer>;
  if (cached?.key === key) {
    png = cached.png;
  } else {
    if (inflight?.key !== key) {
      const render = renderOgPng({
        headline: campaign.headline,
        pledgedCents: progress.pledgedCents,
        goalCents: progress.goalCents,
        pledgerCount: progress.pledgerCount,
        fraction: progress.fraction,
      })
        .then((buf) => {
          const bytes = new Uint8Array(buf);
          cached = { key, png: bytes };
          return bytes;
        })
        .finally(() => {
          if (inflight?.key === key) inflight = null;
        });
      inflight = { key, png: render };
    }
    png = await inflight.png;
  }

  return new Response(png, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=300",
    },
  });
};
