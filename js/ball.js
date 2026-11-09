/* Reel Time · ball.js
   The Ball: dance cards, asking partners, heat, water and tipsiness, and the waltz mini-game. */
"use strict";

/* ================= THE BALL (game mode) =================
   A whole evening: a dance card of reels, jigs and waltzes. Ask partners (they can say no), mind your HEAT, HYDRATION and
   DRUNKENNESS, visit the bar, step outside to cool down. Everything for Ball mode lives in this one section; the dance
   game only calls ballApply / ballTick / ballJitter / ballSway / ballCamWobble / ballDanceDone (see the g.ball hooks). */
const BALL = { active: false, auto: false, phase: 'off' };
const BALL_REELS = 5; // reels/jigs on the card; a waltz is slotted in every two or three dances
const DRINKS = {
  water: { name: 'Water', hydr: 35, heat: -6, drunk: -2, pride: 0, blurb: 'Cold from the jug on the buffet table.' },
  white: { name: 'White wine', hydr: 6, heat: -1, drunk: 14, pride: 5, blurb: 'Crisp and cold. A little courage.' },
  red: { name: 'Red wine', hydr: 4, heat: 2, drunk: 16, pride: 6, blurb: 'Warming, and it goes straight to your cheeks.' },
  beer: { name: 'Beer', hydr: 8, heat: -1, drunk: 12, pride: 4, blurb: 'A half-pint of heavy from the committee barrel.' },
  whisky: { name: 'Whisky', hydr: -3, heat: 6, drunk: 30, pride: 8, courage: true, blurb: 'A wee dram: big flair next dance, sloppy feet.' }
};
const WALTZ_ABC = `M:3/4
L:1/8
K:G
|"G"G2 B2 d2 | "G"g4 f2 | "C"e2 g2 c2 | "D7"d4 B2 | "G"G2 B2 d2 | "Em"e3 d c2 | "D7"B2 A2 F2 | "G"G6 | "D"A2 d2 f2 | "D"a4 f2 | "G"g2 f2 e2 | "Bm"d4 B2 | "C"c2 e2 g2 | "G"B2 d2 g2 | "D7"f2 e2 d2 | "G"G6 |]`;
const WALTZ_NAME = 'The Last Waltz at the Hall'; // an original tune, in 3/4
const WALTZ = (() => { const t = parseABC(WALTZ_ABC); t.harm = null; TUNES.push(t); return t; })();
const bxClamp = (v, a = 0, b = 100) => Math.max(a, Math.min(b, v));
const bxShuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

/* ---- people to ask ---- */
function ballGuest(name, kind) {
  const h = hashId(name);
  return { ...guestLook(h, kind), id: 'g-' + name, name, kind, skin: h % SKIN.length, hair: (h >>> 3) % HAIR.length, style: kind === 'gent' ? 'short' : ['long', 'bun'][h % 2], tartan: Object.keys(TARTANS)[h % 6], dress: (h >>> 5) % DRESS.length, height: kind === 'gent' ? 1.74 + (h % 14) / 100 : 1.6 + (h % 12) / 100, face: h % 3, gloves: kind === 'lady' && h % 2 === 1, guest: true, upg: ZERO_UPG() };
}
function ballPool(me) {
  const kind = me.kind === 'lady' ? 'gent' : 'lady';
  const pool = SAVE.roster.filter(r => r.kind === kind && r.id !== me.id);
  const names = FILL[kind]; let i = 0;
  while (pool.length < 9 && i < names.length) pool.push(ballGuest(names[i++], kind));
  return pool;
}
const ballWarm = p => ((hashId(p.id) % 97) / 97) * 0.3 - 0.12 + (p.guest ? 0 : 0.07);
function ballMood(p) {
  const x = ballWarm(p) + (BALL.likes[p.id] || 0) * 0.05;
  return x > 0.14 ? ['Radiant', 'good'] : x > 0.06 ? ['Smiling', 'good'] : x > -0.02 ? ['Polite', 'mid'] : ['Aloof', 'bad'];
}
function ballLook() {
  const b = BALL;
  if (b.drunk > 75) return 'swaying badly';
  if (b.heat > 85) return 'scarlet and dripping';
  if (b.drunk > 45) return 'merry';
  if (b.hydr < 25) return 'parched';
  if (b.heat > 65) return 'flushed';
  if (b.drunk > 20) return 'a little tipsy';
  return 'fresh as a daisy';
}
function ballOutfit() { const me = meP(); return me.kind === 'gent' ? 1.2 : 1 + (me.dress % 4) * 0.06 + (me.gloves ? 0.05 : 0); }
function ballChance(c) {
  const sk = BALL.card.filter(e => e.status === 'danced');
  const avg = sk.length ? sk.reduce((a, e) => a + e.stars, 0) / sk.length / 3 : 0.5;
  // Most people say yes. Only a very tipsy (over 55) or very hot (over 85) dancer is turned down, and the more so the worse it is.
  const dp = BALL.drunk > 55 ? (BALL.drunk - 55) * 0.02 : 0, hp = BALL.heat > 85 ? (BALL.heat - 85) * 0.04 : 0;
  if (dp + hp <= 0) return { p: 1, dp, hp };
  const nudge = (avg - 0.5) * 0.1 + (BALL.pride - 50) * 0.001 + ballWarm(c.p) * 0.2 + (BALL.likes[c.p.id] || 0) * 0.03;
  return { p: bxClamp(1 - dp - hp + nudge, 0.05, 0.97), dp, hp };
}

/* ---- starting a ball ---- */
function newBall(demo) {
  const auto = BALL.auto; Object.keys(BALL).forEach(k => delete BALL[k]);
  const me = meP();
  const keys = Object.keys(DANCES).filter(k => DANCE_ORDER.includes(k) && k !== 'dws'); const order = bxShuffle(keys.length ? keys : DANCE_ORDER);
  const reels = ['dws']; for (let i = 1; i < BALL_REELS; i++) reels.push(order[(i - 1) % order.length]); // the Dashing White Sergeant always opens the ball (and needs TWO partners)
  const pattern = ['r', 'r', 'w', 'r', 'r', 'w', 'r']; let ri = 0;
  const card = pattern.map((p, i) => p === 'w' ? { n: i + 1, kind: 'waltz', name: 'Waltz: ' + WALTZ_NAME, type: 'Waltz', partner: null, partner2: null, need: 1, status: 'pending', stars: 0, score: 0, coins: 0 }
    : (() => { const k = reels[ri++]; return { n: i + 1, kind: 'dance', key: k, name: DANCES[k].short, type: String(DANCES[k].meta).split(' ·')[0], partner: null, partner2: null, need: k === 'dws' ? 2 : 1, status: 'pending', stars: 0, score: 0, coins: 0 }; })());
  BW.uid = null; BW.practised = false;
  Object.assign(BALL, { uid: Date.now() + Math.random(), active: true, auto, demo: !!demo, me, card, idx: 0, heat: 12, chill: 0, hydr: 82, drunk: 0, pride: 55, courage: false, sickNext: false, score: 0, rej: 0, asks: 0, overheats: 0, maxDrunk: 0, drinks: 0, outsides: 0, sick: 0, likes: {}, pool: ballPool(me), msg: '', phase: 'gap', view: 'main', moments: 5, cands: null, w: null });
}
function ballAbort() {
  BALL.active = false; BALL.phase = 'off'; if (BALL.w) BALL.w.done = true;
  bwHide(); waltzCleanup();
  const h = $('ballHud'); if (h) h.hidden = true; ballFx(true); window.__ballGo = false;
}

/* ---- the dance game hooks ---- */
function ballMods() { // how well your hands and feet obey you right now (1 = perfectly)
  const heatK = 1 - 0.3 * bxClamp((BALL.heat - 55) / 45, 0, 1), hydrK = BALL.hydr < 30 ? 1 - 0.25 * (30 - BALL.hydr) / 30 : 1, drunkK = 1 - 0.38 * BALL.drunk / 100;
  const chillK = 1 - 0.3 * bxClamp(((BALL.chill || 0) - 25) / 75, 0, 1); // shivering: stiff hands and feet (narrower timing windows)
  return Math.max(0.5, heatK * hydrK * drunkK * chillK);
}
function ballJitter(k = 1) { return (Math.random() * 2 - 1) * 0.2 * (BALL.drunk / 100) * k * (BALL.whisky ? 1.4 : 1); }
function ballSway() { if (!BALL.active || BALL.drunk < 8) return 0; const t = performance.now() / 1000, d = Math.pow(BALL.drunk / 100, 1.2); return (Math.sin(t * 1.1) * 0.7 + Math.sin(t * 2.3 + 1) * 0.3) * 0.16 * d; }
function ballCamWobble(cam) { if (!BALL.active || BALL.drunk < 8) return; const t = performance.now() / 1000, d = BALL.drunk / 100; cam.position.y += Math.sin(t * 1.7) * 0.05 * d; cam.position.x += Math.sin(t * 0.9) * 0.06 * d; cam.position.z += Math.cos(t * 1.3) * 0.04 * d; }
function ballApply(g) {
  g.ball = BALL; g.ballIdx = BALL.idx;
  g.gw0 = g.gw; g.pw0 = g.pw; g.sgw0 = g.sgw; g.spw0 = g.spw; g.tol0 = g.tol; g.regen0 = g.regen; g.flair0 = g.flair;
  g.whisky = BALL.courage; BALL.whisky = BALL.courage; BALL.courage = false;
  if (g.whisky) { g.flair *= 1.5; pop(g, 'Dutch courage: flair ×1.5', '#e2b45c'); }
  g.bx = { warned: {} };
  if ((BALL.chill || 0) >= 75) { BALL.score = Math.max(0, BALL.score - 250); BALL.pride = bxClamp(BALL.pride - 5); g.energy = g.emax * 0.5; pop(g, 'Frozen stiff from the terrace: half energy (−250 ball score)', '#8fb4ff'); }
  ballHudShow(true);
}
function ballTick(g, dtB, dtSec) {
  if (g.done) return;
  const B = BALL; dtB = bxClamp(dtB, 0, 2);
  if (g.t >= 0 && g.t <= g.total && dtB > 0) {
    const pace = Math.pow(g.D.bpm * g.diff.speed / 46, 1.4), dh = { ceilidh: 1, ball: 1.1, highland: 1.3 }[SAVE.diff] || 1;
    B.heat = bxClamp(B.heat + 0.45 * pace * ballOutfit() * dh * dtB);
    B.hydr = bxClamp(B.hydr - 0.26 * (1 + B.heat / 80) * dtB);
    B.drunk = bxClamp(B.drunk - 0.1 * dtB);
    B.chill = bxClamp((B.chill || 0) - 3 * dtB); // dancing warms you through
    const ck = bxClamp((B.chill - 25) / 75, 0, 1); if (ck > 0) g.energy = Math.max(0, g.energy - 2.6 * ck * dtSec); // the cold saps your energy (and slows its recovery, below)
    if (B.heat >= 100 && g.t - (g.bx.lastOH || -99) > 6) {
      g.bx.lastOH = g.t; B.overheats++; B.heat = 72; B.pride = bxClamp(B.pride - 8); g.energy = 0;
      penalty(g, 400, 'OVERHEATED! You need air'); g.stats.wrong++;
    }
  }
  const W = g.bx.warned;
  if (B.heat > 75 && !W.heat) { W.heat = 1; pop(g, 'Getting very hot…', '#f0b54a'); }
  if ((B.chill || 0) > 40 && !W.chill) { W.chill = 1; pop(g, 'Shivering: stiff timing, energy draining', '#8fb4ff'); }
  if (B.hydr < 25 && !W.hydr) { W.hydr = 1; pop(g, 'Parched: footwork suffers', '#f0b54a'); }
  if (B.drunk > 55 && !W.drunk) { W.drunk = 1; pop(g, 'The room is rocking', '#8e7cc3'); }
  B.maxDrunk = Math.max(B.maxDrunk, B.drunk);
  const m = ballMods() * (g.whisky ? 0.92 : 1);
  g.gw = g.gw0 * m; g.pw = g.pw0 * m; g.sgw = g.sgw0 * m; g.spw = g.spw0 * m;
  g.tol = g.tol0 * (1 - 0.3 * B.drunk / 100) * (B.hydr < 20 ? 0.92 : 1);
  g.regen = g.regen0 * (1 - 0.7 * bxClamp((B.heat - 40) / 60, 0, 1)) * (B.hydr < 25 ? 0.7 : 1) * (1 - 0.85 * bxClamp(((B.chill || 0) - 25) / 75, 0, 1));
  ballHudUpdate(); ballFx();
}
function ballDanceDone(g, stars, score) {
  const e = BALL.card[BALL.idx], who = e.partner;
  e.status = 'danced'; e.stars = stars; e.score = score; e.coins = BALL.demo ? 0 : Math.round(score / 90 + stars * 15); BALL.score += score;
  [who, e.partner2].forEach(w2 => { if (w2) BALL.likes[w2.id] = bxClamp((BALL.likes[w2.id] || 0) + (stars >= 2 ? 1 : stars === 0 ? -1 : 0), -2, 2); });
  BALL.pride = bxClamp(BALL.pride + (stars >= 2 ? 5 : stars === 0 ? -6 : 0));
  BALL.whisky = false;
  $('hud').hidden = true; $('topbtns').hidden = true; $('pauseOv').hidden = true; $('touch').classList.remove('play'); ballHudShow(false);
  const q = ['"Well. That was... memorable."', '"Thank you, that was fun."', '"Lovely! We must do that again."', '"The best dance of my night!"'][stars];
  ballAdvance((who ? who.name + ': ' : '') + q + ' (' + score.toLocaleString('en-GB') + ' points)');
}
function ballAdvance(msg) { BALL.idx++; if (BALL.idx >= BALL.card.length) ballResults(); else ballGap(msg); }

/* ---- gaps between dances ---- */
function ballGap(msg) {
  BALL.phase = 'gap'; BALL.view = 'main'; BALL.moments = BALL.idx === 0 ? 5 : 4; BALL.cands = null; BALL.msg = msg || '';
  if (BALL.idx > 0) { BALL.heat = Math.max(0, BALL.heat - 8); BALL.drunk = Math.max(0, BALL.drunk - 4); }
  band.stop();
  if (!BALL.noWorld && !BALL.auto && init3D()) { bwEnter(msg); return; } // Ball world: walk the hall, bar, terrace, partners (BALL WORLD block)
  ballFx(true); showScreen('sBall'); ballRender(); // fallback without WebGL: the menu version
}
function ballCands() {
  if (BALL.cands) return BALL.cands;
  BALL.cands = bxShuffle(BALL.pool).slice(0, 4).map(p => { const booked = Math.random() < 0.22; return { p, booked, hint: booked && Math.random() < 0.6, asked: false, res: null }; });
  return BALL.cands;
}
function ballAsk(i) {
  const e = BALL.card[BALL.idx], c = ballCands()[i];
  if (!c || c.asked || e.partner || BALL.moments <= 0) return;
  BALL.moments--; BALL.asks++; c.asked = true;
  const ch = ballChance(c); const ok = !c.booked && Math.random() < ch.p;
  if (ok) { e.partner = c.p; c.res = 'yes'; BALL.pride = bxClamp(BALL.pride + 3); BALL.msg = c.p.name + ': "Thank you, I would love to."'; }
  else {
    c.res = 'no'; BALL.rej++; BALL.pride = bxClamp(BALL.pride - 6);
    const line = c.booked ? '"I am so sorry, I am promised for this one."' : ch.dp > 0.2 && ch.dp >= ch.hp ? '"Perhaps after a glass of water... "' : ch.hp > 0.06 ? '"You are awfully warm. Maybe some air first?"' : '"Thank you, but I think I will sit this one out."';
    BALL.msg = c.p.name + ': ' + line + ' (confidence −6)';
  }
  ballRender();
}
function ballDrinkApply(k) { // the effects of one drink (shared by the menu bar and the physical bar)
  const d = DRINKS[k];
  BALL.drinks++;
  const over = BALL.drunk + d.drunk >= 100;
  BALL.hydr = bxClamp(BALL.hydr + d.hydr); BALL.heat = bxClamp(BALL.heat + d.heat); BALL.drunk = bxClamp(BALL.drunk + d.drunk); BALL.pride = bxClamp(BALL.pride + d.pride);
  if (d.courage) BALL.courage = true;
  BALL.maxDrunk = Math.max(BALL.maxDrunk, BALL.drunk);
  let msg = d.name + ': ' + d.blurb;
  if (over) {
    BALL.sick++; BALL.sickNext = true; BALL.drunk = 45; BALL.hydr = bxClamp(BALL.hydr - 12); BALL.heat = bxClamp(BALL.heat - 10); BALL.pride = bxClamp(BALL.pride - 12); BALL.moments = 0; BALL.courage = false;
    msg = 'One too many. You are sick behind the curtains and will miss the next dance.';
  }
  return { msg, over };
}
function ballDrink(k) {
  const d = DRINKS[k]; if (!d || BALL.moments <= 0) return;
  BALL.moments--; BALL.msg = ballDrinkApply(k).msg;
  ballRender();
}
function ballOutside() {
  if (BALL.moments <= 0) return;
  BALL.moments = Math.max(0, BALL.moments - 2); BALL.outsides++;
  BALL.heat = Math.max(4, BALL.heat - 45); BALL.drunk = bxClamp(BALL.drunk - 12); BALL.hydr = bxClamp(BALL.hydr - 3); BALL.pride = bxClamp(BALL.pride + 2);
  BALL.view = 'outside'; BALL.msg = ''; ballRender();
}
function ballGo() {
  if (BALL.phase !== 'gap') return;
  const e = BALL.card[BALL.idx];
  if (BALL.sickNext) { BALL.sickNext = false; e.status = 'sick'; e.partner = null; BALL.score = Math.max(0, BALL.score - 300); BALL.view = 'sit'; BALL.msg = 'You are lying down in the cloakroom while the band plays on. (−300)'; BALL.heat = Math.max(0, BALL.heat - 10); return ballRender(); }
  if (!e.partner) { e.status = 'sat'; BALL.score = Math.max(0, BALL.score - 150); BALL.pride = bxClamp(BALL.pride - 4); BALL.heat = Math.max(0, BALL.heat - 10); BALL.hydr = bxClamp(BALL.hydr + 6); BALL.view = 'sit'; BALL.msg = 'No partner for this one. You watch from the bar and sip a water. (−150, you cool off a little)'; return ballRender(); }
  if (e.kind === 'waltz') return ballWaltzStart();
  ballStartDance();
}
function ballStartDance() {
  const e = BALL.card[BALL.idx]; BALL.phase = 'dance';
  window.__ballGo = true; window.__ballPartner = e.partner; window.__ballPartner2 = e.partner2 || null;
  try { newGame(e.key, BALL.demo, false); } finally { window.__ballGo = false; window.__ballPartner = undefined; window.__ballPartner2 = null; }
  $('hWho').textContent = (BALL.demo ? 'Demo ball · ' : 'Ball · ') + 'dance ' + e.n + ' of ' + BALL.card.length + ' · with ' + e.partner.name + (e.partner2 ? ' & ' + e.partner2.name : '');
  if (e.need === 2 && !e.partner2 && game) { BALL.score = Math.max(0, BALL.score - 100); pop(game, 'Only one partner: a guest joins the trio (−100 ball score)', '#f0b54a'); }
}

/* ---- waltz mini-game: step on the ONE ---- */
function waltzPlay(barDur, intro, total) {
  if (!band.ensure()) return null; try { band.ctx.resume(); } catch (e) { }
  band.stop();
  const c = band.ctx, N = WALTZ.bars, start = c.currentTime + 0.25, bar0 = start + intro * barDur;
  const chordFor = b => { let cur = null; WALTZ.chords.forEach(x => { if (x.t <= b + 1e-6) cur = x; }); return chordName(cur ? cur.name : 'G'); };
  const ev = [];
  for (let rep = 0; rep * N < total + 1; rep++) WALTZ.notes.forEach(n => { const tb = n.t + rep * N; if (n.midi != null && tb >= 0 && tb < total) ev.push({ t: tb, k: 'n', n, rep }); });
  for (let b = -intro; b < total; b++) { const ch = chordFor(b < 0 ? 0 : b % N); ev.push({ t: b, k: 'bass', c: ch }); ev.push({ t: b + 1 / 3, k: 'vamp', c: ch }); ev.push({ t: b + 2 / 3, k: 'vamp', c: ch }); [0, 1, 2].forEach(i => ev.push({ t: b + i / 3, k: 'br' })); }
  ev.push({ t: total, k: 'end', c: chordFor(0) });
  ev.sort((a, b) => a.t - b.t);
  let i = 0;
  const tick = () => {
    const cx = band.ctx; if (!cx) return;
    while (i < ev.length && bar0 + ev[i].t * barDur < cx.currentTime + 0.25) {
      const e = ev[i++], at = bar0 + e.t * barDur; if (at < cx.currentTime - 0.05) continue;
      const fs = e.c ? e.c.pcs.slice(0, 3).map(p => mtof(55 + ((p - 7 + 12) % 12))) : null;
      if (e.k === 'n') { const f = mtof(e.n.midi); band.accordion(f, at, e.n.d * barDur, 0.07); if (e.rep % 2 === 1) band.fiddle(f * 2, at, e.n.d * barDur, 0.03); }
      else if (e.k === 'bass') { band.bass(mtof(36 + e.c.root), at, barDur * 0.3); band.kick(at, 0.2); }
      else if (e.k === 'vamp') band.piano(fs, at, 0.05);
      else if (e.k === 'br') band.brush(at, 0.03);
      else if (e.k === 'end') { band.piano(fs, at, 0.1); band.bass(mtof(36 + e.c.root), at, barDur); band.accordion(mtof(67), at, barDur * 1.2, 0.08); }
    }
  };
  tick(); band.timer = setInterval(tick, 30);
  return bar0;
}
function ballWaltzStart(practice) {
  const e = practice ? null : BALL.card[BALL.idx]; BALL.phase = 'waltz'; BALL.view = 'waltz'; band.stop();
  const evs = []; for (let b = 0; b < 16; b++) evs.push({ b, res: null, turn: b % 4 === 3 });
  // practice: a slower band (2.0 s a bar against 1.1) and a much wider window, and nobody to be tipsy
  const w = BALL.w = { barDur: practice ? 2.0 : 1.1, intro: 2, total: 16, ev: evs, score: 0, max: evs.reduce((a, x) => a + (x.turn ? 200 : 100), 0), pops: [], done: false, t: -2, perfect: 0, good: 0, miss: 0, clock0: performance.now(), audio0: null, partner: practice ? BALL.pp : e.partner, mods: practice ? 1 : ballMods(), practice: !!practice, win: practice ? 2.6 : 1 };
  waltzCleanup(); BW.wz3d = !!(window.THREE && init3D()); if (BW.wz3d) waltzScene3D(true);
  ballRender();
  w.audio0 = waltzPlay(w.barDur, w.intro, w.total); w.clock0 = performance.now();
  say('The band strikes up a waltz');
  waltzFrame();
}
function waltzNow(w) { return w.audio0 != null && band.running() ? (band.ctx.currentTime - w.audio0) / w.barDur : -w.intro + ((performance.now() - w.clock0) / 1000 * (window.__TS || 1)) / w.barDur; }
function waltzPress() {
  const w = BALL.w; if (!w || w.done || BALL.phase !== 'waltz') return;
  const t = w.t + ballJitter(1) * 0.9, m = bxClamp(w.mods * (BALL.whisky ? 0.92 : 1), 0.5, 1);
  let e = null, bd = 9; w.ev.forEach(x => { if (!x.res) { const d = Math.abs(t - x.b); if (d < bd) { bd = d; e = x; } } });
  if (!e || bd > 0.42 * Math.min(1.25, w.win || 1)) { w.pops.push({ text: 'Stumble', col: '#ef6a5e', t0: performance.now() }); return; }
  const pw = 0.07 * m * (w.win || 1), gw = 0.17 * m * (w.win || 1), d = t - e.b, k = e.turn ? 2 : 1;
  w.stepT = performance.now(); // the 3D couple rises on the step
  if (bd <= pw) { e.res = 'perfect'; w.score += 100 * k; w.perfect++; w.pops.push({ text: e.turn ? 'Perfect turn!' : 'Perfect', col: '#e2b45c', t0: performance.now() }); band.blip(880, 0.06, 0.08); }
  else if (bd <= gw) { e.res = 'good'; w.score += 60 * k; w.good++; w.pops.push({ text: d < 0 ? 'Good (early)' : 'Good (late)', col: '#7fd08a', t0: performance.now() }); band.blip(660, 0.06, 0.08); }
  else { e.res = 'rough'; w.score += 20 * k; w.miss++; w.pops.push({ text: d < 0 ? 'Rushed' : 'Dragged', col: '#f0b54a', t0: performance.now() }); }
}
function waltzFrame() {
  const w = BALL.w; if (!w || w.done || BALL.phase !== 'waltz') return;
  w.t = waltzNow(w);
  w.ev.forEach(x => { if (!x.res && w.t > x.b + 0.45) { x.res = 'miss'; w.miss++; w.pops.push({ text: 'Missed', col: '#a7b6ad', t0: performance.now() }); } });
  if (BALL.auto) { const nx = w.ev.find(x => !x.res); if (nx && w.t >= nx.b + 0.01) { const keep = w.t; w.t = nx.b + 0.02; waltzPress(); w.t = keep; } }
  waltzDraw(w);
  if (w.t > w.total + 0.7) return ballWaltzDone(w);
  requestAnimationFrame(waltzFrame);
}
function waltzDraw(w) {
  const cv = $('bxW'); if (!cv) return; const c = cv.getContext('2d'), Wd = cv.width, Hd = cv.height, t = w.t, now = performance.now();
  c.clearRect(0, 0, Wd, Hd);
  const z3 = BW.wz3d; // 3D couple behind this canvas: only the rings and the text are drawn here
  const bg = c.createRadialGradient(Wd / 2, Hd * 0.5, z3 ? Math.min(Wd, Hd) * 0.3 : 20, Wd / 2, Hd * 0.5, z3 ? Math.max(Wd, Hd) * 0.7 : Wd * 0.6); bg.addColorStop(0, z3 ? 'rgba(10,6,3,0)' : '#6e4a2a'); bg.addColorStop(1, z3 ? 'rgba(10,6,3,.62)' : '#1b110a'); c.fillStyle = bg; c.fillRect(0, 0, Wd, Hd);
  const cx = Wd / 2, cy = z3 ? Hd * 0.48 : Hd * 0.53, d = BALL.drunk / 100;
  // floor boards
  if (!z3) { c.strokeStyle = 'rgba(30,16,8,.45)'; c.lineWidth = 1; for (let x = -Wd; x < Wd * 2; x += 36) { c.beginPath(); c.moveTo(x, 0); c.lineTo(x, Hd); c.stroke(); } }
  // target ring and the closing ring
  const R = 100, q = t < 0 ? 1 : Math.ceil(t - 1e-6) - t;
  let rx = R, ry = R, ox = cx, oy = cy; // in the 3D view the rings lie on the floor around the couple's feet
  if (z3 && BW.wfeet && R3.camera) { const F = BW.wfeet, cm = R3.camera, P = (x, z) => { const v = new THREE.Vector3(x, 0.02, z).project(cm); return [(v.x + 1) / 2 * Wd, (1 - v.y) / 2 * Hd]; }, a0 = P(F.x, F.z), a1 = P(F.x + F.rx, F.z + F.rz), a2 = P(F.x - F.rz, F.z + F.rx); ox = a0[0]; oy = a0[1]; rx = Math.max(30, Math.hypot(a1[0] - a0[0], a1[1] - a0[1]) * 1.0); ry = Math.max(14, Math.hypot(a2[0] - a0[0], a2[1] - a0[1])); }
  const ring = (k, fill) => { c.beginPath(); c.ellipse(ox, oy, rx * k, ry * k, 0, 0, TAU); fill ? c.fill() : c.stroke(); };
  c.lineWidth = 4; c.strokeStyle = 'rgba(226,180,92,.9)'; ring(1);
  const fl = t >= 0 && t - Math.floor(t) < 0.12 ? 1 - (t - Math.floor(t)) / 0.12 : 0;
  if (t < w.total + 0.2) { c.lineWidth = 3; c.strokeStyle = `rgba(240,232,216,${0.35 + 0.5 * (1 - q)})`; ring(1 + 0.48 * q); }
  if (fl) { c.fillStyle = `rgba(226,180,92,${fl * 0.3})`; ring(1, true); }
  // the couple turning in the middle, one revolution every two bars
  const me = BALL.me, pa = w.partner, ang = (Math.max(t, -1) * TAU / 2) + Math.sin(now / 700) * d * 0.5, rr = 40 + Math.sin(now / 430) * d * 8;
  const pos = [[cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr * 0.62, me], [cx - Math.cos(ang) * rr, cy - Math.sin(ang) * rr * 0.62, pa]];
  const real = ctx;
  if (!z3) pos.forEach(([x, y, per]) => {
    const lady = per.kind === 'lady';
    c.fillStyle = lady ? DRESS[per.dress % DRESS.length] : (TARTANS[per.tartan] || TARTANS.red).base; c.beginPath(); c.ellipse(x, y + 6, 26, 19, 0, 0, TAU); c.fill();
    c.fillStyle = lady ? '#f4f1ea' : '#15181e'; c.beginPath(); c.ellipse(x, y + 1, 20, 13, 0, 0, TAU); c.fill();
    ctx = c; try { drawMiiHead(ctx, per, per.kind, x, y - 2, 15); } finally { ctx = real; }
  });
  c.font = '700 13px Barlow, sans-serif'; c.textAlign = 'center'; c.fillStyle = '#f0e8d8'; c.fillText(me.name + '  &  ' + pa.name, cx, z3 ? Hd - 52 : cy + 4 + rr * 0.62 + 40);
  // beats: ONE two three
  const bt = t < 0 ? -1 : Math.floor((t - Math.floor(t)) * 3);
  ['ONE', 'two', 'three'].forEach((s, i) => { c.font = (i === 0 ? '800 20px' : '600 15px') + ' Barlow Condensed, Barlow, sans-serif'; c.fillStyle = bt === i ? '#e2b45c' : 'rgba(240,232,216,.4)'; c.fillText(s, cx + (i - 1) * 64, Hd - 118); });
  // bar progress
  const bw = Wd - 40; c.fillStyle = 'rgba(0,0,0,.4)'; c.fillRect(20, 12, bw, 8);
  w.ev.forEach(x => { c.fillStyle = x.res === 'perfect' ? '#e2b45c' : x.res === 'good' ? '#7fd08a' : x.res === 'rough' ? '#f0b54a' : x.res === 'miss' ? '#ef6a5e' : (x.turn ? 'rgba(142,124,195,.7)' : 'rgba(240,232,216,.25)'); c.fillRect(20 + x.b / 16 * bw + 1, 12, bw / 16 - 2, 8); });
  c.font = '600 12px Barlow, sans-serif'; c.textAlign = 'left'; c.fillStyle = 'rgba(240,232,216,.7)'; c.fillText(t < 0 ? 'Count in… get ready to press on the ONE' : 'Bar ' + Math.min(16, Math.max(1, Math.floor(t) + 1)) + ' of 16 · purple bars are turns: double points', 20, 36);
  c.textAlign = 'right'; c.fillText('Waltz points ' + w.score, Wd - 20, 36);
  c.textAlign = 'center'; w.pops = w.pops.filter(p => now - p.t0 < 800);
  w.pops.forEach(p => { const a = (now - p.t0) / 800; c.globalAlpha = 1 - a; c.fillStyle = p.col; c.font = '800 22px Barlow Condensed, Barlow, sans-serif'; c.fillText(p.text, cx, (z3 ? Hd * 0.3 : cy - 64) - a * 22); c.globalAlpha = 1; });
}
function ballWaltzDone(w) {
  w.done = true; band.stop();
  if (w.practice) return waltzPracticeDone(w);
  waltzCleanup();
  const e = BALL.card[BALL.idx], r = w.score / w.max, stars = r >= 0.8 ? 3 : r >= 0.6 ? 2 : r >= 0.35 ? 1 : 0;
  e.status = 'danced'; e.stars = stars; e.score = w.score; e.wscore = w.score; e.coins = BALL.demo ? 0 : Math.round(w.score / 100 + stars * 10); BALL.score += w.score * 3;
  BALL.likes[w.partner.id] = bxClamp((BALL.likes[w.partner.id] || 0) + (stars >= 2 ? 1 : stars === 0 ? -1 : 0), -2, 2);
  BALL.pride = bxClamp(BALL.pride + (stars >= 2 ? 4 : stars === 0 ? -4 : 0));
  BALL.heat = bxClamp(BALL.heat + 8); BALL.hydr = bxClamp(BALL.hydr - 6); BALL.drunk = bxClamp(BALL.drunk - 2); BALL.whisky = false;
  if (stars) band.applause();
  ballAdvance(w.partner.name + ': ' + ['"Oh dear. We shall call it enthusiastic."', '"A pleasant turn about the floor."', '"That was lovely, thank you."', '"We floated!"'][stars] + ' (waltz ' + w.score + ' of ' + w.max + ')');
}

/* ---- results ---- */
function ballVerdict(danced, sat) {
  const avg = danced.length ? danced.reduce((a, e) => a + e.stars, 0) / danced.length : 0, me = BALL.me;
  if (BALL.sick >= 2) return 'You were last seen asleep in the cloakroom, twice. The committee would like its coats back.';
  if (sat >= Math.ceil(BALL.card.length / 2)) return 'More of the night spent at the bar than on the floor. The wallflowers send their regards.';
  if (BALL.overheats >= 2) return 'You danced so hard the windows steamed up, twice. Somebody propped the door open for you.';
  if (BALL.maxDrunk > 85) return 'Everyone agrees the singing on the stairs was heartfelt, if not in tune.';
  if (avg >= 2.4) return (me.kind === 'lady' ? 'Belle' : 'Beau') + ' of the ball: the whole hall will want to dance with you next time.';
  if (avg >= 1.5) return 'A good night: steady feet, warm company, and no complaints from the caller.';
  if (BALL.rej >= 4) return 'A hard night for the pride, but you kept asking, and that counts for something.';
  return 'Enthusiastic, if a little ragged. You were certainly noticed.';
}
function ballResults(left) { // left = you walked out early: the shillings for the dances you finished are still yours
  bwHide(); waltzCleanup();
  BALL.phase = 'results'; BALL.view = 'results'; BALL.left = !!left; band.stop(); if (!left) band.applause(); ballFx(true); ballHudShow(false);
  const c = BALL.card, danced = c.filter(e => e.status === 'danced'), sat = c.filter(e => e.status === 'sat' || e.status === 'sick').length;
  BALL.prideBonus = left ? 0 : Math.round(BALL.pride * 6);
  BALL.total = Math.max(0, Math.round(BALL.score + BALL.prideBonus));
  BALL.coins = BALL.demo ? 0 : c.reduce((a, e) => a + (e.coins || 0), 0);
  BALL.newBest = false;
  if (!BALL.demo) {
    SAVE.shillings += BALL.coins;
    if (!left) { SAVE.balls = (SAVE.balls || 0) + 1; const prev = SAVE.bestBall || 0; BALL.newBest = BALL.total > prev; SAVE.bestBall = Math.max(prev, BALL.total); }
    persist();
  }
  BALL.verdict = left ? (danced.length ? 'You slipped away early with ' + danced.length + ' dance' + (danced.length > 1 ? 's' : '') + ' behind you and ' + BALL.coins + ' shilling' + (BALL.coins === 1 ? '' : 's') + ' in your sporran. The band played on without you.' : 'You left before the first reel was over. Nobody noticed, and nobody was owed a dance.') : ballVerdict(danced, sat);
  showScreen('sBall'); ballRender();
}

/* ---- the screens ---- */
function ballMetersHTML(small) {
  const m = (lab, v, cls) => `<div class="bxm ${cls}"><span>${lab}</span><div class="bxbar"><i style="width:${Math.round(v)}%"></i></div></div>`;
  return m('Heat', BALL.heat, 'heat' + (BALL.heat > 85 ? ' hot' : '')) + ((BALL.chill || 0) > 1 ? m('Cold', BALL.chill, 'chill' + (BALL.chill > 65 ? ' frz' : '')) : '') + m('Water', BALL.hydr, 'hydr' + (BALL.hydr < 25 ? ' low' : '')) + m('Tipsy', BALL.drunk, 'drunk') + (small ? '' : m('Pride', BALL.pride, 'pride'));
}
function ballHudShow(on) {
  let h = $('ballHud'); if (!h) return; h.hidden = !on; if (on) ballHudUpdate(true);
}
function ballHudUpdate(force) {
  const h = $('ballHud'); if (!h || h.hidden) return; const now = performance.now();
  if (!force && now - (h._t || 0) < 120) return; h._t = now;
  const e = BALL.card && BALL.card[BALL.idx];
  h.innerHTML = `<div class="bxt">Ball · dance ${e ? e.n : '?'} of ${BALL.card.length}${BALL.whisky ? ' · whisky' : ''}</div>` + ballMetersHTML(true) + (BW.on && BW.zone === 'out' && BW.warming ? '<div class="bxpill warm">Warming up</div>' : (BALL.chill || 0) > 65 ? '<div class="bxpill frz">Freezing</div>' : (BALL.chill || 0) > 30 ? '<div class="bxpill chl">Chilly</div>' : '');
}
function ballFx(reset) {
  const d = reset || !BALL.active ? 0 : BALL.drunk, gl = $('gl'), c2 = $('c'); if (!gl || !c2) return;
  if (d < 25) { if (gl._fx) { gl.style.filter = c2.style.filter = ''; gl.style.transform = c2.style.transform = ''; gl._fx = 0; } return; }
  gl._fx = 1; const t = performance.now() / 1000, k = (d - 25) / 75;
  const f = `blur(${(k * 2.4).toFixed(2)}px) saturate(${(1 + k * 0.35).toFixed(2)}) hue-rotate(${(Math.sin(t * 0.8) * k * 14).toFixed(1)}deg)`;
  const tr = `scale(${(1.015 + k * 0.03).toFixed(3)}) rotate(${(Math.sin(t * 0.9) * k * 0.9).toFixed(2)}deg) translateX(${(Math.sin(t * 1.4) * k * 5).toFixed(1)}px)`;
  gl.style.filter = c2.style.filter = f; gl.style.transform = c2.style.transform = tr;
}
const bxSign = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
function ballCardHTML() {
  return `<div class="bx-card"><div class="bx-card-t">Dance card</div>` + BALL.card.map((e, i) => {
    const now = BALL.phase !== 'results' && i === BALL.idx;
    const res = e.status === 'danced' ? (e.kind === 'waltz' ? '<span class="st">' + '★'.repeat(e.stars) + '<span class="off">' + '★'.repeat(3 - e.stars) + '</span></span> ' + e.score + ' pts' : '<span class="st">' + '★'.repeat(e.stars) + '<span class="off">' + '★'.repeat(3 - e.stars) + '</span></span> ' + e.score.toLocaleString('en-GB')) : e.status === 'sat' ? '<i>sat out</i>' : e.status === 'sick' ? '<i>unwell</i>' : '';
    return `<div class="bx-row ${now ? 'now' : ''}"><b>${e.n}.</b><div><div class="nm">${esc(e.name)}</div><div class="pt">${e.partner ? 'with ' + esc(e.partner.name) + (e.partner2 ? ' &amp; ' + esc(e.partner2.name) : (e.need === 2 && e.status === 'pending' ? ' <i>(and one more)</i>' : '')) : (e.status === 'pending' ? '<i>' + (e.need === 2 ? 'needs two partners' : 'nobody yet') + '</i>' : '')} ${res}</div></div></div>`;
  }).join('') + `</div>`;
}
const BX_NIGHT = (() => { let s = '', h = 91; for (let i = 0; i < 40; i++) { h = (h * 1103515245 + 12345) >>> 0; const x = h % 640; h = (h * 1103515245 + 12345) >>> 0; const y = h % 150; s += `<circle class="tw" style="animation-delay:${(i % 7) * 0.4}s" cx="${x}" cy="${y}" r="${(i % 3 === 0) ? 1.8 : 1.1}" fill="#f4f1ea"/>`; } return s; })();
function ballOutsideSVG() {
  return `<svg viewBox="0 0 640 260" class="bx-night" role="img" aria-label="A terrace at night with a bench under a lamp">
    <defs><linearGradient id="bxsky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#050a1a"/><stop offset="1" stop-color="#18284a"/></linearGradient><radialGradient id="bxlamp"><stop offset="0" stop-color="#ffd98a" stop-opacity=".75"/><stop offset="1" stop-color="#ffd98a" stop-opacity="0"/></radialGradient></defs>
    <rect width="640" height="260" fill="url(#bxsky)"/>${BX_NIGHT}
    <circle cx="540" cy="48" r="20" fill="#f4efd8"/><circle cx="548" cy="42" r="18" fill="#0a1226"/>
    <path d="M0 175 q60 -30 130 -6 t140 -4 t150 6 t140 -8 t80 4 V260 H0Z" fill="#0b1a14"/>
    <rect x="0" y="205" width="640" height="55" fill="#2a2d33"/><rect x="0" y="205" width="640" height="4" fill="#3b3f47"/>
    <g fill="#33363e">${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<rect x="${i * 90 + 6}" y="212" width="80" height="2"/>`).join('')}</g>
    <rect x="40" y="70" width="90" height="120" fill="#12151c"/><rect x="52" y="82" width="30" height="40" fill="#f2c26b" opacity=".85"/><rect x="90" y="82" width="30" height="40" fill="#f2c26b" opacity=".85"/><rect x="62" y="142" width="40" height="48" fill="#f2c26b" opacity=".6"/>
    <circle cx="395" cy="95" r="100" fill="url(#bxlamp)"/>
    <rect x="392" y="92" width="6" height="118" fill="#0a0c10"/><circle cx="395" cy="90" r="9" fill="#ffe7a8"/>
    <g fill="#1a110a"><rect x="300" y="170" width="150" height="10" rx="3"/><rect x="304" y="150" width="140" height="8" rx="3"/><rect x="310" y="180" width="8" height="30"/><rect x="432" y="180" width="8" height="30"/><rect x="304" y="150" width="6" height="30"/><rect x="438" y="150" width="6" height="30"/></g>
    <g class="breath" fill="#dbe7f5"><circle cx="268" cy="150" r="5"/><circle cx="280" cy="143" r="7"/><circle cx="296" cy="138" r="9"/></g>
  </svg>`;
}
function ballRender() {
  if (!BALL.active) return; const root = $('ballBody'); if (!root) return;
  const e = BALL.card[Math.min(BALL.idx, BALL.card.length - 1)], mom = BALL.moments;
  const head = `<div class="bx-head"><div><h2>The Ball</h2><div class="note">${esc(BALL.me.name)} · ${BALL.phase === 'results' ? 'the night is over' : 'dance ' + e.n + ' of ' + BALL.card.length} · looking ${ballLook()}${BALL.demo ? ' · demo ball, no shillings' : ''}</div></div><div class="bx-meters">${ballMetersHTML()}</div></div>`;
  const dots = '●'.repeat(mom) + '<span class="off">' + '●'.repeat(Math.max(0, 5 - mom)) + '</span>';
  const msg = BALL.msg ? `<div class="bx-msg">${esc(BALL.msg)}</div>` : '';
  let body = '';
  if (BALL.view === 'results') {
    const sat = BALL.card.filter(x => x.status === 'sat' || x.status === 'sick').length;
    root.innerHTML = `<div class="brand"><h1 style="font-size:clamp(32px,6vw,52px)">${esc(['Wallflower', 'A pleasant evening', 'A fine night', 'Belle of the ball'][bxClamp(Math.round(BALL.card.filter(x => x.status === 'danced').reduce((a, x) => a + x.stars, 0) / Math.max(1, BALL.card.filter(x => x.status === 'danced').length)), 0, 3)])}</h1><p>${esc(BALL.verdict)}</p></div>
      <div class="bx-cols"><div>${ballCardHTML()}</div><div><div class="results">${[['Ball score', BALL.total.toLocaleString('en-GB')], ['Dances', (BALL.left ? BALL.card.filter(x => x.status === 'danced').length : BALL.card.length - sat) + ' / ' + BALL.card.length], ['Turned down', BALL.rej], ['Overheated', BALL.overheats], ['Pride bonus', '+' + BALL.prideBonus], ['Shillings', '+' + BALL.coins]].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('')}</div>
      <p class="note" style="margin-top:10px">${BALL.newBest ? 'New best ball. ' : ''}Best ball ${(SAVE.bestBall || 0).toLocaleString('en-GB')}. Ball score is every dance plus triple waltz points plus your pride; sitting out costs 150, being sick 300.</p>
      <div class="menurow" style="margin-top:12px"><button class="btn" data-bx="again">Another ball</button><button class="btn ghost" data-bx="menu">Back to the hall</button></div></div></div>`;
    return;
  }
  if (BALL.view === 'waltz' && BW.wz3d) { // the waltz with a full-length 3D couple behind a transparent screen (see waltzScene3D)
    const w = BALL.w, pa = w.partner;
    root.innerHTML = `<canvas id="bxW" class="bx-wfull"></canvas><div class="bx-wui"><div class="lab">${w.practice ? 'Waltz practice (slow band, wide window)' : 'A waltz'} with ${esc(pa.name)}: press <kbd>Space</kbd> (or tap STEP) on the <b>ONE</b> as the ring closes on the gold circle</div><div class="menurow"><button class="btn brass" id="bxStep">STEP</button>${w.practice ? '<button class="btn ghost small" data-bx="wback">Stop practising</button>' : '<button class="btn ghost small" data-bx="leave">Leave the ball</button>'}</div></div><div id="bxRes" class="bx-wres" hidden></div>`;
    $('sBall').classList.add('bx-clear'); $('gl').classList.add('on');
    const cv = $('bxW'), st = $('bxStep'); cv.width = Math.max(320, Math.round(W)); cv.height = Math.max(240, Math.round(H));
    cv.addEventListener('pointerdown', ev => { ev.preventDefault(); waltzPress(); }); st.addEventListener('pointerdown', ev => { ev.preventDefault(); waltzPress(); });
    return;
  }
  if (BALL.view === 'waltz') {
    root.innerHTML = head + `<div class="bx-cols"><div>${ballCardHTML()}</div><div><div class="lab">A waltz with ${esc(BALL.w.partner.name)}: press <kbd>Space</kbd> (or tap) on the <b>ONE</b> as the ring closes on the gold circle</div><canvas id="bxW" class="bx-w" width="640" height="380"></canvas><div class="menurow" style="margin-top:10px"><button class="btn brass" id="bxStep">STEP</button></div></div></div>`;
    const cv = $('bxW'), st = $('bxStep'); cv.addEventListener('pointerdown', ev => { ev.preventDefault(); waltzPress(); }); st.addEventListener('pointerdown', ev => { ev.preventDefault(); waltzPress(); });
    return;
  }
  if (BALL.view === 'outside') {
    root.innerHTML = head + `<div class="bx-cols"><div>${ballCardHTML()}</div><div>${ballOutsideSVG()}<h3 class="bx-h3">Out on the terrace</h3><p class="note">The cold air hits like a glass of water. Your shirt stops sticking, the stars are out and the band sounds lovely through the glass.</p><div class="bx-chips"><span class="chip good">Heat −45</span><span class="chip good">Tipsy −12</span><span class="chip">Water −3</span><span class="chip">Pride +2</span></div><div class="bx-moments">Moments before the band strikes up: ${dots}</div><div class="menurow" style="margin-top:10px"><button class="btn brass" data-bx="back">${mom <= 0 ? 'Back inside: the band has started' : 'Back inside'}</button></div></div></div>`;
    return;
  }
  const tune = e.kind === 'waltz' ? 'A WALTZ' : esc(e.type) + ' · ' + esc(e.name);
  const sub = e.kind === 'waltz' ? 'The band strikes up a waltz: sixteen bars of 3/4. Press on the ONE.' : 'Your partner will be your first-position opposite for the whole dance.';
  let main = '';
  if (BALL.view === 'sit') {
    main = `<h3 class="bx-h3">${e.status === 'sick' ? 'Missing it' : 'Sitting it out'}</h3><div class="bx-msg">${esc(BALL.msg)}</div><div class="menurow"><button class="btn" data-bx="cont">${BALL.idx + 1 >= BALL.card.length ? 'See how the night went' : 'On to the next dance'}</button></div>`;
  } else if (BALL.view === 'ask') {
    const cs = ballCands();
    main = `<h3 class="bx-h3">Who will you ask?</h3><p class="note">Asking takes a moment. Mind how you look: warm, tipsy and out of step people hear no more often. ${esc(e.partner ? 'You already have ' + e.partner.name + '.' : '')}</p>
      <div class="bx-cands">${cs.map((c, i) => { const [ml, mc] = ballMood(c.p); return `<div class="bx-cand ${c.res || ''}"><canvas width="112" height="112" data-bp="${i}"></canvas><div class="nm">${esc(c.p.name)}</div><div class="mood ${mc}">${ml}${c.hint ? ' · checking ' + (c.p.kind === 'lady' ? 'her' : 'his') + ' card' : ''}</div>${c.res ? `<div class="res">${c.res === 'yes' ? 'Said yes' : 'Said no'}</div>` : `<button class="btn small" data-bx="ask" data-arg="${i}" ${mom <= 0 || e.partner ? 'disabled' : ''}>Ask to dance</button>`}</div>`; }).join('')}</div>
      <div class="menurow" style="margin-top:10px"><button class="btn ghost" data-bx="back">Back</button></div>`;
  } else if (BALL.view === 'bar') {
    main = `<h3 class="bx-h3">The bar</h3><p class="note">Free with your ticket (the committee's treat), but every drink takes a moment. Drink too much and you will wobble, get turned down, or worse.</p>
      <div class="bx-drinks">${Object.entries(DRINKS).map(([k, d]) => `<div class="bx-drink"><b>${d.name}</b><div class="chips">${d.hydr ? `<span class="chip ${d.hydr > 0 ? 'good' : 'bad'}">Water ${bxSign(d.hydr)}</span>` : ''}${d.heat ? `<span class="chip ${d.heat < 0 ? 'good' : 'bad'}">Heat ${bxSign(d.heat)}</span>` : ''}${d.drunk ? `<span class="chip ${d.drunk < 0 ? 'good' : 'bad'}">Tipsy ${bxSign(d.drunk)}</span>` : ''}${d.pride ? `<span class="chip good">Pride +${d.pride}</span>` : ''}${d.courage ? '<span class="chip warn">Flair ×1.5, sloppy turns</span>' : ''}</div><p>${d.blurb}</p><button class="btn small ${k === 'water' ? 'brass' : ''}" data-bx="drink" data-arg="${k}" ${mom <= 0 ? 'disabled' : ''}>Order</button></div>`).join('')}</div>
      <div class="menurow" style="margin-top:10px"><button class="btn ghost" data-bx="back">Back</button></div>`;
  } else {
    const p = e.partner;
    main = `<div class="bx-next"><div class="meta">Next</div><h3 class="bx-h3">No. ${e.n}: ${tune}</h3><p class="note">${sub}</p></div>
      <div class="bx-partner">${p ? `<canvas width="112" height="112" data-bp="p"></canvas><div><div class="nm">Dancing with ${esc(p.name)}</div><div class="note">Waiting by the set.</div></div>` : `<div class="note"><i>No partner yet.</i> Ask someone, or you will be watching from the bar.</div>`}</div>
      <div class="bx-moments">Moments before the band strikes up: ${dots}</div>${msg}
      <div class="menurow" style="margin-top:8px">
        <button class="btn ghost" data-bx="view" data-arg="ask" ${p || mom <= 0 ? 'disabled' : ''}>Ask someone</button>
        <button class="btn ghost" data-bx="view" data-arg="bar" ${mom <= 0 ? 'disabled' : ''}>The bar</button>
        <button class="btn ghost" data-bx="outside" ${mom <= 0 ? 'disabled' : ''}>Step outside <small>(2 moments, cools you down)</small></button>
        <button class="btn" data-bx="go">${BALL.sickNext ? 'The band strikes up' : p ? 'Take the floor' + (e.kind === 'waltz' ? ' for the waltz' : '') : mom <= 0 ? 'The band has struck up' : 'Sit this one out'}</button>
      </div>`;
  }
  root.innerHTML = head + `<div class="bx-cols"><div>${ballCardHTML()}</div><div>${BALL.view === 'ask' || BALL.view === 'bar' ? msg : ''}${main}</div></div>`;
  root.querySelectorAll('canvas[data-bp]').forEach(cv => { const k = cv.dataset.bp; try { drawPortrait(cv, k === 'p' ? e.partner : BALL.cands[+k].p); } catch (err) { } });
  if (BALL.auto) ballAutoSoon();
}
function ballAutoSoon() { if (BALL._at) return; BALL._at = setTimeout(() => { BALL._at = 0; ballAutoStep(); }, 30); }
function ballAutoStep() { // test hook: plays a whole ball (with demo dances if BALL.demo)
  if (!BALL.active || !BALL.auto || BALL.phase !== 'gap') return;
  const e = BALL.card[BALL.idx];
  if (BALL.view === 'outside' || BALL.view === 'bar' || BALL.view === 'ask') return ballAct('back');
  if (BALL.view === 'sit') return ballAct('cont');
  if (BALL.sickNext || BALL.moments <= 0) return ballGo();
  if (!e.partner) { BALL.view = 'ask'; const i = ballCands().findIndex(c => !c.asked); if (i >= 0) return ballAsk(i); return ballGo(); }
  if (BALL.heat > 70 && BALL.moments >= 2) return ballOutside();
  if (BALL.hydr < 45) return ballDrink('water');
  ballGo();
}
function ballAct(name, arg) {
  switch (name) {
    case 'start': newBall(false); ballGap(); break;
    case 'demo': newBall(true); ballGap(); break;
    case 'view': BALL.view = arg; if (arg === 'ask') ballCands(); ballRender(); break;
    case 'back': BALL.view = 'main'; ballRender(); break;
    case 'ask': ballAsk(+arg); break;
    case 'drink': ballDrink(arg); break;
    case 'outside': ballOutside(); break;
    case 'go': ballGo(); break;
    case 'cont': ballAdvance(''); break;
    case 'again': newBall(false); ballGap(); break;
    case 'menu': ballAbort(); game = null; showScreen('sMenu'); break;
    case 'leave': ballLeaveAsk(); break;
    case 'leaveyes': ballLeaveGo(); break;
    case 'leaveno': ballLeaveCancel(); break;
    case 'takefloor': bwTakeFloor(); break;
    case 'door': bwGoZone('hall'); break;
    case 'card': bwCardToggle(); break;
    case 'wpractice': waltzPractice(); break;
    case 'wagain': waltzPractice(true); break;
    case 'wback': waltzPracticeBack(); break;
  }
}
