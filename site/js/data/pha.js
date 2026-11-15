// data/pha.js -- the potentially hazardous asteroids (release 2.1.0, internal #37, stage A7's first consumer).
//
// LOADED ON DEMAND, NEVER AT BOOT. data/layers.js gives the `pha` layer a `fetchLazy` that imports this module and calls
// fetchPha(); main.js fetches it when the visitor ticks the layer's box (TICKED_LAYERS). The file is site/data/pha.json, written by
// scripts/gen_pha.py, which says where every number in it was read (NASA/JPL Small-Body Database and Horizons, public domain).
//
// A RECORD. klass `asteroid`, propagator `kepler`, frame `sun-inertial`: JPL's heliocentric orbit at one epoch (JD 2461200.5), carried
// by two-body motion. Called `inferred` in its place, because a close pass to a planet bends an orbit and the place drifts from
// JPL's with the months from the epoch (tests/test_pha.mjs holds the drift against Horizons). `neo: true` (every PHA is a
// near-Earth object), so the card's first sentence is the asteroid card's own. The rows that data/sample.js already draws by
// name (Apophis, Bennu ...) are not made again here.
//
// "Potentially hazardous" is a definition, not a forecast, and the card says so: an orbit that comes within 0.05 au of the Earth's
// and a rock brighter than absolute magnitude 22 (CNEOS, https://cneos.jpl.nasa.gov/about/neo_groups.html, read 2026-11-15). The SBDB's
// flag also holds 32 rows whose H has since moved to 22.1 to 22.6, so the card prints each row's own H and does not say "brighter than 22".

import { timeText } from '../copy/en.js';
import { NAMED_ASTEROIDS } from './sample.js';

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const DAY_MS = 86400000;
const MU_SUN = 1.32712440018e11;
const jdToMs = (jd) => (jd - 2440587.5) * DAY_MS;
/** 1 au in lunar distances (384 400 km), for the sentence "passes within 11 times the Moon's distance". */
const LD_KM = 384400;

const CLASS_WORDS = { APO: 'Apollo', ATE: 'Aten', AMO: 'Amor', IEO: 'Atira' };

function rowReader(json) {
  const idx = Object.fromEntries(json.cols.map((c, i) => [c, i]));
  return (r) => Object.fromEntries(Object.keys(idx).map((c) => [c, r[idx[c]]]));
}

/** Words for the closest the orbits can come: "about 0.0338 au, 13 times the Moon's distance". Pure. */
export function moidWords(moidAu) {
  const km = moidAu * AU_KM;
  const ld = km / LD_KM;
  const n = ld >= 10 ? Math.round(ld) : Math.round(ld * 10) / 10;
  return `${moidAu.toFixed(4)} AU (${n} times the Moon's distance)`;
}

/**
 * The records of site/data/pha.json. Pure.
 * @param {Object} json the parsed file
 * @returns {Array<Object>}
 */
export function buildPha(json) {
  const read = timeText.longDate(Date.parse(`${json.read}T12:00:00Z`));
  const get = rowReader(json);
  const epochMs = jdToMs(json.epochJd);
  const epochWords = timeText.longDate(epochMs + 12 * 3600e3);
  const named = new Set(NAMED_ASTEROIDS.map((b) => b.id));
  const viaHorizons = new Set(json.horizons || []);
  const records = [];
  for (const raw of json.rows) {
    const r = get(raw);
    if (named.has(`asteroid-${r.pdes}`)) continue;
    const aKm = r.a * AU_KM;
    const label = /^\d+$/.test(r.pdes) ? (r.name ? `${r.pdes} ${r.name}` : r.pdes) : r.pdes;
    const display = r.name || r.pdes;
    const lastObsMs = Date.parse(`${r.lastObs}T12:00:00Z`);
    records.push({
      id: `pha-${r.spk}`,
      name: display,
      layer: 'pha',
      klass: 'asteroid',
      propagator: 'kepler',
      frame: 'sun-inertial',
      cls: 'inferred',
      // The age the card prints is the age of the evidence: the last observation in JPL's fit.
      epoch: lastObsMs,
      source: 'jpl-sbdb',
      elements: {
        aKm,
        qKm: aKm * (1 - r.e),
        e: r.e,
        iRad: r.i * DEG,
        omRad: r.om * DEG,
        wRad: r.w * DEG,
        maRad: r.ma * DEG,
        epochMs,
        muKm3S2: MU_SUN,
      },
      meta: {
        designation: label,
        aliases: [...new Set([display, label, r.pdes, `${r.pdes}`].filter(Boolean))],
        aAu: r.a,
        qAu: r.a * (1 - r.e),
        aphelionAu: r.a * (1 + r.e),
        eccentricity: r.e,
        inclinationDeg: r.i,
        nodeDeg: r.om,
        argpDeg: r.w,
        meanAnomalyDeg: r.ma,
        absoluteMagnitude: r.H,
        diameterKm: Number.isFinite(r.diameter) ? r.diameter : null,
        moons: null,
        neo: true,
        pha: true,
        moidAu: r.moid,
        orbitClass: CLASS_WORDS[r.class] || null,
        conditionCode: r.cc,
        why: `JPL lists it as potentially hazardous: its orbit comes within ${moidWords(r.moid)} of the Earth's, and its absolute magnitude is ${r.H} (NASA's line is 22.0 or less, about 140 metres across or more). That names an orbit and a size, and is not a forecast: nothing here says it will come near.`,
        whySource: 'NASA CNEOS, Near-Earth Object groups (cneos.jpl.nasa.gov/about/neo_groups.html), and the JPL Small-Body Database (the orbit and the distance), read 15 November 2026',
        cite: `NASA/JPL Small-Body Database, ${label} (orbit for ${epochWords}), read ${read}${viaHorizons.has(r.spk) ? '; its elements carried to that day by JPL Horizons' : ''}`,
        solution: json.read,
        wholePath: true,
      },
    });
  }
  return records;
}

const url = (file) => new URL(`../../data/${file}`, import.meta.url).href;

/** The potentially hazardous asteroids, as records. */
export async function fetchPha() {
  const r = await fetch(url('pha.json'), { cache: 'no-cache' });
  if (!r.ok) throw new Error(`pha.json: ${r.status}`);
  return buildPha(await r.json());
}
