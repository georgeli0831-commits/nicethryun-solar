import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { SITE_URL } from './src/config/site.mjs';
import { isSearchIndexable } from './src/lib/seo.mjs';

// Static files only: Cloudflare Pages can build with `npm run build` → `dist`.
export default defineConfig({
  site: SITE_URL,
  output: 'static',
  trailingSlash: 'always',
  integrations: [
    sitemap({
      // Exclude noindex pages and the patio alias; retain only canonical destinations.
      filter: isSearchIndexable,
    }),
  ],
});
