# tools/

Things run by hand on a laptop. CI does not run them; each file's head comment says why it exists.

| file | what it is for |
|---|---|
| `serve.py` | a threaded static server for `site/` (the app asks for ~90 files at boot) |
| `cdp.mjs` | run a script inside the page in a real headless Chrome, with a screenshot |
| `render-trip.mjs`, `render-trip.lib.mjs` | a trip as a video for YouTube (below) |
| `sheet-png.mjs`, `*.html`, `trip-pictures.probe.js` | contact sheets and probes |

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
