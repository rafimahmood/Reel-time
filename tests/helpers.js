// Shared helpers for the Reel Time browser tests.
// The game is loaded straight from disk (file://), so it works the same whether
// index.html is one self-contained file or loads css/ and js/ files next to it.
'use strict';
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const GAME_URL = pathToFileURL(path.join(ROOT, 'index.html')).href;

// three.js r128 is loaded from cdnjs. Tests never touch the network: they serve a
// local copy if there is one, otherwise they block the request (the top-down view
// does not need three.js; the first-person test is skipped).
function findThree() {
  const candidates = [
    process.env.REEL_THREE_JS,
    path.join(ROOT, 'node_modules', 'three', 'build', 'three.min.js'),
  ].filter(Boolean);
  return candidates.find(p => fs.existsSync(p)) || null;
}
const THREE_PATH = findThree();

const CDN_THREE = /^https:\/\/cdnjs\.cloudflare\.com\/.*three(\.min)?\.js(\?.*)?$/;
const FONTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;


/**
 * Open the game in a fresh browser context (fresh localStorage).
 * Returns { page, context, errors } where errors collects page errors, console
 * errors (the game loop catches its own exceptions and logs them with
 * console.error, so these matter) and failed requests for local files.
 */
// opts.noThree: block three.js even if a local copy exists (forces the 2D / menu fallbacks).
// opts.seed: replace Math.random with a seeded generator so random choices are repeatable.
async function openGame(browser, opts = {}) {
  const context = await browser.newContext({ viewport: opts.viewport || { width: 1000, height: 640 } });
  return openGameIn(context, opts);
}

// Same, in an existing context (so several page loads can share localStorage).
async function openGameIn(context, opts = {}) {
  if (opts.seed != null) {
    await context.addInitScript(seed => {
      let a = seed >>> 0; // mulberry32
      Math.random = () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    }, opts.seed);
  }
  const serveThree = THREE_PATH && !opts.noThree;
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push('pageerror: ' + (e.stack || e.message)));
  page.on('console', m => { if (m.type() === 'error' && !(!serveThree && /Failed to load resource/.test(m.text()))) errors.push('console.error: ' + m.text()); });
  page.on('requestfailed', r => { if (r.url().startsWith('file:')) errors.push('requestfailed: ' + r.url() + ' ' + (r.failure() || {}).errorText); });
  // Playwright tries routes in reverse order of registration, so this catch-all goes first:
  // any network request not handled below is blocked and recorded.
  await page.route(/^https?:\/\//, r => { errors.push('unexpected network request: ' + r.request().url()); return r.abort(); });
  await page.route(FONTS, r => r.fulfill({ status: 200, contentType: 'text/css', body: '' }));
  await page.route(CDN_THREE, r => serveThree
    ? r.fulfill({ status: 200, contentType: 'application/javascript', path: THREE_PATH })
    : r.abort());
  await page.goto(GAME_URL);
  try {
    await page.waitForFunction(() => typeof window.__reel === 'object' && window.__reel && window.__reel.DANCES, null, { timeout: 15000 });
  } catch (e) {
    throw new Error('the game did not start (window.__reel never appeared). Errors:\n  ' + (errors.join('\n  ') || 'none'));
  }
  return { page, context, errors };
}

// openGame, run fn, always close the context.
async function withGame(browser, opts, fn) {
  const g = await openGame(browser, opts);
  try { return await fn(g); } finally { await g.context.close(); }
}

// Skip tutorials, pick the view and speed up the clock.
async function prep(page, { view = 'top', ts = 16 } = {}) {
  await page.evaluate(({ view, ts }) => {
    const S = window.__reel.SAVE;
    for (const k in S) if (/^tut/.test(k)) S[k] = true;
    S.view = view; window.__TS = ts;
  }, { view, ts });
}

const visibleScreens = page => page.evaluate(() =>
  [...document.querySelectorAll('section.screen')].filter(s => !s.hidden).map(s => s.id));

// Parse the results panel ("Pattern 100%", "Hands 100%", ...) into { Pattern: 100, ... }.
const resultStats = page => page.evaluate(() => {
  const out = {};
  document.querySelectorAll('#rStats .stat').forEach(s => {
    const k = s.querySelector('.k').textContent.trim(), v = s.querySelector('.v').textContent.trim();
    out[k] = /%$/.test(v) ? parseFloat(v) : parseFloat(v.replace(/[^\d.-]/g, ''));
  });
  out.stars = 3 - document.querySelectorAll('#rStars span.off').length;
  return out;
});

function assert(cond, msg) { if (!cond) throw new Error(msg); }
function assertNoErrors(errors, where) {
  assert(errors.length === 0, `${where}: ${errors.length} error(s):\n  ` + errors.slice(0, 5).join('\n  '));
}

module.exports = { ROOT, GAME_URL, THREE_PATH, openGame, openGameIn, withGame, prep, visibleScreens, resultStats, assert, assertNoErrors };
