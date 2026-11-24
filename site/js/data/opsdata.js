// data/opsdata.js -- the numbers and lists of the live operations view (research train "ops"; forge #558, #561, #562, #563).
//
// Contract, the pure parts (tests/test_research_ops.mjs):
//   registerOpsSources()                      adds this train's rows to data/sources.js SOURCES (once; never at boot)
//   STATE_IDS, stateNumbers(summary, fetchedAtMs) -> [{id, value, source, asOfMs, how}]   every number with its source and date
//   frozenNumbers(doc) -> the same, from a frozen quarter (site/data/state-of-space/<q>.json)
//   sparkPoints(series, key, w, h) -> 'x,y x,y ...'                                           a sparkline's points
//   countUp(from, to, p) -> integer                                                           a number ticking to its value
//   splitStatus('LAPAN-A3 [+]') -> {name, status}
//   parseSocrates(body) -> rows; CLOSE_FILTERS; closeFilter(rows, which)
//   DSN_SITES, LIGHT_KM_S, dsnContacts(links, {names, records}) -> contacts; oneWaySeconds(link)
//   EVENT_KINDS, GIBS_FOR_KIND, eventRows(records)
// And the loaders, which read OUR saved copy first (data/sources.js load): loadState(), loadFrozen(), loadReentry(),
// loadClose(), loadDsn(), loadEvents().
//
// NOTHING HERE IS IN THE FIRST VISIT: the view (ui/ops.js) imports it when it is first opened.

import { SOURCES, load } from './sources.js';
import { parseDsn } from './parsers.js';
import { parseEonet } from './eonet.js';

const HOUR = 3600e3;
const MINUTE = 60e3;
export const LIGHT_KM_S = 299792.458;

// --- the sources this train adds (registry/sources.yaml carries the same rows) ----------------------------------------
// `state-of-space` and `reentry-watch` are summaries the harvester counts from its copy of CelesTrak's catalogue
// (harvest/stateofspace.py, publish.py rule 6): they exist only as our copy, so no browser route (`browser: false`).
// `celestrak-socrates` has no CORS header (measured 2026-11-24): our copy only. `eonet-storms-floods` is NASA's, CORS open.
const OPS_SOURCES = {
  'state-of-space': {
    id: 'state-of-space', registryId: 'state-of-space', label: 'State of Space (counted from CelesTrak’s catalogue)', publisher: 'CelesTrak',
    url: 'https://celestrak.org/pub/satcat.csv', cadenceMs: 24 * HOUR, freshnessMaxMs: 168 * HOUR, browser: false, kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)', note: 'A summary our harvester counts from its copy of the catalogue.',
  },
  'reentry-watch': {
    id: 'reentry-watch', registryId: 'reentry-watch', label: 'Re-entry watch (counted from CelesTrak’s catalogue)', publisher: 'CelesTrak',
    url: 'https://celestrak.org/pub/satcat.csv', cadenceMs: 24 * HOUR, freshnessMaxMs: 168 * HOUR, browser: false, kind: 'json',
    attribution: 'Orbital data: CelesTrak (T. S. Kelso)', note: 'What came down in 30 days and the lowest orbits, from our copy of the catalogue.',
  },
  'celestrak-socrates': {
    id: 'celestrak-socrates', registryId: 'celestrak-socrates', label: 'CelesTrak SOCRATES Plus — close approaches', publisher: 'CelesTrak',
    url: 'https://celestrak.org/SOCRATES/sort-maxProb.csv', cadenceMs: 24 * HOUR, freshnessMaxMs: 72 * HOUR, browser: false, kind: 'json',
    shape: { object: ['rows'] }, attribution: 'Close approaches: CelesTrak SOCRATES Plus (T. S. Kelso)',
  },
  'eonet-storms-floods': {
    id: 'eonet-storms-floods', registryId: 'eonet-storms-floods', label: 'NASA EONET — storms and floods, last 30 days', publisher: 'NASA Earth Observatory',
    url: 'https://eonet.gsfc.nasa.gov/api/v3/events?status=open&category=severeStorms,floods&days=30', cadenceMs: 1 * HOUR,
    freshnessMaxMs: 12 * HOUR, browser: true, kind: 'json', shape: { object: ['events'] }, attribution: 'Storms and floods: NASA EONET',
  },
};
export const OPS_SOURCE_IDS = Object.keys(OPS_SOURCES);

export function registerOpsSources(into = SOURCES) {
  for (const [id, s] of Object.entries(OPS_SOURCES)) if (!into[id]) into[id] = { ...s };
  return into;
}

// --- State of Space ------------------------------------------------------------------------------------------------
/** The numbers in the order the view and the page show them; `live` ones exist only in the live summary. */
export const STATE_IDS = ['earth_orbit', 'payloads', 'working_payloads', 'rocket_bodies', 'debris', 'starlink', 'owners',
  'launches_year', 'beyond_earth', 'beyond_working', 'came_down_30d'];
const FROM_SUMMARY = {
  earth_orbit: (s) => s.earth_orbit && s.earth_orbit.total,
  payloads: (s) => s.earth_orbit && s.earth_orbit.payload,
  working_payloads: (s) => s.working_payloads,
  rocket_bodies: (s) => s.earth_orbit && s.earth_orbit.rocket_body,
  debris: (s) => s.earth_orbit && s.earth_orbit.debris,
  starlink: (s) => s.starlink,
  owners: (s) => s.owners,
  launches_year: (s) => s.launches_year && s.launches_year.n,
  beyond_earth: (s) => s.beyond_earth && s.beyond_earth.payloads,
  beyond_working: (s) => s.beyond_earth && s.beyond_earth.working,
  came_down_30d: (s) => s.came_down_30d,
};

const dayMs = (iso) => { const t = Date.parse(`${String(iso || '').slice(0, 10)}T00:00:00Z`); return Number.isFinite(t) ? t : null; };

/** Every number of a live summary with its source and its date: the catalogue's read day. Missing ones are left out. */
export function stateNumbers(summary, fetchedAtMs) {
  if (!summary || typeof summary !== 'object') return [];
  const asOfMs = Number.isFinite(fetchedAtMs) ? fetchedAtMs : dayMs(summary.as_of);
  if (!Number.isFinite(asOfMs)) return [];
  const out = [];
  for (const id of STATE_IDS) {
    const v = FROM_SUMMARY[id](summary);
    if (Number.isInteger(v)) out.push({ id, value: v, source: 'celestrak-satcat', asOfMs, how: 'live', year: id === 'launches_year' && summary.launches_year ? summary.launches_year.year : undefined });
  }
  return out;
}

/** A frozen quarter's numbers in the same shape; its own `as_of` and `how` (counted back) on each. */
export function frozenNumbers(doc) {
  const list = doc && Array.isArray(doc.numbers) ? doc.numbers : [];
  return list.filter((n) => n && Number.isInteger(n.value) && n.source && dayMs(n.as_of) !== null)
    .map((n) => ({ id: n.id, value: n.value, source: n.source, asOfMs: dayMs(n.as_of), how: n.how || doc.how || 'counted back', year: n.id === 'launches_year' ? doc.launch_year : undefined }));
}

/** The points of a sparkline of `key` over the series, in a w x h box (y down), the newest at the right. */
export function sparkPoints(series, key, w, h, pad = 2) {
  const vals = (Array.isArray(series) ? series : []).map((p) => Number(p && p[key])).filter(Number.isFinite);
  if (vals.length < 2) return '';
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  return vals.map((v, i) => {
    const x = pad + (i * (w - 2 * pad)) / (vals.length - 1);
    const y = h - pad - ((v - lo) * (h - 2 * pad)) / span;
    return `${Math.round(x * 10) / 10},${Math.round(y * 10) / 10}`;
  }).join(' ');
}

/** A number ticking up to its value: p from 0 to 1, eased out, never past the value, always a whole number. */
export function countUp(from, to, p) {
  const q = Math.max(0, Math.min(1, Number(p) || 0));
  const e = 1 - (1 - q) ** 3;
  return Math.round(from + (to - from) * e);
}

// --- Close approaches (SOCRATES) -------------------------------------------------------------------------------------
/** CelesTrak writes a working flag after each name: `[+]` working, `[-]` not, `[P]` partly, `[B]` backup, `[S]` spare, `[X]` extended, `[?]`. */
export function splitStatus(raw) {
  const m = /^(.*?)\s*\[([^\]]*)\]\s*$/.exec(String(raw || '').trim());
  return m ? { name: m[1].trim(), status: m[2].trim() } : { name: String(raw || '').trim(), status: '' };
}

const WORKING = new Set(['+', 'P', 'B', 'S', 'X']);
const isDebris = (name) => /\bDEB\b/i.test(name);
const isRocket = (name) => /\bR\/B\b/i.test(name);

export function parseSocrates(body) {
  const cols = body && Array.isArray(body.columns) ? body.columns : null;
  const rows = body && Array.isArray(body.rows) ? body.rows : [];
  if (!cols) return [];
  const at = (name) => cols.indexOf(name);
  const ix = { id1: at('NORAD_CAT_ID_1'), n1: at('OBJECT_NAME_1'), id2: at('NORAD_CAT_ID_2'), n2: at('OBJECT_NAME_2'), tca: at('TCA'), range: at('TCA_RANGE'), speed: at('TCA_RELATIVE_SPEED'), prob: at('MAX_PROB'), dil: at('DILUTION') };
  if (Object.values(ix).some((i) => i < 0)) return [];
  const out = [];
  for (const r of rows) {
    if (!Array.isArray(r)) continue;
    const a = { id: Number(r[ix.id1]), ...splitStatus(r[ix.n1]) };
    const b = { id: Number(r[ix.id2]), ...splitStatus(r[ix.n2]) };
    // CelesTrak's TCA is UTC with a space: "2026-11-27 19:37:34.527".
    const tcaMs = Date.parse(String(r[ix.tca] || '').trim().replace(' ', 'T') + 'Z');
    const rangeKm = Number(r[ix.range]);
    const prob = Number(r[ix.prob]);
    if (!Number.isFinite(tcaMs) || !Number.isFinite(rangeKm) || !Number.isFinite(prob)) continue;
    const names = [a.name, b.name];
    const involves = names.some(isDebris) ? 'debris' : names.some(isRocket) ? 'rocket' : WORKING.has(a.status) && WORKING.has(b.status) ? 'working' : 'other';
    out.push({ a, b, tcaMs, rangeKm, rangeM: Math.round(rangeKm * 1000), speedKms: Number(r[ix.speed]), maxProb: prob, dilution: Number(r[ix.dil]), involves });
  }
  return out;
}

export const CLOSE_FILTERS = ['all', 'debris', 'rocket', 'working'];
export function closeFilter(rows, which) {
  if (!which || which === 'all') return rows;
  return rows.filter((r) => r.involves === which);
}

// --- Deep Space Network --------------------------------------------------------------------------------------------
// The three complexes, from NASA's own DSN Now configuration (https://eyes.nasa.gov/dsn/config.xml, read 2026-11-24): the
// `site` rows' latitude and longitude in degrees.
export const DSN_SITES = {
  gdscc: { name: 'Goldstone', latDeg: 35.2443523, lonDeg: -116.8895382 },
  mdscc: { name: 'Madrid', latDeg: 40.2413554, lonDeg: -4.2480085 },
  cdscc: { name: 'Canberra', latDeg: -35.2209189, lonDeg: 148.9812673 },
};
/** The DSN's own targets that are not a craft (a dish's test, an array's calibration): never a contact. */
const NOT_CRAFT = new Set(['DSN', 'TEST', 'RFC', 'GBRA', 'DSSR']);

/** One-way light time of a link in seconds: its own range over the speed of light, or half the round trip. */
export function oneWaySeconds(link) {
  if (link && Number.isFinite(link.rangeKm) && link.rangeKm > 0) return link.rangeKm / LIGHT_KM_S;
  if (link && Number.isFinite(link.rtltS) && link.rtltS > 0) return link.rtltS / 2;
  return null;
}

/**
 * The feed's links grouped as a person reads them: one row per craft and complex, its dishes, whether it is sending to
 * us, hearing us, or both, and the one-way light time. `names` maps the DSN's craft code (lower case) to a name;
 * `records` maps a Horizons id (string, "-31") to the map's record, so a row can fly there and a line be drawn.
 */
export function dsnContacts(links, { names = {}, records = new Map() } = {}) {
  const by = new Map();
  for (const l of Array.isArray(links) ? links : []) {
    const code = String(l.spacecraft || '').toUpperCase();
    if (!code || NOT_CRAFT.has(code)) continue;
    const key = `${l.stationId || '?'}:${code}`;
    let c = by.get(key);
    if (!c) {
      const hid = l.spacecraftId == null ? null : String(l.spacecraftId);
      const record = hid && records.get ? records.get(hid) || null : null;
      c = { key, stationId: l.stationId, station: (DSN_SITES[l.stationId] && DSN_SITES[l.stationId].name) || l.station || l.stationId,
        code, horizonsId: hid, name: (record && record.name) || names[code.toLowerCase()] || code, recordId: record ? record.id : null,
        dishes: [], up: false, down: false, oneWayS: null, rangeKm: null, dataRateBps: null, band: null, stationTimeMs: l.stationTimeMs || null };
      by.set(key, c);
    }
    if (l.dish && !c.dishes.includes(l.dish)) c.dishes.push(l.dish);
    if (l.direction === 'up') c.up = true;
    if (l.direction === 'down') {
      c.down = true;
      if (Number.isFinite(l.dataRateBps) && l.dataRateBps > 0) c.dataRateBps = Math.max(c.dataRateBps || 0, l.dataRateBps);
    }
    if (!c.band && l.band) c.band = l.band;
    const s = oneWaySeconds(l);
    if (s !== null && (c.oneWayS === null || s > c.oneWayS)) { c.oneWayS = s; c.rangeKm = Number.isFinite(l.rangeKm) && l.rangeKm > 0 ? l.rangeKm : s * LIGHT_KM_S; }
  }
  // Farthest first: the one a person asks about ("who is talking to Voyager") is at the top when it is on.
  return [...by.values()].sort((a, b) => (b.oneWayS || 0) - (a.oneWayS || 0) || a.name.localeCompare(b.name));
}

// --- Earth events ------------------------------------------------------------------------------------------------
export const EVENT_KINDS = ['wildfire', 'storm', 'volcano', 'flood'];
/** The overlay of registry/overlays.yaml that shows the event's own stuff, where one exists: rain for a storm or a flood. */
export const GIBS_FOR_KIND = { storm: 'rain', flood: 'rain' };

/** The list, newest report first; icebergs are the layer's, not this list's. */
export function eventRows(records) {
  return (Array.isArray(records) ? records : [])
    .filter((r) => r && r.meta && EVENT_KINDS.includes(r.meta.kind))
    .sort((a, b) => (b.meta.reportedMs || 0) - (a.meta.reportedMs || 0) || String(a.name).localeCompare(String(b.name)));
}

// --- the loaders: our copy first, through data/sources.js ----------------------------------------------------------
const FROZEN_BASE = new URL('../../data/state-of-space/', import.meta.url);

async function ours(id) {
  registerOpsSources();
  const res = await load(id);
  return res && res.data != null ? res : null;
}

export async function loadState() {
  const res = await ours('state-of-space');
  return res ? { summary: res.data, fetchedAt: res.fetchedAt } : null;
}

/** The frozen quarters and their history (site/data/state-of-space/history.json), shipped with the site. */
export async function loadFrozen(fetchImpl = fetch) {
  const h = await fetchImpl(new URL('history.json', FROZEN_BASE)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  if (!h || !Array.isArray(h.quarters) || !h.quarters.length) return null;
  const last = h.quarters[h.quarters.length - 1];
  const doc = await fetchImpl(new URL(`${last}.json`, FROZEN_BASE)).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  return { history: h, latest: doc };
}

export async function loadReentry() {
  const res = await ours('reentry-watch');
  return res ? { watch: res.data, fetchedAt: res.fetchedAt } : null;
}

export async function loadClose() {
  const res = await ours('celestrak-socrates');
  return res ? { rows: parseSocrates(res.data), read: res.data.read, fetchedAt: res.fetchedAt } : null;
}

export async function loadDsn() {
  const res = await load('dsn-now');
  if (!res || typeof res.data !== 'string') return null;
  return { links: parseDsn(res.data), fetchedAt: res.fetchedAt, error: res.error || null };
}

/** Fires and volcanoes (the layer's two lists) and storms and floods (this train's), as records of data/eonet.js. */
export async function loadEvents() {
  registerOpsSources();
  const ids = ['eonet-fires', 'eonet-volcanoes-ice', 'eonet-storms-floods'];
  const got = await Promise.allSettled(ids.map((id) => load(id)));
  const have = got.filter((g) => g.status === 'fulfilled' && g.value && g.value.data != null).map((g) => g.value);
  if (!have.length) return null;
  const fetchedAt = Math.min(...have.map((v) => (Number.isFinite(v.fetchedAt) ? v.fetchedAt : Date.now())));
  return { records: parseEonet(have.map((v) => v.data), { nowMs: fetchedAt, kinds: EVENT_KINDS }), fetchedAt };
}

export const DSN_STALE_MS = 30 * MINUTE;
