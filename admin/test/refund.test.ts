import { describe, it, expect } from "vitest";
import {
  selectRefundTargets,
  refundableCents,
  refundTotalCents,
} from "../src/refund";
import type { PledgeSession } from "../../web/lib/progress";

const session = (over: Partial<PledgeSession>): PledgeSession => ({
  sessionId: "cs_x",
  paymentIntentId: "pi_x",
  amountTotalCents: 1000,
  amountRefundedCents: 0,
  paid: true,
  ...over,
});

describe("selectRefundTargets", () => {
  it("selects paid, not-yet-refunded pledges and totals them", () => {
    const sessions = [
      session({ sessionId: "a", amountTotalCents: 2500 }),
      session({ sessionId: "b", amountTotalCents: 1000 }),
    ];
    expect(selectRefundTargets(sessions).map((t) => t.sessionId)).toEqual(["a", "b"]);
    expect(refundTotalCents(sessions)).toBe(3500);
  });

  it("excludes unpaid sessions", () => {
    expect(selectRefundTargets([session({ paid: false })])).toEqual([]);
  });

  it("excludes pledges already fully refunded", () => {
    expect(
      selectRefundTargets([session({ amountTotalCents: 2500, amountRefundedCents: 2500 })]),
    ).toEqual([]);
  });

  it("refunds only the remaining balance on a partial refund", () => {
    const partial = session({
      sessionId: "p",
      amountTotalCents: 2500,
      amountRefundedCents: 1000,
    });
    expect(selectRefundTargets([partial]).map((t) => t.sessionId)).toEqual(["p"]);
    expect(refundableCents(partial)).toBe(1500);
  });

  it("ignores over-refunds rather than going negative", () => {
    expect(refundableCents(session({ amountTotalCents: 1000, amountRefundedCents: 1500 }))).toBe(0);
  });
});
