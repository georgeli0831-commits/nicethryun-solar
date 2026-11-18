/**
 * Build-time only: Natural Earth 110m v5.1.1 -> static SVG geometry.
 * No generator dependencies are required by the site build or browser.
 * See docs/review/global-map-source.md for source, license and reproduction.
 *
 * node scripts/generate-global-map.mjs --source /tmp/map/ne_110m_admin_0_countries.zip --deps /tmp/map
 * Temporary dependencies: d3-geo@3.1.1, shapefile@0.6.6; system tool: unzip.
 */
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const SOURCE_SHA256 = '0f243aeac8ac6cf26f0417285b0bd33ac47f1b5bdb719fd3e0df37d03ea37110';
const SOURCE_VERSION = '5.1.1';
const basename = 'ne_110m_admin_0_countries';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const option = (name) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};
const source = option('--source');
const deps = option('--deps');
if (!source || !deps) {
  throw new Error('Usage: node scripts/generate-global-map.mjs --source /path/to/ne_110m_admin_0_countries.zip --deps /path/to/temporary/npm/prefix');
}

const require = createRequire(join(resolve(deps), 'package.json'));
const { geoNaturalEarth1, geoPath, geoGraticule, geoTransform, geoContains } = await import(pathToFileURL(require.resolve('d3-geo')));
const { default: shapefile } = await import(pathToFileURL(require.resolve('shapefile')));
const archive = await readFile(resolve(source));
const actualHash = createHash('sha256').update(archive).digest('hex');
if (actualHash !== SOURCE_SHA256) throw new Error(`Unexpected source SHA-256: ${actualHash}. Review source/version before updating the pinned hash.`);

const scratch = await mkdtemp(join(tmpdir(), 'nicethryun-global-map-'));
try {
  // Extract named files only; do not trust arbitrary archive paths.
  execFileSync('unzip', ['-q', resolve(source), `${basename}.shp`, `${basename}.dbf`, `${basename}.VERSION.txt`, '-d', scratch]);
  const version = (await readFile(join(scratch, `${basename}.VERSION.txt`), 'utf8')).trim();
  if (version !== SOURCE_VERSION) throw new Error(`Unexpected Natural Earth version: ${version}`);
  const data = await shapefile.read(join(scratch, `${basename}.shp`), join(scratch, `${basename}.dbf`), { encoding: 'utf-8' });
  const clean = (value) => String(value ?? '').replaceAll('\0', '').trim();
  const features = data.features.filter(({ properties }) => clean(properties.ADM0_A3) !== 'ATA');

  const sphere = { type: 'Sphere' };
  const width = 1200;
  const height = 500;
  const insetX = 26;
  const insetY = 24;
  const projection = geoNaturalEarth1().rotate([-150, 0]).precision(0.15).fitWidth(width - 2 * insetX, sphere);
  const rawBounds = geoPath(projection).bounds(sphere);
  const yScale = (height - 2 * insetY) / (rawBounds[1][1] - rawBounds[0][1]);
  const projectPoint = ([x, y]) => [x + insetX, insetY + (y - rawBounds[0][1]) * yScale];
  const displayTransform = geoTransform({
    point(x, y) { this.stream.point(...projectPoint([x, y])); },
  });
  const displayProjection = { stream: (sink) => projection.stream(displayTransform.stream(sink)) };
  const path = geoPath(displayProjection).digits(2);
  const countries = features.map((feature) => {
    const iso = clean(feature.properties.ISO_N3_EH);
    return {
      // Preserve leading zeroes; use a stable Natural Earth code for non-ISO entries.
      id: /^\d{3}$/.test(iso) ? iso : `NE-${clean(feature.properties.ADM0_A3)}`,
      name: clean(feature.properties.NAME_EN || feature.properties.ADMIN),
      path: path(feature),
    };
  });
  const coordinates = { china: [110, 32], europe: [10, 51], middleEast: [47, 25], australia: [134, -25] };
  const points = Object.fromEntries(Object.entries(coordinates).map(([key, lonlat]) => {
    const [x, y] = projectPoint(projection(lonlat));
    return [key, { x: +x.toFixed(2), y: +y.toFixed(2) }];
  }));

  if (countries.length !== 176 || new Set(countries.map(({ id }) => id)).size !== countries.length) {
    throw new Error('Unexpected number of countries or duplicate map identifiers');
  }
  for (const [id, key] of [['156', 'china'], ['276', 'europe'], ['682', 'middleEast'], ['036', 'australia']]) {
    const country = features.find(({ properties }) => clean(properties.ISO_N3_EH) === id);
    if (!country || !geoContains(country, coordinates[key])) throw new Error(`Reference point does not belong to expected map geometry: ${id}/${key}`);
  }
  for (const country of countries) {
    if (!country.path || /NaN|Infinity/.test(country.path)) throw new Error(`Invalid SVG path: ${country.id}`);
  }
  const result = { viewBox: `0 0 ${width} ${height}`, sphere: path(sphere), graticule: path(geoGraticule().step([20, 20])()), countries, points };
  const output = join(root, 'src/data/global-map.json');
  await writeFile(output, `${JSON.stringify(result)}\n`);
  console.log(JSON.stringify({ output, countries: countries.length, bytes: Buffer.byteLength(JSON.stringify(result)) + 1, sourceVersion: version, sourceSHA256: actualHash, points }, null, 2));
} finally {
  await rm(scratch, { recursive: true, force: true });
}
