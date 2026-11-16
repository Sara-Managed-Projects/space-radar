#!/usr/bin/env python3
"""One value per quantity (the data review of 2026-11-16).

    python3 tests/test_one_value.py

The review found the same quantity printed with two values in two places: Venus's ground at 467 C in its
paragraph and 464 C in the Compare table; the Earth 12 742 km wide on its own page and 12 756 in Venus's
paragraph; Eris's year 557 in a trip and 560 on its page; the Crab Pulsar 6 200 light-years away inside a
nebula 6 500 away; M87's black hole and M87 itself at two distances; the Milky Way 87 000 light-years across
on its page and "more than 100 000" in the glossary; the parsec defined one way in the glossary and another in
the card's legend; two galaxies under one name and one page.

Each case fixed that day is held here, read from the files the app and the pages read, so the two places
cannot drift apart again. A new case is one more block; nothing here computes or rounds on its own account.
"""
from __future__ import annotations

import json
import re
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
failed = 0
checks = 0


def ok(cond: bool, msg: str) -> None:
    global failed, checks
    checks += 1
    if not cond:
        failed += 1
        print(f"FAIL: {msg}")


def text(rel: str) -> str:
    return (ROOT / rel).read_text(encoding="utf-8")


def digits(s: str) -> str:
    """A number as its digits: "12 742" (any space between the groups) -> "12742"."""
    return re.sub(r"[\s  ,]", "", s)


# --- Venus and the Earth: the paragraph against the Compare table -------------------------------------------
compare = {w["world"]: w for w in (yaml.safe_load(text("registry/compare.yaml")) or {}).get("bodies") or []}
cards = text("site/js/copy/en.cards.js")
venus_line = next((ln for ln in cards.splitlines() if re.match(r'\s*venus: "Venus is nearly the size of the Earth', ln)), "")
ok(bool(venus_line), "copy/en.cards.js has the Venus paragraph")
if compare and venus_line:
    v, e = compare.get("venus") or {}, compare.get("earth") or {}
    temp = re.search(r"about (\d+) °C", venus_line)
    press = re.search(r"about (\d+) times harder", venus_line)
    widths = re.search(r"([\d\s  ]+) km across, against ([\d\s  ]+)\.", venus_line)
    ok(temp and int(temp.group(1)) == v.get("temp_c"), f"Venus's ground: the paragraph's {temp and temp.group(1)} C is the Compare table's {v.get('temp_c')}")
    ok(press and int(press.group(1)) == v.get("air_bar"), f"Venus's air: the paragraph's {press and press.group(1)} times is the Compare table's {v.get('air_bar')} bar")
    ok(widths and int(digits(widths.group(1))) == round(2 * v["radius_km"]), f"Venus's width in the paragraph is twice the table's mean radius ({round(2 * v['radius_km'])})")
    ok(widths and int(digits(widths.group(2))) == round(2 * e["radius_km"]),
       f"the Earth's width in Venus's paragraph is the Earth page's mean diameter ({round(2 * e['radius_km'])}), not the equatorial 12 756")
else:
    ok(False, "registry/compare.yaml lists its worlds under `bodies:` with temp_c, air_bar and radius_km")
for lang in sorted(p.stem for p in (ROOT / "site/js/copy").glob("??.js") if p.stem != "en"):
    line = next((ln for ln in text(f"site/js/copy/{lang}.js").splitlines() if re.search(r'"?venus"?: ".*12\W{1,3}104', ln)), "")
    ok(bool(line) and "464" in line and "467" not in line and not re.search(r"12\W{1,3}756", line),
       f"copy/{lang}.js: Venus's paragraph carries the same numbers as the English (464, 92, 12 742)")

# --- the Milky Way's width: the page's words and the glossary's ---------------------------------------------
layers = text("site/js/data/layers.js")
said = re.search(r"sizeLySaid: (\d+)", layers)
gloss_say = next(g["say"] for g in yaml.safe_load(text("registry/glossary.yaml"))["terms"] if g["term"] == "galaxy")
width = re.search(r"about ([\d\s  ]+) light-years across", gloss_say)
ok(said is not None and width is not None and int(digits(width.group(1))) == int(said.group(1)),
   f"the Milky Way is as wide in the glossary ({width and width.group(1)}) as on its card and page (data/layers.js sizeLySaid {said and said.group(1)})")
ok("more than 100 000 light-years across" not in cards and re.search(r'"galaxy": ".*about 100\W000 light-years across', cards) is not None,
   "copy/en.cards.js says the glossary's sentence about the galaxy")

# --- the parsec: one definition, and the right one ----------------------------------------------------------
parsec_gloss = next((ln for ln in text("registry/glossary.yaml").splitlines() if "term: parsec," in ln), "")
ok("the gap between the Earth and the Sun would look one arcsecond wide" in parsec_gloss, "the glossary's parsec is the Earth-Sun distance seen one arcsecond wide (1 au, not the orbit's width)")
ok("the gap between the Earth and the Sun would look one arcsecond wide" in text("site/js/copy/en.later.js"), "the card's legend says the same parsec")
ok("Earth's orbit would look one arcsecond wide" not in parsec_gloss and "Earth\\'s orbit would look one arcsecond wide" not in text("site/js/copy/en.later.js"),
   "nobody says the Earth's ORBIT looks one arcsecond wide from a parsec: it looks two")

# --- the Crab: the pulsar and the nebula it is inside; M87 and its black hole ---------------------------------
exotics = {r["id"]: r for r in yaml.safe_load(text("registry/exotics.yaml"))["exotics"]}
dso = {r["id"]: r for r in json.loads(text("site/data/dso.json"))["objects"]}
for star, galaxy, what in (("crab-pulsar", "m1", "the Crab Pulsar and the Crab Nebula"), ("m87-star", "m87", "M87* and M87")):
    x, d = exotics[star], dso[galaxy]
    ok(isinstance(x["dist_ly"], (int, float)) and abs(x["dist_ly"] - d["distLy"]) <= 0.001 * d["distLy"],
       f"{what} are at one distance ({x['dist_ly']} and {d['distLy']} light-years)")
    ok(x.get("dist_ly_range") == [d["distLyLow"], d["distLyHigh"]], f"{what} give one range ({x.get('dist_ly_range')} and {[d['distLyLow'], d['distLyHigh']]})")

# --- Eris's year: the trip and the page ---------------------------------------------------------------------
tours = text("registry/tours.yaml")
trip_years = re.search(r"Eris is near the far end of a (\d+)-year lap", tours)
page_years = re.search(r"lapYears: (\d+),", text("site/js/data/sample.js"))
ok(trip_years is not None and page_years is not None and trip_years.group(1) == page_years.group(1),
   f"Eris's lap is one number in the trip ({trip_years and trip_years.group(1)}) and on its page ({page_years and page_years.group(1)})")
ok("md.lapYearsSaid" in text("scripts/object_pages.mjs"), "the page generator prints the lap a record says in words")

# --- one name, one page: no two Messier objects under one name ----------------------------------------------
names: dict[str, list[str]] = {}
for r in dso.values():
    if r.get("messier") is not None:
        names.setdefault((r.get("common") or r["name"]).lower(), []).append(r["id"])
shared = {k: v for k, v in names.items() if len(v) > 1}
ok(not shared, f"no two Messier objects share the name their page is made from: {shared}")
ok(dso["m65"]["name"] == "M65" and dso["m66"]["name"] == "M66", "M65 and M66 are named by their numbers: the Leo Triplet is the three of them, not either one")
ok("droppedDeepSky" in text("scripts/object_pages.mjs"), "the page generator stops when a Messier record would have no page")

# --- a limit is never a mass ----------------------------------------------------------------------------------
gen = yaml.safe_load(text("registry/systems-generated.yaml"))
side = {}
lines = [ln for ln in text("registry/systems-columns.csv").splitlines() if ln and not ln.startswith("#")]
head = lines[0].split(",")
ok("pl_bmasselim" in head and "pl_radelim" in head, "registry/systems-columns.csv carries the Archive's limit flags")
slim_head = next(ln for ln in text("site/data/exoplanets.csv").splitlines() if ln and not ln.startswith("#")).split(",")
ok("pl_bmasselim" in slim_head and "pl_radelim" in slim_head, "site/data/exoplanets.csv carries the Archive's limit flags")
import csv, io  # noqa: E402
flagged = {r["pl_name"] for r in csv.DictReader(io.StringIO("\n".join(lines))) if (r.get("pl_bmasselim") or "").strip() == "1"}
ok({"HD 10180 g", "51 Eri b", "Kepler-22 b", "Kepler-62 f"} <= flagged, f"the planets the review named are flagged as upper limits ({len(flagged)} flagged)")
sys.path.insert(0, str(ROOT / "scripts"))
from _exo_ids import exo_id  # noqa: E402
flagged_ids = {exo_id(n) for n in flagged}
wrong = [p["id"] for s in gen["systems"] for p in s["planets"] if p["id"] in flagged_ids and p.get("mass_from") != "limit"]
ok(not wrong, f"every flagged planet of a drawn system is `mass_from: limit`, never measured: {wrong}")
import seo_systems  # noqa: E402
for s in seo_systems.systems():
    for p in s["planets"]:
        if p.get("mass_from") != "limit":
            continue
        words, how = seo_systems.mass_words(p)
        ok(words.startswith("less than ") and "measured" not in how.split(":")[0], f"{p['name']}: the page says \"{words}\" ({how.split(':')[0]}), never a measured mass")
        if p.get("radius_earths") is None:
            ok("less than" in seo_systems.width_clause(p), f"{p['name']}: its opening sentence words the limit as a limit")
ok('"KOI-351' not in json.dumps([p["name"] for s in seo_systems.systems() if s["display"] == "Kepler-90" for p in s["planets"]]),
   "Kepler-90's planets are named Kepler-90 b to i on its page, not KOI-351")

if failed:
    print(f"\n{failed} of {checks} checks failed")
    sys.exit(1)
print(f"PASS: {checks} checks -- one value per quantity: Venus and the Earth, the Milky Way's width, the parsec, the Crab, M87, Eris's year, "
      f"one name per Messier object, and no upper limit printed as a mass")
