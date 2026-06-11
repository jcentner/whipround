import type { IssueDetail } from "./github";

/**
 * Turn a campaign-suggestion issue into a ready-to-paste campaign config entry.
 * GitHub issue forms render as "### Label\n\nvalue" blocks, so we pull fields by
 * heading. Pure functions — easy to unit-test.
 */

export interface PromotedFields {
  tributeTarget: string;
  why: string;
  spinnerLine: string;
  clickUrl: string;
}

/** Pull a single issue-form field value by its heading text. */
export function fieldByHeading(body: string, heading: string): string {
  const lines = body.split(/\r?\n/);
  const start = lines.findIndex((l) =>
    l.trim().toLowerCase().startsWith(`### ${heading.toLowerCase()}`),
  );
  if (start === -1) return "";

  const collected: string[] = [];
  for (let i = start + 1; i < lines.length; i++) {
    if (lines[i]!.trim().startsWith("### ")) break;
    collected.push(lines[i]!);
  }
  const value = collected.join("\n").trim();
  // Issue forms render an unfilled optional field as "_No response_".
  return value === "_No response_" ? "" : value;
}

export function extractFields(issue: IssueDetail): PromotedFields {
  return {
    tributeTarget: fieldByHeading(issue.body, "Who's the tribute for?"),
    why: fieldByHeading(issue.body, "Why this tribute, why now?"),
    spinnerLine: fieldByHeading(issue.body, "Proposed spinner line"),
    clickUrl: fieldByHeading(issue.body, "Click destination URL"),
  };
}

/** A campaign.ts entry seeded from a suggestion. Beneficiary/Stripe stay TBD. */
export function scaffoldCampaignEntry(f: PromotedFields): string {
  const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
  return `export const campaign: Campaign = {
  slug: "campaign-1",
  headline: "[CAMPAIGN-TBD] — ${esc(f.tributeTarget)}",
  adCopy: "${esc(f.spinnerLine)}",
  clickUrl: "${esc(f.clickUrl) || "[CAMPAIGN-TBD]"}",
  beneficiaryName: "${esc(f.tributeTarget) || "[CAMPAIGN-TBD]"}",
  story: "${esc(f.why)}",
  // Size from live top-of-book and confirm before launch:
  goalCents: 60000,
  targetBlocks: 5,
  clickBufferMultiplier: 1.5,
  stripeProductId: "[STRIPE-TBD]",
  pledgeLinks: [
    { amountCents: 500, url: "[STRIPE-TBD]" },
    { amountCents: 1000, url: "[STRIPE-TBD]" },
    { amountCents: 2500, url: "[STRIPE-TBD]" },
    { amountCents: "custom", url: "[STRIPE-TBD]" },
  ],
  fundingDeadline: "[SET-AT-LAUNCH]",
};
`;
}
