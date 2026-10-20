// ui/passportkinds.js -- the passport's second page: what you have opened by kind, and what is noted
// (internal i#911, SR-PLAN-144, release 1.3.0). Read by ui/passport.js, which is itself fetched late.
//
// Contract, pure (tests/test_passport_kinds.mjs):
//   FAMILIES                           the kinds, in the fixed order the view lists them
//   familyOfKlass(klass), familyOfId(id)
//   kindCounts(p, recordById) -> { [family]: n }   places opened, by kind
//   ACHIEVEMENTS                       the curated notes: { id, test(stats) }
//   statsOf(p, recordById) -> stats
//   noteAchievements(p, recordById, nowMs) -> p    adds the day a note first held; never takes one away
//   notedList(p) -> [[id, ms]], newest first
// Contract, DOM:
//   kindsSections(p, ctx, el) -> [section nodes]   "By kind" and "Noted", for the passport view
//
// WHAT IT IS NOT. A score. There is no level, no streak, no percentage of the sky, no "n to go", no
// badge that is greyed out until it is won, and nothing ranks one visitor against another or leaves this
// browser: the list shows only what is already true, in plain words, with the day it was first noticed. The
// kinds are listed in the same fixed order whatever the counts are. "Forget me" removes all of it with the
// rest of the passport (it is the same localStorage record: ui/passport.js).
//
// HONESTY. "Noted on" is the day this browser first saw the note hold, not the day the thing was done: a
// passport kept before 1.3.0 has its first look on the day it is opened, and the page says so. A count is
// of places opened on this browser, capped at the passport's own 300; opening a place is not seeing it.

import { COPY, fmt, timeText } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';

// Its rules (css/compare.css) arrive with the passport, which is itself fetched late; a stand-in document has no head for them.
if (typeof document !== 'undefined' && document.head) Promise.resolve().then(() => loadCss('compare')).catch(() => {});

export const FAMILIES = ['worlds', 'stations', 'satellites', 'spacecraft', 'small', 'stars', 'exoplanets', 'deep', 'earth'];

const BY_KLASS = {
  world: 'worlds',
  station: 'stations',
  satellite: 'satellites',
  debris: 'satellites',
  rocket: 'satellites',
  probe: 'spacecraft',
  telescope: 'spacecraft',
  asteroid: 'small',
  comet: 'small',
  star: 'stars',
  exoplanet: 'exoplanets',
  dso: 'deep',
  exotic: 'deep',
  site: 'earth',
  storm: 'earth',
  earthevent: 'earth',
  aurora: 'earth',
  lightning: 'earth',
};

/** The kind a record's class belongs to, or null where it belongs to none (an oddity, an unknown). */
export function familyOfKlass(klass) {
  return Object.prototype.hasOwnProperty.call(BY_KLASS, klass) ? BY_KLASS[klass] : null;
}

const PLANETS = ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune'];
const WORLD_IDS = new Set(['sun', 'moon', 'pluto', ...PLANETS]);

/**
 * The kind of a place from its id alone, for a passport kept before the kinds were: ids carry their
 * layer ("dso-m31", "sat-25544"). null where the id does not say, and then the place is counted in the
 * total and in no kind. Pure.
 */
export function familyOfId(id) {
  const s = String(id || '');
  if (WORLD_IDS.has(s)) return 'worlds';
  if (/^(dso|exotic)-/.test(s)) return 'deep';
  if (/^(sat|int)-/.test(s)) return 'satellites';
  if (/^event-/.test(s)) return 'earth';
  return null;
}

/** Places opened, by kind: the family kept at the time, else the record's own class, else the id's. Pure. */
export function kindCounts(p, recordById) {
  const out = {};
  for (const id of Object.keys((p && p.visited) || {})) {
    let fam = p.kinds && p.kinds[id];
    if (!fam) {
      const rec = typeof recordById === 'function' ? recordById(id) : null;
      fam = (rec && familyOfKlass(rec.klass)) || familyOfId(id);
    }
    if (fam && FAMILIES.includes(fam)) out[fam] = (out[fam] || 0) + 1;
  }
  return out;
}

/** What the tests of the notes read. Pure. */
export function statsOf(p, recordById) {
  const counts = kindCounts(p, recordById);
  const visited = (p && p.visited) || {};
  return {
    counts,
    total: Object.keys(visited).length,
    planets: PLANETS.filter((id) => visited[id]).length,
    trips: Object.values((p && p.trips) || {}).filter((row) => row && row.done > 0).length,
    seen: Object.keys((p && p.seen) || {}).length,
  };
}

const has = (s, fam) => (s.counts[fam] || 0) >= 1;

/**
 * The notes, curated: each says one thing that is already true. Order is the order they were thought of and
 * the order the view lists them in when they have the same day. The words are COPY.passportKinds.noted[id].
 */
export const ACHIEVEMENTS = [
  { id: 'first', test: (s) => s.total >= 1 },
  { id: 'planets', test: (s) => s.planets === PLANETS.length },
  { id: 'station', test: (s) => has(s, 'stations') },
  { id: 'craft', test: (s) => has(s, 'spacecraft') },
  { id: 'small', test: (s) => has(s, 'small') },
  { id: 'star', test: (s) => has(s, 'stars') },
  { id: 'exoplanet', test: (s) => has(s, 'exoplanets') },
  { id: 'deep', test: (s) => has(s, 'deep') },
  { id: 'trip', test: (s) => s.trips >= 1 },
  { id: 'eyes', test: (s) => s.seen >= 1 },
  { id: 'every', test: (s) => FAMILIES.every((fam) => has(s, fam)) },
];

const okMs = (n) => Number.isFinite(n) && n > 0;

/** Note every note that holds now and has no day yet. A day once kept stays: nothing is taken back. Mutates and returns `p`. */
export function noteAchievements(p, recordById, nowMs) {
  if (!p || !okMs(nowMs)) return p;
  if (!p.ach || typeof p.ach !== 'object') p.ach = {};
  const s = statsOf(p, recordById);
  for (const a of ACHIEVEMENTS) if (!p.ach[a.id] && a.test(s)) p.ach[a.id] = nowMs;
  return p;
}

/** The notes that hold, newest first, then in the list's order: [[id, ms]]. Pure. */
export function notedList(p) {
  const order = new Map(ACHIEVEMENTS.map((a, i) => [a.id, i]));
  return Object.entries((p && p.ach) || {})
    .filter(([id, ms]) => order.has(id) && okMs(ms))
    .sort((x, y) => (y[1] - x[1]) || (order.get(x[0]) - order.get(y[0])));
}

// ---------------------------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------------------------

/**
 * The two sections the passport view gains. `el` is the view's own element builder, so the classes of the
 * passport's other sections (sr-passport__sect, __head, __num, sr-list) are the ones these wear.
 */
export function kindsSections(p, ctx, el) {
  const K = COPY.passportKinds;
  const counts = kindCounts(p, ctx && ctx.recordById);
  const out = [];

  const kinds = el('section', 'sr-passport__sect');
  const kindsHead = el('div', 'sr-passport__head');
  kindsHead.appendChild(el('h3', 'sr-micro', K.kindsTitle));
  kinds.appendChild(kindsHead);
  const present = FAMILIES.filter((fam) => counts[fam]);
  if (present.length) {
    const list = el('ul', 'sr-list sr-list--quiet sr-passport__kinds');
    for (const fam of present) {
      const li = el('li', 'sr-list__row sr-list__static');
      li.appendChild(el('span', 'sr-list__name', K.kinds[fam]));
      li.appendChild(el('span', 'sr-list__value', fmt.int(counts[fam])));
      list.appendChild(li);
    }
    kinds.appendChild(list);
  } else {
    kinds.appendChild(el('p', 'sr-passport__empty', K.noKinds));
  }
  out.push(kinds);

  const noted = notedList(p);
  const sect = el('section', 'sr-passport__sect');
  const head = el('div', 'sr-passport__head');
  head.appendChild(el('h3', 'sr-micro', K.notedTitle));
  sect.appendChild(head);
  if (noted.length) {
    const list = el('ul', 'sr-list sr-list--quiet sr-passport__noted');
    for (const [id, ms] of noted) {
      const words = K.noted[id];
      if (!words) continue;
      const li = el('li', 'sr-list__row sr-list__static sr-passport__note-row');
      const text = el('span', 'sr-passport__notetext');
      text.appendChild(el('span', 'sr-list__name', words.name));
      text.appendChild(el('span', 'sr-passport__notesaid', words.said));
      li.appendChild(text);
      li.appendChild(el('span', 'sr-list__value', timeText.localDate(ms)));
      list.appendChild(li);
    }
    sect.appendChild(list);
    sect.appendChild(el('p', 'sr-passport__fine', K.notedFine));
  } else {
    sect.appendChild(el('p', 'sr-passport__empty', K.noNoted));
  }
  out.push(sect);
  return out;
}

