#!/usr/bin/env python3
"""The Orion hero's light and the depth of its front (internal spec 0076 stage W1-a, internal #782).

    python3 scripts/build_deep_orion.py            bake both files (PIL, numpy)
    python3 scripts/build_deep_orion.py --check    the outputs match their manifest, the photograph and the profile

WHY. The Orion Nebula is a BLISTER: a thin layer of ionised gas on the near face of the molecular cloud
OMC-1, lit by theta1 Ori C, which stands about 0.2 pc in front of it (Wen & O'Dell 1995; O'Dell 2001;
O'Dell et al. 2009). Its light is the photograph the app shows (ESO eso1723a); its shape is a sheet at
a depth behind or in front of the star that this script reconstructs, so scene/deep/orion.js can draw
the photograph's light ON that sheet: from our side the model is the photograph, turned it is that
light at its reconstructed depth.

WHAT IT WRITES.
  site/images/deep/orion/orion-light.webp   the photograph with its stars taken out (as build_deep_helix.py
                                            does: a star is not in the nebula, and drawn on a tilted sheet it
                                            would smear). The Trapezium and NU Ori are drawn as stars.
  site/data/deep/orion-front.bin            a 240 x 186 grid on the PHOTOGRAPH'S OWN (u, v) (v up, row 0 the
                                            bottom), four half floats a cell, little-endian, after a 16-byte
                                            header (b"SROR", u16 version, u16 nx, u16 ny, u16 channels, 6 spare):
                                              R  the front's height z in light-years (z toward the Sun, theta1 Ori C at 0)
                                              G  the cloud's column behind it, 0 to 1
                                              B  the Veil's optical depth on our line (the Dark Bay), 0 to tau_max
                                              A  1 (spare)
  site/images/deep/orion/manifest.json      both SHA-256s, the inputs' SHA-256s and the parameters used.

HOW THE FRONT IS MADE (registry/deepsky-heroes/orion.yaml, part `front`; every number is there).
  1. A bowl opening toward us, rho from theta1 Ori C on the sky:
       z = -d0 + slope (sqrt(rho_s^2 + rho^2) - rho_s),  d0 = 0.2 pc (measured), slope and rho_s illustrative;
     its rim held behind the Veil (z = rim tanh(z / rim) where z > 0).
  2. The Bright Bar: the front rises toward us across a band about 2 arcmin south-east of the star.
  3. RELIEF by Wen & O'Dell's rule: a part of the front lit by theta1 Ori C alone is brighter the nearer it is
     to the star (S ~ 1 / r^2, r ~ S^-1/2), so where the photograph is locally brighter than its surroundings
     the front's height is scaled toward the star's plane by (fine / wide)^-power (the factor at most
     e^max_ln either way, the change at most max_ly), none within from_ly of the star (where the 0.2 pc is measured) and all of it
     beyond full_ly. The photograph's values are display values; ^2.2 takes them roughly back to light.
     This is their rule, not their solution.
  4. M43: a dimple round NU Ori, depth_ly deep over radius_ly.
  5. Smoothed (one cell) and its slope held under 3, so that on our line no part of the sheet is dimmed.
THE CLOUD: the photograph's light blurred over blur_arcmin, as a column 0 to 1: the cloud is behind where
the nebula is. THE VEIL: inside the Dark Bay's ellipse, ln(surroundings / here) of the photograph's light,
at most tau_max: the darkness taken as the Veil's shadow, given back to the front and taken again on our line.
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "site" / "images" / "nebulae" / "m42.webp"
PROFILE = ROOT / "registry" / "deepsky-heroes" / "orion.yaml"
NEBULAE = ROOT / "registry" / "nebulae.yaml"
LIGHT = ROOT / "site" / "images" / "deep" / "orion" / "orion-light.webp"
DEPTH = ROOT / "site" / "data" / "deep" / "orion-front.bin"
MANIFEST = LIGHT.with_name("manifest.json")
VERSION = 1


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def params() -> dict:
    """The numbers the bake uses, from the profile and the photograph's row (both read as text by --check too)."""
    import yaml

    prof = yaml.safe_load(PROFILE.read_text(encoding="utf-8"))
    row = next(r for r in yaml.safe_load(NEBULAE.read_text(encoding="utf-8"))["pictures"] if r["id"] == "m42")
    parts = {l["part"]: l for l in prof["layers"]}
    return {
        "distance_ly": prof["frame"]["distance_ly"],
        "star": [prof["frame"]["ra_deg"], prof["frame"]["dec_deg"]],
        "picture": {k: row[k] for k in ("ra_deg", "dec_deg", "width_arcmin", "height_arcmin", "north_deg")},
        "front": {k: parts["front"][k] for k in ("star_in_front_pc", "bowl", "bar", "relief", "grid")},
        "m43": {"star": [parts["m43"]["star"]["ra_deg"], parts["m43"]["star"]["dec_deg"]], **parts["m43"]["dimple"]},
        "cloud": {k: parts["cloud"][k] for k in ("blur_arcmin",)},
        "veil": parts["veil"]["dark_bay"],
    }


def sky_offset(p: dict, ra: float, dec: float) -> tuple[float, float]:
    """(west, north) of a sky place from theta1 Ori C, arcmin (tangent plane, small field)."""
    ra0, dec0 = p["star"]
    return (-(ra - ra0) * math.cos(math.radians(dec0)) * 60.0, (dec - dec0) * 60.0)


def uv_map(p: dict):
    """The photograph's (u, v) of a sky offset (west, north) in arcmin from the star, and the inverse."""
    pic = p["picture"]
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])  # the picture's centre from the star
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


def bake() -> int:
    import numpy as np
    from PIL import Image, ImageFilter

    p = params()
    im = Image.open(SRC).convert("RGB")
    # --- 1. the light: the stars taken out (build_deep_helix.py's two passes)
    a = np.asarray(im).astype(np.float32)
    med = np.asarray(im.filter(ImageFilter.MedianFilter(9))).astype(np.float32)
    star = (a.mean(axis=2) - med.mean(axis=2)) > 18.0
    m = Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = np.asarray(m) > 0
    out = a.copy()
    out[mask] = med[mask]
    near = np.asarray(m.filter(ImageFilter.MaxFilter(13))) > 0
    im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(21))).astype(np.float32)
    halo = near & ((out.mean(axis=2) - med2.mean(axis=2)) > 6.0)
    halo = (np.asarray(Image.fromarray((halo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0) & near
    out[halo] = med2[halo]
    mask = mask | halo
    LIGHT.parent.mkdir(parents=True, exist_ok=True)
    light = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(light).save(LIGHT, "WEBP", quality=88, method=6)
    # what the app will sample (the WebP's own pixels), as light: display ^ 2.2, luminance
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
    ref = blur(maxf(fine, 2.5), 1.5)

    # --- 2. the grid on (u, v), v up, row 0 at v = 0 (the bottom, south)
    nx, ny = F["grid"]
    to_uv, from_uv = uv_map(p)
    ly_per_arcmin = p["distance_ly"] * math.pi / (180 * 60)
    u = (np.arange(nx) + 0.5) / nx
    v = (np.arange(ny) + 0.5) / ny
    U, V = np.meshgrid(u, v)
    pic_r = math.radians(pic.get("north_deg") or 0.0)
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])
    right, up = (U - 0.5) * pic["width_arcmin"], (V - 0.5) * pic["height_arcmin"]
    Wm = cw + right * math.cos(pic_r) + up * math.sin(pic_r)   # west, arcmin from the star
    Nm = cn - right * math.sin(pic_r) + up * math.cos(pic_r)   # north
    X, Y = Wm * ly_per_arcmin, Nm * ly_per_arcmin
    rho = np.hypot(X, Y)

    def at(img):
        """The photograph-grid image sampled at the cells (bilinear; image row 0 is the TOP)."""
        fx = U * Wpx - 0.5
        fy = (1 - V) * Hpx - 0.5
        x0 = np.clip(np.floor(fx).astype(int), 0, Wpx - 2)
        y0 = np.clip(np.floor(fy).astype(int), 0, Hpx - 2)
        tx, ty = np.clip(fx - x0, 0, 1), np.clip(fy - y0, 0, 1)
        return (img[y0, x0] * (1 - tx) * (1 - ty) + img[y0, x0 + 1] * tx * (1 - ty)
                + img[y0 + 1, x0] * (1 - tx) * ty + img[y0 + 1, x0 + 1] * tx * ty)

    d0 = F["star_in_front_pc"] * 3.26156
    B = F["bowl"]
    z = -d0 + B["slope"] * (np.sqrt(B["rho_s_ly"] ** 2 + rho ** 2) - B["rho_s_ly"])
    # the rim stays behind the Veil: a soft cap at rim_ly
    z = np.where(z > 0, B["rim_ly"] * np.tanh(z / B["rim_ly"]), z)
    # the Bright Bar: across a band whose normal points to normal_pa_deg (east of north), offset_arcmin out
    bar = F["bar"]
    pa = math.radians(bar["normal_pa_deg"])
    nW, nN = -math.sin(pa), math.cos(pa)          # east of north -> (west, north)
    s = (Wm * nW + Nm * nN - bar["offset_arcmin"]) / bar["width_arcmin"]
    t = (-Wm * nN + Nm * nW) / (bar["length_arcmin"] / 2)

    def smooth(x, a, b):
        q = np.clip((x - a) / (b - a), 0, 1)
        return q * q * (3 - 2 * q)

    # a step up across the bar that levels off a few widths beyond it and fades along it: no strip to the frame's edge
    # (an elliptical window, so the plateau has no corners)
    z = z + bar["rise_ly"] * smooth(s, -0.5, 0.5) * (1 - smooth(np.hypot(t, np.maximum(s - 0.5, 0) / 4.0), 0.5, 1.5))
    # relief: Wen & O'Dell's rule (r ~ S^-1/2): where the light is locally brighter than round it the front is
    # nearer the star, so its height is scaled toward the star's plane (and away where it is darker)
    R = F["relief"]
    q = np.log(np.maximum(at(fine), 1e-6) / np.maximum(at(wide), 1e-6))
    # soft limits (tanh), and only where there is light to read: in the dark the ratio is noise
    lit = smooth(at(wide) / np.percentile(at(wide), 90), 0.05, 0.3)
    k = R["max_ln"] * np.tanh(-R["power"] * q / R["max_ln"]) * smooth(rho, R["from_ly"], R["full_ly"]) * lit
    z = z + R["max_ly"] * np.tanh(z * (np.exp(k) - 1) / R["max_ly"])
    # M43: a dimple round NU Ori
    M = p["m43"]
    mw, mn = sky_offset(p, *M["star"])
    r43 = np.hypot(X - mw * ly_per_arcmin, Y - mn * ly_per_arcmin) / M["radius_ly"]
    z = z - M["depth_ly"] * (1 - smooth(r43, 0.0, 1.0))
    # smooth one cell, then keep the slope under 3 (more smoothing where needed)
    cell = (pic["width_arcmin"] / nx) * ly_per_arcmin

    def smooth_grid(g, n=1):
        for _ in range(n):
            h = np.pad(g, 1, mode="edge")
            g = (4 * h[1:-1, 1:-1] + h[:-2, 1:-1] + h[2:, 1:-1] + h[1:-1, :-2] + h[1:-1, 2:]) / 8
        return g

    z = smooth_grid(z, 2)
    centre = (to_uv(0.0, 0.0))
    for _ in range(40):
        gy, gx = np.gradient(z, (pic["height_arcmin"] / ny) * ly_per_arcmin, cell)
        slope = np.hypot(gx, gy)
        if slope.max() < 2.8:
            break
        steep = smooth_grid((slope > 2.5).astype(float), 2) > 0.01
        z = np.where(steep, smooth_grid(z, 1), z)
    # the measured 0.2 pc at the star: the one place the depth is pinned (bilinear at the star's (u, v))
    fx, fy = centre[0] * nx - 0.5, centre[1] * ny - 0.5
    ix, iy = int(math.floor(fx)), int(math.floor(fy))
    tx, ty = fx - ix, fy - iy
    zc = (z[iy, ix] * (1 - tx) * (1 - ty) + z[iy, ix + 1] * tx * (1 - ty) + z[iy + 1, ix] * (1 - tx) * ty + z[iy + 1, ix + 1] * tx * ty)
    pin = np.exp(-(rho / 0.8) ** 2)
    z = z + (-d0 - zc) * pin
    gy, gx = np.gradient(z, (pic["height_arcmin"] / ny) * ly_per_arcmin, cell)
    slope = np.hypot(gx, gy)
    # --- 3. the cloud's column and the Veil's Dark Bay
    c = at(cloudmap)
    c = np.clip(c / np.percentile(c, 98), 0, 1) ** 0.7
    c = 0.05 + 0.95 * c
    Vb = p["veil"]
    e = np.hypot((-Wm - Vb["east_arcmin"]) / Vb["a_arcmin"], (Nm - Vb["north_arcmin"]) / Vb["b_arcmin"])
    tau = np.clip(np.log(np.maximum(at(ref), 1e-6) / np.maximum(at(fine), 1e-6)), 0, Vb["tau_max"]) * (1 - smooth(e, 0.6, 1.0))
    tau = smooth_grid(tau, 1)
    data = np.stack([z, c, tau, np.ones_like(z)], axis=-1).astype("<f2")
    DEPTH.parent.mkdir(parents=True, exist_ok=True)
    DEPTH.write_bytes(b"SROR" + struct.pack("<HHHH", VERSION, nx, ny, 4) + b"\0" * 4 + data.tobytes())
    MANIFEST.write_text(json.dumps({
        "light": {"file": str(LIGHT.relative_to(ROOT)), "bytes": LIGHT.stat().st_size, "sha256": sha(LIGHT), "stars_removed_px": int(mask.sum()), "size": [Wpx, Hpx]},
        "depth": {"file": str(DEPTH.relative_to(ROOT)), "bytes": DEPTH.stat().st_size, "sha256": sha(DEPTH), "grid": [nx, ny],
                  "z_ly": [round(float(z.min()), 3), round(float(z.max()), 3)], "z_at_star_ly": round(float(-d0), 4),
                  "max_slope": round(float(slope.max()), 3), "veil_tau_max": round(float(tau.max()), 3)},
        "from": str(SRC.relative_to(ROOT)), "from_sha256": sha(SRC),
        "params": p,
        "credit": "ESO/G. Beccari (eso1723a), CC BY 4.0; stars removed and depth reconstructed by Space Radar (scripts/build_deep_orion.py)",
    }, indent=2) + "\n", encoding="utf-8")
    print(f"orion light: {LIGHT.relative_to(ROOT)} {LIGHT.stat().st_size} B, {int(mask.sum())} star pixels filled")
    print(f"orion front: {DEPTH.relative_to(ROOT)} {DEPTH.stat().st_size} B, z {z.min():.2f}..{z.max():.2f} ly, slope max {slope.max():.2f}, veil tau max {tau.max():.2f}")
    return 0


def check() -> int:
    if not (LIGHT.exists() and DEPTH.exists() and MANIFEST.exists()):
        print("STALE   site/images/deep/orion/ or site/data/deep/orion-front.bin: run python3 scripts/build_deep_orion.py")
        return 1
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bad = []
    if m["light"]["sha256"] != sha(LIGHT):
        bad.append("orion-light.webp is not the bake's")
    if m["depth"]["sha256"] != sha(DEPTH):
        bad.append("orion-front.bin is not the bake's")
    if m.get("from_sha256") != sha(SRC):
        bad.append("the photograph changed since the bake")
    if m.get("params") != json.loads(json.dumps(params())):
        bad.append("registry/deepsky-heroes/orion.yaml (or the photograph's row) changed since the bake")
    if bad:
        for b in bad:
            print("STALE   " + b + ": run python3 scripts/build_deep_orion.py")
        return 1
    print(f"orion light and front ok: {m['light']['bytes']} + {m['depth']['bytes']} B from {m['from']}")
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else bake())
