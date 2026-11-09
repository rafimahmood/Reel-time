/* Reel Time · view-3d.js
   The first-person view in three.js: dancers built from primitives, and the ballroom. */
"use strict";

/* ================= 3D view (first person) ================= */
const R3 = { ready: false, failed: false };
const M3 = 1.15; // metres per dance unit
// Woven tartan: each sett is mirrored and the threads cross in a 2/2 twill, like real cloth.
// (the setts live in TARTANS[key].sett, built from thread counts near the top of the file)
const SETTLINES = {};
function settLine(key) {
  if (SETTLINES[key]) return SETTLINES[key];
  const sett = (TARTANS[key] || TARTANS.red).sett, half = [];
  sett.forEach(([c, n]) => { for (let i = 0; i < n; i++) half.push(c); });
  const line = half.concat(half.slice().reverse());
  return SETTLINES[key] = line.map(h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
}
// a small flat swatch for menus: warp and weft averaged, cached as a data URL
const SWATCHES = {};
function tartanSwatch(key) {
  if (SWATCHES[key]) return SWATCHES[key];
  try {
    const line = settLine(key), N = line.length, S = 56, c = document.createElement('canvas'); c.width = c.height = S; const x = c.getContext('2d');
    const img = x.createImageData(S, S), d = img.data;
    for (let py = 0; py < S; py++) for (let px = 0; px < S; px++) {
      const p = line[Math.floor((px + 0.5) / S * N)], q = line[Math.floor((py + 0.5) / S * N)], i = (py * S + px) * 4;
      d[i] = (p[0] + q[0]) >> 1; d[i + 1] = (p[1] + q[1]) >> 1; d[i + 2] = (p[2] + q[2]) >> 1; d[i + 3] = 255;
    }
    x.putImageData(img, 0, 0); return SWATCHES[key] = c.toDataURL();
  } catch (e) { return ''; }
}
function tartanCanvas(key, size) {
  const line = settLine(key), N = line.length;
  const c = document.createElement('canvas'); c.width = c.height = size; const x = c.getContext('2d');
  const img = x.createImageData(size, size), d = img.data;
  for (let py = 0; py < size; py++) for (let px = 0; px < size; px++) {
    const tx = Math.floor(px / size * N), ty = Math.floor(py / size * N);
    const warp = ((px + py) >> 1) % 2 === 0; // 2/2 twill
    const col = warp ? line[tx] : line[ty];
    const shade = 0.9 + 0.1 * (((px * 7 + py * 13) % 5) / 4); // a touch of yarn texture
    const i = (py * size + px) * 4; d[i] = col[0] * shade; d[i + 1] = col[1] * shade; d[i + 2] = col[2] * shade; d[i + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  return c;
}
function tartanTexture(key) {
  R3.tt = R3.tt || {};
  if (R3.tt[key]) return R3.tt[key];
  const tex = new THREE.CanvasTexture(tartanCanvas(key, settLine(key).length > 170 ? 512 : 256)); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.repeat.set(3, 1.2); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  R3.tt[key] = tex; return tex;
}
function labelSprite(text, gold) {
  const c = document.createElement('canvas'); c.width = 256; c.height = 64; const x = c.getContext('2d');
  x.font = '600 30px Barlow, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  const w = Math.min(250, x.measureText(text).width + 28);
  x.fillStyle = 'rgba(12,23,20,.7)'; x.beginPath(); x.moveTo(128 - w / 2 + 14, 10); x.arcTo(128 + w / 2, 10, 128 + w / 2, 54, 14); x.arcTo(128 + w / 2, 54, 128 - w / 2, 54, 14); x.arcTo(128 - w / 2, 54, 128 - w / 2, 10, 14); x.arcTo(128 - w / 2, 10, 128 + w / 2, 10, 14); x.fill();
  x.fillStyle = gold ? '#e2b45c' : '#f0e8d8'; x.fillText(text, 128, 33);
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }));
  sp.scale.set(0.8, 0.2, 1); return sp;
}
function mat(color, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color, roughness: 0.75, metalness: 0 }, extra || {})); }

// A dancer built from simple solids: legs, kilt or gown, jacket or bodice, arms on shoulder pivots, head and hair.
const GEO = {}; const geo = (k, f) => GEO[k] || (GEO[k] = f());
// A dancer: jointed legs and arms, lathed torso, pleated kilt or flowing gown, a proper face and hair.
// A Mii-style face, painted onto the front of the head (u = 0.5 faces forward).
const FACES = {}, FACE_ORDER = [];
function paintFace3D(x, f, skin, hair, lady) {
  const cx = 256, v = f.v | 0, dark = hexLum(skin) < 0.33, lip = f.lp || (lady ? '#b2404a' : '#8a3a33'), bcol = f.bdc || hair, ec = f.ec || EYEC[v], brow = f.bc || hair, es = f.es, mz = f.mz, TWO = Math.PI * 2;
  const rgba = (h, a) => { const q = hexRGB(h); return `rgba(${q[0]},${q[1]},${q[2]},${a})`; };
  let seed = 4242; const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  x.fillStyle = skin; x.fillRect(0, 0, 512, 256);
  x.fillStyle = dark ? rgba('#a03c3c', 0.36 * f.bl) : rgba('#eb6e6e', 0.56 * f.bl); // cheeks
  [-1, 1].forEach(s => { x.beginPath(); x.ellipse(cx + s * 46, 152, 13, 8, 0, 0, TWO); x.fill(); });
  if (f.fr) { x.fillStyle = rgba(mixHex(skin, '#6b3a1c', dark ? 0.35 : 0.75), 0.7); for (let i = 0, n = f.fr * 16; i < n; i++) { const a = rnd() * TWO, d = Math.sqrt(rnd()); x.beginPath(); x.arc(cx + Math.cos(a) * 58 * d, 146 + Math.sin(a) * 14 * d, 1.1 + rnd() * 1.2, 0, TWO); x.fill(); } }
  if (f.bd) { // facial hair, painted under the features: stubble, moustache, goatee, full beard, mutton chops
    const jaw = () => { x.beginPath(); x.moveTo(cx - 96, 108); x.bezierCurveTo(cx - 102, 178, cx - 60, 234, cx, 238); x.bezierCurveTo(cx + 60, 234, cx + 102, 178, cx + 96, 108); x.bezierCurveTo(cx + 84, 132, cx + 66, 150, cx + 44, 150); x.quadraticCurveTo(cx, 146, cx - 44, 150); x.bezierCurveTo(cx - 66, 150, cx - 84, 132, cx - 96, 108); x.closePath(); };
    const speck = (n, a) => { for (let i = 0; i < n; i++) { const px = cx - 100 + rnd() * 200, py = 118 + rnd() * 120; x.fillStyle = rnd() < 0.5 ? rgba(mixHex(bcol, '#000000', 0.35), a) : rgba(mixHex(bcol, '#ffffff', 0.18), a); x.fillRect(px, py, 1.4, 2.6); } };
    if (f.bd === 1) { x.save(); jaw(); x.clip(); x.fillStyle = rgba(bcol, 0.3); x.fillRect(0, 0, 512, 256); speck(1400, 0.42); x.restore(); }
    if (f.bd === 4) { x.save(); jaw(); x.fillStyle = bcol; x.fill(); x.clip(); speck(900, 0.3); x.restore(); x.fillStyle = skin; x.beginPath(); x.ellipse(cx, 167, 21 * mz, 9 * mz, 0, 0, TWO); x.fill(); }
    if (f.bd === 5) [-1, 1].forEach(s => { x.fillStyle = bcol; x.beginPath(); x.moveTo(cx + s * 84, 96); x.lineTo(cx + s * 98, 104); x.bezierCurveTo(cx + s * 104, 170, cx + s * 80, 205, cx + s * 52, 210); x.bezierCurveTo(cx + s * 66, 175, cx + s * 74, 140, cx + s * 84, 96); x.fill(); });
    if (f.bd === 3) { x.fillStyle = bcol; x.beginPath(); x.ellipse(cx, 198, 19, 17, 0, 0, TWO); x.fill(); }
    if (f.bd >= 2) { x.fillStyle = bcol; [-1, 1].forEach(s => { x.beginPath(); x.ellipse(cx + s * 15, 156, 19, 6.5, s * 0.22, 0, TWO); x.fill(); }); }
  }
  [-1, 1].forEach(s => { // eyes: big whites, iris, a catchlight
    const ex = cx + s * (30 + f.ed * 7), ey = 124;
    if (f.sh) { x.fillStyle = rgba(f.sh, 0.62); x.beginPath(); x.ellipse(ex, ey - 9 * es, 15.5 * es, 10 * es, 0, 0, TWO); x.fill(); }
    x.fillStyle = '#fbfaf7'; x.beginPath(); x.ellipse(ex, ey, 10.5 * es, 13 * es, 0, 0, TWO); x.fill();
    x.fillStyle = ec; x.beginPath(); x.ellipse(ex + s * 0.5, ey + 1.5 * es, 7 * es, 9 * es, 0, 0, TWO); x.fill();
    x.fillStyle = '#111'; x.beginPath(); x.ellipse(ex + s * 0.5, ey + 2 * es, 3.6 * es, 4.6 * es, 0, 0, TWO); x.fill();
    x.fillStyle = '#fff'; x.beginPath(); x.arc(ex + 2.5 * es, ey - 3 * es, 2.6 * es, 0, TWO); x.fill();
    x.strokeStyle = 'rgba(40,25,15,.85)'; x.lineWidth = lady ? 3 : 2; x.lineCap = 'round';
    x.beginPath(); x.ellipse(ex, ey, 10.5 * es, 13 * es, 0, Math.PI * 1.08, Math.PI * 1.92); x.stroke();
    if (lady) { x.lineWidth = 2; [-0.6, 0, 0.6].forEach(o => { const a = Math.PI * 1.5 + o * 0.5 + s * 0.35; x.beginPath(); x.moveTo(ex + Math.cos(a) * 11 * es, ey + Math.sin(a) * 13 * es); x.lineTo(ex + Math.cos(a) * 15 * es + s * 2, ey + Math.sin(a) * 17 * es); x.stroke(); }); }
    x.strokeStyle = brow; x.lineWidth = (lady ? 3.2 : 5) * f.bt; // eyebrows
    const by = 100 - (es - 1) * 10, xi = ex - s * 11, xo = ex + s * 11; x.beginPath();
    if (f.bs === 1) { x.moveTo(xi, by - 2); x.lineTo(xo, by - 2); }
    else if (f.bs === 2) { x.moveTo(xi, by + 6); x.quadraticCurveTo(ex, by - 1, xo, by - 4); }
    else if (f.bs === 3) { x.moveTo(xi, by - 6); x.quadraticCurveTo(ex, by - 4, xo, by + 5); }
    else if (f.bs === 4) { x.moveTo(xi, by - 4); x.quadraticCurveTo(ex, by - 22, xo, by - 5); }
    else { x.moveTo(xi, by + (s < 0 ? 1 : 0)); x.quadraticCurveTo(ex, by - 7 - v, xo, by + (s > 0 ? 1 : 0)); }
    x.stroke();
    if (f.ag) { x.strokeStyle = 'rgba(80,40,25,' + 0.13 * f.ag + ')'; x.lineWidth = 1.6; for (let i = -1; i <= 1; i++) { x.beginPath(); x.moveTo(ex + s * 15, ey + i * 4); x.lineTo(ex + s * 25, ey + i * 8); x.stroke(); } x.beginPath(); x.ellipse(ex, ey + 15 * es, 11, 4, 0, 0.2, Math.PI - 0.2); x.stroke(); }
  });
  x.strokeStyle = 'rgba(120,60,40,.45)'; x.lineWidth = 2.5; x.lineCap = 'round'; const nz = f.ns; x.beginPath(); // nose
  if (f.nh === 1) { x.moveTo(cx - 3, 112); x.lineTo(cx - 4 * nz, 143); x.quadraticCurveTo(cx, 151, cx + 5 * nz, 144); }
  else if (f.nh === 2) { x.moveTo(cx + 2, 108); x.lineTo(cx - 5 * nz, 145); x.quadraticCurveTo(cx, 153 + 3 * nz, cx + 6 * nz, 146); }
  else if (f.nh === 3) { x.moveTo(cx - 10 * nz, 145); x.quadraticCurveTo(cx, 152 + 3 * nz, cx + 10 * nz, 145); }
  else { x.moveTo(cx - 4 * nz, 146); x.quadraticCurveTo(cx, 150 + 2 * nz, cx + 4 * nz, 146); }
  x.stroke();
  const mw = 13 * mz; x.strokeStyle = lip; x.lineWidth = lady ? 4 : 3.2; // mouth
  if (f.lp && f.ms !== 5) { x.fillStyle = rgba(f.lp, 0.92); x.beginPath(); x.ellipse(cx, 166, mw * 0.95, 5.8 * mz, 0, 0, TWO); x.fill(); }
  x.beginPath();
  if (f.ms === 1) { const g = mw * 1.35; x.fillStyle = '#fff'; x.moveTo(cx - g, 163); x.quadraticCurveTo(cx, 184, cx + g, 163); x.quadraticCurveTo(cx, 170, cx - g, 163); x.fill(); x.beginPath(); x.moveTo(cx - g, 163); x.quadraticCurveTo(cx, 184, cx + g, 163); }
  else if (f.ms === 2) { x.moveTo(cx - mw * 0.9, 168); x.lineTo(cx + mw * 0.9, 168); }
  else if (f.ms === 3) { x.fillStyle = f.lp || (lady ? '#c25a62' : '#b4605a'); x.ellipse(cx, 167, mw * 0.65, 5.5 * mz, 0, 0, TWO); x.fill(); x.beginPath(); x.moveTo(cx - mw * 0.65, 167); x.lineTo(cx + mw * 0.65, 167); }
  else if (f.ms === 4) { x.moveTo(cx - mw * 0.85, 168); x.quadraticCurveTo(cx + mw * 0.1, 172, cx + mw * 1.1, 160); }
  else if (f.ms === 5) { x.fillStyle = '#5a1c1c'; x.ellipse(cx, 169, 6.2 * mz, 8.5 * mz, 0, 0, TWO); x.fill(); x.beginPath(); x.ellipse(cx, 169, 6.2 * mz, 8.5 * mz, 0, 0, TWO); }
  else { x.moveTo(cx - mw, 163); x.quadraticCurveTo(cx, 174 + v + (mz - 1) * 5, cx + mw, 163); }
  x.stroke();
  if (f.ag) { x.strokeStyle = 'rgba(80,40,25,' + 0.13 * f.ag + ')'; x.lineWidth = 1.7; [-1, 1].forEach(s => { x.beginPath(); x.moveTo(cx + s * 17, 148); x.quadraticCurveTo(cx + s * 30, 158, cx + s * 25, 176); x.stroke(); }); for (let i = 0; i < 3; i++) { x.beginPath(); x.moveTo(cx - 44, 70 + i * 9); x.quadraticCurveTo(cx, 64 + i * 9, cx + 44, 70 + i * 9); x.stroke(); } }
}
function faceTexture(per, kind) {
  const f = faceOf(per), skin = skinHex(per), hair = hairHex(per), key = [skin, hair, kind, JSON.stringify(f)].join('|');
  if (FACES[key]) return FACES[key];
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; paintFace3D(c.getContext('2d'), f, skin, hair, kind === 'lady');
  const tex = new THREE.CanvasTexture(c); tex.encoding = THREE.sRGBEncoding; tex.anisotropy = 4;
  FACES[key] = tex; FACE_ORDER.push(key);
  if (FACE_ORDER.length > 80) { const k = FACE_ORDER.shift(); try { FACES[k].dispose(); } catch (e) { } delete FACES[k]; } // dragging a slider makes many; a disposed texture simply re-uploads if a model still uses it
  return tex;
}
// Lathe a smooth body part from [radius, height] points; optional ripple for pleats and folds (only on one side if 'back').
function lathe(key, pts, seg, ripple, n, fromY, toY, back, box) {
  return geo('lathe:' + key, () => {
    const gm = new THREE.LatheGeometry(pts.map(q => new THREE.Vector2(q[0], q[1])), seg || 24);
    if (ripple) {
      const pa = gm.attributes.position;
      for (let i = 0; i < pa.count; i++) {
        const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x);
        const k = clamp((toY - y) / (toY - fromY), 0, 1);
        const side = back ? smooth(clamp((-Math.cos(Math.atan2(z, x) - Math.PI / 2 * 0) + 0.2) / 1.2, 0, 1)) : 1; // pleats round the back (-x)
        const f = 1 + ripple * (box ? clamp(Math.sin(a * n) * 3, -1, 1) : Math.sin(a * n)) * (back ? side : k); // box = square-wave pleats
        pa.setX(i, x * f); pa.setZ(i, z * f);
      }
      gm.computeVertexNormals();
    }
    return gm;
  });
}
// A speckled tweed for the Sheriffmuir jacket (tinted by the jacket colour)
function tweedTexture() {
  if (R3.tweed) return R3.tweed;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#d9d9d9'; x.fillRect(0, 0, 128, 128);
  let s = 12345; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647;
  for (let i = 0; i < 900; i++) { const v = rnd(), g = v < 0.4 ? 255 : v < 0.7 ? 150 : 90; x.fillStyle = `rgba(${g},${g},${g},${0.35 + rnd() * 0.4})`; x.fillRect(rnd() * 128, rnd() * 128, 1 + rnd() * 2, 1 + rnd() * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.encoding = THREE.sRGBEncoding;
  return R3.tweed = t;
}
// a herringbone weave for the grey and russet tweeds (tinted by the jacket colour)
function herringTexture() {
  if (R3.herr) return R3.herr;
  const c = document.createElement('canvas'); c.width = c.height = 128; const x = c.getContext('2d');
  x.fillStyle = '#cfcfcf'; x.fillRect(0, 0, 128, 128); x.strokeStyle = 'rgba(255,255,255,.55)'; x.lineWidth = 2;
  for (let r = 0; r < 16; r++) for (let q = 0; q < 16; q++) { const px = q * 8, py = r * 8, dir = (q % 2) ? 1 : -1; x.beginPath(); for (let k = 0; k < 8; k += 2) { x.moveTo(px, py + k + (dir > 0 ? 0 : 8)); x.lineTo(px + 8, py + k + (dir > 0 ? 8 : 0)); } x.stroke(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(5, 5); t.encoding = THREE.sRGBEncoding;
  return R3.herr = t;
}
// shirt weaves: check, gingham, pinstripe and stripe, drawn on the shirt's base colour (three tiles round a sleeve)
function shirtTexture(kind, base, ink) {
  const key = 'shirt:' + kind + base + ink; if (R3[key]) return R3[key];
  const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
  x.fillStyle = base; x.fillRect(0, 0, 64, 64); x.fillStyle = ink;
  if (kind === 'check') { x.fillRect(0, 0, 64, 3); x.fillRect(0, 32, 64, 3); x.fillRect(0, 0, 3, 64); x.fillRect(32, 0, 3, 64); }
  else if (kind === 'gingham') { x.globalAlpha = 0.5; [0, 32].forEach(a => { x.fillRect(0, a, 64, 16); x.fillRect(a, 0, 16, 64); }); }
  else if (kind === 'pin') { x.fillRect(0, 0, 2, 64); x.fillRect(32, 0, 2, 64); }
  else { x.globalAlpha = 0.85; [4, 20, 36, 52].forEach((a, i) => x.fillRect(a, 0, i % 2 ? 5 : 9, 64)); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(3, 3); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return R3[key] = t;
}
// white lace (scalloped bottom edge, holes) for the jabot frills and the lace gloves; used with an alpha test so skin or shirt shows through
function laceTexture() {
  if (R3.lace) return R3.lace;
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const x = c.getContext('2d');
  x.clearRect(0, 0, 128, 64); x.fillStyle = '#fff'; x.fillRect(0, 0, 128, 8);
  for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(16 + i * 32, 8, 16, 0, Math.PI); x.fill(); }
  x.globalCompositeOperation = 'destination-out';
  for (let r = 0; r < 4; r++) for (let q = 0; q < 16; q++) { x.beginPath(); x.arc(4 + q * 8 + (r % 2) * 4, 16 + r * 8, 1.5, 0, TAU); x.fill(); }
  x.globalCompositeOperation = 'source-over'; x.fillStyle = '#fff'; for (let i = 0; i < 4; i++) { x.beginPath(); x.arc(16 + i * 32, 30, 5, 0, TAU); x.fill(); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  return R3.lace = t;
}
// a little ankle wobble for ladies in high heels (heel 3 and 4); also moves the whole body a touch
function heelWobble(m, t) {
  if (!m || !m.feet || m.heel < 3) return;
  const a = m.heel - 2;
  m.feet.forEach((f, i) => { f.rotation.x = 0.075 * a * Math.sin(t * 7.3 + i * 2.1); f.rotation.z = -m.th + 0.05 * a * Math.sin(t * 5.1 + i * 1.3); });
  if (m.lifter) { m.lifter.rotation.x = 0.012 * a * Math.sin(t * 3.3); m.lifter.rotation.z = 0.01 * a * Math.sin(t * 2.7 + 1); }
}
// A dancer in the friendly Mii style: a big round head with a painted face, a rounded body,
// a proper kilt outfit or ball gown. Body faces +x.
function makePerson3D(per, kind, withLabel, lite) {
  const root = new THREE.Group();
  const lifter = new THREE.Group(); root.add(lifter); // lifts a lady up onto her heels
  const body = new THREE.Group(); lifter.add(body);
  const k = (per.height || 1.75) / 1.75; body.scale.setScalar(k);
  const gent = kind === 'gent';
  const heel = effHeel({ kind, shoe: per.shoe, heel: per.heel }), HH = HEEL_H[heel], th = HH ? Math.asin(Math.min(0.9, HH / 0.2)) : 0;
  const lift = HH ? 0.12 * Math.sin(th) + 0.05 * Math.cos(th) - 0.05 : 0; lifter.position.y = lift * k;
  const kiltT = per.kilt || 'classic', trews = gent && kiltT === 'trews', jtype = per.jacket || 'pc', shoeT = gent ? (per.shoe === 'ghillie' ? 'ghillie' : 'gent') : (per.shoe || 'pump');
  const wd = wdOf(per), fp = faceOf(per), glv = glvOf(per);
  const skinC = new THREE.Color(skinHex(per));
  const skinM = mat(skinC, { roughness: 0.6 }), hairM = mat(hairHex(per), { roughness: 0.38, metalness: 0.05 });
  const tart = mat(0xffffff, { map: tartanTexture(per.tartan || 'red'), side: THREE.DoubleSide, roughness: 0.85 });
  const silver = mat(0xd8d8dc, { metalness: 0.9, roughness: 0.25 });
  const M = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const shadow = M(geo('shadow', () => new THREE.CircleGeometry(0.42, 24)), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.3, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.006; root.add(shadow);
  // legs: hip > knee > foot
  const hoseM = mat(gent ? (SOCKC[wd.hose] || SOCKC[0])[0] : 0xf3e9df, { roughness: 0.9 }), shoeM = mat(0x0b0b0b, { roughness: 0.3, metalness: 0.1 });
  const legs = [], knees = [], feet = [];
  [-1, 1].forEach(side => {
    const hip = new THREE.Group(); hip.position.set(0, 0.82, side * 0.085);
    hip.add(M(trews ? geo('m-thigh-t', () => new THREE.CylinderGeometry(0.083, 0.07, 0.4, 14)) : geo('m-thigh', () => new THREE.CylinderGeometry(0.075, 0.062, 0.4, 14)), gent ? (trews ? tart : skinM) : hoseM, 0, -0.2));
    const knee = new THREE.Group(); knee.position.y = -0.4; hip.add(knee);
    knee.add(M(trews ? geo('m-knee-t', () => new THREE.SphereGeometry(0.071, 12, 10)) : geo('m-knee', () => new THREE.SphereGeometry(0.063, 12, 10)), gent ? (trews ? tart : skinM) : hoseM));
    knee.add(M(trews ? geo('m-shin-t', () => new THREE.CylinderGeometry(0.07, 0.056, 0.36, 14)) : geo('m-shin', () => new THREE.CylinderGeometry(0.062, 0.045, 0.36, 14)), trews ? tart : hoseM, 0, -0.18));
    if (gent && !trews) {
      knee.add(M(geo('m-hosetop', () => new THREE.CylinderGeometry(0.068, 0.066, 0.07, 14)), hoseM, 0, -0.04)); // the turned-down top of the hose
      if (!lite && FLASHC[wd.flash]) { const fl = M(geo('m-flash', () => new THREE.BoxGeometry(0.03, 0.08, 0.012)), mat(FLASHC[wd.flash]), 0.02, -0.1, side * 0.071); fl.userData.acc = 'flash'; knee.add(fl); }
      if (!lite && side > 0 && wd.sgian) { const sd = M(geo('m-sgian', () => new THREE.CylinderGeometry(0.012, 0.014, 0.07, 8)), mat(0x111111, { roughness: 0.3 }), 0.072, -0.03, 0.036); sd.userData.acc = 'sgian'; knee.add(sd); const st = M(geo('m-sgiantop', () => new THREE.SphereGeometry(0.013, 8, 6)), silver, 0.072, 0.006, 0.036); st.userData.acc = 'sgian'; knee.add(st); }
      if (!lite) [0, 1, 2].forEach(i => { const lace = M(geo('m-lace', () => new THREE.BoxGeometry(0.004, 0.004, 0.11)), mat(0x111111), 0.03, -0.3 + i * 0.035, 0); lace.rotation.x = i % 2 ? 0.6 : -0.6; knee.add(lace); });
    }
    // the foot hangs from the ankle (knee-local y -0.36); a heel pitches it toes-down and the whole dancer is lifted to match
    const foot = new THREE.Group(); foot.position.y = -0.36; foot.rotation.z = -th; knee.add(foot); feet.push(foot);
    const shoeBlob = (key, sx, sy, sz, mm, x, y) => { const o = M(geo('m-shoe', () => new THREE.SphereGeometry(0.065, 14, 10)), mm || shoeM, x == null ? 0.05 : x, y == null ? -0.01 : y, 0); o.scale.set(sx, sy, sz); foot.add(o); return o; };
    const gold = mat(0xcfae5a, { metalness: 0.8, roughness: 0.3 });
    if (shoeT === 'strappy') {
      shoeBlob('s', 1.8, 0.5, 0.82, hoseM, 0.05, -0.012); shoeBlob('s2', 1.9, 0.16, 0.9, gold, 0.05, -0.046);
      const ank = M(geo('m-ankstrap', () => new THREE.TorusGeometry(0.05, 0.005, 6, 18)), gold, 0, 0.01, 0); ank.rotation.x = Math.PI / 2; foot.add(ank);
      [0.03, 0.095].forEach(px => { const st = M(geo('m-instep', () => new THREE.TorusGeometry(0.052, 0.005, 6, 16)), gold, px, -0.012, 0); st.rotation.y = Math.PI / 2; st.scale.set(1, 0.6, 1); foot.add(st); });
    } else if (shoeT === 'flat') {
      shoeBlob('f', 1.85, 0.42, 0.9, shoeM, 0.05, -0.022);
      const bow = M(geo('m-flatbow', () => new THREE.SphereGeometry(0.014, 8, 6)), mat(0xb2404a), 0.115, -0.018, 0); bow.scale.set(0.8, 0.8, 1.8); foot.add(bow);
    } else if (shoeT === 'ghillie') {
      shoeBlob('g', 1.9, 0.48, 0.88, shoeM, 0.05, -0.022);
      [0, 1, 2, 3].forEach(i => { const lc = M(geo('m-gtie', () => new THREE.TorusGeometry(0.05, 0.0035, 5, 16)), mat(0x111111), 0, -0.31 + i * 0.04, 0); lc.rotation.x = Math.PI / 2 + (i % 2 ? 0.4 : -0.4); lc.scale.set(1 + i * 0.03, 1 + i * 0.03, 1); knee.add(lc); });
    } else {
      shoeBlob('p', 1.9, 0.62, 0.9, shoeM, 0.05, -0.01);
      if (shoeT === 'gent' && !lite) { // brogues: a lace plate with crossed laces, and a toe-cap seam
        foot.add(M(geo('m-bplate', () => new THREE.BoxGeometry(0.07, 0.008, 0.045)), shoeM, 0.05, 0.0315, 0));
        [0.025, 0.05, 0.075].forEach((px, i) => { const lc = M(geo('m-blace', () => new THREE.BoxGeometry(0.004, 0.003, 0.05)), mat(0x2a2a2a), px, 0.037, 0); lc.rotation.y = i % 2 ? 0.55 : -0.55; foot.add(lc); });
      }
      if (shoeT === 'boot') knee.add(M(geo('m-boot', () => new THREE.CylinderGeometry(0.057, 0.052, 0.17, 14)), shoeM, 0, -0.275));
    }
    if (heel > 0 && shoeT !== 'gent') {
      const hl = 0.175 * Math.tan(th), rt = [0, 0.03, 0.028, 0.021, 0.015][heel], rb = [0, 0.026, 0.021, 0.012, 0.0065][heel];
      foot.add(M(geo('m-heel' + heel, () => new THREE.CylinderGeometry(rt, rb, hl + 0.025, 10)), shoeT === 'strappy' ? gold : shoeM, -0.053, -0.02 - (hl + 0.025) / 2, 0));
    }
    body.add(hip); legs.push(hip); knees.push(knee);
  });
  let topC, skirtGrp = null, sleeveM = null;
  const rAt = (pts, y) => { for (let i = 1; i < pts.length; i++) { const a = pts[i - 1], b = pts[i]; if (y >= a[1] && y <= b[1]) return a[0] + (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]); } return pts[pts.length - 1][0]; };
  if (gent) {
    const jc = new THREE.Color(JACKETC[per.jcol || 0] || JACKETC[0]).convertSRGBToLinear(); // the swatch colours are sRGB: convert so a dark jacket really looks dark on screen
    const SH = SHIRTC[wd.shirt] || SHIRTC[0], white = mat(SH[0], { roughness: 0.72, side: THREE.DoubleSide, map: SH[2] ? shirtTexture(SH[2], SH[0], SH[3]) : null }); // the shirt: its own material, never shared with the neckwear
    const shirtP = white.clone(); shirtP.polygonOffset = true; shirtP.polygonOffsetFactor = -1; shirtP.polygonOffsetUnits = -1; // the front panel sits a few mm proud of the jacket
    // kilt: flat apron at the front, knife or box pleats round the back, a silver kilt pin (or, for trews, a tartan pelvis)
    const kPts = kiltT === 'short' ? [[0.19, 0.98], [0.2, 0.9], [0.213, 0.8], [0.222, 0.7], [0.228, 0.64]] : [[0.19, 0.98], [0.2, 0.9], [0.215, 0.78], [0.235, 0.62], [0.25, 0.5]];
    const kAsc = kPts.slice().reverse(), kR = y => rAt(kAsc, clamp(y, kAsc[0][1], kAsc[kAsc.length - 1][1])); // radius of the smooth front apron at a height
    if (trews) body.add(M(lathe('m-trewhip', [[0.0, 0.99], [0.19, 0.99], [0.2, 0.93], [0.19, 0.85], [0.16, 0.8], [0.0, 0.8]], 28), tart));
    else {
      const kilt = kiltT === 'box' ? M(lathe('m-kilt-box', kPts, 56, 0.07, 14, 0.98, 0.5, true, true), tart)
        : kiltT === 'short' ? M(lathe('m-kilt-short', kPts, 48, 0.05, 28, 0.98, 0.64, true), tart)
          : M(lathe('m-kilt', kPts, 48, 0.05, 30, 0.98, 0.5, true), tart);
      body.add(kilt);
      if (!lite && wd.pin) { // the pin sits just outside the front apron, on the right-hand corner
        const py = kiltT === 'short' ? 0.7 : 0.6, pz = 0.11, px = Math.sqrt(Math.max(0, kR(py) * kR(py) - pz * pz)) + 0.014;
        const pin = M(geo('m-kiltpin', () => new THREE.CylinderGeometry(0.006, 0.006, 0.08, 6)), silver, px, py, pz); pin.rotation.x = 0.4; pin.userData.acc = 'pin'; body.add(pin);
        const pk = M(geo('m-pinknob', () => new THREE.SphereGeometry(0.013, 8, 6)), silver, px, py + 0.036, pz - 0.015); pk.userData.acc = 'pin'; body.add(pk);
      }
    }
    body.add(M(geo('m-belt', () => new THREE.CylinderGeometry(0.19, 0.19, 0.045, 28)), mat(0x111111, { roughness: 0.35 }), 0, 0.99));
    body.add(M(geo('m-buckle', () => new THREE.BoxGeometry(0.02, 0.05, 0.07)), silver, 0.19, 0.99, 0));
    // sporrans: a dozen kinds in different furs and shapes, every one hung outside the kilt apron (kR(y) is the apron's radius at that height, plus a gap). Not with trews.
    if (!trews && wd.sporran !== 'none') {
      const acc = o => { o.userData.acc = 'sporran'; body.add(o); return o; };
      const spT = wd.sporran, kLow = kiltT === 'short' ? 0.66 : 0.52, px = (y, ry, hx) => kR(y - ry) + hx + 0.004, /* x so an ellipsoid of half-height ry and half-thickness hx clears the apron below it */ tmat = (c, o) => mat(c, Object.assign({ roughness: 0.85 }, o || {}));
      const sph = (key, r, sx, sy, sz, m, x, y, z) => { const o = acc(M(geo('m-sp-' + key, () => new THREE.SphereGeometry(r, 16, 12)), m, x, y, z || 0)); o.scale.set(sx, sy, sz); return o; };
      const cantle = (x, y, c) => acc(M(geo('m-cantle', () => new THREE.BoxGeometry(0.03, 0.035, 0.15)), c || silver, x, y, 0));
      const tassels = (n, x, y, len, w, m, cap) => { for (let i = 0; i < n; i++) { const z = (i - (n - 1) / 2) * w; acc(M(geo('m-tas' + len, () => new THREE.CylinderGeometry(0.009, 0.015, len, 6)), m, x, y, z)); if (cap) acc(M(geo('m-tascap', () => new THREE.CylinderGeometry(0.012, 0.012, 0.014, 8)), silver, x, y + len / 2, z)); } };
      const strandMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, side: THREE.DoubleSide });
      const strands = (key, o) => acc(M(geo('m-str-' + key + '-' + kiltT, () => { // many thin tapered strands of fur hanging down the kilt's slope, in a colour that runs from the root to the tip
        const NS = 5, pos = [], col = [], idx = [], c1 = new THREE.Color(o.cA), c2 = new THREE.Color(o.cB), cm = o.cM ? new THREE.Color(o.cM) : null, tmp = new THREE.Color();
        const hh = i => { const x = Math.sin(i * 127.1 + 311.7 + (o.seed || 0) * 7.7) * 43758.5453; return x - Math.floor(x); };
        for (let i = 0; i < o.n; i++) {
          const z0 = o.spread * (2 * hh(i) - 1), dep = hh(i + 91), L = (o.y0 - o.y1) * (0.82 + 0.18 * hh(i + 17)), br = 0.82 + 0.3 * hh(i + 53), base = pos.length / 3;
          for (let k = 0; k <= NS; k++) {
            const t = k / NS, y = o.y0 - L * t, x = kR(y) + o.gap0 + (o.gap1 - o.gap0) * t + 0.012 * dep + (o.bulge || 0) * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.5), z = z0 * (1 + o.fan * t) + 0.004 * Math.sin(i * 3.1 + t * 5), rad = o.th * (1 - 0.75 * t * t);
            if (cm) { if (t < 0.35) tmp.copy(c1).lerp(cm, t / 0.35); else if (t < 0.72) tmp.copy(cm); else tmp.copy(cm).lerp(c2, (t - 0.72) / 0.28); } else tmp.copy(c1).lerp(c2, t);
            for (let j = 0; j < 3; j++) { const a = j * TAU / 3 + 0.5; pos.push(x + rad * Math.cos(a), y, z + rad * Math.sin(a)); col.push(tmp.r * br, tmp.g * br, tmp.b * br); }
          }
          for (let k = 0; k < NS; k++) for (let j = 0; j < 3; j++) { const a = base + k * 3 + j, b = base + k * 3 + (j + 1) % 3; idx.push(a, b, a + 3, b, b + 3, a + 3); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
      }), strandMat, 0, 0, 0));
      if (spT === 'hair' || spT === 'hairb') { // long horsehair: a small leather top and a waterfall of hair almost to the knee, with two tassels
        const white = spT === 'hair', xs = kR(0.84) + 0.034;
        sph('hairtop', 0.055, 0.55, 1, 1.5, tmat(0x141414), xs, 0.835); cantle(kR(0.89) + 0.03, 0.885);
        strands('hair' + spT, { n: 90, y0: 0.87, y1: kLow - 0.06, spread: 0.08, fan: 0.35, gap0: 0.03, gap1: 0.05, th: 0.0048, cA: white ? '#f4f0e4' : '#2a2623', cB: white ? '#d6cfbd' : '#0d0c0b', seed: white ? 1 : 2 });
        tassels(2, kR(0.6) + 0.07, 0.6, 0.12, 0.045, tmat(white ? 0x141414 : 0xf2f0ea), false);
      } else if (spT === 'rabbit') { // a round, fluffy ball of rabbit fur with two bobtails
        const xs = px(0.77, 0.105, 0.05); sph('rabbit', 0.1, 0.5, 1.05, 1, tmat(0xd4cdbf, { roughness: 1 }), xs, 0.77);
        strands('rabbit', { n: 70, y0: 0.86, y1: 0.67, spread: 0.07, fan: 0.1, gap0: 0.045, gap1: 0.085, th: 0.0085, cA: '#ece6d8', cB: '#bdb6a8', bulge: 0.02, seed: 3 });
        cantle(kR(0.9) + 0.035, 0.9); [-1, 1].forEach(s2 => sph('bobtail', 0.024, 1, 1, 1, tmat(0xf4f1ea, { roughness: 1 }), kR(0.62) + 0.045, 0.62, s2 * 0.035));
      } else if (spT === 'seal') { // seal-style: smooth black glossy fur in a silver-rimmed pouch
        const xs = px(0.79, 0.1, 0.042); sph('seal', 0.092, 0.45, 1.1, 0.95, tmat(0x0b0b0d, { roughness: 0.3, metalness: 0.15 }), xs, 0.79);
        const rim = acc(M(geo('m-sealrim', () => new THREE.TorusGeometry(0.075, 0.006, 6, 24)), silver, xs + 0.018, 0.77, 0)); rim.rotation.y = Math.PI / 2; rim.scale.set(0.95, 1.3, 1);
        cantle(xs + 0.016, 0.9); tassels(2, xs + 0.022, 0.71, 0.1, 0.075, tmat(0x0e0e10), true);
      } else if (spT === 'badger') { // badger: banded black, grey and white hair with a dark mask and white stripes
        const xs = px(0.79, 0.094, 0.039); sph('badger', 0.085, 0.45, 1.1, 0.95, tmat(0x2c2a28, { roughness: 1 }), xs, 0.79);
        strands('badger', { n: 64, y0: 0.88, y1: 0.63, spread: 0.075, fan: 0.22, gap0: 0.04, gap1: 0.06, th: 0.0058, cA: '#f1eee8', cM: '#202020', cB: '#f1eee8', seed: 5 });
        sph('bmask', 0.06, 0.5, 1.35, 0.95, tmat(0x151515, { roughness: 1 }), kR(0.78) + 0.058, 0.76); [-1, 1].forEach(s2 => acc(M(geo('m-bstripe', () => new THREE.BoxGeometry(0.01, 0.12, 0.013)), tmat(0xf1eee8), kR(0.78) + 0.083, 0.765, s2 * 0.024)));
        cantle(kR(0.9) + 0.03, 0.905);
      } else if (spT === 'fox') { // red fox: rusty fur with cream tips and a white-tipped tail hanging down the front
        const xs = px(0.79, 0.095, 0.045); sph('fox', 0.09, 0.5, 1.05, 0.95, tmat(0xb4531f, { roughness: 1 }), xs, 0.79);
        strands('fox', { n: 56, y0: 0.88, y1: 0.67, spread: 0.065, fan: 0.12, gap0: 0.042, gap1: 0.07, th: 0.0062, cA: '#c45d26', cB: '#f0d4b0', seed: 7 });
        sph('foxtail', 0.034, 0.9, 3.4, 1.0, tmat(0xb0501d, { roughness: 1 }), kR(0.64) + 0.075, 0.64, 0); sph('foxtip', 0.03, 0.9, 1.7, 1.0, tmat(0xf4efe6, { roughness: 1 }), kR(0.5) + 0.075, 0.5, 0);
        cantle(kR(0.91) + 0.035, 0.91, tmat(0xcfae5a, { metalness: 0.8, roughness: 0.3 }));
      } else if (spT === 'sheep') { // sheepskin: a cream curly fleece pouch on a leather strap, with two leather tassels
        const xs = kR(0.78) + 0.05; sph('sheepb', 0.085, 0.42, 1.05, 0.95, tmat(0xe6dcc6, { roughness: 1 }), xs, 0.77);
        const cm = tmat(0xf1e9d6, { roughness: 1 }); for (let i = 0; i < 30; i++) { const u = (i + 0.5) / 30 * 1.8 - 0.9, rad = Math.sqrt(1 - u * u), ph = i * 2.399; sph('sheepc', 0.03, 1, 1, 1, cm, xs + 0.034 * rad * (0.6 + 0.4 * Math.cos(ph)), 0.77 + 0.105 * u, 0.082 * rad * Math.sin(ph)); }
        acc(M(geo('m-sheepflap', () => new THREE.BoxGeometry(0.036, 0.04, 0.14)), tmat(0x6b4423), xs + 0.012, 0.885, 0)); tassels(2, xs + 0.045, 0.68, 0.09, 0.06, tmat(0x6b4423), false);
      } else if (spT === 'goat') { // goat hair: shaggy, medium length, dark roots to pale tips, under a brass-trimmed leather top
        const xs = kR(0.84) + 0.036; acc(M(geo('m-goattop', () => new THREE.BoxGeometry(0.04, 0.06, 0.13)), tmat(0x4a3220), xs, 0.86, 0)); cantle(xs + 0.02, 0.895, tmat(0xcfae5a, { metalness: 0.8, roughness: 0.3 }));
        strands('goat', { n: 80, y0: 0.85, y1: 0.55, spread: 0.088, fan: 0.55, gap0: 0.036, gap1: 0.062, th: 0.0068, cA: '#3b2e22', cB: '#cdbfa6', seed: 11 });
      } else if (spT === 'leather') { // a brown day sporran: a pouch with a flap and a brass buckle
        const xs = px(0.76, 0.06, 0.022);
        acc(M(geo('m-sporran-l', () => new THREE.BoxGeometry(0.044, 0.12, 0.11)), mat(0x6b4423, { roughness: 0.7 }), xs, 0.76, 0));
        acc(M(geo('m-sporran-lf', () => new THREE.BoxGeometry(0.052, 0.058, 0.118)), mat(0x5a3a1c, { roughness: 0.65 }), xs + 0.004, 0.83, 0));
        acc(M(geo('m-sporran-lb', () => new THREE.BoxGeometry(0.01, 0.022, 0.026)), mat(0xcfae5a, { metalness: 0.8, roughness: 0.3 }), xs + 0.03, 0.8, 0));
      } else if (spT === 'semi') { // semi-dress: a leather pouch with a fur-covered top, a small silver cantle and three tassels
        const xs = px(0.77, 0.095, 0.041); sph('semi', 0.09, 0.45, 1.05, 0.95, tmat(0x3a2615, { roughness: 0.55 }), xs, 0.77);
        strands('semi', { n: 34, y0: 0.885, y1: 0.8, spread: 0.06, fan: 0.05, gap0: 0.036, gap1: 0.06, th: 0.0075, cA: '#8a7a68', cB: '#4a3d30', bulge: 0.012, seed: 9 });
        cantle(xs + 0.012, 0.915); tassels(3, xs + 0.03, 0.69, 0.085, 0.04, tmat(0x1b1410), false);
      } else if (spT === 'fulld') { // full dress: a big ornate silver half-disc cantle over a black pouch, five long white tassels with silver caps
        const xs = px(0.78, 0.11, 0.04); sph('fulld', 0.098, 0.4, 1.12, 1.0, tmat(0x111111, { roughness: 0.45 }), xs, 0.78);
        const cd = acc(M(geo('m-fullcantle', () => new THREE.CylinderGeometry(0.095, 0.095, 0.014, 22, 1, false, 0, Math.PI)), silver, xs + 0.034, 0.805, 0)); cd.rotation.z = Math.PI / 2;
        const bs = acc(M(geo('m-fullboss', () => new THREE.CylinderGeometry(0.026, 0.026, 0.01, 14)), mat(0xe8eaee, { metalness: 0.95, roughness: 0.2 }), xs + 0.043, 0.855, 0)); bs.rotation.z = Math.PI / 2;
        tassels(5, xs + 0.034, 0.665, 0.15, 0.036, tmat(0xf4f1ea, { roughness: 0.9 }), true);
      } else { // dress sporran: black with a silver cantle and white tassels
        const xs = px(0.8, 0.094, 0.036), sp = M(geo('m-sporran', () => new THREE.SphereGeometry(0.085, 16, 12)), mat(0x141414, { roughness: 0.5 }), xs, 0.8, 0); sp.scale.set(0.42, 1.1, 0.95); acc(sp);
        acc(M(geo('m-cantle', () => new THREE.BoxGeometry(0.03, 0.035, 0.15)), silver, xs + 0.008, 0.895, 0));
        if (!lite) [-1, 1].forEach(s2 => acc(M(geo('m-tassel', () => new THREE.CylinderGeometry(0.009, 0.016, 0.1, 6)), mat(0xf2f0ea), xs + 0.022, 0.74, s2 * 0.04)));
      }
    }
    // jacket: Prince Charlie (short with tails, bow tie), Argyll (flared skirt, lapels, tie), Sheriffmuir tweed (pockets, tie) or a waistcoat over shirt sleeves
    const torsoPts = [[0.0, 0.96], [0.18, 0.96], [0.178, 1.04], [0.19, 1.14], [0.215, 1.26], [0.22, 1.33], [0.18, 1.38], [0.1, 1.42], [0, 1.43]];
    topC = jtype === 'waistcoat' ? new THREE.Color(0xf6f3ec) : jc.clone();
    const jtw = JACKETTW[per.jcol || 0] || (jtype === 'tweed' ? 1 : 0); // tweed jacket colours carry their own weave
    const jm = mat(jc, { roughness: jtw ? 0.95 : 0.6, side: THREE.DoubleSide, map: jtw === 2 ? herringTexture() : jtw ? tweedTexture() : null });
    sleeveM = jtype === 'waistcoat' ? white : jm;
    const torso = M(lathe('m-jacket', torsoPts, 28), jtype === 'waistcoat' ? white : jm); torso.scale.x = 0.7; body.add(torso);
    const frontX = y => rAt(torsoPts, y) * 0.7;
    if (jtype === 'pc') {
      body.add(M(geo('m-tails', () => new THREE.BoxGeometry(0.03, 0.2, 0.2)), jm, -0.13, 0.88, 0));
    } else if (jtype === 'argyll' || jtype === 'tweed') {
      // a short flared skirt over the belt, big enough to sit outside the kilt top
      body.add(M(lathe('m-jskirt', [[0.207, 0.87], [0.208, 0.92], [0.2, 0.99], [0.198, 1.03]], 32), jm));
      if (jtype === 'tweed') [-1, 1].forEach(s2 => { const ph = Math.atan2(s2 * 0.1, 0.18); const pk = M(geo('m-pocket', () => new THREE.BoxGeometry(0.012, 0.045, 0.085)), jm, Math.cos(ph) * 0.211, 0.94, Math.sin(ph) * 0.211); pk.rotation.y = -ph; body.add(pk); });
      if (!lite) [0, 1, 2].forEach(i => body.add(M(geo('m-jbutton', () => new THREE.SphereGeometry(0.011, 6, 4)), jtype === 'tweed' ? mat(0x4a2f18) : silver, frontX(1.125 - i * 0.045) + 0.004, 1.125 - i * 0.045, 0.0)));
    } else { // waistcoat over the white shirt: a slightly bigger, sleeveless shell
      const wcPts = [[0.0, 0.96], [0.184, 0.96], [0.182, 1.04], [0.194, 1.14], [0.218, 1.24], [0.222, 1.3], [0.0, 1.31]]; const wc = M(lathe('m-waistcoat', wcPts, 28), jm); wc.scale.set(0.72, 1, 1.03); body.add(wc);
      if (!lite) [0, 1, 2].forEach(i => body.add(M(geo('m-jbutton', () => new THREE.SphereGeometry(0.011, 6, 4)), silver, rAt(wcPts, 1.09 - i * 0.045) * 0.72 + 0.004, 1.09 - i * 0.045, 0)));
    }
    // ---- the chest: a front panel in the shirt's own material and colour, lapels beside it, a standing collar, and the neckwear on top of all that ----
    const wcP = [[0.0, 0.96], [0.184, 0.96], [0.182, 1.04], [0.194, 1.14], [0.218, 1.24], [0.222, 1.3], [0.0, 1.31]];
    const cX = (y, z) => { const wv = jtype === 'waistcoat' && y < 1.305, pts = wv ? wcP : torsoPts, sx = wv ? 0.72 : 0.7, sz = wv ? 1.03 : 1, rr = rAt(pts, clamp(y, 0.97, 1.42)); return sx * Math.sqrt(Math.max(0, rr * rr - (z / sz) * (z / sz))); }; // the front surface at height y and sideways z
    const patch = (key, y0, y1, wf, NZ, off) => geo('m-pt-' + jtype + '-' + key, () => { // a strip that follows the chest from y0 down to y1; wf(t) gives its sideways extent [z0, z1]
      const NY = 16, pos = [], uv = [], idx = [];
      for (let j = 0; j <= NY; j++) { const t = j / NY, y = y0 + (y1 - y0) * t, w = wf(t); for (let i = 0; i <= NZ; i++) { const z = w[0] + (w[1] - w[0]) * i / NZ; pos.push(cX(y, z) + off, y, z); uv.push(z * 3.3, y * 3.3); } }
      for (let j = 0; j < NY; j++) for (let i = 0; i < NZ; i++) { const a = j * (NZ + 1) + i, b = a + NZ + 1; idx.push(a, b, a + 1, a + 1, b, b + 1); }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
    });
    const VV = jtype === 'pc' ? { y0: 1.418, y1: 1.08, hw: t => 0.05 + 0.034 * Math.min(1, t * 2.4), lw: t => 0.034 * (1 - Math.pow(t, 2.2)) + 0.004 }
      : jtype === 'waistcoat' ? { y0: 1.305, y1: 1.12, hw: t => 0.06 * (1 - t) + 0.004, lw: null }
        : { y0: 1.418, y1: 1.16, hw: t => 0.072 * (1 - t) + 0.004, lw: t => 0.03 * (1 - 0.7 * t) };
    body.add(M(patch('plate', VV.y0, VV.y1, t => [-VV.hw(t), VV.hw(t)], 8, 0.004), shirtP));
    if (VV.lw) { const lapM = jtw ? jm : mat(jc.clone().multiplyScalar(1.15), { roughness: 0.28, metalness: 0.05, side: THREE.DoubleSide }); [-1, 1].forEach(s => body.add(M(patch('lap' + s, VV.y0, VV.y1, t => s > 0 ? [VV.hw(t), VV.hw(t) + VV.lw(t)] : [-VV.hw(t) - VV.lw(t), -VV.hw(t)], 3, 0.0075), lapM))); }
    if (!lite && jtype === 'pc') [1.34, 1.28, 1.22].forEach(y => body.add(M(geo('m-stud', () => new THREE.SphereGeometry(0.0055, 6, 4)), silver, cX(y, 0) + 0.008, y, 0)));
    body.add(M(geo('m-collar2', () => new THREE.CylinderGeometry(0.073, 0.069, 0.052, 22, 1, true)), white, 0, 1.452, 0)); // the standing collar, in shirt colour
    [-1, 1].forEach(s => { const fl = M(geo('m-cpoint', () => new THREE.BoxGeometry(0.005, 0.036, 0.046)), white, 0.093, 1.418, s * 0.046); fl.rotation.set(s * 0.25, -s * 0.62, -0.3); body.add(fl); }); // collar points lying on the chest
    const nc = wd.neckc || 'auto', neckT = wd.neck === 'auto' ? (jtype === 'pc' || jtype === 'waistcoat' ? 'bow' : 'tie') : wd.neck;
    const ncMat = (dflt, o) => nc === 'tartan' ? tart : mat(new THREE.Color(nc === 'auto' ? dflt : (NECKCOL[nc] || dflt)).convertSRGBToLinear(), Object.assign({ roughness: 0.4, side: THREE.DoubleSide }, o || {}));
    const nacc = o => { o.userData.acc = 'neck'; body.add(o); return o; };
    const nbar = (p, q, r, m) => { const d = new THREE.Vector3().subVectors(q, p), L = d.length(), o = M(geo('m-cyl1', () => new THREE.CylinderGeometry(1, 1, 1, 6)), m, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2); o.scale.set(r, L, r); o.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize()); return nacc(o); };
    if (neckT === 'bow') { // a butterfly: two wings and a knot, in a colour that stands off the shirt
      const bm = ncMat('#0d0d10', { roughness: 0.3 }), by = 1.436, bx = 0.09;
      [-1, 1].forEach(s => { const w = M(geo('m-bowwing', () => new THREE.CylinderGeometry(0.03, 0.009, 0.056, 4)), bm, bx, by, s * 0.034); w.rotation.x = s * Math.PI / 2; w.scale.set(0.4, 1, 1); nacc(w); });
      nacc(M(geo('m-bowknot2', () => new THREE.SphereGeometry(0.012, 8, 6)), bm, bx + 0.004, by, 0)).scale.set(0.8, 1.15, 1.3);
    } else if (neckT === 'tie') { // a long tie: a knot at the throat and a tapering blade down the chest
      const tm = ncMat(jtype === 'tweed' ? '#1f4a30' : '#8a1c26', { roughness: 0.55 });
      nacc(M(patch('tie', 1.425, 1.13, t => { const w = t < 0.12 ? 0.008 + t * 0.09 : t < 0.45 ? 0.019 + (t - 0.12) * 0.052 : 0.036 * (1 - Math.pow((t - 0.45) / 0.55, 2.5)); return [-w, w]; }, 4, 0.012), tm));
      nacc(M(geo('m-tieknot2', () => new THREE.SphereGeometry(0.017, 8, 6)), tm, 0.088, 1.43, 0)).scale.set(0.9, 1, 1.25);
    } else if (neckT === 'cravat') { // a puffy silk cravat (ascot): a big knot and layered folds tucked into the front
      const cm = ncMat(TARTANS[per.tartan] ? TARTANS[per.tartan].base : '#8a1c26', { roughness: 0.28, metalness: 0.08 });
      [[1.434, 0.028, 0.9, 0.9, 1.5, 0.084, 0], [1.4, 0.04, 0.55, 0.85, 1.7, 0, 0.1], [1.36, 0.044, 0.55, 0.85, 1.75, 0, -0.08], [1.318, 0.042, 0.55, 0.85, 1.6, 0, 0.08], [1.28, 0.034, 0.55, 0.85, 1.25, 0, -0.06]].forEach(([y, r, sx, sy, sz, fx, tilt], i) => { const pf = nacc(M(geo('m-crav', () => new THREE.SphereGeometry(1, 14, 10)), cm, fx || cX(y, 0) + 0.009 + 0.0025 * i, y, 0)); pf.scale.set(r * sx, r * sy, r * sz); pf.rotation.x = tilt; });
      nacc(M(geo('m-cravpin', () => new THREE.SphereGeometry(0.007, 8, 6)), silver, cX(1.392, 0) + 0.03, 1.392, 0));
    } else if (neckT === 'jabot') { // a kilted lace jabot: a cascade of frilled lace down the shirt front
      const lm = mat(nc === 'auto' || nc === 'tartan' ? '#f3e6c9' : NECKCOL[nc], { roughness: 0.9, side: THREE.DoubleSide, map: laceTexture(), alphaTest: 0.4 });
      for (let i = 0; i < 7; i++) { const y = 1.41 - i * 0.037, rT = 0.028 + 0.0065 * i, rB = rT + 0.022, arc = 1.5 + 0.07 * i;
        nacc(M(geo('m-frill' + i, () => new THREE.CylinderGeometry(rT, rB, 0.052, 18, 1, true, Math.PI / 2 - arc / 2, arc)), lm, cX(y, 0) + 0.012 + 0.0035 * i - (rT + rB) / 2, y, 0)); }
    } else if (neckT === 'ghillie' || neckT === 'none') { // an open neck: a V of skin in the shirt; the ghillie shirt adds the cross-lacing and loose ends
      body.add(M(patch('vskin', 1.42, 1.2, t => { const w = 0.045 * (1 - t) + 0.002; return [-w, w]; }, 4, 0.0072), mat(skinC, { roughness: 0.6, side: THREE.DoubleSide })));
      if (neckT === 'ghillie') {
        const lm = ncMat('#2a2a2a', { roughness: 0.8 });
        [1.395, 1.355, 1.315, 1.275].forEach(y => { const t = (1.42 - y) / 0.22, hw = 0.045 * (1 - t) + 0.002;
          [-1, 1].forEach(s => { const lc = M(geo('m-glace2', () => new THREE.BoxGeometry(0.0035, 0.0035, 1)), lm, cX(y, 0) + 0.0105, y - 0.01, 0); lc.scale.z = hw * 2.1; lc.rotation.x = s * 0.5; nacc(lc); nacc(M(geo('m-geye', () => new THREE.SphereGeometry(0.0045, 6, 4)), silver, cX(y, s * hw) + 0.0095, y, s * hw)); }); });
        [-1, 1].forEach(s => { const tl = M(geo('m-gtail', () => new THREE.CylinderGeometry(0.0022, 0.0022, 0.1, 5)), lm, cX(1.25, 0) + 0.012, 1.23, s * 0.014); tl.rotation.x = s * 0.2; nacc(tl); });
      }
    } else if (neckT === 'bolo') { // a bolo tie: a braided cord, a silver slide with a stone and two metal-tipped ends
      const cm = ncMat('#17120e', { roughness: 0.7 }), xs = cX(1.385, 0) + 0.011, tq = mat(0x2aa6a0, { roughness: 0.25 });
      [-1, 1].forEach(s => { nbar(new THREE.Vector3(0.071, 1.44, s * 0.03), new THREE.Vector3(0.094, 1.416, s * 0.034), 0.0032, cm); nbar(new THREE.Vector3(0.094, 1.416, s * 0.034), new THREE.Vector3(xs, 1.388, s * 0.011), 0.0032, cm); nbar(new THREE.Vector3(xs, 1.376, s * 0.011), new THREE.Vector3(cX(1.23, 0) + 0.012, 1.23, s * 0.02), 0.0032, cm); nbar(new THREE.Vector3(cX(1.23, 0) + 0.012, 1.236, s * 0.02), new THREE.Vector3(cX(1.2, 0) + 0.012, 1.2, s * 0.02), 0.0052, silver); });
      const sl = M(geo('m-bolodisc', () => new THREE.CylinderGeometry(0.021, 0.021, 0.008, 16)), silver, xs + 0.006, 1.385, 0); sl.rotation.z = Math.PI / 2; nacc(sl);
      nacc(M(geo('m-bolostone', () => new THREE.SphereGeometry(0.012, 10, 8)), tq, xs + 0.012, 1.385, 0)).scale.set(0.55, 1, 1);
    }
    if (wd.plaid === 'fly') { // a fly plaid: a shoulder wrap over the left shoulder (cut from the torso's own outline, pushed out clear of it and of the arm), a drape down the back, and a brooch
      const capeP = [[0.285, 1.2], [0.29, 1.29], [0.265, 1.36], [0.2, 1.405], [0.14, 1.43]], backP = [[0.19, 1.05], [0.203, 1.14], [0.228, 1.24], [0.236, 1.3]];
      const cape = M(geo('m-plaid-a', () => new THREE.LatheGeometry(capeP.map(q => new THREE.Vector2(q[0], q[1])), 24, Math.PI - 0.8, 1.6)), tart); cape.scale.x = 0.7; cape.userData.acc = 'plaid'; body.add(cape);
      const drape = M(geo('m-plaid-b', () => new THREE.LatheGeometry(backP.map(q => new THREE.Vector2(q[0], q[1])), 20, Math.PI + 0.45, 1.5)), tart); drape.scale.x = 0.7; drape.userData.acc = 'plaid'; body.add(drape);
      if (!lite) { const br = M(geo('m-plaidbrooch', () => new THREE.SphereGeometry(0.016, 10, 8)), silver, 0.7 * 0.289 * Math.sin(Math.PI - 0.8) + 0.014, 1.25, 0.289 * Math.cos(Math.PI - 0.8)); br.userData.acc = 'plaid'; body.add(br); }
    }
    if (!lite && jtype === 'pc') [-1, 1].forEach(s2 => body.add(M(geo('m-button', () => new THREE.SphereGeometry(0.011, 6, 4)), silver, cX(1.045, s2 * 0.05) + 0.004, 1.045, s2 * 0.05))); // two buttons on the jacket below the shirt front
  } else {
    // ball gown: fitted satin bodice, full skirt with soft folds to the floor, a tartan sash pinned at the shoulder
    const dc = new THREE.Color(DRESS[per.dress || 0]); topC = dc;
    const satin = mat(dc, { roughness: 0.32, metalness: 0.06, side: THREE.DoubleSide });
    skirtGrp = new THREE.Group(); skirtGrp.position.y = -lift; skirtGrp.scale.y = 1 + lift; body.add(skirtGrp);
    const CUTS = { ball: [[0.16, 1.0], [0.2, 0.92], [0.29, 0.72], [0.38, 0.46], [0.46, 0.16], [0.5, 0.03], [0.49, 0.015]], aline: [[0.16, 1.0], [0.19, 0.92], [0.24, 0.72], [0.3, 0.46], [0.36, 0.16], [0.39, 0.03], [0.385, 0.015]],
      mermaid: [[0.16, 1.0], [0.185, 0.9], [0.205, 0.72], [0.22, 0.5], [0.27, 0.32], [0.37, 0.14], [0.45, 0.03], [0.44, 0.015]], tea: [[0.16, 1.0], [0.19, 0.92], [0.255, 0.74], [0.31, 0.58], [0.345, 0.47], [0.34, 0.455]] };
    const cutK = CUTS[wd.cut] ? wd.cut : 'ball', cutP = CUTS[cutK], hemP = cutP[cutP.length - 1];
    skirtGrp.add(M(lathe('m-skirt' + (cutK === 'ball' ? '' : '-' + cutK), cutP, 56, 0.05, 11, 1.0, hemP[1] + 0.005), satin));
    const bod = M(lathe('m-bodice', [[0.0, 0.98], [0.16, 0.98], [0.148, 1.06], [0.16, 1.18], [0.18, 1.28], [0.172, 1.33], [0.0, 1.34]], 28), satin); bod.scale.x = 0.72; body.add(bod);
    const chest = M(lathe('m-decollete', [[0.0, 1.32], [0.172, 1.32], [0.17, 1.36], [0.12, 1.41], [0.06, 1.44], [0, 1.45]], 22), skinM); chest.scale.x = 0.68; body.add(chest);
    body.add(M(geo('m-waist', () => new THREE.CylinderGeometry(0.165, 0.165, 0.04, 24)), mat(dc.clone().multiplyScalar(0.8), { roughness: 0.3 }), 0, 1.0));
    const ss = wd.sash === 'left' ? -1 : 1; // which shoulder the tartan sash crosses from
    if (wd.sash !== 'none') {
      // a flat tartan ribbon that follows the bodice and chest from the shoulder (over the dome, between neck and arm) diagonally down to the opposite hip and round the back
      const bodA = [[1.0, 0.16], [1.06, 0.148], [1.18, 0.16], [1.28, 0.18], [1.33, 0.172], [1.36, 0.17], [1.41, 0.12], [1.44, 0.06]], lerpR = (pts, y) => { y = clamp(y, pts[0][0], pts[pts.length - 1][0]); for (let i = 1; i < pts.length; i++) if (y <= pts[i][0]) { const a = pts[i - 1], b = pts[i]; return a[1] + (b[1] - a[1]) * (y - a[0]) / (b[0] - a[0] || 1); } return pts[pts.length - 1][1]; };
      const sashAt = (ph) => { const yv = 1.215 + 0.18 * ss * Math.sin(ph), rz = lerpR(bodA, yv) + 0.016, k = 0.72 - 0.04 * smooth(clamp((yv - 1.33) / 0.04, 0, 1)); return new THREE.Vector3(rz * k * Math.cos(ph), yv, rz * Math.sin(ph)); };
      const sashG = geo('m-sashribbon' + ss, () => {
        const N = 96, pos = [], uv = [], idx = [], w = 0.027; let len = 0, prev = null;
        for (let i = 0; i <= N; i++) {
          const ph = i / N * TAU, P = sashAt(ph), T = sashAt(ph + 0.02).sub(sashAt(ph - 0.02)).normalize(), n = new THREE.Vector3(Math.cos(ph) / 0.7, 0, Math.sin(ph)).normalize(), b = new THREE.Vector3().crossVectors(T, n).normalize();
          if (prev) len += P.distanceTo(prev); prev = P.clone();
          pos.push(P.x + n.x * 0.003 + b.x * w, P.y + b.y * w, P.z + n.z * 0.003 + b.z * w, P.x + n.x * 0.003 - b.x * w, P.y - b.y * w, P.z + n.z * 0.003 - b.z * w);
          uv.push(len / 0.84, 0, len / 0.84, 2 * w / 0.336);
          if (i < N) { const a = i * 2; idx.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
        }
        const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); g.setIndex(idx); g.computeVertexNormals(); return g;
      });
      const sash = M(sashG, tart); sash.userData.acc = 'sash'; body.add(sash);
      if (!lite) { const bp = sashAt(1.0), brooch = M(geo('m-brooch', () => new THREE.SphereGeometry(0.022, 10, 8)), silver, bp.x + 0.012, bp.y, bp.z); brooch.scale.set(0.5, 1, 1); brooch.userData.acc = 'sash'; body.add(brooch); }
      if (!lite) { // the tail hangs on the skirt from the low hip
        const skAsc = cutP.map(q => [q[1], q[0]]).reverse(), tz = lerpR(skAsc, 0.83) + 0.017, tailS = M(geo('m-sashtail2', () => new THREE.BoxGeometry(0.075, 0.34, 0.012)), tart, 0.0, 0.83, -ss * tz); tailS.rotation.x = 0.42 * ss; tailS.userData.acc = 'sash'; body.add(tailS);
      }
    }
    // necklaces hug the neckline (the dome of the chest is about 0.13 wide at y 1.40 and 0.68 as deep)
    if (!lite && wd.neckl !== 'none') {
      const nacc = o => { o.userData.acc = 'necklace'; body.add(o); return o; };
      if (wd.neckl === 'choker') { const ch = M(geo('m-choker', () => new THREE.TorusGeometry(0.066, 0.007, 6, 24)), mat(0x16131a, { roughness: 0.9 }), 0, 1.445, 0); ch.rotation.x = Math.PI / 2; nacc(ch); nacc(M(geo('m-chokergem', () => new THREE.SphereGeometry(0.009, 8, 6)), silver, 0.067, 1.445, 0)); }
      else if (wd.neckl === 'pearls') { const pm = mat(0xf6f1e8, { roughness: 0.25, metalness: 0.25 }); for (let i = 0; i < 26; i++) { const a = i / 26 * TAU; nacc(M(geo('m-pearl', () => new THREE.SphereGeometry(0.009, 8, 6)), pm, 0.68 * 0.147 * Math.cos(a), 1.4, 0.147 * Math.sin(a))); } }
      else { const ch = M(geo('m-necklace2', () => new THREE.TorusGeometry(0.147, 0.0042, 6, 28)), silver, 0, 1.4, 0); ch.rotation.x = Math.PI / 2; ch.scale.set(0.68, 1, 1); nacc(ch);
        if (wd.neckl === 'pendant') { nacc(M(geo('m-pendant', () => new THREE.SphereGeometry(0.016, 10, 8)), mat(0x3f6fc4, { roughness: 0.15, metalness: 0.3 }), 0.124, 1.366, 0)); nacc(M(geo('m-pendcap', () => new THREE.SphereGeometry(0.008, 8, 6)), silver, 0.108, 1.392, 0)); } }
    }
    skirtGrp.add(M(geo('m-hem' + cutK, () => new THREE.TorusGeometry(hemP[0] + 0.005, 0.012, 6, 56)), mat(0xfbf8f2, { roughness: 0.9 }), 0, hemP[1] + 0.01, 0)).rotation && (skirtGrp.children[skirtGrp.children.length - 1].rotation.x = Math.PI / 2);
    if (wd.shawl !== 'none') { // a wrap draped over both shoulders, clear of the neck, the shoulders and the upper arms
      const shM = wd.shawl === 'tartan' ? tart : mat({ ivory: 0xf0e8d6, black: 0x1a171c, rose: 0xd88a9a }[wd.shawl] || 0xf0e8d6, { roughness: 0.9, side: THREE.DoubleSide });
      const shw = M(lathe('m-shawl2', [[0.25, 1.17], [0.272, 1.24], [0.25, 1.32], [0.2, 1.385], [0.115, 1.42]], 40), shM); shw.scale.x = 0.7; shw.userData.acc = 'shawl'; body.add(shw);
    }
  }
  // arms: shoulder > elbow > round Mii hand. A lady's gloves are drawn properly: opera length over the elbow or short, a ruched cuff in a contrasting trim, lace or tartan, a bigger hand with fingers.
  const arms = [], elbows = [];
  const GL = !gent ? GLV[glv] : null, SHc = SHIRTC[wd.shirt] || SHIRTC[0];
  const shirtCuffM = gent ? mat(SHc[0], { roughness: 0.72, side: THREE.DoubleSide, map: SHc[2] ? shirtTexture(SHc[2], SHc[0], SHc[3]) : null }) : null;
  const glM = GL ? (GL.lace ? mat(GL.c, { roughness: 0.9, side: THREE.DoubleSide, map: laceTexture(), alphaTest: 0.4 }) : mat(GL.c, { roughness: 0.5, metalness: 0.02, side: THREE.DoubleSide })) : null;
  const glCuffM = GL ? (GL.tart ? tart : mat(GL.cuff, { roughness: 0.35, metalness: 0.15, side: THREE.DoubleSide })) : null;
  const glTrim = GL && !GL.tart ? mat(GL.cuff, { roughness: 0.35, metalness: 0.15 }) : silver;
  [-1, 1].forEach(side => {
    const sh = new THREE.Group(); sh.position.set(0, 1.31, side * (gent ? 0.215 : 0.19));
    const sleeve = gent ? sleeveM : skinM;
    sh.add(M(geo('m-shoulder', () => new THREE.SphereGeometry(0.062, 12, 10)), sleeve));
    sh.add(M(geo('m-upper', () => new THREE.CylinderGeometry(0.055, 0.047, 0.26, 12)), sleeve, 0, -0.13));
    const el = new THREE.Group(); el.position.y = -0.26; sh.add(el);
    el.add(M(geo('m-elbow', () => new THREE.SphereGeometry(0.047, 10, 8)), sleeve));
    el.add(M(geo('m-fore', () => new THREE.CylinderGeometry(0.046, 0.038, 0.22, 12)), sleeve, 0, -0.11));
    if (gent) { el.add(M(geo('m-cuff2', () => new THREE.CylinderGeometry(0.0445, 0.0445, 0.046, 14, 1, true)), shirtCuffM, 0, -0.203)); const cl = M(geo('m-cufflink', () => new THREE.SphereGeometry(0.0072, 6, 4)), silver, 0.0445, -0.203, 0); el.add(cl); } // the shirt cuff shows below the jacket sleeve
    else if (GL) {
      if (GL.L) { // opera length: up over the elbow and onto the upper arm
        sh.add(M(geo('m-gup', () => new THREE.CylinderGeometry(0.0555, 0.0515, 0.13, 16, 1, true)), glM, 0, -0.195));
        el.add(M(geo('m-gelb', () => new THREE.SphereGeometry(0.0505, 10, 8)), glM));
        el.add(M(geo('m-gfore', () => new THREE.CylinderGeometry(0.0505, 0.0425, 0.22, 16, 1, true)), glM, 0, -0.11));
        if (GL.tart) { sh.add(M(geo('m-gband', () => new THREE.CylinderGeometry(0.0575, 0.0575, 0.034, 18, 1, true)), tart, 0, -0.147)); }
        else { const c0 = M(geo('m-gcuff1', () => new THREE.TorusGeometry(0.0548, 0.0085, 8, 20)), glCuffM, 0, -0.134); c0.rotation.x = Math.PI / 2; sh.add(c0); }
        [-0.158, -0.176].forEach((yy, i) => { const rr = M(geo('m-gruche' + i, () => new THREE.TorusGeometry(0.0545 - i * 0.0007, 0.0052, 6, 20)), GL.lace ? glTrim : glM, 0, yy); rr.rotation.x = Math.PI / 2; sh.add(rr); });
        const wr = M(geo('m-gwrist', () => new THREE.TorusGeometry(0.0435, 0.0042, 6, 18)), glTrim, 0, -0.2); wr.rotation.x = Math.PI / 2; el.add(wr);
      } else { // short: a wrist cuff
        el.add(M(geo('m-gshort', () => new THREE.CylinderGeometry(0.0435, 0.0405, 0.075, 16, 1, true)), glM, 0, -0.175));
        const c1 = M(geo('m-gcuff2', () => new THREE.TorusGeometry(0.0432, 0.0075, 8, 18)), glCuffM, 0, -0.14); c1.rotation.x = Math.PI / 2; el.add(c1);
        const c2 = M(geo('m-gcuff3', () => new THREE.TorusGeometry(0.043, 0.0048, 6, 18)), glM, 0, -0.158); c2.rotation.x = Math.PI / 2; el.add(c2);
      }
    }
    const handM = GL ? glM : skinM, fingM = GL && !GL.lace ? glM : skinM, big = GL ? 1.12 : 1;
    if (GL && GL.lace) { const sp = M(geo('m-palmsk', () => new THREE.SphereGeometry(0.05, 14, 10)), skinM, 0, -0.275, 0); sp.scale.set(0.7, 1.15, 1); el.add(sp); }
    const palm = M(geo(GL ? 'm-palmg' : 'm-palm', () => new THREE.SphereGeometry(GL ? 0.056 : 0.05, 14, 10)), handM, 0, -0.275, 0); palm.scale.set(0.7 * (big > 1 ? 1.03 : 1), 1.15, 1); el.add(palm);
    const thumb = M(geo(GL ? 'm-thumbg' : 'm-thumb', () => new THREE.SphereGeometry(GL ? 0.026 : 0.022, 8, 6)), fingM === skinM && GL ? skinM : handM, 0.03, -0.25, -side * 0.027); thumb.scale.set(1, 1.5, 1); el.add(thumb);
    if (GL) [0, 1, 2, 3].forEach(k => { const f = M(geo('m-finger', () => new THREE.SphereGeometry(0.0125, 8, 6)), fingM, 0.004, -0.327 - (k === 1 || k === 2 ? 0.008 : 0), (k - 1.5) * 0.02); f.scale.set(0.9, 2.7, 0.9); el.add(f); });
    body.add(sh); arms.push(sh); elbows.push(el);
  });
  // neck and the big friendly head
  body.add(M(geo('m-neck', () => new THREE.CylinderGeometry(0.055, 0.062, 0.1, 12)), skinM, 0, 1.43));
  const head = new THREE.Group(); head.position.y = 1.6; head.scale.set(fp.hs, fp.hs, fp.hs * fp.fw); body.add(head); // head size and face width scale everything on the head together
  const faceM = mat(0xffffff, { map: faceTexture(per, kind), roughness: 0.6 });
  const skullG = geo('m-skull-j' + Math.round(fp.jw * 10), () => { // jaw: -1 pointed chin ... +1 square jaw, by reshaping the lower half of the sphere
    const g = new THREE.SphereGeometry(0.165, 32, 24), pa = g.attributes.position, jw = Math.round(fp.jw * 10) / 10;
    if (jw) for (let i = 0; i < pa.count; i++) {
      const y = pa.getY(i), t = clamp(-y / 0.165, 0, 1); if (t <= 0) continue;
      if (jw > 0) { const s = 1 + 0.17 * jw * Math.sin(Math.min(1, t * 1.25) * Math.PI * 0.8); pa.setX(i, pa.getX(i) * s); pa.setZ(i, pa.getZ(i) * s); pa.setY(i, y * (1 - 0.1 * jw * t * t)); }
      else { const s = 1 + 0.32 * jw * Math.pow(t, 1.3); pa.setX(i, pa.getX(i) * s); pa.setZ(i, pa.getZ(i) * s); pa.setY(i, y * (1 - 0.16 * jw * t)); }
    }
    g.computeVertexNormals(); return g;
  });
  const skull = M(skullG, faceM); skull.scale.set(0.96, 1.06, 0.98); head.add(skull);
  if (fp.bd >= 3) { // beard wrapped onto the jaw as a thin shell cut from the skull, so it reads from the side (the front stays painted)
    const bk = fp.bd, bg = geo('m-beard' + bk + 'j' + Math.round(fp.jw * 10), () => {
      const pa = skullG.attributes.position, na = skullG.attributes.normal, ix = skullG.index.array, ps = [], id = [], map = new Map();
      const keep = (x, y, z) => bk === 4 ? (y < -0.035 && (Math.abs(z) > 0.075 || y < -0.1)) : bk === 5 ? (y < -0.03 && y > -0.12 && Math.abs(z) > 0.1 && x < 0.1) : (y < -0.1 && Math.abs(z) < 0.07 && x > 0.02);
      for (let t = 0; t < ix.length; t += 3) {
        let ok = true, cx2 = 0, cy2 = 0, cz2 = 0;
        for (let k = 0; k < 3; k++) { cx2 += pa.getX(ix[t + k]); cy2 += pa.getY(ix[t + k]); cz2 += pa.getZ(ix[t + k]); }
        if (!keep(cx2 / 3, cy2 / 3, cz2 / 3)) continue;
        for (let k = 0; k < 3; k++) { const i = ix[t + k]; if (!map.has(i)) { map.set(i, ps.length / 3); const th = 0.011 + 0.004 * Math.sin(i * 12.9); ps.push(pa.getX(i) + na.getX(i) * th, pa.getY(i) + na.getY(i) * th, pa.getZ(i) + na.getZ(i) * th); } id.push(map.get(i)); }
      }
      const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(ps, 3)); g.setIndex(id); g.computeVertexNormals(); return g;
    });
    const bm = M(bg, mat(new THREE.Color(fp.bdc || hairHex(per)).convertSRGBToLinear(), { roughness: 0.75 })); bm.scale.set(0.96, 1.06, 0.98); head.add(bm);
  }
  const er = fp.er;
  [-1, 1].forEach(s2 => { const ear = M(geo('m-ear', () => new THREE.SphereGeometry(0.036, 10, 8)), skinM, -0.01, -0.01, s2 * 0.158); ear.scale.set(0.6 * er, er, 0.5 * er); head.add(ear);
    const ly = -0.01 - 0.036 * er, lz = 0.158 + 0.006; // the lobe, where earrings hang
    if (!gent && !lite && wd.ear === 'stud') { const e = M(geo('m-earring', () => new THREE.SphereGeometry(0.011, 8, 6)), silver, -0.01, ly - 0.002, s2 * (lz + 0.002)); e.userData.acc = 'ear'; head.add(e); }
    else if (!gent && !lite && wd.ear === 'pearl') { const e = M(geo('m-earring', () => new THREE.SphereGeometry(0.011, 8, 6)), silver, -0.01, ly - 0.002, s2 * (lz + 0.002)); e.userData.acc = 'ear'; head.add(e); const wr = M(geo('m-earwire', () => new THREE.CylinderGeometry(0.0013, 0.0013, 0.022, 4)), silver, -0.01, ly - 0.018, s2 * (lz + 0.002)); wr.userData.acc = 'ear'; head.add(wr); const pe = M(geo('m-earpearl', () => new THREE.SphereGeometry(0.014, 10, 8)), mat(0xf6f1e8, { roughness: 0.25, metalness: 0.25 }), -0.01, ly - 0.04, s2 * (lz + 0.002)); pe.userData.acc = 'ear'; head.add(pe); }
    else if (!gent && !lite && wd.ear === 'hoop') { const h = M(geo('m-earhoop', () => new THREE.TorusGeometry(0.022, 0.0026, 6, 20)), mat(0xcfae5a, { metalness: 0.8, roughness: 0.3 }), -0.01, ly - 0.02, s2 * (lz + 0.003)); h.rotation.y = Math.PI / 2 + 0.0; h.userData.acc = 'ear'; head.add(h); } });
  const nz = fp.ns, nShape = [[0.9, 0.9, 1], [1.0, 1.25, 0.8], [1.5, 1.5, 0.75], [0.9, 0.8, 1.55]][fp.nh] || [0.9, 0.9, 1];
  const nose = M(geo('m-nose', () => new THREE.SphereGeometry(0.026, 10, 8)), skinM, 0.158 + 0.012 * (nShape[0] - 0.9) + 0.008 * (nz - 1), -0.02 + (nShape[1] - 0.9) * 0.005, 0); nose.scale.set(nShape[0] * nz, nShape[1] * nz, nShape[2] * nz); head.add(nose);
  if (fp.gl) { // glasses: frames sit just in front of the eyes, with temples that follow the head round to the ears
    const fm = mat(fp.gl === 4 ? 0x0c0c0c : 0x2a2018, { roughness: 0.35, metalness: 0.2 }), lensM = new THREE.MeshStandardMaterial({ color: fp.gl === 4 ? 0x0a0a0c : 0xcfe6f2, roughness: 0.1, transparent: true, opacity: fp.gl === 4 ? 0.88 : 0.16, side: THREE.DoubleSide, depthWrite: false });
    const phi = (30 + fp.ed * 7) / 512 * TAU, A = 0.158, B = 0.175, C = 0.162, ey = 0.0086, w = 0.031 + 0.012 * (fp.es - 1);
    const surf = (ph, off, yy) => new THREE.Vector3((A + off) * Math.cos(ph), yy, (C + off) * Math.sin(ph));
    const bar = (p, q, t) => { const d = new THREE.Vector3().subVectors(q, p), L = d.length(), o = M(geo('m-barunit', () => new THREE.BoxGeometry(1, 1, 1)), fm, (p.x + q.x) / 2, (p.y + q.y) / 2, (p.z + q.z) / 2); o.scale.set(L, t, t); o.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), d.normalize()); o.userData.acc = 'glasses'; head.add(o); return o; };
    [-1, 1].forEach(s2 => {
      const c0 = surf(phi, 0.011, ey), g = new THREE.Group(); g.position.set(c0.x, c0.y, s2 * c0.z); g.rotation.y = Math.PI / 2 - s2 * phi * (A / C); g.userData.acc = 'glasses'; head.add(g);
      const ring = (r, tube) => { const o = M(geo('m-gring' + r.toFixed(3), () => new THREE.TorusGeometry(r, tube, 6, 28)), fm); g.add(o); return o; };
      if (fp.gl === 1) { ring(w, 0.0028); g.add(M(geo('m-glens' + w.toFixed(3), () => new THREE.CircleGeometry(w, 24)), lensM)); }
      else if (fp.gl === 3) { const o = M(geo('m-ghalf' + w.toFixed(3), () => new THREE.TorusGeometry(w, 0.0028, 6, 20, Math.PI)), fm); g.add(o); g.add(M(geo('m-glens' + w.toFixed(3), () => new THREE.CircleGeometry(w, 24)), lensM)); }
      else { // square, shades and cat-eye: a rectangular frame
        const hw = w * (fp.gl === 4 ? 1.08 : 1.0), hh = w * (fp.gl === 4 ? 0.82 : 0.78), t = 0.0045, k = fp.gl === 5 ? 1 : 0;
        [[0, hh, hw * 2 + t, t], [0, -hh, hw * 2 + t, t], [-hw, 0, t, hh * 2], [hw, 0, t, hh * 2]].forEach(([bx, by, bw, bh]) => g.add(M(geo('m-gbox' + bw.toFixed(3) + bh.toFixed(3), () => new THREE.BoxGeometry(bw, bh, 0.004)), fm, bx, by, 0)));
        g.add(M(geo('m-glensb' + hw.toFixed(3) + hh.toFixed(3), () => new THREE.PlaneGeometry(hw * 2, hh * 2)), lensM));
        if (k) { g.rotateZ(-s2 * 0.2); g.scale.set(1.08, 1, 1); } // cat-eye: the outer corners swing up
      }
      const po = surf(phi + (w * 1.05) / C, 0.008, ey + 0.002); po.z *= s2;
      let prev = po.clone();
      [0.35, 0.8, 1.2, 1.5].forEach(a => { const ph = phi + (w * 1.05) / C + a * (Math.PI / 2 + 0.05 - phi - (w * 1.05) / C) / 1.5; const p2 = surf(ph, 0.008 + 0.003, ey + 0.006); p2.z *= s2; bar(prev, p2, 0.0035); prev = p2; });
    });
    const inner = surf(phi - w / C * 0.9, 0.012, ey + 0.012); bar(new THREE.Vector3(inner.x, inner.y, -inner.z), new THREE.Vector3(inner.x, inner.y, inner.z), 0.0035);
  }
  // hair: a glossy cap tilted back plus a fringe, and then whatever the style adds (see HSTYLES)
  let style = per.style || (gent ? 'short' : 'long');
  const hl = fp.hl; // hair length slider: buzzcut below 0.08, the style's own length up to 0.3, then longer and longer to the waist
  if (hl != null && style !== 'bald' && style !== 'afro') {
    if (hl < 0.08) style = 'buzz';
    else if (hl < 0.3 && ['long', 'wavy', 'bob', 'ponytail', 'plaits', 'bun', 'updo'].includes(style)) style = 'short';
    else if (hl >= 0.3 && ['short', 'crop', 'quiff', 'slick', 'curly', 'pixie', 'bob', 'long', 'wavy', 'buzz'].includes(style)) style = 'hlong';
  }
  const hairD = mat(hairHex(per), { roughness: 0.55, side: THREE.DoubleSide });
  const cap = (key, len, rz, sc, rad) => { const c = M(geo(key, () => new THREE.SphereGeometry(rad || 0.176, 30, 18, 0, TAU, 0, len)), hairM, -0.012, 0.012, 0); c.scale.set(sc ? sc[0] : 1.0, sc ? sc[1] : 1.06, sc ? sc[2] : 1.04); c.rotation.z = rz; head.add(c); return c; };
  const hrand = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const partedFringe = () => M(geo('m-fringe-part', () => { // two swept halves with a centre parting, sitting just proud of the cap
    const NU = 28, NV = 8, pos = [], idx = [], R = 0.189;
    [-1, 1].forEach((sd, hi) => {
      const base = pos.length / 3;
      for (let j = 0; j <= NV; j++) for (let i = 0; i <= NU; i++) {
        const u = i / NU, v = j / NV, ph = sd * (0.045 + u * 1.0), hem = 1.07 + 0.34 * Math.pow(u, 1.5) + 0.04 * Math.sin(u * 19 + hi * 2), th = 0.12 + (hem - 0.12) * v, sw = u * 0.0 + (1 - v) * sd * 0.12 * 0, rr = R * (1 + 0.012 * Math.sin(u * 60) * v);
        pos.push(rr * Math.sin(th) * Math.cos(ph) * 0.99, rr * Math.cos(th) * 1.02, rr * Math.sin(th) * Math.sin(ph));
      }
      for (let j = 0; j < NV; j++) for (let i = 0; i < NU; i++) { const a = base + j * (NU + 1) + i, b = a + 1, c = a + NU + 1, d = c + 1; if (sd > 0) idx.push(a, b, c, b, d, c); else idx.push(a, c, b, b, c, d); }
    });
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }), hairD, 0, 0, 0);
  // a hanging curtain of hair: strands of uneven length, thickening a little then tapering to the tips, with front locks over the shoulders
  const curtain = (key, o) => M(geo(key, () => {
    const NC = 80, NR = 9, pos = [], idx = [], p0 = o.p0 || 1.3, len = o.len || 0.34, y0 = o.y0 == null ? 0.03 : o.y0;
    for (let i = 0; i <= NC; i++) {
      const u = i / NC, ph = p0 + u * (TAU - 2 * p0), side = Math.abs(Math.cos(u * Math.PI)), front = Math.pow(side, 5), blk = Math.floor(i / 2), L = len * (0.86 + 0.14 * hrand(blk + (o.seed || 0))) + (o.lock || 0) * front;
      for (let j = 0; j <= NR; j++) {
        const v = j / NR, y = y0 - (y0 + L) * v, tuck = o.tuck ? 1 - o.tuck * smooth(clamp((v - 0.55) / 0.45, 0, 1)) : 1 - 0.18 * smooth(clamp((v - 0.6) / 0.4, 0, 1)),
          rr = (0.192 + (o.flare == null ? 0.045 : o.flare) * smooth(clamp(v * 1.6, 0, 1))) * tuck * (1 + 0.012 * Math.sin(ph * 46)) + (o.wave ? o.wave * Math.sin(ph * 5 + v * 7) * v : 0);
        pos.push(rr * Math.cos(ph) * 0.97, y, rr * Math.sin(ph) * (1 + 0.06 * front * v));
      }
    }
    for (let i = 0; i < NC; i++) for (let j = 0; j < NR; j++) { const a = i * (NR + 1) + j, b = a + NR + 1; idx.push(a, a + 1, b, a + 1, b + 1, b); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); g.setIndex(idx); g.computeVertexNormals(); return g;
  }), hairD, 0, 0, 0);
  const fringe = (rz) => { if (!gent && rz == null) { const f = partedFringe(); head.add(f); return f; } const f = M(geo(gent ? 'm-fringe-g' : 'm-fringe-l', () => new THREE.SphereGeometry(0.172, 20, 10, -0.95, 1.9, 0.18, gent ? 0.42 : 0.5)), hairM, 0.004, 0.02, 0); f.rotation.z = rz == null ? (gent ? -0.05 : -0.12) : rz; head.add(f); return f; };
  const blob = (r, x, y, z, sx, sy, sz, mm) => { const o = M(geo('m-hb' + r, () => new THREE.SphereGeometry(r, 12, 9)), mm || hairM, x, y, z); o.scale.set(sx || 1, sy || 1, sz || 1); head.add(o); return o; };
  const defaultCap = () => cap('m-cap', Math.PI * 0.55, gent ? 0.42 : 0.3);
  const sideburns = () => { if (gent) [-1, 1].forEach(s2 => { const sb = M(geo('m-sideburn2', () => new THREE.SphereGeometry(0.02, 10, 8)), hairM, 0.035, -0.035, s2 * 0.152); sb.scale.set(0.8, 2.0, 0.55); sb.rotation.x = -s2 * 0.12; head.add(sb); }); };
  if (style === 'buzz') { cap('m-cap-buzz', Math.PI * 0.5, 0.45, [1, 1.0, 1.0], 0.1685); sideburns(); }
  else if (style === 'hlong') { // a chosen length: a cap and fringe, a short curtain, and from shoulder length down a narrower back curtain to as far as the waist
    const L = 0.1 + (hl - 0.3) / 0.7 * 0.56, wavy = per.style === 'wavy';
    defaultCap(); fringe();
    head.add(curtain('m-curt-h' + Math.round(Math.min(L, 0.3) * 100) + (L > 0.2 ? 'l' : '') + (wavy ? 'w' : ''), { p0: 1.3, len: Math.min(L, 0.3), lock: L > 0.2 ? 0.05 : 0, seed: 4, wave: wavy ? 0.012 : 0 }));
    if (L > 0.3) head.add(curtain('m-curt-hb' + Math.round(L * 100) + (wavy ? 'w' : ''), { p0: 2.25, y0: -0.2, len: L, tuck: 0.12, flare: 0.075, seed: 6, wave: wavy ? 0.012 : 0 }));
  }
  else if (style === 'bald') { /* nothing but the face */ }
  else if (style === 'crop') { cap('m-cap-crop', Math.PI * 0.47, 0.5, [1, 1.03, 1.02], 0.171); sideburns(); }
  else if (style === 'quiff') { defaultCap(); blob(0.07, 0.085, 0.17, 0, 1.7, 0.8, 1.25).rotation.z = 0.35; fringe(0.1); sideburns(); }
  else if (style === 'slick') { cap('m-cap-slick', Math.PI * 0.58, 0.66, [1.03, 1.06, 1.05]); blob(0.1, -0.1, 0.0, 0, 1.15, 1.25, 1.45); sideburns(); }
  else if (style === 'curly') {
    cap('m-cap-crop', Math.PI * 0.5, 0.4, [1, 1.03, 1.02], 0.171);
    const n = lite ? 12 : 36, rr = lite ? 0.06 : 0.045;
    for (let i = 0; i < n; i++) { // a spiral of curls over the crown and back, clear of the forehead
      const yy = 0.98 - 1.1 * (i + 0.5) / n, rad = Math.sqrt(Math.max(0, 1 - yy * yy)), ang = i * 2.399963, x = Math.cos(ang) * rad, z = Math.sin(ang) * rad;
      if (x > 0.35 && yy < 0.62) continue; if (yy < 0.05 && x > -0.2) continue;
      blob(rr, x * 0.168 * 0.97, yy * 0.17 * 1.07 + 0.012, z * 0.168 * 1.0, 1, 1, 1);
    }
    sideburns();
  }
  else if (style === 'afro') { blob(0.205, -0.06, 0.085, 0, 1, 1.02, 1.1); }
  else if (style === 'long') { defaultCap(); fringe(); head.add(curtain('m-curt-long', { p0: 1.3, len: 0.34, lock: 0.07, seed: 1 })); }
  else if (style === 'wavy') {
    defaultCap(); fringe();
    head.add(M(geo('m-wavy', () => { const gm = new THREE.CylinderGeometry(0.175, 0.225, 0.42, 36, 10, true, Math.PI * 0.62, Math.PI * 1.76), pa = gm.attributes.position; for (let i = 0; i < pa.count; i++) { const x = pa.getX(i), y = pa.getY(i), z = pa.getZ(i), a = Math.atan2(z, x), f = 1 + 0.07 * Math.sin(a * 7 + y * 30) * smooth(clamp((0.2 - y) / 0.3, 0, 1)); pa.setX(i, x * f); pa.setZ(i, z * f); } gm.computeVertexNormals(); return gm; }), hairD, -0.01, -0.16, 0));
  }
  else if (style === 'ponytail') {
    defaultCap(); fringe();
    blob(0.026, -0.168, 0.05, 0, 1, 1, 1, mat(0xb2404a));
    for (let k = 0; k < 15; k++) { const tt = k / 14, tb = blob(Math.round((0.038 - 0.018 * tt) * 1000) / 1000, -0.19 - 0.09 * Math.sin(tt * 1.5) , 0.05 - 0.36 * tt + 0.02 * Math.sin(tt * 3), 0.0, 1.0, 1.9, 1.0, hairM); tb.rotation.z = 0.25 * (1 - tt); }
  }
  else if (style === 'plaits') {
    defaultCap(); fringe();
    [-1, 1].forEach(s2 => { for (let i = 0; i < 6; i++) blob(0.03 - i * 0.002, -0.03 - i * 0.004, -0.06 - i * 0.034, s2 * 0.15, 0.9, 1.15, 0.9); blob(0.016, -0.04, -0.27, s2 * 0.15, 1, 1, 1, mat(0xb2404a)); });
  }
  else if (style === 'bob') { defaultCap(); fringe(); head.add(curtain('m-curt-bob', { p0: 1.45, len: 0.17, y0: 0.03, lock: 0.03, tuck: 0.3, flare: 0.03, seed: 9 })); }
  else if (style === 'pixie') { cap('m-cap-crop', Math.PI * 0.5, 0.35, [1.01, 1.04, 1.03], 0.172); fringe(-0.2); blob(0.06, 0.06, 0.165, 0.045, 1.4, 0.7, 1.1); [-1, 1].forEach(s2 => blob(0.028, 0.03, -0.045, s2 * 0.152, 0.8, 1.5, 0.7)); }
  else if (style === 'bun') { defaultCap(); fringe(); blob(0.075, -0.17, 0.09, 0); }
  else if (style === 'updo') { defaultCap(); fringe(); blob(0.088, -0.03, 0.2, 0, 1, 0.9, 1); const rg = M(geo('m-updoring', () => new THREE.TorusGeometry(0.075, 0.016, 6, 18)), hairM, -0.03, 0.165, 0); rg.rotation.x = Math.PI / 2; head.add(rg); }
  else { defaultCap(); fringe(); sideburns(); } // 'short' and anything unknown
  // hats (gents), tiara and hair flowers (ladies): they sit on the hair, which is raised or widened for tall styles
  const hTop = { afro: 0.29, quiff: 0.235, curly: 0.25, updo: 0.27, bun: 0.24 }[style] || 0.2, hWide = style === 'afro' ? 1.25 : style === 'curly' ? 1.1 : 1;
  const lath = (pts, key, m) => M(lathe(key, pts, 36), m), hacc = o => { o.userData.acc = 'hat'; head.add(o); return o; };
  const rAsc = (pts, y) => rAt(pts, clamp(y, pts[0][1], pts[pts.length - 1][1]));
  if (gent && wd.hat === 'glengarry') {
    const fe = mat(0x1d2b4f, { roughness: 0.95, side: THREE.DoubleSide }), gp = [[0.192, 0.0], [0.185, 0.06], [0.165, 0.12], [0.125, 0.175], [0.07, 0.2], [0.0, 0.205]], by = 0.062 + Math.max(0, hTop - 0.2) * 0.9;
    const g = new THREE.Group(); g.position.set(-0.012, by, 0); g.scale.set(1.12 * hWide, 0.85, 0.94 * hWide); g.userData.acc = 'hat'; head.add(g);
    g.add(lath(gp, 'm-glen', fe));
    const band = M(geo('m-glenband', () => new THREE.TorusGeometry(0.192, 0.01, 6, 36)), tart, 0, 0.004, 0); band.rotation.x = Math.PI / 2; g.add(band);
    const bd = M(geo('m-glenbadge', () => new THREE.CylinderGeometry(0.015, 0.015, 0.005, 14)), silver, rAsc(gp, 0.1) + 0.004, 0.1, 0); bd.rotation.z = Math.PI / 2 - 0.35; g.add(bd);
    [-1, 1].forEach(s2 => { const rb = M(geo('m-glenrib', () => new THREE.BoxGeometry(0.004, 0.1, 0.018)), mat(0x10182f, { roughness: 0.8 }), -0.2, -0.03, s2 * 0.016); rb.rotation.z = 0.12; g.add(rb); });
  } else if (gent && wd.hat === 'balmoral') {
    const fe = mat(0x1d2b4f, { roughness: 0.95, side: THREE.DoubleSide }), bp = [[0.195, 0.0], [0.222, 0.02], [0.215, 0.05], [0.17, 0.09], [0.1, 0.112], [0.0, 0.115]], by = 0.088 + Math.max(0, hTop - 0.2) * 0.9;
    const g = new THREE.Group(); g.position.set(-0.012, by, 0); g.scale.set(hWide, 1, hWide); g.rotation.x = 0.07; g.userData.acc = 'hat'; head.add(g);
    g.add(lath(bp, 'm-balm', fe));
    const band = M(geo('m-balmband', () => new THREE.TorusGeometry(0.2, 0.0115, 6, 36)), tart, 0, 0.012, 0); band.rotation.x = Math.PI / 2; g.add(band);
    g.add(M(geo('m-toorie', () => new THREE.SphereGeometry(0.026, 10, 8)), mat(0xb3262b, { roughness: 0.95 }), 0, 0.125, 0));
  }
  if (!gent && wd.tiara !== 'none') {
    const tm = mat(wd.tiara === 'gold' ? 0xd9b445 : 0xe3e6ee, { metalness: 0.9, roughness: 0.2 }), gm = mat(0x9fd4f5, { roughness: 0.1, metalness: 0.2, emissive: 0x1a3a50 });
    const g = new THREE.Group(); g.position.set(0.075, 0.012 + Math.max(0, hTop - 0.2) * 0.4, 0); g.scale.setScalar(hWide); g.userData.acc = 'tiara'; head.add(g);
    const arc = M(geo('m-tiara', () => new THREE.TorusGeometry(0.17, 0.005, 6, 32, Math.PI)), tm); arc.rotation.y = Math.PI / 2; g.add(arc);
    [0.3, 0.5, 0.7].forEach((u, i) => { const a = Math.PI * u, hh = i === 1 ? 0.034 : 0.022; const sp = M(geo('m-tspike' + i, () => new THREE.ConeGeometry(0.006, hh, 6)), tm, 0, Math.sin(a) * 0.17 + hh / 2 - 0.002, -Math.cos(a) * 0.17); sp.rotation.x = Math.atan2(-Math.cos(a), Math.sin(a)) * 0.6; g.add(sp); g.add(M(geo('m-tgem', () => new THREE.SphereGeometry(0.007, 8, 6)), gm, 0, Math.sin(a) * 0.17 + hh + 0.002, -Math.cos(a) * 0.17)); });
  }
  if (!gent && wd.flow !== 'none') {
    const pal = wd.flow === 'rose' ? [0xd4455a, 0xb8304a] : wd.flow === 'white' ? [0xf5f1e8, 0xe8e1cf] : [0xe58aa0, 0xf5f1e8, 0x8fb4e0], cm = mat(0xe8c44a, { roughness: 0.7 });
    const at = (dx, dy, dz) => { const l = Math.hypot(dx, dy, dz); return [-0.012 + 0.176 * dx / l * 1.03, 0.012 + 0.187 * dy / l * 1.03, 0.183 * dz / l * 1.03]; };
    const spots = wd.flow === 'spray' ? [[0.3, 0.6, 0.75, 0.016], [0.2, 0.8, 0.55, 0.014], [0.05, 0.9, 0.45, 0.015], [0.4, 0.4, 0.85, 0.013], [-0.1, 0.9, 0.4, 0.012]] : [[0.15, 0.55, 0.82, 0.021], [0.32, 0.5, 0.8, 0.015], [-0.02, 0.62, 0.78, 0.015], [0.18, 0.72, 0.68, 0.014]];
    spots.forEach(([dx, dy, dz, rr], i) => { const p = at(dx, dy, dz), n = new THREE.Vector3(dx / 0.176, dy / 0.187, dz / 0.183).normalize(); const f = new THREE.Group(); f.position.set(p[0], p[1], p[2]); f.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n); f.userData.acc = 'flowers'; head.add(f);
      const pm = mat(pal[i % pal.length], { roughness: 0.7 }); for (let q = 0; q < 5; q++) { const a = q / 5 * TAU, pt = M(geo('m-petal' + rr, () => new THREE.SphereGeometry(rr * 0.62, 8, 6)), pm, Math.cos(a) * rr * 0.62, rr * 0.2, Math.sin(a) * rr * 0.62); pt.scale.y = 0.55; f.add(pt); }
      f.add(M(geo('m-fcen' + rr, () => new THREE.SphereGeometry(rr * 0.34, 8, 6)), cm, 0, rr * 0.38, 0)); });
  }
  let label = null;
  if (withLabel && per.name) { label = labelSprite(per.name, false); label.position.y = 2.02 * k + lift * k; root.add(label); }
  return { root, body, lifter, legs, knees, feet, arms, elbows, head, k, label, skirt: skirtGrp, heel, th, lift, skirtSY: 1 + lift };
}
/* ---------- the dance hall: plastered walls, oak panelling, tall windows, a stage with the band, and the people watching ---------- */
const HALL = { hw: 15, hl: 18, hh: 9 }; // half width, half length and height in metres. The band's end is -z.
function canvasTex(w, h, draw, repeat) {
  const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h);
  const t = new THREE.CanvasTexture(c); t.encoding = THREE.sRGBEncoding; t.anisotropy = 4;
  if (repeat) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(repeat[0], repeat[1]); }
  return t;
}
function windowTexture() {
  return canvasTex(128, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0a1430'); g.addColorStop(1, '#2d4a78'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.fillStyle = 'rgba(255,255,240,.85)'; for (let i = 0; i < 16; i++) x.fillRect((i * 53 + 11) % w, (i * 97) % (h * 0.55), 1.6, 1.6);
    x.fillStyle = 'rgba(255,246,214,.95)'; x.beginPath(); x.arc(w * 0.68, h * 0.17, 9, 0, TAU); x.fill();
    x.strokeStyle = '#2a1a0e'; x.lineWidth = 7; x.strokeRect(3.5, 3.5, w - 7, h - 7);
    x.lineWidth = 4; x.beginPath(); x.moveTo(w / 2, 0); x.lineTo(w / 2, h); x.moveTo(0, h * 0.33); x.lineTo(w, h * 0.33); x.moveTo(0, h * 0.66); x.lineTo(w, h * 0.66); x.stroke();
  });
}
function curtainTexture(rep) {
  return canvasTex(256, 64, (x, w, h) => { for (let i = 0; i < w; i++) { const k = 0.5 + 0.5 * Math.sin(i / w * TAU * 6); x.fillStyle = `rgb(${Math.round(92 + 70 * k)},${Math.round(14 + 12 * k)},${Math.round(22 + 14 * k)})`; x.fillRect(i, 0, 1, h); } }, rep);
}
function signTexture(text, fg, bg, font, w = 512, h = 128) {
  return canvasTex(w, h, (x, W2, H2) => {
    x.fillStyle = bg; x.fillRect(0, 0, W2, H2); x.strokeStyle = fg; x.lineWidth = 4; x.strokeRect(8, 8, W2 - 16, H2 - 16);
    x.fillStyle = fg; x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, W2 / 2, H2 / 2 + 3);
  });
}
function glowTexture() {
  return canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,226,160,1)'); g.addColorStop(0.35, 'rgba(255,210,130,.4)'); g.addColorStop(1, 'rgba(255,200,120,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
}
function buildHall3D(scene) {
  const { hw, hl, hh } = HALL;
  const B = (w, h, d, m, x, y, z, ry) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m); o.position.set(x, y, z); if (ry) o.rotation.y = ry; scene.add(o); return o; };
  const P = (w, h, m, x, y, z, ry) => { const o = new THREE.Mesh(new THREE.PlaneGeometry(w, h), m); o.position.set(x, y, z); o.rotation.y = ry || 0; scene.add(o); return o; };
  const oak = 0x4d2f1b, brass = mat(0xc9a24a, { metalness: 0.75, roughness: 0.3 });
  // shell: cream plaster above dark oak panelling, a picture rail, skirting
  const W4 = (y0, y1, inset, m) => { const hgt = y1 - y0, yc = (y0 + y1) / 2, xs = hw - inset, zs = hl - inset; P(zs * 2, hgt, m, -xs, yc, 0, Math.PI / 2); P(zs * 2, hgt, m, xs, yc, 0, -Math.PI / 2); P(xs * 2, hgt, m, 0, yc, zs, Math.PI); P(xs * 2, hgt, m, 0, yc, -zs, 0); };
  W4(0, hh, 0, mat(0xcdb98e, { roughness: 0.95 }));
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hl * 2), mat(0xb9a67c, { roughness: 0.95 })); ceil.rotation.x = Math.PI / 2; ceil.position.y = hh; scene.add(ceil);
  W4(0, 1.4, 0.05, mat(oak, { roughness: 0.55 }));
  W4(1.4, 1.5, 0.08, mat(0x7a5232, { roughness: 0.5 }));
  W4(0, 0.16, 0.08, mat(0x2e1b0e));
  W4(hh - 1.05, hh - 0.95, 0.06, mat(0x6b4a2a)); // picture rail
  // ceiling beams
  const beamM = mat(0x35220f, { roughness: 0.7 });
  for (let i = -4; i <= 4; i++) B(hw * 2 - 0.1, 0.42, 0.46, beamM, 0, hh - 0.21, i * 4.2);
  [-7.5, 7.5].forEach(x => B(0.36, 0.3, hl * 2 - 0.1, beamM, x, hh - 0.38, 0));
  // tall windows on both long walls, with sills, tartan-red curtains and a pelmet
  const winM = new THREE.MeshBasicMaterial({ map: windowTexture(), polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), frameM = mat(0x3a2412, { roughness: 0.6 }), sillM = mat(0x6b4326, { roughness: 0.5 });
  const curM = new THREE.MeshBasicMaterial({ map: curtainTexture([1, 1]), side: THREE.DoubleSide }), pelM = mat(0x7a1d24, { roughness: 0.8 });
  const glowM = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  [-1, 1].forEach(s => {
    const ry = -s * Math.PI / 2;
    for (let i = 0; i < 6; i++) {
      const z = -12.5 + i * 5;
      B(0.08, 3.7, 1.85, frameM, s * (hw - 0.06), 4.35, z);
      P(1.55, 3.4, winM, s * (hw - 0.12), 4.35, z, ry); // 2 cm proud of the frame's face (it was 5 mm: z-fighting on low-precision depth buffers)
      B(0.28, 0.09, 2.0, sillM, s * (hw - 0.14), 2.55, z);
      [-1, 1].forEach(c => P(0.6, 4.1, curM, s * (hw - 0.14), 4.4, z + c * 1.05, ry));
      B(0.22, 0.3, 2.7, pelM, s * (hw - 0.14), 6.55, z);
    }
    // wall lights between the windows
    for (let i = 0; i < 5; i++) {
      const z = -10 + i * 5;
      B(0.1, 0.34, 0.2, brass, s * (hw - 0.1), 3.4, z);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); bulb.position.set(s * (hw - 0.22), 3.62, z); scene.add(bulb);
      const gl = new THREE.Sprite(glowM); gl.scale.set(1.5, 1.5, 1); gl.position.copy(bulb.position); scene.add(gl);
    }
  });
  // the band's end: velvet curtain, gold name board, tartan banners, a stage and steps
  const drape = new THREE.MeshBasicMaterial({ map: curtainTexture([3, 1]), side: THREE.DoubleSide });
  P(hw * 2 - 1, 7.4, drape, 0, 4.2, -hl + 0.07);
  B(hw * 2 - 0.6, 0.7, 0.4, pelM, 0, 8.05, -hl + 0.25);
  const board = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.25), new THREE.MeshBasicMaterial({ map: signTexture('REEL TIME  ·  CEILIDH & BALL', '#e2b45c', '#14241d', '400 44px "Uncial Antiqua", Georgia, serif', 1024, 170) })); board.position.set(0, 6.6, -hl + 0.2); scene.add(board);
  const tkeys = Object.keys(TARTANS);
  [-1, 1].forEach((s, si) => [6.2, 8.6, 11].forEach((x, i) => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.4), mat(0xffffff, { map: tartanTexture(tkeys[(i * 2 + si) % 6]), side: THREE.DoubleSide })); banner.position.set(s * x, 4.4, -hl + 0.16); scene.add(banner);
    B(1.4, 0.07, 0.07, brass, s * x, 6.15, -hl + 0.16);
  }));
  B(14, 0.7, 4.4, mat(0x2b1a0e, { roughness: 0.5 }), 0, 0.35, -hl + 2.2);
  B(3.2, 0.36, 0.8, mat(0x2b1a0e, { roughness: 0.5 }), 0, 0.18, -hl + 4.6);
  R3.band = [];
  ['fiddle', 'accordion', 'piano', 'drums'].forEach((inst, i) => {
    const per = { name: '', height: 1.75, skin: (i * 2) % 6, hair: (i * 3) % 8, style: 'short', tartan: 'red' };
    const m = makePerson3D(per, 'gent', false, true); m.root.position.set(-4.5 + i * 3, 0.7, -hl + 1.9); m.root.rotation.y = -Math.PI / 2; scene.add(m.root); R3.band.push(m);
    B(0.5, 0.35, 0.3, mat([0x6b3a1a, 0x8a1c1c, 0x111111, 0x7a6a50][i]), -4.5 + i * 3, 1.95, -hl + 2.2);
  });
  // the back of the hall: double doors, an exit sign, banners, and the tea table
  B(2.6, 3.3, 0.14, mat(0x3a2412, { roughness: 0.55 }), 0, 1.65, hl - 0.08);
  [-1, 1].forEach(s => { B(1.1, 2.9, 0.05, mat(0x5a3a20, { roughness: 0.5 }), s * 0.6, 1.6, hl - 0.17); B(0.05, 0.3, 0.05, brass, s * 0.12, 1.5, hl - 0.22); });
  const exit = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.3), new THREE.MeshBasicMaterial({ map: signTexture('EXIT', '#e8fff0', '#168a45', '700 54px Barlow, sans-serif', 256, 86) })); exit.position.set(0, 3.7, hl - 0.18); exit.rotation.y = Math.PI; scene.add(exit);
  [-1, 1].forEach((s, si) => [4.6, 7.4, 10.4].forEach((x, i) => {
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.4), mat(0xffffff, { map: tartanTexture(tkeys[(i + si * 3) % 6]), side: THREE.DoubleSide })); banner.position.set(s * x, 4.4, hl - 0.16); banner.rotation.y = Math.PI; scene.add(banner);
  }));
  B(2.6, 0.86, 0.95, mat(0xf3eee2, { roughness: 0.95 }), -hw + 1.9, 0.43, hl - 1.4);
  const urn = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 0.55, 14), mat(0xc9ccd2, { metalness: 0.85, roughness: 0.25 })); urn.position.set(-hw + 2.8, 1.14, hl - 1.4); scene.add(urn);
  for (let i = 0; i < 8; i++) { const cup = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.03, 0.06, 8), mat(0xfaf8f2)); cup.position.set(-hw + 0.9 + i * 0.22, 0.89, hl - 1.25); scene.add(cup); }
  // bunting across the hall
  const flagG = new THREE.ShapeGeometry(new THREE.Shape([new THREE.Vector2(-0.17, 0), new THREE.Vector2(0.17, 0), new THREE.Vector2(0, -0.46)]));
  const cols = [0xa8232a, 0x1f4d3a, 0xc8902e, 0x6d5a9c, 0x1d2b4f, 0xf4f1ea].map(c => new THREE.Color(c));
  const strings = [-9, -3, 3, 9], perStr = 24, flags = new THREE.InstancedMesh(flagG, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }), strings.length * perStr);
  const dummy = new THREE.Object3D(); let fi = 0;
  strings.forEach(z => {
    const pts = []; for (let i = 0; i <= 40; i++) { const u = i / 40; pts.push(new THREE.Vector3(lerp(-hw + 0.4, hw - 0.4, u), 7.3 - 1.0 * Math.sin(Math.PI * u), z)); }
    scene.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x3a2412 })));
    for (let i = 0; i < perStr; i++) { const u = (i + 0.5) / perStr, y = 7.3 - 1.0 * Math.sin(Math.PI * u), dy = -1.0 * Math.PI * Math.cos(Math.PI * u) / (2 * hw); dummy.position.set(lerp(-hw + 0.4, hw - 0.4, u), y, z); dummy.rotation.set(0, 0, Math.atan(dy)); dummy.updateMatrix(); flags.setMatrixAt(fi, dummy.matrix); flags.setColorAt(fi, cols[(i + fi) % cols.length]); fi++; }
  });
  scene.add(flags);
  // chandeliers hung on chains
  [[-6, -7], [6, -7], [-6, 4], [6, 4], [0, -1.5], [0, 11]].forEach(([x, z]) => {
    const grp = new THREE.Group(); grp.position.set(x, 7.0, z);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.04, 6, 24), brass); ring.rotation.x = Math.PI / 2; grp.add(ring);
    const chain = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 2, 4), brass); chain.position.y = 1.0; grp.add(chain);
    for (let i = 0; i < 10; i++) { const b = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a8 })); b.position.set(Math.cos(i / 10 * TAU) * 0.8, 0.1, Math.sin(i / 10 * TAU) * 0.8); grp.add(b); }
    const gl = new THREE.Sprite(glowM); gl.scale.set(3.2, 3.2, 1); gl.position.y = 0.1; grp.add(gl);
    if (Math.abs(x) < 7 && z < 5) grp.add(new THREE.PointLight(0xffd59a, 0.5, 24, 2)); // a few real lights over the floor, the rest just glow
    scene.add(grp);
  });
  buildCrowd3D(scene);
}

// People watching: chairs down both long walls with an audience, and a few standing by the tea table.
function makeSpectator(seed, seated) {
  const h = hashId('crowd' + seed), gent = h % 2 === 0, k = 0.94 + (h % 12) / 100;
  const root = new THREE.Group(), body = new THREE.Group(); root.add(body); body.scale.setScalar(k);
  const M = (g, m, x, y, z) => { const o = new THREE.Mesh(g, m); o.position.set(x || 0, y || 0, z || 0); return o; };
  const skinM = mat(SKIN[h % 6], { roughness: 0.6 }), hairC = HAIR[(h >>> 3) % 8];
  const jacket = gent ? [0x15171c, 0x2b3a55, 0x3c2f25, 0x22303a][(h >>> 4) % 4] : DRESS[(h >>> 5) % DRESS.length] ? new THREE.Color(DRESS[(h >>> 5) % DRESS.length]).getHex() : 0x6e1f2b;
  const topM = mat(jacket, { roughness: 0.6 }), hoseM = mat(gent ? 0xefeadf : 0xe9dccf, { roughness: 0.9 }), shoeM = mat(0x0b0b0b, { roughness: 0.4 });
  const lowM = gent ? mat(0xffffff, { map: tartanTexture(Object.keys(TARTANS)[(h >>> 2) % 6]), side: THREE.DoubleSide, roughness: 0.85 }) : topM;
  const yHip = seated ? 0.5 : 0.9;
  if (seated) {
    if (gent) [-1, 1].forEach(s => body.add(M(geo('sp-thigh', () => new THREE.BoxGeometry(0.46, 0.15, 0.16)), lowM, 0.21, 0.52, s * 0.1)));
    else body.add(M(geo('sp-lap', () => new THREE.BoxGeometry(0.52, 0.17, 0.44)), lowM, 0.23, 0.53, 0));
    [-1, 1].forEach(s => { body.add(M(geo('sp-shin', () => new THREE.CylinderGeometry(0.052, 0.042, 0.44, 8)), hoseM, 0.45, 0.25, s * 0.1)); body.add(M(geo('sp-shoe', () => new THREE.BoxGeometry(0.18, 0.06, 0.09)), shoeM, 0.52, 0.04, s * 0.1)); });
  } else {
    if (gent) { body.add(M(geo('sp-kilt', () => new THREE.CylinderGeometry(0.2, 0.26, 0.4, 14)), lowM, 0, 0.78, 0)); [-1, 1].forEach(s => body.add(M(geo('sp-leg', () => new THREE.CylinderGeometry(0.055, 0.045, 0.62, 8)), hoseM, 0, 0.31, s * 0.09))); }
    else body.add(M(geo('sp-gown', () => new THREE.CylinderGeometry(0.17, 0.46, 1.0, 16)), topM, 0, 0.5, 0));
    [-1, 1].forEach(s => body.add(M(geo('sp-shoe', () => new THREE.BoxGeometry(0.18, 0.06, 0.09)), shoeM, 0.06, 0.03, s * 0.09)));
  }
  const yT = seated ? 0.8 : 1.16;
  const torso = M(geo('sp-torso', () => new THREE.CylinderGeometry(0.19, 0.22, 0.56, 12)), topM, 0, yT, 0); torso.scale.x = 0.75; body.add(torso);
  const head = new THREE.Group(); head.position.set(0.01, yT + 0.45, 0); body.add(head);
  head.add(M(geo('sp-head', () => new THREE.SphereGeometry(0.135, 14, 10)), skinM));
  head.add(M(geo('sp-hair', () => new THREE.SphereGeometry(0.146, 14, 8, 0, TAU, 0, Math.PI * 0.62)), mat(hairC, { roughness: 0.5 }), -0.018, 0.012, 0));
  if (!gent) { const lh = M(geo('sp-hair2', () => new THREE.SphereGeometry(0.15, 10, 8)), mat(hairC, { roughness: 0.5 }), -0.07, -0.11, 0); lh.scale.set(0.8, 1.35, 1); head.add(lh); }
  const arms = [];
  [-1, 1].forEach(s => {
    const sh = new THREE.Group(); sh.position.set(0, yT + 0.2, s * 0.22); sh.rotation.order = 'ZXY';
    sh.add(M(geo('sp-arm', () => new THREE.CylinderGeometry(0.046, 0.04, 0.46, 8)), gent ? topM : skinM, 0, -0.23, 0));
    sh.add(M(geo('sp-hand', () => new THREE.SphereGeometry(0.05, 8, 6)), skinM, 0, -0.49, 0));
    body.add(sh); arms.push(sh);
  });
  return { root, body, head, arms, ph: (h % 100) / 100 * TAU, clapper: h % 5 < 3, cheer: h % 7 < 5, yT, sx: 0 };
}
function buildCrowd3D(scene) {
  const { hw, hl } = HALL; R3.crowd = [];
  const phone = document.body.classList.contains('touch');
  const chairGeoS = new THREE.BoxGeometry(0.5, 0.06, 0.5), chairGeoB = new THREE.BoxGeometry(0.05, 0.55, 0.5), cm = mat(0x6b4a2a, { roughness: 0.6 });
  const spots = []; // seats down both walls; every few are left empty
  [-1, 1].forEach(s => { for (let i = 0; i < 21; i++) spots.push({ s, x: s * (hw - 2.4), z: -12 + i * 1.2 }); });
  const seatI = new THREE.InstancedMesh(chairGeoS, cm, spots.length), backI = new THREE.InstancedMesh(chairGeoB, cm, spots.length), d = new THREE.Object3D();
  spots.forEach((p, i) => { d.rotation.set(0, 0, 0); d.position.set(p.x, 0.43, p.z); d.updateMatrix(); seatI.setMatrixAt(i, d.matrix); d.position.set(p.x + p.s * 0.23, 0.7, p.z); d.updateMatrix(); backI.setMatrixAt(i, d.matrix); });
  scene.add(seatI); scene.add(backI);
  spots.forEach((p, i) => {
    if (hashId('seat' + i) % 100 > (phone ? 34 : 66)) return;
    const m = makeSpectator(i, true); m.root.position.set(p.x - p.s * 0.02, 0, p.z); m.root.rotation.y = p.s > 0 ? Math.PI : 0; scene.add(m.root); R3.crowd.push(m);
  });
  // standing by the tea table and the doors
  const stand = [[-hw + 3.4, hl - 3.2, 0.6], [-hw + 4.2, hl - 3.5, 2.4], [-hw + 3.6, hl - 4.3, 4.4], [hw - 4, hl - 3, 3.6], [hw - 3.2, hl - 3.8, 3.9], [-4, -hl + 6.5, 1.2], [4.5, -hl + 6.3, 1.9], [0.5, hl - 3, -1.57]];
  stand.slice(0, phone ? 3 : 8).forEach(([x, z, face], i) => { const m = makeSpectator(100 + i, false); m.root.position.set(x, 0, z); m.root.rotation.y = -face; scene.add(m.root); R3.crowd.push(m); });
}
function animateCrowd(g, t) {
  if (!R3.crowd) return;
  const pulse = (t * 2) % 1, ph = Math.round(t / 8) * 8, hooch = t > 1 && Math.abs(t - ph) < 0.5, done = t > g.total + 0.2, now = performance.now() / 1000;
  const clapK = pulse < 0.2 ? Math.sin(pulse / 0.2 * Math.PI) : 0;
  R3.crowd.forEach(c => {
    const clap = (c.clapper && t > 0) || done;
    c.body.rotation.x = Math.sin(now * 1.6 + c.ph) * 0.035;
    c.head.rotation.z = Math.sin(now * 3.2 + c.ph) * 0.06;
    const up = (hooch && c.cheer) || (done && c.cheer);
    c.arms.forEach((a, i) => {
      const side = i === 0 ? -1 : 1;
      const tz = up ? 2.8 : clap ? 0.35 + 1.0 * (done ? Math.abs(Math.sin(now * 9 + c.ph)) : clapK) : 0.12, tx = up ? side * 0.25 : clap ? -side * 0.55 : 0;
      a.rotation.z += (tz - a.rotation.z) * 0.4; a.rotation.x += (tx - a.rotation.x) * 0.4;
    });
  });
}

function init3D() {
  if (R3.ready) return true; if (R3.failed) return false;
  if (!window.THREE) { R3.failed = true; return false; }
  try {
    const cv = $('gl');
    R3.renderer = new THREE.WebGLRenderer({ canvas: cv, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: false });
  } catch (e) { R3.failed = true; return false; }
  const r = R3.renderer;
  r.setPixelRatio(Math.min(document.body.classList.contains('touch') ? 1.25 : 1.5, window.devicePixelRatio || 1)); r.outputEncoding = THREE.sRGBEncoding;
  r.toneMapping = THREE.ACESFilmicToneMapping; r.toneMappingExposure = 1.0;
  const scene = R3.scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0e0a07); scene.fog = new THREE.Fog(0x120d08, 26, 62);
  R3.camera = new THREE.PerspectiveCamera(66, 1, 0.1, 80);
  scene.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2414, 0.6));
  const dl = new THREE.DirectionalLight(0xffe4c0, 0.55); dl.position.set(4, 10, 6); scene.add(dl);
  const rim = new THREE.DirectionalLight(0x9fb8ff, 0.18); rim.position.set(-6, 5, -8); scene.add(rim);
  // sprung floor
  const { hw, hl, hh } = HALL;
  if (!floorCanvas) { floorCanvas = makeFloorCanvas(); floorPat = ctx.createPattern(floorCanvas, 'repeat'); }
  const ftex = new THREE.CanvasTexture(floorCanvas); ftex.wrapS = ftex.wrapT = THREE.RepeatWrapping; ftex.repeat.set(hw * 2 / 3.43, hl * 2 / 3.43); ftex.encoding = THREE.sRGBEncoding; ftex.anisotropy = r.capabilities.getMaxAnisotropy ? r.capabilities.getMaxAnisotropy() : 4; ftex.minFilter = THREE.LinearMipmapLinearFilter;
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(hw * 2, hl * 2), mat(0x9a8c7c, { map: ftex, roughness: 0.42, metalness: 0.05 }));
  floor.rotation.x = -Math.PI / 2; scene.add(floor);
  buildHall3D(scene);
  try { bwBuildWorld(scene); } catch (e) { console.warn('ball world build failed', e); } // the bar, the terrace and the ball NPC group (BALL WORLD block)
  // where to go: target ring at your spot, a marker half a bar ahead, a dotted trail beyond
  R3.ring = new THREE.Mesh(new THREE.RingGeometry(0.9, 1, 48), new THREE.MeshBasicMaterial({ color: 0x7fd08a, transparent: true, opacity: 0.85, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 }));
  R3.ring.rotation.x = -Math.PI / 2; R3.ring.position.y = 0.02; scene.add(R3.ring);
  R3.ahead = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.0, 0.3, 4), new THREE.MeshBasicMaterial({ color: 0xe2b45c, transparent: true, opacity: 0.9 }));
  scene.add(R3.ahead);
  R3.trail = [];
  const chev = new THREE.Shape(); chev.moveTo(0.16, 0); chev.lineTo(-0.08, 0.13); chev.lineTo(-0.02, 0); chev.lineTo(-0.08, -0.13); chev.closePath();
  const chevG = new THREE.ShapeGeometry(chev);
  for (let i = 0; i < 14; i++) { const d = new THREE.Mesh(chevG, new THREE.MeshBasicMaterial({ color: 0xe2b45c, transparent: true, opacity: 0.7, depthWrite: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4, polygonOffsetUnits: -4 })); d.rotation.order = 'YXZ'; scene.add(d); R3.trail.push(d); }
  R3.people = {}; R3.extra = [];
  R3.ready = true;
  resize();
  return true;
}

function clear3DPeople() {
  if (!R3.ready) return;
  Object.values(R3.people).forEach(m => R3.scene.remove(m.root));
  R3.extra.forEach(m => R3.scene.remove(m.m.root));
  R3.people = {}; R3.extra = [];
}
function build3DGame(g) {
  if (!init3D()) return;
  clear3DPeople();
  const ch = g.ch;
  Object.keys(ch.tr).forEach(id => {
    const per = ch.meta[id].person;
    const m = makePerson3D(per, ch.meta[id].kind, id !== 'P');
    R3.scene.add(m.root); R3.people[id] = m;
  });
  R3.people.P.root.visible = false; // that's you
  // other sets dancing the same reel elsewhere in the room
  const phone = document.body.classList.contains('touch');
  const offs = (g.D.view === 'long' ? [[-6.2, 0], [6.2, 0]] : [[-6.5, 2], [6.5, -2]]).slice(0, phone ? 1 : 2);
  offs.forEach(([ox, oy], si) => {
    Object.keys(ch.tr).forEach(id => {
      const h = hashId(id + si); const kind = ch.meta[id].kind;
      const per = { ...guestLook(h, kind), name: '', kind, skin: h % 6, hair: (h >>> 3) % 8, style: kind === 'gent' ? 'short' : ['long', 'bun'][h % 2], tartan: Object.keys(TARTANS)[h % 6], dress: (h >>> 5) % DRESS.length, height: kind === 'gent' ? 1.74 + (h % 14) / 100 : 1.6 + (h % 12) / 100 };
      const m = makePerson3D(per, kind, false, true); R3.scene.add(m.root);
      R3.extra.push({ id, ox, oy, m, phase: (h % 7), last: null, face: 0 });
    });
  });
  R3.gameRef = g;
}

function bowAt(g, t) {
  const k = u => u > 0 && u < 1 ? Math.sin(u * Math.PI) : 0;
  return Math.max(k((t + 1.7) / 1.3), k((t - g.total - 0.05) / 1.3));
}
function posePerson(m, st, dtSec) {
  const travel = Math.min(1, st.spd * 0.9);
  const sw = Math.sin(st.phase);
  // skip-change of step: hip swings, the trailing knee bends, a little spring each bar
  let hipA = sw * 0.42 * travel, hipB = -sw * 0.42 * travel;
  let kneeA = -(0.12 + Math.max(0, -sw) * 0.75) * travel, kneeB = -(0.12 + Math.max(0, sw) * 0.75) * travel;
  let bob = Math.pow(Math.abs(Math.sin(st.phase)), 3) * 0.05 * travel;
  m.legs[0].rotation.x = m.legs[1].rotation.x = 0;
  if (st.setting >= 0) { // on the toes, springing and crossing
    const beat = st.setting * 2, ph = beat * Math.PI;
    bob = Math.abs(Math.sin(ph)) * 0.07;
    const lift = Math.max(0, Math.sin(ph));
    hipA = 0.1 * lift; hipB = -0.05; kneeA = -0.5 * lift; kneeB = -0.1;
    if (Math.floor(beat) % 2) { const tmp = hipA; hipA = hipB; hipB = tmp; const tk = kneeA; kneeA = kneeB; kneeB = tk; }
  }
  const sk = st.setting >= 0 ? st.stepKind : null; // the fancier set steps, and the helicopter's braced stance
  if (sk === 'highcut' || sk === 'fling' || sk === 'heeltoe') {
    const beat = st.setting * 2, ph = beat * Math.PI, lift = Math.max(0, Math.sin(ph)), alt = Math.floor(beat) % 2 === 1;
    if (sk === 'highcut') { bob = 0.3 * Math.abs(Math.sin(ph)); hipA = hipB = 0.5 * lift; kneeA = kneeB = -1.0 * lift; } // both feet off the floor, knees tucked
    else if (sk === 'fling') { bob = 0.05 * lift; hipA = alt ? 0 : -0.55 * lift; kneeA = alt ? -0.1 : -1.7 * lift; hipB = alt ? -0.55 * lift : 0; kneeB = alt ? -1.7 * lift : -0.1; } // one foot kicked up behind
    else { bob = 0.04 * lift; hipA = alt ? 0 : 0.85 * lift; kneeA = alt ? -0.1 : -0.05; hipB = alt ? 0.85 * lift : 0; kneeB = alt ? -0.05 : -0.1; } // heel out in front
  }
  if (st.heli) { hipA = hipB = 0.04; kneeA = kneeB = -0.3; bob = 0.02; }
  const mvs = st.mv, mvE = mvs ? Math.min(1, mvs.u * 5, (1 - mvs.u) * 5) : 0; // your moves: legs here, arms below
  if (mvs) {
    const u = mvs.u, s = Math.sin(u * Math.PI);
    if (mvs.k === 'leap') { bob += 0.5 * s; hipA = hipB = 0.55 * s; kneeA = kneeB = -1.1 * s; } // up with both feet, knees tucked
    else if (mvs.k === 'heel') { bob += 0.16 * Math.sin(Math.min(1, u * 1.7) * Math.PI); const sp = u < 0.55 ? Math.sin(u / 0.55 * Math.PI) * 0.55 : 0; m.legs[0].rotation.x = -sp; m.legs[1].rotation.x = sp; hipA = hipB = 0; kneeA = kneeB = -0.25 * sp; } // kick out, then click together
    else if (mvs.k === 'pirouette') { hipA = 0; kneeA = 0; hipB = 1.15 * mvE; kneeB = -2.0 * mvE; bob += 0.05 * mvE; } // up on one foot, the other at the knee
  }
  const kk = 1 - Math.exp(-dtSec * 16);
  m.legs[0].rotation.z = lerp(m.legs[0].rotation.z, hipA, kk); m.legs[1].rotation.z = lerp(m.legs[1].rotation.z, hipB, kk);
  if (m.knees) { m.knees[0].rotation.z = lerp(m.knees[0].rotation.z, kneeA, kk); m.knees[1].rotation.z = lerp(m.knees[1].rotation.z, kneeB, kk); }
  if (st.stomp) { bob -= 0.03 * st.stomp; m.legs[1].rotation.z = lerp(m.legs[1].rotation.z, 0.45 * st.stomp, 0.6); if (m.knees) m.knees[1].rotation.z = -0.7 * st.stomp; }
  m.body.position.y = bob;
  if (m.heel >= 3) heelWobble(m, performance.now() / 1000 + (m.k || 1) * 7);
  if (m.skirt) { const fl = 1 + Math.min(0.14, st.spd * 0.06) + (st.hand ? 0.05 : 0); m.skirt.scale.set(fl, m.skirtSY || 1, fl); m.skirt.rotation.y = Math.sin(st.phase) * 0.12 * Math.min(1, st.spd); }
  // honours at the start and end: gents bow, ladies curtsey
  const bw = Math.max(st.bow || 0, st.mv && st.mv.k === 'bow' ? Math.sin(st.mv.u * Math.PI) : 0);
  m.head.rotation.z = -0.5 * bw;
  m.body.rotation.z = st.kind === 'lady' ? -0.06 * bw : -0.2 * bw;
  if (st.kind === 'lady' && bw) { m.body.position.y -= 0.12 * bw; m.legs[1].rotation.x = -0.35 * bw; if (m.knees) m.knees[0].rotation.z = -0.5 * bw; }
  // a little life: head turns towards where they're heading, a slight lean into the travel
  m.head.rotation.y = Math.sin(st.phase * 0.5) * 0.06;
  m.body.rotation.x = 0;
  // arms: index 0 = left (-z), 1 = right (+z); elbows soft, gents' hands near the hip when free
  const want = [{ z: -sw * 0.3 * travel, x: 0.12, e: 0.25 }, { z: sw * 0.3 * travel, x: -0.12, e: 0.25 }];
  if (st.setting >= 0 && !st.clap) { want[0] = { z: 0.05, x: 0.32, e: 0.2 }; want[1] = { z: 0.05, x: -0.32, e: 0.2 }; }
  if (st.hand === 'L' || st.hand === 'B') want[0] = { z: 1.1, x: 0.25, e: 0.35 };
  if (st.hand === 'R' || st.hand === 'B') want[1] = { z: 1.1, x: -0.25, e: 0.35 };
  const aim = (q, i, bend) => {
    const dx = q.x - st.pos.x, dy = q.y - st.pos.y;
    const rel = angDiff(st.face, Math.atan2(dy, dx)), d = Math.max(0.1, Math.hypot(dx, dy) * M3);
    const f = Math.cos(rel) * d, sd = Math.sin(rel) * d, h = q.h != null ? q.h : -0.28, L = Math.hypot(f, h, sd);
    want[i] = { z: Math.asin(clamp(f / L, -1, 1)), x: Math.atan2(-sd / L, -h / L), e: bend };
  };
  if (st.pos && st.aimL) aim(st.aimL, 0, st.clap ? 1.3 : 0.3);
  if (st.pos && st.aimR) aim(st.aimR, 1, st.clap ? 1.3 : 0.3);
  if (st.akimbo === 'L') want[0] = { z: 0.1, x: 0.9, e: 1.6 }; // teapots: the hand that is not joined sits on the hip
  else if (st.akimbo === 'R') want[1] = { z: 0.1, x: -0.9, e: 1.6 };
  if (mvs) {
    const e = mvE, pulse = mvs.k === 'clap' ? clamp(1 - Math.abs(mvs.u - 0.5) * 6, 0, 1) : 0;
    if (mvs.k === 'clap') { const sep = 0.5 * (1 - pulse) + 0.04; want[0] = { z: 2.85 * e, x: sep * e, e: 0.2 }; want[1] = { z: 2.85 * e, x: -sep * e, e: 0.2 }; } // both hands over the head, meeting on the clap
    else if (mvs.k === 'leap') { want[0] = { z: 2.1 * e, x: 0.8 * e, e: 0.2 }; want[1] = { z: 2.1 * e, x: -0.8 * e, e: 0.2 }; }
    else if (mvs.k === 'heel') { want[0] = { z: 0.25, x: 0.8 * e, e: 0.2 }; want[1] = { z: 0.25, x: -0.8 * e, e: 0.2 }; }
    else if (mvs.k === 'pirouette') { want[0] = { z: 2.6 * e, x: 0.35 * e, e: 0.7 }; want[1] = { z: 2.6 * e, x: -0.35 * e, e: 0.7 }; } // arms rounded overhead
  }
  if (sk === 'fling') { want[0] = { z: 2.7, x: 0.35, e: 0.5 }; want[1] = { z: 2.7, x: -0.35, e: 0.5 }; } // hands up over the head
  else if (sk === 'highcut') { want[0] = { z: 1.0, x: 0.7, e: 0.4 }; want[1] = { z: 1.0, x: -0.7, e: 0.4 }; }
  else if (sk === 'heeltoe') { want[0] = { z: 0.1, x: 0.9, e: 1.6 }; want[1] = { z: 0.1, x: -0.9, e: 1.6 }; } // hands on the hips
  if (st.heli) { want[0] = { z: 0, x: 1.5, e: 0.04 }; want[1] = { z: 0, x: -1.5, e: 0.04 }; } // helicopter: arms straight out
  m.arms[0].position.x = m.arms[1].position.x = 0; m.head.position.z = 0; if (m.skirt) m.skirt.position.x = 0; // (the hug moves these)
  if (st.hug) hugPose(m, st, want); // THE HUG: arms round each other, a sway and a little hop
  const k = 1 - Math.exp(-dtSec * 12);
  const stepA = (cur, tgt, kk2) => { const d = angDiff(cur, tgt), mx = 9 * dtSec; return cur + clamp(d * kk2, -mx, mx); };
  m.arms.forEach((a, i) => { a.rotation.z = stepA(a.rotation.z, want[i].z, k); a.rotation.x = stepA(a.rotation.x, want[i].x, k); if (m.elbows) m.elbows[i].rotation.z = lerp(m.elbows[i].rotation.z, want[i].e, k); });
}
function render3D(g, dtSec) {
  const ch = g.ch, t = g.t, r = R3.renderer;
  if (R3.gameRef !== g) build3DGame(g);
  const states = g.lastStates || {};
  Object.keys(ch.tr).forEach(id => {
    const st = states[id] || dancerState(g, id, dtSec); const m = R3.people[id]; if (!m) return;
    m.root.position.set(st.pos.x * M3, 0, st.pos.y * M3);
    const spin = id === 'P' ? 0 : 0;
    m.root.rotation.y = -(st.face + spin);
    posePerson(m, Object.assign({ bow: bowAt(g, t), kind: ch.meta[id].kind }, st), dtSec);
    if (m.label) { const d = Math.hypot(st.pos.x - g.p.x, st.pos.y - g.p.y); m.label.visible = d < 6.5 && d > 1.1; }
  });
  R3.extra.forEach(e => {
    const p = ch.at(e.id, t); const pos = { x: p.x + e.ox, y: p.y + e.oy };
    const last = e.last || pos; const vx = (pos.x - last.x) / Math.max(1e-3, dtSec), vy = (pos.y - last.y) / Math.max(1e-3, dtSec); e.last = pos;
    const spd = Math.min(4, Math.hypot(vx, vy)); e.spd = lerp(e.spd || 0, spd, 0.25); e.phase += (e.spd > 0.15 ? 1 : e.spd / 0.15) * (dtSec / g.barDur) * Math.PI;
    if (e.spd > 0.12) e.face = e.face + angDiff(e.face, Math.atan2(vy, vx)) * (1 - Math.exp(-Math.max(dtSec, realDt) * 14));
    const set = ch.sets.find(s => s.id === e.id && t >= s.b0 && t < s.b1);
    let hand = null, ring = false;
    ch.links.forEach(l => { if (t >= l.b0 && t <= l.b1) { if (l.ring && l.ring.includes(e.id)) ring = true; else if (l.a === e.id || l.b === e.id) hand = l.hand; } });
    e.m.root.position.set(pos.x * M3, 0, pos.y * M3); e.m.root.rotation.y = -e.face;
    posePerson(e.m, { phase: e.phase, spd: e.spd, setting: set ? t - set.b0 : -1, hand, ring, bow: bowAt(g, t), kind: ch.meta[e.id].kind }, dtSec);
  });
  animateCrowd(g, t);
  if (g.hug) hugFx3D(g, dtSec); // hearts over the embrace
  R3.band.forEach((m, i) => { m.body.position.y = Math.abs(Math.sin(t * Math.PI * 2 + i)) * 0.04; m.arms[1].rotation.z = 0.9 + Math.sin(t * Math.PI * 4 + i) * 0.25; m.arms[0].rotation.z = 0.7; });
  // guidance
  const tgt = ch.at('P', t), d = dist(g.p, tgt);
  const col = d <= g.tol ? 0x7fd08a : d < g.tol + 0.35 ? 0xf0b54a : 0xef6a5e;
  R3.ring.material.color.setHex(col); R3.ring.scale.setScalar(g.tol * M3); R3.ring.position.set(tgt.x * M3, 0.02, tgt.y * M3);
  R3.ring.visible = t > -1 && t < g.total;
  const ah = ch.at('P', t + 0.4);
  R3.ahead.position.set(ah.x * M3, 0.5 + Math.sin(performance.now() / 200) * 0.05, ah.y * M3); R3.ahead.rotation.y += dtSec * 2;
  R3.ahead.visible = false;
  R3.trail.forEach((dm, i) => {
    const tt = t + 0.45 + i * 0.15, q = ch.at('P', tt), q2 = ch.at('P', tt + 0.06);
    const moving = dist(q, q2) > 0.004;
    dm.scale.setScalar(1.7); dm.position.set(q.x * M3, 0.016, q.y * M3); dm.rotation.set(-Math.PI / 2, -Math.atan2(q2.y - q.y, q2.x - q.x), 0, 'YXZ');
    dm.material.opacity = 0.8 * (1 - i / 14); dm.visible = R3.ring.visible && moving && !carried(g, t);
  });
  // a see-through you, standing where you should be right now
  if (!R3.ghost || R3.ghostFor !== g) {
    if (R3.ghost) R3.scene.remove(R3.ghost.root);
    R3.ghost = makePerson3D(g.me, g.me.kind, false, true); R3.ghostFor = g;
    R3.ghost.root.traverse(o => { if (o.isMesh) { o.material = new THREE.MeshBasicMaterial({ color: 0xe2b45c, transparent: true, opacity: 0.28, depthWrite: false }); } });
    R3.scene.add(R3.ghost.root);
  }
  const gs = g.lastStates && g.lastStates.P;
  R3.ghost.root.position.set(tgt.x * M3, 0, tgt.y * M3); R3.ghost.root.rotation.y = -(desiredFace(g, 'P', t) ?? g.p.baseYaw ?? 0);
  if (gs) posePerson(R3.ghost, { phase: gs.phase, spd: dist(ch.at('P', t), ch.at('P', t + 0.1)) / 0.1 / g.barDur, setting: -1, pos: tgt, face: 0 }, dtSec);
  R3.ghost.root.visible = R3.ring.visible && d > g.tol * 0.8 && !carried(g, t);
  // your eyes
  const me = g.me; const eye = 1.6 * ((me.height || 1.75) / 1.75);
  const a = g.anim.P; const bob = a ? Math.abs(Math.sin(a.phase)) * 0.03 * Math.min(1, a.spd || 0) : 0;
  const spinT = (performance.now() - g.p.spinT) / 650; const spin = spinT < 1 ? smooth(spinT) * TAU : 0;
  const hopT = (performance.now() - g.p.hop) / 260; const hop = hopT < 1 ? Math.sin(hopT * Math.PI) * 0.12 : 0;
  const su = g.spinU; const suU = su && su.who === 'P' && g.t >= su.t0 && g.t <= su.t1 ? smooth((g.t - su.t0) / (su.t1 - su.t0)) * TAU : 0;
  const yaw = g.p.yaw + spin + suU + ((g.lastStates && g.lastStates.P && g.lastStates.P.heliAdd) || 0) + (g.ball ? ballSway() : 0) + hugYaw(g);
  const cam = R3.camera;
  const me3 = (g.lastStates && g.lastStates.P && g.lastStates.P.pos) || g.p;
  cam.position.set(me3.x * M3 - Math.cos(yaw) * 0.12, eye + bob + hop, me3.y * M3 - Math.sin(yaw) * 0.12);
  if (g.ball) ballCamWobble(cam);
  const facePartner = g.p.gripE || ch.sets.some(s2 => s2.id === 'P' && t >= s2.b0 - 0.6 && t < s2.b1) || t < 0 || ch.links.some(l => !l.ring && (l.a === 'P' || l.b === 'P') && t >= l.b0 - 0.6 && t <= l.b1);
  g.pitch = lerp(g.pitch == null ? -1.3 : g.pitch, facePartner ? -0.08 : -1.2, 1 - Math.exp(-dtSec * 4));
  cam.lookAt(me3.x * M3 + Math.cos(yaw) * 3, eye + g.pitch, me3.y * M3 + Math.sin(yaw) * 3);
  hugCam(g, cam, eye + g.pitch, me3.x * M3 + Math.cos(yaw) * 3, me3.y * M3 + Math.sin(yaw) * 3); // THE HUG: a short wide third-person shot
  r.render(R3.scene, cam);
}

function drawFPOverlay(g) {
  // minimap of the whole set, top right under the score
  const ratio = g.D.view === 'long' ? 1.25 : 1; const top = H < 480 ? 92 : 108;
  const mw = Math.min(190, W * 0.3, (H - top - (document.body.classList.contains('touch') ? 130 : 60)) / ratio), mh = mw * ratio;
  drawScene2D(g, { x: W - mw - 16, y: top, w: mw, h: mh, mini: true }, 0);
  // compass arrow to your spot when you're off it
  const tgt = g.ch.at('P', g.t), d = dist(g.p, tgt);
  if (g.t >= 0 && g.t < g.total && d > g.tol * 0.9) {
    const rel = angDiff(g.p.yaw, Math.atan2(tgt.y - g.p.y, tgt.x - g.p.x));
    const cx = W / 2, cy = H * 0.6;
    ctx.save(); ctx.translate(cx, cy); ctx.rotate(rel);
    ctx.fillStyle = d < g.tol + 0.35 ? 'rgba(240,181,74,.9)' : 'rgba(239,106,94,.92)';
    ctx.beginPath(); ctx.moveTo(46, 0); ctx.lineTo(22, -11); ctx.lineTo(22, 11); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  drawOwnArms(g);
  drawPops(g, W * 0.24, H * 0.42); // to the side, so your partner's face stays clear
  // hooches as text near the middle
  ctx.font = '700 15px Barlow, sans-serif'; ctx.textAlign = 'center';
  g.bubbles = g.bubbles.filter(b => {
    const age = (performance.now() - b.t) / 900; if (age >= 1) return false; if (age < 0 || b.id === 'P') return true;
    const st = g.lastStates && g.lastStates[b.id]; if (!st) return false;
    const v = new THREE.Vector3(st.pos.x * M3, 2.15, st.pos.y * M3).project(R3.camera);
    if (v.z < 1 && Math.abs(v.x) < 1.1) { ctx.globalAlpha = 1 - age * age; ctx.fillStyle = '#f0e8d8'; ctx.fillText(b.text, (v.x + 1) / 2 * W, (1 - v.y) / 2 * H - age * 20); ctx.globalAlpha = 1; }
    return true;
  });
}


// Your own arms reaching into view: towards the hand you're holding, or out to the sides in a circle.
function drawOwnArms(g) {
  const st = g.lastStates && g.lastStates.P; if (!st) return;
  const me = g.me, gent = me.kind === 'gent';
  const sleeve = gent ? '#15181e' : SKIN[me.skin || 0], skin = SKIN[me.skin || 0];
  const targets = [];
  const proj = (q, h) => { const v = new THREE.Vector3(q.x * M3, h, q.y * M3).project(R3.camera); return v.z < 1 ? [(v.x + 1) / 2 * W, (1 - v.y) / 2 * H] : null; };
  const e = g.p.gripE;
  if (e) {
    const q = (g.lastStates[e.with] || {}).pos; const sp = q && proj({ x: (q.x + g.p.x) / 2, y: (q.y + g.p.y) / 2 }, 1.15);
    const side = [];
    if (e.hand === 'R' || e.hand === 'B') side.push(1);
    if (e.hand === 'L' || e.hand === 'B') side.push(-1);
    side.forEach(sd => targets.push({ sd, to: sp ? [clamp(sp[0] + sd * 18, W * 0.28, W * 0.72), clamp(sp[1], H * 0.6, H * 0.82)] : [W / 2 + sd * W * 0.12, H * 0.68] }));
  } else if (st.wp && (st.wp.star || st.wp.waist)) { // the teapots: one hand into the middle, an arm round the waist
    if (st.wp.star) { const sp = proj({ x: 0, y: 0 }, 1.05), sd = st.wp.star === 'R' ? 1 : -1; targets.push({ sd, to: sp ? [clamp(sp[0], W * 0.3, W * 0.7), clamp(sp[1], H * 0.6, H * 0.8)] : [W / 2 + sd * W * 0.12, H * 0.68] }); }
    if (st.wp.waist) { const sd = st.wp.waist === 'R' ? 1 : -1, pid = g.ch.links.length && Object.keys(g.ch.tr).find(i => i !== 'P' && g.lastStates[i] && g.lastStates[i].pos && dist(g.lastStates[i].pos, st.pos) < 0.75), q = pid && g.lastStates[pid].pos, sp = q && proj(q, 0.95); targets.push({ sd, to: sp ? [clamp(sp[0] + sd * 40, W * (sd > 0 ? 0.58 : 0.1), W * (sd > 0 ? 0.92 : 0.42)), clamp(sp[1] + 30, H * 0.64, H * 0.9)] : [W / 2 + sd * W * 0.3, H * 0.8] }); }
  } else if (st.hug && st.hug.e > 0.04) { // THE HUG: both arms reach round your partner
    [1, -1].forEach(sd => targets.push({ sd, to: [W / 2 + sd * lerp(W * 0.3, W * 0.2, st.hug.e), lerp(H + 30, H * 0.8, st.hug.e)] }));
  } else if (st.heli) {
    targets.push({ sd: 1, to: [W * 0.96, H * 0.58] }, { sd: -1, to: [W * 0.04, H * 0.58] });
  } else if (st.ring) {
    targets.push({ sd: 1, to: [W * 0.97, H * 0.7] }, { sd: -1, to: [W * 0.03, H * 0.7] });
  } else if (st.clap) {
    targets.push({ sd: 1, to: [W / 2 + 14, H * 0.74] }, { sd: -1, to: [W / 2 - 14, H * 0.74] });
  }
  targets.forEach(({ sd, to }) => {
    const from = [W / 2 + sd * W * 0.3, H + 30];
    const mid = [(from[0] + to[0]) / 2 + sd * 30, (from[1] + to[1]) / 2 + 20];
    const wdt = Math.max(30, Math.min(W, H) * 0.075);
    ctx.lineCap = 'round';
    ctx.strokeStyle = sleeve; ctx.lineWidth = wdt; ctx.beginPath(); ctx.moveTo(from[0], from[1]); ctx.quadraticCurveTo(mid[0], mid[1], to[0], to[1]); ctx.stroke();
    if (gent) { ctx.strokeStyle = '#f4f1ea'; ctx.lineWidth = wdt * 0.9; ctx.beginPath(); const c = [lerp(mid[0], to[0], 0.82), lerp(mid[1], to[1], 0.82)]; ctx.moveTo(c[0], c[1]); ctx.lineTo(lerp(mid[0], to[0], 0.9), lerp(mid[1], to[1], 0.9)); ctx.stroke(); }
    ctx.fillStyle = skin; ctx.beginPath(); ctx.arc(to[0], to[1], wdt * 0.62, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,.25)'; ctx.beginPath(); ctx.arc(to[0] - wdt * 0.18, to[1] - wdt * 0.2, wdt * 0.22, 0, TAU); ctx.fill();
  });
}
