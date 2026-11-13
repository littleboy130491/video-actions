#!/usr/bin/env bash
# pack.sh <project_dir> <bundle_id>  — run locally. Packs engine/scenes/design/assets/fonts/out(prebuilt)
# + Inter fonts, encrypts to bundles/<bundle_id>.enc with $RENDER_KEY.
set -euo pipefail
: "${RENDER_KEY:?}"
P="$1"; ID="$2"; HERE="$(cd "$(dirname "$0")/.." && pwd)"
T=$(mktemp -d)
cp -r "$P"/{engine,scenes,design,assets,fonts} "$T"/ 2>/dev/null || true
[ -d "$P/engine2" ] && cp -r "$P/engine2" "$T"/
for o in out out2; do
  if [ -d "$P/$o" ]; then mkdir -p "$T/$o"; find "$P/$o" -maxdepth 1 \( -name '*outro*.mp4' -o -name 'sfx_events.json' \) -exec cp {} "$T/$o"/ \; ; fi
done
mkdir -p "$T/ci_fonts"; cp /usr/share/fonts/opentype/inter/Inter-{Regular,Medium,SemiBold,Bold}.otf "$T/ci_fonts"/ 2>/dev/null || true
rm -rf "$T/scenes/akr_reference"
tar -czf - -C "$T" . | openssl enc -aes-256-cbc -pbkdf2 -iter 200000 -salt -pass env:RENDER_KEY -out "$HERE/bundles/$ID.enc"
rm -rf "$T"; ls -lh "$HERE/bundles/$ID.enc"
