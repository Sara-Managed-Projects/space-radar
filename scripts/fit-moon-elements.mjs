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
// to the planet's body centre (500@499 Mars, 500@699 Saturn, 500@899 Neptune, 500@999 Pluto), in
// ICRF axes, km, time tags in UT -- the same things moons.js computes.
//
// THE FIT is Levenberg-Marquardt on every x, y and z residual: 4 001 vectors over 2024-2030 plus
// 601 each over 2000-2024 and 2030-2050. It starts from the shipped rows, so a refit is a nudge,
// not a search. The FIRST fit (2026-09-22) started from JPL's mean-element table for the poles and
// the precession periods, scanned the precession rates (they have to be near right before an
// eccentricity can be seen at all) and, for Enceladus, the two periods of its resonance terms,
// which the table does not have; that exploration is not repeated here. Which numbers are free is
// per moon, as moons.js describes: Titan's and Charon's poles are held (JPL's Laplace pole, IAU
// Pluto pole), and only Phobos, Deimos and Triton carry the quadratic term, only Enceladus the sines.

import { MOON_ELEMENTS, elementsOffsetKm } from '../site/js/propagate/moons.js';

const API = 'https://ssd.jpl.nasa.gov/api/horizons.api';
const TARGET = {
  phobos: ['401', '500@499'], deimos: ['402', '500@499'], enceladus: ['602', '500@699'],
  titan: ['606', '500@699'], triton: ['801', '500@899'], charon: ['901', '500@999'],
};
const BASE = ['a', 'L0', 'n', 'k0', 'h0', 'wdot', 'q0', 'p0', 'odot'];
const FREE = {
  phobos: [...BASE, 'poleRa', 'poleDec', 'c2'],
  deimos: [...BASE, 'poleRa', 'poleDec', 'c2'],
  enceladus: [...BASE, 'poleRa', 'poleDec', 'libA', 'libB', 'libNu', 'lib2A', 'lib2B', 'lib2Nu'],
  titan: BASE,
  triton: [...BASE, 'poleRa', 'poleDec', 'c2'],
  charon: BASE,
};
// Finite-difference steps, in each number's own units.
const STEP = {
  a: 1e-3, L0: 1e-6, n: 1e-9, k0: 1e-7, h0: 1e-7, wdot: 1e-8, q0: 1e-7, p0: 1e-7, odot: 1e-8,
  poleRa: 1e-5, poleDec: 1e-5, c2: 1e-12, libA: 1e-6, libB: 1e-6, libNu: 1e-8, lib2A: 1e-6, lib2B: 1e-6, lib2Nu: 1e-9,
};

async function horizons(id, start, stop, steps) {
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

function fit(start, rows, keys) {
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

function worst(el, rows) {
  return rows.reduce((m, row) => {
    const p = elementsOffsetKm(el, row.t);
    return Math.max(m, Math.hypot(p.x - row.x, p.y - row.y, p.z - row.z));
  }, 0);
}

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
