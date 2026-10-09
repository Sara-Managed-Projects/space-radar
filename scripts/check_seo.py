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
  links        every relative .html link on a built page reaches a file.

THE GROWTH PAGES (scripts/seo_pages.py, scripts/seo_share.py), held to the same rules plus:
  every built page  has one <h1>, links the About, Sources and Accuracy pages in its footer, and
               carries a twitter:image equal to its og:image (a card falls back to og:image, but a
               page that forgot one is a page nobody looked at). A trip page or the home page, in
               site/, may leave twitter:image out and must not contradict og:image where it has one.
  an alias     (a page whose canonical is another page, such as /iss/) is not in the sitemap, and its
               canonical is a page that is.
  share pictures  when the build drew them (share-manifest.json), every built page has a picture of
               its own under /share/, which is a 1200 x 630 PNG inside the og_png budgets of
               registry/budgets.yaml, and sitemap-images.xml lists each page with it. When the build
               could not (no Pillow), that is said and the pages keep the pictures they had, unless
               --require-share (CI) is given.
  footer       the home page, the object pages, 404.html, the press page and the embed page each end
               in the shared footer (templates/sitelinks.html): GitHub, Discussions, Instagram,
               LinkedIn, YouTube, About, Sources, Accuracy, Teachers, Satellites, Starlink; our
               accounts as rel="me noopener", no Facebook.
  key file     the IndexNow <key>.txt is in the built tree and holds the key.
  A page of the embed gallery (embed/index.html) is judged like any indexable page above.

Run:  python3 scripts/build_seo.py --out /tmp/seo && python3 scripts/check_seo.py --out /tmp/seo
      python3 scripts/check_seo.py --root <dir> --out <dir>   # another site/ (the refusal tests)
"""

from __future__ import annotations

import html
import json
import os
import re
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import indexnow  # noqa: E402
from seo_footer import REQUIRED_EXTERNAL, REQUIRED_INTERNAL  # noqa: E402

HOST = "https://www.spaceradar.ai"
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
TITLE_MAX = 60
DESC_MIN, DESC_MAX = 70, 160
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Built directories that are not pages of the growth set (the press page has its own builder and test).
NOT_GROWTH = {"o", "press", "share", "embed"}  # press and the embed gallery have their own builders; they are judged by the rules above
FOOTER_PAGES = ("../about/index.html", "../sources/index.html", "../accuracy/index.html")
IMG_NS = "http://www.google.com/schemas/sitemap-image/1.1"


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
        self.footer_links: list[tuple[str, str]] = []  # (href, rel) of every <a> inside a <footer>
        self._footer = 0
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
        elif tag == "footer":
            self._footer += 1
        elif tag == "a" and "href" in a:
            self.hrefs.append(a["href"])
            if self._footer:
                self.footer_links.append((a["href"], a.get("rel", "").lower()))
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag == "footer" and self._footer:
            self._footer -= 1
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


def png_size(path: Path) -> tuple[int, int] | None:
    data = path.read_bytes()[:24]
    if data[:8] != b"\x89PNG\r\n\x1a\n" or data[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", data[16:24])


def budget(root: Path, bid: str, default: int) -> int:
    f = root / "registry" / "budgets.yaml"
    m = re.search(rf"id:\s*{bid},\s*value:\s*(\d+)", f.read_text(encoding="utf-8")) if f.is_file() else None
    return int(m.group(1)) if m else default


ACCOUNTS = [u for u in REQUIRED_EXTERNAL if "/discussions" not in u]


def check_footer(rel: str, h: Head, say) -> None:
    """The site footer (templates/sitelinks.html): the five outside links exactly, the six inside pages by
    their path from the site root, our four accounts as followed links that say they are us, and none
    of the networks the project is not on."""
    hrefs = [href for href, _ in h.footer_links]
    for url in REQUIRED_EXTERNAL:
        if url not in hrefs:
            say(f"{rel}: the footer does not link {url}")
    for path in REQUIRED_INTERNAL:
        if not any(not x.startswith(("http://", "https://")) and x.split("#")[0].lstrip("./").lstrip("/") == path
                   for x in hrefs):
            say(f"{rel}: the footer does not link {path}")
    for url in ACCOUNTS:
        mine = [relattr.split() for href, relattr in h.footer_links if href == url]
        if mine and not any("me" in tokens and "nofollow" not in tokens for tokens in mine):
            say(f"{rel}: no footer link to {url} is rel=\"me noopener\" without nofollow")
    for href in h.hrefs:
        if re.match(r"https?://([a-z0-9-]+\.)*(facebook|fb)\.com", href):
            say(f"{rel}: links to {href}; the project has no Facebook page")


def check(root: Path, built: Path, require_share: bool = False) -> list[str]:
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
    growth = [f for d in sorted(built.iterdir()) if d.is_dir() and d.name not in NOT_GROWTH for f in sorted(d.glob("*.html"))]
    files = [(site, site / "index.html"), (built, built / "404.html")] \
        + [(built, f) for f in sorted((built / "o").glob("*.html"))] \
        + [(built, f) for f in growth] \
        + [(site, f) for f in sorted((site / "t").glob("*.html"))] \
        + ([(built, built / "embed" / "index.html")] if (built / "embed" / "index.html").is_file() else [])
    manifest_f = built / "share-manifest.json"
    manifest = json.loads(manifest_f.read_text(encoding="utf-8")) if manifest_f.is_file() else {"drawn": False}
    drawn = bool(manifest.get("drawn"))
    if require_share and not drawn:
        say("built/share-manifest.json: the share pictures were not drawn (--require-share: install Pillow, fontTools and brotli)")
    share_users: dict[str, str] = {}
    page_images: dict[str, str] = {}
    pic_lo, pic_hi = budget(root, "og_png_min_bytes", 25000), budget(root, "og_png_max_bytes", 400000)
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
        # The growth rules (own twitter:image and share picture, one H1, the footer's pages) are for the pages scripts/seo_pages.py and
        # build_seo.py make; the embed gallery (scripts/seo_embed.py) is judged by the rules above it only.
        growth_page = base == built and f.name != "404.html" and f.parent.name != "embed"
        # The footer is on the home page, the object pages, the 404 page and the pages built beside
        # them; a trip page is a redirect stub with nothing to read and has none.
        if f.parent.name != "t":
            check_footer(rel, h, say)

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

        aliased = bool(h.links.get("canonical")) and h.links["canonical"][0] != url  # judged below
        if title in titles and not aliased:
            say(f"{rel}: the title {title!r} is also {titles[title]}'s")
        if not aliased:
            titles.setdefault(title, rel)

        desc = h.one("description")
        if desc is None:
            say(f"{rel}: no meta description")
        elif not DESC_MIN <= len(desc) <= DESC_MAX:
            say(f"{rel}: the description is {len(desc)} characters, outside {DESC_MIN}-{DESC_MAX}")

        canon = h.links.get("canonical", [])
        alias = False
        if len(canon) != 1:
            say(f"{rel}: {len(canon)} canonical links, not one")
        elif canon[0] != url:
            # An alias (/iss/ for the station's page): its canonical is another page of the sitemap, and it is not in it.
            target = site_file(site, built, canon[0])
            if target is not None and target.is_file() and canon[0] in in_sitemap and url not in in_sitemap and base == built:
                alias = True
            else:
                say(f"{rel}: the canonical is {canon[0]}, not the page's own address {url}")
        if alias:
            continue

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
        tw = h.one("twitter:image")
        if growth_page and not tw:
            say(f"{rel}: no twitter:image")
        elif tw and tw != img:
            say(f"{rel}: twitter:image {tw} is not og:image {img}")
        if growth_page:
            page_images[url] = img or ""
            if drawn:
                if not (img or "").startswith(f"{HOST}/share/"):
                    say(f"{rel}: the build drew a picture for every page and og:image is {img}, not one under /share/")
                elif img in share_users:
                    say(f"{rel}: og:image {img} is also {share_users[img]}'s: a picture of its own, please")
                else:
                    share_users[img] = rel
                    pf = built / img[len(HOST) + 1:]
                    size = png_size(pf) if pf.is_file() else None
                    if size != (1200, 630):
                        say(f"{rel}: {img} is not a 1200 x 630 PNG ({size})")
                    elif not pic_lo <= pf.stat().st_size <= pic_hi:
                        say(f"{rel}: {img} is {pf.stat().st_size} bytes, outside og_png_min_bytes..og_png_max_bytes ({pic_lo}..{pic_hi})")
            if h.h1 != 1:
                say(f"{rel}: {h.h1} <h1> elements, not one")
            for want in FOOTER_PAGES:
                if want not in h.hrefs:
                    say(f"{rel}: the footer does not link {want[3:]}")
        if url not in in_sitemap:
            say(f"{rel} is an indexable page and the sitemap does not list it")

        if growth_page:
            here = f.parent.relative_to(built).as_posix()
            for href in h.hrefs:
                clean = html.unescape(href).split("#")[0].split("?")[0]
                if "://" in href or href.startswith(("#", "/", "mailto:")) or not clean.endswith(".html"):
                    continue
                inside = os.path.normpath(os.path.join(here, clean))
                if not ((built / inside).is_file() or (site / inside).is_file()):
                    say(f"{rel}: the link {href} reaches no file")

    # --- the image sitemap -------------------------------------------------------------------
    ism = built / "sitemap-images.xml"
    robots_text = robots.read_text(encoding="utf-8") if robots.is_file() else ""
    if drawn:
        if not ism.is_file():
            say("built/sitemap-images.xml is missing, and the build drew share pictures")
        else:
            try:
                rows = ET.parse(ism).getroot().findall(f"{{{NS}}}url")
            except ET.ParseError as e:
                rows = []
                say(f"sitemap-images.xml does not parse: {e}")
            listed = {}
            for u in rows:
                loc = (u.findtext(f"{{{NS}}}loc") or "").strip()
                imgs = [(i.findtext(f"{{{IMG_NS}}}loc") or "").strip() for i in u.findall(f"{{{IMG_NS}}}image")]
                listed[loc] = imgs
                if loc not in in_sitemap:
                    say(f"sitemap-images.xml lists {loc}, which sitemap.xml does not")
                if page_images.get(loc) and imgs != [page_images[loc]]:
                    say(f"sitemap-images.xml gives {loc} the picture {imgs}, but the page's og:image is {page_images[loc]}")
            for url, img in page_images.items():
                if url in in_sitemap and url not in listed and img.startswith(f"{HOST}/share/"):
                    say(f"sitemap-images.xml does not list {url}")
        if not re.search(rf"^Sitemap:\s*{re.escape(HOST)}/sitemap-images\.xml\s*$", robots_text, re.M | re.I):
            say(f"site/robots.txt does not name the image sitemap ({HOST}/sitemap-images.xml)")
    elif not require_share:
        print("note: the share pictures were not drawn in this build (--no-share, or no Pillow): pages keep their old pictures", file=sys.stderr)

    # --- pages built beside these that the loop above does not judge as a search result -------------
    press = built / "press" / "index.html"
    if press.is_file():
        h = Head()
        h.feed(press.read_text(encoding="utf-8"))
        check_footer(label(site, built, press), h, say)

    # --- the IndexNow key file: <key>.txt at the root, holding the key (scripts/indexnow.py) ----------
    keyfile = built / indexnow.key_file_name()
    if not keyfile.is_file():
        say(f"built/{indexnow.key_file_name()} is missing: IndexNow cannot check that we own the site")
    elif keyfile.read_text(encoding="utf-8").strip() != indexnow.KEY:
        say(f"built/{indexnow.key_file_name()} does not hold the key")
    if f"{HOST}/{indexnow.key_file_name()}" in in_sitemap:
        say("sitemap.xml lists the IndexNow key file")

    return problems


def main(argv: list[str]) -> int:
    root = Path(__file__).resolve().parent.parent
    built = None
    require_share = False
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--root" and args:
            root = Path(args.pop(0)).resolve()
        elif a == "--out" and args:
            built = Path(args.pop(0)).resolve()
        elif a == "--require-share":
            require_share = True
        else:
            print(f"check_seo: unknown or incomplete option {a}", file=sys.stderr)
            return 2
    if built is None:
        print("usage: python3 scripts/check_seo.py --out DIR [--root DIR]  (DIR from scripts/build_seo.py)",
              file=sys.stderr)
        return 2
    problems = check(root, built, require_share)
    if problems:
        for p in problems[:40]:
            print(p)
        if len(problems) > 40:
            print(f"... and {len(problems) - 40} more")
        print(f"\n{len(problems)} problem(s) a search engine would see")
        return 1
    n = 2 + len(list((built / "o").glob("*.html"))) + len(list((root / "site" / "t").glob("*.html"))) \
        + sum(len(list(d.glob("*.html"))) for d in built.iterdir() if d.is_dir() and d.name not in NOT_GROWTH)
    print(f"SEO ok: {n} pages, robots.txt and the sitemap agree, every title, description, canonical, "
          f"preview picture and JSON-LD block holds")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
