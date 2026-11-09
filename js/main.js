/* Reel Time · main.js
   The hug at the end of a dance, the final wiring, and the test hooks used by the test suite. */
"use strict";

/* ======================= THE HUG: after the final honours the partners walk together and embrace =======================
   One field, st.hug = { e: embrace 0..1, u: bars since the embrace began, side }, set in dancerState from g.hug and read by posePerson (hugPose).
   hugTick moves you and your partner (g.hug.pos is read by npc(), g.hug.face by desiredFace()). */
const HUG = { start: 1.2, D: 0.42, walk: 0.9, hold: 2.0, rel: 0.45, camW: 0, n: 1, end: 3.2, sync(g) { const b = g.barDur || 2; this.n = Math.max(1, hugList(g).length); this.end = this.start + (this.n * (this.walk + this.hold + this.rel) + 0.3) / b; } }; // the hug runs in real seconds, once per partner (the Dashing White Sergeant has two); HUG.end is in bars after the last bar
function hugPartnerId(g) { const tr = g && g.ch && g.ch.tr; if (!tr) return null; const id = Object.keys(tr).find(i => i === 'M1' || i === 'W1') || 'R1'; return tr[id] ? id : null; }
function hugList(g) { const first = hugPartnerId(g); if (!first) return []; const L = [first]; if (g.D && g.D.view === 'dws' && g.ch.tr.L1 && first !== 'L1') L.push('L1'); return L; } // everyone you hug, in order: in threes, both partners
function hugLean(kind) { return kind === 'lady' ? -0.03 : -0.04; }
const HUG_TORSO = { gent: [[0.0, 0.96], [0.18, 0.96], [0.178, 1.04], [0.19, 1.14], [0.215, 1.26], [0.22, 1.33], [0.18, 1.38], [0.1, 1.42], [0, 1.43]], lady: [[0.0, 0.98], [0.16, 0.98], [0.148, 1.06], [0.16, 1.18], [0.18, 1.28], [0.172, 1.33], [0.0, 1.34]] }; // same outlines as makePerson3D's jacket and bodice
function hugRad(kind, y) { const pts = HUG_TORSO[kind === 'lady' ? 'lady' : 'gent'], sx = kind === 'lady' ? 0.72 : 0.7; let r = pts[pts.length - 1][0]; for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (y >= a[1] && y <= b[1]) { r = a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); break; } } return [r * sx, r]; } // [half depth (x), half width (z)] of the torso at body-local height y
function hugFK(q, o) { // an arm hangs along -y from the shoulder; rotation.z = q0, rotation.x = q1, elbow z = q2. o = [elbow xyz, palm xyz] in the shoulder frame
  const st = Math.sin(q[0]), ct = Math.cos(q[0]), sp = Math.sin(q[1]), cp = Math.cos(q[1]), se = Math.sin(q[2]), ce = Math.cos(q[2]);
  const ux = st, uy = -ct * cp, uz = -ct * sp, ax = ct, ay = st * cp, az = st * sp;
  o[0] = 0.26 * ux; o[1] = 0.26 * uy; o[2] = 0.26 * uz;
  o[3] = o[0] + 0.275 * (ce * ux + se * ax); o[4] = o[1] + 0.275 * (ce * uy + se * ay); o[5] = o[2] + 0.275 * (ce * uz + se * az);
}
function hugIK(q, tgt, hint, pen) { // Levenberg-Marquardt on (shoulder swing, swing plane, elbow bend): the palm at tgt, the elbow near hint (both relative to the shoulder), and, when pen(p) (signed distance to something solid) is given, the arm kept out of it
  const NS = 6, NP = pen ? 7 : 0, NR = NS + NP, o0 = [0, 0, 0, 0, 0, 0], o1 = [0, 0, 0, 0, 0, 0], r0 = new Array(NR).fill(0), r1 = new Array(NR).fill(0);
  const res = (o, out) => {
    out[0] = o[3] - tgt[0]; out[1] = o[4] - tgt[1]; out[2] = o[5] - tgt[2]; out[3] = 0.3 * (o[0] - hint[0]); out[4] = 0.3 * (o[1] - hint[1]); out[5] = 0.3 * (o[2] - hint[2]);
    if (pen) { let n = NS; [0.3, 0.6, 1].forEach(t => { out[n++] = 2.5 * Math.max(0, 0.062 - pen(o[0] * t, o[1] * t, o[2] * t)); }); [0.25, 0.5, 0.75, 1].forEach(t => { out[n++] = 2.5 * Math.max(0, 0.057 - pen(o[0] + (o[3] - o[0]) * t, o[1] + (o[4] - o[1]) * t, o[2] + (o[5] - o[2]) * t)); }); }
  };
  for (let it = 0; it < 18; it++) {
    hugFK(q, o0); res(o0, r0); const J = [[], [], []];
    for (let j = 0; j < 3; j++) { const qq = q.slice(); qq[j] += 2e-3; hugFK(qq, o1); res(o1, r1); for (let i = 0; i < NR; i++) J[j][i] = (r1[i] - r0[i]) / 2e-3; }
    const A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (let a = 0; a < 3; a++) { for (let c2 = 0; c2 < 3; c2++) { let s = 0; for (let i = 0; i < NR; i++) s += J[a][i] * J[c2][i]; A[a][c2] = s + (a === c2 ? 0.02 : 0); } let s = 0; for (let i = 0; i < NR; i++) s += J[a][i] * r0[i]; b[a] = -s; }
    const det3 = M => M[0][0] * (M[1][1] * M[2][2] - M[1][2] * M[2][1]) - M[0][1] * (M[1][0] * M[2][2] - M[1][2] * M[2][0]) + M[0][2] * (M[1][0] * M[2][1] - M[1][1] * M[2][0]), det = det3(A); if (Math.abs(det) < 1e-12) break;
    const sol = [0, 1, 2].map(c2 => det3(A.map((row, i) => row.map((v, j) => j === c2 ? b[i] : v))) / det);
    q[0] += clamp(sol[0], -0.4, 0.4); q[1] += clamp(sol[1], -0.4, 0.4); q[2] = clamp(q[2] + clamp(sol[2], -0.4, 0.4), 0.05, 2.4);
  }
  return q;
}
function hugTick(g, dtSec) {
  const list = hugList(g); if (!list.length) return;
  if (!g.hug) {
    const pos = {}, home = {}; list.forEach(id => { const q = npc(g, id, g.t); pos[id] = { x: q.x, y: q.y }; home[id] = { x: q.x, y: q.y }; });
    g.hug = { list, pid: list[0], idx: 0, pos, home, face: {}, e: 0, c: 0, u: 0, clock: 0, t0: g.t, segT0: 0, seg: null, cheered: false };
    hugSeg(g, 0, null);
  }
  const H = g.hug, S = H.seg; H.clock += Math.min(dtSec, 0.25);
  const s = H.clock - H.segT0, w = smooth(clamp(s / HUG.walk, 0, 1));
  g.p.x = lerp(S.a.x, S.fa.x, w); g.p.y = lerp(S.a.y, S.fa.y, w); g.p.vx = g.p.vy = 0; g.rail = null;
  H.pos[H.pid] = { x: lerp(S.b.x, S.fb.x, w), y: lerp(S.b.y, S.fb.y, w) };
  if (S.back) { const hm = H.home[S.back.id], wb = smooth(clamp(s / (HUG.walk * 0.9), 0, 1)); H.pos[S.back.id] = { x: lerp(S.back.from.x, hm.x, wb), y: lerp(S.back.from.y, hm.y, wb) }; } // the partner you have just hugged steps back to their place and claps
  const cx = (g.p.x + H.pos[H.pid].x) / 2, cy = (g.p.y + H.pos[H.pid].y) / 2;
  H.list.forEach(o => { if (o !== H.pid) H.face[o] = Math.atan2(cy - H.pos[o].y, cx - H.pos[o].x); }); // whoever is waiting their turn looks on
  g.p.baseYaw = (g.p.baseYaw == null ? H.face.P : g.p.baseYaw) + angDiff(g.p.baseYaw == null ? H.face.P : g.p.baseYaw, H.face.P) * (1 - Math.exp(-Math.max(dtSec, 0.016) * 7)); g.p.yaw = g.p.baseYaw; g.p.lookOff = 0;
  const into = s - HUG.walk; H.u = Math.max(0, into); H.c = w;
  H.e = smooth(clamp(into / 0.45, 0, 1)) * (1 - smooth(clamp((into - HUG.hold) / 0.4, 0, 1)));
  if (!H.cheered && into > 0.25) { H.cheered = true; band.applause(); }
  if (s > HUG.walk + HUG.hold + HUG.rel) { if (H.idx < H.list.length - 1) hugSeg(g, H.idx + 1, H.pid); else H.done = true; } // all partners hugged: the results follow
}
function hugSeg(g, i, prev) { // start the walk to partner i: you and they meet half way, HUG.D metres apart, facing
  const H = g.hug, pid = H.list[i], a = { x: g.p.x, y: g.p.y }, b = { x: H.pos[pid].x, y: H.pos[pid].y };
  const d = Math.hypot(b.x - a.x, b.y - a.y) || 1, ux = (b.x - a.x) / d, uy = (b.y - a.y) / d, c = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, h = HUG.D / 2 / M3;
  H.pid = pid; H.idx = i; H.segT0 = H.clock; H.cheered = false;
  H.seg = { a, b, fa: { x: c.x - ux * h, y: c.y - uy * h }, fb: { x: c.x + ux * h, y: c.y + uy * h }, back: prev ? { id: prev, from: { x: H.pos[prev].x, y: H.pos[prev].y } } : null };
  H.face.P = Math.atan2(uy, ux); H.face[pid] = Math.atan2(-uy, -ux);
}
function hugFor(g, id) {
  const H = g.hug; if (!H) return null;
  if (id === 'P' || id === H.pid) { const o = id === 'P' ? H.pid : 'P'; return { e: H.e, c: H.c, u: H.u, side: id === 'P' ? 1 : -1, pm: R3.people && R3.people[o], pkind: g.ch.meta[o] && g.ch.meta[o].kind, wait: false }; }
  if (H.list.includes(id)) return { e: 0, c: 0, u: 0, side: -1, wait: true };
  return null;
}
function hugPose(m, st, want) { // the embrace: she puts her arms over his shoulders, he holds her round the waist, hands resting on the back (targets worked out from the partner's own body, never raw angles), heads side by side
  const h = st.hug; if (h.wait) return; const lady = st.kind === 'lady', e = h.e, c = h.c, pm = h.pm;
  if (m.skirt) { m.skirt.scale.x = lerp(m.skirt.scale.x, 0.46, c); m.skirt.position.x = -0.035 * c; } // the full skirt is pressed in between them while they close
  if (e < 0.02 || !pm || !h.pkind) return;
  const lean = hugLean(st.kind), pkind = h.pkind, k = m.k, pk = pm.k, u = h.u;
  m.body.position.y += 0.05 * Math.sin(clamp(u / 0.7, 0, 1) * Math.PI) * e;
  m.body.rotation.z = lerp(m.body.rotation.z, lean, e); m.body.rotation.x = 0;
  m.head.rotation.z = lerp(m.head.rotation.z, -0.12, e); m.head.rotation.x = 0.16 * e; m.head.rotation.y = 0.32 * e; m.head.position.z = 0.075 * e;
  m.arms[0].position.x = m.arms[1].position.x = 0.1 * e; // the shoulders roll forward
  const over = st.kind !== pkind ? lady : h.side < 0; // arms over the shoulders (lady) or round the waist (gent)
  const al = m.body.rotation.z, ca = Math.cos(al), sa = Math.sin(al), by = m.lifter.position.y + m.body.position.y;
  const L = hugLean(pkind), cl = Math.cos(L), sl = Math.sin(L), pby = pm.lifter.position.y + pm.body.position.y;
  m._hq = m._hq || [[1.0, 1.4, 1.2], [1.0, -1.4, 1.2]];
  [0, 1].forEach(i => {
    const sd = i ? 1 : -1, sy = by + 1.31 * k, base = over ? clamp(sy + 0.02, 1.14 * pk + pby, 1.31 * pk + pby) : clamp(sy - 0.17, 1.07 * pk + pby, 1.27 * pk + pby); // hands go to a height on the partner's back that this arm can reach (a tall gent holds a short lady higher up her back)
    const yl = (base + sd * 0.02 - pby) / pk, zl = -sd * (over ? 0.11 : 0.085); // the point on the partner's back, in the partner's body frame
    const rr = hugRad(pkind, yl), xl = -(rr[0] * Math.sqrt(Math.max(0.05, 1 - (zl / rr[1]) * (zl / rr[1])))) - 0.045 / pk;
    const px = xl * pk, py = yl * pk, rx = px * cl - py * sl, ry = px * sl + py * cl + pby, rz = zl * pk; // partner body frame > partner root
    const wx = HUG.D - rx, wy = ry - by, wz = -rz; // partner root > my root (she faces back at me) > my body frame
    const T = [(wx * ca + wy * sa) / k, (-wx * sa + wy * ca) / k, wz / k], Sh = m.arms[i].position;
    const pen = (qx, qy, qz) => { // signed distance (m) from a point of my arm (shoulder-relative, body frame) to the partner's torso
      const px = qx + Sh.x, py = qy + Sh.y, pz = qz + Sh.z, x1 = (px * Math.cos(al) - py * Math.sin(al)) * k, y1 = (px * Math.sin(al) + py * Math.cos(al)) * k + by, z1 = pz * k;
      const x2 = HUG.D - x1, y2 = y1 - pby, x3 = (x2 * cl + y2 * sl) / pk, y3 = (-x2 * sl + y2 * cl) / pk, z3 = -z1 / pk, top = pkind === 'lady' ? 1.34 : 1.43; if (y3 < 0.96 || y3 > top - 0.02) return 1;
      const r2 = hugRad(pkind, y3), n = Math.sqrt((x3 / r2[0]) ** 2 + (z3 / r2[1]) ** 2), rho = Math.hypot(x3, z3); return (n > 1e-6 ? rho - rho / n : -Math.min(r2[0], r2[1])) * pk; };
    const q = hugIK(m._hq[i], [T[0] - Sh.x, T[1] - Sh.y, T[2] - Sh.z], [0.12, -0.19, sd * 0.13], pen);
    want[i] = { z: lerp(want[i].z, q[0], e), x: lerp(want[i].x, q[1], e), e: lerp(want[i].e, q[2], e) };
  });
  if (lady) { const pop = e * clamp(Math.sin(clamp((u - 0.55) / 0.8, 0, 1) * Math.PI), 0, 1); m.legs[1].rotation.z = lerp(m.legs[1].rotation.z, -0.5 * pop, 0.8); if (m.knees) m.knees[1].rotation.z = lerp(m.knees[1].rotation.z, -1.1 * pop, 0.8); }
}
function hugCam(g, cam, ly, lx, lz) {
  const H = g.hug, me = R3.people && R3.people.P; HUG.camW = 0;
  if (!H) { if (me && g.hugVis) { me.root.visible = false; g.hugVis = false; } return; }
  const w = smooth(clamp((g.t - H.t0) * g.barDur / 0.9, 0, 1)) * (1 - smooth(clamp(((g.t - H.t0) * g.barDur - 3.5) / 0.5, 0, 1)) * 0), q = H.pos[H.pid] || H.fb;
  HUG.camW = w; if (me) { me.root.visible = w > 0.35; g.hugVis = true; }
  const cx = (g.p.x + q.x) / 2 * M3, cz = (g.p.y + q.y) / 2 * M3, a = Math.atan2(q.y - g.p.y, q.x - g.p.x) + Math.PI / 2 + Math.sin((g.t - H.t0) * g.barDur * 0.5) * 0.35;
  const tx = cx + Math.cos(a) * 3.3, tz = cz + Math.sin(a) * 3.3;
  cam.position.set(lerp(cam.position.x, tx, w), lerp(cam.position.y, 1.5, w), lerp(cam.position.z, tz, w));
  cam.lookAt(lerp(lx, cx, w), lerp(ly, 1.05, w), lerp(lz, cz, w));
}
function hugYaw(g) { return 0; } // look over her shoulder
function hugFx3D(g, dtSec) { // hearts rising over the couple
  if (!R3.hearts) {
    const tex = canvasTex(64, 64, (x) => { x.fillStyle = '#ff6a8a'; x.beginPath(); x.moveTo(32, 54); x.bezierCurveTo(4, 34, 10, 8, 32, 22); x.bezierCurveTo(54, 8, 60, 34, 32, 54); x.fill(); x.fillStyle = 'rgba(255,255,255,.45)'; x.beginPath(); x.ellipse(20, 22, 5, 3, -0.6, 0, TAU); x.fill(); });
    R3.hearts = []; for (let i = 0; i < 8; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false })); s.visible = false; s.renderOrder = 20; R3.scene.add(s); R3.hearts.push(s); }
  }
  const H = g.hug, e = H.e, q = H.pos[H.pid] || H.fb, now = performance.now() / 1000, cx = (g.p.x + q.x) / 2 * M3, cz = (g.p.y + q.y) / 2 * M3;
  R3.hearts.forEach((s, i) => { const k = (now * 0.45 + i / 8) % 1; s.visible = e > 0.15; s.position.set(cx + Math.sin(i * 2.1 + k * 4) * 0.4, 1.55 + k * 1.2, cz + Math.cos(i * 1.7 + k * 3) * 0.4); s.material.opacity = Math.sin(k * Math.PI) * 0.95 * e; s.scale.setScalar(0.18 + 0.16 * Math.sin(k * Math.PI)); });
}
function hugDraw2D(g, v, states) { // the 2D view: a heart swirl round the embrace
  const a = states.P, b = states[g.hug.pid]; if (!a || !b) return; const e = g.hug.e; if (e < 0.05) return;
  const [x, y] = ws(v, (a.pos.x + b.pos.x) / 2, (a.pos.y + b.pos.y) / 2), now = performance.now() / 1000, r = v.s * 0.85;
  ctx.save(); ctx.globalAlpha = e; ctx.lineCap = 'round';
  [0, 1].forEach(j => { ctx.strokeStyle = j ? 'rgba(255,200,120,.55)' : 'rgba(255,130,160,.75)'; ctx.lineWidth = 3; ctx.beginPath(); for (let i = 0; i <= 36; i++) { const u = i / 36, an = now * 2.2 * (j ? -1 : 1) + u * TAU * 1.4 + j * 2, rr = r * (0.35 + u * 0.65); const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * 0.75; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); } ctx.stroke(); });
  for (let i = 0; i < 6; i++) { const k = (now * 0.5 + i / 6) % 1, s = (7 + 7 * Math.sin(k * Math.PI)) * (v.s / 60 + 0.6), hx = x + Math.sin(i * 2 + k * 3) * r * 0.55, hy = y - k * r * 1.5; ctx.globalAlpha = e * Math.sin(k * Math.PI); ctx.fillStyle = '#ff6a8a'; ctx.beginPath(); ctx.moveTo(hx, hy + s * 0.9); ctx.bezierCurveTo(hx - s * 1.5, hy - s * 0.2, hx - s * 0.7, hy - s * 1.2, hx, hy - s * 0.4); ctx.bezierCurveTo(hx + s * 0.7, hy - s * 1.2, hx + s * 1.5, hy - s * 0.2, hx, hy + s * 0.9); ctx.fill(); }
  ctx.restore();
}


/* ---- wiring: screen, hud, menu card, how-to ---- */
(function ballInit() {
  const st = document.createElement('style');
  st.textContent = `
#ballHud{position:absolute;left:max(16px,env(safe-area-inset-left,0px));top:112px;width:150px;pointer-events:none;display:flex;flex-direction:column;gap:3px;background:rgba(12,23,20,.7);border:1px solid var(--rule);border-radius:6px;padding:6px 8px}
@media (max-height:480px){#ballHud{top:86px;width:128px}}
.bxt{font-family:var(--num);font-size:11.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--muted)}
.bxm{display:flex;align-items:center;gap:6px;font-family:var(--num);font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:var(--muted)}
.bxm span{width:42px;flex:none}
.bxbar{flex:1;height:7px;background:#0a1210;border:1px solid var(--rule);border-radius:4px;overflow:hidden}
.bxbar i{display:block;height:100%}
.bxm.heat i{background:linear-gradient(90deg,#5aa9e6,#f0b54a,#ef6a5e)}.bxm.heat.hot .bxbar{border-color:var(--bad)}
.bxm.hydr i{background:linear-gradient(90deg,#3d7fb5,#7fc4f0)}.bxm.hydr.low .bxbar{border-color:var(--bad)}
.bxm.drunk i{background:linear-gradient(90deg,#8e7cc3,#d27bb0)}
.bxm.pride i{background:linear-gradient(90deg,#a68a3a,#e2b45c)}
.bxm.chill i{background:linear-gradient(90deg,#9fd8ff,#3f74e6)}.bxm.chill.frz .bxbar{border-color:#8fb4ff}
.bxpill{display:inline-block;font:700 12px var(--num);letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:2px 10px;margin:2px 0}
.bxpill.warm{background:#ff9a3a;color:#2a1204;box-shadow:0 0 10px rgba(255,150,60,.7)}.bxpill.chl{background:#2a4f8a;color:#dfe9ff}.bxpill.frz{background:#6aa7ff;color:#04132e;box-shadow:0 0 10px rgba(120,180,255,.7)}
.bxsub{font:500 12.5px var(--body,inherit);color:#c5d6f5;margin-top:3px}
.bx-head{display:flex;gap:16px;justify-content:space-between;align-items:flex-start;flex-wrap:wrap}
.bx-meters{display:flex;flex-direction:column;gap:4px;width:min(260px,100%)}
.bx-meters .bxm span{width:46px}
.bx-cols{display:grid;grid-template-columns:minmax(220px,300px) 1fr;gap:16px;align-items:start}
@media (max-width:720px){.bx-cols{grid-template-columns:1fr}.bx-cols>div:first-child:has(.bx-card){order:2}}
.bx-card{background:#e8dcc0;color:#2b2214;border-radius:6px;padding:12px 14px;box-shadow:0 2px 10px rgba(0,0,0,.4);font-family:Georgia,"Palatino Linotype",serif}
.bx-card-t{font-family:var(--display);font-size:20px;border-bottom:2px solid #8a6a3a;margin-bottom:6px;text-align:center}
.bx-row{display:flex;gap:8px;padding:4px 2px;border-bottom:1px dotted #8a6a3a;font-size:14px}
.bx-row.now{background:rgba(207,61,58,.14);font-weight:700}
.bx-row .nm{line-height:1.2}.bx-row .pt{font-size:12.5px;color:#5a4528;font-weight:400}
.bx-row .st{color:#a8232a;letter-spacing:1px}.bx-row .st .off{color:#bcae8a}
.bx-h3{font-family:var(--display);font-weight:400;font-size:22px;margin:4px 0 6px}
.bx-msg{background:var(--panel);border-left:3px solid var(--brass);border-radius:6px;padding:8px 12px;font-size:14px;margin:8px 0;line-height:1.4}
.bx-moments{font-family:var(--num);letter-spacing:.12em;color:var(--brass);margin:8px 0}.bx-moments .off{color:#3b544c}
.bx-partner{display:flex;gap:12px;align-items:center;margin:8px 0}
.bx-partner canvas,.bx-cand canvas{width:64px;height:64px;border-radius:50%;background:#0a1210;border:2px solid var(--brass);flex:none}
.nm{font-weight:700}
.bx-cands{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px}
.bx-cand{background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:10px;display:flex;flex-direction:column;align-items:center;gap:5px;text-align:center}
.bx-cand.yes{border-color:var(--good)}.bx-cand.no{opacity:.6;border-color:var(--bad)}
.bx-cand .mood{font-size:12.5px;font-family:var(--num);letter-spacing:.06em;text-transform:uppercase}
.mood.good{color:var(--good)}.mood.mid{color:var(--warn)}.mood.bad{color:var(--bad)}
.bx-cand .res{font-weight:700;font-size:13px}
.bx-drinks{display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px}
.bx-drink{background:var(--panel);border:1px solid var(--rule);border-radius:10px;padding:10px;display:flex;flex-direction:column;gap:6px}
.bx-drink p{margin:0;font-size:13px;color:var(--muted);line-height:1.35}
.chips,.bx-chips{display:flex;gap:5px;flex-wrap:wrap}
.chip{font-family:var(--num);font-size:12px;letter-spacing:.04em;border:1px solid var(--rule);border-radius:999px;padding:1px 8px;color:var(--muted)}
.chip.good{color:var(--good);border-color:var(--good)}.chip.bad{color:var(--bad);border-color:var(--bad)}.chip.warn{color:var(--warn);border-color:var(--warn)}
.bx-night{width:100%;max-height:300px;border-radius:10px;border:1px solid var(--rule);display:block}
.bx-night .tw{animation:bxtw 2.4s ease-in-out infinite}.bx-night .breath{animation:bxbr 3s ease-out infinite;transform-box:fill-box}
@keyframes bxtw{50%{opacity:.25}}@keyframes bxbr{0%{opacity:.8;transform:translateX(0)}100%{opacity:0;transform:translateX(-26px) translateY(-8px)}}
.bx-w{width:100%;max-width:640px;border-radius:10px;border:1px solid var(--rule);touch-action:none;display:block}
.bx-menu-card{border-color:var(--brass)}`;
  document.head.appendChild(st);
  const sec = document.createElement('section'); sec.className = 'screen'; sec.id = 'sBall'; sec.hidden = true; sec.innerHTML = '<div class="wrap" id="ballBody"></div>';
  $('stage').appendChild(sec); SCREENS.push('sBall');
  const hud = document.createElement('div'); hud.id = 'ballHud'; hud.hidden = true; $('stage').appendChild(hud);
  // menu card (renderMenu is re-run by showScreen('sMenu'), so wrap it)
  const _rm = renderMenu;
  renderMenu = function () {
    _rm();
    const best = SAVE.bestBall; const l = $('reelList'); if (!l) return;
    l.insertAdjacentHTML('afterbegin', `<div class="reel bx-menu-card"><div class="meta">An evening · 7 dances</div><h3>The Ball</h3><div class="stars">${'★'.repeat(3)}</div>
      <div class="desc">A dance card of reels and waltzes. Ask partners (they can say no), keep cool and watered, visit the bar, step out for air. The night is scored on your dancing and how you carry yourself.</div>
      ${best ? `<div class="meta">Best ball ${best.toLocaleString('en-GB')}</div>` : ''}
      <div class="row"><button class="btn" data-bx="start">Go to the ball</button><button class="demo" data-bx="demo">Watch a demo ball</button></div></div>`);
    const bc = l.querySelector('.bx-menu-card');
    if (bc) bc.insertAdjacentHTML('afterend', `<div class="reel bx-menu-card"><div class="meta">Mini-game · 3/4 time</div><h3>Practise the waltz</h3><div class="stars">${'★'.repeat(3)}</div>
      <div class="desc">Sixteen bars of waltz, danced as a couple in the hall. Press on the ONE as the ring closes. A slower band and a wide window, as often as you like.</div>
      ${SAVE.bestWaltz ? `<div class="meta">Best practice ${SAVE.bestWaltz} points</div>` : ''}
      <div class="row"><button class="btn" data-bx="wpractice">Practise the waltz</button></div></div>`);
  };
  const _q = quit;
  quit = function () { if (BALL.active && game && game.ball) { ballLeaveAsk(); return; } if (BALL.active) ballAbort(); _q(); }; // leaving a ball dance asks first and keeps what you earned
  bwInit();
  const how = document.querySelector('#sHow .how');
  if (how) how.insertAdjacentHTML('beforeend', '<div><h4>The Ball</h4>A whole evening on a dance card of reels, jigs and waltzes. Between dances you have a few <b>moments</b>: ask someone to dance (they accept or refuse depending on how you have danced, how tipsy and sweaty you look, and a little luck), buy a drink, or step outside. When the moments run out the band strikes up, and with no partner you sit it out. Watch <b>Heat</b> (it climbs with every bar; at the top you overheat), <b>Water</b> and <b>Tipsy</b> (drunk dancers get narrower timing, a swaying view and shaky turns). Whisky gives flair but sloppy feet; water and the terrace cool you down. Waltzes: press Space on the ONE.</div>');
  document.addEventListener('click', ev => { const b = ev.target.closest('[data-bx]'); if (!b || b.disabled) return; ballAct(b.dataset.bx, b.dataset.arg); });
  window.addEventListener('keydown', ev => { if (BALL.active && BALL.phase === 'waltz' && ev.code === 'Space') { ev.preventDefault(); if (!ev.repeat) waltzPress(); } });
  // everyone in the hall is merry: slurred, lower hooches when you are tipsy
  const wh = band.whoop.bind(band);
  band.whoop = function (pitch = 1, vol = 0.12, delay = 0) { if (BALL.active && BALL.drunk > 25) { pitch *= 1 - 0.3 * BALL.drunk / 100 + (Math.random() - 0.5) * 0.12 * BALL.drunk / 100; } return wh(pitch, vol, delay); };
  if (SAVE.bestBall == null) SAVE.bestBall = 0;
})();
setTimeout(() => { if (window.__reel) window.__reel.ball = window.__reelBall; }, 0);
window.__reelBall = { BALL, BW, ballAct, ballGo, ballGap, ballAsk, ballDrink, ballOutside, ballAutoSoon, DRINKS, WALTZ, ballMods, ballChance, newBall, bwInteract, bwAim, bwTeleport, bwNpcAhead, bwTakeFloor, ballLeaveAsk, ballLeaveGo, waltzPractice, bwPickDrink, bwAskNpc, bwGoZone };

resize(); requestAnimationFrame(frame);
(function boot() {
  const start = (d) => { showScreen('sMenu'); if (d && d.key && DANCES[d.key] && game == null) { try { if (d.view) SAVE.view = d.view; newGame(d.key, false, !!d.practice); } catch (e) { console.warn('hot restore failed', e); showScreen('sMenu'); } } };
  const hot = window.claude && window.claude.hot;
  try { if (hot && hot.snapshot) hot.snapshot(() => game && !game.done ? { key: game.key, practice: !!game.practice, view: SAVE.view, t: game.t } : {}); } catch (e) { }
  try { if (hot && hot.ready) hot.ready(start); else start((hot && hot.data) || {}); } catch (e) { start({}); }
})();
window.__reel = { DANCES, newGame, get game() { return game; }, SAVE, R3, toggleView, setPaused, keys, press, release, addTrace: (x, y) => { traceAcc.x += x; traceAcc.y += y; }, setStick: (x, y) => { stick = { x, y }; } };
Object.assign(window.__reel, { showScreen, renderOutfit, renderRoster, makePerson3D, normPerson, normFace, WSLOTS, TARTANS, OF, RS, PV, tartanOwned, faceOf, drawMiiHead, ofPerson, newPerson, syncRoster, persist, pvRefresh, GEO, claimWorn });
