"""python3 -m harvest --dest DIR [--only ID] [--dry-run] [--now ISO]

The whole job, locally, with no AWS: the same code the Lambda runs, writing to a directory
instead of the bucket. A contributor proves a parser change here; CI packages the zip.
"""

from __future__ import annotations

import argparse
import json
import sys

from . import registry
from . import snapshot as snap
from .run import run


def main(argv: list[str] | None = None) -> int:
    ap = argparse.ArgumentParser(prog="python3 -m harvest", description=__doc__.strip().splitlines()[0])
    ap.add_argument("--dest", required=True, help="directory that stands in for the bucket prefix")
    ap.add_argument("--only", metavar="ID", help="run one source; the others keep their manifest entries")
    ap.add_argument("--dry-run", action="store_true", help="decide what is due; fetch nothing, write nothing")
    ap.add_argument("--now", metavar="ISO", help="pretend it is this UTC time (tests and rehearsals)")
    ap.add_argument("--sources", metavar="JSON", help=argparse.SUPPRESS)  # an alternative mirror, for tests
    args = ap.parse_args(argv)

    try:
        sources = registry.load(args.sources)
    except registry.RegistryError as e:
        print(f"registry: {e}", file=sys.stderr)
        return 2
    if args.only and args.only not in {s.id for s in sources}:
        print(f"--only {args.only!r}: no such source. Sources: {', '.join(s.id for s in sources)}", file=sys.stderr)
        return 2
    now = None
    if args.now:
        try:
            now = snap.parse_iso(args.now)
        except ValueError:
            print(f"--now {args.now!r} is not an ISO-8601 time", file=sys.stderr)
            return 2

    store = snap.DirStore(args.dest)
    # One line per source, flushed as it lands: a run redirected to a file (or CloudWatch) should
    # show a source the moment it is done, not fifteen of them when the last one times out.
    doc = run(store, sources, now=now, only=args.only, dry_run=args.dry_run, runner="local",
              log=lambda line: print(line, flush=True))

    statuses = {}
    for e in doc["snapshots"].values():
        statuses[e["status"]] = statuses.get(e["status"], 0) + 1
    summary = ", ".join(f"{k} {v}" for k, v in sorted(statuses.items()))
    where = "(dry run: nothing written)" if args.dry_run else f"-> {args.dest}/index.json"
    print(f"\n{len(doc['snapshots'])} sources in {doc['run']['duration_ms']} ms: {summary} {where}")
    if args.dry_run:
        print(json.dumps(doc, indent=2))
    return 0


if __name__ == "__main__":
    sys.exit(main())
