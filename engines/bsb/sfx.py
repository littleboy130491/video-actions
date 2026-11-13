#!/usr/bin/env python3
"""Subtle synthesized UI sound for the BSB timelapse (no music).
Soft clicks on presses, quiet key ticks while typing, very quiet whooshes on big camera moves; nothing over the
client outro. -> out/bsb_timelapse_sfx.mp4 (video stream copied, loudness-normalised to about -24 LUFS)."""
import subprocess, wave
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "out"
SR = 48000
DUR = 39.4
rng = np.random.default_rng(20261112)

# scene offsets (global) — BSB timeline: S1 2.4 | S2 6.0 | S3 6.0 | S4 7.0 | S5 3.5 | S6 8.0 | client outro 6.5
S1, S2, S3, S4, S5, S6, S7 = 0.0, 2.4, 8.4, 14.4, 21.4, 24.9, 32.9
CLICKS = [S3 + 1.25, S3 + 1.45, S3 + 2.24, S3 + 3.02, S3 + 3.60, S3 + 4.28, S3 + 4.98, S3 + 5.24, S3 + 5.28,
          S4 + .27, S4 + .51, S4 + .60, S4 + .78, S4 + 1.14, S4 + 1.16, S4 + 1.34, S4 + 1.52, S4 + 1.62, S4 + 2.10, S4 + 2.32,
          S4 + 2.46, S4 + 3.16, S4 + 3.50, S4 + 3.72, S4 + 3.84, S4 + 3.98, S4 + 4.16, S4 + 4.38, S4 + 5.30, S4 + 5.52,
          S4 + 5.70, S4 + 5.80, S4 + 6.04, S4 + 6.20, S4 + 6.36, S4 + 6.56,
          S5 + .08, S5 + .87, S5 + 1.92, S5 + 2.56]
TYPING = [(S1 + .0, S1 + 1.56), (S1 + 1.58, S1 + 2.14),
          (S3 + 4.38, S3 + 4.94), (S3 + 5.35, S3 + 5.65),
          (S4 + .56, S4 + .96), (S4 + 1.75, S4 + 2.05), (S4 + 2.50, S4 + 2.82), (S4 + 3.12, S4 + 3.60), (S4 + 3.97, S4 + 4.22),
          (S4 + 4.30, S4 + 4.76), (S4 + 5.76, S4 + 6.14), (S4 + 6.46, S4 + 6.74),
          (S5 + 1.27, S5 + 1.53), (S5 + 2.64, S5 + 3.42)]
WHOOSH = [(S1 + 1.6, .6, 1.0), (S3 + .1, 1.2, .6), (S3 + 2.18, .3, .7), (S3 + 3.06, .35, .5),
          (S3 + 5.2, 1.7, .35),                      # one long whoosh across the continuous S3 -> S4 cut
          (S4 + 2.85, .4, .45), (S4 + 5.05, .4, .45),
          (S6 + .0, 1.3, .8), (S6 + 1.3, .6, .45), (S6 + 1.85, 1.2, .35), (S6 + 3.05, .7, 1.0), (S6 + 3.8, 3.9, .25),
          (S6 + 7.6, .4, .6)]                       # last: soft whoosh into the white (ends before the outro)
CUTS = [S2, S3, S4 + 2.05, S4 + 2.85, S4 + 4.25, S4 + 5.05, S5, S5 + .85, S5 + 1.75, S5 + 2.6, S6]  # no SFX on the client outro


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
        add(buf, click(.5, rng.random()), c)
    for a, b in TYPING:
        t = a
        while t < b:
            add(buf, tick(.16 + .08 * rng.random()), t)
            t += .045 + .05 * rng.random()
    for at, d, amp in WHOOSH:
        add(buf, whoosh(d, .12 * amp), at)
    for c in CUTS:
        add(buf, thump(.18), c)
    buf[int(S7 * SR):] = 0            # nothing over the client outro
    buf /= max(1e-6, np.abs(buf).max())
    buf *= .5
    pcm = (np.clip(buf, -1, 1) * 32767).astype(np.int16)
    wav = OUT / "sfx.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes(pcm.tobytes())
    src = OUT / "bsb_timelapse.mp4"
    tmp = OUT / "tmp_bsb_timelapse_sfx.mp4"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-i", str(src), "-i", str(wav),
                    "-filter_complex", "[1:a]loudnorm=I=-24:TP=-3:LRA=11,aresample=48000,volume=-2.7dB,pan=stereo|c0=c0|c1=c0[a]",
                    "-map", "0:v", "-map", "[a]", "-c:v", "copy", "-c:a", "aac", "-b:a", "160k", "-shortest",
                    "-movflags", "+faststart", str(tmp)], check=True)
    tmp.replace(OUT / "bsb_timelapse_sfx.mp4")
    wav.unlink()
    print("wrote", OUT / "bsb_timelapse_sfx.mp4")


if __name__ == "__main__":
    main()
