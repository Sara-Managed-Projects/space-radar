#!/usr/bin/env bash
#
# Create the hosting for Space Radar: a PRIVATE S3 bucket that only CloudFront can read.
#
#   ./scripts/provision.sh --bucket my-space-radar --region eu-north-1
#
# Options:
#   --bucket NAME      required. Must be globally unique across all of S3.
#   --region REGION    default eu-north-1. Where the bucket lives; CloudFront is global.
#   --profile NAME     an AWS CLI profile. Default: whatever your environment already uses.
#   --price-class X    PriceClass_100 (default, cheapest: US/Canada/Europe/Israel),
#                      PriceClass_200 (adds Asia/Africa), PriceClass_All.
#   --dry-run          print what it would do and change nothing.
#
# It prints the distribution id and domain at the end. Keep the id: `deploy.sh` wants it.
#
# WHY THE BUCKET IS PRIVATE
# A public-read bucket is one careless `--acl public-read` away from serving anything else you
# put in it, and it cannot do HTTPS on its own. CloudFront with an origin access control gives
# you HTTPS (which geolocation and the sky view require), a free certificate, compression, and a
# bucket that answers 403 to everyone but the distribution.
#
# WHAT THIS COSTS
# Nothing to create. CloudFront's always-free tier covers 1 TB out and 10M requests a month, and
# S3 storage for this site is a few cents. A distribution CANNOT be deleted immediately -- it must
# be disabled first and removed once that propagates -- so create it once and reuse it.

set -euo pipefail

BUCKET=""
REGION="eu-north-1"
PROFILE=""
PRICE_CLASS="PriceClass_100"
DRY_RUN=0

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --bucket)      BUCKET="${2:?--bucket needs a value}"; shift 2 ;;
    --region)      REGION="${2:?--region needs a value}"; shift 2 ;;
    --profile)     PROFILE="${2:?--profile needs a value}"; shift 2 ;;
    --price-class) PRICE_CLASS="${2:?--price-class needs a value}"; shift 2 ;;
    --dry-run)     DRY_RUN=1; shift ;;
    -h|--help)     usage 0 ;;
    *)             die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$BUCKET" ] || die "--bucket is required (try --help)"
command -v aws >/dev/null || die "the aws CLI is not installed"

# The CLI reads AWS_PROFILE from the environment, so --profile just sets it.
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"
export AWS_REGION="$REGION"

run() {
  if [ "$DRY_RUN" = "1" ]; then echo "  would run: $*"; else "$@"; fi
}

ACCOUNT=$(aws sts get-caller-identity --query Account --output text) \
  || die "cannot reach AWS; check your credentials"
echo "==> account $ACCOUNT, region $REGION, bucket $BUCKET"
[ "$DRY_RUN" = "1" ] && echo "    (dry run: nothing will be created)"

# 1. the bucket, private and encrypted
if aws s3api head-bucket --bucket "$BUCKET" 2>/dev/null; then
  echo "==> bucket already exists, leaving it alone"
else
  echo "==> creating the bucket"
  if [ "$REGION" = "us-east-1" ]; then
    run aws s3api create-bucket --bucket "$BUCKET" >/dev/null
  else
    run aws s3api create-bucket --bucket "$BUCKET" \
      --create-bucket-configuration "LocationConstraint=$REGION" >/dev/null
  fi
fi

echo "==> blocking every form of public access"
run aws s3api put-public-access-block --bucket "$BUCKET" \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"

echo "==> default encryption"
run aws s3api put-bucket-encryption --bucket "$BUCKET" \
  --server-side-encryption-configuration \
  '{"Rules":[{"ApplyServerSideEncryptionByDefault":{"SSEAlgorithm":"AES256"}}]}'

# 2. an origin access control. Reuse one with this bucket's name if it is already there, so
#    running this twice does not litter the account.
echo "==> origin access control"
OAC=$(aws cloudfront list-origin-access-controls \
  --query "OriginAccessControlList.Items[?Name=='$BUCKET'].Id | [0]" --output text 2>/dev/null || echo "None")
if [ "$OAC" = "None" ] || [ -z "$OAC" ]; then
  if [ "$DRY_RUN" = "1" ]; then
    echo "  would create an OAC named $BUCKET"; OAC="<new>"
  else
    OAC=$(aws cloudfront create-origin-access-control \
      --origin-access-control-config \
      "Name=$BUCKET,Description=Space Radar,SigningProtocol=sigv4,SigningBehavior=always,OriginAccessControlOriginType=s3" \
      --query 'OriginAccessControl.Id' --output text)
  fi
  echo "    created $OAC"
else
  echo "    reusing $OAC"
fi

# 3. the distribution. Managed-CachingOptimized honours the Cache-Control headers deploy.sh sets,
#    so one policy serves both the year-long assets and the no-cache app files.
echo "==> distribution"
CONFIG=$(cat <<JSON
{
  "CallerReference": "space-radar-$BUCKET-$(date -u +%Y%m%d%H%M%S)",
  "Comment": "Space Radar",
  "Enabled": true,
  "DefaultRootObject": "index.html",
  "HttpVersion": "http2and3",
  "IsIPV6Enabled": true,
  "PriceClass": "$PRICE_CLASS",
  "Origins": {
    "Quantity": 1,
    "Items": [{
      "Id": "s3-$BUCKET",
      "DomainName": "$BUCKET.s3.$REGION.amazonaws.com",
      "OriginPath": "",
      "OriginAccessControlId": "$OAC",
      "S3OriginConfig": { "OriginAccessIdentity": "" },
      "ConnectionAttempts": 3,
      "ConnectionTimeout": 10
    }]
  },
  "DefaultCacheBehavior": {
    "TargetOriginId": "s3-$BUCKET",
    "ViewerProtocolPolicy": "redirect-to-https",
    "Compress": true,
    "AllowedMethods": {
      "Quantity": 2, "Items": ["GET","HEAD"],
      "CachedMethods": { "Quantity": 2, "Items": ["GET","HEAD"] }
    },
    "CachePolicyId": "658327ea-f89d-4fab-a63d-7e88639e58f6"
  }
}
JSON
)

if [ "$DRY_RUN" = "1" ]; then
  echo "  would create a distribution for $BUCKET.s3.$REGION.amazonaws.com"
  echo "  would then allow only that distribution to read the bucket"
  exit 0
fi

OUT=$(aws cloudfront create-distribution-with-tags \
  --distribution-config-with-tags \
  "{\"DistributionConfig\": $CONFIG, \"Tags\": {\"Items\": [{\"Key\":\"project\",\"Value\":\"space-radar\"}]}}" \
  --query '{Id:Distribution.Id,Domain:Distribution.DomainName,Arn:Distribution.ARN}' --output json)
DIST_ID=$(printf '%s' "$OUT" | sed -n 's/.*"Id": *"\([^"]*\)".*/\1/p')
DOMAIN=$(printf '%s' "$OUT" | sed -n 's/.*"Domain": *"\([^"]*\)".*/\1/p')
DIST_ARN=$(printf '%s' "$OUT" | sed -n 's/.*"Arn": *"\([^"]*\)".*/\1/p')
echo "    $DIST_ID  $DOMAIN"

# 4. LAST: the bucket policy. It names the distribution's ARN, which is why it comes after the
#    distribution and not before. This one statement is what keeps the bucket private.
echo "==> bucket policy: this distribution and nothing else"
aws s3api put-bucket-policy --bucket "$BUCKET" --policy "$(cat <<JSON
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "AllowCloudFrontServicePrincipalReadOnly",
    "Effect": "Allow",
    "Principal": { "Service": "cloudfront.amazonaws.com" },
    "Action": "s3:GetObject",
    "Resource": "arn:aws:s3:::$BUCKET/*",
    "Condition": { "StringEquals": { "AWS:SourceArn": "$DIST_ARN" } }
  }]
}
JSON
)"

PUBLIC=$(aws s3api get-bucket-policy-status --bucket "$BUCKET" --query 'PolicyStatus.IsPublic' --output text)
[ "$PUBLIC" = "False" ] || die "the bucket policy reads as public; stop and check it"

cat <<DONE

==> done. The bucket is private; only the distribution can read it.

    distribution  $DIST_ID
    url           https://$DOMAIN

    It takes a few minutes to reach every edge. Then:

      ./scripts/deploy.sh --bucket $BUCKET --region $REGION --distribution $DIST_ID
DONE
