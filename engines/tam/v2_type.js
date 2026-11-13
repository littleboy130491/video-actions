/* engine/v2_type.js — the giant Montserrat type floor shared by K0 (burst out of the pill) and K1 (pull back into it). */
(function () {
'use strict';
const T = window.VT = {};
T.FLOOR_Y = 260;
T.FS = 430;
T.PILL = { w: 860, h: 136, fs: 54 };
const cvs = document.createElement('canvas').getContext('2d');
const mw = (s, font) => { cvs.font = font; return cvs.measureText(s).width; };
/** pill text start x (screen) for the pill centred at 540 */
T.pillTextX = () => { const h = T.PILL.h, mh = h * .44; return 540 - T.PILL.w / 2 + h * .3 + mh * 106 / 122 + h * .2 * 2 + 2; };
T.build = function (V) {
  const word = 'Montserrat';
  const floor = V.obj(V.world, 0, 0);
  // floor sheet (very soft, fades into the sky)
  const sheet = V.mk('div', 'f', floor, `left:-3000px;top:-3000px;width:6000px;height:6000px;transform:translate3d(0,${T.FLOOR_Y + 2}px,-1500px) rotateX(90deg);background:radial-gradient(40% 40% at 50% 50%,rgba(255,255,255,.95),rgba(255,255,255,0) 100%)`);
  const fontF = `800 ${T.FS}px Montserrat`, fontP = `500 ${T.PILL.fs}px Poppins`;
  const total = mw(word, fontF);
  const letters = [];
  let acc = 0, accP = 0;
  const px0 = T.pillTextX();
  for (let i = 0; i < word.length; i++) {
    const ch = word[i];
    const w = mw(ch, fontF), wp = mw(ch, fontP);
    const el = V.mk('div', 'o', floor);
    const layers = [];
    for (let k = 7; k >= 0; k--) {
      const l = V.mk('div', 'gt', el, `position:absolute;left:0;top:0;font-size:${T.FS}px;color:${k ? '#C8154A' : '#EE225B'};transform:translateZ(${-k * 4}px)`);
      l.textContent = ch; layers.push(l);
    }
    letters.push({ el, layers, ch, fx: -total / 2 + acc, w, px: px0 + accP, wp, ap: accP });
    acc += w; accP += wp;
  }
  // fragments lying on the floor
  const frag = [
    { s: 'Aa', fs: 980, x: -560, z: -1500, c: '#1E1E1E', rz: 0 },
    { s: 'ABCDEFG', fs: 330, x: -1100, z: -2400, c: '#FE98B5', rz: 0 },
    { s: 'abcdefghij', fs: 300, x: -500, z: 650, c: '#D3D7DE', rz: 0 },
    { s: '800', fs: 520, x: 520, z: -900, c: '#F77CA0', rz: -90 },
    { s: 'xyz', fs: 380, x: -1200, z: -500, c: '#BFE6F8', rz: 90 },
  ].map(f => {
    const el = V.mk('div', 'o', floor);
    for (let k = 5; k >= 0; k--) { const l = V.mk('div', 'gt', el, `position:absolute;left:0;top:0;font-size:${f.fs}px;color:${f.c};transform:translateZ(${-k * 4}px);${k ? 'filter:brightness(.86)' : ''}`); l.textContent = f.s; }
    return { ...f, el };
  });
  return { floor, sheet, letters, frag, total };
};
/** u: 0 = letters sit in the pill (screen space at z=0), 1 = lying on the floor. stagger per letter */
T.place = function (S, u, fragA, t, org) {
  const n = S.letters.length;
  S.letters.forEach((L, i) => {
    const k = V.E.outCubic(V.seg(u, i * .03, .5 + i * .03));
    const sP = T.PILL.fs / T.FS;
    // pill state: upright at the pill glyph position (top-left of glyph box), Poppins->Montserrat size match
    const A = org ? { x: org.x + L.ap * org.fs / T.PILL.fs, y: org.y - org.fs * .55, z: 0, rx: 0, s: org.fs / T.FS } : { x: L.px, y: 960 - T.PILL.fs * .55, z: 0, rx: 0, s: sP };
    if (!org) { A.x -= 540; A.y -= 960; }
    const B = { x: L.fx, y: T.FLOOR_Y, z: -420, rx: 90, s: 1 };
    // the burst arcs up first
    const lift = Math.sin(Math.PI * k) * (-260 - 40 * Math.sin(i * 1.7));
    const p = V.mixv(A, B, k);
    p.y += lift; p.z += Math.sin(Math.PI * k) * 260;
    p.rz = Math.sin(Math.PI * k) * (i % 2 ? 8 : -8);
    L.el.style.transformOrigin = '0 0';
    V.tf(L.el, p);
    L.el.style.opacity = u <= 0 ? 0 : 1;
    // thickness layers only when lying down
    L.layers.forEach((l, j) => { if (j < L.layers.length - 1) l.style.opacity = V.ramp(k, .5, .9); });
  });
  S.frag.forEach((f, i) => {
    const a = V.ramp(fragA, i * .12, .5 + i * .12, 'outCubic');
    f.el.style.transformOrigin = '0 0';
    V.tf(f.el, { x: f.x, y: T.FLOOR_Y + (1 - a) * 120, z: f.z, rx: 90, rz: f.rz, s: 1 });
    f.el.style.opacity = a;
  });
  S.sheet.style.opacity = V.ramp(fragA, 0, .6);
};
})();
