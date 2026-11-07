#!/bin/bash
# Build the geostationary-bus models of release 2.0.0 (batch m2-buses): json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/bus-builder/build.sh [e3000 ...]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in "$@"; do
  id=$(python3 -c "import sys; sys.path.insert(0, '$HERE'); import $m; print($m.FILE_ID)")
  python3 "$HERE/run.py" "$m" --export > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/$id.json" "$ROOT/site/models/$id.glb")
done
