#!/usr/bin/env python3
"""Mirror the dated sky events (registry/sky-events.yaml, with their computed instants) into site/js/data/skycalendar.js.

The sky calendar of the map (ui/skycalendar.js, forge #553) shows the same occasions the /events/ pages and their calendar
feeds do, so it reads the same rows. A row TYPES only what is a fact of a calendar or an agency; the instants are COMPUTED
(scripts/seo_facts.mjs, Astronomy Engine, the library the map itself uses), here as for the pages, and written into the mirror
so the browser computes nothing to draw a month. The feeds the calendar offers are scripts/seo_calendar.py FEEDS, by name.

Run:  python3 scripts/gen_skycalendar_js.py           # write it (needs node on PATH, as scripts/build_seo.py does)
      python3 scripts/gen_skycalendar_js.py --check   # exit 1 if the checked-in file is stale
"""
from __future__ import annotations

import json
import shutil
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from _genmirror import ROOT, Mirror  # noqa: E402
import seo_calendar  # noqa: E402


def facts(rows: list[dict]) -> dict:
    node = shutil.which("node")
    if not node:
        raise SystemExit("gen_skycalendar_js: needs Node 22 on PATH (the instants are Astronomy Engine's, scripts/seo_facts.mjs)")
    run = subprocess.run([node, str(ROOT / "scripts" / "seo_facts.mjs"), "events"], input=json.dumps({"events": rows}, default=str),
                         capture_output=True, text=True, cwd=ROOT)
    if run.returncode != 0:
        raise SystemExit(f"gen_skycalendar_js: scripts/seo_facts.mjs events failed:\n{run.stderr}")
    return {f["id"]: f for f in json.loads(run.stdout)["events"]}


def row(r: dict, f: dict) -> dict:
    """What a calendar row needs: when, what kind, the words' parameters, where the map opens and the page it has."""
    mission = r["kind"] == "mission"
    out = {"id": r["id"], "kind": r["kind"], "start": str(r["happens"]) if mission else f["instant"], "allDay": mission,
           "link": {"t": r["link"]["t"], "at": r["link"]["at"]}}
    if r["kind"] == "meteor-shower":
        out["shower"] = r["shower"]
        out["zhr"] = f["shower"]["zhr"]
    elif r["kind"] in ("eclipse", "lunar-eclipse"):
        out["eclipse"] = f["kind"]
    elif r["kind"] == "conjunction":
        out["bodies"] = list(r["bodies"])
        out["separationDeg"] = f["separationDeg"]
    elif r["kind"] == "season":
        out["season"] = r["season"]
    elif r["kind"] == "full-moon":
        out["distanceKm"] = f["distanceKm"]
    elif mission:
        out["mission"] = r["mission"]
    return out


def render(doc: dict) -> list:
    rows = doc.get("events") or []
    got = facts(rows)
    events = sorted((row(r, got[r["id"]]) for r in rows), key=lambda e: (e["start"], e["id"]))
    feeds = [{"file": name, "kinds": sorted(kinds) if kinds else None} for name, (_title, kinds) in seo_calendar.FEEDS.items()]
    return [
        ("The day the rows were last checked by a person (registry/sky-events.yaml checked_on).", "CHECKED_ON", str(doc.get("checked_on"))),
        ("The dated sky events, oldest first: `start` an ISO UTC instant (a date for a mission's day), `link` the map at that moment.",
         "SKY_EVENTS", events),
        ("The calendar files scripts/seo_calendar.py builds beside the event pages: a file name and the kinds it holds (null: all).",
         "SKY_FEEDS", feeds),
    ]


HEADER = """// GENERATED from registry/sky-events.yaml by scripts/gen_skycalendar_js.py. Do not edit.
//
// `python3 scripts/gen_skycalendar_js.py --check` fails CI if this file and the YAML disagree. The instants are computed by
// scripts/seo_facts.mjs (Astronomy Engine), the same numbers the /events/ pages and their calendar files print.
"""

MIRROR = Mirror(source="registry/sky-events.yaml", target="site/js/data/skycalendar.js", header=HEADER, render=render,
                what="skycalendar.js", indent=0)

if __name__ == "__main__":
    sys.exit(MIRROR.main())
