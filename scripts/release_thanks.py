#!/usr/bin/env python3
"""Draft the "Thanks" section of a release's notes from the pull requests merged since the last one.

    python3 scripts/release_thanks.py                       # since the latest release (or all, before the first)
    python3 scripts/release_thanks.py --since 2026-10-01    # since a date
    python3 scripts/release_thanks.py --from-json F ...     # from a saved list (the test uses this)

Prints Markdown to stdout, or nothing when nobody from outside had a pull request merged in the
range. .github/workflows/release.yml appends it to the notes it cuts from CHANGELOG.md, so a
person who fixed one row is named in the release that carries the fix (CONTRIBUTING.md promises
that). A failure here must never stop a release: the workflow treats it as "no thanks section".

Only logins and pull request numbers are printed, never a title, so nothing a stranger typed can
reach the release page as Markdown. Maintainers and bots are left out: scripts/gen_contributors.py
holds that rule and the reading of what a pull request touched.
"""
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import gen_contributors as gc  # noqa: E402


def last_release_date():
    """When the newest published release came out (ISO 8601), or '' before the first one.

    Asked of GitHub rather than of git tags: the release workflow's checkout is one commit deep and
    has no tags, and while a release is being cut its own tag exists but its release does not yet,
    so "the latest release" is the one before, which is the range wanted.
    """
    r = subprocess.run(["gh", "api", f"repos/{gc.REPO}/releases/latest", "--jq", ".published_at"], capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else ""


def render(prs, since=""):
    by = {}
    for pr in gc.outside(prs):
        if since and (pr.get("mergedAt") or "") < since:
            continue
        by.setdefault(pr["login"], []).append(pr)
    if not by:
        return ""
    lines = ["## Thanks", "", "To the people whose pull requests are in this release:", ""]
    for login in sorted(by, key=str.lower):
        mine = sorted(by[login], key=lambda p: p["number"])
        kinds = []
        for pr in mine:
            for k in gc.kinds_of(pr["paths"]) or ["Code"]:
                if k not in kinds:
                    kinds.append(k)
        nums = ", ".join(f"#{p['number']}" for p in mine)
        lines.append(f"- @{login}: {', '.join(k.lower() for k in kinds)} ({nums})")
    lines += ["", "Everyone who has contributed is in [CONTRIBUTORS.md](https://github.com/Sara-Managed-Projects/space-radar/blob/main/CONTRIBUTORS.md).", ""]
    return "\n".join(lines)


def main(argv):
    since = argv[argv.index("--since") + 1] if "--since" in argv else None
    if "--from-json" in argv:
        prs = json.loads(Path(argv[argv.index("--from-json") + 1]).read_text(encoding="utf-8"))
    else:
        prs = gc.fetch()
    if since is None:
        since = last_release_date()
    sys.stdout.write(render(prs, since))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
