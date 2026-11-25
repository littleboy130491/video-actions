# Lessons & history (read before starting a new video)

## Previous videos (make the next one DIFFERENT)
| Video | Format | Reference | Look / structure | Engine |
|---|---|---|---|---|
| AKR Gallery West | design timelapse | Skyscanner brand-in-motion | black stage ↔ brand colour fields, bento token grid, 3D page glide, match cuts, Home scroll | akr |
| Bima Sakti Bahari | design timelapse | Skyscanner (owner: too similar to AKR) | same grammar, ocean palette | bsb |
| BYGY / Be Best | design timelapse | Naver "2022 in keywords" | product-photo hook burst, light Figma-like one-take, brief as motion slide, desktop→tablet→mobile, Home scroll | bygy |
| TeAM (Telematika) | design timelapse | Obys Showreel 2024 | live-site preloader + curtain opening with hero video, dark canvas one-take, pages in a row as in Figma, Home scroll with hero video | tam |
| Imajiner promo | motion ad | (owner direction: minimalist luxury) | kinetic type hook, masonry portfolio, 4 benefit vignettes, stat punches | imj |
| PT RIX Orient Indonesia (v001) | design timelapse | (same 7-scene Figma-cursor grammar; owner: repetitive) | `#363581` flat 2D CAD stage, Hook typing → Brief slide → Hero/Stats/Footer cursor builds → horizontal pages row → Home scroll + outro | rix |

## Owner feedback that became rules
- Never touch the client's Figma. No labels/captions. No meaningless cursor actions or empty placeholders.
- Hook must be compelling from frame 0 (no slow title card / tiny label on black).
- Process = one cumulative take; mockups only in the final presentation; brief = one motion slide.
- Vary zoom: clear push-ins and pull-backs (4–7 per process); elements fill the frame.
- Other pages: never cropped in width; meaningful arrangement; smooth transition into the ending.
- Ending: Home flat and full, scrolling (not resizing), live hero video when the site has one.
- Faithfulness: use the real site's fonts, hero video and layered images (the ssgid ship is a PNG over the sea video).
- Promo: text never over images; plain/gradient luxury look; but keep energetic camera transitions.
- Portfolio: no flicker, no cheap carousel → masonry with elegant parallax.
- Stats: one by one, like punches, big, readable labels.
- Each new video must differ significantly from the last. On RIX `v001`, changing palette/background color alone felt
  boring and repetitive because it reused the same 7-scene Figma-cursor sequence (`Hook typing → static Brief palette/Aa
  slide → drawRect + typo-fix → Alt-drag + dragSnap → horizontal page row → flat Home scroll`). Future videos must
  genuinely vary **camera grammar, structure, pacing, and transitions** (e.g., cursor-less kinetic hardware,
  split-screen wipe, giant text-masks, color-block slam cuts, bento zoom-dive).
- Multi-agent QA: pair parallel scene builders with an independent QA critic verifying Reels safe zones
  (`y = 260..1540`, right `140 px` clear / `x ≤ 940`), zero-lorem compliance, and C0/C1 seam math (e.g., RIX QA caught
  right-aligned CTAs/grids extending past `x = 940` at `0.75×` full-width zoom when the camera stayed centered at
  `x = 720`).

## Technical lessons
- 2-sample frame blending = ghosting → adaptive shutter; declare cutTimes (blur across a cut = double exposure).
- Scenes without `motionPx` rely on an image estimate; small fast movers need dense sampling (MIN_N, fixed in core).
- Video elements: seek deterministically (`video.currentTime` + await 'seeked'); load as blob if the server can't
  serve byte ranges; skip corrupt first frames of supplied clips.
- Live sites: record with Playwright `record_video_dir`; YouTube embeds can't be downloaded here — ask the owner
  for the file.
- Fonts: check computed styles on the live site (e.g. ssgid = Josefin Sans headings + Jost body).
- Lighthouse on portfolio sites (Nov 2026) scored 29–57 mobile → don't claim speed numbers unless measured high.
- Token cost is dominated by long agent histories and images, not rendering → fresh agents per big revision, one
  contact sheet per review.

- Never round camera transforms (e.g. toFixed(3) on scale): on a 14,000 px row it made edges jitter ±10 px/frame
  ("shaking"). Keep ≥ 6 decimals / sub-pixel transforms.
- Page bursts: one continuous camera travel with smooth velocity beats start-stop wipes ("choppy"); check per-frame
  velocity and frame-diff spikes. Big screenshots shown small: add 0.5x mip copies; live iframes shimmer when tiny →
  swap to a pre-rendered screenshot below ~0.5x.
- Readable Home scroll: peak ≈ 28 px/frame (45 was "too fast"); page bursts ≈ 0.75 s per page.
- Layers wider than the page (smoke, swirls) spill out when the page has overflow visible → clip them to the page.
- Masonry/portfolio walls: dedupe by SITE (not file); never show the same client twice.
- **Parallel chunking benchmark (`scripts/render_chunk.py` + `scripts/join_parts.sh`):** On `s4_build_stats` (`210` frames,
  `4`-core `15 GiB` Linux host), `K=4` delivered **`~2.11×` speedup** on `--draft` (`48.72 s` vs `102.58 s`, `SSIM 0.9973 /
  PSNR 46.26 dB`) and **`~1.95×` speedup** on true 180° adaptive shutter (`174.18 s` vs `338.99 s`, `992` samples,
  `SSIM 0.9975 / PSNR 49.23 dB`). Operational rules: pre-start one shared HTTP server on `video.json`'s port before
  spawning `K` workers (prevents `ensure_server()` port-bind races), cap `K ≤ nproc` and render one variant/project at a
  time to avoid RAM/swap thrashing, and resolve `<workdir>` to an absolute path in `scripts/join_parts.sh` (relative
  paths otherwise double inside `ffmpeg -f concat`).
- **180° adaptive shutter `S.tcam` pitfall (`core/kit.js` `K.scene`):** `K.scene` passes `tc` (frame center time) to
  `def.frame(S, tc, st)` while storing the shutter sub-sample time on `S.tcam`. Calling `st.cam(t)` inside `frame`
  evaluates the camera at `tc` on every sub-sample, causing `window.motionPx(a, b)` to measure `0` displacement (`N=1`,
  zero motion blur). Calling `st.cam(S.tcam)` restores true 180° adaptive shutter (`210 → 992` samples on
  `s4_build_stats`, silky blur on fast pans while static holds stay sharp `N=1`).
- **HyperFrames (`tools/studio/`) is preview-only:** `hyperframes@0.9.41 render` fails with `COMPOSITION_SETUP_TIMEOUT`
  after `45 s` because it freezes `Date`/`performance.now` and holds `requestAnimationFrame` during setup while
  `core/kit.js` awaits `2× rAF` inside `window.ready`. Use `tools/studio/studio.py` for preview/scrubbing only and
  `core/render.py` / `scripts/render_chunk.py` for renders.
- **Playwright preflight safety:** Never run `window.ready` checks in Playwright without a strict timeout (`Promise.race`
  / `15 s` cap) and `console`/`pageerror`/`response >= 400` listeners — an unresolved `window.ready` hangs indefinitely.
- **Outro pure silence (`core/sfx.py`):** Zeroing `buf` before `loudnorm` can still leave non-zero tail/normalization
  bleed over `PREBUILT` segments; `core/sfx.py` now also applies ffmpeg `volume=0:enable='between(t,s0,s0+d)'` after
  `loudnorm` / `volume=-2.7dB` so prebuilt Imajiner outros stay 100% digital silence (`-91.0 dB`).

## Reference library
Skyscanner (beat cuts, bento token grid, colour-field match cuts), Naver (keyword search → world, devices in white
space, giant 3D type), Obys (black stage, giant block type, flat screens with block masks, bending pages, mobile grid,
fast-cut bursts, no cursor). Add each new reference with 6–10 concrete traits.
