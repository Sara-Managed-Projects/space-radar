"""scripts/refresh-snapshots.sh publishes the last good copy when a refresh fails.

2026-09-28: CelesTrak answered this machine and the GitHub runner with 403. The harvester marked
five CelesTrak rows `status: error` (keeping their old stamps), the browser refuses an errored row,
and the publish emptied the saved satellites for every visitor CelesTrak also refuses, until the
rows were put back by hand. This runs the real script, --no-harvest, against an `aws` that copies
what it is asked to upload into a folder, and checks what the published manifest says.

    python3 tests/test_refresh_keep_good.py
"""
from __future__ import annotations

import json
import os
import stat
import subprocess
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

FAKE_AWS = r"""#!/bin/bash
# s3 sync SRC s3://.../ -> copy SRC/* to $OUT; s3 cp FILE s3://... -> copy FILE to $OUT; the rest: ok.
case "$1 $2" in
  "s3 sync") cp "$3"/*.json "$OUT"/ 2>/dev/null; exit 0 ;;
  "s3 cp") cp "$3" "$OUT"/; exit 0 ;;
  *) exit 0 ;;
esac
"""


def main() -> int:
    problems: list[str] = []
    with tempfile.TemporaryDirectory() as tmp_s:
        tmp = Path(tmp_s)
        work, out, bin_ = tmp / "work", tmp / "out", tmp / "bin"
        for p in (work, out, bin_):
            p.mkdir()
        aws = bin_ / "aws"
        aws.write_text(FAKE_AWS, encoding="utf-8")
        aws.chmod(aws.stat().st_mode | stat.S_IXUSR)
        stamp = "2026-09-23T07:29:43Z"
        rows = {
            # failed this time, but its file holds the last good data: must be published as ok
            "celestrak-stations": ({"status": "error", "fetched_at": stamp, "last_error": "upstream answered HTTP 403"},
                                   [{"OBJECT_NAME": "ISS (ZARYA)", "NORAD_CAT_ID": 25544}]),
            # failed and its file is empty: nothing to keep, stays out
            "celestrak-visual": ({"status": "error", "fetched_at": stamp, "last_error": "403"}, []),
            # a normal good row
            "swpc-kp": ({"status": "ok", "fetched_at": stamp}, [{"kp": 3}]),
        }
        index = {"schema": 1, "snapshots": {}}
        for sid, (row, body) in rows.items():
            index["snapshots"][sid] = {**row, "valid_until": stamp, "items": len(body)}
            (work / f"{sid}.json").write_text(json.dumps({"schema": 1, "source": sid, "fetched_at": stamp, "body": body}))
        (work / "index.json").write_text(json.dumps(index))
        env = {**os.environ, "PATH": f"{bin_}{os.pathsep}{os.environ['PATH']}", "OUT": str(out)}
        proc = subprocess.run(
            ["bash", "scripts/refresh-snapshots.sh", f"--work={work}", "--no-harvest", "--bucket=test-bucket"],
            cwd=ROOT, env=env, capture_output=True, text=True, timeout=120,
        )
        if proc.returncode != 0:
            print(proc.stdout, proc.stderr, sep="\n")
            problems.append(f"the script exited {proc.returncode}")
        published = out / "index.json"
        if not published.exists():
            problems.append("no manifest was uploaded")
        else:
            snaps = json.loads(published.read_text())["snapshots"]
            st = snaps.get("celestrak-stations", {})
            if st.get("status") != "ok" or st.get("fetched_at") != stamp:
                problems.append(f"a failed refresh with data on file is published as the last good copy, old stamp kept ({st})")
            if "403" not in str(st.get("kept_after", "")):
                problems.append("and the manifest says why it is the old copy")
            if snaps.get("celestrak-visual", {}).get("status") == "ok":
                problems.append("a failed refresh with an empty file is not dressed up as good")
            if snaps.get("swpc-kp", {}).get("status") != "ok":
                problems.append("a good row stays good")
        work_ix = json.loads((work / "index.json").read_text())["snapshots"]
        if work_ix["celestrak-stations"].get("status") != "error":
            problems.append("the WORK index keeps `error`, so the harvester still retries on its cadence")
    if problems:
        print("refresh keep-good FAILED:\n  " + "\n  ".join(problems))
        return 1
    print("refresh keep-good ok: a refresh that fails publishes the last good copy with its old stamp and the reason, an empty file stays out, and the work index still says error")
    return 0


if __name__ == "__main__":
    sys.exit(main())
