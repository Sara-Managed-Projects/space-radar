#!/usr/bin/env python3
"""Check data/parsers.js's classify() against CelesTrak's own OBJECT_TYPE.

    ./scripts/check-object-classes.py             # report
    ./scripts/check-object-classes.py --names     # list every disagreement
    ./scripts/check-object-classes.py --strict    # exit 1 above the recorded tolerance

WHY THIS EXISTS

`classify()` decides, from the NAME alone, whether a catalogue entry is a satellite, a rocket body,
a piece of debris or a station. Everything downstream hangs off that answer: it is the class gate
on every `named:` row in scene/realmodels.js, it picks the glyph, it picks the colour, and it picks
the builder when no model matches. It is four regular expressions and it had no number behind it.

THE CATALOGUE ALREADY KNOWS. CelesTrak publishes `satcat.csv` with an `OBJECT_TYPE` column --
PAY, R/B, DEB -- for all seventy thousand objects it tracks. The app does not read it, and that is
a defensible choice: satcat is a 70 000-row CSV and the gp.php feeds the app actually fetches do
not carry the field. But it means the heuristic can be CHECKED against the authority even though it
cannot cheaply be replaced by it.

Measured 2026-09-12 over the 16 695 objects in the three groups the app fetches:

    agreement 16 690 / 16 695   =   99.97 %

FIVE DISAGREEMENTS, and four of them are not errors:

    CELESTIS-02 & TAURUS R/B     satcat PAY, we say rocket
    RS-44 & BREEZE-KM R/B        satcat PAY, we say rocket
    IPM 2 & BREEZE-M R/B         satcat PAY, we say rocket
    IDEFIX & ARIANE 42P R/B      satcat PAY, we say rocket

Those are combined objects: a payload that never separated from its stage. The catalogue files the
pair under the payload; the app draws it as a spent stage. Drawing a payload-still-bolted-to-a-stage
as a stage is the more truthful of the two, so these stay.

    HRC MONOBLOCK CAMERA         satcat DEB, we say satellite

That one is real. It is a piece of hardware released from the ISS, it is on the `stations` layer,
and the app draws it as a thirty-metre communications satellite. Fixing it by name would mean
teaching the debris regex the word "camera", which would be worse than the defect. It is recorded
rather than patched, and it is why this script prints names rather than only a percentage.

NOT IN CI: it needs the network, and satcat is a 12 MB download. Cached for a day.
"""
import argparse
import csv
import io
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
UA = "space-radar-class-check/1.0 (+https://spaceradar.ai)"
CACHE = Path(os.environ.get("TMPDIR", "/tmp")) / "space-radar-classes"
CACHE_SECONDS = 24 * 3600
GROUPS = ("active", "visual", "stations")

# The tolerance is the four combined objects above, not a round number. A fifth of them arriving is
# fine; a hundred means the catalogue changed how it names things and somebody should look.
ALLOWED_COMBINED = 12


def fetch(url, name, binary=False):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / name
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_SECONDS:
        return path.read_text(encoding="utf-8", errors="replace")
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            body = r.read().decode("utf-8", errors="replace")
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"  -- could not look at {name}: {e}", file=sys.stderr)
        return None
    path.write_text(body, encoding="utf-8")
    return body


# ---- the rules, transcribed from site/js/data/parsers.js classify() ----------------------------
# Transcribed and not imported: this script is Python and that function is a browser module. The
# transcription is the risk, so it is kept literal and the regexes are side by side with the JS.
RX_STATION = re.compile(r"\bISS\b|ZARYA|\bCSS \(|TIANHE|\bMIR\b", re.I)
RX_DEBRIS = re.compile(r"\bDEB\b|DEBRIS|\bFRAG\b|\bSHRAPNEL\b")
RX_ROCKET = re.compile(r"R/B|ROCKET BODY|\bAKM\b|\bPKM\b|\bUPPER STAGE\b")


def classify(name):
    u = str(name or "").upper()
    if RX_STATION.search(u):
        return "station"
    if RX_DEBRIS.search(u):
        return "debris"
    if RX_ROCKET.search(u):
        return "rocket"
    return "satellite"


EXPECT = {"PAY": "satellite", "R/B": "rocket", "DEB": "debris"}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--names", action="store_true", help="list every disagreement")
    ap.add_argument("--strict", action="store_true", help="exit 1 above the recorded tolerance")
    args = ap.parse_args()

    sat_csv = fetch("https://celestrak.org/pub/satcat.csv", "satcat.csv")
    if sat_csv is None:
        print("nothing said: satcat could not be read, which is not the same as a disagreement.")
        return 0
    types = {}
    for row in csv.DictReader(io.StringIO(sat_csv)):
        try:
            types[int(row["NORAD_CAT_ID"])] = row.get("OBJECT_TYPE", "?")
        except (TypeError, ValueError):
            continue

    objects, missing = {}, []
    for g in GROUPS:
        body = fetch(f"https://celestrak.org/NORAD/elements/gp.php?GROUP={g}&FORMAT=json", f"{g}.json")
        if body is None:
            missing.append(g)
            continue
        try:
            for o in json.loads(body):
                objects.setdefault(int(o["NORAD_CAT_ID"]), o["OBJECT_NAME"])
        except (json.JSONDecodeError, KeyError, ValueError):
            missing.append(g)
    if missing:
        print(f"could not look at: {', '.join(missing)}. What follows is a sample, not the whole.\n")
    if not objects:
        print("no catalogue to measure against; nothing said.")
        return 0

    agree, total, combined, real = 0, 0, [], []
    for nid, name in objects.items():
        want = EXPECT.get(types.get(nid))
        if want is None:
            continue
        total += 1
        got = classify(name)
        # A station is a satellite the app has chosen to treat specially; satcat has no such idea
        # and calls them all PAY. That is not a disagreement.
        if got == want or (want == "satellite" and got == "station"):
            agree += 1
            continue
        # "X & Y R/B" is a payload that never left its stage. The catalogue files the pair under
        # the payload; drawing it as a stage is the more truthful of the two.
        (combined if (" & " in name and want == "satellite" and got == "rocket") else real).append(
            (nid, name, types.get(nid), got)
        )

    pct = 100 * agree / total if total else 0
    print(f"{total} objects carry a satcat OBJECT_TYPE")
    print(f"classify() agrees on {agree} ({pct:.2f} %)\n")
    print(f"  {len(combined):>4}  payload-still-on-its-stage, drawn as a stage on purpose")
    print(f"  {len(real):>4}  genuine disagreement(s)")
    if args.names or real:
        for nid, name, t, got in sorted(real, key=lambda r: r[1]):
            print(f"        {nid:>7}  {name:<30} satcat {t}, classify() says {got}")
    if args.names and combined:
        print("\n  the combined objects:")
        for nid, name, t, got in sorted(combined, key=lambda r: r[1]):
            print(f"        {nid:>7}  {name}")

    if len(combined) > ALLOWED_COMBINED:
        print(
            f"\n{len(combined)} combined objects is more than the {ALLOWED_COMBINED} this script was "
            f"written against. That is not automatically wrong -- but the catalogue may have changed "
            f"how it names them, and the rule deserves a fresh look."
        )
        return 1 if args.strict else 0
    print("\nthe name rule and the catalogue agree about everything but the cases named above.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
