#!/usr/bin/env bash
# Compare every file under site/ with what the live site serves, byte for byte.
#
#   scripts/verify-deploy.sh                      # https://www.spaceradar.ai, every file
#   scripts/verify-deploy.sh --base=URL           # another host (staging, the CloudFront name)
#   scripts/verify-deploy.sh --skip-large         # leave out files over 1 MB (the star and galaxy bins)
#   scripts/verify-deploy.sh js/main.js css/ui.css   # just these paths
#
# WHY. deploy.sh uploads and invalidates, and says "done" -- which is what it did, not what a visitor
# gets. Every deploy since 2026-09-16 was followed by this check by hand; it caught nothing wrong in
# the files deploy.sh invalidates, and it is the only way to see a .glb or texture that changed
# contents under the same name and is still stale at the edge (deploy.sh leaves /models/* and
# /textures/* to a manual invalidation). Exit 1 on any mismatch.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="https://www.spaceradar.ai"
SKIP_LARGE=0
PATHS=()
for a in "$@"; do
  case "$a" in
    --base=*) BASE="${a#--base=}" ;;
    --skip-large) SKIP_LARGE=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) PATHS+=("$a") ;;
  esac
done

hash() { if command -v shasum >/dev/null; then shasum -a 256 | cut -d' ' -f1; else sha256sum | cut -d' ' -f1; fi; }

if [ ${#PATHS[@]} -eq 0 ]; then
  while IFS= read -r f; do PATHS+=("${f#site/}"); done < <(find site -type f ! -name '.DS_Store' | sort)
fi

ok=0; bad=0; skipped=0
for p in "${PATHS[@]}"; do
  local_file="site/$p"
  [ -f "$local_file" ] || { echo "MISSING LOCALLY  $p"; bad=$((bad + 1)); continue; }
  if [ "$SKIP_LARGE" = 1 ] && [ "$(wc -c < "$local_file")" -gt 1048576 ]; then skipped=$((skipped + 1)); continue; fi
  want=$(hash < "$local_file")
  # A cache-busting query would test the origin, not what visitors get; ask for the path itself.
  got=$(curl -s --compressed --max-time 60 "$BASE/$p" | hash)
  if [ "$want" = "$got" ]; then ok=$((ok + 1)); else echo "DIFFERS  $p"; bad=$((bad + 1)); fi
done
echo "verify-deploy: $ok match, $bad differ, $skipped skipped (over 1 MB) -- $BASE"
[ "$bad" = 0 ]
