// ui/whenparse.js -- what a typed date means (forge #154).
//
// Contract, all pure (tests/test_whenparse.mjs):
//   MIN_YEAR, MAX_YEAR                 the range the map answers for: 1700 to 2200
//   parseWhen(text, nowMs) -> one of
//     {ok: true, kind: 'instant', ms, precision: 'year' | 'day' | 'minute' | 'second'}
//     {ok: true, kind: 'eclipse', body: 'sun' | 'moon', type: 'total' | 'annular' | 'partial' | 'any', dir: 1 | -1}
//     {ok: false, why: 'empty' | 'unknown' | 'range'}
//   inRange(ms)                        is an instant inside MIN_YEAR..MAX_YEAR
//   julianToMs(jd), msToJulian(ms)     Julian date <-> Unix ms (UTC; the leap seconds are not counted, to a minute it does not matter)
//   toInputValue(ms)                   'YYYY-MM-DDTHH:MM', the value a <input type="datetime-local"> takes, in UTC
//   fromInputValue(text)               that back to ms, as UTC; null if it is not one
//   findEclipse(Astronomy, want, fromMs) -> {ms, kind} | null   the eclipse a parsed {kind: 'eclipse'} asks for
//   fadeFor(awayMs)                    how far a satellite's dot fades when the clock is that far from now (0..0.8)
//
// WHAT IS UNDERSTOOD. Every time is UTC, and the field says so.
//   1969-07-20 20:17    1969-07-20T20:17:40Z    1969-07-20    1969-07    1969     ISO forms, a space or a T
//   20 July 1969 20:17  July 20, 1969           20 jul 1969   English month names and their first three letters
//   JD 2440423.345      a Julian date, as SpaceEngine and every ephemeris table write it
//   now  today  tomorrow  yesterday   in 3 days   2 weeks ago   +6h   -10y   next year   last month
//   next total eclipse  next solar eclipse  last lunar eclipse  next annular eclipse  previous total lunar eclipse
// "eclipse" alone is the Sun's; the search itself is astronomy-engine's (ui/datejump.js asks it), so the
// answer is worked out, not a table. A year with no month is its 1 January, 00:00 UTC.
//
// WHY 1700 TO 2200. The planets and the Moon come from astronomy-engine's VSOP87 and ELP truncations
// (propagate/body.js), which its author tests over several thousand years; Cosmoscope offers 1700 to
// 2200 and so do we. What is NOT good over that span is said where it is drawn: a satellite's orbit is
// measured for now (the time pill fades them), and a craft's own path covers only its own life.

export const MIN_YEAR = 1700;
export const MAX_YEAR = 2200;
const MIN_MS = Date.UTC(MIN_YEAR, 0, 1);
const MAX_MS = Date.UTC(MAX_YEAR, 11, 31, 23, 59, 59);
const DAY_MS = 86400e3;
const UNIX_JD = 2440587.5;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const UNITS = {
  s: 1e3, sec: 1e3, second: 1e3, seconds: 1e3,
  m: 60e3, min: 60e3, minute: 60e3, minutes: 60e3,
  h: 3600e3, hr: 3600e3, hour: 3600e3, hours: 3600e3,
  d: DAY_MS, day: DAY_MS, days: DAY_MS,
  w: 7 * DAY_MS, week: 7 * DAY_MS, weeks: 7 * DAY_MS,
};
const CALENDAR = { mo: 'month', month: 'month', months: 'month', y: 'year', yr: 'year', year: 'year', years: 'year' };

export function inRange(ms) {
  return Number.isFinite(ms) && ms >= MIN_MS && ms <= MAX_MS;
}

export function julianToMs(jd) {
  return Math.round((Number(jd) - UNIX_JD) * DAY_MS);
}

export function msToJulian(ms) {
  return ms / DAY_MS + UNIX_JD;
}

const pad = (n, w = 2) => String(n).padStart(w, '0');

/** The value a datetime-local field takes, read as UTC. */
export function toInputValue(ms) {
  if (!Number.isFinite(ms)) return '';
  const d = new Date(ms);
  return `${pad(d.getUTCFullYear(), 4)}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

/** A datetime-local field's value, as UTC ms; null when it is not one. */
export function fromInputValue(text) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/.exec(String(text || '').trim());
  if (!m) return null;
  return utc(+m[1], +m[2], +m[3], +m[4], +m[5], +(m[6] || 0));
}

/** Date.UTC, refusing what is not a real calendar day (31 February) and years Date.UTC maps to 19xx. */
function utc(y, mo, d, h = 0, mi = 0, s = 0) {
  if (!(mo >= 1 && mo <= 12 && d >= 1 && d <= 31 && h >= 0 && h <= 24 && mi >= 0 && mi < 60 && s >= 0 && s < 61)) return null;
  const t = new Date(0);
  t.setUTCFullYear(y, mo - 1, d);
  t.setUTCHours(h, mi, s, 0);
  if (t.getUTCMonth() !== mo - 1 || t.getUTCDate() !== d) return null;
  return t.getTime();
}

function addCalendar(ms, n, unit) {
  const d = new Date(ms);
  if (unit === 'year') d.setUTCFullYear(d.getUTCFullYear() + n);
  else d.setUTCMonth(d.getUTCMonth() + n);
  return d.getTime();
}

const ok = (ms, precision) => (inRange(ms) ? { ok: true, kind: 'instant', ms, precision } : { ok: false, why: Number.isFinite(ms) ? 'range' : 'unknown' });
const monthOf = (word) => {
  const i = MONTHS.indexOf(String(word || '').slice(0, 3).toLowerCase());
  return i < 0 ? null : i + 1;
};

/** Parse a time: "20:17", "20:17:40", "8pm" is not offered (a 24-hour clock is what UTC is written in). */
function timeOf(text) {
  if (!text) return { h: 0, mi: 0, s: 0, precision: null };
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(text);
  if (!m) return null;
  return { h: +m[1], mi: +m[2], s: +(m[3] || 0), precision: m[3] ? 'second' : 'minute' };
}

export function parseWhen(text, nowMs) {
  let q = String(text || '').trim().toLowerCase().replace(/\s+/g, ' ');
  if (!q) return { ok: false, why: 'empty' };
  q = q.replace(/\s*(?:utc|gmt|z)$/, '').replace(/,/g, ' ').replace(/\s+/g, ' ').trim();
  const now = Number.isFinite(nowMs) ? nowMs : Date.now();

  // An eclipse, searched for from now.
  const ec = /^(next|last|previous|prev) (?:(total|annular|partial|hybrid) )?(?:(solar|sun|lunar|moon) )?eclipse(?: of the (sun|moon))?$/.exec(q);
  if (ec) {
    const bodyWord = ec[3] || ec[4] || 'solar';
    const body = bodyWord === 'lunar' || bodyWord === 'moon' ? 'moon' : 'sun';
    const type = ec[2] === 'hybrid' ? 'total' : ec[2] || 'any';
    if (body === 'moon' && type === 'annular') return { ok: false, why: 'unknown' };
    return { ok: true, kind: 'eclipse', body, type, dir: ec[1] === 'next' ? 1 : -1 };
  }

  // Words for now and the days round it.
  if (q === 'now') return ok(now, 'second');
  const startOfDay = (ms) => { const d = new Date(ms); return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()); };
  if (q === 'today') return ok(startOfDay(now), 'day');
  if (q === 'tomorrow') return ok(startOfDay(now) + DAY_MS, 'day');
  if (q === 'yesterday') return ok(startOfDay(now) - DAY_MS, 'day');
  let m = /^(next|last) (day|week|month|year)$/.exec(q);
  if (m) {
    const n = m[1] === 'next' ? 1 : -1;
    return m[2] === 'month' || m[2] === 'year' ? ok(addCalendar(now, n, m[2]), 'day') : ok(now + n * UNITS[m[2]], 'day');
  }
  // "in 3 days", "3 days ago", "+6h", "-10y", "+2 weeks".
  m = /^(?:in )?([+-]?)(\d+(?:\.\d+)?) ?([a-z]+)( ago)?$/.exec(q);
  if (m && (UNITS[m[3]] || CALENDAR[m[3]]) && !(m[1] && m[4]) && (m[1] || m[4] || q.startsWith('in '))) {
    const sign = m[1] === '-' || m[4] ? -1 : 1;
    const n = Number(m[2]);
    if (CALENDAR[m[3]]) return Number.isInteger(n) ? ok(addCalendar(now, sign * n, CALENDAR[m[3]]), 'day') : { ok: false, why: 'unknown' };
    return ok(now + sign * n * UNITS[m[3]], 'minute');
  }
  // A Julian date.
  m = /^jd ?(\d{6,8}(?:\.\d+)?)$/.exec(q);
  if (m) return ok(julianToMs(Number(m[1])), 'second');

  // ISO: 1969-07-20, with a time after a space or a T; 1969-07; 1969.
  m = /^(-?\d{4})-(\d{1,2})-(\d{1,2})(?:[ t](.+))?$/.exec(q);
  if (m) {
    const tm = timeOf(m[4]);
    if (!tm) return { ok: false, why: 'unknown' };
    const ms = utc(+m[1], +m[2], +m[3], tm.h, tm.mi, tm.s);
    return ms === null ? { ok: false, why: 'unknown' } : ok(ms, tm.precision || 'day');
  }
  m = /^(\d{4})-(\d{1,2})$/.exec(q);
  if (m) { const ms = utc(+m[1], +m[2], 1); return ms === null ? { ok: false, why: 'unknown' } : ok(ms, 'day'); }
  m = /^(\d{4})$/.exec(q);
  if (m) return ok(utc(+m[1], 1, 1), 'year');

  // Words: "20 july 1969 20:17", "july 20 1969", "jul 1969".
  m = /^(\d{1,2}) ([a-z]+)\.? (\d{4})(?: (.+))?$/.exec(q) || null;
  let y, mo, d, rest;
  if (m) { d = +m[1]; mo = monthOf(m[2]); y = +m[3]; rest = m[4]; }
  else {
    m = /^([a-z]+)\.? (\d{1,2})(?:st|nd|rd|th)? (\d{4})(?: (.+))?$/.exec(q);
    if (m) { mo = monthOf(m[1]); d = +m[2]; y = +m[3]; rest = m[4]; }
    else {
      m = /^([a-z]+)\.? (\d{4})$/.exec(q);
      if (m && monthOf(m[1])) { const ms = utc(+m[2], monthOf(m[1]), 1); return ms === null ? { ok: false, why: 'unknown' } : ok(ms, 'day'); }
      return { ok: false, why: 'unknown' };
    }
  }
  if (!mo) return { ok: false, why: 'unknown' };
  const tm = timeOf(rest);
  if (!tm) return { ok: false, why: 'unknown' };
  const ms = utc(y, mo, d, tm.h, tm.mi, tm.s);
  return ms === null ? { ok: false, why: 'unknown' } : ok(ms, tm.precision || 'day');
}

/**
 * The eclipse a parsed `{kind: 'eclipse'}` asks for, searched with astronomy-engine (`A`, passed in so this
 * file stays free of it): {ms, kind} at the eclipse's peak, or null when there is none inside 1700 to 2200.
 * astronomy-engine searches forwards only, so "last" starts far enough back and keeps the last one before `fromMs`.
 */
export function findEclipse(A, want, fromMs) {
  const solar = want.body === 'sun';
  const first = (ms) => (solar ? A.SearchGlobalSolarEclipse(new Date(ms)) : A.SearchLunarEclipse(new Date(ms)));
  const next = (e) => (solar ? A.NextGlobalSolarEclipse(e.peak) : A.NextLunarEclipse(e.peak));
  const fits = (e) => want.type === 'any' || e.kind === want.type;
  const msOf = (e) => e.peak.date.getTime();
  if (want.dir > 0) {
    let e = first(fromMs + 60e3);
    for (let i = 0; i < 400 && e && inRange(msOf(e)); i += 1, e = next(e)) if (fits(e)) return { ms: msOf(e), kind: e.kind };
    return null;
  }
  // Back: from 25 years before (a total eclipse of the Sun is never rarer than that), the last match before `fromMs`.
  for (let back = 25; back <= 500; back *= 2) {
    const start = Math.max(MIN_MS, fromMs - back * 365.25 * DAY_MS);
    let best = null;
    let e = first(start);
    for (let i = 0; i < 2000 && e && msOf(e) < fromMs; i += 1, e = next(e)) if (fits(e)) best = e;
    if (best) return { ms: msOf(best), kind: best.kind };
    if (start === MIN_MS) return null;
  }
  return null;
}

/** How much a satellite's dot yields when the clock is `awayMs` from its elements: none inside a week, most past a month. */
export function fadeFor(awayMs) {
  const d = Math.abs(Number(awayMs) || 0);
  const week = 7 * DAY_MS;
  const month = 30 * DAY_MS;
  if (d <= week) return 0;
  if (d >= month) return 0.8;
  return 0.8 * ((d - week) / (month - week));
}
