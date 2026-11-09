/* Reel Time · save.js
   Save data, kept in localStorage. */
"use strict";

/* ================= save data ================= */
const LEGACY_OWNED = { red: true, green: true, grey: true, heather: true, gold: true, navy: true };
const DEFAULT_SAVE = { v: 5, shillings: 0, stars: {}, best: {}, tricks: { hooch: true, twirl: false, highcut: false }, owned: { ...LEGACY_OWNED }, wown: {}, diff: 'ceilidh', voice: true, music: true, view: 'fp', me: 'rafi', partner: 'auto', roster: DEFAULT_ROSTER, tut: false, sens: 'med', travel: 'rail', lag: 0 };
let SAVE = JSON.parse(JSON.stringify(DEFAULT_SAVE));
try {
  const s = localStorage.getItem('reeltime-save');
  if (s) {
    const p = JSON.parse(s);
    SAVE = Object.assign(SAVE, p);
    if ((p.v || 1) < 3) { SAVE.view = 'fp'; SAVE.v = 3; } // first person is now the default view
    if ((p.v || 1) < 4) SAVE.v = 4; // v4: creator fields (kilt, jacket, shoe, heel); normPerson fills them in below
    if ((p.v || 1) < 5) { // v5: eight character slots, face object, wardrobe, paid tartans. The six legacy tartans stay owned.
      SAVE.v = 5; SAVE.owned = Object.assign({ ...LEGACY_OWNED }, p.owned || {}); SAVE.note = 'The Robertson tartans are now called Dalmeny, the dearest in the Outfitter. Everything your characters already wear is still theirs.';
    }
    SAVE.owned = SAVE.owned || { ...LEGACY_OWNED }; Object.keys(SAVE.owned).forEach(k => { const n = String(k).replace(/^robertson/, 'dalmeny'); if (n !== k) { SAVE.owned[n] = SAVE.owned[k]; delete SAVE.owned[k]; } });
    SAVE.wown = SAVE.wown && typeof SAVE.wown === 'object' ? SAVE.wown : {};
    SAVE.tricks = Object.assign({ ...DEFAULT_SAVE.tricks }, p.tricks || {});
    if (!p.roster) { SAVE.roster = JSON.parse(JSON.stringify(DEFAULT_ROSTER)); if (p.upg) SAVE.roster[0].upg = Object.assign(ZERO_UPG(), p.upg); }
    if (p.tartan && SAVE.roster[0]) SAVE.roster[0].tartan = p.tartan;
    delete SAVE.upg; delete SAVE.tartan;
  }
} catch (e) { }
// eight slots: SAVE.slots holds up to eight people (null = empty), SAVE.roster is just the filled ones in slot order. Extras beyond eight (old saves) are kept in SAVE.extra and never shown.
const NSLOT = 8;
function syncRoster() { SAVE.roster = SAVE.slots.filter(Boolean); }
(function () {
  const raw = (Array.isArray(SAVE.roster) ? SAVE.roster : []).map(r => r && typeof r === 'object' ? r : null);
  SAVE.slots = raw.slice(0, NSLOT); while (SAVE.slots.length < NSLOT) SAVE.slots.push(null);
  SAVE.extra = (Array.isArray(SAVE.extra) ? SAVE.extra : []).concat(raw.slice(NSLOT).filter(Boolean));
  if (!SAVE.slots.some(Boolean)) SAVE.slots = JSON.parse(JSON.stringify(DEFAULT_ROSTER)).concat([null]).slice(0, NSLOT);
  syncRoster();
  SAVE.roster.concat(SAVE.extra).forEach(r => { r.upg = Object.assign(ZERO_UPG(), r.upg || {}); if (!r.id) r.id = 'p' + Math.random().toString(36).slice(2, 8); normPerson(r); });
  SAVE.roster.forEach(claimWorn);
  if (!SAVE.roster.some(r => r.id === SAVE.me)) { SAVE.me = SAVE.roster[0].id; SAVE.partner = 'auto'; }
})();
function persist() { try { localStorage.setItem('reeltime-save', JSON.stringify(Object.assign({}, SAVE, { roster: SAVE.slots, slots: undefined }))); } catch (e) { } }
const SENS = { low: { look: 0.0024, turn: 1.2, exp: 2.0, acc: 6, sp: 2.3 }, med: { look: 0.0036, turn: 1.7, exp: 1.6, acc: 8, sp: 2.7 }, high: { look: 0.0052, turn: 2.3, exp: 1.25, acc: 12, sp: 3.1 } };
const sens = () => SENS[SAVE.sens] || SENS.med;
const meP = () => SAVE.roster.find(r => r.id === SAVE.me) || SAVE.roster[0];

const UPGRADES = {
  footwork: { name: 'Footwork', desc: 'A wider target ring. Small drifts stop costing you.', cost: [60, 120, 200, 320, 480],
    fx: s => [['Target ring', s.tol.toFixed(2) + ' m'], ['Accuracy scores zero beyond', (s.tol + 0.75).toFixed(2) + ' m']] },
  grip: { name: 'Grip', desc: 'Wider timing windows for hands, setting, clap and stomp, and a longer reach to a partner.', cost: [60, 120, 200, 320, 480],
    fx: s => [['Release (good / perfect)', '±' + s.gw.toFixed(2) + ' / ±' + s.pw.toFixed(3) + ' s'], ['SET green (good / perfect)', '±' + s.sgw.toFixed(3) + ' / ±' + s.spw.toFixed(3) + ' s'], ['Reach to a partner', '+' + s.reach.toFixed(2) + ' m']] },
  stamina: { name: 'Stamina', desc: 'Bigger energy bar, quicker refill, and every trick costs a little less puff.', cost: [50, 100, 170, 260, 380],
    fx: s => [['Energy bar', Math.round(s.emax)], ['Refill', s.regen.toFixed(1) + ' per s'], ['Trick cost', Math.round(s.costMul * 100) + '%']] },
  flair: { name: 'Flair', desc: 'Every hooch, twirl, high cut and new move scores more, and the flair window is wider.', cost: [80, 150, 240, 360, 520],
    fx: s => [['Flair score', '×' + s.flair.toFixed(2)], ['Flair window', '±' + s.fw.toFixed(2) + ' s']] }
};
// one place that turns training levels into numbers: used by newGame and shown in the outfitter
function trainStats(u, diff, heel) {
  const hl = heel || 0; // a lady in heels: tighter ring and slightly narrower timing windows (up to -28% / -16% / -20% at stiletto)
  return {
    tol: (0.24 + diff.tol + 0.06 * u.footwork) * (1 - 0.07 * hl),
    gw: (0.19 + 0.035 * u.grip) * (1 - 0.04 * hl), pw: (0.085 + 0.012 * u.grip) * (1 - 0.05 * hl), sgw: (0.15 + 0.022 * u.grip) * (1 - 0.04 * hl), spw: (0.07 + 0.009 * u.grip) * (1 - 0.05 * hl), reach: 0.55 + 0.1 * u.grip,
    emax: 100 + 25 * u.stamina, regen: 3 + 1.5 * u.stamina, costMul: 1 - 0.06 * u.stamina,
    flair: 1 + 0.3 * u.flair, fw: 0.26 + 0.035 * u.flair
  };
}
const TRICKS = {
  hooch: { name: 'Hooch', key: 'H', desc: 'Shout at the end of an 8-bar phrase.', cost: 0 },
  twirl: { name: 'Twirl', key: 'R', desc: 'A spin while you travel. Stay on the figure to score it.', cost: 80 },
  highcut: { name: 'High cut', key: 'F', desc: 'A Highland leap on a setting beat. Counts as your step too.', cost: 160 },
  // New moves (move:true) share one scorer, onMove(). code = the physical key. Keys in use elsewhere: T Q E Space H R F V P M W A S D arrows (G, B reserved for the set/helicopter moves).
  // win: 'flair' = within the flair window (every 2nd bar line, pulse bar on screen); 'beat' = on any half-bar beat; 'figend' = in the last bars of a figure
  clap: { name: 'Hands-up clap', key: 'C', code: 'KeyC', move: true, win: 'flair', energy: 12, pts: 170, cost: 120, desc: 'Clap overhead as the flair pulse reaches the green (every 2nd bar). Chains with other moves.' },
  leap: { name: 'Spring', key: 'X', code: 'KeyX', move: true, win: 'flair', energy: 20, pts: 240, cost: 200, desc: 'Both feet off the floor on the flair pulse. Land back inside the ring for +100.' },
  heel: { name: 'Heel click', key: 'Z', code: 'KeyZ', move: true, win: 'beat', energy: 8, pts: 60, cost: 100, desc: 'Click your heels on any half-bar beat while you are on the figure. Cheap, so chain them.' },
  pirouette: { name: 'Pirouette', key: 'K', code: 'KeyK', move: true, win: 'flair', energy: 35, pts: 420, cost: 300, desc: 'A full spin on one foot, started on the flair pulse. Stay in the ring the whole bar or it wobbles. Not while holding hands.' },
  bow: { name: 'Bow to partner', key: 'N', code: 'KeyN', move: true, win: 'figend', energy: 5, pts: 150, cost: 60, desc: 'As a figure ends, bow or curtsey: 150 plus up to 250 for how cleanly you danced it, and a breath of energy back.' }
};
