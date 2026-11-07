"""python3 look.py <module> [--body] [az,el ...] : a z-buffer picture of a bus with its Earth deck UP, as the makers' renders show it (release 2.0.0, batch m4-buses).

run.py draws the app's axes as they are (+Y up), so a bus lies on its side; this turns +Z (the Earth deck) to the picture's up first. `--body` leaves the wings out so the body
fills the frame; the picture goes to out/<id>-look[-body].png. Nothing is exported: build.sh does that.
"""
import importlib
import os
import sys

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
if "--help" in sys.argv or len(sys.argv) < 2:
    print(__doc__)
    sys.exit(0)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
mod = importlib.import_module(args[0])
body_only = "--body" in sys.argv
model = mod.build(wings=not body_only)
model.transform(R=np.array([[1.0, 0, 0], [0, 0, 1.0], [0, -1.0, 0]]))
import lib  # noqa: E402
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(30, 25), (120, 20), (210, 25), (300, -30), (0, 75), (90, 0)]
out = os.path.join(HERE, "out", mod.FILE_ID + "-look" + ("-body" if body_only else "") + ".png")
os.makedirs(os.path.dirname(out), exist_ok=True)
lib.render(model, out, views, size=420, ground=False, title="%s  %d triangles" % (mod.FILE_ID, model.triangles()))
print(out, model.triangles())
