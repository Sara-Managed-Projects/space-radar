#!/usr/bin/env python3
"""What a search engine reads, checked the way it reads it (spec 0061 task 9).

Every rule here is one a crawler or a search result applies, and each refusal names the file:

Two trees: site/ (committed: the home page, the trip pages, robots.txt, the pictures) and the
directory scripts/build_seo.py built (not committed: the object pages, 404.html, the sitemaps).

  robots.txt   exists, names the sitemap, and does not shut the site out.
  sitemap.xml  is a sitemap INDEX (scripts/seo_sitemaps.py, docs/SEO_SITEMAPS.md): the 0.9 namespace; the main site's
               sitemap-pages.xml and sitemap-images.xml, each built, then exactly the other sites' sitemaps of
               seo_sitemaps.OTHER_SITEMAPS; every <loc> an absolute https URL on a spaceradar.ai host; none twice, none an
               index; a lastmod is YYYY-MM-DD.
  sitemap-pages.xml  is a sitemap (the 0.9 namespace, under 50 000 URLs, a YYYY-MM-DD lastmod each);
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
               No page links a GitHub pull request (forge #91: hidden since 2026-11-04).

THE GROWTH PAGES (scripts/seo_pages.py, scripts/seo_share.py), held to the same rules plus:
  every built page  has one <h1>, links the About, Sources and Accuracy pages in its footer, and
               carries a twitter:image equal to its og:image (a card falls back to og:image, but a
               page that forgot one is a page nobody looked at). A trip page or the home page, in
               site/, may leave twitter:image out and must not contradict og:image where it has one.
  an alias     (a page whose canonical is another page, such as /iss/, or a long read whose
               canonical is on blog.spaceradar.ai) is not in the sitemap; a same-host alias's
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
  llms.txt     llms.txt and llms-full.txt are in the built tree (scripts/seo_llms.py): llms.txt opens with the
               site's title and summary and names every page of the sitemap; llms-full.txt holds each one's text.
  A page of the embed gallery (embed/index.html) is judged like any indexable page above.

THE OTHER LANGUAGES (scripts/seo_i18n.py): check_languages() below. The index lists sitemap-pages-<code>.xml for exactly
the languages with a page, after sitemap-pages.xml and in the app's order; robots.txt names each; every URL of a language
sitemap is a page of the build; every hreflang code is valid; every alternate is reciprocal, in the pages and in the
sitemaps; every language page's canonical is itself, its <html lang>/dir are its language's, it says it was
machine-translated and links the English, and it links its own language's pages where they exist.

Run:  python3 scripts/build_seo.py --out /tmp/seo && python3 scripts/check_seo.py --out /tmp/seo
      python3 scripts/check_seo.py --root <dir> --out <dir>   # another site/ (the refusal tests)
"""

from __future__ import annotations

import html
import json
import os
import posixpath
import re
import struct
import sys
import xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import indexnow  # noqa: E402
import seo_i18n  # noqa: E402  (the languages: their codes and hreflang values)
import seo_sitemaps  # noqa: E402
from seo_footer import REQUIRED_EXTERNAL, REQUIRED_INTERNAL  # noqa: E402

PULL_LINK = re.compile(r"github\.com/[^/\s]+/[^/\s]+/pull/\d")

HOST = "https://www.spaceradar.ai"
BLOG_HOST = "https://blog.spaceradar.ai"
NS = "http://www.sitemaps.org/schemas/sitemap/0.9"
TITLE_MAX = 60
DESC_MIN, DESC_MAX = 70, 160
DATE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
# Built directories that are not pages of the growth set (the press page has its own builder and test).
NOT_GROWTH = {"o", "press", "share", "embed", "lab", "t", *seo_i18n.LANGS}  # press, the embed gallery and the Lab have their own builders; they are judged by the rules above and check_lab()
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
        self.alternates: list[tuple[str, str]] = []  # (hreflang, href) of every <link rel="alternate" hreflang>
        self.html_lang, self.html_dir = "", ""
        self.note: list[str] = []  # the href of the link in the machine-translation note (data-i18n-note)
        self.base = ""  # <base href>, which relative addresses are resolved against
        self._note = False
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
            if a["rel"].lower() == "alternate" and "hreflang" in a:
                self.alternates.append((a["hreflang"], a.get("href", "")))
        elif tag == "base" and "href" in a:
            self.base = a["href"]
        elif tag == "html":
            self.html_lang, self.html_dir = a.get("lang", ""), a.get("dir", "")
        elif tag == "p" and "data-i18n-note" in a:
            self._note = True
        elif tag == "footer":
            self._footer += 1
        elif tag == "a" and "href" in a:
            self.hrefs.append(a["href"])
            if self._note:
                self.note.append(a["href"])
            if self._footer:
                self.footer_links.append((a["href"], a.get("rel", "").lower()))
        elif tag == "h1":
            self.h1 += 1

    def handle_endtag(self, tag):
        if tag == "p":
            self._note = False
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
    robots = built / "robots.txt" if (built / "robots.txt").is_file() else site / "robots.txt"  # the build's names the language sitemaps
    codes = language_codes(built)
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

    # --- sitemap.xml: the index of every site's sitemaps (scripts/seo_sitemaps.py) ---------------------
    smi = built / "sitemap.xml"
    if not smi.is_file():
        say("built/sitemap.xml is missing")
    else:
        try:
            root_el = ET.parse(smi).getroot()
            if root_el.tag != f"{{{NS}}}sitemapindex":
                say(f"sitemap.xml: the root is {root_el.tag}, not a 0.9 sitemapindex (the index of every site's sitemaps)")
            locs = []
            for e in root_el.findall(f"{{{NS}}}sitemap"):
                loc = (e.findtext(f"{{{NS}}}loc") or "").strip()
                lastmod = (e.findtext(f"{{{NS}}}lastmod") or "").strip()
                locs.append(loc)
                if not re.match(r"^https://([a-z0-9-]+\.)*spaceradar\.ai/[^\s]*\.xml$", loc):
                    say(f"sitemap.xml: {loc!r} is not an absolute https address of a sitemap on a spaceradar.ai host")
                if re.search(r"index", loc.rsplit("/", 1)[-1]):
                    say(f"sitemap.xml: {loc} looks like a sitemap index, and an index may not name another")
                if lastmod and not DATE.match(lastmod):
                    say(f"sitemap.xml: {loc} has lastmod {lastmod!r}, not YYYY-MM-DD")
                if loc.startswith(HOST + "/") and not (built / loc[len(HOST) + 1:]).is_file():
                    say(f"sitemap.xml: {loc} names built/{loc[len(HOST) + 1:]}, which does not exist")
            want = seo_sitemaps.own(HOST, [f"sitemap-pages-{c}.xml" for c in codes]) + list(seo_sitemaps.OTHER_SITEMAPS)
            if locs != want:
                say(f"sitemap.xml lists {locs}; it should list, in this order, {want} (scripts/seo_sitemaps.py)")
        except ET.ParseError as e:
            say(f"sitemap.xml does not parse: {e}")

    # --- sitemap-pages.xml: every page of the main site worth indexing -----------------------------
    sitemap_urls: list[str] = []
    sm = built / seo_sitemaps.PAGES
    if not sm.is_file():
        say(f"built/{seo_sitemaps.PAGES} is missing")
    else:
        try:
            tree = ET.parse(sm)
            urlset = tree.getroot()
            if urlset.tag != f"{{{NS}}}urlset":
                say(f"sitemap-pages.xml: the root is {urlset.tag}, not a 0.9 urlset")
            for u in urlset.findall(f"{{{NS}}}url"):
                loc = (u.findtext(f"{{{NS}}}loc") or "").strip()
                lastmod = (u.findtext(f"{{{NS}}}lastmod") or "").strip()
                sitemap_urls.append(loc)
                f = site_file(site, built, loc)
                if f is None:
                    say(f"sitemap-pages.xml: {loc} is not on {HOST}")
                elif not f.is_file():
                    say(f"sitemap-pages.xml: {loc} names {label(site, built, f)}, which does not exist")
                if lastmod and not DATE.match(lastmod):
                    say(f"sitemap-pages.xml: {loc} has lastmod {lastmod!r}, not YYYY-MM-DD")
        except ET.ParseError as e:
            say(f"sitemap-pages.xml does not parse: {e}")
        if len(sitemap_urls) > 50000:
            say(f"sitemap-pages.xml has {len(sitemap_urls)} URLs; one sitemap holds 50 000")
        dupes = sorted({u for u in sitemap_urls if sitemap_urls.count(u) > 1})
        for u in dupes:
            say(f"sitemap-pages.xml lists {u} more than once")
    in_sitemap = set(sitemap_urls)

    # --- llms.txt and llms-full.txt: what a language model reads (scripts/seo_llms.py) ------------------
    llms, full = built / "llms.txt", built / "llms-full.txt"
    if not llms.is_file() or not full.is_file():
        say("llms.txt or llms-full.txt is missing from the build (scripts/seo_llms.py)")
    else:
        lt, ft = llms.read_text(encoding="utf-8"), full.read_text(encoding="utf-8")
        if not lt.startswith("# Space Radar\n\n> "):
            say("llms.txt does not open with the site's title and a one-line summary (# Space Radar, then > ...)")
        named = set(re.findall(r"\]\((https?://[^)\s]+)\)", lt))
        for u in sitemap_urls:
            if u not in named:
                say(f"llms.txt does not name {u}, which the sitemap lists")
            if f"Canonical: {u}\n" not in ft:
                say(f"llms-full.txt has no text for {u}, which the sitemap lists")

    # --- the pages --------------------------------------------------------------------------
    growth = [f for d in sorted(built.iterdir()) if d.is_dir() and d.name not in NOT_GROWTH for f in sorted(d.glob("*.html"))]
    # The trips as deployed: build_seo.py copies them from site/ into the build with their hreflang. The home page is judged as
    # committed (site/index.html): its built copy differs only by that hreflang, which check_languages() holds.
    home = (site, site / "index.html")
    trips = built / "t" if (built / "t").is_dir() else site / "t"
    files = [home, (built, built / "404.html")] \
        + [(built, f) for f in sorted((built / "o").glob("*.html"))] \
        + [(built, f) for f in growth] \
        + [(trips.parent if trips.parent == built else site, f) for f in sorted(trips.glob("*.html"))] \
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
        growth_page = base == built and f.name != "404.html" and f.parent.name not in ("embed", "t") and f != built / "index.html"
        # The footer is on the home page, the object pages, the 404 page and the pages built beside
        # them; a trip page is a redirect stub (its body is the trip's own cards) and has none.
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
            # A long read that lives on the journal: its canonical is on blog.spaceradar.ai, and it is not in the sitemap.
            target = site_file(site, built, canon[0])
            if target is not None and target.is_file() and canon[0] in in_sitemap and url not in in_sitemap and base == built:
                alias = True
            elif canon[0].startswith(BLOG_HOST + "/") and url not in in_sitemap and base == built:
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

        # forge #91: a pull request of the agent's account answers 404 since 2026-11-04 (GitHub hid
        # them); link a release (releases/tag/vX.Y.Z) or the changelog instead.
        for href in h.hrefs:
            if PULL_LINK.search(html.unescape(href)):
                say(f"{rel}: links a pull request, which GitHub no longer shows ({href}); link the release page instead")

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
                    say(f"sitemap-images.xml lists {loc}, which sitemap-pages.xml does not")
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
        say("sitemap-pages.xml lists the IndexNow key file")

    check_lab(site, built, say)
    check_languages(site, built, say, robots.read_text(encoding="utf-8") if robots.is_file() else "")
    return problems


# --- the pages in other languages (scripts/seo_i18n.py) ------------------------------------------------------------

XHTML_NS = "http://www.w3.org/1999/xhtml"
HREFLANG = {code: tag for code, tag in seo_i18n.TAG.items()}
VALID_HREFLANG = set(HREFLANG.values()) | {"x-default"}
SITEMAP_MAX_URLS, SITEMAP_MAX_BYTES = 50000, 50 * 1024 * 1024


def language_codes(built: Path) -> list[str]:
    """The languages this build has pages in: a folder built/<code>/ with an HTML page, in the app's order."""
    return [c for c in seo_i18n.LANGS if (built / c).is_dir() and next((built / c).rglob("*.html"), None) is not None]


def _url_path(url: str) -> str:
    return url[len(HOST) + 1:].split("#")[0] if url.startswith(HOST + "/") else ""


def _file_of(site: Path, built: Path, url: str) -> Path | None:
    rel = _url_path(url)
    if not url.startswith(HOST + "/"):
        return None
    rel = rel or "index.html"
    if rel.endswith("/"):
        rel += "index.html"
    for base in (built, site):
        if (base / rel).is_file():
            return base / rel
    return None


def _lang_of(url: str) -> str:
    first = _url_path(url).split("/")[0]
    return first if first in seo_i18n.LANGS else "en"


def _english_of(url: str) -> str:
    code = _lang_of(url)
    return url if code == "en" else HOST + "/" + _url_path(url)[len(code) + 1:]


def check_alternates(name: str, url: str, alts: list[tuple[str, str]], site: Path, built: Path, say) -> frozenset:
    """One page's (or one sitemap entry's) hreflang set: valid codes, each once; the page itself among them; x-default the
    English page; each a page that exists, in the language its code says. Returns the set, to be compared across pages."""
    seen = {}
    for code, href in alts:
        if code not in VALID_HREFLANG:
            say(f"{name}: hreflang {code!r} is not one of {sorted(VALID_HREFLANG)}")
            continue
        if code in seen:
            say(f"{name}: hreflang {code} is given twice")
        seen[code] = href
        if _file_of(site, built, href) is None:
            say(f"{name}: hreflang {code} names {href}, which is not a page of this build")
        elif code != "x-default" and HREFLANG.get(_lang_of(href)) != code:
            say(f"{name}: hreflang {code} names {href}, a page in {_lang_of(href)}")
    if alts:
        mine = HREFLANG[_lang_of(url)]
        if seen.get(mine) != url:
            say(f"{name}: its hreflang set does not name the page itself ({mine} {url})")
        if seen.get("x-default") != _english_of(url):
            say(f"{name}: hreflang x-default is {seen.get('x-default')}, not the English page {_english_of(url)}")
        if "en" not in seen:
            say(f"{name}: its hreflang set has no English page")
    return frozenset((c, h) for c, h in seen.items())


def _sitemap_rows(f: Path, say) -> list[tuple[str, str, list[tuple[str, str]]]]:
    """(loc, lastmod, [(hreflang, href)]) of each <url>."""
    try:
        root_el = ET.parse(f).getroot()
    except ET.ParseError as e:
        say(f"{f.name} does not parse: {e}")
        return []
    if root_el.tag != f"{{{NS}}}urlset":
        say(f"{f.name}: the root is {root_el.tag}, not a 0.9 urlset")
    rows = []
    for u in root_el.findall(f"{{{NS}}}url"):
        alts = [(x.get("hreflang", ""), x.get("href", "")) for x in u.findall(f"{{{XHTML_NS}}}link") if x.get("rel") == "alternate"]
        rows.append(((u.findtext(f"{{{NS}}}loc") or "").strip(), (u.findtext(f"{{{NS}}}lastmod") or "").strip(), alts))
    return rows


def check_languages(site: Path, built: Path, say, robots_text: str) -> None:
    """The pages in other languages (scripts/seo_i18n.py, docs/SEO_SITEMAPS.md):
      sitemaps   one sitemap-pages-<code>.xml per language with a page, named by robots.txt (and by the index, checked
                 above); under 50 000 URLs and 50 MB; every URL a page of the build in that language, with a YYYY-MM-DD
                 lastmod; every page of the language in it; each entry's xhtml:link alternates valid and reciprocal.
      pages      <html lang> the language's code and dir="rtl" for he and ar ("ltr" otherwise); a canonical that is the page
                 itself; og:url the same; a title of at most 60 characters and (but the Lab's) a description of 70 to 160;
                 hreflang for every version that exists and only those, x-default the English page, reciprocal on every
                 page they name (English pages included); the machine-translation note linking the English original; no
                 link to an English page that exists in the page's own language.
    """
    codes = language_codes(built)
    for code in seo_i18n.LANGS:
        sm = built / f"sitemap-pages-{code}.xml"
        if code in codes and not sm.is_file():
            say(f"built/{sm.name} is missing, and built/{code}/ has pages")
        elif sm.is_file() and code not in codes:
            say(f"built/{sm.name} exists, and built/{code}/ has no page")
        if code in codes and not re.search(rf"^Sitemap:\s*{re.escape(HOST)}/sitemap-pages-{code}\.xml\s*$", robots_text, re.M):
            say(f"robots.txt does not name {HOST}/sitemap-pages-{code}.xml")
    # every hreflang set, from the pages and from the sitemaps, by URL
    page_sets: dict[str, frozenset] = {}
    map_sets: dict[str, frozenset] = {}
    # English pages that carry alternates
    for f in sorted(built.rglob("*.html")):
        rel = f.relative_to(built).as_posix()
        if rel.split("/")[0] in seo_i18n.LANGS:
            continue
        h = Head()
        h.feed(f.read_text(encoding="utf-8"))
        if h.alternates:
            url = HOST + "/" + ("" if rel == "index.html" else rel)
            page_sets[url] = check_alternates(f"built/{rel}", url, h.alternates, site, built, say)
    for loc, _lm, alts in _sitemap_rows(built / seo_sitemaps.PAGES, say) if (built / seo_sitemaps.PAGES).is_file() else []:
        if alts:
            map_sets[loc] = check_alternates(f"sitemap-pages.xml {loc}", loc, alts, site, built, say)
    for code in codes:
        sm = built / f"sitemap-pages-{code}.xml"
        listed = set()
        if sm.is_file():
            if sm.stat().st_size > SITEMAP_MAX_BYTES:
                say(f"{sm.name} is {sm.stat().st_size} bytes; a sitemap holds 50 MB")
            rows = _sitemap_rows(sm, say)
            if len(rows) > SITEMAP_MAX_URLS:
                say(f"{sm.name} has {len(rows)} URLs; one sitemap holds 50 000")
            for loc, lastmod, alts in rows:
                if loc in listed:
                    say(f"{sm.name} lists {loc} more than once")
                listed.add(loc)
                if not loc.startswith(f"{HOST}/{code}/"):
                    say(f"{sm.name}: {loc} is not under {HOST}/{code}/")
                elif not (built / ((_url_path(loc) + "index.html") if loc.endswith("/") else _url_path(loc))).is_file():
                    say(f"{sm.name}: {loc} is not a page of the build")
                if not DATE.match(lastmod):
                    say(f"{sm.name}: {loc} has lastmod {lastmod!r}, not YYYY-MM-DD")
                if not alts:
                    say(f"{sm.name}: {loc} has no xhtml:link alternates")
                map_sets[loc] = check_alternates(f"{sm.name} {loc}", loc, alts, site, built, say)
        for f in sorted((built / code).rglob("*.html")):
            rel = f.relative_to(built).as_posix()
            name = f"built/{rel}"
            inner = rel[len(code) + 1:]
            url = f"{HOST}/{code}/" + ("" if inner == "index.html" else inner)
            h = Head()
            h.feed(f.read_text(encoding="utf-8"))
            # An alias in a language (/es/iss/ for /es/o/international-space-station.html, as /iss/ is for the English page): its
            # canonical is another page of the language's sitemap, and it is not in the sitemap or in any hreflang set itself.
            alias = len(h.links.get("canonical", [])) == 1 and h.links["canonical"][0] != url and h.links["canonical"][0] in listed
            if url not in listed and not alias:
                say(f"{name} is not in {sm.name}")
            if alias and (h.alternates or url in listed):
                say(f"{name}: an alias page ({h.links['canonical'][0]} is its canonical) must carry no hreflang and not be in {sm.name}")
            if h.html_lang != HREFLANG[code]:
                say(f"{name}: <html lang> is {h.html_lang!r}, not {HREFLANG[code]!r}")
            want_dir = "rtl" if code in seo_i18n.RTL else "ltr"
            if h.html_dir != want_dir:
                say(f"{name}: <html dir> is {h.html_dir!r}, not {want_dir!r}")
            canon = h.links.get("canonical", [])
            english = _file_of(site, built, _english_of(url))
            eh = Head()
            if english is not None:
                eh.feed(english.read_text(encoding="utf-8"))
            e_canon = eh.links.get("canonical", [""])[0] if eh.links.get("canonical") else ""
            if len(canon) != 1:
                say(f"{name}: {len(canon)} canonical links, not one")
            elif e_canon in ("", _english_of(url)) and canon[0] != url:
                say(f"{name}: the canonical is {canon[0]}, not the page itself {url}")
            if h.one("og:url") not in (None, url):
                say(f"{name}: og:url is {h.one('og:url')!r}, not {url}")
            title = h.titles[0] if h.titles else ""
            if len(h.titles) != 1 or not title:
                say(f"{name}: {len(h.titles)} <title> elements, or an empty one")
            elif len(title) > TITLE_MAX:
                say(f"{name}: the title is {len(title)} characters, over {TITLE_MAX}: {title!r}")
            desc = h.one("description")
            if not inner.startswith("lab/") and (desc is None or not DESC_MIN <= len(desc) <= DESC_MAX):
                say(f"{name}: the description is {len(desc or '')} characters, outside {DESC_MIN}-{DESC_MAX}")
            for block in h.ld:
                try:
                    json.loads(block)
                except json.JSONDecodeError as e:
                    say(f"{name}: a JSON-LD block does not parse ({e.msg})")
            if not alias:
                if not h.alternates:
                    say(f"{name}: no hreflang alternates")
                page_sets[url] = check_alternates(name, url, h.alternates, site, built, say)
            note_for = _english_of(h.links["canonical"][0]) if alias else _english_of(url)
            if note_for not in h.note:
                say(f"{name}: no machine-translation note linking the English page {note_for}")
            here = posixpath.dirname(rel)
            if h.base and "://" not in h.base and not h.base.startswith("/") and inner != "index.html":
                here = posixpath.normpath(posixpath.join(here, h.base))  # an alias of a page in another folder
            for href in h.hrefs:
                clean = html.unescape(href).split("#")[0].split("?")[0]
                if "://" in href or href.startswith(("/", "mailto:", "#", "data:")) or not (clean.endswith(".html") or clean.endswith("/") or clean == ""):
                    continue
                target = posixpath.normpath(posixpath.join(here, clean or "."))
                if target.split("/")[0] in seo_i18n.LANGS:
                    continue
                own = f"{code}/" + ("index.html" if target in (".", "") else (target + "index.html" if clean.endswith("/") else target))
                if (built / own).is_file():
                    say(f"{name}: links {href}, the English page, and the page is built in {code}: {own}")
    # reciprocity: every page a set names carries the same set, in its HTML and in its sitemap
    for kind, sets in (("page", page_sets), ("sitemap entry", map_sets)):
        for url, group in sets.items():
            for _code, href in group:
                other = sets.get(href)
                if other is None:
                    say(f"{url} names {href} as an alternate, and that {kind} names no alternates")
                elif other != group:
                    say(f"{url} and {href} give different hreflang sets in their {kind}s: not reciprocal")
    for url, group in page_sets.items():
        if url in map_sets and map_sets[url] != group:
            say(f"{url}: its hreflang in the page and in its sitemap differ")


def check_lab(site: Path, built: Path, say) -> None:
    """Every simulator in site/lab/ is built under built/lab/ (scripts/seo_lab.py) with one canonical and og:url at its
    own address, og:title, og:description, an og:image that exists, and one LearningResource block. The description is
    not held to DESC_MIN: it is the contributor's one-sentence lesson, and fourteen are shorter than 70 characters."""
    sims = [p for p in sorted((site / "lab").glob("*/index.html")) if not p.parent.name.startswith("_")]
    if sims and not (built / "lab" / "index.html").is_file():
        say("built/lab/index.html is missing: deploy.sh uploads the Lab from the build")
    for src in sims:
        f = built / "lab" / src.parent.name / "index.html"
        rel = label(site, built, f)
        if not f.is_file():
            say(f"{rel} is missing")
            continue
        h = Head()
        h.feed(f.read_text(encoding="utf-8"))
        url = page_url(built, f)
        if h.links.get("canonical") != [url]:
            say(f"{rel}: the canonical is {h.links.get('canonical')}, not one link to {url}")
        if h.one("og:url") != url:
            say(f"{rel}: og:url is {h.one('og:url')!r}, not {url}")
        for key in ("og:title", "og:description"):
            if not h.one(key):
                say(f"{rel}: no {key}")
        img = h.one("og:image")
        imgf = site_file(site, built, img) if img else None
        if imgf is None or not imgf.is_file():
            say(f"{rel}: og:image {img!r} is not a picture on the site")
        types = []
        for block in h.ld:
            try:
                data = json.loads(block)
            except json.JSONDecodeError:
                say(f"{rel}: a JSON-LD block does not parse")
                continue
            types += [g.get("@type") for g in data.get("@graph", [data])]
        if types.count("LearningResource") != 1:
            say(f"{rel}: {types.count('LearningResource')} LearningResource blocks, not one")


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
