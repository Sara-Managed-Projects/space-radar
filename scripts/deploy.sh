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
#   --assets-only         skip the app files; push textures, data and vendor only.
#   --app-only            skip the big assets; push HTML, CSS and JS only. The usual case.
#   --dry-run             print what would be uploaded and change nothing.
#
# WHY THIS IS A SCRIPT AND NOT ONE `aws s3 sync`
# There is no build step, so nothing here is content-hashed. The app files must revalidate on
# every load or a deploy is invisible; the textures and libraries must not, or every visit
# re-downloads six megabytes. One sync cannot say both, so there are several, each with its own
# Cache-Control.
#
# `immutable` is deliberately NOT used. It promises a URL's bytes will never change, and
# `2k_earth_daymap.jpg` keeps its name when the file behind it changes. A browser that believed
# that promise would hold a stale texture for a month with no way to be told otherwise. Change a
# texture and you must invalidate it by hand -- the script says so at the end.

set -euo pipefail

BUCKET=""
REGION="eu-north-1"
DISTRIBUTION=""
PROFILE=""
WHAT="all"
DRY_RUN=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,27p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --region)       REGION="${2:?--region needs a value}"; shift 2 ;;
    --distribution) DISTRIBUTION="${2:?--distribution needs a value}"; shift 2 ;;
    --profile)      PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --assets-only)  WHAT="assets"; shift ;;
    --app-only)     WHAT="app"; shift ;;
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

echo "==> $SITE  ->  s3://$BUCKET  ($REGION)"
[ "$DRY_RUN" = "1" ] && echo "    (dry run)"

# Long-lived, but not immutable -- see the header. A month, and invalidate on the rare change.
LONG="public, max-age=2592000"

if [ "$WHAT" != "app" ]; then
  echo "==> textures, data, vendored libraries"
  "${SYNC[@]}" "$SITE/textures" "s3://$BUCKET/textures" --cache-control "$LONG" --delete
  "${SYNC[@]}" "$SITE/data"     "s3://$BUCKET/data"     --cache-control "$LONG" --delete
  "${SYNC[@]}" "$SITE/vendor"   "s3://$BUCKET/vendor"   --cache-control "$LONG" --delete
fi

if [ "$WHAT" != "assets" ]; then
  echo "==> the app"
  # --exclude '*.md': the module contract documents the modules for whoever edits them. It is not code
  # and has no business being served as JavaScript.
  "${SYNC[@]}" "$SITE/js"  "s3://$BUCKET/js" \
    --cache-control "no-cache" --content-type "text/javascript; charset=utf-8" \
    --exclude "*.md" --delete
  "${SYNC[@]}" "$SITE/css" "s3://$BUCKET/css" \
    --cache-control "no-cache" --content-type "text/css; charset=utf-8" --delete
  if [ "$DRY_RUN" = "1" ]; then
    echo "  would upload index.html"
  else
    aws s3 cp "$SITE/index.html" "s3://$BUCKET/index.html" --region "$REGION" \
      --cache-control "no-cache" --content-type "text/html; charset=utf-8"
  fi
fi

if [ -n "$DISTRIBUTION" ] && [ "$DRY_RUN" != "1" ]; then
  echo "==> invalidating the app (assets keep their cache)"
  aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" \
    --paths "/" "/index.html" "/js/*" "/css/*" \
    --output text --query 'Invalidation.Id'
  if [ "$WHAT" != "app" ]; then
    echo "    NOTE: textures, data and vendor were uploaded but NOT invalidated -- their names are"
    echo "    not content-hashed, so nothing expires them early. If you changed one, run:"
    echo "      aws cloudfront create-invalidation --distribution-id $DISTRIBUTION \\"
    echo "        --paths '/textures/*' '/data/*' '/vendor/*'"
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
