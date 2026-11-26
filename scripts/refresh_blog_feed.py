#!/usr/bin/env python3
"""Refresh registry/blog-feed.json, the committed snapshot of https://blog.spaceradar.ai/feed.json that the static pages' "From the blog"
lists are built from (scripts/seo_common.py from_blog).

    python3 scripts/refresh_blog_feed.py            fetch, write the snapshot, say how many posts
    python3 scripts/refresh_blog_feed.py --if-online   the same, and on ANY failure keep the committed snapshot and exit 0
                                                    (a build must not need the blog to be up)
    ... --out-dir DIR                               write blog-feed.json and media.js into DIR, not into the checkout (what
                                                    scripts/deploy.sh runs; nothing tracked is touched). Nothing is written
                                                    when the feed equals the committed snapshot.
    ... --out-dir DIR --place TREE                  copy DIR's media.js into a built app tree (TREE/js/data/media.js)

Only what a list shows is kept: title, address, date, a short summary, the share picture's address, the tags. No post body.
Nothing personal is sent: one plain GET of a public file.
"""

from __future__ import annotations

import json
import os
import re
import sys
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
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


def option(argv: list[str], name: str) -> str | None:
    return argv[argv.index(name) + 1] if name in argv and argv.index(name) + 1 < len(argv) else None


def place(out_dir: Path, tree: Path) -> int:
    """Put the refreshed media.js (written by --out-dir) into a BUILT copy of the app, `tree`/js/data/media.js, where the
    minifier left the one it made from the committed file; its source map, which describes the old text, goes."""
    src = out_dir / "media.js"
    if not src.is_file():
        print("refresh_blog_feed: no refreshed media.js to place; the built tree keeps the committed one")
        return 0
    dest = tree / "js" / "data" / "media.js"
    if not dest.parent.is_dir():
        print(f"refresh_blog_feed: {dest.parent} is not a folder", file=sys.stderr)
        return 1
    text = re.sub(r"\n?//# sourceMappingURL=\S+\s*$", "\n", src.read_text(encoding="utf-8"))
    dest.write_text(text, encoding="utf-8")
    (dest.parent / "media.js.map").unlink(missing_ok=True)
    print(f"refresh_blog_feed: the built tree has the refreshed {dest.relative_to(tree)}")
    return 0


def main(argv: list[str]) -> int:
    soft = "--if-online" in argv
    out_dir = option(argv, "--out-dir")
    if option(argv, "--place"):
        return place(Path(out_dir or ""), Path(option(argv, "--place")))
    url = os.environ.get("SR_BLOG_FEED_URL") or FEED  # the variable is for tests: a file:// feed
    try:
        with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "space-radar-build"}), timeout=15) as r:
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
        import gen_media  # noqa: PLC0415
        if out_dir:
            # The deploy's way (scripts/deploy.sh): the checkout is never written. The refreshed feed and the media.js made
            # from it go into the build's folder, and the build reads them from there (SR_BLOG_FEED).
            folder = Path(out_dir)
            folder.mkdir(parents=True, exist_ok=True)
            (folder / "blog-feed.json").write_text(text, encoding="utf-8")
            os.environ["SR_BLOG_FEED"] = str(folder / "blog-feed.json")
            gen_media.FEED = folder / "blog-feed.json"
            if gen_media.main(["--out", str(folder / "media.js")]) != 0:
                (folder / "blog-feed.json").unlink()
                print("refresh_blog_feed: media.js could not be made from the feed; the committed snapshot is kept", file=sys.stderr)
                return 0 if soft else 1
        else:
            SNAPSHOT.write_text(text, encoding="utf-8")
            # The card's Pictures and news mirrors the same snapshot (scripts/gen_media.py): written again with it, so a
            # refreshed feed never leaves site/js/data/media.js stale for CI.
            gen_media.main([])
    print(f"refresh_blog_feed: {len(data['items'])} posts, newest {data['items'][0]['date']}")
    return 0


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
