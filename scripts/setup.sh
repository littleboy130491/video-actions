#!/usr/bin/env bash
# setup.sh <workdir> [--light]  — fonts + python deps on a GitHub ubuntu runner (Chrome & ffmpeg are preinstalled)
set -euo pipefail
W="$1"
if [ -d "$W/ci_fonts" ]; then mkdir -p ~/.local/share/fonts && cp -r "$W/ci_fonts/." ~/.local/share/fonts/ && fc-cache -f >/dev/null; fi
command -v ffmpeg >/dev/null || (sudo apt-get update -qq && sudo apt-get install -y -qq ffmpeg)
python3 -m pip install -q numpy pillow
if [ "${2:-}" != "--light" ]; then python3 -m pip install -q playwright; fi
google-chrome --version || true; ffmpeg -version | head -1
