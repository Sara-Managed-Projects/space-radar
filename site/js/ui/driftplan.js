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
//   planFlight(hop)                    the curve and the length of a long flight, from its geometry
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

/**
 * What the drift does when nobody has chosen: craft and worlds, real models only, names shown.
 * `bare` is "only space" (ui/drift.js): nothing on the screen but the sky and the things in it.
 */
export const DEFAULTS = { through: ['craft', 'worlds'], realOnly: true, tags: true, bare: false, pace: 'steady' };

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
 * has a face. With `bare` only the 2s are, whatever `realOnly` says: with every mark off the screen
 * a place has to be a body or a model, or the camera has flown to nothing.
 *
 * @returns {{id:string, record:object, cat:string, hood:string, weight:number}[]}
 */
export function buildPlaces(records, options, look, facts) {
  const through = new Set(options && Array.isArray(options.through) ? options.through : DEFAULTS.through);
  const realOnly = !options || options.realOnly !== false || options.bare === true;
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
 * A LONG FLIGHT IS PACED BY WHAT THE EYE SEES, NOT BY THE CLOCK. Ivan, 2026-10-14: "if it is 2
 * satellites on the Earth it goes smoothly, but then it travels far to Mars or even more and it is
 * super fast for this distance, so eyes are tired".
 *
 * MEASURED that day on the real rig (tests/helpers/drift_flights.mjs; the table is in the pull
 * request): the old flight gave every hop 6.5 to 13 seconds and one curve, so the picture's scale
 * changed 1.6 to 1.7 times e a second for a moment on a hop round the Earth, and about 3 times e a
 * second (twenty-fold, every second) for seconds on end on the way to the Moon or Mars; between two
 * stars it was 200, and the last frame was a jump. The look-at point also moved at one speed in
 * kilometres whatever the camera's distance, so the body being left slid out of the picture, and
 * the body being met slid into it, at 40 to 140 degrees a second.
 *
 * What is held instead, at the steady pace (COMFORT; calm is slower and brisk faster by the pace's
 * own `flight` factor):
 *   loom  how fast anything in the picture grows or shrinks: 1 time e a second (2.7-fold)
 *   pan   how fast the look-at point crosses the picture: 0.35 of the camera's distance a second,
 *         which is 20 degrees a second on the screen
 *   turn  how fast the picture turns as the camera comes round to the side it meets the next
 *         place from: 24 degrees a second (the hop round the Earth he likes peaks at 19 to 34)
 *
 * THE CURVE is the one that holds the first two at once: van Wijk and Nuij's ("Smooth and efficient
 * zooming and panning", 2003). The camera pulls back while it starts to cross, until both places
 * are in one picture, crosses, and comes down on the other; the look-at point moves in proportion
 * to the camera's distance all the way. Its length in the eye's units is two logarithms: of the
 * crossing over the distance each end is watched from. So Mars takes a little longer than the
 * Moon, not a hundred times longer, and the length is the same at any scale of the map.
 *
 * WHICH SIDE THE CAMERA IS ON, AND WHEN. A planet is met on its lit face, which from the Earth is
 * the side the camera comes from: looking along its own line of travel. The camera then overtakes
 * the place it left, and that place, a dot by now, streaks through the picture from the middle to
 * the edge (measured: 112 degrees a second on the way to Mars, on this curve as on the old one).
 * Arriving on the far side is the same with the place ahead. So the swing is in two parts. EARLY,
 * while it pulls back, the camera comes round to a side-on view of the crossing, no nearer the line
 * of travel than SIDE_ON; the place it left then slides out of the side of the picture at the pan's
 * own speed. LATE, once that place is out of the picture and the next is near the middle of it
 * (LEFT_BEHIND, NEARLY_THERE), it comes round the rest of the way, to the side the app wants. When
 * that side is already side-on enough, the second part is nothing and the arrival is straight in.
 *
 * THE CEILING (FLIGHT_MOST_MS): nobody waits a minute. Only flights between stars reach it (a star
 * is met from a millionth of a light-year, and the next is hundreds away); those run above the
 * bound, at about the rate of the old hop round the Earth, and `over` says by how much.
 *
 * A SHORT HOP IS NOT PLANNED: null, and the flight is the one it always was (he likes them).
 * "Short" is a crossing of no more than SHORT_SPAN times the nearer of the two distances it is
 * watched from, and no more than that between the two distances themselves.
 */
export const COMFORT = { loom: 1.0, pan: 0.35, turnDeg: 24 };
export const SHORT_SPAN = 25;
export const FLIGHT_MOST_MS = 30000;
/** The share of the flight spent gathering speed, and the same again losing it. */
export const RAMP = 0.2;
/** In the middle of a crossing the camera is at least this far round from the line of travel, radians. */
export const SIDE_ON = Math.PI / 4;
/**
 * The crossing done, over the camera's distance: the early swing is over by the first of these and
 * the late one waits for the second (the place left is then out of a side-on picture for good).
 */
export const LEFT_BEHIND = [0.45, 1];
/** The crossing still to do, over the camera's distance, under which the next place stays in the picture whichever way the camera swings. */
export const NEARLY_THERE = 0.43;
/** With no crossing to speak of the swing is one move, over by this share of the flight; and the late swing ends here. */
export const TURN_BY = [0.75, 0.95];

/** Rest to rest: a cosine ramp up over RAMP, a steady middle, the same ramp down. Peak speed 1 / (1 - RAMP). */
function glide(x) {
  if (!(x > 0)) return 0;
  if (x >= 1) return 1;
  if (x > 0.5) return 1 - glide(1 - x);
  const v = 1 / (1 - RAMP);
  if (x < RAMP) return v * (x / 2 - (RAMP / (2 * Math.PI)) * Math.sin((Math.PI * x) / RAMP));
  return v * (x - RAMP / 2);
}

/** Where a function that only rises from 0 to 1 over 0..1 passes `y`. */
function whereRising(fn, y) {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 48; i++) { const mid = (lo + hi) / 2; if (fn(mid) < y) lo = mid; else hi = mid; }
  return (lo + hi) / 2;
}

const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const mix = (a, ka, b, kb) => ({ x: a.x * ka + b.x * kb, y: a.y * ka + b.y * kb, z: a.z * ka + b.z * kb });
function unit(v) {
  const n = v ? Math.hypot(v.x, v.y, v.z) : 0;
  return n > 1e-12 ? { x: v.x / n, y: v.y / n, z: v.z / n } : null;
}
/**
 * Directions as the rig holds them: an angle round `up` and an angle down from it. The swing is
 * walked in these two, as the rig's own flights are, so the horizon stays level: the short way
 * over the sphere goes past the pole when it likes, and there the picture rolls.
 */
function compass(up) {
  const k = unit(up) || { x: 0, y: 1, z: 0 };
  const seed = Math.abs(k.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 };
  const e = unit(mix(seed, 1, k, -dot(seed, k)));
  const n = { x: k.y * e.z - k.z * e.y, y: k.z * e.x - k.x * e.z, z: k.x * e.y - k.y * e.x };
  return {
    read: (d) => ({ az: Math.atan2(dot(d, e), dot(d, n)), pol: Math.acos(Math.max(-1, Math.min(1, dot(d, k)))) }),
    dir: (a) => mix(mix(e, Math.sin(a.pol) * Math.sin(a.az), n, Math.sin(a.pol) * Math.cos(a.az)), 1, k, Math.cos(a.pol)),
  };
}
/** The way round from one pair of angles to another: the short way in azimuth. */
function leg(a, b) {
  let dAz = (b.az - a.az) % (2 * Math.PI);
  if (dAz > Math.PI) dAz -= 2 * Math.PI;
  if (dAz < -Math.PI) dAz += 2 * Math.PI;
  const dPol = b.pol - a.pol;
  return { size: Math.hypot(dAz, dPol), at: (t) => ({ az: a.az + dAz * t, pol: a.pol + dPol * t }) };
}
const smooth = (t) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));

/**
 * @param {{sep:number, from:number, to:number, fromDir?:object, toDir?:object, along?:object, up?:object, pace?:string}} hop
 *   what scene/camera.js flyTo hands its `path`: how far the look-at point goes, the camera's
 *   distance at each end (one unit, any), and four unit vectors on the scene's axes: from the
 *   look-at point to the camera now, the same on arrival, the line of travel, the camera's up.
 *   And the pace.
 * @returns {null | {ms:number, travel:number, over:number, swings:number[], at:(raw:number) => {pan:number, distance:number, dir:object|null}}}
 *   null for a short hop. `travel` is the curve's length in times-e of scale; `over` is how many
 *   times the bounds the flight runs at (1 or less, except under the ceiling); `swings` the two
 *   parts of the swing, radians.
 */
export function planFlight(hop) {
  const w0 = Number(hop && hop.from);
  const w1 = Number(hop && hop.to);
  const sep = Number(hop && hop.sep);
  if (!(w0 > 0) || !(w1 > 0) || !(sep >= 0)) return null;
  const near = Math.min(w0, w1);
  if (sep <= SHORT_SPAN * near && Math.max(w0, w1) <= SHORT_SPAN * near) return null;
  const pace = PACES[hop.pace] || PACES.steady;
  // rho trades zoom for pan: the peak zoom rate is rho * V and the peak pan rate V / rho.
  const r2 = COMFORT.loom / COMFORT.pan;
  // A change of distance with next to no crossing is the same curve with a crossing too small to see.
  const u1 = Math.max(sep, near * 1e-6);
  const b0 = (w1 * w1 - w0 * w0 + r2 * r2 * u1 * u1) / (2 * w0 * r2 * u1);
  const b1 = (w1 * w1 - w0 * w0 - r2 * r2 * u1 * u1) / (2 * w1 * r2 * u1);
  const r0 = -Math.asinh(b0);
  const travel = -Math.asinh(b1) - r0;
  const top = w0 * Math.cosh(r0);
  const panAt = (r) => Math.sinh(r) / Math.cosh(r + r0);
  const whole = panAt(travel);

  // The swing: one move, or two with a side-on view of the crossing between them.
  const d0 = unit(hop.fromDir);
  const d1 = unit(hop.toDir);
  const line = unit(hop.along);
  let mid = d1;
  let early = [0, TURN_BY[0]];
  let late = null;
  if (d0 && d1 && line && u1 > 2 * w0 && u1 > 2 * w1) {
    const c = dot(d1, line);
    if (Math.acos(Math.min(1, Math.abs(c))) < SIDE_ON) {
      const off = unit(mix(d1, 1, line, -c)) || unit(mix(d0, 1, line, -dot(d0, line)))
        || unit(mix(Math.abs(line.x) < 0.9 ? { x: 1, y: 0, z: 0 } : { x: 0, y: 1, z: 0 }, 1, line, -(Math.abs(line.x) < 0.9 ? line.x : line.y)));
      mid = mix(line, Math.sign(c || 1) * Math.cos(SIDE_ON), off, Math.sin(SIDE_ON));
    }
    // Done-over-distance is sinh(r) / (rho^2 cosh r0); to-do-over-distance falls all the way.
    const rawAt = (r) => whereRising(glide, Math.max(0, Math.min(1, r / travel)));
    const done = (x) => Math.asinh(x * r2 * Math.cosh(r0));
    const todo = (r) => (whole * Math.cosh(r + r0) - Math.sinh(r)) / (r2 * Math.cosh(r0));
    const there = travel * whereRising((k) => 1 - Math.min(1, todo(k * travel) / todo(0)), 1 - NEARLY_THERE / todo(0));
    early = [0, Math.max(0.2, rawAt(done(LEFT_BEHIND[0])))];
    late = [Math.min(TURN_BY[1] - 0.1, rawAt(Math.max(done(LEFT_BEHIND[1]), there))), TURN_BY[1]];
  }
  const round = compass(hop.up);
  const legs = d0 && d1 ? [leg(round.read(d0), round.read(mid)), leg(round.read(mid), round.read(d1))] : null;
  const swings = legs ? [legs[0].size, late ? legs[1].size : 0] : [0, 0];
  const degS = 180 / Math.PI / COMFORT.turnDeg;
  const forZoom = (travel / (COMFORT.loom * (1 - RAMP))) * 1000;
  const forTurn = Math.max((1.5 * swings[0] * degS) / (early[1] - early[0]), late ? (1.5 * swings[1] * degS) / (late[1] - late[0]) : 0) * 1000;
  const wanted = Math.max(FLIGHT_MS[0], forZoom, forTurn);
  const ms = Math.round(Math.min(FLIGHT_MOST_MS, wanted) * pace.flight);
  const curve = (x) => {
    const r = travel * glide(x);
    let dir = null;
    if (legs) {
      dir = round.dir(late && x > late[0]
        ? legs[1].at(smooth((x - late[0]) / (late[1] - late[0])))
        : legs[0].at(smooth((x - early[0]) / (early[1] - early[0]))));
    }
    return { pan: Math.min(1, panAt(r) / whole), distance: top / Math.cosh(r + r0), dir };
  };
  const bend = legs && line ? bendRound(hop.body, curve, line, sep, BEND_SHARE * (COMFORT.turnDeg * Math.PI / 180) * (ms / 1000), hop.up) : null;
  const at = (raw) => {
    const x = raw > 0 ? (raw < 1 ? raw : 1) : 0;
    if (x >= 1) return { pan: 1, distance: w1, dir: d1 };
    const p = curve(x);
    return bend ? { ...p, dir: bend(x, p) } : p;
  };
  return { ms, travel, over: Math.max(forZoom, forTurn) / Math.min(FLIGHT_MOST_MS, wanted), swings, bent: bend ? bend.most : 0, at };
}

/**
 * A THIRD BODY ON THE WAY (internal #756; measured 2026-10-14: 3 of 240 random hops put the camera
 * through the Earth, and the rig's keep-out shoved it round, unpaced). The curve knows the two
 * places; the rig knows the world it keeps out of (`hop.body`: its centre from the look-at point the
 * flight leaves, and the keep-out radius). So the plan walks its own curve before the flight, and
 * wherever the camera would come within BODY_AIR of that sphere it BENDS ROUND IT: the side the
 * camera looks from is turned away from the body, round one axis, by just enough. The bend
 * comes on and goes off at a fifth of COMFORT.turn (a tent round each frame that needs it), is
 * nothing at both ends (the two framings are exact) and leaves the distance and the look-at point
 * alone, so the pacing of the scale and the pan is the same flight's.
 *
 * Why a turn and not a higher apex: the camera crosses the Earth while it pulls back from a craft
 * on the near side of it, looking down past its limb; raising the top of the curve pulls it back
 * faster through the same ray. Turning the ray off the globe is the one change that cannot cross.
 *
 * Returns null when nothing on the way needs it, else bend(x, point) -> dir, with `most` the
 * largest turn it adds, radians.
 */
export const BODY_AIR = 0.05;
/**
 * The bend comes on and goes off at this share of COMFORT.turn: the curve's own swing may be turning
 * at the bound in the same seconds, and the two add (measured: a bend at the full rate made 44
 * degrees a second on a hop whose swing was at 24).
 */
export const BEND_SHARE = 0.2;
const BEND_SAMPLES = 1200;
function bendRound(body, curve, line, sep, perX, up) {
  const c = body && body.at;
  const R = Number(body && body.radius);
  if (!c || !(R > 0) || !(perX > 0)) return null;
  const N = BEND_SAMPLES;
  const cross = (a, b) => ({ x: a.y * b.z - a.z * b.y, y: a.z * b.x - a.x * b.z, z: a.x * b.y - a.y * b.x });
  // Rodrigues: v turned by e round a unit axis.
  const turn = (v, axis, e) => {
    const ce = Math.cos(e);
    const se = Math.sin(e);
    const ax = cross(axis, v);
    const ad = dot(axis, v) * (1 - ce);
    return { x: v.x * ce + ax.x * se + axis.x * ad, y: v.y * ce + ax.y * se + axis.y * ad, z: v.z * ce + ax.z * se + axis.z * ad };
  };
  const away = (p) => mix(c, 1, line, -sep * p.pan); // from the look-at point to the body's centre
  const gap = (p, dir) => { const q = mix(away(p), 1, dir, -p.distance); return Math.hypot(q.x, q.y, q.z); };
  // The frames that come too near, with the air each wants: none at the two framings (they are where
  // the app put them), BODY_AIR between, and a step's own length on top (a camera coming down fast
  // crosses a small sphere between two samples).
  const near = [];
  let was = null;
  let worst = null;
  for (let i = 1; i < N; i++) {
    const x = i / N;
    const p = curve(x);
    if (!p.dir) { was = null; continue; }
    const here = mix(line, sep * p.pan, p.dir, p.distance);
    const step = was ? Math.hypot(here.x - was.x, here.y - was.y, here.z - was.z) : 0;
    was = here;
    const S = R * (1 + BODY_AIR * Math.min(1, 10 * x, 10 * (1 - x))) + step;
    const g = gap(p, p.dir);
    if (g >= S) continue;
    near.push({ i, p, S });
    if (!worst || g / S < worst.g) worst = { g: g / S, p, x };
  }
  if (!near.length) return null;
  // ONE AXIS for the whole bend, chosen where the camera comes nearest: it moves the camera off
  // the body square to the way the camera is going past it, toward the side it would miss it on
  // anyway (over it, for a camera headed straight at it). Turned round an axis that follows the body
  // frame by frame, the side swings round when the camera passes the line to the body's centre
  // (measured: 47 degrees a second for a bend of one degree); turned along its own way past, the
  // bend only moves the moment it comes nearest.
  const k = unit(up) || { x: 0, y: 0, z: 1 };
  const at = (x) => { const p = curve(Math.max(0, Math.min(1, x))); return p.dir ? mix(line, sep * p.pan, p.dir, p.distance) : null; };
  const before = at(worst.x - 1 / N);
  const after = at(worst.x + 1 / N);
  const here = mix(at(worst.x) || c, 1, c, -1); // from the body's centre to the camera
  const way = before && after ? unit(mix(after, 1, before, -1)) : null;
  const square = (v) => (way ? unit(mix(v, 1, way, -dot(v, way))) : unit(v));
  const miss = square(here) || square(k) || square({ x: 1, y: 0, z: 0 }) || square({ x: 0, y: 1, z: 0 });
  const dir0 = worst.p.dir;
  const axis = unit(cross(dir0, miss)) || unit(cross(dir0, k)) || { x: 1, y: 0, z: 0 };
  // How far round the axis each frame must turn, at least `from`: the least turn that clears it.
  const clear = (p, S, from) => {
    if (gap(p, turn(p.dir, axis, from)) >= S) return from;
    let lo = from;
    let hi = Math.PI / 2;
    if (gap(p, turn(p.dir, axis, hi)) < S) return hi;
    for (let n = 0; n < 40; n++) { const mid = (lo + hi) / 2; if (gap(p, turn(p.dir, axis, mid)) >= S) hi = mid; else lo = mid; }
    return hi;
  };
  const need = new Float64Array(N + 1);
  for (const f of near) need[f.i] = clear(f.p, f.S, 0);
  // The tent: on and off at most `perX` radians per unit of the flight, never under what is needed,
  // and nothing at the two ends. The tent turns frames that were clear as well, and may turn one
  // into the body: those are asked again, with what they now turn by, until none is.
  const extra = new Float64Array(N + 1);
  const air = new Float64Array(N + 1);
  const frames = [];
  was = null;
  for (let i = 0; i <= N; i++) {
    const p = curve(i / N);
    const here = p.dir ? mix(line, sep * p.pan, p.dir, p.distance) : null;
    const step = was && here ? Math.hypot(here.x - was.x, here.y - was.y, here.z - was.z) : 0;
    was = here;
    frames.push(p);
    air[i] = R * (1 + BODY_AIR * Math.min(1, 10 * (i / N), 10 * (1 - i / N))) + step;
  }
  let most = 0;
  for (let round = 0; round < 6; round++) {
    extra.fill(0);
    for (let j = 1; j < N; j++) {
      if (!(need[j] > 0)) continue;
      const reach = Math.ceil((need[j] / perX) * N);
      for (let i = Math.max(0, j - reach); i <= Math.min(N, j + reach); i++) extra[i] = Math.max(extra[i], need[j] - (perX * Math.abs(i - j)) / N);
    }
    most = 0;
    for (let i = 0; i <= N; i++) {
      extra[i] = Math.max(need[i], Math.min(extra[i], perX * (i / N), perX * (1 - i / N)));
      most = Math.max(most, extra[i]);
    }
    let again = false;
    for (let i = 1; i < N; i++) {
      const p = frames[i];
      if (!p.dir || !(extra[i] > need[i])) continue;
      if (gap(p, turn(p.dir, axis, extra[i])) >= air[i]) continue;
      need[i] = clear(p, air[i], extra[i]);
      again = true;
    }
    if (!again) break;
  }
  const bend = (x, p) => {
    if (!p.dir) return p.dir;
    const f = Math.max(0, Math.min(N, x * N));
    const i = Math.min(N - 1, Math.floor(f));
    const e = extra[i] + (extra[i + 1] - extra[i]) * (f - i);
    return e > 0 ? unit(turn(p.dir, axis, e)) || p.dir : p.dir;
  };
  bend.most = most;
  return bend;
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
 *   bare                                only space: no names, marks, lines or panels at all
 *   calm, steady, brisk                 the pace
 * A word that names nothing is dropped and listed in `notes`. `stored` is what ui/drift.js kept in
 * this browser the last time the options were changed.
 *
 * @returns {{on:boolean, through:string[], realOnly:boolean, tags:boolean, bare:boolean, pace:string, notes:string[]}}
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
  if (typeof s.bare === 'boolean') base.bare = s.bare;
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
    else if (w === 'bare') base.bare = true;
    else if (w === 'nobare') base.bare = false;
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
  if (o.bare === true) words.push('bare');
  if (o.pace && o.pace !== DEFAULTS.pace && PACES[o.pace]) words.push(o.pace);
  return words.length ? words.join(',') : '1';
}
