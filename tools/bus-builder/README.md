# tools/bus-builder: geostationary buses in code (release 2.0.0; forge #117)

`glib.py` holds the parts (on the part library of `tools/stage-builder/lib.py` and `tools/comms-builder/clib.py`); one module a bus builds it from a few dozen calls. Every module's
head note says which sizes are cited (McDowell's GCAT, CC BY 4.0; Wikipedia infoboxes; the makers' figures), which pictures were LOOKED AT ONLY, and what is ours (estimated).

## Drawn (batch m4-buses)

Four families ship, each rebuilt to its own layout after batch m2 held one recoloured template for all of them:

| Module | File | What makes it itself |
|---|---|---|
| `e3000.py` | `bus-eurostar-e3000.glb` | a tall gold box, broad OSR radiators proud of it, two big deployed reflectors on each of the east and west walls (one high, one low), a deck tower, four-panel wings on long V yokes |
| `b702.py` | `bus-boeing-702.glb` | the 702HP and 702MP: a black-blanketed box (the Morelos 3 photograph), ribbed radiators and four folded-out ones, four reflectors in an X, very long six-panel wings each on ONE mast (the USAF WGS drawing) |
| `b702sp.py` | `bus-boeing-702sp.glb` | the all-electric 702SP: a small silver box, four reflectors in an X on long splayed arms, four ion thrusters and no apogee engine, 40 m wings |
| `a2100.py` | `bus-a2100ax.glb` | the A2100AX/AXS: a silver box with dark OSR radiators, one big reflector a side and a deck tower, broad four-panel wings standing off on triangular yokes |

**None of the four has a free photograph of its deployed flight hardware** (Wikimedia Commons, NASA's and ESA's libraries, searched 2026-11-07): the layouts are the makers' renders, which agree within
each family, checked against the few photographs there are (Morelos 3 stowed; ABS-3A separating). Their cards say "shape built from published dimensions and the maker's renders; details
estimated" (`made: 'renders'`), and `registry/models.yaml` lists every cited number and every estimate. `registry/geo-buses.yaml` routes them by catalogue number; a satellite whose
biggest part the family file does not draw (a 9 m or 22 m reflector: Inmarsat 6-F1, Morelos 3, SkyTerra 1) is a `stand_in` row and keeps the SSL-1300 stand-in.
The contact sheets, four angles in the app's own renderer beside the references: `~/space-radar-handoff/release-2.0/looks/m4-buses/`.

## Held

`spacebus.py` (Spacebus 3000/4000), `geostar2.py` (GEOStar-2), `dfh4.py` (DFH-4), `ds2000.py` (DS2000), `i3k.py` (I-3K) and `i2k.py` (I-2K) are still m2's drafts of one template and do
not ship: no file is in `site/models/`, and their rows in `registry/geo-buses.yaml` say why. The A2100A and the LM 2100 (bus `a2100`) are held too: they look different from the A2100AX.
What would let one ship: a layout of its own read off the maker's consistent renders or a photograph, the family's published sizes, and a look beside them from four angles.

## Use

    python3 tools/bus-builder/look.py <module> [--body] [az,el ...]   # a z-buffer picture with the Earth deck up (out/, not committed)
    python3 tools/bus-builder/run.py <module> [--body] [az,el ...]    # the same in the app's axes
    GLTFKIT=<dir> tools/bus-builder/build.sh <module> ...              # writes site/models/<id>.glb (GLTFKIT: a directory whose node_modules has @gltf-transform and meshoptimizer)

Each shipped file stays under 20 000 triangles and 14 colours (`glib.palette` folds colours on purpose so the cap never folds a large face into a stray tone).
