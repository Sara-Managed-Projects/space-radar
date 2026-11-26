# Scripting the map: `window.srMap`

The map has a small scripting API: where the camera stands, the clock, a recorder, a landing site's ground, the
skyline of "sky from your street", the place in use, the date of an Earth overlay, and a way to put a button or a
panel in the map's own chrome. Anyone can use it from the browser's console, a bookmarklet, a userscript or a page
that frames nothing (an embed has no API). It is the same API the Space Radar platform builds its paid tools on;
nothing in it is paid, and nothing in it calls a server.

The code is `site/js/ui/mapapi.js` (and `ui/mapapirecord.js` for recording, `ui/toolslot.js` for the slots); the test
is `tests/test_mapapi.mjs`.

## When it is there

`window.srMap` is made a few seconds after the map has drawn its layers (after the first visit's byte gate), never in
an embed (`?embed=1`). Wait for it like this:

```js
function whenMap(fn) {
  if (window.srMap) fn(window.srMap);
  else document.addEventListener('sr:map', () => fn(window.srMap), { once: true });
}
whenMap((map) => console.log(map.version, map.view()));
```

`srMap.version` is `1`. A later version adds; it does not rename. Every call answers plainly where the map cannot do
it now (`null`, `false`, an empty result, or a rejected promise for the recorder); nothing throws into your page.

## Units

Degrees for angles (azimuth from north, clockwise; altitude above the flat horizon), kilometres for the camera's
distance, metres on a landing site's ground, milliseconds since 1970 UTC for the clock.

## The map

| Call | Answer |
|---|---|
| `view()` | `{mode: 'orbit'\|'ground'\|'sky', stage, world, ground, selected, selectedName, place}`: what is on screen. `ground` is a landing site's id while one is open, `place` the observer `{latDeg, lonDeg, source}` or null |
| `on(name, fn)` | `fn(detail)` on `'select'`, `'sky'`, `'observer'`, `'overlay'`, `'layers'` or `'clock'`; answers the function that stops it |

## Camera (orbit view)

| Call | Answer |
|---|---|
| `camera.get()` | `{mode: 'orbit', target, stage, azimuthDeg, polarDeg, distanceKm, fovDeg}`; on the ground or in the sky view only `{mode}` |
| `camera.fly(pose, {ms = 1500})` | Promise of `true` when it arrived. `pose = {target?, azimuthDeg?, polarDeg?, distanceKm?}`: a `target` (an object id, as in `#at=`) is selected and flown to first, then the camera turns round it |
| `camera.set(pose)` | the same with no flight |
| `camera.earthPoint(x?, y?)` | `{latDeg, lonDeg}` of the Earth under a screen point (the middle by default), or null |
| `camera.earthView()` | `{latDeg, lonDeg, spanKm}`: the Earth in the middle of the view and how wide the view is across it |

A pose is what a link's `cam=` key holds (`site/js/ui/urlstate.js` camValue), so a script can make the same views a link can.

## Clock (time travel)

| Call | Answer |
|---|---|
| `clock.get()` | `{ms, live, rate, paused}` |
| `clock.set({ms?, rate?, paused?, live?})` | the clock as it is after: `live: true` goes back to now; `ms` jumps; `rate` is how many seconds pass per second |
| `clock.onChange(fn)` | `fn(clock.get())` on every change; answers the stop function |

## Recorder

| Call | Answer |
|---|---|
| `record.can()` | `{live, frames}`: what this browser can record |
| `await record.start({crop: 'wide'\|'square'\|'tall', size: 720\|1080\|2160, credit: [lines], maxS})` | a recording of the map's canvas, as Record makes it (the map's credit and the instant in the corner, your `credit` lines under them, at most three of 120 characters). `await rec.stop()` is the video `Blob` (WebM, or MP4 on Safari). `maxS` stops it by itself (600 s at most) |
| `await record.start({..., corner: 'none', sharp: true})` | the same, with nothing in the corner (`corner: 'none'`: the scene alone, edge to edge; credit the data yourself, see the rules below) and the map's drawing buffer raised to the clip's own pixels while it records (`sharp`: a 2160 clip of a 1440 px window is drawn at 3840 × 2160, as far as the GPU allows, and put back at `stop()`; `rec.sharp` is the pixel ratio used, or null). A slow GPU drops frames at 4K: MediaRecorder records in real time |
| `await record.frames({width, height, fps})` | an encoder for pictures you draw yourself: `await enc.add(canvas, repeat)` adds a frame (shown `repeat` frames long), `await enc.done()` is the `Blob`. WebCodecs where the browser has it (every frame kept, however slowly you draw), else MediaRecorder paced in real time |

Nothing is uploaded. Save the `Blob` yourself (an `<a download>` with `URL.createObjectURL`).

## A still picture

`await picture({width, height})` is one frame of the orbit view as a canvas, at any size up to 16 384 px a side: drawn in
one go when the GPU can, else in tiles of the same camera (each a view offset), so an A2 print at 300 dpi (7016 × 4961) works
on a laptop. The map's chrome and labels are not in it, nor any line; it rejects on the ground and in the sky view.

## The drift

| Call | Answer |
|---|---|
| `drift.get()` | `{active, options: {through, realOnly, tags, bare, pace, seed}, place, visits}` |
| `await drift.start(options)` | starts the drift with these choices (or changes them while it runs); `true` once it drifts. `through` from `craft`, `worlds`, `small`, `stars`, `deep`; `pace` `calm`, `steady` or `brisk`; `seed` a whole number 1 to 999 999 999 walks the same way every time (also `#drift=worlds,seed42` in a link) |
| `drift.stop()` | stops it where the camera is |

`on('drift', fn)` hears `{on: true}` when it starts and `{on: false, reason, visits}` when it stops.

## The layers

`layers.list()` is `[{id, on}]` (the ids of `registry/layers.yaml`); `layers.set(id, on)` turns one on or off, as What to show does.

## Trips

`trips.list()` is `[{id, title, group, earlyUntil}]`. A trip may carry `early_until: YYYY-MM-DD` in `registry/tours.yaml`: it is
listed for everyone, and until that day (UTC) its Play first asks the page's trip gate:

```js
const stop = srMap.trips.gate(async ({ id, title, earlyUntil }) => true); // false keeps it shut
```

With no gate on the page (a fork, localhost, a blocked script) an early trip plays: the words and the data are open either way.
On spaceradar.ai a Play pressed before the platform has loaded waits for its gate, ten seconds at most.

## Offline

The map's service worker (`site/sw.js`) keeps what a visit used. A script may keep more of the map's own files on purpose, in
the same caches, so they are there with no network:

| Call | Answer |
|---|---|
| `await offline.state()` | `{worker, caches, persisted, usage, quota}`: whether a worker serves the page, and the browser's own estimate in bytes |
| `await offline.persist()` | asks the browser not to clear them when space is short; `true` when it agreed |
| `await offline.has(urls)` | how many of these are kept |
| `await offline.keep(urls, {onProgress(done, total, bytes), signal})` | fetches and keeps them: `{kept, already, failed, refused, bytes}`. Only the map's own `textures/`, `models/`, `audio/`, `images/`, `og/`, `data/` (and `data/v1/`, the saved feeds) |
| `await offline.forget(urls)` | lets them go again; how many were removed |

## A voice in another language

The trips are read aloud in English (`registry/narration.yaml`). A script may give the stops of a trip another voice:

```js
srMap.voice.provide(async ({ tripId, lang }) => (lang === 'es' ? { credit: 'Voz: ...', clips: { iss: { opus, m4a, vtt, seconds } } } : null));
```

It is asked once a trip starts. A stop it gives (https addresses, 0.5 to 600 s) is played instead of the English clip, with
its own captions; any other stop keeps the English voice. `voice.get()` is `{credit, stops}` of the voice in use, or null.

## The Lab

Every Lab simulator (`site/lab/<slug>/`) has a small hook of its own, `window.srLab`, and an empty, hidden
`div[data-sr-tools="lab"]` under its controls; it dispatches `document` event `sr:lab {version: 1}` once.

| Member | Answer |
|---|---|
| `version`, `slug`, `title`, `dur`, `param` | the simulator: its loop's length in seconds, and its slider `{label, min, max, step}` or null |
| `get()` | `{t, value, line, playing}`: the time, the slider, the caption under the picture now |
| `line(value?, t?)` | the caption at another slider value or time (the simulator's own `SIM.line`) |
| `await picture(width?, type?)` | the picture as it is now, drawn again at `width` px (540 to 4320) as a `Blob` (PNG unless `type` says) |

Put a button in the hidden div (and unhide it); nothing else on the page is part of the hook.

## A landing site's ground (`view().mode === 'ground'`)

The eight walkable sites (`#ground=apollo-15`, `site/js/scene/groundstage.js`) stand on measured terrain models. In the site's frame
x is east and z is south in metres, the lander at 0, 0.

| Call | Answer |
|---|---|
| `terrain.site()` | `{id, world, latDeg, lonDeg, radiusKm, groundM, near: {size, stepM}, far: {size, stepM}, sources: [{what, credit, licence}]}` |
| `terrain.heightAt(xM, zM)` | the ground's height there, metres (NaN off the model) |
| `terrain.sample(latDeg, lonDeg)` | `{heightM, xM, zM}` at a point given by its coordinates |
| `terrain.grid('near'\|'far')` | `{size, stepM, h}`: a copy of the heights, row 0 to the north, column 0 to the west |
| `terrain.walker()` | `{xM, zM, yawDeg, pitchDeg, heightM}`: where the visitor stands and looks |
| `terrain.lift(m)` | lifts the eye `m` metres over the ground (0 to 1000), for a jump; `lift(0)` puts it back |
| `terrain.sunAt(ms)` | `{altDeg, azDeg}` of the site's Sun at that instant, from the same solver the stage draws with |
| `terrain.skyline()` | the site's far skyline from its terrain, 360 altitudes in degrees |
| `terrain.gravity()` | the world's surface gravity, m/s² |

## The skyline of "sky from your street" (`view().mode === 'sky'`)

The sky view draws a skyline of hills, a coast or a city from the place's coordinates; they are drawn, not anyone's
real hills. A script that has the real one can give it:

```js
const stop = srMap.horizon.provide(async ({ latDeg, lonDeg }) => {
  const deg = await mySkyline(latDeg, lonDeg); // 360 numbers: index = azimuth in degrees, value = altitude
  return { deg, credit: 'Elevation: ...', label: 'my elevation data' };
});
```

The map asks when the sky view opens and again when the place changes, wears the answer (the land is that one
silhouette, the sky's note says where it came from), and goes back to its drawn skyline when you call `stop()` or
answer `null`. `horizon.get()` is `{source: 'drawn'|'provided', deg, credit}`.

## The place

`place.get()` is the observer or null; `place.set({latDeg, lonDeg, name?})` uses that place, as choosing a city does.

## Earth overlays (NASA GIBS)

| Call | Answer |
|---|---|
| `await gibs.service()` | `{wms, width, height, blank_bytes}`: where the map asks GIBS (`registry/overlays.yaml`) |
| `await gibs.layers()` | `[{id, layer, title, rule, credit}]` |
| `gibs.get()` | `{id, status, date, credit}` of the overlay on the globe |
| `await gibs.set(id \| null, {date?})` | lays it on, of the day `date` ('YYYY-MM-DD') if given, else the newest; resolves with its state once shown or failed |

## The map's chrome

| Call | Answer |
|---|---|
| `ui.tool({id, where, label, title?, icon?, locked?, onPress})` | a button in the map's own style in one or more places: `'earth'` (What to show, Earth data), `'ground'` (a landing site's bar), `'sky'` (the sky's controls), `'make'` (the share sheet, after Record), `'drift'` (the drift's options), `'device'` (What to show, at its foot: this device). `onPress({opener, where})`. `locked` adds a lock glyph. Answers `{update({label, title, locked}), remove()}` |
| `ui.panel({id, title})` | the map's floating panel (Record's, and the phone's bottom sheet): `{body, open({opener}), close(), isOpen(), setTitle(t), onClose(fn)}`. Fill `body` yourself; the map's control set (`.ui-btn`, `.ui-select`, ...) is styled there |
| `ui.toast(text)` | one line in the map's toast |

Icons for `ui.tool`: `film`, `route`, `users`, `mountain`, `sunrise`, `download`, `printer`, `bookmark`, `video`, `lock` and the map's own (`timer`, `camera`, `share`,
`compass`, `presentation`, ...).

Each place is an empty, hidden `div[data-sr-tools="<where>"]`; the map dispatches `document` event
`sr:slot {slot: 'tools', where, el}` when it builds one. Without a script the slots stay empty and nothing changes.

## Rules a script should keep

- Words in the visitor's language (`srMap.lang`), sentence case, no exclamation marks: the map's own rules
  (`docs/DESIGN_PRINCIPLES.md`).
- Say where data came from: a credit line on anything you record or draw from someone else's data.
- Never put a person's place or anything they typed in a URL, a log line or an analytics event.
