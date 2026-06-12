import { describe, it, expect } from "vitest";
import { formatCampaignBlock, type PledgeLink } from "../src/stripe-setup";

const links: PledgeLink[] = [
  { amountCents: 500, url: "https://buy.stripe.com/a" },
  { amountCents: 1000, url: "https://buy.stripe.com/b" },
  { amountCents: 2500, url: "https://buy.stripe.com/c" },
  { amountCents: "custom", url: "https://buy.stripe.com/d" },
];

describe("formatCampaignBlock", () => {
  it("emits the exact stripeProductId + pledgeLinks block, paste-ready", () => {
    const out = formatCampaignBlock("prod_123", links);
    expect(out).toBe(
      [
        '  stripeProductId: "prod_123",',
        "  pledgeLinks: [",
        '    { amountCents: 500, url: "https://buy.stripe.com/a" },',
        '    { amountCents: 1000, url: "https://buy.stripe.com/b" },',
        '    { amountCents: 2500, url: "https://buy.stripe.com/c" },',
        '    { amountCents: "custom", url: "https://buy.stripe.com/d" },',
        "  ],",
      ].join("\n"),
    );
  });

  it('quotes the custom tier as "custom" (an unquoted value would be invalid TS)', () => {
    const out = formatCampaignBlock("prod_x", links);
    expect(out).toContain('{ amountCents: "custom", url: "https://buy.stripe.com/d" },');
    expect(out).not.toMatch(/amountCents: custom\b/);
  });

  it("preserves pledge order", () => {
    const out = formatCampaignBlock("prod_x", links);
    expect(out.indexOf("/d")).toBeGreaterThan(out.indexOf("/a"));
  });
});
