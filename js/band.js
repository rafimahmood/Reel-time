/* Reel Time · band.js
   The band: a Scottish dance band synthesised live with the Web Audio API, and the ABC tune parser. */
"use strict";

/* ================= the band (Web Audio): a Scottish dance band ================= */
// The real tunes, in ABC: the RSCDS Dashing White Sergeant (Bishop), the Drunken Piper (danced to the 51st),
// and Bremner's 1757 Duke of Perth's Reel. All traditional and long out of copyright.
const TUNE_ABC = [
`M:2/4
L:1/16
K:D
|:"D"D2D2 DEFG | A^GAB A2fe | d2B2 A2F2 | "Em"B2E2 "A7"EGFE | "D"D2D2 DEFG | A^GAB A2f2 | "E7"e2d2 c2B2 |1 "A7"A2AB AGFE :|2 "A"A6 E2 |]
[| "A"A2AB c2cd | e2ec A2A2 | "Bm"BABc dcde | f2fd B2BB | "A7"c2AA "D"d2AA | "A7"e2AA "D"f2AA | "G"g2f2 e2d2 | "A7"c2B2 A2G2 | "D"F2d2 dcde | d2A2 A4 | "Em"B2e2 edef | e2B2 B4 | "D"A2d2 dcde | f2d2 dcde | f2z2 "A7"a2z2 | "D"d2cBAGFE |]`,
`M:2/4
L:1/8
K:Ador
|: E | A/A/A/c/ e>=f | e/d/c/d/ eg | G/G/G/B/ d>e | d/B/G/B/ de | A/A/A/c/ e>=f | e/d/c/d/ ea | ge/g/ e/=f/e/d/ | BAA :| |: e | ac ea | e/d/e/f/ ga | gG Bd | dG/B/ de | ac ea | e/d/e/f/ ga | ge/g/ e/=f/e/d/ | BAA :||`,
`M:C|
L:1/8
K:G
B|(G/A/B/c/ d)B gBdB|gBdB aAAB|(G/A/B/c/ d)B dBdB|cAdc BG G:| |:f|gage abaf|gage beef|gage abaf|gddc BG G:|]`,
// The Flowers of Edinburgh (traditional, 1749)
`M:C|
L:1/8
K:G
|: GE | "G"D2DE G2GA | BGBd cBAG | "D7"FGFE DEFG | AFdF E2GE || "G"D2DE G2GA | BGBd "C"efge | "G"dcBA "D7"GFGA | "G"B2G2 G2 :: d2 | "G"g2gd gbag | "D7"f2fd fagf | "Em"e2ef gfed | B2e2 "C"e2ge || "G"dBGB d2d2 | "C"edef g2fe | "G"dcBA "D7"GFGA | "G"B2G2 G2 :| GE | "G"D2DE G2GA | BGBd cBAG | "D7"FGFE DEFG | AFdF E2GE | "G"D2DE G2GA | BGBd "C"efge | "G"dcBA "D7"GFGA | "G"B2G2 G2 |]`, // played AABBA: forty bars for the Duke and Duchess
// Hamish the Carpenter (traditional Scottish reel), for the Foursome Reel
`M:4/4
L:1/8
K:Am
AB|"Am"A2 GE GABd|"G"e2dB degB|"Am"A2 GE GABd|"Em"egdB "Am"A2 AB|"Am"A2 GE GABd|"Em"e2 dB dega|"C"gedB "G"GABd|"Em"egdB "Am"A2:||:AB|"Am"Aaab a2 ge|"G"gaba gedB|"Am"Aaab a2 ge|"G"dBgB A/A/A AB|"Am"Aaab a2 ge|"G"gaba gedB|"F"Agab ageg|"G"dBgB "Am"A2:|`,
// The Rakes of Mallow (traditional), for Strip the Willow
`M:2/4
L:1/16
K:G
|: "G"G2B2 G2B2 | G2B2 cBAG | "D"F2A2 F2A2 | F2A2 dcBA | "G"G2B2 G2B2 | G2B2 edcB | "C"cBAG "D7"FGAB | "G"G4 G4 :| |: "G"g2fe d2c2 | B2c2 d4 | g2fe d2c2 | B2d2 "D7"A4 | "G"g2fe d2c2 | B2G2 "Am"c4 | "D7"cBAG FGAB | "G"G4 G4 :|`,
// The Eightsome Rant: an original reel in the traditional idiom, for the Eightsome Reel
`M:C|
L:1/8
K:D
|: "D"A2FA dAFA | "G"B2GB dBGB | "D"A2FA d2fd | "A7"ecAc e4 | "D"A2FA dAFA | "G"B2GB dBGB | "D"AFAd "A7"cdec | "D"d2f2 d4 :| |: "D"f2fa f2fd | "A7"e2ec A2ce | "D"d2df a2af | "A7"gece g4 | "G"B2GB d2gd | "D"A2FA d2fd | "A7"e2ce a2ge | "D"f2d2 d4 :|`
];
const TUNE_NAMES = ['The Dashing White Sergeant', 'The Drunken Piper', "The Duke of Perth's Reel", 'The Flowers of Edinburgh', 'Hamish the Carpenter', 'The Rakes of Mallow', 'The Eightsome Rant'];
const mtof = m => 440 * Math.pow(2, (m - 69) / 12);
// Tiny ABC reader: enough for traditional dance tunes (repeats, endings, broken rhythm, accidentals, chords).
const ABC_KEYS = { C: 0, G: 1, D: 2, A: 3, E: 4, F: -1, Bb: -2 };
const MODES = { '': 0, maj: 0, m: -3, min: -3, dor: -2, mix: -1 };
function keyAccidentals(k) {
  const m = /^([A-G][b#]?)(.*)$/.exec(k.trim()); if (!m) return {};
  const tonic = m[1], mode = (m[2] || '').toLowerCase().slice(0, 3);
  const fifthsOf = { C: 0, G: 1, D: 2, A: 3, E: 4, B: 5, 'F#': 6, F: -1, Bb: -2, Eb: -3 };
  const n = (fifthsOf[tonic] || 0) + (MODES[mode] != null ? MODES[mode] : 0);
  const sharps = ['F', 'C', 'G', 'D', 'A', 'E', 'B'], flats = ['B', 'E', 'A', 'D', 'G', 'C', 'F'];
  const acc = {}; if (n > 0) sharps.slice(0, n).forEach(x => acc[x] = 1); if (n < 0) flats.slice(0, -n).forEach(x => acc[x] = -1);
  return { acc, tonic, mode };
}
function parseABC(src) {
  let L = 1 / 8, M = [2, 4], K = 'C';
  const body = [];
  src.split('\n').forEach(line => { const h = /^([A-Za-z]):\s*(.*)$/.exec(line.trim()); if (h && 'LMKXTRBZNHCQ'.includes(h[1])) { if (h[1] === 'L') { const [a, b] = h[2].split('/').map(Number); L = a / b; } if (h[1] === 'M') M = h[2].trim() === 'C|' ? [2, 2] : h[2].trim() === 'C' ? [4, 4] : h[2].split('/').map(Number); if (h[1] === 'K') K = h[2].trim(); } else body.push(line); });
  const key = keyAccidentals(K);
  const s = body.join(' ');
  const BASE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const out = []; const chords = []; let pendingChord = null;
  let barAcc = {}, repStart = 0, end1 = null, broken = 0, firstBarUnits = null, units = 0, tupN = 0, tupF = 1;
  let i = 0;
  const num = () => { let a = ''; while (i < s.length && /[0-9]/.test(s[i])) a += s[i++]; return a; };
  const readLen = () => {
    let n = num(), d = 1; let m = n ? +n : 1;
    while (s[i] === '/') { i++; const dd = num(); d *= dd ? +dd : 2; }
    return m / d;
  };
  const copy = (a, b) => out.slice(a, b).map(o => ({ ...o }));
  const bar = () => { barAcc = {}; if (firstBarUnits == null && units > 0) firstBarUnits = units; };
  while (i < s.length) {
    const c = s[i];
    if (c === '"') { const j = s.indexOf('"', i + 1); pendingChord = s.slice(i + 1, j); i = j + 1; continue; }
    if (c === '{') { i = s.indexOf('}', i) + 1; continue; }
    if (c === '!' || c === '+') { const j = s.indexOf(c, i + 1); i = j > i ? j + 1 : i + 1; continue; }
    if (c === '(' && /[2-9]/.test(s[i + 1])) { tupN = +s[i + 1]; tupF = tupN === 3 ? 2 / 3 : tupN === 2 ? 3 / 2 : 1; i += 2; continue; }
    if (' ()-~.HTuv\\\t'.includes(c)) { i++; continue; }
    if (c === '>' || c === '<') { const p = out[out.length - 1]; if (p) { const f = c === '>' ? 1.5 : 0.5; units += p.dur * (f - 1); p.dur *= f; broken = c === '>' ? 0.5 : 1.5; } i++; continue; }
    if (c === ':' || c === '|' || c === '[' || c === ']') {
      let tok = ''; while (i < s.length && ':|[]12'.includes(s[i])) { if ((s[i] === '1' || s[i] === '2') && !(tok.endsWith('|') || tok.endsWith('['))) break; tok += s[i++]; }
      if (tok === '[') { /* chord bracket not used */ continue; }
      const repEnd = tok.startsWith(':') || tok.includes(':|');
      if (repEnd) { const seg = end1 != null ? copy(repStart, end1) : copy(repStart); seg.forEach(o => { units += o.dur; out.push(o); }); end1 = null; }
      if (tok.includes('1')) end1 = out.length;
      if (tok.includes('|:') || tok.includes('::') || (repEnd && !tok.includes('2'))) repStart = out.length;
      if (tok.includes('|:')) repStart = out.length;
      bar(); continue;
    }
    // note or rest
    let acc = null;
    while ('^=_'.includes(s[i])) { acc = (acc || 0) + (s[i] === '^' ? 1 : s[i] === '_' ? -1 : 0); if (s[i] === '=') acc = 0; i++; }
    const ch = s[i];
    if (/[A-Ga-gzx]/.test(ch)) {
      i++;
      let midi = null;
      if (ch !== 'z' && ch !== 'x') {
        const up = ch.toUpperCase(); let oct = ch === up ? 0 : 12;
        while (s[i] === ',' || s[i] === "'") { oct += s[i] === "'" ? 12 : -12; i++; }
        if (acc != null) barAcc[up + oct] = acc;
        const a = barAcc[up + oct] != null ? barAcc[up + oct] : (key.acc && key.acc[up]) || 0;
        midi = 60 + BASE[up] + oct + a;
      }
      let dur = readLen();
      if (broken) { dur *= broken; broken = 0; }
      if (tupN) { dur *= tupF; tupN--; }
      if (pendingChord) { chords.push({ at: out.length, name: pendingChord }); pendingChord = null; }
      out.push({ midi, dur }); units += dur; continue;
    }
    i++;
  }
  // timing in bars; anything before the first bar line is a pickup
  const upb = (M[0] / M[1]) / L;
  const pickup = firstBarUnits && firstBarUnits < upb - 1e-6 ? firstBarUnits : 0;
  let u = -pickup;
  const notes = out.map(o => { const n = { t: u / upb, d: o.dur / upb, midi: o.midi }; u += o.dur; return n; });
  const ch2 = chords.map(c => ({ t: notes[c.at] ? notes[c.at].t : 0, name: c.name }));
  return { notes, chords: ch2, bars: Math.round((u + pickup) / upb), key };
}

// harmony: written chords where the tune has them, otherwise the best-fitting diatonic chord per half bar
function chordName(n) {
  const m = /^([A-G])([#b]?)(m?)(7?)/.exec(n); if (!m) return null;
  const root = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const pcs = [root, root + (m[3] ? 3 : 4), root + 7]; if (m[4]) pcs.push(root + 10);
  return { root: (root + 12) % 12, pcs: pcs.map(p => p % 12) };
}
function harmonise(tune) {
  const tonicPc = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 }[tune.key.tonic[0]];
  const mode = tune.key.mode || '';
  const steps = mode.startsWith('dor') ? [0, 2, 3, 5, 7, 9, 10] : mode.startsWith('m') && !mode.startsWith('mix') ? [0, 2, 3, 5, 7, 8, 10] : [0, 2, 4, 5, 7, 9, 11];
  const scale = steps.map(s => (tonicPc + s) % 12);
  const cands = scale.map((r, i) => ({ root: r, pcs: [r, scale[(i + 2) % 7], scale[(i + 4) % 7]], w: [1, 0.55, 0.45, 0.9, 1, 0.6, 0.85][i] }));
  const out = [];
  for (let h = 0; h < tune.bars * 2; h++) {
    const t0 = h / 2, t1 = t0 + 0.5;
    const written = tune.chords.filter(c => c.t <= t0 + 1e-6).pop();
    if (tune.chords.length && written) { out.push(chordName(written.name)); continue; }
    const w = new Array(12).fill(0);
    tune.notes.forEach(n => { if (n.midi == null) return; const a = Math.max(t0, n.t), b = Math.min(t1, n.t + n.d); if (b > a) w[n.midi % 12] += (b - a) * (Math.abs(n.t - t0) < 1e-6 ? 2 : 1); });
    let best = cands[0], bs = -1;
    cands.forEach(c => { const sc = c.pcs.reduce((s, p, i) => s + w[p] * (i === 0 ? 1.2 : 1), 0) * c.w + (c.root === tonicPc ? 0.01 : 0); if (sc > bs) { bs = sc; best = c; } });
    out.push(best);
  }
  return out;
}
const TUNES = TUNE_ABC.map(src => { const t = parseABC(src); t.harm = harmonise(t); return t; });

class Band {
  constructor() { this.ctx = null; this.on = SAVE.music; this.timer = null; }
  ensure() {
    if (this.ctx) return this.ctx;
    try {
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
      this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = this.on ? 0.6 : 0;
      const comp = this.ctx.createDynamicsCompressor(); comp.threshold.value = -18; comp.ratio.value = 3;
      // a little room: short feedback delay as a hall reverb
      const dl = this.ctx.createDelay(); dl.delayTime.value = 0.09; const fb = this.ctx.createGain(); fb.gain.value = 0.25; const wet = this.ctx.createGain(); wet.gain.value = 0.18; const lpR = this.ctx.createBiquadFilter(); lpR.type = 'lowpass'; lpR.frequency.value = 2500;
      this.master.connect(comp); this.master.connect(dl); dl.connect(lpR); lpR.connect(fb); fb.connect(dl); lpR.connect(wet); wet.connect(comp);
      comp.connect(this.ctx.destination);
      const len = this.ctx.sampleRate * 0.3; this.noise = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noise.getChannelData(0); for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch (e) { this.ctx = null; }
    return this.ctx;
  }
  running() { return this.ctx && this.ctx.state === 'running' && !window.__TS; }
  setOn(v) { this.on = v; if (this.master) this.master.gain.setTargetAtTime(v ? 0.6 : 0, this.ctx.currentTime, 0.05); }
  env(g, t, a, peak, sus, dur, rel) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak * sus), t + a + 0.08); g.gain.setValueAtTime(Math.max(0.0002, peak * sus), t + dur); g.gain.exponentialRampToValueAtTime(0.0001, t + dur + rel); }
  // lead: a two-reed musette accordion (the second reed tuned sharp gives the shimmer) with a bassoon reed underneath
  accordion(f, t, dur, vol, dry) {
    const c = this.ctx, g = c.createGain(), lp = c.createBiquadFilter(), pk = c.createBiquadFilter();
    lp.type = 'lowpass'; lp.frequency.value = 3600; lp.Q.value = 0.7; pk.type = 'peaking'; pk.frequency.value = 1400; pk.gain.value = 4; pk.Q.value = 1.2;
    const reeds = dry ? [[1, 'sawtooth', 0.55], [0.5, 'square', 0.2]] : [[0.9937, 'sawtooth', 0.34], [1, 'sawtooth', 0.4], [1.0072, 'sawtooth', 0.34], [0.5, 'square', 0.18]];
    reeds.forEach(([m, type, v]) => { const o = c.createOscillator(), og = c.createGain(); o.type = type; o.frequency.value = f * m; og.gain.value = v; o.connect(og); og.connect(pk); o.start(t); o.stop(t + dur + 0.1); });
    pk.connect(lp); lp.connect(g); g.connect(this.master); this.env(g, t, 0.008, vol, 0.72, dur * 0.9, 0.04);
  }
  // brushed snare
  snare(t, v) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1900; f.Q.value = 0.8; s.connect(f); f.connect(g); g.connect(this.master); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.14); s.start(t); s.stop(t + 0.16); }
  // a stamp on the sprung floor
  stomp(vol = 0.4) { if (!this.ctx || this.ctx.state !== 'running' || !this.on) return; const c = this.ctx, t = c.currentTime, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(120, t); o.frequency.exponentialRampToValueAtTime(48, t + 0.11); o.connect(g); g.connect(this.master); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18); o.start(t); o.stop(t + 0.2); this.brush(t, vol * 0.25); }
  // fiddle: bowed saw with vibrato through a body resonance
  fiddle(f, t, dur, vol) {
    const c = this.ctx, o = c.createOscillator(), g = c.createGain(), bp = c.createBiquadFilter(), lfo = c.createOscillator(), lg = c.createGain();
    o.type = 'sawtooth'; o.frequency.value = f; lfo.frequency.value = 5.6; lg.gain.value = f * 0.005; lfo.connect(lg); lg.connect(o.frequency);
    bp.type = 'peaking'; bp.frequency.value = 2600; bp.gain.value = 6; const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 5200;
    o.connect(bp); bp.connect(lp); lp.connect(g); g.connect(this.master); this.env(g, t, 0.03, vol, 0.75, dur * 0.9, 0.06);
    o.start(t); o.stop(t + dur + 0.12); lfo.start(t); lfo.stop(t + dur + 0.12);
  }
  // piano vamp chord: struck, decaying
  piano(fs, t, vol) {
    const c = this.ctx;
    fs.forEach(f => { [[1, 'triangle', 1], [2, 'sine', 0.35], [3, 'sine', 0.12]].forEach(([m, type, v]) => { const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.value = f * m; o.connect(g); g.connect(this.master); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol * v, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32); o.start(t); o.stop(t + 0.36); }); });
  }
  bass(f, t, dur) { const c = this.ctx, o = c.createOscillator(), o2 = c.createOscillator(), g = c.createGain(), lp = c.createBiquadFilter(); o.type = 'triangle'; o2.type = 'sine'; o.frequency.value = f; o2.frequency.value = f; lp.type = 'lowpass'; lp.frequency.value = 700; o.connect(lp); o2.connect(lp); lp.connect(g); g.connect(this.master); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.5, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); o.start(t); o2.start(t); o.stop(t + dur + 0.02); o2.stop(t + dur + 0.02); }
  kick(t, v = 0.42) { const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.frequency.setValueAtTime(95, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); o.connect(g); g.connect(this.master); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.16); o.start(t); o.stop(t + 0.2); }
  brush(t, v) { const c = this.ctx, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 3800; f.Q.value = 0.6; s.connect(f); f.connect(g); g.connect(this.master); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.09); s.start(t); s.stop(t + 0.11); }
  play(tuneIdx, barDur, introBars, totalBars) {
    if (!this.ensure()) return null;
    try { this.ctx.resume(); } catch (e) { }
    this.stop();
    const tune = TUNES[tuneIdx], N = tune.bars;
    const start = this.ctx.currentTime + 0.25, bar0 = start + introBars * barDur;
    // everything the band will play, in time order
    const ev = [];
    // a little lilt: the off-beat quavers sit slightly late, as a dance band plays them
    const lilt = tb => { const q = tb * 8, f = q - Math.floor(q); return Math.abs(f) < 1e-6 && Math.floor(q) % 2 === 1 ? tb + 0.012 : tb; };
    for (let rep = 0; rep * N < totalBars + 1; rep++) tune.notes.forEach(n => { const tb = n.t + rep * N; if (n.midi != null && tb >= -0.5 && tb < totalBars) ev.push({ t: lilt(tb), k: 'n', n, rep }); });
    ev.push({ t: -introBars, k: 'chord', c: tune.harm[0] }); // the chord for honours
    for (let h = 0; h < totalBars * 2; h++) {
      const hc = tune.harm[h % (N * 2)];
      ev.push({ t: h / 2, k: 'b', c: hc, first: h % 2 === 0 }); ev.push({ t: h / 2 + 0.25, k: 'c', c: hc });
      ev.push({ t: h / 2 + 0.125, k: 'br' }); ev.push({ t: h / 2 + 0.375, k: 'br' });
      if (h % 16 === 15) [0, 1, 2, 3, 4, 5].forEach(r2 => ev.push({ t: h / 2 + 0.25 + r2 * 0.0417, k: 'roll', v: 0.04 + r2 * 0.012 })); // a snare roll into each new phrase
    }
    ev.push({ t: totalBars, k: 'end', c: tune.harm[0] });
    ev.sort((a, b) => a.t - b.t);
    const root = tune.harm[0].root;
    let i = 0;
    const tick = () => {
      const c = this.ctx; if (!c) return;
      while (i < ev.length && bar0 + ev[i].t * barDur < c.currentTime + 0.25) {
        const e = ev[i++], at = bar0 + e.t * barDur;
        if (at < c.currentTime - 0.05) continue;
        if (e.k === 'n') {
          const f = mtof(e.n.midi), d = e.n.d * barDur, onBeat = Math.abs(e.n.t * 4 - Math.round(e.n.t * 4)) < 1e-3;
          this.accordion(f, at, d, onBeat ? 0.072 : 0.06);
          if (e.rep % 2 === 1) this.fiddle(f * (e.n.midi < 67 ? 2 : 1), at, d, 0.03); // the fiddle joins second time through
          // second box: the chord note a third or so below the tune, on the beats
          if (onBeat && e.t >= 0) { const hc = tune.harm[Math.floor(e.n.t * 2) % (N * 2)]; if (hc) { let below = null; for (let m = e.n.midi - 3; m > e.n.midi - 10; m--) if (hc.pcs.includes(((m % 12) + 12) % 12)) { below = m; break; } if (below) this.accordion(mtof(below), at, Math.min(d, barDur * 0.25), 0.032, true); } }
        } else if (e.k === 'chord') {
          const fs = e.c.pcs.slice(0, 3).map(p => mtof(55 + ((p - 7 + 12) % 12)));
          this.piano(fs, at, 0.12); this.bass(mtof(36 + e.c.root), at, barDur * 1.2);
          fs.forEach(f => this.accordion(f * 2, at, barDur * 1.1, 0.05));
        } else if (e.k === 'b') {
          const r = e.c.root, f = mtof(36 + ((r - 0 + 12) % 12) + (r > 7 ? -12 : 0) + 12);
          this.bass(e.first ? f : f * 1.5, at, barDur * 0.42);
          this.piano([f * 2, f * 4], at, 0.045); // piano left hand: the bass on the beat
          if (e.first) this.kick(at, 0.34); else this.snare(at, 0.11);
        } else if (e.k === 'br') { this.brush(at, 0.035);
        } else if (e.k === 'roll') { this.snare(at, e.v);
        } else if (e.k === 'c') {
          const fs = e.c.pcs.slice(0, 3).map(p => mtof(55 + ((p - 7 + 12) % 12)));
          this.piano(fs, at, 0.055); // piano right hand: the off-beat vamp
        } else if (e.k === 'end') {
          const fs = e.c.pcs.slice(0, 3).map(p => mtof(55 + ((p - 7 + 12) % 12)));
          this.piano(fs, at, 0.1); this.bass(mtof(36 + e.c.root), at, barDur); this.accordion(mtof(60 + ((e.c.root + 12) % 12) + 12), at, barDur * 1.2, 0.08);
        }
      }
    };
    tick(); this.timer = setInterval(tick, 30);
    return bar0;
  }
  stop() { if (this.timer) clearInterval(this.timer); this.timer = null; }
  // a hooch: a voice-like whoop rising then falling
  whoop(pitch = 1, vol = 0.12, delay = 0) {
    if (!this.ctx || this.ctx.state !== 'running' || !this.on) return;
    const c = this.ctx, t = c.currentTime + delay, o = c.createOscillator(), bp = c.createBiquadFilter(), g = c.createGain();
    o.type = 'sawtooth'; o.frequency.setValueAtTime(260 * pitch, t); o.frequency.exponentialRampToValueAtTime(780 * pitch, t + 0.13); o.frequency.exponentialRampToValueAtTime(430 * pitch, t + 0.42);
    bp.type = 'bandpass'; bp.frequency.setValueAtTime(900, t); bp.frequency.linearRampToValueAtTime(1500, t + 0.13); bp.Q.value = 2.5;
    o.connect(bp); bp.connect(g); g.connect(this.master);
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.04); g.gain.exponentialRampToValueAtTime(vol * 0.6, t + 0.3); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
    o.start(t); o.stop(t + 0.5);
  }
  clap(vol = 0.2, delay = 0) { if (!this.ctx || this.ctx.state !== 'running' || !this.on) return; const c = this.ctx, t = c.currentTime + delay; [0, 0.012, 0.024].forEach(o => { const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain(); s.buffer = this.noise; f.type = 'bandpass'; f.frequency.value = 1300; f.Q.value = 1.2; s.connect(f); f.connect(g); g.connect(this.master); g.gain.setValueAtTime(vol, t + o); g.gain.exponentialRampToValueAtTime(0.001, t + o + 0.07); s.start(t + o); s.stop(t + o + 0.09); }); }
  applause() { if (!this.ctx || this.ctx.state !== 'running' || !this.on) return; const t0 = this.ctx.currentTime; for (let i = 0; i < 160; i++) this.brush(t0 + Math.random() * 2.6 * Math.sqrt(Math.random()), 0.05 + Math.random() * 0.08); for (let i = 0; i < 40; i++) this.clap(0.03 + Math.random() * 0.05, Math.random() * 3 * Math.sqrt(Math.random())); [0.1, 0.55, 1.1, 1.7].forEach((d, i) => humanHooch({ kind: i % 2 ? 'lady' : 'gent', vol: 0.1, crowd: 4, excite: 1, delay: d + Math.random() * 0.15, pitch: 1.05 })); }
  blip(f, d = 0.08, v = 0.12) { if (!this.ctx || this.ctx.state !== 'running') return; const c = this.ctx, o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; o.connect(g); g.connect(this.master); const t = c.currentTime; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.001, t + d); o.start(t); o.stop(t + d + 0.02); }
}
const band = new Band();

/* ---------- a human-sounding "Heuch!": glottal saw through formant filters, breath, jitter, room ---------- */
// vowel formants (F1..F4 Hz) for the glide  oo -> ee -> aa
const VOWELS = { u: [300, 870, 2240, 3300], i: [270, 2290, 3010, 3500], a: [800, 1250, 2550, 3400], o: [450, 800, 2500, 3400] };
function hoochVerbIR(ctx) { // a small hall: decaying stereo noise, darker as it fades
  const len = Math.floor(ctx.sampleRate * 1.3), ir = ctx.createBuffer(2, len, ctx.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); let lp = 0; for (let i = 0; i < len; i++) { const e = Math.pow(1 - i / len, 2.6); lp += ((Math.random() * 2 - 1) - lp) * (0.9 - 0.7 * i / len); d[i] = lp * e * 0.9; } }
  return ir;
}
// one voice. rig = { ctx, dest, noise, verb } so it works on a live or an offline context
function humanHoochVoice(rig, t, p) {
  const c = rig.ctx, lady = p.kind === 'lady', R = Math.random;
  const f0 = (lady ? 330 : 150) * (p.pitch || 1) * Math.pow(2, (R() - 0.5) * 0.18) * Math.pow(2, (p.detune || 0) / 1200);
  const dur = (p.dur || (0.52 + R() * 0.26)), fs = lady ? 1.15 : 1.0 + R() * 0.04; // formant scale: shorter tract, higher formants
  const out = c.createGain(); out.gain.value = 1;
  const pan = c.createStereoPanner ? c.createStereoPanner() : null; if (pan) { pan.pan.value = p.pan || 0; out.connect(pan); }
  const tail = pan || out;
  const dry = c.createGain(), wet = c.createGain(); dry.gain.value = 1; wet.gain.value = p.wet != null ? p.wet : 0.35;
  tail.connect(dry); dry.connect(rig.dest); if (rig.verb) { tail.connect(wet); wet.connect(rig.verb); }
  // the pitch: a swoop up into the shout, held with vibrato and a little jitter, falling away
  const N = 96, curve = new Float32Array(N), vibHz = 5 + R() * 1.2, vibD = 0.012 + R() * 0.012, ph0 = R() * 6.28;
  for (let i = 0; i < N; i++) { const u = i / (N - 1), tt = u * dur;
    const env = u < 0.12 ? 0.82 + u / 0.12 * 0.28 : u < 0.4 ? 1.1 + (u - 0.12) / 0.28 * 0.38 : 1.48 - (u - 0.4) / 0.6 * 0.58; // low -> peak ~40% -> fall
    const vib = 1 + vibD * Math.min(1, Math.max(0, (u - 0.25) / 0.3)) * Math.sin(ph0 + tt * vibHz * 6.283);
    curve[i] = f0 * env * vib * (1 + (R() - 0.5) * 0.014 * (1 + 2 * (p.excite || 0))); }
  const src = c.createOscillator(); src.type = 'sawtooth'; src.frequency.setValueAtTime(curve[0], t); try { src.frequency.setValueCurveAtTime(curve, t, dur); } catch (e) { }
  const tilt = c.createBiquadFilter(); tilt.type = 'lowpass'; tilt.frequency.value = lady ? 3800 : 3000; tilt.Q.value = 0.5; // glottal spectral tilt
  src.connect(tilt);
  // the vowel glide through four formant band-passes
  const g1 = [1, 0.62, 0.3, 0.14], Qs = [7, 9, 11, 12], voiced = c.createGain(); voiced.gain.value = 0;
  const seq = [[0, 'u'], [0.16, 'i'], [0.5, 'a'], [1, 'o']];
  for (let k = 0; k < 4; k++) {
    const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.Q.value = Qs[k]; const fg = c.createGain(); fg.gain.value = g1[k] * 1.8;
    bp.frequency.setValueAtTime(VOWELS[seq[0][1]][k] * fs, t);
    seq.slice(1).forEach(([u, v]) => bp.frequency.linearRampToValueAtTime(VOWELS[v][k] * fs * (1 + (R() - 0.5) * 0.03), t + u * dur));
    tilt.connect(bp); bp.connect(fg); fg.connect(voiced);
    if (p.noise !== false) { const nz = c.createBufferSource(); nz.buffer = rig.noise; nz.loop = true; const ng = c.createGain(); ng.gain.value = 0.12 * g1[k]; // aspirated breath through the same tract
      const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.Q.value = Qs[k]; bq.frequency.setValueAtTime(VOWELS[seq[0][1]][k] * fs, t); seq.slice(1).forEach(([u, v]) => bq.frequency.linearRampToValueAtTime(VOWELS[v][k] * fs, t + u * dur));
      nz.connect(bq); bq.connect(ng); ng.connect(voiced); nz.start(t); nz.stop(t + dur + 0.1); }
  }
  // loudness: breathy onset, pushed shout, ringing out
  const v = (p.vol || 0.15);
  voiced.gain.setValueAtTime(0.0001, t); voiced.gain.setValueAtTime(0.0001, t + 0.05); voiced.gain.exponentialRampToValueAtTime(v, t + 0.12);
  voiced.gain.exponentialRampToValueAtTime(v * 1.25, t + dur * 0.4); voiced.gain.exponentialRampToValueAtTime(v * 0.45, t + dur * 0.8); voiced.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  const shape = c.createWaveShaper(); const cv = new Float32Array(257); for (let i = 0; i < 257; i++) { const x = i / 128 - 1; cv[i] = Math.tanh(x * 1.8); } shape.curve = cv; // the grit of effort
  voiced.connect(shape); shape.connect(out);
  src.start(t); src.stop(t + dur + 0.05);
  // the "H" of Heuch: a short breath burst; and the "ch" on the end
  const burst = (at, len, hz, vol2, q) => { const nz = c.createBufferSource(); nz.buffer = rig.noise; nz.loop = true; const bq = c.createBiquadFilter(); bq.type = 'bandpass'; bq.frequency.value = hz; bq.Q.value = q; const ng = c.createGain();
    ng.gain.setValueAtTime(0.0001, at); ng.gain.exponentialRampToValueAtTime(vol2, at + len * 0.35); ng.gain.exponentialRampToValueAtTime(0.0001, at + len); nz.connect(bq); bq.connect(ng); ng.connect(out); nz.start(at); nz.stop(at + len + 0.02); };
  burst(t, 0.1, 1800 * fs, v * 0.9, 0.7);
  burst(t + dur * 0.78, 0.14, 3800, v * 0.25, 1.1);
  return dur;
}
// the whole thing: opts { kind:'lady'|'gent', person, vol, delay, crowd (extra voices), excite, wet }
function humanHooch(opts) {
  opts = opts || {};
  if (window.__TS) return 0;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) { // no WebAudio at all: fall back to the browser voice
    if (SAVE.voice) try { const s = window.speechSynthesis; if (s) { const u = new SpeechSynthesisUtterance('Heuch!'); u.pitch = opts.kind === 'lady' ? 1.5 : 0.8; u.rate = 1.1; u.volume = 0.8; s.speak(u); } } catch (e) { }
    return 0;
  }
  const c = band.ctx; if (!c || c.state !== 'running' || !band.on) return 0;
  if (!band.hoochRig) { band.hoochRig = { ctx: c, dest: band.master, noise: band.noise, verb: null }; try { const cv = c.createConvolver(); cv.buffer = hoochVerbIR(c); const vg = c.createGain(); vg.gain.value = 0.8; cv.connect(vg); vg.connect(band.master); band.hoochRig.verb = cv; } catch (e) { } }
  const rig = band.hoochRig, t0 = c.currentTime + (opts.delay || 0), per = opts.person;
  const h = per ? hashId(per.id || per.name || 'x') : Math.floor(Math.random() * 1e6);
  const kind = opts.kind || (per && per.kind) || 'gent';
  const base = { kind, vol: opts.vol || 0.15, excite: opts.excite || 0, wet: opts.wet, pitch: (opts.pitch || 1) * (0.9 + (h % 21) / 100) * (per && per.height ? Math.pow(1.7 / per.height, 1.2) : 1) }; // each singer has their own pitch
  let dur = humanHoochVoice(rig, t0, base);
  for (let i = 0; i < (opts.crowd || 0); i++) { // a small crowd: detuned, late, either sex, spread across the room
    const k2 = Math.random() < 0.5 ? 'lady' : 'gent';
    humanHoochVoice(rig, t0 + 0.02 + Math.random() * 0.14, { kind: k2, vol: base.vol * (0.55 - 0.05 * i), excite: base.excite, wet: 0.5, pitch: 0.92 + Math.random() * 0.2, detune: (Math.random() - 0.5) * 60, pan: (Math.random() - 0.5) * 1.4, noise: i < 2 });
  }
  return dur;
}
window.humanHoochVoice = humanHoochVoice; window.hoochVerbIR = hoochVerbIR;

// The caller: pick the most natural voice on offer (en-GB first), speak slowly and steadily
let callerVoice;
function pickCallerVoice() {
  try {
    const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || []; if (!vs.length) return null;
    const want = ['natural', 'neural', 'premium', 'enhanced', 'daniel', 'serena', 'kate', 'fiona', 'google uk english', 'martha', 'oliver', 'stephanie'];
    let best = null, bs = -1;
    vs.forEach(v => { const n = v.name.toLowerCase(), l = (v.lang || '').replace('_', '-').toLowerCase(); let s = 0;
      if (l.startsWith('en-gb')) s += 40; else if (l.startsWith('en-ie') || l.startsWith('en-au')) s += 15; else if (l.startsWith('en')) s += 8; else return;
      want.forEach((w, i) => { if (n.includes(w)) s += 30 - i; }); if (/compact|espeak|robot/.test(n)) s -= 25; if (!v.localService) s += 3;
      if (s > bs) { bs = s; best = v; } });
    return best;
  } catch (e) { return null; }
}
try { if (window.speechSynthesis) speechSynthesis.addEventListener('voiceschanged', () => { callerVoice = undefined; }); } catch (e) { }
function say(text) {
  if (!SAVE.voice || window.__TS) return;
  try {
    const s = window.speechSynthesis; if (!s) return; s.cancel();
    if (callerVoice === undefined) callerVoice = pickCallerVoice();
    const u = new SpeechSynthesisUtterance(text); u.rate = 0.9; u.pitch = 1; u.volume = 0.9;
    if (callerVoice) { u.voice = callerVoice; u.lang = callerVoice.lang; } else u.lang = 'en-GB';
    s.speak(u);
  } catch (e) { }
}
