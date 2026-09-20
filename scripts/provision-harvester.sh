#!/usr/bin/env bash
#
# Create the harvester: an IAM role, a Lambda, an EventBridge schedule and a log group. Idempotent.
#
#   ./scripts/provision-harvester.sh --bucket my-space-radar --distribution E1ABCDEF23456 --dry-run
#
# Options:
#   --bucket NAME         required. The bucket provision.sh made. The Lambda may write data/v1/* in it
#                         and nothing else.
#   --distribution ID     required. READ ONLY: the script measures how it caches /data/v1/* and prints
#                         -- never applies -- the change if the cache would pin data.
#   --function NAME       default space-radar-harvester. Also names the rule and the log group.
#   --role NAME           default space-radar-harvester.
#   --schedule EXPR       default 'rate(30 minutes)'. An EventBridge schedule expression.
#   --zip PATH            default dist/harvester.zip; package-harvester.sh builds it if missing.
#   --region REGION       default eu-north-1.
#   --profile NAME        an AWS CLI profile. Default: whatever your environment already uses.
#   --dry-run             print every aws command with its real values; run only the reads.
#   --teardown            remove what this script made, in the right order. Never the bucket, never
#                         an object in it, never the distribution. Asks first unless --yes.
#   --yes                 skip the teardown confirmation.
#
# WHO RUNS THIS
# Creating an IAM role is a permission change, so this is run by the account owner, once, after
# reading the --dry-run (specs/0003 amendment 1 s.6). The harness that wrote it refused to.
#
# LEAST PRIVILEGE, STATED ONCE
# The role trusts lambda.amazonaws.com -- and only this one function, via aws:SourceArn. Its one
# inline policy allows s3:PutObject and s3:GetObject on data/v1/* of the bucket, s3:ListBucket
# under that prefix, and writing to its own log group. It cannot delete an object, touch any other
# key, or invalidate CloudFront: the data expires by TTL, which is the design.

set -euo pipefail

BUCKET=""
DISTRIBUTION=""
FUNCTION="space-radar-harvester"
ROLE="space-radar-harvester"
SCHEDULE="rate(30 minutes)"
ZIP=""
REGION="eu-north-1"
PROFILE=""
DRY_RUN=0
TEARDOWN=0
YES=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,31p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --distribution) DISTRIBUTION="${2:?--distribution needs a value}"; shift 2 ;;
    --function)     FUNCTION="${2:?--function needs a value}"; shift 2 ;;
    --role)         ROLE="${2:?--role needs a value}"; shift 2 ;;
    --schedule)     SCHEDULE="${2:?--schedule needs a value}"; shift 2 ;;
    --zip)          ZIP="${2:?--zip needs a value}"; shift 2 ;;
    --region)       REGION="${2:?--region needs a value}"; shift 2 ;;
    --profile)      PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    --teardown)     TEARDOWN=1; shift ;;
    --yes)          YES=1; shift ;;
    -h|--help)      usage 0 ;;
    *)              die "unknown option: $1 (try --help)" ;;
  esac
done

# Refuse the values that would otherwise fail deep inside an AWS call, or worse, succeed oddly.
[ -n "$BUCKET" ] || die "--bucket is required (try --help)"
[ -n "$DISTRIBUTION" ] || die "--distribution is required: the script measures how it caches data/v1/*"
case "$BUCKET" in *[!a-z0-9.-]*) die "--bucket $BUCKET is not a bucket name" ;; esac
case "$DISTRIBUTION" in E[A-Z0-9]*) ;; *) die "--distribution $DISTRIBUTION does not look like an id (E...)" ;; esac
case "$FUNCTION" in *[!A-Za-z0-9_-]*) die "--function may only use letters, digits, - and _" ;; esac
case "$ROLE" in *[!A-Za-z0-9_+=,.@-]*) die "--role may only use letters, digits and + = , . @ _ -" ;; esac
case "$SCHEDULE" in
  rate\(*\)|cron\(*\)) ;;
  *) die "--schedule must be an EventBridge expression: rate(30 minutes) or cron(...)" ;;
esac
command -v aws >/dev/null || die "the aws CLI is not installed"
command -v python3 >/dev/null || die "python3 is not installed (it measures the CloudFront behaviour)"
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -n "$ZIP" ] || ZIP="$ROOT/dist/harvester.zip"
case "$ZIP" in /*) ;; *) ZIP="$PWD/$ZIP" ;; esac

AWS=(aws --region "$REGION")

run() {
  if [ "$DRY_RUN" = "1" ]; then echo "  would run: $*"; else "$@"; fi
}

ACCOUNT=$("${AWS[@]}" sts get-caller-identity --query Account --output text) \
  || die "cannot reach AWS; check your credentials"
case "$ACCOUNT" in *[!0-9]*|"") die "the account id came back as '$ACCOUNT'" ;; esac

ROLE_ARN="arn:aws:iam::$ACCOUNT:role/$ROLE"
FN_ARN="arn:aws:lambda:$REGION:$ACCOUNT:function:$FUNCTION"
RULE_ARN="arn:aws:events:$REGION:$ACCOUNT:rule/$FUNCTION"
LOG_GROUP="/aws/lambda/$FUNCTION"
LOG_ARN="arn:aws:logs:$REGION:$ACCOUNT:log-group:$LOG_GROUP"
POLICY_NAME="$FUNCTION"
PERMISSION_SID="eventbridge-$FUNCTION"
PREFIX="data/v1"

echo "==> account $ACCOUNT, region $REGION"
echo "    bucket $BUCKET  distribution $DISTRIBUTION  function $FUNCTION  role $ROLE"
[ "$DRY_RUN" = "1" ] && echo "    (dry run: only reads below actually run)"

# What exists already. Every check here is a read; the answers decide create-vs-update below,
# which is what makes a second run harmless.
"${AWS[@]}" s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 \
  || die "bucket $BUCKET is not reachable; run provision.sh first"
ROLE_EXISTS=0; "${AWS[@]}" iam get-role --role-name "$ROLE" >/dev/null 2>&1 && ROLE_EXISTS=1
FN_EXISTS=0;   "${AWS[@]}" lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1 && FN_EXISTS=1
RULE_EXISTS=0; "${AWS[@]}" events describe-rule --name "$FUNCTION" >/dev/null 2>&1 && RULE_EXISTS=1
LOG_EXISTS=0
HAVE=$("${AWS[@]}" logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" --output text 2>/dev/null || true)
[ -n "$HAVE" ] && [ "$HAVE" != "None" ] && LOG_EXISTS=1
echo "    exists: role=$ROLE_EXISTS function=$FN_EXISTS rule=$RULE_EXISTS log-group=$LOG_EXISTS"

# ---------------------------------------------------------------------------------------------
if [ "$TEARDOWN" = "1" ]; then
  echo "==> TEARDOWN of the harvester (the bucket, its objects and the distribution are untouched)"
  if [ "$DRY_RUN" != "1" ] && [ "$YES" != "1" ]; then
    printf '    type the function name (%s) to confirm: ' "$FUNCTION"
    read -r answer
    [ "$answer" = "$FUNCTION" ] || die "not confirmed; nothing removed"
  fi
  # Order matters: the rule's target first (a rule with targets cannot be deleted), the function
  # before the role (a function whose role is gone is a stuck function), the log group last (it
  # holds the evidence of whatever went wrong).
  if [ "$RULE_EXISTS" = "1" ]; then
    echo "==> the schedule"
    run "${AWS[@]}" events remove-targets --rule "$FUNCTION" --ids "$FUNCTION"
    run "${AWS[@]}" events delete-rule --name "$FUNCTION"
  fi
  if [ "$FN_EXISTS" = "1" ]; then
    echo "==> the function (its invoke permission goes with it)"
    run "${AWS[@]}" lambda delete-function --function-name "$FUNCTION"
  fi
  if [ "$ROLE_EXISTS" = "1" ]; then
    echo "==> the role"
    run "${AWS[@]}" iam delete-role-policy --role-name "$ROLE" --policy-name "$POLICY_NAME"
    run "${AWS[@]}" iam delete-role --role-name "$ROLE"
  fi
  if [ "$LOG_EXISTS" = "1" ]; then
    echo "==> the log group"
    run "${AWS[@]}" logs delete-log-group --log-group-name "$LOG_GROUP"
  fi
  if [ "$RULE_EXISTS$FN_EXISTS$ROLE_EXISTS$LOG_EXISTS" = "0000" ]; then
    echo "    nothing of the harvester exists; nothing to remove"
  fi
  echo "==> done. s3://$BUCKET/$PREFIX/ still holds whatever the harvester wrote."
  exit 0
fi

# ---------------------------------------------------------------------------------------------
# 0. the code. create-function needs a zip; the placeholder is fine for the first run.
if [ ! -f "$ZIP" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "==> $ZIP is missing; would run: $ROOT/scripts/package-harvester.sh --out $ZIP"
  else
    echo "==> $ZIP is missing; packaging"
    "$ROOT/scripts/package-harvester.sh" --out "$ZIP"
  fi
fi

# 1. the log group, before the function, so the retention applies from the first line. Left to
#    Lambda, the group is created on first invoke with retention "never expire".
echo "==> log group $LOG_GROUP, 14-day retention"
if [ "$LOG_EXISTS" = "1" ]; then
  echo "    exists, leaving it alone"
else
  run "${AWS[@]}" logs create-log-group --log-group-name "$LOG_GROUP" --tags project=space-radar
fi
run "${AWS[@]}" logs put-retention-policy --log-group-name "$LOG_GROUP" --retention-in-days 14

# 2. the role. Trust: Lambda, and only this function. Policy: see the header.
echo "==> role $ROLE"
TRUST=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "OnlyThisFunctionMayAssume",
    "Effect": "Allow",
    "Principal": { "Service": "lambda.amazonaws.com" },
    "Action": "sts:AssumeRole",
    "Condition": {
      "StringEquals": { "aws:SourceAccount": "$ACCOUNT" },
      "ArnLike": { "aws:SourceArn": "$FN_ARN" }
    }
  }]
}
JSON
)
POLICY=$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "ReadWriteSnapshotsOnly",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::$BUCKET/$PREFIX/*"
    },
    {
      "Sid": "ListSnapshotsOnly",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::$BUCKET",
      "Condition": { "StringLike": { "s3:prefix": ["$PREFIX/*"] } }
    },
    {
      "Sid": "OwnLogGroupOnly",
      "Effect": "Allow",
      "Action": ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents"],
      "Resource": ["$LOG_ARN", "$LOG_ARN:*"]
    }
  ]
}
JSON
)
if [ "$ROLE_EXISTS" = "1" ]; then
  echo "    exists; converging its trust policy"
  run "${AWS[@]}" iam update-assume-role-policy --role-name "$ROLE" --policy-document "$TRUST"
else
  run "${AWS[@]}" iam create-role --role-name "$ROLE" \
    --description "Space Radar harvester: writes data/v1/* in $BUCKET, nothing else" \
    --assume-role-policy-document "$TRUST" \
    --tags Key=project,Value=space-radar
fi
# put-role-policy overwrites, so the policy converges on every run, whatever it said before.
run "${AWS[@]}" iam put-role-policy --role-name "$ROLE" --policy-name "$POLICY_NAME" \
  --policy-document "$POLICY"

# 3. the function. python3.12 on arm64 (cheaper per GB-s), 512 MB, 120 s: the largest body is
#    CelesTrak `active` at ~7 MB and a whole run is ~20 s; 120 s is the margin for a slow upstream.
echo "==> function $FUNCTION"
ENVIRONMENT="{\"Variables\":{\"HARVEST_BUCKET\":\"$BUCKET\",\"HARVEST_PREFIX\":\"$PREFIX\"}}"
if [ "$FN_EXISTS" = "1" ]; then
  echo "    exists; converging its configuration (code is deploy-harvester.sh's job)"
  run "${AWS[@]}" lambda update-function-configuration --function-name "$FUNCTION" \
    --runtime python3.12 --handler harvest.lambda_handler.handler --role "$ROLE_ARN" \
    --memory-size 512 --timeout 120 --environment "$ENVIRONMENT"
  run "${AWS[@]}" lambda wait function-updated-v2 --function-name "$FUNCTION"
else
  CREATE=("${AWS[@]}" lambda create-function --function-name "$FUNCTION"
    --runtime python3.12 --architectures arm64 --memory-size 512 --timeout 120
    --handler harvest.lambda_handler.handler --role "$ROLE_ARN"
    --zip-file "fileb://$ZIP" --environment "$ENVIRONMENT"
    --description "Space Radar harvester: snapshots upstream data into s3://$BUCKET/$PREFIX/"
    --tags project=space-radar)
  if [ "$DRY_RUN" = "1" ]; then
    run "${CREATE[@]}"
  else
    # A role is visible to IAM before Lambda can assume it; the gap is seconds and the error
    # says "cannot be assumed". Wait, then retry a few times rather than fail the first run.
    "${AWS[@]}" iam wait role-exists --role-name "$ROLE"
    tries=0
    until "${CREATE[@]}" >/dev/null; do
      tries=$((tries + 1))
      [ "$tries" -lt 8 ] || die "Lambda could not be created with $ROLE_ARN after $tries tries"
      echo "    (IAM is still propagating; retrying in 5 s)"
      sleep 5
    done
  fi
  run "${AWS[@]}" lambda wait function-active-v2 --function-name "$FUNCTION"
fi

# 4. the schedule: rule -> permission -> target. put-rule and put-targets are idempotent;
#    add-permission is not, so the statement is looked for first.
echo "==> schedule $SCHEDULE"
run "${AWS[@]}" events put-rule --name "$FUNCTION" --schedule-expression "$SCHEDULE" \
  --state ENABLED --description "Space Radar harvester: $SCHEDULE"
HAVE_SID=$("${AWS[@]}" lambda get-policy --function-name "$FUNCTION" \
  --query Policy --output text 2>/dev/null | grep -c "\"Sid\":\"$PERMISSION_SID\"" || true)
if [ "$HAVE_SID" = "1" ]; then
  echo "    EventBridge may already invoke the function"
else
  run "${AWS[@]}" lambda add-permission --function-name "$FUNCTION" \
    --statement-id "$PERMISSION_SID" --action lambda:InvokeFunction \
    --principal events.amazonaws.com --source-arn "$RULE_ARN"
fi
run "${AWS[@]}" events put-targets --rule "$FUNCTION" --targets "Id=$FUNCTION,Arn=$FN_ARN"

# 5. CloudFront, READ ONLY. The design replaces invalidation with TTL expiry, which only holds if
#    the edge honours the origin's Cache-Control on /data/v1/*. Measured, not assumed; anything it
#    would take to fix is printed for the owner and never applied here.
echo "==> CloudFront $DISTRIBUTION: how is /$PREFIX/* cached? (read only)"
python3 "$ROOT/scripts/_cf_data_behaviour.py" --distribution "$DISTRIBUTION" --region "$REGION" \
  --prefix "$PREFIX/*"

cat <<DONE

==> done.
    role       $ROLE_ARN
    function   $FN_ARN
    schedule   $RULE_ARN  ($SCHEDULE)
    logs       $LOG_GROUP  (14 days)
    writes     s3://$BUCKET/$PREFIX/*  and nothing else

    Then, to ship code and see the first manifest:
      ./scripts/package-harvester.sh && ./scripts/deploy-harvester.sh --function $FUNCTION --region $REGION
    And to watch it run on its own:
      aws logs tail $LOG_GROUP --region $REGION --since 1h --follow
DONE
