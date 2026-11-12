#!/usr/bin/env bash
# fetch.sh <run_id> <dest>  — fetch sealed outputs from branch out-<run_id> and decrypt (needs $RENDER_KEY)
set -euo pipefail
: "${RENDER_KEY:?}"
mkdir -p "$2"; T=$(mktemp -d)
git clone -q --depth 1 --branch "out-$1" "$(git -C "$(dirname "$0")/.." remote get-url origin)" "$T"
for f in "$T"/*.enc; do
  openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:RENDER_KEY -in "$f" -out "$2/$(basename "$f" .enc)"
done
rm -rf "$T"; ls -lh "$2"
