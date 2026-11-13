/* engine/v2_k01.js — shared workspace layout for K0 / K1 / K2: Hero frame (= laptop screen at its flat pose, body
   hidden), the unbuilt Beranda below, the brief frame ("Guidelines") above. Brief point (bx,by) = content (bx, by+BRIEF_V). */
(function () {
const K1W = window.KW = {};
KW.FLAT = { x: 0, y: 250, z: 0, rx: -12, ry: 0, tilt: 12 };
KW.BRIEF_V = -1367 - 160;
KW.build = function (S, o = {}) {
  S.cv = VW.canvas();
  S.L = V.laptop(V.world, { W: 1000 });
  S.f = V.page(S.L.ct, '../design/final.html');
  S.rest = VW.berandaRest(S.L, KW.FLAT);
  S.brief = VW.frame(S.L, KW.FLAT, '../design/brief.html', 0, KW.BRIEF_V, 1200, 1367, 'Guidelines - Home Opsi 1');
  S.L.set(KW.FLAT); S.L.body(0, 750 - 627);
  S.L.label.style.display = 'block'; S.L.label.textContent = 'Hero';
  return S;
};
KW.wsAlpha = function (S, a) { S.cv.set(a); S.rest.style.opacity = a; S.brief.el.style.opacity = a; S.L.root.style.opacity = a; S.L.label.style.opacity = a; };
/** workspace camera from content coords {u,v,z} */
KW.cam = (S, w, sx) => { const p = S.L.pt(w.u, w.v, KW.FLAT); return VW.cam(p.x, p.y, w.z, sx ?? VW.AREA_CX); };
KW.labelScale = function (S, z) { const k = Math.max(.35, z); S.L.label.style.fontSize = (22 / k) + 'px'; S.L.label.style.top = (S.L.b - 30 / k) + 'px';
  S.brief.lb.style.fontSize = (22 / k / S.L.s) + 'px'; S.brief.lb.style.top = (-34 / k / S.L.s) + 'px'; };
KW.heroEmpty = function (S) { const q = S.f.q;
  for (const id of ['header', 'header-logo', 'nav', 'hero-eyebrow', 'hero-title', 'hero-lead', 'hero-bottles', 'hero-ring', 'hero-dot-1', 'hero-dot-2', 'hero-dot-3', 'hero-cta', 'hero-cta-label', 'hero-cta-arrow']) V.st(q(id), { opacity: 0 }); };
})();
