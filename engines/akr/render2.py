#!/usr/bin/env python3
"""AKR timelapse v2 renderer.

usage:
  python3 engine2/render2.py                       # all scenes -> out2/akr_timelapse_v3.mp4
  python3 engine2/render2.py --scene s3            # one scene -> out2/s3_hero.mp4 (no concat)
  python3 engine2/render2.py --stills 1.2 10.5 30  # PNG stills at GLOBAL times -> out2/stills/
  python3 engine2/render2.py --scene s3 --stills 0.5 2   # stills at LOCAL times of one scene
  python3 engine2/render2.py --concat-only         # concat existing per-scene files

Each scene page exposes window.DURATION, window.seek(t), window.ready.
Motion blur: a real 180-degree shutter. Each 30 fps output frame averages N sub-samples spread evenly over
[t-1/120, t+1/120]. N adapts to motion: scenes built on engine2/kit.js expose window.motionPx(a,b) (max screen
displacement of the canvas + cursor over the interval), so samples are never more than STEP_PX apart; other scenes
use an image-based estimate (phase correlation). Static frames use N=1.
"""
import argparse, io, os, socket, subprocess, sys, time
import numpy as np
from PIL import Image
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out2"
PORT = 8765
FPS = 30
ORDER = ["s1_hook", "s2_brief", "s3_hero", "s4_sections", "s5_detail", "s6_reveal", "s7_outro_client"]
# pre-encoded scene files (not HTML): the client's outro, trimmed from its frame 26 and re-encoded with the
# same libx264 settings (crf 18, veryfast, yuv420p, 30 fps, timescale 15360) so concat -c copy works
PREBUILT = {"s7_outro_client": 6.5}
FINAL = "akr_timelapse_v4.mp4"


def port_open(p):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", p)) == 0


def ensure_server():
    if port_open(PORT):
        return None
    proc = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--directory", str(ROOT)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(80):
        if port_open(PORT):
            return proc
        time.sleep(0.1)
    raise RuntimeError("http server did not start")


def resolve(name):
    for n in ORDER:
        if n == name or n.split("_")[0] == name:
            return n
    if (ROOT / "scenes" / f"{name}.html").exists():
        return name
    sys.exit(f"unknown scene {name}")


class Renderer:
    def __init__(self, pw):
        self.browser = pw.chromium.launch(channel="chrome", args=[
            "--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb",
            "--hide-scrollbars", "--disable-gpu-vsync", "--disable-frame-rate-limit"])
        self.ctx = self.browser.new_context(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
        self.page = None
        self.cur = None

    def open(self, name):
        if self.cur == name:
            return self.page
        if self.page:
            self.page.close()
        page = self.ctx.new_page()
        page.on("console", lambda m: print(f"  [{name} console]", m.type, m.text) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: print(f"  [{name} pageerror]", e))
        page.goto(f"http://127.0.0.1:{PORT}/scenes/{name}.html", wait_until="load")
        page.wait_for_function("typeof window.ready !== 'undefined' && typeof window.seek === 'function'", timeout=60000)
        page.evaluate("() => Promise.resolve(window.ready).then(() => true)")
        page.evaluate("() => document.fonts.ready.then(() => true)")
        self.page, self.cur = page, name
        return page

    def duration(self, name):
        return float(self.open(name).evaluate("window.DURATION"))

    def seek(self, t, tc=None):
        self.page.evaluate("([t, tc]) => { window.seek(t, tc); return new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))); }", [t, tc])

    def close(self):
        self.browser.close()


SHUTTER = 1 / 60      # 180 degree shutter at 30 fps
MAX_N = 128            # max sub-samples per output frame
STEP_PX = 2.0          # max screen distance between two sub-samples (no visible double edges)


def grab(R, t, tc=None):
    R.seek(t, tc)
    im = Image.open(io.BytesIO(R.page.screenshot(type="jpeg", quality=95))).convert("RGB")
    return np.asarray(im, dtype=np.float32)


def _small(a):
    g = a.mean(axis=2)
    return g.reshape(480, 4, 270, 4).mean(axis=(1, 3))


def image_motion(a, b):
    """estimate screen displacement (px) between two frames; returns (px, changed)"""
    A, B = _small(a), _small(b)
    d = np.abs(A - B)
    if np.percentile(d, 99.5) < 3.0:
        return 0.0, False
    win = np.outer(np.hanning(480), np.hanning(270))
    FA, FB = np.fft.rfft2((A - A.mean()) * win), np.fft.rfft2((B - B.mean()) * win)
    Rr = FA * np.conj(FB)
    Rr /= np.abs(Rr) + 1e-6
    c = np.fft.irfft2(Rr, s=A.shape)
    iy, ix = np.unravel_index(np.argmax(c), c.shape)
    conf = c.max() / (np.abs(c).mean() * c.size ** .5 + 1e-9)
    dy = iy if iy < 240 else iy - 480
    dx = ix if ix < 135 else ix - 270
    px = 4 * (dx * dx + dy * dy) ** .5
    if conf < 0.08:          # not a clean translation (zoom / rotation / many movers): be generous
        px = max(px, 60.0)
    return px, True


def shutter_frame(R, t, dur, has_motion, cuts=()):
    k = float(R.page.evaluate("t => typeof window.shutterScale === 'function' ? window.shutterScale(t) : 1", t))
    t0, t1 = max(0.0, t - k * SHUTTER / 2), min(dur, t + k * SHUTTER / 2)
    for c in cuts:                      # never integrate across a hard cut inside a scene
        if t0 < c <= t1:
            if t < c:
                t1 = c - 1e-4
            else:
                t0 = c
    if has_motion:
        d = float(R.page.evaluate("([a,b]) => window.motionPx(a,b)", [t0, t1]))
        n = int(min(MAX_N, max(1, np.ceil(d / STEP_PX))))
        if n == 1:
            return grab(R, t), 1
        times = [t0 + (k + .5) / n * (t1 - t0) for k in range(n)]
        acc = np.zeros((1920, 1080, 3), np.float32)
        for x in times:
            acc += grab(R, x, t)
        return acc / n, n
    a, b = grab(R, t0), grab(R, t1)
    px, changed = image_motion(a, b)
    if not changed:
        return (a + b) / 2, 2
    n = int(min(MAX_N, max(2, np.ceil(px / STEP_PX) + 1)))
    times = [t0 + k / (n - 1) * (t1 - t0) for k in range(n)]
    acc = a + b
    for x in times[1:-1]:
        acc += grab(R, x)
    return acc / n, n


def render_scene(R, name):
    dur = R.duration(name)
    has_motion = bool(R.page.evaluate("typeof window.motionPx === 'function'"))
    cuts = R.page.evaluate("typeof window.cutTimes === 'function' ? window.cutTimes() : []")
    n = int(round(dur * FPS))
    tmp = OUT / f"tmp_{name}.mp4"
    final = OUT / f"{name}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", "1080x1920",
           "-framerate", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
           "-pix_fmt", "yuv420p", "-r", str(FPS), "-movflags", "+faststart", str(tmp)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t_start = time.time()
    ok = False
    samples = 0
    try:
        for i in range(n):
            t = i / FPS
            fr, k = shutter_frame(R, t, dur, has_motion, cuts)
            samples += k
            ff.stdin.write(np.clip(fr + .5, 0, 255).astype(np.uint8).tobytes())
            if i % 30 == 0:
                print(f"  {name}: frame {i}/{n} t={t:.2f} N={k} ({time.time() - t_start:.0f}s)", flush=True)
        ok = True
    finally:
        ff.stdin.close()
        rc = ff.wait()
    if not ok or rc != 0:
        tmp.unlink(missing_ok=True)
        raise RuntimeError(f"render failed for {name} (ffmpeg exit {rc})")
    os.replace(tmp, final)
    print(f"  {name}: {n} frames, {samples} samples -> {final} ({time.time() - t_start:.0f}s)")
    return final


def concat(files, dst):
    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{f.resolve()}'\n" for f in files))
    tmp = OUT / ("tmp_" + dst.name)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    "-movflags", "+faststart", str(tmp)], check=True)
    os.replace(tmp, dst)
    lst.unlink()


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--stills", nargs="*", type=float, default=None)
    ap.add_argument("--scene", default=None)
    ap.add_argument("--concat-only", action="store_true")
    ap.add_argument("--sharp", action="store_true", help="stills without motion blur")
    ap.add_argument("--outdir", default=None, help="stills dir (default out2/stills)")
    a = ap.parse_args()
    OUT.mkdir(exist_ok=True)
    if a.concat_only:
        files = [OUT / f"{n}.mp4" for n in ORDER]
        miss = [str(f) for f in files if not f.exists()]
        if miss:
            sys.exit("missing: " + ", ".join(miss))
        concat(files, OUT / FINAL)
        print("wrote", OUT / FINAL)
        return
    srv = ensure_server()
    try:
        with sync_playwright() as pw:
            R = Renderer(pw)
            if a.stills is not None:
                sd = Path(a.outdir) if a.outdir else OUT / "stills"
                sd.mkdir(parents=True, exist_ok=True)
                if a.scene:
                    name = resolve(a.scene)
                    jobs = [(name, t, t) for t in a.stills]
                else:
                    # global times -> (scene, local)
                    starts, acc = [], 0.0
                    for n in ORDER:
                        if n in PREBUILT:
                            starts.append((n, acc, PREBUILT[n]))
                            acc += PREBUILT[n]
                            continue
                        if not (ROOT / "scenes" / f"{n}.html").exists():
                            print("  (missing scene, skipped in timeline)", n)
                            continue
                        d = R.duration(n)
                        starts.append((n, acc, d))
                        acc += d
                    jobs = []
                    for g in a.stills:
                        for n, s0, d in starts:
                            if s0 <= g < s0 + d or (n == starts[-1][0] and g >= s0):
                                jobs.append((n, g - s0, g))
                                break
                for name, lt, g in jobs:
                    p = sd / f"still_{g:06.3f}_{name}.png"
                    if name in PREBUILT:
                        subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{lt:.4f}", "-i", str(OUT / f"{name}.mp4"),
                                        "-frames:v", "1", str(p)], check=True)
                        print("still", p, f"(local {lt:.3f})")
                        continue
                    R.open(name)
                    if a.sharp:
                        R.seek(lt)
                        R.page.screenshot(path=str(p), type="png")
                    else:
                        d = R.duration(name)
                        hm = bool(R.page.evaluate("typeof window.motionPx === 'function'"))
                        cuts = R.page.evaluate("typeof window.cutTimes === 'function' ? window.cutTimes() : []")
                        fr, k = shutter_frame(R, lt, d, hm, cuts)
                        Image.fromarray(np.clip(fr + .5, 0, 255).astype(np.uint8)).save(p)
                    print("still", p, f"(local {lt:.3f})")
            else:
                names = [resolve(a.scene)] if a.scene else ORDER
                missing = [n for n in names if n not in PREBUILT and not (ROOT / "scenes" / f"{n}.html").exists()]
                missing += [n for n in names if n in PREBUILT and not (OUT / f"{n}.mp4").exists()]
                if missing:
                    sys.exit("missing scenes: " + ", ".join(missing))
                files = []
                for n in names:
                    files.append(OUT / f"{n}.mp4" if n in PREBUILT else render_scene(R, n))
                if not a.scene:
                    dst = OUT / FINAL
                    concat(files, dst)
                    print("wrote", dst)
            R.close()
    finally:
        if srv:
            srv.terminate()


if __name__ == "__main__":
    main()
