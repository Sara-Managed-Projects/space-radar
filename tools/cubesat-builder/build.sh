#!/bin/bash
# Build the CubeSat models of release 2.0.0 (batch m2-buses): json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/cubesat-builder/build.sh [1u 2u 3u 3u-wings 6u 6u-wings 12u 12u-wings]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in ${@:-1u 2u 3u 3u-wings 6u 6u-wings 12u 12u-wings}; do
  python3 "$HERE/run.py" "$m" --export > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/cubesat-$m.json" "$ROOT/site/models/cubesat-$m.glb")
done
