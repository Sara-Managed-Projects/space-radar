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
import * as Astronomy from '../../vendor/astronomy.js';
import { kpWords } from './spaceweather.js';
import { load } from '../data/sources.js';
import { parseSpaceWeather } from '../data/parsers.js';

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
/**
 * How much of the Moon is lit on the night of `dayMs` (at local 23:00), 0..1, or null. The line
 * registry/events.yaml asks a shower's card for is never the rate but the sky: a full Moon washes out
 * all but the brightest meteors, and it is the same fraction wherever the visitor stands.
 */
export function moonLitThatNight(dayMs) {
  try {
    const d = new Date(dayMs);
    d.setHours(23, 0, 0, 0);
    const f = Astronomy.Illumination(Astronomy.Body.Moon, d).phase_fraction;
    return Number.isFinite(f) ? f : null;
  } catch { return null; }
}

/**
 * Where a shower's radiant is on its peak night, for a place: the highest it gets between 20:00 and
 * 06:00 local, and the hour it gets there. Meteors appear only while the radiant is up, and more of
 * them the higher it is -- which is why a southern shower is a poor show from the north. Pure given
 * the place; null without one.
 */
export function radiantThatNight(shower, dayMs, observer) {
  if (!shower || !observer || !Number.isFinite(observer.latRad) || !Number.isFinite(observer.lonRad)) return null;
  const dec = Number(shower.dec) * DEG, ra = Number(shower.ra_h) * 15 * DEG;
  if (!Number.isFinite(dec) || !Number.isFinite(ra)) return null;
  let best = null;
  const start = new Date(dayMs); start.setHours(20, 0, 0, 0);
  for (let h = 0; h <= 10 * 4; h++) { // every quarter hour, 20:00 to 06:00
    const tMs = start.getTime() + h * 15 * 60e3;
    let lst;
    try { lst = Astronomy.SiderealTime(new Date(tMs)) * 15 * DEG + observer.lonRad; } catch { return null; }
    const ha = lst - ra;
    const alt = Math.asin(Math.sin(observer.latRad) * Math.sin(dec) + Math.cos(observer.latRad) * Math.cos(dec) * Math.cos(ha)) / DEG;
    if (!best || alt > best.altDeg) best = { altDeg: alt, tMs };
  }
  return best;
}

export function showerItems(nowMs, horizonMs, showers, observer = null) {
  const out = [];
  const today = startOfDay(nowMs);
  for (const sh of Array.isArray(showers) ? showers : []) {
    const m = /^(\d{2})-(\d{2})$/.exec(String(sh && sh.peak || ''));
    if (!m) continue;
    const year = new Date(nowMs).getFullYear();
    for (const y of [year, year + 1]) {
      const at = new Date(y, Number(m[1]) - 1, Number(m[2]), 12, 0, 0, 0).getTime(); // local noon of the date
      if (startOfDay(at) < today) continue;
      if (at - nowMs < horizonMs) out.push({ kind: 'shower', record: null, label: sh.display, tMs: at, zhr: sh.zhr, showerId: sh.id, moonLit: moonLitThatNight(at), radiant: radiantThatNight(sh, at, observer) });
      break;
    }
  }
  return out;
}

/**
 * A geomagnetic storm, from NOAA's planetary Kp (the swpc-kp feed the space-weather line reads):
 * the storm under way now if the latest measured bin is Kp 5 or more, else the strongest forecast
 * bin of Kp 5 or more still ahead. One row, never three: NOAA forecasts in three-hour bins and a
 * storm spans several. registry/events.yaml's `aurora` event, which had no row anywhere. Pure.
 */
export function auroraItem(parsed, nowMs, horizonMs = 3 * DAY) {
  const rows = parsed && Array.isArray(parsed.forecast) ? parsed.forecast : [];
  const isMeasured = (r) => r.observed === 'observed' || r.observed === 'estimated';
  const measured = rows.filter(isMeasured);
  const latest = measured[measured.length - 1];
  if (latest && latest.kp >= 5 && nowMs - latest.tMs < 6 * HOUR) {
    return { kind: 'aurora', record: null, tMs: nowMs, kp: latest.kp, now: true };
  }
  let best = null;
  for (const r of rows) {
    if (isMeasured(r) || !(r.kp >= 5)) continue;
    if (r.tMs + 3 * HOUR <= nowMs || r.tMs - nowMs > horizonMs) continue;
    if (!best || r.kp > best.kp) best = r;
  }
  return best ? { kind: 'aurora', record: null, tMs: Math.max(best.tMs, nowMs), kp: best.kp, now: false } : null;
}

export function buildNextItems(records, nowMs, opts = {}) {
  const horizonMs = opts.horizonMs || 30 * DAY;
  const items = [];
  if (opts.spaceWeather) { const a = auroraItem(opts.spaceWeather, nowMs); if (a) items.push(a); }
  if (opts.showers) items.push(...showerItems(nowMs, horizonMs, opts.showers, opts.observer || null));
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
  for (const kind of ['aurora', 'launch', 'approach', 'perihelion', 'shower']) {
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
    const items = buildNextItems(ctx.records(), now, { observer, showers: SHOWERS, spaceWeather: weather });
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
