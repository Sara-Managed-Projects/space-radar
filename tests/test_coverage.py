#!/usr/bin/env python3
"""Every record on the map has a class, a renderer, a source and a credit (internal spec 0076 W2-e).

    python3 tests/test_coverage.py

scripts/coverage.py reads every registry and generated record set and gives each record one class of
registry/visual-classes.yaml. This fails when:

  * a record has no class, or two classes take it (#859, SR-PLAN-102/174);
  * a class with records has no renderer, or names a module that is not a file;
  * a record has no source, or no credit that CREDITS.md carries word for word (#891, SR-PLAN-103);
  * a record drawn as an illustration describes itself with the words of a measurement (#921, SR-PLAN-183);
  * the classes are not the package's 38 plus the house's own, or a class has no source note;
  * the counts differ from the ones scripts/count_facts.py publishes (#920);
  * docs/COVERAGE.md or site/js/data/visualclasses.js is stale.

Each rule is shown to fail on a registry broken on purpose. Stdlib and PyYAML.
"""
import copy
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import count_facts  # noqa: E402
import coverage  # noqa: E402

# The package's 38 renderer ids (internal specs/0076-release-1-2/package-2026-10-15/04_OBJECT_TYPE_SPECS/).
PACKAGE_CLASSES = {
    "AGN_QUASAR", "AIRLESS_MOON", "ARTIFICIAL_SATELLITE", "ASTEROID", "BINARY_AND_MULTIPLE", "BLACK_HOLE",
    "CMB_AND_HORIZON", "COMET", "COMPACT_REMNANT", "COSMIC_WEB", "DARK_NEBULA", "DWARF_PLANET",
    "EMISSION_NEBULA", "EXOPLANET", "GALAXY_CLUSTER", "GALAXY_ELLIPTICAL", "GALAXY_GROUP", "GALAXY_INTERACTION",
    "GALAXY_IRREGULAR", "GALAXY_SPIRAL", "GAS_GIANT", "GLOBULAR_CLUSTER", "ICE_GIANT", "ICY_MOON",
    "LANDING_SITE", "LAUNCH_AND_ROCKET", "OPEN_CLUSTER", "PLANETARY_NEBULA", "REFLECTION_NEBULA", "RINGS",
    "ROCKY_PLANET", "SPACE_PROBE", "SPECTRAL_SKY", "STAR", "SUN", "SUPERNOVA_REMNANT", "TITAN", "VOLCANIC_MOON",
}
# The record sets the stage's acceptance names (design.md section 5, W2-e), by this script's domain ids.
REQUIRED_DOMAINS = {"worlds", "dso", "photographs", "heroes", "exotics", "systems", "planets", "stars_notable",
                    "sites", "real_models", "model_kinds", "small_bodies", "probes", "rockets", "oddities", "layers"}

problems = []
credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
reg = coverage.registry()
result = coverage.collect(reg)
rows = result["rows"]

for p in coverage.problems(result, credits):
    problems.append(p)

ids = {c["id"] for c in reg.get("classes") or []}
if PACKAGE_CLASSES - ids:
    problems.append(f"visual-classes.yaml lacks the package's classes {sorted(PACKAGE_CLASSES - ids)}")
for c in reg.get("classes") or []:
    if c["id"] not in PACKAGE_CLASSES and not c.get("house"):
        problems.append(f"visual-classes.yaml class {c['id']} is not one of the package's 38 and does not say `house: true`")
missing = REQUIRED_DOMAINS - {r["domain"] for r in rows}
if missing:
    problems.append(f"no record is read from {sorted(missing)}: the acceptance names them")

# The counts are count_facts.py's: one count, one build of it.
n = count_facts.facts()
def count(domain, pred=lambda r: True):
    return sum(r["count"] for r in rows if r["domain"] == domain and pred(r))
worlds = {w["id"]: w for w in coverage._yaml("worlds.yaml")["worlds"]}
sites = {s["id"]: s for s in coverage._yaml("sites.yaml")["sites"]}
for name, have, want in (
    ("star systems", count("systems"), n["star_systems"]),
    ("moons", count("worlds", lambda r: (worlds[r["id"]].get("parent") or "sun") != "sun"), n["moons"]),
    ("sky photographs", count("photographs"), n["nebula_pictures"]),
    ("places on the Moon", count("sites", lambda r: sites[r["id"]]["world"] == "moon" and sites[r["id"]]["class"] == "surface"), n["moon_sites"]),
    ("places on Mars", count("sites", lambda r: sites[r["id"]]["world"] == "mars" and sites[r["id"]]["class"] == "surface"), n["mars_sites"]),
    ("layers", count("layers"), n["layers"]),
    ("real models", count("real_models"), n["real_models"]),
    ("stars in 3D", count("catalogues", lambda r: r["id"] == "stars3d"), n["stars"]),
):
    if have != want:
        problems.append(f"coverage counts {have} {name} and scripts/count_facts.py {want}")

# The generated files are current.
if (ROOT / "docs" / "COVERAGE.md").read_text(encoding="utf-8") != coverage.document(result):
    problems.append("docs/COVERAGE.md is STALE: run python3 scripts/coverage.py --write")
gen = subprocess.run([sys.executable, str(ROOT / "scripts" / "gen_visual_classes_js.py"), "--check"],
                     capture_output=True, text=True)
if gen.returncode != 0:
    problems.append("site/js/data/visualclasses.js is STALE: run python3 scripts/gen_visual_classes_js.py")


# --- the rules can fail ------------------------------------------------------------------------
def broken(change) -> list:
    r = copy.deepcopy(reg)
    change(r)
    return coverage.problems(coverage.collect(r), credits)


def cls(r, cid):
    return next(c for c in r["classes"] if c["id"] == cid)


def no_class(r):  # the rings' only class loses its selector
    cls(r, "RINGS")["records"] = []


def no_renderer(r):
    cls(r, "TITAN")["renderer"] = []


def ghost_renderer(r):
    cls(r, "TITAN")["renderer"] = ["site/js/scene/titan-that-is-not.js"]


def two_classes(r):
    cls(r, "TITAN")["records"].append({"domain": "worlds", "ids": ["io"]})


def bad_credit(r):
    d = next(x for x in r["domains"] if x["id"] == "rockets")
    d["credit"] = "Rockets: credited to nobody this file names"


def no_credit(r):
    d = next(x for x in r["domains"] if x["id"] == "oddities")
    d.pop("credit", None)


def no_note(r):
    cls(r, "SUN")["note"].pop("rights")


for label, change, expect in (
    ("a record no class takes", no_class, "has no class"),
    ("a class with records and no renderer", no_renderer, "no renderer"),
    ("a renderer that is not a file", ghost_renderer, "does not exist"),
    ("a record two classes take", two_classes, "is taken by 2 classes"),
    ("a credit CREDITS.md does not carry", bad_credit, "CREDITS.md does not carry"),
    ("a record with no credit", no_credit, "has no credit"),
    ("a class whose source note has no rights line", no_note, "no `rights:` line"),
):
    if not any(expect in p for p in broken(change)):
        problems.append(f"the rule did not notice {label}")

# The certainty words: refused on an illustration, allowed when denied or when the sentence says what is drawn.
fake = [{"domain": "weather", "id": "x", "honesty": "illustrative", "words": [w]} for w in (
    "The storm is measured to the metre.",
    "Nothing is measured below the map's resolution.",
    "The latitudes are measured; each flash is ours.",
)]
got = coverage.certainty_problems(fake)
if len(got) != 1 or "'measured'" not in got[0]:
    problems.append(f"the certainty rule refused {len(got)} of three sentences, wanting the first only: {got}")
if coverage.certainty_problems([dict(fake[0], honesty="measured")]):
    problems.append("the certainty rule refused a measured record's words")

if problems:
    print("\n".join("FAIL " + p for p in problems))
    sys.exit(1)
classes = {r["class"] for r in rows}
print(f"coverage ok: {len(rows)} records in {len(classes)} classes, each with a renderer, a source and a credit; "
      f"counts equal to count_facts.py; 9 refusals fire")
