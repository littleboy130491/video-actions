/* engine/imj.js — tiny scene helpers for the Imajiner promo (on top of kit.js easing).
 * Scene contract: window.DURATION, window.seek(t) (pure function of t), window.ready, window.SFX. */
(function () {
'use strict';
const K = window.K;
const I = window.I = {};
I.NAVY = '#024155'; I.TEAL = '#2BB5BC'; I.GREY = '#F3F4F5'; I.M = 96;

const st = document.createElement('style');
st.textContent = `
@font-face{font-family:P;font-weight:300;src:url(../fonts/Poppins-Light.ttf)}
@font-face{font-family:P;font-weight:400;src:url(../fonts/Poppins-Regular.ttf)}
@font-face{font-family:P;font-weight:500;src:url(../fonts/Poppins-Medium.ttf)}
html,body{margin:0;padding:0;width:1080px;height:1920px;overflow:hidden;background:#fff}
body{position:relative;font-family:P,sans-serif;font-weight:400;color:${I.NAVY};-webkit-font-smoothing:antialiased}
.a{position:absolute}
.ln{position:absolute;white-space:nowrap}
.m{display:inline-block;overflow:hidden;vertical-align:top;padding:.04em .03em .2em;margin:-.04em -.03em -.2em}
.w{display:inline-block;will-change:transform}
.t{color:${I.TEAL}}
`;
document.head.appendChild(st);

I.mk = (tag, cls, parent, css, html) => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (css) e.style.cssText = css;
  if (html != null) e.innerHTML = html;
  (parent || document.body).appendChild(e);
  return e;
};
I.svg = (parent, w, h, css) => {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('width', w); s.setAttribute('height', h); s.setAttribute('viewBox', `0 0 ${w} ${h}`);
  s.style.cssText = 'position:absolute;overflow:visible;' + (css || '');
  parent.appendChild(s);
  return s;
};
I.sv = (svg, tag, attrs) => {
  const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
  for (const k in attrs) e.setAttribute(k, attrs[k]);
  svg.appendChild(e);
  return e;
};
/* stroke draw 0..1 (element must have pathLength=1000) */
I.draw = (e, u) => { e.style.strokeDasharray = '1000 1000'; e.style.strokeDashoffset = String(1000 * (1 - K.clamp(u))); };

/* line-masked words. lines: [[ 'word', 'word*' (teal) ...], ...] -> {el, words[], lines[]} */
I.words = (parent, lines, css, lh) => {
  const box = I.mk('div', 'a', parent, css);
  const words = [], L = [];
  lines.forEach((ws, i) => {
    const ln = I.mk('div', 'ln', box, `left:0;top:${i * lh}px`);
    L.push(ln);
    ws.forEach((w, j) => {
      const teal = w.endsWith('*');
      const m = I.mk('span', 'm', ln);
      const s = I.mk('span', 'w' + (teal ? ' t' : ''), m);
      s.textContent = teal ? w.slice(0, -1) : w;
      words.push(s);
      if (j < ws.length - 1) ln.appendChild(document.createTextNode(' '));
    });
  });
  return { el: box, words, lines: L };
};
/* per-letter masks */
I.letters = (parent, text, css, cls) => {
  const box = I.mk('div', 'ln', parent, css);
  const ls = [];
  for (const ch of text) {
    const m = I.mk('span', 'm', box);
    const s = I.mk('span', 'w' + (cls ? ' ' + cls : ''), m);
    s.textContent = ch === ' ' ? ' ' : ch;
    ls.push(s);
  }
  return { el: box, letters: ls };
};

/* word rise in (from below the mask) and sink out (up out of the mask) */
I.rise = (ws, t, t0, stag = .07, d = .7, e = 'outQuint') => ws.forEach((w, i) => {
  const u = K.ramp(t, t0 + i * stag, t0 + i * stag + d, e);
  w.style.transform = `translateY(${((1 - u) * 118).toFixed(3)}%)`;
});
I.inout = (ws, t, t0, t1, stag = .07, d = .7, so = .025, dout = .36) => ws.forEach((w, i) => {
  const u = K.ramp(t, t0 + i * stag, t0 + i * stag + d, 'outQuint');
  const v = K.ramp(t, t1 + i * so, t1 + i * so + dout, 'inOutQuint');
  w.style.transform = `translateY(${((1 - u) * 118 - v * 118).toFixed(3)}%)`;
});
I.fade = (el, t, t0, d = .4, dy = 30, e = 'outQuint') => {
  const u = K.ramp(t, t0, t0 + d, e);
  el.style.opacity = u; el.style.transform = `translateY(${(1 - u) * dy}px)`;
  return u;
};


/* ---- r2 helpers ---- */
/* font size so that `text` (weight w, letter-spacing ls em) is exactly `width` px wide */
I.fit = (text, width, w = 500, ls = -0.04) => {
  const c = I._cv || (I._cv = document.createElement('canvas').getContext('2d'));
  c.font = `${w} 100px P`;
  const m = c.measureText(text).width / 100;
  return width / (m + ls * text.length);
};
/* numeric integral of fn over [0,t] (deterministic, pure in t) */
I.integ = (fn, t, dt = 1 / 240) => { let s = 0; for (let x = 0; x < t; x += dt) s += fn(Math.min(t, x + dt / 2)) * Math.min(dt, t - x); return s; };
/* 2D camera: point p is scaled by s about o, then shifted by (tx,ty) — same syntax for CSS (px) and SVG */
I.cam2 = (o, s, tx = 0, ty = 0, rot = 0, svg = false) => {
  const u = svg ? '' : 'px', d = svg ? '' : 'deg';
  return svg
    ? `translate(${tx + o[0]} ${ty + o[1]}) rotate(${rot}) scale(${s}) translate(${-o[0]} ${-o[1]})`
    : `translate(${tx + o[0]}px,${ty + o[1]}px) rotate(${rot}deg) scale(${s}) translate(${-o[0]}px,${-o[1]}px)`;
};
/* keyed moves: list of [t0,t1,ease,{k:v}] applied in order from base -> state object */
I.moves = (t, base, list) => {
  const st = Object.assign({}, base);
  for (const [a, b, e, tgt] of list) {
    const u = K.ramp(t, a, b, e);
    for (const k in tgt) st[k] = st[k] + (tgt[k] - st[k]) * u;
  }
  return st;
};
I.shake = (t, t0, amp = 6, d = .28) => {
  if (t < t0 || t > t0 + d) return [0, 0];
  const k = 1 - (t - t0) / d, f = 38;
  return [amp * k * Math.sin((t - t0) * f * 6.283), amp * k * Math.cos((t - t0) * f * 4.9)];
};
I.img = (parent, src, css) => { const e = I.mk('img', '', parent, css); e.src = src; return e; };
I.card = n => `../assets/cards/${n}.webp`;
/* curved flood path covering from edge y downward (bulge b, up = negative) */
I.floodPath = (y, b) => `M-20 ${y + b} Q540 ${y - b} 1100 ${y + b} L1100 2200 L-20 2200Z`;
/* spring easing, ~8% overshoot at u≈.31, settles at 1 */
I.spring = u => u <= 0 ? 0 : u >= 1 ? 1 : 1 - Math.exp(-8 * u) * Math.cos(10 * u);
/* hold-camera rig: constant slow push 1->1+p over [a,b], rotateY drift r0->r1 (deg) */
I.rig = (t, a, b, p = .06, r0 = -1.5, r1 = 1.5) => {
  const u = K.ramp(t, a, b, 'linear');
  return { s: 1 + p * u, ry: r0 + (r1 - r0) * K.ramp(t, a, b, 'inOutSine'), u };
};
I.loadFonts = () => Promise.all(['300', '400', '500'].map(w => document.fonts.load(`${w} 100px P`)));

I.scene = ({ duration, setup, seek, sfx }) => {
  window.DURATION = duration;
  window.SFX = sfx || {};
  let S = null;
  window.seek = t => { if (S) return seek(K.clamp(t, 0, duration), S); };   // may return a promise (video seek)
  window.ready = (async () => {
    S = (await setup()) || {};
    await Promise.all(['300', '400', '500'].map(w => document.fonts.load(`${w} 40px P`)));
    await document.fonts.ready;
    await Promise.all([...document.images].map(im => im.decode().catch(() => console.warn('img', im.src))));
    seek(0, S);
    return true;
  })();
};
})();
