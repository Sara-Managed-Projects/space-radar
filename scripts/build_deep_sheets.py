#!/usr/bin/env python3
"""The maps of the remnants and the dust (internal spec 0076 stage W3-c, internal #784, #806): the light the remnants'
shells carry, and the light and the optical depth the dust sheets carry, baked from pictures the app already shows or
from NOIRLab's photographs of M78 and the Iris.

    $PY scripts/build_deep_sheets.py [--cache=dir]          bake site/images/deep/sheets/ (PIL, numpy, PyYAML)
    $PY scripts/build_deep_sheets.py --solve [--only=id]    where the NOIRLab pictures really are (2MASS, as build_nebulae.py)
    python3 scripts/build_deep_sheets.py --check            stdlib only: every output and its manifest match

WHAT EACH HERO GETS (registry/deepsky-heroes/<id>.yaml holds every number used here).
  crab, veil (scene/deep/remnant.js)   <id>-light.webp: the photograph with its stars taken out (build_deep_helix.py's
                                       rule), which the shell carries along our line of sight.
  horsehead, m78, iris                 <id>-light.webp and <id>-dust.webp on the same picture grid.
  (scene/deep/dustsheet.js)
  coalsack                             <id>-dust.webp only, on a tangent plane resampled from site/textures/4k/milky_way.webp.

THE RULE FOR DUST (the profile's `dust.rule`). The glow a dark cloud is seen against is the picture's upper ENVELOPE: the
brightest within `envelope_arcmin` (a grey dilation), smoothed over `blur_arcmin`. A point darker than `dark_below` of
the envelope is behind dust of optical depth tau = ln(dark_below x envelope / picture); lighter than that is not dust
(a glowing region varies by more than a factor of two on its own). Where the picture is darker than `cloud_below` of its
brightest glow, the cloud is at least `cloud_tau` thick (deep inside a cloud nothing lit is behind it to measure
against), and with `cloud_side` only beyond a line on the sky (the Horsehead's cloud lies east of IC 434's front). With
`background: galactic-latitude` (the Coalsack) the glow is not the envelope but the Milky Way map at the same galactic
latitude, the median over `window_deg` of longitude either side. For a reflection nebula the cloud BEHIND the lit dust is
`back_tau` wherever the light is at least `back_from` of its brightest. Under the dust the LIGHT behind is given back:
the picture times exp(tau), never more than dark_below x the envelope, in the envelope's colour where the picture is too
dark to have one; so on our line light x exp(-tau) is the picture again wherever the darkness is read from it.

THE ENCODING. Light: RGB, the picture's own display values. Dust: R = sqrt(tau_front / tau_max), G = sqrt(tau_back /
tau_max), B = 0, so small optical depths keep their precision; scene/deep/dustsheet.js decodes tau = tau_max x v^2.

THE CATALOGUE'S STARS (stars.json). A dust sheet dims what is drawn before it on the screen, the catalogue's stars
included, but a star IN FRONT of the cloud must not be dimmed. So for each dust hero this lists the catalogue's stars
(site/data/stars3d.bin) brighter than V = 8 inside the sheet's footprint, in the hero's sky frame (x west, y north, z
toward the Sun, ly from the record's place) with their absolute magnitude; each frame the hero keeps the dust off those
on the camera's side of it. A hero's own star that the catalogue also has (`catalogue: true`) is listed under `twins`
with the catalogue's place, so scene/starholes.js can hide that copy while the hero draws its own.
"""
from __future__ import annotations

import hashlib
import io
import json
import math
import struct
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HEROES = ROOT / "registry" / "deepsky-heroes"
OUT = ROOT / "site" / "images" / "deep" / "sheets"
MANIFEST = OUT / "manifest.json"
STARS = OUT / "stars.json"
DSO = ROOT / "site" / "data" / "dso.json"
STARS3D = ROOT / "site" / "data" / "stars3d.bin"
MILKY = ROOT / "site" / "textures" / "4k" / "milky_way.webp"
IDS = ("crab", "veil", "horsehead", "coalsack", "m78", "iris")
UA = "space-radar-build (+https://github.com/Sara-Managed-Projects/space-radar)"
NOIRLAB_SCREEN = "https://noirlab.edu/public/media/archives/images/screen/{image}.jpg"
NOIRLAB_LARGE = "https://noirlab.edu/public/media/archives/images/large/{image}.jpg"
HIPS2FITS = "https://alasky.cds.unistra.fr/hips-image-services/hips2fits"
OBLIQUITY = math.radians(23.4392911)
LIGHT_Q = 86
DUST_Q = 90


def arg(name: str, default: str = "") -> str:
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def profile(hid: str) -> dict:
    import yaml

    return yaml.safe_load((HEROES / f"{hid}.yaml").read_text(encoding="utf-8"))


def part(prof: dict, name: str) -> dict:
    return next((l for l in prof.get("layers") or [] if l.get("part") == name), {})


# ---------------------------------------------------------------------------------------- sky geometry

def ecliptic(ra: float, dec: float) -> tuple[float, float, float]:
    """A unit vector toward (ra, dec), J2000, in the app's sun-inertial frame (ecliptic J2000)."""
    a, d = math.radians(ra), math.radians(dec)
    x, y, z = math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)
    c, s = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    return (x, y * c + z * s, -y * s + z * c)


def sky_frame(u: tuple) -> tuple:
    """scene/deep/orion.js skyFrame: west, north and toward the Sun at the unit direction u (ecliptic)."""
    pole = (0.0, math.sin(OBLIQUITY), math.cos(OBLIQUITY))
    cr = lambda a, b: (a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0])
    nm = lambda v: tuple(c / math.sqrt(sum(x * x for x in v)) for c in v)
    east = nm(cr(pole, u))
    north = cr(u, east)
    return (tuple(-c for c in east), north, tuple(-c for c in u))


def tangent_offset(ra0: float, dec0: float, ra: float, dec: float) -> tuple[float, float]:
    """(west, north) of (ra, dec) from (ra0, dec0) in arcmin, gnomonic."""
    a0, d0, a, d = map(math.radians, (ra0, dec0, ra, dec))
    cosc = math.sin(d0) * math.sin(d) + math.cos(d0) * math.cos(d) * math.cos(a - a0)
    xi = math.cos(d) * math.sin(a - a0) / cosc            # east
    eta = (math.cos(d0) * math.sin(d) - math.sin(d0) * math.cos(d) * math.cos(a - a0)) / cosc
    return (-math.degrees(xi) * 60, math.degrees(eta) * 60)


def picture_uv(pic: dict, ra0: float, dec0: float):
    """The picture's (u, v) of a sky offset (west, north) in arcmin from (ra0, dec0): build_deep_orion.py uv_map."""
    cw, cn = tangent_offset(ra0, dec0, pic["ra_deg"], pic["dec_deg"])
    r = math.radians(pic.get("north_deg") or 0.0)
    W, H = pic["width_arcmin"], pic["height_arcmin"]

    def to_uv(w, n):
        dw, dn = w - cw, n - cn
        return 0.5 + (dw * math.cos(r) - dn * math.sin(r)) / W, 0.5 + (dw * math.sin(r) + dn * math.cos(r)) / H

    return to_uv


# -------------------------------------------------------------------------------------------- pictures

def remove_stars(a, above: float, grow: int):
    """build_deep_helix.py's rule: pixels brighter than their 9 x 9 median by `above`, grown by `grow` px, take the
    median; a second, wider pass round the stars found takes their halos. Returns (picture, mask)."""
    import numpy as np
    from PIL import Image, ImageFilter

    im = Image.fromarray(np.clip(a, 0, 255).astype(np.uint8))
    med = np.asarray(im.filter(ImageFilter.MedianFilter(9))).astype(np.float32)
    star = (a.mean(axis=2) - med.mean(axis=2)) > above
    m = Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(2 * grow + 1))
    mask = np.asarray(m) > 0
    out = a.copy()
    out[mask] = med[mask]
    near = np.asarray(m.filter(ImageFilter.MaxFilter(13))) > 0
    im2 = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(21))).astype(np.float32)
    halo = near & ((out.mean(axis=2) - med2.mean(axis=2)) > above * 0.35)
    halo = (np.asarray(Image.fromarray((halo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0) & near
    out[halo] = med2[halo]
    return out, mask | halo


def sky_to_black(im, levels=None):
    """build_nebulae.py's bake step 2: the picture's own sky to black (the darkest 4 % of a thumbnail, per channel),
    or the `levels` of the whole picture a crop was cut from (a crop inside a nebula has no sky of its own)."""
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_nebulae as bn

    bands = []
    for band, level in zip(im.split(), levels or bn.sky_level(im)):
        gain = 255.0 / (255 - level)
        bands.append(band.point([max(0, min(255, round((v - level) * gain))) for v in range(256)]))
    from PIL import Image

    return Image.merge("RGB", bands)


def fetch(url: str, timeout: int = 90) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": UA}), timeout=timeout) as r:
        return r.read()


def noirlab(image: str, large: bool = False):
    """The archive's screen rendition (or its large JPEG), cached under --cache (neither is kept in git)."""
    from PIL import Image

    Image.MAX_IMAGE_PIXELS = None
    cache = Path(arg("cache")) if arg("cache") else None
    path = cache / f"{image}{'-large' if large else ''}.jpg" if cache else None
    if path and path.exists():
        data = path.read_bytes()
    else:
        data = fetch((NOIRLAB_LARGE if large else NOIRLAB_SCREEN).format(image=image), timeout=300)
        if path:
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(data)
    return Image.open(io.BytesIO(data)).convert("RGB"), hashlib.sha256(data).hexdigest()


def resize_long(im, px: int):
    from PIL import Image

    w, h = im.size
    k = px / max(w, h)
    return im.resize((max(1, round(w * k)), max(1, round(h * k))), Image.LANCZOS)


def milky_way_tangent(pic: dict, n: int, im=None):
    """site/textures/4k/milky_way.webp (galactic, longitude increasing to the left, galactic SOUTH at the top:
    scene/starfield.js), or an array on its grid, resampled onto a tangent plane, north up, east left, bilinear."""
    import numpy as np
    from PIL import Image

    if im is None:
        im = np.asarray(Image.open(MILKY).convert("RGB")).astype(np.float64)
    if im.ndim == 2:
        im = im[..., None]
    H, W, _ = im.shape
    R = np.array([[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445],
                  [-0.8676661490, -0.1980763734, 0.4559837762]])
    j, i = np.mgrid[0:n, 0:n]
    xi = (0.5 - (i + 0.5) / n) * math.radians(pic["width_arcmin"] / 60)
    eta = (0.5 - (j + 0.5) / n) * math.radians(pic["height_arcmin"] / 60)
    a0, d0 = math.radians(pic["ra_deg"]), math.radians(pic["dec_deg"])
    rho = np.hypot(xi, eta)
    c = np.arctan(rho)
    srho = np.where(rho > 0, rho, 1.0)
    dec = np.arcsin(np.cos(c) * math.sin(d0) + np.where(rho > 0, eta * np.sin(c) * math.cos(d0) / srho, 0.0))
    ra = a0 + np.arctan2(xi * np.sin(c), rho * math.cos(d0) * np.cos(c) - eta * math.sin(d0) * np.sin(c))
    v = np.stack([np.cos(dec) * np.cos(ra), np.cos(dec) * np.sin(ra), np.sin(dec)], -1)
    g = v @ R.T
    lon = np.degrees(np.arctan2(g[..., 1], g[..., 0]))
    lat = np.degrees(np.arcsin(np.clip(g[..., 2], -1, 1)))
    x = ((0.5 - lon / 360) % 1) * W - 0.5
    y = (lat + 90) / 180 * H - 0.5
    x0 = np.floor(x).astype(int)
    y0 = np.clip(np.floor(y).astype(int), 0, H - 2)
    tx = (x - x0)[..., None]
    ty = np.clip(y - y0, 0, 1)[..., None]
    x1, x0 = (x0 + 1) % W, x0 % W
    return (im[y0, x0] * (1 - tx) + im[y0, x1] * tx) * (1 - ty) + (im[y0 + 1, x0] * (1 - tx) + im[y0 + 1, x1] * tx) * ty


# ------------------------------------------------------------------------------------------------ dust

def lin(a):
    return (a / 255.0) ** 2.2


def enc(l):
    import numpy as np

    return np.clip(l, 0, 1) ** (1 / 2.2) * 255.0


def max_filter(a, k: int):
    """A grey dilation over a k x k square (separable), edges by their own values."""
    import numpy as np
    from numpy.lib.stride_tricks import sliding_window_view as win

    r = k // 2
    b = np.pad(a, ((0, 0), (r, r)), mode="edge")
    b = win(b, k, axis=1).max(axis=-1)
    b = np.pad(b, ((r, r), (0, 0)), mode="edge")
    return win(b, k, axis=0).max(axis=-1)


def gaussian(a, sigma: float):
    """A Gaussian blur of standard deviation `sigma` px (separable, edges reflected)."""
    import numpy as np

    r = max(1, int(math.ceil(3 * sigma)))
    x = np.arange(-r, r + 1)
    w = np.exp(-0.5 * (x / sigma) ** 2)
    w /= w.sum()
    b = np.pad(a, ((0, 0), (r, r)), mode="reflect")
    b = sum(w[i] * b[:, i:i + a.shape[1]] for i in range(2 * r + 1))
    b = np.pad(b, ((r, r), (0, 0)), mode="reflect")
    return sum(w[i] * b[i:i + a.shape[0], :] for i in range(2 * r + 1))


def side_mask(rule: dict, pic: dict, ra0: float, dec0: float, shape):
    """`rule.cloud_side`: the deep-cloud rule holds only beyond a line on the sky, perpendicular to position angle
    `pa_deg` and `offset_arcmin` from the record's place along it (the Horsehead's cloud lies east of IC 434's front),
    softened over `soft_arcmin`. 1 where it holds. None without one."""
    import numpy as np

    cs = rule.get("cloud_side")
    if not cs:
        return None
    to_uv = picture_uv(pic, ra0, dec0)
    o, ex, ey = np.array(to_uv(0, 0)), np.array(to_uv(1, 0)), np.array(to_uv(0, 1))
    A = np.stack([ex - o, ey - o], 1)              # (u, v) per arcmin west and north
    Ai = np.linalg.inv(A)
    ny, nx = shape
    v, u = np.mgrid[0:ny, 0:nx]
    uu, vv = (u + 0.5) / nx, 1 - (v + 0.5) / ny
    w = Ai[0, 0] * (uu - o[0]) + Ai[0, 1] * (vv - o[1])
    n = Ai[1, 0] * (uu - o[0]) + Ai[1, 1] * (vv - o[1])
    pa = math.radians(cs["pa_deg"])
    d = w * -math.sin(pa) + n * math.cos(pa) - cs["offset_arcmin"]
    t = np.clip((d + cs["soft_arcmin"]) / (2 * cs["soft_arcmin"]), 0, 1)
    return t * t * (3 - 2 * t)


def dust_maps(rgb, rule: dict, tau_max: float, arcmin_px: float, background=None, side=None):
    """THE RULE (the module docstring). `rgb`: display values 0..255. `background`: the glow without the dust, if the
    caller has a model of it (the Milky Way at the same galactic latitude); else the picture's envelope. Returns (light
    display values, tau_front, tau_back), all on the picture's grid."""
    import numpy as np

    L = lin(rgb)
    lum = L @ np.array([0.2126, 0.7152, 0.0722])
    if rule.get("smooth_arcmin", 0) > 0:
        lum = gaussian(lum, rule["smooth_arcmin"] / arcmin_px)
    k = max(3, int(round(rule["envelope_arcmin"] / arcmin_px)) | 1)
    blur = max(0.5, rule["blur_arcmin"] / arcmin_px)

    def env_of(x):
        return gaussian(max_filter(x, k), blur)

    env = np.maximum(env_of(lum), lum) if background is None else np.maximum(background, 1e-9)
    f = float(rule["dark_below"])
    tiny = 1e-6
    tau = np.where(lum < f * env, np.log(np.maximum(f * env, tiny) / np.maximum(lum, tiny)), 0.0)
    # A dark sky with nothing lit round it is not dust: only where the envelope is a visible glow.
    glow = np.quantile(env, 0.995)
    tau *= np.clip((env / max(glow, tiny) - 0.02) / 0.06, 0, 1)
    if rule.get("cloud_below", 0) > 0:
        deep = gaussian((lum < rule["cloud_below"] * glow).astype(np.float64), blur)
        if side is not None:
            deep = deep * side
        tau = np.maximum(tau, rule["cloud_tau"] * deep)
    tau = np.clip(tau, 0, tau_max)
    # The light behind the dust, given back: the picture times exp(tau) in brightness (so on our line light x
    # exp(-tau) is the picture), its colour going over to the envelope's where the picture is too dark to have one.
    envrgb = np.maximum(np.stack([env_of(L[..., c]) for c in range(3)], -1), 1e-9)
    envlum = np.maximum(envrgb @ np.array([0.2126, 0.7152, 0.0722]), 1e-9)
    raw = np.maximum(L @ np.array([0.2126, 0.7152, 0.0722]), 1e-9)
    w = np.clip(tau / 0.7, 0, 1)[..., None]
    chroma = (L / raw[..., None]) * (1 - w) + (envrgb / envlum[..., None]) * w
    # never more than the glow round it (dark_below of the envelope): the deep-cloud rule's optical depth is not read
    # from the picture, and amplifying its noise by exp(tau) would paint a glow nobody measured
    given = np.minimum(raw * np.exp(tau), np.maximum(f * envlum, raw))
    light = np.where(tau[..., None] > 0, chroma * given[..., None], L)
    back = np.zeros_like(tau)
    if rule.get("back_tau", 0) > 0:
        lit = np.clip((lum / max(glow, tiny) - rule["back_from"]) / max(rule["back_from"], 1e-3), 0, 1)
        lit = gaussian(lit, blur * 3)
        back = np.clip(rule["back_tau"] * lit, 0, tau_max)
    return enc(light), tau, back


def latitude_background(gal, rule: dict, pic: dict):
    """The Milky Way at the same galactic latitude: per row of the galactic map, the median over `window_deg` of
    longitude either side (the cloud is a few degrees across, so it does not move the median). Only the rows and
    columns round the picture are worked; elsewhere the map itself."""
    import numpy as np
    from numpy.lib.stride_tricks import sliding_window_view as win

    H, W = gal.shape
    out = gal.copy()
    half = int(round(rule["window_deg"] / 360 * W))
    reach = math.hypot(pic["width_arcmin"], pic["height_arcmin"]) / 60 / 2 + 1
    R = np.array([[-0.0548755604, -0.8734370902, -0.4838350155], [0.4941094279, -0.4448296300, 0.7469822445],
                  [-0.8676661490, -0.1980763734, 0.4559837762]])
    a, d = math.radians(pic["ra_deg"]), math.radians(pic["dec_deg"])
    g = R @ np.array([math.cos(d) * math.cos(a), math.cos(d) * math.sin(a), math.sin(d)])
    l0, b0 = math.degrees(math.atan2(g[1], g[0])), math.degrees(math.asin(g[2]))
    x0 = int(((0.5 - l0 / 360) % 1) * W)
    y0 = int((b0 + 90) / 180 * H)
    dy = int(math.ceil(reach / 180 * H)) + 2
    dx = int(math.ceil(reach / math.cos(math.radians(min(80, abs(b0) + reach))) / 360 * W)) + 2
    cols = np.arange(x0 - dx - half, x0 + dx + half + 1) % W
    for y in range(max(0, y0 - dy), min(H, y0 + dy + 1)):
        row = gal[y, cols]
        med = np.median(win(row, 2 * half + 1), axis=-1)
        out[y, cols[half:len(cols) - half]] = med
    return out


def save_dust(path: Path, front, back, tau_max: float):
    import numpy as np
    from PIL import Image

    r = np.sqrt(np.clip(front / tau_max, 0, 1)) * 255
    g = np.sqrt(np.clip(back / tau_max, 0, 1)) * 255
    img = np.stack([r, g, np.zeros_like(r)], -1)
    Image.fromarray(np.clip(img + 0.5, 0, 255).astype(np.uint8)).save(path, "WEBP", quality=DUST_Q, method=6)


def save_light(path: Path, a):
    import numpy as np
    from PIL import Image

    Image.fromarray(np.clip(a + 0.5, 0, 255).astype(np.uint8)).save(path, "WEBP", quality=LIGHT_Q, method=6)


# --------------------------------------------------------------------------------------- the catalogue

def catalogue():
    raw = STARS3D.read_bytes()
    count = struct.unpack_from("<I", raw, 8)[0]
    head = len(raw) - count * 24
    rows = []
    for i in range(count):
        x, y, z, M, m, _ci, _n = struct.unpack_from("<fffffhH", raw, head + i * 24)
        rows.append((x, y, z, M, m))
    return rows


def record_of(rid: str) -> dict:
    doc = json.loads(DSO.read_text(encoding="utf-8"))
    return next(o for o in doc["objects"] if f"dso-{o['id']}" == rid)


def equatorial(v: tuple) -> tuple[float, float]:
    """(ra, dec) in degrees of an ecliptic J2000 vector."""
    c, s_ = math.cos(OBLIQUITY), math.sin(OBLIQUITY)
    x, y, z = v[0], v[1] * c - v[2] * s_, v[1] * s_ + v[2] * c
    r = math.sqrt(x * x + y * y + z * z)
    return math.degrees(math.atan2(y, x)) % 360, math.degrees(math.asin(z / r))


def stars_for(prof: dict, cat, tau, pic: dict) -> dict:
    """The catalogue's stars where the dust is (tau > 0.05 at their place on the sky) with V < 8 from the Sun, in the
    hero's sky frame: up to 40 on the Sun's side of the dust (brightest first) and 8 beyond it; and the twins."""
    rec = record_of(prof["record"])
    P = rec["posLy"]
    dist = math.sqrt(sum(c * c for c in P))
    u = tuple(c / dist for c in P)
    west, north, toward = sky_frame(u)
    fz = float((part(prof, "dust").get("front") or {}).get("z_ly", 0))
    half = 0.75 * math.hypot(pic["width_arcmin"], pic["height_arcmin"]) / 60
    cos_r = math.cos(math.radians(half))
    to_uv = picture_uv(pic, rec["raDeg"], rec["decDeg"])
    ny, nx = tau.shape
    near, far, counted = [], [], 0
    for x, y, z, M, m in cat:
        d = math.sqrt(x * x + y * y + z * z)
        if d <= 0 or m >= 8.0 or (x * u[0] + y * u[1] + z * u[2]) / d < cos_r:
            continue
        ra, dec = equatorial((x / d, y / d, z / d))
        w, n = tangent_offset(rec["raDeg"], rec["decDeg"], ra, dec)
        uu, vv = to_uv(w, n)
        if not (0 <= uu < 1 and 0 <= vv < 1) or tau[int((1 - vv) * ny), int(uu * nx)] < 0.05:
            continue
        counted += 1
        rel = (x - P[0], y - P[1], z - P[2])
        row = [round(sum(a * b for a, b in zip(rel, west)), 3), round(sum(a * b for a, b in zip(rel, north)), 3),
               round(sum(a * b for a, b in zip(rel, toward)), 3), round(M, 2), m]
        (near if row[2] > fz else far).append(row)
    near.sort(key=lambda r: r[4])
    far.sort(key=lambda r: r[4])
    twins = {}
    for s in (part(prof, "stars").get("stars") or []):
        if not s.get("catalogue"):
            continue
        su = ecliptic(s["ra_deg"], s["dec_deg"])
        best = None
        for x, y, z, M, m in cat:
            d = math.sqrt(x * x + y * y + z * z)
            if d <= 0 or abs(m - s["v_mag"]) > 0.6:
                continue
            sep = math.degrees(math.acos(max(-1, min(1, (x * su[0] + y * su[1] + z * su[2]) / d))))
            if sep < 0.02 and (best is None or sep < best[0]):
                best = (sep, [round(x, 3), round(y, 3), round(z, 3)])
        if best:
            twins[s["id"]] = best[1]
    keep = [r[:4] for r in near[:40]] + [r[:4] for r in far[:8]]
    return {"keep": keep, "twins": twins, "counted": counted, "in_front": len(near), "behind": len(far)}


# ------------------------------------------------------------------------------------------------ bake

def bake_one(hid: str, files: dict, stars: dict, cat, maps: dict) -> None:
    import numpy as np
    from PIL import Image

    prof = profile(hid)
    light = part(prof, "light")
    dust = part(prof, "dust")
    row = {"id": hid}
    if light:
        if light.get("image") and light.get("crop"):
            # A square of `crop.size_arcmin` round the record, from the archive's LARGE JPEG, placed by the screen
            # rendition's solve (`crop.of`, the whole picture); its own place is `picture` (the crop's, written by hand
            # from what this prints: centred on the record, the whole picture's turn).
            full, cr = light["crop"]["of"], light["crop"]
            big, src_sha = noirlab(light["image"], large=True)
            fr = prof["frame"]
            uc, vc = picture_uv(full, fr["ra_deg"], fr["dec_deg"])(0, 0)
            du, dv = cr["size_arcmin"] / full["width_arcmin"] / 2, cr["size_arcmin"] / full["height_arcmin"] / 2
            W, H = big.size
            box = (round((uc - du) * W), round((1 - vc - dv) * H), round((uc + du) * W), round((1 - vc + dv) * H))
            sys.path.insert(0, str(ROOT / "scripts"))
            import build_nebulae as bn

            whole, _ = noirlab(light["image"])
            im = sky_to_black(resize_long(big.crop(box), int(light.get("px", 512))), bn.sky_level(whole))
            row["from"] = f"NOIRLab {light['image']} (large JPEG, a {cr['size_arcmin']} arcmin crop)"
            row["from_sha256"] = src_sha
            print(f"{hid}: crop picture {{ra_deg: {fr['ra_deg']}, dec_deg: {fr['dec_deg']}, width_arcmin: {cr['size_arcmin']}, "
                  f"height_arcmin: {cr['size_arcmin']}, north_deg: {full['north_deg']}}} (pixels {box} of {W} x {H})")
        elif light.get("image"):
            im, src_sha = noirlab(light["image"])
            im = sky_to_black(resize_long(im, int(light.get("px", 512))))
            row["from"] = f"NOIRLab {light['image']} (screen rendition)"
            row["from_sha256"] = src_sha
        else:
            src = ROOT / light["from"].split(" ")[0]
            im = Image.open(src).convert("RGB")
            row["from"] = str(src.relative_to(ROOT))
            row["from_sha256"] = sha(src)
        a = np.asarray(im).astype(np.float32)
        st = light.get("stars") or {}
        a, mask = remove_stars(a, float(st.get("above_median", 18)), int(st.get("grow_px", 3)))
        row["stars_removed_px"] = int(mask.sum())
        row["size"] = list(im.size)
        if dust:
            arcmin_px = light["picture"]["width_arcmin"] / im.size[0]
            fr = prof["frame"]
            side = side_mask(dust["rule"], light["picture"], fr["ra_deg"], fr["dec_deg"], a.shape[:2])
            a, front, back = dust_maps(a.astype(np.float64), dust["rule"], float(dust["tau_max"]), arcmin_px, side=side)
            save_dust(OUT / f"{hid}-dust.webp", front, back, float(dust["tau_max"]))
            files[f"{hid}-dust.webp"] = {"tau_front_max": round(float(front.max()), 3), "tau_back_max": round(float(back.max()), 3),
                                        "tau_front_mean": round(float(front.mean()), 4)}
            maps[hid] = (front, light["picture"])
        save_light(OUT / f"{hid}-light.webp", a)
        files[f"{hid}-light.webp"] = {}
    elif dust:
        pic = dust["picture"]
        n = int(dust.get("px", 256))
        rule = dust["rule"]
        rgb = milky_way_tangent(pic, n)
        bgm = None
        if rule.get("background") == "galactic-latitude":
            gal = lin(np.asarray(Image.open(MILKY).convert("RGB")).astype(np.float64)) @ np.array([0.2126, 0.7152, 0.0722])
            px_arcmin = 360 * 60 / gal.shape[1]
            gal = gaussian(gal, max(0.5, rule.get("smooth_arcmin", 0) / px_arcmin))
            bgm = milky_way_tangent(pic, n, latitude_background(gal, rule, pic))[..., 0]
        row["from"] = str(MILKY.relative_to(ROOT))
        row["from_sha256"] = sha(MILKY)
        row["size"] = [n, n]
        _, front, back = dust_maps(rgb, rule, float(dust["tau_max"]), pic["width_arcmin"] / n, background=bgm)
        maps[hid] = (front, pic)
        save_dust(OUT / f"{hid}-dust.webp", front, back, float(dust["tau_max"]))
        files[f"{hid}-dust.webp"] = {"tau_front_max": round(float(front.max()), 3), "tau_back_max": 0.0,
                                    "tau_front_mean": round(float(front.mean()), 4)}
    if dust:
        stars[hid] = stars_for(prof, cat, *maps[hid])
    files.setdefault("_rows", []).append(row)


def bake() -> int:
    OUT.mkdir(parents=True, exist_ok=True)
    files: dict = {}
    stars: dict = {}
    cat = catalogue()
    maps: dict = {}
    for hid in IDS:
        bake_one(hid, files, stars, cat, maps)
    STARS.write_text(json.dumps({"about": "scripts/build_deep_sheets.py: the catalogue's stars in each dust hero's footprint, "
                                 "[x west, y north, z toward the Sun] in ly from the record's place and the absolute magnitude; "
                                 "twins: the catalogue's place (sun-inertial ly) of a star the hero draws itself", **stars},
                                separators=(",", ":")) + "\n", encoding="utf-8")
    rows = files.pop("_rows")
    out = {"files": {}, "inputs": rows}
    for name in sorted(files):
        p = OUT / name
        out["files"][name] = {"bytes": p.stat().st_size, "sha256": sha(p), **files[name]}
    out["files"]["stars.json"] = {"bytes": STARS.stat().st_size, "sha256": sha(STARS)}
    MANIFEST.write_text(json.dumps(out, indent=2) + "\n", encoding="utf-8")
    total = sum(v["bytes"] for v in out["files"].values())
    for name, v in out["files"].items():
        print(f"{name:24s} {v['bytes']:7d} B  {json.dumps({k: x for k, x in v.items() if k not in ('bytes', 'sha256')})}")
    for hid, s in stars.items():
        print(f"{hid:10s} catalogue stars where the dust is: {s['counted']} ({s['in_front']} on the Sun's side, {s['behind']} beyond; listed {len(s['keep'])}), twins {list(s['twins'])}")
    print(f"total {total} B")
    return 0


def check() -> int:
    if not MANIFEST.exists():
        print("STALE   site/images/deep/sheets/: run scripts/build_deep_sheets.py")
        return 1
    m = json.loads(MANIFEST.read_text(encoding="utf-8"))
    bad = 0
    for name, v in m["files"].items():
        p = OUT / name
        if not p.exists() or sha(p) != v["sha256"]:
            print(f"STALE   site/images/deep/sheets/{name} is not the bake its manifest records")
            bad += 1
    for row in m["inputs"]:
        src = ROOT / row["from"]
        if src.exists() and sha(src) != row["from_sha256"]:
            print(f"STALE   {row['id']}: {row['from']} changed since the bake: run scripts/build_deep_sheets.py")
            bad += 1
    have = {p.name for p in OUT.iterdir() if p.is_file()} - {"manifest.json"}
    for extra in sorted(have - set(m["files"])):
        print(f"STRAY   site/images/deep/sheets/{extra} is in no manifest")
        bad += 1
    if not bad:
        print(f"sheets ok: {len(m['files'])} files, {sum(v['bytes'] for v in m['files'].values())} B")
    return 1 if bad else 0


# ------------------------------------------------------------------------------------------------ solve

def solve() -> int:
    """build_nebulae.py solve() for a hero's NOIRLab picture: shift, scale and turn against a 2MASS cut-out."""
    import numpy as np
    from PIL import Image, ImageFilter

    n = 320
    only = arg("only")

    def reference(ra, dec, fov_arcmin):
        q = urllib.parse.urlencode(dict(hips="CDS/P/2MASS/color", width=n, height=n, fov=fov_arcmin / 60,
                                        projection="TAN", coordsys="icrs", ra=ra, dec=dec, format="jpg"))
        return np.asarray(Image.open(io.BytesIO(fetch(f"{HIPS2FITS}?{q}"))).convert("L"), dtype=float)

    def north_up(a, w, h, rot, fov, mirror=False):
        hh, ww = a.shape
        r = math.radians(rot)
        j, i = np.mgrid[0:n, 0:n]
        xi = (0.5 - (i + 0.5) / n) * fov
        eta = (0.5 - (j + 0.5) / n) * fov
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

    for hid in IDS:
        if only and hid != only:
            continue
        light = part(profile(hid), "light")
        if not light.get("image"):
            continue
        im, _ = noirlab(light["image"])
        a = np.asarray(im.convert("L"), dtype=float)
        pub = light.get("published") or light["picture"]
        ra, dec = float(pub["ra_deg"]), float(pub["dec_deg"])
        w, h, rot = float(pub["width_arcmin"]), float(pub["height_arcmin"]), float(pub["north_deg"])
        start, z0 = (ra, dec), None
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
        print(f"{hid:10s} picture: {{ra_deg: {ra:.5f}, dec_deg: {dec:.5f}, width_arcmin: {w:.2f}, height_arcmin: {h:.2f}, "
              f"north_deg: {rot:.2f}}}   moved {moved:.2f}' from the published centre; correlation {z:.1f} "
              f"(mirror image {zm:.1f}, as published {z0:.1f})")
    return 0


if __name__ == "__main__":
    if "--check" in sys.argv[1:]:
        sys.exit(check())
    if "--solve" in sys.argv[1:]:
        sys.exit(solve())
    sys.exit(bake())
