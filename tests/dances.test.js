// The demo bot dances every reel in the top-down view, sped up with window.__TS.
// The bot follows the choreography exactly, so it should finish each dance with
// three stars and near-perfect pattern, hands and setting.
'use strict';
const { withGame, prep, resultStats, assert, assertNoErrors } = require('./helpers');

const DANCES = ['dws', 'r51', 'dop', 'dde', 'fsr', 'esr', 'stw'];
const TS = 16;          // the bot still scores 100% at 20x in testing
const MIN_PCT = 90;     // observed: 100% on every dance

module.exports = [
  {
    name: 'DANCE_ORDER matches the dances this suite runs',
    fn: ({ browser }) => withGame(browser, {}, async ({ page }) => {
      const order = await page.evaluate(() => DANCE_ORDER);
      assert(JSON.stringify(order) === JSON.stringify(DANCES), 'DANCE_ORDER is ' + JSON.stringify(order) + '; update tests/dances.test.js');
    }),
  },
  ...DANCES.map(key => ({
    name: `demo of ${key} finishes in the top-down view with a high score`,
    timeout: key === 'esr' ? 120000 : 60000,
    fn: ({ browser, log }) => withGame(browser, {}, async ({ page, errors }) => {
      await prep(page, { view: 'top', ts: TS });
      await page.evaluate(k => window.__reel.newGame(k, true), key);
      const started = await page.evaluate(() => ({ g: !!window.__reel.game, demo: window.__reel.game && window.__reel.game.demo, hud: !document.getElementById('hud').hidden }));
      assert(started.g && started.demo && started.hud, 'demo did not start: ' + JSON.stringify(started));
      await page.waitForFunction(() => !document.getElementById('sRes').hidden, null, { timeout: key === 'esr' ? 110000 : 55000, polling: 250 });
      const st = await resultStats(page);
      log(`${key}: score ${st.Score}, pattern ${st.Pattern}%, hands ${st.Hands ?? '-'}%, setting ${st.Setting ?? '-'}%, ${st.stars} stars`);
      assert(st.Score > 0, 'no score: ' + JSON.stringify(st));
      for (const k of ['Pattern', 'Hands', 'Setting']) if (k in st) assert(st[k] >= MIN_PCT, `${k} ${st[k]}% < ${MIN_PCT}%`);
      assert(st.stars === 3, `expected 3 stars, got ${st.stars}`);
      const g = await page.evaluate(() => ({ done: window.__reel.game.done, t: window.__reel.game.t, total: window.__reel.game.total }));
      assert(g.done && g.t >= g.total, 'game not finished: ' + JSON.stringify(g));
      // a demo pays nothing and does not touch stars or bests
      const save = await page.evaluate(k => ({ sh: window.__reel.SAVE.shillings, stars: window.__reel.SAVE.stars[k], best: window.__reel.SAVE.best[k] }), key);
      assert(save.sh === 0 && !save.stars && !save.best, 'demo changed the save: ' + JSON.stringify(save));
      assertNoErrors(errors, key);
    }),
  })),
];
