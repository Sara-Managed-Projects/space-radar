#!/bin/bash
# Build the Venera 9 and 10 lander model (release 1.9.0, batch E): json (python, here) -> .glb (node, tools/vostok-builder/write-glb-parts.mjs) in site/models/.
#   GLTFKIT=<dir with node_modules/@gltf-transform/{core,extensions,functions} and meshoptimizer> tools/venera-builder/build.sh
set -euo pipefail
if [ "${1:-}" = "--help" ] || [ "${1:-}" = "-h" ]; then
  echo "usage: GLTFKIT=<dir with node_modules> tools/venera-builder/build.sh   (writes site/models/venera-9.glb)"
  exit 0
fi
HERE="$(cd "$(dirname "$0")" && pwd)"
ROOT="$(cd "$HERE/../.." && pwd)"
export PATH=$HOME/space-radar-handoff/seed/bin:$PATH
: "${GLTFKIT:?set GLTFKIT to a directory whose node_modules holds @gltf-transform/core, extensions, functions and meshoptimizer}"
mkdir -p "$HERE/out"
python3 "$HERE/venera.py" "$HERE/out/venera-9.json"
(cd "$GLTFKIT" && node "$ROOT/tools/vostok-builder/write-glb-parts.mjs" "$HERE/out/venera-9.json" "$ROOT/site/models/venera-9.glb")
