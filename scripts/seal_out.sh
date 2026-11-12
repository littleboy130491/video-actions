#!/usr/bin/env bash
# seal_out.sh <workdir> <scene|FINAL> — encrypts rendered mp4(s) into ./sealed/*.enc
set -euo pipefail
: "${RENDER_KEY:?}"
W="$1"; S="$2"; mkdir -p sealed
OUT=$(ls -d "$W"/out* | head -1)
if [ "$S" = "FINAL" ]; then
  files=$(ls -t "$OUT"/*timelapse*.mp4)
else
  files=$(ls "$OUT"/*.part*.mp4 2>/dev/null | grep -v '/tmp_' || true)
fi
for f in $files; do
  n=$(basename "$f")
  openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:RENDER_KEY -in "$f" -out "sealed/$n.enc"
  echo "sealed $n"
done
