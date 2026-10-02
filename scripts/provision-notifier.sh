#!/usr/bin/env bash
#
# Create the notifier: an IAM role, one Lambda, its public Function URL, an EventBridge schedule
# for the digest, and a log group. Idempotent.
#
#   ./scripts/provision-notifier.sh --bucket my-space-radar --from-address alerts@example.com \
#       --dry-run
#
# Options:
#   --bucket NAME         required. The bucket provision.sh made. The Lambda may read/write
#                         notify/v1/* in it, and may only READ data/v1/launches.json (the
#                         harvester's own output) -- nothing else in the bucket.
#   --from-address ADDR   required. The SES-verified sender. A placeholder until a human verifies
#                         its sending domain and moves SES out of the sandbox -- see below.
#   --function NAME       default space-radar-notifier. Also names the role, the rule and the log
#                         group.
#   --role NAME           default space-radar-notifier.
#   --schedule EXPR       default 'rate(1 day)'. An EventBridge schedule expression for the digest.
#   --zip PATH            default dist/notifier.zip. Not built by this script; bring your own,
#                         the way provision-harvester.sh's first run needs dist/harvester.zip.
#   --region REGION       default eu-north-1.
#   --profile NAME        an AWS CLI profile. Default: whatever your environment already uses.
#   --dry-run             print every aws command with its real values; run only the reads.
#   --teardown             remove what this script made, in the right order. Never the bucket,
#                         never an object in it. Asks first unless --yes.
#   --yes                 skip the teardown confirmation.
#
# WHO RUNS THIS
# Creating an IAM role and an SES-sending identity are permission and reputation changes, so this
# is run by the account owner, once, after reading the --dry-run -- the same discipline
# provision-harvester.sh states for itself (specs/0003 amendment 1 s.6). The harness that wrote
# this script does not run it for real, create any resource it describes, or send a real email.
#
# BEFORE IT CAN MAIL ANYONE
# `--from-address` must be a verified SES identity, and the account's SES sending must be moved
# out of the sandbox (which otherwise refuses mail to anyone who hasn't themselves verified their
# address). Both are manual, cost-bearing, human steps -- verifying a domain touches DNS outside
# this repo, and leaving the sandbox is an AWS support request. This script does not attempt
# either; it only grants the one Lambda role permission to send FROM an address a human already
# verified.
#
# WHY A FUNCTION URL, NOT API GATEWAY
# Three plain routes (POST /subscribe, GET /confirm, GET /unsubscribe), no auth, no stages, no
# custom domain yet. A Function URL is one resource instead of API Gateway's several (an API, a
# stage, routes, integrations), matching this project's "as little infra as possible" ethos --
# the same reasoning provision-harvester.sh's role trusts exactly one function for.
#
# LEAST PRIVILEGE, STATED ONCE
# The role trusts lambda.amazonaws.com -- and only this one function, via aws:SourceArn. Its one
# inline policy allows s3:PutObject/s3:GetObject on notify/v1/* of the bucket, s3:ListBucket under
# that prefix, s3:GetObject (read-only, no Put) on data/v1/launches.json -- the harvester's own
# output and nothing else of it -- ses:SendEmail restricted to the Resource ARN of the one
# verified FROM identity, and writing to its own log group. It cannot delete an object, touch any
# other key, or send mail from any other address.

set -euo pipefail

BUCKET=""
FROM_ADDRESS=""
FUNCTION="space-radar-notifier"
ROLE="space-radar-notifier"
SCHEDULE="rate(1 day)"
ZIP=""
REGION="eu-north-1"
PROFILE=""
DRY_RUN=0
TEARDOWN=0
YES=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,41p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)       BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --from-address) FROM_ADDRESS="${2:?--from-address needs a value}"; shift 2 ;;
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
[ -n "$FROM_ADDRESS" ] || die "--from-address is required: it names the one identity SES may send from"
case "$BUCKET" in *[!a-z0-9.-]*) die "--bucket $BUCKET is not a bucket name" ;; esac
case "$FROM_ADDRESS" in *@*.*) ;; *) die "--from-address $FROM_ADDRESS does not look like an email address" ;; esac
case "$FUNCTION" in *[!A-Za-z0-9_-]*) die "--function may only use letters, digits, - and _" ;; esac
case "$ROLE" in *[!A-Za-z0-9_+=,.@-]*) die "--role may only use letters, digits and + = , . @ _ -" ;; esac
case "$SCHEDULE" in
  rate\(*\)|cron\(*\)) ;;
  *) die "--schedule must be an EventBridge expression: rate(1 day) or cron(...)" ;;
esac
command -v aws >/dev/null || die "the aws CLI is not installed"
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
[ -n "$ZIP" ] || ZIP="$ROOT/dist/notifier.zip"
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
SES_IDENTITY_ARN="arn:aws:ses:$REGION:$ACCOUNT:identity/$FROM_ADDRESS"
POLICY_NAME="$FUNCTION"
EVENTBRIDGE_SID="eventbridge-$FUNCTION"
FUNCTION_URL_SID="funcurl-$FUNCTION"
PREFIX="notify/v1"
HARVEST_PREFIX="data/v1"

echo "==> account $ACCOUNT, region $REGION"
echo "    bucket $BUCKET  from $FROM_ADDRESS  function $FUNCTION  role $ROLE"
[ "$DRY_RUN" = "1" ] && echo "    (dry run: only reads below actually run)"

# What exists already. Every check here is a read; the answers decide create-vs-update below.
"${AWS[@]}" s3api head-bucket --bucket "$BUCKET" >/dev/null 2>&1 \
  || die "bucket $BUCKET is not reachable; run provision.sh first"
ROLE_EXISTS=0; "${AWS[@]}" iam get-role --role-name "$ROLE" >/dev/null 2>&1 && ROLE_EXISTS=1
FN_EXISTS=0;   "${AWS[@]}" lambda get-function --function-name "$FUNCTION" >/dev/null 2>&1 && FN_EXISTS=1
RULE_EXISTS=0; "${AWS[@]}" events describe-rule --name "$FUNCTION" >/dev/null 2>&1 && RULE_EXISTS=1
URL_EXISTS=0;  "${AWS[@]}" lambda get-function-url-config --function-name "$FUNCTION" >/dev/null 2>&1 && URL_EXISTS=1
LOG_EXISTS=0
HAVE=$("${AWS[@]}" logs describe-log-groups --log-group-name-prefix "$LOG_GROUP" \
  --query "logGroups[?logGroupName=='$LOG_GROUP'].logGroupName" --output text 2>/dev/null || true)
[ -n "$HAVE" ] && [ "$HAVE" != "None" ] && LOG_EXISTS=1
echo "    exists: role=$ROLE_EXISTS function=$FN_EXISTS rule=$RULE_EXISTS url=$URL_EXISTS log-group=$LOG_EXISTS"

# ---------------------------------------------------------------------------------------------
if [ "$TEARDOWN" = "1" ]; then
  echo "==> TEARDOWN of the notifier (the bucket and its objects are untouched)"
  if [ "$DRY_RUN" != "1" ] && [ "$YES" != "1" ]; then
    printf '    type the function name (%s) to confirm: ' "$FUNCTION"
    read -r answer
    [ "$answer" = "$FUNCTION" ] || die "not confirmed; nothing removed"
  fi
  # Order: the schedule's target before the rule, the Function URL before the function, the
  # function before the role, the log group last.
  if [ "$RULE_EXISTS" = "1" ]; then
    echo "==> the schedule"
    run "${AWS[@]}" events remove-targets --rule "$FUNCTION" --ids "$FUNCTION"
    run "${AWS[@]}" events delete-rule --name "$FUNCTION"
  fi
  if [ "$URL_EXISTS" = "1" ]; then
    echo "==> the Function URL"
    run "${AWS[@]}" lambda delete-function-url-config --function-name "$FUNCTION"
  fi
  if [ "$FN_EXISTS" = "1" ]; then
    echo "==> the function (its invoke permissions go with it)"
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
  if [ "$RULE_EXISTS$URL_EXISTS$FN_EXISTS$ROLE_EXISTS$LOG_EXISTS" = "00000" ]; then
    echo "    nothing of the notifier exists; nothing to remove"
  fi
  echo "==> done. s3://$BUCKET/$PREFIX/ still holds whatever subscriptions and ledger it wrote."
  exit 0
fi

# ---------------------------------------------------------------------------------------------
# 0. the code. create-function needs a zip; nothing here builds one (unlike the harvester, which
#    falls back to a placeholder) -- bring dist/notifier.zip or point --zip at one.
if [ ! -f "$ZIP" ] && [ "$DRY_RUN" != "1" ]; then
  die "$ZIP does not exist; build notify/ into a zip first (no package-notifier.sh exists yet)"
fi

# 1. the log group, before the function, so retention applies from the first line.
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
      "Sid": "ReadWriteNotifyStateOnly",
      "Effect": "Allow",
      "Action": ["s3:PutObject", "s3:GetObject"],
      "Resource": "arn:aws:s3:::$BUCKET/$PREFIX/*"
    },
    {
      "Sid": "ListNotifyStateOnly",
      "Effect": "Allow",
      "Action": "s3:ListBucket",
      "Resource": "arn:aws:s3:::$BUCKET",
      "Condition": { "StringLike": { "s3:prefix": ["$PREFIX/*"] } }
    },
    {
      "Sid": "ReadHarvesterLaunchesOnly",
      "Effect": "Allow",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BUCKET/$HARVEST_PREFIX/launches.json"
    },
    {
      "Sid": "SendFromVerifiedAddressOnly",
      "Effect": "Allow",
      "Action": "ses:SendEmail",
      "Resource": "$SES_IDENTITY_ARN"
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
    --description "Space Radar notifier: reads/writes $PREFIX/* in $BUCKET, reads $HARVEST_PREFIX/launches.json, sends from $FROM_ADDRESS" \
    --assume-role-policy-document "$TRUST" \
    --tags Key=project,Value=space-radar
fi
run "${AWS[@]}" iam put-role-policy --role-name "$ROLE" --policy-name "$POLICY_NAME" \
  --policy-document "$POLICY"

# 3. the function. python3.12 on arm64, 256 MB, 30 s: one S3 read, a handful of SES calls, and a
#    JSON write -- nowhere near the harvester's multi-source run.
echo "==> function $FUNCTION"
ENVIRONMENT="{\"Variables\":{\"NOTIFY_BUCKET\":\"$BUCKET\",\"NOTIFY_PREFIX\":\"$PREFIX\",\"HARVEST_PREFIX\":\"$HARVEST_PREFIX\",\"NOTIFY_FROM_ADDRESS\":\"$FROM_ADDRESS\"}}"
echo "    (NOTIFY_SECRET is NOT set by this script -- set it by hand, from a real secret, never committed)"
if [ "$FN_EXISTS" = "1" ]; then
  echo "    exists; converging its configuration (code is a separate deploy step, as with the harvester)"
  run "${AWS[@]}" lambda update-function-configuration --function-name "$FUNCTION" \
    --runtime python3.12 --handler notify.lambda_handler.handler --role "$ROLE_ARN" \
    --memory-size 256 --timeout 30 --environment "$ENVIRONMENT"
  run "${AWS[@]}" lambda wait function-updated-v2 --function-name "$FUNCTION"
else
  CREATE=("${AWS[@]}" lambda create-function --function-name "$FUNCTION"
    --runtime python3.12 --architectures arm64 --memory-size 256 --timeout 30
    --handler notify.lambda_handler.handler --role "$ROLE_ARN"
    --zip-file "fileb://$ZIP" --environment "$ENVIRONMENT"
    --description "Space Radar notifier: subscribe/confirm/unsubscribe and the digest, state in s3://$BUCKET/$PREFIX/"
    --tags project=space-radar)
  if [ "$DRY_RUN" = "1" ]; then
    run "${CREATE[@]}"
  else
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

# 4. the Function URL: no auth (the subscribe endpoint is public by nature), and the matching
#    resource policy so the public may invoke it. create-function-url-config has no "update or
#    create" form that is a no-op when unchanged, so it is just always applied; it converges.
echo "==> Function URL (auth NONE -- subscribe/confirm/unsubscribe have no session to check)"
run "${AWS[@]}" lambda create-function-url-config --function-name "$FUNCTION" --auth-type NONE \
  --cors '{"AllowMethods":["GET","POST"],"AllowOrigins":["*"]}'
HAVE_URL_SID=$("${AWS[@]}" lambda get-policy --function-name "$FUNCTION" \
  --query Policy --output text 2>/dev/null | grep -c "\"Sid\":\"$FUNCTION_URL_SID\"" || true)
if [ "$HAVE_URL_SID" = "1" ]; then
  echo "    the public may already invoke the Function URL"
else
  run "${AWS[@]}" lambda add-permission --function-name "$FUNCTION" \
    --statement-id "$FUNCTION_URL_SID" --action lambda:InvokeFunctionUrl \
    --principal "*" --function-url-auth-type NONE
fi

# 5. the schedule: rule -> permission -> target, same order as the harvester's.
echo "==> schedule $SCHEDULE (the digest)"
run "${AWS[@]}" events put-rule --name "$FUNCTION" --schedule-expression "$SCHEDULE" \
  --state ENABLED --description "Space Radar notifier digest: $SCHEDULE"
HAVE_SID=$("${AWS[@]}" lambda get-policy --function-name "$FUNCTION" \
  --query Policy --output text 2>/dev/null | grep -c "\"Sid\":\"$EVENTBRIDGE_SID\"" || true)
if [ "$HAVE_SID" = "1" ]; then
  echo "    EventBridge may already invoke the function"
else
  run "${AWS[@]}" lambda add-permission --function-name "$FUNCTION" \
    --statement-id "$EVENTBRIDGE_SID" --action lambda:InvokeFunction \
    --principal events.amazonaws.com --source-arn "$RULE_ARN"
fi
run "${AWS[@]}" events put-targets --rule "$FUNCTION" --targets "Id=$FUNCTION,Arn=$FN_ARN"

cat <<DONE

==> done.
    role         $ROLE_ARN
    function     $FN_ARN
    schedule     $RULE_ARN  ($SCHEDULE, the digest)
    logs         $LOG_GROUP  (14 days)
    reads/writes s3://$BUCKET/$PREFIX/*  and reads s3://$BUCKET/$HARVEST_PREFIX/launches.json  -- nothing else

    Still manual, by design, before this can mail anyone:
      1. verify $FROM_ADDRESS (or its domain) in SES and move the account out of the sandbox
      2. set NOTIFY_SECRET on the function to a real secret (this script never sets it)
      3. point the frontend's subscribe form at the Function URL:
           aws lambda get-function-url-config --function-name $FUNCTION --region $REGION
DONE
