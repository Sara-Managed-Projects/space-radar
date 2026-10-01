// ui/explore.js -- the sidebar's home: the explore view (spec 0061 req 2 and 3, design §2).
//
// Contract: createExplore(ctx, host) -> { root, tab(), setTab(id), refresh(), mountTab(id, render, opts) }
// Also exported, pure, for tests/test_shell.mjs:
//   TABS, tabTarget(tab) -> {stage, moment}, tabFor(stageId, moment) -> tab
//   rightNowLines({storms, aurora, clouds, crewed, wallMs}) -> at most three {id, text, value, lead}
//   statusSummary(rows, wallMs) -> {state, text}
//   tripMeta(row) -> the line under a trip card's title
//
// WHAT IT REPLACES. The left column was a settings list wrapped around the globe: a trips drop-down
// with its paragraph, one orange button, the Wonder / Now / Next doors, fourteen checkboxes, a scale
// ladder, the clock, a place and a search box, 3 784 px of it in a 496 px window. Row D keeps what
// answers "what is there to look at" and moves the rest out: the layers to the tool rail
// (ui/rail.js), the clock to the pill (ui/timepill.js), the sources to their sheet (ui/status.js).
//
//   Space Radar                               ‹       the wordmark; ‹ collapses to the handle
//   [ Search planets, stars, satellites     ]         ui/search.js, mounted here
//   [ Earth | Planets | Stars | Tonight ]             places, not settings: a tab flies there
//   RIGHT NOW   at most three lines from live state, a missing one left out, never filler
//   TRIPS       ui/trippicker.js's data as cards, two columns; a tap starts it
//   COMING UP   ui/next.js, five rows, "Show all"
//   ● 21 sources read · oldest 6 days ago             the status line; opens the sources sheet
//
// TABS ARE PLACES (req 3). Earth is the Earth stage; Planets the Sun's, the worlds as a list; Stars
// the stellar rung, the ladder's far places and the star systems; Tonight the sky from your place,
// which is the old Now moment. The old moments map onto them -- Wonder is the first three, Now is
// Tonight, Next is "Coming up" -- so main.js's setMoment and its per-moment layer defaults are
// unchanged. The tab follows the stage too: a search that flies to Sirius lights Stars, because a
// control that disagrees with the scene is a control that lies (the doors did, 2026-09-21).
//
// No paragraph of explanation anywhere (req 2). A line that needs one belongs to a card.

import { COPY, t, fmt, ageInWords } from '../copy/en.js';
import { STAGES, isLadderStage, isSystemStage } from '../scene/stage.js';
import { TOUR_GROUPS } from '../data/tours.js';
import { LADDER_RUNGS, WE_SHOW } from '../data/ladder.js';
import { SYSTEMS } from '../data/systems.js';
import { groupTrips, eventSubtitle } from './trippicker.js';
import { createSearch } from './search.js';
import { createNext, auroraItem } from './next.js';
import { tagLines } from './cards.js';
import { revealInColumn } from './reveal.js';

export const TABS = ['earth', 'planets', 'stars', 'tonight'];
const TARGETS = {
  earth: { stage: 'earth', moment: 'wonder' },
  planets: { stage: 'sun', moment: 'wonder' },
  stars: { stage: 'stellar', moment: 'wonder' },
  tonight: { stage: 'earth', moment: 'now' },
};
/** The trips each tab lists, by registry/tours.yaml `group`. Earth, the first view, lists them all. */
const TAB_GROUPS = { earth: null, planets: ['solar-system'], stars: ['beyond'], tonight: ['events'] };
/** How many trip cards before "All trips": two rows of two, which is row D's first view. */
const TRIPS_SHOWN = 4;
const COMING_UP_ROWS = 5;
/** The worlds the Planets tab lists, in order out from the Sun, the Moon after its planet. */
const PLANET_IDS = ['sun', 'mercury', 'venus', 'moon', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune', 'pluto'];
/** The crewed stations the "People in space" line names, by the record id their elements load as. */
const CREWED = [
  { id: 'sat-25544', key: 'iss' },
  { id: 'sat-48274', key: 'tiangong' },
];
const STORM_RANK = { hurricane: 3, storm: 2, depression: 1 };
const LY_PER_PC = 3.26156;
const REFRESH_MS = 30e3;
/** The aurora's Show me flight: the select flight's 900 ms (main.js flyToRecord). */
const SHOW_ME_MS = 900;
/** The card's astronomical-unit words, which the list shortens to the symbol. */
const AU_WORDS = t(COPY.card.values.au, { n: '' }).trim();

/** Where a tab goes. Pure. */
export function tabTarget(tab) {
  return TARGETS[tab] || TARGETS.earth;
}

/**
 * Which tab the scene is showing. Pure. The moment first -- Now is Tonight wherever the camera is --
 * then the stage: the Earth's and the Moon's are Earth, a rung of the ladder or a star system's
 * stage is Stars, and the Sun's or another world's is Planets. An unknown stage is Earth.
 */
export function tabFor(stageId, moment) {
  if (moment === 'now') return 'tonight';
  if (!stageId || stageId === 'earth' || stageId === 'moon') return 'earth';
  if (isLadderStage(stageId) || isSystemStage(stageId)) return 'stars';
  if (STAGES[stageId]) return 'planets';
  return 'earth';
}

function capitalise(s) {
  const str = String(s || '');
  return str ? str[0].toUpperCase() + str.slice(1) : str;
}

/**
 * The Right-now lines, from live state only. Pure.
 *
 * @param {{storms?: Object[], aurora?: {text, value}|null, clouds?: {mode, capturedMs}|null, crewed?: {key, record}[], wallMs?: number}} input
 * @returns {{id: string, text: string, value?: string, lead?: boolean, record?: Object}[]} at most three
 *
 * A line whose data is missing is LEFT OUT (0061 design §2): no storms loaded is no storm line, not
 * "no storms right now", which would be a claim about the ocean made from a failed download.
 */
export function rightNowLines(input = {}) {
  const R = COPY.rightNow;
  const out = [];
  const storms = (Array.isArray(input.storms) ? input.storms : []).filter((r) => r && r.name);
  if (storms.length) {
    const strongest = storms.slice().sort((a, b) => {
      const ma = a.meta || {};
      const mb = b.meta || {};
      return ((STORM_RANK[mb.status] || 0) - (STORM_RANK[ma.status] || 0))
        || ((Number(mb.trackMaxWindKmh) || 0) - (Number(ma.trackMaxWindKmh) || 0));
    })[0];
    const n = storms.length;
    const text = n === 1
      ? t(R.stormOne, { name: strongest.name })
      : t(R.storms, { n: capitalise(COPY.numberWords[n] || fmt.int(n)), name: strongest.name });
    out.push({ id: 'storms', text, record: strongest });
  }
  // A geomagnetic storm under way (internal #192 item 4): scene/aurora.js auroraRightNow's words,
  // only at Kp 5 and above, so it is news when it is here. After the storms, which are the usual
  // lead, and before the clouds and the crew, which are there every day.
  const a = input.aurora;
  if (a && a.text) out.push({ id: 'aurora', text: a.text, value: a.value || '' });
  const c = input.clouds;
  if (c && c.mode === 'live' && Number.isFinite(c.capturedMs) && Number.isFinite(input.wallMs)) {
    out.push({ id: 'clouds', text: R.clouds, value: ageInWords(Math.max(0, input.wallMs - c.capturedMs)) });
  }
  const crewed = (Array.isArray(input.crewed) ? input.crewed : []).filter((x) => x && x.record && R[x.key]);
  if (crewed.length) {
    out.push({ id: 'crew', text: R.people, value: crewed.map((x) => R[x.key]).join(COPY.punctuation.separator), record: crewed[0].record });
  }
  const lines = out.slice(0, 3);
  if (lines.length) lines[0].lead = true;
  return lines;
}

/**
 * The status line at the foot: a dot and one sentence (design §2). Pure.
 * `rows` are data/sources.js status() rows. Only the sources this page has asked for count, as in
 * the sheet itself (ui/status.js askedRows): a source nothing has asked for has not failed.
 */
export function statusSummary(rows) {
  const S = COPY.statusLine;
  const asked = (Array.isArray(rows) ? rows : []).filter((r) => r && (r.attempted || r.fetchedAt != null));
  if (!asked.length) return { state: 'wait', text: S.reading };
  let read = 0;
  let stale = 0;
  let failed = 0;
  let oldest = null;
  for (const r of asked) {
    const f = Number(r.fetchedAt);
    if (!Number.isFinite(f) || f <= 0) { failed += 1; continue; }
    read += 1;
    if (r.stale) stale += 1;
    const age = Number(r.ageMs);
    if (Number.isFinite(age) && (oldest === null || age > oldest)) oldest = age;
  }
  const parts = [t(read === 1 ? S.readOne : S.read, { n: fmt.int(read) })];
  if (failed) parts.push(t(S.failed, { n: fmt.int(failed) }));
  else if (stale) parts.push(t(S.stale, { n: fmt.int(stale) }));
  if (oldest !== null && !failed) parts.push(t(S.oldest, { age: ageInWords(oldest) }));
  return { state: failed ? 'failed' : stale ? 'stale' : 'ok', text: parts.join(COPY.punctuation.separator) };
}

/** The line under a trip card's title: its event's date, its shape, its reason, or "working it out". */
export function tripMeta(row, eventLine) {
  const T = COPY.tripCard;
  if (!row) return '';
  if (!row.planned) return T.planning;
  if (row.off) return row.reason || T.cannotRun;
  if (eventLine) return eventLine;
  if (row.failed || !Number.isFinite(row.count)) return '';
  const min = Math.max(1, Math.round((Number(row.estimateMs) || 0) / 60e3));
  return t(row.count === 1 ? T.metaOne : T.meta, { n: fmt.int(row.count), m: fmt.int(min) });
}

// ---------------------------------------------------------------------------------------------
// DOM
// ---------------------------------------------------------------------------------------------

const SVG_NS = 'http://www.w3.org/2000/svg';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text) {
  const b = el('button', className, text);
  b.type = 'button';
  return b;
}

function svgIcon(d, size = 18) {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('width', String(size));
  svg.setAttribute('height', String(size));
  svg.setAttribute('aria-hidden', 'true');
  svg.setAttribute('focusable', 'false');
  const p = document.createElementNS(SVG_NS, 'path');
  p.setAttribute('d', d);
  p.setAttribute('fill', 'none');
  p.setAttribute('stroke', 'currentColor');
  p.setAttribute('stroke-width', '1.7');
  p.setAttribute('stroke-linecap', 'round');
  svg.appendChild(p);
  return svg;
}

/** A list row that is a button: a name on the left, a mono value on the right. */
function rowButton(name, value, onClick) {
  const li = el('li', 'sr-list__row');
  const b = button('sr-list__btn');
  b.appendChild(el('span', 'sr-list__name', name));
  const v = el('span', 'sr-list__value', value || '');
  b.appendChild(v);
  b.addEventListener('click', onClick);
  li.appendChild(b);
  return { li, b, v };
}

function section(title, className) {
  const s = el('section', `sr-sect ${className || ''}`.trim());
  s.appendChild(el('h2', 'sr-micro', title));
  return s;
}

export function createExplore(ctx, host) {
  const root = el('div', 'sr-explore');
  (host || document.body).appendChild(root);

  // --- the head: the wordmark, collapse, search, tabs -------------------------------------------
  const head = el('div', 'sr-explore__head');
  const brand = el('div', 'sr-explore__brand');
  brand.appendChild(el('p', 'sr-wordmark', COPY.app.name));
  const collapse = button('sr-explore__collapse', COPY.shell.backChevron);
  collapse.setAttribute('aria-label', COPY.shell.collapse);
  collapse.title = COPY.shell.collapse;
  collapse.addEventListener('click', () => { if (ctx.shell) ctx.shell.collapse(true); });
  brand.appendChild(collapse);
  head.appendChild(brand);

  const searchHost = el('div', 'sr-explore__search');
  head.appendChild(searchHost);
  const search = createSearch(ctx, searchHost);
  // The magnifier inside the field, as every search box has one; the field is the label's target.
  const field = searchHost.querySelector('.sr-search__row');
  if (field) field.prepend(svgIcon('M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z m9 16-4-4'));
  const input = searchHost.querySelector('.sr-search__input');
  // While a query is typed the results REPLACE the lists (design §2): one column, one answer.
  const onType = () => root.classList.toggle('is-searching', !!(input && input.value.trim().length >= 2));
  if (input) { input.addEventListener('input', onType); input.addEventListener('change', onType); input.addEventListener('blur', () => setTimeout(onType, 0)); }

  const tabs = el('div', 'sr-tabs');
  tabs.setAttribute('role', 'tablist');
  tabs.setAttribute('aria-label', COPY.tabs.label);
  head.appendChild(tabs);
  root.appendChild(head);

  const body = el('div', 'sr-explore__body');
  root.appendChild(body);
  const panes = new Map();
  const tabButtons = new Map();
  for (const id of TABS) {
    const b = button('sr-tabs__tab', COPY.tabs[id]);
    b.setAttribute('role', 'tab');
    b.id = `sr-tab-${id}`;
    b.setAttribute('aria-controls', `sr-pane-${id}`);
    b.dataset.tab = id;
    b.addEventListener('click', () => goTab(id));
    tabs.appendChild(b);
    tabButtons.set(id, b);
    const pane = el('div', 'sr-pane');
    pane.id = `sr-pane-${id}`;
    pane.setAttribute('role', 'tabpanel');
    pane.setAttribute('aria-labelledby', b.id);
    pane.hidden = true;
    body.appendChild(pane);
    panes.set(id, pane);
  }
  // Arrow keys move along the tabs and choose (the WAI-ARIA tabs pattern, automatic activation).
  tabs.addEventListener('keydown', (e) => {
    const i = TABS.indexOf(current);
    let to = null;
    if (e.key === 'ArrowRight') to = TABS[(i + 1) % TABS.length];
    else if (e.key === 'ArrowLeft') to = TABS[(i + TABS.length - 1) % TABS.length];
    else if (e.key === 'Home') to = TABS[0];
    else if (e.key === 'End') to = TABS[TABS.length - 1];
    if (!to) return;
    e.preventDefault();
    goTab(to);
    tabButtons.get(to).focus();
  });

  // --- Earth: Right now, Trips, Coming up --------------------------------------------------------
  const earth = panes.get('earth');
  const now = section(COPY.rightNow.title, 'sr-now');
  const nowList = el('ul', 'sr-now__list');
  now.appendChild(nowList);
  earth.appendChild(now);
  const tripHosts = new Map();
  for (const id of TABS) {
    const s = section(COPY.tripCard.title, 'sr-trips2');
    const grid = el('div', 'sr-tripgrid');
    const more = button('sr-more');
    more.hidden = true;
    s.append(grid, more);
    tripHosts.set(id, { s, grid, more, expanded: false });
  }
  earth.appendChild(tripHosts.get('earth').s);
  const next = createNext(ctx, { limit: COMING_UP_ROWS });
  next.root.classList.add('sr-sect');
  earth.appendChild(next.root);

  // --- Planets: the worlds, a live distance from the Earth each -----------------------------------
  const planets = panes.get('planets');
  const worldsSect = section(COPY.explore.worldsTitle, 'sr-worlds');
  const worldsList = el('ul', 'sr-list');
  worldsSect.appendChild(worldsList);
  planets.appendChild(worldsSect);
  planets.appendChild(tripHosts.get('planets').s);
  const worldRows = new Map();
  for (const id of PLANET_IDS) {
    const r = rowButton('', '', () => {
      const rec = ctx.recordById(id);
      if (rec && typeof ctx.select === 'function') ctx.select(rec);
    });
    r.li.hidden = true;
    worldsList.appendChild(r.li);
    worldRows.set(id, r);
  }

  // --- Stars: the ladder's far places, the star systems, what the map draws of what is known --------
  const stars = panes.get('stars');
  const farSect = section(COPY.explore.farTitle, 'sr-far');
  const farList = el('ul', 'sr-list');
  farSect.appendChild(farList);
  stars.appendChild(farSect);
  const farRows = [];
  for (const rung of LADDER_RUNGS) {
    if (!rung.target || !rung.target.record) continue; // the worlds are the Planets tab's
    const r = rowButton(rung.label, rung.distance, () => {
      const rec = ctx.recordById(rung.target.record);
      if (!rec) return;
      if (rec.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(rec.layer) && typeof ctx.setLayerOn === 'function') ctx.setLayerOn(rec.layer, true);
      ctx.select(rec);
    });
    r.b.title = rung.why;
    farList.appendChild(r.li);
    farRows.push({ rung, r });
  }
  const sysSect = section(COPY.explore.systemsTitle, 'sr-systems');
  const sysList = el('ul', 'sr-list');
  sysSect.appendChild(sysList);
  for (const sys of SYSTEMS) {
    const pc = sys.hostSky && Number(sys.hostSky.distPc);
    const value = Number.isFinite(pc) ? t(COPY.explore.lightYears, { n: fmt.int(Math.round(pc * LY_PER_PC)) }) : '';
    const r = rowButton(sys.host, value, () => {
      const rec = ctx.recordById(sys.hostId);
      if (rec) ctx.select(rec);
    });
    sysList.appendChild(r.li);
  }
  stars.appendChild(sysSect);
  stars.appendChild(tripHosts.get('stars').s);
  const shows = section(COPY.ladder.weShowTitle, 'sr-weshow');
  const showList = el('ul', 'sr-list sr-list--quiet');
  const showRows = [];
  for (const row of WE_SHOW) {
    const li = el('li', 'sr-list__row sr-list__static');
    li.appendChild(el('span', 'sr-list__name', row.what));
    const v = el('span', 'sr-list__value', fmt.int(row.n));
    li.appendChild(v);
    li.title = t(COPY.ladder.weShowRow, { n: fmt.int(row.n), what: row.what, of: row.of });
    showList.appendChild(li);
    showRows.push({ row, v, li });
  }
  shows.appendChild(showList);
  stars.appendChild(shows);

  // --- Tonight: the place and what comes over it (the old Now moment) ------------------------------
  // Built the first time the tab is shown: ui/place.js is the old Now moment's page, 10 kB that the
  // first view does not use (0061 req 14).
  const tonight = panes.get('tonight');
  const placeHost = el('div', 'sr-sect');
  tonight.appendChild(placeHost);
  tonight.appendChild(tripHosts.get('tonight').s);
  let placeLoad = null;
  const loadPlace = () => placeLoad || (placeLoad = import('./place.js').then((m) => {
    const place = m.createPlace(ctx);
    placeHost.replaceWith(place.root);
    place.root.classList.add('sr-sect');
  }).catch((e) => { placeLoad = null; console.warn('the Tonight tab did not load', e); }));

  // --- the status line ----------------------------------------------------------------------------
  const foot = button('sr-statusline');
  const dot = el('span', 'sr-statusline__dot');
  dot.setAttribute('aria-hidden', 'true');
  const footText = el('span', 'sr-statusline__text', COPY.statusLine.reading);
  foot.append(dot, footText);
  foot.setAttribute('aria-haspopup', 'dialog');
  foot.title = COPY.statusLine.open;
  foot.addEventListener('click', () => { if (ctx.shell) ctx.shell.openSources(); });
  root.appendChild(foot);

  // --- behaviour ----------------------------------------------------------------------------------
  let current = null;

  function paintTabs(id) {
    current = id;
    for (const [tid, b] of tabButtons) {
      const on = tid === id;
      b.setAttribute('aria-selected', on ? 'true' : 'false');
      b.tabIndex = on ? 0 : -1;
      b.classList.toggle('is-on', on);
      panes.get(tid).hidden = !on;
    }
    root.dataset.tab = id;
    paintPane(id);
  }

  /** Go there: the stage (through the black, as a trip's stage change does) and the moment. */
  // The tab last chosen. The switch reads it when it RUNS, not when it was asked for: the veil takes
  // 700 ms of frames (seconds on a slow device), and measured in headless Chrome, Planets then Earth
  // pressed inside that time landed on the Sun's stage with Earth lit, because the queued switch
  // carried the target of the first press.
  let wanted = null;

  function goTab(id) {
    if (!TABS.includes(id)) return;
    wanted = id;
    paintTabs(id);
    const apply = () => {
      const target = tabTarget(wanted);
      if (ctx.stage && ctx.stage.worldId !== target.stage && typeof ctx.setStage === 'function') {
        if (typeof ctx.deselect === 'function' && ctx.selected && ctx.selected()) ctx.deselect();
        ctx.setStage(target.stage);
        if (target.stage === 'sun' && typeof ctx.frameSolarSystem === 'function') ctx.frameSolarSystem();
      }
      if (ctx.moment !== target.moment && typeof ctx.setMoment === 'function') ctx.setMoment(target.moment);
    };
    const moves = ctx.stage && ctx.stage.worldId !== tabTarget(id).stage;
    if (moves && ctx.veil && typeof ctx.veil.through === 'function') ctx.veil.through(apply);
    else apply();
  }

  /**
   * The aurora's Right-now line: NOAA's measured Kp (the reading Coming up already holds, through
   * data/events.js auroraItem: a storm under way, measured in the last six hours) in the words of
   * the aurora module. Left out until that module has loaded (main.js, OFF THE FIRST VISIT) and
   * whenever there is no storm.
   */
  function auroraNow(wallMs) {
    const a = ctx.aurora;
    if (!a || typeof a.rightNow !== 'function') return null;
    const w = typeof next.weather === 'function' ? next.weather() : null;
    const item = w ? auroraItem(w, wallMs) : null;
    if (!item || !item.now) return null;
    try { return a.rightNow(item.kp); } catch { return null; }
  }

  /**
   * Show me: the night side of the pole the aurora is best seen around (scene/aurora.js
   * auroraHemisphere says which), with the layer on and the Earth's card open, whose aurora line
   * says what the band is. From another stage the Earth's comes first, as a tab does.
   */
  function showAurora() {
    const a = ctx.aurora;
    if (!a || typeof a.showMe !== 'function') return;
    if (typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn('aurora') && typeof ctx.setLayerOn === 'function') {
      ctx.setLayerOn('aurora', true);
      document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: 'aurora', on: true, handled: true, from: 'explore' } }));
    }
    if (ctx.stage && ctx.stage.worldId !== 'earth' && typeof ctx.setStage === 'function') ctx.setStage('earth');
    const earthRec = typeof ctx.recordById === 'function' ? ctx.recordById('earth') : null;
    if (earthRec) ctx.select(earthRec, { fly: false });
    const o = ctx.observer;
    const view = a.showMe({ observerLatDeg: o && Number.isFinite(o.latRad) ? (o.latRad * 180) / Math.PI : NaN });
    if (view && ctx.cameraRig) {
      ctx.cameraRig.flyTo({ targetScene: view.target, distance: view.distance, azimuth: view.azimuth, polar: view.polar, ms: SHOW_ME_MS });
    }
  }

  function paintNow() {
    const wallMs = Date.now();
    let clouds = null;
    try { clouds = ctx.liveClouds ? ctx.liveClouds.state() : null; } catch { clouds = null; }
    const crewed = [];
    for (const c of CREWED) {
      const rec = typeof ctx.recordById === 'function' ? ctx.recordById(c.id) : null;
      if (rec) crewed.push({ key: c.key, record: rec });
    }
    const lines = rightNowLines({ storms: ctx.recordsFor ? ctx.recordsFor('storms') : [], aurora: auroraNow(wallMs), clouds, crewed, wallMs });
    while (nowList.firstChild) nowList.removeChild(nowList.firstChild);
    now.hidden = !lines.length;
    for (const line of lines) {
      const li = el('li', `sr-now__row${line.lead ? ' is-lead' : ''}`);
      const b = button('sr-now__btn');
      b.appendChild(el('span', 'sr-now__text', line.text));
      if (line.value) b.appendChild(el('span', 'sr-now__value', line.value));
      if (line.id === 'aurora') {
        b.title = COPY.aurora.showMe;
        b.addEventListener('click', showAurora);
        li.appendChild(b);
        nowList.appendChild(li);
        continue;
      }
      b.addEventListener('click', () => {
        const rec = line.record || (line.id === 'clouds' ? ctx.recordById('earth') : null);
        if (!rec) return;
        if (rec.layer && typeof ctx.isLayerOn === 'function' && !ctx.isLayerOn(rec.layer) && typeof ctx.setLayerOn === 'function') {
          ctx.setLayerOn(rec.layer, true);
          document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: rec.layer, on: true, handled: true, from: 'explore' } }));
        }
        ctx.select(rec);
      });
      li.appendChild(b);
      nowList.appendChild(li);
    }
  }

  // Trips: the picker's own planning, drawn as cards.
  const trip = ctx.trip;
  const tours = trip && typeof trip.tours === 'function' ? trip.tours() : [];
  const plans = new Map();
  function paintTrips(id) {
    const hostT = tripHosts.get(id);
    if (!hostT) return;
    const groups = TAB_GROUPS[id];
    const drawn = groupTrips(tours, TOUR_GROUPS, plans);
    let rows = [];
    for (const g of drawn) if (!groups || groups.includes(g.group)) for (const r of g.trips) rows.push({ ...r, group: g.group });
    // The ones that can run first, across groups: the first view must not open on a greyed card.
    rows = rows.filter((r) => !r.off).concat(rows.filter((r) => r.off));
    hostT.s.hidden = !rows.length;
    const shown = hostT.expanded ? rows : rows.slice(0, TRIPS_SHOWN);
    // The cards are rebuilt as plans land, and a rebuilt card is a new node: the one a keyboard
    // visitor is on (or that leaving a trip gave focus back to) would drop focus to <body>.
    const active = typeof document !== 'undefined' ? document.activeElement : null;
    const focusedTrip = active && hostT.grid.contains(active) && active.dataset ? active.dataset.trip : null;
    while (hostT.grid.firstChild) hostT.grid.removeChild(hostT.grid.firstChild);
    const nowMs = ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now();
    for (const row of shown) {
      const tour = tours.find((x) => x.id === row.id);
      const card = button('sr-tripcard');
      card.dataset.trip = row.id;
      card.dataset.group = row.group || '';
      card.appendChild(el('span', 'sr-tripcard__title', row.title));
      const meta = tripMeta(row, eventSubtitle(tour, nowMs, ctx.observer || null));
      card.appendChild(el('span', 'sr-tripcard__meta', meta));
      if (row.off) { card.classList.add('is-off'); card.setAttribute('aria-disabled', 'true'); }
      card.title = [row.blurb, row.off ? row.reason : ''].filter(Boolean).join(' ');
      card.addEventListener('click', () => {
        if (row.off) return; // greyed WITH its reason (spec 0025 req 6), never started into a refusal
        try { trip.start(row.id); } catch { /* the trip says why itself */ }
      });
      hostT.grid.appendChild(card);
      if (focusedTrip && row.id === focusedTrip) card.focus({ preventScroll: true });
    }
    hostT.more.hidden = rows.length <= TRIPS_SHOWN;
    hostT.more.textContent = hostT.expanded ? COPY.tripCard.fewer : t(COPY.tripCard.all, { n: fmt.int(rows.length) });
    hostT.more.setAttribute('aria-expanded', hostT.expanded ? 'true' : 'false');
  }
  for (const [id, hostT] of tripHosts) {
    hostT.more.addEventListener('click', () => { hostT.expanded = !hostT.expanded; paintTrips(id); });
  }
  function planAll(only) {
    for (const tour of tours) {
      if (only && !only(tour)) continue;
      Promise.resolve(trip.plan(tour.id))
        .then((p) => { if (p) { plans.set(tour.id, p); paintTrips(current); } })
        .catch(() => { plans.set(tour.id, { offerable: true, failed: true }); paintTrips(current); });
    }
  }
  if (tours.length) {
    window.addEventListener('sr:layers-ready', () => planAll(), { once: true });
    if (window.__srLayersReady) planAll();
    // A trip from your own place re-plans when the place changes (spec 0038), and only those.
    window.addEventListener('sr:observer', () => { if (plans.size) planAll((tour) => tour.requires_observer); });
  }

  function paintWorlds() {
    for (const [id, r] of worldRows) {
      const rec = typeof ctx.recordById === 'function' ? ctx.recordById(id) : null;
      r.li.hidden = !rec;
      if (!rec) continue;
      const name = rec.name || id;
      if (r.b.firstChild.textContent !== name) r.b.firstChild.textContent = name;
      let value = '';
      try {
        const lines = tagLines(rec, ctx);
        const d = lines && lines.readouts.find((x) => x.key === 'earth');
        // The card's own number, in the list's short unit: "1.52 AU" where the card says it in words.
        value = d ? (d.unit === AU_WORDS ? t(COPY.explore.au, { n: d.num }) : `${d.num} ${d.unit}`) : '';
      } catch { value = ''; }
      if (r.v.textContent !== value) r.v.textContent = value;
    }
  }

  function paintStars() {
    for (const { rung, r } of farRows) {
      const ok = !!(typeof ctx.recordById === 'function' && ctx.recordById(rung.target.record));
      r.b.disabled = !ok;
      r.b.setAttribute('aria-label', ok ? `${rung.label}, ${rung.distance}` : `${rung.label}, ${COPY.ladder.notLoaded}`);
    }
    // A row that names its layer prints what that layer holds, so it agrees with What to show.
    for (const { row, v } of showRows) {
      if (!row.layer) continue;
      const n = (ctx.recordsFor ? ctx.recordsFor(row.layer) : []).length;
      if (n > 0) v.textContent = fmt.int(n);
    }
  }

  function paintStatus() {
    let rows = [];
    try { rows = ctx.sources && typeof ctx.sources.status === 'function' ? ctx.sources.status() : []; } catch { rows = []; }
    const s = statusSummary(rows);
    if (footText.textContent !== s.text) footText.textContent = s.text;
    foot.dataset.state = s.state;
    foot.setAttribute('aria-label', t(COPY.statusLine.label, { text: s.text }));
  }

  const mounts = new Map();

  function paintPane(id) {
    if (mounts.has(id)) mounts.get(id)();
    if (id === 'tonight') loadPlace();
    if (id === 'earth') paintNow();
    if (id === 'planets') paintWorlds();
    if (id === 'stars') paintStars();
    paintTrips(id);
  }

  function refresh() {
    if (current) paintPane(current);
    paintStatus();
  }

  const follow = () => {
    const id = tabFor(ctx.stage && ctx.stage.worldId, ctx.moment);
    if (id !== current) paintTabs(id);
  };
  window.addEventListener('sr:stage', follow);
  window.addEventListener('sr:moment', (e) => {
    follow();
    // A link to the old Next door lands on Earth with "Coming up" in view (the moment's answer).
    if (e && e.detail === 'next') revealInColumn(next.root, 8);
  });
  window.addEventListener('sr:layer', () => refresh());
  window.addEventListener('sr:clouds', () => { if (current === 'earth') paintNow(); });
  // The aurora module arrived, or a forecast did: the aurora line can be written.
  window.addEventListener('sr:aurora', () => { if (current === 'earth') paintNow(); });
  setInterval(refresh, REFRESH_MS);
  // The status line settles over the first seconds as the sources answer; a quicker look then.
  let early = 0;
  const earlyTimer = setInterval(() => { paintStatus(); if (++early > 20) clearInterval(earlyTimer); }, 1500);

  paintTabs(tabFor(ctx.stage && ctx.stage.worldId, ctx.moment));
  paintStatus();

  /**
   * A tab's content from another module: `render(host, ctx)` fills a section at the top of the tab's
   * pane, once, the first time the tab is shown (or at once if it is showing). With `replace: true`
   * the tab's own sections are set aside and only its trips stay under the mounted content. The
   * Tonight tab is the first user: spec 0051's ui/tonight.js renderTonight(host, ctx) takes the old
   * Now moment's place list over with
   *     ctx.explore.mountTab('tonight', renderTonight, { replace: true })
   * and nothing in this file changes when it lands.
   */
  function mountTab(id, render, opts = {}) {
    const pane = panes.get(id);
    if (!pane || typeof render !== 'function') return null;
    const mount = el('section', 'sr-sect sr-pane__mount');
    pane.prepend(mount);
    if (opts.replace) {
      for (const child of [...pane.children]) {
        if (child !== mount && child !== tripHosts.get(id).s) child.hidden = true;
      }
      if (id === 'tonight') { placeLoad = Promise.resolve(); placeHost.hidden = true; }
    }
    let done = false;
    const run = () => {
      if (done) return;
      done = true;
      try { render(mount, ctx); } catch (e) { console.warn(`the ${id} tab's content did not render`, e); }
    };
    mounts.set(id, run);
    if (current === id) run();
    return mount;
  }

  const api = { root, tab: () => current, setTab: goTab, refresh, search, mountTab };
  if (ctx) ctx.explore = api;
  return api;
}
