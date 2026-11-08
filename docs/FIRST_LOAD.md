# The first load, measured (forge #170)

How much a phone has to fetch before Space Radar shows its first frame, how long that takes on a slow phone profile,
and what the other space maps of the competitor review of 2026-11-07 (spec 0081, kept in the project's private repository) were seen to need. Every
number here is in `registry/first-load.yaml`, and `tests/test_first_load.mjs` holds this page to it.

## How it is measured

- **The tree a visitor is sent.** `python3 scripts/minify_site.py --out <dir> --tree --esbuild <the pinned esbuild>`,
  as a deploy builds it, served by `python3 tools/serve.py <dir> <port>` (which does not compress); and the live site.
- **A phone, slowed.** `tools/cdp.mjs` through `render.sh`, one boot at a time: `--mobile --width=390 --height=844`
  (device pixel ratio 3, touch, an Android user agent), `--net=slow4g` (Lighthouse's Slow 4G: 150 ms round trip,
  1.6 Mbit/s down, 750 kbit/s up) and `--cpu=4` (the main thread four times slower, Lighthouse's stand-in for a mid-range
  Android phone). This is emulation on one laptop (a 2017 MacBook Pro, Intel Core i5-7360U), not a phone: the numbers are "this machine,
  slowed", and are compared with each other, not with a stopwatch on a real device.
- **CelesTrak and Launch Library refused**, as every first-visit measure here refuses them, so a measuring boot does not
  spend the rate limit a real visit needs.
- **What is counted.** `tests/probes/first-load.js` in the page; `node scripts/first-load.mjs --bytes=... --probe=...`
  sums it with `tests/test_first_visit_bytes.mjs`'s rules: every request that started before the app's
  end-of-first-visit mark, its bytes as they crossed the wire (headers included, compressed when the server compressed).
  The first frame is the first animation frame on which the scene's WebGL renderer had drawn.

```
render.sh "http://127.0.0.1:8466/" tests/probes/first-load.js --mobile --width=390 --height=844 \
  --net=slow4g --cpu=4 --block=celestrak.org,thespacedevs.com --bytes=bytes.json > probe.json
node scripts/first-load.mjs --bytes=bytes.json --probe=probe.json --origin=http://127.0.0.1:8466 --gate
```

## The numbers (2026-11-07)

| Boot | Compressed | Bytes | Requests | First frame | First paint |
|---|---|---|---|---|---|
| The live site | yes | 1 922 875 B (1.9 MB) | 157 | 8.4 s | 4.3 s |
| release-2.0.0 before this batch, local | no | 2 968 722 B (3.0 MB) | 151 | 14.4 s | 2.8 s |
| release-2.0.0 with this batch, local | no | 2 968 695 B (3.0 MB) | 151 | 14.4 s | 2.7 s |

Both local boots got WebGL 2. This batch adds nothing to the first load: the Wikipedia block and Read aloud (forge #151)
are fetched when a card's About it is opened. The local tree is larger than the live one only because it is sent
uncompressed; the slow line is what makes its first frame later.

## What the others need

From the competitor review of 2026-11-07 (forge #170's body, spec 0081), read from their own sites and store pages. We did
not measure them again, and the last column says where a figure is not like ours.

| | What the review found | Like our first load? |
|---|---|---|
| Cosmoscope | about 36 MB in 93 requests before the first interaction; WebGL2 | yes |
| Solar System Scope | about 24 MB plus a wasm runtime; the web version is desktop only | yes, without the runtime |
| CosmosMap | WebGPU only (no Firefox, older Safari or many Android phones); a 1.47 MB main bundle plus a backend | no: one file, not a first load |
| SpaceEngine | a Windows PC with a GTX 1050 Ti or better, up to 50 GB | no: an install, not a page |

So, in bytes: our live first load is about a nineteenth of Cosmoscope's 36 MB and about a twelfth of Solar System Scope's
24 MB. In requests we make more than the 93 the review counted for Cosmoscope (157 live), and we do not claim otherwise.
CosmosMap's figure is one file and cannot be set beside a whole first load.

## What holds it

- `first_visit_bytes` (registry/budgets.yaml), CI's gate since spec 0044, on CI's own uncompressed boot.
- `first_visit_requests`: 167, 10 % above the 151 measured; CI holds it (screens.yml, `scripts/first-load.mjs --ci`).
- `phone_first_frame_ms`: 15 900, 10 % above the 14 418 ms measured; held by `--gate` on a machine like this one, never in
  CI, whose runner draws in software.
- `tests/test_first_load.mjs`: every budget row stays under the smallest first load the review found (Cosmoscope's and Solar
  System Scope's), every measure here is inside its rows, the scene is WebGL (no feature needs WebGPU), and this page
  and `/about/` say only what `registry/first-load.yaml` says.

Each release note quotes the live line of the table above, measured again the same way.
