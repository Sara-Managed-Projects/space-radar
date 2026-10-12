#!/usr/bin/env python3
"""Pluto's map, from NASA's own global colour map (Photojournal PIA11707, 2017-01-19).

    curl -L -o PIA11707.jpg \
      https://assets.science.nasa.gov/content/dam/science/psd/photojournal/pia/pia11/pia11707/PIA11707.jpg
    uv run --with pillow --with numpy --with scipy python scripts/build_pluto_map.py \
        PIA11707.jpg site/textures/2k_pluto_nh_colour.webp

WHY (2026-10-12, a look at the live build). The map this replaces was put together here from the
PDS colour mosaic's bands, with USGS's black-and-white mosaic at half contrast where the colour had
no data. On the globe the footprints of the single image strips, and the black-and-white patches,
met their neighbours along straight and stepped edges: "Pluto still ends on a box". And it was pale
and flat beside every picture of Pluto anybody has seen. PIA11707 is the same New Horizons data
mosaicked by the mission's own team (NASA/JHUAPL/SwRI): the strips are blended there, the
low-resolution approach hemisphere runs into the encounter hemisphere without an edge, and the
colours are the ones the mission published. So this script invents nothing and repairs nothing: it

  1. checks the file is the one that was read (SHA-256 below; 5926 x 2963, 1 423 389 bytes);
  2. finds what the map does not cover: NASA left it black (the far south, in its winter night in
     2015, and one sliver). Pluto has no black ground (its darkest, Cthulhu Macula, is a dark red),
     so black is "no data", and the mask is grown by a few pixels to take the JPEG's dark fringe;
  3. resizes to 2048 x 1024 and rolls it half a turn: PIA11707 has Sputnik Planitia (longitude 180)
     at its centre, and scene/worlds.js wants longitude 0 there;
  4. fills the uncovered part with the covered part's own mean colour (area-weighted), and feathers
     the meeting along the region's TRUE OUTLINE on every side, wrapping in longitude: across
     FEATHER_DEG the picture fades into a wide blur of itself, and the plain colour begins as that
     blur's colour. Nothing is drawn in the part nobody imaged;
  5. takes the whole map, in linear light, to the luminance of the world's flat colour
     (registry/worlds.yaml look.flat), as scripts/build-textures.py does for every moon, so the
     light-to-dark order of the worlds still follows their albedos. The colours' strength is NASA's.

THE COLOURS ARE ENHANCED. New Horizons' colour camera (Ralph/MVIC) had blue, red, near-infrared and
methane filters and no green one; NASA's caption says the map is made from three of them. It is not
what an eye would see, and the card says so (copy/en.js worldMap.enhanced).

Prints the share of the sphere that has data, the gain, and the bytes, for registry/textures.yaml.
"""
import hashlib
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

SHA256 = "e36f3daa1b3b0e911418ff830ddccf8b63e10a082c6ccc96eb7d8170991962d6"
WIDTH, HEIGHT = 2048, 1024
BLACK = 14            # no channel above this, of 255: no data
GROW_PX = 3           # the mask grown by this, at the output's size
FEATHER_DEG = 12.0    # on the data's side of the outline; half as much again on the plain side
FLAT = (0xB4, 0x92, 0x6F)  # registry/worlds.yaml pluto look.flat
QUALITY = 76


def to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_srgb(lin):
    lin = np.clip(lin, 0.0, 1.0)
    return 255.0 * np.where(lin <= 0.0031308, lin * 12.92, 1.055 * lin ** (1 / 2.4) - 0.055)


def luminance(lin):
    return 0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2]


def main():
    src, out_path = sys.argv[1], sys.argv[2]
    raw = open(src, "rb").read()
    got = hashlib.sha256(raw).hexdigest()
    if got != SHA256:
        sys.exit("%s is not the PIA11707.jpg this was written for (sha256 %s)" % (src, got))
    big = Image.open(src).convert("RGB")
    nodata_big = (np.asarray(big).max(axis=2) <= BLACK).astype(np.uint8) * 255
    img = np.asarray(big.resize((WIDTH, HEIGHT), Image.LANCZOS)).astype(np.float32)
    part = np.asarray(Image.fromarray(nodata_big).resize((WIDTH, HEIGHT), Image.BOX)).astype(np.float32) / 255.0
    # Longitude 0 to the centre.
    img = np.roll(img, WIDTH // 2, axis=1)
    part = np.roll(part, WIDTH // 2, axis=1)

    # Everything below works on three copies side by side, so that distance and blur wrap in longitude.
    def wide(a):
        return np.concatenate([a, a, a], axis=1)

    def mid(a):
        return a[:, WIDTH:2 * WIDTH]

    fill = wide(part > 0.02)
    fill = ndimage.binary_dilation(fill, iterations=GROW_PX)
    # A speck of dark ground is not a hole in the map: only pieces of some size count.
    labels, n = ndimage.label(fill)
    if n:
        sizes = ndimage.sum(fill, labels, index=np.arange(1, n + 1))
        fill = np.isin(labels, 1 + np.flatnonzero(sizes >= 3 * 40))
    data = (~fill).astype(np.float32)
    lat = (0.5 - (np.arange(HEIGHT) + 0.5) / HEIGHT) * np.pi
    area = np.cos(lat)[:, None] * np.ones((1, WIDTH), np.float32)
    covered = float((mid(data) * area).sum() / area.sum())

    lin = to_linear(img)
    w = mid(data) * area
    mean_lin = (lin * w[..., None]).sum(axis=(0, 1)) / w.sum()

    px_per_deg = HEIGHT / 180.0
    reach = FEATHER_DEG * px_per_deg
    sigma = reach / 2.0
    lin3 = np.stack([wide(lin[..., c]) for c in range(3)], axis=2)

    def blur(a):
        return ndimage.gaussian_filter(a, sigma=(sigma, sigma * 1.5), mode="nearest")

    wsum = blur(data) + 1e-6
    soft = np.stack([blur(lin3[..., c] * data) / wsum for c in range(3)], axis=2)
    dist = ndimage.distance_transform_edt(~fill) - ndimage.distance_transform_edt(fill)
    k_data = np.clip(dist / reach, 0.0, 1.0)
    k_data = k_data * k_data * (3 - 2 * k_data)
    k_fill = np.clip(-dist / (reach * 1.5), 0.0, 1.0)
    k_fill = k_fill * k_fill * (3 - 2 * k_fill)
    pictured = lin3 * k_data[..., None] + soft * (1 - k_data[..., None])
    plain = soft * (1 - k_fill[..., None]) + mean_lin[None, None, :] * k_fill[..., None]
    out = mid(np.where(fill[..., None], plain, pictured))

    target = float(luminance(to_linear(np.asarray(FLAT, np.float32))))
    gain = target / float((luminance(out) * area).sum() / area.sum())
    out = out * gain
    clipped = float((out.max(axis=2) > 1.0).mean())
    rgb = np.clip(to_srgb(out) + 0.5, 0, 255).astype(np.uint8)
    Image.fromarray(rgb).save(out_path, "WEBP", quality=QUALITY, method=6)
    import os
    print("covered %.3f of the sphere; fill colour (linear) %s; feather %.0f deg (%.0f px); gain %.3f to luminance %.3f; %.4f of the pixels clip; %d bytes"
          % (covered, np.round(mean_lin, 3).tolist(), FEATHER_DEG, reach, gain, target, clipped, os.path.getsize(out_path)))


if __name__ == "__main__":
    main()
