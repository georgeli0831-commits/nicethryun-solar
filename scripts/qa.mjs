#!/usr/bin/env node
/** Reproducible, local-only fidelity and interaction review of the approved demo. */
import assert from 'node:assert/strict';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createHash } from 'node:crypto';
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
const { PNG } = createRequire(import.meta.url)('pngjs');
import pixelmatch from 'pixelmatch';

export const ROUTES = [
  ['home', '/', '/'],
  ['products', '/products/', '/products'],
  ...['solar-flood', 'split-panel', 'multi-head', 'compact-wall', 'slim-wall', 'garden-spot'].map(id => [`products-${id}`, `/products/${id}/`, `/product/${id}`]),
  ['applications', '/applications/', '/applications/driveway'],
  ['applications-entry', '/applications/entry/', '/applications/entryway'],
  ['applications-driveway', '/applications/driveway/', '/applications/driveway'],
  ['applications-perimeter', '/applications/perimeter/', '/applications/perimeter'],
  ['applications-garden', '/applications/garden/', '/applications/garden'],
  ['applications-patio', '/applications/patio/', '/applications/garden'],
  ['manufacturing', '/manufacturing/', '/manufacturing'],
  ['oem', '/oem/', '/oem'],
  ['resources', '/resources/', '/resources'],
  ['inquiry', '/inquiry/', '/inquiry'],
];
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const BASE = process.env.QA_BASE_URL || 'http://127.0.0.1:4399';
const OUT = resolve(process.env.QA_OUTPUT || join(ROOT, 'docs/review/m1'));
const DEMO = process.env.NICETHRYUN_DEMO || process.env.QA_DEMO_PATH || resolve(ROOT, '../../NICETHRYUN_融合版官网_20260919/NICETHRYUN_融合版_独立预览.html');
const CHROME = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const SNAPSHOTS = process.env.QA_INTERACTIONS_ONLY !== '1';
const INTERACTIONS = process.env.QA_SCREENSHOTS_ONLY !== '1';
const VIEWPORTS = { desktop: { width: 1440, height: 1000 }, mobile: { width: 390, height: 844 } };
const hash = value => createHash('sha256').update(value).digest('hex');

async function serveDemo() {
  const html = await readFile(DEMO);
  const server = createServer((request, response) => {
    if (request.url === '/favicon.ico') { response.writeHead(204); response.end(); return; }
    if (request.url !== '/') { response.writeHead(404); response.end('Not found'); return; }
    response.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' });
    response.end(html);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { server, base: `http://127.0.0.1:${server.address().port}`, sourceSha256: hash(html) };
}

function track(page) {
  const issues = { pageErrors: [], consoleErrors: [], httpErrors: [], failedRequests: [], blockedRequests: [] };
  page.on('pageerror', error => issues.pageErrors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') issues.consoleErrors.push(message.text()); });
  page.on('response', response => { if (response.status() >= 400) issues.httpErrors.push({ url: response.url(), status: response.status() }); });
  page.on('requestfailed', request => issues.failedRequests.push({ url: request.url(), error: request.failure()?.errorText }));
  return issues;
}
async function localOnly(context, origins, issues) {
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (['data:', 'blob:', 'about:'].includes(url.protocol)) return route.continue();
    if (!origins.includes(url.origin) || !['GET', 'HEAD'].includes(request.method())) {
      issues.blockedRequests.push({ url: url.href, method: request.method() });
      return route.abort('blockedbyclient');
    }
    return route.continue();
  });
}

async function ready(page) {
  await page.locator('#main-content h1').waitFor();
  await page.locator('.quote-toggle[aria-label^="Open quote list,"]').waitFor();
  await page.waitForFunction(() => !document.querySelector('i[data-lucide]'));
  await page.evaluate(async () => {
    await document.fonts.ready;
    const images = [...document.images];
    // Trigger native lazy loading without letting a viewport-dependent omission hide broken assets.
    images.forEach(image => { image.loading = 'eager'; });
    for (let y = 0; y < document.documentElement.scrollHeight; y += innerHeight) scrollTo(0, y);
    await Promise.all(images.map(image => image.decode().catch(() => {})));
    scrollTo({ top: 0, behavior: 'instant' });
    await new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
}

async function describe(page) {
  return page.evaluate(() => {
    const rounded = n => Math.round(n * 100) / 100;
    const box = node => { const r = node.getBoundingClientRect(); return { x: rounded(r.x + scrollX), y: rounded(r.y + scrollY), width: rounded(r.width), height: rounded(r.height) }; };
    const visible = node => { const r = node.getBoundingClientRect(); return r.width > 0 && r.height > 0 && getComputedStyle(node).visibility !== 'hidden'; };
    const elements = [...document.querySelectorAll('main > *, .topline, .site-header, .site-footer, main h1, main h2, main .product-card, main .application-panel, main .route-tabs, main form, main .detail-gallery, main .detail-copy')].filter(visible).map(node => ({ tag: node.tagName, className: node.className, text: node.matches('h1,h2') ? node.innerText : '', ...box(node) }));
    const imageBoxes = [...document.images].filter(visible).map(box);
    const overflow = [...document.querySelectorAll('body *')].filter(node => {
      if (!visible(node) || node.closest('[hidden],dialog:not([open]),svg,.multi-crop,.compare-scroll')) return false;
      const r = node.getBoundingClientRect();
      return r.x < -1 || r.right > innerWidth + 1;
    }).slice(0, 15).map(node => ({ tag: node.tagName, id: node.id, className: typeof node.className === 'string' ? node.className : '', ...box(node) }));
    return { title: document.title, text: document.body.innerText.replace(/\s+/g, ' ').trim(), mainText: document.querySelector('main').innerText.replace(/\s+/g, ' ').trim(), width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight, viewportWidth: innerWidth, elements, imageBoxes, overflow, brokenImages: [...document.images].filter(image => !image.complete || image.naturalWidth === 0).map(image => ({ src: image.getAttribute('src')?.slice(0, 120), alt: image.alt })) };
  });
}
function pad(input, width, height) {
  const output = new PNG({ width, height });
  output.data.fill(255);
  PNG.bitblt(input, output, 0, 0, input.width, input.height, 0, 0);
  return output;
}
function maskImages(png, boxes) {
  for (const box of boxes) {
    const left = Math.max(0, Math.floor(box.x) - 1), right = Math.min(png.width, Math.ceil(box.x + box.width) + 1);
    const top = Math.max(0, Math.floor(box.y) - 1), bottom = Math.min(png.height, Math.ceil(box.y + box.height) + 1);
    for (let y = top; y < bottom; y++) for (let x = left; x < right; x++) { const at = (y * png.width + x) * 4; png.data.fill(255, at, at + 4); }
  }
}
async function diffImages(referencePath, migratedPath, outputPath, reference, migrated) {
  const source = PNG.sync.read(await readFile(referencePath)), target = PNG.sync.read(await readFile(migratedPath));
  const width = Math.max(source.width, target.width), height = Math.max(source.height, target.height);
  const left = pad(source, width, height), right = pad(target, width, height), diff = new PNG({ width, height });
  const changedPixels = pixelmatch(left.data, right.data, diff.data, width, height, { threshold: 0.1, includeAA: false });
  await writeFile(outputPath, PNG.sync.write(diff));
  // Images have intentional compression in the delivery files. Masking the union of image bounds
  // gives a second signal for typography, positioning and non-image colors.
  const boxes = [...reference.imageBoxes, ...migrated.imageBoxes];
  maskImages(left, boxes); maskImages(right, boxes);
  const nonImageChangedPixels = pixelmatch(left.data, right.data, null, width, height, { threshold: 0.1, includeAA: false });
  const round = n => Math.round(n * 100000) / 100000;
  return { referenceSize: [source.width, source.height], migratedSize: [target.width, target.height], changedPixels, changedPercent: round(changedPixels / (width * height) * 100), nonImageChangedPixels, nonImageChangedPercent: round(nonImageChangedPixels / (width * height) * 100) };
}
function geometryDifferences(reference, migrated) {
  const differences = [];
  if (reference.elements.length !== migrated.elements.length) differences.push({ type: 'element-count', reference: reference.elements.length, migrated: migrated.elements.length });
  for (let i = 0; i < Math.min(reference.elements.length, migrated.elements.length); i++) {
    const a = reference.elements[i], b = migrated.elements[i];
    const maxDelta = Math.max(...['x', 'y', 'width', 'height'].map(key => Math.abs(a[key] - b[key])));
    if (maxDelta > 0.75 || a.tag !== b.tag || a.className !== b.className) differences.push({ index: i, maxDelta, reference: a, migrated: b });
  }
  return differences;
}
function firstTextDifference(reference, migrated) {
  if (reference === migrated) return null;
  let index = 0; while (reference[index] === migrated[index] && index < Math.min(reference.length, migrated.length)) index++;
  return { index, reference: reference.slice(Math.max(0, index - 70), index + 180), migrated: migrated.slice(Math.max(0, index - 70), index + 180) };
}

async function screenshots(browser, demoBase) {
  const results = [];
  for (const [viewportName, viewport] of Object.entries(VIEWPORTS)) {
    const output = join(OUT, 'screenshots', viewportName); await mkdir(output, { recursive: true });
    for (const [id, route, demoRoute] of ROUTES) {
      const snapshots = [];
      for (const [version, url] of [['demo', `${demoBase}/#${demoRoute}`], ['astro', `${BASE}${route}`]]) {
        const context = await browser.newContext({ viewport, deviceScaleFactor: 1, reducedMotion: 'reduce' });
        const page = await context.newPage(), issues = track(page);
        await localOnly(context, [new URL(BASE).origin, demoBase], issues);
        try {
          const response = await page.goto(url, { waitUntil: 'networkidle' });
          await ready(page);
          const descriptor = await describe(page), path = join(output, `${id}-${version}.png`);
          await page.screenshot({ path, fullPage: true, animations: 'disabled' });
          snapshots.push({ ...descriptor, issues, status: response?.status(), path });
        } finally { await context.close(); }
      }
      const [reference, migrated] = snapshots;
      const pixel = await diffImages(reference.path, migrated.path, join(output, `${id}-diff.png`), reference, migrated);
      const geometry = geometryDifferences(reference, migrated);
      reference.path = `screenshots/${viewportName}/${id}-demo.png`;
      migrated.path = `screenshots/${viewportName}/${id}-astro.png`;
      const item = { id, route, demoRoute, viewport: viewportName, status: migrated.status, textEqual: reference.text === migrated.text, firstTextDifference: firstTextDifference(reference.text, migrated.text), geometryDifferences: geometry, pixel, reference, migrated };
      results.push(item);
      console.log(`${viewportName} ${route} HTTP ${item.status} text=${item.textEqual} geometry=${geometry.length} diff=${pixel.changedPercent}% non-image=${pixel.nonImageChangedPercent}%`);
    }
  }
  return results;
}

async function interactions(browser, demoBase) {
  const results = [];
  async function test(name, viewport, run) {
    const context = await browser.newContext({ viewport: VIEWPORTS[viewport], acceptDownloads: true });
    const page = await context.newPage(), issues = track(page);
    page.setDefaultTimeout(10000);
    await localOnly(context, [new URL(BASE).origin, demoBase], issues);
    try {
      const detail = await run(page, context);
      assert.deepEqual(issues.pageErrors, [], 'uncaught browser exception');
      assert.deepEqual(issues.blockedRequests, [], 'unexpected external or mutating request');
      assert.deepEqual(issues.httpErrors, [], 'HTTP error');
      results.push({ name, viewport, passed: true, detail, issues });
      console.log(`PASS ${name}`);
    } catch (error) {
      const failurePath = join(OUT, 'interactions', name.replace(/[^a-z0-9]+/gi, '-').toLowerCase() + '.png');
      await page.screenshot({ path: failurePath, fullPage: true }).catch(() => {});
      const state = await page.evaluate(() => ({ url: location.href, localState: localStorage.getItem('nicethryun-prototype-v1'), navigationState: sessionStorage.getItem('nicethryun-prototype-v1-navigation'), pageShows: window.__qaPageShows || [], tray: document.querySelector('#compare-tray')?.innerText, checkedComparisons: [...document.querySelectorAll('[data-compare]:checked')].map(node => node.dataset.compare) })).catch(() => null);
      results.push({ name, viewport, passed: false, error: error.stack, state, issues });
      console.log(`FAIL ${name}: ${error.message}`);
    } finally { await context.close(); }
  }
  const visit = async (page, route) => { await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle' }); await ready(page); };
  const shown = selector => async page => assert.equal(await page.locator(selector).isVisible(), true);
  await mkdir(join(OUT, 'interactions'), { recursive: true });
  await test('Desktop mega menu toggle outside click and Escape', 'desktop', async page => {
    await visit(page, '/');
    await page.locator('#product-menu-toggle').click(); await shown('#product-menu')(page);
    assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.mouse.click(1420, 750); assert.equal(await page.locator('#product-menu').isVisible(), false);
    await page.locator('#product-menu-toggle').click(); await page.keyboard.press('Escape');
    assert.equal(await page.locator('#product-menu-toggle').getAttribute('aria-expanded'), 'false');
    await page.locator('#product-menu-toggle').click(); await page.locator('#product-menu a').first().click();
    await page.locator('#catalogue-results').waitFor();
    assert.equal(await page.locator('#product-menu').isVisible(), false);
  });
  await test('Mobile navigation toggle Escape and route navigation', 'mobile', async page => {
    await visit(page, '/');
    await page.locator('#mobile-menu-toggle').click(); await shown('#mobile-menu')(page);
    assert.equal(await page.locator('#mobile-menu-toggle').getAttribute('aria-expanded'), 'true');
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#mobile-menu').isVisible(), false);
    await page.locator('#mobile-menu-toggle').click(); await page.locator('#mobile-menu a').first().click();
    await page.locator('#catalogue-results').waitFor(); assert.equal(await page.locator('#mobile-menu').isVisible(), false);
    await page.locator('[data-action="toggle-filters"]').click();
    assert.equal(await page.locator('#catalogue-side').evaluate(node => node.classList.contains('mobile-open')), true);
    await page.locator('[name="panel-filter"][value="Split solar"]').check();
    await page.waitForFunction(() => document.querySelectorAll('#catalogue-results .product-card').length === 2);
  });
  await test('Home product filter search reset and accessible keyboard tabs', 'desktop', async page => {
    await visit(page, '/');
    await page.locator('[data-home-filter="Split solar"]').click();
    assert.equal(await page.locator('#home-products .product-card').count(), 2);
    await page.locator('#home-search').fill('no-match-qa'); await shown('#home-products .empty-state')(page);
    await page.locator('[data-action="clear-home-search"]').click();
    assert.equal(await page.locator('#home-products .product-card').count(), 3);
    const tabs = page.locator('[data-home-app]');
    await tabs.first().focus(); await page.keyboard.press('ArrowRight');
    assert.equal(await tabs.nth(1).getAttribute('aria-selected'), 'true');
    await page.keyboard.press('End'); assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('Home'); assert.equal(await tabs.first().getAttribute('aria-selected'), 'true');
    await page.keyboard.press('ArrowLeft'); assert.equal(await tabs.last().getAttribute('aria-selected'), 'true');
    assert.equal(await page.locator('#home-application-panel').getAttribute('aria-labelledby'), await tabs.last().getAttribute('id'));
  });
  await test('Catalogue filters search no-results reset and compare limit clear', 'desktop', async page => {
    await visit(page, '/products/');
    assert.equal(await page.locator('#catalogue-results .product-card').count(), 6);
    await page.locator('[name="panel-filter"][value="Split solar"]').check();
    await page.waitForFunction(() => document.querySelectorAll('#catalogue-results .product-card').length === 2);
    await page.locator('[name="app-filter"][value="driveway"]').check();
    await page.locator('#catalogue-search').fill('flood');
    assert.equal(await page.locator('#catalogue-results .product-card').count(), 1);
    await page.locator('#catalogue-search').fill('no-match-qa'); await shown('#catalogue-results .empty-state')(page);
    await page.locator('[data-action="reset-filters"]').first().click();
    await page.waitForFunction(() => document.querySelectorAll('#catalogue-results .product-card').length === 6);
    for (let i = 0; i < 4; i++) await page.locator('[data-compare]').nth(i).click();
    assert.equal(await page.locator('[data-compare]:checked').count(), 3);
    assert.match(await page.locator('#toast').innerText(), /Compare up to 3/);
    await page.locator('#compare-tray [data-action="compare"]').click(); await shown('#compare-dialog')(page);
    assert.equal(await page.locator('#compare-dialog thead th').count(), 4);
    await page.locator('[data-close="compare-dialog"]').click();
    await page.locator('#compare-tray [data-action="clear-compare"]').first().click();
    assert.equal(await page.locator('#compare-tray').isVisible(), false);
    assert.equal(await page.locator('[data-compare]:checked').count(), 0);
  });
  await test('Product gallery quantity RFQ removal and cross-page persisted cart', 'desktop', async page => {
    await visit(page, '/products/multi-head/');
    const initial = await page.locator('#detail-image img').getAttribute('src');
    await page.locator('[data-gallery]').nth(1).click();
    assert.notEqual(await page.locator('#detail-image img').getAttribute('src'), initial);
    assert.equal(await page.locator('[data-gallery]').nth(1).getAttribute('aria-pressed'), 'true');
    await page.locator('[data-qty="detail"]').fill('250');
    await page.locator('[data-detail-qty]').click();
    await visit(page, '/products/');
    await page.locator('[data-add="split-panel"]').click();
    await page.locator('.quote-toggle').click();
    assert.equal(await page.locator('#quote-dialog .quote-line').count(), 2);
    assert.equal(await page.locator('[data-qty="multi-head"]').inputValue(), '250');
    await page.locator('[data-qty-id="multi-head"][data-qty-step="1"]').click();
    assert.equal(await page.locator('[data-qty="multi-head"]').inputValue(), '251');
    await page.locator('[data-remove="split-panel"]').click();
    assert.equal(await page.locator('#quote-dialog .quote-line').count(), 1);
    await page.locator('#quote-dialog a[href*="inquiry"]').click();
    await page.locator('#inquiry-form').waitFor();
    assert.match(await page.locator('.inquiry-summary').innerText(), /251 pcs/);
    await page.reload({ waitUntil: 'networkidle' });
    assert.match(await page.locator('.inquiry-summary').innerText(), /251 pcs/);
  });
  await test('Inquiry native validation Other destination draft persistence and TXT JSON exports', 'desktop', async page => {
    await visit(page, '/inquiry/');
    const form = page.locator('#inquiry-form');
    await form.locator('[type="submit"]').click();
    assert.equal(await form.evaluate(node => node.checkValidity()), false);
    await form.locator('[name="company"]').fill('NICETHRYUN QA Company');
    await form.locator('[name="contact"]').fill('QA Contact');
    await form.locator('[name="email"]').fill('qa@example.invalid');
    await form.locator('[name="country"]').selectOption('Other');
    await shown('#other-country-field')(page);
    assert.equal(await form.locator('[name="otherCountry"]').evaluate(node => node.required), true);
    await form.locator('[name="message"]').fill('Local-only M1 review request.');
    await form.locator('[name="consent"]').check();
    assert.equal(await form.evaluate(node => node.checkValidity()), false);
    await form.locator('[name="otherCountry"]').fill('QA Destination');
    await form.locator('[data-action="save-draft"]').click();
    await visit(page, '/products/'); await visit(page, '/inquiry/');
    assert.equal(await form.locator('[name="company"]').inputValue(), 'NICETHRYUN QA Company');
    assert.equal(await form.locator('[name="otherCountry"]').inputValue(), 'QA Destination');
    await form.locator('[name="consent"]').check();
    assert.equal(await form.evaluate(node => node.checkValidity()), true);
    await form.locator('[type="submit"]').click();
    await page.locator('.success-card').waitFor();
    const downloads = [];
    for (const type of ['brief', 'json']) {
      const pending = page.waitForEvent('download');
      await page.locator(`[data-action="download-${type}"]`).click();
      const download = await pending, path = join(OUT, 'interactions', download.suggestedFilename());
      await download.saveAs(path); const contents = await readFile(path, 'utf8');
      assert.match(contents, /NICETHRYUN QA Company/); assert.match(contents, /QA Destination/);
      if (type === 'brief') assert.match(contents, /LOCAL DRAFT — NOT SENT/);
      else assert.equal(JSON.parse(contents).email, 'qa@example.invalid');
      downloads.push({ filename: download.suggestedFilename(), sha256: hash(contents) });
    }
    await page.locator('[data-action="edit-brief"]').click();
    await page.locator('[data-action="clear-draft"]').click();
    assert.equal(await page.locator('[name="company"]').inputValue(), '');
    assert.equal(await page.locator('#other-country-field').isVisible(), false);
    return { downloads };
  });
  await test('Quick inquiry transfers country application email without submission', 'desktop', async page => {
    await visit(page, '/');
    const form = page.locator('#quick-inquiry');
    await form.locator('[name="country"]').selectOption('Germany');
    await form.locator('[name="application"]').selectOption('driveway');
    await form.locator('[name="email"]').fill('qa@example.invalid');
    await form.locator('[type="submit"]').click();
    await page.locator('#inquiry-form').waitFor();
    assert.equal(await page.locator('#inquiry-form [name="country"]').inputValue(), 'Germany');
    assert.equal(await page.locator('#inquiry-form [name="application"]').inputValue(), 'driveway');
    assert.equal(await page.locator('#inquiry-form [name="email"]').inputValue(), 'qa@example.invalid');
  });
  await test('OEM brief transfers range scope quantity packaging and market', 'desktop', async page => {
    await visit(page, '/oem/');
    const form = page.locator('#oem-form');
    await form.locator('[name="scope"][value="Retail-ready range"]').check();
    await form.locator('[name="family"]').selectOption('Split-panel security light');
    await form.locator('[name="country"]').selectOption('Australia');
    await form.locator('[name="quantity"]').fill('500');
    await form.locator('[name="packaging"]').selectOption('Own-brand color box');
    await form.locator('[name="message"]').fill('Local-only OEM QA.');
    await form.locator('[type="submit"]').click();
    await page.locator('#inquiry-form').waitFor();
    assert.equal(await page.locator('#inquiry-form [name="role"]').inputValue(), 'Private-label brand');
    assert.equal(await page.locator('#inquiry-form [name="country"]').inputValue(), 'Australia');
    const text = await page.locator('#inquiry-form [name="message"]').inputValue();
    for (const value of ['Retail-ready range', 'Split-panel security light', '500 pcs', 'Own-brand color box', 'Local-only OEM QA.']) assert.ok(text.includes(value), `OEM message must contain ${value}`);
    assert.match(await page.locator('.inquiry-summary').innerText(), /500 pcs/);
  });
  await test('Search result real routes and compare quote state across detail navigation', 'desktop', async page => {
    await visit(page, '/products/');
    await page.locator('#catalogue-search').fill('split');
    assert.equal(await page.locator('#catalogue-results .product-card').count(), 2);
    const hrefs = await page.locator('#catalogue-results a').evaluateAll(nodes => nodes.map(node => node.getAttribute('href')));
    assert.ok(hrefs.every(href => href.startsWith('/products/') && !href.includes('#/')), 'search result links must be real product routes');
    await page.locator('#catalogue-results [data-add="split-panel"]').click();
    await page.locator('#catalogue-results [data-compare="split-panel"]').check();
    await page.locator('#catalogue-results [data-compare="solar-flood"]').check();
    await page.locator('#catalogue-results a.text-link[href="/products/split-panel/"]').click();
    await page.locator('.detail-copy h1').waitFor();
    assert.equal(new URL(page.url()).pathname, '/products/split-panel/');
    assert.match(await page.locator('#compare-tray').innerText(), /2 \/ 3 products selected/);
    assert.equal(await page.locator('.detail-secondary [data-compare="split-panel"]').isChecked(), true);
    await page.locator('.quote-toggle').click();
    assert.equal(await page.locator('[data-qty="split-panel"]').inputValue(), '100');
    await page.locator('[data-close="quote-dialog"]').click();
    await page.locator('#compare-tray [data-action="compare"]').click();
    assert.equal(await page.locator('#compare-dialog thead th').count(), 3);
  });
  await test('Real BFCache restoration keeps latest cart draft compare and cleared fields', 'desktop', async (page, context) => {
    await context.addInitScript(() => {
      window.__qaPageShows = [];
      window.addEventListener('pageshow', event => window.__qaPageShows.push({ path: location.pathname, persisted: event.persisted, navigationStateAtPageshow: sessionStorage.getItem('nicethryun-prototype-v1-navigation') }));
    });
    const restorations = [];
    const restored = async path => {
      await page.waitForFunction(expected => location.pathname === expected && window.__qaPageShows?.at(-1)?.persisted === true, path);
      const event = await page.evaluate(() => window.__qaPageShows.at(-1));
      assert.equal(event.persisted, true, 'must use real BFCache, not ordinary history reload');
      restorations.push(event);
    };
    // Cache an empty inquiry A, edit the OEM/cart state in B and the contact draft in C.
    await visit(page, '/inquiry/');
    await page.locator('.desktop-nav > a[href="/oem/"]').click();
    await page.locator('#oem-form [name="family"]').selectOption('Multi-head sensor light');
    await page.locator('#oem-form [name="country"]').selectOption('Australia');
    await page.locator('#oem-form [name="quantity"]').fill('400');
    await page.locator('#oem-form [type="submit"]').click();
    await page.locator('#inquiry-form [name="company"]').fill('BFCache QA Company');
    await page.locator('#inquiry-form [name="contact"]').fill('BFCache QA Contact');
    await page.locator('#inquiry-form [name="email"]').fill('bfcache@example.invalid');
    await page.goBack({ waitUntil: 'commit' }); await restored('/oem/');
    await page.goForward({ waitUntil: 'commit' }); await restored('/inquiry/');
    await page.goBack({ waitUntil: 'commit' }); await restored('/oem/');
    await page.goBack({ waitUntil: 'commit' }); await restored('/inquiry/');
    assert.equal(await page.locator('#inquiry-form [name="company"]').inputValue(), 'BFCache QA Company');
    assert.match(await page.locator('.inquiry-summary').innerText(), /400 pcs/);
    // Leave the restored A. Its stale closure must never overwrite the newest state.
    await visit(page, '/products/');
    await page.locator('[data-compare="multi-head"]').check();
    await page.locator('[data-add="split-panel"]').click();
    await page.locator('a.text-link[href="/products/split-panel/"]').click();
    await ready(page);
    await page.locator('.detail-secondary [data-compare="split-panel"]').check();
    await page.locator('[data-qty="detail"]').fill('50');
    await page.locator('[data-detail-qty]').click();
    assert.match(await page.locator('#compare-tray').innerText(), /2 \/ 3 products selected/, 'detail compare must be initialized before restoring previous page');
    await page.goBack({ waitUntil: 'commit' }); await restored('/products/');
    await page.waitForFunction(() => document.querySelectorAll('[data-compare]:checked').length === 2);
    assert.equal(await page.locator('[data-compare]:checked').count(), 2);
    assert.match(await page.locator('#compare-tray').innerText(), /2 \/ 3 products selected/);
    await page.locator('.quote-toggle').click();
    assert.equal(await page.locator('[data-qty="multi-head"]').inputValue(), '400');
    assert.equal(await page.locator('[data-qty="split-panel"]').inputValue(), '150');
    await page.locator('[data-close="quote-dialog"]').click();
    await visit(page, '/resources/'); await visit(page, '/inquiry/');
    assert.equal(await page.locator('[name="company"]').inputValue(), 'BFCache QA Company');
    assert.match(await page.locator('.inquiry-summary .summary-total').innerText(), /550 pcs/);
    // A later tab/history page clears the draft. Restoring an older form must not revive it.
    await page.locator('#product-menu-toggle').click();
    await page.locator('#product-menu a').first().click();
    await page.locator('#catalogue-results').waitFor();
    await visit(page, '/inquiry/');
    await page.locator('[data-action="clear-draft"]').click();
    await page.goBack({ waitUntil: 'commit' }); await restored('/products/');
    await page.goBack({ waitUntil: 'commit' }); await restored('/inquiry/');
    assert.equal(await page.locator('#product-menu').isVisible(), false);
    assert.equal(await page.locator('dialog[open]').count(), 0);
    assert.equal(await page.locator('[name="company"]').inputValue(), '');
    assert.equal(await page.locator('[name="email"]').inputValue(), '');
    await visit(page, '/resources/'); await visit(page, '/inquiry/');
    assert.equal(await page.locator('[name="company"]').inputValue(), '');
    assert.equal(await page.locator('[name="email"]').inputValue(), '');
    assert.match(await page.locator('.inquiry-summary .summary-total').innerText(), /550 pcs/);
    return { launchOption: { ignoreDefaultArgs: ['--disable-back-forward-cache'] }, restorations, finalQuantity: 550, clearedDraftStayedEmpty: true };
  });
  await test('Ready inquiry quote list step input change and remove remain usable', 'desktop', async page => {
    await visit(page, '/products/');
    await page.locator('[data-add="multi-head"]').click();
    await page.locator('[data-add="split-panel"]').click();
    await visit(page, '/inquiry/');
    const form = page.locator('#inquiry-form');
    await form.locator('[name="company"]').fill('Ready QA Company');
    await form.locator('[name="contact"]').fill('QA Contact');
    await form.locator('[name="email"]').fill('ready@example.invalid');
    await form.locator('[name="country"]').selectOption('Germany');
    await form.locator('[name="consent"]').check();
    await form.locator('[type="submit"]').click();
    await page.locator('.success-card').waitFor();
    assert.equal(new URL(page.url()).searchParams.get('ready'), '1');
    await page.locator('.quote-toggle').click();
    await page.locator('[data-qty-id="multi-head"][data-qty-step="1"]').click();
    assert.equal(await page.locator('[data-qty="multi-head"]').inputValue(), '101');
    await page.locator('[data-qty="multi-head"]').fill('175');
    await page.locator('[data-qty="multi-head"]').press('Tab');
    assert.equal(await page.locator('[data-qty="multi-head"]').inputValue(), '175');
    await page.locator('[data-remove="split-panel"]').click();
    assert.equal(await page.locator('.quote-count').first().innerText(), '1');
    await page.locator('[data-remove="multi-head"]').click();
    assert.equal(await page.locator('.quote-count').first().innerText(), '0');
    await page.locator('[data-close="quote-dialog"]').click();
    await shown('.success-card')(page);
  });
  await test('Resource downloads preserve demo bytes and static TXT availability', 'desktop', async (page, context) => {
    const reference = await context.newPage();
    await reference.goto(`${demoBase}/#/resources`); await ready(reference);
    const sourceResources = await reference.evaluate(() => window.NICETHRYUN_RESOURCES);
    await visit(page, '/resources/');
    const checks = [];
    for (const id of ['selection-checklist', 'oem-brief', 'range-overview']) {
      const pending = page.waitForEvent('download');
      await page.locator(`[data-resource="${id}"]`).click();
      const download = await pending, path = join(OUT, 'interactions', download.suggestedFilename());
      await download.saveAs(path);
      const bytes = await readFile(path), expected = Buffer.from((id === 'range-overview' ? '\uFEFF' : '') + sourceResources[id]);
      assert.equal(bytes.equals(expected), true, `${id} differs from source template bytes`);
      const href = await page.locator(`[data-resource="${id}"]`).getAttribute('href');
      const url = download.url();
      // At least the required TXT templates must resolve as ordinary static resources.
      if (id !== 'range-overview') {
        assert.ok(!url.startsWith('blob:') || href, `${id} must use a static file`);
        const staticUrl = href ? new URL(href, BASE).href : url;
        assert.equal(new URL(staticUrl).origin, new URL(BASE).origin, 'resource must stay same-origin');
        const response = await context.request.get(staticUrl);
        assert.equal(response.status(), 200); assert.equal((await response.body()).equals(expected), true);
      }
      checks.push({ id, filename: download.suggestedFilename(), bytes: bytes.length, sha256: hash(bytes), sourceEqual: true });
    }
    await page.locator('details summary').first().click();
    assert.equal(await page.locator('details').first().getAttribute('open'), '');
    await page.locator('[data-action="source-note"]').first().click(); await shown('#info-dialog')(page);
    await page.keyboard.press('Escape'); assert.equal(await page.locator('#info-dialog').isVisible(), false);
    return { checks };
  });
  return results;
}

function reportMarkdown(report) {
  const routes = report.routes || [], tests = report.interactions || [];
  const evidence = (row, viewport) => row ? `[original](screenshots/${viewport}/${row.id}-demo.png) / [current](screenshots/${viewport}/${row.id}-astro.png) / [diff](screenshots/${viewport}/${row.id}-diff.png)` : 'Not run';
  const rows = ROUTES.map(([id, route]) => {
    const desktop = routes.find(row => row.id === id && row.viewport === 'desktop');
    const mobile = routes.find(row => row.id === id && row.viewport === 'mobile');
    const pair = [desktop, mobile].filter(Boolean);
    return `| \`${route}\` | ${pair.map(row => row.status).join('/')} | ${pair.every(row => row.textEqual) ? 'same' : 'DIFF'} | ${pair.map(row => row.geometryDifferences.length).join('/')} | ${pair.map(row => row.pixel.changedPercent + '%').join('/')} | ${pair.map(row => row.pixel.nonImageChangedPercent + '%').join('/')} | ${evidence(desktop, 'desktop')} | ${evidence(mobile, 'mobile')} |`;
  }).join('\n');
  return `# M1 browser review\n\nGenerated: ${report.generatedAt}\n\n- Target: \`${BASE}\` (production preview)\n- Source SHA-256: \`${report.sourceSha256}\`\n- Browser: ${report.browser}\n- Acceptance: ${routes.length} screenshot pairs, ${report.summary.routeFailures.length} route failures; ${tests.filter(test => test.passed).length}/${tests.length} interaction scenarios passed.\n- Maximum all-pixel difference: ${report.summary.maximumPixelDiffPercent}%; maximum non-image difference: ${report.summary.maximumNonImageDiffPercent}%.\n- Fresh storage per screenshot, device scale 1, desktop 1440×1000 and mobile 390×844; full page, image decode awaited.\n- Pixel threshold 0.1, antialiasing excluded. “Non-image” masks the union of source/target image bounds because delivery-image compression is intentional. DOM box deltas greater than 0.75 CSS px are separately reported.\n- Application overview uses the approved driveway view. \`entry\` maps to demo \`entryway\`; \`patio\` preserves the garden view because the approved source has no distinct patio copy.\n- External and mutating network requests are blocked. Forms use fictional local-only QA data.\n\n## Route screenshots\n\nD/M means desktop/mobile.\n\n| Route | HTTP D/M | Visible copy | Box differences D/M | All-pixel diff D/M | Non-image diff D/M | Desktop | Mobile |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n${rows}\n\n## Interactions\n\n${tests.map(test => `- ${test.passed ? 'PASS' : 'FAIL'} — ${test.name}${test.passed ? '' : ': ' + test.error.split('\n')[0]}`).join('\n')}\n\nFull console, HTTP, overflow, image, geometry and download-byte evidence is in [qa-results.json](qa-results.json). Lighthouse evidence is in [lighthouse-summary.json](lighthouse-summary.json) after \`npm run qa:lighthouse\`.\n\n## Reproduce\n\n\`\`\`sh\nnpm ci\nnpm run build\nnpm run preview -- --host 127.0.0.1 --port 4399\n# In a second terminal; source demo stays read-only.\nNICETHRYUN_DEMO='/absolute/path/NICETHRYUN_融合版_独立预览.html' npm run qa\nnpm run qa:lighthouse\n\`\`\`\n\nOptional environment: \`QA_BASE_URL\`, \`QA_OUTPUT\`, \`CHROME_PATH\`, \`QA_SCREENSHOTS_ONLY=1\`, \`QA_INTERACTIONS_ONLY=1\`; Lighthouse can restrict paths with \`LH_ROUTES=/,/products/\`.\n`;
}

async function main() {
  await mkdir(OUT, { recursive: true });
  const demo = await serveDemo();
  const browser = await chromium.launch({ executablePath: CHROME, headless: true, ignoreDefaultArgs: ['--disable-back-forward-cache'] });
  const previous = await readFile(join(OUT, 'qa-results.json'), 'utf8').then(JSON.parse).catch(() => null);
  const report = { generatedAt: new Date().toISOString(), target: BASE, sourceSha256: demo.sourceSha256, browser: browser.version(), routeMapping: ROUTES, routes: SNAPSHOTS ? [] : previous?.routes || [], interactions: INTERACTIONS ? [] : previous?.interactions || [] };
  try {
    const status = await fetch(BASE); assert.equal(status.status, 200, 'Start the production preview before QA');
    if (SNAPSHOTS) report.routes = await screenshots(browser, demo.base);
    if (INTERACTIONS) report.interactions = await interactions(browser, demo.base);
    const failures = report.routes.filter(row => row.status !== 200 || !row.textEqual || row.geometryDifferences.length || row.pixel.nonImageChangedPercent > 0.05 || row.migrated.width > row.migrated.viewportWidth || row.migrated.brokenImages.length || Object.values(row.migrated.issues).some(list => list.length));
    report.summary = { screenshotPairs: report.routes.length, routeFailures: failures.map(row => `${row.viewport} ${row.route}`), interactionTests: report.interactions.length, interactionFailures: report.interactions.filter(row => !row.passed).map(row => row.name), maximumPixelDiffPercent: Math.max(0, ...report.routes.map(row => row.pixel.changedPercent)), maximumNonImageDiffPercent: Math.max(0, ...report.routes.map(row => row.pixel.nonImageChangedPercent)) };
    await writeFile(join(OUT, 'qa-results.json'), JSON.stringify(report, null, 2) + '\n');
    await writeFile(join(OUT, 'README.md'), reportMarkdown(report));
    console.log(JSON.stringify(report.summary, null, 2));
    if (failures.length || report.summary.interactionFailures.length) process.exitCode = 1;
  } finally {
    await browser.close(); await new Promise(resolve => demo.server.close(resolve));
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error); process.exitCode = 1; });
