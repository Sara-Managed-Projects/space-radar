#!/usr/bin/env node
// scripts/fit-moon-elements.mjs -- where the numbers in site/js/propagate/moons.js come from, and
// the check that they are still right.
//
//   node scripts/fit-moon-elements.mjs           measure the shipped rows against JPL Horizons
//   node scripts/fit-moon-elements.mjs --refit   fit them again from fresh Horizons vectors and
//                                                print new rows, then measure those
//
// Needs the network (ssd.jpl.nasa.gov) and nothing else: no packages. About 30 small Horizons
// queries, a minute or two. Nothing here runs in the browser or in CI.
//
// THE MEASUREMENT uses instants the fit never saw: per moon, 998 over 2024-2030 starting at 03:17
// UT, and 1 002 over 2000-2050 starting 2000-01-03 07:41 UT. Every vector is geometric, relative
// to the planet's body centre (500@499 Mars, 500@699 Saturn, 500@799 Uranus, 500@899 Neptune,
// 500@999 Pluto), in ICRF axes, km, time tags in UT -- the same things moons.js computes.
//
// THE FIT is Levenberg-Marquardt on every x, y and z residual: 4 001 vectors over 2024-2030 plus
// 601 each over 2000-2024 and 2030-2050. It starts from the shipped rows, so a refit is a nudge,
// not a search. The FIRST fit (2026-09-22) started from JPL's mean-element table for the poles and
// the precession periods, scanned the precession rates (they have to be near right before an
// eccentricity can be seen at all) and, for Enceladus, the two periods of its resonance terms,
// which the table does not have; that exploration is not repeated here.
//
// THE TEN ADDED ON 2026-09-22 (Saturn's Mimas, Tethys, Dione, Rhea and Iapetus; Uranus's five)
// were started instead from the DATA, because the exploration above does not generalise. The one-
// off script that did it imported `horizons`, `fit` and `worst` from here -- nothing above runs on
// import -- and seeded each row from about 600 Horizons STATE vectors (VEC_TABLE 2) over
// 2000-2050: the pole from the planet's IAU 2015 axis, then the osculating equinoctial elements in
// that frame at every state, then `a` from their mean, `n` and `L0` from the unwrapped mean
// longitude, and the (k, h) and (q, p) vectors -- both of them, where a moon has two -- from the
// peaks of mean(z e^-i(nu t)) scanned over nu. The long-period longitude terms came from the
// fitted model's own along-track residual, one at a time, strongest period first. That exploration
// is not repeated here either; what IS repeated is the last step, which is the `fit` call below,
// and the shipped rows are a fixed point of it.
//
// Which numbers are free is per moon, as moons.js describes: Titan's, Charon's and all ten of the
// 2026-09-22 moons' poles are held, only Phobos, Deimos and Triton carry the quadratic term, and
// the sine terms and the second (k, h) / (q, p) vectors are per moon.

import { pathToFileURL } from 'node:url';
import { MOON_ELEMENTS, elementsOffsetKm } from '../site/js/propagate/moons.js';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
export const TARGET = {
  phobos: ['401', '500@499'], deimos: ['402', '500@499'], enceladus: ['602', '500@699'],
  titan: ['606', '500@699'], triton: ['801', '500@899'], charon: ['901', '500@999'],
  // Ten more (2026-09-22): Saturn's other big round moons and all five of Uranus's. Saturn's
  // come from SAT441 like Enceladus and Titan; the Uranian five from URA111, the only ephemeris
  // Horizons offers for them over 2000-2050.
  mimas: ['601', '500@699'], tethys: ['603', '500@699'], dione: ['604', '500@699'],
  rhea: ['605', '500@699'], iapetus: ['608', '500@699'],
  miranda: ['705', '500@799'], ariel: ['701', '500@799'], umbriel: ['702', '500@799'],
  titania: ['703', '500@799'], oberon: ['704', '500@799'],
};
const BASE = ['a', 'L0', 'n', 'k0', 'h0', 'wdot', 'q0', 'p0', 'odot'];
const POLE = [...BASE, 'poleRa', 'poleDec'];
const E2 = ['k2', 'h2', 'w2dot'];
const I2 = ['q2', 'p2', 'o2dot'];
const LIB = ['libA', 'libB', 'libNu'];
const LIB2 = [...LIB, 'lib2A', 'lib2B', 'lib2Nu'];
const LIB3 = [...LIB2, 'lib3A', 'lib3B', 'lib3Nu'];
const FREE = {
  phobos: [...POLE, 'c2'],
  deimos: [...POLE, 'c2'],
  enceladus: [...POLE, ...LIB2],
  titan: BASE,
  triton: [...POLE, 'c2'],
  charon: BASE,
  // The ten of 2026-09-22. NONE of them frees its pole: all ten are held at their planet's own IAU
  // 2015 pole, which is where the fit wanted to be anyway and reads as something rather than as
  // nine digits. Freeing it buys between nothing and 700 km (moons.js, THE POLES) and costs the
  // row its meaning -- left free, Iapetus's came out at declination -47 and Titania's 10 degrees
  // off Uranus's, each trading against an inclination nobody could then recognise.
  mimas: [...BASE, ...E2, ...LIB3],
  tethys: [...BASE, ...LIB3],
  dione: [...BASE, ...LIB2],
  rhea: [...BASE, ...E2, ...I2, ...LIB],
  iapetus: [...BASE, ...I2, ...LIB2],
  miranda: [...BASE, ...LIB3],
  ariel: [...BASE, ...E2, ...I2, ...LIB3],
  umbriel: [...BASE, ...E2, ...LIB],
  titania: [...BASE, ...E2, ...LIB2],
  oberon: [...BASE, ...E2, ...LIB],
};
// Finite-difference steps, in each number's own units.
const STEP = {
  a: 1e-3, L0: 1e-6, n: 1e-9, k0: 1e-7, h0: 1e-7, wdot: 1e-8, q0: 1e-7, p0: 1e-7, odot: 1e-8,
  poleRa: 1e-5, poleDec: 1e-5, c2: 1e-12, libA: 1e-6, libB: 1e-6, libNu: 1e-8, lib2A: 1e-6, lib2B: 1e-6, lib2Nu: 1e-9, lib3A: 1e-6, lib3B: 1e-6, lib3Nu: 1e-9,
  k2: 1e-7, h2: 1e-7, w2dot: 1e-8, q2: 1e-7, p2: 1e-7, o2dot: 1e-8,
};

export async function horizons(id, start, stop, steps) {
  const [command, center] = TARGET[id];
  const q = {
    format: 'json', COMMAND: `'${command}'`, OBJ_DATA: "'NO'", MAKE_EPHEM: "'YES'", EPHEM_TYPE: "'VECTORS'",
    CENTER: `'${center}'`, REF_PLANE: "'FRAME'", REF_SYSTEM: "'ICRF'", VEC_TABLE: "'1'", VEC_CORR: "'NONE'",
    OUT_UNITS: "'KM-S'", CSV_FORMAT: "'YES'", VEC_LABELS: "'NO'", TIME_TYPE: "'UT'",
    START_TIME: `'${start}'`, STOP_TIME: `'${stop}'`, STEP_SIZE: `'${steps}'`,
  };
  const url = `${API}?${new URLSearchParams(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Horizons ${res.status} for ${id}`);
  const text = (await res.json()).result || '';
  const block = text.split('$$SOE')[1];
  if (!block) throw new Error(`Horizons returned no vectors for ${id}: ${text.slice(0, 400)}`);
  return block.split('$$EOE')[0].trim().split('\n').map((line) => {
    const f = line.split(',').map((x) => x.trim());
    return { t: (Number(f[0]) - 2440587.5) * 86400000, x: Number(f[2]), y: Number(f[3]), z: Number(f[4]) };
  });
}

function residuals(el, rows) {
  const r = new Float64Array(rows.length * 3);
  rows.forEach((row, i) => {
    const p = elementsOffsetKm(el, row.t);
    r[3 * i] = p.x - row.x; r[3 * i + 1] = p.y - row.y; r[3 * i + 2] = p.z - row.z;
  });
  return r;
}
const sumSq = (r) => r.reduce((s, v) => s + v * v, 0);

function solve(A, b) {
  const n = b.length;
  const M = A.map((row, i) => [...row, b[i]]);
  for (let c = 0; c < n; c++) {
    let piv = c;
    for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[piv][c])) piv = r;
    [M[c], M[piv]] = [M[piv], M[c]];
    for (let r = c + 1; r < n; r++) {
      const f = M[r][c] / M[c][c];
      for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k];
    }
  }
  const x = new Array(n).fill(0);
  for (let r = n - 1; r >= 0; r--) {
    let s = M[r][n];
    for (let k = r + 1; k < n; k++) s -= M[r][k] * x[k];
    x[r] = s / M[r][r];
  }
  return x;
}

export function fit(start, rows, keys) {
  let el = { ...start };
  let r = residuals(el, rows);
  let cost = sumSq(r);
  let mu = 1e-3;
  for (let it = 0; it < 100; it++) {
    const J = keys.map((k) => {
      const r2 = residuals({ ...el, [k]: el[k] + STEP[k] }, rows);
      return r2.map((v, i) => (v - r[i]) / STEP[k]);
    });
    const A = keys.map((_, a) => keys.map((__, b) => J[a].reduce((s, v, i) => s + v * J[b][i], 0)));
    const g = keys.map((_, a) => -J[a].reduce((s, v, i) => s + v * r[i], 0));
    let better = false;
    for (let tries = 0; tries < 12 && !better; tries++) {
      const dx = solve(A.map((row, i) => row.map((v, j) => (i === j ? v * (1 + mu) : v))), g);
      const trial = { ...el };
      keys.forEach((k, i) => { trial[k] += dx[i]; });
      const r2 = residuals(trial, rows);
      const c2 = sumSq(r2);
      if (c2 < cost) {
        const done = (cost - c2) / cost < 1e-12;
        el = trial; r = r2; cost = c2; mu = Math.max(mu / 5, 1e-12); better = true;
        if (done) it = Infinity;
      } else mu *= 8;
    }
    if (!better) break;
  }
  return el;
}

export function worst(el, rows) {
  return rows.reduce((m, row) => {
    const p = elementsOffsetKm(el, row.t);
    return Math.max(m, Math.hypot(p.x - row.x, p.y - row.y, p.z - row.z));
  }, 0);
}

// Nothing above runs on import, so the one-off seeding a NEW moon needs -- the exploration this
// file does not repeat -- can import `horizons`, `fit` and `worst` and drive the same arithmetic
// the shipped rows came out of, rather than growing a second fitter somewhere else.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) await main();

async function main() {
const refit = process.argv.includes('--refit');
const km = (v) => (v < 10 ? v.toFixed(1) : String(Math.round(v)));
for (const id of Object.keys(MOON_ELEMENTS)) {
  const { parent, ...shipped } = MOON_ELEMENTS[id];
  let el = shipped;
  if (refit) {
    const rows = [
      ...await horizons(id, '2024-01-01', '2030-01-01', 4000),
      ...await horizons(id, '2000-01-01', '2024-01-01', 600),
      ...await horizons(id, '2030-01-01', '2050-01-01', 600),
    ];
    el = fit(shipped, rows, FREE[id]);
    const row = Object.entries(el).map(([k, v]) => `${k}: ${Number(v.toPrecision(13))}`).join(', ');
    console.log(`${id}: { parent: '${parent}', ${row} },`);
  }
  const near = await horizons(id, '2024-01-01 03:17', '2030-01-01 03:17', 997);
  const wide = await horizons(id, '2000-01-03 07:41', '2049-12-29 19:13', 1001);
  const year = (y) => worst(el, near.filter((row) => new Date(row.t).getUTCFullYear() === y));
  const w = worst(el, wide);
  console.log(`${id.padEnd(9)} 2026 ${km(year(2026)).padStart(6)} km   2027 ${km(year(2027)).padStart(6)} km   `
    + `2024-2030 ${km(worst(el, near)).padStart(6)} km   2000-2050 ${km(w).padStart(6)} km (${(100 * w / el.a).toFixed(3)} % of a)`);
}
}
