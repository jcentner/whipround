# web/ — Whipround campaign site

A static-first [Astro](https://astro.build) site for a single crowdfunding
campaign. The page is prerendered HTML; only the live progress endpoint and the
share image render on demand, served by a small Node process behind nginx.

## Layout

| Path | What |
|------|------|
| `lib/campaign.ts` | Single source of truth for campaign content — edit this, not the markup. |
| `lib/progress.ts` | Pledge totals from the Stripe API (Stripe is the datastore; no DB). |
| `lib/format.ts` | Money formatting. |
| `src/pages/index.astro` | The campaign page. |
| `src/pages/api/progress.ts` | Live thermometer JSON (cached ~60s). |
| `src/pages/report.astro` | Post-campaign transparency report. |
| `src/components/Thermometer.astro` | The one interactive island. |
| `deploy/` | systemd unit + nginx vhost + `DEPLOY.md`. |

## Develop

```bash
npm install
npm run dev        # http://localhost:4321
npm run build      # static client + standalone Node server in dist/
npm test           # unit tests (progress math, market parser)
npm run market     # print live kickbacks.ai top-of-book
```

The progress endpoint reads Stripe at runtime:

```bash
STRIPE_SECRET_KEY=sk_...  WHIPROUND_STRIPE_PRODUCT_ID=prod_...  npm run dev
```

See [`deploy/DEPLOY.md`](deploy/DEPLOY.md) to ship it.

