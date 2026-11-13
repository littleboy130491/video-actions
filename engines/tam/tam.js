/* engine/tam.js — TeAM (Obys-styled) helpers on top of kit.js + v2.js (stage, scene, iframe pages, style registry).
 * Black stage, giant Inter type in letter block-masks, hard block wipes, ring pulses (logo motif), dark dot-grid
 * canvas, Figma-like selection UI (Inter), bending sheets. Pure functions of t. Exposes window.TAM. */
(function () {
'use strict';
const T = window.TAM = {};
const mk = V.mk, E = K.E, SG = K.seg, R = K.ramp, lerp = K.lerp, clamp = K.clamp, f3 = v => (+v).toFixed(3);
T.OR = '#FC621B'; T.TEAL = '#29C8A0'; T.W = '#FDFDFD'; T.INK = '#232323'; T.CV = '#1E1E1E'; T.BK = '#0A0A0A';
T.BLUE = '#0D99FF'; T.RED = '#F24822';
T.back = u => { u = clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };
T.f3 = f3;

/* ---------- giant type: every letter sits in its own overflow mask (block behaviour) ---------- */
T.word = function (parent, text, o = {}) {
  const el = mk('div', 'gw', parent, `font-size:${o.fs || 300}px;font-weight:${o.weight || 600};color:${o.color || T.W};` + (o.css || ''));
  const L = [];
  for (const ch of text) { const m = mk('span', 'm', el); const s = mk('span', '', m); s.textContent = ch === ' ' ? ' ' : ch; L.push(s); }
  const W = { el, L, text,
    width() { return el.getBoundingClientRect().width; },
    /** set font-size so the word is exactly w px wide */
    fit(w) { const fs = parseFloat(el.style.fontSize); el.style.fontSize = f3(fs * w / W.width()) + 'px'; return W; },
    /** letters slide in from below (dir 1) / above (-1) with stagger; returns progress */
    in(t, t0, d = .38, stg = .028, dir = 1, alt = false) {
      L.forEach((s, i) => { const v = E.outExpo(SG(t, t0 + i * stg, t0 + i * stg + d)); const dd = alt && i % 2 ? -dir : dir;
        s.style.transform = `translateY(${f3((1 - v) * 105 * dd)}%)`; });
    },
    out(t, t0, d = .3, stg = .02, dir = -1) {
      if (t < t0) return; L.forEach((s, i) => { const v = E.inExpo(SG(t, t0 + i * stg, t0 + i * stg + d)); s.style.transform = `translateY(${f3(v * 105 * dir)}%)`; });
    } };
  return W;
};
/** tiny centred label */
T.label = (parent, text, css = '') => { const e = mk('div', 'lbl', parent, css); e.textContent = text; return e; };
/** rectangular reveal: u 0..1, dir 'up'|'down'|'left'|'right' (side the block grows from) */
T.wipe = function (el, u, dir = 'up') {
  u = clamp(u); const p = f3((1 - u) * 100) + '%';
  el.style.clipPath = dir === 'up' ? `inset(${p} 0 0 0)` : dir === 'down' ? `inset(0 0 ${p} 0)` : dir === 'left' ? `inset(0 0 0 ${p})` : `inset(0 ${p} 0 0)`;
  el.style.visibility = u <= 0 ? 'hidden' : 'visible';
};
/** hide (u 0..1) by a block retracting towards side dir */
T.unwipe = function (el, u, dir = 'up') {
  u = clamp(u); const p = f3(u * 100) + '%';
  el.style.clipPath = dir === 'up' ? `inset(0 0 ${p} 0)` : dir === 'down' ? `inset(${p} 0 0 0)` : dir === 'left' ? `inset(0 ${p} 0 0)` : `inset(0 0 0 ${p})`;
  el.style.visibility = u >= 1 ? 'hidden' : 'visible';
};

/* ---------- rings (logo motif) ---------- */
T.svg = function (parent, z = 5) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', 1080); s.setAttribute('height', 1920); s.style.cssText = `position:absolute;left:0;top:0;overflow:visible;z-index:${z}`;
  (parent || V.over).appendChild(s); return s;
};
/** circles [{x,y,r,col,sw,a,dash}] -> svg */
T.drawRings = function (svg, cs) {
  const h = cs.filter(c => (c.a ?? 1) > .004 && c.r > .5).map(c => `<circle cx="${f3(c.x)}" cy="${f3(c.y)}" r="${f3(c.r)}" fill="none" stroke="${c.col || T.OR}" stroke-width="${f3(c.sw || 3)}" opacity="${f3(c.a ?? 1)}"${c.dash ? ` pathLength="1000" stroke-dasharray="1000 1000" stroke-dashoffset="${f3(c.dash)}" transform="rotate(-90 ${f3(c.x)} ${f3(c.y)})"` : ''}/>`).join('');
  if (svg._h !== h) { svg.innerHTML = h; svg._h = h; }
};
/** radar pulse: n rings leaving (x,y) from t0, each over d s, staggered; returns circles */
T.pulse = function (t, t0, x, y, o = {}) {
  const n = o.n || 3, d = o.d || .7, stg = o.stg || .12, r0 = o.r0 || 6, r1 = o.r1 || 120, out = [];
  for (let i = 0; i < n; i++) { const u = SG(t, t0 + i * stg, t0 + i * stg + d); if (u <= 0 || u >= 1) continue;
    out.push({ x, y, r: lerp(r0, r1, E.outCubic(u)), col: (o.cols || [T.OR, T.TEAL])[i % (o.cols || [0, 0]).length], sw: (o.sw || 3) * (1 - .5 * u), a: (o.a ?? 1) * (1 - E.inQuad(u)) }); }
  return out;
};

/* ---------- dark design canvas (dot grid) ---------- */
T.canvas = function () {
  const e = mk('div', '', null, `position:absolute;inset:0;background-color:${T.CV};background-image:radial-gradient(circle,rgba(255,255,255,.085) 1.5px,rgba(0,0,0,0) 2px)`);
  V.sky.after(e);
  return { el: e, upd(c) { const g = 32 * c.z; e.style.backgroundSize = `${f3(g)}px ${f3(g)}px`;
    const ox = 540 - c.x * c.z - g / 2, oy = 960 - c.y * c.z - g / 2; e.style.backgroundPosition = `${f3(((ox % g) + g) % g)}px ${f3(((oy % g) + g) % g)}px`; } };
};

/* ---------- Figma-like selection UI (screen space, Inter) ---------- */
T.ui = function () {
  const svg = T.svg(V.over, 10);
  let parts = [];
  const pillSvg = (txt, cx, cy, col, fs = 20) => { const w = String(txt).length * fs * .6 + 20, h = fs + 14;
    return `<rect x="${f3(cx - w / 2)}" y="${f3(cy - h / 2)}" width="${f3(w)}" height="${h}" rx="5" fill="${col}"/><text x="${f3(cx)}" y="${f3(cy + fs * .36)}" font-family="Inter" font-weight="600" font-size="${fs}" fill="#fff" text-anchor="middle">${txt}</text>`; };
  const U = {
    begin() { parts = []; },
    end() { const h = parts.join(''); if (h !== U._h) { svg.innerHTML = h; U._h = h; } },
    raw(s) { parts.push(s); },
    box(r, o = {}) { const a = o.a ?? 1; if (a < .01) return; const c = o.col || T.BLUE;
      parts.push(`<g opacity="${f3(a)}"><rect x="${f3(r.x)}" y="${f3(r.y)}" width="${f3(Math.max(.5, r.w))}" height="${f3(Math.max(.5, r.h))}" fill="${o.fill || 'none'}" stroke="${c}" stroke-width="${o.sw || 2.5}" ${o.dash ? 'stroke-dasharray="7 5"' : ''}/>`);
      if (o.handles) for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) parts.push(`<rect x="${f3(x - 6)}" y="${f3(y - 6)}" width="12" height="12" fill="#fff" stroke="${c}" stroke-width="2"/>`);
      if (o.size) parts.push(pillSvg(o.size, r.x + r.w / 2, r.y + r.h + 28, c));
      if (o.label) parts.push(`<text x="${f3(r.x)}" y="${f3(r.y - 12)}" font-family="Inter" font-weight="500" font-size="20" fill="${o.labelCol || T.BLUE}">${o.label}</text>`);
      parts.push('</g>'); },
    line(a, b, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<line x1="${f3(a.x)}" y1="${f3(a.y)}" x2="${f3(b.x)}" y2="${f3(b.y)}" stroke="${o.col || T.RED}" stroke-width="${o.sw || 2}" opacity="${f3(al)}" ${o.dash ? 'stroke-dasharray="6 5"' : ''}/>`); },
    pill(txt, x, y, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<g opacity="${f3(al)}">${pillSvg(txt, x, y, o.col || T.RED, o.fs)}</g>`); },
    gap(a, b, txt, o = {}) { const al = o.a ?? 1; if (al < .01) return; U.line(a, b, { a: al });
      const vert = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      for (const p of [a, b]) U.line(vert ? { x: p.x - 8, y: p.y } : { x: p.x, y: p.y - 8 }, vert ? { x: p.x + 8, y: p.y } : { x: p.x, y: p.y + 8 }, { a: al });
      U.pill(txt, (a.x + b.x) / 2 + (vert ? (o.dx ?? 36) : 0), (a.y + b.y) / 2 + (vert ? 0 : (o.dy ?? -28)), { a: al }); },
    gapTint(r, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<rect x="${f3(r.x)}" y="${f3(r.y)}" width="${f3(r.w)}" height="${f3(r.h)}" fill="rgba(242,72,186,.28)" opacity="${f3(al)}"/>`); },
    circle(c) { if ((c.a ?? 1) < .01) return; parts.push(`<circle cx="${f3(c.x)}" cy="${f3(c.y)}" r="${f3(c.r)}" fill="none" stroke="${c.col || T.OR}" stroke-width="${f3(c.sw || 3)}" opacity="${f3(c.a ?? 1)}"/>`); },
  };
  return U;
};
/** fill chip with a typed hex */
T.chip = function () {
  const c = mk('div', '', V.over, 'position:absolute;left:0;top:0;display:none;align-items:center;gap:12px;height:48px;padding:0 16px 0 9px;border-radius:10px;background:#2C2C2C;box-shadow:0 8px 24px rgba(0,0,0,.45),inset 0 0 0 1px rgba(255,255,255,.08);font:600 22px Inter;color:#F0F0F0;z-index:45;white-space:nowrap');
  c.innerHTML = '<span class="sw" style="width:30px;height:30px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(255,255,255,.18)"></span><span class="hx"></span>';
  const sw = c.querySelector('.sw'), hx = c.querySelector('.hx');
  return { el: c, set(q) { if (!q) { c.style.display = 'none'; return; } c.style.display = 'flex'; c.style.opacity = f3(q.a ?? 1);
    c.style.transform = `translate(${f3(q.x)}px,${f3(q.y)}px)`; sw.style.background = q.sw;
    const h = `<span style="color:#9A9A9A;font-weight:500">Fill</span>&nbsp; #${q.hex}` + (q.caret ? '<span style="display:inline-block;width:2px;height:24px;background:#0D99FF;vertical-align:-4px;margin-left:1px"></span>' : '');
    if (hx._h !== h) { hx.innerHTML = h; hx._h = h; } } };
};

/* ---------- bending sheet (page curls like paper around a vertical axis) ---------- */
T.sheet = function (parent, src, w, h, o = {}) {
  const n = o.n || 30, sw = w / n, k = o.k || 1;      // k: image scale (page px -> sheet px)
  const root = mk('div', 'o', parent, `width:0;height:0`);
  const strips = [];
  for (let i = 0; i < n; i++) {
    const s = mk('div', 'f', root, `left:0;top:${-h / 2}px;width:${sw + .8}px;height:${h}px;transform-origin:0 50%;background:url(${src}) no-repeat;background-size:${w}px auto;background-position:${f3(-i * sw)}px 0;backface-visibility:hidden`);
    const sh = mk('div', 'f', s, 'inset:0;background:#000;opacity:0');
    strips.push({ s, sh });
  }
  const S = { root, w, h, n,
    /** curl: total bend angle (rad, + = edges away); y0: page crop top (sheet px); p: pose for V.tf */
    set(curl, y0 = 0, p) { if (p) V.tf(root, p);
      const big = Math.abs(curl) < 1e-4, Rr = big ? 0 : w / curl;
      strips.forEach(({ s, sh }, i) => { const fa = (i / n) - .5, fb = ((i + 1) / n) - .5;
        let x, z, a;
        if (big) { x = fa * w; z = 0; a = 0; }
        else { const aa = curl * fa; x = Rr * Math.sin(aa); z = -Rr * (1 - Math.cos(aa)); a = aa; }
        s.style.transform = `translate3d(${f3(x)}px,0,${f3(z)}px) rotateY(${f3(a * 180 / Math.PI)}deg)`;
        s.style.backgroundPosition = `${f3(-i * sw)}px ${f3(-y0)}px`;
        sh.style.opacity = f3(Math.min(.55, Math.abs(Math.sin(curl * (fa + fb) / 2)) * .9)); });
    } };
  return S;
};

/* ---------- misc ---------- */
/** keyed camera track [[t, x, y, z, ease, dip]] (log-zoom interpolation, optional zoom dip) */
T.camTrack = CK => function (t) {
  let i = 1; while (i < CK.length - 1 && t > CK[i][0]) i++;
  const a = CK[i - 1], b = CK[i], u = E[b[4] || 'inOutCubic'](SG(t, a[0], b[0]));
  const lz = lerp(Math.log(a[3]), Math.log(b[3]), u) - (b[5] || 0) * Math.sin(Math.PI * u);
  return { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lz) };
};
/** cursor keys [[t, x, y, kind]] in world coords -> screen via P */
T.curAt = function (CUR, t, P) {
  let k = 1; while (k < CUR.length - 1 && t > CUR[k][0]) k++;
  if (t <= CUR[0][0]) { const p = P(CUR[0][1], CUR[0][2]); return { x: p.x, y: p.y, kind: CUR[0][3] }; }
  const a = CUR[k - 1], b = CUR[k], uu = SG(t, a[0], b[0]), u = E.hand(uu), A = P(a[1], a[2]), B = P(b[1], b[2]);
  return { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u), kind: uu < .5 ? a[3] : b[3] };
};

/* ---------- live-site hero background video inside a final.html iframe ---------- */
/** replaces hero-photo with the site's drone video (assets/video/hv_###.jpg, 1280x720 = <=1x at page scale .75) and
 *  strokes the hero ring arcs light (the photo-pattern strokes would show a still photo over moving video).
 *  returns set(vt) (video seconds). */
T.heroVideo = async function (doc, n = 126) {
  const ph = doc.querySelector('[data-el="hero-photo"]');
  const box = doc.createElement('div'); box.style.cssText = 'position:absolute;left:0;top:0;width:1440px;height:800px;overflow:hidden';
  ph.after(box); ph.style.visibility = 'hidden';
  const ims = [];
  for (let i = 1; i <= n; i++) { const im = doc.createElement('img'); im.style.cssText = 'position:absolute;left:0;top:-5px;width:1440px;height:810px;display:none;max-width:none';
    im.src = `../assets/video/hv_${String(i).padStart(3, '0')}.jpg`; box.appendChild(im); ims.push(im); }
  await Promise.all(ims.map(i => i.decode().catch(() => 0)));
  doc.querySelectorAll('[data-el="hero-rings"] path').forEach(p => p.setAttribute('stroke', T.RINGCOL));
  let cur = -1;
  return vt => { const k = Math.max(0, Math.min(n - 1, Math.floor(vt * 30 + 1e-6)));
    if (k !== cur) { if (cur >= 0) ims[cur].style.display = 'none'; ims[k].style.display = 'block'; cur = k; } };
};
T.RINGCOL = 'rgba(226,232,236,.36)';
/** hero ring arcs (design hero-rings): [cx, cy, [r1,r2,r3], sw] in hero coords (1440x800) */
T.HERO_RINGS = [[-155.54, 184.1, [433.09, 298.65, 169.06], 31.89], [1598.59, 187.5, [429.76, 296.35, 167.76], 31.65]];
})();

(function () {
const T = window.TAM;
/** live-site testimonial instead of the design's lorem; adds a drawable white background rect for the clients
 *  section (the design has no element for it, it is the page fill) as data-el "clients-bg" (lowest z). */
T.fixClients = function (doc) {
  const q = id => doc.querySelector(`[data-el="${id}"]`);
  const set = (id, s) => { const e = q(id); if (e) e.textContent = s; };
  set('clients-quote', 'Apresiasi baik untuk TeAM atas implementasi peralatan pemantauan cuaca pada beberapa gunung aktif di Indonesia. Solusi teknologi pemantauan yang andal, didukung tim yang sangat komunikatif.');
  set('clients-name', 'Pusat Vulkanologi dan Mitigasi Bencana Geologi'); set('clients-job', 'PVMBG');
  const nm = q('clients-name'); if (nm) nm.style.whiteSpace = 'nowrap';
  const pg = doc.getElementById('page'), bg = getComputedStyle(pg).backgroundColor;
  const r = doc.createElement('div'); r.setAttribute('data-el', 'clients-bg');
  r.style.cssText = `position:absolute;left:0;top:6258px;width:1440px;height:1042px;background:${bg === 'rgba(0, 0, 0, 0)' ? '#FFFFFF' : bg}`;
  pg.insertBefore(r, pg.firstChild);
  return { pageBg: bg };
};
})();
