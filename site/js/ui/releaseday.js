// ui/releaseday.js -- a big catalogue's day: the top bar's chip counting to it, and the section on its object's card
// (forge #547, Gaia DR4 on 2 December 2026; the awesome-space research of 2026-11-23).
//
// Contract, pure, for tests/test_releaseday.mjs:
//   releaseDates(types)                   -> the dated rows of registry/events.yaml `data-release` (events.registry.js)
//   dayState(row, nowMs)                  -> { phase: 'days'|'tomorrow'|'today'|'out', n, tMs } in whole UTC days
//   chipRelease(nowMs, rows)              -> { row, state } | null: the row whose chip window holds today
//   chipWords(row, state, objectName)     -> { text, label }
//   releaseFor(record, nowMs, rows)       -> the row the record's card tells, or null
//   releaseWords(row, nowMs)              -> { label, hint, lines: [...], sources, journal|null }
// DOM: releaseSection(row, nowMs, el)      -> the card's panel (ui/cards.js puts it in a row that opens in place)
//
// WHAT IT SAYS, AND WHOSE WORD IT IS. The day is the agency's, typed in registry/events.yaml with the page it was read
// on. The agency gives NO HOUR, so nothing here counts hours: the chip says "in 8 days", "tomorrow", "today", and the
// row of Coming up says the date (ui/next.js `release`). The card says, in so many words, that nothing on the map
// changes on the day: a refresh of our stars is a separate change, made once the new data is usable and its terms are
// read (the registry row's comment). The Journal post is linked only from the day it is published (`journal_from`).
//
// The chip is the launch chip's own button (ui/launchchip.js): a launch inside a day comes first, and otherwise, inside
// a row's chip window, the chip counts to the catalogue's day and opens its object's card. No second chip, no new place
// in the top bar.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.live.js';
import { loadCss } from './latercss.js';
import { EVENT_TYPES } from '../data/events.registry.js';
import { releaseDayMs } from '../data/events.js';

const DAY_MS = 86400e3;
/** How long after its day a catalogue's section stays on its object's card. */
export const CARD_AFTER_DAYS = 30;

const utcDay = (ms) => Math.floor(ms / DAY_MS);
const dayOf = (date) => { const ms = Date.parse(`${String(date || '')}T00:00:00Z`); return Number.isFinite(ms) ? utcDay(ms) : NaN; };

/** The dated rows of the `data-release` type. Pure. */
export function releaseDates(types = EVENT_TYPES) {
  const type = (Array.isArray(types) ? types : []).find((x) => x && x.id === 'data-release' && x.enabled !== false);
  return type && Array.isArray(type.dates) ? type.dates.filter((d) => d && d.id && d.date) : [];
}

/** How far the day is, in whole UTC days. Pure. */
export function dayState(row, nowMs) {
  const day = dayOf(row && row.date);
  if (!Number.isFinite(day) || !Number.isFinite(nowMs)) return null;
  const n = day - utcDay(nowMs);
  const phase = n > 1 ? 'days' : n === 1 ? 'tomorrow' : n === 0 ? 'today' : 'out';
  return { phase, n, tMs: releaseDayMs(row.date) };
}

/** The row the chip counts to: the first whose window holds today. Pure. */
export function chipRelease(nowMs, rows = releaseDates()) {
  const today = utcDay(nowMs);
  for (const row of Array.isArray(rows) ? rows : []) {
    const from = dayOf(row.chipFrom);
    const until = dayOf(row.chipUntil);
    if (!Number.isFinite(from) || !Number.isFinite(until) || today < from || today > until) continue;
    const state = dayState(row, nowMs);
    if (state) return { row, state };
  }
  return null;
}

/** What the chip shows, and its name for a screen reader. Pure. */
export function chipWords(row, state, objectName = '') {
  const R = COPY.releaseDay;
  if (!row || !state) return { text: '', label: '' };
  const name = row.name;
  const text = state.phase === 'days' ? t(R.chipDays, { name, n: fmt.int(state.n) })
    : state.phase === 'tomorrow' ? t(R.chipTomorrow, { name })
      : state.phase === 'today' ? t(R.chipToday, { name })
        : t(R.chipOut, { name });
  const label = t(R.chipLabel, { name, date: timeText.utcLong(state.tMs), object: objectName || name });
  return { text, label };
}

/** The row whose section this record's card carries: its object, from the chip's first day to a month after. Pure. */
export function releaseFor(record, nowMs, rows = releaseDates()) {
  if (!record || !record.id) return null;
  const today = utcDay(nowMs);
  for (const row of Array.isArray(rows) ? rows : []) {
    if (row.object !== record.id) continue;
    const from = Number.isFinite(dayOf(row.chipFrom)) ? dayOf(row.chipFrom) : dayOf(row.date);
    if (today >= from && today <= dayOf(row.date) + CARD_AFTER_DAYS) return row;
  }
  return null;
}

/** The section's words. Pure. A row without its block of words in COPY.releaseDay.dates says only the day. */
export function releaseWords(row, nowMs) {
  const R = COPY.releaseDay;
  const state = dayState(row, nowMs);
  if (!state) return null;
  const date = timeText.utcLong(state.tMs);
  const lead = state.phase === 'days' ? t(R.inDays, { n: fmt.int(state.n), date })
    : state.phase === 'tomorrow' ? t(R.tomorrow, { date })
      : state.phase === 'today' ? t(R.today, { date })
        : t(R.out, { date });
  const hint = state.phase === 'days' ? t(R.hintDays, { n: fmt.int(state.n) })
    : state.phase === 'tomorrow' ? R.hintTomorrow : state.phase === 'today' ? R.hintToday : R.hintOut;
  const own = (R.dates && R.dates[row.id]) || {};
  const lines = [lead, own.what, own.stars, own.after, own.where].filter(Boolean);
  const journalFrom = dayOf(row.journalFrom);
  const journal = row.journal && Number.isFinite(journalFrom) && utcDay(nowMs) >= journalFrom ? row.journal : null;
  return {
    label: t(R.section, { name: row.name, date }),
    hint,
    lines,
    sources: Number.isFinite(Date.parse(`${row.read}T12:00:00Z`)) ? t(R.sources, { publisher: own.publisher || row.name, date: timeText.utcLong(Date.parse(`${row.read}T12:00:00Z`)) }) : '',
    source: row.source || null,
    journal,
    state,
  };
}

/** The card's panel: the lines, the source, the Journal post when it is out. `el` is the card's own element maker. */
export function releaseSection(row, nowMs, el) {
  const w = releaseWords(row, nowMs);
  if (!w) return null;
  const R = COPY.releaseDay;
  loadCss('live');
  const panel = el('div', 'sr-release');
  panel.dataset.release = row.id;
  w.lines.forEach((line, i) => panel.appendChild(el('p', i === 0 ? 'sr-card__sentence sr-release__when' : 'sr-card__note', line)));
  if (w.sources) panel.appendChild(el('p', 'sr-card__source sr-release__src', w.sources));
  if (w.source) {
    // The agency's page, as the card's links out are drawn (ui/cardextras.js linkNodes).
    const a = el('a', 'sr-card__page sr-card__out', R.sourceLink);
    a.href = w.source;
    a.target = '_blank';
    a.rel = 'noopener';
    panel.appendChild(a);
  }
  if (w.journal) {
    const a = el('a', 'ui-btn ui-btn--sm sr-release__journal', R.journal);
    a.href = w.journal;
    a.target = '_blank';
    a.rel = 'noopener';
    panel.appendChild(a);
  }
  return { panel, label: w.label, hint: w.hint };
}
