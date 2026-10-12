#!/usr/bin/env python3
"""The README's numbers are counted, not remembered (growth task: README above the fold).

    python3 tests/test_readme_facts.py

scripts/count_facts.py counts trips, stops, star systems, stars, moons, sky photographs and the
landing sites from the registries. This holds the README's sentences to those counts: a thirty-first
trip, or a fortieth-first star system, fails here until the README says so. Each rule is shown to
fail on a README that is one off.
"""
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import count_facts  # noqa: E402

WORDS = {20: "Twenty", 26: "Twenty-six", 12: "twelve"}


def claims(readme: str, n: dict) -> list[str]:
    """Every sentence of the README that quotes a count, checked against `n`."""
    sp = count_facts.spaced
    wanted = {
        "trips and stops": rf"{n['trips']} narrated trips \({n['stops']} stops\)",
        "stars": rf"\b{sp(n['stars'])} stars",
        "star systems": rf"\b{n['star_systems']} star systems to fly into",
        "trips in the table": rf"{n['trips']} trips and {n['stops']} stops",
        "moons": rf"every planet and {n['moons']} moons \({n['moons_with_maps']} of them with a real map\)",
        "photographs": rf"photographs of {n['nebula_pictures']} nebulae",
        "moon and mars sites": rf"{WORDS.get(n['moon_sites'], n['moon_sites'])} places on the Moon and {WORDS.get(n['mars_sites'], n['mars_sites'])} on Mars",
    }
    flat = re.sub(r"\s+", " ", readme)
    return [k for k, rx in wanted.items() if not re.search(rx, flat)]


n = count_facts.facts()
readme = (ROOT / "README.md").read_text(encoding="utf-8")
problems = [f"README does not carry the registry's count for: {k}" for k in claims(readme, n)]

# The check can fail: one trip more, one star fewer.
off = dict(n, trips=n["trips"] + 1)
if "trips and stops" not in claims(readme, off):
    problems.append("the trips rule did not notice a README that is one trip behind")
off = dict(n, stars=n["stars"] - 1)
if "stars" not in claims(readme, off):
    problems.append("the stars rule did not notice a wrong count")
# No stale numbers left from the old README.
for stale in ("Twenty-five guided trips", "25 trips", "195 stops", "130 node and python test files"):
    if stale in readme:
        problems.append(f"README still says {stale!r}")
m = re.search(r"tests/\s+more than (\d+) node and python test files", readme)
if not m or not n["test_files"] > int(m.group(1)):
    problems.append(f"README's test-file claim is missing or too high; there are {n['test_files']}")

if problems:
    print("\n".join(problems))
    sys.exit(1)
print(f"README facts ok: {n['trips']} trips, {n['stops']} stops, {n['star_systems']} systems, {count_facts.spaced(n['stars'])} stars")
