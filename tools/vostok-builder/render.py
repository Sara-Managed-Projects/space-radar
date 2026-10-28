"""A picture of a parts json (vlib.Vehicle.export) without a browser: a numpy z-buffer, interpolated creased normals, a
soft key light with a little specular on metal and foil, flat colours as built. For judging shape and part placement
against photographs, nothing more (the app's own light is the look workflow's).

  python3 render.py in.json out.png [az,el ...] [--size N] [--centre x,y,z] [--radius r] [--only a,b] [--hide a,b]
                                    [--ss 2] [--bg r,g,b] [--explode k]
"""
import json
import math
import sys

import numpy as np
from PIL import Image, ImageDraw


def hexrgb(h):
    return np.array([int(h[i:i + 2], 16) / 255 for i in (1, 3, 5)])


def load(path, only=None, hide=None, explode=0.0):
    d = json.load(open(path))
    tris = []   # (role, rgb, P(n,3,3), N(n,3,3))

    def walk(p, off, depth):
        o = np.array(p["origin"]) + off
        name = p["name"]
        skip = (only and name not in only and not any(a in only for a in anc)) if False else False
        ok = True
        if only and not (name in only or depth_in(only, p)):
            ok = False
        if hide and name in hide:
            return
        if ok:
            ex = np.array([0.0, 0.0, 0.0])
            for g in p["groups"]:
                P = np.array(g["positions"]) + o
                N = np.array(g["normals"])
                I = np.array(g["indices"]).reshape(-1, 3)
                tris.append((g["role"], hexrgb(g["colour"]), P[I], N[I]))
        for c in p["children"]:
            walk(c, o, depth + 1)

    def depth_in(only, p):
        return False

    anc = []
    if only:
        # keep a part when it or any ancestor is named
        def walk2(p, off, keep):
            o = np.array(p["origin"]) + off
            k = keep or p["name"] in only
            if hide and p["name"] in hide:
                return
            if k:
                for g in p["groups"]:
                    P = np.array(g["positions"]) + o
                    N = np.array(g["normals"])
                    I = np.array(g["indices"]).reshape(-1, 3)
                    tris.append((g["role"], hexrgb(g["colour"]), P[I], N[I]))
            for c in p["children"]:
                walk2(c, o, k)
        for p in d["parts"]:
            walk2(p, np.zeros(3), False)
    else:
        for p in d["parts"]:
            walk(p, np.zeros(3), 0)
    return tris


def shade_rgb(rgb, n, view, role, L):
    # soft key + fill + ambient
    k = np.clip(n @ L[0], 0, 1)
    f = np.clip(n @ L[1], 0, 1)
    amb = 0.22
    out = rgb[None, :] * (amb + 0.78 * k[:, None] + 0.25 * f[:, None])
    if role in ("foil", "solar-panel"):
        h = unit_v(L[0] + view)
        out = out + 0.22 * (np.clip(n @ h, 0, 1) ** 14)[:, None]
    else:
        h = unit_v(L[0] + view)
        m = (rgb.max() > 0.2) * 0.07
        out = out + m * (np.clip(n @ h, 0, 1) ** 30)[:, None]
    return np.clip(out, 0, 1)


def unit_v(v):
    return v / (np.linalg.norm(v) + 1e-12)


def _view(tris, az, el, size, ss, centre, radius, bg):
    S = size * ss
    a, e = math.radians(az), math.radians(el)
    eye = np.array([math.sin(a) * math.cos(e), math.sin(e), math.cos(a) * math.cos(e)])
    fwd = -eye
    right = np.cross(fwd, [0, 1, 0])
    right /= np.linalg.norm(right)
    up = np.cross(right, fwd)
    key = unit_v(eye * 0.55 - right * 0.55 + up * 0.62)
    fill = unit_v(eye * 0.3 + right * 0.7 - up * 0.3)
    L = (key, fill)
    sc = S * 0.47 / radius
    Z = np.full((S, S), 1e18)
    C = np.zeros((S, S, 3))
    C[:] = np.array(bg) / 255.0
    for role, rgb, T, Nn in tris:
        P = T - centre
        x = P @ right * sc + S / 2
        y = S / 2 - P @ up * sc
        z = P @ fwd
        fn = np.cross(T[:, 1] - T[:, 0], T[:, 2] - T[:, 0])
        facing = fn @ eye
        inside = (x.max(1) >= 0) & (x.min(1) <= S) & (y.max(1) >= 0) & (y.min(1) <= S)
        for k in np.nonzero((facing > 0) & inside)[0]:
            xs, ys = x[k], y[k]
            x0, x1 = int(max(0, math.floor(xs.min()))), int(min(S - 1, math.ceil(xs.max())))
            y0, y1 = int(max(0, math.floor(ys.min()))), int(min(S - 1, math.ceil(ys.max())))
            if x1 < x0 or y1 < y0:
                continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
            d = (ys[1] - ys[2]) * (xs[0] - xs[2]) + (xs[2] - xs[1]) * (ys[0] - ys[2])
            if abs(d) < 1e-9:
                continue
            l0 = ((ys[1] - ys[2]) * (gx - xs[2]) + (xs[2] - xs[1]) * (gy - ys[2])) / d
            l1 = ((ys[2] - ys[0]) * (gx - xs[2]) + (xs[0] - xs[2]) * (gy - ys[2])) / d
            l2 = 1 - l0 - l1
            m = (l0 >= -1e-6) & (l1 >= -1e-6) & (l2 >= -1e-6)
            if not m.any():
                continue
            zz = l0 * z[k, 0] + l1 * z[k, 1] + l2 * z[k, 2]
            sub = Z[y0:y1 + 1, x0:x1 + 1]
            w = m & (zz < sub)
            if not w.any():
                continue
            nn = (l0[w][:, None] * Nn[k, 0] + l1[w][:, None] * Nn[k, 1] + l2[w][:, None] * Nn[k, 2])
            nn = nn / (np.linalg.norm(nn, axis=1)[:, None] + 1e-12)
            col = shade_rgb(rgb, nn, eye, role, L)
            sub[w] = zz[w]
            C[y0:y1 + 1, x0:x1 + 1][w] = col
    im = Image.fromarray((np.clip(C, 0, 1) * 255).astype(np.uint8)).resize((size, size), Image.LANCZOS)
    ImageDraw.Draw(im).text((6, 6), "az %g el %g" % (az, el), fill=(200, 200, 200))
    return im


def _one(args):
    return _view(*args)


def render(tris, views, size=520, ss=2, centre=None, radius=None, bg=(14, 16, 22), title=None, cols=3):
    import multiprocessing as mp
    allp = np.vstack([t[2].reshape(-1, 3) for t in tris])
    lo, hi = allp.min(0), allp.max(0)
    if centre is None:
        centre = (lo + hi) / 2
    if radius is None:
        radius = np.linalg.norm(hi - lo) / 2
    with mp.get_context("fork").Pool(min(len(views), 4)) as pool:
        tiles = pool.map(_one, [(tris, az, el, size, ss, centre, radius, bg) for az, el in views])
    cols = min(cols, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    top = 22 if title else 0
    sheet = Image.new("RGB", (cols * size, rows * size + top), tuple(bg))
    for k, im in enumerate(tiles):
        sheet.paste(im, ((k % cols) * size, (k // cols) * size + top))
    if title:
        ImageDraw.Draw(sheet).text((8, 6), title, fill=(230, 230, 230))
    return sheet


if __name__ == "__main__":
    argv = sys.argv[1:]
    opts, pos, i = {}, [], 0
    while i < len(argv):
        if argv[i].startswith("--"):
            opts[argv[i]] = argv[i + 1]
            i += 2
        else:
            pos.append(argv[i])
            i += 1
    js, out = pos[0], pos[1]
    views = [tuple(float(v) for v in s.split(",")) for s in pos[2:]] or [(30, 12), (120, 8), (210, 18), (300, 6), (0, 60), (0, -50)]
    only = set(opts["--only"].split(",")) if "--only" in opts else None
    hide = set(opts["--hide"].split(",")) if "--hide" in opts else None
    tr = load(js, only, hide)
    centre = np.array([float(v) for v in opts["--centre"].split(",")]) if "--centre" in opts else None
    radius = float(opts["--radius"]) if "--radius" in opts else None
    bg = tuple(int(v) for v in opts["--bg"].split(",")) if "--bg" in opts else (14, 16, 22)
    render(tr, views, int(opts.get("--size", 520)), int(opts.get("--ss", 2)), centre, radius, bg,
           title=opts.get("--title", js.split("/")[-1]), cols=int(opts.get("--cols", 3))).save(out)
