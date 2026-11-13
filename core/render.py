#!/usr/bin/env python3
"""Shared scene renderer for every project (derived from engines/imj/render2.py), driven by <project>/video.json.

usage (PROJECT = folder with video.json, scenes/, engine/, assets/, fonts/; default: current directory):
  python3 core/render.py --project P                       # all scenes -> <out>/<final> (adaptive shutter)
  python3 core/render.py --project P --draft               # N=1, no shutter -> <out>/draft_<scene>.mp4 + <out>/<draft_final>
  python3 core/render.py --project P --draft --scene a2    # re-render one draft scene, then re-concat the draft
  python3 core/render.py --project P --scene s3            # one scene -> <out>/s3_hero.mp4 (no concat)
  python3 core/render.py --project P --stills 1.2 10.5 30  # PNG stills at GLOBAL times -> <out>/stills/
  python3 core/render.py --project P --scene s3 --stills 0.5 2   # stills at LOCAL times of one scene
  python3 core/render.py --project P --concat-only         # concat existing per-scene files

video.json:
  {"name": "tam", "order": ["o_open", "b_brief", "outro_client"], "prebuilt": {"outro_client": 6.5},
   "final": "tam_final.mp4", "draft_final": "tam_draft.mp4", "width": 1080, "height": 1920, "fps": 30,
   "port": 8773, "fonts": ["fonts/inter-latin-wght-normal.woff2"], "out": "out"}
  Only "order" is required. prebuilt = pre-encoded scene files <out>/<name>.mp4 (same libx264 settings as the scene
  files: High, crf 18, veryfast, yuv420p, fps, timescale 1/15360) so concat -c copy works. fonts = font files that
  must exist (checked before rendering). out defaults to "out".

Scene contract: window.DURATION, window.seek(t[,tc]) (may return a Promise), window.ready (promise/flag); optional
window.cutTimes(), window.shutterScale(t), window.motionPx(a,b), window.SFX.
Motion blur: a real 180-degree shutter. Each output frame averages N sub-samples spread evenly over [t-1/(4fps),
t+1/(4fps)]. N adapts to motion: scenes that expose window.motionPx(a,b) get samples never more than STEP_PX apart;
other scenes use an image-based estimate (phase correlation). Static frames use N=1.
"""
import argparse, io, json, os, re, socket, subprocess, sys, time, urllib.request
from pathlib import Path
from urllib.parse import urlparse, unquote

import numpy as np
from PIL import Image

# ---- project config (set by configure()) ----
ROOT = None            # project folder (served over http)
OUT = None
CFG = {}
NAME = "video"
PORT = 8780
FPS = 30
WIDTH, HEIGHT = 1080, 1920
ORDER = []
PREBUILT = {}
FINAL = "video_final.mp4"
DRAFT_FINAL = "video_draft.mp4"
FONTS = []
DRAFT = False          # --draft: one sample per frame (N=1), no shutter; scene files <out>/draft_<name>.mp4

FONT_EXT = (".woff2", ".woff", ".ttf", ".otf")


def configure(project, draft=None):
    """load <project>/video.json into the module globals (also used by scripts/render_chunk.py)"""
    global ROOT, OUT, CFG, NAME, PORT, FPS, WIDTH, HEIGHT, ORDER, PREBUILT, FINAL, DRAFT_FINAL, FONTS, DRAFT
    ROOT = Path(project).resolve()
    vj = ROOT / "video.json"
    if not vj.exists():
        sys.exit(f"no video.json in {ROOT} (see core/render.py docstring or engines/*/video.example.json)")
    try:
        CFG = json.loads(vj.read_text())
    except json.JSONDecodeError as e:
        sys.exit(f"{vj}: invalid JSON: {e}")
    if not CFG.get("order"):
        sys.exit(f"{vj}: 'order' (list of scene names) is required")
    NAME = CFG.get("name") or ROOT.name
    ORDER = list(CFG["order"])
    PREBUILT = {k: float(v) for k, v in (CFG.get("prebuilt") or {}).items()}
    FINAL = CFG.get("final") or f"{NAME}_final.mp4"
    DRAFT_FINAL = CFG.get("draft_final") or f"{NAME}_draft.mp4"
    WIDTH, HEIGHT = int(CFG.get("width", 1080)), int(CFG.get("height", 1920))
    if WIDTH % 2 or HEIGHT % 2:
        sys.exit(f"{vj}: width/height must be even (yuv420p), got {WIDTH}x{HEIGHT}")
    FPS = int(CFG.get("fps", 30))
    PORT = int(CFG.get("port", 8780))
    FONTS = list(CFG.get("fonts") or [])
    OUT = ROOT / CFG.get("out", "out")
    if draft is not None:
        DRAFT = bool(draft)
    return CFG


# ---- local http server rooted at the project ----

def port_open(p):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", p)) == 0


def _serves_this_project(p):
    """a server already on port p is reused only if it serves this project's video.json"""
    try:
        with urllib.request.urlopen(f"http://127.0.0.1:{p}/video.json", timeout=1) as r:
            return r.read() == (ROOT / "video.json").read_bytes()
    except Exception:
        return False


def ensure_server():
    global PORT
    if port_open(PORT):
        if _serves_this_project(PORT):
            return None
        busy = PORT
        while port_open(PORT):          # another project's server: take the next free port
            PORT += 1
        print(f"  port {busy} is used by another server, serving {ROOT.name} on {PORT}")
    proc = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--bind", "127.0.0.1",
                             "--directory", str(ROOT)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
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


# ---- font / asset preflight ----

_URL_RE = re.compile(r"""url\(\s*(['"]?)([^'")]+)\1\s*\)""")
_LINK_RE = re.compile(r"""<link\b[^>]*\bhref\s*=\s*(['"])([^'"]+\.css)\1""", re.I)
_IMPORT_RE = re.compile(r"""@import\s+(?:url\()?\s*['"]?([^'")\s;]+)""")


def _local(ref, base):
    """resolve a relative url(...) / href against the file that contains it; None for data:/http(s)/absolute urls"""
    ref = ref.strip().split("#")[0].split("?")[0]
    if not ref or re.match(r"^[a-z][a-z0-9+.-]*:", ref, re.I) or ref.startswith("//"):
        return None
    if ref.startswith("/"):
        return ROOT / unquote(ref.lstrip("/"))
    return (base.parent / unquote(ref)).resolve()


def _rel(p):
    try:
        return str(Path(p).resolve().relative_to(ROOT))
    except ValueError:
        return str(p)


def preflight(name):
    """static check of font files: video.json 'fonts' and url(...) refs in the scene HTML must exist (fatal); refs in
    linked stylesheets are only warned about here (shared CSS often declares faces a scene never uses) - if the page
    actually requests one, the runtime check in Renderer.open() fails with the file name."""
    errs, warns = [], []
    for f in FONTS:
        if not (ROOT / f).exists():
            errs.append(f"{f} (listed in video.json 'fonts')")
    html = ROOT / "scenes" / f"{name}.html"
    if not html.exists():
        return
    src = html.read_text(errors="replace")
    for _, ref in _URL_RE.findall(src):
        p = _local(ref, html)
        if p and p.suffix.lower() in FONT_EXT and not p.exists():
            errs.append(f"{_rel(p)} (url({ref}) in scenes/{name}.html)")
    seen, todo = set(), [_local(h, html) for _, h in _LINK_RE.findall(src)]
    while todo:
        css = todo.pop()
        if not css or css in seen:
            continue
        seen.add(css)
        if not css.exists():
            warns.append(f"stylesheet {_rel(css)} missing (linked from scenes/{name}.html)")
            continue
        txt = css.read_text(errors="replace")
        todo += [_local(h, css) for h in _IMPORT_RE.findall(txt)]
        for _, ref in _URL_RE.findall(txt):
            p = _local(ref, css)
            if p and p.suffix.lower() in FONT_EXT and not p.exists():
                warns.append(f"font {_rel(p)} missing (url({ref}) in {_rel(css)}; fatal only if a scene uses it)")
    for w in warns:
        print(f"  [{name} preflight] warning: {w}")
    if errs:
        sys.exit(f"missing font file(s) for scene {name}:\n  " + "\n  ".join(errs) +
                 f"\ncopy them into {ROOT / 'fonts'} (or fix the url) and render again")


# resource load errors (<img>, <link>, <script>, <video>) seen by the page, captured before any scene script runs
_INIT_JS = """(() => { window.__resErrors = [];
  addEventListener('error', e => { const t = e.target; if (t && t !== window && (t.src || t.href))
    window.__resErrors.push(t.currentSrc || t.src || t.href); }, true); })();"""


class Renderer:
    def __init__(self, pw):
        self.browser = pw.chromium.launch(channel="chrome", args=[
            "--font-render-hinting=none", "--disable-lcd-text", "--force-color-profile=srgb",
            "--hide-scrollbars", "--disable-gpu-vsync", "--disable-frame-rate-limit",
            "--force-gpu-mem-available-mb=4096"])   # large tile budget: huge 3D-transformed layers rasterize completely
        self.ctx = self.browser.new_context(viewport={"width": WIDTH, "height": HEIGHT}, device_scale_factor=1)
        self.ctx.add_init_script(_INIT_JS)
        self.page = None
        self.cur = None
        self.failed = []

    def _note_fail(self, url, why):
        if urlparse(url).path == "/favicon.ico":
            return
        if url not in [u for u, _ in self.failed]:
            self.failed.append((url, why))

    def _missing_report(self, name):
        files = []
        for url, why in self.failed:
            path = unquote(urlparse(url).path).lstrip("/")
            files.append((path, why))
        fonts = [f for f in files if f[0].lower().endswith(FONT_EXT)]
        other = [f for f in files if f not in fonts]
        for p, why in other:
            print(f"  [{name}] warning: could not load {p} ({why})")
        if fonts:
            sys.exit(f"scene {name}: font file(s) failed to load (this is the cause of any 'NetworkError' above):\n  " +
                     "\n  ".join(f"{ROOT / p} ({why})" for p, why in fonts) +
                     f"\ncopy them into {ROOT / 'fonts'} (or fix the @font-face url) and render again")

    def open(self, name):
        if self.cur == name:
            return self.page
        if self.page:
            self.page.close()
        preflight(name)
        self.failed = []
        page = self.ctx.new_page()
        page.on("console", lambda m: print(f"  [{name} console]", m.type, m.text) if m.type in ("error", "warning") else None)
        page.on("pageerror", lambda e: print(f"  [{name} pageerror]", e))
        page.on("response", lambda r: self._note_fail(r.url, f"HTTP {r.status}") if r.status >= 400 else None)
        page.on("requestfailed", lambda q: self._note_fail(q.url, q.failure or "failed"))
        try:
            page.goto(f"http://127.0.0.1:{PORT}/scenes/{name}.html", wait_until="load")
            page.wait_for_function("typeof window.ready !== 'undefined' && typeof window.seek === 'function'", timeout=60000)
            page.evaluate("() => Promise.resolve(window.ready).then(() => true)")
            page.evaluate("() => document.fonts.ready.then(() => true)")
        except Exception:
            self._missing_report(name)      # exits with the file names if a font was missing
            raise
        for u in page.evaluate("() => window.__resErrors || []"):
            self._note_fail(u, "error event")
        self._missing_report(name)
        self.page, self.cur = page, name
        return page

    def duration(self, name):
        return float(self.open(name).evaluate("window.DURATION"))

    def seek(self, t, tc=None):
        self.page.evaluate("([t, tc]) => Promise.resolve(window.seek(t, tc)).then(() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r()))))", [t, tc])

    def close(self):
        self.browser.close()


MAX_N = 128            # max sub-samples per output frame
MIN_N = 4              # min sub-samples whenever anything changed
STEP_PX = 2.0          # max screen distance between two sub-samples (no visible double edges)
SETTLE_ALL = False     # settle-check every sub-sample (slow); default: first + last sample of each frame
SETTLE_MAX = 8


def shutter():
    """180 degree shutter: half a frame (1/60 s at 30 fps)"""
    return 1 / (2 * FPS)


def _shot(R):
    return np.asarray(Image.open(io.BytesIO(R.page.screenshot(type="jpeg", quality=95))).convert("RGB"), dtype=np.float32)


def grab(R, t, tc=None, settle=False):
    """screenshot at t. settle=True: Chrome rasterizes big 3D-transformed layers asynchronously (tiles/images can be
    missing in the first capture), so re-capture until two consecutive captures agree."""
    R.seek(t, tc)
    a = _shot(R)
    if not settle:
        return a
    for _ in range(SETTLE_MAX):
        R.page.evaluate("() => new Promise(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))")
        b = _shot(R)
        if np.percentile(np.abs(_small(a) - _small(b)), 99.9) < 2.0:
            return b
        a = b
    print(f"  warning: raster did not settle at t={t:.3f}")
    return a


def _small(a):
    """grey 4x4-block downsample (crops to a multiple of 4)"""
    h, w = a.shape[0] // 4, a.shape[1] // 4
    g = a[:h * 4, :w * 4].mean(axis=2)
    return g.reshape(h, 4, w, 4).mean(axis=(1, 3))


def image_motion(a, b):
    """estimate screen displacement (px) between two frames; returns (px, changed)"""
    A, B = _small(a), _small(b)
    d = np.abs(A - B)
    if d.max() < 2.0:                      # truly static (any small mover also counts as change)
        return 0.0, False
    if np.percentile(d, 99.5) < 3.0:       # only a small area changed: phase correlation can't see it
        return 40.0, True                  # -> ~21 samples, spacing small enough for a fast small mover
    h, w = A.shape
    win = np.outer(np.hanning(h), np.hanning(w))
    FA, FB = np.fft.rfft2((A - A.mean()) * win), np.fft.rfft2((B - B.mean()) * win)
    Rr = FA * np.conj(FB)
    Rr /= np.abs(Rr) + 1e-6
    c = np.fft.irfft2(Rr, s=A.shape)
    iy, ix = np.unravel_index(np.argmax(c), c.shape)
    conf = c.max() / (np.abs(c).mean() * c.size ** .5 + 1e-9)
    dy = iy if iy < h // 2 else iy - h
    dx = ix if ix < w // 2 else ix - w
    px = 4 * (dx * dx + dy * dy) ** .5
    if conf < 0.08:          # not a clean translation (zoom / rotation / many movers): be generous
        px = max(px, 60.0)
    return px, True


def shutter_frame(R, t, dur, has_motion, cuts=()):
    if DRAFT:
        return grab(R, t, settle=True), 1
    k = float(R.page.evaluate("t => typeof window.shutterScale === 'function' ? window.shutterScale(t) : 1", t))
    sh = shutter()
    t0, t1 = max(0.0, t - k * sh / 2), min(dur, t + k * sh / 2)
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
            return grab(R, t, settle=True), 1
        times = [t0 + (k + .5) / n * (t1 - t0) for k in range(n)]
        acc = np.zeros((HEIGHT, WIDTH, 3), np.float32)
        for i, x in enumerate(times):
            acc += grab(R, x, t, settle=(i == 0 or i == n - 1 or SETTLE_ALL))
        return acc / n, n
    a, b = grab(R, t0), grab(R, t1)
    px, changed = image_motion(a, b)
    if not changed:
        return grab(R, t, settle=True), 1   # static: one sharp sample, never a 2-sample blend
    n = int(min(MAX_N, max(MIN_N, np.ceil(px / STEP_PX) + 1)))
    times = [t0 + k / (n - 1) * (t1 - t0) for k in range(n)]
    acc = a + b
    for x in times[1:-1]:
        acc += grab(R, x)
    return acc / n, n


def ffmpeg_cmd(dst, extra=("-movflags", "+faststart")):
    """raw rgb24 frames on stdin -> libx264 (same settings as every engine, so concat -c copy works)"""
    return ["ffmpeg", "-y", "-loglevel", "error", "-f", "rawvideo", "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}",
            "-framerate", str(FPS), "-i", "-", "-c:v", "libx264", "-crf", "18", "-preset", "veryfast",
            "-pix_fmt", "yuv420p", "-r", str(FPS), *extra, str(dst)]


def to_bytes(fr):
    return np.clip(fr + .5, 0, 255).astype(np.uint8).tobytes()


def render_scene(R, name):
    dur = R.duration(name)
    has_motion = bool(R.page.evaluate("typeof window.motionPx === 'function'"))
    cuts = R.page.evaluate("typeof window.cutTimes === 'function' ? window.cutTimes() : []")
    n = int(round(dur * FPS))
    tmp = OUT / f"tmp_{'draft_' if DRAFT else ''}{name}.mp4"
    final = scene_file(name)
    ff = subprocess.Popen(ffmpeg_cmd(tmp), stdin=subprocess.PIPE)
    t_start = time.time()
    ok = False
    samples = 0
    try:
        for i in range(n):
            t = i / FPS
            fr, k = shutter_frame(R, t, dur, has_motion, cuts)
            samples += k
            ff.stdin.write(to_bytes(fr))
            if i % FPS == 0:
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


def scene_file(name):
    if name in PREBUILT:
        return OUT / f"{name}.mp4"
    return OUT / f"{'draft_' if DRAFT else ''}{name}.mp4"


def scene_exists(n):
    return (ROOT / "scenes" / f"{n}.html").exists()


def sfx_events(R):
    """collect window.SFX (local times) of every scene -> <out>/sfx_events.json in global seconds (read by sfx.py)"""
    acc, ev = 0.0, {"clicks": [], "typing": [], "whoosh": [], "ticks": [], "scenes": []}
    for n in ORDER:
        if n in PREBUILT:
            ev["scenes"].append([n, acc, PREBUILT[n]]); ev["outro"] = acc; acc += PREBUILT[n]; continue
        if not scene_exists(n):
            continue
        d = R.duration(n)
        x = R.page.evaluate("window.SFX || {}")
        for k in ("clicks", "ticks"):
            ev[k] += [acc + float(v) for v in x.get(k, [])]
        ev["typing"] += [[acc + a, acc + b] for a, b in x.get("typing", [])]
        ev["whoosh"] += [[acc + a, dd, amp] for a, dd, amp in x.get("whoosh", [])]
        ev["scenes"].append([n, acc, d]); acc += d
    ev["duration"] = acc
    (OUT / "sfx_events.json").write_text(json.dumps(ev, indent=1))
    print("wrote", OUT / "sfx_events.json", f"(timeline {acc:.2f}s)")


def concat(files, dst):
    lst = OUT / "concat.txt"
    lst.write_text("".join(f"file '{f.resolve()}'\n" for f in files))
    tmp = OUT / ("tmp_" + dst.name)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-c", "copy",
                    "-movflags", "+faststart", str(tmp)], check=True)
    os.replace(tmp, dst)
    lst.unlink()


def save_png(fr, p):
    Image.fromarray(np.clip(fr + .5, 0, 255).astype(np.uint8)).save(p)


def stills(R, a):
    sd = Path(a.outdir) if a.outdir else OUT / "stills"
    sd.mkdir(parents=True, exist_ok=True)
    if a.scene:
        name = resolve(a.scene)
        jobs = [(name, t, t) for t in a.stills]
    else:                                   # global times -> (scene, local)
        starts, acc = [], 0.0
        for n in ORDER:
            if n in PREBUILT:
                starts.append((n, acc, PREBUILT[n])); acc += PREBUILT[n]; continue
            if not scene_exists(n):
                print("  (missing scene, skipped in timeline)", n); continue
            d = R.duration(n)
            starts.append((n, acc, d)); acc += d
        jobs = []
        for g in a.stills:
            for n, s0, d in starts:
                if s0 <= g < s0 + d or (n == starts[-1][0] and g >= s0):
                    jobs.append((n, g - s0, g)); break
    for name, lt, g in jobs:
        p = sd / f"still_{g:06.3f}_{name}.png"
        if name in PREBUILT:
            subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{lt:.4f}", "-i", str(OUT / f"{name}.mp4"),
                            "-frames:v", "1", str(p)], check=True)
        else:
            R.open(name)
            if a.sharp or DRAFT:
                save_png(grab(R, lt, settle=True), p)
            else:
                d = R.duration(name)
                hm = bool(R.page.evaluate("typeof window.motionPx === 'function'"))
                cuts = R.page.evaluate("typeof window.cutTimes === 'function' ? window.cutTimes() : []")
                save_png(shutter_frame(R, lt, d, hm, cuts)[0], p)
        print("still", p, f"(local {lt:.3f})")


def main(argv=None):
    ap = argparse.ArgumentParser(description="render a project's scenes (config: <project>/video.json)")
    ap.add_argument("--project", default=".", help="project folder containing video.json (default: current dir)")
    ap.add_argument("--stills", nargs="*", type=float, default=None)
    ap.add_argument("--scene", default=None)
    ap.add_argument("--concat-only", action="store_true")
    ap.add_argument("--sharp", action="store_true", help="stills without motion blur")
    ap.add_argument("--outdir", default=None, help="stills dir (default <out>/stills)")
    ap.add_argument("--draft", action="store_true", help="fast review draft: N=1, no shutter -> <draft_final>")
    a = ap.parse_args(argv)
    configure(a.project, draft=a.draft)
    final_name = DRAFT_FINAL if DRAFT else FINAL
    OUT.mkdir(exist_ok=True)
    if a.concat_only:
        files = [scene_file(n) for n in ORDER]
        miss = [str(f) for f in files if not f.exists()]
        if miss:
            sys.exit("missing: " + ", ".join(miss))
        concat(files, OUT / final_name)
        print("wrote", OUT / final_name)
        return
    if a.stills is None:
        names = [resolve(a.scene)] if a.scene else ORDER
        missing = [n for n in names if n not in PREBUILT and not scene_exists(n)]
        missing += [n for n in names if n in PREBUILT and not (OUT / f"{n}.mp4").exists()]
        if missing:
            sys.exit("missing scenes: " + ", ".join(missing))
        for n in names:
            if n not in PREBUILT:
                preflight(n)                 # fail on missing fonts before any frame is rendered
    from playwright.sync_api import sync_playwright
    srv = ensure_server()
    try:
        with sync_playwright() as pw:
            R = Renderer(pw)
            if a.stills is not None:
                stills(R, a)
            else:
                for n in names:
                    if n not in PREBUILT:
                        render_scene(R, n)
                sfx_events(R)
                files = [scene_file(n) for n in ORDER]
                if all(f.exists() for f in files) and (not a.scene or DRAFT):
                    dst = OUT / final_name
                    concat(files, dst)
                    print("wrote", dst)
            R.close()
    finally:
        if srv:
            srv.terminate()


if __name__ == "__main__":
    main()
