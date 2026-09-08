#!/usr/bin/env bash
#
# Build the harvester's Lambda zip, byte for byte reproducibly. No AWS is touched.
#
#   ./scripts/package-harvester.sh [--out dist/harvester.zip]
#
# Options:
#   --out PATH     where the zip goes. Default dist/harvester.zip; dist/ is git-ignored.
#   --dry-run      list what would go into the zip and write nothing.
#
# WHAT GOES IN
#   harvest/               the Python package, when it exists. Entry: harvest.lambda_handler.handler.
#   harvest/sources.json   generated here from registry/sources.yaml by scripts/gen_sources_json.py,
#                          because the runtime is stdlib-only and cannot read YAML.
# While harvest/ does not exist, the zip carries a PLACEHOLDER handler at the same module path
# (scripts/_harvester_placeholder.py). It writes the heartbeat index.json and nothing else, so the
# wiring can be provisioned and proven before the writer lands. The script says so on stdout: a
# placeholder that shipped quietly would look like a harvester that never fetches.
#
# WHY THE ZIP IS DETERMINISTIC
# Same tree in, same bytes out: entries sorted, every mtime pinned to 1980-01-01, one file mode,
# no platform extras. So the sha256 of dist/harvester.zip answers "is what is deployed what is in
# git?", and CI can package on every pull request and compare instead of trusting.
#
# Needs python3 with PyYAML -- the one dependency CI's registry job already installs.

set -euo pipefail

OUT=""
DRY_RUN=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,24p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --out)      OUT="${2:?--out needs a value}"; shift 2 ;;
    --dry-run)  DRY_RUN=1; shift ;;
    -h|--help)  usage 0 ;;
    *)          die "unknown option: $1 (try --help)" ;;
  esac
done

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -n "$OUT" ] || OUT="$ROOT/dist/harvester.zip"
case "$OUT" in /*) ;; *) OUT="$PWD/$OUT" ;; esac
case "$OUT" in *.zip) ;; *) die "--out must end in .zip (got $OUT)" ;; esac

command -v python3 >/dev/null || die "python3 is not installed"
python3 -c 'import yaml' 2>/dev/null \
  || die "PyYAML is not installed (pip install pyyaml); it mirrors registry/sources.yaml"
[ -f "$ROOT/registry/sources.yaml" ] || die "no registry/sources.yaml next to this script"

STAGE="$(mktemp -d "${TMPDIR:-/tmp}/harvester-pkg.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT

# 1. the package -- the real one, or the placeholder
# Three states, told apart by what harvest/ holds. The ENTRY POINT present: the real package.
# Python present but no entry point: a broken package, and packaging refuses rather than ship a
# Lambda that cannot start. No Python at all: only registry data (harvest/lists/, harvest/queries/,
# which the generator reads and which exist in a tree with no package), so the placeholder ships.
if [ -f "$ROOT/harvest/lambda_handler.py" ]; then
  echo "==> harvest/ found: packaging the real harvester"
  mkdir -p "$STAGE/harvest"
  # Copy the sources, not the residue: bytecode caches differ per machine and would defeat the
  # reproducible hash; a checked-in sources.json is regenerated below so the zip carries the
  # registry it is packaged next to, never a stale copy.
  (cd "$ROOT/harvest" && find . -type f \
      ! -path '*/__pycache__/*' ! -name '*.pyc' ! -name '.DS_Store' ! -path './sources.json' \
      -print0 | while IFS= read -r -d '' f; do
        mkdir -p "$STAGE/harvest/$(dirname "$f")"
        cp "$f" "$STAGE/harvest/$f"
      done)
  if [ -f "$ROOT/harvest/sources.json" ]; then
    echo "    NOTE: harvest/sources.json is checked in; the zip gets a fresh one from the registry."
  fi
elif [ -d "$ROOT/harvest" ] && find "$ROOT/harvest" -name '*.py' -not -path '*/__pycache__/*' | grep -q .; then
  die "harvest/ has Python in it but no lambda_handler.py; the Lambda entry is harvest.lambda_handler.handler"
else
  echo "==> no harvest package in the tree: packaging the PLACEHOLDER handler"
  echo "    It writes the heartbeat index.json (run.placeholder=true, no snapshots) and fetches nothing."
  mkdir -p "$STAGE/harvest"
  : > "$STAGE/harvest/__init__.py"
  cp "$ROOT/scripts/_harvester_placeholder.py" "$STAGE/harvest/lambda_handler.py"
fi

# 2. the registry mirror. The generator writes the CHECKED-IN mirror at harvest/sources.json (so CI
#    can --check it, exactly as the JS mirrors are checked); packaging refreshes it and copies it in.
#    In a tree without the package the file lands beside harvest/lists/, which the generator reads.
mkdir -p "$ROOT/harvest"
python3 "$ROOT/scripts/gen_sources_json.py" | sed 's/^/    /'
cp "$ROOT/harvest/sources.json" "$STAGE/harvest/sources.json"

# 3. the zip
FILES=$(cd "$STAGE" && find . -type f | sed 's#^\./##' | LC_ALL=C sort)
COUNT=$(printf '%s\n' "$FILES" | grep -c . || true)
[ "$COUNT" -gt 0 ] || die "nothing to package"

if [ "$DRY_RUN" = "1" ]; then
  echo "==> would write $OUT with $COUNT files:"
  printf '%s\n' "$FILES" | sed 's/^/      /'
  exit 0
fi

mkdir -p "$(dirname "$OUT")"
python3 - "$STAGE" "$OUT" <<'PY'
import hashlib, os, sys, zipfile
stage, out = sys.argv[1], sys.argv[2]
paths = sorted(
    os.path.relpath(os.path.join(d, f), stage).replace(os.sep, "/")
    for d, _, files in os.walk(stage) for f in files
)
with zipfile.ZipFile(out, "w") as z:
    for rel in paths:
        # A fixed timestamp, a fixed mode, no extra fields: the entry depends on its bytes only.
        info = zipfile.ZipInfo(rel, date_time=(1980, 1, 1, 0, 0, 0))
        info.compress_type = zipfile.ZIP_DEFLATED
        info.create_system = 3
        info.external_attr = 0o644 << 16
        with open(os.path.join(stage, rel), "rb") as fh:
            z.writestr(info, fh.read())
size = os.path.getsize(out)
digest = hashlib.sha256(open(out, "rb").read()).hexdigest()
print(f"==> wrote {out}")
print(f"    {len(paths)} files, {size} bytes, sha256 {digest}")
PY
