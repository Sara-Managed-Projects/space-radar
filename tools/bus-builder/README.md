# tools/bus-builder: eight geostationary-bus drafts, HELD (release 2.0.0, batch m2-buses; forge #117)

`glib.py` and one module a bus (`e3000.py`, `spacebus.py`, `b702.py`, `geostar2.py`, `dfh4.py`, `a2100.py`, `ds2000.py`, `i3k.py`; `i2k.py` too) build a geostationary bus in code from McDowell's GCAT sizes
(length, width, span of the satellites that fly it) and the makers' renders on Gunter's Space Page. **None of them ships**: no file is in `site/models/`, no route names one, and
`registry/geo-buses.yaml` marks every one of these families `file: null` with the reason.

**Why they are held.** Side by side with the makers' renders (the contact sheets of the batch, `~/space-radar-handoff/release-2.0/looks/m2-buses/`) the eight files were one template recoloured: a gold or white box with
radiator panels, two or three dishes on arms and short wings with the right panel count. The features that make each bus recognisable at a glance were not there: the Eurostar E3000's big multi-reflector front (four large shaped
reflectors almost the height of the body), the Boeing 702's very long, narrow wings, the A2100's slab body and stand-off wing struts, the DS2000's variants. The sizes were GCAT's medians, but body, panel width and reflector
layout were ours, read off renders, and there is no photograph of flight hardware to correct them against (a geostationary satellite is not photographed from outside). They would also have replaced NASA's real SSL-1300 model as
the picture of satellites whose bus is that one. A wrong-looking mesh on a real object is the failure this project is built to avoid.

**What would let one ship:** clean-room drawings or flight photographs of that bus (a maker's published drawing with the reflector layout, or photographs of the flight model in the factory, under a licence that lets them be
looked at and cited), and a look side by side from four angles. Until then the satellites keep the SSL-1300 stand-in, and their card names the bus with its citation ("Bus: Eurostar E3000 (GCAT). Drawn with a stand-in bus.").

`python3 tools/bus-builder/run.py <module> [--body] [az,el ...]` draws a module with the z-buffer renderer; `GLTFKIT=<dir> tools/bus-builder/build.sh <module>` writes a .glb to `site/models/` (do not commit it).
