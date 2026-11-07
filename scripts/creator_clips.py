#!/usr/bin/env python3
"""The clip library's release job: one film of every trip, made by render mode (forge #166).

    python3 scripts/creator_clips.py                       # the plan: each trip, its files and the command that makes them
    python3 scripts/creator_clips.py --run [--out DIR] [--res 3840x2160] [--only TRIP]
                                                           # make them, one after another (hours: a 4K trip is ~1 h on a laptop GPU)

WHY A JOB AND NOT A FOLDER OF VIDEOS. A clip made by hand is a clip nobody can remake when a trip changes. Render
mode (site/js/ui/rendermode.js, `?render=1#trip=<id>`) runs the app on a clock that moves one frame at a time, and
tools/render-trip.mjs photographs each frame and lays the narration and the music under it, so the same release
always makes the same film whatever the machine. This script is the list of what to make and the loop that makes
it; /creators/ (scripts/seo_reach.py) prints the same list as "made at release".

WHAT IS NOT IN IT. The Moments (site/js/moments/) are not a trip and render-trip.mjs does not play them; until it
does, they are recorded with the app's own Record button (ui/recorder.js), which films them live. They are listed
as such, never as clips that exist.

Each film gets the credit and the sources on its end card and in its description file, from render-trip.mjs.
"""

from __future__ import annotations

import re
import subprocess
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_RES = "3840x2160"


def trips(doc: dict | None = None) -> list[dict]:
    """[{id, title}] in registry/tours.yaml's order."""
    doc = doc if doc is not None else yaml.load((ROOT / "registry/tours.yaml").read_text(encoding="utf-8"),
                                                 Loader=getattr(yaml, "CSafeLoader", yaml.SafeLoader))
    return [{"id": t["id"], "title": str(t.get("title") or t["id"])} for t in doc.get("tours") or [] if t.get("id")]


def moments(text: str | None = None) -> list[str]:
    """The Moments on the shelf (site/js/moments/shelf.js SHELF), by id."""
    text = text if text is not None else (ROOT / "site/js/moments/shelf.js").read_text(encoding="utf-8")
    m = re.search(r"export const SHELF = \[(.*?)\n\];", text, re.S)
    return re.findall(r"\{ id: '([a-z0-9-]+)'", m.group(1)) if m else []


def plan(rows: list[dict], res: str = DEFAULT_RES, out: str = "out/clips") -> list[dict]:
    """One entry a trip: the files render-trip.mjs writes for it and the command that writes them."""
    if not re.fullmatch(r"\d{3,4}x\d{3,4}", res):
        raise ValueError(f"--res {res!r}: width x height, as 3840x2160")
    return [{"id": r["id"], "title": r["title"], "files": [f"{r['id']}.mp4", f"{r['id']}.vtt", f"{r['id']}.thumb.jpg"],
             "command": ["node", "tools/render-trip.mjs", r["id"], f"--res={res}", "--fps=30", "--captions", f"--out={out}"]}
            for r in rows]


def main(argv: list[str]) -> int:
    def opt(name: str, default: str) -> str:
        return argv[argv.index(name) + 1] if name in argv and argv.index(name) + 1 < len(argv) else default

    only = opt("--only", "")
    rows = [r for r in trips() if not only or r["id"] == only]
    if only and not rows:
        print(f"creator_clips: no trip {only!r} in registry/tours.yaml", file=sys.stderr)
        return 2
    jobs = plan(rows, opt("--res", DEFAULT_RES), opt("--out", "out/clips"))
    if "--run" not in argv:
        for j in jobs:
            print(" ".join(j["command"]))
        print(f"# {len(jobs)} trips; Moments recorded live with Record, not here: {', '.join(moments())}")
        return 0
    for j in jobs:
        print(f"creator_clips: {j['id']}", flush=True)
        done = subprocess.run(j["command"], cwd=ROOT)
        if done.returncode:
            print(f"creator_clips: {j['id']} failed ({done.returncode}); the frames so far are kept, run again to go on", file=sys.stderr)
            return done.returncode
    return 0


if __name__ == "__main__":
    sys.path.insert(0, str(Path(__file__).resolve().parent))
    from _cli import usage_if_asked

    usage_if_asked(__doc__)
    sys.exit(main(sys.argv[1:]))
