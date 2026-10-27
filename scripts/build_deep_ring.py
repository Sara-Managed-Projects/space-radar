#!/usr/bin/env python3
"""The planetary nebulae's light (internal spec 0076 stage W3-b, #872; release 1.4.0 stage r14-neb-b): the
photographs the app shows on the card's "compare with the photograph" slider, with their stars taken out, as the
emissivity each reconstruction's layers carry (scene/deep/ring.js). The same bake as scripts/build_deep_helix.py
(the Helix's), on each nebula's picture.

    python3 scripts/build_deep_ring.py [--only=m27,southern-ring]   bake (PIL, numpy, PyYAML); all of TARGETS by default
    python3 scripts/build_deep_ring.py --check                       stdlib only: every output and its manifest match

WHY. Each reconstruction's SHAPE is its papers' (registry/deepsky-heroes/<id>.yaml); its LIGHT is the photograph's.
scene/deep/ring.js spreads this picture along our line of sight through the ring, the lobes and the halo, so from
our side the model is the photograph and turned it is the same structure foreshortened. A star in the picture is
not in the nebula: spread through the lobes it would turn into a streak, so the stars (the central star too: the
hero draws it itself) are taken out first.

WHAT THE BAKE DOES (per TARGETS row).
  1. Reads site/images/nebulae/<row>.webp (baked by scripts/build_nebulae.py from the archive named in
     registry/nebulae.yaml, CC BY 4.0). Nothing is fetched.
  2. Finds the stars: pixels brighter than the 9 x 9 median of their neighbourhood by more than `above`,
     grown by two pixels; fills them with that median; a second pass with a 21 x 21 median takes the wider
     halos of the bright stars, only round those stars. `bright` (r14-neb-b): the brightest stars' discs and
     spikes, a cross of `spike_px` arms and a disc of `disc_px`, are filled from a 31 x 31 median of the rest.
  3. `floor` (r14-neb-b): the sky left between the stars of a dense field (M27's) is taken off: the median of
     the picture outside `radius_arcmin` of the nebula's centre, per channel; and the light fades to nothing
     over the last fifth of `radius_arcmin`, so no field star's remnant is spread through the model.
  4. Writes WebP and a manifest with both SHA-256s, so --check can say the output is this input's.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
NEB = ROOT / "site" / "images" / "nebulae"
DEEP = ROOT / "site" / "images" / "deep"
# id: (the photograph, the light map, the stars' threshold, options). M57's row is W3-b's bake, unchanged.
TARGETS = {
    "m57": {"src": "m57.webp", "out": "ring/ring-light.webp", "above": 18.0,
            "credit": "NASA, ESA, and C. Robert O'Dell (Vanderbilt University) (ESA/Hubble heic1310a), CC BY 4.0; stars removed by Space Radar (scripts/build_deep_ring.py)"},
    # 0078 r14-neb-b: begin
    "m27": {"src": "m27.webp", "out": "m27/m27-light.webp", "above": 26.0, "row": "m27", "floor": True, "radius_arcmin": 7.2,
            "bright": {"disc_px": 5, "spike_px": 0, "above": 60.0},
            # lead review of #1298: the light in its gases' own hues (its narrowband channels: R hydrogen, G sulphur, B oxygen,
            # as registry/nebulae.yaml says) with the waist unclipped and the outer arcs dimmer than the body
            "lines": {"r": ["#ff3a2c", 0.7], "g": ["#c81e1a", 0.3], "b": ["#1fe0b8", 1.0]}, "exposure": 0.68,
            "halo": {"from_arcmin": 4.2, "to_arcmin": 5.6, "gain": 0.5},
            "credit": "T.A. Rector (University of Alaska Anchorage) and H. Schweiker (WIYN and NOIRLab/NSF/AURA) (NOIRLab noao-m27-kpno-mayall-4-m), CC BY 4.0; stars removed by Space Radar (scripts/build_deep_ring.py)"},
    "southern-ring": {"src": "southern-ring-nebula.webp", "out": "southern-ring/southern-ring-light.webp", "above": 45.0, "row": "southern-ring-nebula",
                      "floor": True, "radius_arcmin": 1.08, "bright": {"disc_px": 9, "spike_px": 34, "above": 90.0},
                      "credit": "NASA, ESA, CSA, STScI, and the Webb ERO Production Team (ESA/Webb weic2207b), CC BY 4.0; stars removed by Space Radar (scripts/build_deep_ring.py)"},
    # 0078 r14-neb-b: end
}
SRC = NEB / TARGETS["m57"]["src"]
OUT = DEEP / TARGETS["m57"]["out"]
MANIFEST = OUT.with_name("manifest.json")


def arg(name: str, default: str = "") -> str:
    for a in sys.argv[1:]:
        if a.startswith(f"--{name}="):
            return a.split("=", 1)[1]
    return default


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def row_of(rid: str) -> dict:
    import yaml

    doc = yaml.safe_load((ROOT / "registry" / "nebulae.yaml").read_text(encoding="utf-8"))
    return next(r for r in doc["pictures"] if r["id"] == rid)


def bake_one(hid: str, t: dict) -> int:
    import numpy as np
    from PIL import Image, ImageFilter

    src, out = NEB / t["src"], DEEP / t["out"]
    manifest = out.with_name("manifest.json")
    im = Image.open(src).convert("RGB")
    a = np.asarray(im).astype(np.float32)
    above = float(t["above"])
    med = np.asarray(im.filter(ImageFilter.MedianFilter(9))).astype(np.float32)
    lum = a.mean(axis=2)
    mlum = med.mean(axis=2)
    star = (lum - mlum) > above
    # grow the mask by two pixels (a star's wings)
    m = Image.fromarray((star * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))
    mask = np.asarray(m) > 0
    out_a = a.copy()
    out_a[mask] = med[mask]
    # A bright star's halo is wider than nine pixels: a second pass with a wider median, only round the
    # stars the first pass found (so the nebula's own filaments elsewhere are left alone).
    near = np.asarray(m.filter(ImageFilter.MaxFilter(13))) > 0
    im2 = Image.fromarray(np.clip(out_a, 0, 255).astype(np.uint8))
    med2 = np.asarray(im2.filter(ImageFilter.MedianFilter(21))).astype(np.float32)
    halo = near & ((out_a.mean(axis=2) - med2.mean(axis=2)) > 6.0)
    halo = (np.asarray(Image.fromarray((halo * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(5))) > 0) & near
    out_a[halo] = med2[halo]
    mask = mask | halo
    info = {}
    if t.get("bright"):
        # 0078 r14-neb-b: the brightest stars (the original's 9 x 9 excess over `bright.above`): a disc and, for a
        # telescope with spikes (Webb's eight), a cross of arms, filled from a wide median of the picture without them
        b = t["bright"]
        H, W = lum.shape
        excess = lum - mlum
        # each bright star once: a local maximum of the excess over 11 x 11, above `bright.above`, the brightest 40
        peak = np.asarray(Image.fromarray(np.clip(excess, 0, 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(11))).astype(np.float32)
        ys, xs = np.nonzero((excess > float(b["above"])) & (np.clip(excess, 0, 255).astype(np.uint8) >= peak))
        big = np.zeros_like(mask)
        yy, xx = np.mgrid[0:H, 0:W]
        seen = []
        for y0, x0 in sorted(zip(ys, xs), key=lambda p: -excess[p[0], p[1]])[:40]:
            if any(abs(y0 - y1) < 6 and abs(x0 - x1) < 6 for y1, x1 in seen):
                continue
            seen.append((y0, x0))
            d = b["disc_px"]
            big |= (yy - y0) ** 2 + (xx - x0) ** 2 <= d * d
            s_ = b.get("spike_px", 0)
            if s_:
                for ang in range(0, 180, 30):  # Webb's six long and two short spikes, and a margin: every 30 degrees
                    c_, n_ = np.cos(np.radians(ang)), np.sin(np.radians(ang))
                    along = (xx - x0) * c_ + (yy - y0) * n_
                    across = -(xx - x0) * n_ + (yy - y0) * c_
                    big |= (np.abs(across) <= 1.5) & (np.abs(along) <= s_)
        # the wide median of the picture with the discs and arms first given the 21 x 21 median (never black: a median
        # over zeros would leave a dark star where a bright one was)
        im3 = Image.fromarray(np.clip(np.where(big[..., None], med2, out_a), 0, 255).astype(np.uint8))
        med3 = np.asarray(im3.filter(ImageFilter.MedianFilter(31))).astype(np.float32)
        out_a[big] = med3[big]
        mask = mask | big
        info["bright_stars"] = len(seen)
    if t.get("floor"):
        r = row_of(t["row"])
        H, W = lum.shape
        # picture coordinates in arcminutes from its centre (the nebula's centre is the picture's to a few arcseconds)
        yy, xx = np.mgrid[0:H, 0:W]
        dx = (xx + 0.5 - W / 2) * r["width_arcmin"] / W
        dy = (yy + 0.5 - H / 2) * r["height_arcmin"] / H
        rr = np.hypot(dx, dy)
        R = float(t["radius_arcmin"])
        outside = rr > R
        if outside.sum() > 1000:
            floor = np.median(out_a[outside], axis=0)
        else:
            floor = np.percentile(out_a.reshape(-1, 3), 5, axis=0)
        out_a = np.clip(out_a - floor[None, None, :], 0, None) * (255.0 / (255.0 - floor))[None, None, :]
        fade = np.clip((R - rr) / (0.2 * R), 0, 1)
        out_a *= (fade * fade * (3 - 2 * fade))[..., None]
        info["floor"] = [round(float(x), 1) for x in floor]
    # 0078 r14-neb-b: begin (the lead's review of #1298: M27's light in its gases' own hues, its waist unclipped, its arcs dimmer)
    if t.get("lines"):
        hx = lambda h: np.array([int(h[i:i + 2], 16) for i in (1, 3, 5)], dtype=np.float32) / 255.0
        L = t["lines"]
        M = np.stack([hx(L[c][0]) * float(L[c][1]) for c in ("r", "g", "b")], 0)
        out_a = (out_a / 255.0) @ M
        if t.get("halo"):
            r = row_of(t["row"])
            H, W = out_a.shape[:2]
            yy, xx = np.mgrid[0:H, 0:W]
            rr = np.hypot((xx + 0.5 - W / 2) * r["width_arcmin"] / W, (yy + 0.5 - H / 2) * r["height_arcmin"] / H)
            h = t["halo"]
            k = np.clip((rr - h["from_arcmin"]) / (h["to_arcmin"] - h["from_arcmin"]), 0, 1)
            out_a *= (1.0 - (1.0 - h["gain"]) * k * k * (3 - 2 * k))[..., None]
        out_a = out_a / max(1e-6, float(np.percentile(out_a.max(axis=2), 99.7))) * float(t.get("exposure", 1.0)) * 255.0
        info["lines"] = L
        info["exposure"] = t.get("exposure", 1.0)
        info["halo"] = t.get("halo")
    # 0078 r14-neb-b: end
    out.parent.mkdir(parents=True, exist_ok=True)
    Image.fromarray(np.clip(out_a, 0, 255).astype(np.uint8)).save(out, "WEBP", quality=86, method=6)
    manifest.write_text(json.dumps({
        "file": str(out.relative_to(ROOT)), "bytes": out.stat().st_size, "sha256": sha(out),
        "from": str(src.relative_to(ROOT)), "from_sha256": sha(src),
        "stars_removed_px": int(mask.sum()), "size": list(im.size),
        # the light's brightest luminance (Rec. 709 weights, display values, 99th percentile): scene/deep/ring.js
        # SHAPE.peak holds a turned view's column to it, so the core never goes whiter than the photograph
        "peak_lum_p99": round(float(np.percentile(np.asarray(Image.open(out).convert("RGB")).astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32) / 255.0, 99)), 3),
        **info,
        "credit": t["credit"],
    }, indent=2) + "\n", encoding="utf-8")
    print(f"{hid} light: {out.relative_to(ROOT)} {out.stat().st_size} B, {int(mask.sum())} star pixels filled")
    return 0


def bake() -> int:
    only = [x for x in arg("only").split(",") if x] or list(TARGETS)
    for hid in only:
        bake_one(hid, TARGETS[hid])
    return 0


def check() -> int:
    bad = 0
    for hid, t in TARGETS.items():
        src, out = NEB / t["src"], DEEP / t["out"]
        manifest = out.with_name("manifest.json")
        if not out.exists() or not manifest.exists():
            print(f"STALE   {out.parent.relative_to(ROOT)}/: run python3 scripts/build_deep_ring.py --only={hid}")
            bad += 1
            continue
        m = json.loads(manifest.read_text(encoding="utf-8"))
        if m.get("sha256") != sha(out) or m.get("from_sha256") != sha(src):
            print(f"STALE   {out.relative_to(ROOT)} is not the bake of the current photograph")
            bad += 1
            continue
        print(f"{hid} light ok: {m['bytes']} B from {m['from']}")
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(check() if "--check" in sys.argv[1:] else bake())
