#!/usr/bin/env python3
"""A deep field (internal spec 0077 W3-f, internal #784's last class): the galaxies Webb's JADES survey catalogued in the Hubble
Ultra Deep Field, each where its redshift puts it, baked into site/data/deep/deepfield.json and site/data/deep/deepfield.bin for
scene/deep/galclusters.js (which draws it as it draws a cluster: an instanced impostor per galaxy, one draw call per slice).

    python3 scripts/build_deep_field.py --fetch [--cache DIR]   # ask VizieR (TAP) for the JADES rows and MUSE's stars
    python3 scripts/build_deep_field.py --bake  [--cache DIR]   # the answers -> the two files
    python3 scripts/build_deep_field.py --check                 # the files are the size and hash the manifest says

THE FIELD. registry/galaxy-clusters.yaml `fields:` (its one row, `hudf`) holds the box on the sky, the cuts and the sources read.
  Members  JADES (Rieke and others 2023, ApJS 269, 16; Eisenstein and others; VizieR V/159), the GOODS-South tables `gssample`
           (position, half-light radius in F090W, the photometric redshift), `gskron` (Kron fluxes in F090W, F200W, F444W) and
           `gsprism` (NIRSpec's spectroscopic redshift and its quality flag), joined on JADES's own ids, in the Hubble Ultra Deep
           Field's box (Rafelski and others 2015's footprint), brighter than the `mag_limit` in F200W.
  Stars    left out: a row within 0.5 arcsec of a star of the MUSE Hubble Ultra Deep Field survey (Bacon and others 2023, A&A 670,
           A4; VizieR J/A+A/670/A4/dr2-main: |z| < 0.01), and any row whose photometric redshift is under 0.02.

WHAT IS MEASURED, WHAT IS MODELLED.
  - DIRECTION: measured (JADES's position).
  - DISTANCE: the COMOVING distance of the galaxy's redshift in the map's one cosmology (Planck 2018, data/cosmology.js; mirrored
    here). The redshift is NIRSpec's where its flag is A or B (`spectroscopic`, flag bit 2), else the photometric one, which is an
    estimate (the 68 % range is in the catalogue): a photometric distance is a measurement with a wide error, said so.
  - SIZE: the half-light radius JADES measured in F090W, as an angle; the impostor's radius in the map is that angle times the
    comoving distance, so FROM THE SUN each galaxy is as wide as Webb saw it (its true width is that over 1 + z; not printed).
  - BRIGHTNESS: the F200W Kron magnitude, turned into the absolute magnitude a galaxy would need to look that bright from the Sun
    at its comoving distance (the quasars' rule): an exposure, not photometry.
  - COLOUR: F090W - F444W as Webb saw it (observed, not rest frame), mapped onto the layer's tint; illustrative.

LICENCES (read 2026-10-20). JADES (VizieR V/159 ReadMe): "These HLSP data products are licensed for use under CC BY 4.0." MUSE
(A&A tables on VizieR, https://cds.unistra.fr/vizier-org/licences_vizier.html): "Tabular data, spectra or images coming from A&A
(J/A+A) are free for a scientific usage", the original authors cited. CREDITS.md section 3l, "A deep field (0077 W3-f)".

FILE. site/data/deep/deepfield.bin: the SRGC rows of build_deep_galclusters.py ("SRGC", u32 version, u32 count, u32 stride 20, then
  f32 ox, oy, oz (million light-years from the slice's centre, sun-inertial axes), f32 re (Mly), i16 absmag * 200, u8 colour,
  u8 flags: bit 0 the distance is its own (always), bit 1 the size is measured, bit 2 the redshift is spectroscopic),
the slices' rows one after another in the manifest's order. FOUR SLICES by redshift (0-1, 1-2, 2-3.5, 3.5 and beyond), each with its
centre at its members' mean place: a slice is at most a few billion light-years deep, so a float32 offset is good to a few hundred
light-years, and a galaxy is tens of thousands across.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import math
import struct
import sys
import urllib.parse
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_deep_galclusters import ARCSEC, MAGIC, STRIDE, ecliptic, http  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
REG = ROOT / "registry"
OUT_JSON = ROOT / "site" / "data" / "deep" / "deepfield.json"
OUT_BIN = ROOT / "site" / "data" / "deep" / "deepfield.bin"
DEFAULT_CACHE = Path.home() / "space-radar-handoff" / "release-1.3" / "w3f" / "cache"
TAP = "https://tapvizier.cds.unistra.fr/TAPVizieR/tap/sync"
ASU = "https://vizier.cds.unistra.fr/viz-bin/asu-tsv"
READ_ON = "2026-10-20"
VERSION = 1
SLICES = (0.0, 1.0, 2.0, 3.5, 99.0)
STAR_ARCSEC = 0.5

# Planck 2018 as data/cosmology.js holds it (Astropy's Planck18): H0, cold matter and baryons, one 0.06 eV neutrino counted with
# the matter (it is non-relativistic at every redshift drawn here), photons and two massless neutrinos as radiation.
H0, OM_CB, OM_NU, T_CMB, NEFF = 67.66, 0.30966, 0.0014, 2.7255, 3.046
C_KMS, MPC_LY = 299792.458, 3.261563777167433e6
_h = H0 / 100.0
OM_G = 2.4728e-5 * (T_CMB / 2.7255) ** 4 / (_h * _h)          # photons
OM_R = OM_G * (1 + 0.22710731766 * NEFF * 2.0 / 3.0)          # and the two massless neutrinos
OM_M = OM_CB + OM_NU
OM_L = 1.0 - OM_M - OM_R


def comoving_ly(z: float) -> float:
    """Light-years now to a redshift (flat space), Simpson in s = sqrt(a) as data/cosmology.js does."""
    if z <= 0:
        return 0.0
    n = 400
    s0, s1 = 1.0 / math.sqrt(1.0 + z), 1.0

    def f(s):  # dz/E(z) in s: z = 1/s^2 - 1, dz = -2/s^3 ds
        a = s * s
        e = math.sqrt(OM_M / a ** 3 + OM_R / a ** 4 + OM_L)
        return 2.0 / (s ** 3) / e

    h = (s1 - s0) / n
    tot = f(s0) + f(s1) + sum((4 if i % 2 else 2) * f(s0 + i * h) for i in range(1, n))
    return (C_KMS / H0) * tot * h / 3.0 * MPC_LY


_TABLE = {}


def comoving_table(z: float) -> float:
    """comoving_ly by a table of 0.002 in redshift (linear between: under a light-year in a billion off)."""
    if not _TABLE:
        _TABLE["dz"] = 0.002
        _TABLE["v"] = [comoving_ly(i * 0.002) for i in range(0, 12001)]
    k = min(len(_TABLE["v"]) - 2, max(0, int(z / _TABLE["dz"])))
    t = z / _TABLE["dz"] - k
    return _TABLE["v"][k] * (1 - t) + _TABLE["v"][k + 1] * t


def registry_row() -> dict:
    import yaml
    reg = yaml.safe_load((REG / "galaxy-clusters.yaml").read_text())
    rows = reg.get("fields") or []
    if len(rows) != 1 or rows[0].get("id") != "hudf":
        raise SystemExit("registry/galaxy-clusters.yaml: `fields:` must hold the one row `hudf`")
    return rows[0]


def adql(row: dict) -> str:
    b = row["box"]
    return (
        'SELECT s.NIRCamID, s.RA_ICRS, s.DE_ICRS, s.rhF090W, s.zphot, s.zphotl68, s.zphotu68, '
        'k.F090Wkron, k.F200Wkron, k.F444Wkron, p.zspec, p.f_zspec '
        'FROM "V/159/gssample" s JOIN "V/159/gskron" k ON s.ID = k.ID '
        'LEFT OUTER JOIN "V/159/gsprism" p ON p.NIRCamID = s.NIRCamID '
        f"WHERE s.RA_ICRS BETWEEN {b['ra_min']} AND {b['ra_max']} AND s.DE_ICRS BETWEEN {b['dec_min']} AND {b['dec_max']} "
        f"AND k.F200Wkron > {10 ** ((31.4 - row['mag_limit']) / 2.5):.4f}"
    )


def fetch(cache: Path) -> None:
    row = registry_row()
    cache.mkdir(parents=True, exist_ok=True)
    q = urllib.parse.urlencode({"REQUEST": "doQuery", "LANG": "ADQL", "FORMAT": "tsv", "MAXREC": "200000", "QUERY": adql(row)})
    (cache / "jades-hudf.tsv").write_text(http(TAP + "?" + q))
    (cache / "muse-hudf.tsv").write_text(http(ASU + "?" + urllib.parse.urlencode({
        "-source": "J/A+A/670/A4/dr2-main", "-out.max": "unlimited", "-out": "ID,RAJ2000,DEJ2000,z,zconf"}, safe=",/+")))
    print("  fetched JADES and MUSE rows into", cache)


def table(text: str) -> list[dict]:
    lines = [ln for ln in text.splitlines() if ln.strip() and not ln.startswith("#")]
    head = [h.strip().strip('"') for h in lines[0].split("\t")]
    out = []
    for ln in lines[1:]:
        cells = ln.split("\t")
        if len(cells) < len(head) or set(cells[0]) <= set("-"):
            continue
        out.append({h: c.strip() for h, c in zip(head, cells)})
    return out


def num(s):
    try:
        v = float(s)
        return v if math.isfinite(v) else None
    except (TypeError, ValueError):
        return None


def nj_mag(f):
    return 31.4 - 2.5 * math.log10(f) if f and f > 0 else None


def members(cache: Path, row: dict):
    jades = table((cache / "jades-hudf.tsv").read_text())
    muse = table((cache / "muse-hudf.tsv").read_text())
    stars = [ecliptic(float(r["RAJ2000"]), float(r["DEJ2000"])) for r in muse if num(r.get("z")) is not None and abs(num(r["z"])) < 0.01]
    cut = math.cos(STAR_ARCSEC * ARCSEC)
    best = {}
    rank = {"A": 0, "B": 1}
    for r in jades:
        key = r["NIRCamID"]
        flag = (r.get("f_zspec") or "").strip()
        zs = num(r.get("zspec"))
        good = zs if (zs is not None and flag in rank) else None
        old = best.get(key)
        if old is None or (good is not None and (old["zs"] is None or rank[flag] < rank.get(old["flag"], 9))):
            best[key] = {"r": r, "zs": good, "flag": flag if good is not None else ""}
    out, dropped = [], {"star": 0, "noRedshift": 0, "noFlux": 0}
    for key, b in best.items():
        r = b["r"]
        ra, dec = float(r["RA_ICRS"]), float(r["DE_ICRS"])
        d = ecliptic(ra, dec)
        if any(d[0] * s[0] + d[1] * s[1] + d[2] * s[2] > cut for s in stars):
            dropped["star"] += 1
            continue
        z = b["zs"] if b["zs"] is not None else num(r.get("zphot"))
        if z is None or z < 0.02:
            dropped["noRedshift" if z is None else "star"] += 1
            continue
        m200 = nj_mag(num(r.get("F200Wkron")))
        if m200 is None:
            dropped["noFlux"] += 1
            continue
        m090, m444 = nj_mag(num(r.get("F090Wkron"))), nj_mag(num(r.get("F444Wkron")))
        out.append({"key": key, "ra": ra, "dec": dec, "dir": d, "z": z, "spec": b["zs"] is not None, "rh": num(r.get("rhF090W")) or 0.0,
                    "mag": m200, "colour": (m090 - m444) if (m090 is not None and m444 is not None) else None})
    return out, dropped


def colour_code(c):
    """F090W - F444W (observed) onto the layer's tint (galclusters.js colourOf reads a g - r code): blue to red, illustrative."""
    if c is None:
        return 0
    gr = max(0.0, min(1.0, 0.3 + 0.25 * c))
    return max(1, min(255, round((gr + 0.2) * 100)))


def bake(cache: Path):
    row = registry_row()
    mem, dropped = members(cache, row)
    for m in mem:
        m["dly"] = comoving_table(m["z"])
    infos, blobs = [], bytearray()
    for k in range(len(SLICES) - 1):
        lo, hi = SLICES[k], SLICES[k + 1]
        part = sorted((m for m in mem if lo <= m["z"] < hi), key=lambda m: m["dly"])
        if not part:
            continue
        pts = [tuple(m["dir"][i] * m["dly"] / 1e6 for i in range(3)) for m in part]
        C = tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))
        cn = math.sqrt(sum(c * c for c in C))
        body = bytearray()
        far = 0.0
        spec = sized = 0
        for m, p in zip(part, pts):
            off = (p[0] - C[0], p[1] - C[1], p[2] - C[2])
            far = max(far, math.sqrt(sum(o * o for o in off)))
            flags = 1
            re_mly = 0.0
            if m["rh"] > 0:
                re_mly = m["rh"] * ARCSEC * m["dly"] / 1e6
                flags |= 2
                sized += 1
            if m["spec"]:
                flags |= 4
                spec += 1
            am = m["mag"] - 5.0 * math.log10(m["dly"] / 3.261563777167433 / 10.0)
            body += struct.pack("<ffffhBB", off[0], off[1], off[2], re_mly, max(-32000, min(32000, round(am * 200))), colour_code(m["colour"]), flags)
        sid = f"hudf-{k + 1}"
        infos.append({
            "id": sid, "field": "hudf", "name": f"{row['name']}, redshift {lo:g} to {hi:g}" if hi < 90 else f"{row['name']}, redshift {lo:g} and beyond",
            "count": len(part), "offset": len(blobs) // STRIDE,
            "centre": {"dir": [round(c / cn, 8) for c in C], "note": "the mean place of the slice's members"},
            "distMly": round(cn, 3), "radiusMly": round(far, 3),
            "z": [round(part[0]["z"], 3), round(part[-1]["z"], 3)], "distMlyRange": [round(part[0]["dly"] / 1e6, 1), round(part[-1]["dly"] / 1e6, 1)],
            "spectroscopic": spec, "sized": sized,
        })
        blobs += body
    head = struct.pack("<4sIII", MAGIC, VERSION, len(blobs) // STRIDE, STRIDE)
    binary = head + bytes(blobs)
    man = {
        "version": VERSION, "built": READ_ON, "stride": STRIDE, "count": len(blobs) // STRIDE,
        "bin": {"bytes": len(binary), "sha256": hashlib.sha256(binary).hexdigest()},
        "field": {k: row[k] for k in ("id", "name", "box", "mag_limit", "catalogue", "source")},
        "dropped": dropped,
        "cosmology": "Planck 2018 as data/cosmology.js (Astropy's Planck18): comoving distance now",
        "rules": {
            "distance": "the comoving distance of the redshift: NIRSpec's (flag A or B) where there is one, else JADES's photometric estimate",
            "size": "the half-light radius in F090W as an angle, times the comoving distance: as wide from the Sun as Webb saw it",
            "brightness": "F200W Kron, as the absolute magnitude that looks that bright from the Sun at that distance: an exposure, not photometry",
            "colour": "F090W - F444W as observed, mapped onto a blue-to-red tint: illustrative",
        },
        "licence": "JADES (VizieR V/159): CC BY 4.0. MUSE (VizieR J/A+A/670/A4): free for scientific usage, the authors cited",
        "slices": infos,
    }
    return man, binary


def write(man, binary):
    OUT_BIN.parent.mkdir(parents=True, exist_ok=True)
    OUT_BIN.write_bytes(binary)
    OUT_JSON.write_text(json.dumps(man, indent=1) + "\n")


def check() -> int:
    if not OUT_JSON.exists() or not OUT_BIN.exists():
        print("deepfield: the files are missing", file=sys.stderr)
        return 1
    man = json.loads(OUT_JSON.read_text())
    b = OUT_BIN.read_bytes()
    problems = []
    magic, version, count, stride = struct.unpack_from("<4sIII", b, 0)
    if magic != MAGIC or version != VERSION or stride != STRIDE:
        problems.append(f"the bin's head is {magic!r} v{version} stride {stride}")
    if len(b) != 16 + count * stride or man["bin"]["bytes"] != len(b) or man["count"] != count:
        problems.append(f"the bin is {len(b)} bytes for {count} rows; the manifest says {man['bin']['bytes']}")
    if hashlib.sha256(b).hexdigest() != man["bin"]["sha256"]:
        problems.append("the bin's sha256 is not the manifest's")
    if sum(s["count"] for s in man["slices"]) != count:
        problems.append("the slices' counts do not add up to the bin's")
    try:
        if registry_row()["id"] != man["field"]["id"]:
            problems.append("the field is not the registry's")
    except ImportError:
        pass
    if problems:
        print("deepfield: " + "; ".join(problems), file=sys.stderr)
        return 1
    print(f"deepfield ok: {len(man['slices'])} slices, {count} galaxies, {len(b)} bytes")
    return 0


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--fetch", action="store_true")
    ap.add_argument("--bake", action="store_true")
    ap.add_argument("--check", action="store_true")
    ap.add_argument("--cache", type=Path, default=DEFAULT_CACHE)
    a = ap.parse_args(argv)
    if a.fetch:
        fetch(a.cache)
    if a.bake:
        man, binary = bake(a.cache)
        write(man, binary)
        for s in man["slices"]:
            print(f"  {s['id']}: {s['count']} galaxies, z {s['z'][0]} to {s['z'][1]}, {s['distMlyRange'][0]} to {s['distMlyRange'][1]} Mly, "
                  f"{s['spectroscopic']} spectroscopic, radius {s['radiusMly']} Mly")
        print(f"deepfield: {man['count']} galaxies, {len(binary)} bytes; left out {man['dropped']}")
    if a.check or not (a.fetch or a.bake):
        return check()
    return 0


if __name__ == "__main__":
    sys.exit(main())
