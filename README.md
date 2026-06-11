# Whipround

**Crowdfunded tribute ads in the AI coding spinner.**

K-pop fans pool money for Times Square billboards. Developers have fandoms too —
curl, Vim, SQLite, the one maintainer in Nebraska holding up the internet.
Whipround lets a community pool small pledges to buy the #1 ad slot on
[kickbacks.ai](https://kickbacks.ai) — the sponsored line that replaces the
spinner verb in Claude Code and Codex — and point it at a thank-you. The ad
links to the beneficiary's sponsor page, so the pool literally pays to send them
potential sponsors.

Whipround is operated by [Write It Right](https://write-it-right.ai).

## How it works

1. A campaign page goes up with a goal and a live thermometer.
2. People pledge $5–$25 (or choose their own amount). Pledges are charged
   immediately, via Stripe.
3. If the goal is met by the deadline, the bid goes in at #1 and the tribute
   serves across thousands of IDEs. **If it isn't met, every pledge is refunded
   in full.**
4. Afterward, a transparency report shows the whole P&L — raised, impressions,
   clicks delivered, and leftover funds sent 100% to the beneficiary.

It is **not a charity** and not a donation: a pledge buys participation in a
community ad buy, transparently. We store only aggregate totals — never your
name or email (Stripe holds those).

## Suggest a campaign

Know someone the spinner should thank?
**[Open a suggestion →](https://github.com/jcentner/whipround/issues/new?template=campaign-suggestion.yml)**

Campaigns are curated (not first-come), tributes only, and we get the
beneficiary's blessing before anything goes live — so please don't @-mention
them in your suggestion. See the [Code of Conduct](CODE_OF_CONDUCT.md).

## Repository

| Path | What |
|------|------|
| [`web/`](web/) | The campaign site — Astro, static-first, with a live thermometer and share card. |
| [`market/`](market/) | A dependency-free reader for the kickbacks.ai top-of-book price. |
| [`admin/`](admin/) | The founder CLI: suggestion triage, pledge progress, refunds, market snapshot. |
| `.github/` | The campaign-suggestion issue form. |

Each part has its own README. Quick start:

```bash
cd web && npm install && npm run dev     # the campaign site at localhost:4321
cd web && npm run market                 # print the live kickbacks.ai top-of-book
cd admin && npm install && npm test      # the founder CLI + its tests
```

## Transparency

Open source *is* the transparency here: the code that takes pledges and reports
results is all in this repo, and every campaign ends with a public report of
where the money went.

## License

[MIT](LICENSE) © Write It Right
