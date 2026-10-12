#!/usr/bin/env python3
"""The prepared cloud workflow stays minimal (spec 0052 task 2, internal #139): no schedule until the role
exists, id-token and contents:read only, and nothing written outside the site bucket's live/ prefix."""
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
text = (ROOT / ".github/workflows/clouds.yml").read_text(encoding="utf-8")
doc = yaml.safe_load(text)
bad = []


def check(cond, msg):
    print(("  ok: " if cond else "  ** ") + msg)
    if not cond:
        bad.append(msg)


triggers = doc.get(True) or doc.get("on") or {}   # PyYAML reads the key `on` as True
check(set(triggers) == {"workflow_dispatch"}, f"it runs on a dispatch only until the role exists ({sorted(triggers)})")
check(doc["permissions"] == {"id-token": "write", "contents": "read"}, "permissions are id-token: write and contents: read, nothing else")
steps = doc["jobs"]["clouds"]["steps"]
runs = "\n".join(s.get("run", "") for s in steps)
aws = [ln.strip() for ln in runs.splitlines() if re.match(r"\s*aws\b", ln)]
check(len(aws) == 1 and aws[0].startswith('aws s3 cp live/ "s3://${SITE_BUCKET}/live/"'), f"the one aws command copies live/ to the bucket's live/ prefix ({aws})")
check("cloudfront" not in text.lower().replace("no cloudfront", "") or "cloudfront" not in runs.lower(), "no step touches CloudFront (the TTL expires the files)")
check("data/v1" not in runs and "--delete" not in runs, "no step names data/v1/ or deletes with sync")
check(doc["env"]["ROLE_ARN"].endswith(":role/space-radar-clouds") and "secrets." not in text, "the role is named in the file and no secret is read")
first = steps[1]["run"] if len(steps) > 1 else ""
check("weather/clouds.py" in first and "exit 1" in first, "the first step stops the run while the job (#138) is not on the branch")
check(any("aws-actions/configure-aws-credentials" in s.get("uses", "") for s in steps), "credentials come from OIDC (configure-aws-credentials)")
check(re.search(r"^\s*#\s*schedule:", text, re.M) is not None and not re.search(r"^\s*schedule:", text, re.M), "the hourly schedule is written and commented out")
sys.exit(1 if bad else 0)
