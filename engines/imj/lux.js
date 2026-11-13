/* engine/lux.js — r4 "minimalist luxury" helpers (on top of kit.js + imj.js).
 * Plain/gradient backgrounds only, light display type, hairlines, slow quint/expo moves, continuous drift. */
(function () {
'use strict';
const K = window.K, I = window.I;
const L = window.L = {};
L.M = 100;                 // left margin; text stays within x 100..940 (right 140 clear), y 260..1540
L.WW = 820;
L.WHITE = '#FFFFFF'; L.OFF = '#F7F6F3'; L.MIST = '#EAF6F7'; L.DEEP = '#0B5D6B';
L.G_NAVY = 'radial-gradient(120% 75% at 50% 40%, #0B5D6B 0%, #06506A 38%, #024155 78%)';
L.G_MIST = 'linear-gradient(180deg, #FFFFFF 0%, #FFFFFF 30%, #EAF6F7 100%)';
L.G_WHITE = 'radial-gradient(110% 70% at 50% 105%, #EEF7F8 0%, #FFFFFF 62%)';

const st = document.createElement('style');
st.textContent = `
.lx{font-weight:300;letter-spacing:-.03em;white-space:nowrap}
.lr{font-weight:400;letter-spacing:-.03em;white-space:nowrap}
.cap{font-weight:500;font-size:24px;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap}
.hl{position:absolute;height:1.5px;transform-origin:0 50%}
.lay{position:absolute;left:0;top:0;width:1080px;height:1920px;overflow:hidden}
`;
document.head.appendChild(st);

L.layer = (parent, bg, css) => I.mk('div', 'lay', parent, `background:${bg || 'transparent'};${css || ''}`);
/* continuous camera drift about (540,960): scale 1.00 -> 1+p, rotate r0 -> r1 deg, over [a,b] */
L.drift = (t, a, b, p = .04, r0 = -.5, r1 = .5, o = [540, 960]) => {
  const u = K.ramp(t, a, b, 'linear'), v = K.ramp(t, a, b, 'inOutSine');
  return { s: 1 + p * u, r: r0 + (r1 - r0) * v, css: I.cam2(o, 1 + p * u, 0, 0, r0 + (r1 - r0) * v) };
};
/* masked display lines. lines: [['word','word*'],...]; returns I.words result + font size */
L.head = (parent, lines, { x = L.M, y, w = L.WW, fs = 0, lh = 1.08, weight = 300, color, max = 999 }) => {
  const plain = lines.map(l => l.map(s => s.replace(/\*$/, '')).join(' '));
  const f = fs || Math.min(max, ...plain.map(s => I.fit(s, w, weight, -0.03)));
  const r = I.words(parent, lines, `left:${x}px;top:${y}px;font-size:${f}px;line-height:${f * lh}px;font-weight:${weight};letter-spacing:-.03em;${color ? 'color:' + color : ''}`, f * lh);
  r.fs = f; r.h = f * lh * lines.length;
  return r;
};
/* words rise in (t0) and leave upward (t1) — slow quint */
L.io = (r, t, t0, t1, stag = .06, d = .95, dout = .6) => I.inout(r.words, t, t0, t1 == null ? 1e9 : t1, stag, d, .03, dout);
/* hairline draw (scaleX) */
L.hair = (el, t, a, d = .9, e = 'inOutQuint') => { el.style.transform = `scaleX(${K.ramp(t, a, a + d, e)})`; };
/* smooth fade */
L.op = (el, v) => { el.style.opacity = v.toFixed(4); el.style.visibility = v <= .001 ? 'hidden' : 'visible'; };
/* deterministic RNG */
L.rng = seed => { let s = seed >>> 0; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
})();
