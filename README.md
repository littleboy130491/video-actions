# motion render

Headless render runner. Project bundles in `bundles/` are AES-256 encrypted; the key lives only in the
`RENDER_KEY` repository secret. Rendered outputs are encrypted before being uploaded as artifacts.

## engines/
Motion engines used per project (code only — no designs, photos, scenes or videos):
`akr-v1` (first draft engine), `akr` (camera rig, designer actions, adaptive 180° shutter renderer),
`bsb` (+ continuous-cut camera path), `bygy` (light Figma-like workspace, one-take clock, brief slide, `--draft`,
declared `cutTimes`). Each engine expects a project folder with `design/`, `scenes/`, `assets/`, `fonts/`.
