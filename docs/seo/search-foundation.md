# NICETHRYUN search foundation

Verified against official documentation on 2026-11-19. This is a technical foundation for discoverable, understandable content, not a promise of ranking, indexing, AI citation or rich-result display.

## What the implementation provides

- Static HTML contains the catalogue, actual supplier product images, visible specifications and source qualifications. The animated brand canvas is presentation; buyers and crawlers do not depend on it for product facts.
- Each canonical route has a descriptive title, description and absolute canonical URL. Product Open Graph images use the actual product asset. Explicit editorial metadata can override defaults.
- One JSON-LD graph connects stable `Organization`, `WebSite` and page IDs. Organization data is limited to the brand, site URL and public contact already in the footer/configuration. No legal entity, address, ownership, factory size, certification or history is inferred from photographs.
- Product entities are generated from the same `products.json` fields as the visible product pages. Unknown specifications are omitted; listed supplier values remain qualified as untested and subject to sample confirmation. No guessed SKU, manufacturer, price, stock, ratings or certification is generated.
- Breadcrumbs match the visible navigation. The legacy patio URL canonicals to the garden page and is excluded from the sitemap. Thank-you and 404 pages remain `noindex` and outside the sitemap.
- `OAI-SearchBot` is explicitly allowed. The existing wildcard `Allow: /` is unchanged; no new model-training opt-out or opt-in decision is made on the owner's behalf.

## Why these choices

1. [OpenAI crawler documentation](https://developers.openai.com/api/docs/bots) distinguishes `OAI-SearchBot` (ChatGPT Search), `GPTBot` (potential model training) and `ChatGPT-User` (user-triggered visits). Search and training preferences are independent. User-triggered visits are not automatic search indexing. Allowing a crawler does not guarantee inclusion. OpenAI also publishes crawler IP lists: production firewall settings must be checked separately from this repository's robots file.
2. [Google's AI optimization guidance](https://developers.google.com/search/docs/fundamentals/ai-optimization-guide) and [AI features guidance](https://developers.google.com/search/docs/appearance/ai-features) retain ordinary search fundamentals: accessible, useful, first-hand information, internal links, readable text and good page experience. No special AI schema or `llms.txt` is required. The repository does not add either.
3. [Google structured-data policies](https://developers.google.com/search/docs/appearance/structured-data/sd-policies) require accurate, relevant information consistent with the visible page. Schema validation does not prove claims or guarantee display.
4. [Product snippet requirements](https://developers.google.com/search/docs/appearance/structured-data/product-snippet) require genuine offer/review/rating information for that rich-result feature. This quotation-based B2B catalogue has no confirmed public price or review data. Its semantic `Product` descriptions deliberately omit those fields, and are not represented as eligible Google product snippets.
5. [Organization guidance](https://developers.google.com/search/docs/appearance/structured-data/organization) describes optional identity and logo information. A logo suitable for a dark hero is not automatically a suitable search logo. No structured logo is added before a readable, approved search asset is selected.
6. [Google Search documentation updates](https://developers.google.com/search/updates) record the removal of FAQ rich-result support in 2026. Buyer questions remain useful visible content; no FAQ rich-result benefit is claimed.
7. [Bing IndexNow](https://www.bing.com/indexnow/getstarted) is an optional change notification mechanism, not an indexing guarantee. It is not required for this implementation; add it only with a verified production host and operational ownership.

## Repeatable validation

Run `node scripts/test-seo.mjs` for offline source-level assertions. After a successful site build, run `node scripts/test-seo.mjs --built` to inspect the actual HTML, schema/visible-text agreement, real image files, unique metadata, canonical destinations, sitemap inclusion/exclusion and robots output. Existing site checks and visual/mobile acceptance remain separate requirements.

After deployment, the reviewer should verify canonical URLs return the intended content, missing routes return HTTP 404, no unintended `X-Robots-Tag: noindex` is added, and robots/sitemaps/assets are accessible through the CDN. Check actual crawler requests and WAF rules against official crawler identities/IP ranges; a request with a spoofed bot user-agent returning 200 is not proof that a real crawler can enter. Search Console and Bing Webmaster Tools access and sitemap submission need the correct property owner; no ownership or submission is assumed here.

## Evidence still needed from the business

Before expanding organization claims, ask for the legal entity and its relationship to the factory, confirmed business address, and approved public proof. Product performance, destination compliance, MOQ, pricing, warranty, lead times and capacity must be confirmed per configuration. Real customer installations need permission and evidence before they are called case studies. Generated application images remain illustrations. The guide can explain purchasing decisions without asserting any of these unknown facts.
