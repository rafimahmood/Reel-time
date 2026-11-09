/* Reel Time · view-2d.js
   The view from above, drawn with the Canvas API, and the 2D faces. */
"use strict";

/* ================= 2D view (from above) ================= */
let floorCanvas = null, floorPat = null;
function makeFloorCanvas() {
  const c = document.createElement('canvas'); c.width = 256; c.height = 256; const x = c.getContext('2d');
  const tones = ['#7a5230', '#86593a', '#6e4a2a', '#8f6240', '#7f5534'];
  const pw = 32, ph = 128;
  for (let col = 0; col < 8; col++) {
    const off = (col % 2) * 64 + (col % 3) * 21;
    for (let r = -1; r < 3; r++) {
      x.fillStyle = tones[(col * 2 + (((r % 2) + 2) % 2) * 3) % tones.length];
      x.fillRect(col * pw, r * ph + off, pw, ph);
      x.strokeStyle = 'rgba(40,22,10,.55)'; x.lineWidth = 1.2; x.strokeRect(col * pw + 0.5, r * ph + off + 0.5, pw - 1, ph - 1);
      x.strokeStyle = 'rgba(255,220,170,.06)';
      for (let k = 0; k < 4; k++) { x.beginPath(); const gx = col * pw + 4 + k * 7; x.moveTo(gx, r * ph + off + 4); x.bezierCurveTo(gx + 3, r * ph + off + 40, gx - 3, r * ph + off + 80, gx + 1, r * ph + off + ph - 4); x.stroke(); }
    }
  }
  return c;
}
function view2D(g, area) {
  const long = g.D.view === 'long';
  const spanY = long ? 7.2 : 6.4, spanX = long ? 5.0 : 6.0;
  if (!area.mini) { // keep the set clear of the timing bar, the joystick and the buttons
    const touch = document.body.classList.contains('touch'), land = area.w > area.h;
    const top = touch ? (land ? 148 : 190) : (area.h < 600 ? 150 : 200), bottom = touch ? (land ? 6 : 170) : 46;
    const left = touch && land ? 140 : 12, right = touch && land ? 250 : 12;
    area = { x: area.x + left, y: area.y + top, w: area.w - left - right, h: area.h - top - bottom };
  }
  const rot = area.w > area.h * 1.2; // landscape: lay the set on its side, band to the left
  const s = rot ? Math.min(area.w / spanY, area.h / 5.2) : Math.min(area.w / spanX, area.h / spanY);
  const camy = long ? 0 : g.cam.y;
  const sx = area.x + area.w / 2, sy = area.y + area.h / 2;
  if (!area.mini) g.rotView = rot;
  return { s, rot, cx: 0, cy: camy, sx, sy, ox: sx, oy: sy - camy * s, mini: area.mini };
}
const ws = (v, x, y) => v.rot ? [v.sx + (y - v.cy) * v.s, v.sy - (x - v.cx) * v.s] : [v.ox + x * v.s, v.oy + y * v.s];
const vrot = v => v.rot ? -Math.PI / 2 : 0;

function drawFloor(v, area) {
  if (area.mini) { ctx.fillStyle = 'rgba(42,28,16,.92)'; ctx.fillRect(area.x, area.y, area.w, area.h); return; }
  ctx.save();
  ctx.fillStyle = floorPat; const offY = v.rot ? 0 : ((v.oy % 256) + 256) % 256, offX = v.rot ? (((v.sx - v.cy * v.s) % 256) + 256) % 256 : 0;
  ctx.translate(offX, offY); ctx.fillRect(-offX, -offY, W, H); ctx.restore();
  const g1 = ctx.createRadialGradient(W / 2, H * 0.45, 20, W / 2, H * 0.45, Math.max(W, H) * 0.75);
  g1.addColorStop(0, 'rgba(255,214,150,.10)'); g1.addColorStop(0.5, 'rgba(20,12,6,.28)'); g1.addColorStop(1, 'rgba(6,10,9,.88)');
  ctx.fillStyle = g1; ctx.fillRect(0, 0, W, H);
}

function tartanFill2D(x, y, r, t) {
  ctx.save(); ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.clip();
  ctx.fillStyle = t.base; ctx.fillRect(x - r, y - r, 2 * r, 2 * r);
  const st = Math.max(3, r / 3);
  ctx.globalAlpha = 0.55; ctx.fillStyle = t.a;
  for (let k = -3; k <= 3; k++) { ctx.fillRect(x - r, y + k * st * 2 - st / 2, 2 * r, st * 0.8); ctx.fillRect(x + k * st * 2 - st / 2, y - r, st * 0.8, 2 * r); }
  ctx.globalAlpha = 0.8; ctx.fillStyle = t.b;
  for (let k = -3; k <= 3; k++) { ctx.fillRect(x - r, y + k * st * 2 + st * 0.6, 2 * r, 1); ctx.fillRect(x + k * st * 2 + st * 0.6, y - r, 1, 2 * r); }
  ctx.restore();
}

// A person seen from directly above: feet stepping, shoulders, arms, head and hair.
// feet for the fancier set steps, seen from above (drawn in the dancer's own frame, +x forward)
function drawStepFeet2D(s, R) {
  const k = s.stepKind, b = s.setting * 2, ph = b * Math.PI, lift = Math.max(0, Math.sin(ph)), alt = Math.floor(b) % 2 ? -1 : 1;
  ctx.fillStyle = '#121212';
  const foot = (fx, fy, sx, sy, rot) => { ctx.beginPath(); ctx.ellipse(fx, fy, sx, sy, rot, 0, TAU); ctx.fill(); };
  if (k === 'highcut') { const j = Math.abs(Math.sin(ph)); [-1, 1].forEach(sd => foot(R * 0.25, sd * R * 0.2 * (1 - j * 0.4), R * 0.34 * (1 + 0.35 * j), R * 0.16 * (1 + 0.35 * j), 0)); } // both feet together and up
  else if (k === 'fling') { foot(R * 0.25, -alt * R * 0.33, R * 0.32, R * 0.15, 0); foot(-R * (0.2 + 0.55 * lift), alt * R * 0.33, R * 0.28 * (1 - 0.2 * lift), R * 0.13, 0.5 * alt * lift); } // one foot kicked behind
  else if (k === 'heeltoe') { foot(R * 0.25, -alt * R * 0.33, R * 0.32, R * 0.15, 0); foot(R * (0.25 + 0.7 * lift), alt * R * 0.33, R * (0.32 - 0.12 * lift), R * 0.15, alt * 0.5 * lift); } // heel out in front, toe tap
}
function drawPerson2D(v, s, opts) {
  const [x, y] = ws(v, s.pos.x, s.pos.y);
  const per = s.person || {}; const u = v.s * (per.height || 1.75) / 1.75;
  const mv = s.mv, mvu = mv ? mv.u : 0, mvS = mv ? Math.sin(mvu * Math.PI) : 0;
  const R = u * 0.2 * (opts.hop ? 1.1 : 1) * (mv && mv.k === 'leap' ? 1 + 0.4 * mvS : 1);
  const skin = SKIN[per.skin || 0], hair = HAIR[per.hair || 0];
  const tart = TARTANS[per.tartan] || TARTANS.red;
  ctx.save();
  ctx.fillStyle = 'rgba(15,8,3,.32)'; ctx.beginPath(); ctx.ellipse(x + R * 0.18, y + R * 0.28, R * 1.25, R * 1.05, 0, 0, TAU); ctx.fill();
  if (opts.player && !v.mini) { ctx.strokeStyle = 'rgba(226,180,92,.9)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * 1.7, 0, TAU); ctx.stroke(); }
  ctx.translate(x, y); ctx.rotate(s.face + (opts.spin || 0) + vrot(v));
  // feet: alternate forward/back as they step; pas de basque when setting
  const stride = Math.min(0.9, s.spd * 0.45) * R;
  const sw = Math.sin(s.phase);
  const setK = s.setting >= 0 ? Math.sin(s.setting * Math.PI * 2) * R * 0.35 : 0;
  ctx.fillStyle = '#121212';
  const stepFx = s.setting >= 0 && (s.stepKind === 'highcut' || s.stepKind === 'fling' || s.stepKind === 'heeltoe'); if (stepFx) { ctx.save(); ctx.globalAlpha = 0; } // the fancier set steps draw their own feet
  [[-1, sw], [1, -sw]].forEach(([side, k]) => { ctx.beginPath(); ctx.ellipse(R * 0.25 + k * stride + (side > 0 ? setK : -setK) + (effHeel(per) >= 3 ? R * 0.05 * (effHeel(per) - 2) * Math.sin(performance.now() / 95 + side * 2) : 0), side * R * (0.33 + (mv && mv.k === 'heel' ? (mvu < 0.55 ? Math.sin(mvu / 0.55 * Math.PI) * 0.7 : 0) : 0)), R * 0.32, R * 0.15, 0, 0, TAU); ctx.fill(); });
  if (stepFx) { ctx.restore(); drawStepFeet2D(s, R); }
  // body: kilt + jacket for gents, a full skirt for ladies
  if (s.kind === 'gent') {
    ctx.save(); ctx.rotate(-(s.face + (opts.spin || 0) + vrot(v))); tartanFill2D(0, 0, per.kilt === 'trews' ? R * 0.7 : R * 0.95, tart); ctx.restore();
    ctx.fillStyle = per.jacket === 'waistcoat' ? '#f4f1ea' : JACKETC[per.jcol || 0] || '#15181e'; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.5, R * 0.98, 0, 0, TAU); ctx.fill();
    if (per.jacket === 'waistcoat') { ctx.fillStyle = JACKETC[per.jcol || 0]; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.36, R * 0.6, 0, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.ellipse(R * 0.3, 0, R * 0.16, R * 0.24, 0, 0, TAU); ctx.fill();
  } else {
    const dc = DRESS[per.dress || 0];
    ctx.fillStyle = dc; ctx.beginPath(); ctx.arc(0, 0, R * 1.08 + (s.spd > 0.5 ? R * 0.06 * Math.sin(s.phase * 2) : 0), 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,.18)'; ctx.lineWidth = 1; ctx.stroke();
    ctx.fillStyle = dc; ctx.beginPath(); ctx.ellipse(0, 0, R * 0.45, R * 0.82, 0, 0, TAU); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(0, 0, R * 0.45, R * 0.82, 0, 0, TAU); ctx.clip(); ctx.rotate(0.9); ctx.fillStyle = tart.base; ctx.fillRect(-R, -R * 0.13, 2 * R, R * 0.26); ctx.fillStyle = tart.a; ctx.fillRect(-R, -R * 0.03, 2 * R, R * 0.06); ctx.restore();
  }
  // arms: swing when walking, reach forward to a hand hold, out to the side in a circle
  ctx.strokeStyle = s.kind === 'gent' ? '#15181e' : skin; ctx.lineWidth = Math.max(2, R * 0.24); ctx.lineCap = 'round';
  const mvE = Math.min(1, mvu * 5, (1 - mvu) * 5), clapP = mv && mv.k === 'clap' ? clamp(1 - Math.abs(mvu - 0.5) * 6, 0, 1) : 0;
  const mvArm = !mv || mv.k === 'bow' ? null : side => mv.k === 'clap' ? [R * (0.9 - 0.5 * clapP), side * R * (0.9 * (1 - mvE) + (0.5 * (1 - clapP) + 0.08) * mvE)]
    : mv.k === 'leap' ? [R * 0.2, side * R * (1.08 + 0.7 * mvE)] : mv.k === 'heel' ? [R * 0.1, side * R * (1.08 + 0.4 * mvE)] : [R * 0.3 * mvE, side * R * (1.08 - 0.72 * mvE)];
  const arm = (side) => {
    const sh = [0, side * R * 0.78];
    let tip;
    const holding = s.hand === 'B' || (side > 0 && s.hand === 'R') || (side < 0 && s.hand === 'L');
    const aimP = side > 0 ? s.aimR : s.aimL;
    if (s.akimbo && (side > 0) === (s.akimbo === 'R')) { // arm akimbo: elbow out, hand on the hip
      const el = [-R * 0.05, side * R * 1.5], hp = [R * 0.3, side * R * 0.62];
      ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(el[0], el[1]); ctx.lineTo(hp[0], hp[1]); ctx.stroke();
      ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(hp[0], hp[1], R * 0.13, 0, TAU); ctx.fill();
      return;
    }
    if (aimP) { const [ax, ay] = ws(v, aimP.x, aimP.y); const rel = Math.atan2(ay - y, ax - x) - (s.face + (opts.spin || 0) + vrot(v)); const len = Math.min(R * 1.8, Math.hypot(ax - x, ay - y) + R * 0.1); tip = [Math.cos(rel) * len, Math.sin(rel) * len]; }
    else if (mvArm) tip = mvArm(side);
    else if (s.heli) tip = [0, side * R * 2.05]; // helicopter: arms straight out
    else if (s.setting >= 0 && s.stepKind === 'fling') tip = [R * 0.1, side * R * 0.4]; // fling: hands up over the head
    else if (holding) tip = [R * 1.25, side * R * 0.45];
    else if (s.ring) tip = [R * 0.15, side * R * 1.55];
    else if (s.setting >= 0) tip = [R * 0.05, side * R * 1.12];
    else { const k = -side * sw * Math.min(1, s.spd * 0.6); tip = [k * R * 0.6, side * R * 1.08]; }
    ctx.beginPath(); ctx.moveTo(sh[0], sh[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(tip[0], tip[1], R * 0.13, 0, TAU); ctx.fill();
  };
  arm(1); arm(-1);
  ctx.restore();
  if (s.heli && !v.mini) { // helicopter blades
    ctx.strokeStyle = 'rgba(127,208,224,.85)'; ctx.lineWidth = 3; const a1 = s.heliAdd * 2; ctx.beginPath(); ctx.arc(x, y, R * 2.2, a1, a1 + 1.6); ctx.stroke(); ctx.beginPath(); ctx.arc(x, y, R * 2.2, a1 + Math.PI, a1 + Math.PI + 1.6); ctx.stroke(); }
  if (s.spinning && !v.mini) { // a swirl round whoever is spinning under the arm
    ctx.strokeStyle = 'rgba(190,170,240,.9)'; ctx.lineWidth = 3; const a0 = performance.now() / 120; ctx.beginPath(); ctx.arc(x, y, R * 1.55, a0, a0 + 4.2); ctx.stroke();
    const ex = x + Math.cos(a0 + 4.2) * R * 1.55, ey = y + Math.sin(a0 + 4.2) * R * 1.55; ctx.fillStyle = 'rgba(190,170,240,.95)'; ctx.beginPath(); ctx.arc(ex, ey, 4, 0, TAU); ctx.fill(); }
  if (mv && !v.mini) { // a ring or swirl for each move
    const col = { clap: '255,225,140', leap: '130,215,235', heel: '235,150,80', pirouette: '190,170,240', bow: '240,232,216' }[mv.k] || '255,255,255';
    ctx.strokeStyle = `rgba(${col},${0.85 * (1 - mvu)})`; ctx.lineWidth = 3;
    if (mv.k === 'pirouette') { const a0 = mvu * TAU * 1.5; ctx.beginPath(); ctx.arc(x, y, R * 1.6, a0, a0 + 4.4); ctx.stroke(); }
    else if (mv.k === 'bow') { ctx.beginPath(); ctx.arc(x, y, R * 1.3, -0.9, 0.9); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, y, R * (1.3 + 1.1 * mvu), 0, TAU); ctx.stroke(); if (mv.k === 'clap') { ctx.beginPath(); ctx.arc(x, y, R * (1.0 + 0.6 * mvu), 0, TAU); ctx.stroke(); } }
  }
  if (s.stomp > 0.4 && !v.mini) { ctx.strokeStyle = `rgba(255,236,200,${0.5 * s.stomp})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(x, y, R * (1.4 + (1 - s.stomp)), 0, TAU); ctx.stroke(); }
  // the head, always upright so you can see who it is
  drawMiiHead(ctx, per, s.kind, x + (mv && mv.k === 'bow' ? Math.cos(s.face + vrot(v)) * R * 0.55 * mvS : 0), y - R * 0.05 + (mv && mv.k === 'bow' ? Math.sin(s.face + vrot(v)) * R * 0.55 * mvS : 0), R * (v.mini && !opts.portrait ? 0.6 : 0.7));
  if (!v.mini && per.name && opts.label) {
    ctx.font = '600 12px Barlow, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = opts.player ? '#e2b45c' : per.guest ? 'rgba(240,232,216,.55)' : 'rgba(240,232,216,.92)';
    ctx.fillText(per.name, x, y + R * 1.9 + 10);
  }
}

// ---- the 2D face (top view and portraits). Everything comes from the person's `face` object (see FACE_DEF). ----
function facePath2D(c, rx, ry, y0, jw) { // round top, jaw from pointed (-1) through round (0) to square (+1)
  const cw = clamp(rx * (0.5523 + 0.42 * jw), rx * 0.12, rx * 0.97), k1 = clamp(0.5523 + 0.24 * jw, 0.3, 0.97), bot = y0 + ry * (jw < 0 ? 1 - jw * 0.1 : 1);
  c.beginPath(); c.ellipse(0, y0, rx, ry, 0, Math.PI, TAU);
  c.bezierCurveTo(rx, y0 + ry * k1, cw, bot, 0, bot); c.bezierCurveTo(-cw, bot, -rx, y0 + ry * k1, -rx, y0); c.closePath();
}
function drawFace2D(c, f, per, lady, skin, hair, r) {
  const rx = r * 0.86 * f.fw, ry = r * 0.95, y0 = r * 0.05, big = r > 7, v = f.v | 0, dark = hexLum(skin) < 0.33;
  const lip = f.lp || (lady ? '#b2404a' : '#8a3a33'), bcol = f.bdc || hair, ec = f.ec || EYEC[v], brow = f.bc || hair, mz = f.mz, es = f.es;
  const rgba = (h, a) => { const q = hexRGB(h); return `rgba(${q[0]},${q[1]},${q[2]},${a})`; };
  c.fillStyle = skin;
  [-1, 1].forEach(sd => { c.beginPath(); c.ellipse(sd * rx * 0.99, r * 0.1, r * 0.14 * f.er, r * 0.2 * f.er, 0, 0, TAU); c.fill(); });
  facePath2D(c, rx, ry, y0, f.jw); c.fill();
  c.fillStyle = dark ? rgba('#a03c3c', 0.4 * f.bl) : rgba('#eb6e6e', (lady ? 0.6 : 0.44) * f.bl);
  [-1, 1].forEach(sd => { c.beginPath(); c.ellipse(sd * r * 0.5 * f.fw, r * 0.32, r * 0.16, r * 0.1, 0, 0, TAU); c.fill(); });
  if (!big) { c.fillStyle = '#1a1410'; [-1, 1].forEach(sd => { c.beginPath(); c.arc(sd * r * (0.3 + 0.06 * f.ed), 0, Math.max(0.8, r * 0.1 * es), 0, TAU); c.fill(); }); return; }
  const clipFace = fn => { c.save(); facePath2D(c, rx, ry, y0, f.jw); c.clip(); fn(); c.restore(); };
  if (f.bd) { // facial hair under the features
    c.fillStyle = bcol;
    if (f.bd === 1) clipFace(() => { c.fillStyle = rgba(bcol, 0.3); c.fillRect(-rx, r * 0.3, rx * 2, ry); if (r > 14) { c.fillStyle = rgba(bcol, 0.55); for (let i = 0; i < 70; i++) { const a = i * 2.399, d = Math.sqrt(i / 70); c.fillRect(Math.cos(a) * rx * 0.8 * d, r * 0.38 + Math.abs(Math.sin(a)) * d * r * 0.62, Math.max(0.6, r * 0.018), Math.max(0.6, r * 0.018)); } } });
    if (f.bd === 4) clipFace(() => { c.fillStyle = bcol; c.beginPath(); c.moveTo(-rx * 1.1, r * 0.0); c.quadraticCurveTo(-rx * 0.62, r * 0.42, -rx * 0.28, r * 0.37); c.quadraticCurveTo(0, r * 0.3, rx * 0.28, r * 0.37); c.quadraticCurveTo(rx * 0.62, r * 0.42, rx * 1.1, r * 0.0); c.lineTo(rx * 1.1, r * 1.3); c.lineTo(-rx * 1.1, r * 1.3); c.closePath(); c.fill(); c.fillStyle = skin; c.beginPath(); c.ellipse(0, r * 0.5, r * 0.17 * mz, r * 0.085 * mz, 0, 0, TAU); c.fill(); });
    if (f.bd === 5) [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * rx * 0.78, -r * 0.15); c.lineTo(sd * rx * 1.02, -r * 0.1); c.quadraticCurveTo(sd * rx * 1.0, r * 0.5, sd * rx * 0.5, r * 0.62); c.quadraticCurveTo(sd * rx * 0.75, r * 0.35, sd * rx * 0.78, -r * 0.15); c.fill(); });
    if (f.bd === 3) { c.beginPath(); c.ellipse(0, r * 0.8, r * 0.15, r * 0.19, 0, 0, TAU); c.fill(); }
    if (f.bd >= 2) { [-1, 1].forEach(sd => { c.beginPath(); c.ellipse(sd * r * 0.11, r * 0.39, r * 0.17, r * 0.062, sd * 0.28, 0, TAU); c.fill(); }); }
  }
  [-1, 1].forEach(sd => {
    const ex = sd * r * (0.3 + 0.06 * f.ed), ey = r * 0.02;
    if (f.sh) { c.fillStyle = rgba(f.sh, 0.6); c.beginPath(); c.ellipse(ex, ey - r * 0.1 * es, r * 0.2 * es, r * 0.11 * es, 0, 0, TAU); c.fill(); }
    c.fillStyle = '#fbfaf7'; c.beginPath(); c.ellipse(ex, ey, r * 0.15 * es, r * 0.19 * es, 0, 0, TAU); c.fill();
    c.fillStyle = ec; c.beginPath(); c.ellipse(ex, ey + r * 0.02, r * 0.095 * es, r * 0.125 * es, 0, 0, TAU); c.fill();
    c.fillStyle = '#1a1410'; c.beginPath(); c.ellipse(ex, ey + r * 0.03, r * 0.05 * es, r * 0.07 * es, 0, 0, TAU); c.fill();
    c.fillStyle = '#fff'; c.beginPath(); c.arc(ex + r * 0.04, ey - r * 0.05, r * 0.035, 0, TAU); c.fill();
    c.strokeStyle = brow; c.lineWidth = Math.max(1, r * (lady ? 0.05 : 0.08) * f.bt); c.lineCap = 'round';
    const by = -r * 0.27 - (es - 1) * r * 0.06, xi = ex - sd * r * 0.16, xo = ex + sd * r * 0.16; c.beginPath();
    if (f.bs === 1) { c.moveTo(xi, by - r * 0.03); c.lineTo(xo, by - r * 0.03); }
    else if (f.bs === 2) { c.moveTo(xi, by + r * 0.06); c.quadraticCurveTo(ex, by - r * 0.01, xo, by - r * 0.04); }
    else if (f.bs === 3) { c.moveTo(xi, by - r * 0.06); c.quadraticCurveTo(ex, by - r * 0.04, xo, by + r * 0.05); }
    else if (f.bs === 4) { c.moveTo(xi, by - r * 0.02); c.quadraticCurveTo(ex, by - r * 0.2, xo, by - r * 0.03); }
    else { c.moveTo(xi, by); c.quadraticCurveTo(ex, by - r * (0.09 + v * 0.02), xo, by); }
    c.stroke();
    if (f.ag && r > 12) { c.strokeStyle = 'rgba(80,40,25,' + 0.16 * f.ag + ')'; c.lineWidth = Math.max(0.7, r * 0.02); for (let i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(ex + sd * r * 0.2, ey + i * r * 0.05); c.lineTo(ex + sd * r * 0.31, ey + i * r * 0.09); c.stroke(); } }
  });
  c.strokeStyle = 'rgba(110,55,38,.7)'; c.lineWidth = Math.max(1, r * 0.045); c.lineCap = 'round'; const nz = f.ns, ny = r * 0.3; // nose
  c.fillStyle = 'rgba(150,80,55,.32)'; c.beginPath(); c.ellipse(0, ny, r * 0.085 * nz, r * 0.065 * nz, 0, 0, TAU); c.fill(); // a shaded tip so size reads at tile scale
  c.beginPath();
  if (f.nh === 1) { c.moveTo(-r * 0.03, ny - r * 0.2 * nz); c.lineTo(-r * 0.04 * nz, ny); c.quadraticCurveTo(0, ny + r * 0.05, r * 0.04 * nz, ny); }
  else if (f.nh === 2) { c.moveTo(r * 0.02, ny - r * 0.26 * nz); c.quadraticCurveTo(-r * 0.05 * nz, ny - r * 0.02, -r * 0.05 * nz, ny + r * 0.01); c.quadraticCurveTo(0, ny + r * 0.07 * nz, r * 0.06 * nz, ny); }
  else if (f.nh === 3) { c.moveTo(-r * 0.1 * nz, ny - r * 0.01); c.quadraticCurveTo(0, ny + r * 0.07 * nz, r * 0.1 * nz, ny - r * 0.01); }
  else { c.moveTo(-r * 0.06 * nz, ny); c.quadraticCurveTo(0, ny + r * 0.06 * nz, r * 0.06 * nz, ny); }
  c.stroke();
  c.strokeStyle = lip; c.lineWidth = Math.max(1, r * (lady ? 0.07 : 0.06)); const my = r * 0.46, mw = r * 0.18 * mz; // mouth
  if (f.lp && f.ms !== 5) { c.fillStyle = rgba(f.lp, 0.92); c.beginPath(); c.ellipse(0, my + r * 0.03, mw * 0.85, r * 0.055 * mz, 0, 0, TAU); c.fill(); }
  c.beginPath();
  if (f.ms === 1) { const g = mw * 1.3; c.fillStyle = '#fff'; c.moveTo(-g, my); c.quadraticCurveTo(0, my + r * 0.2, g, my); c.quadraticCurveTo(0, my + r * 0.06, -g, my); c.fill(); c.beginPath(); c.moveTo(-g, my); c.quadraticCurveTo(0, my + r * 0.2, g, my); }
  else if (f.ms === 2) { c.moveTo(-mw * 0.9, my + r * 0.04); c.lineTo(mw * 0.9, my + r * 0.04); }
  else if (f.ms === 3) { c.fillStyle = f.lp || (lady ? '#c25a62' : '#b4605a'); c.ellipse(0, my + r * 0.04, mw * 0.6, r * 0.05 * mz, 0, 0, TAU); c.fill(); c.beginPath(); c.moveTo(-mw * 0.6, my + r * 0.04); c.lineTo(mw * 0.6, my + r * 0.04); }
  else if (f.ms === 4) { c.moveTo(-mw * 0.85, my + r * 0.05); c.quadraticCurveTo(mw * 0.1, my + r * 0.08, mw * 1.1, my - r * 0.03); }
  else if (f.ms === 5) { c.fillStyle = '#5a1c1c'; c.ellipse(0, my + r * 0.05, r * 0.06 * mz, r * 0.085 * mz, 0, 0, TAU); c.fill(); c.beginPath(); c.ellipse(0, my + r * 0.05, r * 0.06 * mz, r * 0.085 * mz, 0, 0, TAU); }
  else { c.moveTo(-mw, my); c.quadraticCurveTo(0, r * (0.6 + v * 0.03) + (mz - 1) * r * 0.05, mw, my); }
  c.stroke();
  if (f.fr) { c.fillStyle = 'rgba(125,72,42,.6)'; const n = f.fr * 7; for (let i = 0; i < n; i++) { const a = i * 2.399 + 0.4, d = Math.sqrt((i + 1) / n); c.beginPath(); c.arc(Math.cos(a) * r * 0.46 * d, r * 0.2 + Math.abs(Math.sin(a)) * r * 0.16 * d + r * 0.03, Math.max(0.6, r * 0.017), 0, TAU); c.fill(); } }
  if (f.ag && r > 12) { c.strokeStyle = 'rgba(80,40,25,' + 0.16 * f.ag + ')'; c.lineWidth = Math.max(0.7, r * 0.02); [-1, 1].forEach(sd => { c.beginPath(); c.moveTo(sd * r * 0.18, r * 0.28); c.quadraticCurveTo(sd * r * 0.3, r * 0.4, sd * r * 0.24, r * 0.52); c.stroke(); }); for (let i = 0; i < 2; i++) { c.beginPath(); c.moveTo(-r * 0.3, -r * (0.5 + i * 0.07)); c.quadraticCurveTo(0, -r * (0.56 + i * 0.07), r * 0.3, -r * (0.5 + i * 0.07)); c.stroke(); } }
}
function drawGlasses2D(c, f, r) {
  if (!f.gl || r <= 9) return;
  c.save(); c.lineWidth = Math.max(1, r * 0.045); c.strokeStyle = f.gl === 4 ? '#0c0c0c' : '#2a2018'; c.lineJoin = 'round';
  const w = r * 0.21 * f.es + r * 0.02, ey = r * 0.02;
  [-1, 1].forEach(sd => {
    const ex = sd * r * (0.3 + 0.06 * f.ed); c.beginPath();
    if (f.gl === 1) c.arc(ex, ey, w, 0, TAU);
    else if (f.gl === 2) c.rect(ex - w, ey - w * 0.78, w * 2, w * 1.5);
    else if (f.gl === 3) c.arc(ex, ey, w, Math.PI, TAU);
    else if (f.gl === 4) { c.rect(ex - w, ey - w * 0.7, w * 2, w * 1.45); c.fillStyle = 'rgba(8,8,10,.9)'; c.fill(); }
    else if (f.gl === 5) { c.moveTo(ex - sd * w, ey - w * 0.55); c.lineTo(ex + sd * w * 1.15, ey - w * 0.85); c.lineTo(ex + sd * w * 1.0, ey + w * 0.35); c.quadraticCurveTo(ex, ey + w * 0.9, ex - sd * w, ey + w * 0.2); c.closePath(); }
    c.stroke();
    c.beginPath(); c.moveTo(ex + sd * w, ey - w * 0.2); c.lineTo(sd * r * 0.86 * f.fw, ey - w * 0.1); c.stroke();
  });
  c.beginPath(); c.moveTo(-r * (0.3 + 0.06 * f.ed) + w, ey - w * 0.15); c.quadraticCurveTo(0, ey - w * 0.45, r * (0.3 + 0.06 * f.ed) - w, ey - w * 0.15); c.stroke();
  c.restore();
}
// A Mii head seen from the front: hair behind, round face, eyes with catchlights, brows, nose, smile, hair on top.
function drawMiiHead(c, per, kind, x, y, r) {
  const fp = faceOf(per), skin = skinHex(per), hair = hairHex(per), lady = kind === 'lady', v = fp.v | 0; r *= fp.hs;
  const style = per.style || (lady ? 'long' : 'short');
  c.save(); c.translate(x, y);
  c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.arc(r * 0.06, r * 0.1, r * 1.04, 0, TAU); c.fill();
  c.fillStyle = hair;
  if (style === 'long') { c.beginPath(); c.ellipse(0, r * 0.25, r * 1.02, r * 1.05, 0, 0, TAU); c.fill(); }
  else if (style === 'bun') { c.beginPath(); c.arc(0, -r * 0.95, r * 0.38, 0, TAU); c.fill(); }
  else if (style === 'wavy') { defaultCap(); fringe(); head.add(curtain('m-curt-wavy', { p0: 1.3, len: 0.4, lock: 0.06, wave: 0.014, flare: 0.06, seed: 5 })); }
  else if (style === 'ponytail') { c.beginPath(); c.ellipse(r * 0.88, r * 0.7, r * 0.2, r * 0.55, -0.3, 0, TAU); c.fill(); c.fillStyle = '#b2404a'; c.beginPath(); c.arc(r * 0.82, r * 0.2, r * 0.1, 0, TAU); c.fill(); c.fillStyle = hair; }
  else if (style === 'plaits') { [-1, 1].forEach(sd => { for (let i = 0; i < 5; i++) { c.beginPath(); c.ellipse(sd * r * 0.98, r * (0.45 + i * 0.22), r * (0.17 - i * 0.012), r * 0.15, 0, 0, TAU); c.fill(); } c.fillStyle = '#b2404a'; c.beginPath(); c.arc(sd * r * 0.98, r * 1.5, r * 0.08, 0, TAU); c.fill(); c.fillStyle = hair; }); }
  else if (style === 'updo') { c.beginPath(); c.arc(0, -r * 1.0, r * 0.5, 0, TAU); c.fill(); }
  else if (style === 'afro') { c.beginPath(); c.arc(0, -r * 0.2, r * 1.32, 0, TAU); c.fill(); }
  drawFace2D(c, fp, per, lady, skin, hair, r);
  // hair on top: a cap and a fringe
  c.fillStyle = hair; c.beginPath();
  if (style === 'bald') { /* just the face */ }
  else if (style === 'crop') { c.ellipse(0, -r * 0.52, r * 0.88, r * 0.46, 0, Math.PI, TAU); }
  else if (style === 'slick') { c.ellipse(0, -r * 0.5, r * 0.9, r * 0.5, 0, Math.PI, TAU); }
  else if (style === 'afro') { c.ellipse(0, -r * 0.45, r * 0.92, r * 0.5, 0, Math.PI, TAU); }
  else if (style === 'curly') { for (let i = 0; i <= 9; i++) { const an = Math.PI + i / 9 * Math.PI; c.moveTo(Math.cos(an) * r * 0.82 + r * 0.26, Math.sin(an) * r * 0.82 - r * 0.15); c.arc(Math.cos(an) * r * 0.82, Math.sin(an) * r * 0.82 - r * 0.15, r * 0.26, 0, TAU); } c.moveTo(r * 0.8, -r * 0.4); c.ellipse(0, -r * 0.42, r * 0.8, r * 0.4, 0, Math.PI, TAU); }
  else if (style === 'pixie') { c.ellipse(0, -r * 0.5, r * 0.9, r * 0.5, 0, Math.PI, TAU); c.ellipse(r * 0.25, -r * 0.5, r * 0.62, r * 0.2, -0.35, 0, Math.PI); c.moveTo(r * 0.95, 0); c.ellipse(r * 0.9, -r * 0.02, r * 0.1, r * 0.3, 0, 0, TAU); c.moveTo(-r * 0.8, 0); c.ellipse(-r * 0.9, -r * 0.02, r * 0.1, r * 0.3, 0, 0, TAU); }
  else if (lady) { c.ellipse(0, -r * 0.42, r * 0.92, r * 0.58, 0, Math.PI, TAU); c.ellipse(-r * 0.3, -r * 0.42, r * 0.55, r * 0.22, 0.25, 0, Math.PI); }
  else { c.ellipse(0, -r * 0.45, r * 0.9, r * 0.55, 0, Math.PI, TAU); c.ellipse(r * 0.05, -r * 0.45, r * 0.85, r * 0.14, 0, 0, Math.PI); }
  c.fill();
  if (style === 'quiff') { c.beginPath(); c.ellipse(r * 0.18, -r * 1.0, r * 0.6, r * 0.3, -0.25, 0, TAU); c.fill(); }
  else if (style === 'updo') { c.beginPath(); c.arc(0, -r * 0.98, r * 0.34, 0, TAU); c.fill(); }
  drawGlasses2D(c, fp, r);
  if (r > 9) { // hats, tiara and flowers in the portrait and the top view
    const wd = wdOf(per), tc = (TARTANS[per.tartan] || TARTANS.red);
    if (!lady && wd.hat === 'glengarry') { c.fillStyle = '#1d2b4f'; c.beginPath(); c.ellipse(0, -r * 0.5, r * 0.9, r * 0.5, 0, Math.PI, TAU); c.fill(); c.fillStyle = tc.base; c.fillRect(-r * 0.9, -r * 0.56, r * 1.8, r * 0.12); c.fillStyle = '#d8d8dc'; c.beginPath(); c.arc(-r * 0.2, -r * 0.62, r * 0.09, 0, TAU); c.fill(); c.fillStyle = '#10182f'; c.fillRect(r * 0.78, -r * 0.5, r * 0.07, r * 0.5); }
    else if (!lady && wd.hat === 'balmoral') { c.fillStyle = '#1d2b4f'; c.beginPath(); c.ellipse(0, -r * 0.62, r * 0.7, r * 0.34, 0, Math.PI, TAU); c.fill(); c.beginPath(); c.ellipse(0, -r * 0.5, r * 1.0, r * 0.14, 0, 0, TAU); c.fill(); c.fillStyle = tc.base; c.fillRect(-r * 0.98, -r * 0.54, r * 1.96, r * 0.1); c.fillStyle = '#b3262b'; c.beginPath(); c.arc(0, -r * 1.0, r * 0.12, 0, TAU); c.fill(); }
    if (lady && wd.tiara !== 'none') { c.strokeStyle = wd.tiara === 'gold' ? '#d9b445' : '#dfe3ea'; c.lineWidth = Math.max(1, r * 0.06); c.beginPath(); c.ellipse(0, -r * 0.42, r * 0.7, r * 0.5, 0, Math.PI * 1.15, Math.PI * 1.85); c.stroke(); c.fillStyle = '#9ad1f0'; c.beginPath(); c.arc(0, -r * 0.92, r * 0.07, 0, TAU); c.fill(); }
    if (lady && wd.flow !== 'none') { const fc = wd.flow === 'rose' ? ['#d4455a', '#b8304a'] : wd.flow === 'white' ? ['#f5f1e8', '#e5dfcf'] : ['#e58aa0', '#f5f1e8', '#8fb4e0']; for (let i = 0; i < 4; i++) { c.fillStyle = fc[i % fc.length]; c.beginPath(); c.arc(r * (0.52 + (i % 2) * 0.14), -r * (0.5 - i * 0.12), r * 0.11, 0, TAU); c.fill(); } }
  }
  c.restore();
}

// People watching from the sides in the top view: dark wall band, chairs, heads and shoulders.
function drawSpectators2D(g, v, t) {
  const sideExt = v.rot ? [v.sy / v.s, (H - v.sy) / v.s] : [v.sx / v.s, (W - v.sx) / v.s]; // how far each side of the set the screen shows
  const yA = v.rot ? (0 - v.sx) / v.s + v.cy : (0 - v.oy) / v.s, yB = v.rot ? (W - v.sx) / v.s + v.cy : (H - v.oy) / v.s;
  const ylo = Math.min(yA, yB), yhi = Math.max(yA, yB), sk = ['#f3cfb3', '#e8b994', '#d29f78', '#b07a52', '#8a5a3a', '#5f3b26'], cl = ['#1f3554', '#6e1f2b', '#2e5240', '#3c2f25', '#b8a6d9', '#e7c9c4', '#15171c', '#a8232a'];
  const pulse = (t * 2) % 1, clap = t > 0 && t < g.total ? (pulse < 0.2 ? Math.sin(pulse / 0.2 * Math.PI) : 0) : (t >= g.total ? Math.abs(Math.sin(performance.now() / 110)) : 0);
  [-1, 1].forEach(sd => {
    const ext = sideExt[v.rot ? (sd > 0 ? 0 : 1) : (sd > 0 ? 1 : 0)], x0 = Math.max(3.0, ext - 1.0);
    if (x0 > ext - 0.4) return;
    const a = ws(v, sd * x0, ylo), b = ws(v, sd * ext, yhi);
    ctx.fillStyle = 'rgba(18,10,6,.78)'; ctx.fillRect(Math.min(a[0], b[0]) - 2, Math.min(a[1], b[1]) - 2, Math.abs(b[0] - a[0]) + 4, Math.abs(b[1] - a[1]) + 4);
    const e = ws(v, sd * (x0 + 0.02), ylo), e2 = ws(v, sd * (x0 + 0.02), yhi); ctx.strokeStyle = 'rgba(160,110,60,.55)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(e[0], e[1]); ctx.lineTo(e2[0], e2[1]); ctx.stroke();
    for (let y = Math.ceil(ylo); y <= yhi; y++) {
      const h = hashId('c2d' + sd + y); if (h % 100 > 70) continue;
      const p = ws(v, sd * (x0 + 0.6), y), r = v.s * 0.2, bob = Math.sin(performance.now() / 420 + h) * 1.2 - ((h % 3 === 0) ? clap * 3 : 0);
      ctx.fillStyle = '#5a3a20'; ctx.beginPath(); ctx.arc(p[0], p[1], r * 1.25, 0, TAU); ctx.fill();
      ctx.fillStyle = cl[h % cl.length]; ctx.beginPath(); ctx.ellipse(p[0], p[1] + bob * 0.3, r * (v.rot ? 0.8 : 1.05), r * (v.rot ? 1.05 : 0.8), 0, 0, TAU); ctx.fill();
      ctx.fillStyle = sk[(h >>> 3) % 6]; ctx.beginPath(); ctx.arc(p[0] + (v.rot ? -sd * 0 : 0), p[1] + bob, r * 0.55, 0, TAU); ctx.fill();
      ctx.fillStyle = ['#1b1410', '#3d2817', '#6b4423', '#d7b46a', '#9a9a9a'][(h >>> 6) % 5]; ctx.beginPath(); ctx.arc(p[0], p[1] + bob - r * 0.12, r * 0.5, Math.PI, TAU); ctx.fill();
    }
  });
}
function drawScene2D(g, area, dtSec) {
  const v = view2D(g, area); const t = g.t; const ch = g.ch;
  ctx.save();
  if (area.mini) { ctx.beginPath(); roundRect(area.x, area.y, area.w, area.h, 10); ctx.clip(); }
  drawFloor(v, area);
  if (!area.mini) drawSpectators2D(g, v, t);
  if (g.D.view === 'long') {
    ctx.strokeStyle = 'rgba(255,240,210,.12)'; ctx.setLineDash([4, 8]); ctx.lineWidth = 1.5;
    [-SX, SX].forEach(x => { const a = ws(v, x, PL[0] - 0.6), b = ws(v, x, PL[3] + 0.6); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
    ctx.setLineDash([]);
    if (!area.mini) { const top = ws(v, 0, PL[0] - 1.05); ctx.fillStyle = 'rgba(255,240,210,.35)'; ctx.font = '600 12px Barlow Condensed, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('TOP OF THE SET · BAND', top[0], top[1]); }
  }
  const tgt = ch.at('P', t);
  if (t > -1 && t < g.total) {
    ctx.lineWidth = area.mini ? 2 : 3; ctx.lineCap = 'round';
    for (let i = 1; i <= 28; i++) {
      const a = ch.at('P', t + (i - 1) * 0.07), b = ch.at('P', t + i * 0.07);
      const pa = ws(v, a.x, a.y), pb = ws(v, b.x, b.y);
      ctx.strokeStyle = `rgba(226,180,92,${0.6 * (1 - i / 29)})`;
      if (i % 2) { ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke(); }
      if (i % 6 === 3 && !area.mini && Math.hypot(pb[0] - pa[0], pb[1] - pa[1]) > 1.5) { // arrowheads show which way the figure goes
        const an = Math.atan2(pb[1] - pa[1], pb[0] - pa[0]); ctx.save(); ctx.translate(pb[0], pb[1]); ctx.rotate(an);
        ctx.fillStyle = `rgba(226,180,92,${0.85 * (1 - i / 29)})`; ctx.beginPath(); ctx.moveTo(7, 0); ctx.lineTo(-5, -6); ctx.lineTo(-5, 6); ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  }
  const ids = Object.keys(ch.tr);
  const states = {}; ids.forEach(id => states[id] = area.mini ? (g.lastStates && g.lastStates[id]) || dancerState(g, id, dtSec) : dancerState(g, id, dtSec));
  if (!area.mini) g.lastStates = states;
  const pos = {}; ids.forEach(id => pos[id] = states[id].pos);
  ctx.lineCap = 'round';
  ch.links.forEach(l => {
    if (t < l.b0 || t > l.b1) return;
    if (l.ring) {
      if (l.wheel) return; // the teapots: the arms say it all
      const cxr = l.ring.reduce((a, id) => a + pos[id].x, 0) / l.ring.length, cyr = l.ring.reduce((a, id) => a + pos[id].y, 0) / l.ring.length;
      const pts = l.ring.slice().sort((a, b) => Math.atan2(pos[a].y - cyr, pos[a].x - cxr) - Math.atan2(pos[b].y - cyr, pos[b].x - cxr)).map(id => ws(v, pos[id].x, pos[id].y));
      ctx.strokeStyle = 'rgba(255,236,200,.28)'; ctx.lineWidth = 2; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.stroke();
      return;
    }
    const isP = l.a === 'P' || l.b === 'P';
    if (isP && !(g.p.gripE && g.p.gripE.b0 === l.b0)) return;
    const a = ws(v, pos[l.a].x, pos[l.a].y), b = ws(v, pos[l.b].x, pos[l.b].y);
    ctx.strokeStyle = isP ? 'rgba(226,180,92,.95)' : 'rgba(255,236,200,.45)'; ctx.lineWidth = isP ? 4 : 2;
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  });
  if (t > -1 && t < g.total + 0.5) {
    const [tx, ty] = ws(v, tgt.x, tgt.y);
    const d = dist(g.p, tgt);
    const col = d <= g.tol ? '127,208,138' : d < g.tol + 0.35 ? '240,181,74' : '239,106,94';
    const pulse = 1 + 0.06 * Math.sin(t * Math.PI * 2);
    ctx.strokeStyle = `rgba(${col},.9)`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.arc(tx, ty, Math.max(4, g.tol * v.s * pulse), 0, TAU); ctx.stroke();
    ctx.fillStyle = `rgba(${col},.12)`; ctx.fill();
  }
  if (ch.ghost && t > -1 && t < g.total) { // the weave each dancer is about to dance: a faint ghost trail two bars ahead
    ids.forEach(id => {
      ctx.strokeStyle = id === 'P' ? 'rgba(226,180,92,.8)' : 'rgba(255,236,200,.42)'; ctx.lineWidth = id === 'P' ? 3.5 : 2; ctx.lineCap = 'round'; ctx.setLineDash([1, 7]); ctx.beginPath();
      for (let k = 0; k <= 48; k++) { const q = ch.at(id, t + k / 16), [qx, qy] = ws(v, q.x, q.y); k ? ctx.lineTo(qx, qy) : ctx.moveTo(qx, qy); }
      ctx.stroke(); ctx.setLineDash([]); ctx.lineCap = 'butt';
    });
  }
  const order = ids.slice().sort((a, b) => pos[a].y - pos[b].y);
  order.forEach(id => {
    const st = states[id]; const [sx, sy] = ws(v, st.pos.x, st.pos.y);
    if (sx < area.x - 40 || sx > area.x + area.w + 40 || sy < area.y - 40 || sy > area.y + area.h + 40) return;
    const isP = id === 'P';
    const spinT = isP ? (performance.now() - g.p.spinT) / 650 : 2;
    const hopT = isP ? (performance.now() - g.p.hop) / 260 : 2;
    drawPerson2D(v, st, { player: isP, spin: spinT < 1 ? smooth(spinT) * TAU : 0, hop: hopT < 1, label: true });
  });
  if (g.hug && !area.mini) hugDraw2D(g, v, states); // THE HUG: a heart swirl round the embrace
  if (area.mini) {
    // you: a view cone in first person
    const [px, py] = ws(v, g.p.x, g.p.y);
    ctx.fillStyle = 'rgba(226,180,92,.35)'; ctx.beginPath(); ctx.moveTo(px, py); ctx.arc(px, py, 26, g.p.yaw - 0.6, g.p.yaw + 0.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#e2b45c'; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(px, py, 5, 0, TAU); ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = 'rgba(226,180,92,.5)'; ctx.lineWidth = 1; roundRect(area.x, area.y, area.w, area.h, 10); ctx.stroke();
    return;
  }
  ctx.font = '700 14px Barlow, sans-serif'; ctx.textAlign = 'center';
  g.bubbles = g.bubbles.filter(b => {
    const age = (performance.now() - b.t) / 900; if (age > 1) return false; if (age < 0) return true;
    const pp = pos[b.id]; if (!pp) return false; const [x, y] = ws(v, pp.x, pp.y);
    ctx.globalAlpha = 1 - age * age; ctx.fillStyle = b.id === 'P' ? '#cf3d3a' : 'rgba(240,232,216,.9)';
    ctx.fillText(b.text, x, y - v.s * 0.36 - age * 18); ctx.globalAlpha = 1; return true;
  });
  ctx.restore();
  const [px, py] = ws(v, g.p.x, g.p.y);
  drawPops(g, px, py - v.s * 0.6);
}

function drawPops(g, x, y) {
  ctx.textAlign = 'center';
  g.pops = g.pops.filter((pp, k) => {
    const age = (performance.now() - pp.t) / 1100; if (age > 1) return false;
    ctx.globalAlpha = 1 - age * age; ctx.fillStyle = pp.color; ctx.font = '700 16px Barlow Condensed, sans-serif';
    ctx.fillText(pp.text, x, y - age * 26 - (g.pops.length - 1 - k) * 17); ctx.globalAlpha = 1; return true;
  });
}

// One timing bar for everything with a moment: SET (press in the green), TURN (hold, then release in the green).
function timingBar(g, label, sub, t0, t1, mark, zones, done, mark2, ticks) {
  const short = H < 480;
  const fpv = SAVE.view === 'fp' && R3.ready, tch = document.body.classList.contains('touch');
  const gap = fpv && tch && W > H; // between the joystick and the buttons
  const bcx = gap ? (140 + (W - 250)) / 2 : W / 2;
  const big = !tch && !short, w = Math.min(big ? 640 : 500, gap ? W - 140 - 250 - 40 : W * (short ? 0.52 : W < 700 ? 0.7 : big ? 0.52 : 0.42)), h = big ? 26 : 16, x = bcx - w / 2;
  const y = fpv ? (tch ? H - (H > W ? 250 : 58) : 175) : short ? 104 : 132; // first person: keep faces clear, bar sits low between the controls
  const X = tt => x + clamp((tt - t0) / (t1 - t0), 0, 1) * w;
  ctx.save();
  ctx.fillStyle = 'rgba(12,23,20,.9)'; roundRect(x - 12, y - (big ? 38 : 30), w + 24, h + (big ? 70 : 58), 10); ctx.fill();
  ctx.font = (big ? '700 22px' : '700 16px') + ' Barlow Condensed, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#f0e8d8'; ctx.fillText(label, bcx, y - 12, w);
  ctx.fillStyle = '#a7b6ad'; ctx.font = (big ? '600 15px' : '600 12.5px') + ' Barlow Condensed, sans-serif'; ctx.fillText(sub, bcx, y + h + 17, w);
  ctx.beginPath(); roundRect(x, y, w, h, 5); ctx.save(); ctx.clip();
  zones.forEach(([a, b, col]) => {
    ctx.fillStyle = col; ctx.fillRect(X(a), y, Math.max(1, X(b) - X(a)), h);
    if (col.startsWith('rgba(239,106,94')) { ctx.save(); ctx.beginPath(); ctx.rect(X(a), y, X(b) - X(a), h); ctx.clip(); ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = 2; for (let hx = X(a) - h; hx < X(b); hx += 7) { ctx.beginPath(); ctx.moveTo(hx, y + h); ctx.lineTo(hx + h, y); ctx.stroke(); } ctx.restore(); }
  });
  const gz = zones.find(z => z[2].startsWith('rgba(127,208,138'));
  if (gz) { const a = X(gz[0]), b = X(gz[1]); ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2.5;
    [[a, 1], [b, -1]].forEach(([bx, d]) => { ctx.beginPath(); ctx.moveTo(bx + d * 5, y - 4); ctx.lineTo(bx, y - 4); ctx.lineTo(bx, y + h + 4); ctx.lineTo(bx + d * 5, y + h + 4); ctx.stroke(); });
    ctx.fillStyle = '#0c1714'; ctx.font = '700 11px Barlow Condensed, sans-serif'; ctx.textAlign = 'center'; if (b - a > 26) ctx.fillText('NOW', (a + b) / 2, y + h / 2 + 4); }
  ctx.restore();
  ctx.strokeStyle = 'rgba(240,232,216,.35)'; ctx.lineWidth = 1; roundRect(x, y, w, h, 5); ctx.stroke();
  const mx = X(mark);
  ctx.fillStyle = done ? (done === 'good' ? '#7fd08a' : '#ef6a5e') : '#ffffff';
  ctx.beginPath(); ctx.moveTo(mx, y - 3); ctx.lineTo(mx - 6, y - 10); ctx.lineTo(mx + 6, y - 10); ctx.closePath(); ctx.fill();
  ctx.fillRect(mx - 1.5, y - 2, 3, h + 4);
  if (mark2 != null) { ctx.fillStyle = 'rgba(240,232,216,.55)'; ctx.fillRect(X(mark2) - 1, y, 2, h); }
  (ticks || []).forEach(tk => { const tx = X(tk.t); ctx.fillStyle = tk.s === 'hit' ? '#7fd08a' : tk.s === 'miss' ? '#ef6a5e' : '#ffffff'; ctx.beginPath(); ctx.arc(tx, y + h / 2, tk.s ? 6 : 5, 0, TAU); ctx.fill(); ctx.strokeStyle = '#0c1714'; ctx.lineWidth = 1.5; ctx.stroke(); });
  ctx.restore();
}
function drawPrompts(g) {
  const t = g.t;
  const touch = document.body.classList.contains('touch');
  const cx = W / 2, cy = touch ? (H > W ? H - 210 : H - 64) : H - (W < 640 ? 82 : 96);
  const nm = id => { const p = g.ch.meta[id] && g.ch.meta[id].person; return p ? p.name : ''; };
  const GREY = 'rgba(160,170,165,.45)', RED = 'rgba(239,106,94,.85)', GREEN = 'rgba(127,208,138,.95)', GOLD = 'rgba(226,180,92,1)';
  const gwB = g.gw / g.barDur, pwB = g.pw / g.barDur, sgwB = g.sgw / g.barDur, spwB = g.spw / g.barDur;
  const keyT = g.D.autoHand ? 'TURN' : null;
  const e = g.ev.find(e => e.type === 'turn' && !e.graded && t > e.b0 - 1.4 && t < e.b1 + 1.1);
  const se = g.ev.find(e => e.type === 'set' && t > e.go - 1.3 && t < e.go + 0.9 && !(e.pressed && t > e.pressed + 0.6));
  if (g.rail && !g.rail.l && !g.rail.ar && !e && !se && t >= 0 && t < g.total) { const r = g.rail, lag = t - r.tt;
    const tf = g.figs.find(f => t >= f.b0 && t < f.b1);
    if (lag > 0.2 || !r.holding) { ctx.save(); ctx.font = '700 16px Barlow Condensed, sans-serif'; ctx.textAlign = 'center'; const msg = SAVE.travel === 'trace' ? 'DRAW THE PATH WITH YOUR FINGER OR MOUSE' : (document.body.classList.contains('touch') ? 'PUSH THE STICK TO DANCE ON' : 'HOLD W OR ↑ TO DANCE ON'); const w2 = ctx.measureText(msg).width + 30; ctx.fillStyle = lag > 0.5 ? 'rgba(239,106,94,.92)' : 'rgba(12,23,20,.85)'; roundRect(W / 2 - w2 / 2, (H < 480 ? 84 : 112), w2, 30, 7); ctx.fill(); ctx.fillStyle = '#f0e8d8'; ctx.fillText(msg, W / 2, (H < 480 ? 104 : 132)); ctx.restore(); } }
  const be = g.ev.find(x => x.type === 'beats' && t >= x.b0 - 0.6 && t <= x.b1 + 0.2);
  if (g.rail && g.rail.ar && !e && !se) {
    const r = g.rail, fwd = t < r.mid - 0.3, cl = be && be.kind === 'clap';
    const ticks = (be ? be.beats : []).map(b => ({ t: b.t, s: b.hit ? 'hit' : b.miss ? 'miss' : '' }));
    timingBar(g, fwd ? '↑ Hold FORWARD · tap SET to clap ×3' : '↓ Hold BACK · tap SET to stomp ×3', r.holding ? (fwd ? 'three steps in…' : 'three steps back…') : (fwd ? 'push forward to step in' : 'pull back to step out'),
      r.R0, r.R1, r.tt, [[r.R0, r.mid, 'rgba(127,208,138,.4)'], [r.mid, r.R1, 'rgba(226,180,92,.4)']], null, t, ticks);
  }
  if (g.rail && g.rail.l && !e && !se) { const r = g.rail, R0 = r.R0, R1 = r.R1, mid = (R0 + R1) / 2, left = t < mid - 0.35; const n = Math.min(8, Math.floor(((left ? r.tt - R0 : r.tt - mid) / (mid - R0)) * 8) + 1);
    const star = r.l.star && r.l.first === 'R';
    const first = star ? 'Hold RIGHT  ▶ · right hands across, eight steps' : '◀  Hold LEFT · eight steps to the left', back = star ? '◀  Hold LEFT · left hands back to your place' : 'Hold RIGHT  ▶ · eight steps back to the right';
    timingBar(g, left ? first : back, (r.holding ? 'stepping ' : 'hold to step · ') + 'step ' + n + ' of 8', R0, R1, r.tt, [[R0, mid, 'rgba(127,208,138,.55)'], [mid, R1, 'rgba(226,180,92,.55)']], null, t); }
  if (e) {
    const arm = 'TURN';
    const who = nm(e.with) ? ' · ' + nm(e.with) : '';
    if (e.tap) { // a half turn in the grand chain: one short window per hand
      if (!e.gripped) timingBar(g, 'TAP T · half turn' + who, (e.hand === 'R' ? 'right' : 'left') + ' hand, as you pass', e.b0 - 0.7, e.b0 + 0.7, t,
        [[e.b0 - 0.7, e.b0 - 0.35, GREY], [e.b0 - 0.35, e.b0 + 0.3, GREEN], [e.b0 + 0.3, e.b0 + 0.5, 'rgba(240,181,74,.8)'], [e.b0 + 0.5, e.b0 + 0.7, RED]]);
    } else if (!e.gripped) {
      timingBar(g, (e.lead ? 'Take hands: hold ' : 'Hold ') + arm + who, 'press as the marker reaches green', e.b0 - 1.4, e.b0 + 0.8, t,
        [[e.b0 - 1.4, e.b0 - 0.6, GREY], [e.b0 - 0.6, e.b0 + pwB * 1.5, GREEN], [e.b0 + pwB * 1.5, e.b0 + 0.5, 'rgba(240,181,74,.8)'], [e.b0 + 0.5, e.b0 + 0.8, RED]]);
    } else {
      const r = e.rel;
      timingBar(g, 'Keep holding · release in the green', 'land ' + (nm(e.with) || 'them') + ' on their spot', e.b0, r + 0.6, t,
        [[e.b0, r - gwB * 2.2, GREY], [r - gwB * 2.2, r - gwB, RED], [r - gwB, r + gwB, GREEN], [r - pwB, r + pwB, GOLD], [r + gwB, r + 0.6, RED]]);
    }
  } else if (se) {
    const who = se.with && nm(se.with) ? 'Set to ' + nm(se.with) : 'Set';
    const done = se.pressed ? (se.quality ? 'good' : 'bad') : null;
    const go = se.go, wd = se.wide || 1, sg = sgwB * wd, sp = spwB * wd, s0 = wd > 1 ? 0.9 : 1.3, s1 = wd > 1 ? 0.6 : 0.7; // solo sets: a shorter, quicker bar with a wider green
    timingBar(g, STEP_LABEL[se.req || 'pdb'] + (se.with && nm(se.with) ? ' · to ' + nm(se.with) : ''), (se.req || 'pdb') === 'pdb' ? 'press in the green, then step right, left, right, clap' + (SAVE.tricks.heli ? ' · or B for a helicopter' : '') : 'press the green with this key · the wrong key costs points', go - s0, go + s1, se.pressed || t,
      [[go - s0, go - sg * 2, GREY], [go - sg * 2, go - sg, RED], [go - sg, go + sg, GREEN], [go - sp, go + sp, GOLD], [go + sg, go + s1, RED]], done);
  }
  const ph = Math.round(t / 8) * 8;
  const needTurn = e && ((!e.gripped && t > e.b0 - 0.65) || (g.p.gripE === e));
  const relNow = e && g.p.gripE === e && Math.abs(t - e.rel) <= g.gw / g.barDur * 1.2;
  const needSet = (se && !se.pressed && t > se.go - (g.sgw / g.barDur) * 2.5) || (g.ev.some(x => x.type === 'beats' && x.beats.some(b => !b.hit && !b.miss && Math.abs(t - b.t) < 0.22)));
  const tbT = document.querySelector('.tb[data-k="KeyT"]'), tbS = document.querySelector('.tb[data-k="Space"]');
  if (tbT) { tbT.classList.toggle('cue', !!needTurn && !relNow && !e.gripped); tbT.classList.toggle('go', !!relNow); }
  if (tbS) tbS.classList.toggle('cue', !!needSet && !(se && !se.pressed && (se.req || 'pdb') !== 'pdb'));
  ['KeyF', 'KeyG', 'KeyJ'].forEach(k => { const b2 = document.querySelector('.tb[data-k="' + k + '"]'); if (b2) b2.classList.toggle('cue', !!(se && !se.pressed && needSet && SETSTEPS[se.req || 'pdb'].code === k)); });
  const spc = spinChance(g), tbR = document.querySelector('.tb[data-k="KeyR"]');
  if (tbR) { const lbl = spc ? (spc.lady ? 'SPIN' : 'SPIN HER') : 'TWIRL'; if (tbR.textContent !== lbl) tbR.textContent = lbl; tbR.classList.toggle('cue', !!(spc && spc.ok)); }
  if (spc && spc.ok && !touch && !(g.spinU && g.spinU.e === spc.e)) { ctx.fillStyle = 'rgba(142,124,195,.98)'; ctx.font = '700 15px Barlow Condensed, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(spc.lady ? 'R · SPIN UNDER HIS ARM' : 'R · SPIN HER UNDER', 18, H - 74); }
  const hoochOpen = ph > 0 && Math.abs(t - ph) < 0.45 && g.hoochPhrase !== ph / 8;
  const hb = document.querySelector('.tb[data-k="KeyH"]'); if (hb) hb.classList.toggle('cue', hoochOpen);
  if (Object.keys(TRICKS).some(k => TRICKS[k].move && SAVE.tricks[k]) && t >= 0 && t < g.total) { // the flair pulse: fills over two bars, green at the end, gold in the middle of the green
    const w = 150, h = 10, fpm = SAVE.view === 'fp' && R3.ready, x = fpm ? 18 : W - 18 - w, y = fpm ? (touch ? 84 : 140) : H < 480 ? 128 : 142, ph2 = (((t % 2) + 2) % 2) / 2, fwB = g.fw / g.barDur / 2, fd = flairD(g, t), live = Math.abs(fd.d) <= g.fw;
    ctx.save(); ctx.fillStyle = 'rgba(12,23,20,.82)'; roundRect(x - 8, y - 20, w + 16, h + 32, 8); ctx.fill();
    ctx.font = '700 13px Barlow Condensed, sans-serif'; ctx.textAlign = 'left'; ctx.fillStyle = live ? '#e2b45c' : '#a7b6ad'; ctx.fillText(live ? 'FLAIR NOW!' : 'FLAIR', x, y - 6);
    if (g.fchain > 1 && t - g.fchainT <= 4) { ctx.textAlign = 'right'; ctx.fillStyle = '#8e7cc3'; ctx.fillText('chain ×' + g.fchain, x + w, y - 6); }
    ctx.fillStyle = 'rgba(160,170,165,.35)'; ctx.fillRect(x, y, w, h);
    ctx.fillStyle = 'rgba(127,208,138,.8)'; ctx.fillRect(x + w * (1 - fwB), y, w * fwB, h); ctx.fillRect(x, y, w * fwB, h);
    ctx.fillStyle = 'rgba(226,180,92,.95)'; ctx.fillRect(x + w * (1 - fwB * 0.45), y, w * fwB * 0.45, h); ctx.fillRect(x, y, w * fwB * 0.45, h);
    ctx.fillStyle = 'rgba(240,232,216,.7)'; ctx.fillRect(x + w / 2 - 1, y, 2, h); // the half-way beat, for heel clicks
    ctx.fillStyle = '#fff'; ctx.fillRect(x + w * ph2 - 1.5, y - 3, 3, h + 6);
    ctx.restore();
    ['clap', 'leap', 'pirouette'].forEach(k => { const b = document.querySelector('.tb[data-k="' + TRICKS[k].code + '"]'); if (b) b.classList.toggle('cue', live); });
  }
  if (hoochOpen && !touch) { ctx.fillStyle = 'rgba(207,61,58,.95)'; ctx.font = '700 15px Barlow Condensed, sans-serif'; ctx.textAlign = 'left'; ctx.fillText('H · HOOCH NOW!', 18, H - 52); }
  if (SAVE.tricks.heli && t >= 0.5 && t < g.total) { // the helicopter's windows: the centre of the Eightsome, and the middle of each phrase
    const cw = (g.ch.helis || []).find(h => h.id === 'P' && !h.used && t >= h.b0 - 0.3 && t <= h.b1), pr = t % 8, hOn = (!!cw || (pr >= 3.4 && pr <= 4.6 && g.heliPh !== Math.floor(t / 8))) && !(g.heli && t < g.heli.t1);
    const hbtn = document.querySelector('.tb[data-k="KeyB"]'); if (hbtn) hbtn.classList.toggle('cue', hOn);
    if (hOn && !touch) { ctx.fillStyle = 'rgba(127,208,224,.98)'; ctx.font = '700 15px Barlow Condensed, sans-serif'; ctx.textAlign = 'left'; ctx.fillText(cw ? 'B · HELICOPTER IN THE CENTRE!' : 'B · HELICOPTER NOW!', 18, H - 96); }
  }
  if (document.body.classList.contains('touch') && H > W && t < 4) {
    ctx.fillStyle = 'rgba(226,180,92,.95)'; ctx.font = '700 14px Barlow Condensed, sans-serif'; ctx.textAlign = 'center';
    ctx.fillText('TURN YOUR PHONE SIDEWAYS FOR MORE ROOM', W / 2, 118);
  }
  if (t < 0) {
    const n = Math.ceil(-t * 2);
    ctx.fillStyle = 'rgba(240,232,216,.92)'; ctx.font = '400 54px Uncial Antiqua, serif'; ctx.textAlign = 'center';
    ctx.fillText(n > 0 ? String(n) : '', W / 2, H * 0.42);
  }
}
function roundRect(x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
