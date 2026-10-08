// ui/trip.js -- the guided trip: a chain of shots the camera flies, one card per stop.
//
// Contract exports: createTrip(ctx) -> { start(id), play(), stop(reason), next(), back(),
//                                        replay(), jumpTo(index), pause(reason), resume(),
//                                        plan(id), tours(), onChange(fn), dwellFraction(),
//                                        holdDwell(ms), currentRecordId(), state }
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
// WHERE THE FRAME IS. The intro and the end, the toolbar, the top bar, the rail and the pill going
// `inert`, the ARIA live region and the keyboard bindings are ui/tripframe.js. This file is
// the machine; that one is what a visitor sees of it. The seam between them is deliberately
// narrow: `state`, `onChange(fn)`, and the same methods a console can call. The frame reads and
// never writes, so a browser check can drive the trip with the frame absent -- which is how every
// measurement in this file's history was taken.

import * as THREE from '../../vendor/three.module.min.js';
import { TOURS } from '../data/tours.js';
import { idleTripState } from './tripstate.js';
import { propagate } from '../propagate/index.js';
import { fixed } from '../propagate/fixed.js';
import { stage, isLadderStage, isSystemStage } from '../scene/stage.js';
import { WORLDS, positionOf, compressesFrom } from '../scene/worlds.js';
import { showCard, hideCard, seeItLine, refreshLeadNote } from './cards.js';
import { write as writeUrl, clear as clearUrl } from './urlstate.js';
import { nextEvent } from '../data/events.js';
import { guessObserver } from '../sky/guessplace.js';
import { SELECTED_PX } from '../scene/heroes.js';
import { lookTarget, tonightMs, deepNightMs, midnightMs, planetTonight, showerMoon } from '../sky/lookfor.js';
import { nextShower } from '../sky/radiants.js';
import { SHOWERS } from '../data/showers.js';
import { azimuthInWords, altitudeInWords } from '../sky/skyview.js';
import { COPY, CITIES, UNITS, t, fmt, timeText } from '../copy/en.js';
import { CHAIN } from '../scene/handoff.js';

const DEG = Math.PI / 180;

// A STOP THAT LOOKS AT THE SKY (2026-10-05, `target: {sky: [ra, dec]}`). The camera stands where
// the Sun is and looks out along a direction, so what is on screen is the sky as it is seen from
// Earth (the two are 8 light-minutes apart; no star moves by a pixel). The rig is an orbit camera
// and needs a point to look at: one SKY_NEAR_KM out along the direction, with the camera
// SKY_STAND of the way back, which puts it a little in front of the Sun and the Sun behind it.
// Sixty au keeps every flight between two such stops inside 500 au, where registry/lod.yaml
// still draws the sky sphere, so a turn from Orion to the Plough is a turn and never a journey.
// With `depth_ly` the point is that far out for real, and the stop's `distance_km` and
// `aside_deg` put the camera off the line from the Sun: the figures come apart.
const SKY_NEAR_KM = 60 * 149597870.7;
const SKY_STAND = 0.98;
const LY_KM = 9460730472580.8;
const SUN_FRAME = 'sun-inertial';
// Equatorial J2000 -> ecliptic J2000 (the stage's sun-inertial), the IAU 1976 obliquity.
const COS_OBLIQUITY = Math.cos(23.4392911 * DEG);
const SIN_OBLIQUITY = Math.sin(23.4392911 * DEG);

// The phases in which the trip IS at a stop, so the address bar may say which (spec 0032 req 3).
// The intro names the trip alone; `resolving`, `outro` and `idle` write nothing new.
const STOP_PHASES = ['veil', 'flight', 'settle', 'dwell', 'held', 'paused'];

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
// `framing: sunrise` (internal #313): how far behind the limb the Sun's centre starts, and the
// nearest the camera's co-latitude may come to the rig's pole (where an azimuth turn is a spin).
// scripts/check_registry.py holds the same two degrees: a sunrise stop's drift must carry the Sun
// out by at least as much again.
export const SUNRISE_HIDDEN_DEG = 2;
const SUNRISE_POLAR_MIN = 25 * (Math.PI / 180);
// `true_size: true` (internal #290): how long after the card is up the dots are put away, and how
// long they take to go (the guide's --sr-slow, as ui/scalebadge.js TWEEN_MS).
const TRUE_SIZE_LEAD_MS = 1600;
const TRUE_SIZE_TWEEN_MS = 320;
const TRUE_SIZE_REFRESH_MS = 500;
// scene/orbitrings.js MARKER_PX: the dot's width, which the line's "how wide really" is set against
// (tests/test_small_issues.mjs holds the two equal; the module is not imported here for one number).
const TRUE_SIZE_MARKER_PX = 7;
// The stop's TITLE arrives six tenths of the way through the flight and its body only once the
// camera is at rest. The title answers "where am I going?" and takes the loss-of-control feeling
// out of a four-second move; the body waits because reading during camera motion is both hard and
// a vestibular problem. Under reduced motion there is no flight to be six tenths of the way
// through, and the two arrive together.
const TITLE_AT = 0.6;
// A `climb: true` stop (internal #305, #410): how long each factor of ten of distance takes, and
// the shortest and longest such flight. Slower than the ladder's own control (900 ms a decade): a
// trip's flight is watched, and a rung is read as it goes by.
const CLIMB_MS_PER_DECADE = 1700;
const CLIMB_MIN_MS = 3000;
const CLIMB_MAX_MS = 9000;
// The same number scripts/gen_tours_js.py uses to compute `estimate_ms`, and it has to be, or the
// length a row promises and the length the generator wrote into the mirror are two numbers.
const FLIGHT_ESTIMATE_MS = 3200;
// A tab switch is not a signal about the trip, which is why this one resumes on its own and a
// pause caused by the visitor's own hand does not.
const HIDDEN_RESUME_MS = 600;
// A FLIGHT ENDS INSIDE ITS OWN TIME PLUS THIS (internal #322). Its `ms` is wall time; the stop's
// title, its dwell and a reel's watchdog all count wall time. A flight still in the air this long
// after it was due is cut to its end shot, whatever held it: frames too slow for the rig, another
// caller's flight in its place, a callback that never came.
export const FLIGHT_GRACE_MS = 4000;
// How often a stop's flight is flown again after somebody else's flight replaced it, before it cuts.
const REFLY_MAX = 2;
// The way home (`return: true`): slower than a climb between stops, because nothing is read on it,
// and never longer than this whatever the frames cost.
const RETURN_MS_PER_DECADE = 1100;
const RETURN_MAX_MS = 30000;
// At 36000x an orbit of the station is 0.15 s of real time and `follow` keeps the camera locked
// on: the object whips around the planet and that is not a shot. Anything at or below a minute a
// second is left exactly as the visitor set it.
const CLOCK_RATE_CEILING = 60;

// A STOP'S OWN CLOCK (spec 0030). A stop may name the instant it is shown at and the rate the clock
// runs while it is up; scripts/check_registry.py caps both where they are written, and these are
// the same caps again where they run, so a hand-edited mirror or a console call cannot put a
// station under `follow` at a year a minute. 60 on an Earth-orbit subject (CLOCK_RATE_CEILING
// above); 36 000, the top of clock.rates(), on any other subject; up to a million only on the Sun's
// stage or a rung of the ladder, where a world going round the Sun is the picture.
//
// WHAT THE SUN'S STAGE COSTS AT THAT RATE, MEASURED FIRST (spec 0030 task 1, 2026-09-23, headless
// Chrome, `stations` and `visual` on, 363 records in drawn layers): main.js startLoop DOES still
// propagate every drawn glyph layer on the Sun's stage while scrubbing, every frame (25 passes in
// 14 s at the headless frame rate, against the 10 Hz of live 1x). isLayerDrawable() turns a layer
// off only on a rung of the ladder. The cost is 2.3 ms a frame, the median of ten, against 3.5 ms
// on Earth's stage at the same rate: within budget, which is why the only refusal this needs is
// the one that keeps `active` (16 587 objects) out of a timed trip.
const STOP_RATE_WORLD_CEILING = 36000;
const STOP_RATE_MAX = 1000000;
// THE SUN AS A SUBJECT HAS NO KEY LIGHT -- it is the light -- so keyLightAngles() gives up and the
// rig's own framing keeps the camera where it came from, which on the Sun's stage is near the
// plane the planets move in: every orbit then drawn as a line. On that stage the picture is the
// orbits, so the camera looks down from 50 degrees above that plane (40 from its pole), where a
// circle is drawn 0.77 as tall as it is wide and the plane still reads as a plane.
const SUN_OVERVIEW_POLAR = 40 * DEG;

// THE STAR-STRETCH (spec 0034 req 2, 2026-09-23). A flight on a rung of the ladder longer than this
// draws the stars as short streaks along the camera's motion (scene/stretch.js): rising over the
// first third of the flight, held, and falling over the last, so the shot still starts and ends
// at rest. Below three seconds a flight is a reframe, not a journey, and a streak would read as a
// glitch. Never on a world stage, never outside a trip, never under reduced motion (there is no
// flight, only the 220 ms cut) and never once the frame latch has said the device is slow.
const STRETCH_MIN_FLIGHT_MS = 3000;

/** The stretch envelope over a flight's progress k: up over the first third, held, down over the last. */
export function stretchEnvelope(k) {
  if (!(k > 0) || !(k < 1)) return 0;
  if (k < 1 / 3) return k * 3;
  if (k > 2 / 3) return (1 - k) * 3;
  return 1;
}

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
// The phase angle past which a backdrop is given up for the light: at 105 degrees a third of the
// subject's disc is lit (the lit share is (1 + cos phase) / 2 = 0.37).
const BACKDROP_MAX_PHASE_DEG = 105;
// Once given up, the backdrop still tips the choice towards a direction that has it in the frame
// (within 20 degrees of straight behind the subject), by this much of the light's own score.
const BACKDROP_IN_FRAME_COS = Math.cos(20 * DEG);
const BACKDROP_IN_FRAME_BONUS = 0.2;

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
// THE SHELL A GROUND SHOT MUST STAY OUT OF is the rig's own, scene/camera.js WORLD_CLEARANCE, and
// not APEX_CLEARANCE. Found 2026-09-23 with the trip from the visitor's own ground (spec 0038):
// 1.05 Earth radii is 319 km up, so from 200 km every direction the key light could choose was
// "blocked" and the shot fell back to whichever side the camera happened to be on, lit or not. On
// the Moon (1.05 R is 87 km up) the 900 km stops never met it. seesGround() already keeps a ground
// subject in sight; what is left for this test is the camera's own floor.
const GROUND_CLEARANCE = 1.02;

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
  // The idle state is ui/tripstate.js's, the one ui/tripgate.js answers with before this module
  // is fetched: one literal, so the two cannot drift.
  const state = idleTripState();

  // The frame subscribes; so can a browser check. Every phase change ends in notify(), so nothing
  // that draws the trip has to poll for one -- the segment fill is the only thing that does, and
  // it polls a number rather than a state.
  const listeners = new Set();
  function onChange(fn) {
    if (typeof fn === 'function') listeners.add(fn);
    return () => listeners.delete(fn);
  }
  function notify() {
    writeUrlState();
    for (const fn of [...listeners]) {
      try {
        fn(state);
      } catch {
        /* a listener must never stop the trip */
      }
    }
  }

  /**
   * THE ADDRESS BAR SAYS WHERE THE TRIP IS (spec 0032 req 3), from the same beat the frame paints
   * it: a visitor who copies it mid-trip has a link to this stop, which is the cheapest share
   * there is. The stop is written as its NUMBER, not its id, because the number is what the intro
   * card and the progress row show. The intro writes the trip alone; leaving clears both keys
   * (stop()). Guarded like every other touch of the document in this file, so the machine still
   * runs under node.
   */
  function writeUrlState() {
    if (typeof window === 'undefined' || !state.tourId) return;
    if (state.phase === 'intro') {
      // A deep link into stop 3 keeps saying stop 3 while its intro is up (jumpTo, below).
      // `at` goes: the trip selects its own stops, and a selection from before it would outlive them.
      const armed = run && run.startAt > 0 ? String(run.startAt + 1) : null;
      writeUrl({ trip: state.tourId, stop: armed, at: null });
    } else if (state.index >= 0 && STOP_PHASES.includes(state.phase)) {
      writeUrl({ trip: state.tourId, stop: String(state.index + 1), at: null });
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
  // A third: a `climb:` stop's flight hands the camera from stage to stage as it goes (scene/climb.js).
  let climbing = false;

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
    endStretch();
  }

  // --- the star-stretch (spec 0034 req 2) ----------------------------------------------------

  let stretchRun = null;
  const _travel = new THREE.Vector3();

  function setStarStretch(k) {
    const dir = k > 0 && rig.velocityDir ? rig.velocityDir(_travel) : null;
    if (ctx.stars3d && ctx.stars3d.setStretch) ctx.stars3d.setStretch(k, dir);
    if (ctx.starfield && ctx.starfield.setStretch) ctx.starfield.setStretch(k, dir);
  }

  function latched() {
    return !!(ctx.latch && ctx.latch.latched);
  }

  function beginStretch(shot, index) {
    endStretch();
    if (!(shot.ms > STRETCH_MIN_FLIGHT_MS) || !isLadderStage(stage.worldId)) return;
    if (reducedMotion() || latched()) return;
    stretchRun = { index, gen, startedAt: now(), ms: shot.ms };
  }

  /** Every exit from a flight lands here: jump, pause, leave, arrival, the latch tripping. */
  function endStretch() {
    const was = stretchRun;
    stretchRun = null;
    if (was) setStarStretch(0);
  }

  /** Per frame, from tick(): the envelope over the rig's own progress through the flight. */
  function stepStretch() {
    const sr = stretchRun;
    if (!sr) return;
    if (sr.gen !== gen || state.phase !== 'flight' || state.index !== sr.index || latched()) {
      endStretch();
      return;
    }
    // The rig's clock, not the wall's: a slow frame is clamped to 250 ms in the rig, so on a slow
    // device the flight runs longer than its `ms` and a wall-clock envelope would end mid-flight.
    const k = rig.flightProgress ? rig.flightProgress() : null;
    const at = k !== null ? k : (now() - sr.startedAt) / sr.ms;
    setStarStretch(stretchEnvelope(at));
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
    stepTrueSize();
    refreshNote();
    stepStretch();
    trackSeenFrom();
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

  // The stop's generated line, re-read once a second while it is up (spec 0038): the station moves
  // eight kilometres a second and the clock does not tell the card it is running.
  const NOTE_REFRESH_MS = 1000;
  let noteAt = 0;
  // Whether the stop on screen HAS a generated line, said or not yet: a photograph's credit and the
  // catalogue's count are empty until their rows have loaded, and a line that began empty was
  // never read again (2026-10-06).
  let noteLive = false;
  function refreshNote() {
    if (!(state.stopNote || noteLive) || (state.phase !== 'dwell' && state.phase !== 'settle')) return;
    const n = now();
    if (n - noteAt < NOTE_REFRESH_MS) return;
    noteAt = n;
    try {
      refreshLeadNote();
    } catch {
      /* the card is the frame's business; the trip goes on */
    }
  }

  // --- resolution -------------------------------------------------------------------------

  function tourById(id) {
    return TOURS.find((tour) => tour.id === id) || null;
  }

  function waitForLayer(id) {
    if (!id || landed.has(id)) return Promise.resolve(landed.has(id));
    // This module is imported on the first press of a trip, seconds after the bundled layers
    // (oddities, hand-kept-sites) announced themselves: `landed` never heard them, and every trip
    // that required one sat on LAYER_DEADLINE_MS, 8 to 9 s of bare map (internal #454, #419 item 1,
    // measured 2026-10-08). main.js keeps the answer; ask it before waiting for an event.
    if (typeof ctx.layerLanded === 'function' && ctx.layerLanded(id)) { landed.add(id); return Promise.resolve(true); }
    // A layer that is DRAWN rather than loaded (the aurora, the lightning: data/layers.js `draw`)
    // has no records to land, so there is nothing to wait for: measured 2026-10-05, a trip that
    // required them sat eight seconds on LAYER_DEADLINE_MS before its intro.
    const row = (ctx.layers || []).find((l) => l.id === id);
    if (row && row.draw) return Promise.resolve(true);
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

  /**
   * THE VISITOR'S PLACE (spec 0038, 2026-09-23): the one they set, or the guess from their clock
   * that the Now moment already makes (sky/guessplace.js), or null when there is neither. Read at
   * plan time and at every stop, and NEVER WRITTEN: the trip does not set ctx.observer, the URL
   * does not carry it, and a shared link opens the trip at the recipient's own place.
   * `ctx.guessPlace` exists so a test, or a browser check, can stub the guess.
   */
  function placeOf() {
    if (ctx.observer) return ctx.observer;
    try {
      return typeof ctx.guessPlace === 'function' ? ctx.guessPlace() : guessObserver(CITIES);
    } catch {
      return null;
    }
  }

  /**
   * `target: {observer: true}`: the ground under the visitor, as a subject. A synthetic fixed
   * record that is in no layer and is never drawn or selected; `record: null` so paintCard()
   * treats it as a PLACE -- no object card, `follow` on the point as the Earth turns it. On the
   * ground, so composeShot() frames it the way it frames a landing site: from above its horizon,
   * with its own vertical as the camera's up.
   */
  function observerSubject() {
    const o = placeOf();
    const latDeg = o ? (isNum(o.latDeg) ? o.latDeg : isNum(o.latRad) ? o.latRad / DEG : NaN) : NaN;
    const lonDeg = o ? (isNum(o.lonDeg) ? o.lonDeg : isNum(o.lonRad) ? o.lonRad / DEG : NaN) : NaN;
    if (!isNum(latDeg) || !isNum(lonDeg)) return null;
    const record = {
      id: 'observer',
      propagator: 'fixed',
      frame: 'earth-fixed',
      fixed: { latDeg, lonDeg, altKm: isNum(o.altKm) ? o.altKm : 0 },
    };
    return {
      kind: 'observer',
      id: 'observer',
      name: o.name || COPY.trip.yourPlace,
      record: null,
      layerId: null,
      worldId: 'earth',
      radiusKm: null,
      source: o.source || 'set',
      how: o.how || null,
      position(tMs) {
        const p = fixed(record, tMs);
        return p ? stage.toScene(p, p.frame, tMs) : null;
      },
    };
  }

  const _skyQ = new THREE.Quaternion();

  /** The scene's rotation for a J2000 equatorial direction, as the sky sphere on screen has it. */
  let skyQuatFor = null;
  function skyQuat() {
    const sf = ctx.starfield;
    if (!sf || !sf.group) return _skyQ.identity();
    // The sky sphere re-measures its rotation when it is next DRAWN after a stage change, and a
    // trip composes its first shot in the same tick it changed the stage: asked then, the sphere
    // still had the last stage's rotation (measured 2026-10-05: the camera looked 90 degrees off).
    if (skyQuatFor !== stage.worldId && typeof sf.syncFrame === 'function') {
      sf.syncFrame();
      skyQuatFor = stage.worldId;
    }
    return _skyQ.copy(sf.group.quaternion);
  }

  /**
   * `target: {sky: [ra, dec]}`: a direction on the sky, as a subject. Without `depth_ly` it is a
   * point SKY_NEAR_KM from the Sun along the direction the SKY SPHERE draws (so the frame is
   * centred on the stars that are on screen); with it, a true place that many light-years out.
   */
  function skySubject(target) {
    const sky = target.sky;
    if (!Array.isArray(sky) || !isNum(sky[0]) || !isNum(sky[1])) return null;
    const ra = sky[0] * DEG;
    const dec = sky[1] * DEG;
    const eq = new THREE.Vector3(Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec));
    const real = isNum(target.depth_ly) && target.depth_ly > 0;
    const distKm = real ? target.depth_ly * LY_KM : SKY_NEAR_KM;
    const sunKm = { x: 0, y: 0, z: 0 };
    return {
      kind: 'sky',
      id: `sky-${sky[0]}-${sky[1]}`,
      name: '',
      record: null,
      layerId: null,
      worldId: 'sun',
      radiusKm: null,
      sky: { real, distKm },
      position(tMs) {
        const sun = stage.toScene(sunKm, SUN_FRAME, tMs);
        if (!sun) return null;
        if (real) {
          const km = {
            x: eq.x * distKm,
            y: (eq.y * COS_OBLIQUITY + eq.z * SIN_OBLIQUITY) * distKm,
            z: (-eq.y * SIN_OBLIQUITY + eq.z * COS_OBLIQUITY) * distKm,
          };
          return stage.toScene(km, SUN_FRAME, tMs);
        }
        return eq.clone().applyQuaternion(skyQuat()).multiplyScalar(distKm / stage.unitKm).add(sun);
      },
    };
  }

  function resolveTarget(target) {
    if (!target) return null;
    if (target.sky) return skySubject(target);
    if (target.observer === true) return observerSubject();
    if (target.record) {
      const record = ctx.recordById(target.record);
      // A planet with a registry/systems.yaml row, or its host star (spec 0040): flown to where
      // scene/systems.js draws it on the system's stage, framed by its own radius, with the star as
      // the ground the camera keeps out of.
      const inSystem = record && ctx.systems ? ctx.systems.subjectFor(record) : null;
      return worldRecordSubject(record) || inSystem || recordSubject(record);
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
    // A stop at a dated instant, on a record that has a file of its own path (Apophis on 13 April
    // 2029; propagate/ephemeris.js): the file is fetched now, so the flight is composed on where
    // the record WAS, not on its stand-in. A file that does not load leaves the stop as it was.
    const dated = tour.stops.filter((s) => s.target && s.target.record && typeof s.time === 'string' && /^\d{4}-\d\d-\d\d/.test(s.time)).map((s) => s.target.record);
    if (dated.length) {
      const eph = await import('../propagate/ephemeris.js').catch(() => null);
      if (eph) await Promise.all(dated.map((id) => eph.ensure(id)));
    }

    const stops = [];
    const dropped = [];
    for (const stop of tour.stops) {
      // An `{event:}` stop is resolved HERE as well as at its turn, so the count on the intro card
      // is honest: an event nobody can find is a stop nobody can show. ISO and `now` always
      // resolve and are not asked. data/events.js answers null for one it cannot find in 400 days.
      const eventLost = isEventTime(stop.time) && resolveStopTime(stop.time, ctx.clock.now(), tour.stops) === null;
      const subject = eventLost ? null : resolveTarget(stop.target);
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
    // A trip from the visitor's own ground with no place at all -- none set, and no time zone to
    // guess one from -- is greyed with THAT reason, first, rather than with the count its dropped
    // ground stops would leave (spec 0038 req 3).
    if (tour.requires_observer && !placeOf()) {
      return {
        id: tour.id,
        title: tour.title,
        blurb: tour.blurb,
        count: 0,
        dropped: [],
        estimateMs: 0,
        offerable: false,
        reason: COPY.trip.needsPlace,
      };
    }
    const resolved = await resolveTour(tour);
    const count = resolved.stops.length;
    const enough = count >= (tour.min_stops || 3);
    // Asked again after the wait: the place can be cleared while the layers land, and then the
    // true reason is still the place, not the count its dropped ground stops leave.
    const placeless = !enough && tour.requires_observer && !placeOf();
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
        : placeless
          ? COPY.trip.needsPlace
          : t(COPY.trip.notEnoughStops, { count, min: tour.min_stops || 3, title: tour.title }),
    };
  }

  /** Why a trip cannot start: no place for a trip that starts from yours, or too few stops. */
  function refusalOf(tour, count) {
    if (tour.requires_observer && !placeOf()) return COPY.trip.needsPlace;
    return t(COPY.trip.notEnoughStops, { count, min: tour.min_stops || 3, title: tour.title });
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
    // On a star system's stage the light is its own star, not ours forty light-years behind.
    const own = ctx.systems && ctx.systems.lightScene ? ctx.systems.lightScene() : null;
    if (own) return own;
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
    backdrop, subjectRad, arriveUp) {
    if (!sunPos) return null;
    // A ground stop is chosen in the frame of the site's own vertical, which is the up the camera
    // will have when it arrives. Borrowed for the search and put back: the rig reads camera.up
    // on every frame, and the flight must START in the basis the camera is in now.
    //
    // AND SO IS EVERY STOP AFTER ONE. Leaving the ground turns the up back to the visitor's own
    // through the flight, and the rig reads the chosen angles in whatever basis the camera has when
    // it lands. Measured 2026-09-23 (tests/test_station_trip.mjs): the angles for the station at
    // 3 000 km were chosen in the basis of the visitor's ground and read in the scene's, which put
    // the camera behind the Earth, pushed out to 5 506 km, looking at the station through the
    // planet. `arriveUp` is the up the flight turns to; the search runs in it whenever it differs.
    const ground = !!groundUp;
    const basisUp = groundUp || arriveUp || null;
    const borrowed = !!basisUp && ctx.camera.up.distanceToSquared(basisUp) > 1e-12;
    if (borrowed) {
      _savedUp.copy(ctx.camera.up);
      ctx.camera.up.copy(basisUp);
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
      const pick = (candidates, keepInFrame = null) => {
        let best = null;
        for (const c of candidates) {
          offsetDirection(c.azimuth, c.polar, _u);
          if (blocked(targetScene, _u, d, worldCentre, radius * (ground ? GROUND_CLEARANCE : APEX_CLEARANCE))) continue;
          if (ground && !seesGround(c.azimuth, c.polar, driftRad || 0, groundUp)) continue;
          const lit = Math.abs(_u.dot(_sun) - want);
          const turn = Math.abs(shortestAngle(azNow, c.azimuth)) / Math.PI;
          // A backdrop given up for the light is still wanted in the frame when the light allows:
          // a direction that looks past the subject towards it is preferred, a little.
          const framed = keepInFrame && -_u.dot(keepInFrame) > BACKDROP_IN_FRAME_COS ? BACKDROP_IN_FRAME_BONUS : 0;
          const score = lit + KEY_LIGHT_TURN_WEIGHT * turn - framed;
          if (!best || score < best.score) best = { azimuth: c.azimuth, polar: c.polar, score, sunward: _u.dot(_sun) };
        }
        return best;
      };
      // A stop that named a world to keep behind its subject searches a cone around that direction
      // FIRST; if nothing in the cone survives, the plain search decides and the backdrop is given
      // up rather than the shot.
      //
      // AND THE BACKDROP YIELDS TO THE LIGHT (2026-10-06, internal #400). The cone is 22 degrees
      // wide and knows nothing about the Sun: the walk of every stop found Triton and Pluto as two
      // black discs, because on that day Neptune and Charon stood on the far side of them from
      // the Sun and the only directions that kept them behind looked at the night side. A subject
      // nobody can see is not a shot with a good background. When the best direction in the cone
      // shows less than about a third of the disc lit (more than BACKDROP_MAX_PHASE_DEG from the
      // Sun's side, or 25 degrees past the light the stop itself asked for when that is further
      // round), the plain search decides, as it does when the cone is blocked.
      let best = backdrop
        ? pick(backdropCandidates(backdrop, (subjectRad || 0) + BACKDROP_CLEAR))
        : null;
      // Never when the backdrop IS the light (`behind: sun`): that shot is against the Sun on purpose.
      const againstSun = !!backdrop && backdrop.isTheSun === true;
      const yielded = !!best && !againstSun && best.sunward < Math.cos(Math.max(BACKDROP_MAX_PHASE_DEG, (wantDeg ?? 125) + 25) * DEG);
      if (yielded) best = null;
      if (!best) best = pick(gridCandidates(ground ? GROUND_POLARS : KEY_LIGHT_POLARS), yielded ? backdrop : null);
      // Every candidate blocked is a real case -- low over the night side, with the planet on
      // every side of you. Fall back to the rig's own framingAngles, which is occlusion-free by
      // construction, and accept flat light. This is a CAMERA choice and never goes on the card.
      // On the ground the rig's framing is no fallback -- it is computed in the basis the camera is
      // leaving -- and every candidate is above the horizon, so the only way to have none is a
      // drift wider than the arc can hold: then the side the camera is on, from high up.
      if (!best && ground) best = { azimuth: azNow, polar: GROUND_POLARS[0], score: Infinity };
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
    if (dir.lengthSq() <= 1e-18) return null;
    dir.normalize();
    // keyLightAngles never gives up a backdrop that is the light itself (`behind: sun`). Told by
    // name and not by direction: a planet that stands between its moon and the Sun is in the
    // Sun's direction too, and that is exactly the dark shot the rule exists to refuse.
    dir.isTheSun = id === 'sun';
    return dir;
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
    // A look at the sky stands a little in front of the Sun; a look at its depth stands where the
    // stop says, and at the Sun's own distance from the point when it says nothing.
    if (subject.kind === 'sky' && !isNum(stop.distance_km)) return subject.sky.distKm * SKY_STAND;
    // A star system's overview (spec 0040) is never closer than the whole of it fits on THIS screen:
    // a phone held upright is a third as wide as a desktop, and the outer orbit would be cut off.
    if (isNum(stop.distance_km) && typeof subject.fitKm === 'function') return Math.max(stop.distance_km, subject.fitKm(stop));
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
    // A star system's member (spec 0040) names its own ground: the host star at the stage's origin.
    const ownGround = subject.ground && subject.ground.centre ? subject.ground.centre() : null;
    const worldCentreKm = ownGround ? null : positionOf(world.id, tMs);
    const worldCentre = ownGround || (worldCentreKm
      ? stage.toScene(worldCentreKm, worldCentreKm.frame, tMs)
      : new THREE.Vector3());
    const radius = (ownGround ? subject.ground.radiusKm : world.radiusKm) / stage.unitKm;

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
    // The visitor's own place (spec 0038) is on the ground exactly as a landing site is, and goes
    // down the same path: one rule for the vertical, the co-latitudes and the drift.
    const groundUp = (subject.kind === 'record' || subject.kind === 'observer') && radius > 0
      && fromCentre > radius * GROUND_BAND[0] && fromCentre < radius * GROUND_BAND[1]
      ? targetScene.clone().sub(worldCentre).normalize()
      : null;
    const skyShot = subject.kind === 'sky' ? skyAngles(targetScene, sun, Number(entry.stop.aside_deg) || 0) : null;
    let angles = skyShot ? skyShot.angles : keyLightAngles(
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
      // The up this flight lands with off the ground (upFor): the visitor's own.
      (run && run.savedUp) || null,
    );
    // `over: [lat, lon]` on a stop about the Earth: the camera goes above that place, whatever the
    // light is doing there, because the stop is about what is on the ground under it.
    // Since 2026-10-06 on any world that has a ground to stand over (Olympus Mons on Mars).
    if (Array.isArray(entry.stop.over) && subject.kind === 'world') {
      const above = overAngles(entry.stop.over, targetScene, tMs, subject.id);
      if (above) angles = above;
    }
    // `seen_from: earth` on a stop about the Moon: the camera goes on the line from the subject to
    // that world, so the face shown is the one that world sees. tick() keeps it there (trackSeenFrom).
    if (entry.stop.seen_from) {
      const from = seenFromAngles(entry.stop.seen_from, targetScene, tMs);
      if (from) angles = from;
    }
    // `framing: sunrise` (internal #313): the camera on the night side with the Sun just behind the
    // limb, and the dwell's own drift, which turns towards the light, brings it out.
    if (entry.stop.framing === 'sunrise' && subject.kind === 'world' && sun && isNum(subject.radiusKm) && d1 > 0) {
      const rise = sunriseAngles(sun, targetScene, Math.asin(clamp(subject.radiusKm / stage.unitKm / d1, 0, 1)));
      if (rise) angles = rise;
    }
    // A PHOTOGRAPH IS SEEN FROM THE SIDE IT WAS TAKEN FROM (2026-10-06). A stop at a deep-sky object
    // with `key_light_deg: 0` goes on the line from the object back to the Sun, exactly: the key
    // light's search looks from level with the ecliptic or above it and never from below, so for
    // the Whirlpool (51 degrees north of it) the nearest direction it had was 52 degrees off the
    // line, where scene/nebulae.js rightly draws no picture at all (viewFade is gone by 50).
    if (entry.stop.key_light_deg === 0 && subject.record && subject.record.klass === 'dso' && sun) {
      const home = towardAngles(sun, targetScene);
      if (home) angles = home;
    }
    if (!angles && subject.kind === 'world' && subject.id === 'sun' && stage.worldId === 'sun') {
      angles = { azimuth: rig.state.azimuth || 0, polar: SUN_OVERVIEW_POLAR };
    }
    // A subject that asks to be seen from above its orbits (a star system's host, spec 0040): the
    // same look-down the Sun's overview has, at the azimuth the key light chose or the camera's own.
    if (isNum(subject.polar)) angles = { azimuth: angles ? angles.azimuth : rig.state.azimuth || 0, polar: subject.polar };

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
      up: skyShot ? skyShot.up : groundUp,
    };
  }

  /** The rig's angles for a camera straight above a place on the Earth, in the up it arrives with. */
  function overAngles(over, targetScene, tMs, worldId = 'earth') {
    if (!isNum(over[0])) return null;
    const at = (latDeg, lonDeg) => {
      const p = fixed({ id: 'over', propagator: 'fixed', frame: `${worldId}-fixed`, fixed: { latDeg, lonDeg, altKm: 0 } }, tMs);
      return p ? stage.toScene(p, p.frame, tMs) : null;
    };
    let ground = null;
    if (over[1] === 'midnight' || over[1] === 'noon') {
      // The meridian where it is midnight now: the one facing away from the Sun. The aurora is a
      // night thing and which longitude has the night depends on the hour the visitor arrives.
      const pole = at(90, 0);
      const sun = sunScene(tMs);
      if (!pole || !sun) return null;
      const north = _b2.copy(pole).sub(targetScene).normalize();
      // `noon` (2026-10-06, internal #400) is the other meridian: the one facing the Sun, for a stop
      // about what today's daylight shows (the clouds), whichever ocean is under it at this hour.
      const away = _b3.copy(targetScene).sub(sun).normalize();
      if (over[1] === 'noon') away.negate();
      away.addScaledVector(north, -away.dot(north));
      if (away.lengthSq() < 1e-12) return null;
      away.normalize();
      const lat = over[0] * DEG;
      ground = new THREE.Vector3().copy(targetScene).addScaledVector(away, Math.cos(lat)).addScaledVector(north, Math.sin(lat));
    } else if (isNum(over[1])) ground = at(over[0], over[1]);
    if (!ground) return null;
    return towardAngles(ground, targetScene);
  }

  /** The rig's angles for a camera on the line from the subject towards `point`, in the visitor's up. */
  function towardAngles(point, targetScene) {
    _b1.copy(point).sub(targetScene);
    if (_b1.lengthSq() < 1e-30) return null;
    _b1.normalize();
    const up = (run && run.savedUp) || ctx.camera.up;
    _uq.setFromUnitVectors(_b2.copy(up).normalize(), Y_UP);
    _b1.applyQuaternion(_uq);
    return { azimuth: Math.atan2(_b1.x, _b1.z), polar: Math.acos(clamp(_b1.y, -1, 1)) };
  }

  /**
   * `framing: sunrise` (internal #313, the planetarium films' signature frame): THE SUN ABOUT TO
   * CLEAR THE LIMB. The camera stands on the night side of a world with air, on the side of the
   * anti-Sun line where the Sun's centre is SUNRISE_HIDDEN_DEG behind the world's edge; the stop's
   * drift turns towards the light (driftSign), so within the dwell the Sun comes out from behind
   * the limb and the air along that edge lights first. Nothing is moved but the camera: the Sun,
   * the world and the instant are the stop's own.
   *
   * The geometry, in the rig's own two angles. Seen from the camera, the world's centre is at -u
   * and the Sun at s; the Sun is behind the disc while the angle between them is under the disc's
   * angular radius `rho`. So u is `rho - hidden` away from the anti-Sun direction, at the SAME
   * co-latitude (the drift is a turn in azimuth, which then carries it straight across the limb
   * rather than along it): the azimuth offset D solves cos(sep) = cos^2(p) + sin^2(p) cos(D).
   * Which side: the one the camera is already nearer, so the flight there is the shorter turn.
   */
  function sunriseAngles(sunPos, targetScene, rho) {
    const anti = towardAngles(sunPos, targetScene);
    if (!anti || !(rho > 0)) return null;
    // towardAngles gave the Sun's own direction; the far side of the world from it is opposite.
    const azAnti = anti.azimuth + Math.PI;
    const polar = clamp(Math.PI - anti.polar, SUNRISE_POLAR_MIN, Math.PI - SUNRISE_POLAR_MIN);
    // UNDER REDUCED MOTION THE RIG REFUSES THE DRIFT (scene/camera.js), and a sunrise that never
    // comes is a black disc: the camera then stands where the drift would have brought the Sun out
    // by the same two degrees, and the stop is that still frame.
    const sep = reducedMotion() ? rho + SUNRISE_HIDDEN_DEG * DEG : Math.max(0, rho - SUNRISE_HIDDEN_DEG * DEG);
    const sin2 = Math.sin(polar) ** 2;
    const d = Math.acos(clamp((Math.cos(sep) - Math.cos(polar) ** 2) / sin2, -1, 1));
    const side = shortestAngle(azAnti, rig.state.azimuth || 0) >= 0 ? 1 : -1;
    return { azimuth: azAnti + side * d, polar };
  }

  /** `seen_from:` -- the angles that put the camera between the subject and that world. */
  function seenFromAngles(worldId, targetScene, tMs) {
    const w = worldSubject(worldId);
    const p = w ? w.position(tMs) : null;
    return p ? towardAngles(p, targetScene) : null;
  }

  /**
   * KEEP A `seen_from:` STOP ON ITS LINE WHILE THE CLOCK RUNS (2026-10-06, the Moon's phases). The
   * rig's angles are fixed against the stars, and the stop runs a week in twenty seconds: held
   * still, the camera would watch the Moon from one side while the Earth went round behind it, and
   * the lit part would never change, because the phases are what the EARTH sees. So the angles are
   * worked out again every frame of the settle and the dwell. Not while paused: a hand on the
   * camera has it. The rig says no during a flight, which owns both angles.
   */
  function trackSeenFrom() {
    if (!run || state.index < 0 || (state.phase !== 'dwell' && state.phase !== 'settle')) return;
    const entry = run.stops[state.index];
    if (!entry || !entry.stop.seen_from || !entry.subject || typeof rig.setAngles !== 'function') return;
    const tMs = ctx.clock.now();
    const at = entry.subject.position(tMs);
    const a = at ? seenFromAngles(entry.stop.seen_from, at, tMs) : null;
    if (a) rig.setAngles(a.azimuth, a.polar);
  }

  /**
   * THE ANGLES OF A LOOK AT THE SKY. The camera goes on the line from the point back to the Sun
   * (so the sky is the one seen from home), turned `asideDeg` about the celestial pole when the
   * stop wants to see the depth. Celestial north is up, as on every star chart, and it is the up
   * the angles are worked out in, because it is the up the flight arrives with (upFor).
   */
  function skyAngles(targetScene, sun, asideDeg) {
    if (!sun) return null;
    const north = new THREE.Vector3(0, 0, 1).applyQuaternion(skyQuat()).normalize();
    _b1.copy(sun).sub(targetScene);
    if (_b1.lengthSq() < 1e-30) return null;
    _b1.normalize();
    _uq.setFromUnitVectors(north, Y_UP);
    _b1.applyQuaternion(_uq);
    return {
      up: north,
      angles: {
        azimuth: Math.atan2(_b1.x, _b1.z) + asideDeg * DEG,
        polar: Math.acos(clamp(_b1.y, -1, 1)),
      },
    };
  }

  // --- the card ---------------------------------------------------------------------------

  /** The stop card's microlabel, "Stop 2 of 4" (spec 0061 task 7): where in the trip this card is. */
  function stopMicro() {
    return state.index >= 0 && state.count > 0 ? t(COPY.trip.stopMicro, { n: state.index + 1, count: state.count }) : '';
  }

  /**
   * @param {object} entry the resolved stop
   * @param {boolean} [titleOnly] mid-flight: the stop's TITLE and nothing else, rendered through
   *   the same lead-only path a place-stop uses. Not the whole card with its body hidden by CSS
   *   -- a body a screen reader can read while the camera is still moving is exactly the thing
   *   the k=0.6 rule exists to prevent, and hiding it visually would not hide it from a reader.
   */
  function paintCard(entry, titleOnly) {
    const card = entry.stop.card || {};
    const lead = { micro: stopMicro(), title: card.title, body: titleOnly ? null : card.body };
    // The generated line under the stop's words (spec 0038), a function so ui/cards.js reads it
    // afresh each time it repaints the card on the clock: the station's distance changes by eight
    // kilometres a second. `state.stopNote` holds the last reading, for the frame and a probe.
    const noted = titleOnly ? null : noteFor(entry);
    noteLive = !!noted;
    if (noted) {
      lead.note = () => {
        const text = noted();
        state.stopNote = text;
        return text;
      };
      state.stopNote = noted();
    } else if (!titleOnly) state.stopNote = null; // a stop with no line does not keep the last stop's
    if (titleOnly) {
      showCard(null, ctx, { lead });
      return;
    }
    const record = entry.subject && entry.subject.record;
    if (record) {
      // The real select: the glyph highlights, `follow` is installed, `sr:select` fires (which the
      // rest of the page listens for) -- and its own 900 ms flight is
      // suppressed, because we are already on our way there.
      ctx.select(record, { fly: false });
      lastRecord = record;
      showCard(record, ctx, { lead });
    } else {
      // A stop that is a PLACE rather than an object. There is no record, so there is no card to
      // restyle: the stop's own words are the whole card.
      ctx.deselect();
      lastRecord = null;
      // `follow` before the card, so the camera holds the place (a visitor's ground turns with the
      // Earth) even when painting the card fails -- as it does in node, where there is no document.
      // Not from the ground itself (`look:`): the sky view has the camera, and there is nothing to ride.
      if (!(run && run.ground)) rig.follow(() => entry.subject.position(ctx.clock.now()));
      showCard(null, ctx, { lead });
    }
  }

  /**
   * THE LINES THE REGISTRY MAY NOT TYPE (spec 0038 req 2 and 4), as a function of the moment, or
   * null. Chosen by what the stop IS, never by its id, so this file still knows no trip:
   *
   *   - a stop at the visitor's own place says which place and how it was got (set, the device's,
   *     or a guess from the clock, which says so and where to set a better one);
   *   - an Earth-orbit record in a trip that starts from the visitor, shown at the present, says
   *     how far it is from them right now;
   *   - a stop timed to the station's next pass over them says where to look and when (the same
   *     sentence the object card uses, ui/cards.js seeItLine), whether that pass can be seen, and
   *     that the model on screen is drawn at class size.
   */
  function noteFor(entry) {
    const subject = entry.subject;
    if (!subject) return null;
    // `live_note:` (2026-10-05): the sentence the Earth's own card prints about today's clouds, the
    // aurora forecast or the lightning -- how old it is, whose it is, why it is not drawn when it is
    // not -- under a stop that is about that thing. The modules write it; the registry cannot.
    const live = entry.stop.live_note;
    if (live) {
      const say = {
        clouds: () => (ctx.liveClouds && ctx.liveClouds.line ? ctx.liveClouds.line(ctx.clock.now()) : ''),
        // The forecast's own sentence, then today's Kp with its age (internal #385): NOAA's
        // planetary index is the number an aurora watcher asks for, and the forecast line does
        // not carry it. Left out until the reading has arrived, and when it never does.
        aurora: () => [
          ctx.aurora && ctx.aurora.line ? ctx.aurora.line(ctx.clock.now()) : '',
          typeof ctx.spaceWeatherLine === 'function' ? ctx.spaceWeatherLine() : '',
        ].filter(Boolean).join(' '),
        lightning: () => (ctx.weather && ctx.weather.line ? ctx.weather.line('earth', ctx.clock.now()) : ''),
        // 2026-10-06. The season on the world the stop is about (Mars: scene/weather, by the date
        // on the clock); NOAA's reading of the Earth's magnetic weather, with its age (main.js
        // fetches it when a trip that wants it reaches its intro); and where one planet is in the
        // visitor's own sky tonight (sky/lookfor.js).
        season: () => (ctx.weather && ctx.weather.line ? ctx.weather.line(subject.id, ctx.clock.now()) : ''),
        'space-weather': () => (typeof ctx.spaceWeatherLine === 'function' ? ctx.spaceWeatherLine() : ''),
        tonight: () => tonightLine(entry),
        // 2026-10-06: the next pass in JPL's table as the asteroids layer loaded it, and the count
        // of the catalogue on screen. Counted here from the records, so no card types either.
        'close-approach': () => closeApproachLine(),
        satellites: () => satellitesLine(),
      }[live];
      if (say) return () => { try { return say() || ''; } catch { return ''; } };
    }
    // A stop seen from the visitor's own ground says what it turned to, and where that is.
    if (entry.stop.look && run && run.ground) return () => { try { return lookLine(entry) || ''; } catch { return ''; } };
    if (subject.kind === 'observer') {
      const line = subject.source === 'guess'
        ? t(COPY.trip.observerGuess, { place: subject.name })
        : subject.source === 'geolocation'
          ? COPY.trip.observerDevice
          : t(COPY.trip.observerSet, { place: subject.name });
      return () => line;
    }
    const record = subject.record;
    // A stop at a nebula or a galaxy that has a photograph says whose photograph it is (the
    // archives' terms ask for the credit beside the picture), and one that draws a portrait says
    // what the portrait is. main.js answers once the pictures' own rows have loaded.
    if (record && entry.stop.portrait && typeof ctx.portraitLine === 'function') {
      return () => { try { return ctx.portraitLine(record.id) || ''; } catch { return ''; } };
    }
    if (record && record.klass === 'dso' && typeof ctx.pictureLine === 'function') {
      return () => { try { return ctx.pictureLine(record.id) || ''; } catch { return ''; } };
    }
    if (!record || !run || !run.tour.requires_observer || !/^earth-/.test(String(record.frame || ''))) return null;
    const ev = entry.event;
    if (isEventTime(entry.stop.time) && ev && ev.pass) {
      const p = ev.pass;
      // `sunlit: null` so seeItLine() leaves its own sunlit clause out: "still catching sunlight"
      // is true of a daytime pass nobody can see, and the next sentence says which this one is.
      const look = seeItLine(record, ctx, { frame: record.frame, ok: true, tMs: ev.t, worldId: 'earth' },
        { state: 'ok', pass: { ...p, sunlit: null } });
      const line = [look, p.visible ? COPY.trip.passNight : COPY.trip.passDay,
        t(COPY.trip.drawnAtClassSize, { px: fmt.int(SELECTED_PX) })].join(' ');
      return () => line;
    }
    if (isEventTime(entry.stop.time)) return null;
    const home = observerSubject();
    if (!home) return null;
    return () => {
      const tMs = ctx.clock.now();
      const a = subject.position(tMs);
      const b = home.position(tMs);
      if (!a || !b) return '';
      // To the nearest ten kilometres: the number turns over every second or so, not every frame.
      const km = Math.round((a.distanceTo(b) * stage.unitKm) / 10) * 10;
      return t(COPY.trip.stationFromYou, { km: fmt.int(km) });
    };
  }

  /** `live_note: close-approach`: the next asteroid to pass, from the records the layer holds. */
  function closeApproachLine() {
    const now = ctx.clock.now();
    let best = null;
    for (const r of (typeof ctx.recordsFor === 'function' ? ctx.recordsFor('asteroids') : []) || []) {
      const m = r && r.meta;
      if (!m || !isNum(m.closeApproachMs) || m.closeApproachMs <= now) continue;
      if (!best || m.closeApproachMs < best.meta.closeApproachMs) best = r;
    }
    if (!best) return COPY.trip.approachNone;
    const m = best.meta;
    const ld = isNum(m.missDistanceLd) ? m.missDistanceLd : isNum(m.missDistanceKm) ? m.missDistanceKm / UNITS.LUNAR_DISTANCE_KM : null;
    const say = { name: best.name || best.designation || best.id, date: timeText.dateNear(m.closeApproachMs, now) };
    return ld === null ? t(COPY.trip.approachNextFar, say) : t(COPY.trip.approachNext, { ...say, ld: fmt.num(ld, 1) });
  }

  /** `live_note: satellites`: how many records the active catalogue holds, and how many are Starlink. */
  function satellitesLine() {
    const records = (typeof ctx.recordsFor === 'function' ? ctx.recordsFor('active') : []) || [];
    if (!records.length) return COPY.trip.satellitesLoading;
    let starlink = 0;
    for (const r of records) if (/^STARLINK/i.test(String((r && r.name) || ''))) starlink += 1;
    return t(COPY.trip.satellitesCount, { n: fmt.int(records.length), starlink: fmt.int(starlink) });
  }

  /** The shower a `look: {shower: next}` stop is about, found once for the visitor's own date. */
  function showerOf(entry) {
    if (!entry || !entry.stop.look || !entry.stop.look.shower) return null;
    if (entry.shower === undefined) {
      const base = run && run.savedClock && isNum(run.savedClock.t) ? run.savedClock.t : ctx.clock.now();
      entry.shower = nextShower(base, SHOWERS) || null;
    }
    return entry.shower;
  }

  /** A stop's `look:` as sky/lookfor.js reads it: the next shower is a place on the sky like any other. */
  function lookOf(entry) {
    const found = showerOf(entry);
    return found ? { sky: [Number(found.shower.ra_h) * 15, Number(found.shower.dec)] } : entry.stop.look;
  }

  /**
   * `live_note: tonight` under a stop about a planet: when and where it is in the visitor's own
   * sky in the coming dark, or why it is not. Worked out once per stop (a hundred solves) from the
   * clock the visitor had when the trip began, which is the "tonight" every stop of the trip means.
   */
  function tonightLine(entry) {
    const place = placeOf();
    const subject = entry.subject;
    if (!place || !subject) return '';
    if (!entry.tonight) {
      const base = run && run.savedClock && isNum(run.savedClock.t) ? run.savedClock.t : ctx.clock.now();
      entry.tonight = planetTonight(subject.id, place, tonightMs(place, base)) || { none: true };
    }
    const p = entry.tonight;
    if (p.none) return '';
    const T = COPY.trip;
    const where = { place: place.name || T.yourPlace, name: subject.name };
    if (p.why === 'glare') return t(T.tonightGlare, where);
    if (!p.visible) return t(T.tonightDown, where);
    return t(T.tonightUp, {
      ...where,
      begin: timeText.hhmm(p.fromMs),
      end: timeText.hhmm(p.untilMs),
      time: timeText.hhmm(p.bestMs),
      alt: altitudeInWords(p.bestAltDeg),
      az: azimuthInWords(p.bestAzDeg),
    });
  }

  /**
   * The line under a stop seen from the ground (`look:`): what the view turned to and where it is,
   * read from the clock each time (the Moon climbs while the card is up), or that it is not up.
   */
  function lookLine(entry) {
    const place = placeOf();
    const look = entry.stop.look;
    if (!place || !look) return '';
    const T = COPY.trip;
    const pass = entry.event && entry.event.pass ? entry.event.pass : null;
    if (look.pass === true) {
      if (!pass) return T.lookNoPass;
      const record = (entry.event && entry.event.record) || pass.record;
      if (!record) return T.lookNoPass;
      // The same sentence the object card and the station trip's own pass stop use.
      const see = seeItLine(record, ctx, { frame: record.frame, ok: true, tMs: entry.event.t, worldId: 'earth' },
        { state: 'ok', pass: { ...pass, sunlit: null } });
      return [see, pass.visible ? T.passNight : T.passDay].join(' ');
    }
    const aim = lookTarget(lookOf(entry), place, ctx.clock.now(), pass);
    if (!aim) return '';
    const where = { alt: altitudeInWords(aim.altDeg), az: azimuthInWords(aim.azDeg) };
    if (look.shower) {
      const found = showerOf(entry);
      if (!found) return '';
      const base = run && run.savedClock && isNum(run.savedClock.t) ? run.savedClock.t : ctx.clock.now();
      const say = { name: found.shower.display, date: timeText.dateNear(found.peakMs, base), rate: fmt.int(found.shower.zhr), ...where };
      // And what the Moon does that night (internal #413): a bright Moon hides the faint ones.
      const moon = showerMoon(found.peakMs);
      const moonLine = moon ? t(T.lookShowerMoon[moon.kind], { pct: fmt.int(moon.percent) }) : '';
      return [t(T.lookShower, say), t(aim.up ? T.lookShowerUp : T.lookShowerDown, say), t(T.lookShowerRate, say), moonLine].filter(Boolean).join(' ');
    }
    if (aim.daylight) return T.lookDaylight;
    if (aim.kind === 'milky-way') return aim.up ? t(T.lookMilkyWay, { ...where, name: aim.name }) : T.lookNoMilkyWay;
    if (aim.kind === 'world' && aim.id === 'moon') {
      if (aim.up) return t(T.lookMoonUp, { ...where, pct: fmt.int(aim.percent ?? 0) });
      return isNum(aim.riseMs) ? t(T.lookMoonDown, { time: timeText.hhmm(aim.riseMs) }) : T.lookMoonDownNoRise;
    }
    if (aim.kind === 'world') {
      const w = worldById.get(aim.id);
      const name = w ? w.display : aim.id;
      return aim.up ? t(T.lookWorldUp, { ...where, name }) : t(T.lookWorldDown, { name });
    }
    if (aim.kind === 'planet') {
      if (!aim.up) return T.lookNoPlanet;
      const w = worldById.get(aim.id);
      return t(T.lookPlanet, { ...where, name: w ? w.display : aim.id });
    }
    if (aim.kind === 'star') return aim.up ? t(T.lookStar, { ...where, name: aim.name }) : '';
    if (aim.kind === 'figure') return aim.up ? t(T.lookFigure, { ...where, name: aim.name }) : T.lookNoFigure;
    return '';
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
    // Into or out of a star system's stage (spec 0040) is always a cut: forty light-years in 100 000 km
    // units is a camera 4e9 units out, past the far plane, with nothing to fly from.
    const keep = compressesFrom(id) || isSystemStage(id) || isSystemStage(stage.worldId)
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

  // --- a stop's own clock (spec 0030) ---------------------------------------------------------

  /**
   * The event type the clock's instant at stop `index` comes from, or null (spec 0037): the stop's
   * own `{event:}`, or, for a stop without `time:`, the latest earlier stop's, because the clock
   * carried on from there. ui/tripframe.js prints the eclipse honesty line from it.
   */
  function instantEventType(index) {
    for (let i = index; i >= 0; i -= 1) {
      const s = run && run.stops[i] && run.stops[i].stop;
      if (!s || s.time === undefined || s.time === null) continue;
      return isEventTime(s.time) ? String(s.time.event).split('.')[0] : null;
    }
    return null;
  }

  // The event the last resolveStopTime() found, so applyStopTime() can keep it on the stop: the
  // pass stop's card describes that pass (noteFor).
  let lastEvent = null;

  function isEventTime(time) {
    return !!time && typeof time === 'object' && time.event !== undefined;
  }

  /**
   * A stop's `time:` as a clock instant, or null when it cannot be had. `now` is the visitor's
   * present; an ISO instant is itself (the validator has already refused anything else); an event
   * reference is the first such event after `nowMs`, plus its offset, from spec 0031's resolver
   * (data/events.js nextEvent, which searches 400 days ahead and computes eclipses in the browser).
   * An event that resolver cannot find -- a launch with no launch list loaded, a type switched off
   * in registry/events.yaml -- is null, and the stop follows `on_unresolved` like a lost target.
   * The loaded records go with the question: a pass or a train is found among them.
   */
  function resolveStopTime(time, nowMs, stops = null) {
    lastEvent = null;
    if (time === 'now') return nowMs;
    // `tonight` (2026-10-06): the coming dark at the visitor's place, or now when it is dark
    // already (sky/lookfor.js). The place is the trip's own, the guess included, so the instant and
    // the line that names the place are about the same ground.
    if (time === 'tonight') {
      const ms = tonightMs(placeOf(), nowMs);
      return isNum(ms) ? ms : null;
    }
    // `night` (2026-10-06): the first full dark of that same night, for a stop about how dark a sky
    // can be. At dusk, which is what `tonight` is, the Milky Way is not out yet anywhere.
    if (time === 'night') {
      const ms = deepNightMs(placeOf(), nowMs);
      return isNum(ms) ? ms : null;
    }
    // `midnight`: the middle of that night, when a shower's radiant is high.
    if (time === 'midnight') {
      const ms = midnightMs(placeOf(), nowMs);
      return isNum(ms) ? ms : null;
    }
    // `daylight` needs the stop's own ground (daylightMs, which applyStopTime asks); asked without
    // one, when the trip is planned, it always resolves.
    if (time === 'daylight') return nowMs;
    if (typeof time === 'string') {
      const ms = Date.parse(time);
      return Number.isFinite(ms) ? ms : null;
    }
    if (isEventTime(time)) {
      const [type, which] = String(time.event).split('.');
      if (which !== 'next') return null;
      const records = typeof ctx.records === 'function' ? ctx.records() : [];
      // `kind:` (spec 0037) narrows an eclipse: `{event: solar-eclipse.next, kind: total}`. The
      // place is the one the trip's ground stops use, the guess included (spec 0038): a pass over
      // "your place" must be over the place the card names.
      // `after: <stop id>` (internal #384): counted from the instant an EARLIER stop of this trip
      // resolves to, not from the visitor's clock. "Half a year on" is the December solstice after
      // the June one the first stop found; counted from the clock it would, from July to December,
      // be the one BEFORE it, under a card that says six months later. The earlier stop is itself
      // resolved from the visitor's clock, so the pair is the same whenever the trip is planned.
      let fromMs = nowMs;
      if (time.after !== undefined && time.after !== null) {
        const list = stops || (run && run.tour && run.tour.stops) || [];
        const at = list.findIndex((s) => s && s.id === time.after);
        const earlier = at >= 0 ? list[at] : null;
        // Only a stop before this one, with an instant of its own (the validator refuses the rest).
        const own = earlier && earlier.time !== undefined && earlier.time !== null && earlier.time !== time
          && !(isEventTime(earlier.time) && earlier.time.after === time.after)
          ? resolveStopTime(earlier.time, nowMs, list.slice(0, at)) : null;
        if (own === null) { lastEvent = null; return null; }
        fromMs = own;
      }
      const ev = nextEvent(type, fromMs, placeOf(), records, { kind: time.kind || null });
      lastEvent = ev;
      return ev && isNum(ev.t) ? ev.t + (Number(time.offset_s) || 0) * 1000 : null;
    }
    return null;
  }

  /**
   * `time: daylight` (2026-10-06, public #443): THE NEXT HOUR THE SUN IS UP OVER THIS STOP'S GROUND.
   *
   * A lander stands where it landed, and half the time that is in the dark: the walk of every stop
   * on 2026-10-06 found five of the Moon trip's nine landers, and all three of the odd things left
   * on the Moon, standing on a black disc, because Tranquility Base was two days into its night.
   * No camera angle lights a place the Sun is not shining on. So such a stop is shown at the first
   * hour from the visitor's clock at which the Sun is at least DAYLIGHT_MIN_DEG above that ground:
   * now, when it already is, and otherwise up to a lunar day ahead. The frame prints the instant
   * ("Shown at"), as it does for every stop that moves the clock, so nobody is told this is now.
   *
   * The ground is the subject itself when it stands on a world (a site, a thing left there), or the
   * place a world stop stands `over:`. A stop with neither has no ground and is shown as it is, and
   * so is one where the Sun does not come up in the search (a pole in its winter).
   */
  const DAYLIGHT_MIN_DEG = 14;
  const DAYLIGHT_STEP_MS = 3600e3;
  const DAYLIGHT_SEARCH_MS = 30 * 86400e3;
  function daylightMs(entry, baseMs) {
    const subject = entry.subject;
    const stop = entry.stop;
    if (!subject) return baseMs;
    const world = worldById.get(subject.worldId);
    if (!world) return baseMs;
    const over = subject.kind === 'world' && Array.isArray(stop.over) && isNum(stop.over[0]) && isNum(stop.over[1]) ? stop.over : null;
    const groundAt = (tMs) => {
      if (over) {
        const p = fixed({ id: 'over', propagator: 'fixed', frame: `${subject.id}-fixed`, fixed: { latDeg: over[0], lonDeg: over[1], altKm: 0 } }, tMs);
        return p ? stage.toScene(p, p.frame, tMs) : null;
      }
      return subject.kind === 'world' ? null : subject.position(tMs);
    };
    const height = (tMs) => {
      const at = groundAt(tMs);
      const centreKm = positionOf(world.id, tMs);
      const sun = sunScene(tMs);
      if (!at || !centreKm || !sun) return null;
      const centre = stage.toScene(centreKm, centreKm.frame, tMs);
      const up = new THREE.Vector3().copy(at).sub(centre);
      // Not standing on the world at all (a craft far from it): there is no ground to light.
      if (!over && Math.abs(up.length() * stage.unitKm - world.radiusKm) > world.radiusKm * 0.1) return null;
      return up.normalize().dot(new THREE.Vector3().copy(sun).sub(at).normalize());
    };
    const want = Math.sin(DAYLIGHT_MIN_DEG * DEG);
    const first = height(baseMs);
    if (first === null || first >= want) return baseMs;
    for (let t = baseMs + DAYLIGHT_STEP_MS; t <= baseMs + DAYLIGHT_SEARCH_MS; t += DAYLIGHT_STEP_MS) {
      const h = height(t);
      if (h !== null && h >= want) return t;
    }
    return baseMs;
  }

  /** The fastest this stop's subject may be shown, on the stage it is flown on. See the caps above. */
  function rateCeilingFor(entry) {
    const record = entry.subject && entry.subject.record;
    const layer = record && Array.isArray(ctx.layers) ? ctx.layers.find((l) => l.id === record.layer) : null;
    if ((record && record.propagator === 'sgp4') || (layer && layer.propagator === 'sgp4')) {
      return CLOCK_RATE_CEILING;
    }
    if (stage.worldId === 'sun' || isLadderStage(stage.worldId)) return STOP_RATE_MAX;
    return STOP_RATE_WORLD_CEILING;
  }

  /**
   * SET THE CLOCK FOR A STOP, before its shot is composed, so the key light, the subject's place
   * and the arrival are all this instant's. Returns 'untouched', 'moved' or 'unresolved'.
   *
   * ONCE A STOP HAS TOUCHED THE CLOCK THE TRIP OWNS IT UNTIL LEAVE (spec 0030 requirement 4): a
   * later stop without `rate:` runs at 1, and one without `time:` carries on from wherever the
   * clock got to. A trip in which no stop names either never gets here and is exactly as before.
   *
   * `run.clockMovedInstant` IS THE WHOLE RESTORE DESIGN. restoreClock() already puts back mode,
   * rate and paused, and puts back the INSTANT only when this is true -- the guard spec 0025's
   * review measured (-89 841 ms on leave when a trip that changed nothing rewound the clock). A
   * trip that took the clock did change it, whether by naming an instant or by running it faster,
   * so it is set the first time either happens, and leaving then lands the visitor exactly where
   * they were: back on live if they were live.
   *
   * THE CLOCK IS HELD WHILE THE CAMERA FLIES, whenever the stop runs it faster than life. A flight
   * is 1.5 to 6 s; at a year a minute that is up to 37 days, and the Earth would have moved 94
   * million km off the point the flight was composed for, so the camera would arrive at empty
   * space and `follow` would snap it across. Held, the shot lands on the instant it was composed
   * at, and arrived() lets the clock run under the card, which is where the motion is the point.
   */
  function applyStopTime(entry) {
    const stop = entry.stop;
    const hasTime = stop.time !== undefined && stop.time !== null;
    const hasRate = isNum(stop.rate);
    if (!hasTime && !hasRate && !run.ownsClock) return 'untouched';
    // The same refusal check_registry.py makes: a trip that loads the active catalogue may not
    // put the app in scrub, which re-propagates 16 587 objects every frame instead of every
    // 100 ms. Should a row ever get past the validator, the clock is left alone here too.
    if (!run.clockAllowed) return 'untouched';
    const c = ctx.clock;
    if (hasTime) {
      if (stop.time === 'now') {
        // The visitor's present is live mode by definition; setRate below takes it into scrub
        // from exactly this instant, which is how the clock itself leaves live (clock.js).
        c.live();
      } else {
        // Counted from the VISITOR'S clock, the one the trip found, not from wherever an earlier
        // stop has run it to (spec 0037, 2026-09-23). Measured on the eclipse trip: its first stop
        // runs at 600x for a sixteen-second card, which carries the clock 2 h 40 min on and PAST
        // the eclipse it was showing, so the next stop's `solar-eclipse.next` counted from there
        // found the following one, a year later. The intro card's count is resolved from the
        // visitor's clock too, so the two now agree.
        const base = run.savedClock ? run.savedClock.t : c.now();
        const ms = stop.time === 'daylight' ? daylightMs(entry, base) : resolveStopTime(stop.time, base, run.tour && run.tour.stops);
        entry.event = stop.time === 'daylight' ? null : lastEvent;
        if (ms === null) return 'unresolved';
        c.goTo(ms);
      }
    }
    const wanted = hasRate ? stop.rate : 1;
    const r = Math.max(0, Math.min(wanted, rateCeilingFor(entry)));
    if (!(r > 0)) return run.ownsClock ? 'moved' : 'untouched';
    if (c.rate !== r) c.setRate(r);
    c.setPaused(r > 1);
    run.ownsClock = true;
    run.clockMovedInstant = true;
    state.clockOwned = true;
    return 'moved';
  }

  /** A stop whose clock runs faster than real time is held still for a visitor who asked for less motion. */
  function holdsUnderReducedMotion() {
    return reducedMotion() && ctx.clock.rate > 1;
  }

  /** The camera has arrived: the clock the flight was holding runs again, unless the trip is paused. */
  function releaseClockHold() {
    if (!run || !run.ownsClock || state.phase === 'paused') return;
    // UNDER REDUCED MOTION A TIMED STOP DOES NOT RUN (public #236, locked decision 3): it lands
    // on its composed instant and stays there, the clock paused; the card and the still picture
    // carry the stop, and the visitor's own scrub still works. A year racing by is motion.
    if (holdsUnderReducedMotion()) return;
    if (ctx.clock.paused) ctx.clock.setPaused(false);
  }

  function isTimedStop(stop) {
    return !!stop && ((stop.time !== undefined && stop.time !== null) || isNum(stop.rate));
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

  /** The deep-sky records a trip stops at (their photographs are asked for at the intro), or null. */
  function picturedStops(stops) {
    const ids = [...new Set(stops.map((entry) => String((entry.stop.target || {}).record || '')).filter((id) => /^dso-/.test(id)))];
    return ids.length ? ids : null;
  }

  /** What a stop asks scene/figures3d.js to draw, or null. */
  function skyOf(stop) {
    if (!stop || (!Array.isArray(stop.figures) && !stop.ecliptic)) return null;
    return {
      figures: Array.isArray(stop.figures) ? stop.figures.slice() : [],
      stars: isNum(stop.figure_stars) ? stop.figure_stars : 3,
      ecliptic: stop.ecliptic === true,
      // Whether the stop looks at the figures' depth (a sky target with `depth_ly`): the frame's
      // line says which of the two pictures this is.
      depth: !!(stop.target && stop.target.sky && isNum(stop.target.depth_ly)),
    };
  }

  /**
   * THE SCENE'S EXTRAS, AS THE FLIGHT TO A STOP BEGINS. A figure both stops share stays up through
   * the flight (the fly-out from Orion keeps Orion's lines, which is the point of it); one only the
   * old stop had fades as the camera leaves; the new stop's own are drawn when it ARRIVES
   * (stopExtrasArrived), so a stroke is never drawn while the camera is still turning. The overlay
   * and the exposure change now: a picture asked for at take-off has the flight to arrive in.
   */
  function stopExtrasLeaving(entry) {
    const next = skyOf(entry.stop);
    const prev = state.sky;
    if (prev && next) {
      const shared = prev.figures.filter((id) => next.figures.includes(id));
      state.sky = { ...prev, figures: shared, ecliptic: prev.ecliptic && next.ecliptic, depth: next.depth };
    } else state.sky = null;
    state.overlay = entry.stop.overlay || null;
    state.exposure = entry.stop.exposure || null;
    state.zoom = isNum(entry.stop.zoom) ? entry.stop.zoom : 1;
    // The portrait of the stop being left goes at take-off (it is pinned to that object and would
    // slide across the flight); the next stop's own arrives with the camera.
    state.portrait = null;
    state.names = entry.stop.names === true;
    // The dots come back at take-off: True size is a look at one stop, not a setting (#290).
    setTrueSize(false);
  }

  // --- True size as a stop's reveal (internal #290) -------------------------------------------
  //
  // On the Sun's stage a trip with `orbits:` draws each planet as a dot (scene/orbitrings.js) and
  // the frame says so. A stop with `true_size: true` puts the dots away a moment after its card is
  // up -- the same setDotScale(0) the scale badge's True size presses (ui/scalebadge.js, which is
  // hidden during a trip) -- and the frame's line becomes what is left: the widest planet's true
  // width on this screen, computed from the camera, never typed. Leaving the stop, pausing nothing,
  // puts the dots back.
  let trueSize = { want: 0, k: 1, from: 1, at: 0, lineAt: 0, mod: null };
  function setTrueSize(on) {
    const want = on ? 0 : 1;
    if (trueSize.want === want && state.trueSize === !!on) return;
    trueSize.want = want;
    trueSize.from = trueSize.k;
    trueSize.at = now();
    state.trueSize = !!on;
    if (!on) state.trueSizeLine = '';
    else if (!trueSize.mod) import('./scalebadge.js').then((m) => { trueSize.mod = m; }).catch(() => { /* the dots still go */ });
    if (reducedMotion()) trueSize.at -= TRUE_SIZE_TWEEN_MS;
    stepTrueSize();
  }

  function stepTrueSize() {
    const rings = ctx.orbitRings;
    // Only while the stop that asked for it is up. A cut to the next stop's stage does not pass
    // through stopExtrasLeaving, and the line then spoke of the Earth's own stage (seen 2026-10-08:
    // "True size: Earth is 621 px wide here" under the stop after).
    if (state.trueSize) {
      const here = run && run.stops[state.index] && run.stops[state.index].stop;
      if (!(here && here.true_size === true && (state.phase === 'dwell' || state.phase === 'paused'))) setTrueSize(false);
    }
    if (trueSize.k !== trueSize.want) {
      const u = Math.min(1, (now() - trueSize.at) / TRUE_SIZE_TWEEN_MS);
      trueSize.k = u >= 1 ? trueSize.want : trueSize.from + (trueSize.want - trueSize.from) * (1 - (1 - u) ** 3);
      if (rings && typeof rings.setDotScale === 'function') rings.setDotScale(trueSize.k);
    }
    if (!state.trueSize || !trueSize.mod || now() - trueSize.lineAt < TRUE_SIZE_REFRESH_MS) return;
    trueSize.lineAt = now();
    const line = trueSizeLine(trueSize.mod);
    if (line !== state.trueSizeLine) { state.trueSizeLine = line; notify(); }
  }

  /** "True size: Venus is 0.3 px wide here", from this trip's planets and the camera now. */
  function trueSizeLine(mod) {
    const unitKm = stage.unitKm;
    if (!ctx.worlds || typeof ctx.worlds.drawnPositionOf !== 'function' || !(unitKm > 0)) return '';
    const worlds = [];
    for (const id of state.orbits) {
      const w = WORLDS.find((row) => row.id === id);
      const p = ctx.worlds.drawnPositionOf(id);
      if (w && p) worlds.push({ id, name: w.display || id, radiusKm: w.radiusKm, distKm: p.distanceTo(ctx.camera.position) * unitKm });
    }
    const st = mod.scaleState({ worlds, markerPx: TRUE_SIZE_MARKER_PX, fovDeg: ctx.camera.fov, viewportH: window.innerHeight });
    return mod.badgeWords(st, true).text || '';
  }

  function stopExtrasArrived(entry) {
    state.sky = skyOf(entry.stop);
    const record = entry.subject && entry.subject.record;
    state.portrait = entry.stop.portrait === true && record ? { id: record.id } : null;
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
    // `hides:` (2026-10-05): layers whose marks would be litter in this trip's picture (the
    // planets of other stars as green dots across a constellation), off for the trip and back
    // on the way out, like the ones it switches on.
    run.hidden = [];
    for (const id of tour.hides || []) {
      // Asked of the layer itself, not of setLayer's answer: only one that WAS on and now is off
      // is the trip's to switch back.
      const was = ctx.isLayerOn(id);
      setLayer(id, false);
      if (was && !ctx.isLayerOn(id)) run.hidden.push(id);
    }
    const clockChange = applyClock(tour, run.savedClock);
    run.clockMovedInstant = clockChange.movedInstant;
    state.clockClamped = clockChange.clamped;
    // Spec 0030 requirement 7, at runtime: see applyStopTime().
    run.clockAllowed = resolved.layers.indexOf('active') === -1;
    run.ownsClock = false;
    state.clockOwned = false;
    state.clockMoves = run.clockAllowed && resolved.stops.some((entry) => isTimedStop(entry.stop));

    state.tourId = tour.id;
    state.tourTitle = tour.title;
    state.orbits = Array.isArray(tour.orbits) ? tour.orbits.slice() : [];
    state.wants = {
      figures: resolved.stops.some((entry) => skyOf(entry.stop)),
      overlay: resolved.stops.some((entry) => entry.stop.overlay),
      spaceWeather: resolved.stops.some((entry) => entry.stop.live_note === 'space-weather' || entry.stop.live_note === 'aurora'),
      portrait: resolved.stops.some((entry) => entry.stop.portrait === true),
      // A stop at a deep-sky object: its photograph's row (the credit) is wanted before it lands.
      pictures: picturedStops(resolved.stops),
    };
    state.portrait = null;
    state.names = false;
    run.ground = false;
    state.ground = false;
    state.sky = null;
    state.overlay = null;
    state.exposure = null;
    state.count = resolved.stops.length;
    state.stops = resolved.stops.map((entry) => ({ id: entry.stop.id, title: (entry.stop.card || {}).title || entry.stop.id, dwellMs: entry.stop.dwell_ms }));
    state.estimateMs = estimateOf(resolved.stops);
    state.dropped = resolved.dropped;
    state.pacing = pacingFor(tour);
    state.reducedMotion = reducedMotion();
    state.reason = null;
    state.held = null;
    state.index = -1;
    state.stopId = null;
    state.stopEventType = null;
    state.stopTitle = null;

    // THE INTRO IS A PHASE, not a courtesy. It makes the trip a decision rather than an ambush,
    // it states a count that has already been resolved, and -- the reason it is here rather than
    // in the frame -- it is where the mode furniture goes up, so the button a visitor presses to
    // start is inside the frame and not inside the panel that is about to go `inert` under them.
    state.phase = 'intro';
    notify();
    return plannedShape(resolved);
  }

  /** Leave the intro card. The only way into the first flight -- which is to the first stop,
   * unless jumpTo() was called during the intro (a deep link into a later stop). */
  function play() {
    if (!run || state.phase !== 'intro') return;
    const first = run.startAt || 0;
    run.startAt = 0;
    startTicking();
    goTo(first);
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
    return reducedMotion() ? 'reader' : pacingOverride || tour.pacing || 'auto';
  }

  /**
   * A PRESENTER PACES THE TRIP (public #441, 2026-10-06). In present mode the person with the
   * clicker decides when the room has finished looking, so the frame asks for `reader`: every stop
   * waits for Next. `auto` hands it back to the dwell, `null` to the registry's own pacing. It
   * takes effect at once: a countdown that is running is dropped, and a stop that was waiting
   * starts one. Reduced motion still wins (pacingFor).
   */
  let pacingOverride = null;
  function setPacing(mode) {
    pacingOverride = mode === 'reader' || mode === 'auto' ? mode : null;
    if (!run) return;
    const was = state.pacing;
    state.pacing = pacingFor(run.tour);
    if (was === state.pacing) return;
    if (state.phase === 'dwell' && state.index >= 0) {
      if (state.pacing === 'reader' && run.dwellTimer) {
        timers = timers.filter((timer) => timer !== run.dwellTimer);
        run.dwellTimer = null;
        run.dwellMs = 0;
      } else if (state.pacing === 'auto' && !run.dwellTimer) {
        run.dwellMs = run.stops[state.index].stop.dwell_ms;
        run.dwellTimer = after(run.dwellMs, () => advance());
      }
    }
    notify();
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
    state.stopEventType = instantEventType(index);
    state.stopNote = null;
    state.generation = gen;
    state.held = null;
    run.dwellTimer = null;
    run.dwellMs = 0;
    entry.reflown = 0;

    if (ctx.labels && ctx.labels.clearEmphasis) ctx.labels.clearEmphasis();
    // A new chapter, or none: the old line goes now and the new one lands with the stop's title.
    // The same chapter again stays up, so the stops of one chapter do not re-announce it.
    if ((entry.stop.chapter || null) !== state.chapter) state.chapter = null;

    if (entry.held) {
      holdAt(entry);
      return;
    }

    // Before the shot is composed, so every distance in it is in the new stage's unit. Back and
    // Next land here too, so a stop is always seen from its own stage whichever way it is reached.
    //
    // THROUGH BLACK (spec 0034 req 1, 2026-09-23). A stage change frames the new world at once, a
    // cut; inside a trip it now happens inside ui/veil.js's 350 ms to black and 350 ms back, and the
    // flight to the stop starts from rest once the canvas is clear. Under reduced motion there is
    // no veil: the stage cuts, the flight is the rig's cut, and the rig's own 220 ms cross-fade is
    // the one fade (two would be the flicker the preference exists to prevent). `veil` is not
    // PAUSABLE: a pause pressed in the black takes effect on the flight that follows it.
    const nextStage = entry.stop.stage || run.tour.stage;
    // DOWN TO THE GROUND, AND BACK UP, IS A CUT TOO (2026-10-06). A stop with `look:` is seen from
    // the visitor's own street, by the sky view (sky/skyview.js), which puts the camera 1.7 m above
    // the ground with a wider lens: there is no flight between a camera in orbit and one in a
    // garden that is not a fall, so it goes through the same black a stage change does.
    const toGround = wantsGround(entry);
    // ONE TAKE (internal #305, #410). A stop that says `climb: true` is reached by the continuous
    // flight: the camera dollies by ratio from where it is, and scene/climb.js hands it from stage to
    // stage at the joins with its place and direction kept, under a short cross-fade of the two
    // stages' pictures. No veil and no cut. Not to or from the ground, which is still a cut (above).
    if (wantsClimb(entry, nextStage, toGround)) {
      climbToStop(entry, index, nextStage);
      return;
    }
    if (wantsVeil(nextStage) || (toGround !== !!run.ground && canVeil())) {
      state.phase = 'veil';
      // The card of the stop being LEFT goes as the black comes up (2026-09-23): the veil sits under
      // the card (ui/veil.js, z 8), so the old card stayed over the black and on into the next
      // flight until the new title replaced it -- measured in headless Chrome, Europa's card over
      // all 86 samples of the veil into Saturn and 1.0 s of the flight after it, under a frame
      // already titled Saturn. Only here: a flight without a veil keeps the old card until the new
      // title lands, because there the old world is still on the screen under it.
      hideCard();
      notify();
      const mine = gen;
      ctx.veil
        .through(() => {
          if (mine === gen && run && state.index === index) {
            enterStage(nextStage);
            setGround(toGround);
          }
        })
        .then(() => {
          if (mine === gen && run && state.index === index && state.phase === 'veil') flyToStop(entry, index);
        });
      return;
    }
    enterStage(nextStage);
    setGround(toGround);
    flyToStop(entry, index);
  }

  /** Whether there is a black to cut through: a veil, and a visitor who has not asked for less motion. */
  function canVeil() {
    return !!(ctx.veil && typeof ctx.veil.through === 'function' && !reducedMotion());
  }

  /** Whether reaching this stop changes the map's centre, and the veil should cover it. */
  function wantsVeil(nextStage) {
    return !!(run && nextStage && nextStage !== stage.worldId && typeof ctx.setStage === 'function' && canVeil());
  }

  /** Whether this stop is reached by the continuous flight: it asks, and both ends are on the chain. */
  function wantsClimb(entry, nextStage, toGround) {
    return !!(run && entry && entry.stop && entry.stop.climb === true && !toGround && !run.ground
      && typeof ctx.wantClimb === 'function' && CHAIN.includes(stage.worldId) && CHAIN.includes(nextStage));
  }

  /** Stop a climb where it is (a pause, a jump, leaving), without its callbacks. */
  function dropClimb() {
    climbing = false;
    if (ctx.climb && ctx.climb.state.active) ctx.climb.cancel('cancelled');
  }

  /**
   * THE FLIGHT OF A `climb:` STOP. The stop's clock first, as any stop; then one dolly, by ratio, to
   * the stop's distance from its subject, with the look-at point carried from the last subject to
   * this one as the distance allows (scene/handoff.js targetShare). The stage is whatever the
   * camera's distance says on the way and the stop's own on arrival. Under reduced motion it is one
   * cut under one fade. Arrival is the same arrived() every stop uses.
   */
  function climbToStop(entry, index, nextStage) {
    const clockChange = applyStopTime(entry);
    if (clockChange === 'unresolved') {
      holdAt(entry);
      return;
    }
    if (clockChange === 'moved' && ctx.worlds && typeof ctx.worlds.update === 'function') {
      try { ctx.worlds.update(ctx.clock.now()); } catch { /* the next frame does it */ }
    }
    state.phase = 'flight';
    entry.shot = null;
    stopExtrasLeaving(entry);
    letGoOfTheLastSubject(entry);
    rig.stopOrbit('replaced');
    driftRun = null;
    upTween = null;
    climbing = true;
    const mine = gen;
    run.flightSeq = (run.flightSeq || 0) + 1;
    const seq = run.flightSeq;
    const dKm = stopDistanceKm(entry.stop, entry.subject);
    const fromKm = Math.max(1e-6, rig.state.distance * stage.unitKm);
    const ms = reducedMotion() ? 0 : clamp(Math.abs(Math.log10(dKm / fromKm)) * CLIMB_MS_PER_DECADE, CLIMB_MIN_MS, CLIMB_MAX_MS);
    const before = stage.worldId;
    ctx.wantClimb().then((climb) => {
      if (mine !== gen || !run || state.index !== index || state.phase !== 'flight') return;
      if (!climb) {
        // The module did not arrive: the stop is reached the old way, by a cut.
        climbing = false;
        enterStage(nextStage);
        flyToStop(entry, index);
        return;
      }
      climb.to({
        distanceKm: dKm,
        stage: nextStage,
        toPos: () => entry.subject.position(ctx.clock.now()),
        ms,
        onArrive: guarded(() => {
          climbing = false;
          if (stage.worldId !== before || stage.worldId !== run.savedStage) {
            run.stageChanged = true;
            state.stageChanged = true;
          }
          schedule(() => arrived(index, 'done'));
        }),
        // Somebody else's flight took the camera (scene/climb.js gives way to it): the stop is
        // still to be reached, the old way, from wherever that flight leaves the camera (#322).
        onCancel: guarded(() => {
          climbing = false;
          schedule(() => {
            if (!run || state.phase !== 'flight' || state.index !== index || run.flightSeq !== seq) return;
            enterStage(nextStage);
            flyToStop(entry, index);
          });
        }),
      });
      if (ms > 0) {
        after(ms + FLIGHT_GRACE_MS, () => {
          if (!run || state.phase !== 'flight' || state.index !== index || !climbing) return;
          dropClimb();
          enterStage(nextStage);
          cutTo(entry, index);
        });
        after(ms * TITLE_AT, () => {
          if (!run || state.phase !== 'flight' || state.index !== index) return;
          paintCard(entry, true);
          state.chapter = entry.stop.chapter || null;
          notify();
        });
      }
    });
    notify();
  }

  /** Whether this stop is seen from the visitor's ground: it says `look:`, and there is a sky view and a place. */
  function wantsGround(entry) {
    return !!(entry && entry.stop && entry.stop.look && ctx.skyView && typeof ctx.skyView.enter === 'function' && placeOf());
  }

  /**
   * Hand the camera to the sky view, or take it back. Entering saves the camera's pose (the sky
   * view's own `saved`), so the stop after the ground starts its flight from where the trip was
   * before it went down; leaving the trip from the ground comes back to that pose too.
   */
  function setGround(on) {
    if (!run || !!run.ground === !!on) return;
    const sv = ctx.skyView;
    if (on) {
      rig.stopOrbit('replaced');
      driftRun = null;
      upTween = null;
      run.ground = !!(sv && sv.enter(placeOf()) !== false && sv.active !== false);
    } else {
      if (sv && sv.active && typeof sv.exit === 'function') sv.exit();
      run.ground = false;
    }
    state.ground = !!run.ground;
  }

  /** Turn the sky view to what the stop looks for; a thing under the horizon is faced where it will rise. */
  function aimGround(entry) {
    const place = placeOf();
    const pass = entry.event && entry.event.pass ? entry.event.pass : null;
    const aim = place ? lookTarget(lookOf(entry), place, ctx.clock.now(), pass) : null;
    entry.aim = aim;
    // The kind of sky the stop is about (`darkness:`), and the radiant of the shower it looks for,
    // held over the visitor's own choices for the stop and let go by the next one (or by exit()).
    if (ctx.skyView && typeof ctx.skyView.hold === 'function') {
      const found = showerOf(entry);
      ctx.skyView.hold({ darkness: entry.stop.darkness || null, radiant: found ? found.shower.id : null });
    }
    if (aim && ctx.skyView && typeof ctx.skyView.lookAtDeg === 'function') {
      ctx.skyView.lookAtDeg(aim.azDeg, aim.up ? clamp(aim.altDeg, 6, 80) : 8);
    }
    return aim;
  }

  /**
   * A STOP ON THE GROUND HAS NO FLIGHT. The sky view is already where the visitor stands; the head
   * turns to what the stop is about (the view's own damped turn, a head turn and not a camera
   * move), and the stop arrives on the next frame, through the same arrived() every other stop
   * uses, so the card, the voice and the dwell cannot tell the difference.
   */
  function groundStop(entry, index) {
    state.phase = 'flight';
    entry.shot = null;
    stopExtrasLeaving(entry);
    letGoOfTheLastSubject(entry);
    aimGround(entry);
    notify();
    schedule(() => arrived(index, 'done'));
  }

  /** The rest of goTo(), once the stop's stage is the map's: its clock, its shot, its flight. */
  function flyToStop(entry, index) {
    // The stop's own clock, after the stage (the rate cap depends on it) and BEFORE the shot, whose
    // subject, key light and arrival all read ctx.clock.now().
    const clockChange = applyStopTime(entry);
    if (clockChange === 'unresolved') {
      holdAt(entry);
      return;
    }
    // THE MAP'S ORIGIN FOLLOWS THE CLOCK, AND ONLY ONCE A FRAME (scene/worlds.js update, which
    // puts the stage's world back at the origin). A stop that has just moved the clock twelve
    // hours composes its shot in this same tick: on Mars's stage Mars has by then gone a million
    // kilometres along its orbit and the origin has not, so the shot was aimed a thousand units
    // from the planet under the camera and the flight took an apex to match (found 2026-10-06 by
    // tests/test_planetarium_trips.mjs, the first trip to move the clock on a planet's own stage).
    // So the worlds are brought to the stop's instant before anything is measured.
    if (clockChange === 'moved' && ctx.worlds && typeof ctx.worlds.update === 'function') {
      try { ctx.worlds.update(ctx.clock.now()); } catch { /* the next frame does it */ }
    }

    if (entry.stop.look && run.ground) {
      groundStop(entry, index);
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
    stopExtrasLeaving(entry);
    letGoOfTheLastSubject(entry);
    // The camera rides to the subject the stop is ABOUT, re-aimed every frame (camera.js applyFollow
    // keeps a flight's destination on a moving object). arrived() selects it, which installs the
    // same follow for the dwell; installing it here means nothing else can hold the camera meanwhile.
    rig.follow(() => entry.subject.position(ctx.clock.now()));
    // A cut has no flight to turn the up through: it is set first, so the one pose is the chosen
    // one. Otherwise it turns with the flight.
    const cutting = reducedMotion() || !(shot.ms > 0);
    if (cutting) settleUp(upFor(shot));
    launch(entry, index, shot, shot.ms);
    if (!cutting && upFor(shot)) beginUpTween(upFor(shot), shot.ms);
    if (!cutting && state.phase === 'flight' && state.index === index) beginStretch(shot, index);

    // The title, six tenths of the way in. Skipped under reduced motion and for a cut, where the
    // arrival above has already happened -- synchronously, before flyTo returned -- and the card
    // is painted whole. A wall-clock timer rather than a camera callback, so it pauses and
    // resumes with everything else the trip is holding.
    if (!reducedMotion() && shot.ms > 0) {
      after(shot.ms * TITLE_AT, () => {
        if (!run || state.phase !== 'flight' || state.index !== index) return;
        paintCard(entry, true);
        // The chapter lands with the title: "where am I going" and "which part of the story".
        state.chapter = entry.stop.chapter || null;
        notify();
      });
    }
    notify();
  }

  /**
   * THE STOP BEING LEFT LETS GO, AS THE FLIGHT AWAY FROM IT BEGINS.
   *
   * paintCard() selects each stop's subject on arrival, and nothing put it down again: it stayed
   * selected until the NEXT arrival selected something else. A selection is two things that are
   * right while you are looking at it and wrong the moment you leave:
   *
   *   - `follow`. main.js select() installs it, and camera.js applyFollow() re-aims a running
   *     flight's destination at it every frame -- so the flight to stop n+1 kept its target nailed
   *     to stop n. The distance and the angles flew, the subject did not: MEASURED with the real
   *     machine (tests/test_trip_scale.mjs), Surveyor 1 to Apollo 11 left the camera looking at
   *     Surveyor 1 for the whole flight, 1 915 km from where it was meant to arrive, and then the
   *     arrival's select snapped it across in one frame.
   *   - SELECTED_PX. scene/heroes.js draws a selection 260 px tall whatever the distance, because
   *     it is the thing you came to look at. Pulled back for the next stop and still centred, the
   *     subject being left filled the middle of the screen at a size nothing around it shares. Ivan
   *     reported it on 2026-10-01 from the strangest-things trip: the Beresheet lander drawn across
   *     half the screen, over the Moon's own markers, under a title about Voyager's record. The same
   *     happened to whatever the visitor had selected before pressing Start (the ISS from `#at`,
   *     260 px at the Earth's place from the Moon's stage) for the trip's whole first flight.
   *
   * So the previous subject -- or the visitor's own selection, on the first flight -- is put down
   * here, with its card kept: a flight without a veil holds the old card until the new title lands
   * (goTo), and the card going blank at take-off would be its own small bug. A subject that is the
   * NEXT stop's too (the station trip's `far` then `iss`) is kept, so nothing blinks.
   */
  /**
   * THE RIG'S FLIGHT TO A STOP, AND THE TWO WAYS IT USED TO BE ABLE TO NEVER END (internal #322).
   *
   * `flight` is left by arrived() and by nothing else, and arrived() was reached only from the
   * rig's onArrive. Two things could keep that from coming:
   *
   *   - SOMEBODY ELSE'S FLIGHT. The rig has one flight; any other caller's flyTo replaces the
   *     trip's and the rig says so through onCancel('replaced'). That callback did nothing ("a
   *     cancelled flight is the visitor's hand", and for a hand onUserInput has already paused the
   *     trip): for every other caller the stop sat in `flight` for good, with no flight in the air.
   *     Now a flight that was taken away while the stop is still flying is flown again from where
   *     the camera was left, and after REFLY_MAX of those the stop cuts to its shot.
   *   - TIME. See FLIGHT_GRACE_MS: the stop's own wall-clock timer ends a flight that is overdue.
   *
   * Both are checked a frame later and against `run.flightSeq`: pause() and stop() end the flight
   * with a flight of their own (freezeFlight), and by the next frame the phase or the generation
   * says so.
   */
  function launch(entry, index, shot, ms) {
    run.flightSeq = (run.flightSeq || 0) + 1;
    const seq = run.flightSeq;
    const mine = (fn) => guarded((...args) => { if (run && run.flightSeq === seq) fn(...args); });
    if (ms > 0 && !reducedMotion()) {
      after(ms + FLIGHT_GRACE_MS, mine(() => {
        if (state.phase !== 'flight' || state.index !== index) return;
        cutTo(entry, index);
      }));
    }
    rig.flyTo({
      targetScene: shot.targetScene,
      distance: shot.distance,
      azimuth: shot.azimuth,
      polar: shot.polar,
      ms,
      ease: shot.ease,
      targetDelay: shot.targetDelay,
      apex: shot.apex,
      onArrive: mine((reason) => schedule(() => arrived(index, reason))),
      onCancel: mine(() => schedule(mine(() => {
        if (state.phase !== 'flight' || state.index !== index) return;
        entry.reflown = (entry.reflown || 0) + 1;
        if (entry.reflown > REFLY_MAX) { cutTo(entry, index); return; }
        const again = composeShot(entry);
        if (!again) { holdAt(entry); return; }
        entry.shot = again;
        rig.follow(() => entry.subject.position(ctx.clock.now()));
        launch(entry, index, again, FLIGHT_MIN_MS);
      }))),
    });
  }

  /** The stop's end shot, now, in one frame: what an overdue flight and a third lost one come to. */
  function cutTo(entry, index) {
    dropClimb();
    const shot = composeShot(entry) || entry.shot;
    if (!shot) { holdAt(entry); return; }
    entry.shot = shot;
    // A new number first: the flight this replaces is told 'replaced', and must not fly again.
    run.flightSeq = (run.flightSeq || 0) + 1;
    upTween = null;
    rig.follow(() => entry.subject.position(ctx.clock.now()));
    rig.flyTo({ targetScene: shot.targetScene, distance: shot.distance, azimuth: shot.azimuth, polar: shot.polar, ms: 0 });
    schedule(() => arrived(index, 'skipped'));
  }

  function letGoOfTheLastSubject(entry) {
    const sel = typeof ctx.selected === 'function' ? ctx.selected() : null;
    if (!sel) return;
    const next = entry && entry.subject && entry.subject.record;
    if (next && next.id === sel.id) return;
    if (typeof ctx.deselect === 'function') ctx.deselect({ keepCard: true });
  }

  function holdAt(entry) {
    state.phase = 'held';
    // The flight to the world below must not be held on the stop that was left (see above).
    letGoOfTheLastSubject(null);
    releaseClockHold();
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
    showCard(null, ctx, { lead: { micro: stopMicro(), title: state.held.title, body: state.held.why } });
    // NEVER auto-advance out of a held stop. The visitor presses Next.
    notify();
  }

  function arrived(index, reason) {
    if (!run || state.index !== index || state.phase !== 'flight') return;
    if (reason !== 'done' && reason !== 'skipped') return;
    // A flight collapsed by Next, or slower than the wall clock, ends with the up where it belongs.
    // Not on the ground: there the sky view sets the up, to the visitor's own vertical, every frame.
    if (!run.ground) settleUp(upFor(run.stops[index].shot));
    endStretch();
    state.phase = 'settle';
    // A cut had no k = 0.6 to land the chapter at; it appears with the card (and under reduced
    // motion ui.css makes that an appearance, not a rise).
    state.chapter = run.stops[index].stop.chapter || null;
    // The dwell's timer FIRST (internal #322): `settle` is left by this timer and nothing else, and
    // it used to be set after the card was painted, so a card that threw (a record whose layer was
    // refreshed under it) left the stop in `settle` for good. Now the stop goes on without its card.
    after(SETTLE_MS, () => dwell(index));
    try {
      releaseClockHold();
      stopExtrasArrived(run.stops[index]);
      paintCard(run.stops[index]);
    } catch (err) {
      console.warn('trip: the stop arrived and its card could not be painted:', err && err.message);
    }
    notify();
  }

  function dwell(index) {
    if (!run || state.index !== index) return;
    state.phase = 'dwell';
    const entry = run.stops[index];
    // THE RACK-FOCUS SUBSTITUTE (spec 0034 req 4): the subject's name settles to full size and the
    // rest dim. At the dwell and not at the arrival, because the labels are hidden while the camera
    // moves and come back here (ui.css): a 300 ms settle begun at arrival would be half over
    // before anyone could see it.
    if (ctx.labels && ctx.labels.emphasise) ctx.labels.emphasise(subjectIdOf(entry));
    const stop = entry.stop;
    if (stop.true_size === true) {
      after(TRUE_SIZE_LEAD_MS, () => { if (run && state.phase === 'dwell' && state.index === index) setTrueSize(true); });
    }
    const deg = Number(stop.drift_deg) || 0;
    if (deg > 0 && stop.drift !== 'none') {
      after(DRIFT_LEAD_MS, () => {
        if (!run || state.phase !== 'dwell' || state.index !== index) return;
        const shot = entry.shot || {};
        // A look at the sky has no light to turn towards: it goes on the way `aside_deg` went.
        const sign = entry.subject && entry.subject.kind === 'sky'
          ? ((Number(stop.aside_deg) || 0) < 0 ? -1 : 1)
          : driftSign(
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
      // The longer of the card's own dwell and what holdDwell() was asked for while the camera
      // settled (spec 0069: the stop's narration).
      const floor = run.dwellFloor && run.dwellFloor.index === index && run.dwellFloor.gen === gen ? run.dwellFloor.ms : 0;
      run.dwellMs = Math.max(stop.dwell_ms, floor);
      run.dwellTimer = after(run.dwellMs, () => advance());
    }
    run.dwellFloor = null;
    notify();
  }

  /**
   * HOLD THE STOP THAT IS UP FOR AT LEAST `ms` MORE (spec 0069). The dwell is the time a reader
   * needs for the card; a stop that is being read ALOUD needs the length of its clip, which is
   * longer, and a voice cut off by the next flight is worse than no voice. So whoever plays the
   * clip (audio/narration.js, through ui/tripframe.js) says how long is left of it, and the timer
   * that ends the stop is pushed out to that -- never pulled in: a dwell is only ever lengthened.
   * Asked before the dwell has begun (the camera is settling), it is kept for dwell() to take.
   * The same wall-clock timer as ever, so a pause freezes it and the segment's fill reads it.
   * Reader-paced stops have no timer and nothing to hold. Returns whether anything changed.
   */
  function holdDwell(ms) {
    if (!run || state.index < 0 || !(ms > 0)) return false;
    const timer = run.dwellTimer;
    if (timer && timers.indexOf(timer) !== -1) {
      const left = timer.remaining !== null ? timer.remaining : timer.dueAt - now();
      if (ms <= left) return false;
      const spent = Math.max(0, run.dwellMs - left);
      if (timer.remaining !== null) timer.remaining = ms;
      else timer.dueAt = now() + ms;
      run.dwellMs = spent + ms;
      return true;
    }
    if (state.phase !== 'settle' && state.phase !== 'flight') return false;
    run.dwellFloor = { index: state.index, gen, ms };
    return true;
  }

  /** The id the labels know the stop's subject by: its record's, or the world's own. */
  function subjectIdOf(entry) {
    const subject = entry && entry.subject;
    if (!subject) return null;
    if (subject.record) return subject.record.id;
    return subject.kind === 'world' ? subject.id : null;
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
      if (!flyHome()) finish();
      return;
    }
    clearTimers();
    rig.stopOrbit('replaced');
    driftRun = null;
    goTo(state.index + 1);
  }

  /**
   * THE WAY HOME, IN ONE FLIGHT (internal #304; `return: true` on a trip, registry/tours.yaml).
   *
   * A trip that climbed the whole ladder ended on its last rung, with the end card over the Local
   * Group, and "Leave" then cut to the Earth: the one part of the journey a planetarium film never
   * skips, because the return is where the scale lands. A trip that asks for it comes back the way
   * it went, by the same continuous flight (scene/climb.js toHome: the whole Earth with room round
   * it, on the Earth's stage), and the end card is shown at home.
   *
   * It is a flight of the last stop, not a stop: `flight` at the last index with `state.returning`
   * set, the last card put down, nothing new to read. Only when the trip's own pacing ends the last
   * stop: Next on the last stop is a visitor asking for the end, and gets it at once (next()).
   * Under reduced motion there is no flight; the end card comes where the trip is, as before, and
   * leaving cuts home. A pause holds it and resuming flies it again from where it stopped.
   * Returns whether a flight began.
   */
  function flyHome() {
    if (!run || run.tour.return !== true || reducedMotion() || run.ground) return false;
    if (typeof ctx.wantClimb !== 'function' || !CHAIN.includes(stage.worldId)) return false;
    clearTimers();
    rig.stopOrbit('replaced');
    driftRun = null;
    upTween = null;
    const index = state.index;
    run.returning = true;
    state.returning = true;
    state.phase = 'flight';
    state.chapter = null;
    setTrueSize(false);
    state.sky = null;
    state.overlay = null;
    state.portrait = null;
    state.zoom = 1;
    if (ctx.labels && ctx.labels.clearEmphasis) ctx.labels.clearEmphasis();
    if (typeof ctx.deselect === 'function') ctx.deselect({ keepCard: true });
    // The last stop's subject is fifty million light-years behind: leaving from home must not
    // select it again (stop() would, and a selection is followed).
    lastRecord = null;
    climbing = true;
    run.flightSeq = (run.flightSeq || 0) + 1;
    const seq = run.flightSeq;
    const mine = gen;
    const home = () => {
      if (mine !== gen || !run || run.flightSeq !== seq) return;
      climbing = false;
      run.returning = false;
      state.returning = false;
      // Home is where the visitor started: the end card then has no "Keep flying or go home" to
      // ask (seen 2026-10-08: it asked, over the Earth), and leaving has no stage to put back.
      run.stageChanged = stage.worldId !== run.savedStage;
      state.stageChanged = run.stageChanged;
      finish();
    };
    ctx.wantClimb().then((climb) => {
      if (mine !== gen || !run || state.phase !== 'flight' || state.index !== index || run.flightSeq !== seq) return;
      if (!climb || typeof climb.toHome !== 'function') { home(); return; }
      climb.toHome({ msPerDecade: RETURN_MS_PER_DECADE, onArrive: () => schedule(home), onCancel: () => schedule(home) });
    }, home);
    // Overdue, like any flight (#322): the end card comes where the camera has got to.
    after(RETURN_MAX_MS, home);
    notify();
    return true;
  }

  function finish() {
    if (run) { run.returning = false; state.returning = false; if (climbing) dropClimb(); }
    // The camera does NOT move at the end. Returning home throws away what the trip just spent two
    // minutes earning and is a fourth unrequested camera move after the visitor stopped asking
    // for camera moves. It also does not KEEP moving: Next on the last stop lands here mid-sweep,
    // and the end card said "the camera stays where it is" while it flew on.
    clearTimers();
    freezeFlight();
    rig.stopOrbit('done');
    driftRun = null;
    run.dwellTimer = null;
    state.chapter = null;
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
    // A climb is not collapsed onto its end: the next stop's flight starts from where it has got to.
    dropClimb();
    run.returning = false;
    state.returning = false;
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

  /**
   * Go to a stop by index, from anywhere in the trip -- and from the intro, where nothing is
   * flying yet. A deep link into stop 3 (spec 0032) shows the intro like any other start, so the
   * count and the length are still a decision rather than an ambush; Start then flies to stop 3
   * directly, rather than snapping through stop 1 and flying on from there. Clamped to the stops
   * that resolved today, which can be fewer than the registry's. Returns whether a trip was there
   * to move.
   */
  function jumpTo(to) {
    if (!run) return false;
    const n = Number(to);
    const index = clamp(Number.isFinite(n) ? Math.trunc(n) : 0, 0, run.stops.length - 1);
    if (state.phase === 'intro') {
      run.startAt = index;
      writeUrlState();
      return true;
    }
    jump(index);
    return true;
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
    if (pausedDuring === 'flight') { freezeFlight(); dropClimb(); }
    endStretch();
    // The up stops where it is, with the camera; resuming re-flies the stop and turns it from here.
    upTween = null;
    if (driftRun) {
      const doneDeg = ((now() - driftRun.at) / 1000) * driftRun.rate;
      const left = Math.max(0, Math.abs(driftRun.deg) - doneDeg);
      driftRun = left > 0.5 ? { ...driftRun, deg: Math.sign(driftRun.deg) * left } : null;
    }
    rig.stopOrbit('cancelled');
    state.phase = 'paused';
    // A PAUSED TRIP THAT OWNS THE CLOCK PAUSES THE CLOCK. Before spec 0030 pause() froze the
    // flight and not the clock, because the clock was the visitor's; at a year a minute the planets
    // would go on racing under a chip that says "Trip paused". saveClock() holds the visitor's own
    // paused flag and restoreClock() puts it back, so leaving from a pause needs nothing new.
    if (run.ownsClock) ctx.clock.setPaused(true);
    notify();
  }

  function resume() {
    if (!run || state.phase !== 'paused') return;
    state.pausedBy = null;
    const was = pausedDuring;
    pausedDuring = null;
    if (was === 'flight' && run.returning) {
      // The way home was paused: it goes on from where it stopped (flyHome), not back to the stop.
      gen += 1;
      state.generation = gen;
      clearTimers();
      if (!flyHome()) finish();
      return;
    }
    if (was === 'flight' || was === 'held') {
      // Resume flies back to the stop it left, from wherever the visitor moved the camera to.
      jump(state.index);
      return;
    }
    state.phase = was || 'dwell';
    releaseTimers();
    // The other half of pause(): a flight or a held stop re-flies above, and applyStopTime() sets
    // the clock for it again; a dwell carries on, and so does the clock under it.
    if (run.ownsClock && ctx.clock.paused && !holdsUnderReducedMotion()) ctx.clock.setPaused(false);
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

  function stop(reason, opts) {
    if (!run) {
      state.phase = 'idle';
      notify();
      return;
    }
    gen += 1;
    state.generation = gen;
    leaving = true;
    clearTimers();
    dropClimb();
    // Up off the ground first: the sky view gives the camera back where the trip had it before.
    setGround(false);
    if (ctx.labels && ctx.labels.clearEmphasis) ctx.labels.clearEmphasis();
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
    for (const id of run.hidden || []) setLayer(id, true);
    restoreClock(run.savedClock, run.clockMovedInstant);
    // "KEEP FLYING FROM HERE" (public #447, 2026-10-06): `stop(reason, { stay: true })` leaves the
    // map centred where the trip took it, so the camera really does stay where it is, on Mars or
    // among the stars, and the visitor flies on from there. Everything else is still put back: the
    // layers, the clock, the up. The way home is the one every other view has (the home button).
    const staying = !!(opts && opts.stay);
    const stageLeft = !staying && !!(run.stageChanged && run.savedStage && typeof ctx.setStage === 'function');
    if (stageLeft) {
      // Back to the stage the visitor was on. The camera cannot "stay where it is" across a stage
      // change -- the unit changed under it -- so this is the one leave that moves it, and the
      // trip's blurb says so. `leaving`, set at the top of this function, is what keeps the
      // sr:stage listener from re-flying the stop being left in the new stage's units.
      ctx.setStage(run.savedStage);
    } else if (run.savedWorld && !(staying && run.stageChanged)) {
      rig.setWorldRadius(run.savedWorld.radius);
      rig.setWorldCentre(run.savedWorld.centre);
    }

    const record = lastRecord;
    run = null;
    ticking = false;
    state.phase = 'idle';
    state.tourId = null;
    state.tourTitle = null;
    state.orbits = [];
    setTrueSize(false);
    trueSize.k = 1;
    if (ctx.orbitRings && typeof ctx.orbitRings.setDotScale === 'function') ctx.orbitRings.setDotScale(1);
    state.sky = null;
    state.overlay = null;
    state.exposure = null;
    state.zoom = 1;
    state.portrait = null;
    state.names = false;
    state.wants = { figures: false, overlay: false, spaceWeather: false, portrait: false, pictures: false };
    state.ground = false;
    state.stopId = null;
    state.stopEventType = null;
    state.stopTitle = null;
    state.stopNote = null;
    state.index = -1;
    state.count = 0;
    state.estimateMs = 0;
    state.clockClamped = false;
    state.clockMoves = false;
    state.clockOwned = false;
    state.stageChanged = false;
    state.returning = false;
    state.chapter = null;
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
    // The address bar stops naming the trip (spec 0032 req 3). AFTER the select above, whose
    // `sr:select` may write `at`: with the trip gone, what is selected is the visitor's own.
    if (typeof window !== 'undefined') clearUrl(['trip', 'stop']);
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
          state.reason = refusalOf(tour, resolved.stops.length);
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
        state.reason = refusalOf(tour, resolved.stops.length);
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
    if (!run || leaving || switching || climbing || state.index < 0) return;
    gen += 1;
    state.generation = gen;
    clearTimers();
    rig.stopOrbit('cancelled');
    if (rig.finishFlight) rig.finishFlight();
    const entry = run.stops[state.index];
    const shot = composeShot(entry);
    // The generation has moved on, so nothing that was pending will come: a stop with no shot in
    // the new stage is held, said so, and waits for a hand, rather than left in the phase it was in.
    if (!shot) { holdAt(entry); return; }
    entry.shot = shot;
    run.flightSeq = (run.flightSeq || 0) + 1;
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
    jumpTo,
    pause,
    resume,
    plan,
    onChange,
    dwellFraction,
    holdDwell,
    setPacing,
    currentRecordId,
    tours: () => TOURS,
    state,
    dispose,
  };
}
