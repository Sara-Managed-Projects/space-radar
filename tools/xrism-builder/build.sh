#!/bin/bash
# XRISM and Hitomi rebuilt in code: json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/xrism-builder/build.sh xrism hitomi
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in "$@"; do
  NORENDER=1 python3 "$HERE/run.py" "$m" > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/$m.json" "$ROOT/site/models/$m.glb")
done
