#!/usr/bin/env python3
"""Build the 4k texture tier (registry/textures.yaml, tier 1) and the moons' maps from the originals it names.

2026-09-28. The 2k set every visitor boots with is untouched; this makes the sharper maps a laptop or
a desktop swaps in after the first frame (site/js/scene/texturetiers.js). Every output is written
under site/textures/4k/ and every one is a NEW name, so a deploy needs no invalidation for them.

Run (never in CI -- it needs Pillow, NumPy and OpenEXR, and 250 MB of originals):
    python3 scripts/build-textures.py --originals DIR [--only earth-day,milky-way,...]

DIR holds the files registry/textures.yaml lists under `original:` (their URLs are there too), by
the basename given here in ORIGINALS. Nothing downloaded is committed; only what ships is.

WHY EACH MAP IS TREATED AS IT IS
  earth-day   Blue Marble Next Generation (NASA Earth Observatory), one map per month of 2004, so the
              snow line and the green of the land follow the clock's month. BMNG as published is a
              DARK Earth -- deep ocean near (2, 5, 20) -- while the Solar System Scope map the site
              boots with was graded brighter from the same data (its land correlates 0.95 with BMNG
              June, measured). A laptop swaps the 4k map in a second after the 2k one, in front of
              the visitor, so the 4k map is graded to the 2k one's colours: a 32-cube colour table
              per surface (land, water, split by the real water mask), fitted on June against the
              2k map and applied unchanged to all twelve months. The swap then adds detail and the
              season, not a different planet. The physical-lighting PR is where the grade is revisited.
  earth-water The Solar System Scope 8k specular map is a land/water mask (white = water, lakes
              included), registered to BMNG to the pixel (agreement peaks at 0 px offset, measured).
              Box-filtered to 4k so a coast pixel carries the fraction of it that is water.
  earth-night Black Marble 2016, the GREYSCALE map (NASA Earth Observatory, 13500 x 6750): lights only,
              no moonlit ground, which the colour map carries and the shader would read as city light. The
              shader reads only the brightness. Its levels are matched to the 2k night map's by
              quantile, so the night gain the shader was tuned with still holds.
  milky-way   NASA SVS Deep Star Maps 2020, the Milky Way BACKGROUND (Gaia DR2, with the Hipparcos and
              Tycho stars left out, because the app draws its own 5 044 stars on top). Galactic frame.
              Flipped top to bottom into the convention the 2k Solar System Scope map uses (galactic
              north at the BOTTOM of the image; scene/starfield.js says how that was found), and its
              brightness distribution matched to the 2k map's, so the backdrop stays "a whisper".
  moon, mars, mercury, jupiter
              Solar System Scope's own 8k maps (Jupiter's is 4096 wide already) resampled to 4096 x
              2048: the same pictures as the 2k maps, so nothing changes but the detail. Saturn,
              Uranus, Neptune, Venus and the Sun are left at 2k: their larger maps carry no detail
              the 2k ones lack (Saturn's "8k" is 4096 wide and differs from its own 2k upsample by
              0.57 grey levels RMS, measured).

THE MOONS AND SMALL WORLDS (2026-10-05, `--only moons` or `--only moon-ganymede,...`)
  One map per world, written to site/textures/ under a NEW name (2k_<world>_<source>.webp, or 1k_ when the
  file is narrower than 1536: the five Uranian moons, whose only public-domain map is 1440 wide, and
  the crater fields that would not fit the byte cap at 2048). A world's map is tier 0 and is
  fetched the first time its disc is big enough to show a surface or it is selected (scene/worlds.js
  `waiting`), never at boot. MOONS below says, for every one: the original, whether its centre is
  longitude 180 (then it is rolled half a turn: the mesh has longitude 0 at the middle of the map),
  how much of its colour is kept, and what is done where nobody has looked.
    grey mosaics   (USGS Voyager/Galileo, New Horizons, Viking, Cassini ISS 938 nm) are tinted with the
                   world's `look.flat` colour from registry/worlds.yaml: the hue is still chosen from
                   published descriptions, only the brightness pattern is measured.
    colour mosaics Cassini's (P. Schenk, LPI) are infrared-green-ultraviolet, far more colourful than
                   the eye sees, so 35 % of their saturation is kept. Io's is USGS's colour merge, kept.
    the mean       every map is taken, in linear light, to an area-weighted mean with the luminance
                   of `look.flat`, so the albedo order the flat colours were chosen in still holds:
                   by a gain where that clips under 2 % of the map, by a power curve otherwise.
    the gaps       where the original has no data (0 in a USGS mosaic, black in the JPL/USGS Voyager
                   maps of Uranus's moons) the map is the world's flat colour, feathered over a few
                   pixels. Nothing is invented; the share of the sphere that has data is printed and
                   goes in registry/textures.yaml `coverage:`.
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "textures" / "4k"
W, H = 4096, 2048

ORIGINALS = {
    "bmng": "bm_base_{mm}.jpg",                    # world.2004MM.3x5400x2700.jpg
    "mask": "sss_8k_earth_specular_map.tif",
    "night": "blackmarble_2016_3km_gray.jpg",       # BlackMarble_2016_3km_gray.jpg, lights only
    "milky": "svs_milkyway_2020_4k_gal.exr",
    "moon": "sss_8k_moon.jpg",
    "mars": "sss_8k_mars.jpg",
    "jupiter": "sss_8k_jupiter.jpg",
}

# WebP quality per map, chosen by eye on close-ups (2026-09-28) and by the bytes they cost.
MONTHS: list[int] = []  # --months 9 builds one, for looking at
Q = {"day": 86, "night": 80, "milky": 90, "planet": 84, "dense": 72}
# The Moon's and Mercury's maps are crater fields to the pixel: at 84 they cost 2.5 and 2.2 MB; at 72,
# 1.8 MB, with no difference visible on a disc filling a 1440 x 900 screen.
DENSE = {"moon"}


def lazy():
    global Image, np
    from PIL import Image  # noqa: F401
    import numpy as np  # noqa: F401
    Image.MAX_IMAGE_PIXELS = None


def save_webp(img, path: Path, q: int, lossless: bool = False) -> int:
    path.parent.mkdir(parents=True, exist_ok=True)
    img.save(path, "WEBP", quality=q, method=6, lossless=lossless)
    return path.stat().st_size


def water_mask(orig: Path, w: int, h: int):
    m = Image.open(orig / ORIGINALS["mask"]).convert("L")
    return np.asarray(m.resize((w, h), Image.BOX), dtype=np.float32) / 255.0


# --- earth day ---------------------------------------------------------------------------------

def fit_grade(orig: Path):
    """Two 32^3 colour tables (land, water) taking BMNG June to the shipped 2k day map."""
    sss = np.asarray(Image.open(ROOT / "site/textures/2k_earth_daymap.jpg").convert("RGB"), dtype=np.float64)
    bm = np.asarray(Image.open(orig / ORIGINALS["bmng"].format(mm="06")).convert("RGB")
                    .resize((2048, 1024), Image.BOX), dtype=np.float64)
    mask = water_mask(orig, 2048, 1024)
    n = 32

    def fit(sel):
        src, dst = bm[sel], sss[sel]
        idx = np.clip((src / 256 * n).astype(int), 0, n - 1)
        flat = idx[:, 0] * n * n + idx[:, 1] * n + idx[:, 2]
        cnt = np.bincount(flat, minlength=n ** 3).astype(float)
        mean = np.stack([np.bincount(flat, weights=dst[:, k], minlength=n ** 3) for k in range(3)], 1)
        # A per-channel curve for the bins the data never visits, and to steady the thin ones.
        curves = []
        for k in range(3):
            v = src[:, k].astype(int)
            c = np.bincount(v, minlength=256).astype(float)
            t = np.bincount(v, weights=dst[:, k], minlength=256)
            xs = np.nonzero(c > 20)[0]
            curves.append(np.maximum.accumulate(np.interp(np.arange(256), xs, t[xs] / c[xs])))
        centres = (np.stack(np.unravel_index(np.arange(n ** 3), (n, n, n)), 1) + 0.5) * 256 / n
        fb = np.stack([np.interp(centres[:, k], np.arange(256), curves[k]) for k in range(3)], 1)
        trust = (cnt / (cnt + 30))[:, None]
        table = np.where(cnt[:, None] > 0, mean / np.maximum(cnt, 1)[:, None], fb) * trust + fb * (1 - trust)
        return table.reshape(n, n, n, 3)

    return fit(mask < 0.05), fit(mask > 0.95)


def dense(table):
    """The 32-cube resampled trilinearly to 128^3, so applying it is one lookup per pixel."""
    n = table.shape[0]
    g = (np.arange(128) * 2 + 1) / 256 * n - 0.5
    g = np.clip(g, 0, n - 1 - 1e-6)
    i0 = np.floor(g).astype(int)
    f = (g - i0).astype(np.float32)
    i1 = np.minimum(i0 + 1, n - 1)
    out = np.zeros((128, 128, 128, 3), np.float32)
    for dr in (0, 1):
        ir = (i1 if dr else i0)[:, None, None]
        wr = (f if dr else 1 - f)[:, None, None]
        for dg in (0, 1):
            ig = (i1 if dg else i0)[None, :, None]
            wg = (f if dg else 1 - f)[None, :, None]
            for db in (0, 1):
                ib = (i1 if db else i0)[None, None, :]
                wb = (f if db else 1 - f)[None, None, :]
                out += table[ir, ig, ib] * (wr * wg * wb)[..., None]
    return out


def build_earth_day(orig: Path, report: dict) -> None:
    land, water = fit_grade(orig)
    L, Wt = dense(land), dense(water)
    mask = water_mask(orig, W, H)[..., None]
    for mm in MONTHS or range(1, 13):
        src = Image.open(orig / ORIGINALS["bmng"].format(mm=f"{mm:02d}")).convert("RGB").resize((W, H), Image.LANCZOS)
        px = np.asarray(src)
        a = px >> 1
        r, g, b = a[..., 0], a[..., 1], a[..., 2]
        # Near a coast the pixel's own colour says which table. BMNG's coastline and the mask's
        # differ by a pixel here and there, and a dark half-water pixel run through the LAND table
        # comes out as bright "forest": blending the two tables by the mask alone painted a yellow
        # rim round every Greek island (2026-09-28). So within two pixels of any water, a pixel that
        # is dark and not redder than blue counts as water in proportion.
        m0 = mask[..., 0]
        near = m0 > 0.02
        for dy in (-2, -1, 0, 1, 2):
            for dx in (-2, -1, 0, 1, 2):
                near = near | np.roll(np.roll(m0 > 0.02, dy, 0), dx, 1)
        coast = near & (m0 < 0.98)
        f = px.astype(np.float32)
        lum = f @ np.array([0.2126, 0.7152, 0.0722], np.float32)
        waterlike = np.clip((40 - lum) / 20, 0, 1) * np.clip((f[..., 2] - f[..., 0] + 4) / 8, 0, 1)
        w = m0.copy()
        w[coast] = np.maximum(m0[coast], waterlike[coast])
        w = w[..., None]
        out = L[r, g, b] * (1 - w) + Wt[r, g, b] * w
        img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
        name = f"earth_day_{mm:02d}.webp"
        report[name] = save_webp(img, OUT / name, Q["day"])


def build_earth_water(orig: Path, report: dict) -> None:
    m = water_mask(orig, W, H)
    img = Image.fromarray(np.clip(m * 255 + 0.5, 0, 255).astype(np.uint8)).convert("L")
    report["earth_water.webp"] = save_webp(img, OUT / "earth_water.webp", 100, lossless=True)


# --- earth night -----------------------------------------------------------------------------

def match_levels(src, ref, lo_keep: float = 0.0):
    """Monotone curve taking src's value distribution onto ref's, by quantile (both 0..255)."""
    qs = np.linspace(0, 100, 1001)
    s = np.percentile(src, qs)
    r = np.percentile(ref, qs)
    s, idx = np.unique(s, return_index=True)
    return lambda x: np.interp(x, s, r[idx])


def build_earth_night(orig: Path, report: dict) -> None:
    big = Image.open(orig / ORIGINALS["night"]).convert("L").resize((W, H), Image.LANCZOS)
    a = np.asarray(big, dtype=np.float32)
    ref = np.asarray(Image.open(ROOT / "site/textures/2k_earth_nightmap.webp").convert("L"), dtype=np.float32)
    small = np.asarray(big.resize((2048, 1024), Image.BOX), dtype=np.float32)
    curve = match_levels(small.ravel(), ref.ravel())
    img = Image.fromarray(np.clip(curve(a) + 0.5, 0, 255).astype(np.uint8)).convert("L")
    report["earth_night.webp"] = save_webp(img, OUT / "earth_night.webp", Q["night"])


# --- milky way --------------------------------------------------------------------------------

def build_milky_way(orig: Path, report: dict) -> None:
    import OpenEXR
    part = OpenEXR.File(str(orig / ORIGINALS["milky"])).parts[0]
    rgb = np.asarray(part.channels["RGB"].pixels, dtype=np.float32)
    if rgb.shape[:2] != (H, W):
        rgb = np.stack([np.asarray(Image.fromarray(rgb[..., k]).resize((W, H), Image.BOX)) for k in range(3)], -1)
    rgb = rgb[::-1]  # galactic north to the bottom: the 2k map's convention (scene/starfield.js)
    lum = rgb @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    ref = np.asarray(Image.open(ROOT / "site/textures/2k_stars_milky_way.webp").convert("RGB"), dtype=np.float32)
    ref_lum = ref @ np.array([0.2126, 0.7152, 0.0722], np.float32)   # encoded 0..255
    small = np.asarray(Image.fromarray(lum).resize((2048, 1024), Image.BOX))
    curve = match_levels(small.ravel(), ref_lum.ravel())
    # Then lifted a little (exponent 0.85 on the encoded level): matched exactly, the faint glow off
    # the plane sits at 0-3 of 255 and lossy WebP flattens it to black, which was the 2k map's
    # softness all over again. p90 goes from 3 to about 5, p99 from 13 to about 20.
    target = 255.0 * (curve(lum) / 255.0) ** 0.85                      # encoded 0..255
    # Colour from the source, at 60 % saturation: Gaia's colours are "estimated by eye" (SVS), and
    # the 2k map it replaces is nearly grey-blue. The ratio is taken in linear light.
    chroma = rgb / np.maximum(lum, 1e-6)[..., None]
    chroma = 1 + (chroma - 1) * 0.6
    lin_target = (target / 255.0) ** 2.2
    out = np.clip(chroma * lin_target[..., None], 0, 1) ** (1 / 2.2) * 255
    img = Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8))
    report["milky_way.webp"] = save_webp(img, OUT / "milky_way.webp", Q["milky"])


# --- planets -----------------------------------------------------------------------------------

def build_planet(orig: Path, key: str, report: dict) -> None:
    img = Image.open(orig / ORIGINALS[key]).convert("RGB")
    if img.size != (W, H):
        img = img.resize((W, H), Image.LANCZOS)
    report[f"{key}.webp"] = save_webp(img, OUT / f"{key}.webp", Q["dense" if key in DENSE else "planet"])


# --- Mercury and Venus's ground, from USGS's mosaics (2026-10-06, public #404 and #417) ------------

MERCURY_ORIGINAL = "Mercury_MESSENGER_MDIS_Basemap_MD3Color_Mosaic_Global_665m.tif"
MERCURY_TINT = (0x84, 0x83, 0x83)   # scene/worlds.js `tint`: what Mercury is drawn in before its map arrives
MERCURY_SATURATION = 0.35
MERCURY_4K_MAX_BYTES = 1_400_000
VENUS_ORIGINAL = "Venus_Magellan_C3-MDIR_Global_Mosaic_2025m.tif"
VENUS_SURFACE_TINT = (0xd8, 0x92, 0x4c)
VENUS_SURFACE_MAX_BYTES = 300_000


def _to_linear(x):
    return np.where(x <= 0.04045, x / 12.92, ((x + 0.055) / 1.055) ** 2.4)


def _to_srgb8(x):
    x = np.clip(x, 0, 1)
    return np.clip(np.where(x <= 0.0031308, x * 12.92, 1.055 * x ** (1 / 2.4) - 0.055) * 255 + 0.5, 0, 255).astype(np.uint8)


def _shrink(src, w, h):
    """A mosaic whose 0 is "no data", box-filtered to w x h in linear light without dragging the
    gaps' black into their edges. Returns (linear pixels, share of each pixel that has data)."""
    a = np.asarray(src)
    lum = a if a.ndim == 2 else a.max(axis=2)
    v = np.asarray(Image.fromarray(((lum > 0) * 255).astype(np.uint8)).resize((w, h), Image.BOX), dtype=np.float64) / 255
    small = np.asarray(src.resize((w, h), Image.BOX), dtype=np.float64) / 255
    if small.ndim == 2:
        small = small[..., None]
    return _to_linear(np.clip(small / np.maximum(v, 1e-3)[..., None], 0, 1)), v


def _fill_gaps(lin, v, radius):
    """Where there is no data, the data around it, blurred `radius` pixels (weighted by where there
    is data, wrapping in longitude). Nothing is invented: a gap becomes the average of its edges."""
    from PIL import ImageFilter

    def blur(x):
        # Three box passes each way: close to a Gaussian, and numpy only (PIL has no blur for reals).
        def box(z, axis):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (radius + 1, radius)
            c = np.cumsum(np.pad(z, pad, mode="wrap" if axis == 1 else "edge"), axis=axis)
            n = z.shape[axis]
            return (np.take(c, np.arange(n) + 2 * radius + 1, axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * radius + 1)
        for _ in range(3):
            x = box(box(x, 0), 1)
        return x
    den = blur(v)
    out = lin.copy()
    hard = Image.fromarray(((v > 0.98) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(2))
    keep = np.asarray(hard, dtype=np.float64) / 255
    for c in range(lin.shape[2]):
        num = blur(lin[..., c] * v)
        far = num / np.maximum(den, 1e-6)
        # A gap wider than the blur has no neighbours within reach: the map's own mean there.
        far = np.where(den > 1e-3, far, float((lin[..., c] * v).sum() / v.sum()))
        out[..., c] = lin[..., c] * keep + far * (1 - keep)
    return out


def build_mercury(orig: Path, report: dict) -> None:
    """MESSENGER's three-colour map (MDIS, 1000, 750 and 430 nm shown as red, green and blue; USGS).

    Those are not the eye's three colours and the mosaic's are far stronger than Mercury's, which
    is a grey-brown world: MERCURY_SATURATION of the saturation is kept. The mean is taken to the
    luminance of the colour the planet is drawn in before the map arrives, so the swap adds craters
    and not a jump in brightness. The 3 % of the map with no data (strips at the poles) is filled
    from its edges."""
    src = Image.open(orig / MERCURY_ORIGINAL).convert("RGB")
    lin, v = _shrink(src, W, H)
    coverage_w = np.cos((np.arange(H) + 0.5) / H * np.pi - np.pi / 2)[:, None] * np.ones((1, W))
    coverage = float((coverage_w * v).sum() / coverage_w.sum())
    lin = _fill_gaps(lin, v, 24)
    y = np.clip(lin @ np.array(LUMA), 1e-6, 1)
    rgb = np.maximum(y[..., None] + (lin - y[..., None]) * MERCURY_SATURATION, 0)
    target = float(_to_linear(np.array(MERCURY_TINT) / 255) @ np.array(LUMA))
    gain = target / float((y * coverage_w).sum() / coverage_w.sum())
    img = Image.fromarray(_to_srgb8(rgb * gain))
    clipped = float((rgb.max(axis=2) * gain > 1).mean())
    # No heavier than the 4k map it replaces (1 389 708 B): MESSENGER's map is sharp to the pixel,
    # so the quality comes down from the dense maps' 72 until it fits.
    import io
    q = Q["dense"]
    while q > 40:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=4)
        if buf.tell() <= MERCURY_4K_MAX_BYTES:
            break
        q -= 4
    report["mercury.webp"] = save_webp(img, OUT / "mercury.webp", q)
    small = img.resize((2048, 1024), Image.LANCZOS)
    report["2k_mercury_messenger.webp"] = save_webp(small, ROOT / "site" / "textures" / "2k_mercury_messenger.webp", 78)
    print(f"  mercury: data over {coverage * 100:.1f} % of the sphere, gain {gain:.2f}, clipped {clipped * 100:.2f} %, 4k WebP {q}", flush=True)


def build_venus_surface(orig: Path, report: dict) -> None:
    """Venus's ground as Magellan's radar saw it (C3-MIDR mosaic, USGS; 1990 to 1994).

    A radar picture: bright is rough or tilted towards the radar, dark is smooth, and none of it
    is colour. It is tinted the orange NASA's own renderings of it use, and the card says the
    colour is added. Magellan left gaps (7.7 % of this mosaic); they are filled from their edges."""
    import io
    src = Image.open(orig / VENUS_ORIGINAL).convert("L")
    w, h = 2048, 1024
    lin, v = _shrink(src, w, h)
    weight = np.cos((np.arange(h) + 0.5) / h * np.pi - np.pi / 2)[:, None] * np.ones((1, w))
    coverage = float((weight * v).sum() / weight.sum())
    y = _fill_gaps(lin, v, 12)[..., 0]
    tint = _to_linear(np.array(VENUS_SURFACE_TINT) / 255)
    y = y * (0.42 / float((y * weight).sum() / weight.sum()))
    img = Image.fromarray(_to_srgb8(y[..., None] * (tint / tint.max())[None, None, :]))
    q = 84
    while q > 50:
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=q, method=4)
        if buf.tell() <= VENUS_SURFACE_MAX_BYTES:
            break
        q -= 4
    report["2k_venus_magellan.webp"] = save_webp(img, ROOT / "site" / "textures" / "2k_venus_magellan.webp", q)
    print(f"  venus surface: data over {coverage * 100:.1f} % of the sphere, WebP {q}", flush=True)


# --- the moons and small worlds -------------------------------------------------------------------
#
# key: (original's basename under --originals, output name, roll half a turn, saturation kept or
#       None for a grey mosaic that is tinted, contrast about the mean, nodata threshold)
MOONS = {
    "io":        ("Io_GalileoSSI-Voyager_Global_Mosaic_ClrMerge_1km.tif", "io_usgs.webp", False, 1.0, 1.0, 0),
    "europa":    ("Europa_Voyager_GalileoSSI_global_mosaic_500m.tif", "europa_usgs.webp", True, None, 1.0, 0),
    "ganymede":  ("Ganymede_Voyager_GalileoSSI_global_mosaic_1km.tif", "ganymede_usgs.webp", True, None, 1.0, 0),
    "callisto":  ("Callisto_Voyager_GalileoSSI_global_mosaic_1km.tif", "callisto_usgs.webp", True, None, 1.0, 0),
    "mimas":     ("commons_mimas.jpg", "mimas_cassini.webp", True, 0.35, 1.0, -1),
    "enceladus": ("commons_enceladus.jpg", "enceladus_cassini.webp", True, 0.35, 1.0, -1),
    "tethys":    ("commons_tethys.jpg", "tethys_cassini.webp", True, 0.35, 1.0, -1),
    "dione":     ("commons_dione.jpg", "dione_cassini.webp", True, 0.35, 1.0, -1),
    "rhea":      ("commons_rhea.jpg", "rhea_cassini.webp", True, 0.35, 1.0, -1),
    "iapetus":   ("commons_iapetus.jpg", "iapetus_cassini.webp", True, 0.35, 1.0, -1),
    # 938 nm, through the haze. Half the contrast: the picture is of a surface no eye has seen.
    "titan":     ("Titan_ISS_P19658_Mosaic_Global_4km.tif", "titan_cassini_iss.webp", True, None, 0.5, 0),
    "miranda":   ("commons_miranda.jpg", "miranda_voyager.webp", False, None, 1.0, 6),
    "ariel":     ("commons_ariel.jpg", "ariel_voyager.webp", False, None, 1.0, 6),
    "umbriel":   ("commons_umbriel.jpg", "umbriel_voyager.webp", False, None, 1.0, 6),
    "titania":   ("commons_titania.jpg", "titania_voyager.webp", False, None, 1.0, 6),
    "oberon":    ("commons_oberon.jpg", "oberon_voyager.webp", False, None, 1.0, 6),
    # New Horizons MVIC's colour mosaics (PDS Small Bodies Node, 2026-10-06): see pds_colour() below.
    "pluto":     ("nh_pluto_color_mosaic.img", "pluto_nh_colour.webp", True, 1.5, 1.0, 0),
    "charon":    ("nh_charon_color_mosaic.img", "charon_nh_colour.webp", False, 1.5, 1.0, 0),
    # USGS's copy of P. Schenk's Voyager 2 map (PIA18668): orange, green and blue pictures with the
    # contrast raised, which gives the whole moon a green cast no eye would see. BALANCED, below.
    "triton":    ("Triton_Voyager2_ClrMosaic_GlobalFill_600m.tif", "triton_voyager.webp", False, 0.3, 1.0, 0),
    "phobos":    ("commons_phobos.jpg", "phobos_viking.webp", False, None, 1.0, -1),
}
# A colour mosaic whose overall colour is the filters' and not the world's: its area-weighted mean
# colour is taken to the hue of `look.flat` by a gain per channel, in linear light, before anything
# else. The pattern of colour differences across the map is kept; the cast is not.
BALANCED = {"triton"}
# Where nobody has looked, these maps are filled with THEIR OWN mean colour instead of `look.flat`:
# the colour is measured now, and a band of the old hand-chosen colour across Pluto's south would
# be a seam that is not there.
FILL_OWN_MEAN = {"pluto", "charon"}
# New Horizons photographed more of Pluto and Charon in black and white (LORRI, on the way in) than
# in colour. Where the colour mosaic has nothing and USGS's black-and-white one has, that one fills
# the gap: scaled to the colour map's brightness where the two overlap, given the colour map's mean
# colour, and at PAN_FILL_CONTRAST of its own contrast -- those are the far-side pictures from
# hundreds of thousands of km, which USGS stretched hard and which read as blotches at full strength.
PAN_FILL = {
    "pluto": "Pluto_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif",
    "charon": "Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif",
}
PAN_FILL_CONTRAST = 0.5
MOON_MAX_BYTES = 250_000
MOON_MIN_Q = 58
RELIEF_KEPT = 0.6


def pds_colour(path: Path):
    """A New Horizons MVIC colour mosaic (PDS3, four bands of 32-bit reals, band sequential, simple
    cylindrical: CH4 895 nm, NIR 870 nm, RED 625 nm, BLUE 475 nm) as an sRGB picture at most 4096 wide.

    MVIC has no green filter. Red is RED, blue is BLUE and green is the mean of the two: the nearest
    thing to what an eye would see that the instrument allows, and what the card says. The values
    are near I/F, linear; they are scaled so the 99.8th percentile is white and encoded as sRGB, and
    a pixel missing in either band is 0 (every valid pixel is at least 2, so 0 means only that)."""
    import re
    label = path.with_suffix(".lbl").read_text(encoding="latin-1")
    num = lambda k: int(re.search(r"^\s*%s\s*=\s*(\d+)" % k, label, re.M).group(1))
    lines, samples, bands = num("LINES"), num("LINE_SAMPLES"), num("BANDS")
    cube = np.memmap(path, dtype="<f4", mode="r", shape=(bands, lines, samples))
    f = -(-samples // 4096)
    hh, ww = lines // f, samples // f
    def band(i):
        b = np.asarray(cube[i, :hh * f, :ww * f], dtype=np.float64)
        ok = np.isfinite(b) & (b > -1e30) & (b < 1e30)
        b = np.where(ok, b, 0.0).reshape(hh, f, ww, f).sum(axis=(1, 3))
        n = ok.reshape(hh, f, ww, f).sum(axis=(1, 3))
        return b / np.maximum(n, 1), n == f * f
    red, ok_r = band(2)
    blue, ok_b = band(3)
    ok = ok_r & ok_b
    rgb = np.stack([red, (red + blue) / 2, blue], axis=-1)
    rgb = np.clip(rgb / np.percentile(rgb.max(axis=2)[ok], 99.8), 0, 1)
    enc = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - 0.055)
    out = np.clip(enc * 255 + 0.5, 2, 255).astype(np.uint8)
    out[~ok] = 0
    return Image.fromarray(out)


def flat_colour(world: str):
    """`look.flat` of a registry/worlds.yaml row, as linear-light RGB."""
    import re
    text = (ROOT / "registry" / "worlds.yaml").read_text(encoding="utf-8")
    m = re.search(r"^  - id: %s\n(?:(?!^  - id: ).*\n)*?    look: \{flat: \"#([0-9a-fA-F]{6})\"" % re.escape(world), text, re.M)
    if not m:
        raise SystemExit(f"registry/worlds.yaml: no `look.flat` for {world}")
    srgb = np.array([int(m.group(1)[i:i + 2], 16) for i in (0, 2, 4)], np.float64) / 255
    return np.where(srgb <= 0.04045, srgb / 12.92, ((srgb + 0.055) / 1.055) ** 2.4)


LUMA = (0.2126, 0.7152, 0.0722)


def build_moon(orig: Path, key: str, report: dict) -> None:
    name, out_name, roll, keep_sat, contrast, nodata = MOONS[key]
    src = pds_colour(orig / name) if name.endswith(".img") else Image.open(orig / name)
    src = src.convert("L" if keep_sat is None else "RGB")
    w = min(2048, src.width)
    h = w // 2
    a = np.asarray(src)
    # Where the original has data. Premultiplied before the resize, so no dark fringe at a gap's edge.
    lum = a if a.ndim == 2 else a.max(axis=2)
    valid = Image.fromarray(((lum > nodata) * 255).astype(np.uint8)).resize((w, h), Image.BOX)
    v = np.asarray(valid, dtype=np.float64) / 255
    small = np.asarray(src.resize((w, h), Image.LANCZOS if nodata < 0 else Image.BOX), dtype=np.float64) / 255
    if small.ndim == 2:
        small = small[..., None]
    small = small / np.maximum(v, 1e-3)[..., None] if nodata >= 0 else small
    small = np.clip(small, 0, 1)
    lin = np.where(small <= 0.04045, small / 12.92, ((small + 0.055) / 1.055) ** 2.4)
    if key in PAN_FILL:
        from PIL import ImageFilter
        pan = Image.open(orig / PAN_FILL[key]).convert("L")
        pv = np.asarray(Image.fromarray(((np.asarray(pan) > 0) * 255).astype(np.uint8)).resize((w, h), Image.BOX), dtype=np.float64) / 255
        ps = np.clip(np.asarray(pan.resize((w, h), Image.BOX), dtype=np.float64) / 255 / np.maximum(pv, 1e-3), 0, 1)
        pl = np.where(ps <= 0.04045, ps / 12.92, ((ps + 0.055) / 1.055) ** 2.4)
        both = (v > 0.99) & (pv > 0.99)
        ycol = lin @ np.array(LUMA)
        mean_y = float(ycol[both].mean())
        pl = mean_y + (pl * (mean_y / float(pl[both].mean())) - mean_y) * PAN_FILL_CONTRAST
        chroma = lin[v > 0.99].mean(axis=0)
        chroma = chroma / float(chroma @ np.array(LUMA))
        keep = Image.fromarray(((v > 0.98) * 255).astype(np.uint8)).filter(ImageFilter.MinFilter(9)).filter(ImageFilter.GaussianBlur(w / 200))
        k = (np.asarray(keep, dtype=np.float64) / 255)[..., None]
        lin = np.clip(lin * k + np.clip(pl, 0, 1)[..., None] * chroma[None, None, :] * (1 - k), 0, 1)
        print(f"  {key}: colour over {float((v > 0.99).mean()) * 100:.1f} % of the map's pixels, black-and-white fill over {float(((pv > 0.99) & ~(v > 0.99)).mean()) * 100:.1f} %", flush=True)
        v = np.maximum(v * (k[..., 0] > 0), pv)
    tint = flat_colour(key)
    tint_y = float(tint @ np.array(LUMA))
    weight = np.cos((np.arange(h) + 0.5) / h * np.pi - np.pi / 2)[:, None] * np.ones((1, w))
    solid = v > 0.99
    coverage = float((weight * v).sum() / weight.sum())
    def smooth(x, radius):
        """A blur about `radius` pixels wide (three box passes), wrapping in longitude, weighted by
        where there is data, so a gap's edge is not dragged dark."""
        def box(z, r, axis):
            pad = [(0, 0), (0, 0)]
            pad[axis] = (r + 1, r)
            c = np.cumsum(np.pad(z, pad, mode="wrap" if axis == 1 else "edge"), axis=axis)
            n = z.shape[axis]
            return (np.take(c, np.arange(n) + 2 * r + 1, axis=axis) - np.take(c, np.arange(n), axis=axis)) / (2 * r + 1)
        num, den = x * v, v.copy()
        for _ in range(3):
            for axis in (0, 1):
                num, den = box(num, radius, axis), box(den, radius, axis)
        return num / np.maximum(den, 1e-6)

    def to_mean(y, target):
        """Take luminances in 0..1 to an area-weighted mean of `target`.

        A plain gain when that clips under 2 % of the map (Ganymede, Callisto: a dark world's bright
        craters may burn out, as they do in every picture of it). Otherwise the map is BRIGHT -- Tethys
        is 0.8 of white -- and a gain of 2.4 flattened 30 % of its pixels, while a power curve on
        every pixel left a white ball with no craters (both tried, 2026-10-05). So the map is split
        into its broad brightness (a blur 1/40 of the width) and the relief on top of it (the pixel
        over the blur: craters, cracks, mostly sunlight on slopes, which is not albedo). The broad
        brightness takes the power curve, to the target; RELIEF_KEPT of the relief is put back on it,
        darker by its share and brighter within what is left below white. The shadows take the mean
        a few per cent under the target, which is printed."""
        wsum = weight[solid].sum()
        mean_of = lambda z: float((z * weight)[solid].sum() / wsum)
        gain = target / mean_of(y)
        if gain <= 1 or float(((y * gain > 1) * weight)[solid].sum() / wsum) < 0.02:
            return np.clip(y * gain, 0, 1), f"gain {gain:.2f}"
        broad = np.clip(smooth(y, max(2, y.shape[1] // 80)), 1e-4, 1)
        relief = 1 + (np.clip(y / broad, 0.4, 1.6) - 1) * RELIEF_KEPT
        lo_g, hi_g = 0.02, 1.0
        for _ in range(30):
            g = (lo_g + hi_g) / 2
            if mean_of(broad ** g) > target:
                lo_g = g
            else:
                hi_g = g
        base = broad ** g
        # A slope facing away from the Sun darkens by its share. One facing it can only use what is
        # left below white, or 40 % of a white moon's pixels clip (measured on Enceladus).
        out = np.where(relief <= 1, base * relief, 1 - (1 - base) * (2 - relief))
        return out, f"power {g:.2f} on the broad brightness with {RELIEF_KEPT} of the relief, mean {mean_of(out) / target:.2f} of the flat colour's"

    if lin.shape[2] == 1:
        y = lin[..., 0]
        mean = float((y * weight)[solid].sum() / weight[solid].sum())
        y = np.clip(mean + (y - mean) * contrast, 0, 1)
        # The grey goes to the hue of `look.flat` at full strength (its brightest channel 1), so the
        # mean grey that gives the map the flat colour's luminance is that brightest channel.
        peak = float(tint.max())
        y2, how = to_mean(y, peak)
        rgb = y2[..., None] * (tint / peak)[None, None, :]
    else:
        if key in BALANCED:
            mean_rgb = (lin * (weight * solid)[..., None]).sum(axis=(0, 1)) / (weight * solid).sum()
            lin = np.clip(lin * (tint / tint.max() / (mean_rgb / mean_rgb.max()))[None, None, :], 0, 1)
        y = np.clip(lin @ np.array(LUMA), 1e-6, 1)
        rgb = np.maximum(y[..., None] + (lin - y[..., None]) * keep_sat, 0)
        y2, how = to_mean(y, tint_y)
        rgb = rgb * (y2 / y)[..., None]
    clipped = float((rgb.max(axis=2) > 1)[solid].mean())
    # The gaps: the flat colour, feathered. A box blur of the mask, three passes, about 1 % of the width.
    soft = Image.fromarray((v * 255).astype(np.uint8))
    if coverage < 0.9995:
        from PIL import ImageFilter
        hard = Image.fromarray(((v > 0.98) * 255).astype(np.uint8))
        soft = hard.filter(ImageFilter.MinFilter(5)).filter(ImageFilter.GaussianBlur(w / (150 if key in FILL_OWN_MEAN else 400)))
    m = (np.asarray(soft, dtype=np.float64) / 255)[..., None]
    fill = tint
    if key in FILL_OWN_MEAN:
        fill = (np.clip(rgb, 0, 1) * (weight * solid)[..., None]).sum(axis=(0, 1)) / (weight * solid).sum()
    rgb = np.clip(rgb, 0, 1) * m + fill[None, None, :] * (1 - m)
    out = np.where(rgb <= 0.0031308, rgb * 12.92, 1.055 * rgb ** (1 / 2.4) - 0.055)
    if roll:
        out = np.roll(out, w // 2, axis=1)
    img = Image.fromarray(np.clip(out * 255 + 0.5, 0, 255).astype(np.uint8))
    # The size: no map over MOON_MAX_BYTES, since a phone fetches it the first time the moon is visited.
    # Quality first, down to MOON_MIN_Q; a crater field that is still too big at that (Tethys, Dione,
    # Rhea: Cassini's maps are sharp to the pixel) is made narrower, a quarter of 1024 at a time.
    import io

    def size_at(im, q):
        buf = io.BytesIO()
        im.save(buf, "WEBP", quality=q, method=4)
        return buf.tell()

    for width in (w, 1792, 1536, 1280, 1024):
        if width > w:
            continue
        cand = img if width == w else img.resize((width, width // 2), Image.LANCZOS)
        if size_at(cand, MOON_MIN_Q) <= MOON_MAX_BYTES or width == 1024:
            q = MOON_MIN_Q
            while q + 4 <= 84 and size_at(cand, q + 4) <= MOON_MAX_BYTES:
                q += 4
            break
    out_name = ("2k_" if width >= 1536 else "1k_") + out_name
    path = ROOT / "site" / "textures" / out_name
    size = save_webp(cand, path, q)
    report[out_name] = size
    print(f"  {key:10s} {out_name:28s} {width}x{width // 2} q{q} {size:>7,d} bytes  coverage {coverage * 100:5.1f} %  clipped {clipped * 100:.2f} %  {how}", flush=True)


STEPS = {
    "earth-day": build_earth_day,
    "earth-water": build_earth_water,
    "earth-night": build_earth_night,
    "milky-way": build_milky_way,
    "moon": lambda o, r: build_planet(o, "moon", r),
    "mars": lambda o, r: build_planet(o, "mars", r),
    "mercury": build_mercury,
    "venus-surface": build_venus_surface,
    "jupiter": lambda o, r: build_planet(o, "jupiter", r),
    **{f"moon-{k}": (lambda o, r, k=k: build_moon(o, k, r)) for k in MOONS},
}
TIER1 = [k for k in STEPS if not k.startswith("moon-") and k != "venus-surface"]


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--originals", required=True, type=Path)
    ap.add_argument("--only", default="")
    ap.add_argument("--months", default="")
    args = ap.parse_args(argv)
    lazy()
    MONTHS[:] = [int(m) for m in args.months.split(",") if m]
    only = [s for s in args.only.split(",") if s] or TIER1   # the moons are asked for: --only moons
    only = [k for s in only for k in ([f"moon-{m}" for m in MOONS] if s == "moons" else [s])]
    report: dict[str, int] = {}
    for key in only:
        if key not in STEPS:
            print(f"unknown step {key!r}; one of {', '.join(STEPS)}", file=sys.stderr)
            return 2
        STEPS[key](args.originals, report)
        print(f"built {key}")
    for name, size in sorted(report.items()):
        print(f"  {'' if name[:3] in ('1k_', '2k_') else '4k/'}{name:28s} {size:>9,d} bytes")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
