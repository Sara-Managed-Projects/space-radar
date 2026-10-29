#!/usr/bin/env node
// 0079 B1: the orbit rows of the small bodies drawn in their measured shapes (internal #1065), from JPL.
//
//   node scripts/fetch-sbdb-rows.mjs OUT.json 21 2867 52246 4179 1620 216 4486 6489 8567 486958 67P
//
// For each designation: the SBDB's elements at full precision (https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=..&phys-par=1&full-prec=1),
// its physical parameters (albedo, extent, colour, spin pole and period, each with the reference SBDB gives), and JPL
// Horizons' heliocentric ecliptic J2000 vector for 2026-10-06 00:00 TDB (the day every other named row was checked on:
// tests/test_remaining_trips.mjs holds two-body motion from the row to within 0.0002 au of it). Node does the fetching
// because the macOS curl here lacks the Sectigo root these JPL hosts chain to; Node ships it.
import fs from 'node:fs';

const UA = { 'user-agent': 'spaceradar-build/1.5 (public JPL data; github.com/Sara-Managed-Projects/space-radar)' };
const get = async (url) => {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`${r.status} ${url}`);
  return r.json();
};
const out = {};
for (const des of process.argv.slice(3)) {
  const isComet = /[A-Z]$/.test(des) && !/^\d+$/.test(des);
  const sb = await get(`https://ssd-api.jpl.nasa.gov/sbdb.api?sstr=${encodeURIComponent(des)}&phys-par=1&full-prec=1&discovery=0`);
  const el = Object.fromEntries(sb.orbit.elements.map((e) => [e.name, Number(e.value)]));
  const phys = Object.fromEntries((sb.phys_par || []).map((p) => [p.name, { value: p.value, ref: p.ref, sigma: p.sigma, units: p.units }]));
  const hcmd = isComet ? `DES=${des};CAP` : `DES=${sb.object.spkid};`;
  const hz = await get(`https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${encodeURIComponent(hcmd)}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='VECTORS'&CENTER='500@10'&START_TIME='2026-10-06 00:00'&STOP_TIME='2026-10-06 00:01'&STEP_SIZE='1 d'&REF_PLANE='ECLIPTIC'&REF_SYSTEM='ICRF'&VEC_TABLE='1'&OUT_UNITS='KM-S'&TIME_TYPE='TDB'`);
  const m = /\$\$SOE\s*\n\s*[\d.]+\s*=\s*A\.D\.[^\n]*\n\s*X\s*=\s*([-+0-9.E]+)\s*Y\s*=\s*([-+0-9.E]+)\s*Z\s*=\s*([-+0-9.E]+)/.exec(hz.result || '');
  // A comet's SBDB elements are of its last perihelion (67P: 2015), too old to carry two-body motion to today; Halley's row
  // is Horizons' osculating elements of JD 2461200.5 for the same reason, and so is this.
  let osc = null;
  if (isComet) {
    const el2 = await get(`https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='${encodeURIComponent(hcmd)}'&OBJ_DATA='NO'&MAKE_EPHEM='YES'&EPHEM_TYPE='ELEMENTS'&CENTER='500@10'&TLIST='2461200.5'&REF_PLANE='ECLIPTIC'&REF_SYSTEM='ICRF'&OUT_UNITS='AU-D'&TIME_TYPE='TDB'`);
    const t = el2.result || '';
    const g = (k) => { const mm = new RegExp(`\\b${k}\\s*=\\s*([-+0-9.E]+)`).exec(t.slice(t.indexOf('$$SOE'))); return mm ? Number(mm[1]) : null; };
    osc = { e: g('EC'), q: g('QR'), i: g('IN'), om: g('OM'), w: g('W'), tp: g('Tp'), n: g('N'), ma: g('MA'), a: g('A') };
  }
  out[des] = {
    osc,
    object: sb.object,
    epochJd: Number(sb.orbit.epoch), solution: String(sb.orbit.soln_date).slice(0, 10), firstObs: sb.orbit.first_obs, lastObs: sb.orbit.last_obs,
    elements: el, phys,
    horizonsKm: m ? [Number(m[1]), Number(m[2]), Number(m[3])].map(Math.round) : null,
    horizonsCommand: hcmd,
  };
  console.log(des, sb.object.fullname, 'epoch', sb.orbit.epoch, 'horizons', out[des].horizonsKm);
}
fs.writeFileSync(process.argv[2], JSON.stringify(out, null, 1));
