# HyperFrames integration (partial adoption)

Decision (after test, see notes below): keep core/render.py for final renders (faster, adaptive shutter). Use
HyperFrames (npm `hyperframes@0.9.41`, Apache-2.0) for (1) Studio preview of OUR scenes and (2) its block catalog as
starting code, restyled and ported to our seek contract.
Test workspace with working examples: /tmp/claude-0/-home-claude/c4297613-e3c4-5fb5-840f-b1db9a5fed81/scratchpad/hf/
(adapter/ = working 4-line shim around e5_stats.html; stats/ = native GSAP port; catalog.json = block list;
node_modules has hyperframes installed). Notes: its Chrome download is blocked → HYPERFRAMES_BROWSER_PATH=
/usr/bin/google-chrome; HYPERFRAMES_NO_TELEMETRY=1. An iframe wrapper failed (ready never resolved) → the shim must be
INSIDE the scene document.

Rules: repo is public, CODE ONLY (no client images/fonts/scenes/videos). Don't modify project folders under /home/claude
(*-video, imj-promo) — copy to scratch for tests. No commits (lead commits). Tiny test renders only.

## 1. tools/studio/ — open any project scene in HyperFrames Studio
- `python3 tools/studio/studio.py --project P [--scene NAME] [--port N]`: reads P/video.json (fallback scenes/*.html),
  builds a throwaway workspace (scratch/temp dir, never inside P) where each scene is a COPY with the shim injected
  (data-composition-id/-duration/-width/-height on <body> from window.DURATION/video.json; window.ready → HF build-ready;
  'hf-seek' → await window.seek(t)), symlinks P's assets/fonts/design/engine dirs so relative URLs resolve, writes a root
  composition that sequences the scenes in ORDER (prebuilt mp4s as <video> clips if HF supports it, else skipped), then
  runs `npx hyperframes@0.9.41 preview` with the env vars above. Installs hyperframes into tools/studio/node_modules on
  first run (gitignored). Print the URL.
- tools/studio/shim.js (the injected script) + README section "Studio preview".
- Verify on a scratch copy of /home/claude/imj-promo (scenes h5_hook, e5_stats at least): Studio loads, scrub to 3
  times, screenshot with Playwright; the frame matches core/render.py --stills at the same t (pixel diff small).

## 2. templates/ — restyled blocks on our contract
Port 5 catalog blocks to deterministic scenes on our contract (window.DURATION, seek(t) pure, ready, cutTimes,
motionPx where feasible), generic + parameterized (colours, fonts, texts, image URLs via a params object / query):
transition: zoom-through + whip-pan (one module usable between two layers); counter/number-wheel (stats punch);
browser-device-stage (page scroll in a browser frame); chat-thread with typing indicator (WhatsApp-style theme option).
Use GSAP only if bundled locally (MIT/standard license note) — prefer our core/kit.js easing. Keep Apache-2.0
attribution (templates/NOTICE + per-file header "adapted from HyperFrames block <name>, Apache-2.0").
templates/README.md with params. Verify: render each with core/render.py --stills (3 times) on a tiny test project in
scratch using placeholder images you generate (no client assets), one contact sheet.

Report ≤10 lines.
