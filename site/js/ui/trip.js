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
import { WORLDS, positionOf } from '../scene/worlds.js';
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

  function resolveTarget(target) {
    if (!target) return null;
    if (target.record) return recordSubject(ctx.recordById(target.record));
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
  const _toTarget = new THREE.Vector3();
  const _up = new THREE.Vector3();
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

  function keyLightAngles(targetScene, d, worldCentre, radius, sunPos, wantDeg) {
    if (!sunPos) return null;
    syncUpBasis();
    _sun.copy(sunPos).sub(targetScene);
    if (_sun.lengthSq() < 1e-18) return null;
    _sun.normalize();
    const want = Math.cos((wantDeg ?? 125) * DEG);
    const azNow = rig.state.azimuth || 0;
    let best = null;
    for (const polar of KEY_LIGHT_POLARS) {
      for (let i = 0; i < KEY_LIGHT_STEPS; i += 1) {
        const az = (i * Math.PI * 2) / KEY_LIGHT_STEPS;
        offsetDirection(az, polar, _u);
        if (blocked(targetScene, _u, d, worldCentre, radius * APEX_CLEARANCE)) continue;
        const lit = Math.abs(_u.dot(_sun) - want);
        const turn = Math.abs(shortestAngle(azNow, az)) / Math.PI;
        const score = lit + KEY_LIGHT_TURN_WEIGHT * turn;
        if (!best || score < best.score) best = { azimuth: az, polar, score };
      }
    }
    // Every candidate blocked is a real case -- low over the night side, with the planet on every
    // side of you. Fall back to the rig's own framingAngles, which is occlusion-free by
    // construction, and accept flat light. This is a CAMERA choice and never goes on the card.
    return best;
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
    const angles = keyLightAngles(
      targetScene,
      d1,
      worldCentre,
      radius,
      sun,
      entry.stop.key_light_deg,
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
    const tour = resolved.tour;
    run = {
      tour,
      stops: resolved.stops,
      flipped: [],
      savedClock: saveClock(),
      savedWorld: saveWorld(),
      savedCamera: rig.saveState ? rig.saveState() : null,
      savedSelection: ctx.selected ? ctx.selected() : null,
    };
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

    const shot = composeShot(entry);
    if (!shot) {
      // It resolved and then stopped having a position -- a layer refreshed under us. Same answer
      // as a held stop: stop dead, say so, and wait for a human.
      holdAt(entry);
      return;
    }

    state.phase = 'flight';
    entry.shot = shot;
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
    // starting a fifth half-finished sweep from wherever the camera happens to be.
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
    clearTimers();
    // BEFORE anything else, and before `run` is thrown away: leaving must leave the camera where
    // it is, and a flight nobody stopped goes on flying with the frame gone.
    freezeFlight();
    rig.stopOrbit('cancelled');
    driftRun = null;

    for (const id of run.flipped) setLayer(id, false);
    restoreClock(run.savedClock, run.clockMovedInstant);
    if (run.savedWorld) {
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
    state.pausedBy = null;
    state.held = null;
    state.reason = reason || null;

    // The camera stays EXACTLY where it is, and the card changes identity: the ordinary object
    // card, the glyph highlighted, `follow` installed, `sr:select` fired. Leaving reads as "I
    // arrived here" rather than "I lost something".
    if (record) ctx.select(record, { fly: false });
    else hideCard();
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
    if (!run || state.index < 0) return;
    gen += 1;
    state.generation = gen;
    clearTimers();
    rig.stopOrbit('cancelled');
    if (rig.finishFlight) rig.finishFlight();
    const entry = run.stops[state.index];
    const shot = composeShot(entry);
    if (!shot) return;
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
