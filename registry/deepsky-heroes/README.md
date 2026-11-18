# Deep-sky heroes (internal spec 0075, design §3)

One file per hero, `<id>.yaml`, mirrored by `scripts/gen_deepsky_heroes_js.py` into
`site/js/data/hero-<id>.js`, which `site/js/scene/deep/heroes.js` imports when the hero is near.
Each later stage of spec 0075 fills **only its own file** (b: `helix.yaml`, c: `lmc.yaml`,
d: `m31.yaml` and `m33.yaml`). Stage a created them empty, with `shipped: false`.

| field | holds |
|---|---|
| `id` | the file's own name |
| `record` | the deep-sky record it draws (`dso-…`, in `site/data/dso.json`) |
| `stage` | the spec 0075 stage that owns it |
| `shipped` | false until the hero draws for visitors; the coordinator builds only shipped heroes (or with `?deepdebug=1`) |
| `children` | records drawn inside this hero (the LMC holds the Tarantula) |
| `levels` | `{2: …, 3: …, 4: …}`: what each level of design §5 draws |
| `frame` | `{pa_deg, incl_deg, units_ly}`: the hero's own frame, in object units |
| `layers` | `{kind, what, …, source}` per drawn part: star, disc, ring, knots, points, gas |
| `colours` | `{mode: true / enhanced, lines: {Ha: "#…", OIII: "#…"}, note}` |
| `drawn` | the classes it adds to the record's `drawn`: `reconstruction`, `model`, `illustration` |
| `sources` | papers and pictures the geometry is from |
| `review` | **the science checklist**: `{data_vs_model, geometry, colours, distance, credits, by, date}`. The generator refuses a shipped hero whose `by` is empty |
| `credits` | the CREDITS.md lines (section 3h, the hero's sub-heading). The generator refuses a shipped hero without one |

## Depth made from one photograph, and how a card says so (internal #431, the deep-space review of 2026-11-16)

A photograph gives no distance for any pixel of gas. A hero built from one therefore says so on its card, in the row every
emission-nebula hero carries ("Its shape in depth"): it begins `Reconstructed.` or `Not measured.` and says the depths are not
measured (`tests/test_deep_labels.mjs` holds every emission hero to it). What can honestly be added from a single image, and
is not yet: the stars in front of and among the gas at their Gaia DR3 distances (measured); the ORDER of layers from physics
(dust seen dark against glow is in front of it; the high-ionisation line sits nearer the exciting star than H-alpha), which
gives order, not distance; and a thickness from an assumption, labelled as one. An on-screen caption while the view is more
than about 20 degrees off the Sun's line is not built.
