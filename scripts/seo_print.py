#!/usr/bin/env python3
"""The page that lists the paper models, /print/ (forge #161).

The page is built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host); the sheets
themselves are scripts/paper_models.py's PDFs, written beside it into <out>/print/ by write(out). Both read the
same plan (paper_models.plan: registry/textures.yaml, each licence checked), so the page never lists a sheet the
build would refuse and never misses one it made.

WHEN THE PDFs ARE MADE. Thirty-two globes are a few minutes of resampling, and a dozen tests run build_seo.py, so
the PDFs are written only when SR_PRINT=1 is set: scripts/deploy.sh sets it for the deploy's build. Without it the
page is built as at deploy and its PDF links point at files the build did not write (scripts/check_seo.py follows
.html links only). A build without Pillow lists and writes the Moon wheel and the ladder strip alone: the globes
need it to read the maps.

Nothing here is loaded by the app: /print/ is a static page with plain links, and a PDF (0.2 to 1.1 MB) is fetched
only when a visitor asks for it.
"""

from __future__ import annotations

import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import paper_models  # noqa: E402
from seo_common import Page, esc, webpage  # noqa: E402
from seo_share import Spec  # noqa: E402

GITHUB = "https://github.com/Sara-Managed-Projects/space-radar"


def globes() -> list[dict]:
    return paper_models.plan()[0] if paper_models.have_pillow() else []


def globe_row(g: dict) -> str:
    sc = paper_models.scale_note(g["radius_km"], world=g["world"])
    said = g["licence_short"].split(",")[0].lower()
    licence = "" if said in g["credit"].lower() else f" ({g['licence_short']})"
    seen = f" {g['coverage'] * 100:.0f} % mapped; the rest plain." if g.get("coverage") and g["coverage"] < paper_models.COVERAGE_NOTE_BELOW else ""
    return (f'<li><h3><a href="{esc(g["slug"])}.pdf">{esc(g["name"])}</a></h3>'
            f'<p>{sc["diameter_mm"]:.0f} mm across, {esc(sc["ratio_words"])}; {esc(sc["other"])} at that scale: {esc(sc["other_words"])}.{esc(seen)}</p>'
            f'<p class="credit">{esc(g["credit"])}{esc(licence)}</p></li>')


def pages(host: str) -> list[Page]:
    gl = globes()
    n = len(gl)
    worlds = len({g["world"] for g in gl})
    twice = f" ({n} globes: {', '.join(sorted({g['world'].title() for g in gl if sum(h['world'] == g['world'] for h in gl) > 1}))} twice, with and without its clouds)" if n > worlds else ""
    extras = "".join(f'<li><h3><a href="{slug}.pdf">{esc(title)}</a></h3></li>' for slug, (title, _) in paper_models.EXTRAS.items())
    rows = "".join(globe_row(g) for g in gl)
    title = f"Printable paper planets: {n} globes for the classroom" if n else "Printable paper models for the classroom"
    desc = (f"Free paper globes of {n} worlds from real spacecraft maps, a Moon-phase wheel, a distance-ladder strip and a fold-up JWST: "
            "one A4 or Letter page each, to print.") if n else (
            "A free Moon-phase wheel, distance-ladder strip and fold-up JWST to print for the classroom, one A4 or Letter page each.")
    refused = paper_models.plan()[1]
    left_out = "".join(f"<li>{esc(r['world'].title())}: {esc(r['why'])}.</li>" for r in refused)
    body = (
        '<p class="eyebrow">Print and make</p>\n'
        f"<h1>Paper planets and models to print</h1>\n"
        f'<p class="lead">{f"A paper globe of every world Space Radar has a real map of, {worlds} of them{twice}, " if n else ""}'
        "a Moon-phase wheel, a distance-ladder strip and a fold-up James Webb Space Telescope. Each is one page of PDF, free, with no account, made by a script from the "
        "same maps and numbers the live map uses, so a sheet never disagrees with the app.</p>\n"
        '<div class="cta"><a class="btn btn--map" href="../">Open the live map</a><p>Every globe has a QR code that opens its world there.</p></div>\n'
        "<h2>How to print</h2>\n"
        "<ul>\n<li>Print at <strong>actual size</strong> (100 %, not \"fit to page\"): each sheet fits A4 and US Letter, landscape, with 10 mm to spare.</li>\n"
        "<li>Thick paper (160 to 200 g/m²) folds and holds best; thin card works for the Moon wheel.</li>\n"
        "<li>Each globe is 82 mm across: twelve gores joined at the equator, a glue tab on each, and the steps on the sheet.</li>\n</ul>\n"
        + (f"<h2>Paper globes: {worlds} worlds</h2>\n<p>Every map is a measured one, from spacecraft and telescopes, and each sheet prints its credit word "
           "for word with its licence: public domain, or CC BY 4.0 with the credit shown. Where a spacecraft saw only part of a world, the sheet "
           "says how much, and the rest is one plain colour with nothing invented.</p>\n"
           f'<ul class="cards">{rows}</ul>\n' if n else "")
        + f'<h2>Models</h2>\n<ul class="cards">{extras}</ul>\n'
        "<p>The Moon wheel's phases are computed (the lit share of the disc for each angle from the Sun) and the strip's distances are "
        "the ones the map's scale ladder shows, each with its source printed on the sheet. Webb is at 1 : 250 from NASA's published sizes (the 18 "
        "mirror segments, the secondary, the sunshield); the parts NASA gives no size for are estimated from NASA's own 3D model, and the sheet says which.</p>\n"
        "<h2>Not here, and why</h2>\n<ul>\n"
        f"{left_out}"
        "</ul>\n"
        '<p><a href="../teachers/index.html">Space Radar in the classroom</a> · '
        f'<a href="{GITHUB}/blob/main/scripts/paper_models.py">The script that makes the sheets</a></p>\n')
    page = Page(path="print/index.html", title=title, description=desc, body=body,
                foot="<p>Maps: as credited on each sheet (registry/textures.yaml). Sheets made by scripts/paper_models.py.</p>\n", og_title=title)
    page.jsonld = [webpage(host, page, [("Print and make", "")], extra={"about": {"@id": f"{host}/print/index.html#resource"}}),
                   {"@type": "LearningResource", "@id": f"{host}/print/index.html#resource", "name": "Paper planets and models to print",
                    "description": desc, "learningResourceType": ["printable", "hands-on activity"], "isAccessibleForFree": True, "inLanguage": "en",
                    "audience": {"@type": "EducationalAudience", "educationalRole": "teacher"}, "url": f"{host}/print/index.html",
                    "encodingFormat": "application/pdf"}]
    page.share = Spec(key="print/index", name="Paper planets to print", number=f"{n} globes" if n else "free", caption="Print and make",
                      kind="plain", colour="#ffd166", alt="Rings and a dot, captioned Paper planets to print.")
    return [page]


def write(out: Path) -> list[tuple[str, int]]:
    """The PDFs into <out>/print/, when SR_PRINT=1 (scripts/deploy.sh); [] otherwise."""
    if os.environ.get("SR_PRINT") != "1":
        return []
    return paper_models.write_all(out)


if __name__ == "__main__":
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    print("seo_print.py: the page is built through scripts/build_seo.py --out DIR; SR_PRINT=1 also writes the PDFs", file=sys.stderr)
    sys.exit(2)
