# Deploying the Whipround web app

One page. The site is a static Astro build with two on-demand routes
(`/api/progress` and the OG image) served by a standalone Node process behind
nginx, with Cloudflare in front.

## 1. Build

```bash
cd web
npm ci
npm run build        # outputs ./dist (client + server/entry.mjs)
```

## 2. Ship the build to the server

Copy the build output and the runtime files to the box:

```bash
rsync -av --delete dist package.json package-lock.json \
  user@server:/var/www/whipround/
ssh user@server 'cd /var/www/whipround && npm ci --omit=dev'
```

(`npm ci --omit=dev` installs only the Stripe SDK that the progress endpoint
needs at runtime.)

## 3. Secrets

The progress endpoint reads Stripe at request time. Put credentials in an env
file owned by root, readable by the service user — never in git:

```bash
sudo install -d -m 750 /etc/whipround
sudo tee /etc/whipround/web.env >/dev/null <<'EOF'
STRIPE_SECRET_KEY=sk_live_xxx
WHIPROUND_STRIPE_PRODUCT_ID=prod_xxx
EOF
sudo chmod 640 /etc/whipround/web.env
```

## 4. systemd

```bash
sudo cp deploy/whipround-web.service /etc/systemd/system/whipround-web.service
# Confirm the node path matches `which node` on the box, then:
sudo systemctl daemon-reload
sudo systemctl enable --now whipround-web
curl -fsS http://127.0.0.1:4321/api/progress | head    # smoke test
```

## 5. nginx + TLS

```bash
sudo cp deploy/nginx-whipround.conf /etc/nginx/sites-available/whipround.com
sudo ln -s /etc/nginx/sites-available/whipround.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d whipround.com -d www.whipround.com
```

Point the `whipround.com` DNS records at this box (proxied through Cloudflare).

## Updating

Repeat steps 1–2, then `sudo systemctl restart whipround-web`.
