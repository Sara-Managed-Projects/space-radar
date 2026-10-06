// tests/test_ics.mjs -- public #235: one row of Coming up as an RFC 5545 file (data/ics.js).
// Escaping, folding at 75 octets, CRLF, UTC against DATE, one alarm, and every kind of row.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { toIcs, icsEvent, offersIcs, icsFilename, escapeText, foldLine, utcStamp, dateStamp } = await import(join(JS, 'data/ics.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const T = Date.UTC(2026, 9, 9, 14, 5, 0);
const NOW = Date.UTC(2026, 9, 7, 8, 0, 0);
const bytes = (s) => new TextEncoder().encode(s).length;
const unfold = (s) => s.replace(/\r\n /g, '');
const prop = (ics, name) => { const m = unfold(ics).split('\r\n').find((l) => l.startsWith(`${name}:`) || l.startsWith(`${name};`)); return m || null; };

// The four rules.
check(escapeText('a, b; c\\d\ne\r\nf') === 'a\\, b\; c\\\\d\\ne\\nf', `commas, semicolons, backslashes and newlines are escaped (${escapeText('a, b; c\\d\ne\r\nf')})`);
check(utcStamp(T) === '20261009T140500Z' && dateStamp(T) === '20261009', 'a moment is UTC with a Z; a day is eight digits');
{
  const long = `DESCRIPTION:${'Falcon 9 · Starlink — é'.repeat(12)}`;
  const folded = foldLine(long);
  const parts = folded.split('\r\n');
  check(parts.length > 1 && parts.every((l) => bytes(l) <= 75), `no folded line is over 75 octets (${Math.max(...parts.map(bytes))})`);
  check(parts.slice(1).every((l) => l.startsWith(' ')), 'every continuation begins with one space');
  check(unfold(folded) === long, 'and unfolding gives the line back, no character cut in half');
  check(foldLine('SUMMARY:short') === 'SUMMARY:short', 'a short line is left alone');
  check(foldLine('x'.repeat(75)).indexOf('\r\n') < 0 && foldLine('x'.repeat(76)).split('\r\n').length === 2, '75 octets fit; the 76th starts a new line');
}

// A firm launch, with its window.
const launch = { kind: 'launch', tMs: T, precision: 'Minute', record: { id: 'launch-abc', name: 'Falcon 9 | Starlink, Group 10; 4', ascent: { windowEndMs: T + 4 * 3600e3 } } };
{
  const ics = toIcs(launch, { title: launch.record.name, description: 'Planned for tomorrow 14:05, and a launch can slip.', url: 'https://www.spaceradar.ai/#at=launch-abc', nowMs: NOW });
  check(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:') && ics.endsWith('END:VEVENT\r\nEND:VCALENDAR\r\n'), 'one calendar, version 2.0, closed, the last line ended');
  check(!/[^\r]\n/.test(ics) && !/\r[^\n]/.test(ics), 'every line break is CRLF');
  check(ics.split('\r\n').every((l) => bytes(l) <= 75), 'no line over 75 octets');
  check((ics.match(/BEGIN:VEVENT/g) || []).length === 1 && (ics.match(/BEGIN:VALARM/g) || []).length === 1, 'one event, one alarm');
  check(prop(ics, 'DTSTART') === 'DTSTART:20261009T140500Z' && prop(ics, 'DTEND') === 'DTEND:20261009T180500Z', `UTC start, and the end of the launch window (${prop(ics, 'DTEND')})`);
  check(prop(ics, 'DTSTAMP') === 'DTSTAMP:20261007T080000Z', 'stamped when it was made');
  check(prop(ics, 'SUMMARY') === 'SUMMARY:Falcon 9 | Starlink\\, Group 10\; 4', `the title escaped (${prop(ics, 'SUMMARY')})`);
  check(prop(ics, 'DESCRIPTION') === 'DESCRIPTION:Planned for tomorrow 14:05\\, and a launch can slip.\\nhttps://www.spaceradar.ai/#at=launch-abc', `the row's sentence, then the link back (${prop(ics, 'DESCRIPTION')})`);
  check(prop(ics, 'URL') === 'URL:https://www.spaceradar.ai/#at=launch-abc', 'and the link as a URL');
  check(/TRIGGER:-P1D\r\n/.test(ics) && /ACTION:DISPLAY\r\n/.test(ics), 'a launch reminds a day before');
  check(/^UID:launch-launch-abc-20261009T140500Z@spaceradar\.ai$/m.test(unfold(ics).replace(/\r/g, '')), 'a stable UID from the event and its start');
  check(toIcs(launch, { title: 'x', nowMs: NOW }) === toIcs(launch, { title: 'x', nowMs: NOW }), 'the same row twice is the same file');
  const bare = toIcs(launch, { nowMs: NOW });
  check(bare && !/\r\nURL:/.test(bare) && !/\r\nDESCRIPTION:[^F]/.test(bare.replace(/BEGIN:VALARM[\s\S]*END:VALARM/, '')), 'no link, no URL line: none is invented');
}
// A window of days is a placeholder, not a window.
check(icsEvent({ ...launch, record: { ...launch.record, ascent: { windowEndMs: T + 40 * 3600e3 } } }).endMs === T + 3600e3, 'a launch window longer than twelve hours is not believed: +1 h');
// A rough launch and a shower are days, not minutes.
for (const item of [{ kind: 'launch', tMs: T, precision: 'Month', record: { id: 'l2', name: 'Vulcan' } }, { kind: 'shower', tMs: T, label: 'Orionids' }]) {
  const ics = toIcs(item, { title: item.label || item.record.name, nowMs: NOW });
  check(prop(ics, 'DTSTART') === 'DTSTART;VALUE=DATE:20261009' && prop(ics, 'DTEND') === 'DTEND;VALUE=DATE:20261010', `${item.kind}: an all-day DATE, never a made-up minute (${prop(ics, 'DTSTART')})`);
  check(!/T140500Z/.test(ics.replace(/DTSTAMP:.*/, '')), `${item.kind}: the clock time is nowhere in it`);
}
// A pass: ten minutes, and fifteen minutes' warning.
{
  const pass = { kind: 'pass', tMs: T, record: { id: 'sat-25544', name: 'ISS (ZARYA)' } };
  const ics = toIcs(pass, { title: 'International Space Station', nowMs: NOW });
  check(prop(ics, 'DTEND') === 'DTEND:20261009T141500Z' && /TRIGGER:-PT15M\r\n/.test(ics), 'a pass is ten minutes, with the alarm fifteen minutes before');
  check(/TRIGGER:-PT15M/.test(toIcs({ kind: 'train', tMs: T, count: 22 }, { title: 'A train', nowMs: NOW })) && icsEvent({ kind: 'train', tMs: T }).endMs === T + 20 * 60e3, 'a train twenty, the same warning');
}
// Every kind of row, and the ones with no file.
for (const kind of ['launch', 'approach', 'perihelion', 'shower', 'aurora', 'pass', 'train', 'solar-eclipse', 'lunar-eclipse']) {
  const ics = toIcs({ kind, tMs: T, label: 'x' }, { title: 'x', nowMs: NOW });
  check(typeof ics === 'string' && (ics.match(/BEGIN:VALARM/g) || []).length === 1 && offersIcs({ kind, tMs: T }), `${kind}: a file with one alarm`);
}
check(/TRIGGER:-PT1H/.test(toIcs({ kind: 'aurora', tMs: T, kp: 6 }, { title: 'Aurora', nowMs: NOW })), 'a forecast aurora reminds an hour before');
check(icsEvent({ kind: 'solar-eclipse', tMs: T }).endMs === T + 2 * 3600e3, 'an eclipse is two hours round its global peak');
check(!offersIcs({ kind: 'aurora', tMs: T, now: true }) && toIcs({ kind: 'aurora', tMs: T, now: true }, {}) === null, 'an aurora under way offers no file');
check(!offersIcs(null) && !offersIcs({ kind: 'launch', tMs: NaN }) && !offersIcs({ kind: 'nonsense', tMs: T }) && toIcs(null) === null, 'no time, or no such kind: no file, and no throw');
// The file's name.
check(icsFilename(launch, launch.record.name) === 'launch-falcon-9-starlink-group-10-4-2026-10-09.ics', `a name every file system takes (${icsFilename(launch, launch.record.name)})`);
check(icsFilename({ kind: 'pass', tMs: T }, 'Tiāngōng / 天宫') === 'pass-tiangong-2026-10-09.ics' && icsFilename({ kind: 'shower', tMs: T }, '!!!') === 'shower-event-2026-10-09.ics', 'accents folded, other scripts dropped, never empty');
// Pure: no DOM, no fetch, no storage, no copy.
{
  const src = readFileSync(join(JS, 'data/ics.js'), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  check(!/\b(document|window|fetch|localStorage|navigator)\b/.test(src) && !/^import /m.test(src), 'the builder touches no DOM, no network and no storage, and imports nothing');
}

if (problems.length) { console.error('ics FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('ics ok: one VEVENT per row, CRLF, folded at 75 octets, text escaped, UTC for a moment and DATE for a day, one alarm (15 minutes for a pass), no file for an aurora under way');
