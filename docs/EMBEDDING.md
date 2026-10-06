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
| `trip` | A guided trip to play instead of one object (the ids are the page names under `/t/`). Wins over `at`. | `trip=moon-landings` |
| `stop` | With `trip`: the stop to start at, counted from 1. | `stop=3` |
| `t` | The moment to show, as an ISO 8601 UTC instant. Left out, the view is live. | `t=2027-08-02T10:00:00Z` |
| `stage` | The world the map is centred on. | `stage=mars` |
| `exp` | The exposure the sky is drawn at when it is not the default: `eye` or `deep`. | `exp=deep` |

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
- It is a WebGL scene of several megabytes. `loading="lazy"` keeps it from costing a reader who
  never scrolls to it.

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

`tools/embed-test.html` is a host page with a 600 × 400 frame of the local build.
