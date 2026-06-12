import { describe, it, expect } from "vitest";
import { sizeGoalCents, goalBreakdown, IMPRESSIONS_PER_BLOCK } from "../lib/economics";

describe("sizeGoalCents", () => {
  it("multiplies blocks × price × buffer (the canonical example: 5 × $80 × 1.5 = $600)", () => {
    expect(sizeGoalCents(8000, 5, 1.5)).toBe(60000);
  });

  it("tracks a higher top-of-book price", () => {
    expect(sizeGoalCents(11000, 5, 1.5)).toBe(82500); // 5 × $110 × 1.5
  });

  it("rounds to whole cents", () => {
    expect(sizeGoalCents(3333, 3, 1.2)).toBe(11999); // 3333×3×1.2 = 11998.8
  });
});

describe("goalBreakdown", () => {
  it("derives impressions and the implied per-block price", () => {
    const b = goalBreakdown(60000, 5, 1.5);
    expect(b.impressions).toBe(5 * IMPRESSIONS_PER_BLOCK);
    expect(b.impliedBlockPriceCents).toBe(8000); // 60000 / (5 × 1.5)
  });

  it("guards against divide-by-zero", () => {
    expect(goalBreakdown(60000, 0, 1.5).impliedBlockPriceCents).toBe(0);
  });

  it("derives the funding floor: one block incl. buffer (goal / targetBlocks)", () => {
    expect(goalBreakdown(60000, 3, 1.5).floorCents).toBe(20000); // 60000 / 3 blocks
  });

  it("guards the floor against divide-by-zero", () => {
    expect(goalBreakdown(60000, 0, 1.5).floorCents).toBe(0);
  });
});
