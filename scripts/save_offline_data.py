#!/usr/bin/env python3
"""Save a copy of the live data next to the app, so it runs with no internet.

    python3 scripts/save_offline_data.py                 # into site/data/v1/
    python3 scripts/save_offline_data.py --site=D:/space-radar/site
    python3 scripts/save_offline_data.py --from=https://your.mirror.example

WHY. The app reads /data/v1/index.json and one /data/v1/<source>.json per source before it asks
any publisher (site/js/data/sources.js). spaceradar.ai keeps those files filled; a clone has none
(the folder is gitignored: it is data, not code, and it ages). A classroom with no connection
needs them on disk. This copies what the live site publishes -- nothing else is contacted, so it
spends none of CelesTrak's one-download-per-two-hours allowance and needs no account anywhere.

Standard library only, so it runs on the Python a school computer already has (3.8 or newer).
It writes each file to a temporary name and renames it, and writes index.json LAST: a run that is
interrupted leaves the previous good copy readable, never half of a new one.
"""
import json
import os
import sys
import urllib.request

DEFAULT_FROM = "https://www.spaceradar.ai"

# NOT OURS TO COPY: the sources registry/sources.yaml switches off because their publisher does not
# let a third party pass the data on (ESA's NEOCC list; Space-Track's reentry predictions). The live
# site stopped publishing the first on 2026-10-09 (internal #370); a mirror or an old folder might
# still hold it, so it is never saved and a copy already on disk is removed. Written out here, not
# read from the registry, because this file travels alone in the release zip;
# tests/test_not_ours_to_copy.py holds the list to the registry.
NOT_OURS_TO_COPY = ("esa-neocc-close", "space-track-tip")


def arg(name, default):
    for a in sys.argv[1:]:
        if a.startswith("--" + name + "="):
            return a[len(name) + 3:]
    return default


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": "space-radar-offline-copy"})
    with urllib.request.urlopen(req, timeout=120) as r:
        return r.read()


def put(path, body):
    tmp = path + ".part"
    with open(tmp, "wb") as f:
        f.write(body)
    os.replace(tmp, path)


def main():
    if "-h" in sys.argv or "--help" in sys.argv:
        print(__doc__)
        return 0
    here = os.path.dirname(os.path.abspath(__file__))
    site = arg("site", os.path.join(here, "..", "site"))
    base = arg("from", DEFAULT_FROM).rstrip("/") + "/data/v1/"
    dest = os.path.join(site, "data", "v1")
    if not os.path.isfile(os.path.join(site, "index.html")):
        print("no index.html in %s -- pass --site=<the folder that holds index.html>" % site, file=sys.stderr)
        return 2
    os.makedirs(dest, exist_ok=True)

    print("reading " + base + "index.json")
    raw = get(base + "index.json")
    index = json.loads(raw)
    rows = index.get("snapshots") or {}
    saved, missing, total = 0, [], len(raw)
    for rid in NOT_OURS_TO_COPY:
        if rid in rows and rows[rid].get("fetched_at"):
            # A mirror that still lists it as data: the manifest that is saved says `skipped`, as the
            # live site's does, so the copy never claims a file it does not hold.
            rows[rid] = {"status": "skipped", "last_error": "not ours to copy: its publisher does not allow redistribution"}
            index["snapshots"] = rows
            raw = json.dumps(index, indent=1).encode("utf-8")
        for name in (rid + ".json", rid + ".cols.json"):
            if os.path.isfile(os.path.join(dest, name)):
                os.remove(os.path.join(dest, name))
                print("  removed %s: its publisher does not allow copies to be passed on" % name)
    for rid in sorted(rows):
        if not rows[rid].get("fetched_at"):
            continue  # the site has never had this one; there is nothing to copy
        try:
            body = get(base + rid + ".json")
            json.loads(body)  # a saved error page is worse than no file
        except Exception as e:  # noqa: BLE001 -- one missing source must not lose the rest
            missing.append("%s (%s)" % (rid, e))
            continue
        put(os.path.join(dest, rid + ".json"), body)
        saved += 1
        total += len(body)
        print("  saved %-34s %8.1f kB   read from its publisher %s" % (rid, len(body) / 1000, rows[rid]["fetched_at"]))
    put(os.path.join(dest, "index.json"), raw)

    print("\n%d sources, %.1f MB, in %s" % (saved, total / 1e6, os.path.normpath(dest)))
    for m in missing:
        print("  not saved: " + m)
    print("The app will say how old each copy is. Satellite positions drift as a copy ages:\n"
          "run this again while online (every week or two) to keep them true.")
    return 0 if saved else 1


if __name__ == "__main__":
    sys.exit(main())
