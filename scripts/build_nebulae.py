#!/usr/bin/env python3
"""The photographs of the nebulae and galaxies (spec 0067): one small WebP per row of
registry/nebulae.yaml, site/images/nebulae/<id>.webp, laid on the sky by scene/nebulae.js.

    $PY scripts/build_nebulae.py [--only=id] [--cache=dir]   fetch and bake (PIL, PyYAML)
    $PY scripts/build_nebulae.py --solve [--only=id]         where each picture really is (numpy too)
    python3 scripts/build_nebulae.py --check                 stdlib only: what CI runs

WHERE THE PICTURES COME FROM. The outreach archives of ESA/Hubble, ESO and NOIRLab, whose terms
release their images under CC BY 4.0 (registry/nebulae.yaml `archives:` holds each terms page and
the day it was read). The registry row names the archive and the image id; this script downloads
the archive's own "screen" rendition (1280 px wide, a few hundred kB) and never a survey: the
Digitized Sky Survey and Mellinger's panorama are not ours to redistribute, and check_registry.py
refuses a credit that names either.

WHAT THE BAKE DOES, AND WHY.
  1. Resizes so the longer side is the row's `px` (512 unless it says otherwise).
  2. Takes the picture's own sky to black: per channel, the level below which the darkest 4 % of a
     64 px thumbnail lies is subtracted and the rest rescaled, so white stays white. The pictures
     are ADDED to the sky; a photograph's grey-brown sky glow added to ours would draw its frame.
  3. Encodes WebP at the highest quality that fits `nebula_picture_bytes` (registry/budgets.yaml).
The edge is NOT feathered here: the shader does it after the exposure's stretch (scene/nebulae.js
FRAG), so the "Deep" setting cannot lift a baked-in ramp back into a visible frame.

WHERE EACH PICTURE REALLY IS (--solve). The archives publish a centre, a field of view and an
orientation for each image. The field and the orientation held for every picture tried; the
CENTRE did not: 15 of the 31 tried were more than an arcminute off, the Rosette by 21' and the
Cygnus Loop by 43' (2026-10-03). So the registry's ra_deg/dec_deg are measured, not copied: --solve lays each
picture over a 2MASS cut-out of the same field (CDS hips2fits, fetched for the comparison and not
kept), finds the shift, scale and turn that correlate best, and prints the row's numbers with the
correlation of the solution, of its mirror image and of the published values. A picture whose
mirror correlates as well as itself is not placed (the Local Group Survey's M31 strip and Hubble's
M82 were dropped for that). 2MASS is infrared, so it matches on stars and not on gas, which is the point.

WHY --check NEEDS NOTHING INSTALLED. CI's registry job has PyYAML and nothing else, so the check
reads the registry with a regex and the WebP header by hand (as scripts/build_trip_thumbs.py
does). It refuses a row without its file, a file for no row, a file that is not a WebP, a longer
side that is not the row's `px`, a file over `nebula_picture_bytes` and a total over
`nebulae_total_bytes`.
"""

from __future__ import annotations

import io
import math
import re
import struct
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
REGISTRY = ROOT / "registry" / "nebulae.yaml"
BUDGETS = ROOT / "registry" / "budgets.yaml"
OUT = ROOT / "site" / "images" / "nebulae"
DEFAULT_PX = 512
QUALITIES = range(84, 39, -4)
UA = "space-radar-build (+https://spaceradar.ai)"
HIPS2FITS = "https://alasky.cds.unistra.fr/hips-image-services/hips2fits"


def arg(name: str, default: str = "") -> str:
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a[len(name) + 3:]
    return default


def budget(row_id: str) -> int:
    m = re.search(r"\{id:\s*" + re.escape(row_id) + r",\s*value:\s*(\d+)", BUDGETS.read_text(encoding="utf-8"))
    if not m:
        raise SystemExit(f"registry/budgets.yaml has no {row_id} row")
    return int(m.group(1))


def rows_plain() -> list[dict]:
    """id, px and file per picture, without PyYAML: every `  - id:` under `pictures:` and the
    `px:` / `file:` lines that follow it."""
    out, inside, cur = [], False, None
    for line in REGISTRY.read_text(encoding="utf-8").splitlines():
        if re.match(r"^pictures:\s*$", line):
            inside = True
            continue
        if inside and re.match(r"^\S", line) and not line.startswith("#"):
            break
        if not inside:
            continue
        m = re.match(r"^  - id:\s*([\w-]+)\s*$", line)
        if m:
            cur = {"id": m.group(1), "px": DEFAULT_PX, "file": f"site/images/nebulae/{m.group(1)}.webp"}
            out.append(cur)
            continue
        m = re.match(r"^    (px|file):\s*(\S+)\s*$", line)
        if m and cur is not None:
            cur[m.group(1)] = int(m.group(2)) if m.group(1) == "px" else m.group(2)
    return out


def webp_size(data: bytes) -> tuple[int, int] | None:
    """(width, height) from a WebP's first chunk, or None when it is not one. RFC 9649 §2.5-2.7."""
    if len(data) < 30 or data[:4] != b"RIFF" or data[8:12] != b"WEBP":
        return None
    kind, body = data[12:16], data[20:]
    if kind == b"VP8 " and body[3:6] == b"\x9d\x01\x2a":
        w, h = struct.unpack("<HH", body[6:10])
        return w & 0x3FFF, h & 0x3FFF
    if kind == b"VP8L" and body[0] == 0x2F:
        bits = int.from_bytes(body[1:5], "little")
        return (bits & 0x3FFF) + 1, ((bits >> 14) & 0x3FFF) + 1
    if kind == b"VP8X":
        return int.from_bytes(body[4:7], "little") + 1, int.from_bytes(body[7:10], "little") + 1
    return None


def check() -> int:
    problems = []
    rows = rows_plain()
    each, total_limit = budget("nebula_picture_bytes"), budget("nebulae_total_bytes")
    if not rows:
        problems.append("registry/nebulae.yaml: no pictures found")
    total = 0
    files = set()
    for r in rows:
        path = ROOT / r["file"]
        files.add(path.resolve())
        rel = r["file"]
        if not path.exists():
            problems.append(f"{rel}: missing; {r['id']} would have no picture (scripts/build_nebulae.py --only={r['id']})")
            continue
        data = path.read_bytes()
        total += len(data)
        size = webp_size(data)
        if size is None:
            problems.append(f"{rel}: not a WebP")
        elif max(size) != r["px"]:
            problems.append(f"{rel}: {size[0]} x {size[1]}, but the row's longer side is px: {r['px']}")
        if len(data) > each:
            problems.append(f"{rel}: {len(data)} B, over nebula_picture_bytes ({each} B)")
    if total > total_limit:
        problems.append(f"site/images/nebulae: {total} B in all, over nebulae_total_bytes ({total_limit} B)")
    for path in sorted(OUT.glob("*")) if OUT.exists() else []:
        if path.resolve() not in files:
            problems.append(f"{path.relative_to(ROOT)}: no row of registry/nebulae.yaml names it")
    if problems:
        print("nebula pictures FAILED:\n  " + "\n  ".join(problems))
        return 1
    print(f"nebula pictures ok: {len(rows)} WebPs, {total} B in all (limit {total_limit}), each under {each} B")
    return 0


# ------------------------------------------------------------------------------- fetch and bake

def registry() -> dict:
    import yaml
    return yaml.safe_load(REGISTRY.read_text(encoding="utf-8"))


def fetch(url: str, timeout: int = 90) -> bytes:
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def source_image(doc: dict, row: dict, cache: Path | None):
    """The archive's screen rendition of the row's image, as a PIL image; cached when asked."""
    from PIL import Image

    archive = doc["archives"][row["archive"]]
    url = archive["screen"].replace("{image}", row["image"])
    path = cache / f"{row['image']}.jpg" if cache else None
    if path and path.exists():
        data = path.read_bytes()
    else:
        data = fetch(url)
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    return Image.open(io.BytesIO(data)).convert("RGB")


def sky_level(im) -> tuple[int, int, int]:
    """Per channel, the value under which the darkest 4 % of a 64 px thumbnail lies: the picture's
    own sky. A thumbnail, so that single dark pixels (and JPEG ringing beside stars) do not vote."""
    small = im.copy()
    small.thumbnail((64, 64))
    out = []
    for band in small.split():
        hist = band.histogram()
        need, seen = 0.04 * sum(hist), 0
        level = 0
        for v, n in enumerate(hist):
            seen += n
            if seen >= need:
                level = v
                break
        out.append(min(level, 96))
    return tuple(out)


def bake(im, px: int):
    from PIL import Image

    w, h = im.size
    k = px / max(w, h)
    im = im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)
    bands = []
    for band, level in zip(im.split(), sky_level(im)):
        gain = 255.0 / (255 - level)
        bands.append(band.point([max(0, min(255, round((v - level) * gain))) for v in range(256)]))
    return Image.merge("RGB", bands)


def encode(im, limit: int) -> tuple[bytes, int]:
    for q in QUALITIES:
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=6)
        if buf.tell() <= limit:
            return buf.getvalue(), q
    raise SystemExit(f"a {im.size[0]} x {im.size[1]} picture does not fit {limit} B even at quality {QUALITIES[-1]}: lower its px")


def build() -> int:
    doc = registry()
    only = arg("only")
    cache = Path(arg("cache")) if arg("cache") else None
    limit = budget("nebula_picture_bytes")
    OUT.mkdir(parents=True, exist_ok=True)
    for row in doc["pictures"]:
        if only and row["id"] != only:
            continue
        im = bake(source_image(doc, row, cache), int(row.get("px", DEFAULT_PX)))
        data, q = encode(im, limit)
        (ROOT / row["file"]).write_bytes(data)
        print(f"{row['id']:22s} {im.size[0]:4d} x {im.size[1]:<4d} q{q}  {len(data):6d} B  {row['archive']}:{row['image']}")
    return check() if not only else 0


# ----------------------------------------------------------------------------------- the solver

SOLVE_N = 320


def solve() -> int:
    import numpy as np
    from PIL import Image, ImageFilter

    n = SOLVE_N
    doc = registry()
    only = arg("only")
    cache = Path(arg("cache")) if arg("cache") else None

    def reference(ra, dec, fov_arcmin):
        q = urllib.parse.urlencode(dict(hips="CDS/P/2MASS/color", width=n, height=n, fov=fov_arcmin / 60,
                                        projection="TAN", coordsys="icrs", ra=ra, dec=dec, format="jpg"))
        return np.asarray(Image.open(io.BytesIO(fetch(f"{HIPS2FITS}?{q}"))).convert("L"), dtype=float)

    def north_up(a, w, h, rot, fov, mirror=False):
        """The picture resampled north up, east left, `fov` arcminutes across: scene/nebulae.js
        pictureBasis()'s convention, written the other way round."""
        hh, ww = a.shape
        r = math.radians(rot)
        j, i = np.mgrid[0:n, 0:n]
        xi = (0.5 - (i + 0.5) / n) * fov      # east, positive to the left
        eta = (0.5 - (j + 0.5) / n) * fov     # north, positive up
        if mirror:
            xi = -xi
        x = -eta * math.sin(r) - xi * math.cos(r)
        y = eta * math.cos(r) - xi * math.sin(r)
        u = (x / w + 0.5) * ww
        v = (0.5 - y / h) * hh
        ok = (u >= 0) & (u < ww - 1) & (v >= 0) & (v < hh - 1)
        out = np.zeros((n, n))
        out[ok] = a[v[ok].astype(int), u[ok].astype(int)]
        return out, ok

    def high_pass(a):
        im = Image.fromarray(np.clip(a, 0, 255).astype("uint8"))
        return (np.asarray(im.filter(ImageFilter.GaussianBlur(1)), dtype=float)
                - np.asarray(im.filter(ImageFilter.GaussianBlur(6)), dtype=float))

    def correlate(a, b):
        c = np.fft.fftshift(np.fft.ifft2(np.fft.fft2(a - a.mean()) * np.conj(np.fft.fft2(b - b.mean()))).real)
        k = np.unravel_index(np.argmax(c), c.shape)
        return (k[1] - n // 2, k[0] - n // 2), (c.max() - c.mean()) / c.std()

    for row in doc["pictures"]:
        if only and row["id"] != only:
            continue
        a = np.asarray(source_image(doc, row, cache).convert("L"), dtype=float)
        pub = row.get("published") or {}
        ra, dec = float(pub.get("ra_deg", row["ra_deg"])), float(pub.get("dec_deg", row["dec_deg"]))
        w, h, rot = float(row["width_arcmin"]), float(row["height_arcmin"]), float(row["north_deg"])
        start = (ra, dec)
        z0 = None
        for step in range(4):
            fov = max(w, h) * 1.05
            ref = high_pass(reference(ra, dec, fov))
            if step == 0:
                grid = [(1.0, 0.0)]
            elif step == 1:
                grid = [(s, d) for s in np.linspace(0.90, 1.10, 21) for d in np.linspace(-3, 3, 13)]
            else:
                grid = [(s, d) for s in np.linspace(0.985, 1.015, 13) for d in np.linspace(-0.5, 0.5, 11)]
            best = None
            for s, d in grid:
                m, ok = north_up(a, w * s, h * s, rot + d, fov)
                shift, z = correlate(high_pass(m) * ok, ref * ok)
                if best is None or z > best[0]:
                    best = (z, s, d, shift)
            z, s, d, (dx, dy) = best
            z0 = z if z0 is None else z0
            w, h, rot = w * s, h * s, rot + d
            dec += dy * fov / n / 60
            ra += dx * fov / n / 60 / math.cos(math.radians(dec))
        fov = max(w, h) * 1.05
        ref = high_pass(reference(ra, dec, fov))
        m, ok = north_up(a, w, h, rot, fov)
        _, z = correlate(high_pass(m) * ok, ref * ok)
        mm, _ = north_up(a, w, h, rot, fov, mirror=True)
        _, zm = correlate(high_pass(mm) * ok, ref * ok)
        moved = 60 * math.hypot((ra - start[0]) * math.cos(math.radians(dec)), dec - start[1])
        print(f"{row['id']:22s} ra_deg: {ra:.5f}  dec_deg: {dec:.5f}  width_arcmin: {w:.2f}  height_arcmin: {h:.2f}  "
              f"north_deg: {rot:.2f}   moved {moved:.2f}' from the start; correlation {z:.1f} (mirror image {zm:.1f}, as started {z0:.1f})")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv:
        sys.exit(check())
    sys.exit(solve() if "--solve" in sys.argv else build())
