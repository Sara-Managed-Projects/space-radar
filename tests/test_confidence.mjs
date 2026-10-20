// tests/test_confidence.mjs -- "How we know": the confidence filter (internal i#886, ui/confidence.js).
//
//   node tests/test_confidence.mjs
//
// THE CLASSES ARE THE APP'S OWN: the four words a card's honesty line uses and the legend explains, never a
// second taxonomy. THE FILTER leaves a dot out of the draw and out of the tap (scene/glyphs.js setFilter), keeps
// the selection's own dot, and puts every dot back. THE PANEL, in a small DOM: a box per class with its count and
// the legend's sentence, a press takes one class off, "Measured only" and "All", a line that says "n of m", and a
// dot on the rail's button while any filter is on. NOT STORED, NOT IN THE LINK, NOT AT BOOT.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { installDom } from './helpers/minidom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

const { fire } = installDom();
const rail = document.createElement('button');
rail.className = 'sr-rail__btn sr-rail__btn--show';
document.body.appendChild(rail);
const events = [];
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };

const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);
const K = await mod('ui/confidence.js');
const { COPY } = await mod('copy/en.js');
const { createGlyphLayer } = await mod('scene/glyphs.js');
const { DRAWN_CLASSES } = await mod('data/deepsky.js');

// --- the classes are the app's own ---------------------------------------------------------------
check(same(K.CONFIDENCE, ['measured', 'inferred', 'illustrative', 'sample']), `four classes, in the legend's order (${K.CONFIDENCE})`);
const legend = src('site/js/ui/truthlegend.js');
const legendClasses = /POSITION_CLASSES = (\[[^\]]*\])/.exec(legend);
check(legendClasses && same(JSON.parse(legendClasses[1].replace(/'/g, '"')), K.CONFIDENCE), 'they are ui/truthlegend.js POSITION_CLASSES, word for word');
const cardfacts = src('site/js/ui/cardfacts.js');
check(/\['measured', 'inferred', 'illustrative', 'sample'\]\.includes\(cls\)/.test(cardfacts), 'and the card\'s positionKey says the same four');
for (const id of K.CONFIDENCE) {
  check(typeof COPY.truth.hints[id] === 'string' && typeof COPY.r12Truth.position[id] === 'string', `${id} has the card's word and the legend's sentence`);
  check(!DRAWN_CLASSES.includes(id), `${id} is not one of the drawn classes: the two families are not mixed`);
}

// --- the pure parts --------------------------------------------------------------------------------
check(K.classOf({ cls: 'inferred' }) === 'inferred' && K.classOf({}) === 'unknown' && K.classOf(null) === 'unknown' && K.classOf({ cls: 'made-up' }) === 'unknown', 'a record\'s class is its own cls, else unknown');
check(K.keeps(null, {}) === true && K.keeps([], { cls: 'sample' }) === true && K.keeps(['measured'], { cls: 'measured' }) === true && K.keeps(['measured'], { cls: 'inferred' }) === false && K.keeps(['measured'], {}) === false, 'keeps(): nothing chosen is everything; a chosen class keeps only its own, and a record with none goes');
check(K.predicate(null) === null && K.predicate([]) === null && K.predicate(K.CONFIDENCE) === null, 'no filter, or all four, is no predicate at all');
check(K.predicate(['measured'])({ cls: 'measured' }) && !K.predicate(['measured'])({ cls: 'sample' }), 'a predicate says yes to the chosen');
check(same(K.toggle(null, 'illustrative'), ['measured', 'inferred', 'sample']), 'from everything, a press takes that class off');
check(same(K.toggle(['measured', 'inferred', 'sample'], 'illustrative'), null), 'and putting it back is everything again');
check(same(K.toggle(['measured'], 'measured'), null), 'taking off the last one is everything, not a map with no dots');
check(same(K.toggle(['measured'], 'sample'), ['measured', 'sample']), 'and the order is the legend\'s whatever the order of the presses');
check(same(K.toggle(['sample'], 'measured'), ['measured', 'sample']), 'also from the other side');
check(same(K.toggle(['measured'], 'nonsense'), ['measured']) && K.toggle(null, 'nonsense') === null, 'an unknown class changes nothing');
check(same(K.only('measured'), ['measured']) && K.only('x') === null, 'only() is one class');
const records = [{ cls: 'measured' }, { cls: 'measured' }, { cls: 'inferred' }, { cls: 'sample' }, {}, { cls: 'illustrative' }];
check(same(K.tally(records), { measured: 2, inferred: 1, illustrative: 1, sample: 1, unknown: 1 }), 'tally(): the zeroes are kept and unknown is last');
check(Object.keys(K.tally([])).join() === 'measured,inferred,illustrative,sample,unknown' && K.tally(null).measured === 0, 'an empty list is five zeroes');

// --- the glyph layer: a filtered dot is not drawn and not tapped -------------------------------------
{
  const added = [];
  const layer = createGlyphLayer({ add: (m) => added.push(m), remove: () => {} }, { id: 'test', klass: 'satellite', frame: 'scene' });
  const recs = Array.from({ length: 12 }, (_, i) => ({ id: `r${i}`, name: `R${i}`, klass: 'satellite', cls: K.CONFIDENCE[i % 4], frame: 'scene', meta: {} }));
  layer.setPositionSource((rec) => ({ x: Number(rec.id.slice(1)) * 0.1, y: 0, z: 1, frame: 'scene' }));
  layer.setRecords(recs);
  layer.mesh.visible = true;
  const draw = (t = 1) => { layer.update(Date.UTC(2026, 9, 9) + t, null); return layer.mesh.geometry.instanceCount; };
  check(draw() === 12, 'all twelve are drawn with no filter');
  layer.setFilter(K.predicate(['measured']));
  check(draw(2) === 3, `a filter on Measured draws the three of twelve (${draw(3)})`);
  layer.setFilter(K.predicate(['measured', 'sample']));
  check(draw(4) === 6, 'two classes draw six');
  layer.setSelected('r1'); // an inferred one
  check(draw(5) === 7, `the selection keeps its own dot whatever the filter says (${draw(6)})`);
  layer.setSelected(null);
  check(draw(7) === 6, 'and loses it again when it is let go');
  layer.setFilter(null);
  check(draw(8) === 12, 'setFilter(null) puts every dot back');
  layer.setFilter('not a function');
  check(draw(9) === 12, 'and anything that is not a function is no filter');
}

// --- the panel, in a small DOM --------------------------------------------------------------------
function makeCtx(recordsByLayer) {
  const state = { classes: null, calls: [] };
  const layers = Object.keys(recordsByLayer).map((id) => ({ id, draw: 'glyph' }));
  return {
    state,
    ctx: {
      layers,
      isLayerOn: () => true,
      isLayerDrawable: () => true,
      recordsFor: (id) => recordsByLayer[id] || [],
      confidence: () => (state.classes ? [...state.classes] : null),
      setConfidence(classes, fn) { state.classes = classes; state.calls.push([classes, typeof fn]); },
    },
  };
}
const recs = (n, cls) => Array.from({ length: n }, () => ({ cls }));
const { ctx, state } = makeCtx({ a: [...recs(5, 'measured'), ...recs(2, 'inferred')], b: [...recs(3, 'sample'), ...recs(1, 'illustrative'), {}] });
const panel = K.confidencePanel(ctx);
document.body.appendChild(panel);
const boxes = panel.querySelectorAll('.sr-show__box');
const counts = () => panel.querySelectorAll('.sr-show__count').map((n) => n.textContent);
check(boxes.length === 4 && boxes.every((b) => b.checked), 'a box per class, all ticked: nothing is filtered at first');
check(same(boxes.map((b) => b.dataset.class), K.CONFIDENCE), 'in the legend\'s order');
check(same(counts(), ['5', '2', '1', '3']), `each with its count (${counts()})`);
const names = panel.querySelectorAll('.sr-show__name').map((n) => n.textContent);
check(same(names, K.CONFIDENCE.map((c) => COPY.truth.hints[c])), `in the card's words (${names})`);
const hints = panel.querySelectorAll('.sr-show__hint').map((n) => n.textContent);
check(same(hints, K.CONFIDENCE.map((c) => COPY.r12Truth.position[c])), 'each with the legend\'s sentence under it, so the colour of a dot is never the only key');
check(boxes.every((b, i) => b.getAttribute('aria-describedby') === panel.querySelectorAll('.sr-show__hint')[i].id), 'and the box points at its sentence');
const status = panel.querySelector('.sr-confidence__status');
check(status.hidden === true, 'no "n of m" line while nothing is filtered');
check(!rail.classList.contains('is-filtered'), 'and no dot on the rail');
const [onlyBtn, allBtn] = panel.querySelectorAll('.sr-show__bulkbtn');
check(onlyBtn.textContent === COPY.confidence.onlyMeasured && allBtn.textContent === COPY.confidence.all && allBtn.disabled === true, '"Measured only" and "All", the second off while everything shows');

boxes[2].checked = false; fire(boxes[2], 'change');
check(same(state.classes, ['measured', 'inferred', 'sample']) && state.calls.at(-1)[1] === 'function', 'unticking Illustrative filters it out, through a predicate');
check(status.hidden === false && status.textContent === 'Showing 10 of 12 dots', `and the line says so (${status.textContent})`);
check(rail.classList.contains('is-filtered') && /hidden/.test(rail.getAttribute('aria-description') || ''), 'the rail\'s button wears the dot and says why');
check(allBtn.disabled === false && boxes.map((b) => b.checked).join() === 'true,true,false,true', 'the boxes follow');
onlyBtn.click();
check(same(state.classes, ['measured']) && status.textContent === 'Showing 5 of 12 dots' && onlyBtn.getAttribute('aria-pressed') === 'true', `"Measured only" is Measured only (${status.textContent})`);
check(boxes.map((b) => b.checked).join() === 'true,false,false,false', 'one box ticked');
boxes[0].checked = false; fire(boxes[0], 'change');
check(state.classes === null && status.hidden === true && !rail.classList.contains('is-filtered') && !rail.getAttribute('aria-description'), 'taking off the last one is everything again, and the rail is clean');
boxes[1].checked = false; fire(boxes[1], 'change');
allBtn.click();
check(state.classes === null && boxes.every((b) => b.checked) && allBtn.disabled === true, '"All" puts every dot back');
check(state.calls.at(-1)[1] === 'object', 'with no predicate');
check(/Filters the dots/.test(panel.textContent), 'one line says what is filtered and what is not');
// A layer that is off or not a glyph layer does not count.
{
  const m = makeCtx({ a: recs(2, 'measured'), b: recs(9, 'sample') });
  m.ctx.isLayerDrawable = (l) => l.id === 'a';
  const p = K.confidencePanel(m.ctx);
  check(p.querySelectorAll('.sr-show__count')[0].textContent === '2' && p.querySelectorAll('.sr-show__count')[3].textContent === '0', 'counts are over the layers that are drawn');
}
// No filter hooks: the panel is inert, not broken.
{
  const p = K.confidencePanel({ layers: [], isLayerOn: () => false });
  const b = p.querySelectorAll('.sr-show__box')[0]; b.checked = false;
  let threw = false; try { fire(b, 'change'); } catch { threw = true; }
  check(!threw, 'a context with no setConfidence does not throw');
}

// --- where it lives ---------------------------------------------------------------------------------
const main = src('site/js/main.js');
check(/ctx\.setConfidence = \(classes, fn\)/.test(main) && /gl\.setFilter\(/.test(main) && /ctx\.confidence = /.test(main), 'main.js hands the predicate to every glyph layer');
check(!/localStorage|sessionStorage|setItem/.test(src('site/js/ui/confidence.js').replace(/\/\/[^\n]*/g, '')), 'nothing about it is stored');
check(!/confidence/.test(src('site/js/ui/urlstate.js').replace(/\/\/[^\n]*/g, '')), 'nor put in the link');
const wts = src('site/js/ui/whattoshow.js');
check(/import \{ confidencePanel \} from '\.\/confidence\.js'/.test(wts) && /ctx\.setConfidence === 'function'/.test(wts), 'What to show builds it, only where the app can filter');
check(!/confidence/.test(src('site/index.html')) && !/import[^\n]*confidence\.js/.test(main), 'index.html and main.js do not load it: it comes with What to show');
check(/\.sr-rail__btn\.is-filtered/.test(src('site/css/ui.css')), 'the rail\'s dot has its rule');

if (problems.length) {
  console.error(`confidence FAILED (${problems.length}):\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('confidence ok: the app\'s four classes, a filter that leaves a dot out of the draw and the tap, the panel with its counts, sentences and "n of m", a dot on the rail, nothing stored');
