/* Reel Time · ball-world.js
   The Ball world: walking the hall, the bar, the terrace and the people between dances. */
"use strict";

/* ======================= BALL WORLD: walk the hall between dances =======================
   Between dances you are a person in the same 3D hall (init3D / buildHall3D / R3): first person at eye height, WASD / arrows / drag to look,
   the touch stick on phones. A real bar with the five drinks laid out (aim at one, E or tap to drink it), partners to walk up to and ask,
   the terrace through the double doors (built 300 m away past the far plane and faded to), a dance-card overlay, a countdown to the next
   dance, a Leave-the-ball dialog, a 3D waltz mini-game and a practice waltz. bwBuildWorld() is called from init3D. */
const BW = { on: false, built: false, uid: null, pos: { x: 0, z: 13 }, yaw: -Math.PI / 2, pitch: 0, zone: 'hall', keys: new Set(), timer: 90, timerMax: 90, hold: null, npcs: [], sel: null, phase: 'free', walkPh: 0, confirm: false, cardOpen: false, drinkCd: 0, look: 0, lookY: 0, t: 0, fadeBusy: false, wz3d: false, practised: false, ui: 0, toastUntil: 0, sickT: 0, breathT: 0, hint: 0 };
const BW_Z = 300; // the terrace lives 300 m away
const BW_BAR = { x0: 3.9, x1: 11.5, z: 15.0, top: 1.12 };
const BW_DRINK_X = { water: 5.3, white: 6.45, red: 7.6, beer: 8.75, whisky: 9.9 };
const BW_BLOCK = { // solid rectangles [x0, x1, z0, z1]
  hall: [[3.6, 14, 14.45, 19], [11.9, 14, -13, 12.9], [-14, -11.9, -13, 12.9], [-14.5, -11.7, 15.8, 17.4]],
  out: [[3.2, 5.2, 7.5, 8.4], [-5.2, -3.2, 7.5, 8.4], [5.5, 7.4, 8.5, 9.4], [-7.4, -5.5, 8.5, 9.4], [-1.2, 1.2, 8.5, 9.4], [2.1, 3.1, 0.4, 1.4], [-3.1, -2.1, 0.4, 1.4], [7.6, 9, 3.4, 5.6], [-9, -7.6, 3.4, 5.6]]
};
const BW_SPOTS = [[-9, -8], [-9.8, -4.2], [-8.4, 0.5], [-9.4, 4.5], [-7.4, 9], [9, -8], [9.6, -3.4], [8.6, 1.2], [9.2, 5.6], [7.4, 10.2], [-5.5, -9.5], [5, -9.5]];
const bwTime = s => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

/* ---- the drinks: glass and bottle models, on the bar and in your hand ---- */
function bwDrinkModel(k, glassOnly) {
  const g = new THREE.Group(); g.userData.drink = k;
  const gl = () => new THREE.MeshStandardMaterial({ color: 0xe8f1f5, transparent: true, opacity: 0.3, roughness: 0.05, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
  const liq = (c, o) => new THREE.MeshStandardMaterial({ color: c, transparent: o < 1, opacity: o, roughness: 0.2, emissive: c, emissiveIntensity: 0.14 });
  const add = (geom, m, x, y, z) => { const o = new THREE.Mesh(geom, m); o.position.set(x || 0, y || 0, z || 0); g.add(o); return o; };
  const bottle = (c, x, z, h, lab) => {
    const bm = new THREE.MeshStandardMaterial({ color: c, roughness: 0.15, metalness: 0.1, transparent: true, opacity: 0.93 });
    add(new THREE.CylinderGeometry(0.036, 0.038, h, 14), bm, x, h / 2, z); add(new THREE.CylinderGeometry(0.014, 0.034, 0.05, 14), bm, x, h + 0.025, z); add(new THREE.CylinderGeometry(0.014, 0.014, 0.075, 10), bm, x, h + 0.085, z);
    add(new THREE.CylinderGeometry(0.0155, 0.0155, 0.02, 10), mat(0xc9a24a, { metalness: 0.7, roughness: 0.3 }), x, h + 0.13, z);
    add(new THREE.CylinderGeometry(0.0385, 0.0385, h * 0.4, 14, 1, true), mat(lab, { roughness: 0.8, side: THREE.DoubleSide }), x, h * 0.4, z);
  };
  const wineGlass = (c) => {
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 18), gl(), 0, 0.002, 0); add(new THREE.CylinderGeometry(0.0035, 0.0035, 0.07, 8), gl(), 0, 0.037, 0);
    const bowl = new THREE.LatheGeometry([[0.004, 0.074], [0.02, 0.08], [0.034, 0.1], [0.038, 0.122], [0.034, 0.146], [0.029, 0.158]].map(q => new THREE.Vector2(q[0], q[1])), 20); add(bowl, gl());
    const wl = add(new THREE.LatheGeometry([[0, 0.079], [0.02, 0.083], [0.032, 0.1], [0.0368, 0.118], [0.0358, 0.126], [0, 0.126]].map(q => new THREE.Vector2(q[0], q[1])), 20), liq(c, 0.92)); g.userData.liq = wl;
  };
  if (k === 'water') {
    add(new THREE.CylinderGeometry(0.035, 0.03, 0.12, 18, 1, true), gl(), 0, 0.06, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.006, 18), gl(), 0, 0.003, 0);
    g.userData.liq = add(new THREE.CylinderGeometry(0.0335, 0.0295, 0.095, 18), liq(0xbfe6ff, 0.55), 0, 0.052, 0);
    add(new THREE.BoxGeometry(0.02, 0.02, 0.02), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.6, roughness: 0.1 }), 0.01, 0.1, 0.005).rotation.set(0.4, 0.6, 0.2);
    add(new THREE.CylinderGeometry(0.03, 0.03, 0.004, 14), mat(0xf2e36b, { roughness: 0.6 }), -0.008, 0.108, 0.01).rotation.x = 0.9; // a lemon slice
    if (!glassOnly) {
      add(new THREE.CylinderGeometry(0.052, 0.046, 0.21, 18, 1, true), gl(), 0.12, 0.105, -0.03); add(new THREE.CylinderGeometry(0.0485, 0.0455, 0.13, 18), liq(0xbfe6ff, 0.5), 0.12, 0.07, -0.03);
      const h = add(new THREE.TorusGeometry(0.05, 0.007, 8, 16, Math.PI), gl(), 0.172, 0.12, -0.03); h.rotation.z = -Math.PI / 2;
    }
  } else if (k === 'white') { wineGlass(0xeedf8a); if (!glassOnly) bottle(0x3e6b3a, 0.1, -0.06, 0.2, 0xf1e6c8); }
  else if (k === 'red') { wineGlass(0x701225); if (!glassOnly) bottle(0x1b0d10, 0.1, -0.06, 0.2, 0xd8c9a6); }
  else if (k === 'beer') {
    add(new THREE.CylinderGeometry(0.041, 0.03, 0.17, 18, 1, true), gl(), 0, 0.085, 0); add(new THREE.CylinderGeometry(0.03, 0.03, 0.01, 18), gl(), 0, 0.005, 0);
    g.userData.liq = add(new THREE.CylinderGeometry(0.0395, 0.0295, 0.13, 18), liq(0xd8901a, 0.95), 0, 0.075, 0);
    add(new THREE.CylinderGeometry(0.0405, 0.0396, 0.03, 18), mat(0xf6efd8, { roughness: 0.9 }), 0, 0.155, 0);
    if (!glassOnly) bottle(0x4a2a10, 0.1, -0.05, 0.17, 0xcf3d3a);
  } else { // whisky
    add(new THREE.CylinderGeometry(0.037, 0.033, 0.08, 18, 1, true), gl(), 0, 0.04, 0); add(new THREE.CylinderGeometry(0.033, 0.033, 0.014, 18), gl(), 0, 0.007, 0);
    g.userData.liq = add(new THREE.CylinderGeometry(0.035, 0.032, 0.04, 18), liq(0xb8651b, 0.9), 0, 0.034, 0);
    add(new THREE.BoxGeometry(0.022, 0.022, 0.022), new THREE.MeshStandardMaterial({ color: 0xffffff, transparent: true, opacity: 0.55 }), 0.006, 0.052, 0).rotation.set(0.5, 0.4, 0.3);
    if (!glassOnly) { bottle(0x7a3f12, 0.11, -0.05, 0.22, 0x1f4d3a); add(new THREE.CylinderGeometry(0.0386, 0.0386, 0.05, 14, 1, true), mat(0xcf3d3a, { roughness: 0.8, side: THREE.DoubleSide }), 0.11, 0.1, -0.05); }
  }
  return g;
}
function bwBoardTexture() {
  return canvasTex(1024, 380, (x, w, h) => {
    x.fillStyle = '#16231d'; x.fillRect(0, 0, w, h); x.strokeStyle = '#8a6a3a'; x.lineWidth = 14; x.strokeRect(7, 7, w - 14, h - 14);
    x.textAlign = 'center'; x.fillStyle = '#e2b45c'; x.font = '400 46px "Uncial Antiqua", Georgia, serif'; x.fillText('The Committee Bar', w / 2, 66);
    x.fillStyle = '#a7b6ad'; x.font = '600 23px Barlow, sans-serif'; x.fillText('Free with your ticket. Mind your head, mind your feet.', w / 2, 100);
    Object.values(DRINKS).forEach((d, i) => {
      const y = 152 + i * 42; x.textAlign = 'left'; x.fillStyle = '#f0e8d8'; x.font = '700 30px Barlow, sans-serif'; x.fillText(d.name, 64, y);
      let px = 340; x.font = '600 26px "Barlow Condensed", Barlow, sans-serif';
      [['Water', d.hydr, 1], ['Heat', d.heat, -1], ['Tipsy', d.drunk, -1]].forEach(([n, v, good]) => { if (!v) return; x.fillStyle = v * good > 0 ? '#7fd08a' : '#ef8a7e'; x.fillText(n + ' ' + (v > 0 ? '+' : '−') + Math.abs(v), px, y); px += 180; });
      if (d.courage) { x.fillStyle = '#f0b54a'; x.fillText('Flair x1.5', px, y); }
    });
  });
}

/* ---- building the bar, the terrace and the NPC group (once, from init3D) ---- */
function bwBuildWorld(scene) {
  if (BW.built) return; BW.built = true;
  const { hw, hl, hh } = HALL;
  const G = BW.root = new THREE.Group(); scene.add(G);
  scene.add(R3.camera); // the camera carries the glass you drink from
  const mk = (geom, m, x, y, z, parent) => { const o = new THREE.Mesh(geom, m); o.position.set(x, y, z); (parent || G).add(o); return o; };
  const Bx = (w, h, d, m, x, y, z, p) => mk(new THREE.BoxGeometry(w, h, d), m, x, y, z, p);
  const Cy = (rt, rb, h, m, x, y, z, seg, p) => mk(new THREE.CylinderGeometry(rt, rb, h, seg || 14), m, x, y, z, p);
  const oak = mat(0x4a2c17, { roughness: 0.5 }), oakD = mat(0x2e1a0d, { roughness: 0.45 }), topM = mat(0x5e381b, { roughness: 0.2, metalness: 0.1 });
  const brass = mat(0xc9a24a, { metalness: 0.8, roughness: 0.28 }), glowM = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
  const { x0, x1, z: bz, top: ty } = BW_BAR, len = x1 - x0, cx = (x0 + x1) / 2;
  // the long oak counter: panelled front, polished top, brass edge and foot rail
  Bx(len, ty - 0.06, 0.7, oak, cx, (ty - 0.06) / 2, bz + 0.05);
  for (let i = 0; i < 14; i++) Bx(0.05, ty - 0.3, 0.035, oakD, x0 + 0.25 + i * (len - 0.5) / 13, 0.58, bz - 0.31);
  Bx(len, 0.1, 0.04, oakD, cx, 0.1, bz - 0.31); Bx(len, 0.08, 0.04, oakD, cx, ty - 0.14, bz - 0.31);
  Bx(len + 0.24, 0.07, 0.96, topM, cx, ty - 0.035, bz); Bx(len + 0.24, 0.02, 0.03, brass, cx, ty - 0.03, bz - 0.49);
  Cy(0.028, 0.028, len, brass, cx, 0.2, bz - 0.55, 10).rotation.z = Math.PI / 2;
  for (let i = 0; i < 6; i++) Cy(0.02, 0.02, 0.2, brass, x0 + 0.4 + i * (len - 0.8) / 5, 0.1, bz - 0.55, 8);
  Bx(len - 0.2, 0.006, 0.5, mat(0x0e1a14, { roughness: 0.9 }), cx - 0.4, ty + 0.003, bz - 0.12); // the bar mat the drinks stand on
  // back bar: a low cabinet, shelves of bottles, a mirror, optics on a rail
  Bx(len + 0.3, 1.0, 0.56, oak, cx, 0.5, 17.65); Bx(len + 0.4, 0.06, 0.62, topM, cx, 1.03, 17.65);
  Bx(len + 0.3, 2.4, 0.06, mat(0x9fb0b8, { metalness: 0.9, roughness: 0.12 }), cx, 2.3, 17.95);
  Bx(len + 0.5, 0.1, 0.12, oakD, cx, 3.55, 17.9); [x0 - 0.2, x1 + 0.2].forEach(x => Bx(0.12, 2.6, 0.2, oakD, x, 2.3, 17.85));
  const palette = [0x2f5f3a, 0x6b3a14, 0x1a1012, 0x8a1c1c, 0xc8902e, 0x2c3f6b, 0xdce6dc, 0x4a2a10, 0x7a6a2a].map(c => new THREE.Color(c));
  const rows = [1.5, 2.05, 2.6, 3.15]; let nb = 0; const slots = [];
  rows.forEach((y, ri) => { Bx(len + 0.2, 0.04, 0.34, oakD, cx, y - 0.02, 17.72); for (let x = x0 + 0.1; x < x1 - 0.1; x += 0.2 + ((nb * 7) % 3) * 0.03) { slots.push([x, y, 17.72 + ((nb * 13) % 5 - 2) * 0.01, nb % palette.length, 0.8 + ((nb * 11) % 5) * 0.06]); nb++; } });
  const bm = new THREE.MeshStandardMaterial({ roughness: 0.2, metalness: 0.15 }), bodyI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.036, 0.04, 0.2, 10), bm, slots.length), neckI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.012, 0.03, 0.14, 8), bm, slots.length), d0 = new THREE.Object3D();
  slots.forEach((s, i) => { d0.position.set(s[0], s[1] + 0.1 * s[4], s[2]); d0.scale.set(1, s[4], 1); d0.updateMatrix(); bodyI.setMatrixAt(i, d0.matrix); bodyI.setColorAt(i, palette[s[3]]); d0.position.set(s[0], s[1] + 0.2 * s[4] + 0.06, s[2]); d0.scale.set(1, 1, 1); d0.updateMatrix(); neckI.setMatrixAt(i, d0.matrix); neckI.setColorAt(i, palette[s[3]]); });
  G.add(bodyI); G.add(neckI);
  // optics: inverted bottles on a brass rail, a glass rack, the taps
  Bx(len - 0.6, 0.04, 0.05, brass, cx, 1.42, 17.5);
  for (let i = 0; i < 7; i++) { const x = x0 + 0.5 + i * (len - 1) / 6; Cy(0.034, 0.034, 0.2, mat([0x6b3a14, 0x2f5f3a, 0xdce6dc, 0x7a3f12, 0x1a1012, 0x8a1c1c, 0xc8902e][i], { roughness: 0.2, transparent: true, opacity: 0.9 }), x, 1.28, 17.5, 10); Cy(0.015, 0.015, 0.05, brass, x, 1.15, 17.5, 8); }
  const rackI = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.035, 0.012, 0.07, 10), new THREE.MeshStandardMaterial({ color: 0xe8f1f5, transparent: true, opacity: 0.45, roughness: 0.08 }), 20);
  for (let i = 0; i < 20; i++) { d0.position.set(x0 + 0.5 + i * 0.3, 3.38, 17.8); d0.rotation.set(0, 0, 0); d0.scale.set(1, 1, 1); d0.updateMatrix(); rackI.setMatrixAt(i, d0.matrix); }
  G.add(rackI); Bx(len, 0.02, 0.1, brass, cx, 3.44, 17.8);
  [10.7, 11.0, 11.3].forEach((x, i) => { Cy(0.022, 0.028, 0.34, brass, x, ty + 0.17, bz + 0.1, 12); const hd = Bx(0.035, 0.2, 0.035, mat([0xcf3d3a, 0x1f4d3a, 0xc8902e][i], { roughness: 0.4 }), x, ty + 0.44, bz + 0.1); hd.rotation.x = 0.06; Cy(0.05, 0.05, 0.012, mat([0xcf3d3a, 0x1f4d3a, 0xc8902e][i]), x, ty + 0.4, bz - 0.0, 16).rotation.x = Math.PI / 2; });
  Bx(0.8, 0.02, 0.3, mat(0x2a2d33, { metalness: 0.6, roughness: 0.4 }), 11.0, ty + 0.01, bz - 0.12); // drip tray
  // price and effects board over the bar, pendant lamps, a warm light
  const board = mk(new THREE.PlaneGeometry(4.4, 1.63), new THREE.MeshBasicMaterial({ map: bwBoardTexture(), side: THREE.DoubleSide }), cx - 0.3, 3.6, bz - 0.2); board.rotation.y = Math.PI;
  Bx(4.5, 0.06, 0.06, oakD, cx - 0.3, 4.45, bz - 0.2); [-2.1, 2.1].forEach(dx => Cy(0.012, 0.012, 4.4, brass, cx - 0.3 + dx, 6.6, bz - 0.2, 4));
  [5.6, 7.7, 9.8].forEach(x => { Cy(0.01, 0.01, 5.0, brass, x, 6.3, bz - 0.05, 4); const sh = Cy(0.1, 0.3, 0.28, mat(0x1f4d3a, { roughness: 0.4, side: THREE.DoubleSide }), x, 3.78, bz - 0.05, 18); const bu = mk(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffe2a8 }), x, 3.7, bz - 0.05); const gs = new THREE.Sprite(glowM); gs.scale.set(1.8, 1.8, 1); gs.position.set(x, 3.62, bz - 0.05); G.add(gs); });
  const bl = new THREE.PointLight(0xffc880, 0.8, 9, 2); bl.position.set(cx, 3.0, bz - 0.9); G.add(bl);
  // the drinks laid out on the bar, each with a little name card
  BW.drinks = {};
  Object.keys(BW_DRINK_X).forEach(k => {
    const m = bwDrinkModel(k); m.position.set(BW_DRINK_X[k], ty, bz - 0.12); G.add(m); BW.drinks[k] = m;
    const card = Bx(0.2, 0.002, 0.07, mat(0xf3eee2, { roughness: 0.9 }), BW_DRINK_X[k] - 0.0, ty + 0.002, bz - 0.34); card.rotation.y = 0;
    const lb = labelSprite(DRINKS[k].name, false); lb.position.set(BW_DRINK_X[k], ty + 0.56, bz - 0.12); lb.scale.set(0.4, 0.1, 1); G.add(lb); (BW.dlabels = BW.dlabels || []).push(lb);
  });
  BW.hl = mk(new THREE.TorusGeometry(0.1, 0.008, 8, 28), new THREE.MeshBasicMaterial({ color: 0xffe08a }), 0, ty + 0.012, bz - 0.12); BW.hl.rotation.x = Math.PI / 2; BW.hl.visible = false;
  // stools
  const leather = mat(0x7a1d24, { roughness: 0.5 });
  for (let i = 0; i < 5; i++) { const x = 4.6 + i * 1.6, z = 13.7; Cy(0.2, 0.19, 0.08, leather, x, 0.76, z, 18); Cy(0.025, 0.025, 0.7, brass, x, 0.38, z, 8); Cy(0.19, 0.2, 0.025, mat(0x15171b, { metalness: 0.6, roughness: 0.4 }), x, 0.013, z, 16); const ring = mk(new THREE.TorusGeometry(0.15, 0.01, 6, 18), brass, x, 0.28, z); ring.rotation.x = Math.PI / 2; BW_BLOCK.hall.push([x - 0.25, x + 0.25, z - 0.25, z + 0.25]); }
  // the barman
  const bper = { name: 'Angus', height: 1.8, skin: 1, hair: 7, style: 'short', tartan: Object.keys(TARTANS)[2], jacket: 'waistcoat', kilt: 'classic' };
  const bm0 = BW.barman = makePerson3D(bper, 'gent', true, true); bm0.root.position.set(7.6, 0, 16.5); bm0.root.rotation.y = Math.PI / 2; G.add(bm0.root);
  BW.barman.label.scale.set(1.05, 0.26, 1);
  // a few people at the standing end of the room used to stand where the bar is now: move them
  (R3.crowd || []).forEach(c => { const p = c.root.position; if (p.z > 12.8 && p.x > -2 && !(Math.abs(p.x) > 12)) { if (p.x > 5) { p.x = 13.3; p.z = 14.2 + (p.x % 1.3); } else { p.x = -3.8; p.z = 14.6; } } });

  /* ---- the terrace: a night scene 300 m away ---- */
  const T = BW.terr = new THREE.Group(); T.position.z = BW_Z; scene.add(T);
  const stoneTex = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#6e6c66'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++) { const s = 108 + ((i * 7 + j * 13) % 34); x.fillStyle = `rgb(${s},${s - 2},${s - 9})`; x.fillRect(i * 64 + 2, j * 64 + 2, 60, 60); for (let q = 0; q < 40; q++) { x.fillStyle = `rgba(0,0,0,${0.03 + (q % 5) * 0.012})`; x.fillRect(i * 64 + ((q * 37) % 56) + 2, j * 64 + ((q * 53) % 56) + 2, 3, 2); } } }, [6, 3.2]);
  const stoneM = new THREE.MeshStandardMaterial({ map: stoneTex, roughness: 0.92 }), wallStone = mat(0x77746c, { roughness: 0.95 });
  const TB = (w, h, d, m, x, y, z) => Bx(w, h, d, m, x, y, z, T), TC = (rt, rb, h, m, x, y, z, seg) => Cy(rt, rb, h, m, x, y, z, seg, T);
  TB(18.4, 0.3, 10.2, stoneM, 0, -0.15, 4.8); // flagstones
  const ground = mk(new THREE.PlaneGeometry(500, 400), mat(0x0a1410, { roughness: 1 }), 0, -0.6, 200, T); ground.rotation.x = -Math.PI / 2;
  // the hall's back wall with the lit doorway, windows and steps
  TB(15 - 1.3, 9, 0.7, wallStone, -(15 + 1.3) / 2, 4.5, -0.35); TB(15 - 1.3, 9, 0.7, wallStone, (15 + 1.3) / 2, 4.5, -0.35); TB(2.6, 5.7, 0.7, wallStone, 0, 6.15, -0.35);
  TB(2.9, 0.1, 0.8, oakD, 0, 3.35, -0.3); [-1, 1].forEach(s => TB(0.2, 3.4, 0.74, oakD, s * 1.4, 1.7, -0.3));
  const warm = new THREE.MeshBasicMaterial({ map: canvasTex(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe2a0'); g.addColorStop(1, '#ff9d4a'); x.fillStyle = g; x.fillRect(0, 0, w, h); }) });
  mk(new THREE.PlaneGeometry(2.6, 3.3), warm, 0, 1.65, -0.62, T);
  [-1, 1].forEach(s => { const lf = TB(1.2, 2.9, 0.06, mat(0x5a3a20, { roughness: 0.5 }), s * 1.9, 1.5, 0.55); lf.rotation.y = s * 1.25; lf.position.set(s * 1.5, 1.5, 0.5); });
  const winM = new THREE.MeshBasicMaterial({ map: canvasTex(128, 256, (x, w, h) => { const g = x.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#ffe7b0'); g.addColorStop(1, '#ffbd6a'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#3a2412'; x.fillRect(w / 2 - 3, 0, 6, h); x.fillRect(0, h * 0.3, w, 5); x.fillRect(0, h * 0.62, w, 5); x.fillRect(0, 0, w, 6); x.fillRect(0, h - 6, w, 6); x.fillRect(0, 0, 6, h); x.fillRect(w - 6, 0, 6, h); }) });
  winM.polygonOffset = true; winM.polygonOffsetFactor = -2; winM.polygonOffsetUnits = -2; // the glass used to sit exactly in the wall's front face (z = 0): coplanar, so it z-fought and flickered. Now it is 3 cm proud of the wall with a polygon offset, and a frame covers its edges
  [-11, -7.5, -4.5, 4.5, 7.5, 11].forEach(x => { mk(new THREE.PlaneGeometry(1.4, 3.2), winM, x, 3.6, 0.03, T); TB(1.7, 0.12, 0.3, wallStone, x, 1.95, 0.1); [[1.5, 0.1, 0, 5.22], [1.5, 0.1, 0, 1.98]].forEach(([w, h, dx, y]) => TB(w, h, 0.1, oakD, x + dx, y + 0.05 * (y > 3 ? 0 : 1) + 0.0, 0.06)); [-0.75, 0.75].forEach(dx => TB(0.1, 3.3, 0.1, oakD, x + dx, 3.6, 0.06)); });
  TB(15.5 * 2, 0.5, 1.0, wallStone, 0, 9.2, -0.4); // the eaves
  TB(3.2, 0.14, 0.9, stoneM, 0, 0.07, 0.45); TB(3.6, 0.1, 0.5, stoneM, 0, 0.05, 1.05);
  // warm pools of light from the doorway and windows
  const pool = new THREE.MeshBasicMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 });
  [[0, 2.6, 6, 6], [-7.5, 1.6, 4.5, 3], [7.5, 1.6, 4.5, 3], [-11, 1.4, 3.5, 2.4], [11, 1.4, 3.5, 2.4]].forEach(([x, z, w, d]) => { const p = mk(new THREE.PlaneGeometry(w, d), pool, x, 0.015, z, T); p.rotation.x = -Math.PI / 2; });
  // low wall with piers and lantern caps, side walls
  TB(18, 0.95, 0.5, wallStone, 0, 0.475, 9.75); TB(18.4, 0.1, 0.66, stoneM, 0, 1.0, 9.75);
  [-1, 1].forEach(s => { TB(0.5, 0.95, 9.9, wallStone, s * 9.0, 0.475, 4.8); TB(0.66, 0.1, 9.9, stoneM, s * 9.0, 1.0, 4.8); });
  [-9, -4.5, 0, 4.5, 9].forEach(x => { TB(0.62, 1.25, 0.62, wallStone, x, 0.625, 9.75); TB(0.74, 0.1, 0.74, stoneM, x, 1.3, 9.75); });
  // lamp posts, lanterns, fairy lights
  const iron = mat(0x15171b, { roughness: 0.5, metalness: 0.5 }), lampM = new THREE.MeshBasicMaterial({ color: 0xffd48a });
  const posts = [[-7.6, 1.8], [7.6, 1.8], [-7.6, 7.2], [7.6, 7.2]];
  posts.forEach(([x, z]) => { TC(0.05, 0.07, 2.7, iron, x, 1.35, z, 8); TB(0.3, 0.38, 0.3, lampM, x, 2.85, z); const cap = TC(0.01, 0.24, 0.16, iron, x, 3.12, z, 4); cap.rotation.y = Math.PI / 4; const gs = new THREE.Sprite(glowM); gs.scale.set(3.4, 3.4, 1); gs.position.set(x, 2.85, z); T.add(gs); const pl = mk(new THREE.PlaneGeometry(5, 5), pool, x, 0.02, z, T); pl.rotation.x = -Math.PI / 2; });
  const strings = [[-7.6, 1.8, 7.6, 1.8], [-7.6, 7.2, 7.6, 7.2], [-7.6, 1.8, -7.6, 7.2], [7.6, 1.8, 7.6, 7.2]], nBulb = 26, bulbI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.04, 6, 5), new THREE.MeshBasicMaterial(), strings.length * nBulb), fc = [0xfff1c4, 0xffd98a, 0xffe9b8, 0xffc27a].map(c => new THREE.Color(c));
  let bi = 0; strings.forEach(([ax, az, bx, bz2]) => {
    const pts = []; for (let i = 0; i <= 30; i++) { const u = i / 30; pts.push(new THREE.Vector3(lerp(ax, bx, u), 2.8 - 0.5 * Math.sin(Math.PI * u), lerp(az, bz2, u))); }
    const ln = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineBasicMaterial({ color: 0x1a1a1a })); T.add(ln);
    for (let i = 0; i < nBulb; i++) { const u = (i + 0.5) / nBulb; d0.position.set(lerp(ax, bx, u), 2.8 - 0.5 * Math.sin(Math.PI * u) - 0.05, lerp(az, bz2, u)); d0.rotation.set(0, 0, 0); d0.scale.set(1, 1, 1); d0.updateMatrix(); bulbI.setMatrixAt(bi, d0.matrix); bulbI.setColorAt(bi, fc[bi % fc.length]); if (i % 3 === 0) { const gs = new THREE.Sprite(glowM); gs.scale.set(0.55, 0.55, 1); gs.position.copy(d0.position); T.add(gs); } bi++; }
  }); T.add(bulbI);
  // benches, flowering planters and heather pots
  const wood = mat(0x6b4a2a, { roughness: 0.7 });
  [-4.2, 4.2].forEach(x => { for (let i = 0; i < 4; i++) TB(1.9, 0.04, 0.1, wood, x, 0.46, 7.7 + i * 0.12); for (let i = 0; i < 3; i++) TB(1.9, 0.12, 0.03, wood, x, 0.66 + i * 0.16, 7.52).rotation.x = -0.12; [-0.8, 0.8].forEach(dx => { TB(0.05, 0.46, 0.5, iron, x + dx, 0.23, 7.9); TB(0.05, 0.5, 0.05, iron, x + dx, 0.7, 7.52); }); });
  const fcol = [0xe05a8a, 0xf4f1ea, 0x8e7cc3, 0xcf3d3a, 0xf0c05a, 0xb48cf0].map(c => new THREE.Color(c));
  const planters = [[-6.4, 9.0, 1.8, 0.5, 0], [6.4, 9.0, 1.8, 0.5, 0], [0, 9.0, 2.2, 0.5, 0], [-8.3, 4.5, 1.8, 0.5, Math.PI / 2], [8.3, 4.5, 1.8, 0.5, Math.PI / 2], [-2.6, 0.9, 0.7, 0.7, 0], [2.6, 0.9, 0.7, 0.7, 0]];
  const flI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.065, 6, 5), new THREE.MeshStandardMaterial({ roughness: 0.7 }), planters.length * 46), grI = new THREE.InstancedMesh(new THREE.SphereGeometry(0.15, 7, 5), mat(0x1f4a2a, { roughness: 0.9 }), planters.length * 14);
  let fi = 0, gi = 0;
  planters.forEach(([x, z, w, d, ry], pi) => {
    const tr = TB(ry ? d : w, 0.5, ry ? w : d, wallStone, x, 0.25, z); TB((ry ? d : w) - 0.1, 0.04, (ry ? w : d) - 0.1, mat(0x2a1c10, { roughness: 1 }), x, 0.5, z);
    for (let i = 0; i < 14; i++) { const u = (i / 13 - 0.5) * (w - 0.3), jx = ((i * 37) % 7 - 3) * 0.03; d0.position.set(ry ? x + jx : x + u, 0.62 + (i % 3) * 0.04, ry ? z + u : z + jx); d0.scale.set(1, 0.8, 1); d0.rotation.set(0, 0, 0); d0.updateMatrix(); grI.setMatrixAt(gi++, d0.matrix); }
    for (let i = 0; i < 46; i++) { const u = (((i * 53) % 100) / 100 - 0.5) * (w - 0.2), v = (((i * 29) % 100) / 100 - 0.5) * (d - 0.1); d0.position.set(ry ? x + v : x + u, 0.72 + ((i * 17) % 10) * 0.016, ry ? z + u : z + v); d0.scale.set(1, 1, 1); d0.updateMatrix(); flI.setMatrixAt(fi, d0.matrix); flI.setColorAt(fi, fcol[(i + pi * 2) % fcol.length]); fi++; }
  });
  T.add(flI); T.add(grI);
  // distant hills, a village, stars and a moon
  const hill = (z, hgt, col, seed) => { const sh = new THREE.Shape(); sh.moveTo(-190, -10); for (let i = 0; i <= 70; i++) { const x = -190 + i * 380 / 70, y = hgt * (0.45 + 0.32 * Math.sin(x * 0.04 + seed) + 0.2 * Math.sin(x * 0.11 + seed * 2.3) + 0.08 * Math.sin(x * 0.29 + seed)); sh.lineTo(x, y); } sh.lineTo(190, -10); sh.closePath(); const o = new THREE.Mesh(new THREE.ShapeGeometry(sh), new THREE.MeshBasicMaterial({ color: col, fog: false })); o.position.set(0, -1.5, z); T.add(o); };
  hill(95, 28, 0x101f38, 1.3); hill(125, 38, 0x0b1730, 4.1); hill(160, 50, 0x08122a, 6.7);
  const vg = new THREE.BufferGeometry(), vp = []; for (let i = 0; i < 26; i++) vp.push(-70 + ((i * 53) % 140), -0.5 + ((i * 7) % 5) * 0.4, 60 + ((i * 29) % 40)); vg.setAttribute('position', new THREE.Float32BufferAttribute(vp, 3));
  T.add(new THREE.Points(vg, new THREE.PointsMaterial({ color: 0xffd98a, size: 3, sizeAttenuation: false, fog: false })));
  const sg = new THREE.BufferGeometry(), sp = []; let sd = 17; const rnd = () => (sd = (sd * 16807) % 2147483647) / 2147483647; for (let i = 0; i < 700; i++) { const a = rnd() * TAU, e = 0.12 + rnd() * 1.35, r = 220; sp.push(Math.cos(a) * Math.cos(e) * r, Math.sin(e) * r * 0.9 + 6, 40 + Math.sin(a) * Math.cos(e) * r); }
  sg.setAttribute('position', new THREE.Float32BufferAttribute(sp, 3)); T.add(new THREE.Points(sg, new THREE.PointsMaterial({ color: 0xffffff, size: 2.1, sizeAttenuation: false, fog: false, transparent: true, opacity: 0.9 })));
  const moonTex = canvasTex(256, 256, (x, w, h) => { const g = x.createRadialGradient(128, 128, 20, 128, 128, 128); g.addColorStop(0, 'rgba(255,250,225,.55)'); g.addColorStop(0.3, 'rgba(210,225,255,.18)'); g.addColorStop(1, 'rgba(200,215,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h); x.fillStyle = '#f6f1d6'; x.beginPath(); x.arc(128, 128, 36, 0, TAU); x.fill(); x.fillStyle = 'rgba(160,150,120,.35)'; [[118, 120, 8], [140, 134, 6], [126, 142, 5], [138, 112, 4]].forEach(([a, b, r]) => { x.beginPath(); x.arc(a, b, r, 0, TAU); x.fill(); }); });
  const moon = new THREE.Sprite(new THREE.SpriteMaterial({ map: moonTex, fog: false, transparent: true, depthWrite: false })); moon.scale.set(60, 60, 1); moon.position.set(-42, 78, 150); T.add(moon);
  // mist drifting over the terrace
  const mistTex = canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(190,205,235,.55)'); g.addColorStop(1, 'rgba(190,205,235,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); });
  BW.mist = []; for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: mistTex, transparent: true, opacity: 0.2, depthWrite: false })); s.scale.set(7 + (i % 3) * 2, 2.2, 1); s.position.set(-9 + i * 2.3, 0.7 + (i % 3) * 0.25, 1 + (i * 3.1) % 10); s.userData.sp = 0.12 + (i % 4) * 0.05; T.add(s); BW.mist.push(s); }
  // breath puffs in the cold
  const puffTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(235,242,255,.8)'); g.addColorStop(1, 'rgba(235,242,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  BW.puffs = []; for (let i = 0; i < 5; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: puffTex, transparent: true, opacity: 0, depthWrite: false })); s.visible = false; s.userData.t = 9; scene.add(s); BW.puffs.push(s); }
  BW.hearts = null;
  try { bwBuildTerraceLife(scene, T); } catch (e) { console.warn('terrace life failed', e); }
}

/* ---- terrace life: fire pits with real flames and light, groups chatting and smoking, leaners and sitters ---- */
const BW_PITS = [{ x: -5.2, z: 3.0, kind: 'brazier' }, { x: 5.2, z: 3.0, kind: 'brazier' }, { x: 0, z: 5.9, kind: 'ring' }];
const BW_TLINES = {
  Alasdair: ['Terrible draught in there, mind the whisky!', 'Never trust a man who says he can dance a reel sober.', 'The pipe keeps the midges off. Mostly.'],
  Morag: ['That waltz had my feet in knots. You looked splendid, mind.', 'Hamish says three is company. Hamish says a lot of things.', 'I only came out to cool down. And for the gossip.'],
  Hamish: ['The Dashing White Sergeant? Three is company and a fine excuse to hold hands.', 'Mind the ice on the steps. And the committee.', 'If I stand here long enough they might forget my turn.'],
  Catriona: ['Lovely night for it. Shame about the draught from that door.', 'He swears the band is playing it faster this year.'],
  Duncan: ['Just the one, to keep the cold out. Och, the second keeps it out better.', 'You look like you can dance. Go on, back in with you!'],
  Eilidh: ['Come and warm your hands, the brazier is a gem.', 'My shoes have given up. My feet have not.'],
  Lachlan: ['I am told the fire is for the ladies. I am standing here regardless.', 'Fine stars. Fine whisky. Fine company, now you are here.'],
  Fiona: ['Sit a minute. The band will manage without us.', 'Is that tartan new? It suits you.'],
  Torquil: ['Leaning on a wall is the best step I know.', 'Frost by midnight, they say. Keep moving or keep near the fire.'],
  Sheena: ['I have been rehearsing this view all evening.', 'Do not tell the sergeant major I came out for air.'],
  Murdo: ['Have a seat. Nobody is counting.', 'My wife says I dance like a man ironing a tent.'],
  Ishbel: ['I am saving this bench for whoever has the best stories.', 'The cold is awful. The company makes up for it.']
};
function bwArmTo(m, i, tx, ty, tz, w) { // swing arm i so the palm reaches a point given in the person's root frame (x forward, y up, z right): LM inverse kinematics, bones set directly
  const al = m.body.rotation.z, ca = Math.cos(al), sa = Math.sin(al), by = m.lifter.position.y + m.body.position.y, k = m.k, sd = i ? 1 : -1, Sh = m.arms[i].position;
  const yy = ty - by, T = [(tx * ca + yy * sa) / k, (-tx * sa + yy * ca) / k, tz / k];
  m._aq = m._aq || [[0.8, -1.2, 1.0], [0.8, 1.2, 1.0]]; if (!m._aq[i]) m._aq[i] = [0.8, i ? 1.2 : -1.2, 1.0];
  const q = hugIK(m._aq[i], [T[0] - Sh.x, T[1] - Sh.y, T[2] - Sh.z], [0.1, -0.2, sd * 0.1]), a = m.arms[i], e = m.elbows[i];
  a.rotation.z = lerp(a.rotation.z, q[0], w); a.rotation.x = lerp(a.rotation.x, q[1], w); e.rotation.z = lerp(e.rotation.z, q[2], w);
}
function bwBuildTerraceLife(scene, T) {
  const add = (geom, m, x, y, z, p) => { const o = new THREE.Mesh(geom, m); o.position.set(x, y, z); (p || T).add(o); return o; };
  const iron = mat(0x1b1d22, { roughness: 0.55, metalness: 0.6 }), stone = mat(0x77746c, { roughness: 0.95 }), wood = mat(0x6b4a2a, { roughness: 0.7 }), logM = mat(0x3a2412, { roughness: 0.9 });
  const coalM = new THREE.MeshBasicMaterial({ color: 0xff5a18 }), coalD = mat(0x120c08, { roughness: 1 });
  const flameTex = canvasTex(64, 128, (x, w, h) => { const g = x.createLinearGradient(0, 124, 0, 4); g.addColorStop(0, 'rgba(255,240,170,1)'); g.addColorStop(0.3, 'rgba(255,170,50,.95)'); g.addColorStop(0.7, 'rgba(255,80,10,.55)'); g.addColorStop(1, 'rgba(200,30,0,0)'); x.fillStyle = g; x.beginPath(); x.moveTo(32, 3); x.bezierCurveTo(40, 40, 62, 62, 56, 96); x.bezierCurveTo(52, 120, 12, 120, 8, 96); x.bezierCurveTo(2, 62, 24, 40, 32, 3); x.fill(); });
  const smokeTex = canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(220,226,235,.55)'); g.addColorStop(1, 'rgba(220,226,235,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
  const glow = new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 });
  BW.smokeTex = smokeTex; BW.pits = []; BW.pitLights = [];
  const bench = (x, z, ry) => { const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry; T.add(g); for (let i = 0; i < 4; i++) add(new THREE.BoxGeometry(1.7, 0.04, 0.1), wood, 0, 0.46, -0.18 + i * 0.12, g); for (let i = 0; i < 3; i++) { const b = add(new THREE.BoxGeometry(1.7, 0.1, 0.03), wood, 0, 0.66 + i * 0.14, -0.3, g); b.rotation.x = -0.1; } [-0.7, 0.7].forEach(dx => { add(new THREE.BoxGeometry(0.05, 0.46, 0.5), iron, dx, 0.23, 0, g); add(new THREE.BoxGeometry(0.05, 0.6, 0.05), iron, dx, 0.62, -0.3, g); }); return g; };
  // two iron braziers and a stone fire ring, benches round them
  BW_PITS.forEach((pt, pi) => {
    const x = pt.x, z = pt.z; let by;
    if (pt.kind === 'brazier') {
      add(new THREE.CylinderGeometry(0.46, 0.3, 0.3, 22), iron, x, 0.8, z); add(new THREE.TorusGeometry(0.46, 0.028, 8, 28), iron, x, 0.95, z).rotation.x = Math.PI / 2;
      add(new THREE.CircleGeometry(0.44, 22), coalD, x, 0.945, z).rotation.x = -Math.PI / 2; add(new THREE.CircleGeometry(0.34, 18), coalM, x, 0.95, z).rotation.x = -Math.PI / 2;
      for (let i = 0; i < 3; i++) { const a = i / 3 * TAU + 0.5; const l = add(new THREE.CylinderGeometry(0.025, 0.03, 0.72, 8), iron, x + Math.cos(a) * 0.36, 0.36, z + Math.sin(a) * 0.36); l.rotation.set(Math.sin(a) * 0.12, 0, -Math.cos(a) * 0.12); }
      add(new THREE.TorusGeometry(0.34, 0.016, 6, 20), iron, x, 0.3, z).rotation.x = Math.PI / 2; by = 0.97;
      bench(x + (pi ? 1.6 : -1.6), z, pi ? -Math.PI / 2 : Math.PI / 2); bench(x, z + 1.7, Math.PI);
      BW_BLOCK.out.push([x - 0.5, x + 0.5, z - 0.5, z + 0.5], [x + (pi ? 1.6 : -1.6) - 0.35, x + (pi ? 1.6 : -1.6) + 0.35, z - 0.9, z + 0.9], [x - 0.9, x + 0.9, z + 1.45, z + 1.95]);
    } else {
      for (let i = 0; i < 12; i++) { const a = i / 12 * TAU; const s = add(new THREE.BoxGeometry(0.3, 0.22, 0.2), stone, x + Math.cos(a) * 0.62, 0.11, z + Math.sin(a) * 0.62); s.rotation.y = -a; }
      add(new THREE.CircleGeometry(0.58, 20), coalD, x, 0.07, z).rotation.x = -Math.PI / 2; add(new THREE.CircleGeometry(0.4, 16), coalM, x, 0.08, z).rotation.x = -Math.PI / 2;
      for (let i = 0; i < 3; i++) { const l = add(new THREE.CylinderGeometry(0.05, 0.055, 0.7, 8), logM, x, 0.16, z); l.rotation.set(0, i * 1.05, Math.PI / 2); }
      by = 0.2; bench(x - 1.7, z, Math.PI / 2); bench(x + 1.7, z, -Math.PI / 2);
      BW_BLOCK.out.push([x - 0.75, x + 0.75, z - 0.75, z + 0.75], [x - 2.05, x - 1.35, z - 0.9, z + 0.9], [x + 1.35, x + 2.05, z - 0.9, z + 0.9]);
    }
    const P = { x, z, by, fl: [], em: [], t: pi * 1.7 };
    for (let i = 0; i < 8; i++) { const inner = i >= 5, sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flameTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.8, color: inner ? 0xffe9a0 : 0xff9a3a })); const a = Math.random() * TAU, r = (inner ? 0.05 : 0.14) * (0.4 + Math.random()); sp.userData = { ox: Math.cos(a) * r, oz: Math.sin(a) * r, ph: Math.random() * 9, sp: 3 + Math.random() * 3, w: inner ? 0.26 : 0.4, h: inner ? 0.62 : 0.95 }; sp.position.set(x, by + 0.3, z); T.add(sp); P.fl.push(sp); }
    for (let i = 0; i < 10; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0, color: 0xffb060 })); sp.userData = { t: Math.random() * 3, life: 1.6 + Math.random() * 1.6, ox: (Math.random() - 0.5) * 0.4, oz: (Math.random() - 0.5) * 0.4, dx: (Math.random() - 0.5) * 0.25, dz: (Math.random() - 0.5) * 0.25 }; T.add(sp); P.em.push(sp); }
    const gl = new THREE.Sprite(glow.clone()); gl.scale.set(3.4, 3.4, 1); gl.position.set(x, by + 0.55, z); T.add(gl); P.gl = gl;
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(6, 6), new THREE.MeshBasicMaterial({ map: glowTexture(), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.5, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 })); pool.rotation.x = -Math.PI / 2; pool.position.set(x, 0.03, z); T.add(pool); P.pool = pool;
    const L = new THREE.PointLight(0xff8a3a, 0.9, 10, 2); L.position.set(x, by + 0.8, z); L.visible = false; T.add(L); P.light = L; BW.pitLights.push(L);
    BW.pits.push(P);
  });
  // smoke particles (shared pool)
  BW.smoke = []; for (let i = 0; i < 48; i++) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: smokeTex, transparent: true, depthWrite: false, opacity: 0, color: 0xd5dbe6 })); sp.visible = false; sp.userData = { t: 9, life: 1 }; T.add(sp); BW.smoke.push(sp); } BW.smokeI = 0;
  // the people: groups chatting, leaners, sitters, warmers
  BW.tn = []; BW.tg = [];
  const mkN = (name, kind, x, z, face, role, o) => {
    const per = ballGuest(name, kind), m = makePerson3D(per, kind, true, true); m.root.position.set(x, 0, z); m.root.rotation.y = -face; T.add(m.root);
    const n = Object.assign({ name, kind, m, x, z, face, role, ph: Math.random() * 9, gk: 0, lk: 0, sm: null, chatted: false, look: 0 }, o || {}); BW.tn.push(n); return n;
  };
  const group = (list, cx, cz) => { const g = { n: list, cx, cz, spk: 0, t: 3 + Math.random() * 3 }; list.forEach(n => n.grp = g); BW.tg.push(g); return g; };
  const ring = (cx, cz, n, r, a0) => Array.from({ length: n }, (_, i) => { const a = a0 + i / n * TAU; return [cx + Math.cos(a) * r, cz + Math.sin(a) * r]; });
  { const p = ring(-2.4, 3.9, 3, 0.8, 0.4), L = [mkN('Alasdair', 'gent', p[0][0], p[0][1], 0, 'chat', { sm: 'pipe' }), mkN('Morag', 'lady', p[1][0], p[1][1], 0, 'chat'), mkN('Hamish', 'gent', p[2][0], p[2][1], 0, 'chat')]; group(L, -2.4, 3.9); }
  { const p = ring(2.9, 4.2, 2, 0.62, 0.2), L = [mkN('Duncan', 'gent', p[0][0], p[0][1], 0, 'chat', { sm: 'cig' }), mkN('Catriona', 'lady', p[1][0], p[1][1], 0, 'chat')]; group(L, 2.9, 4.2); }
  mkN('Torquil', 'gent', -3.4, 8.85, Math.PI / 2, 'lean', { sm: 'cig' }); mkN('Sheena', 'lady', 3.1, 8.85, Math.PI / 2, 'lean');
  mkN('Fiona', 'lady', -4.2, 7.92, Math.PI / 2, 'sit'); mkN('Murdo', 'gent', 3.85, 7.92, Math.PI / 2, 'sit', { sm: 'pipe' }); mkN('Ishbel', 'lady', 4.65, 7.92, Math.PI / 2, 'sit');
  mkN('Eilidh', 'lady', -5.2, 4.05, -Math.PI / 2, 'warm'); mkN('Lachlan', 'gent', 6.92, 3.0, Math.PI, 'sitw');
  BW.tn.forEach(n => { const m = n.m; if (m.label) { m.label.visible = false; n.lbw = m.label.scale.x; } });
  // cigarettes, pipes, embers
  BW.tn.forEach(n => {
    if (!n.sm) return; const m = n.m, ember = new THREE.Sprite(glow.clone()); ember.material.color.setHex(0xff7a30); ember.material.opacity = 0.9; n.ember = ember;
    if (n.sm === 'cig') { const cg = new THREE.Group(), body = add(new THREE.CylinderGeometry(0.007, 0.007, 0.12, 6), mat(0xf4f1ea, { roughness: 0.8 }), 0, 0, 0, cg), tip = add(new THREE.CylinderGeometry(0.0072, 0.0072, 0.024, 6), mat(0xc9783a, { roughness: 0.8 }), 0, -0.07, 0, cg); cg.position.set(0.012, -0.345, 0); cg.rotation.z = 0.15; m.elbows[1].add(cg); ember.scale.set(0.045, 0.045, 1); ember.position.set(0, -0.085, 0); cg.add(ember); n.tipObj = ember; }
    else { const pg = new THREE.Group(); add(new THREE.CylinderGeometry(0.006, 0.006, 0.14, 6), mat(0x1a120c, { roughness: 0.5 }), 0.07, -0.01, 0, pg).rotation.z = Math.PI / 2 - 0.2; const bowl = add(new THREE.CylinderGeometry(0.026, 0.02, 0.05, 10), mat(0x5a3418, { roughness: 0.55 }), 0.15, 0.0, 0, pg); pg.position.set(0.14, -0.082, 0); m.head.add(pg); ember.scale.set(0.05, 0.05, 1); ember.position.set(0.15, 0.03, 0); pg.add(ember); n.tipObj = ember; }
    n.smT = Math.random() * 6; n.smN = 0;
  });
}
function bwFireNear(P) { let d = 99; (BW.pits || []).forEach(q => { d = Math.min(d, Math.hypot(P.x - q.x, P.z - q.z)); }); return d; }
function bwSmokePuff(x, y, z, vx, vy, vz, size, life, op) { const s = BW.smoke[BW.smokeI = (BW.smokeI + 1) % BW.smoke.length], u = s.userData; u.t = 0; u.life = life; u.vx = vx; u.vy = vy; u.vz = vz; u.s0 = size; u.op = op; s.position.set(x, y, z); s.visible = true; }
function bwTerraceStep(dt, now) {
  const P = BW.pos, v = new THREE.Vector3(), Tz = BW_Z;
  BW.tg.forEach(g => { g.t -= dt; if (g.t <= 0) { g.spk = (g.spk + 1 + (Math.random() < 0.4 ? 1 : 0)) % g.n.length; g.t = 3.2 + Math.random() * 3.5; } });
  BW.tn.forEach(n => {
    const m = n.m, dp = Math.hypot(P.x - n.x, P.z - n.z), t = now + n.ph, g = n.grp;
    posePerson(m, { phase: 0, spd: 0, setting: -1, kind: n.kind, bow: 0 }, dt);
    m.body.position.y += Math.sin(t * 1.5) * 0.004; m.body.rotation.z = 0;
    let faceT = n.face, look = 0;
    // arms at rest
    const rest = i => ({ z: 0.12, x: (i ? -1 : 1) * 0.16, e: 0.45 }), pose = [rest(0), rest(1)]; let ik = [null, null];
    if (n.role === 'chat') {
      let cx = g.cx, cz = g.cz; faceT = Math.atan2(cz - n.z, cx - n.x); const spk = g.n[g.spk], isS = spk === n; n.gk = lerp(n.gk, isS ? 1 : 0, 1 - Math.exp(-dt * 4));
      const tgt = isS ? g.n[(g.spk + 1 + Math.floor(t / 3.7)) % g.n.length] : spk; const o = tgt === n ? g.n[(g.spk + 1) % g.n.length] : tgt;
      look = clamp(angDiff(n.face, Math.atan2(o.z - n.z, o.x - n.x)), -0.95, 0.95);
      if (n.gk > 0.02) { const hand = n.sm === 'cig' ? 0 : 1, s1 = Math.sin(t * 2.7), s2 = Math.sin(t * 3.9 + 1); pose[hand] = { z: lerp(0.12, 0.95 + 0.3 * s1, n.gk), x: lerp(pose[hand].x, (hand ? -0.4 : 0.4), n.gk), e: lerp(0.45, 1.15 + 0.3 * s2, n.gk) }; if (!n.sm) pose[1 - hand] = { z: lerp(0.12, 0.55 + 0.15 * s2, n.gk * (Math.sin(t * 0.8) > 0.2 ? 1 : 0)), x: (hand ? 0.3 : -0.3), e: lerp(0.45, 0.9, n.gk) }; m.head.rotation.x = 0.05 * s1 * n.gk; }
      else m.head.rotation.x = 0.07 * Math.sin(t * 1.9) * (isS ? 0 : 1);
    } else if (n.role === 'lean') {
      faceT = n.face; m.body.rotation.z = -0.2; const wz = 0.5; ik = [[0.5, 1.1, -0.17], [0.5, 1.1, 0.17]]; look = Math.sin(t * 0.35) * 0.5; if (n.sm) ik[1] = null;
    } else if (n.role === 'sit' || n.role === 'sitw') {
      m.body.position.y = -0.34; m.legs[0].rotation.z = m.legs[1].rotation.z = 1.42; m.knees[0].rotation.z = m.knees[1].rotation.z = -1.3; m.legs[0].rotation.x = 0.04; m.legs[1].rotation.x = -0.04;
      ik = [[0.36, 0.55, -0.13], [0.36, 0.55, 0.13]]; look = Math.sin(t * 0.3) * 0.6; if (n.sm) ik[1] = null; if (n.role === 'sitw') { ik = [[0.5, 0.68, -0.14], [0.5, 0.68, 0.14]]; }
    } else if (n.role === 'warm') {
      ik = [[0.55, 1.12, -0.16], [0.55, 1.12, 0.16]]; look = 0; m.head.rotation.x = 0.1;
    }
    // smoking: the right hand goes to the mouth now and then (cigarette in the hand, pipe in the teeth)
    if (n.sm) {
      n.smT += dt; const cyc = n.sm === 'cig' ? 8.5 : 11, ph = n.smT % cyc, hold = n.sm === 'cig' ? 1.3 : 1.0, up = smooth(clamp(ph / 0.9, 0, 1)) * (1 - smooth(clamp((ph - 0.9 - hold) / 0.9, 0, 1)));
      n.mouth = up; const hs = m.head.scale.x || 1, mouth = [0.155 * hs, 1.6 - 0.08 * hs, 0.0];
      const dir = [mouth[0] - 0.05, mouth[1] - 1.1, mouth[2] - 0.19]; const dl = Math.hypot(dir[0], dir[1], dir[2]) || 1, tipOff = n.sm === 'cig' ? 0.13 : 0.03;
      const restT = n.role === 'chat' || n.role === 'warm' ? [0.2, 1.12, 0.2] : n.role === 'lean' ? [0.5, 1.1, 0.17] : [0.3, 0.7, 0.16];
      const mt = [mouth[0] - dir[0] / dl * tipOff - 0.01, mouth[1] - dir[1] / dl * tipOff - 0.02, mouth[2] - dir[2] / dl * tipOff + 0.015];
      ik[1] = [lerp(restT[0], mt[0], up), lerp(restT[1], mt[1], up), lerp(restT[2], mt[2], up)];
      if (n.role === 'chat' && n.sm === 'pipe') ik[1] = n.gk > 0.5 ? null : ik[1];
    }
    for (let i = 0; i < 2; i++) { if (ik[i]) bwArmTo(m, i, ik[i][0], ik[i][1], ik[i][2], 1 - Math.exp(-dt * 9)); else { const w = pose[i], k2 = 1 - Math.exp(-dt * 8), a = m.arms[i]; a.rotation.z = lerp(a.rotation.z, w.z, k2); a.rotation.x = lerp(a.rotation.x, w.x, k2); m.elbows[i].rotation.z = lerp(m.elbows[i].rotation.z, w.e, k2); } }
    n.face += angDiff(n.face, faceT) * (1 - Math.exp(-dt * 3)); m.root.rotation.y = -n.face;
    if (dp < 4.5 && n.role !== 'lean') { const a = angDiff(n.face, Math.atan2(P.z - n.z, P.x - n.x)); if (n.look > 0.01 || dp < 3.2) look = clamp(a, -0.9, 0.9); }
    m.head.rotation.y = lerp(m.head.rotation.y, -look * 0.8, 1 - Math.exp(-dt * 6));
    if (n.react) { n.react.t += dt; const u = n.react.t; m.arms[1].rotation.z = 2.3 + Math.sin(u * 12) * 0.25; m.arms[1].rotation.x = -0.3; m.elbows[1].rotation.z = 0.4; m.head.rotation.x = 0.08; if (u > 1.4) n.react = null; }
    // embers and smoke
    if (n.sm && n.tipObj) {
      const ic = n.mouth || 0; n.tipObj.material.opacity = 0.65 + 0.35 * ic + 0.1 * Math.sin(now * 9 + n.ph); const e = n.sm === 'cig' ? 0.045 : 0.05; n.tipObj.scale.setScalar(e * (1 + 0.8 * ic));
      n.tipObj.getWorldPosition(v); const tx = v.x, ty = v.y, tz = v.z - Tz; n.wT = (n.wT || 0) + dt;
      if (n.wT > (n.sm === 'cig' ? 0.22 : 0.3)) { n.wT = 0; bwSmokePuff(tx, ty + 0.02, tz, (Math.random() - 0.5) * 0.06 + 0.04, 0.2 + Math.random() * 0.1, (Math.random() - 0.5) * 0.06, 0.09, 2.8, 0.7); }
      if (n.mouthWas > 0.9 && ic < 0.9 && !n.puffed) { n.puffed = true; m.head.getWorldPosition(v); const cf = Math.cos(-n.face), sf = Math.sin(-n.face); for (let j = 0; j < 4; j++) bwSmokePuff(v.x + Math.cos(n.face) * 0.2, v.y - 0.1, v.z - Tz + Math.sin(n.face) * 0.2, Math.cos(n.face) * (0.2 + 0.1 * j) + (Math.random() - 0.5) * 0.08, 0.12 + 0.05 * j, Math.sin(n.face) * (0.2 + 0.1 * j) + (Math.random() - 0.5) * 0.08, 0.12 + 0.05 * j, 3.4, 0.55); }
      if (ic < 0.2) n.puffed = false; n.mouthWas = ic;
    }
    if (m.label) { m.label.visible = dp < 6 && dp > 0.9; const k = clamp(dp / 3.2, 1, 2.3); m.label.scale.set((n.lbw || 0.8) * k, (n.lbw || 0.8) * k / 4, 1); }
  });
  BW.smoke.forEach(s => { const u = s.userData; if (u.t >= u.life) { s.visible = false; return; } u.t += dt; const k = u.t / u.life; s.position.x += u.vx * dt; s.position.y += u.vy * dt * (1 - 0.3 * k); s.position.z += u.vz * dt; s.scale.setScalar(u.s0 + k * 0.55); s.material.opacity = (u.op || 0.5) * Math.sin(Math.min(1, k * 1.2) * Math.PI) * (1 - k * 0.3); });
}
function bwFireFx(dt, now, cam) { // flames, embers and light flicker; the crackle gets louder as you come near
  let near = 99;
  BW.pits.forEach((P, pi) => {
    P.t += dt; const d = Math.hypot(BW.pos.x - P.x, BW.pos.z - P.z); near = Math.min(near, d);
    const fk = 0.85 + 0.15 * Math.sin(now * 13 + pi) + 0.1 * Math.sin(now * 31 + pi * 2) + (Math.random() - 0.5) * 0.12;
    P.fl.forEach((s, i) => { const u = s.userData, wob = Math.sin(now * u.sp + u.ph), h2 = u.h * (0.8 + 0.3 * Math.sin(now * u.sp * 1.7 + u.ph * 2)) * fk; s.scale.set(u.w * (0.85 + 0.2 * wob), h2, 1); s.position.set(P.x + u.ox + wob * 0.04, P.by + 0.07 + h2 * 0.5, P.z + u.oz + Math.cos(now * u.sp * 0.8 + u.ph) * 0.04); s.material.opacity = 0.55 + 0.3 * Math.sin(now * u.sp * 2.3 + u.ph); });
    P.em.forEach(s => { const u = s.userData; u.t += dt; if (u.t > u.life) { u.t = 0; u.life = 1.6 + Math.random() * 1.6; u.ox = (Math.random() - 0.5) * 0.4; u.oz = (Math.random() - 0.5) * 0.4; } const k = u.t / u.life; s.position.set(P.x + u.ox + u.dx * u.t + Math.sin(now * 2 + u.life * 5) * 0.05, P.by + 0.3 + k * 1.9, P.z + u.oz + u.dz * u.t); s.scale.setScalar(0.05 + 0.05 * (1 - k)); s.material.opacity = Math.sin(k * Math.PI) * 0.9; });
    P.light.intensity = 0.8 * fk + 0.15; P.gl.material.opacity = 0.28 * fk; P.pool.material.opacity = 0.38 * fk;
  });
  const ctx = band && band.ctx; if (ctx && ctx.state === 'running' && !window.__TS) { BW.crT = (BW.crT || 0) - dt; if (BW.crT <= 0) { BW.crT = 0.05 + Math.random() * 0.3; const vol = clamp(1.6 - near * 0.33, 0, 1) * 0.07; if (vol > 0.004) try { const len = Math.floor(ctx.sampleRate * (0.012 + Math.random() * 0.03)), b = ctx.createBuffer(1, len, ctx.sampleRate), da = b.getChannelData(0); for (let i = 0; i < len; i++) da[i] = (Math.random() * 2 - 1) * (1 - i / len); const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = b; f.type = 'highpass'; f.frequency.value = 1400 + Math.random() * 3000; g.gain.value = vol * (0.4 + Math.random()); s.connect(f); f.connect(g); g.connect(ctx.destination); s.start(); } catch (e) { } } }
}
function bwCoolText() {
  const c = BALL.chill || 0, w = BW.warming, st = w ? '<span class="bxpill warm">Warming up</span>' : c > 65 ? '<span class="bxpill frz">Freezing</span>' : c > 30 ? '<span class="bxpill chl">Chilly</span>' : '';
  return `On the terrace · Heat <b>${Math.round(BALL.heat)}</b> ${w ? '&#9650;' : BALL.heat > 2 ? '&#9660;' : ''} · Cold <b>${Math.round(c)}</b> ${c > 1 || w ? (w ? '&#9660;' : '&#9650;') : ''} · Tipsy ${Math.round(BALL.drunk)} ${st}` + (w ? '<div class="bxsub">By the fire: the cold drains away. Don\'t cook, though.</div>' : c > 30 ? '<div class="bxsub">Shivering. Warm up at a fire pit, or go back inside.</div>' : '');
}
function bwChatNpc(n) {
  if (n.react) return; const L = BW_TLINES[n.name] || ['Lovely night.'], i = (n.lineI = ((n.lineI == null ? -1 : n.lineI) + 1) % L.length);
  n.react = { t: 0 }; let extra = '';
  if (!n.chatted) { n.chatted = true; BALL.pride = bxClamp(BALL.pride + 2); extra = ' <span class="bwdim">(confidence +2)</span>'; }
  bwToast(`<b>${esc(n.name)}:</b> "${esc(L[i])}"${extra}`, 5200); band.blip(520, 0.07, 0.05);
}

/* ---- the people to ask: the ball's pool, standing about the hall with name labels ---- */
function bwNpcLabel(n) {
  const m = n.m; if (m.label) { m.root.remove(m.label); if (m.label.material.map) m.label.material.map.dispose(); m.label.material.dispose(); }
  const txt = n.withMe ? n.p.name + ' (your partner)' : n.declined ? n.p.name + ' (no)' : n.booked && n.hint ? n.p.name + ' (card full)' : n.p.name;
  const sp = labelSprite(txt, n.withMe); sp.position.y = (2.02 + m.lift) * m.k; if (txt.length > 15) sp.scale.set(1.1, 0.275, 1); n.lbw = sp.scale.x; m.root.add(sp); m.label = sp;
}
function bwSpawnNPCs() {
  if (BW.npcRoot) R3.scene.remove(BW.npcRoot);
  BW.npcRoot = new THREE.Group(); R3.scene.add(BW.npcRoot); BW.npcs = [];
  bxShuffle(BALL.pool).slice(0, BW_SPOTS.length).forEach((p, i) => {
    const per = Object.assign({}, p, { height: p.height || (p.kind === 'gent' ? 1.78 : 1.65) });
    const m = makePerson3D(per, p.kind, true, true), [x, z] = BW_SPOTS[i];
    const n = { p, m, x, z, home: { x, z }, face: Math.atan2(-z * 0.4 + (i % 3 - 1) * 2, -x), tx: x, tz: z, wait: 2 + (i * 1.7) % 6, spd: 0, phase: i * 1.3, react: null, booked: false, hint: false, askN: 0, withMe: false, declined: false, slot: 0 };
    m.root.position.set(x, 0, z); BW.npcRoot.add(m.root); BW.npcs.push(n);
  });
  BW.npcs.forEach(bwNpcLabel);
}
function bwNewDance() { // a fresh dance: everyone is free again (a few have their card full), the last dance's partners go back to their friends
  BW.npcs.forEach(n => { n.withMe = false; n.askN = 0; n.declined = false; n.booked = Math.random() < 0.1; n.hint = n.booked && Math.random() < 0.75; n.react = null; bwNpcLabel(n); }); (BW.tn || []).forEach(n => { n.chatted = false; });
}
function bwFree(x, z, from) {
  const R = 0.28;
  if (BW.zone === 'hall') {
    if (x < -13.5 || x > 13.5 || z < -12.6 || z > HALL.hl - 0.4) return false;
    for (const r of BW_BLOCK.hall) if (x > r[0] - R && x < r[1] + R && z > r[2] - R && z < r[3] + R) return false;
    for (const n of BW.npcs) { const d = Math.hypot(n.x - x, n.z - z); if (d < 0.5 && d < Math.hypot(n.x - from.x, n.z - from.z)) return false; }
  } else {
    if (x < -8.3 || x > 8.3 || z < 0.3 || z > 9.0) return false;
    for (const r of BW_BLOCK.out) if (x > r[0] - R && x < r[1] + R && z > r[2] - R && z < r[3] + R) { if (!r.grp) return false; }
    for (const n of (BW.tn || [])) { if (n.role === 'sit' || n.role === 'sitw') continue; const d = Math.hypot(n.x - x, n.z - z); if (d < 0.5 && d < Math.hypot(n.x - from.x, n.z - from.z)) return false; }
  }
  return true;
}
function bwNpcStep(n, dt) {
  const P = BW.pos, e = BALL.card[BALL.idx];
  let tx = n.tx, tz = n.tz, sp = 0.8, stop = 0.15;
  if (n.withMe) {
    const f = [Math.cos(BW.yaw), Math.sin(BW.yaw)], r = [-f[1], f[0]], s = n.slot ? -1 : 1;
    if (BW.zone === 'out') { tx = s * 0.9; tz = HALL.hl - 2.6; } else if (BW.phase === 'lead') { tx = s * 0.75; tz = 0.6; } else { tx = P.x - f[0] * 1.25 + r[0] * 0.95 * s; tz = P.z - f[1] * 1.25 + r[1] * 0.95 * s; }
    sp = Math.min(2.4, 0.9 + Math.hypot(tx - n.x, tz - n.z) * 0.7); stop = 0.3;
    tx = clamp(tx, -13.2, 13.2); tz = clamp(tz, -12.3, HALL.hl - 1.0);
  } else if (n.wait > 0) n.wait -= dt;
  else if (Math.hypot(tx - n.x, tz - n.z) < 0.2) { n.wait = 4 + Math.random() * 9; const a = Math.random() * TAU, rr = Math.random() * 1.5; n.tx = n.home.x + Math.cos(a) * rr; n.tz = n.home.z + Math.sin(a) * rr; n.wait = 5 + Math.random() * 8; }
  const dx = tx - n.x, dz = tz - n.z, d = Math.hypot(dx, dz), go = !n.react && d > stop && (n.withMe || n.wait <= 0 || d > 0.25);
  let v = 0;
  if (go && (n.withMe || Math.hypot(n.tx - n.x, n.tz - n.z) > 0.2 || n.wait <= 0)) { v = Math.min(sp, d / Math.max(dt, 0.016)); const st = Math.min(d, v * dt); n.x += dx / d * st; n.z += dz / d * st; n.face += angDiff(n.face, Math.atan2(dz, dx)) * (1 - Math.exp(-dt * 8)); }
  n.spd = lerp(n.spd, v / 1.15, 0.2);
  // idle: turn to look at you when you are near
  const dpx = P.x - n.x, dpz = P.z - n.z, dp = Math.hypot(dpx, dpz); let look = 0;
  if (BW.zone === 'hall' && dp < 4.5) { const a = angDiff(n.face, Math.atan2(dpz, dpx)); look = clamp(a, -0.9, 0.9); if (!v && dp < 3 && Math.abs(a) > 0.9) n.face += (a - Math.sign(a) * 0.9) * (1 - Math.exp(-dt * 3)); }
  n.phase += dt * (n.spd > 0.1 ? 5.2 : 0);
  const m = n.m;
  posePerson(m, { phase: n.phase, spd: n.spd, setting: -1, kind: n.p.kind, bow: 0 }, dt);
  m.root.position.set(n.x, 0, n.z); m.root.rotation.y = -n.face;
  m.head.rotation.y = -look * 0.8;
  if (!v) m.body.position.y += Math.sin(BW.t * 1.6 + n.home.x) * 0.004;
  if (n.react) { // answers: a hop and a wave for yes, a shake of the head for no
    const r = n.react; r.t += dt; const u = r.t;
    if (r.k === 'yes') { m.body.position.y += 0.08 * Math.abs(Math.sin(u * 7)) * Math.max(0, 1 - u / 1.2); m.arms[1].rotation.z = 2.4 + Math.sin(u * 12) * 0.25; m.arms[1].rotation.x = -0.3; if (m.elbows) m.elbows[1].rotation.z = 0.4; if (u > 1.3) n.react = null; }
    else { m.head.rotation.y = Math.sin(u * 13) * 0.45 * Math.max(0, 1 - u / 1.1); m.head.rotation.x = 0.1; m.arms[0].rotation.z = 0.2; if (u > 1.2) n.react = null; }
  }
  if (m.label) { m.label.visible = dp < 8 && BW.zone === 'hall'; const k = clamp(dp / 3.2, 1, 2.3); m.label.scale.set(n.lbw * k, n.lbw * k / 4, 1); }
}

/* ---- zones: the hall and the terrace ---- */
function bwApplyZone(z) {
  const s = R3.scene; if (!s) return;
  if (!BW.L) { const dls = []; s.children.forEach(o => { if (o.isDirectionalLight) dls.push([o, o.color.getHex(), o.intensity]); }); const hm = s.children.find(o => o.isHemisphereLight); BW.L = { hemi: hm, hc: hm.color.getHex(), hg: hm.groundColor.getHex(), hi: hm.intensity, dls, bg: s.background.getHex(), fog: s.fog.color.getHex(), near: s.fog.near, far: s.fog.far }; }
  const L = BW.L, out = z === 'out';
  s.background.setHex(out ? 0x050a1c : L.bg); s.fog.color.setHex(out ? 0x0c1630 : L.fog); s.fog.near = out ? 4 : L.near; s.fog.far = out ? 38 : L.far;
  L.hemi.color.setHex(out ? 0x6f8fd6 : L.hc); L.hemi.groundColor.setHex(out ? 0x20283c : L.hg); L.hemi.intensity = out ? 0.95 : L.hi;
  L.dls.forEach(([o, c, i], k) => { o.color.setHex(out ? 0x9fb6ff : c); o.intensity = out ? (k ? 0.35 : 0.6) : i; });
  R3.camera.far = out ? 330 : 80; R3.camera.near = out ? 0.25 : 0.15; R3.camera.updateProjectionMatrix(); // a nearer near plane keeps the depth buffer fine enough that nothing near-coplanar flickers
  (BW.pitLights || []).forEach(l => { l.visible = out; }); // the fire pits' lights only exist on the terrace (the hall keeps its shader as it was)
}
function bwSetZone(z) {
  BW.zone = z; bwApplyZone(z);
  if (z === 'out') { BW.pos = { x: 0, z: 1.9 }; BW.yaw = Math.PI / 2; BW.pitch = -0.05; } else { BW.pos = { x: 0, z: HALL.hl - 2.0 }; BW.yaw = -Math.PI / 2; BW.pitch = 0; }
}
function bwFade(op, ms, cb) { const f = $('bwFade'); if (!f) { cb && cb(); return; } f.style.transition = 'opacity ' + ms + 'ms'; f.style.opacity = op; if (cb) setTimeout(cb, ms); }
function bwGoZone(z) {
  if (BW.fadeBusy || BW.phase !== 'free' || BW.zone === z) return; BW.fadeBusy = true;
  bwFade(1, 380, () => { bwSetZone(z); if (z === 'out') bwToast('Out on the terrace. The cold air hits like a glass of water.'); else bwToast('Back inside, warm and loud.'); bwFade(0, 520); BW.fadeBusy = false; });
}

/* ---- entering and leaving the walking world ---- */
function bwEnter(msg, resume) {
  BW.lastF = performance.now(); game = null; keys.clear();
  if (!init3D()) { ballFx(true); showScreen('sBall'); ballRender(); return false; }
  BALL.phase = 'gap'; BALL.view = 'main';
  clear3DPeople(); if (R3.ring) R3.ring.visible = false; if (R3.ahead) R3.ahead.visible = false; if (R3.ghost) R3.ghost.root.visible = false; (R3.trail || []).forEach(d => d.visible = false); (R3.hearts || []).forEach(h => h.visible = false);
  waltzCleanup();
  const fresh = BW.uid !== BALL.uid;
  if (fresh) { BW.uid = BALL.uid; bwSpawnNPCs(); BW.zone = 'hall'; BW.pos = { x: 0, z: 14 }; BW.yaw = -Math.PI / 2; BW.pitch = 0; BW.practised = false; BW.sickT = 0; }
  if (!resume) {
    if (!fresh) { BW.pos = { x: 0, z: 3.2 }; BW.yaw = Math.PI / 2; BW.pitch = 0; }
    BW.timerMax = BW.timer = BALL.idx === 0 ? 110 : 85; bwNewDance();
    BW.msgFirst = msg || '';
  }
  if (BW.zone !== 'hall') bwApplyZone(BW.zone); else bwApplyZone('hall');
  BW.phase = 'free'; BW.hold && bwDropHold(); BW.confirm = false; BW.cardOpen = false; BW.fadeBusy = false; BW.on = true; BW.sel = null;
  BW.npcRoot.visible = true;
  showScreen(null); $('gl').classList.add('on'); $('hud').hidden = true; $('topbtns').hidden = true; $('pauseOv').hidden = true;
  $('bw').hidden = false; $('bwConfirm').hidden = true; $('bwCardPanel').hidden = true; document.body.classList.add('bwon');
  $('tbtns').innerHTML = ''; $('touch').classList.add('play');
  ballHudShow(true);
  bwFade(0, 600);
  const e = BALL.card[BALL.idx];
  if (!resume) bwToast((msg ? msg + ' ' : '') + (e.need === 2 ? 'The Dashing White Sergeant is danced in threes: walk up to TWO partners and ask each to dance.' : e.kind === 'waltz' ? 'A waltz is next. You may want to practise it first.' : 'Walk up to someone and ask them to dance. The bar is at the back on the right.'), 7000);
  bwUI(true);
  return true;
}
function bwHide() {
  const was = BW.on; BW.on = false; BW.phase = 'free'; BW.confirm = false;
  if (BW.hold) bwDropHold();
  ['bw', 'bwConfirm'].forEach(id => { const el = $(id); if (el) el.hidden = true; });
  document.body.classList.remove('bwon'); if (BW.npcRoot) BW.npcRoot.visible = false;
  const tc = $('touch'); if (tc) tc.classList.remove('play');
  BW.puffs && BW.puffs.forEach(p => p.visible = false);
  if (was && R3.ready && BW.zone === 'out') { BW.zone = 'hall'; bwApplyZone('hall'); }
}

/* ---- toasts, prompts, UI ---- */
function bwToast(html, ms) { const t = $('bwToast'); if (!t) return; t.innerHTML = html; t.hidden = false; BW.toastUntil = performance.now() + (ms || 4600); }
const bwChip = (t, c) => `<span class="chip ${c || ''}">${t}</span>`;
function bwDrinkChips(d) { return [d.hydr ? bwChip('Water ' + bxSign(d.hydr), d.hydr > 0 ? 'good' : 'bad') : '', d.heat ? bwChip('Heat ' + bxSign(d.heat), d.heat < 0 ? 'good' : 'bad') : '', d.drunk ? bwChip('Tipsy ' + bxSign(d.drunk), d.drunk < 0 ? 'good' : 'bad') : '', d.pride ? bwChip('Pride +' + d.pride, 'good') : '', d.courage ? bwChip('Flair ×1.5, sloppy feet', 'warn') : ''].join(''); }
function bwHaveCount(e) { return (e.partner ? 1 : 0) + (e.partner2 ? 1 : 0); }
function bwUI(force) {
  const now = performance.now(); if (!force && now - BW.ui < 90) return; BW.ui = now;
  const e = BALL.card[BALL.idx]; if (!e) return;
  const have = bwHaveCount(e), need = e.need || 1, touch = document.body.classList.contains('touch');
  $('bwTime').textContent = bwTime(BW.timer);
  $('bwTbar').style.width = (100 * (1 - BW.timer / BW.timerMax)).toFixed(1) + '%';
  $('bwSub').innerHTML = `No. ${e.n} of ${BALL.card.length}: <b>${esc(e.kind === 'waltz' ? 'Waltz' : e.name)}</b> · ` + (need === 2 ? `needs <b>two partners</b> (${have}/2)` : e.partner ? `partner: <b>${esc(e.partner.name)}</b>` : 'no partner yet') + (BW.zone === 'out' ? ' · on the terrace' : '');
  const fl = $('bwFloor'); fl.innerHTML = (have ? (need === 2 && have < 2 ? 'Take the floor with one' : 'Take the floor') : 'Sit this one out') + (touch ? '' : ' <kbd>F</kbd>'); fl.classList.toggle('brass', have > 0);
  $('bwWalt').hidden = !BALL.card.some(x => x.kind === 'waltz' && x.status === 'pending');
  $('bwWalt').classList.toggle('brass', e.kind === 'waltz' && !BW.practised);
  // aimed-at thing: the prompt and the drink tooltip
  const s = BW.sel, pr = $('bwPrompt'), tip = $('bwTip'), act = touch ? 'Tap' : '<kbd>E</kbd>';
  let ptxt = '';
  tip.hidden = true;
  if (BW.phase === 'lead') ptxt = 'Your partner leads you to the set…';
  else if (BW.hold) ptxt = '';
  else if (s) {
    if (s.type === 'drink') { const d = DRINKS[s.k]; tip.innerHTML = `<b>${d.name}</b><div class="chips">${bwDrinkChips(d)}</div><p>${d.blurb}</p>`; tip.hidden = false; ptxt = `${act} Drink ${d.name.toLowerCase()}`; }
    else if (s.type === 'npc') { const n = s.n; ptxt = n.withMe ? `${esc(n.p.name)} is dancing with you. ${need === 2 && have < 2 ? 'Find your other partner.' : 'They will follow you.'}` : have >= need ? `You already have ${need === 2 ? 'both partners' : 'a partner'} for this dance` : `${act} Ask ${esc(n.p.name)} to dance` + (need === 2 ? ` (${have}/2)` : '') + (n.booked && n.hint ? ' · looks like their card is full' : ''); }
    else if (s.type === 'barman') ptxt = `${act} Chat to Angus, the barman`;
    else if (s.type === 'tnpc') ptxt = `${act} Have a word with ${esc(s.n.name)}` + (s.n.sm ? ' (enjoying a smoke)' : '');
    else if (s.type === 'door') ptxt = BW.zone === 'hall' ? `${act} Step out onto the terrace (cools you down)` : `${act} Back inside to the ball`;
  }
  pr.hidden = !ptxt; pr.innerHTML = ptxt;
  const t = $('bwToast'); if (!t.hidden && now > BW.toastUntil) t.hidden = true;
  // the dance card, if open
  if (BW.cardOpen) { const cp = $('bwCardPanel'); cp.hidden = false; cp.innerHTML = ballCardHTML() + '<div class="menurow" style="margin-top:8px"><button class="btn small ghost" data-bx="card">Close <kbd>Tab</kbd></button></div>'; }
  $('bwHint').hidden = touch; const inb = $('bwIn'); inb.hidden = BW.zone !== 'out'; $('bwCool').hidden = BW.zone !== 'out'; if (BW.zone === 'out') $('bwCool').innerHTML = bwCoolText();
  const cold = $('bwCold'); cold.style.opacity = BW.zone === 'out' ? Math.min(1, 0.3 + (BALL.heat > 30 ? 0.15 : 0) + 0.55 * bxClamp((BALL.chill || 0) / 100, 0, 1)) * (BW.warming ? 0.45 : 1) : 0;
  ballHudUpdate(true);
}
function bwCardToggle() { BW.cardOpen = !BW.cardOpen; $('bwCardPanel').hidden = !BW.cardOpen; bwUI(true); }

/* ---- aim, ask, drink ---- */
function bwEye() { return 1.6 * ((BALL.me.height || 1.75) / 1.75) - 0.04; }
function bwItems() {
  const it = [];
  if (BW.zone === 'hall') {
    if (!BW.hold) Object.keys(BW_DRINK_X).forEach(k => it.push({ type: 'drink', k, x: BW_DRINK_X[k], y: BW_BAR.top + 0.09, z: BW_BAR.z - 0.12, r: 0.12, max: 3.9 }));
    BW.npcs.forEach(n => it.push({ type: 'npc', n, x: n.x, y: 1.3, z: n.z, r: 0.55, max: 3.6 }));
    it.push({ type: 'barman', x: 7.6, y: 1.35, z: 16.5, r: 0.55, max: 5 });
    it.push({ type: 'door', x: 0, y: 1.5, z: HALL.hl - 0.2, r: 1.1, max: 3.6 });
  } else { it.push({ type: 'door', x: 0, y: 1.5, z: 0, r: 1.3, max: 4.5 }); (BW.tn || []).forEach(n => it.push({ type: 'tnpc', n, x: n.x, y: n.role === 'sit' || n.role === 'sitw' ? 1.0 : 1.3, z: n.z, r: 0.55, max: 3.6 })); }
  return it;
}
function bwSelect() {
  const P = BW.pos, ey = bwEye(), cp = Math.cos(BW.pitch), fw = [Math.cos(BW.yaw) * cp, Math.sin(BW.pitch), Math.sin(BW.yaw) * cp];
  let best = null, bs = 9;
  bwItems().forEach(it => {
    const vx = it.x - P.x, vy = it.y - ey, vz = it.z - P.z, d = Math.hypot(vx, vy, vz); if (d > it.max || d < 0.05) return;
    const ang = Math.acos(clamp((vx * fw[0] + vy * fw[1] + vz * fw[2]) / d, -1, 1)), rad = Math.atan2(it.r, d) + 0.03;
    if (ang < rad && ang / rad < bs) { bs = ang / rad; best = it; }
  });
  BW.sel = best;
}
function bwInteract() {
  if (!BW.on || BW.confirm || BW.phase !== 'free' || BW.fadeBusy) return;
  const s = BW.sel; if (!s) { if (BW.zone === 'out') bwGoZone('hall'); return; }
  if (s.type === 'drink') bwPickDrink(s.k);
  else if (s.type === 'npc') bwAskNpc(s.n);
  else if (s.type === 'barman') { const L = ['"Water is free, and so is everything else. The committee is feeling generous."', '"The whisky does a lot for the courage and nothing for the feet."', '"Too much wine and your partners will find a reason to be elsewhere."', '"Step outside if you are boiling. The terrace is perishing, in a good way."', '"The Dashing White Sergeant needs two partners. Ask nicely."']; BW.chat = ((BW.chat || 0) + 1) % L.length; bwToast('Angus: ' + L[BW.chat]); }
  else if (s.type === 'door') bwGoZone(BW.zone === 'hall' ? 'out' : 'hall');
  else if (s.type === 'tnpc') bwChatNpc(s.n);
}
function bwAskNpc(n) {
  const e = BALL.card[BALL.idx], need = e.need || 1, have = bwHaveCount(e);
  if (n.withMe) return bwToast(esc(n.p.name) + ' is already your partner.');
  if (have >= need) return bwToast('You already have ' + (need > 1 ? 'both partners' : 'your partner') + ' for this dance. Press F to take the floor.');
  if (n.react) return;
  BALL.asks++; n.askN++;
  const ch = ballChance({ p: n.p, booked: n.booked }), ok = !n.booked && Math.random() < ch.p;
  if (ok) {
    if (!e.partner) e.partner = n.p; else e.partner2 = n.p;
    n.withMe = true; n.declined = false; n.slot = e.partner === n.p ? 0 : 1; n.react = { k: 'yes', t: 0 }; BALL.pride = bxClamp(BALL.pride + 3);
    const left = need - bwHaveCount(e);
    bwToast(`<b>${esc(n.p.name)}:</b> "${n.askN > 1 ? 'Of course, ask me anything!' : 'Thank you, I would love to.'}"` + (left > 0 ? ` <span class="bwdim">One more partner to find.</span>` : ` <span class="bwdim">Partner found. Press F to take the floor, or wait for the band.</span>`));
    band.blip(660, 0.08, 0.08); setTimeout(() => band.blip(990, 0.1, 0.08), 90);
  } else {
    n.declined = true; n.react = { k: 'no', t: 0 }; BALL.rej++; BALL.pride = bxClamp(BALL.pride - 2);
    const line = n.booked ? '"I am so sorry, I am promised for this one."' : ch.dp >= ch.hp && ch.dp > 0 ? '"You are rather unsteady, dear. Perhaps after a glass of water?"' : ch.hp > 0 ? '"You are awfully warm. Get some air first and ask me again?"' : '"I have a sore ankle just now."';
    bwToast(`<b>${esc(n.p.name)}:</b> ${line} <span class="bwdim">(confidence −2). You can ask someone else straight away.</span>`);
    band.blip(210, 0.18, 0.08);
  }
  bwNpcLabel(n); bwUI(true);
}
function bwPickDrink(k) {
  if (BW.hold || BW.drinkCd > 0 || !DRINKS[k]) return;
  const m = bwDrinkModel(k, true); R3.camera.add(m); m.position.set(0.2, -0.3, -0.5); m.scale.setScalar(1.25);
  m.traverse(o => { if (o.isMesh) o.renderOrder = 30; });
  BW.hold = { k, t: 0, m, applied: false }; BW.drinkCd = 3.2;
  if (BW.drinks[k]) BW.drinks[k].visible = false; // the glass has left the bar (it comes back when you put it down)
}
function bwDropHold() { const h = BW.hold; if (!h) return; R3.camera.remove(h.m); h.m.traverse(o => { if (o.geometry) o.geometry.dispose(); }); if (BW.drinks && BW.drinks[h.k]) BW.drinks[h.k].visible = true; BW.hold = null; }
function bwHoldStep(dt) {
  const h = BW.hold; if (!h) return; h.real = h.real || performance.now(); const rt = (performance.now() - h.real) / 1000; h.t = BW.freezeHold != null ? BW.freezeHold : rt * Math.min(window.__TS || 1, 1); if (rt > 4.5) return bwDropHold(); const t = h.t, m = h.m, ease = smooth;
  const A = [0.2, -0.3, -0.5, 0, 0], B = [0.14, -0.22, -0.4, 0.1, 0], C = [0.0, -0.075, -0.15, 2.0, 0]; // ready, raised to the lips and tipped bottom-up
  let pose;
  if (t < 0.55) pose = A.map((v, i) => lerp(v, B[i], ease(t / 0.55)));
  else if (t < 1.35) pose = B.map((v, i) => lerp(v, C[i], ease((t - 0.55) / 0.8)));
  else if (t < 1.9) pose = C;
  else pose = C.map((v, i) => lerp(v, B[i], ease(clamp((t - 1.9) / 0.6, 0, 1))));
  m.position.set(pose[0], pose[1], pose[2]); m.rotation.x = pose[3];
  const lq = m.userData.liq; if (lq) lq.scale.y = Math.max(0.12, 1 - 0.85 * ease(clamp((t - 1.0) / 0.9, 0, 1)));
  BW.sip = t > 0.55 && t < 2.0 ? ease(clamp((t - 0.55) / 0.8, 0, 1)) * (t < 1.9 ? 1 : 1 - (t - 1.9) / 0.1) : 0;
  if (t > 1.15 && !h.g1) { h.g1 = 1; band.blip(190, 0.09, 0.1); } if (t > 1.4 && !h.g2) { h.g2 = 1; band.blip(150, 0.1, 0.1); } if (t > 1.7 && !h.g3) { h.g3 = 1; band.blip(230, 0.07, 0.08); setTimeout(() => band.blip(420, 0.12, 0.05), 160); }
  if (!h.applied && t > 1.3) {
    h.applied = true; const d = DRINKS[h.k], r = ballDrinkApply(h.k);
    bwToast(`${r.over ? '<b>Too much!</b> ' : ''}${esc(r.msg)}<div class="chips" style="margin-top:4px">${r.over ? bwChip('Sick next dance', 'bad') : bwDrinkChips(d)}</div>`, 5200);
    if (r.over) BW.sickT = 3;
    band.blip(r.over ? 140 : 520, 0.12, 0.06);
  }
  if (t > 2.5) bwDropHold();
}

/* ---- the clock: bell, the walk to the set, the dance ---- */
function bwTakeFloor() {
  if (!BW.on || BW.phase !== 'free' || BW.confirm) return;
  BW.timer = 0;
}
function bwBell() {
  if (BW.phase !== 'free') return; BW.timer = 0;
  const e = BALL.card[BALL.idx];
  if (BW.zone === 'out') { BW.phase = 'bell'; bwFade(1, 350, () => { bwSetZone('hall'); BW.phase = 'free'; bwFade(0, 500); bwBell(); }); return; }
  band.blip(1175, 0.5, 0.1); setTimeout(() => band.blip(1568, 0.7, 0.1), 260);
  if (BALL.sickNext || !e.partner) { bwHide(); showScreen('sBall'); ballGo(); return; } // sick, or nobody to dance with: the old sit-out screen explains
  BW.phase = 'lead'; BW.leadT = 0; BW.cardOpen = false; $('bwCardPanel').hidden = true;
  bwToast('The band strikes up. ' + esc(e.partner.name) + (e.partner2 ? ' and ' + esc(e.partner2.name) : '') + (e.need === 2 && !e.partner2 ? ' (and a guest to make three)' : '') + ' lead' + (e.partner2 ? '' : 's') + ' you to the set.', 3500);
}
function bwLeadStep(dt) {
  BW.leadT += dt; const P = BW.pos, tx = 0, tz = 2.6, dx = tx - P.x, dz = tz - P.z, d = Math.hypot(dx, dz);
  if (d > 0.35) { const st = Math.min(d, Math.max(2.1, d / Math.max(0.6, 3.0 - BW.leadT)) * dt); P.x += dx / d * st; P.z += dz / d * st; BW.walkPh += dt * 7; BW.yaw += angDiff(BW.yaw, Math.atan2(dz, dx)) * (1 - Math.exp(-dt * 3.5)); BW.pitch *= 0.9; }
  else BW.yaw += angDiff(BW.yaw, -Math.PI / 2) * (1 - Math.exp(-dt * 4));
  if ((d <= 0.4 && BW.leadT > 1.5) || BW.leadT > 4) {
    BW.phase = 'fade'; bwFade(1, 420, () => {
      try { bwHide(); ballGo(); } catch (err) { console.error(err); }
      bwFade(0, 700);
    });
  }
}

/* ---- movement, frame ---- */
function bwUpdate(dt) {
  dt = Math.min(dt, 0.1); BW.t += dt;
  const K = BW.keys, P = BW.pos, e = BALL.card[BALL.idx];
  if (BW.drinkCd > 0) BW.drinkCd -= dt;
  if (!BW.confirm) {
    if (BW.phase === 'free' && !BW.fadeBusy) {
      let f = 0, s = 0, turn = 0;
      if (K.has('KeyW') || K.has('ArrowUp')) f++; if (K.has('KeyS') || K.has('ArrowDown')) f--; if (K.has('KeyD')) s++; if (K.has('KeyA')) s--;
      if (K.has('ArrowLeft')) turn--; if (K.has('ArrowRight')) turn++;
      f -= stick.y; s += stick.x;
      BW.yaw += turn * 1.9 * dt + BW.look; BW.pitch = clamp(BW.pitch - BW.lookY, -1.0, 0.75); BW.look = BW.lookY = 0;
      const l = Math.hypot(f, s); if (l > 1) { f /= l; s /= l; }
      const sp = BW.sickT > 0 ? 1.1 : (K.has('ShiftLeft') || K.has('ShiftRight') ? 3.4 : 2.1), cy = Math.cos(BW.yaw), sy = Math.sin(BW.yaw);
      const dx = (cy * f - sy * s) * sp * dt, dz = (sy * f + cy * s) * sp * dt, from = { x: P.x, z: P.z };
      if (bwFree(P.x + dx, P.z, from)) P.x += dx; if (bwFree(P.x, P.z + dz, from)) P.z += dz;
      if (l > 0.05) BW.walkPh += dt * (sp > 3 ? 11 : 7.5) * l;
      // through the doors
      if (BW.zone === 'hall' && Math.abs(P.x) < 1.15 && P.z > HALL.hl - 0.95 && f > 0) bwGoZone('out');
      else if (BW.zone === 'out' && Math.abs(P.x) < 1.4 && P.z < 0.9 && f < 0) bwGoZone('hall');
    } else if (BW.phase === 'lead') bwLeadStep(dt);
    // the clock
    if (!BW.fadeBusy && BW.phase === 'free') { BW.timer -= dt; if (BW.timer <= 0) bwBell(); else if (BW.timer < 9 && Math.ceil(BW.timer) !== BW.lastTick) { BW.lastTick = Math.ceil(BW.timer); if (BW.timer < 5) band.blip(880, 0.05, 0.05); if (BW.timer < 9 && BW.timer > 8) bwToast('The band is tuning up…', 2500); } }
    // the body: the hall is warm, the terrace is perishing
    const out = BW.zone === 'out';
    const fireD = out ? bwFireNear(P) : 99, warm = out && fireD < 2.0; BW.warming = warm;
    if (warm) { BALL.heat = bxClamp(BALL.heat + (BALL.heat < 30 ? 1.8 : -0.9) * dt); BALL.chill = bxClamp((BALL.chill || 0) - 9 * dt); } // by the fire: warms you up to a comfortable 30 and no further, and the cold drains away
    else { BALL.heat = bxClamp(BALL.heat - (out ? 3.6 : 0.3) * dt); BALL.chill = bxClamp((BALL.chill || 0) + (out ? (0.5 + 2.2 * bxClamp((28 - BALL.heat) / 28, 0, 1)) : -4) * dt); } // away from it: cooled down, then chilled to the bone
    if (out && BALL.chill >= 99 && !BW.frozenWarn) { BW.frozenWarn = true; bwToast('<b>Frozen stiff!</b> Warm up at a fire pit or go back inside, or you will dance like a statue.', 5200); } else if (BALL.chill < 80) BW.frozenWarn = false;
    BALL.drunk = bxClamp(BALL.drunk - (out ? 0.55 : 0.07) * dt); BALL.hydr = bxClamp(BALL.hydr - 0.05 * dt);
    if (BW.sickT > 0) BW.sickT -= dt;
  }
  if (BW.hold) bwHoldStep(dt);
  BW.npcs.forEach(n => bwNpcStep(n, dt));
  bwSelect();
  if (BALL.auto) bwAuto(dt);
}
function bwAuto(dt) { // test hook: finds partners and takes the floor on its own
  BW.autoT = (BW.autoT || 0) + dt; if (BW.autoT < 0.8 || BW.phase !== 'free') return;
  const e = BALL.card[BALL.idx];
  if (bwHaveCount(e) < (e.need || 1)) { BW.autoT = 0.4; const n = BW.npcs.find(x => !x.withMe && !x.booked); if (n) { BALL.drunk = Math.min(BALL.drunk, 40); bwAskNpc(n); } return; }
  BW.autoT = 0; bwTakeFloor();
}
function bwFrame(dt) {
  if (BW.wz3d && !BW.on) { waltzRender3D(dt); return; }
  if (!BW.on || !R3.ready) return;
  const nw = performance.now(); let rd = Math.min(0.5, (nw - (BW.lastF || nw)) / 1000) * (window.__TS || 1); BW.lastF = nw; // real elapsed time, whatever the frame rate
  for (let n = 0; rd > 1e-4 && n < 40; n++) { const sdt = Math.min(rd, 0.04); bwUpdate(sdt); rd -= sdt; }
  bwRender(Math.min(0.1, dt)); bwUI();
  ballFx();
}
function bwRender(dt) {
  const cam = R3.camera, out = BW.zone === 'out', P = BW.pos, off = out ? BW_Z : 0, now = performance.now() / 1000;
  const bob = Math.sin(BW.walkPh) * 0.022, sick = BW.sickT > 0 ? Math.sin(now * 3) * 0.04 * Math.min(1, BW.sickT) : 0;
  cam.position.set(P.x, bwEye() + bob + sick, P.z + off);
  ballCamWobble(cam);
  const cs = out ? bxClamp(((BALL.chill || 0) - 30) / 60, 0, 1) : 0; BW.chillK = cs; // shivering: a fast little shake of the camera
  if (cs > 0.02) { cam.position.x += (Math.sin(now * 47) + Math.sin(now * 31 + 1)) * 0.007 * cs; cam.position.y += Math.sin(now * 53 + 2) * 0.011 * cs; }
  const yaw = BW.yaw + ballSway() + (cs > 0.02 ? Math.sin(now * 41) * 0.006 * cs : 0), pit = BW.pitch + (BW.sip || 0) * 0.36 + (cs > 0.02 ? Math.sin(now * 37 + 1) * 0.007 * cs : 0), cp = Math.cos(pit);
  cam.lookAt(cam.position.x + Math.cos(yaw) * cp, cam.position.y + Math.sin(pit), cam.position.z + Math.sin(yaw) * cp);
  // the bar: aimed drink glows, the barman polishes a glass
  const s = BW.sel, hl = BW.hl;
  (BW.dlabels || []).forEach(lb => { const dd = Math.hypot(lb.position.x - cam.position.x, lb.position.z - cam.position.z); lb.visible = !out && dd > 1.4 && dd < 6; lb.scale.set(0.4, 0.1, 1); });
  Object.keys(BW.drinks).forEach(k => { const m = BW.drinks[k], aim = s && s.type === 'drink' && s.k === k, tg = aim ? 1.18 : 1; m.scale.setScalar(lerp(m.scale.x, tg, 0.25)); });
  if (s && s.type === 'drink' && !BW.hold) { hl.visible = true; hl.position.x = BW_DRINK_X[s.k]; hl.scale.setScalar(1 + 0.08 * Math.sin(now * 6)); } else hl.visible = false;
  const bm = BW.barman; if (bm) { bm.arms[0].rotation.z = 1.0 + Math.sin(now * 2.2) * 0.12; bm.arms[1].rotation.z = 0.9 + Math.sin(now * 2.2 + 1) * 0.1; bm.arms[0].rotation.x = 0.4; bm.arms[1].rotation.x = -0.4; if (bm.elbows) { bm.elbows[0].rotation.z = 1.1; bm.elbows[1].rotation.z = 1.2; } bm.head.rotation.y = Math.sin(now * 0.7) * 0.3 + (Math.hypot(P.x - 7.6, P.z - 16.5) < 6 ? clamp(angDiff(-Math.PI / 2, Math.atan2(P.z - 16.5, P.x - 7.6)), -0.8, 0.8) * -0.6 : 0); const bd = Math.hypot(P.x - 7.6, P.z - 16.5); bm.label.visible = !out && bd > 1.8 && bd < 8; const lk = clamp(bd / 3.2, 0.6, 2); bm.label.scale.set(0.8 * lk * 0.7, 0.2 * lk * 0.7, 1); }
  if (out) {
    BW.mist.forEach(m => { m.position.x += m.userData.sp * dt; if (m.position.x > 12) m.position.x = -12; m.material.opacity = 0.3 + 0.1 * Math.sin(now * 0.4 + m.position.z); });
    BW.breathT += dt; // a puff of breath every few seconds
    if (BW.breathT > 2.2 - 1.3 * cs) { BW.breathT = 0; const pf = BW.puffs.find(q => q.userData.t > 2); if (pf) { pf.userData.t = 0; pf.userData.o = { x: cam.position.x + Math.cos(yaw) * 0.45, y: cam.position.y - 0.17, z: cam.position.z + Math.sin(yaw) * 0.45 }; } }
  }
  BW.puffs.forEach(q => { const u = q.userData; if (u.t > 2) { q.visible = false; return; } u.t += dt; const k = u.t / 2; q.visible = out; q.position.set(u.o.x + Math.cos(yaw) * k * 0.7, u.o.y + k * 0.25, u.o.z + Math.sin(yaw) * k * 0.7); q.scale.setScalar((0.18 + k * 0.7) * (1 + 0.9 * (BW.chillK || 0))); q.material.opacity = (0.5 + 0.25 * (BW.chillK || 0)) * (1 - k); });
  if (out && BW.tn) { bwTerraceStep(dt, now); bwFireFx(dt, now, cam); } else if (BW.smoke) BW.smoke.forEach(q => { q.visible = false; });
  R3.renderer.render(R3.scene, cam);
}
function bwTeleport(x, z, yaw, pitch, zone) { if (zone && zone !== BW.zone) { BW.zone = zone; bwApplyZone(zone); } BW.pos = { x, z }; if (yaw != null) BW.yaw = yaw; if (pitch != null) BW.pitch = pitch; BW.timer = Math.max(BW.timer, 60); }
function bwAim(k) { const P = BW.pos, tx = BW_DRINK_X[k], ty = BW_BAR.top + 0.09, tz = BW_BAR.z - 0.12; BW.yaw = Math.atan2(tz - P.z, tx - P.x); BW.pitch = Math.atan2(ty - bwEye(), Math.hypot(tx - P.x, tz - P.z)); }
function bwNpcAhead(i) { const n = BW.npcs[i]; BW.zone === 'hall' || bwSetZone('hall'); n.tx = n.x; n.tz = n.z; n.wait = 99; BW.pos = { x: n.x - Math.cos(n.face) * 1.7, z: n.z - Math.sin(n.face) * 1.7 }; BW.yaw = Math.atan2(n.z - BW.pos.z, n.x - BW.pos.x); BW.pitch = -0.04; BW.timer = Math.max(BW.timer, 60); return n; }

/* ---- leaving the ball ---- */
function ballSummary() {
  const c = BALL.card || [], danced = c.filter(e => e.status === 'danced'), coins = BALL.demo ? 0 : danced.reduce((a, e) => a + (e.coins || 0), 0);
  return { danced: danced.length, total: c.length, coins, score: Math.round(BALL.score || 0) };
}
function ballLeaveAsk() {
  if (!BALL.active || BALL.phase === 'results') return;
  const sm = ballSummary(), inDance = !!(game && game.ball && !game.done);
  BW.confirm = true; BW.keys.clear();
  if (inDance && !game.paused) setPaused(true);
  $('bwConfirm').innerHTML = `<div class="card"><h2>Leave the ball?</h2><p class="note">${inDance ? 'This dance will not count. ' : ''}You keep the shillings from the dances you have finished.</p>
    <div class="results" style="grid-template-columns:repeat(3,1fr)"><div class="stat"><div class="k">Dances done</div><div class="v">${sm.danced} / ${sm.total}</div></div><div class="stat"><div class="k">Shillings kept</div><div class="v">+${sm.coins}</div></div><div class="stat"><div class="k">Ball score</div><div class="v">${sm.score.toLocaleString('en-GB')}</div></div></div>
    ${BALL.demo ? '<p class="note">This is a demo ball, so no shillings are paid.</p>' : ''}
    <div class="menurow"><button class="btn" data-bx="leaveno">Stay at the ball</button><button class="btn ghost" data-bx="leaveyes">Leave the ball</button></div></div>`;
  $('bwConfirm').hidden = false;
}
function ballLeaveCancel() { BW.confirm = false; $('bwConfirm').hidden = true; }
function ballLeaveGo() {
  if (!BALL.active) { $('bwConfirm').hidden = true; return; }
  $('bwConfirm').hidden = true; BW.confirm = false;
  band.stop(); try { speechSynthesis.cancel(); } catch (e) { }
  if (game && game.ball) { game.done = true; game = null; keys.clear(); $('hud').hidden = true; $('topbtns').hidden = true; $('pauseOv').hidden = true; $('touch').classList.remove('play'); }
  if (BALL.w) BALL.w.done = true;
  const e = BALL.card && BALL.card[BALL.idx]; if (e && e.status === 'pending') e.status = 'left';
  BALL.practice = false; BALL.standalone = false;
  ballHudShow(false); ballResults(true);
}
function ballPauseUI() { // the pause menu of a ball dance gets a Leave the ball button (and loses the plain "Leave the floor")
  const on = !!(game && game.ball) && !$('pauseOv').hidden, b = $('bLeaveBall'), q = $('bQuit'); if (b) b.hidden = !on; if (q) q.hidden = !!(game && game.ball);
}

/* ---- the waltz in 3D, and the practice waltz ---- */
function waltzScene3D(on) {
  if (!R3.ready) return;
  if (BW.wp) { BW.wp.forEach(m => R3.scene.remove(m.root)); BW.wp = null; }
  if (!on) return;
  const w = BALL.w, me = BALL.me; if (!w) return;
  BW.wp = [makePerson3D(me, me.kind, false, false), makePerson3D(w.partner, w.partner.kind, false, false)]; BW.wp.forEach(m => R3.scene.add(m.root));
  if (BW.npcRoot) BW.npcRoot.visible = false; if (R3.ring) R3.ring.visible = false; if (R3.ahead) R3.ahead.visible = false; if (R3.ghost) R3.ghost.root.visible = false; (R3.trail || []).forEach(d => d.visible = false); clear3DPeople();
  bwApplyZone('hall'); BW.zone = 'hall';
}
function waltzCleanup() {
  if (BW.wp && R3.ready) { BW.wp.forEach(m => R3.scene.remove(m.root)); }
  BW.wp = null; BW.wz3d = false;
  const sb = $('sBall'); if (sb) sb.classList.remove('bx-clear');
  if (!BW.on && $('gl')) $('gl').classList.remove('on');
}
function waltzRender3D(dt) {
  const w = BALL.w; if (!w || !BW.wp || !R3.ready) return;
  const now = performance.now(), tt = Math.max(w.done ? w.total + (now - (w.doneAt || now)) / 1000 / w.barDur : w.t, -1.5);
  const d = BALL.drunk / 100, ang = tt * Math.PI + Math.sin(now / 900) * d * 0.4, oa = tt * TAU / 10, cx = Math.cos(oa) * 1.6, cz = Math.sin(oa) * 1.6 - 1, rr = 0.3 + Math.sin(now / 430) * d * 0.05;
  const rise = Math.max(0, 1 - (now - (w.stepT || -9e9)) / 240) * 0.05;
  BW.wp.forEach((m, i) => {
    const sg = i ? -1 : 1, x = cx + Math.cos(ang) * rr * sg, z = cz + Math.sin(ang) * rr * sg, face = ang + (i ? 0 : Math.PI);
    m.root.position.set(x, 0, z); m.root.rotation.y = -face;
    posePerson(m, { phase: tt * Math.PI * 3, spd: 0.5, setting: -1, hand: 'B', kind: i ? w.partner.kind : BALL.me.kind, bow: 0 }, dt);
    m.body.position.y += rise + 0.025 * Math.sin(((tt * 3) % 1) * Math.PI);
    m.body.rotation.x = Math.sin(tt * Math.PI) * 0.05 * sg;
  });
  BW.wfeet = { x: cx, z: cz, rx: 1.1 * Math.cos(0.6 + tt * 0.035 + Math.PI / 2), rz: 1.1 * Math.sin(0.6 + tt * 0.035 + Math.PI / 2) };
  const ca = 0.6 + tt * 0.035, cam = R3.camera;
  cam.position.set(cx + Math.cos(ca) * 5.2, 1.7, cz + Math.sin(ca) * 5.2); cam.lookAt(cx, 0.9, cz);
  R3.renderer.render(R3.scene, cam);
}
function waltzPractice(again) {
  const inBall = !!(BALL.active && BALL.card && BALL.card.length > 1 && !BALL.standalone);
  if (!again) {
    if (inBall) { BW.practised = true; bwHide(); BALL.pret = true; }
    else { const auto = BALL.auto; Object.keys(BALL).forEach(k => delete BALL[k]); const me = meP(); Object.assign(BALL, { active: true, auto, standalone: true, me, card: [{ n: 1, kind: 'waltz', name: 'Waltz practice', type: 'Waltz', partner: null, partner2: null, need: 1, status: 'pending', stars: 0, score: 0, coins: 0 }], idx: 0, heat: 0, hydr: 100, drunk: 0, pride: 50, courage: false, sickNext: false, score: 0, rej: 0, asks: 0, overheats: 0, maxDrunk: 0, drinks: 0, outsides: 0, sick: 0, likes: {}, pool: ballPool(me), msg: '', moments: 0, cands: null, w: null, demo: false }); }
  }
  const me = BALL.me, opp = SAVE.roster.filter(r => r.kind !== me.kind);
  BALL.pp = opp.find(r => r.id === SAVE.partner) || (opp.length ? opp[0] : ballPool(me)[0]);
  BALL.practice = true; band.stop(); showScreen('sBall'); ballFx(true);
  ballWaltzStart(true);
}
function waltzPracticeDone(w) {
  w.doneAt = performance.now(); const r = w.score / w.max, stars = r >= 0.8 ? 3 : r >= 0.6 ? 2 : r >= 0.35 ? 1 : 0;
  if (!BALL.demo) { SAVE.bestWaltz = Math.max(SAVE.bestWaltz || 0, w.score); persist(); }
  if (stars) band.applause();
  const el = $('bxRes'); if (!el) return;
  const inBall = !BALL.standalone;
  el.innerHTML = `<div class="card"><h2>${['Not quite in step', 'Finding the rhythm', 'Nicely waltzed', 'You floated!'][stars]}</h2><div class="stars" style="font-size:26px">${[0, 1, 2].map(i => i < stars ? '★' : '<span class="off">★</span>').join('')}</div>
    <div class="results" style="grid-template-columns:repeat(2,1fr)"><div class="stat"><div class="k">Waltz points</div><div class="v">${w.score} / ${w.max}</div></div><div class="stat"><div class="k">Best practice</div><div class="v">${SAVE.bestWaltz || w.score}</div></div><div class="stat"><div class="k">Perfect</div><div class="v">${w.perfect}</div></div><div class="stat"><div class="k">Good / missed</div><div class="v">${w.good} / ${w.miss}</div></div></div>
    <p class="note">${stars >= 2 ? 'Right on the ONE. At the ball the band is faster and the window narrower, but the feel is the same.' : 'Press just as the outer ring meets the gold circle: that is the ONE of each bar. Purple bars are turns, worth double.'}</p>
    <div class="menurow"><button class="btn" data-bx="wagain">Waltz again</button><button class="btn ghost" data-bx="wback">${inBall ? 'Back to the ball' : 'Back to the menu'}</button></div></div>`;
  el.hidden = false;
}
function waltzPracticeBack() {
  waltzCleanup(); if (BALL.w) BALL.w.done = true; band.stop();
  if (BALL.standalone) { ballAbort(); game = null; showScreen('sMenu'); return; }
  BALL.practice = false; BALL.w = null; BALL.phase = 'gap'; BALL.view = 'main'; bwEnter(null, true);
}

/* ---- DOM, CSS and input for the walking world ---- */
function bwInit() {
  const st = document.createElement('style');
  st.textContent = `
body.bwon #ballHud{top:10px;width:158px}
#bw{position:absolute;inset:0;pointer-events:none;font-family:var(--num)}
#bwTop{position:absolute;left:0;right:0;top:0;display:flex;justify-content:center;gap:10px;padding:10px max(16px,env(safe-area-inset-right,0px)) 0 190px;flex-wrap:wrap;align-items:flex-start}
#bwTimer{background:rgba(12,23,20,.86);border:1px solid var(--rule);border-left:3px solid var(--tartan);border-radius:8px;padding:6px 12px;min-width:230px;max-width:420px}
.bwt-main{font-size:17px;letter-spacing:.06em;color:var(--text)}.bwt-main b{color:var(--brass);font-size:24px;font-variant-numeric:tabular-nums}
.bwt-sub{font-family:var(--body,inherit);font-size:13px;color:var(--muted);line-height:1.35;margin-top:1px}.bwt-sub b{color:var(--text)}
.bwt-bar{height:4px;background:#0a1210;border-radius:3px;margin-top:5px;overflow:hidden}.bwt-bar i{display:block;height:100%;background:linear-gradient(90deg,var(--heather),var(--brass))}
#bwBtns{display:flex;gap:6px;flex-wrap:wrap;pointer-events:auto;align-items:flex-start;max-width:min(520px,100%)}
#bwBtns .btn{background:rgba(12,23,20,.86)}#bwBtns .btn.brass{background:var(--brass)}
#bwBtns kbd{font-size:11px;padding:0 4px;margin-left:3px;border:1px solid var(--rule);border-radius:3px;background:#0a1210;color:var(--text)}#bwBtns .brass kbd{background:rgba(0,0,0,.2);color:#1a1408;border-color:rgba(0,0,0,.3)}
#bwCool{position:absolute;left:50%;bottom:30%;transform:translateX(-50%);background:rgba(20,40,70,.82);border:1px solid #8fb4ff;border-radius:999px;padding:7px 18px;font:600 15px var(--body,inherit);color:#dfe9ff;text-align:center}#bwIn.brass{background:var(--brass)!important}
#bwCross{position:absolute;left:50%;top:50%;width:10px;height:10px;margin:-5px 0 0 -5px;border-radius:50%;border:2px solid rgba(255,255,255,.8);box-shadow:0 0 0 1px rgba(0,0,0,.45);opacity:.85}
#bwTip{position:absolute;left:50%;bottom:calc(22% + 44px);transform:translateX(-50%);background:rgba(12,23,20,.92);border:1px solid var(--brass);border-radius:10px;padding:8px 14px;max-width:min(360px,86vw);text-align:center}
#bwTip b{font-family:var(--display);font-weight:400;font-size:20px;color:var(--brass)}#bwTip p{margin:3px 0 0;font:13px/1.35 var(--body,inherit);color:var(--muted)}#bwTip .chips{justify-content:center;margin-top:4px}
#bwPrompt{position:absolute;left:50%;bottom:22%;transform:translateX(-50%);background:rgba(12,23,20,.9);border:1px solid var(--rule);border-radius:999px;padding:6px 16px;font:600 15px var(--body,inherit);color:var(--text);max-width:90vw;text-align:center;white-space:normal}
#bwPrompt kbd,#bwHint kbd{border:1px solid var(--brass);border-radius:4px;padding:0 6px;background:#0a1210;color:var(--brass);font-family:var(--num)}
#bwToast{position:absolute;left:50%;top:142px;transform:translateX(-50%);background:rgba(12,23,20,.93);border-left:3px solid var(--brass);border-radius:8px;padding:9px 14px;font:14px/1.4 var(--body,inherit);max-width:min(560px,90vw)}.bwdim{color:var(--muted)}
#bwHint{position:absolute;left:max(16px,env(safe-area-inset-left,0px));bottom:10px;font:12.5px/1.6 var(--num);color:var(--muted);background:rgba(12,23,20,.6);padding:4px 9px;border-radius:6px}
#bwCardPanel{position:absolute;right:max(12px,env(safe-area-inset-right,0px));top:142px;width:270px;max-height:calc(100% - 150px);overflow:auto;pointer-events:auto}
#bwCold{position:absolute;inset:0;pointer-events:none;opacity:0;transition:opacity 1.2s;background:radial-gradient(ellipse at center,rgba(150,190,255,0) 45%,rgba(120,170,255,.28) 100%)}
#bwAct{display:none;position:absolute;right:max(18px,env(safe-area-inset-right,0px));bottom:max(40px,calc(18px + env(safe-area-inset-bottom,0px)));width:84px;height:84px;border-radius:50%;pointer-events:auto;font-size:20px;letter-spacing:.1em;background:var(--brass);color:#1a1408;border:3px solid #fff;box-shadow:0 0 0 3px rgba(226,180,92,.4)}
body.touch #bwAct{display:block}
#bwFade{position:absolute;inset:0;background:#000;opacity:0;pointer-events:none;z-index:50}
#bwConfirm{z-index:60}
.bx-wfull{position:absolute;inset:0;width:100%;height:100%;touch-action:none;display:block}
.bx-wui{position:absolute;left:0;right:0;bottom:0;padding:0 16px 14px;display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;pointer-events:none}.bx-wui .menurow{pointer-events:auto;justify-content:center;align-items:center}
.bx-wres{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(8,14,12,.55);padding:16px}.bx-wres[hidden]{display:none}
.bx-wres .card{background:var(--panel);border:1px solid var(--rule);border-radius:12px;padding:20px 22px;display:flex;flex-direction:column;gap:12px;max-width:440px;width:100%;text-align:center;align-items:center}.bx-wres h2{margin:0;font-family:var(--display);font-weight:400}
#sBall.bx-clear{background:none!important;overflow:hidden;padding:0}#sBall.bx-clear .wrap{max-width:none;padding:0;height:100%}
@media (max-width:720px){#bwTop{padding-left:12px;padding-right:12px;justify-content:flex-start}#bwTimer{min-width:0;flex:1}#bwToast{top:150px}body.bwon #ballHud{top:auto;bottom:10px;width:130px}#bwCardPanel{top:150px;width:240px}}
`;
  document.head.appendChild(st);
  const stage = $('stage');
  const bw = document.createElement('div'); bw.id = 'bw'; bw.hidden = true;
  bw.innerHTML = `<div id="bwCold"></div><div id="bwTop"><div id="bwTimer"><div class="bwt-main">Next dance in <b id="bwTime">1:30</b></div><div class="bwt-sub" id="bwSub"></div><div class="bwt-bar"><i id="bwTbar"></i></div></div>
    <div id="bwBtns"><button class="btn small ghost" data-bx="card">Dance card <kbd>Tab</kbd></button><button class="btn small ghost" id="bwFloor" data-bx="takefloor">Take the floor <kbd>F</kbd></button><button class="btn small ghost" id="bwWalt" data-bx="wpractice">Practise the waltz</button><button class="btn small ghost" id="bwIn" data-bx="door" hidden>Back inside <kbd>E</kbd></button><button class="btn small ghost" id="bwLeave" data-bx="leave">Leave the ball</button></div></div><div id="bwCool" hidden></div>
    <div id="bwCross"></div><div id="bwTip" hidden></div><div id="bwPrompt" hidden></div><div id="bwToast" hidden></div><div id="bwCardPanel" hidden></div>
    <div id="bwHint"><kbd>W</kbd><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd> walk · drag or <kbd>←</kbd><kbd>→</kbd> look · <kbd>Shift</kbd> hurry · <kbd>E</kbd> or click: ask, drink, open the door · <kbd>Tab</kbd> dance card · <kbd>F</kbd> take the floor</div><button id="bwAct" aria-label="Act">ACT</button>`;
  stage.appendChild(bw);
  const fade = document.createElement('div'); fade.id = 'bwFade'; stage.appendChild(fade);
  const cf = document.createElement('div'); cf.className = 'pause'; cf.id = 'bwConfirm'; cf.hidden = true; stage.appendChild(cf);
  const row = document.querySelector('#pauseOv .menurow'); if (row) { const b = document.createElement('button'); b.className = 'btn ghost'; b.id = 'bLeaveBall'; b.dataset.bx = 'leave'; b.hidden = true; b.textContent = 'Leave the ball'; row.appendChild(b); }
  const _sp = setPaused; setPaused = function (v) { _sp(v); try { ballPauseUI(); } catch (e) { } };
  // keys
  const MOVE = new Set(['KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ShiftLeft', 'ShiftRight']);
  window.addEventListener('keydown', e => {
    if (!BW.on) return; if (e.target && /INPUT|SELECT|TEXTAREA/.test(e.target.tagName)) return;
    if (BW.confirm) { if (e.code === 'Escape') ballLeaveCancel(); return; }
    if (MOVE.has(e.code)) { e.preventDefault(); BW.keys.add(e.code); }
    else if (e.code === 'KeyE' || e.code === 'Enter') { e.preventDefault(); if (!e.repeat) bwInteract(); }
    else if (e.code === 'Tab') { e.preventDefault(); if (!e.repeat) bwCardToggle(); }
    else if (e.code === 'KeyF') { if (!e.repeat) bwTakeFloor(); }
    else if (e.code === 'Escape') { if (BW.cardOpen) bwCardToggle(); else ballLeaveAsk(); }
  });
  window.addEventListener('keyup', e => { BW.keys.delete(e.code); });
  window.addEventListener('blur', () => BW.keys.clear());
  // drag to look, click or tap to act on what the cross-hair is on
  let drag = null;
  stage.addEventListener('pointerdown', e => { if (!BW.on || BW.confirm || e.target.closest('button,#stick,#bwCardPanel,.screen,.pause')) return; drag = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, t: performance.now() }; });
  window.addEventListener('pointermove', e => { if (!drag || e.pointerId !== drag.id) return; BW.look += (e.clientX - drag.x) * 0.0042; BW.lookY += (e.clientY - drag.y) * 0.0036; drag.x = e.clientX; drag.y = e.clientY; });
  const up = e => { if (!drag || e.pointerId !== drag.id) return; const moved = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0), dt = performance.now() - drag.t; drag = null; if (BW.on && moved < 9 && dt < 450) bwInteract(); };
  window.addEventListener('pointerup', up); window.addEventListener('pointercancel', () => { drag = null; });
  $('bwAct').addEventListener('pointerdown', e => { e.preventDefault(); e.stopPropagation(); bwInteract(); });
  const how = document.querySelector('#sHow .how');
  if (how) how.insertAdjacentHTML('beforeend', '<div><h4>Walking the ball</h4>Between dances you walk the hall yourself (<b>WASD</b>, drag or arrows to look, the stick on a phone). Walk up to someone and press <b>E</b> (or tap) to ask them to dance: nearly everyone says yes unless you are very tipsy or boiling. The Dashing White Sergeant always opens the ball and needs <b>two</b> partners. Aim at a drink on the bar and press E to pick it up and drink it. Step through the double doors at the back onto the terrace to cool down. <b>Tab</b> shows your dance card; <b>F</b> takes the floor early; when the countdown ends the band starts and your partner leads you to the set. You can <b>leave the ball</b> any time and keep what you have earned. After every dance, partners hug.</div>');
}
