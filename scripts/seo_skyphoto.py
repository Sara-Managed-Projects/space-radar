#!/usr/bin/env python3
"""The page "Name the stars in your photo", /sky-photo/ (forge #572).

Built by scripts/seo_pages.py (through scripts/build_seo.py), which calls pages(host), in English and, through
scripts/seo_i18n.py, in every language whose catalog has all of its text (registry/seo-i18n/<lang>/static.json).

The page is the tool: site/js/pages/skyphoto.js draws it into the [data-skyphoto] box (its words are
site/js/copy/en.skyphoto.js and the `skyPhoto` section of each copy/<code>.js; the page reads its own <html lang>), and
site/js/pages/skyphoto-core.js is its arithmetic. The text around it says what a search engine and a careful reader need:
what it does, that the photo never leaves the device, what it does NOT do (find the sky with no help: a blind plate solve),
and where the stars come from. tests/test_skyphoto.mjs holds the tool and reads this file for a form that posts.
"""

from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from seo_common import Page, webpage  # noqa: E402
from seo_share import Spec  # noqa: E402

GITHUB = "https://github.com/Sara-Managed-Projects/space-radar"
PATH = "sky-photo/index.html"
TITLE = "Name the stars in your night-sky photo"
DESC = ("Pick a photo of the night sky and see its constellations, bright stars and planets named on it. "
        "Free, in your browser; the photo never leaves your device.")


def pages(host: str) -> list[Page]:
    body = (
        '<p class="eyebrow">Tools</p>\n'
        "<h1>Name the stars in your photo</h1>\n"
        '<p class="lead">Choose a photo of the night sky, tap two stars you know, and the constellations, the bright stars and the planets '
        "are drawn on it. Save the picture with their names. Your photo is read on this device and never uploaded.</p>\n"
        '<div class="wide skyphoto" data-skyphoto data-main-action><p class="skyphoto__noscript">This tool needs JavaScript. Your photo would still never leave your device.</p></div>\n'
        "<h2>How it lines up the sky</h2>\n"
        "<p>A camera with an ordinary lens draws the sky in one known way, so two stars are enough to tie a photo to it: where they are in the "
        "picture fixes which way the camera pointed, how it was turned and how wide it saw. Tap a star, say which one it is from the list, and do it "
        "again. A third star checks the fit and says how many pixels the stars miss by. Then <strong>Snap to the stars in the photo</strong> looks for the "
        "bright spots near where each star should be and lines everything up on all of them.</p>\n"
        "<p>If you do not know a star yet, give the time, a city near you and the way the camera faced for a first, rough sky. It shows which bright "
        "star is likely to be which, and two taps pin it.</p>\n"
        "<p>With a time, the planets and the Moon are drawn too. They move against the stars, so without a time they are left out. The time is read "
        "from the photo itself when the camera wrote it, on your device.</p>\n"
        "<h2>What it does not do</h2>\n"
        "<ul>\n"
        "<li>It does not find the sky in a photo by itself. That needs an index of star patterns at every scale, several megabytes for the "
        "naked-eye stars alone, and a star finder that copes with a noisy phone photo; it is not built here yet. You name two stars instead.</li>\n"
        "<li>It assumes an ordinary lens. A fisheye or a phone's ultra-wide camera bends straight lines, and the stars far from the middle will "
        "miss their places: the third star shows by how much.</li>\n"
        "<li>It names the brighter stars, the ones with proper names, and draws the constellation figures used in Western star maps. It does not "
        "mark satellites, meteors or faint galaxies.</li>\n"
        "</ul>\n"
        "<h2>Your photo stays with you</h2>\n"
        "<p>The photo is opened by your browser and drawn here; nothing of it is sent to Space Radar or anyone else, and nothing is kept when you "
        "close the page. The page asks the server only for its own star lists and words. The time it reads from the photo stays in the form on "
        "this page, and the place is a city you choose: nothing goes into the address bar.</p>\n"
        "<h2>Where the stars come from</h2>\n"
        "<p>The named stars are from the HYG catalogue (CC BY-SA 4.0), the constellation lines and names from d3-celestial by Olaf Frohn "
        "(BSD-3-Clause), and the planets and the Moon are worked out on your device by Astronomy Engine (MIT). The same data draws the sky from the "
        f'ground in the <a href="../">live map</a>. The code is open: <a href="{GITHUB}/blob/main/site/js/pages/skyphoto-core.js">how the photo is lined up</a>.</p>\n'
    )
    page = Page(path=PATH, title=TITLE, description=DESC, body=body, og_title=TITLE,
                extra_script='<link rel="stylesheet" href="../css/controls.css">\n<link rel="stylesheet" href="../css/skyphoto.css">\n'
                             '<script type="module" src="../js/pages/skyphoto.js"></script>\n')
    url = f"{host}/{PATH}"
    page.jsonld = [webpage(host, page, [("Name the stars in your photo", "")], extra={"mainEntity": {"@id": f"{url}#app"}}),
                   {"@type": "WebApplication", "@id": f"{url}#app", "name": "Name the stars in your photo", "description": DESC, "url": url,
                    "applicationCategory": "EducationalApplication", "operatingSystem": "Any",
                    "browserRequirements": "Requires JavaScript", "isAccessibleForFree": True, "inLanguage": "en",
                    "offers": {"@type": "Offer", "price": "0", "priceCurrency": "USD"}, "license": f"{GITHUB}/blob/main/LICENSE",
                    "publisher": {"@id": f"{host}/#organization"},
                    "featureList": ["Two-star alignment of a sky photo", "Constellation lines and names", "Bright star names",
                                    "Planets and the Moon for a given time", "Save the named photo as PNG"]}]
    page.share = Spec(key="sky-photo/index", name="Name the stars in your photo", number="two taps", caption="Tools",
                      kind="plain", colour="#6ec3ff", alt="Rings and a dot, captioned Name the stars in your photo.")
    return [page]


if __name__ == "__main__":
    from _cli import usage_if_asked
    usage_if_asked(__doc__)
    print("seo_skyphoto.py: the page is built through scripts/build_seo.py --out DIR", file=sys.stderr)
    sys.exit(2)
