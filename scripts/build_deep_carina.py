#!/usr/bin/env python3
"""The Carina hero's light, the sharp light round its clusters and the depth of its glowing wall (internal spec 0077
stage W2-e, internal #782).

    python3 scripts/build_deep_carina.py --large=<eso1250a.jpg>   bake all three files (PIL, numpy); the JPEG is ESO's
                                                     publication JPEG (5.5 MB, not in git: https://cdn.eso.org/images/publicationjpg/eso1250a.jpg)
    python3 scripts/build_deep_carina.py            bake the light and the wall again, keeping the sharp map
    python3 scripts/build_deep_carina.py --check    the outputs match their manifest, the photograph and the profile

WHY. The Carina Nebula is a giant H II region whose clusters (Trumpler 14 and 16, Eta Carinae among them) have blown a
cavity in their molecular cloud; on the largest scale it is BIPOLAR, its axis perpendicular to the Galactic plane
(Smith et al. 2000; Smith & Brooks 2008). Its light is the photograph the app shows (ESO eso1250a); its shape is a wall
at a depth behind the clusters that this script reconstructs, so scene/deep/carina.js can draw the photograph's light
ON that wall: from our side the model is the photograph, turned it is that light at its reconstructed depth. The dark
V-shaped lane is dust in front (Smith & Brooks 2008): its optical depth is read from the photograph's darkness.

WHAT IT WRITES (the same layout as scripts/build_deep_orion.py, so scene/deep/carina.js reads them as orion.js does).
  site/images/deep/carina/carina-light.webp    the photograph with its stars taken out (a star is not on the wall; the
                                               bright ones are drawn as stars by the hero)
  site/images/deep/carina/carina-detail.webp   the SHARP light round the clusters: the same photograph from ESO's
                                               publication JPEG, a 20 arcmin square, its stars out, its colours the 640 px map's
  site/data/deep/carina-front.bin              a 200 x 214 grid on the PHOTOGRAPH'S OWN (u, v) (v up, row 0 the bottom),
                                               four half floats a cell, little-endian, after a 16-byte header (b"SROR",
                                               u16 version, u16 nx, u16 ny, u16 channels, 6 spare):
                                                 R  the wall's height z in light-years (z toward the Sun, the record's place at 0)
                                                 G  the cloud's column behind it, 0 to 1
                                                 B  the dust lane's optical depth on our line, 0 to tau_max
                                                 A  1 (spare)
  site/images/deep/carina/manifest.json        the SHA-256s, the inputs' SHA-256s and the parameters used.

HOW THE WALL IS MADE (registry/deepsky-heroes/carina.yaml, part `front`; every number is there).
  1. Two lobes along the bipolar axis (axis_pa_deg, the Galactic north here), each an ellipse on the sky (its semi-axes
     along and across the axis) whose far wall is z = -depth cos(pi/2 q), q the elliptical radius (1 at the rim); the
     two joined by a smooth minimum over waist_ly where they meet; z = 0 (the clusters' plane) outside them.
  2. RELIEF: where the photograph is locally brighter than round it, the wall is nearer the clusters' plane, by
     (fine / wide)^-power (at most e^max_ln either way, at most max_ly): a front lit from outside is brighter where
     it is nearer its stars (S ~ r^-2). Illustrative here, and said so.
  3. Smoothed and its slope held under 1.6, so that on our line no part of the wall is dimmed (orion.js caps the
     limb's 1 / |cos| at 2, which a slope of 1.73 reaches).
THE CLOUD: the photograph's light blurred over blur_arcmin, as a column 0 to 1. THE DUST LANE: along its polyline and
inside the Keyhole's ellipse, ln(brightest surroundings / here) of the photograph's light, at most tau_max: the
darkness taken as the lane's absorption, given back to the wall and taken again on our line.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "images" / "nebulae" / "carina-nebula.webp"
PROFILE = ROOT / "registry" / "deepsky-heroes" / "carina.yaml"
NEBULAE = ROOT / "registry" / "nebulae.yaml"
LIGHT = ROOT / "site" / "images" / "deep" / "carina" / "carina-light.webp"
DEPTH = ROOT / "site" / "data" / "deep" / "carina-front.bin"
DETAIL = ROOT / "site" / "images" / "deep" / "carina" / "carina-detail.webp"
LARGE_URL = "https://cdn.eso.org/images/publicationjpg/eso1250a.jpg"
MANIFEST = LIGHT.with_name("manifest.json")
VERSION = 1


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def params() -> dict:
    """The numbers the bake uses, from the profile and the photograph's row."""
    import yaml

    prof = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
    row = next(r for r in yaml.safe_load(NEBULAE.read_text(encoding="utf-8"))["pictures"] if r["id"] == "carina-nebula")
    parts = {l["part"]: l for l in prof["layers"]}
    return {
        "distance_ly": prof["frame"]["distance_ly"],
        "origin": [prof["frame"]["ra_deg"], prof["frame"]["dec_deg"]],
        "picture": {k: row[k] for k in ("ra_deg", "dec_deg", "width_arcmin", "height_arcmin", "north_deg")},
        "front": {k: parts["front"][k] for k in ("axis_pa_deg", "lobes", "waist_ly", "relief", "grid")},
        "cloud": {k: parts["cloud"][k] for k in ("blur_arcmin",)},
        "dust": {k: parts["dust"][k] for k in ("lane", "keyhole", "tau_max")},
        "detail": parts["light"]["detail"],
    }


def sky_offset(p: dict, ra: float, dec: float) -> tuple[float, float]:
    """(west, north) of a sky place from the record's place, arcmin (tangent plane, small field)."""
    ra0, dec0 = p["origin"]
    return (-(ra - ra0) * math.cos(math.radians(dec0)) * 60.0, (dec - dec0) * 60.0)


def uv_map(p: dict):
    """The photograph's (u, v) of a sky offset (west, north) in arcmin from the origin, and the inverse."""
    pic = p["picture"]
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])
    r = math.radians(pic.get("north_deg") or 0.0)
    W, H = pic["width_arcmin"], pic["height_arcmin"]

    def to_uv(w, n):
        dw, dn = w - cw, n - cn
        right = dw * math.cos(r) - dn * math.sin(r)
        up = dw * math.sin(r) + dn * math.cos(r)
        return 0.5 + right / W, 0.5 + up / H

    def from_uv(u, v):
        right, up = (u - 0.5) * W, (v - 0.5) * H
        dw = right * math.cos(r) + up * math.sin(r)
        dn = -right * math.sin(r) + up * math.cos(r)
        return cw + dw, cn + dn

    return to_uv, from_uv


def remove_stars(a, big_px: int, small: int, thresh: float, bright: float, big_pass: bool = True):
    """The stars out of an RGB array (float32, 0..255): the big ones (and their halos) filled from a wide median at half
    size, then the rest from a small median, then a wider pass round the bright ones (scripts/build_deep_orion.py's)."""
    import numpy as np
    from PIL import Image, ImageFilter

    n_h, n_w = a.shape[:2]
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    medb = np.asarray(im.resize((n_w // 2, n_h // 2), Image.BOX).filter(ImageFilter.MedianFilter(big_px)).resize((n_w, n_h), Image.BICUBIC)).astype(np.float32)
    big = Image.fromarray((((a.mean(axis=2) - medb.mean(axis=2)) > bright * 0.5) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    bigm = (np.asarray(big) > 0) & big_pass
    a = a.copy()
    a[bigm] = medb[bigm]
    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    med = np.asarray(im.filter(ImageFilter.MedianFilter(small))).astype(np.float32)
    excess = a.mean(axis=2) - med.mean(axis=2)
    m = Image.fromarray(((excess > thresh) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = np.asarray(m) > 0
    out = a.copy()
    out[mask] = med[mask]
    near = np.asarray(Image.fromarray(((excess > bright) * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(25 if big_pass else 13))) > 0
    im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(31 if small > 9 else 21))).astype(np.float32)
    halo = near & ((out.mean(axis=2) - med2.mean(axis=2)) > 6.0)
    halo = (np.asarray(Image.fromarray((halo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0) & near
    out[halo] = med2[halo]
    # the dark rings a sharpened photograph leaves round its stars: darker than the local median, next to a star
    star = mask | halo | bigm
    nearby = np.asarray(Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(7))) > 0
    im3 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med3 = np.asarray(im3.filter(ImageFilter.MedianFilter(small))).astype(np.float32)
    ring = nearby & ((med3.mean(axis=2) - out.mean(axis=2)) > 8.0)
    ring = (np.asarray(Image.fromarray((ring * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(3))) > 0) & nearby
    out[ring] = np.maximum(out[ring], med3[ring])
    return out, star | ring


def fill_bright(a, p: dict, to_px):
    """The brightest stars' glare (Eta Carinae's Homunculus, Trumpler 14's core) is wider than a median takes out: a disc
    round each star of carina.yaml brighter than V 8.5 is filled from its rim inward (a harmonic fill), so the wall carries
    the gas's light and the hero draws the star itself. `to_px(west, north)` -> (x, y) in the array's pixels."""
    import numpy as np
    from PIL import Image, ImageFilter

    import yaml
    prof = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
    stars = list(next(l for l in prof["layers"] if l["part"] == "stars")["stars"])
    # Trumpler 14's core: a knot of O stars the photograph shows as one glare (its place, a V 6.6 disc of 0.98')
    stars += [{"ra_deg": c["ra_deg"], "dec_deg": c["dec_deg"], "v_mag": 6.6} for c in next(l for l in prof["layers"] if l["part"] == "clusters")["clusters"] if c["core_arcmin"] < 1]
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    mask = np.zeros((h, w), bool)
    for st in stars:
        if st["v_mag"] > 8.5:
            continue
        sw, sn = sky_offset(p, st["ra_deg"], st["dec_deg"])
        x, y = to_px(sw, sn)
        r_arc = 0.2 + 0.2 * max(0.0, 8.5 - st["v_mag"])
        rx, _ = to_px(sw - r_arc, sn)
        r = max(2.0, abs(rx - x))
        mask |= (xx - x) ** 2 + (yy - y) ** 2 <= r * r
    if not mask.any():
        return a, mask
    out = a.copy()
    k = 3
    for _ in range(200):
        im = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(k))
        b = np.asarray(im).astype(np.float32)
        out[mask] = b[mask]
    return out, mask


def bake_detail(p: dict, large: Path, light640) -> dict:
    """The sharp light round the clusters: ESO's publication JPEG of the same photograph (3 727 x 4 000 px, not in git), a
    square of `size_arcmin` round the offset `centre_*_arcmin` from Eta Carinae, its stars taken out, and its colour and
    levels the 640 px light map's at `level_arcmin`: detail = sharp x (light640 blurred / sharp blurred)."""
    import numpy as np
    from PIL import Image, ImageFilter

    D = p["detail"]
    pic = p["picture"]
    im = Image.open(large).convert("RGB")
    W, H = im.size
    to_uv, _ = uv_map(p)
    ew, en = sky_offset(p, 161.2647742, -59.6844309)  # Eta Carinae (carina.yaml stars)
    cw, cn = ew + D["centre_west_arcmin"], en + D["centre_north_arcmin"]
    half = D["size_arcmin"] / 2
    uc, vc = to_uv(cw, cn)
    du, dv = half / pic["width_arcmin"], half / pic["height_arcmin"]
    box = [uc - du, vc - dv, uc + du, vc + dv]
    crop = im.crop((round(box[0] * W), round((1 - box[3]) * H), round(box[2] * W), round((1 - box[1]) * H)))
    n = D["px"]
    sharp = crop.resize((n, n), Image.LANCZOS)
    a = np.asarray(sharp).astype(np.float32)
    out, mask = remove_stars(a, 21, 11, 20.0, 70.0)
    to_uv, _ = uv_map(p)
    out, bmask = fill_bright(out, p, lambda w_, n_: ((to_uv(w_, n_)[0] - box[0]) / (box[2] - box[0]) * n, (1 - (to_uv(w_, n_)[1] - box[1]) / (box[3] - box[1])) * n))
    mask = mask | bmask
    sharp = np.clip(out, 0, 255) / 255.0
    L = Image.fromarray(light640)
    lw, lh = L.size
    low = np.asarray(L.transform((n, n), Image.EXTENT, (box[0] * lw, (1 - box[3]) * lh, box[2] * lw, (1 - box[1]) * lh), Image.BICUBIC)).astype(np.float64) / 255.0
    rad = D["level_arcmin"] / D["size_arcmin"] * n
    gb = lambda x: np.asarray(Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))).astype(np.float64) / 255.0
    ratio = np.clip((gb(low) + 0.02) / (gb(sharp) + 0.02), 0.25, 4.0)
    detail = np.clip(sharp * ratio, 0, 1)
    DETAIL.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((detail * 255 + 0.5).astype(np.uint8)).save(DETAIL, "WEBP", quality=D["quality"], method=6)
    return {"file": str(DETAIL.relative_to(ROOT)), "bytes": DETAIL.stat().st_size, "sha256": sha(DETAIL), "uv_box": [round(x, 6) for x in box],
            "size": [n, n], "stars_removed_px": int(mask.sum()), "from": LARGE_URL, "from_sha256": sha(large)}


def bake() -> int:
    import numpy as np
    from PIL import Image

    p = params()
    im = Image.open(SRC).convert("RGB")
    # --- 1. the light: the stars taken out
    a = np.asarray(im).astype(np.float32)
    out, mask = remove_stars(a, 15, 9, 18.0, 60.0, big_pass=False)
    to_uv0, _ = uv_map(p)
    h0, w0 = a.shape[:2]
    out, bmask = fill_bright(out, p, lambda w_, n_: (to_uv0(w_, n_)[0] * w0, (1 - to_uv0(w_, n_)[1]) * h0))
    mask = mask | bmask
    LIGHT.parent.mkdir(parents=True, exist_ok=True)
    light = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(light).save(LIGHT, "WEBP", quality=88, method=6)
    back = np.asarray(Image.open(LIGHT).convert("RGB")).astype(np.float64) / 255.0
    lum = (0.2126 * back[..., 0] + 0.7152 * back[..., 1] + 0.0722 * back[..., 2]) ** 2.2
    Hpx, Wpx = lum.shape
    pic = p["picture"]
    px_arcmin = pic["width_arcmin"] / Wpx

    def blur(x, arcmin):
        s = max(0.5, arcmin / px_arcmin)
        k = int(math.ceil(3 * s))
        g = np.exp(-0.5 * (np.arange(-k, k + 1) / s) ** 2)
        g /= g.sum()
        y = np.pad(x, ((0, 0), (k, k)), mode="reflect")
        y = np.apply_along_axis(lambda r: np.convolve(r, g, mode="valid"), 1, y)
        y = np.pad(y, ((k, k), (0, 0)), mode="reflect")
        return np.apply_along_axis(lambda c: np.convolve(c, g, mode="valid"), 0, y)

    def maxf(x, arcmin):
        k = max(1, int(round(arcmin / px_arcmin / 2)))
        y = x.copy()
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (k, k)
            z = np.pad(y, pad, mode="edge")
            y = np.max(np.stack([np.take(z, range(i, i + y.shape[axis]), axis=axis) for i in range(2 * k + 1)]), axis=0)
        return y

    F = p["front"]
    fine = blur(lum, F["relief"]["fine_arcmin"])
    wide = blur(lum, F["relief"]["wide_arcmin"])
    cloudmap = blur(lum, p["cloud"]["blur_arcmin"])
    ref = blur(maxf(blur(lum, 0.6), 3.0), 2.0)

    # --- 2. the grid on (u, v), v up, row 0 at v = 0 (the bottom, south)
    nx, ny = F["grid"]
    ly_per_arcmin = p["distance_ly"] * math.pi / (180 * 60)
    u = (np.arange(nx) + 0.5) / nx
    v = (np.arange(ny) + 0.5) / ny
    U, V = np.meshgrid(u, v)
    pic_r = math.radians(pic.get("north_deg") or 0.0)
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])
    right, up = (U - 0.5) * pic["width_arcmin"], (V - 0.5) * pic["height_arcmin"]
    Wm = cw + right * math.cos(pic_r) + up * math.sin(pic_r)   # west, arcmin from the origin
    Nm = cn - right * math.sin(pic_r) + up * math.cos(pic_r)   # north

    def at(img):
        fx = U * Wpx - 0.5
        fy = (1 - V) * Hpx - 0.5
        x0 = np.clip(np.floor(fx).astype(int), 0, Wpx - 2)
        y0 = np.clip(np.floor(fy).astype(int), 0, Hpx - 2)
        tx, ty = np.clip(fx - x0, 0, 1), np.clip(fy - y0, 0, 1)
        return (img[y0, x0] * (1 - tx) * (1 - ty) + img[y0, x0 + 1] * tx * (1 - ty)
                + img[y0 + 1, x0] * (1 - tx) * ty + img[y0 + 1, x0 + 1] * tx * ty)

    def smooth(x, a, b):
        q = np.clip((x - a) / (b - a), 0, 1)
        return q * q * (3 - 2 * q)

    # the lobes: the axis's direction on the sky (east of north -> (west, north))
    pa = math.radians(F["axis_pa_deg"])
    aW, aN = -math.sin(pa), math.cos(pa)
    walls = []
    for L in F["lobes"]:
        dW, dN = Wm - L["centre_west_arcmin"], Nm - L["centre_north_arcmin"]
        s = (dW * aW + dN * aN) / L["along_arcmin"]
        t = (dW * aN - dN * aW) / L["across_arcmin"]
        q = np.hypot(s, t)
        walls.append(-L["depth_ly"] * np.cos(0.5 * math.pi * np.minimum(q, 1.0)))
    # a smooth minimum (the deeper wall) over waist_ly where the two meet
    k = F["waist_ly"]
    z = walls[0]
    for w in walls[1:]:
        h = np.clip(0.5 + 0.5 * (w - z) / k, 0, 1)
        z = w * (1 - h) + z * h - k * h * (1 - h)
    z = np.minimum(z, 0.0)
    # relief by the rule S ~ r^-2 on the photograph: brighter than round it is nearer the clusters' plane
    R = F["relief"]
    qr = np.log(np.maximum(at(fine), 1e-6) / np.maximum(at(wide), 1e-6))
    lit = smooth(at(wide) / np.percentile(at(wide), 90), 0.05, 0.3)
    kk = R["max_ln"] * np.tanh(-R["power"] * qr / R["max_ln"]) * lit
    z = z + R["max_ly"] * np.tanh(z * (np.exp(kk) - 1) / R["max_ly"])
    cell = (pic["width_arcmin"] / nx) * ly_per_arcmin

    def smooth_grid(g, n=1):
        for _ in range(n):
            h = np.pad(g, 1, mode="edge")
            g = (4 * h[1:-1, 1:-1] + h[:-2, 1:-1] + h[2:, 1:-1] + h[1:-1, :-2] + h[1:-1, 2:]) / 8
        return g

    z = smooth_grid(z, 2)
    for _ in range(200):
        gy, gx = np.gradient(z, (pic["height_arcmin"] / ny) * ly_per_arcmin, cell)
        slope = np.hypot(gx, gy)
        if slope.max() < 1.6:
            break
        steep = smooth_grid((slope > 1.45).astype(float), 2) > 0.01
        z = np.where(steep, smooth_grid(z, 1), z)
    gy, gx = np.gradient(z, (pic["height_arcmin"] / ny) * ly_per_arcmin, cell)
    slope = np.hypot(gx, gy)
    # --- 3. the cloud's column and the dust lane
    c = at(cloudmap)
    c = np.clip(c / np.percentile(c, 98), 0, 1) ** 1.3
    c = 0.05 + 0.95 * c
    Dd = p["dust"]
    pts = Dd["lane"]["points"]
    dist = np.full(Wm.shape, 1e9)
    for (w0, n0), (w1, n1) in zip(pts[:-1], pts[1:]):
        ex, ey = w1 - w0, n1 - n0
        tt = np.clip(((Wm - w0) * ex + (Nm - n0) * ey) / (ex * ex + ey * ey), 0, 1)
        dist = np.minimum(dist, np.hypot(Wm - (w0 + tt * ex), Nm - (n0 + tt * ey)))
    lane = 1 - smooth(dist / Dd["lane"]["half_width_arcmin"], 0.7, 1.0)
    Kh = Dd["keyhole"]
    kp = math.radians(Kh["pa_deg"])
    kx, ky = Wm - Kh["west_arcmin"], Nm - Kh["north_arcmin"]
    ka = (kx * -math.sin(kp) + ky * math.cos(kp)) / Kh["a_arcmin"]
    kb = (kx * math.cos(kp) + ky * math.sin(kp)) / Kh["b_arcmin"]
    keyhole = 1 - smooth(np.hypot(ka, kb), 0.6, 1.0)
    mask_d = np.maximum(lane, keyhole)
    tau = np.clip(np.log(np.maximum(at(ref), 1e-6) / np.maximum(at(fine), 1e-6)), 0, Dd["tau_max"]) * mask_d
    tau = smooth_grid(tau, 1)
    data = np.stack([z, c, tau, np.ones_like(z)], axis=-1).astype("<f2")
    DEPTH.parent.mkdir(parents=True, exist_ok=True)
    DEPTH.write_bytes(b"SROR" + struct.pack("<HHHH", VERSION, nx, ny, 4) + b"\0" * 4 + data.tobytes())
    detail = None
    large = next((Path(a.split("=", 1)[1]) for a in sys.argv[1:] if a.startswith("--large=")), None)
    if large:
        detail = bake_detail(p, large, light)
    elif MANIFEST.exists() and DETAIL.exists():
        detail = json.loads(MANIFEST.read_text(encoding="utf-8")).get("detail")
        if detail and detail.get("sha256") != sha(DETAIL):
            detail = None
    if not detail:
        print(f"REFUSED the sharp light map needs ESO's publication JPEG: download {LARGE_URL} (5.5 MB, not in git) and run with --large=<path>")
        return 1
    MANIFEST.write_text(json.dumps({
        "light": {"file": str(LIGHT.relative_to(ROOT)), "bytes": LIGHT.stat().st_size, "sha256": sha(LIGHT), "stars_removed_px": int(mask.sum()), "size": [Wpx, Hpx]},
        "depth": {"file": str(DEPTH.relative_to(ROOT)), "bytes": DEPTH.stat().st_size, "sha256": sha(DEPTH), "grid": [nx, ny],
                  "z_ly": [round(float(z.min()), 3), round(float(z.max()), 3)], "max_slope": round(float(slope.max()), 3), "dust_tau_max": round(float(tau.max()), 3)},
        "detail": detail,
        "from": str(SRC.relative_to(ROOT)), "from_sha256": sha(SRC),
        "params": p,
        "credit": "ESO. Acknowledgement: VPHAS+ Consortium/Cambridge Astronomical Survey Unit (eso1250a), CC BY 4.0; stars removed and depth reconstructed by Space Radar (scripts/build_deep_carina.py)",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"carina light: {LIGHT.relative_to(ROOT)} {LIGHT.stat().st_size} B, {int(mask.sum())} star pixels filled")
    print(f"carina wall: {DEPTH.relative_to(ROOT)} {DEPTH.stat().st_size} B, z {z.min():.2f}..{z.max():.2f} ly, slope max {slope.max():.2f}, dust tau max {tau.max():.2f}")
    print(f"carina detail: {detail['bytes']} B")
    return 0


def check() -> int:
    if not (LIGHT.exists() and DEPTH.exists() and MANIFEST.exists()):
        print("STALE   site/images/deep/carina/ or site/data/deep/carina-front.bin: run python3 scripts/build_deep_carina.py")
        return 1
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bad = []
    if m["light"]["sha256"] != sha(LIGHT):
        bad.append("carina-light.webp is not the bake's")
    if not DETAIL.exists() or (m.get("detail") or {}).get("sha256") != sha(DETAIL):
        bad.append("carina-detail.webp is not the bake's")
    if m["depth"]["sha256"] != sha(DEPTH):
        bad.append("carina-front.bin is not the bake's")
    if m.get("from_sha256") != sha(SRC):
        bad.append("the photograph changed since the bake")
    if m.get("params") != json.loads(json.dumps(params())):
        bad.append("registry/deepsky-heroes/carina.yaml (or the photograph's row) changed since the bake")
    if bad:
        for b in bad:
            print("STALE   " + b + ": run python3 scripts/build_deep_carina.py")
        return 1
    print(f"carina light, detail and wall ok: {m['light']['bytes']} + {m['detail']['bytes']} + {m['depth']['bytes']} B from {m['from']} and {m['detail']['from']}")
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else bake())
