#!/usr/bin/env bash
# The one command to run before you open a pull request.
#
#   scripts/check.sh            # the fast checks, in parallel: under a minute on a laptop
#   scripts/check.sh --fix      # first run every registry generator, so the generated files are current
#   scripts/check.sh --list     # name every item, run nothing
#
# WHY THIS AND NOT scripts/test.sh. test.sh runs everything CI runs, one item after another, and
# takes several minutes. The first outside pull requests (#557, #558, #581) show what a newcomer
# actually trips on: a registry row the validator refuses, a generated file not regenerated, a
# sentence written outside site/js/copy/en.js or longer than 60 characters, a new test file that no
# step of ci.yml runs, and the voice that cannot be rendered without a speech model. This runs
# exactly those checks and says what to do about each failure. CI still runs everything; this is
# the fast loop, not the gate.
#
# Needs: python3 with PyYAML (`pip install pyyaml`). Node 22 or newer is used when it is on PATH;
# without it the three node checks are skipped and named, and CI runs them for you.
# Prints `ok   <item>` or `FAIL <item>`, then for each failure the last lines of its output and the
# fix. The exit status is 0 only when nothing failed.
set -u
cd "$(dirname "$0")/.."

FIX=0; LIST=0
for a in "$@"; do
  case "$a" in
    --fix) FIX=1 ;;
    --list) LIST=1 ;;
    -h|--help) sed -n '2,19p' "$0"; exit 0 ;;
    *) echo "unknown argument: $a (try --help)"; exit 2 ;;
  esac
done

command -v python3 >/dev/null 2>&1 || { echo "python3 is not on PATH. Install Python 3.9 or newer: https://www.python.org/downloads/"; exit 2; }
python3 -c 'import yaml' 2>/dev/null || { echo "PyYAML is missing. Run: python3 -m pip install pyyaml"; exit 2; }
HAVE_NODE=1
command -v node >/dev/null 2>&1 || HAVE_NODE=0

# Every registry generator, by pattern, so a new one is picked up by its name (the same list as
# scripts/test.sh). The slow items come first so the parallel run ends when the slowest one does.
GENERATORS="$(ls scripts/gen_*_js.py scripts/gen_trip_pages.py scripts/gen_sources_json.py \
  scripts/gen_modulepreload.py scripts/gen_home_seo.py 2>/dev/null | sort -u)"
ITEMS="python3 scripts/check_registry.py
python3 scripts/check_copy.py
python3 scripts/narrate.py --check
python3 tests/test_credits.py
python3 tests/test_community_files.py
python3 tests/test_contributor_docs.py
python3 tests/test_no_conflict_markers.py"
for g in $GENERATORS; do ITEMS="$ITEMS
python3 $g --check"; done
NODE_ITEMS="node tests/test_chrome_copy.mjs
node tests/test_ci_runs_every_test.mjs
node tests/test_cards_copy.mjs"
if [ "$HAVE_NODE" = 1 ]; then ITEMS="$ITEMS
$NODE_ITEMS"; fi

if [ "$LIST" = 1 ]; then echo "$ITEMS"; exit 0; fi

if [ "$FIX" = 1 ]; then
  echo "Regenerating every registry mirror ..."
  for g in $GENERATORS; do
    python3 "$g" > /dev/null 2>&1 || echo "     $g could not write its file; its --check below says why"
  done
fi

START=$(date +%s)
OUT="$(mktemp -d)"
export OUT
JOBS="${CHECK_JOBS:-$( (getconf _NPROCESSORS_ONLN || sysctl -n hw.ncpu) 2>/dev/null | head -1)}"
case "$JOBS" in ''|*[!0-9]*) JOBS=4 ;; esac

# One item per line into a small pool. Each job keeps its output in a file named after its line
# number and leaves a `.fail` beside it when it fails; the summary below reads those.
echo "$ITEMS" | awk '{print NR "\t" $0}' | xargs -P "$JOBS" -I{} bash -c '
  line="$1"; n="${line%%	*}"; cmd="${line#*	}"
  if $cmd > "$OUT/$n.log" 2>&1; then echo "ok   $cmd"; else echo "FAIL $cmd"; echo "$cmd" > "$OUT/$n.fail"; fi
' _ {}

hint() { # the command that failed -> what to do about it
  case "$1" in
    *narrate.py*)
      echo "A trip card's words changed, so its voice must be rendered again. That needs a speech model"
      echo "you are not expected to have. This one is fine to leave red: say so in the pull request and"
      echo "a maintainer renders the voice onto your branch." ;;
    *gen_modulepreload.py*|*gen_home_seo.py*)
      g="${1#python3 }"; g="${g% --check}"
      echo "site/index.html is out of date. Run: python3 $g   then commit site/index.html." ;;
    *"scripts/gen_"*)
      g="${1#python3 }"; g="${g% --check}"
      echo "A generated file does not match its registry. Run: python3 $g"
      echo "then commit the file it wrote together with your YAML change (or run scripts/check.sh --fix)." ;;
    *check_registry.py*)
      echo "A registry row breaks a rule. The lines above name the file, the row and what to change."
      echo "The usual one: a fact with no source. Add the source (a URL and the day you read it) to the row." ;;
    *check_copy.py*)
      echo "A sentence a visitor reads is written inside UI code. Move it to site/js/copy/en.js and"
      echo "read it from COPY, as the file you are editing already does for its other strings." ;;
    *test_chrome_copy*)
      echo "A string in site/js/copy/en.js is too long for the place it is drawn. A line of chrome is at"
      echo "most 60 characters (90 for a tooltip). Shorten the string named above." ;;
    *test_ci_runs_every_test*)
      echo "A test file is run by no step of .github/workflows/ci.yml. Add the step the message above"
      echo "gives you (a name that says why the test exists, and its run: line) to the job that fits." ;;
    *test_credits*)
      echo "A data source or a model named in a registry has no line in CREDITS.md. Add its credit line"
      echo "and licence there." ;;
    *test_contributor_docs*|*test_community_files*)
      echo "A contributor document names a file that does not exist, or broke one of its own rules."
      echo "The lines above name the document and the path." ;;
    *) echo "Read the lines above: each check is written to say what is wrong and what to do." ;;
  esac
}

FAILS=0; SOFT=0
for f in "$OUT"/*.fail; do
  [ -f "$f" ] || continue
  cmd="$(cat "$f")"; log="${f%.fail}.log"
  echo
  echo "---- FAIL $cmd"
  tail -12 "$log" | sed 's/^/   | /'
  echo "   WHAT TO DO:"
  hint "$cmd" | sed 's/^/   /'
  case "$cmd" in *narrate.py*) SOFT=$((SOFT + 1)) ;; *) FAILS=$((FAILS + 1)) ;; esac
done
rm -rf "$OUT"
echo
if [ "$HAVE_NODE" = 0 ]; then
  echo "note: node is not on PATH, so these were skipped (CI runs them): $(echo "$NODE_ITEMS" | sed 's/^node //' | tr '\n' ' ')"
fi
ELAPSED=$(( $(date +%s) - START ))
if [ "$FAILS" = 0 ] && [ "$SOFT" = 0 ]; then
  echo "PASS  every check is green (${ELAPSED}s). Open the pull request."
elif [ "$FAILS" = 0 ]; then
  echo "PASS, with the voice check red (${ELAPSED}s). Open the pull request and say the narration needs rendering."
else
  echo "FAIL  $FAILS check(s) failed (${ELAPSED}s). Fix the ones above and run scripts/check.sh again."
fi
# CI sets CHECK_MAX_SECONDS so the "under a minute" this file and docs/FIRST_PR.md promise stays true.
if [ -n "${CHECK_MAX_SECONDS:-}" ] && [ "$ELAPSED" -gt "$CHECK_MAX_SECONDS" ]; then
  echo "FAIL  the check took ${ELAPSED}s, more than the ${CHECK_MAX_SECONDS}s it promises. Move the slow item out."
  exit 1
fi
[ "$FAILS" = 0 ]
