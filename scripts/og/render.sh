#!/bin/bash
# Renders each scripts/og/*.html into src/og/<name>.png at 1200x630 — the size
# iMessage, Slack and friends want for a link preview card.
#
# Run it after editing a template; the PNGs are committed, so the build only
# copies them.
set -euo pipefail

here="$(cd "$(dirname "$0")" && pwd)"
out="$here/../../src/og"
chrome="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"

mkdir -p "$out"

for f in "$here"/*.html; do
  name="$(basename "$f" .html)"
  "$chrome" --headless --disable-gpu --hide-scrollbars \
    --force-device-scale-factor=1 --window-size=1200,630 \
    --default-background-color=00000000 \
    --virtual-time-budget=3000 \
    --screenshot="$out/$name.png" "file://$f" 2>/dev/null
  echo "src/og/$name.png"
done
