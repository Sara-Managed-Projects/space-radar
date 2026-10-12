// data/ics.js -- one event of the Coming up list as a calendar file (public #235).
//
// Contract, all pure:
//   offersIcs(item) -> boolean                    does this row have a time worth a calendar entry?
//   icsEvent(item) -> { allDay, startMs, endMs, alarm } | null   the row's times, by its kind
//   toIcs(item, { title, description, url, nowMs }) -> string | null   RFC 5545, one VEVENT
//   icsFilename(item, title) -> 'launch-artemis-ii-2026-10-09.ics'
//   escapeText(s), foldLine(s), utcStamp(ms), dateStamp(ms)   the four rules, for the test
//
// NO SERVER, NO FETCH, NOTHING KEPT. The file is built in the browser from the row the visitor is
// looking at and handed to them as a download (ui/next.js); a pass's times are the ones already
// worked out for their place, and they go nowhere but into the file. Fetched when "Add to
// calendar" is first pressed, so it is not a first visit's cost.
//
// THE TIMES ARE HONEST. A time is UTC with a Z, never a floating local time a calendar would
// re-read in its own zone. A launch whose date is only known to the month, and a shower's peak
// (which moves by hours between years), are all-day DATE values and never a made-up minute.
// An aurora under way offers no file: it is already happening.
//
//   kind                    start        end                          reminder
//   launch                  NET          the window's end, or +1 h    1 day
//   launch, rough date      that day     (all day)                    1 day
//   approach, perihelion    the moment   +1 h                         1 day
//   shower                  peak day     (all day)                    1 day
//   aurora (forecast)       its start    +3 h                         1 h
//   pass / train            rise         +10 min / +20 min            15 min
//   solar / lunar eclipse   global peak  +2 h                         1 day
//
// The pass's reminder is 15 minutes (the lead session's brief of 2026-10-07), where the issue's
// first table had an hour: a pass is something to step outside for, not to travel to.

const MIN = 60e3;
const HOUR = 3600e3;
const DAY = 86400e3;
const ROUGH = /^(month|quarter|year|tbd|tba)/i;

/** RFC 5545 section 3.3.11: backslash, semicolon and comma escaped, a newline as the two characters \n. */
export function escapeText(value) {
  return String(value == null ? '' : value)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\;')
    .replace(/,/g, '\\,')
    .replace(/\r\n|\r|\n/g, '\\n');
}

const utf8 = (ch) => (typeof TextEncoder === 'function' ? new TextEncoder().encode(ch).length : unescape(encodeURIComponent(ch)).length);

/**
 * Section 3.1: no line longer than 75 OCTETS, the break excluded; a longer one is continued on
 * lines that begin with one space. Octets, not characters: "é" is two and a rocket emoji four,
 * and a multi-byte character is never cut in half.
 */
export function foldLine(line) {
  const out = [];
  let cur = '';
  let size = 0;
  for (const ch of String(line)) {
    const n = utf8(ch);
    if (size + n > 75) {
      out.push(cur);
      cur = ' ';
      size = 1;
    }
    cur += ch;
    size += n;
  }
  out.push(cur);
  return out.join('\r\n');
}

const pad = (n, w = 2) => String(n).padStart(w, '0');
/** 20261009T140500Z */
export function utcStamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
}
/** 20261009 -- the UTC day. */
export function dateStamp(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
}

/** The row's times by its kind (the table above), or null when it has none worth a file. */
export function icsEvent(item) {
  if (!item || !Number.isFinite(item.tMs)) return null;
  const t = item.tMs;
  switch (item.kind) {
    case 'launch': {
      if (item.precision && ROUGH.test(item.precision)) return { allDay: true, startMs: t, endMs: t + DAY, alarm: '-P1D' };
      const a = item.record && item.record.ascent;
      const windowEnd = a && Number.isFinite(a.windowEndMs) && a.windowEndMs > t && a.windowEndMs - t <= 12 * HOUR ? a.windowEndMs : null;
      return { allDay: false, startMs: t, endMs: windowEnd || t + HOUR, alarm: '-P1D' };
    }
    case 'approach':
    case 'perihelion':
      return { allDay: false, startMs: t, endMs: t + HOUR, alarm: '-P1D' };
    case 'shower':
      return { allDay: true, startMs: t, endMs: t + DAY, alarm: '-P1D' };
    case 'aurora':
      return item.now ? null : { allDay: false, startMs: t, endMs: t + 3 * HOUR, alarm: '-PT1H' };
    case 'pass':
      return { allDay: false, startMs: t, endMs: t + 10 * MIN, alarm: '-PT15M' };
    case 'train':
      return { allDay: false, startMs: t, endMs: t + 20 * MIN, alarm: '-PT15M' };
    case 'solar-eclipse':
    case 'lunar-eclipse':
      return { allDay: false, startMs: t, endMs: t + 2 * HOUR, alarm: '-P1D' };
    default:
      return null;
  }
}

export function offersIcs(item) { return icsEvent(item) !== null; }

/** Lower-case words joined by hyphens, safe on every file system; never empty. */
function slug(text) {
  const s = String(text || '').normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48).replace(/-+$/, '');
  return s || 'event';
}

export function icsFilename(item, title) {
  const kind = slug(item && item.kind);
  const day = item && Number.isFinite(item.tMs) ? new Date(item.tMs).toISOString().slice(0, 10) : 'undated';
  return `${kind}-${slug(title || (item && item.record && item.record.name) || (item && item.label))}-${day}.ics`;
}

/**
 * The file. `title` and `description` are the row's own words (ui/next.js rowParts and rowText,
 * so the calendar says what the list said); `url` is the way back, left out when there is none.
 * Returns null for a row with no usable time. CRLF throughout, the last line included.
 */
export function toIcs(item, { title, description = '', url = '', nowMs = Date.now() } = {}) {
  const ev = icsEvent(item);
  if (!ev) return null;
  const name = String(title || (item.record && item.record.name) || item.label || 'Space Radar');
  const id = (item.record && item.record.id) || item.label || name;
  const text = [description, url].filter(Boolean).join('\n');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Space Radar//spaceradar.ai//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${slug(item.kind)}-${slug(id)}-${ev.allDay ? dateStamp(ev.startMs) : utcStamp(ev.startMs)}@spaceradar.ai`,
    `DTSTAMP:${utcStamp(nowMs)}`,
    ev.allDay ? `DTSTART;VALUE=DATE:${dateStamp(ev.startMs)}` : `DTSTART:${utcStamp(ev.startMs)}`,
    ev.allDay ? `DTEND;VALUE=DATE:${dateStamp(ev.endMs)}` : `DTEND:${utcStamp(ev.endMs)}`,
    `SUMMARY:${escapeText(name)}`,
  ];
  if (text) lines.push(`DESCRIPTION:${escapeText(text)}`);
  if (url) lines.push(`URL:${String(url).replace(/[\r\n]/g, '')}`);
  if (ev.alarm) {
    lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(name)}`, `TRIGGER:${ev.alarm}`, 'END:VALARM');
  }
  lines.push('END:VEVENT', 'END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}
