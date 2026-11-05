"""python3 run.py <iridium|oneweb|...> [az,el ...] : build the model and write out/<id>.json and a picture out/<id>.png."""
import importlib
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
name = sys.argv[1]
mod = importlib.import_module(name)
model = mod.build()
os.makedirs(os.path.join(HERE, "out"), exist_ok=True)
js = os.path.join(HERE, "out", mod.FILE_ID + ".json")
tris, ncol = model.export(js)
print(mod.FILE_ID, "triangles", tris, "colours", ncol, "folds", getattr(model, "folds", []))
views = [tuple(float(v) for v in a.split(",")) for a in sys.argv[2:]] or [(30, 25), (-40, 20), (180, 30), (90, 0), (0, -60), (0, 80)]
import lib  # noqa: E402
lib.render(model, os.path.join(HERE, "out", mod.FILE_ID + ".png"), views, size=520, ground=False)
