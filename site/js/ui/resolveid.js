// ui/resolveid.js -- what a link's id names: `#at=`, `#go=` and an embed's `at=` all ask here.
//
// Contract, pure (tests/test_resolveid.mjs holds a table of ids):
//   idKey(text)                      the text as a key: lower case, accents folded, only letters and digits
//   keysOf(record)                   every key a record answers to, strongest first: [{key, tier}]
//   resolveId(text, { records, layers, recordById }) -> record | null
//
// WHY ONE RESOLVER (review of 16 Nov 2026). main.js looked a link's id up as a record id, then handed it to
// the search box's ranking and took the first row above a score. Two faults came of that: a catalogue
// designation is an ALIAS in the index, and an alias scores under the line a link needs, so `#at=m31`,
// `#at=ngc224` and `#at=m45` said "not on this map" while the search box found them; and the ranking's
// name-prefix tier turned `#at=m1` into M10, the first name that starts with those letters.
//
// THE ORDER. An exact answer always wins over a near one:
//   1. the record id as written, or with the prefix its kind carries (`m31` is `dso-m31`, `kepler-186-f` is
//      `exo-kepler-186-f`), a catalogue number (`25544`, `A0690`, `norad-25544`), an old `int-<designator>` id;
//   2. an exact KEY: the id, the whole name, a catalogue designation or an alias, the international
//      designator, the slug a search page uses (scripts/seo_common.py slug_of). Keys ignore case, accents,
//      spaces and punctuation, so `NGC 224`, `ngc-224` and `ngc224` are one key and `m1` is never `m10`;
//   3. what a person would type, through the search box's own index and aliases (`iss`, `hubble`,
//      `andromeda`): the start of a word or better, as before, and never a number run on into a longer
//      one (`m1` does not become `M10`, `ngc 22` does not become NGC 224).
// Nothing found is null: the caller says so in one line (main.js openAt), an embed too.
import { buildIndex, findMatches, LINK_MIN_SCORE } from './search.js';
import { satIdOf } from '../data/catnum.js';

/** The id prefixes a kind of record carries: `#at=` may leave them out. */
export const ID_PREFIXES = ['dso', 'exo', 'star', 'exotic', 'deep', 'hip', 'comet', 'asteroid', 'dwarf', 'shower', 'sat'];

/** A text as a key: accents folded, lower case, `*` read as "star" and `+` as "plus" (as a page's slug does), a leading "the" dropped, letters and digits only. */
export function idKey(text) {
  let s = String(text == null ? '' : text);
  // eslint-disable-next-line no-control-regex
  if (/[^\x00-\x7f]/.test(s)) { try { s = s.normalize('NFKD').replace(/[\u0300-\u036f]/g, ''); } catch { /* an engine without normalize: as written */ } }
  s = s.toLowerCase().replace(/\*/g, ' star ').replace(/\+/g, ' plus ').replace(/[ʻ'’]/g, '');
  s = s.replace(/[^a-z0-9]+/g, ' ').trim().replace(/^the /, '');
  return s.replace(/ /g, '');
}

const TIER_ID = 4;
const TIER_NAME = 3;
const TIER_ALIAS = 2;

/** Every key a record answers to. A key is listed once, at its strongest tier. */
export function keysOf(record) {
  const out = new Map();
  const put = (k, tier) => { if (k.length >= 2 && (out.get(k) || 0) < tier) out.set(k, tier); };
  const add = (text, tier) => {
    if (text == null || text === '') return;
    put(idKey(text), tier);
    // "Sgr A*" is `sgr-a-star` on its page and `sgr-a` in a link typed by hand: both.
    if (String(text).indexOf('*') >= 0) put(idKey(String(text).replace(/\*/g, '')), tier);
  };
  if (!record) return [];
  const id = String(record.id || '');
  add(id, TIER_ID);
  const pre = /^([a-z0-9]+)-(.+)$/.exec(id);
  if (pre && ID_PREFIXES.includes(pre[1])) add(pre[2], TIER_ID);
  const meta = record.meta || {};
  const name = record.name || meta.objectName || '';
  add(name, TIER_NAME);
  // "M45 · Pleiades": each half is a name of its own.
  if (name.indexOf('·') >= 0) for (const part of name.split('·')) add(part, TIER_NAME);
  if (Array.isArray(meta.aliases)) for (const a of meta.aliases) add(a, TIER_ALIAS);
  add(meta.designation, TIER_ALIAS);
  add(meta.intlDesignator, TIER_ALIAS);
  if (meta.messier != null) { add(`m${meta.messier}`, TIER_ALIAS); add(`messier${meta.messier}`, TIER_ALIAS); }
  if (meta.hip != null) add(`hip${meta.hip}`, TIER_ALIAS);
  if (meta.hd != null) add(`hd${meta.hd}`, TIER_ALIAS);
  return [...out].map(([key, tier]) => ({ key, tier }));
}

/** Among records that answer to the same key: the search box's own ladder (ui/search.js findMatches' sort). */
function better(a, b, rankOf) {
  if (a.tier !== b.tier) return a.tier > b.tier;
  const ra = a.record, rb = b.record;
  const pop = (r) => (r.klass === 'world' || r.klass === 'station' ? 1 : 0);
  if (pop(ra) !== pop(rb)) return pop(ra) > pop(rb);
  const kind = (r) => (r.klass === 'debris' ? 2 : r.klass === 'rocket' ? 1 : 0);
  if (kind(ra) !== kind(rb)) return kind(ra) < kind(rb);
  const rank = (r) => (rankOf.has(r.layer) ? rankOf.get(r.layer) : rankOf.size);
  if (rank(ra) !== rank(rb)) return rank(ra) < rank(rb);
  const mag = (r) => { const m = r.meta || {}; return Number.isFinite(m.vmag) ? m.vmag : Number.isFinite(m.mag) ? m.mag : Infinity; };
  if (mag(ra) !== mag(rb)) return mag(ra) < mag(rb);
  const why = (r) => (r.meta && r.meta.why ? 1 : 0);
  if (why(ra) !== why(rb)) return why(ra) > why(rb);
  return String(ra.name || '').length < String(rb.name || '').length;
}

/** Does `q` sit in `text` only where a digit runs on after it? ("m1" in "m10", "ngc 22" in "ngc 224".) */
function runsOn(text, q) {
  if (!/[0-9]$/.test(q)) return false;
  const s = String(text || '').toLowerCase();
  let at = s.indexOf(q);
  if (at < 0) return false;
  while (at >= 0) {
    const next = s.charCodeAt(at + q.length);
    if (!(next >= 48 && next <= 57)) return false;
    at = s.indexOf(q, at + 1);
  }
  return true;
}

/**
 * The record a link's id names, or null.
 *
 * @param {string} text  the value of `at`, `go` or an embed's `at`
 * @param {{records: Array<Object>, layers?: Array<Object>, recordById?: function(string): (Object|null)}} have
 */
export function resolveId(text, have = {}) {
  const raw = String(text == null ? '' : text).trim();
  if (!raw) return null;
  const records = Array.isArray(have.records) ? have.records : [];
  const byId = typeof have.recordById === 'function'
    ? have.recordById
    : (id) => records.find((r) => r && r.id === id) || null;

  // 1. The id as written; then with the prefix of its kind (`#go=kepler-186-f`, `#at=m31`).
  const low = raw.toLowerCase();
  for (const id of [raw, low, ...ID_PREFIXES.filter((p) => p !== 'sat').map((p) => `${p}-${low}`)]) {
    const hit = byId(id);
    if (hit) return hit;
  }
  // A catalogue number, Alpha-5 too (`100690`, `A0690`, `sat-25544`, `norad-25544`, `NORAD 25544`).
  const number = raw.replace(/^norad[\s_-]*/i, '');
  const satId = satIdOf(number);
  const sat = satId && byId(satId);
  if (sat) return sat;
  // `int-<designator>`: the id a number of 90 000 and up had before 2026-10-14.
  const intl = /^int-(.+)$/i.exec(raw);
  if (intl) {
    const byIntl = records.find((r) => r && r.meta && r.meta.intlDesignator === intl[1]);
    if (byIntl) return byIntl;
  }

  // 2. An exact key.
  const key = idKey(raw);
  if (key.length >= 2) {
    const rankOf = new Map();
    const layers = Array.isArray(have.layers) ? have.layers : [];
    for (let i = 0; i < layers.length; i += 1) if (layers[i] && layers[i].id) rankOf.set(layers[i].id, i);
    let best = null;
    for (const record of records) {
      if (!record) continue;
      for (const k of keysOf(record)) {
        if (k.key !== key) continue;
        const cand = { record, tier: k.tier };
        if (!best || better(cand, best, rankOf)) best = cand;
        break;
      }
    }
    if (best) return best.record;
  }

  // 3. As a person would type it. A bare number that named no catalogue entry is not a name.
  if (/^[0-9]+$/.test(key)) return null;
  const typed = raw.replace(/[-_+]+/g, ' ');
  const found = findMatches(buildIndex(records, have.layers || []), typed, 8);
  if (found.fallback) return null;
  const q = found.query;
  for (const hit of found.hits) {
    if (hit.score < LINK_MIN_SCORE) break;
    const meta = hit.record.meta || {};
    const texts = [hit.record.name, ...(Array.isArray(meta.aliases) ? meta.aliases : [])];
    // The number ran on into a longer one in every name it matched: `m1` is not M10.
    if (texts.some((s) => runsOn(s, q)) && !texts.some((s) => String(s || '').toLowerCase().indexOf(q) >= 0 && !runsOn(s, q))) continue;
    return hit.record;
  }
  return null;
}
