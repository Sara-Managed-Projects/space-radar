// ui/driftplan.js -- the arithmetic of the drift: a camera that wanders on its own (spec 0071).
//
// Exports (all pure: plain objects in, plain objects out; no document, no clock, no three.js):
//   CATEGORIES, HOODS, PACES, DEFAULTS, URL_KEY
//   categoryOf(record)                 which of the five things to travel through a record is
//   hoodOf(record, facts)              its neighbourhood, one of HOODS
//   hoodByAu(au)                       the neighbourhood of a distance from the Sun
//   buildPlaces(records, options, look) the pool: one place per record worth a visit
//   createWalk(places, opts)           -> { next(), state() }: the order, with no end
//   flightMs(from, to, pace)           how long the camera takes between two places
//   dwellFor(pace, rng)                how long it stays, and the slow turn it makes there
//   readOptions(value, stored)         what `#drift=…` and the remembered choices ask for
//   writeOptions(options)              the same, as the address says it
//
// ui/drift.js is the only reader in the app: it owns the timers, the document and the camera.
// tests/test_drift.mjs holds every function here.
//
// WHY A WALK AND NOT A SHUFFLE. Ivan, 2026-10-12: "it shouldn't be heavy mechanism, but on the
// other side smart ... not to fly directly from earth to 50 million light years somewhere". A
// shuffle of everything on the map does exactly that: the station, then a galaxy, then a rover.
// The map already has an order, by distance from the Sun (HOODS below, the scale ladder's own
// order), so the drift is a walk along it: a few places in one neighbourhood, then the next
// neighbourhood out, and at the far end it turns and comes home. Every move is to somewhere the
// last place could nearly see. It costs one weighted pick per stop and holds no route.
//
// NOTHING HERE IS PREDEFINED. A trip is a registry row somebody wrote (registry/tours.yaml); a
// reel is a list of trips (registry/autopilot.yaml). The drift has no row: its pool is whatever
// the layers hold when it starts, so a satellite launched this morning is in it tonight.

/** What the drift can travel through, in the order the options list them. */
export const CATEGORIES = ['craft', 'worlds', 'small', 'stars', 'deep'];

/**
 * The neighbourhoods, in order of distance from the Sun, then outward up the scale ladder. The
 * walk only ever steps to the next one that has a place in it.
 */
export const HOODS = [
  'sun', 'mercury', 'venus', 'earth', 'moon', 'mars', 'belt', 'jupiter', 'saturn', 'uranus',
  'neptune', 'kuiper', 'stellar', 'galaxy', 'beyond',
];

/** Where each hood ends, in astronomical units from the Sun: for things that orbit the Sun itself. */
const AU_EDGES = [
  [0.25, 'sun'], [0.55, 'mercury'], [0.85, 'venus'], [1.3, 'earth'], [2.0, 'mars'], [4.2, 'belt'],
  [7.5, 'jupiter'], [14, 'saturn'], [25, 'uranus'], [35, 'neptune'],
];

/** How far from the Earth its own neighbourhood reaches, au: past L1 and L2 (0.01), short of anything else. */
export const EARTH_REACH_AU = 0.05;

/**
 * Three paces. `dwell` is seconds at a place (a range, drawn from evenly), `turn` the slow turn
 * round it in degrees a second, `flight` a multiplier on the flight's length.
 */
export const PACES = {
  calm: { dwell: [24, 34], turn: 1.5, flight: 1.3 },
  steady: { dwell: [15, 22], turn: 2.2, flight: 1 },
  brisk: { dwell: [9, 13], turn: 3.2, flight: 0.8 },
};

/** What the drift does when nobody has chosen: craft and worlds, real models only, names shown. */
export const DEFAULTS = { through: ['craft', 'worlds'], realOnly: true, tags: true, pace: 'steady' };

/** The one key the mode owns in the address. */
export const URL_KEY = 'drift';

const CRAFT = new Set(['station', 'satellite', 'telescope', 'probe', 'rocket']);
const SMALL = new Set(['asteroid', 'comet']);
const STARS = new Set(['star', 'exoplanet']);
const DEEP = new Set(['dso', 'exotic']);

/**
 * Which category a record belongs to, or null when the drift never visits its kind. `facts.onWorld`
 * is the world a site stands on (main.js reads it from the record's frame).
 */
export function categoryOf(record, facts = {}) {
  const k = record && record.klass;
  if (!k) return null;
  if (k === 'world') return 'worlds';
  if (CRAFT.has(k)) return 'craft';
  if (SMALL.has(k)) return 'small';
  if (STARS.has(k)) return 'stars';
  if (DEEP.has(k)) return 'deep';
  // A lander or a rover standing on another world is a craft with a place. A pad or a dish on the
  // Earth is not visited: at night it is a mark on a dark globe, and the camera stands back so far
  // for it (scene/framing.js nightGroundPose) that the stop reads as "the Earth again".
  if (k === 'site') return facts.onWorld && facts.onWorld !== 'earth' ? 'craft' : null;
  return null;
}

/** The neighbourhood of something `au` astronomical units from the Sun. */
export function hoodByAu(au) {
  if (!Number.isFinite(au) || au < 0) return 'earth';
  for (const [edge, hood] of AU_EDGES) if (au < edge) return hood;
  return 'kuiper';
}

/**
 * A record's neighbourhood. `facts` is what the app knows that the record does not carry:
 *   planetOf  the planet a world belongs to (a moon's parent; a planet is its own), or null
 *   onWorld   the world a site stands on
 *   nearEarth true for anything in the Earth's own sky: propagated in an Earth frame
 *   sunAu     its distance from the Sun now, for everything else in the Solar System
 *   earthAu   and from the Earth, when that is known
 *   farLy     a deep-sky object's distance in light-years
 */
export function hoodOf(record, facts = {}) {
  const cat = categoryOf(record, facts);
  if (!cat) return null;
  if (cat === 'stars') return 'stellar';
  if (cat === 'deep') return Number.isFinite(facts.farLy) && facts.farLy > 200000 ? 'beyond' : 'galaxy';
  if (cat === 'worlds') {
    const id = record.id;
    if (id === 'sun' || id === 'moon') return id;
    const planet = facts.planetOf || id;
    if (planet === 'pluto') return 'kuiper';
    return HOODS.includes(planet) ? planet : hoodByAu(facts.sunAu);
  }
  if (facts.onWorld && HOODS.includes(facts.onWorld)) return facts.onWorld;
  if (facts.nearEarth) return 'earth';
  const hood = hoodByAu(facts.sunAu);
  // At the Earth's distance from the Sun and nowhere near the Earth (a telescope trailing it by a
  // third of its orbit, a car): the next neighbourhood along, not the Earth's own sky.
  if (hood === 'earth' && Number.isFinite(facts.earthAu) && facts.earthAu > EARTH_REACH_AU) return facts.sunAu < 1 ? 'venus' : 'mars';
  return hood;
}

/**
 * The pool. `look(record)` is the app's answer to "is this drawn as itself": 2 for a real model, a
 * mapped world, a photographed nebula; 1 for something drawn as its kind; 0 for something not
 * worth flying to (a fragment, a mark). `facts(record)` feeds hoodOf. With `realOnly` only the 2s
 * are places; without it the 1s are too, at a third of the weight, so the walk still prefers what
 * has a face.
 *
 * @returns {{id:string, record:object, cat:string, hood:string, weight:number}[]}
 */
export function buildPlaces(records, options, look, facts) {
  const through = new Set(options && Array.isArray(options.through) ? options.through : DEFAULTS.through);
  const realOnly = !options || options.realOnly !== false;
  const seen = new Set();
  const out = [];
  for (const record of records || []) {
    if (!record || !record.id || seen.has(record.id)) continue;
    // The cheap question first: `facts` may cost a position, and most records are not asked it.
    if (!record.klass || (record.klass !== 'site' && !through.has(categoryOf(record)))) continue;
    const score = typeof look === 'function' ? Number(look(record)) || 0 : 1;
    if (score < (realOnly ? 2 : 1)) continue;
    const f = typeof facts === 'function' ? facts(record) || {} : {};
    const cat = categoryOf(record, f);
    if (!cat || !through.has(cat)) continue;
    const hood = hoodOf(record, f);
    if (!hood) continue;
    seen.add(record.id);
    out.push({ id: record.id, record, cat, hood, weight: score >= 2 ? 3 : 1 });
  }
  return out;
}

/** How many places the walk remembers, so it does not come straight back to one. */
export const MEMORY = 24;
/** How many places it sees in one neighbourhood before it moves on: a range. */
export const STAY = [2, 5];
/** The chance, at each move, that it turns round before it has reached the end of the ladder. */
export const TURN_CHANCE = 0.18;

/**
 * The walk. `rng` returns [0, 1); `startHood` is where the camera is now (the walk begins in the
 * nearest neighbourhood that has a place). `next()` returns a place, or null when the pool is
 * empty. It never ends and never returns the place it returned last, unless that is the only one.
 */
export function createWalk(places, opts = {}) {
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const byHood = new Map();
  for (const p of places || []) {
    if (!byHood.has(p.hood)) byHood.set(p.hood, []);
    byHood.get(p.hood).push(p);
  }
  const live = HOODS.filter((h) => byHood.has(h));
  const recent = [];
  let at = -1;        // index into `live`
  let dir = 1;        // 1 outward, -1 home
  let left = 0;       // places still to see in this neighbourhood
  let last = null;
  let moves = 0;

  function nearest(hood) {
    const want = HOODS.indexOf(hood);
    let best = 0;
    let gap = Infinity;
    live.forEach((h, i) => {
      const g = Math.abs(HOODS.indexOf(h) - (want < 0 ? HOODS.indexOf('earth') : want));
      if (g < gap) { gap = g; best = i; }
    });
    return best;
  }

  function stay(pool) {
    const n = STAY[0] + Math.floor(rng() * (STAY[1] - STAY[0] + 1));
    return Math.max(1, Math.min(pool.length, n));
  }

  function move() {
    if (live.length < 2) return;
    if (at + dir < 0 || at + dir >= live.length) dir = -dir;
    else if (moves > 0 && rng() < TURN_CHANCE && at - dir >= 0 && at - dir < live.length) dir = -dir;
    at += dir;
    moves += 1;
  }

  function pick(pool) {
    let fresh = pool.filter((p) => !recent.includes(p.id));
    if (!fresh.length) fresh = pool.filter((p) => p !== last);
    if (!fresh.length) fresh = pool;
    let total = 0;
    for (const p of fresh) total += p.weight;
    let roll = rng() * total;
    for (const p of fresh) { roll -= p.weight; if (roll < 0) return p; }
    return fresh[fresh.length - 1];
  }

  function next() {
    if (!live.length) return null;
    if (at < 0) {
      at = nearest(opts.startHood || 'earth');
      left = stay(byHood.get(live[at]));
    } else if (left <= 0) {
      move();
      left = stay(byHood.get(live[at]));
    }
    const pool = byHood.get(live[at]);
    const place = pick(pool);
    left -= 1;
    // A neighbourhood with nothing new left in it is left early, not circled.
    if (left > 0 && pool.every((p) => p === place || recent.includes(p.id))) left = 0;
    last = place;
    recent.push(place.id);
    while (recent.length > Math.min(MEMORY, Math.max(1, (places || []).length - 1))) recent.shift();
    return place;
  }

  return {
    next,
    state: () => ({ hood: at < 0 ? null : live[at], dir, left, hoods: live.slice(), recent: recent.slice() }),
  };
}

/** The shortest and the longest flight, ms, before the pace's multiplier. */
export const FLIGHT_MS = [6500, 13000];
const FLIGHT_STEP_MS = 1300;

/**
 * How long the camera takes from one place to the next: longer the further apart their
 * neighbourhoods are on the ladder, never short enough to read as a jump, never so long that the
 * screen is empty sky for a quarter of a minute.
 */
export function flightMs(from, to, pace = 'steady') {
  const p = PACES[pace] || PACES.steady;
  const a = HOODS.indexOf(from && from.hood);
  const b = HOODS.indexOf(to && to.hood);
  const steps = a < 0 || b < 0 ? 2 : Math.abs(a - b);
  const base = Math.min(FLIGHT_MS[1], FLIGHT_MS[0] + steps * FLIGHT_STEP_MS);
  return Math.round(base * p.flight);
}

/**
 * How long it stays, and the turn it makes while it does: `deg` is signed (the way round is a coin
 * toss) and is what one dwell at the pace's rate covers, so the turn ends as the stay does.
 */
export function dwellFor(pace = 'steady', rng = Math.random) {
  const p = PACES[pace] || PACES.steady;
  const s = p.dwell[0] + rng() * (p.dwell[1] - p.dwell[0]);
  const sign = rng() < 0.5 ? -1 : 1;
  return { ms: Math.round(s * 1000), deg: sign * p.turn * s, degPerSec: p.turn };
}

const OFF_WORDS = ['0', 'off', 'false', 'no'];

/**
 * What the address and the remembered choices ask for. `value` is `#drift=`'s: `1` (the remembered
 * choices, else the defaults), or words with commas between them, in any order:
 *   craft, worlds, small, stars, deep   what to travel through (`all` is every one)
 *   any                                 also things drawn as their kind, not only real models
 *   notags                              no names on screen
 *   calm, steady, brisk                 the pace
 * A word that names nothing is dropped and listed in `notes`. `stored` is what ui/drift.js kept in
 * this browser the last time the options were changed.
 *
 * @returns {{on:boolean, through:string[], realOnly:boolean, tags:boolean, pace:string, notes:string[]}}
 */
export function readOptions(value, stored) {
  const base = { ...DEFAULTS, through: DEFAULTS.through.slice() };
  const s = stored && typeof stored === 'object' ? stored : {};
  if (Array.isArray(s.through)) {
    const kept = CATEGORIES.filter((c) => s.through.includes(c));
    if (kept.length) base.through = kept;
  }
  if (typeof s.realOnly === 'boolean') base.realOnly = s.realOnly;
  if (typeof s.tags === 'boolean') base.tags = s.tags;
  if (PACES[s.pace]) base.pace = s.pace;
  const notes = [];
  const raw = value === undefined || value === null ? null : String(value).trim().toLowerCase();
  if (raw === null || OFF_WORDS.includes(raw)) return { on: false, ...base, notes };
  const words = raw.split(',').map((w) => w.trim()).filter(Boolean);
  const through = [];
  for (const w of words) {
    if (w === '1' || w === 'on' || w === 'true' || w === 'yes') continue;
    if (w === 'all') { for (const c of CATEGORIES) if (!through.includes(c)) through.push(c); }
    else if (CATEGORIES.includes(w)) { if (!through.includes(w)) through.push(w); }
    else if (w === 'any') base.realOnly = false;
    else if (w === 'real') base.realOnly = true;
    else if (w === 'notags') base.tags = false;
    else if (w === 'tags') base.tags = true;
    else if (PACES[w]) base.pace = w;
    else notes.push(`unknown:${w}`);
  }
  if (through.length) base.through = CATEGORIES.filter((c) => through.includes(c));
  return { on: true, ...base, notes };
}

/** The options as `#drift=` says them: `1` for the defaults, else the words that differ. */
export function writeOptions(options) {
  const o = options || DEFAULTS;
  const words = [];
  const through = CATEGORIES.filter((c) => (o.through || []).includes(c));
  const same = through.length === DEFAULTS.through.length && through.every((c) => DEFAULTS.through.includes(c));
  if (!same) words.push(...(through.length === CATEGORIES.length ? ['all'] : through));
  if (o.realOnly === false) words.push('any');
  if (o.tags === false) words.push('notags');
  if (o.pace && o.pace !== DEFAULTS.pace && PACES[o.pace]) words.push(o.pace);
  return words.length ? words.join(',') : '1';
}
