#!/usr/bin/env bash
# fetch.sh <run_id> <dest>  — download & decrypt artifacts of a run (needs gh + $RENDER_KEY)
set -euo pipefail
: "${RENDER_KEY:?}"
mkdir -p "$2/.enc"; gh run download "$1" -D "$2/.enc"
find "$2/.enc" -name '*.enc' | while read f; do
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:RENDER_KEY -in "$f" -out "$2/$(basename "$f" .enc)"
done
rm -rf "$2/.enc"; ls -lh "$2"
