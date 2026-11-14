#!/usr/bin/env python3
"""The pages a search engine reads, in the app's other languages (docs/SEO_LANGUAGES.md).

    python3 scripts/seo_i18n.py extract --built DIR [--check]   the English catalog, registry/seo-i18n/en/*.json, from a build
    python3 scripts/seo_i18n.py flat --out DIR [--missing es]   the catalog in pieces of about 12 000 characters, for a translator
    python3 scripts/seo_i18n.py merge es DIR                    the pieces back into registry/seo-i18n/es/*.json
    python3 scripts/seo_i18n.py check es                        lost or extra {slots} and <n> tags, missing and unknown keys
    python3 scripts/seo_i18n.py coverage --built DIR            pages published per language, from DIR/i18n-report.json

scripts/build_seo.py calls build_languages() at the end of every build: it reads the English pages it has just built (and the
committed ones it publishes: the app shell site/index.html and the trips site/t/), and writes each page again under
DIR/<lang>/ in every language whose catalog covers ALL of that page's own text.

THE CATALOG IS THE ENGLISH PAGES, CUT INTO SEGMENTS. The pages' words are written in many places (the builders'
templates, the card's sentence builders, the registries, the committed trip and Lab pages), so they are not copied out of
those places by hand: the catalog is read off the built English pages, where every one of them has already arrived. A
segment is the text of one block (a paragraph, a heading, a list item, a table cell, a title, a meta description, an
alt text, a string of the JSON-LD) with its inline markup turned into numbered tags (<1>a link</1>, <2/> for a picture
or a piece of code, which is never translated) and its data turned into slots:
    {n1} {n2} ...   a number or a time, written by code in the language's own style (registry/seo-i18n/<lang>/_meta.json)
    {d1} ...        a date, "13 November 2026", written by code with the language's month names
    {name}          the page's own subject (an object, a country, an event), translated once in the "names" area
The key is a hash of the English segment after that, so a sentence that is the same on 300 pages but for its numbers and
its name is one string, translated once. A sentence whose English changes gets a new key: its old translation is no
longer used and the page falls back until the new one is written, which is what "never stale" means here.

`translate="no"` on an element keeps it out of the catalog and as it is in every language (the journal's titles, which
are English articles; a list of satellite designations).

THE RULE OF PUBLISHING (tested by tests/test_seo_i18n.py). A page is built in a language only when every segment of its
own text has a translation: the head (title, description, Open Graph and Twitter text, JSON-LD) and everything outside
the shared chrome. The chrome (the header, the nav, the footer and its subscribe form) falls back to English string by
string, so a new footer link does not take every translated page down. A page with one English sentence in its own
text is not built in that language, is not in that language's sitemap and is in no page's hreflang. The trips, which
send a browser on to the app, are built only where the app shell is.
"""

from __future__ import annotations

import hashlib
import html
import json
import posixpath
import re
import sys
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
CAT = ROOT / "registry" / "seo-i18n"
DEFAULT_HOST = "https://www.spaceradar.ai"

# The app's languages (site/js/copy/lang.js), in its order. The hreflang value and <html lang> of each.
LANGS = ("es", "fr", "de", "pt", "ru", "uk", "zh", "hi", "he", "ar")
TAG = {"en": "en", "es": "es", "fr": "fr", "de": "de", "pt": "pt-BR", "ru": "ru", "uk": "uk", "zh": "zh-Hans", "hi": "hi",
       "he": "he", "ar": "ar"}
OG_LOCALE = {"en": "en_GB", "es": "es_ES", "fr": "fr_FR", "de": "de_DE", "pt": "pt_BR", "ru": "ru_RU", "uk": "uk_UA",
             "zh": "zh_CN", "hi": "hi_IN", "he": "he_IL", "ar": "ar_AR"}
RTL = ("he", "ar")
AREAS = ("common", "home", "static", "trips", "lab", "objects", "countries", "events", "names")
PIECE = 12_000  # characters of English per piece, as scripts/translation-flat.mjs
MONTHS = ("January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November",
          "December")

# --- reading HTML ---------------------------------------------------------------------------------------------------

TOKEN = re.compile(r"<!--.*?-->|<!\w[^>]*>|<(/?)([a-zA-Z][a-zA-Z0-9:-]*)((?:[^>\"']|\"[^\"]*\"|'[^']*')*)>", re.S)
ATTR = re.compile(r"([^\s=/>]+)(?:\s*=\s*(\"[^\"]*\"|'[^']*'|[^\s>]+))?")
VOID = {"area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"}
INLINE = {"a", "abbr", "b", "bdi", "bdo", "br", "cite", "data", "dfn", "em", "i", "img", "mark", "q", "s", "small", "span",
          "strong", "sub", "sup", "time", "u", "wbr"}
ATOMIC = {"code", "kbd", "samp", "var", "svg", "math", "input", "select", "textarea", "iframe", "video", "audio", "picture"}
WHOLE = {"code", "kbd", "samp", "var"}  # code and keys: one placeholder in the sentence, never translated
RAW = {"script", "style", "template", "pre", "svg", "math", "textarea", "iframe", "select"}
TEXT_ATTRS = ("alt", "title", "aria-label", "placeholder", "aria-description")
# The share picture is the English page's, with its English caption printed on it, so its alt text (og:image:alt,
# twitter:image:alt) is the English description of that picture and stays as it is.
META_TEXT = {"description", "twitter:title", "twitter:description", "og:title", "og:description"}
LD_TEXT = {"name", "headline", "description", "alternativeHeadline", "about", "keywords", "text", "caption", "abstract",
           "educationalUse", "alternateName", "disambiguatingDescription", "articleSection", "teaches", "eventStatus_text"}
LETTER = re.compile(r"[^\W\d_]")
WORDY = re.compile(r"[a-z]{2}")  # a run of two small letters: a word of English, not a designation or a code
WS = re.compile(r"\s+")


def attrs_of(raw: str) -> dict[str, str]:
    out = {}
    for m in ATTR.finditer(raw or ""):
        v = m.group(2)
        if v is None:
            v = ""
        elif v[:1] in "\"'":
            v = v[1:-1]
        out[m.group(1).lower()] = html.unescape(v)
    return out


@dataclass
class Tok:
    kind: str            # text | open | close | void | atomic | other
    raw: str
    name: str = ""
    attrs: dict = field(default_factory=dict)
    zone: str = "main"   # main | chrome | head


def tokens(doc: str) -> list[Tok]:
    """The document as tokens, each marked with the zone it is in. Raw-text elements (script, style, pre, svg ...) and
    anything under translate="no" are one atomic token each, so no text inside them is ever touched."""
    out: list[Tok] = []
    stack: list[tuple[str, str]] = []  # (tag, zone)
    i, n = 0, len(doc)
    in_head = False
    while i < n:
        m = TOKEN.search(doc, i)
        if not m:
            out.append(Tok("text", doc[i:], zone=_zone(stack, in_head)))
            break
        if m.start() > i:
            out.append(Tok("text", doc[i:m.start()], zone=_zone(stack, in_head)))
        raw = m.group(0)
        if m.group(2) is None:  # comment or doctype
            out.append(Tok("other", raw))
            i = m.end()
            continue
        closing, name = m.group(1) == "/", m.group(2).lower()
        if closing:
            if name == "head":
                in_head = False
            for k in range(len(stack) - 1, -1, -1):
                if stack[k][0] == name:
                    del stack[k:]
                    break
            out.append(Tok("close", raw, name, zone=_zone(stack, in_head)))
            i = m.end()
            continue
        a = attrs_of(m.group(3))
        selfclose = m.group(3).rstrip().endswith("/")
        if name == "head":
            in_head = True
        whole = name in RAW or name in WHOLE or a.get("translate") == "no"
        if whole and name not in VOID and not selfclose:
            end = _matching_end(doc, m.end(), name)
            out.append(Tok("atomic", doc[m.start():end], name, a, zone=_zone(stack, in_head)))
            i = end
            continue
        if name in VOID or selfclose:
            out.append(Tok("void", raw, name, a, zone=_zone(stack, in_head)))
        else:
            zone = _zone(stack, in_head)
            if zone == "main" and (name in ("footer", "nav") or (name == "header" and "top" in a.get("class", "").split())
                                   or {"skip", "sr-skip"} & set(a.get("class", "").split())):
                zone = "chrome"
            stack.append((name, zone))
            out.append(Tok("open", raw, name, a, zone=zone))
        i = m.end()
    return out


def _zone(stack, in_head) -> str:
    if in_head:
        return "head"
    return stack[-1][1] if stack else "main"


def _matching_end(doc: str, start: int, name: str) -> int:
    """Where the element that starts before `start` ends, counting nested elements of the same name."""
    if name in ("script", "style", "textarea", "template", "pre"):
        j = doc.lower().find(f"</{name}", start)
        return len(doc) if j < 0 else doc.index(">", j) + 1
    depth, pat = 1, re.compile(rf"<(/?){name}\b(?:[^>\"']|\"[^\"]*\"|'[^']*')*>", re.I)
    for m in pat.finditer(doc, start):
        if m.group(1):
            depth -= 1
            if depth == 0:
                return m.end()
        elif not m.group(0).rstrip(">").rstrip().endswith("/"):
            depth += 1
    return len(doc)


# --- slots ----------------------------------------------------------------------------------------------------------

_M = "|".join(MONTHS)
DATE = re.compile(rf"\b(?:(\d{{1,2}}) ({_M}) (\d{{4}})|({_M}) (\d{{4}})|(\d{{1,2}}) ({_M}))\b")
NUMBER = re.compile(r"(?<![\w.,])(?:\d{1,2}:\d{2}|\d{1,3}(?:[,   ]\d{3})+(?:\.\d+)?|\d+(?:\.\d+)?)(?![\w]|[.,]\d)")


# A page's subject is a slot, but a spacecraft that has the subject's name in its own ("Mars Global Surveyor" on Mars's page) is a
# name in itself: it is kept whole in every language, never "{name} Global Surveyor" (which Hindi wrote "मंगल Global Surveyor").
SPACECRAFT_AFTER_NAME = r" (?:Global Surveyor|Reconnaissance Orbiter|Express|Odyssey|Pathfinder|Climate Orbiter|Sample Return)"


def slot_text(text: str, slots: list, name: str | None) -> str:
    """Put the slots into one run of English text, appending their values to `slots` (kind, value)."""
    def sub_date(m):
        if m.group(1):
            v = ("dmy", int(m.group(1)), MONTHS.index(m.group(2)) + 1, int(m.group(3)))
        elif m.group(4):
            v = ("my", 0, MONTHS.index(m.group(4)) + 1, int(m.group(5)))
        else:
            v = ("dm", int(m.group(6)), MONTHS.index(m.group(7)) + 1, 0)
        slots.append(("d", v))
        return "\x00d\x00"
    text = DATE.sub(sub_date, text)
    if name:
        # the page's subject by its whole name, at word edges
        text = re.sub(rf"(?<![\w-]){re.escape(name)}(?![\w-])(?!{SPACECRAFT_AFTER_NAME})", "\x00name\x00", text)
    parts = re.split(r"(\x00(?:d|name)\x00)", text)
    out = [p if p.startswith("\x00") else NUMBER.sub(lambda m: (slots.append(("n", m.group(0))), "\x00n\x00")[1], p)
           for p in parts]
    return "".join(out)


def _renumber(template: str, slots: list) -> tuple[str, list]:
    """Number the slots by kind, in reading order: {n1} {n2} {d1} {name}. Returns the template and the values in order."""
    # slots were appended dates-first; reorder by position in the template
    dates = [v for k, v in slots if k == "d"]
    nums = [v for k, v in slots if k == "n"]
    out, values, cn, cd = [], [], 0, 0
    for piece in re.split(r"(\x00(?:d|n|name)\x00)", template):
        if piece == "\x00d\x00":
            cd += 1
            out.append(f"{{d{cd}}}")
            values.append(("d", dates[cd - 1]))
        elif piece == "\x00n\x00":
            cn += 1
            out.append(f"{{n{cn}}}")
            values.append(("n", nums[cn - 1]))
        elif piece == "\x00name\x00":
            out.append("{name}")
        else:
            out.append(piece)
    return "".join(out), values


def key_of(template: str) -> str:
    return hashlib.sha1(template.encode("utf-8")).hexdigest()[:10]


# --- segments -------------------------------------------------------------------------------------------------------

@dataclass
class Seg:
    template: str          # the English, with <n> tags and {slots}
    values: list           # the slots' values, in reading order
    tags: dict             # n -> (open raw, close raw | None) ; void: (raw, None)
    zone: str
    where: str             # "text", "attr:alt", "meta", "ld", "title"

    @property
    def key(self) -> str:
        return key_of(self.template)


def make_seg(parts: list[Tok], zone: str, name: str | None, names: set[str], where: str = "text") -> Seg | None:
    """One block's tokens (text and inline tags) as a segment, or None when it holds nothing to translate."""
    tags: dict[int, list] = {}
    open_stack: list[int] = []
    pieces: list[str] = []
    slots: list = []
    count = 0
    for t in parts:
        if t.kind == "text":
            text = WS.sub(" ", html.unescape(t.raw))
            pieces.append(slot_text(text, slots, name))
        elif t.kind == "open":
            count += 1
            tags[count] = [t.raw, None, t]
            open_stack.append(count)
            pieces.append(f"<{count}>")
        elif t.kind == "close":
            if open_stack:
                k = open_stack.pop()
                tags[k][1] = t.raw
                pieces.append(f"</{k}>")
            else:
                count += 1
                tags[count] = [t.raw, None, t]
                pieces.append(f"<{count}/>")
        else:  # void, atomic
            count += 1
            tags[count] = [t.raw, None, t]
            pieces.append(f"<{count}/>")
    template = "".join(pieces).strip()
    if template == "\x00name\x00" and name:  # the page's subject alone (its <h1>, its JSON-LD name): its "names" entry
        return Seg(name, [], {}, zone, where)
    plain = re.sub(r"</?\d+/?>|\x00\w+\x00", "", template)
    if not LETTER.search(plain):
        return None
    template, values = _renumber(template, slots)
    if template not in names and not WORDY.search(plain):
        return None  # a designation or a code ("B0.5IV", "KOI-351 b", "DJIBOUTI-1B (2026)"): the same in every language
    return Seg(template, values, {k: (v[0], v[1], v[2]) for k, v in tags.items()}, zone, where)


def segment_page(doc: str, name: str | None, names: set[str]) -> tuple[list, list[Seg]]:
    """The page as a list of items: raw strings, and Seg for each run of text to translate (blocks, attributes, titles,
    meta text, JSON-LD strings). Joining the raw items and each Seg rendered in English gives the page back."""
    toks = tokens(doc)
    items: list = []
    segs: list[Seg] = []
    buf: list[Tok] = []

    def flush():
        if not buf:
            return
        # peel whitespace and wrapping tags off both ends so the segment is the sentence alone
        lo, hi = 0, len(buf)
        changed = True
        while changed and lo < hi:
            changed = False
            if buf[lo].kind == "text" and not buf[lo].raw.strip():
                lo += 1; changed = True; continue  # noqa: E702
            if hi - 1 >= lo and buf[hi - 1].kind == "text" and not buf[hi - 1].raw.strip():
                hi -= 1; changed = True; continue  # noqa: E702
            if buf[lo].kind in ("void", "atomic"):
                lo += 1; changed = True; continue  # noqa: E702
            if buf[hi - 1].kind in ("void", "atomic"):
                hi -= 1; changed = True; continue  # noqa: E702
            if buf[lo].kind == "open" and buf[hi - 1].kind == "close" and _pairs(buf, lo, hi):
                lo += 1; hi -= 1; changed = True; continue  # noqa: E702
        core = buf[lo:hi]
        # split the edge whitespace of the first and last text tokens off, so it stays in place
        lead, trail = "", ""
        if core and core[0].kind == "text":
            s = core[0].raw
            lead = s[:len(s) - len(s.lstrip())]
            core = [Tok("text", s.lstrip(), zone=core[0].zone)] + core[1:]
        if core and core[-1].kind == "text":
            s = core[-1].raw
            trail = s[len(s.rstrip()):]
            core = core[:-1] + [Tok("text", s.rstrip(), zone=core[-1].zone)]
        seg = make_seg(core, _seg_zone(core), name, names) if core else None
        for t in buf[:lo]:
            _emit_tok(t, items, segs, name, names)
        if seg is None:
            items.extend(t.raw for t in core)
        else:
            items.append(lead)
            items.append(seg)
            segs.append(seg)
            items.append(trail)
            seg.attr_segs = {}
            for k, (_o, _c, t) in seg.tags.items():  # the inline tags' own attributes (a link's title)
                if t.kind in ("open", "void"):
                    found = _attr_segs(t, segs, name, names)
                    if found:
                        seg.attr_segs[k] = found
            lead = trail = ""
        if seg is None:
            pass
        for t in buf[hi:]:
            _emit_tok(t, items, segs, name, names)
        buf.clear()

    in_title = False
    for t in toks:
        if t.kind == "text" or (t.kind in ("open", "close", "void") and t.name in INLINE) or (
                t.kind == "atomic" and (t.name in ATOMIC or t.name in INLINE)):
            if t.zone == "head" and not in_title:
                _emit_tok(t, items, segs, name, names)  # between the head's tags: nothing to read
                continue
            buf.append(t)
            continue
        flush()
        in_title = t.kind == "open" and t.name == "title"
        if in_title:
            items.append(t.raw)
            continue
        _emit_tok(t, items, segs, name, names)
    flush()
    return items, segs


def _pairs(buf, lo, hi) -> bool:
    """Is buf[lo] the open tag that buf[hi-1] closes?"""
    depth = 0
    for j in range(lo, hi):
        if buf[j].kind == "open":
            depth += 1
        elif buf[j].kind == "close":
            depth -= 1
            if depth == 0:
                return j == hi - 1
    return False


def _seg_zone(core) -> str:
    zones = {t.zone for t in core}
    return "head" if "head" in zones else ("chrome" if zones == {"chrome"} else "main")


class AttrSeg:
    """A translatable attribute of one tag: the tag is re-written with the translation in place."""


def _attr_segs(t: Tok, segs: list, name, names) -> list:
    found = []
    zone = t.zone
    for a in TEXT_ATTRS:
        v = t.attrs.get(a)
        if v and LETTER.search(v):
            s = make_seg([Tok("text", html.escape(v, quote=False), zone=zone)], zone, name, names, where=f"attr:{a}")
            if s:
                s.attr = a
                segs.append(s)
                found.append(s)
    if t.name == "meta" and (t.attrs.get("name") in META_TEXT or t.attrs.get("property") in META_TEXT):
        v = t.attrs.get("content", "")
        if LETTER.search(v):
            s = make_seg([Tok("text", html.escape(v, quote=False), zone="head")], "head", name, names, where="attr:content")
            if s:
                s.attr = "content"
                segs.append(s)
                found.append(s)
    return found


@dataclass
class TagItem:
    tok: Tok
    segs: list           # attribute segments


@dataclass
class LdItem:
    open_raw: str
    data: object
    close_raw: str
    segs: list           # (path, Seg)


def _emit_tok(t: Tok, items: list, segs: list, name, names):
    if t.kind == "atomic" and t.name == "script" and t.attrs.get("type") == "application/ld+json":
        body_start = t.raw.index(">") + 1
        body_end = t.raw.lower().rindex("</script")
        try:
            data = json.loads(t.raw[body_start:body_end])
        except ValueError:
            items.append(t.raw)
            return
        found = []
        _ld_walk(data, (), found, name, names)
        segs.extend(s for _p, s in found)
        items.append(LdItem(t.raw[:body_start], data, t.raw[body_end:], found))
        return
    if t.kind in ("open", "void"):
        found = _attr_segs(t, segs, name, names)
        if found:
            items.append(TagItem(t, found))
            return
    items.append(t if t.kind in ("open", "void") else t.raw)


def _ld_walk(node, path, found, name, names):
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str) and k in LD_TEXT and LETTER.search(v) and not v.startswith("http"):
                s = make_seg([Tok("text", html.escape(v, quote=False), zone="head")], "head", name, names, where="ld")
                if s:
                    found.append((path + (k,), s))
            elif isinstance(v, (dict, list)):
                _ld_walk(v, path + (k,), found, name, names)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str) and path and path[-1] in LD_TEXT and LETTER.search(v):
                s = make_seg([Tok("text", html.escape(v, quote=False), zone="head")], "head", name, names, where="ld")
                if s:
                    found.append((path + (i,), s))
            else:
                _ld_walk(v, path + (i,), found, name, names)


# --- the subject of a page ------------------------------------------------------------------------------------------

LD_BLOCK = re.compile(r'<script type="application/ld\+json">(.*?)</script>', re.S)
SUBJECT_TYPES = {"Thing", "Place", "Event", "Country", "Star", "Planet", "CelestialBody", "AdministrativeArea"}


def subject_of(doc: str, path: str) -> str | None:
    """The page's own subject, by name: an object page's thing, a country page's country, an event page's event. Its
    name becomes {name} in the page's sentences, so 354 object pages share their sentences."""
    if not path.startswith(("o/", "country/", "events/")):
        return None
    for m in LD_BLOCK.finditer(doc):
        try:
            data = json.loads(m.group(1))
        except ValueError:
            continue
        found = _subject_in(data)
        if found:
            return found
    return None


def _subject_in(node) -> str | None:
    if isinstance(node, list):
        for v in node:
            f = _subject_in(v)
            if f:
                return f
        return None
    if not isinstance(node, dict):
        return None
    types = node.get("@type")
    types = set(types) if isinstance(types, list) else {types}
    if (types & SUBJECT_TYPES or str(node.get("@id", "")).endswith(("#thing", "#event", "#country"))) and isinstance(node.get("name"), str):
        nm = node["name"].strip()
        if 2 <= len(nm) <= 80 and LETTER.search(nm):
            return nm
    for k in ("@graph", "about", "mainEntity", "subjectOf"):
        if k in node:
            f = _subject_in(node[k])
            if f:
                return f
    return None


# --- the pages --------------------------------------------------------------------------------------------------------

# Pages kept in English, each with its reason (tests/test_seo_i18n.py holds the list to this file's docs).
ENGLISH_ONLY = {
    "planets-tonight/index.html": "its sentences are worked out for the night of each build, so they cannot be a catalog",
}


def page_paths(built: Path, host: str) -> list[str]:
    """The pages to translate: the English sitemap's, by path from the root ("" is the home page), but ENGLISH_ONLY."""
    xml = (built / "sitemap-pages.xml").read_text(encoding="utf-8")
    out = []
    for loc in re.findall(r"<loc>([^<]+)</loc>", xml):
        loc = html.unescape(loc)
        if loc.startswith(host + "/") and loc[len(host) + 1:] not in ENGLISH_ONLY:
            out.append(loc[len(host) + 1:])
    return out


def source_file(built: Path, path: str) -> Path:
    rel = path or "index.html"
    if (built / rel).is_file():
        return built / rel
    return SITE / rel


def area_of(path: str) -> str:
    if path in ("", "index.html"):
        return "home"
    for prefix, area in (("t/", "trips"), ("lab/", "lab"), ("o/", "objects"), ("country/", "countries"), ("events/", "events")):
        if path.startswith(prefix):
            return area
    return "static"


def read_pages(built: Path, host: str) -> list[tuple[str, str, str | None]]:
    """(path, English html, subject name) for every page of the sitemap."""
    out = []
    for path in page_paths(built, host):
        doc = source_file(built, path).read_text(encoding="utf-8")
        out.append((path, strip_alternates(doc), subject_of(doc, path)))
    return out


# --- the English catalog ----------------------------------------------------------------------------------------------

def extract(built: Path, host: str = DEFAULT_HOST) -> tuple[dict[str, dict[str, str]], dict[str, str]]:
    """{area: {key: English}} and {key: where it is first seen (+ how many more pages)} from a built English tree."""
    pages = read_pages(built, host)
    names = {nm for _p, _d, nm in pages if nm}
    first: dict[str, tuple[str, str]] = {}   # key -> (template, first area)
    areas_of: dict[str, set] = {}
    seen_on: dict[str, list] = {}
    is_name: set[str] = set()
    roles: dict[str, set] = {}
    for path, doc, nm in pages:
        _items, segs = segment_page(doc, nm, names)
        for s in segs:
            k = s.key
            if k not in first:
                first[k] = (s.template, area_of(path))
            areas_of.setdefault(k, set()).add(area_of(path))
            seen_on.setdefault(k, []).append(path)
            if s.zone == "head" and s.where == "text":
                roles.setdefault(k, set()).add("title")
            elif s.zone == "head" and s.where == "attr:content":
                roles.setdefault(k, set()).add("description")
            if s.template in names:
                is_name.add(k)
    cat: dict[str, dict[str, str]] = {a: {} for a in AREAS}
    ctx: dict[str, str] = {}
    for k, (tmpl, area) in first.items():
        a = "names" if k in is_name else ("common" if len(areas_of[k]) > 1 else area)
        cat[a][k] = tmpl
        where = sorted(set(seen_on[k]))
        ctx[k] = (where[0] or "index.html") + (f" (+{len(where) - 1} more)" if len(where) > 1 else "")
        if roles.get(k):  # a title must stay within 60 characters, a description within 70 to 160 (scripts/check_seo.py)
            ctx[k] += " [" + " and ".join(sorted(roles[k])) + "]"
    for nm in sorted(names):  # every subject name, also where no block is the name alone
        k = key_of(nm)
        if not any(k in cat[a] for a in AREAS):
            cat["names"][k] = nm
            ctx.setdefault(k, "the {name} of its page")
    return cat, ctx


def write_catalog(cat: dict, ctx: dict, root: Path = CAT) -> None:
    d = root / "en"
    d.mkdir(parents=True, exist_ok=True)
    for a in AREAS:
        (d / f"{a}.json").write_text(dumps(cat[a]), encoding="utf-8")
    (d / "_context.json").write_text(dumps(dict(sorted(ctx.items()))), encoding="utf-8")


def dumps(obj) -> str:
    return json.dumps(obj, ensure_ascii=False, indent=1) + "\n"


def load_area_files(lang: str, root: Path = CAT) -> dict[str, dict[str, str]]:
    d = root / lang
    out = {}
    for a in AREAS:
        f = d / f"{a}.json"
        out[a] = json.loads(f.read_text(encoding="utf-8")) if f.is_file() else {}
    return out


def load_english(root: Path = CAT) -> dict[str, str]:
    flat = {}
    for a, rows in load_area_files("en", root).items():
        flat.update(rows)
    return flat


def load_lang(lang: str, root: Path = CAT) -> tuple[dict[str, str], dict]:
    flat = {}
    for a, rows in load_area_files(lang, root).items():
        flat.update(rows)
    meta_f = root / lang / "_meta.json"
    meta = json.loads(meta_f.read_text(encoding="utf-8")) if meta_f.is_file() else {}
    return flat, meta


def words(text: str) -> int:
    return len(re.findall(r"[^\W\d_][\w'’-]*", re.sub(r"</?\d+/?>|\{\w+\}", " ", text)))


# --- checking a translation ---------------------------------------------------------------------------------------

SLOT = re.compile(r"\{(n\d+|d\d+|name)\}")
TAGP = re.compile(r"<(/?)(\d+)(/?)>")


def marks(text: str) -> tuple[list, list]:
    return sorted(SLOT.findall(text)), sorted(m.group(0) for m in TAGP.finditer(text))


def problems(english: str, translated: str) -> list[str]:
    """What is wrong with one translated string, against its English: lost or extra slots and tags."""
    out = []
    es, et = marks(english)
    ts, tt = marks(translated)
    if es != ts:
        out.append(f"slots {sorted(set(es) ^ set(ts)) or es} differ (English {' '.join('{'+s+'}' for s in es) or 'none'})")
    if et != tt:
        out.append(f"tags differ (English {' '.join(et) or 'none'}, here {' '.join(tt) or 'none'})")
    if not translated.strip():
        out.append("empty")
    return out


def check_lang(lang: str, root: Path = CAT) -> list[str]:
    en = load_english(root)
    rows, meta = load_lang(lang, root)
    out = []
    for k, v in rows.items():
        if k not in en:
            out.append(f"{lang}: {k}: not in the English catalog (an old string: remove it)")
            continue
        if not isinstance(v, str):
            out.append(f"{lang}: {k}: not a string")
            continue
        for p in problems(en[k], v):
            out.append(f"{lang}: {k}: {p}: {en[k][:70]!r}")
    for a, rows_a in load_area_files(lang, root).items():
        en_a = load_area_files("en", root)[a]
        for k in rows_a:
            if k in en and k not in en_a:
                out.append(f"{lang}: {k}: is in {a}.json but the English has it in another area")
    for need in ("numbers", "months", "date", "notice"):
        if rows and need not in meta:
            out.append(f"{lang}: _meta.json has no {need!r}")
    if "months" in meta and len(meta["months"]) != 12:
        out.append(f"{lang}: _meta.json months must list 12")
    if "notice" in meta:
        if sorted(TAGP.findall(meta["notice"])) != sorted(TAGP.findall("<1>x</1>")):
            out.append(f"{lang}: _meta.json notice must hold the link as <1>...</1>")
    return out


# --- writing a page in another language -----------------------------------------------------------------------------

@dataclass
class Lang:
    code: str
    strings: dict
    meta: dict

    def number(self, v: str) -> str:
        if ":" in v:
            return v
        grouped = bool(re.search(r"\d[,   ]\d{3}", v))
        if not grouped and "." not in v:
            return v
        num = re.sub(r"[,   ]", "", v)
        ip, _, fp = num.partition(".")
        nm = self.meta.get("numbers", {})
        group, dec, gmin = nm.get("group", ","), nm.get("decimal", "."), int(nm.get("groupMin", 4))
        if len(ip) >= gmin:
            ip = "{:,}".format(int(ip)).replace(",", "\x00").replace("\x00", group)
        return ip + (dec + fp if fp else "")

    def date(self, v) -> str:
        kind, d, m, y = v
        months = (self.meta.get("monthsStandalone") if kind == "my" else None) or self.meta.get("months") or list(MONTHS)
        fmt = self.meta.get({"dmy": "date", "my": "monthYear", "dm": "dayMonth"}[kind]) or {"dmy": "{d} {month} {y}", "my": "{month} {y}", "dm": "{d} {month}"}[kind]
        day = self.meta.get("firstDay", "{d}").replace("{d}", str(d)) if d == 1 else str(d)  # French: "1er novembre"
        return fmt.replace("{d}", day).replace("{month}", months[m - 1]).replace("{y}", str(y))


def render(seg: Seg, text: str, lang: Lang | None, name_value: str, tag_raw) -> str:
    """A segment's text (English or translated template) with its tags and slots put back, as HTML."""
    values = {}
    cn = cd = 0
    for kind, v in seg.values:
        if kind == "n":
            cn += 1
            values[f"n{cn}"] = lang.number(v) if lang else v
        else:
            cd += 1
            values[f"d{cd}"] = lang.date(v) if lang else Lang("en", {}, {}).date(v)
    out = []
    spans = []  # where the filled slots are in the joined text, for the grammar post-pass
    for piece in re.split(r"(<\/?\d+\/?>|\{(?:n\d+|d\d+|name)\})", text):
        if not piece:
            continue
        before = len(out)
        m = TAGP.fullmatch(piece)
        if m:
            k = int(m.group(2))
            o, c, _t = seg.tags[k]
            out.append(tag_raw(k, c if m.group(1) else o, closing=bool(m.group(1))))
        elif piece == "{name}":
            v = name_value
            if not "".join(out).strip() and lang and v[:1].islower() and lang.code not in ("de",):
                v = v[:1].upper() + v[1:]  # a name that opens the sentence
            out.append(html.escape(v, quote=False))
        elif SLOT.fullmatch(piece):
            out.append(html.escape(values[piece[1:-1]], quote=False))
        else:
            out.append(html.escape(piece, quote=False))
        if SLOT.fullmatch(piece) and len(out) > before:
            start = sum(len(x) for x in out[:before])
            spans.append((start, start + len(out[-1])))
    result = "".join(out)
    post = POST_PASS.get(lang.code) if lang else None
    return post(result, spans) if post and spans else result


# --- grammar after the slots are in ------------------------------------------------------------------------------------
# A name or a number is put into a sentence its translator wrote around a slot, so "de {name}" with the name "a Lua" reads
# "de a Lua". These passes run on the finished sentence and touch only a place where a filled slot is one of the two words,
# whole words only, so a sentence the translator wrote whole ("antes de o combustível acabar") is left as written.

def _only_at_slots(text: str, spans: list, rx, fn) -> str:
    out, last = [], 0
    for m in rx.finditer(text):
        if any(m.start() < b and m.end() > a for a, b in spans):
            out.append(text[last:m.start()])
            out.append(fn(m))
            last = m.end()
    out.append(text[last:])
    return "".join(out)


def _case_of(src: str, word: str) -> str:
    return word[:1].upper() + word[1:] if src[:1].isupper() else word


def _joined(word: str, m) -> str:
    """The contracted word, then the markup that stood between the two words (a link starting at the name), then the space
    that followed the article only if nothing took its place."""
    tags = m.group("tags")
    return word + (" " + tags if tags else (" " if m.group("tail") else ""))


PT_CONTRACT = {("de", "o"): "do", ("de", "a"): "da", ("de", "os"): "dos", ("de", "as"): "das",
               ("em", "o"): "no", ("em", "a"): "na", ("em", "os"): "nos", ("em", "as"): "nas",
               ("a", "o"): "ao", ("a", "os"): "aos", ("a", "a"): "à", ("a", "as"): "às",
               ("por", "o"): "pelo", ("por", "a"): "pela", ("por", "os"): "pelos", ("por", "as"): "pelas"}
PT_RX = re.compile(r"(?<![\w’'-])(?P<p>[Dd]e|[Ee]m|[Aa]|[Pp]or) (?P<tags>(?:<[^>]*>)*)(?P<a>os|as|o|a)(?![\w’'-])(?P<tail> |(?=[<,.;:!?)]|$))")


def _pt_contract(text: str, spans: list) -> str:
    """Portuguese: de/em/a/por + o/a/os/as become one word, where a slot supplies one of the two."""
    def fn(m):
        word = _case_of(m.group("p"), PT_CONTRACT[(m.group("p").lower(), m.group("a"))])
        return _joined(word, m)
    return _only_at_slots(text, spans, PT_RX, fn)


FR_VOWEL = "AEIOUaeiouÀÂÄÆÉÈÊËÎÏÔÖŒÙÛÜàâäæéèêëîïôöœùûüÿ"  # no h: a mute h and an aspirated h cannot be told apart by a rule
FR_CONTRACT = {("de", "le"): "du", ("de", "les"): "des", ("à", "le"): "au", ("à", "les"): "aux"}
FR_RX = re.compile(r"(?<![\w’'-])(?:(?P<p>[Dd]e|[Àà]) (?P<tags>(?:<[^>]*>)*)(?P<a>les|le)(?![\w’'-])(?P<tail> |(?=[<,.;:!?)]|$))"
                   r"|(?P<e>[Dd]e|[Ll]e|[Ll]a|[Qq]ue|[Jj]e|[Nn]e) (?P<etags>(?:<[^>]*>)*)(?=[" + FR_VOWEL + r"]))")
FR_ELIDE = {"de": "d’", "le": "l’", "la": "l’", "que": "qu’", "je": "j’", "ne": "n’"}


def _fr_contract(text: str, spans: list) -> str:
    """French: de/à + le/les become du, des, au, aux; de, le, la, que, je, ne drop their vowel before a vowel (d’Achernar)
    where a slot supplies one of the two words. An h is never elided here."""
    def fn(m):
        if m.group("e"):
            word = m.group("e")
            return _case_of(word, FR_ELIDE[word.lower()]) + m.group("etags")
        return _joined(_case_of(m.group("p"), FR_CONTRACT[(m.group("p").lower(), m.group("a"))]), m)
    out, last = [], 0
    for m in FR_RX.finditer(text):
        end = m.end() + (1 if m.group("e") else 0)  # the elision looks at the vowel too
        if any(m.start() < b and end > a for a, b in spans):
            out.append(text[last:m.start()])
            out.append(fn(m))
            last = m.end()
    out.append(text[last:])
    return "".join(out)


POST_PASS = {"pt": _pt_contract, "fr": _fr_contract}


def plain(seg: Seg, text: str, lang: Lang | None, name_value: str) -> str:
    """The same as render() for an attribute or JSON-LD: no tags, unescaped."""
    return html.unescape(re.sub(r"<[^>]*>", "", render(seg, text, lang, name_value, lambda k, raw, closing: "")))


ALT_BEGIN, ALT_END = "<!-- hreflang: scripts/seo_i18n.py -->", "<!-- /hreflang -->"


def strip_alternates(doc: str) -> str:
    return re.sub(re.escape(ALT_BEGIN) + r".*?" + re.escape(ALT_END) + r"\n?", "", doc, flags=re.S)


def url_of(host: str, lang: str, path: str) -> str:
    return f"{host}/" + (f"{lang}/" if lang != "en" else "") + path


def alternates_block(host: str, path: str, langs: list[str]) -> str:
    rows = [ALT_BEGIN]
    for code in ["en"] + [c for c in LANGS if c in langs]:
        rows.append(f'<link rel="alternate" hreflang="{TAG[code]}" href="{html.escape(url_of(host, code, path))}">')
    rows.append(f'<link rel="alternate" hreflang="x-default" href="{html.escape(url_of(host, "en", path))}">')
    rows.append(ALT_END)
    return "\n".join(rows) + "\n"


def with_alternates(doc: str, block: str) -> str:
    doc = strip_alternates(doc)
    i = doc.find("</head>")
    return doc[:i] + block + doc[i:] if i >= 0 else doc


SCHEME = re.compile(r"^[a-zA-Z][a-zA-Z0-9+.-]*:|^//")


class Linker:
    """Rewrites the URLs of a page moved from `path` to `<lang>/path`: an asset stays where it is (one level further up);
    a page goes to its version in the language when there is one, else to the English."""

    def __init__(self, host: str, lang: str, path: str, published: set[str], here: str | None = None):
        self.host, self.lang, self.path, self.published = host, lang, path or "index.html", published
        # the folder relative addresses are resolved against: the page's own, or the root under <base href="../">
        self.here = posixpath.dirname(f"{lang}/{self.path}") if here is None else here

    def target(self, url: str) -> str | None:
        """The path from the root that `url` names, without its query and fragment, or None when it is not ours."""
        if not url or url.startswith(("#", "data:", "mailto:", "javascript:", "tel:")):
            return None
        if url.startswith(self.host + "/") or url == self.host:
            rest = url[len(self.host) + 1:]
            return rest
        if SCHEME.match(url):
            return None
        if url.startswith("/"):
            return url[1:]
        base = posixpath.dirname(self.path)
        joined = posixpath.normpath(posixpath.join(base, url.split("#")[0].split("?")[0] or "."))
        return "" if joined == "." else joined

    def rewrite(self, url: str, absolute_out: bool = False) -> str:
        if not url or url.startswith(("#", "data:", "mailto:", "javascript:", "tel:")):
            return url
        tail = ""
        m = re.search(r"[?#]", url)
        core = url
        if m:
            core, tail = url[:m.start()], url[m.start():]
        if url.startswith(self.host + "/") or url == self.host:
            t = core[len(self.host) + 1:] if core != self.host else ""
            if self.is_page(t) and self.has(t):
                return url_of(self.host, self.lang, t) + tail
            return url
        if SCHEME.match(url):
            return url
        if core.startswith("/"):
            t = core[1:]
            return ("/" + (f"{self.lang}/" if self.is_page(t) and self.has(t) else "") + t) + tail
        base = posixpath.dirname(self.path)
        t = posixpath.normpath(posixpath.join(base, core or "."))
        t = "" if t == "." else t
        if core.endswith("/") and t:
            t += "/"
        dest = (f"{self.lang}/" + t) if (self.is_page(t) and self.has(t)) else t
        rel = posixpath.relpath(dest or ".", self.here or ".")
        if dest == "" or dest.endswith("/"):
            rel = rel.rstrip("/") + "/" if rel != "." else "./"
            if rel == "./" and not core:
                rel = ""
        if rel == "." :
            rel = "./"
        return rel + tail

    @staticmethod
    def is_page(t: str) -> bool:
        return t in ("", "index.html") or t.endswith(".html") or t.endswith("/")

    def has(self, t: str) -> bool:
        t = "" if t in ("", "index.html") else t
        if t.endswith("/"):
            t += "index.html"
        return t in self.published


URL_ATTRS = ("href", "src", "action", "poster")


def _retag(raw: str, linker: Linker | None, attr_values: dict | None = None) -> str:
    """One tag again, with its URLs rewritten for the language and any translated attribute put in."""
    m = TOKEN.fullmatch(raw)
    if not m or m.group(2) is None or m.group(1):
        return raw
    name = m.group(2)
    body = m.group(3)

    def one(am):
        a, v = am.group(1), am.group(2)
        if v is None:
            return am.group(0)
        q = v[0] if v[:1] in "\"'" else ""
        val = html.unescape(v[1:-1] if q else v)
        low = a.lower()
        if attr_values and low in attr_values:
            val = attr_values[low]
        elif linker and low in URL_ATTRS:
            val = linker.rewrite(val)
        elif linker and low == "content" and re.match(r"^\d+;\s*url=", val, re.I):
            pre, _, u = val.partition("=")
            val = pre + "=" + linker.rewrite(u)
        elif linker and low == "srcset":
            val = ", ".join(" ".join([linker.rewrite(p.split()[0])] + p.split()[1:]) for p in val.split(",") if p.strip())
        else:
            return am.group(0)
        return f'{a}="{html.escape(val, quote=True)}"'
    return f"<{name}{ATTR.sub(one, body)}>"


@dataclass
class PageResult:
    path: str
    total: int
    missing: list
    chrome_missing: int
    html: str | None


def missing_keys(segs: list, name: str | None, lang: "Lang") -> tuple[list, int]:
    """The keys of the page's own text that `lang` lacks (or has with a lost slot or tag), and how many of the chrome's."""
    missing, chrome = [], 0
    for s in segs:
        t = lang.strings.get(s.key)
        if t is None or problems(s.template, t):
            if s.zone == "chrome":
                chrome += 1
            else:
                missing.append(s.key)
    if name and key_of(name) not in lang.strings:
        missing.append(key_of(name))
    return sorted(set(missing)), chrome


def translate_page(path: str, seg_page: tuple, name: str | None, lang: "Lang", host: str, published: set[str],
                   alternates: str) -> PageResult:
    """The page in `lang`, from its segments (segment_page()). `published` is every path built in that language (for its
    links); `html` is None when the page's own text is not fully translated (PageResult.missing lists those keys)."""
    items, segs = seg_page
    missing, chrome_missing = missing_keys(segs, name, lang)
    if missing:
        return PageResult(path, len(segs), missing, chrome_missing, None)
    linker = Linker(host, lang.code, path, published, here="" if path == "" else None)
    name_value = lang.strings.get(key_of(name), name) if name else ""

    def text_of(s: Seg) -> str:
        t = lang.strings.get(s.key)
        if t is None or problems(s.template, t):
            return s.template
        # a block opens with a capital where the English does ("The Moon" alone is "la Luna" in names, "La Luna" here)
        if s.template[:1].isupper() and t[:1].islower() and lang.code not in ("de",):
            t = t[:1].upper() + t[1:]
        return t

    def attrs_for(segs_):
        return {s.attr: plain(s, text_of(s), lang, name_value) for s in segs_}

    def tag_raw_for(seg):
        def tag_raw(k, raw, closing):
            if closing:
                return raw
            return _retag(raw, linker, attrs_for(getattr(seg, "attr_segs", {}).get(k, [])))
        return tag_raw

    out = []
    for it in items:
        if isinstance(it, str):
            out.append(_retag_all(it, linker) if it.startswith("<") and not it.startswith(("<script", "<style", "<!--")) else it)
        elif isinstance(it, Seg):
            out.append(render(it, text_of(it), lang, name_value, tag_raw_for(it)))
        elif isinstance(it, Tok):
            out.append(_retag(it.raw, linker))
        elif isinstance(it, TagItem):
            out.append(_retag(it.tok.raw, linker, attrs_for(it.segs)))
        elif isinstance(it, LdItem):
            data = json.loads(json.dumps(it.data))
            for p, s in it.segs:
                _ld_set(data, p, plain(s, text_of(s), lang, name_value))
            _ld_localise(data, linker, lang.code)
            out.append(it.open_raw + json.dumps(data, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/") + it.close_raw)
    page = _fit_head(_without_live("".join(out)))
    page = _head_for(page, host, lang, path, alternates, linker)
    page = _notice(page, host, lang, path)
    return PageResult(path, len(segs), [], chrome_missing, page)


TITLE_MAX, DESC_MAX = 60, 160  # scripts/check_seo.py's limits, which a translation that grew must still keep
SUFFIXES = (" | Space Radar Lab", " | Space Radar", " · Space Radar")


def _fit_title(t: str) -> str:
    """The English builders' rule (seo_pages.title_with_site): the site's name is added only where it fits."""
    for suf in SUFFIXES:
        if len(t) > TITLE_MAX and t.endswith(suf):
            return t[:-len(suf)]
    return t


def _fit_desc(t: str) -> str:
    """A description that grew past 160 characters in translation ends at its last whole sentence that fits, else at its
    last clause, else at a word, with an ellipsis."""
    if len(t) <= DESC_MAX:
        return t
    cut = t[:DESC_MAX]
    for mark in (". ", "; ", ": ", ", "):
        i = cut.rfind(mark)
        if i >= 70:
            return cut[:i + 1].rstrip(",;: ") + ("" if mark == ". " else "…")
    return cut[:cut.rfind(" ")].rstrip(",;: ") + "…"


def _fit_head(page: str) -> str:
    page = re.sub(r"<title>(.*?)</title>", lambda m: f"<title>{html.escape(_fit_title(html.unescape(m.group(1))), quote=False)}</title>", page, count=1, flags=re.S)
    def meta(m):
        return m.group(1) + html.escape(_fit_desc(html.unescape(m.group(2))), quote=True) + '">'
    return re.sub(r'(<meta (?:name="description"|property="og:description"|name="twitter:description") content=")([^"]*)">', meta, page)


LIVE_SCRIPT = re.compile(r'<script type="module" src="[^"]*js/(?:pages/live|objectnow)\.js"></script>\n?')


def _without_live(page: str) -> str:
    """A translated page does not run js/pages/live.js or js/objectnow.js: they write their sentences in English (a
    follow-up gives them the language's words). The page keeps its dated sentences, which is what a crawler reads, and the controls only that
    script works (the place picker) are hidden."""
    page = LIVE_SCRIPT.sub("", page)
    return re.sub(r'<div class="place"', '<div class="place" hidden', page)


def _retag_all(raw: str, linker: "Linker") -> str:
    """Every tag inside a piece kept whole (translate="no", a picture, a template) with its URLs rewritten."""
    return TOKEN.sub(lambda m: _retag(m.group(0), linker) if m.group(2) and not m.group(1) else m.group(0), raw)


def _ld_set(data, p, value):
    for k in p[:-1]:
        data = data[k]
    data[p[-1]] = value


def _ld_localise(node, linker: Linker, code: str):
    if isinstance(node, dict):
        if "inLanguage" in node:
            node["inLanguage"] = TAG[code]
        elif node.get("@type") in ("WebPage", "CollectionPage", "AboutPage", "FAQPage", "Article", "WebSite", "ItemPage",
                                   "LearningResource") or (isinstance(node.get("@type"), list) and "WebPage" in node["@type"]):
            node["inLanguage"] = TAG[code]
        for k, v in list(node.items()):
            if isinstance(v, str) and k in ("url", "@id", "item", "mainEntityOfPage") and v.startswith(linker.host + "/"):
                base, frag = (v.split("#", 1) + [""])[:2]
                if frag == "website" or frag == "organization":
                    continue
                new = linker.rewrite(base)
                node[k] = new + ("#" + frag if "#" in v else "")
            else:
                _ld_localise(v, linker, code)
    elif isinstance(node, list):
        for v in node:
            _ld_localise(v, linker, code)


def _head_for(page: str, host: str, lang: Lang, path: str, alternates: str, linker: Linker) -> str:
    code = lang.code
    rtl = ' dir="rtl"' if code in RTL else ' dir="ltr"'
    page = re.sub(r"<html\b[^>]*>", f'<html lang="{TAG[code]}"{rtl}>', page, count=1)
    self_url = url_of(host, code, path)
    if re.search(r'<link rel="canonical" href="[^"]*">', page):
        page = re.sub(r'<link rel="canonical" href="([^"]*)">',
                      lambda m: f'<link rel="canonical" href="{html.escape(_canon(m.group(1), host, code, path, linker))}">', page, count=1)
    page = re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{html.escape(self_url)}">', page, count=1)
    loc = f'<meta property="og:locale" content="{OG_LOCALE[code]}">\n'
    if '<meta property="og:site_name"' in page:
        page = page.replace('<meta property="og:site_name"', loc + '<meta property="og:site_name"', 1)
    return with_alternates(page, alternates)


def _canon(english: str, host: str, code: str, path: str, linker: Linker) -> str:
    """A page's canonical in a language: itself, when the English page's canonical is itself; else the language version
    of what it names (an alias page), or that English page when it has none."""
    if english.rstrip("/") == url_of(host, "en", path).rstrip("/"):
        return url_of(host, code, path)
    return linker.rewrite(english)


def _notice(page: str, host: str, lang: Lang, path: str) -> str:
    """The sentence that says the page was machine-translated, with the English original linked, first in <main>."""
    note = lang.meta.get("notice")
    if not note:
        return page
    english = url_of(host, "en", path)
    text = html.escape(note, quote=False)
    text = re.sub(r"&lt;1&gt;(.*?)&lt;/1&gt;", lambda m: f'<a href="{html.escape(english)}" hreflang="en">{m.group(1)}</a>', text)
    block = f'<p class="i18n-note" data-i18n-note>{text}</p>\n'
    m = re.search(r'<div class="sr-readable"[^>]*>\n?', page)  # the app shell: in the page a reader without the map reads
    if m:
        return page[:m.end()] + block + page[m.end():]
    m = re.search(r"<main\b[^>]*>\n?", page)
    if m:
        return page[:m.end()] + block + page[m.end():]
    m = re.search(r"<body\b[^>]*>\n?", page)
    return page[:m.end()] + block + page[m.end():] if m else page


# --- the home page: the app shell in a language -----------------------------------------------------------------------

def home_shell(page: str, lang: Lang) -> str:
    """The app shell under /<lang>/: <base href="../"> so every relative address the app writes or fetches is the root's
    (its modules, its data, its worker), and the skip links kept on this page. js/copy/lang.js reads the language from the
    path, so the app starts in it."""
    page = page.replace("<head>\n", '<head>\n<base href="../">\n', 1)
    # in-page links: with a base, "#map" would leave for the English root
    page = re.sub(r'href="#([\w-]+)"', lambda m: f'href="{lang.code}/#{m.group(1)}"', page)
    return page


# --- building every language ------------------------------------------------------------------------------------------

def langs_with_catalogs(root: Path = CAT) -> list[str]:
    return [c for c in LANGS if (root / c).is_dir() and any((root / c).glob("*.json"))]


def build_languages(out: Path, host: str, dates: dict[str, str] | None = None, root: Path = CAT,
                    only: list[str] | None = None) -> dict:
    """Every page in every language whose catalog covers it, under out/<lang>/; the English pages (and the committed app
    shell and trips, copied into out/) given their hreflang; one sitemap per language. Returns the report (also written
    as out/i18n-report.json)."""
    pages = read_pages(out, host)
    names = {nm for _p, _d, nm in pages if nm}
    by_path = {p: (d, nm) for p, d, nm in pages}
    segmented = {p: segment_page(d, nm, names) for p, d, nm in pages}
    codes = [c for c in (only or langs_with_catalogs(root)) if c in LANGS]
    report = {"langs": {}, "pages": len(pages)}
    published: dict[str, set[str]] = {}
    langs: dict[str, Lang] = {}
    for code in codes:
        strings, meta = load_lang(code, root)
        lang = langs[code] = Lang(code, strings, meta)
        # first pass: which pages are fully translated (their links need the whole set)
        ok, miss = set(), {}
        for path, _doc, nm in pages:
            m, _chrome = missing_keys(segmented[path][1], nm, lang)
            if m:
                miss[path] = m
            else:
                ok.add(path)
        if "" not in ok:  # the trips send a browser to the app: only where the app shell is
            for p in sorted(p for p in ok if p.startswith("t/")):
                ok.discard(p)
                miss[p] = ["(the home page is not translated)"]
        published[code] = ok
        report["langs"][code] = {"published": len(ok), "total": len(pages),
                                 "missing_pages": {p: m[:20] for p, m in sorted(miss.items())},
                                 "missing_keys": len({k for m in miss.values() for k in m})}
    # second pass: write, with the alternates every page now knows
    for code in codes:
        lang = langs[code]
        chrome_missing = 0
        for path in sorted(published[code]):
            _doc, nm = by_path[path]
            langs_here = [c for c in codes if path in published[c]]
            r = translate_page(path, segmented[path], nm, lang, host, published[code], alternates_block(host, path, langs_here))
            chrome_missing += r.chrome_missing
            page = home_shell(r.html, lang) if path == "" else r.html
            dest = out / code / (path or "index.html")
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(page, encoding="utf-8")
        report["langs"][code]["chrome_strings_in_english"] = chrome_missing
    # the aliases (/iss/ for the station's page): the language's copy of the page they name, with the same canonical
    aliases = alias_pages(out, host, set(by_path))
    for code in codes:
        n = 0
        for alias, target in sorted(aliases.items()):
            if target in published[code]:
                dest = out / code / alias
                dest.parent.mkdir(parents=True, exist_ok=True)
                dest.write_text(alias_copy((out / code / (target or "index.html")).read_text(encoding="utf-8"), host, code, alias, target),
                                encoding="utf-8")
                n += 1
        report["langs"][code]["aliases"] = n
    # the English pages: their alternates (the app shell and the trips are copied from site/ into out/ for this)
    for path, (doc, nm) in by_path.items():
        langs_here = [c for c in codes if path in published[c]]
        src = source_file(out, path)
        dest = out / (path or "index.html")
        text = src.read_text(encoding="utf-8")
        if langs_here:
            text = with_alternates(text, alternates_block(host, path, langs_here))
        else:
            text = strip_alternates(text)
        if src != dest or langs_here:
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_text(text, encoding="utf-8")
    # the sitemaps
    dates = dates or {}
    english_dates = _sitemap_dates(out / "sitemap-pages.xml")
    report["sitemaps"] = []
    for code in codes:
        if not published[code]:
            continue
        name = f"sitemap-pages-{code}.xml"
        rows = []
        for path in [p for p in by_path if p in published[code]]:
            langs_here = [c for c in codes if path in published[c]]
            rows.append(_sitemap_row(host, code, path, english_dates.get(url_of(host, "en", path), ""), langs_here))
        (out / name).write_text(_urlset(rows), encoding="utf-8")
        report["sitemaps"].append(name)
    report["sitemaps"] = [f"sitemap-pages-{c}.xml" for c in codes if published[c]]
    # the English sitemap: every row as it was (the English-only pages too), with the alternates of a page that has another language
    if any(published.values()):
        xml = (out / "sitemap-pages.xml").read_text(encoding="utf-8")

        def with_links(m):
            loc = html.unescape(m.group(1))
            path = loc[len(host) + 1:] if loc.startswith(host + "/") else None
            langs_here = [c for c in codes if path is not None and path in published[c]]
            return _sitemap_row(host, "en", path, m.group(2), langs_here) if langs_here else m.group(0)
        xml = re.sub(r"<url><loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>(?:<xhtml:link[^>]*/>)*</url>", with_links, xml)
        xml = xml.replace('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
                          '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">', 1)
        (out / "sitemap-pages.xml").write_text(xml, encoding="utf-8")
    (out / "i18n-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    (out / "lang-dirs.txt").write_text("".join(f"{c}\n" for c in codes if published[c]), encoding="utf-8")
    return report


CANONICAL = re.compile(r'<link rel="canonical" href="([^"]*)">')


def alias_pages(out: Path, host: str, listed: set[str]) -> dict[str, str]:
    """{path: target path} for every English page that is not in the sitemap and whose canonical is a page of it on this
    host (/iss/ names o/international-space-station.html). The language folders and the sitemap's own pages are skipped."""
    found = {}
    for f in sorted(out.rglob("*.html")):
        rel = f.relative_to(out).as_posix()
        if rel.split("/")[0] in LANGS or rel in listed or (rel == "index.html" and "" in listed):
            continue
        m = CANONICAL.search(f.read_text(encoding="utf-8", errors="replace")[:6000])
        if not m:
            continue
        canon = html.unescape(m.group(1))
        target = canon[len(host) + 1:] if canon.startswith(host + "/") else None
        if target is not None and target != rel and target in listed and not (target == "" and rel == "index.html"):
            found[rel] = target
    return found


def alias_copy(page: str, host: str, code: str, alias: str, target: str) -> str:
    """An alias in a language: the language's page it names, with its canonical (the page's own address) and no hreflang, and
    og:url the alias's own, as the English alias has. Where the alias is not as deep as its page, a <base> makes the page's
    relative addresses still mean what they meant."""
    page = strip_alternates(page)
    own, canon = url_of(host, code, alias), url_of(host, code, target)
    if alias.count("/") != target.count("/"):
        base = posixpath.relpath(posixpath.dirname(target) or ".", posixpath.dirname(alias) or ".")
        if base != ".":
            page = page.replace("<head>\n", f'<head>\n<base href="{html.escape(base)}/">\n', 1)
    return re.sub(r'<meta property="og:url" content="[^"]*">', f'<meta property="og:url" content="{html.escape(own)}">', page, count=1)


def _sitemap_dates(f: Path) -> dict[str, str]:
    xml = f.read_text(encoding="utf-8")
    return {html.unescape(u): d for u, d in re.findall(r"<url><loc>([^<]+)</loc><lastmod>([^<]+)</lastmod>", xml)}


def _sitemap_row(host: str, code: str, path: str, lastmod: str, langs_here: list[str]) -> str:
    loc = html.escape(url_of(host, code, path))
    links = ""
    if langs_here:
        alts = ["en"] + [c for c in LANGS if c in langs_here]
        links = "".join(f'<xhtml:link rel="alternate" hreflang="{TAG[c]}" href="{html.escape(url_of(host, c, path))}"/>' for c in alts)
        links += f'<xhtml:link rel="alternate" hreflang="x-default" href="{html.escape(url_of(host, "en", path))}"/>'
    return f"<url><loc>{loc}</loc>" + (f"<lastmod>{lastmod}</lastmod>" if lastmod else "") + links + "</url>"


def _urlset(rows: list[str]) -> str:
    return ('<?xml version="1.0" encoding="UTF-8"?>\n'
            '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n'
            + "\n".join(rows) + "\n</urlset>\n")


# --- the translator's pieces --------------------------------------------------------------------------------------------

def flat(out_dir: Path, missing: str | None = None, root: Path = CAT) -> list[Path]:
    """The English catalog (or only what `missing` lacks) as JSON pieces of about PIECE characters, area by area, each
    string beside where it is first seen. A translator replaces the values and leaves the keys."""
    out_dir.mkdir(parents=True, exist_ok=True)
    en = load_area_files("en", root)
    ctxf = root / "en" / "_context.json"
    ctx = json.loads(ctxf.read_text(encoding="utf-8")) if ctxf.is_file() else {}
    have = load_lang(missing, root)[0] if missing else {}
    files, n = [], 0
    for a in AREAS:
        piece, size = {}, 0
        rows = [(k, v) for k, v in en[a].items() if not missing or k not in have or problems(v, have[k])]
        for k, v in rows:
            piece[k] = v
            size += len(v) + 16
            if size >= PIECE:
                n += 1
                files.append(_write_piece(out_dir, n, a, piece, ctx))
                piece, size = {}, 0
        if piece:
            n += 1
            files.append(_write_piece(out_dir, n, a, piece, ctx))
    return files


def _write_piece(d: Path, n: int, area: str, piece: dict, ctx: dict) -> Path:
    f = d / f"{n:03d}-{area}.json"
    f.write_text(dumps(piece), encoding="utf-8")
    (d / f"{n:03d}-{area}.context.json").write_text(dumps({k: ctx.get(k, "") for k in piece}), encoding="utf-8")
    return f


def merge(lang: str, src: Path, root: Path = CAT) -> tuple[int, list[str]]:
    """Merge translated pieces (src/NNN-<area>.json, the keys of flat()) into registry/seo-i18n/<lang>/<area>.json.
    A string with a lost slot or tag is refused and listed; the rest are written, sorted as the English."""
    en_areas = load_area_files("en", root)
    en = {k: v for rows in en_areas.values() for k, v in rows.items()}
    area_of_key = {k: a for a, rows in en_areas.items() for k in rows}
    cur = load_area_files(lang, root)
    bad, n = [], 0
    for f in sorted(src.glob("*.json")):
        if f.name.endswith(".context.json"):
            continue
        rows = json.loads(f.read_text(encoding="utf-8"))
        for k, v in rows.items():
            if k not in en:
                bad.append(f"{f.name}: {k}: not in the English catalog")
                continue
            p = problems(en[k], v)
            if p:
                bad.append(f"{f.name}: {k}: {'; '.join(p)}")
                continue
            cur[area_of_key[k]][k] = v
            n += 1
    d = root / lang
    d.mkdir(parents=True, exist_ok=True)
    for a in AREAS:
        rows = {k: cur[a][k] for k in en_areas[a] if k in cur[a]}
        if rows or (d / f"{a}.json").is_file():
            (d / f"{a}.json").write_text(dumps(rows), encoding="utf-8")
    return n, bad


# --- the command line ---------------------------------------------------------------------------------------------------

def _catalog_text(cat: dict, ctx: dict) -> dict[str, str]:
    return {**{f"{a}.json": dumps(cat[a]) for a in AREAS}, "_context.json": dumps(dict(sorted(ctx.items())))}


def main(argv: list[str]) -> int:
    if not argv or argv[0] in ("-h", "--help"):
        print(USAGE)
        return 0 if argv else 2
    cmd, args = argv[0], argv[1:]
    opt = {}
    pos = []
    while args:
        a = args.pop(0)
        if a.startswith("--"):
            opt[a[2:]] = args.pop(0) if args and not args[0].startswith("--") else True
        else:
            pos.append(a)
    host = str(opt.get("host", DEFAULT_HOST)).rstrip("/")
    root = Path(opt["root"]) if "root" in opt else CAT
    if cmd == "extract":
        # --built DIR: the build to read. --also DIR[,DIR]: more builds whose extra sentences join the catalog: a deploy's
        # (--snapshot-index: the saved copies' sources and days; numpy present: the paper globes) and CI's (neither).
        built = Path(opt["built"])
        cat, ctx = extract(built, host)
        for also in (opt["also"].split(",") if isinstance(opt.get("also"), str) else []):
            cat2, ctx2 = extract(Path(also), host)
            have = {k for rows in cat.values() for k in rows}
            for a2, rows in cat2.items():
                for k, v in rows.items():
                    if k not in have:
                        cat[a2][k] = v
                        ctx[k] = ctx2[k] + " (a deploy's build)"
        if opt.get("check"):
            en = load_english(root)
            need = {k: v for rows in cat.values() for k, v in rows.items()}
            missing = [k for k in need if k not in en]
            unused = [k for k in en if k not in need]
            if missing:
                print(f"seo_i18n: the English pages say {len(missing)} things registry/seo-i18n/en/ does not have, for example "
                      + "; ".join(repr(need[k][:60]) for k in missing[:3])
                      + "\n  run: python3 scripts/build_seo.py --out DIR && python3 scripts/seo_i18n.py extract --built DIR"
                      + " (docs/TRANSLATING.md, \"The pages a search engine reads\")", file=sys.stderr)
                for k in missing[:60]:  # all of them, so a build elsewhere (CI) says exactly what to add
                    print(f"  missing {k}: {json.dumps(need[k], ensure_ascii=False)}", file=sys.stderr)
                return 1
            note = f"; {len(unused)} more are a deploy's (or no longer said)" if unused else ""
            print(f"seo_i18n: the English catalog holds every string of the build ({len(need)}{note})")
            return 0
        write_catalog(cat, ctx, root)
        total = {a: (len(cat[a]), sum(words(v) for v in cat[a].values())) for a in AREAS}
        for a, (n, w) in total.items():
            print(f"  {a:10s} {n:6d} strings {w:8d} words")
        print(f"  {'all':10s} {sum(n for n, _ in total.values()):6d} strings {sum(w for _, w in total.values()):8d} words")
        return 0
    if cmd == "flat":
        files = flat(Path(opt["out"]), opt.get("missing") if isinstance(opt.get("missing"), str) else None, root)
        print(f"seo_i18n: {len(files)} pieces in {opt['out']}")
        return 0
    if cmd == "merge":
        lang, src = pos[0], Path(pos[1])
        n, bad = merge(lang, src, root)
        for b in bad:
            print("  refused " + b, file=sys.stderr)
        print(f"seo_i18n: {n} strings merged into registry/seo-i18n/{lang}/, {len(bad)} refused")
        return 1 if bad else 0
    if cmd == "check":
        codes = pos or langs_with_catalogs(root)
        bad = [p for c in codes for p in check_lang(c, root)]
        for b in bad:
            print("  " + b, file=sys.stderr)
        en = load_english(root)
        for c in codes:
            rows, _ = load_lang(c, root)
            have = sum(1 for k in en if k in rows)
            print(f"seo_i18n: {c}: {have} of {len(en)} strings ({100 * have / max(1, len(en)):.1f} %)")
        return 1 if bad else 0
    if cmd == "coverage":
        rep = json.loads((Path(opt["built"]) / "i18n-report.json").read_text(encoding="utf-8"))
        for c, r in rep["langs"].items():
            print(f"{c}: {r['published']} of {r['total']} pages")
        return 0
    print(USAGE, file=sys.stderr)
    return 2


USAGE = ("usage: python3 scripts/seo_i18n.py extract --built DIR [--also DIR,DIR] [--check] | flat --out DIR [--missing CODE] | "
         "merge CODE DIR | check [CODE ...] | coverage --built DIR   (docs/TRANSLATING.md, \"The pages a search engine reads\")")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
