#!/usr/bin/env bash
# Run what CI runs, on your own machine, with whichever node and python3 are on PATH.
#
#   scripts/test.sh                 # everything (a few minutes)
#   scripts/test.sh contract        # only the items whose name contains "contract"
#   scripts/test.sh trip narration  # ...or any of several words
#   scripts/test.sh --list          # name every item, run nothing
#
# WHY. .github/workflows/ci.yml lists about a hundred and forty steps by hand, each with the reason
# it exists; nobody should have to copy them out to know whether a change is green. This runs the
# same things by pattern: every tests/test_*.mjs under node, every tests/test_*.py, the two
# validators, and every generator's and builder's --check. A new test file is picked up by its name.
#
# Needs: node 22 or newer, python3 with PyYAML (`pip install pyyaml`). No npm install, no build.
# Prints `ok   <item>` or `FAIL <item>` with the last lines of its output, then FAILS=<n>; the exit
# status is 0 only when nothing failed.
set -u
cd "$(dirname "$0")/.."

LIST=0; WORDS=()
for a in "$@"; do
  case "$a" in
    --list) LIST=1 ;;
    -h|--help) sed -n '2,17p' "$0"; exit 0 ;;
    *) WORDS+=("$a") ;;
  esac
done

command -v node >/dev/null 2>&1 || { echo "node is not on PATH (22 or newer: https://nodejs.org)"; exit 2; }
command -v python3 >/dev/null 2>&1 || { echo "python3 is not on PATH"; exit 2; }
python3 -c 'import yaml' 2>/dev/null || { echo "PyYAML is missing: pip install pyyaml"; exit 2; }
if [ -d site/data/v1 ] && [ "$LIST" = 0 ]; then
  echo "note: site/data/v1/ (the saved data copy) is present. The first-visit byte test counts it;"
  echo "      move it aside if tests/test_first_visit_bytes.mjs fails here and not in CI."
fi

OUT="$(mktemp -d)"; FAILS=0; RAN=0
wanted() { # label -> 0 when no words were given or any word is in the label
  [ "${#WORDS[@]}" = 0 ] && return 0
  for w in "${WORDS[@]}"; do case "$1" in *"$w"*) return 0 ;; esac; done
  return 1
}
run() { # label, command...
  local label="$1"; shift
  wanted "$label" || return 0
  if [ "$LIST" = 1 ]; then echo "$label"; return 0; fi
  RAN=$((RAN + 1))
  local log="$OUT/$RAN.log"
  if "$@" > "$log" 2>&1; then echo "ok   $label"
  else echo "FAIL $label"; tail -15 "$log" | sed 's/^/     | /'; FAILS=$((FAILS + 1)); fi
}

for t in tests/test_*.mjs; do run "$t" node "$t"; done
for t in tests/test_*.py; do run "$t" python3 "$t"; done
run "scripts/check_registry.py" python3 scripts/check_registry.py
run "scripts/check_copy.py" python3 scripts/check_copy.py
for g in scripts/gen_*_js.py scripts/gen_trip_pages.py scripts/gen_sources_json.py \
         scripts/gen_modulepreload.py scripts/gen_home_seo.py scripts/narrate.py \
         scripts/build_trip_thumbs.py scripts/build_nebulae.py scripts/build-fonts.py; do
  [ -f "$g" ] && run "$g --check" python3 "$g" --check
done

[ "$LIST" = 1 ] && exit 0
rm -rf "$OUT"
[ "$RAN" = 0 ] && { echo "nothing matches: ${WORDS[*]}   (scripts/test.sh --list names every item)"; exit 2; }
echo "FAILS=$FAILS"
[ "$FAILS" = 0 ]
