/* Reel Time · characters.js
   Your reeling set: the eight dancers, their faces, and the wardrobe of outfits and tartans. */
"use strict";

/* ================= your reeling set ================= */
const SKIN = ['#f3cfb3', '#e8b994', '#d29f78', '#b07a52', '#8a5a3a', '#5f3b26'];
const HAIR = ['#1b1410', '#3d2817', '#6b4423', '#a0662f', '#d7b46a', '#e8d9a8', '#8f2f1c', '#9a9a9a'];
const DRESS = ['#f4f1ea', '#1f3554', '#6e1f2b', '#2e5240', '#b8a6d9', '#e7c9c4', '#0e0e10', '#8f1d3a', '#0f5f73', '#c79a2a', '#c9486b', '#4a6fa5', '#7b3f8c'];
/* the face: every setting a person can have, kept in one small `face` object (see faceOf). null colours mean "use the preset". */
const FACE_DEF = { v: 0, sk: null, hc: null, ec: null, es: 1, ed: 0, bs: 0, bt: 1, bc: null, ns: 1, nh: 0, er: 1, ms: 0, mz: 1, fw: 1, hs: 1, jw: 0, bl: 0.5, fr: 0, gl: 0, bd: 0, bdc: null, lp: null, sh: null, ag: 0, hl: null }; // hl: hair length 0 (buzzcut) to 1 (waist length); null = whatever the style gives
const EYEC = ['#3b2a1e', '#2f4a6b', '#3d5a35'];
const GUEST_FP = [0, 1, 2].map(v => Object.assign({}, FACE_DEF, { v }));
const faceOf = per => (per && per.face && typeof per.face === 'object') ? per.face : GUEST_FP[Math.abs(+(per && per.face) || 0) % 3];
const hexRGB = h => { h = String(h || '#888888'); if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; return [parseInt(h.slice(1, 3), 16) || 0, parseInt(h.slice(3, 5), 16) || 0, parseInt(h.slice(5, 7), 16) || 0]; };
const rgbHex = a => '#' + a.map(v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('');
const mixHex = (a, b, u) => { const p = hexRGB(a), q = hexRGB(b); return rgbHex(p.map((v, i) => v + (q[i] - v) * u)); };
const hexLum = h => { const c = hexRGB(h); return (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) / 255; };
const okHex = s => /^#[0-9a-fA-F]{6}$/.test(String(s || ''));
const skinHex = per => faceOf(per).sk || SKIN[(per && per.skin) || 0] || SKIN[0];
const hairHex = per => faceOf(per).hc || HAIR[(per && per.hair) || 0] || HAIR[0];
const skinAt = t => { const n = SKIN.length - 1, x = clamp(t, 0, 1) * n, i = Math.min(n - 1, Math.floor(x)); return mixHex(SKIN[i], SKIN[i + 1], x - i); };
const skinT = h => { let best = 0, bd = 1e9; for (let i = 0; i <= 100; i++) { const a = hexRGB(skinAt(i / 100)), b = hexRGB(h), d = Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]); if (d < bd) { bd = d; best = i; } } return best; };
// character creator options
const HSTYLES = [['short', 'Short'], ['crop', 'Crop'], ['quiff', 'Quiff'], ['slick', 'Slicked back'], ['curly', 'Curly'], ['afro', 'Afro'], ['bald', 'Bald'], ['long', 'Long'], ['wavy', 'Long wavy'], ['ponytail', 'Ponytail'], ['plaits', 'Plaits'], ['bob', 'Bob'], ['pixie', 'Pixie'], ['bun', 'Bun'], ['updo', 'Updo']];
const KILTS = [['classic', 'Knife pleat'], ['box', 'Box pleat'], ['short', 'Short / modern'], ['trews', 'Trews']];
const JACKETS = [['pc', 'Prince Charlie'], ['argyll', 'Argyll'], ['tweed', 'Sheriffmuir tweed'], ['waistcoat', 'Waistcoat']];
// jackets, darkest first: [colour, name, price, tweed (1 speckled, 2 herringbone)]. The first two are free; the old eight keep their slots.
const JACKETD = [['#0e0f12', 'Black', 0], ['#16213b', 'Navy', 0], ['#14301f', 'Bottle green', 6], ['#45131f', 'Burgundy', 6], ['#2f1d11', 'Dark brown', 6], ['#2b343b', 'Slate', 6], ['#26282c', 'Charcoal', 5], ['#0b1224', 'Midnight', 8],
  ['#1b3a26', 'Forest green', 8], ['#5a1424', 'Claret', 8], ['#3b1b3a', 'Plum', 10], ['#0c3a40', 'Dark teal', 10], ['#3a2013', 'Chocolate', 8], ['#274a2e', 'Hunter green', 10], ['#3a0f12', 'Oxblood', 10], ['#2a1647', 'Deep purple', 12],
  ['#5a4128', 'Brown tweed', 14, 1], ['#3d4a2e', 'Green tweed', 14, 1], ['#4d4f55', 'Grey herringbone', 16, 2], ['#2a3550', 'Blue tweed', 16, 1], ['#5a3320', 'Russet tweed', 16, 2]];
const JACKETC = JACKETD.map(j => j[0]), JACKETN = JACKETD.map(j => j[1]), JACKETTW = JACKETD.map(j => j[3] || 0);
const SHOES = [['pump', 'Pump'], ['ghillie', 'Ghillie'], ['strappy', 'Strappy'], ['flat', 'Ballet flat'], ['boot', 'Boot']];
const HEELS = ['Flat', 'Low', 'Mid', 'High', 'Stiletto'];
const HEEL_H = [0, 0.025, 0.05, 0.075, 0.10]; // metres of heel
const effHeel = per => per && per.kind !== 'gent' && per.shoe !== 'ghillie' && per.shoe !== 'flat' ? Math.max(0, Math.min(4, per.heel | 0)) : 0;
const guestLook = (h, kind) => ({ kilt: ['classic', 'classic', 'box', 'short', 'trews'][(h >>> 7) % 5], jacket: ['pc', 'pc', 'argyll', 'tweed', 'waistcoat'][(h >>> 9) % 5], jcol: (h >>> 11) % JACKETC.length, shoe: ['pump', 'pump', 'ghillie', 'strappy', 'flat', 'boot'][(h >>> 13) % 6], heel: kind === 'lady' ? (h >>> 15) % 3 : 0 });
const heelNote = h => h ? `Heels: harder to dance. Position ring ${Math.round(7 * h)}% tighter, timing windows about ${Math.round(4 * h)}% narrower${h >= 3 ? ', and she wobbles' : ''}.` : 'Flat shoes: no penalty.';
/* ---------- the wardrobe: every optional garment and accessory, with its price in shillings (0 = a basic that is always yours) ---------- */
const DRESSN = ['Ivory', 'Navy', 'Burgundy', 'Forest', 'Lilac', 'Blush', 'Black', 'Ruby', 'Teal', 'Gold', 'Rose', 'Cornflower', 'Plum'];
const twSw = c => `repeating-linear-gradient(45deg,${c} 0 2px,rgba(255,255,255,.3) 2px 4px),${c}`; // a tweed swatch for the picker
const gridSw = (c, ink) => `repeating-linear-gradient(0deg,${ink} 0 1px,transparent 1px 4px),repeating-linear-gradient(90deg,${ink} 0 1px,transparent 1px 4px),${c}`;
const stripeSw = (c, ink) => `repeating-linear-gradient(90deg,${ink} 0 1px,transparent 1px 4px),${c}`;
// shirts: [base colour, name, texture kind, ink colour]. Plain colours first, then checks and stripes. The old five keep their slots.
const SHIRTC = [['#f6f3ec', 'White'], ['#efe3c8', 'Cream'], ['#bcd3e8', 'Pale blue'], ['#e8c9d3', 'Pale pink'], ['#1a1a1d', 'Black'], ['#f3ecd2', 'Ivory'], ['#a9adb2', 'Grey'],
  ['#f2f4f7', 'Blue check', 'check', '#3d6fb5'], ['#f4f1ea', 'Red check', 'check', '#b3262b'], ['#f2f4f7', 'Navy pinstripe', 'pin', '#1f2f5a'], ['#f4f1ea', 'Green gingham', 'gingham', '#2f7a4a'], ['#e6e0f2', 'Lilac stripe', 'stripe', '#7a5fb0'], ['#d9dce0', 'Charcoal stripe', 'stripe', '#3a3d44']];
const shirtSw = ([c, , k, ink]) => !k ? c : k === 'gingham' ? gridSw(c, ink + '88') : k === 'check' ? gridSw(c, ink) : stripeSw(c, ink);
// socks (called hose in the old books; the saved key stays "hose" so old saves load): [colour, name]
const SOCKC = [['#efeadf', 'Cream'], ['#f7f7f4', 'White'], ['#8d9298', 'Grey'], ['#1c1c1f', 'Black'], ['#a8232a', 'Red'], ['#1d5a34', 'Green'], ['#1f2f5a', 'Navy'], ['#6b4a2b', 'Brown'], ['#7d6a86', 'Heather'], ['#4a1f2a', 'Burgundy'], ['#c79a2a', 'Mustard'], ['#3a3d42', 'Charcoal'], ['#2f6b78', 'Teal'], ['#d7b9a0', 'Oatmeal']];
const FLASHC = { red: '#b3262b', green: '#1f6b3a', navy: '#1d2b4f', gold: '#c9a227', black: '#141414' };
const NECKCOL = { black: '#0d0d10', white: '#f4f1ea', red: '#8a1c26', burgundy: '#5a1426', navy: '#16233f', green: '#1f4a30', purple: '#4a2a6a', teal: '#14606a', pink: '#d46a8a', silver: '#aeb4bc', gold: '#c9a227' };
const NECKCN = [['auto', 'Classic for the style', 0, '#8a1c26'], ['black', 'Black', 0, NECKCOL.black], ['white', 'White', 4, NECKCOL.white], ['red', 'Red', 4, NECKCOL.red], ['burgundy', 'Burgundy', 4, NECKCOL.burgundy], ['navy', 'Navy', 4, NECKCOL.navy], ['green', 'Green', 4, NECKCOL.green], ['purple', 'Purple', 5, NECKCOL.purple], ['teal', 'Teal', 5, NECKCOL.teal], ['pink', 'Pink', 5, NECKCOL.pink], ['silver', 'Silver', 8, NECKCOL.silver], ['gold', 'Gold', 8, NECKCOL.gold], ['tartan', 'Your tartan', 12, 'repeating-linear-gradient(45deg,#a8232a 0 3px,#1b2a4a 3px 6px)']];
// gloves: colour, cuff trim, long (opera) or short, lace and fingerless, tartan trim. 1 and 2 are the old long and short ones.
const GLV = { 1: { c: '#f4f1ea', cuff: '#c9a24a', L: 1 }, 2: { c: '#f7f4ee', cuff: '#c9a24a', L: 0 }, 3: { c: '#17171a', cuff: '#c9c9d0', L: 1 }, 4: { c: '#efe6d2', cuff: '#8a6a3a', L: 1, lace: 1 }, 9: { c: '#17171a', cuff: '#9a9aa6', L: 1, lace: 1 }, 5: { c: '#f4f1ea', cuff: null, L: 1, tart: 1 }, 6: { c: '#e8a8bc', cuff: '#fff4f6', L: 1 }, 7: { c: '#9a1428', cuff: '#e8d9a8', L: 1 }, 8: { c: '#1c2a52', cuff: '#e9e4d6', L: 0 } };
const WD_DEF = { shirt: 0, neck: 'auto', neckc: 'auto', hose: 0, flash: 'red', sporran: 'dress', sgian: 1, pin: 1, plaid: 'none', hat: 'none', cut: 'ball', sash: 'right', neckl: 'chain', ear: 'stud', tiara: 'none', flow: 'none', shawl: 'none' };
const wdOf = per => (per && per.wd && typeof per.wd === 'object') ? Object.assign({}, WD_DEF, per.wd) : WD_DEF;
const glvOf = per => !per ? 0 : per.gloves === true ? 1 : (GLV[per.gloves | 0] ? per.gloves | 0 : 0); // 0 bare, else a GLV key
// g gent/lady, f where the choice is kept ('wd.x' lives in the person's wd object), t tab (c clothes, e extras), none = the value that means "taken off", o = [value, name, price, colour?]
// Prices: one or two basics are free in every group, the rest cost shillings (cheap for plain, dearer for fancy). Everything can be tried on first.
const WSLOTS = [
  { id: 'kilt', g: 'gent', f: 'kilt', t: 'c', n: 'Kilt', o: [['classic', 'Knife pleat', 0], ['box', 'Box pleat', 10], ['short', 'Short / modern', 10], ['trews', 'Trews', 25]] },
  { id: 'jacket', g: 'gent', f: 'jacket', t: 'c', n: 'Jacket', o: [['pc', 'Prince Charlie', 0], ['argyll', 'Argyll', 20], ['tweed', 'Sheriffmuir tweed', 20], ['waistcoat', 'Waistcoat', 15]] },
  { id: 'jcol', g: 'gent', f: 'jcol', t: 'c', n: 'Jacket colour', o: JACKETD.map(([c, n, p, tw], i) => [i, n, p, tw ? twSw(c) : c]) },
  { id: 'shirt', g: 'gent', f: 'wd.shirt', t: 'c', n: 'Shirt', o: SHIRTC.map((s, i) => [i, s[1], i < 2 ? 0 : i < 7 ? 5 : 9, shirtSw(s)]) },
  { id: 'neck', g: 'gent', f: 'wd.neck', t: 'c', n: 'Neckwear', none: 'none', o: [['auto', 'Matches the jacket', 0], ['bow', 'Bow tie', 0], ['tie', 'Long tie', 6], ['cravat', 'Cravat / ascot', 14], ['jabot', 'Lace jabot (frilled)', 20], ['ghillie', 'Ghillie shirt (laced)', 12], ['bolo', 'Bolo tie', 10], ['none', 'Open collar', 0]] },
  { id: 'neckc', g: 'gent', f: 'wd.neckc', t: 'c', n: 'Neckwear colour', o: NECKCN },
  { id: 'hose', g: 'gent', f: 'wd.hose', t: 'c', n: 'Socks', o: SOCKC.map(([c, n], i) => [i, n, i < 2 ? 0 : i < 8 ? 6 : 9, c]) },
  { id: 'flash', g: 'gent', f: 'wd.flash', t: 'e', n: 'Garter flashes', none: 'none', o: [['none', 'No flashes', 0], ['red', 'Red', 0], ['green', 'Green', 5], ['navy', 'Navy', 5], ['gold', 'Gold', 8], ['black', 'Black', 5]] },
  { id: 'sporran', g: 'gent', f: 'wd.sporran', t: 'e', n: 'Sporran', none: 'none', o: [['dress', 'Dress sporran', 0, '#141414'], ['leather', 'Leather day sporran', 0, '#6b4423'], ['semi', 'Semi-dress sporran', 18, '#3a2615'], ['fulld', 'Full dress, silver cantle', 40, '#c9ccd2'], ['hair', 'Horsehair, long white', 30, '#e6e1d4'], ['hairb', 'Horsehair, long black', 32, '#1a1816'],
    ['rabbit', 'Rabbit fur', 22, '#cfc8bb'], ['seal', 'Seal-style black fur', 28, '#101012'], ['badger', 'Badger', 36, '#6c6a66'], ['fox', 'Red fox', 34, '#b5532a'], ['sheep', 'Sheepskin', 20, '#eadfc8'], ['goat', 'Goat hair', 26, '#5a4630'], ['none', 'No sporran', 0]] },
  { id: 'sgian', g: 'gent', f: 'wd.sgian', t: 'e', n: 'Sgian-dubh', none: 0, o: [[1, 'Sgian-dubh in the sock', 8], [0, 'None', 0]] },
  { id: 'pin', g: 'gent', f: 'wd.pin', t: 'e', n: 'Kilt pin', none: 0, o: [[1, 'Silver kilt pin', 8], [0, 'None', 0]] },
  { id: 'shoe', g: 'gent', f: 'shoe', t: 'c', n: 'Shoes', o: [['pump', 'Brogues', 0], ['ghillie', 'Ghillie brogues', 10]] },
  { id: 'plaid', g: 'gent', f: 'wd.plaid', t: 'e', n: 'Plaid', none: 'none', o: [['none', 'No plaid', 0], ['fly', 'Fly plaid over the shoulder', 30]] },
  { id: 'hat', g: 'gent', f: 'wd.hat', t: 'e', n: 'Hat', none: 'none', o: [['none', 'Bareheaded', 0], ['glengarry', 'Glengarry', 20], ['balmoral', 'Balmoral bonnet', 20]] },
  { id: 'cut', g: 'lady', f: 'wd.cut', t: 'c', n: 'Gown cut', o: [['ball', 'Full ball gown', 0], ['aline', 'A-line', 10], ['mermaid', 'Mermaid', 25], ['tea', 'Tea length', 10]] },
  { id: 'dress', g: 'lady', f: 'dress', t: 'c', n: 'Gown colour', o: DRESS.map((c, i) => [i, DRESSN[i], i < 2 ? 0 : i < 8 ? 6 : 12, c]) },
  { id: 'gloves', g: 'lady', f: 'gloves', t: 'c', n: 'Gloves', none: 0, o: [[0, 'Bare hands', 0], [2, 'Short white', 0, '#f7f4ee'], [1, 'Long opera, white', 10, '#f4f1ea'], [3, 'Long opera, black', 12, '#17171a'], [4, 'Lace fingerless, ivory', 10, '#efe6d2'], [9, 'Lace fingerless, black', 10, '#2a2a30'], [5, 'Tartan-edged opera', 16, '#c9a24a'], [6, 'Blush pink, long', 8, '#e8a8bc'], [7, 'Ruby red, long', 10, '#9a1428'], [8, 'Navy, short', 6, '#1c2a52']] },
  { id: 'lshoe', g: 'lady', f: 'shoe', t: 'c', n: 'Shoes', o: [['pump', 'Pumps', 0], ['flat', 'Ballet flats', 0], ['strappy', 'Strappy sandals', 10], ['ghillie', 'Ghillies', 8], ['boot', 'Ankle boots', 15]] },
  { id: 'heel', g: 'lady', f: 'heel', t: 'c', n: 'Heel height', o: HEELS.map((n, i) => [i, n, 0]) },
  { id: 'sash', g: 'lady', f: 'wd.sash', t: 'e', n: 'Tartan sash', none: 'none', o: [['right', 'Over the right shoulder', 0], ['left', 'Over the left shoulder', 4], ['none', 'No sash', 0]] },
  { id: 'neckl', g: 'lady', f: 'wd.neckl', t: 'e', n: 'Necklace', none: 'none', o: [['none', 'None', 0], ['chain', 'Silver chain', 0], ['pearls', 'Pearls', 15], ['pendant', 'Pendant', 20], ['choker', 'Velvet choker', 10]] },
  { id: 'ear', g: 'lady', f: 'wd.ear', t: 'e', n: 'Earrings', none: 'none', o: [['none', 'None', 0], ['stud', 'Studs', 0], ['pearl', 'Pearl drops', 12], ['hoop', 'Hoops', 10]] },
  { id: 'tiara', g: 'lady', f: 'wd.tiara', t: 'e', n: 'Tiara', none: 'none', o: [['none', 'None', 0], ['silver', 'Silver tiara', 40], ['gold', 'Gold tiara', 45]] },
  { id: 'flow', g: 'lady', f: 'wd.flow', t: 'e', n: 'Hair flowers', none: 'none', o: [['none', 'None', 0], ['rose', 'Roses', 8], ['white', 'White blossoms', 8], ['spray', 'Flower spray', 12]] },
  { id: 'shawl', g: 'lady', f: 'wd.shawl', t: 'e', n: 'Shawl', none: 'none', o: [['none', 'None', 0], ['tartan', 'Tartan shawl', 25], ['ivory', 'Ivory wrap', 18], ['black', 'Black wrap', 18], ['rose', 'Rose wrap', 18]] }
];
const wget = (r, f) => f.startsWith('wd.') ? wdOf(r)[f.slice(3)] : (f === 'gloves' ? glvOf(r) : r[f]);
const wset = (r, f, v) => { if (f.startsWith('wd.')) { r.wd = Object.assign({}, WD_DEF, r.wd || {}); r.wd[f.slice(3)] = v; } else r[f] = v; };
const wOwned = (sl, o) => !o[2] || !!(SAVE.wown && SAVE.wown[sl.id + ':' + o[0]]);
const tartanKey = k => String(k || '').replace(/^robertson/, 'dalmeny'); // the old Robertson tartans are Dalmeny now
const tartanOwned = k => !!TARTANS[k] && (!TARTANS[k].cost || !!(SAVE.owned && SAVE.owned[k]));
// Tartans are data-driven: a sett is a run of letter+thread-count pairs (K black, B blue, G green, R red, W white, Y yellow, N navy, A azure,
// P purple, E grey, T brown/tan, O orange). Each variant colours the letters from a palette: modern (deep), ancient (lighter, warm), weathered (browns and faded greens).
// Thread counts are faithful approximations written from memory, not official records. Tartans are bought in the Outfitter (SAVE.owned); guests and spectators wear the first six keys and never need to own them.
const TARTAN_PAL = {
  m: { K: '#101214', B: '#1f3d7a', G: '#1d5a34', R: '#a8161f', W: '#ecebe6', Y: '#e2b92e', N: '#14203f', A: '#4a86c4', P: '#5a2c78', E: '#6f757a', T: '#6b4a2b', O: '#cf6a1c' },
  a: { K: '#3b3631', B: '#5b84b8', G: '#5f8c55', R: '#c4453a', W: '#f0e8d0', Y: '#e8c75a', N: '#3a4f7c', A: '#7fb0d6', P: '#8a5f94', E: '#a29e92', T: '#a78559', O: '#de8a45' },
  w: { K: '#2e2a24', B: '#4b5d6e', G: '#5a6a3c', R: '#8a4a38', W: '#cdbf9e', Y: '#b7954a', N: '#3a4452', A: '#6c8794', P: '#6e5668', E: '#8a8576', T: '#6a5238', O: '#a8683a' }
};
const TARTAN_DEFS = [
  // the first six keep their old keys: they seed the default roster and the guests
  ['red', 'Clan Red', 'R28 N8 R4 N2 G14 K2 Y2 G4', { R: '#a8232a', N: '#1b2a4a', G: '#14532d', K: '#0d0d0d', Y: '#e9c46a' }],
  ['green', 'Hunting Green', 'G26 N10 K4 N4 G6 Y2 G12', { G: '#1f4d3a', N: '#14213d', K: '#0b0b0b', Y: '#c9a227' }],
  ['grey', 'Dress Grey', 'E24 K6 E4 R2 E10 K14 W2 K2', { E: '#9aa1a6', K: '#2b2b2b', R: '#c0392b', W: '#f2f2f2' }],
  ['heather', 'Heather', 'P24 G8 P4 W2 D14 G6 W2', { P: '#6d5a9c', G: '#2d6a4f', W: '#d8c3e8', D: '#3d2f63' }],
  ['gold', 'Ancient Gold', 'Y26 T8 Y4 G12 K2 T6 W2', { Y: '#c8902e', T: '#7a3b1e', G: '#2b4d3a', K: '#1a1a1a', W: '#f1d9a0' }],
  ['navy', 'Midnight', 'N26 K10 G10 K4 E2 N8', { N: '#1d2b4f', K: '#0b0f1c', G: '#3f7f6b', E: '#c7c9d1' }],
  // [key, name, sett, variants (m modern, a ancient, w weathered)]
  ['dalmeny-hunting', 'Dalmeny Hunting', 'G24 K4 B24 K4 G6 R2 G6', 'maw'],
  ['dalmeny-dress', 'Dalmeny Dress', 'R22 W4 R4 K4 G16 W2 G6 K2', 'ma'],
  ['fraser-hunting', 'Fraser Hunting', 'G32 K4 T22 K4 G6 R2 G6', 'maw'],
  ['fraser-red', 'Fraser Red', 'R40 N6 R4 G22 N6 R2 G4', 'maw'],
  ['macdonald', 'MacDonald (Clan Donald)', 'G28 K4 B22 K4 R6 K2 G6', 'maw'],
  ['royal-stewart', 'Royal Stewart', 'R30 N6 K2 R4 Y2 R4 K2 G16 K2 W2 K2', 'ma'],
  ['hunting-stewart', 'Hunting Stewart', 'B24 K4 G24 K4 B4 G4 Y2 G4', 'maw'],
  ['dress-stewart', 'Dress Stewart', 'W36 R4 W4 N6 K2 R2 W8', 'm'],
  ['black-stewart', 'Black Stewart', 'K28 N6 K4 G14 K4 R2', 'm'],
  ['black-watch', 'Black Watch', 'B24 K4 B4 K4 G24 K24 G4', 'maw'],
  ['gordon', 'Gordon', 'B24 K4 G24 K4 B4 Y2 B4', 'ma'],
  ['campbell', 'Campbell', 'B24 K4 G24 K4 B4 W2 B4', 'ma'],
  ['macgregor', 'MacGregor', 'R36 K6 G22 W2 G4', 'm'],
  ['cameron-erracht', 'Cameron of Erracht', 'R16 B12 K2 G16 Y2 G4', 'm'],
  ['mackenzie', 'Mackenzie', 'G22 K4 B22 K4 W2 B4', 'm'],
  ['murray-atholl', 'Murray of Atholl', 'B24 K4 G24 K4 R2 K4 B8', 'm'],
  ['sutherland', 'Sutherland', 'G28 K4 B22 K4 W2 G8', 'm'],
  ['ross-hunting', 'Ross Hunting', 'G26 K6 R10 K4 G6', 'm'],
  ['grant', 'Grant', 'R36 G6 R4 B16 G4 K2 R4', 'm'],
  ['buchanan', 'Buchanan', 'Y4 K2 R32 K2 G14 W2 G4 R4', 'm'],
  ['douglas', 'Douglas', 'G28 K4 B12 K4 G12 W2 G4', 'm'],
  ['wallace', 'Wallace', 'R28 K4 Y4 K4 R6 K4 Y8', 'm'],
  ['bruce', 'Bruce', 'R32 G6 K2 G20 R4 K2', 'm'],
  ['lindsay', 'Lindsay', 'B28 K4 G16 R2 G4 B4 W2', 'm'],
  ['macpherson', 'Macpherson', 'R40 K4 B8 K4 G16 W2 Y2', 'm'],
  ['maclean', 'Maclean', 'R32 K4 B10 K4 G16 Y2 R4', 'm'],
  ['mackay', 'MacKay', 'G22 K4 B22 K4 G6 B4', 'm'],
  ['munro', 'Munro', 'R36 K6 G22 K2 Y2 G4 R4', 'm'],
  ['hamilton', 'Hamilton', 'R36 B16 K2 R4 B4 G6 K2', 'm'],
  ['davidson', 'Davidson', 'G26 K4 B16 K4 R2 B8 G4', 'm'],
  ['forbes', 'Forbes', 'G26 K4 B22 W2 K2 B4 G6', 'm'],
  ['menzies', 'Menzies', 'R30 W6 R4 W2 R6 K4 G10', 'm'],
  ['graham', 'Graham', 'B24 K4 G24 K4 W2 K4 B6', 'm'],
  ['ogilvy', 'Ogilvy', 'R28 B4 R4 G20 B4 K2 G4', 'm'],
  ['johnstone', 'Johnstone', 'B28 K4 G24 W2 K2 G4 B6', 'm'],
  ['kennedy', 'Kennedy', 'B20 K4 G20 K4 W2 K2 B4', 'm'],
  ['cunningham', 'Cunningham', 'G24 K4 B16 K4 R6 W2 R4', 'm'],
  ['elliot', 'Elliot', 'G26 K4 B22 K2 Y2 G4', 'm'],
  ['henderson', 'Henderson', 'B20 K4 G24 K4 W2 R2 B6', 'm'],
  ['macarthur', 'MacArthur', 'G24 K4 B22 K4 G6 Y2 B4', 'm'],
  ['macdougall', 'MacDougall', 'R36 B14 K2 R4 G8 K2 Y2', 'm'],
  ['morrison', 'Morrison', 'G26 K4 R10 K4 G6 W2 G4', 'm'],
  ['scott', 'Scott', 'G26 K4 B14 K4 G10 R2 Y2', 'm'],
  ['armstrong', 'Armstrong', 'B24 K4 G24 K4 B4 W2 K2', 'm'],
  ['anderson', 'Anderson', 'R32 K4 G16 K2 W2 G6 R4', 'm'],
  ['flower-of-scotland', 'Flower of Scotland', 'P24 G16 P4 W2 A8 W2 G6', 'm'],
  ['thistle', 'Thistle Fashion', 'P20 W2 G22 K2 P6 A4 W2', 'm'],
  ['saltire', 'Saltire Fashion', 'N28 W4 A6 W4 N10 R2 N4', 'm'],
  ['rowan-berry', 'Rowan Berry Fashion', 'R22 O4 R4 K2 O2 T14 K2 R6', 'm'],
  ['sunset-glen', 'Sunset Glen Fashion', 'O20 R6 O4 P12 Y4 R4 P6', 'm'],
  ['loch-mist', 'Loch Mist Fashion', 'A22 E8 A4 W2 N12 E4 A8', 'm']
];
const TARTANS = {};
(function () {
  const VN = { m: 'Modern', a: 'Ancient', w: 'Weathered' }, VS = { m: 'modern', a: 'ancient', w: 'weathered' };
  const hx = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const add = (key, name, sett, pal, cost) => {
    const sec = [], tot = {};
    sett.trim().split(/\s+/).forEach(tok => { const c = pal[tok[0]] || '#888888', n = +tok.slice(1) || 1; sec.push([c, n]); tot[c] = (tot[c] || 0) + n; });
    const cols = Object.keys(tot).sort((x, y) => tot[y] - tot[x]), base = cols[0], a = cols[1] || base;
    const dist = c => { const p = hx(c), q = hx(base); return Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]); };
    const rest = cols.slice(1).filter(c => c !== a), b = (rest.length ? rest : cols).slice().sort((x, y) => dist(y) - dist(x))[0];
    TARTANS[key] = { name, base, a, b, sett: sec, cost: cost == null ? 0 : cost };
  };
  // Prices in shillings: red and green are the free starters, Fraser is the cheapest to buy, Dalmeny the dearest of all.
  const PRICE = { red: 0, green: 0, grey: 50, heather: 60, gold: 70, navy: 55, 'fraser-hunting': [30, 35, 38], 'fraser-red': [34, 40, 45], 'dalmeny-hunting': [600, 750, 900], 'dalmeny-dress': [650, 800, 800],
    'royal-stewart': 450, 'black-watch': 400, 'dress-stewart': 350, 'hunting-stewart': 320, 'cameron-erracht': 330, 'black-stewart': 300, gordon: 280, campbell: 280, 'murray-atholl': 260, macdonald: 250, macgregor: 240,
    'flower-of-scotland': 95, thistle: 110, saltire: 100, 'rowan-berry': 120, 'sunset-glen': 130, 'loch-mist': 105 };
  const VM = { m: 1, a: 1.12, w: 1.25 }, r5 = n => Math.round(n / 5) * 5;
  const price = (bk, c) => { let b = PRICE[bk]; if (Array.isArray(b)) return b[Math.min(2, 'maw'.indexOf(c))]; if (b == null) b = 60 + (hashId(bk) % 15) * 10; return b ? r5(b * VM[c || 'm']) : 0; };
  TARTAN_DEFS.forEach(([key, name, sett, v]) => {
    if (typeof v === 'object') return add(key, name, sett, v, price(key, 'm'));
    if (v.length === 1) return add(key, name, sett, TARTAN_PAL[v], price(key, v));
    [...v].forEach(c => add(key + '-' + VS[c], name + ' (' + VN[c] + ')', sett, TARTAN_PAL[c], price(key, c)));
  });
})();
const ZERO_UPG = () => ({ footwork: 0, grip: 0, stamina: 0, flair: 0 });
const P_ = (id, name, kind, skin, hair, style, tartan, dress, height, more) => Object.assign({ id, name, kind, skin, hair, style, tartan, dress, height, face: id.length % 3, gloves: kind === 'lady' && id.length % 2 === 1, upg: ZERO_UPG(), kilt: 'classic', jacket: 'pc', jcol: 0, shoe: 'pump', heel: 0 }, more || {});
// fill in any creator fields an older save lacks (face object, wardrobe, gloves, ownership of what is already worn)
const FACE_RANGE = { v: [0, 2], es: [0.7, 1.35], ed: [-1, 1], bs: [0, 4], bt: [0.5, 2], ns: [0.6, 1.5], nh: [0, 3], er: [0.6, 1.7], ms: [0, 5], mz: [0.6, 1.5], fw: [0.85, 1.15], hs: [0.9, 1.15], jw: [-1, 1], bl: [0, 1], fr: [0, 3], gl: [0, 5], bd: [0, 5], ag: [0, 3] };
const FACE_INT = new Set(['v', 'bs', 'nh', 'ms', 'fr', 'gl', 'bd', 'ag']);
function normFace(f) {
  const o = f && typeof f === 'object' ? f : { v: Math.abs(+f || 0) % 3 }, F = Object.assign({}, FACE_DEF, o);
  Object.keys(FACE_RANGE).forEach(k => { let n = +F[k]; if (!isFinite(n)) n = FACE_DEF[k]; n = clamp(n, FACE_RANGE[k][0], FACE_RANGE[k][1]); F[k] = FACE_INT.has(k) ? Math.round(n) : Math.round(n * 100) / 100; });
  F.hl = (F.hl != null && isFinite(+F.hl)) ? Math.round(clamp(+F.hl, 0, 1) * 100) / 100 : null;
  ['sk', 'hc', 'ec', 'bc', 'bdc', 'lp', 'sh'].forEach(k => { F[k] = okHex(F[k]) ? F[k].toLowerCase() : null; });
  Object.keys(F).forEach(k => { if (!(k in FACE_DEF)) delete F[k]; });
  return F;
}
function normPerson(r) {
  if (!(r.height >= 1.4 && r.height <= 2.1)) r.height = r.kind === 'lady' ? 1.67 : 1.8; if (!r.upg || typeof r.upg !== 'object') r.upg = ZERO_UPG();
  if (!r.kilt) r.kilt = 'classic'; if (!r.jacket) r.jacket = 'pc'; if (!(r.jcol >= 0 && r.jcol < JACKETC.length)) r.jcol = 0;
  if (!r.shoe) r.shoe = 'pump'; r.heel = Math.max(0, Math.min(4, r.heel | 0)); r.tartan = tartanKey(r.tartan); if (!r.tartan || !TARTANS[r.tartan]) r.tartan = 'red';
  if (!r.style) r.style = r.kind === 'gent' ? 'short' : 'long';
  if (r.kind === 'gent' && r.shoe !== 'ghillie') r.shoe = 'pump'; // gents wear brogues or ghillie brogues
  r.skin = clamp(r.skin | 0, 0, SKIN.length - 1); r.hair = clamp(r.hair | 0, 0, HAIR.length - 1); if (!(r.dress >= 0 && r.dress < DRESS.length)) r.dress = 0;
  r.face = normFace(r.face); r.gloves = glvOf(r); r.wd = Object.assign({}, WD_DEF, r.wd && typeof r.wd === 'object' ? r.wd : {});
  return r;
}
// everything a person is already wearing counts as owned (so older saves lose nothing)
function claimWorn(r) {
  SAVE.wown = SAVE.wown || {}; SAVE.owned = SAVE.owned || {};
  if (TARTANS[r.tartan] && TARTANS[r.tartan].cost) SAVE.owned[r.tartan] = true;
  WSLOTS.forEach(sl => { if (sl.g !== r.kind) return; const v = wget(r, sl.f), o = sl.o.find(q => String(q[0]) === String(v)); if (o && o[2]) SAVE.wown[sl.id + ':' + o[0]] = true; });
}
// Seeded from Rafi's 128-some eightsome and set-reel friends. Everything is editable in "Your reeling set".
const DEFAULT_ROSTER = [
  P_('rafi', 'Rafi', 'gent', 2, 0, 'short', 'red', 0, 1.82),
  P_('issy', 'Issy', 'lady', 0, 4, 'long', 'green', 1, 1.68),
  P_('frankie', 'Frankie', 'lady', 1, 2, 'bun', 'heather', 0, 1.70, { face: { v: 2, fr: 2 } }),
  P_('anson', 'Anson', 'gent', 1, 0, 'short', 'navy', 0, 1.78, { face: { v: 1, bd: 1 } }),
  P_('charles', 'Charles', 'gent', 0, 3, 'short', 'grey', 0, 1.86, { face: { v: 0, gl: 2, ag: 1, bd: 2 } }),
  P_('eleanor', 'Eleanor', 'lady', 0, 3, 'long', 'red', 2, 1.66, { heel: 1, face: { v: 1, lp: '#9b2335' } }),
  P_('flo', 'Flo', 'lady', 1, 5, 'bun', 'gold', 4, 1.64, { heel: 2, shoe: 'strappy', face: { v: 2, lp: '#c0204a', sh: '#8a6fb0' } }),
  P_('catriona', 'Catriona', 'lady', 0, 6, 'long', 'green', 3, 1.71, { heel: 1 })
]; // eight characters = the eight slots. (Alice, the old ninth, now lives in SAVE.extra if an old save had her.)
const FILL = {
  gent: ['Hamish', 'Angus', 'Fergus', 'Callum', 'Rory', 'Euan', 'Jamie', 'Archie', 'Ollie', 'Hugo'],
  lady: ['Kirsty', 'Isla', 'Hattie', 'Rosie', 'Iona', 'Mairi', 'Georgie', 'Tilly', 'Bella', 'Lottie']
};
