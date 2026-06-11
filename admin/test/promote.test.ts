import { describe, it, expect } from "vitest";
import { fieldByHeading, extractFields, scaffoldCampaignEntry } from "../src/promote";
import type { IssueDetail } from "../src/github";

const body = [
  "### Who's the tribute for?",
  "",
  "Daniel Stenberg / curl",
  "",
  "### Why this tribute, why now?",
  "",
  "Every `curl | sh` says thanks.",
  "",
  "### Proposed spinner line (≤ 60 characters)",
  "",
  "Thanking Daniel for curl…",
  "",
  "### Click destination URL",
  "",
  "https://github.com/sponsors/bagder",
  "",
  "### Beneficiary contact for blessing",
  "",
  "_No response_",
].join("\n");

describe("fieldByHeading", () => {
  it("pulls a field value by its heading", () => {
    expect(fieldByHeading(body, "Who's the tribute for?")).toBe("Daniel Stenberg / curl");
    expect(fieldByHeading(body, "Proposed spinner line")).toBe("Thanking Daniel for curl…");
  });

  it("treats an unfilled '_No response_' as empty", () => {
    expect(fieldByHeading(body, "Beneficiary contact for blessing")).toBe("");
  });

  it("returns empty for a missing heading", () => {
    expect(fieldByHeading(body, "Nope")).toBe("");
  });
});

describe("extractFields + scaffoldCampaignEntry", () => {
  const issue = { number: 1, title: "x", labels: [], url: "", body } as IssueDetail;

  it("extracts the campaign fields from the issue body", () => {
    const f = extractFields(issue);
    expect(f.tributeTarget).toBe("Daniel Stenberg / curl");
    expect(f.clickUrl).toBe("https://github.com/sponsors/bagder");
  });

  it("bakes the suggestion into a campaign entry with placeholders intact", () => {
    const out = scaffoldCampaignEntry(extractFields(issue));
    expect(out).toContain('adCopy: "Thanking Daniel for curl…"');
    expect(out).toContain('stripeProductId: "[STRIPE-TBD]"');
  });
});
