#!/usr/bin/env python3
"""The ground at the landing sites: site/data/ground/<site>/ (release 2.0.0 batch f7-ground, forge #146).

WHAT IS MADE, per row of registry/ground.yaml, in a frame of its own: a plane tangent to the world at the lander,
x east and z south in metres, heights up from the lander's own ground, the world's curvature included (the ground
falls away 1.2 m in 2 km on the Moon, 260 m in 30 km). The scene draws it as it is: no height is exaggerated.

  near-h-0.bin .. near-h-3.bin   the heights round the lander, NEAR_SIZE x NEAR_SIZE posts NEAR_STEP_M apart (2 km
                                 square), in four bands of rows so no file is over half a megabyte; from the stereo
                                 terrain model (an LROC NAC or HiRISE DTM)
  far-h.bin                      FAR_SIZE x FAR_SIZE posts FAR_STEP_M apart (61 km square): the same DTM where it
                                 reaches, averaged; the world's global model elsewhere (SLDEM2015 on the Moon,
                                 MOLA on Mars), moved by the median difference between the two where both are,
                                 and blended over BLEND_PX posts so no step shows where one ends
  near-o-0.jpg .. near-o-3.jpg   the orthoimage under the near heights, 1 m a pixel, four tiles of 1024 x 1024 (grey:
                                 the cameras' own brightness, one band)
  far-o.jpg                      the orthoimage under the far heights where the stereo strip reaches, and beyond it
                                 the world's global mosaic (LRO WAC on the Moon, Viking MDIM 2.1 on Mars, from NASA
                                 Solar System Treks), its grey fitted to the strip's and blended at the strip's edge
  site.json                      what the scene needs to put them together, and the sources

HOW A HEIGHT FILE IS PACKED: heights quantised to unsigned 16 bits (h = min + q x step, `step` in site.json, a
centimetre or finer near, a decimetre far), each row delta-coded from its left neighbour (mod 65536) and the whole
deflated with zlib, which the browser undoes with DecompressionStream('deflate') (scene/groundmath.js decodeHeights).
A post the sources have no height for is 65535 (the scene lays the far ground under it).

NOTHING IS INVENTED. No boulder, crater or rock is added; a post is the sources' height and a pixel the camera's
grey, resampled (bilinear) and averaged where a coarser grid is made. Where the stereo model has no height the far
grid takes the global model's; where neither has one the post is empty. The DTMs and orthoimages are read in place
by HTTP range requests (the label first, then the rows that are needed), so a 450 MB product costs tens of MB.

THE HALF PIXEL. ISIS's labels (LROC, HiRISE) put LINE_PROJECTION_OFFSET at the top EDGE of the first row; the USGS
mosaics' PDS3 labels put it at the CENTRE. Both are read as their producers write them (`edge: true` in a source).

Run:  python3 scripts/build-ground.py [--site apollo-15 ...] [--cache DIR] [--out site/data/ground]
      --check   rebuild in memory (from the cache) and compare each file's bytes with the committed ones
Needs numpy and pillow (JPEG 2000 for HiRISE's orthoimages).
"""
from __future__ import annotations

import argparse
import concurrent.futures as cf
import datetime
import hashlib
import io
import json
import math
import re
import sys
import time
import urllib.request
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))
from _cli import usage_if_asked  # noqa: E402

NEAR_SIZE = 1024
NEAR_STEP_M = 2.0
FAR_SIZE = 512
FAR_STEP_M = 120.0
ORTHO_NEAR_PX = 2048
ORTHO_FAR_PX = 1024
BLEND_PX = 10
EMPTY = 65535
UA = "space-radar build-ground (https://github.com/Sara-Managed-Projects/space-radar)"


# ------------------------------------------------------------------------------------------------ fetching

def fetch(url: str, start: int | None = None, end: int | None = None, tries: int = 4) -> bytes:
    """GET a URL or a byte range of it (inclusive end), following redirects, retrying a few times."""
    last = None
    for attempt in range(tries + 2):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            if start is not None:
                req.add_header("Range", f"bytes={start}-{end}")
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            if start is not None and len(data) != end - start + 1:
                raise IOError(f"short range read: {len(data)} of {end - start + 1}")
            return data
        except Exception as e:  # noqa: BLE001 -- a flaky archive (or one asking us to slow down): wait, try again
            last = e
            time.sleep(min(30, 2 ** attempt))
    raise IOError(f"{url}: {last}")


def cached(cache: Path | None, key: str, make):
    """The bytes for `key` from the cache folder, or made and kept there."""
    if cache is None:
        return make()
    p = cache / (hashlib.sha256(key.encode()).hexdigest()[:24] + ".bin")
    if p.exists():
        return p.read_bytes()
    data = make()
    cache.mkdir(parents=True, exist_ok=True)
    p.write_bytes(data)
    return data


# ------------------------------------------------------------------------------------------------ labels

def parse_label(text: str) -> dict:
    """The keywords of a PDS3 label we need, from its first IMAGE and IMAGE_MAP_PROJECTION objects."""
    out: dict = {}
    for line in text.splitlines():
        m = re.match(r"\s*\^?([A-Z_]+)\s*=\s*(.+?)\s*$", line)
        if not m:
            continue
        key, val = m.group(1), m.group(2)
        if key in out and key not in ("OBJECT", "END_OBJECT"):
            continue  # the first occurrence (the label's own image), not a later object's
        out[key] = val
    return out


def num(label: dict, key: str, default=None) -> float:
    v = label.get(key)
    if v is None:
        if default is None:
            raise KeyError(key)
        return default
    m = re.match(r'"?\(?\s*"?([-+0-9.eE]+)', v.replace("16#", ""))
    return float(m.group(1)) if m else default


class Raster:
    """A PDS raster read in place: the projection of its label and its rows by range requests."""

    def __init__(self, src: dict, cache: Path | None):
        self.src = src
        self.cache = cache
        self.url = src["url"]
        if src.get("label_url"):
            text = fetch(src["label_url"]).decode("latin1")
            lab = parse_label(text)
            self.data_offset = int(src.get("data_offset") or 0)
            m = re.search(r"\(\s*\"[^\"]+\"\s*,\s*(\d+)\s*<BYTES>\s*\)", text)
            if m and not src.get("data_offset"):
                self.data_offset = int(m.group(1)) - 1  # PDS3 byte pointers count from 1
        else:
            head = cached(cache, self.url + "#label", lambda: fetch(self.url, 0, 65535))
            text = head.decode("latin1")
            lab = parse_label(text[: text.find("\nEND\n") + 5 if "\nEND\n" in text else len(text)])
            rb = int(num(lab, "RECORD_BYTES"))
            self.data_offset = (int(num(lab, "IMAGE")) - 1) * rb
        self.label = lab
        self.lines = int(num(lab, "LINES"))
        self.samples = int(num(lab, "LINE_SAMPLES"))
        bits = int(num(lab, "SAMPLE_BITS"))
        kind = lab.get("SAMPLE_TYPE", "")
        import numpy as np

        if "REAL" in kind:
            self.dtype = np.dtype("<f4") if "PC" in kind or "LSB" in kind else np.dtype(">f4")
        elif bits == 16:
            self.dtype = np.dtype("<i2") if "LSB" in kind else np.dtype(">i2")
        elif bits == 8:
            self.dtype = np.dtype("u1")
        else:
            raise ValueError(f"{self.url}: sample type {kind} {bits}")
        self.row_bytes = self.samples * self.dtype.itemsize
        self.scale = float(src.get("scale", num(lab, "SCALING_FACTOR", 1.0)))
        self.offset = float(src.get("offset", num(lab, "OFFSET", 0.0)) if "offset" in src else 0.0)
        self.res = num(lab, "MAP_RESOLUTION")
        self.lat_c = num(lab, "CENTER_LATITUDE", 0.0)
        self.lon_c = num(lab, "CENTER_LONGITUDE", 0.0)
        self.lpo = num(lab, "LINE_PROJECTION_OFFSET")
        self.spo = num(lab, "SAMPLE_PROJECTION_OFFSET")
        self.edge = bool(src.get("edge", True))
        self.signed_lon = bool(src.get("signed_lon", False))

    def pixel(self, lat, lon):
        """Fractional 0-based (line, sample) of pixel centres for planetocentric lat, east lon (numpy arrays)."""
        import numpy as np

        half = 0.5 if self.edge else 0.0
        dlon = lon - self.lon_c
        dlon = (dlon + 180.0) % 360.0 - 180.0
        line = self.lpo - lat * self.res - half
        samp = self.spo + dlon * self.res * math.cos(math.radians(self.lat_c)) - half
        return np.asarray(line), np.asarray(samp)

    def rows(self, r0: int, r1: int, stride: int = 1, c0: int = 0, c1: int | None = None):
        """Rows r0..r1-1 (every `stride`-th), columns c0..c1-1, as floats with NaN where the label says there is no
        value. Returns (row indices, block, c0). A short run of whole rows is one request; anything else is one
        request a row for just the columns asked (a global mosaic's row is 369 kB, of which a site needs 2)."""
        import numpy as np

        r0 = max(0, r0)
        r1 = min(self.lines, r1)
        c0 = max(0, c0)
        c1 = self.samples if c1 is None else min(self.samples, c1)
        idx = list(range(r0, r1, stride))
        if not idx or c1 <= c0:
            return idx, np.zeros((0, 0), np.float32), c0
        size = self.dtype.itemsize
        span = (r1 - r0) * self.row_bytes
        if span <= 220_000_000 and stride == 1:
            key = f"{self.url}#{r0}-{r1}"
            raw = cached(self.cache, key, lambda: fetch(self.url, self.data_offset + r0 * self.row_bytes, self.data_offset + r1 * self.row_bytes - 1))
            arr = np.frombuffer(raw, self.dtype).reshape(r1 - r0, self.samples)[:, c0:c1]
        elif self.src.get("archive_polite", True) and not self.src.get("label_url"):
            # An archive that answers a burst of small requests with 429 for an hour (the PDS Imaging Node did,
            # 2026-11-07): the span in a few large pieces, each thinned to the rows asked as it arrives, and only
            # the thinned block kept in the cache.
            def thinned():
                keep = []
                piece = max(1, 48_000_000 // self.row_bytes)
                for a in range(r0, r1, piece):
                    b = min(r1, a + piece)
                    raw = fetch(self.url, self.data_offset + a * self.row_bytes, self.data_offset + b * self.row_bytes - 1)
                    blk = np.frombuffer(raw, self.dtype).reshape(b - a, self.samples)
                    first = (-(a - r0)) % stride
                    keep.append(blk[first::stride, c0:c1].copy())
                return np.vstack(keep).tobytes()
            raw = cached(self.cache, f"{self.url}#{r0}-{r1}/{stride}:{c0}-{c1}", thinned)
            arr = np.frombuffer(raw, self.dtype).reshape(len(idx), c1 - c0)
        else:
            def one(r):
                a = self.data_offset + r * self.row_bytes + c0 * size
                return cached(self.cache, f"{self.url}#{r}:{c0}-{c1}", lambda: fetch(self.url, a, a + (c1 - c0) * size - 1))
            with cf.ThreadPoolExecutor(4) as ex:
                parts = list(ex.map(one, idx))
            arr = np.frombuffer(b"".join(parts), self.dtype).reshape(len(idx), c1 - c0)
        out = arr.astype(np.float32)
        if self.dtype.kind == "f":
            out[(out < -1e30) | ~np.isfinite(out)] = np.nan
        else:
            nul = self.src.get("null")
            if nul is not None:
                out[arr == nul] = np.nan
        return idx, out * self.scale + self.offset, c0


class Image2D:
    """An in-memory raster (a decoded JPEG 2000 orthoimage) with a Raster-like projection."""

    def __init__(self, src: dict, cache: Path | None):
        import numpy as np
        from PIL import Image

        Image.MAX_IMAGE_PIXELS = None
        lab = parse_label(fetch(src["label_url"]).decode("latin1"))
        self.label = lab
        data = cached(cache, src["url"], lambda: fetch(src["url"]))
        im = Image.open(io.BytesIO(data))
        self.arr = np.asarray(im.convert("L"), dtype=np.float32)
        self.arr[self.arr == 0] = np.nan  # CORE_NULL = 0
        self.lines, self.samples = self.arr.shape
        self.res = num(lab, "MAP_RESOLUTION")
        self.lat_c = num(lab, "CENTER_LATITUDE", 0.0)
        self.lon_c = num(lab, "CENTER_LONGITUDE", 0.0)
        self.lpo = num(lab, "LINE_PROJECTION_OFFSET")
        self.spo = num(lab, "SAMPLE_PROJECTION_OFFSET")
        self.edge = True

    pixel = Raster.pixel

    def rows(self, r0, r1, stride=1, c0=0, c1=None):
        r0 = max(0, r0)
        r1 = min(self.lines, r1)
        idx = list(range(r0, r1, stride))
        return idx, self.arr[r0:r1:stride, :], 0


def open_source(src: dict, cache: Path | None):
    return Image2D(src, cache) if src["url"].lower().endswith(".jp2") else Raster(src, cache)


# ------------------------------------------------------------------------------------------------ geometry

def tangent_latlon(lat0: float, lon0: float, e, n, radius_m: float):
    """The planetocentric lat, east lon under points of the tangent plane at (lat0, lon0), x east and n north (m)."""
    import numpy as np

    p0, l0 = math.radians(lat0), math.radians(lon0)
    U = np.array([math.cos(p0) * math.cos(l0), math.cos(p0) * math.sin(l0), math.sin(p0)])
    E = np.array([-math.sin(l0), math.cos(l0), 0.0])
    N = np.array([-math.sin(p0) * math.cos(l0), -math.sin(p0) * math.sin(l0), math.cos(p0)])
    P = radius_m * U[None, None, :] + e[..., None] * E[None, None, :] + n[..., None] * N[None, None, :]
    r = np.linalg.norm(P, axis=-1)
    lat = np.degrees(np.arcsin(P[..., 2] / r))
    lon = np.degrees(np.arctan2(P[..., 1], P[..., 0])) % 360.0
    cos_t = radius_m / r  # the angle at the world's centre between the lander and the point
    return lat, lon, cos_t


def grid(size: int, step: float):
    """East and north (m) of a size x size grid centred on the lander, row 0 to the NORTH, column 0 to the west."""
    import numpy as np

    c = (np.arange(size) - (size - 1) / 2.0) * step
    e, n = np.meshgrid(c, -c)
    return e, n


def sample(raster, lat, lon, stride: int = 1, box: int = 1):
    """Bilinear samples of a raster at lat/lon arrays; NaN outside it. `stride` reads every stride-th row (and the
    columns are averaged over `box`), for a grid much coarser than the raster."""
    import numpy as np

    li, si = raster.pixel(lat, lon)
    ok = np.isfinite(li) & (li >= 0) & (li <= raster.lines - 1) & (si >= 0) & (si <= raster.samples - 1)
    out = np.full(lat.shape, np.nan, np.float32)
    if not ok.any():
        return out
    r0 = int(math.floor(li[ok].min()))
    r1 = int(math.ceil(li[ok].max())) + 2
    pad = box + 2
    c0 = max(0, int(math.floor(si[ok].min())) - pad)
    c1 = min(raster.samples, int(math.ceil(si[ok].max())) + pad + 1)
    idx, block, c0 = raster.rows(r0, r1, stride, c0, c1)
    if not idx:
        return out
    cols = block.shape[1]
    if box > 1:
        k = np.ones(box, np.float32) / box
        filled = np.where(np.isfinite(block), block, 0)
        weight = np.isfinite(block).astype(np.float32)
        num_ = np.apply_along_axis(lambda r: np.convolve(r, k, mode="same"), 1, filled)
        den = np.apply_along_axis(lambda r: np.convolve(r, k, mode="same"), 1, weight)
        block = np.where(den > 0.5, num_ / np.maximum(den, 1e-6), np.nan)
    # Fractional row and column in the block's own index.
    rf = (li - idx[0]) / stride
    r_lo = np.clip(np.floor(rf).astype(int), 0, len(idx) - 1)
    r_hi = np.clip(r_lo + 1, 0, len(idx) - 1)
    fr = np.clip(rf - r_lo, 0, 1)
    sf = si - c0
    s_lo = np.clip(np.floor(sf).astype(int), 0, cols - 1)
    s_hi = np.clip(s_lo + 1, 0, cols - 1)
    fs = np.clip(sf - s_lo, 0, 1)
    v = (block[r_lo, s_lo] * (1 - fr) * (1 - fs) + block[r_lo, s_hi] * (1 - fr) * fs
         + block[r_hi, s_lo] * fr * (1 - fs) + block[r_hi, s_hi] * fr * fs)
    out[ok] = v[ok]
    return out


# ------------------------------------------------------------------------------------------------ packing

def pack_heights(h, step: float, lo: float | None = None) -> tuple[bytes, float]:
    """Quantise (min + q step), delta-code each row from its left neighbour, deflate. Returns (bytes, min)."""
    import numpy as np

    lo = float(np.nanmin(h)) if lo is None else lo
    q = np.where(np.isfinite(h), np.round((h - lo) / step), EMPTY)
    if np.nanmax(np.where(np.isfinite(h), q, 0)) >= EMPTY:
        raise ValueError(f"height range {np.nanmax(h) - lo:.1f} m does not fit 16 bits at a step of {step} m")
    q = q.astype(np.uint16)
    d = q.astype(np.int32)
    d[:, 1:] = (q[:, 1:].astype(np.int32) - q[:, :-1].astype(np.int32)) % 65536
    return zlib.compress(d.astype("<u2").tobytes(), 9), lo


def unpack_heights(data: bytes, cols: int, lo: float, step: float):
    """The inverse of pack_heights (the browser's is scene/groundmath.js decodeHeights)."""
    import numpy as np

    d = np.frombuffer(zlib.decompress(data), "<u2").reshape(-1, cols).astype(np.uint32)
    q = np.cumsum(d, axis=1) % 65536
    out = lo + q.astype(np.float64) * step
    out[q == EMPTY] = np.nan
    return out


def to_jpeg(gray, quality: int = 86) -> bytes:
    from PIL import Image
    import numpy as np

    buf = io.BytesIO()
    Image.fromarray(np.clip(gray, 0, 255).astype(np.uint8)).save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
    return buf.getvalue()


STRETCH_FLOOR = 28.0


def stretch(v, lo: float, hi: float):
    """The camera's brightness between its 0.5 and 99.5 percentiles onto STRETCH_FLOOR..245: the images' own shadows
    (the orbiter's Sun was low) read as dark ground, not as holes in it; a post with no pixel is mid grey."""
    import numpy as np

    return np.where(np.isfinite(v), (v - lo) / max(hi - lo, 1e-9) * (245.0 - STRETCH_FLOOR) + STRETCH_FLOOR, 128.0)


def trek_sample(src: dict, lat, lon, cache: Path | None):
    """Grey samples of a NASA Solar System Treks mosaic (WMTS, equirectangular, two tiles round the equator at level
    0, 256-pixel tiles) at one level, bilinear, for the far ground the stereo strip does not reach."""
    import numpy as np
    from PIL import Image

    level = int(src["level"])
    span = 180.0 / (2 ** level)  # degrees a tile
    px_per_deg = 256.0 / span
    lonw = (lon + 180.0) % 360.0
    colf = lonw * px_per_deg
    rowf = (90.0 - lat) * px_per_deg
    c0, c1 = int(np.floor(colf.min())) - 1, int(np.ceil(colf.max())) + 2
    r0, r1 = int(np.floor(rowf.min())) - 1, int(np.ceil(rowf.max())) + 2
    mosaic = np.zeros((r1 - r0, c1 - c0), np.float32)
    for ty in range(r0 // 256, (r1 - 1) // 256 + 1):
        for tx in range(c0 // 256, (c1 - 1) // 256 + 1):
            url = src["url"].replace("{z}", str(level)).replace("{y}", str(ty)).replace("{x}", str(tx % (2 * 2 ** level)))
            tile = np.asarray(Image.open(io.BytesIO(cached(cache, url, lambda u=url: fetch(u)))).convert("L"), np.float32)
            ya, xa = ty * 256 - r0, tx * 256 - c0
            ys, xs = max(0, ya), max(0, xa)
            ye, xe = min(r1 - r0, ya + 256), min(c1 - c0, xa + 256)
            if ye > ys and xe > xs:
                mosaic[ys:ye, xs:xe] = tile[ys - ya:ye - ya, xs - xa:xe - xa]
    rf, cf_ = rowf - r0 - 0.5, colf - c0 - 0.5
    ri = np.clip(np.floor(rf).astype(int), 0, mosaic.shape[0] - 2)
    ci = np.clip(np.floor(cf_).astype(int), 0, mosaic.shape[1] - 2)
    fr, fc = np.clip(rf - ri, 0, 1), np.clip(cf_ - ci, 0, 1)
    return (mosaic[ri, ci] * (1 - fr) * (1 - fc) + mosaic[ri, ci + 1] * (1 - fr) * fc
            + mosaic[ri + 1, ci] * fr * (1 - fc) + mosaic[ri + 1, ci + 1] * fr * fc)


# ------------------------------------------------------------------------------------------------ one site

def build_site(row: dict, sites: dict, cache: Path | None, log=print) -> dict[str, bytes]:
    import numpy as np

    anchor = sites[row["site"]]
    lat0, lon0 = float(anchor["lat"]), float(anchor["lon"]) % 360.0
    R = float(row["radius_km"]) * 1000.0
    dtm = open_source(row["dtm"], cache)
    ortho = open_source(row["ortho"], cache)
    ortho_far = open_source(row["ortho_far"], cache) if row.get("ortho_far") else ortho
    glob = open_source(row["global"], cache)
    files: dict[str, bytes] = {}

    # The lander's own ground: the DTM at its coordinates.
    h0 = float(sample(dtm, np.array([[lat0]]), np.array([[lon0]]))[0, 0])
    if not math.isfinite(h0):
        raise ValueError(f"{row['id']}: the DTM has no height at the site")

    def lift(h, cos_t):
        # Up from the lander's ground, curvature included: (R + h) cos(theta) - (R + h0).
        return (R + h) * cos_t - (R + h0)

    # Near.
    e, n = grid(NEAR_SIZE, NEAR_STEP_M)
    lat, lon, cos_t = tangent_latlon(lat0, lon0, e, n, R)
    box = max(1, int(round(NEAR_STEP_M / float(row["dtm"].get("post_m", NEAR_STEP_M)))))
    hn = sample(dtm, lat, lon, box=box)
    near_holes = int(np.isnan(hn).sum())
    un = lift(hn, cos_t)
    near_step = 0.005
    bands = 4
    rows_per = NEAR_SIZE // bands
    lo_all = float(np.nanmin(un))
    for b in range(bands):
        files[f"near-h-{b}.bin"], _ = pack_heights(un[b * rows_per:(b + 1) * rows_per], near_step, lo_all)
    log(f"  near: {NEAR_SIZE}^2 at {NEAR_STEP_M} m, {near_holes} empty posts, relief {np.nanmax(un) - np.nanmin(un):.1f} m")

    # Far: the DTM averaged where it reaches, the global model elsewhere, aligned and blended.
    e, n = grid(FAR_SIZE, FAR_STEP_M)
    lat, lon, cos_t = tangent_latlon(lat0, lon0, e, n, R)
    post = float(row["dtm"].get("post_m", 1.0))
    stride = max(1, int(FAR_STEP_M / post / 8))
    hd = sample(dtm, lat, lon, stride=stride, box=max(1, int(FAR_STEP_M / post / 2)))
    hg = sample(glob, lat, lon)
    both = np.isfinite(hd) & np.isfinite(hg)
    shift = float(np.median(hd[both] - hg[both])) if both.sum() > 20 else 0.0
    hg = hg + shift
    # Blend weight: 1 deep inside the DTM's reach, 0 outside, a ramp of BLEND_PX posts between.
    inside = np.isfinite(hd).astype(np.float32)
    w = inside.copy()
    for _ in range(BLEND_PX):
        pad = np.pad(w, 1, mode="edge")
        w = np.minimum(w, np.minimum.reduce([pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]]) + 1.0 / BLEND_PX)
    w = np.clip(w, 0, 1) * inside
    hf = np.where(np.isfinite(hg), np.where(inside > 0, w * np.nan_to_num(hd) + (1 - w) * hg, hg), hd)
    uf = lift(hf, cos_t)
    far_step = 0.1
    data, far_min = pack_heights(uf, far_step)
    files["far-h.bin"] = data
    log(f"  far: {FAR_SIZE}^2 at {FAR_STEP_M} m, DTM covers {inside.mean() * 100:.0f} %, global moved {shift:+.1f} m, relief {np.nanmax(uf) - np.nanmin(uf):.0f} m")

    # Orthoimages: one stretch for both, from the near ground's own percentiles.
    e, n = grid(ORTHO_NEAR_PX, NEAR_SIZE * NEAR_STEP_M / ORTHO_NEAR_PX)
    lat, lon, _ = tangent_latlon(lat0, lon0, e, n, R)
    o_post = float(row["ortho"].get("post_m", 1.0))
    on = sample(ortho, lat, lon, box=max(1, int(round(1.0 / o_post))))
    lo, hi = np.nanpercentile(on, 0.5), np.nanpercentile(on, 99.5)
    g = stretch(on, lo, hi)
    t = ORTHO_NEAR_PX // 2
    for k, (r, c) in enumerate([(0, 0), (0, 1), (1, 0), (1, 1)]):
        files[f"near-o-{k}.jpg"] = to_jpeg(g[r * t:(r + 1) * t, c * t:(c + 1) * t])
    e, n = grid(ORTHO_FAR_PX, FAR_SIZE * FAR_STEP_M / ORTHO_FAR_PX)
    lat, lon, _ = tangent_latlon(lat0, lon0, e, n, R)
    if ortho_far is not ortho:
        # A coarser product of the same image: its own brightness scale, matched to the near one's percentiles.
        f_post = float(row["ortho_far"].get("post_m", 1.0))
        of = sample(ortho_far, lat, lon, stride=max(1, int(FAR_SIZE * FAR_STEP_M / ORTHO_FAR_PX / f_post / 4)), box=max(1, int(FAR_SIZE * FAR_STEP_M / ORTHO_FAR_PX / f_post)))
    else:
        of = sample(ortho, lat, lon, stride=max(1, int(FAR_SIZE * FAR_STEP_M / ORTHO_FAR_PX / o_post / 4)), box=max(1, int(FAR_SIZE * FAR_STEP_M / ORTHO_FAR_PX / o_post)))
    far_cover = float(np.isfinite(of).mean())
    base_note = None
    if row.get("trek"):
        # Beyond the strip, the global mosaic's grey, brought to the strip's own scale by a straight-line fit where
        # both are, and blended over BLEND_PX pixels at the strip's edge (the same ramp as the heights').
        base = trek_sample(row["trek"], lat, lon, cache)
        both_px = np.isfinite(of) & (base > 2)
        if both_px.sum() > 200:
            gain, offset = np.polyfit(base[both_px], of[both_px], 1)
        else:
            gain, offset = float(np.nanmean(of) / max(np.mean(base), 1e-6)) if np.isfinite(of).any() else 1.0, 0.0
        mapped = base * gain + offset
        inside_o = np.isfinite(of).astype(np.float32)
        wo = inside_o.copy()
        for _ in range(BLEND_PX):
            pad = np.pad(wo, 1, mode="edge")
            wo = np.minimum(wo, np.minimum.reduce([pad[:-2, 1:-1], pad[2:, 1:-1], pad[1:-1, :-2], pad[1:-1, 2:]]) + 1.0 / BLEND_PX)
        wo = np.clip(wo, 0, 1) * inside_o
        of = np.where(inside_o > 0, wo * np.nan_to_num(of) + (1 - wo) * mapped, mapped)
        base_note = row["trek"]["what"]
    files["far-o.jpg"] = to_jpeg(stretch(of, lo, hi))
    log(f"  ortho: near {ORTHO_NEAR_PX}^2, far {ORTHO_FAR_PX}^2 ({far_cover * 100:.0f} % imaged)")

    manifest = {
        "id": row["id"],
        "world": row["world"],
        "site": row["site"],
        "latDeg": lat0,
        "lonDeg": lon0,
        "radiusKm": float(row["radius_km"]),
        "groundM": round(h0, 2),
        "near": {"size": NEAR_SIZE, "stepM": NEAR_STEP_M, "bands": bands, "min": round(lo_all, 4), "q": near_step, "files": [f"near-h-{b}.bin" for b in range(bands)], "empty": near_holes},
        "far": {"size": FAR_SIZE, "stepM": FAR_STEP_M, "min": round(far_min, 3), "q": far_step, "file": "far-h.bin", "dtmShare": round(float(inside.mean()), 3), "globalShiftM": round(shift, 1)},
        "orthoNear": {"px": ORTHO_NEAR_PX, "files": [f"near-o-{k}.jpg" for k in range(4)]},
        "orthoFar": {"px": ORTHO_FAR_PX, "file": "far-o.jpg", "imaged": round(far_cover, 3)},
        "model": row.get("model"),
        "tint": row.get("tint"),
        "sources": [
            {k: row[part][k] for k in ("what", "product", "page", "licence", "credit") if k in row[part]}
            for part in ("dtm", "ortho", "global", "trek") if part in row
        ],
        "built": row.get("built") or datetime.date.today().isoformat(),
    }
    files["site.json"] = (json.dumps(manifest, indent=1, ensure_ascii=False) + "\n").encode()
    return files


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--site", action="append", help="only these registry/ground.yaml rows")
    ap.add_argument("--cache", default=None, help="a folder to keep the fetched rows in (re-runs read it)")
    ap.add_argument("--out", default=str(ROOT / "site" / "data" / "ground"))
    ap.add_argument("--check", action="store_true", help="rebuild and compare with the committed files")
    args = ap.parse_args()
    import yaml

    reg = yaml.safe_load((ROOT / "registry" / "ground.yaml").read_text())
    sites = {s["id"]: s for s in yaml.safe_load((ROOT / "registry" / "sites.yaml").read_text())["sites"]}
    cache = Path(args.cache) if args.cache else None
    out = Path(args.out)
    bad = 0
    index = []
    for row in reg["grounds"]:
        index.append({"id": row["id"], "world": row["world"], "site": row["site"], "name": row.get("name", row["id"])})
        if args.site and row["id"] not in args.site:
            continue
        print(f"{row['id']}:")
        files = build_site(row, sites, cache)
        folder = out / row["id"]
        for name, data in files.items():
            p = folder / name
            if args.check:
                same = p.exists() and (p.read_bytes() == data or name == "site.json")
                if not same:
                    print(f"  differs: {p.relative_to(ROOT)}")
                    bad += 1
                continue
            folder.mkdir(parents=True, exist_ok=True)
            p.write_bytes(data)
        total = sum(len(v) for v in files.values())
        print(f"  {len(files)} files, {total / 1024:.0f} kB")
    if not args.check:
        # The index lists the rows that have been built: scene/groundstage.js finds a site's ground through it.
        built = [row for row in index if (out / row["id"] / "site.json").exists()]
        (out / "index.json").write_text(json.dumps({"grounds": built}, indent=1) + "\n")
    return 1 if bad else 0


if __name__ == "__main__":
    usage_if_asked(__doc__)
    sys.exit(main())
