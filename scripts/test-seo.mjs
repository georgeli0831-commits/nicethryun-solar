import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';
import { site } from '../src/config/site.mjs';
import { canonicalPathFor, createPageSeo, isSearchIndexable, normalizePath, robotsText, serializeJsonLd } from '../src/lib/seo.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const json = (path) => JSON.parse(readFileSync(resolve(root, path), 'utf8'));
const products = json('src/data/products.json');
const applications = json('src/data/applications.json');
const imagePaths = json('src/data/image-paths.json');
const { familyNames } = json('src/data/labels.json');
const data = { site, products, applications, imagePaths, familyNames };
const routes = [
  '/', '/products/', ...products.map((p) => `/products/${p.id}/`),
  '/applications/', ...Object.keys(applications).map((id) => `/applications/${id === 'entryway' ? 'entry' : id}/`),
  '/manufacturing/', '/oem/', '/resources/', '/guides/solar-lighting-selection/', '/inquiry/',
];
const byType = (metadata, type) => metadata.graph['@graph'].filter((item) => item['@type'] === type);
const publicImageExists = (image) => {
  const url = new URL(image);
  assert.equal(url.origin, new URL(site.domain).origin, 'Site images must be first-party');
  assert.ok(existsSync(resolve(root, 'public', decodeURIComponent(url.pathname).slice(1))), `Missing image: ${url.pathname}`);
};
const metadata = routes.map((route) => createPageSeo(route, data));
assert.equal(new Set(metadata.map((item) => item.title)).size, routes.length, 'Each canonical route needs a distinct title');
assert.equal(new Set(metadata.map((item) => item.description)).size, routes.length, 'Each canonical route needs a distinct description');
for (const page of metadata) {
  assert.ok(page.title && page.description);
  publicImageExists(page.image);
  const [organization] = byType(page, 'Organization');
  assert.equal(organization['@id'], `${site.domain}/#organization`);
  assert.equal(organization.email, site.contact.email);
  assert.equal(organization.telephone, site.contact.phone);
  assert.ok(!organization.address && !organization.legalName && !organization.foundingDate);
  assert.equal(byType(page, 'WebSite')[0].publisher['@id'], organization['@id']);
  assert.equal(JSON.parse(serializeJsonLd(page.graph))['@context'], 'https://schema.org');
}
for (const product of products) {
  const page = createPageSeo(`/products/${product.id}/?ref=test`, data, { title: `NICETHRYUN — ${product.name}`, description: site.description });
  const [schema] = byType(page, 'Product');
  assert.equal(schema.name, product.name);
  assert.ok(page.description.includes(product.desc));
  assert.equal(schema.image[0], page.image, 'Product OG and structured data must show the actual product');
  assert.equal(schema.model, product.model || undefined);
  assert.ok(schema.description.includes(product.specNote), 'Preserve supplier-data qualification');
  for (const key of ['offers', 'review', 'aggregateRating', 'sku', 'mpn', 'gtin', 'manufacturer', 'hasCertification']) {
    assert.equal(schema[key], undefined, `Do not fabricate ${key}`);
  }
  const visibleFacts = new Map([['Panel arrangement', product.panel], ['Installation format', product.mount], ...product.specs]);
  for (const fact of schema.additionalProperty) {
    assert.equal(fact.value, visibleFacts.get(fact.name), 'Every structured specification must match a visible source value');
    assert.notEqual(fact.value, 'Confirm with sample', 'Unknown values are not product specifications');
  }
  const crumbs = byType(page, 'BreadcrumbList')[0].itemListElement;
  assert.deepEqual(crumbs.map((item) => item.name), ['Home', 'Products', familyNames[product.family], product.name]);
  assert.equal(crumbs.at(-2).item, `${site.domain}/products/?family=${product.family}`);
}
assert.equal(normalizePath('/products/?family=sensor#top'), '/products/');
assert.equal(canonicalPathFor('/applications/patio/?source=test'), '/applications/garden/');
assert.equal(createPageSeo('/applications/patio/', data).canonical, `${site.domain}/applications/garden/`);
assert.equal(createPageSeo('/products/', data, { title: 'A deliberately supplied title', description: 'A deliberate description.' }).title, 'A deliberately supplied title');
assert.equal(createPageSeo('/products/', data, { title: 'NICETHRYUN — Solar lighting, clearly selected.' }).title, createPageSeo('/products/', data).title);
for (const path of ['/inquiry/thanks/', '/404.html', '/404/', '/applications/patio/']) {
  assert.equal(isSearchIndexable(`${site.domain}${path}`), false, `Exclude ${path} from sitemap`);
}
for (const path of routes) assert.ok(isSearchIndexable(`${site.domain}${path}`));
const robots = robotsText(site.domain);
assert.match(robots, /User-agent: OAI-SearchBot\nAllow: \/\n/);
assert.match(robots, /User-agent: \*\nAllow: \/\n/);
assert.ok(!robots.includes('Disallow:'), 'Keep the existing generic policy; training is a separate owner decision');
assert.ok(!serializeJsonLd({ value: '</script><script>unsafe()</script>' }).includes('<'));
console.log(`SEO source checks passed: ${routes.length} canonical routes, ${products.length} source-backed Product entities.`);

if (process.argv.includes('--built')) {
  const dist = resolve(root, 'dist');
  const decode = (value) => value.replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16))).replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n))).replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
  const visible = (value) => decode(value.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '').replace(/<[^>]+>/g, ' ')).replace(/\s+/g, ' ').trim();
  const allRoutes = [...routes, '/applications/patio/', '/inquiry/thanks/', '/404.html'];
  const builtTitles = new Set(), builtDescriptions = new Set();
  for (const route of allRoutes) {
    const file = route === '/404.html' ? '404.html' : `${route.slice(1)}index.html`;
    const html = readFileSync(resolve(dist, file), 'utf8');
    const tagValue = (name, type = 'name') => {
      const tag = html.match(new RegExp(`<meta\\b[^>]*${type}="${name}"[^>]*>`, 'i'))?.[0];
      return decode(tag?.match(/content="([^"]*)"/)?.[1] || '');
    };
    const canonical = decode(html.match(/<link\b[^>]*rel="canonical"[^>]*href="([^"]+)"/)?.[1] || '');
    assert.equal(canonical, `${site.domain}${canonicalPathFor(route)}`, `Built canonical: ${route}`);
    assert.equal(tagValue('og:url', 'property'), canonical);
    publicImageExists(tagValue('og:image', 'property'));
    const title = decode(html.match(/<title>([\s\S]*?)<\/title>/)?.[1] || '');
    const description = tagValue('description');
    assert.ok(title && description, `Built metadata: ${route}`);
    if (isSearchIndexable(route)) {
      assert.ok(!builtTitles.has(title), `Duplicate built title: ${route}`);
      assert.ok(!builtDescriptions.has(description), `Duplicate built description: ${route}`);
      builtTitles.add(title); builtDescriptions.add(description);
    }
    const scripts = [...html.matchAll(/<script\b[^>]*type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/g)].map((match) => JSON.parse(match[1]));
    assert.equal(scripts.length, 1, `One connected structured-data graph: ${route}`);
    const graph = scripts[0]['@graph'];
    const schema = graph.find((item) => item['@type'] === 'Product');
    if (schema) {
      const pageText = visible(html);
      assert.ok(pageText.includes(schema.name), `Visible product name: ${route}`);
      for (const fact of schema.additionalProperty) assert.ok(pageText.includes(fact.value), `Visible specification ${fact.name}: ${route}`);
      assert.equal(schema.image[0], tagValue('og:image', 'property'));
    }
    const breadcrumb = graph.find((item) => item['@type'] === 'BreadcrumbList');
    if (breadcrumb) {
      const nav = html.match(/<nav\b[^>]*aria-label="Breadcrumb"[^>]*>([\s\S]*?)<\/nav>/)?.[1];
      assert.ok(nav, `Visible breadcrumb required: ${route}`);
      const entries = [...nav.matchAll(/<(a|span)\b([^>]*)>([\s\S]*?)<\/\1>/g)].filter(([, tag, attributes]) => tag === 'a' || attributes.includes('aria-current'));
      assert.deepEqual(breadcrumb.itemListElement.map((item) => item.name), entries.map((entry) => visible(entry[3])), `Breadcrumb names: ${route}`);
      entries.forEach((entry, index) => {
        if (entry[1] === 'a') assert.equal(breadcrumb.itemListElement[index].item, new URL(decode(entry[2].match(/href="([^"]+)"/)[1]), site.domain).href, `Breadcrumb link: ${route}`);
      });
    }
    if (route === '/404.html' || route === '/inquiry/thanks/') assert.match(tagValue('robots'), /noindex/);
  }
  const sitemap = readdirSync(dist).filter((file) => /^sitemap.*\.xml$/.test(file)).map((file) => readFileSync(resolve(dist, file), 'utf8')).join('\n');
  for (const route of routes) assert.ok(sitemap.includes(`${site.domain}${route}</loc>`), `Missing sitemap URL: ${route}`);
  for (const route of ['/applications/patio/', '/inquiry/thanks/', '/404.html']) assert.ok(!sitemap.includes(`${site.domain}${route}</loc>`), `Excluded sitemap URL: ${route}`);
  assert.equal(readFileSync(resolve(dist, 'robots.txt'), 'utf8'), robots);
  console.log(`SEO built-output checks passed: ${allRoutes.length} HTML pages, visible specification/breadcrumb parity, image files, canonical URLs, sitemap and robots.`);
}
