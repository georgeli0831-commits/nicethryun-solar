# Skeleton provenance

Source: `georgeli0831-commits/zelmo-parts`, inspected locally at
`/Users/lijiaming/Projects/zelmo-parts摩配官网`.

Source commit: `bc88fc42b0cb170c8f8ab8d483d60138ad7921ef`.

## Reused mechanisms

| Source | NICETHRYUN adaptation |
| --- | --- |
| `astro.config.mjs` | Astro 5 static output and `@astrojs/sitemap`; a shared placeholder site URL and trailing slashes for the specified routes. |
| `tsconfig.json` | The same `astro/tsconfigs/base`, include paths, and `dist` exclusion. |
| `src/layouts/Base.astro` | Shared document/layout and global CSS import pattern. SEO is extracted into `src/components/SEO.astro`: canonical, language alternates, Open Graph, Twitter image, and Organization JSON-LD. |
| `src/i18n/index.ts` | Typed region/dictionary helpers, English fallback, and translated path-segment helper. M1 enables only English and uses root URLs without `/en/`. |
| `public/robots.txt` | Allow/index structure with sitemap URL; generated statically by `src/pages/robots.txt.ts` from the shared site constant. |
| `package.json` | `astro dev`, `astro build`, and `astro preview`; no source data-processing scripts. |
| Directory layout | `layouts`, `components`, `data`, `pages`, `config`, `i18n`, and `styles`; `content` is reserved for future collections. The inspected source itself has no content collections. |

The source uses plain global CSS, with no Tailwind dependency or configuration.
Its `Base.astro` imports `global.css`, `catalog-pages.css`, and `b2b-redesign.css`.
Only the CSS import mechanism is reused: the approved demo supplies this site's
styles, colors, Arial typography, and 1440px maximum width. No source theme CSS,
fonts, brand assets, or visual components are carried over.

## Cloudflare Pages build contract

The source uses Astro's static `dist/` output and has no `wrangler` configuration,
Cloudflare adapter, or GitHub deployment workflow to copy. This project retains
that static contract: Node 22, `npm run build`, output directory `dist`.
Cloudflare account/project integration and deployment are outside M1.

`src/config/site.mjs` contains the deliberately reserved placeholder
`https://nicethryun-solar.example`. Astro, sitemap, robots, canonical, Open Graph,
and JSON-LD share it. The actual domain is still to be confirmed.

## Deliberately excluded

- All ZELMO product data, photographs, logos, fonts, copy, business/contact values,
  forms service keys, analytics configuration, and product-specific components.
- The source's `functions/_middleware.ts`, which performs geographic redirects
  to language prefixes. M1 is a static English site served from `/`.
- The source's `public/_redirects`, which renames motorcycle parts categories.
- The source's data pipeline scripts and `prebuild` catalog index generation.
- Other locale dictionaries and routes. Further languages remain a later task.

The source lockfile resolved Astro 5.18.2 and `@astrojs/sitemap` 3.7.3 when
inspected. Its current theme includes further gold/graphite values beyond the
two historical colors named in the brief; the full source styles were excluded
to prevent any of those values from affecting the approved demo.
