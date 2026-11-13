#!/usr/bin/env bash
# seal_out.sh <workdir> <scene|FINAL> — encrypts rendered mp4(s) into ./sealed/*.enc
set -euo pipefail
: "${RENDER_KEY:?}"
W="$1"; S="$2"; mkdir -p sealed
OUT=$(ls -d "$W"/out* | head -1)
if [ -f "$W/video.json" ]; then   # core renderer: out dir and final name come from the project config
  OUT="$W/$(python3 -c 'import json,sys;print(json.load(open(sys.argv[1])).get("out","out"))' "$W/video.json")"
fi
if [ "$S" = "FINAL" ]; then
  if [ -f "$W/video.json" ]; then
    F=$(python3 -c 'import json,sys;c=json.load(open(sys.argv[1]));print(c.get("final") or (c.get("name") or "video")+"_final.mp4")' "$W/video.json")
    files=$(ls -t "$OUT/$F" "$OUT/${F%.mp4}_sfx.mp4" 2>/dev/null || true)
  else
    files=$(ls -t "$OUT"/*timelapse*.mp4 "$OUT"/*_final*.mp4 2>/dev/null | grep -v '/tmp_' || true)
  fi
  [ -n "$files" ] || { echo "no final mp4 in $OUT"; exit 1; }
else
  files=$(ls "$OUT"/*.part*.mp4 2>/dev/null | grep -v '/tmp_' || true)
fi
for f in $files; do
  n=$(basename "$f")
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:RENDER_KEY -in "$f" -out "sealed/$n.enc"
  echo "sealed $n"
done
