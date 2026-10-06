#!/usr/bin/env python3
"""Build what the sky from the ground draws beyond its own stars and lines (internal #354, #355, #383).

    python3 scripts/build-skycultures.py --stellarium DIR --hyg hyg_v44.csv[.gz] --bounds constbnd.dat
    python3 scripts/build-skycultures.py --check        the files are there, whole, and inside their budgets

WHAT IT WRITES
  site/data/skyart/<name>.webp     the 85 figures of Stellarium's "modern" sky culture, drawn by Johan
                                   Meuris, Free Art License. Each is the original PNG re-encoded as a
                                   WebP at its own size (128, 256 or 512 px square), nothing redrawn.
  site/data/skyart/index.json      which constellation each belongs to and the three stars that pin it:
                                   [u, v, raDeg, decDeg] with u, v from the picture's top left corner.
  site/data/skyart/LICENSE.txt     the notice the Free Art License asks for: the author, where the
                                   originals are, what was changed, and where the licence is.
  site/data/constellation-bounds.bin   the IAU boundaries (Delporte 1930) from CDS catalogue VI/49
                                   (Davenhall and Leggett 1989), file constbnd.dat: each border once,
                                   cut into steps of at most one degree along its B1875 meridian or
                                   parallel and precessed to J2000.
  site/data/skycultures/<id>.json  the line figures and names of the sky cultures registry/skycultures.yaml
                                   lists, from Stellarium's index.json for each, with every Hipparcos
                                   number turned into a J2000 place from HYG v4.4.

INPUTS (none is in the repository; the registry row says where each was read and at which commit)
  --stellarium DIR   a folder holding  modern/index.json, modern/illustrations/*.png and
                     <culture>/index.json for every `stellarium:` folder the registry names
  --hyg FILE         HYG v4.4 (https://codeberg.org/astronexus/hyg, CC BY-SA 4.0), .csv or .csv.gz
  --bounds FILE      constbnd.dat from https://cdsarc.cds.unistra.fr/ftp/VI/49/

BOUNDARY FORMAT (little-endian): 'SRCB', u16 version=1, u16 polyline count, then for each polyline
  u16 point count, and for each point  u16 ra = round(raDeg / 360 * 65536) mod 65536,
  i16 dec = round(decDeg / 90 * 32767).  A step is 20 arcseconds, a tenth of a pixel at a 1 degree field.
"""
from __future__ import annotations

import argparse
import csv
import gzip
import io
import json
import math
import struct
import sys
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site" / "data"
ART_DIR = SITE / "skyart"
CULT_DIR = SITE / "skycultures"
BOUNDS = SITE / "constellation-bounds.bin"
REGISTRY = ROOT / "registry" / "skycultures.yaml"

ART_MAX_BYTES = 40_000          # each picture
ART_TOTAL_BYTES = 2_500_000     # all of them
STEP_DEG = 1.0

LICENSE_TXT = """Constellation figures in this folder (*.webp)
=============================================

Author of the originals: Johan Meuris (http://www.johanmeuris.eu/), drawn for Stellarium.
Originals: https://github.com/Stellarium/stellarium/tree/{commit}/skycultures/modern/illustrations
           (85 PNG files; Stellarium's description of the sky culture says "Illustrations: Free Art
           License", and its CREDITS.md says "Constellation art ... created by Johan Meuris ...
           License: released under the Free Art License").
Modified by: the Space Radar contributors, {date}. What was changed: each PNG was re-encoded as a
           WebP at its original pixel size (scripts/build-skycultures.py). Nothing was redrawn,
           cropped or recoloured. index.json beside them repeats, as sky coordinates, the three
           anchor stars Stellarium's index.json gives for each picture (text and data: CC BY-SA 4.0).

Copyleft: these are free works, you can copy, distribute, and modify them under the terms of the
Free Art License https://artlibre.org/licence/lal/en/

These files, and anything made from them, stay under the Free Art License. The MIT licence of
Space Radar's code does not apply to them.
"""


def unit(ra_deg: float, dec_deg: float) -> tuple:
    ra, dec = math.radians(ra_deg), math.radians(dec_deg)
    c = math.cos(dec)
    return (c * math.cos(ra), c * math.sin(ra), math.sin(dec))


def radec(v) -> tuple:
    n = math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2)
    return (math.degrees(math.atan2(v[1], v[0])) % 360.0, math.degrees(math.asin(max(-1.0, min(1.0, v[2] / n)))))


def read_hyg(path: Path) -> dict:
    opener = gzip.open if str(path).endswith(".gz") else open
    out = {}
    with opener(path, "rt", encoding="utf-8", newline="") as fh:
        for row in csv.DictReader(fh):
            hip = row.get("hip")
            if not hip:
                continue
            out[int(hip)] = (float(row["ra"]) * 15.0, float(row["dec"]))
    return out


# ---------------------------------------------------------------------------- the boundaries

def precession_b1875_to_j2000():
    """IAU 1976 precession (Lieske 1979) from the mean equator of B1875.0 to J2000.0, as a matrix."""
    jd = 2415020.31352 + (1875.0 - 1900.0) * 365.242198781
    t = (jd - 2451545.0) / 36525.0
    arc = math.radians(1 / 3600.0)
    zeta = (2306.2181 * t + 0.30188 * t * t + 0.017998 * t ** 3) * arc
    z = (2306.2181 * t + 1.09468 * t * t + 0.018203 * t ** 3) * arc
    theta = (2004.3109 * t - 0.42665 * t * t - 0.041833 * t ** 3) * arc
    cz, sz, cth, sth, cze, sze = math.cos(z), math.sin(z), math.cos(theta), math.sin(theta), math.cos(zeta), math.sin(zeta)
    # J2000 -> date
    p = [
        [cz * cth * cze - sz * sze, -cz * cth * sze - sz * cze, -cz * sth],
        [sz * cth * cze + cz * sze, -sz * cth * sze + cz * cze, -sz * sth],
        [sth * cze, -sth * sze, cth],
    ]
    # date -> J2000 is the transpose
    return [[p[0][0], p[1][0], p[2][0]], [p[0][1], p[1][1], p[2][1]], [p[0][2], p[1][2], p[2][2]]]


def build_bounds(path: Path) -> bytes:
    m = precession_b1875_to_j2000()
    to2000 = lambda ra, dec: radec([sum(m[i][k] * v for k, v in enumerate(unit(ra, dec))) for i in range(3)])
    rows = []
    for line in path.read_text(encoding="ascii").splitlines():
        if not line.strip():
            continue
        rows.append((float(line[0:8]) * 15.0, float(line[9:18]), line[19:23].strip().upper(), line[24:28].strip().upper()))
    polylines = []
    seen = set()
    for a, b in zip(rows, rows[1:]):
        if b[2] != a[2] or not b[3]:
            continue  # the first row of a constellation is its origin, not a segment
        key = tuple(sorted([(round(a[0], 4), round(a[1], 4)), (round(b[0], 4), round(b[1], 4))]))
        if key in seen:
            continue  # the same border, written again from the neighbour's side
        seen.add(key)
        d_ra = b[0] - a[0]
        if d_ra > 180:
            d_ra -= 360
        if d_ra < -180:
            d_ra += 360
        d_dec = b[1] - a[1]
        span = max(abs(d_ra) * math.cos(math.radians((a[1] + b[1]) / 2)), abs(d_dec))
        n = max(1, int(math.ceil(span / STEP_DEG)))
        polylines.append([to2000((a[0] + d_ra * i / n) % 360.0, a[1] + d_dec * i / n) for i in range(n + 1)])
    out = io.BytesIO()
    out.write(b"SRCB" + struct.pack("<HH", 1, len(polylines)))
    for pl in polylines:
        out.write(struct.pack("<H", len(pl)))
        for ra, dec in pl:
            out.write(struct.pack("<Hh", int(round(ra / 360.0 * 65536)) % 65536, int(round(dec / 90.0 * 32767))))
    return out.getvalue()


def read_bounds(buf: bytes) -> list:
    if buf[:4] != b"SRCB":
        raise ValueError("not a boundary file")
    _, count = struct.unpack_from("<HH", buf, 4)
    o, out = 8, []
    for _ in range(count):
        (n,) = struct.unpack_from("<H", buf, o)
        o += 2
        pts = []
        for _ in range(n):
            ra, dec = struct.unpack_from("<Hh", buf, o)
            o += 4
            pts.append((ra / 65536 * 360, dec / 32767 * 90))
        out.append(pts)
    if o != len(buf):
        raise ValueError("boundary file has trailing bytes")
    return out


# ---------------------------------------------------------------------------- the pictures

def build_art(stellarium: Path, hip: dict, commit: str, date: str) -> dict:
    from PIL import Image

    index = json.loads((stellarium / "modern" / "index.json").read_text(encoding="utf-8"))
    ART_DIR.mkdir(parents=True, exist_ok=True)
    for old in ART_DIR.glob("*.webp"):
        old.unlink()
    figures, written = [], {}
    for con in index["constellations"]:
        img = con.get("image")
        if not img:
            continue
        cid = con["id"].split()[-1]
        src = stellarium / "modern" / img["file"]
        name = Path(img["file"]).stem + ".webp"
        w, h = img["size"]
        if name not in written:
            im = Image.open(src)
            if im.size != (w, h):
                raise SystemExit(f"{src}: is {im.size}, index.json says {(w, h)}")
            im = im.convert("RGB")
            for quality in (82, 74, 66, 58, 50, 42):
                buf = io.BytesIO()
                im.save(buf, "WEBP", quality=quality, method=6)
                if buf.tell() <= ART_MAX_BYTES:
                    break
            else:
                raise SystemExit(f"{name}: over {ART_MAX_BYTES} bytes at every quality tried")
            (ART_DIR / name).write_bytes(buf.getvalue())
            written[name] = buf.tell()
        anchors = []
        for a in img["anchors"]:
            if a["hip"] not in hip:
                raise SystemExit(f"{cid}: anchor HIP {a['hip']} is not in HYG")
            ra, dec = hip[a["hip"]]
            anchors.append([round(a["pos"][0] / w, 5), round(a["pos"][1] / h, 5), round(ra, 4), round(dec, 4)])
        figures.append({"id": cid, "file": name, "px": w, "anchors": anchors})
    doc = {
        "author": "Johan Meuris",
        "licence": "Free Art License 1.3",
        "licenceUrl": "https://artlibre.org/licence/lal/en/",
        "source": f"https://github.com/Stellarium/stellarium/tree/{commit}/skycultures/modern",
        "changed": "re-encoded from PNG to WebP at the original size",
        "figures": figures,
    }
    (ART_DIR / "index.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    (ART_DIR / "LICENSE.txt").write_text(LICENSE_TXT.format(commit=commit, date=date), encoding="utf-8")
    return {"files": len(written), "bytes": sum(written.values()), "max": max(written.values()), "figures": len(figures)}


# ---------------------------------------------------------------------------- the cultures

def build_culture(row: dict, stellarium: Path, hip: dict) -> dict:
    index = json.loads((stellarium / row["stellarium"] / "index.json").read_text(encoding="utf-8"))
    figures, dropped = [], 0
    for con in index["constellations"]:
        lines, stars = [], []
        for line in con.get("lines") or []:
            run = []
            for p in line:
                if isinstance(p, int) and p in hip:
                    ra, dec = hip[p]
                    run.append(round(ra, 3))
                    run.append(round(dec, 3))
                    stars.append(unit(ra, dec))
                else:
                    # A Gaia number or a cluster: not in HYG. The line is cut there, not bent past it.
                    dropped += 1
                    if len(run) >= 4:
                        lines.append(run)
                    run = []
            if len(run) >= 4:
                lines.append(run)
        if not lines:
            continue
        cx = [sum(s[i] for s in stars) / len(stars) for i in range(3)]
        ra, dec = radec(cx)
        name = con.get("common_name") or {}
        fig = {"name": name.get("english") or name.get("native") or "", "at": [round(ra, 2), round(dec, 2)], "lines": lines}
        native = name.get("native") or ""
        if native and native != fig["name"]:
            fig["native"] = native
        if name.get("pronounce"):
            fig["say"] = name["pronounce"]
        figures.append(fig)
    doc = {
        "id": row["id"],
        "source": row["source"],
        "licence": row["licence"],
        "credit": row["credit"],
        "figures": figures,
    }
    CULT_DIR.mkdir(parents=True, exist_ok=True)
    out = CULT_DIR / f"{row['id']}.json"
    out.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    return {"id": row["id"], "figures": len(figures), "dropped": dropped, "bytes": out.stat().st_size}


# ---------------------------------------------------------------------------- check

def check() -> int:
    bad = []
    reg = yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))
    art = json.loads((ART_DIR / "index.json").read_text(encoding="utf-8"))
    files = sorted(p.name for p in ART_DIR.glob("*.webp"))
    named = sorted({f["file"] for f in art["figures"]})
    if files != named:
        bad.append(f"skyart: {len(files)} pictures on disk, {len(named)} named by index.json")
    sizes = [(ART_DIR / f).stat().st_size for f in files]
    if sizes and max(sizes) > ART_MAX_BYTES:
        bad.append(f"skyart: a picture of {max(sizes)} bytes, over {ART_MAX_BYTES}")
    if sum(sizes) > ART_TOTAL_BYTES:
        bad.append(f"skyart: {sum(sizes)} bytes in all, over {ART_TOTAL_BYTES}")
    if len(art["figures"]) != 85:
        bad.append(f"skyart: {len(art['figures'])} constellations have a picture, not the 85 Stellarium draws (Argo Navis is one picture for Carina, Puppis and Vela; Serpens has none)")
    notice = (ART_DIR / "LICENSE.txt").read_text(encoding="utf-8")
    for needle in ("Johan Meuris", "Free Art License", "https://artlibre.org/licence/lal/en/", "re-encoded", "github.com/Stellarium/stellarium"):
        if needle not in notice:
            bad.append(f"skyart/LICENSE.txt does not say {needle!r}")
    lines = read_bounds(BOUNDS.read_bytes())
    if not 700 <= len(lines) <= 900:
        bad.append(f"constellation-bounds.bin: {len(lines)} borders; VI/49 has about 780")
    for row in reg["cultures"]:
        if row["id"] == "western":
            continue
        doc = json.loads((CULT_DIR / f"{row['id']}.json").read_text(encoding="utf-8"))
        if doc["licence"] != row["licence"] or doc["credit"] != row["credit"]:
            bad.append(f"skycultures/{row['id']}.json does not carry the registry's licence and credit")
        if len(doc["figures"]) < 4:
            bad.append(f"skycultures/{row['id']}.json has {len(doc['figures'])} figures")
    credits = (ROOT / "CREDITS.md").read_text(encoding="utf-8")
    for row in reg["cultures"]:
        if row["credit"] not in credits:
            bad.append(f"CREDITS.md does not carry the credit of `{row['id']}`: {row['credit']!r}")
    for b in bad:
        print("FAIL " + b)
    print(f"{'ok' if not bad else 'FAILED'}: {len(files)} pictures, {sum(sizes)} bytes; {len(lines)} borders; {len(reg['cultures'])} cultures")
    return 1 if bad else 0


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--stellarium")
    ap.add_argument("--hyg")
    ap.add_argument("--bounds")
    args = ap.parse_args()
    if args.check:
        return check()
    if not (args.stellarium and args.hyg and args.bounds):
        ap.error("--stellarium, --hyg and --bounds are all needed to build")
    reg = yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))
    hip = read_hyg(Path(args.hyg))
    print("art", build_art(Path(args.stellarium), hip, reg["stellarium_commit"], str(reg["read_on"])))
    data = build_bounds(Path(args.bounds))
    BOUNDS.write_bytes(data)
    print("bounds", len(read_bounds(data)), "borders,", len(data), "bytes")
    for row in reg["cultures"]:
        if row["id"] != "western":
            print("culture", build_culture(row, Path(args.stellarium), hip))
    return 0


if __name__ == "__main__":
    sys.exit(main())
