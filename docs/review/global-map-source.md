# NICETHRYUN global map source and reproduction

Verified and generated on 2026-11-19. This is a decorative, geographically based target-market map, not evidence of completed exports, customers or sales territories. ZELMO's rendered map/video is not used.

## Geographic source

- Dataset: **Natural Earth, 1:110 million, Admin 0 – Countries, version 5.1.1**.
- Official dataset page: https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/
- Actual downloaded archive: https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip
- Downloaded archive size: **214,976 bytes**.
- Archive SHA-256: `0f243aeac8ac6cf26f0417285b0bd33ac47f1b5bdb719fd3e0df37d03ea37110`.
- The archive's `ne_110m_admin_0_countries.VERSION.txt` independently reports **5.1.1**. The generator checks both version and archive hash before writing geometry. Because the download URL is not versioned, a future changed archive must be reviewed before changing the hash.
- Source shapefile: `ne_110m_admin_0_countries.shp` and its associated DBF, read directly; no third-party country-path tracing or country geometry from ZELMO.
- The dataset contains 177 features. The generated graphic omits Antarctica and retains **176 country/territory features**. Natural Earth generalizes geometry at this scale and uses its published de facto boundary policy; boundaries are not manually redrawn. This is not a surveying or legal-boundary product.

## License

Natural Earth's official [Terms of Use](https://www.naturalearthdata.com/about/terms-of-use/) confirms its raster/vector data is **public domain**, allows modification and commercial distribution, and does not require permission or credit. The terms and dataset page were inspected on the generation date. Optional attribution: “Made with Natural Earth.”

Temporary generation libraries are `d3-geo@3.1.1` (ISC) and `shapefile@0.6.6` (BSD-3-Clause), with their dependencies resolved by npm in a temporary directory. Their code is not copied into the website. The checked-in JSON contains derived geographic SVG paths only; neither library is a build-time or browser runtime requirement for the site.

## Geometry and consumer contract

- Output: `src/data/global-map.json`.
- Projection: D3 `geoNaturalEarth1`, rotated to **150°E** (`rotate([-150, 0])`) so Asia sits to the left of center and the Americas stay together on the right. This replaces the initial 100°E suggestion, which would split the Americas at the antimeridian seam.
- Canvas: `viewBox="0 0 1200 500"`; 26 units of horizontal inset and 24 units of vertical inset.
- The projection is fitted to 1,148 units of width, then consistently scaled vertically to 452 units of height for the reference's broad world-map presentation. All country paths, the sphere, graticule and route endpoints use the same transform. D3 precision is 0.15 and SVG coordinates retain two decimal places.
- Graticule: 20-degree spacing. The spherical outline is retained even though Antarctica is omitted.
- Schema: `{viewBox, sphere, graticule, countries: [{id, name, path}], points: {china, europe, middleEast, australia}}`. Each point is `{x, y}`. All SVG paths are data strings, with no inline script or styles.
- IDs are strings from `ISO_N3_EH`, preserving leading zeroes; where no three-digit ISO ID exists, `NE-` plus the Natural Earth administrative code provides a stable unique ID.
- Highlight IDs verified: China `156`, Germany `276`, Australia `036`, Saudi Arabia `682`, United Arab Emirates `784`.
- Route reference locations are schematic country/region anchors, not factory coordinates, addresses, offices or shipment destinations:

| Key | Longitude, latitude | SVG x, y |
| --- | --- | --- |
| `china` | 110, 32 | 478.67, 160.30 |
| `europe` | 10, 51 | 211.17, 107.64 |
| `middleEast` | 47, 25 | 281.21, 179.99 |
| `australia` | 134, -25 | 550.48, 320.01 |

Initial artifact: **173,640 bytes**, **63,030 bytes gzip**; SHA-256 `760fd40c8d8bfee96341c0bbc6609fecd6e67131d6988d0d14ad9333c90918ff`.

## Regenerate without changing project dependencies

Requires Node.js (the project's Node 22+ works), npm, curl and system `unzip`. Run from the repository root:

```sh
map_tooling_dir=$(mktemp -d)
npm install --prefix "$map_tooling_dir" --no-audit --no-fund --ignore-scripts d3-geo@3.1.1 shapefile@0.6.6
curl --fail --location 'https://naturalearth.s3.amazonaws.com/110m_cultural/ne_110m_admin_0_countries.zip' --output "$map_tooling_dir/ne_110m_admin_0_countries.zip"
node scripts/generate-global-map.mjs --source "$map_tooling_dir/ne_110m_admin_0_countries.zip" --deps "$map_tooling_dir"
```

The generator validates the source archive, version, country count, unique identifiers, nonempty/finite paths, and the geographic containment of the four reference points before writing the JSON. It extracts only the named SHP/DBF/version files into a disposable directory and removes that directory afterward. The npm directory and downloaded zip remain available for local reproducibility; no source archive or npm packages are committed.

## Validation performed

- Source version/hash and all five highlight IDs verified.
- All four route anchors fall within their expected geographic country geometry.
- The 176-country output has unique IDs and finite paths.
- Rendered the generated geometry to an SVG/PNG locally and visually inspected its coastline, China highlight, continent placement and anchor alignment. This validates the geometry asset, not the final website layout or interaction.
