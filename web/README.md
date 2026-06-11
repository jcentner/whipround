# web/ — campaign site (stub)

Not yet scaffolded. Task T1 in [../TASKS.md](../TASKS.md) creates the Astro app here (static-first, Node adapter — D7); the stubs in `lib/` are the contracts to build around.

Target structure:

```
web/
  src/pages/
    index.astro            # the campaign page (T5) — everything from lib/campaign.ts
    api/progress.ts        # thermometer endpoint (T4) — thin wrapper over lib/progress.ts
    report.astro           # transparency report template (T7)
  src/islands/
    Thermometer.*          # the only client-side component
  lib/
    campaign.ts            # ✅ stubbed — single source of campaign content
    progress.ts            # ✅ stubbed — Stripe-as-database aggregation
  deploy/                  # systemd unit + nginx vhost + DEPLOY.md (T1)
```

Page requirements live in TASKS.md T5 and [../docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md) ("web/" section + economics). Read both before writing markup.
