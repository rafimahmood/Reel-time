/* Reel Time · ui.js
   The main loop, results, menus, the character editor, the Outfitter, and keyboard, mouse and touch input. */
"use strict";

/* ---------- loop ---------- */
let lastT = performance.now(), realDt = 0.016;
function frame(now) {
  realDt = Math.min(0.5, (now - lastT) / 1000);
  const real = Math.min(0.05, realDt); lastT = now;
  const dt = real * (window.__TS || 1);
  try { update(dt); draw(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(frame);
}
function draw(dt) {
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  if (!floorCanvas) { floorCanvas = makeFloorCanvas(); floorPat = ctx.createPattern(floorCanvas, 'repeat'); }
  const g = game;
  if (!g) { if (BW.on || BW.wz3d) { ctx.clearRect(0, 0, W, H); bwFrame(dt); return; } drawIdle(); return; } // Ball: the walking world / the 3D waltz
  const fp = SAVE.view === 'fp' && R3.ready;
  if (fp) {
    ctx.clearRect(0, 0, W, H);
    // states first (they drive both the 3D bodies and the minimap)
    const st = {}; Object.keys(g.ch.tr).forEach(id => st[id] = dancerState(g, id, dt)); g.lastStates = st;
    render3D(g, dt);
    if (!g.hug) drawFPOverlay(g);
  } else drawScene2D(g, { x: 0, y: 0, w: W, h: H }, dt);
  drawPrompts(g);
}
let idle = null;
function drawIdle() {
  if (!idle) { const ch = buildDWS(1, false); castPeople(ch, SAVE.roster[0], 'auto'); idle = { ch, anim: {}, p: { x: 0, y: 0 }, D: { view: 'dws' }, cam: { y: 0 }, t: 0 }; }
  idle.t = (performance.now() / 1000 / 1.15) % 32;
  const v = { s: Math.min(W / 6.2, H / 6.6), ox: W / 2, oy: H / 2 };
  drawFloor(v, { x: 0, y: 0, w: W, h: H });
  Object.keys(idle.ch.tr).forEach(id => {
    if (id.startsWith('O') && id[1] !== '0') return;
    const pos = idle.ch.at(id, idle.t), q = idle.ch.at(id, idle.t + 0.05);
    const a = idle.anim[id] || (idle.anim[id] = { phase: 0, face: 0 });
    const spd = Math.hypot(q.x - pos.x, q.y - pos.y) / 0.05 / 1.15; a.phase += spd * 0.016 * 5.2;
    if (spd > 0.1) a.face = a.face + angDiff(a.face, Math.atan2(q.y - pos.y, q.x - pos.x)) * 0.2;
    drawPerson2D(v, { pos, face: a.face, phase: a.phase, spd, setting: -1, person: idle.ch.meta[id].person, kind: idle.ch.meta[id].kind }, { label: false });
  });
}

/* ---------- results ---------- */
function finish(g) {
  g.done = true; band.stop(); band.applause();
  const s = g.stats;
  const acc = s.accN ? s.acc / s.accN : 0;
  const turns = s.turnMax ? clamp(s.turnPts / s.turnMax, 0, 1) : 1;
  const steps = s.stepMax ? clamp(s.stepPts / s.stepMax, 0, 1) : 1;
  const grade = 0.5 * acc + 0.28 * turns + 0.22 * steps;
  const stars = grade >= 0.86 ? 3 : grade >= 0.7 ? 2 : grade >= 0.5 ? 1 : 0;
  const score = Math.round(g.score);
  if (g.ball) { ballDanceDone(g, stars, score, { acc, turns, steps }); return; } // Ball mode keeps its own results
  const coins = g.demo ? 0 : g.practice ? Math.round(score / 400) : Math.round(score / 90 + stars * 15);
  if (g.practice) { SAVE.shillings += coins; persist(); }
  if (!g.demo && !g.practice) {
    SAVE.shillings += coins;
    SAVE.stars[g.key] = Math.max(SAVE.stars[g.key] || 0, stars);
    const prevBest = SAVE.best[g.key] || 0; g.newBest = score > prevBest; SAVE.best[g.key] = Math.max(prevBest, score);
    persist();
  }
  $('hud').hidden = true; $('topbtns').hidden = true; $('pauseOv').hidden = true; $('touch').classList.remove('play');
  $('rTitle').textContent = g.demo ? 'That\'s how it goes' : ['Back to the bar', 'Not bad at all', 'Well danced', 'Belle of the ball'][stars];
  $('rSub').textContent = g.D.name + ' · ' + g.me.name + ' · ' + g.diff.label + (g.demo ? ' · demo, no shillings' : g.practice ? ' · practice: one time through, slower, with a wider green' : '') + (g.newBest ? ' · new best' : '');
  $('rStars').innerHTML = [0, 1, 2].map(i => i < stars ? '★' : '<span class="off">★</span>').join('');
  const pct = x => Math.round(x * 100) + '%';
  $('rStats').innerHTML = [
    ['Score', score.toLocaleString('en-GB')], ['Pattern', pct(acc)], ...(s.turnMax ? [['Hands', pct(turns)]] : []), ...(s.stepMax ? [['Setting', pct(steps)]] : []),
    ['Flair', Math.round(s.flair).toLocaleString('en-GB')], ['Best combo', g.maxCombo], ...(s.moves ? [['Moves / best chain', s.moves + ' / ' + s.maxChain]] : []), ['Shillings', '+' + coins]
  ].map(([k, v]) => `<div class="stat"><div class="k">${k}</div><div class="v">${v}</div></div>`).join('');
  const weakest = [['pattern', acc], ['hands', s.turnMax ? turns : 1], ['setting', steps]].sort((a, b) => a[1] - b[1])[0][0];
  const tips = {
    pattern: 'Your feet drifted off the figure. Watch the trail and move before the ring does. Footwork training widens the ring.',
    hands: 'Hands were the weak spot. Press TURN as the marker reaches the green, keep holding, and let go when the bar goes green again. Grip training widens the green.' + (s.wrong ? ` You offered the wrong hand ${s.wrong} time${s.wrong > 1 ? 's' : ''}.` : ''),
    setting: 'Setting slipped off the beat. Press SET (Space) when the marker on the timing bar is in the green, then wait for the next one.'
  };
  const unlockMsg = '';
  // which figure cost the most?
  const byName = {};
  Object.entries(g.figAcc).forEach(([i, fa]) => { const n = g.figs[i].name; const o = byName[n] || (byName[n] = { a: 0, n: 0 }); o.a += fa.a; o.n += fa.n; });
  const worst = Object.entries(byName).filter(([, o]) => o.n > 0.5).map(([n, o]) => [n, o.a / o.n]).sort((a, b) => a[1] - b[1])[0];
  const figMsg = worst && worst[1] < 0.9 && !g.demo ? ` Your feet were furthest off in "${worst[0]}" (${Math.round(worst[1] * 100)}% on the figure). Watch that one in the demo.` : '';
  $('rTip').textContent = (g.demo ? 'Now try it yourself. ' : tips[weakest]) + figMsg + unlockMsg;
  // each figure in the order danced, with how close you kept to it and whether you hit its SET and TURN
  const seen = new Set();
  $('rFigs').innerHTML = g.figs.filter(f => f.b0 < g.total).map(f => {
    if (seen.has(f.name)) return ''; seen.add(f.name);
    const idx = g.figs.map((x, i) => x.name === f.name ? i : -1).filter(i => i >= 0);
    let a = 0, n = 0; idx.forEach(i => { const fa = g.figAcc[i]; if (fa) { a += fa.a; n += fa.n; } });
    const evs = g.ev.filter(e => (e.type === 'set' || e.type === 'turn') && g.figs.some(ff => ff.name === f.name && e.b0 >= ff.b0 && e.b0 < ff.b1));
    const good = evs.filter(e => e.type === 'set' ? e.quality > 0 : e.gripped).length;
    const pct = n ? a / n : 1, timing = evs.length ? good / evs.length : 1, sc = Math.min(pct, timing);
    const cls = sc >= 0.9 ? 'ok' : sc >= 0.7 ? 'mid' : 'low';
    return `<span class="figchip ${cls}"><b>${Math.round(sc * 100)}%</b>${esc(f.name.replace(/, .*$/, ''))}</span>`;
  }).join('');
  showScreen('sRes');
}

/* ---------- menus ---------- */
const SCREENS = ['sMenu', 'sShop', 'sHow', 'sRes', 'sRoster', 'sOutfit'];
function showScreen(id) { if (id !== 'sOutfit') OF.trial = null; if (id !== 'sRoster') RS.trial = null; /* try-ons only last while you stay */ SCREENS.forEach(s => $(s).hidden = s !== id); if (id === 'sMenu') renderMenu(); if (id === 'sShop') renderShop(); if (id === 'sRoster') renderRoster(); if (id === 'sOutfit') renderOutfit(); applyView(); }
function starsHTML(n) { return [0, 1, 2].map(i => i < n ? '★' : '<span class="off">★</span>').join(''); }
function unlocked(k) { return true; } // every reel is open from the start
function purseHTML() { const tot = Object.values(SAVE.stars).reduce((a, b) => a + b, 0); return `<span>Shillings <b>${SAVE.shillings}</b></span><span>Stars <b>${tot}</b> / ${DANCE_ORDER.length * 3}</span>`; }
function renderMenu() {
  $('purse').innerHTML = purseHTML();
  const me = meP();
  try { const fc = $('meFace'), fx = fc.getContext('2d'); fx.clearRect(0, 0, 128, 128); drawMiiHead(fx, me, me.kind, 64, 70, 46); } catch (e) { }
  $('selMe').innerHTML = SAVE.roster.map(r => `<option value="${esc(r.id)}" ${r.id === me.id ? 'selected' : ''}>${esc(r.name)} (${r.kind})</option>`).join('');
  const opp = SAVE.roster.filter(r => r.kind !== me.kind);
  $('selPartner').innerHTML = `<option value="auto">Whoever's free</option>` + opp.map(r => `<option value="${esc(r.id)}" ${r.id === SAVE.partner ? 'selected' : ''}>${esc(r.name)}</option>`).join('');
  const role = me.kind === 'lady' ? 'lady' : 'man';
  $('reelList').innerHTML = DANCE_ORDER.map(k => {
    const d = DANCES[k], ok = unlocked(k), best = SAVE.best[k];
    return `<div class="reel ${ok ? '' : 'locked'}">
      <div class="meta">${d.meta}</div><h3>${d.short}</h3>
      <div class="stars">${starsHTML(SAVE.stars[k] || 0)}</div>
      <div class="desc">${d.desc(role)}</div>
      ${best ? `<div class="meta">Best ${best.toLocaleString('en-GB')}</div>` : ''}
      <div class="row"><button class="btn" data-play="${k}" ${ok ? '' : 'disabled'}>Dance</button><button class="btn ghost" data-practice="${k}" ${ok ? '' : 'disabled'}>Practise</button><button class="demo" data-demo="${k}">Watch demo</button></div>
    </div>`;
  }).join('') + `<div class="reel locked"><div class="meta">Still to come</div><h3>More reels</h3><div class="desc">Hamilton House and a few more favourites are still being rehearsed.</div></div>`;
  document.querySelectorAll('#segDiff button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SAVE.diff));
  document.querySelectorAll('#segVoice button').forEach(b => b.setAttribute('aria-pressed', (b.dataset.v === 'on') === SAVE.voice));
  document.querySelectorAll('#segLag button').forEach(b => b.setAttribute('aria-pressed', +b.dataset.v === (SAVE.lag || 0)));
  document.querySelectorAll('#segTravel button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (SAVE.travel || 'rail')));
  document.querySelectorAll('#segSens button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === (SAVE.sens || 'med')));
  document.querySelectorAll('#segView button').forEach(b => b.setAttribute('aria-pressed', b.dataset.v === SAVE.view));
  $('diffNote').textContent = DIFFS[SAVE.diff].note + (SAVE.view === 'fp' && !window.THREE ? ' First person needs the 3D library, which did not load here.' : '');
}
function renderShop() {
  const me = meP();
  $('purse2').innerHTML = purseHTML();
  $('trainLab').textContent = 'Training for ' + me.name;
  $('shopUp').innerHTML = Object.entries(UPGRADES).map(([k, u]) => {
    const lvl = me.upg[k], max = u.cost.length, cost = u.cost[lvl];
    const cur = trainStats(me.upg, DIFFS[SAVE.diff]), nx = lvl < max ? trainStats(Object.assign({}, me.upg, { [k]: lvl + 1 }), DIFFS[SAVE.diff]) : null, nxr = nx ? u.fx(nx) : null;
    const fxh = u.fx(cur).map(([l, v], i) => `<div>${l}: <b>${v}</b>${nxr ? ` → <b style="color:var(--good)">${nxr[i][1]}</b>` : ''}</div>`).join('');
    return `<div class="item"><h4>${u.name} <span style="opacity:.6;font-weight:400">level ${lvl}/${max}</span></h4><p>${u.desc}</p><div class="fx" style="font-size:12.5px;line-height:1.5;margin:4px 0">${fxh}</div><div class="pips">${u.cost.map((_, i) => `<i class="${i < lvl ? 'on' : ''}"></i>`).join('')}</div>
      <div class="row">${lvl >= max ? '<span class="price">Fully trained</span>' : `<span class="price">${cost} shillings</span><button class="btn brass" data-up="${k}" ${SAVE.shillings < cost ? 'disabled' : ''}>Train ${esc(me.name)}</button>`}</div></div>`;
  }).join('');
  $('shopTricks').innerHTML = Object.entries(TRICKS).map(([k, tr]) => `<div class="item"><h4>${tr.name} <kbd>${tr.key}</kbd></h4><p>${tr.desc}</p>${tr.move ? `<p style="font-size:12.5px;opacity:.85">${(() => { const s = trainStats(me.upg, DIFFS[SAVE.diff]); return (tr.win === 'flair' ? `Window ±${s.fw.toFixed(2)} s round every 2nd bar line (perfect ±${(s.fw * 0.45).toFixed(2)} s)` : tr.win === 'beat' ? `Window ±${(s.fw * 0.6).toFixed(2)} s round any half-bar beat (perfect ±${(s.fw * 0.24).toFixed(2)} s)` : 'Last bar of a figure, once per figure') + ` · costs ${Math.round(tr.energy * s.costMul)} energy · ${Math.round(tr.pts * s.flair)} points`; })()}</p>` : ''}<div class="row">${SAVE.tricks[k] ? '<span class="price">Learned</span>' : `<span class="price">${tr.cost} shillings</span><button class="btn brass" data-trick="${k}" ${SAVE.shillings < tr.cost ? 'disabled' : ''}>Learn</button>`}</div></div>`).join('');
}
// A grid of tartan chips: a real woven swatch, the name, and either "Owned" / "Wearing" or a padlock and the price in shillings.
const PADLOCK = '<svg width="10" height="11" viewBox="0 0 10 11" aria-hidden="true" style="vertical-align:-1px"><rect x="1" y="5" width="8" height="6" rx="1.2" fill="currentColor"/><path d="M2.6 5V3.4a2.4 2.4 0 0 1 4.8 0V5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>';
function tartanChips(sel, attr, extra, q, sort, trial) {
  const ent = Object.entries(TARTANS); if (sort === 'price') ent.sort((a, b) => a[1].cost - b[1].cost || a[1].name.localeCompare(b[1].name));
  return ent.map(([k, tt]) => { const own = tartanOwned(k);
    return `<button class="tchip ${own ? 'own' : 'lock'}" ${attr}="${k}" ${extra || ''} ${q && !tt.name.toLowerCase().includes(q) ? 'hidden' : ''} data-n="${esc(tt.name.toLowerCase())}" aria-pressed="${k === sel}" title="${esc(tt.name)}${own ? '' : ' (' + tt.cost + ' shillings. Click to try it on first.)'}"><span class="tsw" style="background-image:url(${tartanSwatch(k)});background-color:${tt.base}"></span><span class="tnm">${esc(tt.name)}<span class="tpr">${k === trial ? 'Trying' : own ? (k === sel ? 'Wearing' : 'Owned') : PADLOCK + ' ' + tt.cost + ' s'}</span></span></button>`; }).join('');
}
// pick a tartan: wear it if it is owned, otherwise buy it (when the purse allows) and wear it. Returns what to tell the player.
function tartanBuyWear(r, k) {
  const tt = TARTANS[k]; if (!tt || !r) return '';
  if (tartanOwned(k)) { r.tartan = k; return tt.name + ' is on.'; }
  if (SAVE.shillings < tt.cost) return `${tt.name} costs ${tt.cost} shillings and you have ${SAVE.shillings}. Dance more to earn them.`;
  SAVE.shillings -= tt.cost; SAVE.owned[k] = true; r.tartan = k; return `Bought ${tt.name} for ${tt.cost} shillings.`;
}
/* ---------- the eight character slots and the face editor ---------- */
const RS = { sel: 0, tab: 'look', view: null, msg: '', tsort: 'default' };
const TSEARCH = {};
const FSEL = {
  bs: [['0', 'Arched'], ['1', 'Flat'], ['2', 'Angled'], ['3', 'Soft'], ['4', 'High arch']], nh: [['0', 'Button'], ['1', 'Straight'], ['2', 'Long'], ['3', 'Broad']],
  ms: [['0', 'Smile'], ['1', 'Grin'], ['2', 'Neutral'], ['3', 'Pout'], ['4', 'Smirk'], ['5', 'Surprised']], gl: [['0', 'None'], ['1', 'Round'], ['2', 'Square'], ['3', 'Half-rim'], ['4', 'Shades'], ['5', 'Cat-eye']],
  bd: [['0', 'Clean shaven'], ['1', 'Stubble'], ['2', 'Moustache'], ['3', 'Goatee'], ['4', 'Full beard'], ['5', 'Mutton chops']], fr: [['0', 'None'], ['1', 'Light'], ['2', 'Some'], ['3', 'Lots']], ag: [['0', 'None'], ['1', 'Light'], ['2', 'Some'], ['3', 'Deep']]
};
const EYE_PRE = ['#3b2a1e', '#6b4423', '#2f4a6b', '#3d5a35', '#6c8a98', '#7a5a2a', '#4a4a4a', '#5a3a7a'];
const LIP_PRE = ['#b2404a', '#9b2335', '#c0204a', '#d96a7a', '#7a2a3a', '#c7684a'];
const SHADOW_PRE = ['#8a6fb0', '#6a8fb8', '#b08a6a', '#4f7a5a', '#a0527a'];
const BEARD_PRE = ['#1b1410', '#3d2817', '#6b4423', '#a0662f', '#9a9a9a', '#8f2f1c'];
// hair length: the slider's own words, and the length each style gives when the slider is left on "style default"
const HLDEF = { short: 0.2, crop: 0.1, quiff: 0.2, slick: 0.25, curly: 0.2, afro: 0.3, bald: 0, long: 0.62, wavy: 0.66, ponytail: 0.5, plaits: 0.55, bob: 0.3, pixie: 0.1, bun: 0.5, updo: 0.5 };
const hlName = v => v < 0.08 ? 'Buzzcut' : v < 0.2 ? 'Cropped' : v < 0.3 ? 'Short' : v < 0.45 ? 'Chin length' : v < 0.6 ? 'Shoulder' : v < 0.8 ? 'Mid-back' : 'Waist length';
/* the face, skin and hair controls as three blocks of HTML. The roster editor and the Outfitter's Face and Hair tabs both use these, and both edit the same person.face fields. All of it is free. */
function faceKit(r) {
  const F = r.face, lady = r.kind === 'lady';
  const dots = (arr, attr, on) => `<div class="dots">${arr.map((c, j) => `<button style="background:${c}" ${attr}="${j}" aria-pressed="${on(c, j)}" aria-label="${attr.replace('data-', '')} ${j + 1}"></button>`).join('')}</div>`;
  const cdots = (k, arr) => `<div class="dots">${arr.map(c => `<button style="background:${c}" data-fcp="${k}|${c}" aria-pressed="${F[k] === c}" aria-label="${k} ${c}"></button>`).join('')}</div>`;
  const sg = (attr, items, cur) => `<div class="seg">${items.map(([v, n]) => `<button ${attr}="${v}" aria-pressed="${String(cur) === String(v)}">${n}</button>`).join('')}</div>`;
  const rng = (k, lab, min, max, step) => `<label class="frow"><span class="fl">${lab}</span><input type="range" data-fp="${k}" min="${min}" max="${max}" step="${step}" value="${F[k]}" aria-label="${lab}"><output>${(+F[k]).toFixed(step < 0.1 ? 2 : 1)}</output></label>`;
  const col = (k, lab, fb, clr) => `<div class="frow"><span class="fl">${lab}</span><input type="color" data-fc="${k}" value="${F[k] || fb}" aria-label="${lab} colour"><input class="hx" type="text" data-fhex="${k}" value="${F[k] || ''}" placeholder="${fb}" maxlength="7" aria-label="${lab} hex code">${clr ? `<button class="btn ghost small" data-fclr="${k}">${clr}</button>` : ''}</div>`;
  const sel = (k, lab) => `<div class="frow"><span class="fl">${lab}</span><select data-fsel="${k}" aria-label="${lab}">${FSEL[k].map(([v, n]) => `<option value="${v}" ${String(F[k]) === v ? 'selected' : ''}>${n}</option>`).join('')}</select></div>`;
  const row = (lab, inner) => `<div class="frow"><span class="fl">${lab}</span>${inner}</div>`;
  const hlv = F.hl == null ? (HLDEF[r.style] == null ? 0.2 : HLDEF[r.style]) : F.hl;
  const skin = `<div class="fgrp"><h5>Skin</h5>
      ${row('Presets', dots(SKIN, 'data-skin', (c, j) => !F.sk && r.skin === j))}
      <label class="frow"><span class="fl">Custom tone</span><input type="range" data-fskin min="0" max="100" step="1" value="${F.sk ? skinT(F.sk) : Math.round(r.skin / (SKIN.length - 1) * 100)}" aria-label="Custom skin tone"><output style="width:34px"><i style="display:inline-block;width:18px;height:12px;border-radius:3px;vertical-align:middle;background:${skinHex(r)};border:1px solid rgba(255,255,255,.3)"></i></output></label></div>`;
  const hair = `<div class="fgrp"><h5>Hair</h5>
      ${row('Presets', dots(HAIR, 'data-hair', (c, j) => !F.hc && r.hair === j))}
      ${col('hc', 'Any colour', HAIR[r.hair])}
      <div class="frow" style="align-items:flex-start"><span class="fl">Style</span><div class="seg" style="flex-wrap:wrap">${HSTYLES.map(([v, n]) => `<button data-hst="${v}" aria-pressed="${r.style === v}">${n}</button>`).join('')}</div></div>
      <label class="frow"><span class="fl">Length</span><input type="range" data-fp="hl" min="0" max="1" step="0.01" value="${hlv}" aria-label="Hair length, buzzcut to waist length"><output style="width:92px">${hlName(hlv)}</output></label>
      <div class="frow"><span class="fl"></span><span style="font-size:12px">Buzzcut at the left end, waist length at the right.</span>${F.hl == null ? '' : '<button class="btn ghost small" data-fclr="hl">Style default</button>'}</div></div>`;
  const face = `<div class="fgrp"><h5>Head</h5>${rng('hs', 'Head size', 0.9, 1.15, 0.01)}${rng('fw', 'Face width', 0.85, 1.15, 0.01)}${rng('jw', 'Jaw and chin', -1, 1, 0.1)}${rng('er', 'Ear size', 0.6, 1.7, 0.05)}${rng('bl', 'Cheek blush', 0, 1, 0.05)}
      ${row('Freckles', sg('data-fseg="fr" data-v', FSEL.fr, F.fr))}${row('Age lines', sg('data-fseg="ag" data-v', FSEL.ag, F.ag))}</div>
    <div class="fgrp"><h5>Eyes</h5>${rng('es', 'Eye size', 0.7, 1.35, 0.05)}${rng('ed', 'Eye spacing', -1, 1, 0.1)}
      ${row('Colour', cdots('ec', EYE_PRE))}${col('ec', 'Any colour', EYEC[F.v % 3])}${sel('gl', 'Glasses')}
      ${lady ? col('sh', 'Eyeshadow', '#8a6fb0', 'None') + row('Shadow presets', cdots('sh', SHADOW_PRE)) : ''}</div>
    <div class="fgrp"><h5>Eyebrows</h5>${sel('bs', 'Style')}${rng('bt', 'Thickness', 0.5, 2, 0.1)}${col('bc', 'Colour', HAIR[r.hair], 'Match hair')}</div>
    <div class="fgrp"><h5>Nose and mouth</h5>${sel('nh', 'Nose shape')}${rng('ns', 'Nose size', 0.6, 1.5, 0.05)}${sel('ms', 'Mouth')}${rng('mz', 'Mouth size', 0.6, 1.5, 0.05)}
      ${lady ? col('lp', 'Lipstick', '#b2404a', 'None') + row('Lip presets', cdots('lp', LIP_PRE)) : ''}</div>
    ${lady ? '' : `<div class="fgrp"><h5>Facial hair</h5>${sel('bd', 'Style')}${col('bdc', 'Colour', HAIR[r.hair], 'Match hair')}${row('Presets', cdots('bdc', BEARD_PRE))}</div>`}
    <div class="frow"><button class="btn ghost small" data-rand>Randomise face</button><button class="btn ghost small" data-fdef>Reset face</button></div>`;
  return { skin, hair, face };
}
// "Trying: X, 120 shillings" with Buy and Undo, shared by the roster's tartan picker (which = 'ed') and the Outfitter (which = 'of')
function tryBarHTML(rows, which) {
  if (!rows.length) return '';
  const tot = rows.reduce((a, q) => a + q.price, 0), one = rows.length === 1;
  return `<div class="trybar" role="status"><div class="trylist">${rows.map(q => `<div class="tryrow"><span>Trying: <b>${esc(q.name)}</b> <span class="tryp">${PADLOCK} ${q.price} shillings</span></span><span class="tryb"><button class="btn brass small" data-${which === 'of' ? 'obuy' : 'tbuy'}="${esc(q.id)}" ${SAVE.shillings < q.price ? 'title="You have ' + SAVE.shillings + ' shillings"' : ''}>Buy to keep</button><button class="btn ghost small" data-${which === 'of' ? 'oundo' : 'trevert'}="${esc(q.id)}">Undo</button></span></div>`).join('')}</div>
    <div class="trybot"><span>Only a preview: it goes back to what you own when you leave.${SAVE.shillings < tot ? ` You have ${SAVE.shillings} shillings.` : ''}</span>${one ? '' : `<span class="tryb"><button class="btn brass small" data-${which === 'of' ? 'obuy' : 'tbuy'}="all">Buy all (${tot} s)</button><button class="btn ghost small" data-${which === 'of' ? 'oundo' : 'trevert'}="all">Revert all</button></span>`}</div></div>`;
}
const rosterTrialRows = r => { const tr = RS.trial; if (!tr || tr.id !== r.id || !TARTANS[tr.tartan] || tartanOwned(tr.tartan)) return []; return [{ id: 't', name: TARTANS[tr.tartan].name, price: TARTANS[tr.tartan].cost }]; };
function editorHTML(r, i) {
  const lady = r.kind === 'lady', me = r.id === SAVE.me, tab = RS.tab, kit = faceKit(r);
  const tview = RS.trial && RS.trial.id === r.id && TARTANS[RS.trial.tartan] ? RS.trial.tartan : null, shownT = tview || r.tartan;
  const sg = (attr, items, cur) => `<div class="seg">${items.map(([v, n]) => `<button ${attr}="${v}" aria-pressed="${String(cur) === String(v)}">${n}</button>`).join('')}</div>`;
  const row = (lab, inner) => `<div class="frow"><span class="fl">${lab}</span>${inner}</div>`;
  let ctl = '';
  if (tab === 'look') ctl = `
    <div class="fgrp"><h5>Who</h5>
      ${row('Gent or lady', sg('data-kind', [['gent', 'Gent'], ['lady', 'Lady']], r.kind))}
      ${row('Height', `<div class="seg"><button data-ht="-1">&minus;</button><button disabled>${r.height.toFixed(2)} m</button><button data-ht="1">+</button></div>`)}
      ${row('Training', `<span>${Object.values(r.upg).reduce((a, b) => a + b, 0)} / 20 levels</span>`)}</div>
    ${kit.skin}${kit.hair}
    <div class="fgrp"><h5>Clothes</h5><div class="frow" style="gap:10px"><span>Kilt, jacket, gown, hat, jewellery and more live in the Outfitter, where every item can be tried on before you buy. Faces and hair can also be changed there.</span><button class="btn brass small" data-ofopen>Open the Outfitter</button></div></div>`;
  else if (tab === 'face') ctl = kit.face;
  else ctl = `<div class="tcol"><div class="note">Tartans cost shillings. Click any tartan to <b>try it on</b> in the preview; to keep a padlocked one, press Buy. You have <b>${SAVE.shillings}</b>. Fraser is the cheapest, Dalmeny the dearest.</div>
      <div class="tcur"><b>${esc((TARTANS[shownT] || TARTANS.red).name)}</b><span class="seg"><button data-tsort="default" aria-pressed="${RS.tsort !== 'price'}">A to Z</button><button data-tsort="price" aria-pressed="${RS.tsort === 'price'}">Cheapest first</button></span><input type="search" data-tsearch="ed" value="${esc(TSEARCH.ed || '')}" placeholder="Search ${Object.keys(TARTANS).length} tartans" aria-label="Search tartans"></div>
      <div class="tgrid" data-tg style="max-height:330px">${tartanChips(shownT, 'data-tartan', '', (TSEARCH.ed || '').toLowerCase(), RS.tsort, tview)}</div></div>`;
  return `<div class="person ${me ? 'me' : ''}">
    <div class="top"><input type="text" value="${esc(r.name)}" data-name maxlength="18" aria-label="Name">
      <span style="display:flex;gap:6px;flex:none">${me ? '<span class="price">Dancing as</span>' : '<button class="btn small" data-danceas>Dance as</button>'}${!me && SAVE.roster.length > 1 ? '<button class="btn ghost small" data-clear>Clear slot</button>' : ''}</span></div>
    <div class="seg tabs">${[['look', 'Look'], ['face', 'Face'], ['tartan', 'Tartan']].map(([v, n]) => `<button data-rtab="${v}" aria-pressed="${tab === v}">${n}</button>`).join('')}</div>
    ${tryBarHTML(rosterTrialRows(r), 'ed')}
    ${RS.msg ? `<p class="note" id="rMsg" style="color:var(--brass)">${esc(RS.msg)}</p>` : ''}
    <div class="pbody">
      <div style="display:flex;flex-direction:column;gap:6px;align-items:center"><canvas class="pv" id="pvEd" width="380" height="660" aria-label="Live 3D preview of ${esc(r.name)}. Drag to turn."></canvas>
        <div class="seg" style="font-size:13px"><button data-rview="full" aria-pressed="${pvMode('ed') === 'full'}">Full length</button><button data-rview="head" aria-pressed="${pvMode('ed') === 'head'}">Face close-up</button></div></div>
      <div class="ctl">${ctl}</div>
    </div></div>`;
}
function emptyHTML(i) {
  return `<div class="person"><div class="top"><b style="font-size:16px">Slot ${i + 1} is empty</b></div>
    <p class="note">Create a new character here. You can change everything afterwards: face, hair, tartan and, in the Outfitter, every stitch of clothing.</p>
    <div class="menurow"><button class="btn" data-create="gent">Create a gent</button><button class="btn" data-create="lady">Create a lady</button></div></div>`;
}
function newPerson(kind, slot) {
  const r = P_('p' + Date.now().toString(36) + slot, kind === 'gent' ? 'New gent' : 'New lady', kind, slot % 6, (slot * 3) % 8, kind === 'gent' ? 'short' : 'long', 'red', slot % 7, kind === 'gent' ? 1.8 : 1.67, { face: { v: slot % 3 } });
  return normPerson(r);
}
function randomiseFace(r) {
  const R = (a, b) => a + Math.random() * (b - a), I = n => Math.floor(Math.random() * n), pick = a => a[I(a.length)], lady = r.kind === 'lady';
  r.face = normFace({ v: I(3), ec: pick(EYE_PRE), es: R(0.85, 1.25), ed: R(-0.6, 0.6), bs: I(5), bt: R(0.7, 1.5), ns: R(0.8, 1.25), nh: I(4), er: R(0.8, 1.35), ms: I(5), mz: R(0.8, 1.25), fw: R(0.9, 1.1), hs: R(0.95, 1.1), jw: R(-0.7, 0.8), bl: R(0.2, 0.8), fr: Math.random() < 0.35 ? 1 + I(3) : 0, gl: Math.random() < 0.3 ? 1 + I(5) : 0,
    bd: lady ? 0 : (Math.random() < 0.5 ? 0 : 1 + I(5)), lp: lady && Math.random() < 0.6 ? pick(LIP_PRE) : null, sh: lady && Math.random() < 0.4 ? pick(SHADOW_PRE) : null, ag: Math.random() < 0.2 ? 1 + I(2) : 0 });
  r.hair = I(HAIR.length); r.skin = I(SKIN.length); r.face.hc = null;
}
function slotPortrait(i) {
  const c = document.querySelector(`#slots canvas[data-sp="${i}"]`), r = SAVE.slots[i]; if (!c || !r) return;
  const x = c.getContext('2d'); x.clearRect(0, 0, c.width, c.height); const real = ctx; ctx = x;
  try { drawMiiHead(x, r, r.kind, 56, 60, 42); } finally { ctx = real; }
}
function slotsHTML() {
  return SAVE.slots.map((r, i) => r ? `<button class="slot" data-slot="${i}" aria-pressed="${i === RS.sel}" aria-label="Slot ${i + 1}: ${esc(r.name)}"><canvas width="112" height="112" data-sp="${i}"></canvas><span class="sn">${esc(r.name)}</span><span class="sk">${r.kind}</span>${r.id === SAVE.me ? '<span class="me">You</span>' : ''}</button>`
    : `<button class="slot empty" data-slot="${i}" aria-pressed="${i === RS.sel}" aria-label="Slot ${i + 1}: empty, create"><span class="plus">+</span><span class="sn">Create</span><span class="sk">Slot ${i + 1}</span></button>`).join('');
}
function renderRoster() {
  RS.sel = clamp(RS.sel | 0, 0, NSLOT - 1);
  $('slots').innerHTML = slotsHTML(); for (let i = 0; i < NSLOT; i++) slotPortrait(i);
  refreshEditor();
}
function refreshEditor() {
  const r = SAVE.slots[RS.sel], box = $('people'), keep = (box.querySelector('[data-tg]') || {}).scrollTop || 0;
  box.innerHTML = r ? editorHTML(r, RS.sel) : emptyHTML(RS.sel);
  const g = box.querySelector('[data-tg]'); if (g) { const on = g.querySelector('[aria-pressed="true"]'); g.scrollTop = keep || (on ? Math.max(0, on.offsetTop - g.clientHeight / 2 + on.offsetHeight / 2) : 0); }
  if (r) pvAttach('ed'); else { PV.items.ed = null; }
}
function rosterEdit(i, fn, light, inOf) { const r = SAVE.slots[i]; if (!r) return; fn(r); normPerson(r); persist(); slotPortrait(i); if (inOf) { if (light) pvRefresh('of'); else renderOutfit(); } else if (light) pvRefresh('ed'); else { $('slots').innerHTML = slotsHTML(); for (let k = 0; k < NSLOT; k++) slotPortrait(k); refreshEditor(); } }
/* ---------- live 3D previews ----------
   One shared offscreen WebGLRenderer draws every preview in turn and copies the result into that preview's canvas (the editor's, the outfitter's).
   Drag on a preview to turn the character; it drifts round again after a moment. */
const PV = { ok: null, items: {}, on: false, st: {}, w: 0, h: 0 };
function pvMode(key) { return key === 'ed' ? (RS.view || (RS.tab === 'face' ? 'head' : 'full')) : (OF.view || 'full'); }
function pvInit() {
  if (PV.ok !== null) return PV.ok;
  PV.ok = false;
  try {
    if (!window.THREE) return false;
    const cv = document.createElement('canvas'); cv.width = 380; cv.height = 660;
    const rd = new THREE.WebGLRenderer({ canvas: cv, antialias: true, alpha: true, preserveDrawingBuffer: true });
    rd.setPixelRatio(1); rd.setSize(380, 660, false); rd.outputEncoding = THREE.sRGBEncoding; rd.toneMapping = THREE.ACESFilmicToneMapping; rd.toneMappingExposure = 0.95; rd.setClearColor(0x000000, 0);
    const sc = new THREE.Scene();
    sc.add(new THREE.HemisphereLight(0xfff0d8, 0x3a2414, 0.62));
    const dl = new THREE.DirectionalLight(0xffe4c0, 0.62); dl.position.set(2.5, 5, 4); sc.add(dl);
    const rim = new THREE.DirectionalLight(0x9fb8ff, 0.35); rim.position.set(-4, 3, -5); sc.add(rim);
    const pad = new THREE.Mesh(new THREE.CircleGeometry(0.75, 40), new THREE.MeshBasicMaterial({ color: 0x12211c, transparent: true, opacity: 0.8 })); pad.rotation.x = -Math.PI / 2; pad.position.y = -0.004; sc.add(pad);
    const cam = new THREE.PerspectiveCamera(28, 380 / 660, 0.1, 30); cam.position.set(0, 1.02, 4.5); cam.lookAt(0, 0.97, 0);
    PV.rd = rd; PV.scene = sc; PV.cam = cam; PV.pad = pad; PV.w = 380; PV.h = 660; PV.ok = true;
  } catch (e) { PV.ok = false; }
  return PV.ok;
}
function pvDispose(m) { try { m.root.traverse(o => { if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(x => x.dispose && x.dispose()); }); } catch (e) { } }
function pvPerson(key) {
  if (key !== 'ed') return ofView(ofPerson()); // the Outfitter shows what is owned plus whatever is being tried on
  const r = SAVE.slots[RS.sel]; return r && RS.trial && RS.trial.id === r.id && TARTANS[RS.trial.tartan] ? Object.assign({}, r, { tartan: RS.trial.tartan }) : r;
}
// the preview holds a lady's arms out and forward so her gloves and hands are not lost against the skirt
function pvPose(m, per) {
  if (!m || !m.arms || per.kind !== 'lady') return;
  m.arms.forEach((a, i) => { const sd = i ? 1 : -1; a.rotation.set(-sd * 0.66, 0, 0.5); if (m.elbows && m.elbows[i]) m.elbows[i].rotation.z = 0.7; });
}
function pvBuild(it) {
  const per = pvPerson(it.key); if (!per) return;
  if (it.m) pvDispose(it.m);
  it.m = makePerson3D(per, per.kind, false, false); it.dirty = false; pvPose(it.m, per);
}
function pvReset(key) { const st = PV.st[key]; if (st) { st.ang = 0.35; st.resume = performance.now() / 1000 + 3; } }
function pvRefresh(key) { const it = PV.items[key]; if (it) it.dirty = true; pvStart(); }
function pvAttach(key) {
  const cv = $(key === 'ed' ? 'pvEd' : 'ofCv'), per = pvPerson(key); if (!cv || !per) return;
  const old = PV.items[key]; if (old && old.m) pvDispose(old.m);
  const st = PV.st[key] = PV.st[key] || { ang: 0.35, resume: performance.now() / 1000 + 3, drag: null, last: performance.now() / 1000 };
  if (st.pid !== per.id) { st.pid = per.id; st.ang = 0.35; st.resume = performance.now() / 1000 + 3; } // every new person starts a slight three-quarter turn, still for 3 s
  const it = PV.items[key] = { key, cv, m: null, dirty: false };
  cv.onpointerdown = e => { st.resume = Infinity; st.drag = { x: e.clientX, a: st.ang }; try { cv.setPointerCapture(e.pointerId); } catch (x) { } };
  cv.onpointermove = e => { if (st.drag) { st.ang = st.drag.a + (e.clientX - st.drag.x) * 0.012; pvStart(); } };
  cv.onpointerup = cv.onpointercancel = () => { if (st.drag) { st.drag = null; st.resume = performance.now() / 1000 + 3; } };
  if (!pvInit()) { pvFallback(cv, per); return; }
  try { pvBuild(it); pvDraw(it, performance.now() / 1000); } catch (e) { console.warn('preview failed', e); PV.ok = false; pvFallback(cv, per); return; }
  pvStart();
}
function pvDraw(it, t) {
  if (it.dirty) pvBuild(it);
  if (!it.m || !it.cv.isConnected) return;
  const m = it.m, st = PV.st[it.key], dt = clamp(t - st.last, 0, 0.1); st.last = t;
  if (!st.drag && t > st.resume) st.ang += dt * 0.5;
  const w = it.cv.width, h = it.cv.height;
  if (PV.w !== w || PV.h !== h) { PV.rd.setSize(w, h, false); PV.cam.aspect = w / h; PV.cam.updateProjectionMatrix(); PV.w = w; PV.h = h; }
  if (pvMode(it.key) === 'bust') { const hy = (1.35 * m.k + m.lift * m.k); PV.cam.position.set(0, hy + 0.1, 3.0); PV.cam.lookAt(0, hy, 0); PV.pad.visible = false; } // head, shoulders and as much hair as there is
  else if (pvMode(it.key) === 'chest') { const hy = ((window.__chestY || 1.3) * m.k + m.lift * m.k); PV.cam.position.set(0, hy + 0.06, window.__chestD || 1.25); PV.cam.lookAt(0, hy, 0); PV.pad.visible = false; } // a close look at the shirt front and neckwear (used by the checks)
  else if (pvMode(it.key) === 'head') { const hy = (1.6 * m.k + m.lift * m.k); PV.cam.position.set(0, hy + 0.005, 1.5); PV.cam.lookAt(0, hy - 0.005, 0); PV.pad.visible = false; }
  else { PV.cam.position.set(0, 1.02, 4.5); PV.cam.lookAt(0, 0.97, 0); PV.pad.visible = true; }
  m.root.rotation.y = -Math.PI / 2 + st.ang; heelWobble(m, t); PV.scene.add(m.root);
  PV.rd.render(PV.scene, PV.cam); PV.scene.remove(m.root);
  const c2 = it.cv.getContext('2d'); c2.clearRect(0, 0, w, h); c2.drawImage(PV.rd.domElement, 0, 0);
}
function pvStart() {
  if (PV.on || !PV.ok) return; PV.on = true;
  const loop = ms => {
    const vis = !$('sRoster').hidden || !$('sOutfit').hidden;
    if (!vis || !PV.ok) { PV.on = false; return; }
    Object.values(PV.items).forEach(it => { if (!it) return; const b = it.cv.getBoundingClientRect(); if (it.cv.isConnected && b.bottom > 0 && b.top < innerHeight && b.width > 0) { try { pvDraw(it, ms / 1000); } catch (e) { console.warn(e); } } });
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}
// no WebGL: show the 2D head portrait on the same canvas
function pvFallback(cv, r) {
  const x = cv.getContext('2d'), w = cv.width, h = cv.height; x.clearRect(0, 0, w, h);
  const lady = r.kind === 'lady';
  x.fillStyle = lady ? DRESS[r.dress || 0] : (JACKETC[r.jcol || 0] || '#15171c'); x.beginPath(); x.ellipse(w / 2, h * 0.86, w * 0.36, h * 0.2, 0, Math.PI, TAU); x.fill();
  drawMiiHead(x, r, r.kind, w / 2, h * 0.38, w * 0.3);
}
/* ---------- the Outfitter: a dressing room for your character ---------- */
function chime() { // a small two-note bell when something is bought
  try { band.ensure(); const c = band.ctx; if (!c) return; if (c.state === 'suspended') c.resume(); const t = c.currentTime + 0.01;
    [[880, 0], [1318.5, 0.09]].forEach(([f, dl]) => { const o = c.createOscillator(), g = c.createGain(); o.type = 'sine'; o.frequency.value = f; g.gain.setValueAtTime(0.0001, t + dl); g.gain.exponentialRampToValueAtTime(0.16, t + dl + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dl + 0.6); o.connect(g); g.connect(c.destination); o.start(t + dl); o.stop(t + dl + 0.65); }); } catch (e) { }
}
const OF = { id: null, tab: 'wear', msg: '', tsort: 'default', view: 'full' };
function ofPerson() { return SAVE.roster.find(r => r.id === OF.id) || meP(); }
const optName = (sl, v) => { const o = sl.o.find(q => String(q[0]) === String(v)); return o ? o[1] : String(v); };
const isNone = (sl, v) => sl.none !== undefined && String(sl.none) === String(v);
/* Try before you buy: clicking anything padlocked only puts it on in the preview (OF.trial); the saved person is not touched, so leaving the Outfitter puts everything back. Buy makes it yours. */
function ofTrialOn(r) { return OF.trial && OF.trial.id === r.id ? OF.trial : null; }
function ofView(r) { // the person as the preview shows them: what they own plus whatever is being tried on
  const tr = ofTrialOn(r); if (!tr) return r;
  const c = Object.assign({}, r, { wd: Object.assign({}, WD_DEF, r.wd || {}) });
  Object.keys(tr.w).forEach(id => { const sl = WSLOTS.find(s => s.id === id); if (sl) wset(c, sl.f, tr.w[id]); });
  if (tr.t && TARTANS[tr.t]) c.tartan = tr.t;
  return c;
}
function ofTrialRows(r) {
  const rows = [], tr = ofTrialOn(r); if (!tr) return rows;
  Object.keys(tr.w).forEach(id => { const sl = WSLOTS.find(s => s.id === id), o = sl && sl.o.find(q => String(q[0]) === String(tr.w[id])); if (o && !wOwned(sl, o)) rows.push({ id, name: sl.n + ': ' + o[1], price: o[2] }); });
  if (tr.t && TARTANS[tr.t] && !tartanOwned(tr.t)) rows.push({ id: 't', name: TARTANS[tr.t].name + ' tartan', price: TARTANS[tr.t].cost });
  return rows;
}
function ofTry(r, sl, o) {
  if (!ofTrialOn(r)) OF.trial = { id: r.id, w: {}, t: null };
  OF.trial.w[sl.id] = o[0]; OF.msg = `Trying ${o[1]} for ${o[2]} shillings. Buy to keep it, or Undo.`;
}
function ofBuy(r, which) {
  const tr = ofTrialOn(r), rows = ofTrialRows(r).filter(q => which === 'all' || q.id === which); if (!tr || !rows.length) return '';
  const tot = rows.reduce((a, q) => a + q.price, 0);
  if (SAVE.shillings < tot) return `That costs ${tot} shillings and you have ${SAVE.shillings}. Dance more to earn them, or press Undo to put it back.`;
  SAVE.shillings -= tot; SAVE.wown = SAVE.wown || {}; SAVE.owned = SAVE.owned || {};
  rows.forEach(q => {
    if (q.id === 't') { SAVE.owned[tr.t] = true; r.tartan = tr.t; OF.flash = 't:' + tr.t; tr.t = null; }
    else { const sl = WSLOTS.find(s => s.id === q.id), o = sl.o.find(z => String(z[0]) === String(tr.w[q.id])); SAVE.wown[sl.id + ':' + o[0]] = true; wset(r, sl.f, o[0]); OF.flash = sl.id + '|' + o[0]; delete tr.w[q.id]; }
  });
  chime(); normPerson(r); persist(); return `Bought for ${tot} shillings. It is yours to keep.`;
}
function ofUndo(r, which) {
  const tr = ofTrialOn(r); if (!tr) return;
  if (which === 'all') OF.trial = null; else if (which === 't') tr.t = null; else delete tr.w[which];
  OF.msg = 'Put back what you own.';
}
function ofOptHTML(v, sl, o) { // v is the person as previewed (owned things plus the ones being tried)
  const cur = String(wget(v, sl.f)) === String(o[0]), own = wOwned(sl, o), off = sl.id === 'heel' && (v.shoe === 'ghillie' || v.shoe === 'flat');
  const tag = own ? (o[2] ? '<small>owned</small>' : '') : `<small>${cur ? 'Trying ' : ''}${PADLOCK} ${o[2]} s</small>`;
  return `<button class="ofo ${own ? 'own' : 'lock'} ${cur && !own ? 'trying' : ''}" data-wi="${sl.id}|${o[0]}" aria-pressed="${cur}" ${off ? 'disabled' : ''} title="${esc(o[1])}${own ? '' : ' (' + o[2] + ' shillings. Click to try it on.)'}">${o[3] ? `<i style="background:${o[3]}"></i>` : ''}${esc(o[1])} ${tag}</button>`;
}
function ofSlotHTML(v, sl) {
  const cur = wget(v, sl.f);
  return `<div class="ofsec"><h4>${sl.n}<span>${esc(optName(sl, cur))}</span></h4>${sl.id === 'heel' && (v.shoe === 'ghillie' || v.shoe === 'flat') ? '<div class="note">These shoes are flat.</div>' : ''}<div class="ofopts">${sl.o.map(o => ofOptHTML(v, sl, o)).join('')}</div></div>`;
}
function renderOutfit() {
  const rr = ofPerson(); OF.id = rr.id; if (OF.trial && OF.trial.id !== rr.id) OF.trial = null;
  const r = ofView(rr), rows = ofTrialRows(rr);
  $('purse3').innerHTML = purseHTML();
  $('ofWho').innerHTML = `<select data-ofwho aria-label="Who to dress">${SAVE.roster.map(p => `<option value="${esc(p.id)}" ${p.id === r.id ? 'selected' : ''}>${esc(p.name)}${p.id === SAVE.me ? ' (you)' : ''}</option>`).join('')}</select>`;
  const tabs = [['wear', 'Wearing'], ['c', 'Clothes'], ['e', 'Accessories'], ['t', 'Tartans'], ['face', 'Face'], ['hair', 'Hair']];
  $('ofTabs').innerHTML = tabs.map(([v, n]) => `<button data-otab="${v}" aria-pressed="${OF.tab === v}">${n}</button>`).join('');
  $('ofMsg').textContent = OF.msg || '';
  document.querySelectorAll('[data-ofview]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.ofview === (OF.view || 'full'))));
  const slots = WSLOTS.filter(sl => sl.g === r.kind), tryNote = '<div class="note">Everything here can be tried on for free: click an item to preview it, then press <b>Buy to keep</b>. Padlocked items go back when you leave unless you buy them.</div>';
  let h = '';
  if (OF.tab === 'wear') {
    const tt = TARTANS[r.tartan] || TARTANS.red, tryIds = new Set(rows.map(q => q.id));
    h = `<div class="ofsec"><h4>Equipped<span>${esc(r.name)}, ${r.kind}</span></h4><div class="eqgrid">${slots.filter(sl => !isNone(sl, wget(r, sl.f))).map(sl => {
      const v = wget(r, sl.f), o = sl.o.find(q => String(q[0]) === String(v));
      return `<div class="eqrow"><span><b>${sl.n}</b>${o && o[3] ? `<i style="display:inline-block;width:11px;height:11px;border-radius:50%;background:${o[3]};vertical-align:-1px;margin-right:5px;border:1px solid rgba(255,255,255,.3)"></i>` : ''}${esc(optName(sl, v))}${tryIds.has(sl.id) ? ' <em class="tryp">(trying)</em>' : ''}</span>${sl.none !== undefined ? `<button class="btn ghost small" data-wrm="${sl.id}">Remove</button>` : `<button class="btn ghost small" data-otab="${sl.t}">Change</button>`}</div>`; }).join('')}
      <div class="eqrow"><span><b>Tartan</b>${esc(tt.name)}${tryIds.has('t') ? ' <em class="tryp">(trying)</em>' : ''}</span><button class="btn ghost small" data-otab="t">Change</button></div></div>
      <div class="note" style="margin-top:6px">Not wearing: ${slots.filter(sl => sl.none !== undefined && isNone(sl, wget(r, sl.f))).map(sl => sl.n.toLowerCase()).join(', ') || 'nothing missing'}. Add things from Clothes and Accessories; remove anything with its Remove button.</div></div>`;
  } else if (OF.tab === 't') {
    h = `${SAVE.note ? `<div class="ofsec"><div class="note">${esc(SAVE.note)} <button class="btn ghost small" data-notex>Got it</button></div></div>` : ''}
      <div class="ofsec"><h4>Tartan<span>${esc((TARTANS[r.tartan] || TARTANS.red).name)}</span></h4><div class="note">${esc(r.kind === 'gent' ? 'The kilt, trews, fly plaid, hat band and cravat' : 'The sash and the shawl')} are cut from this. Click any tartan to try it on; padlocked ones are bought once and kept.</div>
      <div class="tcur" style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="seg"><button data-otsort="default" aria-pressed="${OF.tsort !== 'price'}">A to Z</button><button data-otsort="price" aria-pressed="${OF.tsort === 'price'}">Cheapest first</button></span><input type="search" data-tsearch="of" value="${esc(TSEARCH.of || '')}" placeholder="Search ${Object.keys(TARTANS).length} tartans" aria-label="Search tartans" style="background:#0a1210;color:var(--text);border:1px solid var(--rule);border-radius:6px;padding:5px 8px;font-size:14px"></div>
      <div class="tgrid" data-tg style="max-height:420px">${tartanChips(r.tartan, 'data-wear', '', (TSEARCH.of || '').toLowerCase(), OF.tsort, rows.some(q => q.id === 't') ? r.tartan : null)}</div></div>`;
  } else if (OF.tab === 'face' || OF.tab === 'hair') {
    const kit = faceKit(rr);
    h = `<div class="person offace"><div class="note">Every face and hair option is free. Changes show straight away in the preview${OF.tab === 'face' ? ', which moves in to a face close-up' : ''}. This is the same face the Roster edits.</div>${OF.tab === 'face' ? kit.skin + kit.face : kit.hair}</div>`;
  } else h = tryNote + slots.filter(sl => sl.t === OF.tab).map(sl => ofSlotHTML(r, sl)).join('');
  const keep = ($('ofPanel').querySelector('[data-tg]') || {}).scrollTop || 0;
  $('ofPanel').innerHTML = tryBarHTML(rows, 'of') + h;
  const g = $('ofPanel').querySelector('[data-tg]'); if (g) { const on = g.querySelector('[aria-pressed="true"]'); g.scrollTop = keep || (on ? Math.max(0, on.offsetTop - g.clientHeight / 2 + on.offsetHeight / 2) : 0); }
  if (OF.flash) { const fl = OF.flash; OF.flash = null; const el = fl.startsWith('t:') ? $('ofPanel').querySelector(`[data-wear="${fl.slice(2)}"]`) : $('ofPanel').querySelector(`[data-wi="${fl}"]`); if (el) { el.classList.add('bought'); const tg = el.querySelector('small, .tpr'); if (tg) tg.textContent = 'owned'; } const pu = $('purse3'); pu.classList.remove('pflash'); void pu.offsetWidth; pu.classList.add('pflash'); }
  const it = PV.items.of; if (it && it.cv === $('ofCv')) pvRefresh('of'); else pvAttach('of');
}
function ofSet(r, sl, o) { // put on an item you own (or a free one), or take something off
  if (!wOwned(sl, o)) return false;
  if (OF.trial && OF.trial.id === r.id) delete OF.trial.w[sl.id];
  OF.msg = isNone(sl, o[0]) ? `${sl.n}: taken off.` : `${o[1]} is on.`;
  wset(r, sl.f, o[0]); normPerson(r); return true;
}
function drawPortrait(c, r) {
  const x = c.getContext('2d'); x.clearRect(0, 0, 112, 112);
  const real = ctx; ctx = x; // reuse the top-down painter at a fixed scale
  try { drawMiiHead(ctx, r, r.kind, 56, 58, 40); }
  finally { ctx = real; }
}
document.addEventListener('input', ev => {
  const el = ev.target, d = el.dataset || {}, inOf = !!(el.closest && el.closest('#ofPanel')), r = inOf ? ofPerson() : SAVE.slots[RS.sel];
  if (d.name != null && r) { r.name = el.value.trim() || r.name; persist(); const sn = document.querySelector(`#slots [data-slot="${RS.sel}"] .sn`); if (sn) sn.textContent = r.name; }
  else if (d.tsearch != null) { // filter the tartan grid as you type
    const q = el.value.trim().toLowerCase(); TSEARCH[d.tsearch] = el.value;
    const g = el.closest('.tcol, .ofsec').querySelector('.tgrid'); g.querySelectorAll('.tchip').forEach(c => { c.hidden = !!q && !c.dataset.n.includes(q); }); g.scrollTop = 0;
  }
  else if (r && (d.fp != null || d.fskin != null || d.fc != null || d.fhex != null)) { // face sliders and colours: live, no redraw of the panel
    if (d.fp != null) { r.face[d.fp] = +el.value; const o = el.nextElementSibling; if (o) o.textContent = d.fp === 'hl' ? hlName(+el.value) : (+el.value).toFixed(+el.step < 0.1 ? 2 : 1); }
    else if (d.fskin != null) { r.face.sk = skinAt(+el.value / 100); const o = el.nextElementSibling; if (o && o.firstElementChild) o.firstElementChild.style.background = r.face.sk; }
    else if (d.fc != null) { r.face[d.fc] = el.value.toLowerCase(); const hx = el.parentNode.querySelector('.hx'); if (hx) hx.value = el.value; }
    else if (d.fhex != null) { if (!okHex(el.value)) return; r.face[d.fhex] = el.value.toLowerCase(); const cp = el.parentNode.querySelector('input[type=color]'); if (cp) cp.value = el.value; }
    r.face = normFace(r.face); persist(); slotPortrait(SAVE.slots.indexOf(r)); { const pk = inOf ? 'of' : 'ed'; if (pvMode(pk) !== 'full') pvReset(pk); pvRefresh(pk); }
  }
});
document.addEventListener('change', ev => {
  const el = ev.target, d = el.dataset || {}, inOf = !!(el.closest && el.closest('#ofPanel')), fi = inOf ? SAVE.slots.indexOf(ofPerson()) : RS.sel;
  if (el.id === 'selMe') { SAVE.me = el.value; SAVE.partner = 'auto'; persist(); renderMenu(); }
  else if (el.id === 'selPartner') { SAVE.partner = el.value; persist(); }
  else if (d.hsel != null) rosterEdit(RS.sel, r => { r.style = el.value; });
  else if (d.fsel != null) rosterEdit(fi, r => { r.face[d.fsel] = +el.value; }, false, inOf);
  else if (d.ofwho != null) { OF.id = el.value; OF.msg = ''; renderOutfit(); }
  else if (d.fhex != null && el.value.trim() === '') rosterEdit(fi, r => { r.face[d.fhex] = null; }, false, inOf);
  else if (d.fskin != null || d.fc != null || d.fhex != null) { if (inOf) renderOutfit(); else refreshEditor(); } // settle the preset highlights once a drag ends
});
document.addEventListener('click', ev => {
  const b = ev.target.closest('button'); if (!b) return;
  band.ensure(); try { band.ctx && band.ctx.resume(); } catch (e) { }
  const d = b.dataset, inOf = !!b.closest('#ofPanel'), inEd = !!b.closest('#people') || inOf, fi = inOf ? SAVE.slots.indexOf(ofPerson()) : RS.sel;
  if (d.play) newGame(d.play, false);
  else if (d.demo) newGame(d.demo, true);
  else if (d.practice) newGame(d.practice, false, true);
  else if (d.up) { const me = meP(), k = d.up, c = UPGRADES[k].cost[me.upg[k]]; if (SAVE.shillings >= c) { SAVE.shillings -= c; me.upg[k]++; persist(); renderShop(); } }
  else if (d.trick) { const k = d.trick, c = TRICKS[k].cost; if (SAVE.shillings >= c) { SAVE.shillings -= c; SAVE.tricks[k] = true; persist(); renderShop(); } }
  // the Outfitter
  else if (d.wear) { const r = ofPerson(), tt = TARTANS[d.wear]; if (tt) { if (tartanOwned(d.wear)) { r.tartan = d.wear; if (ofTrialOn(r)) OF.trial.t = null; OF.msg = tt.name + ' is on.'; normPerson(r); persist(); } else { if (!ofTrialOn(r)) OF.trial = { id: r.id, w: {}, t: null }; OF.trial.t = d.wear; OF.msg = `Trying ${tt.name} for ${tt.cost} shillings. Buy to keep it, or Undo.`; } } renderOutfit(); }
  else if (d.obuy) { OF.msg = ofBuy(ofPerson(), d.obuy); renderOutfit(); }
  else if (d.oundo) { ofUndo(ofPerson(), d.oundo); renderOutfit(); }
  else if (d.wi) { const r = ofPerson(), [sid, v] = d.wi.split('|'), sl = WSLOTS.find(s => s.id === sid), o = sl && sl.o.find(q => String(q[0]) === v); if (o) { if (wOwned(sl, o)) { if (ofSet(r, sl, o)) persist(); } else ofTry(r, sl, o); } renderOutfit(); }
  else if (d.wrm) { const sl = WSLOTS.find(s => s.id === d.wrm), o = sl && sl.o.find(q => String(q[0]) === String(sl.none)); if (o) { ofSet(ofPerson(), sl, o); persist(); } renderOutfit(); }
  else if (d.otab) { const wasF = OF.tab === 'face' || OF.tab === 'hair'; OF.tab = d.otab; OF.msg = ''; if (d.otab === 'face') OF.view = 'head'; else if (d.otab === 'hair') OF.view = 'bust'; else if (wasF) OF.view = 'full'; pvReset('of'); renderOutfit(); } // the face and hair tabs move the camera in
  else if (d.otsort) { OF.tsort = d.otsort; renderOutfit(); }
  else if (d.notex != null) { delete SAVE.note; persist(); renderOutfit(); }
  // the roster: eight slots and the editor
  else if (d.slot != null) { RS.sel = +d.slot; RS.msg = ''; renderRoster(); }
  else if (d.rtab) { RS.tab = d.rtab; RS.view = null; RS.msg = ''; pvReset('ed'); refreshEditor(); }
  else if (d.rview) { RS.view = d.rview; pvReset('ed'); refreshEditor(); }
  else if (d.ofview) { OF.view = d.ofview; pvReset('of'); document.querySelectorAll('[data-ofview]').forEach(x => x.setAttribute('aria-pressed', String(x.dataset.ofview === OF.view))); pvRefresh('of'); }
  else if (d.create && inEd) { const i = RS.sel; if (!SAVE.slots[i]) { SAVE.slots[i] = newPerson(d.create, i); syncRoster(); claimWorn(SAVE.slots[i]); persist(); } RS.tab = 'look'; renderRoster(); }
  else if (d.clear != null && inEd) { const r = SAVE.slots[RS.sel]; if (r && r.id !== SAVE.me && SAVE.roster.length > 1) { SAVE.slots[RS.sel] = null; syncRoster(); if (SAVE.partner === r.id) SAVE.partner = 'auto'; persist(); renderRoster(); } }
  else if (d.danceas != null && inEd) { const r = SAVE.slots[RS.sel]; if (r) { SAVE.me = r.id; SAVE.partner = 'auto'; persist(); renderRoster(); } }
  else if (d.ofopen != null) { const r = SAVE.slots[RS.sel]; if (r) { OF.id = r.id; OF.tab = 'wear'; OF.msg = ''; showScreen('sOutfit'); } }
  else if (d.kind && inEd) rosterEdit(RS.sel, r => { r.kind = d.kind; });
  else if (d.ht && inEd) rosterEdit(RS.sel, r => { r.height = clamp(Math.round((r.height + (+d.ht) * 0.02) * 100) / 100, 1.5, 2.0); });
  else if (d.skin != null && inEd) rosterEdit(fi, r => { r.skin = +d.skin; r.face.sk = null; }, false, inOf);
  else if (d.hair != null && inEd) rosterEdit(fi, r => { r.hair = +d.hair; r.face.hc = null; }, false, inOf);
  else if (d.fcp && inEd) { const [k, c] = d.fcp.split('|'); rosterEdit(fi, r => { r.face[k] = c; }, false, inOf); }
  else if (d.hst && inEd) rosterEdit(fi, r => { r.style = d.hst; }, false, inOf);
  else if (d.fclr && inEd) rosterEdit(fi, r => { r.face[d.fclr] = null; }, false, inOf);
  else if (d.fseg && inEd) rosterEdit(fi, r => { r.face[d.fseg] = +d.v; }, false, inOf);
  else if (d.rand != null && inEd) rosterEdit(fi, r => randomiseFace(r), false, inOf);
  else if (d.fdef != null && inEd) rosterEdit(fi, r => { r.face = normFace({ v: r.face.v }); r.face.hc = null; }, false, inOf);
  else if (d.tsort && inEd) { RS.tsort = d.tsort; refreshEditor(); }
  else if (d.tartan && inEd) { const r0 = SAVE.slots[RS.sel]; if (r0) { // owned: wear it. Padlocked: only try it on in the preview, with a Buy button
    if (tartanOwned(d.tartan)) { RS.trial = null; rosterEdit(RS.sel, r => { r.tartan = d.tartan; RS.msg = TARTANS[d.tartan].name + ' is on.'; }); }
    else { RS.trial = { id: r0.id, tartan: d.tartan }; RS.msg = ''; pvRefresh('ed'); refreshEditor(); } } }
  else if (d.tbuy && inEd) { const r0 = SAVE.slots[RS.sel], tr = RS.trial; if (r0 && tr && tr.id === r0.id) { const msg = tartanBuyWear(r0, tr.tartan); if (tartanOwned(tr.tartan)) { RS.trial = null; chime(); normPerson(r0); persist(); } RS.msg = msg; refreshEditor(); } }
  else if (d.trevert && inEd) { RS.trial = null; RS.msg = 'Put back what you own.'; pvRefresh('ed'); refreshEditor(); }
  else if (b.id === 'bOutfit' || b.id === 'bResOutfit') { OF.id = SAVE.me; OF.tab = 'wear'; OF.msg = ''; showScreen('sOutfit'); }
  else if (b.closest('#segDiff')) { SAVE.diff = d.v; persist(); renderMenu(); }
  else if (b.closest('#segLag')) { SAVE.lag = +d.v; persist(); renderMenu(); }
  else if (b.closest('#segTravel')) { SAVE.travel = d.v; persist(); renderMenu(); }
  else if (b.closest('#segSens')) { SAVE.sens = d.v; persist(); renderMenu(); }
  else if (b.closest('#segVoice')) { SAVE.voice = d.v === 'on'; persist(); renderMenu(); }
  else if (b.closest('#segView')) { SAVE.view = d.v; if (SAVE.view === 'fp') init3D(); persist(); renderMenu(); }
  else if (b.id === 'bShop' || b.id === 'bResShop') showScreen('sShop');
  else if (b.id === 'bHow') showScreen('sHow');
  else if (b.id === 'bRoster') showScreen('sRoster');
  else if (b.id === 'bShopBack' || b.id === 'bHowBack' || b.id === 'bResMenu' || b.id === 'bRosterBack' || b.id === 'bOutfitBack') { game = null; showScreen('sMenu'); }
  else if (b.id === 'bAgain') { newGame(game.key, false, game.practice); }
  else if (b.id === 'bQuit') quit();
  else if (b.id === 'bMute') toggleMusic();
  else if (b.id === 'bView' || b.id === 'bView2') toggleView();
  else if (b.id === 'bMute2') toggleMusic();
  else if (b.id === 'bPause') setPaused(!game.paused);
  else if (b.id === 'bResume') setPaused(false);
});
function quit() { band.stop(); try { speechSynthesis.cancel(); } catch (e) { } try { band.ctx && band.ctx.resume(); } catch (e) { } game = null; keys.clear(); $('touch').classList.remove('play'); $('hud').hidden = true; $('topbtns').hidden = true; $('pauseOv').hidden = true; showScreen('sMenu'); }
function toggleMusic() { SAVE.music = !band.on; band.setOn(SAVE.music); persist(); $('bMute').textContent = SAVE.music ? 'Music on' : 'Music off'; }
function toggleView() {
  SAVE.view = SAVE.view === 'fp' ? 'top' : 'fp';
  if (SAVE.view === 'fp' && !init3D()) { SAVE.view = 'top'; if (game) pop(game, '3D view unavailable here', '#a7b6ad'); }
  persist(); applyView(); updateKeysHint();
  if (game && SAVE.view === 'fp') { build3DGame(game); if (game.p.faceT != null) game.p.yaw = game.p.faceT; }
}
function applyView() {
  const fp = SAVE.view === 'fp' && R3.ready && !!game;
  $('gl').classList.toggle('on', fp);
  $('bView').textContent = SAVE.view === 'fp' ? 'From above' : 'First person';
}
function setTouchButtons(g) {
  const b = (k, label, cls) => `<button class="tb ${cls || ''}" data-k="${k}">${label}</button>`;
  $('tbtns').innerHTML = b('KeyT', 'TURN', 'hand big') + b('Space', 'SET', 'set') + b('KeyH', 'HOOCH') + b('KeyR', 'TWIRL') + b('KeyF', 'HIGH CUT') + (SAVE.tricks.fling ? b('KeyG', 'FLING') : '') + (SAVE.tricks.heeltoe ? b('KeyJ', 'HEEL-TOE') : '') + (SAVE.tricks.heli ? b('KeyB', 'HELI') : '')
    + Object.entries(TRICKS).filter(([k, tr]) => tr.move && SAVE.tricks[k]).map(([k, tr]) => b(tr.code, ({ clap: 'CLAP', leap: 'SPRING', heel: 'HEEL', pirouette: 'SPIN', bow: 'BOW' })[k] || tr.name.toUpperCase())).join('');
}
function updateKeysHint() {
  const tr = SAVE.tricks, fp = SAVE.view === 'fp', lady = meP().kind === 'lady';
  $('hKeys').innerHTML = (fp ? `<b>W</b>/<b>S</b> walk · <b>A</b>/<b>D</b> sidestep · <b>←</b>/<b>→</b> look` : `<b>WASD</b> move`) + ` · hold <b>T</b> turn · <b>Space</b> set<br><b>H</b> hooch · <b>R</b> ${tr.twirl ? 'twirl, or ' : ''}${lady ? 'spin under his arm' : 'spin her'} mid-turn${tr.highcut ? ' · <b>F</b> high cut' : ''}${tr.fling ? ' · <b>G</b> fling' : ''}${tr.heeltoe ? ' · <b>J</b> heel-toe' : ''}${tr.heli ? ' · <b>B</b> helicopter' : ''} · <b>V</b> view · <b>P</b> pause`
    + (Object.keys(TRICKS).some(k => TRICKS[k].move && tr[k]) ? '<br>' + Object.entries(TRICKS).filter(([k, t2]) => t2.move && tr[k]).map(([k, t2]) => `<b>${t2.key}</b> ${t2.name.toLowerCase()}`).join(' · ') + ' <span style="opacity:.7">(green flair pulse every 2 bars)</span>' : '');
  $('bMute').textContent = SAVE.music ? 'Music on' : 'Music off';
}

/* ---------- keyboard, mouse and touch ---------- */
function press(code) {
  const g = game; if (!g || g.done || g.paused) return;
  if (code === 'KeyQ' || code === 'KeyE' || code === 'KeyT') onHandDown(g);
  else if (code === 'Space') onStep(g, false);
  else if (code === 'KeyH') onHooch(g);
  else if (code === 'KeyR') onTwirl(g);
  else if (code === 'KeyF') onHighCut(g);
  else if (code === 'KeyG') onFancyStep(g, 'fling');
  else if (code === 'KeyJ') onFancyStep(g, 'heeltoe');
  else if (code === 'KeyB') onHeli(g);
  else { const mk = moveByCode(code); if (mk) onMove(g, mk); }
}
function release(code) { const g = game; if (!g || g.done) return; if (code === 'KeyQ' || code === 'KeyE' || code === 'KeyT') onHandUp(g); }
const GAME_KEYS = new Set(['KeyT', 'KeyQ', 'KeyE', 'Space', 'KeyH', 'KeyR', 'KeyF', 'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);
Object.values(TRICKS).forEach(tr => { if (tr.code) GAME_KEYS.add(tr.code); }); // every move's key comes from the TRICKS table
window.addEventListener('keydown', e => {
  if (!game || game.done) return;
  if (e.target && e.target.tagName === 'INPUT') return;
  if (e.code === 'Escape') { setPaused(!game.paused); return; }
  if (e.code === 'KeyP') { setPaused(!game.paused); return; }
  if (e.code === 'KeyM') { toggleMusic(); return; }
  if (e.code === 'KeyV') { toggleView(); return; }
  if (!GAME_KEYS.has(e.code)) return;
  e.preventDefault(); if (game.demo || e.repeat) return;
  keys.add(e.code); press(e.code);
});
window.addEventListener('keyup', e => { if (!game || game.demo) return; if (!GAME_KEYS.has(e.code)) return; keys.delete(e.code); release(e.code); });
window.addEventListener('blur', () => { if (!game || game.demo) return; ['KeyQ', 'KeyE', 'KeyT'].forEach(k => { if (keys.has(k)) { keys.delete(k); release(k); } }); keys.clear(); });
document.addEventListener('visibilitychange', () => { if (document.hidden && game && !game.done && !game.demo) setPaused(true); });
(function mouse() {
  const st = $('stage'); let drag = null;
  let did = null;
  let ty0 = null;
  st.addEventListener('pointerdown', e => { if (!game || e.target.closest('button,#stick,.screen,.pause,.tb')) return; drag = e.clientX; ty0 = e.clientY; did = e.pointerId; if (SAVE.travel === 'trace') try { st.setPointerCapture(e.pointerId); } catch (_) { } });
  window.addEventListener('pointermove', e => { if (drag == null || e.pointerId !== did) return; if (SAVE.travel === 'trace') { traceAcc.x += e.clientX - drag; traceAcc.y += SAVE.view === 'fp' ? -(e.clientY - ty0) : e.clientY - ty0; } else if (SAVE.view === 'fp') mouseLook += (e.clientX - drag) * sens().look; drag = e.clientX; ty0 = e.clientY; });
  const stop = e => { if (e.pointerId === did) { drag = null; did = null; ty0 = null; } };
  window.addEventListener('pointerup', stop); window.addEventListener('pointercancel', stop);
})();
(function touchSetup() {
  const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (coarse) { $('touch').classList.add('on'); document.body.classList.add('touch'); }
  const st = $('stick'), nub = $('nub'); let sid = null;
  const setStick = (e) => { const r = st.getBoundingClientRect(); let dx = (e.clientX - (r.left + r.width / 2)) / (r.width / 2), dy = (e.clientY - (r.top + r.height / 2)) / (r.height / 2); const l = Math.hypot(dx, dy); if (l > 1) { dx /= l; dy /= l; } nub.style.transform = `translate(${dx * 36}px,${dy * 36}px)`; const m = Math.min(1, l); const out = m < 0.14 ? 0 : (m - 0.14) / 0.86; stick = m ? { x: dx / Math.max(m, 1e-6) * out, y: dy / Math.max(m, 1e-6) * out } : { x: 0, y: 0 }; };
  st.addEventListener('pointerdown', e => { e.stopPropagation(); sid = e.pointerId; st.setPointerCapture(sid); setStick(e); });
  st.addEventListener('pointermove', e => { if (e.pointerId === sid) setStick(e); });
  const end = e => { if (e.pointerId !== sid) return; sid = null; stick = { x: 0, y: 0 }; nub.style.transform = ''; };
  st.addEventListener('pointerup', end); st.addEventListener('pointercancel', end);
  const box = $('tbtns'); const held = new Map();
  box.addEventListener('pointerdown', e => { const b = e.target.closest('.tb'); if (!b) return; e.preventDefault(); e.stopPropagation(); try { b.setPointerCapture(e.pointerId); } catch (_) { } b.classList.add('down'); held.set(e.pointerId, b); const k = b.dataset.k; if (!game || game.demo) return; keys.add(k); press(k); });
  const up = e => { const b = held.get(e.pointerId); if (!b) return; held.delete(e.pointerId); b.classList.remove('down'); const k = b.dataset.k; if (!game || game.demo) return; keys.delete(k); release(k); };
  box.addEventListener('pointerup', up); box.addEventListener('pointercancel', up);
})();
