#!/usr/bin/env python3
"""The contributor's path holds together: what the guides name exists, and the automation is what it says.

    python3 tests/test_contributor_docs.py

A guide that names a file which has moved sends a newcomer to nothing on their first day, and they
do not come back to report it. So, each by reading the files:

  * every repository path written in docs/FIRST_PR.md, docs/ARCHITECTURE.md,
    docs/CONTRIBUTE_WITHOUT_CODE.md, docs/REVIEWING.md, GOVERNANCE.md and CONTRIBUTORS.md exists,
    every relative link in them resolves, and none of them has an em dash;
  * every CI step a guide quotes by name is a step of .github/workflows/ci.yml;
  * every item scripts/check.sh runs is a file that exists, and the guides name that command;
  * .devcontainer/devcontainer.json parses, forwards the port the guides use and installs PyYAML;
  * every path pattern in .github/labeler.yml matches a file;
  * the community workflows pin every action to a commit, use no secret besides GITHUB_TOKEN, and
    the one file that uses pull_request_target checks out nothing and runs no shell;
  * scripts/gen_contributors.py and scripts/release_thanks.py, run on a saved list: maintainers and
    bots are left out, a login that is not a login is refused, kinds come from paths, a generated
    mirror counts for nothing, and a range with nobody from outside prints nothing;
  * the maintainers named in GOVERNANCE.md, gen_contributors.py and pending_contributions.sh agree.

Each rule is shown to fail on a broken input at the end.
"""
import glob
import json
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


DOCS = ["docs/FIRST_PR.md", "docs/ARCHITECTURE.md", "docs/CONTRIBUTE_WITHOUT_CODE.md", "docs/REVIEWING.md", "GOVERNANCE.md", "CONTRIBUTORS.md"]
TOP = r"(?:registry|scripts|site|tests|tools|harvest|docs|templates|notify|assets|\.github|\.devcontainer)"
PATH = re.compile(rf"(?<![\w./-])({TOP}/[\w.\-/*<>]*)")
# Written as examples of a file a contributor will create, so they are not in the tree.
EXAMPLES = {"site/js/copy/fr.js"}


def named_paths(text):
    """Repository paths a document names: inside backticks or code blocks, with a known first folder."""
    spans = re.findall(r"```.*?```|`[^`\n]+`", text, re.S)
    out = set()
    for span in spans:
        for m in PATH.finditer(span):
            out.add(m.group(1).rstrip(".,:;)"))
    return out


def missing_paths(text):
    bad = []
    for p in sorted(named_paths(text)):
        if "<" in p or p in EXAMPLES:
            continue  # a placeholder such as tests/test_<name>.mjs
        if "*" in p:
            if not glob.glob(str(ROOT / p)):
                bad.append(p)
        elif not (ROOT / p).exists():
            bad.append(p)
    return bad


def dead_links(name, text):
    bad = []
    for target in re.findall(r"\]\(([^)\s]+)\)", text):
        if re.match(r"(https?:|mailto:|#)", target):
            continue
        if not ((ROOT / name).parent / target.split("#")[0]).resolve().exists():
            bad.append(target)
    return bad


texts = {}
for name in DOCS:
    p = ROOT / name
    if not p.is_file():
        problems.append(f"{name} is missing")
        continue
    texts[name] = p.read_text(encoding="utf-8")
    for bad in missing_paths(texts[name]):
        problems.append(f"{name} names {bad}, which does not exist")
    for bad in dead_links(name, texts[name]):
        problems.append(f"{name} links to {bad}, which does not exist")
    check("—" not in texts[name], f"{name} has an em dash: use a colon, a comma or two sentences")
arch = texts.get("docs/ARCHITECTURE.md", "")
check(len(named_paths(arch)) >= 50, f"docs/ARCHITECTURE.md names only {len(named_paths(arch))} paths: the path rule is not reading it")
check(arch.count("\n| ") >= 12 + 7, "docs/ARCHITECTURE.md should keep its seven 'where things live' rows and twelve 'to change X' rows")

# --- the CI steps the guides quote are real steps
ci = (ROOT / ".github/workflows/ci.yml").read_text(encoding="utf-8")
QUOTED = {
    "docs/FIRST_PR.md": ["Registries validate", "mirror matches the registry", "A line of chrome is one line", "No user-visible string outside copy/en.js", "Every trip stop has its narration"],
    "docs/CONTRIBUTE_WITHOUT_CODE.md": ["Registries validate", "The sites mirror matches the registry", "The tours mirror matches the registry", "Every data source and model the registries name is credited in CREDITS.md"],
}
for name, steps in QUOTED.items():
    for step in steps:
        check(step in texts.get(name, ""), f"{name} no longer quotes the CI step '{step}': update this test's list")
        check(re.search(r"- name: \"?[^\n]*" + re.escape(step), ci) is not None, f"{name} quotes the CI step '{step}', which is not a step of ci.yml")
check("is run by no step of .github/workflows/ci.yml" in (ROOT / "tests/test_ci_runs_every_test.mjs").read_text(encoding="utf-8"), "docs/FIRST_PR.md quotes test_ci_runs_every_test's message, which has changed")
check("is STALE" in (ROOT / "scripts/_genmirror.py").read_text(encoding="utf-8"), "docs/FIRST_PR.md quotes the stale-mirror message, which has changed")
check(re.search(r"^  workflow_dispatch:", ci, re.M) is not None, "ci.yml must accept workflow_dispatch: contributors.yml starts it on its branch that way")

# --- the one command
listed = subprocess.run(["bash", str(ROOT / "scripts/check.sh"), "--list"], capture_output=True, text=True)
items = [l for l in listed.stdout.splitlines() if l.strip()]
check(listed.returncode == 0 and len(items) >= 30, f"scripts/check.sh --list should name its items (got {len(items)})")
for item in items:
    parts = item.split()
    check(len(parts) >= 2 and (ROOT / parts[1]).is_file(), f"scripts/check.sh runs '{item}', and {parts[1] if len(parts) > 1 else '?'} does not exist")
for needed in ("scripts/check_registry.py", "scripts/check_copy.py", "scripts/gen_aliases_js.py --check", "tests/test_contributor_docs.py"):
    check(any(needed in i for i in items), f"scripts/check.sh no longer runs {needed}")
for name in ("docs/FIRST_PR.md", "docs/CONTRIBUTE_WITHOUT_CODE.md", "CONTRIBUTING.md", ".github/PULL_REQUEST_TEMPLATE.md"):
    check("scripts/check.sh" in (ROOT / name).read_text(encoding="utf-8"), f"{name} does not name scripts/check.sh")
contributing = (ROOT / "CONTRIBUTING.md").read_text(encoding="utf-8")
check("docs/FIRST_PR.md" in "\n".join(contributing.split("\n")[:16]), "CONTRIBUTING.md must point at docs/FIRST_PR.md near its top")
readme = (ROOT / "README.md").read_text(encoding="utf-8")
check("codespaces.new/Sara-Managed-Projects/space-radar" in readme, "README lacks the Open in Codespaces badge")
check("docs/FIRST_PR.md" in readme, "README does not link docs/FIRST_PR.md")
first = texts.get("docs/FIRST_PR.md", "")
check("waits for a maintainer" in first and "do not close" in first, "docs/FIRST_PR.md must say the first CI run waits for a maintainer, and not to close the pull request")

# --- the dev container
raw = (ROOT / ".devcontainer/devcontainer.json").read_text(encoding="utf-8")
dc = json.loads(re.sub(r"^\s*//.*$", "", raw, flags=re.M))
check(8177 in dc.get("forwardPorts", []), "the dev container must forward port 8177, the one every guide uses")
check("pyyaml" in dc.get("postCreateCommand", ""), "the dev container must install PyYAML")
check("scripts/check.sh" in dc.get("postAttachCommand", "") and "http.server 8177" in dc.get("postAttachCommand", ""), "the dev container must say how to start the server and run the checks")
check("build" not in dc and "dockerFile" not in dc, "the dev container is a stock image: no Dockerfile to maintain")

# --- labels by path
labeler = yaml.safe_load((ROOT / ".github/labeler.yml").read_text(encoding="utf-8"))
tracked = subprocess.run(["git", "ls-files"], capture_output=True, text=True, cwd=ROOT).stdout.split("\n")


def label_globs(cfg):
    for label, rules in cfg.items():
        for rule in rules:
            for group in rule.get("changed-files", []):
                for globs in group.values():
                    for g in ([globs] if isinstance(globs, str) else globs):
                        yield label, g


def glob_matches(g, files):
    rx = re.escape(g).replace(r"\*\*/", "(?:.*/)?").replace(r"\*\*", ".*").replace(r"\*", "[^/]*")
    return any(re.fullmatch(rx, f) for f in files)


for label, g in label_globs(labeler):
    if g.startswith("!"):
        g = g[1:]
    check(glob_matches(g, tracked), f".github/labeler.yml: the pattern {g} (label {label}) matches no file")
check(set(labeler) >= {"documentation", "translation", "trip", "data", "tests"}, "labeler.yml lost a label the release notes sort by")

# --- the workflows
flows = {p.name: p.read_text(encoding="utf-8") for p in (ROOT / ".github/workflows").glob("*.yml")}


def workflow_problems(name, text):
    bad = []
    code = "\n".join(l for l in text.split("\n") if not l.lstrip().startswith("#"))
    for m in re.finditer(r"uses:\s*(\S+)", code):
        if not re.fullmatch(r"actions/[\w-]+@[0-9a-f]{40}", m.group(1)):
            bad.append(f"{name}: '{m.group(1)}' must be one of GitHub's own actions, pinned to a full commit")
    for m in re.finditer(r"secrets\.(\w+)", code):
        if m.group(1) != "GITHUB_TOKEN":
            bad.append(f"{name}: uses the secret {m.group(1)}; only GITHUB_TOKEN is allowed here")
    if "pull_request_target" in code:
        if "actions/checkout" in code or re.search(r"^\s*(?:- )?run:", code, re.M):
            bad.append(f"{name}: a pull_request_target workflow must check out nothing and run no shell")
        if not re.search(r"^permissions: \{\}", code, re.M):
            bad.append(f"{name}: a pull_request_target workflow starts from no permissions and grants per job")
    return bad


for name in ("community.yml", "contributors.yml"):
    check(name in flows, f".github/workflows/{name} is missing")
    problems.extend(workflow_problems(name, flows.get(name, "")))
for name, text in flows.items():
    code = "\n".join(l for l in text.split("\n") if not l.lstrip().startswith("#"))
    check(name == "community.yml" or "pull_request_target" not in code, f"{name} uses pull_request_target: only community.yml may, and it runs nothing from a fork")
check(not any("actions/stale" in t for t in flows.values()), "no stale bot: docs/REVIEWING.md says a quiet pull request gets a person's comment")
check("scripts/release_thanks.py" in flows.get("release.yml", ""), "release.yml no longer calls scripts/release_thanks.py")
check("gh workflow run ci.yml" in flows.get("contributors.yml", ""), "contributors.yml must start ci.yml on its branch: a push with GITHUB_TOKEN starts nothing")

# --- the two scripts, on a saved list
fixture = str(ROOT / "tests/fixtures/contributors/merged.json")


def run(script, *args):
    return subprocess.run([sys.executable, str(ROOT / "scripts" / script), "--from-json", fixture, *args], capture_output=True, text=True)


out = run("gen_contributors.py", "--stdout").stdout
section = lambda title: (re.search(rf"^## {re.escape(title)}\n\n(.*?)\n\n", out, re.S | re.M) or [None, ""])[1]
check("@ada" in section("Facts, sources and data") and "@ada" in section("Code") and "@ada" in section("Tests and checks"), "ada should be under data, code and tests")
check("@Grace-H" in section("Translations") and "@Grace-H" not in section("Words and documentation"), "a language file is a translation, not documentation")
check("@caroline" in section("Trips") and "@caroline" in section("Words and documentation") and "@caroline" not in section("Code"), "a generated mirror must not count as code")
check("@early-bird" in section("Models, maps and pictures"), "a model file is under models")
check("dependabot" not in out and "evil.example" not in out, "bots and things that are not logins must be left out")
for kind in ("Trips", "Code", "Facts, sources and data"):
    check("ionesu" not in section(kind) and "Sara-Agent" not in section(kind), f"maintainers must not be listed under {kind}")
thanks = run("release_thanks.py", "--since", "2026-10-01").stdout
check(thanks.startswith("## Thanks") and "@ada" in thanks and "#3, #4" in thanks and "@caroline" in thanks, "the thanks section should name ada with #3 and #4, and caroline")
check("early-bird" not in thanks and "ionesu" not in thanks and "evil" not in thanks, "the thanks section holds only outside people merged in the range")
check(run("release_thanks.py", "--since", "2027-01-01").stdout == "", "a range with nobody from outside prints nothing")

sys.path.insert(0, str(ROOT / "scripts"))
import gen_contributors  # noqa: E402

gov = (ROOT / "GOVERNANCE.md").read_text(encoding="utf-8")
pending = (ROOT / "scripts/pending_contributions.sh").read_text(encoding="utf-8")
for m in gen_contributors.MAINTAINERS:
    check(f"@{m}" in gov, f"GOVERNANCE.md does not name the maintainer @{m}")
    check(m in pending, f"scripts/pending_contributions.sh does not know the maintainer {m}")
check(subprocess.run(["bash", "-n", str(ROOT / "scripts/pending_contributions.sh")]).returncode == 0, "scripts/pending_contributions.sh does not parse")
check((ROOT / "CONTRIBUTORS.md").read_text(encoding="utf-8").startswith("# Contributors"), "CONTRIBUTORS.md is not the generated file")

# --- the rules can fail
assert missing_paths("see `scripts/no_such_file.py` and `registry/*.nothing`") == ["registry/*.nothing", "scripts/no_such_file.py"]
assert missing_paths("see `scripts/check.sh`, `tests/test_<name>.mjs` and `registry/*.yaml`") == []
assert dead_links("docs/FIRST_PR.md", "[x](NOPE.md) [y](ARCHITECTURE.md) [z](https://example.org)") == ["NOPE.md"]
assert workflow_problems("x.yml", "on: pull_request_target\npermissions: {}\nsteps:\n  - uses: actions/checkout@v7\n") != []
assert workflow_problems("x.yml", "steps:\n  - uses: someone/thing@" + "a" * 40 + "\n") != []
assert workflow_problems("x.yml", "env:\n  T: ${{ secrets.AWS_KEY }}\n") != []
assert workflow_problems("x.yml", "on: pull_request_target\npermissions: {}\nsteps:\n  - uses: actions/labeler@" + "a" * 40 + "\n") == []
assert not glob_matches("registry/nothing-*.yaml", tracked) and glob_matches("docs/**", tracked)
assert not gen_contributors.LOGIN.match("x](https://evil.example) [y") and gen_contributors.LOGIN.match("Grace-H")

if problems:
    print("contributor docs FAILED:\n  " + "\n  ".join(problems), file=sys.stderr)
    sys.exit(1)
print(f"contributor docs ok: {len(DOCS)} guides name {sum(len(named_paths(t)) for t in texts.values())} paths that all exist, "
      f"{len(items)} items in scripts/check.sh, {len(list(label_globs(labeler)))} label patterns, 2 workflows pinned and fork-safe, "
      f"contributors and thanks from a saved list")
