// tests/test_trains.mjs -- spec 0026 req 17: a fresh launch's satellites as one train.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { trainsFrom, trainOf, phaseOf, meanAltitudeKm } = await import(join(JS, 'data/trains.js'));
const { trainSentence } = await import(join(JS, 'ui/cards.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const now = Date.parse('2026-09-08T12:00:00Z');
const jd = now / 86400e3 + 2440587.5;
// members of one launch, at 380 km, spaced along the orbit; `mo` is the phase at epoch = now
const sat = (id, moDeg, alt = 380, desig = '2026-160') => ({
  id, name: id.toUpperCase(), layer: 'starlink-trains', klass: 'satellite',
  satrec: { mo: moDeg * Math.PI / 180, argpo: 0, no: 0.0676, jdsatepoch: jd },
  meta: { launchDesignator: desig, perigeeKm: alt - 5, apogeeKm: alt + 5 },
});
const recs = [sat('a', 10), sat('b', 350), sat('c', 20), sat('d', 5), sat('lone', 90, 550, '2026-001')];
const trains = trainsFrom(recs, now, { stillRaisingBelowKm: 500 });
check(trains.length === 1 && trains[0].designator === '2026-160' && trains[0].count === 4, `one train of four; a lone satellite is no train (${trains.length})`);
check(trains[0].lead.id === 'c', `the member farthest along leads -- c at 20°, with b at 350° counted as behind, not 330° ahead (${trains[0].lead.id})`);
check(trains[0].members.map((r) => r.id).join(',') === 'c,a,d,b', `ordered lead first (${trains[0].members.map((r) => r.id)})`);
check(trains[0].stillRaising === true && trains[0].meanAltKm === 380, 'at 380 km it is still climbing');
const high = trainsFrom([sat('x', 0, 550), sat('y', 10, 550)], now, { stillRaisingBelowKm: 500 })[0];
check(high.stillRaising === false, 'at 550 km it has spread out');
check(trainOf(recs[3], recs, now).lead.id === 'c', 'trainOf finds the record\'s own train');
check(trainOf({ meta: {} }, recs, now) === null, 'no designator, no train');
check(Math.abs(meanAltitudeKm({ satrec: { no: 0.0676 } }) - 400) < 60, `mean height from mean motion is about 400 km for the ISS's rate (${meanAltitudeKm({ satrec: { no: 0.0676 } }).toFixed(0)})`);
check(phaseOf({ satrec: {} }, now) === null, 'a satrec without elements has no phase');
// the words
const s1 = trainSentence(recs[3], trains[0]);
check(s1.includes('One of 4 launched together (2026-160)') && s1.includes('C leads; this one is 3 in the line') && s1.includes('Still climbing'), `the card's words: ${s1}`);
check(trainSentence(recs[2], trains[0]).includes('This one leads.'), 'the lead is told it leads');
check(trainSentence(recs[0], null) === null, 'no train, no words');
// the registry carries the threshold and the browser reads it
const row = LAYERS.find((l) => l.id === 'starlink-trains');
check(row && row.train && row.train.still_raising_below_km === 500, 'the threshold is a registry field on the layer');

if (problems.length) { console.error('trains FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trains ok: grouped by launch, the lead by orbital phase with wrap handled, still climbing below the registry threshold, words on the card');
