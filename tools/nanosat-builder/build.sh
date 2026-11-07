#!/bin/bash
# Build the models of release 2.0.0 batch m3-mid: json (python, here) -> .glb (node, tools/stage-builder/write-glb.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/nanosat-builder/build.sh [kineis qps]
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
for m in ${@:-kineis qps}; do
  FILE=$m; [ "$m" = qps ] && FILE=qps-sar
  python3 "$HERE/run.py" "$m" --export > /dev/null
  (cd "$GLTFKIT" && node "$ROOT/tools/stage-builder/write-glb.mjs" "$HERE/out/$m.json" "$ROOT/site/models/$FILE.glb")
done
