// First-person (three.js) smoke test. Needs a local three.js r128 (npm install puts
// one in node_modules/three, or set REEL_THREE_JS); skipped otherwise. Software
// WebGL in headless Chromium is slow (about 1 fps), so this only checks the 3D
// ballroom builds and renders a few frames without errors, then switches view.
'use strict';
const { THREE_PATH, withGame, prep, assert, assertNoErrors } = require('./helpers');

module.exports = [
  {
    name: 'first-person view builds the ballroom and renders without errors',
    skip: () => !THREE_PATH && 'no local three.js: run npm install or set REEL_THREE_JS',
    timeout: 120000,
    fn: ({ browser, log }) => withGame(browser, {}, async ({ page, errors }) => {
      const warnings = [];
      page.on('console', m => { if (m.type() === 'warning') warnings.push(m.text()); });
      assert(await page.evaluate(() => window.THREE && window.THREE.REVISION) === '128', 'three.js r128 not loaded');
      await prep(page, { view: 'fp', ts: 4 });
      await page.evaluate(() => window.__reel.newGame('dws', true));
      const r3 = await page.evaluate(() => ({ ready: window.__reel.R3.ready, failed: window.__reel.R3.failed }));
      assert(r3.ready && !r3.failed, '3D did not initialise: ' + JSON.stringify(r3));
      // wait for a handful of rendered frames and for the dance clock to move
      await page.waitForFunction(() => window.__reel.R3.renderer.info.render.frame >= 5 && window.__reel.game.t > -1, null, { timeout: 90000, polling: 500 });
      const info = await page.evaluate(() => {
        const i = window.__reel.R3.renderer.info;
        return { frames: i.render.frame, calls: i.render.calls, triangles: i.render.triangles, geometries: i.memory.geometries, textures: i.memory.textures, t: window.__reel.game.t, gl: getComputedStyle(document.getElementById('gl')).display };
      });
      log(`fp: ${info.frames} frames, ${info.calls} draw calls, ${info.triangles} triangles, ${info.textures} textures, dance clock at bar ${info.t.toFixed(2)}`);
      assert(info.calls > 10 && info.triangles > 1000, 'the 3D scene looks empty: ' + JSON.stringify(info));
      assert(info.gl !== 'none', 'the WebGL canvas is hidden in first person');
      // V switches to the view from above mid-dance
      await page.evaluate(() => window.__reel.toggleView());
      assert(await page.evaluate(() => window.__reel.SAVE.view) === 'top', 'toggleView did not switch to top');
      const t0 = await page.evaluate(() => window.__reel.game.t);
      await page.waitForFunction(t0 => window.__reel.game.t > t0 + 0.5, t0, { timeout: 20000 });
      await page.evaluate(() => { window.__reel.game.done = true; });
      assert(warnings.filter(w => /failed/i.test(w)).length === 0, 'warnings: ' + warnings.join('\n'));
      assertNoErrors(errors, 'first person');
    }),
  },
];
