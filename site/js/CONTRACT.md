# The v1 contract

Every module in `site/js/` obeys this file. It exists so several people (or agents) can build
parts at once and have them fit. If code and this file disagree, this file is right and the code
is the bug.

## Hard rules

1. **No build step.** Plain ES modules, loaded by `<script type="module">`. It is served as-is
   from an S3 bucket. No bundler, no transpiler, no TypeScript, no JSX, no npm at runtime.
2. **No CDN at runtime.** Everything is in `site/vendor/` or `site/data/`. The only network calls
   are to the upstream APIs listed in `data/sources.js`, and every one of them is CORS-verified.
3. **Works over plain HTTP.** The S3 website endpoint is HTTP. An HTTPS API call from an HTTP page
   is allowed, so the data layer works. Geolocation and service workers do NOT work over HTTP:
   the app must degrade to a manual location picker and say why.
4. **One clock.** `clock.now()` is the only time in the app. No module calls `Date.now()` for
   anything it draws. No `setTimeout`-driven animation of scene state.
5. **Every drawn thing carries `cls`**, one of `measured | inferred | illustrative | sample`, and
   the card shows it in words. `sample` is v1-only: bundled demonstration data for a source whose
   API cannot be called from a browser. It is drawn with a dashed halo so it is never mistaken for
   a live position.
6. **Metric units internally**: kilometres, seconds, radians. Degrees only at the UI boundary.
7. **No module reaches into another's internals.** Only the exports listed below.

## Coordinate frames

| frame | meaning |
|---|---|
| `earth-inertial` | **TEME**, km, Earth-centred: the true equator and mean equinox OF DATE, which is what SGP4 returns. **Not J2000** — spec 0002 §1 says J2000 and this file overrules it for v1, because converting every satellite every tick costs more than rotating the sky once. In 2026 the two frames are **0.29° apart (0.55 Moon widths)**, so the difference is real: `starfield.js` rotates the J2000 catalogue into TEME with a single quaternion, and `frames.j2000ToTeme` / `temeToJ2000` are there for anything else that needs to cross. |
| `earth-fixed` | ECEF, km, rotates with Earth. Ground sites and the observer live here. |
| `sun-inertial` | Heliocentric ecliptic J2000, km. Probes, asteroids, comets, planets. |

`frames.js` converts between them. The scene draws in the **active stage's** frame with a floating
origin: `scenePos = (worldPos - stage.originKm) / stage.unitKm`.

## Module map and exports

### `clock.js`
```js
export const clock = {
  now(): number,            // ms since epoch, the app's only time
  date(): Date,
  rate: number,             // 1, 10, 60, 600, 3600, 36000
  mode: 'live'|'scrub',
  setRate(r): void,
  goTo(ms): void,           // jump; switches to scrub
  live(): void,             // back to wall clock
  tick(realDeltaMs): void,  // called once per frame by main.js
  onChange(fn): void,
}
```

### `propagate/frames.js`
```js
export function gmst(date): number                     // radians
export function eciToEcef(v, gmstRad): {x,y,z}
export function ecefToEci(v, gmstRad): {x,y,z}
export function geodeticToEcef(latRad, lonRad, altKm): {x,y,z}
export function ecefToGeodetic(v, ...): {latRad, lonRad, altKm}
export function lookAngles(observerGd, ecefPos): {az, el, rangeKm}   // radians
export function eclipticToEquatorial(v): {x,y,z}       // sun-inertial -> earth-inertial axes
export function equatorialToEcliptic(v): {x,y,z}
export function radecToVec(raDeg, decDeg): {x,y,z}     // unit vector, equatorial J2000
export function toStage(record, posKm, stage): {x,y,z} // frame composition -> stage frame, km
```

### `propagate/index.js`
```js
// Every propagator has the SAME signature. This is the whole extension point.
// record: a Record (below). tMs: clock time. Returns null if it cannot answer.
export function propagate(record, tMs): {x,y,z, frame, cls} | null
export const PROPAGATORS: { sgp4, kepler, sampled, body, fixed, ascent }
```

### The Record — the one shape everything flows through
```js
{
  id: string,             // stable, unique
  name: string,           // display name
  layer: string,          // layers.js id
  klass: string,          // visual class: station|satellite|debris|rocket|probe|telescope|
                          //               asteroid|comet|site|world
  propagator: string,     // key of PROPAGATORS
  frame: string,
  cls: string,            // measured|inferred|illustrative|sample
  epoch: number|null,     // ms; when the underlying data was true
  source: string,         // sources.js id, for the card's source line
  // exactly one of, depending on propagator:
  satrec,     // sgp4:   a satellite.js satrec
  elements,   // kepler: {a_au|q_au, e, i_deg, om_deg, w_deg, ma_deg|tp_jd, epoch_jd}
  samples,    // sampled: [{tMs, x, y, z, vx, vy, vz}] OR [{tMs, rKm:[..], vKmS:[..]}]
              //          -- sampled.js normalises both; km and km/s in the record's frame
  body,       // body:   an astronomy-engine Body name
  fixed,      // fixed:  {latDeg, lonDeg, altKm}
  ascent,     // ascent: {padLatDeg, padLonDeg, t0Ms, orbitClass}
  meta: { ... }           // whatever the card wants: operator, launchDate, sizeM, magnitude, ...
}
```

### `data/sources.js`
```js
export const SOURCES: Record<id, {
  id, url, cadenceMs, freshnessMaxMs, cors: boolean, attribution, label
}>
export async function load(id): Promise<{ok, data, fetchedAt, stale, error, fromCache}>
export function status(): Array<{id, label, fetchedAt, ageMs, stale, error, attribution, live}>
// Caches in localStorage under `sr.v1.<id>`, honours cadenceMs (never refetches early --
// CelesTrak firewalls clients that do), serves the cached copy on any failure, and NEVER
// throws. A source that cannot be reached yields ok:false and the app keeps its last good copy.
```

### `data/parsers.js`
```js
export function parseCelestrakGP(json, opts): Record[]
export function parseLaunches(json): {launches: Record[], pads: Record[], events: EventRow[]}
export function parseComets(text): Record[]        // MPC CometEls.txt, fixed width
export function parseDsn(xmlText): DsnLink[]
export function parseSpaceWeather(json): {kp: number, forecast: [...]}
```

### `data/sample.js`
```js
// Bundled data for sources with no browser access (JPL has no CORS headers at all).
// Every record here MUST carry cls:'sample' and a `meta.why` explaining what it stands in for.
export function sampleAsteroids(): Record[]
export function sampleDeepSpace(): Record[]
export function sampleReentries(): Record[]
```

### `data/layers.js`
```js
export const LAYERS: Array<{
  id, display, klass, source, propagator, frame, moments:{wonder,now,next},
  select(records): Record[], budget, defaultOn, colour, glyph, nearKm, card
}>
export async function loadLayer(layer): Promise<Record[]>
export function enabledLayers(moment): Layer[]
```

### `scene/renderer.js`
```js
export function createRenderer(canvas): {renderer, scene, camera, resize(), render()}
// WebGL2, logarithmicDepthBuffer, dpr clamped to 2, sRGB output, ACES tone mapping.
```

### `scene/stage.js`
```js
export const stage = {
  worldId: 'earth',
  unitKm: number,
  originKm: {x,y,z},
  setWorld(id): void,
  toScene(posKm, frame): THREE.Vector3,
}
```

### `scene/worlds.js`
```js
export function createWorlds(scene): { update(tMs), meshFor(id), positionOf(id, tMs) }
// Earth, Moon, Sun, planets. Earth uses earth.js's material.
```

### `scene/earth.js`
```js
export function createEarth(textures): THREE.Mesh      // + atmosphere shell as a child
export function updateEarth(mesh, sunDirScene, tMs): void
// Custom ShaderMaterial: day/night blend by sun direction, night lights, drifting clouds with a
// shadow term, ocean specular derived from the day map (there is no specular texture), Fresnel
// atmosphere on a slightly larger BackSide sphere.
```

### `scene/starfield.js`
```js
export function createStarfield(scene, {starsBin, linesJson, namesJson, milkyWayTexture}): {setVisible(b)}
// Milky Way on an inside-out sphere + real stars as Points, sized/coloured by mag and B-V,
// + constellation lines. All in earth-inertial (equatorial J2000).
```

### `scene/glyphs.js`
```js
export function createGlyphLayer(scene, layer): {
  setRecords(records), update(tMs, camera), pick(ndcX, ndcY): Record|null, dispose(), setVisible(b)
}
// ONE InstancedMesh per layer. Per-instance colour/size/opacity. Camera-facing quads with the
// class glyph from the generated atlas. Debris draws at 60% size, half opacity, under everything.
```

### `scene/models.js`
```js
export function modelFor(klass, variant): THREE.Object3D   // procedural cartoon geometry
export function updateModelAttitude(obj, record, sunDirScene, nadirScene): void
// v1 builds models procedurally from primitives -- no GLB pipeline yet. Toon material, 3-step
// ramp, Fresnel rim, no outline on 3D. Panels get the one sharp specular.
```

### `scene/camera.js`
```js
export function createCameraRig(camera, domElement): {
  update(dt), flyTo({targetScene, distance, ms}), follow(getPosFn), stopFollow(),
  onUserInput(fn), state
}
// Damped orbit controls + eased flights. prefers-reduced-motion -> instant with a fade.
```

### `sky/passes.js`
```js
export function predictPasses(records, observer, fromMs, hours): Pass[]
// Pass: {record, startMs, peakMs, endMs, peakEl, startAz, endAz, sunlit, magnitude|null}
// 30 s steps in a plain loop, peak refined; sunlit via satellite.js shadowFraction.
```

### `sky/skyview.js`
```js
export function createSkyView(ctx): {enter(observer), exit(), update(tMs), active}
// Moves the camera to the observer on Earth's surface looking up; draws horizon, cardinals,
// sky gradient from the real Sun elevation. Same scene, same records -- NOT a second engine.
```

### `ui/cards.js`
```js
export function showCard(record, ctx): void
export function hideCard(): void
// Order is fixed: name + class glyph, ONE plain sentence, up to three comparison chips,
// "right now", "see it from here", actions, then the class+age line and the source line.
```

### `ui/controls.js`
```js
export function createControls(ctx): void   // moment switcher, layer toggles with counts, clock
```

### `ui/status.js`
```js
export function createStatus(ctx): void     // every source, its age, its error; three states:
                                            // ok / stale / could not look
```

### `copy/en.js`
```js
export const COPY = {...}                   // every user-visible string
export function compare(kind, value): string|null   // "about the size of a bus"
export const GLOSSARY = {...}
```

## The `ctx` object main.js passes around
```js
{ clock, stage, scene, camera, cameraRig, worlds, layers, records(), recordById(id),
  select(record), observer, setObserver(o), moment, setMoment(m), sources }
```

## Visual tokens (from docs/design-language.md — do not invent new ones)
```
space #0B0E14   spaceEdge #05070A   ember #FF9F43 (interactive ONLY)
text #E8ECF2    textDim #9AA4B2     atmosphere #6EC3FF   nightLights #FFC98A
station #F2F4F7  satellite #7FD1FF  debris #7A8494  rocket #FFD166
probe #C3A6FF    telescope #9EF0D8  asteroid #B8926A comet #D9F3FF  site #F58F7C
```
No red anywhere. No purple gradients. No outlines on 3D models.
