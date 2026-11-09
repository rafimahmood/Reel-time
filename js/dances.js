/* Reel Time · dances.js
   The seven dances, each written figure by figure from the published instructions. */
"use strict";

/* ================= the dances ================= */
const SX = 1.1;                       // longwise set: side x (gents on the left looking up to the band)
const PL = [-2.4, -0.8, 0.8, 2.4];     // place y positions, top of the set (band) is negative y

function buildLongwise(timeFn, times, meLady, bars) {
  const NB = bars || 32;
  const ch = new Choreo();
  const M = c => (c === 1 && !meLady) ? 'P' : 'M' + c;
  const Wd = c => (c === 1 && meLady) ? 'P' : 'W' + c;
  for (let c = 1; c <= 4; c++) {
    ch.add(M(c), -SX, PL[c - 1], { kind: 'gent', couple: c });
    ch.add(Wd(c), SX, PL[c - 1], { kind: 'lady', couple: c });
  }
  let order = [1, 2, 3, 4];
  for (let k = 0; k < times; k++) {
    const B = k * NB;
    timeFn(ch, B, { pA: k, p2: k + 1, p3: k + 2, M, W: Wd, two: order[k + 1], three: order[k + 2] });
    ch.holdAll(B + NB);
    const i = order.indexOf(1); order[i] = order[i + 1]; order[i + 1] = 1;
  }
  return ch;
}

function duke(ch, B, o) {
  const { pA, p2, p3, M, W, two, three } = o;
  const yA = PL[pA], y2 = PL[p2], y3 = PL[p3];
  const G = M(1), L = W(1), M2 = M(two), W2 = W(two), M3 = M(three), W3 = W(three);
  const f1G = [0.36, y2 + 0.3], f1L = [-0.36, y2 - 0.3];
  const f2G = [0.36, y2 - 0.3], f2L = [-0.36, y2 + 0.3];
  ch.fig(B, B + 4, 'Turn partner right hand, cast off one place', 'turn', 'Hold TURN for the right hand, then cast down behind your own line.');
  ch.turn(G, L, B, B + 2, 'R', 1, [-SX, yA], [SX, yA], 0.4);
  ch.path(G, B + 2, B + 4, [[-SX - 0.45, yA + 0.2], [-SX - 0.45, y2 - 0.3], [-SX, y2]]);
  ch.path(L, B + 2, B + 4, [[SX + 0.45, yA + 0.2], [SX + 0.45, y2 - 0.3], [SX, y2]]);
  ch.moveTo(M2, B + 2, B + 4, -SX, yA); ch.moveTo(W2, B + 2, B + 4, SX, yA);
  ch.fig(B + 4, B + 8, 'Turn partner left hand to face first corners', 'turn', 'Hold TURN for the left hand and finish facing your first corner.');
  ch.turn(G, L, B + 4, B + 8, 'L', 1.25, f1G, f1L, 0.4);
  ch.fig(B + 8, B + 16, 'Turn corner, partner, corner, partner', 'turn', 'Right hand to corners, left hand to partner. Four quick turns.');
  ch.turn(G, W3, B + 8, B + 10, 'R', 1, f1G, [SX, y3], 0.36);
  ch.turn(L, M2, B + 8, B + 10, 'R', 1, f1L, [-SX, yA], 0.36);
  ch.turn(G, L, B + 10, B + 12, 'L', 1, f2G, f2L, 0.34);
  ch.turn(G, W2, B + 12, B + 14, 'R', 1, f2G, [SX, yA], 0.36);
  ch.turn(L, M3, B + 12, B + 14, 'R', 1, f2L, [-SX, y3], 0.36);
  ch.turn(G, L, B + 14, B + 16, 'L', 1, f1G, f1L, 0.34);
  ch.fig(B + 16, B + 20, 'Set to and turn first corner, both hands', 'set', 'SET in the green, then hold TURN for the two-hand turn.');
  ch.set([G, W3, L, M2], B + 16, B + 18, [W3, G, M2, L]);
  ch.turn(G, W3, B + 18, B + 20, 'B', 1, f2G, [SX, y3], 0.36);
  ch.turn(L, M2, B + 18, B + 20, 'B', 1, f2L, [-SX, yA], 0.36);
  ch.fig(B + 20, B + 24, 'Set to and turn second corner, both hands', 'set', 'Finish the turn out on the opposite side, ready for the reel.');
  ch.set([G, W2, L, M3], B + 20, B + 22, [W2, G, M3, L]);
  ch.turn(G, W2, B + 22, B + 24, 'B', 1, [SX, y2], [SX, yA], 0.36);
  ch.turn(L, M3, B + 22, B + 24, 'B', 1, [-SX, y2], [-SX, y3], 0.36);
  ch.fig(B + 24, B + 30, 'Reels of three on the sides', 'travel', 'Left shoulder to your first corner. Follow the figure of eight.');
  ch.reel3([G, W3, W2], B + 24, B + 30, SX, y2, 0, 1, 1.85, -0.34);
  ch.reel3([L, M2, M3], B + 24, B + 30, -SX, y2, 0, -1, 1.85, -0.34);
  ch.holdAll(B + 30);
  ch.fig(B + 30, B + 32, 'Cross right hand to own sides', 'turn', 'Quick TURN as you pass. Let go on time.');
  ch.turn(G, L, B + 30, B + 32, 'R', 0.5, [-SX, y2], [SX, y2], 0.3);
}

function fiftyFirst(ch, B, o) {
  const { pA, p2, p3, M, W, two, three } = o;
  const yA = PL[pA], y2 = PL[p2], y3 = PL[p3];
  const G = M(1), L = W(1), M2 = M(two), W2 = W(two), M3 = M(three), W3 = W(three);
  const line = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
  const c2M = [-SX, yA], c3L = [SX, y3], c3M = [-SX, y3], c2L = [SX, yA];
  ch.fig(B, B + 2, 'First couple set', 'set', 'SET in the green.');
  ch.set([G, L], B, B + 2, [L, G]);
  ch.fig(B + 2, B + 6, 'Cast off two places', 'travel', 'Dance down behind your own side, round below the third couple.');
  ch.path(G, B + 2, B + 6, [[-SX - 0.45, yA + 0.3], [-SX - 0.45, y3], [-0.9, y3 + 0.75], [-0.28, y3 + 0.85]]);
  ch.path(L, B + 2, B + 6, [[SX + 0.45, yA + 0.3], [SX + 0.45, y3], [0.9, y3 + 0.75], [0.28, y3 + 0.85]]);
  ch.moveTo(M2, B + 2, B + 4, -SX, yA); ch.moveTo(W2, B + 2, B + 4, SX, yA);
  ch.fig(B + 6, B + 8, 'Lead up the middle to face first corners', 'turn', 'Hold TURN to take hands and lead up. Let go facing your corner.');
  ch.lead(G, L, B + 6, B + 8, 'L', [[-0.25, y2 + 0.4], [0.36, y2 + 0.3]], [[0.25, y2 + 0.2], [-0.36, y2 - 0.3]]);
  ch.fig(B + 8, B + 12, 'Set to and turn first corner right hand', 'set', 'SET in the green, then TURN. Finish in a diagonal line.');
  ch.set([G, W3, L, M2], B + 8, B + 10, [W3, G, M2, L]);
  ch.turn(G, W3, B + 10, B + 12, 'R', 1, line(c2M, c3L, 0.64), [SX, y3], 0.36);
  ch.turn(L, M2, B + 10, B + 12, 'R', 1, line(c2M, c3L, 0.36), [-SX, yA], 0.36);
  ch.fig(B + 12, B + 14, 'Balance in line', 'set', 'The Saltire. SET in the green.');
  ch.set([G, L, W3, M2], B + 12, B + 14);
  ch.fig(B + 14, B + 16, 'Turn partner left hand to face second corners', 'turn', 'Hold TURN, then let go facing your second corner.');
  ch.turn(G, L, B + 14, B + 16, 'L', 0.5, [0.36, y2 - 0.3], [-0.36, y2 + 0.3], 0.3);
  ch.fig(B + 16, B + 20, 'Set to and turn second corner right hand', 'set', 'SET, then TURN, into the other diagonal.');
  ch.set([G, W2, L, M3], B + 16, B + 18, [W2, G, M3, L]);
  ch.turn(G, W2, B + 18, B + 20, 'R', 1, line(c3M, c2L, 0.64), [SX, yA], 0.36);
  ch.turn(L, M3, B + 18, B + 20, 'R', 1, line(c3M, c2L, 0.36), [-SX, y3], 0.36);
  ch.fig(B + 20, B + 22, 'Balance in line', 'set', 'The second diagonal of the cross.');
  ch.set([G, L, W2, M3], B + 20, B + 22);
  ch.fig(B + 22, B + 24, 'Cross left hand to own sides', 'turn', 'Hold TURN and land in second place on your own side.');
  ch.turn(G, L, B + 22, B + 24, 'L', 0.5, [-SX, y2], [SX, y2], 0.3);
  ch.fig(B + 24, B + 28, 'Circle six: eight steps to the left', 'travel', 'Hold LEFT to slip round to the left with the circle.');
  ch.fig(B + 28, B + 32, 'Eight steps back to the right', 'travel', 'Hold RIGHT to slip back round to the right.');
  ch.circle([M2, W2, G, L, M3, W3], B + 24, 0, y2, 1.55, TAU);
}

function buildDWS(times, meLady) {
  const ch = new Choreo();
  const mine = meLady ? 'lady' : 'gent', other = meLady ? 'gent' : 'lady';
  ch.add('P', 0, 1, { kind: mine, trio: 'us' });
  ch.add('R1', 1, 1, { kind: other, trio: 'us' });
  ch.add('L1', -1, 1, { kind: other, trio: 'us' });
  for (let r = 0; r < times; r++) {
    const y = r === 0 ? -1 : -1 - 4 * r - 4, o = 'O' + r;
    // the trio opposite faces down the room; their right-hand partner is on -x
    ch.add(o + 'c', 0, y, { kind: other, trio: o });
    ch.add(o + 'r', -1, y, { kind: mine, trio: o });
    ch.add(o + 'l', 1, y, { kind: mine, trio: o });
  }
  for (let r = 0; r < times; r++) {
    const B = r * 32, yb = 1 - 4 * r, yo = -1 - 4 * r, o = 'O' + r;
    const us = ['P', 'R1', 'L1'], them = [o + 'c', o + 'r', o + 'l'];
    ch.fig(B, B + 4, 'Circle six: eight steps to the left', 'travel', 'Hold LEFT to slip round to the left with the circle.');
    ch.fig(B + 4, B + 8, 'Eight steps back to the right', 'travel', 'Hold RIGHT to slip back round to the right.');
    ch.circle([...us, ...them], B, 0, (yb + yo) / 2, 1.45, TAU);
    ch.fig(B + 8, B + 12, 'Set to and turn right-hand partner', 'set', 'SET in the green, then TURN once round, clockwise.');
    ch.set(['P', 'R1'], B + 8, B + 10, ['R1', 'P']);
    ch.set([o + 'c', o + 'r'], B + 8, B + 10, [o + 'r', o + 'c']);
    ch.turn('P', 'R1', B + 10, B + 12, 'B', 1, [0, yb], [1, yb], 0.38);
    ch.turn(o + 'c', o + 'r', B + 10, B + 12, 'B', 1, [0, yo], [-1, yo], 0.38);
    ch.fig(B + 12, B + 16, 'Set to and turn left-hand partner', 'set', 'SET in the green, then TURN once round, clockwise.');
    ch.set(['P', 'L1'], B + 12, B + 14, ['L1', 'P']);
    ch.set([o + 'c', o + 'l'], B + 12, B + 14, [o + 'l', o + 'c']);
    ch.turn('P', 'L1', B + 14, B + 16, 'B', 1, [0, yb], [-1, yb], 0.38);
    ch.turn(o + 'c', o + 'l', B + 14, B + 16, 'B', 1, [0, yo], [1, yo], 0.38);
    ch.fig(B + 16, B + 24, 'Reel of three across', 'travel', 'Left shoulder to your right-hand partner to start.');
    ch.reel3(us, B + 16, B + 24, 0, yb, 1, 0, 1.12, 0.34);
    ch.reel3(them, B + 16, B + 24, 0, yo, -1, 0, 1.12, 0.34);
    ch.fig(B + 24, B + 26, 'Advance: three steps in and clap', 'travel', 'Hold FORWARD and tap SET on each clap.');
    ch.fig(B + 26, B + 28, 'Retire: three steps back and stomp', 'travel', 'Hold BACK and tap SET on each stomp.');
    ch.ar = ch.ar || []; ch.ar.push({ b0: B + 24, b1: B + 28 });
    ch.beatsAll = ch.beatsAll || [];
    [B + 24.5, B + 25, B + 25.5].forEach(tb => ch.beatsAll.push({ t: tb, kind: 'clap' }));
    [B + 26.5, B + 27, B + 27.5].forEach(tb => ch.beatsAll.push({ t: tb, kind: 'stomp' }));
    ch.ev.push({ type: 'beats', kind: 'clap', b0: B + 24, b1: B + 26, beats: [B + 24.5, B + 25, B + 25.5].map(t => ({ t })) });
    ch.ev.push({ type: 'beats', kind: 'stomp', b0: B + 26, b1: B + 28, beats: [B + 26.5, B + 27, B + 27.5].map(t => ({ t })) });
    us.forEach(id => { const s = ch.at(id, B + 24); ch.moveTo(id, B + 24, B + 26, s.x, yb - 0.5); ch.moveTo(id, B + 26, B + 28, s.x, yb); });
    them.forEach(id => { const s = ch.at(id, B + 24); ch.moveTo(id, B + 24, B + 26, s.x, yo + 0.5); ch.moveTo(id, B + 26, B + 28, s.x, yo); });
    ch.fig(B + 28, B + 32, 'Pass through to meet the next three', 'travel', 'Under the arches and on to a new trio.');
    us.forEach(id => { const s = ch.at(id, B + 28); ch.path(id, B + 28, B + 32, [[s.x + 0.32, yb - 2], [s.x, yb - 4]]); });
    them.forEach(id => { const s = ch.at(id, B + 28); ch.path(id, B + 28, B + 32, [[s.x - 0.32, yo + 2], [s.x, yo + 4]]); });
    ch.arches.push({ ids: them, b0: B + 28, b1: B + 32 });
    if (r + 1 < times) {
      const n = 'O' + (r + 1), yn = -1 - 4 * (r + 1);
      [n + 'c', n + 'r', n + 'l'].forEach(id => { const s = ch.at(id, B + 28); ch.moveTo(id, B + 28, B + 32, s.x, yn, u => u); });
    }
  }
  return ch;
}

/* ---- The Duke and Duchess of Edinburgh (RSCDS Book 39, Anderson and Lesslie; reel 8x40, three couples; crib from scottish-country-dancing-dictionary.com).
   1-4 all advance and retire; 5-8 all turn partners with both hands (skip change), the 1s finishing facing out; 9-16 the 1s cast, lead down between the 3s, cast up behind them,
   lead up between the 2s and cast to second place while the 2s step up; 17-24 TEAPOTS: 1st lady with the 2s and 1st man with the 3s dance right hands across, the 1s pass by the right,
   then left hands across (lady with the 3s, man with the 2s) and finish facing first corners; 25-32 the 1s turn first corner, partner, second corner, partner; 33-40 the three couples
   circle six hands round and back. In figures 9-16 and 17-24 the dancers who are not dancing the figure stand in their places. ---- */
function dukeDuchess(ch, B, o) {
  const { pA, p2, p3, M, W, two, three } = o;
  const yA = PL[pA], y2 = PL[p2], y3 = PL[p3];
  const G = M(1), L = W(1), M2 = M(two), W2 = W(two), M3 = M(three), W3 = W(three);
  const f1G = [0.36, y2 + 0.3], f1L = [-0.36, y2 - 0.3];
  const f2G = [0.36, y2 - 0.3], f2L = [-0.36, y2 + 0.3];
  const OUT = SX + 0.75;
  // 1-4: the two lines advance towards their partners (2 bars) and retire BACKWARDS (2 bars), still facing them: W then S
  ch.fig(B, B + 4, 'All advance and retire', 'travel', 'Advance for two bars towards your partner across the set (W), then retire backwards (S) while still facing them.');
  ch.ar = ch.ar || []; ch.ar.push({ b0: B, b1: B + 4 });
  [[G, L, yA], [M2, W2, y2], [M3, W3, y3]].forEach(([a, b, y]) => {
    ch.moveTo(a, B, B + 2, -0.5, y); ch.moveTo(b, B, B + 2, 0.5, y);
    ch.moveTo(a, B + 2, B + 4, -SX, y); ch.moveTo(b, B + 2, B + 4, SX, y);
  });
  // 5-8: both hands, twice round in four bars, skip change
  ch.fig(B + 4, B + 8, 'All turn partners with both hands', 'turn', 'Hold TURN and dance round twice with your partner (every circle scores), then let go in the green.');
  [[G, L], [M2, W2], [M3, W3]].forEach(([a, b]) => ch.turn(a, b, B + 4, B + 8, 'B', 2, null, null, 0.38));
  // 9-16: the 1s alone; the 2s and 3s stand until the 2s step up
  const ym = y2 + 0.65;
  ch.fig(B + 8, B + 9.5, 'First couple cast down behind the 2s', 'travel', 'Dance down behind your own line, past the second couple.');
  ch.path(G, B + 8, B + 9.5, [[-OUT, yA + 0.5], [-OUT, y2 + 0.5], [-0.75, y2 + 0.9], [-0.35, ym]]);
  ch.path(L, B + 8, B + 9.5, [[OUT, yA + 0.5], [OUT, y2 + 0.5], [0.75, y2 + 0.9], [0.35, ym]]);
  ch.fig(B + 9.5, B + 11, 'Lead down between the 3s', 'turn', 'Hold TURN to take hands and lead down the middle. Let go below the third couple.');
  ch.lead(G, L, B + 9.5, B + 11, 'R', [[-0.3, y3 + 0.8]], [[0.3, y3 + 0.8]]);
  ch.fig(B + 11, B + 12.5, 'Cast up behind the 3s', 'travel', 'Separate and dance up outside the third couple.');
  ch.path(G, B + 11, B + 12.5, [[-0.9, y3 + 0.95], [-OUT, y3 + 0.3], [-OUT, y2 + 0.5]]);
  ch.path(L, B + 11, B + 12.5, [[0.9, y3 + 0.95], [OUT, y3 + 0.3], [OUT, y2 + 0.5]]);
  ch.fig(B + 12.5, B + 14, 'Lead up between the 2s', 'turn', 'Hold TURN, take hands and lead up the middle to the top.');
  ch.lead(G, L, B + 12.5, B + 14, 'R', [[-0.35, y2 + 0.5], [-0.3, yA + 0.35]], [[0.35, y2 + 0.5], [0.3, yA + 0.35]]);
  ch.fig(B + 14, B + 16, 'Cast to second place, the 2s step up', 'travel', 'Cast down behind your own line into second place as the second couple step up.');
  ch.path(G, B + 14, B + 16, [[-OUT, yA + 0.3], [-OUT, y2 - 0.3], [-SX, y2]]);
  ch.path(L, B + 14, B + 16, [[OUT, yA + 0.3], [OUT, y2 - 0.3], [SX, y2]]);
  ch.moveTo(M2, B + 14, B + 16, -SX, yA); ch.moveTo(W2, B + 14, B + 16, SX, yA);
  // 17-24: TEAPOTS. Two stars of three: the 1st lady's with the 2s, the 1st man's with the 3s, right hands in and the free hand on the hip; the 1s pass by the right
  // and swap stars; then left hands across the other way and the 1s finish facing first corners.
  const R = 0.75, rad = d => d * Math.PI / 180, cT = [0, yA + 0.3], cB = [0, y3 - 0.3];
  const sp = (c, d) => [c[0] + R * Math.cos(rad(d)), c[1] + R * Math.sin(rad(d))];
  const tIn = 0.8, tX = 0.4, t1 = B + 16 + tIn, t2 = B + 24 - tIn, mid0 = B + 20 - tX, mid1 = B + 20 + tX;
  ch.fig(B + 16, B + 20, 'Teapots: right hand star (hold T)', 'travel', 'Hold T: right hand star. The lady wheels with the 2s, the man with the 3s: right hand in, left on your hip, once round (hold T, or D, or W).');
  ch.fig(B + 20, B + 24, 'Pass right shoulder, left hand star (hold T)', 'travel', 'Hold T: left hand star. Change stars past your partner (right shoulder), then wheel the other way, left hand in and right hand on your hip (hold T, or A, or W).');
  const star = (ids, angs, c, b0, b1, dir) => { ids.forEach((id, i) => ch.wheel(id, b0, b1, c[0], c[1], R, rad(angs[i]), dir, 1)); };
  const stIds = [[M2, -150], [W2, -30]], bsIds = [[M3, 150], [W3, 30]];
  [...stIds.map(([id, a]) => [id, sp(cT, a)]), ...bsIds.map(([id, a]) => [id, sp(cB, a)])].forEach(([id, p]) => { ch.moveTo(id, B + 16, t1, p[0], p[1]); });
  ch.moveTo(L, B + 16, t1, ...sp(cT, 90)); ch.moveTo(G, B + 16, t1, ...sp(cB, -90));
  stIds.forEach(([id, a]) => { ch.wheel(id, t1, mid0, cT[0], cT[1], R, rad(a), 1, 1); ch.wheel(id, mid1, t2, cT[0], cT[1], R, rad(a), -1, 1); });
  bsIds.forEach(([id, a]) => { ch.wheel(id, t1, mid0, cB[0], cB[1], R, rad(a), 1, 1); ch.wheel(id, mid1, t2, cB[0], cB[1], R, rad(a), -1, 1); });
  ch.wheel(L, t1, mid0, cT[0], cT[1], R, rad(90), 1, 1); ch.wheel(G, t1, mid0, cB[0], cB[1], R, rad(-90), 1, 1);
  ch.path(L, mid0, mid1, [[-0.85, y2], sp(cB, -90)]); ch.path(G, mid0, mid1, [[0.85, y2], sp(cT, 90)]);
  ch.wheel(L, mid1, t2, cB[0], cB[1], R, rad(-90), -1, 1); ch.wheel(G, mid1, t2, cT[0], cT[1], R, rad(90), -1, 1);
  stIds.concat(bsIds).forEach(([id]) => ch.moveTo(id, t2, B + 24, ...(id === M2 ? [-SX, yA] : id === W2 ? [SX, yA] : id === M3 ? [-SX, y3] : [SX, y3])));
  ch.path(L, t2, B + 24, [[-0.5, y2], f1L]); ch.path(G, t2, B + 24, [[0.5, y2], f1G]);
  const tp = (ids, b0, b1, dir) => ch.links.push({ ring: ids, b0: b0 + 0.3, b1: b1 - 0.3, star: true, first: dir > 0 ? 'R' : 'L', hand: dir > 0 ? 'R' : 'L', oneWay: true, teapot: true });
  tp([L, M2, W2], B + 16, mid0 + 0.3, 1); tp([G, M3, W3], B + 16, mid0 + 0.3, 1);
  tp([G, M2, W2], mid1 - 0.3, B + 24, -1); tp([L, M3, W3], mid1 - 0.3, B + 24, -1);
  // 25-32
  ch.fig(B + 24, B + 32, 'Turn corner, partner, corner, partner', 'turn', 'Right hand to corners, left hand to partner. Four quick turns.');
  ch.turn(G, W3, B + 24, B + 26, 'R', 1, f1G, [SX, y3], 0.36);
  ch.turn(L, M2, B + 24, B + 26, 'R', 1, f1L, [-SX, yA], 0.36);
  ch.turn(G, L, B + 26, B + 28, 'L', 1.25, f2G, f2L, 0.4);
  ch.turn(G, W2, B + 28, B + 30, 'R', 1, f2G, [SX, yA], 0.36);
  ch.turn(L, M3, B + 28, B + 30, 'R', 1, f2L, [-SX, y3], 0.36);
  ch.turn(G, L, B + 30, B + 32, 'L', 1, [-SX, y2], [SX, y2], 0.34);
  // 33-40
  ch.fig(B + 32, B + 36, 'Circle six: four bars to the left', 'travel', 'Hold LEFT to slip round to the left with the circle.');
  ch.fig(B + 36, B + 40, 'And four bars back to the right', 'travel', 'Hold RIGHT to slip back round to the right.');
  ch.circle([M2, W2, G, L, M3, W3], B + 32, 0, y2, 1.55, TAU);
}

/* ---- The Foursome Reel (RSCDS Book 3; two couples, Highland setting; strathspey 32 + reel 32, the same figures). The four dancers stand in a line across: the ladies on the ends facing in,
   the men back to back in the middle, each looking at their own partner. 1-8 reel of four across (ladies pass partners by the right, then pass each other by the left in the middle; the ladies
   finish on each other's ends, the men back to back facing the opposite lady); 9-16 all set; 17-24 reel of four across again giving right shoulder to the opposite partner, ladies back home;
   25-32 all set. Danced an even number of times, so everyone ends where they began. All four dancers weave, nobody stands. ---- */
const FS_E = 2.0, FS_M = 0.65;
function buildFoursome(meLady) {
  const ch = new Choreo(); ch.ghost = true;
  const g1 = meLady ? 'M1' : 'P', l1 = meLady ? 'P' : 'W1', g2 = 'M2', l2 = 'W2';
  ch.add(l1, -FS_E, 0, { kind: 'lady', couple: 1 }); ch.add(g1, -FS_M, 0, { kind: 'gent', couple: 1 });
  ch.add(g2, FS_M, 0, { kind: 'gent', couple: 2 }); ch.add(l2, FS_E, 0, { kind: 'lady', couple: 2 });
  // standing: ladies look in along the line, men look out at the lady on their own side
  ch.stand = (id, q) => ch.meta[id].kind === 'gent' ? (q.x < 0 ? Math.PI : 0) : (q.x < 0 ? 0 : Math.PI);
  const sE = u => 0.7 * u + 0.3 * smooth(u);
  // reel of four across: wl starts on the left end and finishes on the right, wr the other way; ml and mr loop out to the ends and back (the same path, a half turn apart)
  const reel4 = (b0, wl, wr, ml, mr) => {
    const b1 = b0 + 8, a = 0.8, cx = -(FS_E - 0.55), A = -FS_M - cx, bb = 0.85;
    const lady = u => ({ x: -FS_E + 2 * FS_E * sE(u), y: -a * Math.sin(3 * Math.PI * sE(u)) });
    const man = u => ({ x: cx + A * Math.cos(TAU * sE(u)), y: bb * Math.sin(TAU * sE(u)) });
    const neg = f => u => { const p = f(u); return { x: -p.x, y: -p.y }; };
    [[wl, lady], [wr, neg(lady)], [ml, man], [mr, neg(man)]].forEach(([id, f]) => { ch.hold(id, b0); ch.gen(id, b0, b1, f); });
  };
  const all = [l1, g1, g2, l2];
  for (let k = 0; k < 2; k++) {
    const B = k * 32;
    ch.fig(B, B + 3, 'Reel of four: pass your partner by the RIGHT shoulder', 'travel', 'Ladies go in, men go out: pass the dancer facing you right shoulder to right shoulder. Follow the dotted trail.');
    ch.fig(B + 3, B + 5, 'Reel of four: ladies pass LEFT shoulder in the middle', 'travel', 'The ladies cross the middle left shoulder to left shoulder; the men loop round the ends.');
    ch.fig(B + 5, B + 8, 'Reel of four: pass the opposite man by the RIGHT shoulder', 'travel', 'On to the far end, right shoulder to the man, and loop home.');
    reel4(B, l1, l2, g1, g2);
    ch.fig(B + 8, B + 16, 'All set', 'set', 'Set to the lady or gent opposite, in pas de basque.');
    for (let j = 0; j < 4; j++) ch.set([l2, g1, g2, l1], B + 8 + 2 * j, B + 10 + 2 * j, [g1, l2, l1, g2]);
    ch.fig(B + 16, B + 19, 'Reel again: pass the opposite partner by the RIGHT shoulder', 'travel', 'Same weave, the ladies coming home. Follow the dotted trail.');
    ch.fig(B + 19, B + 21, 'Reel again: ladies pass LEFT shoulder in the middle', 'travel', 'Ladies cross the middle left to left; the men loop the ends.');
    ch.fig(B + 21, B + 24, 'Reel again: pass the man by the RIGHT shoulder', 'travel', 'Home to your own end.');
    reel4(B + 16, l2, l1, g1, g2);
    ch.fig(B + 24, B + 32, 'All set to partners', 'set', 'Set to your own partner, in pas de basque.');
    for (let j = 0; j < 4; j++) ch.set([l1, g1, g2, l2], B + 24 + 2 * j, B + 26 + 2 * j, [g1, l1, l2, g2]);
    ch.holdAll(B + 32);
  }
  return ch;
}

/* ---- The Eightsome Reel (square set of four couples; crib from scottish-country-dancing-dictionary.com, the full dance is 464 bars).
   Opening and finale (48 bars): 1-8 all circle left and back; 9-16 LADIES' TEAPOT: the ladies' right hands across in the middle, each gent outside with his right arm round his partner's waist, all wheeling round to the left;
   17-24 GENTS' TEAPOT: the gents' left hands across in the middle, each lady outside with her partner's arm round her waist, wheeling the other way; 25-28 all set to partners twice; 29-32 turn partners twice;
   33-44 a quick grand chain right round the set (a half turn by every hand: tap T); 45-48 turn your partner to finish. A solo (20 bars, only THREE dance, everyone else stands still facing in): the soloist dances to the middle and sets (4);
   sets to (while travelling) and turns her partner (4) and the opposite dancer (4); reel of three across the set with them, ending in her own place (8). Order: the four ladies, then the four gents (the Ball plays a cut: two ladies and two gents). ---- */
const ER8 = 2.3;
function buildEightsome(meLady) {
  const cut = !!(window.__ballGo || window.__esrCut);
  const ch = new Choreo(); ch.helis = [];
  const ang = k => -Math.PI / 2 - Math.PI / 8 + k * Math.PI / 4, slotP = (k, r) => [(r || ER8) * Math.cos(ang(k)), (r || ER8) * Math.sin(ang(k))];
  const G = c => (c === 1 && !meLady) ? 'P' : 'M' + c, Ld = c => (c === 1 && meLady) ? 'P' : 'W' + c;
  const slotOf = {}, mate = {}, lad = [], gen = [], bySlot = [];
  for (let c = 1; c <= 4; c++) { // round the ring clockwise: L1 M1 L2 M2 L3 M3 L4 M4 (a gent stands on his lady's left as they face the middle)
    ch.add(Ld(c), ...slotP(2 * (c - 1)), { kind: 'lady', couple: c }); ch.add(G(c), ...slotP(2 * (c - 1) + 1), { kind: 'gent', couple: c });
    slotOf[Ld(c)] = 2 * (c - 1); slotOf[G(c)] = 2 * (c - 1) + 1; mate[Ld(c)] = G(c); mate[G(c)] = Ld(c); lad.push(Ld(c)); gen.push(G(c)); bySlot.push(Ld(c), G(c));
  }
  const all = bySlot.slice(), idAt = k => bySlot[((k % 8) + 8) % 8], home = id => slotP(slotOf[id]);
  const partnersOf = ids => ids.map(i => mate[i]);
  const polar = (r, a) => ({ x: r * Math.cos(a), y: r * Math.sin(a) });
  const E = u => 0.85 * u + 0.15 * smooth(u);
  const figT = (b0, b1, tpl, kind, tip) => { ch.fig(b0, b1, '', kind, tip); const f = ch.figs[ch.figs.length - 1]; f.tpl = tpl; f.name = tpl(() => 'the soloist'); };
  const NM = ['1st', '2nd', '3rd', '4th'];
  const intro = (B, fin) => {
    ch.fig(B, B + 4, 'Circle eight to the left', 'travel', 'Everyone joins hands. Hold LEFT to go round with the circle.');
    ch.fig(B + 4, B + 8, 'And back to the right', 'travel', 'Hold RIGHT to slip back round to the right.');
    ch.circle(all, B, 0, 0, 1.9, TAU * 0.75); // eight slip steps take eight dancers three-quarters of the way round
    // LADIES' TEAPOT: ladies right hands into the middle, gents outside with an arm round their partner's waist, wheeling to the left (clockwise from above)
    const A0 = B + 8, B1 = B + 16, aP = l => ang(slotOf[l]);
    ch.fig(A0, A0 + 8, "Ladies' teapot: right hands across, gents round the waist", 'travel', "The ladies' right hands meet in the middle; each gent holds his partner round the waist on the outside. All wheel round to the left. Hold any move key.");
    ch.fig(B1, B1 + 8, "Gents' teapot: left hands across, ladies on the outside", 'travel', "Now the gents' left hands meet in the middle, the ladies outside with their partner's arm round the waist. Wheel the other way. Hold any move key.");
    lad.forEach(l => {
      const g = mate[l], a = aP(l);
      ch.hold(l, A0); ch.hold(g, A0);
      ch.gen(l, A0, A0 + 1, u => polar(lerp(ER8, 0.55, smooth(Math.min(1, u / 0.75))), a));
      ch.gen(g, A0, A0 + 1, u => polar(lerp(ER8, 1.15, smooth(Math.min(1, u / 0.7))), a + Math.PI / 4 * (1 - smooth(Math.max(0, (u - 0.3) / 0.7)))));
      ch.gen(l, A0 + 1, B1, u => polar(0.55, a + TAU * E(u)));
      ch.gen(g, A0 + 1, B1, u => polar(1.15, a + TAU * E(u)));
      ch.gen(l, B1, B1 + 1, u => polar(lerp(0.55, 1.15, smooth(u)), a + 0.34 * Math.sin(Math.PI * u))); // swap: lady steps out, gent steps in
      ch.gen(g, B1, B1 + 1, u => polar(lerp(1.15, 0.55, smooth(u)), a - 0.34 * Math.sin(Math.PI * u)));
      ch.gen(l, B1 + 1, B1 + 7, u => polar(1.15, a - TAU * E(u)));
      ch.gen(g, B1 + 1, B1 + 7, u => polar(0.55, a - TAU * E(u)));
      ch.gen(l, B1 + 7, B1 + 8, u => polar(lerp(1.15, ER8, smooth(u)), a));
      ch.gen(g, B1 + 7, B1 + 8, u => polar(lerp(0.55, ER8, smooth(Math.max(0, (u - 0.3) / 0.7))), a + Math.PI / 4 * smooth(Math.min(1, u / 0.6))));
    });
    ch.links.push({ ring: all, b0: A0 + 1, b1: B1, star: true, wheel: true, oneWay: true, first: 'R', hand: 'R', inner: lad, mate, waist: 'ladies' });
    ch.links.push({ ring: all, b0: B1 + 1, b1: B1 + 7, star: true, wheel: true, oneWay: true, first: 'L', hand: 'L', inner: gen, mate, waist: 'gents' });
    ch.fig(B + 24, B + 28, 'All set to partners, twice', 'set', 'Set in the green, then again.');
    ch.set(all, B + 24, B + 26, partnersOf(all)); ch.set(all, B + 26, B + 28, partnersOf(all));
    ch.fig(B + 28, B + 32, 'Turn partners with both hands, twice round', 'turn', 'Hold TURN and spin your partner twice round; every circle scores. Let go in the green.');
    for (let c = 1; c <= 4; c++) ch.turn(Ld(c), G(c), B + 28, B + 32, 'B', 2, null, null, 0.4);
    // GRAND CHAIN: right hand to your partner, left to the next, round the set: one and a half bars a hand, so there is time to turn your partner at the end
    const C0 = B + 32, CH = 12;
    ch.fig(C0, C0 + CH, 'Grand chain: tap T for every hand', 'turn', 'Right hand to your partner, left to the next, and on round. A half turn by each hand: tap TURN as you meet them.');
    const sm = u => 0.92 * u + 0.08 * smooth(u);
    all.forEach(id => {
      const s0 = slotOf[id], dir = lad.includes(id) ? 1 : -1, lady = dir > 0;
      ch.hold(id, C0);
      ch.gen(id, C0, C0 + CH, u => {
        const th = TAU * sm(u), x = th / (Math.PI / 4), i = Math.min(7, Math.floor(x)), f = x - i;
        const off = (lady ? 1 : -1) * (i % 2 === 0 ? 1 : -1) * 0.4 * Math.sin(Math.PI * f); // right shoulders first: the lady passes outside her partner, then the left, and so on
        const a = ang(s0) + dir * th, r = ER8 + off;
        return { x: r * Math.cos(a), y: r * Math.sin(a) };
      });
    });
    for (let i = 0; i < 8; i++) lad.forEach(l => { // who clasps whose hand at each change
      const sl = (slotOf[l] + i) % 8, gdent = gen.find(g => (((slotOf[g] - i) % 8) + 8) % 8 === (sl + 1) % 8);
      if (!gdent) return;
      const h0 = C0 + 1.5 * i + 0.3, h1 = C0 + 1.5 * i + 1.2, hand = i % 2 ? 'L' : 'R';
      ch.links.push({ a: l, b: gdent, b0: h0, b1: h1, hand });
      if (l === 'P' || gdent === 'P') ch.ev.push({ type: 'turn', b0: h0, b1: h1, hand, with: l === 'P' ? gdent : l, rot: 0.5, tap: true, missPen: 40 });
    });
    ch.fig(C0 + CH, C0 + CH + 4, 'Turn your partner to finish the chain', 'turn', 'Hold TURN and swing your partner once round with both hands. Let go in the green.');
    for (let c = 1; c <= 4; c++) ch.turn(Ld(c), G(c), C0 + CH, C0 + CH + 4, 'B', 1, null, null, 0.4);
  };
  const solo = (B, S, lbl) => {
    const lady = lad.includes(S), s = slotOf[S], me = S === 'P', T = b => B + b;
    const Pt = mate[S], O = idAt(lady ? s + 5 : s + 3), mine = [S, Pt, O].includes('P');
    const opp = lady ? 'man' : 'lady', meet = X => { const h = home(X); return [h[0] * 0.52, h[1] * 0.52]; };
    const setW = (ids, b0, b1, toward) => { ch.set(ids, b0, b1, toward); const e = ch.ev[ch.ev.length - 1]; if (e && e.type === 'set' && e.b0 === b0) { e.goAt = b0 - 0.1; e.wide = 1.6; } };
    // captions: the player who is not one of the three is told to wait
    if (!mine) figT(T(0), T(20), nm => 'Watch: ' + nm(S) + "'s solo", 'watch', 'The soloist and two dancers are dancing. Stand still and watch.');
    else if (me) {
      figT(T(0), T(4), () => 'Dance to the middle and set', 'set', 'Go into the middle and set (Space, or B for a helicopter). The others stand and watch.');
      figT(T(4), T(8), () => 'Set to and turn your partner', 'set', 'Set as you go to your partner, then hold TURN, both hands, once round. Then wait.');
      figT(T(8), T(12), () => 'Set to and turn the opposite ' + opp, 'set', 'Set as you cross to the opposite ' + opp + ', then hold TURN once round.');
      figT(T(12), T(20), () => 'Reel of three across the set', 'travel', 'Weave with your partner and the opposite ' + opp + ' on the line across the middle (W, A, D).');
    } else {
      const isPt = Pt === 'P';
      figT(T(0), T(isPt ? 4 : 8), nm => 'Wait: ' + nm(S) + ' ' + (isPt ? 'sets in the middle' : 'dances to her partner'), 'watch', 'Stand still: the soloist is dancing.');
      if (isPt) figT(T(4), T(8), nm => 'Set to and turn ' + nm(S), 'set', 'The soloist sets to you as she comes: set in the green, then hold TURN once round. Then wait.');
      if (isPt) figT(T(8), T(12), nm => 'Wait: ' + nm(S) + ' turns the opposite ' + opp, 'watch', 'Stand still.');
      else figT(T(8), T(12), nm => 'Set to and turn ' + nm(S), 'set', 'The soloist sets to you as she comes: set in the green, then hold TURN once round. Then wait.');
      figT(T(12), T(20), () => 'Reel of three across the set', 'travel', 'Weave with the soloist and the other dancer on the line across the middle (W, A, D).');
    }
    // 0-4 the soloist dances to the middle and sets while the others stand
    ch.moveTo(S, T(0), T(1), 0, 0);
    setW([S], T(1), T(2.5)); setW([S], T(2.5), T(4));
    ch.helis.push({ id: S, b0: T(1.5), b1: T(3.5), n: 2 });
    // 4-12 set (while travelling in) and turn each in turn, set 2 bars + turn 2 bars; only the soloist and that partner move
    const setTurn = (b, X) => {
      ch.moveTo(S, T(b), T(b + 1.6), ...meet(X));
      setW([S, X], T(b), T(b + 2), [X, S]);
      ch.turn(S, X, T(b + 2), T(b + 4), 'B', 1, null, null, 0.4);
    };
    setTurn(4, Pt); setTurn(8, O);
    // 12-20 reel of three across the set (partner, soloist, opposite), the soloist home
    const h = home(Pt), n = Math.hypot(h[0], h[1]);
    ch.reel3([S, Pt, O], T(12), T(19), 0, 0, h[0] / n, h[1] / n, 2.5, 0.75);
    ch.moveTo(S, T(19), T(20), ...home(S));
    ch.holdAll(T(20));
  };
  intro(0, false);
  const order = [];
  [1, 2, 3, 4].forEach(c => { if (!cut || c <= 2) order.push([Ld(c), "Ladies' solos", NM[c - 1] + ' lady', c]); });
  [1, 2, 3, 4].forEach(c => { if (!cut || c <= 2) order.push([G(c), "Gents' solos", NM[c - 1] + ' man', c]); });
  const parts = [{ b0: 0, b1: 32, name: 'Opening' }, { b0: 32, b1: 48, name: 'Grand chain' }];
  order.forEach(([S, grp, ord], k) => { const b = 48 + 20 * k; solo(b, S); parts.push({ b0: b, b1: b + 20, S, grp, ord }); });
  const F = 48 + 20 * order.length;
  intro(F, true);
  ch.holdAll(F + 48);
  parts.push({ b0: F, b1: F + 32, name: 'Finale' }, { b0: F + 32, b1: F + 48, name: 'Finale · grand chain' });
  ch.totalBars = F + 48; ch.practiceBars = 48;
  const nm1 = id => id === 'P' ? 'you' : (((ch.meta[id] || {}).person || {}).name || 'dancer').split(' ')[0];
  ch.named = () => { ch.figs.forEach(f => { if (f.tpl) f.name = f.tpl(nm1); }); };
  // the caller names the part of the dance and the bars inside that part
  ch.hud = f => {
    const pt = parts.find(q => f.b0 >= q.b0 && f.b0 < q.b1) || parts[0], x = Math.floor(f.b0 - pt.b0 + 1e-6) + 1, y = Math.max(x, Math.ceil(f.b1 - pt.b0 - 1e-6));
    const nmP = pt.S ? pt.grp + ' · ' + pt.ord + ' (' + nm1(pt.S) + ')' : pt.name;
    return nmP + '  ·  bars ' + x + '–' + y;
  };
  return ch;
}

/* ---- Strip the Willow (jig, 4x40 bars, four couples). The first couple strip all the way down and back up the set. ---- */
function buildStrip(meLady) {
  const ch = new Choreo();
  const G = meLady ? 'M1' : 'P', L = meLady ? 'P' : 'W1';
  for (let c = 1; c <= 4; c++) {
    ch.add(c === 1 ? G : 'M' + c, -SX, PL[c - 1], { kind: 'gent', couple: c });
    ch.add(c === 1 ? L : 'W' + c, SX, PL[c - 1], { kind: 'lady', couple: c });
  }
  const X = 0.45, Y = n => PL[n - 1], ord = ['', 'first', 'second', 'third', 'fourth'];
  ch.fig(0, 4, 'Turn partner by the right, two and a half times, down to the second place', 'turn', 'Hold TURN and spin right round with your partner.');
  ch.turn(G, L, 0, 4, 'R', 2.5, [X, Y(2)], [-X, Y(2)], 0.45);
  [2, 3, 4].forEach(j => { // down the set: the lady turns each man by the left while her partner runs on the spot
    const b = 4 * (j - 1), y = Y(j), yn = Y(Math.min(4, j + 1));
    ch.fig(b, b + 2, `First lady turns the ${ord[j]} man by the left`, 'turn', 'Left arm round the man. Her partner runs on the spot.');
    ch.turn(L, 'M' + j, b, b + 2, 'L', 1, [-X, y], [-SX, y], 0.34);
    ch.fig(b + 2, b + 4, j < 4 ? 'Turn partner by the right, down one place' : 'Turn partner by the right', 'turn', 'Right arm with your partner, then on to the next.');
    ch.turn(G, L, b + 2, b + 4, 'R', 2, [X, yn], [-X, yn], 0.45);
  });
  [4, 3, 2].forEach(j => { // and back up: the man turns each lady by the left while his partner runs on the spot
    const b = 16 + 4 * (4 - j), y = Y(j), yn = Y(Math.max(2, j - 1));
    ch.fig(b, b + 2, `First man turns the ${ord[j]} lady by the left`, 'turn', 'Left arm round the lady. His partner runs on the spot.');
    ch.turn(G, 'W' + j, b, b + 2, 'L', 1, [X, y], [SX, y], 0.34);
    ch.fig(b + 2, b + 4, j > 2 ? 'Turn partner by the right, up one place' : 'Turn partner by the right', 'turn', 'Right arm with your partner, then on to the next.');
    ch.turn(G, L, b + 2, b + 4, 'R', 2, [X, yn], [-X, yn], 0.45);
  });
  [2, 3, 4].forEach(j => { // both of you turn the next couple by the left; they step up; down you go again
    const b = 28 + 4 * (j - 2), y = Y(j), yn = Y(Math.min(4, j + 1)), last = j === 4;
    ch.fig(b, b + 2, `Turn the ${ord[j]} couple by the left`, 'turn', 'Lady with the man, man with the lady. They step up as you leave.');
    ch.turn(L, 'M' + j, b, b + 2, 'L', 1, [-X, y], [-SX, y], 0.34);
    ch.turn(G, 'W' + j, b, b + 2, 'L', 1, [X, y], [SX, y], 0.34);
    ch.moveTo('M' + j, b + 2, b + 4, -SX, Y(j - 1)); ch.moveTo('W' + j, b + 2, b + 4, SX, Y(j - 1));
    if (last) { ch.fig(b + 2, b + 4, 'Turn partner by the right into fourth place', 'turn', 'Last time down. Let go and you are at the bottom.'); ch.turn(G, L, b + 2, b + 4, 'R', 2.5, [-SX, Y(4)], [SX, Y(4)], 0.38); }
    else { ch.fig(b + 2, b + 4, 'Turn partner by the right, down one place', 'turn', 'Right arm with your partner, down to the next couple.'); ch.turn(G, L, b + 2, b + 4, 'R', 2, [X, yn], [-X, yn], 0.45); }
  });
  ch.holdAll(40);
  return ch;
}

const DANCES = {
  dws: {
    name: 'The Dashing White Sergeant', short: 'Dashing White Sergeant', meta: 'Reel · 3 face 3 · round the room',
    desc: me => `The friendliest reel at any ball. You dance in the middle of three and meet a new trio every 32 bars.`,
    bpm: 44, times: 2, tune: 0, build: lady => buildDWS(2, lady), view: 'dws', unlock: null, autoHand: true
  },
  r51: {
    name: 'The Reel of the 51st Division', short: 'Reel of the 51st', meta: 'Reel · 8×32 · 3 couples',
    desc: me => `Written in a prisoner-of-war camp in 1940. The diagonal lines make the Saltire. You dance as first ${me}.`,
    bpm: 46, times: 2, tune: 1, build: lady => buildLongwise(fiftyFirst, 2, lady), view: 'long', unlock: null
  },
  dop: {
    name: 'The Duke of Perth', short: 'Duke of Perth', meta: 'Reel · 8×32 · 3 couples',
    desc: me => `Broun's Reel. Turn corner, partner, corner, partner, and keep your hands straight. You dance as first ${me}.`,
    bpm: 48, times: 2, tune: 2, build: lady => buildLongwise(duke, 2, lady), view: 'long', unlock: null
  },
  dde: {
    name: 'The Duke and Duchess of Edinburgh', short: 'Duke & Duchess of Edinburgh', meta: 'Reel · 8×40 · 3 couples',
    desc: me => `RSCDS Book 39. Advance and retire (you can step back with S), turn partners twice round, cast and lead down and up, then the TEAPOTS: right hands across, left hands across, hand on hip. Corners and partner, then circle six. You dance as first ${me}.`,
    bpm: 46, times: 2, bars: 40, tune: 3, build: lady => buildLongwise(dukeDuchess, 2, lady, 40), view: 'long', unlock: null
  },
  fsr: {
    name: 'The Foursome Reel', short: 'Foursome Reel', meta: 'Reel · 2×32 · 2 couples in a line',
    desc: me => `Four dancers in a line, the men back to back in the middle. A reel of four across in which all four weave, all set, the reel again with the ladies coming home, all set. No circle, no turns. You dance as ${me === 'lady' ? 'the first lady' : 'the first man'}.`,
    bpm: 48, times: 2, tune: 4, build: lady => buildFoursome(lady), view: 'sq', unlock: null
  },
  esr: {
    name: 'The Eightsome Reel', short: 'Eightsome Reel', meta: 'Reel · 4 couples in a square set',
    desc: me => `Eight in a set. Circle, then the ladies' teapot (right hands across, gents round the waist) and the gents' teapot, set and turn partners, a quick grand chain (tap T for every hand) and a turn. Then each lady and each gent dances a short solo with two others while the rest stand still: set and turn partner and the opposite dancer, reel of three. The Ball plays a cut (two ladies, two gents). Spin like a helicopter if you dare.`,
    bpm: 48, times: 16, bars: 16, tune: 6, build: lady => buildEightsome(lady), view: 'sq', unlock: null
  },
  stw: {
    name: 'Strip the Willow', short: 'Strip the Willow', meta: 'Jig · 40 bars · 4 couples',
    desc: me => `The ceilidh favourite. Spin down the whole set, turning every man and lady by the left and your partner by the right, then back up and down again. You dance as first ${me}.`,
    bpm: 48, times: 1, bars: 40, tune: 5, build: lady => buildStrip(lady), view: 'long', unlock: null
  }
};
const DANCE_ORDER = ['dws', 'r51', 'dop', 'dde', 'fsr', 'esr', 'stw'];
const DIFFS = {
  ceilidh: { label: 'Ceilidh', speed: 0.85, tol: 0.08, mult: 1, note: 'Ceilidh: a slower band and a wider ring. You still steer every step yourself.' },
  ball: { label: 'Ball', speed: 1.0, tol: 0, mult: 1.3, note: 'Ball: proper tempo, normal ring. Points ×1.3.' },
  highland: { label: 'Highland', speed: 1.12, tol: -0.04, mult: 1.7, note: 'Highland: a fast band and a tight ring. Points ×1.7.' }
};
