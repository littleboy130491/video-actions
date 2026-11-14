/* templates/tpl.js — tiny runtime shared by the templates/ scenes (copy next to kit.js into <project>/engine/).
 * Wires our scene contract: window.DURATION, window.ready, window.seek(t) (pure: every style is a function of t),
 * window.cutTimes(), window.motionPx(a,b) (from probe points), plus params and fonts.
 *
 *   const P = T.params({ duration: 4, title: 'Hello' });     // defaults <- window.PARAMS <- ?p={json} / ?key=value
 *   T.scene({ duration: P.duration, fonts: P.fonts,
 *             setup() { ...build DOM...; return state },     // may be async; runs after fonts load
 *             frame(t, st, tc) { ...every style from t... },   // tc: frame centre
 *             probe(t, st) { return [[x, y], ...] },         // optional: screen points of the movers at t
             motion(a, b, st) { return px },                 // optional instead of probe: exact displacement
 *             cuts: [] });                                    // optional hard cuts (seconds)
 * Requires kit.js (window.K) for easing: K.ramp(t, a, b, 'outExpo'), K.E.*, K.seg, K.lerp, K.clamp.
 */
(function () {
  'use strict';
  const T = window.T = {};

  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  T.merge = function (a, b) {                     // deep merge for plain objects; arrays and scalars replace
    const o = { ...a };
    for (const k in b) o[k] = isObj(a[k]) && isObj(b[k]) ? T.merge(a[k], b[k]) : b[k];
    return o;
  };

  /** defaults <- window.PARAMS (set in a <script> before the template) <- URL ?p=<json> and ?key=value */
  T.params = function (defaults) {
    let p = T.merge(defaults, window.PARAMS || {});
    try {
      const q = new URLSearchParams(location.search);
      if (q.get('p')) p = T.merge(p, JSON.parse(q.get('p')));
      for (const [k, v] of q) {
        if (k === 'p' || !(k in defaults)) continue;
        const d = defaults[k];
        p[k] = typeof d === 'number' ? Number(v) : typeof d === 'boolean' ? v === '1' || v === 'true'
          : (isObj(d) || Array.isArray(d)) ? JSON.parse(v) : v;
      }
    } catch (e) { console.error('[tpl] bad query params', e); }
    window.PARAMS_RESOLVED = p;
    return p;
  };

  /** fonts: [{family, url, weight?, style?}] -> FontFace loads (a 404 makes core/render.py stop naming the file) */
  T.loadFonts = async function (fonts) {
    for (const f of fonts || []) {
      const ff = new FontFace(f.family, `url(${JSON.stringify(f.url)})`, { weight: String(f.weight || 400), style: f.style || 'normal' });
      document.fonts.add(await ff.load());
    }
    await document.fonts.ready;
  };

  /** element helper: T.el('div', parent, {cls, css, text, html, attrs}) */
  T.el = function (tag, parent, o = {}) {
    const e = document.createElement(tag);
    if (o.cls) e.className = o.cls;
    if (o.css) e.style.cssText = o.css;
    if (o.text != null) e.textContent = o.text;
    if (o.html != null) e.innerHTML = o.html;
    for (const k in o.attrs || {}) e.setAttribute(k, o.attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };

  /** wait until every <img> in root has decoded (so the first captured frame already has them) */
  T.images = async function (root) {
    await Promise.all([...(root || document).querySelectorAll('img')].map(im =>
      (im.complete ? Promise.resolve() : new Promise(r => { im.onload = im.onerror = r; })).then(() => im.decode && im.decode().catch(() => {}))));
  };

  const f3 = v => (Math.round(v * 1000) / 1000).toString();
  T.f = f3;

  T.scene = function (def) {
    window.DURATION = def.duration;
    let st = null;
    window.ready = (async () => {
      await T.loadFonts(def.fonts);
      st = (await def.setup()) || {};
      await T.images(document.body);
      window.seek(0);
      await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r)));
      return true;
    })();
    // seek(t, tc): continuous motion at t (a shutter sub-sample), discrete things (typed characters, digits
    // that must not double-expose) at tc = the frame centre; tc defaults to t
    window.seek = function (t, tc) {
      if (!st) return;
      t = K.clamp(t, 0, def.duration);
      def.frame(t, st, tc == null ? t : K.clamp(tc, 0, def.duration));
    };
    window.cutTimes = () => (def.cuts || []).slice();
    if (def.motion) window.motionPx = (a, b) => st ? def.motion(K.clamp(a, 0, def.duration), K.clamp(b, 0, def.duration), st) : 0;
    else if (def.probe) {
      window.motionPx = function (a, b) {
        if (!st) return 0;
        const A = def.probe(K.clamp(a, 0, def.duration), st), B = def.probe(K.clamp(b, 0, def.duration), st);
        let d = 0;
        for (let i = 0; i < Math.min(A.length, B.length); i++) if (A[i] && B[i]) d = Math.max(d, Math.hypot(B[i][0] - A[i][0], B[i][1] - A[i][1]));
        return d;
      };
    }
  };
})();
