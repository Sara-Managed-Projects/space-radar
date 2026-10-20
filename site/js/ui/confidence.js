// ui/confidence.js -- "How we know": show only the dots whose position is known in a way you trust
// (internal i#886, SR-PLAN-085; release 1.3.0 stage W3-e).
//
// Contract: confidencePanel(ctx, opts?) -> HTMLElement   a section for What to show; .refresh(), .destroy()
// Also exported, pure, for tests/test_confidence.mjs:
//   CONFIDENCE                 the four classes a record's position can be, in the order the card says them
//   classOf(record)            one of CONFIDENCE, or 'unknown' for a record that carries none
//   keeps(classes, record)     is the record drawn under this choice? (null: everything)
//   predicate(classes)         the function scene/glyphs.js setFilter takes, or null for "everything"
//   toggle(classes, id)        the choice after one box is pressed (null again once all four are on)
//   only(id)                   the choice "this class and nothing else"
//   tally(records)             how many records fall in each class, `unknown` last
//
// NO SECOND TRUTH SYSTEM. The issue asked for "observed only, inferred, artist impression, mixed";
// the app already says how a position is known in four words, on every card's honesty line and in
// the card's legend (ui/cardfacts.js positionKey, ui/truthlegend.js POSITION_CLASSES): Measured, Worked
// out, Illustrative, Sample. A filter by any other taxonomy would be a second truth. So these are the
// four, in the legend's words and with the legend's sentences, and a record's class is the `cls` it
// carries (data/parsers.js sets it where the record is made; propagate/index.js can only weaken it).
// "Mixed" is what the box row says when some but not all are on: the dots of every class that is
// ticked, no more, and a count beside each so a class that is empty is seen to be empty.
//
// WHAT IT TOUCHES. The DOTS of every layer (scene/glyphs.js): a record that is filtered out is not drawn
// and not tappable, like one with no position, while the one selected keeps its own dot. The Earth and
// the other worlds, the star field, the Milky Way and the deep-sky pictures are not records of a layer
// and stay as drawn; the one line under the boxes says so. The dots keep their class colours: the
// boxes carry the meaning in words and counts (SC 1.4.1), and nothing is recoloured, which is why a
// "colour key" would have been a second colour system beside Colour by.
//
// A VIEW, NOT A SETTING. It is not stored and not in the link: a reload shows everything, so nobody
// is left looking at a map with half its dots gone and no idea why. While it is on, the row says
// "n of m", and ctx.confidence() answers for a probe.
import { COPY, fmt, t } from '../copy/en.js';
import '../copy/en.later.js';

export const CONFIDENCE = ['measured', 'inferred', 'illustrative', 'sample'];

/** How a record's position is known: its own `cls` when it is one of the four, else 'unknown'. Pure. */
export function classOf(record) {
  const cls = record && record.cls;
  return CONFIDENCE.includes(cls) ? cls : 'unknown';
}

/** Is a record drawn under this choice? `classes` null or empty is "everything", the default. Pure. */
export function keeps(classes, record) {
  if (!Array.isArray(classes) || !classes.length) return true;
  return classes.includes(classOf(record));
}

/** The function scene/glyphs.js setFilter takes for a choice, or null when nothing is left out. Pure. */
export function predicate(classes) {
  if (!Array.isArray(classes) || !classes.length || CONFIDENCE.every((c) => classes.includes(c))) return null;
  const set = new Set(classes);
  return (record) => set.has(classOf(record));
}

/** The choice after one box is pressed. From "everything" a press takes that class OFF, as a box does. Pure. */
export function toggle(classes, id) {
  if (!CONFIDENCE.includes(id)) return Array.isArray(classes) && classes.length ? [...classes] : null;
  const now = Array.isArray(classes) && classes.length ? classes : CONFIDENCE;
  const next = now.includes(id) ? now.filter((c) => c !== id) : [...now, id];
  // Nothing ticked is not a map with no dots: it is everything again, which the row says by ticking all.
  if (!next.length || CONFIDENCE.every((c) => next.includes(c))) return null;
  return CONFIDENCE.filter((c) => next.includes(c));
}

/** The choice "this class and nothing else". Pure. */
export function only(id) {
  return CONFIDENCE.includes(id) ? [id] : null;
}

/** Records per class over a list, `unknown` last; the zeroes are kept, because an empty class is a fact. Pure. */
export function tally(records) {
  const out = Object.fromEntries([...CONFIDENCE, 'unknown'].map((c) => [c, 0]));
  for (const r of Array.isArray(records) ? records : []) out[classOf(r)] += 1;
  return out;
}

/**
 * While a filter is on, the rail's What to show button says so (a small ember dot, css/ui.css `.is-filtered`, and its
 * description), because the popover is shut while the map is looked at and a map with dots missing must never be the
 * visitor's only clue. Taken off when the choice is everything again.
 */
function markRail(on) {
  const btn = typeof document !== 'undefined' ? document.querySelector('.sr-rail__btn--show') : null;
  if (!btn) return;
  btn.classList.toggle('is-filtered', on);
  if (on) btn.setAttribute('aria-description', COPY.confidence.railNote); else btn.removeAttribute('aria-description');
}

function node(tag, className, text) {
  const n = document.createElement(tag);
  if (className) n.className = className;
  if (text !== undefined && text !== null && text !== '') n.textContent = String(text);
  return n;
}

/** The records of the layers that are drawn now: the set the counts are over. */
function drawnRecords(ctx) {
  const out = [];
  for (const layer of (ctx && ctx.layers) || []) {
    const on = typeof ctx.isLayerDrawable === 'function' ? ctx.isLayerDrawable(layer) : typeof ctx.isLayerOn === 'function' && ctx.isLayerOn(layer.id);
    if (!on || layer.draw === 'worlds' || layer.draw === 'galaxy' || layer.draw === 'stars3d' || layer.draw === 'systems') continue;
    try { for (const r of (typeof ctx.recordsFor === 'function' && ctx.recordsFor(layer.id)) || []) out.push(r); } catch { /* a layer that failed has none */ }
  }
  return out;
}

/**
 * The section: a title, one row per class (a box, its word, its count, the legend's sentence under
 * it), two buttons, and the one line that says what is filtered. Reads and sets the choice through
 * `ctx.confidence()` and `ctx.setConfidence(classes, predicate)` (main.js).
 */
export function confidencePanel(ctx) {
  const C = COPY.confidence;
  const wrap = node('section', 'sr-panel sr-confidence');
  wrap.dataset.confidence = '';
  const head = node('h2', 'sr-panel__title', C.title);
  wrap.appendChild(head);
  const list = node('ul', 'sr-confidence__rows');
  list.style.margin = '0';
  list.style.padding = '0';
  list.style.listStyle = 'none';
  list.setAttribute('role', 'group');
  list.setAttribute('aria-label', C.title);
  const rows = new Map();
  for (const id of CONFIDENCE) {
    const li = node('li', 'sr-show__row');
    const label = node('label', 'sr-show__label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.className = 'sr-show__box';
    box.dataset.class = id;
    const name = node('span', 'sr-show__name', COPY.truth.hints[id]);
    const count = node('span', 'sr-show__count', fmt.int(0));
    label.append(box, name, count);
    li.appendChild(label);
    const hint = node('p', 'sr-show__hint', COPY.r12Truth.position[id]);
    hint.id = `sr-confidence-${id}`;
    box.setAttribute('aria-describedby', hint.id);
    li.appendChild(hint);
    list.appendChild(li);
    box.addEventListener('change', () => apply(toggle(ctx.confidence ? ctx.confidence() : null, id)));
    rows.set(id, { box, count, li });
  }
  wrap.appendChild(list);
  const bar = node('div', 'sr-show__bulk');
  const onlyBtn = node('button', 'sr-show__bulkbtn', C.onlyMeasured);
  onlyBtn.type = 'button';
  onlyBtn.title = C.onlyMeasuredTitle;
  const allBtn = node('button', 'sr-show__bulkbtn', C.all);
  allBtn.type = 'button';
  allBtn.title = C.allTitle;
  bar.append(onlyBtn, allBtn);
  wrap.appendChild(bar);
  const status = node('p', 'sr-show__note sr-confidence__status');
  status.setAttribute('role', 'status');
  wrap.appendChild(status);
  wrap.appendChild(node('p', 'sr-show__note', C.scope));
  onlyBtn.addEventListener('click', () => apply(only('measured')));
  allBtn.addEventListener('click', () => apply(null));

  function apply(classes) {
    if (!ctx || typeof ctx.setConfidence !== 'function') return;
    ctx.setConfidence(classes, predicate(classes));
    refresh();
  }

  function refresh() {
    const classes = ctx && typeof ctx.confidence === 'function' ? ctx.confidence() : null;
    const counts = tally(drawnRecords(ctx));
    let shown = 0;
    let all = 0;
    for (const id of CONFIDENCE) {
      const row = rows.get(id);
      const on = !classes || classes.includes(id);
      if (row.box.checked !== on) row.box.checked = on;
      const text = fmt.int(counts[id]);
      if (row.count.textContent !== text) row.count.textContent = text;
      row.count.classList.toggle('is-empty', !counts[id]);
      all += counts[id];
      if (on) shown += counts[id];
    }
    // Records that carry no class are drawn only while everything is: they are in the "m", never in the "n" of a filter.
    all += counts.unknown;
    if (!classes) shown = all;
    const line = classes ? t(C.status, { n: fmt.int(shown), m: fmt.int(all) }) : '';
    if (status.textContent !== line) status.textContent = line;
    status.hidden = !classes;
    markRail(!!classes);
    allBtn.disabled = !classes;
    onlyBtn.setAttribute('aria-pressed', classes && classes.length === 1 && classes[0] === 'measured' ? 'true' : 'false');
  }

  const onEvent = () => { if (wrap.isConnected) refresh(); };
  window.addEventListener('sr:confidence', onEvent);
  document.addEventListener('sr:layer-toggle', onEvent);
  wrap.refresh = refresh;
  wrap.destroy = () => {
    window.removeEventListener('sr:confidence', onEvent);
    document.removeEventListener('sr:layer-toggle', onEvent);
  };
  refresh();
  return wrap;
}
