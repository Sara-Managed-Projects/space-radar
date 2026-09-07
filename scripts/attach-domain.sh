#!/usr/bin/env bash
#
# Put a custom domain in front of the CloudFront distribution.
#
#   ./scripts/attach-domain.sh --distribution E1ABCDEF23456 \
#                              --domain spaceradar.ai --domain www.spaceradar.ai
#
# Options:
#   --distribution ID   required.
#   --domain NAME       required, repeatable. Every name must be covered by the certificate.
#   --certificate ARN   the ACM certificate. If omitted, the script looks for an ISSUED one in
#                       us-east-1 covering the first --domain.
#   --profile NAME      an AWS CLI profile.
#   --dry-run           show what would change and change nothing.
#
# ORDER OF OPERATIONS, WHICH IS THE WHOLE DIFFICULTY
#   1. Request the certificate IN us-east-1. CloudFront reads certificates from that region only,
#      whatever region the bucket is in. (`aws acm request-certificate --region us-east-1`.)
#   2. Add the CNAME records ACM asks for at your DNS host, and wait for ISSUED.
#   3. Run this script. It attaches the names and the certificate to the distribution.
#   4. THEN point the domain at the distribution. Not before: CloudFront rejects an alias whose
#      certificate is not yet issued, and DNS pointed at a distribution that does not claim the
#      name gets a 403 from CloudFront.
#
# THE APEX PROBLEM, WHICH BITES EVERYONE ONCE
#   A bare domain (spaceradar.ai) cannot be a CNAME -- the DNS specification forbids it alongside
#   the SOA and NS records every zone must have. CloudFront has no fixed IP to put in an A record.
#   So one of:
#     * Route 53: an ALIAS record at the apex. The only clean answer, about $0.50/month for the
#       zone, and it means moving nameservers.
#     * A provider with CNAME flattening (Cloudflare, and some others) at the apex.
#     * Keep the apex on your host's forwarding to www, and CNAME www to the distribution. Costs
#       nothing, works today, and the address people share is the www one.
#   The script prints the right instruction for whichever names you attached.

set -euo pipefail

DIST=""
CERT=""
PROFILE=""
DRY_RUN=0
DOMAINS=()

die() { echo "error: $*" >&2; exit 1; }
usage() { sed -n '2,38p' "$0" | sed 's/^# \{0,1\}//'; exit "${1:-0}"; }

while [ $# -gt 0 ]; do
  case "$1" in
    --distribution) DIST="${2:?}"; shift 2 ;;
    --domain)       DOMAINS+=("${2:?}"); shift 2 ;;
    --certificate)  CERT="${2:?}"; shift 2 ;;
    --profile)      PROFILE="${2:?}"; shift 2 ;;
    --dry-run)      DRY_RUN=1; shift ;;
    -h|--help)      usage 0 ;;
    *)              die "unknown option: $1 (try --help)" ;;
  esac
done

[ -n "$DIST" ] || die "--distribution is required"
[ "${#DOMAINS[@]}" -gt 0 ] || die "at least one --domain is required"
[ -n "$PROFILE" ] && export AWS_PROFILE="$PROFILE"

# 1. find the certificate, and refuse to go on unless it is ISSUED
if [ -z "$CERT" ]; then
  echo "==> looking for an issued certificate covering ${DOMAINS[0]}"
  CERT=$(aws acm list-certificates --region us-east-1 \
    --certificate-statuses ISSUED \
    --query "CertificateSummaryList[?DomainName=='${DOMAINS[0]}'].CertificateArn | [0]" \
    --output text)
  [ "$CERT" != "None" ] && [ -n "$CERT" ] || die "no ISSUED certificate for ${DOMAINS[0]} in us-east-1.
  Request one:
    aws acm request-certificate --region us-east-1 --domain-name ${DOMAINS[0]} \\
      --subject-alternative-names www.${DOMAINS[0]} --validation-method DNS
  then add the CNAME records it asks for and wait."
fi

STATUS=$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" \
  --query 'Certificate.Status' --output text)
[ "$STATUS" = "ISSUED" ] || die "certificate is $STATUS, not ISSUED.
  Its validation records:
    aws acm describe-certificate --region us-east-1 --certificate-arn $CERT \\
      --query 'Certificate.DomainValidationOptions[].ResourceRecord'"
echo "==> certificate $STATUS"

# every requested name must actually be on the certificate, or CloudFront rejects the whole update
# ACM already lists the primary domain inside SubjectAlternativeNames, so no concatenation is
# needed -- and JMESPath has no `+` for lists anyway, which is how this was wrong the first time.
COVERED=$(aws acm describe-certificate --region us-east-1 --certificate-arn "$CERT" \
  --query 'join(`,`, Certificate.SubjectAlternativeNames)' --output text)
for d in "${DOMAINS[@]}"; do
  case ",$COVERED," in
    *",$d,"*) ;;
    *) die "$d is not on the certificate (it covers: $COVERED)" ;;
  esac
done
echo "==> certificate covers every requested name"

# 2. read the live config, change only the two things we mean to change
TMP=$(mktemp -d); trap 'rm -rf "$TMP"' EXIT
aws cloudfront get-distribution-config --id "$DIST" > "$TMP/current.json"
ETAG=$(python3 -c "import json;print(json.load(open('$TMP/current.json'))['ETag'])")

python3 - "$TMP/current.json" "$TMP/new.json" "$CERT" "${DOMAINS[@]}" <<'PY'
import json, sys
src, dst, cert, *domains = sys.argv[1:]
cfg = json.load(open(src))["DistributionConfig"]
cfg["Aliases"] = {"Quantity": len(domains), "Items": domains}
# sni-only: a dedicated IP costs $600/month and nothing here needs one.
cfg["ViewerCertificate"] = {
    "ACMCertificateArn": cert,
    "SSLSupportMethod": "sni-only",
    "MinimumProtocolVersion": "TLSv1.2_2021",
    "Certificate": cert,
    "CertificateSource": "acm",
}
json.dump(cfg, open(dst, "w"))
print(f"  aliases -> {', '.join(domains)}")
PY

if [ "$DRY_RUN" = "1" ]; then
  echo "==> dry run: the distribution was not touched"
  exit 0
fi

echo "==> updating the distribution"
aws cloudfront update-distribution --id "$DIST" \
  --distribution-config "file://$TMP/new.json" --if-match "$ETAG" \
  --query 'Distribution.Status' --output text

DOMAIN=$(aws cloudfront get-distribution --id "$DIST" --query 'Distribution.DomainName' --output text)

cat <<DONE

==> attached. It takes a few minutes to reach every edge.

    Now point DNS at: $DOMAIN

DONE

for d in "${DOMAINS[@]}"; do
  # A name with a dot in the label position is a subdomain; anything else is an apex.
  if [ "$(echo "$d" | awk -F. '{print NF}')" -gt 2 ]; then
    printf '    %-26s CNAME  ->  %s\n' "$d" "$DOMAIN"
  else
    printf '    %-26s cannot be a CNAME (apex). Use ONE of:\n' "$d"
    printf '      %-24s Route 53 ALIAS -> %s\n' '' "$DOMAIN"
    printf '      %-24s your host CNAME-flattening at the apex\n' ''
    printf '      %-24s your host forwarding the apex to www\n' ''
  fi
done
echo
