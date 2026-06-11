/**
 * Open Graph share image — the campaign as a tweet embed.
 *
 * Renders a 1200×630 PNG of the live thermometer state so a shared link unfurls
 * with up-to-date progress. satori (flexbox → SVG) + resvg (SVG → PNG).
 */
import { readFileSync } from "node:fs";
import satori from "satori";
import { Resvg } from "@resvg/resvg-js";
import { formatUsd } from "./format";

export interface OgData {
  headline: string;
  pledgedCents: number;
  goalCents: number;
  pledgerCount: number;
  fraction: number;
}

let fontCache: Buffer | null = null;
function ogFont(): Buffer {
  if (fontCache) return fontCache;
  // public/ in dev (cwd = web); copied to dist/client/ by the standalone build.
  for (const candidate of ["dist/client/og.ttf", "public/og.ttf"]) {
    try {
      fontCache = readFileSync(candidate);
      return fontCache;
    } catch {
      /* try next candidate */
    }
  }
  throw new Error("OG font not found (expected public/og.ttf)");
}

interface Node {
  type: string;
  props: { style: Record<string, unknown>; children?: unknown };
}
function box(style: Record<string, unknown>, children?: unknown): Node {
  return { type: "div", props: { style: { display: "flex", ...style }, children } };
}

export async function renderOgPng(data: OgData): Promise<Buffer> {
  const pct = Math.round(Math.min(1, Math.max(0, data.fraction)) * 100);

  const tree = box(
    {
      flexDirection: "column",
      width: "1200px",
      height: "630px",
      padding: "64px",
      backgroundColor: "#0b0c10",
      color: "#e8eaed",
      fontFamily: "JBMono",
    },
    [
      box({ fontSize: "30px", color: "#9aa0a6", letterSpacing: "3px" }, "WHIPROUND"),
      box(
        { marginTop: "28px", fontSize: "58px", lineHeight: "66px", color: "#e8eaed" },
        data.headline,
      ),
      box({ flexDirection: "column", marginTop: "auto" }, [
        box(
          { fontSize: "44px", color: "#4cc38a" },
          `${formatUsd(data.pledgedCents)} of ${formatUsd(data.goalCents)}`,
        ),
        box(
          {
            width: "100%",
            height: "44px",
            marginTop: "22px",
            backgroundColor: "#23252b",
            borderRadius: "999px",
          },
          [
            box(
              {
                width: `${pct}%`,
                height: "44px",
                backgroundColor: "#4cc38a",
                borderRadius: "999px",
              },
              "",
            ),
          ],
        ),
        box(
          { marginTop: "22px", fontSize: "30px", color: "#9aa0a6" },
          `${data.pledgerCount} pledgers · ${pct}% funded · write-it-right.ai`,
        ),
      ]),
    ],
  );

  const svg = await satori(tree as unknown as Parameters<typeof satori>[0], {
    width: 1200,
    height: 630,
    fonts: [{ name: "JBMono", data: ogFont(), weight: 700, style: "normal" }],
  });

  return new Resvg(svg, { fitTo: { mode: "width", value: 1200 } }).render().asPng();
}
