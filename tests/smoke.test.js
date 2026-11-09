// Page load, dance definitions and save data.
'use strict';
const { withGame, openGameIn, visibleScreens, assert, assertNoErrors } = require('./helpers');

module.exports = [
  {
    name: 'page loads with the menu showing and no errors',
    timeout: 30000,
    fn: ({ browser }) => withGame(browser, {}, async ({ page, errors }) => {
      await page.waitForTimeout(1000); // let a few frames of the menu run
      const screens = await visibleScreens(page);
      assert(screens.length === 1 && screens[0] === 'sMenu', 'expected only #sMenu visible, got ' + JSON.stringify(screens));
      assert(await page.locator('#sMenu').isVisible(), '#sMenu is not visible');
      const api = await page.evaluate(() => ['DANCES', 'newGame', 'SAVE', 'keys', 'press', 'release', 'toggleView', 'setPaused', 'showScreen', 'persist']
        .filter(k => !(k in window.__reel)));
      assert(api.length === 0, 'window.__reel is missing: ' + api.join(', '));
      assert(await page.evaluate(() => window.__reel.game == null), 'a game is running on the menu');
      // the reel list on the menu shows every dance
      const listed = await page.evaluate(() => DANCE_ORDER.filter(k => !document.getElementById('reelList').innerText.includes(DANCES[k].short)));
      assert(listed.length === 0, 'dances missing from the menu reel list: ' + listed.join(', '));
      assertNoErrors(errors, 'menu');
    }),
  },
  {
    name: 'every dance in DANCE_ORDER is well formed and its choreography builds',
    timeout: 30000,
    fn: ({ browser }) => withGame(browser, {}, async ({ page, errors }) => {
      const problems = await page.evaluate(() => {
        const out = [];
        const bad = (k, m) => out.push(k + ': ' + m);
        if (DANCE_ORDER.length !== 7) bad('DANCE_ORDER', 'expected 7 dances, got ' + DANCE_ORDER.length);
        if (new Set(DANCE_ORDER).size !== DANCE_ORDER.length) bad('DANCE_ORDER', 'has duplicates');
        const tunes = new Set();
        for (const k of DANCE_ORDER) {
          const D = DANCES[k];
          if (!D) { bad(k, 'not in DANCES'); continue; }
          for (const f of ['name', 'short', 'meta']) if (typeof D[f] !== 'string' || !D[f]) bad(k, 'missing ' + f);
          if (typeof D.desc !== 'function' || typeof D.desc('man') !== 'string') bad(k, 'desc is not a function returning text');
          if (!(D.bpm > 20 && D.bpm < 200)) bad(k, 'bad bpm ' + D.bpm);
          if (!(Number.isInteger(D.times) && D.times > 0)) bad(k, 'bad times ' + D.times);
          if (D.bars != null && !(Number.isInteger(D.bars) && D.bars > 0)) bad(k, 'bad bars ' + D.bars);
          if (!['dws', 'long', 'sq'].includes(D.view)) bad(k, 'unknown view ' + D.view);
          if (!Number.isInteger(D.tune)) bad(k, 'tune is not an index'); else if (tunes.has(D.tune)) bad(k, 'shares tune ' + D.tune); else tunes.add(D.tune);
          if (typeof D.build !== 'function') { bad(k, 'build is not a function'); continue; }
          for (const lady of [false, true]) {
            const who = k + (lady ? ' (as lady)' : ' (as man)');
            let ch;
            try { ch = D.build(lady); } catch (e) { bad(who, 'build threw ' + e); continue; }
            const ids = Object.keys(ch.tr || {});
            if (!ids.includes('P')) bad(who, 'no track for the player P');
            if (ids.length < 4) bad(who, 'only ' + ids.length + ' dancers');
            const total = ch.totalBars || D.times * (D.bars || 32);
            if (!(ch.figs && ch.figs.length)) bad(who, 'no figures');
            (ch.figs || []).forEach((f, i) => {
              if (!(f.b1 > f.b0)) bad(who, `figure ${i} "${f.name}" has b1 <= b0`);
              if (!f.name) bad(who, `figure ${i} has no name`);
            });
            const lastFig = Math.max(...(ch.figs || []).map(f => f.b1));
            if (lastFig < total / D.times - 1e-6) bad(who, `figures end at bar ${lastFig}, before one time through (${total / D.times})`);
            if (!(ch.ev && ch.ev.length)) bad(who, 'no events');
            (ch.ev || []).forEach((e, i) => {
              if (!['set', 'turn', 'travel', 'beats'].includes(e.type)) bad(who, `event ${i} has unknown type ${e.type}`);
              if (!(Number.isFinite(e.b0) && e.b0 >= 0)) bad(who, `event ${i} (${e.type}) has bad b0 ${e.b0}`);
              if (e.b1 != null && !(e.b1 >= e.b0)) bad(who, `event ${i} (${e.type}) ends before it starts`);
            });
            // every dancer has a finite position for the whole dance
            for (const id of ids) {
              for (let t = -2; t <= total; t += 0.25) {
                const s = ch.at(id, t);
                if (!s || !Number.isFinite(s.x) || !Number.isFinite(s.y)) { bad(who, `${id} has no position at bar ${t}`); break; }
              }
            }
          }
        }
        return out;
      });
      assert(problems.length === 0, 'dance definition problems:\n  ' + problems.slice(0, 20).join('\n  '));
      assertNoErrors(errors, 'definitions');
    }),
  },
  {
    name: 'save data round-trips through localStorage',
    timeout: 30000,
    fn: async ({ browser }) => {
      // 1. change some settings in one page load and persist them
      const ctx = await browser.newContext({ viewport: { width: 1000, height: 640 } });
      try {
        const first = await openGameIn(ctx);
        const fresh = await first.page.evaluate(() => localStorage.getItem('reeltime-save'));
        await first.page.evaluate(() => {
          const S = window.__reel.SAVE;
          S.shillings = 1234; S.stars.dws = 3; S.best.dws = 45678; S.diff = 'ceilidh'; S.view = 'top'; S.sens = 'high';
          window.__reel.persist();
        });
        const stored = JSON.parse(await first.page.evaluate(() => localStorage.getItem('reeltime-save')));
        assert(stored && stored.shillings === 1234, 'persist() did not write the save to localStorage');
        assert(Array.isArray(stored.roster) && stored.roster.length === 8, 'saved roster should be the 8 slots, got ' + JSON.stringify(stored.roster && stored.roster.length));
        assertNoErrors(first.errors, 'first load (fresh save was ' + (fresh ? 'present' : 'absent') + ')');

        // 2. reload in the same context: the game reads it back
        await first.page.reload();
        await first.page.waitForFunction(() => window.__reel && window.__reel.SAVE);
        const back = await first.page.evaluate(() => {
          const S = window.__reel.SAVE;
          return { shillings: S.shillings, stars: S.stars.dws, best: S.best.dws, view: S.view, sens: S.sens, v: S.v, slots: S.slots.length, roster: S.roster.length, me: S.me };
        });
        assert(back.shillings === 1234, 'shillings not restored: ' + back.shillings);
        assert(back.stars === 3 && back.best === 45678, 'stars/best not restored: ' + JSON.stringify(back));
        assert(back.view === 'top' && back.sens === 'high', 'settings not restored: ' + JSON.stringify(back));
        assert(back.slots === 8 && back.roster >= 1, 'roster not restored: ' + JSON.stringify(back));
        assert(back.v === stored.v, 'save version changed on reload');
        assertNoErrors(first.errors, 'after reload');

        // 3. a corrupt save must not break the page
        await first.page.evaluate(() => localStorage.setItem('reeltime-save', '{not json'));
        await first.page.reload();
        await first.page.waitForFunction(() => window.__reel && window.__reel.SAVE);
        const reset = await first.page.evaluate(() => ({ shillings: window.__reel.SAVE.shillings, roster: window.__reel.SAVE.roster.length }));
        assert(reset.shillings === 0 && reset.roster >= 1, 'corrupt save should fall back to defaults: ' + JSON.stringify(reset));
        assertNoErrors(first.errors, 'after corrupt save');
      } finally { await ctx.close(); }
    },
  },
];
