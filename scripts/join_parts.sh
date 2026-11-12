#!/usr/bin/env bash
# join_parts.sh <workdir> — joins <scene>.partNN.mp4 into <scene>.mp4 (stream copy), in chunk order
set -euo pipefail
OUT=$(ls -d "$1"/out* | head -1)
for s in $(ls "$OUT"/*.part[0-9][0-9].mp4 2>/dev/null | sed -E 's#.*/##; s#\.part[0-9]{2}\.mp4##' | sort -u); do
  lst="$OUT/$s.parts.txt"; : > "$lst"
  for p in $(ls "$OUT"/$s.part[0-9][0-9].mp4 | sort); do echo "file '$p'" >> "$lst"; done
  ffmpeg -y -loglevel error -f concat -safe 0 -i "$lst" -c copy "$OUT/$s.mp4"
  rm -f "$OUT"/$s.part[0-9][0-9].mp4 "$lst"; echo "joined $s ($(ffprobe -v error -show_entries format=duration -of csv=p=0 "$OUT/$s.mp4")s)"
done
