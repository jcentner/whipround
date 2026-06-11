import { describe, it, expect } from "vitest";
import { parseLeaderboard } from "../../market/topofbook";
import fixture from "./fixtures/leaderboard.json";

describe("parseLeaderboard", () => {
  const at = new Date("2026-06-11T21:10:00.000Z");
  const book = parseLeaderboard(fixture, at);

  it("reports the highest bid as top-of-book, in cents", () => {
    expect(book.topBidCents).toBe(11000); // $110.00
  });

  it("converts dollar bids to cents without float drift", () => {
    expect(book.top10[2]!.bidCents).toBe(5202); // $52.02
  });

  it("keeps leaderboard order and advertiser names", () => {
    expect(book.top10[0]!.advertiser).toBe("Fluidstack");
    expect(book.top10[1]!.advertiser).toBe("here.now");
  });

  it("labels blank advertisers", () => {
    expect(book.top10[3]!.advertiser).toBe("(anonymous)");
  });

  it("derives blocks remaining from impressions", () => {
    expect(book.top10[0]!.blocksRemaining).toBe(58); // round(57553 / 1000)
  });

  it("passes through fetchedAt and is not stale", () => {
    expect(book.fetchedAt).toBe(at);
    expect(book.stale).toBe(false);
  });

  it("throws on an empty or malformed payload", () => {
    expect(() => parseLeaderboard({ top: [] }, at)).toThrow();
    expect(() => parseLeaderboard({}, at)).toThrow();
    expect(() => parseLeaderboard(null, at)).toThrow();
  });
});
