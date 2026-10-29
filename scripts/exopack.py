#!/usr/bin/env python3
"""Pack the NASA Exoplanet Archive's confirmed planets into site/data/exoplanets.bin (release 1.5.0, 0079 a13).

    python3 scripts/exopack.py [site/data/exoplanets.csv] [site/data/exoplanets.bin]

The layer used to read the harvester's snapshot (the archive's table as CSV text inside a JSON
file, 879 kB) or, with none, the bundled CSV (583 kB). Neither is a fair thing to fetch for a layer
that is now ON by default. This file carries the same thirteen columns as typed arrays, quantised
to what a card prints, and the gzip of it is what a visitor pays.

LAYOUT (little-endian). Decoded by site/js/data/exopack.js; tests/test_exopack.mjs holds the two
sides together by decoding the file and comparing every planet with the CSV row it came from.

    4 B   'SRXP'
    1 B   version (1)
    1 B   reserved (0)
    2 B   header length H
    H B   UTF-8 JSON: {asOf, n, methods:[..], spects:[..], hosts:{index: host}, namesBytes}
    then, each n entries long, in this order:
      ra     i32  microdegrees (0..360e6), as the difference from the planet before it (the first from 0)
      dec    i32  microdegrees, the same
      dist   i32  milliparsecs, the same
      rade   u16  0.01 Earth radii; 0xFFFF = not given
      mass   u16  10000 * (log10(Earth masses) + 2); 0xFFFF = not given
      per    u16  6000 * (log10(days) + 2); 0xFFFF = not given
      teff   u16  kelvin; 0 = not given
      srad   u16  0.01 solar radii; 0xFFFF = not given
      year   u16  discovery year; 0 = not given
      method u8   index into `methods`; 255 = not given
      spect  u16  index into `spects`; 0xFFFF = not given
    names  UTF-8, the planets' names joined by "\\n" (namesBytes long)

A planet's host is its name without the trailing " b" / " c" ...; the 124 whose host is spelt
otherwise (TOI-1338 b is of TOI-1338 A) are in `hosts`, keyed by planet index.
"""
from __future__ import annotations

import csv
import json
import math
import re
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NONE16 = 0xFFFF


def _f(v):
    try:
        x = float(v)
    except (TypeError, ValueError):
        return None
    return x if math.isfinite(x) else None


def _log(v, scale, off):
    x = _f(v)
    if x is None or x <= 0:
        return NONE16
    q = round(scale * (math.log10(x) + off))
    if not 0 <= q < NONE16:
        raise ValueError(f"{v} does not fit a log16 column")
    return q


def _lin(v, scale):
    x = _f(v)
    if x is None or x < 0:
        return NONE16
    q = round(x * scale)
    if q >= NONE16:
        raise ValueError(f"{v} does not fit a lin16 column")
    return q


def derived_host(name: str) -> str:
    return re.sub(r" [a-z]$", "", name)


def pack(csv_path: Path, as_of: str | None = None) -> bytes:
    lines = [ln for ln in csv_path.read_text(encoding="utf-8").splitlines() if ln.strip()]
    if as_of is None:
        m = re.search(r"as of (\d{4}-\d{2}-\d{2})", lines[0])
        as_of = m.group(1) if m else None
    rows = [r for r in csv.DictReader(l for l in lines if not l.startswith("#"))]
    # Sisters side by side (rows are sorted by sky position), so a star's position is written once and then as zeros (the deltas below).
    rows.sort(key=lambda r: (r["ra"], r["dec"], r["hostname"], r["pl_name"]))
    methods: list[str] = []
    spects: list[str] = []
    cols = {k: [] for k in ("ra", "dec", "dist", "rade", "mass", "per", "teff", "srad", "year", "method", "spect")}
    names: list[str] = []
    hosts: dict[str, str] = {}
    for i, r in enumerate(rows):
        ra, dec, dist = _f(r["ra"]), _f(r["dec"]), _f(r["sy_dist"])
        if ra is None or dec is None or dist is None or dist <= 0:
            raise ValueError(f"{r['pl_name']} has no place; the bundled csv never carries one")
        cols["ra"].append(round(ra * 1e6))
        cols["dec"].append(round(dec * 1e6))
        cols["dist"].append(round(dist * 1000))
        cols["rade"].append(_lin(r["pl_rade"], 100))
        cols["mass"].append(_log(r["pl_bmasse"], 10000, 2))
        cols["per"].append(_log(r["pl_orbper"], 6000, 2))
        t = _f(r["st_teff"])
        cols["teff"].append(round(t) if t and t > 0 else 0)
        cols["srad"].append(_lin(r["st_rad"], 100))
        y = _f(r["disc_year"])
        cols["year"].append(round(y) if y else 0)
        m = (r["discoverymethod"] or "").strip()
        if m and m not in methods:
            methods.append(m)
        cols["method"].append(methods.index(m) if m else 255)
        s = (r["st_spectype"] or "").strip()
        if s and s not in spects:
            spects.append(s)
        cols["spect"].append(spects.index(s) if s else NONE16)
        name = r["pl_name"].strip()
        if "\n" in name:
            raise ValueError("a name with a newline")
        names.append(name)
        host = r["hostname"].strip()
        if host != derived_host(name):
            hosts[str(i)] = host
    blob = "\n".join(names).encode("utf-8")
    header = json.dumps({"asOf": as_of, "n": len(rows), "methods": methods, "spects": spects, "hosts": hosts,
                         "namesBytes": len(blob)}, ensure_ascii=False, separators=(",", ":")).encode("utf-8")
    out = bytearray(b"SRXP" + struct.pack("<BBH", 1, 0, len(header)) + header)
    for key in ("ra", "dec", "dist"):
        prev = 0
        for i, v in enumerate(cols[key]):
            cols[key][i] = v - prev
            prev = v
    for key, fmt in (("ra", "i"), ("dec", "i"), ("dist", "i"), ("rade", "H"), ("mass", "H"), ("per", "H"),
                     ("teff", "H"), ("srad", "H"), ("year", "H"), ("method", "B"), ("spect", "H")):
        out += struct.pack(f"<{len(rows)}{fmt}", *cols[key])
    out += blob
    return bytes(out)


def main(argv: list[str]) -> int:
    src = Path(argv[0]) if argv else ROOT / "site/data/exoplanets.csv"
    dest = Path(argv[1]) if len(argv) > 1 else ROOT / "site/data/exoplanets.bin"
    data = pack(src)
    dest.write_bytes(data)
    import gzip
    print(f"exopack: {dest.relative_to(ROOT) if dest.is_relative_to(ROOT) else dest}: {len(data)} B, gzip {len(gzip.compress(data, 9))} B")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
