#!/bin/bash
# Build the four Vostok models: json (python, here) -> .glb (node, write-glb-parts.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/vostok-builder/build.sh [r7 3ka seat chutes]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in ${@:-r7 3ka seat chutes}; do
  case $m in
    r7) py=r7.py; id=r7-8k72k ;;
    3ka) py=vostok3ka.py; id=vostok-3ka ;;
    seat) py=seat.py; id=vostok-seat ;;
    chutes) py=chutes.py; id=vostok-chutes ;;
  esac
  python3 "$HERE/$py" "$HERE/out/$id.json"
  (cd "$GLTFKIT" && node "$HERE/write-glb-parts.mjs" "$HERE/out/$id.json" "$ROOT/site/models/$id.glb")
done
