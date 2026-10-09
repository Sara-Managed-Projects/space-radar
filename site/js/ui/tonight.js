// ui/tonight.js -- the Tonight view: the next thing you can see from roughly where you are
// (spec 0051 req 2, 4-9, 11).
//
// Contract: renderTonight(host, ctx) -> { root, destroy(), refresh(), passes(), state() }
// A self-contained renderer: it builds its own subtree inside `host`, owns its worker and its
// once-a-second ticker, and takes all of it down in destroy(). The sidebar's Tonight tab (spec 0061,
// ui/explore.js) mounts it; nothing else in the app knows it exists. It never moves the camera and
// never switches the moment unless "Show me" is pressed.
//
// THE PLACE. With none set, mounting sets the guess from the device's time zone (guessObserver,
// source 'guess', never stored) and the view says so. No IP lookup, no prompt: "Use my location" is
// task 3, behind a tap.
//
// WHERE THE PASSES COME FROM. sky/passworker.js runs sky/passes.js predictPasses off the main
// thread, for the stations and visual layers, 24 hours from the clock -- 72 when nothing tonight
// clears the bar (sky/tonight.js nextVisible), so "Next: tomorrow 05:12" can be said. It is asked
// after the layers land and the browser is idle, again when the place changes, when the clock jumps
// outside what was worked out, and every 30 minutes; until the first answer the card says it is
// working. Nothing is fetched: the records are the ones the map already drew.
//
// THE COUNTDOWN is one setInterval(1000), stopped while the tab is hidden or the screen is clear
// (ui/cleanview.js), restarted on return. It writes text only; the arc is redrawn when the pass
// changes. At 1x it counts in the visitor's time; scrubbed, it gives the clock time instead.
//
// WORDS are sky/tonight.js tonightWords(), from copy/en.js, with the card's own direction and fist
// words. The place is guessed from the time zone when none is set (main.js, after idle) and said so.

import { COPY, CITIES, t, fmt, timeText, compassWords } from '../copy/en.js';
import '../copy/en.later.js';
import { guessObserver } from '../sky/guessplace.js';
import { createPlace } from './place.js';
import { nextVisible, passState, darkness, tonightWords, SEARCH_HOURS, LONG_SEARCH_HOURS } from '../sky/tonight.js';
import { arcSvg } from './skyarc.js';
import { tonightBest, bestWords, passWords, passNumbers, darkWords, compassShort, standardMagnitude, samePassKey, nightMoments, FACINGS, VIEW_HEIGHTS } from '../sky/tonightbest.js';
import { passTrack } from '../sky/passes.js';
import { FOV, DARKNESS_IDS, twilightPhase } from '../sky/skymath.js';
import { NEBULAE } from '../data/nebulae.js';
import { SCRUB_BACK_MS, SCRUB_FORWARD_MS } from './timepill.js';

const LAYERS = ['stations', 'visual'];
const REFRESH_MS = 30 * 60e3;
const DARK_MS = 10 * 60e3;
const ROWS = 10;
const BEST_MS = 5 * 60e3; // the ranked list is worked out again this often, and when the passes land
const SKY_TOGGLES = ['figures', 'names', 'art', 'bounds', 'sunPath', 'equator', 'grid', 'starGrid', 'meteors', 'seeThrough', 'trails'];
/** The time strip: minutes of the sky's time to a pixel of drag, and to a press of an arrow key. */
export const STRIP_MIN_PER_PX = 2;
/** propagate/sgp4.js MAX_AGE_MS: past this from today the saved orbits are refused and no satellite is drawn. */
export const SAT_FAR_MS = 30 * 24 * 3600e3;
export const STRIP_KEY_MIN = 10;
/** Three eyepieces: the width of the round field each shows, in degrees. */
export const EYEPIECES = { low: 1, medium: 0.5, high: 0.2 };
const SKY_CULTURES = ['western', 'chinese', 'maori', 'hawaiian', 'samoan', 'tongan', 'norse', 'boorong'];
/** Where the "My view" choice is kept: { facing: 'any' | 'n' | 'e' | 's' | 'w', minAltDeg: 0 | 15 | 30 }. */
export const VIEW_KEY = 'sr.tonight.view';

/** The stored view over the default; anything unknown or unreadable is the whole sky. Pure. */
export function readView(storage) {
  const out = { facing: 'any', minAltDeg: 0 };
  try {
    const got = JSON.parse((storage && storage.getItem(VIEW_KEY)) || 'null');
    if (got && Object.prototype.hasOwnProperty.call(FACINGS, got.facing)) out.facing = got.facing;
    if (got && VIEW_HEIGHTS.includes(got.minAltDeg)) out.minAltDeg = got.minAltDeg;
  } catch { /* a storage that throws, or not JSON: the whole sky */ }
  return out;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** An SVG string from ui/skyarc.js (numbers only) as a node, without innerHTML. */
function svgNode(markup) {
  if (!markup || typeof DOMParser === 'undefined') return null;
  const doc = new DOMParser().parseFromString(markup, 'image/svg+xml');
  const svg = doc.documentElement;
  return svg && svg.nodeName === 'svg' ? document.importNode(svg, true) : null;
}

export function renderTonight(host, ctx) {
  if (typeof document === 'undefined' || !host) return { root: null, destroy() {}, refresh() {}, passes: () => null, state: () => null };
  const T = COPY.tonight;

  const root = el('section', 'sr-tonight-view');
  root.setAttribute('aria-labelledby', 'sr-tonight-view-title');
  const head = el('h2', 'sr-tonight-view__title', T.title);
  head.id = 'sr-tonight-view-title';
  const place = el('p', 'sr-tonight-view__place');
  // Where a place is set, kept and shared (internal #455, spec 0051 task 3): one quiet row beside
  // the place line that opens the city box and its chips in place (docs/ui-guide.md section 3.5).
  // Open by itself while the place is a guess or not set: that is when the visitor has to act.
  const placeRow = el('div', 'sr-tonight-view__where');
  const change = el('button', 'sr-btn sr-btn--quiet sr-tonight-view__change', COPY.placeKeep.change);
  change.type = 'button';
  change.title = COPY.placeKeep.changeTitle;
  change.setAttribute('aria-expanded', 'false');
  const placeCtl = createPlace(ctx);
  placeCtl.root.id = 'sr-tonight-place';
  change.setAttribute('aria-controls', placeCtl.root.id);
  let placeOpen = null; // null: follows the place (open for a guess or none); a press decides after that
  const paintPlaceBox = () => {
    const o = ctx.observer;
    const open = placeOpen === null ? (!o || o.source === 'guess') : placeOpen;
    placeCtl.root.hidden = !open;
    change.setAttribute('aria-expanded', open ? 'true' : 'false');
  };
  change.addEventListener('click', () => {
    placeOpen = placeCtl.root.hidden;
    paintPlaceBox();
    if (placeOpen) placeCtl.focus();
  });
  placeRow.append(place, change);
  const body = el('div', 'sr-tonight-view__body');
  const arcBox = el('div', 'sr-tonight-view__arc');
  const text = el('div', 'sr-tonight-view__text');
  // The pass as the card draws an object (docs/ui-guide.md section 3.10, principle 4): its name,
  // three numbers with their units under them, then the way it goes beside its arc. The sentence
  // tonightWords() writes is the block's accessible name; nothing on screen is a paragraph.
  const name = el('p', 'sr-tonight-view__name');
  const nums = el('dl', 'sr-tonight-view__nums');
  const cell = (unit) => {
    const c = el('div', 'sr-tonight-view__cell');
    const num = el('dd', 'sr-tonight-view__num sr-num');
    c.append(num, el('dt', 'sr-tonight-view__unit', unit));
    nums.appendChild(c);
    return num;
  };
  const numTime = cell(T.unitRises);
  const numDeg = cell(T.unitHigh);
  const numMins = cell(T.unitLong);
  const way = el('div', 'sr-tonight-view__way');
  const line = el('p', 'sr-tonight-view__line');
  const next = el('p', 'sr-tonight-view__next');
  const status = el('p', 'sr-tonight-view__status sr-num');
  status.setAttribute('aria-live', 'off'); // a second-by-second countdown is not an announcement
  const caveat = el('p', 'sr-tonight-view__caveat');
  const empty = el('p', 'sr-tonight-view__empty');
  const dark = el('p', 'sr-tonight-view__dark');
  const actions = el('div', 'sr-tonight-view__actions');
  const showMe = el('button', 'sr-btn', T.showMe);
  showMe.type = 'button';
  showMe.title = T.showMeTitle;
  showMe.hidden = true;
  const more = el('button', 'sr-btn sr-btn--quiet', T.more);
  more.type = 'button';
  more.setAttribute('aria-expanded', 'false');
  const list = el('ul', 'sr-tonight-view__list');
  list.hidden = true;
  // Tonight's best (internal #358): one ranked list for the place, then how dark the night is.
  const bestTitle = el('h3', 'sr-micro sr-tonight-view__sub', T.best.title);
  const bestList = el('ul', 'sr-tonight-view__list sr-tonight-view__best');
  const bestEmpty = el('p', 'sr-tonight-view__next', T.best.nothing);
  bestEmpty.hidden = true;
  // My view (internal #300): a direction and a height, in the density row's buttons, kept between visits.
  const storage = (() => { try { return window.localStorage; } catch { return null; } })();
  const view = readView(storage);
  const viewBox = el('div', 'sr-skybar');
  const viewButtons = [];
  const viewRow = (label, entries, key) => {
    const r = el('div', 'sr-density__choices sr-skybar__wrap');
    r.setAttribute('role', 'group');
    r.setAttribute('aria-label', label);
    for (const [value, text, title] of entries) {
      const b = el('button', 'sr-density__btn', text);
      b.type = 'button';
      if (title) b.title = title;
      b.addEventListener('click', () => {
        view[key] = value;
        try { if (storage) storage.setItem(VIEW_KEY, JSON.stringify(view)); } catch { /* private mode */ }
        renderBest();
      });
      viewButtons.push({ b, key, value });
      r.appendChild(b);
    }
    viewBox.appendChild(r);
  };
  viewRow(T.best.view, Object.keys(FACINGS).map((f) => [f, T.best.facings[f], T.best.facingTitles[f]]), 'facing');
  viewRow(T.best.viewHeight, VIEW_HEIGHTS.map((h) => [h, T.best.heights[h], '']), 'minAltDeg');
  const bestDark = el('p', 'sr-tonight-view__dark');
  const bestNote = el('p', 'sr-tonight-view__caveat', T.best.honesty);
  // The node and its painter, apart: until 2026-10-06 the label below was set on the object that held
  // both, which threw, and the whole Tonight view never appeared.
  const { node: skyControls, paint: paintSkybar } = buildSkybar();
  // Named twice on purpose: by its heading for a reader, and outright for tests/test_a11y_static.mjs,
  // which reads this file and cannot follow aria-labelledby into the builder.
  skyControls.setAttribute('aria-label', T.skybar.title);
  text.appendChild(line);
  text.appendChild(status);
  way.appendChild(arcBox);
  way.appendChild(text);
  body.setAttribute('role', 'group');
  body.appendChild(name);
  body.appendChild(nums);
  body.appendChild(way);
  body.appendChild(caveat);
  actions.appendChild(showMe);
  actions.appendChild(more);
  root.appendChild(head);
  root.appendChild(placeRow);
  root.appendChild(placeCtl.root);
  paintPlaceBox();
  root.appendChild(body);
  root.appendChild(empty);
  root.appendChild(next);
  root.appendChild(dark);
  root.appendChild(actions);
  root.appendChild(list);
  root.appendChild(bestTitle);
  root.appendChild(viewBox);
  root.appendChild(bestList);
  root.appendChild(bestEmpty);
  root.appendChild(bestDark);
  root.appendChild(bestNote);
  root.appendChild(skyControls);

  // --- the worker --------------------------------------------------------------------------------------
  const st = {
    passes: [],          // with their records mapped back
    fromMs: NaN,
    hours: 0,
    ready: false,
    couldNotLook: false,
    askedAt: 0,
    observerKey: '',
    dark: null,
    darkAt: -Infinity,
    passId: null,
    workerMs: null,
    firstLineAt: null,
    pending: 0,
    pendingHours: SEARCH_HOURS,
  };
  let worker = null;
  let seq = 0;
  try {
    worker = new Worker(new URL('../sky/passworker.js', import.meta.url), { type: 'module' });
    worker.onmessage = (e) => receive(e.data);
    worker.onerror = () => { worker = null; };
  } catch {
    worker = null;
  }

  function recordsNow() {
    const out = [];
    for (const id of LAYERS) for (const r of (typeof ctx.recordsFor === 'function' ? ctx.recordsFor(id) : [])) if (r && r.satrec) out.push(r);
    return out;
  }

  function keyOf(o) {
    return o ? `${o.source || ''}:${Number(o.latDeg || o.latRad).toFixed(3)}:${Number(o.lonDeg || o.lonRad).toFixed(3)}` : '';
  }

  /** Ask for passes from the clock's now: 24 h, or 72 when asked to look further. */
  function ask(hours = SEARCH_HOURS) {
    const o = ctx.observer;
    const records = recordsNow();
    st.observerKey = keyOf(o);
    if (!o) { paint(); return; }
    if (!records.length) {
      st.couldNotLook = !!window.__srLayersReady;
      st.ready = false;
      paint();
      return;
    }
    st.couldNotLook = false;
    const fromMs = ctx.clock.now();
    const id = ++seq;
    st.pending = id;
    st.pendingHours = hours;
    st.askedAt = performance.now();
    const msg = {
      id,
      fromMs,
      hours,
      observer: { latRad: o.latRad, lonRad: o.lonRad, latDeg: o.latDeg, lonDeg: o.lonDeg, altKm: o.altKm || 0 },
      // Plain data across: the satrec and what the magnitude reads; the page keeps its records.
      // The standard magnitude is the record's own, or the two stations' (sky/tonightbest.js).
      // A record with none sends no key at all: across the worker a null would read as zero.
      records: records.map((r) => { const m = standardMagnitude(r); return { id: r.id, name: r.name, satrec: r.satrec, meta: m === null ? {} : { stdMag: m } }; }),
    };
    if (worker) {
      try { worker.postMessage(msg); return; } catch { worker = null; }
    }
    // No module worker (an old browser): the same function on the main thread, after the frame.
    setTimeout(() => import('../sky/passworker.js').then((m) => receive(m.runPasses(msg))), 0);
  }

  function receive(data) {
    if (!data || data.id !== st.pending) return; // an answer to a question nobody is asking now
    const byId = new Map(recordsNow().map((r) => [r.id, r]));
    st.passes = (data.passes || []).map((p) => ({ ...p, record: byId.get(p.recordId) || { id: p.recordId, name: p.recordId } }));
    st.hours = st.pendingHours;
    st.workerMs = Math.round(performance.now() - st.askedAt);
    st.ready = true;
    st.fromMs = ctx.clock.now();
    // Nothing tonight: look three days out once, so the card can say when the next one is.
    const now = ctx.clock.now();
    if (!nextVisible(st.passes.filter((p) => p.startMs < now + SEARCH_HOURS * 3600e3), ctx.observer, now) && st.hours !== LONG_SEARCH_HOURS) {
      ask(LONG_SEARCH_HOURS);
    }
    paint();
    renderList();
    renderBest();
    window.dispatchEvent(new CustomEvent('sr:tonight'));
  }

  // --- painting --------------------------------------------------------------------------------------------
  function paint() {
    const o = ctx.observer;
    const now = ctx.clock.now();
    const scrubbed = ctx.clock.mode !== 'live';
    if (performance.now() - st.darkAt > DARK_MS || (st.dark && st.dark.key !== keyOf(o))) {
      st.dark = o ? { ...(darkness(o, now) || {}), key: keyOf(o) } : null;
      st.darkAt = performance.now();
    }
    const tonight = st.passes.filter((p) => p.startMs < now + SEARCH_HOURS * 3600e3);
    const pass = st.ready ? nextVisible(tonight, o, now) : null;
    const later = st.ready && !pass ? nextVisible(st.passes, o, now) : null;
    const w = tonightWords({ observer: o, nowMs: now, ready: st.ready || !o, pass, later, dark: st.dark && st.dark.key ? st.dark : null, couldNotLook: st.couldNotLook, scrubbed });
    setText(place, w.place);
    body.hidden = !pass;
    const parts = w.parts || {};
    setText(name, parts.name);
    name.title = parts.name || '';
    setText(numTime, parts.time);
    setText(numDeg, parts.deg);
    setText(numMins, parts.mins);
    setText(line, parts.path);
    if (body.getAttribute('aria-label') !== (w.line || '')) body.setAttribute('aria-label', w.line || '');
    setText(next, w.next);
    next.hidden = !w.next;
    setText(status, w.status);
    setText(caveat, w.caveat);
    caveat.hidden = !w.caveat;
    setText(empty, w.empty);
    empty.hidden = !w.empty;
    setText(dark, w.dark);
    // The ranked list has its own, fuller line on how dark the night is; never both.
    dark.hidden = !w.dark || !bestDark.hidden;
    const id = pass ? `${pass.recordId}:${pass.startMs}` : null;
    if (id !== st.passId) {
      st.passId = id;
      while (arcBox.firstChild) arcBox.removeChild(arcBox.firstChild);
      const svg = pass ? svgNode(arcSvg(pass, 96, 48)) : null;
      if (svg) {
        arcBox.appendChild(svg);
        arcBox.setAttribute('role', 'img');
        arcBox.setAttribute('aria-label', t(T.arcLabel, { from: compassWords((pass.startAz * 180) / Math.PI), to: compassWords((pass.endAz * 180) / Math.PI), deg: Math.round((pass.peakEl * 180) / Math.PI) }));
      }
    }
    const up = pass && passState(pass, now) === 'up';
    showMe.hidden = !up;
    showMe.dataset.az = up ? String((pass.startAz * 180) / Math.PI) : '';
    if (pass && !st.firstLineAt) st.firstLineAt = performance.now();
  }

  function setText(node, value) {
    const v = value || '';
    if (node.textContent !== v) node.textContent = v;
  }

  /** A row of either list: a name, one mono line under it, and what a press does. */
  function rowNode(words, onPress, pass) {
    const li = el('li', 'sr-tonight-view__row');
    const b = el('button', 'sr-tonight-view__rowbtn');
    b.type = 'button';
    b.title = T.best.rowTitle;
    b.setAttribute('aria-label', words.aria);
    const head = el('span', 'sr-tonight-view__rowhead');
    head.appendChild(el('span', 'sr-tonight-view__rowname', words.title));
    if (words.side) head.appendChild(el('span', 'sr-tonight-view__rowside sr-num', words.side));
    b.appendChild(head);
    b.appendChild(el('span', 'sr-tonight-view__rowdetail sr-num', words.line));
    b.addEventListener('click', onPress);
    li.appendChild(b);
    // A pass keeps its small arc on hover and focus (req 9), drawn once.
    const svg = pass ? svgNode(arcSvg(pass, 96, 48)) : null;
    if (svg) { const box = el('span', 'sr-tonight-view__rowarc'); box.appendChild(svg); li.appendChild(box); }
    return li;
  }

  /**
   * A pass on the sky (pub #448): the clock goes to where it appears, the view opens wide on its
   * highest point, and its arc is drawn with its three times. The object itself is then the moving
   * point on the arc, because the clock runs on from there.
   */
  function showPass(p) {
    const n = passNumbers(p);
    if (!n || !ctx.observer) return;
    try {
      if (ctx.setMoment) ctx.setMoment(COPY.moments.now.id);
      if (ctx.clock && typeof ctx.clock.goTo === 'function') ctx.clock.goTo(n.startMs);
      const sky = ctx.skyView;
      if (!sky || typeof sky.showPass !== 'function') return;
      const track = p.record && p.record.satrec ? passTrack(p.record, p, ctx.observer, 60) : [];
      const at = (ms) => track.reduce((best, k) => (!best || Math.abs(k.ms - ms) < Math.abs(best.ms - ms) ? k : best), null);
      const marks = [];
      const a = at(n.startMs);
      const b = at(n.peakMs);
      const c = at(n.endMs);
      if (a) marks.push({ azDeg: a.azDeg, altDeg: a.altDeg, text: t(T.best.markEnds, { time: timeText.hhmm(n.startMs), dir: compassShort(a.azDeg) }) });
      if (b) marks.push({ azDeg: b.azDeg, altDeg: b.altDeg, text: t(T.best.markPeak, { time: timeText.hhmm(n.peakMs), deg: fmt.int(b.altDeg) }) });
      if (c) marks.push({ azDeg: c.azDeg, altDeg: c.altDeg, text: t(T.best.markEnds, { time: timeText.hhmm(n.endMs), dir: compassShort(c.azDeg) }) });
      sky.showPass(track, marks);
      const peak = b || { azDeg: (p.peakAz * 180) / Math.PI, altDeg: (p.peakEl * 180) / Math.PI };
      sky.pointAt({ azDeg: peak.azDeg, altDeg: Math.max(20, Math.min(50, peak.altDeg * 0.6)) }, { fovDeg: 100, mark: false });
    } catch { /* the moment doors are the fallback */ }
  }

  /** A planet, the Moon or a shower's radiant on the sky: now if it is up, else at its best time. */
  function showBody(row) {
    try {
      if (ctx.setMoment) ctx.setMoment(COPY.moments.now.id);
      const sky = ctx.skyView;
      if (!sky || typeof sky.pointAt !== 'function') return;
      if (typeof sky.showPass === 'function') sky.showPass(null);
      if (row.kind === 'shower') {
        if (ctx.clock && typeof ctx.clock.goTo === 'function') ctx.clock.goTo(row.bestMs);
        sky.pointAt({ azDeg: row.azDeg, altDeg: row.altDeg }, { fovDeg: FOV.eye });
        return;
      }
      if (!sky.pointAt({ body: row.id }, { fovDeg: FOV.eye })) {
        if (ctx.clock && typeof ctx.clock.goTo === 'function') ctx.clock.goTo(row.bestMs);
        sky.pointAt({ body: row.id }, { fovDeg: FOV.eye });
      }
    } catch { /* the moment doors are the fallback */ }
  }

  /** The photographs' objects with their catalogue rows: what Tonight's best may offer of the deep sky. */
  function deepObjects() {
    const recs = new Map();
    for (const r of (typeof ctx.recordsFor === 'function' ? ctx.recordsFor('deep-sky') : []) || []) if (r && r.id) recs.set(r.id, r);
    const out = [];
    for (const n of NEBULAE) {
      const r = recs.get(`dso-${n.id}`);
      if (!r || !r.meta || !Number.isFinite(r.meta.mag)) continue;
      out.push({ id: n.id, name: r.name, raDeg: n.ra_deg, decDeg: n.dec_deg, mag: r.meta.mag, sizeDeg: Math.max(n.width_arcmin, n.height_arcmin) / 60, kind: r.meta.typeText || '' });
    }
    return out;
  }

  /** A nebula or a galaxy on the sky, framed: now if it is up in the dark, else at its best time. */
  function showDeep(row) {
    try {
      if (ctx.setMoment) ctx.setMoment(COPY.moments.now.id);
      const sky = ctx.skyView;
      if (!sky || typeof sky.pointAt !== 'function') return;
      if (typeof sky.showPass === 'function') sky.showPass(null);
      const fovDeg = Math.max(0.33, Math.min(40, (row.sizeDeg || 1) * 3));
      const where = { raDeg: row.raDeg, decDeg: row.decDeg };
      const dark = sky.sun && sky.sun.elevationDeg < -6;
      if (!dark || !sky.pointAt(where, { fovDeg })) {
        if (ctx.clock && typeof ctx.clock.goTo === 'function') ctx.clock.goTo(row.bestMs);
        sky.pointAt(where, { fovDeg });
      }
    } catch { /* the moment doors are the fallback */ }
  }

  function renderList() {
    while (list.firstChild) list.removeChild(list.firstChild);
    const now = ctx.clock.now();
    const seen = new Set();
    const rows = st.passes.filter((p) => p.visible && p.endMs > now).sort((a, b) => a.startMs - b.startMs)
      .filter((p) => { const k = samePassKey(p); if (seen.has(k)) return false; seen.add(k); return true; }).slice(0, ROWS);
    for (const p of rows) {
      const w = passWords(p);
      if (w) list.appendChild(rowNode({ title: w.name, line: w.line, side: w.side, aria: w.aria }, () => showPass(p), p));
    }
  }

  function renderBest() {
    st.bestAt = performance.now();
    st.bestClock = ctx.clock.now();
    while (bestList.firstChild) bestList.removeChild(bestList.firstChild);
    const o = ctx.observer;
    const kind = ctx.skyView && ctx.skyView.darkness ? ctx.skyView.darkness.id : undefined;
    const best = o ? tonightBest({ observer: o, nowMs: ctx.clock.now(), passes: st.ready ? st.passes : [], deepSky: deepObjects(), darkness: kind, facing: view.facing, minAltDeg: view.minAltDeg }) : null;
    const limited = view.facing !== 'any' || view.minAltDeg > 0;
    for (const v of viewButtons) { const on = view[v.key] === v.value; v.b.setAttribute('aria-pressed', on ? 'true' : 'false'); v.b.classList.toggle('sr-bracketed', on); }
    viewBox.hidden = !o;
    setText(bestEmpty, limited ? T.best.viewNothing : T.best.nothing);
    st.best = best;
    const rows = best ? best.rows : [];
    for (const r of rows) {
      const w = bestWords(r);
      if (w) bestList.appendChild(rowNode(w, r.kind === 'pass' ? () => showPass(r.pass) : r.kind === 'dso' ? () => showDeep(r) : () => showBody(r), r.kind === 'pass' ? r.pass : null));
    }
    bestTitle.hidden = !o;
    bestEmpty.hidden = !o || rows.length > 0;
    setText(bestDark, best ? darkWords(best) : '');
    bestDark.hidden = !best;
    bestNote.hidden = !o;
  }

  /**
   * The sky's controls, in this view because this view is the sky's (docs/ui-guide.md principle 2:
   * no new panel). Three rows of the density row's buttons: the field of view, what is drawn over
   * the stars, how dark the visitor's own sky is; then red light, and the honesty line.
   */
  function buildSkybar() {
    const K = T.skybar;
    const node = el('section', 'sr-skybar');
    node.setAttribute('aria-labelledby', 'sr-skybar-title');
    const title = el('h3', 'sr-micro sr-tonight-view__sub', K.title);
    title.id = 'sr-skybar-title';
    node.appendChild(title);
    const row = (label, wrap) => {
      const r = el('div', 'sr-density__choices' + (wrap ? ' sr-skybar__wrap' : ''));
      r.setAttribute('role', 'group');
      r.setAttribute('aria-label', label);
      node.appendChild(r);
      return r;
    };
    const button = (parent, text, title2, onPress) => {
      const b = el('button', 'sr-density__btn', text);
      b.type = 'button';
      if (title2) b.title = title2;
      b.setAttribute('aria-pressed', 'false');
      b.addEventListener('click', onPress);
      parent.appendChild(b);
      return b;
    };
    const sky = () => ctx.skyView;
    // POINT YOUR PHONE (internal #450): first in the bar, because on a phone it is the way in.
    // Shown only where an orientation sensor can exist (the event, a finger, a secure page); the
    // sensor itself is asked for on the press and nowhere else. A sensor that never answers hides
    // the row again.
    const P = K.point;
    const canPoint = typeof window.DeviceOrientationEvent !== 'undefined' && window.isSecureContext !== false
      && ((typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches) || (navigator.maxTouchPoints || 0) > 0);
    const pointRow = row(P.row);
    let pointBusy = false;
    const pointBtn = button(pointRow, P.on, P.title, () => {
      const s = sky();
      if (!s || typeof s.pointPhone !== 'function' || pointBusy) return;
      const on = !!(s.pointing && s.pointing.on);
      pointBusy = !on;
      Promise.resolve(s.pointPhone(!on)).then(() => { pointBusy = false; paintBar(); }, () => { pointBusy = false; paintBar(); });
      paintBar();
    });
    const pointReset = button(pointRow, P.reset, P.resetTitle, () => { const s = sky(); if (s && typeof s.resetPointing === 'function') s.resetPointing(); });
    pointReset.removeAttribute('aria-pressed');
    const pointNote = el('p', 'sr-density__note');
    pointNote.setAttribute('role', 'status');
    const pointMore = el('p', 'sr-tonight-view__caveat');
    const pointAcc = el('p', 'sr-tonight-view__caveat');
    const pointHonest = el('p', 'sr-tonight-view__caveat', P.honest);
    node.append(pointNote, pointMore, pointAcc, pointHonest);
    pointRow.hidden = pointNote.hidden = pointMore.hidden = !canPoint;
    pointAcc.hidden = pointHonest.hidden = true;
    let pointGone = false;
    const paintPoint = () => {
      if (!canPoint) return;
      const s = sky();
      const st = s && s.pointing ? s.pointing : { on: false, why: '' };
      // No sensor on this device after all (a laptop with a touch screen): the row leaves.
      if (st.why === 'none' || st.why === 'unsupported') pointGone = true;
      pointRow.hidden = pointGone;
      press(pointBtn, !!st.on);
      pointBtn.disabled = !ctx.observer || pointBusy;
      pointReset.hidden = !(st.on && (Math.abs(st.offsetAzDeg || 0) > 0.5 || Math.abs(st.offsetTiltDeg || 0) > 0.5));
      let note = P.note;
      let more = '';
      if (!ctx.observer) note = P.noPlace;
      else if (st.on) {
        const off = Math.round(Math.abs(st.offsetAzDeg || 0));
        const name = s && typeof s.lineUpTarget === 'function' ? s.lineUpTarget() : null;
        if (st.kind === 'relative' && off < 1) note = P.relative;
        else if (off >= 1) note = t(P.lined, { n: fmt.int(off) });
        else note = name ? t(P.lineUpWith, { name: (COPY.sky.bodies && COPY.sky.bodies[name]) || name }) : P.lineUpPlain;
        if (st.kind !== 'relative' && Number.isFinite(st.declinationDeg) && Math.abs(st.declinationDeg) >= 0.5) more = t(P.declination, { n: fmt.int(Math.round(Math.abs(st.declinationDeg))), dir: st.declinationDeg >= 0 ? P.east : P.west });
      } else if (st.why === 'denied') { note = P.denied; more = P.deniedHow; }
      else if (st.why === 'none') note = P.none;
      else if (st.why === 'unsupported') note = P.unsupported;
      setText(pointNote, note);
      setText(pointMore, more);
      pointMore.hidden = !more || pointGone;
      const acc = st.on && Number.isFinite(st.accuracyDeg) ? t(P.accuracy, { n: fmt.int(Math.round(st.accuracyDeg)) }) : '';
      setText(pointAcc, acc);
      pointAcc.hidden = !acc;
      pointHonest.hidden = !st.on;
      pointNote.hidden = pointGone && !st.why;
    };
    // TIME IN THE SKY (check 15 against Stellarium). The night's three moments one press away, and
    // a strip that turns the sky under the finger: two minutes a pixel, so a hand's width is the
    // evening. It moves the one clock (clock.js): there is no second time.
    const timeRow = row(K.time, true);
    const goTo = (ms) => { if (Number.isFinite(ms) && ctx.clock && typeof ctx.clock.goTo === 'function') ctx.clock.goTo(ms); paintBar(); };
    const moment = (key) => () => { const m = ctx.observer ? nightMoments(ctx.observer, ctx.clock.now()) : null; if (m) goTo(m[`${key}Ms`]); };
    const timeNow = button(timeRow, K.timeNow, K.timeNowTitle, () => { if (ctx.clock && typeof ctx.clock.live === 'function') ctx.clock.live(); paintBar(); });
    button(timeRow, K.timeDusk, K.timeTitles.dusk, moment('dusk')).removeAttribute('aria-pressed');
    button(timeRow, K.timeMidnight, K.timeTitles.midnight, moment('midnight')).removeAttribute('aria-pressed');
    button(timeRow, K.timeDawn, K.timeTitles.dawn, moment('dawn')).removeAttribute('aria-pressed');
    const strip = el('div', 'sr-density__btn sr-skytime');
    strip.tabIndex = 0;
    strip.setAttribute('role', 'slider');
    strip.setAttribute('aria-label', K.timeStripAria);
    strip.title = K.timeStrip;
    const stripTime = el('span', 'sr-skytime__at sr-num');
    const stripHint = el('span', 'sr-skytime__hint', K.timeStrip);
    strip.append(stripTime, stripHint);
    // Where dusk, the middle of the night and dawn are on the strip (internal #447): the middle of
    // the strip is now, two minutes a pixel, so a tick's place is how far to drag.
    const stripTicks = el('span', 'sr-skytime__ticks');
    stripTicks.setAttribute('aria-hidden', 'true');
    const ticks = new Map();
    for (const key of ['dusk', 'midnight', 'dawn']) {
      const tick = el('span', 'sr-skytime__tick');
      tick.appendChild(el('span', 'sr-skytime__ticklabel', K.timeTicks[key]));
      tick.hidden = true;
      ticks.set(key, tick);
      stripTicks.appendChild(tick);
    }
    strip.appendChild(stripTicks);
    let ticksAt = { key: '', m: null };
    const paintTicks = (nowMs) => {
      const o = ctx.observer;
      const w = strip.clientWidth || 0;
      if (!o || !w) { for (const tick of ticks.values()) tick.hidden = true; return; }
      // The night's moments move a few minutes a day: worked out once a quarter of an hour of clock.
      const key = `${keyOf(o)}:${Math.floor(nowMs / 900e3)}`;
      if (ticksAt.key !== key) { let m = null; try { m = nightMoments(o, nowMs); } catch { m = null; } ticksAt = { key, m }; }
      for (const [k, tick] of ticks) {
        const ms = ticksAt.m ? ticksAt.m[`${k}Ms`] : NaN;
        const x = w / 2 + (ms - nowMs) / (STRIP_MIN_PER_PX * 60e3);
        tick.hidden = !(Number.isFinite(ms) && x >= 2 && x <= w - 2);
        if (!tick.hidden) tick.style.left = `${Math.round(x)}px`;
      }
    };
    node.appendChild(strip);
    let dragAt = null;
    strip.addEventListener('pointerdown', (e) => {
      dragAt = { x: e.clientX, ms: ctx.clock.now() };
      try { strip.setPointerCapture(e.pointerId); } catch { /* a synthetic event */ }
      e.preventDefault();
    });
    strip.addEventListener('pointermove', (e) => {
      if (!dragAt) return;
      // Dragging right is later, as on the timeline; the sky turns west under it.
      goTo(dragAt.ms + (e.clientX - dragAt.x) * STRIP_MIN_PER_PX * 60e3);
    });
    const endDrag = (e) => { dragAt = null; try { strip.releasePointerCapture(e.pointerId); } catch { /* not held */ } };
    strip.addEventListener('pointerup', endDrag);
    strip.addEventListener('pointercancel', endDrag);
    strip.addEventListener('keydown', (e) => {
      const step = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : 0;
      if (!step) return;
      e.preventDefault();
      e.stopPropagation();
      goTo(ctx.clock.now() + step * (e.shiftKey ? 6 : 1) * STRIP_KEY_MIN * 60e3);
    });
    // Why the sky has no satellites (internal #418 item 3): the propagator refuses orbital elements
    // more than thirty days from their measurement, so a clock moved that far shows none. Said once.
    const farNote = el('p', 'sr-density__note', K.timeFar);
    farNote.hidden = true;
    node.appendChild(farNote);
    const fields = new Map();
    const fieldRow = row(K.field);
    for (const f of ['eye', 'binoculars', 'telescope']) {
      fields.set(f, button(fieldRow, K.fields[f], K.fieldNotes[f], () => {
        const s = sky();
        if (!s || !s.setFov) return;
        // A planet at the centre: the Telescope frames it with its moons or rings instead of a dot in a flat field (#351).
        const body = f === 'telescope' && typeof s.bodyAtCentre === 'function' ? s.bodyAtCentre() : null;
        s.setFov(body ? fovFor(body.fieldDeg) : FOV[f]);
        // Through the telescope a planet leaves a 1 degree field in minutes: the view keeps it in the
        // middle (internal #547; sky/skyview.js follow()). A wider field lets go of it.
        if (typeof s.follow === 'function') {
          if (body) s.follow(body.id);
          else if (f !== 'telescope' && s.following) s.follow(null);
        }
        paintBar();
      }));
    }
    const fieldNote = el('p', 'sr-density__note');
    node.appendChild(fieldNote);
    // "Following Saturn": said while the view is kept on a body, and once when it sets.
    const followNote = el('p', 'sr-density__note');
    followNote.hidden = true;
    followNote.setAttribute('aria-live', 'polite');
    node.appendChild(followNote);
    // Three eyepieces (internal #351): the round field's own width, whatever the window's shape.
    const eyepieces = new Map();
    const eyeRow = row(K.eyepiece);
    const fovFor = (deg) => { const c = ctx.renderer && ctx.renderer.domElement; const w = (c && c.clientWidth) || 1; const h = (c && c.clientHeight) || 1; return deg * h / (0.9 * Math.min(w, h)); };
    for (const k of Object.keys(EYEPIECES)) {
      eyepieces.set(k, button(eyeRow, K.eyepieces[k], K.eyepieceTitles[k], () => { if (sky() && sky().setFov) sky().setFov(fovFor(EYEPIECES[k])); }));
    }
    // What is at the centre (internal #418): the tag, asked for without a pointer. Focus goes to
    // the tag, a real button, so Enter opens the card.
    const centreRow = row(K.centre);
    button(centreRow, K.centre, K.centreTitle, () => {
      const s = sky();
      const c = ctx.renderer && ctx.renderer.domElement;
      if (!s || typeof s.tapSky !== 'function' || !c || !c.getBoundingClientRect) return;
      const r = c.getBoundingClientRect();
      s.tapSky(r.left + r.width / 2, r.top + r.height / 2);
      setTimeout(() => { const tag = document.querySelector('.sr-skytag:not([hidden])'); if (tag) tag.focus(); }, 120);
    }).removeAttribute('aria-pressed');
    const toggles = new Map();
    const showRow = row(K.show, true);
    for (const k of SKY_TOGGLES) {
      toggles.set(k, button(showRow, K.toggles[k], K.toggleTitles[k], () => { if (sky() && sky().setOption) sky().setOption(k, !sky().options[k]); }));
    }
    const meteorNote = el('p', 'sr-density__note');
    meteorNote.hidden = true;
    node.appendChild(meteorNote);
    const meteorHonest = el('p', 'sr-tonight-view__caveat', K.meteorHonest);
    meteorHonest.hidden = true;
    node.appendChild(meteorHonest);
    // Whose sky: the figures and names of another people instead of the western ones (internal #355).
    const cultures = new Map();
    const cultureRow = row(K.culture, true);
    for (const c of SKY_CULTURES) {
      cultures.set(c, button(cultureRow, K.cultures[c], K.cultureNotes[c], () => { if (sky() && sky().setOption) sky().setOption('culture', c); }));
    }
    const cultureNote = el('p', 'sr-density__note');
    node.appendChild(cultureNote);
    const cultureCredit = el('p', 'sr-tonight-view__caveat');
    node.appendChild(cultureCredit);
    const dark = new Map();
    const darkRow = row(K.darkness, true);
    const darkAuto = button(darkRow, K.darknessAuto, K.darknessAutoTitle, () => { if (sky() && sky().setOption) sky().setOption('darknessBy', 'place'); });
    for (const d of DARKNESS_IDS) {
      dark.set(d, button(darkRow, K.darknessModes[d], K.darknessNotes[d], () => { if (sky() && sky().setOption) sky().setOption('darkness', d); }));
    }
    const darkNote = el('p', 'sr-density__note');
    node.appendChild(darkNote);
    const landNote = el('p', 'sr-density__note');
    node.appendChild(landNote);
    const redRow = row(K.red);
    const red = button(redRow, K.red, K.redTitle, () => { if (sky() && sky().setOption) sky().setOption('red', !sky().options.red); });
    node.appendChild(el('p', 'sr-tonight-view__caveat', K.honesty));
    const press = (b, on) => {
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.classList.toggle('sr-bracketed', !!on);
    };
    let lastFollowed = null;
    const paintBar = () => {
      const s = sky();
      const o = s && s.options ? s.options : {};
      const field = s && s.field ? s.field : 'eye';
      for (const [f, b] of fields) press(b, f === field);
      setText(fieldNote, K.fieldNotes[field]);
      const followed = s && s.following ? s.following : null;
      const bodyName = (id) => (COPY.sky && COPY.sky.bodies && COPY.sky.bodies[id]) || id;
      if (followed) { lastFollowed = followed; setText(followNote, t(K.following, { name: bodyName(followed) })); }
      else if (s && s.followEnded === 'set' && lastFollowed) setText(followNote, t(K.followSet, { name: bodyName(lastFollowed) }));
      followNote.hidden = !(followed || (s && s.followEnded === 'set' && lastFollowed));
      const fovNow = s && Number.isFinite(s.fovDeg) ? s.fovDeg : FOV.eye;
      for (const [k, b] of eyepieces) press(b, Math.abs(Math.log(fovNow / fovFor(EYEPIECES[k]))) < 0.05);
      // The sky's time: the clock's, and which part of the day or night that is at this place.
      const nowMs = ctx.clock.now();
      const phase = s && s.sun && s.active ? twilightPhase(s.sun.elevationDeg) : null;
      setText(stripTime, phase ? t(K.timeAt, { time: timeText.hhmm(nowMs), phase: K.timePhases[phase] || '' }) : timeText.hhmm(nowMs));
      strip.setAttribute('aria-valuetext', stripTime.textContent);
      strip.setAttribute('aria-valuemin', String(-Math.round(SCRUB_BACK_MS / 60e3)));
      strip.setAttribute('aria-valuemax', String(Math.round(SCRUB_FORWARD_MS / 60e3)));
      strip.setAttribute('aria-valuenow', String(Math.round((nowMs - Date.now()) / 60e3)));
      press(timeNow, ctx.clock.mode === 'live');
      paintTicks(nowMs);
      farNote.hidden = !(Math.abs(nowMs - Date.now()) > SAT_FAR_MS);
      paintPoint();
      // The land: which of the three was drawn, and where the water map puts the sea.
      const g = s && typeof s.groundStats === 'function' ? s.groundStats() : null;
      const land = g && g.landscape ? g.landscape : '';
      setText(landNote, land ? t(K.landscape[land] || '', { dir: land === 'coast' && g.sea >= 0 ? compassWords(g.sea * 22.5) : '' }) : '');
      landNote.hidden = !land;
      for (const [k, b] of toggles) press(b, !!o[k]);
      const culture = o.culture || 'western';
      for (const [c, b] of cultures) press(b, c === culture);
      setText(cultureNote, K.cultureNotes[culture] || '');
      setText(cultureCredit, K.cultureCredits[culture] || '');
      // The pictures are drawn for the western figures: the button says so and waits.
      const artBtn = toggles.get('art');
      artBtn.disabled = culture !== 'western';
      artBtn.title = culture !== 'western' ? K.artWesternOnly : K.toggleTitles.art;
      // How dark: the map's estimate while Auto is on, the visitor's own pick once they make one.
      const now = s && s.darkness ? s.darkness : { id: o.darkness, by: 'you' };
      press(darkAuto, o.darknessBy === 'place');
      for (const [d, b] of dark) press(b, o.darknessBy !== 'place' && d === o.darkness);
      const how = now.by === 'you' ? '' : (K.darknessBy[now.by] || '');
      const kind = now.by === 'reading' || now.by === 'unread' ? '' : (K.darknessNotes[now.id] || '');
      setText(darkNote, [kind, how].filter(Boolean).join(' '));
      // A shower near its peak: what this sky would show an hour, and that the streaks are drawn.
      const m = o.meteors && s && s.meteors ? s.meteors : null;
      meteorNote.hidden = !m || (!m.down && m.perHour === null);
      if (!meteorNote.hidden) {
        const n = Math.round(m.perHour || 0);
        setText(meteorNote, t(m.sporadic ? K.meteorSporadic : m.down ? K.meteorDown : n >= 1 ? K.meteorNote : K.meteorFew, { name: m.showers[0], n: fmt.int(n) }));
      }
      meteorHonest.hidden = meteorNote.hidden || m.down;
      press(red, !!o.red);
    };
    return { node, paint: paintBar };
  }

  more.addEventListener('click', () => {
    list.hidden = !list.hidden;
    more.textContent = list.hidden ? T.more : T.fewer;
    more.setAttribute('aria-expanded', list.hidden ? 'false' : 'true');
  });
  showMe.addEventListener('click', () => {
    try {
      if (ctx.setMoment) ctx.setMoment(COPY.moments.now.id);
      const az = Number(showMe.dataset.az);
      if (ctx.skyView && typeof ctx.skyView.lookAtDeg === 'function' && Number.isFinite(az)) ctx.skyView.lookAtDeg(az, 20);
    } catch { /* the moment doors are the fallback */ }
  });

  // --- the ticker --------------------------------------------------------------------------------------------
  let timer = 0;
  function visible() {
    return !document.hidden && !document.documentElement.classList.contains('sr-clean');
  }
  function tick() {
    const now = ctx.clock.now();
    // Outside what was worked out, or stale: ask again (the clock jumped, or half an hour passed).
    if (st.ready && ctx.observer && (now < st.fromMs - 60e3 || now > st.fromMs + (st.hours || SEARCH_HOURS) * 3600e3 - 3600e3 || performance.now() - st.askedAt > REFRESH_MS)) ask(SEARCH_HOURS);
    // Worked out again every few minutes, and at once when the clock has been moved.
    if (performance.now() - (st.bestAt || 0) > BEST_MS || Math.abs(now - (st.bestClock || 0)) > 20 * 60e3 + (performance.now() - (st.bestAt || 0)) * Math.abs(ctx.clock.rate || 1)) renderBest();
    paint();
    paintSkybar(); // the meteors' line follows the radiant and the sky
  }
  function start() { if (!timer && visible()) timer = setInterval(tick, 1000); }
  function stop() { if (timer) { clearInterval(timer); timer = 0; } }
  const onVisible = () => (visible() ? (tick(), start()) : stop());
  document.addEventListener('visibilitychange', onVisible);
  window.addEventListener('sr:clean', onVisible);

  // --- when to ask ------------------------------------------------------------------------------------------
  const onObserver = () => {
    if (keyOf(ctx.observer) === st.observerKey && st.ready) return;
    st.ready = false;
    st.darkAt = -Infinity;
    ask(SEARCH_HOURS);
    renderBest();
    paint();
  };
  const onSky = () => paintSkybar();
  window.addEventListener('sr:sky', onSky);
  const idle = (fn) => (typeof requestIdleCallback === 'function' ? requestIdleCallback(fn, { timeout: 3000 }) : setTimeout(fn, 200));
  const onLayersReady = () => idle(() => ask(SEARCH_HOURS));
  const onLayer = (e) => {
    const id = e && e.detail && e.detail.id;
    if (window.__srLayersReady && LAYERS.includes(id)) idle(() => ask(SEARCH_HOURS));
  };
  window.addEventListener('sr:observer', onObserver);
  window.addEventListener('sr:layers-ready', onLayersReady);
  window.addEventListener('sr:layer', onLayer);

  host.appendChild(root);
  // No place set: the guess, said as one (spec 0051 req 2). Setting it announces sr:observer, which asks.
  if (!ctx.observer && typeof ctx.setObserver === 'function') {
    const g = guessObserver(CITIES);
    if (g) ctx.setObserver(g);
  }
  if (window.__srLayersReady) idle(() => ask(SEARCH_HOURS));
  renderBest();
  paintSkybar();
  paint();
  start();

  function destroy() {
    stop();
    document.removeEventListener('visibilitychange', onVisible);
    window.removeEventListener('sr:clean', onVisible);
    window.removeEventListener('sr:observer', onObserver);
    window.removeEventListener('sr:sky', onSky);
    window.removeEventListener('sr:layers-ready', onLayersReady);
    window.removeEventListener('sr:layer', onLayer);
    if (worker) { try { worker.terminate(); } catch { /* gone */ } worker = null; }
    root.remove();
  }

  const api = {
    root,
    destroy,
    refresh: () => ask(SEARCH_HOURS),
    /** The worker's passes with their records, or null until it has answered: ui/controls.js's list reads these. */
    passes: () => (st.ready ? st.passes : null),
    best: () => st.best || null,
    showPass,
    state: () => ({ ready: st.ready, passes: st.passes.length, hours: st.hours, workerMs: st.workerMs, firstLineAt: st.firstLineAt, worker: !!worker, text: root.innerText }),
  };
  return api;
}
