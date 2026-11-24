// ui/daycard.js -- the home's day card: this day in space, the Earth today, the sky today (forge #546; the
// awesome-space research of 2026-11-23, idea 3). Three cards at the head of Today, each a way into the map, and one
// Share that is the share sheet's own (ui/share.js openShare).
//
// Contract: mountDayCard(ctx, host, { go }) -> { root, refresh(nowMs), hasSky, destroy() }   (ui/today.js)
// Also exported, pure, for tests/test_daycard.mjs:
//   thisDay(nowMs, missions = MISSIONS)  -> { mission, event, exact, tMs, id } | null
//   earthToday(nowMs)                    -> { latDeg, season, days, tMs } | null
//   skyToday(nowMs)                      -> { phase, pct, planets: [{ id, when }] } | null
//   dayParts(nowMs, missions)            -> [{ id, kicker, title, line, source, act, ... }]   each part has a source
//   shareWords(parts, nowMs)             -> { name, line }
//
// WHERE EACH PART COMES FROM, AND IT SAYS SO.
//   This day in space   registry/missions.yaml, the missions' dated events (data/missions.js), each read on the page its
//                       mission names; the card's source line names that mission's page. An event on today's month and
//                       day is "On this day"; with none, the next one within a fortnight, then the last one within a
//                       fortnight, each with its own date. Never a plan: an event still in the future is not used. Its
//                       press is the event's own link, `#event=<mission>.<event>` (ui/missions.js openEventWhenReady):
//                       the map goes to the craft and the clock to that day. The event's title and sentence are the
//                       registry's, in English, as they are on the mission's card.
//   The Earth today     worked out here (Astronomy Engine, site/vendor/): the latitude where the Sun is overhead today (its
//                       declination at noon UTC) and the days to the next solstice or equinox. Its press opens the Earth.
//   The sky today       worked out here: the Moon's phase and how much is lit, and which of the five bright planets stand
//                       more than 18 degrees from the Sun, in the morning or the evening sky. Its press opens Tonight.
// No picture of anybody else's is fetched: the Earth's card already links NASA EPIC's picture of the day (links.yaml).

import * as Astronomy from '../../vendor/astronomy.js';
import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.later.js';
import '../copy/en.live.js';
import { MISSIONS } from '../data/missions.js';
import { phaseName } from '../sky/tonightbest.js';
import { loadCss } from './latercss.js';

const DAY_MS = 86400e3;
/** How far from today an event may be and still be the card's, when none falls on the day itself. */
export const NEAR_DAYS = 14;
/** Elongation from the Sun past which a planet is clear of its glare (a common rule of thumb). */
export const CLEAR_DEG = 18;
const PLANETS = ['mercury', 'venus', 'mars', 'jupiter', 'saturn'];
const BODY = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
const SEASON_KEYS = [['mar_equinox', 'march'], ['jun_solstice', 'june'], ['sep_equinox', 'september'], ['dec_solstice', 'december']];

// The platform's queue (site/js/ui/platform-bridge.js, CONTRACT.md) is not on main yet: a no-op until it is.
// TODO(platform-bridge): call sr('track', name, params) from site/js/ui/platform-bridge.js once that module is on main.
const track = () => {};

/** Days from one month-day to another in the same leap-free calendar, signed and within half a year. */
function dayDelta(fromMs, month, day) {
  const from = new Date(fromMs);
  const y = from.getUTCFullYear();
  const base = Date.UTC(y, from.getUTCMonth(), from.getUTCDate());
  let best = null;
  for (const yy of [y - 1, y, y + 1]) {
    const d = (Date.UTC(yy, month, day) - base) / DAY_MS;
    if (best === null || Math.abs(d) < Math.abs(best)) best = d;
  }
  return best;
}

/** The event of the missions' registry for today, or the nearest within a fortnight. Pure. */
export function thisDay(nowMs, missions = MISSIONS) {
  const rows = [];
  for (const m of Array.isArray(missions) ? missions : []) {
    for (const e of (m && Array.isArray(m.events)) ? m.events : []) {
      const tMs = Date.parse(e.date);
      if (!Number.isFinite(tMs) || tMs > nowMs || e.predicted) continue;
      const d = new Date(tMs);
      rows.push({ mission: m, event: e, tMs, delta: dayDelta(nowMs, d.getUTCMonth(), d.getUTCDate()) });
    }
  }
  // On the day first (the oldest first: the further back, the better the story), then ahead, then behind.
  const pick = (list) => list.sort((a, b) => Math.abs(a.delta) - Math.abs(b.delta) || a.tMs - b.tMs)[0];
  const hit = pick(rows.filter((r) => r.delta === 0))
    || pick(rows.filter((r) => r.delta > 0 && r.delta <= NEAR_DAYS))
    || pick(rows.filter((r) => r.delta < 0 && r.delta >= -NEAR_DAYS));
  return hit ? { mission: hit.mission, event: hit.event, tMs: hit.tMs, exact: hit.delta === 0, id: `${hit.mission.id}.${hit.event.id}` } : null;
}

/** Where the Sun is overhead today, and the next turn of the year. Pure. */
export function earthToday(nowMs) {
  try {
    const d = new Date(nowMs);
    const noon = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12));
    const obs = new Astronomy.Observer(0, 0, 0);
    const eq = Astronomy.Equator('Sun', noon, obs, true, true);
    let next = null;
    for (const y of [d.getUTCFullYear(), d.getUTCFullYear() + 1]) {
      const s = Astronomy.Seasons(y);
      for (const [field, kind] of SEASON_KEYS) {
        const at = s[field] && s[field].date ? s[field].date.getTime() : NaN;
        if (at > Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) && (!next || at < next.tMs)) next = { kind, tMs: at };
      }
      if (next) break;
    }
    if (!next) return null;
    const days = Math.round((Date.UTC(new Date(next.tMs).getUTCFullYear(), new Date(next.tMs).getUTCMonth(), new Date(next.tMs).getUTCDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) / DAY_MS);
    return { latDeg: eq.dec, season: next.kind, days, tMs: next.tMs };
  } catch {
    return null;
  }
}

/** The Moon and the bright planets clear of the Sun. Pure. */
export function skyToday(nowMs) {
  try {
    const at = new Date(nowMs);
    const pct = Math.round(Astronomy.Illumination('Moon', at).phase_fraction * 100);
    const phase = phaseName(Astronomy.MoonPhase(at));
    const planets = [];
    for (const id of PLANETS) {
      const e = Astronomy.Elongation(BODY[id], at);
      if (e && e.elongation >= CLEAR_DEG) planets.push({ id, when: e.visibility === 'morning' ? 'morning' : 'evening', deg: e.elongation });
    }
    return { phase, pct, planets };
  } catch {
    return null;
  }
}

/** The three parts, in words, each with its source. Pure. */
export function dayParts(nowMs, missions = MISSIONS) {
  const D = COPY.dayCard;
  const out = [];
  const day = thisDay(nowMs, missions);
  if (day) {
    const year = String(new Date(day.tMs).getUTCFullYear());
    out.push({
      id: 'this-day',
      kicker: day.exact ? t(D.thisDayKicker, { year }) : t(D.nearKicker, { date: timeText.utcDay(day.tMs), year }),
      title: t(D.thisDayTitle, { mission: day.mission.display, event: day.event.title }),
      line: day.event.text || '',
      source: t(D.sourceMission, { name: (day.mission.source && day.mission.source.name) || day.mission.display }),
      sourceUrl: day.mission.source && day.mission.source.url,
      act: 'event',
      eventId: day.id,
    });
  }
  const earth = earthToday(nowMs);
  if (earth) {
    const seasonName = COPY.nextList.seasonTitles[earth.season] || '';
    const deg = fmt.num(Math.abs(earth.latDeg), 1);
    out.push({
      id: 'earth',
      kicker: D.earthKicker,
      title: t(earth.latDeg >= 0 ? D.earthTitleNorth : D.earthTitleSouth, { deg }),
      line: earth.days === 0 ? t(D.earthLineToday, { season: seasonName }) : earth.days === 1 ? t(D.earthLineOne, { season: seasonName }) : t(D.earthLine, { n: fmt.int(earth.days), season: seasonName }),
      source: D.sourceSky,
      act: 'earth',
    });
  }
  const sky = skyToday(nowMs);
  if (sky) {
    const phases = (COPY.tonight && COPY.tonight.best && COPY.tonight.best.phases) || {};
    const names = (COPY.sky && COPY.sky.bodies) || {};
    const named = (when) => sky.planets.filter((p) => p.when === when).map((p) => names[p.id] || BODY[p.id]).join(COPY.punctuation.comma);
    const morning = named('morning');
    const evening = named('evening');
    const planets = [morning ? t(D.skyMorning, { list: morning }) : '', evening ? t(D.skyEvening, { list: evening }) : ''].filter(Boolean).join(' ');
    out.push({
      id: 'sky',
      kicker: D.skyKicker,
      title: t(D.skyTitle, { phase: phases[sky.phase] || sky.phase, pct: fmt.int(sky.pct) }),
      line: planets || D.skyNoPlanets,
      source: D.sourceSky,
      act: 'tonight',
    });
  }
  return out;
}

/** What the share sheet says for the day. Pure. */
export function shareWords(parts, nowMs) {
  const D = COPY.dayCard;
  return {
    name: t(D.shareName, { date: timeText.utcLong(nowMs) }),
    line: parts.map((p) => [p.title, p.line].filter(Boolean).join(COPY.punctuation.sentenceJoin)).join(' '),
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export function mountDayCard(ctx, host, { go } = {}) {
  const D = COPY.dayCard;
  loadCss('live');
  const root = el('div', 'sr-daycard');
  const grid = el('div', 'sr-today__grid sr-daycard__grid');
  const foot = el('div', 'sr-daycard__foot');
  const src = el('p', 'sr-daycard__src');
  const share = el('button', 'ui-btn ui-btn--sm sr-daycard__share');
  share.type = 'button';
  share.title = D.shareTitle;
  share.setAttribute('aria-haspopup', 'dialog');
  share.appendChild(el('span', 'ui-btn__label', D.share));
  foot.append(src, share);
  root.append(grid, foot);
  host.appendChild(root);
  let parts = [];
  let shownAt = Date.now();

  const open = (p) => {
    if (p.act === 'event') {
      import('./missions.js').then((m) => m.openEventWhenReady(ctx, p.eventId)).catch((e) => console.warn('the mission did not load', e));
      return;
    }
    if (p.act === 'earth') { if (typeof go === 'function') go({ act: 'select', record: ctx.recordById('earth') }); return; }
    if (p.act === 'tonight' && ctx.explore && typeof ctx.explore.setTab === 'function') ctx.explore.setTab('tonight');
  };

  share.addEventListener('click', () => {
    const w = shareWords(parts, shownAt);
    import('./share.js').then((m) => m.openShare(ctx, { words: { name: w.name, line: w.line, link: m.shareUrl({}) }, opener: share })).catch((e) => console.warn('the share sheet did not load', e));
    // TODO(platform-bridge): sr('track', 'share', { method: 'sheet', content_type: 'today' }).
    track('share', { method: 'sheet', content_type: 'today' });
  });

  function refresh(nowMs = Date.now()) {
    shownAt = nowMs;
    parts = dayParts(nowMs);
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    root.hidden = !parts.length;
    for (const p of parts) {
      const b = el('button', `sr-today__card sr-daycard__${p.id}`);
      b.type = 'button';
      b.dataset.part = p.id;
      b.appendChild(el('span', 'sr-today__kicker', p.kicker));
      b.appendChild(el('span', 'sr-today__title', p.title));
      if (p.line) b.appendChild(el('span', 'sr-today__line', p.line));
      b.title = [p.title, p.line].filter(Boolean).join(COPY.punctuation.sentenceJoin);
      b.addEventListener('click', () => open(p));
      grid.appendChild(b);
    }
    // One line of sources for the three: each part's, once.
    const named = [...new Set(parts.map((p) => p.source).filter(Boolean))];
    src.textContent = named.length ? t(D.sources, { list: named.join(COPY.punctuation.comma) }) : '';
  }
  refresh();
  return { root, refresh, get hasSky() { return parts.some((p) => p.id === 'sky'); }, destroy() { root.remove(); } };
}
