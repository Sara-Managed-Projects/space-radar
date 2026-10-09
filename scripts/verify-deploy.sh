#!/usr/bin/env bash
# Compare every file under site/ with what the live site serves, byte for byte.
#
#   scripts/verify-deploy.sh                      # https://www.spaceradar.ai, every file
#   scripts/verify-deploy.sh --base=URL           # another host (staging, the CloudFront name)
#   scripts/verify-deploy.sh --skip-large         # leave out files over 1 MB (the star and galaxy bins)
#   scripts/verify-deploy.sh js/main.js css/ui.css   # just these paths
#   scripts/verify-deploy.sh --source             # the site was deployed with `deploy.sh --no-minify`
#   scripts/verify-deploy.sh --strip-only         # the site was deployed with `deploy.sh --strip-only`
#   scripts/verify-deploy.sh --any-encoding       # the site was deployed with `deploy.sh --no-precompress`
#
# js/, css/ and vendor/ are compared with what deploy.sh uploads, which since 2026-10-06 (internal
# #405) is scripts/minify_site.py's copy without comments, and since 2026-10-09 (internal #515) that
# copy with its ES modules through the pinned esbuild: the same script builds that copy here, in a
# temp folder, with the same flags, and those folders are checked against it.
#
# WHAT IS COMPARED IS THE DECODED BODY (internal #514, 2026-10-09). The code and the bundled data are
# stored at Brotli 11, so the bytes on the wire are not the file; scripts/fetch_hash.mjs asks with
# `Accept-Encoding: br, gzip`, decodes, and hashes what a browser would be handed. Three more checks
# come with that: every file scripts/precompress.mjs says is stored compressed must ARRIVE as `br`
# (or the deploy silently fell back to the edge's quality 5); index.html asked for with
# `Accept-Encoding: identity` must come back plain and equal (a crawler's view); and one script
# asked for with gzip only says whether the gzip fallback is installed (information, not a failure).
#
# WHY. deploy.sh uploads and invalidates, and says "done" -- which is what it did, not what a visitor
# gets. Every deploy since 2026-09-16 was followed by this check by hand; it caught nothing wrong in
# the files deploy.sh invalidates, and it is the only way to see a .glb or texture that changed
# contents under the same name and is still stale at the edge (deploy.sh leaves /models/* and
# /textures/* to a manual invalidation; /audio/* too, since spec 0035). Exit 1 on any mismatch.
set -euo pipefail
cd "$(dirname "$0")/.."

BASE="https://www.spaceradar.ai"
SKIP_LARGE=0
SOURCE=0
ANY_ENCODING=0
REAL=(--esbuild auto)
PATHS=()
for a in "$@"; do
  case "$a" in
    --base=*) BASE="${a#--base=}" ;;
    --skip-large) SKIP_LARGE=1 ;;
    --source) SOURCE=1 ;;
    --strip-only) REAL=() ;;
    --any-encoding) ANY_ENCODING=1 ;;
    -h|--help) sed -n '2,31p' "$0"; exit 0 ;;
    *) PATHS+=("$a") ;;
  esac
done

hash() { if command -v shasum >/dev/null; then shasum -a 256 | cut -d' ' -f1; else sha256sum | cut -d' ' -f1; fi; }

if [ ${#PATHS[@]} -eq 0 ]; then
  while IFS= read -r f; do PATHS+=("${f#site/}"); done < <(find site -type f ! -name '.DS_Store' | sort)
fi

command -v node >/dev/null || { echo "error: node is not installed (scripts/fetch_hash.mjs decodes Brotli; this curl may not)" >&2; exit 1; }
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT
MIN=""
if [ "$SOURCE" = 0 ]; then
  MIN="$WORK"
  python3 scripts/minify_site.py --out "$MIN/min" --quiet ${REAL[@]+"${REAL[@]}"}
fi

# Every path at once, six at a time; a cache-busting query would test the origin, not what visitors
# get, so the path itself is asked for.
printf '%s\n' "${PATHS[@]}" | node scripts/fetch_hash.mjs --base="$BASE" > "$WORK/got.tsv"
printf '%s\n' "${PATHS[@]}" | SR_RULE="file://$PWD/scripts/precompress.mjs" node --input-type=module -e '
  import { readFileSync } from "node:fs";
  const { precompressed } = await import(process.env.SR_RULE);
  for (const p of readFileSync(0, "utf8").split("\n").filter(Boolean)) console.log(precompressed(p) ? "br" : "-");
' > "$WORK/want.txt"

ok=0; bad=0; skipped=0; pages=0; sounds=0; br=0
while IFS=$'\t' read -r got encoding status p <&3 && IFS= read -r want_encoding <&4; do
  local_file="site/$p"
  [ -f "$local_file" ] || { echo "MISSING LOCALLY  $p"; bad=$((bad + 1)); continue; }
  if [ "$SKIP_LARGE" = 1 ] && [ "$(wc -c < "$local_file")" -gt 1048576 ]; then skipped=$((skipped + 1)); continue; fi
  served_file="$local_file"
  case "$p" in js/*.js|css/*.css|vendor/*.js) [ -n "$MIN" ] && [ -f "$MIN/min/$p" ] && served_file="$MIN/min/$p" ;; esac
  want=$(hash < "$served_file")
  if [ "$want" != "$got" ]; then
    echo "DIFFERS  $p  (status $status)"; bad=$((bad + 1))
  elif [ "$want_encoding" = "br" ] && [ "$encoding" != "br" ] && [ "$ANY_ENCODING" = 0 ]; then
    echo "NOT BROTLI  $p  (arrived as ${encoding}; deploy.sh stores it at Brotli 11)"; bad=$((bad + 1))
  else
    ok=$((ok + 1))
    [ "$encoding" = "br" ] && br=$((br + 1))
    # The trip pages (spec 0032) are counted on their own: they are the share URLs, and a deploy
    # that shipped the app without them is a deploy whose links unfurl to nothing.
    case "$p" in t/*.html) pages=$((pages + 1)) ;; esac
    # The sounds (spec 0035) likewise: long-cached and never invalidated by deploy.sh, so a bed
    # replaced under the same name is exactly the stale file this script exists to catch.
    case "$p" in audio/*) sounds=$((sounds + 1)) ;; esac
  fi
done 3< "$WORK/got.tsv" 4< "$WORK/want.txt"

# A crawler's view: the page, asked for with no encoding, is the page.
plain=$(printf 'index.html\n' | node scripts/fetch_hash.mjs --base="$BASE" --accept=identity)
if [ "$(printf '%s' "$plain" | cut -f1)" != "$(hash < site/index.html)" ] || [ "$(printf '%s' "$plain" | cut -f2)" != "-" ]; then
  echo "NOT PLAIN  index.html asked for with Accept-Encoding: identity ($(printf '%s' "$plain" | cut -f1-3 | tr '\t' ' '))"; bad=$((bad + 1))
fi
# The gzip fallback (scripts/edge/encoding-fallback.js): installed or not, said plainly.
fallback=$(printf 'js/main.js\n' | node scripts/fetch_hash.mjs --base="$BASE" --accept=gzip | cut -f2)
case "$fallback" in gzip) note="a client without Brotli is sent gzip" ;; br) note="a client without Brotli is sent Brotli all the same: the gzip fallback is not installed" ;; *) note="a client without Brotli is sent js/main.js as '$fallback'" ;; esac

echo "verify-deploy: $ok match ($br of them stored as Brotli, $pages trip pages and $sounds sound files among them), $bad differ, $skipped skipped (over 1 MB) -- $BASE"
echo "verify-deploy: $note"
[ "$bad" = 0 ]
