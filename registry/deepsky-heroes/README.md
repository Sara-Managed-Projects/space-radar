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
