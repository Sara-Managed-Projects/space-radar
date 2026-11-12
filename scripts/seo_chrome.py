"""The chrome every static page shares: the header and the footer of the journal's design (internal web-kit layout.mjs),
filled for a page whose site root is `root` ("../" from o/x.html, "../../" from country/in/index.html, "/" for the 404).

    header(root, current="map", ember=True)   templates/partials/header.html: the orbit-ring brand, the sites
                                              (Map · Journal · Games · Lab), Subscribe and "Open the 3D map"
    footer(root, source, note="")             templates/partials/footer.html: the subscribe band, the brand and the
                                              site's links in the kit's columns (scripts/seo_footer.py), and the Buy
                                              Me a Coffee link (templates/partials/coffee.html, css/coffee.css: a row
                                              under the brand; from 1416 px the cup alone in the page's right gutter)
    styles(root)                              the stylesheets, tokens.css first, as a page's head links them
    lab_styles(root)                          the same, and css/lab.css after them, as a Lab simulator's head links them
    lab_footer(root)                          the Lab simulators' slim footer: the brand and one row of site links, no
                                              coffee link and no subscribe band (the header's Subscribe goes to the band on the Lab's list)

EMBER IS ONE ACTION A PAGE (web-kit/DESIGN.md): the header's "Open the 3D map" is the ember button when the page has
no main action of its own; a page that has one (See it live, Open the trip) passes ember=False and the header's
button is the kit's quiet ghost.
"""

from __future__ import annotations

from pathlib import Path

from seo_footer import footer_columns
from seo_subscribe import subscribe_form

TEMPLATES = Path(__file__).resolve().parent.parent / "templates"


def styles(root: str) -> str:
    return (f'<link rel="preload" href="{root}fonts/inter-400-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<link rel="preload" href="{root}fonts/barlow-semi-condensed-600-latin.woff2" as="font" type="font/woff2" crossorigin>\n'
            f'<link rel="stylesheet" href="{root}css/tokens.css">\n'
            f'<link rel="stylesheet" href="{root}css/static.css">\n'
            f'<link rel="stylesheet" href="{root}css/coffee.css">')


def lab_styles(root: str) -> str:
    return styles(root) + f'\n<link rel="stylesheet" href="{root}css/lab.css">'


def header(root: str, current: str = "map", ember: bool = True, subscribe: str = "#subscribe") -> str:
    text = (TEMPLATES / "partials" / "header.html").read_text(encoding="utf-8")
    here = ' aria-current="true"'
    return (text.replace("{{current_map}}", here if current == "map" else "").replace("{{current_lab}}", here if current == "lab" else "")
            .replace("{{subscribe_href}}", subscribe).replace("{{map_cls}}", "btn--map" if ember else "btn--ghost").replace("{{root}}", root).rstrip("\n"))


def coffee() -> str:
    """The Buy Me a Coffee link every Space Radar site carries (templates/partials/coffee.html; the kit's COFFEE)."""
    return (TEMPLATES / "partials" / "coffee.html").read_text(encoding="utf-8").strip()


def footer(root: str, source: str) -> str:
    text = (TEMPLATES / "partials" / "footer.html").read_text(encoding="utf-8")
    return (text.replace("{{subscribe}}", subscribe_form(root, source)).replace("{{coffee}}", coffee()).replace("{{footer_nav}}", footer_columns(root))
            .replace("{{root}}", root).rstrip("\n"))


LAB_LINKS = (("Sites", (("", "The 3D map"), ("https://blog.spaceradar.ai/", "Journal"), ("https://games.spaceradar.ai/", "Games"),
                        ("lab/index.html", "All simulators"))),
             ("More", (("about/index.html", "About"), ("sources/index.html", "Sources"), ("privacy/index.html", "Privacy"),
                       ("https://github.com/Sara-Managed-Projects/space-radar", "GitHub"))))


def lab_footer(root: str) -> str:
    """The footer partial for a simulator: no subscribe band and no Buy Me a Coffee link (they would crowd the picture
    and the controls; a simulator's head links neither css/coffee.css nor the form's script), and the site's links cut
    to two short columns. The Subscribe button of the header points at the band on the Lab's list."""
    text = (TEMPLATES / "partials" / "footer.html").read_text(encoding="utf-8")
    cols = "".join(
        f'<div><p class="foot__h">{h}</p><ul>' + "".join(
            f'<li><a href="{u if u.startswith("https:") else root + u}">{t}</a></li>' for u, t in links) + "</ul></div>\n"
        for h, links in LAB_LINKS)
    nav = f'<nav class="sitelinks" aria-label="Space Radar on the web">\n{cols}</nav>'
    return text.replace("{{subscribe}}", "").replace("{{coffee}}", "").replace("{{footer_nav}}", nav).replace("{{root}}", root).rstrip("\n")


def has_action(body: str) -> bool:
    """Whether a page's own text carries its main action (an ember .btn--map)."""
    return "btn--map" in body
