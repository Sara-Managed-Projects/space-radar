// ui/flightpath.js -- a camera path as data: keyframes, the easing between them, the clock along them, the
// `#path=` link and a draft trip (forge #155). Pure: no DOM, no ctx, no three.js object.
//
// Contract, for ui/flighteditor.js and tests/test_flightpath.mjs:
//   EASINGS, RIG_EASE, RATES, MAX_KEYS, MIN_MS, MAX_MS, DEFAULT_MS, PATH_VERSION
//   easeAt(name, x)                     0..1 -> 0..1, the camera rig's own curve under that name (scene/camera.js)
//   makeKey(raw)                        a clean key, or null: { at | xyz, stage, cam, t, rate, ease, ms }
//   startsOf(path), totalMs(path)       when each key is reached, in ms of path time; the whole length
//   segmentAt(path, ms)                 { i, k, e }: flying into key i, k of the way by time, e by the ease
//   poseAt(path, ms, sepKm)             the camera at path time ms: { i, e, from, to, azimuthDeg, polarDeg, distanceKm, stage }
//   logDistanceAt(fromKm, toKm, sepKm, e), APEX_SHARE   the distance through a flight, over an apex between far things
//   clockTimes(path, startMs)           the clock's instant at each key (a key with no `t` carries the clock on at its rate)
//   clockAt(path, ms, startMs)          { t, rate, driven } at path time ms
//   packPath(path), unpackPath(packed)  the compact array a link carries, and back (null for anything else)
//   encodePath(path), decodePath(text)  the `#path=` value: deflated and base64url (`z...`), or plain (`j...`) where
//                                       the browser has no CompressionStream; async because the stream is
//   tripDraft(path, opts)               a registry/tours.yaml entry as YAML text, for a person to finish
//
// WHAT A KEY IS (CosmosMap's flight editor has start and end views, a duration and two easings; SpaceEngine's
// path editor is a paid extra; spec 0081 has both). A key is a view the visitor stood at: WHAT the camera looks at
// (`at`, a record id, or `xyz`, a point in the stage's frame in km when nothing was selected), WHICH map
// (`stage`), WHERE the camera stands round it (`cam`, ui/urlstate.js camValue's three numbers), and the CLOCK:
// `t`, the instant to show at the key (epoch ms; null means "carry on from where the clock got to"), and `rate`,
// how fast it runs into the key and after it. Every key after the first also says how long the flight into it
// takes (`ms`) and how it eases (`ease`). Flying to Saturn while the clock speeds up to watch Titan go round is
// two keys: the Earth at 1x, Saturn at 10 h/s.
//
// THE CLOCK ALONG THE PATH IS ONE FUNCTION OF PATH TIME, so a scrub, a preview and a recording are the same
// sequence of instants. clockTimes() gives each key its instant: its own `t`, or the one before plus its rate
// times the flight. Between two keys the clock is DRIVEN, on the same ease as the camera, when the key being
// flown into names an instant (the clock is taken there, smoothly, however far that is); otherwise it RUNS at
// the key's rate from the key before. The first key with no `t` starts at whatever the clock says when Play is
// pressed: a path made of live views plays live.
//
// THE CAMERA ALONG THE PATH is the rig's own flight between two poses: the angles by the shortest way round,
// the distance in its logarithm (so ten thousand km to ten km is not 99.9 % spent far away), the look-at point
// from the key before to the key flown into, all on one ease. poseAt() is that, for the scrub; the playback
// asks the rig itself (scene/camera.js flyTo, targetDelay 0) so the two agree. A key on another map is a CUT to
// that map at the start of its flight, as a trip's stops are (registry/tours.yaml `stage`): the thing left is
// drawn elsewhere on the new map, so there is nothing to fly away from.
//
// THE LINK. `#path=` is the whole path, so sharing it is a link and not a file. Ten numbers a key, as a JSON
// array, deflated (CompressionStream 'deflate-raw', in every current browser) and base64url'd: a three-key path
// is about 150 characters. No server keeps it; nothing is uploaded.

import { CAMERA_EASES } from '../scene/camera.js';

export const PATH_VERSION = 1;
/** The easings offered, in the editor's order: CosmosMap's two ("Smooth start & stop", constant) and the rig's cruise. */
export const EASINGS = ['smooth', 'cruise', 'constant'];
/** The rig's name for each (scene/camera.js EASES): `inout` rest to rest, `cruise` 15/70/15, `linear`. */
export const RIG_EASE = { smooth: 'inout', cruise: 'cruise', constant: 'linear' };
/** The clock's rates (clock.js RATES); a key's rate is one of them. */
export const RATES = [1, 10, 60, 600, 3600, 36000];
export const MAX_KEYS = 24;
/** A flight is at least half a second (a shorter one is a cut that wobbles) and at most two minutes. */
export const MIN_MS = 500;
export const MAX_MS = 120000;
export const DEFAULT_MS = 4000;

const LOG_FLOOR = 1e-6;
const finite = (v) => typeof v === 'number' && Number.isFinite(v);
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const sig4 = (v) => Number(Number(v).toPrecision(4));
const tenth = (v) => Math.round(v * 10) / 10;

/** The rig's curve under the editor's name; an unknown name is `smooth`. Pure. */
export function easeAt(name, x) {
  const fn = CAMERA_EASES[RIG_EASE[name] || RIG_EASE.smooth];
  return fn(clamp(Number(x) || 0, 0, 1));
}

/** A clean key from anything, or null when it is not a view: no target, no pose, or no map. Pure. */
export function makeKey(raw) {
  const r = raw || {};
  const cam = r.cam || {};
  const az = Number(cam.azimuthDeg);
  const pol = Number(cam.polarDeg);
  const dist = Number(cam.distanceKm);
  if (!finite(az) || !finite(pol) || !(dist > 0) || !Number.isFinite(dist)) return null;
  const stage = typeof r.stage === 'string' && /^[a-z0-9-]{1,40}$/.test(r.stage) ? r.stage : '';
  if (!stage) return null;
  const at = typeof r.at === 'string' && r.at.length > 0 && r.at.length <= 80 && !/[\s"\\]/.test(r.at) ? r.at : '';
  const xyz = !at && Array.isArray(r.xyz) && r.xyz.length === 3 && r.xyz.every((v) => finite(Number(v))) ? r.xyz.map((v) => sig4(Number(v))) : null;
  if (!at && !xyz) return null;
  const t = finite(Number(r.t)) && r.t !== null && r.t !== '' && Number(r.t) > -6e13 && Number(r.t) < 6e13 ? Math.round(Number(r.t) / 1000) * 1000 : null;
  const rate = RATES.includes(Number(r.rate)) ? Number(r.rate) : 1;
  const ease = EASINGS.includes(r.ease) ? r.ease : 'smooth';
  const ms = finite(Number(r.ms)) ? Math.round(clamp(Number(r.ms), MIN_MS, MAX_MS) / 100) * 100 : DEFAULT_MS;
  const key = {
    stage,
    cam: { azimuthDeg: tenth(((az % 360) + 360) % 360), polarDeg: tenth(clamp(pol, 0.1, 179.9)), distanceKm: sig4(dist) },
    t, rate, ease, ms,
  };
  if (at) key.at = at; else key.xyz = xyz;
  return key;
}

/** Path time (ms) at which each key is reached; the first at 0. Pure. */
export function startsOf(path) {
  const keys = (path && path.keys) || [];
  const out = [];
  let acc = 0;
  keys.forEach((k, i) => { if (i > 0) acc += k.ms; out.push(acc); });
  return out;
}

export function totalMs(path) {
  const s = startsOf(path);
  return s.length ? s[s.length - 1] : 0;
}

/** Which flight path time `ms` is in: into key i (1..n-1), k of it by time, e by its ease. Before the start i is 0. Pure. */
export function segmentAt(path, ms) {
  const keys = (path && path.keys) || [];
  if (keys.length < 2 || !(ms > 0)) return { i: 0, k: 1, e: 1 };
  const starts = startsOf(path);
  for (let i = 1; i < keys.length; i += 1) {
    if (ms < starts[i] || i === keys.length - 1) {
      const k = clamp((ms - starts[i - 1]) / keys[i].ms, 0, 1);
      return { i, k, e: easeAt(keys[i].ease, k) };
    }
  }
  return { i: keys.length - 1, k: 1, e: 1 };
}

/** The shorter way from one angle to another, in degrees, in (-180, 180]. */
function turn(from, to) {
  let d = (to - from) % 360;
  if (d > 180) d -= 360;
  if (d <= -180) d += 360;
  return d;
}

/**
 * The log of the camera's distance `e` of the way through a flight from `fromKm` to `toKm` between two things
 * `sepKm` apart. Straight in the logarithm when the two are close; when they are farther apart than either end's
 * distance, the curve rises through APEX_SHARE of their separation at the middle (a quadratic Bezier in log space,
 * as the rig's own apex is, scene/camera.js logDistanceAt), so both are in the picture on the way and the middle
 * of the flight is not a close look at the empty point between them. Pure.
 */
export const APEX_SHARE = 1.2;
export function logDistanceAt(fromKm, toKm, sepKm, e) {
  const la = Math.log(Math.max(fromKm, LOG_FLOOR));
  const lb = Math.log(Math.max(toKm, LOG_FLOOR));
  const apex = Number(sepKm) > 0 ? Math.log(sepKm * APEX_SHARE) : -Infinity;
  if (!(apex > Math.max(la, lb))) return la + (lb - la) * e;
  const c = 2 * apex - (la + lb) / 2; // the control point that puts the curve through the apex at e = 0.5
  return (1 - e) * (1 - e) * la + 2 * e * (1 - e) * c + e * e * lb;
}

/**
 * The camera at path time `ms`: angles the shortest way, distance in its logarithm (over an apex when the two
 * things are `sepKm` apart, logDistanceAt), `e` of the way from key i-1 to key i (the caller mixes the two look-at
 * points by `e`, at the clock's instant). Null for an empty path. Pure.
 */
export function poseAt(path, ms, sepKm = 0) {
  const keys = (path && path.keys) || [];
  if (!keys.length) return null;
  const { i, e } = segmentAt(path, ms);
  const to = keys[i];
  const from = i > 0 ? keys[i - 1] : to;
  const a = from.cam;
  const b = to.cam;
  const az = a.azimuthDeg + turn(a.azimuthDeg, b.azimuthDeg) * e;
  return {
    i, e, from, to,
    // A key on another map is a cut to it at the start of the flight: the pose is flown on the key's map.
    stage: to.stage,
    azimuthDeg: ((az % 360) + 360) % 360,
    polarDeg: a.polarDeg + (b.polarDeg - a.polarDeg) * e,
    distanceKm: Math.exp(logDistanceAt(a.distanceKm, b.distanceKm, i > 0 && from.stage === to.stage ? sepKm : 0, e)),
  };
}

/** The clock's instant at each key, epoch ms: its own `t`, else the one before carried on at its rate. Pure. */
export function clockTimes(path, startMs) {
  const keys = (path && path.keys) || [];
  const out = [];
  keys.forEach((k, i) => {
    if (k.t !== null && finite(k.t)) out.push(k.t);
    else if (i === 0) out.push(Number(startMs) || 0);
    else out.push(out[i - 1] + k.rate * k.ms);
  });
  return out;
}

/**
 * The clock at path time `ms`: `t` its instant, `rate` the rate to leave it at, `driven` when the key flown into
 * names an instant (the clock is eased there with the camera) rather than running into it at its rate. Pure.
 */
export function clockAt(path, ms, startMs) {
  const keys = (path && path.keys) || [];
  if (!keys.length) return { t: Number(startMs) || 0, rate: 1, driven: false };
  const T = clockTimes(path, startMs);
  const { i, k, e } = segmentAt(path, ms);
  if (i === 0) return { t: T[0], rate: keys[0].rate, driven: false };
  const key = keys[i];
  const driven = key.t !== null && finite(key.t);
  const t = driven ? T[i - 1] + (T[i] - T[i - 1]) * e : T[i - 1] + key.rate * key.ms * k;
  return { t: Math.round(t), rate: key.rate, driven };
}

// --------------------------------------------------------------------------------------------- the link

/** The array a link carries: [version, [[at|xyz, stage, az, polar, km, t s|0, rate, ease, ms/100], ...]]. Pure. */
export function packPath(path) {
  const keys = ((path && path.keys) || []).slice(0, MAX_KEYS);
  return [PATH_VERSION, keys.map((k) => [
    k.at || k.xyz, k.stage, k.cam.azimuthDeg, k.cam.polarDeg, k.cam.distanceKm,
    k.t === null ? 0 : Math.round(k.t / 1000), k.rate, Math.max(0, EASINGS.indexOf(k.ease)), Math.round(k.ms / 100),
  ])];
}

/** And back, through makeKey, so a hand-edited link cannot carry what the editor could not make. Null when not a path. Pure. */
export function unpackPath(packed) {
  if (!Array.isArray(packed) || packed[0] !== PATH_VERSION || !Array.isArray(packed[1])) return null;
  const keys = [];
  for (const row of packed[1].slice(0, MAX_KEYS)) {
    if (!Array.isArray(row) || row.length !== 9) return null;
    const [target, stage, az, pol, km, ts, rate, easeIndex, ms100] = row;
    const key = makeKey({
      at: typeof target === 'string' ? target : '', xyz: Array.isArray(target) ? target : null, stage,
      cam: { azimuthDeg: az, polarDeg: pol, distanceKm: km },
      t: Number(ts) ? Number(ts) * 1000 : null, rate, ease: EASINGS[easeIndex], ms: Number(ms100) * 100,
    });
    if (!key) return null;
    keys.push(key);
  }
  return keys.length ? { keys } : null;
}

function toBase64Url(bytes) {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 1) bin += String.fromCharCode(bytes[i]);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromBase64Url(text) {
  const b64 = String(text).replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(b64 + '='.repeat((4 - (b64.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i += 1) out[i] = bin.charCodeAt(i);
  return out;
}

async function pipe(bytes, stream) {
  const piped = new Blob([bytes]).stream().pipeThrough(stream);
  return new Uint8Array(await new Response(piped).arrayBuffer());
}

/** The `#path=` value. `z` + deflate-raw + base64url, or `j` + base64url of the JSON where there is no CompressionStream. */
export async function encodePath(path, g = globalThis) {
  const json = new TextEncoder().encode(JSON.stringify(packPath(path)));
  if (typeof g.CompressionStream === 'function') {
    try { return `z${toBase64Url(await pipe(json, new g.CompressionStream('deflate-raw')))}`; } catch { /* the plain form below */ }
  }
  return `j${toBase64Url(json)}`;
}

/** A `#path=` value back to a path, or null: never throws, whatever was typed. */
export async function decodePath(text, g = globalThis) {
  const s = String(text || '');
  if (!/^[zj][A-Za-z0-9_-]{4,6000}$/.test(s)) return null;
  try {
    let bytes = fromBase64Url(s.slice(1));
    if (s[0] === 'z') {
      if (typeof g.DecompressionStream !== 'function') return null;
      bytes = await pipe(bytes, new g.DecompressionStream('deflate-raw'));
    }
    return unpackPath(JSON.parse(new TextDecoder().decode(bytes)));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------------------ the draft trip

const isoOf = (ms) => new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
const quoted = (s) => JSON.stringify(String(s));

/**
 * A registry/tours.yaml entry for this path, as YAML text: the trip a person finishes by writing its cards and
 * then checks with `python3 scripts/check_registry.py`. A key that looks at a point and not at a thing has no
 * target a stop can name, and is left out with a comment saying so. What a stop cannot say is said as a comment:
 * a trip's stop picks its own side by the key light (`key_light_deg`), so the editor's angles are written down
 * and not used. `opts`: `worlds` (ids that are registry/worlds.yaml rows: `target: {world: ...}`), `names` (id ->
 * name, for the comments), `layers` (id -> the layer a record is in: `needs_layer:`, so the trip switches it on),
 * `id` (the trip id), `today` (YYYY-MM-DD). Pure.
 */
export function tripDraft(path, opts = {}) {
  const keys = (path && path.keys) || [];
  const worlds = new Set(opts.worlds || []);
  const names = opts.names || {};
  const layers = opts.layers || {};
  const id = /^[a-z0-9-]{3,60}$/.test(opts.id || '') ? opts.id : 'draft-flight';
  const stage = keys.length ? keys[0].stage : 'earth';
  const easeOf = (k) => RIG_EASE[k.ease] || 'inout';
  const lines = [
    `  # DRAFT from the flight editor (forge #155), ${opts.today || isoOf(Date.now()).slice(0, 10)}. Not a trip yet: write the`,
    '  # title, the blurb and every card, choose the group, then run `python3 scripts/check_registry.py` and',
    '  # `python3 scripts/gen_tours_js.py`. A trip needs three stops at least (min_stops).',
    `  - id: ${id}`,
    '    title: "TODO: what a visitor reads on the row, 60 characters at most"',
    '    blurb: "TODO: one sentence under the title."',
    '    group: solar-system  # or earth-orbit, beyond, events (the `groups:` table above)',
    `    stage: ${stage}`,
    '    clock: as-found',
    '    stops:',
  ];
  let n = 0;
  keys.forEach((k, i) => {
    if (!k.at) {
      lines.push(`      # key ${i + 1} looks at a point, not at a thing: a stop needs a target, so it is left out.`);
      return;
    }
    n += 1;
    const target = worlds.has(k.at) ? `{world: ${k.at}}` : `{record: ${k.at}}`;
    lines.push(`      - id: k${n}`);
    if (names[k.at]) lines.push(`        # ${String(names[k.at]).replace(/[\r\n]+/g, ' ')}`);
    lines.push(`        target: ${target}`);
    if (layers[k.at] && /^[a-z0-9-]+$/.test(layers[k.at])) lines.push(`        needs_layer: ${layers[k.at]}`);
    if (k.stage !== stage) lines.push(`        stage: ${k.stage}`);
    lines.push(`        distance_km: ${sig4(k.cam.distanceKm)}`);
    lines.push(`        # the editor's camera: azimuth ${k.cam.azimuthDeg} deg, polar ${k.cam.polarDeg} deg; a stop picks its side by the key light`);
    if (i > 0) lines.push(`        ease: ${easeOf(k)}  # the editor flew into this key in ${k.ms / 1000} s; a trip times its own flights`);
    if (k.t !== null) lines.push(`        time: ${quoted(isoOf(k.t))}`);
    if (k.rate !== 1) lines.push(`        rate: ${k.rate}`);
    lines.push('        card:', '          title: "TODO"', '          body: >-', '            TODO: what this stop shows, in words a visitor can check.');
  });
  if (!n) lines.push('      []  # no key looks at a thing');
  return `${lines.join('\n')}\n`;
}
