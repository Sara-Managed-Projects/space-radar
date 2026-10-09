#!/usr/bin/env bash
#
# Push site/ to a bucket and invalidate the app files.
#
#   ./scripts/deploy.sh --bucket my-space-radar --distribution E1ABCDEF23456
#
# Options:
#   --bucket NAME         required. The bucket provision.sh made.
#   --region REGION       default eu-north-1.
#   --distribution ID     optional. Without it nothing is invalidated, so a deploy can take up to
#                         the cache lifetime to appear.
#   --profile NAME        an AWS CLI profile. Default: whatever your environment already uses.
#   --assets-only         skip the app files; push textures, data, models, images, the
#                         share pictures (og/) and the sounds (audio/) only.
#   --app-only            skip the big assets; push HTML, CSS, JS, the vendored libraries (vendor/,
#                         since 2026-10-07: they are code, stripped and stamped with the app),
#                         the trip pages (t/), robots.txt
#                         and the pages scripts/build_seo.py builds (o/, sitemap.xml, 404.html,
#                         object-pages.json)
#                         only. The usual case.
#   --no-minify           upload js/ and css/ as they are written. By default a deploy uploads a
#                         copy without comments and indentation (scripts/minify_site.py); this is
#                         the way back if that copy is ever in doubt.
#   --no-precompress      upload the code and the bundled data uncompressed and let CloudFront
#                         compress per request, as every deploy before 2026-10-09 did. By default
#                         they are stored at Brotli 11 with `Content-Encoding: br`, and a gzip 9
#                         copy goes under _gz/ (scripts/precompress.mjs; internal #514).
#   --dry-run             print what would be uploaded and change nothing.
#
# WHY THIS IS A SCRIPT AND NOT ONE `aws s3 sync`
# There is no build step, so nothing here is content-hashed. The app files must revalidate on
# every load or a deploy is invisible; the textures and libraries must not, or every visit
# re-downloads six megabytes. One sync cannot say both, so there are several, each with its own
# Cache-Control. The data files sit between: they keep their names but change with a PR (a new
# deep-sky row, a fresh exoplanet table), so they get an hour and are invalidated on every push --
# a returning visitor held the old dso.json for a month before that was true (2026-09-09).
#
# `immutable` is deliberately NOT used. It promises a URL's bytes will never change, and
# `2k_earth_daymap.webp` keeps its name when the file behind it changes. A browser that believed
# that promise would hold a stale texture for a month with no way to be told otherwise. Change a
# texture and you must invalidate it by hand -- the script says so at the end.
#
# THE 4K TIER (2026-09-28) lives under textures/4k/ with names of its own, fetched only by laptops and
# desktops after the first frame (registry/textures.yaml). A new file under a new name needs no
# invalidation -- nothing was cached under it -- so adding a tier or a month is a plain deploy.
# Replacing a file under the SAME name is the case above: invalidate /textures/* by hand.

set -euo pipefail

BUCKET=""
REGION="eu-north-1"
DISTRIBUTION=""
PROFILE=""
WHAT="all"
DRY_RUN=0
MINIFY=1
PRECOMPRESS=1

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,30p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --region)       REGION="${2:?--region needs a value}"; shift 2 ;;
    --distribution) DISTRIBUTION="${2:?--distribution needs a value}"; shift 2 ;;
    --profile)      PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --assets-only)  WHAT="assets"; shift ;;
    --app-only)     WHAT="app"; shift ;;
    --no-minify)    MINIFY=0; shift ;;
    --no-precompress) PRECOMPRESS=0; shift ;;
    --dry-run)      DRY_RUN=1; shift ;;
    -h|--help)      usage 0 ;;
    *)              die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$BUCKET" ] || die "--bucket is required (try --help)"
command -v aws >/dev/null || die "the aws CLI is not installed"
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"

SITE="$(cd "$(dirname "$0")/.." && pwd)/site"
[ -d "$SITE" ] || die "no site/ directory next to this script"

SYNC=(aws s3 sync --region "$REGION")
[ "$DRY_RUN" = "1" ] && SYNC+=(--dryrun)

# EVERY directory under site/ must be listed below, or the deploy is silently partial. That is not
# hypothetical: `site/models/` was added for the NASA spacecraft and this script did not know about
# it, so the first deploy after that shipped an app whose models 403'd. The app degraded correctly
# and nobody would have noticed for a while, which is exactly what makes it worth a check.
KNOWN="textures data vendor js css models images t og audio fonts"
MISSING=""
for d in "$SITE"/*/; do
  name=$(basename "$d")
  case " $KNOWN " in *" $name "*) ;; *) MISSING="$MISSING $name" ;; esac
done
if [ -n "$MISSING" ]; then
  echo "error: site/ has directories this script does not deploy:$MISSING" >&2
  echo "       add them to KNOWN and to the sync block below, or the site ships incomplete." >&2
  exit 1
fi

echo "==> $SITE  ->  s3://$BUCKET  ($REGION)"
[ "$DRY_RUN" = "1" ] && echo "    (dry run)"

HERE="$(dirname "$0")"
BUILT="$(mktemp -d)"
trap 'rm -rf "$BUILT"' EXIT

# STORED COMPRESSED (internal #514, 2026-10-09). CloudFront compresses per request at about Brotli 5,
# sent both halves of three.js to a Brotli browser as gzip, and does not compress an octet-stream at
# all (stars.bin and every model went out whole: MEASURED on the live site). So the code, the models and the bundled data are
# compressed here, once, at Brotli 11, and stored with `Content-Encoding: br`: CloudFront sends an
# object that already has an encoding exactly as it is stored. WHICH files is one rule,
# scripts/precompress.mjs `precompressed()`; the filters below follow it and
# tests/test_precompress.mjs holds them to it.
#   - A gzip 9 copy of each goes under _gz/<same path>. It is what a client WITHOUT Brotli is sent
#     once the distribution runs scripts/edge/encoding-fallback.js (the hosting stack attaches it).
#     Until then such a client gets the Brotli bytes; every browser that can run the app (module
#     scripts, WebGL2) accepts Brotli, so that is curl and old robots asking for a script.
#   - HTML, robots.txt, the sitemap, the manifest and sw.js are NOT stored compressed: a crawler or
#     an unfurler reads those, and CloudFront still negotiates them per request.
#   - `Vary: Accept-Encoding` cannot be set on an S3 object; the hosting stack's response headers
#     policy adds it.
#   - A dry run compresses at quality 1: the same files and the same plan in a second, not minutes.
ENC=()
GZ=()
if [ "$PRECOMPRESS" = "1" ]; then
  command -v node >/dev/null || die "node is not installed; scripts/precompress.mjs needs it (--no-precompress uploads uncompressed)"
  ENC=(--content-encoding br)
  GZ=(--content-encoding gzip)
  QUALITY=(); [ "$DRY_RUN" = "1" ] && QUALITY=(--quality 1 --no-cache)
fi
# precompress DIRS... : the Brotli copies into $BUILT/br, the gzip copies into $BUILT/gz.
precompress() {
  local from="$1" dirs="$2"; shift 2
  node "$HERE/precompress.mjs" --from "$from" --dirs "$dirs" --out "$BUILT/br" --gzip "$BUILT/gz" \
    ${QUALITY[@]+"${QUALITY[@]}"} "$@" \
    || die "scripts/precompress.mjs failed; nothing more was uploaded (--no-precompress deploys uncompressed)"
}

# Long-lived, but not immutable -- see the header. A month, and invalidate on the rare change.
LONG="public, max-age=2592000"
# The bundled data: an hour, then a revalidation (a 304 unless a PR changed the file), and the
# invalidation below expires the edge copy the moment it is pushed.
DATA="public, max-age=3600"

if [ "$WHAT" != "app" ]; then
  echo "==> textures, data"
  "${SYNC[@]}" "$SITE/textures" "s3://$BUCKET/textures" --cache-control "$LONG" --delete --exclude "*.webp"
  # WebP by its own type: the CLI guesses a Content-Type from the extension, and a guess that comes
  # back binary/octet-stream is served as a download to anything that asks what the bytes are. The
  # --delete above does not touch these, because excluded files are never deleted by a sync.
  "${SYNC[@]}" "$SITE/textures" "s3://$BUCKET/textures" --cache-control "$LONG" --delete \
    --exclude "*" --include "*.webp" --content-type "image/webp"
  # data/v1/ is the harvester's (spec 0003 amendment 1): it is never in site/, and --delete would
  # otherwise remove every snapshot on each deploy. The filter keeps it out of the upload too.
  if [ "$PRECOMPRESS" = "1" ]; then
    # Two syncs to one prefix, and each one's --delete is scoped by its own filter (a sync never
    # deletes what its filter excludes): the pictures as they are, the catalogues compressed. The
    # `--exclude "v1/*"` is LAST in the second, because a later filter wins and `*.json` would
    # otherwise put the harvester's snapshots back in reach of --delete.
    precompress "$SITE" data
    "${SYNC[@]}" "$SITE/data"     "s3://$BUCKET/data"     --cache-control "$DATA" --delete --exclude "v1/*" \
      --exclude "*.bin" --exclude "*.json" --exclude "*.csv" --exclude "*.txt"
    "${SYNC[@]}" "$BUILT/br/data" "s3://$BUCKET/data"     --cache-control "$DATA" --delete "${ENC[@]}" \
      --exclude "*" --include "*.bin" --include "*.json" --include "*.csv" --include "*.txt" --exclude "v1/*"
    "${SYNC[@]}" "$BUILT/gz/data" "s3://$BUCKET/_gz/data" --cache-control "$DATA" --delete "${GZ[@]}"
  else
  "${SYNC[@]}" "$SITE/data"     "s3://$BUCKET/data"     --cache-control "$DATA" --delete --exclude "v1/*"
  fi
  # vendor/ is NOT here any more: it is uploaded with the app below (internal #415, 2026-10-07).
  # The spacecraft models. Content type matters: CloudFront will not compress an octet-stream, and
  # a .glb served as one is a few hundred KB that could have been fewer.
  # Since 2026-10-09 they are stored at Brotli 11 like the data (MEASURED that day: CloudFront does
  # not in fact compress model/gltf-binary; the 70 models were 8.83 MB on the wire and are 5.32 MB).
  MODELS="$SITE/models"
  if [ "$PRECOMPRESS" = "1" ]; then
    precompress "$SITE" models
    MODELS="$BUILT/br/models"
    "${SYNC[@]}" "$BUILT/gz/models" "s3://$BUCKET/_gz/models" --cache-control "$LONG" \
      --content-type "model/gltf-binary" --delete "${GZ[@]}"
  fi
  "${SYNC[@]}" "$MODELS"   "s3://$BUCKET/models"   --cache-control "$LONG" \
    --content-type "model/gltf-binary" --delete ${ENC[@]+"${ENC[@]}"}
  # The photographs on the cards. Same bargain as the models: somebody else's work, shipped with
  # its credit, so it is deployed as a directory and never silently half-pushed.
  "${SYNC[@]}" "$SITE/images"   "s3://$BUCKET/images"   --cache-control "$LONG" --delete
  # The pictures a chat unfurler shows for a shared trip page (spec 0032, scripts/gen_trip_pages.py):
  # og/default.png today, one per trip when spec 0033 renders them. Long-lived like the images,
  # and for the same reason not invalidated by this script -- see the note at the end.
  "${SYNC[@]}" "$SITE/og"       "s3://$BUCKET/og"       --cache-control "$LONG" --delete
  # The music and sounds (spec 0035, 2026-09-23): fetched only after a visitor turns sound on, and
  # long-lived like the models, because a bed is up to 600 kB that a returning visitor should not
  # download twice. Each type by its own sync: the CLI guesses from the extension, `.opus` is not
  # in every mimetypes table, and a bed served as binary/octet-stream is a bed some proxies will
  # not cache. The --delete on each is scoped by its filter, so the two never delete each other.
  if [ -d "$SITE/audio" ]; then
    "${SYNC[@]}" "$SITE/audio" "s3://$BUCKET/audio" --cache-control "$LONG" --delete \
      --exclude "*" --include "*.opus" --content-type "audio/ogg"
    "${SYNC[@]}" "$SITE/audio" "s3://$BUCKET/audio" --cache-control "$LONG" --delete \
      --exclude "*" --include "*.m4a" --content-type "audio/mp4"
    # The narration's captions (spec 0069): the sentence timings beside each clip. A clip keeps its
    # file name when scripts/narrate.py renders it again, and since internal #327 the app asks for
    # it as `<stop>.opus?v=<hash>` (site/js/data/narration.js `versions`, from the clip's own hash),
    # so a re-rendered clip is a new address and needs no invalidation. CloudFront must forward the
    # query string in the cache key for /audio/* (or ignore it and serve the object: either way the
    # BROWSER's year-long cache is keyed on the full URL, which is the cache this is about).
    "${SYNC[@]}" "$SITE/audio" "s3://$BUCKET/audio" --cache-control "$LONG" --delete \
      --exclude "*" --include "*.vtt" --content-type "text/vtt; charset=utf-8"
  fi
  # The three faces (spec 0045): WOFF2 subsets and the OFL text that has to travel with them.
  # Long-lived like the models; a face changes only when scripts/build-fonts.py is re-run, and its
  # file name does not change then, so invalidate /fonts/* by hand after a rebuild. By type, as the
  # audio: `.woff2` is missing from older mimetypes tables, and a font served as octet-stream is
  # refused by a browser that checks.
  "${SYNC[@]}" "$SITE/fonts" "s3://$BUCKET/fonts" --cache-control "$LONG" --delete \
    --exclude "*" --include "*.woff2" --content-type "font/woff2"
  "${SYNC[@]}" "$SITE/fonts" "s3://$BUCKET/fonts" --cache-control "$LONG" --delete \
    --exclude "*" --include "*.txt" --content-type "text/plain; charset=utf-8"
fi

if [ "$WHAT" != "assets" ]; then
  echo "==> the app"
  # CSS FIRST, AND THE ORDER IS THE POINT. Between the two syncs there is a window in which a
  # visitor can load one half of a release, and the two halves are not equally safe: old JS with
  # new CSS is a stylesheet with a few unused rules in it, while new JS with old CSS is markup
  # nothing styles -- which is exactly what a phone was served once, and the trip rows came back
  # as centred grey bullets with their three lines run together. Uploading js first guaranteed
  # the wrong half of that window. Do not swap these back.
  #
  # WHAT IS UPLOADED IS NOT WHAT IS WRITTEN (internal #405, 2026-10-06). The source is the project's
  # documentation and nearly half of its bytes are comments; a visitor downloads the same
  # statements without them. scripts/minify_site.py writes that copy of js/ and css/ into the temp
  # folder -- nothing renamed, nothing joined, a file it cannot vouch for shipped as written -- and
  # `node --check` reads every module of it before anything is uploaded. The service worker below
  # is stamped with the hashes of THIS copy (stamp_sw.py --overlay), because these are the bytes a
  # browser will be sent. --no-minify uploads the source instead.
  command -v node >/dev/null || die "node is not installed; scripts/build_seo.py and scripts/minify_site.py need it"
  APP="$SITE"
  OVERLAY=()
  if [ "$MINIFY" = "1" ]; then
    python3 "$HERE/minify_site.py" --site "$SITE" --out "$BUILT/min" --node node \
      || die "scripts/minify_site.py produced a file node refuses; nothing was uploaded (--no-minify deploys the source)"
    APP="$BUILT/min"
    OVERLAY=(--overlay "$BUILT/min")
  fi
  # The Brotli copy of whichever tree that was (the note at the top). --strict: js/, css/ and
  # vendor/ are uploaded from the compressed copy only, so a file type the rule does not know stops
  # the deploy instead of going missing. The worker's stamp below still hashes the UNcompressed
  # files (--overlay "$BUILT/min"): a browser decodes before the worker sees the bytes.
  if [ "$PRECOMPRESS" = "1" ]; then
    precompress "$APP" css,js,vendor --strict
    APP="$BUILT/br"
  fi
  "${SYNC[@]}" "$APP/css" "s3://$BUCKET/css" \
    --cache-control "no-cache" --content-type "text/css; charset=utf-8" --delete ${ENC[@]+"${ENC[@]}"}
  # --exclude '*.md': the module contract documents the modules for whoever edits them. It is not code
  # and has no business being served as JavaScript.
  "${SYNC[@]}" "$APP/js"  "s3://$BUCKET/js" \
    --cache-control "no-cache" --content-type "text/javascript; charset=utf-8" \
    --exclude "*.md" --delete ${ENC[@]+"${ENC[@]}"}
  # THE VENDORED LIBRARIES GO UP WITH THE APP, FROM THE SAME COPY (internal #415, 2026-10-07).
  # vendor/astronomy.js is 412 kB as its author ships it and 177 kB without its documentation (the
  # licence header stays: minify_site.py keeps any comment that names a licence or a copyright).
  # The first boot diet left vendor/ in the assets block above, and so could not strip it: the
  # worker's stamp hashes vendor/ on every deploy, and an --app-only deploy would have stamped
  # stripped files the bucket did not hold -- a worker that refuses to install. So the rule is now
  # the one js/ follows: what is stamped is $APP, and $APP is what is uploaded, in the same block.
  # Still a month's cache (the names carry the library's release, the bytes change only when a
  # library is replaced), and /vendor/* is invalidated below with the app so the edge never holds
  # a copy the stamp does not describe; the worker fetches with `cache: 'no-cache'` at install, so
  # a browser's month-old copy is revalidated, not trusted.
  # The Basis transcoder's WebAssembly (vendor/basis/, spec 0056 task 1) is not JavaScript: it is
  # left out of this sync, so that --delete here does not remove it, and sent on its own below.
  "${SYNC[@]}" "$APP/vendor" "s3://$BUCKET/vendor" \
    --exclude "*.wasm" --exclude "*.md" \
    --cache-control "$LONG" --content-type "text/javascript; charset=utf-8" --delete ${ENC[@]+"${ENC[@]}"}
  "${SYNC[@]}" "$APP/vendor" "s3://$BUCKET/vendor" \
    --exclude "*" --include "*.wasm" \
    --cache-control "$LONG" --content-type "application/wasm" ${ENC[@]+"${ENC[@]}"}
  # The gzip copies, for a client without Brotli (the note at the top). Same types, same lifetimes.
  if [ "$PRECOMPRESS" = "1" ]; then
    "${SYNC[@]}" "$BUILT/gz/css" "s3://$BUCKET/_gz/css" \
      --cache-control "no-cache" --content-type "text/css; charset=utf-8" --delete "${GZ[@]}"
    "${SYNC[@]}" "$BUILT/gz/js"  "s3://$BUCKET/_gz/js" \
      --cache-control "no-cache" --content-type "text/javascript; charset=utf-8" --delete "${GZ[@]}"
    "${SYNC[@]}" "$BUILT/gz/vendor" "s3://$BUCKET/_gz/vendor" --exclude "*.wasm" \
      --cache-control "$LONG" --content-type "text/javascript; charset=utf-8" --delete "${GZ[@]}"
    "${SYNC[@]}" "$BUILT/gz/vendor" "s3://$BUCKET/_gz/vendor" --exclude "*" --include "*.wasm" \
      --cache-control "$LONG" --content-type "application/wasm" "${GZ[@]}"
  fi
  # One static page per trip (spec 0032): the share URL a crawler reads, which sends a browser on
  # to `/#trip=<id>`. HTML, no-cache, like index.html: a page that says the wrong thing about a
  # trip for a cache lifetime is a share that lies. --delete, because a trip that left the
  # registry must not keep a page that opens the app on nothing.
  "${SYNC[@]}" "$SITE/t"   "s3://$BUCKET/t" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8" --delete
  # The pages a search engine reads that are not kept in git (spec 0061 task 9): one per notable
  # object, the sitemap and the 404 page, built here from the records and the card's own words
  # (scripts/build_seo.py; it needs Node, as the card's words are JavaScript). o/ is synced like
  # t/: HTML, no-cache, and --delete, so an object that left the registry loses its page.
  # The press page is built FIRST: the sitemap names it only when it is in the tree (internal #398).
  python3 "$HERE/build_press.py" --out "$BUILT" || die "scripts/build_press.py failed"
  python3 "$HERE/build_seo.py" --out "$BUILT" || die "scripts/build_seo.py failed"
  python3 "$HERE/check_seo.py" --out "$BUILT" || die "scripts/check_seo.py refused the built pages"
  "${SYNC[@]}" "$BUILT/o"  "s3://$BUCKET/o" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8" --delete
  # The press page (public #293, scripts/build_press.py): the page, the README's screenshots and
  # the mark as SVG, built beside the object pages and not kept under site/. HTML no-cache like
  # the other pages; the pictures and the SVGs each by their own type, as the textures are.
  "${SYNC[@]}" "$BUILT/press" "s3://$BUCKET/press" --cache-control "no-cache" \
    --exclude "*" --include "*.html" --content-type "text/html; charset=utf-8" --delete
  "${SYNC[@]}" "$BUILT/press" "s3://$BUCKET/press" --cache-control "no-cache" \
    --exclude "*" --include "*.webp" --content-type "image/webp" --delete
  "${SYNC[@]}" "$BUILT/press" "s3://$BUCKET/press" --cache-control "no-cache" \
    --exclude "*" --include "*.svg" --content-type "image/svg+xml" --delete
  # The root files, each with its own type: the CLI guesses from the extension, and a sitemap
  # served as binary/octet-stream is one a crawler may refuse. No-cache like index.html, so a new
  # page is in the sitemap the moment it is deployed. 404.html is what CloudFront answers for a
  # missing path once its error response names it (Ivan's setting, in the SEO pull request).
  # object-pages.json is the share sheet's map from a record to its page (ui/sharesheet.js).
  # THE SERVICE WORKER, LAST, AND THE ORDER IS THE POINT (site/sw.js, scripts/stamp_sw.py). The
  # copy uploaded is stamped with this build: the SHA-256 of every file of the app as it is in
  # site/ right now. A browser that reads the new sw.js downloads exactly those files and refuses
  # the install if one does not match, so sw.js goes up after everything it names. No-cache, like
  # index.html: a worker a browser cannot re-read is a release nobody can be moved off. The
  # manifest is no-cache too (a name or an icon list that changed must not wait a month).
  python3 "$HERE/stamp_sw.py" --site "$SITE" ${OVERLAY[@]+"${OVERLAY[@]}"} --out "$BUILT/sw.js" || die "scripts/stamp_sw.py failed"
  for f in "$SITE/index.html:text/html; charset=utf-8" "$BUILT/404.html:text/html; charset=utf-8" \
           "$SITE/robots.txt:text/plain; charset=utf-8" "$BUILT/sitemap.xml:application/xml; charset=utf-8" \
           "$BUILT/object-pages.json:application/json; charset=utf-8" \
           "$SITE/manifest.webmanifest:application/manifest+json; charset=utf-8" \
           "$BUILT/sw.js:text/javascript; charset=utf-8"; do
    path="${f%%:*}"; type="${f#*:}"; name="$(basename "$path")"
    [ -f "$path" ] || die "$name is missing"
    if [ "$DRY_RUN" = "1" ]; then
      echo "  would upload $name ($type)"
    else
      aws s3 cp "$path" "s3://$BUCKET/$name" --region "$REGION" \
        --cache-control "no-cache" --content-type "$type"
    fi
  done
fi

if [ -n "$DISTRIBUTION" ] && [ "$DRY_RUN" != "1" ]; then
  PATHS=("/" "/index.html" "/js/*" "/css/*" "/vendor/*" "/t/*" "/o/*" "/press/*" "/robots.txt" "/sitemap.xml" "/404.html" "/object-pages.json" "/manifest.webmanifest" "/sw.js")
  # The gzip copies keep their names too.
  [ "$PRECOMPRESS" = "1" ] && PATHS+=("/_gz/*")
  if [ "$WHAT" != "app" ]; then
    # The data files were just pushed and keep their names: expire the edge copies now.
    PATHS+=("/data/*")
    echo "==> invalidating the app and the data (textures and models keep their cache)"
  else
    echo "==> invalidating the app (assets keep their cache)"
  fi
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
    --paths "${PATHS[@]}" \
    --output text --query 'Invalidation.Id'
  if [ "$WHAT" != "app" ]; then
    echo "    NOTE: textures, models, images, og and audio were uploaded but NOT invalidated --"
    echo "    their names are not content-hashed, so nothing expires them early. If you changed one, run:"
    echo "      aws cloudfront create-invalidation --distribution-id $DISTRIBUTION \\"
    echo "        --paths '/textures/*' '/models/*' '/images/*' '/og/*' '/audio/*'"
  fi
fi

echo "==> done"
if [ -n "$DISTRIBUTION" ]; then
  DOMAIN=$(aws cloudfront get-distribution --id "$DISTRIBUTION" \
    --query 'Distribution.DomainName' --output text 2>/dev/null || true)
  [ -n "$DOMAIN" ] && echo "    https://$DOMAIN"
else
  echo "    No --distribution given, so nothing was invalidated."
  echo "    The bucket is private by design: it is readable only through CloudFront."
fi
