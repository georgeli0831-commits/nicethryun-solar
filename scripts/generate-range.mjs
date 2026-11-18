import fs from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => JSON.parse(fs.readFileSync(new URL(path, root), 'utf8'));
const products = read('src/data/products.json');
const applications = read('src/data/applications.json');
const resources = read('src/data/resources.json');
const cell = (value) => `"${String(value ?? '').replaceAll('"', '""')}"`;
const rows = [
  ['Product family', 'Model', 'Panel arrangement', 'Installation', 'Applications', 'Specification status'],
  ...products.map((product) => [
    product.name, product.model, product.panel, product.mount,
    product.apps.map((id) => applications[id].label).join('; '), product.source,
  ]),
];
const csv = rows.map((row) => row.map(cell).join(',')).join('\n') + '\n';
resources['range-overview'] = csv;
fs.writeFileSync(new URL('src/data/resources.json', root), JSON.stringify(resources, null, 2) + '\n');
fs.writeFileSync(new URL('public/downloads/range-overview.csv', root), '\uFEFF' + csv);
console.log(`Range overview generated from ${products.length} catalogue products.`);
