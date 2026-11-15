# The production method (how we reach "premium" quality)

The quality of our finished videos did NOT come from a first attempt. It came from a repeatable loop:
**study references → precise spec → build with specialised agents → look at real frames → critique against a
written bar → targeted revision → owner review**. A good AI agent that skips steps produces a technically valid but
plain video. Follow this method.

---

## 1. Roles (one director + specialised agents)

The **director** (the agent talking to the owner) never writes most scene code itself. It:
- turns the owner's words into a written spec (`SPEC.md`, later `SPEC_rN.md` per revision),
- launches specialised agents IN PARALLEL with short prompts that point to the spec,
- reviews every result itself with a contact sheet + full-size stills before showing the owner,
- keeps the timeline map (scene ↔ global seconds) and the list of owner decisions.

Typical agents (each gets: "read SPEC.md fully, then only the files you need; report ≤ 8 lines"):

| Agent | Job | Output |
|---|---|---|
| A — Design reconstruction | Recreate the Figma page(s) / live site as static HTML with the `data-el` contract; download real assets; match fonts exactly | `design/*.html`, `assets/`, map json |
| B — Brief / assets | Brief slide, logo/rings SVG, page screenshots, outro trimming, live-site recordings (Playwright), reference frames | `design/brief.html`, `assets/pages/*`, `ref/*` |
| C — Lead engineer / scenes | Storyboard → scenes, camera, transitions, render draft, self-check | `scenes/*.html`, `out/<name>_draft.mp4` |
| Reviewers (swarm, optional) | 3 lenses in parallel: **motion designer** (easing, rhythm, camera, transitions, dead stretches), **art director** (composition, type, colour, safe zones, cheap/AI-ish details), **performance marketer** (scroll-stop in 1–2 s, retention, readability on mute, proof credibility). Each: score /10 + ranked, timestamped, concrete fixes | ≤ 14 lines each → director consolidates into `REVIEW_rN.md` |

Rules that make agents productive:
- Prompts are short and point to files; the SPEC carries all details. Never paste long content into prompts.
- One big revision round per agent. After 1–2 rounds start a FRESH agent with a short `SPEC_rN.md` (the long history
  is expensive and drifts).
- Small fixes can go back to the same agent (it still has context) with an exact list.
- Parallelise independent work in one message (design + assets + reference study).

## 2. Study the reference before designing

The owner usually sends a reference video (Obys, Skyscanner, Naver…). Don't guess its style:
1. Download/receive it, extract a contact sheet (`ffmpeg -vf "fps=2,scale=320:-1,tile=8x4"`), and look at 2–3 sheets.
2. Write 6–10 concrete traits into the SPEC: stage colour, type scale and behaviour, how screens are presented
   (flat / device / bent pages), transition types, cut rhythm (e.g. "8–12 cuts in 2 s between calm stretches"),
   cursor or not, camera moves.
3. Add the reference + traits to `docs/lessons.md` → reference library, and note which previous videos used which
   reference so the next one differs.

Also study the client's LIVE site with Playwright: preloader/opening transition (record 20–30 s with
`record_video_dir`), computed fonts (`getComputedStyle`), hero video source, real copy, layered hero images (e.g. a
ship PNG over a sea video). Faithfulness to the real site is noticed immediately by the owner.

## 3. Write the spec like a director, not like a coder

A good `SPEC.md` contains:
- **Goal + format + duration** and the reference traits.
- **Hard rules** (Figma read-only, no labels, no text over images, etc.) at the top.
- **Sources:** node ids, asset paths, colours (hex), fonts (files), real copy, outro file.
- **Storyboard table** with global times, what is on screen, camera move, and the JOINT TYPE of every cut
  (HARD / MATCH / CONTINUOUS / ZOOM-THROUGH / MASK-WIPE).
- **Motion vocabulary** for this video (which transitions, which easing, which signature moment).
- **Deliverable + verification** ("render --draft, one contact sheet every 0.5 s + 3 full-size stills at the busiest
  moments, self-critique against this spec, report ≤ 8 lines incl. timeline").

For revisions write `SPEC_rN.md`: quote the owner's feedback, **diagnose** what is wrong (e.g. "everything is small
and static on a big white page; motion = fades + small slides; pacing even and polite"), then give concrete fixes
with numbers (sizes, durations, easing, positions). Vague notes ("make it better") produce vague results.

## 4. The visual toolbox (values that worked)

**Camera grammar**
| Shot | Zoom | Use |
|---|---|---|
| Extreme close-up | 3–5× | text being typed, strokes, numbers, guides |
| Punch-in | 2–2.5× | precision detail: spacing pills, padding |
| Medium | 0.9–1.2× | building one section |
| Wide 3D | 0.25–0.75×, rotateX 18–28°, rotateZ −6…−10° | timelapse of many sections, reveals, card walls |
| Ultra wide | 0.2–0.3× | all pages of the site on the canvas |

- Never fully still: low-frequency drift (≤ 4 px, ≤ 0.3°, scale 1.00→1.04 over a hold).
- Easing: expo/quint in-out for camera moves (0.6–1.1 s), expo-out for arrivals, cubic for scroll. No linear, no
  bounce; springs only with small overshoot (~1.08).
- Photos available only at 1x: zoom ≤ 1.4×; for closer shots frame text/vectors and DOF-blur photos 6–10 px.

**Transitions** (every scene change is a designed move):
- Match cut (shape/colour/position continues across the cut).
- Continuous cut (camera starts moving ~0.8 s before the cut and keeps the same pose & speed after it; verify the
  last frame of A ≈ first frame of B).
- Zoom-through (camera dives into an element — a dot, a button, a card, a disc — that becomes the next background).
- Masked wipes (block masks, curved/diagonal colour floods, circle reveals), whip pans with blur.
- Type-as-mask (giant word filled with screenshots, then scale-through into the first image).
- Push to white before a white-opening outro.

**Typography**
- Hook words frame-wide (180–320 px, tracking −0.02…−0.04 em); headlines ≥ 96–140 px; labels ≥ 40–48 px (tiny tracked
  caps were unreadable on phones); consistent left margin ≥ 64–80 px; two-line headlines in the design's own layout.
- One weight heavier than feels necessary on white (thin Light text read weak on phones).

**Pacing**
- Fast-cut bursts only between calm stretches; owner disliked "flickering" 0.3 s card cuts → prefer one long,
  slick continuous move through the work (e.g. masonry with parallax columns).
- Each stat/claim held ≥ 1.0–1.2 s after it lands; each point ≈ 2.3–3 s; total 28–33 s + outro.
- Readable scroll: peak < 50 px/frame.

## 5. Look at frames — the review loop

After every render (agents do it too):
```bash
ffmpeg -v error -i out/x_draft.mp4 -vf "fps=1/1.3,scale=180:-1,tile=12x2" -frames:v 1 sheet.jpg     # whole timeline
ffmpeg -v error -ss 12.4 -i out/x_draft.mp4 -frames:v 1 still.png                                       # full size
```
- Check frames just before/after every cut (t−0.07, t, t+0.07) for jumps.
- Motion-energy scan: mean abs diff between frames every 0.5 s → flags dead stretches (camera died) and flicker.
- Go through `docs/review-checklist.md`. Fix what you find BEFORE showing the owner; list remaining weak spots
  honestly in the report.
- Then send the draft to the owner with a short timeline and the open questions (copy you invented, data you
  couldn't verify).

## 6. Typical diagnoses → fixes (from our revisions)

| Owner says | Usual cause | Fix |
|---|---|---|
| "motion is weak / doesn't entice" | small elements, dead white space, fades only, even pacing | frame-filling type and visuals, moving camera, designed transitions, speed ramps, 1–2 hero moments per act |
| "feels cheap" | text over busy images, generic carousel, small UI on big empty page | plain/gradient bg, bigger visuals, masonry/flat full-width screens, refined type |
| "abrupt / meaningless" | random stack/fan of pages, hard cut between similar shots | meaningful layout (pages in a row as in Figma), continuous camera path |
| "not natural / not a process" | mockups mid-process, placeholder boxes, cursor wiggles | one cumulative take, every action leaves a visible result |
| "too flickery" | 0.2–0.3 s cuts | long slick move, ~1 s per item |
| "transitions/zoom lacking" (after a minimalist pass) | minimal ≠ static | keep the luxury look but restore push-ins, zoom-throughs, match moves |
| "aesthetic not tidy" | inconsistent margins/sizes, elements touching edges | grid: one margin, consistent cap heights, optical alignment |

## 7. Render & deliver

- Draft: `python3 core/render.py --project P --draft` (no blur, fast).
- Final (after approval): `python3 core/render.py --project P` (adaptive 180° shutter, 4–128 samples, cutTimes
  respected) then `python3 core/sfx.py --project P` → `<name>_final_sfx.mp4`. Check 8 frames + ffprobe
  (1080×1920, 30 fps, duration, audio stream).
- Long renders: run in the background; on GitHub use the encrypted bundle pipeline (README).
