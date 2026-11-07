"""python3 run.py <units>[-wings] [--export] [az,el ...] : build one CubeSat module, write out/<id>.json (with --export) and a picture out/<id>.png."""
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import cube  # noqa: E402
import lib  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith("--")]
which = args[0]
if which == "lemur2":
    import lemur2
    model, fid = lemur2.build(), "cubesat-lemur2"
else:
    units, with_wings = (which[:-6], True) if which.endswith("-wings") else (which, False)
    model, fid = cube.build(units, with_wings), "cubesat-" + which
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
if "--export" in sys.argv:
    tris, ncol = model.export(os.path.join(HERE, "out", fid + ".json"))
    print(fid, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []))
else:
    print(fid, "triangles", model.triangles(), "(preview)")
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(35, 25), (-50, 20), (150, 25), (20, -50)]
lib.render(model, os.path.join(HERE, "out", fid + ".png"), views, size=520, ground=False)
