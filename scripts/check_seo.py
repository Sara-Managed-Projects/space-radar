#!/usr/bin/env python3
"""What a search engine reads, checked the way it reads it (spec 0061 task 9).

Every rule here is one a crawler or a search result applies, and each refusal names the file:

Two trees: site/ (committed: the home page, the trip pages, robots.txt, the pictures) and the
directory scripts/build_seo.py built (not committed: the object pages, 404.html, sitemap.xml).

  robots.txt   exists, names the sitemap, and does not shut the site out.
  sitemap.xml  is a sitemap (the 0.9 namespace, under 50 000 URLs, a YYYY-MM-DD lastmod each);
               every URL is on the canonical host and is a file in one of the two trees; no URL twice.
  every page   (site/index.html, site/t/*.html, built/o/*.html, built/404.html) has one <title> of at
               most 60 characters, the length a result shows before it cuts.
  an indexable page (no `noindex`) also has a description of 70 to 160 characters, a canonical URL
               that is its own address, og:title, og:url equal to the canonical, an og:image on the
               canonical host whose file is in site/ with its width and height, and a Twitter card;
               it is in the sitemap, and its title is not another page's.
  a noindex page is not in the sitemap.
  JSON-LD      every block parses, and says it is schema.org.
  links        every relative .html link on an object page reaches a file.

Run:  python3 scripts/build_seo.py --out /tmp/seo && python3 scripts/check_seo.py --out /tmp/seo
      python3 scripts/check_seo.py --root <dir> --out <dir>   # another site/ (the refusal tests)
"""

from __future__ import annotations

import html
import json
import re
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

HOST = "https://www.spaceradar.ai"
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
TITLE_MAX = 60
DESC_MIN, DESC_MAX = 70, 160
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")


class Head(HTMLParser):
    """The parts of a page this check reads, as a crawler would: tags, not regexes over HTML."""

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.titles: list[str] = []
        self.meta: dict[str, list[str]] = {}
        self.links: dict[str, list[str]] = {}
        self.hrefs: list[str] = []
        self.ld: list[str] = []
        self.h1 = 0
        self._in: str | None = None
        self._buf: list[str] = []

    def handle_starttag(self, tag, attrs):
        a = {k: (v or "") for k, v in attrs}
        if tag == "title":
            self._in, self._buf = "title", []
        elif tag == "script" and a.get("type") == "application/ld+json":
            self._in, self._buf = "ld", []
        elif tag == "meta":
            key = a.get("property") or a.get("name") or a.get("http-equiv")
            if key:
                self.meta.setdefault(key.lower(), []).append(a.get("content", ""))
        elif tag == "link" and a.get("rel"):
            self.links.setdefault(a["rel"].lower(), []).append(a.get("href", ""))
        elif tag == "a" and "href" in a:
            self.hrefs.append(a["href"])
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if self._in == "title" and tag == "title":
            self.titles.append("".join(self._buf).strip())
            self._in = None
        elif self._in == "ld" and tag == "script":
            self.ld.append("".join(self._buf))
            self._in = None

    def handle_data(self, data):
        if self._in:
            self._buf.append(data)

    def one(self, key: str) -> str | None:
        v = self.meta.get(key)
        return v[0] if v else None


def site_file(site: Path, built: Path, url: str) -> Path | None:
    """The file a URL on the canonical host is served from (the built tree first), or None for
    another host."""
    if not url.startswith(HOST + "/"):
        return None
    path = url[len(HOST) + 1:].split("#")[0].split("?")[0] or "index.html"
    return built / path if (built / path).is_file() else site / path


def label(site: Path, built: Path, f: Path) -> str:
    """How a refusal names a file: site/<path> or built/<path>."""
    for name, base in (("built", built), ("site", site)):
        try:
            return f"{name}/{f.relative_to(base).as_posix()}"
        except ValueError:
            continue
    return str(f)


def page_url(base: Path, f: Path) -> str:
    rel = f.relative_to(base).as_posix()
    return f"{HOST}/" if rel == "index.html" else f"{HOST}/{rel}"


def check(root: Path, built: Path) -> list[str]:
    site = root / "site"
    problems: list[str] = []
    say = problems.append

    # --- robots.txt -------------------------------------------------------------------------
    robots = site / "robots.txt"
    if not robots.is_file():
        say("site/robots.txt is missing")
    else:
        text = robots.read_text(encoding="utf-8")
        if not re.search(rf"^Sitemap:\s*{re.escape(HOST)}/sitemap\.xml\s*$", text, re.M | re.I):
            say(f"site/robots.txt does not name the sitemap ({HOST}/sitemap.xml)")
        groups = re.split(r"(?im)^user-agent:", text)
        for g in groups[1:]:
            agent = g.splitlines()[0].strip()
            if agent == "*" and re.search(r"(?im)^disallow:\s*/\s*$", g):
                say("site/robots.txt shuts every crawler out of the whole site (Disallow: /)")

    # --- sitemap.xml ------------------------------------------------------------------------
    sitemap_urls: list[str] = []
    sm = built / "sitemap.xml"
    if not sm.is_file():
        say("built/sitemap.xml is missing")
    else:
        try:
            tree = ET.parse(sm)
            urlset = tree.getroot()
            if urlset.tag != f"{{{NS}}}urlset":
                say(f"sitemap.xml: the root is {urlset.tag}, not a 0.9 urlset")
            for u in urlset.findall(f"{{{NS}}}url"):
                loc = (u.findtext(f"{{{NS}}}loc") or "").strip()
                lastmod = (u.findtext(f"{{{NS}}}lastmod") or "").strip()
                sitemap_urls.append(loc)
                f = site_file(site, built, loc)
                if f is None:
                    say(f"sitemap.xml: {loc} is not on {HOST}")
                elif not f.is_file():
                    say(f"sitemap.xml: {loc} names {label(site, built, f)}, which does not exist")
                if lastmod and not DATE.match(lastmod):
                    say(f"sitemap.xml: {loc} has lastmod {lastmod!r}, not YYYY-MM-DD")
        except ET.ParseError as e:
            say(f"sitemap.xml does not parse: {e}")
        if len(sitemap_urls) > 50000:
            say(f"sitemap.xml has {len(sitemap_urls)} URLs; one sitemap holds 50 000")
        dupes = sorted({u for u in sitemap_urls if sitemap_urls.count(u) > 1})
        for u in dupes:
            say(f"sitemap.xml lists {u} more than once")
    in_sitemap = set(sitemap_urls)

    # --- the pages --------------------------------------------------------------------------
    files = [(site, site / "index.html"), (built, built / "404.html")] \
        + [(built, f) for f in sorted((built / "o").glob("*.html"))] \
        + [(site, f) for f in sorted((site / "t").glob("*.html"))]
    if not list((built / "o").glob("*.html")):
        say("built/o/ has no object pages")
    titles: dict[str, str] = {}
    for base, f in files:
        rel = label(site, built, f)
        if not f.is_file():
            say(f"{rel} is missing")
            continue
        h = Head()
        h.feed(f.read_text(encoding="utf-8"))
        url = page_url(base, f)

        if len(h.titles) != 1:
            say(f"{rel}: {len(h.titles)} <title> elements, not one")
        title = h.titles[0] if h.titles else ""
        if not title:
            say(f"{rel}: the title is empty")
        elif len(title) > TITLE_MAX:
            say(f"{rel}: the title is {len(title)} characters, over {TITLE_MAX}: {title!r}")

        for block in h.ld:
            try:
                data = json.loads(block)
            except json.JSONDecodeError as e:
                say(f"{rel}: a JSON-LD block does not parse ({e.msg} at {e.pos})")
                continue
            ctx = data.get("@context") if isinstance(data, dict) else None
            if ctx not in ("https://schema.org", "http://schema.org", "https://schema.org/"):
                say(f"{rel}: a JSON-LD block has @context {ctx!r}, not schema.org")

        noindex = any("noindex" in v.lower() for v in h.meta.get("robots", []))
        if noindex:
            if url in in_sitemap:
                say(f"{rel} says noindex and the sitemap lists it")
            continue

        if title in titles:
            say(f"{rel}: the title {title!r} is also {titles[title]}'s")
        titles.setdefault(title, rel)

        desc = h.one("description")
        if desc is None:
            say(f"{rel}: no meta description")
        elif not DESC_MIN <= len(desc) <= DESC_MAX:
            say(f"{rel}: the description is {len(desc)} characters, outside {DESC_MIN}-{DESC_MAX}")

        canon = h.links.get("canonical", [])
        if len(canon) != 1:
            say(f"{rel}: {len(canon)} canonical links, not one")
        elif canon[0] != url:
            say(f"{rel}: the canonical is {canon[0]}, not the page's own address {url}")

        if not h.one("og:title"):
            say(f"{rel}: no og:title")
        if h.one("og:url") != url:
            say(f"{rel}: og:url is {h.one('og:url')!r}, not {url}")
        img = h.one("og:image")
        if not img:
            say(f"{rel}: no og:image")
        else:
            imgf = site_file(site, built, img)
            if imgf is None:
                say(f"{rel}: og:image {img} is not on {HOST}")
            elif not imgf.is_file():
                say(f"{rel}: og:image {img} names {label(site, built, imgf)}, which does not exist")
            if not (h.one("og:image:width") and h.one("og:image:height")):
                say(f"{rel}: og:image has no width and height")
        if h.one("twitter:card") not in ("summary", "summary_large_image"):
            say(f"{rel}: no twitter:card")
        if url not in in_sitemap:
            say(f"{rel} is an indexable page and the sitemap does not list it")

        if f.parent.name == "o":
            if h.h1 != 1:
                say(f"{rel}: {h.h1} <h1> elements, not one")
            for href in h.hrefs:
                if "://" in href or href.startswith(("#", "../", "/", "mailto:")):
                    continue
                target = (f.parent / html.unescape(href).split("#")[0])
                if href.endswith(".html") and not target.is_file():
                    say(f"{rel}: the link {href} reaches no file")

    return problems


def main(argv: list[str]) -> int:
    root = Path(__file__).resolve().parent.parent
    built = None
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--root" and args:
            root = Path(args.pop(0)).resolve()
        elif a == "--out" and args:
            built = Path(args.pop(0)).resolve()
        else:
            print(f"check_seo: unknown or incomplete option {a}", file=sys.stderr)
            return 2
    if built is None:
        print("usage: python3 scripts/check_seo.py --out DIR [--root DIR]  (DIR from scripts/build_seo.py)",
              file=sys.stderr)
        return 2
    problems = check(root, built)
    if problems:
        for p in problems[:40]:
            print(p)
        if len(problems) > 40:
            print(f"... and {len(problems) - 40} more")
        print(f"\n{len(problems)} problem(s) a search engine would see")
        return 1
    n = 2 + len(list((built / "o").glob("*.html"))) + len(list((root / "site" / "t").glob("*.html")))
    print(f"SEO ok: {n} pages, robots.txt and the sitemap agree, every title, description, canonical, "
          f"preview picture and JSON-LD block holds")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
