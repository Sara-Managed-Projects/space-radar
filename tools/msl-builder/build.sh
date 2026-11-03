#!/bin/bash
# Build the Mars Science Laboratory models of the Curiosity Moment (release 1.7.9): json (python, here) -> .glb (node, tools/vostok-builder/write-glb-parts.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/msl-builder/build.sh [entry descent]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in ${@:-entry descent}; do
  case $m in
    entry) id=msl-entry ;;
    descent) id=msl-descent-stage ;;
  esac
  python3 "$HERE/msl.py" "$m" "$HERE/out/$id.json"
  (cd "$GLTFKIT" && node "$ROOT/tools/vostok-builder/write-glb-parts.mjs" "$HERE/out/$id.json" "$ROOT/site/models/$id.glb")
done
