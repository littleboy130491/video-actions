/* engine/v2.js — BYGY v2 "Kata kunci": airy 3D space, search pill, CSS device mockups, giant type.
 * Pure function of t (seek), deterministic. Needs kit.js (K easing / typeSchedule / rng). Exposes window.V. */
(function () {
'use strict';
const V = window.V = {};
const K = window.K, E = K.E, clamp = K.clamp, lerp = K.lerp;
V.ramp = K.ramp; V.seg = K.seg; V.E = E;
V.PINK = '#F77CA0'; V.RED = '#FF3548'; V.DPINK = '#EE225B';
const mk = (tag, cls, parent, css) => { const e = document.createElement(tag); if (cls) e.className = cls; if (css) e.style.cssText = css; if (parent) parent.appendChild(e); return e; };
V.mk = mk;
const f2 = v => (+v).toFixed(3);
V.mixv = (a, b, u) => { const o = {}; for (const k in a) o[k] = (typeof a[k] === 'number' && typeof b[k] === 'number') ? lerp(a[k], b[k], u) : (u < .5 ? a[k] : b[k]); for (const k in b) if (!(k in o)) o[k] = b[k]; return o; };
/** keyed track: [[t, {..}, ease], ...] -> object at t (ease of the segment end key) */
V.track = keys => t => {
  if (t <= keys[0][0]) return { ...keys[0][1] };
  for (let i = 1; i < keys.length; i++) {
    const [ta, a] = keys[i - 1], [tb, b, e] = keys[i];
    if (t <= tb) return V.mixv(a, b, (E[e || 'inOutCubic'])(K.seg(t, ta, tb)));
  }
  return { ...keys[keys.length - 1][1] };
};

/* ---------- stage ---------- */
V.init = function (o = {}) {
  const st = mk('div', '', document.body); st.id = 'stage';
  V.sky = mk('div', '', st); V.sky.id = 'sky';
  V.view = mk('div', '', st); V.view.id = 'view';
  V.P = o.persp || 2400; V.view.style.perspective = V.P + 'px';
  V.world = mk('div', '', V.view); V.world.id = 'world';
  V.over = mk('div', '', st); V.over.id = 'over';
  V.skyAt(0);
  return V;
};
/** airy sky: white -> soft blue -> pink haze. k: 0..1 shifts the haze, warm: pinkness */
V.skyAt = function (k = 0, warm = .5, blue = .5) {
  const by = 20 + 30 * k, py = 90 - 25 * k;
  V.sky.style.background =
    `radial-gradient(120% 60% at ${30 + 30 * k}% ${by}%, rgba(211,241,253,${.95 * blue}) 0%, rgba(211,241,253,0) 60%),` +
    `radial-gradient(90% 50% at ${80 - 20 * k}% ${py}%, rgba(254,214,226,${.85 * warm}) 0%, rgba(254,214,226,0) 62%),` +
    `radial-gradient(70% 40% at 50% 55%, rgba(255,255,255,.95) 0%, rgba(255,255,255,0) 70%),` +
    `linear-gradient(180deg,#F7FBFD 0%,#F4F4F4 55%,#FBF3F6 100%)`;
};
/** camera: target {x,y,z}, distance d (d=P -> 1:1 at target), rotations rx, ry, rz (deg) */
V.cam = function (c) {
  const d = c.d ?? V.P; if (V._canvas) V._canvas.upd(c);
  V.world.style.transform = `translateZ(${f2(V.P - d)}px) rotateZ(${f2(c.rz || 0)}deg) rotateX(${f2(c.rx || 0)}deg) rotateY(${f2(c.ry || 0)}deg) translate3d(${f2(-(c.x || 0))}px,${f2(-(c.y || 0))}px,${f2(-(c.z || 0))}px)`;
};
/** camera matrix (same chain as V.cam) and perspective projection of a world point to screen px */
V.camMat = c => new DOMMatrix().translate(0, 0, V.P - (c.d ?? V.P)).rotateAxisAngle(0, 0, 1, c.rz || 0).rotateAxisAngle(1, 0, 0, c.rx || 0).rotateAxisAngle(0, 1, 0, c.ry || 0).translate(-(c.x || 0), -(c.y || 0), -(c.z || 0));
V.proj = (m, x, y, z) => { const q = m.transformPoint(new DOMPoint(x, y, z)); const k = V.P / (V.P - q.z); return { x: 540 + q.x * k, y: 960 + q.y * k, z: q.z }; };
V.obj = function (parent, w = 0, h = 0, css = '') { const e = mk('div', 'o', parent || V.world, `width:${w}px;height:${h}px;margin-left:${-w / 2}px;margin-top:${-h / 2}px;` + css); return e; };
V.tf = function (e, p) {
  e.style.transform = `translate3d(${f2(p.x || 0)}px,${f2(p.y || 0)}px,${f2(p.z || 0)}px) rotateY(${f2(p.ry || 0)}deg) rotateX(${f2(p.rx || 0)}deg) rotateZ(${f2(p.rz || 0)}deg) scale(${f2(p.s ?? 1)})`;
  if (p.a != null) e.style.opacity = f2(clamp(p.a));
};
/** matrix of the same chain as V.tf */
V.mat = (p, m = new DOMMatrix()) => m.translate(p.x || 0, p.y || 0, p.z || 0).rotateAxisAngle(0, 1, 0, p.ry || 0).rotateAxisAngle(1, 0, 0, p.rx || 0).rotateAxisAngle(0, 0, 1, p.rz || 0).scale(p.s ?? 1, p.s ?? 1, p.s ?? 1);

/* ---------- typing ---------- */
V.typer = function (text, o = {}) {
  const keys = [...text].map(ch => ({ ch }));
  let s = K.typeSchedule(keys, { seed: o.seed || 3, speed: o.speed || 1, typoAt: o.typoAt ?? -1, typoChars: o.typoChars });
  let ev = s.events, end = s.end;
  if (o.dur) { const k = o.dur / end; ev = ev.map(e => ({ ...e, t: e.t * k })); end = o.dur; }
  return {
    end, ev,
    at(t) { // t relative to typing start
      if (t < 0) return { s: '', n: 0, done: false };
      let cur = null; for (const e of ev) { if (e.t <= t) cur = e; else break; }
      if (!cur) return { s: '', n: 0, done: false };
      return { s: text.slice(0, cur.n) + (cur.wrong || ''), n: cur.n, done: t >= end };
    },
    times(t0) { return ev.map(e => t0 + e.t); }
  };
};
V.blink = (t, t1) => t < t1 ? 1 : (Math.floor((t - t1) / .5) % 2 === 0 ? 1 : 0);

/* ---------- search pill (screen-space overlay with own perspective) ---------- */
V.pill = function (o = {}) {
  const w = o.w || 820, h = o.h || 128, fs = o.fs || 50;
  const wrap = mk('div', '', o.parent || V.over, `position:absolute;left:0;top:0;width:${w}px;height:${h}px;margin:${-h / 2}px 0 0 ${-w / 2}px;transform-style:preserve-3d`);
  const p = mk('div', 'pill', wrap, `width:${w}px;height:${h}px;padding:0 ${h * .16}px 0 ${h * .3}px;gap:${h * .2}px`);
  const mh = h * .44, mw = mh * 106 / 122;
  const m = mk('div', 'mk', p, `width:${mw}px;height:${mh}px`);
  mk('img', '', m, `height:${mh}px;width:${mh * 446 / 122}px`).src = '../assets/final/logo.png';
  mk('div', '', p, `flex:none;width:2px;height:${h * .36}px;background:#E6E6E6`);
  const tx = mk('div', 'tx', p, `font-size:${fs}px;height:${h}px`);
  const ic = mk('div', 'ic', p, `width:${h * .72}px;height:${h * .72}px`);
  ic.innerHTML = `<svg viewBox="0 0 48 48" width="100%" height="100%"><circle cx="22.5" cy="22.5" r="7.5" fill="none" stroke="#fff" stroke-width="2.6"/><path d="M28 28L33 33" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/></svg>`;
  const P = { wrap, p, tx, ic, w, h, fs,
    set(q) {
      wrap.style.display = (q.a ?? 1) <= .005 ? 'none' : 'block';
      wrap.style.opacity = f2(clamp(q.a ?? 1));
      wrap.style.transform = `translate(${f2(q.x ?? 540)}px,${f2(q.y ?? 960)}px) perspective(1800px) rotateX(${f2(q.rx || 0)}deg) rotateY(${f2(q.ry || 0)}deg) scale(${f2(q.s ?? 1)})`;
      const txt = q.text || '';
      const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
      let html = q.sel ? `<span class="sel">${esc(txt)}</span>` : esc(txt);
      if (!txt && q.ph) html = `<span style="color:#B9B9B9">${esc(q.ph)}</span>`;
      if (q.caret) html = (q.ph && !txt ? '' : html) + `<span class="cr" style="width:${fs * .06}px;height:${fs * 1.05}px"></span>` + (q.ph && !txt ? `<span style="color:#B9B9B9;margin-left:4px">${esc(q.ph)}</span>` : '');
      if (html !== P._h) { tx.innerHTML = html; P._h = html; }
      ic.style.transform = `scale(${f2(1 - .1 * (q.press || 0))})`;
    },
    /** icon centre in screen px for a given set() state (no rotation) */
    iconAt(q) { const s = q.s ?? 1; return { x: (q.x ?? 540) + s * (w / 2 - h * .16 - h * .36), y: q.y ?? 960, r: s * h * .36 }; }
  };
  return P;
};
/** standard pill timing used by every keyword: enter, click, type, hold, exit */
V.pillRun = function (P, t, o) {
  const T = o.typer, t0 = o.t0, tType = t0 + (o.lead ?? .18);
  const enter = o.stay ? 1 : V.ramp(t, t0 - .25, t0 + .05, 'outCubic');
  const exit = o.out != null ? V.ramp(t, o.out, o.out + .35, 'inCubic') : 0;
  const r = T.at(t - tType);
  const fl = Math.sin(t * 1.7) * 4;
  P.set({ x: o.x ?? 540, y: (o.y ?? 960) + (1 - enter) * 60 + exit * 80 + fl, s: (o.s ?? 1) * (.94 + .06 * enter) * (1 - .05 * exit),
    rx: (o.rx ?? 8) * (1 - enter) + (o.rx0 ?? 0), ry: o.ry ?? 0, a: enter * (1 - exit), text: o.prev && t < tType ? o.prev : r.s,
    sel: o.prev && t < tType && t > tType - .22, caret: V.blink(t, tType + T.end) && t > t0 - .05, press: K.pulse(t, tType + T.end + .12, tType + T.end + .3, .04, .08) });
  return { tEnd: tType + T.end, enterAt: tType + T.end + .2 };
};

/* ---------- cursor ---------- */
const ARROW = `<svg width="30" height="44" viewBox="0 0 30 44" style="position:absolute;left:-2px;top:-2px;overflow:visible"><g transform="translate(2,2) scale(1.45)"><path d="M0 0 L0 22.6 L5.4 17.4 L9.1 26 L12.7 24.5 L9.1 16.1 L16.6 16.1 Z" fill="#111" stroke="#fff" stroke-width="1.15" stroke-linejoin="round"/></g></svg>`;
const EYED = `<svg width="40" height="40" viewBox="0 0 40 40" style="position:absolute;left:-3px;top:-35px;overflow:visible"><g transform="translate(3,35) rotate(-45)"><path d="M0 0 L4 -3 L4 3 Z" fill="#111"/><rect x="4" y="-3.2" width="17" height="6.4" rx="1.2" fill="#fff" stroke="#111" stroke-width="1.6"/><rect x="20" y="-6" width="5" height="12" rx="1.5" fill="#111" stroke="#fff" stroke-width="1.2"/><rect x="25" y="-4.5" width="9" height="9" rx="3.5" fill="#111" stroke="#fff" stroke-width="1.2"/></g></svg>`;
const CROSS = `<svg width="40" height="40" viewBox="-20 -20 40 40" style="position:absolute;left:-20px;top:-20px;overflow:visible"><path d="M0 -13V13M-13 0H13" stroke="#fff" stroke-width="4" stroke-linecap="square"/><path d="M0 -12V12M-12 0H12" stroke="#111" stroke-width="1.6"/></svg>`;
V.cursor = function (parent, scale = 1) {
  const c = mk('div', 'cur', parent, 'z-index:50'); c.innerHTML = `<div class="k-arrow">${ARROW}</div><div class="k-eyedrop">${EYED}</div><div class="k-cross">${CROSS}</div>`;
  const ks = { arrow: c.children[0], eyedrop: c.children[1], cross: c.children[2] };
  return { el: c, set(q) { if (!q || (q.a ?? 1) < .01) { c.style.display = 'none'; return; } c.style.display = 'block'; c.style.opacity = q.a ?? 1;
    for (const k in ks) ks[k].style.display = (q.kind || 'arrow') === k ? 'block' : 'none';
    c.style.transform = `translate(${f2(q.x)}px,${f2(q.y)}px) scale(${f2((q.sc ?? scale) * (1 - .1 * (q.press || 0)))})`; } };
};

/* ---------- iframe pages ---------- */
V.frames = [];
V.page = function (parent, src, w = 1200, h = 3469) {
  const f = mk('iframe', '', parent, `position:absolute;left:0;top:0;border:0;width:${w}px;height:${h}px`); f.setAttribute('scrolling', 'no');
  const pr = new Promise((res, rej) => { f.onload = async () => { const d = f.contentDocument; d.documentElement.style.overflow = 'hidden'; await d.fonts.ready; await Promise.all([...d.images].map(i => i.decode().catch(() => 0))); res(); }; f.onerror = rej; });
  f.src = src; V.frames.push(pr);
  f.q = id => f.contentDocument.querySelector(`[data-el="${id}"]`);
  return f;
};
// touched style registry (restored every frame -> pure)
const touched = new Map();
V.st = function (el, css) { if (!el) return; let o = touched.get(el); if (!o) { o = {}; touched.set(el, o); }
  for (const k in css) { if (!(k in o)) o[k] = el.style[k]; el.style[k] = css[k]; } };
V.txt = function (el, s) { if (!el) return; let o = touched.get(el); if (!o) { o = {}; touched.set(el, o); } if (!('__html' in o)) o.__html = el.innerHTML; el.innerHTML = s; };
V.reset = function () { for (const [el, o] of touched) for (const k in o) { if (k === '__html') { if (el.innerHTML !== o[k]) el.innerHTML = o[k]; } else el.style[k] = o[k]; } };
V.hide = (els, a = 0) => { for (const e of [].concat(els)) V.st(e, { opacity: String(a) }); };
/** type into a design text element with a caret (colour of the text) */
V.typeEl = function (el, r, caret) {
  if (!el) return; let o = touched.get(el); const full = (o && '__html' in o) ? null : el.innerHTML;
  const fs = parseFloat(getComputedStyle(el).fontSize);
  V.txt(el, r.s.replace(/&/g, '&amp;').replace(/</g, '&lt;') + (caret ? `<span style="display:inline-block;width:${Math.max(2, fs * .05)}px;height:${fs}px;background:currentColor;vertical-align:-${fs * .12}px;margin-left:1px"></span>` : ''));
};

/* ---------- devices ---------- */
/** generic laptop. origin = hinge centre. W = lid width (world px). content cw x ch shown at scale s */
V.laptop = function (parent, o = {}) {
  const W = o.W || 1000, cw = o.cw || 1200, chv = o.ch || 750;
  const b = W * .02, chin = W * .034, sw = W - 2 * b, s = sw / cw, sh = chv * s, Hl = sh + b + chin;
  const root = mk('div', 'o', parent || V.world);
  const lid = mk('div', 'o', root, `left:${-W / 2}px;top:${-Hl}px;width:${W}px;height:${Hl}px;transform-origin:50% 100%`);
  const rad = `${W * .022}px ${W * .022}px ${W * .006}px ${W * .006}px`;
  const parts = [];
  for (let k = 1; k <= 5; k++) parts.push(mk('div', 'f', lid, `inset:0;border-radius:${rad};background:${k === 5 ? 'linear-gradient(180deg,#d7dadf,#b9bdc4)' : '#c3c7cd'};transform:translateZ(${-k * 1.6}px)`));
  const front = mk('div', 'lidf', lid, `border-radius:${rad}`);
  const label = mk('div', 'f', lid, `left:${b}px;top:${b - 34}px;font:500 22px Poppins;color:#8C8C8C;white-space:nowrap;display:none`);
  parts.push(mk('div', 'f', front, `left:50%;top:${b * .38}px;width:${b * .26}px;height:${b * .26}px;margin-left:${-b * .13}px;border-radius:50%;background:#2b2e33;box-shadow:inset 0 0 0 1px #3a3e45`));
  const scr = mk('div', 'scr', front, `left:${b}px;top:${b}px;width:${sw}px;height:${sh}px;border-radius:${W * .004}px`);
  const ct = mk('div', 'ct', scr, `width:${cw}px;height:${chv}px;transform:scale(${s})`);
  const glare = mk('div', 'glare', scr);
  // base
  const Wb = W * 1.016, D = W * .64, T = W * .016;
  const base = mk('div', 'o', root, `left:${-Wb / 2}px;top:0;width:${Wb}px;height:${D}px;transform-origin:50% 0;transform:rotateX(90deg)`);
  const deck = mk('div', 'f', base, `inset:0;border-radius:${W * .004}px ${W * .004}px ${W * .03}px ${W * .03}px;background:linear-gradient(180deg,#dcdfe3 0%,#e7e9ec 40%,#d9dce0 100%);box-shadow:inset 0 0 0 1px rgba(255,255,255,.6)`);
  mk('div', 'f', deck, `left:${W * .08}px;right:${W * .08}px;top:0;height:${D * .028}px;background:linear-gradient(180deg,#4b4f56,#7b8088);border-radius:0 0 ${W * .01}px ${W * .01}px`);
  const kb = mk('div', 'f', deck, `left:${Wb * .085}px;width:${Wb * .83}px;top:${D * .075}px;height:${D * .45}px;border-radius:${W * .008}px;background:#c4c8ce;box-shadow:inset 0 1px 3px rgba(0,0,0,.18);padding:${W * .006}px;display:grid;grid-template-columns:repeat(14,1fr);grid-template-rows:.55fr repeat(5,1fr);gap:${W * .0045}px`);
  for (let r = 0; r < 6; r++) for (let c = 0; c < 14; c++) {
    if (r === 5 && c > 4 && c < 10) { if (c === 5) mk('div', '', kb, `grid-column:6 / span 5;background:#2c2e33;border-radius:${W * .0025}px;box-shadow:0 1px 0 rgba(0,0,0,.35)`); continue; }
    mk('div', '', kb, `background:#2c2e33;border-radius:${W * .0025}px;box-shadow:0 1px 0 rgba(0,0,0,.35)`);
  }
  mk('div', 'f', deck, `left:${Wb * .31}px;width:${Wb * .38}px;top:${D * .58}px;height:${D * .34}px;border-radius:${W * .012}px;background:linear-gradient(180deg,#d3d6db,#dadde1);box-shadow:inset 0 0 0 1px rgba(0,0,0,.08)`);
  mk('div', 'f', base, `inset:0;border-radius:inherit;transform:translateZ(${-T}px);background:#9fa4ab`);
  const fr = mk('div', 'f', root, `left:${-Wb / 2}px;top:0;width:${Wb}px;height:${T}px;transform:translateZ(${D}px);border-radius:0 0 ${W * .03}px ${W * .03}px/0 0 ${T}px ${T}px;background:linear-gradient(180deg,#c9ccd1,#9ea3aa)`);
  mk('div', 'f', fr, `left:50%;top:0;width:${W * .11}px;height:${T * .45}px;margin-left:${-W * .055}px;border-radius:0 0 ${T}px ${T}px;background:linear-gradient(180deg,#a7abb2,#c1c4c9)`);
  for (const sx of [-Wb / 2, Wb / 2]) mk('div', 'f', root, `left:${sx}px;top:0;width:${D}px;height:${T}px;transform-origin:0 0;transform:rotateY(-90deg);background:linear-gradient(180deg,#c3c7cc,#9aa0a7)`);
  const sh1 = mk('div', 'f', root, `left:${-Wb * .7}px;top:${-D * .75}px;width:${Wb * 1.4}px;height:${D * 1.5}px;transform:translate3d(0,${T + 1}px,${D / 2}px) rotateX(90deg);background:radial-gradient(50% 50% at 50% 50%,rgba(40,50,80,.22) 0%,rgba(40,50,80,.10) 45%,rgba(40,50,80,0) 100%)`);
  const sh2 = mk('div', 'f', root, `left:${-Wb * .52}px;top:${-D * .53}px;width:${Wb * 1.04}px;height:${D * 1.06}px;transform:translate3d(0,${T + .5}px,${D / 2}px) rotateX(90deg);border-radius:40px;background:radial-gradient(50% 50% at 50% 50%,rgba(30,35,55,.35) 70%,rgba(30,35,55,0) 100%)`);
  parts.push(base, fr, sh1, sh2, ...root.querySelectorAll(':scope > .f[style*="rotateY(-90deg)"]'));
  const L = { root, lid, scr, ct, glare, W, Hl, s, sw, sh, b, D, T, cw, ch: chv, tilt: 12, shadows: [sh1, sh2], label, front, parts,
    /** a: device body opacity (0 = only the screen content shows, like a frame on the canvas); clipB: content px hidden at the bottom */
    body(a, clipB = 0) { for (const e of parts) { e.style.opacity = a; e.style.display = a < .005 ? 'none' : ''; }
      front.style.background = a < .01 ? 'none' : `rgba(13,14,16,${a})`; front.style.boxShadow = a < .01 ? 'none' : `inset 0 0 0 2px rgba(174,179,186,${a}),inset 0 0 0 3px rgba(38,40,44,${a})`;
      scr.style.clipPath = clipB > 0 ? `inset(0 0 ${clipB * s}px 0)` : ''; scr.style.borderRadius = (W * .004 * a) + 'px'; glare.style.opacity = a; },
    set(p) { V.tf(root, p); lid.style.transform = `rotateX(${f2(p.tilt ?? 12)}deg)`; L.tilt = p.tilt ?? 12; L.p = p;
      const g = (p.ry || 0) * 1.6 + (p.glare || 0);
      glare.style.background = `linear-gradient(${112 + g * .3}deg, rgba(255,255,255,0) ${32 + g}%, rgba(255,255,255,.075) ${46 + g}%, rgba(255,255,255,0) ${60 + g}%)`;
      },
    /** world point of content coords (u,v) */
    pt(u, v, p = L.p) {
      const m = V.mat(p).rotateAxisAngle(1, 0, 0, L.tilt);
      const x = -W / 2 + b + u * s, y = -Hl + b + v * s;
      const q = m.transformPoint(new DOMPoint(x, y, 0)); return { x: q.x, y: q.y, z: q.z };
    }
  };
  return L;
};
/** generic phone. W x H world px; mobile content width 390 css px */
V.phone = function (parent, o = {}) {
  const W = o.W || 430, H = o.H || W * 2.06, b = W * .035, r = W * .15, sw = W - 2 * b, sh = H - 2 * b, cw = 390, s = sw / cw, ch = sh / s;
  const root = mk('div', 'o', parent || V.world, `width:${W}px;height:${H}px;margin:${-H / 2}px 0 0 ${-W / 2}px`);
  const parts = [];
  parts.push(mk('div', 'f', root, `inset:0;border-radius:${r}px;transform:translateZ(-14px);box-shadow:0 50px 90px rgba(40,55,95,.20),0 12px 30px rgba(40,55,95,.12)`));
  for (let k = 1; k <= 9; k++) parts.push(mk('div', 'f', root, `inset:0;border-radius:${r}px;background:${k === 9 ? '#cfd2d7' : k % 3 ? '#b6bac1' : '#c9ccd2'};transform:translateZ(${-k * 1.4}px)`));
  for (const [y, hh] of [[.2, .08], [.3, .12]]) parts.push(mk('div', 'f', root, `left:${W}px;top:${H * y}px;width:9px;height:${H * hh}px;transform-origin:0 50%;transform:translateZ(-2px) rotateY(90deg);background:#a9adb4;border-radius:3px`));
  const front = mk('div', 'f', root, `inset:0;border-radius:${r}px;background:#0b0c0e;box-shadow:inset 0 0 0 1.5px #8e939b,inset 0 0 0 3px #1a1b1e`);
  const scr = mk('div', 'scr', front, `left:${b}px;top:${b}px;width:${sw}px;height:${sh}px;border-radius:${r - b}px`);
  const ct = mk('div', 'ct', scr, `width:${cw}px;height:${ch}px;transform:scale(${s});background:#fff;overflow:hidden`);
  const label = mk('div', 'f', front, `left:${b}px;top:${b - 34}px;font:500 22px Poppins;color:#8C8C8C;white-space:nowrap;display:none`);
  parts.push(mk('div', 'f', scr, `left:50%;top:${sh * .016}px;width:${W * .038}px;height:${W * .038}px;margin-left:${-W * .019}px;border-radius:50%;background:#050506;box-shadow:inset 0 0 0 1.5px #1d2026;z-index:5`));
  const glare = mk('div', 'glare', scr, 'z-index:6');
  const Ph = { root, ct, scr, W, H, s, cw, ch, label, front, parts, b, r,
    body(a) { for (const e of parts) { e.style.opacity = a; e.style.display = a < .005 ? 'none' : ''; }
      front.style.background = `rgba(11,12,14,${a})`; front.style.boxShadow = `inset 0 0 0 1.5px rgba(142,147,155,${a}),inset 0 0 0 3px rgba(26,27,30,${a})`;
      scr.style.borderRadius = ((r - b) * a) + 'px'; glare.style.opacity = a; },
    pt(u, v, p = Ph.p) { const q = V.mat(p).transformPoint(new DOMPoint(-W / 2 + b + u * s, -H / 2 + b + v * s, 0)); return { x: q.x, y: q.y, z: q.z }; },
    set(p) { V.tf(root, p); Ph.p = p; const g = (p.ry || 0) * 1.4 + (p.glare || 0);
      glare.style.background = `linear-gradient(${118 + g * .3}deg, rgba(255,255,255,0) ${34 + g}%, rgba(255,255,255,.07) ${47 + g}%, rgba(255,255,255,0) ${60 + g}%)`; } };
  return Ph;
};

/* ---------- mobile reflows of the real design (assets only) ---------- */
V.statusBar = function (ct, dark) {
  const c = dark ? '#fff' : '#1E1E1E';
  mk('div', '', ct, `position:absolute;left:0;top:0;width:390px;height:44px;display:flex;align-items:center;justify-content:space-between;padding:0 28px 0 34px;font:600 15px Poppins;color:${c};z-index:4`).innerHTML =
    `<span>09:41</span><span style="display:flex;gap:6px;align-items:center"><svg width="18" height="11"><rect x="0" y="7" width="3" height="4" rx="1" fill="${c}"/><rect x="5" y="5" width="3" height="6" rx="1" fill="${c}"/><rect x="10" y="2.5" width="3" height="8.5" rx="1" fill="${c}"/><rect x="15" y="0" width="3" height="11" rx="1" fill="${c}"/></svg><svg width="25" height="12"><rect x=".5" y=".5" width="21" height="11" rx="3.2" fill="none" stroke="${c}" opacity=".5"/><rect x="2.5" y="2.5" width="15" height="7" rx="1.6" fill="${c}"/><rect x="23" y="4" width="1.6" height="4" rx=".8" fill="${c}" opacity=".5"/></svg></span>`;
};
V.mHeader = function (ct, y = 52) {
  const h = mk('div', '', ct, `position:absolute;left:14px;top:${y}px;width:362px;height:54px;border-radius:999px;background:rgba(255,255,255,.86);box-shadow:4px 4px 18px rgba(0,0,0,.07);display:flex;align-items:center;justify-content:space-between;padding:0 8px 0 18px;z-index:3`);
  mk('img', '', h, 'height:26px').src = '../assets/final/logo.png';
  h.insertAdjacentHTML('beforeend', `<span style="display:flex;gap:10px;align-items:center"><svg width="22" height="16"><path d="M1 2h20M1 8h20M1 14h20" stroke="#1E1E1E" stroke-width="2" stroke-linecap="round"/></svg><svg width="38" height="38" viewBox="0 0 48 48"><circle cx="24" cy="24" r="24" fill="#EE225B"/><circle cx="22.5" cy="22.5" r="7" fill="none" stroke="#fff" stroke-width="2.4"/><path d="M27.5 27.5L32 32" stroke="#fff" stroke-width="2.4" stroke-linecap="round"/></svg></span>`);
  return h;
};
V.SLIDES = [
  { img: 'hero-bottles.png', bg: '#F5F5F5', eb: 'Produsen Terbaik', title: 'Produk Plastik', lead: 'Berbagai solusi plastik berkualitas tinggi yang dirancang untuk memenuhi kebutuhan Anda.', cta: 'Pelajari Selengkapnya', fx: .72 },
  { img: 'slide2-photo.png', bg: '#FFFFFF', eb: '', title: 'Tumbler Fruitamin', lead: 'Tersedia berbagai ukuran dan warna', cta: 'Hubungi Kami', fx: .74 },
  { img: 'slide3-photo.png', bg: '#F9F9F9', eb: '', title: 'Mellau Plate', lead: 'Tersedia berbagai ukuran dan warna', cta: 'Lihat Produk', fx: .7 },
];
/** mobile hero slide n (0..2) as an element 390 x H */
V.mSlide = function (parent, n, H = 560) {
  const S = V.SLIDES[n];
  const e = mk('div', '', parent, `position:absolute;left:0;top:0;width:390px;height:${H}px;background:${S.bg};overflow:hidden`);
  const ih = 330, iw = ih * 1200 / 627;
  mk('img', '', e, `position:absolute;top:96px;height:${ih}px;width:${iw}px;left:${-(iw * S.fx - 195)}px`).src = '../assets/final/' + S.img;
  const tb = mk('div', '', e, `position:absolute;left:22px;right:22px;top:${H - 190}px`);
  if (S.eb) mk('div', '', tb, 'font:500 15px Montserrat;letter-spacing:1.6px;text-transform:uppercase;color:#626262;margin-bottom:4px').textContent = S.eb;
  mk('div', '', tb, 'font:700 33px/40px Montserrat;color:#EE225B;white-space:nowrap').textContent = S.title;
  mk('div', '', tb, 'font:400 13px/21px Poppins;color:#626262;margin-top:6px').textContent = S.lead;
  const c = mk('div', '', tb, 'margin-top:14px;display:inline-flex;align-items:center;gap:12px;height:34px;padding:0 4px 0 18px;border-radius:99px;background:#FF3548;font:500 11px Poppins;letter-spacing:1.2px;text-transform:uppercase;color:#fff');
  c.innerHTML = `${S.cta}<svg width="28" height="28" viewBox="0 0 40 40"><circle cx="20" cy="20" r="18" fill="#fff"/><path d="M15 20h10M21 15l5 5-5 5" stroke="#FF3548" stroke-width="2.2" fill="none" stroke-linecap="round"/></svg>`;
  return e;
};
V.mDots = function (parent, y) {
  const d = mk('div', '', parent, `position:absolute;left:0;width:390px;top:${y}px;display:flex;justify-content:center;gap:8px;z-index:3`);
  return [0, 1, 2].map(() => mk('div', '', d, 'width:9px;height:9px;border-radius:50%;background:#D9D9D9'));
};

/* ---------- giant type ---------- */
V.gtype = function (parent, text, o = {}) {
  const e = mk('div', 'o gt', parent || V.world, `font-size:${o.fs || 400}px;color:${o.color || '#EE225B'};font-weight:${o.weight || 800}`);
  e.textContent = text;
  if (o.center !== false) e.style.translate = '-50% -50%';
  return e;
};

/* ---------- scene ---------- */
V.scene = function (def) {
  const SP = def.speed || 1, OF = def.offset || 0;   // retime: frame(t * SP + OF)
  window.DURATION = +((def.duration - OF) / SP).toFixed(4);
  const SFX = window.SFX = { clicks: [], typing: [], whoosh: [], ticks: [] };
  V.SFX = SFX;
  V.init(def);
  let st = null;
  window.ready = (async () => {
    await document.fonts.ready;
    st = (await def.setup(V)) || {};
    if (SP !== 1 || OF) { const m = x => (x - OF) / SP;
      SFX.clicks = SFX.clicks.map(m).filter(x => x >= 0); SFX.ticks = SFX.ticks.map(m).filter(x => x >= 0);
      SFX.typing = SFX.typing.map(([a, b]) => [Math.max(0, m(a)), m(b)]).filter(([a, b]) => b > 0);
      SFX.whoosh = SFX.whoosh.map(([a, d, g]) => [m(a), d / SP, g]).filter(([a]) => a >= 0); }
    await Promise.all(V.frames);
    await Promise.all([...document.images].map(i => i.decode().catch(() => 0)));
    await document.fonts.ready;
    window.seek(0);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return true;
  })();
  window.seek = function (t, tc) {
    if (!st) return;
    t = clamp(t, 0, window.DURATION) * SP + OF;
    V.reset();
    def.frame(t, st, t);
  };
};
})();
