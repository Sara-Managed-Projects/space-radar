// data/satcat.js -- CelesTrak's satellite catalogue as a census and as a drawn population
// (public #449, "see debris as a problem"; public #450, true stories out of the catalogue).
//
// Contract, all pure:
//   parseSatcat(csv) -> rows in Earth orbit now: {id, name, intl, kind, launchMs, apogeeKm, perigeeKm, incDeg, periodMin, owner, rcs}
//   decayedRows(csv, sinceMs) -> rows that came down since then: {id, name, kind, decayMs, rcs}
//   bandOf(row) -> one of BANDS' ids;  census(rows) -> {total, kinds, bands: [{id, total, debris, rocket, dead, working, other}]}
//   stories(rows, decayed, asOfMs) -> {launched: {objects, launches, days}, oldest, clouds: [{name, pieces}], cameDown}
//   fieldRecords(rows) -> records the map can draw: every piece of debris and spent rocket body
//
// WHAT THE CATALOGUE IS. satcat.csv is one line for everything ever catalogued in orbit, 70 813
// lines on 2026-09-28, with what it is (payload, rocket body, debris), when it went up, whether
// and when it came down, and the SHAPE of its orbit: lowest and highest point, tilt, period. It
// is not elements: it does not say where on that orbit the thing is now. Current elements for
// debris and rocket bodies need a Space-Track account the project does not have (spec 0049 task 5),
// which is why "Everything active" is 16 587 working payloads and the debris layer was a hand
// list of forty.
//
// SO THE COUNT IS MEASURED AND THE PLACES ARE ILLUSTRATIVE, and both say so. census() counts
// what the catalogue lists: that is the honest number of things tracked, by height. fieldRecords()
// gives each piece its real orbit (height at both ends, tilt) and a made-up place on it: the
// angle of the orbit's plane and the position along it are a hash of its catalogue number. The
// shells and the tilts you see are real, which is the point of the picture (the crowd at 800 km,
// the ring at 36 000 km, the 65 and 82 and 98 degree families); no single dot is where that
// object is, and every record says so (cls `illustrative`, and its card's first line).

import { GM_EARTH } from '../propagate/kepler.js';

const R_EARTH_KM = 6378.137;
const DEG = Math.PI / 180;
const DAY_MS = 86400e3;
/** J2000: the epoch the made-up anomalies are counted from, so a reload draws the same picture. */
const FIELD_EPOCH_MS = Date.UTC(2000, 0, 1, 12);

/**
 * The heights the census counts by, on an orbit's average height above the ground; an orbit much
 * lower at one end than the other is `stretched`, whatever its average.
 */
export const BANDS = [
  { id: 'low', maxKm: 600 },
  { id: 'crowded', maxKm: 1000 },
  { id: 'upper', maxKm: 2000 },
  { id: 'medium', maxKm: 34000 },
  { id: 'geo', maxKm: 37600 },
  { id: 'beyond', maxKm: Infinity },
  { id: 'stretched', maxKm: null },
];
export const STRETCHED_E = 0.2;
export const KINDS = ['debris', 'rocket', 'dead', 'working', 'other'];
/** OPS_STATUS_CODE values CelesTrak documents as some form of operational. */
const WORKING = new Set(['+', 'P', 'B', 'S', 'X']);

function splitCsvLine(line) {
  if (line.indexOf('"') < 0) return line.split(',');
  const out = [];
  let cur = '';
  let quoted = false;
  for (let i = 0; i < line.length; i += 1) {
    const c = line[i];
    if (c === '"') { if (quoted && line[i + 1] === '"') { cur += '"'; i += 1; } else quoted = !quoted; }
    else if (c === ',' && !quoted) { out.push(cur); cur = ''; }
    else cur += c;
  }
  out.push(cur);
  return out;
}

function table(csv) {
  const lines = String(csv || '').split(/\r?\n/);
  const header = splitCsvLine(lines[0] || '').map((h) => h.trim());
  const col = (name) => header.indexOf(name);
  return { lines, col, ok: col('NORAD_CAT_ID') >= 0 && col('OBJECT_TYPE') >= 0 };
}

function kindOf(type, ops) {
  if (type === 'DEB') return 'debris';
  if (type === 'R/B') return 'rocket';
  if (type === 'PAY') return WORKING.has(ops) ? 'working' : 'dead';
  return 'other';
}

const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };
const day = (v) => { const ms = Date.parse(`${v}T00:00:00Z`); return Number.isFinite(ms) ? ms : null; };

/** Everything in orbit round the Earth now: not decayed, not round another body, with an orbit given. */
export function parseSatcat(csv) {
  const { lines, col, ok } = table(csv);
  if (!ok) return [];
  const c = {
    name: col('OBJECT_NAME'), intl: col('OBJECT_ID'), id: col('NORAD_CAT_ID'), type: col('OBJECT_TYPE'), ops: col('OPS_STATUS_CODE'),
    owner: col('OWNER'), launch: col('LAUNCH_DATE'), decay: col('DECAY_DATE'), period: col('PERIOD'), inc: col('INCLINATION'),
    apo: col('APOGEE'), per: col('PERIGEE'), rcs: col('RCS'), centre: col('ORBIT_CENTER'), orbit: col('ORBIT_TYPE'),
  };
  const out = [];
  for (let i = 1; i < lines.length; i += 1) {
    if (!lines[i]) continue;
    const f = splitCsvLine(lines[i]);
    if (f[c.decay] || (c.centre >= 0 && f[c.centre] && f[c.centre] !== 'EA') || (c.orbit >= 0 && f[c.orbit] && f[c.orbit] !== 'ORB')) continue;
    const apogeeKm = num(f[c.apo]);
    const perigeeKm = num(f[c.per]);
    const id = parseInt(f[c.id], 10);
    if (!Number.isFinite(id) || apogeeKm === null || perigeeKm === null || apogeeKm < perigeeKm) continue;
    out.push({
      id, name: (f[c.name] || '').trim(), intl: (f[c.intl] || '').trim(), kind: kindOf(f[c.type], (f[c.ops] || '').trim()),
      launchMs: day(f[c.launch]), apogeeKm, perigeeKm, incDeg: num(f[c.inc]), periodMin: num(f[c.period]),
      owner: (f[c.owner] || '').trim(), rcs: num(f[c.rcs]),
    });
  }
  return out;
}

/** What came down since `sinceMs`, newest first. */
export function decayedRows(csv, sinceMs) {
  const { lines, col, ok } = table(csv);
  if (!ok) return [];
  const c = { name: col('OBJECT_NAME'), id: col('NORAD_CAT_ID'), type: col('OBJECT_TYPE'), decay: col('DECAY_DATE'), rcs: col('RCS') };
  const out = [];
  // The file is in catalogue order, not date order: every line is looked at, cheaply.
  for (let i = 1; i < lines.length; i += 1) {
    const line = lines[i];
    if (!line) continue;
    const f = splitCsvLine(line);
    if (!f[c.decay]) continue;
    const decayMs = day(f[c.decay]);
    if (decayMs === null || decayMs < sinceMs) continue;
    out.push({ id: parseInt(f[c.id], 10), name: (f[c.name] || '').trim(), kind: kindOf(f[c.type], ''), decayMs, rcs: num(f[c.rcs]) });
  }
  return out.sort((a, b) => b.decayMs - a.decayMs);
}

export function eccentricity(row) {
  const a = R_EARTH_KM + (row.apogeeKm + row.perigeeKm) / 2;
  return (row.apogeeKm - row.perigeeKm) / (2 * a);
}

export function bandOf(row) {
  if (eccentricity(row) >= STRETCHED_E) return 'stretched';
  const mean = (row.apogeeKm + row.perigeeKm) / 2;
  for (const b of BANDS) if (b.maxKm !== null && mean < b.maxKm) return b.id;
  return 'beyond';
}

/** The count: by kind, and by height and kind. */
export function census(rows) {
  const zero = () => Object.fromEntries([['total', 0], ...KINDS.map((k) => [k, 0])]);
  const kinds = zero();
  const bands = new Map(BANDS.map((b) => [b.id, { id: b.id, ...zero() }]));
  for (const r of rows || []) {
    const b = bands.get(bandOf(r));
    kinds.total += 1; kinds[r.kind] += 1;
    b.total += 1; b[r.kind] += 1;
  }
  return { total: kinds.total, kinds, bands: [...bands.values()] };
}

/** "FENGYUN 1C DEB" -> "Fengyun 1C": the parent's name as a person would write it. */
export function parentName(name) {
  const base = String(name || '').replace(/\s+DEB\b.*$/i, '').replace(/\s+R\/B\b.*$/i, '').trim();
  // A run of five capitals or more is a word shouted (FENGYUN, COSMOS, ZARYA); four or fewer is
  // an acronym and stays (GOES, NOAA, CZ-4B, SL-8).
  return base.replace(/[A-Z]{5,}/g, (w) => w[0] + w.slice(1).toLowerCase());
}

/**
 * True things the catalogue says today, as numbers and names for sentences (ui/debris.js writes
 * them): what went up in the week to `asOfMs`, the oldest thing still up, the three largest
 * clouds of debris by pieces still in orbit, and what came down in that week.
 */
export function stories(rows, decayed, asOfMs, days = 7) {
  const since = asOfMs - days * DAY_MS;
  const fresh = (rows || []).filter((r) => r.launchMs !== null && r.launchMs >= since && r.launchMs <= asOfMs);
  const launches = new Set(fresh.map((r) => r.intl.slice(0, 8)));
  let oldest = null;
  for (const r of rows || []) if (r.launchMs !== null && (!oldest || r.launchMs < oldest.launchMs || (r.launchMs === oldest.launchMs && r.kind !== 'rocket' && oldest.kind === 'rocket'))) oldest = r;
  const byParent = new Map();
  for (const r of rows || []) {
    if (r.kind !== 'debris' || r.intl.length < 8) continue;
    const key = r.intl.slice(0, 8);
    const c = byParent.get(key) || { key, pieces: 0, names: new Map() };
    c.pieces += 1;
    // One launch leaves fragments of the satellite and of its rocket ("FENGYUN 1C DEB", "CZ-4B
    // DEB"): the cloud is named for whichever most of its pieces are.
    const n = parentName(r.name);
    c.names.set(n, (c.names.get(n) || 0) + 1);
    byParent.set(key, c);
  }
  const clouds = [...byParent.values()].sort((a, b) => b.pieces - a.pieces).slice(0, 3)
    .map((c) => ({ name: [...c.names.entries()].sort((a, b) => b[1] - a[1])[0][0], pieces: c.pieces, launched: c.key }));
  const down = (decayed || []).filter((r) => r.decayMs >= since && r.decayMs <= asOfMs);
  // The largest whole thing that came down (by radar cross-section); a fragment is not named.
  const biggest = down.filter((r) => r.rcs !== null && r.kind !== 'debris').sort((a, b) => b.rcs - a.rcs)[0] || null;
  return {
    days,
    launched: { objects: fresh.length, launches: launches.size },
    oldest: oldest ? { name: parentName(oldest.name), launchMs: oldest.launchMs, years: Math.floor((asOfMs - oldest.launchMs) / (365.25 * DAY_MS)) } : null,
    clouds,
    cameDown: { objects: down.length, biggest: biggest ? parentName(biggest.name) : null, biggestKind: biggest ? biggest.kind : null },
  };
}

/** A fraction in [0, 1) from a catalogue number and a salt: the same every time, spread evenly. */
function hash01(id, salt) {
  let h = (Math.imul(id | 0, 2654435761) ^ Math.imul(salt, 40503)) >>> 0;
  h ^= h >>> 15; h = Math.imul(h, 2246822519) >>> 0; h ^= h >>> 13; h = Math.imul(h, 3266489917) >>> 0; h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/**
 * The population as records: debris and spent rocket bodies, each on its own orbit's real size,
 * shape and tilt, at an illustrative place on it. Two-body motion round the Earth (propagate/kepler.js).
 */
export function fieldRecords(rows, opts = {}) {
  const layer = opts.layer || 'debris-field';
  const out = [];
  for (const r of rows || []) {
    if (r.kind !== 'debris' && r.kind !== 'rocket') continue;
    if (!Number.isFinite(r.incDeg)) continue;
    const aKm = R_EARTH_KM + (r.apogeeKm + r.perigeeKm) / 2;
    const e = Math.max(0, Math.min(0.95, eccentricity(r)));
    out.push({
      id: `cat-${r.id}`,
      name: r.name || `#${r.id}`,
      layer,
      klass: r.kind,
      propagator: 'kepler',
      frame: 'earth-inertial',
      cls: 'illustrative',
      epoch: FIELD_EPOCH_MS,
      source: 'celestrak-satcat',
      elements: {
        aKm, qKm: aKm * (1 - e), e,
        iRad: r.incDeg * DEG,
        omRad: hash01(r.id, 1) * 2 * Math.PI,
        wRad: hash01(r.id, 2) * 2 * Math.PI,
        maRad: hash01(r.id, 3) * 2 * Math.PI,
        epochMs: FIELD_EPOCH_MS,
        muKm3S2: GM_EARTH,
      },
      meta: {
        noradId: r.id, intlDesignator: r.intl || null, launchMs: r.launchMs, apogeeKm: r.apogeeKm, perigeeKm: r.perigeeKm,
        inclinationDeg: r.incDeg, periodMin: r.periodMin, owner: r.owner || null,
        placeIllustrative: true,
      },
    });
  }
  return out;
}
