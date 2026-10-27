#!/usr/bin/env python3
"""The emission nebulae's heroes: each one's light, the sharp light round its heart and the depth of its glowing walls
(release 1.4.0 stage r14-neb-a, internal spec 0078: "no photographs, realistic 3D"). One bake for every hero whose
profile says `made_by: scripts/build_deep_emission.py` (registry/deepsky-heroes/<id>.yaml); scene/deep/emission.js
draws them all, one technique with many profiles, as orion.js and carina.js are one technique with two.

    python3 scripts/build_deep_emission.py [id ...] [--large=<dir>]   bake (all, or the ids named); <dir> holds the
                                    archives' large JPEGs the sharp maps are cut from (not in git: each profile's
                                    `light.detail.url`); without it a sharp map already baked is kept when it is current
    python3 scripts/build_deep_emission.py --check                     the outputs match their manifest and profiles

WHY. A nebula's photograph is the record of its LIGHT, and it is the only measurement of that light at every point of
the sky we have; its SHAPE in depth is what a photograph cannot give. So, as for Orion and Carina, the light is the
photograph with its stars taken out, and the shape is a reconstruction from what the papers in each profile measured
(a blister, a cavity, a shell, a bright bar): the hero draws that light ON the reconstructed walls, so that from our
side it IS the photograph's light and turned it is that light at its reconstructed depth. Nothing flat is drawn.

WHAT IT WRITES, PER HERO (the layout of scripts/build_deep_carina.py, so orion.js readFront reads the walls):
  <light.file>         the photograph with its stars taken out (a star is not on a wall: the hero draws the bright ones)
  <light.detail.file>  (when the profile asks) the SHARP light round the nebula's heart: the same photograph from the
                       archive's large JPEG, a square, its stars out, its colours and levels the small map's
  <light.depth>        a grid on the PHOTOGRAPH'S OWN (u, v) (v up, row 0 the bottom), four half floats a cell after a
                       16-byte header (b"SROR", u16 version, u16 nx, u16 ny, u16 channels, 6 spare):
                         R  the FAR wall's height z in light-years (z toward the Sun, the record's place at 0; <= 0)
                         G  the cloud's column behind it, 0 to 1
                         B  the dust's optical depth on our line, 0 to tau_max
                         A  the NEAR cap's height z (>= 0; 0 where there is none): the near side of a shell or a
                            bubble, which carries `front.near.share` of the light where it stands clear (emission.js)
  site/images/deep/nebulae/manifest.json   per hero: the SHA-256s, the inputs' SHA-256s and the parameters used.

HOW THE WALLS ARE MADE (the profile's part `front`; every number is there and each is said to be measured or not).
  1. LOBES: each an ellipse on the sky (its semi-axes along and across its position angle) whose far wall is
     z = -depth f(q), q the elliptical radius (1 at its rim), f = cos(pi/2 q) (a bowl) or sqrt(1 - q^2) (a sphere's
     far half); joined to each other and to the plane z = outside_ly (the cloud the nebula is carved from) by a smooth
     minimum over blend_ly.
  2. RELIEF (as Carina's): where the photograph is locally brighter than round it, the wall is nearer the stars, by
     (fine / wide)^-power (at most e^max_ln either way, at most max_ly): a front lit from outside is brighter where it
     is nearer its stars (S ~ r^-2). Illustrative, and said so.
  3. NEAR CAPS (a shell's or a bubble's side toward us): z = +height f(q) inside each cap's ellipse, 0 outside.
  4. Both smoothed and their slopes held under 1.6 so that on our line no part is dimmed (orion.js caps the limb's
     1 / |cos| at 2, which a slope of 1.73 reaches).
THE CLOUD: the light blurred over blur_arcmin, as a column 0 to 1. THE DUST: inside each lane (a polyline with a
half-width) and each blob (an ellipse), ln(brightest surroundings / here) of the photograph's light, at most tau_max:
the darkness taken as the dust's absorption, given back to the walls and taken again on our line (orion.js's Veil).
"""
from __future__ import annotations

import hashlib
import json
import math
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_deep_carina import remove_stars  # noqa: E402  (the same star removal as Carina's and Orion's)

HEROES = ROOT / "registry" / "deepsky-heroes"
NEBULAE = ROOT / "registry" / "nebulae.yaml"
MANIFEST = ROOT / "site" / "images" / "deep" / "nebulae" / "manifest.json"
ME = "scripts/build_deep_emission.py"
VERSION = 1


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def profiles() -> dict:
    """The profiles this script bakes: id -> the YAML document."""
    import yaml

    out = {}
    for p in sorted(HEROES.glob("*.yaml")):
        doc = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
        light = next((l for l in doc.get("layers") or [] if l.get("part") == "light"), None)
        if light and light.get("made_by") == ME:
            out[doc["id"]] = doc
    return out


def part(doc: dict, name: str) -> dict:
    return next((l for l in doc["layers"] if l.get("part") == name), {})


def params(doc: dict) -> dict:
    """The numbers the bake uses, from the profile alone (the photograph's frame is copied into it, so a row taken out
    of registry/nebulae.yaml does not move a hero)."""
    light, front, cloud, dust = part(doc, "light"), part(doc, "front"), part(doc, "cloud"), part(doc, "dust")
    keep = lambda d, ks: {k: d[k] for k in ks if k in d}
    return {
        "distance_ly": doc["frame"]["distance_ly"],
        "origin": [doc["frame"]["ra_deg"], doc["frame"]["dec_deg"]],
        "picture": keep(light["picture"], ("id", "file", "ra_deg", "dec_deg", "width_arcmin", "height_arcmin", "north_deg")),
        "stars_out": light.get("stars_out") or {},
        "front": keep(front, ("lobes", "blend_ly", "outside_ly", "near", "relief", "grid")),
        "cloud": keep(cloud, ("blur_arcmin",)),
        "dust": keep(dust, ("lanes", "blobs", "tau_max")),
        "stars": [keep(s, ("ra_deg", "dec_deg", "v_mag")) for s in part(doc, "stars").get("stars") or []],
        "cores": [keep(c, ("ra_deg", "dec_deg", "core_arcmin")) for c in part(doc, "clusters").get("clusters") or []],
        "detail": light.get("detail"),
    }


def sky_offset(p: dict, ra: float, dec: float) -> tuple[float, float]:
    """(west, north) of a sky place from the record's place, arcmin (tangent plane, small field)."""
    ra0, dec0 = p["origin"]
    return (-(ra - ra0) * math.cos(math.radians(dec0)) * 60.0, (dec - dec0) * 60.0)


def uv_map(p: dict):
    """The photograph's (u, v) of a sky offset (west, north) in arcmin from the origin (orion.js uvOf's arithmetic)."""
    pic = p["picture"]
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])
    r = math.radians(pic.get("north_deg") or 0.0)
    W, H = pic["width_arcmin"], pic["height_arcmin"]

    def to_uv(w, n):
        dw, dn = w - cw, n - cn
        return 0.5 + (dw * math.cos(r) - dn * math.sin(r)) / W, 0.5 + (dw * math.sin(r) + dn * math.cos(r)) / H

    return to_uv


def fill_bright(a, p: dict, to_px):
    """The brightest stars' glare is wider than a median takes out: a disc round each profile star brighter than V 8.5,
    and round each compact cluster core, is filled from its rim inward (a harmonic fill), so the wall carries the gas's
    light and the hero draws the star itself (build_deep_carina.py fill_bright, from the profile)."""
    import numpy as np
    from PIL import Image, ImageFilter

    stars = [s for s in p["stars"] if s["v_mag"] <= 8.5]
    stars += [{"ra_deg": c["ra_deg"], "dec_deg": c["dec_deg"], "v_mag": 6.6} for c in p["cores"] if c.get("core_arcmin", 9) < 1]
    h, w = a.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    mask = np.zeros((h, w), bool)
    for st in stars:
        sw, sn = sky_offset(p, st["ra_deg"], st["dec_deg"])
        x, y = to_px(sw, sn)
        r_arc = 0.2 + 0.2 * max(0.0, 8.5 - st["v_mag"])
        rx, _ = to_px(sw - r_arc, sn)
        r = max(2.0, abs(rx - x))
        mask |= (xx - x) ** 2 + (yy - y) ** 2 <= r * r
    if not mask.any():
        return a, mask
    out = a.copy()
    for _ in range(200):
        b = np.asarray(Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).filter(ImageFilter.BoxBlur(3))).astype(np.float32)
        out[mask] = b[mask]
    return out, mask


def bake_detail(doc: dict, p: dict, large: Path, light_small) -> dict:
    """The sharp light round the nebula's heart: the archive's large JPEG of the same photograph, a square of
    `size_arcmin` centred `centre_west/north_arcmin` from the record's place, its stars taken out, and its colour and
    levels the small light map's at `level_arcmin`: detail = sharp x (small blurred / sharp blurred)."""
    import numpy as np
    from PIL import Image, ImageFilter

    Image.MAX_IMAGE_PIXELS = None
    D = p["detail"]
    pic = p["picture"]
    im = Image.open(large).convert("RGB")
    W, H = im.size
    to_uv = uv_map(p)
    half = D["size_arcmin"] / 2
    uc, vc = to_uv(D["centre_west_arcmin"], D["centre_north_arcmin"])
    du, dv = half / pic["width_arcmin"], half / pic["height_arcmin"]
    box = [uc - du, vc - dv, uc + du, vc + dv]
    crop = im.crop((round(box[0] * W), round((1 - box[3]) * H), round(box[2] * W), round((1 - box[1]) * H)))
    n = D["px"]
    a = np.asarray(crop.resize((n, n), Image.LANCZOS)).astype(np.float32)
    out, mask = remove_stars(a, 21, 11, 20.0, 70.0)
    to_box = lambda w_, n_: ((to_uv(w_, n_)[0] - box[0]) / (box[2] - box[0]) * n, (1 - (to_uv(w_, n_)[1] - box[1]) / (box[3] - box[1])) * n)
    out, bmask = fill_bright(out, p, to_box)
    mask = mask | bmask
    sharp = np.clip(out, 0, 255) / 255.0
    L = Image.fromarray(light_small)
    lw, lh = L.size
    low = np.asarray(L.transform((n, n), Image.EXTENT, (box[0] * lw, (1 - box[3]) * lh, box[2] * lw, (1 - box[1]) * lh), Image.BICUBIC)).astype(np.float64) / 255.0
    rad = D["level_arcmin"] / D["size_arcmin"] * n
    gb = lambda x: np.asarray(Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(rad))).astype(np.float64) / 255.0
    ratio = np.clip((gb(low) + 0.02) / (gb(sharp) + 0.02), 0.25, 4.0)
    detail = np.clip(sharp * ratio, 0, 1)
    out_p = ROOT / D["file"]
    out_p.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray((detail * 255 + 0.5).astype(np.uint8)).save(out_p, "WEBP", quality=D["quality"], method=6)
    return {"file": D["file"], "bytes": out_p.stat().st_size, "sha256": sha(out_p), "uv_box": [round(x, 6) for x in box],
            "size": [n, n], "stars_removed_px": int(mask.sum()), "from": D["url"], "from_sha256": sha(large)}


def blur_fn(px_arcmin: float):
    import numpy as np

    def blur(x, arcmin):
        s = max(0.5, arcmin / px_arcmin)
        k = int(math.ceil(3 * s))
        g = np.exp(-0.5 * (np.arange(-k, k + 1) / s) ** 2)
        g /= g.sum()
        y = np.pad(x, ((0, 0), (k, k)), mode="reflect")
        y = np.stack([np.convolve(r, g, mode="valid") for r in y])
        y = np.pad(y, ((k, k), (0, 0)), mode="reflect")
        return np.stack([np.convolve(c, g, mode="valid") for c in y.T]).T

    def maxf(x, arcmin):
        k = max(1, int(round(arcmin / px_arcmin / 2)))
        y = x.copy()
        for axis in (0, 1):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (k, k)
            z = np.pad(y, pad, mode="edge")
            y = np.max(np.stack([np.take(z, range(i, i + y.shape[axis]), axis=axis) for i in range(2 * k + 1)]), axis=0)
        return y

    return blur, maxf


def ellipse_q(Wm, Nm, e: dict):
    """The elliptical radius of every cell in an ellipse {centre_west_arcmin, centre_north_arcmin, along_arcmin,
    across_arcmin, pa_deg} (pa: the `along` axis, east of north)."""
    import numpy as np

    pa = math.radians(e.get("pa_deg", 0.0))
    aW, aN = -math.sin(pa), math.cos(pa)
    dW, dN = Wm - e["centre_west_arcmin"], Nm - e["centre_north_arcmin"]
    s = (dW * aW + dN * aN) / e["along_arcmin"]
    t = (dW * aN - dN * aW) / e["across_arcmin"]
    return np.hypot(s, t)


def profile_f(q, shape: str):
    import numpy as np

    qc = np.minimum(q, 1.0)
    return np.sqrt(np.maximum(0.0, 1 - qc * qc)) if shape == "sphere" else np.cos(0.5 * math.pi * qc)


def walls(p: dict, Wm, Nm, at, fine, wide, cell_x, cell_y):
    """The far wall (R) and the near caps (A) on the grid, in light-years. Pure but for numpy."""
    import numpy as np

    F = p["front"]
    k = float(F.get("blend_ly", 6.0))

    def smin(a, b):
        h = np.clip(0.5 + 0.5 * (b - a) / k, 0, 1)
        return b * (1 - h) + a * h - k * h * (1 - h)

    z = np.full(Wm.shape, float(F.get("outside_ly", 0.0)))
    for L in F["lobes"]:
        z = smin(z, -L["depth_ly"] * profile_f(ellipse_q(Wm, Nm, L), L.get("shape", "cos")))
    z = np.minimum(z, 0.0)
    R = F.get("relief")
    if R:
        qr = np.log(np.maximum(at(fine), 1e-6) / np.maximum(at(wide), 1e-6))
        q = np.clip((at(wide) / np.percentile(at(wide), 90) - 0.05) / 0.25, 0, 1)
        lit = q * q * (3 - 2 * q)
        kk = R["max_ln"] * np.tanh(-R["power"] * qr / R["max_ln"]) * lit
        z = z + R["max_ly"] * np.tanh(z * (np.exp(kk) - 1) / R["max_ly"])
    near = np.zeros(Wm.shape)
    for C in (F.get("near") or {}).get("caps") or []:
        near = np.maximum(near, C["height_ly"] * profile_f(ellipse_q(Wm, Nm, C), C.get("shape", "sphere")) * (ellipse_q(Wm, Nm, C) < 1))

    def smooth_grid(g, n=1):
        for _ in range(n):
            h = np.pad(g, 1, mode="edge")
            g = (4 * h[1:-1, 1:-1] + h[:-2, 1:-1] + h[2:, 1:-1] + h[1:-1, :-2] + h[1:-1, 2:]) / 8
        return g

    def tame(g):
        g = smooth_grid(g, 2)
        for _ in range(400):
            gy, gx = np.gradient(g, cell_y, cell_x)
            if np.hypot(gx, gy).max() < 1.55:
                break
            steep = smooth_grid((np.hypot(gx, gy) > 1.4).astype(float), 4) > 0.01
            g = np.where(steep, smooth_grid(g, 2), g)
        gy, gx = np.gradient(g, cell_y, cell_x)
        return g, float(np.hypot(gx, gy).max())

    z, slope = tame(z)
    near, slope_n = tame(near) if near.any() else (near, 0.0)
    return np.minimum(z, 0.0), np.maximum(near, 0.0), slope, slope_n


def bake_one(doc: dict, large_dir: Path | None, old: dict | None) -> dict:
    import numpy as np
    from PIL import Image

    p = params(doc)
    light = part(doc, "light")
    src = ROOT / p["picture"]["file"]
    LIGHT, DEPTH = ROOT / light["file"], ROOT / light["depth"]
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    so = {"big": 15, "small": 9, "thresh": 18.0, "bright": 60.0, **p["stars_out"]}
    out, mask = remove_stars(a, so["big"], so["small"], so["thresh"], so["bright"], big_pass=False)
    to_uv = uv_map(p)
    h0, w0 = a.shape[:2]
    out, bmask = fill_bright(out, p, lambda w_, n_: (to_uv(w_, n_)[0] * w0, (1 - to_uv(w_, n_)[1]) * h0))
    mask = mask | bmask
    LIGHT.parent.mkdir(parents=True, exist_ok=True)
    small = np.clip(out, 0, 255).astype(np.uint8)
    Image.fromarray(small).save(LIGHT, "WEBP", quality=88, method=6)
    back = np.asarray(Image.open(LIGHT).convert("RGB")).astype(np.float64) / 255.0
    lum = (0.2126 * back[..., 0] + 0.7152 * back[..., 1] + 0.0722 * back[..., 2]) ** 2.2
    Hpx, Wpx = lum.shape
    pic = p["picture"]
    blur, maxf = blur_fn(pic["width_arcmin"] / Wpx)
    F = p["front"]
    R = F.get("relief") or {"fine_arcmin": 0.6, "wide_arcmin": 5.0}
    fine, wide = blur(lum, R["fine_arcmin"]), blur(lum, R["wide_arcmin"])
    cloudmap = blur(lum, p["cloud"]["blur_arcmin"])
    ref = blur(maxf(blur(lum, R["fine_arcmin"]), 3.0 * R["fine_arcmin"] / 0.6), 2.0 * R["fine_arcmin"] / 0.6)
    nx, ny = F["grid"]
    lyA = p["distance_ly"] * math.pi / (180 * 60)
    U, V = np.meshgrid((np.arange(nx) + 0.5) / nx, (np.arange(ny) + 0.5) / ny)
    r = math.radians(pic.get("north_deg") or 0.0)
    cw, cn = sky_offset(p, pic["ra_deg"], pic["dec_deg"])
    right, up = (U - 0.5) * pic["width_arcmin"], (V - 0.5) * pic["height_arcmin"]
    Wm = cw + right * math.cos(r) + up * math.sin(r)
    Nm = cn - right * math.sin(r) + up * math.cos(r)

    def at(img):
        fx, fy = U * Wpx - 0.5, (1 - V) * Hpx - 0.5
        x0 = np.clip(np.floor(fx).astype(int), 0, Wpx - 2)
        y0 = np.clip(np.floor(fy).astype(int), 0, Hpx - 2)
        tx, ty = np.clip(fx - x0, 0, 1), np.clip(fy - y0, 0, 1)
        return (img[y0, x0] * (1 - tx) * (1 - ty) + img[y0, x0 + 1] * tx * (1 - ty) + img[y0 + 1, x0] * (1 - tx) * ty + img[y0 + 1, x0 + 1] * tx * ty)

    z, near, slope, slope_n = walls(p, Wm, Nm, at, fine, wide, pic["width_arcmin"] / nx * lyA, pic["height_arcmin"] / ny * lyA)
    c = at(cloudmap)
    c = 0.05 + 0.95 * np.clip(c / np.percentile(c, 98), 0, 1) ** 1.3
    Dd = p["dust"]

    def smooth(x, a_, b_):
        q = np.clip((x - a_) / (b_ - a_), 0, 1)
        return q * q * (3 - 2 * q)

    mask_d = np.zeros(Wm.shape)
    for lane in Dd.get("lanes") or []:
        pts = lane["points"]
        dist = np.full(Wm.shape, 1e9)
        for (w0_, n0), (w1, n1) in zip(pts[:-1], pts[1:]):
            ex, ey = w1 - w0_, n1 - n0
            tt = np.clip(((Wm - w0_) * ex + (Nm - n0) * ey) / (ex * ex + ey * ey), 0, 1)
            dist = np.minimum(dist, np.hypot(Wm - (w0_ + tt * ex), Nm - (n0 + tt * ey)))
        mask_d = np.maximum(mask_d, 1 - smooth(dist / lane["half_width_arcmin"], 0.7, 1.0))
    for b in Dd.get("blobs") or []:
        mask_d = np.maximum(mask_d, 1 - smooth(ellipse_q(Wm, Nm, b), 0.6, 1.0))
    tau = np.clip(np.log(np.maximum(at(ref), 1e-6) / np.maximum(at(fine), 1e-6)), 0, Dd.get("tau_max", 1.0)) * mask_d
    h = np.pad(tau, 1, mode="edge")
    tau = (4 * h[1:-1, 1:-1] + h[:-2, 1:-1] + h[2:, 1:-1] + h[1:-1, :-2] + h[1:-1, 2:]) / 8
    data = np.stack([z, c, tau, near], axis=-1).astype("<f2")
    DEPTH.parent.mkdir(parents=True, exist_ok=True)
    DEPTH.write_bytes(b"SROR" + struct.pack("<HHHH", VERSION, nx, ny, 4) + b"\0" * 4 + data.tobytes())
    detail = None
    if p["detail"]:
        name = p["detail"]["url"].rsplit("/", 1)[-1]
        large = large_dir / name if large_dir else None
        if large and large.exists():
            detail = bake_detail(doc, p, large, small)
        elif old and old.get("detail") and (ROOT / p["detail"]["file"]).exists() and old["detail"].get("sha256") == sha(ROOT / p["detail"]["file"]) and old.get("params", {}).get("detail") == p["detail"]:
            detail = old["detail"]
        else:
            raise SystemExit(f"REFUSED {doc['id']}: its sharp map needs {p['detail']['url']} (not in git): download it and run with --large=<its folder>")
    entry = {
        "light": {"file": light["file"], "bytes": LIGHT.stat().st_size, "sha256": sha(LIGHT), "stars_removed_px": int(mask.sum()), "size": [Wpx, Hpx]},
        "depth": {"file": light["depth"], "bytes": DEPTH.stat().st_size, "sha256": sha(DEPTH), "grid": [nx, ny],
                  "z_ly": [round(float(z.min()), 3), round(float(z.max()), 3)], "near_ly": round(float(near.max()), 3),
                  "max_slope": round(slope, 3), "max_slope_near": round(slope_n, 3), "dust_tau_max": round(float(tau.max()), 3)},
        "detail": detail,
        "from": p["picture"]["file"], "from_sha256": sha(src),
        "params": json.loads(json.dumps(p)),
        "credit": f"{light['credit']}; stars removed and depth reconstructed by Space Radar ({ME})",
    }
    print(f"{doc['id']}: light {entry['light']['bytes']} B ({entry['light']['stars_removed_px']} star px), walls {entry['depth']['bytes']} B "
          f"z {entry['depth']['z_ly']} near {entry['depth']['near_ly']} slope {entry['depth']['max_slope']}/{entry['depth']['max_slope_near']} tau {entry['depth']['dust_tau_max']}"
          + (f", detail {detail['bytes']} B" if detail else ""))
    return entry


def bake(argv) -> int:
    docs = profiles()
    ids = [a for a in argv if not a.startswith("--")] or list(docs)
    large = next((Path(a.split("=", 1)[1]) for a in argv if a.startswith("--large=")), None)
    man = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    # each hero in its own process (the bakes are independent; the manifest is written once, after)
    from multiprocessing import Pool

    with Pool(min(len(ids), 8)) as pool:
        for i, entry in zip(ids, pool.starmap(bake_one, [(docs[i], large, man.get(i)) for i in ids])):
            man[i] = entry
    man = {k: man[k] for k in sorted(man) if k in docs}
    MANIFEST.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST.write_text(json.dumps(man, indent=2) + "\n", encoding="utf-8")
    return 0


def check() -> int:
    import yaml

    docs = profiles()
    man = json.loads(MANIFEST.read_text(encoding="utf-8")) if MANIFEST.exists() else {}
    rows = {r["id"]: r for r in (yaml.safe_load(NEBULAE.read_text(encoding="utf-8")) or {}).get("pictures") or []} if NEBULAE.exists() else {}
    bad = []
    for i, doc in docs.items():
        m = man.get(i)
        if not m:
            bad.append(f"{i}: not baked")
            continue
        for k in ("light", "depth", "detail"):
            e = m.get(k)
            if e and (not (ROOT / e["file"]).exists() or sha(ROOT / e["file"]) != e["sha256"]):
                bad.append(f"{i}: {e['file']} is not the bake's")
        if m.get("params") != json.loads(json.dumps(params(doc))):
            bad.append(f"{i}: registry/deepsky-heroes/{i}.yaml changed since the bake")
        src = ROOT / m["from"]
        # The photograph is the light's source; a stage may take it out of the scene, and its file with it: the hero's
        # light map is its own file, so only a CHANGED photograph is stale, not a missing one.
        if src.exists() and sha(src) != m["from_sha256"]:
            bad.append(f"{i}: the photograph {m['from']} changed since the bake")
        pic, row = params(doc)["picture"], rows.get(params(doc)["picture"]["id"])
        if row and any(abs(float(row[k] or 0) - float(pic[k] or 0)) > 1e-6 for k in ("ra_deg", "dec_deg", "width_arcmin", "height_arcmin", "north_deg")):
            bad.append(f"{i}: the profile's copy of the photograph's frame differs from registry/nebulae.yaml's row")
    for b in bad:
        print(f"STALE   {b}: run python3 {ME}")
    if bad:
        return 1
    size = lambda i: sum((man[i].get(k) or {}).get("bytes", 0) for k in ("light", "depth", "detail"))
    print("emission nebulae ok: " + ", ".join(f"{i} {size(i)} B" for i in docs))
    return 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else bake(sys.argv[1:]))
