// ui/next.js -- the Next moment's list: what is coming, and when, from records the app already holds.
//
// Contract: createNext(ctx) -> { root, refresh(), destroy() }
// Also exported, pure, so the list can be tested without a DOM or a clock:
//   buildNextItems(records, nowMs, opts) -> [{kind, record, tMs, ...}] sorted by time
//   rowText(item, nowMs), classText(item, nowMs) -> the row's sentence and the line under it
//
// Since spec 0031 (2026-09-23) the items come from data/events.js buildEvents(), the one event
// stream registry/events.yaml describes; this file maps its records to rows and chooses the eight.
// Only perihelia are still derived here: a comet's closest approach to the Sun is a property of a
// record, not an event type in the registry.
//
// Spec 0026 req 6. Until now the Next door changed the layer defaults and said "What is coming, and
// when" over the same globe, and nothing on screen answered. This answers from what is loaded --
// no fetch, no new source: the launches layer's net times, the asteroid layer's close approaches,
// the comets' perihelia, and, when the visitor has a place, the bright passes over it in the next
// day. Eight rows, nearest in time first, each a tap to the record. When a layer that would feed
// the list has not loaded, the note says which, rather than the list pretending to be complete.

import { COPY, t, fmt, timeText, ageInWords } from '../copy/en.js';
import { revealInColumn } from './reveal.js';
import { labelName } from './labels.js';
import { SHOWERS } from '../data/showers.js';
import { kpWords } from './spaceweather.js';
import { load } from '../data/sources.js';
import { parseSpaceWeather } from '../data/parsers.js';
import { buildEvents, launchItem, approachItem, eclipseSentence } from '../data/events.js';
import { epochMs } from '../propagate/sgp4.js';

// Moved to data/events.js with the builders that use them (spec 0031 task 2); still exported from
// here, where tests/test_next.mjs and tests/test_radiants.mjs have always imported them.
export { showerItems, auroraItem, moonLitThatNight, radiantThatNight } from '../data/events.js';

export const NEXT_CAP = 8;
const HOUR = 3600e3;
const DAY = 24 * HOUR;

/** "in 40 minutes", "in 3 hours", "tomorrow 14:05", "Fri 12 Sep, 21:14" -- the nearest true phrase. */
export function whenText(tMs, nowMs) {
  const d = tMs - nowMs;
  const T = COPY.nextList;
  if (d < 90e3) return T.now;
  if (d < HOUR) return t(T.inMinutes, { n: Math.round(d / 60e3) });
  if (d < 12 * HOUR) return t(T.inHours, { n: Math.round(d / HOUR) });
  const dayDiff = Math.floor((startOfDay(tMs) - startOfDay(nowMs)) / DAY);
  if (dayDiff === 0) return t(T.todayAt, { time: timeText.hhmm(tMs) });
  if (dayDiff === 1) return t(T.tomorrowAt, { time: timeText.hhmm(tMs) });
  if (d < 7 * DAY) return timeText.dayAndTime(tMs);
  // The list runs to a comet's perihelion up to a year out, and "Mon 19 Mar" eleven months away reads
  // as next week's Monday; dateNear writes the year once it is more than half a year off.
  return timeText.dateNear(tMs, nowMs);
}

function startOfDay(ms) {
  const d = new Date(ms);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** At most this many "comes over you" rows, so a pass minutes away cannot fill the list. */
export const PASS_ROWS = 3;

/** How the event stream's types are named as rows (the kinds rowText() and balance() read). */
const KIND_OF = {
  'launch': 'launch',
  'close-approach': 'approach',
  'meteor-shower': 'shower',
  'station-pass': 'pass',
  'starlink-train': 'train',
  'aurora': 'aurora',
  'solar-eclipse': 'solar-eclipse',
  'lunar-eclipse': 'lunar-eclipse',
};
const ECLIPSE_KINDS = ['solar-eclipse', 'lunar-eclipse'];

/** One event record as the row it was before the move: its kind, its record, its time, its fields. */
export function toItem(ev) {
  const kind = ev && KIND_OF[ev.type];
  if (!kind) return null;
  if (ECLIPSE_KINDS.includes(kind)) {
    return { kind, record: null, tMs: ev.t, label: ev.title, eclipseKind: ev.kind, where: ev.where, local: ev.local, event: ev };
  }
  return { kind, record: ev.record || null, tMs: ev.t, ...ev.detail };
}

/**
 * The list, pure. `records` is everything loaded; `opts.observer` ({latRad, lonRad, altKm}) adds
 * passes, trains and an eclipse's local times; `opts.showers`, `opts.spaceWeather` and
 * `opts.eclipses: true` feed their kinds. Kinds: launch | approach | perihelion | pass | train | shower | aurora | solar-eclipse |
 * lunar-eclipse. Only future times; capped at NEXT_CAP by balance().
 */
export function buildNextItems(records, nowMs, opts = {}) {
  const horizonMs = opts.horizonMs || 30 * DAY;
  const observer = opts.observer && Number.isFinite(opts.observer.latRad) && Number.isFinite(opts.observer.lonRad) ? opts.observer : null;
  const events = buildEvents(records, nowMs, {
    observer,
    horizonMs,
    // Showers only when the caller hands them over, as before the move: createNext() passes the
    // registry's, and a test that passes none gets none.
    showers: opts.showers || null,
    spaceWeather: opts.spaceWeather || null,
    trainThresholdKm: opts.trainThresholdKm,
    // Likewise eclipses: createNext() asks for them; the record-only cases in tests/test_next.mjs
    // (which predate them) do not, and read exactly what they read before.
    eclipses: opts.eclipses === true,
  });
  const items = [];
  // The next solar and the next lunar eclipse, one row each (spec 0031 req 5): the stream holds
  // every eclipse in 400 days, five of them from 2026-09-22, and three penumbral lunar rows would
  // be most of the list for the faintest thing on it.
  const eclipseSeen = new Set();
  for (const ev of events) {
    const it = toItem(ev);
    if (!it) continue;
    if (ECLIPSE_KINDS.includes(it.kind)) {
      if (eclipseSeen.has(it.kind)) continue;
      eclipseSeen.add(it.kind);
    }
    items.push(it);
  }
  // Perihelia stay here: the record walk's third branch, for what is neither a launch nor an approach.
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || !r.meta || launchItem(r, nowMs, horizonMs) || approachItem(r, nowMs, horizonMs)) continue;
    const m = r.meta;
    if (Number.isFinite(m.perihelionMs) && m.perihelionMs > nowMs && m.perihelionMs - nowMs < horizonMs) {
      items.push({ kind: 'perihelion', record: r, tMs: m.perihelionMs });
    }
  }
  return balance(items);
}

/**
 * Which rows make the eight.
 *
 * It was the eight soonest. With a place set, that is eight passes: 156 bright objects cross the
 * sky of anywhere every few minutes, so on 2026-09-22 London's list read "SL-8 R/B comes over you
 * about now" (twice), five more spent stages and a SAOCOM -- and not tomorrow's launch, nor any of
 * the comets the list's own heading promises. So passes get at most PASS_ROWS rows, a crewed
 * station's first because that is the pass people come for; a climbing train gets at most one; the
 * soonest launch, close approach and perihelion each get a row before the rest fill by time; and
 * whatever room is left goes back to passes. The rows are then shown in time order.
 */
export function balance(items) {
  const byTime = (a, b) => a.tMs - b.tMs;
  // klass, not layer: the stations layer also holds the CubeSats deployed from the ISS, and the first
  // version of this preferred three of them passing tomorrow over the stages passing now.
  const crewed = (it) => !!(it.record && it.record.klass === 'station');
  // One pass per place in the sky. The ISS's core and its Poisk and Nauka modules are three catalogue
  // objects at one point, and made three identical rows; a docked Dragon would make a fourth. Passes
  // starting within a minute of each other are one pass, told under the name a hand-kept list gives.
  const named = (it) => !!(it.record && it.record.meta && it.record.meta.why);
  const allPasses = items.filter((it) => it.kind === 'pass').sort((a, b) => (named(b) - named(a)) || byTime(a, b));
  const passes = [];
  for (const p of allPasses) if (!passes.some((q) => Math.abs(q.tMs - p.tMs) < 60e3)) passes.push(p);
  passes.sort((a, b) => (crewed(b) - crewed(a)) || byTime(a, b));
  const trains = items.filter((it) => it.kind === 'train').sort(byTime);
  const events = items.filter((it) => it.kind !== 'pass' && it.kind !== 'train').sort(byTime);
  const chosen = [...passes.slice(0, PASS_ROWS), ...trains.slice(0, 1)];
  const take = (it) => { if (chosen.length < NEXT_CAP && !chosen.includes(it)) chosen.push(it); };
  // An eclipse is guaranteed its row right after the soonest launch: rare enough that a ninth launch
  // must not push it off the list (spec 0031 req 5), never ahead of a storm happening now.
  for (const kind of ['aurora', 'launch', 'solar-eclipse', 'lunar-eclipse', 'approach', 'perihelion', 'shower']) {
    const first = events.find((e) => e.kind === kind);
    if (first) take(first);
  }
  for (const e of events) take(e);
  for (const p of passes.slice(PASS_ROWS)) take(p);
  for (const tr of trains.slice(1)) take(tr);
  chosen.sort(byTime);
  // Name each row as the visitor will read it; where two rows would read the same, add the number.
  const seen = new Map();
  for (const it of chosen) { const n = shownName(it.record); if (n) seen.set(n, (seen.get(n) || 0) + 1); }
  for (const it of chosen) {
    const n = shownName(it.record);
    const id = it.record && it.record.meta && it.record.meta.noradId;
    if (n && seen.get(n) > 1 && id) it.label = t(COPY.nextList.sameName, { name: n, id: String(id) });
  }
  return chosen;
}

/**
 * The name the labels over the scene use -- "International Space Station", "Envisat", not ISS (ZARYA)
 * and ENVISAT -- but never shortened: labelName cuts at 34 characters to keep a label off its
 * neighbours, and a list row has the room. A launch's own name is already the readable one.
 */
function shownName(record) {
  if (!record) return null;
  if (record.layer === 'launches') return record.name || null;
  const short = labelName(record);
  return short && short.endsWith('…') ? record.name : short;
}

/** One row's words. Pure. */
export function rowText(item, nowMs) {
  const T = COPY.nextList;
  const name = item.label || shownName(item.record) || COPY.card.unknownName;
  const when = whenText(item.tMs, nowMs);
  switch (item.kind) {
    case 'launch':
      return item.precision && /^(month|quarter|year|tbd|tba)/i.test(item.precision)
        ? t(T.launchRough, { name, when })
        : t(T.launch, { name, when });
    case 'approach':
      return item.ld !== null && Number.isFinite(item.ld)
        ? t(T.approach, { name, when, ld: fmt.smart(item.ld) })
        : t(T.approachNoDistance, { name, when });
    case 'perihelion':
      return t(T.perihelion, { name, when });
    case 'pass':
      return t(T.pass, { name, when });
    case 'train':
      return t(T.train, { n: fmt.int(item.count), when });
    case 'aurora':
      return item.now
        ? t(T.auroraNow, { kp: fmt.smart(item.kp), word: kpWords(item.kp).word })
        : t(T.aurora, { kp: fmt.smart(item.kp), word: kpWords(item.kp).word, when });
    case 'shower':
      // A date, not a time: the peak moves by hours between years (registry/showers.yaml).
      {
        const base = { name, date: timeText.dateNear(item.tMs, nowMs), zhr: fmt.int(item.zhr) };
        let line = !Number.isFinite(item.moonLit) ? t(T.shower, base)
          : item.moonLit < 0.1 ? t(T.showerNoMoon, base)
            : t(T.showerMoon, { ...base, pct: fmt.int(Math.round(item.moonLit * 100)) });
        const r = item.radiant;
        if (r) {
          line += COPY.punctuation.sentenceJoin + (r.altDeg < 0 ? T.radiantNeverUp
            : r.altDeg < 20 ? T.radiantLow
              : t(T.radiantHigh, { time: timeText.hhmm(r.tMs) }));
        }
        return line;
      }
    case 'solar-eclipse':
    case 'lunar-eclipse': {
      // The date, never a countdown: "in 312 days" is a number nobody plans by (spec 0013's time
      // rules). No "expected" either: a computed eclipse does not slip.
      const ev = item.event || { type: item.kind, kind: item.eclipseKind, where: item.where };
      let line = eclipseSentence(ev, timeText.longDate(item.tMs));
      const local = localText(item.local);
      if (local) line += COPY.punctuation.sentenceJoin + local;
      return line;
    }
    default:
      return `${name} ${when}`;
  }
}

/** The local line of a solar eclipse row, or null when no place is set (spec 0031 req 6). */
export function localText(local) {
  const T = COPY.nextList;
  if (!local) return null;
  if (!local.visible) return local.reason === 'below-horizon' ? T.eclipseBelowHorizon : T.eclipseNotVisible;
  const times = { begin: timeText.hhmm(local.beginMs), peak: timeText.hhmm(local.peakMs), end: timeText.hhmm(local.endMs) };
  return local.kind === 'total'
    ? t(T.eclipseLocalTotal, times)
    : t(T.eclipseLocal, { ...times, pct: fmt.int(Math.round(local.obscuration * 100)) });
}

/**
 * What the row's time IS, as the small line under it (spec 0031 req 7). A launch's time is a plan;
 * an eclipse is worked out to the minute; a pass is only as good as the elements it came from, so
 * it says how old they are (the wall clock, as data/parsers.js classForEpoch does: a scrubbed clock
 * does not change how old the data is). Pure but for that clock.
 */
export function classText(item, wallMs = Date.now()) {
  const C = COPY.nextList.classOf;
  switch (item && item.kind) {
    case 'launch': return C.launch;
    case 'approach': return C.approach;
    case 'perihelion': return C.perihelion;
    case 'shower': return C.shower;
    case 'aurora': return item.now ? C.auroraNow : C.aurora;
    case 'pass':
    case 'train': {
      const epoch = item.record ? epochMs(item.record) : NaN;
      return Number.isFinite(epoch) ? t(C.pass, { age: ageInWords(wallMs - epoch) }) : C.passNoAge;
    }
    case 'solar-eclipse':
    case 'lunar-eclipse': return C.eclipse;
    default: return null;
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createNext(ctx) {
  const T = COPY.nextList;
  const root = el('section', 'sr-panel sr-next');
  root.hidden = true;
  root.appendChild(el('h2', 'sr-panel__title', T.title));
  root.appendChild(el('p', 'sr-next__hint', T.hint));
  const list = el('ul', 'sr-next__list');
  const note = el('p', 'sr-next__note');
  root.appendChild(list);
  root.appendChild(note);
  const FEEDS = ['launches', 'asteroids', 'comets'];
  let timer = null;

  function loadedIds() {
    const out = new Set();
    for (const id of FEEDS) if ((ctx.recordsFor(id) || []).length) out.add(id);
    return out;
  }

  function refresh() {
    if (root.hidden) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const now = ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now();
    const observer = ctx.observer && Number.isFinite(ctx.observer.latRad) ? ctx.observer : null;
    const items = buildNextItems(ctx.records(), now, { observer, showers: SHOWERS, spaceWeather: weather, eclipses: true });
    for (const item of items) {
      const li = el('li', 'sr-next__row', rowText(item, now));
      li.dataset.kind = item.kind;
      const cls = classText(item);
      if (cls) li.appendChild(el('span', 'sr-next__class', cls));
      if (item.record) {
        // A row that flies somewhere is a button to a keyboard too; it was click-only.
        const go = () => { if (typeof ctx.select === 'function') ctx.select(item.record); };
        li.tabIndex = 0;
        li.setAttribute('role', 'button');
        li.addEventListener('click', go);
        li.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
      }
      list.appendChild(li);
    }
    const have = loadedIds();
    const missing = FEEDS.filter((id) => !have.has(id)).map((id) => {
      const layer = (ctx.layers || []).find((l) => l.id === id);
      return layer ? layer.display || id : id;
    });
    const parts = [];
    if (!items.length) parts.push(T.none);
    if (missing.length) parts.push(t(T.notLoaded, { layers: missing.join(COPY.punctuation.listJoin) }));
    if (!observer) parts.push(T.noObserver);
    note.textContent = parts.join(' ');
    note.hidden = parts.length === 0;
  }

  // NOAA's Kp, through the same source row and gate the space-weather line uses, so opening the
  // list costs no request that line has not already made.
  let weather = null;
  function readWeather() {
    load('swpc-kp')
      .then((r) => { weather = r && r.data != null ? parseSpaceWeather(r.data) : null; refresh(); })
      .catch(() => {});
  }

  function setMoment(moment) {
    root.hidden = moment !== 'next';
    if (!root.hidden) { refresh(); readWeather(); }
  }

  // Pressing Next reveals the list directly under the row of moment buttons, so the answer appears
  // under the question (ui/reveal.js has the measurement). REVEAL_ABOVE is that row's height.
  const REVEAL_ABOVE = 104;

  const onLayer = () => refresh();
  const onObserver = () => refresh();
  const onMoment = (e) => {
    setMoment(e && e.detail);
    if (e && e.detail === 'next') revealInColumn(root, REVEAL_ABOVE);
  };
  window.addEventListener('sr:layer', onLayer);
  window.addEventListener('sr:observer', onObserver);
  window.addEventListener('sr:moment', onMoment);
  timer = window.setInterval(refresh, 60e3);
  setMoment(ctx.moment);

  return {
    root,
    refresh,
    setMoment,
    destroy() {
      window.removeEventListener('sr:layer', onLayer);
      window.removeEventListener('sr:observer', onObserver);
      window.removeEventListener('sr:moment', onMoment);
      window.clearInterval(timer);
      root.remove();
    },
  };
}
