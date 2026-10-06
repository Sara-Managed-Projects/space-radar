// ui/today.js -- the home's dated cards (internal #270; public #395 and #450).
//
// Contract: createToday(ctx, host) -> { root, refresh(), destroy() }
// Also exported, pure, for tests/test_today.mjs:
//   moonCard(nowMs), todayCards({items, nowMs, launched}) -> at most MAX_CARDS of
//     {id, kicker, title, line, tMs?, record?, act}
//
// WHY. The home answered "what is there to look at" with trips and a list. NASA's Eyes answers
// "what is happening this season" with a shelf of dated cards, hand-made, and on 2026-10-02 its
// shelf was still promoting April's launch. Ours are GENERATED, every time, from what the map
// already holds: the next pass over your place, the next launch, the Moon tonight, the next
// close approach, shower or eclipse, how many new objects went up this month. A card whose data
// is missing is left out, as a Right-now line is; with none the section is absent. Nothing here
// is typed by a person, so nothing here can go stale.
//
// Each card is a button that goes there: it selects the thing, or sets the clock to the moment
// and shows where it happens (main.js offers the way back, ui/camundo.js).
//
// The events are the "Coming up" list's own (ctx.explore.next.items()), so the two agree; the
// Moon is Astronomy Engine's. Fetched after the first visit has settled (main.js).

import * as Astronomy from '../../vendor/astronomy.js';
import { COPY, t, fmt, timeText } from '../copy/en.js';
import { rowParts } from './next.js';
import { phaseName, isJunk } from '../sky/tonightbest.js';

export const MAX_CARDS = 4;
const DAY_MS = 86400e3;
const REFRESH_MS = 10 * 60e3;

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);

/** "06 OCT", with the year once the day is more than half a year off. */
export function kickerDate(tMs, nowMs) {
  const d = timeText.utcDay(tMs);
  return Math.abs(tMs - nowMs) > 180 * DAY_MS ? `${d} ${new Date(tMs).getUTCFullYear()}` : d;
}

/** The Moon today: its phase, how much is lit, and the next of the four named phases. */
export function moonCard(nowMs) {
  const T = COPY.today;
  try {
    const at = new Date(nowMs);
    const pct = Math.round(Astronomy.Illumination('Moon', at).phase_fraction * 100);
    const name = COPY.tonight.best.phases[phaseName(Astronomy.MoonPhase(at))];
    const next = Astronomy.SearchMoonQuarter(at); // the first of the four named phases after now
    return {
      id: 'moon', kicker: kickerDate(nowMs, nowMs), title: t(T.moonTitle, { phase: cap(name) }),
      line: t(T.moonLine, { pct: fmt.int(pct), next: T.moonNext[next.quarter], date: timeText.utcDay(next.time.date.getTime()) }),
      act: 'moon',
    };
  } catch {
    return null;
  }
}

function eventCard(item, nowMs) {
  const T = COPY.today;
  const parts = rowParts(item, nowMs);
  const base = { id: `${item.kind}:${item.record ? item.record.id : item.tMs}`, kicker: kickerDate(item.tMs, nowMs), title: parts.title, line: parts.detail, tMs: item.tMs, record: item.record || null };
  switch (item.kind) {
    case 'pass':
    case 'train':
    case 'launch':
    case 'perihelion':
      return { ...base, act: 'select' };
    case 'approach':
      return { ...base, line: parts.value ? t(T.approachLine, { value: parts.value, detail: parts.detail }) : parts.detail, act: 'select' };
    case 'shower':
      return { ...base, act: 'tonight' };
    case 'solar-eclipse':
    case 'lunar-eclipse':
      return { ...base, act: 'earth-then' };
    default:
      return null;
  }
}

/**
 * The cards, pure. `items` is the Coming up list (ui/next.js buildNextItems); `launched` is
 * `{count, newest}` from the just-launched layer, or null. In this order, MAX_CARDS at most:
 * the next pass over your place (only with a place); the next launch; the Moon; the soonest of a
 * close approach, a shower's peak and an eclipse; then how many new objects went up; then the
 * rest of that soonest group.
 */
export function todayCards({ items = [], nowMs, launched = null } = {}) {
  const T = COPY.today;
  const future = items.filter((it) => it && Number.isFinite(it.tMs) && it.tMs >= nowMs - 60e3).sort((a, b) => a.tMs - b.tMs);
  const first = (...kinds) => future.find((it) => kinds.includes(it.kind));
  const out = [];
  const push = (card) => { if (card && out.length < MAX_CARDS && !out.some((c) => c.id === card.id)) out.push(card); };
  // The pass worth a card: a station's first, never a spent rocket body or a fragment (the
  // rule sky/tonightbest.js keeps for "best"; Coming up still lists them).
  const passes = future.filter((it) => (it.kind === 'pass' || it.kind === 'train') && it.tMs - nowMs < DAY_MS && !isJunk(it.record));
  const pass = passes.find((it) => it.record && it.record.klass === 'station') || passes[0];
  if (pass) push(eventCard(pass, nowMs));
  const launch = first('launch');
  if (launch) push(eventCard(launch, nowMs));
  push(moonCard(nowMs));
  const others = future.filter((it) => ['approach', 'shower', 'solar-eclipse', 'lunar-eclipse', 'perihelion'].includes(it.kind));
  // One of each kind before a second of any: five asteroid rows in a row is a list, not a shelf.
  const seenKind = new Set();
  const onePerKind = others.filter((it) => { if (seenKind.has(it.kind)) return false; seenKind.add(it.kind); return true; });
  if (onePerKind[0]) push(eventCard(onePerKind[0], nowMs));
  if (launched && launched.count > 0) {
    push({ id: 'launched', kicker: T.launchedKicker, title: t(T.launched, { n: fmt.int(launched.count) }), line: launched.newest ? t(T.launchedLine, { name: launched.newest.name }) : '', record: launched.newest || null, act: 'launched' });
  }
  for (const it of onePerKind.slice(1)) push(eventCard(it, nowMs));
  return out;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function createToday(ctx, host) {
  const T = COPY.today;
  if (!host) return { root: null, refresh() {}, destroy() {} };
  const title = el('h2', 'sr-micro', T.title);
  const grid = el('div', 'sr-today__grid');
  const debrisBtn = el('button', 'sr-more sr-today__debris', T.debris);
  debrisBtn.type = 'button';
  debrisBtn.title = T.debrisTitle;
  debrisBtn.setAttribute('aria-expanded', 'false');
  const debrisHost = el('div', 'sr-debris-host');
  debrisHost.id = 'sr-debris';
  debrisBtn.setAttribute('aria-controls', debrisHost.id);
  host.append(title, grid, debrisBtn, debrisHost);

  let debris = null;
  debrisBtn.addEventListener('click', () => {
    debris = debris || import('./debris.js').then((m) => m.createDebris(ctx, debrisHost, { onToggle: (open) => {
      debrisBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      debrisBtn.textContent = open ? T.debrisClose : T.debris;
    } })).catch((e) => { debris = null; console.warn('the debris view did not load', e); return null; });
    debris.then((api) => { if (api) api.toggle(); });
  });

  const layerOn = (id) => {
    if (typeof ctx.isLayerOn !== 'function' || ctx.isLayerOn(id) || typeof ctx.setLayerOn !== 'function') return;
    ctx.setLayerOn(id, true);
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id, on: true, handled: true, from: 'today' } }));
  };

  function go(card) {
    const rec = card.record;
    if (card.act === 'moon') {
      const moon = ctx.recordById('moon');
      if (moon) ctx.select(moon);
      return;
    }
    if (card.act === 'tonight') {
      if (typeof ctx.rememberView === 'function') ctx.rememberView();
      ctx.clock.goTo(card.tMs);
      if (ctx.explore) ctx.explore.setTab('tonight');
      if (typeof ctx.offerUndo === 'function') ctx.offerUndo(card.title);
      return;
    }
    if (card.act === 'earth-then') {
      // An eclipse: the Earth at that moment, where the shadow falls. select() offers the way back,
      // and the picture it keeps is from before the clock moved (one move, main.js rememberView).
      if (typeof ctx.rememberView === 'function') ctx.rememberView();
      ctx.clock.goTo(card.tMs);
      const earth = ctx.recordById('earth');
      const go = () => { if (earth) ctx.select(earth, { undoName: card.title, remembered: true }); };
      if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(go); else go();
      return;
    }
    if (!rec) return;
    if (rec.layer) layerOn(rec.layer);
    ctx.select(rec);
  }

  function launched() {
    const list = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('just-launched') : [];
    if (!list || !list.length) return null;
    // The newest is the highest catalogue number: they are given out in order.
    const newest = list.reduce((a, b) => (((b.meta && b.meta.noradId) || 0) > ((a.meta && a.meta.noradId) || 0) ? b : a));
    return { count: list.length, newest };
  }

  function refresh() {
    // The real present, as the pill keeps it: a scrubbed clock does not change what today is.
    const nowMs = ctx.timePill && typeof ctx.timePill.anchor === 'function' ? ctx.timePill.anchor() : ctx.clock.now();
    const next = ctx.explore && ctx.explore.next;
    const live = !ctx.clock.mode || ctx.clock.mode === 'live';
    // The list is built from the clock's time; away from now its "in 2 hours" is not today's.
    const items = live && next && typeof next.items === 'function' ? next.items() : lastItems;
    lastItems = items;
    const cards = todayCards({ items, nowMs, launched: launched() });
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    host.hidden = false;
    grid.hidden = !cards.length;
    for (const card of cards) {
      const b = el('button', 'sr-today__card');
      b.type = 'button';
      b.dataset.card = card.id;
      b.appendChild(el('span', 'sr-today__kicker', card.kicker));
      b.appendChild(el('span', 'sr-today__title', card.title));
      if (card.line) b.appendChild(el('span', 'sr-today__line', card.line));
      b.title = [card.title, card.line].filter(Boolean).join(COPY.punctuation.sentenceJoin);
      b.addEventListener('click', () => go(card));
      grid.appendChild(b);
    }
  }
  let lastItems = [];

  const onData = () => refresh();
  window.addEventListener('sr:next', onData);
  window.addEventListener('sr:layer', onData);
  const timer = setInterval(refresh, REFRESH_MS);
  refresh();
  return {
    root: host,
    refresh,
    destroy() { window.removeEventListener('sr:next', onData); window.removeEventListener('sr:layer', onData); clearInterval(timer); },
  };
}
