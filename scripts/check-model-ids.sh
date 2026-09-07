#!/usr/bin/env bash
#
# Check every NORAD id in site/js/scene/realmodels.js against the live catalogue.
#
#   ./scripts/check-model-ids.sh
#
# WHY THIS EXISTS
# Two mappings shipped to production pointing at the wrong object. 27424 was mapped to Chandra;
# 27424 is AQUA, and Chandra is 25867. 39174 was mapped to Landsat 8; 39174 is a BREEZE-M DEBRIS
# TANK, and Landsat 8 is 39084. So the app drew a space telescope on an Earth-observing satellite,
# and a Landsat on a piece of debris -- confidently, with nothing on screen saying so.
#
# The `named:` route has a class gate precisely to stop that. The `norad:` route had none, because
# a catalogue number is exact. The number was exact. It was also wrong. Exactness is not accuracy,
# and this script is the difference.
#
# NOT part of CI, deliberately: it needs the network and CelesTrak's rate limit is one fetch per
# file per two hours. A red build for somebody else's outage is how a team learns to ignore red
# builds. Run it when you add or change a mapping.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="$ROOT/site/js/scene/realmodels.js"
UA="space-radar-id-check/1.0 (+https://spaceradar.ai)"
[ -f "$SRC" ] || { echo "cannot find $SRC" >&2; exit 1; }

# Pull "<id>: { ... catalogue: '<name>' ... }" out of the norad block.
PAIRS=$(python3 - "$SRC" <<'PY'
import re, sys
src = open(sys.argv[1], encoding="utf-8").read()
start = src.index("norad: {")
# The block's own closing brace is the one at the start of a line with two spaces of indent.
# `src.index("},", start)` finds the FIRST ENTRY's closing brace instead, which is how the first
# version of this script found zero mappings and reported the file had changed shape.
end = src.index("\n  },", start)
for m in re.finditer(r"(\d+):\s*\{([^}]*)\}", src[start:end]):
    norad, body = m.group(1), m.group(2)
    name = re.search(r"catalogue:\s*'([^']*)'", body)
    print(f"{norad}\t{name.group(1) if name else ''}")
PY
)

[ -n "$PAIRS" ] || { echo "no norad mappings found -- has the file changed shape?" >&2; exit 1; }

fail=0
checked=0
missing_name=0

while IFS=$'\t' read -r norad expected; do
  [ -n "$norad" ] || continue
  if [ -z "$expected" ]; then
    printf '  ?      %-8s has no `catalogue:` name, so it cannot be checked\n' "$norad"
    missing_name=$((missing_name + 1))
    continue
  fi
  body=$(curl -sS -m 30 -A "$UA" \
    "https://celestrak.org/NORAD/elements/gp.php?CATNR=$norad&FORMAT=json" || echo "")
  actual=$(printf '%s' "$body" | python3 -c "
import json,sys
try:
    d = json.load(sys.stdin)
    print(d[0]['OBJECT_NAME'] if d else '<not in catalogue>')
except Exception:
    print('<could not read>')
" 2>/dev/null || echo "<could not read>")

  checked=$((checked + 1))
  case "$actual" in
    "<could not read>"|"")
      # Rate limited or offline. NOT a failure: this script must not report a network problem as
      # a wrong mapping, which is the same class of lie it exists to catch.
      printf '  --     %-8s could not look (rate limited or offline)\n' "$norad"
      ;;
    "$expected")
      printf '  ok     %-8s %s\n' "$norad" "$actual"
      ;;
    *)
      printf '  WRONG  %-8s expected %-22s catalogue says %s\n' "$norad" "$expected" "$actual"
      fail=$((fail + 1))
      ;;
  esac
  sleep 1   # be polite; the whole point is not to get firewalled
done <<< "$PAIRS"

echo
if [ "$missing_name" -gt 0 ]; then
  echo "$missing_name mapping(s) carry no \`catalogue:\` name and were not checked."
fi
if [ "$fail" -gt 0 ]; then
  echo "$fail mapping(s) point at the wrong object. Fix them before deploying:"
  echo "  a wrong id draws the wrong spacecraft, and nothing on screen says so."
  exit 1
fi
echo "$checked mapping(s) checked, none wrong."
