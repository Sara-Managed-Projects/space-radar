# Embedding Space Radar

One live object, or one guided trip, inside your own page: the 3D scene, the object's tag (its
name, two numbers and how they were worked out) and one link, "Open in Space Radar". No sidebar,
no search, no tool rail, no clock control.

## The snippet

Open the object in the app, press **Share** (or `P`), then **Embed**: the code is copied. It looks
like this:

```html
<iframe src="https://www.spaceradar.ai/?embed=1&amp;at=sat-25544" title="The International Space Station, live on Space Radar" width="600" height="400" loading="lazy" allow="fullscreen" style="border:0;max-width:100%"></iframe>
```

Change `width` and `height` to suit your column; the view fills whatever box it is given, down to
about 280 px wide. Keep the `title` (a frame without one has no name for a screen reader) and
`loading="lazy"` (the map then starts only when a reader scrolls near it).

## Parameters

All in the query string, after `?embed=1`. Anything not listed is ignored.

| parameter | what it does | example |
|---|---|---|
| `embed` | `1` turns the embed on. Required. | `?embed=1` |
| `at` | The object to open on: a record id, a NORAD catalogue number, or a name as you would type it in the search box. | `at=sat-25544`, `at=25544`, `at=iss`, `at=mars` |
| `trip` | A guided trip to play instead of one object: any of the 26 (the ids are the page names under `/t/`, and the `id:` rows of `registry/tours.yaml`). Wins over `at`. | `trip=moon-landings` |
| `stop` | With `trip`: the stop to start at, counted from 1. | `stop=3` |
| `t` | The moment to show, as an ISO 8601 UTC instant. Left out, the view is live. | `t=2027-08-02T10:00:00Z` |
| `stage` | The world the map is centred on. | `stage=mars` |
| `exp` | The exposure the sky is drawn at when it is not the default: `eye` or `deep`. | `exp=deep` |

Present mode (`present=1`) is not an embed parameter: it belongs to the full app's own links
(`#trip=moon-phases&present=1`, see [RUN_LOCALLY.md](RUN_LOCALLY.md)).

With `embed=1` alone the frame shows the Earth and what is around it now.

The object ids are the ones in the app's own links: select the object and read `#at=…` in the
address bar, or use **Embed**, which writes the right one for you.

## What a reader gets

- The camera is theirs: drag to turn, scroll or pinch to move closer, the arrow keys once the
  frame has focus. No other key does anything inside the frame, and none is taken from your page.
- "Open in Space Radar" opens the same view in the full map, in a new tab.
- Nothing is stored on the reader's device by the embed: no cookie, no tracker, no service worker.
  The page fetches the map's own files and the public catalogues it draws from (see the sources
  sheet in the app).
- It is a WebGL scene. `loading="lazy"` keeps it from costing a reader who never scrolls to it.
  How much it downloads depends on the link: see the next section.

## The light embed, and the whole one

A link that names **one world or one crewed station and nothing else** boots the light embed
(`js/embedlite.js`): the scene, that object, the Earth and the other worlds, the naked-eye stars,
the names and the object's tag. It is held to 2.35 MB uncompressed on a first visit
(`embed_first_visit_bytes` in `registry/budgets.yaml`; `tests/test_first_visit_bytes.mjs --embed=`
measures `at=moon` and `at=25544` in CI), about half of that on the wire from the live site, which
compresses.

| link | what boots |
|---|---|
| `?embed=1&at=moon`, `at=mars`, any world by its id | the light embed |
| `?embed=1&at=25544`, `at=sat-25544`, any crewed station by its catalogue number | the light embed |
| a name (`at=iss`), any other satellite, a probe, a star | the whole map, as before |
| any link with `trip`, `stop`, `t`, `stage` or `exp`, or with a `#` part | the whole map, as before |

What the light embed leaves out, so that a reader is not sent what the frame does not draw:

- **The object's 3D model.** A station is its mark, its name and its tag (altitude, speed, how the
  numbers were worked out). The model is in the full map, one press away.
- **Clouds, the Milky Way and the constellation lines.** The Earth is its day and night maps.
- **Sharp maps.** The Earth and the Moon wear 1024-pixel copies of their maps, which is what a
  600 x 400 frame can show; another world named by `at` wears its usual map when the camera
  reaches it (Mars is 750 kB more).
- **Every catalogue but the one the object is in**, the trips, the cards, the sky from the ground,
  the sources sheet, the layer switches and the service worker.

If the stations' list cannot be read at all (CelesTrak refuses and there is no saved copy), a
station's light embed shows the Earth, where the station is, instead of loading the whole map to
find nothing.

The whole map inside a frame (the second kind of link) is several megabytes, as a visit to the
site is. Prefer a world's id or a station's number when the article is about one of them.

## Attribution

The embed carries its own: the "Open in Space Radar" link stays visible, and that is all we ask.
Please do not cover or remove it. If you write a caption, "Space Radar (spaceradar.ai)" is right.

What is drawn is worked out from public data (orbital elements from CelesTrak, ephemerides from
NASA JPL, and the others in `CREDITS.md`); positions are computed, and the tag says how old the
elements are. A screenshot of the embed is a drawing from measured positions, not a photograph,
and should be captioned as one.

The code is open source under the licence in `LICENSE`; textures, models and data keep the
licences listed in `CREDITS.md`.

## Framing

`https://www.spaceradar.ai/` is served without `X-Frame-Options` and without a
`Content-Security-Policy: frame-ancestors` header, so any site may frame it. If your own site sets
a Content Security Policy, allow the frame with `frame-src https://www.spaceradar.ai`.

## Testing locally

```sh
python3 tools/serve.py . 8000
# then open http://127.0.0.1:8000/tools/embed-test.html
```

`tools/embed-test.html` is a host page with a 600 × 400 frame of the local build. It passes its own
query on to the frame, so `embed-test.html?trip=moon-landings&stop=3` tests that view.
`node tests/test_embed.mjs` holds the parameters, the snippet and the keys.
