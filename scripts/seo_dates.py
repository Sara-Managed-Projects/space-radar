"""When a page of the site last changed: the sitemap's `lastmod` (growth: real lastmod).

Until now every URL carried the date of the commit the build was made from, which tells a crawler
nothing: a sitemap that says everything changed today is a sitemap whose dates are ignored. A page's
date here is the date of the last commit that touched the file that PRODUCES it:

    the home page        site/index.html
    a trip page          its own ROW of registry/tours.yaml (`git log -L`), else the whole file
    an object page       the files its group is made from (OBJECT_SOURCES below)
    any other page       the files its builder names (page_date(paths))

`git log -1 --format=%cs -- <files>` is the committer date, which a rebase does not make older than
the change really was; with several files, the newest of them. Offline and deterministic: the
history on disk is the only input. WHEN GIT HAS NOTHING (no repository, a shallow clone that holds
one commit, a file that is not tracked yet) the fallback is the date of the commit the build is
made from, then today, exactly as before: a shallow CI clone therefore dates every page alike, and
the real dates come from a deploy on a full clone. tests/test_seo_dates.py builds a repository with
known dates and holds all of this.

A shared change (a template, the card's code, copy/en.js) is NOT counted into every page: it
changes how all pages read, not what any one page is about, and counting it would put the whole
site back on one date.
"""

from __future__ import annotations

import datetime as dt
import re
import subprocess
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")

# The records an object page is made from, by scripts/object_pages.mjs `group`. Every path must exist
# (tests/test_seo_dates.py), so a renamed file cannot quietly turn a group into the fallback.
OBJECT_SOURCES = {
    "worlds": ["registry/worlds.yaml"],
    "craft": ["site/js/data/layers.js"],
    "satellites": ["site/js/data/layers.js"],
    "small": ["site/js/data/layers.js"],
    "sites": ["registry/sites.yaml"],
    "oddities": ["registry/oddities.yaml"],
    "stars": ["site/data/stars3d.names.json", "registry/stars-notable.yaml", "registry/systems.yaml"],
    "exotics": ["registry/exotics.yaml"],
    "deep-sky": ["site/data/dso.json", "registry/dso-hand.yaml"],
}
HOME_SOURCES = ["site/index.html"]
TRIPS_SOURCE = "registry/tours.yaml"


def _git(root: Path, *args: str) -> str:
    try:
        run = subprocess.run(["git", *args], cwd=root, capture_output=True, text=True, timeout=120)
    except (OSError, subprocess.SubprocessError):
        return ""
    return run.stdout.strip() if run.returncode == 0 else ""


def _date(text: str) -> str | None:
    line = text.splitlines()[0].strip() if text else ""
    return line if DATE.match(line) else None


def fallback(root: Path = ROOT) -> str:
    """The commit the build is made from, else today."""
    return _date(_git(root, "log", "-1", "--format=%cs")) or dt.datetime.now(dt.timezone.utc).date().isoformat()


def page_date(paths: list[str], root: Path = ROOT, default: str | None = None) -> str:
    """The newest last-commit date among `paths` (relative to the repository), or the fallback."""
    found = [d for p in paths if (d := _date(_git(root, "log", "-1", "--format=%cs", "--", p)))]
    return max(found) if found else (default or fallback(root))


def trip_dates(ids: list[str], root: Path = ROOT, default: str | None = None) -> dict[str, str]:
    """Each trip's own row in registry/tours.yaml: the row runs from its `- id:` line to the next
    trip's (or the end of the file). `git log -L` follows those lines through the history."""
    default = default or fallback(root)
    path = root / TRIPS_SOURCE
    whole = page_date([TRIPS_SOURCE], root, default)
    if not path.is_file():
        return {i: default for i in ids}
    lines = path.read_text(encoding="utf-8").splitlines()
    starts = {m.group(1): n for n, line in enumerate(lines, 1) if (m := re.match(r"^  - id:\s*([\w-]+)\s*$", line))}
    order = sorted(starts.values())
    out: dict[str, str] = {}
    for trip in ids:
        start = starts.get(trip)
        if start is None:
            out[trip] = whole
            continue
        nxt = next((n for n in order if n > start), len(lines) + 1)
        text = _git(root, "log", "-1", "--format=%cs", "-s", "-L", f"{start},{nxt - 1}:{TRIPS_SOURCE}")
        # `-L` prints the format line first and the (suppressed) patch after; the first line is the date.
        out[trip] = _date(text) or whole
    return out


def object_dates(groups: dict[str, str], root: Path = ROOT, default: str | None = None) -> dict[str, str]:
    """{slug: date} for {slug: group}."""
    default = default or fallback(root)
    by_group = {g: page_date(OBJECT_SOURCES.get(g, []), root, default) for g in set(groups.values())}
    return {slug: by_group[g] for slug, g in groups.items()}
