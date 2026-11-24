// tests/test_tonight_slot.mjs -- the platform's Tonight slot (internal research #549): slotRows turns tonight's best into
// the rows the platform's "I saw it" checklist ticks (the passport's own ids, degrees, the names this list shows, and only
// whether the place is a guess), and the Tonight view builds an empty hidden `[data-sr-tonight]` slot.
//
//   TZ=UTC node tests/test_tonight_slot.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

process.env.TZ = 'UTC';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { slotRows } = await import(join(JS, 'ui/tonight.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const R = Math.PI / 180;
const t0 = Date.UTC(2026, 10, 24, 18, 30);

const best = {
  window: { startMs: t0 - 3600e3, endMs: t0 + 9 * 3600e3, darkNow: false },
  rows: [
    { kind: 'pass', id: `sat-25544:${t0}`, score: 90, whenMs: t0, pass: { recordId: 'sat-25544', record: { id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station' }, startMs: t0, endMs: t0 + 6 * 60e3, startAz: 225 * R, endAz: 60 * R, peakEl: 52 * R, peakMs: t0 + 3 * 60e3, sunlit: true } },
    { kind: 'planet', id: 'jupiter', bestMs: t0 + 3600e3, altDeg: 61.2, azDeg: 170, mag: -2.6 },
    { kind: 'moon', id: 'moon', phase: 'waxingGibbous', percent: 78, bestMs: t0 + 1800e3, altDeg: 30, azDeg: 140, upAtStart: true, setMs: t0 + 5 * 3600e3 },
    { kind: 'shower', id: 'geminids', shower: { id: 'geminids', display: 'Geminids', zhr: 120 }, bestMs: t0 + 4 * 3600e3, altDeg: 55, azDeg: 100 },
    { kind: 'dso', id: 'm31', name: 'Andromeda Galaxy', mag: 3.4, bestMs: t0 + 2 * 3600e3, altDeg: 70, azDeg: 90, needs: 'eye' },
  ],
};
const out = slotRows(best, { source: 'guess', latDeg: 52.1, lonDeg: 4.3 }, t0);
check(out && Array.isArray(out.rows) && out.rows.length === 5, 'five rows in, five rows out');
const byId = Object.fromEntries((out.rows || []).map((r) => [r.id, r]));
check(Object.keys(byId).join() === 'sat-25544,jupiter,moon,shower-geminids,dso-m31', `the passport's ids (${Object.keys(byId)})`);
const pass = byId['sat-25544'];
check(pass && pass.kind === 'pass' && pass.whenMs === t0 && pass.endMs === t0 + 6 * 60e3, 'a pass: its start and end');
check(pass && Math.abs(pass.altDeg - 52) < 1e-9 && Math.abs(pass.azDeg - 225) < 1e-9, 'a pass: degrees, not radians');
check(byId.jupiter && byId.jupiter.altDeg === 61.2 && byId.jupiter.azDeg === 170 && byId.jupiter.mag === -2.6 && byId.jupiter.whenMs === t0 + 3600e3, 'a planet: time, degrees and magnitude as they are');
check(byId.moon && byId.moon.kind === 'moon' && byId.moon.percent === 78, 'the Moon: its percent');
check(byId['shower-geminids'] && byId['shower-geminids'].kind === 'shower' && byId['shower-geminids'].zhr === 120, 'a shower: shower-<id> and its rate');
check(byId['dso-m31'] && byId['dso-m31'].kind === 'deep' && byId['dso-m31'].how === 'eye' && byId['dso-m31'].name === 'Andromeda Galaxy', 'a deep-sky object: dso-<id>, kind deep, how to see it, its name');
check((out.rows || []).every((r) => typeof r.name === 'string' && r.name.length > 0), 'every row carries the name this list shows');
check(out.nowMs === t0 && out.window && out.window.startMs === best.window.startMs && out.window.endMs === best.window.endMs && !('darkNow' in out.window), 'the night window and now');
check(out.observer && out.observer.source === 'guess' && Object.keys(out.observer).join() === 'source', 'the place is never handed over: only that it is a guess');
check(slotRows(best, { source: 'gps', latDeg: 1, lonDeg: 2 }, t0).observer.source === 'set', 'any other place is "set", with no coordinates');
check(Object.keys(slotRows(best, { source: 'set' }, t0).observer).join() === 'source', 'an observer with only source: still only source');
check(slotRows(best, null, t0).observer.source === 'set', 'no observer: set');
check(!/52\.1|4\.3/.test(JSON.stringify(out)), 'no coordinate anywhere in the rows');
const empty = slotRows(null, null, t0);
check(empty.rows.length === 0 && empty.window === null, 'no best: no rows, no window, no throw');
check(slotRows({ rows: [{ kind: 'pass', pass: {} }, { kind: 'comet', id: 'x' }, { kind: 'pass' }] }, null, t0).rows.length === 0, 'a pass with no id and an unknown kind are left out');

// --- the slot in the view: empty, hidden, no control of its own ----------------------------------------------
const src = readFileSync(join(JS, 'ui/tonight.js'), 'utf8');
check(/setAttribute\('data-sr-tonight', ''\)/.test(src) && /tonightSlot\.hidden = true/.test(src), 'the slot is built empty and hidden');
check(/tonightSlot\.srTonight = \(\) => slotRows\(/.test(src), 'slot.srTonight() hands the platform the list\'s rows');
check(/new CustomEvent\('sr:slot', \{ detail: \{ slot: 'tonight', el: tonightSlot \} \}\)/.test(src), 'sr:slot {slot: tonight, el} says it is built');
check(/window\.dispatchEvent\(new CustomEvent\('sr:tonight'\)\)/.test(src), 'sr:tonight says the list was worked out again');
const slotBlock = src.slice(src.indexOf('const tonightSlot'), src.indexOf("document.dispatchEvent(new CustomEvent('sr:slot'"));
check(!/button|input|tabindex|addEventListener|innerHTML|textContent/.test(slotBlock), 'the slot has no control, no text and no handler of its own');

if (problems.length) { console.error('tonight slot FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('tonight slot ok: slotRows gives passport ids, degrees, names and only whether the place is a guess; the slot is empty, hidden and control-free');
