// scene/currents.js -- the sea's currents as streaks that move over the Earth, coloured by how warm the water is.
//
// Contract: createCurrents({ earth, now?, onChange?, saveData?, tier?, reducedMotion?, fetch? }) ->
//             { set(on), state(), update(), dispose() }
//   state() -> the same shape as scene/wind.js state(), with id 'currents' and kind 'currents', so the
//   legend and the one honest sentence (ui/overlaylegend.js) print it as they print the wind.
// Also exported, pure, for tests/test_currents.mjs: CURRENTS_ID, SPEEDUP, COUNT, COUNT_BY_TIER,
//   streakCount(tier, saveData), TRAIL, TRAIL_DT, rampAt(degC) -> [r, g, b], CURRENTS_LEGEND, NO_TEMP
//
// OFF THE FIRST VISIT. main.js imports this file when "Ocean currents" is chosen under Earth data
// in What to show, and only then are the two saved copies of data/currents.js read (262 kB and
// 184 kB, from our own folder; that file says what they are and whose).
//
// WHAT IS DRAWN. The wind's sibling (scene/wind.js, whose frame and shell this borrows): a few
// thousand streaks, each a short tail behind a point that the current carries, where water at the
// surface would go. COLOUR IS THE SEA'S TEMPERATURE where the streak's head is, on the legend's
// ramp, cold blue to warm red: the Gulf Stream is warm water leaving Florida and it is drawn warm.
// THE MOTION IS SPED UP, and the sentence under the legend says by how much (ten days of drift a
// second): at true speed the fastest current on Earth crosses a pixel in hours. A streak's LENGTH is
// therefore its speed: slow water is a dash, the Kuroshio a long line. A streak lives a few seconds
// and starts again somewhere else, so the picture is a texture of the flow, not floats anybody
// tracked. With reduced motion asked for nothing moves: each streak is drawn once, as a longer
// piece of the same flow line.
//
// NEVER ON LAND. A streak starts only where the currents' own grid has a value, and one whose next
// step would touch a cell with none (land, sea ice) stops there and fades: data/currents.js
// stepCurrent returns null. No coastline of ours is consulted; the mask is the data's.
//
// Lines on the Earth's own turning frame, moved on the CPU, hidden behind the globe by the Earth's
// depth: no full-screen pass and no render target (tests/test_contract.mjs holds this file to it).

import * as THREE from '../../vendor/three.module.min.js';
import { localOf, SHELL_SCALE } from './wind.js';
import { CURRENTS, fetchCurrents, stepCurrent, sampleCurrent, sampleTemp } from '../data/currents.js';

export const CURRENTS_ID = CURRENTS.id;
/**
 * How much faster than the water the streaks move: one second on screen is ten days of drift. The
 * sea is slow and uneven: half of it moved at under 0.13 m/s on 2026-10-10 and one point in a
 * hundred at over 1 m/s. At ten days a second the slow half moves a degree a second (eight pixels
 * on a whole Earth) and the Gulf Stream ten: the great currents read as rivers and the rest as a
 * drift. At the wind's day a second nothing in the sea would be seen to move at all.
 */
export const SPEEDUP = 10 * 86400;
/** How many streaks, how many pieces in each tail, and how often a tail gains a piece (seconds). */
export const COUNT = 2500;
/** How many streaks each device tier draws (scene/quality.js): tier 1 is COUNT, the default. Data saving halves it. */
export const COUNT_BY_TIER = [1200, 2500, 5000];
export function streakCount(tier, saveData) {
  const t = Number.isFinite(tier) ? Math.min(COUNT_BY_TIER.length - 1, Math.max(0, Math.round(tier))) : 1;
  return saveData ? Math.round(COUNT_BY_TIER[t] / 2) : COUNT_BY_TIER[t];
}
export const TRAIL = 12;
export const TRAIL_DT = 0.2;
const LIFE_S = [3, 7];
const FADE_MS = 900;
const OPACITY = 0.95;
/** How many random places a new streak may try before it sits this life out: three in ten are land. */
const SPAWN_TRIES = 12;
/**
 * WHERE A STREAK STARTS IS WEIGHTED TOWARD MOVING WATER. Half the sea drifts at under 0.13 m/s and
 * a streak there is a dot; spread evenly, two thousand streaks left the Gulf Stream with a handful
 * and the picture read as specks (drawn and looked at, 2026-10-12). So a place is taken with a
 * chance that rises with its speed, from SLOW_CHANCE in still water to certain at FAST_MS and over.
 * The streaks are therefore densest where the sea moves most. A streak's place, direction, length
 * and colour are the data's; how many there are in a patch of sea is the drawing's choice.
 */
const FAST_MS = 0.4;
const SLOW_CHANCE = 0.12;
/**
 * The legend's ramp, cold to warm: ColorBrewer's seven-class RdYlBu turned round (Cynthia Brewer,
 * colorbrewer2.org, which marks it colour-blind safe: it runs blue to red through pale yellow and
 * never through green; CREDITS.md 4.22). Its ends are -2 C, where sea water freezes, and 30 C.
 */
export const CURRENTS_LEGEND = { unit: '°C', low: '−2', high: String(CURRENTS.tempMax), stops: ['#4575B4', '#91BFDB', '#E0F3F8', '#FFFFBF', '#FEE090', '#FC8D59', '#D73027'] };
/** A streak over water whose temperature the other dataset does not have: a grey that is on no part of the ramp. */
export const NO_TEMP = [0.62, 0.64, 0.68];

const STOPS = CURRENTS_LEGEND.stops.map((h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]);

/** A temperature in degrees C as a colour on the legend's ramp (held at its ends); NO_TEMP when there is none. */
export function rampAt(degC) {
  if (!Number.isFinite(degC)) return NO_TEMP;
  const x = Math.min(1, Math.max(0, (degC - CURRENTS.tempMin) / (CURRENTS.tempMax - CURRENTS.tempMin))) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  return [0, 1, 2].map((k) => STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f);
}

const DEG = Math.PI / 180;

export function createCurrents(opts = {}) {
  const getEarth = typeof opts.earth === 'function' ? opts.earth : () => null;
  const nowMs = typeof opts.now === 'function' ? opts.now : () => Date.now();
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
  const still = !!opts.reducedMotion;
  const count = streakCount(opts.tier, opts.saveData);
  const rand = typeof opts.random === 'function' ? opts.random : Math.random;
  const tick = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let lines = null;
  let flow = null;
  let temp = null;
  let gotAt = -Infinity;
  let tempGaps = 0; // cells that have a current and no temperature near them: their streaks are grey, and the sentence says so
  let wanted = false;
  let status = 'off';
  let token = 0;
  let fade = { from: 0, to: 0, at: 0 };
  let last = 0;
  // Per streak: TRAIL + 1 places (newest first), its age, its life, its colour, and whether it has run aground.
  const places = new Float32Array(count * (TRAIL + 1) * 2);
  const rgb = new Float32Array(count * 3);
  const age = new Float32Array(count);
  const life = new Float32Array(count);
  const aground = new Uint8Array(count);
  const hidden = new Uint8Array(count);
  let tailClock = 0; // seconds since the tails last gained a piece
  const pos = new Float32Array(count * TRAIL * 2 * 3);
  const col = new Float32Array(count * TRAIL * 2 * 4);

  function ensureLines() {
    if (lines) return lines;
    const earth = getEarth();
    if (!earth) return null;
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(col, 4));
    lines = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, opacity: 0, depthWrite: false, toneMapped: false }));
    lines.name = 'earth:currents';
    lines.renderOrder = 2;
    lines.scale.setScalar(SHELL_SCALE);
    lines.frustumCulled = false;
    lines.visible = false;
    earth.add(lines);
    return lines;
  }

  function tint(i) {
    const base = i * (TRAIL + 1) * 2;
    const c = rampAt(sampleTemp(temp, places[base], places[base + 1]));
    rgb[i * 3] = c[0]; rgb[i * 3 + 1] = c[1]; rgb[i * 3 + 2] = c[2];
  }

  function spawn(i, seedTrail) {
    // Uniform over the sphere (not over the map: the poles are not crowded), and only where there is sea.
    let latDeg = 0;
    let lonDeg = 0;
    let wet = false;
    for (let n = 0; n < SPAWN_TRIES && !wet; n += 1) {
      latDeg = Math.asin(2 * rand() - 1) / DEG;
      lonDeg = rand() * 360 - 180;
      const here = sampleCurrent(flow, latDeg, lonDeg);
      wet = !!here && rand() < Math.max(SLOW_CHANCE, Math.min(1, here.speed / FAST_MS));
    }
    const base = i * (TRAIL + 1) * 2;
    for (let k = 0; k <= TRAIL; k += 1) { places[base + k * 2] = latDeg; places[base + k * 2 + 1] = lonDeg; }
    age[i] = 0;
    life[i] = LIFE_S[0] + rand() * (LIFE_S[1] - LIFE_S[0]);
    aground[i] = 0;
    hidden[i] = wet ? 0 : 1;
    if (!wet) return;
    tint(i);
    // Standing still (reduced motion), or on the first frame: the tail is the flow line already,
    // a piece every TRAIL_DT as it would be in motion (twice as long when it will not move).
    if (seedTrail) {
      for (let k = 0; k < TRAIL && !aground[i]; k += 1) { grow(i); advance(i, TRAIL_DT * (still ? 2 : 1)); }
      aground[i] = 0; // a seeded tail that met the shore is simply shorter; it may live its life
    }
  }

  /** The tail gains a piece where the head is now, and loses its oldest. */
  function grow(i) {
    const base = i * (TRAIL + 1) * 2;
    for (let k = TRAIL; k > 0; k -= 1) { places[base + k * 2] = places[base + (k - 1) * 2]; places[base + k * 2 + 1] = places[base + (k - 1) * 2 + 1]; }
  }

  /** The head moves with the current; the tail stays where the water has been. At the shore it stops. */
  const stepped = {};
  function advance(i, dtS) {
    const base = i * (TRAIL + 1) * 2;
    const to = stepCurrent(flow, places[base], places[base + 1], dtS * SPEEDUP, stepped);
    if (!to) { aground[i] = 1; return; }
    places[base] = to.latDeg;
    places[base + 1] = to.lonDeg;
  }

  /** Every vertex of a streak, from its places: when it is born and when its tail gains a piece. */
  function writePlaces(i) {
    const base = i * (TRAIL + 1) * 2;
    for (let k = 0; k < TRAIL; k += 1) {
      const o = (i * TRAIL + k) * 6;
      localOf(places[base + k * 2], places[base + k * 2 + 1], pos, o);
      localOf(places[base + (k + 1) * 2], places[base + (k + 1) * 2 + 1], pos, o + 3);
    }
  }

  /** Between those, only the head has moved: one vertex, not twenty-four (the cost that matters at 5 000 streaks). */
  function writeHead(i) {
    const base = i * (TRAIL + 1) * 2;
    localOf(places[base], places[base + 1], pos, i * TRAIL * 6);
  }

  /** Its colour, and how much of it shows. */
  function writeInk(i) {
    const r = rgb[i * 3];
    const g = rgb[i * 3 + 1];
    const b = rgb[i * 3 + 2];
    // In and out over the first and last fifth of its life, so nothing pops.
    const t = life[i] > 0 ? age[i] / life[i] : 1;
    const breath = hidden[i] ? 0 : still ? 1 : Math.max(0, Math.min(1, t / 0.2, (1 - t) / 0.2));
    for (let k = 0; k < TRAIL; k += 1) {
      const c = (i * TRAIL + k) * 8;
      col[c] = r; col[c + 1] = g; col[c + 2] = b; col[c + 3] = breath * (1 - k / TRAIL);
      col[c + 4] = r; col[c + 5] = g; col[c + 6] = b; col[c + 7] = breath * (1 - (k + 1) / TRAIL);
    }
  }

  function seed() {
    for (let i = 0; i < count; i += 1) { spawn(i, true); age[i] = still ? 0 : rand() * life[i]; writePlaces(i); writeInk(i); }
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;
  }

  /** Show the currents, or take them away. */
  function set(on) {
    if (!!on === wanted) return;
    wanted = !!on;
    const my = ++token;
    if (!wanted) { status = 'off'; fade = { from: lines ? lines.material.opacity : 0, to: 0, at: tick() }; onChange(); return; }
    if (!ensureLines()) { status = 'no-earth'; onChange(); return; }
    // The fields already here are kept for a day: the sources make one a day.
    if (flow && temp && Math.abs(nowMs() - gotAt) < CURRENTS.keepMs) { status = 'shown'; fade = { from: lines.material.opacity, to: OPACITY, at: tick() }; onChange(); return; }
    status = 'loading';
    onChange();
    fetchCurrents({ fetch: opts.fetch, retryMs: opts.retryMs }).then((got) => {
      if (my !== token) return;
      flow = got.flow;
      temp = got.temp;
      gotAt = nowMs();
      tempGaps = 0;
      for (let j = 0; j < flow.nLat; j += 1) {
        for (let i = 0; i < flow.nLon; i += 1) {
          if (!Number.isNaN(flow.u_current[j * flow.nLon + i]) && Number.isNaN(sampleTemp(temp, flow.lat0 + j * flow.stepDeg, flow.lon0 + i * flow.stepDeg))) tempGaps += 1;
        }
      }
      seed();
      status = 'shown';
      fade = { from: 0, to: OPACITY, at: tick() };
      last = tick();
      onChange();
    }).catch((e) => {
      if (my !== token) return;
      status = 'failed';
      console.warn('ocean currents:', e);
      onChange();
    });
  }

  /** Once a frame: the fade, and every streak a step along the current. */
  function update() {
    if (!lines) return;
    const now = tick();
    const k = Math.min(1, (now - fade.at) / FADE_MS);
    lines.material.opacity = fade.from + (fade.to - fade.from) * (k * k * (3 - 2 * k));
    lines.visible = lines.material.opacity > 0.003 && !!flow;
    if (!lines.visible || still || status !== 'shown') { last = now; return; }
    // A frame after a hidden tab is not a leap across an ocean.
    const dtS = Math.min(0.1, Math.max(0, (now - last) / 1000));
    last = now;
    if (dtS <= 0) return;
    tailClock += dtS;
    const piece = tailClock >= TRAIL_DT;
    if (piece) tailClock = 0;
    for (let i = 0; i < count; i += 1) {
      age[i] += dtS;
      if (age[i] >= life[i]) { spawn(i, false); writePlaces(i); }
      else if (!hidden[i] && !aground[i]) {
        if (piece) { grow(i); tint(i); }
        advance(i, dtS);
        // Aground: it goes no further, and is hurried into the fade its life would have ended with.
        if (aground[i]) age[i] = Math.max(age[i], life[i] * 0.8);
        if (piece) writePlaces(i); else writeHead(i);
      }
      writeInk(i);
    }
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;
  }

  function state() {
    return {
      id: wanted ? CURRENTS_ID : null,
      status,
      kind: 'currents',
      // Measurements with the gaps filled in: the sea's height from altimeters, its temperature from radiometers and buoys.
      cls: 'analysed',
      legend: wanted ? CURRENTS_LEGEND : null,
      credit: CURRENTS.credit,
      rule: 'daily',
      date: flow ? flow.timeMs : null,
      tempDate: temp ? temp.timeMs : null,
      // The words are the legend's (ui/overlaylegend.js): this module writes none.
      dateWords: '',
      still,
      speedup: SPEEDUP,
      meanSpeed: flow ? flow.meanSpeed : null,
      tempGaps,
      count,
      opacity: lines ? lines.material.opacity : 0,
    };
  }

  function dispose() {
    token++;
    if (lines) {
      if (lines.parent) lines.parent.remove(lines);
      lines.geometry.dispose();
      lines.material.dispose();
      lines = null;
    }
  }

  return { set, state, update, dispose, lines: () => lines };
}
