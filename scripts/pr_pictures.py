#!/usr/bin/env python3
"""Does this pull request owe a picture, and does its description have one?

THE RULE (Ivan, 2026-10-12): a pull request that adds or changes something a visitor SEES DRAWN, a
model, a map, a world, a shader, shows it. At least one picture in the description, taken from the
app, before the pull request is ready. Five features were merged that day that no GPU had drawn;
the first look at them found a torn Pluto, an invisible coronal mass ejection and a Sun of
polygons. A reviewer who is shown the picture sees those in a second.

    python3 scripts/pr_pictures.py --files changed.txt --body body.md [--labels a,b] [--draft]

Exit 0 when nothing is owed or a picture is there; 1 when one is owed and missing (the message
says what to do). Standard library only: the workflow that runs this installs nothing.

WHAT OWES A PICTURE: a change under site/models/, site/textures/ or site/js/scene/, or to the
registries that decide what is drawn (models, textures, weather, worlds, nebulae). Tests, docs,
tools, the generated mirrors under site/js/data/ and data rows that draw nothing do not.

THE WAY OUT, for a change in those paths that cannot change a pixel (a comment, a rename, a
refactor held by tests): the label `no-visual-change`, which a maintainer sets. A draft owes
nothing yet.
"""
import argparse
import re
import sys

OWES = (
    "site/models/*", "site/textures/*", "site/js/scene/*",
    "registry/models.yaml", "registry/textures.yaml", "registry/weather.yaml",
    "registry/worlds.yaml", "registry/nebulae.yaml",
)
EXEMPT_LABEL = "no-visual-change"
# A picture: Markdown's ![alt](url) or an <img>, pointing at an image somebody can open. GitHub's
# own uploads have no extension (user-attachments/assets/<id>), so those hosts count by themselves.
MD_IMAGE = re.compile(r"!\[[^\]]*\]\(\s*<?(https?://[^)\s>]+)>?[^)]*\)")
HTML_IMAGE = re.compile(r"<img\b[^>]*\bsrc\s*=\s*[\"']?(https?://[^\"'\s>]+)", re.I)
IMAGE_EXT = re.compile(r"\.(png|jpe?g|webp|gif|avif)(\?|#|$)", re.I)
UPLOAD_HOST = re.compile(r"^https://(github\.com/user-attachments/|user-images\.githubusercontent\.com/|private-user-images\.githubusercontent\.com/)", re.I)
BADGE_HOST = re.compile(r"^https?://(img\.shields\.io|badgen\.net|github\.com/[^/]+/[^/]+/(actions/)?workflows/)", re.I)
COMMENT = re.compile(r"<!--.*?-->", re.S)


def owing_files(files):
    """The changed paths that draw something, in the order given."""
    out = []
    for f in files:
        f = f.strip()
        if not f:
            continue
        # `folder/*` is the folder and everything under it, however deep.
        if f in OWES or any(f.startswith(pat[:-1]) for pat in OWES if pat.endswith("/*")):
            out.append(f)
    return out


def pictures(body):
    """The image addresses in a description, comments and status badges left out."""
    text = COMMENT.sub("", body or "")
    urls = MD_IMAGE.findall(text) + HTML_IMAGE.findall(text)
    return [u for u in urls if not BADGE_HOST.match(u) and (IMAGE_EXT.search(u) or UPLOAD_HOST.match(u))]


def verdict(files, body, labels=(), draft=False):
    """(ok, message). ok is True when nothing is owed, or what is owed is there."""
    owing = owing_files(files)
    if not owing:
        return True, "nothing drawn was changed: no picture owed"
    if EXEMPT_LABEL in set(labels):
        return True, "labelled `%s`: no picture owed (%d drawn file(s) changed)" % (EXEMPT_LABEL, len(owing))
    found = pictures(body)
    if found:
        return True, "%d picture(s) in the description for %d drawn file(s)" % (len(found), len(owing))
    if draft:
        return True, "a draft: a picture is owed before it is ready (%d drawn file(s) changed)" % len(owing)
    shown = ", ".join(owing[:4]) + (" and %d more" % (len(owing) - 4) if len(owing) > 4 else "")
    return False, (
        "This pull request changes what is drawn (%s) and its description has no picture.\n"
        "Show it: take a picture in the app and put it in the description under \"How I checked it\".\n"
        "  - by hand: run the site, take a screenshot, drag it into the description on GitHub;\n"
        "  - from a machine that has time: `gh workflow run look.yml --ref <your branch> -f probe=smoke`\n"
        "    (tools/README.md, \"A look from a machine that has time\"), then\n"
        "    `tools/pr-pictures.sh <PR number> picture.png ...` puts them in the description for you;\n"
        "  - a before and an after from the same place is worth ten words.\n"
        "If nothing a visitor sees can have changed, ask a maintainer for the label `%s`."
    ) % (shown, EXEMPT_LABEL)


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--files", required=True, help="a file with one changed path a line")
    ap.add_argument("--body", required=True, help="a file with the description")
    ap.add_argument("--labels", default="")
    ap.add_argument("--draft", action="store_true")
    a = ap.parse_args()
    with open(a.files) as fh:
        files = fh.read().splitlines()
    with open(a.body) as fh:
        body = fh.read()
    ok, message = verdict(files, body, [x for x in a.labels.split(",") if x], a.draft)
    print(message)
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main())
