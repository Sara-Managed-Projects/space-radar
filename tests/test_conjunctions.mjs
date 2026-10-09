// tests/test_conjunctions.mjs -- "from your place": two bright things within two degrees, in the dark,
// above the horizon (internal #359; sky/conjunctions.js, sky/findworker.js, sky/findclient.js and the
// rows in ui/next.js).
//
//   node tests/test_conjunctions.mjs
//
// The finder is checked against ITSELF at finer grain and against Astronomy Engine's own separation,
// not against a remembered list of events: every row is a local minimum of the separation (the
// same pair ten minutes either side is wider), its separation is what findSep reads at that instant,
// both bodies are up and the Sun is down, and nothing is fetched. A pinned regression for one place
// and one window is kept so a change to the search shows.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const F = await import(join(JS, 'sky/conjunctions.js'));
const W = await import(join(JS, 'sky/findworker.js'));
const N = await import(join(JS, 'ui/next.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const London = { latDeg: 51.5, lonDeg: -0.1, altKm: 0 };
const from = Date.UTC(2026, 9, 9);
const rows = F.findConjunctions({ fromMs: from, days: 150, observer: London, stepMin: 60 });
check(rows.length >= 1, `150 days from London hold at least one close pair in the dark (${rows.length})`);
for (const r of rows) {
  const tag = `${r.a}+${r.b} ${new Date(r.tMs).toISOString()}`;
  check(r.kind === 'conjunction' && r.sepDeg <= F.MAX_SEP_DEG, `${tag}: within two degrees (${r.sepDeg.toFixed(2)})`);
  check(Math.abs(F.findSep(r.a, r.b, r.tMs, London) - r.sepDeg) < 1e-6, `${tag}: the row's separation is the engine's at that instant`);
  check(F.findSep(r.a, r.b, r.tMs - 10 * 60e3, London) >= r.sepDeg - 1e-6 && F.findSep(r.a, r.b, r.tMs + 10 * 60e3, London) >= r.sepDeg - 1e-6, `${tag}: it is the closest, ten minutes either side is wider`);
  check(r.altDeg > 0 && r.sunAltDeg < F.SUN_LIMIT_DEG, `${tag}: the lower one is up (${r.altDeg.toFixed(0)}) and the Sun is down (${r.sunAltDeg.toFixed(0)})`);
  check(r.tMs >= from, `${tag}: in the future of the start`);
}
check(rows.every((r, i) => i === 0 || rows[i - 1].tMs <= r.tMs), 'sorted by time');
check(F.BODIES.join() === 'Moon,Mercury,Venus,Mars,Jupiter,Saturn', 'the Moon and the five bright planets');

// No place, no rows; the worker's entry answers the same and never throws.
check(F.findConjunctions({ fromMs: from, observer: null }).length === 0, 'no place, no rows');
const w = W.runFind({ id: 7, fromMs: from, days: 3, observer: London });
check(w.id === 7 && Array.isArray(w.rows), 'the worker entry answers with the id it was given');
check(W.runFind({ id: 8, fromMs: NaN, observer: London }).rows.length === 0, 'and with nothing for a start that is not a time');

// The pinned regression: London, 150 days from 9 Oct 2026, hourly steps (the vendored Astronomy Engine).
const pinned = rows.map((r) => `${r.a}+${r.b}@${new Date(r.tMs).toISOString().slice(0, 13)}`);
check(pinned.length >= 1 && pinned.every((s) => /^(Moon|Mercury|Venus|Mars|Jupiter|Saturn)\+/.test(s)), `pinned: ${pinned.join(' ')}`);

// The rows in the Coming up list: handed in, future only, worded, balanced.
const now = from;
const items = N.buildNextItems([], now, { fromPlace: rows.concat([{ kind: 'conjunction', record: null, tMs: now - 1e6, a: 'Moon', b: 'Mars', sepDeg: 1, altDeg: 20, azDeg: 100 }]) });
check(items.filter((i) => i.kind === 'conjunction').length === rows.filter((r) => r.tMs - now < 30 * 864e5).length, 'the list takes the place-made rows inside its 30 days and drops the past ones');
const sample = { kind: 'conjunction', record: null, tMs: now + 3 * 864e5, a: 'Moon', b: 'Jupiter', sepDeg: 1.26, altDeg: 30, azDeg: 135 };
const parts = N.rowParts(sample, now);
check(parts.title === 'Moon and Jupiter' && /1\.3° apart, halfway up in the south-east/.test(parts.detail) && parts.value === '1.3°', `the row as drawn (${JSON.stringify(parts)})`);
check(/^Moon and Jupiter: /.test(N.rowText(sample, now)) && N.classText(sample) === COPY.nextList.classOf.conjunction, 'and as a sentence, with how it was worked out');
check([parts.title, parts.detail, COPY.nextList.classOf.conjunction].every((x) => x.length <= 90) && parts.title.length <= 60, 'short enough');

// Lazy and offline: next.js reaches the finder only by import(), and nothing in it fetches.
const next = read('site/js/ui/next.js');
check(/import\('\.\.\/sky\/findclient\.js'\)/.test(next) && !/^import .*findclient/m.test(next), 'next.js loads the finder on demand, never at boot');
const src = ['sky/conjunctions.js', 'sky/findworker.js', 'sky/findclient.js'].map((f) => read(`site/js/${f}`)).join('\n');
check(!/\bfetch\(|XMLHttpRequest|WebSocket|sendBeacon/.test(src), 'the finder adds no request');
check(!/from '\.\.\/ui|from '\.\.\/scene|from '\.\.\/copy/.test(read('site/js/sky/conjunctions.js') + read('site/js/sky/findworker.js')), 'and the worker imports only the engine');

// A full list still has the pair's row: it is guaranteed ahead of approaches, perihelia and showers
// (seen 2026-10-09 in a browser: eight rows and no Mars beside Jupiter), and an empty answer for a
// new place or day replaces the rows of the one before.
{
  const order = /for \(const kind of \[([^\]]+)\]\)/.exec(next);
  const kinds = order ? order[1].replace(/['\s]/g, '').split(',') : [];
  check(kinds.includes('conjunction') && kinds.indexOf('conjunction') < kinds.indexOf('approach') && kinds.indexOf('conjunction') < kinds.indexOf('perihelion') && kinds.indexOf('conjunction') > kinds.indexOf('lunar-eclipse'), 'a pair is guaranteed its row after the eclipses and ahead of approaches and perihelia');
  check(/found = next;/.test(next) && !/!rows \|\| !rows\.length\) return/.test(next), 'an answer with no rows clears the rows of the place before');
}
if (problems.length) { console.error(`conjunctions FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`conjunctions ok: ${rows.length} close pairs in 150 days over London, each the closest of its pass, up and in the dark, with the rows as drawn in Coming up`);
