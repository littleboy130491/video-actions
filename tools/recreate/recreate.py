#!/usr/bin/env python3
"""Recreate an ad's structure as a NEW ad with Seedance 2.5 Flash (OpenRouter video API).

The reference ad supplies structure only: shot count, shot lengths, transitions, framing and camera energy.
Every shot is regenerated from your own prompts, first frames and reference images (your product, brand,
characters). Don't put another brand's logo, product or characters into the prompts or reference images.

  analyze  REF.mp4 --out DIR        cut detection (transition clusters merged) -> DIR/plan.json + keyframes + contact sheet
  describe DIR/plan.json            optional: a vision chat model writes per-shot notes (composition, camera, action)
  generate DIR/plan.json            submit each shot to the video model, poll, download DIR/clips/<id>.mp4 (resumable)
  assemble DIR/plan.json            trim each clip to its shot length, conform size/fps, join with the planned transitions

Key: OPENROUTER_API_KEY. In a Claude Code cloud environment that has the key saved as a network secret, the proxy
injects it and the variable can stay unset. Every paid step prints an estimate first; generate stops at --max-usd.
Images (first/last frame, references) may be local paths (sent inline as data: URLs) or https URLs.
"""
import argparse, base64, json, mimetypes, os, re, subprocess, sys, time, urllib.error, urllib.request
from pathlib import Path

API = "https://openrouter.ai/api/v1"
MODEL = "bytedance/seedance-2.5-flash"
TOKEN_USD = 0.000007            # Seedance 2.5 Flash video_tokens price (USD/token) from /api/v1/videos/models
SIZES = {("480p", "16:9"): (854, 480), ("480p", "9:16"): (480, 854), ("480p", "1:1"): (640, 640),
         ("720p", "16:9"): (1280, 720), ("720p", "9:16"): (720, 1280), ("720p", "1:1"): (960, 960),
         ("720p", "4:3"): (1112, 834), ("720p", "3:4"): (834, 1112), ("720p", "21:9"): (1470, 630),
         ("480p", "4:3"): (752, 560), ("480p", "3:4"): (560, 752), ("480p", "21:9"): (992, 432)}
XFADE = {"fade": "fade", "dissolve": "dissolve", "wipe": "wipeleft", "whip": "slideleft", "push": "slideup",
         "zoom": "zoomin", "circle": "circleopen", "smooth": "smoothleft"}


# ---------------------------------------------------------------- helpers
def sh(*cmd, capture=True):
    r = subprocess.run(cmd, capture_output=capture, text=True)
    if r.returncode:
        sys.exit(f"command failed: {' '.join(map(str, cmd))}\n{r.stderr[-2000:]}")
    return r.stdout


def probe(path):
    d = json.loads(sh("ffprobe", "-v", "error", "-show_entries", "format=duration:stream=codec_type,width,height,r_frame_rate",
                      "-of", "json", str(path)))
    v = next(s for s in d["streams"] if s["codec_type"] == "video")
    n, dn = map(float, v["r_frame_rate"].split("/"))
    return {"duration": float(d["format"]["duration"]), "width": v["width"], "height": v["height"], "fps": n / dn}


def api(method, path, body=None, raw=False, timeout=120):
    key = os.environ.get("OPENROUTER_API_KEY") or "proxy-injected"   # cloud proxy replaces the header
    req = urllib.request.Request(API + path if path.startswith("/") else path, method=method,
                                 data=json.dumps(body).encode() if body is not None else None,
                                 headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json",
                                          "X-Title": "video-actions recreate"})
    try:
        with urllib.request.urlopen(req, timeout=timeout) as r:
            data = r.read()
            return data if raw else json.loads(data)
    except urllib.error.HTTPError as e:
        msg = e.read().decode(errors="replace")[:1500]
        if e.code in (401, 403):
            msg += "\n(no valid key: set OPENROUTER_API_KEY, or save it as a network secret for openrouter.ai)"
        raise RuntimeError(f"OpenRouter {method} {path} -> HTTP {e.code}: {msg}") from None


def image_ref(src, base):
    """local path -> data: URL; http(s)/data URLs pass through"""
    if re.match(r"^(https?|data):", src):
        return src
    p = (base / src) if not Path(src).is_absolute() else Path(src)
    if not p.exists():
        sys.exit(f"image not found: {p}")
    mime = mimetypes.guess_type(p.name)[0] or "image/png"
    return f"data:{mime};base64,{base64.b64encode(p.read_bytes()).decode()}"


def estimate_usd(shot, plan):
    w, h = SIZES.get((plan["resolution"], plan["aspect_ratio"]), (720, 1280))
    return w * h * 24 * gen_duration(shot) / 1024 * TOKEN_USD     # Seedance token formula w*h*fps*s/1024 (estimate)


def gen_duration(shot):
    return int(max(4, min(30, round(shot.get("gen_duration") or shot["duration"] + 0.49))))


def contact(d, names, labels, cols=6, w=320):
    """contact sheet of keyframes (PIL if available, else ffmpeg xstack)"""
    try:
        from PIL import Image, ImageDraw
    except ImportError:
        return
    ims = [Image.open(d / n).convert("RGB") for n in names]
    h = round(w * ims[0].height / ims[0].width)
    rows = (len(ims) + cols - 1) // cols
    sheet = Image.new("RGB", (w * min(cols, len(ims)), (h + 22) * rows), "#111")
    dr = ImageDraw.Draw(sheet)
    for i, (im, lb) in enumerate(zip(ims, labels)):
        x, y = (i % cols) * w, (i // cols) * (h + 22)
        sheet.paste(im.resize((w, h)), (x, y)); dr.text((x + 6, y + h + 5), lb, fill="#ddd")
    sheet.save(d / "contact.jpg", quality=88)


def load(plan_path):
    p = Path(plan_path).resolve()
    return p, p.parent, json.loads(p.read_text())


def save(p, plan):
    p.write_text(json.dumps(plan, indent=1, ensure_ascii=False) + "\n")


# ---------------------------------------------------------------- analyze
def cmd_analyze(a):
    ref = Path(a.ref).resolve(); out = Path(a.out).resolve()
    (out / "reference").mkdir(parents=True, exist_ok=True)
    info = probe(ref)
    log = subprocess.run(["ffmpeg", "-v", "error", "-i", str(ref), "-vf", f"select='gt(scene,{a.threshold})',metadata=print:file=-",
                          "-an", "-f", "null", "-"], capture_output=True, text=True).stdout
    hits = [float(x) for x in re.findall(r"pts_time:([0-9.]+)", log)]
    # a wipe / whip-pan / dissolve fires on many consecutive frames: merge hits closer than --merge into one transition
    clusters = []
    for t in hits:
        if clusters and t - clusters[-1][1] <= a.merge:
            clusters[-1][1] = t
        else:
            clusters.append([t, t])
    bounds, trans = [0.0], ["cut"]
    for c0, c1 in clusters:
        span = c1 - c0
        mid = (c0 + c1) / 2 if span > 0 else c0
        if mid - bounds[-1] < a.min_shot:
            continue
        bounds.append(mid); trans.append("cut" if span < 0.08 else ("whip" if span < 0.3 else "wipe"))
    bounds.append(info["duration"])
    shots = []
    for i in range(len(bounds) - 1):
        t0, t1 = bounds[i], bounds[i + 1]
        sid = f"s{i + 1:02d}"
        for tag, t in (("first", t0 + 0.06), ("mid", (t0 + t1) / 2), ("last", max(t0, t1 - 0.08))):
            sh("ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", str(ref), "-frames:v", "1", "-q:v", "3",
               str(out / "reference" / f"{sid}_{tag}.jpg"))
        shots.append({"id": sid, "ref": {"t0": round(t0, 3), "t1": round(t1, 3), "keyframe": f"reference/{sid}_mid.jpg"},
                      "duration": round(t1 - t0, 3), "transition_in": trans[i] if i else "cut", "transition_dur": 0.3,
                      "notes": "", "prompt": "", "first_frame": None, "last_frame": None, "references": [],
                      "trim_from": 0.0, "seed": None})
    n = len(shots)
    contact(out / "reference", [f"{x['id']}_mid.jpg" for x in shots], [f"{x['id']} {x['duration']:.2f}s" for x in shots])
    plan = {"reference": str(ref), "reference_info": info, "model": MODEL, "resolution": "720p",
            "aspect_ratio": "9:16" if info["height"] > info["width"] else "16:9", "generate_audio": False,
            "style": "", "references": [], "output": {"fps": 30}, "music": None, "shots": shots}
    p = out / "plan.json"
    if p.exists() and not a.force:
        sys.exit(f"{p} exists (use --force to overwrite)")
    save(p, plan)
    print(f"{n} shots from {info['duration']:.2f}s ({len(hits)} raw scene hits merged):")
    for s in shots:
        print(f"  {s['id']}  {s['ref']['t0']:6.2f}-{s['ref']['t1']:6.2f}  {s['duration']:.2f}s  in:{s['transition_in']}")
    print(f"wrote {p} and {out / 'reference'}/ (keyframes, contact.jpg). Fill style + each shot's prompt next.")


# ---------------------------------------------------------------- describe (optional, vision chat model)
def cmd_describe(a):
    p, base, plan = load(a.plan)
    for s in plan["shots"]:
        if s.get("notes") and not a.force:
            continue
        imgs = [image_ref(f"reference/{s['id']}_{k}.jpg", base) for k in ("first", "mid", "last")]
        msg = [{"type": "text", "text": "These are the first, middle and last frame of one shot of a video ad "
                f"({s['duration']:.2f}s). In 2-3 short sentences describe ONLY reusable structure: framing/shot size, "
                "camera movement, subject action, composition, lighting and pacing. Do not name brands or logos."}]
        msg += [{"type": "image_url", "image_url": {"url": u}} for u in imgs]
        r = api("POST", "/chat/completions", {"model": a.model, "messages": [{"role": "user", "content": msg}], "max_tokens": 200})
        s["notes"] = r["choices"][0]["message"]["content"].strip()
        print(f"{s['id']}: {s['notes']}")
        save(p, plan)


# ---------------------------------------------------------------- generate
def request_for(s, plan, base):
    prompt = " ".join(x for x in (plan.get("style", ""), s["prompt"]) if x).strip()
    if not prompt:
        sys.exit(f"shot {s['id']} has no prompt")
    body = {"model": plan.get("model", MODEL), "prompt": prompt, "duration": gen_duration(s),
            "resolution": plan["resolution"], "aspect_ratio": plan["aspect_ratio"],
            "generate_audio": bool(plan.get("generate_audio", False))}
    frames = [{"type": "image_url", "image_url": {"url": image_ref(s[k], base)}, "frame_type": k}
              for k in ("first_frame", "last_frame") if s.get(k)]
    if frames:
        body["frame_images"] = frames
    refs = list(plan.get("references") or []) + list(s.get("references") or [])
    if refs and not frames:       # frame_images + input_references together = image-to-video; refs only without frames
        body["input_references"] = [{"type": "image_url", "image_url": {"url": image_ref(r, base)}} for r in refs]
    if s.get("seed") is not None:
        body["seed"] = int(s["seed"])
    return body


def short(body):
    b = json.loads(json.dumps(body))
    for k in ("frame_images", "input_references"):
        for x in b.get(k, []):
            u = x["image_url"]["url"]
            x["image_url"]["url"] = u[:40] + f"...({len(u)} chars)" if len(u) > 60 else u
    return b


def cmd_generate(a):
    p, base, plan = load(a.plan)
    (base / "clips").mkdir(exist_ok=True)
    ledger_p = base / "ledger.json"
    ledger = json.loads(ledger_p.read_text()) if ledger_p.exists() else []
    spent = sum(x.get("cost") or 0 for x in ledger)
    todo = [s for s in plan["shots"] if (not a.only or s["id"] in a.only) and (a.force or not (base / "clips" / f"{s['id']}.mp4").exists())]
    est = sum(estimate_usd(s, plan) for s in todo)
    print(f"{len(todo)} shot(s) to generate with {plan.get('model', MODEL)} at {plan['resolution']} {plan['aspect_ratio']}; "
          f"estimate ~${est:.2f} (spent so far ${spent:.2f}, budget --max-usd {a.max_usd})")
    for s in todo:
        print(f"  {s['id']}: {gen_duration(s)}s gen for a {s['duration']:.2f}s shot, ~${estimate_usd(s, plan):.2f}")
        if a.dry_run:
            print("   ", json.dumps(short(request_for(s, plan, base)))[:600])
    if a.dry_run or not todo:
        return
    jobs = {}
    for s in todo:
        if spent + estimate_usd(s, plan) > a.max_usd:
            print(f"  stop: {s['id']} would pass --max-usd {a.max_usd} (spent ${spent:.2f})"); break
        j = api("POST", "/videos", request_for(s, plan, base))
        jobs[s["id"]] = j
        spent += estimate_usd(s, plan)          # reserve the estimate until the real cost is known
        print(f"  submitted {s['id']}: job {j.get('id')} ({j.get('status')})", flush=True)
    t0 = time.time()
    while jobs and time.time() - t0 < a.timeout:
        time.sleep(10)
        for sid, j in list(jobs.items()):
            st = api("GET", j.get("polling_url") or f"/videos/{j['id']}")
            if st.get("status") == "completed":
                data = api("GET", f"/videos/{j['id']}/content?index=0", raw=True, timeout=600)
                dst = base / "clips" / f"{sid}.mp4"; dst.write_bytes(data)
                cost = (st.get("usage") or {}).get("cost")
                ledger.append({"shot": sid, "job": j["id"], "cost": cost, "at": time.strftime("%Y-%m-%d %H:%M:%S"),
                               "request": short(request_for(next(s for s in plan["shots"] if s["id"] == sid), plan, base))})
                ledger_p.write_text(json.dumps(ledger, indent=1) + "\n")
                info = probe(dst)
                print(f"  done {sid}: {info['width']}x{info['height']} {info['fps']:.0f}fps {info['duration']:.2f}s, "
                      f"cost ${cost if cost is not None else '?'}  ({time.time() - t0:.0f}s)", flush=True)
                del jobs[sid]
            elif st.get("status") in ("failed", "cancelled", "expired"):
                print(f"  {sid} {st['status']}: {st.get('error')}"); del jobs[sid]
    if jobs:
        print("timed out waiting for (jobs keep running on OpenRouter; resume is not supported, re-submit to retry): " + ", ".join(jobs))
    total = sum(x.get("cost") or 0 for x in ledger)
    print(f"ledger: {len(ledger)} clip(s), actual total ${total:.2f} -> {ledger_p}")


# ---------------------------------------------------------------- assemble
def cmd_assemble(a):
    p, base, plan = load(a.plan)
    shots = [s for s in plan["shots"] if (base / "clips" / f"{s['id']}.mp4").exists()]
    if not shots:
        sys.exit("no clips yet (run generate)")
    missing = [s["id"] for s in plan["shots"] if s not in shots]
    if missing:
        print("  skipping shots without a clip:", ", ".join(missing))
    W, H = SIZES.get((plan["resolution"], plan["aspect_ratio"]), (720, 1280))
    if a.width:
        W, H = a.width, round(a.width * H / W / 2) * 2
    fps = plan.get("output", {}).get("fps", 30)
    tmp = base / "parts"; tmp.mkdir(exist_ok=True)
    parts = []
    for i, s in enumerate(shots):
        src = base / "clips" / f"{s['id']}.mp4"
        nxt = shots[i + 1] if i + 1 < len(shots) else None
        tail = (nxt["transition_dur"] if nxt and nxt["transition_in"] != "cut" else 0)   # overlap eaten by the next xfade
        dur = s["duration"] + tail
        avail = probe(src)["duration"] - s.get("trim_from", 0)
        speed = max(1.0, dur / avail) if avail > 0 else 1.0            # stretch only if the clip is too short
        dst = tmp / f"{s['id']}.mp4"
        sh("ffmpeg", "-v", "error", "-y", "-ss", str(s.get("trim_from", 0)), "-i", str(src), "-an", "-vf",
           f"setpts={speed:.4f}*PTS,scale={W}:{H}:force_original_aspect_ratio=increase:flags=lanczos,crop={W}:{H},fps={fps},format=yuv420p",
           "-t", f"{dur:.3f}", "-c:v", "libx264", "-crf", "16", "-preset", "veryfast", str(dst))
        parts.append((s, dst, dur))
    # chain with xfade (cuts = 0-length joins through concat)
    inputs, chain, last, off = [], [], "0:v", 0.0
    for i, (s, dst, dur) in enumerate(parts):
        inputs += ["-i", str(dst)]
    off = parts[0][2]
    for i in range(1, len(parts)):
        s, _, dur = parts[i]
        tr = s["transition_in"]
        if tr == "cut":
            chain.append(f"[{last}][{i}:v]concat=n=2:v=1:a=0[v{i}]")
        else:
            d = s["transition_dur"]
            chain.append(f"[{last}][{i}:v]xfade=transition={XFADE.get(tr, tr)}:duration={d}:offset={off - d:.3f}[v{i}]")
            off -= d
        off += dur
        last = f"v{i}"
    out = Path(a.out).resolve() if a.out else base / "recreated.mp4"
    cmd = ["ffmpeg", "-v", "error", "-y", *inputs]
    music = a.music or plan.get("music")
    if music:
        cmd += ["-i", str((base / music) if not Path(music).is_absolute() else music)]
    fc = ";".join(chain) if chain else None
    vmap = f"[{last}]" if chain else "0:v"
    if music:
        ai = len(parts)
        afc = f"[{ai}:a]atrim=0:{off:.3f},afade=t=out:st={max(0, off - 1):.3f}:d=1[a]"
        fc = f"{fc};{afc}" if fc else afc
    if fc:
        cmd += ["-filter_complex", fc]
    cmd += ["-map", vmap] + (["-map", "[a]", "-c:a", "aac", "-b:a", "192k"] if music else []) + \
           ["-c:v", "libx264", "-crf", "17", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(out)]
    sh(*cmd)
    i = probe(out)
    print(f"wrote {out}: {i['width']}x{i['height']} {i['fps']:.0f}fps {i['duration']:.2f}s ({len(parts)} shots)")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    x = sp.add_parser("analyze"); x.add_argument("ref"); x.add_argument("--out", required=True)
    x.add_argument("--threshold", type=float, default=0.22); x.add_argument("--merge", type=float, default=0.25)
    x.add_argument("--min-shot", type=float, default=0.5); x.add_argument("--force", action="store_true")
    x.set_defaults(f=cmd_analyze)
    x = sp.add_parser("describe"); x.add_argument("plan"); x.add_argument("--model", default="google/gemini-2.5-flash-lite")
    x.add_argument("--force", action="store_true"); x.set_defaults(f=cmd_describe)
    x = sp.add_parser("generate"); x.add_argument("plan"); x.add_argument("--only", nargs="*")
    x.add_argument("--dry-run", action="store_true"); x.add_argument("--force", action="store_true")
    x.add_argument("--max-usd", type=float, default=2.0); x.add_argument("--timeout", type=int, default=1800)
    x.set_defaults(f=cmd_generate)
    x = sp.add_parser("assemble"); x.add_argument("plan"); x.add_argument("--out"); x.add_argument("--music")
    x.add_argument("--width", type=int, help="output width (height keeps the aspect ratio)")
    x.set_defaults(f=cmd_assemble)
    a = ap.parse_args(); a.f(a)


if __name__ == "__main__":
    main()
