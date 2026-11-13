/* engine/p3.js — BYGY v3 "One page growing": THE PROCESS as one continuous take on a flat design canvas.
 * Pure function of the GLOBAL take time T (0..P3.D). Scenes p_take1..3 each render a slice [T0, T1) of the same
 * take (V.scene offset), so the cuts between them are seamless continuous cuts by construction.
 * World units = Beranda page px. Beranda frame at (0,0) 1200x3469, brief frame on its left, hero slides on its right.
 * Needs kit.js, v2.js, v2_ws.js. */
(function () {
'use strict';
const P3 = window.P3 = {};
const mk = V.mk, R = V.ramp, SG = V.seg, E = V.E, lerp = K.lerp, f2 = v => (+v).toFixed(3);
const AX = VW.AREA_CX;                  // centre of the free canvas area (left of the panel)
const BX = -1320, BY = 0;               // brief frame
const SX = 1320, S3Y = 747;             // slide 2 at (SX,0), slide 3 at (SX,S3Y)
const D = P3.D = 25.8;
const back = u => { u = K.clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

/* ---------------- camera: world point (x,y) at screen (sx,960), zoom z; optional zoom dip mid-glide ------------- */
const CK = [
  [0, 880, 330, 1.5, 540],
  [.75, 600, 520, .68, AX, 'inOutCubic'],
  [1.25, 590, 535, .69, AX, 'inOutSine'],
  [1.6, 470, 150, .95, AX, 'inOutCubic'],
  [2.1, 480, 140, .95, AX, 'inOutSine'],
  [2.35, 330, 300, 1.3, AX, 'inOutCubic'],
  [2.9, 345, 300, 1.3, AX, 'inOutSine'],
  [3.4, -800, 850, 1.25, AX, 'inOutCubic', .5],
  [3.95, -805, 845, 1.25, AX, 'inOutSine'],
  [4.45, 330, 360, 1.05, AX, 'inOutCubic', .45],
  [4.75, 260, 430, 1.25, AX, 'inOutCubic'],
  [5.15, 255, 435, 1.25, AX, 'inOutSine'],
  [5.6, -850, 520, 1.2, AX, 'inOutCubic', .45],
  [5.95, -852, 522, 1.2, AX, 'inOutSine'],
  [6.4, 260, 440, 1.25, AX, 'inOutCubic', .45],
  [6.9, 270, 430, 1.2, AX, 'inOutSine'],
  [7.4, 1260, 700, .32, AX, 'inOutCubic'],
  [8.65, 1270, 720, .32, AX, 'inOutSine'],
  [9.15, 600, 1734, .47, AX, 'inOutCubic'],
  [9.7, 600, 1730, .47, AX, 'inOutSine'],
  [10.2, 600, 1085, .68, AX, 'inOutCubic'],
  [11.95, 600, 1090, .68, AX, 'inOutSine'],
  [12.35, 196, 1040, 1.35, AX, 'inOutCubic'],
  [12.95, 200, 1040, 1.35, AX, 'inOutSine'],
  [13.45, 600, 1734, .47, AX, 'inOutCubic'],
  [13.6, 600, 1730, .47, AX, 'inOutSine'],
  [14.1, 600, 1645, .68, AX, 'inOutCubic'],
  [15.0, 600, 1650, .68, AX, 'inOutSine'],
  [15.3, 797, 1733, .95, AX, 'inOutCubic'],
  [16.05, 790, 1728, .95, AX, 'inOutSine'],
  [16.4, 560, 1690, .74, AX, 'inOutCubic'],
  [16.85, 565, 1690, .74, AX, 'inOutSine'],
  [17.3, 600, 2132, .64, AX, 'inOutCubic'],
  [18.05, 600, 2132, .64, AX, 'inOutSine'],
  [18.3, 330, 2132, 1.15, AX, 'inOutCubic'],
  [18.9, 360, 2132, 1.15, AX, 'inOutSine'],
  [19.3, 600, 2132, .72, AX, 'inOutCubic'],
  [19.8, 600, 1734, .47, AX, 'inOutCubic'],
  [19.95, 600, 1732, .47, AX, 'inOutSine'],
  [20.45, 600, 2560, .68, AX, 'inOutCubic'],
  [21.6, 600, 2575, .68, AX, 'inOutSine'],
  [22.0, 600, 2958, .72, AX, 'inOutCubic'],
  [22.9, 600, 2962, .72, AX, 'inOutSine'],
  [23.3, 600, 3230, .68, AX, 'inOutCubic'],
  [24.25, 600, 3240, .68, AX, 'inOutSine'],
  [24.85, 600, 1734, .47, AX, 'inOutCubic'],
  [D, 600, 1734, .478, AX, 'inOutSine'],
];
P3.cam = function (T) {
  let i = 1; while (i < CK.length - 1 && T > CK[i][0]) i++;
  const a = CK[i - 1], b = CK[i];
  const ul = SG(T, a[0], b[0]), u = E[b[5] || 'inOutCubic'](ul);
  const lz = lerp(Math.log(a[3]), Math.log(b[3]), u) - (b[6] || 0) * Math.sin(Math.PI * u);
  const c = { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lz), sx: lerp(a[4], b[4], u) };
  // hand-held drift (<= ~2 screen px), off at the very start (match cut from the hook)
  const dk = R(T, .7, 1.2);
  c.x += dk * 2.2 * K.noise(T * .35, 3) / c.z; c.y += dk * 2.2 * K.noise(T * .35, 9) / c.z;
  return c;
};

/* ---------------- searches (layer search / quick actions pill) ---------------- */
const SEARCH = [
  { text: 'Produk Unggulan', t0: 9.15, dur: .45, enter: 9.7, el: [0, 748, 1200, 671] },
  { text: 'Distributor', t0: 13.15, dur: .35, enter: 13.6, el: [0, 1330, 1200, 630] },
  { text: 'Marquee', t0: 16.45, dur: .3, enter: 16.85, el: [0, 2082, 1200, 100] },
  { text: 'Instagram', t0: 19.5, dur: .35, enter: 19.95, el: [0, 2182, 1200, 834] },
];

/* ---------------- cursor keys: [T, x, y, kind, space('w' world | 's' screen)] ---------------- */
let FIELD = {};     // panel field centres (screen), filled in setup
const CUR = () => [
  [.3, 980, 430, 'arrow', 'w'], [.7, 960, 420, 'arrow', 'w'],
  [.8, 120, 210, 'cross', 'w'], [1.2, 292, 440, 'cross', 'w'],
  [1.35, 700, -14, 'arrow', 'w'], [1.55, 700, -14, 'arrow', 'w'], [1.9, 700, 76, 'arrow', 'w'], [2.1, 760, 150, 'arrow', 'w'],
  [2.28, 64, 292, 'arrow', 'w'], [2.4, 64, 292, 'arrow', 'w'], [2.75, 640, 380, 'arrow', 'w'],
  [3.4, BX + 410, 838, 'arrow', 'w'], [3.5, BX + 410, 838, 'arrow', 'w'], [3.95, BX + 520, 900, 'arrow', 'w'],
  [4.45, 660, 420, 'arrow', 'w'], [4.78, 40, 458, 'cross', 'w'], [4.84, 40, 458, 'cross', 'w'], [5.1, 342, 498, 'cross', 'w'],
  [5.15, 380, 520, 'eyedrop', 'w'], [5.6, BX + 470, 520, 'eyedrop', 'w'], [5.95, BX + 470, 520, 'eyedrop', 'w'],
  [6.4, 190, 478, 'eyedrop', 'w'], [6.5, 190, 478, 'eyedrop', 'w'],
  [6.62, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'], [6.9, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'],
  [7.38, 600, 330, 'arrow', 'w'], [7.44, 600, 330, 'arrow', 'w'], [7.85, SX + 600, 330, 'arrow', 'w'],
  [8.12, SX + 600, 330, 'arrow', 'w'], [8.18, SX + 600, 330, 'arrow', 'w'], [8.58, SX + 600, S3Y + 330, 'arrow', 'w'],
  [8.95, SX + 700, S3Y + 520, 'arrow', 'w'],
  [10.45, 600, 1330, 'arrow', 'w'], [10.65, 196, 1012, 'arrow', 'w'], [10.8, 465, 1012, 'arrow', 'w'], [10.95, 734, 1012, 'arrow', 'w'], [11.1, 1003, 1012, 'arrow', 'w'],
  [11.3, FIELD.gap.x, FIELD.gap.y, 'arrow', 's'], [11.85, FIELD.gap.x, FIELD.gap.y, 'arrow', 's'],
  [12.3, 230, 1060, 'arrow', 'w'], [12.95, 236, 1066, 'arrow', 'w'],
  [14.2, 300, 1480, 'cross', 'w'], [14.3, 39, 1444, 'cross', 'w'], [14.6, 1161, 1922, 'cross', 'w'],
  [15.0, 468, 1578, 'cross', 'w'], [15.1, 468, 1578, 'cross', 'w'], [15.4, 1127, 1889, 'cross', 'w'],
  [15.85, 758, 1716, 'arrow', 'w'], [16.1, 758, 1716, 'arrow', 'w'], [16.4, 820, 1800, 'arrow', 'w'],
  [17.3, 0, 2082, 'cross', 'w'], [17.4, 0, 2082, 'cross', 'w'], [17.7, 1200, 2182, 'cross', 'w'],
  [17.78, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'], [18.05, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'],
  [18.2, 206, 2132, 'arrow', 'w'], [18.3, 206, 2132, 'arrow', 'w'], [18.85, 420, 2200, 'arrow', 'w'],
  [20.6, 600, 2330, 'arrow', 'w'], [20.85, 167, 2522, 'arrow', 'w'], [21.0, 455, 2522, 'arrow', 'w'], [21.15, 743, 2522, 'arrow', 'w'], [21.3, 1031, 2522, 'arrow', 'w'],
  [21.55, 600, 2760, 'arrow', 'w'],
  [22.25, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'], [22.55, FIELD.fill.x, FIELD.fill.y, 'arrow', 's'],
  [22.9, 860, 3000, 'arrow', 'w'], [23.6, 640, 3300, 'arrow', 'w'], [24.2, 700, 3360, 'arrow', 'w'],
];
const CUR_VIS = [[.3, 9.0], [10.4, 13.05], [14.15, 16.45], [17.25, 19.35], [20.55, 24.3]];
const PRESS = [[.82, 1.2], [1.55, 1.9], [2.28, 2.33], [3.48, 3.54], [4.84, 5.1], [5.66, 5.72], [6.46, 6.52], [6.64, 6.7],
  [7.44, 7.85], [8.18, 8.58], [10.65, 10.69], [10.8, 10.84], [10.95, 10.99], [11.1, 11.14], [11.32, 11.37],
  [14.3, 14.6], [15.1, 15.4], [15.95, 16.0], [17.4, 17.7], [17.8, 17.85], [18.25, 18.3],
  [20.85, 20.89], [21.0, 21.04], [21.15, 21.19], [21.3, 21.34], [22.3, 22.35]];

/* ---------------- layer log (panel Layers list) ---------------- */
const LAYERS = [[0, 'gogo bottle edited 1'], [.75, 'Ellipse 5'], [1.5, 'Header'], [2.3, 'Produk Plastik'], [4.8, 'Frame 1161'],
  [7.45, 'Slide 2'], [8.2, 'Slide 3'], [10.2, 'Produk Unggulan'], [14.1, 'Distributor'], [15.1, 'Map'], [17.35, 'Marquee'],
  [20.45, 'Instagram'], [22.0, 'CTA'], [23.3, 'Footer']];

P3.setup = function (V, T0, T1) {
  const S = {};
  V.sky.style.background = '#F3F3F3';
  S.cv = VW.canvas();
  const fr = (src, x, y, w, h, name, vh) => {
    const e = mk('div', 'f', V.world, `left:${x}px;top:${y}px;width:${w}px;height:${h}px;background:#fff;overflow:visible`);
    const box = mk('div', 'f', e, `left:0;top:0;width:${w}px;height:${h}px;overflow:hidden`);
    const f = V.page(box, src, w, vh || h);
    const lb = mk('div', 'f', e, 'left:0;white-space:nowrap;font-family:Poppins;font-weight:500;color:#8C8C8C'); lb.textContent = name;
    return { el: e, box, f, lb, w, h };
  };
  S.brief = fr('../design/brief.html', BX, BY, 1200, 1367, 'Guidelines - Home Opsi 1');
  S.B = fr('../design/final.html', 0, 0, 1200, 3469, 'Beranda');
  S.s2 = fr('../design/slide2.html', SX, 0, 1200, 627, 'Slide 2');
  S.s3 = fr('../design/slide3.html', SX, S3Y, 1200, 627, 'Slide 3');
  S.dA = fr('../design/final.html', 0, 0, 1200, 627, '', 3469);
  S.dB = fr('../design/slide2.html', SX, 0, 1200, 627, '');
  // placeholder section frames inside the empty Beranda (dashed, named)
  S.ph = [];
  for (const [n, y0, y1, x0 = 40, x1 = 1160] of [['Produk Unggulan', 770, 1300], ['Distributor', 1340, 1950], ['Marquee', 2088, 2176], ['Instagram', 2196, 2840],
    ['CTA', 2861, 3056], ['Footer', 3076, 3456]]) {
    const r = mk('div', 'f', S.B.el, `left:${x0}px;top:${y0}px;width:${x1 - x0}px;height:${y1 - y0}px;border:2px dashed #D6D6D6;border-radius:8px;background:rgba(244,244,244,.6)`);
    const l = mk('div', 'f', r, 'left:22px;top:14px;font:500 26px Poppins;color:#ABABAB;white-space:nowrap'); l.textContent = n;
    S.ph.push({ r, l, n });
  }
  S.ui = VW.ui(); S.panel = VW.panel();
  // search pill + result row (screen space)
  S.pill = V.pill({ w: 600, h: 84, fs: 31 });
  S.res = mk('div', '', V.over, `position:absolute;left:${AX - 300}px;top:134px;width:600px;height:66px;border-radius:16px;background:#fff;box-shadow:0 14px 34px rgba(40,60,100,.13);display:none;align-items:center;gap:14px;padding:0 16px;font:500 24px Poppins;color:#1E1E1E;z-index:15`);
  S.res.innerHTML = `<span class="rw" style="display:flex;align-items:center;gap:14px;flex:1;height:48px;border-radius:10px;padding:0 12px"><svg width="20" height="20" viewBox="0 0 18 18"><path d="M5 1v16M13 1v16M1 5h16M1 13h16" stroke="#8C8C8C" stroke-width="1.6"/></svg><span class="nm"></span><span style="margin-left:auto;color:#9A9A9A;font-size:19px">Frame</span></span>`;
  S.resRow = S.res.querySelector('.rw'); S.resNm = S.res.querySelector('.nm');
  S.typS = SEARCH.map((s, i) => V.typer(s.text, { seed: 30 + i, dur: s.dur }));
  // Montserrat flourish (screen-space 3D type)
  S.fl = mk('div', '', V.over, 'position:absolute;inset:0;perspective:1400px;perspective-origin:540px 960px;display:none;z-index:12;overflow:hidden');
  S.flw = mk('div', '', S.fl, 'position:absolute;left:540px;top:960px;width:0;height:0;transform-style:preserve-3d');
  for (let k = 9; k >= 0; k--) { const l = mk('div', 'gt', S.flw, `position:absolute;left:0;top:0;font-size:330px;color:${k ? '#C8154A' : '#EE225B'};transform:translate(-50%,-50%) translateZ(${-k * 5}px)`); l.textContent = 'Montserrat'; }
  S.cur = V.cursor(V.over, 1.5);
  S.alt = mk('div', '', V.over, 'position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:#111;color:#fff;font:700 24px/26px Poppins;text-align:center;display:none;z-index:51');
  S.alt.textContent = '+';
  // typers
  S.tyH = V.typer('Produk Plastik', { seed: 4, dur: .5 });
  S.tyHex1 = V.typer('F77CA0', { seed: 6, dur: .24 });
  S.tyHex2 = V.typer('FF3548', { seed: 7, dur: .2 });
  S.tyGap = V.typer('20', { seed: 8, dur: .14 });
  S.tyHex3 = V.typer('EE225B', { seed: 9, dur: .22 });
  S.tyMq = V.typer('100% Original BPA Free Material', { seed: 12, dur: .6 });
  S.tyS2 = V.typer('Tumbler\nFruitamin', { seed: 13, dur: .3 });
  S.tyS3 = V.typer('Mellau Plate', { seed: 14, dur: .28 });
  // panel field centres (screen)
  S.panel.set({ a: 1 });
  const fc = k => { const b = S.panel.el.querySelector(`[data-k="${k}"]`).getBoundingClientRect(); return { x: b.left + b.width * .45, y: b.top + b.height * .5 }; };
  FIELD = { fill: fc('fill'), gap: fc('gap'), font: fc('font') };
  S.CK = CUR();
  // SFX (global T) -> this slice only
  const inS = x => x >= T0 && x < T1, SF = V.SFX;
  for (const [a] of PRESS) if (inS(a)) SF.clicks.push(a);
  for (const s of SEARCH) if (inS(s.enter)) SF.clicks.push(s.enter);
  for (const r of [[2.4, 2.9], [5.72, 5.96], [6.7, 6.9], [9.33, 9.6], [11.37, 11.51], [13.33, 13.5], [16.63, 16.75], [17.85, 18.07], [18.3, 18.9], [19.68, 19.85], [7.95, 8.25], [8.62, 8.9]])
    if (inS(r[0])) SF.typing.push(r);
  for (let i = 1; i < CK.length; i++) { const a = CK[i - 1], b = CK[i]; const big = Math.abs(Math.log(b[3] / a[3])) > .35 || Math.hypot(b[1] - a[1], b[2] - a[2]) * b[3] > 500;
    if (big && inS(a[0])) SF.whoosh.push([a[0], b[0] - a[0], .3]); }
  return S;
};

/* projector for camera c: world -> screen */
const proj = c => ({ pt: (x, y) => ({ x: c.sx + (x - c.x) * c.z, y: 960 + (y - c.y) * c.z }),
  rect(x, y, w, h) { const a = this.pt(x, y); return { x: a.x, y: a.y, w: w * c.z, h: h * c.z }; } });

P3.frame = function (T, S) {
  const c = P3.cam(T), z = c.z, P = proj(c);
  // world transform: world point (cx,cy) at screen centre
  const cx = c.x + (540 - c.sx) / z, cy = c.y;
  V.world.style.transform = `scale(${f2(z)}) translate(${f2(-cx)}px,${f2(-cy)}px)`;
  V.world.style.transformOrigin = '0 0';
  S.cv.set(R(T, 0, .35)); S.cv.upd({ x: cx, y: cy, d: V.P / z });
  // frame labels + outlines (constant screen size)
  const lab = (F, a) => { F.lb.style.fontSize = f2(21 / z) + 'px'; F.lb.style.top = f2(-31 / z) + 'px'; F.lb.style.opacity = f2(a); };
  lab(S.B, R(T, .15, .45)); lab(S.brief, 1);
  for (const F of [S.B, S.brief, S.s2, S.s3]) F.box.style.boxShadow = `0 0 0 ${f2(1.2 / z)}px rgba(0,0,0,.09)`;

  const q = S.B.f.q, U = S.ui; U.begin();
  buildBeranda(T, S, q);
  buildSlides(T, S);
  // placeholders fade out as their section starts building
  const PHT = [10.2, 14.1, 17.35, 20.45, 22.0, 23.3];
  S.ph.forEach((p, i) => { const a = R(T, .2, .6) * (1 - R(T, PHT[i], PHT[i] + .25)); p.r.style.opacity = f2(a); p.r.style.display = a < .005 ? 'none' : '';
    p.r.style.borderWidth = f2(Math.max(1.5, 2 / z)) + 'px'; });

  /* ---------- search pill ---------- */
  let ps = { x: AX, y: 80 + Math.sin(T * 1.5) * 1.5, s: 1, a: R(T, .25, .55), text: '', ph: 'Cari layer…', caret: false };
  S.res.style.display = 'none';
  for (let i = 0; i < SEARCH.length; i++) {
    const s = SEARCH[i]; if (T < s.t0 - .1 || T > s.enter + .4) continue;
    const r = S.typS[i].at(T - s.t0 - .08), done = T > s.t0 + .08 + s.dur;
    ps = { ...ps, text: T < s.enter + .3 ? r.s : '', caret: T < s.enter + .3 && V.blink(T, s.t0 + s.dur + .1), ph: T < s.t0 ? 'Cari layer…' : '',
      s: 1 + .04 * R(T, s.t0 - .1, s.t0) * (1 - R(T, s.enter + .1, s.enter + .35)), press: K.pulse(T, s.enter, s.enter + .14, .03, .06) };
    if (done && T < s.enter + .3) {
      const ra = R(T, s.t0 + .05 + s.dur * .6, s.t0 + .15 + s.dur * .6) * (1 - R(T, s.enter + .15, s.enter + .3));
      S.res.style.display = 'flex'; S.res.style.opacity = f2(ra); S.res.style.transform = `translateY(${f2((1 - ra) * -8)}px)`;
      S.resNm.textContent = s.text; S.resRow.style.background = T > s.t0 + .1 + s.dur ? '#E5F4FF' : 'transparent';
    }
    // destination frame highlighted while the camera dives
    const ha = R(T, s.enter - .05, s.enter + .05) * (1 - R(T, s.enter + .45, s.enter + .6));
    U.box(P.rect(...s.el), { a: ha, handles: true, label: s.text, labelCol: VW.BLUE });
  }
  S.pill.set(ps);

  /* ---------- selection UI + panel ---------- */
  const pn = panelAndUI(T, S, q, P, U);
  S.panel.set(pn); U.end();

  /* ---------- Montserrat flourish ---------- */
  const fu = SG(T, 3.45, 4.45);
  S.fl.style.display = fu > 0 && fu < 1 ? 'block' : 'none';
  if (fu > 0 && fu < 1) {
    const a = R(T, 3.45, 3.6) * (1 - R(T, 4.25, 4.45));
    S.flw.style.opacity = f2(a);
    S.flw.style.transform = `translate3d(${f2(lerp(820, -820, E.inOutSine(fu)))}px,${f2(lerp(120, -60, fu))}px,${f2(lerp(-200, 220, fu))}px) rotateY(${f2(lerp(-38, 26, fu))}deg) rotateX(${f2(14 - 8 * fu)}deg) rotateZ(-6deg)`;
  }

  /* ---------- cursor ---------- */
  let vis = 0; for (const [a, b] of CUR_VIS) vis = Math.max(vis, R(T, a, a + .1) * (1 - R(T, b - .12, b)));
  const KS = S.CK; let k = 1; while (k < KS.length - 1 && T > KS[k][0]) k++;
  const toS = key => key[4] === 's' ? { x: key[1], y: key[2] } : P.pt(key[1], key[2]);
  let cp, kind;
  if (T <= KS[0][0]) { cp = toS(KS[0]); kind = KS[0][3]; }
  else { const a = KS[k - 1], b = KS[k], u = E.hand(SG(T, a[0], b[0])), A = toS(a), B = toS(b); cp = { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u) }; kind = SG(T, a[0], b[0]) < .5 ? a[3] : b[3]; }
  let press = 0; for (const [a, b] of PRESS) press = Math.max(press, b - a > .1 ? (T > a && T < b ? 1 : 0) : K.pulse(T, a, b + .05, .02, .04));
  S.cur.set(vis > .01 ? { x: cp.x, y: cp.y, kind, press, a: vis } : null);
  const alt = (T > 7.36 && T < 7.9) || (T > 8.1 && T < 8.62);
  S.alt.style.display = alt && vis > .01 ? 'block' : 'none';
  S.alt.style.transform = `translate(${f2(cp.x + 26)}px,${f2(cp.y + 34)}px)`;
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
const GAP0 = 20.25;   // real gap between product cards (341 - 72 - 248.75)
function rv(el, T, t0, kind, o = {}) {      // reveal helper -> sets opacity/transform on a design element
  if (!el || T < t0) return;
  const d = o.d || .3, u = SG(T, t0, t0 + d), a = R(T, t0, t0 + Math.min(d, .18), 'outCubic');
  const ex = o.tx || '';
  if (kind === 'fade') V.st(el, { opacity: f2(R(T, t0, t0 + d)) });
  else if (kind === 'drop' || kind === 'rise') { const dy = (kind === 'drop' ? -1 : 1) * (o.dy || 24) * (1 - back(u)); V.st(el, { opacity: f2(a), transform: `${ex} translateY(${f2(dy)}px)` }); }
  else if (kind === 'slide') { V.st(el, { opacity: f2(a), transform: `${ex} translateX(${f2((o.dx || 60) * (1 - back(u)))}px)` }); }
  else if (kind === 'pop') { const s = .4 + .6 * back(u); V.st(el, { opacity: f2(a), transform: `${ex} scale(${f2(s)})`, transformOrigin: '50% 50%' }); }
  else if (kind === 'place') { const s = 1.04 - .04 * E.outCubic(u); V.st(el, { opacity: f2(R(T, t0, t0 + d * .9, 'outCubic')), transform: `${ex} scale(${f2(s)})`, transformOrigin: '50% 50%' }); }
}
function drawRect(el, T, t0, t1, w, h) { const u = E.hand(SG(T, t0, t1)); if (T < t0) return 0;
  V.st(el, { opacity: '1', width: f2(Math.max(1, w * u)) + 'px', height: f2(Math.max(1, h * Math.min(1, u * 1.12))) + 'px' }); return u; }
function stroke(svgEl, T, t0, t1) { if (!svgEl || T < t0) return; const u = R(T, t0, t1, 'inOutCubic');
  V.st(svgEl, { opacity: '1' }); for (const c of svgEl.querySelectorAll('circle')) V.st(c, { strokeDasharray: '1000 1000', strokeDashoffset: f2(1000 * (1 - u)) }); }

function buildBeranda(T, S, q) {
  for (const id of TOP) V.st(q(id), { opacity: '0' });
  // HERO -------------------------------------------------------------
  V.st(q('hero-bg'), { opacity: '1' }); V.st(q('hero-bottles'), { opacity: '1' });
  stroke(q('hero-ring'), T, .8, 1.25);
  if (T > 1.5) { const hd = SG(T, 1.55, 1.9), he = E.hand(hd), dy = -90 * (1 - he) + 6 * Math.sin(Math.PI * SG(hd, .72, 1));
    for (const id of ['header', 'header-logo', 'nav']) V.st(q(id), { opacity: f2(R(T, 1.5, 1.58)), transform: `translateY(${f2(dy)}px)` }); }
  // heading: typed in Poppins, then Montserrat (picked from the brief) is applied
  if (T > 2.33) {
    const h = q('hero-title'), r = S.tyH.at(T - 2.38);
    V.st(h, { opacity: '1' });
    if (T < 3.5) V.st(h, { fontFamily: 'Poppins', fontWeight: '500', color: '#1E1E1E' });
    V.typeEl(h, r, T < 3.0 && V.blink(T, 2.9));
  }
  rv(q('hero-eyebrow'), T, 4.5, 'rise', { dy: 14, d: .3 }); rv(q('hero-lead'), T, 4.58, 'rise', { dy: 14, d: .3 });
  const cu = drawRect(q('hero-cta'), T, 4.84, 5.1, 302, 40);
  if (T > 4.84) V.st(q('hero-cta'), { background: T < 6.48 ? '#E3E3E3' : (T < 6.72 ? '#F77CA0' : K.mix('#F77CA0', '#FF3548', R(T, 6.72, 6.88))) });
  for (const id of ['hero-cta-label', 'hero-cta-arrow']) V.st(q(id), { opacity: '0' });
  if (T > 6.52) { const a = R(T, 6.52, 6.7, 'outCubic'); V.st(q('hero-cta-label'), { opacity: f2(a) }); V.st(q('hero-cta-arrow'), { opacity: f2(a), transform: `scale(${f2(.6 + .4 * a)})`, transformOrigin: '50% 50%' }); }
  for (let i = 1; i <= 3; i++) rv(q('hero-dot-' + i), T, 6.9 + i * .05, 'pop', { d: .25 });
  S._cu = cu;
  // PRODUK -----------------------------------------------------------
  rv(q('produk-swoosh'), T, 10.2, 'place', { d: .4 });
  rv(q('produk-heading'), T, 10.38, 'drop', { dy: 18 }); rv(q('produk-cta'), T, 10.5, 'pop', { d: .3 });
  const g = E.inOutCubic(SG(T, 11.5, 11.8));
  for (let i = 1; i <= 4; i++) {
    const t0 = 10.65 + (i - 1) * .15, sh = -(i - 1) * GAP0 * (1 - g), tx = `translateX(${f2(sh)}px)`;
    rv(q(`card-${i}-img`), T, t0, 'slide', { dx: 70, tx, d: .3 });
    rv(q(`card-${i}-bar`), T, t0 + .03, 'slide', { dx: 70, tx, d: .3 });
    rv(q(`card-${i}-name`), T, t0 + .06, 'slide', { dx: 70, tx, d: .3 });
    rv(q(`card-${i}-arrow`), T, t0 + .08, 'slide', { dx: 70, tx, d: .3 });
    if (i === 1 && T > 12.45) { V.st(q('card-1-info'), { opacity: f2(R(T, 12.45, 12.65)), transform: tx });
      const rows = q('card-1-info').children; [...rows].forEach((e, j) => { if (j === 0) return; const a = R(T, 12.5 + j * .012, 12.7 + j * .012, 'outCubic'); V.st(e, { opacity: f2(a), transform: `translateY(${f2((1 - a) * 8)}px)` }); }); }
  }
  rv(q('produk-prev'), T, 11.85, 'pop', { d: .25 }); rv(q('produk-next'), T, 11.9, 'pop', { d: .25 });
  // DISTRIBUTOR ------------------------------------------------------
  rv(q('dist-heading'), T, 14.15, 'drop', { dy: 18 });
  S._db = drawRect(q('dist-box'), T, 14.3, 14.6, 1122, 478);
  rv(q('dist-bar'), T, 14.62, 'fade', { d: .15 });
  ['dist-city-label', 'dist-city-box', 'dist-city-value', 'dist-city-chev', 'dist-result-label', 'dist-result-box', 'dist-result-value', 'dist-result-chev'].forEach((id, j) => rv(q(id), T, 14.66 + j * .03, 'rise', { dy: 10, d: .25 }));
  rv(q('dist-search-btn'), T, 14.92, 'pop', { d: .25 });
  if (T > 15.1) { S._dm = E.hand(SG(T, 15.1, 15.4)); }
  rv(q('dist-map'), T, 15.42, 'place', { d: .3 });
  ['dist-map-zoom', 'dist-map-fullscreen', 'dist-map-locate', 'dist-scrollbar'].forEach((id, j) => rv(q(id), T, 15.62 + j * .05, 'pop', { d: .22 }));
  ['dist-loc1-title', 'dist-loc1-addr', 'dist-loc1-tel', 'dist-loc1-km', 'dist-loc1-dir', 'dist-line', 'dist-loc2-title', 'dist-loc2-clip'].forEach((id, j) => rv(q(id), T, 16.12 + j * .04, 'rise', { dy: 12, d: .25 }));
  // MARQUEE ----------------------------------------------------------
  S._mq = drawRect(q('marquee-bg'), T, 17.4, 17.7, 1200, 100);
  if (T > 17.4) V.st(q('marquee-bg'), { background: T < 18.02 ? '#E3E3E3' : K.mix('#E3E3E3', '#EE225B', R(T, 18.02, 18.12)) });
  if (T > 18.28) {
    const tr = q('marquee-track'); const sp = T < 19.15 ? 0 : 0.5 * 140 * Math.pow(Math.min(T - 19.15, .8), 2) / .8 + 140 * Math.max(0, T - 19.95);
    V.st(tr, { opacity: '1', transform: `translateX(${f2(-(sp % 532))}px)` });
    for (const id of ['marquee-text-1', 'marquee-text-3', 'marquee-icon-1', 'marquee-icon-2', 'marquee-icon-3']) V.st(q(id), { opacity: '0' });
    V.typeEl(q('marquee-text-2'), S.tyMq.at(T - 18.3), T < 19.0 && V.blink(T, 18.9));
    rv(q('marquee-icon-2'), T, 18.92, 'pop', { d: .22 });
    for (const [id, t0] of [['marquee-icon-1', 19.0], ['marquee-text-1', 19.0], ['marquee-text-3', 19.04], ['marquee-icon-3', 19.04]]) rv(q(id), T, t0, 'fade', { d: .15 });
  }
  // INSTAGRAM --------------------------------------------------------
  rv(q('ig-bg'), T, 20.5, 'fade', { d: .25 });
  stroke(q('ig-ring-right'), T, 20.55, 20.95); stroke(q('ig-ring-left'), T, 20.6, 20.95);
  rv(q('ig-heading'), T, 20.65, 'drop', { dy: 18 });
  for (let i = 1; i <= 4; i++) rv(q('ig-post-' + i), T, 20.85 + (i - 1) * .15, 'place', { d: .32 });
  rv(q('ig-cta'), T, 21.5, 'pop', { d: .28 });
  // CTA --------------------------------------------------------------
  rv(q('cta-photo'), T, 22.05, 'place', { d: .3 });
  if (T > 22.32) { const u = R(T, 22.32, 22.7, 'inOutCubic'); V.st(q('cta-gradient'), { opacity: '1', clipPath: `inset(0 ${f2((1 - u) * 100)}% 0 0 round 16px)` }); }
  rv(q('cta-heading'), T, 22.6, 'rise', { dy: 16 }); rv(q('cta-text'), T, 22.7, 'rise', { dy: 16 }); rv(q('cta-button'), T, 22.8, 'pop', { d: .3 });
  // FOOTER -----------------------------------------------------------
  rv(q('footer-bg'), T, 23.3, 'fade', { d: .2 }); rv(q('footer-waves'), T, 23.38, 'fade', { d: .3 });
  ['footer-logo', 'footer-partof', 'footer-bebest', 'footer-badges'].forEach((id, j) => rv(q(id), T, 23.5 + j * .05, 'rise', { dy: 14, d: .25 }));
  ['footer-ragam-h', ...Array.from({ length: 12 }, (_, i) => 'footer-ragam-' + (i + 1)), 'footer-kontak-h', 'footer-addr', 'footer-email', 'footer-tel'].forEach((id, j) => rv(q(id), T, 23.62 + j * .022, 'rise', { dy: 12, d: .22 }));
  ['footer-line', 'footer-copy', 'footer-social'].forEach((id, j) => rv(q(id), T, 24.08 + j * .04, 'fade', { d: .2 }));
}

/* ---------------- hero slides: Alt-drag duplicates ---------------- */
function buildSlides(T, S) {
  const dragPos = (t0, t1) => { const u = SG(T, t0, t1), e = E.hand(u); return e + .012 * Math.sin(Math.PI * SG(u, .8, 1)); };
  // dup A (the hero) dragged from (0,0) to (SX,0)
  const ua = dragPos(7.44, 7.85), aA = T > 7.42 && T < 7.98 ? 1 - R(T, 7.85, 7.97) : 0;
  S.dA.el.style.display = aA > .005 ? '' : 'none'; S.dA.el.style.opacity = f2(aA);
  S.dA.el.style.left = f2(SX * ua) + 'px'; S.dA.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 7.8, 7.86)))}px 40px rgba(0,0,0,.12)`;
  const dq = S.dA.f.q; for (const id of ['hero-ring']) V.st(dq(id), { opacity: '1' });
  // slide 2 frame
  const s2on = T > 7.85; S.s2.el.style.display = s2on ? '' : 'none';
  const q2 = S.s2.f.q;
  if (s2on) { for (const id of ['slide2-photo', 'slide2-title', 'slide2-lead', 'slide2-cta']) V.st(q2(id), { opacity: '0' });
    rv(q2('slide2-photo'), T, 7.9, 'place', { d: .3 });
    if (T > 7.95) { V.st(q2('slide2-title'), { opacity: '1' }); V.typeEl(q2('slide2-title'), S.tyS2.at(T - 7.95), T < 8.35 && V.blink(T, 8.25)); }
    rv(q2('slide2-lead'), T, 8.2, 'rise', { dy: 10, d: .2 }); rv(q2('slide2-cta'), T, 8.25, 'pop', { d: .22 }); }
  S.s2.lb.style.fontSize = f2(21 / P3._z) + 'px'; S.s2.lb.style.top = f2(-31 / P3._z) + 'px'; S.s2.lb.style.opacity = f2(R(T, 7.85, 8.0));
  // dup B (slide 2) dragged from (SX,0) to (SX,S3Y)
  const ub = dragPos(8.18, 8.58), aB = T > 8.16 && T < 8.7 ? 1 - R(T, 8.58, 8.7) : 0;
  S.dB.el.style.display = aB > .005 ? '' : 'none'; S.dB.el.style.opacity = f2(aB); S.dB.el.style.top = f2(S3Y * ub) + 'px';
  S.dB.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 8.53, 8.59)))}px 40px rgba(0,0,0,.12)`;
  const s3on = T > 8.58; S.s3.el.style.display = s3on ? '' : 'none';
  const q3 = S.s3.f.q;
  if (s3on) { for (const id of ['slide3-photo', 'slide3-title', 'slide3-lead', 'slide3-cta']) V.st(q3(id), { opacity: '0' });
    rv(q3('slide3-photo'), T, 8.62, 'place', { d: .3 });
    if (T > 8.62) { V.st(q3('slide3-title'), { opacity: '1' }); V.typeEl(q3('slide3-title'), S.tyS3.at(T - 8.62), T < 9.0 && V.blink(T, 8.9)); }
    rv(q3('slide3-lead'), T, 8.85, 'rise', { dy: 10, d: .2 }); rv(q3('slide3-cta'), T, 8.9, 'pop', { d: .22 }); }
  S.s3.lb.style.fontSize = f2(21 / P3._z) + 'px'; S.s3.lb.style.top = f2(-31 / P3._z) + 'px'; S.s3.lb.style.opacity = f2(R(T, 8.58, 8.72));
}

/* ---------------- panel + selection UI per beat ---------------- */
function layersAt(T, cur) {
  const L = LAYERS.filter(l => l[0] <= T).map(l => l[1]).reverse().slice(0, 6);
  return [...L.map(n => [n, n === cur, 1]), ['Beranda', cur === 'Beranda', 1]].slice(0, 7);
}
function panelAndUI(T, S, q, P, U) {
  const base = { a: R(T, .1, .4, 'outCubic'), pad: 0, gap: 0, font: 'Poppins', weight: 'Regular', size: 16 };
  let pn = { ...base, name: 'Beranda', x: 0, y: 0, w: 1200, h: 3469, fill: 'FFFFFF', swatch: 'FFFFFF' };
  const ib = (id) => { const e = q(id); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const box = (r, o) => U.box(P.rect(r.x, r.y, r.w, r.h), o);
  if (T < .75) { pn = { ...pn, name: 'gogo bottle edited 1', w: 1200, h: 627, fill: 'Image', swatch: 'B9E3F5' };
    box({ x: 0, y: 0, w: 1200, h: 627 }, { a: R(T, .1, .2), handles: true, size: '1200 × 627' }); }
  else if (T < 1.4) { pn = { ...pn, name: 'Ellipse 5', x: -505, y: -357, w: 797, h: 797, fill: 'FBCCCC', swatch: 'FBCCCC' };
    const u = E.hand(SG(T, .82, 1.2)); box({ x: -505, y: -357, w: 797 * u, h: 797 * u }, { handles: u >= 1, size: `${Math.round(797 * u)} × ${Math.round(797 * u)}` }); }
  else if (T < 2.2) { const dy = q('header').getBoundingClientRect().top - 40;
    pn = { ...pn, name: 'Header', x: 40, y: Math.round(40 + dy), w: 1120, h: 72, pad: 20, gap: 41, hl: T > 1.95 ? 'gap' : null };
    box({ x: 40, y: 40 + dy, w: 1120, h: 72 }, { handles: true, size: '1120 × 72' });
    const ga = R(T, 1.72, 1.8) * (1 - R(T, 2.05, 2.2));
    U.line(P.pt(600, 0), P.pt(600, 220), { a: ga * .9, dash: true });
    U.gap(P.pt(300, 0), P.pt(300, 40 + dy), String(Math.max(0, Math.round(40 + dy))), { a: ga });
    U.gap(P.pt(0, 76 + dy), P.pt(40, 76 + dy), '40', { a: ga, dy: 30 });
    const aa = R(T, 1.95, 2.0) * (1 - R(T, 2.12, 2.2));
    const nav = [...q('nav').children].map(e => { const b = e.getBoundingClientRect(); return { x: b.left, w: b.width }; });
    for (let i = 0; i < nav.length - 1; i++) { const x0 = nav[i].x + nav[i].w, x1 = nav[i + 1].x; U.gapTint(P.rect(x0, 54, x1 - x0, 46), { a: aa }); }
    U.pill(String(Math.round(nav[1].x - nav[0].x - nav[0].w)), P.pt((nav[0].x + nav[0].w + nav[1].x) / 2, 118).x, P.pt(0, 118).y, { a: aa, col: '#F248BA' }); }
  else if (T < 2.95) { const r = ib('hero-title');
    pn = { ...pn, name: 'Produk Plastik', x: 40, y: 247, w: Math.round(r.w), h: 88, fill: '1E1E1E', swatch: '1E1E1E', font: 'Poppins', weight: 'Medium', size: 72 };
    if (T > 2.33) box({ x: 40, y: 247, w: Math.max(4, r.w), h: 88 }, { handles: T > 2.9 }); }
  else if (T < 4.5) { const fp = T > 3.5;
    pn = { ...pn, name: 'Produk Plastik', x: 40, y: 247, w: Math.round(ib('hero-title').w), h: 88, fill: fp ? 'EE225B' : '1E1E1E', swatch: fp ? 'EE225B' : '1E1E1E', font: fp ? 'Montserrat' : 'Poppins', weight: fp ? 'Bold' : 'Medium', size: 72, hl: T > 3.0 && T < 4.2 ? 'font' : null };
    const ha = R(T, 3.25, 3.35) * (1 - R(T, 3.9, 4.0));
    U.box(P.rect(BX + 336, 815, 146, 37), { a: ha * (T > 3.48 ? 1 : .55), handles: T > 3.48, label: 'Montserrat', labelCol: VW.BLUE }); }
  else if (T < 6.6) { const u = S._cu || 0, cw = 302 * u, ch = 40 * Math.min(1, u * 1.12);
    let fill = 'E3E3E3', hl = null, caret = false, sw = 'E3E3E3';
    if (T > 5.68) { fill = S.tyHex1.at(T - 5.72).s || ''; sw = 'F77CA0'; hl = T < 6.0 ? 'fill' : null; caret = T < 6.0 && V.blink(T, 5.97); }
    if (T < 4.84) { pn = { ...pn, name: 'Produk Plastik', x: 40, y: 247, w: 554, h: 88, fill: 'EE225B', swatch: 'EE225B', font: 'Montserrat', weight: 'Bold', size: 72 }; }
    else { pn = { ...pn, name: 'Frame 1161', x: 40, y: 458, w: Math.round(cw), h: Math.round(ch), pad: 24, gap: 10, fill, swatch: sw, hl, caret };
      box({ x: 40, y: 458, w: Math.max(1, cw), h: Math.max(1, ch) }, { handles: u >= 1, size: `${Math.round(cw)} × ${Math.round(ch)}` });
      U.box(P.rect(BX + 360, 409, 195, 197), { a: R(T, 5.64, 5.68) * (1 - R(T, 5.95, 6.05)), handles: true, label: '#F77CA0', labelCol: VW.BLUE }); } }
  else if (T < 7.0) { const hx = T < 6.7 ? 'F77CA0' : (S.tyHex2.at(T - 6.7).s || '');
    pn = { ...pn, name: 'Frame 1161', x: 40, y: 458, w: 302, h: 40, pad: 24, gap: 10, fill: hx, swatch: T < 6.72 ? 'F77CA0' : 'FF3548', hl: 'fill', caret: V.blink(T, 6.92) };
    box({ x: 40, y: 458, w: 302, h: 40 }, { handles: true, size: '302 × 40' }); }
  else if (T < 9.1) {
    const s3 = T > 8.12, dx = s3 ? SX : parseFloat(S.dA.el.style.left) || 0, dy = s3 ? parseFloat(S.dB.el.style.top) || 0 : 0;
    pn = { ...pn, name: T < 7.44 ? 'Hero' : (s3 ? 'Slide 3' : 'Slide 2'), x: Math.round(dx), y: Math.round(dy), w: 1200, h: 627, fill: 'F5F5F5', swatch: 'F5F5F5' };
    if (T > 7.2) box({ x: dx, y: dy, w: 1200, h: 627 }, { handles: true, size: '1200 × 627', a: 1 - R(T, 8.85, 9.05) });
    const g1 = R(T, 7.78, 7.84) * (1 - R(T, 8.0, 8.1)), g2 = R(T, 8.52, 8.58) * (1 - R(T, 8.75, 8.85));
    U.line(P.pt(-60, 0), P.pt(SX + 1260, 0), { a: g1, dash: true });
    U.gap(P.pt(1200, 313), P.pt(SX, 313), '120', { a: g1, dy: -30 });
    U.line(P.pt(SX, -60), P.pt(SX, S3Y + 690), { a: g2, dash: true });
    U.gap(P.pt(SX + 600, 627), P.pt(SX + 600, S3Y), '120', { a: g2, dx: 40 }); }
  else if (T > 9.1 && T < 10.2) { const s = SEARCH[0]; if (T > s.enter) pn = { ...pn, name: s.text, x: 0, y: 748, w: 1200, h: 671 }; }
  else if (T < 13.0) {
    if (T < 11.25) { pn = { ...pn, name: 'Produk Unggulan', x: 0, y: 748, w: 1200, h: 671, fill: 'Image', swatch: 'FCE4EC' };
      if (T > 10.6) { const n = Math.min(4, 1 + Math.floor((T - 10.65) / .15)); box({ x: 72, y: 888, w: 248.75 * n, h: 305 }, { handles: true, size: `${Math.round(248.75 * n)} × 305` }); } }
    else if (T < 12.3) { const g = E.inOutCubic(SG(T, 11.5, 11.8)), gv = GAP0 * g, gapTxt = T < 11.37 ? '0' : (S.tyGap.at(T - 11.37).s || '');
      pn = { ...pn, name: 'Produk list', x: 72, y: 888, w: Math.round(4 * 248.75 + 3 * gv), h: 305, pad: 0, gap: gapTxt, hl: 'gap', caret: T < 11.6 && V.blink(T, 11.52), fill: 'FFFFFF', swatch: 'FFFFFF' };
      box({ x: 72, y: 888, w: 4 * 248.75 + 3 * gv, h: 305 }, { handles: true, size: `${Math.round(4 * 248.75 + 3 * gv)} × 305` });
      const ta = R(T, 11.55, 11.65) * (1 - R(T, 12.1, 12.25));
      for (let i = 1; i < 4; i++) { const x0 = 72 + i * 248.75 + (i - 1) * gv; U.gapTint(P.rect(x0, 888, Math.max(.5, gv), 305), { a: ta }); }
      U.pill(String(Math.round(gv)), P.pt(72 + 248.75 + gv / 2, 1210).x, P.pt(0, 1215).y, { a: ta, col: '#F248BA' }); }
    else { pn = { ...pn, name: 'Informasi Produk', x: 72, y: 888, w: 249, h: 249, fill: '154F91', swatch: '154F91', font: 'Montserrat', weight: 'SemiBold', size: 18 };
      box({ x: 72, y: 888, w: 248.75, h: 248.75 }, { a: R(T, 12.4, 12.45), handles: T > 12.45, size: '249 × 249' }); } }
  else if (T < 14.1) { const s = SEARCH[1]; if (T > s.enter) pn = { ...pn, name: s.text, x: 0, y: 1330, w: 1200, h: 630 }; }
  else if (T < 16.45) {
    if (T < 15.05) { const u = S._db || 0; pn = { ...pn, name: 'Rectangle 102', x: 39, y: 1444, w: Math.round(1122 * u), h: Math.round(478 * Math.min(1, u * 1.12)), fill: 'FFFFFF', swatch: 'FFFFFF' };
      if (T > 14.3) box({ x: 39, y: 1444, w: 1122 * u, h: 478 * Math.min(1, u * 1.12) }, { handles: u >= 1, size: `${Math.round(1122 * u)} × ${Math.round(478 * Math.min(1, u * 1.12))}` }); }
    else if (T < 15.8) { const u = T > 15.1 ? E.hand(SG(T, 15.1, 15.4)) : 0, w = 659 * u, h = 311 * Math.min(1, u * 1.12);
      pn = { ...pn, name: 'Map', x: 468, y: 1578, w: Math.round(w), h: Math.round(h), fill: T > 15.42 ? 'Image' : 'E3E3E3', swatch: T > 15.42 ? 'E8EAED' : 'E3E3E3' };
      if (T > 15.1) { if (T < 15.5) U.box(P.rect(468, 1578, Math.max(1, w), Math.max(1, h)), { fill: `rgba(227,227,227,${f2(1 - R(T, 15.42, 15.6))})`, sw: .01, a: 1 });
        box({ x: 468, y: 1578, w: Math.max(1, w), h: Math.max(1, h) }, { handles: u >= 1, size: `${Math.round(w)} × ${Math.round(h)}` }); } }
    else { pn = { ...pn, name: 'PT Be Best International', x: 758, y: 1723, w: 24, h: 34, fill: 'EA4335', swatch: 'EA4335' };
      const pu = SG(T, 15.95, 16.4); if (pu > 0 && pu < 1) { const c = P.pt(758, 1716), r = (12 + 60 * E.outCubic(pu)) * P3._z / .95;
        U.box({ x: c.x - r, y: c.y - r, w: 2 * r, h: 2 * r }, { a: 1 - pu, col: '#EE225B', sw: 3 }); }
      if (T < 16.3) box({ x: 744, y: 1700, w: 28, h: 40 }, { handles: true, a: R(T, 15.9, 15.95) }); } }
  else if (T < 17.35) { const s = SEARCH[2]; if (T > s.enter) pn = { ...pn, name: s.text, x: 0, y: 2082, w: 1200, h: 100 }; }
  else if (T < 19.4) {
    if (T < 18.15) { const u = S._mq || 0; let fill = 'E3E3E3', sw = 'E3E3E3', hl = null, caret = false;
      if (T > 17.8) { fill = S.tyHex3.at(T - 17.82).s || ''; sw = T > 18.02 ? 'EE225B' : 'E3E3E3'; hl = 'fill'; caret = V.blink(T, 18.05); }
      pn = { ...pn, name: 'Marquee', x: 0, y: 2082, w: Math.round(1200 * u), h: Math.round(100 * Math.min(1, u * 1.12)), fill, swatch: sw, hl, caret };
      if (T > 17.4) box({ x: 0, y: 2082, w: 1200 * u, h: 100 * Math.min(1, u * 1.12) }, { handles: u >= 1, size: `${Math.round(1200 * u)} × ${Math.round(100 * Math.min(1, u * 1.12))}` }); }
    else { const r = ib('marquee-text-2');
      pn = { ...pn, name: '100% Original BPA Free Material', x: 200, y: 2119, w: Math.round(r ? r.w : 0), h: 27, fill: 'FFFFFF', swatch: 'FFFFFF', font: 'Montserrat', weight: 'SemiBold', size: 22 };
      if (r && T < 19.0) box({ x: r.x, y: 2116, w: Math.max(4, r.w), h: 32 }, { handles: T > 18.9 }); } }
  else if (T < 20.45) { const s = SEARCH[3]; if (T > s.enter) pn = { ...pn, name: s.text, x: 0, y: 2182, w: 1200, h: 834 }; }
  else if (T < 22.0) { const n = T < 20.85 ? 0 : Math.min(4, 1 + Math.floor((T - 20.85) / .15));
    pn = { ...pn, name: n ? 'instagram post' : 'Instagram', x: n ? 40 + (n - 1) * 288 : 0, y: n ? 2363 : 2182, w: n ? 255 : 1200, h: n ? 319 : 834, fill: n ? 'Image' : 'F9F3FF', swatch: n ? 'F7C6D6' : 'F9F3FF' };
    if (n && T < 21.5) box({ x: 40 + (n - 1) * 288, y: 2363, w: 255, h: 318.75 }, { handles: true, size: '255 × 319' }); }
  else if (T < 23.3) { pn = { ...pn, name: 'Rectangle 284', x: 40, y: 2861, w: 1120, h: 195, fill: T > 22.32 ? 'Linear' : 'Image', swatch: T > 22.32 ? 'FF3548' : 'F2C4C4', hl: T > 22.28 && T < 22.8 ? 'fill' : null };
    if (T < 22.95) box({ x: 40, y: 2861, w: 1120, h: 195 }, { handles: true, size: '1120 × 195' }); }
  else if (T < 24.5) { pn = { ...pn, name: 'Footer', x: 0, y: 2985, w: 1200, h: 484, fill: 'FAFAFA', swatch: 'FAFAFA' };
    if (T < 24.25) box({ x: 0, y: 2985, w: 1200, h: 484 }, { handles: true, size: '1200 × 484', a: R(T, 23.3, 23.4) }); }
  else { box({ x: 0, y: 0, w: 1200, h: 3469 }, { handles: true, size: '1200 × 3469', a: R(T, 24.7, 24.9) }); }
  const cur = pn.name === 'Frame 1161' ? 'Frame 1161' : pn.name;
  pn.layers = layersAt(T, cur);
  return pn;
}

/* scene wrapper: one slice [T0,T1) of the take */
P3.slice = function (T0, T1) {
  V.scene({ duration: T1, offset: T0, persp: 2400,
    setup(V) { return P3.setup(V, T0, T1); },
    frame(t, S) { P3._z = P3.cam(t).z; P3.frame(t, S); } });
};
})();
