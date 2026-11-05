#!/usr/bin/env python3
"""Refresh registry/blog-feed.json, the committed snapshot of https://blog.spaceradar.ai/feed.json that the static pages' "From the blog"
lists are built from (scripts/seo_common.py from_blog).

    python3 scripts/refresh_blog_feed.py            fetch, write the snapshot, say how many posts
    python3 scripts/refresh_blog_feed.py --if-online   the same, and on ANY failure keep the committed snapshot and exit 0
                                                    (what scripts/deploy.sh runs: a build must not need the blog to be up)

Only what a list shows is kept: title, address, date, a short summary, the share picture's address, the tags. No post body.
Nothing personal is sent: one plain GET of a public file.
"""

from __future__ import annotations

import json
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "registry" / "blog-feed.json"
FEED = "https://blog.spaceradar.ai/feed.json"


def trim(text: str, n: int = 170) -> str:
    text = re.sub(r"\s+", " ", (text or "").replace("—", ",").replace("–", "-")).strip()
    if len(text) <= n:
        return text
    cut = text[:n].rsplit(" ", 1)[0].rstrip(",;:")
    return cut + "..."


def snapshot(feed: dict) -> dict:
    items = [{"title": i["title"], "url": i["url"], "date": i["date_published"][:10], "summary": trim(i.get("summary", "")),
              "image": i.get("image", ""), "tags": list(i.get("tags") or [])} for i in feed["items"]]
    return {"source": FEED, "title": feed.get("title", ""), "items": sorted(items, key=lambda i: i["date"], reverse=True)}


def main(argv: list[str]) -> int:
    soft = "--if-online" in argv
    try:
        with urllib.request.urlopen(urllib.request.Request(FEED, headers={"User-Agent": "space-radar-build"}), timeout=15) as r:
            data = snapshot(json.load(r))
        if not data["items"]:
            raise ValueError("the feed has no items")
    except Exception as e:  # noqa: BLE001 - offline, DNS, a bad body: all the same to a build
        if soft:
            print(f"refresh_blog_feed: kept the committed snapshot ({e})")
            return 0
        print(f"refresh_blog_feed: {e}", file=sys.stderr)
        return 1
    text = json.dumps(data, ensure_ascii=False, indent=1) + "\n"
    if not SNAPSHOT.is_file() or SNAPSHOT.read_text(encoding="utf-8") != text:
        SNAPSHOT.write_text(text, encoding="utf-8")
    print(f"refresh_blog_feed: {len(data['items'])} posts, newest {data['items'][0]['date']}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
