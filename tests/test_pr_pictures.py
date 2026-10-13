#!/usr/bin/env python3
"""tests/test_pr_pictures.py -- a pull request that changes what is drawn shows a picture.

Holds scripts/pr_pictures.py: which paths owe a picture, what counts as one, the label that
excuses, the draft that waits, and that the workflow and the documents say the same rule.
"""
import os
import sys

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..")
sys.path.insert(0, os.path.join(ROOT, "scripts"))
import pr_pictures as P  # noqa: E402

problems = []


def check(ok, what):
    if not ok:
        problems.append(what)


RAW = "https://raw.githubusercontent.com/Sara-Managed-Projects/space-radar/screens/pr/1033/pluto.jpg"
UP = "https://github.com/user-attachments/assets/0f1e2d3c-aaaa-bbbb-cccc-1234567890ab"

# what owes
check(P.owing_files(["site/js/scene/sun.js"]) == ["site/js/scene/sun.js"], "a scene module owes a picture")
check(P.owing_files(["site/js/scene/weather/flow.js"]), "and so does one in a folder under scene/")
check(P.owing_files(["site/models/cygnus.glb"]) and P.owing_files(["site/textures/2k_pluto.webp"]), "a model and a map owe one")
check(P.owing_files(["registry/weather.yaml"]) and P.owing_files(["registry/models.yaml"]), "the registries that decide what is drawn owe one")
for f in ["tests/test_sun.mjs", "docs/ARCHITECTURE.md", "site/js/data/weather.js", "site/js/ui/drift.js", "registry/aliases.yaml",
          "registry/tours.yaml", "tools/cdp.mjs", "site/js/copy/en.js", "site/js/scenery.js", "README.md"]:
    check(P.owing_files([f]) == [], "%s owes nothing" % f)

# what a picture is
check(P.pictures("![Pluto](%s)" % RAW) == [RAW], "Markdown's image with an image address")
check(P.pictures('<img src="%s" width="400">' % RAW) == [RAW], "an <img>")
check(P.pictures("![shot](%s)" % UP) == [UP], "a picture dragged into GitHub, which has no extension")
check(P.pictures("see [the picture](%s)" % RAW) == [], "a link is not a picture: the reviewer has to see it")
check(P.pictures("<!-- ![x](%s) -->" % RAW) == [], "nor one inside a comment, where the template's hint lives")
check(P.pictures("![ci](https://img.shields.io/badge/ci-green.svg)") == [], "nor a badge")
check(P.pictures("![x](https://example.com/page)") == [], "nor an address that is no image")
check(P.pictures("") == [] and P.pictures(None) == [], "an empty description has none")

# the verdict
ok, _ = P.verdict(["tests/test_x.mjs", "docs/a.md"], "")
check(ok, "nothing drawn changed: nothing owed")
ok, msg = P.verdict(["site/js/scene/sun.js"], "words only")
check(not ok and "look.yml" in msg and "no-visual-change" in msg and "site/js/scene/sun.js" in msg, "a drawn change with no picture is refused, and told how")
ok, _ = P.verdict(["site/js/scene/sun.js"], "before ![a](%s) after" % RAW)
check(ok, "with a picture it passes")
ok, _ = P.verdict(["site/js/scene/sun.js"], "", labels=["no-visual-change"])
check(ok, "the label excuses it")
ok, _ = P.verdict(["site/js/scene/sun.js"], "", labels=["documentation"])
check(not ok, "another label does not")
ok, msg = P.verdict(["site/js/scene/sun.js"], "", draft=True)
check(ok and "before it is ready" in msg, "a draft owes it later, and is told so")
ok, msg = P.verdict(["site/models/a.glb", "site/models/b.glb", "site/models/c.glb", "site/models/d.glb", "site/models/e.glb", "site/models/f.glb"], "")
check(not ok and "and 2 more" in msg, "a long list is named in part")


def read(p):
    with open(os.path.join(ROOT, p)) as fh:
        return fh.read()


# the same rule, said where people meet it
wf = read(".github/workflows/pictures.yml")
check("scripts/pr_pictures.py" in wf and "pull_request" in wf, "the workflow runs the script on pull requests")
check("edited" in wf and "ready_for_review" in wf and "labeled" in wf, "and again when the description, the draft state or the labels change")
check("contents: read" in wf and "write" not in wf.split("jobs:")[0], "with nothing but read access: it runs on forks' pull requests")
tpl = read(".github/PULL_REQUEST_TEMPLATE.md")
check("picture" in tpl and "no-visual-change" in tpl, "the pull request template asks for the picture and names the way out")
contrib = read("CONTRIBUTING.md")
check("scripts/pr_pictures.py" in contrib or "pictures" in contrib.lower() and "no-visual-change" in contrib, "CONTRIBUTING.md states the rule")
tools = read("tools/README.md")
check("pr-pictures.sh" in tools, "tools/README.md says how to attach pictures from the command line")
check(os.access(os.path.join(ROOT, "tools/pr-pictures.sh"), os.X_OK), "tools/pr-pictures.sh is executable")

if problems:
    print("test_pr_pictures: %d problem(s)" % len(problems))
    for p in problems:
        print("  - " + p)
    sys.exit(1)
print("pr pictures ok: scene, model, map and drawing-registry changes owe a picture; an image in the description pays; a link, a badge or a comment does not; the label excuses and a draft waits")
