#!/usr/bin/env python3
"""Subtle synthesized UI sound for the BYGY timelapse (no music).
Event times come from the scenes themselves (window.SFX, collected by render2.py into out/sfx_events.json), so a
retimed scene never desyncs. Light, snappy clicks on presses, quiet key ticks while typing, a soft tick on every
montage cut, very quiet whooshes on big camera moves; nothing over the client outro.
usage: python3 engine/sfx.py [--draft]   (muxes into out/bygy_draft.mp4 or out/bygy_timelapse_sfx.mp4)"""
import json, subprocess, sys, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
SR = 48000
rng = np.random.default_rng(20261112)
EV = json.loads((OUT / "sfx_events.json").read_text())
DUR = EV["duration"]
S7 = EV.get("outro", DUR)
CLICKS, TYPING, WHOOSH, CUTS = EV["clicks"], EV["typing"], EV["whoosh"], EV["ticks"]


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
    # time-varying one-pole low-pass: cutoff rises then falls
    fc = 300 + 2600 * np.sin(np.pi * t) ** 2
    a = np.exp(-2 * np.pi * fc / SR)
    y = 0.0
    for i in range(n):
        y = a[i] * y + (1 - a[i]) * noise[i]
        out[i] = y
    env = np.sin(np.pi * t) ** 2
    return amp * env * out * 3.0


def thump(amp=.5):
    n = int(SR * .12)
    t = np.arange(n) / SR
    return amp * np.sin(2 * np.pi * 70 * t) * np.exp(-t / .03)


def add(buf, sig, at):
    i = int(at * SR)
    j = min(len(buf), i + len(sig))
    if i < len(buf):
        buf[i:j] += sig[: j - i]


def main():
    buf = np.zeros(int(SR * DUR))
    for c in CLICKS:
        add(buf, click(.36, .6 + .4 * rng.random()), c)
    for a, b in TYPING:
        t = a
        while t < b:
            add(buf, tick(.16 + .08 * rng.random()), t)
            t += .045 + .05 * rng.random()
    for at, d, amp in WHOOSH:
        add(buf, whoosh(d, .12 * amp), at)
    for c in CUTS:
        add(buf, tick(.42), c)
    buf[int(S7 * SR):] = 0            # nothing over the client outro
    buf /= max(1e-6, np.abs(buf).max())
    buf *= .5
    pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
    wav = OUT / "sfx.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    draft = "--draft" in sys.argv
    src = OUT / ("bygy_v5_draft.mp4" if draft else "tam_final.mp4")
    dst = OUT / ("bygy_v5_draft.mp4" if draft else "tam_final_sfx.mp4")
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
