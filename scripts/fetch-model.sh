#!/usr/bin/env bash
#
# Fetch a NASA 3D model, re-encode it for the web, and drop it in site/models/.
#
#   ./scripts/fetch-model.sh --nasa "Curiosity Rover (MSL)" --as curiosity
#   ./scripts/fetch-model.sh --url https://example.com/thing.glb --as thing
#   ./scripts/fetch-model.sh --list                    # every NASA model with its size
#   ./scripts/fetch-model.sh --list rover              # ...filtered
#
# Options:
#   --nasa NAME     a folder name in github.com/nasa/NASA-3D-Resources under "3D Models"
#   --url URL       any other glTF/GLB, for sources that are not NASA
#   --as ID         the output name: site/models/<ID>.glb. Required.
#   --error N       simplification tolerance, default 0.001. Raise it to shrink further.
#   --keep-raw      leave the original next to the output, for comparison
#   --list [FILTER] print the NASA catalogue and exit
#
# WHY RE-ENCODING IS NOT OPTIONAL
# NASA ships its GLBs with KHR_draco_mesh_compression. three.js refuses those without a ~300 kB
# WebAssembly decoder in the browser. Re-encoding to EXT_meshopt_compression needs a 29 kB decoder
# -- already vendored -- and the files come out SMALLER anyway, because these are CAD models with
# far more detail than an object a few hundred pixels across can show:
#
#     Viking Lander  1 806 kB -> 110 kB      Magellan     3 082 kB -> 253 kB
#     Ulysses        2 404 kB -> 163 kB      Mars Odyssey 5 665 kB -> 372 kB
#     Hubble         1 655 kB -> 163 kB      Bennu          321 kB ->  23 kB
#
# AFTER RUNNING THIS you still have to do two things by hand, deliberately:
#   1. add a row to registry/models.yaml under `real_models:` -- CI refuses a model file with no
#      row, and the row must say the licence, the credit AND what was modified;
#   2. map it in site/js/scene/realmodels.js, which is where you decide WHICH OBJECTS get it.
#      That decision is the one thing a script must not make for you: the wrong model on an object
#      is a confident lie, and this project is organised against exactly that.

set -euo pipefail

NASA=""
URL=""
AS=""
ERROR="0.001"
KEEP_RAW=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="${TMPDIR:-/tmp}/space-radar-models"
mkdir -p "$CACHE"

list_nasa() {
  local filter="${1:-}"
  local index="$CACHE/nasa-tree.json"
  if [ ! -s "$index" ]; then
    echo "fetching the NASA model index..." >&2
    curl -sL -m 120 -o "$index" \
      "https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1"
  fi
  python3 - "$index" "$filter" <<'PY'
import json, sys
index, filt = sys.argv[1], sys.argv[2].lower()
tree = json.load(open(index)).get("tree", [])
rows = [(x.get("size", 0)//1024, x["path"].split("/")[-1][:-4])
        for x in tree if x["path"].lower().endswith(".glb")]
rows = [r for r in rows if not filt or filt in r[1].lower()]
print(f"{len(rows)} model(s)\n")
for kb, name in sorted(rows):
    print(f"  {kb:>6} kB  {name}")
PY
}

while [ $# -gt 0 ]; do
  case "$1" in
    --nasa)     NASA="${2:?}"; shift 2 ;;
    --url)      URL="${2:?}"; shift 2 ;;
    --as)       AS="${2:?}"; shift 2 ;;
    --error)    ERROR="${2:?}"; shift 2 ;;
    --keep-raw) KEEP_RAW=1; shift ;;
    --list)     list_nasa "${2:-}"; exit 0 ;;
    -h|--help)  usage 0 ;;
    *)          die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$AS" ] || die "--as is required (try --help)"
[ -n "$NASA" ] || [ -n "$URL" ] || die "one of --nasa or --url is required"
echo "$AS" | grep -Eq '^[a-z0-9][a-z0-9-]*$' || die "--as must be lower-case letters, digits and hyphens"
command -v npx >/dev/null || die "npx is needed for gltf-transform (it is a build-time tool only)"

RAW="$CACHE/$AS.raw.glb"
OUT="$ROOT/site/models/$AS.glb"
mkdir -p "$ROOT/site/models"

if [ -n "$NASA" ]; then
  # Resolve the real path out of the index rather than assuming `<folder>/<folder>.glb`. That
  # assumption is wrong often enough to matter -- InSight's four variants all live in one folder
  # under different file names -- and guessing produces a 404 that reads like a missing model.
  INDEX="$CACHE/nasa-tree.json"
  if [ ! -s "$INDEX" ]; then
    curl -sL -m 120 -o "$INDEX" \
      "https://api.github.com/repos/nasa/NASA-3D-Resources/git/trees/master?recursive=1"
  fi
  PATH_IN_REPO=$(python3 "$ROOT/scripts/_resolve_nasa_model.py" "$INDEX" "$NASA") \
    || die "no single NASA model matches that name; try --list"
  ENC=$(python3 -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1]))" "$PATH_IN_REPO")
  URL="https://raw.githubusercontent.com/nasa/NASA-3D-Resources/master/$ENC"
  echo "==> NASA: $PATH_IN_REPO"
fi

echo "==> downloading"
curl -fsSL -m 600 -o "$RAW" "$URL" || die "download failed. For a NASA model, check the exact folder name with --list"
head -c 4 "$RAW" | grep -q glTF || die "that is not a GLB (a GLB starts with the bytes 'glTF')"
BEFORE=$(wc -c < "$RAW")

echo "==> re-encoding (meshopt, simplify error $ERROR)"
# Keep stderr. Throwing it away turned every distinct failure into one unhelpful line -- and
# some of these files fail for reasons worth reading: NASA's Terra.glb, for instance, references
# its textures by external Windows paths (`..\Terra.fbm\solarpanels.tga`) that do not exist in
# the GLB, so the optimizer cannot open it at all.
LOG="$CACHE/$AS.optimize.log"
if ! npx --yes @gltf-transform/cli@4.5.0 optimize "$RAW" "$OUT" \
     --compress meshopt --simplify-error "$ERROR" --texture-compress webp >"$LOG" 2>&1; then
  echo "gltf-transform failed. Its last words:" >&2
  tail -12 "$LOG" >&2
  if grep -qi "\.fbm\|no such file\|ENOENT" "$LOG"; then
    echo >&2
    echo "That is a model naming textures it does not contain -- an FBX export that kept its" >&2
    echo "authoring machine's file paths. Stripping those references and retrying; this app" >&2
    echo "replaces every material with its own toon shader anyway, so nothing is lost:" >&2
    python3 "$ROOT/scripts/_strip_external_images.py" "$RAW" >&2 || die "could not strip the references"
    if npx --yes @gltf-transform/cli@4.5.0 optimize "$RAW" "$OUT" \
       --compress meshopt --simplify-error "$ERROR" >"$LOG" 2>&1; then
      echo "    that worked." >&2
    else
      tail -6 "$LOG" >&2
      die "still failed; this one needs a hand"
    fi
  else
    die "see the log above: $LOG"
  fi
fi
[ -s "$OUT" ] || die "gltf-transform produced nothing"
AFTER=$(wc -c < "$OUT")
[ "$KEEP_RAW" = "1" ] || rm -f "$RAW"

printf '==> site/models/%s.glb   %d kB -> %d kB  (%d%% of the original)\n' \
  "$AS" $((BEFORE/1024)) $((AFTER/1024)) $((AFTER*100/BEFORE))

if [ "$AFTER" -gt 614400 ]; then
  echo "    NOTE: over 600 kB. It is loaded on demand, so this is not fatal -- but try a larger"
  echo "    --error (0.005 or 0.01) before shipping it."
fi

cat <<NEXT

    Two things left, and neither should be automated:

    1. registry/models.yaml, under real_models: -- CI refuses a model with no row.
       - {id: $AS, file: site/models/$AS.glb, kb: $((AFTER/1024)), class: <station|satellite|probe|telescope|asteroid|site>,
          used_for: "<which objects, and why that is defensible>",
          source: "<url>", licence: "<licence>", credit: "<credit line>",
          modified: "re-encoded Draco -> meshopt, simplified, retextured with this project's toon material"}

    2. site/js/scene/realmodels.js -- decide WHICH objects get it. That is a judgement about
       identity, and the wrong model on an object is a confident lie.
NEXT
