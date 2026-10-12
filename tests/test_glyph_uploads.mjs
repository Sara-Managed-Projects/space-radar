// tests/test_glyph_uploads.mjs -- a glyph layer sends the GPU only the attributes whose values
// changed (internal #519), and what the GPU holds is always what the layer means to draw.
//
//   node tests/test_glyph_uploads.mjs
//
// WHAT COULD VISIBLY CHANGE: a dot that keeps yesterday's colour after a selection moved on, a
// ring that does not follow a filter, a glyph left behind when the record before it dropped out.
// All of those are ONE failure: an attribute's array changed and the attribute was not marked, so
// the GPU kept the old values. This test plays the GPU: after every update() it copies an
// attribute's array exactly when three.js would upload it (its `version` moved), and then
// requires its copy to equal the array over every live instance. If a mark is ever missed the copy
// is stale and the test names the attribute and the step. That is the frame comparison the issue
// asks for, made exact: equal buffers and the same shader draw equal pixels.
//
// And the saving, MEASURED here on a layer of 2000 moving dots: bytes marked for upload per tick
// against what marking all seven attributes was.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { createGlyphLayer } = await import(join(ROOT, 'site/js/scene/glyphs.js'));

let failed = 0;
const check = (ok, what) => { if (!ok) { failed++; console.error(`FAIL: ${what}`); } };

const NAMES = ['iOffset', 'iColour', 'iSize', 'iOpacity', 'iCell', 'iLit', 'iRing'];
const added = [];
const scene = { add: (m) => added.push(m), remove: () => {} };
const layer = createGlyphLayer(scene, { id: 'test', klass: 'satellite', frame: 'scene' });
const N = 2000;
const colourOfClass = { a: '#ff0000', b: '#00ff00' };
const records = Array.from({ length: N }, (_, i) => ({ id: `r${i}`, name: `R${i}`, klass: i % 7 === 0 ? 'debris' : 'satellite', cls: i % 2 ? 'a' : 'b', frame: 'scene', meta: i % 11 === 0 ? { provisional: true } : {} }));
// Positions move with time, as an orbit does; a record in `gone` has no position this tick.
const gone = new Set();
layer.setPositionSource((rec, tMs) => {
  if (gone.has(rec.id)) return null;
  const i = Number(rec.id.slice(1));
  return { x: Math.cos(i + tMs / 1000) * (2 + i / N), y: Math.sin(i + tMs / 1000) * (2 + i / N), z: i / N, frame: 'scene' };
});
layer.setRecords(records);
layer.mesh.visible = true;

// The stand-in GPU: one copy per attribute, refreshed when its version moves (or its array is new).
const gpu = new Map();
function frame(step, tMs) {
  layer.update(tMs, null);
  const geometry = layer.mesh.geometry;
  const k = geometry.instanceCount;
  const marked = [];
  for (const name of NAMES) {
    const attr = geometry.getAttribute(name);
    const held = gpu.get(name);
    if (!held || held.attr !== attr || held.version !== attr.version) {
      gpu.set(name, { attr, version: attr.version, copy: attr.array.slice() });
      if (held && held.attr === attr) marked.push(name);
      else marked.push(name); // a new buffer is uploaded whole
    }
    const now = gpu.get(name);
    const len = k * attr.itemSize;
    let same = true;
    for (let i = 0; i < len; i++) if (now.copy[i] !== attr.array[i] && !(Number.isNaN(now.copy[i]) && Number.isNaN(attr.array[i]))) { same = false; break; }
    check(same, `${step}: ${name} changed and was not marked for upload: the GPU would draw the old values`);
  }
  return { marked: marked.sort(), k };
}
const is = (got, want, step) => check(JSON.stringify(got.marked) === JSON.stringify([...want].sort()), `${step}: marked ${got.marked.join(', ') || 'nothing'}; expected ${[...want].sort().join(', ') || 'nothing'}`);

let t = Date.UTC(2026, 9, 9);
let f = frame('the first tick', t);
is(f, NAMES, 'the first tick uploads everything');
check(f.k === N, `all ${N} records are drawn (${f.k})`);

const before = layer.uploadStats();
for (let i = 0; i < 10; i++) { t += 100; f = frame(`a quiet tick ${i}`, t); is(f, ['iOffset'], `a tick where only time moved (${i})`); }
const quiet = layer.uploadStats();
const perTick = (quiet.bytes - before.bytes) / 10;
const wasPerTick = (quiet.all - before.all) / 10;
check(perTick === N * 12 && wasPerTick === N * 44, `a quiet tick marks 12 bytes an instance, where it was 44 (${perTick} of ${wasPerTick})`);

// The same instant again: nothing moved, nothing is sent.
f = frame('the same instant', t); is(f, [], 'a tick at the same instant');

// A selection: that dot turns ember, grows, and is fully opaque with its ring.
layer.setSelected('r7'); t += 100; f = frame('select r7', t);
check(['iColour', 'iSize'].every((n) => f.marked.includes(n)), `a selection marks colour and size (${f.marked})`);
t += 100; f = frame('the tick after a selection', t); is(f, ['iOffset'], 'the tick after a selection');
layer.setSelected('r8'); t += 100; f = frame('the selection moves to r8', t);
check(['iColour', 'iSize'].every((n) => f.marked.includes(n)), `moving the selection marks colour and size (${f.marked})`);
layer.setSelected(null); t += 100; f = frame('deselect', t);
check(['iColour', 'iSize'].every((n) => f.marked.includes(n)), `a deselection marks colour and size (${f.marked})`);
t += 100; is(frame('after deselect', t), ['iOffset'], 'the tick after a deselection');

// A recolour (the legend's colour key): colour only.
layer.recolour((r) => colourOfClass[r.cls]); t += 100; f = frame('recolour', t); is(f, ['iOffset', 'iColour'], 'a recolour');
layer.recolour(null); t += 100; f = frame('recolour back', t); is(f, ['iOffset', 'iColour'], 'the colour key off again');

// A model fading in over one record: its dot yields, by opacity alone.
let fade = 0;
layer.setModelOpacity((id) => (id === 'r20' ? fade : 0));
fade = 0.5; t += 100; f = frame('a model half in', t); is(f, ['iOffset', 'iOpacity'], 'a model fading in');
t += 100; is(frame('the fade holds', t), ['iOffset'], 'a fade that did not move');
fade = 1; t += 100; f = frame('a model fully in', t); is(f, ['iOffset', 'iOpacity'], 'the model fully in');
fade = 0; t += 100; f = frame('the model gone', t); is(f, ['iOffset', 'iOpacity'], 'the model gone');

// A record with no position this tick: every instance after it moves down one slot, so every
// attribute whose neighbours differ must be sent. r3 is debris-free, provisional-free; its
// neighbours differ in class (colour), and somewhere after it in opacity, glyph and ring too.
gone.add('r3'); t += 100; f = frame('r3 drops out', t);
check(f.k === N - 1 && ['iOffset', 'iColour', 'iOpacity', 'iRing'].every((n) => f.marked.includes(n)), `a record dropping out shifts the rest, and they are sent (${f.marked}; ${f.k} drawn)`);
t += 100; is(frame('still gone', t), ['iOffset'], 'the tick after a record dropped out');
gone.delete('r3'); t += 100; f = frame('r3 is back', t);
check(f.k === N && f.marked.includes('iColour'), `a record coming back shifts them again (${f.marked})`);

// A filter: other records, fewer of them. Then more than ever, which is a new buffer.
layer.setRecords(records.filter((r) => r.cls === 'a')); t += 100; f = frame('a filter', t);
check(f.k === N / 2 && f.marked.includes('iColour'), `a filter is sent (${f.marked}; ${f.k} drawn)`);
t += 100; is(frame('the filter holds', t), ['iOffset'], 'the tick after a filter');
layer.setRecords([...records, ...records.map((r) => ({ ...r, id: `x${r.id}` }))]);
layer.setPositionSource((rec, tMs) => ({ x: (rec.id.length + tMs / 1e3) % 5, y: Number(rec.id.replace(/\D/g, '')) / N, z: 1, frame: 'scene' }));
t += 100; f = frame('twice the records', t);
is(f, NAMES, 'a layer that outgrew its buffers uploads new ones whole');
check(f.k === 2 * N, `all ${2 * N} are drawn (${f.k})`);
t += 100; is(frame('and settles', t), ['iOffset'], 'and the tick after is quiet again');

// A layer nobody sees costs nothing.
const stats = layer.uploadStats();
layer.mesh.visible = false; t += 100; layer.update(t, null);
check(layer.uploadStats().ticks === stats.ticks, 'a hidden layer does not tick');

if (failed) { console.error(`\nglyph uploads: ${failed} check(s) FAILED`); process.exit(1); }
console.log(`glyph uploads ok: a quiet tick marks ${perTick} B for ${N} dots where it marked ${wasPerTick} B (${Math.round(100 - (100 * perTick) / wasPerTick)} % less); `
  + 'a selection, a recolour, a model\'s fade, a record dropping out, a filter and a regrown buffer each mark what they changed, and a stand-in GPU never held a stale value');
