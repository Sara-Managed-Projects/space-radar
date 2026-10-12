#!/usr/bin/env python3
"""Write CONTRIBUTORS.md from the authors of merged pull requests, grouped by what they gave.

    python3 scripts/gen_contributors.py                 # ask GitHub (needs `gh`, signed in or GH_TOKEN), write the file
    python3 scripts/gen_contributors.py --from-json F   # the same from a saved list (the test uses this)
    python3 scripts/gen_contributors.py --stdout        # print instead of writing

WHY A SCRIPT. A list of names kept by hand is a list with people missing, and the person missing is
always the newest one, who is the one it matters to. .github/workflows/contributors.yml runs this
weekly; scripts/release_thanks.py uses the same reading of a pull request for the release notes.

WHAT COUNTS. A person is listed under every kind of thing a merged pull request of theirs touched,
read from the PATHS it changed (KINDS below), not from its title: a title is whatever its author
typed, a path is what happened. Maintainers are named once at the top and left out of the groups,
so the groups show who came from outside. Bots are left out.

WHAT IS WRITTEN. Logins only, each checked against GitHub's own rule for a login, so nothing a
stranger typed into a title or a branch name can reach the file. No dates and no counts: the file
changes only when a new person or a new kind appears, so the weekly run is usually a no-op.
"""
import json
import re
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REPO = "Sara-Managed-Projects/space-radar"
# The same two accounts GOVERNANCE.md names; tests/test_contributor_docs.py holds the two together.
MAINTAINERS = ("ionesu", "Sara-Agent")
LOGIN = re.compile(r"^[A-Za-z0-9](?:[A-Za-z0-9-]{0,37}[A-Za-z0-9])?$")

# First match wins, per path. Order matters: a trip is a registry file, a translation is a copy file.
KINDS = [
    ("Trips", lambda p: p in ("registry/tours.yaml", "registry/narration.yaml")),
    ("Facts, sources and data", lambda p: p.startswith("registry/")),
    ("Translations", lambda p: p.startswith("site/js/copy/") and not Path(p).name.startswith("en.")),
    ("Words and documentation", lambda p: p.endswith(".md") or p.startswith("site/js/copy/")),
    ("Models, maps and pictures", lambda p: p.startswith(("site/models/", "site/textures/", "site/images/", "assets/"))),
    ("Tests and checks", lambda p: p.startswith(("tests/", ".github/"))),
    ("Code", lambda p: p.startswith(("site/", "scripts/", "harvest/", "notify/", "tools/", "templates/"))),
]
# A generated mirror says nothing about what a person did: the registry row beside it does.
GENERATED = re.compile(r"^site/js/data/|^site/t/|^harvest/sources\.json$")

QUERY = """query($owner:String!,$name:String!,$after:String){repository(owner:$owner,name:$name){
pullRequests(states:MERGED,first:50,after:$after,orderBy:{field:CREATED_AT,direction:ASC}){
pageInfo{hasNextPage endCursor}
nodes{number mergedAt author{login __typename} files(first:100){nodes{path}}}}}}"""


def fetch():
    """Every merged pull request: [{number, mergedAt, login, bot, paths}]."""
    owner, name = REPO.split("/")
    out, after = [], None
    while True:
        cmd = ["gh", "api", "graphql", "-f", f"query={QUERY}", "-f", f"owner={owner}", "-f", f"name={name}"]
        if after:
            cmd += ["-f", f"after={after}"]
        page = json.loads(subprocess.run(cmd, check=True, capture_output=True, text=True).stdout)
        prs = page["data"]["repository"]["pullRequests"]
        for n in prs["nodes"]:
            author = n.get("author") or {}
            out.append({
                "number": n["number"], "mergedAt": n["mergedAt"], "login": author.get("login") or "",
                "bot": author.get("__typename") == "Bot",
                "paths": [f["path"] for f in ((n.get("files") or {}).get("nodes") or [])],
            })
        if not prs["pageInfo"]["hasNextPage"]:
            return out
        after = prs["pageInfo"]["endCursor"]


def kinds_of(paths):
    """The kinds a set of changed paths amounts to, in KINDS order."""
    found = set()
    for p in paths:
        if GENERATED.search(p):
            continue
        for name, test in KINDS:
            if test(p):
                found.add(name)
                break
    return [name for name, _ in KINDS if name in found]


def outside(prs):
    """The pull requests that count: a real login, not a bot, not a maintainer."""
    for pr in prs:
        login = pr.get("login") or ""
        if pr.get("bot") or login in MAINTAINERS or login.endswith("[bot]") or not LOGIN.match(login):
            continue
        yield pr


def link(login):
    return f"[@{login}](https://github.com/{login})"


def render(prs):
    groups = {name: set() for name, _ in KINDS}
    for pr in outside(prs):
        for kind in kinds_of(pr["paths"]) or ["Code"]:
            groups[kind].add(pr["login"])
    lines = [
        "# Contributors",
        "",
        "Everyone whose pull request has been merged into Space Radar, grouped by what they gave. Thank you.",
        "",
        "This file is written by `scripts/gen_contributors.py` from GitHub's record of merged pull",
        "requests, once a week. Do not edit it by hand: if you are missing, your pull request has not",
        "merged yet or the weekly run has not happened. People who gave data, a picture or a model are",
        "also in [CREDITS.md](CREDITS.md), and each release's notes thank the people in it by name.",
        "",
        "## Maintainers",
        "",
        ", ".join(link(m) for m in MAINTAINERS) + ". See [GOVERNANCE.md](GOVERNANCE.md).",
        "",
    ]
    everyone = set()
    for name, _ in KINDS:
        people = sorted(groups[name], key=str.lower)
        if not people:
            continue
        everyone |= set(people)
        lines += [f"## {name}", "", ", ".join(link(p) for p in people), ""]
    if not everyone:
        lines += ["## Your name here", "", "No pull request from outside has merged yet. [docs/FIRST_PR.md](docs/FIRST_PR.md) takes ten minutes.", ""]
    else:
        lines += [
            "## Your name here",
            "",
            "[docs/FIRST_PR.md](docs/FIRST_PR.md) takes ten minutes, and",
            "[docs/CONTRIBUTE_WITHOUT_CODE.md](docs/CONTRIBUTE_WITHOUT_CODE.md) lists the ways in that need no code.",
            "",
        ]
    return "\n".join(lines)


def main(argv):
    if "--from-json" in argv:
        prs = json.loads(Path(argv[argv.index("--from-json") + 1]).read_text(encoding="utf-8"))
    else:
        prs = fetch()
    text = render(prs)
    if "--stdout" in argv:
        sys.stdout.write(text)
        return 0
    (ROOT / "CONTRIBUTORS.md").write_text(text, encoding="utf-8")
    print(f"wrote CONTRIBUTORS.md ({len({p['login'] for p in outside(prs)})} people from outside, {len(prs)} merged pull requests read)")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
