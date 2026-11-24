(() => {
  'use strict';

  /**
   * Shared Pedra 2D architectural motion-timelapse helpers (zero-tilt flat stage,
   * dark quarry drafting grid, sub-pixel whip transitions, C1 cruise scroll).
   */
  const HERO_OVERLAYS = ['header_bar', 'hero_scrim', 'hero_title', 'hero_lede', 'hero_cta', 'hero_bars'];
  const PROD_OVERLAYS = ['prod_scrim_1', 'prod_body_1', 'prod_scrim_2', 'prod_body_2', 'prod_scrim_3', 'prod_body_3'];

  function ensureWhipFilter() {
    let el = document.getElementById('whip-std');
    if (el) return el;
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', '0');
    svg.setAttribute('height', '0');
    svg.style.cssText = 'position:absolute;pointer-events:none';
    svg.setAttribute('aria-hidden', 'true');
    svg.innerHTML = `<defs>
      <filter id="whip-blur" x="0%" y="0%" width="100%" height="100%" color-interpolation-filters="sRGB">
        <feGaussianBlur id="whip-std" in="SourceGraphic" stdDeviation="0 0" edgeMode="duplicate"/>
      </filter>
    </defs>`;
    document.body.appendChild(svg);
    return document.getElementById('whip-std');
  }

  function setWhipBlur(stage, stdEl, bx, by) {
    if (!stage || !stdEl) return;
    if (bx > 0.2 || by > 0.2) {
      stdEl.setAttribute('stdDeviation', `${bx.toFixed(2)} ${by.toFixed(2)}`);
      stage.style.filter = 'url(#whip-blur)';
    } else if (stage.style.filter) {
      stage.style.filter = '';
    }
  }

  /**
   * Configure dark architectural quarry drafting workspace (#161817) with subtle
   * micro dot-grid and faint architectural ruler hairlines behind illuminated white artboards.
   */
  function installQuarryGrid(S, o = {}) {
    document.documentElement.style.background = '#161817';
    document.body.style.background = '#161817';
    S.stage.style.background = '#161817';

    // Replace default light dot layer with crisp low-contrast quarry dots tracking canvas scale
    S.under.style.backgroundImage = 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.065) 1px, transparent 1.5px)';
    S.under.style.backgroundSize = '28px 28px';

    // Subtle illuminated page elevation shadow under #page artboard
    if (S.shadowEl && o.pageCard !== false) {
      S.shadowEl.style.background = o.cardBg || '#FFFFFF';
      S.shadowEl.style.opacity = '1';
      S.shadowEl.style.boxShadow = '0 2px 6px rgba(0,0,0,0.28), 0 28px 90px rgba(0,0,0,0.52)';
    }

    // Fine static architectural ruler hairlines inside underlayer (behind all pages!)
    if (o.rulers !== false) {
      const r = document.createElement('div');
      r.className = 'quarry-rulers';
      r.innerHTML = `
        <div class="qr-line qr-l"></div>
        <div class="qr-line qr-r"></div>
        <div class="qr-tick qr-t1"></div>
        <div class="qr-tick qr-t2"></div>
      `;
      S.under.appendChild(r);
    }
  }

  /**
   * High-precision 2D matrix setter (flat: true, >= 6 decimal places on every coordinate)
   * eliminating sub-pixel rounding jitter during smooth filmstrips & pans.
   */
  function camPrecise(S, c, t) {
    c = Object.assign({ x: 720, y: 960, zoom: 1, rx: 0, ry: 0, rz: 0, cx: S.vw / 2, cy: S.vh / 2, drift: 0 }, c);
    S.setCam({ x: c.x, y: c.y, zoom: c.zoom, rx: 0, ry: 0, rz: 0, cx: c.cx, cy: c.cy, drift: c.drift }, t);
    // Re-apply world transform with 6-decimal precision
    const dr = c.drift || 0;
    const tn = t + (S.opts.noiseT0 || 0);
    const dx = dr ? 2.5 * K.noise(tn, 11) * dr : 0;
    const dy = dr ? 2.5 * K.noise(tn, 23) * dr : 0;
    const tx = (c.cx + dx) - c.x * c.zoom;
    const ty = (c.cy + dy) - c.y * c.zoom;
    S.world.style.transform = `matrix(${c.zoom.toFixed(6)},0,0,${c.zoom.toFixed(6)},${tx.toFixed(6)},${ty.toFixed(6)})`;
    if (S.under && S.under.dataset.quarry !== 'off') {
      const sp = 28 * Math.max(0.55, Math.min(2.2, c.zoom));
      const md = (v, m) => ((v % m) + m) % m;
      S.under.style.backgroundSize = `${sp.toFixed(4)}px ${sp.toFixed(4)}px`;
      S.under.style.backgroundPosition = `${md(tx, sp).toFixed(4)}px ${md(ty, sp).toFixed(4)}px`;
    }
  }

  /**
   * Add a 12-column architectural blueprint hairline overlay inside any section rect (in page coords).
   */
  function makeBlueprintGrid(S, rect, opts = {}) {
    const d = document.createElement('div');
    d.className = 'blueprint-12col';
    const margin = opts.margin ?? 144;
    const colW = (rect.w - 2 * margin - 11 * 24) / 12;
    let cols = '';
    for (let i = 0; i < 12; i++) {
      const lx = margin + i * (colW + 24);
      cols += `<span style="position:absolute;top:0;bottom:0;left:${lx.toFixed(2)}px;width:${colW.toFixed(2)}px;border-left:1px solid rgba(80,133,128,0.22);border-right:1px solid rgba(80,133,128,0.22);background:rgba(80,133,128,0.035);pointer-events:none;"></span>`;
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
   * Interpolate between two cameras with optional mid-transition zoom dip (flat 2D only).
   */
  function whipCam(camA, camB, t, t0, t1, ease = 'inOutExpo', dip = 0) {
    const u = K.ramp(t, t0, t1, ease);
    const c = K.camLerp(camA, camB, u);
    c.rx = 0; c.ry = 0; c.rz = 0;
    if (dip) c.zoom *= 1 - dip * Math.sin(Math.PI * K.seg(t, t0, t1));
    return c;
  }

  /**
   * Directional blur bell curve over [t0, t1] with peak [maxBx, maxBy].
   */
  function whipBlurBell(t, t0, t1, maxBx, maxBy) {
    if (t <= t0 || t >= t1) return [0, 0];
    const s = Math.sin(Math.PI * K.seg(t, t0, t1));
    const k = s * s;
    return [maxBx * k, maxBy * k];
  }

  /**
   * Smooth C1 cruise ease: quadratic ease-in/out shoulders around constant-speed cruise.
   */
  function cruiseEase(u, a = 0.14) {
    u = K.clamp(u, 0, 1);
    const v = 1 / (1 - a);
    if (u < a) return 0.5 * (v / a) * u * u;
    if (u > 1 - a) {
      const r = 1 - u;
      return 1 - 0.5 * (v / a) * r * r;
    }
    return 0.5 * v * a + v * (u - a);
  }

  window.Pedra = {
    HERO_OVERLAYS,
    PROD_OVERLAYS,
    ensureWhipFilter,
    setWhipBlur,
    installQuarryGrid,
    camPrecise,
    makeBlueprintGrid,
    whipCam,
    whipBlurBell,
    cruiseEase,
  };
})();
