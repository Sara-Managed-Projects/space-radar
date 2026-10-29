// moments/format.js -- a Moment as data, and the pure arithmetic of its clock (internal spec 0079, stage C1).
//
// A MOMENT is a mission replay: one clock, the mission's own elapsed time, drives every vehicle, the camera, the
// captions and the sound together. It is a file, `site/data/moments/<id>.json`, whose shape docs/MOMENTS.md
// describes field by field and validateMoment() below holds (tests/test_moments.mjs runs it on every file).
//
// THE TWO CLOCKS. `t` is mission time in seconds from the moment's `epoch` (T-0; negative before it). `p` is play
// time, the seconds a visitor watches. `pace` is a list of contiguous segments, each with a `rate` (mission seconds
// per play second): 1 for the seconds that matter, 20 or 600 for the long coasts. The rate is ALWAYS on screen
// (compressionText): a replay that hides how much it squeezed is not honest about time.
//
// Nothing here touches three.js or the page, so node holds all of it.

export const FORMAT = 1;
/** What a part event may do (the contract with the model stages, ~/space-radar-handoff/release-1.5/moments-contract.md). */
export const ACTIONS = ['separate', 'hide', 'show', 'ignite', 'cutoff', 'throttle', 'deploy'];
/** The director's shots (moments/director.js). */
export const SHOTS = ['pad', 'track', 'chase', 'orbit', 'onboard', 'globe', 'wide'];
/** The app's honesty classes, as a Moment uses them for a trajectory or a shot. */
export const TRUTH = ['measured', 'reconstructed', 'illustrative'];
/** Engine exhaust looks (moments/effects.js FLAME_KINDS has the colours). */
export const FLAME_KINDS = ['kerolox', 'hydrolox', 'solid', 'hypergolic'];
/** Ground near a place (moments/stage.js). */
export const GROUNDS = ['coast', 'land', 'sea'];
const ID = /^[a-z0-9][a-z0-9-]{0,39}$/;

export function isMomentId(id) {
  return typeof id === 'string' && ID.test(id);
}

// --- the pace: mission time <-> play time ----------------------------------------------------------------------

/**
 * The pace as a table: `segs` [{from, to, rate, p0, p1}] in mission seconds and play seconds, and `total` play
 * seconds. Throws on a gap, an overlap or a rate that is not positive: validateMoment reports the same in words.
 */
export function paceTable(pace) {
  if (!Array.isArray(pace) || !pace.length) throw new Error('pace: no segments');
  const segs = [];
  let p = 0;
  for (let i = 0; i < pace.length; i += 1) {
    const s = pace[i] || {};
    const from = Number(s.from), to = Number(s.to), rate = Number(s.rate);
    if (!(to > from) || !(rate > 0)) throw new Error(`pace[${i}]: needs from < to and rate > 0`);
    if (i > 0 && Math.abs(from - segs[i - 1].to) > 1e-9) throw new Error(`pace[${i}]: starts at ${from}, the last ended at ${segs[i - 1].to}`);
    const len = (to - from) / rate;
    segs.push({ from, to, rate, p0: p, p1: p + len });
    p += len;
  }
  return { segs, total: p, from: segs[0].from, to: segs[segs.length - 1].to };
}

function segOfT(table, t) {
  const { segs } = table;
  if (t <= segs[0].from) return segs[0];
  for (const s of segs) if (t < s.to) return s;
  return segs[segs.length - 1];
}
function segOfP(table, p) {
  const { segs } = table;
  for (const s of segs) if (p < s.p1) return s;
  return segs[segs.length - 1];
}
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

/** Play seconds at mission time t (clamped to the moment's span). */
export function playOf(table, t) {
  const tt = clamp(Number(t) || 0, table.from, table.to);
  const s = segOfT(table, tt);
  return s.p0 + (tt - s.from) / s.rate;
}
/** Mission time at play second p (clamped). */
export function missionOf(table, p) {
  const pp = clamp(Number(p) || 0, 0, table.total);
  const s = segOfP(table, pp);
  return s.from + (pp - s.p0) * s.rate;
}
/** The rate in force at mission time t. */
export function rateAt(table, t) {
  return segOfT(table, clamp(Number(t) || 0, table.from, table.to)).rate;
}

/** The compression as it is printed: "×1", "×20", "×600", "×0.5". */
export function compressionText(rate) {
  const r = Number(rate) || 1;
  const v = r >= 10 ? Math.round(r) : Math.round(r * 10) / 10;
  return `×${String(v)}`;
}

/**
 * Mission elapsed time as a mission clock prints it: "T−00:00:08", "T+00:02:41", "T+102:45:40" (hours run on past a
 * day, as Apollo's ground elapsed time did). A real minus sign, never a hyphen.
 */
export function formatMet(t) {
  const v = Number(t) || 0;
  const sign = v < 0 ? '−' : '+';
  let s = Math.floor(Math.abs(v) + 1e-6);
  const h = Math.floor(s / 3600); s -= h * 3600;
  const m = Math.floor(s / 60); s -= m * 60;
  const two = (n) => String(n).padStart(2, '0');
  return `T${sign}${two(h)}:${two(m)}:${two(s)}`;
}

// --- tracks -------------------------------------------------------------------------------------------------------

/** The index of the last entry of a time-sorted list with `t <= now`, or -1. Binary search. */
export function lastAt(list, now) {
  let lo = 0, hi = (list ? list.length : 0) - 1, out = -1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (list[mid].t <= now) { out = mid; lo = mid + 1; } else hi = mid - 1;
  }
  return out;
}

/** The chapter in force at t (index), 0 before the first. */
export function chapterAt(chapters, t) {
  return Math.max(0, lastAt(chapters, t));
}

/**
 * The caption on screen at t: the last one that began, until its own `until` (mission seconds) or, without one, until
 * the next begins or `holdS` play seconds have passed. Returns the caption or null.
 */
export function captionAt(captions, t, table, holdS = 7) {
  const i = lastAt(captions, t);
  if (i < 0) return null;
  const c = captions[i];
  if (Number.isFinite(c.until)) return t < c.until ? c : null;
  const next = captions[i + 1];
  if (next && t >= next.t) return null;
  return playOf(table, t) - playOf(table, c.t) <= holdS ? c : null;
}

/** Cues whose time was crossed going forward from t0 (exclusive) to t1 (inclusive). */
export function crossed(list, t0, t1) {
  if (!(t1 > t0)) return [];
  return (list || []).filter((c) => c.t > t0 && c.t <= t1);
}

/**
 * Monotone cubic interpolation (Fritsch and Carlson 1980) through (xs, ys): no overshoot, so a height that only rises
 * between two published points never dips between them. Returns f(x) -> { y, dy } and extrapolates on the end slope.
 */
export function monotoneCubic(xs, ys) {
  const n = xs.length;
  if (n < 2) throw new Error('monotoneCubic: two points at least');
  const d = [], m = new Array(n);
  for (let i = 0; i < n - 1; i += 1) {
    const h = xs[i + 1] - xs[i];
    if (!(h > 0)) throw new Error('monotoneCubic: x must increase');
    d.push((ys[i + 1] - ys[i]) / h);
  }
  m[0] = d[0]; m[n - 1] = d[n - 2];
  for (let i = 1; i < n - 1; i += 1) m[i] = d[i - 1] * d[i] <= 0 ? 0 : (d[i - 1] + d[i]) / 2;
  for (let i = 0; i < n - 1; i += 1) {
    if (d[i] === 0) { m[i] = 0; m[i + 1] = 0; continue; }
    const a = m[i] / d[i], b = m[i + 1] / d[i], s = a * a + b * b;
    if (s > 9) { const k = 3 / Math.sqrt(s); m[i] = k * a * d[i]; m[i + 1] = k * b * d[i]; }
  }
  return (x) => {
    if (x <= xs[0]) return { y: ys[0] + m[0] * (x - xs[0]), dy: m[0] };
    if (x >= xs[n - 1]) return { y: ys[n - 1] + m[n - 1] * (x - xs[n - 1]), dy: m[n - 1] };
    let i = 0;
    let lo = 0, hi = n - 2;
    while (lo <= hi) { const mid = (lo + hi) >> 1; if (xs[mid] <= x) { i = mid; lo = mid + 1; } else hi = mid - 1; }
    const h = xs[i + 1] - xs[i], u = (x - xs[i]) / h, u2 = u * u, u3 = u2 * u;
    const y = (2 * u3 - 3 * u2 + 1) * ys[i] + (u3 - 2 * u2 + u) * h * m[i] + (-2 * u3 + 3 * u2) * ys[i + 1] + (u3 - u2) * h * m[i + 1];
    const dy = ((6 * u2 - 6 * u) * ys[i] + (3 * u2 - 4 * u + 1) * h * m[i] + (-6 * u2 + 6 * u) * ys[i + 1] + (3 * u2 - 2 * u) * h * m[i + 1]) / h;
    return { y, dy };
  };
}

// --- the share link ------------------------------------------------------------------------------------------------

/** The hash of a link to a moment at a time: `#moment=<id>&t=<s>` (a tenth of a second). */
export function shareHash(id, t) {
  const v = Math.round((Number(t) || 0) * 10) / 10;
  return `#moment=${id}&t=${String(v)}`;
}

/** A link's `t` as mission seconds inside the span, or null (absent, not a number, outside). */
export function parseT(value, table) {
  if (value === undefined || value === null || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (table && (n < table.from || n > table.to)) return null;
  return n;
}

// --- validation ----------------------------------------------------------------------------------------------------

const isNum = Number.isFinite;
const isVec = (v, n = 3) => Array.isArray(v) && v.length === n && v.every(isNum);
const sorted = (list) => list.every((x, i) => i === 0 || x.t >= list[i - 1].t);

/**
 * Everything wrong with a Moment, as sentences (an empty list is a valid one). `opts.models` is the list of model ids
 * registry/models.yaml has, `opts.words` the story's words (COPY.momentStories[id]); either may be left out.
 */
export function validateMoment(m, opts = {}) {
  const out = [];
  const say = (s) => out.push(s);
  if (!m || typeof m !== 'object') return ['not an object'];
  if (m.format !== FORMAT) say(`format is ${m.format}, this reader knows ${FORMAT}`);
  if (!isMomentId(m.id)) say(`id ${JSON.stringify(m.id)} is not lower-case words with dashes`);
  if (!isNum(Date.parse(m.epoch)) || !/Z$/.test(String(m.epoch))) say('epoch is not an ISO time in UTC (ending in Z)');
  let table = null;
  try { table = paceTable(m.pace); } catch (e) { say(e.message); }
  if (table && Array.isArray(m.span) && (m.span[0] !== table.from || m.span[1] !== table.to)) say(`span ${JSON.stringify(m.span)} is not the pace's ${table.from} to ${table.to}`);
  const words = opts.words || null;
  const need = (key, where) => { if (words && (typeof key !== 'string' || !(key in words))) say(`${where}: no words for ${JSON.stringify(key)}`); };
  need('title', 'title');
  need('blurb', 'blurb');
  const place = m.place || {};
  if (!isNum(place.lat) || Math.abs(place.lat) > 90 || !isNum(place.lon) || Math.abs(place.lon) > 180) say('place needs lat and lon in degrees');
  if (place.ground && !GROUNDS.includes(place.ground.kind)) say(`place.ground.kind must be one of ${GROUNDS.join(', ')}`);
  // Trajectories.
  const trajs = m.trajectories || {};
  for (const [id, tr] of Object.entries(trajs)) {
    if (!TRUTH.includes(tr.truth)) say(`trajectory ${id}: truth must be one of ${TRUTH.join(', ')}`);
    if (typeof tr.source !== 'string' || tr.source.length < 8) say(`trajectory ${id}: say where it comes from (source)`);
    if (tr.kind === 'profile') {
      const pts = tr.points;
      if (!Array.isArray(pts) || pts.length < 3 || !pts.every((r) => isVec(r, 3))) say(`trajectory ${id}: points are [t, altitude km, downrange km], three at least`);
      else if (!pts.every((r, i) => i === 0 || r[0] > pts[i - 1][0])) say(`trajectory ${id}: points must be in time order`);
      if (!isNum(tr.azimuth) && !isNum(place.azimuth)) say(`trajectory ${id}: a profile needs a flight azimuth`);
    } else if (tr.kind === 'vectors') {
      const rows = tr.rows;
      if (!tr.file && (!Array.isArray(rows) || rows.length < 2 || !rows.every((r) => isVec(r, 7)))) say(`trajectory ${id}: rows are [t, x, y, z, vx, vy, vz] in km and km/s, or a file`);
      if (!['earth-j2000', 'earth-teme'].includes(tr.frame)) say(`trajectory ${id}: frame must be earth-j2000 or earth-teme`);
    } else say(`trajectory ${id}: kind must be profile or vectors`);
  }
  // Vehicles and their parts.
  const vehicles = Array.isArray(m.vehicles) ? m.vehicles : [];
  if (!vehicles.length) say('no vehicles');
  const parts = new Map();
  for (const v of vehicles) {
    if (!isMomentId(v.id)) say(`vehicle ${JSON.stringify(v.id)}: id`);
    if (opts.models && !opts.models.includes(v.model)) say(`vehicle ${v.id}: model ${v.model} is not a row of registry/models.yaml`);
    if (!(v.lengthM > 0)) say(`vehicle ${v.id}: lengthM, its real length in metres`);
    if (v.path && !trajs[v.path]) say(`vehicle ${v.id}: path ${v.path} is not a trajectory`);
    const names = new Set([...(Array.isArray(v.parts) ? v.parts : []), ...Object.keys(v.cuts || {})]);
    for (const [name, band] of Object.entries(v.cuts || {})) {
      if (!isVec(band, 2) || !(band[1] > band[0])) say(`vehicle ${v.id}: cut ${name} is [from, to] metres up the stack`);
    }
    for (const [name, list] of Object.entries(v.engines || {})) {
      if (!names.has(name)) say(`vehicle ${v.id}: engines on ${name}, which is not a part`);
      if (!Array.isArray(list) || !list.length || !list.every((p) => isVec(p))) say(`vehicle ${v.id}: engines.${name} is a list of [x, y, z] nozzle exits`);
    }
    for (const [name, f] of Object.entries(v.flames || {})) {
      if (!names.has(name)) say(`vehicle ${v.id}: flames on ${name}, which is not a part`);
      if (!FLAME_KINDS.includes(f.kind) || !(f.exitM > 0)) say(`vehicle ${v.id}: flames.${name} needs kind (${FLAME_KINDS.join(', ')}) and exitM`);
    }
    for (const [name, c] of Object.entries(v.chutes || {})) {
      if (!(c.diameterM > 0) || !isVec(c.at)) say(`vehicle ${v.id}: chute ${name} needs diameterM and at`);
      names.add(name);
    }
    parts.set(v.id, names);
  }
  // Tracks.
  const tracks = m.tracks || {};
  const inSpan = (t) => table && isNum(t) && t >= table.from && t <= table.to;
  for (const key of ['parts', 'camera', 'captions', 'audio', 'effects']) {
    const list = tracks[key];
    if (list === undefined) continue;
    if (!Array.isArray(list) || !sorted(list)) { say(`tracks.${key} must be a list in time order`); continue; }
    for (const e of list) if (!inSpan(e.t)) say(`tracks.${key}: t ${e.t} is outside the span`);
  }
  for (const e of tracks.parts || []) {
    if (!ACTIONS.includes(e.action)) say(`part event at ${e.t}: action ${e.action}`);
    const names = parts.get(e.vehicle || (vehicles[0] && vehicles[0].id));
    if (!names || !names.has(e.part)) say(`part event at ${e.t}: ${e.part} is not a part of ${e.vehicle || vehicles[0] && vehicles[0].id}`);
    if (e.dv !== undefined && !isVec(e.dv)) say(`part event at ${e.t}: dv is [x, y, z] m/s`);
    if (e.spin !== undefined && !isVec(e.spin)) say(`part event at ${e.t}: spin is [x, y, z] rad/s`);
  }
  const cam = tracks.camera || [];
  if (!cam.length) say('tracks.camera: the director needs one shot at least');
  else if (table && cam[0].t > table.from) say('tracks.camera: the first shot must start at the span\'s start');
  for (const s of cam) {
    if (!SHOTS.includes(s.shot)) say(`shot at ${s.t}: ${s.shot} is not one of ${SHOTS.join(', ')}`);
    if (s.truth !== undefined && !TRUTH.includes(s.truth)) say(`shot at ${s.t}: truth`);
    if (['chase', 'orbit', 'onboard', 'track', 'globe'].includes(s.shot) && s.vehicle && !parts.has(s.vehicle)) say(`shot at ${s.t}: vehicle ${s.vehicle}`);
  }
  for (const c of tracks.captions || []) need(c.say, `caption at ${c.t}`);
  for (const a of tracks.audio || []) {
    if (!a.sting && !(typeof a.src === 'string' && /^audio\/[\w/.-]+\.(opus|m4a|mp3)$/.test(a.src))) say(`audio at ${a.t}: a sting or a file under audio/`);
  }
  const chapters = Array.isArray(m.chapters) ? m.chapters : [];
  if (!chapters.length) say('no chapters');
  if (!sorted(chapters)) say('chapters must be in time order');
  if (table && chapters.length && chapters[0].t !== table.from) say('the first chapter starts at the span\'s start');
  for (const c of chapters) need(c.say, `chapter at ${c.t}`);
  for (const s of Array.isArray(m.sources) ? m.sources : []) if (!/^https:\/\//.test(String(s.url || ''))) say('sources: each has an https url');
  if (!Array.isArray(m.sources) || !m.sources.length) say('sources: name what the replay is made from');
  return out;
}
