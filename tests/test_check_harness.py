#!/usr/bin/env python3
"""scripts/check.sh says FAIL and exits non-zero when any check failed or did not run, on every xargs.

On 2026-10-13 on a Mac (system bash 3.2, BSD xargs, no node) the script printed FAIL for every check,
because BSD `xargs -I` turns a tab in its input into a space and the line number was fused into the
command, and then ended `PASS every check is green`: the result files it counted were never written.
A first-time contributor would have opened a pull request believing it was checked. Four cases, each
with a short CHECK_ITEMS list so the test takes seconds:
  1. a passing and a failing command: FAIL is printed, no PASS line, exit 1;
  2. commands with spaces and tabs in them pass: `ok` names the command alone, exit 0;
  3. with node off PATH, the last line does not claim every check is green and names what did not run;
  4. a command that fails is still reported when the run is wide (more items than jobs).
"""
import os
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SCRIPT = ROOT / "scripts" / "check.sh"
bad = []


def run(items, path=None):
    env = dict(os.environ, CHECK_ITEMS=items, CHECK_JOBS="4")
    env.pop("CHECK_MAX_SECONDS", None)
    if path is not None:
        env["PATH"] = path
    p = subprocess.run(["bash", str(SCRIPT)], cwd=ROOT, env=env, capture_output=True, text=True, timeout=120)
    return p.returncode, p.stdout + p.stderr


code, out = run("true\nfalse")
if code == 0 or "FAIL false" not in out or "PASS" in out:
    bad.append(f"a failing check must print FAIL, no PASS and exit 1; got exit {code}:\n{out}")

code, out = run("python3 -c pass\npython3 -c 'pass'\ttrue")
if code != 0 or "ok   python3 -c pass\n" not in out:
    bad.append(f"commands with spaces must run and pass; got exit {code}:\n{out}")
if "No such file" in out:
    bad.append(f"the script failed to write its own result files:\n{out}")

nodeless = tempfile.mkdtemp()
try:
    for tool in ("bash", "sh", "python3", "awk", "xargs", "sed", "mktemp", "date", "tail", "head", "tr", "wc",
                 "cat", "rm", "ls", "sort", "getconf", "sysctl", "dirname", "true", "false", "env"):
        found = shutil.which(tool)
        if found:
            os.symlink(found, os.path.join(nodeless, tool))
    code, out = run("true", path=nodeless)
    last = out.strip().splitlines()[-1] if out.strip() else ""
    if "every check is green" in last or "did not run" not in last:
        bad.append(f"without node the last line must say the node checks did not run; got: {last!r}")
finally:
    shutil.rmtree(nodeless)

code, out = run("\n".join(["true"] * 20 + ["false"] + ["true"] * 20))
if code == 0 or "FAIL false" not in out or "PASS" in out:
    bad.append(f"one failure among many must still fail the run; got exit {code}:\n{out}")

if bad:
    print("FAIL scripts/check.sh reports wrongly:\n\n" + "\n\n".join(bad))
    sys.exit(1)
print("ok   scripts/check.sh fails on a failed check and says what it did not run")
