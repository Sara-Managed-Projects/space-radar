#!/usr/bin/env bash
# Run the harvester by hand from THIS machine and publish its output as the site's saved copy, /data/v1/.
#
#   scripts/refresh-snapshots.sh                 # harvest what is due, publish, invalidate
#   scripts/refresh-snapshots.sh --dry-run       # say what is due; fetch and publish nothing
#   scripts/refresh-snapshots.sh --work=DIR      # where the working copy lives (default ~/.cache/spaceradar-v1)
#   scripts/refresh-snapshots.sh --from-run=ID   # also merge what a GitHub `harvest` workflow run read
#   scripts/refresh-snapshots.sh --no-harvest    # publish the working copy (and --from-run) only
#   scripts/refresh-snapshots.sh --profile=NAME  # the AWS CLI profile to publish with (also --profile NAME).
#                                                # Default: your environment's.
#   scripts/refresh-snapshots.sh --bucket=B --region=R --distribution=ID
#                                                # another site. The defaults are the site's home since
#                                                # 2026-10-07: bucket sara-site-space-radar-lifehub (eu-north-1),
#                                                # distribution E1CGDK1ZPYFKHG, which the profile `life-hub` can write.
#
# THIS IS NOT HOW THE SAVED COPY IS KEPT ANY MORE. Since 2026-10-26 (internal spec 0078, stage r14-data) the copy is
# filled every hour by a Lambda (the internal repo's infra/harvester/harvester-stack.yaml, hourly). This script is the
# same harvester run by hand: for a source the Lambda is refused by (CelesTrak answers some clouds with 403), for a
# rehearsal, or when the Lambda is down. It is deliberately thin. EVERYTHING that makes the published files lives in
# harvest/ and is the same code the Lambda runs:
#   * what is fetched, counted and guarded .......... harvest/run.py
#   * keep the last good copy of a failed source,
#     the jpl-sbdb-neo cut, celestrak-notable / -geo /
#     -starlink-recent, the <id>.cols.json twins ..... harvest/publish.py (called by `python3 -m harvest`)
#   * a source the registry switches off ............. harvest/publish.py (it is never published)
# What is left here is the laptop's: seed the working copy from the bucket (so the never-worse guard and the
# keep-last-good rule see what is live), harvest with Mozilla's CA roots, upload, manifest LAST, invalidate.
#
# WHY THE CA ROOTS. macOS's command-line Python ships LibreSSL with a bundle that lacks the root JPL's certificates
# chain to, and ignores SSL_CERT_FILE (measured 2026-09-22); Node has Mozilla's list.
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET="sara-site-space-radar-lifehub"
REGION="eu-north-1"
DISTRIBUTION="E1CGDK1ZPYFKHG"
PROFILE=""
WORK="${HOME}/.cache/spaceradar-v1"
DRY=0
FROM_RUN=""
HARVEST=1
PREV=""
for a in "$@"; do
  # `--profile NAME`, as scripts/deploy.sh takes it, besides `--profile=NAME`.
  if [ "$PREV" = "--profile" ]; then PROFILE="$a"; PREV=""; continue; fi
  case "$a" in
    --profile) PREV="--profile" ;;
    --profile=*) PROFILE="${a#--profile=}" ;;
    --work=*) WORK="${a#--work=}" ;;
    --bucket=*) BUCKET="${a#--bucket=}" ;;
    --region=*) REGION="${a#--region=}" ;;
    --distribution=*) DISTRIBUTION="${a#--distribution=}" ;;
    --dry-run) DRY=1 ;;
    --from-run=*) FROM_RUN="${a#--from-run=}" ;;
    --no-harvest) HARVEST=0 ;;
    -h|--help) sed -n '2,12p' "$0"; exit 0 ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done
[ "$PREV" = "--profile" ] && { echo "--profile needs a value" >&2; exit 2; }
# Exported, so every `aws` below (the seed, the uploads, the invalidation) uses it.
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"
[ "$DRY" = 1 ] && echo "==> would publish to s3://$BUCKET/data/v1/ ($REGION), distribution $DISTRIBUTION, profile ${AWS_PROFILE:-<environment>}"

mkdir -p "$WORK"
# The working copy is the bucket's: seed it so what a source that fails now keeps is what is LIVE. When
# harvesting, always (the Lambda has written since the last run here); when only publishing, the first time.
if [ "$HARVEST" = 1 ] || [ ! -f "$WORK/index.json" ]; then
  echo "==> seeding $WORK from s3://$BUCKET/data/v1/"
  aws s3 sync "s3://$BUCKET/data/v1/" "$WORK" --region "$REGION" --only-show-errors
fi

ROOTS=""
if command -v node >/dev/null 2>&1; then
  ROOTS="$WORK/.mozilla-roots.pem"
  node -p "require('tls').rootCertificates.join('\n')" > "$ROOTS"
fi

if [ "$HARVEST" = 1 ]; then
  echo "==> harvesting into $WORK"
  HARVEST_ARGS=(--dest "$WORK")
  [ "$DRY" = 1 ] && HARVEST_ARGS+=(--dry-run)
  python3 - "$ROOTS" "${HARVEST_ARGS[@]}" <<'PY'
import runpy, ssl, sys
roots = sys.argv[1]
if roots:
    ssl._create_default_https_context = lambda: ssl.create_default_context(cafile=roots)
sys.argv = ["harvest"] + sys.argv[2:]
runpy.run_module("harvest", run_name="__main__")
PY
fi
[ "$DRY" = 1 ] && { echo "dry run: nothing published"; exit 0; }

# What a GitHub runner read (.github/workflows/harvest.yml), for sources this machine cannot reach.
# A row it read successfully replaces this machine's row, and only if it is newer.
if [ -n "$FROM_RUN" ]; then
  RUN_DIR="$(mktemp -d)"
  echo "==> merging workflow run $FROM_RUN"
  gh run download "$FROM_RUN" -n snapshots -D "$RUN_DIR"
  python3 - "$RUN_DIR" "$WORK" <<'PY'
import json, os, shutil, sys
src, dst = sys.argv[1], sys.argv[2]
a = json.load(open(os.path.join(src, "index.json")))
b = json.load(open(os.path.join(dst, "index.json")))
for k, row in a["snapshots"].items():
    if row.get("status") not in ("ok", "not-modified") or not row.get("fetched_at"):
        continue
    mine = b["snapshots"].get(k, {})
    if mine.get("fetched_at") and mine["fetched_at"] >= row["fetched_at"]:
        continue
    f = os.path.join(src, k + ".json")
    if not os.path.exists(f):
        continue
    shutil.copy(f, os.path.join(dst, k + ".json"))
    b["snapshots"][k] = row
    print(f"    {k}: {row['items']} items, read {row['fetched_at']} on GitHub")
json.dump(b, open(os.path.join(dst, "index.json"), "w"), indent=1)
PY
  rm -rf "$RUN_DIR"
fi

# NOT OURS TO COPY (internal #370). A source the registry switches off is never published, whatever an earlier run
# left in the working copy (the sync below uploads every file it finds); the manifest row is `skipped`, which
# harvest/publish.py makes. The Lambda cannot delete (its role has no s3:DeleteObject), the laptop can.
python3 - "$WORK" <<'PY'
import json, os, sys
work = sys.argv[1]
for r in json.load(open("harvest/sources.json"))["sources"]:
    if r.get("enabled") is not False:
        continue
    gone = False
    for name in (r["id"] + ".json", r["id"] + ".cols.json"):
        p = os.path.join(work, name)
        if os.path.exists(p):
            os.remove(p)
            gone = True
    if gone:
        print(f"    {r['id']}: switched off in registry/sources.yaml; not published")
PY

# The publish rules for files that did not come from a harvest run in this process (a merged runner's, or
# --no-harvest): keep the last good copy, the cut, the derived files, the twins. After a harvest they were just
# applied and nothing has changed, so this reads no big file.
echo "==> applying the publish rules"
python3 -m harvest --dest "$WORK" --finish-only

# Upload: the files, then the manifest LAST (it must never name a file that is not there yet). The headers are
# the Lambda's (harvest/snapshot.py): a file may be kept five minutes at the edge, the manifest one.
echo "==> uploading to s3://$BUCKET/data/v1/"
aws s3 sync "$WORK" "s3://$BUCKET/data/v1/" --region "$REGION" --exclude "index.json" --exclude ".*" --exclude "*.tmp" \
  --content-type "application/json" --cache-control "public, max-age=300, s-maxage=300" --only-show-errors
aws s3 cp "$WORK/index.json" "s3://$BUCKET/data/v1/index.json" --region "$REGION" \
  --content-type "application/json" --cache-control "public, max-age=60, s-maxage=300, stale-while-revalidate=600" --only-show-errors
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/data/v1/*' \
  --query 'Invalidation.Id' --output text >/dev/null
echo "==> done: https://www.spaceradar.ai/data/v1/index.json"
