// ui/searchrows.js -- what a search row SAYS, and the things to find that are not objects
// (public #312, internal #131).
//
// Contract, all pure but runExtra and whereEnv:
//   describe(record, env) -> { title, kind, also, where }   the row as drawn
//   whereNow(record, env) -> { up, low, compass } | null   worlds, stars, satellites, and probes, comets
//                                                          and asteroids (env.helioAltAz)
//   mergeSame(hits) -> hits, one row per drawn name (the ISS's modules are one station)
//   findExtras(query, limit) -> [{ extra, id, name, sub, record? }]   trips, missions, their events,
//                                                                    and "Near me tonight"
//   suggestions() -> the rows offered before anything is typed
//   rowIconName(hit) -> an icon's name | null,  rowIcon(hit) -> SVGElement | null (the dot stays)
//   groupRows(hits, countOf, open) -> hits, a constellation's satellites folded into one row
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

import { COPY, t, compassWords, timeText, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { labelName, labelParentId } from './labels.js';
import { TOURS_INDEX } from '../data/tours-index.js';
import { TOUR_WORDS } from '../data/tours-words.js';
import { MISSIONS } from '../data/missions.js';
import { editDistance } from './search.js';
import { parseFrame } from '../propagate/frames.js';
import { icon, iconFrom } from './icons.js';

/** The classes found by where they are round the Sun, not round the Earth (whereNow). */
const WANDERERS = new Set(['probe', 'comet', 'asteroid']);

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
    // A probe, a comet or an asteroid (internal #551): the direction from the Earth's centre to where
    // its elements or its path put it now. A parallax of a degree at the nearest rocks is below what
    // "up", "low" and "below the horizon" can tell apart, so nobody is told a place it is not.
    else if (WANDERERS.has(record.klass) && typeof env.helioAltAz === 'function') at = env.helioAltAz(record);
  } catch { at = null; }
  if (!at || !Number.isFinite(at.altDeg) || !Number.isFinite(at.azDeg)) return null;
  return { up: at.altDeg >= UP_DEG, low: at.altDeg >= 0 && at.altDeg < UP_DEG, compass: compassWords(at.azDeg) };
}

// --- a class icon for a row (internal #432) --------------------------------------------------------
//
// The row's mark was a 9 px dot in the class colour, which tells a satellite from a star only to
// somebody who has learned the colours. These are Lucide's (https://lucide.dev, ISC; CREDITS.md),
// copied element for element from lucide-static 0.544.0 on 2026-10-07, drawn by ui/icons.js the
// guide's way and inked in the class colour. THE CLASSES WITH NO HONEST ICON KEEP THE DOT: debris,
// an asteroid, a comet, an oddity and the exotic stars have nothing in the family that is not a
// joke or a guess (a trash can, a gem), and a dot is not wrong.
const ROW_ICONS = {
  satellite: [
    ['path', { d: 'm13.5 6.5-3.148-3.148a1.205 1.205 0 0 0-1.704 0L6.352 5.648a1.205 1.205 0 0 0 0 1.704L9.5 10.5' }],
    ['path', { d: 'M16.5 7.5 19 5' }],
    ['path', { d: 'm17.5 10.5 3.148 3.148a1.205 1.205 0 0 1 0 1.704l-2.296 2.296a1.205 1.205 0 0 1-1.704 0L13.5 14.5' }],
    ['path', { d: 'M9 21a6 6 0 0 0-6-6' }],
    ['path', { d: 'M9.352 10.648a1.205 1.205 0 0 0 0 1.704l2.296 2.296a1.205 1.205 0 0 0 1.704 0l4.296-4.296a1.205 1.205 0 0 0 0-1.704l-2.296-2.296a1.205 1.205 0 0 0-1.704 0z' }],
  ],
  rocket: [
    ['path', { d: 'M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z' }],
    ['path', { d: 'm12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z' }],
    ['path', { d: 'M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0' }],
    ['path', { d: 'M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5' }],
  ],
  globe: [
    ['circle', { cx: '12', cy: '12', r: '10' }],
    ['path', { d: 'M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20' }],
    ['path', { d: 'M2 12h20' }],
  ],
  moon: [
    ['path', { d: 'M20.985 12.486a9 9 0 1 1-9.473-9.472c.405-.022.617.46.402.803a6 6 0 0 0 8.268 8.268c.344-.215.825-.004.803.401' }],
  ],
  star: [
    ['path', { d: 'M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z' }],
  ],
  sun: [
    ['circle', { cx: '12', cy: '12', r: '4' }],
    ['path', { d: 'M12 2v2' }],
    ['path', { d: 'M12 20v2' }],
    ['path', { d: 'm4.93 4.93 1.41 1.41' }],
    ['path', { d: 'm17.66 17.66 1.41 1.41' }],
    ['path', { d: 'M2 12h2' }],
    ['path', { d: 'M20 12h2' }],
    ['path', { d: 'm6.34 17.66-1.41 1.41' }],
    ['path', { d: 'm19.07 4.93-1.41 1.41' }],
  ],
  sparkles: [
    ['path', { d: 'M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z' }],
    ['path', { d: 'M20 2v4' }],
    ['path', { d: 'M22 4h-4' }],
    ['circle', { cx: '4', cy: '20', r: '2' }],
  ],
  'map-pin': [
    ['path', { d: 'M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0' }],
    ['circle', { cx: '12', cy: '10', r: '3' }],
  ],
  tornado: [
    ['path', { d: 'M21 4H3' }],
    ['path', { d: 'M18 8H6' }],
    ['path', { d: 'M19 12H9' }],
    ['path', { d: 'M16 16h-6' }],
    ['path', { d: 'M11 20H9' }],
  ],
  flag: [
    ['path', { d: 'M4 22V4a1 1 0 0 1 .4-.8A6 6 0 0 1 8 2c3 0 5 2 7.333 2q2 0 3.067-.8A1 1 0 0 1 20 4v10a1 1 0 0 1-.4.8A6 6 0 0 1 16 16c-3 0-5-2-8-2a6 6 0 0 0-4 1.528' }],
  ],
};

/** Which icon a row wears: a name in ROW_ICONS or in ui/icons.js, or null for the dot. Pure. */
export function rowIconName(hit) {
  if (!hit) return null;
  if (hit.extra === 'trip') return 'play';
  if (hit.extra === 'mission' || hit.extra === 'event') return 'flag';
  if (hit.extra === 'suggest') return 'compass';
  if (hit.extra === 'group') return 'satellite';
  const r = hit.record;
  if (!r) return null;
  switch (r.klass) {
    case 'world': return r.id === 'sun' ? 'sun' : labelParentId(r) ? 'moon' : 'globe';
    case 'station': case 'satellite': case 'probe': return 'satellite';
    case 'telescope': return 'telescope';
    case 'rocket': case 'launch': return 'rocket';
    case 'star': return 'star';
    case 'exoplanet': return 'globe';
    case 'dso': return 'sparkles';
    case 'site': return 'map-pin';
    case 'storm': return 'tornado';
    default: return null;
  }
}

/** The icon as a node (16 px, hidden from a screen reader: the row's second line says the kind), or null. */
export function rowIcon(hit) {
  const name = rowIconName(hit);
  if (!name || typeof document === 'undefined') return null;
  return ROW_ICONS[name] ? iconFrom(name, ROW_ICONS[name], 16) : icon(name, 16);
}

// --- a constellation as one row (internal #432) ----------------------------------------------------
//
// "starlink" gave eight rows of STARLINK-31234, eight of some thousands, and no way to tell why
// those. One row now stands for the constellation and says how many of its satellites the map
// holds; pressing it lists them as before. The count is of what is loaded, not of what flies.
export const GROUPS = [
  { id: 'starlink', name: 'Starlink', test: /^starlink[- ]?\d/i },
  { id: 'oneweb', name: 'OneWeb', test: /^oneweb[- ]?\d/i },
];
/** Fewer rows than this of one constellation are left as they are. */
export const GROUP_MIN = 3;

/**
 * Fold the rows of one constellation into a single row, where it first appears. `countOf(group)`
 * is how many of its satellites the map holds; `open` is the id of a group the visitor has asked
 * to see listed. Pure.
 */
export function groupRows(hits, countOf, open) {
  const list = Array.isArray(hits) ? hits : [];
  const R = COPY.searchRows;
  // Always a new list: the caller writes the answer back over the one it passed in.
  let out = list.slice();
  for (const g of GROUPS) {
    if (g.id === open) continue;
    const of = (h) => !!(h && h.record && !h.extra && g.test.test(String(h.record.name || '')));
    const n = out.filter(of).length;
    if (n < GROUP_MIN) continue;
    const total = Math.max(n, Number(typeof countOf === 'function' ? countOf(g) : 0) || 0);
    let placed = false;
    out = out.filter((h) => {
      if (!of(h)) return true;
      if (placed) return false;
      placed = true;
      return true;
    }).map((h) => (of(h) ? { extra: 'group', id: g.id, klass: 'satellite', name: g.name, sub: t(R.group, { n: fmt.int(total) }), record: null, at: -1, length: 0 } : h));
  }
  return out;
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
    // A position round the Sun (heliocentric ecliptic J2000), as a direction from the Earth's centre.
    helioAltAz: (record) => {
      const t = now();
      const p = prop.propagate(record, t);
      if (!p || !['sun-inertial', 'earth-inertial'].includes(p.frame)) return null;
      if (p.frame === 'earth-inertial') {
        const la = frames.lookAngles(observer, frames.eciToEcef(p, frames.gmst(new Date(t))));
        return la ? { altDeg: (la.el * 180) / Math.PI, azDeg: (la.az * 180) / Math.PI } : null;
      }
      const earth = frames.worldHelioEclKm('earth', t);
      if (!earth) return null;
      const d = { x: p.x - earth.x, y: p.y - earth.y, z: p.z - earth.z };
      const n = Math.hypot(d.x, d.y, d.z);
      if (!(n > 0)) return null;
      const eq = frames.eclipticToEquatorial({ x: d.x / n, y: d.y / n, z: d.z / n });
      const ra = (Math.atan2(eq.y, eq.x) * 180) / Math.PI;
      const dec = (Math.asin(Math.max(-1, Math.min(1, eq.z))) * 180) / Math.PI;
      return look.altAzOfSky(ra, dec, observer, t);
    },
    satAltAz: (record) => {
      const p = prop.propagate(record, now());
      if (!p || p.frame !== 'earth-inertial') return null;
      const la = frames.lookAngles(observer, frames.eciToEcef(p, frames.gmst(new Date(now()))));
      return la ? { altDeg: (la.el * 180) / Math.PI, azDeg: (la.az * 180) / Math.PI } : null;
    },
  };
}
