"""vostok-blok-e: the spent third stage of the Vostok launcher (Blok E, 8K72K; catalogue name SL-3 R/B), as it stays in orbit: the hull with its RD-0109 bell and four verniers and
the payload adapter, WITHOUT the truss (it stays with the core) and without the shroud.

  python3 blok_e_stage.py out/vostok-blok-e.json

It is `r7.build_blok_e()`, the part the Vostok launcher of release 1.5.0 (`r7-8k72k.glb`) is made of, taken out on its own and put with its centre of the hull at the origin, +Y up the stage's axis,
the adapter up. So its sizes and its sources are that part's: 2.56 m across (Astronautix, ru.wikipedia), 3.1 m from the skirt to the adapter's top ring with the cone, the engine and verniers as
the museum photographs at VDNKh and Kaluga and the Russian cutaway drawing (public domain, `R-7 vostok.jpg` on Wikimedia Commons, 'Блок III ступени 2980' = 2.98 m) give them. The
registry row `vostok-blok-e` says which numbers are published and which are read off the pictures.
"""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import r7  # noqa: E402
import vlib  # noqa: E402,F401
import lib  # noqa: E402


def build():
    st = r7.build_blok_e()
    m = st.m
    lo, hi = m.bounds()
    # the centre of the hull (not of the cone and bell): x, z on the axis, y at the middle of the hull
    cy = (r7.Y_E0 + r7.Y_E1) / 2
    m.transform(t=(-0.0, -cy, -0.0))
    return m


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "out", "vostok-blok-e.json")
    os.makedirs(os.path.dirname(out) or ".", exist_ok=True)
    mod = build()
    tris, ncol = mod.export(out)
    lo, hi = mod.bounds()
    print("vostok-blok-e triangles", tris, "colours", ncol, "size", [round(float(v), 2) for v in (hi - lo)])
