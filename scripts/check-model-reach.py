#!/usr/bin/env python3
"""Report how many real objects each entry in realmodels.js actually reaches.

    ./scripts/check-model-reach.py              # fetch (cached 2h) and report
    ./scripts/check-model-reach.py --names      # ...and list every object each name key catches
    ./scripts/check-model-reach.py --strict     # exit 1 if any mapping reaches nothing

WHY THIS EXISTS

scripts/check-model-ids.sh answers "does this id point at the object the row NAMES?". That is the
check against drawing the wrong spacecraft. It cannot answer the other half: "does anything the app
draws match this row at all?" -- and on 2026-09-12 the answer for three shipped models was no.

    poes.glb      221 kB   NOAA 15, 18 and 19 are not in GROUP=active any more
    cloudsat.glb  206 kB   CloudSat ended in 2023 and left the list
    calipso.glb   267 kB   CALIPSO ended in 2023 and left the list

694 kB of correct, credited, live-id-checked models drawing nothing. Nothing was wrong with them
when they shipped; the catalogue moved. Spec 0027 already says "a name that never matches is a
wasted file" -- this is what turns that from a maxim into a number.

It also makes a FALSE POSITIVE visible, which the id check structurally cannot: `--names` lists
every object a name key catches, and `mms` catching ELARASAT MMS-1 as well as MMS 1 to 4 is
obvious on sight and was invisible for as long as nobody printed the list.

NOT PART OF CI, exactly as check-model-ids.sh is not: it needs the network, and CelesTrak allows one
download per file per two hours. A red build for somebody else's outage is how a team learns to
ignore red builds. Run it when you add a mapping, and when a model stops appearing.

A ZERO IS NOT AUTOMATICALLY A DEFECT. A mapping for a spacecraft that has left the active list is
correct and dormant, and deleting it would mean re-deriving it if the object comes back. What a
zero means is "this file is not doing what its row claims today", and that is a thing the tree
should be able to say out loud.

WHAT THIS CANNOT SEE, and says so rather than reporting it as a zero. Only the `norad:` and `named:`
routes are answerable from a CelesTrak group file. `horizons:` records come from JPL, `bySite:` and
`bySiteClass:` from registry/sites.yaml, and the asteroid and comet layers from JPL and the MPC --
so a row gated to klass `asteroid`, `comet` or `probe` is not measured here and is listed apart.
asteroid-bennu.glb is the worked example: it reaches Bennu, and Bennu is not in any of these files.
"""
import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site/js/scene/realmodels.js"
UA = "space-radar-model-reach/1.0 (+https://spaceradar.ai)"
CACHE = Path(os.environ.get("TMPDIR", "/tmp")) / "space-radar-reach"
CACHE_SECONDS = 2 * 3600  # CelesTrak's own rate limit, so a re-run is free

# The three files registry/sources.yaml fetches. The reach of a mapping is defined against THESE
# and not against the whole catalogue: an object CelesTrak knows about but does not put in one of
# them is an object this app never sees.
GROUPS = ("active", "visual", "stations")


def fetch(group):
    CACHE.mkdir(parents=True, exist_ok=True)
    path = CACHE / f"{group}.json"
    if path.exists() and time.time() - path.stat().st_mtime < CACHE_SECONDS:
        return json.loads(path.read_text())
    url = f"https://celestrak.org/NORAD/elements/gp.php?GROUP={group}&FORMAT=json"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            body = r.read().decode("utf-8")
    except (urllib.error.URLError, TimeoutError) as e:
        print(f"  -- could not look at {group}: {e}", file=sys.stderr)
        return None
    try:
        data = json.loads(body)
    except json.JSONDecodeError:
        print(f"  -- {group} did not answer with JSON (rate limited?)", file=sys.stderr)
        return None
    path.write_text(json.dumps(data))
    return data


def block(src, name):
    start = src.index(f"{name}: {{")
    return src[start : src.index("\n  },", start)]


def parse():
    """The three routes realModelFor() uses that a catalogue can answer for: norad, named, byLayer."""
    src = SRC.read_text(encoding="utf-8")
    norad = {}
    for m in re.finditer(r"(\d+):\s*\{([^}]*)\}", block(src, "norad")):
        body = m.group(2)
        f = re.search(r"file:\s*'([^']*)'", body)
        b = re.search(r"build:\s*'([^']*)'", body)
        norad[int(m.group(1))] = f.group(1) if f else ("build:" + b.group(1) if b else "?")
    nb = block(src, "named")
    nb = nb[nb.index("{") + 1 :]
    named = []
    for m in re.finditer(r"(?:^|\n)\s*'?([a-z0-9 /\-()]+?)'?:\s*\{([^}]*)\}", nb):
        key, body = m.group(1).strip(), m.group(2)
        f = re.search(r"file:\s*'([^']*)'", body)
        b = re.search(r"build:\s*'([^']*)'", body)
        kl = re.search(r"klass:\s*\[([^\]]*)\]", body)
        named.append(
            {
                "key": key,
                "shape": f.group(1) if f else ("build:" + b.group(1) if b else "?"),
                "klass": [x.strip().strip("'") for x in kl.group(1).split(",")] if kl else None,
            }
        )
    return norad, named


def word_match(haystack, needle):
    """The same rule as realmodels.js wordMatch(): a boundary is anything not a letter or digit."""
    i = 0
    while True:
        i = haystack.find(needle, i)
        if i < 0:
            return False
        before = haystack[i - 1] if i else ""
        after = haystack[i + len(needle)] if i + len(needle) < len(haystack) else ""
        is_word = lambda c: c != "" and re.match(r"[a-z0-9]", c)
        if not is_word(before) and not is_word(after):
            return True
        i += 1


RX_STATION = re.compile(r"\bISS\b|ZARYA|\bCSS \(|TIANHE", re.I)


def classify(name):
    """data/parsers.js classify(), minus the six station ids it also knows."""
    u = name.upper()
    if RX_STATION.search(u):
        return "station"
    if re.search(r"\bDEB\b|DEBRIS|\bFRAG\b|\bSHRAPNEL\b", u):
        return "debris"
    if re.search(r"R/B|ROCKET BODY|\bAKM\b|\bPKM\b|\bUPPER STAGE\b", u):
        return "rocket"
    return "satellite"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--names", action="store_true", help="list every object each name key catches")
    ap.add_argument("--strict", action="store_true", help="exit 1 if any mapping reaches nothing")
    args = ap.parse_args()

    objects, missing = {}, []
    for g in GROUPS:
        data = fetch(g)
        if data is None:
            missing.append(g)
            continue
        for o in data:
            objects.setdefault(int(o["NORAD_CAT_ID"]), o["OBJECT_NAME"])
    if missing:
        # "Could not look" is not "nothing matched" -- spec 0021's rule, and it applies here too.
        print(f"could not look at: {', '.join(missing)}. Reach below is a FLOOR, not a count.\n")
    if not objects:
        print("no catalogue to measure against; nothing said.")
        return 0

    norad, named = parse()
    print(f"{len(objects)} distinct objects across {', '.join(g for g in GROUPS if g not in missing)}\n")

    # Which klasses a CelesTrak group file can actually produce (data/parsers.js classify()).
    # A row gated to anything else is answered by a different source and is not measurable here.
    CELESTRAK_KLASSES = {"satellite", "rocket", "debris", "station"}

    rows, zero, unmeasurable = [], [], []
    by_id = {nid: shape for nid, shape in norad.items()}
    hit_ids = {nid for nid in by_id if nid in objects}
    for nid, shape in sorted(by_id.items()):
        rows.append(("id", str(nid), shape, 1 if nid in objects else 0, []))

    for entry in named:
        if entry["klass"] and not (set(entry["klass"]) & CELESTRAK_KLASSES):
            unmeasurable.append((entry["key"], entry["shape"]))
            continue
        caught = [
            (nid, nm)
            for nid, nm in objects.items()
            # an id mapping wins over a name, exactly as realModelFor() orders them
            if nid not in by_id
            and (not entry["klass"] or classify(nm) in entry["klass"])
            and word_match(nm.lower(), entry["key"])
        ]
        rows.append(("name", entry["key"], entry["shape"], len(caught), caught))

    # by shape, because a file is what ships and a row is only how it is reached
    per_shape = {}
    for kind, key, shape, n, _ in rows:
        per_shape.setdefault(shape, [0, 0])
        per_shape[shape][0] += n
        per_shape[shape][1] += 1
    print(f"{'shape':<26}{'objects':>9}{'rows':>7}")
    for shape, (n, r) in sorted(per_shape.items(), key=lambda x: -x[1][0]):
        flag = "   <-- reaches nothing" if n == 0 else ""
        print(f"  {shape:<24}{n:>9}{r:>7}{flag}")
        if n == 0:
            zero.append(shape)

    if unmeasurable:
        print("\nnot measurable from a CelesTrak group file -- these rows are gated to a klass")
        print("that comes from JPL, the MPC or registry/sites.yaml, so their reach is not a zero:")
        for key, shape in sorted(unmeasurable):
            print(f"  {key:<24}-> {shape}")

    if args.names:
        print("\nwhat each name key catches -- read this for a wrong object, not just a missing one:")
        for kind, key, shape, n, caught in rows:
            if kind != "name":
                continue
            print(f"\n  {key}  ->  {shape}  ({n})")
            for nid, nm in sorted(caught, key=lambda x: x[1])[:40]:
                print(f"      {nid:>7}  {nm}")
            if n > 40:
                print(f"      ... and {n - 40} more")

    print()
    if zero:
        print(f"{len(zero)} shape(s) reach nothing in the catalogue today: {', '.join(sorted(zero))}")
        print("A zero is not automatically a defect -- see this file's header -- but it is a claim")
        print("the tree is making that today's catalogue does not support.")
        if args.strict:
            return 1
    else:
        print("every shape reaches at least one object.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
