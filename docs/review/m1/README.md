# M1 browser review

Generated: 2026-09-20T06:31:02.928Z

- Target: `http://127.0.0.1:4399` (production preview)
- Source SHA-256: `dc885c33e6ae706868526131cbf85773f13b6c1af8e94803152d5d62b4eb82f0`
- Browser: 153.0.8010.52
- Acceptance: 36 screenshot pairs, 0 route failures; 12/12 interaction scenarios passed.
- Maximum all-pixel difference: 0.0004%; maximum non-image difference: 0%.
- Fresh storage per screenshot, device scale 1, desktop 1440×1000 and mobile 390×844; full page, image decode awaited.
- Pixel threshold 0.1, antialiasing excluded. “Non-image” masks the union of source/target image bounds because delivery-image compression is intentional. DOM box deltas greater than 0.75 CSS px are separately reported.
- Application overview uses the approved driveway view. `entry` maps to demo `entryway`; `patio` preserves the garden view because the approved source has no distinct patio copy.
- External and mutating network requests are blocked. Forms use fictional local-only QA data.

## Route screenshots

D/M means desktop/mobile.

| Route | HTTP D/M | Visible copy | Box differences D/M | All-pixel diff D/M | Non-image diff D/M | Desktop | Mobile |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `/` | 200/200 | same | 0/0 | 0.00011%/0% | 0%/0% | [original](screenshots/desktop/home-demo.png) / [current](screenshots/desktop/home-astro.png) / [diff](screenshots/desktop/home-diff.png) | [original](screenshots/mobile/home-demo.png) / [current](screenshots/mobile/home-astro.png) / [diff](screenshots/mobile/home-diff.png) |
| `/products/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-demo.png) / [current](screenshots/desktop/products-astro.png) / [diff](screenshots/desktop/products-diff.png) | [original](screenshots/mobile/products-demo.png) / [current](screenshots/mobile/products-astro.png) / [diff](screenshots/mobile/products-diff.png) |
| `/products/solar-flood/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-solar-flood-demo.png) / [current](screenshots/desktop/products-solar-flood-astro.png) / [diff](screenshots/desktop/products-solar-flood-diff.png) | [original](screenshots/mobile/products-solar-flood-demo.png) / [current](screenshots/mobile/products-solar-flood-astro.png) / [diff](screenshots/mobile/products-solar-flood-diff.png) |
| `/products/split-panel/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-split-panel-demo.png) / [current](screenshots/desktop/products-split-panel-astro.png) / [diff](screenshots/desktop/products-split-panel-diff.png) | [original](screenshots/mobile/products-split-panel-demo.png) / [current](screenshots/mobile/products-split-panel-astro.png) / [diff](screenshots/mobile/products-split-panel-diff.png) |
| `/products/multi-head/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-multi-head-demo.png) / [current](screenshots/desktop/products-multi-head-astro.png) / [diff](screenshots/desktop/products-multi-head-diff.png) | [original](screenshots/mobile/products-multi-head-demo.png) / [current](screenshots/mobile/products-multi-head-astro.png) / [diff](screenshots/mobile/products-multi-head-diff.png) |
| `/products/compact-wall/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-compact-wall-demo.png) / [current](screenshots/desktop/products-compact-wall-astro.png) / [diff](screenshots/desktop/products-compact-wall-diff.png) | [original](screenshots/mobile/products-compact-wall-demo.png) / [current](screenshots/mobile/products-compact-wall-astro.png) / [diff](screenshots/mobile/products-compact-wall-diff.png) |
| `/products/slim-wall/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-slim-wall-demo.png) / [current](screenshots/desktop/products-slim-wall-astro.png) / [diff](screenshots/desktop/products-slim-wall-diff.png) | [original](screenshots/mobile/products-slim-wall-demo.png) / [current](screenshots/mobile/products-slim-wall-astro.png) / [diff](screenshots/mobile/products-slim-wall-diff.png) |
| `/products/garden-spot/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/products-garden-spot-demo.png) / [current](screenshots/desktop/products-garden-spot-astro.png) / [diff](screenshots/desktop/products-garden-spot-diff.png) | [original](screenshots/mobile/products-garden-spot-demo.png) / [current](screenshots/mobile/products-garden-spot-astro.png) / [diff](screenshots/mobile/products-garden-spot-diff.png) |
| `/applications/` | 200/200 | same | 0/0 | 0.0004%/0.00011% | 0%/0% | [original](screenshots/desktop/applications-demo.png) / [current](screenshots/desktop/applications-astro.png) / [diff](screenshots/desktop/applications-diff.png) | [original](screenshots/mobile/applications-demo.png) / [current](screenshots/mobile/applications-astro.png) / [diff](screenshots/mobile/applications-diff.png) |
| `/applications/entry/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/applications-entry-demo.png) / [current](screenshots/desktop/applications-entry-astro.png) / [diff](screenshots/desktop/applications-entry-diff.png) | [original](screenshots/mobile/applications-entry-demo.png) / [current](screenshots/mobile/applications-entry-astro.png) / [diff](screenshots/mobile/applications-entry-diff.png) |
| `/applications/driveway/` | 200/200 | same | 0/0 | 0.0002%/0.00011% | 0%/0% | [original](screenshots/desktop/applications-driveway-demo.png) / [current](screenshots/desktop/applications-driveway-astro.png) / [diff](screenshots/desktop/applications-driveway-diff.png) | [original](screenshots/mobile/applications-driveway-demo.png) / [current](screenshots/mobile/applications-driveway-astro.png) / [diff](screenshots/mobile/applications-driveway-diff.png) |
| `/applications/perimeter/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/applications-perimeter-demo.png) / [current](screenshots/desktop/applications-perimeter-astro.png) / [diff](screenshots/desktop/applications-perimeter-diff.png) | [original](screenshots/mobile/applications-perimeter-demo.png) / [current](screenshots/mobile/applications-perimeter-astro.png) / [diff](screenshots/mobile/applications-perimeter-diff.png) |
| `/applications/garden/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/applications-garden-demo.png) / [current](screenshots/desktop/applications-garden-astro.png) / [diff](screenshots/desktop/applications-garden-diff.png) | [original](screenshots/mobile/applications-garden-demo.png) / [current](screenshots/mobile/applications-garden-astro.png) / [diff](screenshots/mobile/applications-garden-diff.png) |
| `/applications/patio/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/applications-patio-demo.png) / [current](screenshots/desktop/applications-patio-astro.png) / [diff](screenshots/desktop/applications-patio-diff.png) | [original](screenshots/mobile/applications-patio-demo.png) / [current](screenshots/mobile/applications-patio-astro.png) / [diff](screenshots/mobile/applications-patio-diff.png) |
| `/manufacturing/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/manufacturing-demo.png) / [current](screenshots/desktop/manufacturing-astro.png) / [diff](screenshots/desktop/manufacturing-diff.png) | [original](screenshots/mobile/manufacturing-demo.png) / [current](screenshots/mobile/manufacturing-astro.png) / [diff](screenshots/mobile/manufacturing-diff.png) |
| `/oem/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/oem-demo.png) / [current](screenshots/desktop/oem-astro.png) / [diff](screenshots/desktop/oem-diff.png) | [original](screenshots/mobile/oem-demo.png) / [current](screenshots/mobile/oem-astro.png) / [diff](screenshots/mobile/oem-diff.png) |
| `/resources/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/resources-demo.png) / [current](screenshots/desktop/resources-astro.png) / [diff](screenshots/desktop/resources-diff.png) | [original](screenshots/mobile/resources-demo.png) / [current](screenshots/mobile/resources-astro.png) / [diff](screenshots/mobile/resources-diff.png) |
| `/inquiry/` | 200/200 | same | 0/0 | 0%/0% | 0%/0% | [original](screenshots/desktop/inquiry-demo.png) / [current](screenshots/desktop/inquiry-astro.png) / [diff](screenshots/desktop/inquiry-diff.png) | [original](screenshots/mobile/inquiry-demo.png) / [current](screenshots/mobile/inquiry-astro.png) / [diff](screenshots/mobile/inquiry-diff.png) |

## Interactions

- PASS — Desktop mega menu toggle outside click and Escape
- PASS — Mobile navigation toggle Escape and route navigation
- PASS — Home product filter search reset and accessible keyboard tabs
- PASS — Catalogue filters search no-results reset and compare limit clear
- PASS — Product gallery quantity RFQ removal and cross-page persisted cart
- PASS — Inquiry native validation Other destination draft persistence and TXT JSON exports
- PASS — Quick inquiry transfers country application email without submission
- PASS — OEM brief transfers range scope quantity packaging and market
- PASS — Search result real routes and compare quote state across detail navigation
- PASS — Real BFCache restoration keeps latest cart draft compare and cleared fields
- PASS — Ready inquiry quote list step input change and remove remain usable
- PASS — Resource downloads preserve demo bytes and static TXT availability

Full console, HTTP, overflow, image, geometry and download-byte evidence is in [qa-results.json](qa-results.json). Final desktop Lighthouse: **18/18 routes passed, Performance 99–100, CLS 0 on every route**. Measurement: 1350×940 desktop emulation, CPU slowdown ×1, simulated 40ms / 10,240Kbps network, Chrome 153.0.8010.52, production preview. See [all scores](lighthouse.md), [summary JSON](lighthouse-summary.json), and linked per-route HTML/JSON reports.

The 36 screenshot pairs cover unchanged visual markup/styles. The final interaction and Lighthouse runs include the BFCache and ready-page quote fixes (`FnzABwKT` browser bundle). The BFCache scenario records seven actual `pageshow.persisted=true` restorations, including cleared-draft and cross-page comparison state.

## Reproduce

```sh
npm ci
npm run build
npm run preview -- --host 127.0.0.1 --port 4399
# In a second terminal; source demo stays read-only.
NICETHRYUN_DEMO='/absolute/path/NICETHRYUN_融合版_独立预览.html' npm run qa
npm run qa:lighthouse
```

Optional environment: `QA_BASE_URL`, `QA_OUTPUT`, `CHROME_PATH`, `QA_SCREENSHOTS_ONLY=1`, `QA_INTERACTIONS_ONLY=1`; Lighthouse can restrict paths with `LH_ROUTES=/,/products/`.
