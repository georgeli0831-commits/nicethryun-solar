import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(root, p), 'utf8');
const json = p => JSON.parse(read(p));
const products = json('src/data/products.json');
const applications = json('src/data/applications.json');
const manifest = json('docs/review/m1/assets.json');
const routes = ['/', '/products/', ...products.map(p => `/products/${p.id}/`), '/applications/', ...['entry','driveway','perimeter','garden','patio'].map(p => `/applications/${p}/`), '/manufacturing/', '/oem/', '/resources/', '/inquiry/'];
assert.equal(manifest.assets.length, 16);
for (const a of manifest.assets) {
  const stat = fs.statSync(path.join(root, 'public/images', a.name));
  assert.equal(stat.size, a.bytes);
  if (a.name.endsWith('.png')) assert(stat.size <= 400000, `${a.name} exceeds 400KB`);
  assert.equal(a.width, a.sourceWidth);
  assert.equal(a.height, a.sourceHeight);
}
for (const route of routes) {
  const html = read(`dist${route}index.html`);
  assert.match(html, /<main[^>]*>[\s\S]*?<h1[ >]/, `${route} must have static main/h1`);
  assert(!html.includes('href="#/'), `${route} has hash-route links`);
  assert(!html.includes('data:image/'), `${route} has inline bitmap`);
  assert.match(html, /<link rel="canonical" href="https:\/\/nicethryun-solar.example\//);
  assert(!/zelmo|#F2C200|#1F2328/i.test(html), `${route} old brand/theme`);
}
for (const [id, content] of Object.entries(json('src/data/resources.json'))) {
  assert.equal(read(`public/downloads/${id}.${id==='range-overview'?'csv':'txt'}`), (id==='range-overview'?'\uFEFF':'')+content);
}
const demoPath=process.env.NICETHRYUN_DEMO || process.argv[2];
if (demoPath) {
  const html = fs.readFileSync(demoPath,'utf8');
  const scripts=[...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/g)].map(x=>x[1]);
  const app=scripts[2];const context={};vm.createContext(context);
  vm.runInContext(app.slice(app.indexOf('  const products'),app.indexOf('  const storageKey'))+';globalThis.data={products,applications,familyNames,typeNames}',context);
  const original=JSON.parse(JSON.stringify(context.data));
  assert.deepEqual(products, original.products);
  assert.deepEqual(applications, original.applications);
  assert.deepEqual(json('src/data/labels.json'), {familyNames:original.familyNames,typeNames:original.typeNames});
  const css=[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(x=>x[1]).join('\n');
  assert.equal(read('src/styles/global.css'),css+'\n');
  const resourceContext={window:{}};vm.createContext(resourceContext);vm.runInContext(scripts[1],resourceContext);
  assert.deepEqual(json('src/data/resources.json'),JSON.parse(JSON.stringify(resourceContext.window.NICETHRYUN_RESOURCES)));
}
console.log(JSON.stringify({passed:true,routes:routes.length,originalImages:manifest.assets.length,pngByteLimit:400000,sourceDataAndCssCompared:Boolean(demoPath),resources:3},null,2));
