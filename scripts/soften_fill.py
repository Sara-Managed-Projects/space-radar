#!/usr/bin/env python3
"""Soften the edge between a map's real data and the plain colour that fills what nobody imaged.

    uv run --with pillow --with numpy --with scipy python scripts/soften_fill.py \
        site/textures/2k_pluto_nh_colour.webp [--feather-deg 9] [--quality 82]

WHY. Pluto's far south was in its winter night when New Horizons passed, and scripts/build-textures.py
fills it with the map's own mean colour: "left plain, not guessed" (copy/en.js). But the fill met the
data along the ragged edge of the last lit strip, a hard line in one flat grey, and on the globe that
read as a broken texture (Ivan, 2026-10-12). This keeps the promise and loses the line:

  - the fill region is found as it was made: pixels of the fill's exact colour, joined to the
    bottom (or top) row;
  - across `feather-deg` of latitude on the data side of the edge, the picture fades into a heavily
    blurred copy of itself, so detail dies away before the edge instead of being cut;
  - inside the fill, the colour starts as that blurred data's colour at the edge and settles to the
    fill's own colour further in, so there is no step in colour either.

Nothing is drawn in the unseen part: it stays a smooth plain tone with no feature in it.
Rewrites the file in place; prints the share of the map that was fill, for registry/textures.yaml.
"""
import sys

import numpy as np
from PIL import Image
from scipy import ndimage


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    opt = dict(a[2:].split("=", 1) if "=" in a else (a[2:], "1") for a in sys.argv[1:] if a.startswith("--"))
    path = args[0]
    feather_deg = float(opt.get("feather-deg", 9))
    quality = int(opt.get("quality", 82))
    img = np.asarray(Image.open(path).convert("RGB")).astype(np.float32)
    h, w, _ = img.shape
    # The fill's colour: the commonest colour of the bottom row, or of the top row if that is flatter.
    def flat(row):
        vals, counts = np.unique(row.reshape(-1, 3).round().astype(np.int32), axis=0, return_counts=True)
        return vals[counts.argmax()], counts.max() / row.shape[0]
    (cb, fb), (ct, ft) = flat(img[-1]), flat(img[0])
    colour, from_bottom = (cb, True) if fb >= ft else (ct, False)
    near = (np.abs(img - colour).max(axis=2) <= 3)            # WebP moves a flat colour by a level or two
    seeds = np.zeros_like(near)
    seeds[-1 if from_bottom else 0] = near[-1 if from_bottom else 0]
    labels, _ = ndimage.label(near)
    keep = np.unique(labels[seeds])
    fill = np.isin(labels, keep[keep > 0])
    fill = ndimage.binary_closing(fill, iterations=2) | fill
    share = float(fill.mean())
    px_per_deg = h / 180.0
    sigma = feather_deg * px_per_deg / 2.0
    data = (~fill).astype(np.float32)
    # A blurred copy of the DATA ONLY, carried into the fill (normalised convolution), wrapping in longitude.
    def blur(a, s):
        return ndimage.gaussian_filter(a, sigma=(s, s * 2.0), mode=("nearest", "wrap"))
    wsum = blur(data, sigma) + 1e-6
    soft = np.stack([blur(img[..., c] * data, sigma) / wsum for c in range(3)], axis=2)
    # How far each pixel is from the edge, in pixels: positive in the data, negative in the fill.
    dist = ndimage.distance_transform_edt(~fill) - ndimage.distance_transform_edt(fill)
    reach = feather_deg * px_per_deg
    k_data = np.clip(dist / reach, 0.0, 1.0)                  # 0 at the edge, 1 a feather in
    k_data = k_data * k_data * (3 - 2 * k_data)
    k_fill = np.clip(-dist / (reach * 1.5), 0.0, 1.0)         # 0 at the edge, 1 well inside the fill
    k_fill = k_fill * k_fill * (3 - 2 * k_fill)
    out = img * k_data[..., None] + soft * (1 - k_data[..., None])
    plain = soft * (1 - k_fill[..., None]) + np.asarray(colour, np.float32) * k_fill[..., None]
    out = np.where(fill[..., None], plain, out)
    Image.fromarray(np.clip(out + 0.5, 0, 255).astype(np.uint8)).save(path, "WEBP", quality=quality, method=6)
    print("fill %.3f of the map, from the %s; feather %.1f deg (%.0f px)" % (share, "south" if from_bottom else "north", feather_deg, reach))


if __name__ == "__main__":
    main()
