// ui/sentence.js -- one true sentence, the home's first line (public #395, #450).
//
// Contract: createSentence(ctx, { go, launched }) -> { root, refresh(), destroy() }
// Also exported, pure, for tests/test_sentence.mjs:
//   MAX_CHARS
//   moonClause(nowMs) -> candidate | null
//   sentenceCandidates({nowMs, items, crew, station, storms, launched}) -> [candidate], best first
//     candidate = {id, score, clause, source, act, record?, tMs?, title}
//   compose(candidates, maxChars) -> {text, parts: [candidate], sources: [string]} | null
//
// WHY. The home opened on a search box and four tabs. The one thing a person would say aloud on
// opening it -- "ten people are up there, and the station comes over at nine" -- was spread over
// three sections further down. This says it first, in one line.
//
// IT NEVER INVENTS. Every clause is filled from data the map has already loaded, and each names
// where it came from (`source`, shown as the line's tooltip). A clause whose data is missing is
// not a candidate: no headcount is no crew clause, not "nobody is in orbit"; no place set is no
// pass. With no candidate the line is absent. Nothing is typed here, so nothing can go stale.
//
// ONE LINE. The lead clause, and a second joined to it only when both fit: `compose` holds the
// guide's 60 characters, and the element itself falls back to the lead alone when the two are
// wider than its column (a 320 px sidebar holds about fifty characters at 13 px).
//
// A press goes to the lead clause's subject, the way a dated card goes to its own (ui/today.js).

import * as Astronomy from '../../vendor/astronomy.js';
import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { whenText } from './next.js';
import { isJunk } from '../sky/tonightbest.js';
import { labelName } from './labels.js';

/** docs/ui-guide.md section 4: no chrome sentence is longer. */
export const MAX_CHARS = 60;
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const REFRESH_MS = 5 * 60e3;
/** The record a press on the crew clause goes to: the ISS, as its elements load. */
const STATION_ID = 'sat-25544';

const words = (n) => COPY.numberWords[n] || fmt.int(n);

/** The Moon: full or new today, a day or a few from it, or how much of it is lit. */
export function moonClause(nowMs) {
  const S = COPY.sentence;
  try {
    const at = new Date(nowMs);
    const next = Astronomy.SearchMoonQuarter(at);
    const phase = S.moonPhases[next.quarter];
    const days = (next.time.date.getTime() - nowMs) / DAY;
    const base = { id: 'moon', source: S.sources.moon, act: 'moon', title: S.moonName };
    if (phase && days < 0.5) return { ...base, score: 80, clause: t(S.moonToday, { phase }) };
    if (phase && days < 1.5) return { ...base, score: 75, clause: t(S.moonOne, { phase }) };
    if (phase && days <= 3.5) return { ...base, score: 60, clause: t(S.moonDays, { n: words(Math.round(days)), phase }) };
    const pct = Math.round(Astronomy.Illumination('Moon', at).phase_fraction * 100);
    return { ...base, score: 20, clause: t(S.moonLit, { pct: fmt.int(pct) }) };
  } catch {
    return null;
  }
}

const sameLocalDay = (a, b) => new Date(a).toDateString() === new Date(b).toDateString();

/**
 * Everything that is true and worth a clause, the best first. Pure.
 *
 * @param {{nowMs: number, items?: Object[], crew?: Object|null, station?: Object|null,
 *   storms?: Object[], launched?: {count: number, newest?: Object}|null}} input  `items` is the
 *   Coming up list (ui/next.js); `crew` is Open Notify's headcount by craft, or null while it is
 *   not known; `station` is the record a press on the crew clause goes to; `launched` is the
 *   last-30-days layer's count and its newest record.
 */
export function sentenceCandidates({ nowMs, items = [], crew = null, station = null, storms = [], launched = null } = {}) {
  const S = COPY.sentence;
  if (!Number.isFinite(nowMs)) return [];
  const out = [];
  const future = (Array.isArray(items) ? items : []).filter((it) => it && Number.isFinite(it.tMs) && it.tMs >= nowMs - 60e3).sort((a, b) => a.tMs - b.tMs);

  // The next pass over your place: a station's first, never a spent stage (ui/today.js's rule).
  const passes = future.filter((it) => it.kind === 'pass' && it.record && it.tMs - nowMs < DAY && !isJunk(it.record));
  const pass = passes.find((it) => it.record.klass === 'station') || passes[0];
  if (pass) {
    const name = S.names[pass.record.id] || labelName(pass.record) || pass.record.name;
    out.push({ id: 'pass', score: 100, clause: t(S.pass, { name, when: whenText(pass.tMs, nowMs) }), source: S.sources.pass, act: 'select', record: pass.record, tMs: pass.tMs, title: pass.record.name });
  }

  const launch = future.find((it) => it.kind === 'launch' && it.record && it.tMs - nowMs < DAY && !(it.precision && /^(month|quarter|year|tbd|tba|day)/i.test(it.precision)));
  if (launch) {
    const name = (launch.record.meta && launch.record.meta.rocket) || launch.record.name;
    out.push({ id: 'launch', score: launch.tMs - nowMs < 2 * HOUR ? 110 : 90, clause: t(S.launch, { name, when: whenText(launch.tMs, nowMs) }), source: S.sources.launch, act: 'select', record: launch.record, tMs: launch.tMs, title: launch.record.name });
  }

  const shower = future.find((it) => it.kind === 'shower' && it.label && it.tMs - nowMs < 36 * HOUR);
  if (shower) {
    const today = sameLocalDay(shower.tMs, nowMs);
    const tomorrow = sameLocalDay(shower.tMs, nowMs + DAY);
    if (today || tomorrow) out.push({ id: 'shower', score: 85, clause: t(today ? S.showerToday : S.showerTomorrow, { name: shower.label }), source: S.sources.shower, act: 'tonight', tMs: shower.tMs, title: shower.label });
  }

  const moon = moonClause(nowMs);
  if (moon) out.push(moon);

  // How many people are in orbit: the sum of the headcount, only once it has been read.
  if (crew && typeof crew === 'object') {
    const n = Object.values(crew).reduce((sum, v) => sum + (Number.isFinite(v) && v > 0 ? v : 0), 0);
    if (n > 0) out.push({ id: 'crew', score: 70, clause: t(n === 1 ? S.crewOne : S.crew, { n: words(n) }), source: S.sources.crew, act: station ? 'select' : 'none', record: station || null, title: station ? station.name : '' });
  }

  const named = (Array.isArray(storms) ? storms : []).filter((r) => r && r.name);
  if (named.length) {
    out.push({ id: 'storms', score: 55, clause: named.length === 1 ? S.stormOne : t(S.storms, { n: words(named.length) }), source: S.sources.storms, act: 'select', record: named[0], title: named[0].name });
  }

  const approach = future.find((it) => it.kind === 'approach' && it.record && it.tMs - nowMs < 3 * DAY);
  if (approach) {
    const name = labelName(approach.record) || approach.record.name;
    out.push({ id: 'approach', score: 50, clause: t(S.approach, { name, when: whenText(approach.tMs, nowMs) }), source: S.sources.approach, act: 'select', record: approach.record, tMs: approach.tMs, title: approach.record.name });
  }

  if (launched && Number.isFinite(launched.count) && launched.count > 0) {
    const newest = launched.newest || null;
    out.push({ id: 'launched', score: 40, clause: t(S.launched, { n: fmt.int(launched.count) }), source: S.sources.launched, act: newest ? 'select' : 'none', record: newest, title: newest ? newest.name : '' });
  }
  return out.sort((a, b) => b.score - a.score);
}

const capital = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const length = (s) => [...s].length;

/**
 * The sentence. Pure. The best candidate leads; the next that fits beside it inside `maxChars`
 * is joined to it. One clause that is itself too long is no sentence at all.
 */
export function compose(candidates, maxChars = MAX_CHARS) {
  const S = COPY.sentence;
  const list = (Array.isArray(candidates) ? candidates : []).filter((c) => c && c.clause);
  const lead = list.find((c) => length(t(S.one, { a: c.clause })) <= maxChars);
  if (!lead) return null;
  const parts = [lead];
  let text = t(S.one, { a: capital(lead.clause) });
  for (const c of list) {
    if (c === lead || c.id === lead.id) continue;
    const both = t(S.two, { a: capital(lead.clause), b: c.clause });
    if (length(both) > maxChars) continue;
    text = both;
    parts.push(c);
    break;
  }
  return { text, parts, sources: [...new Set(parts.map((c) => c.source).filter(Boolean))] };
}

export function createSentence(ctx, opts = {}) {
  const S = COPY.sentence;
  if (typeof document === 'undefined' || !ctx || !ctx.explore || !ctx.explore.root) return { root: null, refresh() {}, destroy() {} };
  const root = document.createElement('button');
  root.type = 'button';
  root.className = 'sr-sentence';
  root.hidden = true;
  const text = document.createElement('span');
  text.className = 'sr-sentence__text';
  root.appendChild(text);
  let lead = null;
  root.addEventListener('click', () => { if (lead && typeof opts.go === 'function') opts.go(lead); });

  // Under the wordmark on a desktop. A phone's sheet opens on its handle and its tabs, a fixed
  // 96 px (ui/sheet.js), so there the line is the first thing in the sheet's body instead.
  const home = ctx.explore.root;
  function seat() {
    const phone = !!(ctx.shell && typeof ctx.shell.isPhone === 'function' && ctx.shell.isPhone());
    const head = home.querySelector('.sr-explore__head');
    const body = home.querySelector('.sr-explore__body');
    const brand = home.querySelector('.sr-explore__brand');
    if (phone && body) { if (root.parentNode !== body || body.firstChild !== root) body.prepend(root); }
    else if (head && brand) { if (root.previousSibling !== brand) brand.after(root); }
  }

  function input() {
    const nowMs = ctx.timePill && typeof ctx.timePill.anchor === 'function' ? ctx.timePill.anchor() : Date.now();
    const next = ctx.explore.next;
    const live = !ctx.clock || !ctx.clock.mode || ctx.clock.mode === 'live';
    // The list is built at the clock's time: away from now it is not the present's, and is left out.
    const items = live && next && typeof next.items === 'function' ? next.items() : [];
    return {
      nowMs,
      items,
      crew: typeof ctx.explore.crew === 'function' ? ctx.explore.crew() : null,
      station: typeof ctx.recordById === 'function' ? ctx.recordById(STATION_ID) : null,
      storms: typeof ctx.recordsFor === 'function' ? ctx.recordsFor('storms') || [] : [],
      launched: typeof opts.launched === 'function' ? opts.launched() : null,
    };
  }

  function refresh() {
    seat();
    const candidates = sentenceCandidates(input());
    let made = compose(candidates);
    if (!made) { root.hidden = true; lead = null; return; }
    root.hidden = false;
    text.textContent = made.text;
    // Wider than the column: the first clause that fits it alone, in rank order (a long rocket
    // name with "tomorrow at 21:14" can be). If none does, the best one, cut with an ellipsis and
    // whole in the tooltip.
    const clipped = () => text.scrollWidth > text.clientWidth + 1;
    if (clipped()) {
      const best = compose([made.parts[0]]);
      made = best;
      for (const c of candidates) {
        const alone = compose([c]);
        if (!alone) continue;
        text.textContent = alone.text;
        if (!clipped()) { made = alone; break; }
      }
      text.textContent = made.text;
    }
    lead = made.parts[0];
    root.title = [made.text, t(S.title, { sources: made.sources.join(COPY.punctuation.separator) })].join(' ');
    root.setAttribute('aria-label', made.text);
    root.classList.add('is-in');
  }

  const onData = () => refresh();
  const events = ['sr:next', 'sr:layer', 'sr:shell', 'sr:observer'];
  for (const name of events) window.addEventListener(name, onData);
  const timer = setInterval(refresh, REFRESH_MS);
  refresh();
  return {
    root,
    refresh,
    destroy() { for (const name of events) window.removeEventListener(name, onData); clearInterval(timer); root.remove(); },
  };
}
