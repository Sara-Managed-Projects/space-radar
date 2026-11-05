#!/bin/bash
# Build the communications-satellite models of release 1.9.0 (batch comms): json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/comms-builder/build.sh [oneweb]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in ${@:-oneweb}; do
  id=$(python3 -c "import sys; sys.path.insert(0, '$HERE'); import $m; print($m.FILE_ID)")
  python3 "$HERE/run.py" "$m" 30,25 > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/$id.json" "$ROOT/site/models/$id.glb")
done
