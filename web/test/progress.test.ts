import { describe, it, expect } from "vitest";
import { aggregatePledges, buildProgress } from "../lib/progress";

describe("aggregatePledges", () => {
  it("sums net cents and counts pledgers", () => {
    expect(
      aggregatePledges([
        { amountTotalCents: 2500, amountRefundedCents: 0 },
        { amountTotalCents: 1000, amountRefundedCents: 0 },
        { amountTotalCents: 500, amountRefundedCents: 0 },
      ]),
    ).toEqual({ pledgedCents: 4000, pledgerCount: 3 });
  });

  it("subtracts partial refunds from the total but still counts the pledger", () => {
    expect(
      aggregatePledges([{ amountTotalCents: 2500, amountRefundedCents: 1000 }]),
    ).toEqual({ pledgedCents: 1500, pledgerCount: 1 });
  });

  it("excludes fully refunded pledges from total and count", () => {
    expect(
      aggregatePledges([
        { amountTotalCents: 2500, amountRefundedCents: 2500 },
        { amountTotalCents: 1000, amountRefundedCents: 0 },
      ]),
    ).toEqual({ pledgedCents: 1000, pledgerCount: 1 });
  });

  it("treats over-refunds as zero, never negative", () => {
    expect(
      aggregatePledges([{ amountTotalCents: 1000, amountRefundedCents: 1500 }]),
    ).toEqual({ pledgedCents: 0, pledgerCount: 0 });
  });

  it("handles no pledges", () => {
    expect(aggregatePledges([])).toEqual({ pledgedCents: 0, pledgerCount: 0 });
  });
});

describe("buildProgress", () => {
  it("computes a clamped fraction", () => {
    expect(buildProgress(30000, 50, 60000)).toEqual({
      pledgedCents: 30000,
      pledgerCount: 50,
      goalCents: 60000,
      fraction: 0.5,
    });
  });

  it("clamps the fraction to 1 when over-funded", () => {
    expect(buildProgress(90000, 120, 60000).fraction).toBe(1);
  });

  it("is zero when the goal is zero", () => {
    expect(buildProgress(0, 0, 0).fraction).toBe(0);
  });
});
