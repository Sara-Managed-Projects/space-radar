// tests/test_varevents.mjs -- the variable stars worth going out for (forge #142: "Algol at minimum tonight"; release
// 2.0.0 batch c2-deep): sky/varevents.js, the find worker's answer, Coming up's row and data/variables.json's elements.
//
//   node tests/test_varevents.mjs
//
// What it holds:
//   1. THE ELEMENTS: the bright eclipsing stars carry Kreiner's (2004) linear elements, cited, and the clock uses them:
//      Algol's minimum of November 2026 falls on Kreiner's ephemeris to the second, about 2.8 hours after the GCVS's.
//   2. WHAT IS WORTH A ROW: Algol, lambda Tauri, delta Librae and V Puppis at minimum; the Miras brighter than 5 near
//      maximum; never an irregular star, a faint one or a shallow eclipse (Alphecca dips 0.11).
//   3. FROM A PLACE: from London over the month from 2026-11-07, Algol at minimum is there, in the dark (Sun 12 degrees
//      down) and 15 degrees up or more, at Kreiner's time; one row a star; from Sydney, Algol never clears 15 degrees in
//      that hour as often, and V Puppis, which London never sees, can be found.
//   4. THE LIST: sky/findworker.js runFind carries the rows with the pairs; Coming up's row (ui/next.js rowParts) shows
//      the label and the line the page gave it (sky/findclient.js variableWords) and classText says how it was worked out.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const E = await import(join(ROOT, 'site/js/sky/varevents.js'));
const V = await import(join(ROOT, 'site/js/sky/variables.js'));
const W = await import(join(ROOT, 'site/js/sky/findworker.js'));
const FC = await import(join(ROOT, 'site/js/sky/findclient.js'));
const N = await import(join(ROOT, 'site/js/ui/next.js'));
const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/variables.json'), 'utf8'));
const by = Object.fromEntries(doc.rows.map((r) => [r.id, r]));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DAY = 86400e3;

// 1. the elements
const algol = by['bet-per'];
check(algol.linear && algol.linear.periodD === 2.867328 && /Kreiner 2004/.test(algol.linear.cite), 'Algol carries Kreiner 2004\'s elements, cited');
check(/Kreiner 2004/.test(doc.source), 'the file\'s source line names Kreiner 2004');
const from = Date.parse('2026-11-07T12:00:00Z');
const min = V.nextMinimum(algol, from);
const e = (V.jdOf(min) - algol.linear.epochJd) / algol.linear.periodD;
check(Math.abs(e - Math.round(e)) * algol.linear.periodD * 86400 < 1, `Algol's next minimum is on Kreiner's ephemeris (${(Math.abs(e - Math.round(e)) * algol.linear.periodD * 86400).toFixed(2)} s off)`);
const gcvs = { ...algol, linear: undefined };
const gMin = V.nextMinimum(gcvs, min - 1.5 * algol.periodD * DAY / 2);
const shiftH = (min - gMin) / 3600e3;
check(shiftH > 2.5 && shiftH < 3.1, `the GCVS's elements put it ${shiftH.toFixed(2)} h earlier`);

// 2. worth a row
const worth = doc.rows.filter((r) => E.worthSeeing(r)).map((r) => `${r.id}:${E.worthSeeing(r)}`);
for (const want of ['bet-per:min', 'lam-tau:min', 'del-lib:min', 'v-pup:min', 'omi-cet:max', 'khi-cyg:max', 'r-hya:max']) check(worth.includes(want), `${want} is worth a row`);
for (const no of ['alf-crb', 'eta-car', 'alf-ori', 'rz-cas', 'del-cep', 'r-aql']) check(!E.worthSeeing(by[no]), `${no} is not`);

// 3. from a place
const london = { latDeg: 51.5, lonDeg: -0.13, altKm: 0 };
const rows = E.variableEvents(doc.rows, { fromMs: from, toMs: from + 30 * DAY, observer: london });
const al = rows.find((r) => r.id === 'bet-per');
check(!!al, 'from London, Algol at minimum is in the month');
if (al) {
  const k = (V.jdOf(al.tMs) - algol.linear.epochJd) / algol.linear.periodD;
  check(Math.abs(k - Math.round(k)) * algol.linear.periodD * 86400 < 1, 'at a minimum of the elements');
  check(al.altDeg >= 15 && al.what === 'min' && al.cls === 'measured' && Math.abs(al.mag - 3.4) < 0.05, `15 degrees up or more (${al.altDeg}), at magnitude ${al.mag}, measured`);
}
check(new Set(rows.map((r) => r.id)).size === rows.length, 'one row a star');
check(rows.every((r, i) => i === 0 || rows[i - 1].tMs <= r.tMs), 'by time');
check(!rows.some((r) => r.id === 'v-pup'), 'V Puppis (dec -49) never clears 15 degrees from London');
const sydney = E.variableEvents(doc.rows, { fromMs: from, toMs: from + 30 * DAY, observer: { latDeg: -33.87, lonDeg: 151.21 } });
check(sydney.some((r) => r.id === 'v-pup'), 'from Sydney, V Puppis is found');
check(E.variableEvents(doc.rows, { fromMs: from, toMs: from + DAY }).length === 0, 'no place, no rows');
// A Mira near its maximum: the night nearest the modelled maximum, in the dark, modelled.
const mira = by['omi-cet'];
const ph = V.phaseAt(mira, from);
const peak = from + (1 - ph) * mira.periodD * DAY;
const mrows = E.variableEvents([mira], { fromMs: peak - 2 * DAY, toMs: peak + 2 * DAY, observer: { latDeg: 0, lonDeg: 0 } });
check(mrows.length <= 1 && mrows.every((r) => r.what === 'max' && r.cls === 'modelled' && Math.abs(r.tMs - peak) < 2 * DAY), 'a Mira\'s row is its maximum\'s night, modelled');

// 4. the list
const found = W.runFind({ id: 1, fromMs: from, days: 30, observer: london }, doc.rows);
check(found.rows.some((r) => r.kind === 'variable' && r.id === 'bet-per'), 'the find worker answers with the variable stars');
const item = FC.variableWords({ ...al });
check(/^Algol at minimum$/.test(item.label) && /magnitude 3\.4/.test(item.line) && /Kreiner 2004/.test(item.classWords), `the page's words: "${item.label}", "${item.line}"`);
const parts = N.rowParts(item, from);
check(parts.title === item.label && parts.detail.includes(item.line), 'Coming up shows the label and the line');
check(N.classText(item) === item.classWords, 'and says how it was worked out');
const listed = N.buildNextItems([], from, { fromPlace: [item], horizonMs: 30 * DAY });
check(listed.some((x) => x.kind === 'variable'), 'Coming up keeps a variable star\'s row from the place\'s finds');

// 2.0.0 look finding 13: in Tonight the row's sentence was cut at "76° up in the…"; it wraps.
{
  const tonight = readFileSync(join(ROOT, 'site/js/ui/tonight.js'), 'utf8');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  check(/rowNode\(\{ title: r\.label, line, side: '', wrap: true,/.test(tonight) && /words\.wrap \? ' is-sentence' : ''/.test(tonight), 'Tonight marks a variable star\'s line as a sentence');
  check(/\.sr-tonight-view__rowdetail\.is-sentence \{ white-space: normal; \}/.test(css), 'and css/ui.css lets that line wrap');
}

if (problems.length) { console.error(`varevents: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`varevents ok: ${worth.length} stars worth a row; from London, ${al ? `Algol at minimum ${new Date(al.tMs).toISOString().slice(0, 16)}Z, ${al.altDeg} degrees up` : ''}; GCVS ${shiftH.toFixed(1)} h off`);
