// ui/skycalendar.js -- the sky calendar, a catalogue of ui/catalogue.js (research train "catalogues", forge #553).
//
// Contract: mountSkyCalendar(pane, ctx, api) -> { show(arg), hide() }       arg: a month, `2027-08`, from `#cat=calendar:2027-08`
// Also exported, pure (tests/test_sky_calendar.mjs):
//   CATEGORIES, categoryOf(kind), feedFor(category)    the filter's chips and the calendar file each subscribes to
//   monthKey(ms), monthBounds(key), shiftMonth(key, n)  months in UTC
//   startMs(ev), eventsInMonth(events, key, category)
//   launchEvents(records)                                the launches the map holds, as calendar rows
//   titleOf(ev), detailOf(ev), whenOf(ev)                the row's words
//   eventIcs(ev, {title, description, url, nowMs})       one VEVENT calendar file, the same UID as the /events/ page's own file
//   feedUrl(file, host, webcal)                          the address a calendar app subscribes to
//
// WHAT IT SHOWS. The dated occasions of registry/sky-events.yaml (eclipses, showers, full Moons, planets close together,
// solstices, mission days) with the instants scripts/seo_facts.mjs computed for the /events/ pages (data/skycalendar.js, a
// generated mirror: the same numbers as the pages and their calendar files), and the launches the map already holds from
// Launch Library 2 (no fetch of its own). One month at a time, in UTC, a chip per kind.
//
// A ROW. Its name opens the map at that moment (the clock jumps, the camera goes to the body the event page links to: the
// pages' own `#t=…&at=…`). "Add to calendar" builds one .ics in the browser, with the UID the static file of its page carries,
// so adding it twice from the page and from here is one entry. Every add and every subscribe is `calendar_add {feed}`, the
// file's name and nothing else (CONTRACT.md).
//
// THE FEEDS are the files scripts/seo_calendar.py writes beside the event pages at build time, one per chip; a calendar app
// subscribes to the live site's copy (webcal://), wherever this page runs. Launches have no feed: the build has no network and
// Launch Library's list is only in the harvester's saved copy, so a launch is added one at a time.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.skycalendar.js';
import { el, button, chipGroup, sourceLine, track } from './catalogkit.js';
import { SKY_EVENTS, SKY_FEEDS, CHECKED_ON } from '../data/skycalendar.js';
import { escapeText, foldLine, utcStamp, dateStamp } from '../data/ics.js';
import { icon } from './icons.js';

const DAY = 86400e3;
const LIVE_HOST = 'https://www.spaceradar.ai';

export const CATEGORIES = ['all', 'eclipses', 'showers', 'moons', 'planets', 'seasons', 'missions', 'launches'];
const KIND_CAT = { eclipse: 'eclipses', 'lunar-eclipse': 'eclipses', 'meteor-shower': 'showers', 'full-moon': 'moons', conjunction: 'planets',
  season: 'seasons', mission: 'missions', launch: 'launches' };
const CAT_FEED = { all: 'sky-events.ics', eclipses: 'eclipses.ics', showers: 'showers.ics', moons: 'moons.ics', planets: 'planets.ics',
  seasons: 'seasons.ics', missions: 'missions.ics', launches: null };

/** Which chip a kind of event is under. Pure. */
export function categoryOf(kind) { return KIND_CAT[kind] || null; }
/** The calendar file a chip subscribes to (null: none, for launches). Pure. */
export function feedFor(category) { return Object.prototype.hasOwnProperty.call(CAT_FEED, category) ? CAT_FEED[category] : null; }

/** 'YYYY-MM' of an instant, in UTC. Pure. */
export function monthKey(ms) { return new Date(ms).toISOString().slice(0, 7); }
/** [start, end) of a month, ms, UTC. Pure. */
export function monthBounds(key) {
  const [y, m] = String(key).split('-').map(Number);
  return [Date.UTC(y, m - 1, 1), Date.UTC(y, m, 1)];
}
/** The month n months on. Pure. */
export function shiftMonth(key, n) {
  const [y, m] = String(key).split('-').map(Number);
  return monthKey(Date.UTC(y, m - 1 + n, 1));
}
const isMonth = (s) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(s || ''));

/** An event's instant: its computed one, or the start of its day for an all-day row. Pure. */
export function startMs(ev) {
  if (Number.isFinite(ev.startMs)) return ev.startMs;
  return ev.allDay ? Date.parse(`${String(ev.start).slice(0, 10)}T00:00:00Z`) : Date.parse(ev.start);
}

/** The rows of one month under one chip, in time order. Pure. */
export function eventsInMonth(events, key, category = 'all') {
  const [a, b] = monthBounds(key);
  return events
    .filter((ev) => { const s = startMs(ev); return s >= a && s < b && (category === 'all' || categoryOf(ev.kind) === category); })
    .sort((x, y) => startMs(x) - startMs(y));
}

/** The launches of the map's `launches` layer as calendar rows. Pure. */
export function launchEvents(records) {
  const out = [];
  for (const r of records || []) {
    const m = r && r.meta;
    if (!m || !Number.isFinite(m.netMs)) continue;
    const rough = !!(m.netPrecision && /^(month|quarter|year|tbd|tba|day)/i.test(String(m.netPrecision)));
    out.push({ id: `launch-${r.id}`, kind: 'launch', startMs: m.netMs, start: new Date(m.netMs).toISOString(), allDay: rough, rough, name: r.name, record: r });
  }
  return out;
}

const worldName = (id) => (COPY.worlds && COPY.worlds[id]) || id;
const bare = (s) => String(s || '').replace(/^the\s+/i, '');

/** A row's title in the page's language. Pure (reads COPY). */
export function titleOf(ev) {
  const T = COPY.skyCalendar.titles;
  switch (ev.kind) {
    case 'meteor-shower': return t(T.shower, { shower: COPY.skyCalendar.showers[ev.shower] || ev.shower });
    case 'eclipse': return ev.eclipse === 'annular' ? T.solarAnnular : ev.eclipse === 'total' ? T.solarTotal : T.solarPartial;
    case 'lunar-eclipse': return ev.eclipse === 'total' ? T.lunarTotal : T.lunarPartial;
    case 'full-moon': return T.fullMoon;
    case 'conjunction': return t(T.conjunction, { a: worldName(ev.bodies[0]), b: worldName(ev.bodies[1]) });
    case 'season': return ev.season === 'june-solstice' ? T.juneSolstice : T.decemberSolstice;
    case 'mission': return t(T.missionOrbit, { mission: ev.mission, world: bare(worldName(ev.link && ev.link.at)) });
    case 'launch': return ev.name || '';
    default: return ev.id;
  }
}

/** A row's second line. Pure. */
export function detailOf(ev) {
  const D = COPY.skyCalendar.details;
  switch (ev.kind) {
    case 'meteor-shower': return t(D.shower, { zhr: fmt.int(ev.zhr) });
    case 'conjunction': return t(D.conjunction, { deg: fmt.num(ev.separationDeg, 1) });
    case 'full-moon': return t(D.fullMoon, { km: fmt.int(ev.distanceKm) });
    case 'eclipse': case 'lunar-eclipse': return D.eclipse;
    case 'mission': return D.mission;
    case 'launch': return ev.rough ? D.launchRough : D.launch;
    default: return '';
  }
}

/** "21 November 2026, 23:48 UTC" or "21 November 2026, all day". Pure. */
export function whenOf(ev) {
  const s = startMs(ev);
  const date = timeText.utcLong(s);
  return ev.allDay ? t(COPY.skyCalendar.allDay, { date }) : t(COPY.skyCalendar.when, { date, time: timeText.utcHm(s) });
}

/**
 * One event as a calendar file (RFC 5545): CRLF, lines folded at 75 octets, text escaped (data/ics.js), the UID the static
 * file of its /events/ page carries (scripts/seo_calendar.py), a reminder the day before. Pure.
 */
export function eventIcs(ev, { title, description = '', url = '', nowMs = Date.now() } = {}) {
  const s = startMs(ev);
  if (!Number.isFinite(s)) return null;
  const minutes = ev.kind === 'meteor-shower' || ev.kind === 'lunar-eclipse' ? 120 : 60;
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Space Radar//Sky events//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VEVENT', `UID:${ev.id}@spaceradar.ai`, `DTSTAMP:${utcStamp(nowMs)}`];
  if (ev.allDay) lines.push(`DTSTART;VALUE=DATE:${dateStamp(s)}`, `DTEND;VALUE=DATE:${dateStamp(s + DAY)}`);
  else lines.push(`DTSTART:${utcStamp(s)}`, `DTEND:${utcStamp(s + minutes * 60e3)}`);
  lines.push(`SUMMARY:${escapeText(title)}`);
  if (description) lines.push(`DESCRIPTION:${escapeText(description)}`);
  if (url) lines.push(`URL:${url}`);
  lines.push('TRANSP:TRANSPARENT', 'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(title)}`, 'TRIGGER:-P1D', 'END:VALARM', 'END:VEVENT', 'END:VCALENDAR');
  return lines.flatMap((l) => foldLine(l)).map((l) => `${l}\r\n`).join('');
}

/** Where a calendar subscribes: the live site's file, as https or as webcal (the scheme a calendar app opens). Pure. */
export function feedUrl(file, host = LIVE_HOST, webcal = false) {
  const base = /^https:\/\/([a-z0-9-]+\.)*spaceradar\.ai$/.test(String(host)) ? host : LIVE_HOST;
  const u = `${base}/events/${file}`;
  return webcal ? u.replace(/^https:/, 'webcal:') : u;
}

/** The map at an event's moment: the clock goes there, then the camera to the body its page links to (ui/missions.js's way). */
function openAt(ctx, ev) {
  const tMs = ev.kind === 'launch' ? ev.startMs : Date.parse(ev.link.t);
  if (!Number.isFinite(tMs) || !ctx.clock) return;
  const record = ev.kind === 'launch' ? ev.record : (typeof ctx.recordById === 'function' ? ctx.recordById(ev.link.at) : null);
  if (typeof ctx.rememberView === 'function') ctx.rememberView();
  ctx.clock.goTo(tMs);
  if (!record) return;
  const fly = () => { if (ctx.selected && ctx.selected() === record) { if (ctx.flyToRecord) ctx.flyToRecord(record); } else ctx.select(record, { undo: false }); };
  if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(fly); else fly();
}

function download(text, name) {
  const blob = new Blob([text], { type: 'text/calendar;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.textContent = name; // never seen: the link is clicked and taken away in the same turn
  a.hidden = true;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function mountSkyCalendar(pane, ctx, api) {
  const W = COPY.skyCalendar;
  const host = typeof location !== 'undefined' ? location.origin : LIVE_HOST;
  const nowMs = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());
  const st = { month: monthKey(nowMs()), cat: 'all' };
  const box = el('div', 'sr-cal');
  pane.appendChild(box);
  box.appendChild(el('p', 'sr-cat__lead', W.lead));

  // The month: back, its name, on.
  const nav = el('div', 'sr-cal__nav');
  const prev = button('ui-btn ui-btn--sm ui-btn--icon ui-btn--quiet', '', W.prev);
  prev.setAttribute('aria-label', W.prev);
  prev.appendChild(icon('chevron-left', 18));
  const next = button('ui-btn ui-btn--sm ui-btn--icon ui-btn--quiet', '', W.next);
  next.setAttribute('aria-label', W.next);
  next.appendChild(icon('chevron', 18));
  const title = el('h3', 'sr-cal__month');
  title.setAttribute('aria-live', 'polite');
  nav.append(prev, title, next);
  box.appendChild(nav);
  prev.addEventListener('click', () => go(shiftMonth(st.month, -1)));
  next.addEventListener('click', () => go(shiftMonth(st.month, 1)));

  const filter = chipGroup({ label: W.filterLabel, options: CATEGORIES.map((id) => ({ id, text: W.cats[id] })), value: 'all', onChange: (v) => { st.cat = v; paint(); } });
  box.appendChild(filter.el);
  const count = el('p', 'sr-cat__count');
  count.setAttribute('role', 'status');
  const list = el('ul', 'sr-list sr-cal__list');
  box.append(count, list);

  // Subscribe: the chip's own feed first, as the view's one ember action, then every other feed.
  const sub = el('section', 'sr-cat__sect sr-cal__sub');
  sub.appendChild(el('h3', 'sr-micro', W.subscribe));
  sub.appendChild(el('p', 'sr-cat__lead', W.subscribeLead));
  const main = el('a', 'ui-btn ui-btn--primary sr-cal__subscribe');
  const feeds = el('ul', 'sr-list sr-cal__feeds');
  sub.append(main, feeds);
  box.appendChild(sub);
  const subscribed = (file) => track('calendar_add', { feed: file });
  main.addEventListener('click', () => subscribed(main.dataset.feed));
  for (const f of SKY_FEEDS) {
    if (!W.feeds[f.file] || f.file === 'sky-events.ics' || f.file === 'sky.ics') continue; // sky.ics is three of the chips at once
    const li = el('li', 'sr-list__row');
    const a = el('a', 'ui-row ui-row--plain');
    a.href = feedUrl(f.file, host, true);
    a.title = t(W.subscribeTitle, { name: W.feeds[f.file] });
    a.setAttribute('aria-label', a.title);
    a.dataset.feed = f.file;
    a.append(el('span', 'ui-row__t', W.feeds[f.file]), el('span', 'ui-row__meta', f.file));
    a.addEventListener('click', () => subscribed(f.file));
    li.appendChild(a);
    feeds.appendChild(li);
  }

  const source = el('div', 'sr-cal__source');
  box.appendChild(source);

  let launches = [];
  const rows = () => SKY_EVENTS.concat(launches);

  function paintSubscribe() {
    const file = feedFor(st.cat) || 'sky-events.ics';
    main.href = feedUrl(file, host, true);
    main.dataset.feed = file;
    main.textContent = file === 'sky-events.ics' ? W.subscribeAll : t(W.subscribeTitle, { name: W.feeds[file] });
  }

  function row(ev) {
    const li = el('li', 'sr-list__row sr-cal__row');
    li.dataset.kind = ev.kind;
    const name = titleOf(ev);
    const go = button('ui-row ui-row--plain sr-cal__go', '', t(W.open, { name }));
    const words = el('span', 'ui-row__t');
    words.append(el('span', 'sr-cal__title', name), el('span', 'sr-cal__when', whenOf(ev)), el('span', 'sr-cal__detail', detailOf(ev)));
    go.appendChild(words);
    go.addEventListener('click', () => openAt(ctx, ev));
    const acts = el('div', 'sr-cal__acts');
    const add = button('ui-btn ui-btn--sm ui-btn--quiet', W.add, t(W.addTitle, { name }));
    add.addEventListener('click', () => {
      const page = ev.kind === 'launch' ? '' : `${LIVE_HOST}/events/${ev.id}.html`;
      const link = ev.kind === 'launch' ? `${LIVE_HOST}/#at=${encodeURIComponent(ev.record.id)}` : `${LIVE_HOST}/#t=${ev.link.t}&at=${ev.link.at}`;
      const text = eventIcs(ev, { title: name, description: `${detailOf(ev)}. ${link}`, url: page || link, nowMs: Date.now() });
      if (!text) return;
      const file = `${ev.id}.ics`;
      download(text, file);
      track('calendar_add', { feed: ev.kind === 'launch' ? 'launch.ics' : file });
    });
    acts.appendChild(add);
    if (ev.kind !== 'launch') {
      const more = el('a', 'ui-btn ui-btn--sm ui-btn--quiet', W.more);
      more.href = `events/${ev.id}.html`;
      more.title = t(W.moreTitle, { name });
      acts.appendChild(more);
    }
    li.append(go, acts);
    return li;
  }

  function paint() {
    const [a] = monthBounds(st.month);
    let label = st.month;
    try { label = new Intl.DateTimeFormat((document.documentElement.lang || 'en'), { month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(a)); } catch { /* the key */ }
    title.textContent = label;
    const these = eventsInMonth(rows(), st.month, st.cat);
    count.textContent = these.length ? t(W.count, { n: fmt.int(these.length) }) : W.empty;
    list.textContent = '';
    for (const ev of these) list.appendChild(row(ev));
    paintSubscribe();
    source.textContent = '';
    source.appendChild(sourceLine({ source: W.sourceName, url: `${LIVE_HOST}/events/index.html`, licence: t(W.checked, { date: timeText.utcLong(Date.parse(`${CHECKED_ON}T00:00:00Z`)) }) }));
    if (st.cat === 'all' || st.cat === 'launches') source.appendChild(el('p', 'sr-sect__note', W.launchesSource));
  }

  function go(month) {
    if (!isMonth(month)) return;
    st.month = month;
    if (api && api.writeLink) api.writeLink(month);
    paint();
  }

  function readLaunches() {
    const recs = typeof ctx.recordsFor === 'function' ? ctx.recordsFor('launches') : [];
    launches = launchEvents(recs);
  }
  const onLayer = (e) => { if (e.detail && e.detail.id === 'launches') { readLaunches(); paint(); } };
  window.addEventListener('sr:layer', onLayer);
  readLaunches();
  paint();

  return {
    show(arg) {
      readLaunches();
      if (isMonth(arg)) st.month = arg;
      paint();
    },
    hide() {},
  };
}
