// data/events.js -- one stream of things that happen: launches, close approaches, meteor showers,
// storms that bring auroras, passes and trains over you, and solar and lunar eclipses.
//
// Contract (pure, no DOM, importable in node):
//   buildEvents(records, nowMs, opts)            -> [event], sorted by prominence, then time
//   nextEvent(type, fromMs, observer, records)   -> the first event of that type after fromMs, or null
//   localCircumstances(event, observer)          -> a solar eclipse from one place, or null
//
// Spec 0031, 2026-09-23. registry/events.yaml has designed twelve event types since spec 0015, and
// until today no browser code read it: ui/next.js assembled seven kinds from whatever layers had
// loaded, and the two types a planetarium leads with -- eclipses, `source: computed` -- appeared
// nowhere, though the library that computes them had been vendored since the first commit. The
// list is now a consumer of this module, and spec 0030's `time: {event: solar-eclipse.next}` stops
// resolve through nextEvent().
//
// THE RECORD is spec 0015 design §1, with `t` in milliseconds because every caller compares it:
//   {id, type, t, t_precision, t_window, title, say, where, location_dependent, class, prominence,
//    source, links, record, detail}
// `record` is the loaded record the event is about (null for a shower, a storm or an eclipse), and
// `detail` carries the fields ui/next.js's rows already read, so moving the builders here changed
// no row (tests/test_events.mjs replays a twelve-row fixture against the pre-move output).
//
// `class` is this app's word for what the time IS: a launch's time is somebody's plan
// ('inferred'); an eclipse is computed to the minute from the Sun's and Moon's motion
// ('measured' in this app's sense: it is not anybody's plan and it will not slip).

import * as Astronomy from '../../vendor/astronomy.js';
import { EVENT_TYPES } from './events.registry.js';
import { SHOWERS } from './showers.js';
import { trainsFrom } from './trains.js';
import { predictPasses } from '../sky/passes.js';
import { COPY, CITIES, t, fmt, timeText, UNITS } from '../copy/en.js';

const HOUR = 3600e3;
const DAY = 24 * HOUR;
const DEG = Math.PI / 180;

/** How far ahead the list looks for everything but eclipses (spec 0026 req 6). */
export const EVENT_HORIZON_MS = 30 * DAY;
/**
 * How far ahead eclipses are looked for, and how far nextEvent() looks for anything. Two to five
 * solar eclipses a year, most of them far away: thirty days would show one a year at best, and a
 * planetarium names the next one months ahead (spec 0031 req 5).
 */
export const ECLIPSE_HORIZON_MS = 400 * DAY;

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

const validObserver = (o) => !!o && Number.isFinite(o.latRad) && Number.isFinite(o.lonRad);

// ---------------------------------------------------------------------------------------
// Moved from ui/next.js on 2026-09-23 (spec 0031 task 2), unchanged. ui/next.js re-exports them,
// so tests/test_next.mjs and tests/test_radiants.mjs import them from where they always did.
// ---------------------------------------------------------------------------------------

/**
 * How much of the Moon is lit on the night of `dayMs` (at local 23:00), 0..1, or null. The line
 * registry/events.yaml asks a shower's card for is never the rate but the sky: a full Moon washes out
 * all but the brightest meteors, and it is the same fraction wherever the visitor stands.
 */
export function moonLitThatNight(dayMs) {
  try {
    const d = new Date(dayMs);
    d.setHours(23, 0, 0, 0);
    const f = Astronomy.Illumination(Astronomy.Body.Moon, d).phase_fraction;
    return Number.isFinite(f) ? f : null;
  } catch { return null; }
}

/**
 * Where a shower's radiant is on its peak night, for a place: the highest it gets between 20:00 and
 * 06:00 local, and the hour it gets there. Meteors appear only while the radiant is up, and more of
 * them the higher it is -- which is why a southern shower is a poor show from the north. Pure given
 * the place; null without one.
 */
export function radiantThatNight(shower, dayMs, observer) {
  if (!shower || !observer || !Number.isFinite(observer.latRad) || !Number.isFinite(observer.lonRad)) return null;
  const dec = Number(shower.dec) * DEG, ra = Number(shower.ra_h) * 15 * DEG;
  if (!Number.isFinite(dec) || !Number.isFinite(ra)) return null;
  let best = null;
  const start = new Date(dayMs); start.setHours(20, 0, 0, 0);
  for (let h = 0; h <= 10 * 4; h++) { // every quarter hour, 20:00 to 06:00
    const tMs = start.getTime() + h * 15 * 60e3;
    let lst;
    try { lst = Astronomy.SiderealTime(new Date(tMs)) * 15 * DEG + observer.lonRad; } catch { return null; }
    const ha = lst - ra;
    const alt = Math.asin(Math.sin(observer.latRad) * Math.sin(dec) + Math.cos(observer.latRad) * Math.cos(dec) * Math.cos(ha)) / DEG;
    if (!best || alt > best.altDeg) best = { altDeg: alt, tMs };
  }
  return best;
}

/**
 * Meteor-shower peaks inside the horizon, from registry/showers.yaml (via data/showers.js). A peak is
 * a calendar date that moves by about a day between years, so the row carries the date and says
 * "around", never a time. Today's peak still counts: tonight is when you would go out. Pure.
 */
export function showerItems(nowMs, horizonMs, showers, observer = null) {
  const out = [];
  const today = startOfDay(nowMs);
  for (const sh of Array.isArray(showers) ? showers : []) {
    const m = /^(\d{2})-(\d{2})$/.exec(String(sh && sh.peak || ''));
    if (!m) continue;
    const year = new Date(nowMs).getFullYear();
    for (const y of [year, year + 1]) {
      const at = new Date(y, Number(m[1]) - 1, Number(m[2]), 12, 0, 0, 0).getTime(); // local noon of the date
      if (startOfDay(at) < today) continue;
      if (at - nowMs < horizonMs) out.push({ kind: 'shower', record: null, label: sh.display, tMs: at, zhr: sh.zhr, showerId: sh.id, moonLit: moonLitThatNight(at), radiant: radiantThatNight(sh, at, observer) });
      break;
    }
  }
  return out;
}

/**
 * A geomagnetic storm, from NOAA's planetary Kp (the swpc-kp feed the space-weather line reads):
 * the storm under way now if the latest measured bin is Kp 5 or more, else the strongest forecast
 * bin of Kp 5 or more still ahead. One row, never three: NOAA forecasts in three-hour bins and a
 * storm spans several. registry/events.yaml's `aurora` event, which had no row anywhere. Pure.
 */
export function auroraItem(parsed, nowMs, horizonMs = 3 * DAY) {
  const rows = parsed && Array.isArray(parsed.forecast) ? parsed.forecast : [];
  const isMeasured = (r) => r.observed === 'observed' || r.observed === 'estimated';
  const measured = rows.filter(isMeasured);
  const latest = measured[measured.length - 1];
  if (latest && latest.kp >= 5 && nowMs - latest.tMs < 6 * HOUR) {
    return { kind: 'aurora', record: null, tMs: nowMs, kp: latest.kp, now: true };
  }
  let best = null;
  for (const r of rows) {
    if (isMeasured(r) || !(r.kp >= 5)) continue;
    if (r.tMs + 3 * HOUR <= nowMs || r.tMs - nowMs > horizonMs) continue;
    if (!best || r.kp > best.kp) best = r;
  }
  return best ? { kind: 'aurora', record: null, tMs: Math.max(best.tMs, nowMs), kp: best.kp, now: false } : null;
}

/** A launch's row, the first branch of the record walk ui/next.js had: the launches layer's NET. */
export function launchItem(r, nowMs, horizonMs) {
  if (!r || !r.meta) return null;
  const m = r.meta;
  if (r.layer === 'launches' && Number.isFinite(m.netMs) && m.netMs > nowMs && m.netMs - nowMs < horizonMs) {
    return { kind: 'launch', record: r, tMs: m.netMs, precision: m.netPrecision || null, status: m.statusAbbrev || null };
  }
  return null;
}

/** A close approach's row: the walk's second branch, so a launch record never becomes one. */
export function approachItem(r, nowMs, horizonMs) {
  if (!r || !r.meta || launchItem(r, nowMs, horizonMs)) return null;
  const m = r.meta;
  if (Number.isFinite(m.closeApproachMs) && m.closeApproachMs > nowMs && m.closeApproachMs - nowMs < horizonMs) {
    const ld = Number.isFinite(m.missDistanceLd) ? m.missDistanceLd : Number.isFinite(m.missDistanceKm) ? m.missDistanceKm / UNITS.LUNAR_DISTANCE_KM : null;
    return { kind: 'approach', record: r, tMs: m.closeApproachMs, ld };
  }
  return null;
}

function passItems(records, nowMs, observer) {
  const out = [];
  if (!validObserver(observer)) return out;
  const withOrbits = (Array.isArray(records) ? records : []).filter((r) => r && r.satrec && (r.layer === 'stations' || r.layer === 'visual'));
  if (!withOrbits.length) return out;
  try {
    const passes = predictPasses(withOrbits, observer, nowMs, 24).filter((p) => p.visible === true);
    for (const p of passes) out.push({ kind: 'pass', record: p.record, tMs: p.startMs, peakEl: p.peakEl });
  } catch { /* a pass we could not compute is a row we do not print */ }
  return out;
}

// Trains over you (spec 0026 req 17): the lead of each train that is still climbing, as one row.
function trainItems(records, nowMs, observer, stillRaisingBelowKm) {
  const out = [];
  if (!validObserver(observer)) return out;
  const trainRecords = (Array.isArray(records) ? records : []).filter((r) => r && r.satrec && r.layer === 'starlink-trains');
  for (const train of trainsFrom(trainRecords, nowMs, { stillRaisingBelowKm })) {
    if (train.stillRaising !== true || !train.lead || !train.lead.satrec) continue;
    try {
      const passes = predictPasses([train.lead], observer, nowMs, 24).filter((p) => p.visible === true);
      for (const p of passes.slice(0, 1)) out.push({ kind: 'train', record: train.lead, tMs: p.startMs, count: train.count });
    } catch { /* no row for a pass we could not compute */ }
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Items become records
// ---------------------------------------------------------------------------------------

/**
 * One of next.js's items as a spec 0015 record: the shared fields filled, the row's own fields
 * kept in `detail` so ui/next.js can turn it back into exactly the item it built before.
 */
function fromItem(type, item, cls, precision) {
  const { kind, record, tMs, ...detail } = item;
  const id = record && record.id != null ? `${type.id}:${record.id}` : `${type.id}:${detail.showerId || ''}:${Math.round(tMs / 60e3)}`;
  return {
    id,
    type: type.id,
    t: tMs,
    t_precision: precision,
    t_window: [tMs, tMs],
    title: item.label || (record && record.name) || type.display,
    say: null, // the sentence is ui/next.js rowText()'s, from `detail`, as it was before the move
    where: null,
    location_dependent: type.locationDependent,
    class: cls,
    prominence: type.prominence,
    source: type.source,
    links: [],
    record: record || null,
    detail,
  };
}

// NET precision from Launch Library ("Minute", "Hour", "Day", "Month", ...), lower-cased; a launch
// with none is a plan to the minute that may still move, which `class: 'inferred'` already says.
const launchPrecision = (it) => (it.precision ? String(it.precision).toLowerCase() : 'minute');

// ---------------------------------------------------------------------------------------
// Eclipses: computed here with astronomy-engine 2.1.19 (site/vendor/astronomy.js, MIT)
// ---------------------------------------------------------------------------------------

const EARTH_RADIUS_KM = 6371;

/** Great-circle kilometres between two points in degrees. */
function kmBetween(lat1, lon1, lat2, lon2) {
  const p1 = lat1 * DEG, p2 = lat2 * DEG, dl = (lon2 - lon1) * DEG;
  const c = Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl);
  return EARTH_RADIUS_KM * Math.acos(Math.max(-1, Math.min(1, c)));
}

/**
 * The bundled city nearest a point, and how far away it is. The spec named ui/controls.js
 * findCity() as "the existing nearest-city lookup"; it is a search by name, and nothing did this.
 * A place word for where an eclipse is deepest is the only caller: the point is often at sea, so
 * the row says the distance rather than pretending the shadow crosses the city.
 */
export function nearestCity(latDeg, lonDeg, cities = CITIES) {
  let best = null;
  for (const c of Array.isArray(cities) ? cities : []) {
    if (!c || !Number.isFinite(c.latDeg) || !Number.isFinite(c.lonDeg)) continue;
    const km = kmBetween(latDeg, lonDeg, c.latDeg, c.lonDeg);
    if (!best || km < best.km) best = { city: c, km };
  }
  return best;
}

/** Within this, "near Cairo"; beyond it, "about 600 km from Cairo". */
const NEAR_KM = 250;

/** "near Cairo" or "about 900 km from Sao Paulo", for the point where a solar eclipse is deepest. */
export function whereWords(latDeg, lonDeg, cities = CITIES) {
  const T = COPY.nextList;
  const n = Number.isFinite(latDeg) && Number.isFinite(lonDeg) ? nearestCity(latDeg, lonDeg, cities) : null;
  if (!n) return null;
  if (n.km < NEAR_KM) return t(T.eclipseNear, { city: n.city.name });
  return t(T.eclipseFrom, { km: fmt.int(Math.round(n.km / 100) * 100), city: n.city.name });
}

const kindWord = (kind) => (COPY.nextList.eclipseKinds || {})[kind] || kind;

/** The record's own sentence (spec 0015's `say`); the list row adds local times to it. */
export function eclipseSentence(ev, dateText) {
  const T = COPY.nextList;
  const kind = kindWord(ev.kind);
  if (ev.type === 'solar-eclipse') {
    return ev.where && ev.where.words
      ? t(T.solarEclipse, { kind, date: dateText, where: ev.where.words })
      : t(T.solarEclipseGrazing, { kind, date: dateText });
  }
  return ev.kind === 'penumbral'
    ? t(T.lunarEclipsePenumbral, { kind, date: dateText })
    : t(T.lunarEclipse, { kind, date: dateText });
}

function eclipseRecord(type, kind, peakMs, window, extra) {
  const ev = {
    id: `${type.id}:${new Date(peakMs).toISOString().slice(0, 10)}`,
    type: type.id,
    t: peakMs,
    t_precision: 'minute',
    t_window: window,
    title: t(type.id === 'solar-eclipse' ? COPY.nextList.solarEclipseTitle : COPY.nextList.lunarEclipseTitle, { kind: kindWord(kind) }),
    say: null,
    where: null,
    location_dependent: type.locationDependent,
    class: 'measured',
    prominence: type.prominence,
    source: 'computed',
    links: [],
    record: null,
    kind,
    obscuration: null,
    local: null,
    detail: {},
    ...extra,
  };
  ev.say = eclipseSentence(ev, timeText.longDate(peakMs));
  return ev;
}

// ONE SEARCH A DAY. Measured 2026-09-23 in node on this machine (tests/test_events.mjs prints it):
// both searches over a 400-day window take a median of 14.5 ms, inside the spec's 20 ms, and the
// first call about twice that. The spec says memoise only past 50 ms; this does it anyway, because
// the Next list rebuilds every minute and on every layer landing, a phone is several times slower
// than this machine, and the answer only changes when the window's start passes an eclipse. So the
// lists are searched once per UTC day, a day either side, and filtered per call (0.1 ms). One
// entry, never stored, and no observer in it: nothing about the visitor is kept.
let eclipseCache = { day: NaN, horizonMs: 0, solar: [], lunar: [] };

function eclipseLists(nowMs, horizonMs) {
  const day = Math.floor(nowMs / DAY);
  if (eclipseCache.day === day && eclipseCache.horizonMs >= horizonMs) return eclipseCache;
  const from = new Date((day - 1) * DAY);
  const until = (day + 1) * DAY + horizonMs;
  const solar = [];
  const lunar = [];
  try {
    let ecl = Astronomy.SearchGlobalSolarEclipse(from);
    while (ecl && ecl.peak.date.getTime() < until) {
      solar.push(ecl);
      ecl = Astronomy.NextGlobalSolarEclipse(ecl.peak);
    }
  } catch { /* an eclipse we could not compute is a row we do not print */ }
  try {
    let ecl = Astronomy.SearchLunarEclipse(from);
    while (ecl && ecl.peak.date.getTime() < until) {
      lunar.push(ecl);
      ecl = Astronomy.NextLunarEclipse(ecl.peak);
    }
  } catch { /* likewise */ }
  eclipseCache = { day, horizonMs, solar, lunar };
  return eclipseCache;
}

function solarEclipses(records, nowMs, { eclipseHorizonMs, observer, type }) {
  const out = [];
  for (const ecl of eclipseLists(nowMs, eclipseHorizonMs).solar) {
    const peakMs = ecl.peak.date.getTime();
    if (peakMs <= nowMs || peakMs - nowMs >= eclipseHorizonMs) continue;
    // latitude/longitude are the centre of the shadow at peak, given for total and annular
    // eclipses only (the library's GlobalSolarEclipseInfo); a partial one has no such point.
    const hasPoint = Number.isFinite(ecl.latitude) && Number.isFinite(ecl.longitude);
    const ev = eclipseRecord(type, ecl.kind, peakMs, [peakMs, peakMs], {
      where: hasPoint ? { kind: 'point', lat: ecl.latitude, lon: ecl.longitude, words: whereWords(ecl.latitude, ecl.longitude) } : null,
      obscuration: Number.isFinite(ecl.obscuration) ? ecl.obscuration : null,
    });
    if (validObserver(observer)) ev.local = localCircumstances(ev, observer);
    out.push(ev);
  }
  return out;
}

function lunarEclipses(records, nowMs, { eclipseHorizonMs, type }) {
  const out = [];
  for (const ecl of eclipseLists(nowMs, eclipseHorizonMs).lunar) {
    const peakMs = ecl.peak.date.getTime();
    // The window is the partial (umbral) phase where there is one, else the penumbral: semi-
    // durations in minutes either side of the peak (LunarEclipseInfo.sd_partial / sd_penum).
    const sd = ecl.sd_partial > 0 ? ecl.sd_partial : ecl.sd_penum;
    const window = Number.isFinite(sd) ? [peakMs - sd * 60e3, peakMs + sd * 60e3] : [peakMs, peakMs];
    if (peakMs <= nowMs || peakMs - nowMs >= eclipseHorizonMs) continue;
    out.push(eclipseRecord(type, ecl.kind, peakMs, window, { obscuration: Number.isFinite(ecl.obscuration) ? ecl.obscuration : null }));
  }
  return out;
}

/**
 * A solar eclipse from one place (spec 0031 req 6): when it begins, peaks and ends there, and how
 * much of the Sun is covered; or `{visible: false}` with the reason. Null for anything but a solar
 * eclipse, or without a place. Computed on demand and never stored, because the observer is never
 * persisted (main.js) and this keeps that.
 *
 * Field names are the library's LocalSolarEclipseInfo (astronomy.js, read 2026-09-23):
 * partial_begin / peak / partial_end are EclipseEvents with `.time` (AstroTime) and `.altitude`
 * (degrees, the Sun's, refraction-corrected); `obscuration` is the fraction of the Sun's disc.
 */
export function localCircumstances(ev, observer) {
  if (!ev || ev.type !== 'solar-eclipse' || !observer) return null;
  const latDeg = Number.isFinite(observer.latDeg) ? observer.latDeg : Number.isFinite(observer.latRad) ? observer.latRad / DEG : NaN;
  const lonDeg = Number.isFinite(observer.lonDeg) ? observer.lonDeg : Number.isFinite(observer.lonRad) ? observer.lonRad / DEG : NaN;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  let local;
  try {
    const obs = new Astronomy.Observer(latDeg, lonDeg, (Number(observer.altKm) || 0) * 1000);
    local = Astronomy.SearchLocalSolarEclipse(new Date(ev.t - 2 * DAY), obs);
  } catch { return null; }
  // The search returns the next eclipse seen ANYWHERE the Moon's shadow touches this place; if that
  // is a different eclipse, this one misses it.
  if (!local || Math.abs(local.peak.time.date.getTime() - ev.t) > DAY) return { visible: false, reason: 'outside' };
  if (!(local.peak.altitude > 0)) return { visible: false, reason: 'below-horizon' };
  return {
    visible: true,
    kind: local.kind,
    beginMs: local.partial_begin.time.date.getTime(),
    peakMs: local.peak.time.date.getTime(),
    endMs: local.partial_end.time.date.getTime(),
    obscuration: local.obscuration,
    // A contact with the Sun below the horizon happens out of sight; the row says so.
    beginsBelow: local.partial_begin.altitude < 0,
    endsBelow: local.partial_end.altitude < 0,
  };
}

// ---------------------------------------------------------------------------------------
// The stream
// ---------------------------------------------------------------------------------------

const BUILDERS = {
  'launch': (records, nowMs, o) => (Array.isArray(records) ? records : [])
    .map((r) => launchItem(r, nowMs, o.horizonMs)).filter(Boolean)
    .map((it) => fromItem(o.type, it, 'inferred', launchPrecision(it))),
  'close-approach': (records, nowMs, o) => (Array.isArray(records) ? records : [])
    .map((r) => approachItem(r, nowMs, o.horizonMs)).filter(Boolean)
    .map((it) => fromItem(o.type, it, 'measured', 'minute')),
  'meteor-shower': (records, nowMs, o) => (o.showers ? showerItems(nowMs, o.horizonMs, o.showers, o.observer) : [])
    .map((it) => fromItem(o.type, it, 'inferred', 'day')),
  'station-pass': (records, nowMs, o) => passItems(records, nowMs, o.observer)
    .map((it) => fromItem(o.type, it, 'inferred', 'minute')),
  'starlink-train': (records, nowMs, o) => trainItems(records, nowMs, o.observer, o.trainThresholdKm)
    .map((it) => fromItem(o.type, it, 'inferred', 'minute')),
  'aurora': (records, nowMs, o) => {
    const a = o.spaceWeather ? auroraItem(o.spaceWeather, nowMs) : null;
    return a ? [fromItem(o.type, a, a.now ? 'measured' : 'inferred', 'hour')] : [];
  },
  'solar-eclipse': solarEclipses,
  'lunar-eclipse': lunarEclipses,
};

/** The types worked out here with no data at all (scripts/check_registry.py COMPUTED_EVENT_TYPES). */
const COMPUTED = new Set(['solar-eclipse', 'lunar-eclipse']);

/** The types the browser builds: enabled in the registry and with a builder here. */
export const BUILT_TYPES = EVENT_TYPES.filter((ty) => ty.enabled && BUILDERS[ty.id]).map((ty) => ty.id);

/**
 * Every event from what is loaded and what can be computed. `records` is everything loaded;
 * options: `observer` ({latRad, lonRad, latDeg?, lonDeg?, altKm}) adds passes, trains and local
 * eclipse circumstances; `horizonMs` (30 days) bounds all but eclipses; `eclipseHorizonMs` (400
 * days) bounds those; `showers` (registry/showers.yaml by default, null for none) and
 * `spaceWeather` (a parsed swpc-kp reading) feed their types; `eclipses: false` leaves the computed
 * types out, for a caller asking only about what it has loaded. Only future events. Pure but for the
 * one-a-day eclipse search above.
 */
export function buildEvents(records, nowMs, {
  observer = null,
  horizonMs = EVENT_HORIZON_MS,
  eclipseHorizonMs = ECLIPSE_HORIZON_MS,
  showers = SHOWERS,
  spaceWeather = null,
  trainThresholdKm,
  eclipses = true,
} = {}) {
  const out = [];
  if (!Number.isFinite(nowMs)) return out;
  const obs = validObserver(observer) ? observer : null;
  for (const type of EVENT_TYPES) {
    if (!type.enabled || !BUILDERS[type.id]) continue;
    if (!eclipses && COMPUTED.has(type.id)) continue;
    out.push(...BUILDERS[type.id](records, nowMs, { observer: obs, horizonMs, eclipseHorizonMs, showers, spaceWeather, trainThresholdKm, type }));
  }
  return out.sort((a, b) => (a.prominence - b.prominence) || (a.t - b.t));
}

/**
 * The first event of `type` after `fromMs`, within 400 days, or null: the one call spec 0030's
 * resolveStopTime() makes for a `time: {event: <type>.next}` stop. Nothing else in the trip machine
 * knows about events. `records` is only needed for types built from loaded records (a
 * `station-pass` needs the stations layer, `ctx.recordsFor('stations')`); an eclipse needs nothing.
 * An unknown or disabled type is null, never a throw.
 */
export function nextEvent(type, fromMs, observer = null, records = []) {
  const ty = EVENT_TYPES.find((x) => x.id === type);
  if (!ty || !ty.enabled || !BUILDERS[type] || !Number.isFinite(fromMs)) return null;
  const obs = validObserver(observer) ? observer : null;
  const found = BUILDERS[type](records, fromMs, {
    observer: obs, horizonMs: ECLIPSE_HORIZON_MS, eclipseHorizonMs: ECLIPSE_HORIZON_MS, showers: SHOWERS, spaceWeather: null, type: ty,
  }).filter((e) => e.t > fromMs).sort((a, b) => a.t - b.t);
  return found[0] || null;
}
