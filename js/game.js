/* Reel Time · game.js
   Game state, input actions, scoring, tricks, the demo dancer and the shared animation state. */
"use strict";

/* ================= game state ================= */
const canvas = $('c'); let ctx = canvas.getContext('2d');
let W = 0, H = 0, DPR = 1;
function resize() { const r = canvas.getBoundingClientRect(); DPR = Math.min(2, window.devicePixelRatio || 1); W = r.width; H = r.height; canvas.width = Math.round(W * DPR); canvas.height = Math.round(H * DPR); if (R3.ready) { R3.renderer.setSize(W, H, false); R3.camera.aspect = W / Math.max(1, H); R3.camera.fov = R3.camera.aspect > 1.6 ? 50 : R3.camera.aspect > 1.2 ? 58 : 66; R3.camera.updateProjectionMatrix(); } } // wide phone screens get a narrower lens so people at the edges don't lean
window.addEventListener('resize', resize);

let game = null;
const keys = new Set();
let stick = { x: 0, y: 0 };
let mouseLook = 0, mouseLookUsed = false;

function castPeople(ch, me, partnerId) {
  // assign a real person (from the roster, then made-up guests) to every dancer
  const used = new Set([me.id]);
  const pool = { gent: SAVE.roster.filter(r => r.kind === 'gent' && r.id !== me.id), lady: SAVE.roster.filter(r => r.kind === 'lady' && r.id !== me.id) };
  const fillIdx = { gent: 0, lady: 0 };
  const guest = kind => { let n = FILL[kind][fillIdx[kind]++ % FILL[kind].length]; for (let k = 0; k < FILL[kind].length && used.has('g-' + n); k++) n = FILL[kind][fillIdx[kind]++ % FILL[kind].length]; used.add('g-' + n); const h = hashId(n); return { ...guestLook(hashId(n), kind), id: 'g-' + n, name: n, kind, skin: h % SKIN.length, hair: (h >>> 3) % HAIR.length, style: kind === 'gent' ? 'short' : ['long', 'bun'][h % 2], tartan: Object.keys(TARTANS)[h % 6], dress: (h >>> 5) % DRESS.length, height: kind === 'gent' ? 1.74 + (h % 14) / 100 : 1.6 + (h % 12) / 100, guest: true }; };
  const take = kind => { const p = pool[kind].find(r => !used.has(r.id)); if (p) { used.add(p.id); return p; } return guest(kind); };
  const ids = Object.keys(ch.tr);
  ch.meta.P.person = me;
  // partner first: whoever dances opposite you
  const partnerSlot = ids.find(id => id === 'M1' || id === 'W1') || 'R1';
  if (ch.meta[partnerSlot]) {
    const want = (partnerId && typeof partnerId === 'object') ? (partnerId.id !== me.id && partnerId.kind === ch.meta[partnerSlot].kind ? partnerId : null) : SAVE.roster.find(r => r.id === partnerId && r.id !== me.id && r.kind === ch.meta[partnerSlot].kind);
    if (want) { used.add(want.id); ch.meta[partnerSlot].person = want; } else ch.meta[partnerSlot].person = take(ch.meta[partnerSlot].kind);
  }
  // then the rest of your set (people nearest you get your friends first)
  { const p2 = window.__ballPartner2; if (p2 && ch.meta.L1 && !ch.meta.L1.person && p2.kind === ch.meta.L1.kind && !used.has(p2.id)) { used.add(p2.id); ch.meta.L1.person = p2; } } // Ball: the second partner of the Dashing White Sergeant
  const order = ids.filter(id => !ch.meta[id].person).sort((a, b) => dist(ch.at(a, 0), ch.at('P', 0)) - dist(ch.at(b, 0), ch.at('P', 0)));
  order.forEach(id => { ch.meta[id].person = take(ch.meta[id].kind); });
}

const INTRO = 2; // bars of count-in (honours)
function newGame(key, demo, practice) {
  const D = DANCES[key], diff = DIFFS[SAVE.diff];
  const me = meP();
  const ch = D.build(me.kind === 'lady');
  castPeople(ch, me, window.__ballPartner || SAVE.partner);
  if (ch.named) ch.named(); // captions that name the soloist (Eightsome)
  const total = practice ? (ch.practiceBars || D.bars || 32) : (ch.totalBars || D.times * (D.bars || 32));
  const barDur = 60 / (D.bpm * diff.speed * (practice ? 0.75 : 1));
  const start = ch.at('P', -INTRO);
  const u = me.upg, TS_ = trainStats(u, diff, effHeel(me));
  const g = {
    key, D, ch, total, barDur, demo: !!demo, practice: !!practice, diff, me,
    t: -INTRO, clock0: performance.now(), audio0: null, paused: false, pauseAt: 0,
    p: { x: start.x, y: start.y, vx: 0, vy: 0, spinT: -9, hop: -9, grip: null, gripE: null, yaw: null, phase: 0 },
    tr: TS_, tol: TS_.tol, heel: effHeel(me),
    gw: TS_.gw * (practice ? 1.5 : 1), pw: TS_.pw * (practice ? 1.5 : 1), sgw: TS_.sgw * (practice ? 1.5 : 1), spw: TS_.spw * (practice ? 1.5 : 1), reach: TS_.reach,
    emax: TS_.emax, energy: TS_.emax, regen: TS_.regen, costMul: TS_.costMul,
    flair: TS_.flair, fw: TS_.fw * (practice ? 1.4 : 1), fchain: 0, fchainT: -99, lastMove: null, mv: null, moveCool: {}, moveChecks: [], bowFig: -1,
    score: 0, combo: 0, maxCombo: 0,
    stats: { acc: 0, accN: 0, turnPts: 0, turnMax: 0, stepPts: 0, stepMax: 0, flair: 0, hooch: 0, twirl: 0, highcut: 0, wrong: 0, moves: 0, maxChain: 0 },
    pops: [], bubbles: [], lastHooch: -99, hoochPhrase: -1, drift: 0, lostShown: false,
    faces: {}, anim: {}, figAcc: {}, lastFig: -2, spoken: -1, done: false, cam: { x: 0, y: 0 }, pending: [], tw: null
  };
  // starting facing for first person: towards the middle of the set
  g.p.yaw = D.view === 'dws' ? -Math.PI / 2 : D.view === 'sq' ? Math.atan2(-start.y, -start.x) : (me.kind === 'lady' ? Math.PI : 0);
  // let go a beat before the turn's last bar ends, set a beat after the bar starts: room to do both
  g.ev = ch.ev.map(e => ({ ...e, graded: false, gripped: false, rel: e.type === 'turn' ? e.b1 - 0.3 : undefined, go: e.type === 'set' ? (e.goAt != null ? e.goAt : e.b0 + 0.3) : undefined }));
  g.ev.forEach(e => { if (e.type === 'turn') g.stats.turnMax += e.tap ? 300 : 800 + (e.rot >= 2 ? 180 * Math.floor(e.rot) : 0); if (e.type === 'set') g.stats.stepMax += 100; if (e.type === 'beats') g.stats.stepMax += 100 * e.beats.length; });
  g.figs = ch.figs.slice().sort((a, b) => a.b0 - b.b0);
  g.ev.forEach(e => { if (e.type === 'set') e.req = pickStep(g, e); }); // which set step the timing bar asks for
  if (demo) g.bot = buildBot(g);
  if (window.__ballGo) ballApply(g); // Ball mode: needs meters, partner and drunkenness hooks
  g.audio0 = band.play(D.tune, barDur, INTRO, total);
  game = g;
  if (SAVE.view === 'fp') init3D();
  showScreen(null);
  $('hud').hidden = false; $('topbtns').hidden = false; $('pauseOv').hidden = true; $('bPause').textContent = 'Pause'; $('touch').classList.add('play');
  setTouchButtons(g);
  $('hWho').textContent = (demo ? 'Demo · ' : practice ? 'Practice · ' : '') + me.name + ' · energy';
  updateKeysHint(); applyView();
  if (SAVE.view === 'fp') build3DGame(g);
  resize();
  if (!demo && !SAVE.tut3) {
    setPaused(true);
    $('pTitle').textContent = 'Before you take the floor';
    $('pBody').innerHTML = (SAVE.view === 'fp' ? 'You see through your own eyes and always face the way the dance goes. Walk the gold arrows on the floor to the see-through you; the minimap shows the whole set.' : 'Walk yourself round the gold arrows and keep inside the ring.') +
      ' In a circle hold <b>LEFT</b> for the eight steps to the left, then <b>RIGHT</b> for the eight steps back. Turns carry you while you hold TURN.<br><br><b>SET</b> (<kbd>Space</kbd>): press when the marker in the bar at the top is in the green. You step right, left, right and clap.<br><b>TURN</b> (<kbd>T</kbd>): hold it as the turn starts, then let go in the green to land your partner on their spot.<br><br><kbd>H</kbd> hooch at the end of a phrase · <kbd>V</kbd> switch view · <kbd>P</kbd> pause.';
    $('bResume').textContent = 'Start dancing';
    SAVE.tut3 = true; persist();
  }
}

// The way the dance wants you to face: your partner in a turn or a set, the middle of a circle,
// forwards in advance and retire, otherwise along your path.
function desiredFace(g, id, t) {
  if (g.hug && g.hug.face[id] != null) return g.hug.face[id]; // the end-of-dance hug (see THE HUG block)
  const ch = g.ch, isP = id === 'P';
  const pos = isP ? g.p : npc(g, id, t);
  const at = q => Math.atan2(q.y - pos.y, q.x - pos.x);
  const turn = ch.links.find(l => !l.ring && (l.a === id || l.b === id) && t >= l.b0 - 0.25 && t <= l.b1 + 0.05);
  if (turn) { const o = turn.a === id ? turn.b : turn.a; if (!isP || g.p.gripE || t < turn.b0) return at(npc(g, o, t)); }
  const st = ch.sets.find(s => s.id === id && t >= s.b0 - 0.35 && t < s.b1 + 0.05);
  if (st && st.toward) return at(npc(g, st.toward, t));
  const ring = ch.links.find(l => l.ring && l.ring.includes(id) && t >= l.b0 - 0.3 && t <= l.b1 + 0.3);
  if (ring && !ring.star) { let cx = 0, cy = 0; ring.ring.forEach(r => { const q = ch.at(r, t); cx += q.x; cy += q.y; }); return at({ x: cx / ring.ring.length, y: cy / ring.ring.length }); }
  if (ring && ring.wheel) { const a0 = ch.at(id, t), a1 = ch.at(id, t + 0.2), m0 = ch.at(ring.mate[id], t), fw = Math.atan2(a1.y - a0.y, a1.x - a0.x), tp = Math.atan2(m0.y - a0.y, m0.x - a0.x); return fw + angDiff(fw, tp) * 0.6; } // the teapots: walking round, a glance at your partner
  const f = g.figs.find(f => t >= f.b0 && t < f.b1);
  if (f && /^All advance/.test(f.name)) return pos.x < 0 ? 0 : Math.PI; // across the set to your partner
  if (f && /^(Advance|Retire)/.test(f.name)) return ch.meta[id].trio === 'us' || isP ? -Math.PI / 2 : Math.PI / 2;
  const a = ch.at(id, t), b = ch.at(id, t + 0.2);
  if (dist(a, b) > 0.03) return Math.atan2(b.y - a.y, b.x - a.x);
  const c = ch.at(id, t + 0.7);
  if (dist(a, c) > 0.06) return Math.atan2(c.y - a.y, c.x - a.x);
  if (ch.stand) { const sa = ch.stand(id, ch.at(id, t)); if (sa != null) return sa; } // a dance that says how its dancers stand (the Foursome Reel's line)
  if (g.D.view === 'sq') return at({ x: 0, y: 0 }); // round a ring: face the middle when standing
  if (st) return null;
  return null;
}
// "Trace the shape": you move on when your finger or mouse moves the same way the figure goes.
let pointerHold = false, traceAcc = { x: 0, y: 0 };
function traceGo(g, r, q0, q1, dtB) {
  const dx = traceAcc.x, dy = traceAcc.y; traceAcc = { x: 0, y: 0 };
  // compare with where the path is heading now and just after, so sharp corners and reversals don't stall you
  const dirAt = (a, b) => { let tx = b.x - a.x, ty = b.y - a.y; const tl = Math.hypot(tx, ty) || 1; tx /= tl; ty /= tl;
    if (SAVE.view === 'fp') { const yaw = g.p.baseYaw || 0; const rx = Math.cos(yaw) * tx + Math.sin(yaw) * ty, ry = -Math.sin(yaw) * tx + Math.cos(yaw) * ty; return [ry, -rx]; } // screen right/up relative to where you face
    return [tx, ty]; };
  const qa = g.ch.at('P', r.tt + 0.2), qb = g.ch.at('P', r.tt + 0.4);
  const dirs = [dirAt(q0, qa), dirAt(qa, qb)];
  const len = Math.hypot(dx, dy);
  const along = Math.max(...dirs.map(([tx, ty]) => dx * tx + dy * ty));
  const tr = g.trace || (g.trace = { v: 0 });
  const want = 70 * Math.max(dtB, 1e-3); // a comfortable drawing speed, in px per bar of dance
  const match = len > 0.5 ? clamp(along / len, -1, 1) : 0;
  tr.v = lerp(tr.v, len > 0.5 && match > 0.5 ? clamp(along / want, 0, 1.4) : 0, 0.35);
  return tr.v;
}
// Holding hands carries you: in a circle, in a turn while you hold on, and on the spot while you set.
function carried(g, t) {
  const ch = g.ch, p = g.p;
  if (p.gripE && t >= p.gripE.b0 - 0.15 && t <= p.gripE.b1 + 0.02) return true;
  if (g.carryUntil && t <= g.carryUntil + 0.02) return true;
  if (ch.sets.some(s => s.id === 'P' && t >= s.b0 && t < s.b1)) return true;
  return false;
}
function nowBars(g) {
  if (g.paused) return g.t;
  if (g.audio0 != null && band.running()) return (band.ctx.currentTime - g.audio0 - (SAVE.lag || 0) / 1000) / g.barDur; // with headphones you hear it late, so the game waits for your ears
  const ts = window.__TS || 1;
  return -INTRO + ((performance.now() - g.clock0) / 1000 * ts) / g.barDur;
}
function setPaused(v) {
  const g = game; if (!g || g.done || g.paused === v) return;
  g.paused = v;
  if (v) { g.pauseAt = performance.now(); try { band.ctx && band.ctx.suspend(); } catch (e) { } try { speechSynthesis.cancel(); } catch (e) { } }
  else { g.clock0 += performance.now() - g.pauseAt; try { band.ctx && band.ctx.resume(); } catch (e) { } }
  $('pauseOv').hidden = !v; $('bPause').textContent = v ? 'Resume' : 'Pause';
  if (v) { $('pTitle').textContent = 'Paused'; $('pBody').textContent = 'The band has stopped. Press P to carry on.'; $('bResume').textContent = 'Carry on dancing'; }
}

function comboMult(g) { return Math.min(3, 1 + Math.floor(g.combo / 6) * 0.25) * g.diff.mult; }
function pop(g, text, color) { g.pops.push({ text, color: color || '#f0e8d8', t: performance.now() }); if (g.pops.length > 4) g.pops.shift(); }
function award(g, pts, text, color, keepCombo = true) {
  const v = Math.round(pts * comboMult(g)); g.score += v;
  if (keepCombo) { g.combo++; g.maxCombo = Math.max(g.maxCombo, g.combo); }
  pop(g, text + (v > 0 ? '  +' + v : ''), color);
  return v;
}
function penalty(g, pts, text) { g.score = Math.max(0, g.score - pts); g.combo = 0; pop(g, text + (pts ? '  −' + pts : ''), '#ef6a5e'); band.blip(180, 0.15, 0.1); }

/* ---------- input actions ---------- */
function handState(g) { return keys.has('KeyQ') || keys.has('KeyE') || keys.has('KeyT') ? 'AUTO' : null; } // one TURN button: the dance picks the hand
// where a dancer actually is: their place in the dance, nudged by a bad release or dragged by you hanging on
function npc(g, id, t) {
  if (id === 'P') return g.p;
  if (g.hug && g.hug.pos[id]) return g.hug.pos[id]; // the end-of-dance hug
  if (g.tether && g.tether.id === id) return { x: g.p.x + g.tether.rel.x, y: g.p.y + g.tether.rel.y };
  const q = g.ch.at(id, t), o = g.off && g.off[id];
  if (!o) return q;
  const u = (t - o.t0) / o.dur;
  if (u >= 1 || u < 0) { if (u >= 1) delete g.off[id]; return q; }
  const k = o.grow ? (u < 0.18 ? smooth(u / 0.18) : 1 - smooth((u - 0.18) / 0.82)) : 1 - smooth(u);
  return { x: q.x + o.x * k, y: q.y + o.y * k };
}
function onHandDown(g) {
  const t = g.t; let hs = handState(g); const ge = g.p.gripE; if (ge && ge.tap && t >= ge.rel) { g.p.gripE = null; g.p.grip = null; ge.graded = true; g.carryUntil = ge.b1; } // a chain half turn has finished
  if (!hs || g.p.gripE) return;
  const gwB = g.gw / g.barDur, pwB = g.pw / g.barDur;
  const e = g.ev.find(e => e.type === 'turn' && !e.gripped && !e.graded && t >= e.b0 - (e.tap ? 0.55 : 1.0) && t <= e.b0 + (e.b1 - e.b0) * 0.6);
  if (!e) return;
  if (hs === 'AUTO') hs = e.hand;
  if (e.hand === 'B' && hs !== 'B') return; // waiting for the other hand
  if (e.hand !== hs) { g.stats.wrong++; penalty(g, 60, e.hand === 'B' ? 'Two hands! Use TURN' : 'Wrong arm!'); return; }
  const q = g.ch.at(e.with, t);
  // you must be roughly where the dance puts you to reach them (turns often start a step apart)
  if (dist(g.p, q) > dist(g.ch.at('P', t), q) + g.reach + (e.tap ? 0.9 : 0)) /* chain hands are met on the move: a generous reach */ { pop(g, 'Too far away to reach', '#f0b54a'); return; }
  const d = t - e.b0; // holding on before the turn starts is fine
  e.gripped = true; g.p.gripE = e; g.p.grip = hs;
  let pts;
  if (d <= pwB * 1.5) { pts = 300; award(g, 300, 'Hands joined', '#e2b45c'); band.blip(880); }
  else if (d <= 0.5) { pts = 170; award(g, 170, 'Caught it', '#7fd08a'); band.blip(660); }
  else { pts = 60; award(g, 60, 'Late hands', '#f0b54a', false); }
  g.stats.turnPts += pts;
}
function onHandUp(g) {
  const e = g.p.gripE; if (!e || e.tap) return; // a tap (grand chain half turn) lets go by itself
  const hs = handState(g);
  if (hs === 'AUTO' || (e.hand === 'B' ? hs === 'B' : hs === e.hand)) return;
  releaseTurn(g, e, g.t);
}
// Long spins (two or more turns): each full circle completed while you hold on scores 120, +60 if you are still on the ring (in time).
function spinRevs(g, e, t, final) {
  const u = clamp((t - e.b0) / (e.b1 - e.b0), 0, 1), fr = e.rot * spinEase(u, e.rot), nr = Math.floor(e.rot);
  const done = final ? nr : Math.min(nr, Math.floor(fr + 0.15)); // a circle counts a little before its last step; a clean let-go banks the rest
  if (e.revDone == null) e.revDone = final ? 0 : done; // hands joined part-way through: only the circles still to come count
  while (e.revDone < done) {
    e.revDone++;
    const tight = dist(g.p, g.ch.at('P', t)) <= g.tol * 1.5;
    award(g, 120 + (tight ? 60 : 0), 'Round ' + e.revDone + ' of ' + nr + (tight ? ' (in time)' : ''), tight ? '#e2b45c' : '#7fd08a', tight);
    g.stats.turnPts += 120 + (tight ? 60 : 0); band.blip(700 + 90 * e.revDone, 0.07, 0.08);
  }
}
function releaseTurn(g, e, t) {
  const gwB = g.gw / g.barDur, pwB = g.pw / g.barDur;
  const d = t - e.rel + (g.ball ? ballJitter(1) : 0); // Ball: a drunk hand is a noisy hand
  if (e.rot >= 2 && d >= -gwB) spinRevs(g, e, Math.min(t, e.b1), true); // held to the end of the spin and let go on time or late: the last circles count
  g.p.gripE = null; g.p.grip = null; e.graded = true;
  if (Math.abs(d) <= gwB) g.carryUntil = e.b1; // on time: you both glide into place
  let pts = 0;
  if (Math.abs(d) <= pwB) { pts = 300; award(g, 300, 'Perfect release', '#e2b45c'); band.blip(990); }
  else if (Math.abs(d) <= gwB) { pts = 170; award(g, 170, 'Good release', '#7fd08a'); band.blip(740); }
  else if (d < 0) penalty(g, 50, 'Let go early!');
  else penalty(g, 50, 'Clung on!');
  g.stats.turnPts += pts;
  // what happens to the person you let go of
  const w = e.with, name = (g.ch.meta[w].person || {}).name || 'Your partner';
  g.off = g.off || {};
  if (g.tether && g.tether.id === w) {
    const held = npc(g, w, t), q = g.ch.at(w, t); g.tether = null;
    g.off[w] = { x: held.x - q.x, y: held.y - q.y, t0: t, dur: 2.2, grow: false };
    pop(g, name + ' dragged out of place', '#ef6a5e');
  } else if (d < -gwB) {
    const a = g.ch.at(w, t - 0.05), b = g.ch.at(w, t + 0.05); const vx = b.x - a.x, vy = b.y - a.y, l = Math.hypot(vx, vy) || 1;
    const m = Math.min(0.95, 0.3 + Math.abs(d) * 1.2);
    g.off[w] = { x: vx / l * m, y: vy / l * m, t0: t, dur: 2.4, grow: true };
    pop(g, name + ' spins off past their place', '#ef6a5e');
  } else if (pts) { g.score += Math.round(100 * comboMult(g)); pop(g, name + ' lands in place  +' + Math.round(100 * comboMult(g)), '#7fd08a'); }
  g.pending.push({ t: Math.max(t, e.b1) + 0.5 });
}
function onBeat(g) {
  const t = g.t, win = g.sgw / g.barDur * 1.3, pwin = g.spw / g.barDur * 1.3;
  const e = g.ev.find(e => e.type === 'beats' && t >= e.b0 - 0.3 && t <= e.b1 + 0.2);
  if (!e) return false;
  let best = null, bd = 9; e.beats.forEach(b => { if (!b.hit && !b.miss) { const d = Math.abs(t - b.t); if (d < bd) { bd = d; best = b; } } });
  const clap = e.kind === 'clap';
  if (clap) g.p.clapT = performance.now(); else g.p.stompT = performance.now();
  if (clap) band.clap(0.3); else band.stomp(0.5);
  if (!best || bd > win) { g.combo = 0; pop(g, clap ? 'Clap off the beat' : 'Stomp off the beat', '#f0b54a'); return true; }
  best.hit = true; const perfect = bd <= pwin;
  g.stats.stepPts += perfect ? 100 : 60;
  award(g, perfect ? 150 : 80, clap ? (perfect ? 'Perfect clap' : 'Clap') : (perfect ? 'Perfect stomp' : 'Stomp'), perfect ? '#e2b45c' : '#7fd08a');
  return true;
}
// Set steps: the timing bar asks for one of the steps you have learned; the matching key scores, the wrong one costs a little.
const SETSTEPS = {
  pdb: { name: 'Pas de basque', key: 'Space', code: 'Space', mult: 1, energy: 0 },
  highcut: { name: 'High cut', key: 'F', code: 'KeyF', mult: 1.85, energy: 35, trick: 'highcut', text: 'HIGH CUT!', col: '#8e7cc3', blip: 1320 },
  fling: { name: 'Highland fling', key: 'G', code: 'KeyG', mult: 1.5, energy: 25, trick: 'fling', text: 'FLING!', col: '#d98a4a', blip: 1180 },
  heeltoe: { name: 'Heel and toe', key: 'J', code: 'KeyJ', mult: 1.3, energy: 15, trick: 'heeltoe', text: 'HEEL & TOE!', col: '#e0c46a', blip: 1040 },
  heli: { name: 'Helicopter', key: 'B', code: 'KeyB', mult: 2.4, energy: 45, trick: 'heli', text: 'HELICOPTER!', col: '#7fd0e0', blip: 1500, alt: true }
};
const STEP_LABEL = { pdb: 'SET: pas de basque (Space)', highcut: 'HIGH CUT (F)', fling: 'FLING (G)', heeltoe: 'HEEL AND TOE (J)' };
Object.assign(TRICKS, {
  fling: { name: 'Highland fling', key: 'G', code: 'KeyG', desc: 'A Highland fling step: arms up, one foot behind. Press G when the timing bar asks for FLING. Scores 1.5 times a plain set.', cost: 120 },
  heeltoe: { name: 'Heel and toe', key: 'J', code: 'KeyJ', desc: 'The heel-and-toe setting step. Press J when the bar asks for HEEL AND TOE. Scores 1.3 times a plain set.', cost: 90 },
  heli: { name: 'Helicopter', key: 'B', code: 'KeyB', desc: 'Spin fast with your arms straight out: mid-phrase, instead of a set (2.4 times), or in the centre of the Eightsome Reel (two full turns).', cost: 200 }
});
function stepsOpen() { return Object.keys(SETSTEPS).filter(k => !SETSTEPS[k].alt && (!SETSTEPS[k].trick || SAVE.tricks[SETSTEPS[k].trick])); }
function pickStep(g, e) { const o = stepsOpen(); return o.length === 1 ? o[0] : o[hashId(g.key + ':' + e.b0) % o.length]; }
function npcStep(g, id, b0) {
  const pe = g.ev.find(e => e.type === 'set' && e.b0 === b0); if (pe && pe.req) return pe.req; // your partner does the same step as you
  const h = hashId(id + '|' + b0) % 8; return h < 4 ? 'pdb' : h === 4 ? 'highcut' : h < 7 ? 'fling' : 'heeltoe';
}
function onStep(g, kind) {
  const t = g.t; if (kind === true) kind = 'highcut'; if (!kind) kind = 'pdb';
  const S = SETSTEPS[kind], fancy = kind !== 'pdb';
  if (!fancy && onBeat(g)) return true;
  const e = g.ev.find(e => e.type === 'set' && !e.pressed && !e.missed && t >= e.go - 0.75 && t <= e.go + 0.6);
  if (!e) return false;
  const req = e.req || 'pdb';
  if (kind !== req && kind !== 'heli') { g.stats.wrong++; penalty(g, 40, 'Wrong step! ' + STEP_LABEL[req]); return false; }
  const gwB = g.sgw / g.barDur * (e.wide || 1), pwB = g.spw / g.barDur * (e.wide || 1);
  const d = t - e.go + (g.ball ? ballJitter(0.5) : 0);
  if (d < -gwB * 2) { g.combo = 0; pop(g, 'Too early, wait for the green', '#f0b54a'); return false; }
  const cost = S.energy * g.costMul, tired = fancy && g.energy < cost; // too tired for the fancy step: it still counts, as a plain one
  e.pressed = t; e.did = tired ? 'pdb' : kind; e.beats.forEach(b => b.hit = true);
  const q = Math.abs(d) <= pwB ? 2 : Math.abs(d) <= gwB ? 1 : 0;
  e.quality = q;
  g.stats.stepPts += [30, 70, 100][q];
  g.p.hop = performance.now();
  if (!fancy || tired) {
    if (tired) pop(g, 'Out of puff: plain step', '#a7b6ad');
    if (q === 2) award(g, 240, 'Perfect set', '#e2b45c'); else if (q === 1) award(g, 140, 'Good set', '#7fd08a'); else award(g, 40, d < 0 ? 'Early set' : 'Late set', '#f0b54a', false);
    band.blip([700, 900, 1180][q], 0.05, 0.08);
    return true;
  }
  g.energy -= cost; g.stats[kind] = (g.stats[kind] || 0) + 1;
  const v = award(g, [40, 140, 240][q] * S.mult * g.flair, S.text + (q === 2 ? ' (perfect)' : ''), S.col, q > 0); g.stats.flair += v; band.blip(S.blip, 0.12, 0.12);
  if (kind === 'heli') startHeli(g, 1);
  return { perfect: q === 2 };
}
function onFancyStep(g, kind) {
  const S = SETSTEPS[kind];
  if (S.trick && !SAVE.tricks[S.trick]) { pop(g, 'Learn ' + S.name + ' at the outfitter', '#a7b6ad'); return; }
  if (!onStep(g, kind) && !g.ev.some(e => e.type === 'set' && !e.pressed && !e.missed && g.t >= e.go - 0.75 && g.t <= e.go + 0.6)) { pop(g, S.name + ': nothing to set to just now', '#a7b6ad'); }
}
// The helicopter: spin fast with your arms straight out. It scores in the middle of the Eightsome, instead of a set, or mid-phrase.
function startHeli(g, n) { g.heli = { t0: g.t, t1: g.t + n * 1.0, n }; g.p.hop = performance.now(); }
function heliAng(g, id, t) {
  let h = null, a0 = 0, a1 = 0, n = 1;
  if (id === 'P') { if (g.heli && t >= g.heli.t0 && t <= g.heli.t1) { h = g.heli; a0 = h.t0; a1 = h.t1; n = h.n; } }
  else { h = (g.ch.helis || []).find(x => x.id === id && t >= x.b0 && t <= x.b1); if (h) { a0 = h.b0; a1 = h.b1; n = h.n; } }
  if (!h) return null;
  const u = (t - a0) / (a1 - a0); return smooth(clamp(u, 0, 1)) * n * TAU;
}
function onHeli(g) {
  if (!SAVE.tricks.heli) { pop(g, 'Learn the Helicopter at the outfitter', '#a7b6ad'); return; }
  const t = g.t; if (t < 0.5 || (g.heli && t < g.heli.t1)) return;
  if (g.p.gripE) { pop(g, 'Let go of hands first', '#a7b6ad'); return; }
  const cw = (g.ch.helis || []).find(h => h.id === 'P' && !h.used && t >= h.b0 - 0.3 && t <= h.b1);
  const se = g.ev.find(e => e.type === 'set' && !e.pressed && !e.missed && t >= e.go - 0.75 && t <= e.go + 0.6);
  const ph = Math.floor(t / 8), pr = t % 8, inPhrase = pr >= 3.4 && pr <= 4.6 && g.heliPh !== ph;
  const cost = SETSTEPS.heli.energy * g.costMul;
  if (cw || (!se && inPhrase)) {
    if (g.energy < cost) { pop(g, 'Out of puff', '#a7b6ad'); return; }
    g.energy -= cost; g.stats.heli = (g.stats.heli || 0) + 1;
    if (cw) { cw.used = true; startHeli(g, cw.n); } else { g.heliPh = ph; startHeli(g, 1); }
    const v = award(g, (cw ? 700 : 320) * g.flair, cw ? 'HELICOPTER! centre of the ring' : 'HELICOPTER!', SETSTEPS.heli.col); g.stats.flair += v; band.blip(1500, 0.14, 0.12); band.whoop(g.me.kind === 'lady' ? 1.35 : 1, 0.1);
    return;
  }
  if (se) { onStep(g, 'heli'); return; }
  pop(g, 'Helicopter: wait for mid-phrase, or when the others set', '#a7b6ad');
}
function onHooch(g) {
  const t = g.t; if (t < 0.5) return;
  if (g.energy < 10 * g.costMul) { pop(g, 'Out of puff', '#a7b6ad'); return; }
  g.energy -= 10 * g.costMul;
  g.bubbles.push({ id: 'P', text: 'Hooch!', t: performance.now() }); humanHooch({ kind: g.me.kind, person: g.me, vol: 0.2, excite: 0.5 });
  const phrase = Math.round(t / 8);
  const near = Math.abs(t - phrase * 8) <= 0.45 && phrase > 0;
  if (t - g.lastHooch < 2) { g.lastHooch = t; penalty(g, 40, 'Calm down!'); return; }
  g.lastHooch = t;
  if (near && g.hoochPhrase !== phrase) { g.hoochPhrase = phrase; g.stats.hooch++; const v = award(g, 250 * g.flair, 'HOOCH!', '#cf3d3a'); g.stats.flair += v; band.blip(520, 0.2, 0.14); }
  else pop(g, 'Hooch?', '#a7b6ad');
}
function spinChance(g) {
  const e = g.p.gripE; if (!e || g.spinU && g.spinU.e === e) return null;
  const meK = g.ch.meta.P.kind, otK = g.ch.meta[e.with].kind; if (meK === otK) return null;
  const len = e.b1 - e.b0, t = g.t;
  return { e, ok: t >= e.b0 + len * 0.3 && t <= e.rel - 0.5, lady: meK === 'lady' };
}
function onTwirl(g) {
  const sc = spinChance(g);
  if (sc) {
    if (!sc.ok) { pop(g, 'Spin her in the middle of the turn', '#a7b6ad'); return; }
    const t = g.t, e = sc.e;
    g.spinU = { e, t0: t, t1: Math.min(t + 1.0, e.rel - 0.1), who: sc.lady ? 'P' : e.with, lead: sc.lady ? e.with : 'P' };
    const v = award(g, 350 * g.flair, sc.lady ? 'Spun under his arm!' : 'Spun her under!', '#8e7cc3'); g.stats.flair += v; band.blip(780, 0.15, 0.1);
    return;
  }
  if (!SAVE.tricks.twirl) { pop(g, 'Learn Twirl at the outfitter', '#a7b6ad'); return; }
  const t = g.t; if (t < 0 || performance.now() - g.p.spinT < 700) return;
  if (g.energy < 30 * g.costMul) { pop(g, 'Out of puff', '#a7b6ad'); return; }
  g.energy -= 30 * g.costMul; g.p.spinT = performance.now();
  if (g.p.gripE) { const e = g.p.gripE; g.p.gripE = null; g.p.grip = null; e.graded = true; penalty(g, 120, 'Spun out of the hold!'); return; }
  const travel = g.ev.find(e => e.type === 'travel' && t >= e.b0 && t <= e.b1 - 0.6);
  g.tw = { t1: t + 0.6, acc: 0, n: 0, ok: !!travel };
}
function onHighCut(g) { onFancyStep(g, 'highcut'); }

/* ---------- new moves: clap, spring, heel click, pirouette, bow (all from the TRICKS table) ---------- */
// The flair pulse is a window around every 2nd bar line. d = seconds from the nearest pulse.
function flairD(g, t) { const k = Math.max(0, Math.round(t / 2) * 2); return { k, d: (t - k) * g.barDur }; }
const MOVE_BARS = { clap: 0.4, leap: 0.45, heel: 0.35, pirouette: 0.95, bow: 0.8 }; // how long each move lasts, in bars
function moveByCode(code) { for (const k in TRICKS) if (TRICKS[k].move && TRICKS[k].code === code) return k; return null; }
// where we are in the current move: { k, u: 0..1 } or null (drives the 2D and 3D animation)
function mvState(g) { const m = g.mv; if (!m) return null; const u = (g.t - m.tb0) / m.durB; return u >= 0 && u < 1 ? { k: m.k, u, perfect: m.perfect } : null; }
function moveAward(g, k, pts, text, color) {
  const chainOk = g.t - g.fchainT <= 4;
  if (chainOk && g.lastMove !== k) g.fchain++; else if (!chainOk) g.fchain = 1;
  g.lastMove = k; g.fchainT = g.t; g.stats.maxChain = Math.max(g.stats.maxChain, g.fchain);
  const cm = 1 + 0.15 * Math.min(6, Math.max(0, g.fchain - 1));
  const v = award(g, pts * g.flair * cm, text + (g.fchain > 1 ? '  chain ×' + g.fchain : ''), color); g.stats.flair += v; g.stats.moves++;
  return v;
}
function moveMiss(g, text) { g.combo = 0; g.fchain = 0; pop(g, text, '#f0b54a'); }
function onMove(g, k) {
  const tr = TRICKS[k], t = g.t;
  if (!SAVE.tricks[k]) { pop(g, 'Learn ' + tr.name + ' at the outfitter', '#a7b6ad'); return; }
  if (t < 0) return;
  if (g.mv && g.t < g.mv.tb0 + g.mv.durB * 0.8 && !(g.mv.k === 'heel' && k === 'heel')) return; // mid-move
  if (k !== 'bow' && k !== 'heel' && g.p.gripE) { pop(g, 'Let go of hands first', '#a7b6ad'); return; }
  if (k === 'pirouette' && g.tw) return;
  const cost = tr.energy * g.costMul;
  if (g.energy < cost) { pop(g, 'Out of puff', '#a7b6ad'); return; }
  const target = g.ch.at('P', t), dd = dist(g.p, target), onFig = dd <= g.tol * 1.6;
  const start = (perfect) => { g.mv = { k, tb0: t, durB: MOVE_BARS[k], perfect: !!perfect, worst: 0 }; };
  if (tr.win === 'flair') {
    const f = flairD(g, t), ad = Math.abs(f.d);
    if (ad > g.fw) { g.energy -= cost * 0.5; start(false); moveMiss(g, tr.name + ' off the pulse (' + (f.d < 0 ? 'early' : 'late') + ')'); return; }
    g.energy -= cost; const perfect = ad <= g.fw * 0.45; start(perfect);
    const mult = onFig ? 1 : 0.5, tag = perfect ? ' (perfect)' : '';
    if (k === 'clap') { band.clap(0.34); band.clap(0.2, 0.03); moveAward(g, k, tr.pts * (perfect ? 1.4 : 1) * mult, onFig ? 'HANDS UP!' + tag : 'Clap (off the figure)', '#e2b45c'); }
    else if (k === 'leap') { g.p.hop = performance.now(); band.blip(1040, 0.1, 0.1); moveAward(g, k, tr.pts * (perfect ? 1.4 : 1) * mult, onFig ? 'SPRING!' + tag : 'Spring (off the figure)', '#7fd0e0'); g.moveChecks.push({ t: t + g.mv.durB, k: 'leap' }); }
    else if (k === 'pirouette') { g.moveChecks.push({ t: t + g.mv.durB, k: 'pirouette', perfect }); band.blip(880, 0.12, 0.08); }
    return;
  }
  if (tr.win === 'beat') {
    const b = Math.round(t * 2) / 2, d = (t - b) * g.barDur, win = g.fw * 0.6;
    if (g.moveCool.heel === b) { return; }
    if (Math.abs(d) > win || b <= 0) { g.energy -= cost * 0.5; start(false); moveMiss(g, 'Heel click off the beat'); return; }
    g.moveCool.heel = b; g.energy -= cost; const perfect = Math.abs(d) <= win * 0.4; start(perfect);
    band.stomp(0.3); band.blip(1500, 0.04, 0.08);
    if (!onFig) { moveMiss(g, 'Heel click: get back on the figure'); return; }
    moveAward(g, k, tr.pts * (perfect ? 1.5 : 1), perfect ? 'HEEL CLICK!' : 'Heel click', '#e08a4a');
    return;
  }
  if (tr.win === 'figend') {
    const fi = g.figs.findIndex(f => t >= f.b1 - 0.9 && t <= f.b1 + 0.35);
    if (fi < 0) { pop(g, 'Bow as a figure ends', '#a7b6ad'); return; }
    if (g.bowFig === fi) { pop(g, 'Already bowed this figure', '#a7b6ad'); return; }
    g.bowFig = fi; g.energy -= cost; const f = g.figs[fi], fa = g.figAcc[fi], clean = fa && fa.n ? clamp(fa.a / fa.n, 0, 1) : 0.5;
    const perfect = Math.abs(t - f.b1) <= 0.45; start(perfect);
    g.energy = Math.min(g.emax, g.energy + 10);
    const pts = (tr.pts + 250 * clean * clean) * (perfect ? 1 : 0.6);
    band.blip(660, 0.2, 0.08); band.blip(990, 0.3, 0.06);
    moveAward(g, k, pts, (g.me.kind === 'lady' ? 'CURTSEY' : 'BOW') + ' · ' + Math.round(clean * 100) + '% clean', '#e2b45c');
  }
}
// moves that are judged when they finish (landing, staying in the ring through a spin)
function runMoveChecks(g, t) {
  g.moveChecks = g.moveChecks.filter(c => {
    if (t < c.t) return true;
    const dd = dist(g.p, g.ch.at('P', t));
    if (c.k === 'leap') { if (dd <= g.tol * 1.2) { const v = award(g, 100 * g.flair, 'Stuck the landing', '#7fd08a'); g.stats.flair += v; band.stomp(0.35); } else { g.combo = 0; pop(g, 'Landed off the ring', '#f0b54a'); } }
    else if (c.k === 'pirouette') {
      const worst = Math.max(g.mv ? g.mv.worst : 0, dd);
      if (worst <= g.tol * 1.4) moveAward(g, 'pirouette', TRICKS.pirouette.pts * (c.perfect ? 1.4 : 1), c.perfect ? 'PIROUETTE! (perfect)' : 'PIROUETTE!', '#8e7cc3');
      else moveMiss(g, 'Wobbly pirouette');
    }
    return false;
  });
  if (g.mv && g.mv.k === 'pirouette') g.mv.worst = Math.max(g.mv.worst, dist(g.p, g.ch.at('P', t)));
}

/* ---------- demo dancer ---------- */
function buildBot(g) {
  const acts = []; let lastRel = -99; // back-to-back turns: let go of the last hand before reaching for the next
  g.ev.slice().sort((a, b) => a.b0 - b.b0).forEach(e => {
    if (e.type === 'set') acts.push({ t: e.go, k: (SAVE.tricks.heli && Math.random() < 0.3) ? 'KeyB' : SETSTEPS[e.req || 'pdb'].code });
    if (e.type === 'turn') {
      const ks = ['KeyT'];
      ks.forEach(k => { acts.push({ t: Math.max(e.b0 - 0.1, lastRel + 0.05), k, down: true }); acts.push({ t: e.rel, k, up: true }); }); lastRel = e.rel;
    }
    if (e.type === 'travel' && SAVE.tricks.twirl && e.b1 - e.b0 >= 4) acts.push({ t: e.b0 + 1.5, k: 'KeyR' });
    if (e.type === 'turn' && g.ch.meta[e.with] && g.ch.meta[e.with].kind !== g.ch.meta.P.kind && e.b1 - e.b0 >= 2) acts.push({ t: e.b0 + (e.b1 - e.b0) * 0.4, k: 'KeyR' });
    if (e.type === 'beats') e.beats.forEach(b => acts.push({ t: b.t, k: 'Space' }));
  });
  for (let p = 8; p <= g.total; p += 8) if (Math.random() < 0.7) acts.push({ t: p - 0.05, k: 'KeyH' });
  if (SAVE.tricks.heli) { // the helicopter: centre of the Eightsome, and a few mid-phrase windows clear of hand-holds
    (g.ch.helis || []).forEach(h => { if (h.id === 'P') acts.push({ t: h.b0 + 0.5, k: 'KeyB' }); });
    const hbusy = x => g.ev.some(e => (e.type === 'turn' && x >= e.b0 - 0.4 && x <= e.b1 + 0.4) || (e.type === 'set' && Math.abs(x - e.go) < 1.1) || (e.type === 'beats' && x >= e.b0 - 0.6 && x <= e.b1 + 0.6));
    for (let p = 4; p < g.total; p += 8) if (!hbusy(p - 0.2) && !hbusy(p + 1.2) && !(g.ch.helis || []).some(h => h.id === 'P' && p >= h.b0 - 1 && p <= h.b1 + 1) && Math.random() < 0.6) acts.push({ t: p + 0.1, k: 'KeyB' });
  }
  // new moves: on the flair pulses (rotating through the ones learned, keeping clear of hand-holds), heel clicks while travelling, a bow at figure ends
  const mvKeys = ['clap', 'leap', 'pirouette'].filter(k => SAVE.tricks[k]).map(k => TRICKS[k].code); let mi = 0;
  const busy = x => g.ev.some(e => e.type === 'turn' && x >= e.b0 - 0.4 && x <= e.b1 + 0.4) || g.ev.some(e => e.type === 'set' && Math.abs(x - e.go) < 0.8);
  if (mvKeys.length) for (let k = 2; k < g.total; k += 2) if (!busy(k) && !busy(k + 0.9) && Math.random() < 0.8) acts.push({ t: k + (Math.random() - 0.5) * 0.1, k: mvKeys[mi++ % mvKeys.length] });
  if (SAVE.tricks.heel) g.ev.forEach(e => { if (e.type === 'travel') for (let b = Math.ceil((e.b0 + 0.5) * 2) / 2; b < e.b1 - 0.5 && b < e.b0 + 3; b += 1) if (!busy(b) && Math.abs(b / 2 - Math.round(b / 2)) > 0.01) acts.push({ t: b, k: TRICKS.heel.code }); });
  if (SAVE.tricks.bow) g.figs.forEach(f => { if (f.b1 < g.total) acts.push({ t: f.b1 - 0.15, k: TRICKS.bow.code }); });
  return acts.sort((a, b) => a.t - b.t);
}
function runBot(g) {
  while (g.bot.length && g.bot[0].t <= g.t) {
    const a = g.bot.shift();
    const real = g.t; g.t = a.t;
    if (a.down) { keys.add(a.k); press(a.k); }
    else if (a.up) { keys.delete(a.k); release(a.k); }
    else press(a.k);
    g.t = real;
  }
}

/* ---------- update ---------- */
function update(dtSec) {
  const g = game; if (!g || g.paused) return;
  const tPrev = g.t; g.t = nowBars(g);
  const t = g.t, dtB = Math.max(0, t - tPrev);
  if (g.demo) runBot(g);
  const ch = g.ch, p = g.p;
  const target = ch.at('P', t);
  const fp = SAVE.view === 'fp' && R3.ready;
  if (g.D.view === 'dws') { let sy = 0, n = 0; Object.keys(ch.tr).forEach(id => { const q = ch.at(id, t); if (Math.abs(q.y - target.y) < 2.6) { sy += q.y; n++; } }); const cy = n ? sy / n : target.y - 1; g.cam.y = g.camInit ? lerp(g.cam.y, cy, 1 - Math.exp(-dtSec * 6)) : cy; g.camInit = true; }
  // where you face is automatic; dragging or the arrow keys let you glance round and it springs back
  const want = desiredFace(g, 'P', t + 0.06);
  if (want != null) p.baseYaw = p.baseYaw == null ? want : p.baseYaw + angDiff(p.baseYaw, want) * (1 - Math.exp(-Math.max(dtSec, realDt * (window.__TS || 1)) * 12));
  if (p.baseYaw == null) p.baseYaw = p.yaw;
  let turnK = 0; const inRing = ch.links.some(l => l.ring && l.ring.includes('P') && t >= l.b0 - 0.3 && t <= l.b1 + 0.3);
  if (fp && !inRing) { if (keys.has('ArrowLeft')) turnK -= 1; if (keys.has('ArrowRight')) turnK += 1; }
  p.lookOff = (p.lookOff || 0) + turnK * sens().turn * dtSec + (fp ? mouseLook : 0); mouseLook = 0;
  if (!turnK) p.lookOff *= Math.exp(-dtSec * 1.6);
  p.lookOff = clamp(p.lookOff, -2.6, 2.6);
  p.yaw = p.baseYaw + p.lookOff;
  p.faceT = p.baseYaw;
  // movement: yours, except when holding hands (circles and turns) or setting, when the dance carries you
  const ringL = ch.links.find(l => l.ring && l.ring.includes('P') && t >= l.b0 - 0.3 && t <= l.b1 + 0.3);
  const arSeg = (ch.ar || []).find(a => t >= a.b0 - 0.3 && t <= a.b1 + 0.3);
  if (arSeg && t >= 0 && !g.demo && !window.__ctrl && !ringL) {
    const R0 = arSeg.b0 - 0.3, R1 = arSeg.b1 + 0.3, mid = (arSeg.b0 + arSeg.b1) / 2;
    if (!g.rail || g.rail.ar !== arSeg) g.rail = { ar: arSeg, R0, R1, mid, tt: Math.min(t, R0 + 0.05) };
    const r = g.rail;
    const Fk = keys.has('KeyW') || keys.has('ArrowUp') || stick.y < -0.3, Bk = keys.has('KeyS') || keys.has('ArrowDown') || stick.y > 0.3;
    const needFwd = t < mid - 0.3;
    if (!needFwd && r.tt < mid && Bk) r.tt = Math.min(t, 2 * mid - r.tt); // coming back retraces the way in
    r.holding = needFwd ? Fk : Bk || (t < mid && Fk); // the direction the dance needs always counts, even if the other key is still down
    if (r.holding) r.tt = Math.min(t, r.tt + dtB * 1.3);
    const q = ch.at('P', r.tt), k = 1 - Math.exp(-dtSec * 30);
    p.x = lerp(p.x, q.x, k); p.y = lerp(p.y, q.y, k); p.vx = p.vy = 0;
  } else if (ringL && t >= 0 && !g.demo && !window.__ctrl) {
    const R0 = ringL.b0 - 0.3, R1 = ringL.b1 + 0.3, mid = (R0 + R1) / 2;
    if (!g.rail || g.rail.l !== ringL) g.rail = { l: ringL, R0, R1, tt: Math.min(t, R0 + 0.05) };
    const r = g.rail;
    const Lk = keys.has('ArrowLeft') || keys.has('KeyA') || stick.x < -0.3, Rk = keys.has('ArrowRight') || keys.has('KeyD') || stick.x > 0.3;
    // the music decides which half you're in; switch a little early and that's fine
    const firstK = ringL.first === 'R' ? Rk : Lk, backK = ringL.first === 'R' ? Lk : Rk; // a circle goes left first; hands across goes right first
    const needLeft = t < mid - 0.35;
    if (!needLeft && r.tt < mid && backK) r.tt = Math.min(t, 2 * mid - r.tt); // the way back mirrors the way out, so you carry on from where you are
    r.holding = needLeft ? firstK : backK || (t < mid && firstK);
    if (ringL.oneWay) r.holding = keys.has('KeyT') || keys.has('KeyQ') || keys.has('KeyE') || Lk || Rk || keys.has('KeyW') || keys.has('ArrowUp') || stick.y < -0.3; // a one-way wheel (teapots, hands across): any direction key carries you round
    if (r.holding) r.tt = Math.min(t, r.tt + dtB * 1.3);
    const q = ch.at('P', r.tt), k = 1 - Math.exp(-dtSec * 30);
    p.x = lerp(p.x, q.x, k); p.y = lerp(p.y, q.y, k); p.vx = p.vy = 0;
  } else if (t < 0 || g.demo || carried(g, t)) {
    g.rail = null; g.trace = null;
    const k = t < 0 || g.demo ? 1 : 1 - Math.exp(-dtSec * 9);
    p.x = lerp(p.x, target.x, k); p.y = lerp(p.y, target.y, k); p.vx = p.vy = 0;
  } else if ((SAVE.travel || 'rail') !== 'free' && !window.__ctrl) {
    // your own place in the dance: it only moves on while you keep dancing
    if (g.rail && (g.rail.l || g.rail.ar)) g.rail = null;
    const r = g.rail || (g.rail = { tt: t });
    if (r.tt > t) r.tt = t;
    if (t - r.tt > 2) r.tt = t - 2; // never more than two bars adrift
    const q0 = ch.at('P', r.tt), q1 = ch.at('P', r.tt + 0.05), pace = dist(q0, q1) / 0.05;
    let go = 0;
    if (pace < (SAVE.travel === 'trace' ? 0.25 : 0.08)) go = 1; // standing figures (and the slow ends of a figure) look after themselves
    else if (SAVE.travel === 'trace') { go = traceGo(g, r, q0, q1, dtB); }
    else { const fwd = keys.has('KeyW') || keys.has('ArrowUp') || keys.has('ArrowLeft') || keys.has('ArrowRight') || keys.has('KeyA') || keys.has('KeyD') || Math.hypot(stick.x, stick.y) > 0.3 || pointerHold; go = fwd ? 1 : 0; }
    r.holding = go > 0.5;
    const catchUp = t - r.tt > 0.05 ? 1.35 : 1;
    r.tt = Math.min(t, r.tt + dtB * go * catchUp);
    const q = ch.at('P', r.tt), k = 1 - Math.exp(-dtSec * 30);
    p.x = lerp(p.x, q.x, k); p.y = lerp(p.y, q.y, k); p.vx = p.vy = 0;
  } else {
    let ix = 0, iy = 0;
    if (window.__ctrl) { const c = window.__ctrl(g); ix = c.x; iy = c.y; }
    else if (fp) {
      let f = 0, s = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) f += 1; if (keys.has('KeyS') || keys.has('ArrowDown')) f -= 1;
      if (keys.has('KeyD')) s += 1; if (keys.has('KeyA')) s -= 1;
      f -= stick.y; s += stick.x;
      const cy = Math.cos(p.baseYaw), sy = Math.sin(p.baseYaw); // relative to the way you're dancing, not where you glance
      ix = cy * f - sy * s; iy = sy * f + cy * s;
    } else {
      if (keys.has('KeyA') || keys.has('ArrowLeft')) ix -= 1; if (keys.has('KeyD') || keys.has('ArrowRight')) ix += 1;
      if (keys.has('KeyW') || keys.has('ArrowUp')) iy -= 1; if (keys.has('KeyS') || keys.has('ArrowDown')) iy += 1;
      ix += stick.x; iy += stick.y;
      if (g.rotView) { const sxk = ix; ix = -iy; iy = sxk; } // landscape lays the set on its side (screen right = world +y, screen up = world +x): keys follow the screen
    }
    let il = Math.hypot(ix, iy); if (il > 1) { ix /= il; iy /= il; il = 1; }
    if (il > 0 && !window.__ctrl) { const m = Math.pow(il, sens().exp) / il; ix *= m; iy *= m; }
    g.rail = null;
    // you can't outrun the dance: full stick moves you at the figure's own pace, a little quicker if you've fallen behind
    const ta = ch.at('P', t - 0.05), tb = ch.at('P', t + 0.05);
    const pace = dist(ta, tb) / 0.1, behind = dist(p, target);
    const maxSp = window.__ctrl ? 3.0 : clamp(pace * 1.08 + Math.min(1.3, behind * 1.5), 0.45, sens().sp);
    const k = 1 - Math.exp(-dtSec * (window.__ctrl ? 14 : sens().acc));
    p.vx = lerp(p.vx, ix * maxSp, k); p.vy = lerp(p.vy, iy * maxSp, k);
    p.x += p.vx * dtB; p.y += p.vy * dtB;
  }
  HUG.sync(g); if (t >= g.total + HUG.start) hugTick(g, dtSec); // the partners walk together and hug (THE HUG block)
  // accuracy
  const d = dist(p, target);
  if (t >= 0 && t <= g.total) {
    let a = d <= g.tol ? 1 : clamp(1 - (d - g.tol) / 0.75, 0, 1);
    if (g.rail && !g.rail.l) a = Math.min(a, clamp(1 - (t - g.rail.tt - 0.12) / 0.9, 0, 1));
    g.stats.acc += a * dtB; g.stats.accN += dtB;
    const cf = g.figs.findIndex(f => t >= f.b0 && t < f.b1);
    if (cf >= 0) { const fa = g.figAcc[cf] || (g.figAcc[cf] = { a: 0, n: 0 }); fa.a += a * dtB; fa.n += dtB; }
    g.score += a * a * dtB * 45 * comboMult(g);
    if (d > 0.95) { g.drift += dtB; if (g.drift > 0.8 && !g.lostShown) { g.lostShown = true; penalty(g, 0, 'Lost the figure!'); } }
    else { g.drift = 0; if (d < g.tol) g.lostShown = false; }
    if (g.tw && t <= g.tw.t1) { g.tw.acc += a; g.tw.n++; }
  }
  if (g.tw && t > g.tw.t1) {
    const tw = g.tw; g.tw = null; const q = tw.n ? tw.acc / tw.n : 0;
    if (tw.ok && q > 0.6) { g.stats.twirl++; const v = award(g, 300 * g.flair, 'Twirl!', '#8e7cc3'); g.stats.flair += v; }
    else if (!tw.ok) pop(g, 'Twirl (save it for travelling)', '#a7b6ad');
    else { g.combo = 0; pop(g, 'Wobbly twirl', '#f0b54a'); }
  }
  // timeouts
  const gwB = g.gw / g.barDur, sgwB = g.sgw / g.barDur;
  g.ev.forEach(e => {
    if (e.type === 'beats') e.beats.forEach(b => { if (!b.hit && !b.miss && t > b.t + sgwB * 1.3) { b.miss = true; if (t >= 0) { g.combo = 0; pop(g, e.kind === 'clap' ? 'Missed the clap' : 'Missed the stomp', '#a7b6ad'); } } });
    if (e.type === 'set' && !e.pressed && !e.missed && t > e.go + 0.6) { e.missed = true; if (t >= 0) { g.combo = 0; pop(g, 'Missed the set', '#a7b6ad'); } }
    if (e.type === 'set' && e.pressed && !e.clapped && t > e.pressed + (e.b1 - e.pressed) * 0.82) { e.clapped = true; band.clap(0.22); }
    if (e.type === 'turn' && e.gripped && p.gripE === e && e.rot >= 2) spinRevs(g, e, t, false); // a long spin: every full circle you carry your partner round scores
    if (e.type === 'turn' && !e.graded) {
      if (e.tap && e.gripped && p.gripE === e && t >= e.rel) { p.gripE = null; p.grip = null; e.graded = true; g.carryUntil = e.b1; }
      else if (!e.gripped && t > e.b0 + (e.b1 - e.b0) * 0.6) { e.graded = true; penalty(g, e.missPen || 0, e.lead ? 'Take hands!' : e.tap ? 'Missed the half turn!' : 'Missed the turn!'); }
      else if (e.gripped && p.gripE === e && t > e.b1 + 1.0) releaseTurn(g, e, t);
      else if (e.gripped && p.gripE === e && t > Math.max(e.b1, e.rel + gwB) && !g.tether) { const q = ch.at(e.with, e.b1), me = ch.at('P', e.b1); g.tether = { id: e.with, rel: { x: q.x - me.x, y: q.y - me.y } }; }
    }
  });
  g.pending = g.pending.filter(pd => {
    if (t < pd.t) return true;
    if (dist(p, ch.at('P', t)) < g.tol * 1.6) { g.stats.turnPts += 200; award(g, 200, 'Clean into place', '#7fd08a'); }
    return false;
  });
  (ch.beatsAll || []).forEach(b => { if (tPrev < b.t && t >= b.t) { if (b.kind === 'clap') band.clap(0.16, 0.012); else band.stomp(0.32, 0.015); } });
  if (g.ball) ballTick(g, dtB, dtSec);
  g.energy = Math.min(g.emax, g.energy + g.regen * dtSec);
  runMoveChecks(g, t);
  // caller
  const fi = g.figs.findIndex(f => t >= f.b0 && t < f.b1);
  const nf = g.figs.find(f => f.b0 >= t + 0.01) || null;
  if (nf && t > nf.b0 - 1.2 && g.spoken !== nf.b0) { g.spoken = nf.b0; say(nf.name.replace(/,.*$/, '').replace('Set to and turn', 'Set and turn')); }
  if (fi !== g.lastFig) {
    g.lastFig = fi; const f = g.figs[fi];
    if (t < 0 || !f) { $('hBars').textContent = 'Honours'; $('hFig').textContent = 'Bow to your partner…'; }
    else if (ch.hud) { $('hBars').textContent = ch.hud(f); $('hFig').textContent = f.name; }
    else { const nb = g.D.bars || 32; $('hBars').textContent = 'Bars ' + ((f.b0 % nb) + 1) + '–' + (((f.b1 - 1) % nb) + 1) + (g.D.times > 1 ? '  ·  time ' + (Math.floor(f.b0 / nb) + 1) + ' of ' + g.D.times : ''); $('hFig').textContent = f.name; }
    $('hNext').textContent = nf ? 'Next: ' + nf.name : '';
  }
  if (Math.floor(tPrev / 8) !== Math.floor(t / 8) && t > 1) {
    const ids = Object.keys(ch.tr).filter(i => i !== 'P');
    for (let i = 0; i < 2; i++) if (Math.random() < 0.6) { const who = ids[Math.floor(Math.random() * ids.length)]; g.bubbles.push({ id: who, text: 'Hooch!', t: performance.now() + i * 180 }); humanHooch({ kind: ch.meta[who].kind, person: ch.meta[who].person, vol: 0.08, delay: i * 0.18 + Math.random() * 0.1, crowd: Math.random() < 0.35 ? 2 : 0 }); }
  }
  $('hScore').textContent = Math.round(g.score).toLocaleString('en-GB');
  $('hMult').textContent = '×' + (+comboMult(g).toFixed(2)) + ' · combo ' + g.combo;
  $('hEnergy').style.width = (100 * g.energy / g.emax).toFixed(1) + '%';
  if (!g.done && (hugPartnerId(g) ? (g.hug && g.hug.done) || t > g.total + HUG.start + 60 : t > g.total + 1.2)) finish(g); // after the honours: the partners hug (THE HUG block)
}

/* ---------- shared animation state (both views) ---------- */
function dancerState(g, id, dtSec) {
  const ch = g.ch, t = g.t, isP = id === 'P';
  const pos = isP ? { x: g.p.x, y: g.p.y } : npc(g, id, t);
  const a = g.anim[id] || (g.anim[id] = { phase: hashId(id) % 7, face: null, last: { ...pos } });
  const vx = (pos.x - a.last.x) / Math.max(1e-3, dtSec), vy = (pos.y - a.last.y) / Math.max(1e-3, dtSec);
  a.last = { ...pos };
  const spd = Math.min(4, Math.hypot(vx, vy)); // units per second
  a.spd = lerp(a.spd || 0, spd, 0.25);
  a.phase += (a.spd > 0.15 ? 1 : a.spd / 0.15) * (dtSec / g.barDur) * Math.PI;
  const st = ch.sets.find(s => s.id === id && t >= s.b0 && t < s.b1);
  let face;
  const ringL = ch.links.find(l => l.ring && l.ring.includes(id) && t >= l.b0 && t <= l.b1);
  if (isP) face = g.p.baseYaw != null ? g.p.baseYaw : -Math.PI / 2;
  else { face = desiredFace(g, id, t); if (face == null) face = a.face != null ? a.face : (g.D.view === 'long' ? (pos.x < 0 ? 0 : Math.PI) : g.D.view === 'sq' ? Math.atan2(-pos.y, -pos.x) : (ch.meta[id].trio === 'us' ? -Math.PI / 2 : Math.PI / 2)); }
  a.face = a.face == null ? face : a.face + angDiff(a.face, face) * (isP ? 1 : 1 - Math.exp(-Math.max(dtSec, realDt * (window.__TS || 1)) * 14)); // same speed on slow and fast screens
  // setting: step right, step left, step right, clap
  let clap = false, stepKind = 'pdb';
  const setEv = isP && st ? g.ev.find(e => e.type === 'set' && e.b0 === st.b0) : null;
  if (st && (!isP || (setEv && setEv.pressed))) {
    const beat = isP ? clamp((t - setEv.pressed) / Math.max(0.5, st.b1 - setEv.pressed) * 4, 0, 3.999) : (t - st.b0) * 2, i = Math.floor(beat), u = beat - i;
    const seq = [1, -1, 1, 0], prev = i > 0 ? seq[i - 1] : 0, cur = seq[Math.min(3, i)];
    stepKind = isP ? ((setEv && setEv.did) || 'pdb') : npcStep(g, id, st.b0);
    const sway = (stepKind === 'pdb' || stepKind === 'heli' ? lerp(prev, cur, smooth(Math.min(1, u * 2))) : 0) * 0.13;
    pos.x += Math.cos(a.face + Math.PI / 2) * sway; pos.y += Math.sin(a.face + Math.PI / 2) * sway;
    clap = stepKind === 'pdb' && beat > 3.15 && beat < 3.9;
  }
  // hands
  let hand = null, ring = false, partner = null;
  if (isP) { hand = g.p.grip; partner = g.p.gripE && g.p.gripE.with; }
  if (ringL) ring = true;
  if (!isP) ch.links.forEach(l => { if (t >= l.b0 && t <= l.b1) { if (l.ring) { if (l.ring.includes(id)) ring = true; } else if (l.a === id || l.b === id) { const other = l.a === id ? l.b : l.a; if (other === 'P' && !(g.p.gripE)) return; hand = l.hand; partner = other; } } });
  const setting = st ? (t - st.b0) : -1;
  // where each hand reaches: the midpoint with whoever you're holding, or your neighbours in a circle
  const posOf = r => npc(g, r, t);
  const mid = q => ({ x: (pos.x + q.x) / 2, y: (pos.y + q.y) / 2 });
  let aimR = null, aimL = null, akimbo = null; const wp = { star: null, waist: null };
  if (hand && partner) {
    const m = mid(posOf(partner));
    if (hand === 'B') { aimR = { ...m, h: -0.14 }; aimL = { ...m, h: -0.36 }; } // crossed hold: right hands over left
    else { if (hand === 'R') aimR = m; if (hand === 'L') aimL = m; }
  }
  // spinning her under: his right hand high over her head, she turns a full circle beneath it
  let spinAdd = 0; const su = g.spinU;
  if (su && t >= su.t0 && t <= su.t1 && (id === su.who || id === su.lead)) {
    const sp = posOf(su.who), u = (t - su.t0) / (su.t1 - su.t0);
    aimR = { x: sp.x, y: sp.y, h: 0.42 }; aimL = null;
    if (id === su.who) spinAdd = smooth(u) * TAU;
  }
  else if (ringL && ringL.wheel) { // the teapots: the inner dancers reach into the middle, the gents hold their partner round the waist
    const inn = ringL.inner.includes(id), mp = posOf(ringL.mate[id]), gentK = ch.meta[id].kind === 'gent';
    if (inn) { const c0 = { x: 0, y: 0, h: -0.02 }; if (ringL.hand === 'R') aimR = c0; else aimL = c0; wp.star = ringL.hand; }
    if (gentK) { const rx = Math.cos(a.face + Math.PI / 2) * 0.14, ry = Math.sin(a.face + Math.PI / 2) * 0.14; aimR = { x: mp.x + rx, y: mp.y + ry, h: -0.36 }; wp.waist = 'R'; akimbo = inn ? null : 'L'; } // his right arm round her far hip
    else if (!inn) { aimL = { x: mp.x, y: mp.y, h: -0.02 }; wp.waist = 'L'; akimbo = 'R'; } // she rests her left hand on his shoulder
    else akimbo = 'L';
  }
  else if (ringL && ringL.star) { // hands across: one hand into the middle, right hands out and left hands back
    const pts = ringL.ring.map(r => r === id ? pos : posOf(r));
    const c = { x: pts.reduce((s, q) => s + q.x, 0) / pts.length, y: pts.reduce((s, q) => s + q.y, 0) / pts.length, h: -0.02 };
    const outward = t < (ringL.b0 + ringL.b1) / 2, useR = ringL.hand ? ringL.hand === 'R' : outward === (ringL.first === 'R');
    if (useR) { aimR = c; aimL = null; } else { aimL = c; aimR = null; }
    if (ringL.teapot) akimbo = useR ? 'L' : 'R'; // teapots: the free hand sits on the hip
  }
  else if (ringL) {
    const rs = ringL.ring.map(r => ({ r, q: r === id ? pos : posOf(r) }));
    const cx = rs.reduce((a, o) => a + o.q.x, 0) / rs.length, cy = rs.reduce((a, o) => a + o.q.y, 0) / rs.length;
    rs.sort((a, b) => Math.atan2(a.q.y - cy, a.q.x - cx) - Math.atan2(b.q.y - cy, b.q.x - cx));
    const i = rs.findIndex(o => o.r === id), n = rs.length;
    aimR = mid(rs[(i - 1 + n) % n].q); aimL = mid(rs[(i + 1) % n].q);
  }
  // advance and retire: clap on the way in, stomp on the way back
  const near = (ch.beatsAll || []).find(b => t >= b.t - 0.04 && t < b.t + 0.2);
  let stomp = 0;
  if (isP) { if (performance.now() - (g.p.clapT || -9e9) < 260) clap = true; const sa = performance.now() - (g.p.stompT || -9e9); if (sa < 300) stomp = Math.sin(sa / 300 * Math.PI); }
  else if (near && (ch.ar || []).some(a2 => t >= a2.b0 && t <= a2.b1)) { if (near.kind === 'clap') clap = true; else stomp = Math.sin(clamp((t - near.t + 0.04) / 0.24, 0, 1) * Math.PI); }
  if (g.hug && g.hug.list.includes(id) && id !== g.hug.pid) clap = ((performance.now() / 1000 * 2.4 + hashId(id) % 5 * 0.2) % 1) < 0.55; // the partner who is not being hugged claps
  if (clap) { const f = { x: pos.x + Math.cos(a.face) * 0.2, y: pos.y + Math.sin(a.face) * 0.2 }; aimR = aimL = f; }
  // your own moves (and your partner's bow back): the animation reads this
  let mv = null; const ms = mvState(g);
  if (ms && isP) { mv = ms; if (ms.k === 'pirouette') spinAdd += smooth(ms.u) * TAU; }
  else if (ms && ms.k === 'bow' && id === (Object.keys(ch.tr).find(i => i === 'M1' || i === 'W1') || 'R1')) mv = { k: 'bow', u: ms.u };
  const hl = heliAng(g, id, t); // the helicopter: arms straight out, spinning
  if (hl != null) { aimR = aimL = null; clap = false; hand = null; }
  return { stepKind, heli: hl != null, heliAdd: hl || 0, pos, face: a.face + spinAdd + (hl || 0), phase: a.phase, spd: a.spd, hand, ring, partner, setting, aimR, aimL, akimbo, wp, clap, stomp, mv, spinning: spinAdd !== 0 && !(mv && mv.k === 'pirouette'), person: ch.meta[id].person, kind: ch.meta[id].kind, hug: g.hug ? hugFor(g, id) : null };
}
