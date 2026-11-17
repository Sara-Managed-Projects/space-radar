// A name is a target for what it names (the owner, 17 Nov 2026: the highlighted names round the Earth could not be
// clicked; a click on the letters or the swatch opened the Earth). scene/pickrank.js labelAt and withLabel, and
// that main.js asks them before the canvas decision and ui/labels.js gives each box its record.
import { readFileSync } from 'node:fs';
import { labelAt, withLabel, LABEL_PAD } from '../site/js/scene/pickrank.js';
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.error('FAIL:', m); } };
const soyuz = { id: 'launch-1', name: 'Soyuz 2.1b | Progress MS-36' };
const earth = { id: 'earth', name: 'Earth', klass: 'world' };
// The live box measured on 17 Nov: the name 196 x 28 px above its mark at (766, 134).
const boxes = [{ x: 766, y: 134, left: 668, right: 864, top: 102, bottom: 130, record: soyuz }];
ok(labelAt(boxes, 683, 116) === soyuz, 'the swatch at the left end of the name is the launch');
ok(labelAt(boxes, 766, 116) === soyuz, 'the middle of the letters is the launch');
ok(labelAt(boxes, 766, 134) === null, 'the mark below the name is not the name (the canvas decision takes it)');
ok(labelAt(boxes, 870, 116) === null && labelAt(boxes, 870, 116, 6) === soyuz, 'a finger reaches a little past the box');
ok(LABEL_PAD.mouse === 0 && LABEL_PAD.touch > 0, 'a finger has a margin, a mouse none');
ok(labelAt([], 1, 1) === null && labelAt(null, 1, 1) === null && labelAt(boxes, NaN, 1) === null, 'nothing, or no point, is no name');
ok(labelAt([{ left: 0, right: 10, top: 0, bottom: 10 }], 5, 5) === null, 'a box with no record names nothing');
const two = [{ left: 0, right: 20, top: 0, bottom: 10, record: earth }, { left: 15, right: 40, top: 0, bottom: 10, record: soyuz }];
ok(labelAt(two, 17, 5) === soyuz, 'where two touch, the one placed last (drawn on top) wins');
const d = withLabel({ winner: earth, list: [{ record: earth, kind: 'disc', tier: 'local', on: true }, { record: soyuz, kind: 'glyph', tier: 'local', px: 9 }], ambiguous: true }, soyuz);
ok(d.winner === soyuz && d.list[0].record === soyuz && d.list[0].kind === 'label' && d.list.length === 2 && d.list[1].record === earth && d.ambiguous === false,
  'the named record wins, is not listed twice, and the rest stays after it');
ok(withLabel(null, soyuz).winner === soyuz, 'a name over empty sky is still its thing');
const main = readFileSync(new URL('../site/js/main.js', import.meta.url), 'utf8');
ok(/const named = labelAt\(labels\.boxes\(\)/.test(main) && /named \? withLabel\(d, named\) : d/.test(main), 'main.js decisionAt asks the names first');
const labels = readFileSync(new URL('../site/js/ui/labels.js', import.meta.url), 'utf8');
ok(/bottom: y - 0\.4 \* bh, record: c\.record \}/.test(labels), 'ui/labels.js gives each box its record');
if (bad) { console.error(`test_label_pick: ${bad} problem(s)`); process.exit(1); }
console.log('label pick ok: a click or tap on a name (its letters or its swatch) opens what it names, before the Earth behind it');
