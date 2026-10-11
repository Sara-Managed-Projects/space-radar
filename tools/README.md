# tools/

Things run by hand on a laptop. CI does not run them; each file's head comment says why it exists.

| file | what it is for |
|---|---|
| `serve.py` | a threaded static server for `site/` (the app asks for ~90 files at boot) |
| `cdp.mjs` | run a script inside the page in a real headless Chrome, with a screenshot |
| `render-trip.mjs`, `render-trip.lib.mjs` | a trip as a video for YouTube (below) |
| `sheet-png.mjs`, `*.html`, `trip-pictures.probe.js` | contact sheets and probes |
| `systems.probe.js` | the star systems walk: six systems framed, a planet's card, the `#go=` link on a phone (its header says how) |
| `walk.mjs`, `walk.probe.js` | the regression walk: every flow of the product at two sizes, with contact sheets (below) |
| `chromelock.mjs` | the one-Chrome-on-the-machine lock `walk.mjs` takes; `node tools/chromelock.mjs --wait=20` says who holds it and starts no Chrome |

## The regression walk

`node tools/walk.mjs --dir=<tree>` walks the product the way a visitor does, in a real headless
Chrome at 1440 × 900 and at 390 × 844: the home view (a Today card, the time scrubber dragged and
put back, a timeline mark, the Undo toast, the controls hint), search, the four tabs and the
Tonight sky, eight object cards, What to show, the debris view, the share sheet and photo mode,
four trips from intro to "Keep flying", present mode, six deep links, the lazy stand-ins (a first
click made the moment the control exists) and a second visit with the server gone. At every step
it takes a picture and measures: console errors, failed requests, elements wider than the window,
overlapping chrome, and on the phone targets under 44 px. Unit tests read the code; this is the
one tool that sees features where they meet. It was written on 2026-10-06, after fourteen pull
requests merged in a day, and found a toolbar wider than a phone, a toast across the planet it
announced and a hint over a card's buttons, none of which a test could have seen.

```sh
python3 scripts/minify_site.py --out /tmp/served --tree          # the tree a deploy serves
# the saved catalogues (see "Once per checkout" below; --tree links data/ to site/data), and the
# map from a record to its page, which a deploy builds and the "Its own page" link needs:
curl -sSf -o /tmp/served/object-pages.json https://www.spaceradar.ai/object-pages.json
node tools/walk.mjs --dir=/tmp/served                            # both sizes: about 35 min on a Mac
node tools/walk.mjs --dir=/tmp/served --phone --only=home,trips-old   # one size, two loads: 3 min
```

It prints one line per finding and writes, under `out/walk/` (or `--out=`): `walk-desktop.json`
and `walk-phone.json` (every step's measurements), `desktop/` and `phone/` (every picture) and
`sheet-<size>-NN.png`, twelve pictures to a contact sheet. **Read the sheets**: a black view, a
label over a card and a blurred close-up pass every measurement. The loads are named at the top
of `walk.mjs` (`--only=` takes those names or a flow's); the steps are in `walk.probe.js`.
Two flows are for a quiet machine and a real tab, and have not been run (internal #460): `--only=skip`
(the skip links and where focus lands, with real keys) and `--only=history` (Back and Forward between an ISS link
and a dated Moon link, reading the selection, the stage and the clock each time).

On a Mac it uses the GPU (`--gl=gpu`, two minutes a flow); anywhere else software rendering, which
is ten times slower: the full walk does not fit a CI job, so it is a local tool, run before a
release and after a day of merges. It blocks CelesTrak and Launch Library, as every probe here does.

**Only one headless Chrome may run on a machine at a time.** Two starve each other (software GL
most of all) into timeouts that read as dead controls, and a day of that is how a walk gets a bad
name. `walk.mjs` starts every Chrome holding a lock and waits for whoever has it: a directory
made with `mkdir`, holding its owner's pid, at `$SR_CHROME_LOCK` (default
`space-radar-chrome.lock` in the system's temp folder). Anything else that starts a headless
Chrome for this project on the same machine takes the same lock the same way: wait while the
directory exists, take it over when its pid is gone or it has not been touched for six minutes,
remove it when done. `cdp.mjs` run by hand does not take it: run one at a time, or wrap it.

| flag | what |
|---|---|
| `--port=8760` | the port the walk serves `--dir` on; its Chromes use the ports from `--port` + 80 up |
| `--timeout=840` | seconds one load may take before its Chrome is killed |
| `--lock-wait=1800` | seconds to wait for the lock before giving up |
| `--quiet-wait=300` | seconds to wait for another project's headless Chrome (one that takes no lock of ours) to finish before measuring beside it; the walk says so, twice, if it did (internal #460) |
| `--only=`, `--desktop`, `--phone`, `--out=`, `--gl=`, `--no-offline` | which loads, which sizes, where to write, which GL, skip the second visit |

It exits **0** when nothing measured as broken, **1** with findings, and **2** when a load ran out
of time or the lock could not be had: a walk that timed out has not passed, whatever else it found.

**The trips walk has two halves.** `tests/test_trips_walk.mjs` is the half CI runs: every stop of
every trip has a target that resolves, its narration on disc and a picture. The half that needs a
GPU is `node tools/walk.mjs --only=trips`: at each stop it reads the renderer's own counters and
reports a stop over `draw_calls_per_stop` or `triangles_per_stop` (`registry/budgets.yaml`), with
the numbers in `walk-<size>.json` beside the stop's name.

`?render=1` takes its time: `__srRender.ready` is the catalogues landed, the trip at its intro and
twelve film seconds of warm-up, measured at 44 real seconds on the served tree with the saved
catalogues on a throttled line. The `link-render` load waits 150 and, if that is not enough, says
which stage it stopped in (`__srRender.describe().stage`): `layers`, `warming`, `faces`, `settling`.

## Rendering trip videos (spec 0070)

`node tools/render-trip.mjs <trip>` plays one trip in a headless Chrome a frame at a time, on a
clock that moves only when the tool asks for the next frame (`site/js/ui/rendermode.js`,
`?render=1`), photographs each frame, encodes them with ffmpeg and lays the narration and the music
bed under the picture. Nothing is uploaded anywhere: the files are for a person to upload.

### Once per checkout

```sh
# node 22+ and ffmpeg (libx264, aac, loudnorm) on PATH, Google Chrome installed.
# The satellites come from the site's saved copy, which a checkout does not have (it is gitignored):
mkdir -p site/data/v1 && cd site/data/v1
curl -sSfO https://www.spaceradar.ai/data/v1/index.json
python3 - <<'EOF'
import json, subprocess
for k in json.load(open('index.json'))['snapshots']:
    subprocess.run(['curl', '-sSf', '-O', f'https://www.spaceradar.ai/data/v1/{k}.json'])
EOF
cd -
```

Remove `site/data/v1/` again before measuring the first visit's bytes or deploying from this tree.

### One trip, or all of them

```sh
node tools/render-trip.mjs people-in-space                 # 1920x1080, 30 fps, into out/
node tools/render-trip.mjs people-in-space --fps=60        # the spec's 1080p60: twice the frames
node tools/render-trip.mjs to-the-edge --captions          # captions burned into the picture too
node tools/render-trip.mjs moon-landings --stops=2         # a short look: two stops, then the end card
node tools/render-trip.mjs to-the-edge --captions=big --skip=edge   # for a film joined from trips: captions a phone can read, one stop left out
for t in people-in-space journey-to-the-station strangest-things moon-landings outer-solar-system \
         a-year-in-a-minute chasing-the-solar-eclipse to-the-edge travel-to-exoplanets; do
  node tools/render-trip.mjs "$t" || break
done
```

Other flags: `--res=1280x720`, `--out=DIR`, `--at=2026-10-03T18:00:00Z` (the instant frame 0 is
computed for; default now), `--thumb-stop=<stop id>` (which stop the thumbnail is taken at;
default the first), `--gl=swiftshader` (no GPU: the same picture, many times slower), `--format=png`
(lossless frames, about ten times the disc), `--crf=18`, `--live` (let the page reach other hosts:
today's clouds and live catalogues, at the price of a film that is not the same twice), `--fresh`
(throw the cached frames away), `--frames-only`. `CHROME=` and `FFMPEG=` name the binaries.

What lands in `out/` (gitignored):

| file | what it is |
|---|---|
| `<trip>.mp4` | H.264 High, yuv420p, BT.709, CRF 18, 30 fps; AAC 320 kb/s at 48 kHz, levelled to -14 LUFS / -1.5 dBTP |
| `<trip>.srt`, `<trip>.vtt` | the narration's captions on the film's clock |
| `<trip>.chapters.txt` | `00:00 Title` lines, one per stop (also inside the description) |
| `<trip>.description.txt` | title, link, the line of truth, chapters, sources and credits |
| `<trip>.thumb.jpg` | 1280 x 720: a clean frame of the scene with the trip's name |
| `<trip>.json` | the cue sheet: every stop's seconds, the measured loudness, the render time |
| `.cache/<trip>-<res>-<fps>/` | the frames. Delete it when the video is accepted |

### What the film is

- A title card for 3 s over the trip's first view: the trip's name, its blurb and one line of truth
  ("Positions computed for 3 October 2026, 18:17 UTC from CelesTrak orbital elements and ...",
  internal #307). A trip that moves the clock itself names its sources and no minute.
- Each stop exactly as the live trip flies it, held for its narration plus one second (the live
  trip's own `holdDwell`), with the stop's name in the serif as a lower third and a small
  "spaceradar.ai". The app's own labels and HUD tag stay: they are the map.
- An end card for 3 s: "Fly it yourself", `spaceradar.ai/#trip=<id>`, the credits.
- Sound: each clip starts on the frame its camera arrives; the stage's music bed runs under the
  whole film, 10 dB down under the voice (0.3 s in, 1.2 s back: `audio/narration.js`'s numbers).

### Why it is the same film twice

Time in the page is a counter (`createVirtualTime`): `Date`, `performance.now`,
`requestAnimationFrame`, timers and idle callbacks all read it, and CSS and Web Animations are
stepped with it. A frame resolves only when no fetch, body read, image, decode or worker round trip
is in flight. Every request to another host is refused, so the film depends on the files in this
tree and nothing else. Measured 2026-10-03 on this Mac (Intel Iris Plus 640 through ANGLE Metal):
two renders of the same trip at the same `--at`, and a third killed half way and resumed, agree
byte for byte on seven sampled PNG frames out of 604.

What is not counted: a dynamic `import()` the app makes in the middle of a trip (it lands a frame
or two later on a slow disc), and a different GPU or driver, which rounds differently.

### Resuming

Stop it however you like. Run the same command again: the frames on disc are replayed in the page
without being photographed (the page has to live through them to reach the same state), then the
render carries on. The instant frame 0 was computed for is kept in the cache, so both halves show
the same sky. A killed run can leave a headless Chrome and `serve.py` behind: `pkill -f
'user-data-dir=.*render-'` and `pkill -f 'tools/serve.py'`.

### How long it takes

TIMING_PLACEHOLDER

### Uploading to YouTube (by hand)

1. **Watch it once**, with sound, start to end. Check the first frame after the title card is a
   loaded scene and the end card's link is the trip's.
2. YouTube Studio, Create, Upload video: `<trip>.mp4`.
3. **Title**: the first line of `<trip>.description.txt` (the trip's name; add "| Space Radar" if
   you like, 100 characters at most).
4. **Description**: paste the rest of `<trip>.description.txt`. The chapters are in it; YouTube
   shows them only when the first is `00:00`, there are three or more and each is ten seconds or
   longer (the tool says so when a trip falls short).
5. **Thumbnail**: `<trip>.thumb.jpg` (needs a verified account).
6. **Audience**: not made for kids.
7. **Altered or synthetic content**: answer **Yes**. The narration is a synthetic voice
   (Kokoro-82M); the description says so in words as well. The picture is a computed map, not
   footage of a real event, and is described as such.
8. **Subtitles**: Add, Upload file, "With timing": `<trip>.srt`, language English.
9. Category Science & Technology; language English; licence Standard.
10. **Music**: the beds are CC0 (John Bartmann, credited in the description). If Content ID claims
    one, dispute with the source page in `registry/audio.yaml`.
11. Publish as Unlisted first, open it on a phone, then make it Public.
