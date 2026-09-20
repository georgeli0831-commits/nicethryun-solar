#!/usr/bin/env node
/** Desktop Lighthouse for static production-preview routes. Never deploys or submits forms. */
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import lighthouse from 'lighthouse';
import { launch } from 'chrome-launcher';
import { ROUTES } from './qa.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const base = process.env.QA_BASE_URL || 'http://127.0.0.1:4399';
const out = resolve(process.env.QA_OUTPUT || join(root, 'docs/review/m1'));
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const requested = process.env.LH_ROUTES?.split(',');
const routes = requested ? ROUTES.filter(([, route]) => requested.includes(route)) : ROUTES;
const failures = [];
await mkdir(join(out, 'lighthouse'), { recursive: true });
const chrome = await launch({ chromePath, chromeFlags: ['--headless=new', '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--disable-background-networking'] });
const summary = { generatedAt: new Date().toISOString(), target: base, preset: 'desktop', minimumPerformance: 90, minimumObservedPerformance: null, passed: false, failures: [], routes: [] };
try {
  for (const [id, route] of routes) {
    const result = await lighthouse(`${base}${route}`, {
      port: chrome.port,
      output: ['json', 'html'],
      logLevel: 'error',
      onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo'],
    }, {
      extends: 'lighthouse:default',
      settings: {
        formFactor: 'desktop',
        screenEmulation: { mobile: false, width: 1350, height: 940, deviceScaleFactor: 1, disabled: false },
        throttling: { rttMs: 40, throughputKbps: 10240, cpuSlowdownMultiplier: 1, requestLatencyMs: 0, downloadThroughputKbps: 0, uploadThroughputKbps: 0 },
        // The migrated site has no external dependencies. Block nonlocal fetches defensively.
        blockedUrlPatterns: ['https://*', 'http://*.com/*', 'http://*.net/*', 'http://*.org/*'],
      },
    });
    if (!result) throw new Error(`Lighthouse did not return a result for ${route}`);
    const [json, html] = result.report;
    await writeFile(join(out, 'lighthouse', `${id}.json`), json);
    await writeFile(join(out, 'lighthouse', `${id}.html`), html);
    const lhr = result.lhr;
    const entry = {
      route, performance: Math.round(lhr.categories.performance.score * 100),
      accessibility: Math.round(lhr.categories.accessibility.score * 100),
      bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
      seo: Math.round(lhr.categories.seo.score * 100),
      fcpMs: lhr.audits['first-contentful-paint'].numericValue,
      lcpMs: lhr.audits['largest-contentful-paint'].numericValue,
      cls: lhr.audits['cumulative-layout-shift'].numericValue,
      tbtMs: lhr.audits['total-blocking-time'].numericValue,
      transferredBytes: lhr.audits['total-byte-weight'].numericValue,
      runtimeError: lhr.runtimeError || null,
      warnings: lhr.runWarnings,
      reports: { json: `lighthouse/${id}.json`, html: `lighthouse/${id}.html` },
    };
    summary.routes.push(entry);
    if (entry.performance < 90 || entry.runtimeError) failures.push(route);
    console.log(`${route} Performance ${entry.performance}; FCP ${Math.round(entry.fcpMs)}ms LCP ${Math.round(entry.lcpMs)}ms CLS ${entry.cls}`);
    // Persist each route so interrupted runs still leave honest partial evidence.
    await writeFile(join(out, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  }
  summary.minimumObservedPerformance = Math.min(...summary.routes.map(row => row.performance));
  summary.passed = failures.length === 0 && summary.routes.length === routes.length;
  summary.failures = failures;
  await writeFile(join(out, 'lighthouse-summary.json'), JSON.stringify(summary, null, 2) + '\n');
  const table = summary.routes.map(row => `| \`${row.route}\` | ${row.performance} | ${row.accessibility} | ${row.bestPractices} | ${row.seo} | [HTML](${row.reports.html}) / [JSON](${row.reports.json}) |`).join('\n');
  await writeFile(join(out, 'lighthouse.md'), `# Desktop Lighthouse\n\n${summary.generatedAt}; production preview at \`${base}\`; desktop emulation 1350×940, CPU slowdown ×1, simulated 40ms / 10,240Kbps network.\n\nPerformance acceptance: ≥90 for every route. Minimum measured: **${summary.minimumObservedPerformance}**.\n\n| Route | Performance | Accessibility | Best practices | SEO | Reports |\n| --- | --- | --- | --- | --- | --- |\n${table}\n`);
  if (failures.length) process.exitCode = 1;
} finally { await Promise.resolve(chrome.kill()); }
