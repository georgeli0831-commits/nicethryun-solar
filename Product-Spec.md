# NICETHRYUN Solar — M1

User-authorized scope: create private `georgeli0831-commits/nicethryun-solar`, default `main`, work branch `codex/m1-migrate`, open a review PR. Final checkout: `/Users/lijiaming/Projects/nicethryun-solar`.

## Baseline

The approved `NICETHRYUN_融合版官网_20260919/NICETHRYUN_融合版_独立预览.html` is the sole visual, content and interaction baseline. Its SHA-256 is recorded in `docs/review/m1/assets.json`. M1 is an Astro 5 static migration and engineering work only: no redesign, new features, copy polishing, React, backend connection, Cloudflare account changes, deployment or domain configuration.

## Requirements

1. Reuse the Astro configuration conventions, layouts/components/content/data/pages structure, CSS scheme, English-only i18n mechanisms, SEO/canonical/OG/sitemap/robots and static Cloudflare Pages build conventions from `zelmo-parts`. No old product data, imagery, brand marks or gold/gray CSS. Exact source commit and adaptations are in `docs/skeleton-source.md`.
2. Preserve demo CSS: Arial; `--max:1440px`; ink `#10252d`, muted `#607178`, blue `#174ce4`, blue-light `#eef3ff`, petrol `#092b30`, petrol-light `#16434a`, amber `#e5ae60`, paper `#fafbf9`, line `#dce3e6`, radius `5px`. Existing section-specific widths remain as authored.
3. Generate full HTML at build time for `/`, `/products/`, six `/products/[slug]/` pages (`solar-flood`, `split-panel`, `multi-head`, `compact-wall`, `slim-wall`, `garden-spot`), `/applications/`, `/applications/[slug]/` (`entry`, `driveway`, `perimeter`, `garden`, `patio`), `/manufacturing/`, `/oem/`, `/resources/`, `/inquiry/`.
4. Preserve native JavaScript interactions: desktop mega menu, mobile menu, keyboard behavior, product filters/search/gallery, compare tray and dialog (maximum 3), RFQ dialog/quantities, info dialog, toast, quick inquiry, OEM form, inquiry local draft and exported brief, required `other-country` input. No backend; add `TODO: form endpoint` in submit code.
5. Product families, applications, specifications, FAQ and resources live in JSON data files; text remains verbatim. Decode all 16 base64 images into `public/images/` under original names; PNG files <=400KB using sharp, with original dimensions retained. High-quality WebP delivery companions generated from the original buffers avoid visible palette artifacts while retaining all original filenames. Import only used npm lucide icons.
6. Preserve two resource text templates as static TXT downloads. The demo also contains a CSV range overview, which remains downloadable.
7. `npm run build` must pass; every route needs desktop/mobile screenshot comparison against the demo in the PR; native interactions must be exercised; desktop Lighthouse Performance >=90.
8. README covers source, data locations, adding product families, and pending form backend/domain/Cloudflare Pages/multilingual work.

## Source discrepancies / migration mapping

- `entry` maps to the original `entryway` data key, preserving the displayed Entryway text.
- The demo application overview defaults to Driveway, with four route tabs. `/applications/` preserves that same view.
- The demo includes `scene-patio.jpg` but no patio application text or route. The user was asked about this gap; pending a different instruction, `/applications/patio/` reuses the Garden & path view with unchanged copy. No fifth tab or invented patio claims are introduced.
- Original inquiry success is an existing state, kept under `/inquiry/?ready=1` rather than adding a new business route.
