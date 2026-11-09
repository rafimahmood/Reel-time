#!/usr/bin/env node
// Tiny test runner: loads every tests/*.test.js, each exporting an array of
// { name, timeout?, skip?, fn: async ({ browser }) => {} }, and runs them in
// order against one shared headless Chromium. Exit code 1 if anything fails.
//   npm test                    run everything
//   npm test -- ball            run tests whose file or name contains "ball"
'use strict';
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');

const filter = process.argv.slice(2).join(' ').toLowerCase();

function withTimeout(promise, ms, name) {
  let timer;
  return Promise.race([
    promise,
    new Promise((_, rej) => { timer = setTimeout(() => rej(new Error(`timed out after ${ms / 1000}s`)), ms); }),
  ]).finally(() => clearTimeout(timer));
}

(async () => {
  const files = fs.readdirSync(__dirname).filter(f => f.endsWith('.test.js')).sort();
  const tests = [];
  for (const f of files) for (const t of require(path.join(__dirname, f))) tests.push({ file: f, ...t });
  const chosen = tests.filter(t => !filter || (t.file + ' ' + t.name).toLowerCase().includes(filter));

  const browser = await chromium.launch({ args: ['--use-gl=swiftshader', '--enable-webgl', '--ignore-gpu-blocklist', '--autoplay-policy=no-user-gesture-required'] });
  const t0 = Date.now();
  let pass = 0, fail = 0, skip = 0;
  const failures = [];
  for (const t of chosen) {
    const label = `${t.file.replace('.test.js', '')} > ${t.name}`;
    const skipWhy = typeof t.skip === 'function' ? t.skip() : t.skip;
    if (skipWhy) { skip++; console.log(`  - SKIP ${label} (${skipWhy})`); continue; }
    const s = Date.now();
    try {
      await withTimeout(t.fn({ browser, log: (...a) => console.log('      ', ...a) }), t.timeout || 60000, label);
      pass++; console.log(`  ✓ ${label} (${((Date.now() - s) / 1000).toFixed(1)}s)`);
    } catch (e) {
      fail++; failures.push([label, e]);
      console.log(`  ✗ ${label} (${((Date.now() - s) / 1000).toFixed(1)}s)\n      ${String(e && e.message || e).split('\n').join('\n      ')}`);
    }
  }
  await browser.close();
  console.log(`\n${pass} passed, ${fail} failed, ${skip} skipped in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
