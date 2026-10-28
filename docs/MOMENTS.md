# Moments: the file format

A **Moment** is a mission replayed as a 3D story: one clock, the mission's own elapsed time, drives every vehicle,
the camera, the captions and the sound together. The player is `site/js/moments/` (fetched for a `#moment=` link,
never at boot); a moment is one data file, `site/data/moments/<id>.json`, and its words live in `site/js/copy/`.
`node tests/test_moments.mjs` validates every file (the rules are `validateMoment` in `site/js/moments/format.js`).

Open one with `#moment=<id>`, or at a second with `#moment=<id>&t=<seconds>` (a share link opens there, paused).

The demonstration is `site/data/moments/demo-saturn.json`: Apollo 11's Saturn V from ignition to the escape tower's
jettison in about 40 seconds. Copy its shape.

## The two clocks

- **Mission time**, `t`: seconds from the moment's `epoch` (T-0), negative before it. Every time in the file is one.
- **Play time**: the seconds a visitor watches. The `pace` maps one to the other, segment by segment, and the
  player prints the rate in force beside the mission clock (`×1`, `×20`, `×600`) at every second. Play the dramatic
  seconds at `×1` (lift-off, staging, touchdown, the first step) and compress the coasts; never hide a compression.

## Top level

| field | what |
|---|---|
| `format` | `1` |
| `id` | lower-case words with dashes; the file is `<id>.json` |
| `words` | the key of the story's words in `COPY.momentStories` (usually the id) |
| `wordsFile` | optional: a file under `site/js/copy/` (`en.<something>.js`) that adds the story's words; the player imports it before it plays. Without it the words are in `copy/en.moments.js` |
| `epoch` | T-0 as an ISO time in UTC, ending in `Z` (Apollo 11: range zero, `1969-07-16T13:32:00Z`) |
| `span` | `[first, last]` mission seconds, the pace's ends |
| `pace` | segments `{from, to, rate}` in mission seconds, contiguous, `rate` mission seconds per play second |
| `place` | where the story starts: `name`, `lat`, `lon` (degrees), `alt` (metres), `azimuth` (the flight azimuth, degrees east of north), `ground` |
| `trajectories` | named paths, below |
| `vehicles` | the vehicles, below; the first is the lead (the camera's default and the honesty line's path) |
| `tracks` | `parts`, `camera`, `captions`, `audio`, `effects`, each a list in time order, below |
| `chapters` | `{t, say}` in time order; the first at the span's start |
| `sources` | `{say, url}`: what the replay is made from, an https link each |

`place.ground` describes the illustrative ground drawn within 25 km of the place (the Earth's map beyond):
`kind` is `coast` (land and sea; `shoreBearing` the shore's direction in degrees, `shoreM` how far east of the place
it runs), `land` or `sea`; `pad: true` draws a pad's concrete and its flame trench (north-south).

## Trajectories

Each has `kind`, `truth` (`measured`, `reconstructed` or `illustrative`: the honesty line prints it), `say` (the
words key of its one-line description) and `source` (where its numbers come from, in plain words).

- `kind: "profile"`: a published ascent or entry. `points` are `[t, altitude km, downrange km]` at the event times
  the reports give; between them a monotone cubic (never overshooting), laid along the flight azimuth over a round
  Earth from the place. Before the first point the vehicle stands at it. `pitchStart` and `turnS` shape the
  attitude: vertical until `pitchStart`, then onto the flight path over `turnS` seconds.
- `kind: "vectors"`: state vectors about the Earth's centre. Inline `rows` of `[t, x, y, z, vx, vy, vz]` (km, km/s),
  or a `file` beside the moment: a JSON `{rows}` or a JPL Horizons vector table (`.txt`, CSV, km and km/s; its own
  header says UT or TDB). `frame` is `earth-j2000` (Horizons' ICRF) or `earth-teme`. Between rows a cubic Hermite.

## Vehicles

| field | what |
|---|---|
| `id` | the vehicle's name in the file |
| `model` | a row of `registry/models.yaml`; the file `site/models/<model>.glb` |
| `lengthM` | its real length in metres; the model is stood in metres, base at the origin, nose up +Y |
| `path` | a trajectory's name (none: it stands at the place) |
| `attitude` | `ascent`, `prograde`, `retrograde` or `vertical` |
| `parts` | the separable parts, by node name, in flight order, for a model split into parts (stages C2 to C4) |
| `cuts` | for a model that is one piece: `{name: [from, to]}` metres up the stack; each triangle goes to its band. A stand-in until the split model lands, and the honesty line says so |
| `engines` | `{part: [[x, y, z], ...]}`: nozzle exits in metres in the vehicle's frame, one per engine, in the order the events index them |
| `flames` | `{part: {kind, exitM}}`: `kind` is `kerolox`, `hydrolox`, `solid` or `hypergolic`; `exitM` the nozzle's exit diameter |
| `chutes` | `{name: {diameterM, count, lineM, at, colours, spreadDeg}}`: canopies on risers from `at`; deployed by a part event |
| `plasma` | `{radiusM, at}`: the shock layer of an entry; lit by an `effects` entry |

The model contract (part names, units, origins, budgets) is the stages' own file; `parts` and `engines` follow it.

## Tracks

**`parts`**: `{t, part, action, vehicle?}`: at second `t`, the part named `part` does `action`. `vehicle` defaults to the lead. The actions:

- `ignite`: the part's engines light (all, or `engines: [i, ...]`), reaching full thrust over `rampS` seconds.
- `cutoff`: they go out (all, or the `engines` named).
- `throttle`: `level` 0 to 1.
- `separate`: the part leaves on a ballistic arc from that second, pushed by `dv` (m/s, in the vehicle's axes) and
  turning at `spin` (rad/s about its own axes). It is where physics puts it at any later second, played or scrubbed.
- `hide`, `show`: the part (or a chute) is drawn or not.
- `deploy`: a chute pays out, holds reefed for `reefS` seconds, then opens over `openS` seconds.

Any part event may carry `puffs`: separation motors, `{at: [[x, y, z], ...], dir, exitM, dur, lead, part}` (points in
the vehicle's frame, `dir` the way the exhaust goes, `lead` seconds before the event, `part` the part they ride on).

**`camera`**: `{t, shot, ..., blend?, truth?}`, `shot` naming one of the shots below. Each shot holds until the next. `blend` eases in over that many play
seconds instead of cutting (under reduced motion every blend is a cut and no shot drifts). The shots:

- `pad`: a fixed camera at `at` (east, north, up metres from the place) looking at the vehicle `lookY` metres up
  its stack, or at a point `look` (east, north, up). `fov` in degrees.
- `track`: a fixed ground camera at `at` following the vehicle, its lens narrowing to keep the vehicle `fill` of
  the frame's height, between `fovMin` and `fovMax`: the long-focus tracking camera.
- `chase`: riding with the vehicle at `offset` (metres along the vehicle's x, y and z), looking at `lookY`.
- `orbit`: round the vehicle at `dist` metres, `az` (from north) and `el` (from its horizon) in degrees, drifting
  `spin` degrees a play second.
- `onboard`: on the vehicle at `at`, looking along `dir` (its own axes): the view out of the window.
- `globe`: `altKm` over the vehicle's ground point, `backKm` behind it along its track.
- `wide`: `distKm` off along `dir` (the Earth's inertial axes), looking at `look`: `earth`, `moon`, `earth-moon` or
  `vehicle`.

**`captions`**: `{t, say, until?}`. `say` is a words key; the caption holds until `until`, the next caption, or
seven play seconds. Quote famous lines exactly, and give the source and time in the words.

**`audio`**: `{t, sting}` plays, `sting` naming one of the app's stings (`registry/audio.yaml`), or `{t, src, twin, gain}` a file
under `site/audio/` (Opus with an AAC twin, as the app's sounds are; an archival recording only when it is public
domain, and credited). Only when the visitor has sound on, and only when the playhead crosses `t` while playing.

**`effects`**: `{t, effect, until, ...}`, `effect` naming the effect. `effect: "exhaust-cloud"`: steam and exhaust out of a flame trench from
`t` to `until`, along `axis` (east, north, up) both ways, `count` particles (scaled by the device's tier). `fire`
names the part whose engines feed the flames the deflector throws along the trench while the stack is on the pad.
`effect: "plasma"`: an entry's shock layer from `t` to `until`, brightest at `peak`, on `vehicle`.

## Words

`COPY.momentStories[<words>]` holds `title`, `blurb`, the chapter names, the captions, the trajectory's `say` and
the sources' `say`. Keep each caption to one or two short sentences. The player's own words are
`COPY.momentPlayer`.

## Honesty

Every moment prints, small at its foot, how its path is known (`measured`, `reconstructed`, `illustrative`, with
the path's own sentence), that flames, steam and parachutes are drawn, that a cut model is a stand-in, and where the
ground comes from. The time compression is always on screen. Positions of the Sun and the Moon are the
mission's own (astronomy-engine); the Earth turns under them at the mission's sidereal time.
