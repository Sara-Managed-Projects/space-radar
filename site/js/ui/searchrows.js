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
//   constellationCentre(lines) -> { raDeg, decDeg } | null    where a figure's lines are, on average
//   setConstellations(names, lines) / loadConstellations() -> the 88 star patterns as rows ("orion")
//   readKind(query, index) -> { row, of } | null       a kind of thing typed: "galaxies", "moons of saturn"
//   setClasses(list) / loadClasses() / classOf(record)  the visual classes (data/visualclasses.js)
//   modelOf(record) -> 'real' | 'rebuilt' | null        drawn from a 3D model, or a reconstruction
//   kindHits(index, kind, opts) / byKind(index, result, kind, opts) -> the rows of a kind, grouped
//   wantKinds(kind, only) -> a promise while what they need is still arriving, else null
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
import { KINDS } from '../data/kindwords.js';
import { realModelFor } from '../scene/realmodels.js';
import { HEROES } from '../scene/deep/heroes.js';
import { loadCss } from './latercss.js';

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
    }).map((h) => (of(h) ? { extra: 'group', id: g.id, klass: 'satellite', name: g.name, sub: t(R.group, { n: fmt.int(total) }), record: null, at: -1, length: 0, group: h.group } : h));
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

// --- the star patterns (internal #551, from #432: "'orion' finds the nebula, not the constellation") ---
// The 88 IAU figures are not records: the sky has no object called Orion. Their names are in
// data/constellation-names.json and their lines in data/constellations.lines.json (the files the
// figures and the labels already read); a row's aim is the mean direction of a figure's own line
// vertices (not the label's anchor, which sits at one end of a long figure such as Andromeda).
// Fetched when this module is (the first focus of the field), 31 kB, never at boot.
const DEG = Math.PI / 180;
let stars = [];

/** The mean direction of a figure's line vertices, J2000, in degrees; null when it has none. Pure. */
export function constellationCentre(feature) {
  const g = feature && feature.geometry;
  const lines = g && g.type === 'MultiLineString' ? g.coordinates : g && g.type === 'LineString' ? [g.coordinates] : [];
  let x = 0; let y = 0; let z = 0; let n = 0;
  for (const line of lines) {
    for (const p of line || []) {
      const ra = Number(p && p[0]) * DEG; const dec = Number(p && p[1]) * DEG;
      if (!Number.isFinite(ra) || !Number.isFinite(dec)) continue;
      x += Math.cos(dec) * Math.cos(ra); y += Math.cos(dec) * Math.sin(ra); z += Math.sin(dec); n += 1;
    }
  }
  const len = Math.hypot(x, y, z);
  if (!n || !(len > 1e-9)) return null;
  return { raDeg: ((Math.atan2(y, x) / DEG) + 360) % 360, decDeg: Math.asin(z / len) / DEG };
}

/** Make the rows from the two files' parsed contents. Figures with no lines are left out (nothing to aim at). */
export function setConstellations(names, lines) {
  const byId = new Map(((lines && lines.features) || []).map((f) => [f.id, f]));
  stars = [];
  for (const n of Array.isArray(names) ? names : []) {
    const c = constellationCentre(byId.get(n.id));
    if (!c || !n.name) continue;
    stars.push({ extra: 'constellation', id: n.id, name: n.name, sub: COPY.searchRows.starPattern, words: norm(n.name), raDeg: c.raDeg, decDeg: c.decDeg });
  }
  return stars.length;
}

let starsLoading = null;
/** Fetch the two files once. Never rejects: with no files there are no star-pattern rows. */
export function loadConstellations(doFetch = typeof fetch === 'function' ? fetch : null) {
  if (starsLoading || !doFetch) return starsLoading || Promise.resolve(0);
  const get = (name) => doFetch(new URL(`../../data/${name}`, import.meta.url)).then((r) => (r.ok ? r.json() : null));
  starsLoading = Promise.all([get('constellation-names.json'), get('constellations.lines.json')])
    .then(([names, lines]) => setConstellations(names, lines), () => 0);
  return starsLoading;
}
if (typeof document !== 'undefined') loadConstellations();

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
  const pool = all().concat(stars, NEAR());
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
  const order = { suggest: 0, constellation: 1, trip: 2, mission: 3, event: 4 };
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
    out.push({ extra: e.extra, id: e.id, name: e.name, sub: e.sub, record: e.record || null, ...(e.extra === 'constellation' ? { raDeg: e.raDeg, decDeg: e.decDeg } : {}) });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * A star pattern's row: the dome from the visitor's place (the Now door, which guesses a place and
 * says it is a guess when none is set), turned to the figure; or, if it is under the horizon, the
 * scene's one line says so. The sky keeps its own ring on what it was turned to (skyView.pointAt).
 */
function turnToStars(ctx, hit) {
  const sky = ctx.skyView;
  if (!sky || typeof sky.pointAt !== 'function' || !Number.isFinite(hit.raDeg)) return false;
  if (!sky.active && typeof ctx.setMoment === 'function') ctx.setMoment(COPY.moments.now.id);
  const aimed = sky.pointAt({ raDeg: hit.raDeg, decDeg: hit.decDeg });
  if (aimed === false && ctx.sceneNote && typeof ctx.sceneNote.say === 'function') ctx.sceneNote.say(t(COPY.search.belowHorizon, { name: hit.name }));
  return true;
}

/** Do what an extra row offers. Returns false when it could not (the caller leaves the list open). */
export function runExtra(ctx, hit) {
  if (!ctx || !hit) return false;
  try {
    if (hit.extra === 'trip') { if (ctx.trip && typeof ctx.trip.start === 'function') { ctx.trip.start(hit.id); return true; } return false; }
    if (hit.extra === 'constellation') return turnToStars(ctx, hit);
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

// --- search by kind (internal spec 0076 W3-e; internal #879, #880) ---------------------------------
//
// "galaxies", "nebulae", "moons of saturn" found nothing: no record is NAMED that. A kind's words are
// registry/aliases.yaml `kinds:` (data/kindwords.js); its members are the visual classes W2-e gave every
// record (registry/visual-classes.yaml through data/visualclasses.js, 19 kB, fetched the first time a
// kind is typed). The rows are the records of the index (what the map holds now), grouped by class under
// a microlabel, the groups taking turns at the eight rows. Nothing here flies: a row is an ordinary
// object row, and picking it is search.js pick(), as before.

const KIND_AT = new Map();
for (const row of KINDS) for (const w of row.say) KIND_AT.set(w, row);
// The record sets whose ids ARE records' ids, read before the sets that list them again under another
// heading (a photograph, a hero, a model): dso-lmc is a spiral in `dso` and an irregular in `heroes`, and
// the record's own row is the one the registry classifies (scripts/coverage.py, one class a record).
const OWN_SETS = ['worlds', 'small_bodies', 'probes', 'systems', 'planets', 'exotics', 'stars_notable', 'dso', 'sites', 'oddities', 'reentries', 'weather', 'rings'];
// The class that is a layer drawing several classes: it says nothing about any one of its records.
const MIXED = 'MIXED_LAYER';
// The kinds the model layer can draw from a file (ui/drift.js lookOf asks the same of the same table).
const MODELLED = new Set(['station', 'satellite', 'telescope', 'probe', 'rocket', 'site', 'asteroid', 'comet']);
/** Rows a kind's name matches may keep beside its groups ("By name"). */
export const NAME_ROWS = 2;

let classes = null;
let classesAsked = null;
let heroes = null;
let heroesAsked = null;

/** Make the tables from data/visualclasses.js VISUAL_CLASSES. Pure but for the module's state. */
export function setClasses(list) {
  const rows = (Array.isArray(list) ? list : []).filter((c) => c && c.id);
  const byId = new Map();
  const byLayer = new Map();
  for (const own of [true, false]) {
    for (const c of rows) {
      for (const [set, ids] of Object.entries(c.members || {})) {
        if (set === 'layers' || OWN_SETS.includes(set) !== own) continue;
        for (const id of ids) if (!byId.has(id)) byId.set(id, c.id);
      }
    }
  }
  for (const c of rows) {
    if (c.id === MIXED) continue;
    for (const id of (c.members && c.members.layers) || []) if (!byLayer.has(id)) byLayer.set(id, c.id);
  }
  classes = { byId, byLayer, title: new Map(rows.map((c) => [c.id, c.title])), order: rows.map((c) => c.id) };
  return byId.size;
}

export function loadClasses() {
  if (classes) return Promise.resolve(true);
  if (!classesAsked) {
    classesAsked = import('../data/visualclasses.js').then((m) => { setClasses(m.VISUAL_CLASSES); return true; }, () => { classesAsked = null; return false; });
  }
  return classesAsked;
}

/** The class of one index entry: its own id first, else its layer's. null when neither is classified. */
export function classOf(record) {
  if (!record || !classes) return null;
  return classes.byId.get(record.id) || classes.byLayer.get(record.layer) || null;
}

/** The deep-sky heroes whose profiles say `shipped` (registry/deepsky-heroes/*.yaml), as record ids. */
export function setHeroes(ids) { heroes = new Set(ids || []); return heroes.size; }

function loadHeroes() {
  if (heroes) return Promise.resolve(true);
  if (!heroesAsked) {
    heroesAsked = Promise.all(HEROES.map((h) => h.profile().then((m) => (m && m.HERO && m.HERO.shipped ? h.record : null), () => null)))
      .then((ids) => { setHeroes(ids.filter(Boolean)); return true; });
  }
  return heroesAsked;
}

/**
 * What a record is drawn from in 3D: 'real' for a model file that is its own (a NASA glTF, a shape
 * model), 'rebuilt' for a shipped deep-sky reconstruction, null for a mark, a glyph, a generic shape or
 * a mapped globe. The same test Drift's "real models only" makes (ui/drift.js lookOf).
 */
const modelSeen = new WeakMap(); // record -> its answer: "has a model" asks every record of the map
export function modelOf(record) {
  if (!record) return null;
  if ((heroes && heroes.has(record.id)) || (record.meta && record.meta.heroId)) return 'rebuilt';
  if (!MODELLED.has(record.klass)) return null;
  if (modelSeen.has(record)) return modelSeen.get(record);
  let m = null;
  try { m = realModelFor(record); } catch { m = null; }
  const answer = m && m.file && !m.generic ? 'real' : null;
  modelSeen.set(record, answer);
  return answer;
}

/** A promise while the classes or the heroes a query needs are still arriving; null when all is here. */
export function wantKinds(kind, only) {
  const asks = [];
  if (kind && !classes) asks.push(loadClasses());
  if ((only || (kind && kind.row.model)) && !heroes) asks.push(loadHeroes());
  return asks.length ? Promise.all(asks) : null;
}

/** False only for a look tool's "before" picture: `?look=1` and `window.srSearchBefore = true`. */
export function kindsOn() {
  try { return !(window.srSearchBefore === true && /[?&]look=1(&|$)/.test(location.search)); } catch { return true; }
}

function worldNamed(index, name) {
  for (let i = 0; i < index.n; i += 1) {
    const r = index.record[i];
    if (r && r.klass === 'world' && index.name[i] === name) return { id: r.id, name: r.name };
  }
  return null;
}

/**
 * The kind a query names, or null. "galaxies"; "moons of saturn", "saturn moons", "saturn's moons" for a
 * row that takes a world (`of`). Whole words only: "galax" is still a name being typed.
 */
export function readKind(query, index) {
  const q = norm(query).replace(/’/g, "'");
  if (q.length < 3) return null;
  if (KIND_AT.has(q)) return { row: KIND_AT.get(q), of: null };
  if (!index || !index.n) return null;
  const tail = /^(.+?) (?:of|round|around) (?:the )?(.+)$/.exec(q);
  if (tail && KIND_AT.has(tail[1]) && KIND_AT.get(tail[1]).of) {
    const of = worldNamed(index, tail[2]);
    if (of) return { row: KIND_AT.get(tail[1]), of };
  }
  const head = /^(.+?)(?:'s|s')? (\S+(?: \S+)?)$/.exec(q);
  if (head && KIND_AT.has(head[2]) && KIND_AT.get(head[2]).of) {
    const of = worldNamed(index, head[1]);
    if (of) return { row: KIND_AT.get(head[2]), of };
  }
  return null;
}

function hitOf(index, i, group, drawn) {
  const record = index.record[i];
  return { record, name: record.name || COPY.card.unknownName, where: index.where[i], klass: record.klass || 'unknown', score: 0, at: -1, length: 0, group, drawn };
}

/**
 * The records of a kind in the index, grouped (one pass; kindHits and byKind share it). `only` keeps
 * what has a 3D model; `skip` is a set of record ids already shown. Within a group the brighter first
 * (the registry's order for a planet's moons), then the index's own ladder.
 */
const collected = new WeakMap(); // index -> key -> what collectKind found: the toggle and a re-run are free
function collectKind(index, kind, only, skip) {
  const out = { lists: [], ids: new Set(), total: 0 };
  if (!index || !index.n || !kind || !classes) return out;
  const key = [kind.row.say[0], kind.of ? kind.of.id : '', only ? 1 : 0, heroes ? heroes.size : -1, skip ? [...skip].join() : ''].join('|');
  if (!collected.has(index)) collected.set(index, new Map());
  const memo = collected.get(index);
  if (memo.has(key)) return memo.get(key);
  memo.set(key, out);
  const S = COPY.r12Search;
  const model = !!kind.row.model;
  const want = model ? null : new Set(kind.row.classes);
  const first = new Map(); // record id -> { i, cls }: the best-ranked entry, and a class from any entry
  for (let i = 0; i < index.n; i += 1) {
    const r = index.record[i];
    if (!r || r.id == null || (skip && skip.has(r.id))) continue;
    if (kind.of && labelParentId(r) !== kind.of.id) continue;
    const cls = classOf(r);
    const had = first.get(r.id);
    if (!had) first.set(r.id, { i, cls });
    else if (!had.cls && cls) had.cls = cls;
  }
  const groups = new Map();
  for (const [id, { i, cls }] of first) {
    if (want && !want.has(cls)) continue;
    const drawn = only || model ? modelOf(index.record[i]) : null;
    if ((only || model) && !drawn) continue;
    const key = cls || 'other';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({ i, drawn });
    out.ids.add(id);
  }
  const order = (model ? classes.order.concat('other') : kind.row.classes).filter((k) => groups.has(k));
  out.lists = order.map((k) => {
    const list = groups.get(k);
    list.sort((a, b) => (kind.of ? a.i - b.i
      : (index.mag[a.i] - index.mag[b.i]) || (index.pop[b.i] - index.pop[a.i]) || (index.kind[a.i] - index.kind[b.i])
        || (index.picked[b.i] - index.picked[a.i]) || (index.rank[a.i] - index.rank[b.i]) || (index.len[a.i] - index.len[b.i]) || (a.i - b.i)));
    const label = k === 'other' ? S.other : (S.groups && S.groups[k]) || classes.title.get(k) || k;
    const named = kind.of ? t(S.of, { label: label.charAt(0).toLowerCase() + label.slice(1), world: kind.of.name }) : label;
    out.total += list.length;
    return { group: { id: k, text: t(S.group, { label: named, n: fmt.int(list.length) }) }, list };
  });
  return out;
}

/** `limit` rows of what collectKind found, the groups taking turns: one row each in order, round again. */
function shareKind(index, found, limit) {
  const S = COPY.r12Search;
  const take = found.lists.map(() => 0);
  let room = Math.max(0, limit);
  for (let moved = true; room > 0 && moved;) {
    moved = false;
    for (let k = 0; k < found.lists.length && room > 0; k += 1) if (take[k] < found.lists[k].list.length) { take[k] += 1; room -= 1; moved = true; }
  }
  const hits = [];
  found.lists.forEach((g, k) => {
    for (const { i, drawn } of g.list.slice(0, take[k])) hits.push(hitOf(index, i, g.group, drawn ? (drawn === 'real' ? S.real : S.rebuilt) : undefined));
  });
  return hits;
}

/**
 * The records of a kind in the index, grouped: at most `limit` rows. Each row carries `group` ({id,
 * text}, the microlabel search.js draws over the first of a run) and, in a 3D listing, `drawn`.
 */
export function kindHits(index, kind, { limit = 8, only = false, skip = null } = {}) {
  const found = collectKind(index, kind, only, skip);
  return { hits: shareKind(index, found, limit), total: found.total, ids: found.ids };
}

/**
 * findMatches' answer, made the answer to a kind or to the 3D toggle. `result` was asked for with a cap
 * far past the eight rows, so the toggle filters every match and not the eight shown. An exact name
 * leads ("moon" is the Moon, then the moons); then the kind's groups; then up to NAME_ROWS other records
 * whose name starts a word with the query ("galaxy" also finds the satellite GALAXY 19), under "By name".
 * `none` when the toggle left nothing of what matched.
 */
export function byKind(index, result, kind, { limit = 8, only = false, exact = 900, word = 700 } = {}) {
  const hits = (result && result.hits) || [];
  const out = { hits: [], total: 0, query: result ? result.query : '', fallback: false, none: false };
  const needModel = only || !!(kind && kind.row.model);
  const keep = (h) => h && h.record && (!needModel || modelOf(h.record));
  // What a row of a 3D listing says it is drawn from, after its kind.
  const said = (h) => {
    const m = needModel ? modelOf(h.record) : null;
    return m ? { ...h, drawn: m === 'real' ? COPY.r12Search.real : COPY.r12Search.rebuilt } : h;
  };
  if (!kind || !classes) {
    const shown = only ? hits.filter(keep) : hits;
    out.hits = shown.slice(0, limit).map(said);
    out.total = only ? shown.length : result.total;
    out.fallback = !!(result && result.fallback);
    out.none = only && hits.length > 0 && !shown.length;
    return out;
  }
  const lead = hits[0] && hits[0].score >= exact && keep(hits[0]) ? hits[0] : null;
  const skip = new Set(lead ? [lead.record.id] : []);
  const found = collectKind(index, kind, only, skip);
  const names = hits.filter((h) => h !== lead && h.score >= word && keep(h) && !found.ids.has(h.record.id));
  const nameRoom = found.total ? Math.min(NAME_ROWS, names.length) : Math.min(limit - (lead ? 1 : 0), names.length);
  const groups = { hits: shareKind(index, found, limit - (lead ? 1 : 0) - nameRoom), total: found.total };
  const byName = { id: 'name', text: COPY.r12Search.byName };
  out.hits = [...(lead ? [said(lead)] : []), ...groups.hits, ...names.slice(0, nameRoom).map((h) => ({ ...said(h), group: groups.total ? byName : undefined }))];
  out.total = (lead ? 1 : 0) + groups.total + names.length;
  out.none = only && !out.hits.length && hits.length > 0;
  return out;
}

/** How many matches a kind or the toggle asks findMatches for: it keeps from all of them, not the eight shown. */
export const KIND_CAP = 5000;

/**
 * ui/search.js's whole question when the rows have landed: findMatches as before, or, for a kind or with
 * the toggle on, byKind over KIND_CAP matches. `kind` and `note` (the foot's line: "counting…" while the
 * classes are on their way, or that the toggle left nothing; either way not a miss) ride on the answer;
 * `again` is called once the classes have arrived.
 */
export function answer(index, q, only, { find, limit = 8, exact = 900, word = 700, again = null } = {}) {
  const on = kindsOn();
  const kind = on ? readKind(q, index) : null;
  const wait = on ? wantKinds(kind, only) : null;
  if (wait && again) wait.then(again);
  if (!kind && !(on && only)) return find(index, q, limit);
  const out = byKind(index, find(index, q, KIND_CAP), kind, { limit, only: on && only, exact, word });
  out.kind = kind;
  // The foot's line, and not a miss: the classes are on their way, or the toggle left nothing.
  out.note = kind && wait && !out.hits.length ? COPY.r12Search.counting : out.none ? COPY.r12Search.noneWithModel : '';
  return out;
}

// The two nodes search by kind adds to the list (ui/search.js draws them; they are built here so the
// field on the first screen does not carry them). Their look is css/searchkinds.css.

/** A group's microlabel: heard as its rows' description (aria-describedby), not as a row of its own. */
export function groupHead(group, id) {
  const head = document.createElement('li');
  head.className = 'sr-search__head';
  head.textContent = group.text;
  head.id = id;
  head.dataset.group = group.id;
  head.setAttribute('role', 'presentation');
  head.setAttribute('aria-hidden', 'true');
  return head;
}

/** The "3D models" toggle under the results: pressed with the field keeping the focus, so a touch never blurs the list shut. */
export function onlyToggle(onPress, onEscape) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sr-search__only';
  b.textContent = COPY.r12Search.only;
  b.title = COPY.r12Search.onlyTitle;
  b.setAttribute('aria-pressed', 'false');
  b.addEventListener('pointerdown', (event) => event.preventDefault());
  b.addEventListener('click', onPress);
  b.addEventListener('keydown', (event) => { if (event.key === 'Escape') { event.preventDefault(); onEscape(); } });
  return b;
}

/** Shown under results that hold objects, or while it is on; never in a look tool's before picture. */
export function paintToggle(b, state) {
  b.hidden = !kindsOn() || !(state.only || (!state.missed && state.hits.some((h) => h.record && !h.extra)));
  b.setAttribute('aria-pressed', state.only ? 'true' : 'false');
}

if (typeof document !== 'undefined') loadCss('searchkinds');
