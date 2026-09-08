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
  return timeText.localDate(tMs);
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
export function buildNextItems(records, nowMs, opts = {}) {
  const horizonMs = opts.horizonMs || 30 * DAY;
  const items = [];
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
  items.sort((a, b) => a.tMs - b.tMs);
  return items.slice(0, NEXT_CAP);
}

/** One row's words. Pure. */
export function rowText(item, nowMs) {
  const T = COPY.nextList;
  const name = (item.record && item.record.name) || COPY.card.unknownName;
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
    const items = buildNextItems(ctx.records(), now, { observer });
    for (const item of items) {
      const li = el('li', 'sr-next__row', rowText(item, now));
      li.dataset.kind = item.kind;
      li.addEventListener('click', () => { if (item.record && typeof ctx.select === 'function') ctx.select(item.record); });
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

  const onLayer = () => refresh();
  const onObserver = () => refresh();
  const onMoment = (e) => setMoment(e && e.detail);
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
