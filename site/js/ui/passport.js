// ui/passport.js -- the passport: where you have been, kept in this browser only (spec 0041;
// public #240, internal #119).
//
// Contract: createPassport(ctx, opts) -> { available, data(), counts(), resume(tripId),
//           stamp(tripId, total), wonderPrev(), wonderSeen(day, id), open(), forget() }
// Also exported, pure, for tests/test_passport.mjs:
//   KEY, VISITED_CAP, TRIPS_CAP, RESUME_MS
//   emptyPassport(), sanitize(raw), readPassport(storage), writePassport(storage, p),
//   forgetPassport(storage), safeStorage(win)
//   recordVisit(p, id, nowMs), recordStop(p, tripId, index, count, nowMs),
//   recordComplete(p, tripId, nowMs), continuable(p, tripId, nowMs) -> index | null
//   tripsDone(p), placesSeen(p), stampLine(p, total, nowMs), notableVisited(p, recordById, max)
//   wonderOfTheDay({events, famous, dayNumber, prev}) -> {id, kind, item} | null
//
// WHY. A visitor who finished a trip got an end card and was forgotten when the tab closed. A
// planetarium hands you a ticket stub. This is the stub: the places opened, the trips finished and
// when, and the stop a trip was left at, in ONE localStorage record. No account, no request: no
// code path here builds a URL or calls fetch, and nothing outside this file reads the key.
//
// WHAT "NO STORAGE" MEANS. A private window, a full quota, a browser with storage switched off:
// every read answers the empty passport and every write is swallowed, so the visit is a first
// visit, each time, and that is correct (req 7). The stamp is then left off the end card rather
// than counted from a memory that will not outlive the tab.
//
// CAPPED. VISITED_CAP places (the oldest dropped) and TRIPS_CAP trips: at about 30 bytes a place
// the record stays under 12 kB, a five-hundredth of what a browser gives a site.
//
// Fetched after the first visit has settled, or when a trip starts (main.js ctx.wantPassport).

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.later.js';

export const KEY = 'sr:passport';
export const VISITED_CAP = 300;
export const TRIPS_CAP = 60;
/** A trip left this long ago or less is offered again from its stop (req 4). */
export const RESUME_MS = 24 * 3600e3;
const DAY_MS = 86400e3;
/** How many of the places the view shows as links. */
const GRID_MAX = 6;
/** How long "Forget me" waits for its second press. */
const CONFIRM_MS = 6000;

export function emptyPassport() {
  return { v: 1, visited: {}, trips: {}, first: 0, last: 0, wonder: null };
}

const isObj = (x) => !!x && typeof x === 'object' && !Array.isArray(x);
const okId = (id) => typeof id === 'string' && id.length > 0 && id.length <= 80;
const okMs = (n) => Number.isFinite(n) && n > 0;

/** Anything read back, made a passport: what is not the shape it should be is dropped. Pure. */
export function sanitize(raw) {
  const p = emptyPassport();
  if (!isObj(raw) || raw.v !== 1) return p;
  if (isObj(raw.visited)) {
    for (const [id, at] of Object.entries(raw.visited)) if (okId(id) && okMs(at)) p.visited[id] = at;
  }
  if (isObj(raw.trips)) {
    for (const [id, row] of Object.entries(raw.trips)) {
      if (!okId(id) || !isObj(row)) continue;
      const out = { done: Number.isInteger(row.done) && row.done > 0 ? row.done : 0 };
      if (okMs(row.doneAt)) out.doneAt = row.doneAt;
      if (Number.isInteger(row.stop) && row.stop >= 0 && Number.isInteger(row.count) && row.count > 0 && okMs(row.at)) {
        out.stop = row.stop;
        out.count = row.count;
        out.at = row.at;
      }
      p.trips[id] = out;
    }
  }
  if (okMs(raw.first)) p.first = raw.first;
  if (okMs(raw.last)) p.last = raw.last;
  if (isObj(raw.wonder) && Number.isInteger(raw.wonder.day) && okId(raw.wonder.id)) p.wonder = { day: raw.wonder.day, id: raw.wonder.id };
  return cap(p);
}

/** The oldest places and the longest-untouched trips go first. */
function cap(p) {
  const places = Object.entries(p.visited);
  if (places.length > VISITED_CAP) {
    places.sort((a, b) => b[1] - a[1]);
    p.visited = Object.fromEntries(places.slice(0, VISITED_CAP));
  }
  const trips = Object.entries(p.trips);
  if (trips.length > TRIPS_CAP) {
    const touched = (row) => Math.max(row.doneAt || 0, row.at || 0);
    trips.sort((a, b) => touched(b[1]) - touched(a[1]));
    p.trips = Object.fromEntries(trips.slice(0, TRIPS_CAP));
  }
  return p;
}

/** The window's storage, or null where asking for it throws (a sandboxed frame, storage off). */
export function safeStorage(win) {
  try { return (win || globalThis).localStorage || null; } catch { return null; }
}

/** What is kept. No storage, a storage that throws and a record that will not parse are all empty. */
export function readPassport(storage) {
  try {
    const text = storage ? storage.getItem(KEY) : null;
    return text ? sanitize(JSON.parse(text)) : emptyPassport();
  } catch {
    return emptyPassport();
  }
}

/** Keep it. Answers whether it was kept: a write that throws is swallowed. */
export function writePassport(storage, p) {
  try {
    if (!storage) return false;
    storage.setItem(KEY, JSON.stringify(cap(p)));
    return true;
  } catch {
    return false;
  }
}

export function forgetPassport(storage) {
  try { if (storage) storage.removeItem(KEY); return !!storage; } catch { return false; }
}

function touch(p, nowMs) {
  if (!p.first) p.first = nowMs;
  p.last = nowMs;
  return p;
}

/** A place was opened. The first time is the one kept. */
export function recordVisit(p, id, nowMs) {
  if (!okId(id) || !okMs(nowMs)) return p;
  if (!p.visited[id]) p.visited[id] = nowMs;
  return cap(touch(p, nowMs));
}

/** A trip reached a stop (`index` from 0): the trip is under way, and this is where. */
export function recordStop(p, tripId, index, count, nowMs) {
  if (!okId(tripId) || !Number.isInteger(index) || index < 0 || !Number.isInteger(count) || count <= 0 || !okMs(nowMs)) return p;
  const row = p.trips[tripId] || { done: 0 };
  p.trips[tripId] = { ...row, stop: Math.min(index, count - 1), count, at: nowMs };
  return cap(touch(p, nowMs));
}

/** A trip reached its end card: once per run, however many times the card is drawn. */
export function recordComplete(p, tripId, nowMs) {
  if (!okId(tripId) || !okMs(nowMs)) return p;
  const row = p.trips[tripId] || { done: 0 };
  const underWay = Number.isInteger(row.stop);
  if (!underWay && row.done > 0) return p;
  p.trips[tripId] = { done: row.done + 1, doneAt: nowMs };
  return cap(touch(p, nowMs));
}

/**
 * The stop a trip can be picked up from, or null: it was left under way, past its first stop
 * (stop 1 is where Start goes anyway), no more than RESUME_MS ago. Pure.
 */
export function continuable(p, tripId, nowMs) {
  const row = p && p.trips ? p.trips[tripId] : null;
  if (!row || !Number.isInteger(row.stop) || row.stop < 1) return null;
  const age = nowMs - row.at;
  if (!(age >= 0 && age <= RESUME_MS)) return null;
  return row.stop;
}

export const tripsDone = (p) => Object.values(p.trips).filter((row) => row.done > 0).length;
export const placesSeen = (p) => Object.keys(p.visited).length;

/**
 * "Trip 7 of 25 · 7 October 2026": how many different trips are finished, and today. The date is
 * the visitor's own day, not UTC's: a stamp dated yesterday at one in the morning reads as a bug.
 */
export function stampLine(p, total, nowMs) {
  const n = tripsDone(p);
  if (!n || !Number.isFinite(total) || total < n) return '';
  return t(COPY.passport.stamp, { n: fmt.int(n), total: fmt.int(total), date: timeText.longDate(nowMs) });
}

/** Which kinds of place lead the grid: a world before a station before a far thing before a dot. */
const NOTABLE = { world: 6, station: 5, exotic: 4, star: 4, dso: 4, probe: 4, telescope: 4, comet: 3, asteroid: 3, exoplanet: 3, site: 2 };

/** The visited places the map still holds, the most notable first, then the newest. Pure. */
export function notableVisited(p, recordById, max = GRID_MAX) {
  const rows = [];
  for (const [id, at] of Object.entries(p.visited)) {
    const record = typeof recordById === 'function' ? recordById(id) : null;
    if (record && record.name) rows.push({ record, at, rank: NOTABLE[record.klass] || 1 });
  }
  rows.sort((a, b) => (b.rank - a.rank) || (b.at - a.at));
  return rows.slice(0, max).map((r) => r.record);
}

/**
 * The wonder of the day. Pure.
 *
 * `events` are what is coming inside 30 days, the most prominent first (the caller ranks them);
 * `famous` is a fixed list of things worth a look, in a fixed order; `dayNumber` counts UTC days;
 * `prev` is `{day, id}` of the last one this visitor was shown, or null.
 *
 * The first event, else the famous thing whose turn the day is (index = dayNumber modulo the
 * count: the same for everyone, a new one each day). NEVER THE SAME TWO DAYS RUNNING: what was
 * shown on an earlier day is passed over, so an eclipse three weeks off is the wonder once and the
 * list's the day after. Shown again today it is the same one (a reload does not reshuffle).
 */
export function wonderOfTheDay({ events = [], famous = [], dayNumber, prev = null } = {}) {
  if (!Number.isInteger(dayNumber)) return null;
  const ev = events.filter((e) => e && okId(e.id));
  const fam = famous.filter((f) => f && okId(f.id));
  const all = [...ev.map((item) => ({ id: item.id, kind: 'event', item })), ...fam.map((item) => ({ id: item.id, kind: 'object', item }))];
  if (prev && prev.day === dayNumber) {
    const same = all.find((c) => c.id === prev.id);
    if (same) return same;
  }
  const stale = prev && prev.day !== dayNumber ? prev.id : null;
  const event = ev.find((e) => e.id !== stale);
  if (event) return { id: event.id, kind: 'event', item: event };
  if (!fam.length) return null;
  const n = fam.length;
  let i = ((dayNumber % n) + n) % n;
  if (fam[i].id === stale && n > 1) i = (i + 1) % n;
  return { id: fam[i].id, kind: 'object', item: fam[i] };
}

// ---------------------------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------------------------

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function createPassport(ctx, opts = {}) {
  const P = COPY.passport;
  const storage = opts.storage !== undefined ? opts.storage : safeStorage(typeof window !== 'undefined' ? window : null);
  const now = typeof opts.now === 'function' ? opts.now : () => Date.now();
  let p = readPassport(storage);
  // Is anything kept at all? Asked once, with the record itself: a storage that takes no write is
  // a first visit every time, and the view says so.
  let available = writePassport(storage, p);
  const trip = ctx && ctx.trip;
  const tours = () => (trip && typeof trip.tours === 'function' ? trip.tours() : []);

  const changed = () => {
    available = writePassport(storage, p);
    if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sr:passport'));
    paintOpen();
    if (viewBuilt) render();
  };

  // --- the writers: a place opened, a stop reached, an end card ----------------------------------
  const onSelect = (e) => {
    const rec = e && e.detail;
    if (!rec || !okId(rec.id) || p.visited[rec.id]) return;
    p = recordVisit(p, rec.id, now());
    changed();
  };
  let lastStop = '';
  const onTrip = (st) => {
    if (!st || !st.tourId) return;
    if (st.phase === 'outro') {
      const before = p.trips[st.tourId];
      if (before && !Number.isInteger(before.stop) && before.done > 0) return;
      p = recordComplete(p, st.tourId, now());
      lastStop = '';
      changed();
      return;
    }
    if (st.phase === 'idle' || st.phase === 'intro' || st.phase === 'resolving' || !(st.index >= 0) || !(st.count > 0)) return;
    const key = `${st.tourId}:${st.index}`;
    if (key === lastStop) return;
    lastStop = key;
    p = recordStop(p, st.tourId, st.index, st.count, now());
    changed();
  };
  if (typeof window !== 'undefined') window.addEventListener('sr:select', onSelect);
  const offTrip = trip && typeof trip.onChange === 'function' ? trip.onChange(onTrip) : null;

  // --- the way in: one quiet row at the foot of the home -----------------------------------------
  const pane = typeof document !== 'undefined' ? document.getElementById('sr-pane-earth') : null;
  const openBtn = el('button', 'sr-passport-open');
  openBtn.type = 'button';
  const openName = el('span', 'sr-passport-open__name', P.title);
  const openValue = el('span', 'sr-passport-open__value');
  openBtn.append(openName, openValue);
  openBtn.title = P.openTitle;
  openBtn.addEventListener('click', () => open());
  // In a section of its own, for the pane's side padding.
  const openSect = el('section', 'sr-sect sr-passport-sect');
  openSect.appendChild(openBtn);
  if (pane) pane.appendChild(openSect);

  const counts = () => ({ places: placesSeen(p), trips: tripsDone(p), total: tours().length });
  const placesText = (n) => t(n === 1 ? P.placeOne : P.places, { n: fmt.int(n) });
  function paintOpen() {
    const c = counts();
    openValue.textContent = c.places || c.trips ? t(P.summary, { places: placesText(c.places), n: fmt.int(c.trips), total: fmt.int(c.total) }) : '';
  }

  // --- the view ----------------------------------------------------------------------------------
  let viewBuilt = false;
  let confirmTimer = null;
  let confirming = false;
  let forgotten = false;
  const host = () => (ctx && ctx.shell && typeof ctx.shell.host === 'function' ? ctx.shell.host('passport') : null);

  function selectRecord(record) {
    if (!record || typeof ctx.select !== 'function') return;
    if (record.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(record.layer) && typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn(record.layer, true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: record.layer, on: true, handled: true, from: 'passport' } }));
    }
    ctx.select(record);
  }

  function render() {
    const h = host();
    if (!h) return;
    viewBuilt = true;
    h.textContent = '';
    const page = el('div', 'sr-passport');
    const title = el('h2', 'sr-passport__title', P.title);
    title.tabIndex = -1;
    page.appendChild(title);
    // Said once, here: what this is and where it lives.
    page.appendChild(el('p', 'sr-passport__note', available ? P.kept : P.notKept));
    const c = counts();

    const places = el('section', 'sr-passport__sect');
    const placesHead = el('div', 'sr-passport__head');
    placesHead.appendChild(el('h3', 'sr-micro', P.placesTitle));
    placesHead.appendChild(el('span', 'sr-passport__num', fmt.int(c.places)));
    places.appendChild(placesHead);
    const notable = notableVisited(p, ctx.recordById);
    if (notable.length) {
      const grid = el('ul', 'sr-passport__grid');
      for (const record of notable) {
        const li = el('li');
        const b = el('button', 'sr-passport__place', record.name);
        b.type = 'button';
        b.title = t(P.placeTitle, { name: record.name });
        b.addEventListener('click', () => selectRecord(record));
        li.appendChild(b);
        grid.appendChild(li);
      }
      places.appendChild(grid);
    } else {
      places.appendChild(el('p', 'sr-passport__empty', P.noPlaces));
    }
    page.appendChild(places);

    const trips = el('section', 'sr-passport__sect');
    const tripsHead = el('div', 'sr-passport__head');
    tripsHead.appendChild(el('h3', 'sr-micro', P.tripsTitle));
    tripsHead.appendChild(el('span', 'sr-passport__num', t(P.outOf, { n: fmt.int(c.trips), total: fmt.int(c.total) })));
    trips.appendChild(tripsHead);
    const bar = el('div', 'sr-passport__bar');
    bar.setAttribute('role', 'progressbar');
    bar.setAttribute('aria-valuemin', '0');
    bar.setAttribute('aria-valuemax', String(c.total));
    bar.setAttribute('aria-valuenow', String(c.trips));
    bar.setAttribute('aria-label', t(P.barLabel, { n: fmt.int(c.trips), total: fmt.int(c.total) }));
    const fill = el('span', 'sr-passport__fill');
    fill.style.width = `${c.total ? Math.round((c.trips / c.total) * 100) : 0}%`;
    bar.appendChild(fill);
    trips.appendChild(bar);
    const done = Object.entries(p.trips).filter(([, row]) => row.done > 0 && row.doneAt).sort((a, b) => b[1].doneAt - a[1].doneAt);
    if (done.length) {
      const list = el('ul', 'sr-list sr-list--quiet');
      for (const [id, row] of done) {
        const tour = tours().find((x) => x.id === id);
        if (!tour) continue;
        const li = el('li', 'sr-list__row sr-list__static');
        li.appendChild(el('span', 'sr-list__name', tour.title));
        li.appendChild(el('span', 'sr-list__value', timeText.localDate(row.doneAt)));
        list.appendChild(li);
      }
      trips.appendChild(list);
    } else {
      trips.appendChild(el('p', 'sr-passport__empty', P.noTrips));
    }
    page.appendChild(trips);

    const forget = el('button', 'sr-passport__forget', confirming ? P.forgetConfirm : P.forget);
    forget.type = 'button';
    forget.title = P.forgetTitle;
    forget.disabled = !c.places && !Object.keys(p.trips).length;
    forget.addEventListener('click', () => {
      if (!confirming) {
        // One step: the same button asks, and goes back to what it was if nobody answers.
        confirming = true;
        forget.textContent = P.forgetConfirm;
        clearTimeout(confirmTimer);
        confirmTimer = setTimeout(() => { confirming = false; if (forget.isConnected) forget.textContent = P.forget; }, CONFIRM_MS);
        return;
      }
      api.forget();
      const again = host() && host().querySelector('.sr-passport__title');
      if (again) again.focus({ preventScroll: true });
    });
    page.appendChild(forget);
    const said = el('p', 'sr-passport__said');
    said.setAttribute('role', 'status');
    said.textContent = forgotten ? P.forgotten : '';
    page.appendChild(said);
    h.appendChild(page);
  }
  function open() {
    if (!ctx || !ctx.shell) return;
    forgotten = false;
    confirming = false;
    render();
    ctx.shell.show('passport');
    const title = host() && host().querySelector('.sr-passport__title');
    if (title) title.focus({ preventScroll: true });
  }

  const api = {
    get available() { return available; },
    data: () => p,
    counts,
    /** The stop a trip's card offers to go on from: `{index, text}`, or null. */
    resume(tripId) {
      if (!available) return null;
      const index = continuable(p, tripId, now());
      return index === null ? null : { index, text: t(P.resume, { n: fmt.int(index + 1) }) };
    },
    /** The end card's stamp; it makes sure this run is counted first. Empty with nothing kept. */
    stamp(tripId, total) {
      if (!available) return '';
      onTrip({ tourId: tripId, phase: 'outro' });
      return stampLine(p, Number.isFinite(total) ? total : tours().length, now());
    },
    wonderPrev: () => p.wonder,
    wonderSeen(day, id) {
      if (!Number.isInteger(day) || !okId(id) || (p.wonder && p.wonder.day === day && p.wonder.id === id)) return;
      p.wonder = { day, id };
      available = writePassport(storage, p);
    },
    open,
    forget() {
      clearTimeout(confirmTimer);
      confirming = false;
      forgetPassport(storage);
      p = emptyPassport();
      lastStop = '';
      forgotten = true;
      if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sr:passport'));
      paintOpen();
      if (viewBuilt) render();
    },
    destroy() {
      if (typeof window !== 'undefined') window.removeEventListener('sr:select', onSelect);
      if (typeof offTrip === 'function') offTrip();
      openSect.remove();
    },
  };
  // What is already open, and a trip already under way, when this arrives.
  if (ctx && typeof ctx.selected === 'function') onSelect({ detail: ctx.selected() });
  if (trip && trip.state) onTrip(trip.state);
  paintOpen();
  if (typeof window !== 'undefined') {
    window.addEventListener('sr:trips-loaded', paintOpen);
    // The resume lines are on the cards from the moment this is here.
    window.dispatchEvent(new CustomEvent('sr:passport'));
  }
  if (ctx) ctx.passport = api;
  return api;
}

/** The UTC day a moment falls on, counted from 1970: the wonder's clock. */
export const dayNumberOf = (nowMs) => Math.floor(nowMs / DAY_MS);
