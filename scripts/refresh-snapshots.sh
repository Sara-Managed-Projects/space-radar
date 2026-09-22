#!/usr/bin/env bash
# Harvest every source from THIS machine and publish it as the site's saved copy, /data/v1/.
#
#   scripts/refresh-snapshots.sh                 # harvest what is due, publish, invalidate
#   scripts/refresh-snapshots.sh --dry-run       # say what is due; fetch and publish nothing
#   scripts/refresh-snapshots.sh --work=DIR      # where the full working copy lives
#                                                # (default ~/.cache/spaceradar-v1)
#   scripts/refresh-snapshots.sh --from-run=ID   # also merge what a GitHub `harvest` workflow run read
#   scripts/refresh-snapshots.sh --no-harvest    # publish the working copy (and --from-run) only
#
# WHY. The harvester (harvest/, public #26) is built to run as a Lambda every few minutes and has
# never been provisioned, so /data/v1/ was empty and every visitor fetched every source live --
# and a visitor whose IP a publisher refuses (CelesTrak, per IP; Launch Library, 15 an hour) saw an
# empty map. This runs the same harvester by hand and puts its output where the site already looks.
# The site draws a saved copy at once and, once it is past its own valid_until, asks the publisher
# behind it and swaps in anything newer (site/js/data/sources.js), so a copy that is a day old is a
# fallback, never a freeze.
#
# WHAT IT DOES, in order:
#   1. Seeds the working copy from the bucket the first time, so the harvester's never-worse guard
#      has the last good copy of every source: a source that fails now keeps it.
#   2. Runs `python3 -m harvest --dest WORK` with Mozilla's CA roots (from Node, if installed):
#      macOS's command-line Python ships LibreSSL with a bundle that lacks the root JPL's
#      certificates chain to, and ignores SSL_CERT_FILE (measured 2026-09-22).
#   3. Publishes a COPY, with jpl-sbdb-neo cut to the rows whose designation is in jpl-cad: the app
#      joins no other row (parseNeoApproaches), and the full table is 5.1 MB of 42 507 asteroids
#      that every first visit would otherwise download. The working copy keeps the full table, so
#      the cut is redone against each new close-approach list. The published file says it was cut.
#   4. Uploads (JSON, short cache), index.json last, and invalidates /data/v1/*.
set -euo pipefail
cd "$(dirname "$0")/.."

BUCKET="sara-site-space-radar"
REGION="eu-north-1"
DISTRIBUTION="E1JGFDLBX6HS7B"
WORK="${HOME}/.cache/spaceradar-v1"
DRY=0
FROM_RUN=""
HARVEST=1
for a in "$@"; do
  case "$a" in
    --work=*) WORK="${a#--work=}" ;;
    --bucket=*) BUCKET="${a#--bucket=}" ;;
    --region=*) REGION="${a#--region=}" ;;
    --distribution=*) DISTRIBUTION="${a#--distribution=}" ;;
    --dry-run) DRY=1 ;;
    --from-run=*) FROM_RUN="${a#--from-run=}" ;;
    --no-harvest) HARVEST=0 ;;
    -h|--help) sed -n '2,30p' "$0"; exit 0 ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done

mkdir -p "$WORK"
if [ ! -f "$WORK/index.json" ]; then
  echo "==> seeding $WORK from s3://$BUCKET/data/v1/"
  aws s3 sync "s3://$BUCKET/data/v1/" "$WORK" --region "$REGION" --only-show-errors
fi
# A table that was cut on publish must be fetched whole again: mark it due.
python3 - "$WORK" <<'PY'
import json, sys, os
work = sys.argv[1]
path = os.path.join(work, "jpl-sbdb-neo.json")
ix_path = os.path.join(work, "index.json")
if os.path.exists(path) and os.path.exists(ix_path):
    if "note" in json.load(open(path)):
        ix = json.load(open(ix_path))
        row = ix.get("snapshots", {}).get("jpl-sbdb-neo")
        if row:
            row["valid_until"] = "1970-01-01T00:00:00Z"
            json.dump(ix, open(ix_path, "w"), indent=1)
            print("    the working copy's jpl-sbdb-neo was a cut copy: marked due")
PY

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

PUBLISH="$(mktemp -d)"
trap 'rm -rf "$PUBLISH"' EXIT
cp "$WORK"/*.json "$PUBLISH"/
python3 - "$PUBLISH" <<'PY'
import json, os, re, sys
d = sys.argv[1]
def keys(fn):
    # site/js/data/parsers.js sbdbKeys(), exactly: the number, the designation in brackets, or the name
    fn = str(fn or "").strip(); out = []
    m = re.match(r"^(\d+)\s", fn)
    if m: out.append(m.group(1))
    p, q = fn.rfind("("), fn.rfind(")")
    if p >= 0 and q > p: out.append(fn[p + 1:q].strip())
    return out or [fn]
def body(f):
    b = f["body"]; return (json.loads(b), True) if isinstance(b, str) else (b, False)
cad_p, neo_p = os.path.join(d, "jpl-cad.json"), os.path.join(d, "jpl-sbdb-neo.json")
if os.path.exists(cad_p) and os.path.exists(neo_p):
    cb, _ = body(json.load(open(cad_p)))
    want = {str(r[cb["fields"].index("des")]).strip() for r in cb.get("data") or []}
    f = json.load(open(neo_p)); nb, was_str = body(f)
    i = nb["fields"].index("full_name")
    before = len(nb.get("data") or [])
    nb["data"] = [r for r in nb.get("data") or [] if set(keys(r[i])) & want]
    if "count" in nb: nb["count"] = len(nb["data"])
    f["body"] = json.dumps(nb) if was_str else nb
    f["items"] = len(nb["data"])
    f["note"] = (f"trimmed from {before} rows to the {len(nb['data'])} whose designation is in "
                 f"jpl-cad.json of the same publish; the app joins no other row (parseNeoApproaches)")
    json.dump(f, open(neo_p, "w"))
    ix_p = os.path.join(d, "index.json"); ix = json.load(open(ix_p))
    if "jpl-sbdb-neo" in ix.get("snapshots", {}):
        ix["snapshots"]["jpl-sbdb-neo"]["items"] = len(nb["data"])
        ix["snapshots"]["jpl-sbdb-neo"]["bytes"] = os.path.getsize(neo_p)
        json.dump(ix, open(ix_p, "w"), indent=1)
    print(f"    jpl-sbdb-neo: {before} rows -> {len(nb['data'])} published ({len(want)} close approaches)")
ix = json.load(open(os.path.join(d, "index.json")))
ok = sorted(k for k, v in ix["snapshots"].items() if v.get("status") in ("ok", "not-modified", "not-due") and v.get("fetched_at"))
print(f"    publishing {len(ok)} of {len(ix['snapshots'])} sources with data: {', '.join(ok)}")
PY

echo "==> uploading to s3://$BUCKET/data/v1/"
aws s3 sync "$PUBLISH" "s3://$BUCKET/data/v1/" --region "$REGION" --exclude "index.json" --exclude ".*" \
  --content-type "application/json" --cache-control "max-age=300" --only-show-errors
# The manifest last: it must never name a file that is not there yet.
aws s3 cp "$PUBLISH/index.json" "s3://$BUCKET/data/v1/index.json" --region "$REGION" \
  --content-type "application/json" --cache-control "max-age=60" --only-show-errors
aws cloudfront create-invalidation --distribution-id "$DISTRIBUTION" --paths '/data/v1/*' \
  --query 'Invalidation.Id' --output text >/dev/null
echo "==> done: https://www.spaceradar.ai/data/v1/index.json"
