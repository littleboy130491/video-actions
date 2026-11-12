#!/usr/bin/env bash
# open_in.sh <dir_with_enc> <workdir> — decrypts *.mp4.enc into the project's out folder
set -euo pipefail
: "${RENDER_KEY:?}"
OUT=$(ls -d "$2"/out* | head -1)
for f in "$1"/*.enc; do
  n=$(basename "$f" .enc)
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:RENDER_KEY -in "$f" -out "$OUT/$n"
  echo "opened $n"
done
