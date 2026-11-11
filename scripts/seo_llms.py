"""llms.txt and llms-full.txt for www.spaceradar.ai: what a language model reads to know the site (llmstxt.org).

    write(out, host)   reads the sitemap the build just wrote (out/sitemap.xml) and every page it names (built under
                       `out`, or committed under site/: the trips and the Lab), and writes out/llms.txt and out/llms-full.txt

THE SHAPE is the journal's (internal blog/src/site-build.mjs): a title, a one-line summary as a quote, a paragraph on
how to read the site, then sections of `- [title](url): description`, ending with an "Optional" section. llms-full.txt
is the text of every page in the sitemap, in the same order, each under its title and its address. Both are made from
the pages themselves, so a page that is built is listed, and one that leaves the sitemap leaves them too.
scripts/check_seo.py refuses a build without them, or with a page of the sitemap that llms.txt does not name.
"""

from __future__ import annotations

import html
import re
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
SUMMARY = ("A free, open-source live 3D map of space in the browser: satellites and the space station, launches, probes, "
           "planets, stars and galaxies, each drawn where it really is, with where every number comes from.")
INTRO = ("Every page below is plain HTML that reads with no script. The map itself is at {host}/ and runs in the visitor's "
         "own browser from public catalogues; the pages say what each thing is and never where it is at the moment they "
         "were built (the map works that out live). The full text of every page is at {host}/llms-full.txt. Code, data "
         "sources and licences: https://github.com/Sara-Managed-Projects/space-radar (MIT).")
# Sections in order: (heading, test on the path from the root). The first that matches takes the page.
SECTIONS = [
    ("The map and the project", lambda p: p in ("", "about/index.html", "sources/index.html", "accuracy/index.html", "privacy/index.html",
                                               "press/index.html", "embed/index.html", "creators/index.html", "assets/index.html",
                                               "support/index.html", "first-pull-request/index.html")),
    ("For classrooms", lambda p: p.startswith(("teachers/", "print/"))),
    ("Live pages", lambda p: p.startswith(("iss/", "starlink/", "satellites/", "planets-tonight/"))),
    ("Sky events", lambda p: p.startswith("events/")),
    ("Guided trips", lambda p: p.startswith("t/")),
    ("Space simulators (the Lab)", lambda p: p.startswith("lab/")),
    ("Long reads", lambda p: p.startswith("read/")),
    ("Satellites by country", lambda p: p.startswith("country/")),
    ("Comparisons", lambda p: p.endswith("-alternative/index.html") or p.startswith(("spaceengine-", "space-simulator-", "live-satellite-tracker-",
                                                                                     "nasa-eyes-", "solar-system-scope-"))),
    ("Objects and star systems", lambda p: p.startswith("o/")),
    ("More pages", lambda p: True),
]
OPTIONAL = [
    ("The Space Radar journal", "https://blog.spaceradar.ai/", "stories about space and how the map knows what it shows (its own llms.txt is at https://blog.spaceradar.ai/llms.txt)"),
    ("Space Radar games", "https://games.spaceradar.ai/", "the team's space games"),
    ("Source code", "https://github.com/Sara-Managed-Projects/space-radar", "the map, these pages and every data source, MIT licence"),
    ("Sitemap", "{host}/sitemap.xml", "every page listed here, with its date"),
]


class _Page(HTMLParser):
    """The title, the description and the text of <main> as light Markdown, as a reader would take them. A form (the
    subscribe card), a script, a hidden block and the like are left out with everything inside them."""

    SKIP = {"script", "style", "noscript", "form", "svg", "template", "button", "select"}
    BLOCK = {"p": "", "h1": "# ", "h2": "## ", "h3": "### ", "li": "- ", "dt": "", "dd": "", "figcaption": "", "td": "", "th": "",
             "pre": "", "blockquote": "> "}
    VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}

    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.title, self.desc, self.h1 = "", "", ""
        self.out: list[str] = []
        self._t = False
        self._main = 0
        self._skip = 0
        self._stack: list[tuple[str, bool]] = []   # the open elements inside <main>, and whether each started a skip
        self._buf: list[str] = []
        self._pre = ""
        self._h1 = False

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == "title":
            self._t = True
        elif tag == "meta" and a.get("name") == "description":
            self.desc = a.get("content", "")
        elif tag == "main":
            self._main += 1
        elif self._main:
            if tag == "br" and not self._skip:
                self._buf.append(" ")
            if tag in self.VOID:
                return
            skip = tag in self.SKIP or "hidden" in a
            self._stack.append((tag, skip))
            if skip:
                self._skip += 1
            elif not self._skip and tag in self.BLOCK:
                self._flush()
                self._pre = self.BLOCK[tag]
                self._h1 = tag == "h1"

    def handle_endtag(self, tag):
        if tag == "title":
            self._t = False
        elif tag == "main":
            self._flush()
            self._main -= 1
            self._stack, self._skip = [], 0
        elif self._main and any(t == tag for t, _ in self._stack):
            while self._stack:
                t, skip = self._stack.pop()
                if skip:
                    self._skip -= 1
                if t == tag:
                    break
            if not self._skip and tag in self.BLOCK:
                self._flush()

    def handle_data(self, data):
        if self._t:
            self.title += data
        elif self._main and not self._skip:
            self._buf.append(data)

    def _flush(self):
        text = " ".join("".join(self._buf).split())
        self._buf = []
        if text:
            self.out.append(self._pre + text)
            if self._h1 and not self.h1:
                self.h1 = text
        self._pre = ""
        self._h1 = False


def _read(path: Path) -> _Page:
    p = _Page()
    p.feed(path.read_text(encoding="utf-8"))
    return p


def _urls(out: Path) -> list[str]:
    return re.findall(r"<loc>([^<]+)</loc>", (out / "sitemap.xml").read_text(encoding="utf-8"))


def _file(out: Path, rel: str) -> Path | None:
    if rel == "":
        return SITE / "index.html"
    for base in (out, SITE):
        if (base / rel).is_file():
            return base / rel
    return None


def _name(page: _Page) -> str:
    t = html.unescape(page.title).strip()
    return re.sub(r"\s*\|\s*Space Radar( Lab)?$", "", t) or page.h1 or "Space Radar"


def write(out: Path, host: str) -> tuple[int, int]:
    """Write out/llms.txt and out/llms-full.txt from the sitemap. Returns (pages listed, bytes of the full text)."""
    rows: list[tuple[str, str, str, _Page]] = []
    for url in _urls(out):
        rel = url[len(host) + 1:] if url.startswith(host + "/") else None
        if rel is None:
            continue
        f = _file(out, rel)
        if f is None:
            continue
        page = _read(f)
        rows.append((rel, url, _name(page), page))
    groups: dict[str, list] = {name: [] for name, _ in SECTIONS}
    for row in rows:
        name = next(n for n, test in SECTIONS if test(row[0]))
        groups[name].append(row)
    clean = lambda s: " ".join(html.unescape(s).split())  # noqa: E731
    lines = [f"# Space Radar\n\n> {SUMMARY}\n\n{INTRO.format(host=host)}\n"]
    for name, items in groups.items():
        if items:
            lines.append(f"## {name}\n\n" + "\n".join(f"- [{clean(t)}]({u}): {clean(p.desc)}" for _, u, t, p in items) + "\n")
    lines.append("## Optional\n\n" + "\n".join(f"- [{t}]({u.format(host=host)}): {d}" for t, u, d in OPTIONAL) + "\n")
    (out / "llms.txt").write_text("\n".join(lines), encoding="utf-8")
    parts = [f"# Space Radar: full text\n\n> {SUMMARY}\n"]
    for rel, url, title, page in rows:
        body = "\n\n".join(page.out) if page.out else clean(page.desc)
        parts.append(f"# {clean(title)}\n\nCanonical: {url}\n\n{body}\n")
    full = "\n---\n\n".join(parts)
    (out / "llms-full.txt").write_text(full, encoding="utf-8")
    return len(rows), len(full.encode("utf-8"))
