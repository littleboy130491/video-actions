# Working principles — references, parts, and our own design

How we use example videos and example PARTS without replicating them. Read after `docs/method.md`.
Core principle: a reference defines the **grammar** (what "premium" costs in scale, pacing, designed transitions);
our video pays those costs with **our own vocabulary** (AGENTS.md rule 4).

## 1. References: file in, frames first

- The owner sends the **actual file** (mp4/mov) into the project's `ref/` — never a streaming link (YouTube cannot
  be downloaded in our environment), and never into this repo (code only, AGENTS.md rule 8).
- Study = **look at frames, not words**: contact sheets (`ffmpeg -vf "fps=2,scale=320:-1,tile=8x4"`), full-size
  stills at the busiest moments and around cuts, a frame-diff scan for cut rhythm and camera velocity.
- Distill **6–10 concrete traits** into `SPEC.md`: numbers, hex, seconds, timestamps — never vibes ("premium",
  "slick"). Log the reference in `docs/lessons.md` → reference library with its "used by" videos.
- Agents with frame access re-extract the reference frames at the SPEC's timestamps themselves; the written traits
  are only an index. Interpretation drift is caught by the render-and-compare loop (our contact sheet vs the
  reference sheet, stills at matching timestamps) — never trusted from text alone.

## 2. Adapt, never replicate — made mechanical

`SPEC.md` gets a table decomposing every reference trait:

| reference trait (number + timestamp) | principle | keep / adapt / drop | our instantiation |
|---|---|---|---|

- No storyboard row ships without naming the principle it uses and how ours differs.
- Review runs in **three passes**, each with its own criterion:
  1. **quality bar** — measurable traits (type ≥ 96 px, motion energy every ~1 s, designed cuts, safe zones); our
     frames are compared to reference frames ONLY here;
  2. **differentiation** — our contact sheet vs the previous videos in `docs/lessons.md`, never vs the reference;
  3. **signature** — 1–2 hero moments per act that are ours alone; a video with no signature moment is a cover
     version and fails this pass.
- Wire the review-swarm lenses to these passes (motion designer → 1, art director → 2+3, marketer → scroll-stop).
  No reviewer is ever asked "does it match the reference."
- The owner report includes "what we took / what we changed and why" next to the timeline, so feedback lands on our
  departures, not on generic similarity.
- A revision fix that says "more like the reference" is rejected — rewrite it as a number (size, duration, easing,
  position).

## 3. Parts array ("Frankenstein" done right)

Borrow parts from many examples, then normalize so the assembly reads as ONE video:

1. **Catalog**: every example part (client-sent references AND our past videos) gets an entry: thumbnail strip +
   type / duration / energy / palette / type scale / easing / camera move / best-used-when. Selection quality is
   capped by metadata quality — invest here first.
2. **Skeleton first**: the format guide + brief define the beats (hook → brief → process → …). For each beat pick
   ONE catalog part, justified in the SPEC by attribute match. Cap: **≤ 2–3 borrowed parts per video**, one of
   them the signature moment; everything else comes from our engine + `templates/`.
3. **Variants**: render **2–3 assemblies** (different parts/order, same tokens) as drafts in one CI run; the owner
   picks from contact sheets. Choosing beats revising.
4. **Normalization layer** — declared once per video, enforced afterwards:
   - tokens: palette (hex), type scale, easing set, margin → `video.json`/SPEC params; templates take them via
     `window.PARAMS` so a borrowed part cannot bring its own style; sample rendered frames and compare dominant
     colours against the tokens;
   - camera grammar: one declared vocabulary per video; scenes lint against it;
   - pacing grid: calm/burst positions fixed in the storyboard; the global motion-energy scan verifies the assembly;
   - transition vocabulary: every cut's joint type declared (HARD/MATCH/CONTINUOUS/ZOOM-THROUGH); the t±0.07
     frame check catches seams.
5. **Coherence pass** in review: one lens whose only job is "does this read as one video, not five?" Its fixes are
   mechanical (re-token a part, swap a transition, re-time a burst) — that is what makes an assembled video
   repairable instead of a patchwork.
