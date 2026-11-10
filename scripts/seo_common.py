"""What every page scripts/seo_pages.py and scripts/seo_systems.py build has in common: the chrome, the head, the JSON-LD
helpers and the place a share picture is named. Imported by those two and by build_seo.py; builds nothing itself.

THE CHROME: templates/partials/header.html, and the footer's links, which are templates/sitelinks.html
(scripts/seo_footer.py): the one partial every page of the site fills, built or committed. A link added
to the footer is one edit there.

PATHS. Every page built here is one directory below the site's root (`starlink/index.html`,
`events/leonids-2026.html`, `o/kepler-186.html`), so `../` is the root from all of them, in the
site and under the `/site/` prefix every local check uses. A directory URL (`/starlink/`) is NOT
served by the origin (S3's REST endpoint has no index documents: scripts/build_seo.py says why), so
pages link to each other by `…/index.html`, as the press page does. Making `/starlink/` answer is a
CloudFront setting (a function that appends `index.html`), the maintainer's, and nothing here depends on it.
"""

from __future__ import annotations

import dataclasses
import datetime as dt
import html
import json
import re
from pathlib import Path

from seo_chrome import footer, has_action, header, styles
from seo_share import Spec
from seo_subscribe import script as subscribe_script

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
SITE = ROOT / "site"
DEFAULT_HOST = "https://www.spaceradar.ai"
GITHUB = "https://github.com/Sara-Managed-Projects/space-radar"
CLASSROOM_FORM = f"{GITHUB}/issues/new?template=classroom.yml"
ACCURACY_FORM = f"{GITHUB}/issues/new?template=data-accuracy.yml"
# forge #91: the forms work, but only for a visitor signed in to GitHub (asked 2026-11-08: the form
# answers 302 to github.com/login). The project has no mail address and no public tracker of its own
# yet, so a page says so beside every form link instead of promising more than it gives.
ON_GITHUB = "on GitHub (it needs a free GitHub account)"
ACCOUNTS = [
    ("YouTube", "https://www.youtube.com/@SpaceRadar_ai"),
    ("Instagram", "https://www.instagram.com/spaceradar.ai/"),
    ("LinkedIn", "https://www.linkedin.com/company/spaceradar-ai"),
    ("GitHub", GITHUB),
]
ICON = ("data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'>"
        "<rect width='64' height='64' rx='12.5' fill='%230B0E14'/>"
        "<circle cx='32' cy='32' r='14.38' fill='%232E6FB8'/>"
        "<path d='M39.82 19.94A16.38 16.38 0 0 0 25.51 44.83A14.38 14.38 0 0 0 39.82 19.94Z' fill='%23123255'/>"
        "<path d='M10.09 35.86A22.25 22.25 0 0 1 49.04 17.7' stroke='%23FF9F43' stroke-width='5.25' "
        "stroke-linecap='round' fill='none'/></svg>")
FALLBACK_IMAGE = ("og/default.png", 1200, 630,
                  "The Earth from space with the satellites around it as points of light, captioned Space Radar.")

esc = lambda s: html.escape(str(s), quote=True)  # noqa: E731


def slug_of(name: str) -> str:
    """scripts/object_pages.mjs slugOf(): the same name gives the same address in both."""
    import unicodedata
    s = unicodedata.normalize("NFKD", name)
    s = "".join(c for c in s if not unicodedata.combining(c)).lower()
    s = re.sub(r"[ʻ'’]", "", s).replace("*", "-star").replace("+", "-plus-")
    s = re.sub(r"[^a-z0-9]+", "-", s).strip("-")
    s = re.sub(r"^the-", "", s)
    return s or "object"


def fill(template: str, values: dict[str, str]) -> str:
    out = re.sub(r"\{\{(\w+)\}\}", lambda m: values[m.group(1)], template)
    return out


def footer_nav() -> str:
    """The one shared footer partial (templates/sitelinks.html, scripts/seo_footer.py) in the kit's columns; every page here is one level below the root."""
    from seo_footer import footer_columns
    return footer_columns("../")


@dataclasses.dataclass
class Page:
    path: str                         # "starlink/index.html", relative to the output directory
    title: str                        # <= 60 characters
    description: str                  # 70 to 160
    body: str                         # the <main> content
    jsonld: list = dataclasses.field(default_factory=list)   # nodes of one @graph
    og_title: str = ""
    og_type: str = "website"
    share: Spec | None = None         # the picture, when it can be drawn
    live: str = ""                    # data-live kind for site/js/pages/live.js
    foot: str = ""                    # lines above the footer's links
    robots: str = ""
    canonical: str = ""               # an absolute address, when it is not the page's own
    lastmod: str = ""                 # YYYY-MM-DD for the sitemap; "" lets the sitemap decide
    in_sitemap: bool = True
    image_alt: str = ""
    extra_script: str = ""
    kind: str = "page"                # page | object | system | event | alias


@dataclasses.dataclass
class Ctx:
    host: str
    template: str
    header: str
    footer: str
    shares: dict                      # share key -> relative path of a picture that was drawn
    fallback: tuple = FALLBACK_IMAGE

    def image(self, page: Page) -> tuple[str, int, int, str]:
        if page.share is not None and page.share.key in self.shares:
            return page.share.rel, 1200, 630, page.share.alt or f"{page.share.name}, {page.share.number}".strip(", ")
        rel, w, h, alt = self.fallback
        return rel, w, h, alt


def make_ctx(host: str, shares: dict) -> Ctx:
    return Ctx(host=host, template=(TEMPLATES / "page.html").read_text(encoding="utf-8"),
               header=(TEMPLATES / "partials" / "header.html").read_text(encoding="utf-8"),
               footer=(TEMPLATES / "partials" / "footer.html").read_text(encoding="utf-8"), shares=shares)


def url_of(host: str, path: str) -> str:
    return f"{host}/{path}"


def crumbs(host: str, trail: list[tuple[str, str]]) -> dict:
    """BreadcrumbList: Space Radar, then each (name, path or '') of the trail."""
    items = [{"@type": "ListItem", "position": 1, "name": "Space Radar", "item": f"{host}/"}]
    for i, (name, path) in enumerate(trail, start=2):
        item = {"@type": "ListItem", "position": i, "name": name}
        if path:
            item["item"] = f"{host}/{path}"
        items.append(item)
    return {"@type": "BreadcrumbList", "itemListElement": items}


def webpage(host: str, page: Page, trail: list[tuple[str, str]], page_type: str = "WebPage", extra: dict | None = None) -> dict:
    url = url_of(host, page.path)
    node = {"@type": page_type, "@id": url, "url": url, "name": page.title, "description": page.description,
            "inLanguage": "en", "isPartOf": {"@id": f"{host}/#website"}, "breadcrumb": crumbs(host, trail)}
    node.update(extra or {})
    return node


# THE PAGE HEAD (the journal's listing head, .ph): what a builder writes first, the eyebrow, the one H1, the lead and
# the page's own action or dated line, is lifted into a head band over the reading column; the rest is the column
# (.doc). Builders keep writing plain HTML in that order: this is the one place the layout is decided.
HEAD = re.compile(r'\A\s*((?:<p class="eyebrow">.*?</p>\s*)?<h1>.*?</h1>\s*'
                  r'(?:(?:<p class="lead">.*?</p>|<p class="facts-line">.*?</p>|<div class="cta">(?:(?!</div>).)*</div>)\s*)*)', re.S)


def layout(body: str, foot: str = "") -> str:
    """The body as the head band and the reading column, the page's own note at the column's end."""
    m = HEAD.match(body)
    head, rest = (m.group(1).strip(), body[m.end():]) if m else ("", body)
    note = f'<div class="pagenote">{foot.strip()}</div>\n' if foot.strip() else ""
    band = f'<header class="ph"><div class="wrap ph__in">\n{head}\n</div></header>\n' if head else ""
    return f'{band}<div class="doc">\n{rest}{note}</div>\n'


def render(page: Page, ctx: Ctx) -> str:
    rel, w, h, alt = ctx.image(page)
    url = url_of(ctx.host, page.path)
    canonical = page.canonical or url
    graph = {"@context": "https://schema.org", "@graph": page.jsonld}
    body = page.body + blog_for(page)
    script = ""
    if page.live:
        script = '<script type="module" src="../js/pages/live.js"></script>\n'
    script += subscribe_script("../")
    out = fill(ctx.template, {
        "title": esc(page.title), "description": esc(page.description),
        "robots": f'<meta name="robots" content="{esc(page.robots)}">\n' if page.robots else "",
        "canonical": esc(canonical), "og_type": page.og_type, "og_title": esc(page.og_title or page.title),
        "url": esc(url), "image": esc(f"{ctx.host}/{rel}"), "image_w": str(w), "image_h": str(h), "image_alt": esc(alt),
        "icon": ICON, "styles": styles("../"),
        "jsonld": json.dumps(graph, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
        "header": header("../", ember=not has_action(body)), "live_attr": f' data-live="{esc(page.live)}"' if page.live else "",
        "body": layout(body, page.foot), "footer": footer("../", url), "script": script + page.extra_script,
    })
    return out


def place_picker(hint: str = "") -> str:
    """The place controls the live pages share: a city list. These pages never ask the browser where it is: only the map's Tonight view does (ui/place.js)."""
    return ('<div class="place"><label for="place-select">Choose a city</label>'
            '<select id="place-select" data-slot="place-select"></select></div>\n'
            f'<p class="dim"><span data-slot="place-note">{esc(hint)}</span> <span data-slot="place"></span></p>\n')


BLOG = "https://blog.spaceradar.ai/"
BLOG_SNAPSHOT = ROOT / "registry" / "blog-feed.json"


def from_blog(keywords: tuple[str, ...] = (), limit: int = 3, skip: str = "") -> str:
    """The "From the blog" list: the posts of the committed snapshot (scripts/refresh_blog_feed.py) that mention a keyword, newest first,
    topped up with the newest others to `limit`. `skip` is the address of a post not to offer (the page's own). "" when there is no snapshot."""
    if not BLOG_SNAPSHOT.is_file():
        return ""
    posts = [p for p in json.loads(BLOG_SNAPSHOT.read_text(encoding="utf-8"))["items"] if p["url"] != skip]
    hay = lambda p: " ".join([p["title"], p["summary"], *p["tags"]]).lower()  # noqa: E731
    hits = [p for p in posts if any(k.lower() in hay(p) for k in keywords)]
    pick = (hits + [p for p in posts if p not in hits])[:limit]
    if not pick:
        return ""
    cards = "".join(f'<li><h3><a href="{esc(p["url"])}">{esc(p["title"])}</a></h3><p>{esc(p["summary"])}</p>'
                    f'<p class="meta">{esc(dt.date.fromisoformat(p["date"]).strftime("%-d %B %Y"))}</p></li>' for p in pick)
    return (f'<section class="fromblog" aria-labelledby="fromblog-h"><h2 id="fromblog-h">From the blog</h2>\n<ul class="cards">{cards}</ul>\n'
            f'<p class="dim"><a href="{BLOG}">All posts on the Space Radar blog</a></p></section>\n')


# What each kind of page offers from the blog: (path prefix, keywords, how many). The first prefix that matches wins.
BLOG_FOR = [("read/index", (), 6), ("read/", (), 3), ("teachers/", ("classroom", "teacher", "offline", "guided trips"), 3),
            ("starlink/", ("starlink", "satellites"), 3), ("satellites/", ("satellite", "accuracy", "tracking"), 3),
            ("planets-tonight/", ("tonight", "skywatching", "stargazing"), 3), ("events/", ("eclipse", "skywatching"), 3),
            ("accuracy/", ("accuracy", "tle"), 3), ("about/", (), 3), ("o/international-space-station", ("iss",), 3), ("iss/", ("iss",), 3)]


def blog_for(page: "Page") -> str:
    for prefix, keywords, limit in BLOG_FOR:
        if page.path.startswith(prefix):
            return from_blog(keywords, limit, skip=page.canonical)
    return ""


def sentence_case(s: str) -> str:
    return s[:1].upper() + s[1:]
