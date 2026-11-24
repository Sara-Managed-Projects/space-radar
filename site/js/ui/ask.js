// ui/ask.js -- a question typed in plain words, read here, in the page, with no service (forge internal #555).
//
// Contract, pure (tests/test_ask.mjs holds it):
//   parseAsk(text, words, cities) -> { group, place, launched, owner, parts } | null
//   askAction(ask) -> { find?, constellation?, owner?, clouds?, stations?, place? }   what the map does with it
//   GROUPS                          the networks and groups a question can name, with the words for each
// And askRun(ctx, ask): does it (the search row's press, ui/searchrows.js runExtra).
//
// THE GRAMMAR IS SMALL ON PURPOSE (the issue: "keep the grammar small and say what was understood"). A question is
// any order of up to four pieces, each found by its own words; everything else in it is ignored, and the search row
// says, piece by piece, what was taken: "Starlink · over Spain", "Satellites · launched in the last 7 days".
//   a group     a constellation of CONSTELLATIONS (data/clouds.js: Starlink, OneWeb, GPS, GLONASS, Galileo, BeiDou...),
//               the crewed stations, debris, the geostationary ring, or satellites in general
//   a place     "over" / "above" / "in" and a town or a country of the bundled list (copy/en.js CITIES)
//   when        "launched" with today, this week, this month, this year, or a year ("in 2020")
//   an owner    "from" and a country, or the country's own word ("Indian", "Chinese"), as data/owners.js names them
// The words are the page language's (COPY.ask.words, eleven languages) and always English as well, so "starlink sobre
// España" and "starlink over Spain" are the same question. No text leaves the page: it is matched against lists in it.

import { CONSTELLATIONS } from '../data/clouds.js';
import { OWNERS } from '../data/owners.js';
import { lightStations } from './networks.js';

/** The groups a question can name, beyond the constellations: each with the English words that name it. */
export const GROUPS = [
  ...CONSTELLATIONS.map((c) => ({ kind: 'constellation', id: c.id, words: [c.id, ...(c.id === 'gps' ? ['navstar'] : []), ...(c.id === 'beidou' ? ['compass'] : []), ...(c.id === 'kuiper' ? ['project kuiper'] : [])] })),
  { kind: 'stations', id: 'stations', words: ['stations', 'space stations', 'station', 'iss', 'tiangong'] },
  { kind: 'debris', id: 'debris', words: ['debris', 'space junk', 'junk'] },
  { kind: 'geo', id: 'geo', words: ['geostationary', 'geo', 'geosynchronous'] },
  { kind: 'sats', id: 'sats', words: ['satellites', 'satellite', 'sats'] },
];

const fold = (s) => String(s == null ? '' : s).toLowerCase().normalize('NFKD').replace(/[̀-ͯ]/g, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const list = (v) => (Array.isArray(v) ? v : String(v || '').split('|')).map(fold).filter(Boolean);
/** Whole words of `hay` that `needle` (one or more words) is: "space stations" in "space stations over x". */
const hasWords = (hay, needle) => needle && ` ${hay} `.includes(` ${needle} `);
const find = (hay, words) => words.filter((w) => hasWords(hay, w)).sort((a, b) => b.length - a.length)[0] || null;

/** The English words, then the page language's on top (COPY.ask.words). */
function wordsOf(w = {}) {
  const en = { over: 'over|above|in', from: 'from|of', launched: 'launched|launch|new', today: 'today', week: 'this week|week', month: 'this month|month', year: 'this year', in: 'in', satellites: 'satellites|satellite' };
  const out = {};
  for (const k of Object.keys(en)) out[k] = [...new Set([...list(en[k]), ...list(w[k])])];
  return out;
}

/** A town or a country of the bundled list named in `text` after one of `lead` words; the longest name wins. */
function placeIn(text, lead, cities) {
  let best = null;
  for (const c of cities || []) {
    for (const [name, kind] of [[fold(c.name), 'city'], [fold(c.country), 'country']]) {
      if (!name || (best && name.length <= best.key.length)) continue;
      if (lead.some((l) => hasWords(text, `${l} ${name}`))) best = { key: name, kind, name: kind === 'city' ? c.name : c.country, latDeg: c.latDeg, lonDeg: c.lonDeg };
    }
  }
  return best ? { name: best.name, kind: best.kind, latDeg: best.latDeg, lonDeg: best.lonDeg } : null;
}

// The catalogue's owners by country name and by the adjective people say ("Indian satellites").
const ADJECTIVES = { IND: 'indian', PRC: 'chinese', CIS: 'russian soviet', US: 'american us usa', JPN: 'japanese', FR: 'french', UK: 'british uk', GER: 'german', IT: 'italian', ESA: 'esa european', ISRA: 'israeli', IRAN: 'iranian', SKOR: 'korean south korean', CA: 'canadian', BRAZ: 'brazilian', SPN: 'spanish', AUS: 'australian' };
function ownerIn(text, fromWords, extra = {}) {
  let best = null;
  for (const [code, kind, , name] of OWNERS) {
    if (kind !== 'country' && code !== 'ESA') continue;
    const names = [fold(name.replace(/\s*\(.*\)/, '')), ...list(String(ADJECTIVES[code] || '').split(' ')), ...list(extra[code])].filter((n) => n.length >= 2);
    for (const n of names) {
      const adjective = list(String(ADJECTIVES[code] || '').split(' ')).includes(n) || list(extra[code]).includes(n);
      const hit = fromWords.some((f) => hasWords(text, `${f} ${n}`)) || (adjective && hasWords(text, n));
      if (hit && (!best || n.length > best.n.length)) best = { code, name, n, iso: OWNERS.find((o) => o[0] === code)[2] || null };
    }
  }
  return best ? { code: best.code, name: best.name, iso: best.iso } : null;
}

/**
 * The question as its pieces, or null when fewer than two were understood (one word alone is the ordinary search's:
 * "starlink" already finds the fleet's row). `nowMs` dates "this year". Pure.
 */
export function parseAsk(text, words = {}, cities = [], nowMs = Date.now(), owners = {}) {
  const q = fold(text);
  if (q.length < 5 || !q.includes(' ')) return null;
  const W = wordsOf(words);
  const parts = [];
  let group = null;
  let gWord = '';
  for (const g of GROUPS) {
    const hit = find(q, [...g.words.map(fold), ...list(words.groups && words.groups[g.id])]);
    if (hit && (!group || hit.length > gWord.length) && !(g.kind === 'sats' && group)) { group = g; gWord = hit; }
  }
  if (group && group.kind === 'sats') {
    // "satellites" with a constellation named too ("starlink satellites") is the constellation.
    const named = GROUPS.find((g) => g.kind !== 'sats' && find(q, [...g.words.map(fold), ...list(words.groups && words.groups[g.id])]));
    if (named) group = named;
  }
  if (group) parts.push({ kind: 'group', id: group.id });
  const place = placeIn(q, W.over, cities);
  if (place) parts.push({ kind: 'place', name: place.name });
  let launched = null;
  if (find(q, W.launched)) {
    const year = /\b(19[5-9]\d|20\d\d)\b/.exec(q);
    if (find(q, W.today)) launched = { days: 1 };
    else if (find(q, W.week)) launched = { days: 7 };
    else if (find(q, W.month)) launched = { days: 31 };
    else if (find(q, W.year)) launched = { year: new Date(nowMs).getUTCFullYear() };
    else if (year) launched = { year: Number(year[1]) };
    else launched = { days: 31 };
    parts.push({ kind: 'launched', ...launched });
  }
  const owner = ownerIn(q, W.from, owners);
  if (owner) parts.push({ kind: 'owner', code: owner.code, name: owner.name, iso: owner.iso });
  if (parts.length < 2 && !(launched && parts.length === 1)) return null;
  return { group: group ? { kind: group.kind, id: group.id } : null, place, launched, owner, parts };
}

/**
 * What the map does with a question: a Find link (`find`, `constellation`, `owner`, `clouds`), the stations lit, and a
 * place to turn the globe to. A constellation launched recently is asked as its operator's (`op`) when it has one:
 * the catalogue names a launch, not a fleet. Pure.
 */
export function askAction(ask) {
  if (!ask) return null;
  const out = {};
  const g = ask.group;
  const c = g && g.kind === 'constellation' ? CONSTELLATIONS.find((x) => x.id === g.id) : null;
  if (ask.launched || (ask.owner && (!g || g.kind === 'sats' || g.kind === 'geo'))) {
    const tok = ['sats'];
    if (g && g.kind === 'geo') tok.push('h35000-36500');
    if (ask.launched && ask.launched.days) tok.push(`d-${ask.launched.days}`);
    if (ask.launched && ask.launched.year) tok.push(`y${ask.launched.year}-${ask.launched.year}`);
    if (ask.owner) tok.push(`own${ask.owner.code}`);
    if (c && c.operator) tok.push(`op${c.operator}`);
    out.find = tok.join('_');
  } else if (c) out.constellation = c.id;
  else if (g && g.kind === 'debris') out.clouds = true;
  else if (g && g.kind === 'stations') out.stations = true;
  else if (g && g.kind === 'geo') out.find = 'sats_h35000-36500_working';
  else if (ask.owner) out.owner = ask.owner.code;
  if (ask.place) out.place = { name: ask.place.name, latDeg: ask.place.latDeg, lonDeg: ask.place.lonDeg };
  return out;
}

/** Turn the globe to a place: a mark-less fixed point the camera flies to, as it flies to a launch pad. */
export function flyOver(ctx, place) {
  if (!place || typeof ctx.flyToRecord !== 'function') return false;
  const record = { id: 'ask-place', name: place.name, klass: 'site', layer: null, propagator: 'fixed', frame: 'earth-fixed', fixed: { latDeg: place.latDeg, lonDeg: place.lonDeg, altKm: 0 }, meta: {} };
  try { return ctx.flyToRecord(record, 1600) !== false; } catch { return false; }
}

/** Do it: the search row's press. Resolves true when the map was asked to do something. */
export async function askRun(ctx, ask, words = {}) {
  const a = askAction(ask);
  if (!a || typeof ctx.wantFind !== 'function') return false;
  const f = await ctx.wantFind();
  if (!f) return false;
  if (a.find) f.openLink({ find: a.find });
  else if (a.constellation) f.openLink({ constellation: a.constellation });
  else if (a.owner) f.openLink({ owner: a.owner });
  else if (a.clouds) f.open('clouds', { focus: false });
  else if (a.stations) lightStations(ctx, f, words.stations || 'Crewed stations');
  if (a.place) setTimeout(() => flyOver(ctx, a.place), 300);
  return true;
}
