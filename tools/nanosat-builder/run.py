"""python3 run.py <family> [--export] [az,el ...] : build one model of this batch, write out/<family>.json (with --export) and a picture out/<family>.png."""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "stage-builder"))
import lib  # noqa: E402

args = [a for a in sys.argv[1:] if not a.startswith("--")]
fid = args[0]
model = importlib.import_module(fid).build()
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
if "--export" in sys.argv:
    tris, ncol = model.export(os.path.join(HERE, "out", fid + ".json"))
    print(fid, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []))
else:
    print(fid, "triangles", model.triangles(), "(preview)")
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(35, 25), (-50, 20), (150, 25), (20, -50)]
lib.render(model, os.path.join(HERE, "out", fid + ".png"), views, size=520, ground=False)
