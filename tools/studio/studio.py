#!/usr/bin/env python3
"""Open a project in HyperFrames Studio (preview / scrub only; final renders stay on core/render.py).

usage:
  python3 tools/studio/studio.py --project P --scene e5_stats   # LIVE: one scene, scrubbed through its own seek(t)
  python3 tools/studio/studio.py --project P                    # SEQUENCE: video.json order (fallback scenes/*.html)
                                                                #   as clips of the rendered <out>/<name>.mp4 / draft_
  options: --port 3017  --workdir D (default: new temp dir; never inside P)  --no-preview  --foreground

Workspace (throwaway; P itself is only read):
  LIVE      index.html = COPY of scenes/<name>.html with tools/studio/shim.js injected and data-composition-id/
            -duration/-width/-height on <body> (duration = window.DURATION, probed headless); P's dirs (assets fonts
            design engine ...) symlinked next to it so the scene's relative URLs resolve.
  SEQUENCE  index.html = root composition with every scene as a <video> clip (clips/<name>.mp4 -> symlink into
            P/<out>). HyperFrames mounts sub-compositions INLINE in one document (iframes never become ready), and
            our scenes declare top-level consts / window.seek / build DOM on <body>, so they cannot be nested live.
Then `hyperframes@0.9.41 preview` runs in the background (installed into tools/studio/node_modules on first run).
Env: HYPERFRAMES_BROWSER_PATH (default /usr/bin/google-chrome), HYPERFRAMES_NO_TELEMETRY=1 (defaults set here).
"""
import argparse, functools, html, json, os, re, shutil, socket, subprocess, sys, tempfile, threading, time
import urllib.request
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

HERE = Path(__file__).resolve().parent
HF_VERSION = "0.9.41"
SHIM = HERE / "shim.js"
LINK_SKIP = {"scenes", "out", "node_modules", ".git", ".hyperframes", ".thumbnails"}


def load_project(p, scene=None):
    vj = p / "video.json"
    cfg = json.loads(vj.read_text()) if vj.exists() else {}
    order = list(cfg.get("order") or sorted(f.stem for f in (p / "scenes").glob("*.html")))
    prebuilt = {k: float(v) for k, v in (cfg.get("prebuilt") or {}).items()}
    if scene:
        hit = [n for n in order if n == scene or n.split("_")[0] == scene]
        if not hit and (p / "scenes" / f"{scene}.html").exists():
            hit = [scene]
        if not hit:
            sys.exit(f"unknown scene {scene}")
        order = hit[:1]
    out = p / cfg.get("out", "out")
    return cfg, order, prebuilt, out, int(cfg.get("width", 1080)), int(cfg.get("height", 1920))


def inject(src, name, dur, w, h, shim):
    """copy of a scene: composition attributes on <body>, shim inline before </body>"""
    attrs = (f' data-composition-id="{html.escape(name)}" data-no-timeline data-start="0"'
             f' data-duration="{dur:.4f}" data-width="{w}" data-height="{h}"')
    m = re.search(r"<body\b([^>]*)>", src, re.I)
    if m:
        old = re.sub(r'\s+data-(composition-id|no-timeline|start|duration|width|height)(="[^"]*")?', "", m.group(1))
        src = src[:m.start()] + f"<body{old}{attrs}>" + src[m.end():]
    else:
        src = f"<body{attrs}>" + src
    tag = f"<script>/* studio shim (tools/studio/shim.js) */\n{shim}</script>"
    i = src.lower().rfind("</body>")
    return src[:i] + tag + src[i:] if i >= 0 else src + tag


class _Quiet(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


class _Server(ThreadingHTTPServer):
    def handle_error(self, request, client_address):     # browser closing a connection mid-file: not an error
        pass


def probe_durations(ws, names, w, h, path="scenes/"):
    """window.DURATION of each (unshimmed) page, loaded headless from the workspace"""
    srv = _Server(("127.0.0.1", 0), functools.partial(_Quiet, directory=str(ws)))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    port, out = srv.server_address[1], {}
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as pw:
            b = pw.chromium.launch(channel="chrome")
            pg = b.new_page(viewport={"width": w, "height": h})
            for n in names:
                try:
                    pg.goto(f"http://127.0.0.1:{port}/{path}{n}.html", wait_until="load")
                    pg.wait_for_function("typeof window.DURATION === 'number' && window.DURATION > 0", timeout=30000)
                    out[n] = float(pg.evaluate("window.DURATION"))
                except Exception as e:
                    print(f"  could not read window.DURATION of {n}: {str(e).splitlines()[0]}")
            b.close()
    finally:
        srv.shutdown()
    return out


def static_duration(src):
    m = re.search(r"window\.DURATION\s*=\s*([\d.]+)", src) or re.search(r"\bconst\s+D\s*=\s*([\d.]+)", src)
    return float(m.group(1)) if m else None


def ffprobe_dur(f):
    try:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(f)],
                           capture_output=True, text=True, check=True)
        return float(r.stdout.strip())
    except Exception:
        return None


def clean(ws):
    ws.mkdir(parents=True, exist_ok=True)
    for d in list(ws.iterdir()):                       # rebuild (keep HF's own state dirs)
        if d.name in (".hyperframes", ".thumbnails"):
            continue
        if d.is_symlink() or d.is_file():
            d.unlink()
        else:
            shutil.rmtree(d)


_UP = re.compile(r"""(["'`(]\s*)\.\./""")


def up_one(text):
    return _UP.sub(r"\1", text)


def link_dir(src, dst):
    """symlink a project dir; a dir holding .js files with "../" URLs gets a real folder of per-file symlinks
    plus rewritten copies of those .js files"""
    jss = [f for f in src.rglob("*.js") if "../" in f.read_text(errors="ignore")]
    if not jss:
        dst.symlink_to(src.resolve(), target_is_directory=True)
        return
    for f in src.rglob("*"):
        if f.is_dir():
            continue
        t = dst / f.relative_to(src)
        t.parent.mkdir(parents=True, exist_ok=True)
        if f in jss:
            t.write_text(up_one(f.read_text()))
        else:
            t.symlink_to(f.resolve())


def build_scene(p, ws, name, w, h):
    """LIVE: the shimmed copy of one scene is the root composition (index.html), next to symlinks of P's dirs."""
    for d in p.iterdir():
        if d.is_dir() and d.name not in LINK_SKIP and not d.name.startswith("."):
            link_dir(d, ws / d.name)
    # the copy moves from scenes/ to the root, and Studio's preview pins <base> to the project root, so
    # scene-relative "../x" URLs become "x" (in the scene and in JS files, whose URL strings resolve against the
    # document; CSS url(...) resolves against the stylesheet itself and stays as written)
    src = up_one((p / "scenes" / f"{name}.html").read_text())
    (ws / "index.html").write_text(src)
    d = probe_durations(ws, ["index"], w, h, path="").get("index") or static_duration(src)
    if not d:
        sys.exit(f"scene {name}: could not read window.DURATION")
    (ws / "index.html").write_text(inject(src, name, d, w, h, SHIM.read_text()))
    return [("live", name, 0.0, d)], d


def build_sequence(p, ws, order, prebuilt, outdir, w, h):
    """SEQUENCE: every scene in order as a <video> clip of its rendered file (<out>/<name>.mp4, else
    <out>/draft_<name>.mp4; prebuilt entries as configured)."""
    (ws / "clips").mkdir()
    timeline, t = [], 0.0
    for n in order:
        cands = [outdir / f"{n}.mp4"] if n in prebuilt else [outdir / f"{n}.mp4", outdir / f"draft_{n}.mp4"]
        mp4 = next((c for c in cands if c.exists()), None)
        if not mp4:
            print(f"  {n}: no rendered file ({', '.join(c.name for c in cands)}), skipped; live: --scene {n}")
            continue
        d = prebuilt.get(n) or ffprobe_dur(mp4)
        if not d:
            print(f"  {n}: unreadable {mp4.name}, skipped")
            continue
        (ws / "clips" / f"{n}.mp4").symlink_to(mp4.resolve())
        timeline.append((mp4.name, n, t, d))
        t += d
    if not timeline:
        sys.exit(f"nothing rendered yet in {outdir}; use --scene NAME for a live scene")
    rows = "\n".join(f'  <video id="{n}" class="clip" src="clips/{n}.mp4" data-start="{t0:.4f}" '
                     f'data-duration="{d:.4f}" data-track-index="0" muted playsinline></video>'
                     for _, n, t0, d in timeline)
    (ws / "index.html").write_text(f"""<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width={w}, height={h}">
<title>{html.escape(p.name)}</title>
<style>*{{margin:0;padding:0}}html,body{{width:{w}px;height:{h}px;overflow:hidden;background:#000}}
#root{{position:relative;width:{w}px;height:{h}px}}
#root video{{position:absolute;left:0;top:0;width:{w}px;height:{h}px;object-fit:cover}}</style>
</head><body>
<div id="root" data-composition-id="main" data-no-timeline data-start="0" data-duration="{t:.4f}" data-width="{w}" data-height="{h}">
{rows}
</div></body></html>
""")
    return timeline, t


def build(p, ws, scene=None):
    cfg, order, prebuilt, outdir, w, h = load_project(p, scene)
    clean(ws)
    if scene:
        if not (p / "scenes" / f"{order[0]}.html").exists():
            sys.exit(f"scenes/{order[0]}.html missing")
        return build_scene(p, ws, order[0], w, h)
    return build_sequence(p, ws, order, prebuilt, outdir, w, h)


def hf_bin():
    b = HERE / "node_modules" / ".bin" / "hyperframes"
    if not b.exists():
        print(f"installing hyperframes@{HF_VERSION} into {HERE / 'node_modules'} ...")
        if not (HERE / "package.json").exists():
            (HERE / "package.json").write_text(json.dumps({"name": "studio", "private": True}, indent=2) + "\n")
        subprocess.run(["npm", "install", "--no-audit", "--no-fund", "--no-save", f"hyperframes@{HF_VERSION}"],
                       cwd=HERE, check=True)
    return str(b)


def free_port(p):
    while True:
        with socket.socket() as s:
            if s.connect_ex(("127.0.0.1", p)) != 0:
                return p
        p += 1


def main(argv=None):
    ap = argparse.ArgumentParser(description="open a project in HyperFrames Studio (preview only)")
    ap.add_argument("--project", required=True)
    ap.add_argument("--scene", default=None, help="LIVE: this scene (shimmed copy) is the root composition")
    ap.add_argument("--port", type=int, default=3017)
    ap.add_argument("--workdir", default=None, help="workspace dir (default: a new temp dir); never inside the project")
    ap.add_argument("--no-preview", action="store_true", help="only build the workspace")
    ap.add_argument("--foreground", action="store_true", help="keep preview attached (Ctrl-C stops it)")
    a = ap.parse_args(argv)
    p = Path(a.project).resolve()
    if not (p / "scenes").is_dir():
        sys.exit(f"{p}: no scenes/ folder")
    ws = Path(a.workdir).resolve() if a.workdir else Path(tempfile.mkdtemp(prefix=f"studio_{p.name}_"))
    if ws == p or p in ws.parents:
        sys.exit("--workdir must be outside the project folder")
    timeline, total = build(p, ws, a.scene)
    print(f"workspace {ws}  ({len(timeline)} clip(s), {total:.2f} s)")
    for kind, n, t0, d in timeline:
        print(f"  {t0:7.3f}  {d:6.3f}  {n}  ({kind})")
    if a.no_preview:
        return
    env = dict(os.environ)
    env.setdefault("HYPERFRAMES_BROWSER_PATH", "/usr/bin/google-chrome")
    env.setdefault("HYPERFRAMES_NO_TELEMETRY", "1")
    env["PWD"] = str(ws)                               # HF names the project after $PWD
    port = free_port(a.port)
    cmd = [hf_bin(), "preview", str(ws), "--port", str(port), "--no-open",
           "--foreground" if a.foreground else "--background"]
    print("running:", " ".join(cmd))
    r = subprocess.run(cmd, cwd=ws, env=env)
    if r.returncode:
        sys.exit(r.returncode)
    for _ in range(60):
        try:
            urllib.request.urlopen(f"http://127.0.0.1:{port}/", timeout=1)
            break
        except Exception:
            time.sleep(0.5)
    print(f"\nStudio: http://localhost:{port}/#project/{ws.name}\nstop:   {hf_bin()} preview {ws} --stop")


if __name__ == "__main__":
    main()
