#!/usr/bin/env bash
# Harvest every source from THIS machine and publish it as the site's saved copy, /data/v1/.
#
#   scripts/refresh-snapshots.sh                 # harvest what is due, publish, invalidate
#   scripts/refresh-snapshots.sh --dry-run       # say what is due; fetch and publish nothing
#   scripts/refresh-snapshots.sh --work=DIR      # where the full working copy lives
#                                                # (default ~/.cache/spaceradar-v1)
#   scripts/refresh-snapshots.sh --from-run=ID   # also merge what a GitHub `harvest` workflow run read
#   scripts/refresh-snapshots.sh --no-harvest    # publish the working copy (and --from-run) only
#   scripts/refresh-snapshots.sh --profile=NAME  # the AWS CLI profile to publish with (also
#                                                # --profile NAME). Default: your environment's.
#   scripts/refresh-snapshots.sh --bucket=B --region=R --distribution=ID
#                                                # another site. The defaults are the site's home
#                                                # since 2026-10-07: bucket
#                                                # sara-site-space-radar-lifehub (eu-north-1),
#                                                # distribution E1CGDK1ZPYFKHG, which the profile
#                                                # `life-hub` can write. (Before that day: bucket
#                                                # sara-site-space-radar, distribution
#                                                # E1JGFDLBX6HS7B, in another account. Publishing
#                                                # there now reaches nobody once DNS has moved.)
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
    -h|--help) sed -n '2,41p' "$0"; exit 0 ;;
    *) echo "unknown argument: $a" >&2; exit 2 ;;
  esac
done
[ "$PREV" = "--profile" ] && { echo "--profile needs a value" >&2; exit 2; }
# Exported, so every `aws` below (the seed, the uploads, the invalidation) uses it.
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"
[ "$DRY" = 1 ] && echo "==> would publish to s3://$BUCKET/data/v1/ ($REGION), distribution $DISTRIBUTION, profile ${AWS_PROFILE:-<environment>}"

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

# NOT OURS TO COPY (2026-10-09, internal #370). A source the registry switches off is not published:
# its file is dropped from the PUBLISH copy, whatever an earlier run left in the work folder, and
# its manifest row is published as `skipped` with no stamps (the row itself stays: it is how the
# app says "could not look" about a source by name, and a name is not the publisher's data). ESA's NEOCC list is the case: its terms forbid redistribution, the harvester
# had saved it before anyone read them, and the old file would otherwise have been uploaded again
# with every refresh. harvest/sources.json is the registry as the harvester reads it.
_off = sorted(r["id"] for r in json.load(open("harvest/sources.json"))["sources"] if r.get("enabled") is False)
_ix_p = os.path.join(d, "index.json")
_ix = json.load(open(_ix_p))
for _k in _off:
    _had = False
    if _k in _ix.get("snapshots", {}):
        _had = bool(_ix["snapshots"][_k].get("fetched_at"))
        _ix["snapshots"][_k] = {"status": "skipped", "last_error": "switched off in registry/sources.yaml (enabled: false): not fetched and not published"}
    for _name in (_k + ".json", _k + ".cols.json"):
        if os.path.exists(os.path.join(d, _name)):
            os.remove(os.path.join(d, _name)); _had = True
    if _had:
        print(f"    {_k}: switched off in registry/sources.yaml; not published")
json.dump(_ix, open(_ix_p, "w"), indent=1)

# KEEP THE LAST GOOD COPY. A refresh that fails (CelesTrak answered this machine AND the GitHub
# runner with 403 on 2026-09-28) leaves the row `status: error` with its old stamps carried
# (harvest/run.py _carry), and the browser refuses an errored row (data/sources.js readSnapshot),
# so the publish below emptied the saved satellites for every visitor CelesTrak also refuses --
# the one thing this copy exists for. Measured that night: 5 of 6 CelesTrak rows went to `error`
# and the cuts dropped out, until the rows were put back by hand. Here, in the PUBLISH copy only
# (the work index keeps `error`, so the harvester still retries on its cadence), a failed row
# whose file still holds data is published as the good copy it was, with its old fetched_at: the
# app shows the data's real age and asks the publisher live behind it (#198).
_ix_p = os.path.join(d, "index.json")
_ix = json.load(open(_ix_p))
for _k, _row in _ix.get("snapshots", {}).items():
    if _row.get("status") not in ("error", "refused") or not _row.get("fetched_at"):
        continue
    _fp = os.path.join(d, _k + ".json")
    try:
        _b, _ = body(json.load(open(_fp)))
    except Exception:
        continue
    _n = len(_b) if isinstance(_b, list) else len(_b.get("data") or []) if isinstance(_b, dict) else 0
    if _n > 0:
        _row["kept_after"] = _row.get("status") + ": " + str(_row.get("last_error") or "")[:160]
        _row["status"] = "ok"
        print(f"    {_k}: this refresh failed; publishing the last good copy from {_row['fetched_at']} ({_n} rows)")
json.dump(_ix, open(_ix_p, "w"), indent=1)

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

# TWO CUTS OF THE BIG CELESTRAK FILES, published beside them (site/js/data/sources.js explains):
# the satellites the hand-kept NOTABLE list names, and Starlink's latest launches. Each copies its
# parent's stamps and says what it was cut from.
def derive(parent_id, child_id, keep, what):
    pp = os.path.join(d, parent_id + ".json")
    ix_p = os.path.join(d, "index.json"); ix = json.load(open(ix_p))
    row = ix.get("snapshots", {}).get(parent_id)
    if not os.path.exists(pp) or not row or row.get("status") not in ("ok", "not-modified", "not-due"):
        return
    f = json.load(open(pp)); rows, was_str = body(f)
    kept = keep(rows)
    out = dict(f)
    out["source"] = child_id
    out["body"] = json.dumps(kept) if was_str else kept
    out["items"] = len(kept)
    out["note"] = f"{what}: {len(kept)} of the {len(rows)} rows of {parent_id}.json of the same publish"
    cp = os.path.join(d, child_id + ".json")
    json.dump(out, open(cp, "w"))
    child = dict(row); child["items"] = len(kept); child["bytes"] = os.path.getsize(cp)
    ix["snapshots"][child_id] = child
    json.dump(ix, open(ix_p, "w"), indent=1)
    print(f"    {child_id}: {len(kept)} of {len(rows)} rows ({os.path.getsize(cp)} B)")

layers_js = open("site/js/data/layers.js").read()
start = layers_js.index("export const NOTABLE = [")
notable_ids = {int(x) for x in re.findall(r"noradId:\s*(\d+)", layers_js[start:layers_js.index("];", start)])}
derive("celestrak-active", "celestrak-notable",
       lambda rows: [r for r in rows if int(r.get("NORAD_CAT_ID", -1)) in notable_ids],
       "the satellites site/js/data/layers.js NOTABLE names")

# The ring, with the thresholds site/js/data/parsers.js GEO_RING applies to the same rows: the
# layer draws it from ~900 rows instead of parsing the 7 MB catalogue for them (2026-09-22).
def geo(r):
    try:
        n = float(r.get("MEAN_MOTION")); e = float(r.get("ECCENTRICITY")); i = float(r.get("INCLINATION"))
    except (TypeError, ValueError):
        return False
    return 0.99 <= n <= 1.01 and e < 0.02 and i < 15
derive("celestrak-active", "celestrak-geo", lambda rows: [r for r in rows if geo(r)],
       "the geostationary ring, by the browser's own thresholds")

def launch(r):
    m = re.match(r"^(\d{4})-(\d{3})", str(r.get("OBJECT_ID", "")))
    return (int(m.group(1)), int(m.group(2))) if m else None
def recent_starlink(rows, launches=12):
    sl = [r for r in rows if str(r.get("OBJECT_NAME", "")).upper().startswith("STARLINK") and launch(r)]
    latest = sorted({launch(r) for r in sl}, reverse=True)[:launches]
    return [r for r in sl if launch(r) in set(latest)]
derive("celestrak-supplemental-starlink", "celestrak-starlink-recent", recent_starlink,
       "Starlink's twelve latest launches, which is where a train can be")

# THE BIG CATALOGUES ALSO AS COLUMNS (internal #523, scripts/columnar.py): <id>.cols.json beside the
# verbatim file, named in the manifest row as `columns`. The same rows in about a third of the
# text; the browser decodes it back to them and falls back to the verbatim file on any doubt.
# After the cuts, so a cut that is big enough gets a twin too, and last, so the twin is of the
# file exactly as it is published.
sys.path.insert(0, "scripts")
import columnar
for _sid, _rows, _before, _after in columnar.publish(d):
    print(f"    {_sid}: {_rows} rows also as columns, {_before} B -> {_after} B")

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
