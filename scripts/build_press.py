#!/usr/bin/env python3
"""The press page, built at deploy time (public #293, the launch kit).

    python3 scripts/build_press.py --out DIR [--host https://www.spaceradar.ai]

Writes DIR/press/: index.html (templates/press.html filled in), the README's screenshots
(assets/screenshots/*.webp, copied: one set of pictures, kept once in git) and the mark and the
wordmark as SVG (templates/press/*.svg). scripts/deploy.sh syncs it to /press/; the page's address
is /press/index.html, because the origin is S3's REST endpoint and has no index documents below
the root (scripts/gen_trip_pages.py says the same of /t/).

NOT IN site/, like the object pages (scripts/build_seo.py): a second copy of the screenshots under
site/ would be half a megabyte in every offline install (scripts/stamp_sw.py names every file of
site/), for a page a returning visitor does not open.

THE FIVE FACTS ARE COUNTED, not typed: the layers, the trips and the sources are read from
registry/*.yaml when the page is built, so the page cannot go on saying "11 trips" after a twelfth
ships. The sentences around the numbers are here; tests/test_press.py holds the page to them.

NO PERSONAL DATA. The contact is the project's GitHub (issues and discussions): no name, no email
address, no handle. The test refuses an `@` address or a mailto: in the built page.
"""
from __future__ import annotations

import datetime
import html
import shutil
import sys
from pathlib import Path

import yaml

from seo_footer import sitelinks

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import count_facts  # noqa: E402  (the counts a press kit quotes are the README's: one script)
TEMPLATES = ROOT / "templates"
SHOTS = ROOT / "assets" / "screenshots"
DEFAULT_HOST = "https://www.spaceradar.ai"

# The README's pictures, with the words the README gives them. A file that is not here is not on
# the page; a file here that is gone fails the build.
PICTURES = [
    ("hero.webp", "The Earth with today's clouds, the aurora and the satellites around it."),
    ("saturn.webp", "Saturn and its rings, backlit, at a stop of the trip out past Jupiter."),
    ("moon-landing.webp", "The Apollo 11 lunar module on the Moon, a stop of the Moon landings trip."),
    ("phone.webp", "On a phone: the Earth, the aurora and the satellites above a bottom sheet."),
]
# The repository's social preview (scripts/build_social_preview.py): kept in assets/, copied into the kit.
PREVIEW = ("social-preview.png", "The repository's social preview, 1280 by 640: the Earth and its satellites, the mark and the line "
           "\"A live 3D map of space. Free. Open source. No account.\"")
# Our accounts, confirmed 2026-10-09. There is no Facebook page and none is linked.
HANDLES = [
    ("Instagram", "@spaceradar.ai", "https://www.instagram.com/spaceradar.ai/"),
    ("LinkedIn", "SpaceRadar.ai", "https://www.linkedin.com/company/spaceradar-ai"),
    ("YouTube", "@SpaceRadar_ai", "https://www.youtube.com/@SpaceRadar_ai"),
    ("GitHub", "Sara-Managed-Projects/space-radar", "https://github.com/Sara-Managed-Projects/space-radar"),
]
ACCOUNT_URLS = tuple(h[2] for h in HANDLES)


def boilerplate(f: dict[str, int]) -> str:
    """Written to be lifted whole: 60 words (tests/test_press.py counts them). The numbers are the README's."""
    return (f"Space Radar (spaceradar.ai) is a free, open-source 3D map of space that runs in a browser. It shows the "
            f"satellites around the Earth, the planets and their moons, {count_facts.spaced(f['stars'])} stars and {f['trips']} narrated "
            "trips, and labels every picture as measured, modelled or an artist's impression. It has no accounts, advertising or "
            "tracking, and works fully offline in a classroom.")


ONE_LINER = "Space Radar is a free, open-source 3D map of space in your browser: real positions, named sources, no account, and an offline copy for classrooms."
BOILERPLATE_WORDS, ONE_LINER_WORDS = 60, 25
NAME_NOTE = ("Space Radar (spaceradar.ai) is not affiliated with the Korean company SpaceRadar or with any other product or "
             "page that has the same or a similar name.")
MARKS = [
    ("space-radar-mark.svg", "The mark", ""),
    ("space-radar-wordmark.svg", "The wordmark, for dark backgrounds", ""),
    ("space-radar-wordmark-on-light.svg", "The wordmark, for light backgrounds", "light"),
]


def counts() -> dict[str, int]:
    def doc(name: str) -> dict:
        return yaml.safe_load((ROOT / "registry" / name).read_text(encoding="utf-8")) or {}
    layers = [row for row in doc("layers.yaml").get("layers", []) if row.get("enabled", True) is not False]
    return {
        "layers": len(layers),
        "trips": len(doc("tours.yaml").get("tours", [])),
        "sources": len(doc("sources.yaml").get("sources", [])),
    }


def facts(n: dict[str, int]) -> list[str]:
    return [
        "Every position is computed in the visitor's browser from public data, for the instant on "
        "the clock: satellites from their orbital elements, planets and probes from ephemerides. "
        "The clock can be moved, and the sky moves with it.",
        f"It draws {n['layers']} layers, from the space station and the satellites around the Earth "
        f"to the planets, the nearby stars and the galaxies, and reads {n['sources']} public sources "
        "to do it.",
        f"There are {n['trips']} guided trips: the camera flies from stop to stop, with a short "
        "text at each, and a visitor can leave at any moment and keep exploring from there.",
        "Each card says how its numbers were obtained and how old the input is; a sources sheet "
        "lists every source with its age. Nothing computed is presented as measured.",
        "It is a static web page with no account, no advertising and no tracker, and the code is "
        "open source.",
    ]


def glance(f: dict[str, int]) -> list[tuple[str, str]]:
    """Facts at a glance: every number is counted by scripts/count_facts.py, from the registries."""
    sp = count_facts.spaced
    return [
        ("Guided trips", f"{f['trips']} trips, {f['stops']} stops, read aloud"),
        ("Stars placed in 3D", sp(f["stars"])),
        ("Star systems to fly into", str(f["star_systems"])),
        ("Moons, with real maps", f"{f['moons']} ({f['moons_with_maps']})"),
        ("Landing sites", f"{f['moon_sites']} on the Moon, {f['mars_sites']} on Mars"),
        ("Layers in What to show", str(f["layers"])),
        ("Public data sources", str(f["sources"])),
        ("Real spacecraft models", str(f["real_models"])),
        ("Licence", "MIT (code); data and pictures keep their owners' licences"),
    ]


def licence_name() -> str:
    first = (ROOT / "LICENSE").read_text(encoding="utf-8").strip().splitlines()[0].strip()
    return first if first else "licence in the repository"


def fill(template: str, values: dict[str, str]) -> str:
    out = template
    for key, value in values.items():
        out = out.replace("{{" + key + "}}", value)
    if "{{" in out:
        raise SystemExit(f"build_press: an unfilled placeholder is left: {out[out.index('{{'):][:40]}")
    return out


def build(out: Path, host: str) -> Path:
    press = out / "press"
    press.mkdir(parents=True, exist_ok=True)
    e = html.escape
    shots = []
    for name, alt in PICTURES:
        src = SHOTS / name
        if not src.is_file():
            raise SystemExit(f"build_press: assets/screenshots/{name} is missing")
        shutil.copyfile(src, press / name)
        shots.append(f'<figure><a href="{e(name)}"><img src="{e(name)}" alt="{e(alt)}" loading="lazy"></a><figcaption>{e(alt)}</figcaption></figure>\n')
    name, alt = PREVIEW
    if not (ROOT / "assets" / name).is_file():
        raise SystemExit(f"build_press: assets/{name} is missing: python3 scripts/build_social_preview.py")
    shutil.copyfile(ROOT / "assets" / name, press / name)
    shots.append(f'<figure><a href="{e(name)}"><img src="{e(name)}" alt="{e(alt)}" loading="lazy"></a><figcaption>{e(alt)}</figcaption></figure>\n')
    marks = []
    for name, label, klass in MARKS:
        src = TEMPLATES / "press" / name
        if not src.is_file():
            raise SystemExit(f"build_press: templates/press/{name} is missing")
        shutil.copyfile(src, press / name)
        cls = f' class="{klass}"' if klass else ""
        marks.append(f'<figure><a href="{e(name)}"><img{cls} src="{e(name)}" alt="{e(label)}"></a><figcaption>{e(label)} (SVG)</figcaption></figure>\n')
    page = fill((TEMPLATES / "press.html").read_text(encoding="utf-8"), {
        "host": host.rstrip("/"),
        "host_bare": e(host.rstrip("/").split("://", 1)[-1].removeprefix("www.")),
        "style": (TEMPLATES / "seo.css").read_text(encoding="utf-8"),
        "facts": "".join(f"<li>{e(line)}</li>\n" for line in facts(counts())),
        "boilerplate": e(boilerplate(count_facts.facts())),
        "one_liner": e(ONE_LINER),
        "name_note": e(NAME_NOTE),
        "glance": "".join(f'<tr><th scope="row">{e(k)}</th><td>{e(v)}</td></tr>\n' for k, v in glance(count_facts.facts())),
        "handles": "".join(f'<tr><th scope="row">{e(n)}</th><td><a href="{e(u)}" rel="me noopener">{e(h)}</a></td></tr>\n' for n, h, u in HANDLES),
        "shots": "".join(shots),
        "marks": "".join(marks),
        "licence": e(licence_name()),
        "built": datetime.date.today().isoformat(),
        "sitelinks": sitelinks("../"),
    })
    (press / "index.html").write_text(page, encoding="utf-8")
    return press


def main(argv: list[str]) -> int:
    out, host = None, DEFAULT_HOST
    args = list(argv)
    while args:
        a = args.pop(0)
        if a == "--out" and args:
            out = Path(args.pop(0)).resolve()
        elif a == "--host" and args:
            host = args.pop(0)
        else:
            out = None
            break
    if out is None:
        print("usage: python3 scripts/build_press.py --out DIR [--host URL]", file=sys.stderr)
        return 2
    if (ROOT / "site").resolve() in [out, *out.parents]:
        print("build_press: --out must be outside site/; the built page is not kept in git", file=sys.stderr)
        return 2
    press = build(out, host)
    n = counts()
    print(f"build_press: {press}/index.html, {len(PICTURES)} pictures, {len(MARKS)} marks; {n['layers']} layers, {n['trips']} trips, {n['sources']} sources")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
