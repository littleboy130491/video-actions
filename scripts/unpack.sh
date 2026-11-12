#!/usr/bin/env bash
# unpack.sh <bundle.enc> <dest>  — decrypts an AES-256 bundle with $RENDER_KEY
set -euo pipefail
: "${RENDER_KEY:?RENDER_KEY secret missing}"
mkdir -p "$2"
openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -pass env:RENDER_KEY -in "$1" | tar -xzf - -C "$2"
echo "unpacked into $2"
