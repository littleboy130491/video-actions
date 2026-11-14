/* templates/transition.js — two-layer transitions as pure functions of progress (copy into <project>/engine/).
 * Adapted from HyperFrames blocks "zoom-through-transition" and "whip-pan-cut" (Apache-2.0, see templates/NOTICE);
 * rewritten without GSAP on kit.js easing, for our seek(t) contract.
 *
 *   TX.apply(type, A, B, u, o)   // A = outgoing layer, B = incoming layer (full-frame, absolutely positioned
 *                                //   siblings, B above A in the DOM or not: TX sets z-index), u = progress 0..1
 *   TX.px(type, ua, ub, o)       // max on-screen displacement (px) between two progresses (for motionPx)
 *   TX.at(t, t0, dur)            // progress of a transition starting at t0 lasting dur
 * types: 'zoom'  zoom-through: the camera pushes INTO A (scale-up + blur; A stays opaque underneath), B fades
 *                in on top from behind (scaled down, blurred) and settles. o: {x, y} focal point (default centre), depth (1), blur (px, 18)
 *        'whip'  whip-pan: A and B ride one strip (B docked one frame beyond A), one inOutCubic travel, so the
 *                seam velocity matches by construction; directional (horizontal/vertical) SVG blur capped at
 *                o.blur (12) peaking at mid-whip; optional accent seam line. o: dir ('left'|'right'|'up'|'down'),
 *                seam (css colour or ''), blur
 * Both leave A and B in their rest pose at u<=0 (A visible, B hidden) and u>=1 (B visible, A hidden).
 */
(function () {
  'use strict';
  const TX = window.TX = {};
  const W = () => window.innerWidth || 1080, H = () => window.innerHeight || 1920;
  const cl = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const sg = (u, a, b) => cl((u - a) / (b - a));
  const E = {
    inOutCubic: u => u < .5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2,
    inExpo: u => u <= 0 ? 0 : Math.pow(2, 10 * u - 10),
    outExpo: u => u >= 1 ? 1 : 1 - Math.pow(2, -10 * u),
    outCubic: u => 1 - Math.pow(1 - u, 3),
    inCubic: u => u * u * u,
  };
  const f = v => (Math.round(v * 1000) / 1000).toString();

  TX.at = (t, t0, dur) => cl((t - t0) / dur);

  // ---- zoom-through ----
  function zoomState(u, o) {
    const depth = o.depth == null ? 1 : o.depth;
    const ua = sg(u, 0, .62), ub = sg(u, .38, 1);
    return {
      sa: 1 + 2.4 * depth * E.inExpo(ua),                 // A rushes toward the camera
      ba: (o.blur == null ? 18 : o.blur) * E.inCubic(ua),
      oa: u >= 1 ? 0 : 1,                                 // A stays under B (no black gap around B)
      sb: .62 + .38 * E.outExpo(ub),                      // B comes up from behind and settles
      bb: (o.blur == null ? 18 : o.blur) * .8 * (1 - E.outCubic(ub)),
      ob: sg(u, .38, .52),
    };
  }

  // ---- whip-pan ----
  let svgF = null;
  function blurFilter(id) {
    if (!svgF) {
      svgF = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svgF.setAttribute('width', '0'); svgF.setAttribute('height', '0');
      svgF.style.cssText = 'position:absolute;width:0;height:0;overflow:hidden';
      document.body.appendChild(svgF);
    }
    let fl = svgF.querySelector('#' + id);
    if (!fl) {
      fl = document.createElementNS('http://www.w3.org/2000/svg', 'filter');
      fl.setAttribute('id', id); fl.setAttribute('x', '-10%'); fl.setAttribute('y', '-10%');
      fl.setAttribute('width', '120%'); fl.setAttribute('height', '120%');
      fl.setAttribute('color-interpolation-filters', 'sRGB');
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'feGaussianBlur');
      g.setAttribute('stdDeviation', '0 0');
      fl.appendChild(g); svgF.appendChild(fl);
    }
    return fl.firstChild;
  }
  function whipState(u, o) {
    const dir = o.dir || 'left';
    const horiz = dir === 'left' || dir === 'right';
    const L = horiz ? W() : H();
    const sgn = dir === 'left' || dir === 'up' ? -1 : 1;  // travel direction of the content
    const off = L * E.inOutCubic(cl(u));
    // velocity of inOutCubic peaks at u=.5 (=3): blur follows velocity, capped
    const v = u <= 0 || u >= 1 ? 0 : (u < .5 ? 12 * u * u : 12 * (1 - u) * (1 - u)) / 3;
    return { horiz, L, sgn, off, blur: (o.blur == null ? 12 : o.blur) * v };
  }

  TX.apply = function (type, A, B, u, o = {}) {
    u = cl(u);
    A.style.zIndex = '1'; B.style.zIndex = '2';
    if (type === 'zoom') {
      const s = zoomState(u, o), ox = o.x == null ? W() / 2 : o.x, oy = o.y == null ? H() / 2 : o.y;
      A.style.transformOrigin = B.style.transformOrigin = `${f(ox)}px ${f(oy)}px`;
      A.style.transform = `scale(${f(s.sa)})`;
      A.style.filter = s.ba > .05 ? `blur(${f(s.ba)}px)` : 'none';
      A.style.opacity = f(s.oa);
      A.style.visibility = s.oa <= 0 ? 'hidden' : 'visible';
      B.style.transform = `scale(${f(s.sb)})`;
      B.style.filter = s.bb > .05 ? `blur(${f(s.bb)}px)` : 'none';
      B.style.opacity = f(s.ob);
      B.style.visibility = s.ob <= 0 ? 'hidden' : 'visible';
      return;
    }
    if (type === 'whip') {
      const s = whipState(u, o);
      const tr = (d) => s.horiz ? `translate3d(${f(d)}px,0,0)` : `translate3d(0,${f(d)}px,0)`;
      A.style.transform = tr(s.sgn * s.off);
      B.style.transform = tr(s.sgn * (s.off - s.L));
      A.style.visibility = u >= 1 ? 'hidden' : 'visible';
      B.style.visibility = u <= 0 ? 'hidden' : 'visible';
      A.style.opacity = B.style.opacity = '1';
      const g = blurFilter('tx-whip');
      g.setAttribute('stdDeviation', s.horiz ? `${f(s.blur)} 0` : `0 ${f(s.blur)}`);
      A.style.filter = B.style.filter = s.blur > .05 ? 'url(#tx-whip)' : 'none';
      if (o.seam) {                                      // hairline on the boundary, only while the whip runs
        let sm = B.parentNode.querySelector(':scope > .tx-seam');
        if (!sm) { sm = document.createElement('div'); sm.className = 'tx-seam'; B.parentNode.appendChild(sm); }
        const pos = s.sgn < 0 ? s.L - s.off : s.off;     // boundary between A and B in screen coords
        sm.style.cssText = `position:absolute;z-index:3;pointer-events:none;background:${o.seam};` +
          (s.horiz ? `left:${f(pos - 2)}px;top:0;width:4px;height:100%` : `top:${f(pos - 2)}px;left:0;height:4px;width:100%`) +
          `;opacity:${f(Math.min(1, s.blur / 3))}`;
      }
      return;
    }
    throw new Error('TX: unknown transition ' + type);
  };

  TX.px = function (type, ua, ub, o = {}) {
    if (type === 'zoom') {
      const a = zoomState(cl(ua), o), b = zoomState(cl(ub), o);
      const r = Math.hypot(W(), H()) / 2;               // corner distance from the focal point (upper bound)
      return Math.max(Math.abs(b.sa - a.sa) * r * (a.oa > 0 || b.oa > 0 ? 1 : 0), Math.abs(b.sb - a.sb) * r);
    }
    if (type === 'whip') return Math.abs(whipState(cl(ub), o).off - whipState(cl(ua), o).off);
    return 0;
  };
})();
