#!/usr/bin/env python3
"""The mission path files: what ships is what the manifest describes, and the guard refuses.

`scripts/build_ephemerides.py --check` is the guard (no network): registry/ephemerides.yaml, the
manifest, the .bin files, the browser's mirror, the held-out Horizons positions and the missions'
`place: path` events must agree. A guard is tested by breaking what it guards: each case below
copies the few files it reads into a scratch tree, breaks one thing, and requires a refusal that
names it.

    python3 tests/test_ephemerides.py
"""
from __future__ import annotations

import json
import shutil
import sys
import tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
import build_ephemerides as B  # noqa: E402

FILES = ["registry/ephemerides.yaml", "registry/missions.yaml", "site/js/data/ephemerides.js", "tests/fixtures/eph_heldout.json"]
problems = []


def tree() -> Path:
    work = Path(tempfile.mkdtemp(prefix="eph-refusal-"))
    for rel in FILES:
        (work / rel).parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(ROOT / rel, work / rel)
    shutil.copytree(ROOT / "site/data/eph", work / "site/data/eph")
    return work


def edit(work: Path, rel: str, old: str, new: str) -> None:
    p = work / rel
    text = p.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"test_ephemerides: the case's anchor is gone from {rel}: {old!r}")
    p.write_text(text.replace(old, new, 1), encoding="utf-8")


def case(name: str, breaker, *needles: str) -> None:
    work = tree()
    try:
        breaker(work)
        said = B.check(work)
    finally:
        shutil.rmtree(work, ignore_errors=True)
    if not said:
        problems.append(f"{name}: NOT REFUSED")
    elif not all(any(n in line for line in said) for n in needles):
        problems.append(f"{name}: refused, but without saying {needles}: {said[:2]}")


# --- the tree as committed ---------------------------------------------------------------------
clean = B.check(ROOT)
if clean:
    problems.append("the committed files are refused: " + "; ".join(clean[:4]))
manifest = json.loads((ROOT / "site/data/eph/manifest.json").read_text(encoding="utf-8"))
reg = B.load_registry()
total = sum(c["bytes"] for c in manifest["craft"])
if total > 2_000_000:
    problems.append(f"the path files are {total} bytes in all, over 2 MB")
for c in manifest["craft"]:
    row = next(r for r in reg["craft"] if r["id"] == c["id"])
    at = c["id"]
    if c["bytes"] > row["max_bytes"]:
        problems.append(f"{at}: {c['bytes']} bytes, over its {row['max_bytes']}")
    for key in ("solution", "retrieved", "command", "sha256"):
        if not c.get(key):
            problems.append(f"{at}: the manifest has no {key}")
    if not c["segments"] or any(not s.get("steps") for s in c["segments"]):
        problems.append(f"{at}: a segment has no step table")
    if c["good_to_km"] < max(c["fit_max_km"], c["heldout"]["max_km"]):
        problems.append(f"{at}: the stated bound is under a measured error")
if manifest["source"]["terms"] != "https://ssd.jpl.nasa.gov/horizons/" or "JPL" not in manifest["source"]["credit"]:
    problems.append("the manifest does not carry JPL's credit and the page of its terms")
credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
if "site/data/eph" not in credits or "Horizons" not in credits:
    problems.append("CREDITS.md does not credit JPL Horizons for site/data/eph")

# the reader and the writer agree, and a damaged file is not read as a shorter one
blob = (ROOT / "site/data/eph" / manifest["craft"][0]["file"]).read_bytes()
segs = B.unpack(blob)
if B.evaluate(segs, segs[0]["t"][0])[1] != list(segs[0]["p"][0:3]):
    problems.append("at a sample's own time the curve is not the sample")
if B.evaluate(segs, segs[0]["t"][0] - 1) is not None or B.evaluate(segs, segs[-1]["t"][-1] + 1) is not None:
    problems.append("outside the file the reader still answers")
for bad, why in ((b"XXXX" + blob[4:], "no SREP"), (blob[:-3], "shorter"), (blob + b"\0", "longer")):
    try:
        B.unpack(bad)
        problems.append(f"a damaged file ({why}) was read")
    except B.Refusal:
        pass
if B.nice_ceil(7.4) != 10 or B.nice_ceil(1.2) != 2 or B.nice_ceil(430) != 500 or B.nice_ceil(0.3) != 1:
    problems.append("the stated bound is not rounded up to 1, 2 or 5 of its decade")

# --- the refusals --------------------------------------------------------------------------------
first = manifest["craft"][0]


def flip_byte(work):
    p = work / "site/data/eph" / first["file"]
    b = bytearray(p.read_bytes())
    b[len(b) // 2] ^= 0xFF
    p.write_bytes(bytes(b))


def manifest_edit(fn):
    def run(work):
        p = work / "site/data/eph/manifest.json"
        m = json.loads(p.read_text(encoding="utf-8"))
        fn(m)
        p.write_text(json.dumps(m, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    return run


def bound_too_small(m):
    m["craft"][0]["good_to_km"] = 0.001


def no_solution(m):
    m["craft"][0]["solution"] = None


def heldout_moved(work):
    p = work / "tests/fixtures/eph_heldout.json"
    h = json.loads(p.read_text(encoding="utf-8"))
    h[first["id"]][0][2] += 5000.0
    p.write_text(json.dumps(h), encoding="utf-8")


case("a byte of a path file changed", flip_byte, first["id"], "not the file the manifest describes")
case("a path file nobody describes", lambda w: (w / "site/data/eph/stray.bin").write_bytes(b"SREP"), "stray.bin", "no manifest row")
case("a path file missing", lambda w: (w / "site/data/eph" / first["file"]).unlink(), first["file"], "is not in site/data/eph")
case("a bound smaller than the measured error", manifest_edit(bound_too_small), first["id"], "says good to")
case("no solution string", manifest_edit(no_solution), first["id"], "`solution` is missing")
case("a held-out position that the file misses", heldout_moved, first["id"], "held-out error")
case("a manifest row with no registry row", manifest_edit(lambda m: m["craft"].append({**m["craft"][0], "id": "deep-nobody"})), "deep-nobody", "is not in registry/ephemerides.yaml")
case("a stale mirror", lambda w: edit(w, "site/js/data/ephemerides.js", "goodToKm", "goodToKm_"), "ephemerides.js is STALE")
case("a window round a world the format does not know", lambda w: edit(w, "registry/ephemerides.yaml", "{centre: jupiter,", "{centre: vesta,"), "'vesta'", "not a world this format knows")
case("no terms for the source", lambda w: edit(w, "registry/ephemerides.yaml", "  terms: https://ssd.jpl.nasa.gov/horizons/\n", ""), "source.terms is missing")
case("a source that is not JPL", lambda w: edit(w, "registry/ephemerides.yaml", "api: https://ssd.jpl.nasa.gov/api/horizons.api", "api: https://example.org/horizons"), "must be JPL's own")
case("a span the file was not built for", lambda w: edit(w, "registry/ephemerides.yaml", 'to: "2031-01-01T00:00:00Z"', 'to: "2032-01-01T00:00:00Z"'), "is not the registry's")
case("a bigger file with no reason", lambda w: edit(w, "registry/ephemerides.yaml", "    command: \"-31\"\n", "    command: \"-31\"\n    max_bytes: 900000\n"), "gives no max_bytes_why")
case("a time off the minute", lambda w: edit(w, "registry/ephemerides.yaml", 'to: "2031-01-01T00:00:00Z"', 'to: "2031-01-01T00:00:30Z"'), "not on a whole minute")
case("an unknown field", lambda w: edit(w, "registry/ephemerides.yaml", "    command: \"-31\"\n", "    command: \"-31\"\n    colour: red\n"), "unknown field 'colour'")
case("a craft listed twice", lambda w: edit(w, "registry/ephemerides.yaml", "  - id: deep-voyager-2\n", "  - id: deep-voyager-1\n"), "listed twice")
case("an event on a path the file does not span",
     lambda w: edit(w, "registry/missions.yaml", '{id: jupiter, date: "1979-03-05T12:05:00Z"', '{id: jupiter, date: "1969-03-05T12:05:00Z"'),
     "voyager-1.jupiter", "outside the file's span")
case("an event on a path for a record with no file",
     lambda w: edit(w, "registry/missions.yaml", "record: deep-voyager-1", "record: deep-voyager-9"),
     "voyager-1.", "has no file in registry/ephemerides.yaml")

if problems:
    print("ephemerides FAILED:\n  " + "\n  ".join(problems))
    sys.exit(1)
print(f"ephemerides ok: {len(manifest['craft'])} craft in {total} bytes are the files their manifest rows describe; "
      f"18 ways of breaking the registry, the manifest, a file or an event are each refused by name")
