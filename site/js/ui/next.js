// ui/next.js -- the Next moment's list: what is coming, and when, from records the app already holds.
//
// Contract: createNext(ctx) -> { root, refresh(), destroy() }
// Also exported, pure, so the list can be tested without a DOM or a clock:
//   buildNextItems(records, nowMs, opts) -> [{kind, record, tMs, ...}] sorted by time
//
// Spec 0026 req 6. Until now the Next door changed the layer defaults and said "What is coming, and
// when" over the same globe, and nothing on screen answered. This answers from what is loaded --
// no fetch, no new source: the launches layer's net times, the asteroid layer's close approaches,
// the comets' perihelia, and, when the visitor has a place, the bright passes over it in the next
// day. Eight rows, nearest in time first, each a tap to the record. When a layer that would feed
// the list has not loaded, the note says which, rather than the list pretending to be complete.

import { COPY, t, fmt, timeText, UNITS } from '../copy/en.js';
import { predictPasses } from '../sky/passes.js';
import { trainsFrom } from '../data/trains.js';
import { revealInColumn } from './reveal.js';
import { labelName } from './labels.js';
import { SHOWERS } from '../data/showers.js';

export const NEXT_CAP = 8;
const HOUR = 3600e3;
const DAY = 24 * HOUR;
const DEG = Math.PI / 180;

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

/**
 * The list, pure. `records` is everything loaded; `opts.observer` ({latRad, lonRad, altKm}) adds
 * passes. Kinds: launch | approach | perihelion | pass. Only future times; capped at NEXT_CAP.
 */
/** At most this many "comes over you" rows, so a pass minutes away cannot fill the list. */
export const PASS_ROWS = 3;

/**
 * Meteor-shower peaks inside the horizon, from registry/showers.yaml (via data/showers.js). A peak is
 * a calendar date that moves by about a day between years, so the row carries the date and says
 * "around", never a time. Today's peak still counts: tonight is when you would go out. Pure.
 */
export function showerItems(nowMs, horizonMs, showers) {
  const out = [];
  const today = startOfDay(nowMs);
  for (const sh of Array.isArray(showers) ? showers : []) {
    const m = /^(\d{2})-(\d{2})$/.exec(String(sh && sh.peak || ''));
    if (!m) continue;
    const year = new Date(nowMs).getFullYear();
    for (const y of [year, year + 1]) {
      const at = new Date(y, Number(m[1]) - 1, Number(m[2]), 12, 0, 0, 0).getTime(); // local noon of the date
      if (startOfDay(at) < today) continue;
      if (at - nowMs < horizonMs) out.push({ kind: 'shower', record: null, label: sh.display, tMs: at, zhr: sh.zhr, showerId: sh.id });
      break;
    }
  }
  return out;
}

export function buildNextItems(records, nowMs, opts = {}) {
  const horizonMs = opts.horizonMs || 30 * DAY;
  const items = [];
  if (opts.showers) items.push(...showerItems(nowMs, horizonMs, opts.showers));
  for (const r of Array.isArray(records) ? records : []) {
    if (!r || !r.meta) continue;
    const m = r.meta;
    if (r.layer === 'launches' && Number.isFinite(m.netMs) && m.netMs > nowMs && m.netMs - nowMs < horizonMs) {
      items.push({ kind: 'launch', record: r, tMs: m.netMs, precision: m.netPrecision || null, status: m.statusAbbrev || null });
    } else if (Number.isFinite(m.closeApproachMs) && m.closeApproachMs > nowMs && m.closeApproachMs - nowMs < horizonMs) {
      const ld = Number.isFinite(m.missDistanceLd) ? m.missDistanceLd : Number.isFinite(m.missDistanceKm) ? m.missDistanceKm / UNITS.LUNAR_DISTANCE_KM : null;
      items.push({ kind: 'approach', record: r, tMs: m.closeApproachMs, ld });
    } else if (Number.isFinite(m.perihelionMs) && m.perihelionMs > nowMs && m.perihelionMs - nowMs < horizonMs) {
      items.push({ kind: 'perihelion', record: r, tMs: m.perihelionMs });
    }
  }
  const observer = opts.observer;
  if (observer && Number.isFinite(observer.latRad) && Number.isFinite(observer.lonRad)) {
    const withOrbits = (Array.isArray(records) ? records : []).filter((r) => r && r.satrec && (r.layer === 'stations' || r.layer === 'visual'));
    if (withOrbits.length) {
      try {
        const passes = predictPasses(withOrbits, observer, nowMs, 24).filter((p) => p.visible === true);
        for (const p of passes) items.push({ kind: 'pass', record: p.record, tMs: p.startMs, peakEl: p.peakEl });
      } catch { /* a pass we could not compute is a row we do not print */ }
    }
  }
  // Trains over you (spec 0026 req 17): the lead of each train that is still climbing, as one row.
  if (observer && Number.isFinite(observer.latRad) && Number.isFinite(observer.lonRad)) {
    const trainRecords = (Array.isArray(records) ? records : []).filter((r) => r && r.satrec && r.layer === 'starlink-trains');
    for (const train of trainsFrom(trainRecords, nowMs, { stillRaisingBelowKm: opts.trainThresholdKm })) {
      if (train.stillRaising !== true || !train.lead || !train.lead.satrec) continue;
      try {
        const passes = predictPasses([train.lead], observer, nowMs, 24).filter((p) => p.visible === true);
        for (const p of passes.slice(0, 1)) items.push({ kind: 'train', record: train.lead, tMs: p.startMs, count: train.count });
      } catch { /* no row for a pass we could not compute */ }
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
  for (const kind of ['launch', 'approach', 'perihelion', 'shower']) {
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
    case 'shower':
      // A date, not a time: the peak moves by hours between years (registry/showers.yaml).
      return t(T.shower, { name, date: timeText.dateNear(item.tMs, nowMs), zhr: fmt.int(item.zhr) });
    default:
      return `${name} ${when}`;
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
    const items = buildNextItems(ctx.records(), now, { observer, showers: SHOWERS });
    for (const item of items) {
      const li = el('li', 'sr-next__row', rowText(item, now));
      li.dataset.kind = item.kind;
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

  function setMoment(moment) {
    root.hidden = moment !== 'next';
    if (!root.hidden) refresh();
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
