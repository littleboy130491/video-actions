# video-actions — long-term upgrade plan (parallel workstreams)

Repo: /home/claude/video-actions (public; CODE ONLY — never commit client designs, photos, scenes, fonts, videos,
bundles or .render_key). Agents do NOT commit/push; the lead reviews and commits.
Existing projects to stay compatible with (local, not in repo): /home/claude/{akr-video,bsb-video,bygy-video,tam-video,
imj-promo}. DON'T modify those project folders, and don't run anything in /home/claude/imj-promo (a final render is
running there; CPU has 2 cores — keep your test renders tiny: --draft, a few seconds, --stills).

Scene contract (all engines): an HTML scene sets window.DURATION, window.seek(t[,tc]) (may return a Promise),
window.ready (promise/flag); optional window.cutTimes(), window.shutterScale(t), window.motionPx(a,b), window.SFX.

## A — shared core + per-project config  (dirs: core/, engines/*, scripts/, README.md)
- core/render.py: ONE renderer derived from engines/imj/render2.py (newest: async seek, blur fix MIN_N), driven by a
  project config `video.json` in the project folder: {name, order:[scenes…], prebuilt:{outro:6.5}, final, draft_final,
  width, height, fps, port, fonts:[…]}. Remove hard-coded 1080×1920 (use width/height everywhere incl. _small()/
  image_motion and ffmpeg -s). CLI identical (--draft --stills --scene --concat-only --sharp --outdir) + --project DIR.
- core/sfx.py generic (reads video.json for names).
- core/kit.js + core/kit.css: the shared kit (engines/bygy|tam|imj kit.js are byte-identical — use that).
- Font loading: when a font file referenced by a scene/CSS is missing, fail with a clear message naming the file
  (preflight check of url(...) refs + window 'error' capture), not an opaque NetworkError.
- Back-compat: each engines/<x>/ keeps working; add engines/<x>/video.example.json showing that project's config
  (copy ORDER/PREBUILT/FINAL from its render2.py). Make scripts/render_chunk.py + workflow able to use core/render.py
  when the bundle has video.json, else the old engine path.
- Verify: write a video.json for a COPY of tam-video's config in /tmp/claude-0/-home-claude/c4297613-e3c4-5fb5-840f-b1db9a5fed81/scratchpad/coretest and render 1–2 stills of
  /home/claude/tam-video scenes via --project pointing at a scratch copy (copy scenes/engine/assets symlinks into
  scratch). Update README.

## B — browser preview with scrub bar  (dir: tools/preview/)
- tools/preview/serve.py: tiny static server (range-request capable, so <video> seeking works) rooted at a project dir,
  serving preview.html at /__preview.
- preview.html: lists scenes from video.json (fallback: scenes/*.html), loads a scene in a 1080×1920 iframe scaled to
  fit, scrub bar + play/pause (real-time playback by calling seek(t) per rAF), frame step ←/→, timecode, jump to
  cutTimes, whole-video mode that plays the ORDER sequentially (skip prebuilt mp4s or play them in a <video>),
  safe-zone overlay toggle (top 220 / bottom 380 / right 140 px), 0.25×–2× speed. No build step, vanilla JS.
- Verify with Playwright against a scratch copy of /home/claude/imj-promo scenes (read-only copy) and screenshot it.
  Document in README (section "Preview").

## C — reusable scene/transition template library  (dir: templates/)
- Parameterized, deterministic templates on the scene contract, using ../core/kit.js easing helpers (if core/ isn't
  there yet, copy engines/imj/kit.js to templates/_kit.js and note it) — each template = one HTML + a JSON params
  example, configurable by URL query or a params object: type-reveal (line masks, word slams, letter build),
  stats-punch (sequence of big numbers with labels, odometer/counter), masonry (columns of images, parallax, staggered
  reveals), device/page scroll (flat page or browser frame scrolling a tall image), chat (WhatsApp-style thread),
  sketch-to-site (stroke draw → image reveal), plus a transitions module (zoom-through, circle/shape wipe, whip-pan with
  blur, match-scale) usable between two layers in one scene. All expose motionPx where feasible + cutTimes.
- Take the best patterns from /home/claude/imj-promo/scenes/{h5_hook,p5_masonry,s5_helps,e5_stats}.html and
  engine/{imj,lux}.js (read-only), TeAM/BYGY scenes for workspace/scroll. Generic: brand colours/fonts/images are params.
- templates/README.md: catalogue with params. Verify: render one --stills sheet per template via a tiny local harness
  (Playwright screenshots at 3 times each) into the scratchpad; tiny sizes.
