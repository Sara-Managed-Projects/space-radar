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
#                         object-pages.json, and what scripts/seo_pages.py adds: starlink/, satellites/,
#                         iss/, planets-tonight/, events/, about/, sources/, accuracy/, teachers/, share/,
#                         sitemap-images.xml)
#                         only. The usual case.
#   --no-minify           upload js/ and css/ as they are written. By default a deploy uploads a
#                         copy without comments and indentation (scripts/minify_site.py); this is
#                         the way back if that copy is ever in doubt.
#   --dry-run             print what would be uploaded and change nothing.
#
# Environment:
#   INDEXNOW=1            after the app is uploaded, tell the IndexNow engines (Bing, Yandex and
#                         others) which pages changed: scripts/indexnow.py. Off unless set; a failure
#                         is a warning and never fails the deploy. The key file is always uploaded.
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

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,36p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --region)       REGION="${2:?--region needs a value}"; shift 2 ;;
    --distribution) DISTRIBUTION="${2:?--distribution needs a value}"; shift 2 ;;
    --profile)      PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --assets-only)  WHAT="assets"; shift ;;
    --app-only)     WHAT="app"; shift ;;
    --no-minify)    MINIFY=0; shift ;;
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
  "${SYNC[@]}" "$SITE/data"     "s3://$BUCKET/data"     --cache-control "$DATA" --delete --exclude "v1/*"
  # vendor/ is NOT here any more: it is uploaded with the app below (internal #415, 2026-10-07).
  # The spacecraft models. Content type matters: CloudFront will not compress an octet-stream, and
  # a .glb served as one is a few hundred KB that could have been fewer.
  "${SYNC[@]}" "$SITE/models"   "s3://$BUCKET/models"   --cache-control "$LONG" \
    --content-type "model/gltf-binary" --delete
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
  BUILT="$(mktemp -d)"
  trap 'rm -rf "$BUILT"' EXIT
  APP="$SITE"
  OVERLAY=()
  if [ "$MINIFY" = "1" ]; then
    python3 "$(dirname "$0")/minify_site.py" --site "$SITE" --out "$BUILT/min" --node node \
      || die "scripts/minify_site.py produced a file node refuses; nothing was uploaded (--no-minify deploys the source)"
    APP="$BUILT/min"
    OVERLAY=(--overlay "$BUILT/min")
  fi
  # INDEXNOW (opt-in, growth task): the sitemap that is live NOW, read before anything is uploaded, is
  # what the new one is compared with after the upload. Only when INDEXNOW=1; a failure here is a
  # warning and never stops the deploy (scripts/indexnow.py says why).
  if [ "${INDEXNOW:-}" = "1" ] && [ "$DRY_RUN" != "1" ]; then
    python3 "$(dirname "$0")/indexnow.py" fetch "$(python3 "$(dirname "$0")/indexnow.py" host)/sitemap.xml" "$BUILT/live-sitemap.xml" \
      || echo "warning: could not read the live sitemap; IndexNow will send nothing" >&2
  fi
  "${SYNC[@]}" "$APP/css" "s3://$BUCKET/css" \
    --cache-control "no-cache" --content-type "text/css; charset=utf-8" --delete
  # --exclude '*.md': the module contract documents the modules for whoever edits them. It is not code
  # and has no business being served as JavaScript.
  "${SYNC[@]}" "$APP/js"  "s3://$BUCKET/js" \
    --cache-control "no-cache" --content-type "text/javascript; charset=utf-8" \
    --exclude "*.md" --delete
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
    --cache-control "$LONG" --content-type "text/javascript; charset=utf-8" --delete
  "${SYNC[@]}" "$APP/vendor" "s3://$BUCKET/vendor" \
    --exclude "*" --include "*.wasm" \
    --cache-control "$LONG" --content-type "application/wasm"
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
  python3 "$(dirname "$0")/build_press.py" --out "$BUILT" || die "scripts/build_press.py failed"
  # GROWTH PAGES (scripts/seo_pages.py, scripts/seo_share.py). The saved copy's index gives the pages' dated
  # counts and sources' last-read days; it is fetched from the live site, best effort and never fatal (the
  # pages fall back to registry/seo-facts.yaml, with its own date). The share pictures need Pillow,
  # fontTools and brotli here; without them the pages keep their old pictures and the build says so.
  SNAP=()
  if [ "$DRY_RUN" != "1" ] && command -v curl >/dev/null; then
    if curl -fsS --max-time 15 "${SNAPSHOT_INDEX_URL:-https://www.spaceradar.ai/data/v1/index.json}" -o "$BUILT/snapshot-index.json" 2>/dev/null; then
      SNAP=(--snapshot-index "$BUILT/snapshot-index.json")
    else
      echo "    (the saved copy's index could not be read: the pages use registry/seo-facts.yaml's counts and say its date)"
    fi
  fi
  python3 "$(dirname "$0")/build_seo.py" --out "$BUILT" ${SNAP[@]+"${SNAP[@]}"} || die "scripts/build_seo.py failed"
  python3 "$(dirname "$0")/check_seo.py" --out "$BUILT" || die "scripts/check_seo.py refused the built pages"
  # The embed gallery (scripts/seo_embed.py, run by build_seo.py): HTML, no-cache, like the press page.
  "${SYNC[@]}" "$BUILT/embed" "s3://$BUCKET/embed" --cache-control "no-cache" \
    --exclude "*" --include "*.html" --content-type "text/html; charset=utf-8" --delete
  "${SYNC[@]}" "$BUILT/embed" "s3://$BUCKET/embed" --cache-control "no-cache" \
    --exclude "*" --include "*.js" --content-type "text/javascript; charset=utf-8" --delete
  "${SYNC[@]}" "$BUILT/o"  "s3://$BUCKET/o" \
    --cache-control "no-cache" --content-type "text/html; charset=utf-8" --delete
  # The pages scripts/seo_pages.py builds, one directory each (starlink/, satellites/, iss/, events/, about/, ...;
  # the list is $BUILT/pages-dirs.txt, so a new page is built and shipped by the same change), and share/, one
  # picture per page (scripts/seo_share.py): PNG, long-lived is wrong for a page that can change, so no-cache like
  # the HTML. HTML at /<dir>/index.html because the origin serves no index documents (scripts/build_seo.py).
  while IFS= read -r dir; do
    [ -n "$dir" ] || continue
    if [ "$dir" = "share" ]; then
      "${SYNC[@]}" "$BUILT/share" "s3://$BUCKET/share" --cache-control "no-cache" \
        --exclude "*" --include "*.png" --content-type "image/png" --delete
    else
      "${SYNC[@]}" "$BUILT/$dir" "s3://$BUCKET/$dir" --cache-control "no-cache" \
        --content-type "text/html; charset=utf-8" --delete
    fi
  done < "$BUILT/pages-dirs.txt"
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
  python3 "$(dirname "$0")/stamp_sw.py" --site "$SITE" ${OVERLAY[@]+"${OVERLAY[@]}"} --out "$BUILT/sw.js" || die "scripts/stamp_sw.py failed"
  # The IndexNow key file (scripts/indexnow.py): <key>.txt at the root holding the key. The key is
  # public by design and the file is always uploaded; it is how Bing and the others check that we own
  # the site. Asking them to look at changed pages is a separate, opt-in step below.
  KEYFILE="$(python3 "$(dirname "$0")/indexnow.py" key).txt"
  for f in "$SITE/index.html:text/html; charset=utf-8" "$BUILT/404.html:text/html; charset=utf-8" \
           "$SITE/robots.txt:text/plain; charset=utf-8" "$BUILT/sitemap.xml:application/xml; charset=utf-8" \
           "$BUILT/sitemap-images.xml:application/xml; charset=utf-8" \
           "$BUILT/object-pages.json:application/json; charset=utf-8" \
           "$BUILT/$KEYFILE:text/plain; charset=utf-8" \
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

# INDEXNOW=1 ./scripts/deploy.sh ...  asks Bing, Yandex and the other IndexNow engines to look at the pages
# whose lastmod changed (or that are new) since the sitemap that was live before this deploy. Off by
# default. It runs last, after everything is uploaded, and whatever happens it never fails the deploy.
if [ "$WHAT" != "assets" ] && [ "${INDEXNOW:-}" = "1" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "  would ping IndexNow for the pages that changed (INDEXNOW=1)"
  else
    echo "==> IndexNow: the pages that changed"
    python3 "$(dirname "$0")/indexnow.py" ping "$BUILT/live-sitemap.xml" "$BUILT/sitemap.xml" \
      || echo "warning: the IndexNow ping failed; the deploy is not affected" >&2
  fi
fi

if [ -n "$DISTRIBUTION" ] && [ "$DRY_RUN" != "1" ]; then
  PATHS=("/" "/index.html" "/js/*" "/css/*" "/vendor/*" "/t/*" "/o/*" "/press/*" "/robots.txt" "/sitemap.xml" "/404.html" "/object-pages.json" "/manifest.webmanifest" "/sw.js")
  # The pages seo_pages.py built, each by its directory, and the pictures and the image sitemap with them.
  if [ -f "${BUILT:-/nonexistent}/pages-dirs.txt" ]; then
    while IFS= read -r dir; do [ -n "$dir" ] && PATHS+=("/$dir/*"); done < "$BUILT/pages-dirs.txt"
    PATHS+=("/sitemap-images.xml")
  fi
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
