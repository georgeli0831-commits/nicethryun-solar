# Solar Atrium release review

Review date: 2026-11-19. This release carries the approved visual prototype into the current production codebase, based on main `e1e05c4`.

## Buyer-facing changes

- Large coloured solar N, brand name and descriptor use image-sampled particles. The pointer acts across the hero; a particle stream follows it and returns automatically after inactivity. No inner square clips the particles. The resting brand remains large; background crops adapt around it.
- Ten hero photographs/illustrations alternate every two seconds. Factory photographs and generated application concepts are labelled separately. Real production photographs also appear immediately below the hero.
- Eight application scenes advance every six seconds when visible. Visitors can pause/continue, select a card, use keyboard navigation or swipe. Manual selection pauses until Continue; hover/focus, offscreen and hidden tabs temporarily suspend playback. Reduced-motion users start with manual control.
- Six supplier-reference product families use actual product imagery and qualified register specifications. Sample confirmation is required; illustrations do not establish output, coverage or factory ownership.
- Static buyer content includes application overview pages and a solar-lighting selection guide. Product CSV downloads are generated from the same product data during build.
- Route metadata, canonical URLs, sitemap exclusions, stable entity graphs and explicit OAI-SearchBot access are documented in [search-foundation.md](../../seo/search-foundation.md).

## Production integrations retained

The existing contact configuration, Web3Forms submission implementation, quote storage, thank-you conversion event, GTM and Meta setup remain connected. Shared tracking head/body components avoid duplicate tags. Neither a live inquiry nor a WhatsApp message was sent during this review.

## Validation

- `npm run check`: 0 errors, 0 warnings; 3 existing Three.js type hints.
- `npm run build`: 21 static HTML pages.
- `npm run qa:release`: 21 pages, 1,103 local references, 6 products and 3 resources passed.
- `npm run qa:seo`: 18 canonical routes and 6 product entities; visible specification/breadcrumb parity, images, metadata, robots and sitemap checks passed.
- `npm run test:scenes`: 12 playback state-machine checks passed, including manual pause, focus/hover, visibility, reduced motion and stale callbacks.
- `git diff --check`: passed.
- Browser: desktop autoplay advanced to successive scenes; Pause retained the selected scene beyond one interval; Continue resumed when the stage became visible; manual card selection paused playback. Responsive screenshots accompany this review.
- Browser at 390 × 844: autoplay advanced through successive scenes and followed the selected card within the horizontal rail; pause/continue worked, the buyer guide remained readable and neither page had document overflow. No browser console errors were observed.

## Evidence

- `v3-desktop-reassembled.jpg`: approved assembled N treatment.
- `v3-particles-follow-left.jpg`: pointer-follow stream reaching the text side of the hero.
- `scenes-desktop-paused.jpg`: new playback controls and manual pause state.
- `scenes-mobile-paused.jpg`: phone layout after autoplay and pause.

The first two images document the approved prototype before the production integration. The scene screenshot documents this release build. Screenshots are visual evidence, not a performance benchmark or proof of real-device Safari behavior.

## Deployment checks

After review/merge, verify the deployed commit, HTTP status/canonical/robots/sitemap and CDN assets on the production domain. Verify actual OpenAI crawler access against official identities/IP ranges and Cloudflare events, not just a spoofed user-agent. Owner evidence is still needed for legal entity/address, factory relationship, destination compliance and verified performance. Search indexing, citation and ranking are external outcomes and are not guaranteed by these changes.
