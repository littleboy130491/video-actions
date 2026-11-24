# AGENTS.md — read this first

You are joining a working video studio pipeline, not a generic code repo. This file tells you **what we make, for whom,
to what standard, and how**. The code is only the means. Before writing anything, read in this order:
1. this file, 2. **`docs/method.md` — the production method that produced our approved videos (required)**,
3. the format guide for the job (`docs/formats/`), 4. `docs/lessons.md`, 5. `docs/review-checklist.md`.
The README only covers the renderer/CLI.

## 1. What this repo is for

**Imajiner** (imajiner.id) is an Indonesian web-design agency (clients: BUMN, Tbk, corporates). We produce short,
premium **vertical motion videos (9:16, 1080×1920, 30 fps, 25–40 s)** for Instagram Reels / TikTok that sell
Imajiner's work. Every video is **code-rendered motion graphics**: scenes are HTML pages animated deterministically,
captured frame by frame in headless Chrome and encoded with ffmpeg. No After Effects, no stock templates, no AI video
generation for the main visuals.

The owner's bar is **"premium agency showreel"** (references: Obys, Skyscanner brand-in-motion, Naver, Apple).
A video that is technically correct but plain, slow, cheap-looking or generic is a FAIL.

## 2. The three formats — identify which one you are making FIRST

| Format | One-line purpose | Main material | Guide |
|---|---|---|---|
| **Design timelapse** | Show HOW we designed a client's website (a natural, designer-like build in a Figma-like canvas) and end on the finished site | Client's Figma (read-only) + live site | `docs/formats/design-timelapse.md` |
| **Motion ad / promo** | Sell Imajiner (or a service) with kinetic type, portfolio, benefits and proof | imajiner.id copy, portfolio screenshots, stats | `docs/formats/motion-ad.md` |
| **Explainer** | Explain one service/process/concept clearly in steps (what, why, how) | A script/brief from the owner | `docs/formats/explainer.md` |

If the brief is ambiguous, ask the owner which format (and which reference style) before building.
All formats end with the **standard Imajiner outro** (a prebuilt mp4 the owner supplies; opens on white) unless told
otherwise.

## 3. Non-negotiable rules (learned the hard way — each one came from owner feedback)

1. **Figma is READ-ONLY.** Only read tools (get_metadata, get_design_context, get_variable_defs, get_screenshot,
   download_assets). Never create pages, frames or anything in a client's file. The video is built outside Figma.
2. **No caption/label overlays** ("01 Visual direction", top-left titles) unless asked. On-screen text is design
   content or deliberate kinetic type only.
3. **Every action must mean something.** No cursor wiggles, no lines drawn for nothing, no empty placeholder boxes,
   no fake Figma side panels or search pills, no decoration for its own sake ("AI slop": random glows, sparkles,
   particles, gradients without purpose).
4. **Each new video must be clearly different** from the previous ones (camera language, structure, transitions,
   reference style). Reuse the ENGINE, never the look. Changing palette or background color alone is NOT enough —
   never repeat the same 7-scene Figma-cursor sequence (Hook typing → static Brief palette/Aa slide → drawRect +
   typo-fix → Alt-drag + dragSnap → horizontal page row → flat Home scroll). Vary camera grammar, structure, pacing,
   and transitions (e.g., cursor-less kinetic hardware, split-screen wipes, giant text-masks, color-block slam cuts,
   bento zoom-dives). Check `docs/lessons.md` → "previous videos".
5. **Text never sits on top of photos/screenshots** in the promo/explainer formats (owner: "feels cheap"). Use plain
   or soft-gradient backgrounds; images go beside/below text, or text is masked WITH images inside the letters.
6. **Honest content only.** Numbers, scores and claims must be real (e.g. Lighthouse scores were measured, not
   invented; measurement pills show real DOM values). Copy comes from the client's/imajiner.id site unless given.
7. **Draft first, full quality once.** Review drafts (`--draft`) with the owner; run the full motion-blur render only
   after approval.
8. **Code only in this repo.** Never commit client designs, photos, fonts, scenes, videos, bundles or keys. Client
   project folders live outside the repo; CI receives them as AES-encrypted bundles (`bundles/*.enc`). Never print
   or commit the render key (`.render_key`, secret `RENDER_KEY`).
9. **Look at your own frames before reporting.** Contact sheet of the whole timeline + full-size stills at the busiest
   moments and at every cut. Never claim "done" from code alone.

## 4. Quality bar (what "good" looks like)

- **Frame 0 must already be interesting** (an image or an action in progress) — no slow text on a blank screen.
- **Scale contrast and a moving camera:** alternate extreme close-ups (3–5× on type/vectors), medium shots and wide
  pull-backs; the camera is never dead-still for >1 s (subtle drift at least). Expo/quint easing; no linear moves,
  no bounce, no screen shake unless asked.
- **Transitions are designed:** match cuts, zoom-throughs (camera dives into an element that becomes the next scene),
  continuous cuts (camera keeps moving across the cut), masked wipes. Plain dissolves and hard cuts between two
  similar shots of the same page read as mistakes.
- **Big, readable type on a phone:** headlines ≥ 96 px (hook words often frame-wide), labels ≥ 40 px, ≥ 0.25 s per word
  on screen. Subjects fill ≥ 60 % of the frame most of the time.
- **Safe zones (Reels/TikTok UI):** text and key UI between y = 260 and y = 1540, right 140 px free of text. Images
  may bleed lower.
- **Portfolio/pages shown full WIDTH** (crop height, never width). Fast but slick — no flicker bursts of 0.2 s cards
  unless the reference style demands it.
- **Motion blur via the renderer's adaptive 180° shutter** (`core/render.py`), never 2-frame blending; scenes with hard
  cuts must declare `window.cutTimes()` so blur never mixes two shots.
- **Sound:** sfx events from scenes (`window.SFX`) mixed by `core/sfx.py`; prebuilt client outros (`PREBUILT`) must
  stay **100% digital silence (`-91.0 dB`)** with zero tail bleed. Music is not set up yet (see roadmap).

## 5. How a job runs (standard workflow)

1. **Brief** — owner gives: format, client/site, Figma links (brief frame + main page + other pages), reference video,
   outro file, special requests. Note the exact wording of requests; they are requirements.
2. **Research** — read the live site (copy, fonts via computed styles, colours, hero video), Figma metadata (extract
   with jq/python; don't read huge dumps), download real assets at full resolution.
3. **SPEC.md** in the project folder — storyboard with timings (global seconds), each cut's joint type
   (HARD / MATCH / CONTINUOUS / ZOOM-THROUGH), assets per scene, rules. Templates: `docs/project-template/`.
4. **Build** — recreate designs as static HTML (`design/*.html` with `data-el` contract), write scenes
   (`scenes/*.html`) on the scene contract, `video.json` for scene order. Reuse `core/kit.js`, `templates/`.
5. **Preview & Preflight** while iterating: `tools/studio/studio.py --project P --scene X` (HyperFrames Studio **preview/scrub
   only** — never run `hyperframes render` CLI; it hits `COMPOSITION_SETUP_TIMEOUT` after 45 s because it freezes
   `Date`/`performance.now` and holds `rAF` while `core/kit.js` awaits `2× rAF` in `window.ready`) or `core/render.py --stills t1 t2 …`.
   In custom Playwright preflight checks, always guard `window.ready` with a strict timeout (`Promise.race` / 15 s cap) and attach
   `console`, `pageerror`, and `response >= 400` listeners so unresolved promises never hang.
6. **Draft & Parallel Rendering** — `core/render.py --project P --draft` (or `scripts/render_chunk.py` + `scripts/join_parts.sh`
   for **~2.1×** faster `--draft` and **~1.95×** faster 180° shutter on 4-core/15 GiB hosts). When chunk-rendering locally:
   pre-start one shared HTTP server on `video.json`'s port before spawning `K` workers (avoids `ensure_server()` port-bind races),
   cap `K ≤ nproc`, render one variant/project at a time to avoid RAM/swap thrashing, and pass an absolute `<workdir>` path
   (or rely on `join_parts.sh`'s resolved `WORKDIR`). Review contact sheet against §4 and the format guide → fix → send draft
   with a short timeline (scene ↔ seconds).
7. **Revisions** — owner feedback arrives per second ("at 0:27 …"). Map seconds → scene, re-render only changed
   scenes, concat. Keep a timeline map in SPEC. For large revisions write `SPEC_rN.md` (diagnosis + concrete fixes)
   and start fresh from it.
8. **Final** — after approval: `core/render.py --project P` (or `render_chunk.py` + `join_parts.sh` + `--concat-only`) and
   `core/sfx.py --project P`, check 8 frames + ffprobe + outro silence, deliver `<name>_final_sfx.mp4`.
9. **Multi-agent / Swarm QA** (recommended before showing the owner): run parallel scene builders + an independent QA critic
   (e.g., Mistral Vibe CLI `--model mistral-large-4-0` or motion/art-direction/marketing lenses) checking Reels safe zones
   (`y = 260..1540`, right `140 px` clear / `x ≤ 940`), zero-lorem, asset fidelity, and seam math; consolidate into one fix list.

## 6. Where things are

| Path | What |
|---|---|
| `core/render.py`, `core/sfx.py` | THE renderer + sfx mixer, driven by `<project>/video.json` (see README) |
| `core/kit.js`, `core/kit.css` | shared scene kit: easing, camera rig, designer actions (drawRect, typeText, dragSnap, …) |
| `templates/` | reusable parameterized scenes: transitions (zoom-through, whip), stats counter, browser scroll, chat |
| `tools/studio/` | HyperFrames Studio preview for our scenes (preview only; final renders stay on core) |
| `engines/<project>/` | the engine code each past project shipped with + `video.example.json` (reference implementations) |
| `scripts/`, `.github/workflows/render.yml` | CI: encrypted bundle → chunked render on GitHub Actions → encrypted output branch |
| `docs/method.md` | **how we reach the quality**: roles/agents, reference study, spec writing, visual toolbox with values, review loop, diagnosis→fix table |
| `docs/formats/` | the three format guides (structure, storyboard skeletons, do/don't) |
| `docs/review-checklist.md` | the review checklist + commands |
| `docs/lessons.md` | owner feedback history per project + what each previous video looked like |
| `docs/project-template/` | SPEC.md and video.json starting points |
| `PLAN_*.md` | design notes of past infrastructure work (history) |

**Project folder layout** (outside the repo, e.g. `/home/claude/<client>-video/`):
```
video.json  SPEC.md  design/ (final.html, brief.html, …)  scenes/*.html  engine/ (kit.js, project js/css)
assets/ (images, videos, outro)  fonts/  ref/ (live-site captures, reference video frames)  out/
```

## 7. Scene contract (all scenes, all formats)

```js
window.DURATION = 6.0;                 // seconds
window.seek = (t) => { /* pure: same t → same pixels; may return a Promise (e.g. video seeks) */ };
window.ready = Promise;                // fonts/images loaded
window.cutTimes = () => [2.4, 3.1];    // optional: hard cuts inside the scene (no blur across them)
window.shutterScale = (t) => 1;        // optional: 0..1 (e.g. 0.3 for readable scrolls)
window.motionPx = (a, b) => px;        // optional: motion estimate between times (else image-based estimate)
window.SFX = [{t: 1.2, type: 'whoosh'}];  // optional sound events
```
`seek` must be **pure** (no accumulated state, no wall-clock, no requestAnimationFrame-driven state); frames are
rendered out of order and in parallel chunks.
**`K.scene` 180° shutter rule:** `K.scene` passes `tc` (frame centre time) to `frame(S, tc, st)` while setting `S.tcam = t`
(the shutter sub-sample time). Always evaluate camera poses at `S.tcam` (e.g. `st.cam(S.tcam)` / `camPrecise(S, c, S.tcam)`),
never `tc` (`t` param); passing `tc` freezes the camera across sub-samples so `window.motionPx(a, b)` measures `0` (`N=1`, zero motion blur).

## 8. Working efficiently (tokens = cost)

- Reuse the engine and templates; design the storyboard and choreography fresh.
- Review with ONE contact sheet (small frames) + a few full-size stills, not dozens of images.
- Short reports (paths, timeline, open issues). Don't paste long files into messages.
- After 1–2 revision rounds, hand off to a fresh agent with a short SPEC_rN.md instead of continuing a long history.
- Wait for renders via background jobs/notifications, not repeated polling.

## 9. Roadmap / known gaps

- Music bed + beat-synced cuts (biggest remaining quality jump; needs licensed music from the owner).
- Seeded variants (palette/pace/camera energy from a seed, several drafts rendered in CI).
- Explainer format has not been produced yet — its guide is a starting design, refine it on the first job.
