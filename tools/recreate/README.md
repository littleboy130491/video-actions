# tools/recreate — re-shoot an ad's structure with Seedance 2.5 Flash (OpenRouter)

The reference ad supplies structure only (shot count, lengths, transitions, framing, camera energy). Every shot is
generated new from your own prompts, first frames and reference images. Don't put another brand's logo, product or
characters into prompts or reference images.

```
python3 tools/recreate/recreate.py analyze REF.mp4 --out W        # W/plan.json, W/reference/*.jpg, contact.jpg
python3 tools/recreate/recreate.py describe W/plan.json           # optional: vision model writes per-shot notes
python3 tools/recreate/recreate.py generate W/plan.json --dry-run # requests + cost estimate, nothing spent
python3 tools/recreate/recreate.py generate W/plan.json --only s01 --max-usd 1
python3 tools/recreate/recreate.py assemble W/plan.json [--music track.mp3]   # -> W/recreated.mp4
```

- **Key:** `OPENROUTER_API_KEY`, or a network secret for `openrouter.ai` in a Claude Code cloud environment (the proxy
  injects it; the variable can stay unset).
- **plan.json:** `style` (prefixed to every prompt), `references` (images for every shot), and per shot `prompt`,
  `first_frame` / `last_frame`, `references`, `seed`, `trim_from`, `transition_in` (cut, fade, dissolve, wipe, whip,
  push, zoom, circle, smooth) and `transition_dur`. Images can be local paths (sent inline) or https URLs. Shots with
  no prompt are skipped; use `--only` to pick shots.
- **Analyze:** scene hits closer than `--merge` (0.25 s) are one transition; `--threshold` (0.22) favours over-splitting,
  so merge false splits by hand.
- **Cost:** Seedance 2.5 Flash bills video tokens (w×h×24×seconds/1024 × $0.000007). The minimum generation is 4 s;
  shorter shots are trimmed. Measured: 4 s at 720p 9:16 = $0.61 (480p is about 0.45× that). Real costs go to
  `W/ledger.json`; `generate` stops before passing `--max-usd` (default 2).
- **Cuts:** `assemble` trims each clip to its shot length, conforms size and fps, and joins with ffmpeg cuts or `xfade`.
