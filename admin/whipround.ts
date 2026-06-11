#!/usr/bin/env -S npx tsx
/**
 * Whipround founder CLI.
 *   npx tsx whipround.ts <command>      (or: npm run whipround -- <command>)
 *
 * Credentials come from the environment only — never flags, never files:
 *   GITHUB_TOKEN        suggestions, promote
 *   STRIPE_SECRET_KEY   progress, refund-campaign
 *
 * Logic is reused, not duplicated: progress + refunds share web/lib/progress.ts,
 * market shares market/topofbook.ts.
 */
import process from "node:process";
import Stripe from "stripe";
import { getProgress, listCampaignPledges } from "../web/lib/progress";
import { formatUsd } from "../web/lib/format";
import { getTopOfBook } from "../market/topofbook";
import {
  listSuggestions,
  getIssue,
  addLabel,
  SUGGESTION_LABELS,
} from "./src/github";
import {
  selectRefundTargets,
  refundableCents,
  refundTotalCents,
  executeRefunds,
} from "./src/refund";
import { extractFields, scaffoldCampaignEntry } from "./src/promote";

const argv = process.argv.slice(2);

function usage(): never {
  console.log(`whipround <command>

  suggestions list [--label <label>]
  suggestions show <issue#>
  suggestions label <issue#> <label>     ${SUGGESTION_LABELS.join(" | ")}
  progress
  market
  refund-campaign <productId> [--dry-run] [--yes]
  promote <issue#>

Env: GITHUB_TOKEN (suggestions/promote), STRIPE_SECRET_KEY (progress/refund).`);
  process.exit(1);
}

function stripeFromEnv(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    console.error("STRIPE_SECRET_KEY is not set.");
    process.exit(1);
  }
  return new Stripe(key);
}

async function cmdMarket(): Promise<void> {
  const book = await getTopOfBook();
  console.log(
    `top of book: ${formatUsd(book.topBidCents)} / block${book.stale ? "  (stale)" : ""}`,
  );
  book.top10.forEach((b, i) =>
    console.log(
      `  ${String(i + 1).padStart(2)}. ${formatUsd(b.bidCents).padStart(9)}  ${b.advertiser}`,
    ),
  );
}

async function cmdProgress(): Promise<void> {
  const p = await getProgress();
  console.log(
    `${formatUsd(p.pledgedCents)} of ${formatUsd(p.goalCents)} · ${p.pledgerCount} pledgers · ${Math.round(p.fraction * 100)}% funded`,
  );
}

async function cmdSuggestions(args: string[]): Promise<void> {
  const [sub, ...rest] = args;
  if (sub === "list") {
    const i = rest.indexOf("--label");
    const label = i !== -1 ? rest[i + 1] : undefined;
    const issues = await listSuggestions(label);
    if (issues.length === 0) {
      console.log("(no matching suggestions)");
      return;
    }
    for (const s of issues) {
      console.log(`#${s.number}  [${s.labels.join(", ")}]  ${s.title}`);
    }
  } else if (sub === "show") {
    const n = Number(rest[0]);
    if (!Number.isInteger(n)) usage();
    const s = await getIssue(n);
    console.log(
      `#${s.number}  ${s.title}\n${s.url}\nlabels: ${s.labels.join(", ")}\n\n${s.body}`,
    );
  } else if (sub === "label") {
    const n = Number(rest[0]);
    const label = rest[1];
    if (!Number.isInteger(n) || !label) usage();
    if (!(SUGGESTION_LABELS as readonly string[]).includes(label!)) {
      console.error(`label must be one of: ${SUGGESTION_LABELS.join(", ")}`);
      process.exit(1);
    }
    await addLabel(n, label!);
    console.log(`labeled #${n} → ${label}`);
  } else {
    usage();
  }
}

async function cmdRefund(args: string[]): Promise<void> {
  const productId = args.find((a) => !a.startsWith("--"));
  if (!productId) usage();
  const dryRun = args.includes("--dry-run");
  const yes = args.includes("--yes");

  const stripe = stripeFromEnv();
  const sessions = await listCampaignPledges(stripe, productId!);
  const targets = selectRefundTargets(sessions);
  const total = refundTotalCents(targets);

  console.log(`refund-campaign ${productId}`);
  console.log(`${targets.length} refundable pledge(s) · ${formatUsd(total)} total`);
  for (const t of targets) {
    console.log(
      `  ${t.sessionId}  ${formatUsd(refundableCents(t))}  (pi: ${t.paymentIntentId ?? "—"})`,
    );
  }

  if (dryRun || !yes) {
    console.log(
      dryRun
        ? "\n(dry run — nothing was refunded)"
        : "\nRe-run with --yes to issue these refunds.",
    );
    return;
  }

  const result = await executeRefunds(stripe, targets, { dryRun: false });
  console.log(
    `\nRefunded ${result.refunded} pledge(s), ${formatUsd(result.totalCents)}.` +
      (result.skipped.length
        ? ` Skipped (no PaymentIntent): ${result.skipped.join(", ")}`
        : ""),
  );
}

async function cmdPromote(args: string[]): Promise<void> {
  const n = Number(args[0]);
  if (!Number.isInteger(n)) usage();
  const issue = await getIssue(n);
  console.log(`// Scaffolded from suggestion #${issue.number}: ${issue.title}`);
  console.log(`// Review every field — beneficiary blessing comes first.\n`);
  console.log(scaffoldCampaignEntry(extractFields(issue)));
}

async function main(): Promise<void> {
  const [command, ...rest] = argv;
  switch (command) {
    case "market":
      return cmdMarket();
    case "progress":
      return cmdProgress();
    case "suggestions":
      return cmdSuggestions(rest);
    case "refund-campaign":
      return cmdRefund(rest);
    case "promote":
      return cmdPromote(rest);
    default:
      usage();
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
