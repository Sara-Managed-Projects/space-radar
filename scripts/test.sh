#!/usr/bin/env bash
# Run what CI runs, on your own machine, with whichever node and python3 are on PATH.
#
#   scripts/test.sh                 # everything (a few minutes)
#   scripts/test.sh contract        # only the items whose name contains "contract"
#   scripts/test.sh trip narration  # ...or any of several words
#   scripts/test.sh --list          # name every item, run nothing
#   scripts/test.sh --quick         # only the items that touch the files you changed (seconds, not minutes)
#   scripts/test.sh --quick main    # ...changed since `main` rather than since the last commit
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

LIST=0; QUICK=0; WORDS=()
for a in "$@"; do
  case "$a" in
    --list) LIST=1 ;;
    --quick) QUICK=1 ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
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

# --quick: WHICH ITEMS TOUCH WHAT CHANGED. Changed = what git says differs from the base (the word
# after --quick, default HEAD) plus untracked files. An item runs when (a) it is itself a changed
# test, (b) a changed file's name with its folder (`ui/explore.js`, `registry/tours.yaml`) appears in
# the item's text -- tests name the modules they import and the registries they read -- or (c) the
# path map below says so.
# This is a contributor's fast loop, not the gate: CI still runs everything.
QUICK_MAP='
registry/|scripts/check_registry.py tests/test_refusals.py tests/test_credits.py gen_
site/js/copy/|scripts/check_copy.py tests/test_chrome_copy.mjs tests/test_refusals.py
site/js/ui/|scripts/check_copy.py tests/test_contract.mjs tests/test_chrome_copy.mjs
site/js/|tests/test_contract.mjs tests/test_relative_urls.mjs scripts/gen_modulepreload.py
site/css/|tests/test_tokens.mjs tests/test_relative_urls.mjs
site/index.html|scripts/gen_modulepreload.py scripts/gen_home_seo.py tests/test_manifest.mjs tests/test_relative_urls.mjs
site/sw.js|tests/test_sw_routes.mjs tests/test_relative_urls.mjs
site/manifest.webmanifest|tests/test_manifest.mjs
site/images/icons/|tests/test_manifest.mjs
site/textures/|scripts/check_registry.py tests/test_refusals.py
site/models/|scripts/check_registry.py tests/test_refusals.py
site/audio/|scripts/check_registry.py scripts/narrate.py
site/fonts/|scripts/build-fonts.py
site/t/|scripts/gen_trip_pages.py tests/test_seo.py
scripts/check_registry.py|scripts/check_registry.py tests/test_refusals.py
scripts/check_copy.py|scripts/check_copy.py tests/test_refusals.py
scripts/stamp_sw.py|tests/test_sw_routes.mjs tests/test_manifest.mjs
scripts/deploy.sh|tests/test_manifest.mjs tests/test_harvester_scripts.py
scripts/build_seo.py|tests/test_seo.py tests/test_refusals.py
scripts/check_seo.py|tests/test_seo.py tests/test_refusals.py
harvest/|tests/test_harvest.py tests/test_harvester_scripts.py scripts/check_registry.py
.github/workflows/release.yml|tests/test_manifest.mjs
CREDITS.md|tests/test_credits.py scripts/check_registry.py
'
CHANGED=""
if [ "$QUICK" = 1 ]; then
  BASE="HEAD"
  if [ "${#WORDS[@]}" -gt 0 ]; then BASE="${WORDS[0]}"; WORDS=(); fi
  git rev-parse --verify -q "$BASE^{commit}" >/dev/null || { echo "--quick: '$BASE' is not a commit git knows"; exit 2; }
  CHANGED="$( { git diff --name-only "$BASE" --; git ls-files --others --exclude-standard; } | sort -u)"
  [ -n "$CHANGED" ] || { echo "--quick: nothing differs from $BASE, so there is nothing to run"; exit 0; }
fi
quick_wanted() { # label, the file the item runs -> 0 when a changed file touches it
  local label="$1" file="$2" f stem rule prefix targets tgt
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    [ "$f" = "$file" ] && return 0
    stem="$(basename "$(dirname "$f")")/$(basename "$f")"
    if [ -f "$file" ] && grep -qF -- "$stem" "$file"; then return 0; fi
    while IFS= read -r rule; do
      [ -n "$rule" ] || continue
      prefix="${rule%%|*}"; targets="${rule#*|}"
      case "$f" in "$prefix"*) for tgt in $targets; do case "$label" in *"$tgt"*) return 0 ;; esac; done ;; esac
    done <<< "$QUICK_MAP"
  done <<< "$CHANGED"
  return 1
}

OUT="$(mktemp -d)"; FAILS=0; RAN=0
wanted() { # label -> 0 when no words were given or any word is in the label
  [ "${#WORDS[@]}" = 0 ] && return 0
  for w in "${WORDS[@]}"; do case "$1" in *"$w"*) return 0 ;; esac; done
  return 1
}
run() { # label, command...
  local label="$1"; shift
  wanted "$label" || return 0
  if [ "$QUICK" = 1 ]; then quick_wanted "$label" "$2" || return 0; fi
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
         scripts/build_trip_thumbs.py scripts/build_nebulae.py scripts/build-fonts.py scripts/stamp_sw.py \
         scripts/build_ephemerides.py; do
  [ -f "$g" ] && run "$g --check" python3 "$g" --check
done

[ "$LIST" = 1 ] && exit 0
rm -rf "$OUT"
if [ "$RAN" = 0 ] && [ "$QUICK" = 1 ]; then echo "--quick: no item touches what changed; run scripts/test.sh for everything"; exit 0; fi
[ "$RAN" = 0 ] && { echo "nothing matches: ${WORDS[*]}   (scripts/test.sh --list names every item)"; exit 2; }
[ "$QUICK" = 1 ] && echo "quick: $RAN item(s) that touch what changed. The gate is scripts/test.sh with no words."
echo "FAILS=$FAILS"
[ "$FAILS" = 0 ]
