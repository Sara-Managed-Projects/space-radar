#!/usr/bin/env python3
"""The files a newcomer meets first hold together: README, CONTRIBUTING, ROADMAP, the issue chooser, CITATION.

    python3 tests/test_community_files.py

Asserted, each by reading the files: the issue chooser offers six forms and three contact links and
every form parses with the fields GitHub needs; CITATION.cff parses and names this repository and
the MIT licence; every relative link in README, CONTRIBUTING, ROADMAP and docs/TRANSLATING.md goes
to a file that exists; CONTRIBUTING opens with "no install, no build" and has the no-code section
and the 48-hour promise; the three social accounts are linked from the README and no Facebook
page is; ROADMAP has Now, Next, Later and Not doing, and every line of the first three links a
public issue; the social preview is the right size; and nothing internal (the private repository,
the plan, a launch venue) is written in a public file. Each rule is shown to fail on a broken input.
"""
import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
problems = []


def check(ok, msg):
    if not ok:
        problems.append(msg)


# --- the issue chooser
forms = sorted((ROOT / ".github" / "ISSUE_TEMPLATE").glob("*.yml"))
forms = [f for f in forms if f.name != "config.yml"]
check(len(forms) == 6, f"the chooser should show 6 forms, there are {len(forms)}: {[f.name for f in forms]}")
for f in forms:
    d = yaml.safe_load(f.read_text(encoding="utf-8"))
    check(all(k in d for k in ("name", "description", "body", "labels")), f"{f.name} lacks name, description, labels or body")
    ids = [b.get("id") for b in d.get("body", []) if b.get("type") != "markdown"]
    check(len(ids) == len(set(ids)) and all(ids), f"{f.name}: every input needs its own id")
    check(any(b.get("validations", {}).get("required") for b in d.get("body", [])), f"{f.name}: at least one field should be required")
for name in ("classroom.yml", "translation.yml"):
    check((ROOT / ".github" / "ISSUE_TEMPLATE" / name).is_file(), f"{name} is missing")
cfg = yaml.safe_load((ROOT / ".github" / "ISSUE_TEMPLATE" / "config.yml").read_text(encoding="utf-8"))
links = cfg.get("contact_links", [])
check(len(links) == 3 and all(l["url"].startswith("https://") and l.get("about") for l in links), f"three contact links with a URL and an 'about', not {len(links)}")
check(any("/discussions" in l["url"] for l in links), "one contact link must be Discussions")
check("source" in (ROOT / ".github" / "PULL_REQUEST_TEMPLATE.md").read_text(encoding="utf-8").lower(), "the pull request template must ask for a source")

# --- CITATION.cff
cff = yaml.safe_load((ROOT / "CITATION.cff").read_text(encoding="utf-8"))
check(all(k in cff for k in ("cff-version", "message", "title", "authors")), "CITATION.cff lacks a required key")
check(cff.get("repository-code") == "https://github.com/Sara-Managed-Projects/space-radar" and cff.get("license") == "MIT", "CITATION.cff names the wrong repository or licence")
check(not any("@" in str(a) for a in cff["authors"]), "CITATION.cff must not carry a personal email")

# --- links that go to files
for name in ("README.md", "CONTRIBUTING.md", "ROADMAP.md", "docs/TRANSLATING.md"):
    p = ROOT / name
    if not p.is_file():
        problems.append(f"{name} is missing")
        continue
    text = p.read_text(encoding="utf-8")
    for target in re.findall(r"\]\(([^)\s]+)\)", text) + re.findall(r'(?:href|src)="([^"]+)"', text):
        if re.match(r"(https?:|mailto:|#)", target):
            continue
        path = (p.parent / target.split("#")[0]).resolve()
        check(path.exists(), f"{name} links to {target}, which does not exist")

# --- CONTRIBUTING
contrib = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
check(contrib.split("\n", 3)[2].startswith("**No install, no build.**"), "CONTRIBUTING must open with 'No install, no build.'")
check("## Contribute without code" in contrib and "48 hours" in contrib, "CONTRIBUTING lacks the no-code section or the 48-hour promise")
check("AI-assisted" in contrib, "CONTRIBUTING lacks its paragraph on AI-assisted contributions")

# --- README
readme = (ROOT / "README.md").read_text(encoding="utf-8")
for url in ("https://www.youtube.com/@SpaceRadar_ai", "https://www.instagram.com/spaceradar.ai/", "https://www.linkedin.com/company/spaceradar-ai"):
    check(url in readme, f"README does not link {url}")
check("facebook" not in readme.lower(), "no Facebook page is ours: README must not link one")
check("python3 -m http.server" in readme[:readme.index("## What it is")], "the run command must be above the fold")
check("star history" not in readme.lower() and "star-history" not in readme.lower(), "no star-history image until the project has 25 stars")

# --- ROADMAP
road = (ROOT / "ROADMAP.md").read_text(encoding="utf-8") if (ROOT / "ROADMAP.md").is_file() else ""
sections = {m.group(1): m.group(2) for m in re.finditer(r"^## (.+?)\n(.*?)(?=^## |\Z)", road, re.S | re.M)}
for need in ("Now", "Next", "Later", "Not doing"):
    check(any(k.startswith(need) for k in sections), f"ROADMAP lacks the section {need}")
for k, body in sections.items():
    if k.split(" ")[0] in ("Now", "Next", "Later"):
        items = [i.replace("\n", " ") for i in re.findall(r"^- .*(?:\n[ ]{2}.*)*", body, re.M)]  # a bullet and its continuation lines
        check(bool(items), f"ROADMAP section {k} is empty")
        for l in items:
            check(re.search(r"https://github\.com/Sara-Managed-Projects/space-radar/issues/\d+", l) is not None, f"ROADMAP line without a public issue link: {l[:70]}")

# --- the social preview
r = subprocess.run([sys.executable, str(ROOT / "scripts" / "build_social_preview.py"), "--check"], capture_output=True, text=True)
check(r.returncode == 0, f"social preview: {r.stdout.strip()}")

# --- nothing internal in a public file
PUBLIC = ["README.md", "CONTRIBUTING.md", "ROADMAP.md", "CITATION.cff", "docs/TRANSLATING.md", "SUPPORT.md"] + \
         [str(p.relative_to(ROOT)) for p in (ROOT / ".github" / "ISSUE_TEMPLATE").glob("*.yml")]
BANNED = re.compile(r"space-radar-internal|marketing plan|marketing-plan|show hn|product hunt|hacker news|decision-ivan|launch plan|facebook", re.I)
for name in PUBLIC:
    p = ROOT / name
    if p.is_file():
        m = BANNED.search(p.read_text(encoding="utf-8"))
        check(m is None, f"{name} mentions {m.group(0)!r}: that belongs in the private repository" if m else "")

# --- the checks can fail
assert BANNED.search("see the Marketing Plan") and BANNED.search("a Show HN post"), "the internal-words rule must match"
assert re.search(r"https://github\.com/Sara-Managed-Projects/space-radar/issues/\d+", "- Now: x ([#5](https://github.com/Sara-Managed-Projects/space-radar/issues/5))")
assert not re.search(r"https://github\.com/Sara-Managed-Projects/space-radar/issues/\d+", "- Now: an item with no link")

if problems:
    print("community files FAILED:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
print(f"community files ok: {len(forms)} forms, {len(links)} contact links, CITATION.cff, README, CONTRIBUTING, ROADMAP")
