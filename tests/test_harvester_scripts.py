#!/usr/bin/env python3
"""The harvester scripts, under --dry-run, against an `aws` that records every call and writes nothing.

Spec 0003 amendment 1 s.6: the scripts are written here and proven with --dry-run; applying them is
the owner's command. So the property worth a test is exactly the one a reader cannot see from the
code: that a dry run performs ONLY reads (and the right ones), that the plan it prints names the
right resources with the right permissions and nothing broader, and that teardown removes things
in an order that works. A fake `aws` on PATH logs `$*` and answers the read verbs from fixtures;
any other verb is a test failure, because it means a "dry" run tried to change an account.

Also here, because it is the same fake and the same risk: deploy.sh's `data/` sync excludes
`v1/*`, so a site deploy does not delete the harvester's snapshots; the packaging script is
deterministic and says PLACEHOLDER out loud; and the placeholder handler writes the heartbeat
manifest with the Cache-Control the architecture table promises.

Run: python3 tests/test_harvester_scripts.py
"""

from __future__ import annotations

import hashlib
import importlib.util
import json
import os
import re
import shutil
import stat
import subprocess
import sys
import tempfile
import types
import zipfile
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
FIXTURES = ROOT / "tests" / "fixtures"

# The only thing a dry run may do to an account is ask it questions.
READ_ONLY = re.compile(r"^(sts get-caller-identity|s3api head-bucket|[a-z0-9]+ (get|describe|list)-[a-z0-9-]+)$")

FAKE_AWS = r'''#!/usr/bin/env bash
# A fake `aws` for tests. Logs "<service> <verb> <args>" and answers the read verbs from fixtures.
# FAKE_STATE=absent: none of the harvester's resources exist. FAKE_STATE=present: all of them do.
printf '%s\n' "$*" >> "$FAKE_LOG"
# The harvester scripts put --region first; deploy.sh puts it after the verb. Either way it is
# not the service.
while [ "$1" = "--region" ]; do shift 2; done
service="$1"; verb="$2"; shift 2 || true
has() { case " $* " in *" $1 "*) return 0 ;; *) return 1 ;; esac; }
case "$service $verb" in
  "sts get-caller-identity") echo 123456789012 ;;
  "s3api head-bucket") exit 0 ;;
  "iam get-role"|"lambda get-function"|"events describe-rule")
      [ "$FAKE_STATE" = present ] && { echo '{}'; exit 0; }
      echo "An error occurred (NotFound)" >&2; exit 254 ;;
  "lambda get-policy")
      [ "$FAKE_STATE" = present ] && { echo '{"Statement":[{"Sid":"eventbridge-space-radar-harvester"}]}'; exit 0; }
      echo "An error occurred (ResourceNotFoundException)" >&2; exit 254 ;;
  "logs describe-log-groups")
      [ "$FAKE_STATE" = present ] && echo "/aws/lambda/space-radar-harvester" || echo "" ;;
  "cloudfront get-distribution-config") cat "$FAKE_FIXTURES/cloudfront-distribution.json" ;;
  "cloudfront get-cache-policy") cat "$FAKE_FIXTURES/cloudfront-cache-policy.json" ;;
  "cloudfront get-distribution") echo "example.cloudfront.net" ;;
  "lambda get-function-configuration")
      case "$*" in *HARVEST_BUCKET*) echo example-bucket ;; *HARVEST_PREFIX*) echo data/v1 ;; *) echo '{}' ;; esac ;;
  "s3 sync") has --dryrun "$@" || { echo "fake aws: s3 sync without --dryrun" >&2; exit 97; } ;;
  *) echo "fake aws: a dry run tried to run: $service $verb $*" >&2; exit 97 ;;
esac
'''


class Fake:
    """A PATH with our `aws` first, a log to read back, and a state for the existence checks."""

    def __init__(self, tmp: Path, state: str = "absent") -> None:
        self.bin = tmp / "bin"
        self.bin.mkdir(exist_ok=True)
        aws = self.bin / "aws"
        aws.write_text(FAKE_AWS, encoding="utf-8")
        aws.chmod(aws.stat().st_mode | stat.S_IXUSR | stat.S_IXGRP | stat.S_IXOTH)
        self.log = tmp / f"aws-{state}.log"
        self.state = state

    def run(self, *cmd: str, cwd: Path = ROOT) -> subprocess.CompletedProcess:
        if self.log.exists():
            self.log.unlink()
        env = dict(os.environ, PATH=f"{self.bin}:{os.environ['PATH']}",
                   FAKE_LOG=str(self.log), FAKE_STATE=self.state, FAKE_FIXTURES=str(FIXTURES))
        # Never let a real profile or region leak into what the scripts print.
        for k in ("AWS_PROFILE", "AWS_DEFAULT_REGION", "AWS_REGION"):
            env.pop(k, None)
        return subprocess.run(list(cmd), cwd=cwd, env=env, capture_output=True, text=True)

    def calls(self) -> list[str]:
        if not self.log.exists():
            return []
        return [ln for ln in self.log.read_text(encoding="utf-8").splitlines() if ln.strip()]

    def verbs(self) -> list[str]:
        """`<service> <verb>` per call, wherever --region sits."""
        out = []
        for call in self.calls():
            toks = call.split()
            while toks[:1] == ["--region"]:
                toks = toks[2:]
            out.append(" ".join(toks[:2]))
        return out


def fail(msg: str, proc: subprocess.CompletedProcess | None = None) -> int:
    print(f"FAIL: {msg}")
    if proc is not None:
        print("--- stdout ---\n" + proc.stdout[-4000:])
        print("--- stderr ---\n" + proc.stderr[-2000:])
    return 1


def would_run(stdout: str) -> list[str]:
    """The plan: every `would run:` line, joined with its continuation lines (JSON documents).

    A `==>` header or a blank line closes the entry, so the CloudFront block -- which is printed
    under its own header and is EMIT ONLY -- is never mistaken for something the script would run.
    """
    out: list[str] = []
    open_entry = False
    for line in stdout.splitlines():
        if line.startswith("  would run: "):
            out.append(line[len("  would run: "):])
            open_entry = True
        elif line.startswith("==>") or not line.strip():
            open_entry = False
        elif open_entry and line[:1] in (" ", "{", "}"):
            out[-1] += "\n" + line
    return out


def check_reads_only(fake: Fake, expected: set[str], region: str = "eu-north-1") -> str | None:
    verbs = fake.verbs()
    bad = [v for v in verbs if not READ_ONLY.match(v)]
    if bad:
        return f"a dry run performed non-read calls: {bad}"
    if set(verbs) != expected:
        return f"dry run read {sorted(set(verbs))}, expected exactly {sorted(expected)}"
    without_region = [c for c in fake.calls() if f"--region {region}" not in c]
    if without_region:
        return f"calls without --region {region}: {without_region}"
    return None


# ---------------------------------------------------------------------------------------------
def test_provision_dry_run(tmp: Path) -> int:
    fake = Fake(tmp, "absent")
    proc = fake.run("scripts/provision-harvester.sh", "--bucket", "example-bucket",
                    "--distribution", "EXAMPLE1234567", "--dry-run")
    if proc.returncode != 0:
        return fail("provision --dry-run exited non-zero", proc)
    err = check_reads_only(fake, {
        "sts get-caller-identity", "s3api head-bucket", "iam get-role", "lambda get-function",
        "events describe-rule", "logs describe-log-groups", "lambda get-policy",
        "cloudfront get-distribution-config", "cloudfront get-cache-policy",
    })
    if err:
        return fail(f"provision: {err}", proc)

    plan = would_run(proc.stdout)
    joined = "\n".join(plan)
    # Every write the plan promises, in order. Log group first (retention from the first line),
    # role before function, rule -> permission -> target.
    order = [
        "aws --region eu-north-1 logs create-log-group --log-group-name /aws/lambda/space-radar-harvester",
        "logs put-retention-policy --log-group-name /aws/lambda/space-radar-harvester --retention-in-days 14",
        "iam create-role --role-name space-radar-harvester",
        "iam put-role-policy --role-name space-radar-harvester --policy-name space-radar-harvester",
        "lambda create-function --function-name space-radar-harvester",
        "lambda wait function-active-v2 --function-name space-radar-harvester",
        "events put-rule --name space-radar-harvester --schedule-expression rate(30 minutes) --state ENABLED",
        "lambda add-permission --function-name space-radar-harvester --statement-id eventbridge-space-radar-harvester "
        "--action lambda:InvokeFunction --principal events.amazonaws.com "
        "--source-arn arn:aws:events:eu-north-1:123456789012:rule/space-radar-harvester",
        "events put-targets --rule space-radar-harvester --targets "
        "Id=space-radar-harvester,Arn=arn:aws:lambda:eu-north-1:123456789012:function:space-radar-harvester",
    ]
    pos = -1
    for needle in order:
        at = joined.find(needle)
        if at < 0:
            return fail(f"provision plan lacks: {needle}", proc)
        if at < pos:
            return fail(f"provision plan has `{needle}` out of order", proc)
        pos = at

    create = next(p for p in plan if "lambda create-function" in p)
    for flag in ("--runtime python3.12", "--architectures arm64", "--memory-size 512", "--timeout 120",
                 "--handler harvest.lambda_handler.handler",
                 "--role arn:aws:iam::123456789012:role/space-radar-harvester",
                 '"HARVEST_BUCKET":"example-bucket"', '"HARVEST_PREFIX":"data/v1"'):
        if flag not in create:
            return fail(f"create-function lacks {flag}", proc)

    trust = json.loads(next(p for p in plan if "iam create-role" in p)
                       .split("--assume-role-policy-document ", 1)[1].rsplit(" --tags", 1)[0])
    stmt = trust["Statement"][0]
    if stmt["Principal"] != {"Service": "lambda.amazonaws.com"} or stmt["Action"] != "sts:AssumeRole":
        return fail(f"trust policy is not Lambda-only: {stmt}", proc)
    if stmt["Condition"]["ArnLike"]["aws:SourceArn"] != \
            "arn:aws:lambda:eu-north-1:123456789012:function:space-radar-harvester":
        return fail("trust policy does not pin the one function", proc)

    policy = json.loads(next(p for p in plan if "iam put-role-policy" in p).split("--policy-document ", 1)[1])
    actions = sorted({a for s in policy["Statement"] for a in ([s["Action"]] if isinstance(s["Action"], str) else s["Action"])})
    if actions != ["logs:CreateLogGroup", "logs:CreateLogStream", "logs:PutLogEvents",
                   "s3:GetObject", "s3:ListBucket", "s3:PutObject"]:
        return fail(f"the role's actions are not the six least-privilege ones: {actions}", proc)
    by_sid = {s["Sid"]: s for s in policy["Statement"]}
    if by_sid["ReadWriteSnapshotsOnly"]["Resource"] != "arn:aws:s3:::example-bucket/data/v1/*":
        return fail("PutObject/GetObject are not scoped to data/v1/*", proc)
    lst = by_sid["ListSnapshotsOnly"]
    if lst["Resource"] != "arn:aws:s3:::example-bucket" or \
            lst["Condition"] != {"StringLike": {"s3:prefix": ["data/v1/*"]}}:
        return fail(f"ListBucket is not conditioned on the prefix: {lst}", proc)
    if by_sid["OwnLogGroupOnly"]["Resource"] != [
            "arn:aws:logs:eu-north-1:123456789012:log-group:/aws/lambda/space-radar-harvester",
            "arn:aws:logs:eu-north-1:123456789012:log-group:/aws/lambda/space-radar-harvester:*"]:
        return fail("the log permission is not scoped to its own group", proc)
    # (IAM actions are excluded by the exact six-action list above; `iam:` itself is in every role ARN.)
    for forbidden in ("DeleteObject", "cloudfront:", "s3:*", '"Resource": "*"', '"Resource":"*"'):
        if forbidden in joined:
            return fail(f"the plan grants or does {forbidden}", proc)
    if any(" delete-" in p or " update-distribution" in p or " create-cache-policy" in p for p in plan):
        return fail("a create plan would delete something or touch CloudFront", proc)

    # The CloudFront measurement is reported, and the fix is emitted, never planned.
    for line in ("is served by the DEFAULT behaviour", "MinTTL 1 s   DefaultTTL 86400 s   MaxTTL 31536000 s",
                 "origin headers  honoured", "EMIT ONLY", "aws cloudfront create-cache-policy",
                 "aws cloudfront update-distribution --id EXAMPLE1234567"):
        if line not in proc.stdout:
            return fail(f"provision did not report the CloudFront measurement: {line}", proc)
    print("PASS: provision --dry-run reads nine facts, writes nothing, and plans least privilege")
    return 0


def test_provision_idempotent(tmp: Path) -> int:
    fake = Fake(tmp, "present")
    proc = fake.run("scripts/provision-harvester.sh", "--bucket", "example-bucket",
                    "--distribution", "EXAMPLE1234567", "--dry-run")
    if proc.returncode != 0:
        return fail("provision --dry-run (everything exists) exited non-zero", proc)
    err = check_reads_only(fake, {
        "sts get-caller-identity", "s3api head-bucket", "iam get-role", "lambda get-function",
        "events describe-rule", "logs describe-log-groups", "lambda get-policy",
        "cloudfront get-distribution-config", "cloudfront get-cache-policy",
    })
    if err:
        return fail(f"provision (present): {err}", proc)
    plan = "\n".join(would_run(proc.stdout))
    for absent in ("create-role", "create-function", "create-log-group", "add-permission"):
        if absent in plan:
            return fail(f"a second run would {absent} again", proc)
    for present in ("update-assume-role-policy", "put-role-policy", "update-function-configuration",
                    "put-retention-policy", "put-rule", "put-targets"):
        if present not in plan:
            return fail(f"a second run does not converge with {present}", proc)
    print("PASS: provision --dry-run on an existing harvester converges instead of re-creating")
    return 0


def test_teardown_dry_run(tmp: Path) -> int:
    fake = Fake(tmp, "present")
    proc = fake.run("scripts/provision-harvester.sh", "--bucket", "example-bucket",
                    "--distribution", "EXAMPLE1234567", "--dry-run", "--teardown")
    if proc.returncode != 0:
        return fail("provision --teardown --dry-run exited non-zero", proc)
    err = check_reads_only(fake, {
        "sts get-caller-identity", "s3api head-bucket", "iam get-role", "lambda get-function",
        "events describe-rule", "logs describe-log-groups",
    })
    if err:
        return fail(f"teardown: {err}", proc)
    plan = would_run(proc.stdout)
    verbs = [" ".join(p.split()[3:5]) for p in plan]
    if verbs != ["events remove-targets", "events delete-rule", "lambda delete-function",
                 "iam delete-role-policy", "iam delete-role", "logs delete-log-group"]:
        return fail(f"teardown order is wrong: {verbs}", proc)
    if any(" s3 " in p or " s3api " in p or "cloudfront" in p for p in plan):
        return fail("teardown would touch the bucket or the distribution", proc)
    # Nothing exists: teardown says so and plans nothing.
    quiet = Fake(tmp, "absent")
    proc = quiet.run("scripts/provision-harvester.sh", "--bucket", "example-bucket",
                     "--distribution", "EXAMPLE1234567", "--dry-run", "--teardown")
    if proc.returncode != 0 or would_run(proc.stdout) or "nothing to remove" not in proc.stdout:
        return fail("teardown of nothing should plan nothing and say so", proc)
    print("PASS: teardown --dry-run removes six things in the right order and never the bucket")
    return 0


def test_provision_refuses(tmp: Path) -> int:
    fake = Fake(tmp, "absent")
    cases = [
        (["--bucket", "example-bucket", "--dry-run"], "--distribution is required"),
        (["--bucket", "example-bucket", "--distribution", "EXAMPLE1234567", "--schedule", "every 30 min",
          "--dry-run"], "--schedule must be"),
        (["--bucket", "Example_Bucket", "--distribution", "EXAMPLE1234567", "--dry-run"], "not a bucket name"),
        (["--bucket", "example-bucket", "--distribution", "nope", "--dry-run"], "does not look like an id"),
    ]
    for args, message in cases:
        proc = fake.run("scripts/provision-harvester.sh", *args)
        if proc.returncode == 0 or message not in proc.stderr:
            return fail(f"provision accepted {args}; wanted `{message}`", proc)
        if fake.calls():
            return fail(f"provision called aws before refusing {args}", proc)
    print("PASS: provision refuses bad arguments before it asks AWS anything")
    return 0


def test_deploy_dry_run(tmp: Path) -> int:
    fake = Fake(tmp, "present")
    proc = fake.run("scripts/deploy-harvester.sh", "--function", "space-radar-harvester", "--dry-run")
    if proc.returncode != 0:
        return fail("deploy-harvester --dry-run exited non-zero", proc)
    err = check_reads_only(fake, {"lambda get-function-configuration"})
    if err:
        return fail(f"deploy: {err}", proc)
    plan = would_run(proc.stdout)
    verbs = [" ".join(p.split()[3:5]) for p in plan]
    if verbs != ["lambda update-function-code", "lambda wait", "lambda invoke", "s3api head-object", "s3 cp"]:
        return fail(f"deploy plan is {verbs}", proc)
    joined = "\n".join(plan)
    for needle in ("--zip-file fileb://", "--cli-read-timeout 180",
                   "s3 cp s3://example-bucket/data/v1/index.json -"):
        if needle not in joined:
            return fail(f"deploy plan lacks {needle}", proc)
    print("PASS: deploy-harvester --dry-run reads the bucket from the function and plans code, invoke, read-back")
    return 0


def test_site_deploy_keeps_snapshots(tmp: Path) -> int:
    fake = Fake(tmp, "present")
    proc = fake.run("scripts/deploy.sh", "--bucket", "example-bucket", "--assets-only", "--dry-run")
    if proc.returncode != 0:
        return fail("deploy.sh --dry-run exited non-zero", proc)
    data = [c for c in fake.calls() if c.startswith("s3 sync") and "s3://example-bucket/data" in c]
    if len(data) != 1:
        return fail(f"expected one data/ sync, saw {data}", proc)
    if "--delete" in data[0] and "--exclude v1/*" not in data[0]:
        return fail("deploy.sh syncs data/ with --delete and would remove the harvester's data/v1/*", proc)
    print("PASS: deploy.sh's data/ sync excludes v1/*, so a site deploy keeps the snapshots")
    return 0


def test_package(tmp: Path) -> int:
    # A tree with no harvest/ -- whatever the real repo has by now -- so the placeholder path is
    # exercised; then the same tree with a stub harvest/ for the real path.
    tree = tmp / "tree"
    shutil.copytree(ROOT / "scripts", tree / "scripts")
    shutil.copytree(ROOT / "registry", tree / "registry")
    # The generator inlines harvest/lists/horizons-ids.yaml into sources.json, so the tree
    # needs the list even when it has no harvest/ package (the placeholder case).
    if (ROOT / "harvest" / "lists").is_dir():
        shutil.copytree(ROOT / "harvest" / "lists", tree / "harvest" / "lists")
    fake = Fake(tmp, "absent")

    proc = fake.run(str(tree / "scripts/package-harvester.sh"), "--out", str(tmp / "dry.zip"), "--dry-run", cwd=tree)
    if proc.returncode != 0 or (tmp / "dry.zip").exists() or fake.calls():
        return fail("package --dry-run wrote a zip or called aws", proc)
    if "PLACEHOLDER" not in proc.stdout:
        return fail("package --dry-run did not say it would ship the placeholder", proc)

    digests = []
    for i in (1, 2):
        out = tmp / f"h{i}.zip"
        proc = fake.run(str(tree / "scripts/package-harvester.sh"), "--out", str(out), cwd=tree)
        if proc.returncode != 0:
            return fail(f"package run {i} failed", proc)
        if "PLACEHOLDER" not in proc.stdout:
            return fail("package did not say PLACEHOLDER out loud", proc)
        if fake.calls():
            return fail("package called aws", proc)
        digests.append(hashlib.sha256(out.read_bytes()).hexdigest())
    if digests[0] != digests[1]:
        return fail(f"two packagings differ: {digests}")

    with zipfile.ZipFile(tmp / "h1.zip") as z:
        names = z.namelist()
        if names != ["harvest/__init__.py", "harvest/lambda_handler.py", "harvest/sources.json"]:
            return fail(f"placeholder zip holds {names}")
        if any(info.date_time != (1980, 1, 1, 0, 0, 0) for info in z.infolist()):
            return fail("zip entries carry real mtimes; the hash would change on every build")
        mirror = json.loads(z.read("harvest/sources.json"))
        handler_src = z.read("harvest/lambda_handler.py")
    registry = yaml.safe_load((ROOT / "registry/sources.yaml").read_text(encoding="utf-8"))
    if [r["id"] for r in mirror["sources"]] != [r["id"] for r in registry["sources"]]:
        return fail("harvest/sources.json does not mirror registry/sources.yaml row for row")
    if handler_src != (ROOT / "scripts/_harvester_placeholder.py").read_bytes():
        return fail("the placeholder in the zip is not scripts/_harvester_placeholder.py")

    # The real path: a stub package. Its sources.json must be regenerated, its caches left out.
    real = tree / "harvest"
    real.mkdir()
    (real / "__init__.py").write_text("")
    (real / "lambda_handler.py").write_text("def handler(event, context):\n    return 'real'\n")
    (real / "sources.json").write_text("stale\n")
    (real / "__pycache__").mkdir()
    (real / "__pycache__" / "x.pyc").write_bytes(b"\x00")
    proc = fake.run(str(tree / "scripts/package-harvester.sh"), "--out", str(tmp / "real.zip"), cwd=tree)
    if proc.returncode != 0 or "PLACEHOLDER" in proc.stdout:
        return fail("package with harvest/ present failed or claimed a placeholder", proc)
    with zipfile.ZipFile(tmp / "real.zip") as z:
        if z.namelist() != ["harvest/__init__.py", "harvest/lambda_handler.py", "harvest/sources.json"]:
            return fail(f"real zip holds {z.namelist()}")
        if z.read("harvest/sources.json") == b"stale\n":
            return fail("a stale checked-in sources.json was shipped instead of the registry")
        if b"real" not in z.read("harvest/lambda_handler.py"):
            return fail("the real handler was replaced")
    # A harvest/ without the entry point is refused, not papered over with the placeholder.
    (real / "lambda_handler.py").unlink()
    proc = fake.run(str(tree / "scripts/package-harvester.sh"), "--out", str(tmp / "bad.zip"), cwd=tree)
    if proc.returncode == 0 or "harvest.lambda_handler.handler" not in proc.stderr:
        return fail("package accepted a harvest/ with no lambda_handler.py", proc)
    print(f"PASS: package is deterministic (sha256 {digests[0][:12]}...), says PLACEHOLDER, mirrors the registry")
    return 0


def test_placeholder_handler(tmp: Path) -> int:
    """The heartbeat manifest, the key, the headers -- with boto3 replaced by a recorder."""
    calls: list[dict] = []

    class Client:
        def put_object(self, **kw):
            calls.append(kw)

    boto3 = types.ModuleType("boto3")
    boto3.client = lambda name: Client() if name == "s3" else None  # type: ignore[attr-defined]
    sys.modules["boto3"] = boto3
    spec = importlib.util.spec_from_file_location("placeholder", ROOT / "scripts/_harvester_placeholder.py")
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)  # type: ignore[union-attr]
    os.environ["HARVEST_BUCKET"] = "example-bucket"
    os.environ["HARVEST_PREFIX"] = "data/v1"
    result = mod.handler({}, None)
    if len(calls) != 1:
        return fail(f"placeholder made {len(calls)} S3 calls, wanted one PutObject")
    put = calls[0]
    if put["Bucket"] != "example-bucket" or put["Key"] != "data/v1/index.json":
        return fail(f"placeholder wrote to {put['Bucket']}/{put['Key']}")
    if put["CacheControl"] != "public, max-age=60, s-maxage=300, stale-while-revalidate=600":
        return fail(f"placeholder Cache-Control is {put['CacheControl']}")
    if put["ContentType"] != "application/json":
        return fail(f"placeholder Content-Type is {put['ContentType']}")
    body = json.loads(put["Body"])
    if body["schema"] != 1 or body["run"] != {"runner": "lambda", "placeholder": True} or body["snapshots"] != {}:
        return fail(f"placeholder manifest is not the heartbeat shape: {body}")
    if not re.match(r"^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$", body["generated_at"]):
        return fail(f"generated_at is not ISO-8601 UTC: {body['generated_at']}")
    if result.get("placeholder") is not True:
        return fail(f"the handler's return does not admit it is a placeholder: {result}")
    print("PASS: the placeholder writes the heartbeat index.json with the promised Cache-Control")
    return 0


def test_cf_render_config(tmp: Path) -> int:
    proc = subprocess.run(
        [sys.executable, "scripts/_cf_data_behaviour.py", "--render-config", "NEWPOLICY123"],
        cwd=ROOT, input=(FIXTURES / "cloudfront-distribution.json").read_text(), capture_output=True, text=True)
    if proc.returncode != 0:
        return fail("--render-config failed", proc)
    cfg = json.loads(proc.stdout)
    items = cfg["CacheBehaviors"]["Items"]
    if cfg["CacheBehaviors"]["Quantity"] != 1 or items[0]["PathPattern"] != "data/v1/*":
        return fail(f"rendered config lacks the data/v1/* behaviour: {cfg['CacheBehaviors']}")
    b = items[0]
    if b["CachePolicyId"] != "NEWPOLICY123" or b["TargetOriginId"] != "s3-example-bucket" \
            or b["ViewerProtocolPolicy"] != "redirect-to-https" or b["Compress"] is not True:
        return fail(f"rendered behaviour is not the default one with a new policy: {b}")
    if cfg["DefaultCacheBehavior"]["CachePolicyId"] != "658327ea-f89d-4fab-a63d-7e88639e58f6":
        return fail("--render-config changed the default behaviour")
    print("PASS: --render-config adds one data/v1/* behaviour and leaves the rest of the distribution alone")
    return 0


def main() -> int:
    with tempfile.TemporaryDirectory() as tmp:
        for test in (test_provision_dry_run, test_provision_idempotent, test_teardown_dry_run,
                     test_provision_refuses, test_deploy_dry_run, test_site_deploy_keeps_snapshots,
                     test_package, test_placeholder_handler, test_cf_render_config):
            case = Path(tmp) / test.__name__
            case.mkdir()
            if test(case) != 0:
                return 1
    print("PASS: the harvester scripts only read under --dry-run, and plan exactly what they say")
    return 0


if __name__ == "__main__":
    sys.exit(main())
