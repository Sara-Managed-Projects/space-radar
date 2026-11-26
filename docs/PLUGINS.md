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
| `await record.frames({width, height, fps})` | an encoder for pictures you draw yourself: `await enc.add(canvas, repeat)` adds a frame (shown `repeat` frames long), `await enc.done()` is the `Blob`. WebCodecs where the browser has it (every frame kept, however slowly you draw), else MediaRecorder paced in real time |

Nothing is uploaded. Save the `Blob` yourself (an `<a download>` with `URL.createObjectURL`).

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
| `ui.tool({id, where, label, title?, icon?, locked?, onPress})` | a button in the map's own style in one or more places: `'earth'` (What to show, Earth data), `'ground'` (a landing site's bar), `'sky'` (the sky's controls), `'make'` (the share sheet, after Record). `onPress({opener, where})`. `locked` adds a lock glyph. Answers `{update({label, title, locked}), remove()}` |
| `ui.panel({id, title})` | the map's floating panel (Record's, and the phone's bottom sheet): `{body, open({opener}), close(), isOpen(), setTitle(t), onClose(fn)}`. Fill `body` yourself; the map's control set (`.ui-btn`, `.ui-select`, ...) is styled there |
| `ui.toast(text)` | one line in the map's toast |

Icons for `ui.tool`: `film`, `route`, `users`, `mountain`, `sunrise`, `lock` and the map's own (`timer`, `camera`, `share`,
`compass`, `presentation`, ...).

Each place is an empty, hidden `div[data-sr-tools="<where>"]`; the map dispatches `document` event
`sr:slot {slot: 'tools', where, el}` when it builds one. Without a script the slots stay empty and nothing changes.

## Rules a script should keep

- Words in the visitor's language (`srMap.lang`), sentence case, no exclamation marks: the map's own rules
  (`docs/DESIGN_PRINCIPLES.md`).
- Say where data came from: a credit line on anything you record or draw from someone else's data.
- Never put a person's place or anything they typed in a URL, a log line or an analytics event.
