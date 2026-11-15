# Format: Explainer

**Goal:** explain ONE thing clearly — a service (e.g. "how we build your website"), a process (discovery → design →
development → launch), or a concept (why page speed matters) — so a non-technical decision-maker understands it in
30–60 s. Clarity first, polish second, but still at our premium bar. **Not produced yet** — this guide is the
starting design; refine it after the first job and record lessons in `docs/lessons.md`.

## Inputs
- A script or bullet brief from the owner (ask for it; don't invent claims). Language (EN/ID).
- Whether there is a voice-over (recorded by the owner) or on-screen text only (mute-first viewing is the default
  on Reels/TikTok → on-screen text must carry the message).
- Real examples to show (portfolio sites, screenshots, numbers that are measured).

## Structure (default)
| Part | ≈ s | Content |
|---|---|---|
| Question hook | 2–3 | The viewer's problem as a question, frame-wide type + one visual by 1.5 s ("Why is your website slow?") |
| Context | 4–6 | Why it matters, one simple visual metaphor or real example |
| Steps | 15–30 | 3–5 numbered steps; ONE idea per screen; each step = short headline (≤ 6 words) + one visual that SHOWS it (diagram building itself, UI demo, before/after) |
| Result / proof | 4–6 | Outcome with real evidence (before/after, measured metric, client example) |
| Outro | 6.5 | Standard outro |

## Motion language for explainers
- Diagrams that draw themselves (strokes, arrows, boxes connecting) and then become the real UI (like the
  sketch → site scene), progress indicators across steps (a thin step rail 1–2–3–4 is OK as designed content).
- Continuous camera through a single "world" (one canvas the camera travels across from step to step) reads clearer
  than unrelated scenes.
- Text timing: ≥ 0.3 s per word, max ~12 words on screen; keep it in the safe zone (y 260–1540).
- If a voice-over exists: cut to the VO timing (put the script with timestamps in the SPEC), keep sfx under it.
- Reuse: `templates/browser_stage.html` (UI demos), `templates/counter.html` (metrics),
  `templates/chat_thread.html`, `templates/transition.js`.
