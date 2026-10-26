"""The long reads: what is new in each release, as pages (/read/index.html and /read/<slug>.html).

    from seo_read import articles, pages

A long read is DATA, like every other page this site builds: a row of registry/articles.yaml (its
slug, titles, release, dates, the picture the share card is made from) and a body in
registry/articles/<slug>.md. Adding one is a row, a body and its pictures; nothing here changes.

THE BODY is a small Markdown: paragraphs, `## ` headings, `- ` lists, and one figure form,

    ![what the picture shows, for someone who cannot see it](file-name.webp "the caption")

whose file is site/images/read/<slug>/<file-name>. Inline: [text](url), **bold**, *italic*, `code`.
Nothing else is read, and a raw `<` in a body is shown as text, never as markup.

THE RULES, which tests/test_seo_read.py holds:
  * every picture has alt text, a caption, a file, and is under 300 kB;
  * every article says what is measured and what is not (a heading that starts "Measured");
  * every article links into the map (https://www.spaceradar.ai/#...);
  * a body is 600 to 1 000 words.

Like the other built pages these are not in git as HTML: they are rebuilt from the registry on every
deploy by scripts/build_seo.py, which adds each to the sitemap. The pictures are committed files.
"""

from __future__ import annotations

import datetime as dt
import re
from pathlib import Path

import yaml

from seo_common import Page, esc, url_of, webpage
from seo_share import Spec

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry"
IMAGES = "images/read"
HOST = "https://www.spaceradar.ai"
MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
WORDS_MIN, WORDS_MAX = 600, 1000
IMAGE_MAX_BYTES = 300_000


def articles() -> list[dict]:
    """The rows of registry/articles.yaml, newest release first, each with its body text read from its file."""
    rows = (yaml.safe_load((REG / "articles.yaml").read_text(encoding="utf-8")) or {}).get("articles", [])
    out = []
    for r in rows:
        r = dict(r)
        path = REG / "articles" / f"{r['slug']}.md"
        if not path.is_file():
            raise SystemExit(f"seo_read: {r['slug']} has no body at registry/articles/{r['slug']}.md")
        r["text"] = path.read_text(encoding="utf-8")
        out.append(r)
    return out


def date_words(d: str | dt.date) -> str:
    d = dt.date.fromisoformat(str(d)[:10])
    return f"{d.day} {MONTHS[d.month - 1]} {d.year}"


def webp_size(path: Path) -> tuple[int, int]:
    """(width, height) of a WebP file, read from its header (no imaging library needed at build time)."""
    d = path.read_bytes()[:40]
    if d[:4] != b"RIFF" or d[8:12] != b"WEBP":
        raise SystemExit(f"seo_read: {path} is not a WebP file")
    kind = d[12:16]
    if kind == b"VP8 ":
        return int.from_bytes(d[26:28], "little") & 0x3FFF, int.from_bytes(d[28:30], "little") & 0x3FFF
    if kind == b"VP8X":
        return 1 + int.from_bytes(d[24:27], "little"), 1 + int.from_bytes(d[27:30], "little")
    if kind == b"VP8L":
        b = int.from_bytes(d[21:25], "little")
        return 1 + (b & 0x3FFF), 1 + ((b >> 14) & 0x3FFF)
    raise SystemExit(f"seo_read: {path} has a WebP chunk this reader does not know ({kind!r})")


LINK = re.compile(r"\[([^\]]+)\]\(([^)\s]+)\)")
BOLD = re.compile(r"\*\*(.+?)\*\*")
ITALIC = re.compile(r"(?<![\w*])\*(?![\s*])(.+?)(?<![\s*])\*(?![\w*])")
CODE = re.compile(r"`([^`]+)`")
FIGURE = re.compile(r'^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$')


def inline(text: str) -> str:
    """One run of text to HTML: it is escaped first, so nothing in a body can be markup."""
    s = esc(text)

    def link(m: re.Match) -> str:
        url = m.group(2)
        external = url.startswith("http") and not url.startswith(HOST + "/")
        rel = ' rel="noopener"' if external else ""
        return f'<a href="{url}"{rel}>{m.group(1)}</a>'

    s = LINK.sub(link, s)
    s = CODE.sub(r"<code>\1</code>", s)
    s = BOLD.sub(r"<strong>\1</strong>", s)
    return ITALIC.sub(r"<em>\1</em>", s)


def render_body(slug: str, text: str, root: Path = ROOT) -> str:
    """The body's blocks as HTML. A figure whose file is missing is refused, not skipped."""
    out: list[str] = []
    first_figure = True
    for block in re.split(r"\n\s*\n", text.strip()):
        lines = [x for x in block.strip().splitlines() if x.strip()]
        if not lines:
            continue
        head = lines[0]
        fig = FIGURE.match(head) if len(lines) == 1 else None
        if head.startswith("## "):
            out.append(f"<h2>{inline(head[3:].strip())}</h2>")
        elif head.startswith("### "):
            out.append(f"<h3>{inline(head[4:].strip())}</h3>")
        elif fig:
            alt, name, caption = fig.group(1), fig.group(2), fig.group(3) or ""
            f = root / "site" / IMAGES / slug / name
            if not f.is_file():
                raise SystemExit(f"seo_read: {slug}: the figure {name} is not at site/{IMAGES}/{slug}/")
            if not alt.strip() or not caption.strip():
                raise SystemExit(f"seo_read: {slug}: the figure {name} needs alt text and a caption")
            w, h = webp_size(f)
            lazy = "" if first_figure else ' loading="lazy"'
            first_figure = False
            out.append(f'<figure><img src="../{IMAGES}/{slug}/{esc(name)}" width="{w}" height="{h}" alt="{esc(alt)}"{lazy} decoding="async">'
                       f"<figcaption>{inline(caption)}</figcaption></figure>")
        elif all(x.lstrip().startswith("- ") for x in lines):
            out.append("<ul>" + "".join(f"<li>{inline(x.lstrip()[2:].strip())}</li>" for x in lines) + "</ul>")
        else:
            out.append(f"<p>{inline(' '.join(x.strip() for x in lines))}</p>")
    return "\n".join(out) + "\n"


def word_count(text: str) -> int:
    plain = re.sub(r"!\[[^\]]*\]\([^)]*\)", " ", text)
    plain = re.sub(r"\[([^\]]+)\]\([^)]*\)", r"\1", plain)
    return len(re.findall(r"[A-Za-z0-9][A-Za-z0-9'’.,%\-–]*", plain))


def article_page(a: dict, host: str, others: list[dict]) -> Page:
    slug = a["slug"]
    body_html = render_body(slug, a["text"])
    minutes = max(1, round(word_count(a["text"]) / 220))
    more = [o for o in others if o["slug"] != slug]
    related = "".join(f'<li><a href="{esc(o["slug"])}.html">{esc(o["title"])}</a> <span class="dim">(release {esc(o["release"])})</span></li>' for o in more)
    body = (
        f'<p class="micro">What is new in {esc(a["release"])}</p>\n<h1>{esc(a["title"])}</h1>\n'
        f'<p class="lead">{inline(a["lead"])}</p>\n'
        f'<p class="facts-line">Release {esc(a["release"])} · {esc(date_words(a["published"]))} · about {minutes} minutes</p>\n'
        + body_html
        + '<div class="cta"><a class="live" href="' + esc(a["open"]) + '">' + esc(a["open_label"]) + "</a></div>\n"
        + (f"<h2>More long reads</h2>\n<ul>{related}<li><a href=\"index.html\">All the long reads</a></li></ul>\n" if related else "")
    )
    page = Page(path=f"read/{slug}.html", title=a["short"], description=a["description"], body=body, og_title=a["short"], og_type="article",
                lastmod=str(a["published"]), image_alt=a["hero_alt"])
    image = f"{host}/{IMAGES}/{slug}/{a['hero']}"
    page.jsonld = [webpage(host, page, [("Long reads", "read/index.html"), (a["title"], "")], page_type="Article", extra={
        "headline": a["title"], "datePublished": str(a["published"]), "dateModified": str(a["published"]),
        "image": image, "wordCount": word_count(a["text"]),
        "author": {"@type": "Organization", "name": "Space Radar", "url": f"{host}/"},
        "publisher": {"@type": "Organization", "name": "Space Radar", "url": f"{host}/"},
        "about": {"@type": "SoftwareApplication", "name": "Space Radar", "softwareVersion": a["release"], "url": f"{host}/"},
        "isAccessibleForFree": True})]
    page.share = Spec(key=f"read/{slug}", name=a["title"], number=f"release {a['release']}", caption="Space Radar long read", kind="photo",
                      photo=f"site/{IMAGES}/{slug}/{a['hero']}", credit="Screenshot of Space Radar; sources on the page",
                      alt=a["hero_alt"])
    return page


def index_page(rows: list[dict], host: str) -> Page:
    short = "Long reads: what is new in each Space Radar release"
    desc = "Plain, sourced articles with screenshots on what each Space Radar release added, and what in it is measured, modelled or illustrative."
    items = ""
    for release in sorted({r["release"] for r in rows}, key=lambda v: [int(x) for x in v.split(".")], reverse=True):
        cards = "".join(
            f'<li><h3><a href="{esc(r["slug"])}.html">{esc(r["title"])}</a></h3><p>{esc(r["description"])}</p></li>' for r in rows if r["release"] == release)
        items += f"<h2>Release {esc(release)}</h2>\n<ul class=\"cards\">{cards}</ul>\n"
    body = ('<p class="micro">Long reads</p>\n<h1>What is new in each release</h1>\n'
            '<p class="lead">One release, a few articles: what was added, a picture of it from the map itself, and in every one what is measured, what is modelled and what is only an illustration.</p>\n'
            + items
            + '<p class="dim">Every picture is a screenshot of the live map, taken on a machine with a real browser; the sources and licences are in '
              f'<a href="https://github.com/Sara-Managed-Projects/space-radar/blob/main/CREDITS.md">CREDITS.md</a> and at the foot of each article.</p>\n')
    page = Page(path="read/index.html", title=short, description=desc, body=body, og_title=short)
    page.jsonld = [webpage(host, page, [("Long reads", "")], page_type="CollectionPage"),
                   {"@type": "ItemList", "itemListElement": [{"@type": "ListItem", "position": i, "url": url_of(host, f"read/{r['slug']}.html"), "name": r["title"]}
                                                              for i, r in enumerate(rows, start=1)]}]
    page.share = Spec(key="read/index", name="Long reads", number=f"{len(rows)} articles", caption="Space Radar", kind="plain", colour="#ffc28a",
                      alt="Rings and a dot, captioned Long reads.")
    return page


def pages(host: str) -> list[Page]:
    """The index and every article, or nothing when there is no registry/articles.yaml."""
    if not (REG / "articles.yaml").is_file():
        return []
    rows = articles()
    return [index_page(rows, host)] + [article_page(a, host, rows) for a in rows]
