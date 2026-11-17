#!/bin/bash
# Build the four rebuilt models of release 2.1.0 (batch models-weak): json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/weak-builder/build.sh globalstar2 o3bmpower galileoiov fengyun3
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in "$@"; do
  id=$(python3 -c "import sys; sys.path.insert(0, '$HERE'); import $m; print($m.FILE_ID)")
  NORENDER=1 python3 "$HERE/run.py" "$m" > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/$id.json" "$ROOT/site/models/$id.glb")
done
