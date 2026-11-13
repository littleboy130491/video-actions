#!/usr/bin/env python3
"""Browser preview server for a video project (scene contract: window.DURATION / seek / ready).

  python3 tools/preview/serve.py PROJECT_DIR [--port 8800] [--host 127.0.0.1]
  -> open http://127.0.0.1:8800/__preview

Static server rooted at PROJECT_DIR with HTTP Range support (so <video> seeking works) and no caching
(edit a scene, press R in the preview to reload it). Extra routes:
  /__preview          the preview UI (tools/preview/preview.html)
  /__preview/config   JSON: video.json (order, prebuilt, width, height, fps) + scenes/*.html list +
                      which prebuilt mp4s exist. Without video.json the order is scenes/*.html sorted.
Read-only: never writes into the project.
"""
import argparse, json, os, re, sys
from http import HTTPStatus
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import quote, urlsplit

HERE = Path(__file__).resolve().parent


def project_config(root: Path) -> dict:
    cfg = {}
    vj = root / "video.json"
    if vj.exists():
        try:
            cfg = json.loads(vj.read_text())
        except ValueError as e:
            cfg = {"error": f"video.json: {e}"}
    scenes = sorted(p.stem for p in (root / "scenes").glob("*.html")) if (root / "scenes").is_dir() else []
    prebuilt = cfg.get("prebuilt") or {}
    order = cfg.get("order") or scenes
    outdir = cfg.get("outdir", "out")
    files = {}
    for n in prebuilt:
        cands = [f"{outdir}/{n}.mp4", f"assets/{n}.mp4"]
        files[n] = next(("/" + quote(c) for c in cands if (root / c).is_file()), None)
    return {
        "name": cfg.get("name") or root.name,
        "order": order, "prebuilt": prebuilt, "prebuiltFiles": files, "scenes": scenes,
        "width": int(cfg.get("width", 1080)), "height": int(cfg.get("height", 1920)),
        "fps": float(cfg.get("fps", 30)), "hasVideoJson": vj.exists(), "error": cfg.get("error"),
    }


class Handler(SimpleHTTPRequestHandler):
    root: Path = Path(".")

    def __init__(self, *a, **kw):
        super().__init__(*a, directory=str(self.root), **kw)

    def log_message(self, fmt, *args):  # quiet: only errors
        if args and str(args[1])[:1] in "45":
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _send_bytes(self, body: bytes, ctype: str):
        self.send_response(HTTPStatus.OK)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _route(self):
        path = urlsplit(self.path).path
        if path in ("/__preview", "/__preview/"):
            self._send_bytes((HERE / "preview.html").read_bytes(), "text/html; charset=utf-8"); return True
        if path == "/__preview/config":
            self._send_bytes(json.dumps(project_config(self.root)).encode(), "application/json"); return True
        if path == "/":
            self.send_response(HTTPStatus.FOUND); self.send_header("Location", "/__preview"); self.end_headers()
            return True
        return False

    def do_HEAD(self):
        if not self._route():
            self._serve_file(head=True)

    def do_GET(self):
        if not self._route():
            self._serve_file(head=False)

    def _serve_file(self, head):
        path = self.translate_path(self.path)
        rng = self.headers.get("Range")
        if not rng or os.path.isdir(path) or not os.path.isfile(path):
            return super().do_HEAD() if head else super().do_GET()
        size = os.path.getsize(path)
        m = re.match(r"bytes=(\d*)-(\d*)$", rng.strip())
        if not m or (m.group(1) == "" and m.group(2) == ""):
            return super().do_HEAD() if head else super().do_GET()
        if m.group(1) == "":                       # suffix range: last N bytes
            start, end = max(0, size - int(m.group(2))), size - 1
        else:
            start = int(m.group(1)); end = int(m.group(2)) if m.group(2) else size - 1
        end = min(end, size - 1)
        if start >= size or start > end:
            self.send_response(HTTPStatus.REQUESTED_RANGE_NOT_SATISFIABLE)
            self.send_header("Content-Range", f"bytes */{size}"); self.end_headers(); return
        n = end - start + 1
        self.send_response(HTTPStatus.PARTIAL_CONTENT)
        self.send_header("Content-Type", self.guess_type(path))
        self.send_header("Accept-Ranges", "bytes")
        self.send_header("Content-Range", f"bytes {start}-{end}/{size}")
        self.send_header("Content-Length", str(n))
        self.end_headers()
        if head:
            return
        with open(path, "rb") as f:
            f.seek(start)
            while n > 0:
                chunk = f.read(min(n, 1 << 16))
                if not chunk:
                    break
                try:
                    self.wfile.write(chunk)
                except (BrokenPipeError, ConnectionResetError):
                    return
                n -= len(chunk)


def main():
    ap = argparse.ArgumentParser(description="Browser preview (scrub bar) for a video project")
    ap.add_argument("project", nargs="?", default=".", help="project dir (has scenes/, optional video.json)")
    ap.add_argument("--port", type=int, default=8800)
    ap.add_argument("--host", default="127.0.0.1", help="use 0.0.0.0 to reach it from another machine")
    a = ap.parse_args()
    root = Path(a.project).resolve()
    if not (root / "scenes").is_dir():
        sys.exit(f"no scenes/ folder in {root}")
    Handler.root = root
    Handler.extensions_map = {**SimpleHTTPRequestHandler.extensions_map, ".mp4": "video/mp4",
                              ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
                              ".js": "text/javascript", ".json": "application/json"}
    srv = ThreadingHTTPServer((a.host, a.port), Handler)
    srv.daemon_threads = True
    print(f"preview: http://{a.host if a.host != '0.0.0.0' else '127.0.0.1'}:{a.port}/__preview  (root {root})",
          flush=True)
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
