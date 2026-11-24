(() => {
  'use strict';

  /**
   * Shared JIP / SOLEA 2D flat architectural motion-timelapse helpers:
   * Sunlit Warm Vellum (#F4F2ED) workspace, sub-pixel 6-decimal camera transforms,
   * 12-column 64px-margin editorial grid overlay, and smooth luxury easing.
   */
  function installVellumStudio(S, o = {}) {
    const bg = o.bg || '#F4F2ED';
    document.documentElement.style.background = bg;
    document.body.style.background = bg;
    S.stage.style.background = bg;

    S.under.style.backgroundImage = 'radial-gradient(circle at 1px 1px, rgba(19,19,19,0.085) 1px, transparent 1.5px)';
    S.under.style.backgroundSize = '32px 32px';

    if (S.shadowEl && o.pageCard !== false) {
      S.shadowEl.style.background = o.cardBg || '#FFFFFF';
      S.shadowEl.style.opacity = '1';
      S.shadowEl.style.boxShadow = '0 1px 4px rgba(19,19,19,0.08), 0 24px 72px rgba(19,19,19,0.11)';
    }

    if (o.rulers !== false) {
      const r = document.createElement('div');
      r.className = 'vellum-rulers';
      r.innerHTML = `
        <div class="vr-line vr-l"></div>
        <div class="vr-line vr-r"></div>
        <div class="vr-tick vr-t1"></div>
        <div class="vr-tick vr-t2"></div>
      `;
      S.under.appendChild(r);
    }
  }

  /**
   * High-precision flat 2D matrix transform (>= 6 decimal places) preventing sub-pixel
   * edge jitter on wide page pans and multi-frame strips.
   */
  function camPrecise(S, c, t) {
    c = Object.assign({ x: 720, y: 960, zoom: 1, rx: 0, ry: 0, rz: 0, cx: S.vw / 2, cy: S.vh / 2, drift: 0 }, c);
    S.setCam({ x: c.x, y: c.y, zoom: c.zoom, rx: 0, ry: 0, rz: 0, cx: c.cx, cy: c.cy, drift: c.drift }, t);
    const dr = c.drift || 0;
    const tn = t + (S.opts.noiseT0 || 0);
    const dx = dr ? 2.5 * K.noise(tn, 11) * dr : 0;
    const dy = dr ? 2.5 * K.noise(tn, 23) * dr : 0;
    const tx = (c.cx + dx) - c.x * c.zoom;
    const ty = (c.cy + dy) - c.y * c.zoom;
    S.world.style.transform = `matrix(${c.zoom.toFixed(6)},0,0,${c.zoom.toFixed(6)},${tx.toFixed(6)},${ty.toFixed(6)})`;
    if (S.under && S.under.dataset.vellum !== 'off') {
      const sp = 32 * Math.max(0.55, Math.min(2.2, c.zoom));
      const md = (v, m) => ((v % m) + m) % m;
      S.under.style.backgroundSize = `${sp.toFixed(4)}px ${sp.toFixed(4)}px`;
      S.under.style.backgroundPosition = `${md(tx, sp).toFixed(4)}px ${md(ty, sp).toFixed(4)}px`;
    }
  }

  /**
   * Flat 2D camera interpolation (zero 3D tilts).
   */
  function glideCam(camA, camB, t, t0, t1, ease = 'inOutExpo') {
    const u = K.ramp(t, t0, t1, ease);
    const c = K.camLerp(camA, camB, u);
    c.rx = 0; c.ry = 0; c.rz = 0;
    return c;
  }

  /**
   * 12-column editorial architectural grid (64px outer margin, 24px gutter on 1440px width).
   */
  function makeArchGrid(S, rect, opts = {}) {
    const d = document.createElement('div');
    d.className = 'arch-12col';
    const margin = opts.margin ?? 64;
    const gutter = opts.gutter ?? 24;
    const colW = (rect.w - 2 * margin - 11 * gutter) / 12;
    let cols = '';
    for (let i = 0; i < 12; i++) {
      const lx = margin + i * (colW + gutter);
      cols += `<span style="position:absolute;top:0;bottom:0;left:${lx.toFixed(2)}px;width:${colW.toFixed(2)}px;"></span>`;
    }
    d.innerHTML = cols;
    Object.assign(d.style, {
      position: 'absolute',
      pointerEvents: 'none',
      zIndex: '12',
      opacity: '0',
      left: rect.x + 'px',
      top: rect.y + 'px',
      width: rect.w + 'px',
      height: rect.h + 'px',
    });
    S.main.appendChild(d);
    return d;
  }

  /**
   * Monotonic C1 quadratic ease-out curve (cruise up to a, quadratic deceleration a..1).
   */
  function monotonicCruise(u, a = 0.88) {
    u = K.clamp(u, 0, 1);
    const norm = a + 0.5 * (1 - a);
    if (u < a) return u / norm;
    return 1 - (0.5 * Math.pow(1 - u, 2)) / ((1 - a) * norm);
  }

  window.Jip = {
    installVellumStudio,
    camPrecise,
    glideCam,
    makeArchGrid,
    monotonicCruise,
  };
})();
