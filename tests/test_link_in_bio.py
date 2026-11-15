#!/usr/bin/env python3
"""tests/test_link_in_bio.py -- the link-in-bio page's registry (registry/link-in-bio.yaml, internal #106).

Every post is a real door: the file exists in site/, an id is used once, the newest post is first, and a Lab door has a
description to show under the post's title. The page itself is built and held by scripts/check_seo.py.
    python3 tests/test_link_in_bio.py
"""
import datetime as dt
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
doc = yaml.safe_load((ROOT / "registry/link-in-bio.yaml").read_text(encoding="utf-8"))
posts = doc["posts"]
problems = []

if len(posts) < 6:
    problems.append(f"the page lists six posts and the registry has {len(posts)}")
ids = [p["id"] for p in posts]
if len(set(ids)) != len(ids):
    problems.append("a post id is used twice")
dates = [p["posted"] for p in posts]
if not all(isinstance(d, dt.date) for d in dates) or dates != sorted(dates, reverse=True):
    problems.append("the posts are not newest first (posted: YYYY-MM-DD, descending)")
for p in posts:
    where = f"link-in-bio[{p.get('id')}]"
    if not re.match(r"^[a-z0-9][a-z0-9-]*$", str(p.get("id"))):
        problems.append(f"{where}: the id is lower-case letters, digits and dashes (it goes into ?from=ig-<id>)")
    if not str(p.get("title") or "").strip():
        problems.append(f"{where}: no title")
    door = str(p.get("door") or "")
    if not (door.startswith("lab/") or door.startswith("t/")) or ".." in door or "?" in door or "#" in door:
        problems.append(f"{where}: the door is lab/<simulator>/index.html or t/<trip>.html, with no query")
    elif not (ROOT / "site" / door).is_file():
        problems.append(f"{where}: site/{door} does not exist")
    elif door.startswith("lab/") and not re.search(r'<meta name="description" content="[^"]{20,}"', (ROOT / "site" / door).read_text(encoding="utf-8")):
        problems.append(f"{where}: the Lab page has no description to show under the title")
if not isinstance(doc.get("listed_on"), dt.date):
    problems.append("no listed_on date")

if problems:
    print("link-in-bio FAILED:\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"link-in-bio ok: {len(posts)} posts, every door exists, newest first")
