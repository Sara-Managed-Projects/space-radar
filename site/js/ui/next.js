// ui/next.js -- the Next moment's list: what is coming, and when, from records the app already holds.
//
// Contract: createNext(ctx) -> { root, refresh(), items(), weather(), destroy() }
// Also exported, pure, so the list can be tested without a DOM or a clock:
//   buildNextItems(records, nowMs, opts) -> [{kind, record, tMs, ...}] sorted by time
//   rowText(item, nowMs), classText(item, nowMs) -> the row's sentence and what its time is
//   rowParts(item, nowMs) -> {title, detail, value}  the row as drawn: a name, one line, a number
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

import { COPY, t, fmt, timeText, ageInWords, compassWords } from '../copy/en.js';
import { labelName } from './labels.js';
import { SHOWERS } from '../data/showers.js';
import { kpWords } from './spaceweather.js';
import { load } from '../data/sources.js';
import { parseSpaceWeather } from '../data/parsers.js';
import { buildEvents, launchItem, approachItem, eclipseSentence, usePassRunner, onPassesReady } from '../data/events.js';
import { epochMs } from '../propagate/sgp4.js';
import { shareUrl, toast } from './share.js';

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
  'solstice': 'season',
  'equinox': 'season',
};
const ECLIPSE_KINDS = ['solar-eclipse', 'lunar-eclipse'];

/** One event record as the row it was before the move: its kind, its record, its time, its fields. */
export function toItem(ev) {
  const kind = ev && KIND_OF[ev.type];
  if (!kind) return null;
  if (ECLIPSE_KINDS.includes(kind)) {
    return { kind, record: null, tMs: ev.t, label: ev.title, eclipseKind: ev.kind, where: ev.where, local: ev.local, event: ev };
  }
  // A solstice or an equinox (internal #384): the record's own sentence is the row.
  if (kind === 'season') return { kind, record: null, tMs: ev.t, label: ev.title, say: ev.say, season: ev.kind };
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
  // From the visitor's own place (internal #359): worked out in a worker, handed in whole.
  if (Array.isArray(opts.fromPlace)) {
    for (const f of opts.fromPlace) {
      if (f && f.kind === 'conjunction' && f.tMs > nowMs && f.tMs - nowMs < horizonMs) items.push(f);
    }
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
  // A spent rocket body or a fragment comes after everything else that passes (the rule
  // sky/tonightbest.js keeps for "best"): on 2026-10-06 the list's passes over London were
  // "SL-8 R/B" and "H-2A R/B" with Tiangong due the next morning.
  const junk = (it) => /\b(R\/B|DEB)\b/i.test(String((it.record && it.record.name) || '')) || ['rocket', 'debris'].includes(it.record && it.record.klass);
  passes.sort((a, b) => (crewed(b) - crewed(a)) || (junk(a) - junk(b)) || byTime(a, b));
  const trains = items.filter((it) => it.kind === 'train').sort(byTime);
  const events = items.filter((it) => it.kind !== 'pass' && it.kind !== 'train').sort(byTime);
  const chosen = [...passes.slice(0, PASS_ROWS), ...trains.slice(0, 1)];
  const take = (it) => { if (chosen.length < NEXT_CAP && !chosen.includes(it)) chosen.push(it); };
  // An eclipse is guaranteed its row right after the soonest launch: rare enough that a ninth launch
  // must not push it off the list (spec 0031 req 5), never ahead of a storm happening now.
  // A pair from the visitor's own place comes next: a month has one or none, and at the end of this
  // line a full list never showed it (seen 2026-10-09: three passes, a launch, two eclipses, an
  // approach and a perihelion made eight, and Mars beside Jupiter had no row).
  for (const kind of ['aurora', 'launch', 'solar-eclipse', 'lunar-eclipse', 'conjunction', 'approach', 'perihelion', 'shower']) {
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
/** "low in the south-east": how high and which way, from the finder's altitude and azimuth. */
function whereWords(item) {
  const R = COPY.nextList.row;
  const height = item.altDeg < 15 ? R.low : item.altDeg < 45 ? R.mid : R.high;
  return { height, dir: compassWords(item.azDeg) };
}

export function rowText(item, nowMs) {
  const T = COPY.nextList;
  const name = item.label || shownName(item.record) || COPY.card.unknownName;
  const when = whenText(item.tMs, nowMs);
  switch (item.kind) {
    case 'launch':
      return item.precision && /^(month|quarter|year|tbd|tba)/i.test(item.precision)
        ? t(T.launchRough, { name, when })
        : t(T.launch, { name, when });
    case 'approach': {
      const line = item.ld !== null && Number.isFinite(item.ld)
        ? t(T.approach, { name, when, ld: fmt.smart(item.ld) })
        : t(T.approachNoDistance, { name, when });
      const size = sizeText(item.size);
      return size ? line + COPY.punctuation.sentenceJoin + size : line;
    }
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
    case 'season':
      // The date, never a countdown, as an eclipse: computed, and it does not slip.
      return item.say || item.label;
    case 'conjunction':
      return `${t(COPY.nextList.row.conjunctionTitle, { a: item.a, b: item.b })}: ${t(COPY.nextList.row.conjunction, { when, sep: fmt.num(item.sepDeg, 1), ...whereWords(item) })}`;
    default:
      return `${name} ${when}`;
  }
}

/** Two significant figures, as metres or kilometres: 13 -> "13 m", 1 480 -> "1.5 km". */
function sizeNumber(m) {
  if (m >= 1000) return { n: String(Number((m / 1000).toPrecision(2))), km: true };
  return { n: fmt.int(Number(m.toPrecision(m < 10 ? 1 : 2))), km: false };
}

/**
 * "About 8 to 18 m across, judged from its brightness" (public #313): the one other fact that
 * makes a close approach interesting or dull. Null when the catalogue gives neither a size nor a
 * brightness. Exported for the test.
 */
export function sizeText(size) {
  const T = COPY.nextList;
  if (!size || !(size.loM > 0)) return null;
  const lo = sizeNumber(size.loM);
  const hi = sizeNumber(size.hiM);
  if (size.measured) return t(lo.km ? T.sizeKm : T.sizeM, { n: lo.n });
  if (lo.km !== hi.km) return t(T.sizeMixed, { lo: lo.n, hi: hi.n });
  return t(hi.km ? T.sizeRangeKm : T.sizeRangeM, { lo: lo.n, hi: hi.n });
}

/** The size as the row draws it: "340 m", "5 to 11 m", "0.7 to 1.6 km". Null with no number. */
export function sizeShort(size) {
  const R = COPY.nextList.row;
  if (!size || !(size.loM > 0)) return null;
  const lo = sizeNumber(size.loM);
  const hi = sizeNumber(size.hiM);
  if (size.measured) return t(lo.km ? R.sizeKm : R.sizeM, { n: lo.n });
  if (lo.km !== hi.km) return t(R.sizeRangeKm, { lo: String(Number((size.loM / 1000).toPrecision(1))), hi: hi.n });
  return t(hi.km ? R.sizeRangeKm : R.sizeRangeM, { lo: lo.n, hi: hi.n });
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
    case 'season': return C.season;
    case 'conjunction': return C.conjunction;
    default: return null;
  }
}

/**
 * The row AS DRAWN (spec 0061 task 5, req 11; docs/ui-guide.md section 3.5): a title on one line,
 * one line under it, and for a close approach its distance as the row's number. Pure.
 *
 * rowText() is a sentence, and a sentence in a 320 px column is three lines: on 2026-10-03 the
 * Orionids' row was five lines of the sidebar with its class line. The sentence is still the
 * row's whole account (createNext() gives it to the tooltip and the accessible name, with
 * classText()), and this is what fits: WHAT on the first line, WHEN and the one thing worth
 * knowing on the second. A launch keeps "planned" in sight, because its time is the only one on
 * the list that can move (spec 0031 req 7).
 */
export function rowParts(item, nowMs) {
  const R = COPY.nextList.row;
  const name = item.label || shownName(item.record) || COPY.card.unknownName;
  const when = whenText(item.tMs, nowMs);
  switch (item.kind) {
    case 'launch':
      return { title: name, detail: t(item.precision && /^(month|quarter|year|tbd|tba)/i.test(item.precision) ? R.launchRough : R.launch, { when }) };
    case 'approach': {
      // How big, on the row itself (public #313): "about 5 to 11 m", after when.
      const size = sizeShort(item.size);
      return { title: name, detail: size ? t(R.approachSized, { when, size }) : t(R.approach, { when }), value: item.ld !== null && Number.isFinite(item.ld) ? t(R.approachValue, { ld: fmt.smart(item.ld) }) : '' };
    }
    case 'perihelion':
      return { title: name, detail: t(R.perihelion, { when }) };
    case 'pass':
      return { title: name, detail: t(R.pass, { when }) };
    case 'train':
      return { title: t(R.trainTitle, { n: fmt.int(item.count) }), detail: t(R.pass, { when }) };
    case 'aurora':
      return item.now
        ? { title: R.auroraNowTitle, detail: R.auroraNow, value: t(R.kp, { kp: fmt.smart(item.kp) }) }
        : { title: R.auroraTitle, detail: t(R.aurora, { when }), value: t(R.kp, { kp: fmt.smart(item.kp) }) };
    case 'shower':
      return { title: t(R.showerTitle, { name }), detail: t(R.shower, { date: timeText.dateNear(item.tMs, nowMs), zhr: fmt.int(item.zhr) }) };
    case 'solar-eclipse':
    case 'lunar-eclipse': {
      const date = timeText.longDate(item.tMs);
      const local = item.local;
      const detail = !local ? t(R.eclipse, { date })
        : !local.visible ? t(R.eclipseNotHere, { date })
          : t(R.eclipseHere, { date, begin: timeText.hhmm(local.beginMs), end: timeText.hhmm(local.endMs) });
      return { title: name, detail };
    }
    case 'season':
      return { title: name, detail: t(R.eclipse, { date: timeText.longDate(item.tMs) }) };
    case 'conjunction':
      return { title: t(R.conjunctionTitle, { a: item.a, b: item.b }), detail: t(R.conjunction, { when, sep: fmt.num(item.sepDeg, 1), ...whereWords(item) }), value: t(R.conjunctionValue, { sep: fmt.num(item.sepDeg, 1) }) };
    default:
      return { title: name, detail: when };
  }
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Does the row have a time worth a calendar entry? data/ics.js offersIcs decides again when pressed. */
export function offersCalendar(item) {
  return !!item && Number.isFinite(item.tMs) && !(item.kind === 'aurora' && item.now);
}

/** The way back from a calendar entry: a launch's webcast, else the thing's own link, else the map. */
export function calendarUrl(item) {
  const r = item && item.record;
  if (r && r.meta && r.meta.webcastUrl) return String(r.meta.webcastUrl);
  try { return shareUrl(r && r.id ? { at: r.id } : {}); } catch { return ''; }
}

/**
 * ADD TO CALENDAR (public #235): the row as one .ics file, built here in the browser by
 * data/ics.js (fetched on the first press) and handed over as a download. No server, and nothing
 * kept: a pass's times are for the visitor's place, and they go into the file and nowhere else.
 */
export async function saveCalendar(item, nowMs) {
  const T = COPY.nextList;
  try {
    const { toIcs, icsFilename } = await import('../data/ics.js');
    const parts = rowParts(item, nowMs);
    const text = toIcs(item, {
      title: parts.title,
      // What it is and what its time is; never the row's "in 5 hours", which is wrong the moment
      // the file is saved (SEEN in the first file made, 2026-10-07).
      description: [parts.title, classText(item)].filter(Boolean).join(COPY.punctuation.sentenceJoin),
      url: calendarUrl(item),
    });
    if (!text) { toast(T.calendarFailed); return false; }
    const file = icsFilename(item, parts.title);
    const href = URL.createObjectURL(new Blob([text], { type: 'text/calendar;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = href;
    a.download = file;
    a.rel = 'noopener';
    a.hidden = true;
    a.setAttribute('aria-label', T.calendar);
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(href), 10e3);
    toast(t(T.calendarSaved, { file }), 3000);
    return true;
  } catch (e) {
    console.warn('the calendar file could not be made', e);
    toast(T.calendarFailed);
    return false;
  }
}

/**
 * "Coming up" (spec 0061 design §2): always in the explore view, not a door's answer any more. It
 * shows `opts.limit` rows and "Show all" expands the rest in place.
 *
 * @param {Object} ctx
 * @param {{limit?: number}} [opts]
 */
export function createNext(ctx, opts = {}) {
  const T = COPY.nextList;
  const limit = Number.isFinite(opts.limit) && opts.limit > 0 ? opts.limit : Infinity;
  let expanded = false;
  const root = el('section', 'sr-next');
  root.appendChild(el('h2', 'sr-micro', T.title));
  // "Just happened" (spec 0050, internal #134): one quiet row above the list; the last seven
  // days are fetched, with their module, when it is first opened. Nothing of it is on a first visit.
  const past = el('button', 'sr-more sr-next__past', T.justHappened);
  past.type = 'button';
  past.title = T.justHappenedTitle;
  past.setAttribute('aria-expanded', 'false');
  const pastBox = el('div', 'sr-next__pastbox');
  pastBox.hidden = true;
  let pastMounted = false;
  past.addEventListener('click', () => {
    const on = past.getAttribute('aria-expanded') !== 'true';
    past.setAttribute('aria-expanded', on ? 'true' : 'false');
    pastBox.hidden = !on;
    if (on && !pastMounted) {
      pastMounted = true;
      import('./justhappened.js').then((m) => m.mountJustHappened(pastBox, ctx)).catch(() => { pastMounted = false; });
    }
  });
  root.append(past, pastBox);
  const list = el('ul', 'sr-next__list');
  const note = el('p', 'sr-next__note');
  root.appendChild(list);
  const more = el('button', 'sr-more');
  more.type = 'button';
  more.hidden = true;
  more.addEventListener('click', () => { expanded = !expanded; refresh(); });
  root.appendChild(more);
  root.appendChild(note);
  const FEEDS = ['launches', 'asteroids', 'comets'];
  let timer = null;
  let lastItems = [];

  // FROM YOUR PLACE (internal #359): two bright things within two degrees, worked out in a worker
  // the first time a place is set and the list is on screen. Lazy: nothing of it is on a first visit,
  // and nothing is fetched. Asked again when the place moves by a tenth of a degree or the day turns.
  let found = [];
  let foundKey = '';
  function askFinder(observer, now) {
    if (!observer) { found = []; foundKey = ''; return; }
    const key = `${(observer.latRad * 180 / Math.PI).toFixed(1)}:${(observer.lonRad * 180 / Math.PI).toFixed(1)}:${Math.floor(now / 864e5)}`;
    if (key === foundKey) return;
    foundKey = key;
    import('../sky/findclient.js').then((m) => m.findFromPlace({
      latDeg: observer.latRad * 180 / Math.PI,
      lonDeg: observer.lonRad * 180 / Math.PI,
      altKm: Number(observer.altKm) || 0,
    }, now)).then((rows) => {
      // An answer with no rows is an answer too: the rows of the place or the day before it go.
      if (foundKey !== key) return;
      const next = rows || [];
      if (!next.length && !found.length) return;
      found = next;
      refresh();
    }).catch(() => { /* the list is as it was: no place-made rows */ });
  }

  function loadedIds() {
    const out = new Set();
    for (const id of FEEDS) if ((ctx.recordsFor(id) || []).length) out.add(id);
    return out;
  }

  function refresh() {
    while (list.firstChild) list.removeChild(list.firstChild);
    const now = ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now();
    const observer = ctx.observer && Number.isFinite(ctx.observer.latRad) ? ctx.observer : null;
    askFinder(observer, now);
    const items = buildNextItems(ctx.records(), now, { observer, showers: SHOWERS, spaceWeather: weather, eclipses: true, fromPlace: found });
    lastItems = items;
    const shown = expanded ? items : items.slice(0, limit);
    more.hidden = items.length <= limit;
    more.textContent = expanded ? T.showFewer : t(T.showAll, { n: fmt.int(items.length) });
    more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
    for (const item of shown) {
      const li = el('li', 'sr-next__row');
      li.dataset.kind = item.kind;
      // A row that flies somewhere is a real button (it was an <li> with a role); one that only
      // tells (a shower, an eclipse) is text. Either way: a title, one line under it, and the
      // whole sentence with what its time is as the tooltip and the name a screen reader says.
      const body = item.record ? el('button', 'sr-next__body') : el('div', 'sr-next__body');
      if (item.record) {
        body.type = 'button';
        body.addEventListener('click', () => { if (typeof ctx.select === 'function') ctx.select(item.record); });
      }
      const parts = rowParts(item, now);
      const cls = classText(item);
      const full = [rowText(item, now), cls].filter(Boolean).join(COPY.punctuation.sentenceJoin);
      body.title = full;
      body.setAttribute('aria-label', full);
      if (!item.record) body.setAttribute('role', 'note');
      const head = el('span', 'sr-next__head');
      head.appendChild(el('span', 'sr-next__title', parts.title));
      if (parts.value) head.appendChild(el('span', 'sr-next__value', parts.value));
      body.appendChild(head);
      body.appendChild(el('span', 'sr-next__detail', parts.detail));
      li.appendChild(body);
      if (offersCalendar(item)) {
        // Beside the row, not inside it: a button in a button is not a thing, and the row's own
        // press still flies to the object.
        const cal = el('button', 'sr-next__cal', T.calendar);
        cal.type = 'button';
        cal.title = t(T.calendarTitle, { title: parts.title });
        cal.setAttribute('aria-label', cal.title);
        cal.addEventListener('click', (e) => { e.stopPropagation(); saveCalendar(item, now); });
        li.appendChild(cal);
      }
      list.appendChild(li);
    }
    // What the list could not look at, said only when the list is empty: under five rows it is a
    // paragraph nobody needs, and with none it is the answer. No "set where you are" either -- a dead
    // end in a list always on screen (0061's critique, item 7); the passes simply join once a place is set.
    // One line, as every empty state is (docs/ui-guide.md section 3); which feeds are missing is
    // its tooltip, and the status line at the sidebar's foot is the way to the full account.
    note.hidden = items.length > 0;
    note.textContent = items.length ? '' : T.none;
    note.title = '';
    if (!items.length) {
      const have = loadedIds();
      const missing = FEEDS.filter((id) => !have.has(id)).map((id) => {
        const layer = (ctx.layers || []).find((l) => l.id === id);
        return layer ? layer.display || id : id;
      });
      if (missing.length) note.title = t(T.notLoaded, { layers: missing.join(COPY.punctuation.listJoin) });
    }
    // The timeline's marks and the home's dated cards are this same list (ui/scrubber.js,
    // ui/today.js): they are told when it changes rather than each working it out again.
    window.dispatchEvent(new CustomEvent('sr:next'));
  }

  // NOAA's Kp, through the same source row and gate the space-weather line uses, so the list costs
  // no request that line has not already made.
  let weather = null;
  function readWeather() {
    load('swpc-kp')
      .then((r) => { weather = r && r.data != null ? parseSpaceWeather(r.data) : null; refresh(); })
      .catch(() => {});
  }

  const onLayer = () => refresh();
  const onObserver = () => refresh();
  // The day of passes is worked out in a worker (internal #562); the list is rebuilt when it arrives.
  usePassRunner((msg) => import('../sky/passclient.js').then((m) => m.runPasses(msg))); // lazy: not in the boot graph
  const offPasses = onPassesReady(() => refresh());
  window.addEventListener('sr:layer', onLayer);
  window.addEventListener('sr:observer', onObserver);
  timer = window.setInterval(refresh, 60e3);
  refresh();
  readWeather();

  return {
    root,
    refresh,
    // NOAA's Kp as last read (parseSpaceWeather), or null: the explore view's aurora line reads it
    // rather than asking the source a second time.
    weather: () => weather,
    /** The list as last built (every row, not only the ones shown), for the timeline and the home. */
    items: () => lastItems.slice(),
    destroy() {
      window.removeEventListener('sr:layer', onLayer);
      window.removeEventListener('sr:observer', onObserver);
      window.clearInterval(timer);
      offPasses();
      usePassRunner(null);
      root.remove();
    },
  };
}
