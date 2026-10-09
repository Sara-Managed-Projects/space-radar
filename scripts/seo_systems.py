"""The 40 star systems you can fly into, as pages: /o/<system>.html, one section per planet.

    from seo_systems import systems, pages

Every number is read, none is typed: registry/systems.yaml (TRAPPIST-1, typed from the NASA Exoplanet
Archive's overview page) and registry/systems-generated.yaml (the other thirty-nine, written by
scripts/build-systems.py from the Archive's table), joined to site/data/exoplanets.csv for each
planet's name, the system's distance, and the method and year of the discovery. The sentence each
section opens with is made from those fields and from nothing else:

    Kepler-186 f is an exoplanet 1.17 times Earth's width, 580 light-years away, orbiting in its
    star's computed habitable zone.

WHAT IS MEASURED, WHAT IS COMPUTED, WHAT IS IMAGINED, on every page, because a page about a planet
nobody has seen must not let a picture speak for it. Measured: what the Archive's sources measured
(a period from transits, a radius from how much light a planet blocks, a mass from a star's wobble)
and the row says which of its numbers were only estimated. Computed here: the size of the orbit where
Kepler's third law would not agree with the table, the temperature a bare ball would have there,
the light received, and the habitable zone (Kopparapu et al. 2014). Imagined: the picture, which is
an artist's impression, said in the page and printed on its share picture. The words "habitable zone"
are said only for the band scripts/build-systems.py computes, and always with "computed".

THE EXTRA 200 PLANETS BY FAME are not here: see the report of the pull request. The Archive's table
carries a radius, a distance and a method for 6 300 planets, but not the star's mass or the orbit's
size, so "in the habitable zone" cannot be computed for them, and the repository holds no ranking of
fame to choose 200 by; a page of five numbers with no verdict is the thin page this file avoids.
"""

from __future__ import annotations

import csv
import functools
import math
import re
from pathlib import Path

import yaml

from seo_common import Page, esc, slug_of, webpage, url_of
from seo_share import Spec

ROOT = Path(__file__).resolve().parent.parent
LY_PER_PC = 3.26156
JUPITER_RADII = 11.21
NUMBER_WORDS = {1: "one", 2: "two", 3: "three", 4: "four", 5: "five", 6: "six", 7: "seven", 8: "eight", 9: "nine"}
METHODS = {
    "Transit": ("transit", "it was found as a small, regular dip in its star's light each time it crosses in front of it"),
    "Radial Velocity": ("radial velocity", "it was found by the back-and-forth wobble its pull puts into its star's motion, seen as a shift in the colour of the star's light"),
    "Imaging": ("direct imaging", "it was photographed directly, a faint dot beside the glare of its star"),
    "Pulsar Timing": ("pulsar timing", "it was found by tiny changes in the timing of the radio pulses of its star, a pulsar"),
}
ARCHIVE_DOI = "https://doi.org/10.26133/NEA13"
KOPPARAPU = "https://arxiv.org/abs/1404.5292"


def _csv_rows() -> dict:
    sys_path = str(ROOT / "scripts")
    import sys
    if sys_path not in sys.path:
        sys.path.insert(0, sys_path)
    from _exo_ids import exo_id
    lines = [ln for ln in (ROOT / "site/data/exoplanets.csv").read_text(encoding="utf-8").splitlines() if ln.strip() and not ln.startswith("#")]
    return {exo_id(r["pl_name"]): r for r in csv.DictReader(lines)}


def _f(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


@functools.lru_cache(maxsize=1)
def systems() -> list[dict]:
    """Every system with its planets joined to the table, in registry order (TRAPPIST-1 first)."""
    rows = _csv_rows()
    typed = yaml.safe_load((ROOT / "registry/systems.yaml").read_text(encoding="utf-8"))["systems"]
    gen = yaml.safe_load((ROOT / "registry/systems-generated.yaml").read_text(encoding="utf-8"))
    out = []
    for s in typed + gen["systems"]:
        planets = []
        for p in s["planets"]:
            row = rows.get(p["id"])
            if row is None:
                raise SystemExit(f"seo_systems: {p['id']} is in the registry and not in site/data/exoplanets.csv")
            q = dict(p)
            q["name"] = row["pl_name"]
            q["go"] = p["id"].removeprefix("exo-")
            q["method"] = q.get("method") or row.get("discoverymethod")
            q["year"] = q.get("year") or (int(row["disc_year"]) if row.get("disc_year") else None)
            q.setdefault("radius_from", "measured" if q.get("radius_earths") is not None else None)
            q.setdefault("mass_from", "measured" if q.get("mass_earths") is not None else None)
            q["dist_pc"] = _f(row.get("sy_dist"))
            planets.append(q)
        dist = (s.get("sky") or {}).get("dist_pc") or next((p["dist_pc"] for p in planets if p["dist_pc"]), None)
        spect = (s.get("sky") or {}).get("spect") or next((rows[p["id"]].get("st_spectype") for p in s["planets"] if rows[p["id"]].get("st_spectype")), "")
        display = s.get("display") or s["host"]
        out.append({
            "id": s["id"], "host": s["host"], "display": display, "slug": slug_of(display),
            "star": s["star"], "hz": s.get("habitable_zone"), "dist_pc": dist, "spect": spect or "",
            "ra": (s.get("sky") or {}).get("ra_deg"), "dec": (s.get("sky") or {}).get("dec_deg"),
            "as_of": s.get("as_of") or gen.get("as_of"), "planets": planets,
            "stars_in_system": s.get("stars_in_system", 1),
            "source": s["star"].get("source", ""),
        })
    for s in out:
        if s["ra"] is None:
            first = rows[s["planets"][0]["id"]]
            s["ra"], s["dec"] = _f(first.get("ra")), _f(first.get("dec"))
    return out


# --- words --------------------------------------------------------------------------------------------

def num(v: float) -> str:
    return f"{v:,.0f}" if v >= 1000 else f"{v:g}"


def light_years(pc: float | None) -> str | None:
    if not pc:
        return None
    ly = pc * LY_PER_PC
    if ly < 10:
        return f"{ly:.1f} light-years"
    if ly < 100:
        return f"{round(ly)} light-years"
    mag = 10 ** (len(str(int(ly))) - 2)
    return f"{num(round(ly / mag) * mag)} light-years"


def width_clause(p: dict) -> str:
    r = p.get("radius_earths")
    if r is None:
        m = p.get("mass_earths")
        return f"of unknown width, with a mass of about {num(m)} times Earth's" if m else "of unknown size"
    base = f"{r:g} times Earth's width"
    if p.get("radius_from") == "estimated":
        base = f"about {r:g} times Earth's width (a size estimated from its mass)"
    if r >= 6:
        base += f", about {r / JUPITER_RADII:.1f} times Jupiter's"
    return base


ZONE_WORDS = {
    "inside": "orbiting in its star's computed habitable zone",
    "edge": "orbiting at the edge of its star's computed habitable zone",
    "hotter": "orbiting closer to its star than the habitable zone we compute for it",
    "colder": "orbiting farther from its star than the habitable zone we compute for it",
}


def first_sentence(p: dict, dist_pc: float | None) -> str:
    parts = [f"{p['name']} is an exoplanet {width_clause(p)}"]
    ly = light_years(dist_pc)
    if ly:
        parts.append(f"{ly} away")
    zone = ZONE_WORDS.get(p.get("zone") or "")
    if zone:
        parts.append(zone)
    s = ", ".join(parts)
    return s + "."


def method_words(p: dict) -> tuple[str, str]:
    m = p.get("method") or ""
    name, how = METHODS.get(m, (m.lower() or "an unrecorded method", f"it was found by {m.lower() or 'a method the table does not name'}"))
    when = f" in {p['year']}" if p.get("year") else ""
    return name, f"{how[0].upper() + how[1:]}{when}."


def mass_words(p: dict) -> tuple[str, str] | None:
    m = p.get("mass_earths")
    if m is None:
        return None
    how = p.get("mass_from")
    if how == "least":
        return f"at least {num(m)} times Earth's", "measured: a minimum, because the tilt of the orbit is not known"
    if how == "estimated":
        return f"about {num(m)} times Earth's", "estimated by the Archive from the planet's size, not measured"
    return f"{num(m)} times Earth's", "measured"


def headline(sysd: dict) -> dict:
    for want in ("inside", "edge"):
        for p in sysd["planets"]:
            if p.get("zone") == want:
                return p
    return sysd["planets"][0]


def dist_ly_between(a: dict, b: dict) -> float | None:
    if None in (a["ra"], a["dec"], a["dist_pc"], b["ra"], b["dec"], b["dist_pc"]):
        return None

    def xyz(s):
        ra, dec, d = math.radians(s["ra"]), math.radians(s["dec"]), s["dist_pc"] * LY_PER_PC
        return d * math.cos(dec) * math.cos(ra), d * math.cos(dec) * math.sin(ra), d * math.sin(dec)
    x1, x2 = xyz(a), xyz(b)
    return math.dist(x1, x2)


def tone(p: dict) -> str:
    t = p.get("equilibrium_k")
    if t is None:
        return "#7890b0"
    if t < 200:
        return "#8fb4de"
    if t < 330:
        return "#7fae8e"
    if t < 700:
        return "#c19a68"
    if t < 1500:
        return "#d0704a"
    return "#e8a050"


# --- the page --------------------------------------------------------------------------------------------

def planet_section(sysd: dict, p: dict) -> str:
    anchor = esc(p["go"])
    rows = []

    def row(label, value, note="", kind=""):
        badge = f' <span class="badge {kind}">{esc(note)}</span>' if kind else (f' <span class="dim">{esc(note)}</span>' if note else "")
        rows.append(f"<div><dt>{esc(label)}</dt><dd>{value}{badge}</dd></div>")

    r = p.get("radius_earths")
    if r is not None:
        row("Width", f"{r:g} × Earth's", "measured" if p.get("radius_from") != "estimated" else "estimated", "measured" if p.get("radius_from") != "estimated" else "computed")
    mw = mass_words(p)
    if mw:
        row("Mass", esc(mw[0]), mw[1].split(":")[0], "measured" if mw[1].startswith("measured") else "computed")
    row("One year", f"{num(p['period_days'])} days", "measured", "measured")
    row("Distance from its star", f"{p['a_au']:g} au", "computed from the period and the star's mass" if p.get("a_from") == "kepler" else "from the Archive", "computed" if p.get("a_from") == "kepler" else "measured")
    if p.get("equilibrium_k") is not None:
        row("Temperature of a bare ball there", f"{num(p['equilibrium_k'])} K", "computed, not measured", "computed")
    if p.get("insolation_earths") is not None:
        row("Starlight, against Earth's", f"{p['insolation_earths']:g} ×", "computed", "computed")
    mname, how = method_words(p)
    ftxt = how
    extra = ""
    if p.get("a_from") == "kepler" and p.get("a_table_au"):
        extra = (f" The Archive's own distance for it is {p['a_table_au']:g} au; the three papers behind its period, its star's mass and that distance "
                 f"do not agree with Kepler's third law, so the page uses the one the period and the star's mass give.")
    if p.get("zone") == "inside":
        zone_line = "Its orbit lies inside the conservative habitable zone computed for its star (liquid water on a rocky world's surface would be possible there, which says nothing about whether any is)."
    elif p.get("zone") == "edge":
        zone_line = "Its orbit lies at the edge of the conservative habitable zone computed for its star."
    elif p.get("zone") == "hotter":
        zone_line = "Its orbit is closer to its star than the habitable zone computed for it."
    elif p.get("zone") == "colder":
        zone_line = "Its orbit is farther from its star than the habitable zone computed for it."
    else:
        zone_line = "No habitable zone is computed for its star (a pulsar, a binary or a star outside the formula's range), so none is claimed."
    return (f'<section id="{anchor}">\n<h2>{esc(p["name"])}</h2>\n<p class="lead">{esc(first_sentence(p, sysd["dist_pc"]))}</p>\n'
            f"<dl>{''.join(rows)}</dl>\n<p>{esc(ftxt)} {esc(zone_line)}{esc(extra)}</p>\n"
            f'<p><a href="../#go={anchor}">See {esc(p["name"])} in 3D</a> · '
            f'<span class="dim">The picture is an artist\'s impression.</span></p>\n</section>\n')


def system_page(sysd: dict, others: list[dict], host: str, old: dict | None, today: str) -> Page:
    n = len(sysd["planets"])
    count_words = NUMBER_WORDS.get(n, str(n))
    plural = "planet" if n == 1 else "planets"
    display = sysd["display"]
    head = headline(sysd)
    lead = first_sentence(head, sysd["dist_pc"])
    star = sysd["star"]
    ly = light_years(sysd["dist_pc"])
    suffix = " | Space Radar"
    title = f"{display}: {n} {plural}, size and distance"
    if len(title + suffix) <= 60:
        title += suffix
    desc = f"{lead[:-1]}. {display} has {count_words} known {plural}: what is measured, what is computed, and an artist's impression."
    if len(desc) > 160:
        desc = f"{display} has {count_words} known {plural}. {lead} What is measured, what is computed, and that the picture is an artist's impression."
    if len(desc) > 160:
        desc = f"{display} has {count_words} known {plural}, each described by what is measured and what is computed. The picture is an artist's impression."
    url = url_of(host, f"o/{sysd['slug']}.html")
    path = f"o/{sysd['slug']}.html"

    star_rows = []
    if star.get("teff_k"):
        star_rows.append(("Surface temperature", f"{num(star['teff_k'])} K"))
    if star.get("radius_suns"):
        star_rows.append(("Width", f"{star['radius_suns']:g} × the Sun's"))
    if star.get("mass_suns"):
        star_rows.append(("Mass", f"{star['mass_suns']:g} × the Sun's"))
    if sysd["spect"]:
        star_rows.append(("Spectral type", sysd["spect"]))
    if ly:
        star_rows.append(("Distance", ly))
    if sysd["hz"]:
        star_rows.append(("Habitable zone, computed", f"{sysd['hz']['inner_au']:g} to {sysd['hz']['outer_au']:g} au from the star"))
    if sysd.get("stars_in_system", 1) > 1:
        star_rows.append(("Stars in the system", str(sysd["stars_in_system"])))
    star_dl = "".join(f"<div><dt>{esc(a)}</dt><dd>{esc(b)}</dd></div>" for a, b in star_rows)

    near = sorted(((dist_ly_between(sysd, o), o) for o in others if o["id"] != sysd["id"]), key=lambda t: (t[0] is None, t[0]))[:4]
    neighbours = "".join(f'<li><a href="{esc(o["slug"])}.html">{esc(o["display"])}</a></li>' for d, o in near if d is not None)

    sections = "".join(planet_section(sysd, p) for p in sysd["planets"])
    toc = "".join(f'<li><a href="#{esc(p["go"])}">{esc(p["name"])}</a></li>' for p in sysd["planets"]) if n > 1 else ""
    source_url = sysd["source"].split(" (read")[0]
    read = re.search(r"read (\d{4}-\d{2}-\d{2})", sysd["source"])
    old_sources = f"<p>{esc(old['sources'])}</p>\n" if old and old.get("sources") else ""
    foot = (f"<p>Source: NASA Exoplanet Archive, Planetary Systems Composite Parameters table (table DOI "
            f'<a href="{ARCHIVE_DOI}" rel="nofollow">10.26133/NEA13</a>), read {esc(read.group(1) if read else sysd["as_of"])}'
            f'{"; " + esc(source_url) if source_url else ""}. Habitable zone: Kopparapu et al. 2014, '
            f'<a href="{KOPPARAPU}" rel="nofollow">ApJ Letters 787, L29</a>. Temperatures assume the Earth\'s reflectivity (0.3). '
            f"This page was built {esc(today)} from those registries; the numbers are not live.</p>\n{old_sources}")

    body = (f'<p class="micro"><span class="dot" style="background:#ffc28a"></span>Star system, {esc(ly or "distance unknown")}</p>\n'
            f"<h1>{esc(display)} and its {count_words} {plural}</h1>\n"
            f'<p class="lead">{esc(lead)}</p>\n'
            f"<p>{esc(display)} is a star of spectral type {esc(sysd['spect'] or 'the table does not record')}"
            f"{', ' + esc(ly) + ' from us' if ly else ''}, with {count_words} known {plural}"
            f"{'. This page takes them one at a time.' if n > 1 else '.'}</p>\n"
            f'<div class="cta"><a class="live" href="../#go={esc(sysd["id"])}">Fly to {esc(display)} in 3D</a>'
            f"<p>Drawn at the system's own scale, every orbit from the Archive's numbers.</p></div>\n"
            f'<div class="note"><p><strong>What is measured, what is computed, what is imagined.</strong></p>'
            f"<p><span class=\"badge measured\">measured</span> The period, and where the table says so the width and the mass, by the method named in each section.</p>"
            f"<p><span class=\"badge computed\">computed</span> Anything marked computed: the size of an orbit where Kepler's third law corrects the table, the temperature of a bare ball at that distance, the starlight received, and the habitable zone.</p>"
            f"<p><span class=\"badge imagined\">imagined</span> The picture is an artist's impression. Nobody has seen the surface of a planet of another star: its colour, clouds and land are not known, and the share picture says so in its corner.</p></div>\n"
            + (f'<h2>The planets</h2>\n<ul class="links">{toc}</ul>\n' if toc else "")
            + sections
            + f"<h2>The star</h2>\n<dl>{star_dl}</dl>\n"
            + (f'<h2>Other systems you can fly to</h2>\n<ul class="links">{neighbours}</ul>\n' if neighbours else "")
            + '<p><a href="../t/travel-to-exoplanets.html">Take the trip: Travel to exoplanets</a></p>\n')

    planet_nodes = [{"@type": "Thing", "@id": f"{url}#{p['go']}", "name": p["name"], "description": first_sentence(p, sysd["dist_pc"]),
                     "url": f"{url}#{p['go']}"} for p in sysd["planets"]]
    page = Page(path=path, title=title, description=desc, body=body, og_title=f"{display} and its {count_words} {plural}", og_type="article",
                foot=foot, kind="system")
    page.jsonld = [webpage(host, page, [("Star systems", ""), (display, "")], extra={"about": {"@id": f"{url}#system"}}),
                   {"@type": "Thing", "@id": f"{url}#system", "name": display, "description": lead, "url": url, "hasPart": [{"@id": x["@id"]} for x in planet_nodes]},
                   *planet_nodes]
    number = f"{n} {plural} · {ly}" if ly else f"{n} {plural}"
    page.share = Spec(key=f"o/{sysd['slug']}", name=display, number=number, caption="Star system · artist's impression", kind="exo",
                      colour="#ffc28a", tone=tone(head), impression=True,
                      alt=f"An artist's impression of a planet of {display}, captioned {display}, {number}.")
    return page


def pages(host: str, existing: dict, today: str) -> list[Page]:
    """One Page per system. `existing` maps an object slug to the card record already built there (replaced, its sources kept)."""
    sysl = systems()
    slugs = [s["slug"] for s in sysl]
    if len(set(slugs)) != len(slugs):
        raise SystemExit("seo_systems: two systems want the same address")
    return [system_page(s, sysl, host, existing.get(s["slug"]), today) for s in sysl]
