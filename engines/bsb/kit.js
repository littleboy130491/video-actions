/* engine/kit.js — deterministic motion kit (BSB timelapse; adapted from AKR engine2).
 * Everything visual is a pure function of t: seek(t) -> S.begin(); actions; camera; S.end().
 * Exposes window.K.
 */
(function () {
'use strict';
const K = window.K = {};

/* ---------------- math / easing ---------------- */
const clamp = K.clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = K.lerp = (a, b, u) => a + (b - a) * u;
const E = K.E = {
  linear: u => u,
  inQuad: u => u * u,
  outQuad: u => 1 - (1 - u) * (1 - u),
  inOutQuad: u => u < .5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2,
  inCubic: u => u * u * u,
  outCubic: u => 1 - Math.pow(1 - u, 3),
  inOutCubic: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
  outQuart: u => 1 - Math.pow(1 - u, 4),
  inOutQuart: u => u < .5 ? 8 * u * u * u * u : 1 - Math.pow(-2 * u + 2, 4) / 2,
  outQuint: u => 1 - Math.pow(1 - u, 5),
  outExpo: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
  inExpo: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
  inOutExpo: u => u <= 0 ? 0 : u >= 1 ? 1 : u < .5 ? Math.pow(2, 20 * u - 10) / 2 : (2 - Math.pow(2, -20 * u + 10)) / 2,
  inOutSine: u => -(Math.cos(Math.PI * u) - 1) / 2,
  // hand movement: bell-shaped velocity peaking a little early, long settle
  hand: u => { u = clamp(u); const v = Math.pow(u, .82); return v < .5 ? 4 * v * v * v : 1 - Math.pow(-2 * v + 2, 3) / 2; },
};
const ease = (e) => typeof e === 'function' ? e : (E[e] || E.inOutCubic);
K.seg = (t, a, b) => b <= a ? (t >= b ? 1 : 0) : clamp((t - a) / (b - a));
K.ramp = (t, a, b, e = 'inOutCubic') => ease(e)(K.seg(t, a, b));
/** pulse: 0 before a, ramps to 1 over fi, holds, ramps out over fo ending at b */
K.pulse = (t, a, b, fi = .12, fo = .12) => Math.min(K.ramp(t, a, a + fi, 'outCubic'), 1 - K.ramp(t, b - fo, b, 'inCubic'));

/* seeded PRNG */
K.rng = function (seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
};
/* low-frequency smooth noise in [-1,1] (sum of incommensurate sines, seeded phases) */
K.noise = function (t, seed = 1) {
  const r = K.rng(seed * 7919 + 13);
  let s = 0, n = 0;
  const fr = [0.13, 0.29, 0.47];
  for (let i = 0; i < 3; i++) { const ph = r() * 6.283, f = fr[i] * (0.8 + r() * 0.4), w = 1 / (i + 1); s += Math.sin(t * f * 6.283 + ph) * w; n += w; }
  return s / n;
};

/* ---------------- colours ---------------- */
K.hex = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; };
K.hsv = h => { const [r, g, b] = K.hex(h).map(v => v / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; let hh = 0; if (d) { if (mx === r) hh = ((g - b) / d) % 6; else if (mx === g) hh = (b - r) / d + 2; else hh = (r - g) / d + 4; } hh = (hh * 60 + 360) % 360; return { h: hh, s: mx ? d / mx : 0, v: mx }; };
K.mix = (a, b, u) => { const A = K.hex(a), B = K.hex(b); return `rgb(${A.map((v, i) => Math.round(lerp(v, B[i], u))).join(',')})`; };

/* ---------------- keyframe tracks ---------------- */
/** keys: [[t, {props}, ease?], ...]; ease on a key = ease of the segment arriving at it. */
K.track = function (keys) {
  const k = keys.map(([t, v, e]) => ({ t, v, e: e || 'inOutCubic' })).sort((a, b) => a.t - b.t);
  return function (t) {
    if (t <= k[0].t) return { ...k[0].v };
    for (let i = 1; i < k.length; i++) {
      if (t <= k[i].t) {
        const a = k[i - 1], b = k[i];
        const u = ease(b.e)(K.seg(t, a.t, b.t));
        return K.camLerp(a.v, b.v, u);
      }
    }
    return { ...k[k.length - 1].v };
  };
};
/** camera-aware interpolation: zoom in log space; position progress follows view size when zoom changes a lot */
K.camLerp = function (a, b, u) {
  const o = {};
  const za = a.zoom ?? 1, zb = b.zoom ?? 1;
  const z = Math.exp(lerp(Math.log(za), Math.log(zb), u));
  let up = u;
  if (Math.abs(Math.log(zb / za)) > 0.25) up = (1 / z - 1 / za) / (1 / zb - 1 / za);
  for (const key of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const va = a[key] ?? b[key], vb = b[key] ?? a[key];
    if (typeof va !== 'number' || typeof vb !== 'number') { o[key] = u < .5 ? va : vb; continue; }
    if (key === 'zoom') o.zoom = z;
    else if (key === 'x' || key === 'y') o[key] = lerp(va, vb, up);
    else o[key] = lerp(va, vb, u);
  }
  return o;
};
/** C1-continuous camera spline: keys [[t, cam], ...]; Catmull-Rom tangents, zero velocity at both ends
 *  (zoom interpolated in log space). Use one spline across two scene files to make a cut invisible. */
K.spline = function (keys) {
  const k = keys.map(([t, v]) => ({ t, v: { ...v, zoom: Math.log(v.zoom ?? 1) } }));
  const props = [...new Set(k.flatMap(x => Object.keys(x.v)))].filter(p => k.every(x => typeof x.v[p] === 'number'));
  const tan = (i, p) => (i === 0 || i === k.length - 1) ? 0 : (k[i + 1].v[p] - k[i - 1].v[p]) / (k[i + 1].t - k[i - 1].t);
  return function (t) {
    if (t <= k[0].t) { const o = { ...k[0].v }; o.zoom = Math.exp(o.zoom); return o; }
    if (t >= k[k.length - 1].t) { const o = { ...k[k.length - 1].v }; o.zoom = Math.exp(o.zoom); return o; }
    let i = 0; while (t > k[i + 1].t) i++;
    const a = k[i], b = k[i + 1], h = b.t - a.t, u = (t - a.t) / h;
    const h00 = 2 * u * u * u - 3 * u * u + 1, h10 = u * u * u - 2 * u * u + u, h01 = -2 * u * u * u + 3 * u * u, h11 = u * u * u - u * u;
    const o = {};
    for (const p of props) o[p] = h00 * a.v[p] + h10 * h * tan(i, p) + h01 * b.v[p] + h11 * h * tan(i + 1, p);
    o.zoom = Math.exp(o.zoom);
    return o;
  };
};
/** cut list: [{t0, t1, cam: fn(t) | track keys}] -> fn(t) */
K.shots = function (list) {
  const L = list.map(s => ({ ...s, f: typeof s.cam === 'function' ? s.cam : K.track(s.cam) }));
  const f = function (t) {
    let s = L[L.length - 1];
    for (const x of L) if (t >= x.t0 && t < x.t1) { s = x; break; }
    const c = s.f(t); c._shot = L.indexOf(s); c._t0 = s.t0; return c;
  };
  f.list = L;
  if (window.S) window.S._cuts = L.map(x => x.t0).filter(x => x > 0);
  return f;
};

/* ---------------- stage ---------------- */
const W = 1080, H = 1920;
K.W = W; K.H = H;

class Stage {
  constructor(opts = {}) {
    this.opts = Object.assign({ bg: '#0B0B0C', src: '../design/final.html', fallback: '../design/final.html', persp: 2400, shadow: true }, opts);
    const st = this.stage = document.createElement('div'); st.id = 'stage'; st.style.background = this.opts.bg;
    document.body.style.background = this.opts.bg;
    this.under = document.createElement('div'); this.under.style.cssText = 'position:absolute;inset:0'; st.appendChild(this.under);
    this.world = document.createElement('div'); this.world.id = 'world'; st.appendChild(this.world);
    this.shadowEl = document.createElement('div'); this.shadowEl.className = 'shadow'; this.world.appendChild(this.shadowEl);
    this.svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); this.svg.id = 'ui';
    this.svg.setAttribute('width', W); this.svg.setAttribute('height', H); this.svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    st.appendChild(this.svg);
    this.uih = document.createElement('div'); this.uih.id = 'uih'; st.appendChild(this.uih);
    this.over = document.createElement('div'); this.over.style.cssText = 'position:absolute;inset:0;pointer-events:none'; st.appendChild(this.over);
    this.labelEl = document.createElement('div'); this.labelEl.className = 'k-label'; st.appendChild(this.labelEl);
    this.cur = document.createElement('div'); this.cur.id = 'cursor'; st.appendChild(this.cur);
    this.cur.innerHTML = `<svg width="30" height="44" viewBox="0 0 30 44" class="arrow" style="left:-2px;top:-2px"><g transform="translate(2,2) scale(1.45)"><path d="M0 0 L0 22.6 L5.4 17.4 L9.1 26 L12.7 24.5 L9.1 16.1 L16.6 16.1 Z" fill="#000" stroke="#fff" stroke-width="1.05" stroke-linejoin="round"/></g></svg>
      <svg width="40" height="40" viewBox="-20 -20 40 40" class="cross" style="left:-20px;top:-20px"><path d="M0 -13V13M-13 0H13" stroke="#fff" stroke-width="4" stroke-linecap="square"/><path d="M0 -12V12M-12 0H12" stroke="#111" stroke-width="1.6"/></svg>
      <svg width="24" height="40" viewBox="-12 -20 24 40" class="ibeam" style="left:-12px;top:-20px"><path d="M-6 -15C-2 -15 0 -13 0 -10V10C0 13 -2 15 -6 15M6 -15C2 -15 0 -13 0 -10M6 15C2 15 0 13 0 10" fill="none" stroke="#fff" stroke-width="4"/><path d="M-6 -15C-2 -15 0 -13 0 -10V10C0 13 -2 15 -6 15M6 -15C2 -15 0 -13 0 -10M6 15C2 15 0 13 0 10" fill="none" stroke="#111" stroke-width="1.6"/></svg>
      <div class="tag">Imajiner</div>`;
    document.body.appendChild(st);
    this.touched = new Map(); this.textCache = new Map(); this.ghosts = new Map(); this.baseCache = new Map();
    this.cam = { x: 600, y: 960, zoom: 1, rx: 0, ry: 0, rz: 0 };
    this.t = 0;
  }

  /* ---- loading ---- */
  async load() {
    const exists = async u => { try { const r = await fetch(u, { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch (e) { return false; } };
    let src = this.opts.src;
    if (!(await exists(src))) src = this.opts.fallback;
    this.src = src;
    const f = this.frame = document.createElement('iframe');
    f.setAttribute('scrolling', 'no');
    f.width = 1200; f.height = 6802; f.style.width = '1200px'; f.style.height = '6802px';
    this.world.appendChild(f);
    await new Promise((res, rej) => { f.onload = res; f.onerror = () => rej(new Error('iframe load ' + src)); f.src = src; });
    const d = this.doc = f.contentDocument; this.win = f.contentWindow;
    const main = this.main = d.getElementById('page') || d.querySelector('main');
    const s = d.createElement('style');
    s.textContent = 'html.k-nobf *{backdrop-filter:none!important;-webkit-backdrop-filter:none!important}*,*::before,*::after{transition:none!important;animation:none!important;caret-color:transparent!important}html,body{margin:0!important;overflow:hidden!important;background:transparent!important}';
    d.head.appendChild(s);
    const pw = Math.round(main.offsetWidth), ph = Math.round(main.offsetHeight);
    this.pw = pw; this.ph = ph;
    // iframe is wider than the page so elements dragged outside the frame stay visible on the canvas
    f.width = pw + 420; f.height = ph; f.style.width = (pw + 420) + 'px'; f.style.height = ph + 'px';
    Object.assign(this.world.style, { width: pw + 'px', height: ph + 'px' });
    Object.assign(this.shadowEl.style, { width: pw + 'px', height: ph + 'px' });
    // ghost layer for drawn rectangles lives inside the page
    await d.fonts.ready; await document.fonts.ready;
    // fonts used by the overlay
    await Promise.all(['500 18px Inter', '600 20px Inter', '500 22px Inter', '400 28px "D-DIN PRO"', '700 28px "D-DIN PRO"'].map(x => document.fonts.load(x).catch(() => 0)));
    // decode images (img tags and css backgrounds)
    const urls = new Set(); const imgs = [...d.images];
    for (const el of main.querySelectorAll('*')) {
      const bg = this.win.getComputedStyle(el).backgroundImage;
      if (bg && bg !== 'none') for (const m of bg.matchAll(/url\("?([^")]+)"?\)/g)) urls.add(m[1]);
    }
    await Promise.all([...imgs.map(i => i.decode().catch(() => 0)),
      ...[...urls].map(u => { const i = new Image(); i.src = u; return i.decode().catch(() => 0); })]);
    this.mainRect = main.getBoundingClientRect();
    this.setCam({}, 0);
    this.ready = true;
    return this;
  }

  /* ---- element lookup ---- */
  $(sel) { return this.main.querySelector(sel); }
  $$(sel) { return [...this.main.querySelectorAll(sel)]; }
  /** find by data-el id, css selector, or text (deepest element whose normalized text starts with str) */
  find(spec) {
    if (spec == null) return null;
    if (spec.nodeType === 1) return spec;
    if (Array.isArray(spec)) { for (const s of spec) { const e = this.find(s); if (e) return e; } return null; }
    if (typeof spec === 'string') spec = spec.startsWith('text:') ? { text: spec.slice(5) } : { el: spec };
    if (spec.el) { const e = this.main.querySelector(`[data-el="${spec.el}"]`); if (e) return e; }
    if (spec.sel) { const e = this.main.querySelector(spec.sel); if (e) return e; }
    if (spec.text) {
      const want = norm(spec.text);
      let best = null;
      for (const e of this.main.querySelectorAll('*')) {
        if (e.closest('svg') && e.tagName.toLowerCase() !== 'svg') continue;
        const tx = norm(e.textContent);
        if (!tx.startsWith(want)) continue;
        if (spec.exact && tx !== want) continue;
        if (!best || best.contains(e)) best = e;
      }
      if (best && spec.up) for (let i = 0; i < spec.up; i++) best = best.parentElement;
      return best;
    }
    return null;
  }
  /** page-space rect, measured in the untouched (final) state and cached */
  rect(el) {
    el = this.find(el);
    if (!el) return null;
    if (this.baseCache.has(el)) return this.baseCache.get(el);
    const r = this.liveRect(el);
    this.baseCache.set(el, r);
    return r;
  }
  liveRect(el) {
    const r = el.getBoundingClientRect(), m = this.main.getBoundingClientRect();
    return { x: r.left - m.left, y: r.top - m.top, w: r.width, h: r.height };
  }
  /** visible images (img tags or css url backgrounds) inside a page y-range */
  images(y0 = 0, y1 = 1e9) {
    const out = [];
    for (const el of this.main.querySelectorAll('*')) {
      const tag = el.tagName.toLowerCase();
      const isImg = tag === 'img' || el.dataset.kind === 'image' || /url\(/.test(this.win.getComputedStyle(el).backgroundImage);
      if (!isImg) continue;
      const r = this.rect(el); if (r.w < 30 || r.h < 30) continue;
      if (r.y + r.h / 2 >= y0 && r.y + r.h / 2 < y1) out.push(el);
    }
    return out;
  }

  /* ---- per-frame state management ---- */
  touch(el) {
    if (!this.touched.has(el)) {
      // cache final geometry before first modification
      this.rect(el);
      this.touched.set(el, { style: el.getAttribute('style'), op: parseFloat(this.win.getComputedStyle(el).opacity) || 1, tr: el.style.transform || '' });
    }
    return this.touched.get(el);
  }
  begin(t) {
    this.t = t;
    for (const [el, o] of this.touched) { if (o.style == null) el.removeAttribute('style'); else el.setAttribute('style', o.style); }
    for (const [el, c] of this.textCache) if (c.dirty) { c.nodes.forEach(n => { if (n.node.nodeValue !== n.v) n.node.nodeValue = n.v; }); c.dirty = false; }
    for (const g of this.ghosts.values()) g.style.display = 'none';
    this.svgParts = []; this.htmlParts = []; this.curState = null; this.labelState = null; this.overParts = [];
  }
  css(el, props) { el = this.find(el); if (!el) return; this.touch(el); Object.assign(el.style, props); return el; }
  alpha(el, a) { el = this.find(el); if (!el) return; const o = this.touch(el); el.style.opacity = String(o.op * clamp(a)); el.style.visibility = a <= 0.001 ? 'hidden' : ''; return el; }
  hide(el) { return this.alpha(el, 0); }
  xform(el, str) { el = this.find(el); if (!el) return; const o = this.touch(el); el.style.transform = (o.tr ? o.tr + ' ' : '') + str; return el; }
  /** shallow depth-of-field: blur (page px) on photo layers */
  dof(els, px) { if (px <= 0.01) return; for (const e of [].concat(els)) { const el = this.find(e); if (!el) continue; this.touch(el); el.style.filter = `blur(${px.toFixed(2)}px)`; } }
  /** scale content inside its own box (clip keeps the original box) */
  innerScale(el, s) {
    el = this.find(el); if (!el) return; this.touch(el);
    const k = (1 - 1 / s) / 2 * 100;
    el.style.transformOrigin = '50% 50%';
    this.xform(el, `scale(${s})`);
    el.style.clipPath = `inset(${k}% ${k}% ${k}% ${k}%)`;
  }

  /* ---- text ---- */
  textInfo(el) {
    el = this.find(el);
    if (this.textCache.has(el)) return this.textCache.get(el);
    const tw = this.doc.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    const nodes = []; let n;
    while ((n = tw.nextNode())) { if (n.parentElement.closest('svg, style, script')) continue; nodes.push({ node: n, v: n.nodeValue }); }
    // keystroke map: each keystroke = (node index, end offset). whitespace runs collapse into one keystroke.
    const keys = []; let started = false;
    nodes.forEach((o, ni) => {
      const s = o.v; let i = 0;
      while (i < s.length) {
        if (/\s/.test(s[i])) { let j = i; while (j < s.length && /\s/.test(s[j])) j++; if (started) keys.push({ ni, off: j, ch: ' ' }); i = j; }
        else { keys.push({ ni, off: i + 1, ch: s[i] }); started = true; i++; }
      }
    });
    while (keys.length && keys[keys.length - 1].ch === ' ') keys.pop();
    // final line boxes (for anchoring centred text while typing)
    const cs = this.win.getComputedStyle(el);
    const lines = this.lineRects(el);
    const info = { el, nodes, keys, lines, align: cs.textAlign, dirty: false };
    this.textCache.set(el, info);
    return info;
  }
  lineRects(el) {
    const rg = this.doc.createRange(); rg.selectNodeContents(el);
    const m = this.main.getBoundingClientRect();
    const fs = parseFloat(this.win.getComputedStyle(el).fontSize) || 16;
    const lines = [];
    for (const r of rg.getClientRects()) {
      if (r.width < 1) continue;
      const y = r.top - m.top, x = r.left - m.left;
      const L = lines.find(l => Math.abs((l.y + l.h / 2) - (y + r.height / 2)) < fs * .35);
      if (L) { const x2 = Math.max(L.x + L.w, x + r.width); L.x = Math.min(L.x, x); L.w = x2 - L.x; }
      else lines.push({ x, y, w: r.width, h: r.height });
    }
    return lines.sort((a, b) => a.y - b.y);
  }
  /** show the first n keystrokes (+ extra wrong chars). returns caret page point {x,y,h} */
  typeN(el, n, extra = '', anchor = true) {
    const info = this.textInfo(el); el = info.el;
    const keys = info.keys; n = Math.max(0, Math.min(keys.length, Math.floor(n)));
    info.dirty = true;
    let lastNode = -1, lastOff = 0;
    if (n > 0) { lastNode = keys[n - 1].ni; lastOff = keys[n - 1].off; }
    info.nodes.forEach((o, ni) => {
      let v;
      if (ni < lastNode) v = o.v; else if (ni === lastNode) v = o.v.slice(0, lastOff) + extra; else v = '';
      if (o.node.nodeValue !== v) o.node.nodeValue = v;
    });
    if (n === 0 && extra && info.nodes.length) { info.nodes[0].node.nodeValue = extra; lastNode = 0; lastOff = 0; }
    // keep centred text growing to the right from its final position (<=2 lines)
    if (anchor && info.align === 'center' && info.lines.length && info.lines.length <= 2 && n < keys.length) {
      const o = this.touch(el); const base = this.rect(el); const cs = this.win.getComputedStyle(el);
      const pl = parseFloat(cs.paddingLeft) || 0;
      const L1 = info.lines[0].x - base.x - pl, L2 = (info.lines[1] || info.lines[0]).x - base.x - pl;
      el.style.textAlign = 'left'; el.style.paddingLeft = (pl + L2) + 'px'; el.style.textIndent = (L1 - L2) + 'px';
      el.style.width = (base.w + 8) + 'px'; el.style.maxWidth = 'none';
      if (cs.boxSizing !== 'border-box') el.style.width = (base.w - pl - (parseFloat(cs.paddingRight) || 0) - L2 + 8) + 'px';
    }
    return this.caretAt(el, lastNode >= 0 ? info.nodes[lastNode].node : null, lastNode >= 0 ? info.nodes[lastNode].node.nodeValue.length : 0);
  }
  caretAt(el, node, off) {
    const m = this.main.getBoundingClientRect();
    const cs = this.win.getComputedStyle(el); const fs = parseFloat(cs.fontSize) || 16;
    const lh = (parseFloat(cs.lineHeight) || fs * 1.2);
    if (node && off > 0) {
      const rg = this.doc.createRange();
      // find last non-space char before off
      let o = off; const s = node.nodeValue;
      rg.setStart(node, o - 1); rg.setEnd(node, o);
      const rs = rg.getClientRects(); const r = rs[rs.length - 1];
      if (r) {
        const isSpace = /\s/.test(s[o - 1]);
        const hh = Math.min(lh, fs * 1.25);
        return { x: (isSpace ? r.right : r.right) - m.left + 1, y: r.top - m.top + (r.height - hh) / 2, h: hh };
      }
    }
    const r = el.getBoundingClientRect();
    const hh = Math.min(lh, fs * 1.25);
    let x = r.left - m.left + (parseFloat(cs.paddingLeft) || 0);
    const info = this.textCache.get(el);
    if (info && info.lines.length) x = info.lines[0].x;
    return { x: x + 1, y: r.top - m.top + (parseFloat(cs.paddingTop) || 0) + (lh - hh) / 2, h: hh };
  }

  /* ---- ghost rectangles (Figma rectangles while drawing) ---- */
  ghost(key, beforeEl) {
    let g = this.ghosts.get(key);
    if (!g) {
      g = this.doc.createElement('div');
      g.style.cssText = 'position:absolute;display:none;pointer-events:none';
      // put ghost in page space: as a child of main, inserted before the top-level ancestor of beforeEl
      let anc = beforeEl; while (anc && anc.parentElement && anc.parentElement !== this.main) anc = anc.parentElement;
      if (anc && anc.parentElement === this.main) this.main.insertBefore(g, anc); else this.main.appendChild(g);
      this.ghosts.set(key, g);
    }
    return g;
  }
  showGhost(key, beforeEl, r, fill, extra = {}) {
    const g = this.ghost(key, beforeEl);
    Object.assign(g.style, { display: 'block', left: r.x + 'px', top: r.y + 'px', width: Math.max(0, r.w) + 'px', height: Math.max(0, r.h) + 'px', background: fill, opacity: extra.opacity ?? 1, borderRadius: extra.radius || '0', zIndex: extra.z || 'auto' });
    return g;
  }

  /* ---- camera ---- */
  setCam(c, t = this.t) {
    c = Object.assign({ x: 600, y: 960, zoom: 1, rx: 0, ry: 0, rz: 0, cx: W / 2, cy: H / 2, drift: 1, persp: this.opts.persp }, c);
    const dr = c.drift;
    const tn = t + (this.opts.noiseT0 || 0); // continuous drift across scene files when they share a camera move
    const dx = 4 * K.noise(tn, 11) * dr, dy = 4 * K.noise(tn, 23) * dr, drz = 0.3 * K.noise(tn, 37) * dr;
    const M = new DOMMatrix();
    M.translateSelf(c.cx + dx, c.cy + dy);
    const P = new DOMMatrix(); P.m34 = -1 / c.persp;
    M.multiplySelf(P);
    if (c.rx) M.rotateAxisAngleSelf(1, 0, 0, c.rx);
    if (c.ry) M.rotateAxisAngleSelf(0, 1, 0, c.ry);
    M.rotateAxisAngleSelf(0, 0, 1, (c.rz || 0) + drz);
    M.scaleSelf(c.zoom, c.zoom, c.zoom);
    M.translateSelf(-c.x, -c.y);
    this.M = M; this.cam = c;
    // Chrome drops backdrop-filter surfaces that exceed the max texture size at high zoom:
    // switch glass blur off in close-ups (photos are DOF-blurred there anyway)
    if (this.doc) { const nb = c.zoom > 1.25 || c.nobf; if (nb !== this._nobf) { this.doc.documentElement.classList.toggle('k-nobf', nb); this._nobf = nb; } }
    this.world.style.transform = M.toString();
    // shadow under the page in wide shots
    if (this.opts.shadow) {
      const a = clamp((0.9 - c.zoom) / 0.5) * 0.55;
      this.shadowEl.style.opacity = a;
      this.shadowEl.style.boxShadow = a ? '0 60px 160px 40px rgba(0,0,0,.9)' : 'none';
    }
  }
  /** page point -> screen point (with local scale s) */
  P(x, y) {
    const p = this.M.transformPoint(new DOMPoint(x, y, 0, 1));
    const q = this.M.transformPoint(new DOMPoint(x + 1, y, 0, 1));
    const sx = p.x / p.w, sy = p.y / p.w;
    return { x: sx, y: sy, s: Math.hypot(q.x / q.w - sx, q.y / q.w - sy) };
  }
  quad(r) { return [this.P(r.x, r.y), this.P(r.x + r.w, r.y), this.P(r.x + r.w, r.y + r.h), this.P(r.x, r.y + r.h)]; }
  /** inverse: screen point -> page point (z=0 plane) */
  unP(sx, sy) {
    // solve for page (x,y) by Newton on the 2D map (fast, map is smooth)
    let x = this.cam.x, y = this.cam.y;
    for (let i = 0; i < 6; i++) {
      const p = this.P(x, y), px = this.P(x + 1, y), py = this.P(x, y + 1);
      const a = px.x - p.x, b = py.x - p.x, c = px.y - p.y, d = py.y - p.y; const det = a * d - b * c || 1e-9;
      const ex = sx - p.x, ey = sy - p.y; x += (d * ex - b * ey) / det; y += (-c * ex + a * ey) / det;
    }
    return { x, y };
  }

  /* ---- screen-space UI (rebuilt every frame) ---- */
  _poly(pts, attrs) { this.svgParts.push(`<polygon points="${pts.map(p => p.x.toFixed(2) + ',' + p.y.toFixed(2)).join(' ')}" ${attrs}/>`); }
  _line(a, b, attrs) { this.svgParts.push(`<line x1="${a.x.toFixed(2)}" y1="${a.y.toFixed(2)}" x2="${b.x.toFixed(2)}" y2="${b.y.toFixed(2)}" ${attrs}/>`); }
  /** selection box. opts: {handles, pill:'W × H', alpha, hover, color, width} */
  sel(r, o = {}) {
    if (!r) return; const a = o.alpha ?? 1; if (a <= 0.01) return;
    const q = this.quad(r), col = o.color || '#0D99FF';
    this._poly(q, `fill="none" stroke="${col}" stroke-width="${o.width || (o.hover ? 1.5 : 2)}" opacity="${a}" stroke-linejoin="miter"`);
    if (o.handles && !o.hover) for (const p of q) this.svgParts.push(`<rect x="${(p.x - 5).toFixed(2)}" y="${(p.y - 5).toFixed(2)}" width="10" height="10" fill="#fff" stroke="${col}" stroke-width="1.5" opacity="${a}"/>`);
    if (o.pill) {
      const b = { x: (q[2].x + q[3].x) / 2, y: (q[2].y + q[3].y) / 2 };
      this.pill(b.x, b.y + 10, o.pill, { bg: col, anchor: 'top', alpha: a });
    }
  }
  /** pill at screen point. anchor: 'top' (pill hangs below point), 'center', 'bottom' (pill sits above point), 'left' */
  pill(x, y, text, o = {}) {
    const a = o.alpha ?? 1; if (a <= 0.01) return;
    const fs = o.size || 18;
    const w = measure(text, fs) + 16, h = fs + 11;
    let left = x - w / 2, top = y;
    if (o.anchor === 'center') top = y - h / 2; else if (o.anchor === 'bottom') top = y - h; else if (o.anchor === 'left') { left = x; top = y - h / 2; } else if (o.anchor === 'right') { left = x - w; top = y - h / 2; }
    if (o.clamp !== false) { left = clamp(left, 20, W - 20 - w); top = clamp(top, 20, H - 20 - h); }
    this.htmlParts.push(`<div class="k-pill" style="left:${left.toFixed(1)}px;top:${top.toFixed(1)}px;background:${o.bg || '#0D99FF'};opacity:${a};font-size:${fs}px">${esc(text)}</div>`);
  }
  /** red measurement between two page points with end caps and a pill */
  measure(a, b, text, o = {}) {
    const al = o.alpha ?? 1; if (al <= 0.01) return;
    const A = this.P(a.x, a.y), B = this.P(b.x, b.y);
    const col = o.color || '#F24E1E';
    this._line(A, B, `stroke="${col}" stroke-width="1" opacity="${al}"`);
    const dx = B.x - A.x, dy = B.y - A.y, L = Math.hypot(dx, dy) || 1, nx = -dy / L * 5, ny = dx / L * 5;
    for (const P of [A, B]) this._line({ x: P.x - nx, y: P.y - ny }, { x: P.x + nx, y: P.y + ny }, `stroke="${col}" stroke-width="1" opacity="${al}"`);
    if (text != null) {
      const m = { x: (A.x + B.x) / 2, y: (A.y + B.y) / 2 };
      const horiz = Math.abs(dx) > Math.abs(dy);
      if (o.pillAt === 'side' || (!horiz && o.pillAt !== 'on')) this.pill(m.x + 8, m.y, text, { bg: col, anchor: 'left', alpha: al, size: o.size });
      else this.pill(m.x, m.y + (o.below ? 8 : -8), text, { bg: col, anchor: o.below ? 'top' : 'bottom', alpha: al, size: o.size });
    }
  }
  /** smart guide line across page coordinates */
  guide(a, b, o = {}) {
    const al = o.alpha ?? 1; if (al <= 0.01) return;
    this._line(this.P(a.x, a.y), this.P(b.x, b.y), `stroke="${o.color || '#F24E1E'}" stroke-width="1" opacity="${al}" ${o.dash ? 'stroke-dasharray="4 3"' : ''}`);
  }
  /** red translucent padding bands for auto layout */
  pad(r, p, o = {}) {
    const al = o.alpha ?? 1; if (al <= 0.01) return;
    const bands = [];
    if (p.t) bands.push({ x: r.x, y: r.y, w: r.w, h: p.t });
    if (p.b) bands.push({ x: r.x, y: r.y + r.h - p.b, w: r.w, h: p.b });
    if (p.l) bands.push({ x: r.x, y: r.y + (p.t || 0), w: p.l, h: r.h - (p.t || 0) - (p.b || 0) });
    if (p.r) bands.push({ x: r.x + r.w - p.r, y: r.y + (p.t || 0), w: p.r, h: r.h - (p.t || 0) - (p.b || 0) });
    for (const b of bands) this._poly(this.quad(b), `fill="#F24E1E" fill-opacity="${0.12 * al}" stroke="none"`);
  }
  rectFill(r, fill, o = {}) { this._poly(this.quad(r), `fill="${fill}" fill-opacity="${o.alpha ?? 1}" stroke="${o.stroke || 'none'}" stroke-width="${o.sw || 1}"`); }
  caret(c, o = {}) {
    if (!c) return; const al = o.alpha ?? 1; if (al <= 0.01) return;
    const A = this.P(c.x, c.y), B = this.P(c.x, c.y + c.h);
    this._line(A, B, `stroke="#0D99FF" stroke-width="2" opacity="${al}"`);
  }
  html(s) { this.htmlParts.push(s); }
  /** Figma colour popover at screen point */
  popover(x, y, o) {
    const al = o.alpha ?? 1; if (al <= 0.01) return;
    const hexShown = o.hex || ''; const sw = o.swatch || '#ffffff';
    const sc = (0.96 + 0.04 * al) * (o.scale || 1);
    this.htmlParts.push(`<div class="k-pop" style="left:${x}px;top:${y}px;opacity:${al};transform:scale(${sc});transform-origin:0 0;--hue:${o.hue ?? 38}">
      <div class="hd"><span>Fill</span><span>Custom</span></div>
      <div class="sq"><i style="left:${o.sx ?? 88}%;top:${o.sy ?? 13}%;background:${sw}"></i></div>
      <div class="hue"><i style="left:${(o.hue ?? 38) / 360 * 100}%"></i></div>
      <div class="row"><span class="sw" style="background:${sw}"></span><span class="hex">${esc(hexShown)}${o.caret ? `<b style="left:${measure(hexShown, 15) + 1}px"></b>` : ''}</span><span class="pct">100%</span></div>
    </div>`);
  }
  /** label (only one at a time). text may be ['01','Membangun hero'] */
  label(text, a = 1, pos) { /* v3: client asked for no text overlays */ }
  /** cursor at page point (or {sx,sy} screen) */
  cursor(c) { this.curState = c; }
  end() {
    this.svg.innerHTML = this.svgParts.join('');
    this.uih.innerHTML = this.htmlParts.join('');
    // label
    const L = this.labelState;
    if (L && L.a > 0.01) {
      const txt = Array.isArray(L.text) ? `<span class="n">${esc(L.text[0])}</span>${esc(L.text[1])}` : esc(L.text);
      if (this.labelEl._t !== txt) { this.labelEl.innerHTML = txt; this.labelEl._t = txt; }
      this.labelEl.style.opacity = 0.6 * L.a; this.labelEl.style.display = 'block';
      const p = L.pos || { x: 64, y: 140 };
      this.labelEl.style.left = p.x + 'px'; this.labelEl.style.top = p.y + 'px';
      this.labelEl.style.transform = p.center ? 'translateX(-50%)' : 'none';
      this.labelEl.style.fontFamily = p.font || ''; this.labelEl.style.fontSize = p.size ? p.size + 'px' : '';
      this.labelEl.style.fontWeight = p.weight || '';
      this.labelEl.style.transform += ` translateY(${(1 - L.a) * 6}px)`;
    } else this.labelEl.style.display = 'none';
    // cursor
    const C = this.curState;
    if (C && (C.alpha ?? 1) > 0.01) {
      let sx, sy;
      if (C.sx != null) { sx = C.sx; sy = C.sy; } else { const p = this.P(C.x, C.y); sx = p.x; sy = p.y; }
      sx += C.ox || 0; sy += C.oy || 0;
      const kind = C.kind || 'arrow';
      const sc = 1 - 0.08 * (C.press || 0);
      this.cur.style.display = 'block';
      this.cur.style.opacity = C.alpha ?? 1;
      this.cur.style.transform = `translate(${sx.toFixed(2)}px,${sy.toFixed(2)}px) scale(${sc})`;
      for (const k of ['arrow', 'cross', 'ibeam']) this.cur.querySelector('.' + k).style.display = (k === kind || (kind === 'text' && k === 'ibeam')) ? 'block' : 'none';
      this.cur.querySelector('.tag').style.transform = kind === 'arrow' ? 'none' : 'translate(-4px,-8px)';
    } else this.cur.style.display = 'none';
  }
}
K.Stage = Stage;

function norm(s) { return (s || '').replace(/\s+/g, ' ').trim(); }
function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;'); }
const _mc = document.createElement('canvas').getContext('2d');
function measure(text, fs) { _mc.font = `500 ${fs}px Inter`; return _mc.measureText(String(text)).width; }
K.norm = norm;

/* =====================================================================
 * Natural-designer actions. Each action: {t0, t1, apply(S,t), cur(t) -> cursor|null, p0, p1}
 * p0/p1 = page points where the cursor starts/ends the action (for travel between actions).
 * ===================================================================== */
const A = K.A = {};
const round = v => Math.round(v);
const sizeTxt = (w, h) => `${round(Math.abs(w))} × ${round(Math.abs(h))}`;

/** drawRect: crosshair, press, drag corner to corner along a curved, decelerating path, live size pill. */
A.drawRect = function (S, o) {
  const el = S.find(o.el); const R = o.rect || S.rect(el);
  const t0 = o.t0, dur = o.dur ?? .7, hold = o.hold ?? .3, t1 = t0 + dur;
  const from = o.from || 'tl';
  const ax = from.includes('r') ? R.x + R.w : R.x, ay = from.includes('b') ? R.y + R.h : R.y;
  const bx = from.includes('r') ? R.x : R.x + R.w, by = from.includes('b') ? R.y : R.y + R.h;
  const s0 = o.start ?? 0; // fraction already drawn at t0 (for match-cut openings)
  const fill = o.fill || (el ? solidFill(S, el) : '#D9D9D9');
  const press = .07;
  const pt = (u) => {
    const e = E.outQuart(lerp(s0, 1, u));
    const arc = Math.sin(Math.PI * e) * (o.arc ?? 0.06);
    const dx = bx - ax, dy = by - ay;
    return { x: ax + dx * e - dy * arc * 0.5, y: ay + dy * e + dx * arc * 0.5, e };
  };
  const act = {
    t0, t1: t1 + hold, p0: { x: ax, y: ay }, p1: { x: bx, y: by }, el, builds: true,
    apply(S, t) {
      if (t < t0) { if (el && o.hideEl !== false) S.hide(el); return; }
      const u = K.seg(t, t0 + press, t1);
      const p = t < t1 ? pt(u) : { x: bx, y: by, e: 1 };
      const r = { x: Math.min(ax, p.x), y: Math.min(ay, p.y), w: Math.abs(p.x - ax), h: Math.abs(p.y - ay) };
      const done = t >= t1;
      if (el && !done && o.hideEl !== false) S.hide(el);
      if (!done || !o.reveal) S.showGhost(o.key || el, o.before ? S.find(o.before) : el, r, fill, { radius: o.radius });
      const selA = o.selUntil != null ? 1 - K.ramp(t, o.selUntil, o.selUntil + .1) : 1 - K.ramp(t, t1 + hold, t1 + hold + .08);
      if (o.ui !== false) S.sel(r, { handles: done, pill: sizeTxt(r.w, r.h), alpha: selA * (o.uiFrom != null ? K.ramp(t, o.uiFrom, o.uiFrom + .12) : 1) });
    },
    cur(t) {
      if (t < t0 || t > t1 + hold) return null;
      const u = K.seg(t, t0 + press, t1);
      const p = t < t1 ? pt(u) : { x: bx, y: by };
      const settle = K.ramp(t, t1, t1 + .15, 'outCubic');
      const prs = t < t0 + press ? K.seg(t, t0, t0 + press) : t < t1 ? 1 : 1 - K.seg(t, t1, t1 + .06);
      return { x: p.x, y: p.y, kind: 'cross', press: prs, ox: settle * 3, oy: settle * 2 };
    }
  };
  return act;
};
function solidFill(S, el) {
  const cs = S.win.getComputedStyle(el);
  if (cs.backgroundImage && cs.backgroundImage !== 'none' && !/url\(/.test(cs.backgroundImage)) return cs.backgroundImage;
  if (cs.backgroundColor && cs.backgroundColor !== 'rgba(0, 0, 0, 0)') return cs.backgroundColor;
  return '#D9D9D9';
}

/** placeImage: image fades in from 0, scale 1.04->1 inside its clip. */
A.placeImage = function (S, o) {
  const els = [].concat(o.el).map(e => S.find(e)).filter(Boolean);
  const t0 = o.t0, dur = o.dur ?? .35, t1 = t0 + dur;
  const R = o.rect || S.rect(els[0]);
  const c = { x: R.x + R.w * (o.cx ?? .5), y: R.y + R.h * (o.cy ?? .5) };
  return {
    t0, t1, p0: c, p1: c, builds: true,
    apply(S, t) {
      const u = K.ramp(t, t0, t1, 'outCubic');
      for (const el of els) {
        if (u <= 0) { S.hide(el); continue; }
        if (u < 1) { S.alpha(el, u); if (o.scale !== false) S.innerScale(el, lerp(1.04, 1, u)); }
      }
      if (o.ghost) { const g = S.ghosts.get(o.ghost); if (g && u >= 1) g.style.display = 'none'; }
    },
    cur(t) { if (o.cursor === false || t < t0 - .05 || t > t1) return null; return { x: c.x, y: c.y, press: K.pulse(t, t0 - .05, t0 + .1, .04, .05) }; }
  };
};

/** generic reveal: fade (overlays), pop (scale), slide */
A.reveal = function (S, o) {
  const els = [].concat(o.el).map(e => S.find(e)).filter(Boolean);
  const t0 = o.t0, dur = o.dur ?? .3, stagger = o.stagger ?? 0;
  const t1 = t0 + dur + stagger * Math.max(0, els.length - 1);
  return {
    t0, t1, builds: true, nocursor: true,
    apply(S, t) {
      els.forEach((el, i) => {
        const a = t0 + i * stagger;
        const u = K.ramp(t, a, a + dur, o.ease || 'outCubic');
        if (u <= 0) { S.hide(el); return; }
        if (u >= 1) return;
        if (o.mode === 'pop') { S.alpha(el, Math.min(1, u * 2)); el.style.transformOrigin = o.origin || '0% 50%'; S.xform(el, `scale(${lerp(.82, 1, E.outQuart(K.seg(t, a, a + dur)))})`); }
        else if (o.mode === 'slide') { const v = 1 - u; S.alpha(el, Math.min(1, u * 3)); S.xform(el, `translate(${(o.dx || 0) * v}px,${(o.dy || 0) * v}px)`); }
        else if (o.mode === 'drop') { const v = 1 - u; S.alpha(el, u); S.xform(el, `translateY(${-(o.dy ?? 14) * v}px)`); }
        else if (o.mode === 'wipe') { S.css(el, { clipPath: `inset(0 ${(1 - u) * 100}% 0 0)` }); }
        else if (o.mode === 'wipeDown') { S.css(el, { clipPath: `inset(0 0 ${(1 - u) * 100}% 0)` }); }
        else S.alpha(el, u);
      });
    },
    cur: () => null
  };
};

/** typing schedule with human rhythm. returns {events:[{t,n,wrong}], end} relative to 0 */
K.typeSchedule = function (keys, o = {}) {
  const r = K.rng(o.seed || 7); const sp = o.speed || 1;
  const ev = []; let t = 0, burst = 3 + Math.floor(r() * 5), inBurst = 0;
  const typoAt = o.typoAt ?? -1;
  for (let i = 0; i < keys.length; i++) {
    if (i === typoAt) {
      const wrong = o.typoChars || 'ls';
      t += (.04 + r() * .05) / sp; ev.push({ t, n: i, wrong: wrong[0] });
      t += (.04 + r() * .05) / sp; ev.push({ t, n: i, wrong: wrong.slice(0, 2), typo: true });
      t += .16 / Math.sqrt(sp); // notice
      t += .07 / Math.sqrt(sp); ev.push({ t, n: i, wrong: wrong[0], bs: true });
      t += .07 / Math.sqrt(sp); ev.push({ t, n: i, wrong: '', bs: true });
      t += .1 / Math.sqrt(sp);
    }
    const ch = keys[i].ch;
    let dt = .04 + r() * .05;
    if (inBurst >= burst) { dt += .08 + r() * .12; inBurst = 0; burst = 3 + Math.floor(r() * 5); }
    const prev = i > 0 ? keys[i - 1].ch : '';
    if (prev === ' ') dt += .03 + r() * .05;
    if (/[.,;:!?]/.test(prev)) dt += .12 + r() * .06;
    t += dt / sp; inBurst++;
    ev.push({ t, n: i + 1, wrong: '' });
  }
  return { events: ev, end: t };
};

/** typeText: click with text tool, caret, human-rhythm typing. */
A.typeText = function (S, o) {
  const el = S.find(o.el); const info = S.textInfo(el); const R = S.rect(el);
  const t0 = o.t0;
  const lead = o.lead ?? .16;
  let keys = info.keys;
  const upto = o.upto != null ? o.upto : keys.length;
  const startN = o.from || 0;
  const sched = K.typeSchedule(keys.slice(startN, upto), { seed: o.seed, speed: o.speed, typoAt: o.typoAt != null ? o.typoAt - startN : -1, typoChars: o.typoChars });
  let evs = sched.events.map(e => ({ ...e, n: e.n + startN }));
  let tEnd = sched.end;
  if (o.dur) { const k = o.dur / tEnd; evs = evs.map(e => ({ ...e, t: e.t * k })); tEnd = o.dur; }
  const tType = t0 + lead, t1 = tType + tEnd;
  const caretHold = o.caretHold ?? .25;
  const click = o.clickAt || { x: R.x + Math.min(R.w * .5, 30), y: R.y + Math.min(R.h * .5, 30) };
  const act = {
    t0, t1: t1 + caretHold, typeEnd: t1, p0: click, p1: click, el, builds: !o.from,
    stateAt(t) {
      if (t < tType) return { n: startN, wrong: '' };
      let s = { n: startN, wrong: '' };
      for (const e of evs) { if (tType + e.t <= t) s = e; else break; }
      return s;
    },
    apply(S, t) {
      if (t < t0) { if (!o.from) { S.hide(el); if (upto < keys.length || o.from) S.typeN(el, 0, '', false); } return; }
      if (t >= t1 + caretHold) {
        if (upto < keys.length) S.typeN(el, upto, '', o.anchor !== false);
        if (o.selAfter) S.sel(R, { handles: true, alpha: o.selAfter(t) });
        return;
      }
      const s = this.stateAt(t);
      const c = S.typeN(el, s.n, s.wrong, o.anchor !== false);
      const blinkPhase = (t - (t >= t1 ? t1 : tType + (evs.find(e => tType + e.t > t)?.t ?? 0))) ;
      let on = 1;
      const lastE = [...evs].reverse().find(e => tType + e.t <= t);
      const idle = t - (lastE ? tType + lastE.t : t0 + .05);
      if (idle > .45) on = (Math.floor((idle - .45) / .53) % 2 === 0) ? 1 : 0; // 1.06s blink period while idle
      if (o.caret !== false) S.caret(c, { alpha: on * (t < t0 + .05 ? 0 : 1) });
      if (o.box !== false) {
        const live = S.liveRect(el);
        const bx = info.align === 'center' ? R : { x: R.x, y: R.y, w: Math.max(R.w * .2, live.w), h: Math.max(live.h, 10) };
        S.sel(o.boxRect || R, { hover: true, alpha: .9 });
      }
      act.lastCaret = c;
    },
    cur(t) {
      if (o.cursor === false || t < t0 - .02 || t > t1 + caretHold) return null;
      const away = K.ramp(t, t0 + .12, t0 + .4, 'outCubic') * (o.away ?? 1);
      return { x: click.x, y: click.y, kind: 'text', press: K.pulse(t, t0 - .02, t0 + .1, .03, .05), ox: away * 26, oy: away * 30 };
    }
  };
  return act;
};

/** dragSnap: element dragged from an offset, overshoots ~8px, red guides + spacing pills, snaps. */
A.dragSnap = function (S, o) {
  const el = S.find(o.el); const R = S.rect(el);
  const t0 = o.t0, dur = o.dur ?? .8, hold = o.hold ?? .35, t1 = t0 + dur;
  const fx = o.dx ?? 0, fy = o.dy ?? 120;
  const L = Math.hypot(fx, fy) || 1, ov = o.over ?? 8;
  const ox = -fx / L * ov, oy = -fy / L * ov; // overshoot past target (direction of travel)
  const grab = { x: R.x + R.w * (o.gx ?? .5), y: R.y + R.h * (o.gy ?? .5) };
  const snapT = t1 - .09;
  const offAt = (t) => {
    if (t <= t0) return { x: fx, y: fy };
    if (t < snapT) { const u = E.hand(K.seg(t, t0 + .06, snapT)); return { x: lerp(fx, ox, u), y: lerp(fy, oy, u) }; }
    const u = E.outCubic(K.seg(t, snapT, t1)); return { x: lerp(ox, 0, u), y: lerp(oy, 0, u) };
  };
  return {
    t0, t1: t1 + hold, p0: { x: grab.x + fx, y: grab.y + fy }, p1: grab, el, builds: true,
    apply(S, t) {
      const grp = [el].concat((o.with || []).map(e => S.find(e)).filter(Boolean));   // elements dragged together (a group)
      if (t < t0 - (o.appear ?? .12)) { grp.forEach(e => S.hide(e)); return; }
      const d = offAt(t);
      if (t < t0) grp.forEach(e => S.alpha(e, K.seg(t, t0 - (o.appear ?? .12), t0)));
      if (t < t1) grp.forEach(e => S.xform(e, `translate(${d.x}px,${d.y}px)`));
      const r = { x: R.x + d.x, y: R.y + d.y, w: R.w, h: R.h };
      const selA = 1 - K.ramp(t, t1 + hold, t1 + hold + .08);
      S.sel(r, { handles: true, alpha: selA, pill: o.pill === false ? null : o.pill });
      const near = Math.hypot(d.x, d.y) < (o.snapZone ?? 26) || t >= snapT;
      const gA = near ? Math.min(selA, K.ramp(t, t0 + .1, t0 + .2)) : 0;
      if (gA > 0 && o.guides) o.guides(S, r, gA, t >= snapT);
    },
    cur(t) {
      if (t < t0 - .06 || t > t1 + hold) return null;
      const d = offAt(t);
      const prs = t < t0 ? K.seg(t, t0 - .06, t0) : t < t1 ? 1 : 1 - K.seg(t, t1, t1 + .06);
      return { x: grab.x + d.x, y: grab.y + d.y, press: prs };
    }
  };
};
/** helper: standard spacing measure between element rect r and a container rect C on given sides */
K.measures = function (S, r, C, sides, a, size) {
  for (const s of sides) {
    if (s === 'left') S.measure({ x: C.x, y: r.y + r.h / 2 }, { x: r.x, y: r.y + r.h / 2 }, round(r.x - C.x), { alpha: a, size });
    if (s === 'right') S.measure({ x: r.x + r.w, y: r.y + r.h / 2 }, { x: C.x + C.w, y: r.y + r.h / 2 }, round(C.x + C.w - r.x - r.w), { alpha: a, size });
    if (s === 'top') S.measure({ x: r.x + r.w / 2, y: C.y }, { x: r.x + r.w / 2, y: r.y }, round(r.y - C.y), { alpha: a, size });
    if (s === 'bottom') S.measure({ x: r.x + r.w / 2, y: r.y + r.h }, { x: r.x + r.w / 2, y: C.y + C.h }, round(C.y + C.h - r.y - r.h), { alpha: a, size });
  }
};

/** drawStroke: svg stroke via dash offset (or conic mask / wipe for css strokes). cursor follows the tip. */
A.drawStroke = function (S, o) {
  const el = S.find(o.el); const R = o.rect || S.rect(el);
  const t0 = o.t0, dur = o.dur ?? .6, t1 = t0 + dur;
  const shapes = [];
  if (el) {
    const list = el.matches('circle,path,line,ellipse,rect,polyline') ? [el] : [...el.querySelectorAll('circle,path,line,ellipse,polyline')];
    for (const s of list) { try { const real = s.getTotalLength(); const pl = parseFloat(s.getAttribute('pathLength')); shapes.push({ s, L: pl > 0 ? pl : real, real }); } catch (e) { } }
  }
  const mode = o.mode || (shapes.length ? 'svg' : 'conic');
  const start = o.startDeg ?? -90;
  const cx = R.x + R.w / 2, cy = R.y + R.h / 2, rad = Math.min(R.w, R.h) / 2;
  const tip = (u) => {
    if (mode === 'svg' && shapes.length && o.followSvg !== false) {
      const sh = shapes[0]; const p = sh.s.getPointAtLength(sh.real * u);
      const svg = sh.s.ownerSVGElement; const m = sh.s.getScreenCTM(); const mm = S.main.getBoundingClientRect();
      const q = new DOMPoint(p.x, p.y).matrixTransform(m); return { x: q.x - mm.left, y: q.y - mm.top };
    }
    if (mode === 'wipeDown') return { x: cx, y: R.y + R.h * u };
    if (mode === 'wipe') return { x: R.x + R.w * u, y: cy };
    const a = (start + 360 * u) * Math.PI / 180; return { x: cx + Math.cos(a) * rad, y: cy + Math.sin(a) * rad };
  };
  const tips = []; // precompute tips at final layout (avoid layout reads mid-frame)
  for (let i = 0; i <= 40; i++) tips.push(tip(i / 40));
  const tipAt = u => { const f = clamp(u) * 40, i = Math.min(39, Math.floor(f)), k = f - i; return { x: lerp(tips[i].x, tips[i + 1].x, k), y: lerp(tips[i].y, tips[i + 1].y, k) }; };
  const ez = ease(o.ease || 'inOutCubic');
  return {
    t0, t1, p0: tipAt(0), p1: tipAt(1), el, builds: true,
    apply(S, t) {
      const u = ez(K.seg(t, t0, t1));
      if (t < t0) { if (o.hideEl !== false) S.hide(el); else if (mode === 'svg') shapes.forEach(sh => { S.touch(sh.s); sh.s.style.strokeDasharray = sh.L; sh.s.style.strokeDashoffset = sh.L; }); return; }
      if (u >= 1) return;
      if (mode === 'svg') shapes.forEach(sh => { S.touch(sh.s); sh.s.style.strokeDasharray = `${sh.L} ${sh.L}`; sh.s.style.strokeDashoffset = String(sh.L * (1 - u)); sh.s.style.fillOpacity = String(K.ramp(u, .7, 1)); });
      else if (mode === 'conic') { const deg = u * 360; S.css(el, { webkitMaskImage: `conic-gradient(from ${start + 90}deg at 50% 50%, #000 ${deg}deg, transparent ${deg}deg)`, maskImage: `conic-gradient(from ${start + 90}deg at 50% 50%, #000 ${deg}deg, transparent ${deg}deg)` }); }
      else if (mode === 'wipeDown') S.css(el, { clipPath: `inset(0 0 ${(1 - u) * 100}% 0)` });
      else if (mode === 'wipe') S.css(el, { clipPath: `inset(-2px ${(1 - u) * 100}% -2px 0)` });
      if (o.sel) S.sel(R, { hover: true, alpha: .9 });
    },
    cur(t) {
      if (o.cursor === false || t < t0 - .04 || t > t1 + .1) return null;
      const p = tipAt(ez(K.seg(t, t0, t1)));
      return { x: p.x, y: p.y, kind: o.kind || 'cross', press: t < t1 ? 1 : 1 - K.seg(t, t1, t1 + .06) };
    }
  };
};

/** pickColor: colour popover, hex field typed "DE9D27", target colour transitions. */
A.pickColor = function (S, o) {
  const targets = [].concat(o.el).map(e => S.find(e)).filter(Boolean);
  const t0 = o.t0, dur = o.dur ?? 1.1, t1 = t0 + dur;
  const R = o.rect || S.rect(targets[0]);
  const hex = (o.to || '#DE9D27').replace('#', '').toUpperCase();
  const fromHex = (o.from || '#FFFFFF').replace('#', '').toUpperCase();
  const cdt = o.charDt ?? .055;
  const tOpen = t0 + .12, tSel = tOpen + .18, tTypeEnd = tSel + .1 + hex.length * cdt, tEnter = tTypeEnd + .06;
  const anchorSel = o.anchor || { x: R.x + R.w * .5, y: R.y + R.h * .5 };
  const hsv = K.hsv('#' + hex), hsv0 = K.hsv('#' + fromHex);
  return {
    t0, t1, p0: anchorSel, p1: anchorSel, builds: false,
    popPos(S) { const p = S.P(anchorSel.x, anchorSel.y), k = o.popScale || 1; return { x: clamp(p.x + (o.popDx ?? 40), 30, W - 30 - 260 * k), y: clamp(p.y + (o.popDy ?? 50), 150, H - 340 - 300 * k) }; },
    apply(S, t) {
      const cu = K.ramp(t, tEnter, tEnter + .18, 'outCubic');
      const col = K.mix('#' + fromHex, '#' + hex, cu);
      if (t >= t0) for (const el of targets) {
        if (cu >= 1) continue;
        const props = o.props || ['color'];
        const st = {}; for (const p of props) st[p] = col; S.css(el, st);
        for (const s of el.querySelectorAll('path,line,circle')) { S.touch(s); if (o.props && o.props.includes('fill')) s.style.fill = col; else s.style.stroke = col; }
      } else for (const el of targets) { const st = {}; for (const p of (o.props || ['color'])) st[p] = '#' + fromHex; S.css(el, st); for (const s of el.querySelectorAll('path,line,circle')) { S.touch(s); s.style.stroke = '#' + fromHex; } }
      if (t < t0 || t > t1) return;
      const pa = K.pulse(t, tOpen, t1, .12, .12);
      const k = Math.floor(clamp((t - tSel - .1) / cdt, 0, hex.length));
      const shown = t < tSel ? fromHex : t < tSel + .1 ? fromHex : hex.slice(0, k);
      const sel = t >= tSel && t < tSel + .1;
      const pp = this.popPos(S);
      S.sel(R, { handles: true, alpha: K.pulse(t, t0, t1, .05, .1) });
      S.popover(pp.x, pp.y, { scale: o.popScale || 1, alpha: pa, hex: sel ? `​${fromHex}` : shown, swatch: t >= tEnter ? '#' + hex : '#' + fromHex, caret: t >= tSel && t < tEnter + .1 && Math.floor((t - tSel) / .25) % 2 === 0 || (t >= tSel + .1 && t < tTypeEnd), hue: t >= tEnter ? hsv.h : hsv0.h, sx: (t >= tEnter ? hsv.s : hsv0.s) * 100, sy: (1 - (t >= tEnter ? hsv.v : hsv0.v)) * 100 });
      if (sel) { const k = o.popScale || 1; S.html(`<div style="position:absolute;left:${pp.x + (14 + 8 + 26) * k}px;top:${pp.y + (14 + 27 + 132 + 12 + 22 + 12 + 7) * k}px;width:${(measure(fromHex, 15) + 4) * k}px;height:${19 * k}px;background:rgba(13,153,255,.28)"></div>`); }
    },
    cur(t) {
      if (t < t0 - .02 || t > t1) return null;
      return { x: anchorSel.x, y: anchorSel.y, press: K.pulse(t, t0 - .02, t0 + .08, .03, .04) };
    }
  };
};

/** autoLayoutReveal: hover shows padding hints + gap pills, then hides. */
A.autoLayoutReveal = function (S, o) {
  const el = S.find(o.el); const R = S.rect(el); const cs = S.win.getComputedStyle(el);
  const t0 = o.t0, dur = o.dur ?? 1.0, t1 = t0 + dur;
  const p = o.pad || { t: parseFloat(cs.paddingTop) || 0, r: parseFloat(cs.paddingRight) || 0, b: parseFloat(cs.paddingBottom) || 0, l: parseFloat(cs.paddingLeft) || 0 };
  const gap = o.gap ?? (parseFloat(cs.rowGap) || parseFloat(cs.gap) || 0);
  const kids = o.kids ? o.kids.map(k => S.rect(k)) : [...el.children].filter(k => !/style|script/i.test(k.tagName)).map(k => S.rect(k)).filter(r => r.w > 2 && r.h > 2);
  const col = o.col ?? (cs.flexDirection && cs.flexDirection.startsWith('column'));
  const hov = { x: R.x + R.w * (o.hx ?? .78), y: R.y + R.h * (o.hy ?? .3) };
  return {
    t0, t1, p0: hov, p1: hov, builds: false,
    apply(S, t) {
      if (t < t0 || t > t1) return;
      const a = K.pulse(t, t0, t1, .12, .15);
      S.sel(R, { hover: true, alpha: a });
      S.pad(R, p, { alpha: a });
      const pa = K.pulse(t, t0 + .12, t1, .1, .15);
      if (p.t) S.measure({ x: R.x + R.w * .5, y: R.y }, { x: R.x + R.w * .5, y: R.y + p.t }, round(p.t), { alpha: pa, pillAt: 'side' });
      if (p.l) S.measure({ x: R.x, y: R.y + (p.t || 0) * .5 }, { x: R.x + p.l, y: R.y + (p.t || 0) * .5 }, round(p.l), { alpha: pa });
      if (p.b) S.measure({ x: R.x + R.w * .5, y: R.y + R.h - p.b }, { x: R.x + R.w * .5, y: R.y + R.h }, round(p.b), { alpha: pa, pillAt: 'side' });
      if (gap && kids.length > 1) {
        for (let i = 1; i < kids.length; i++) {
          const A1 = kids[i - 1], B1 = kids[i];
          if (col) { const y0 = A1.y + A1.h, y1 = B1.y; if (y1 - y0 > 2) { S.rectFill({ x: R.x + p.l, y: y0, w: R.w - p.l - p.r, h: y1 - y0 }, '#F24E1E', { alpha: .12 * a }); S.measure({ x: R.x + R.w * .66, y: y0 }, { x: R.x + R.w * .66, y: y1 }, round(y1 - y0), { alpha: pa, pillAt: 'side' }); } }
          else { const x0 = A1.x + A1.w, x1 = B1.x; if (x1 - x0 > 2) S.measure({ x: x0, y: A1.y + A1.h / 2 }, { x: x1, y: A1.y + A1.h / 2 }, round(x1 - x0), { alpha: pa }); }
        }
      }
    },
    cur(t) { if (t < t0 - .02 || t > t1) return null; const w = K.seg(t, t0, t1); return { x: hov.x + w * 14, y: hov.y + w * 8 }; }
  };
};

/** select: click an element, selection box + handles + size pill */
A.select = function (S, o) {
  const el = S.find(o.el); const R = S.rect(el);
  const t0 = o.t0, dur = o.dur ?? .6, t1 = t0 + dur;
  const c = o.at || { x: R.x + R.w * .5, y: R.y + R.h * .5 };
  return {
    t0, t1, p0: c, p1: c, builds: false,
    apply(S, t) {
      if (t < t0 || t > t1) return;
      const live = o.live ? S.liveRect(el) : R;
      S.sel(live, { handles: true, alpha: K.pulse(t, t0, t1, .03, .08), pill: o.pill === false ? null : (typeof o.pill === 'function' ? o.pill(live, t) : sizeTxt(live.w, live.h)) });
      if (o.during) o.during(S, t, live);
    },
    cur(t) { if (t < t0 - .02 || t > t1) return null; return { x: c.x, y: c.y, press: K.pulse(t, t0 - .02, t0 + .08, .03, .04) }; }
  };
};

/** custom action wrapper */
A.custom = function (o) { return Object.assign({ builds: false, cur: () => null }, o); };

/* ---------------- timeline: applies actions + moves the cursor between them ---------------- */
K.Timeline = class {
  constructor(S, actions, o = {}) { this.S = S; this.acts = actions.filter(Boolean); this.o = o; }
  apply(t) {
    const S = this.S;
    for (const a of this.acts) a.apply(S, t);
    if (this.o.cursor === false) return;
    const c = this.cursorAt(t);
    if (c) S.cursor(c);
  }
  cursorAt(t) {
    const acts = this.acts.filter(a => a.p0 && !a.nocursor && a.cursor !== false);
    let active = null;
    for (const a of acts) { const c = a.cur(t); if (c) active = c; }
    if (active) return Object.assign({ alpha: this.alphaAt(t) }, active);
    // between actions: travel from prev.p1 to next.p0
    let prev = null, next = null;
    for (const a of acts) { if (a.t1 <= t) { if (!prev || a.t1 >= prev.t1) prev = a; } }
    for (const a of acts) { if (a.t0 > t) { if (!next || a.t0 < next.t0) next = a; } }
    const rest = this.o.rest;
    if (!prev && !next) return rest ? Object.assign({ alpha: this.alphaAt(t) }, rest) : null;
    if (!prev) { const p = next.p0; const ent = this.o.enter; if (ent) { const ts = ent.t0 != null ? ent.t0 : next.t0 - (ent.dur || .5); const u = E.hand(K.seg(t, ts, ts + (ent.dur || .5))); return { x: lerp(ent.x, p.x, u), y: lerp(ent.y, p.y, u), alpha: this.alphaAt(t) }; } return { x: p.x, y: p.y, alpha: this.alphaAt(t) }; }
    const A0 = prev.p1;
    // screen-space offset the previous action ended with (e.g. the hand moved away while typing): carried, then eased out
    const pe = prev.cur ? prev.cur(prev.t1) : null; const eox = (pe && pe.ox) || 0, eoy = (pe && pe.oy) || 0;
    if (!next) {
      const ex = this.o.exit; if (ex) { const ts = ex.t0 != null ? ex.t0 : prev.t1 + .05; const u = E.hand(K.seg(t, ts, ts + (ex.dur || .5))); return { x: lerp(A0.x, ex.x, u), y: lerp(A0.y, ex.y, u), ox: eox * (1 - u), oy: eoy * (1 - u), alpha: this.alphaAt(t) }; }
      const w = K.seg(t, prev.t1, prev.t1 + 2); return { x: A0.x + 10 * E.outCubic(w), y: A0.y + 6 * E.outCubic(w), ox: eox, oy: eoy, alpha: this.alphaAt(t) };
    }
    const B0 = next.p0;
    const gap = next.t0 - prev.t1;
    const tr = Math.min(gap, this.o.travel ?? .42);
    const ts = next.t0 - tr;
    const u = E.hand(K.seg(t, ts, next.t0 - .01));
    const dx = B0.x - A0.x, dy = B0.y - A0.y, L = Math.hypot(dx, dy) || 1;
    const arc = Math.sin(Math.PI * u) * Math.min(L * .08, 60);
    // tiny overshoot (<= 6px on screen) near the end
    const z = this.S.cam.zoom || 1;
    const os = Math.sin(clamp((u - .82) / .18) * Math.PI) * Math.min(5 / z, L * .02);
    return { x: A0.x + dx * u - dy / L * arc + dx / L * os, y: A0.y + dy * u + dx / L * arc + dy / L * os, ox: eox * (1 - u), oy: eoy * (1 - u), alpha: this.alphaAt(t) };
  }
  alphaAt(t) { return this.o.alpha ? this.o.alpha(t) : 1; }
};

/* ---------------- scene bootstrap ---------------- */
/** K.scene({duration, bg, setup(S) -> state, frame(S, t, state)}) wires window.DURATION/seek/ready */
K.scene = function (def) {
  window.DURATION = def.duration;
  const S = new Stage(def.stage || {});
  window.S = S;
  let st = null;
  window.ready = (async () => {
    await S.load();
    st = (await def.setup(S)) || {};
    window.seek(0);
    await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
    return true;
  })();
  // max on-screen displacement (px) of canvas, cursor and moving elements between times a and b (for the shutter)
  window.motionPx = function (a, b) {
    const snap = () => {
      const pts = [];
      for (let gy = 0; gy <= 10; gy++) for (let gx = 0; gx <= 6; gx++) pts.push([gx * W / 6, gy * H / 10]);
      const world = pts.map(([x, y]) => S.unP(x, y));
      const cur = S.cur.style.display !== 'none' ? S.cur.style.transform : null;
      const els = [];
      for (const [el] of S.touched) if (el.style.transform && el.style.transform !== 'none') { const r = S.liveRect(el); els.push([el, r.x + r.w / 2, r.y + r.h / 2]); }
      return { world, cur, els };
    };
    const curXY = s => { if (!s) return null; const m = s.match(/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/); return m ? [+m[1], +m[2]] : null; };
    const tc = (a + b) / 2;
    window.seek(a, tc); const A = snap();
    window.seek(b, tc); const B = snap();
    let d = 0;
    // canvas: where do the page points seen at time a land at time b
    window.seek(a, tc); const pa = A.world.map(p => S.P(p.x, p.y));
    window.seek(b, tc); const pb = A.world.map(p => S.P(p.x, p.y));
    for (let i = 0; i < pa.length; i++) if (pa[i].x > -200 && pa[i].x < W + 200 && pa[i].y > -200 && pa[i].y < H + 200) d = Math.max(d, Math.hypot(pb[i].x - pa[i].x, pb[i].y - pa[i].y));
    const ca = curXY(A.cur), cb = curXY(B.cur);
    if (ca && cb) d = Math.max(d, Math.hypot(cb[0] - ca[0], cb[1] - ca[1]));
    for (const [el, x, y] of B.els) { const o = A.els.find(e => e[0] === el); const pa2 = S.P(o ? o[1] : x, o ? o[2] : y); const pb2 = S.P(x, y); if (o) d = Math.max(d, Math.hypot(pb2.x - pa2.x, pb2.y - pa2.y)); }
    return d;
  };
  // seek(t, tc): camera at t (shutter sample), discrete UI/actions at tc (frame centre) so typing,
  // carets, cursor and pills never double-expose inside one motion-blurred frame
  window.seek = function (t, tc) {
    if (!st) return;
    t = clamp(t, 0, def.duration);
    tc = tc == null ? t : clamp(tc, 0, def.duration);
    S.tcam = t;
    S.begin(tc);
    def.frame(S, tc, st);
    S.end();
  };
  window.cutTimes = function () { return S._cuts || []; };
  return S;
};
})();
