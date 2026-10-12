#!/usr/bin/env python3
"""Is the live site behind? One decision, from what anybody can read, with no network of its own.

    python3 scripts/freshness.py --build build.json --index index.json \\
        --main-head <sha> [--behind-by N --waiting-since <UTC time>] [--now <UTC time>] \\
        [--summary FILE] [--github-output FILE]
    python3 scripts/freshness.py --commit-of build.json      # print the commit it names, or nothing

WHY (public #291, the review of 2026-10-12). Deploys and snapshot refreshes are done by hand, and
nothing said when either had not happened. .github/workflows/freshness.yml asks the PUBLIC site two
questions every six hours and hands the answers here:

    /build.json           which commit is deployed (scripts/build_info.py writes it at deploy)
    /data/v1/index.json   each saved dataset's `fetched_at` and `valid_until` (the harvester's)

and asks GitHub how far `main` has moved since that commit. This repository holds no cloud
credential by design, and this check needs none.

THE RULE (`verdict`). The site is NOT FRESH when any of these is true:

    - build.json cannot be read, or does not name a commit;
    - the deployed commit is not main's head, and the oldest commit on main that is not deployed
      has been waiting more than 24 hours (so a merge an hour ago is not an alarm, and a quiet week
      on main after a deploy is not one either);
    - the deployed commit cannot be compared with main (GitHub does not know it);
    - the index of saved datasets cannot be read;
    - an ENABLED dataset is more than 24 hours past its `valid_until`, or has no saved copy.

A dataset whose row says `status: skipped` is switched off (registry/sources.yaml `enabled: false`;
scripts/refresh-snapshots.sh publishes such a row with no stamps) and is counted in neither.

`key` names WHAT is wrong without the hours, so the workflow can tell "the same thing is still
wrong" from "something else is wrong now" and comment on the issue only for the second.

Standard library only. tests/test_freshness.py holds the rule.
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

LIMIT_HOURS = 24
SHA = re.compile(r"[0-9a-f]{40}")
ISSUE_TITLE = "The live site is behind"
STATUSES = ("ok", "not-due", "not-modified", "skipped", "refused", "error")


def when(text: object) -> datetime | None:
    """A UTC time as the two files write it ("2026-10-12T09:00:00Z"), or None."""
    if not isinstance(text, str):
        return None
    try:
        t = datetime.fromisoformat(text.strip().replace("Z", "+00:00"))
    except ValueError:
        return None
    return t if t.tzinfo else t.replace(tzinfo=timezone.utc)


def stamp(text: object) -> str | None:
    """A time from the site, rewritten by us before it is shown: never the site's own characters."""
    t = when(text)
    return t.astimezone(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ") if t else None


def hours_between(later: datetime, earlier: datetime) -> float:
    return (later - earlier).total_seconds() / 3600


def commit_of(build: object) -> str | None:
    commit = build.get("commit") if isinstance(build, dict) else None
    return commit if isinstance(commit, str) and SHA.fullmatch(commit) else None


def verdict(build: object, index: object, main: dict, now: datetime, limit_hours: float = LIMIT_HOURS) -> dict:
    """The decision. `build` and `index` are the two parsed documents, or None when unreadable.

    `main` is {"head": sha, "behind_by": commits on main that are not deployed (None when GitHub
    could not compare), "waiting_since": the time of the OLDEST of them (None when there is none)}.
    """
    reasons: list[str] = []
    keys: list[str] = []
    head = main.get("head")
    commit = commit_of(build)
    site = {"commit": commit, "head": head, "built_at": None, "dirty": False, "behind_by": None, "hours_behind": None, "state": "unknown"}

    if commit is None:
        site["state"] = "unreadable"
        reasons.append("build.json could not be read, or names no commit: nobody can tell which commit is live.")
        keys.append("build:unreadable")
    else:
        site["built_at"] = stamp(build.get("built_at"))
        site["dirty"] = build.get("dirty") is True
        behind = main.get("behind_by")
        if commit == head or behind == 0:
            site.update(behind_by=0, hours_behind=0.0, state="fresh")
        elif not isinstance(behind, int) or isinstance(behind, bool):
            site["state"] = "unknown"
            reasons.append(f"The deployed commit {commit[:7]} could not be compared with main ({str(head)[:7]}): GitHub does not know it.")
            keys.append("site:not-comparable")
        else:
            since = when(main.get("waiting_since"))
            hours = hours_between(now, since) if since else None
            site.update(behind_by=behind, hours_behind=None if hours is None else round(hours, 1))
            if hours is None or hours > limit_hours:
                site["state"] = "behind"
                waited = "for an unknown time" if hours is None else f"for {hours:.0f} hours"
                reasons.append(f"The site is built from {commit[:7]}; main is {behind} commit{'' if behind == 1 else 's'} ahead "
                               f"({str(head)[:7]}), and the oldest of them has waited {waited}.")
                keys.append("site:behind")
            else:
                site["state"] = "fresh"

    datasets: list[dict] = []
    snapshots = index.get("snapshots") if isinstance(index, dict) else None
    if not isinstance(snapshots, dict):
        reasons.append("data/v1/index.json could not be read: nobody can tell how old the saved datasets are.")
        keys.append("index:unreadable")
    else:
        for raw in sorted(snapshots, key=str):
            row = snapshots[raw] if isinstance(snapshots[raw], dict) else {}
            # The name goes into a workflow output and an issue: only what a registry id may hold.
            name = re.sub(r"[^A-Za-z0-9._-]", "?", str(raw))[:80]
            entry = {"id": name, "status": row.get("status") if row.get("status") in STATUSES else None, "fetched_at": stamp(row.get("fetched_at")), "valid_until": stamp(row.get("valid_until")),
                     "hours_past": None, "state": "fresh"}
            until = when(row.get("valid_until"))
            if row.get("status") == "skipped":
                entry["state"] = "off"
            elif until is None:
                entry["state"] = "missing"
                reasons.append(f"The dataset {name} has no saved copy with a valid-until time.")
                keys.append(f"data:{name}")
            else:
                past = hours_between(now, until)
                entry["hours_past"] = round(past, 1)
                if past > limit_hours:
                    entry["state"] = "stale"
                    reasons.append(f"The dataset {name} is {past:.0f} hours past its valid-until ({entry['valid_until']}).")
                    keys.append(f"data:{name}")
                elif past > 0:
                    entry["state"] = "due"
            datasets.append(entry)

    return {"fresh": not reasons, "reasons": reasons, "key": ",".join(sorted(keys)), "now": now.strftime("%Y-%m-%dT%H:%M:%SZ"),
            "site": site, "datasets": datasets}


def summary(v: dict, site_url: str = "") -> str:
    """The job summary and the issue's words: Markdown, the same text in both places."""
    s = v["site"]
    lines = [f"## {'The live site is fresh' if v['fresh'] else ISSUE_TITLE}", "",
             f"Checked {v['now']}{' against ' + site_url if site_url else ''}, from public addresses only.", ""]
    if v["reasons"]:
        lines += [f"- {r}" for r in v["reasons"]] + [""]
    lines += ["| | deployed | main | commits behind | waiting, hours | state |", "|---|---|---|---|---|---|"]
    show = lambda x: "?" if x is None else str(x)  # noqa: E731
    deployed = "unreadable" if not s["commit"] else f"`{s['commit'][:7]}`{' (with uncommitted changes)' if s['dirty'] else ''}, built {show(s['built_at'])}"
    lines += [f"| the site | {deployed} | `{str(s['head'])[:7]}` | {show(s['behind_by'])} | {show(s['hours_behind'])} | {s['state']} |", ""]
    if v["datasets"]:
        words = {"fresh": "fresh", "due": "due (inside the day of grace)", "stale": "**stale**", "missing": "**no saved copy**", "off": "switched off"}
        lines += ["| dataset | last read | valid until | hours past | state |", "|---|---|---|---|---|"]
        for d in v["datasets"]:
            past = "" if d["hours_past"] is None or d["hours_past"] <= 0 else f"{d['hours_past']:.0f}"
            lines.append(f"| {d['id']} | {d['fetched_at'] or ''} | {d['valid_until'] or ''} | {past} | {words[d['state']]} |")
        lines.append("")
    lines += [f"The rule is `scripts/freshness.py`: more than {LIMIT_HOURS} hours behind main, a dataset more than {LIMIT_HOURS} hours past "
              "its valid-until, or a file that cannot be read.", ""]
    return "\n".join(lines)


def read_json(path: Path | None) -> object:
    """The parsed file, or None: a missing file and a 404 page saved as one are the same answer."""
    try:
        return json.loads(path.read_text(encoding="utf-8")) if path else None
    except (OSError, ValueError):
        return None


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    ap.add_argument("--commit-of", type=Path, help="print the commit this build.json names (nothing when it names none) and stop")
    ap.add_argument("--build", type=Path, help="the site's build.json as fetched (missing or unparseable: unreadable)")
    ap.add_argument("--index", type=Path, help="the site's data/v1/index.json as fetched")
    ap.add_argument("--main-head", help="the full sha of main's head")
    ap.add_argument("--behind-by", help="how many commits main has that the deployed commit does not (empty: could not compare)")
    ap.add_argument("--waiting-since", help="the time of the oldest of those commits")
    ap.add_argument("--now", help="the time to judge at (default: now)")
    ap.add_argument("--site", default="", help="the address that was read, for the summary")
    ap.add_argument("--summary", type=Path, help="append the Markdown summary to this file")
    ap.add_argument("--github-output", type=Path, help="append fresh= and key= to this file")
    args = ap.parse_args()

    if args.commit_of:
        commit = commit_of(read_json(args.commit_of))
        if commit:
            print(commit)
        return 0
    if not args.main_head or not SHA.fullmatch(args.main_head):
        print("freshness: --main-head must be a full sha", file=sys.stderr)
        return 2
    now = when(args.now) if args.now else datetime.now(timezone.utc)
    if now is None:
        print(f"freshness: --now {args.now!r} is not a time", file=sys.stderr)
        return 2
    behind = int(args.behind_by) if args.behind_by and args.behind_by.strip().isdigit() else None
    v = verdict(read_json(args.build), read_json(args.index),
                {"head": args.main_head, "behind_by": behind, "waiting_since": args.waiting_since or None}, now)
    text = summary(v, args.site)
    if args.summary:
        with args.summary.open("a", encoding="utf-8") as f:
            f.write(text)
    if args.github_output:
        with args.github_output.open("a", encoding="utf-8") as f:
            f.write(f"fresh={'true' if v['fresh'] else 'false'}\nkey={v['key']}\n")
    print(json.dumps(v, indent=1))
    return 0


if __name__ == "__main__":
    sys.exit(main())
