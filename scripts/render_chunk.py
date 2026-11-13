#!/usr/bin/env python3
"""render_chunk.py <workdir> <scene> <chunk_index> <chunk_count> [--draft]
Renders one contiguous slice of a scene's frames, same encoder settings, to <OUT>/<scene>.part<NN>.mp4.
Renderer: core/render.py driven by <workdir>/video.json when the bundle has one, else the project's own engine
(engine/ or engine2/render2.py). Pre-encoded scenes (e.g. client outro) are skipped."""
import importlib.util, subprocess, sys, time
from pathlib import Path
import numpy as np

work = Path(sys.argv[1]).resolve(); scene = sys.argv[2]; k = int(sys.argv[3]); K = int(sys.argv[4])
draft = "--draft" in sys.argv[5:]
if (work / "video.json").exists():
    rp = Path(__file__).resolve().parent.parent / "core" / "render.py"
else:
    rp = next(p for p in [work / "engine" / "render2.py", work / "engine2" / "render2.py"] if p.exists())
spec = importlib.util.spec_from_file_location("render2", rp); R2 = importlib.util.module_from_spec(spec)
sys.argv = [str(rp)]; spec.loader.exec_module(R2)
if hasattr(R2, "configure"):
    R2.configure(work, draft=draft)
    R2.preflight(R2.resolve(scene))     # clear error on missing fonts before the browser starts
W, H = getattr(R2, "WIDTH", 1080), getattr(R2, "HEIGHT", 1920)
from playwright.sync_api import sync_playwright

name = R2.resolve(scene)
if name in getattr(R2, "PREBUILT", {}):
    print("prebuilt scene, nothing to render"); sys.exit(0)
R2.OUT.mkdir(exist_ok=True)
srv = R2.ensure_server()
try:
    with sync_playwright() as pw:
        R = R2.Renderer(pw); R.open(name)
        dur = R.duration(name)
        has_motion = bool(R.page.evaluate("typeof window.motionPx === 'function'"))
        cuts = R.page.evaluate("typeof window.cutTimes === 'function' ? window.cutTimes() : []")
        n = int(round(dur * R2.FPS)); a = n * k // K; b = n * (k + 1) // K
        out = R2.OUT / f"{name}.part{k:02d}.mp4"; tmp = R2.OUT / f"tmp_{name}.part{k:02d}.mp4"
        cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{W}x{H}",
               "-framerate", str(R2.FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
               "-pix_fmt", "yuv420p", "-r", str(R2.FPS), "-video_track_timescale", "15360", str(tmp)]
        ff = subprocess.Popen(cmd, stdin=subprocess.PIPE); t0 = time.time()
        for i in range(a, b):
            t = i / R2.FPS
            fr = R2.grab(R, t, settle=True) if draft else R2.shutter_frame(R, t, dur, has_motion, cuts)[0]
            ff.stdin.write(np.clip(fr + .5, 0, 255).astype(np.uint8).tobytes())
            if (i - a) % 15 == 0: print(f"{name} chunk {k}/{K}: frame {i} [{a},{b}) {time.time()-t0:.0f}s", flush=True)
        ff.stdin.close()
        if ff.wait() != 0: sys.exit("ffmpeg failed")
        tmp.replace(out); print(f"done {out.name}: {b-a} frames in {time.time()-t0:.0f}s")
        R.close()
finally:
    if srv: srv.terminate()
