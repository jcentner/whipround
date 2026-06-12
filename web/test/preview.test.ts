import { describe, it, expect } from "vitest";
import {
  sizeGoal,
  effectiveGoal,
  isPreview,
  marketCoverageHtml,
} from "../lib/preview";
import { campaign, type Campaign } from "../lib/campaign";

const preview: Campaign = {
  ...campaign,
  goalCents: 60000,
  targetBlocks: 3,
  clickBufferMultiplier: 1.5,
  fundingDeadline: "[SET-AT-LAUNCH]",
};
const launched: Campaign = { ...preview, fundingDeadline: "2026-07-01" };

describe("sizeGoal", () => {
  it("sizes goal = price × blocks × buffer and floor = one block", () => {
    expect(sizeGoal(8000, 3, 1.5)).toEqual({ goalCents: 36000, floorCents: 12000 });
  });

  it("guards against zero blocks", () => {
    expect(sizeGoal(8000, 0, 1.5)).toEqual({ goalCents: 0, floorCents: 0 });
  });
});

describe("isPreview", () => {
  it("is true while the deadline is a placeholder", () => {
    expect(isPreview(preview)).toBe(true);
  });

  it("is false once a real launch deadline is set", () => {
    expect(isPreview(launched)).toBe(false);
  });
});

describe("effectiveGoal", () => {
  it("sizes live from a fresh top-of-book in preview", () => {
    expect(effectiveGoal({ topBidCents: 2000, stale: false }, preview)).toEqual({
      goalCents: 9000, // 2000 × 3 × 1.5
      floorCents: 3000,
    });
  });

  it("falls back to campaign.ts when the market is stale", () => {
    expect(effectiveGoal({ topBidCents: 2000, stale: true }, preview)).toEqual({
      goalCents: 60000,
      floorCents: 20000,
    });
  });

  it("falls back to campaign.ts when there is no market price", () => {
    expect(effectiveGoal({ topBidCents: null, stale: false }, preview)).toEqual({
      goalCents: 60000,
      floorCents: 20000,
    });
  });

  it("ignores a zero/garbage price and falls back", () => {
    expect(effectiveGoal({ topBidCents: 0, stale: false }, preview)).toEqual({
      goalCents: 60000,
      floorCents: 20000,
    });
  });

  it("freezes to campaign.ts at launch even with a fresh market", () => {
    expect(effectiveGoal({ topBidCents: 2000, stale: false }, launched)).toEqual({
      goalCents: 60000,
      floorCents: 20000,
    });
  });
});

describe("marketCoverageHtml", () => {
  it("keeps the coffee framing at or above $500", () => {
    expect(marketCoverageHtml(60000)).toBe("Split a hundred ways, that's a coffee.");
    expect(marketCoverageHtml(50000)).toBe("Split a hundred ways, that's a coffee.");
  });

  it("switches to the $5-minimum count below $500", () => {
    expect(marketCoverageHtml(49900)).toBe(
      "<strong>100</strong> people at the $5 minimum cover the whole goal.",
    );
    expect(marketCoverageHtml(9000)).toBe(
      "<strong>18</strong> people at the $5 minimum cover the whole goal.",
    );
  });
});
