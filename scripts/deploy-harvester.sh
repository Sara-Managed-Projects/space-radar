#!/usr/bin/env bash
#
# Ship a new harvester zip to the Lambda, run it once, and show what it wrote.
#
#   ./scripts/deploy-harvester.sh --function space-radar-harvester
#
# Options:
#   --function NAME   required. The Lambda provision-harvester.sh made.
#   --zip PATH        default dist/harvester.zip; package-harvester.sh builds it if missing.
#   --region REGION   default eu-north-1.
#   --profile NAME    an AWS CLI profile. Default: whatever your environment already uses.
#   --no-invoke       upload only; do not run it and do not read the manifest back.
#   --dry-run         print every aws command with its real values; run only the reads.
#
# WHY IT INVOKES ONCE
# An upload proves the zip arrived. The invoke proves it RUNS -- with the role's permissions, the
# real bucket, the real upstreams -- without waiting up to 30 minutes for the schedule to find a
# broken import. The index.json it then prints is the same bytes the browser will fetch, which is
# the whole of "verify in production". The bucket and prefix are read from the function's own
# environment, so this script cannot be pointed at the wrong bucket by a typo.

set -euo pipefail

FUNCTION=""
ZIP=""
REGION="eu-north-1"
PROFILE=""
INVOKE=1
DRY_RUN=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,20p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --function)  FUNCTION="${2:?--function needs a value}"; shift 2 ;;
    --zip)       ZIP="${2:?--zip needs a value}"; shift 2 ;;
    --region)    REGION="${2:?--region needs a value}"; shift 2 ;;
    --profile)   PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --no-invoke) INVOKE=0; shift ;;
    --dry-run)   DRY_RUN=1; shift ;;
    -h|--help)   usage 0 ;;
    *)           die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$FUNCTION" ] || die "--function is required (try --help)"
case "$FUNCTION" in *[!A-Za-z0-9_-]*) die "--function may only use letters, digits, - and _" ;; esac
command -v aws >/dev/null || die "the aws CLI is not installed"
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -n "$ZIP" ] || ZIP="$ROOT/dist/harvester.zip"
case "$ZIP" in /*) ;; *) ZIP="$PWD/$ZIP" ;; esac

AWS=(aws --region "$REGION")

run() {
  if [ "$DRY_RUN" = "1" ]; then echo "  would run: $*"; else "$@"; fi
}

# Where it writes is a fact about the function, not an argument here.
BUCKET=$("${AWS[@]}" lambda get-function-configuration --function-name "$FUNCTION" \
  --query 'Environment.Variables.HARVEST_BUCKET' --output text 2>/dev/null) \
  || die "no function $FUNCTION in $REGION; run provision-harvester.sh first"
PREFIX=$("${AWS[@]}" lambda get-function-configuration --function-name "$FUNCTION" \
  --query 'Environment.Variables.HARVEST_PREFIX' --output text 2>/dev/null || echo None)
[ -n "$BUCKET" ] && [ "$BUCKET" != "None" ] || die "$FUNCTION has no HARVEST_BUCKET; provision it first"
[ "$PREFIX" != "None" ] || PREFIX="data/v1"

echo "==> $FUNCTION ($REGION) -> s3://$BUCKET/$PREFIX/"
[ "$DRY_RUN" = "1" ] && echo "    (dry run: only reads below actually run)"

if [ ! -f "$ZIP" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "==> $ZIP is missing; would run: $ROOT/scripts/package-harvester.sh --out $ZIP"
  else
    echo "==> $ZIP is missing; packaging"
    "$ROOT/scripts/package-harvester.sh" --out "$ZIP"
  fi
fi

echo "==> code"
# --architectures converges arm64 on a function that was created some other way; it is not a change.
run "${AWS[@]}" lambda update-function-code --function-name "$FUNCTION" \
  --zip-file "fileb://$ZIP" --architectures arm64 --query CodeSha256 --output text
run "${AWS[@]}" lambda wait function-updated-v2 --function-name "$FUNCTION"

if [ "$INVOKE" != "1" ]; then
  echo "==> done (not invoked; the schedule will run it)"
  exit 0
fi

echo "==> one invoke"
OUTFILE="$(mktemp "${TMPDIR:-/tmp}/harvester-invoke.XXXXXX")"
trap 'rm -f "$OUTFILE"' EXIT
# The CLI's default read timeout is 60 s and the function is allowed 120: without the longer
# timeout the invoke that runs longest -- the one worth watching -- is the one reported as failed.
INVOKE_CMD=("${AWS[@]}" lambda invoke --function-name "$FUNCTION"
  --cli-binary-format raw-in-base64-out --payload '{"source":"deploy-harvester.sh"}'
  --log-type Tail --cli-read-timeout 180 "$OUTFILE")
if [ "$DRY_RUN" = "1" ]; then
  run "${INVOKE_CMD[@]}"
else
  RESPONSE=$("${INVOKE_CMD[@]}")
  # The log tail is base64 in the response; print it whatever happened, it is the evidence.
  printf '%s' "$RESPONSE" | python3 -c '
import base64, json, sys
r = json.load(sys.stdin)
tail = base64.b64decode(r.get("LogResult", "")).decode("utf-8", "replace").rstrip()
if tail: print("    " + tail.replace("\n", "\n    "))
if r.get("FunctionError"):
    print("    FunctionError:", r["FunctionError"]); sys.exit(1)
' || { echo "    payload:"; sed 's/^/      /' "$OUTFILE"; die "the invoke failed; see the log tail above"; }
  echo "    returned: $(cat "$OUTFILE")"
fi

echo "==> s3://$BUCKET/$PREFIX/index.json"
run "${AWS[@]}" s3api head-object --bucket "$BUCKET" --key "$PREFIX/index.json" \
  --query '{CacheControl:CacheControl,ContentType:ContentType,LastModified:LastModified,Bytes:ContentLength}' \
  --output table
if [ "$DRY_RUN" = "1" ]; then
  run "${AWS[@]}" s3 cp "s3://$BUCKET/$PREFIX/index.json" -
else
  "${AWS[@]}" s3 cp "s3://$BUCKET/$PREFIX/index.json" - | python3 -m json.tool | head -60
fi
echo "==> done"
