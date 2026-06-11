// @ts-check
import { defineConfig } from 'astro/config';
import node from '@astrojs/node';

// Static-first: every page is prerendered to HTML except the routes that opt in
// to on-demand rendering with `export const prerender = false` (the live progress
// endpoint and the OG image). Cloudflare serves the static HTML; only those two
// routes ever reach the Node process. The standalone server runs behind nginx,
// which terminates TLS.
export default defineConfig({
  site: 'https://whipround.com',
  output: 'static',
  adapter: node({ mode: 'standalone' }),
});
