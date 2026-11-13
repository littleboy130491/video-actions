/* engine/p5.js — BYGY v5 process take (from p4.js). ONE continuous take on a flat design canvas.
 * v5: no brief on the canvas, no eyedropper, no placeholder boxes: every frame only exists as far as it is built
 * (frame heights grow section by section; the mobile frame is drawn when the designer starts it). Deliberate
 * expo push-ins (header snap, typed title, CTA, mobile header, gap pill, map, marquee type) alternating with pull-backs.
 * Hero slides are Alt-dragged UPWARD (vertical column fills the 9:16 frame). The take is cut once for the brief slide
 * (b_brief): take1 ends pushing into the CTA pill; take2 opens mid push-in on the mobile frame being drawn.
 * Pure function of the GLOBAL take time T. Scenes p5_take1..3 render slices of it. Needs kit.js, v2.js, v2_ws.js. */
(function () {
'use strict';
const P5 = window.P5 = {};
const mk = V.mk, R = V.ramp, SG = V.seg, E = V.E, lerp = K.lerp, f2 = v => (+v).toFixed(3);
const CX = 540;
const MX = -510;                     // mobile frame x (390 wide)
const SY2 = -747, SY3 = -1494;       // hero slides stacked above Beranda (120 gaps)
const D = P5.D = 22.8, SPEED = P5.SPEED = 1.08, TCUT = P5.TCUT = 6.85;
const back = u => { u = K.clamp(u); const c1 = 1.70158, c3 = c1 + 1; return 1 + c3 * Math.pow(u - 1, 3) + c1 * Math.pow(u - 1, 2); };

/* camera keys [T, x, y, zoom, ease, dip] : world (x,y) at screen centre */
const CK = [
  [0, 880, 330, 1.5],
  [.08, 880, 330, 1.5, 'inOutSine'],
  [.55, 600, 313, .9, 'inOutCubic'],            // pull back while the ring is drawn
  [.62, 602, 313, .9, 'inOutSine'],
  [.9, 900, 90, 2.4, 'inOutExpo'],              // PUSH 1: header snap
  [1.45, 905, 92, 2.45, 'inOutSine'],
  [1.78, 180, 291, 3.4, 'inOutExpo', .5],       // PUSH 2: typed title
  [2.4, 560, 291, 3.4, 'linear'],               // caret-follow
  [2.75, 310, 300, 1.85, 'inOutCubic'],         // font flip
  [2.95, 312, 300, 1.85, 'inOutSine'],
  [3.22, 330, 330, 1.15, 'inOutCubic'],
  [3.3, 330, 335, 1.15, 'inOutSine'],
  [3.55, 190, 478, 2.4, 'inOutExpo'],           // PUSH 3: CTA drawn + fill typed
  [4.12, 192, 480, 2.4, 'inOutSine'],
  [4.45, 600, 313, .85, 'inOutCubic'],
  [4.55, 600, 310, .85, 'inOutSine'],
  [5.05, 600, -60, .85, 'inOutCubic'],          // follow Alt-drag 1 (up)
  [5.4, 600, -62, .85, 'inOutSine'],
  [5.85, 600, -433, .85, 'inOutCubic'],         // follow Alt-drag 2: hero + 2 slides fill the frame
  [6.3, 600, -436, .85, 'inOutSine'],
  [TCUT, 191, 478, 3.6, 'inOutExpo'],           // PUSH into the CTA pill -> match into the brief slide
  [TCUT + .0001, MX + 195, 360, .42, 'linear'], // take2 opens mid push-in (after the brief slide)
  [7.4, MX + 195, 360, 1.9, 'outCubic'],
  [7.6, MX + 195, 362, 1.9, 'inOutSine'],
  [7.88, MX + 160, 150, 2.6, 'inOutExpo'],      // PUSH 4: mobile header snap
  [8.25, MX + 162, 152, 2.6, 'inOutSine'],
  [8.65, 345, -150, .62, 'inOutCubic'],
  [9.0, 348, -146, .62, 'inOutSine'],
  [9.5, 600, 900, .9, 'inOutCubic'],
  [10.2, 600, 905, .9, 'inOutSine'],
  [10.45, 331, 1040, 3.0, 'inOutExpo'],         // PUSH 5: gap pill
  [10.85, 333, 1040, 3.0, 'inOutSine'],
  [11.2, 196, 1040, 1.45, 'inOutCubic'],
  [11.6, 198, 1040, 1.45, 'inOutSine'],
  [12.05, 600, 1500, .9, 'inOutCubic'],
  [12.65, 600, 1505, .9, 'inOutSine'],
  [12.9, 797, 1733, 1.4, 'inOutExpo'],          // PUSH 6: map frame
  [13.5, 795, 1733, 1.4, 'inOutSine'],
  [14.25, 345, 1150, .55, 'inOutCubic'],
  [14.5, 345, 1146, .55, 'inOutSine'],
  [14.95, 600, 1650, .9, 'inOutCubic'],
  [15.45, 600, 1652, .9, 'inOutSine'],
  [15.85, 220, 2132, 3.0, 'inOutExpo'],         // PUSH 7: marquee text already typing
  [16.3, 520, 2132, 3.0, 'linear'],             // caret-follow
  [16.6, 600, 2132, .8, 'inOutCubic'],
  [17.05, 600, 2300, .85, 'inOutCubic'],
  [17.9, 600, 2310, .85, 'inOutSine'],
  [18.4, MX + 195, 1000, 1.6, 'inOutCubic', .45],
  [18.75, MX + 195, 1010, 1.6, 'inOutSine'],
  [19.15, MX + 195, 2450, 1.6, 'inOutCubic', .3],
  [19.6, MX + 195, 2460, 1.6, 'inOutSine'],
  [20.1, 600, 2600, .85, 'inOutCubic', .35],
  [20.65, 600, 2604, .85, 'inOutSine'],
  [21.0, 600, 2850, .8, 'inOutCubic'],
  [21.45, 600, 2858, .8, 'inOutSine'],
  [22.15, 345, 1965, .455, 'inOutCubic'],
  [D, 345, 1965, .46, 'inOutSine'],
];
P5.cam = function (T) {
  let i = 1; while (i < CK.length - 1 && T > CK[i][0]) i++;
  const a = CK[i - 1], b = CK[i];
  const u = E[b[4] || 'inOutCubic'](SG(T, a[0], b[0]));
  const lz = lerp(Math.log(a[3]), Math.log(b[3]), u) - (b[5] || 0) * Math.sin(Math.PI * u);
  const c = { x: lerp(a[1], b[1], u), y: lerp(a[2], b[2], u), z: Math.exp(lz) };
  c.x += 2 * K.noise(T * .35, 3) / c.z; c.y += 2 * K.noise(T * .35, 9) / c.z;
  return c;
};

/* cursor keys [T, x, y, kind] (world coords) */
const CUR = [
  [.12, 140, 210, 'cross'], [.25, 140, 210, 'cross'], [.7, 292, 440, 'cross'],
  [.8, 900, -14, 'arrow'], [.95, 900, -14, 'arrow'], [1.3, 900, 76, 'arrow'], [1.5, 940, 120, 'arrow'],
  [3.1, 300, 420, 'arrow'], [3.28, 40, 458, 'cross'], [3.32, 40, 458, 'cross'], [3.58, 342, 498, 'cross'], [3.7, 360, 540, 'arrow'], [4.05, 380, 560, 'arrow'],
  [4.5, 600, 330, 'arrow'], [4.62, 600, 330, 'arrow'], [5.02, 600, 330 + SY2, 'arrow'],
  [5.3, 600, 330 + SY2, 'arrow'], [5.42, 600, 330 + SY2, 'arrow'], [5.82, 600, 330 + SY3, 'arrow'],
  [6.85, MX - 30, -40, 'cross'], [6.87, MX, 0, 'cross'], [7.2, MX + 390, 720, 'cross'],
  [7.28, MX + 250, 560, 'arrow'], [7.4, MX + 200, 40, 'arrow'], [7.65, MX + 260, 120, 'arrow'],
  [8.45, MX + 330, 270, 'arrow'], [9.0, 600, 760, 'arrow'],
  [9.55, 600, 1300, 'arrow'], [9.75, 196, 1012, 'arrow'], [9.9, 465, 1012, 'arrow'], [10.05, 734, 1012, 'arrow'], [10.2, 1003, 1012, 'arrow'],
  [10.5, 321, 1040, 'arrow'], [10.57, 321, 1040, 'arrow'], [10.8, 331, 1040, 'arrow'],
  [11.2, 230, 1060, 'arrow'], [11.6, 236, 1066, 'arrow'],
  [12.0, 300, 1480, 'cross'], [12.1, 39, 1444, 'cross'], [12.4, 1161, 1922, 'cross'],
  [12.8, 468, 1578, 'cross'], [12.9, 468, 1578, 'cross'], [13.15, 1127, 1889, 'cross'],
  [13.4, 758, 1716, 'arrow'], [13.55, 758, 1716, 'arrow'], [13.95, 860, 1880, 'arrow'],
  [14.8, 40, 2090, 'cross'], [14.9, 0, 2082, 'cross'], [15.15, 1200, 2182, 'cross'], [15.25, 640, 2236, 'arrow'], [15.5, 660, 2250, 'arrow'],
  [16.6, 700, 2250, 'arrow'], [17.2, 167, 2522, 'arrow'], [17.35, 455, 2522, 'arrow'], [17.5, 743, 2522, 'arrow'], [17.65, 1031, 2522, 'arrow'], [17.9, 600, 2760, 'arrow'],
  [18.45, MX + 145, 1020, 'arrow'], [18.6, MX + 300, 1020, 'arrow'], [18.85, MX + 200, 1250, 'arrow'], [19.06, MX + 105, 2380, 'arrow'], [19.18, MX + 285, 2380, 'arrow'], [19.3, MX + 105, 2600, 'arrow'], [19.42, MX + 285, 2600, 'arrow'],
  [20.2, 700, 2958, 'arrow'], [20.6, 1050, 2960, 'arrow'], [21.05, 640, 3300, 'arrow'], [21.5, 700, 3360, 'arrow'],
];
const CUR_VIS = [[.1, 1.65], [3.05, 6.25], [6.86, 9.05], [9.4, 14.05], [14.7, 15.6], [16.6, 21.55]];
const PRESS = [[.25, .7], [.95, 1.3], [3.32, 3.58], [3.72, 3.76],
  [4.62, 5.02], [5.42, 5.82], [6.87, 7.2], [7.3, 7.34], [7.4, 7.44], [9.75, 9.79], [9.9, 9.94], [10.05, 10.09], [10.2, 10.24], [10.57, 10.8],
  [12.1, 12.4], [12.9, 13.15], [13.55, 13.6], [14.9, 15.15], [15.27, 15.31],
  [17.2, 17.24], [17.35, 17.39], [17.5, 17.54], [17.65, 17.69], [18.48, 18.52], [19.08, 19.12], [19.2, 19.24], [19.32, 19.36], [19.44, 19.48]];

/* frame heights: a frame only exists as far as it is built (grows over .28 s when a section starts) */
const HB = [[0, 627], [9.0, 1420], [11.9, 1960], [14.75, 2182], [16.9, 2860], [20.05, 3056], [20.85, 3469]];
const HM = [[0, 720], [18.4, 1240], [18.75, 2806], [21.65, 3930]];
const hAt = (T, L) => { let h = L[0][1]; for (let i = 1; i < L.length; i++) h = lerp(h, L[i][1], E.inOutCubic(SG(T, L[i][0], L[i][0] + .28))); return h; };

P5.setup = function (V, T0, T1) {
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
  S.B = fr('../design/final.html', 0, 0, 1200, 3469, 'Beranda');
  S.M = fr('../design/beranda_mobile.html', MX, 0, 390, 3930, 'Beranda – Mobile');
  S.s2 = fr('../design/slide2.html', 0, SY2, 1200, 627, 'Slide 2');
  S.s3 = fr('../design/slide3.html', 0, SY3, 1200, 627, 'Slide 3');
  S.dA = fr('../design/final.html', 0, 0, 1200, 627, '', 3469);
  S.dB = fr('../design/slide2.html', 0, SY2, 1200, 627, '');
  S.ui = VW.ui();
  // fill chip (anchored under the selection): hex typed by the designer
  const c = mk('div', '', V.over, 'position:absolute;left:0;top:0;display:none;align-items:center;gap:10px;height:44px;padding:0 14px 0 8px;border-radius:10px;background:#fff;box-shadow:0 6px 18px rgba(0,0,0,.16);font:600 21px Poppins;color:#1E1E1E;z-index:45;white-space:nowrap');
  c.innerHTML = '<span class="sw" style="width:28px;height:28px;border-radius:6px;box-shadow:inset 0 0 0 1px rgba(0,0,0,.12)"></span><span class="hx"></span>';
  S.chipF = { el: c, sw: c.querySelector('.sw'), hx: c.querySelector('.hx') };
  S.cur = V.cursor(V.over, 1.5);
  S.alt = mk('div', '', V.over, 'position:absolute;left:0;top:0;width:28px;height:28px;border-radius:50%;background:#111;color:#fff;font:700 24px/26px Poppins;text-align:center;display:none;z-index:51');
  S.alt.textContent = '+';
  S.tyH = V.typer('Produk Plastik', { seed: 4, dur: .6 });
  S.tyHexT = V.typer('EE225B', { seed: 5, dur: .16 });
  S.tyHex2 = V.typer('FF3548', { seed: 7, dur: .2 });
  S.tyHexM = V.typer('EE225B', { seed: 9, dur: .2 });
  S.tyMq = V.typer('100% Original BPA Free Material', { seed: 12, dur: .65 });
  S.tyS2 = V.typer('Tumbler\nFruitamin', { seed: 13, dur: .3 });
  S.tyS3 = V.typer('Mellau Plate', { seed: 14, dur: .28 });
  const inS = x => x >= T0 && x < T1, SF = V.SFX;
  for (const [a] of PRESS) if (inS(a)) SF.clicks.push(a);
  for (const r of [[1.8, 2.4], [2.63, 2.79], [3.68, 3.88], [5.1, 5.4], [5.86, 6.14], [15.28, 15.48], [15.6, 16.25]]) if (inS(r[0])) SF.typing.push(r);
  for (let i = 1; i < CK.length; i++) { const a = CK[i - 1], b = CK[i]; if (b[0] - a[0] < .01) continue;
    const big = Math.abs(Math.log(b[3] / a[3])) > .5 || Math.hypot(b[1] - a[1], b[2] - a[2]) * b[3] > 500;
    if (big && inS(a[0])) SF.whoosh.push([a[0], b[0] - a[0], .3]); }
  return S;
};

const proj = c => ({ pt: (x, y) => ({ x: CX + (x - c.x) * c.z, y: 960 + (y - c.y) * c.z }),
  rect(x, y, w, h) { const a = this.pt(x, y); return { x: a.x, y: a.y, w: w * c.z, h: h * c.z }; } });

P5.frame = function (T, S) {
  const c = P5.cam(T);
  const qB = S.B.f.q;
  const follow = (t0, t1, el, minX) => { const w = R(T, t0, t0 + .15) * (1 - R(T, t1 - .05, t1 + .25)); if (w <= 0) return;
    const b = el.getBoundingClientRect(); c.x = lerp(c.x, Math.max(minX, b.right - 110), w); };
  buildBeranda(T, S, qB);              // (DOM first: caret positions)
  follow(1.75, 2.4, qB('hero-title'), 180);
  follow(15.8, 16.3, qB('marquee-text-2'), 220);
  const z = c.z, P = proj(c); P5._c = c;
  V.world.style.transform = `scale(${f2(z)}) translate(${f2(-c.x)}px,${f2(-c.y)}px)`; V.world.style.transformOrigin = '0 0';
  S.cv.set(1); S.cv.upd({ x: c.x, y: c.y, d: V.P / z });
  const lab = (F, a) => { F.lb.style.fontSize = f2(21 / z) + 'px'; F.lb.style.top = f2(-31 / z) + 'px'; F.lb.style.opacity = f2(a); };
  // frame extents
  const hb = hAt(T, HB); S.B.el.style.height = S.B.box.style.height = f2(hb) + 'px';
  const mu = E.hand(SG(T, 6.87, 7.2)), mOn = T > 6.87;
  S.M.el.style.display = mOn ? '' : 'none';
  if (mOn) { const hm = T < 7.2 ? Math.max(1, 720 * Math.min(1, mu * 1.12)) : hAt(T, HM), wm = Math.max(1, 390 * mu);
    S.M.el.style.height = S.M.box.style.height = f2(hm) + 'px'; S.M.el.style.width = S.M.box.style.width = f2(wm) + 'px'; }
  lab(S.B, 1); lab(S.M, R(T, 7.2, 7.35));
  for (const F of [S.B, S.s2, S.s3, S.M]) F.box.style.boxShadow = `0 0 0 ${f2(1.2 / z)}px rgba(0,0,0,.09)`;
  buildMobile(T, S, S.M.f.q);
  buildSlides(T, S, z);
  // depth of field: photos blur in extreme close-ups (assets are 1x)
  const dof = Math.min(7, Math.max(0, (z - 1.55) * 4));
  const blurIds = ['hero-bottles', 'produk-swoosh', 'card-1-img', 'card-2-img', 'card-3-img', 'card-4-img', 'dist-map', 'ig-post-1', 'ig-post-2', 'ig-post-3', 'ig-post-4', 'cta-photo'];
  if (dof > .05) for (const id of blurIds) { V.st(qB(id), { filter: `blur(${f2(dof)}px)` }); if (z > 2.2) V.st(S.M.f.q(id), { filter: `blur(${f2(dof)}px)` }); }

  // no readable lorem: the placeholder addresses fall out of focus whenever the camera is closer than medium
  const lb = Math.min(5, Math.max(0, (z - 1.15) * 8));
  if (lb > .05) for (const id of ['dist-loc1-addr', 'dist-loc2-addr']) { V.st(qB(id), { filter: `blur(${f2(lb)}px)` }); V.st(S.M.f.q(id), { filter: `blur(${f2(lb)}px)` }); }
  const U = S.ui; U.begin();
  canvasUI(T, S, qB, P, U);
  U.end();
  // cursor (one)
  let vis = 0; for (const [a, b] of CUR_VIS) vis = Math.max(vis, R(T, a, a + .1) * (1 - R(T, b - .12, b)));
  let k = 1; while (k < CUR.length - 1 && T > CUR[k][0]) k++;
  let cp, kind;
  if (T <= CUR[0][0]) { cp = P.pt(CUR[0][1], CUR[0][2]); kind = CUR[0][3]; }
  else { const a = CUR[k - 1], b = CUR[k], uu = SG(T, a[0], b[0]), u = E.hand(uu), A = P.pt(a[1], a[2]), B = P.pt(b[1], b[2]); cp = { x: lerp(A.x, B.x, u), y: lerp(A.y, B.y, u) }; kind = uu < .5 ? a[3] : b[3]; }
  let press = 0; for (const [a, b] of PRESS) press = Math.max(press, b - a > .1 ? (T > a && T < b ? 1 : 0) : K.pulse(T, a, b + .05, .02, .04));
  S.cur.set(vis > .01 ? { x: cp.x, y: cp.y, kind, press, a: vis } : null);
  const alt = (T > 4.55 && T < 5.07) || (T > 5.35 && T < 5.87);
  S.alt.style.display = alt && vis > .01 ? 'block' : 'none'; S.alt.style.transform = `translate(${f2(cp.x + 26)}px,${f2(cp.y + 34)}px)`;
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
P5.TOP = TOP;
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
P5.rv = rv;
function drawRect(el, T, t0, t1, w, h) { if (T < t0) return 0; const u = E.hand(SG(T, t0, t1));
  V.st(el, { opacity: '1', width: f2(Math.max(1, w * u)) + 'px', height: f2(Math.max(1, h * Math.min(1, u * 1.12))) + 'px' }); return u; }
function stroke(svgEl, T, t0, t1) { if (!svgEl || T < t0) return; const u = R(T, t0, t1, 'inOutCubic');
  V.st(svgEl, { opacity: '1' }); for (const c of svgEl.querySelectorAll('circle')) V.st(c, { strokeDasharray: '1000 1000', strokeDashoffset: f2(1000 * (1 - u)) }); }

function buildBeranda(T, S, q) {
  for (const id of TOP) V.st(q(id), { opacity: '0' });
  V.st(q('hero-bg'), { opacity: '1' }); V.st(q('hero-bottles'), { opacity: '1' });
  stroke(q('hero-ring'), T, .25, .7);
  if (T > .9) { const hd = SG(T, .95, 1.3), he = E.hand(hd), dy = -90 * (1 - he) + 6 * Math.sin(Math.PI * SG(hd, .72, 1));
    for (const id of ['header', 'header-logo', 'nav']) V.st(q(id), { opacity: f2(R(T, .9, .97)), transform: `translateY(${f2(dy)}px)` }); S._hdy = dy; }
  if (T > 1.75) { const h = q('hero-title'); V.st(h, { opacity: '1' });
    if (T < 2.55) V.st(h, { fontFamily: 'Poppins', fontWeight: '500', color: '#1E1E1E' });
    else { const u = R(T, 2.55, 2.68, 'outCubic'); V.st(h, { color: T < 2.7 ? '#1E1E1E' : K.mix('#1E1E1E', '#EE225B', R(T, 2.7, 2.8)), transform: `scale(${f2(1 + .035 * Math.sin(Math.PI * u))})`, transformOrigin: '0 50%' }); }
    V.typeEl(h, S.tyH.at(T - 1.8), T < 2.5 && V.blink(T, 2.4)); }
  rv(q('hero-eyebrow'), T, 3.05, 'rise', { dy: 14 }); rv(q('hero-lead'), T, 3.13, 'rise', { dy: 14 });
  S._cu = drawRect(q('hero-cta'), T, 3.32, 3.58, 302, 40);
  if (T > 3.32) V.st(q('hero-cta'), { background: T < 3.88 ? '#E3E3E3' : K.mix('#E3E3E3', '#FF3548', R(T, 3.88, 3.98)) });
  for (const id of ['hero-cta-label', 'hero-cta-arrow']) V.st(q(id), { opacity: '0' });
  if (T > 3.95) { const a = R(T, 3.95, 4.1, 'outCubic'); V.st(q('hero-cta-label'), { opacity: f2(a) }); V.st(q('hero-cta-arrow'), { opacity: f2(a), transform: `scale(${f2(.6 + .4 * a)})`, transformOrigin: '50% 50%' }); }
  for (let i = 1; i <= 3; i++) rv(q('hero-dot-' + i), T, 4.15 + i * .05, 'pop', { d: .25 });
  // produk
  rv(q('produk-swoosh'), T, 9.45, 'place', { d: .4 });
  rv(q('produk-heading'), T, 9.55, 'drop', { dy: 18 }); rv(q('produk-cta'), T, 9.65, 'pop');
  const g = E.inOutCubic(SG(T, 10.57, 10.8)); S._gap = g;
  for (let i = 1; i <= 4; i++) { const t0 = 9.75 + (i - 1) * .15, tx = `translateX(${f2(-(i - 1) * GAP0 * (1 - g))}px)`;
    for (const [p, dt] of [['img', 0], ['bar', .03], ['name', .06], ['arrow', .08]]) rv(q(`card-${i}-${p}`), T, t0 + dt, 'slide', { dx: 70, tx });
    if (i === 1 && T > 11.25) { V.st(q('card-1-info'), { opacity: f2(R(T, 11.25, 11.43)), transform: tx });
      [...q('card-1-info').children].forEach((e, j) => { if (!j) return; const a = R(T, 11.29 + j * .012, 11.49 + j * .012, 'outCubic'); V.st(e, { opacity: f2(a), transform: `translateY(${f2((1 - a) * 8)}px)` }); }); } }
  rv(q('produk-prev'), T, 10.95, 'pop', { d: .25 }); rv(q('produk-next'), T, 11.0, 'pop', { d: .25 });
  // distributor
  rv(q('dist-heading'), T, 12.0, 'drop', { dy: 18 });
  S._db = drawRect(q('dist-box'), T, 12.1, 12.4, 1122, 478);
  rv(q('dist-bar'), T, 12.43, 'fade', { d: .15 });
  ['dist-city-label', 'dist-city-box', 'dist-city-value', 'dist-city-chev', 'dist-result-label', 'dist-result-box', 'dist-result-value', 'dist-result-chev'].forEach((id, j) => rv(q(id), T, 12.47 + j * .03, 'rise', { dy: 10, d: .25 }));
  rv(q('dist-search-btn'), T, 12.73, 'pop', { d: .25 });
  S._dm = T > 12.9 ? E.hand(SG(T, 12.9, 13.15)) : 0;
  rv(q('dist-map'), T, 13.17, 'place', { d: .3 });
  ['dist-map-zoom', 'dist-map-fullscreen', 'dist-map-locate', 'dist-scrollbar'].forEach((id, j) => rv(q(id), T, 13.33 + j * .05, 'pop', { d: .22 }));
  ['dist-loc1-title', 'dist-loc1-addr', 'dist-loc1-tel', 'dist-loc1-km', 'dist-loc1-dir', 'dist-line', 'dist-loc2-title', 'dist-loc2-clip'].forEach((id, j) => rv(q(id), T, 13.65 + j * .04, 'rise', { dy: 12, d: .25 }));
  // marquee: bar drawn, fill typed, then the text is typed (push-in lands mid-word)
  S._mq = drawRect(q('marquee-bg'), T, 14.9, 15.15, 1200, 100);
  if (T > 14.9) V.st(q('marquee-bg'), { background: T < 15.48 ? '#E3E3E3' : K.mix('#E3E3E3', '#EE225B', R(T, 15.48, 15.58)) });
  if (T > 15.58) {
    const tr = q('marquee-track'), sp = T < 16.42 ? 0 : 0.5 * 140 * Math.pow(Math.min(T - 16.42, .8), 2) / .8 + 140 * Math.max(0, T - 17.22);
    V.st(tr, { opacity: '1', transform: `translateX(${f2(-(sp % 532))}px)` });
    for (const id of ['marquee-text-1', 'marquee-text-3', 'marquee-icon-1', 'marquee-icon-2', 'marquee-icon-3']) V.st(q(id), { opacity: '0' });
    V.typeEl(q('marquee-text-2'), S.tyMq.at(T - 15.6), T < 16.42 && V.blink(T, 16.25));
    rv(q('marquee-icon-2'), T, 16.3, 'pop', { d: .22 });
    for (const [id, t0] of [['marquee-icon-1', 16.42], ['marquee-text-1', 16.42], ['marquee-text-3', 16.47], ['marquee-icon-3', 16.47]]) rv(q(id), T, t0, 'fade', { d: .15 });
  }
  // instagram
  rv(q('ig-bg'), T, 16.95, 'fade', { d: .25 });
  stroke(q('ig-ring-right'), T, 17.0, 17.4); stroke(q('ig-ring-left'), T, 17.05, 17.4);
  rv(q('ig-heading'), T, 17.05, 'drop', { dy: 18 });
  for (let i = 1; i <= 4; i++) rv(q('ig-post-' + i), T, 17.2 + (i - 1) * .15, 'place', { d: .32 });
  rv(q('ig-cta'), T, 17.85, 'pop', { d: .28 });
  // cta
  rv(q('cta-photo'), T, 20.1, 'place', { d: .3 });
  if (T > 20.3) { const u = R(T, 20.3, 20.6, 'inOutCubic'); V.st(q('cta-gradient'), { opacity: '1', clipPath: `inset(0 ${f2((1 - u) * 100)}% 0 0 round 16px)` }); }
  rv(q('cta-heading'), T, 20.52, 'rise', { dy: 16 }); rv(q('cta-text'), T, 20.6, 'rise', { dy: 16 }); rv(q('cta-button'), T, 20.65, 'pop', { d: .3 });
  // footer
  rv(q('footer-bg'), T, 20.9, 'fade', { d: .2 }); rv(q('footer-waves'), T, 20.96, 'fade', { d: .3 });
  ['footer-logo', 'footer-partof', 'footer-bebest', 'footer-badges'].forEach((id, j) => rv(q(id), T, 21.05 + j * .05, 'rise', { dy: 14, d: .25 }));
  ['footer-ragam-h', ...Array.from({ length: 12 }, (_, i) => 'footer-ragam-' + (i + 1)), 'footer-kontak-h', 'footer-addr', 'footer-email', 'footer-tel'].forEach((id, j) => rv(q(id), T, 21.15 + j * .02, 'rise', { dy: 12, d: .22 }));
  ['footer-line', 'footer-copy', 'footer-social'].forEach((id, j) => rv(q(id), T, 21.55 + j * .04, 'fade', { d: .2 }));
}

/* ---------------- Beranda – Mobile build ---------------- */
function buildMobile(T, S, q) {
  if (T < 6.85) return;
  for (const id of [...TOP, 'm-menu']) V.st(q(id), { opacity: '0' });
  // hero
  rv(q('hero-bg'), T, 6.95, 'fade', { d: .15 }); rv(q('hero-bottles'), T, 7.01, 'place', { d: .35 });
  V.st(q('hero-ring'), { opacity: T > 7.01 ? f2(R(T, 7.01, 7.31)) : '0' });
  for (const id of ['header', 'header-logo', 'm-menu']) rv(q(id), T, 7.05, 'drop', { dy: 50, d: .3 });
  rv(q('hero-eyebrow'), T, 7.13, 'rise', { dy: 10 }); rv(q('hero-title'), T, 7.19, 'rise', { dy: 10 }); rv(q('hero-lead'), T, 7.27, 'rise', { dy: 10 });
  rv(q('hero-cta'), T, 7.33, 'pop', { d: .28 });
  for (let i = 1; i <= 3; i++) rv(q('hero-dot-' + i), T, 7.38 + i * .04, 'pop', { d: .22 });
  // produk (cards follow the desktop auto-layout: gap 16, carousel)
  rv(q('produk-swoosh'), T, 18.4, 'place', { d: .3 }); rv(q('produk-heading'), T, 18.42, 'drop', { dy: 14 }); rv(q('produk-cta'), T, 18.46, 'pop');
  for (let i = 1; i <= 4; i++) for (const [p, dt] of [['img', 0], ['bar', .03], ['name', .05], ['arrow', .07]]) rv(q(`card-${i}-${p}`), T, 18.44 + (i - 1) * .07 + dt, 'slide', { dx: 60 });
  rv(q('card-1-info'), T, 18.66, 'fade', { d: .2 });
  // distributor, built while the camera pans down (no empty section in the frame)
  TOP.filter(id => /^dist-/.test(id)).forEach((id, j) => rv(q(id), T, 18.76 + j * .011, 'rise', { dy: 14, d: .22 }));
  // marquee + instagram
  if (T > 18.9) { V.st(q('marquee-bg'), { opacity: f2(R(T, 18.9, 19.05)) }); V.st(q('marquee-track'), { opacity: f2(R(T, 18.95, 19.1)), transform: `translateX(${f2(-((T - 18.95) * 140 % 532))}px)` }); }
  rv(q('ig-bg'), T, 18.95, 'fade', { d: .2 }); V.st(q('ig-ring-right'), { opacity: T > 19.0 ? f2(R(T, 19.0, 19.3)) : '0' }); V.st(q('ig-ring-left'), { opacity: T > 19.0 ? f2(R(T, 19.0, 19.3)) : '0' });
  rv(q('ig-heading'), T, 19.0, 'drop', { dy: 14 });
  [19.08, 19.2, 19.32, 19.44].forEach((t0, i) => rv(q('ig-post-' + (i + 1)), T, t0, 'place', { d: .3 }));
  rv(q('ig-cta'), T, 19.58, 'pop');
  // cta + footer finish during the final pull-back (the frame grows with them)
  TOP.filter(id => /^(cta-|footer-)/.test(id)).forEach((id, j) => rv(q(id), T, 21.7 + j * .009, 'rise', { dy: 14, d: .25 }));
}

/* ---------------- hero slides: Alt-drag duplicates upward ---------------- */
function buildSlides(T, S, z) {
  const dragPos = (t0, t1) => { const u = SG(T, t0, t1); return E.hand(u) + .012 * Math.sin(Math.PI * SG(u, .8, 1)); };
  const lab = (F, a) => { F.lb.style.fontSize = f2(21 / z) + 'px'; F.lb.style.top = f2(-31 / z) + 'px'; F.lb.style.opacity = f2(a); };
  const ua = dragPos(4.62, 5.02), aA = T > 4.6 && T < 5.15 ? 1 - R(T, 5.02, 5.14) : 0;
  S.dA.el.style.display = aA > .005 ? '' : 'none'; S.dA.el.style.opacity = f2(aA); S.dA.el.style.top = f2(SY2 * ua) + 'px';
  S.dA.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 4.97, 5.03)))}px 40px rgba(0,0,0,.12)`; S._sa = SY2 * ua;
  V.st(S.dA.f.q('hero-ring'), { opacity: '1' });
  const s2on = T > 5.02; S.s2.el.style.display = s2on ? '' : 'none'; const q2 = S.s2.f.q;
  if (s2on) { for (const id of ['slide2-photo', 'slide2-title', 'slide2-lead', 'slide2-cta']) V.st(q2(id), { opacity: '0' });
    rv(q2('slide2-photo'), T, 5.06, 'place', { d: .3 });
    if (T > 5.1) { V.st(q2('slide2-title'), { opacity: '1' }); V.typeEl(q2('slide2-title'), S.tyS2.at(T - 5.1), T < 5.5 && V.blink(T, 5.4)); }
    rv(q2('slide2-lead'), T, 5.36, 'rise', { dy: 10, d: .2 }); rv(q2('slide2-cta'), T, 5.4, 'pop', { d: .22 }); }
  lab(S.s2, R(T, 5.02, 5.15));
  const ub = dragPos(5.42, 5.82), aB = T > 5.4 && T < 5.94 ? 1 - R(T, 5.82, 5.94) : 0;
  S.dB.el.style.display = aB > .005 ? '' : 'none'; S.dB.el.style.opacity = f2(aB); S.dB.el.style.top = f2(SY2 + (SY3 - SY2) * ub) + 'px'; S._sb = SY2 + (SY3 - SY2) * ub;
  S.dB.box.style.boxShadow = `0 ${f2(10 * (1 - R(T, 5.77, 5.83)))}px 40px rgba(0,0,0,.12)`;
  const s3on = T > 5.82; S.s3.el.style.display = s3on ? '' : 'none'; const q3 = S.s3.f.q;
  if (s3on) { for (const id of ['slide3-photo', 'slide3-title', 'slide3-lead', 'slide3-cta']) V.st(q3(id), { opacity: '0' });
    rv(q3('slide3-photo'), T, 5.86, 'place', { d: .3 });
    if (T > 5.86) { V.st(q3('slide3-title'), { opacity: '1' }); V.typeEl(q3('slide3-title'), S.tyS3.at(T - 5.86), T < 6.2 && V.blink(T, 6.14)); }
    rv(q3('slide3-lead'), T, 6.06, 'rise', { dy: 10, d: .2 }); rv(q3('slide3-cta'), T, 6.1, 'pop', { d: .22 }); }
  lab(S.s3, R(T, 5.82, 5.95));
}

/* ---------------- on-canvas cues only ---------------- */
function canvasUI(T, S, q, P, U) {
  const box = (x, y, w, h, o = {}) => U.box(P.rect(x, y, w, h), o);
  const ib = id => { const b = q(id).getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  S.chipF.el.style.display = 'none';
  const chip = (t0, t1, ax, ay, from, to, ty, tt, tSw) => { if (T <= t0 || T >= t1) return; const p = P.pt(ax, ay); const hx = T < tt ? from : (ty.at(T - tt).s || '');
    S.chipF.el.style.display = 'flex'; S.chipF.el.style.opacity = f2(R(T, t0, t0 + .08) * (1 - R(T, t1 - .12, t1)));
    S.chipF.el.style.transform = `translate(${f2(p.x)}px,${f2(p.y + 26)}px)`; S.chipF.sw.style.background = T < tSw ? '#' + from : '#' + to;
    S.chipF.hx.innerHTML = 'Fill  #' + hx + (T > tt - .04 && T < t1 - .1 && V.blink(T, tt + ty.end) ? '<span style="display:inline-block;width:2px;height:22px;background:#0D99FF;vertical-align:-4px;margin-left:1px"></span>' : ''); };
  // ring drawn from the frame corner
  if (T > .22 && T < .9) { const u = E.hand(SG(T, .25, .7)); box(-505, -357, 797 * u, 797 * u, { handles: u >= 1, size: `${Math.round(797 * u)} × ${Math.round(797 * u)}`, a: 1 - R(T, .75, .9) }); }
  if (T > .9 && T < 1.7) { const dy = S._hdy || 0, a = 1 - R(T, 1.5, 1.7);
    box(40, 40 + dy, 1120, 72, { handles: true, a });
    const ga = R(T, 1.15, 1.23) * a;
    U.gap(P.pt(1000, 0), P.pt(1000, 40 + dy), String(Math.max(0, Math.round(40 + dy))), { a: ga, dx: 46 });
    U.gap(P.pt(1160, 96 + dy), P.pt(1200, 96 + dy), '40', { a: ga, dy: 36 });
    U.line(P.pt(1160, -200), P.pt(1160, 400), { a: ga * .8, dash: true }); }
  // title: typed in the default font, then set to the brand heading font + colour
  if (T > 1.75 && T < 3.3) { const r = ib('hero-title'); const sel = P.rect(40, 247, Math.max(4, r.w), 88);
    const a = 1 - R(T, 3.15, 3.3);
    U.box(sel, { handles: T > 2.4, a, label: T > 2.42 ? (T < 2.55 ? 'Poppins Medium · 72' : 'Montserrat Bold · 72') : null, labelCol: VW.BLUE,
      size: T > 2.95 ? `${Math.round(r.w)} × 88` : null }); }
  chip(2.6, 2.98, 40, 335, '1E1E1E', 'EE225B', S.tyHexT, 2.63, 2.72);
  // CTA drawn + fill typed
  if (T > 3.32 && T < 4.35) { const u = S._cu || 0, cw = 302 * u, ch = 40 * Math.min(1, u * 1.12);
    box(40, 458, Math.max(1, cw), Math.max(1, ch), { handles: u >= 1, size: T < 3.62 ? `${Math.round(cw)} × ${Math.round(ch)}` : null, a: 1 - R(T, 4.15, 4.35) }); }
  chip(3.62, 4.12, 40, 498, 'E3E3E3', 'FF3548', S.tyHex2, 3.68, 3.88);
  // slides (Alt-drag up, 120 gap guides)
  if (T > 4.45 && T < 6.25) { const s3 = T > 5.3, dy = s3 ? (S._sb || SY2) : (S._sa || 0);
    box(0, dy, 1200, 627, { handles: true, size: '1200 × 627', a: R(T, 4.45, 4.55) * (1 - R(T, 6.05, 6.25)) });
    const g1 = R(T, 4.95, 5.0) * (1 - R(T, 5.18, 5.26)), g2 = R(T, 5.75, 5.81) * (1 - R(T, 6.0, 6.1));
    U.line(P.pt(0, -60 + SY2), P.pt(0, 690), { a: g1, dash: true }); U.gap(P.pt(600, SY2 + 627), P.pt(600, 0), '120', { a: g1, dx: 46 });
    U.line(P.pt(0, SY3 - 60), P.pt(0, -60), { a: g2, dash: true }); U.gap(P.pt(600, SY3 + 627), P.pt(600, SY2), '120', { a: g2, dx: 46 }); }
  // mobile frame drawn, header snap, desktop/mobile compare
  if (T > 6.87 && T < 7.75) { const u = E.hand(SG(T, 6.87, 7.2)), w = 390 * u, h = 720 * Math.min(1, u * 1.12);
    box(MX, 0, Math.max(1, w), Math.max(1, h), { handles: u >= 1, size: `${Math.round(w)} × ${Math.round(h)}`, a: 1 - R(T, 7.6, 7.75) }); }
  if (T > 7.8 && T < 8.5) { const a = R(T, 7.82, 7.92) * (1 - R(T, 8.3, 8.45));
    U.gap(P.pt(MX, 140), P.pt(MX + 20, 140), '20', { a, dy: -30 }); U.line(P.pt(MX + 20, 90), P.pt(MX + 20, 300), { a: a * .8, dash: true }); }
  if (T > 8.5 && T < 9.05) { const a = R(T, 8.5, 8.6) * (1 - R(T, 8.9, 9.05)); box(0, 0, 1200, 627, { a, size: 'Desktop 1200' }); box(MX, 0, 390, 720, { a, size: 'Mobile 390' }); }
  // produk auto-layout gap handle
  if (T > 9.7 && T < 11.15) { const n = Math.max(1, Math.min(4, 1 + Math.floor((T - 9.75) / .15))), gv = GAP0 * (S._gap || 0), w = 248.75 * n + gv * (n - 1);
    box(72, 888, w, 305, { handles: true, size: `${Math.round(w)} × 305`, a: 1 - R(T, 11.0, 11.15) });
    const ta = R(T, 10.45, 10.55) * (1 - R(T, 10.9, 11.05));
    for (let i = 1; i < 4; i++) { const x0 = 72 + i * 248.75 + (i - 1) * gv; U.gapTint(P.rect(x0, 888, Math.max(.6, gv), 305), { a: ta });
      U.line(P.pt(x0 + gv / 2, 1015), P.pt(x0 + gv / 2, 1065), { a: ta, col: '#F248BA', sw: 4 }); }
    U.pill(String(Math.round(gv)), P.pt(72 + 248.75 + gv / 2, 1100).x, P.pt(0, 1100).y, { a: ta, col: '#F248BA', fs: 22 }); }
  if (T > 11.2 && T < 11.75) box(72, 888, 248.75, 248.75, { a: R(T, 11.2, 11.25) * (1 - R(T, 11.6, 11.75)), handles: true, size: '249 × 249' });
  // distributor
  if (T > 12.1 && T < 12.8) { const u = S._db || 0; box(39, 1444, 1122 * u, 478 * Math.min(1, u * 1.12), { handles: u >= 1, size: `${Math.round(1122 * u)} × ${Math.round(478 * Math.min(1, u * 1.12))}`, a: 1 - R(T, 12.65, 12.8) }); }
  if (T > 12.9 && T < 13.5) { const u = S._dm || 0, w = 659 * u, h = 311 * Math.min(1, u * 1.12);
    if (T < 13.3) U.box(P.rect(468, 1578, Math.max(1, w), Math.max(1, h)), { fill: `rgba(227,227,227,${f2(1 - R(T, 13.17, 13.3))})`, sw: .01 });
    box(468, 1578, Math.max(1, w), Math.max(1, h), { handles: u >= 1, size: `${Math.round(w)} × ${Math.round(h)}`, a: 1 - R(T, 13.4, 13.5) }); }
  { const pu = SG(T, 13.57, 14.0); if (pu > 0 && pu < 1) { const cc = P.pt(758, 1716), r = (10 + 50 * E.outCubic(pu)) * P5._c.z; U.box({ x: cc.x - r, y: cc.y - r, w: 2 * r, h: 2 * r }, { a: 1 - pu, col: '#EE225B', sw: 3 }); } }
  // marquee
  if (T > 14.9 && T < 15.62) { const u = S._mq || 0; box(0, 2082, 1200 * u, 100 * Math.min(1, u * 1.12), { handles: u >= 1, size: T < 15.22 ? `${Math.round(1200 * u)} × ${Math.round(100 * Math.min(1, u * 1.12))}` : null, a: 1 - R(T, 15.5, 15.62) }); }
  chip(15.22, 15.62, 600, 2182, 'E3E3E3', 'EE225B', S.tyHexM, 15.28, 15.48);
  if (T > 15.6 && T < 16.5) { const r = ib('marquee-text-2'); box(r.x, 2116, Math.max(4, r.w), 32, { handles: T > 16.25, a: R(T, 15.6, 15.66) * (1 - R(T, 16.38, 16.5)) }); }
  // instagram posts
  if (T > 17.2 && T < 17.9) { const n = Math.min(4, 1 + Math.floor((T - 17.2) / .15)); box(40 + (n - 1) * 288, 2363, 255, 318.75, { handles: true, size: '255 × 319', a: 1 - R(T, 17.75, 17.9) }); }
  // mobile produk / instagram (frame-level selections)
  if (T > 18.6 && T < 18.95) box(MX + 20, 896, 370, 305, { handles: true, size: 'Gap 16', a: R(T, 18.62, 18.7) * (1 - R(T, 18.85, 18.95)) });
  if (T > 19.06 && T < 19.7) { const n = Math.max(1, Math.min(4, 1 + Math.floor((T - 19.08) / .12))), xs = [20, 201, 20, 201], ys = [2276, 2276, 2499, 2499];
    box(MX + xs[n - 1], ys[n - 1], 169, 211.3, { handles: true, size: '169 × 211', a: 1 - R(T, 19.55, 19.7) }); }
  // cta + footer
  if (T > 20.15 && T < 20.85) box(40, 2861, 1120, 195, { handles: true, size: '1120 × 195', a: R(T, 20.15, 20.25) * (1 - R(T, 20.7, 20.85)) });
  if (T > 20.9 && T < 21.7) box(0, 2985, 1200, 484, { handles: true, size: '1200 × 484', a: R(T, 20.9, 21.0) * (1 - R(T, 21.55, 21.7)) });
  if (T > 22.2) { const a = R(T, 22.2, 22.4); box(0, 0, 1200, 3469, { handles: true, size: '1200 × 3469', a }); box(MX, 0, 390, 3930, { handles: true, size: '390 × 3930', a }); }
}

P5.slice = function (T0, T1) {
  V.scene({ duration: T1, offset: T0, speed: SPEED, persp: 2400,
    setup(V) { return P5.setup(V, T0, T1); },
    frame(t, S) { P5.frame(t, S); } });
};
})();
