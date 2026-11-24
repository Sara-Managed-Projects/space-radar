// data/neocat.js -- the near-Earth asteroid catalogue's rows (research train "catalogues", forge #560): the bundled file
// site/data/neo-browser.json (scripts/build-neo-browser.py) with the harvested approaches over it, the size a magnitude allows, the
// delta-v estimate, and a record the map can fly to. Pure: no DOM, no fetch (ui/neobrowser.js does both).
//
// Contract (tests/test_neo_browser.mjs):
//   readFile(json)                     -> { rows, counts, read, epochJd, kmLineH, window }   one row object per asteroid
//   approachesFromCad(cad)             -> [{pdes, tMs, distAu, vKmS}]    CNEOS's cad.api answer (our saved copy) in the file's shape
//   withApproaches(rows, list, nowMs)  -> rows with `next` {tMs, distAu, ld, vKmS} the first approach after now, and `passes`
//   sizeFromH(H)                       -> {minKm, maxKm} for albedos 0.25 to 0.05 (CNEOS's conversion)
//   deltaV(a, e, iDeg)                 -> km/s, the Shoemaker-Helin (1978) rendezvous estimate, or null
//   classWord(code)                    -> 'Apollo' | 'Aten' | 'Amor' | 'Atira' (the copy's word)
//   recordFor(row, words?, read?)      -> a `kepler` record like data/pha.js's, for ctx.select (`read` the file's date, in words)
//
// SIZE FROM H. D = 1329 km / sqrt(p) x 10^(-H/5) (Fowler and Chillemi 1992; the formula of CNEOS's size tables and of
// https://cneos.jpl.nasa.gov/tools/ast_size_est.html, read 2026-11-24), with the geometric albedo p between 0.25 (a bright, stony
// rock: the smaller size) and 0.05 (a dark one: the larger). A diameter JPL has measured is printed instead, and called measured.
//
// DELTA-V. Shoemaker and Helin's figure of merit (1978, "Earth-approaching asteroids as targets for exploration", NASA CP-2053),
// in the form Lance Benner publishes his rendezvous table with (echo.jpl.nasa.gov/~lance/delta_v/): the speed from a 300 km low
// Earth orbit to a rendezvous with the asteroid, worked from a, e and i alone. A ranking of how cheap a rock is to reach, not a
// mission's budget (a real trajectory waits for a launch window); the card and the column say "estimate". Written here from the
// published formulas; tests/test_neo_browser.mjs holds it to six of Benner's published values within 1 %.

import { COPY, t } from '../copy/en.js';
import '../copy/en.neo.js';

const DEG = Math.PI / 180;
const AU_KM = 149597870.7;
const LD_KM = 384400;
const MU_SUN = 1.32712440018e11;
const DAY_MS = 86400000;
const jdToMs = (jd) => (jd - 2440587.5) * DAY_MS;

export const CLASSES = ['APO', 'ATE', 'AMO', 'IEO'];
/** The reasons a row is in the file (scripts/build-neo-browser.py `why`). */
export const WHY = { pha: 1, km: 2, close: 4 };

/** The bundled file as row objects. Pure. */
export function readFile(json) {
  if (!json || !Array.isArray(json.cols) || !Array.isArray(json.rows)) return { rows: [], counts: null };
  const ix = Object.fromEntries(json.cols.map((c, i) => [c, i]));
  const rows = json.rows.map((r) => {
    const pdes = String(r[ix.pdes]);
    const name = r[ix.name] || '';
    return {
      spk: r[ix.spk],
      pdes,
      name,
      // "433 Eros", "2024 YR4": the label a person knows it by
      label: name ? (/^\d+$/.test(pdes) ? `${pdes} ${name}` : name) : pdes,
      a: r[ix.a], e: r[ix.e], i: r[ix.i], om: r[ix.om], w: r[ix.w], ma: r[ix.ma],
      epochJd: Number.isFinite(r[ix.ep]) ? r[ix.ep] : json.epochJd,
      H: Number.isFinite(r[ix.H]) ? r[ix.H] : null,
      diameterKm: Number.isFinite(r[ix.d]) ? r[ix.d] : null,
      moidAu: Number.isFinite(r[ix.moid]) ? r[ix.moid] : null,
      cls: r[ix.cls],
      why: r[ix.why] | 0,
      pha: !!(r[ix.why] & WHY.pha),
      next: null,
      passes: 0,
    };
  });
  const ax = Object.fromEntries((json.approachCols || []).map((c, i) => [c, i]));
  const approaches = (json.approaches || []).map((a) => ({ pdes: String(a[ax.pdes]), tMs: a[ax.tMin] * 60000, distAu: a[ax.distAu], vKmS: a[ax.vKmS] }));
  return { rows, approaches, counts: json.counts || null, read: json.read || null, epochJd: json.epochJd, kmLineH: json.kmLineH, window: json.window || null };
}

/** CNEOS's cad.api answer ({fields, data}) as the file's approaches. Rows it cannot read are dropped. Pure. */
export function approachesFromCad(cad) {
  if (!cad || !Array.isArray(cad.fields) || !Array.isArray(cad.data)) return [];
  const f = Object.fromEntries(cad.fields.map((k, i) => [k, i]));
  const out = [];
  for (const r of cad.data) {
    const jd = Number(r[f.jd]);
    const distAu = Number(r[f.dist]);
    if (!Number.isFinite(jd) || !Number.isFinite(distAu)) continue;
    out.push({ pdes: String(r[f.des]).trim(), tMs: jdToMs(jd), distAu, vKmS: Number(r[f.v_rel]) });
  }
  return out;
}

/** Each row's first approach after `nowMs` and how many the list holds. New rows are not invented: an approach of a rock the file
 * has no orbit for is counted in `unjoined`. Pure; returns new row objects. */
export function withApproaches(rows, list, nowMs) {
  const by = new Map();
  for (const a of list || []) {
    if (!(a.tMs >= nowMs)) continue;
    const l = by.get(a.pdes);
    if (l) l.push(a); else by.set(a.pdes, [a]);
  }
  const known = new Set();
  const out = rows.map((r) => {
    known.add(r.pdes);
    const l = by.get(r.pdes);
    if (!l) return { ...r, next: null, passes: 0 };
    l.sort((x, y) => x.tMs - y.tMs);
    const n = l[0];
    return { ...r, next: { tMs: n.tMs, distAu: n.distAu, ld: (n.distAu * AU_KM) / LD_KM, vKmS: n.vKmS }, passes: l.length };
  });
  const unjoined = [...by.keys()].filter((k) => !known.has(k));
  return Object.assign(out, { unjoined });
}

/** The size range a magnitude allows, albedo 0.25 to 0.05. Pure. */
export function sizeFromH(H) {
  if (!Number.isFinite(H)) return null;
  const d = (p) => (1329 / Math.sqrt(p)) * 10 ** (-H / 5);
  return { minKm: d(0.25), maxKm: d(0.05) };
}

/** A size to sort on: the measured diameter, else the geometric middle of the range. Pure. */
export function sizeKm(row) {
  if (Number.isFinite(row.diameterKm)) return row.diameterKm;
  const s = sizeFromH(row.H);
  return s ? Math.sqrt(s.minKm * s.maxKm) : null;
}

/** The Shoemaker-Helin rendezvous delta-v from low Earth orbit, km/s. Pure. */
export function deltaV(a, e, iDeg) {
  if (!(a > 0) || !(e >= 0 && e < 1) || !Number.isFinite(iDeg)) return null;
  const i = iDeg * DEG;
  const Q = a * (1 + e);
  const q = a * (1 - e);
  const c = Math.cos(i / 2);
  let ut2, uc2, ur2;
  if (a < 1) { // Aten-like: the orbit is smaller than the Earth's
    ut2 = 2 - 2 * c * Math.sqrt(Math.max(0, 2 * Q - Q * Q));
    uc2 = 3 / Q - 1 - (2 / Q) * Math.sqrt(Math.max(0, 2 - Q));
    ur2 = 3 / Q - 1 / a - (2 / Q) * c * Math.sqrt((a * (1 - e * e)) / Q);
  } else if (q <= 1) { // Apollo-like: crosses the Earth's orbit from outside
    ut2 = 3 - 2 / (Q + 1) - 2 * c * Math.sqrt((2 * Q) / (Q + 1));
    uc2 = 3 / Q - 2 / (Q + 1) - (2 / Q) * Math.sqrt(2 / (Q + 1));
    ur2 = 3 / Q - 1 / a - (2 / Q) * c * Math.sqrt((a / Q) * (1 - e * e));
  } else { // Amor-like: wholly outside
    ut2 = 3 - 2 / (Q + 1) - 2 * c * Math.sqrt((2 * Q) / (Q + 1));
    uc2 = 3 / Q - 2 / (Q + 1) - (2 / Q) * c * Math.sqrt(2 / (Q + 1));
    ur2 = 3 / Q - 1 / a - (2 / Q) * Math.sqrt((a * (1 - e * e)) / Q);
  }
  const U0 = 7.727 / 29.784; // low Earth orbit at 300 km over the Earth's orbital speed
  const S = Math.SQRT2 * U0; // escape from it
  const ul = Math.sqrt(ut2 + S * S) - U0;
  const ur = Math.sqrt(Math.max(0, uc2 - 2 * Math.sqrt(Math.max(0, ur2 * uc2)) * c + ur2));
  const dv = 30 * (ul + ur) + 0.5;
  return Number.isFinite(dv) ? dv : null;
}

export function classWord(code) {
  return (COPY.neo && COPY.neo.classes && COPY.neo.classes[code]) || code || '';
}

/**
 * A record like data/pha.js's, for a row the map has no layer record of. `kepler`, `sun-inertial`, `inferred`: two-body motion
 * from the row's epoch, which the card says. Pure.
 */
export function recordFor(row, words = COPY.neo, read = '') {
  const aKm = row.a * AU_KM;
  const epochMs = jdToMs(row.epochJd);
  const reasons = [];
  if (row.why & WHY.pha) reasons.push(words.reasons.pha);
  if (row.why & WHY.km) reasons.push(words.reasons.km);
  if (row.why & WHY.close) reasons.push(words.reasons.close);
  const slug = row.pdes.replace(/\s+/g, '-').toLowerCase();
  return {
    id: `neo-${slug}`,
    name: row.name || row.pdes,
    layer: 'asteroids',
    klass: 'asteroid',
    propagator: 'kepler',
    frame: 'sun-inertial',
    cls: 'inferred',
    epoch: epochMs,
    source: 'jpl-sbdb-neo',
    elements: {
      aKm,
      qKm: aKm * (1 - row.e),
      e: row.e,
      iRad: row.i * DEG,
      omRad: row.om * DEG,
      wRad: row.w * DEG,
      maRad: row.ma * DEG,
      epochMs,
      muKm3S2: MU_SUN,
    },
    meta: {
      designation: row.label,
      aliases: [...new Set([row.label, row.pdes, row.name].filter(Boolean))],
      aAu: row.a,
      qAu: row.a * (1 - row.e),
      aphelionAu: row.a * (1 + row.e),
      eccentricity: row.e,
      inclinationDeg: row.i,
      nodeDeg: row.om,
      argpDeg: row.w,
      meanAnomalyDeg: row.ma,
      periodDays: (2 * Math.PI * Math.sqrt((aKm * aKm * aKm) / MU_SUN)) / 86400,
      absoluteMagnitude: row.H,
      diameterKm: row.diameterKm,
      neo: true,
      pha: !!(row.why & WHY.pha),
      moidAu: row.moidAu,
      orbitClass: classWord(row.cls) || null,
      closeApproachMs: row.next ? row.next.tMs : null,
      closeApproachDistanceKm: row.next ? row.next.distAu * AU_KM : null,
      closeApproachLunarDistances: row.next ? row.next.ld : null,
      relativeSpeedKmS: row.next ? row.next.vKmS : null,
      why: t(words.recordWhy, { reasons: reasons.join(words.reasonJoin) }),
      whySource: t(words.recordSource, { date: read }),
      wholePath: true,
    },
  };
}
