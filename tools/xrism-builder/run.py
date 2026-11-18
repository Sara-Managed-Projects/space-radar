"""python3 run.py <xrism|hitomi> [az,el ...]: build, write out/<id>.json and a z-buffer picture out/<id>.png (no browser)."""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
mod = importlib.import_module(args[0])
model = mod.build()
import xlib  # noqa: E402
wlib = xlib.wlib
wlib.finish(model, mod.FILE_ID, out=os.path.join("..", "xrism-builder", "out"))
if os.environ.get("NORENDER"):
    sys.exit(0)
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(35, 25), (-50, 20), (170, 25), (90, 5), (0, 80), (20, -50)]
wlib.lib.render(model, os.path.join(HERE, "out", mod.FILE_ID + ".png"), views, size=int(os.environ.get("SZ", "520")), ground=False, ss=int(os.environ.get("SS", "2")))
