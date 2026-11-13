#!/usr/bin/env python3
"""The pages in other languages (scripts/seo_i18n.py), held without a build: a small built tree written here.

  1. SEGMENTS: a block's text with its inline tags as <n>, numbers as {n1}, dates as {d1}, the page's subject as {name}; the
     same sentence with other numbers is the same key; code, keys, designations and translate="no" are not in the catalog.
  2. THE RULE OF PUBLISHING: a page is built in a language only when every string of its own text is translated; the
     chrome (header, nav, footer) falls back to English string by string; a lost slot or tag counts as untranslated; the
     trips only where the app shell is; ENGLISH_ONLY pages never.
  3. WHAT A TRANSLATED PAGE IS: <html lang dir>, a self canonical, og:url, og:locale, hreflang for exactly the versions that
     exist (and x-default the English), reciprocal on the English page, the note linking the English original, links to
     the language's own pages where they exist and to the English ones where not, assets from the root, JSON-LD in the
     language, numbers and dates in its style, the app shell with <base href="../">.
  4. SITEMAPS: one per language with a page, xhtml:link alternates, the English one gains them; the index and robots.txt.
  5. THE TRANSLATOR'S TOOLS: flat pieces (and --missing), merge refusing a lost slot or tag, check naming unknown keys.
  6. THE COMMITTED CATALOG: every translation's key is in the English, no slot or tag lost (scripts/seo_i18n.py check).
  7. check_seo.check_languages accepts the tree built here.
"""

from __future__ import annotations

import json
import re
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import seo_i18n as S  # noqa: E402

HOST = "https://www.spaceradar.ai"
fails = 0


def check(ok: bool, what: str) -> None:
    global fails
    if not ok:
        fails += 1
        print(f"FAIL: {what}")


def page(title: str, desc: str, body: str, url: str, rel_css: str, extra_head: str = "", ld: dict | None = None) -> str:
    ld = ld or {"@context": "https://schema.org", "@graph": [{"@type": "WebPage", "@id": url, "url": url, "name": title,
                                                              "description": desc, "inLanguage": "en"}]}
    return (f'<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>{title}</title>\n'
            f'<meta name="description" content="{desc}">\n<link rel="canonical" href="{url}">\n'
            f'<meta property="og:site_name" content="Space Radar">\n<meta property="og:url" content="{url}">\n'
            f'<link rel="stylesheet" href="{rel_css}css/static.css">\n{extra_head}'
            f'<script type="application/ld+json">{json.dumps(ld)}</script>\n</head>\n<body>\n'
            f'<header class="top"><a class="brand" href="{rel_css}">Space Radar</a></header>\n'
            f'<main id="main">\n{body}\n</main>\n'
            f'<footer class="foot"><p>A free map of space.</p><a href="{rel_css}about/index.html">About</a></footer>\n</body>\n</html>\n')


def tree(tmp: Path) -> Path:
    """A built tree of five pages: the app shell, about/, an object page, a trip and an English-only page."""
    b = tmp / "built"
    (b / "o").mkdir(parents=True)
    (b / "about").mkdir()
    (b / "t").mkdir()
    (b / "planets-tonight").mkdir()
    (b / "index.html").write_text(
        '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<title>Space Radar: live 3D map of space</title>\n'
        '<meta name="description" content="A live 3D map of space: satellites and the ISS, planets, stars and galaxies, each where it really is.">\n'
        f'<link rel="canonical" href="{HOST}/">\n<meta property="og:site_name" content="Space Radar">\n<meta property="og:url" content="{HOST}/">\n'
        '<link rel="stylesheet" href="css/ui.css">\n</head>\n<body>\n<a class="sr-skip" href="#map">Skip to the map</a>\n'
        '<main class="sr-scene" id="map"><canvas id="stage">A map of what is in orbit.</canvas></main>\n'
        '<noscript id="sr-readable-src">\n<div class="sr-readable" id="sr-readable">\n<p>The map needs JavaScript.</p>\n'
        '<ul><li><a href="about/index.html">About Space Radar</a></li><li><a href="t/trip.html">A trip</a></li></ul>\n</div>\n</noscript>\n'
        "<script type=\"module\">const { LANG } = await import('./js/copy/lang.js');</script>\n</body>\n</html>\n", encoding="utf-8")
    (b / "about" / "index.html").write_text(page(
        "About Space Radar", "What Space Radar is, who makes it, where its numbers come from and what it will never do with you.",
        '<h1>About Space Radar</h1>\n<p>It shows <strong>27,600 km/h</strong> and 51.6° and 1,487 objects, saved 13 November 2026.</p>\n'
        '<p>Open <a href="../o/jupiter.html">Jupiter</a> or <a href="../t/trip.html">the trip</a> or <a href="../planets-tonight/index.html">tonight</a>.</p>\n'
        '<p>Run <code>python3 -m http.server 8000</code> to serve it.</p>\n<ul class="cards" translate="no" lang="en"><li>A journal post title</li></ul>\n'
        '<p>B0.5IV</p>\n<img src="../images/a.webp" alt="A picture of the Earth at night">',
        f"{HOST}/about/index.html", "../"), encoding="utf-8")
    jup_ld = {"@context": "https://schema.org", "@graph": [
        {"@type": "WebPage", "@id": f"{HOST}/o/jupiter.html", "url": f"{HOST}/o/jupiter.html", "name": "Jupiter: where it is now",
         "description": "Jupiter is a world in the solar system, about 139 822 km across.",
         "breadcrumb": {"@type": "BreadcrumbList", "itemListElement": [{"@type": "ListItem", "position": 1, "name": "Space Radar", "item": f"{HOST}/"}]}},
        {"@type": "Thing", "@id": f"{HOST}/o/jupiter.html#thing", "name": "Jupiter", "description": "Jupiter is a world in the solar system, about 139 822 km across."}]}
    (b / "o" / "jupiter.html").write_text(page(
        "Jupiter: where it is now", "Jupiter is a world in the solar system, about 139 822 km across. Where it is right now is on the live 3D map.",
        '<h1>Jupiter</h1>\n<p class="lead">Jupiter is a world in the solar system, about 139 822 km across.</p>\n'
        '<p><a href="../#at=jupiter">See it live</a></p>\n<script type="module" src="../js/pages/live.js"></script>',
        f"{HOST}/o/jupiter.html", "../", ld=jup_ld), encoding="utf-8")
    (b / "t" / "trip.html").write_text(page(
        "A trip", "A guided trip through the map: from the ground to the station and its next pass over your place.",
        '<h1>A trip</h1>\n<p>From the ground to the station.</p>\n<meta http-equiv="refresh" content="0; url=../#trip=x">',
        f"{HOST}/t/trip.html", "../"), encoding="utf-8")
    (b / "planets-tonight" / "index.html").write_text(page(
        "Planets tonight", "Which planets you can see tonight, where to look and when, worked out for your place in your browser.",
        "<h1>Planets tonight</h1>\n<p>Venus is up.</p>", f"{HOST}/planets-tonight/index.html", "../"), encoding="utf-8")
    urls = ["", "about/index.html", "o/jupiter.html", "t/trip.html", "planets-tonight/index.html"]
    (b / "sitemap-pages.xml").write_text('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
                                         + "\n".join(f"<url><loc>{HOST}/{u}</loc><lastmod>2026-11-13</lastmod></url>" for u in urls)
                                         + "\n</urlset>\n", encoding="utf-8")
    return b


def main() -> int:
    # --- 1. segments and slots ---------------------------------------------------------------------------
    _items, segs = S.segment_page('<p>It is <a href="x.html">about 27,600 km/h</a> on 13 November 2026, 51.6° up.</p>', None, set())
    check([s.template for s in segs] == ["It is <1>about {n1} km/h</1> on {d1}, {n2}° up."], f"a block, its link as <1>, a number, a date ({[s.template for s in segs]})")
    _i, a = S.segment_page("<p>France has 647 objects in orbit</p>", "France", {"France"})
    _i, b = S.segment_page("<p>Spain has 12 objects in orbit</p>", "Spain", {"Spain"})
    check(a[0].template == "{name} has {n1} objects in orbit" and a[0].key == b[0].key, "the same sentence with another name and number is one key")
    _i, c = S.segment_page("<p>B0.5IV</p><p>KOI-351 b</p><p><code>python3 -m http.server</code></p><ul translate=\"no\"><li>A post</li></ul>"
                           "<p>Press <kbd>Esc</kbd> to leave</p>", None, set())
    check([s.template for s in c] == ["Press <1/> to leave"], f"designations, code and translate=no stay out; a key is a placeholder ({[s.template for s in c]})")
    check(S.NUMBER.findall("version 1.9.0 and r185 and M31") == [], "a version, a release and a catalogue name are not numbers")
    _i, d = S.segment_page('<head><title>Jupiter: where it is now | Space Radar</title><meta name="description" content="Jupiter is big."></head>', "Jupiter", {"Jupiter"})
    check([s.template for s in d] == ["{name}: where it is now | Space Radar", "{name} is big."], f"the title and the description are segments ({[s.template for s in d]})")

    es = S.Lang("es", {}, json.loads((ROOT / "registry/seo-i18n/es/_meta.json").read_text(encoding="utf-8")))
    check(es.number("27,600") == "27 600" and es.number("1,487") == "1487" and es.number("51.6") == "51,6" and es.number("2026") == "2026",
          f"Spanish numbers: 27 600, 1487, 51,6, years as they are ({es.number('27,600')!r} {es.number('1,487')!r} {es.number('51.6')!r})")
    check(es.date(("dmy", 13, 11, 2026)) == "13 de noviembre de 2026", "a Spanish date")
    check(S.problems("It is {n1} km", "Son km") and S.problems("<1>a</1> b", "a b") and not S.problems("<1>a</1> {n1}", "{n1} <1>b</1>"),
          "a lost slot or tag is a problem; moved ones are not")

    with tempfile.TemporaryDirectory() as t:
        tmp = Path(t)
        built = tree(tmp)
        cat_root = tmp / "cat"
        cat, ctx = S.extract(built, HOST)
        S.write_catalog(cat, ctx, cat_root)
        en = S.load_english(cat_root)
        check(not any("Planets tonight" == v for v in en.values()) and any(v == "About Space Radar" for v in en.values()),
              "an ENGLISH_ONLY page is not in the catalog; the others are")
        check(all("journal post" not in v for v in en.values()) and all(v != "B0.5IV" for v in en.values()), "translate=no and designations are not")
        check("Jupiter" in cat["names"].values(), "the subject's name is in the names area")
        (cat_root / "es").mkdir()
        shutil.copy(ROOT / "registry/seo-i18n/es/_meta.json", cat_root / "es" / "_meta.json")

        def spanish(skip=(), bad=()):
            rows = {}
            for k, v in en.items():
                if v in skip:
                    continue
                rows[k] = ("ES " + v) if v not in bad else re.sub(r"\{n1\}", "", v)
            (cat_root / "es" / "static.json").write_text(json.dumps(rows), encoding="utf-8")
            for f in (built / "es").rglob("*.html") if (built / "es").exists() else []:
                f.unlink()

        # --- 2. the rule of publishing -----------------------------------------------------------------------
        spanish(skip=("It shows <1>{n1} km/h</1> and {n2}° and {n3} objects, saved {d1}.",))
        rep = S.build_languages(built, HOST, root=cat_root, only=["es"])
        miss = rep["langs"]["es"]["missing_pages"]
        check("about/index.html" in miss and not (built / "es/about/index.html").exists(), "one sentence of its own untranslated: the page is not built")
        check("o/jupiter.html" not in miss and (built / "es/o/jupiter.html").exists(), "the others are")
        spanish(skip=("A free map of space.",))
        rep = S.build_languages(built, HOST, root=cat_root, only=["es"])
        check((built / "es/about/index.html").exists() and rep["langs"]["es"]["chrome_strings_in_english"] > 0
              and "A free map of space." in (built / "es/about/index.html").read_text(encoding="utf-8"),
              "a footer string untranslated: the page is built, that string in English")
        spanish(bad=("{name} is a world in the solar system, about {n1} km across.",))
        rep = S.build_languages(built, HOST, root=cat_root, only=["es"])
        check("o/jupiter.html" in rep["langs"]["es"]["missing_pages"], "a translation that lost its slot does not count")
        spanish(skip=("Space Radar: live 3D map of space",))
        rep = S.build_languages(built, HOST, root=cat_root, only=["es"])
        check(not (built / "es/index.html").exists() and not (built / "es/t/trip.html").exists(), "no app shell, no trips")
        check(not (built / "es/planets-tonight").exists(), "an ENGLISH_ONLY page is never built")

        # --- 3. a translated page ------------------------------------------------------------------------------
        spanish()
        rep = S.build_languages(built, HOST, root=cat_root, only=["es"])
        check(rep["langs"]["es"]["published"] == 4, f"all four pages built ({rep['langs']['es']['published']})")
        ab = (built / "es/about/index.html").read_text(encoding="utf-8")
        check('<html lang="es" dir="ltr">' in ab, "<html lang dir>")
        check(f'<link rel="canonical" href="{HOST}/es/about/index.html">' in ab and f'<meta property="og:url" content="{HOST}/es/about/index.html">' in ab,
              "a self canonical and og:url")
        check('<meta property="og:locale" content="es_ES">' in ab, "og:locale")
        alts = re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', ab)
        check(alts == [("en", f"{HOST}/about/index.html"), ("es", f"{HOST}/es/about/index.html"), ("x-default", f"{HOST}/about/index.html")],
              f"hreflang: the versions that exist and x-default ({alts})")
        eng = (built / "about/index.html").read_text(encoding="utf-8")
        check(re.findall(r'<link rel="alternate" hreflang="([^"]+)" href="([^"]+)">', eng) == alts, "the English page carries the same set")
        check(f'data-i18n-note>Esta página es una traducción automática del <a href="{HOST}/about/index.html" hreflang="en">' in ab, "the note links the English original")
        check('href="../../css/static.css"' in ab and 'href="../o/jupiter.html"' in ab and 'href="../../planets-tonight/index.html"' in ab,
              "assets from the root, a page in Spanish where it is, the English where not")
        check("27 600 km/h" in ab and "51,6°" in ab and "13 de noviembre de 2026" in ab and "1487 objects" in ab, "numbers and dates in Spanish style")
        check('<code>python3 -m http.server 8000</code>' in ab and 'translate="no" lang="en"><li>A journal post title</li>' in ab, "code and translate=no as they were")
        check('alt="ES A picture of the Earth at night"' in ab, "an alt text translated")
        ld = json.loads(re.search(r'<script type="application/ld\+json">(.*?)</script>', ab).group(1))
        check(ld["@graph"][0]["inLanguage"] == "es" and ld["@graph"][0]["url"] == f"{HOST}/es/about/index.html" and ld["@graph"][0]["name"].startswith("ES "),
              "JSON-LD: inLanguage, the page's URL and its text")
        jp = (built / "es/o/jupiter.html").read_text(encoding="utf-8")
        check("<h1>ES Jupiter</h1>" in jp, "the subject's own name, alone in its heading, is its names entry translated")
        check("js/pages/live.js" not in jp, "a translated page does not run live.js (its sentences are English)")
        check('href="../#at=jupiter"' in jp, "the map link goes to the Spanish app shell")
        home = (built / "es/index.html").read_text(encoding="utf-8")
        check('<base href="../">' in home and 'href="es/#map"' in home and 'href="es/about/index.html"' in home and "import('./js/copy/lang.js')" in home,
              "the app shell: a base, its skip link kept on the page, links to the Spanish pages, its modules from the root")
        check("data-i18n-note" in home and home.index("data-i18n-note") > home.index('class="sr-readable"'), "its note is in the readable page")
        trip = (built / "es/t/trip.html").read_text(encoding="utf-8")
        check('content="0; url=../#trip=x"' in trip, "a trip sends the browser to the Spanish app")

        # --- 4. sitemaps -------------------------------------------------------------------------------------
        sm = (built / "sitemap-pages-es.xml").read_text(encoding="utf-8")
        check(rep["sitemaps"] == ["sitemap-pages-es.xml"] and sm.count("<url>") == 4 and 'xmlns:xhtml="http://www.w3.org/1999/xhtml"' in sm,
              "one Spanish sitemap of four pages")
        check(f'<url><loc>{HOST}/es/about/index.html</loc><lastmod>2026-11-13</lastmod><xhtml:link rel="alternate" hreflang="en" href="{HOST}/about/index.html"/>' in sm,
              "each URL with its English date and alternates")
        en_sm = (built / "sitemap-pages.xml").read_text(encoding="utf-8")
        check(f'<loc>{HOST}/planets-tonight/index.html</loc><lastmod>2026-11-13</lastmod></url>' in en_sm and en_sm.count("<xhtml:link") == 4 * 3,
              f"the English sitemap: alternates where a translation exists, none where not ({en_sm.count('<xhtml:link')})")
        import seo_sitemaps
        idx = seo_sitemaps.index(HOST, "2026-11-13", rep["sitemaps"])
        locs = re.findall(r"<loc>([^<]+)</loc>", idx)
        check(locs[:3] == [f"{HOST}/sitemap-pages.xml", f"{HOST}/sitemap-pages-es.xml", f"{HOST}/sitemap-images.xml"], "the index: English pages, Spanish, pictures")

        # --- 7. check_seo accepts it ----------------------------------------------------------------------------
        import check_seo
        (built / "robots.txt").write_text(f"User-agent: *\nAllow: /\nSitemap: {HOST}/sitemap.xml\nSitemap: {HOST}/sitemap-pages-es.xml\n", encoding="utf-8")
        site = tmp / "site"
        (site / "css").mkdir(parents=True)
        probs: list[str] = []
        check_seo.check_languages(site, built, probs.append, (built / "robots.txt").read_text(encoding="utf-8"))
        probs = [p for p in probs if "description is" not in p]  # the fixture's own descriptions are short
        check(not probs, f"check_languages accepts the tree ({probs[:4]})")
        (built / "es/about/index.html").write_text(ab.replace('hreflang="es"', 'hreflang="sp"', 1), encoding="utf-8")
        probs = []
        check_seo.check_languages(site, built, probs.append, "")
        check(any("'sp' is not one of" in p for p in probs) and any("does not name" in p and "sitemap-pages-es.xml" in p for p in probs),
              "and refuses a bad hreflang code and a robots.txt without the language sitemap")

        # --- 5. the translator's tools ----------------------------------------------------------------------------
        pieces = tmp / "pieces"
        files = S.flat(pieces, None, cat_root)
        check(files and all(f.name[:3].isdigit() for f in files) and (pieces / (files[0].stem + ".context.json")).is_file(), "flat: numbered pieces beside their context")
        some = json.loads(files[0].read_text(encoding="utf-8"))
        k0 = next(iter(some))
        (cat_root / "es" / "static.json").write_text("{}", encoding="utf-8")
        missing = S.flat(tmp / "missing", "es", cat_root)
        check(sum(len(json.loads(f.read_text())) for f in missing) == len(en), "--missing es lists what Spanish lacks")
        out = tmp / "back"
        out.mkdir()
        lossy = {k: re.sub(r"\{n\d\}|</?\d+/?>", "", v) for k, v in some.items()}
        (out / "001-x.json").write_text(json.dumps({**{k: "ES " + v for k, v in some.items()}, **{k: lossy[k] for k in lossy if lossy[k] != some[k]},
                                                     "nokey": "x"}), encoding="utf-8")
        n, bad = S.merge("es", out, cat_root)
        check(any("nokey" in b for b in bad) and n >= 1 and all(not S.problems(en[k], v) for k, v in S.load_lang("es", cat_root)[0].items()),
              f"merge writes what is whole and refuses a lost slot or tag and an unknown key ({n}, {bad[:2]})")
        check(k0 in S.load_lang("es", cat_root)[0] or any(k0 in b for b in bad), "the merged key is in place")

    # --- 6. the committed catalog --------------------------------------------------------------------------------
    for code in S.langs_with_catalogs():
        probs = S.check_lang(code)
        check(not probs, f"registry/seo-i18n/{code}/: {probs[:3]}")
    doc = (ROOT / "docs/TRANSLATING.md").read_text(encoding="utf-8")
    for path, why in S.ENGLISH_ONLY.items():
        check(path in doc, f"docs/TRANSLATING.md says why {path} stays English")

    if fails:
        print(f"seo i18n: {fails} check(s) FAILED")
        return 1
    print("seo i18n ok: segments, slots and keys; a page only when its own text is whole; the translated page, its hreflang both ways, "
          "its sitemap; the translator's pieces, merge and check; the committed catalogs")
    return 0


if __name__ == "__main__":
    sys.exit(main())
