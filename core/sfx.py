#!/usr/bin/env python3
"""Subtle synthesized UI sound for any project (no music), generic version of engines/*/sfx.py.
Event times come from the scenes themselves (window.SFX, collected by core/render.py into <out>/sfx_events.json), so a
retimed scene never desyncs. Light, snappy clicks on presses, quiet key ticks while typing, a soft tick on every
montage cut, very quiet whooshes on big camera moves; silence over prebuilt (client outro) segments.
usage: python3 core/sfx.py --project P [--draft]   (<out>/<final> -> <out>/<final stem>_sfx.mp4; with --draft the
       draft_final instead)"""
import argparse, json, subprocess, sys, wave
from pathlib import Path
import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parent))
import render as core  # noqa: E402

SR = 48000
rng = np.random.default_rng(20261112)


def click(amp=1.0, bright=1.0):
    n = int(SR * .03)
    t = np.arange(n) / SR
    env = np.exp(-t / .0035)
    noise = rng.standard_normal(n)
    noise = np.convolve(noise, np.ones(3) / 3, mode="same")
    tone = np.sin(2 * np.pi * (1800 + 900 * bright) * t) * np.exp(-t / .006)
    return amp * env * (0.55 * noise + 0.6 * tone)


def tick(amp=.35):
    n = int(SR * .018)
    t = np.arange(n) / SR
    s = rng.standard_normal(n) * np.exp(-t / .0018) + 0.4 * np.sin(2 * np.pi * 3200 * t) * np.exp(-t / .003)
    return amp * s


def whoosh(dur, amp):
    n = int(SR * dur)
    t = np.linspace(0, 1, n)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    fc = 300 + 2600 * np.sin(np.pi * t) ** 2          # time-varying one-pole low-pass: cutoff rises then falls
    a = np.exp(-2 * np.pi * fc / SR)
    y = 0.0
    for i in range(n):
        y = a[i] * y + (1 - a[i]) * noise[i]
        out[i] = y
    env = np.sin(np.pi * t) ** 2
    return amp * env * out * 3.0


def add(buf, sig, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    if 0 <= i < len(buf):
        buf[i:j] += sig[: j - i]


def main(argv=None):
    ap = argparse.ArgumentParser()
    ap.add_argument("--project", default=".")
    ap.add_argument("--draft", action="store_true")
    a = ap.parse_args(argv)
    core.configure(a.project, draft=a.draft)
    OUT = core.OUT
    evf = OUT / "sfx_events.json"
    if not evf.exists():
        sys.exit(f"{evf} missing: render (e.g. --draft) first, it collects window.SFX of every scene")
    EV = json.loads(evf.read_text())
    buf = np.zeros(int(SR * EV["duration"]))
    for c in EV.get("clicks", []):
        add(buf, click(.36, .6 + .4 * rng.random()), c)
    for s, e in EV.get("typing", []):
        t = s
        while t < e:
            add(buf, tick(.16 + .08 * rng.random()), t)
            t += .045 + .05 * rng.random()
    for at, d, amp in EV.get("whoosh", []):
        add(buf, whoosh(d, .12 * amp), at)
    for c in EV.get("ticks", []):
        add(buf, tick(.42), c)
    for n, s0, d in EV.get("scenes", []):            # nothing over prebuilt (client outro) segments
        if n in core.PREBUILT:
            buf[int(s0 * SR):int((s0 + d) * SR)] = 0
    buf /= max(1e-6, np.abs(buf).max())
    buf *= .5
    pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
    wav = OUT / "sfx.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    src = OUT / (core.DRAFT_FINAL if a.draft else core.FINAL)
    if not src.exists():
        wav.unlink()
        sys.exit(f"{src} missing: render/concat first")
    dst = src.with_name(src.stem + "_sfx.mp4")
    tmp = OUT / ("tmp_sfx_" + dst.name)
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(wav),
                    "-filter_complex", "[1:a]loudnorm=I=-24:TP=-3:LRA=11,aresample=48000,volume=-2.7dB,pan=stereo|c0=c0|c1=c0[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(dst)
    wav.unlink()
    print("wrote", dst)


if __name__ == "__main__":
    main()
