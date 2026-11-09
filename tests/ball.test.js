// The Ball, clicked through like a player would, using the menu version of the
// ball (three.js is blocked, so there is no walk-around 3D hall).
// Dance 1 (always the Dashing White Sergeant): ask someone, take the floor and let
// the demo bot dance it. Every later dance: sit it out. Then check the results.
'use strict';
const { withGame, prep, visibleScreens, assert, assertNoErrors } = require('./helpers');

const ballState = page => page.evaluate(() => ({
  idx: BALL.idx, phase: BALL.phase, view: BALL.view, active: BALL.active,
  dancing: !!(window.__reel.game && !window.__reel.game.done),
  btns: [...document.querySelectorAll('#sBall button[data-bx]')].filter(b => b.offsetParent && !b.disabled).map(b => b.dataset.bx + (b.dataset.arg != null ? ':' + b.dataset.arg : '')),
}));
const click = (page, bx, arg) => page.locator(`#sBall button[data-bx="${bx}"]` + (arg != null ? `[data-arg="${arg}"]` : '')).first().click();

module.exports = [
  {
    name: 'demo ball: ask a partner, dance, sit out the rest, reach the results',
    timeout: 90000,
    fn: ({ browser, log }) => withGame(browser, { noThree: true, seed: 7 }, async ({ page, errors }) => {
      await prep(page, { view: 'top', ts: 16 });
      await page.locator('button[data-bx="demo"]').click();
      await page.waitForFunction(() => BALL.active && BALL.phase === 'gap');
      assert((await visibleScreens(page)).join() === 'sBall', 'ball screen not shown');
      const card = await page.evaluate(() => BALL.card.map(e => e.kind + ':' + (e.key || 'waltz')));
      assert(card.length === 7 && card[0] === 'dance:dws', 'unexpected dance card ' + card.join(', '));
      assert(card.filter(c => c === 'dance:waltz').length === 0 && card.filter(c => c.startsWith('waltz')).length === 2, 'card should have 5 reels and 2 waltzes: ' + card.join(', '));

      // Dance 1: ask until someone says yes
      await click(page, 'view', 'ask');
      for (let i = 0; i < 4; i++) {
        if (await page.evaluate(() => !!BALL.card[0].partner)) break;
        if (await page.locator(`#sBall button[data-bx="ask"][data-arg="${i}"]:not([disabled])`).count()) await click(page, 'ask', i);
      }
      const partner = await page.evaluate(() => BALL.card[0].partner && BALL.card[0].partner.name);
      assert(partner, 'nobody said yes to the first dance');
      await click(page, 'back');
      await click(page, 'go'); // "Take the floor"
      await page.waitForFunction(() => BALL.phase === 'dance' && window.__reel.game && window.__reel.game.ball, null, { timeout: 5000 });
      await page.waitForFunction(() => BALL.phase === 'gap' && BALL.idx === 1, null, { timeout: 60000, polling: 250 });
      const first = await page.evaluate(() => BALL.card[0]);
      log(`danced ${first.key} with ${partner}: ${first.stars} stars, ${first.score} points`);
      assert(first.status === 'danced' && first.score > 0 && first.stars >= 2, 'first dance result: ' + JSON.stringify({ status: first.status, stars: first.stars, score: first.score }));

      // The rest: sit out each one
      for (let n = 0; n < 20; n++) {
        const st = await ballState(page);
        if (st.phase === 'results') break;
        assert(!st.dancing, 'a dance started while sitting out: ' + JSON.stringify(st));
        if (st.btns.includes('cont')) await click(page, 'cont');
        else if (st.btns.includes('go')) await click(page, 'go');
        else throw new Error('stuck at ' + JSON.stringify(st));
      }
      const end = await page.evaluate(() => ({
        phase: BALL.phase, view: BALL.view, statuses: BALL.card.map(e => e.status), total: BALL.total,
        text: document.getElementById('ballBody').innerText,
      }));
      log(`ball over: ${end.statuses.join(', ')}; ball score ${end.total}`);
      assert(end.phase === 'results' && end.view === 'results', 'did not reach the results: ' + JSON.stringify(end.phase));
      assert(end.statuses[0] === 'danced' && end.statuses.slice(1).every(s => s === 'sat'), 'card statuses: ' + end.statuses.join(', '));
      assert(/Ball score/i.test(end.text) && /1 \/ 7/.test(end.text), 'results panel text unexpected:\n' + end.text.slice(0, 400));
      assert(await page.locator('#sBall button[data-bx="menu"]').isVisible(), 'no way back to the hall');
      // a demo ball pays nothing
      assert(await page.evaluate(() => window.__reel.SAVE.shillings) === 0, 'demo ball paid shillings');

      // back to the menu
      await click(page, 'menu');
      assert((await visibleScreens(page)).join() === 'sMenu', 'menu not shown after leaving the ball');
      assert(await page.evaluate(() => !BALL.active), 'ball still active after leaving');
      assertNoErrors(errors, 'ball');
    }),
  },
];
