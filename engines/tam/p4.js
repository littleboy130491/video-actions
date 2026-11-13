/* engine/p4.js — BYGY v4 process take: ONE continuous take on a flat design canvas, no side panel, no search pill.
 * Only on-canvas design-tool cues: selection box + handles, size pills, red guides / spacing pills, frame labels,
 * caret, eyedropper chip, fill chip, auto-layout gap handle. Big zoom variety: whole-canvas pull-backs (~0.4x) <->
 * extreme close-ups (3-3.4x on typed text, guides, gap pill); photos stay <= 1.5x or get depth-of-field blur.
 * Canvas: brief frame above Beranda, Beranda desktop (0,0), Beranda – Mobile frame on its left, hero slides on its right.
 * Pure function of the GLOBAL take time T. Scenes p4_take1..3 render slices of it (continuous cuts by construction).
 * Needs kit.js, v2.js, v2_ws.js (canvas + on-canvas UI only). */
(function () {
'use strict';
const P4 = window.P4 = {};
const mk = V.mk, R = V.ramp, SG = V.seg, E = V.E, lerp = K.lerp, f2 = v => (+v).toFixed(3);
const CX = 540;
const BX = 0, BY = -1487;            // brief (above Beranda)
const MX = -510;                     // mobile frame x (390 wide)
const SX = 1320, S3Y = 747;          // slides
const D = P4.D = 25.2, SPEED = P4.SPEED = 1.08;
const back = u => { u = K.clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

/* camera keys [T, x, y, zoom, ease, dip] : world (x,y) at screen centre */
const CK = [
  [0, 880, 330, 1.5],
  [.9, 345, 1734, .5, 'inOutCubic'],
  [1.05, 345, 1720, .505, 'inOutSine'],
  [1.6, 600, 300, .9, 'inOutCubic'],
  [1.95, 900, 90, 2.4, 'inOutCubic'],
  [2.5, 905, 92, 2.45, 'inOutSine'],
  [2.8, 180, 291, 3.4, 'inOutCubic', .8],
  [3.45, 560, 291, 3.4, 'linear'],          // overridden by caret-follow while typing
  [4.0, BX + 410, BY + 834, 2.2, 'inOutCubic', .9],
  [4.5, BX + 415, BY + 832, 2.2, 'inOutSine'],
  [5.0, 330, 330, 1.15, 'inOutCubic', .5],
  [5.25, 330, 335, 1.15, 'inOutSine'],
  [5.5, 190, 478, 2.4, 'inOutCubic'],
  [5.65, 192, 478, 2.4, 'inOutSine'],
  [6.05, BX + 457, BY + 507, 1.5, 'inOutCubic', .6],
  [6.2, BX + 458, BY + 508, 1.5, 'inOutSine'],
  [6.65, 190, 490, 2.4, 'inOutCubic', .6],
  [7.05, 192, 492, 2.4, 'inOutSine'],
  [7.6, 1260, 690, .4, 'inOutCubic'],
  [9.15, 1265, 700, .4, 'inOutSine'],
  [9.6, MX + 195, 380, 1.25, 'inOutCubic', .35],
  [10.05, MX + 195, 380, 1.25, 'inOutSine'],
  [10.3, MX + 150, 150, 2.4, 'inOutCubic'],
  [10.6, MX + 160, 152, 2.4, 'inOutSine'],
  [11.05, 345, 400, .62, 'inOutCubic'],
  [11.35, 350, 405, .62, 'inOutSine'],
  [11.85, 600, 1080, .9, 'inOutCubic'],
  [12.55, 600, 1080, .9, 'inOutSine'],
  [12.8, 331, 1040, 3.0, 'inOutCubic'],
  [13.2, 333, 1040, 3.0, 'inOutSine'],
  [13.55, 196, 1040, 1.45, 'inOutCubic'],
  [13.95, 198, 1040, 1.45, 'inOutSine'],
  [14.4, 600, 1645, .9, 'inOutCubic'],
  [15.0, 600, 1650, .9, 'inOutSine'],
  [15.25, 797, 1733, 1.4, 'inOutCubic'],
  [15.85, 795, 1733, 1.4, 'inOutSine'],
  [16.6, 345, 1734, .5, 'inOutCubic'],
  [16.85, 345, 1730, .505, 'inOutSine'],
  [17.25, 600, 1760, .9, 'inOutCubic'],
  [17.95, 600, 1760, .9, 'inOutSine'],
  [18.15, 220, 2210, 3.0, 'inOutCubic'],
  [18.7, 520, 2210, 3.0, 'linear'],         // caret-follow
  [19.0, 600, 2132, .8, 'inOutCubic'],
  [19.4, 600, 2560, .85, 'inOutCubic'],
  [20.3, 600, 2570, .85, 'inOutSine'],
  [20.8, MX + 195, 1020, 1.05, 'inOutCubic', .45],
  [21.15, MX + 195, 1030, 1.05, 'inOutSine'],
  [21.55, MX + 195, 2470, 1.0, 'inOutCubic', .5],
  [22.0, MX + 195, 2480, 1.0, 'inOutSine'],
  [22.5, 600, 2958, .85, 'inOutCubic', .35],
  [23.05, 600, 2962, .85, 'inOutSine'],
  [23.4, 600, 3230, .8, 'inOutCubic'],
  [23.85, 600, 3240, .8, 'inOutSine'],
  [24.55, 345, 1965, .455, 'inOutCubic'],
  [D, 345, 1965, .46, 'inOutSine'],
];
P4.cam = function (T) {
  let i = 1; while (i < CK.length - 1 && T > CK[i][0]) i++;
  const a = CK[i - 1], b = CK[i];
  const u = E[b[4] || 'inOutCubic'](SG(T, a[0], b[0]));
  const lz = lerp(Math.log(a[3]), Math.log(b[3]), u) - (b[5] || 0) * Math.sin(Math.PI * u);
  const c = { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lz) };
  const dk = R(T, .9, 1.4);
  c.x += dk * 2 * K.noise(T * .35, 3) / c.z; c.y += dk * 2 * K.noise(T * .35, 9) / c.z;
  return c;
};

/* cursor keys [T, x, y, kind] (world coords) */
const CUR = [
  [.95, 300, 800, 'arrow'], [1.1, 150, 230, 'cross'], [1.55, 292, 440, 'cross'],
  [1.8, 900, -14, 'arrow'], [2.0, 900, -14, 'arrow'], [2.35, 900, 76, 'arrow'], [2.55, 940, 120, 'arrow'],
  [3.6, BX + 300, BY + 900, 'arrow'], [3.95, BX + 410, BY + 838, 'arrow'], [4.5, BX + 470, BY + 870, 'arrow'],
  [5.0, 520, 420, 'arrow'], [5.28, 40, 458, 'cross'], [5.33, 40, 458, 'cross'], [5.6, 342, 498, 'cross'],
  [5.68, 360, 520, 'eyedrop'], [6.05, BX + 470, BY + 520, 'eyedrop'], [6.2, BX + 470, BY + 520, 'eyedrop'],
  [6.6, 190, 478, 'eyedrop'], [6.72, 190, 478, 'eyedrop'], [7.05, 230, 540, 'arrow'],
  [7.55, 600, 330, 'arrow'], [7.62, 600, 330, 'arrow'], [8.02, SX + 600, 330, 'arrow'],
  [8.3, SX + 600, 330, 'arrow'], [8.36, SX + 600, 330, 'arrow'], [8.76, SX + 600, S3Y + 330, 'arrow'],
  [9.6, MX + 300, 560, 'arrow'], [9.68, MX + 250, 560, 'arrow'], [9.8, MX + 200, 40, 'arrow'], [10.05, MX + 260, 120, 'arrow'],
  [10.85, MX + 330, 270, 'arrow'], [11.4, 600, 760, 'arrow'],
  [11.9, 600, 1300, 'arrow'], [12.1, 196, 1012, 'arrow'], [12.25, 465, 1012, 'arrow'], [12.4, 734, 1012, 'arrow'], [12.55, 1003, 1012, 'arrow'],
  [12.85, 321, 1040, 'arrow'], [12.92, 321, 1040, 'arrow'], [13.15, 331, 1040, 'arrow'],
  [13.55, 230, 1060, 'arrow'], [13.95, 236, 1066, 'arrow'],
  [14.35, 300, 1480, 'cross'], [14.45, 39, 1444, 'cross'], [14.75, 1161, 1922, 'cross'],
  [15.15, 468, 1578, 'cross'], [15.25, 468, 1578, 'cross'], [15.5, 1127, 1889, 'cross'],
  [15.75, 758, 1716, 'arrow'], [15.9, 758, 1716, 'arrow'], [16.3, 860, 1880, 'arrow'],
  [17.15, 40, 2090, 'cross'], [17.25, 0, 2082, 'cross'], [17.5, 1200, 2182, 'cross'],
  [17.55, 900, 2000, 'eyedrop'], [17.68, 820, 1380, 'eyedrop'], [17.75, 820, 1380, 'eyedrop'], [17.92, 640, 2132, 'eyedrop'], [17.97, 640, 2132, 'eyedrop'],
  [19.0, 700, 2250, 'arrow'], [19.6, 167, 2522, 'arrow'], [19.75, 455, 2522, 'arrow'], [19.9, 743, 2522, 'arrow'], [20.05, 1031, 2522, 'arrow'], [20.3, 600, 2760, 'arrow'],
  [20.85, MX + 145, 1020, 'arrow'], [21.0, MX + 300, 1020, 'arrow'], [21.25, MX + 200, 1250, 'arrow'], [21.46, MX + 105, 2380, 'arrow'], [21.58, MX + 285, 2380, 'arrow'], [21.7, MX + 105, 2600, 'arrow'], [21.82, MX + 285, 2600, 'arrow'],
  [22.6, 700, 2958, 'arrow'], [23.0, 1050, 2960, 'arrow'], [23.45, 640, 3300, 'arrow'], [23.9, 700, 3360, 'arrow'],
];
const CUR_VIS = [[.95, 2.6], [3.55, 7.0], [7.4, 9.0], [9.55, 11.4], [11.75, 16.4], [17.05, 18.05], [19.0, 23.95]];
const PRESS = [[1.12, 1.55], [2.0, 2.35], [3.97, 4.03], [5.33, 5.6], [6.15, 6.21], [6.7, 6.76],
  [7.62, 8.02], [8.36, 8.76], [9.7, 9.74], [9.8, 9.84], [12.1, 12.14], [12.25, 12.29], [12.4, 12.44], [12.55, 12.59], [12.92, 13.15],
  [14.45, 14.75], [15.25, 15.5], [15.9, 15.95], [17.25, 17.5], [17.7, 17.75], [17.94, 17.99],
  [19.6, 19.64], [19.75, 19.79], [19.9, 19.94], [20.05, 20.09], [20.88, 20.92], [21.48, 21.52], [21.6, 21.64], [21.72, 21.76], [21.84, 21.88]];

P4.setup = function (V, T0, T1) {
  const S = {};
  V.sky.style.background = '#F3F3F3';
  S.cv = VW.canvas();
  const fr = (src, x, y, w, h, name, vh, vw) => {
    const e = mk('div', 'f', V.world, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#fff;overflow:visible`);
    const box = mk('div', 'f', e, `left:0;top:0;width:${w}px;height:${h}px;overflow:hidden`);
    const f = V.page(box, src, vw || w, vh || h);
    const lb = mk('div', 'f', e, 'left:0;white-space:nowrap;font-family:Poppins;font-weight:500;color:#8C8C8C'); lb.textContent = name;
    return { el: e, box, f, lb, w, h };
  };
  S.brief = fr('../design/brief.html', BX, BY, 1200, 1367, 'Guidelines - Home Opsi 1');
  S.B = fr('../design/final.html', 0, 0, 1200, 3469, 'Beranda');
  S.M = fr('../design/beranda_mobile.html', MX, 0, 390, 3930, 'Beranda – Mobile');
  S.s2 = fr('../design/slide2.html', SX, 0, 1200, 627, 'Slide 2');
  S.s3 = fr('../design/slide3.html', SX, S3Y, 1200, 627, 'Slide 3');
  S.dA = fr('../design/final.html', 0, 0, 1200, 627, '', 3469);
  S.dB = fr('../design/slide2.html', SX, 0, 1200, 627, '');
  const ph = (parent, list) => list.map(([n, y0, y1, x0, x1]) => {
    const r = mk('div', 'f', parent, `left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;border:2px dashed #D6D6D6;border-radius:8px;background:rgba(244,244,244,.6)`);
    const l = mk('div', 'f', r, 'left:18px;top:12px;font:500 24px Poppins;color:#ABABAB;white-space:nowrap'); l.textContent = n; return r; });
  S.ph = ph(S.B.el, [['Produk Unggulan', 770, 1300, 40, 1160], ['Distributor', 1340, 1950, 40, 1160], ['Marquee', 2088, 2176, 40, 1160], ['Instagram', 2196, 2840, 40, 1160], ['CTA', 2861, 3056, 40, 1160], ['Footer', 3076, 3456, 40, 1160]]);
  S.phM = ph(S.M.el, [['Hero', 12, 708, 12, 378], ['Produk', 750, 1220, 12, 378], ['Distributor', 1250, 2030, 12, 378], ['Instagram', 2070, 2950, 12, 378], ['Footer', 3070, 3910, 12, 378]]);
  S.ui = VW.ui();
  // eyedropper chip (follows the cursor) + fill chip (anchored under the selection)
  const chip = () => { const c = mk('div', '', V.over, 'position:absolute;left:0;top:0;display:none;align-items:center;gap:10px;height:44px;padding:0 14px 0 8px;border-radius:10px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.16);font:600 21px Poppins;color:#1E1E1E;z-index:45;white-space:nowrap');
    c.innerHTML = '<span class="sw" style="width:28px;height:28px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)"></span><span class="hx"></span>';
    return { el: c, sw: c.querySelector('.sw'), hx: c.querySelector('.hx') }; };
  S.chipE = chip(); S.chipF = chip();
  // Montserrat flourish
  S.fl = mk('div', '', V.over, 'position:absolute;inset:0;perspective:1400px;perspective-origin:540px 960px;display:none;z-index:12;overflow:hidden');
  S.flw = mk('div', '', S.fl, 'position:absolute;left:540px;top:960px;width:0;height:0;transform-style:preserve-3d');
  for (let k = 9; k >= 0; k--) { const l = mk('div', 'gt', S.flw, `position:absolute;left:0;top:0;font-size:330px;color:${k ? '#C8154A' : '#EE225B'};transform:translate(-50%,-50%) translateZ(${-k * 5}px)`); l.textContent = 'Montserrat'; }
  S.cur = V.cursor(V.over, 1.5);
  S.alt = mk('div', '', V.over, 'position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:#111;color:#fff;font:700 24px/26px Poppins;text-align:center;display:none;z-index:51');
  S.alt.textContent = '+';
  S.tyH = V.typer('Produk Plastik', { seed: 4, dur: .6 });
  S.tyHex2 = V.typer('FF3548', { seed: 7, dur: .2 });
  S.tyMq = V.typer('100% Original BPA Free Material', { seed: 12, dur: .52 });
  S.tyS2 = V.typer('Tumbler\nFruitamin', { seed: 13, dur: .3 });
  S.tyS3 = V.typer('Mellau Plate', { seed: 14, dur: .28 });
  const inS = x => x >= T0 && x < T1, SF = V.SFX;
  for (const [a] of PRESS) if (inS(a)) SF.clicks.push(a);
  for (const r of [[2.85, 3.45], [6.82, 7.02], [8.1, 8.4], [8.8, 9.08], [18.15, 18.67]]) if (inS(r[0])) SF.typing.push(r);
  for (let i = 1; i < CK.length; i++) { const a = CK[i - 1], b = CK[i]; const big = Math.abs(Math.log(b[3] / a[3])) > .5 || Math.hypot(b[1] - a[1], b[2] - a[2]) * b[3] > 500;
    if (big && inS(a[0])) SF.whoosh.push([a[0], b[0] - a[0], .3]); }
  return S;
};

const proj = c => ({ pt: (x, y) => ({ x: CX + (x - c.x) * c.z, y: 960 + (y - c.y) * c.z }),
  rect(x, y, w, h) { const a = this.pt(x, y); return { x: a.x, y: a.y, w: w * c.z, h: h * c.z }; } });

P4.frame = function (T, S) {
  const c = P4.cam(T);
  // caret-follow for the two extreme close-up typing beats (camera keeps the caret ~120 page px right of centre)
  const qB = S.B.f.q;
  const follow = (t0, t1, el, x0, minX) => { const w = R(T, t0, t0 + .15) * (1 - R(T, t1 - .05, t1 + .25)); if (w <= 0) return;
    const b = el.getBoundingClientRect(); c.x = lerp(c.x, Math.max(minX, b.right - 110), w); };
  buildBeranda(T, S, qB);              // (DOM first: caret positions)
  follow(2.8, 3.45, qB('hero-title'), 40, 180);
  follow(18.15, 18.7, qB('marquee-text-2'), 200, 220);
  const z = c.z, P = proj(c); P4._c = c;
  V.world.style.transform = `scale(${f2(z)}) translate(${f2(-c.x)}px,${f2(-c.y)}px)`; V.world.style.transformOrigin = '0 0';
  S.cv.set(R(T, 0, .35)); S.cv.upd({ x: c.x, y: c.y, d: V.P / z });
  const lab = (F, a) => { F.lb.style.fontSize = f2(21 / z) + 'px'; F.lb.style.top = f2(-31 / z) + 'px'; F.lb.style.opacity = f2(a); };
  lab(S.B, R(T, .15, .45)); lab(S.M, R(T, .2, .5)); lab(S.brief, 1);
  S.brief.el.style.opacity = f2(R(T, .15, .5));
  for (const F of [S.B, S.brief, S.s2, S.s3, S.M]) F.box.style.boxShadow = `0 0 0 ${f2(1.2 / z)}px rgba(0,0,0,.09)`;
  buildMobile(T, S, S.M.f.q);
  buildSlides(T, S, z);
  const PHT = [11.85, 14.4, 17.2, 19.35, 22.5, 23.4], PHM = [9.65, 20.85, 24.1, 21.55, 24.3];
  const phA = (r, a) => { r.style.opacity = f2(a); r.style.display = a < .005 ? 'none' : ''; r.style.borderWidth = f2(Math.max(1.5, 2 / z)) + 'px'; };
  S.ph.forEach((r, i) => phA(r, R(T, .2, .6) * (1 - R(T, PHT[i], PHT[i] + .25))));
  S.phM.forEach((r, i) => phA(r, R(T, .3, .7) * (1 - R(T, PHM[i], PHM[i] + .25))));
  // depth of field: photos blur in extreme close-ups (assets are 1x)
  const dof = Math.min(7, Math.max(0, (z - 1.55) * 4));
  const blurIds = ['hero-bottles', 'produk-swoosh', 'card-1-img', 'card-2-img', 'card-3-img', 'card-4-img', 'dist-map', 'ig-post-1', 'ig-post-2', 'ig-post-3', 'ig-post-4', 'cta-photo'];
  if (dof > .05) for (const id of blurIds) { V.st(qB(id), { filter: `blur(${f2(dof)}px)` }); V.st(S.M.f.q(id), { filter: `blur(${f2(dof)}px)` }); }

  const U = S.ui; U.begin();
  canvasUI(T, S, qB, P, U);
  U.end();
  // Montserrat flourish
  const fu = SG(T, 4.05, 5.0);
  S.fl.style.display = fu > 0 && fu < 1 ? 'block' : 'none';
  if (fu > 0 && fu < 1) { S.flw.style.opacity = f2(R(T, 4.05, 4.2) * (1 - R(T, 4.8, 5.0)));
    S.flw.style.transform = `translate3d(${f2(lerp(820, -820, E.inOutSine(fu)))}px,${f2(lerp(120, -60, fu))}px,${f2(lerp(-200, 220, fu))}px) rotateY(${f2(lerp(-38, 26, fu))}deg) rotateX(${f2(14 - 8 * fu)}deg) rotateZ(-6deg)`; }
  // cursor (one)
  let vis = 0; for (const [a, b] of CUR_VIS) vis = Math.max(vis, R(T, a, a + .1) * (1 - R(T, b - .12, b)));
  let k = 1; while (k < CUR.length - 1 && T > CUR[k][0]) k++;
  let cp, kind;
  if (T <= CUR[0][0]) { cp = P.pt(CUR[0][1], CUR[0][2]); kind = CUR[0][3]; }
  else { const a = CUR[k - 1], b = CUR[k], uu = SG(T, a[0], b[0]), u = E.hand(uu), A = P.pt(a[1], a[2]), B = P.pt(b[1], b[2]); cp = { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u) }; kind = uu < .5 ? a[3] : b[3]; }
  let press = 0; for (const [a, b] of PRESS) press = Math.max(press, b - a > .1 ? (T > a && T < b ? 1 : 0) : K.pulse(T, a, b + .05, .02, .04));
  S.cur.set(vis > .01 ? { x: cp.x, y: cp.y, kind, press, a: vis } : null);
  const alt = (T > 7.55 && T < 8.07) || (T > 8.28 && T < 8.8);
  S.alt.style.display = alt && vis > .01 ? 'block' : 'none'; S.alt.style.transform = `translate(${f2(cp.x + 26)}px,${f2(cp.y + 34)}px)`;
  // eyedropper chip follows the cursor while the eyedropper holds a colour
  const ce = (T > 6.1 && T < 6.74) ? '#F77CA0' : (T > 17.7 && T < 17.98) ? '#EE225B' : null;
  S.chipE.el.style.display = ce && vis > .01 ? 'flex' : 'none';
  if (ce) { S.chipE.sw.style.background = ce; S.chipE.hx.textContent = ce; S.chipE.el.style.transform = `translate(${f2(cp.x + 30)}px,${f2(cp.y - 70)}px)`; }
};

/* ---------------- Beranda build (cumulative) ---------------- */
const TOP = ['hero-bg', 'hero-bottles', 'hero-ring', 'header', 'header-logo', 'nav', 'hero-eyebrow', 'hero-title', 'hero-lead', 'hero-cta', 'hero-dot-1', 'hero-dot-2', 'hero-dot-3',
  'produk-swoosh', 'produk-heading', 'produk-cta', 'card-1-img', 'card-1-bar', 'card-1-name', 'card-1-info', 'card-1-arrow', 'card-2-img', 'card-2-bar', 'card-2-name', 'card-2-arrow',
  'card-3-img', 'card-3-bar', 'card-3-name', 'card-3-arrow', 'card-4-img', 'card-4-bar', 'card-4-name', 'card-4-arrow', 'produk-prev', 'produk-next',
  'dist-heading', 'dist-box', 'dist-bar', 'dist-city-label', 'dist-city-box', 'dist-city-value', 'dist-city-chev', 'dist-result-label', 'dist-result-box', 'dist-result-value', 'dist-result-chev',
  'dist-search-btn', 'dist-map', 'dist-map-fullscreen', 'dist-map-locate', 'dist-map-zoom', 'dist-scrollbar', 'dist-loc1-title', 'dist-loc1-addr', 'dist-loc1-tel', 'dist-loc1-km', 'dist-loc1-dir',
  'dist-line', 'dist-loc2-title', 'dist-loc2-clip', 'marquee-bg', 'marquee-track', 'ig-bg', 'ig-ring-right', 'ig-ring-left', 'ig-heading', 'ig-post-1', 'ig-post-2', 'ig-post-3', 'ig-post-4', 'ig-cta',
  'footer-bg', 'footer-waves', 'footer-logo', 'footer-partof', 'footer-bebest', 'footer-badges', 'footer-ragam-h', ...Array.from({ length: 12 }, (_, i) => 'footer-ragam-' + (i + 1)),
  'footer-kontak-h', 'footer-addr', 'footer-email', 'footer-tel', 'footer-line', 'footer-copy', 'footer-social', 'cta-photo', 'cta-gradient', 'cta-heading', 'cta-text', 'cta-button'];
P4.TOP = TOP;
const GAP0 = 20.25;
function rv(el, T, t0, kind, o = {}) {
  if (!el || T < t0) return;
  const d = o.d || .3, u = SG(T, t0, t0 + d), a = R(T, t0, t0 + Math.min(d, .18), 'outCubic'), ex = o.tx || '';
  if (kind === 'fade') V.st(el, { opacity: f2(R(T, t0, t0 + d)) });
  else if (kind === 'drop' || kind === 'rise') { const dy = (kind === 'drop' ? -1 : 1) * (o.dy || 24) * (1 - back(u)); V.st(el, { opacity: f2(a), transform: `${ex} translateY(${f2(dy)}px)` }); }
  else if (kind === 'slide') V.st(el, { opacity: f2(a), transform: `${ex} translateX(${f2((o.dx || 60) * (1 - back(u)))}px)` });
  else if (kind === 'pop') V.st(el, { opacity: f2(a), transform: `${ex} scale(${f2(.4 + .6 * back(u))})`, transformOrigin: '50% 50%' });
  else if (kind === 'place') V.st(el, { opacity: f2(R(T, t0, t0 + d * .9, 'outCubic')), transform: `${ex} scale(${f2(1.04 - .04 * E.outCubic(u))})`, transformOrigin: '50% 50%' });
}
P4.rv = rv;
function drawRect(el, T, t0, t1, w, h) { if (T < t0) return 0; const u = E.hand(SG(T, t0, t1));
  V.st(el, { opacity: '1', width: f2(Math.max(1, w * u)) + 'px', height: f2(Math.max(1, h * Math.min(1, u * 1.12))) + 'px' }); return u; }
function stroke(svgEl, T, t0, t1) { if (!svgEl || T < t0) return; const u = R(T, t0, t1, 'inOutCubic');
  V.st(svgEl, { opacity: '1' }); for (const c of svgEl.querySelectorAll('circle')) V.st(c, { strokeDasharray: '1000 1000', strokeDashoffset: f2(1000 * (1 - u)) }); }

function buildBeranda(T, S, q) {
  for (const id of TOP) V.st(q(id), { opacity: '0' });
  V.st(q('hero-bg'), { opacity: '1' }); V.st(q('hero-bottles'), { opacity: '1' });
  stroke(q('hero-ring'), T, 1.12, 1.55);
  if (T > 1.95) { const hd = SG(T, 2.0, 2.35), he = E.hand(hd), dy = -90 * (1 - he) + 6 * Math.sin(Math.PI * SG(hd, .72, 1));
    for (const id of ['header', 'header-logo', 'nav']) V.st(q(id), { opacity: f2(R(T, 1.95, 2.02)), transform: `translateY(${f2(dy)}px)` }); S._hdy = dy; }
  if (T > 2.8) { const h = q('hero-title'); V.st(h, { opacity: '1' });
    if (T < 4.0) V.st(h, { fontFamily: 'Poppins', fontWeight: '500', color: '#1E1E1E' });
    V.typeEl(h, S.tyH.at(T - 2.85), T < 3.7 && V.blink(T, 3.45)); }
  rv(q('hero-eyebrow'), T, 5.0, 'rise', { dy: 14 }); rv(q('hero-lead'), T, 5.08, 'rise', { dy: 14 });
  S._cu = drawRect(q('hero-cta'), T, 5.33, 5.6, 302, 40);
  if (T > 5.33) V.st(q('hero-cta'), { background: T < 6.72 ? '#E3E3E3' : (T < 6.92 ? '#F77CA0' : K.mix('#F77CA0', '#FF3548', R(T, 6.92, 7.05))) });
  for (const id of ['hero-cta-label', 'hero-cta-arrow']) V.st(q(id), { opacity: '0' });
  if (T > 6.76) { const a = R(T, 6.76, 6.92, 'outCubic'); V.st(q('hero-cta-label'), { opacity: f2(a) }); V.st(q('hero-cta-arrow'), { opacity: f2(a), transform: `scale(${f2(.6 + .4 * a)})`, transformOrigin: '50% 50%' }); }
  for (let i = 1; i <= 3; i++) rv(q('hero-dot-' + i), T, 7.15 + i * .05, 'pop', { d: .25 });
  // produk
  rv(q('produk-swoosh'), T, 11.8, 'place', { d: .4 });
  rv(q('produk-heading'), T, 11.9, 'drop', { dy: 18 }); rv(q('produk-cta'), T, 12.0, 'pop');
  const g = E.inOutCubic(SG(T, 12.92, 13.15)); S._gap = g;
  for (let i = 1; i <= 4; i++) { const t0 = 12.1 + (i - 1) * .15, tx = `translateX(${f2(-(i - 1) * GAP0 * (1 - g))}px)`;
    for (const [p, dt] of [['img', 0], ['bar', .03], ['name', .06], ['arrow', .08]]) rv(q(`card-${i}-${p}`), T, t0 + dt, 'slide', { dx: 70, tx });
    if (i === 1 && T > 13.6) { V.st(q('card-1-info'), { opacity: f2(R(T, 13.6, 13.78)), transform: tx });
      [...q('card-1-info').children].forEach((e, j) => { if (!j) return; const a = R(T, 13.64 + j * .012, 13.84 + j * .012, 'outCubic'); V.st(e, { opacity: f2(a), transform: `translateY(${f2((1 - a) * 8)}px)` }); }); } }
  rv(q('produk-prev'), T, 13.3, 'pop', { d: .25 }); rv(q('produk-next'), T, 13.35, 'pop', { d: .25 });
  // distributor
  rv(q('dist-heading'), T, 14.35, 'drop', { dy: 18 });
  S._db = drawRect(q('dist-box'), T, 14.45, 14.75, 1122, 478);
  rv(q('dist-bar'), T, 14.78, 'fade', { d: .15 });
  ['dist-city-label', 'dist-city-box', 'dist-city-value', 'dist-city-chev', 'dist-result-label', 'dist-result-box', 'dist-result-value', 'dist-result-chev'].forEach((id, j) => rv(q(id), T, 14.82 + j * .03, 'rise', { dy: 10, d: .25 }));
  rv(q('dist-search-btn'), T, 15.08, 'pop', { d: .25 });
  S._dm = T > 15.25 ? E.hand(SG(T, 15.25, 15.5)) : 0;
  rv(q('dist-map'), T, 15.52, 'place', { d: .3 });
  ['dist-map-zoom', 'dist-map-fullscreen', 'dist-map-locate', 'dist-scrollbar'].forEach((id, j) => rv(q(id), T, 15.68 + j * .05, 'pop', { d: .22 }));
  ['dist-loc1-title', 'dist-loc1-addr', 'dist-loc1-tel', 'dist-loc1-km', 'dist-loc1-dir', 'dist-line', 'dist-loc2-title', 'dist-loc2-clip'].forEach((id, j) => rv(q(id), T, 16.0 + j * .04, 'rise', { dy: 12, d: .25 }));
  // marquee
  S._mq = drawRect(q('marquee-bg'), T, 17.25, 17.5, 1200, 100);
  if (T > 17.25) V.st(q('marquee-bg'), { background: T < 17.96 ? '#E3E3E3' : K.mix('#E3E3E3', '#EE225B', R(T, 17.96, 18.06)) });
  if (T > 18.1) {
    const tr = q('marquee-track'), sp = T < 18.8 ? 0 : 0.5 * 140 * Math.pow(Math.min(T - 18.8, .8), 2) / .8 + 140 * Math.max(0, T - 19.6);
    V.st(tr, { opacity: '1', transform: `translateX(${f2(-(sp % 532))}px)` });
    for (const id of ['marquee-text-1', 'marquee-text-3', 'marquee-icon-1', 'marquee-icon-2', 'marquee-icon-3']) V.st(q(id), { opacity: '0' });
    V.typeEl(q('marquee-text-2'), S.tyMq.at(T - 18.15), T < 18.8 && V.blink(T, 18.67));
    rv(q('marquee-icon-2'), T, 18.72, 'pop', { d: .22 });
    for (const [id, t0] of [['marquee-icon-1', 18.85], ['marquee-text-1', 18.85], ['marquee-text-3', 18.9], ['marquee-icon-3', 18.9]]) rv(q(id), T, t0, 'fade', { d: .15 });
  }
  // instagram
  rv(q('ig-bg'), T, 19.35, 'fade', { d: .25 });
  stroke(q('ig-ring-right'), T, 19.4, 19.8); stroke(q('ig-ring-left'), T, 19.45, 19.8);
  rv(q('ig-heading'), T, 19.45, 'drop', { dy: 18 });
  for (let i = 1; i <= 4; i++) rv(q('ig-post-' + i), T, 19.6 + (i - 1) * .15, 'place', { d: .32 });
  rv(q('ig-cta'), T, 20.25, 'pop', { d: .28 });
  // cta
  rv(q('cta-photo'), T, 22.5, 'place', { d: .3 });
  if (T > 22.7) { const u = R(T, 22.7, 23.0, 'inOutCubic'); V.st(q('cta-gradient'), { opacity: '1', clipPath: `inset(0 ${f2((1 - u) * 100)}% 0 0 round 16px)` }); }
  rv(q('cta-heading'), T, 22.92, 'rise', { dy: 16 }); rv(q('cta-text'), T, 23.0, 'rise', { dy: 16 }); rv(q('cta-button'), T, 23.05, 'pop', { d: .3 });
  // footer
  rv(q('footer-bg'), T, 23.3, 'fade', { d: .2 }); rv(q('footer-waves'), T, 23.36, 'fade', { d: .3 });
  ['footer-logo', 'footer-partof', 'footer-bebest', 'footer-badges'].forEach((id, j) => rv(q(id), T, 23.45 + j * .05, 'rise', { dy: 14, d: .25 }));
  ['footer-ragam-h', ...Array.from({ length: 12 }, (_, i) => 'footer-ragam-' + (i + 1)), 'footer-kontak-h', 'footer-addr', 'footer-email', 'footer-tel'].forEach((id, j) => rv(q(id), T, 23.55 + j * .02, 'rise', { dy: 12, d: .22 }));
  ['footer-line', 'footer-copy', 'footer-social'].forEach((id, j) => rv(q(id), T, 23.95 + j * .04, 'fade', { d: .2 }));
}

/* ---------------- Beranda – Mobile build ---------------- */
function buildMobile(T, S, q) {
  for (const id of [...TOP, 'm-menu']) V.st(q(id), { opacity: '0' });
  // hero
  rv(q('hero-bg'), T, 9.65, 'fade', { d: .15 }); rv(q('hero-bottles'), T, 9.7, 'place', { d: .35 });
  V.st(q('hero-ring'), { opacity: T > 9.7 ? f2(R(T, 9.7, 10.0)) : '0' });
  for (const id of ['header', 'header-logo', 'm-menu']) rv(q(id), T, 9.72, 'drop', { dy: 50, d: .3 });
  rv(q('hero-eyebrow'), T, 9.8, 'rise', { dy: 10 }); rv(q('hero-title'), T, 9.86, 'rise', { dy: 10 }); rv(q('hero-lead'), T, 9.94, 'rise', { dy: 10 });
  rv(q('hero-cta'), T, 10.0, 'pop', { d: .28 });
  for (let i = 1; i <= 3; i++) rv(q('hero-dot-' + i), T, 10.05 + i * .04, 'pop', { d: .22 });
  // produk (cards follow the desktop auto-layout: gap 16, carousel)
  rv(q('produk-swoosh'), T, 20.85, 'place', { d: .35 }); rv(q('produk-heading'), T, 20.9, 'drop', { dy: 14 }); rv(q('produk-cta'), T, 20.98, 'pop');
  for (let i = 1; i <= 4; i++) for (const [p, dt] of [['img', 0], ['bar', .03], ['name', .05], ['arrow', .07]]) rv(q(`card-${i}-${p}`), T, 21.0 + (i - 1) * .1 + dt, 'slide', { dx: 60 });
  rv(q('card-1-info'), T, 21.2, 'fade', { d: .2 });
  // marquee + instagram
  if (T > 21.3) { V.st(q('marquee-bg'), { opacity: f2(R(T, 21.3, 21.45)) }); V.st(q('marquee-track'), { opacity: f2(R(T, 21.35, 21.5)), transform: `translateX(${f2(-((T - 21.35) * 140 % 532))}px)` }); }
  rv(q('ig-bg'), T, 21.35, 'fade', { d: .2 }); V.st(q('ig-ring-right'), { opacity: T > 21.4 ? f2(R(T, 21.4, 21.7)) : '0' }); V.st(q('ig-ring-left'), { opacity: T > 21.4 ? f2(R(T, 21.4, 21.7)) : '0' });
  rv(q('ig-heading'), T, 21.4, 'drop', { dy: 14 });
  [21.48, 21.6, 21.72, 21.84].forEach((t0, i) => rv(q('ig-post-' + (i + 1)), T, t0, 'place', { d: .3 }));
  rv(q('ig-cta'), T, 21.98, 'pop');
  // the rest of the mobile frame is finished during the final pull-back
  const rest = TOP.filter(id => /^(dist-|cta-|footer-)/.test(id));
  rest.forEach((id, j) => rv(q(id), T, 24.1 + j * .009, 'rise', { dy: 14, d: .25 }));
}

/* ---------------- hero slides: Alt-drag duplicates ---------------- */
function buildSlides(T, S, z) {
  const dragPos = (t0, t1) => { const u = SG(T, t0, t1); return E.hand(u) + .012 * Math.sin(Math.PI * SG(u, .8, 1)); };
  const lab = (F, a) => { F.lb.style.fontSize = f2(21 / z) + 'px'; F.lb.style.top = f2(-31 / z) + 'px'; F.lb.style.opacity = f2(a); };
  const ua = dragPos(7.62, 8.02), aA = T > 7.6 && T < 8.15 ? 1 - R(T, 8.02, 8.14) : 0;
  S.dA.el.style.display = aA > .005 ? '' : 'none'; S.dA.el.style.opacity = f2(aA); S.dA.el.style.left = f2(SX * ua) + 'px';
  S.dA.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 7.97, 8.03)))}px 40px rgba(0,0,0,.12)`; S._sa = SX * ua;
  V.st(S.dA.f.q('hero-ring'), { opacity: '1' });
  const s2on = T > 8.02; S.s2.el.style.display = s2on ? '' : 'none'; const q2 = S.s2.f.q;
  if (s2on) { for (const id of ['slide2-photo', 'slide2-title', 'slide2-lead', 'slide2-cta']) V.st(q2(id), { opacity: '0' });
    rv(q2('slide2-photo'), T, 8.06, 'place', { d: .3 });
    if (T > 8.1) { V.st(q2('slide2-title'), { opacity: '1' }); V.typeEl(q2('slide2-title'), S.tyS2.at(T - 8.1), T < 8.5 && V.blink(T, 8.4)); }
    rv(q2('slide2-lead'), T, 8.36, 'rise', { dy: 10, d: .2 }); rv(q2('slide2-cta'), T, 8.4, 'pop', { d: .22 }); }
  lab(S.s2, R(T, 8.02, 8.15));
  const ub = dragPos(8.36, 8.76), aB = T > 8.34 && T < 8.88 ? 1 - R(T, 8.76, 8.88) : 0;
  S.dB.el.style.display = aB > .005 ? '' : 'none'; S.dB.el.style.opacity = f2(aB); S.dB.el.style.top = f2(S3Y * ub) + 'px'; S._sb = S3Y * ub;
  S.dB.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 8.71, 8.77)))}px 40px rgba(0,0,0,.12)`;
  const s3on = T > 8.76; S.s3.el.style.display = s3on ? '' : 'none'; const q3 = S.s3.f.q;
  if (s3on) { for (const id of ['slide3-photo', 'slide3-title', 'slide3-lead', 'slide3-cta']) V.st(q3(id), { opacity: '0' });
    rv(q3('slide3-photo'), T, 8.8, 'place', { d: .3 });
    if (T > 8.8) { V.st(q3('slide3-title'), { opacity: '1' }); V.typeEl(q3('slide3-title'), S.tyS3.at(T - 8.8), T < 9.15 && V.blink(T, 9.08)); }
    rv(q3('slide3-lead'), T, 9.0, 'rise', { dy: 10, d: .2 }); rv(q3('slide3-cta'), T, 9.05, 'pop', { d: .22 }); }
  lab(S.s3, R(T, 8.76, 8.9));
}

/* ---------------- on-canvas cues only ---------------- */
function canvasUI(T, S, q, P, U) {
  const box = (x, y, w, h, o = {}) => U.box(P.rect(x, y, w, h), o);
  const ib = id => { const b = q(id).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  S.chipF.el.style.display = 'none';
  if (T < .9) box(0, 0, 1200, 627, { a: R(T, .1, .2) * (1 - R(T, .7, .9)), handles: true, size: '1200 × 627' });
  if (T > 1.1 && T < 1.75) { const u = E.hand(SG(T, 1.12, 1.55)); box(-505, -357, 797 * u, 797 * u, { handles: u >= 1, size: `${Math.round(797 * u)} × ${Math.round(797 * u)}`, a: 1 - R(T, 1.6, 1.75) }); }
  if (T > 1.95 && T < 2.75) { const dy = S._hdy || 0, a = 1 - R(T, 2.55, 2.75);
    box(40, 40 + dy, 1120, 72, { handles: true, a });
    const ga = R(T, 2.2, 2.28) * a;
    U.gap(P.pt(1000, 0), P.pt(1000, 40 + dy), String(Math.max(0, Math.round(40 + dy))), { a: ga, dx: 46 });
    U.gap(P.pt(1160, 96 + dy), P.pt(1200, 96 + dy), '40', { a: ga, dy: 36 });
    U.line(P.pt(1160, -200), P.pt(1160, 400), { a: ga * .8, dash: true }); }
  if (T > 2.8 && T < 3.6) { const r = ib('hero-title'); box(40, 247, Math.max(4, r.w), 88, { handles: T > 3.45, a: 1 - R(T, 3.5, 3.6) }); }
  if (T > 3.75 && T < 4.6) U.box(P.rect(BX + 336, BY + 815, 146, 37), { a: R(T, 3.75, 3.85) * (T > 3.97 ? 1 : .55) * (1 - R(T, 4.45, 4.6)), handles: T > 3.97, label: 'Montserrat', labelCol: VW.BLUE });
  if (T > 4.95 && T < 5.3) { const r = ib('hero-title'); box(40, 247, r.w, 88, { handles: true, a: R(T, 4.95, 5.0) * (1 - R(T, 5.2, 5.3)), size: `${Math.round(r.w)} × 88` }); }
  if (T > 5.33 && T < 7.3) { const u = S._cu || 0, cw = 302 * u, ch = 40 * Math.min(1, u * 1.12);
    box(40, 458, Math.max(1, cw), Math.max(1, ch), { handles: u >= 1, size: `${Math.round(cw)} × ${Math.round(ch)}`, a: 1 - R(T, 7.1, 7.3) });
    if (T > 6.74 && T < 7.25) { const p = P.pt(40, 458 + 40); const hx = T < 6.82 ? 'F77CA0' : (S.tyHex2.at(T - 6.82).s || '');
      S.chipF.el.style.display = 'flex'; S.chipF.el.style.opacity = f2(R(T, 6.74, 6.82) * (1 - R(T, 7.12, 7.25)));
      S.chipF.el.style.transform = `translate(${f2(p.x)}px,${f2(p.y + 70)}px)`; S.chipF.sw.style.background = T < 6.94 ? '#F77CA0' : '#FF3548';
      S.chipF.hx.innerHTML = 'Fill  #' + hx + (T > 6.8 && T < 7.1 && V.blink(T, 7.02) ? '<span style="display:inline-block;width:2px;height:22px;background:#0D99FF;vertical-align:-4px;margin-left:1px"></span>' : ''); } }
  if (T > 5.95 && T < 6.35) U.box(P.rect(BX + 360, BY + 409, 195, 197), { a: R(T, 5.95, 6.05) * (1 - R(T, 6.25, 6.35)), handles: true, label: '#F77CA0', labelCol: VW.BLUE });
  // slides
  if (T > 7.4 && T < 9.2) { const s3 = T > 8.3, dx = s3 ? SX : (S._sa || 0), dy = s3 ? (S._sb || 0) : 0;
    box(dx, dy, 1200, 627, { handles: true, size: '1200 × 627', a: R(T, 7.4, 7.5) * (1 - R(T, 9.0, 9.2)) });
    const g1 = R(T, 7.95, 8.0) * (1 - R(T, 8.18, 8.26)), g2 = R(T, 8.7, 8.76) * (1 - R(T, 8.95, 9.05));
    U.line(P.pt(-60, 0), P.pt(SX + 1260, 0), { a: g1, dash: true }); U.gap(P.pt(1200, 313), P.pt(SX, 313), '120', { a: g1, dy: -30 });
    U.line(P.pt(SX, -60), P.pt(SX, S3Y + 690), { a: g2, dash: true }); U.gap(P.pt(SX + 600, 627), P.pt(SX + 600, S3Y), '120', { a: g2, dx: 40 }); }
  // mobile hero: header snap + frame
  if (T > 9.6 && T < 11.2) { box(MX, 0, 390, 720, { handles: true, size: '390 × 720', a: R(T, 9.6, 9.7) * (1 - R(T, 10.0, 10.1)) });
    const a = R(T, 10.2, 10.3) * (1 - R(T, 10.7, 10.85));
    U.gap(P.pt(MX, 140), P.pt(MX + 20, 140), '20', { a, dy: -30 }); U.line(P.pt(MX + 20, 90), P.pt(MX + 20, 300), { a: a * .8, dash: true }); }
  if (T > 10.9 && T < 11.45) { const a = R(T, 10.9, 11.0) * (1 - R(T, 11.3, 11.45)); box(0, 0, 1200, 627, { a, size: 'Desktop 1200' }); box(MX, 0, 390, 720, { a, size: 'Mobile 390' }); }
  // produk auto-layout gap handle
  if (T > 12.05 && T < 13.5) { const n = Math.max(1, Math.min(4, 1 + Math.floor((T - 12.1) / .15))), gv = GAP0 * (S._gap || 0), w = 248.75 * n + gv * (n - 1);
    box(72, 888, w, 305, { handles: true, size: `${Math.round(w)} × 305`, a: 1 - R(T, 13.35, 13.5) });
    const ta = R(T, 12.8, 12.9) * (1 - R(T, 13.25, 13.4));
    for (let i = 1; i < 4; i++) { const x0 = 72 + i * 248.75 + (i - 1) * gv; U.gapTint(P.rect(x0, 888, Math.max(.6, gv), 305), { a: ta });
      U.line(P.pt(x0 + gv / 2, 1015), P.pt(x0 + gv / 2, 1065), { a: ta, col: '#F248BA', sw: 4 }); }
    U.pill(String(Math.round(gv)), P.pt(72 + 248.75 + gv / 2, 1100).x, P.pt(0, 1100).y, { a: ta, col: '#F248BA', fs: 22 }); }
  if (T > 13.55 && T < 14.1) box(72, 888, 248.75, 248.75, { a: R(T, 13.55, 13.6) * (1 - R(T, 13.95, 14.1)), handles: true, size: '249 × 249' });
  // distributor
  if (T > 14.45 && T < 15.15) { const u = S._db || 0; box(39, 1444, 1122 * u, 478 * Math.min(1, u * 1.12), { handles: u >= 1, size: `${Math.round(1122 * u)} × ${Math.round(478 * Math.min(1, u * 1.12))}`, a: 1 - R(T, 15.0, 15.15) }); }
  if (T > 15.25 && T < 15.85) { const u = S._dm || 0, w = 659 * u, h = 311 * Math.min(1, u * 1.12);
    if (T < 15.65) U.box(P.rect(468, 1578, Math.max(1, w), Math.max(1, h)), { fill: `rgba(227,227,227,${f2(1 - R(T, 15.52, 15.65))})`, sw: .01 });
    box(468, 1578, Math.max(1, w), Math.max(1, h), { handles: u >= 1, size: `${Math.round(w)} × ${Math.round(h)}`, a: 1 - R(T, 15.75, 15.85) }); }
  { const pu = SG(T, 15.92, 16.35); if (pu > 0 && pu < 1) { const cc = P.pt(758, 1716), r = (10 + 50 * E.outCubic(pu)) * P4._c.z; U.box({ x: cc.x - r, y: cc.y - r, w: 2 * r, h: 2 * r }, { a: 1 - pu, col: '#EE225B', sw: 3 }); } }
  // marquee
  if (T > 17.25 && T < 18.1) { const u = S._mq || 0; box(0, 2082, 1200 * u, 100 * Math.min(1, u * 1.12), { handles: u >= 1, size: `${Math.round(1200 * u)} × ${Math.round(100 * Math.min(1, u * 1.12))}`, a: 1 - R(T, 17.98, 18.1) }); }
  if (T > 17.62 && T < 17.85) { const r = ib('dist-heading'); U.box(P.rect(r.x + r.w * .36, r.y, r.w * .64, r.h), { a: R(T, 17.62, 17.68) * (1 - R(T, 17.78, 17.85)), handles: true, label: '#EE225B', labelCol: VW.BLUE }); }
  if (T > 18.15 && T < 18.85) { const r = ib('marquee-text-2'); box(r.x, 2116, Math.max(4, r.w), 32, { handles: T > 18.67, a: 1 - R(T, 18.75, 18.85) }); }
  // instagram posts
  if (T > 19.6 && T < 20.3) { const n = Math.min(4, 1 + Math.floor((T - 19.6) / .15)); box(40 + (n - 1) * 288, 2363, 255, 318.75, { handles: true, size: '255 × 319', a: 1 - R(T, 20.15, 20.3) }); }
  // mobile produk / instagram (frame-level selections)
  if (T > 20.85 && T < 21.35) box(MX + 20, 896, 370, 305, { handles: true, size: 'Gap 16', a: R(T, 20.95, 21.05) * (1 - R(T, 21.25, 21.35)) });
  if (T > 21.46 && T < 22.1) { const n = Math.max(1, Math.min(4, 1 + Math.floor((T - 21.48) / .12))), xs = [20, 201, 20, 201], ys = [2276, 2276, 2499, 2499];
    box(MX + xs[n - 1], ys[n - 1], 169, 211.3, { handles: true, size: '169 × 211', a: 1 - R(T, 21.95, 22.1) }); }
  // cta + footer
  if (T > 22.55 && T < 23.25) box(40, 2861, 1120, 195, { handles: true, size: '1120 × 195', a: R(T, 22.55, 22.65) * (1 - R(T, 23.1, 23.25)) });
  if (T > 23.3 && T < 24.1) box(0, 2985, 1200, 484, { handles: true, size: '1200 × 484', a: R(T, 23.3, 23.4) * (1 - R(T, 23.95, 24.1)) });
  if (T > 24.6) { const a = R(T, 24.6, 24.8); box(0, 0, 1200, 3469, { handles: true, size: '1200 × 3469', a }); box(MX, 0, 390, 3930, { handles: true, size: '390 × 3930', a }); }
}

P4.slice = function (T0, T1) {
  V.scene({ duration: T1, offset: T0, speed: SPEED, persp: 2400,
    setup(V) { return P4.setup(V, T0, T1); },
    frame(t, S) { P4.frame(t, S); } });
};
})();
