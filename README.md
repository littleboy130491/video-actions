# motion render

Headless render runner. Project bundles in `bundles/` are AES-256 encrypted; the key lives only in the
`RENDER_KEY` repository secret. Rendered outputs are encrypted before being uploaded as artifacts.

## engines/
Motion engines used per project (code only — no designs, photos, scenes or videos):
`akr-v1` (first draft engine), `akr` (camera rig, designer actions, adaptive 180° shutter renderer),
`bsb` (+ continuous-cut camera path), `bygy` (light Figma-like workspace, one-take clock, brief slide, `--draft`,
declared `cutTimes`). Each engine expects a project folder with `design/`, `scenes/`, `assets/`, `fonts/`.
The per-engine `render2.py`/`sfx.py` still work unchanged; `engines/<x>/video.example.json` is that project's config
for the shared core below (copied from its `ORDER`/`PREBUILT`/`FINAL`).

## core/ — one renderer for every project
`core/render.py` (derived from the newest engine, `engines/imj/render2.py`: async `seek`, settle-checked captures,
adaptive 180° shutter with `MIN_N`) is driven by a `video.json` in the project folder:

```json
{"name": "tam", "order": ["o_open", "b_brief", "outro_client"], "prebuilt": {"outro_client": 6.5},
 "final": "tam_final.mp4", "draft_final": "tam_draft.mp4", "width": 1080, "height": 1920, "fps": 30,
 "port": 8773, "fonts": ["fonts/inter-latin-wght-normal.woff2"], "out": "out"}
```
Only `order` is required (defaults: 1080×1920, 30 fps, `out/`, `<name>_final.mp4`, `<name>_draft.mp4`).
`prebuilt` = pre-encoded `<out>/<scene>.mp4` files (same libx264 settings) joined with `concat -c copy`.

```
python3 core/render.py --project P                    # all scenes -> <out>/<final>
python3 core/render.py --project P --draft            # N=1, no shutter -> <out>/<draft_final>
python3 core/render.py --project P --scene s3 [--draft]
python3 core/render.py --project P --stills 1.2 30 [--sharp] [--outdir D]   # global times (local with --scene)
python3 core/render.py --project P --concat-only
python3 core/sfx.py   --project P [--draft]           # window.SFX events -> <final stem>_sfx.mp4
```
Scene contract: `window.DURATION`, `window.seek(t[,tc])` (may return a Promise), `window.ready`; optional
`cutTimes()`, `shutterScale(t)`, `motionPx(a,b)`, `SFX`. The local server is rooted at the project, so scenes keep
loading their own `../engine/*.js`; a port already used by another project's server is skipped automatically.
`core/kit.js` + `core/kit.css` are the shared scene kit (identical to the bygy/tam/imj copies) for new projects.

Missing fonts fail early with the file name instead of an opaque `NetworkError`: files in `fonts` and `url(...)` refs
in the scene HTML are checked before rendering; refs in linked stylesheets are warnings unless the page actually
requests them (any font request that 404s stops the render naming the file).

CI: `scripts/pack.sh` includes `video.json`; when a bundle has one, `scripts/render_chunk.py`, the finalize step and
`scripts/seal_out.sh` use `core/` (out dir + final name from the config), otherwise the project's own `engine*/render2.py`.
