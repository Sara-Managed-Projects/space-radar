// scene/wind.js -- the wind as streaks that move over the Earth (internal #362, #146).
//
// Contract: createWind({ earth, now?, onChange?, saveData?, reducedMotion?, fetch? }) ->
//             { set(on), state(), update(), dispose() }
//   state() -> the same shape as scene/earthoverlay.js state(), with id 'wind', so the legend and
//   the one honest sentence (ui/overlaylegend.js) print it as they print a GIBS map.
// Also exported, pure, for tests/test_wind.mjs: WIND_ID, SPEEDUP, COUNT, TRAIL, TRAIL_DT, localOf(lat, lon,
//   out, at), rampAt(speed) -> [r, g, b], WIND_LEGEND
//
// OFF THE FIRST VISIT. main.js imports this file when "Wind" is chosen under Earth data in What
// to show, and only then is the one request of data/wind.js made (169 kB, from a NOAA-funded
// server in Hawaii; that file says what was tested and what the terms are).
//
// WHAT IS DRAWN. A few hundred streaks, each a short tail behind a point that the model's wind
// carries: where the air ten metres up would go. Colour is speed, on the legend's ramp. THE
// MOTION IS SPED UP, and the sentence under the legend says by how much (a day of wind a second):
// at true speed a gale crosses a pixel in minutes. A streak lives a few seconds and starts again somewhere else, so
// the picture is a texture of the flow, not parcels of air anybody tracked. With reduced motion
// asked for nothing moves: each streak is drawn once, as a longer piece of the same flow line.
//
// It is one overlay among the others (Windy's rule, docs/inspirations.md: one at a time), on
// the Earth's own turning frame, hidden behind the globe by the Earth's depth.

import * as THREE from '../../vendor/three.module.min.js';
import { WIND, fetchWind, stepWind, sampleWind } from '../data/wind.js';

export const WIND_ID = WIND.id;
/**
 * How much faster than the air the streaks move: one second on screen is a day of wind. At three
 * hours a second (the first cut, seen in headless Chrome 2026-10-07) a mean wind of 6 m/s moved a
 * streak half a degree in a second, three pixels on a whole Earth, and the globe looked untouched.
 * At a day a second it is five degrees: the trades and the westerlies read as currents.
 */
export const SPEEDUP = 86400;
/** How many streaks, how many pieces in each tail, and how often a tail gains a piece (seconds). */
export const COUNT = 1200;
export const TRAIL = 8;
export const TRAIL_DT = 0.12;
/** Just above the data overlays' shell (scene/earthoverlay.js SHELL_SCALE 1.003). */
export const SHELL_SCALE = 1.006;
const LIFE_S = [2.5, 6];
const FADE_MS = 900;
const OPACITY = 0.95;
/** The legend's ramp: calm air in the storm layer's periwinkle, through white, to rocket yellow. */
export const WIND_LEGEND = { unit: 'm/s', low: '0', high: String(WIND.speedMax), stops: ['#5E78C8', '#9DB4FF', '#E8ECF2', '#FFD166'] };

const DEG = Math.PI / 180;
const STOPS = WIND_LEGEND.stops.map((h) => [parseInt(h.slice(1, 3), 16) / 255, parseInt(h.slice(3, 5), 16) / 255, parseInt(h.slice(5, 7), 16) / 255]);

/** A speed in m/s as a colour on the legend's ramp. */
export function rampAt(speed) {
  const x = Math.min(1, Math.max(0, speed / WIND.speedMax)) * (STOPS.length - 1);
  const i = Math.min(STOPS.length - 2, Math.floor(x));
  const f = x - i;
  return [0, 1, 2].map((k) => STOPS[i][k] + (STOPS[i + 1][k] - STOPS[i][k]) * f);
}

/**
 * A place as a point in the Earth mesh's own frame (scene/earth.js: +X at longitude 0, +Y the
 * north pole, -Z at 90 E), written into `out` at index `at`.
 */
export function localOf(latDeg, lonDeg, out, at = 0, r = 1) {
  const lat = latDeg * DEG;
  const lon = lonDeg * DEG;
  const cl = Math.cos(lat);
  out[at] = r * cl * Math.cos(lon);
  out[at + 1] = r * Math.sin(lat);
  out[at + 2] = -r * cl * Math.sin(lon);
  return out;
}

/** A random place, uniform over the sphere (not over the map: the poles are not crowded). */
function randomPlace(rand) {
  return { latDeg: Math.asin(2 * rand() - 1) / DEG, lonDeg: rand() * 360 - 180 };
}

export function createWind(opts = {}) {
  const getEarth = typeof opts.earth === 'function' ? opts.earth : () => null;
  const nowMs = typeof opts.now === 'function' ? opts.now : () => Date.now();
  const onChange = typeof opts.onChange === 'function' ? opts.onChange : () => {};
  const still = !!opts.reducedMotion;
  const count = opts.saveData ? Math.round(COUNT / 2) : COUNT;
  const rand = typeof opts.random === 'function' ? opts.random : Math.random;
  const tick = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

  let lines = null;
  let grid = null;
  let wanted = false;
  let status = 'off';
  let token = 0;
  let fade = { from: 0, to: 0, at: 0 };
  let last = 0;
  // Per streak: TRAIL + 1 places (newest first), its age and its life.
  const places = new Float32Array(count * (TRAIL + 1) * 2);
  const speeds = new Float32Array(count);
  const age = new Float32Array(count);
  const life = new Float32Array(count);
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
    lines.name = 'earth:wind';
    lines.renderOrder = 2;
    lines.scale.setScalar(SHELL_SCALE);
    lines.frustumCulled = false;
    lines.visible = false;
    earth.add(lines);
    return lines;
  }

  function spawn(i, seedTrail) {
    const p = randomPlace(rand);
    const base = i * (TRAIL + 1) * 2;
    for (let k = 0; k <= TRAIL; k += 1) { places[base + k * 2] = p.latDeg; places[base + k * 2 + 1] = p.lonDeg; }
    age[i] = 0;
    life[i] = LIFE_S[0] + rand() * (LIFE_S[1] - LIFE_S[0]);
    speeds[i] = sampleWind(grid, p.latDeg, p.lonDeg).speed;
    // Standing still (reduced motion), or on the first frame: the tail is the flow line already,
    // a piece every TRAIL_DT as it would be in motion (twice as long when it will not move).
    if (seedTrail) for (let k = 0; k < TRAIL; k += 1) { grow(i); advance(i, TRAIL_DT * (still ? 2 : 1)); }
  }

  /** The tail gains a piece where the head is now, and loses its oldest. */
  function grow(i) {
    const base = i * (TRAIL + 1) * 2;
    for (let k = TRAIL; k > 0; k -= 1) { places[base + k * 2] = places[base + (k - 1) * 2]; places[base + k * 2 + 1] = places[base + (k - 1) * 2 + 1]; }
  }

  /** The head moves with the wind; the tail stays where the air has been. */
  function advance(i, dtS) {
    const base = i * (TRAIL + 1) * 2;
    const to = stepWind(grid, places[base], places[base + 1], dtS * SPEEDUP);
    places[base] = to.latDeg;
    places[base + 1] = to.lonDeg;
    speeds[i] = to.speed;
  }

  function write(i) {
    const base = i * (TRAIL + 1) * 2;
    const [r, g, b] = rampAt(speeds[i]);
    // In and out over the first and last fifth of its life, so nothing pops.
    const t = life[i] > 0 ? age[i] / life[i] : 1;
    const breath = still ? 1 : Math.min(1, t / 0.2, (1 - t) / 0.2);
    for (let k = 0; k < TRAIL; k += 1) {
      const o = (i * TRAIL + k) * 6;
      localOf(places[base + k * 2], places[base + k * 2 + 1], pos, o);
      localOf(places[base + (k + 1) * 2], places[base + (k + 1) * 2 + 1], pos, o + 3);
      const c = (i * TRAIL + k) * 8;
      const a0 = Math.max(0, breath) * (1 - k / TRAIL);
      const a1 = Math.max(0, breath) * (1 - (k + 1) / TRAIL);
      col[c] = r; col[c + 1] = g; col[c + 2] = b; col[c + 3] = a0;
      col[c + 4] = r; col[c + 5] = g; col[c + 6] = b; col[c + 7] = a1;
    }
  }

  function seed() {
    for (let i = 0; i < count; i += 1) { spawn(i, true); age[i] = still ? 0 : rand() * life[i]; write(i); }
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;
  }

  /** Show the wind, or take it away. */
  function set(on) {
    if (!!on === wanted) return;
    wanted = !!on;
    const my = ++token;
    if (!wanted) { status = 'off'; fade = { from: lines ? lines.material.opacity : 0, to: 0, at: tick() }; onChange(); return; }
    if (!ensureLines()) { status = 'no-earth'; onChange(); return; }
    // The field already here is kept while it is the forecast hour's.
    if (grid && Math.abs(nowMs() - grid.timeMs) < WIND.cadenceMs) { status = 'shown'; fade = { from: lines.material.opacity, to: OPACITY, at: tick() }; onChange(); return; }
    status = 'loading';
    onChange();
    fetchWind({ fetch: opts.fetch, nowMs: nowMs(), retryMs: opts.retryMs }).then((g) => {
      if (my !== token) return;
      grid = g;
      seed();
      status = 'shown';
      fade = { from: 0, to: OPACITY, at: tick() };
      last = tick();
      onChange();
    }).catch((e) => {
      if (my !== token) return;
      status = 'failed';
      console.warn('wind:', e);
      onChange();
    });
  }

  /** Once a frame: the fade, and every streak a step along the wind. */
  function update() {
    if (!lines) return;
    const now = tick();
    const k = Math.min(1, (now - fade.at) / FADE_MS);
    lines.material.opacity = fade.from + (fade.to - fade.from) * (k * k * (3 - 2 * k));
    lines.visible = lines.material.opacity > 0.003 && !!grid;
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
      if (age[i] >= life[i]) spawn(i, false);
      else { if (piece) grow(i); advance(i, dtS); }
      write(i);
    }
    lines.geometry.attributes.position.needsUpdate = true;
    lines.geometry.attributes.color.needsUpdate = true;
  }

  function state() {
    return {
      id: wanted ? WIND_ID : null,
      status,
      kind: 'wind',
      cls: 'modelled',
      legend: wanted ? WIND_LEGEND : null,
      credit: WIND.credit,
      rule: 'hour',
      date: grid ? grid.timeMs : null,
      // The words are the legend's (ui/overlaylegend.js): this module writes none.
      dateWords: '',
      still,
      speedup: SPEEDUP,
      meanSpeed: grid ? grid.meanSpeed : null,
      maxSpeed: grid ? grid.maxSpeed : null,
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
