# admin/ — Whipround founder CLI

The only admin surface: a small TypeScript CLI, run locally with founder
credentials from the environment (`GITHUB_TOKEN`, `STRIPE_SECRET_KEY`). It is
never deployed.

It reuses the site's own code — pledge progress and refunds go through
`web/lib/progress.ts`, market snapshots through `market/topofbook.ts` — so the
CLI and the site can't drift apart.

## Commands

```
npm run whipround -- suggestions list [--label shortlist]
npm run whipround -- suggestions show <issue#>
npm run whipround -- suggestions label <issue#> <label>   # suggestion|shortlist|blessed|rejected|done
npm run whipround -- progress
npm run whipround -- market
npm run whipround -- refund-campaign <productId> [--dry-run] [--yes]
npm run whipround -- promote <issue#>
npm run whipround -- stripe-setup --name "<beneficiary>" [--yes]
```

(or `npx tsx whipround.ts <command>`)

## Setup

```bash
npm install                        # also run `npm install` in ../web (shared progress lib)
export GITHUB_TOKEN=ghp_...        # repo scope, for suggestion triage
export STRIPE_SECRET_KEY=sk_...    # for progress + refunds
npm test                           # unit tests: refund selection, suggestion parsing
```

## Safety

`refund-campaign` always prints the exact pledges and total it would refund, and
refunds nothing unless you pass `--yes`. `--dry-run` forces a no-op. The
destructive path can't fire by accident.

`stripe-setup` is the same shape: without `--yes` it only prints the plan and
the pasteable `campaign.ts` block, creating nothing; and it refuses if an active
Product of the same name already exists, so a re-run can't orphan a second set
of Payment Links. Test vs live mode follows the key (`sk_test_`/`sk_live_`).

