/* engine/v2_ws.js — light design-tool workspace for the PROCESS beats: dot-grid canvas plane (world), a generic
 * properties panel on the right edge (screen space), screen-space selection / size / spacing UI drawn from projected
 * world points, and a screen-space cursor. No third-party branding. Needs v2.js. Exposes window.VW. */
(function () {
'use strict';
const W = window.VW = {};
const mk = V.mk, f2 = v => (+v).toFixed(2);
W.BLUE = '#0D99FF'; W.RED = '#F24822';
W.PANEL_W = 262;
W.AREA_CX = (1080 - W.PANEL_W) / 2;     // centre x of the free canvas area left of the panel

/** dot-grid canvas plane in the world (z slightly behind the frames) */
W.canvas = function () {
  const e = mk('div', '', null, 'position:absolute;inset:0;background-color:#F3F3F3;background-image:radial-gradient(circle,#D2D2D2 1.6px,rgba(0,0,0,0) 2px)');
  V.sky.after(e);
  const C = { el: e, set(a) { e.style.opacity = (+a).toFixed(3); e.style.display = a < .005 ? 'none' : ''; },
    upd(c) { const z = V.P / (c.d ?? V.P), g = 32 * z; e.style.backgroundSize = `${g.toFixed(3)}px ${g.toFixed(3)}px`;
      const ox = 540 - (c.x || 0) * z - g / 2, oy = 960 - (c.y || 0) * z - g / 2; e.style.backgroundPosition = `${(((ox % g) + g) % g).toFixed(2)}px ${(((oy % g) + g) % g).toFixed(2)}px`; } };
  V._canvas = C; return C;
};
/** camera helper for the flat workspace: world point (x,y,z) at screen (sx, sy) with zoom */
W.cam = function (x, y, zoom, sx = W.AREA_CX, sy = 960, z = 0) {
  return { x: x + (540 - sx) / zoom, y: y + (960 - sy) / zoom, z, d: V.P / zoom, rx: 0, ry: 0 };
};

/* ---------- properties panel ---------- */
W.panel = function () {
  const P = mk('div', '', V.over, `position:absolute;right:0;top:0;width:${W.PANEL_W}px;height:1920px;background:#fff;border-left:1px solid #E3E3E3;box-shadow:-6px 0 24px rgba(0,0,0,.04);font-family:Poppins;color:#1E1E1E;z-index:20`);
  P.innerHTML = `
  <div style="height:70px;display:flex;align-items:flex-end;gap:22px;padding:0 20px 14px;border-bottom:1px solid #EDEDED;font:600 18px Poppins"><span>Design</span><span style="color:#B3B3B3;font-weight:500">Prototype</span></div>
  <div class="sec" style="padding:18px 20px;border-bottom:1px solid #EDEDED">
    <div style="display:flex;align-items:center;gap:10px;font:600 19px Poppins"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M5 1v16M13 1v16M1 5h16M1 13h16" stroke="#8C8C8C" stroke-width="1.6"/></svg><span data-f="name">Frame</span></div>
    <div class="g2" style="margin-top:16px"><div class="fl"><i>X</i><b data-f="x">0</b></div><div class="fl"><i>Y</i><b data-f="y">0</b></div>
    <div class="fl"><i>W</i><b data-f="w">0</b></div><div class="fl"><i>H</i><b data-f="h">0</b></div></div>
  </div>
  <div class="sec" style="padding:18px 20px;border-bottom:1px solid #EDEDED">
    <div class="hd">Auto layout</div>
    <div class="g2"><div class="fl" data-k="pad"><i><svg width="16" height="16"><rect x="2" y="2" width="12" height="12" rx="1" fill="none" stroke="#8C8C8C" stroke-width="1.5" stroke-dasharray="2 2"/></svg></i><b data-f="pad">0</b></div>
    <div class="fl" data-k="gap"><i><svg width="16" height="16"><path d="M3 2v12M13 2v12" stroke="#8C8C8C" stroke-width="1.5"/><path d="M6 8h4" stroke="#8C8C8C" stroke-width="1.5"/></svg></i><b data-f="gap">0</b></div></div>
  </div>
  <div class="sec" style="padding:18px 20px;border-bottom:1px solid #EDEDED">
    <div class="hd">Fill</div>
    <div class="fl wide" data-k="fill"><span data-f="sw" style="width:26px;height:26px;border-radius:5px;flex:none;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)"></span><b data-f="fill" style="flex:1">FFFFFF</b><span style="color:#9A9A9A;font-size:17px">100%</span></div>
  </div>
  <div class="sec" style="padding:18px 20px;border-bottom:1px solid #EDEDED">
    <div class="hd">Text</div>
    <div class="fl wide" data-k="font"><b data-f="font">Poppins</b></div>
    <div class="g2" style="margin-top:10px"><div class="fl" data-k="weight"><b data-f="weight">Regular</b></div><div class="fl" data-k="size"><b data-f="size">16</b></div></div>
  </div>
  <div class="sec" style="padding:18px 20px">
    <div class="hd">Layers</div><div data-f="layers" style="display:flex;flex-direction:column;gap:6px"></div>
  </div>
  <style>
  #over .g2{display:grid;grid-template-columns:1fr 1fr;gap:10px}
  #over .fl{height:44px;border-radius:7px;background:#F5F5F5;display:flex;align-items:center;gap:10px;padding:0 12px;font-size:19px;box-shadow:inset 0 0 0 0 #0D99FF;overflow:hidden;white-space:nowrap}
  #over .fl.wide{width:100%}
  #over .fl i{font-style:normal;color:#9A9A9A;font-size:16px;display:flex}
  #over .fl b{font-weight:500}
  #over .fl.hl{box-shadow:inset 0 0 0 2px #0D99FF;background:#fff}
  #over .hd{font:600 17px Poppins;color:#1E1E1E;margin-bottom:12px}
  #over .ly{display:flex;align-items:center;gap:10px;font:500 16px Poppins;color:#4A4A4A;height:30px;padding:0 8px;border-radius:5px;white-space:nowrap;overflow:hidden}
  #over .ly.on{background:#E5F4FF;color:#0D6EBF}
  </style>`;
  const F = {}; P.querySelectorAll('[data-f]').forEach(e => F[e.dataset.f] = e);
  const fields = {}; P.querySelectorAll('.fl').forEach(e => { const b = e.querySelector('b'); if (b) fields[b.dataset.f] = e; });
  const caret = '<span style="display:inline-block;width:2px;height:22px;background:#0D99FF;vertical-align:-4px;margin-left:1px"></span>';
  const api = { el: P,
    /** q: {a (slide-in 0..1), name, x,y,w,h, pad,gap, fill (hex, no #), font, weight, size, hl: field key, caret: bool, layers: [[name, on, alpha]]} */
    set(q) {
      const a = q.a ?? 1; P.style.display = a < .005 ? 'none' : 'block';
      P.style.transform = `translateX(${f2((1 - a) * (W.PANEL_W + 30))}px)`;
      for (const k of ['name', 'x', 'y', 'w', 'h', 'pad', 'gap', 'fill', 'font', 'weight', 'size']) {
        if (q[k] == null) continue;
        let v = String(q[k]); if (typeof q[k] === 'number') v = String(Math.round(q[k] * 10) / 10);
        const html = v.replace(/</g, '&lt;') + (q.caret && q.hl === k ? caret : '');
        if (F[k]._h !== html) { F[k].innerHTML = html; F[k]._h = html; }
      }
      F.sw.style.background = '#' + (q.swatch || q.fill || 'FFFFFF').replace('#', '').padEnd(6, '0').slice(0, 6);
      for (const k in fields) fields[k].classList.toggle('hl', q.hl === k);
      const lh = (q.layers || []).map(([n, on, al]) => `<div class="ly${on ? ' on' : ''}" style="opacity:${al ?? 1}"><svg width="14" height="14"><rect x="1.5" y="1.5" width="11" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>${n}</div>`).join('');
      if (F.layers._h !== lh) { F.layers.innerHTML = lh; F.layers._h = lh; }
    }
  };
  return api;
};

/* ---------- screen-space selection UI ---------- */
W.ui = function () {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', 1080); svg.setAttribute('height', 1920); svg.style.cssText = 'position:absolute;left:0;top:0;z-index:10;overflow:visible';
  V.over.appendChild(svg);
  let parts = [];
  const pillSvg = (txt, cx, cy, col, fs = 19) => { const w = txt.length * fs * .62 + 18, h = fs + 14;
    return `<rect x="${f2(cx - w / 2)}" y="${f2(cy - h / 2)}" width="${f2(w)}" height="${h}" rx="5" fill="${col}"/><text x="${f2(cx)}" y="${f2(cy + fs * .36)}" font-family="Poppins" font-weight="600" font-size="${fs}" fill="#fff" text-anchor="middle">${txt}</text>`; };
  const U = {
    begin() { parts = []; },
    end() { const h = parts.join(''); if (h !== U._h) { svg.innerHTML = h; U._h = h; } },
    /** r: screen rect {x,y,w,h} */
    box(r, o = {}) { const a = o.a ?? 1; if (a < .01) return; const c = o.col || W.BLUE;
      parts.push(`<g opacity="${f2(a)}"><rect x="${f2(r.x)}" y="${f2(r.y)}" width="${f2(r.w)}" height="${f2(r.h)}" fill="${o.fill || 'none'}" stroke="${c}" stroke-width="${o.sw || 2.5}" ${o.dash ? 'stroke-dasharray="7 5"' : ''}/>`);
      if (o.handles) for (const [x, y] of [[r.x, r.y], [r.x + r.w, r.y], [r.x, r.y + r.h], [r.x + r.w, r.y + r.h]]) parts.push(`<rect x="${f2(x - 6)}" y="${f2(y - 6)}" width="12" height="12" fill="#fff" stroke="${c}" stroke-width="2"/>`);
      if (o.size) parts.push(pillSvg(o.size, r.x + r.w / 2, r.y + r.h + 26, c));
      if (o.label) parts.push(`<text x="${f2(r.x)}" y="${f2(r.y - 12)}" font-family="Poppins" font-weight="500" font-size="20" fill="${o.labelCol || '#8C8C8C'}">${o.label}</text>`);
      parts.push('</g>'); },
    line(a, b, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<line x1="${f2(a.x)}" y1="${f2(a.y)}" x2="${f2(b.x)}" y2="${f2(b.y)}" stroke="${o.col || W.RED}" stroke-width="${o.sw || 2}" opacity="${f2(al)}" ${o.dash ? 'stroke-dasharray="6 5"' : ''}/>`); },
    pill(txt, x, y, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<g opacity="${f2(al)}">${pillSvg(txt, x, y, o.col || W.RED, o.fs)}</g>`); },
    /** spacing measure between two screen points (horizontal or vertical) with a red pill */
    gap(a, b, txt, o = {}) { const al = o.a ?? 1; if (al < .01) return; U.line(a, b, { a: al });
      const vert = Math.abs(b.y - a.y) > Math.abs(b.x - a.x);
      for (const p of [a, b]) U.line(vert ? { x: p.x - 8, y: p.y } : { x: p.x, y: p.y - 8 }, vert ? { x: p.x + 8, y: p.y } : { x: p.x, y: p.y + 8 }, { a: al });
      U.pill(txt, (a.x + b.x) / 2 + (vert ? (o.dx ?? 34) : 0), (a.y + b.y) / 2 + (vert ? 0 : (o.dy ?? -26)), { a: al }); },
    pad(r, p, o = {}) { const al = o.a ?? 1; if (al < .01) return;   // autolayout padding tint
      parts.push(`<g opacity="${f2(al)}"><path fill-rule="evenodd" fill="rgba(242,72,186,.16)" d="M${f2(r.x)} ${f2(r.y)}h${f2(r.w)}v${f2(r.h)}h${f2(-r.w)}z M${f2(r.x + p)} ${f2(r.y + p)}v${f2(r.h - 2 * p)}h${f2(r.w - 2 * p)}v${f2(-(r.h - 2 * p))}z"/></g>`); },
    text(txt, x, y, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<text x="${f2(x)}" y="${f2(y)}" font-family="Poppins" font-weight="500" font-size="${o.fs || 20}" fill="${o.col || '#8C8C8C'}" opacity="${f2(al)}">${txt}</text>`); },
    gapTint(r, o = {}) { const al = o.a ?? 1; if (al < .01) return; parts.push(`<rect x="${f2(r.x)}" y="${f2(r.y)}" width="${f2(r.w)}" height="${f2(r.h)}" fill="rgba(242,72,186,.28)" opacity="${f2(al)}"/>`); },
  };
  return U;
};
/** projector for a device's content coords at the current camera: returns {pt(u,v), rect(u,v,w,h)} in screen px */
W.projector = function (dev, cam, pose) {
  const M = V.camMat(cam);
  const pt = (u, v) => { const w = dev.pt(u, v, pose); return V.proj(M, w.x, w.y, w.z); };
  return { pt, rect: (u, v, w, h) => { const a = pt(u, v), b = pt(u + w, v + h); return { x: a.x, y: a.y, w: b.x - a.x, h: b.y - a.y }; } };
};
/** cursor path from keyframes [[t, x, y], ...] (hand easing) -> {x,y} */
W.path = function (K_, t) {
  let x = K_[0][1], y = K_[0][2];
  for (let i = 1; i < K_.length; i++) if (t >= K_[i - 1][0]) { const u = V.E.hand(V.seg(t, K_[i - 1][0], K_[i][0])); x = K.lerp(K_[i - 1][1], K_[i][1], u); y = K.lerp(K_[i - 1][2], K_[i][2], u); }
  return { x, y };
};
/** standard "dive" from the pill into the workspace: returns 0..1 */
W.dive = (t, t0, dur = .45) => V.ramp(t, t0, t0 + dur, 'inOutCubic');
})();
(function () {
const W = window.VW, mk = V.mk;
/** world plane at a laptop's flat pose: content rect (u,v,w,h) of laptop L -> element positioned in world */
W.plane = function (L, pose, u, v, w, h, css = '') {
  const a = L.pt(u, v, pose);
  const e = mk('div', 'f', V.world, `left:0;top:0;width:${w}px;height:${h}px;transform-origin:0 0;transform:translate3d(${a.x}px,${a.y}px,${a.z - 6}px) scale(${L.s});` + css);
  return e;
};
/** the unbuilt rest of the Beranda frame below the hero (placeholder blocks) */
W.berandaRest = function (L, pose, from = 627, upto = 3469, vOff = 0) {
  const e = W.plane(L, pose, 0, from - vOff, 1200, upto - from, 'background:#fff;box-shadow:0 0 0 1px rgba(0,0,0,.06)');
  const B = [['Produk Unggulan', 748, 1419], ['Distributor', 1330, 1960], ['Marquee', 2082, 2182], ['Instagram', 2182, 2840], ['CTA', 2861, 3056], ['Footer', 3080, 3469]];
  for (const [n, a, b] of B) { if (b <= from || a >= upto) continue; const y0 = Math.max(a, from) - from + 20, y1 = Math.min(b, upto) - from - 20;
    const r = mk('div', 'f', e, `left:40px;top:${y0}px;width:1120px;height:${Math.max(10, y1 - y0)}px;border:2px dashed #D9D9D9;border-radius:6px;background:rgba(240,240,240,.55)`);
    mk('div', 'f', r, 'left:22px;top:16px;font:500 26px Poppins;color:#ABABAB').textContent = n; }
  return e;
};
/** a design iframe frame on the canvas (world), with its name label */
W.frame = function (L, pose, src, u, v, w, h, name) {
  const e = W.plane(L, pose, u, v, w, h, 'overflow:visible;background:#fff');
  const box = mk('div', 'f', e, `left:0;top:0;width:${w}px;height:${h}px;overflow:hidden`);
  const f = V.page(box, src, w, h);
  const lb = mk('div', 'f', e, 'left:0;top:-44px;font:500 28px Poppins;color:#8C8C8C;white-space:nowrap'); lb.textContent = name;
  return { el: e, f, lb };
};
})();
(function () {
const W = window.VW, mk = V.mk;
/** built part of the Beranda frame (final.html y0..y1) as a world plane, aligned with a laptop showing scroll SCR */
W.pageSlice = function (L, pose, SCR, y0, y1) {
  const e = W.plane(L, pose, 0, y0 - SCR, 1200, y1 - y0 - 40, 'overflow:hidden;background:#fff');
  const box = mk('div', 'f', e, `left:0;top:${-y0}px;width:1200px;height:${y1}px`);
  e.f = V.page(box, '../design/final.html', 1200, y1);
  return e;
};
})();
