// ui/cardextras.js -- the card's newer blocks, as DOM: the distance that ticks (internal #295),
// the six-year distance curve (#296), who is aboard a station and what is docked (#133), and the
// links out (#136). The numbers and words come from ui/cardlive.js and data/crew.js, which are
// pure and tested; this file only builds nodes. ui/cards.js imports it, so it is never on a first
// visit (ui/cardgate.js), and the two Launch Library copies are read when a station's card opens.

import { COPY, t, fmt, timeText, ageInWords } from '../copy/en.js';
import '../copy/en.later.js';
import { load } from '../data/sources.js';
import { altitudeInWords, azimuthInWords } from '../sky/skywords.js';
import { riseHighestSetOf } from '../sky/riseany.js';
import { LINKS } from '../data/links.js';
import { stationCrew, STATION_RECORD, CREW_STALE_MS, daysBetween } from '../data/crew.js';
import {
  liveDistanceWords, liveKey, distanceSamples, closestApproach, sparkGeometry, closestWords, shortUtcDate,
  SPARK_SPAN_MS, SPARK_MIN_SAMPLES,
} from './cardlive.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const SPARK_W = 320;
const SPARK_H = 56;
const DAY_MS = 864e5;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null) node.textContent = text;
  return node;
}

function block(className, label) {
  const wrap = el('section', `sr-card__block ${className}`);
  wrap.appendChild(el('h3', 'sr-card__label', label));
  return wrap;
}

// --- the distance that ticks ----------------------------------------------------------------

/** "From Earth now": kilometres to the last one, and light's travel time to the second. */
// --- a reason to come back (public #395): "Remind me" and "Seen it" ------------------------------

/** Kinds of thing a person can go outside and see, with their eyes or a small telescope. */
const SEEABLE = new Set(['satellite', 'station', 'telescope', 'rocket', 'debris', 'world', 'star', 'dso', 'comet', 'asteroid']);
export function offersSeen(record) {
  return !!record && typeof record.id === 'string' && SEEABLE.has(record.klass) && record.id !== 'earth';
}

/** The next dated row of Coming up that is about this record and can be a calendar entry, or null. Pure. */
export function nextEventFor(record, items, nowMs) {
  if (!record || !Array.isArray(items)) return null;
  return items
    .filter((it) => it && it.record && it.record.id === record.id && Number.isFinite(it.tMs) && it.tMs > nowMs && !(it.kind === 'aurora' && it.now))
    .sort((a, b) => a.tMs - b.tMs)[0] || null;
}

/**
 * The card's two quiet buttons, or nothing. "Remind me" is the Coming up row's own calendar file
 * (ui/next.js saveCalendar, data/ics.js: built in the browser, with its reminder inside, sent
 * nowhere). "Seen it" is a tick in the passport (ui/passport.js): the visitor's word and the day.
 */
export function skyControls(record, ctx) {
  const P = COPY.passport;
  const row = el('div', 'sr-card__sky');
  const next = ctx && ctx.explore && ctx.explore.next;
  const nowMs = ctx && ctx.clock && typeof ctx.clock.now === 'function' && ctx.clock.mode === 'live' ? ctx.clock.now() : Date.now();
  let item = null;
  try { item = nextEventFor(record, next && typeof next.items === 'function' ? next.items() : [], nowMs); } catch { item = null; }
  if (item) {
    const b = el('button', 'sr-btn sr-btn--quiet sr-card__inline', P.remind);
    b.type = 'button';
    b.setAttribute('data-action', 'remind');
    import('./next.js').then((m) => {
      const title = m.rowParts(item, nowMs).title;
      b.title = t(P.remindTitle, { title });
      b.addEventListener('click', () => m.saveCalendar(item, nowMs));
    }).catch(() => { b.remove(); });
    row.appendChild(b);
  }
  if (offersSeen(record) && ctx && typeof ctx.wantPassport === 'function') {
    const b = el('button', 'sr-btn sr-btn--quiet sr-card__inline', P.seenIt);
    b.type = 'button';
    b.setAttribute('data-action', 'seen');
    b.setAttribute('aria-pressed', 'false');
    b.title = P.seenTitleOff;
    const paint = (api) => {
      const at = api ? api.seenAt(record.id) : 0;
      b.setAttribute('aria-pressed', at ? 'true' : 'false');
      b.textContent = at ? t(P.seenOn, { date: timeText.localDate(at) }) : P.seenIt;
      b.title = api && !api.available ? P.seenNotKept : at ? P.seenTitleOn : P.seenTitleOff;
    };
    Promise.resolve(ctx.wantPassport()).then((api) => {
      if (!api || typeof api.markSeen !== 'function') { b.remove(); return; }
      paint(api);
      b.addEventListener('click', () => { api.markSeen(record.id, !api.seenAt(record.id)); paint(api); });
    }).catch(() => { b.remove(); });
    row.appendChild(b);
  }
  return row.childElementCount ? [row] : [];
}

export function liveBlock(distAt, tMs, still) {
  if (typeof distAt !== 'function' || !Number.isFinite(tMs)) return null;
  const words = liveDistanceWords(distAt(liveKey(tMs, still)));
  if (!words) return null;
  const L = COPY.live;
  const wrap = block('sr-live', L.label);
  const km = el('p', 'sr-live__row');
  const num = el('span', 'sr-live__num', words.km);
  num.dataset.live = 'km';
  km.append(num, el('span', 'sr-live__unit', L.km));
  const light = el('p', 'sr-live__row');
  const time = el('span', 'sr-live__num', words.light);
  time.dataset.live = 'light';
  light.append(el('span', 'sr-live__unit', L.light), time);
  wrap.append(km, light, el('p', 'sr-card__aboardnote', L.note));
  return wrap;
}

/** Rewrite the two numbers in place: text only, and only when it changed. */
export function paintLive(root, distAt, tMs, still) {
  if (!root || typeof distAt !== 'function') return;
  const words = liveDistanceWords(distAt(liveKey(tMs, still)));
  if (!words) return;
  for (const key of ['km', 'light']) {
    const node = root.querySelector(`[data-live="${key}"]`);
    if (node && node.textContent !== words[key]) node.textContent = words[key];
  }
}

// --- the six-year curve -----------------------------------------------------------------------

let sparkKept = null; // { id, centre, samples, min }

function sparkData(record, distAt, tMs) {
  const id = String(record.id);
  if (sparkKept && sparkKept.id === id && Math.abs(tMs - sparkKept.centre) < 30 * DAY_MS) return sparkKept;
  const samples = distanceSamples(distAt, tMs - SPARK_SPAN_MS, tMs + SPARK_SPAN_MS);
  sparkKept = { id, centre: tMs, samples, min: closestApproach(distAt, samples) };
  return sparkKept;
}

/**
 * Distance from the Earth over three years either side of the clock, the closest approach marked
 * and named on a button that sets the clock there. `approxAt(min)` says whether the path is the
 * two-body one that leaves the Earth's pull out that close (ui/cards.js nearEarthOnEllipse).
 */
export function sparkBlock(record, distAt, tMs, ctx, approxAt) {
  if (typeof distAt !== 'function' || !Number.isFinite(tMs)) return null;
  const data = sparkData(record, distAt, tMs);
  if (data.samples.length < SPARK_MIN_SAMPLES || !data.min) return null;
  const g = sparkGeometry(data.samples, tMs, data.min, SPARK_W, SPARK_H);
  if (!g) return null;
  const L = COPY.live;
  let approx = false;
  try { approx = typeof approxAt === 'function' && approxAt(data.min) === true; } catch { approx = false; }
  const closest = closestWords(data.min, approx);
  const year = (ms) => String(new Date(ms).getUTCFullYear());
  const wrap = block('sr-spark', L.sparkLabel);
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', `0 0 ${SPARK_W} ${SPARK_H}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  svg.setAttribute('class', 'sr-spark__svg');
  svg.setAttribute('role', 'img');
  svg.setAttribute('aria-label', t(L.sparkAria, { from: year(g.t0), to: year(g.t1), closest }));
  const line = (x1, y1, x2, y2, cls) => {
    const n = document.createElementNS(SVG_NS, 'line');
    n.setAttribute('x1', x1); n.setAttribute('y1', y1); n.setAttribute('x2', x2); n.setAttribute('y2', y2);
    n.setAttribute('class', cls);
    n.setAttribute('vector-effect', 'non-scaling-stroke');
    svg.appendChild(n);
  };
  line(0, SPARK_H - 1, SPARK_W, SPARK_H - 1, 'sr-spark__base');
  if (g.nowX !== null) line(g.nowX, 0, g.nowX, SPARK_H, 'sr-spark__now');
  if (g.minX !== null) line(g.minX, g.tickY, g.minX, SPARK_H - 1, 'sr-spark__min');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', g.path);
  path.setAttribute('class', 'sr-spark__path');
  path.setAttribute('vector-effect', 'non-scaling-stroke');
  svg.appendChild(path);
  wrap.appendChild(svg);
  const axis = el('div', 'sr-light__axis');
  axis.append(el('span', '', year(g.t0)), el('span', '', L.sparkNow), el('span', '', year(g.t1)));
  wrap.appendChild(axis);
  const go = el('button', 'sr-btn sr-btn--quiet sr-card__inline sr-spark__go', closest);
  go.type = 'button';
  go.title = L.closestTitle;
  go.dataset.focus = 'spark-closest';
  go.disabled = !(ctx && ctx.clock && typeof ctx.clock.goTo === 'function');
  go.addEventListener('click', () => { try { ctx.clock.goTo(data.min.tMs); } catch { /* the clock stays */ } });
  wrap.appendChild(go);
  wrap.appendChild(el('p', 'sr-card__aboardnote', approx ? L.sparkApprox : L.sparkNote));
  return wrap;
}

// --- who is aboard, and what is docked --------------------------------------------------------

const crewState = { asked: null, done: false, stations: null, astronauts: null, fetchedAt: null };

export function hasCrewSource(record) {
  return !!record && Object.values(STATION_RECORD).includes(record.id);
}

function askCrew(onLanded) {
  if (crewState.asked) return;
  crewState.asked = Promise.all([load('ll2-stations', { await: true }), load('ll2-astronauts', { await: true })])
    .then(([st, as]) => {
      crewState.stations = st && st.ok && st.data ? st.data : null;
      crewState.astronauts = as && as.ok && as.data ? as.data : null;
      // The older of the two reads is the list's age: the join is only as fresh as its staler half.
      const times = [st, as].map((r) => (r && Number.isFinite(r.fetchedAt) ? r.fetchedAt : null)).filter((v) => v !== null);
      crewState.fetchedAt = crewState.stations && times.length ? Math.min(...times) : null;
    })
    .catch(() => { /* no list: the card says so */ })
    .then(() => { crewState.done = true; if (typeof onLanded === 'function') onLanded(); });
}

/**
 * The rows a station's card prints, as words. Pure: exported for tests/test_cardlive.mjs.
 * Days up are counted to the moment the list was read, the moment it is true of.
 */
export function crewRows(crew, fetchedAtMs, wallMs) {
  if (!crew) return null;
  const C = COPY.crew;
  const n = crew.crewCount;
  const people = (crew.people || []).map((p) => {
    const days = daysBetween(p.launchMs, fetchedAtMs);
    const v = { agency: p.agency, days: days === null ? '' : fmt.int(days) };
    return [p.name, days === null ? p.agency : t(p.agency ? C.person : C.personNoAgency, v)];
  });
  const docked = crew.docked.map((d) => [d.vehicle, t(C.docked, { port: d.port, date: d.dockedMs !== null ? shortUtcDate(d.dockedMs) : '' })]);
  const age = Number.isFinite(fetchedAtMs) && Number.isFinite(wallMs) ? wallMs - fetchedAtMs : null;
  const stale = age !== null && age > CREW_STALE_MS;
  return {
    count: n === null ? '' : n === 1 ? C.countOne : t(C.count, { n: fmt.int(n) }),
    hint: n === null ? '' : t(C.hint, { n: fmt.int(n) }),
    people,
    docked,
    unmatched: n !== null && n > 0 && !crew.matched,
    stale,
    asOf: age === null ? '' : stale ? t(C.stale, { date: timeText.utcLong(fetchedAtMs) }) : t(C.asOf, { age: ageInWords(age) }),
  };
}

/**
 * The station's people and vehicles: { node, hint } for the card's "Who is aboard" row, or null
 * for a record that is not one of the stations Launch Library follows. Before the two copies are
 * here it is one line saying so; `onLanded` repaints the card when they arrive.
 */
export function crewBlock(record, rowsList, onLanded) {
  if (!hasCrewSource(record)) return null;
  const C = COPY.crew;
  const wrap = el('div', 'sr-crew');
  if (!crewState.done) {
    askCrew(onLanded);
    wrap.appendChild(el('p', 'sr-card__aboardnote', C.waiting));
    return { node: wrap, hint: null };
  }
  const rows = crewRows(stationCrew(record.id, crewState.stations, crewState.astronauts), crewState.fetchedAt, Date.now());
  if (!rows) {
    wrap.appendChild(el('p', 'sr-card__aboardnote', C.none));
    return { node: wrap, hint: null };
  }
  if (rows.count) {
    const people = block('sr-crew__people', C.label);
    people.appendChild(el('p', 'sr-card__sentence', rows.count));
    if (rows.people.length) people.appendChild(rowsList(rows.people));
    people.appendChild(el('p', 'sr-card__aboardnote', rows.unmatched ? C.unmatched : C.joined));
    wrap.appendChild(people);
  }
  if (rows.docked.length) {
    const docked = block('sr-crew__docked', C.dockedLabel);
    docked.appendChild(rowsList(rows.docked));
    wrap.appendChild(docked);
  }
  if (rows.asOf) wrap.appendChild(el('p', `sr-card__aboardnote${rows.stale ? ' is-stale' : ''}`, rows.asOf));
  return { node: wrap, hint: rows.hint || null };
}

// --- links out ---------------------------------------------------------------------------------

/** The links out for this record: plain anchors to the publisher's own page, publisher named. */
export function linkNodes(record) {
  const rows = record && Object.prototype.hasOwnProperty.call(LINKS, record.id) ? LINKS[record.id] : [];
  return rows.map((r) => {
    const a = el('a', 'sr-card__page sr-card__out', t(COPY.links.row, { words: r.words, publisher: r.publisher }));
    a.href = r.url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.title = t(COPY.links.title, { publisher: r.publisher });
    a.dataset.link = r.id;
    return a;
  });
}

// --- rises, highest and sets for a comet or an asteroid (internal #299) -------------------------

/**
 * The sentence for a rise-highest-set answer (sky/riseany.js or sky/riseset.js: the same shape):
 * "From London: rises 09:46 in the east, highest 14:42, about two fists above the horizon; sets
 * 19:38 in the west." Pure; null when there is nothing to say.
 */
export function fromPlaceWords(r, placeName) {
  if (!r) return null;
  // The planets' own sentences (public #500, ui/cards.js worldFromLine): one table for both.
  const W = COPY.sky.worldFrom;
  const v = {
    place: placeName || COPY.sky.worldHere,
    alt: altitudeInWords(r.altDeg), dir: azimuthInWords(r.azDeg),
    rise: r.riseMs !== null ? timeText.hhmm(r.riseMs) : '', riseDir: r.riseAzDeg !== null ? azimuthInWords(r.riseAzDeg) : '',
    highTime: r.highMs !== null ? timeText.hhmm(r.highMs) : '', highAlt: r.highAltDeg !== null ? altitudeInWords(r.highAltDeg) : '',
    set: r.setMs !== null ? timeText.hhmm(r.setMs) : '', setDir: r.setAzDeg !== null ? azimuthInWords(r.setAzDeg) : '',
  };
  if (r.never) return t(W.never, v);
  if (r.upNow) return t(r.always ? W.always : r.highMs !== null ? W.up : W.upPast, v);
  if (r.highMs === null) return null;
  return t(r.setMs !== null ? W.down : W.downNoSet, v);
}

/**
 * A small body's line from the visitor's place, with what it is worked out from. `eqjAt(ms)` is
 * its direction from the Earth in equatorial J2000 axes (ui/cards.js builds it from the same
 * propagation the card's distance uses). Null without a place.
 */
export function smallBodyFromLine(eqjAt, observer, tMs) {
  const o = observer;
  if (!o || typeof eqjAt !== 'function') return null;
  const latDeg = Number.isFinite(o.latDeg) ? o.latDeg : Number.isFinite(o.latRad) ? o.latRad * 180 / Math.PI : NaN;
  const lonDeg = Number.isFinite(o.lonDeg) ? o.lonDeg : Number.isFinite(o.lonRad) ? o.lonRad * 180 / Math.PI : NaN;
  const words = fromPlaceWords(riseHighestSetOf(eqjAt, { latDeg, lonDeg, altKm: o.altKm }, tMs), typeof o.name === 'string' ? o.name : '');
  return words ? `${words} ${COPY.live.smallBodyHonest}` : null;
}
