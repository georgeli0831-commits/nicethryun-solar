# Global market map review

This change adds a market map between the particle hero and the factory photograph section. The visual reference is the world-map sequence on https://zelmo-tricycle.com/en/; the implementation uses NICETHRYUN's blue-black, silver, ice-blue and warm LED palette.

## Buyer experience

- China is the starting point. Europe, the Middle East and Australia are markets in focus, not a claim of existing customers, completed exports or destination certification.
- Routes animate automatically while the module is visible. Visitors can select a market and hold it for reading, or pause and resume the sequence.
- Market information and links are server-rendered. The map is available without a client-side mapping library or a third-party map request.
- Factory photographs remain directly below the map. Their labels and links to the manufacturing page are preserved.
- The existing hero, mobile particle scale, two-second photo/application carousels, product data, inquiry submission and search configuration are outside this change.

## Verification

- `npm run check`: 0 errors, 0 warnings, 3 existing Three.js hints.
- `npm run build`: 21 static pages. Existing Three.js chunk-size advisory remains; this map adds no mapping runtime dependency.
- `npm run qa:release`: 21 pages, 1,105 local references, 6 products and 3 resources passed.
- `npm run qa:seo`: 18 canonical routes, 6 product entities and built-output parity passed.
- `npm run test:scenes`: all 12 playback state-machine cases passed. The map reuses that state machine with a separate 5-second interval; existing scene and hero intervals remain 2 seconds.
- Browser: desktop 1280px map section is approximately 605px high, with all three controls on one row. Automatic selection advanced between the three markets.
- Browser: 390px and 320px layouts have no document horizontal overflow. Market controls have 20px primary text and exceed the 44px touch target minimum. Choosing a market pauses the tour; arrow-key selection updates the market and retains the pause.
- Browser: after Resume, the map runs while the Resume/Pause control retains keyboard focus. A review finding that incorrectly treated the playback control as a focus blocker was fixed before handoff.
- No production inquiry or WhatsApp message was submitted. Screenshots are browser-layout evidence; no physical iPhone/Safari performance claim is made.

## Geographic source

See [global-map-source.md](global-map-source.md) for the data source, license, projection and regeneration instructions. The reference site's baked video and business claims are not copied.
