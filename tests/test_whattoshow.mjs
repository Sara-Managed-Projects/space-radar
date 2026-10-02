// tests/test_whattoshow.mjs -- What to show, grouped (spec 0068 task 3, ui/whattoshow.js), and its
// Keys row (issue #321). Asserted, with a small DOM and no browser:
//
//   GROUPS FROM THE REGISTRY: every layer the registry lists sits under one of layers.yaml
//     `groups:`, each group has a title in copy/en.js, and the popover draws one <button
//     aria-expanded> heading per group in that order, with "N of M" counted from ctx.isLayerOn.
//   ONE SCREEN: only the group with the most layers on starts open; the others are shut.
//   ALL / NONE switch a whole group through ctx.setLayerOn, and the counts follow.
//   THE FILTER: present past FILTER_MIN_ROWS rows; it hides the rows that do not match, opens the
//     groups that do, says so when nothing matches, and puts the groups back when cleared.
//   MEMORY: the open groups survive a reload through storage; a storage that throws on read or on
//     write is the default every time, never an exception.
//   KEYS: the last row closes the popover and calls ctx.keyhint.show().
//
//   node tests/test_whattoshow.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ------------------------------------------------------------------------------- a small DOM
// The one test_tripframe.mjs uses, with `value`, `checked` and events that carry their name.
// ------------------------------------------------------------------------------- a small DOM
class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this._kids = [];
    this.parentNode = null;
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.hidden = false;
    this.disabled = false;
    this.inert = false;
    this.className = '';
    this.id = '';
    this.type = '';
    this.title = '';
    this._text = '';
    this.offsetWidth = 1;
    this.isContentEditable = false;
    const self = this;
    this.classList = {
      add: (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; },
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
    this.listeners = {};
  }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === document.body || n === document.documentElement; }
  get firstChild() { return this._kids[0] || null; }
  get childElementCount() { return this._kids.length; }
  get children() { return this._kids; }
  append(...cs) { for (const c of cs) this.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this._kids.push(c); return c; }
  insertBefore(c, ref) {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    const i = this._kids.indexOf(ref);
    if (i < 0) this._kids.push(c); else this._kids.splice(i, 0, c);
    return c;
  }
  removeChild(c) { this._kids = this._kids.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(v) { this._kids = []; this._text = String(v ?? ''); }
  get textContent() { return this._text + this._kids.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return k === 'class' ? this.className : k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  click() { if (this.disabled) return; for (const fn of this.listeners.click || []) fn({ target: this }); }
  focus() { document.activeElement = this; }
  closest() { return null; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
  matches(sel) {
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    if (sel.startsWith('.')) return sel.slice(1).split('.').every((c) => this.classList.contains(c));
    return this.tagName === sel.toUpperCase();
  }
  querySelector(sel) { return this.all().slice(1).find((n) => n.matches(sel)) || null; }
  querySelectorAll(sel) { return this.all().slice(1).filter((n) => n.matches(sel)); }
}

globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  activeElement: null,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  createTextNode: (text) => { const n = new Node('#text'); n.textContent = text; return n; },
  getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
  querySelector: (sel) => document.body.querySelector(sel),
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
document.activeElement = document.body;
globalThis.window = globalThis;
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
if (typeof globalThis.CustomEvent === 'undefined') globalThis.CustomEvent = class { constructor(type, init) { this.type = type; this.detail = init && init.detail; } };
const fire = (node, type) => { for (const fn of node.listeners[type] || []) fn({ target: node, type }); };

const W = await import(pathToFileURL(join(JS, 'ui/whattoshow.js')).href);
const { COPY, t } = await import(pathToFileURL(join(JS, 'copy/en.js')).href);
const { LAYERS } = await import(pathToFileURL(join(JS, 'data/layers.js')).href);
const { LAYER_GROUPS } = await import(pathToFileURL(join(JS, 'data/layers.registry.js')).href);
const C = COPY.controls;

// --- groups from the registry --------------------------------------------------------------------
check(Array.isArray(LAYER_GROUPS) && LAYER_GROUPS.length >= 3, `layers.yaml names its groups (got ${LAYER_GROUPS})`);
for (const g of LAYER_GROUPS) check(typeof C.groups[g] === 'string' && C.groups[g].length > 0, `group ${g} has a title in copy/en.js`);
const live = LAYERS.filter((l) => l.enabled !== false);
for (const l of live) check(LAYER_GROUPS.includes(l.group), `layer ${l.id} sits in a known group (got ${l.group})`);
const grouped = W.groupLayers(live);
check(grouped.map((g) => g.id).join() === LAYER_GROUPS.filter((g) => live.some((l) => l.group === g)).join(), 'groups come out in the registry\'s order');
check(grouped.reduce((a, g) => a + g.layers.length, 0) === live.length, 'every layer is in exactly one group');
check(W.groupLayers([{ id: 'x', group: 'nowhere' }], ['a', 'b'])[0].id === 'b', 'a layer with an unknown group lands in the last group, not nowhere');
// Never two screens of checkboxes: no one group is longer than a phone's screen of rows.
for (const g of grouped) check(g.layers.length <= 12, `group ${g.id} has ${g.layers.length} rows: more than one screen`);

// --- the pure parts ------------------------------------------------------------------------------
const onSet = (ids) => (id) => ids.includes(id);
const G = [{ id: 'a', layers: [{ id: 'a1' }, { id: 'a2' }] }, { id: 'b', layers: [{ id: 'b1' }, { id: 'b2' }, { id: 'b3' }] }];
check(W.defaultOpen(G, onSet(['b1', 'b2'])) === 'b', 'the group with the most layers on starts open');
check(W.defaultOpen(G, onSet(['a1', 'b1'])) === 'a', 'a tie opens the first');
check(W.defaultOpen(G, onSet([])) === 'a', 'nothing on: the first group opens');
const tally = W.groupTally(G[1].layers, onSet(['b1', 'b3']));
check(tally.on === 2 && tally.n === 3, `the tally counts what is on (got ${JSON.stringify(tally)})`);
check(t(C.groupCount, { on: 2, n: 3 }) === '2 of 3', 'and reads "2 of 3"');
check(W.matchesFilter({ id: 'aurora', display: 'Aurora' }, 'AUR'), 'the filter ignores case');
check(W.matchesFilter({ id: 'storms', display: 'Tropical storms now' }, 'storms trop'), 'every word, in any order');
check(!W.matchesFilter({ id: 'storms', display: 'Tropical storms now' }, 'aurora'), 'and refuses what is not there');
check(W.matchesFilter({ id: 'x', display: 'X' }, '   '), 'blank matches everything');

const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { m.set(k, String(v)); }, m }; };
const throwsAll = { getItem() { throw new Error('SecurityError'); }, setItem() { throw new Error('SecurityError'); } };
const throwsWrite = { getItem: () => null, setItem() { throw new Error('QuotaExceededError'); } };
check(W.readOpen(throwsAll) === null && W.writeOpen(throwsAll, ['a']) === false, 'a storage that throws reads as nothing and refuses the write, quietly');
check(W.readOpen(null) === null && W.writeOpen(null, ['a']) === false, 'no storage at all is handled');
const junk = memory(); junk.setItem(W.OPEN_KEY, '{not json');
check(W.readOpen(junk) === null, 'a remembered value that is not JSON reads as nothing');
const mem = memory();
check(W.writeOpen(mem, new Set(['b'])) && JSON.stringify(W.readOpen(mem)) === '["b"]', 'the open groups round-trip');

// --- the popover, in the small DOM ---------------------------------------------------------------
function makeCtx(onIds) {
  const on = new Set(onIds);
  const calls = { set: [], keyhint: 0, closed: 0 };
  const ctx = {
    layers: LAYERS,
    isLayerOn: (id) => on.has(id),
    setLayerOn: (id, v) => { calls.set.push([id, v]); if (v) on.add(id); else on.delete(id); },
    records: () => [],
    recordsFor: () => [],
    colourKey: () => 'class',
    setColourKey() {},
    keyhint: { show: () => { calls.keyhint++; } },
    rail: { closeShow: () => { calls.closed++; } },
  };
  return { ctx, on, calls };
}
const byClass = (root, c) => root.querySelectorAll(`.${c}`);

const firstOn = live.filter((l) => l.group === LAYER_GROUPS[0]).slice(0, 3).map((l) => l.id);
const { ctx, on, calls } = makeCtx(firstOn);
const store = memory();
let w;
try {
  w = W.createWhatToShow(ctx, { storage: store });
} catch (e) {
  check(false, `createWhatToShow threw in the small DOM: ${e && e.stack}`);
}
if (w) {
  const heads = byClass(w.root, 'sr-show__head');
  check(heads.length === grouped.length, `one heading per group (got ${heads.length} for ${grouped.length})`);
  check(heads.every((h) => h.tagName === 'BUTTON' && ['true', 'false'].includes(h.getAttribute('aria-expanded'))), 'each heading is a button with aria-expanded');
  check(heads.every((h) => h.getAttribute('aria-controls')), 'each heading names the rows it opens');
  const expanded = () => heads.map((h) => h.getAttribute('aria-expanded') === 'true');
  check(expanded().filter(Boolean).length === 1 && expanded()[0], `only the group with layers on starts open (got ${expanded()})`);
  const gid0 = grouped[0].id;
  const tally0 = () => heads[0].querySelector('.sr-show__tally').textContent;
  check(tally0() === t(C.groupCount, { on: 3, n: grouped[0].layers.length }), `the open group says 3 of ${grouped[0].layers.length} (got "${tally0()}")`);
  check(heads[0].textContent.includes(C.groups[gid0]), 'and its title comes from copy/en.js');
  check(heads[0].dataset.autofocus !== undefined, 'the first heading, not the filter, takes the focus on opening');

  // All and None.
  const sec0 = byClass(w.root, 'sr-show__group')[0];
  const [allBtn, noneBtn] = byClass(sec0, 'sr-show__bulkbtn');
  allBtn.click();
  check(grouped[0].layers.every((l) => on.has(l.id)), 'All switches every layer of the group on');
  check(tally0() === t(C.groupCount, { on: grouped[0].layers.length, n: grouped[0].layers.length }), `and the count follows (got "${tally0()}")`);
  check(!calls.set.some(([id]) => firstOn.includes(id)), 'All leaves the layers already on alone');
  noneBtn.click();
  check(grouped[0].layers.every((l) => !on.has(l.id)), 'None switches every layer of the group off');
  check(!grouped.slice(1).some((g) => g.layers.some((l) => calls.set.some(([id]) => id === l.id))), 'and touches no other group');
  check(allBtn.getAttribute('aria-label') === t(C.groupAllLabel, { group: C.groups[gid0] }), 'All says which group it means');

  // Opening and shutting, remembered.
  heads[1].click();
  check(expanded()[1] === true, 'a heading opens its group');
  check(JSON.stringify(W.readOpen(store)) === JSON.stringify([gid0, grouped[1].id]), `the open groups are remembered (got ${store.getItem(W.OPEN_KEY)})`);
  heads[0].click();
  check(expanded()[0] === false, 'and shuts it again');
  const w2 = W.createWhatToShow(makeCtx([]).ctx, { storage: store });
  const heads2 = byClass(w2.root, 'sr-show__head');
  check(heads2.map((h) => h.getAttribute('aria-expanded')).join() === grouped.map((g) => String(g.id === grouped[1].id)).join(), 'a reload opens what the visitor left open');
  w2.destroy();
  for (const bad of [throwsAll, throwsWrite]) {
    let wb = null;
    try { wb = W.createWhatToShow(makeCtx(firstOn).ctx, { storage: bad }); byClass(wb.root, 'sr-show__head')[1].click(); } catch (e) { check(false, `a storage that throws broke the popover: ${e}`); }
    if (wb) {
      check(byClass(wb.root, 'sr-show__head')[0].getAttribute('aria-expanded') === 'true', 'a storage that throws gets the default open group');
      wb.destroy();
    }
  }

  // The filter.
  const filter = w.root.querySelector('.sr-show__filter');
  check(live.length > W.FILTER_MIN_ROWS ? !!filter : !filter, `the filter is there past ${W.FILTER_MIN_ROWS} rows`);
  if (filter) {
    check(filter.attrs['aria-label'] === C.layerFilter, 'the filter has a name');
    const aurora = live.find((l) => l.id === 'aurora');
    filter.value = 'aurora';
    fire(filter, 'input');
    const visibleRows = byClass(w.root, 'sr-show__row').filter((r) => !r.hidden && !r.parentNode.parentNode.hidden);
    check(visibleRows.length === 1 && visibleRows[0].textContent.includes(aurora.display), `the filter leaves the one matching row (got ${visibleRows.length})`);
    const auroraGroup = grouped.findIndex((g) => g.layers.includes(aurora));
    check(expanded()[auroraGroup] === true, 'and opens its group');
    check(byClass(w.root, 'sr-show__group').filter((s) => !s.hidden).length === 1, 'the groups with no match step aside');
    filter.value = 'zzzz';
    fire(filter, 'input');
    check(!w.root.querySelector('.sr-show__nomatch').hidden, 'no match says so');
    filter.value = '';
    fire(filter, 'input');
    check(expanded()[1] === true && expanded()[0] === false, 'clearing the filter puts the groups back as they were');
    check(w.root.querySelector('.sr-show__nomatch').hidden, 'and the no-match line goes');
  }

  // The settings stay at the foot and Keys is the last row (#321).
  const kids = w.root.children;
  const keys = w.root.querySelector('.sr-show__keys');
  check(!!keys && kids[kids.length - 1] === keys, 'Keys is the last row');
  check(keys && keys.tagName === 'BUTTON' && [C.keysRow, C.keysRowTouch].includes(keys.textContent), `Keys is a button named from copy (got "${keys && keys.textContent}")`);
  const iKey = kids.findIndex((k) => k.classList.contains('sr-colourkey'));
  const iList = kids.findIndex((k) => k.classList.contains('sr-show__list'));
  check(iKey > iList, 'Colour by sits under the layers');
  keys.click();
  check(calls.closed === 1 && calls.keyhint === 1, `Keys closes the popover and shows the hint (closed ${calls.closed}, shown ${calls.keyhint})`);
  w.destroy();
}

// --- the wiring ------------------------------------------------------------------------------------
const rail = readFileSync(join(JS, 'ui/rail.js'), 'utf8');
check(/\[data-autofocus\]/.test(rail), 'the rail focuses the marked heading on opening, so a phone keyboard does not cover the list');
const yaml = readFileSync(join(ROOT, 'registry/layers.yaml'), 'utf8');
check(/^groups: \[/m.test(yaml), 'layers.yaml lists its groups');

if (problems.length) {
  console.error(`What to show: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`What to show ok: ${grouped.length} groups over ${live.length} layers, counts, all/none, the filter, remembered state (and storage that throws), the Keys row`);
