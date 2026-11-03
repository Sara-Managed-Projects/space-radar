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

## Longer stories (release 1.6.0)

A story that goes from a pad to the Moon and home needs more than one path and one place. Added to the format:

| field | what |
|---|---|
| `places` | on the moment: `[{from, place}]`, each `place` as the top-level one (name, lat, lon, alt, ground); from second `from` the drawn ground and the `pad` and `track` shots are about that place (a splashdown field, the Pacific). The profiles are still laid from the first |
| `moonSite` | on the moment: `{name, lat, lon}` (degrees): a landing site on the Moon. A flat patch of regolith is drawn there when the camera is within 200 km, and the Moon is turned to face the Earth with the ecliptic's north for its pole (so the site is within about 8 degrees of where the map puts it) |
| vehicle `window` | `[from, to]` mission seconds the vehicle is drawn in; the lead (the camera's default and the honesty line's path) is the first vehicle whose window holds the second |
| vehicle `rideOn` | `{vehicle, at: [x, y, z]}`: the vehicle follows another, the point moved by `at` metres in the host's axes (a spacecraft on its launcher's adapter) |
| vehicle `phases` | `[{t, attitude?, body?}]` in time order: from `t` a different `attitude` and/or `body` (`moon` or `earth`: a vehicle at the Moon stands, points and flies by the Moon's vertical and the Moon's velocity) |
| vehicle `body` | `moon` for a vehicle that is at the Moon for the whole moment |
| vehicle `colour` | the class colour the model is drawn in where it has no look of its own (`rocket` by default) |

A vehicle too small to see at the scale of the Earth and the Moon (seven pixels or fewer) is drawn as a ringed dot of a
fixed size. A path file is `{note, rows}` under `site/data/moments/paths/`, written by `tools/moments-build/` (the stories'
generators: `vostok1.mjs`, `apollo11.mjs`, `artemis2.mjs` and, since 1.7.0, `apollo13.mjs` and `sputnik1.mjs`, with `lib.mjs`).

**Release 1.7.0 notes.** A part a story wants out of sight until an event is `hide` at the start of the window and `show` at the event
(Apollo 13's torn foil, `sm-bay-foil`); a part that lives longer than a few minutes after it leaves (a spent module that is watched for an
hour) is a vehicle of its own with its own path, because a separated part flies a straight line with gravity for the second or two the
player keeps it in the frame and not for hours (Apollo 13's service module, `sm`). The same model may be two vehicles (Sputnik 1's
`sputnik-1`, once riding the rocket's head and once on its orbit). Apollo 13's path is integrated (`apollo13.mjs`: the Earth and the Moon,
the Moon from the app's ephemeris, a trim found by search); the others are conics.

**Release 1.7.2 notes.** Vehicle `phases` may carry `pitchDeg` and `rollDeg`, keyframes blended linearly from one phase that names them to the
next: the pitch turns the nose (Y) towards the vehicle's X (up, for `prograde` on an orbit) and the roll turns the vehicle about its nose; STS-1's
orbiter enters at 40 degrees nose-high and is flown dorsal side up. `rideOn.spin: [x, y, z]` (degrees) turns the rider about its host's axes
(Leonov floating along the airlock's axis). A vehicle's `keepXZ: true` keeps the file's own axis as the vehicle's axis instead of centring the
model's box (the Voskhod 3KD has an airlock and an umbilical to one side). A `ground` may be `lakebed: true`, a pale dry lake, with a `runway`
`{bearing, widthM, lengthM}` painted on it, centred on the place (Edwards). The player lights a night pad with a lamp (the Sun below the
horizon, the camera in the air) and marks every vehicle shorter than 40 px on the screen with the ringed dot. The generators are `voskhod2.mjs`
and `sts1.mjs`; both search for the least correction that meets the published landing and print how far the reconstruction had to be nudged.

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
