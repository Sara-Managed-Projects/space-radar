// tests/test_labels.mjs -- spec 0026 req 5: a few names over the scene, never the catalogue.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { chooseLabels, labelName, isNotable, clampLabelX, LABEL_EDGE_PAD, LABEL_CAP, NOTABLE_CAP } = await import(join(JS, 'ui/labels.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const rec = (id, klass = 'satellite', meta = {}) => ({ id, name: id.toUpperCase(), klass, layer: 'x', meta });
// the selection always comes first, even when it is farthest
const sel = { record: rec('sel'), kind: 'selection', x: 100, y: 100, dist: 99 };
const near = { record: rec('n1', 'satellite', { why: 'x' }), kind: 'notable', x: 300, y: 300, dist: 1 };
check(chooseLabels([near, sel])[0].record.id === 'sel', 'the selection is first');
// a train follows the selection, before notable
const train = { record: rec('t1'), kind: 'train', x: 500, y: 500, dist: 50 };
check(chooseLabels([near, train, sel]).map((c) => c.record.id).join(',') === 'sel,t1,n1', 'selection, train, notable');
// 24 px dedupe: a notable 10 px from the selection is dropped
const clash = { record: rec('c'), kind: 'notable', x: 108, y: 104, dist: 2 };
check(!chooseLabels([sel, clash]).some((c) => c.record.id === 'c'), 'a label within 24 px of another is dropped');
// the caps: 40 notable in -> 10 out; 40 notable + selection + 5 train -> 12 total
const many = Array.from({ length: 40 }, (_, i) => ({ record: rec(`m${i}`), kind: 'notable', x: 50 + i * 40, y: 400, dist: i }));
check(chooseLabels(many).length === NOTABLE_CAP, `at most ${NOTABLE_CAP} notable labels (${chooseLabels(many).length})`);
const trains = Array.from({ length: 5 }, (_, i) => ({ record: rec(`tr${i}`), kind: 'train', x: 50 + i * 40, y: 700, dist: i }));
const all = chooseLabels([...many, ...trains, sel]);
check(all.length === LABEL_CAP && all[0].kind === 'selection' && all.filter((c) => c.kind === 'train').length === 5, `the cap is ${LABEL_CAP} with the selection and the whole train kept (${all.length})`);
// nearest notable first
const far = { record: rec('far'), kind: 'notable', x: 10, y: 10, dist: 500 };
const close = { record: rec('close'), kind: 'notable', x: 700, y: 10, dist: 5 };
check(chooseLabels([far, close])[0].record.id === 'close', 'notable labels are nearest first');
// bad input never throws
check(chooseLabels(null).length === 0 && chooseLabels([{ record: null }, { record: rec('q'), kind: 'notable', x: NaN, y: 1 }]).length === 0, 'bad candidates are dropped, not thrown on');
// names and notability
check(labelName({ id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', meta: { noradId: 25544 } }) === 'International Space Station', 'the ISS is named as people name it');
check(labelName({ id: 'x', name: 'SOME CUBESAT', klass: 'satellite', meta: {} }) === 'SOME CUBESAT', 'a plain record keeps its catalogue name');
check(isNotable({ klass: 'satellite', meta: { why: 'because' } }) && isNotable({ klass: 'world', meta: {} }) && isNotable({ klass: 'station', meta: {} }) && !isNotable({ klass: 'debris', meta: {} }), 'notable = a hand-kept reason, a world, or a station');
check(labelName({ name: 'A'.repeat(60), meta: {} }).length <= 34, 'a long name is cut for the label');

// A LABEL IS CENTRED ON WHAT IT NAMES, so half of it hangs past that point, and only the anchor
// used to be kept on screen. Measured on a 375 px phone, 2026-09-20: a label ran 311..407 -- a
// third of the name off the right edge. The numbers below are that case and its mirror.
{
  const W = 375;
  const box = 96; // the label that overflowed
  const at = (x) => clampLabelX(x, box, W);
  check(at(359) === W - box / 2 - LABEL_EDGE_PAD, `a label anchored near the right edge slides in: ${at(359)}`);
  check(at(359) + box / 2 <= W, `the whole box fits: right edge at ${at(359) + box / 2} of ${W}`);
  check(at(2) - box / 2 >= 0, `a label at the left edge fits too: left edge at ${at(2) - box / 2}`);
  check(at(180) === 180, 'a label with room on both sides is not moved');
  // Wider than the window: it cannot fit, so it starts at the left edge -- the beginning of a name
  // is the part worth keeping.
  check(clampLabelX(300, 500, W) - 250 <= LABEL_EDGE_PAD, 'a label wider than the window starts at the left edge');
  // Garbage in: the caller has a NaN projection now and then, and this must not turn it into 4.
  check(Number.isNaN(clampLabelX(NaN, box, W)), 'a NaN anchor stays NaN rather than being placed at the edge');
  check(Number.isFinite(clampLabelX(100, undefined, W)), 'a label whose width is not known yet is still placed');
}

if (problems.length) { console.error('labels FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`labels ok: selection, then its train, then at most ${NOTABLE_CAP} nearest notable; 24 px dedupe; never the catalogue; and the box stays on screen`);
