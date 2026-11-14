/* tools/studio/shim.js — injected (inline, at the end of <body>) into a COPY of a scene by tools/studio/studio.py.
 * Bridges our scene contract (window.DURATION, window.ready, window.seek(t) -> maybe Promise) to the HyperFrames
 * runtime: window.ready -> __hf.buildReady (the runtime waits for it before the first frame), and every 'hf-seek'
 * event -> await window.seek(t). The <body> already carries data-composition-id/-duration/-width/-height (written by
 * studio.py from window.DURATION / video.json). Must run INSIDE the scene document (an iframe wrapper never resolves).
 */
(function () {
  'use strict';
  var hf = window.__hf = window.__hf || {};
  hf.buildReady = hf.buildReady || {};
  var body = document.body;
  var id = (body && body.getAttribute('data-composition-id')) || 'scene';
  // seek/ready may be defined by a later or async script: wait until both exist (max ~10 s), then await ready + fonts
  var defined = new Promise(function (res, rej) {
    var n = 0;
    (function poll() {
      if (typeof window.seek === 'function' && typeof window.ready !== 'undefined') return res();
      if (++n > 500) return rej(new Error('scene has no window.seek / window.ready'));
      setTimeout(poll, 20);
    })();
  });
  var ready = defined
    .then(function () { return window.ready; })
    .then(function () { return document.fonts && document.fonts.ready; })
    .then(function () {
      var d = Number(window.DURATION);   // keep the attribute honest if the scene computes its duration at runtime
      if (body && d > 0 && Math.abs(d - Number(body.getAttribute('data-duration'))) > 1e-3)
        body.setAttribute('data-duration', String(d));
    });
  hf.buildReady[id] = ready;
  var last = Promise.resolve();
  window.addEventListener('hf-seek', function (e) {
    var t = Number(e.detail && e.detail.time) || 0;
    // serialize seeks: async scenes (await seek) must never interleave two frames
    var p = last = last.then(function () { return ready; }).then(function () { return window.seek(t); })
      .catch(function (err) { console.error('[studio shim] seek(' + t + ') failed', err); });
    if (e.detail && typeof e.detail.waitUntil === 'function') e.detail.waitUntil(p);
  });
})();
