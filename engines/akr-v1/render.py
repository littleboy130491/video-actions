#!/usr/bin/env python3
"""Deterministic frame renderer for engine/stage.html.

usage:
  python3 engine/render.py                 # full render -> out/akr_timelapse.mp4
  python3 engine/render.py --scene s3      # one scene only -> out/s3.mp4
  python3 engine/render.py --stills 1.5 5 9 12 15.5 20 23.5   # PNG stills -> out/stills/
"""
import argparse, os, socket, subprocess, sys, time
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
PORT = 8765
FPS = 30
SCENES = [("s1", 0.0, 3.6), ("s2", 3.6, 7.2), ("s3", 7.2, 18.0), ("s4", 18.0, 22.0), ("s5", 22.0, 25.0)]


def port_open(p):
    with socket.socket() as s:
        s.settimeout(0.3)
        return s.connect_ex(("127.0.0.1", p)) == 0


def ensure_server():
    if port_open(PORT):
        return None
    proc = subprocess.Popen([sys.executable, "-m", "http.server", str(PORT), "--directory", str(ROOT)],
                            stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    for _ in range(50):
        if port_open(PORT):
            return proc
        time.sleep(0.1)
    raise RuntimeError("http server did not start")


def open_stage(pw):
    browser = pw.chromium.launch(channel="chrome", args=["--font-render-hinting=none", "--disable-lcd-text",
                                                         "--force-color-profile=srgb", "--hide-scrollbars"])
    ctx = browser.new_context(viewport={"width": 1080, "height": 1920}, device_scale_factor=1)
    page = ctx.new_page()
    page.on("console", lambda m: print("[console]", m.type, m.text) if m.type in ("error", "warning") else None)
    page.on("pageerror", lambda e: print("[pageerror]", e))
    page.goto(f"http://127.0.0.1:{PORT}/engine/stage.html", wait_until="load")
    page.wait_for_function("window.stageReady === true || !!window.stageError", timeout=60000)
    err = page.evaluate("window.stageError || null")
    if err:
        raise RuntimeError("stage error: " + err)
    page.evaluate("document.fonts.ready.then(()=>true)")
    print("sources:", page.evaluate("window.SOURCES"))
    return browser, page


def seek(page, t):
    page.evaluate("t => { window.seek(t); return new Promise(r => requestAnimationFrame(() => r())); }", t)


def render_scene(page, name, t0, t1):
    n = int(round((t1 - t0) * FPS))
    tmp = OUT / f"tmp_{name}.mp4"
    final = OUT / f"{name}.mp4"
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "mjpeg", "-i", "-",
           "-c:v", "libx264", "-crf", "18", "-preset", "veryfast", "-pix_fmt", "yuv420p", "-r", str(FPS),
           "-movflags", "+faststart", str(tmp)]
    ff = subprocess.Popen(cmd, stdin=subprocess.PIPE)
    t_start = time.time()
    try:
        for i in range(n):
            t = t0 + i / FPS
            seek(page, t)
            ff.stdin.write(page.screenshot(type="jpeg", quality=92))
            if i % 60 == 0:
                print(f"  {name}: frame {i}/{n}  t={t:.2f}  ({time.time() - t_start:.1f}s)", flush=True)
    finally:
        ff.stdin.close()
        rc = ff.wait()
    if rc != 0:
        raise RuntimeError(f"ffmpeg failed for {name} (exit {rc})")
    os.replace(tmp, final)
    print(f"  {name}: done {n} frames -> {final}")
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
    ap.add_argument("--stills", nargs="*", type=float, default=None, help="save PNG stills at these times")
    ap.add_argument("--scene", default=None, help="render only this scene (s1..s5)")
    a = ap.parse_args()
    OUT.mkdir(exist_ok=True)
    srv = ensure_server()
    try:
        with sync_playwright() as pw:
            browser, page = open_stage(pw)
            if a.stills is not None:
                times = a.stills or [1.5, 5, 9, 12, 15.5, 20, 23.5]
                (OUT / "stills").mkdir(exist_ok=True)
                for t in times:
                    seek(page, t)
                    p = OUT / "stills" / f"still_{t:05.2f}.png"
                    page.screenshot(path=str(p), type="png")
                    print("still", p)
            else:
                scenes = [s for s in SCENES if a.scene in (None, s[0])]
                if not scenes:
                    sys.exit(f"unknown scene {a.scene}")
                files = [render_scene(page, *s) for s in scenes]
                if a.scene is None:
                    dst = OUT / "akr_timelapse.mp4"
                    concat(files, dst)
                    print("wrote", dst)
            browser.close()
    finally:
        if srv:
            srv.terminate()


if __name__ == "__main__":
    main()
