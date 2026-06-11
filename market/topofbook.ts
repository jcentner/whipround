/**
 * kickbacks.ai market data — top-of-book reader.
 *
 * Reads the public auction leaderboard and reports the top bid plus the visible
 * queue. Used by the campaign page ("right now the spinner costs $X per block")
 * and when sizing a bid.
 *
 * Good-citizen rules — we want kickbacks as a fan, not an adversary:
 *  - At most one live fetch every 5 minutes; serve the in-process cache between.
 *  - Identify ourselves with an honest User-Agent.
 *  - Fail soft: if a fetch fails, return the last-known value flagged `stale`.
 *
 * Dependency-free on purpose (Node built-ins + global fetch only).
 *
 * Data source: GET https://kickbacks.ai/api/auction/leaderboard?limit=10
 *   → { top: [ { rank, display_name, ad_line, bid_usd, impressions_remaining,
 *               impressions_served, impressions_target, block_count, status,
 *               created_at }, ... ] }
 *   `bid_usd` is dollars per block (1 block = 1,000 five-second impressions);
 *   the array is sorted by rank, so `top[0]` is the current top-of-book.
 */

import { pathToFileURL } from "node:url";
import process from "node:process";

export interface BidLevel {
  /** Bid in cents per block (1 block = 1,000 impressions). */
  bidCents: number;
  /** Advertiser display name as shown on the leaderboard. */
  advertiser: string;
  /** Remaining blocks at this level, if the leaderboard exposes it. */
  blocksRemaining?: number;
}

export interface TopOfBook {
  /** Highest bid in cents per block — the price to take #1 is this + an increment. */
  topBidCents: number;
  top10: BidLevel[];
  fetchedAt: Date;
  /** True when serving a cached value because the live fetch failed. */
  stale: boolean;
}

const LEADERBOARD_URL = "https://kickbacks.ai/api/auction/leaderboard?limit=10";
const USER_AGENT = "whipround-market/0.1 (+https://github.com/jcentner/whipround)";
const MIN_FETCH_INTERVAL_MS = 5 * 60 * 1000; // scrape gently
const FETCH_TIMEOUT_MS = 8_000;

let cache: TopOfBook | null = null; // last successful read (stale === false)
let lastAttemptMs = 0; // last live fetch attempt, success or failure

/**
 * Parse a raw leaderboard payload into a TopOfBook. Exported for unit testing.
 * Throws when the payload contains no usable bids.
 */
export function parseLeaderboard(payload: unknown, fetchedAt: Date): TopOfBook {
  const top = (payload as { top?: unknown } | null)?.top;
  if (!Array.isArray(top) || top.length === 0) {
    throw new Error("leaderboard payload has no `top` array");
  }

  const top10: BidLevel[] = top.slice(0, 10).map((raw, i) => {
    const row = (raw ?? {}) as Record<string, unknown>;
    const bidUsd = Number(row.bid_usd);
    if (!Number.isFinite(bidUsd)) {
      throw new Error(
        `leaderboard row ${i} has invalid bid_usd: ${String(row.bid_usd)}`,
      );
    }
    const advertiser = String(row.display_name ?? "").trim() || "(anonymous)";
    const level: BidLevel = { bidCents: Math.round(bidUsd * 100), advertiser };

    const remaining = Number(row.impressions_remaining);
    if (Number.isFinite(remaining)) {
      level.blocksRemaining = Math.round(remaining / 1000);
    }
    return level;
  });

  return {
    topBidCents: top10[0]!.bidCents,
    top10,
    fetchedAt,
    stale: false,
  };
}

/**
 * Top-of-book for the kickbacks.ai auction. Cached in-process for 5 minutes;
 * falls back to the last-known value (flagged `stale`) if a live fetch fails.
 */
export async function getTopOfBook(): Promise<TopOfBook> {
  const now = Date.now();
  if (cache && now - lastAttemptMs < MIN_FETCH_INTERVAL_MS) {
    return cache;
  }
  lastAttemptMs = now;

  try {
    const res = await fetch(LEADERBOARD_URL, {
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!res.ok) {
      throw new Error(`leaderboard HTTP ${res.status}`);
    }
    cache = parseLeaderboard(await res.json(), new Date());
    return cache;
  } catch (err) {
    if (cache) {
      return { ...cache, stale: true };
    }
    throw new Error(
      `kickbacks leaderboard unavailable and no cached value yet: ${
        err instanceof Error ? err.message : String(err)
      }`,
    );
  }
}

// Print live top-of-book when run directly: `npx tsx topofbook.ts`
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  getTopOfBook()
    .then((book) => console.log(JSON.stringify(book, null, 2)))
    .catch((err) => {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    });
}
