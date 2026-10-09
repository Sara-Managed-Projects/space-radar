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
CloudFront setting (a function that appends `index.html`), Ivan's, and nothing here depends on it.
"""

from __future__ import annotations

import dataclasses
import html
import json
import re
from pathlib import Path

from seo_share import Spec

ROOT = Path(__file__).resolve().parent.parent
TEMPLATES = ROOT / "templates"
SITE = ROOT / "site"
DEFAULT_HOST = "https://www.spaceradar.ai"
GITHUB = "https://github.com/Sara-Managed-Projects/space-radar"
CLASSROOM_FORM = f"{GITHUB}/issues/new?template=classroom.yml"
ACCURACY_FORM = f"{GITHUB}/issues/new?template=data-accuracy.yml"
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
    """The one shared footer partial (templates/sitelinks.html, scripts/seo_footer.py); every page here is one level below the root."""
    from seo_footer import sitelinks
    return sitelinks("../")


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
    style: str
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
    style = (TEMPLATES / "seo.css").read_text(encoding="utf-8") + (TEMPLATES / "pages.css").read_text(encoding="utf-8")
    return Ctx(host=host, template=(TEMPLATES / "page.html").read_text(encoding="utf-8"), style=style,
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


def render(page: Page, ctx: Ctx) -> str:
    rel, w, h, alt = ctx.image(page)
    url = url_of(ctx.host, page.path)
    canonical = page.canonical or url
    graph = {"@context": "https://schema.org", "@graph": page.jsonld}
    footer = fill(ctx.footer, {"footer_before": page.foot, "footer_nav": footer_nav()})
    script = ""
    if page.live:
        script = '<script type="module" src="../js/pages/live.js"></script>\n'
    out = fill(ctx.template, {
        "title": esc(page.title), "description": esc(page.description),
        "robots": f'<meta name="robots" content="{esc(page.robots)}">\n' if page.robots else "",
        "canonical": esc(canonical), "og_type": page.og_type, "og_title": esc(page.og_title or page.title),
        "url": esc(url), "image": esc(f"{ctx.host}/{rel}"), "image_w": str(w), "image_h": str(h), "image_alt": esc(alt),
        "icon": ICON, "style": ctx.style,
        "jsonld": json.dumps(graph, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/"),
        "header": ctx.header, "live_attr": f' data-live="{esc(page.live)}"' if page.live else "",
        "body": page.body, "footer": footer, "script": script + page.extra_script,
    })
    return out


def place_picker(hint: str = "") -> str:
    """The place controls the live pages share: a city list. These pages never ask the browser where it is: only the map's Tonight view does (ui/place.js)."""
    return ('<div class="place"><label for="place-select">Choose a city</label>'
            '<select id="place-select" data-slot="place-select"></select></div>\n'
            f'<p class="dim"><span data-slot="place-note">{esc(hint)}</span> <span data-slot="place"></span></p>\n')


def sentence_case(s: str) -> str:
    return s[:1].upper() + s[1:]
