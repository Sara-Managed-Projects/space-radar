// ui/findcore.js -- Find by property: the questions, the filters and the numbers (forge #150).
//
// Contract, all pure (ui/find.worker.js runs them off the main thread; tests/test_find.mjs holds them):
//   FIND_KINDS                        'stars' | 'exoplanets' | 'satellites' | 'comets'
//   parseFind(text) -> query | null   the `#find=` value: `exo_ly50_hz_rocky`, `stars_ly20`, `sats_ownIND_h500-600`
//   findText(query) -> string         the value back; parseFind(findText(q)) is q
//   PRESETS                           the questions offered as one tap, each a `#find=` value
//   habitableZone(teffK, lumSuns)     -> {inner, outer, wideInner, wideOuter} au, or null
//   zoneOf(aAu, hz)                   -> 'inside' | 'edge' | 'hotter' | 'colder' | null
//   exoRow(record, override)          -> the planet's numbers, measured and worked out, each saying which
//   starRow(record), satRow(catRow, operatorId), cometRow(record)
//   matches(query, row, origin)       does a row answer the question; `origin` is where "within N ly" is measured from (ly)
//   runQuery(query, rows, origin, limit) -> {rows, total}: the matches, sorted, the first `limit`
//   COLUMNS[kind]                     the table's columns: {key, unit}
//   SOLAR_SYSTEM                      our planets for the system chart: radius and orbit
//   chartScale(bodies, widthPx)       -> [{id, rPx, xPx}]: side by side, to one scale
//
// WHAT IS MEASURED AND WHAT IS WORKED OUT, on every number (the table's honesty column):
//   - a planet's radius, mass and period, its star's temperature and radius, its distance: the NASA Exoplanet
//     Archive's (pscomppars), as loaded for the map (data/exopack.js). `measured`.
//   - its star's light, L = R^2 (T / 5772 K)^4: worked out from two measured numbers. `computed`.
//   - its orbit's size: Kepler's third law from the period and the star's mass. The 50 star systems of
//     data/systems-table.js carry the star's mass from the table, and their numbers are used as they stand.
//     For every other planet the table loaded here has no star mass, so it is ESTIMATED from the star's
//     light by the main-sequence relation M = L^(1/4) (Eddington's; good to a factor of two for
//     stars between half and twice the Sun's mass, poor for giants): `modelled`.
//   - the light it gets (S = L / a^2), its equilibrium temperature (with the Earth's albedo, 0.3, as
//     scripts/build-systems.py takes it) and whether it is in the habitable zone (Kopparapu et al. 2014,
//     ApJ Letters 787, L29, equations 4 and 5: the same coefficients as scripts/build-systems.py): computed
//     from the above, so `modelled` wherever the orbit was.
//   - `rocky`: a radius of 1.6 Earths or less (Rogers 2015, ApJ 801, 41: most planets larger than that are
//     not rocky), or, with no radius measured, a minimum mass of 3 Earths or less. A rule of thumb, `modelled`.
//
// A satellite's height is the mean of the catalogue's highest and lowest points; its owner the catalogue's
// OWNER code (data/owners.js). A comet's perihelion date is the Small-Body Database's.

export const FIND_KINDS = ['stars', 'exoplanets', 'satellites', 'comets'];
const SHORT = { stars: 'stars', exoplanets: 'exo', satellites: 'sats', comets: 'comets' };
const LONG = Object.fromEntries(Object.entries(SHORT).map(([k, v]) => [v, k]));
const LY_KM = 9460730472580.8;
const SUN_TEFF_K = 5772;
const SUN_LUMINOSITY_W = 3.828e26;
const STEFAN_BOLTZMANN = 5.670374419e-8;
const AU_M = 149597870700;
export const ALBEDO = 0.3;
export const ROCKY_RADIUS = 1.6;
export const ROCKY_MASS = 3;
const JULIAN_YEAR_DAYS = 365.25;
const HZ = {
  recentVenus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runaway: [1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15],
  maxGreenhouse: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  earlyMars: [0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
};
const HZ_TEFF = [2600, 7200];

// The ranges a query can hold, by the token's letter(s), and which kind reads each.
//   ly  distance (ly)    r radius (Earths)   m mass (Earths)    t temperature (K)   s light (Earths)
//   h   height (km)      y launch year       q perihelion year
const RANGES = { ly: 'withinLy', r: 'radius', m: 'mass', t: 'teq', s: 'insol', h: 'height', y: 'year', q: 'perihelion' };
const FLAGS = { hz: 'zone', hzw: 'zoneWide', rocky: 'rocky', here: 'fromCamera', working: 'working', desc: 'desc' };

/**
 * The `#find=` value as a query, or null. Tokens are `_`-separated (a fragment keeps `_`, `.` and `-`
 * as they are): the kind first, then any of the RANGES (`r-1.6`, `t200-320`, `ly50`, which is `ly0-50`),
 * the FLAGS, `own<CODE>`, `op<id>` and `by<column>`. An unknown token is dropped, so an older reader opens
 * a newer link with what it understands.
 */
export function parseFind(text) {
  const parts = String(text || '').trim().split('_').filter(Boolean);
  const kind = LONG[parts[0]] || (FIND_KINDS.includes(parts[0]) ? parts[0] : null);
  if (!kind) return null;
  const q = { kind };
  for (const tok of parts.slice(1)) {
    if (FLAGS[tok]) { q[FLAGS[tok]] = true; continue; }
    let m = /^own([A-Z0-9]{2,5})$/.exec(tok);
    if (m) { q.owner = m[1]; continue; }
    m = /^op([a-z0-9-]{2,24})$/.exec(tok);
    if (m) { q.operator = m[1]; continue; }
    m = /^by([a-zA-Z]{2,16})$/.exec(tok);
    if (m) { q.sort = m[1]; continue; }
    m = /^(ly|r|m|t|s|h|y|q)(\d*\.?\d*)(?:-(\d*\.?\d*))?$/.exec(tok);
    if (!m) continue;
    const key = RANGES[m[1]];
    const one = m[3] === undefined;
    const lo = one ? null : (m[2] === '' ? null : Number(m[2]));
    const hi = one ? (m[2] === '' ? null : Number(m[2])) : (m[3] === '' ? null : Number(m[3]));
    if ((lo !== null && !Number.isFinite(lo)) || (hi !== null && !Number.isFinite(hi))) continue;
    if (lo === null && hi === null) continue;
    if (key === 'withinLy') { if (hi !== null && hi > 0) q.withinLy = hi; continue; }
    q[key] = [lo, hi];
  }
  return q;
}

const n2s = (v) => (v === null || v === undefined ? '' : String(Math.round(v * 1000) / 1000));

/** The query as the `#find=` value; tokens in one order, so the same question is always the same link. */
export function findText(q) {
  if (!q || !FIND_KINDS.includes(q.kind)) return '';
  const out = [SHORT[q.kind]];
  if (q.withinLy > 0) out.push(`ly${n2s(q.withinLy)}`);
  for (const [tok, key] of Object.entries(RANGES)) {
    if (key === 'withinLy' || !Array.isArray(q[key])) continue;
    const [lo, hi] = q[key];
    if (lo === null && hi === null) continue;
    out.push(`${tok}${n2s(lo)}-${n2s(hi)}`);
  }
  if (q.owner) out.push(`own${q.owner}`);
  if (q.operator) out.push(`op${q.operator}`);
  for (const [tok, key] of Object.entries(FLAGS)) if (q[key] && key !== 'desc') out.push(tok);
  if (q.sort) out.push(`by${q.sort}`);
  if (q.desc) out.push('desc');
  return out.join('_');
}

/** The questions offered as one tap. The first is the look run's (forge #150, "Done when"). */
export const PRESETS = [
  { id: 'rockyHz50', find: 'exo_ly50_hz_rocky' },
  { id: 'nearStars', find: 'stars_ly20' },
  { id: 'temperate', find: 'exo_t180-310_hzw' },
  { id: 'hotJupiters', find: 'exo_r8-_t1000-' },
  { id: 'cometsSoon', find: 'comets_q2026-2030' },
  { id: 'geo', find: 'sats_h35000-36500_working' },
  { id: 'low', find: 'sats_h-400_working' },
];

const poly = (c, t) => c[0] + c[1] * t + c[2] * t ** 2 + c[3] * t ** 3 + c[4] * t ** 4;

/**
 * Kopparapu et al. (2014): the band where liquid water could last, in au, for a star; null outside the fit's
 * 2 600-7 200 K. With `stretch` a star up to HZ_STRETCH_K outside it is taken at the fit's edge (TRAPPIST-1 is
 * 2 566 K): an extrapolation, so a zone found that way is `modelled` (exoRow says so).
 */
export const HZ_STRETCH_K = 200;
export function habitableZone(teffK, lumSuns, stretch = false) {
  if (!(lumSuns > 0) || !Number.isFinite(teffK)) return null;
  const slack = stretch ? HZ_STRETCH_K : 0;
  if (teffK < HZ_TEFF[0] - slack || teffK > HZ_TEFF[1] + slack) return null;
  const t = Math.min(HZ_TEFF[1], Math.max(HZ_TEFF[0], teffK)) - 5780;
  const au = (c) => Math.sqrt(lumSuns / poly(c, t));
  return { inner: au(HZ.runaway), outer: au(HZ.maxGreenhouse), wideInner: au(HZ.recentVenus), wideOuter: au(HZ.earlyMars) };
}

/** Where an orbit sits against the band: scripts/build-systems.py's four words. */
export function zoneOf(aAu, hz) {
  if (!hz || !(aAu > 0)) return null;
  if (aAu >= hz.inner && aAu <= hz.outer) return 'inside';
  if (aAu >= hz.wideInner && aAu <= hz.wideOuter) return 'edge';
  return aAu < hz.inner ? 'hotter' : 'colder';
}

const fin = (v) => (Number.isFinite(v) ? v : null);
function lyOf(pos) {
  if (!pos || !Number.isFinite(pos.x)) return null;
  return { x: pos.x / LY_KM, y: pos.y / LY_KM, z: pos.z / LY_KM };
}

/**
 * A planet's numbers. `override` is its row of data/systems-table.js when it has one (aAu, insolationEarths,
 * equilibriumK, zone, and the star's massSuns and lumSuns): those are used as they stand. `how` says, per
 * worked-out number, 'computed' (from measured numbers) or 'modelled' (through the estimated star mass).
 */
export function exoRow(record, override = null, star = null) {
  const m = (record && record.meta) || {};
  const teff = fin(m.starTeffK);
  const rs = fin(m.starRadiusSuns);
  let lum = star && star.lumSuns > 0 ? star.lumSuns : teff && rs ? rs * rs * (teff / SUN_TEFF_K) ** 4 : null;
  const massSun = star && star.massSuns > 0 ? star.massSuns : lum ? lum ** 0.25 : null;
  const how = star && star.massSuns > 0 ? 'computed' : 'modelled';
  const period = fin(m.periodDays);
  let a = override && override.aAu > 0 ? override.aAu : period && massSun ? (massSun * (period / JULIAN_YEAR_DAYS) ** 2) ** (1 / 3) : null;
  const insol = override && Number.isFinite(override.insolationEarths) ? override.insolationEarths : lum && a ? lum / (a * a) : null;
  const teq = override && Number.isFinite(override.equilibriumK) ? override.equilibriumK
    : lum && a ? (lum * SUN_LUMINOSITY_W * (1 - ALBEDO) / (16 * Math.PI * STEFAN_BOLTZMANN * (a * AU_M) ** 2)) ** 0.25 : null;
  const zone = override && override.zone ? override.zone : zoneOf(a, habitableZone(teff, lum, true));
  const radius = fin(override && override.radiusEarths) ?? fin(m.radiusEarths);
  const mass = fin(override && override.massEarths) ?? fin(m.massEarths);
  if (!(lum > 0)) lum = null;
  return {
    id: record.id, name: record.name, host: m.host || null,
    ly: lyOf(record.pos), distLy: fin(m.distLy),
    radius, mass, period, aAu: a, insol, teq: teq === null ? null : Math.round(teq), zone,
    rocky: radius !== null ? radius <= ROCKY_RADIUS : mass !== null ? mass <= ROCKY_MASS : null,
    year: fin(m.discYear), how: override ? 'computed' : how,
  };
}

/** A named star's numbers: its place in ly, its measured distance, type and brightness. */
export function starRow(record) {
  const m = (record && record.meta) || {};
  return { id: record.id, name: record.name, ly: lyOf(record.pos), distLy: fin(m.distLy), spect: m.spect || null, mag: fin(m.mag), lum: fin(m.lum) };
}

/** A catalogue row (data/owners.js catalogueRows) as the table's row: owner, height, launch year. */
export function satRow(r, operator = null) {
  const height = Number.isFinite(r.apogeeKm) && Number.isFinite(r.perigeeKm) ? Math.round((r.apogeeKm + r.perigeeKm) / 2) : null;
  return {
    id: `sat-${r.id}`, norad: r.id, name: r.name, owner: r.owner, operator, height, incDeg: r.incDeg,
    year: r.launchMs !== null ? new Date(r.launchMs).getUTCFullYear() : null,
    working: r.type === 'PAY' && /^[+PBSX]$/.test(r.ops || ''), payload: r.type === 'PAY', up: r.decayMs === null,
  };
}

/** A comet's numbers: perihelion distance and date, from the Small-Body Database. */
export function cometRow(record) {
  const m = (record && record.meta) || {};
  const ms = fin(m.perihelionMs);
  return { id: record.id, name: record.name, qAu: fin(m.qAu), perihelionMs: ms, perihelion: ms === null ? null : decimalYear(ms), e: fin(m.eccentricity), periodYears: Number.isFinite(m.periodDays) ? m.periodDays / JULIAN_YEAR_DAYS : null };
}

const inRange = (v, r) => !r || (v !== null && v !== undefined && (r[0] === null || v >= r[0]) && (r[1] === null || v <= r[1]));

/** How far a row is from `origin` (ly), or its own distance from the Sun when there is no origin. */
export function distanceOf(row, origin) {
  if (origin && row.ly) return Math.hypot(row.ly.x - origin.x, row.ly.y - origin.y, row.ly.z - origin.z);
  return row.distLy ?? null;
}

/** Does this row answer the question? */
export function matches(q, row, origin = null) {
  if (!q || !row) return false;
  if (q.withinLy > 0) { const d = distanceOf(row, q.fromCamera ? origin : null); if (d === null || d > q.withinLy) return false; }
  if (q.kind === 'exoplanets') {
    if (!inRange(row.radius, q.radius) || !inRange(row.mass, q.mass) || !inRange(row.teq, q.teq) || !inRange(row.insol, q.insol)) return false;
    if (q.zone && row.zone !== 'inside') return false;
    if (q.zoneWide && row.zone !== 'inside' && row.zone !== 'edge') return false;
    if (q.rocky && row.rocky !== true) return false;
    return true;
  }
  if (q.kind === 'satellites') {
    if (!row.up) return false;
    if (q.owner && row.owner !== q.owner) return false;
    if (q.operator && row.operator !== q.operator) return false;
    if (q.working && !row.working) return false;
    if (!q.working && !row.payload) return false;
    return inRange(row.height, q.height) && inRange(row.year, q.year);
  }
  if (q.kind === 'comets') return inRange(row.perihelion, q.perihelion);
  return true;
}

/** The default order of each kind's answers: nearest first, newest first, soonest first. */
const DEFAULT_SORT = { stars: 'dist', exoplanets: 'dist', satellites: 'height', comets: 'perihelion' };

export const COLUMNS = {
  stars: [{ key: 'name' }, { key: 'dist', unit: 'ly' }, { key: 'spect' }, { key: 'mag' }],
  // Five columns fit the 320 px of the sidebar; starlight is a filter and a sort key (`by insol`), not a column.
  exoplanets: [{ key: 'name' }, { key: 'dist', unit: 'ly' }, { key: 'radius', unit: 'earths' }, { key: 'teq', unit: 'k' }, { key: 'zone' }],
  satellites: [{ key: 'name' }, { key: 'owner' }, { key: 'height', unit: 'km' }, { key: 'year' }],
  comets: [{ key: 'name' }, { key: 'perihelion' }, { key: 'qAu', unit: 'au' }],
};

/**
 * The matches, sorted by `q.sort` (a column key; `dist` is the distance from the origin the query is
 * measured from), `q.desc` reversing it, and the first `limit`. Rows with no value for the column go last.
 */
export function runQuery(q, rows, origin = null, limit = 200) {
  if (!q) return { rows: [], total: 0 };
  const hits = [];
  for (const r of rows || []) if (matches(q, r, origin)) hits.push(r);
  const key = q.sort || DEFAULT_SORT[q.kind] || 'name';
  const val = (r) => (key === 'dist' ? distanceOf(r, q.fromCamera ? origin : null) : key === 'perihelion' ? r.perihelionMs : r[key]);
  const dir = q.desc ? -1 : 1;
  const keyed = hits.map((r) => ({ r, v: val(r) }));
  keyed.sort((a, b) => {
    const an = a.v === null || a.v === undefined, bn = b.v === null || b.v === undefined;
    if (an !== bn) return an ? 1 : -1;
    if (an) return String(a.r.name).localeCompare(String(b.r.name));
    if (typeof a.v === 'string' || typeof b.v === 'string') return dir * String(a.v).localeCompare(String(b.v));
    return dir * (a.v - b.v) || String(a.r.name).localeCompare(String(b.r.name));
  });
  return { rows: keyed.slice(0, limit).map((k) => (key === 'dist' ? { ...k.r, dist: k.v } : { ...k.r, dist: distanceOf(k.r, q.fromCamera ? origin : null) })), total: hits.length };
}

/**
 * Our planets for the system chart. Mean radii: IAU WG on Cartographic Coordinates and Rotational Elements
 * 2015 (Archinal et al. 2018); orbits: the semi-major axes of JPL's "Approximate Positions of the Planets",
 * Table 1 (ssd.jpl.nasa.gov/planets/approx_pos.html), Pluto's from the same table.
 */
export const SOLAR_SYSTEM = [
  { id: 'mercury', radiusKm: 2439.4, aAu: 0.387 }, { id: 'venus', radiusKm: 6051.8, aAu: 0.723 },
  { id: 'earth', radiusKm: 6371.0, aAu: 1.0 }, { id: 'mars', radiusKm: 3389.5, aAu: 1.524 },
  { id: 'jupiter', radiusKm: 69911, aAu: 5.203 }, { id: 'saturn', radiusKm: 58232, aAu: 9.537 },
  { id: 'uranus', radiusKm: 25362, aAu: 19.19 }, { id: 'neptune', radiusKm: 24622, aAu: 30.07 },
  { id: 'pluto', radiusKm: 1188.3, aAu: 39.48 },
];
export const EARTH_RADIUS_KM = 6371.0;

/**
 * Side by side, to one scale: every body's radius in px with the largest at `maxR`, laid left to right in
 * the order given with `gap` px between edges. A body whose radius is not known is drawn at the median of
 * the others, flagged `guessed`, so the row never hides one.
 */
export function chartScale(bodies, { maxR = 40, gap = 10, minR = 1.5 } = {}) {
  const known = bodies.map((b) => b.radiusEarths).filter((r) => r > 0).sort((a, b) => a - b);
  const median = known.length ? known[Math.floor(known.length / 2)] : 1;
  const biggest = known.length ? known[known.length - 1] : 1;
  let x = 0;
  return bodies.map((b) => {
    const guessed = !(b.radiusEarths > 0);
    const r = Math.max(minR, ((guessed ? median : b.radiusEarths) / biggest) * maxR);
    const out = { id: b.id, rPx: r, xPx: x + r, guessed };
    x += 2 * r + gap;
    return out;
  });
}

/** Today's clock as a decimal year: a comet's perihelion is compared in years. */
export function decimalYear(ms) {
  const d = new Date(ms);
  const y = d.getUTCFullYear();
  return y + (ms - Date.UTC(y, 0, 1)) / (Date.UTC(y + 1, 0, 1) - Date.UTC(y, 0, 1));
}
