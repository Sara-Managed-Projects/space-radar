"""python3 run.py <module> [az,el ...] : build the model and write out/<id>.json and a picture out/<id>.png (a z-buffer picture, no browser)."""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
export = "--export" in sys.argv
body_only = "--body" in sys.argv
name = args[0]
mod = importlib.import_module(name)
model = mod.build(wings=not body_only)
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
if export:
    tris, ncol = model.export(os.path.join(HERE, "out", mod.FILE_ID + ".json"))
    print(mod.FILE_ID, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []))
else:
    print(mod.FILE_ID, "triangles", model.triangles(), "(preview, nothing exported)")
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(35, 20), (-50, 20), (170, 25), (0, 80)]
import lib  # noqa: E402
lib.render(model, os.path.join(HERE, "out", mod.FILE_ID + ("-body" if body_only else "") + ".png"), views, size=520, ground=False)
