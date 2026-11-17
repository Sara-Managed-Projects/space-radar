"""python3 run.py <module> [az,el ...] : build the model, write out/<id>.json and a six-view picture out/<id>.png (a z-buffer picture, no browser)."""
import importlib
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
args = [a for a in sys.argv[1:] if not a.startswith("--")]
mod = importlib.import_module(args[0])
model = mod.build()
import wlib  # noqa: E402
wlib.finish(model, mod.FILE_ID)
suffix = ""
if "--body" in sys.argv:
    WING = {"panel", "panel-rail", "hinge", "yoke", "yoke-brace", "sada", "sada-foil", "sada-ring"}
    model.parts = [p for p in model.parts if p[0] not in WING and not p[0].startswith(("panel", "yoke", "sada", "hinge"))]
    suffix = "-body"
if os.environ.get("NORENDER"):
    sys.exit(0)
views = [tuple(float(v) for v in a.split(",")) for a in args[1:]] or [(35, 25), (-50, 20), (170, 25), (90, 5), (0, 80), (20, -50)]
wlib.lib.render(model, os.path.join(HERE, "out", mod.FILE_ID + suffix + ".png"), views, size=int(os.environ.get("SZ", "520")), ground=False, ss=int(os.environ.get("SS", "2")))
