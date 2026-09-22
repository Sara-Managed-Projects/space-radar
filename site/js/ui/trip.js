// ui/trip.js -- the guided trip: a chain of shots the camera flies, one card per stop.
//
// Contract exports: createTrip(ctx) -> { start(id), play(), stop(reason), next(), back(),
//                                        replay(), pause(reason), resume(), plan(id), tours(),
//                                        onChange(fn), dwellFraction(), currentRecordId(), state }
//
// The trips themselves are DATA: registry/tours.yaml, mirrored into data/tours.js by
// scripts/gen_tours_js.py. Nothing in this file knows about any particular trip, and adding one
// touches no line of it.
//
// ---------------------------------------------------------------------------------------------
// THE ONE RULE THAT PREVENTS THE WORST BUG
//
//     Every phase change goes through schedule(fn), which is requestAnimationFrame plus a
//     generation guard, and every callback the rig or a timer will hand back captures the
//     generation it was issued in. Nothing advances the trip from inside a callback.
//
// Under prefers-reduced-motion -- and for `ms: 0` -- scene/camera.js sets the pose and calls
// onArrive SYNCHRONOUSLY, before flyTo returns. The obvious state machine,
//
//     function goTo(i) { rig.flyTo({ ..., onArrive: () => goTo(i + 1) }); }
//
// is then a plain recursive call chain for those visitors: the whole itinerary runs inside one
// function call, no card is ever painted, the camera lands on the last stop. It fails ONLY for the
// people the accessibility flag exists to protect, so it survives every manual test. `schedule`
// and the generation capture make it structurally impossible. The rig bounds the stack on its
// side too; that is a floor, not a reason to skip this.
//
// Corollary, and it is the same bug wearing a hat: NEVER poll `rig.state.flying` as a guard --
// under reduced motion it is never true. Never poll `rig.state.userInteracting` either: it
// latches, because a wheel event has no matching pointerup.
//
// ---------------------------------------------------------------------------------------------
// EVERY TIMER IS WALL CLOCK, measured with performance.now() deltas and never accumulated from
// per-frame dt. requestAnimationFrame stops while a tab is hidden, so an accumulated dwell would
// silently resume from where it was and a card would sit on screen for however long somebody was
// reading their mail.
//
// THE DWELL IS DERIVED FROM WORD COUNT AND NEVER FROM FLIGHT DURATION. scripts/gen_tours_js.py
// computes it into the mirror. That is what makes it structurally impossible for a change to the
// camera -- including cutting every flight to nothing under reduced motion -- to quietly shorten
// a reader's time. Somebody who asked for less motion often needs MORE time, not less.
//
// ---------------------------------------------------------------------------------------------
// WHERE THE FRAME IS. The letterbox, `html.sr-trip`, the panel going `inert`, the controls, the
// progress row, the ARIA live region and the keyboard bindings are ui/tripframe.js. This file is
// the machine; that one is what a visitor sees of it. The seam between them is deliberately
// narrow: `state`, `onChange(fn)`, and the same methods a console can call. The frame reads and
// never writes, so a browser check can drive the trip with the frame absent -- which is how every
// measurement in this file's history was taken.

import * as THREE from '../../vendor/three.module.min.js';
import { TOURS } from '../data/tours.js';
import { propagate } from '../propagate/index.js';
import { stage } from '../scene/stage.js';
import { WORLDS, positionOf, compressesFrom } from '../scene/worlds.js';
import { showCard, hideCard } from './cards.js';
import { COPY, t } from '../copy/en.js';

const DEG = Math.PI / 180;

// A layer that has not landed in this long is a layer the trip stops waiting for. Layers load in
// a sequential await loop and the eleven-thousand-object catalogue is in it, so a first visit can
// be slow; the deadline is per layer and the resolution runs before the count is shown.
const LAYER_DEADLINE_MS = 8000;

// The shot, in numbers. Every one of these has a reason in the design and the reason is the
// comment; the values live here rather than in the registry because they are the house style of
// the camera and not a property of any trip.
const FLIGHT_MIN_MS = 1500;
const FLIGHT_MAX_MS = 6000;
const FLIGHT_BASE_MS = 1200;
const FLIGHT_LOG_MS = 550; // per doubling, both of distance ratio and of lateral separation
// Above three seconds a cubic ease is nearly stationary at both ends and blurs through the
// middle. Celestia's `goto` ships a trapezoid for the same reason.
const CRUISE_ABOVE_MS = 3000;
// TARGET_DELAY freezes the look-at for the first third of a flight, which keeps the world you are
// leaving in shot. That is right on a long move and wrong on a close one, where the subject walks
// off the side of the frame and back.
const TARGET_DELAY_APEX = 0.34;
const TARGET_DELAY_NEAR = 0.1;
// Two stops far apart sideways otherwise sweep across at close range: a smear, not a shot. The
// second trigger is scene/camera.js's own clearWorld maths, so occlusion and the smear are one fix.
const APEX_SEPARATION = 1.5;
const APEX_CLEARANCE = 1.05;
const APEX_AT = 0.45;
const APEX_SCALE = 0.9;

const SETTLE_MS = 150;
const DRIFT_LEAD_MS = 400;
// The stop's TITLE arrives six tenths of the way through the flight and its body only once the
// camera is at rest. The title answers "where am I going?" and takes the loss-of-control feeling
// out of a four-second move; the body waits because reading during camera motion is both hard and
// a vestibular problem. Under reduced motion there is no flight to be six tenths of the way
// through, and the two arrive together.
const TITLE_AT = 0.6;
// The same number scripts/gen_tours_js.py uses to compute `estimate_ms`, and it has to be, or the
// length a row promises and the length the generator wrote into the mirror are two numbers.
const FLIGHT_ESTIMATE_MS = 3200;
// A tab switch is not a signal about the trip, which is why this one resumes on its own and a
// pause caused by the visitor's own hand does not.
const HIDDEN_RESUME_MS = 600;
// At 36000x an orbit of the station is 0.15 s of real time and `follow` keeps the camera locked
// on: the object whips around the planet and that is not a shot. Anything at or below a minute a
// second is left exactly as the visitor set it.
const CLOCK_RATE_CEILING = 60;

/**
 * The one flight the rig cannot be asked for: an angle chosen so the Sun is three-quarter BEHIND
 * the subject. 108 candidates, once per stop, and the cost is nothing.
 *
 * `framingAngles` in the rig is a GEOMETRY rule -- put the world behind the object. This is a
 * PHOTOGRAPHY rule, and it is the single largest visual difference between this and every other
 * viewer in the genre: a lit rim on a toon silhouette against a black sky.
 *
 * The three candidate co-latitudes are 59, 76 and 90 degrees, which is why there is no separate
 * arrival clamp: near the pole azimuth spins wildly, and none of these is near the pole. The
 * rig's own EPS_POLAR clamp is a NaN guard that legitimate app flights rely on and is left alone.
 */
const KEY_LIGHT_POLARS = [Math.PI * 0.33, Math.PI * 0.42, Math.PI * 0.5];
const KEY_LIGHT_STEPS = 36;
const KEY_LIGHT_TURN_WEIGHT = 0.35;
// A stop's `behind:` world: how far off the middle of the frame it may sit and still be in the
// picture. Half the camera's vertical field of view is 22.5 degrees (scene/renderer.js), and at
// that the backdrop's CENTRE is on the frame's edge with half its disc outside: measured at 22,
// Neptune came out cut in half by the top of the frame behind Triton. 16 leaves a quarter of the
// frame's height under it. BACKDROP_CLEAR is how far outside the subject's own disc it is kept,
// because exactly behind is hidden behind.
const BACKDROP_MAX_OFF_AXIS = 16 * DEG;
const BACKDROP_CLEAR = 3 * DEG;
const BACKDROP_RINGS = 3;
const BACKDROP_STEPS = 24;

/**
 * A subject standing ON a world -- a landing site, a golf ball, a photograph in the dust -- is
 * inside the clearance shell itself, so `blocked` (is the CAMERA inside the shell?) cannot see the
 * case that matters for it: a camera well outside the Moon, looking at the site THROUGH the Moon.
 * Found 2026-09-22 by tests/test_moon_trip.mjs, which runs this machine: at the Moon trip's first
 * stop the key light chose a direction 8.4 degrees below Surveyor 1's horizon, 900 km out, and
 * the drift then carried it to 31 degrees below -- about 500 km of Moon between the camera and the
 * lander. So a ground subject is seen from at least this high above its own horizon, at every
 * point of the drift the dwell will run.
 *
 * AND ITS SKY IS UP. The rig's "up" is the scene's north, so a site in the southern hemisphere was
 * framed with its ground across the top of the screen and the lander hanging from it (headless
 * Chrome, Chang'e 4, the same day). For a ground stop the trip turns the camera's up to the site's
 * own vertical, through the flight (see `upTween`), and chooses among these co-latitudes FROM that
 * vertical: 54, 41, 31 and 14 degrees above the horizon, the ground below and the sky above, and
 * the drift circles the lander at the height it arrived.
 */
const GROUND_MIN_ELEVATION = 10 * DEG;
const GROUND_POLARS = [Math.PI * 0.2, Math.PI * 0.27, Math.PI * 0.33, Math.PI * 0.42];
const GROUND_ARC_SAMPLES = 5;
// A subject is on the ground when it is this close to its world's surface: from 0.9 of the radius
// (a site is at 1.0, and nothing flies below it) up to the key light's own clearance. The world's
// own centre, a `world:` stop, is not.
const GROUND_BAND = [0.9, APEX_CLEARANCE];

function shortestAngle(from, to) {
  let d = (to - from) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d <= -Math.PI) d += Math.PI * 2;
  return d;
}

function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

function isNum(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

const worldById = new Map(WORLDS.map((w) => [w.id, w]));

/**
 * A world's system: its parent when that is not the Sun, and itself otherwise. The same rule as
 * scene/worlds.js `sameSystem`, which decides what that file draws true, read here to decide what
 * this one may point the camera at.
 */
function systemOf(id) {
  const w = worldById.get(id);
  return w && w.parent && w.parent !== 'sun' ? w.parent : id;
}

/** Which world is the occluder for a record: the one its frame is named after. */
function worldOfFrame(frame) {
  const head = String(frame || '').split('-')[0];
  return worldById.has(head) ? head : 'earth';
}

export function createTrip(ctx) {
  const rig = ctx.cameraRig;

  // Exposed on window.spaceRadar.trip. The frame reads it; so does a browser check, which is the
  // house rule and the only way anybody verifies a camera move.
  const state = {
    phase: 'idle',
    tourId: null,
    tourTitle: null,
    stopId: null,
    stopTitle: null,
    index: -1,
    count: 0,
    estimateMs: 0,
    generation: 0,
    pausedBy: null,
    pacing: 'auto',
    reducedMotion: false,
    clockClamped: false,
    // Whether this trip has moved the map's centre. The frame reads it, because leaving then puts
    // the centre back and the camera CANNOT stay where it is: one unit is a different distance
    // there. Every "the camera stays where it is" line in copy/en.js has a second version for it.
    stageChanged: false,
    dropped: [],
    held: null,
    reason: null,
  };

  // The frame subscribes; so can a browser check. Every phase change ends in notify(), so nothing
  // that draws the trip has to poll for one -- the segment fill is the only thing that does, and
  // it polls a number rather than a state.
  const listeners = new Set();
  function onChange(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function notify() {
    for (const fn of [...listeners]) {
      try {
        fn(state);
      } catch {
        /* a listener must never stop the trip */
      }
    }
  }

  let gen = 0;
  let run = null;
  let timers = [];
  let ticking = false;
  let driftRun = null;
  let pausedDuring = null;
  let lastRecord = null;
  // THE TWO TIMES THE TRIP MOVES THE MAP'S CENTRE ITSELF, and the `sr:stage` listener at the foot
  // of this file must sit still for both: it exists for a stage change NOBODY in the trip asked
  // for, and answering the trip's own would re-fly the stop being left, in the new stage's units.
  // `leaving` covers stop() tearing the trip down; `switching` covers a stop arriving on its own
  // stage (enterStage) and the trip's stage on begin.
  let leaving = false;
  let switching = false;

  // Which layers have LANDED, as opposed to which are switched on. main.js fires `sr:layer` once
  // per layer whether it loaded rows or failed, so this is the honest answer to "has that layer
  // finished trying?" -- and a layer that landed empty must not make a trip wait eight seconds
  // for an event that has already been and gone.
  const landed = new Set();
  const onLayer = (e) => {
    const d = e && e.detail;
    if (d && d.id) landed.add(d.id);
  };
  if (typeof window !== 'undefined') window.addEventListener('sr:layer', onLayer);

  // --- the generation guard ---------------------------------------------------------------

  function schedule(fn) {
    const mine = gen;
    const go = () => {
      if (mine === gen) fn();
    };
    if (typeof requestAnimationFrame === 'function') requestAnimationFrame(go);
    else setTimeout(go, 0);
  }

  /** Wrap a callback the rig will hand back so a superseded generation cannot act. */
  function guarded(fn) {
    const mine = gen;
    return (...args) => {
      if (mine !== gen) return;
      fn(...args);
    };
  }

  // --- wall-clock timers ------------------------------------------------------------------

  function after(ms, fn) {
    const timer = { dueAt: now() + ms, fn, gen, remaining: null };
    timers.push(timer);
    startTicking();
    return timer;
  }

  // Wall clock, and only wall clock. Never an accumulated per-frame dt: requestAnimationFrame
  // stops while a tab is hidden, and a dwell accumulated from dt would resume from where it was
  // and leave a card sitting on screen for as long as somebody was reading their mail.
  function now() {
    return performance.now();
  }

  function clearTimers() {
    timers = [];
  }

  function holdTimers() {
    const n = now();
    for (const timer of timers) timer.remaining = Math.max(0, timer.dueAt - n);
  }

  function releaseTimers() {
    const n = now();
    for (const timer of timers) {
      if (timer.remaining !== null) {
        timer.dueAt = n + timer.remaining;
        timer.remaining = null;
      }
    }
  }

  function startTicking() {
    if (ticking || typeof requestAnimationFrame !== 'function') return;
    ticking = true;
    requestAnimationFrame(tick);
  }

  function tick() {
    if (!run) {
      ticking = false;
      timers = [];
      return;
    }
    requestAnimationFrame(tick);
    stepUpTween();
    // A timer from a superseded generation is dropped rather than fired: a user-initiated jump
    // must not be overtaken by the dwell of the stop it left.
    timers = timers.filter((timer) => timer.gen === gen);
    if (state.phase === 'paused') return;
    const n = now();
    const due = timers.filter((timer) => timer.remaining === null && timer.dueAt <= n);
    if (!due.length) return;
    timers = timers.filter((timer) => due.indexOf(timer) === -1);
    for (const timer of due) timer.fn();
  }

  // --- resolution -------------------------------------------------------------------------

  function tourById(id) {
    return TOURS.find((tour) => tour.id === id) || null;
  }

  function waitForLayer(id) {
    if (!id || landed.has(id)) return Promise.resolve(landed.has(id));
    if (typeof window === 'undefined') return Promise.resolve(false);
    return new Promise((resolve) => {
      let done = false;
      const finish = (ok) => {
        if (done) return;
        done = true;
        window.removeEventListener('sr:layer', listen);
        resolve(ok);
      };
      const listen = (e) => {
        const d = e && e.detail;
        if (d && d.id === id) finish(true);
      };
      window.addEventListener('sr:layer', listen);
      setTimeout(() => finish(false), LAYER_DEADLINE_MS);
    });
  }

  function recordSubject(record) {
    if (!record) return null;
    return {
      kind: 'record',
      id: record.id,
      name: record.name || record.id,
      record,
      layerId: record.layer,
      worldId: worldOfFrame(record.frame),
      radiusKm: null,
      position(tMs) {
        const p = propagate(record, tMs);
        if (!p) return null;
        return stage.toScene(p, p.frame, tMs);
      },
    };
  }

  function worldSubject(id) {
    const w = worldById.get(id);
    if (!w) return null;
    return {
      kind: 'world',
      id,
      name: w.display,
      record: null,
      layerId: null,
      worldId: id,
      radiusKm: w.radiusKm,
      position(tMs) {
        const p = positionOf(id, tMs);
        if (!p) return null;
        return stage.toScene(p, p.frame, tMs);
      },
    };
  }

  function pickFromLayer(target) {
    const records = ctx.recordsFor(target.layer) || [];
    if (target.catalog !== undefined && target.catalog !== null) {
      const wanted = String(target.catalog).replace(/^0+/, '');
      return (
        records.find((r) => {
          const n = r.noradId ?? r.catalogueNumber ?? (r.meta && r.meta.noradId);
          return n !== undefined && n !== null && String(n) === wanted;
        }) || null
      );
    }
    const q = target.query || {};
    const matches = records.filter((r) => {
      if (q.name_contains) {
        return String(r.name || '').toUpperCase().includes(String(q.name_contains).toUpperCase());
      }
      return false;
    });
    if (!matches.length) return null;
    return target.pick === 'last' ? matches[matches.length - 1] : matches[0];
  }

  /**
   * A world's own RECORD -- `saturn`, `titan`, the rows of the worlds layer -- named by
   * `target: {record: ...}`. It is flown to as the world it is: framed by its radius, kept out of
   * by its own sphere, placed where scene/worlds.js draws it. recordSubject() would answer
   * `worldId: 'sun'` for every one of them (their frame is sun-inertial) and no radius, so Titan
   * would be framed at a layer's default distance with the Sun as the only thing the camera must
   * not enter. The record is kept, and that is the reason to name one rather than a `world:`:
   * paintCard() selects it, so the world's own card, with the pages its facts were read from,
   * opens under the stop's words.
   */
  function worldRecordSubject(record) {
    if (!record || record.klass !== 'world' || !worldById.has(record.id)) return null;
    const subject = worldSubject(record.id);
    return { ...subject, kind: 'record', name: record.name || subject.name, record, layerId: record.layer };
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (target.record) {
      const record = ctx.recordById(target.record);
      return worldRecordSubject(record) || recordSubject(record);
    }
    if (target.site) return recordSubject(ctx.recordById(target.site));
    if (target.world) return worldSubject(target.world);
    if (target.layer) return recordSubject(pickFromLayer(target));
    return null;
  }

  /**
   * Resolve every stop BEFORE anything is shown, so "5 stops, about two minutes" is a statement
   * rather than a hope. A stop that cannot resolve is dropped here and the count is taken after.
   */
  async function resolveTour(tour) {
    const needed = new Set();
    for (const id of tour.requires || []) needed.add(id);
    for (const stop of tour.stops) {
      if (stop.needs_layer) needed.add(stop.needs_layer);
      if (stop.target && stop.target.layer) needed.add(stop.target.layer);
    }
    await Promise.all([...needed].map(waitForLayer));

    const stops = [];
    const dropped = [];
    for (const stop of tour.stops) {
      const subject = resolveTarget(stop.target);
      if (subject) {
        stops.push({ stop, subject, held: false });
      } else if (stop.on_unresolved === 'hold') {
        // Kept on purpose, and it never auto-advances: a failure that scrolls past is a failure
        // nobody can report. No shipped stop asks for this today.
        stops.push({ stop, subject: null, held: true });
      } else {
        dropped.push({ id: stop.id, title: (stop.card || {}).title || stop.id });
      }
    }
    return { tour, stops, dropped, layers: [...needed] };
  }

  /**
   * How long the trip that is actually going to run will take, over the stops that actually
   * resolved -- which is the only number a visitor may be shown, because the trip they are
   * offered is not always the trip the file describes.
   */
  function estimateOf(stops) {
    return stops.reduce(
      (sum, entry) => sum + entry.stop.dwell_ms + SETTLE_MS + FLIGHT_ESTIMATE_MS,
      0,
    );
  }

  /**
   * What a trip would do if you started it now: the resolved stops, what was dropped and why, and
   * whether it can be offered at all. The panel prints this; so does a browser check.
   */
  async function plan(id) {
    const tour = tourById(id);
    if (!tour) return null;
    const resolved = await resolveTour(tour);
    const count = resolved.stops.length;
    const enough = count >= (tour.min_stops || 3);
    const estimate = estimateOf(resolved.stops);
    return {
      id: tour.id,
      title: tour.title,
      blurb: tour.blurb,
      count,
      dropped: resolved.dropped,
      estimateMs: estimate,
      offerable: enough,
      // Greyed WITH ITS REASON, never hidden: a missing feature and a broken one look identical
      // when you hide one, and the visitor cannot tell which they are looking at.
      reason: enough
        ? null
        : t(COPY.trip.notEnoughStops, { count, min: tour.min_stops || 3, title: tour.title }),
    };
  }

  // --- the shot ---------------------------------------------------------------------------

  const _sun = new THREE.Vector3();
  const _u = new THREE.Vector3();
  const _b1 = new THREE.Vector3();
  const _b2 = new THREE.Vector3();
  const _b3 = new THREE.Vector3();
  const _toTarget = new THREE.Vector3();
  const _up = new THREE.Vector3();
  const _arc = new THREE.Vector3();
  const _savedUp = new THREE.Vector3();
  const _uq = new THREE.Quaternion();
  const _uqk = new THREE.Quaternion();
  const _q = new THREE.Quaternion();
  const _qi = new THREE.Quaternion();
  const Y_UP = new THREE.Vector3(0, 1, 0);

  /** The rig's own offset direction for an azimuth and co-latitude, in scene axes. */
  function offsetDirection(az, polar, out) {
    const sinPhi = Math.sin(polar);
    return out
      .set(sinPhi * Math.sin(az), Math.cos(polar), sinPhi * Math.cos(az))
      .applyQuaternion(_qi);
  }

  function syncUpBasis() {
    _up.copy(ctx.camera.up).normalize();
    _q.setFromUnitVectors(_up, Y_UP);
    _qi.copy(_q).invert();
  }

  /** scene/camera.js clearWorld, asked the other way round: would the world be in the way? */
  function blocked(targetScene, u, d, worldCentre, radius) {
    if (!(radius > 0)) return false;
    _toTarget.copy(targetScene).sub(worldCentre);
    const b = u.dot(_toTarget);
    const c = _toTarget.lengthSq() - radius * radius;
    const disc = b * b - c;
    if (disc < 0) return false;
    const root = Math.sqrt(disc);
    return d > -b - root && d < -b + root;
  }

  function sunScene(tMs) {
    const p = positionOf('sun', tMs);
    if (!p) return null;
    return stage.toScene(p, p.frame, tMs);
  }

  /**
   * Is a subject on the ground seen from above its horizon, by GROUND_MIN_ELEVATION, from this
   * co-latitude at every azimuth of the arc az +- driftRad the dwell may turn through? The drift
   * keeps the co-latitude and turns the azimuth (scene/camera.js orbit), so sampling the arc is
   * the whole of the test.
   */
  function seesGround(az, polar, driftRad, normal) {
    const floor = Math.sin(GROUND_MIN_ELEVATION);
    const n = driftRad > 0 ? GROUND_ARC_SAMPLES : 1;
    for (let k = 0; k < n; k += 1) {
      const a = n > 1 ? az + driftRad * ((2 * k) / (n - 1) - 1) : az;
      if (offsetDirection(a, polar, _arc).dot(normal) < floor) return false;
    }
    return true;
  }

  /** The 36 azimuths at each of the co-latitudes this stop may be seen from. */
  function gridCandidates(polars) {
    const out = [];
    for (const polar of polars) {
      for (let i = 0; i < KEY_LIGHT_STEPS; i += 1) {
        out.push({ azimuth: (i * Math.PI * 2) / KEY_LIGHT_STEPS, polar });
      }
    }
    return out;
  }

  /**
   * The directions that put `backdrop` in the picture: a cone of them, around the one direction
   * that would put it exactly behind the subject.
   *
   * IT CANNOT BE A FILTER ON THE GRID ABOVE, and the numbers say why. The grid's three
   * co-latitudes are 59, 76 and 90 degrees from the scene's north, which is the ecliptic pole, and
   * a moon does not orbit in the ecliptic: measured over four dates, Titan's direction to Saturn
   * was 131 degrees from the nearest direction the grid offers, Neptune's from Triton 73, Charon's
   * from Pluto 99. Filtering the grid left nothing to choose from at half the stops.
   *
   * So the rings are measured from the backdrop itself. `minOff` keeps it clear of the subject's
   * own disc -- exactly behind means hidden behind -- and BACKDROP_MAX_OFF_AXIS keeps it inside
   * the frame; the ring the light likes best wins.
   */
  function backdropCandidates(backdrop, minOff) {
    const out = [];
    _b1.copy(backdrop).multiplyScalar(-1); // the camera sits opposite the backdrop
    _b2.copy(ctx.camera.up).normalize();
    if (Math.abs(_b2.dot(_b1)) > 0.95) _b2.set(_b1.z, _b1.x, _b1.y);
    _b2.projectOnPlane(_b1).normalize();
    _b3.crossVectors(_b1, _b2).normalize();
    const lo = Math.min(minOff, BACKDROP_MAX_OFF_AXIS - 2 * DEG);
    for (let r = 0; r < BACKDROP_RINGS; r += 1) {
      const tilt = lo + ((BACKDROP_MAX_OFF_AXIS - lo) * r) / (BACKDROP_RINGS - 1);
      for (let i = 0; i < BACKDROP_STEPS; i += 1) {
        const phi = (i * Math.PI * 2) / BACKDROP_STEPS;
        _u.copy(_b1).multiplyScalar(Math.cos(tilt))
          .addScaledVector(_b2, Math.sin(tilt) * Math.cos(phi))
          .addScaledVector(_b3, Math.sin(tilt) * Math.sin(phi));
        // Back into the rig's own two angles: the inverse of offsetDirection().
        _u.applyQuaternion(_q);
        out.push({ azimuth: Math.atan2(_u.x, _u.z), polar: Math.acos(clamp(_u.y, -1, 1)) });
      }
    }
    return out;
  }

  /**
   * THE STANDING POINT, and three things can constrain it.
   *
   * @param {number} driftRad the arc the dwell will turn through, so a ground subject stays in
   *   sight all the way round it.
   * @param {?THREE.Vector3} groundUp the vertical of a subject standing ON a world: the search
   *   runs in that basis, only from co-latitudes above its horizon, and the camera arrives with it
   *   as its up (the Moon trip).
   * @param {?THREE.Vector3} backdrop unit vector from the subject toward the world the stop asked
   *   to keep in the picture (`behind:`), or null (the trip out past Jupiter).
   * @param {number} subjectRad the subject's own angular radius from this distance, so a backdrop
   *   is not placed exactly behind it and hidden by it.
   */
  function keyLightAngles(targetScene, d, worldCentre, radius, sunPos, wantDeg, driftRad, groundUp,
    backdrop, subjectRad) {
    if (!sunPos) return null;
    // A ground stop is chosen in the frame of the site's own vertical, which is the up the camera
    // will have when it arrives. Borrowed for the search and put back: the rig reads camera.up
    // on every frame, and the flight must START in the basis the camera is in now.
    const borrowed = !!groundUp;
    if (borrowed) {
      _savedUp.copy(ctx.camera.up);
      ctx.camera.up.copy(groundUp);
    }
    try {
      syncUpBasis();
      _sun.copy(sunPos).sub(targetScene);
      if (_sun.lengthSq() < 1e-18) return null;
      _sun.normalize();
      const want = Math.cos((wantDeg ?? 125) * DEG);
      // Where the camera is now, seen from the new subject in the frame the search runs in, so
      // the turn penalty prefers the side of the lander the camera is already on.
      let azNow = rig.state.azimuth || 0;
      if (borrowed) {
        _toTarget.copy(ctx.camera.position).sub(targetScene).applyQuaternion(_q);
        if (_toTarget.lengthSq() > 1e-18) azNow = Math.atan2(_toTarget.x, _toTarget.z);
      }
      /** The best-lit direction in a list of candidates, or null when every one of them is out. */
      const pick = (candidates) => {
        let best = null;
        for (const c of candidates) {
          offsetDirection(c.azimuth, c.polar, _u);
          if (blocked(targetScene, _u, d, worldCentre, radius * APEX_CLEARANCE)) continue;
          if (borrowed && !seesGround(c.azimuth, c.polar, driftRad || 0, groundUp)) continue;
          const lit = Math.abs(_u.dot(_sun) - want);
          const turn = Math.abs(shortestAngle(azNow, c.azimuth)) / Math.PI;
          const score = lit + KEY_LIGHT_TURN_WEIGHT * turn;
          if (!best || score < best.score) best = { azimuth: c.azimuth, polar: c.polar, score };
        }
        return best;
      };
      // A stop that named a world to keep behind its subject searches a cone around that direction
      // FIRST; if nothing in the cone survives, the plain search decides and the backdrop is given
      // up rather than the shot.
      let best = backdrop
        ? pick(backdropCandidates(backdrop, (subjectRad || 0) + BACKDROP_CLEAR))
        : null;
      if (!best) best = pick(gridCandidates(borrowed ? GROUND_POLARS : KEY_LIGHT_POLARS));
      // Every candidate blocked is a real case -- low over the night side, with the planet on
      // every side of you. Fall back to the rig's own framingAngles, which is occlusion-free by
      // construction, and accept flat light. This is a CAMERA choice and never goes on the card.
      // On the ground the rig's framing is no fallback -- it is computed in the basis the camera is
      // leaving -- and every candidate is above the horizon, so the only way to have none is a
      // drift wider than the arc can hold: then the side the camera is on, from high up.
      if (!best && borrowed) best = { azimuth: azNow, polar: GROUND_POLARS[0], score: Infinity };
      return best;
    } finally {
      if (borrowed) {
        ctx.camera.up.copy(_savedUp);
        syncUpBasis();
      }
    }
  }

  // --- the sky's way up -------------------------------------------------------------------

  /**
   * THE CAMERA'S UP, TURNED THROUGH THE FLIGHT. A ground stop's angles are chosen from the site's
   * own vertical (keyLightAngles), and the camera must arrive with that vertical as its up or the
   * pose is not the one chosen. Turning it at the start would roll the whole picture in one frame;
   * turning it at the end, once the camera has stopped, would be a second move after the move. So
   * it turns WITH the flight, on the wall clock like every timer here: the rig reads camera.up
   * every frame, both its angles and its basis run continuously from where the camera is to where
   * it is going, and the path between is a smooth one. arrived() makes the last step exact.
   */
  let upTween = null;

  function beginUpTween(to, ms) {
    upTween = { from: ctx.camera.up.clone().normalize(), to: to.clone().normalize(), at: now(), ms };
    stepUpTween();
  }

  function stepUpTween() {
    if (!upTween) return;
    const k = upTween.ms > 0 ? clamp((now() - upTween.at) / upTween.ms, 0, 1) : 1;
    if (k >= 1) {
      settleUp(upTween.to);
      return;
    }
    const e = k * k * (3 - 2 * k);
    _uq.setFromUnitVectors(upTween.from, upTween.to);
    _uqk.identity().slerp(_uq, e);
    ctx.camera.up.copy(upTween.from).applyQuaternion(_uqk).normalize();
  }

  /** Put the up exactly where the stop wants it, and stop turning it. */
  function settleUp(to) {
    upTween = null;
    if (to) ctx.camera.up.copy(to);
  }

  /** The up a shot arrives with: the site's vertical on the ground, the visitor's own elsewhere. */
  function upFor(shot) {
    return (shot && shot.up) || (run && run.savedUp) || null;
  }

  /**
   * The direction from the subject toward the world a stop asked to have behind it, as a unit
   * vector in scene axes, or null when that world is not drawn where this stage would need it.
   *
   * WHY A STOP ASKS. The camera direction is chosen by the key light, which knows about the Sun
   * and nothing else, so Io came out alone in the dark: measured in headless Chrome 2026-09-22,
   * Jupiter's drawn disc sat 198 px above the top of the frame at the first stop of the trip out
   * past Jupiter, on a card that opens "Io goes round Jupiter every 42 hours". The rig has the
   * same rule for a record standing on a world (framingAngles, "put the world behind it") and
   * nothing reached it here, because these angles are given.
   */
  function backdropDir(id, subjectScene, tMs) {
    const w = worldById.get(id);
    if (!w || !subjectScene) return null;
    // Only where both are drawn at their true places: from a stage that squeezes, a moon is drawn
    // around its planet's enlarged disc and the true direction between them is not the drawn one.
    // check_registry.py refuses that pairing in the registry; this is the same rule at runtime.
    if (compressesFrom(stage.worldId) && systemOf(id) !== systemOf(stage.worldId)) return null;
    const p = positionOf(id, tMs);
    const at = p ? stage.toScene(p, p.frame, tMs) : null;
    if (!at) return null;
    const dir = at.sub(subjectScene);
    return dir.lengthSq() > 1e-18 ? dir.normalize() : null;
  }

  /** Which way round the arc turns: toward the light opens the subject up over the dwell. */
  function driftSign(chosenAz, sunPos, targetScene, wantAway) {
    if (!sunPos) return 1;
    syncUpBasis();
    _sun.copy(sunPos).sub(targetScene).normalize().applyQuaternion(_q);
    const azSun = Math.atan2(_sun.x, _sun.z);
    const toward = shortestAngle(chosenAz, azSun) >= 0 ? 1 : -1;
    return wantAway ? -toward : toward;
  }

  function stopDistanceKm(stop, subject) {
    if (isNum(stop.distance_km)) return stop.distance_km;
    if (isNum(subject.radiusKm) && subject.radiusKm > 0) {
      return Math.max(stop.frame_radii * subject.radiusKm, subject.radiusKm * 1.02);
    }
    const layer = ctx.layers.find((l) => l.id === subject.layerId);
    return Math.max(50, ((layer && layer.nearKm) || 2000) * 0.35);
  }

  /**
   * Everything a flight needs, computed in KILOMETRES and converted here, this frame. The trip
   * holds no scene-unit number between frames: `follow` re-aims the destination every tick, and
   * distance is re-derived from km at every stop. A future stage change therefore costs a cut and
   * not a smear -- see the sr:stage listener.
   */
  function composeShot(entry) {
    const tMs = ctx.clock.now();
    const subject = entry.subject;
    const targetScene = subject.position(tMs);
    if (!targetScene) return null;

    const world = worldById.get(subject.worldId) || worldById.get('earth');
    const worldCentreKm = positionOf(world.id, tMs);
    const worldCentre = worldCentreKm
      ? stage.toScene(worldCentreKm, worldCentreKm.frame, tMs)
      : new THREE.Vector3();
    const radius = world.radiusKm / stage.unitKm;

    // Re-teach the rig its world at every stop. main.js does this once, at boot, and nothing
    // subscribes to sr:stage; this is the first module in the app that keeps it current. It is
    // two lines and it is cheap, so it runs unconditionally rather than on a condition that has
    // never yet been true.
    rig.setWorldRadius(radius);
    rig.setWorldCentre(worldCentre);

    const d1 = stopDistanceKm(entry.stop, subject) / stage.unitKm;
    const d0 = Math.max(rig.state.distance || d1, 1e-9);
    const sep = targetScene.distanceTo(rig.state.target);
    const dMax = Math.max(d0, d1);

    const chordBlocked = blocked(
      targetScene,
      _u.copy(rig.state.target).sub(targetScene).normalize(),
      sep,
      worldCentre,
      radius * APEX_CLEARANCE,
    );
    const wantApex = sep > APEX_SEPARATION * dMax || chordBlocked;

    const ms = clamp(
      FLIGHT_BASE_MS +
        FLIGHT_LOG_MS * Math.abs(Math.log2(d1 / d0)) +
        FLIGHT_LOG_MS * Math.log2(1 + sep / Math.max(dMax, 1e-9)),
      FLIGHT_MIN_MS,
      FLIGHT_MAX_MS,
    );

    const sun = sunScene(tMs);
    // The arc the dwell will turn through, so a subject on the ground stays in sight all the way.
    const driftDeg = entry.stop.drift === 'none' ? 0 : Number(entry.stop.drift_deg) || 0;
    // On the ground: a record standing on its world's surface, and its own vertical is the up.
    const fromCentre = targetScene.distanceTo(worldCentre);
    const groundUp = subject.kind === 'record' && radius > 0
      && fromCentre > radius * GROUND_BAND[0] && fromCentre < radius * GROUND_BAND[1]
      ? targetScene.clone().sub(worldCentre).normalize()
      : null;
    const angles = keyLightAngles(
      targetScene,
      d1,
      worldCentre,
      radius,
      sun,
      entry.stop.key_light_deg,
      driftDeg * DEG,
      groundUp,
      entry.stop.behind ? backdropDir(entry.stop.behind, targetScene, tMs) : null,
      isNum(subject.radiusKm) && d1 > 0 ? Math.asin(clamp(subject.radiusKm / stage.unitKm / d1, 0, 1)) : 0,
    );

    const named = entry.stop.ease;
    const ease = !named || named === 'auto' ? (ms > CRUISE_ABOVE_MS ? 'cruise' : 'inout') : named;

    return {
      targetScene,
      distance: d1,
      ms,
      ease,
      targetDelay: wantApex ? TARGET_DELAY_APEX : TARGET_DELAY_NEAR,
      apex: wantApex
        ? { distance: Math.max(sep * APEX_SCALE, dMax), at: APEX_AT }
        : undefined,
      azimuth: angles ? angles.azimuth : undefined,
      polar: angles ? angles.polar : undefined,
      sun,
      chosenAz: angles ? angles.azimuth : null,
      // The up the camera arrives with: the site's vertical on the ground, and the visitor's own
      // up everywhere else, so a trip that leaves the ground turns the sky back the right way.
      up: groundUp,
    };
  }

  // --- the card ---------------------------------------------------------------------------

  /**
   * @param {object} entry the resolved stop
   * @param {boolean} [titleOnly] mid-flight: the stop's TITLE and nothing else, rendered through
   *   the same lead-only path a place-stop uses. Not the whole card with its body hidden by CSS
   *   -- a body a screen reader can read while the camera is still moving is exactly the thing
   *   the k=0.6 rule exists to prevent, and hiding it visually would not hide it from a reader.
   */
  function paintCard(entry, titleOnly) {
    const card = entry.stop.card || {};
    const lead = { title: card.title, body: titleOnly ? null : card.body };
    if (titleOnly) {
      showCard(null, ctx, { lead });
      return;
    }
    const record = entry.subject && entry.subject.record;
    if (record) {
      // The real select: the glyph highlights, `follow` is installed, `sr:select` fires (which is
      // how ui/mobile.js closes the phone drawers for free) -- and its own 900 ms flight is
      // suppressed, because we are already on our way there.
      ctx.select(record, { fly: false });
      lastRecord = record;
      showCard(record, ctx, { lead });
    } else {
      // A stop that is a PLACE rather than an object. There is no record, so there is no card to
      // restyle: the stop's own words are the whole card.
      ctx.deselect();
      lastRecord = null;
      showCard(null, ctx, { lead });
      rig.follow(() => entry.subject.position(ctx.clock.now()));
    }
  }

  // --- the machine ------------------------------------------------------------------------

  /**
   * CENTRE THE MAP WHERE THIS STOP IS SEEN TRUE (2026-09-22, the trip out past Jupiter). A stop may
   * name its own `stage:`; one that does not is flown on its trip's. From Earth's stage the outer
   * planets are drawn nearer and larger and their moons around the enlarged disc (scene/worlds.js
   * VIEW_COMPRESSED, VIEW_WITH_PARENT), so Titan seen from there is a drawing of where Titan is;
   * from Saturn's stage it is at its true place and size. The whole trip cannot simply live on the
   * Sun's stage either: one unit there is a million km, and a moon's vertices, which the world
   * shader places in float32 world space, land on a grid about 120 km wide at Saturn's distance --
   * half of Enceladus's radius (scene/stage.js says why the floating origin exists).
   *
   * Changing the stage moves the camera, because main.js ctx.setStage frames the new stage's
   * world at once. Between two planets that CUT is the honest move: the stop being left is drawn
   * squeezed from the new stage, so the camera, kept where it was in km, would be looking at empty
   * sky where Europa had been. Onto a stage that squeezes nothing -- the Sun's, or a rung of the
   * ladder -- every world is drawn where it truly is, so the camera is put back where it was, in
   * km, and the flight to the next stop starts from the last one: Pluto to Eris is one move, not a
   * jump to the Sun's face and a six-second fall back out.
   * @returns {boolean} whether the stage changed
   */
  function enterStage(id) {
    if (!run || !id || id === stage.worldId || typeof ctx.setStage !== 'function') return false;
    const keep = compressesFrom(id)
      ? null
      : { camera: stage.fromScene(ctx.camera.position), target: stage.fromScene(rig.state.target) };
    let changed = false;
    switching = true;
    try {
      changed = !!ctx.setStage(id);
    } finally {
      switching = false;
    }
    if (!changed) return false;
    run.stageChanged = true;
    state.stageChanged = true;
    if (keep) {
      const tMs = ctx.clock.now();
      const cam = stage.toScene(keep.camera, keep.camera.frame, tMs);
      const target = stage.toScene(keep.target, keep.target.frame, tMs);
      if (cam && target) {
        ctx.camera.position.copy(cam);
        // setTarget re-reads the rig's angles and distance from where the camera now is.
        rig.setTarget(target);
      }
    }
    return true;
  }

  function saveWorld() {
    return {
      radius: rig.state.worldRadius,
      centre: rig.state.worldCentre ? rig.state.worldCentre.clone() : new THREE.Vector3(),
    };
  }

  function saveClock() {
    const c = ctx.clock;
    return { mode: c.mode, rate: c.rate, paused: c.paused, t: c.now() };
  }

  /**
   * Put the clock back the way the trip found it -- and ONLY the parts the trip changed.
   *
   * `movedInstant` is the whole point. `as-found` at a rate the trip did not clamp changes
   * nothing at all, so calling `goTo(saved.t)` on the way out rewinds the app clock by the length
   * of the trip: measured in Chrome at rate 10, scrubbing, the clock advanced 90 012 ms during
   * twelve seconds of trip and then jumped back 89 841 ms the instant Leave was pressed, taking
   * every propagated position on screen with it. Mode, rate and paused are restored either way;
   * the INSTANT is only restored when the trip is the reason it is where it is.
   */
  function restoreClock(saved, movedInstant) {
    if (!saved) return;
    const c = ctx.clock;
    // ORDER MATTERS, because setRate and setPaused both flip live to scrub on the way past.
    if (movedInstant) c.goTo(saved.t);
    c.setRate(saved.rate);
    c.setPaused(saved.paused);
    if (saved.mode === 'live') c.live();
  }

  /** @returns {{clamped: boolean, movedInstant: boolean}} what the trip actually changed. */
  function applyClock(tour, saved) {
    const c = ctx.clock;
    if (tour.clock === 'live') {
      c.live();
      // Only a jump if the visitor was not already live -- live() sets the instant to now.
      return { clamped: false, movedInstant: saved.mode !== 'live' };
    }
    if (tour.clock === 'freeze') {
      c.setPaused(true);
      // A frozen clock is exactly where the trip found it, so putting it back is a no-op and
      // stays true whatever the visitor does next.
      return { clamped: false, movedInstant: !saved.paused };
    }
    // `as-found`, with the one clamp the design argues for: at anything above a minute a second
    // the subject whips around the planet while `follow` holds the camera on it. It is said out
    // loud on the intro card, because silently changing something a visitor set is the same
    // defect as a control that lies about its own state.
    if (c.rate > CLOCK_RATE_CEILING) {
      c.setRate(1);
      return { clamped: true, movedInstant: true };
    }
    // The trip touched nothing. The clock is the visitor's, and it stays theirs.
    return { clamped: false, movedInstant: false };
  }

  function setLayer(id, on) {
    if (!id) return false;
    try {
      if (ctx.isLayerOn(id) === on) return false;
      ctx.setLayerOn(id, on);
      // controls.js repaints its checkbox from this, and ignores an event with no `from` as its
      // own echo. search.js documents the same hazard and the same order; this copies it.
      document.dispatchEvent(
        new CustomEvent('sr:layer-toggle', { detail: { id, on, handled: true, from: 'trip' } }),
      );
      return true;
    } catch {
      return false;
    }
  }

  function begin(resolved) {
    // A trip is a Wonder-moment thing: it flies the free camera between objects. Started from
    // the sky view -- the Now moment's dome, which owns the camera -- the two fought for it.
    // MEASURED 2026-09-08 (the review's top defect): seven seconds into the first flight the
    // camera had not moved, and after Escape it sat 84 million km away with the dome still
    // active. So leave the dome first, through the same door the moment switch uses, and give
    // the renderer one frame to hand the camera back before the first flight is planned.
    if (ctx.skyView && ctx.skyView.active && typeof ctx.setMoment === 'function') {
      ctx.setMoment('wonder');
      return new Promise((resolve) => requestAnimationFrame(() => resolve(begin(resolved))));
    }
    const tour = resolved.tour;
    run = {
      tour,
      stops: resolved.stops,
      flipped: [],
      savedClock: saveClock(),
      savedWorld: saveWorld(),
      savedCamera: rig.saveState ? rig.saveState() : null,
      // The visitor's up, which every stop that is not on the ground turns back to and leaving
      // restores. Ground stops turn it to the site's own vertical (upTween).
      savedUp: ctx.camera.up.clone(),
      savedSelection: ctx.selected ? ctx.selected() : null,
    };
    // A trip may live on another stage (spec 0028 step 8): the stellar rung for a trip to the stars.
    // The stage is saved and switched BEFORE the layers are flipped and the first stop composed, so
    // every distance below is derived in the right unit, and it is put back on leave.
    run.savedStage = stage.worldId;
    if (tour.stage && tour.stage !== stage.worldId && typeof ctx.setStage === 'function') {
      // `switching` for the same reason enterStage() sets it: this is the trip's own stage change,
      // and the sr:stage listener is for one nobody in the trip asked for.
      switching = true;
      try {
        ctx.setStage(tour.stage);
      } finally {
        switching = false;
      }
      run.stageChanged = true;
    }
    state.stageChanged = !!run.stageChanged;
    for (const id of resolved.layers) if (setLayer(id, true)) run.flipped.push(id);
    const clockChange = applyClock(tour, run.savedClock);
    run.clockMovedInstant = clockChange.movedInstant;
    state.clockClamped = clockChange.clamped;

    state.tourId = tour.id;
    state.tourTitle = tour.title;
    state.count = resolved.stops.length;
    state.estimateMs = estimateOf(resolved.stops);
    state.dropped = resolved.dropped;
    state.pacing = pacingFor(tour);
    state.reducedMotion = reducedMotion();
    state.reason = null;
    state.held = null;
    state.index = -1;
    state.stopId = null;
    state.stopTitle = null;

    // THE INTRO IS A PHASE, not a courtesy. It makes the trip a decision rather than an ambush,
    // it states a count that has already been resolved, and -- the reason it is here rather than
    // in the frame -- it is where the mode furniture goes up, so the button a visitor presses to
    // start is inside the frame and not inside the panel that is about to go `inert` under them.
    state.phase = 'intro';
    notify();
    return plannedShape(resolved);
  }

  /** Leave the intro card. The only way into the first flight. */
  function play() {
    if (!run || state.phase !== 'intro') return;
    startTicking();
    goTo(0);
  }

  function plannedShape(resolved) {
    return {
      id: resolved.tour.id,
      title: resolved.tour.title,
      count: resolved.stops.length,
      estimateMs: estimateOf(resolved.stops),
      dropped: resolved.dropped,
    };
  }

  function reducedMotion() {
    try {
      return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch {
      return false;
    }
  }

  /** prefers-reduced-motion FORCES reader pacing: a cut arriving unbidden every twelve seconds is
   * its own kind of assault, and the dwell is not shortened to compensate. */
  function pacingFor(tour) {
    return reducedMotion() ? 'reader' : tour.pacing || 'auto';
  }

  function goTo(i) {
    if (!run) return;
    if (i >= run.stops.length) {
      finish();
      return;
    }
    const index = Math.max(0, i);
    const entry = run.stops[index];
    state.index = index;
    state.stopId = entry.stop.id;
    state.stopTitle = (entry.stop.card || {}).title || entry.stop.id;
    state.generation = gen;
    state.held = null;
    run.dwellTimer = null;
    run.dwellMs = 0;

    if (entry.held) {
      holdAt(entry);
      return;
    }

    // Before the shot is composed, so every distance in it is in the new stage's unit. Back and
    // Next land here too, so a stop is always seen from its own stage whichever way it is reached.
    enterStage(entry.stop.stage || run.tour.stage);

    const shot = composeShot(entry);
    if (!shot) {
      // It resolved and then stopped having a position -- a layer refreshed under us. Same answer
      // as a held stop: stop dead, say so, and wait for a human.
      holdAt(entry);
      return;
    }

    state.phase = 'flight';
    entry.shot = shot;
    // A cut has no flight to turn the up through: it is set first, so the one pose is the chosen
    // one. Otherwise it turns with the flight.
    const cutting = reducedMotion() || !(shot.ms > 0);
    if (cutting) settleUp(upFor(shot));
    rig.flyTo({
      targetScene: shot.targetScene,
      distance: shot.distance,
      azimuth: shot.azimuth,
      polar: shot.polar,
      ms: shot.ms,
      ease: shot.ease,
      targetDelay: shot.targetDelay,
      apex: shot.apex,
      onArrive: guarded((reason) => schedule(() => arrived(index, reason))),
      // A cancelled flight is the visitor's hand on the mouse. onUserInput has already paused the
      // trip; this exists so the rig never has to drop a callback silently.
      onCancel: guarded(() => {}),
    });
    if (!cutting && upFor(shot)) beginUpTween(upFor(shot), shot.ms);

    // The title, six tenths of the way in. Skipped under reduced motion and for a cut, where the
    // arrival above has already happened -- synchronously, before flyTo returned -- and the card
    // is painted whole. A wall-clock timer rather than a camera callback, so it pauses and
    // resumes with everything else the trip is holding.
    if (!reducedMotion() && shot.ms > 0) {
      after(shot.ms * TITLE_AT, () => {
        if (!run || state.phase !== 'flight' || state.index !== index) return;
        paintCard(entry, true);
        notify();
      });
    }
    notify();
  }

  function holdAt(entry) {
    state.phase = 'held';
    state.held = {
      stopId: entry.stop.id,
      title: (entry.stop.card || {}).title || entry.stop.id,
      why: COPY.trip.heldBody,
    };
    const world = worldSubject(worldOfFrame(entry.subject ? entry.subject.record?.frame : 'earth'));
    if (world) {
      const tMs = ctx.clock.now();
      const pos = world.position(tMs);
      if (pos) rig.flyTo({ targetScene: pos, distance: rig.state.distance, ms: FLIGHT_MIN_MS });
    }
    // The card says what happened, in the stop's own place in the trip. A blank card here would
    // be indistinguishable from the app having stopped.
    showCard(null, ctx, { lead: { title: state.held.title, body: state.held.why } });
    // NEVER auto-advance out of a held stop. The visitor presses Next.
    notify();
  }

  function arrived(index, reason) {
    if (!run || state.index !== index || state.phase !== 'flight') return;
    if (reason !== 'done' && reason !== 'skipped') return;
    // A flight collapsed by Next, or slower than the wall clock, ends with the up where it belongs.
    settleUp(upFor(run.stops[index].shot));
    state.phase = 'settle';
    paintCard(run.stops[index]);
    after(SETTLE_MS, () => dwell(index));
    notify();
  }

  function dwell(index) {
    if (!run || state.index !== index) return;
    state.phase = 'dwell';
    const entry = run.stops[index];
    const stop = entry.stop;
    const deg = Number(stop.drift_deg) || 0;
    if (deg > 0 && stop.drift !== 'none') {
      after(DRIFT_LEAD_MS, () => {
        if (!run || state.phase !== 'dwell' || state.index !== index) return;
        const shot = entry.shot || {};
        const sign = driftSign(
          shot.chosenAz ?? rig.state.azimuth,
          shot.sun,
          shot.targetScene || rig.state.target,
          stop.drift === 'away',
        );
        driftRun = { deg: deg * sign, rate: stop.drift_rate_deg_s || 6, at: now() };
        // Under reduced motion the rig refuses the drift and says so; the dwell is untouched.
        rig.orbit({
          deg: driftRun.deg,
          degPerSec: driftRun.rate,
          onDone: guarded(() => {
            driftRun = null;
          }),
        });
      });
    }
    if (state.pacing === 'auto') {
      // Held so the frame can fill one segment over exactly this long, and so that the fill is
      // read from the timer that actually decides when the stop ends rather than from a second
      // clock that would drift away from it the first time somebody paused.
      run.dwellMs = stop.dwell_ms;
      run.dwellTimer = after(stop.dwell_ms, () => advance());
    }
    notify();
  }

  /**
   * How far through the current dwell we are, 0..1, or null when nothing is counting down --
   * which is every reader-paced stop, every flight, and every held stop. Read from the timer that
   * ends the stop, so a pause freezes it for the same reason the stop does not end.
   */
  function dwellFraction() {
    const timer = run && run.dwellTimer;
    if (!timer || !run.dwellMs) return null;
    const left = timer.remaining !== null ? timer.remaining : timer.dueAt - now();
    return clamp(1 - left / run.dwellMs, 0, 1);
  }

  function advance() {
    if (!run) return;
    if (state.index + 1 >= run.stops.length) {
      finish();
      return;
    }
    clearTimers();
    rig.stopOrbit('replaced');
    driftRun = null;
    goTo(state.index + 1);
  }

  function finish() {
    // The camera does NOT move at the end. Returning home throws away what the trip just spent two
    // minutes earning and is a fourth unrequested camera move after the visitor stopped asking
    // for camera moves. It also does not KEEP moving: Next on the last stop lands here mid-sweep,
    // and the end card said "the camera stays where it is" while it flew on.
    clearTimers();
    freezeFlight();
    rig.stopOrbit('done');
    driftRun = null;
    run.dwellTimer = null;
    state.phase = 'outro';
    notify();
  }

  // --- controls ---------------------------------------------------------------------------

  function jump(to) {
    if (!run) return;
    // A user-initiated jump kills every pending callback from the stop being left, including the
    // arrival of the flight we are about to collapse.
    gen += 1;
    state.generation = gen;
    clearTimers();
    rig.stopOrbit('replaced');
    driftRun = null;
    // Exactly a video player's seek: collapse the running flight onto its end state rather than
    // starting a fifth half-finished sweep from wherever the camera happens to be -- and its up
    // with it, or the end state is read in a basis half way round.
    if (upTween) settleUp(upTween.to);
    if (rig.finishFlight) rig.finishFlight();
    state.pausedBy = null;
    pausedDuring = null;
    goTo(clamp(to, 0, run.stops.length - 1));
  }

  function next() {
    if (!run) return;
    if (state.index + 1 >= run.stops.length) {
      gen += 1;
      finish();
      return;
    }
    jump(state.index + 1);
  }

  function back() {
    if (!run) return;
    jump(state.index - 1 < 0 ? 0 : state.index - 1);
  }

  function replay() {
    if (!run) return;
    jump(state.index);
  }

  const PAUSABLE = ['flight', 'settle', 'dwell', 'held'];

  /**
   * END THE RUNNING FLIGHT WHERE IT IS, in one frame and going nowhere.
   *
   * A flight to exactly the present pose, instantly: it supersedes the running flight -- which is
   * told 'replaced' rather than dropped -- and moves the camera not at all, which is the
   * difference between this and finishFlight(). Every exit from a stop needs it, and until this
   * was a function only pause() had it: measured in Chrome, pressing Leave 0.8 s into a flight
   * left `rig.state.flying` true and the camera ran on from 25.7 to 70 995 scene units over the
   * next 2.5 s -- 71 million kilometres of travel after the trip was gone, under an end card
   * that says "the camera stays where it is".
   */
  function freezeFlight() {
    if (!rig.state.flying) return false;
    rig.flyTo({
      targetScene: rig.state.target.clone(),
      distance: rig.state.distance,
      azimuth: rig.state.azimuth,
      polar: rig.state.polar,
      ms: 0,
    });
    return true;
  }

  function pause(reason) {
    // The intro and the end card are not paused, they are WAITED ON: nothing is counting down and
    // nothing is moving, so a hand on the camera during either is just a visitor looking around,
    // and answering it with a "Trip paused" chip would be a control lying about the state.
    if (!run || PAUSABLE.indexOf(state.phase) === -1) return;
    pausedDuring = state.phase;
    state.pausedBy = reason || 'input';
    holdTimers();
    // FREEZE THE FLIGHT WHERE IT IS. Measured in a browser: without this the phase read `paused`
    // while the camera went on flying, because only a POINTER pause stops a flight -- the rig
    // interrupts itself on input, and nothing else does. Every other cause (a hidden tab, and any
    // caller of pause()) left a control lying about the state it controls.
    //
    // A flight to exactly the present pose, instantly. It supersedes the running flight -- which
    // is told 'replaced' rather than dropped -- and moves the camera nowhere, which is the
    // difference between this and finishFlight(): the visitor asked to stop, not to arrive.
    if (pausedDuring === 'flight') freezeFlight();
    // The up stops where it is, with the camera; resuming re-flies the stop and turns it from here.
    upTween = null;
    if (driftRun) {
      const doneDeg = ((now() - driftRun.at) / 1000) * driftRun.rate;
      const left = Math.max(0, Math.abs(driftRun.deg) - doneDeg);
      driftRun = left > 0.5 ? { ...driftRun, deg: Math.sign(driftRun.deg) * left } : null;
    }
    rig.stopOrbit('cancelled');
    state.phase = 'paused';
    notify();
  }

  function resume() {
    if (!run || state.phase !== 'paused') return;
    state.pausedBy = null;
    const was = pausedDuring;
    pausedDuring = null;
    if (was === 'flight' || was === 'held') {
      // Resume flies back to the stop it left, from wherever the visitor moved the camera to.
      jump(state.index);
      return;
    }
    state.phase = was || 'dwell';
    releaseTimers();
    // MEASURED IN A BROWSER: the most likely pause is a visitor tapping something else, and that
    // tap replaces the card with that object's own. Resuming a dwell used to leave it there, so
    // the trip counted down to the next stop while the card on screen was about something else
    // entirely and the stop's words were never read. Resume means "back to the stop", and this is
    // the half of that promise a dwell was not keeping. A flight or a held stop already re-flies.
    const entry = run.stops[state.index];
    if (entry && !entry.held) {
      const wanted = entry.subject && entry.subject.record;
      const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
      const astray = wanted ? !sel || sel.id !== wanted.id : !!sel;
      if (astray) paintCard(entry);
    }
    notify();
    if (driftRun) {
      const remaining = driftRun;
      driftRun = { ...remaining, at: now() };
      rig.orbit({
        deg: remaining.deg,
        degPerSec: remaining.rate,
        onDone: guarded(() => {
          driftRun = null;
        }),
      });
    }
  }

  function stop(reason) {
    if (!run) {
      state.phase = 'idle';
      notify();
      return;
    }
    gen += 1;
    state.generation = gen;
    leaving = true;
    clearTimers();
    // BEFORE anything else, and before `run` is thrown away: leaving must leave the camera where
    // it is, and a flight nobody stopped goes on flying with the frame gone.
    freezeFlight();
    rig.stopOrbit('cancelled');
    driftRun = null;
    // The visitor's up back, the camera kept where it is: sync() re-reads the rig's angles from the
    // camera's position in the restored basis, so only the roll changes.
    upTween = null;
    if (run.savedUp && !ctx.camera.up.equals(run.savedUp)) {
      ctx.camera.up.copy(run.savedUp);
      if (rig.sync) rig.sync();
    }

    for (const id of run.flipped) setLayer(id, false);
    restoreClock(run.savedClock, run.clockMovedInstant);
    const stageLeft = !!(run.stageChanged && run.savedStage && typeof ctx.setStage === 'function');
    if (stageLeft) {
      // Back to the stage the visitor was on. The camera cannot "stay where it is" across a stage
      // change -- the unit changed under it -- so this is the one leave that moves it, and the
      // trip's blurb says so. `leaving`, set at the top of this function, is what keeps the
      // sr:stage listener from re-flying the stop being left in the new stage's units.
      ctx.setStage(run.savedStage);
    } else if (run.savedWorld) {
      rig.setWorldRadius(run.savedWorld.radius);
      rig.setWorldCentre(run.savedWorld.centre);
    }

    const record = lastRecord;
    run = null;
    ticking = false;
    state.phase = 'idle';
    state.tourId = null;
    state.tourTitle = null;
    state.stopId = null;
    state.stopTitle = null;
    state.index = -1;
    state.count = 0;
    state.estimateMs = 0;
    state.clockClamped = false;
    state.stageChanged = false;
    state.pausedBy = null;
    state.held = null;
    state.reason = reason || null;

    // The camera stays EXACTLY where it is, and the card changes identity: the ordinary object
    // card, the glyph highlighted, `follow` installed, `sr:select` fired. Leaving reads as "I
    // arrived here" rather than "I lost something".
    //
    // EXCEPT ACROSS A STAGE CHANGE, where the camera has just been put back at home. Selecting
    // the last stop's subject there installs `follow` on it, and follow moves the camera with its
    // target: MEASURED in headless Chrome, 2026-09-22, leaving the Moon trip at Lunokhod 1 put the
    // map back on the Earth's stage and the camera 414 000 km out, beside the Moon, and leaving
    // the trip out past Jupiter at Voyager 1 would have flown it 170 au, both under a blurb that
    // says leaving brings you back to Earth. There the stop's subject is let go instead -- card,
    // highlight and all -- so home is not left with a selection on a world out of shot.
    if (record && !stageLeft) ctx.select(record, { fly: false });
    else if (record && typeof ctx.deselect === 'function') ctx.deselect();
    else hideCard();
    leaving = false;
    notify();
  }

  function start(id) {
    const tour = tourById(id);
    if (!tour) return Promise.resolve(null);

    if (run && run.tour.id === id) {
      // The same trip again is a RESTART, not a reload: the furniture stays up.
      jump(0);
      return Promise.resolve(plannedShape({ tour, stops: run.stops, dropped: state.dropped }));
    }
    if (run) {
      // A different trip. RESOLVE IT FIRST: tearing the running trip down and then discovering
      // the new one cannot make its minimum destroyed a trip in progress to start one that does
      // not exist -- measured, with CelesTrak unreachable, from the end card's own "Next" button.
      // A refusal now leaves the running trip exactly as it was and says why.
      return resolveTour(tour).then((resolved) => {
        if (!run || run.tour.id === id) return start(id);
        if (resolved.stops.length < (tour.min_stops || 3)) {
          state.reason = t(COPY.trip.notEnoughStops, {
            count: resolved.stops.length,
            min: tour.min_stops || 3,
            title: tour.title,
          });
          notify();
          return { id: tour.id, count: resolved.stops.length, offerable: false, reason: state.reason };
        }
        // Tear the first one down fully, then start the second on the NEXT frame. Never
        // synchronously -- reduced-motion teardown is synchronous and the two would interleave.
        stop('replaced');
        return new Promise((resolve) => {
          schedule(() => resolve(start(id)));
        });
      });
    }

    gen += 1;
    state.generation = gen;
    state.phase = 'resolving';
    state.tourId = tour.id;
    state.tourTitle = tour.title;
    notify();
    const mine = gen;
    return resolveTour(tour).then((resolved) => {
      if (mine !== gen) return null;
      if (resolved.stops.length < (tour.min_stops || 3)) {
        state.phase = 'idle';
        state.tourId = null;
        state.reason = t(COPY.trip.notEnoughStops, {
          count: resolved.stops.length,
          min: tour.min_stops || 3,
          title: tour.title,
        });
        notify();
        return { id: tour.id, count: resolved.stops.length, offerable: false, reason: state.reason };
      }
      return begin(resolved);
    });
  }

  // --- the world moving under us ----------------------------------------------------------

  // A pointer or a wheel PAUSES the trip. It never exits it. That one line defeats both traps at
  // once: you cannot lose the trip by accident, and you are never captive, because the camera is
  // never locked.
  const offInput = rig.onUserInput
    ? rig.onUserInput(() => {
        if (run && state.phase !== 'paused') pause('input');
      })
    : () => {};

  // rAF stops while hidden, so nothing advances anyway; this makes it explicit and, unlike a
  // pause the visitor caused, it resumes on its own. A tab switch is not an intent signal about
  // the trip.
  const onVisibility = () => {
    if (!run) return;
    if (document.hidden) {
      pause('hidden');
      return;
    }
    if (state.pausedBy !== 'hidden') return;
    const mine = gen;
    setTimeout(() => {
      if (mine === gen && state.pausedBy === 'hidden') resume();
    }, HIDDEN_RESUME_MS);
  };
  if (typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', onVisibility);
  }

  // THE FLOATING ORIGIN. stage.setWorld() is never called anywhere in the app today, so this has
  // never fired -- but the failure it would cause is a 384-unit smear with the clearance sphere
  // centred where the world no longer is, and a cut is the correct degradation. Recompute the
  // current stop from KILOMETRES and put the camera there in one frame.
  const onStage = () => {
    // Not while the trip is moving the centre itself: `leaving` is stop() putting the visitor's
    // stage back, `switching` is a stop arriving on its own (enterStage, and begin).
    if (!run || leaving || switching || state.index < 0) return;
    gen += 1;
    state.generation = gen;
    clearTimers();
    rig.stopOrbit('cancelled');
    if (rig.finishFlight) rig.finishFlight();
    const entry = run.stops[state.index];
    const shot = composeShot(entry);
    if (!shot) return;
    entry.shot = shot;
    settleUp(upFor(shot));
    rig.flyTo({
      targetScene: shot.targetScene,
      distance: shot.distance,
      azimuth: shot.azimuth,
      polar: shot.polar,
      ms: 0,
    });
    const index = state.index;
    state.phase = 'flight';
    schedule(() => arrived(index, 'done'));
  };
  if (typeof window !== 'undefined') window.addEventListener('sr:stage', onStage);

  function dispose() {
    stop('disposed');
    offInput();
    if (typeof window !== 'undefined') {
      window.removeEventListener('sr:layer', onLayer);
      window.removeEventListener('sr:stage', onStage);
    }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibility);
    }
  }

  /** The record the current stop is about, so a select of something else can be told apart from
   * the trip's own select and treated as the visitor finding the thing they actually wanted. */
  function currentRecordId() {
    if (!run || state.index < 0) return null;
    const entry = run.stops[state.index];
    const record = entry && entry.subject && entry.subject.record;
    return record ? record.id : null;
  }

  return {
    start,
    play,
    stop,
    next,
    back,
    replay,
    pause,
    resume,
    plan,
    onChange,
    dwellFraction,
    currentRecordId,
    tours: () => TOURS,
    state,
    dispose,
  };
}
