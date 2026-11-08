// tests/test_variables.mjs -- the famous variable stars (forge #142): data/variables.json, sky/variables.js,
// ui/varcurve.js's pure parts.
//
//   node tests/test_variables.mjs
//
// What it holds:
//   1. THE FILE: 58 stars from the GCVS, each with a place, a type, a range and a source; Betelgeuse, Mira, Algol,
//      delta Cephei and Eta Carinae among them; every one but Eta Carinae with a Hipparcos number for its card.
//   2. THE CLOCK: Algol is at its catalogue minimum (3.39) at a primary minimum and at maximum (2.12) at half phase;
//      Mira at maximum on its epoch; delta Cephei rises faster than it falls (M-m 25 %); beta Lyrae follows the
//      quadratic ephemeris; an irregular star has no clock value; nothing is brighter than its maximum or fainter
//      than its minimum.
//   3. THE GREAT DIMMING: Betelgeuse on 2020-02-15 is about 1.6, and that value is measured; in 2018 it is a sketch.
//   4. THE CARD: a record finds its row by Hipparcos number or name; the chart is a path inside its box with the
//      brighter magnitudes at the top; an eclipsing star's next minimum is within one period.
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const V = await import(join(ROOT, 'site/js/sky/variables.js'));
const C = await import(join(ROOT, 'site/js/ui/varcurve.js'));
const doc = JSON.parse(readFileSync(join(ROOT, 'site/data/variables.json'), 'utf8'));
const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const by = Object.fromEntries(doc.rows.map((r) => [r.id, r]));
const DAY = 86400e3;

// 1. the file
check(doc.rows.length === 58, `${doc.rows.length} stars`);
check(/GCVS/.test(doc.source), 'the file names its source');
for (const id of ['alf-ori', 'omi-cet', 'bet-per', 'del-cep', 'eta-car']) check(by[id], `${id} is in the file`);
for (const r of doc.rows) {
  check(Number.isFinite(r.ra) && Number.isFinite(r.dec) && Number.isFinite(r.max) && Number.isFinite(r.min) && r.min > r.max, `${r.id}: place and range`);
  check(r.hip > 0 || r.id === 'eta-car', `${r.id} has a Hipparcos number`);
}
const row = /\{id: variable_stars_bytes, value: (\d+)/.exec(budgets);
check(row && statSync(join(ROOT, 'site/data/variables.json')).size <= Number(row[1]), 'variables.json is within its budget');

// 2. the clock
const algol = by['bet-per'];
const minMs = V.msOfJd(algol.epochJd + 1000 * algol.periodD);
check(Math.abs(V.magAt(algol, minMs) - 3.39) < 0.01, `Algol at a minimum: ${V.magAt(algol, minMs)}`);
check(Math.abs(V.magAt(algol, minMs + algol.periodD * DAY / 2) - 2.12) < 0.01, 'Algol at half phase is at maximum');
check(V.magAt(algol, minMs + 2 * 3600e3) - 2.12 > 0.3, 'two hours from minimum Algol is still dim (the eclipse lasts about ten hours)');
check(Math.abs(V.magAt(algol, minMs + 6 * 3600e3) - 2.12) < 1e-6, 'six hours from minimum the eclipse is over');
const mira = by['omi-cet'];
check(Math.abs(V.magAt(mira, V.msOfJd(mira.epochJd)) - mira.max) < 1e-6, 'Mira at maximum on its epoch');
const cep = by['del-cep'];
const cMax = V.msOfJd(cep.epochJd);
const P = cep.periodD * DAY;
const slope = (a, b) => Math.abs(V.magAt(cep, cMax + b * P) - V.magAt(cep, cMax + a * P)) / (b - a);
check(slope(0.8, 0.95) > 2 * slope(0.3, 0.45), 'delta Cephei: a quick rise, a slow fall');
check(Math.abs(V.magAt(cep, cMax + 0.75 * P) - cep.min) < 0.01, 'delta Cephei is at minimum when its fall ends (three quarters of the period)');
const lyr = by['bet-lyr'];
check(lyr.quadratic && Math.abs(V.phaseAt(lyr, V.msOfJd(lyr.quadratic.t0))) < 1e-9, 'beta Lyrae: phase 0 at the ephemeris epoch');
const e100 = lyr.quadratic.t0 + 100 * lyr.quadratic.p0 + 1e4 * lyr.quadratic.q;
const ph = V.phaseAt(lyr, V.msOfJd(e100));
check(Math.min(ph, 1 - ph) < 1e-6, 'beta Lyrae: the 100th minimum where the quadratic ephemeris puts it');
check(V.magAt(by['alf-sco'], Date.now()) === null && V.magAt(by['eta-car'], Date.now()) === null, 'irregular stars have no clock value');
for (const r of doc.rows) {
  for (let k = 0; k < 40; k += 1) {
    const v = V.magAt(r, Date.UTC(2026, 0, 1) + k * 9.7 * DAY);
    if (v === null || r.measured) continue;
    if (v < r.max - 1e-6 || v > r.min + 1e-6) { problems.push(`${r.id} leaves its range: ${v}`); break; }
  }
}

// 3. the Great Dimming
const bet = by['alf-ori'];
const dim = V.magAt(bet, Date.UTC(2020, 1, 15));
check(dim > 1.5 && dim < 1.65 && V.honesty(bet, Date.UTC(2020, 1, 15)) === 'measured', `Betelgeuse on 2020-02-15: ${dim}`);
check(V.honesty(bet, Date.UTC(2018, 0, 1)) === 'modelled' && V.magAt(bet, Date.UTC(2018, 0, 1)) < 0.8, 'Betelgeuse in 2018 is a sketch of its usual brightness');

// 4. the card
check(C.variableFor(doc.rows, { id: 'hip-14576', meta: {} }) === algol, 'the card of HIP 14576 finds Algol');
check(C.variableFor(doc.rows, { id: 'x', name: 'Mira', meta: {} }) === mira, 'the card named Mira finds Mira');
check(C.variableFor(doc.rows, { id: 'hip-32349', name: 'Sirius', meta: { hip: 32349 } }) === null, 'Sirius has no curve');
const c = V.curve(algol, minMs + 3600e3, 120);
const g = C.chartOf(c, 320, 64);
check(g && /^M/.test(g.d) && g.nowY > 4 && g.nowY <= 60, 'the chart is a path in its box');
const ys = g.d.split(/[ML]/).filter(Boolean).map((p) => Number(p.split(',')[1]));
check(Math.min(...ys) >= 3.9 && Math.max(...ys) <= 60.1, 'the chart stays in its box');
check(g.nowY > 40, 'an hour from minimum Algol is drawn low (faint is down)');
const nm = V.nextMinimum(algol, minMs + 1000);
check(nm > minMs && nm - minMs <= algol.periodD * DAY + 2000, 'the next minimum is within one period');

if (problems.length) {
  console.error(`variables FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(`variables ok: ${doc.rows.length} stars from the GCVS; Algol ${V.magAt(algol, minMs).toFixed(2)} at minimum; Betelgeuse ${dim.toFixed(2)} on 2020-02-15 (measured)`);
