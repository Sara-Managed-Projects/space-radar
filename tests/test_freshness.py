#!/usr/bin/env python3
"""The rule that says "the live site is behind" (scripts/freshness.py; public #291).

    python3 tests/test_freshness.py

No network: the two documents are written here as the site serves them. Held:
  fresh                       the deployed commit is main's head, every dataset inside its window
  a merge an hour ago         behind by commits, not yet by a day: not an alarm
  30 hours behind             the alarm, with the count and the hours in words
  one dataset stale           named; a dataset a few hours past is "due", not an alarm
  build.json unreadable       missing, a 404 page saved as a file, or a file naming no commit
  a switched-off dataset      `status: skipped` is ignored however old
  the index unreadable        an alarm of its own
  the workflow                reads public addresses only, holds no secret, opens ONE issue
"""
from __future__ import annotations

import json
import re
import subprocess
import sys
import tempfile
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import freshness  # noqa: E402

failed = 0


def ok(cond: bool, msg: str) -> None:
    global failed
    if not cond:
        failed += 1
        print(f"FAIL: {msg}")


NOW = datetime(2026, 10, 12, 12, 0, 0, tzinfo=timezone.utc)
HEAD = "a" * 40
OLD = "b" * 40


def z(hours_ago: float) -> str:
    return (NOW - timedelta(hours=hours_ago)).strftime("%Y-%m-%dT%H:%M:%SZ")


def build(commit: str = HEAD) -> dict:
    return {"schema": 1, "commit": commit, "commit_short": commit[:7], "committed_at": z(50), "built_at": z(48),
            "build": "0123456789abcdef", "files": 296, "bytes": 5_000_000, "dirty": False}


def index(**rows: dict) -> dict:
    snaps = {
        "celestrak-active": {"fetched_at": z(2), "valid_until": z(-1), "status": "ok"},
        "swpc-kp": {"fetched_at": z(1), "valid_until": z(-2), "status": "ok"},
        "esa-neocc-close": {"status": "skipped", "last_error": "switched off in registry/sources.yaml (enabled: false)"},
    }
    snaps.update(rows)
    return {"schema": 1, "generated_at": z(1), "snapshots": snaps}


def main_is(behind: int | None = 0, waiting: float | None = None) -> dict:
    return {"head": HEAD, "behind_by": behind, "waiting_since": None if waiting is None else z(waiting)}


# --- fresh ---------------------------------------------------------------------------------------
v = freshness.verdict(build(), index(), main_is(), NOW)
ok(v["fresh"] and not v["reasons"] and v["key"] == "" and v["site"]["state"] == "fresh" and v["site"]["behind_by"] == 0,
   f"the head deployed and every dataset in its window is fresh ({v['reasons']})")
ok([d["state"] for d in v["datasets"]] == ["fresh", "off", "fresh"], f"each dataset has a state, the switched-off one `off` ({v['datasets']})")

# --- behind main, but only just: not an alarm ----------------------------------------------------
v = freshness.verdict(build(OLD), index(), main_is(3, 1), NOW)
ok(v["fresh"] and v["site"]["behind_by"] == 3 and v["site"]["hours_behind"] == 1.0, f"three commits merged an hour ago are not an alarm ({v['reasons']})")
v = freshness.verdict(build(OLD), index(), main_is(3, 24), NOW)
ok(v["fresh"], "exactly 24 hours is not MORE than 24 hours")

# --- 30 hours behind -----------------------------------------------------------------------------
v = freshness.verdict(build(OLD), index(), main_is(4, 30), NOW)
ok(not v["fresh"] and v["key"] == "site:behind" and v["site"]["state"] == "behind" and len(v["reasons"]) == 1
   and "4 commits ahead" in v["reasons"][0] and "30 hours" in v["reasons"][0] and OLD[:7] in v["reasons"][0],
   f"30 hours behind main is the alarm, in words ({v['reasons']})")
# A deploy from a commit main does not have yet, with nothing of main missing: not behind.
v = freshness.verdict(build(OLD), index(), main_is(0), NOW)
ok(v["fresh"], "a deployed commit that already holds all of main is not behind")
v = freshness.verdict(build(OLD), index(), main_is(None), NOW)
ok(not v["fresh"] and v["key"] == "site:not-comparable", f"a deployed commit GitHub cannot compare with main is said, not passed ({v['reasons']})")

# --- one dataset stale ---------------------------------------------------------------------------
v = freshness.verdict(build(), index(**{"swpc-kp": {"fetched_at": z(40), "valid_until": z(30), "status": "ok"}}), main_is(), NOW)
ok(not v["fresh"] and v["key"] == "data:swpc-kp" and len(v["reasons"]) == 1 and "swpc-kp" in v["reasons"][0] and "30 hours past" in v["reasons"][0],
   f"one dataset 30 hours past its valid-until is the alarm, by name ({v['reasons']})")
v = freshness.verdict(build(), index(**{"swpc-kp": {"fetched_at": z(10), "valid_until": z(5), "status": "ok"}}), main_is(), NOW)
ok(v["fresh"] and next(d for d in v["datasets"] if d["id"] == "swpc-kp")["state"] == "due", "five hours past is due, inside the day of grace")
v = freshness.verdict(build(), index(**{"wind": {"status": "error", "last_error": "timeout"}}), main_is(), NOW)
ok(not v["fresh"] and v["key"] == "data:wind", "an enabled dataset with no saved copy at all is an alarm")

# --- a switched-off dataset is ignored -----------------------------------------------------------
v = freshness.verdict(build(), index(**{"space-track-tip": {"status": "skipped", "fetched_at": z(900), "valid_until": z(800)}}), main_is(), NOW)
ok(v["fresh"] and next(d for d in v["datasets"] if d["id"] == "space-track-tip")["state"] == "off",
   f"a switched-off dataset is ignored however old its stamps ({v['reasons']})")

# --- a name from the site cannot write a workflow output or an issue's markup ----------------------
v = freshness.verdict(build(), index(**{"x\nfresh=true\n<!--": {"status": "ok", "valid_until": z(30) + "\n|"}}), main_is(), NOW)
ok(not v["fresh"] and "\n" not in v["key"] and "<" not in v["key"] and "\n" not in freshness.summary(v).split("| x?fresh")[1].split("|")[2],
   f"a dataset name with a newline in it is rewritten before it is used ({v['key']!r})")

# --- build.json unreadable -----------------------------------------------------------------------
for what, doc in (("missing", None), ("not JSON's shape", "<html>404</html>"), ("no commit", {"schema": 1}), ("a short sha", {"commit": "abc1234"}),
                  ("something that is not a sha", {"commit": "main; rm -rf /" + "0" * 26})):
    v = freshness.verdict(doc, index(), main_is(), NOW)
    ok(not v["fresh"] and v["key"] == "build:unreadable" and v["site"]["state"] == "unreadable", f"build.json {what}: unreadable, an alarm ({v['reasons']})")
v = freshness.verdict(build(), None, main_is(), NOW)
ok(not v["fresh"] and v["key"] == "index:unreadable", "the datasets' index unreadable is an alarm of its own")

# --- several at once; the key is stable and says nothing of hours ---------------------------------
a = freshness.verdict(build(OLD), index(**{"swpc-kp": {"valid_until": z(30), "status": "ok"}}), main_is(4, 30), NOW)
b = freshness.verdict(build(OLD), index(**{"swpc-kp": {"valid_until": z(36), "status": "ok"}}), main_is(9, 36), NOW + timedelta(hours=6))
ok(a["key"] == b["key"] == "data:swpc-kp,site:behind" and len(a["reasons"]) == 2, f"the same two things wrong six hours later have the same key ({a['key']} / {b['key']})")

# --- the words ------------------------------------------------------------------------------------
text = freshness.summary(a, "https://example.org")
ok(text.startswith("## The live site is behind") and "| swpc-kp |" in text and "**stale**" in text and "switched off" in text and f"`{OLD[:7]}`" in text,
   "the summary is a table of the site and of every dataset, the stale one marked")
ok(freshness.summary(freshness.verdict(build(), index(), main_is(), NOW)).startswith("## The live site is fresh"), "and says fresh when it is")

# --- the command line, as the workflow calls it ----------------------------------------------------
with tempfile.TemporaryDirectory() as tmp:
    t = Path(tmp)
    (t / "build.json").write_text(json.dumps(build(OLD)), encoding="utf-8")
    (t / "index.json").write_text(json.dumps(index()), encoding="utf-8")
    (t / "page.json").write_text("<!doctype html><title>Not found</title>", encoding="utf-8")
    run = lambda *a: subprocess.run([sys.executable, str(ROOT / "scripts" / "freshness.py"), *a], capture_output=True, text=True)  # noqa: E731
    ok(run("--commit-of", str(t / "build.json")).stdout.strip() == OLD, "--commit-of prints the commit")
    ok(run("--commit-of", str(t / "page.json")).stdout == "" and run("--commit-of", str(t / "nothing.json")).stdout == "", "and nothing for a 404 page or no file")
    p = run("--build", str(t / "build.json"), "--index", str(t / "index.json"), "--main-head", HEAD, "--behind-by", "4", "--waiting-since", z(30),
            "--now", z(0), "--summary", str(t / "summary.md"), "--github-output", str(t / "out.txt"))
    ok(p.returncode == 0 and json.loads(p.stdout)["fresh"] is False and (t / "out.txt").read_text() == "fresh=false\nkey=site:behind\n"
       and "The live site is behind" in (t / "summary.md").read_text(), f"the command writes the verdict, the outputs and the summary ({p.stderr})")
    p = run("--build", str(t / "page.json"), "--index", str(t / "index.json"), "--main-head", HEAD, "--behind-by", "", "--now", z(0), "--github-output", str(t / "out2.txt"))
    ok(p.returncode == 0 and (t / "out2.txt").read_text() == "fresh=false\nkey=build:unreadable\n", "a 404 page saved as build.json is unreadable")
    ok(run("--build", str(t / "build.json"), "--index", str(t / "index.json"), "--main-head", "main").returncode == 2, "a head that is not a sha is refused")

# --- the workflow: public addresses, no secret, one issue ------------------------------------------
wf = (ROOT / ".github" / "workflows" / "freshness.yml").read_text(encoding="utf-8")
code = "\n".join(ln for ln in wf.splitlines() if not ln.lstrip().startswith("#"))
ok(re.search(r'cron: "\d+ \*/6 \* \* \*"', code) is not None and "workflow_dispatch:" in code, "every six hours, and by hand")
ok(re.search(r"permissions:\n\s+issues: write\n\s+contents: read\n", code) is not None and code.count("permissions:") == 1, "permissions: issues write, contents read, nothing more")
secrets = set(re.findall(r"secrets\.([A-Za-z_]+)", code))
ok(not secrets and "aws" not in code.lower() and "id-token" not in code, f"no secret and no cloud credential ({secrets})")
ok("https://www.spaceradar.ai" in code and "/build.json" in code and "/data/v1/index.json" in code, "it reads the public site's two files")
ok(f'TITLE: "{freshness.ISSUE_TITLE}"' in code and code.count("gh issue create") == 1 and code.index("gh issue list") < code.index("gh issue create"),
   "it looks for the open issue by its title before it opens one")
ok("gh issue close" in code and "gh issue comment" in code, "it comments on the same issue, and closes it when the site is fresh again")
ok("scripts/freshness.py" in code and "--commit-of" in code, "the decision is the script's, and only a commit the script vouches for goes into an API path")

if failed:
    print(f"\nfreshness: {failed} check(s) FAILED")
    sys.exit(1)
print("freshness ok: fresh, an hour behind, 30 hours behind, one dataset stale, build.json unreadable, a switched-off dataset ignored; "
      "the workflow reads public addresses only and keeps one issue")
