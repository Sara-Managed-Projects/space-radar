#!/usr/bin/env python3
"""registry/wmm/WMM2025.COF -> site/js/data/wmm2025.js (the World Magnetic Model's coefficients).

The file is NOAA NCEI's WMM.COF for 2025.0 to 2030.0, unchanged (CREDITS.md section 3k).
`python3 scripts/gen_wmm_js.py --check` fails when the module and the file disagree.
"""
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / 'registry' / 'wmm' / 'WMM2025.COF'
OUT = ROOT / 'site' / 'js' / 'data' / 'wmm2025.js'


def build():
    lines = SRC.read_text().splitlines()
    head = lines[0].split()
    epoch, name, released = float(head[0]), head[1], head[2]
    rows = []
    for line in lines[1:]:
        p = line.split()
        if len(p) != 6:
            continue
        rows.append((int(p[0]), int(p[1]), float(p[2]), float(p[3]), float(p[4]), float(p[5])))
    assert len(rows) == 90 and rows[-1][0] == 12, len(rows)
    flat = ','.join(f'{v:g}' for r in rows for v in r[2:])
    return (
        '// GENERATED from registry/wmm/WMM2025.COF by scripts/gen_wmm_js.py. Do not edit.\n'
        '//\n'
        f'// The World Magnetic Model {name} (released {released}), NOAA NCEI and the British Geological Survey:\n'
        '// Gauss coefficients g, h in nanotesla and their yearly change, degree 1 to 12, in the order of\n'
        '// the file (n, then m = 0..n). Public domain (CREDITS.md section 3k). Read by sky/pointing.js only.\n'
        f'export const WMM = {{ epoch: {epoch:g}, validTo: {epoch + 5:g}, name: {name!r}, nMax: 12, c: [{flat}] }};\n'
    )


def main():
    text = build()
    if '--check' in sys.argv:
        if not OUT.exists() or OUT.read_text() != text:
            print('site/js/data/wmm2025.js is stale: run python3 scripts/gen_wmm_js.py')
            return 1
        print('wmm2025.js matches registry/wmm/WMM2025.COF')
        return 0
    OUT.write_text(text)
    print(f'wrote {OUT.relative_to(ROOT)} ({len(text)} bytes)')
    return 0


if __name__ == '__main__':
    sys.exit(main())
