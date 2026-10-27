#!/usr/bin/env python3
"""Pluto's and Charon's maps and Pluto's relief, in New Horizons' natural colour (release 1.4.0, r14-pluto).

    # The originals (never committed; every one public domain, see registry/textures.yaml):
    curl -L -o PIA11707.jpg \\
      https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia11/pia11707/PIA11707.jpg
    curl -L -o nh_charon_color_mosaic.img \\
      https://pds-smallbodies.astro.umd.edu/holdings/nh-p_psa-leisa_mvic-5-comp-v1.0/data/mosaic/nh_charon_color_mosaic.img
    curl -L -O https://planetarymaps.usgs.gov/mosaic/Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif
    curl -L -O https://planetarymaps.usgs.gov/mosaic/Pluto_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif
    # only for --fit: the RED and BLUE bands of Pluto's PDS colour mosaic (the last two of its four)
    curl -L -r 527850624-1055701247 -o pluto_red_blue.img \\
      https://pds-smallbodies.astro.umd.edu/holdings/nh-p_psa-leisa_mvic-5-comp-v1.0/data/mosaic/nh_pluto_color_mosaic.img

    uv run --with pillow --with numpy --with scipy --with tifffile python scripts/build_pluto_map.py \\
        --originals DIR [--fit] [--only pluto,charon,pluto-relief]

WHY (2026-10-26, Ivan: "it is disaster what happened to Pluto"). The map of 2026-10-12 was NASA's
ENHANCED colour map (PIA11707) taken by a gain of 1.77 to the flat colour's brightness: the heart and
the north clipped to near-white, Cthulhu was a strip of dark red under a bleached disc, and the
unimaged south was a plain brown that, seen from below, cut across the disc as a dark crescent.

WHAT THIS DOES INSTEAD

  PLUTO'S COLOUR IS NATURAL, MEASURED ON THE MISSION'S OWN REFLECTANCES. PIA11707 stays the picture
  (the mission team blended its strips; nothing here has a seam), but its colours are re-mapped to
  what New Horizons' colour camera measured: red from the RED filter (625 nm), blue from the BLUE
  filter (475 nm), in units of I/F (reflectance) from the PDS colour mosaic. The camera had no green
  filter: green is put GREEN_AT of the way from blue to red (halfway; tried under halfway, which
  reddens Cthulhu but turns every pale plain pink). The map is one curve per channel (PIA11707's
  green to RED, its blue to BLUE), fitted by matching the two pictures' area-weighted histograms
  where both have data (`--fit`; correlation with the PDS reflectances 0.93 red and 0.93 blue). The
  curves are written below, so the build needs only PIA11707. Then the colour is made CHROMA_GAIN
  times as strong in log ratio: the camera's reflectances, shown as linear light, are greyer than
  every natural-colour picture NASA released (PIA20291, PIA19857, PIA19952), and the card says so.
  And the contrast is made CONTRAST times as strong: the mosaic puts Sputnik Planitia at 6.8 times
  Cthulhu, where their albedos are nearer ten to one.

  LOW-RES. The side of Pluto that faces Charon was photographed only from far off (20 to 30 km a
  pixel), and PIA11707's sharpening rings there in stripes a few texels apart -- "the middle of the
  disc smeared into horizontal streaks". Further than ENC_FULL_DEG from the encounter hemisphere's
  centre the picture fades into a blur of itself by SOFT_DEG, under its own resolution, so the
  stripes go and nothing real does. The relief fades out the same way.

  THE SOUTH NOBODY SAW (22 % of Pluto, 27 % of Charon: in winter night in July 2015) IS MODELLED,
  NOT LEFT PLAIN AND NOT PHOTOGRAPHED: its broad colour continues the imaged latitudes above it and
  reaches the imaged map's mean colour RELAX_DEG in, and its texture is a random field on the
  sphere (random waves of 15 to 400 km: no seam at the date line, no pinch at the pole) at
  MODEL_CONTRAST of the imaged ground's own strength. No feature there is real. The old plain fill
  was darker than the bleached map above it and, seen from the south, cut across the disc as a hard
  dark crescent. The card says the south is modelled (copy/en.js worldCoverage).

  CHARON is built the same way from what exists of it: the PDS MVIC colour mosaic (natural colour
  as above, the colour made CHROMA_GAIN times as strong, which brings out Mordor Macula's red cap)
  for the broad colour, USGS's LORRI mosaic (300 m) for the detail, by ratio to its own blur, so
  the black-and-white patches carry no brightness of their own and meet the colour without a step.

  PLUTO'S RELIEF is USGS's global elevation model (P. Schenk et al., stereo from LORRI and MVIC,
  300 m): the relief broader than RELIEF_BLUR_DEG taken out, as Mercury's is, the rest clipped to
  +-RELIEF_RANGE_M and written with 128 as level ground. Where there is no model (55 % of the
  sphere) the ground is level; the edge is faded over RELIEF_EDGE_DEG.

Prints the share of the sphere with data, the gain, the mean colour (look.tint) and the bytes, for
registry/textures.yaml and scene/worlds.js.
"""
import argparse
import hashlib
import os
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "textures"
W, H = 2048, 1024
PIA11707_SHA256 = "e36f3daa1b3b0e911418ff830ddccf8b63e10a082c6ccc96eb7d8170991962d6"
BLACK = 14             # PIA11707: no channel above this, of 255, is no data
GROW_PX = 3            # the no-data mask grown by this at 2048 wide (the JPEG's dark fringe)
CHROMA_GAIN = 2.6      # log(red / blue) and log(green / luminance) made this many times as strong
CONTRAST = 1.25        # Pluto: log luminance about its mean made this many times as strong (see LOW-RES)
SOFT_DEG = 0.6         # Pluto: the blur on the low-resolution hemisphere (see LOW-RES)
# Pluto's ENCOUNTER CAP: New Horizons' sharp pictures and its stereo heights are of the hemisphere
# round (ENC_LON, ENC_LAT); further than ENC_FULL_DEG from it the pictures fade into the soft ones
# (and the heights into level ground), which they are entirely past ENC_ZERO_DEG.
ENC_LON, ENC_LAT, ENC_FULL_DEG, ENC_ZERO_DEG = 175.0, 15.0, 75.0, 95.0
# Charon's: LORRI's sharp pictures are of the hemisphere round (-8 E, 10 N); past it LORRI's far-off
# pictures, stretched by USGS, carry dark blots the colour mosaic does not have, and are held down.
CHARON_ENC = (-8.0, 10.0, 70.0, 90.0)
MODEL_CONTRAST = 0.45  # the modelled south's texture, as a share of the imaged ground's
RELAX_DEG = 15.0       # the modelled colour reaches the map's mean this far into the unimaged part
GREEN_AT = 0.5         # green, between blue (0) and red (1): the camera has no green filter; halfway
FEATHER_DEG = 4.0      # the photograph fades into the model across this much of its own edge
RELIEF_BLUR_DEG = 6.0
RELIEF_RANGE_M = 2500.0
RELIEF_PX = (1536, 768)
RELIEF_EDGE_DEG = 6.0  # the model rings along its own edges (low Sun, far-off pictures): faded over this
# The flat colours' luminance in linear light (registry/worlds.yaml look.flat, unchanged here):
# each map's mean is taken to it, so the light-to-dark order of the worlds still follows albedo.
FLAT_LUMINANCE = {"pluto": 0.3141, "charon": 0.2565}
# `--fit` writes these: PIA11707 linear green -> RED I/F, PIA11707 linear blue -> BLUE I/F, from the
# area-weighted quantiles 0.1 % to 99.9 % of the 1.3 million texels where both have data.
FIT_G = (  # correlation 0.927 with the PDS band
    [0.0015, 0.0034, 0.0044, 0.0048, 0.006, 0.007, 0.0086, 0.0103, 0.013, 0.016, 0.0194, 0.0252,
     0.0307, 0.0369, 0.0437, 0.0529, 0.0612, 0.0704, 0.0782, 0.0887, 0.0976, 0.1046, 0.1119, 0.1221,
     0.1274, 0.1356, 0.1441, 0.15, 0.1559, 0.1651, 0.1714, 0.1779, 0.1845, 0.1912, 0.1981, 0.2016,
     0.2086, 0.2159, 0.2195, 0.227, 0.2307, 0.2346, 0.2423, 0.2462, 0.2502, 0.2541, 0.2622, 0.2664,
     0.2705, 0.2747, 0.2832, 0.2874, 0.2961, 0.3005, 0.305, 0.314, 0.3185, 0.3278, 0.3325, 0.3419,
     0.3467, 0.3564, 0.3813, 0.5972],
    [0.0684, 0.0782, 0.0834, 0.0899, 0.0976, 0.1077, 0.1192, 0.1297, 0.1393, 0.1492, 0.1589, 0.1692,
     0.1793, 0.1893, 0.1987, 0.2079, 0.2177, 0.2268, 0.2364, 0.2469, 0.2579, 0.2686, 0.2791, 0.2884,
     0.2973, 0.3056, 0.3129, 0.3192, 0.3251, 0.3303, 0.335, 0.3395, 0.3436, 0.3477, 0.3514, 0.3549,
     0.3583, 0.3616, 0.3651, 0.3683, 0.3716, 0.375, 0.3784, 0.3821, 0.3859, 0.3897, 0.3946, 0.4005,
     0.407, 0.4138, 0.4205, 0.427, 0.4338, 0.4408, 0.448, 0.4553, 0.4629, 0.4707, 0.4778, 0.4844,
     0.4908, 0.497, 0.504, 0.6055],
)
FIT_B = (  # correlation 0.934 with the PDS band
    [0.0006, 0.0018, 0.0021, 0.0027, 0.0037, 0.0044, 0.0056, 0.007, 0.0091, 0.011, 0.0144, 0.0185,
     0.0232, 0.0284, 0.0331, 0.0409, 0.0482, 0.0561, 0.063, 0.0723, 0.0802, 0.0887, 0.0953, 0.1022,
     0.1095, 0.117, 0.1248, 0.1301, 0.1384, 0.1441, 0.15, 0.1559, 0.162, 0.1683, 0.1746, 0.1812,
     0.1845, 0.1912, 0.1981, 0.2016, 0.2051, 0.2086, 0.2159, 0.2195, 0.2232, 0.227, 0.2346, 0.2384,
     0.2423, 0.2462, 0.2502, 0.2541, 0.2622, 0.2664, 0.2747, 0.2789, 0.2874, 0.2918, 0.3005, 0.3095,
     0.3185, 0.3372, 0.3663, 0.5841],
    [0.0385, 0.0426, 0.046, 0.0509, 0.0586, 0.0676, 0.0787, 0.0875, 0.0959, 0.1045, 0.1132, 0.122,
     0.131, 0.1398, 0.1482, 0.1565, 0.1646, 0.1719, 0.18, 0.189, 0.199, 0.2092, 0.2194, 0.2288, 0.2377,
     0.2462, 0.2533, 0.2594, 0.2647, 0.2693, 0.2736, 0.2773, 0.2806, 0.2838, 0.2868, 0.2898, 0.2926,
     0.2955, 0.2983, 0.301, 0.3037, 0.3065, 0.3096, 0.3126, 0.3154, 0.3187, 0.3221, 0.3259, 0.3301,
     0.3347, 0.3394, 0.3447, 0.3503, 0.3561, 0.3617, 0.3672, 0.3726, 0.3779, 0.3831, 0.3883, 0.394,
     0.4029, 0.4174, 0.5076],
)
# MATCHED TO PIA19952 (2026-10-27, the lead: "next to PIA19952 at the same view, your north reads grey-khaki
# and a little muddy"). NASA's colour picture of the encounter hemisphere, PIA19952, compared with this
# map rendered at its view (sub-observer 150 E, 25 N, turned -30 degrees; tools in the PR), the disc's
# inner 85 % of each: both split into ten bins by brightness (each picture's own quantiles, so no
# registration is needed and lighting does not enter), and in each bin the mean and spread of
# log(red / green) and log(blue / green) measured. A texel takes its bin's PIA19952 mean plus its own
# departure from this map's mean, scaled by the ratio of spreads (held to 0.5 .. 2), interpolated
# between bins by its brightness; its luminance is kept. The bright plains come out paler and less
# khaki, Cthulhu a deep red-brown, as PIA19952 shows them. TUNE_L_EDGES are the luminances (linear,
# after the gain) of the bins' edges on the map the table was measured on.
TUNE_L_EDGES = [0.02865, 0.05593, 0.12629, 0.2189, 0.31547, 0.37201, 0.41143, 0.45783, 0.50629, 0.53756, 0.81671]
TUNE_ROWS = [  # this map: log(R/G) mean, sd, log(B/G) mean, sd; then PIA19952's four
    [0.6421, 0.0548, -0.9199, 0.1023, 1.7356, 0.4307, -0.3799, 0.1570],
    [0.5393, 0.0854, -0.7234, 0.1480, 0.8553, 0.6433, -0.2051, 0.1692],
    [0.3701, 0.0403, -0.4436, 0.0570, 0.2486, 0.3077, -0.0923, 0.0838],
    [0.3003, 0.0309, -0.3524, 0.0408, 0.1494, 0.1888, -0.0808, 0.0768],
    [0.2608, 0.0301, -0.3023, 0.0386, 0.1059, 0.1286, -0.0832, 0.0763],
    [0.2487, 0.0367, -0.2897, 0.0455, 0.1040, 0.0914, -0.1016, 0.0756],
    [0.2655, 0.0567, -0.3104, 0.0704, 0.1015, 0.0726, -0.1244, 0.0885],
    [0.2711, 0.0483, -0.3094, 0.0598, 0.0526, 0.0720, -0.0741, 0.0990],
    [0.2910, 0.0488, -0.3269, 0.0594, 0.0150, 0.0658, -0.0605, 0.1103],
    [0.2653, 0.0411, -0.2996, 0.0474, -0.0095, 0.0778, -0.0782, 0.1114],
]
QUALITY_MAX = {"pluto": 80, "charon": 82}
BYTES_MAX = {"pluto": 100_000, "charon": 90_000}


def to_linear(c):
    c = np.clip(np.asarray(c, np.float32), 0, None) / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(lin):
    lin = np.clip(lin, 0.0, 1.0)
    return 255.0 * np.where(lin <= 0.0031308, lin * 12.92, 1.055 * np.power(lin, 1 / 2.4) - 0.055)


def luminance(lin):
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]


LAT = (0.5 - (np.arange(H) + 0.5) / H) * np.pi
AREA = (np.cos(LAT)[:, None] * np.ones((1, W))).astype(np.float32)
PX_PER_DEG = H / 180.0


def wblur(a, sigma_deg):
    """A Gaussian blur in degrees, wrapped in longitude, wider in pixels toward the poles is not
    needed here: every use is a soft field, not a measurement."""
    s = sigma_deg * PX_PER_DEG
    return ndimage.gaussian_filter(a, sigma=(s, s), mode=("nearest", "wrap"))


def masked_blur(a, w, sigma_deg):
    """Normalised convolution: the blur of what is there, not of what is there and the holes."""
    if a.ndim == 3:
        return np.stack([masked_blur(a[..., c], w, sigma_deg) for c in range(a.shape[2])], axis=2)
    return wblur(a * w, sigma_deg) / np.maximum(wblur(w, sigma_deg), 1e-6)


def inpaint(a, w):
    """Push-pull: a smooth continuation of `a` (H, W, C) into where `w` is 0, by a pyramid of
    weighted means, wrapped in longitude. Where `w` is 1 it returns `a`."""
    levels = []
    cur, cw = a * w[..., None], w.copy()
    while cur.shape[0] > 4:
        levels.append((cur, cw))
        h, ww = cur.shape[0] // 2, cur.shape[1] // 2
        cur = cur[:h * 2, :ww * 2].reshape(h, 2, ww, 2, -1).sum(axis=(1, 3))
        cw = cw[:h * 2, :ww * 2].reshape(h, 2, ww, 2).sum(axis=(1, 3))
    filled = cur / np.maximum(cw, 1e-6)[..., None]
    filled[cw <= 0] = (cur.sum(axis=(0, 1)) / max(cw.sum(), 1e-6))
    for lv, lw in reversed(levels):
        up = np.repeat(np.repeat(filled, 2, axis=0), 2, axis=1)[:lv.shape[0], :lv.shape[1]]
        up = np.stack([ndimage.gaussian_filter(up[..., c], 1.0, mode=("nearest", "wrap")) for c in range(up.shape[2])], 2)
        k = np.clip(lw, 0, 1)[..., None]
        mean = lv / np.maximum(lw, 1e-6)[..., None]
        filled = mean * k + up * (1 - k)
    return filled


def sphere_noise(mask, seed, n_waves=480, lam_km=(20.0, 400.0), radius_km=1188.3, slope=0.5):
    """Random waves on the unit sphere at the texels where `mask` is true: a field with no seam and
    no pole, unit standard deviation, wavelengths log-uniform in `lam_km`, amplitude ~ lambda^slope."""
    rng = np.random.default_rng(seed)
    ys, xs = np.nonzero(mask)
    lat = LAT[ys]
    lon = (xs + 0.5) / W * 2 * np.pi - np.pi
    p = np.stack([np.cos(lat) * np.cos(lon), np.cos(lat) * np.sin(lon), np.sin(lat)], 1).astype(np.float32)
    lam = np.exp(rng.uniform(np.log(lam_km[0]), np.log(lam_km[1]), n_waves))
    k = 2 * np.pi * radius_km / lam
    d = rng.normal(size=(n_waves, 3))
    d /= np.linalg.norm(d, axis=1, keepdims=True)
    amp = lam ** slope
    ph = rng.uniform(0, 2 * np.pi, n_waves)
    out = np.zeros(len(p), np.float32)
    for i in range(0, n_waves, 24):
        kd = (d[i:i + 24] * k[i:i + 24, None]).astype(np.float32)
        out += (np.cos(p @ kd.T + ph[i:i + 24]) * amp[i:i + 24]).sum(axis=1)
    out = (out - out.mean()) / max(out.std(), 1e-6)
    field = np.zeros(mask.shape, np.float32)
    field[ys, xs] = out
    return field


def strengthen(lin, gain):
    """Each colour's ratio to the pixel's luminance raised to `gain`, luminance kept."""
    L = np.maximum(luminance(lin), 1e-5)[..., None]
    r = np.maximum(lin, 1e-5) / L
    out = L * r ** gain
    return out * (L / np.maximum(luminance(out), 1e-5)[..., None])


def model_south(lin, data, seed, contrast_ref_band):
    """The unimaged part (`data` 0): broad colour inpainted and relaxed to the mean, texture modelled.
    Returns the blend of photograph and model and the model alone."""
    fill = data < 0.5
    w = data.astype(np.float32)
    mean = (lin * (w * AREA)[..., None]).sum(axis=(0, 1)) / (w * AREA).sum()
    broad = inpaint(masked_blur(lin, w, 1.5), w)
    dist_in = ndimage.distance_transform_edt(np.concatenate([fill] * 3, 1))[:, W:2 * W] / PX_PER_DEG
    dist_out = ndimage.distance_transform_edt(np.concatenate([~fill] * 3, 1))[:, W:2 * W] / PX_PER_DEG
    relax = np.clip(dist_in / RELAX_DEG, 0, 1)
    relax = (relax * relax * (3 - 2 * relax))[..., None]
    base = broad * (1 - relax) + mean[None, None, :] * relax
    # The imaged ground's own texture: log luminance less its blur, in the reference band of latitudes.
    logL = np.log(np.maximum(luminance(lin), 1e-4))
    hp = logL - masked_blur(logL, w, 3.0)
    lo, hi = contrast_ref_band
    band = (np.degrees(LAT)[:, None] >= lo) & (np.degrees(LAT)[:, None] <= hi) & (data > 0.5)
    sd = float(np.sqrt(np.average(hp[band] ** 2, weights=np.broadcast_to(AREA, hp.shape)[band])))
    # How much redder the dark ground is: the slope of log(red / blue) against log luminance.
    lrb = np.log(np.maximum(lin[..., 0], 1e-4) / np.maximum(lin[..., 2], 1e-4))
    hp_rb = lrb - masked_blur(lrb, w, 3.0)
    red_slope = float(np.sum(hp[band] * hp_rb[band]) / max(np.sum(hp[band] ** 2), 1e-9))
    zone = dist_out < FEATHER_DEG * 2 + 1
    zone |= fill
    n = sphere_noise(zone, seed)
    t = (MODEL_CONTRAST * sd) * n
    model = base * np.exp(t)[..., None]
    tilt = np.exp(0.5 * red_slope * t)
    model[..., 0] *= tilt
    model[..., 2] /= tilt
    k = np.clip(dist_out / FEATHER_DEG, 0, 1)
    k = (k * k * (3 - 2 * k))[..., None]
    out = np.where(fill[..., None], model, lin * k + model * (1 - k))
    return out, {"texture_sd": round(sd, 3), "red_slope": round(red_slope, 3), "fill_colour": np.round(mean, 3).tolist()}


def nodata_mask(rgb_big):
    """PIA11707's black (no data), at 2048 wide, grown and freed of specks, longitude 0 at the centre."""
    nod = (rgb_big.max(axis=2) <= BLACK).astype(np.uint8) * 255
    part = np.asarray(Image.fromarray(nod).resize((W, H), Image.BOX), np.float32) / 255.0
    part = np.roll(part, W // 2, axis=1)
    fill = np.concatenate([part > 0.02] * 3, 1)
    fill = ndimage.binary_dilation(fill, iterations=GROW_PX)
    labels, n = ndimage.label(fill)
    if n:
        sizes = ndimage.sum(fill, labels, index=np.arange(1, n + 1))
        fill = np.isin(labels, 1 + np.flatnonzero(sizes >= 120))
    return ~fill[:, W:2 * W]


def finish(name, lin, target_lum, quality, bytes_max, out_path):
    gain = target_lum / float((luminance(lin) * AREA).sum() / AREA.sum())
    lin = lin * gain
    clipped = float((lin.max(axis=2) > 1.0).mean())
    mean = (lin * AREA[..., None]).sum(axis=(0, 1)) / AREA.sum()
    tint = "".join("%02x" % int(round(float(v))) for v in to_srgb(mean))
    rgb = Image.fromarray(np.clip(to_srgb(lin) + 0.5, 0, 255).astype(np.uint8))
    q = quality
    while True:
        rgb.save(out_path, "WEBP", quality=q, method=6)
        size = os.path.getsize(out_path)
        if size <= bytes_max or q <= 60:
            break
        q -= 2
    print(f"  {name}: gain {gain:.3f} to luminance {target_lum:.4f}; {clipped * 100:.2f} % of texels clip; "
          f"mean colour (look.tint) 0x{tint}; WebP {q}, {size:,d} bytes -> {out_path.relative_to(ROOT)}")
    return size


def match_pia19952(lin):
    """TUNE_ROWS applied: each texel's colour ratios moved to PIA19952's at its brightness, luminance kept."""
    L = np.maximum(luminance(lin), 1e-5)
    q = np.interp(L, TUNE_L_EDGES, np.linspace(0.0, 1.0, len(TUNE_L_EDGES)))
    centres = (np.arange(len(TUNE_ROWS)) + 0.5) / len(TUNE_ROWS)
    rows = np.asarray(TUNE_ROWS)
    at = lambda k: np.interp(q, centres, rows[:, k])
    g = np.maximum(lin[..., 1], 1e-5)
    lrg = np.log(np.maximum(lin[..., 0], 1e-5) / g)
    lbg = np.log(np.maximum(lin[..., 2], 1e-5) / g)
    lrg = at(4) + (lrg - at(0)) * np.clip(at(5) / at(1), 0.5, 2.0)
    lbg = at(6) + (lbg - at(2)) * np.clip(at(7) / at(3), 0.5, 2.0)
    rg, bg = np.exp(lrg), np.exp(lbg)
    G = L / (0.2126 * rg + 0.7152 + 0.0722 * bg)
    return np.stack([G * rg, G, G * bg], axis=2).astype(np.float32)


def fit_curves(orig):
    """`--fit`: the two curves from the PDS colour mosaic's RED and BLUE reflectances."""
    lines, samples = 5744, 11487
    cube = np.memmap(orig / "pluto_red_blue.img", dtype="<f4", mode="r", shape=(2, lines, samples))
    f = 5
    hh, ww = lines // f, samples // f
    bands = []
    for i in range(2):
        b = np.asarray(cube[i, :hh * f, :ww * f], dtype=np.float32)
        ok = np.isfinite(b) & (b > -1) & (b < 2)
        s = np.where(ok, b, 0).reshape(hh, f, ww, f).sum(axis=(1, 3))
        n = ok.reshape(hh, f, ww, f).sum(axis=(1, 3))
        v = (s / np.maximum(n, 1)) * (n == f * f)
        vi = np.asarray(Image.fromarray(v.astype(np.float32)).resize((W, H), Image.BILINEAR))
        wi = np.asarray(Image.fromarray((n == f * f).astype(np.float32)).resize((W, H), Image.BILINEAR))
        bands.append(np.where(wi > 0.99, vi / np.maximum(wi, 1e-6), np.nan))
    pia = to_linear(np.asarray(Image.open(orig / "PIA11707.jpg").convert("RGB").resize((W, H), Image.LANCZOS)))
    ok = np.isfinite(bands[0]) & np.isfinite(bands[1]) & (pia.max(axis=2) > to_linear(BLACK)) & (bands[0] > 0.01) & (bands[1] > 0.005)
    area = np.cos(LAT)[:, None] * np.ones((1, W))
    qs = np.linspace(0.001, 0.999, 64)

    def q(a):
        o = np.argsort(a[ok])
        c = np.cumsum(area[ok][o])
        return np.interp(qs, c / c[-1], a[ok][o])
    g, b = (q(pia[..., 1]), q(bands[0])), (q(pia[..., 2]), q(bands[1]))
    for name, (x, y), band in (("FIT_G", g, bands[0]), ("FIT_B", b, bands[1])):
        mapped = np.interp(pia[..., 1 if name == "FIT_G" else 2], x, y)
        print(f"{name} = ({np.round(x, 5).tolist()}, {np.round(y, 5).tolist()})  # correlation {np.corrcoef(mapped[ok], band[ok])[0, 1]:.3f}")
    return g, b


def pluto_dem(orig):
    """USGS's Pluto elevation model at 2048 x 1024, longitude 0 at the centre, and where it has heights."""
    import tifffile
    path = orig / "Pluto_NewHorizons_Global_DEM_300m_Jul2017_16bit.tif"
    if not path.exists():
        return None, None
    dem = tifffile.imread(path)
    f = 12
    hh, ww = dem.shape[0] // f, dem.shape[1] // f
    b = dem[:hh * f, :ww * f].astype(np.float32)
    ok = b != -32768
    s = np.where(ok, b, 0).reshape(hh, f, ww, f).sum(axis=(1, 3))
    n = ok.reshape(hh, f, ww, f).sum(axis=(1, 3))
    m = (s / np.maximum(n, 1)).astype(np.float32)
    valid = (n >= f * f * 0.9).astype(np.float32)
    hgt = np.asarray(Image.fromarray(m * valid).resize((W, H), Image.LANCZOS))
    vw = np.asarray(Image.fromarray(valid).resize((W, H), Image.BILINEAR))
    hgt = np.where(vw > 0.5, hgt / np.maximum(vw, 1e-6), 0.0)
    # The model has longitude 180 at its centre, as PIA11707 does.
    return np.roll(hgt, W // 2, axis=1), np.roll(vw > 0.99, W // 2, axis=1)


def encounter_cap(cap=None):
    """1 within `full` degrees of the encounter hemisphere's centre, 0 past `zero`, smooth between."""
    c_lon, c_lat, full, zero = cap or (ENC_LON, ENC_LAT, ENC_FULL_DEG, ENC_ZERO_DEG)
    lon = ((np.arange(W) + 0.5) / W * 2 * np.pi - np.pi)[None, :]
    lat = LAT[:, None]
    c0 = np.radians(c_lat)
    cosang = np.sin(lat) * np.sin(c0) + np.cos(lat) * np.cos(c0) * np.cos(lon - np.radians(c_lon))
    ang = np.degrees(np.arccos(np.clip(cosang, -1, 1)))
    k = np.clip((zero - ang) / (zero - full), 0, 1)
    return (k * k * (3 - 2 * k)).astype(np.float32)


def build_pluto(orig):
    raw = (orig / "PIA11707.jpg").read_bytes()
    if hashlib.sha256(raw).hexdigest() != PIA11707_SHA256:
        sys.exit("PIA11707.jpg is not the file this was written for")
    big = np.asarray(Image.open(orig / "PIA11707.jpg").convert("RGB"))
    data = nodata_mask(big).astype(np.float32)
    lin = to_linear(np.roll(np.asarray(Image.fromarray(big).resize((W, H), Image.LANCZOS)), W // 2, axis=1))
    if FIT_G is None or FIT_B is None:
        sys.exit("no curves: run with --fit once and paste FIT_G and FIT_B into this file")
    red = np.interp(lin[..., 1], *FIT_G)
    blue = np.interp(lin[..., 2], *FIT_B)
    nat = np.stack([red, blue + GREEN_AT * (red - blue), blue], axis=2).astype(np.float32)
    nat = strengthen(nat, CHROMA_GAIN)
    # Contrast: the mosaic's reflectances put Sputnik Planitia at 6.8 times Cthulhu's; their normal
    # albedos are nearer ten to one (Buratti et al. 2017), and every NASA picture shows the belt darker.
    L = np.maximum(luminance(nat), 1e-5)
    lmean = float(np.exp((np.log(L) * data * AREA).sum() / (data * AREA).sum()))
    nat = nat * ((L / lmean) ** (CONTRAST - 1.0))[..., None]
    # LOW-RES: outside the encounter hemisphere (where USGS's elevation model has no heights) PIA11707 is
    # made of pictures from 20 to 30 km a pixel, sharpened, and its sharpening rings in stripes a few
    # texels apart ("the middle of the disc smeared into horizontal streaks"). There it is blurred by
    # SOFT_DEG, under its own resolution, so the stripes go and nothing real does.
    k = (1.0 - encounter_cap())[..., None]
    soft = np.stack([wblur(nat[..., c], SOFT_DEG) for c in range(3)], axis=2)
    nat = nat * (1 - k) + soft * k
    print(f"  pluto: the low-resolution part blurred by {SOFT_DEG} degrees: {float((k[..., 0] * AREA).sum() / AREA.sum()):.3f} of the sphere")
    covered = float((data * AREA).sum() / AREA.sum())
    out, info = model_south(nat, data, seed=1407, contrast_ref_band=(-35, 10))
    print(f"  pluto: data on {covered:.3f} of the sphere; modelled south: {info}")
    # The table was measured on the map after its gain: take it there first (the gain below is then 1).
    out = out * (FLAT_LUMINANCE["pluto"] / float((luminance(out) * AREA).sum() / AREA.sum()))
    out = match_pia19952(out)
    return finish("pluto", out, FLAT_LUMINANCE["pluto"], QUALITY_MAX["pluto"], BYTES_MAX["pluto"], OUT / "2k_pluto_nh_colour.webp")


def build_charon(orig):
    lines, samples = 1904, 3808
    cube = np.memmap(orig / "nh_charon_color_mosaic.img", dtype="<f4", mode="r", shape=(4, lines, samples))

    def band(i):
        b = np.asarray(cube[i], dtype=np.float32)
        ok = np.isfinite(b) & (b > -1) & (b < 2)
        v = np.asarray(Image.fromarray(np.where(ok, b, 0).astype(np.float32)).resize((W, H), Image.BILINEAR))
        w = np.asarray(Image.fromarray(ok.astype(np.float32)).resize((W, H), Image.BILINEAR))
        return np.where(w > 0.99, v / np.maximum(w, 1e-6), 0.0), (w > 0.99)
    red, okr = band(2)
    blue, okb = band(3)
    col_ok = okr & okb & (red > 0.01) & (blue > 0.01)
    col_ok = ndimage.binary_erosion(col_ok, iterations=2)
    import tifffile
    pan_big = tifffile.imread(orig / "Charon_NewHorizons_Global_Mosaic_300m_Jul2017_8bit.tif")
    f = 6
    hh, ww = pan_big.shape[0] // f, pan_big.shape[1] // f
    b = pan_big[:hh * f, :ww * f].astype(np.float32)
    okp = b > 0
    s = b.reshape(hh, f, ww, f).sum(axis=(1, 3))
    n = okp.reshape(hh, f, ww, f).sum(axis=(1, 3))
    v = np.where(n == f * f, s / np.maximum(n, 1), 0).astype(np.float32)
    pan = to_linear(np.asarray(Image.fromarray(v).resize((W, H), Image.LANCZOS)))
    pan_ok = np.asarray(Image.fromarray((n == f * f).astype(np.float32)).resize((W, H), Image.BILINEAR)) > 0.99
    pan_ok = ndimage.binary_erosion(pan_ok, iterations=3)
    nat = np.stack([red, blue + GREEN_AT * (red - blue), blue], axis=2).astype(np.float32)
    nat = strengthen(nat, CHROMA_GAIN)
    wc = col_ok.astype(np.float32)
    # Broad colour and brightness from the reflectances, carried smoothly past their footprint.
    broad = inpaint(masked_blur(nat, wc, 1.2), wc)
    # Detail from LORRI by ratio to its own blur: no patch brings a brightness of its own. Off the
    # encounter hemisphere (CHARON_ENC: LORRI's far-off pictures, stretched by USGS into dark blots the
    # colour mosaic does not have) the detail is held to 35 % and to +-0.6 in log brightness.
    wp = pan_ok.astype(np.float32)
    detail = np.log(np.maximum(pan, 1e-4)) - masked_blur(np.log(np.maximum(pan, 1e-4)), wp, 1.2)
    sharp = encounter_cap(CHARON_ENC)
    detail = np.clip(detail, -1.2, 1.2) * sharp + 0.35 * np.clip(detail, -0.6, 0.6) * (1 - sharp)
    detail *= wp
    img = broad * np.exp(detail)[..., None]
    data = (col_ok | pan_ok).astype(np.float32)
    covered = float((data * AREA).sum() / AREA.sum())
    out, info = model_south(img, data, seed=606, contrast_ref_band=(-35, 30))
    print(f"  charon: colour on {float((wc * AREA).sum() / AREA.sum()):.3f}, LORRI or colour on {covered:.3f} of the sphere; modelled south: {info}")
    return finish("charon", out, FLAT_LUMINANCE["charon"], QUALITY_MAX["charon"], BYTES_MAX["charon"], OUT / "2k_charon_nh_colour.webp")


def build_pluto_relief(orig):
    hgt, v = pluto_dem(orig)
    wv = v.astype(np.float32)
    local = hgt - masked_blur(hgt, wv, RELIEF_BLUR_DEG)
    edge = ndimage.distance_transform_edt(np.concatenate([v] * 3, 1))[:, W:2 * W] / PX_PER_DEG
    k = np.clip(edge / RELIEF_EDGE_DEG, 0, 1)
    # Level near the pole (where a texel is a sliver) and south of 58 S (the model's last, rippled rows).
    la = np.degrees(LAT)
    pole = (np.clip((85.0 - la) / 10.0, 0, 1) * np.clip((la + 58.0) / 13.0, 0, 1))[:, None]
    local = local * k * k * (3 - 2 * k) * encounter_cap() * pole
    clipped = float((np.abs(local[v]) > RELIEF_RANGE_M).mean())
    rms = float(local[v].std())
    # 1536 wide, as Mars's: what the GPU budget of a tier-1 device had room for (tier1_texture_gpu_mib).
    local = np.asarray(Image.fromarray(local.astype(np.float32)).resize(RELIEF_PX, Image.LANCZOS))
    byte = np.clip(np.round(128 + local / RELIEF_RANGE_M * 127), 1, 255).astype(np.uint8)
    out = OUT / "2k_pluto_relief.webp"
    Image.fromarray(byte).save(out, "WEBP", quality=80, method=6)
    cov = float((wv * AREA).sum() / AREA.sum())
    print(f"  pluto relief: model on {cov:.3f} of the sphere; local relief rms {rms:.0f} m; "
          f"{clipped * 100:.2f} % beyond +-{RELIEF_RANGE_M:.0f} m; {os.path.getsize(out):,d} bytes -> {out.relative_to(ROOT)}")


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--originals", required=True, type=Path)
    ap.add_argument("--fit", action="store_true")
    ap.add_argument("--only", default="pluto,charon,pluto-relief")
    a = ap.parse_args()
    global FIT_G, FIT_B
    if a.fit:
        FIT_G, FIT_B = fit_curves(a.originals)
    only = set(a.only.split(","))
    if "pluto" in only:
        build_pluto(a.originals)
    if "charon" in only:
        build_charon(a.originals)
    if "pluto-relief" in only:
        build_pluto_relief(a.originals)


if __name__ == "__main__":
    main()
