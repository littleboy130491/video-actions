/* engine/bygy_canvas.js — the shared light Figma canvas of the BYGY video (brief + Beranda + hero slides + pages).
 * Page space = Beranda ("main", design/final.html) coordinates. Loaded after kit.js. */
(function () {
'use strict';
const BY = window.BY = {};
BY.PINK = '#F77CA0';          // brief swatch
BY.GAP = 100;
BY.HERO = { x: 0, y: 0, w: 1200, h: 627 };
BY.BRIEF = { x: -1300, y: 0, w: 1200, h: 1367 };
BY.SL = [null, { x: 0, y: 0 }, { x: 1300, y: 0 }, { x: 2600, y: 0 }];   // slide N frame positions after the alt-drags
// supporting pages (site map, Act 3); filled from assets/pages/*.png when present
BY.PAGES = [
  { id: 'pg-tentang', file: 'tentang.png', name: 'Tentang', nav: 'nav-tentang' },
  { id: 'pg-archive', file: 'produk-archive.png', name: 'Produk - Archive', nav: 'nav-produk' },
  { id: 'pg-single', file: 'produk-single.png', name: 'Produk - Single', from: 'card-1-arrow' },
  { id: 'pg-katalog', file: 'katalog-produk.png', name: 'Katalog Produk', nav: 'nav-katalog' },
  { id: 'pg-artikel', file: 'artikel-archive.png', name: 'Artikel - Archive', from: 'ig-cta' },
  { id: 'pg-karier', file: 'karier-archive.png', name: 'Karier - Archive', from: 'footer-ragam-h' },
  { id: 'pg-kontak', file: 'kontak.png', name: 'Kontak', nav: 'nav-kontak' },
];

const exists = async u => { try { const r = await fetch(u, { method: 'HEAD', cache: 'no-store' }); return r.ok; } catch (e) { return false; } };

/** load the canvas frames into stage S. o: {brief, slides, copies, pages} (booleans) */
BY.setup = async function (S, o = {}) {
  const main = S.F('main'); main.name = 'Beranda';
  if (o.brief !== false) await S.addFrame({ id: 'brief', src: '../design/brief.html', x: BY.BRIEF.x, y: BY.BRIEF.y, name: 'Guidelines - Home Opsi 1' });
  if (o.slides !== false) {
    for (const n of [2, 3]) await S.addFrame({ id: 'sl' + n, src: `../design/slide${n}.html`, x: BY.SL[n].x, y: BY.SL[n].y, name: 'Hero', card: !!o.slideCards });
  }
  if (o.copies) {   // alt-drag duplicates of the Beranda hero (a clipped second/third copy of final.html)
    for (const n of [2, 3]) await S.addFrame({ id: 'cp' + n, src: '../design/final.html', x: BY.SL[n].x, y: 0, w: 1200, h: BY.HERO.h, name: 'Hero' });
  }
  if (o.pages) {
    const L = BY.pageLayout();
    for (const p of BY.PAGES) {
      const src = '../assets/pages/' + p.file;
      if (!(await exists(src)) || !L[p.id]) continue;
      if (o.pages !== true && !o.pages.includes(p.id)) continue;
      const q = L[p.id];
      await S.addFrame({ id: p.id, img: src, x: q.x, y: q.y, w: 1200, name: p.name });
    }
  }
  return S;
};
/** site-map layout of the supporting pages (page space, 1200-wide 1x images): four columns, brief | Beranda | slides */
BY.pageLayout = function () {
  return {
    'pg-tentang': { x: 1300, y: 887 }, 'pg-archive': { x: 2600, y: 887 }, 'pg-kontak': { x: -1300, y: 1627 },
    'pg-artikel': { x: 0, y: 3729 }, 'pg-katalog': { x: 1300, y: 4122 }, 'pg-single': { x: 2600, y: 3715 },
  };
};
BY.SITE = { x: 1250, y: 3422, zoom: 0.198 };   // wide shot framing the whole site map (x -1300..3800, y 0..6844)
BY.pageH = {};   // filled by scenes that know the image heights (BY.measurePages)
BY.measurePages = async function () {
  for (const p of BY.PAGES) {
    const src = '../assets/pages/' + p.file;
    if (!(await exists(src))) continue;
    const im = new Image(); im.src = src; await im.decode().catch(() => 0);
    if (im.naturalWidth) BY.pageH[p.id] = 1200 * im.naturalHeight / im.naturalWidth;
  }
};

/* ---------------- screen-space UI helpers ---------------- */
/** colour / font chip that follows the cursor (eyedropper, picked style) */
BY.chip = function (S, sx, sy, o) {
  const a = o.alpha ?? 1; if (a <= .01) return;
  const sc = o.scale ?? 1;
  const inner = o.font ? `<span class="aa">Aa</span>${o.font}` : `<span class="sw" style="background:${o.color}"></span>${o.color.replace('#', '').toUpperCase()}`;
  S.html(`<div class="k-chip" style="left:${(sx + 26).toFixed(1)}px;top:${(sy + 30).toFixed(1)}px;opacity:${a.toFixed(3)};transform:scale(${sc.toFixed(3)})">${inner}</div>`);
};
/** Figma prototype connection ("noodle"): blue curve from a page point to a page point, drawn to fraction u */
BY.noodle = function (S, A, B, u, o = {}) {
  const al = o.alpha ?? 1; if (al <= .01 || u <= 0) return;
  const p = S.P(A.x, A.y), q = S.P(B.x, B.y);
  const dx = q.x - p.x, k = Math.max(40, Math.abs(dx) * .5) * (o.bend ?? 1);
  const sgn = o.dir || (dx >= 0 ? 1 : -1);
  const c1 = { x: p.x + k * sgn, y: p.y }, c2 = { x: q.x - k * (o.dirEnd || sgn), y: q.y };
  const col = o.color || '#0D99FF';
  const d = `M${p.x.toFixed(1)} ${p.y.toFixed(1)}C${c1.x.toFixed(1)} ${c1.y.toFixed(1)} ${c2.x.toFixed(1)} ${c2.y.toFixed(1)} ${q.x.toFixed(1)} ${q.y.toFixed(1)}`;
  const uu = K.clamp(u);
  S.svgParts.push(`<path d="${d}" pathLength="1" fill="none" stroke="${col}" stroke-width="${o.w || 2.5}" stroke-dasharray="${uu.toFixed(4)} 2" opacity="${al}"/>`);
  S.svgParts.push(`<circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${o.r || 6}" fill="${col}" stroke="#fff" stroke-width="2" opacity="${al}"/>`);
  if (uu > .96) {
    const dir = o.dirEnd || sgn, s = 11;
    S.svgParts.push(`<path d="M${q.x.toFixed(1)} ${q.y.toFixed(1)}l${(-s * dir).toFixed(1)} ${-s * .6}v${s * 1.2}z" fill="${col}" opacity="${al * K.seg(uu, .96, 1)}"/>`);
  }
  return { p, q };
};
/** hotspot outline (prototype link source) */
BY.hotspot = function (S, r, a) { if (a > .01) S.sel(r, { color: '#0D99FF', width: 2, alpha: a, hover: true }); };
/** equal-spacing pill (Figma's pink/red gap indicator) between two page x positions at page y */
BY.gap = function (S, x0, x1, y, a, label) {
  if (a <= .01) return;
  S.rectFill({ x: x0, y: y - 60, w: x1 - x0, h: 120 }, '#F24E1E', { alpha: .14 * a });
  S.measure({ x: x0, y }, { x: x1, y }, label ?? Math.round(x1 - x0), { alpha: a, pillAt: 'on' });
};
/** Figma toolbar "Present" (play) button, top right of the screen */
BY.presentBtn = function (S, a, hover, press) {
  if (a <= .01) return null;
  const x = S.vw - 64 - 96, y = 112;
  const bg = hover ? '#0C8CE9' : '#0D99FF';
  S.html(`<div class="k-tool" style="left:${x}px;top:${y}px;opacity:${a.toFixed(3)};transform:scale(${(1 - .05 * (press || 0)).toFixed(3)});transform-origin:50% 50%">
    <div style="width:44px;height:36px;border-radius:7px;display:flex;align-items:center;justify-content:center;background:${hover ? '#F0F0F0' : 'transparent'}"><svg width="18" height="18" viewBox="0 0 18 18"><path d="M5 3.2v11.6L14.6 9z" fill="#1e1e1e"/></svg></div>
    <div style="height:36px;padding:0 14px;border-radius:7px;background:${bg};color:#fff;font:600 18px/36px Inter">Share</div></div>`);
  return { sx: x + 8 + 22, sy: y + 26 };
};
})();
