# tools/bus-builder: geostationary buses in code (release 2.0.0; forge #117)

`glib.py` holds the parts (on the part library of `tools/stage-builder/lib.py` and `tools/comms-builder/clib.py`); one module a bus builds it from a few dozen calls. Every module's
head note says which sizes are cited (McDowell's GCAT, CC BY 4.0; Wikipedia infoboxes; the makers' figures), which pictures were LOOKED AT ONLY, and what is ours (estimated).

## Drawn (batch m4-buses)

Nine families ship, each rebuilt to its own layout after batch m2 held one recoloured template for all of them:

| Module | File | What makes it itself |
|---|---|---|
| `e3000.py` | `bus-eurostar-e3000.glb` | a tall gold-kapton box, broad OSR radiators proud of it, two big deployed reflectors on each of the east and west walls (one high, one low, nearly the wall's height), a deck tower, four-panel wings on long V yokes |
| `b702.py` | `bus-boeing-702.glb` | the 702HP and 702MP: a black-blanketed box (the Morelos 3 photograph), silvered ribbed radiators and four folded-out ones, four reflectors in an X, very long six-panel wings each on ONE mast (the USAF WGS drawing) |
| `b702sp.py` | `bus-boeing-702sp.glb` | the all-electric 702SP: a small black-and-silver box, four reflectors in an X on long splayed arms, four ion thrusters and no apogee engine, 40 m wings |
| `a2100.py` | `bus-a2100ax.glb` | the A2100AX/AXS: a box in crinkled silver MLI with silvered OSR radiators, one big reflector a side and a deck tower, broad four-panel wings standing off on triangular yokes |
| `spacebus.py` | `bus-spacebus-4000b.glb` | the Spacebus 4000B and 3000B: a narrow gold-and-copper box, blue-silver radiators wider than it, two reflectors a side, straight wings on long V yokes |
| `geostar2.py` | `bus-geostar-2.glb` | the smallest: a box in mottled silver and black blanket, two large shaped reflectors swung up beside the deck, three-panel wings with a pale end panel |
| `dfh4.py` | `bus-dfh-4.glb` | a large gold box with white radiators, two big wings of three large panels on crossing struts, one big reflector a side and a deck reflector |
| `i3k.py` | `bus-i-3k.glb` | ISRO's clean-room photographs: crinkled gold kapton, white radiators, dark carbon-fibre reflectors, near-square three-panel wings with red strings |
| `i2k.py` | `bus-i-2k.glb` | the same materials at 1.65 x 1.53 x 3.0 m, one large and one small dark reflector, two-panel wings |

`geoparts.py` holds what the last five share (a blanket box, radiators, the Earth deck, the aft end, a side reflector with its feed, the DFH-4's crossing struts, the
cells' red strings). Seven families have no free photograph of their deployed hardware: their layouts are the makers' renders, which agree within each family, and their cards say
"shape built from published dimensions and the maker's renders; details estimated" (`made: 'renders'`). The I-3K and I-2K are drawn from ISRO's own clean-room photographs and say
"shape built from published dimensions and pictures; details simplified". Every blanket is a `foil` part in gold, silver or black, so the app's physically based look (scene/pbr.js)
draws it as crinkled metal foil or black blanket; radiators are white or silver. `registry/models.yaml` lists every cited number and every estimate; `registry/geo-buses.yaml` routes
them by catalogue number, and a `stand_in` row (a satellite whose biggest part the family file does not draw) keeps the SSL-1300 stand-in. The contact sheets, four angles in the
app's own renderer and its physically based look (`tools/shape-sheet.html?look=pbr`) beside the references: `~/space-radar-handoff/release-2.0/looks/m4-buses/`.

## Held

`ds2000.py` (Mitsubishi DS2000) is still m2's draft and does not ship: its two renders and one exhibition maquette disagree on the wings, and no photograph of flight hardware
was found. The Spacebus 4000C (bus `spacebus-4000`; its renders disagree on the wing, cross-shaped or straight) and the A2100A and LM 2100 (bus `a2100`) are held too.
`registry/geo-buses.yaml` says, row by row, which sources were searched.

## Use

    python3 tools/bus-builder/look.py <module> [--body] [az,el ...]   # a z-buffer picture with the Earth deck up (out/, not committed)
    python3 tools/bus-builder/run.py <module> [--body] [az,el ...]    # the same in the app's axes
    GLTFKIT=<dir> tools/bus-builder/build.sh <module> ...              # writes site/models/<id>.glb (GLTFKIT: a directory whose node_modules has @gltf-transform and meshoptimizer)

Each shipped file stays under 20 000 triangles and 14 colours (`glib.palette` folds colours on purpose so the cap never folds a large face into a stray tone).
