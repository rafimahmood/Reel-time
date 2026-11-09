/* Reel Time · choreo.js
   Utilities and the choreography builder: turns, casts, circles, reels of three and setting, turned into every dancer's path through time. */
"use strict";

/* ================= utilities ================= */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const lerp = (a, b, u) => a + (b - a) * u;
const smooth = u => u * u * (3 - 2 * u);
const easeTurn = u => 0.45 * u + 0.55 * smooth(u);
// a long spin (two or more turns) is steadier, so each full circle takes about the same time
const spinEase = (u, rot) => rot >= 2 ? 0.8 * u + 0.2 * smooth(u) : easeTurn(u);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const angDiff = (a, b) => ((b - a + Math.PI) % TAU + TAU) % TAU - Math.PI;
const $ = id => document.getElementById(id);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function sampleTrack(tr, t) {
  if (t <= tr[0].t) return { x: tr[0].x, y: tr[0].y };
  const n = tr.length;
  if (t >= tr[n - 1].t) return { x: tr[n - 1].x, y: tr[n - 1].y };
  let lo = 0, hi = n - 1;
  while (hi - lo > 1) { const m = (lo + hi) >> 1; if (tr[m].t <= t) lo = m; else hi = m; }
  const a = tr[lo], b = tr[hi];
  const u = (t - a.t) / ((b.t - a.t) || 1);
  return { x: lerp(a.x, b.x, u), y: lerp(a.y, b.y, u) };
}

function hashId(id) { let h = 7; for (const c of String(id)) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; }

/* ================= choreography builder ================= */
class Choreo {
  constructor() { this.tr = {}; this.meta = {}; this.figs = []; this.ev = []; this.links = []; this.sets = []; this.arches = []; }
  add(id, x, y, meta) { this.tr[id] = [{ t: -999, x, y }]; this.meta[id] = meta; }
  last(id) { const tr = this.tr[id]; return tr[tr.length - 1]; }
  at(id, t) { return sampleTrack(this.tr[id], t); }
  hold(id, t) { const l = this.last(id); if (t > l.t + 1e-6) this.tr[id].push({ t, x: l.x, y: l.y }); }
  holdAll(t) { Object.keys(this.tr).forEach(id => this.hold(id, t)); }
  gen(id, b0, b1, f) {
    this.hold(id, b0);
    const s = { ...this.at(id, b0) };
    const N = Math.max(2, Math.ceil((b1 - b0) * 16));
    for (let i = 1; i <= N; i++) { const u = i / N; const p = f(u, s); this.tr[id].push({ t: b0 + (b1 - b0) * u, x: p.x, y: p.y }); }
  }
  fig(b0, b1, name, kind, tip) { this.figs.push({ b0, b1, name, kind, tip }); if (kind === 'travel') this.ev.push({ type: 'travel', b0, b1 }); }
  moveTo(id, b0, b1, x, y, ease = smooth) { this.gen(id, b0, b1, (u, s) => ({ x: lerp(s.x, x, ease(u)), y: lerp(s.y, y, ease(u)) })); }
  path(id, b0, b1, pts, ease = u => 0.3 * u + 0.7 * smooth(u)) {
    this.hold(id, b0);
    const s = this.at(id, b0);
    const P = [s, ...pts.map(p => ({ x: p[0], y: p[1] }))];
    const L = [0]; for (let i = 1; i < P.length; i++) L.push(L[i - 1] + dist(P[i - 1], P[i]));
    const total = L[L.length - 1] || 1;
    const cr = (p0, p1, p2, p3, u) => {
      const u2 = u * u, u3 = u2 * u;
      return {
        x: 0.5 * ((2 * p1.x) + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3),
        y: 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3)
      };
    };
    this.gen(id, b0, b1, (u) => {
      const d = ease(u) * total;
      let i = 1; while (i < L.length - 1 && L[i] < d) i++;
      const seg = (d - L[i - 1]) / ((L[i] - L[i - 1]) || 1);
      return cr(P[Math.max(0, i - 2)], P[i - 1], P[i], P[Math.min(P.length - 1, i + 1)], seg);
    });
  }
  set(ids, b0, b1, toward) {
    ids.forEach((id, i) => { this.hold(id, b0); this.hold(id, b1); this.sets.push({ id, b0, b1, toward: toward ? toward[i] : null }); });
    if (ids.includes('P')) {
      const beats = []; for (let b = b0; b < b1 - 1e-6; b += 0.5) beats.push({ t: b, hit: false });
      const tw = toward ? toward[ids.indexOf('P')] : null;
      this.ev.push({ type: 'set', b0, b1, beats, with: tw });
    }
  }
  // turn two dancers round their midpoint. Right hand = clockwise seen from above, left hand = anticlockwise.
  turn(a, b, b0, b1, hand, rot, endA, endB, rMid = 0.36) {
    this.hold(a, b0); this.hold(b, b0);
    const sa = this.at(a, b0), sb = this.at(b, b0);
    const c = { x: (sa.x + sb.x) / 2, y: (sa.y + sb.y) / 2 };
    const dir = hand === 'L' ? -1 : 1;
    const mk = (s, end) => {
      const r0 = dist(s, c), a0 = Math.atan2(s.y - c.y, s.x - c.x);
      const aEnd = a0 + dir * rot * TAU;
      const rEnd = end ? rMid : r0;
      const rotEnd = { x: c.x + rEnd * Math.cos(aEnd), y: c.y + rEnd * Math.sin(aEnd) };
      const off = end ? { x: end[0] - rotEnd.x, y: end[1] - rotEnd.y } : { x: 0, y: 0 };
      return (u) => {
        const ang = a0 + dir * rot * TAU * spinEase(u, rot);
        const r = end ? lerp(r0, rMid, smooth(Math.min(1, u / 0.3))) : lerp(r0, rMid, smooth(Math.min(1, u / (rot >= 2 ? 0.1 : 0.2), (1 - u) / (rot >= 2 ? 0.1 : 0.2)))); // no end given: close in, turn tight, open out to where you began
        const k = smooth(u);
        return { x: c.x + r * Math.cos(ang) + off.x * k, y: c.y + r * Math.sin(ang) + off.y * k };
      };
    };
    const fa = mk(sa, endA), fb = mk(sb, endB);
    this.gen(a, b0, b1, u => fa(u)); this.gen(b, b0, b1, u => fb(u));
    this.links.push({ a, b, b0, b1, hand });
    if (a === 'P' || b === 'P') this.ev.push({ type: 'turn', b0, b1, hand, with: a === 'P' ? b : a, rot });
  }
  // one dancer wheels round a centre at radius R (a hands-across or star): angle a0 to a0 + dir*revs*TAU (dir +1 is clockwise, right hands)
  wheel(id, b0, b1, cx, cy, R, a0, dir, revs) {
    this.hold(id, b0);
    this.gen(id, b0, b1, u => { const a = a0 + dir * revs * TAU * (0.75 * u + 0.25 * smooth(u)); return { x: cx + R * Math.cos(a), y: cy + R * Math.sin(a) }; });
  }
  // a star of any size: first move in to radius R at the entry angles, wheel round, and (leave) go back to the start places. link = hand poses and the ring rail for you
  starTurn(ids, b0, b1, cx, cy, R, dir, revs, entry, o = {}) {
    const pre = o.pre != null ? o.pre : 0.7, post = o.post != null ? o.post : 0.7;
    ids.forEach((id, i) => {
      this.hold(id, b0);
      const s = { ...this.at(id, b0) }, a0 = entry ? entry[i] : Math.atan2(s.y - cy, s.x - cx);
      if (o.enter !== false) this.moveTo(id, b0, b0 + pre, cx + R * Math.cos(a0), cy + R * Math.sin(a0));
      this.wheel(id, b0 + pre, b1 - post, cx, cy, R, a0, dir, revs);
      if (o.leave !== false) this.moveTo(id, b1 - post, b1, o.home ? o.home[i][0] : s.x, o.home ? o.home[i][1] : s.y);
    });
    this.links.push({ ring: ids, b0: b0 + 0.3, b1: b1 - 0.3, star: true, first: dir > 0 ? 'R' : 'L', hand: dir > 0 ? 'R' : 'L', oneWay: true, teapot: !!o.teapot });
  }
  lead(a, b, b0, b1, hand, ptsA, ptsB) {
    this.path(a, b0, b1, ptsA); this.path(b, b0, b1, ptsB);
    this.links.push({ a, b, b0, b1, hand });
    if (a === 'P' || b === 'P') this.ev.push({ type: 'turn', b0, b1, hand, with: a === 'P' ? b : a, lead: true });
  }
  circle(ids, b0, cx, cy, R, angle) {
    ids.forEach(id => {
      this.hold(id, b0);
      const s = this.at(id, b0);
      const r0 = Math.hypot(s.x - cx, s.y - cy), a0 = Math.atan2(s.y - cy, s.x - cx);
      this.gen(id, b0, b0 + 8, (u) => {
        let a, r;
        if (u < 0.5) { const v = u / 0.5; a = a0 + angle * smooth(v); r = lerp(r0, R, smooth(Math.min(1, v / 0.3))); }
        else { const v = (u - 0.5) / 0.5; a = a0 + angle * (1 - smooth(v)); r = lerp(R, r0, smooth(Math.max(0, (v - 0.7) / 0.3))); }
        return { x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) };
      });
    });
    this.links.push({ ring: ids, b0: b0 + 0.3, b1: b0 + 7.7 });
  }
  // reel of three. ids = [centre, end on the +axis side, other end]; a figure-of-eight track.
  reel3(ids, b0, b1, cx, cy, ax, ay, L, W) {
    const px = -ay * Math.sign(W || 1), py = ax * Math.sign(W || 1); const w = Math.abs(W);
    const T = th => ({ x: cx + ax * L * Math.sin(th) + px * w * Math.sin(2 * th), y: cy + ay * L * Math.sin(th) + py * w * Math.sin(2 * th) });
    const th0 = [0, TAU / 3, 2 * TAU / 3];
    ids.forEach((id, i) => {
      this.hold(id, b0);
      const s = this.at(id, b0); const t0 = T(th0[i]);
      const off = { x: s.x - t0.x, y: s.y - t0.y };
      this.gen(id, b0, b1, (u) => {
        const p = T(th0[i] + TAU * u);
        const k = u < 0.5 ? 1 - smooth(Math.min(1, u / 0.12)) : smooth(Math.max(0, (u - 0.88) / 0.12));
        return { x: p.x + off.x * k, y: p.y + off.y * k };
      });
    });
  }
  // hands across: four dancers wheel round their middle and back again. first = 'R' (right hands, clockwise) or 'L'.
  star(ids, b0, cx, cy, angle, first, R = 0.78, len = 8) {
    ids.forEach(id => {
      this.hold(id, b0);
      const s = this.at(id, b0), r0 = Math.hypot(s.x - cx, s.y - cy), a0 = Math.atan2(s.y - cy, s.x - cx);
      this.gen(id, b0, b0 + len, (u) => {
        const v = u < 0.5 ? u / 0.5 : (1 - u) / 0.5; // out for half the bars, back for the rest
        return { x: cx + lerp(r0, R, smooth(Math.min(1, v * 2))) * Math.cos(a0 + angle * smooth(v)), y: cy + lerp(r0, R, smooth(Math.min(1, v * 2))) * Math.sin(a0 + angle * smooth(v)) };
      });
    });
    this.links.push({ ring: ids, b0: b0 + 0.3, b1: b0 + len - 0.3, star: true, first: first || 'R' });
  }
  // one dancer weaves a figure of eight round two fixed points: c = centre, u = long axis, L half length, w half width, th0 start phase
  weave(id, b0, b1, cx, cy, ux, uy, L, w, th0) {
    const px = -uy, py = ux;
    const T = th => ({ x: cx + ux * L * Math.sin(th) + px * w * Math.sin(2 * th), y: cy + uy * L * Math.sin(th) + py * w * Math.sin(2 * th) });
    this.hold(id, b0);
    const s = this.at(id, b0), t0 = T(th0), off = { x: s.x - t0.x, y: s.y - t0.y };
    this.gen(id, b0, b1, (u) => {
      const p = T(th0 + TAU * u);
      const k = u < 0.5 ? 1 - smooth(Math.min(1, u / 0.15)) : smooth(Math.max(0, (u - 0.85) / 0.15));
      return { x: p.x + off.x * k, y: p.y + off.y * k };
    });
  }
  // poussette: two couples revolve round each other and change places, each dancer ending on their own side.
  poussette(A, Bp, b0, b1, yA, yB) {
    const all = [[A, 0, yA, yB], [Bp, Math.PI / 2, yB, yA]];
    all.forEach(([pair, shift, y0, y1]) => {
      pair.forEach(id => {
        this.hold(id, b0);
        const s = this.at(id, b0), a0 = Math.atan2(s.y - y0, s.x), r0 = Math.hypot(s.x, s.y - y0);
        this.gen(id, b0, b1, (u) => {
          const c = lerp(y0, y1, smooth(u)), r = r0 - (r0 - 0.62) * Math.sin(Math.PI * u), a = a0 + TAU * easeTurn(u) + shift * Math.sin(Math.PI * u);
          return { x: r * Math.cos(a), y: c + r * Math.sin(a) };
        });
      });
      this.links.push({ a: pair[0], b: pair[1], b0, b1, hand: 'B' });
      if (pair.includes('P')) this.ev.push({ type: 'turn', b0, b1, hand: 'B', with: pair[0] === 'P' ? pair[1] : pair[0] });
    });
  }
}
