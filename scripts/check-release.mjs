import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { site } from '../src/config/site.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) =>
  entry.isDirectory() ? walk(path.join(dir, entry.name)) : [path.join(dir, entry.name)]);
const dist = path.join(root, 'dist');
const pages = walk(dist).filter((file) => file.endsWith('.html'));
assert(pages.length >= 20, 'All existing routes including the thanks page must be built');
let assets = 0;
for (const file of pages) {
  const html = fs.readFileSync(file, 'utf8');
  const page = path.relative(dist, file);
  const canonical = [...html.matchAll(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/g)];
  assert.equal(canonical.length, 1, `${page}: one canonical`);
  assert(canonical[0][1].startsWith(`${site.domain}/`), `${page}: production canonical`);
  assert(!html.includes('href="#/'), `${page}: real route links`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${page}: one static h1`);
  if (site.gtmId) assert.equal((html.match(/event:'gtm.js'/g) || []).length, 1, `${page}: one GTM bootstrap`);
  if (site.metaPixelId) assert.equal((html.match(/fbq\('track','PageView'\)/g) || []).length, 1, `${page}: one Meta PageView`);
  for (const [, value] of html.matchAll(/(?:href|src)="([^"#]+)"/g)) {
    if (!value.startsWith('/') || value.startsWith('//')) continue;
    const clean = decodeURIComponent(value.split(/[?#]/)[0]);
    const target = path.join(dist, clean);
    const found = fs.existsSync(target) || fs.existsSync(path.join(target, 'index.html'));
    assert(found, `${page}: missing local target ${value}`);
    assets++;
  }
}
const home = read('dist/index.html');
assert(!/<meta[^>]+name="robots"[^>]+noindex/.test(home), 'Homepage is indexable');
assert(home.includes(`https://wa.me/${site.contact.whatsapp}`), 'Homepage uses configured WhatsApp');
assert(!home.includes('not connected in this preview'), 'No obsolete contact placeholder');
const thanks = read('dist/inquiry/thanks/index.html');
assert(thanks.includes('noindex,nofollow') && thanks.includes('data-thanks'), 'Thanks retains noindex and conversion flag');
assert(!walk(dist).filter((f) => /sitemap.*\.xml$/.test(f)).map((f) => fs.readFileSync(f,'utf8')).join('').includes('/inquiry/thanks/'), 'Thanks stays out of sitemap');
const resources = JSON.parse(read('src/data/resources.json'));
for (const [id, content] of Object.entries(resources)) {
  assert.equal(read(`public/downloads/${id}.${id === 'range-overview' ? 'csv' : 'txt'}`), (id === 'range-overview' ? '\uFEFF' : '') + content);
}
const products = JSON.parse(read('src/data/products.json'));
for (const product of products) assert(resources['range-overview'].includes(product.name), `CSV includes ${product.name}`);
console.log(JSON.stringify({ passed: true, pages: pages.length, localReferences: assets, products: products.length, resources: Object.keys(resources).length }, null, 2));
