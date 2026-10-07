// ui/search.js -- find an object by name or catalogue number, and fly to it.
//
// Contract export: createSearch(ctx, host) -> { destroy(), focus(), refresh() }
// Also exported, and pure, so the ranking can be measured without a DOM:
//   buildIndex(records, layers) -> Index
//   findMatches(index, query, limit) -> { hits, total, query }
//   closest(index, query, limit) -> hits      the nearest names, for a query that found nothing
//
// This module finds a record and hands it to ctx.select(). It does NOT fly the camera and does
// NOT open the card: main.js's select() already does both, and a second implementation of either
// would be a second thing to keep true.
//
// Three decisions worth knowing before reading:
//
//  1. THE INDEX IS FLAT. Records arrive over several seconds and there can be 17 579 of them.
//     Parallel arrays of already-lower-cased strings, built once per layer-load burst, so a
//     keystroke is one linear pass of indexOf and nothing else.
//
//     MEASURED IN THE BROWSER, on the live catalogue -- 17 537 real records, Chrome on an
//     M-series Mac, not a bench in node: building the whole index takes 19.8 ms, and ONE QUERY
//     (17 537 indexOf calls plus the sort and the de-duplication) has a median of 0.4-0.9 ms for
//     the queries a person types -- "iss" 0.6, "25544" 0.7, "dragon" 0.4, "noaa" 0.4. The worst
//     case is a two-letter prefix of the biggest constellation: "st" matches 11 384 objects and
//     costs a median of 3.9 ms, 7.8 ms at its worst, nearly all of it the sort. That is inside
//     one 60 Hz frame, and the input is debounced besides, so neither a worker nor an
//     incremental structure earns its weight. (The same code in node 24 is 3-4x faster; the
//     browser number is the one that matters, so the browser number is the one written down.)
//
//  2. THE DROPDOWN IS IN FLOW, not absolutely positioned. `.sr-controls` is a scroll container
//     (`overflow-y: auto`, and on a phone it is a 62vh drawer), so an absolutely positioned
//     popup would be clipped by its own panel. An in-flow list cannot be.
//
//  3. SWITCHING THE LAYER ON BEFORE SELECTING. See pick() -- it is the difference between the
//     feature working and looking broken.

import { COPY, t, fmt } from '../copy/en.js';
import { ALIASES } from '../data/aliases.js';
import { labelParentId } from './labels.js';

// Ids are per instance, not per module. aria-controls and aria-activedescendant are id
// REFERENCES, so two panels sharing one id silently point a screen reader at the other panel's
// list. There is one panel today, so this changes nothing visible; it removes a way for a second
// one to be wrong. (This was fixed once already and lost when PR #7 squashed -- MEASURED: two
// instances both took the id `sr-search-list`.)
let instances = 0;

const MIN_QUERY = 2; // one letter matches thousands of things and helps nobody
/** Added to an alias's own score so the canonical object outranks anything merely named alike. */
const ALIAS_BONUS = 10000;
const MAX_RESULTS = 8; // spec 0021 requirement 7: a list of twelve was still a scroll
const MISS_QUOTE = 18; // how much of a query that found nothing is quoted back, so the line stays one line
const INPUT_DEBOUNCE_MS = 120;
// `sr:layer` fires once per layer, ~15 times over several seconds. Rebuilding 17 000 entries on
// each is waste; this is the trailing edge of the burst. A query that arrives before it fires
// rebuilds on the spot instead (see ensureIndex), so the wait is never visible.
const REBUILD_DEBOUNCE_MS = 600;

// Scoring. The gaps are wide so that a tie-break can never climb a tier.
const CAT_EXACT = 1000; // "25544" is unambiguous: the strongest signal there is
const NAME_EXACT = 900;
const NAME_PREFIX = 800;
const WORD_PREFIX = 700; // "dragon" finds "CREW DRAGON 12"
const NAME_CONTAINS = 600;
const ALIAS_WORD = 650; // a word of another name for it (worlds.yaml aliases)
const OTHER_CONTAINS = 500; // designator or operator
// Below every tier the brief names, and the reason it exists: a catalogue number is typed one
// digit at a time. Without it "2554" finds nothing at all and "25544" finds the station, which
// reads as the search being broken rather than as the number being incomplete.
const CAT_PREFIX = 400;
/** How many of a planet's moons follow it when it is named exactly. */
export const MOONS_AFTER = 4;
/** The weakest hit a `#at=` link will fly to (main.js resolveAt): the start of a word or better. */
export const LINK_MIN_SCORE = WORD_PREFIX;

const reduceMotion =
  typeof window !== 'undefined' && window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false, addEventListener() {} };

// ---------------------------------------------------------------------------------------
// DOM helpers -- textContent only, never innerHTML. Same two as ui/controls.js.
// ---------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

// ---------------------------------------------------------------------------------------
// Reading ctx, exactly as ui/controls.js does: through the contract, never into internals.
// ---------------------------------------------------------------------------------------

function layerList(ctx) {
  const l = ctx && ctx.layers;
  if (Array.isArray(l)) return l;
  if (l && Array.isArray(l.LAYERS)) return l.LAYERS;
  if (l && Array.isArray(l.list)) return l.list;
  return [];
}

function recordsOf(ctx) {
  try {
    const r = ctx && typeof ctx.records === 'function' ? ctx.records() : null;
    return Array.isArray(r) ? r : [];
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------------------
// The index
// ---------------------------------------------------------------------------------------

/** Lower-cased, trimmed, inner runs of whitespace collapsed. Applied to the query too. */
function norm(value) {
  if (value === null || value === undefined) return '';
  return String(value).trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * A word boundary in an object name. Names are shouted catalogue strings -- "NOAA 20 (JPSS-1)",
 * "COSMOS 2251 DEB", "SL-16 R/B" -- so the separators are punctuation, not case changes.
 */
function isBoundary(code) {
  return (
    code === 32 || // space
    code === 45 || // -
    code === 40 || // (
    code === 41 || // )
    code === 47 || // /
    code === 46 || // .
    code === 44 || // ,
    code === 95 || // _
    code === 39 // '
  );
}

/**
 * Build the flat index.
 *
 * @param {Array<Object>} records  ctx.records()
 * @param {Array<Object>} layers   ctx.layers, for the display name and the tie-break rank
 * @returns {Object} parallel arrays, one entry per searchable record
 */
export function buildIndex(records, layers) {
  const list = Array.isArray(records) ? records : [];
  const rows = Array.isArray(layers) ? layers : [];

  // Rank is the layer's position in LAYERS. main.js picks the first hit in that order for a tap
  // on the sky -- "the layer order is the priority" -- so a search result uses the same ladder
  // and a station comes out ahead of a piece of debris.
  const rankOf = new Map();
  const displayOf = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const row = rows[i];
    if (!row || !row.id) continue;
    rankOf.set(row.id, i);
    displayOf.set(row.id, row.display || row.id);
  }

  const index = {
    n: 0,
    record: [],
    name: [], // lower-cased
    cat: [], // catalogue number as text, '' when the object has none
    desig: [], // lower-cased international designator
    oper: [], // lower-cased operator
    alias: [], // lower-cased other names, space-joined (worlds.yaml `aliases:`); '' for most
    rank: [], // layer position; smaller comes first
    len: [], // name length, a tie-break
    picked: [], // on the hand-kept list; a tie-break, see below
    mag: [], // apparent magnitude where the record has one, else Infinity; brighter first, see below
    where: [], // the layer's display name, for the quiet right-hand label
    pop: [], // a world or a station: what people mean by a name before anything that shares it
    kids: new Map(), // a world's id -> the entries of its moons, in the registry's order
    layers: displayOf,
  };

  for (const record of list) {
    if (!record) continue;
    const meta = record.meta || {};
    const name = norm(record.name || meta.objectName);
    const cat = meta.catalogueNumber != null ? meta.catalogueNumber : meta.noradId;
    const catText = Number.isFinite(Number(cat)) && cat !== null ? String(cat) : '';
    // The OMM parser carries no operator today; LightLive2 spells the same idea `provider`.
    // Both are read, neither is invented: an object with neither simply is not found by operator.
    const oper = norm(meta.operator || meta.provider);
    const aliasText = Array.isArray(meta.aliases) ? norm(meta.aliases.join(' ')) : '';
    if (!name && !catText && !oper && !aliasText) continue; // nothing to search it by

    index.record.push(record);
    index.name.push(name);
    index.cat.push(catText);
    index.desig.push(norm(meta.intlDesignator));
    index.oper.push(oper);
    index.alias.push(Array.isArray(meta.aliases) ? norm(meta.aliases.join(' ')) : '');
    const rank = rankOf.get(record.layer);
    index.rank.push(rank === undefined ? rows.length : rank);
    index.len.push(name.length);
    // layers.js stamps meta.why from the hand-kept NOTABLE list. It is the one curated "this is
    // the one people mean" signal a record carries, and it is what puts ISS (ZARYA) above
    // ISS (NAUKA): MEASURED on the live page, both are "iss" name-prefix hits in the same layer
    // with names of the same length, so without it the alphabet decides and the module wins.
    index.picked.push(meta.why ? 1 : 0);
    // Deep-sky rows added by hand carry `why` too, which made the tie-break promote Andromeda II
    // (a 13th-magnitude dwarf with a `why`) above the Andromeda Galaxy (a Messier row without one)
    // for "andromeda" -- MEASURED in tests/test_dso.mjs when the Local Group rows went in. Among
    // equal matches the brighter thing is the one a person means, so brightness decides first.
    const mag = Number.isFinite(meta.vmag) ? meta.vmag : Number.isFinite(meta.mag) ? meta.mag : Infinity;
    index.mag.push(mag);
    index.where.push(displayOf.get(record.layer) || '');
    index.pop.push(record.klass === 'world' || record.klass === 'station' ? 1 : 0);
    const parent = labelParentId(record);
    if (parent) { if (!index.kids.has(parent)) index.kids.set(parent, []); index.kids.get(parent).push(index.n); }
    index.n += 1;
  }
  return index;
}

/**
 * Score one entry against an already-normalised query. 0 means no match.
 * One indexOf over the name carries three of the tiers, which is why the scan is cheap.
 */
function scoreOne(index, i, q, numeric) {
  if (numeric && index.cat[i] === q) return CAT_EXACT;

  const name = index.name[i];
  if (name) {
    if (name === q) return NAME_EXACT;
    let at = name.indexOf(q);
    if (at === 0) return NAME_PREFIX;
    if (at > 0) {
      // A later occurrence may start a word even when the first one does not, so keep looking
      // before settling for "contains". This only runs on entries that already matched.
      while (at > 0) {
        if (isBoundary(name.charCodeAt(at - 1))) return WORD_PREFIX;
        at = name.indexOf(q, at + 1);
      }
      return NAME_CONTAINS;
    }
  }

  // An alias is a name people use, so it ranks like a word of the name -- below the name's own
  // words, above a match in the operator. "red planet" finds Mars; "planet" alone finds it too.
  //
  // A WHOLE alias word scores one more than the start of a longer one, and the one point is the
  // whole rule: "mars i" is Phobos's own name and only the beginning of Deimos's "mars ii", and
  // until 2026-09-22 the two tied and the alphabet put Deimos first. One point cannot climb a tier.
  const alias = index.alias[i];
  if (alias) {
    let best = 0;
    let at = alias.indexOf(q);
    while (at >= 0) {
      if (at === 0 || isBoundary(alias.charCodeAt(at - 1))) {
        const end = at + q.length;
        if (end === alias.length || isBoundary(alias.charCodeAt(end))) return ALIAS_WORD + 1;
        best = ALIAS_WORD;
      }
      at = alias.indexOf(q, at + 1);
    }
    if (best) return best;
  }
  const desig = index.desig[i];
  if (desig && desig.indexOf(q) >= 0) return OTHER_CONTAINS;
  const oper = index.oper[i];
  if (oper && oper.indexOf(q) >= 0) return OTHER_CONTAINS;
  if (numeric && index.cat[i] && index.cat[i].startsWith(q)) return CAT_PREFIX;
  return 0;
}

// What people type, against what the catalogue calls it: registry/aliases.yaml through its mirror
// (spec 0021 requirement 6). Searched ALONGSIDE the query, never instead of it -- see findMatches.

/**
 * The whole ranking, pure and DOM-free.
 *
 * @param {Object} index   from buildIndex
 * @param {string} query   raw user text
 * @param {number} [limit] how many rows to return; the total is reported whatever the cap
 * @returns {{hits: Array<Object>, total: number, query: string}}
 */
export function findMatches(index, query, limit = MAX_RESULTS) {
  const q = norm(query);
  // An alias is searched ALONGSIDE the query, never instead of it.
  //
  // The first version only fell back to the alias when the query as typed found nothing. That
  // read as conservative and was wrong on the real catalogue: typing "hubble" returned HUBBLE 6,
  // HUBBLE 7 and LEMUR-2-HUBBLE-4 -- Spire names its satellites after people -- so the query DID
  // match, the fallback never fired, and the Hubble Space Telescope was nowhere in the list.
  // Somebody typing "hubble" means the telescope; the satellites named after it sit underneath.
  //
  // hasOwnProperty, not a bare lookup. `ALIASES.constructor` and `ALIASES.__proto__` are
  // inherited and truthy, so a bare lookup replaced the query with a function or with
  // Object.prototype. MEASURED: findMatches(index, 'constructor').query was a FUNCTION, which
  // breaks the `{hits, total, query: string}` this function documents.
  const alias = Object.prototype.hasOwnProperty.call(ALIASES, q) ? ALIASES[q] : '';
  const out = { hits: [], total: 0, query: q, fallback: false };
  if (!index || !index.n || q.length < MIN_QUERY) return out;

  const numeric = /^[0-9]+$/.test(q);
  const aliasNumeric = alias ? /^[0-9]+$/.test(alias) : false;
  // The score is kept from the scan rather than recomputed in the comparator: scoring twice was
  // the difference between one pass and one pass plus a sort's worth of indexOf.
  // Spec 0021 requirement 4: a match is a whole thing or the start of a word. Letters buried inside
  // a word (NAME_CONTAINS) only count when the boundary pass found NOTHING, and the result says so
  // (`fallback`) -- "iss" must not offer SWISSCUBE next to the station, and when it offers only
  // buried matches the line under the list has to admit it.
  const found = [];
  let buried = [];
  for (let i = 0; i < index.n; i += 1) {
    let score = scoreOne(index, i, q, numeric);
    if (score === NAME_CONTAINS) { buried.push({ i, score }); score = 0; }
    if (alias) {
      // The alias must land at the START OF A WORD, which is what WORD_PREFIX and better mean.
      // Two measurements set that line. Requiring an exact name match was too strict: the
      // catalogue writes the station "ISS (ZARYA)" and China's "CSS (TIANHE)", so an
      // exact-only gate made every alias but `hubble` dead on arrival. Accepting a plain
      // contains was too loose: "hst" is inside "Republic of KazaHSTan", so "hubble" offered a
      // Baikonur launch pad.
      const aliasScore = scoreOne(index, i, alias, aliasNumeric);
      if (aliasScore >= WORD_PREFIX) score = Math.max(score, ALIAS_BONUS + aliasScore);
    }
    if (score > 0) found.push({ i, score });
  }
  // A PLANET'S MOONS COME AFTER IT (internal #419 item 10): "jupiter" offered JUPITER 3 (ECHOSTAR
  // 24), a television satellite, second, above Io and Europa. A world named exactly brings its
  // first MOONS_AFTER moons in one point under it, which is above anything that merely starts with
  // the word.
  for (const hit of found.slice()) {
    if (hit.score !== NAME_EXACT || index.record[hit.i].klass !== 'world') continue;
    const kids = index.kids.get(index.record[hit.i].id) || [];
    for (const k of kids.slice(0, MOONS_AFTER)) {
      const had = found.find((f) => f.i === k);
      if (had) had.score = Math.max(had.score, NAME_EXACT - 1);
      else found.push({ i: k, score: NAME_EXACT - 1, kid: true });
    }
  }
  if (!found.length && buried.length) { found.push(...buried); out.fallback = true; }
  buried = null;
  out.total = found.length;
  if (!found.length) return out;

  // Score first, then the layer ladder, then the shorter name -- "ISS (ZARYA)" ahead of
  // "ISS DEB (CZ-4 R/B)" when both merely contain the letters.
  found.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    // A moon brought in by its planet keeps the registry's order: Io, Europa, Ganymede, Callisto.
    if (a.kid && b.kid) return a.i - b.i;
    // A world or a station before anything else that matched as well: the popular thing first.
    if (index.pop[a.i] !== index.pop[b.i]) return index.pop[b.i] - index.pop[a.i];
    if (index.rank[a.i] !== index.rank[b.i]) return index.rank[a.i] - index.rank[b.i];
    // Brighter first: "andromeda" means the galaxy, not Andromeda II. A record with no magnitude
    // (Infinity) sorts after one that has a magnitude -- MEASURED live: "carina" put the Carina
    // Dwarf (no magnitude on its page) above the Carina Nebula (magnitude 1.0) on name length.
    // Two records both without one are equal here and fall through to the next rule.
    if (index.mag[a.i] !== index.mag[b.i]) return index.mag[a.i] - index.mag[b.i];
    // The hand-kept list, before the name length. MEASURED on the live page: "iss" returns
    // ISS (NAUKA) and ISS (ZARYA), same score, same layer, names of the same length -- so
    // without this line the alphabet decides and a module of the station outranks the station.
    if (index.picked[a.i] !== index.picked[b.i]) return index.picked[b.i] - index.picked[a.i];
    if (index.len[a.i] !== index.len[b.i]) return index.len[a.i] - index.len[b.i];
    if (index.name[a.i] !== index.name[b.i]) return index.name[a.i] < index.name[b.i] ? -1 : 1;
    return a.i - b.i; // total order, so the list never reshuffles between identical keystrokes
  });

  // ONE ROW PER OBJECT. The station is in `stations` AND in `visual`; a famous fragment is in
  // `visual` AND in `debris-notable`. Both memberships are correct -- it really is a crewed
  // station and it really is bright enough to see -- but a search result listing "ISS (ZARYA)"
  // twice looks like a bug and makes the user choose between two identical rows. The sort has
  // already put the best-ranked copy first, so keeping the first sighting of each id keeps the
  // station's row and drops the duplicate.
  //
  // The walk does NOT stop at the cap. Stopping there would make `total` the number of rows shown
  // rather than the number of objects found, and the footer's "n more match" -- the one place the
  // list admits it is not showing everything -- would then always read zero.
  const seen = new Set();
  const unique = [];
  let total = 0;
  for (const hit of found) {
    const id = index.record[hit.i] && index.record[hit.i].id;
    if (id != null) {
      if (seen.has(id)) continue;
      seen.add(id);
    }
    total += 1;
    if (unique.length < limit) unique.push(hit);
  }
  out.total = total;

  for (const hit of unique) {
    const i = hit.i;
    const shown = index.record[i].name || COPY.card.unknownName;
    out.hits.push({
      record: index.record[i],
      name: shown,
      where: index.where[i],
      klass: index.record[i].klass || 'unknown',
      score: hit.score,
      // Where the query lands in the displayed name, for the highlight. -1 when the match came
      // from the catalogue number, the designator or the operator instead.
      //
      // Measured against the STRING THAT IS DRAWN, not against the index entry. norm() collapses
      // inner runs of whitespace, so an offset taken from index.name points at the wrong letters
      // of any name that has them: MEASURED, "NOAA  20  (JPSS-1)" searched for "jpss" gave
      // at = 9, and the row highlighted " (JP". The same mismatch hit a record with no `name`
      // but a `meta.objectName`, where the index holds the object name and the row draws
      // "Unnamed object". Not landing at all is -1, and the row then draws without a mark.
      at: shown.toLowerCase().indexOf(q),
      length: q.length,
    });
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// Nothing matched: the nearest names (spec 0061 task 5, docs/ui-guide.md section 3.2)
// ---------------------------------------------------------------------------------------

/** Optimal-string-alignment distance, capped: letters swapped, dropped, added or mistyped. */
export function editDistance(a, b, cap) {
  const n = a.length;
  const m = b.length;
  if (Math.abs(n - m) > cap) return cap + 1;
  let prev2 = null;
  let prev = new Array(m + 1);
  for (let j = 0; j <= m; j += 1) prev[j] = j;
  for (let i = 1; i <= n; i += 1) {
    const cur = new Array(m + 1);
    cur[0] = i;
    let best = cur[0];
    for (let j = 1; j <= m; j += 1) {
      const cost = a.charCodeAt(i - 1) === b.charCodeAt(j - 1) ? 0 : 1;
      let v = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + cost);
      if (prev2 && i > 1 && j > 1 && a.charCodeAt(i - 1) === b.charCodeAt(j - 2) && a.charCodeAt(i - 2) === b.charCodeAt(j - 1)) v = Math.min(v, prev2[j - 2] + 1);
      cur[j] = v;
      if (v < best) best = v;
    }
    if (best > cap) return cap + 1;
    prev2 = prev;
    prev = cur;
  }
  return prev[m];
}

/**
 * The names nearest a query that matched nothing: "jupitr" offers Jupiter, "satrun" Saturn. Pure.
 *
 * A whole name or one whole word of it, within one slip for a short query and two for a longer
 * one; never a number (a wrong catalogue number has no neighbour worth offering) and never a
 * two-letter query, where everything is one slip away. Ordered as the results are: the fewest
 * slips, then the layer ladder, the brighter, the shorter name. Runs only when the list is empty,
 * so its cost (one small table per word of the index) is paid on a miss, not on a keystroke.
 */
export function closest(index, query, limit = 3) {
  const q = norm(query);
  if (!index || !index.n || q.length < 4 || /^[0-9\s]+$/.test(q)) return [];
  const cap = q.length <= 5 ? 1 : 2;
  const found = [];
  for (let i = 0; i < index.n; i += 1) {
    const name = index.name[i];
    if (!name) continue;
    let best = editDistance(q, name, cap);
    if (best > cap && name.indexOf(' ') >= 0) {
      for (const word of name.split(/[^a-z0-9]+/)) {
        if (word.length < 3) continue;
        const d = editDistance(q, word, cap);
        if (d < best) best = d;
      }
    }
    if (best <= cap) found.push({ i, d: best });
  }
  found.sort((a, b) => (a.d - b.d) || (index.pop[b.i] - index.pop[a.i]) || (index.rank[a.i] - index.rank[b.i]) || (index.mag[a.i] - index.mag[b.i])
    || (index.len[a.i] - index.len[b.i]) || (a.i - b.i));
  const seen = new Set();
  const out = [];
  for (const hit of found) {
    const record = index.record[hit.i];
    const id = record && record.id;
    if (id != null) { if (seen.has(id)) continue; seen.add(id); }
    out.push({ record, name: record.name || COPY.card.unknownName, where: index.where[hit.i], klass: record.klass || 'unknown', score: 0, at: -1, length: 0 });
    if (out.length >= limit) break;
  }
  return out;
}

// ---------------------------------------------------------------------------------------
// The component
// ---------------------------------------------------------------------------------------

/**
 * What is NOT being searched, sorted into the three true reasons (spec 0021 / 0026 req 7). Pure.
 *
 * - LOADING: the layer has not answered yet.
 * - UNREAD: it answered with nothing (could not be read, or is empty).
 * - DEFERRED: data saver holds a heavy layer back until it is switched on.
 * A layer the registry switched off (`enabled: false`) is none of these: the app never loads it
 * and no panel offers it. It used to count as LOADING, so every note said "Still loading, so not
 * searched yet: Everything active, The geostationary ring, Famous debris, Things that came down"
 * -- forever, about four layers a visitor cannot see (measured 2026-09-22).
 */
export function coverageOf(layers, counts, reported) {
  const loading = [];
  const unread = [];
  const deferred = [];
  for (const layer of Array.isArray(layers) ? layers : []) {
    if (!layer || !layer.id) continue;
    if (layer.forcedOff || layer.enabled === false) continue;
    if (((counts && counts.get(layer.id)) || 0) > 0) continue;
    const name = layer.display || layer.id;
    if (layer.deferred) deferred.push(name);
    else ((reported && reported.has(layer.id)) ? unread : loading).push(name);
  }
  return { loading, unread, deferred, all: loading.concat(unread, deferred) };
}

export function createSearch(ctx, host) {
  const parent =
    (host && host.appendChild ? host : null) || document.getElementById('sr-controls') || document.body;

  const state = {
    index: buildIndex([], layerList(ctx)),
    dirty: true,
    open: false,
    active: -1, // the highlighted row, and what "Fly to it" acts on
    missed: '', // the query that matched nothing, as typed; the hits are then the nearest names
    hits: [],
    total: 0,
    reported: new Set(), // layer ids that have fired sr:layer, whatever count they carried
    inputTimer: 0,
    rebuildTimer: 0,
    more: null, // ui/searchrows.js, once the field has been focused: what a row says, and the extras
    env: null, // where things are in the visitor's sky, for the rows
    group: null, // {id, q}: a constellation's row the visitor pressed, listed while the query stands
  };

  // WHAT A ROW SAYS, AND TRIPS, MISSIONS AND EVENTS (public #312): fetched on the first focus, never
  // at boot (ui/searchrows.js says why). Until it lands the list is a name and its layer.
  let moreImport = null;
  const refreshEnv = () => {
    if (!state.more) return;
    state.more.whereEnv(ctx).then((env) => { state.env = env; if (state.open && input.value) run(input.value); }).catch(() => { state.env = null; });
  };
  function wantMore() {
    if (moreImport) return moreImport;
    moreImport = import('./searchrows.js').then((m) => {
      state.more = m;
      refreshEnv();
      if (state.open && input.value) run(input.value);
      else if (document.activeElement === input && !input.value) suggest();
      return m;
    }).catch((e) => { moreImport = null; console.warn('the search rows did not load', e); return null; });
    return moreImport;
  }

  // --- structure ------------------------------------------------------------------------

  instances += 1;
  const suffix = instances === 1 ? '' : `-${instances}`;
  const LIST_ID = `sr-search-list${suffix}`;
  const OPTION_ID = `sr-search-option${suffix}-`;

  const wrap = el('section', 'sr-panel sr-search');
  wrap.appendChild(el('h2', 'sr-panel__title', COPY.search.title));

  const row = el('div', 'sr-search__row');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sr-search__input';
  input.placeholder = COPY.search.placeholder;
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.setAttribute('aria-label', COPY.search.inputLabel);
  // WAI-ARIA 1.2 combobox: the input owns the state, the list is a separate listbox.
  input.setAttribute('role', 'combobox');
  input.setAttribute('aria-expanded', 'false');
  input.setAttribute('aria-controls', LIST_ID);
  input.setAttribute('aria-autocomplete', 'list');
  input.setAttribute('aria-haspopup', 'listbox');

  const fly = button('sr-btn sr-btn--primary sr-search__fly', COPY.search.fly, COPY.search.flyTitle);
  fly.disabled = true;

  row.appendChild(input);
  row.appendChild(fly);
  wrap.appendChild(row);

  const pop = el('div', 'sr-search__pop sr-float');
  pop.hidden = true;
  const list = el('ul', 'sr-search__list');
  list.id = LIST_ID;
  list.setAttribute('role', 'listbox');
  list.setAttribute('aria-label', COPY.search.listLabel);
  // The footer is a sibling of the listbox, never a child of it: everything inside a listbox
  // must be an option, and a note that is announced as a choosable object is a lie to a screen
  // reader. aria-live so the honesty about what is NOT searched is actually heard.
  const foot = el('p', 'sr-search__foot');
  foot.setAttribute('role', 'status');
  foot.setAttribute('aria-live', 'polite');
  // The empty state (docs/ui-guide.md section 3.2): what was not found, in one line, and under a
  // microlabel the nearest names as ordinary options. It sits ABOVE the list, where the first
  // result would have been; a status, so the miss is heard as well as seen.
  const empty = el('div', 'sr-search__empty');
  empty.setAttribute('role', 'status');
  empty.setAttribute('aria-live', 'polite');
  empty.hidden = true;
  const emptyLine = el('p', 'sr-search__emptyline');
  const emptyHint = el('p', 'sr-search__emptyhint');
  empty.append(emptyLine, emptyHint);
  pop.appendChild(empty);
  pop.appendChild(list);
  pop.appendChild(foot);
  wrap.appendChild(pop);

  const note = el('p', 'sr-search__note', COPY.search.hint);
  wrap.appendChild(note);

  if (reduceMotion.matches) wrap.classList.add('is-reduced-motion');
  parent.appendChild(wrap);

  // --- the index ------------------------------------------------------------------------

  function rebuild() {
    state.index = buildIndex(recordsOf(ctx), layerList(ctx));
    state.dirty = false;
    paintNote();
    if (state.open) run(input.value); // an open dropdown must not show a stale answer
  }

  function ensureIndex() {
    if (state.dirty) rebuild();
  }

  /**
   * What is NOT being searched, said out loud.
   *
   * A layer that has fired `sr:layer` and holds no records either failed or is genuinely empty;
   * a layer that has never fired has not been read yet. Both mean the same thing to a searcher --
   * nothing in it can be found -- and neither can say HOW MANY objects that is, because the size
   * of a file nobody has read is not a number this app has. Saying "could not look" is the
   * honest third answer; inventing "about 16 500" from a comment in layers.js would not be.
   */
  function missingLayers() {
    const counts = new Map();
    for (const record of recordsOf(ctx)) {
      if (!record || !record.layer) continue;
      counts.set(record.layer, (counts.get(record.layer) || 0) + 1);
    }
    return coverageOf(layerList(ctx), counts, state.reported);
  }

  function paintNote() {
    const split = missingLayers();
    const missing = split.all;
    // ONE LINE in the chrome (spec 0061 req 11): how much is searched and how many layers are not.
    // Which layers, and which of the three reasons each has, is the same honesty as before, in the
    // line's tooltip and in What to show, where every one of them has its own row and state.
    const S = COPY.search;
    const n = fmt.int(state.index.n);
    const line = state.skyNote ? state.skyNote
      : state.switchedOn ? t(S.switchedOn, { layer: state.switchedOn })
      : state.index.n === 0 ? S.empty
        : !missing.length ? t(state.index.n === 1 ? S.searchingOne : S.searching, { n })
          : missing.length === 1 ? t(S.searchingButOne, { n })
            : t(S.searchingBut, { n, m: fmt.int(missing.length) });
    const why = [];
    if (split.loading.length) why.push(t(S.stillLoading, { layers: split.loading.join(COPY.punctuation.listJoin) }));
    if (split.deferred.length) why.push(t(S.loadsWhenOn, { layers: split.deferred.join(COPY.punctuation.listJoin) }));
    if (split.unread.length) why.push(t(S.couldNotRead, { layers: split.unread.join(COPY.punctuation.listJoin) }));
    if (missing.length) why.push(S.notLoadedCount);
    note.textContent = line;
    note.title = why.join(' ');
    note.classList.toggle('is-warning', missing.length > 0);
  }

  // --- painting the dropdown ------------------------------------------------------------

  function nameNode(hit) {
    const node = el('span', 'sr-search__name');
    const raw = String(hit.name);
    // hit.at is an offset into the lower-cased name, which norm() only lower-cases and trims;
    // an inner run of collapsed whitespace could shift it, so a mismatched length is dropped
    // rather than drawn in the wrong place.
    if (hit.at >= 0 && hit.at + hit.length <= raw.length) {
      node.appendChild(document.createTextNode(raw.slice(0, hit.at)));
      const mark = document.createElement('mark');
      mark.className = 'sr-search__hit';
      mark.textContent = raw.slice(hit.at, hit.at + hit.length);
      node.appendChild(mark);
      node.appendChild(document.createTextNode(raw.slice(hit.at + hit.length)));
    } else {
      node.textContent = raw;
    }
    return node;
  }

  function paintList() {
    list.textContent = '';
    for (let i = 0; i < state.hits.length; i += 1) {
      const hit = state.hits[i];
      const item = el('li', 'sr-search__option');
      item.id = OPTION_ID + i;
      item.setAttribute('role', 'option');
      item.setAttribute('aria-selected', 'false');
      // The class dot. The swatch tokens in ui.css are scene/glyphatlas.js's CLASS_COLOURS
      // verbatim, so the dot is the colour the object is drawn in without this panel importing
      // the atlas -- and with it, three.js.
      const klass = hit.extra && hit.extra !== 'group' ? 'oddity' : hit.klass;
      // An icon in the class colour where the family has an honest one (searchrows.js rowIcon),
      // else the dot as before; and the dot until that module has landed.
      const glyph = state.more && typeof state.more.rowIcon === 'function' ? state.more.rowIcon(hit) : null;
      if (glyph) {
        const mark = el('span', `sr-search__icon sr-ink--${klass}`);
        mark.setAttribute('aria-hidden', 'true');
        mark.appendChild(glyph);
        item.appendChild(mark);
      } else {
        const dot = el('span', `sr-swatch sr-swatch--${klass}`);
        dot.setAttribute('aria-hidden', 'true');
        item.appendChild(dot);
      }
      if (hit.row || hit.extra) {
        // Two lines: the name people use, and under it what it is, the catalogue's own string
        // when that differs, and where it is in the visitor's sky now.
        item.classList.add('sr-search__option--rich');
        if (hit.extra) item.dataset.extra = hit.extra;
        const text = el('span', 'sr-search__text');
        text.appendChild(nameNode(hit));
        const sub = hit.extra ? [hit.sub] : [hit.row.kind, hit.row.also, hit.row.where];
        const line = sub.filter(Boolean).join(COPY.punctuation.separator);
        if (line) text.appendChild(el('span', 'sr-search__what', line));
        item.appendChild(text);
      } else {
        item.appendChild(nameNode(hit));
        if (hit.where) item.appendChild(el('span', 'sr-search__where', hit.where));
      }
      // pointerdown would blur the input before the click lands, closing the list under the
      // finger. Suppressing the default keeps focus where the ARIA state says it is.
      item.addEventListener('pointerdown', (event) => event.preventDefault());
      // MEASURED 2026-09-08 on the mobile layout: a touch on an option BLURS the input (an <li> is not
      // focusable), focusout closed the list, and the tap's click then landed on nothing -- "I cannot
      // select the Milky Way from the dropdown on my phone" (Ivan). So the pick happens on pointerup,
      // before any blur can close the list; the click below stays for keyboards and old browsers and
      // is a no-op when pointerup already picked.
      item.addEventListener('pointerup', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        state.pickedAt = performance.now();
        pickHit(hit);
      });
      item.addEventListener('click', () => {
        if (state.pickedAt && performance.now() - state.pickedAt < 700) return; // pointerup did it
        setActive(i);
        pickHit(hit);
      });
      list.appendChild(item);
    }

    const hidden = state.total - state.hits.length;
    const lines = [];
    if (!state.missed) {
      if (state.fallback) lines.push(COPY.search.fallback);
      if (hidden > 0) lines.push(t(COPY.search.more, { n: fmt.int(hidden) }));
    }
    foot.textContent = lines.join(' ');
    foot.hidden = foot.textContent === '';
    // The miss: the query quoted back (cut, so a pasted paragraph stays one line), and whether
    // anything is near it. With an empty index the line says that instead: nothing was searched.
    empty.hidden = !state.missed;
    if (state.missed) {
      const shown = state.missed.length > MISS_QUOTE ? `${state.missed.slice(0, MISS_QUOTE)}${COPY.punctuation.ellipsis}` : state.missed;
      emptyLine.textContent = state.index.n === 0 ? COPY.search.empty : t(COPY.search.noMatch, { q: shown });
      emptyHint.textContent = state.hits.length ? COPY.search.closest : '';
      emptyHint.hidden = !state.hits.length;
    }
  }

  function paintActive() {
    for (let i = 0; i < list.children.length; i += 1) {
      const item = list.children[i];
      const on = i === state.active;
      item.classList.toggle('is-active', on);
      item.setAttribute('aria-selected', on ? 'true' : 'false');
    }
    if (state.active >= 0 && list.children[state.active]) {
      input.setAttribute('aria-activedescendant', OPTION_ID + state.active);
      const item = list.children[state.active];
      if (item.scrollIntoView) item.scrollIntoView({ block: 'nearest' });
    } else {
      input.removeAttribute('aria-activedescendant');
    }
    fly.disabled = state.active < 0 || !state.hits[state.active];
  }

  function setActive(i) {
    state.active = i >= 0 && i < state.hits.length ? i : -1;
    paintActive();
  }

  function setOpen(open) {
    state.open = open && (state.hits.length > 0 || !!state.missed);
    pop.hidden = !state.open;
    input.setAttribute('aria-expanded', state.open ? 'true' : 'false');
    if (!state.open) {
      state.active = -1;
      input.removeAttribute('aria-activedescendant');
      fly.disabled = true;
    }
  }

  function close(clear) {
    setOpen(false);
    if (clear) {
      input.value = '';
      state.hits = [];
      state.total = 0;
      state.missed = '';
    }
  }

  // --- searching ------------------------------------------------------------------------

  function run(text) {
    const q = norm(text);
    if (q.length < MIN_QUERY) {
      state.hits = [];
      state.total = 0;
      state.missed = '';
      close(false);
      paintList();
      if (!q && document.activeElement === input) suggest();
      return;
    }
    ensureIndex();
    const result = findMatches(state.index, q, MAX_RESULTS);
    state.hits = result.hits;
    state.total = result.total;
    state.fallback = result.fallback === true;
    state.switchedOn = null;
    state.skyNote = '';
    // Nothing matched: say so, and offer the nearest names as the options (closest() above).
    state.missed = result.hits.length ? '' : String(text).trim();
    if (state.missed) { state.hits = closest(state.index, q); state.total = state.hits.length; }
    if (state.more) {
      // The rows' words, one row per drawn name, and under the objects the trips, missions and
      // events the query names. A query that names only those is not a miss.
      const m = state.more;
      const rows = m.mergeSame(state.hits.map((h) => ({ ...h, name: undefined, row: m.describe(h.record, state.env) })).map((h) => {
        const at = h.row.title.toLowerCase().indexOf(q);
        return { ...h, name: h.row.title, at, length: q.length };
      }));
      // A constellation is one row until it is pressed (searchrows.js groupRows).
      if (state.group && state.group.q !== q) state.group = null;
      const before = rows.length;
      const grouped = m.groupRows(rows, (g) => recordsOf(ctx).filter((r) => r && g.test.test(String(r.name || ''))).length, state.group && state.group.id);
      // groupRows hands back a new list; emptying `rows` first would empty an alias of it
      // (seen 2026-10-07: "mars" found three trips and no planet).
      rows.splice(0, rows.length, ...grouped);
      state.total = Math.max(0, state.total - (before - rows.length));
      const merged = state.hits.length - before;
      const extras = m.findExtras(q).filter((x) => !(x.extra === 'mission' && rows.some((h) => h.record && h.record.id === x.record)));
      if (extras.length && state.missed && !rows.length) state.missed = '';
      state.total = Math.max(0, state.total - merged);
      state.hits = rows.slice(0, MAX_RESULTS - Math.min(extras.length, rows.length ? extras.length : 0)).concat(state.missed ? [] : extras);
      state.total += state.missed ? 0 : extras.length;
    }
    paintList();
    // Always open on a real query, even with nothing to show: the footer's "nothing matches" is
    // an answer, and a dropdown that simply does not appear is indistinguishable from a bug.
    state.open = true;
    pop.hidden = false;
    input.setAttribute('aria-expanded', 'true');
    // The top row is highlighted for you, so Enter and "Fly to it" both work without an arrow key.
    // Not a guess, though: a nearest name is offered, and flying to it on Enter would be answering
    // a question that was not asked. An arrow key reaches it.
    setActive(state.hits.length && !state.missed ? 0 : -1);
  }

  /**
   * THE ONE THING THAT WILL BITE. A record whose layer is switched off has no glyph in the sky
   * and no hero model, so flying to it arrives at an empty patch of sky and the feature looks
   * broken. Switch the layer on first, then select.
   *
   * ctx.setLayerOn() updates main.js and the glyph layer, but ui/controls.js paints its
   * checkboxes from its own `state.enabled` map, so the row for that layer will still read as
   * off until controls.js listens for this event. That is the integrator's one line, not a
   * reason to reach into another module's DOM from here.
   */
  /** A row is an object, or one of ui/searchrows.js's extras: a trip, a mission, an event, a suggestion. */
  function pickHit(hit) {
    if (!hit) return;
    if (!hit.extra) { pick(hit.record); return; }
    // A constellation's row: list its satellites in place, and stay open.
    if (hit.extra === 'group') { state.group = { id: hit.id, q: norm(input.value) }; run(input.value); return; }
    if (state.more && state.more.runExtra(ctx, hit)) { close(true); paintList(); input.blur(); }
  }

  /** Before anything is typed: what the field can do that a name cannot ask for ("Near me tonight"). */
  function suggest() {
    if (!state.more || input.value) return;
    state.hits = state.more.suggestions();
    state.total = state.hits.length;
    state.missed = '';
    state.fallback = false;
    paintList();
    setOpen(true);
    setActive(-1);
  }

  function pick(record) {
    if (!record) return;
    try {
      if (typeof ctx.isLayerOn === 'function' && typeof ctx.setLayerOn === 'function') {
        if (!ctx.isLayerOn(record.layer)) {
          ctx.setLayerOn(record.layer, true);
          const row = layerList(ctx).find((l) => l.id === record.layer);
          state.switchedOn = row ? row.display || row.id : record.layer;
          paintNote();
          document.dispatchEvent(
            new CustomEvent('sr:layer-toggle', {
              detail: { id: record.layer, on: true, handled: true, from: 'search' },
            }),
          );
        }
      }
    } catch {
      /* a layer that refuses to switch on still gets the camera and the card below */
    }
    // From the ground the search box turns the sky to what it found (internal #393 finding 7), or
    // says that it is under the horizon; main.js's select() opens the card and flies nowhere.
    try {
      const sky = ctx.skyView;
      const shown = sky && sky.active && typeof sky.pointAtRecord === 'function' ? sky.pointAtRecord(record) : null;
      state.skyNote = shown === 'below' ? t(COPY.search.belowHorizon, { name: record.name || '' }) : '';
      if (state.skyNote) paintNote();
    } catch {
      /* the card still opens */
    }
    try {
      if (typeof ctx.select === 'function') ctx.select(record);
    } catch {
      /* select() owns the flight and the card; a failure there is not this panel's to report */
    }
    close(false);
    input.blur();
  }

  // --- events ---------------------------------------------------------------------------

  const onInput = () => {
    window.clearTimeout(state.inputTimer);
    state.inputTimer = window.setTimeout(() => run(input.value), INPUT_DEBOUNCE_MS);
  };

  const onKeyDown = (event) => {
    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!state.hits.length) return;
        event.preventDefault();
        if (!state.open) {
          setOpen(true);
          setActive(0);
          return;
        }
        const step = event.key === 'ArrowDown' ? 1 : -1;
        const n = state.hits.length;
        setActive((state.active + step + n) % n);
        return;
      }
      case 'Enter': {
        if (state.open && state.active >= 0 && state.hits[state.active]) {
          event.preventDefault();
          pickHit(state.hits[state.active]);
        }
        return;
      }
      case 'Escape': {
        if (state.open || input.value) {
          event.preventDefault();
          close(true);
          paintList();
        }
        return;
      }
      case 'Tab': {
        setOpen(false);
        return;
      }
      default:
    }
  };

  const onFocusOut = (event) => {
    const next = event.relatedTarget;
    if (next && wrap.contains(next)) return;
    // Not at once: on a touch screen the blur arrives BEFORE the tap that caused it has finished,
    // and closing here removed the option from under the finger. A beat later, unless a pick
    // happened in between, the list closes exactly as before.
    window.clearTimeout(state.closeTimer);
    state.closeTimer = window.setTimeout(() => {
      if (state.pickedAt && performance.now() - state.pickedAt < 700) return;
      if (document.activeElement && wrap.contains(document.activeElement)) return;
      setOpen(false);
    }, 150);
  };

  const onFocusIn = () => {
    wantMore();
    refreshEnv();
    if (!state.open && state.hits.length && input.value) setOpen(true);
    else if (!input.value) suggest();
  };

  const onFly = () => {
    if (state.active < 0 || !state.hits[state.active]) return;
    pickHit(state.hits[state.active]);
  };

  const onLayer = (event) => {
    const id = event && event.detail && event.detail.id;
    if (id) state.reported.add(id);
    state.dirty = true;
    window.clearTimeout(state.rebuildTimer);
    state.rebuildTimer = window.setTimeout(rebuild, REBUILD_DEBOUNCE_MS);
  };

  const onMotion = () => wrap.classList.toggle('is-reduced-motion', reduceMotion.matches);

  input.addEventListener('input', onInput);
  input.addEventListener('keydown', onKeyDown);
  input.addEventListener('focus', onFocusIn);
  wrap.addEventListener('focusout', onFocusOut);
  fly.addEventListener('click', onFly);
  window.addEventListener('sr:layer', onLayer);
  window.addEventListener('sr:layers-ready', onLayer);
  window.addEventListener('sr:observer', refreshEnv);
  if (reduceMotion.addEventListener) reduceMotion.addEventListener('change', onMotion);

  rebuild();

  // --- contract -------------------------------------------------------------------------

  return {
    /** Rebuild the index now. Called after layers load; safe to call at any time. */
    refresh() {
      rebuild();
    },
    focus() {
      input.focus();
      input.select();
    },
    destroy() {
      window.clearTimeout(state.inputTimer);
      window.clearTimeout(state.rebuildTimer);
      input.removeEventListener('input', onInput);
      input.removeEventListener('keydown', onKeyDown);
      input.removeEventListener('focus', onFocusIn);
      wrap.removeEventListener('focusout', onFocusOut);
      fly.removeEventListener('click', onFly);
      window.removeEventListener('sr:layer', onLayer);
      window.removeEventListener('sr:layers-ready', onLayer);
      window.removeEventListener('sr:observer', refreshEnv);
      if (reduceMotion.removeEventListener) reduceMotion.removeEventListener('change', onMotion);
      if (wrap.parentNode) wrap.parentNode.removeChild(wrap);
    },
  };
}
