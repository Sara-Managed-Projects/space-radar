// ui/searchrows.js -- what a search row SAYS, and the things to find that are not objects
// (public #312, internal #131).
//
// Contract, all pure but runExtra and whereEnv:
//   describe(record, env) -> { title, kind, also, where }   the row as drawn
//   whereNow(record, env) -> { up, low, compass } | null
//   mergeSame(hits) -> hits, one row per drawn name (the ISS's modules are one station)
//   findExtras(query, limit) -> [{ extra, id, name, sub, record? }]   trips, missions, their events,
//                                                                    and "Near me tonight"
//   suggestions() -> the rows offered before anything is typed
//   runExtra(ctx, hit) -> does it;  whereEnv(ctx) -> a promise of describe()'s env
//
// WHY A SECOND FILE. ui/search.js is in the boot graph: the field is on the first screen. None of
// this is needed until somebody puts the cursor in it, and the missions' events alone are 30 kB,
// so the field imports this module on its first focus (tests/test_boot_diet.mjs holds it out).
// Until it lands the list is what it always was: a name and its layer.
//
// WHAT A ROW SAID. "ISS (ZARYA) -- Space stations" and "ISS (NAUKA) -- Space stations", two rows
// for one station named after its modules; "HST -- Bright enough to see", the layer that happened
// to load it. A row now leads with the name people use (ui/labels.js labelName, the labels' own
// rule), says what kind of thing it is, keeps the catalogue's string beside it when that differs,
// and, when a place is set, whether it is in that sky now and which way to look.

import { COPY, t, compassWords, timeText } from '../copy/en.js';
import '../copy/en.later.js';
import { labelName, labelParentId } from './labels.js';
import { TOURS_INDEX } from '../data/tours-index.js';
import { TOUR_WORDS } from '../data/tours-words.js';
import { MISSIONS } from '../data/missions.js';
import { editDistance } from './search.js';
import { parseFrame } from '../propagate/frames.js';

/** Above this, a thing is "up": the same ten degrees a pass must clear (sky/tonightbest.js MIN_ALT_DEG). */
export const UP_DEG = 10;
export const EXTRA_ROWS = 3;

const norm = (s) => String(s == null ? '' : s).trim().toLowerCase().replace(/\s+/g, ' ');

function kindOf(record) {
  const K = COPY.searchRows.kinds;
  if (!record) return '';
  if (record.klass === 'world') {
    if (record.id === 'sun') return K.sun;
    const parent = labelParentId(record);
    return parent ? K.moon : K.planet;
  }
  // A black hole, a pulsar, a magnetar or a famous star (data/exotics.js `kind`).
  if (record.klass === 'exotic') return K[record.meta && record.meta.kind] || '';
  // A site on another world is where something landed; on the Earth it is a place.
  if (record.klass === 'site') {
    let f = null;
    try { f = parseFrame(record.frame); } catch { f = null; }
    return f && f.kind === 'fixed' && f.world && f.world !== 'earth' ? K.landing : K.site;
  }
  return K[record.klass] || '';
}

/**
 * Where a thing is in the visitor's sky: null when no place is set or it cannot be worked out here
 * (a probe on its way, a storm). `env` carries the place, the time and the three ways of asking:
 * `bodyAltAz(id)` for the Sun, the Moon and the planets, `skyAltAz(dirEcl)` for a direction among
 * the stars, `satAltAz(record)` for an Earth satellite. Each returns { altDeg, azDeg } or null.
 */
export function whereNow(record, env) {
  if (!record || !env || !env.observer) return null;
  let at = null;
  try {
    if (record.klass === 'world') at = record.id === 'earth' ? null : env.bodyAltAz(record.id);
    else if (['star', 'dso', 'exoplanet', 'exotic'].includes(record.klass)) at = record.pos ? env.skyAltAz(record.pos) : null;
    else if (record.propagator === 'sgp4') at = env.satAltAz(record);
  } catch { at = null; }
  if (!at || !Number.isFinite(at.altDeg) || !Number.isFinite(at.azDeg)) return null;
  return { up: at.altDeg >= UP_DEG, low: at.altDeg >= 0 && at.altDeg < UP_DEG, compass: compassWords(at.azDeg) };
}

/** The row as drawn. `also` is the catalogue's own string when the name people use differs. */
export function describe(record, env) {
  const R = COPY.searchRows;
  const raw = record && record.name ? String(record.name) : '';
  const title = labelName(record) || raw || COPY.card.unknownName;
  const also = raw && norm(raw) !== norm(title) && !title.endsWith('…') ? raw : '';
  const w = whereNow(record, env);
  const where = !w ? '' : w.up ? t(R.upNow, { compass: w.compass }) : w.low ? t(R.lowNow, { compass: w.compass }) : R.downNow;
  return { title: title.endsWith('…') ? raw || title : title, kind: kindOf(record), also, where };
}

/** One row per drawn name: the first (the best ranked) stands for the rest. */
export function mergeSame(hits) {
  const seen = new Set();
  const out = [];
  for (const h of Array.isArray(hits) ? hits : []) {
    // A station's modules are catalogued one by one, "ISS (ZARYA)", "ISS (NAUKA)", "CSS (TIANHE)":
    // the word before the bracket is the station, and one row stands for all of them.
    const r = h && h.record;
    const module = r && r.klass === 'station' ? /^([A-Z0-9]+) \(/.exec(String(r.name || '')) : null;
    const key = module ? `station:${module[1]}` : h && h.row ? norm(h.row.title) : null;
    if (key) { if (seen.has(key)) continue; seen.add(key); }
    out.push(h);
  }
  return out;
}

// --- the things that are not objects -----------------------------------------------------------

function entries() {
  const R = COPY.searchRows;
  const out = [];
  for (const tour of TOURS_INDEX) {
    out.push({ extra: 'trip', id: tour.id, name: tour.title, sub: R.trip, words: norm(`${tour.title} ${tour.blurb || ''} ${tour.id.replace(/-/g, ' ')} ${TOUR_WORDS[tour.id] || ''}`) });
  }
  for (const m of MISSIONS) {
    out.push({ extra: 'mission', id: m.id, record: m.record, name: m.display, sub: R.mission, words: norm(m.display) });
    for (const e of m.events) {
      const ms = Date.parse(e.date);
      out.push({
        extra: 'event', id: `${m.id}.${e.id}`, record: m.record, mission: m.id,
        name: t(R.eventName, { mission: m.display, title: e.title }),
        sub: Number.isFinite(ms) ? t(R.event, { date: timeText.longDate(ms) }) : R.eventNoDate,
        words: norm(`${m.display} ${e.title}`), title: norm(e.title), lead: e.id === 'landing' ? 2 : e.id === 'launch' ? 1 : 0,
      });
    }
  }
  return out;
}
let cache = null;
const all = () => cache || (cache = entries());

const NEAR = () => ({ extra: 'suggest', id: 'near-me-tonight', name: COPY.searchRows.nearMe, sub: COPY.searchRows.nearMeSub, words: 'near me tonight what is up in my sky above' });

/** What is offered before anything is typed. */
export function suggestions() { return [NEAR()]; }

/** How well `q` names an entry: 3 the whole name, 2 its start, 1 the start of a word, 0 not at all. */
function scoreWords(words, q) {
  if (words === q) return 3;
  let at = words.indexOf(q);
  if (at === 0) return 2;
  while (at > 0) {
    if (/[^a-z0-9]/.test(words[at - 1])) return 1;
    at = words.indexOf(q, at + 1);
  }
  return 0;
}

/**
 * Trips, missions, events and the suggestion that a query names. At most `limit`, and at most one
 * event of a mission unless the query names the event itself ("apollo" gives the trip, Apollo 11
 * and its landing, not all eight of its events). A query a letter or two off a word still finds
 * it, when nothing matched as typed ("apolo").
 */
export function findExtras(query, limit = EXTRA_ROWS) {
  const q = norm(query);
  if (q.length < 3) return [];
  const pool = all().concat(NEAR());
  let found = [];
  for (const e of pool) {
    const s = scoreWords(e.words, q);
    if (s) found.push({ e, s: s * 10 + (e.extra === 'event' && scoreWords(e.title, q) ? 2 : 0) });
  }
  if (!found.length && q.length >= 4 && !/^[0-9\s]+$/.test(q)) {
    const cap = q.length <= 5 ? 1 : 2;
    for (const e of pool) {
      if (e.words.split(/[^a-z0-9]+/).some((w) => w.length >= 3 && editDistance(q, w, cap) <= cap)) found.push({ e, s: 1 });
    }
  }
  const order = { suggest: 0, trip: 1, mission: 2, event: 3 };
  found.sort((a, b) => (order[a.e.extra] - order[b.e.extra]) || (b.s - a.s) || ((b.e.lead || 0) - (a.e.lead || 0)));
  const out = [];
  const eventsOf = new Map();
  for (const { e } of found) {
    if (e.extra === 'event') {
      const named = scoreWords(e.title, q) > 0;
      const n = eventsOf.get(e.mission) || 0;
      if (n >= 1 && !named) continue;
      eventsOf.set(e.mission, n + 1);
    }
    out.push({ extra: e.extra, id: e.id, name: e.name, sub: e.sub, record: e.record || null });
    if (out.length >= limit) break;
  }
  return out;
}

/** Do what an extra row offers. Returns false when it could not (the caller leaves the list open). */
export function runExtra(ctx, hit) {
  if (!ctx || !hit) return false;
  try {
    if (hit.extra === 'trip') { if (ctx.trip && typeof ctx.trip.start === 'function') { ctx.trip.start(hit.id); return true; } return false; }
    if (hit.extra === 'suggest') { if (ctx.explore && typeof ctx.explore.setTab === 'function') { ctx.explore.setTab('tonight'); return true; } return false; }
    const record = typeof ctx.recordById === 'function' ? ctx.recordById(hit.record) : null;
    if (hit.extra === 'mission') { if (record) { ctx.select(record); return true; } return false; }
    if (hit.extra === 'event') {
      if (typeof ctx.wantMissions !== 'function') return false;
      ctx.wantMissions().then((m) => { if (m && !m.openEvent(ctx, hit.id) && record) ctx.select(record); });
      return true;
    }
  } catch (e) { console.warn('a search row could not be followed', e); }
  return false;
}

/** describe()'s env from the running app: the place, and the three ways of asking where a thing is. */
export async function whereEnv(ctx) {
  const observer = ctx && ctx.observer && Number.isFinite(ctx.observer.latRad) ? ctx.observer : null;
  if (!observer) return { observer: null };
  const [look, frames, prop] = await Promise.all([import('../sky/lookfor.js'), import('../propagate/frames.js'), import('../propagate/index.js')]);
  const now = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
  return {
    observer,
    bodyAltAz: (id) => look.altAzOfBody(id, observer, now()),
    skyAltAz: (pos) => {
      const n = Math.hypot(pos.x, pos.y, pos.z);
      if (!(n > 0)) return null;
      const eq = frames.eclipticToEquatorial({ x: pos.x / n, y: pos.y / n, z: pos.z / n });
      const ra = (Math.atan2(eq.y, eq.x) * 180) / Math.PI;
      const dec = (Math.asin(Math.max(-1, Math.min(1, eq.z))) * 180) / Math.PI;
      return look.altAzOfSky(ra, dec, observer, now());
    },
    satAltAz: (record) => {
      const p = prop.propagate(record, now());
      if (!p || p.frame !== 'earth-inertial') return null;
      const la = frames.lookAngles(observer, frames.eciToEcef(p, frames.gmst(new Date(now()))));
      return la ? { altDeg: (la.el * 180) / Math.PI, azDeg: (la.az * 180) / Math.PI } : null;
    },
  };
}
