#!/usr/bin/env python3
"""Turn a NASA model name into its path in the repository. Helper for fetch-model.sh.

Its own file rather than a heredoc inside the shell script, because a Python heredoc nested in a
command substitution inside a shell script is the kind of quoting that works until somebody edits
it. Prints one path on stdout, or an explanation on stderr and a non-zero exit.

    _resolve_nasa_model.py <nasa-tree.json> "InSight Cruise Lander (arm deployed)"
"""

from __future__ import annotations

import json
import sys


def main(argv: list[str]) -> int:
    if len(argv) != 3:
        print(__doc__, file=sys.stderr)
        return 2
    index_path, wanted = argv[1], argv[2].lower()

    try:
        tree = json.load(open(index_path, encoding="utf-8")).get("tree", [])
    except Exception as exc:  # a truncated or rate-limited download is the likely cause
        print(f"cannot read the model index ({exc}); delete it and try again", file=sys.stderr)
        return 1

    glbs = [x["path"] for x in tree if x.get("path", "").lower().endswith(".glb")]
    if not glbs:
        print("the index contains no GLB files -- it is probably a GitHub error page", file=sys.stderr)
        return 1

    # An exact file-stem match wins; a substring match is the fallback. Both are needed: folder and
    # file names agree for most models and disagree for the ones with variants.
    exact = [p for p in glbs if p.rsplit("/", 1)[-1][:-4].lower() == wanted]
    loose = [p for p in glbs if wanted in p.lower()]
    hits = exact or loose

    if len(hits) == 1:
        print(hits[0])
        return 0
    if not hits:
        print(f"no GLB matches {argv[2]!r}", file=sys.stderr)
        return 1

    print(f"{len(hits)} models match {argv[2]!r}; name one exactly:", file=sys.stderr)
    for h in hits[:15]:
        print(f"  {h.rsplit('/', 1)[-1][:-4]}", file=sys.stderr)
    return 1


if __name__ == "__main__":
    sys.exit(main(sys.argv))
