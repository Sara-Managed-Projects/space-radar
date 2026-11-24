// ui/catalogkit.js -- what the four catalogues share (research train "catalogues"; forge #551, #553, #560, #564): the sortable
// table, the filter chips, the source line, the saved-copy reader and the analytics hook.
//
// Contract, pure (tests/test_catalogue.mjs):
//   compareValues(a, b)                 -> number   numbers by value, text by the page's collation, blanks always last
//   sortRows(rows, column, desc)        -> rows     a new array; `column.get(row)` is the value sorted on
//   matchText(row, query, fields)       -> boolean  every word of the query is in one of the row's named fields
//   pageOf(rows, shown)                 -> {rows, shown, total, rest}
//   readJsonCopy(urls, {fetchImpl})     -> {data, url, via} | null   the first URL that answers with JSON
// Contract, DOM:
//   buildTable({columns, rows, sortKey, desc, label, onSort, onRow, limit, step}) -> {el, set(rows, sortKey, desc)}
//   chipGroup({label, options, value, onChange, multi}) -> {el, value(), set(value)}
//   sourceLine({source, url, licence, asOf, via}) -> <p>
//   track(eventName, params)            the platform's queue (CONTRACT.md, ui/platform-bridge.js sr)
//
// ONE LOOK WITH FIND. The table is Find's (css/find.css .sr-find__table, its sort buttons with aria-sort, its row buttons):
// a catalogue is the same kind of answer, so it is drawn the same way. The filters are the Lab's and Find's chips
// (css/controls.css .ui-chip, aria-pressed). Nothing here invents a control (tests/test_controls.mjs).
//
// THE ROWS ARE CUT, NEVER HIDDEN. A table of seven thousand launches would be seven thousand DOM rows: the table draws the
// first `limit` and says "Showing 100 of 7 223" with a button for the next `step`. The count is always the whole answer's.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.catalogues.js';
import { sr } from './platform-bridge.js';

/** An analytics event of the platform contract (CONTRACT.md), pushed onto the platform's queue (ui/platform-bridge.js sr()):
 *  nothing leaves the page where the platform does not run. A row that opens a card is not told here: ui/platformtrack.js
 *  already says `select_object` for every card. */
export function track(name, params) { sr('track', name, params); }

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}
export function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}
export { el };

const blank = (v) => v === null || v === undefined || v === '' || (typeof v === 'number' && !Number.isFinite(v));
let collator = null;
function collate(a, b) {
  if (!collator) {
    try { collator = new Intl.Collator((typeof document !== 'undefined' && document.documentElement.lang) || 'en', { numeric: true, sensitivity: 'base' }); } catch { collator = { compare: (x, y) => (x < y ? -1 : x > y ? 1 : 0) }; }
  }
  return collator.compare(a, b);
}

/** Numbers by value, text by collation; a blank sorts after everything in either direction (see sortRows). Pure. */
export function compareValues(a, b) {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return collate(String(a), String(b));
}

/** A new array sorted on `column.get(row)`; blanks last whichever way, ties in their first order. Pure. */
export function sortRows(rows, column, desc = false) {
  const get = column && typeof column.get === 'function' ? column.get : (r) => r[column && column.key];
  const keyed = rows.map((r, i) => ({ r, i, v: get(r) }));
  keyed.sort((x, y) => {
    const bx = blank(x.v), by = blank(y.v);
    if (bx || by) return bx === by ? x.i - y.i : bx ? 1 : -1;
    const c = compareValues(x.v, y.v);
    return c ? (desc ? -c : c) : x.i - y.i;
  });
  return keyed.map((k) => k.r);
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** Every word of `query` is found in one of the row's `fields` (accents and case ignored). An empty query matches. Pure. */
export function matchText(row, query, fields) {
  const words = fold(query).split(/\s+/).filter(Boolean);
  if (!words.length) return true;
  const hay = fields.map((f) => fold(typeof f === 'function' ? f(row) : row[f])).join(' ');
  return words.every((w) => hay.includes(w));
}

/** The first `shown` rows and what is left. Pure. */
export function pageOf(rows, shown) {
  const n = Math.max(0, Math.min(rows.length, shown));
  return { rows: rows.slice(0, n), shown: n, total: rows.length, rest: rows.length - n };
}

/**
 * The first of `urls` that answers 200 with JSON: our saved copy (/data/v1/...) first, the copy bundled with the map after
 * it (data/readorder.js's order for a source with no browser route). `via` is the entry's own label ('snapshot', 'bundled').
 */
export async function readJsonCopy(urls, opts = {}) {
  const f = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!f) return null;
  for (const u of urls) {
    const { url, via } = typeof u === 'string' ? { url: u, via: 'bundled' } : u;
    try {
      const r = await f(url, { cache: 'no-cache' });
      if (!r || !r.ok) continue;
      const data = await r.json();
      if (data && typeof data === 'object') return { data, url, via };
    } catch { /* the next one */ }
  }
  return null;
}

/**
 * Find's table, for a catalogue. `columns`: [{key, label, get(row) -> sort value, text(row) -> cell, head?: true (the row's
 * name, a button that goes there), title?}]. `onSort(key, desc)` is told; the table re-sorts itself.
 */
export function buildTable(opts) {
  const C = COPY.catalogue;
  const { columns, label, onRow, onSort } = opts;
  const limit = opts.limit || 100;
  const step = opts.step || 100;
  const wrap = el('div', 'sr-cat__tablewrap');
  const count = el('p', 'sr-cat__count');
  count.setAttribute('role', 'status');
  const scroller = el('div', 'sr-find__tablewrap');
  const more = button('ui-btn ui-btn--sm ui-btn--secondary sr-cat__more');
  wrap.append(count, scroller, more);
  let all = [];
  let sorted = [];
  let sortKey = opts.sortKey || (columns[0] && columns[0].key);
  let desc = !!opts.desc;
  let shown = limit;

  function paint(focusKey) {
    scroller.textContent = '';
    const page = pageOf(sorted, shown);
    count.textContent = !page.total ? C.none : page.rest ? t(C.showing, { shown: fmt.int(page.shown), n: fmt.int(page.total) }) : t(C.showingAll, { n: fmt.int(page.total) });
    more.hidden = !page.rest;
    if (page.rest) more.textContent = t(C.more, { n: fmt.int(Math.min(step, page.rest)) });
    if (!page.total) return;
    const table = el('table', 'sr-find__table sr-cat__table');
    if (label) table.setAttribute('aria-label', label);
    const thead = el('thead');
    const hr = el('tr');
    for (const c of columns) {
      const th = el('th');
      th.scope = 'col';
      if (c.key === sortKey) th.setAttribute('aria-sort', desc ? 'descending' : 'ascending');
      const b = button('sr-find__sort', c.label, t(C.sortTitle, { col: c.label }));
      b.dataset.key = c.key;
      b.addEventListener('click', () => {
        if (c.key === sortKey) desc = !desc; else { sortKey = c.key; desc = !!c.descFirst; }
        sorted = sortRows(all, c, desc);
        if (onSort) onSort(sortKey, desc);
        paint(c.key);
      });
      th.appendChild(b);
      hr.appendChild(th);
    }
    thead.appendChild(hr);
    table.appendChild(thead);
    const tbody = el('tbody');
    for (const row of page.rows) {
      const tr = el('tr');
      for (const c of columns) {
        const text = c.text ? c.text(row) : c.get(row);
        const cell = el(c.head ? 'th' : 'td', c.className || '');
        if (c.head) {
          cell.scope = 'row';
          if (onRow) {
            const b = button('sr-find__go', text, t(C.rowTitle, { name: text }));
            b.addEventListener('click', (e) => { e.stopPropagation(); onRow(row); });
            cell.appendChild(b);
          } else cell.textContent = text;
        } else cell.textContent = blank(text) ? C.unknown : String(text);
        if (c.title) { const tt = c.title(row); if (tt) cell.title = tt; }
        tr.appendChild(cell);
      }
      if (onRow) tr.addEventListener('click', () => onRow(row));
      tbody.appendChild(tr);
    }
    table.appendChild(tbody);
    scroller.appendChild(table);
    if (focusKey) { const again = scroller.querySelector(`.sr-find__sort[data-key="${focusKey}"]`); if (again) again.focus({ preventScroll: true }); }
  }
  more.addEventListener('click', () => { shown += step; paint(); });

  function set(rows, key, d) {
    all = rows || [];
    if (key) sortKey = key;
    if (d !== undefined) desc = !!d;
    const col = columns.find((c) => c.key === sortKey) || columns[0];
    sorted = sortRows(all, col, desc);
    shown = limit;
    paint();
  }
  if (opts.rows) set(opts.rows);
  return { el: wrap, set, sort: () => ({ key: sortKey, desc }) };
}

/**
 * A row of chips, one choice or several (the Lab's filters: css/controls.css .ui-chip, aria-pressed). `options`:
 * [{id, text}]. With `multi`, `value` is a Set and an empty Set is "all".
 */
export function chipGroup(opts) {
  const { label, options, onChange, multi } = opts;
  const box = el('div', 'sr-cat__filter');
  const head = el('p', 'sr-cat__filterlabel', label);
  const id = `sr-cat-f-${Math.random().toString(36).slice(2, 8)}`;
  head.id = id;
  const row = el('div', 'sr-find__chips sr-cat__chips');
  row.setAttribute('role', 'group');
  row.setAttribute('aria-labelledby', id);
  box.append(head, row);
  let value = multi ? new Set(opts.value || []) : (opts.value === undefined ? '' : opts.value);
  const btns = new Map();
  for (const o of options) {
    const b = button('ui-chip', o.text, o.title);
    b.dataset.id = o.id;
    b.addEventListener('click', () => {
      if (multi) {
        if (o.id === '') value = new Set();
        else if (value.has(o.id)) value.delete(o.id); else value.add(o.id);
      } else value = o.id;
      paint();
      if (onChange) onChange(multi ? new Set(value) : value);
    });
    row.appendChild(b);
    btns.set(o.id, b);
  }
  function paint() {
    for (const [k, b] of btns) {
      const on = multi ? (k === '' ? value.size === 0 : value.has(k)) : k === value;
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
    }
  }
  paint();
  return { el: box, value: () => (multi ? new Set(value) : value), set(v) { value = multi ? new Set(v || []) : v; paint(); } };
}

/** "Source: GCAT (J. McDowell) · CC BY 4.0 · Our saved copy, read 23 November 2026". */
export function sourceLine({ source, url, licence, readMs, via }) {
  const C = COPY.catalogue;
  const p = el('p', 'sr-sect__note sr-cat__source');
  p.appendChild(el('span', 'sr-find__srclabel', C.sourceLabel));
  p.appendChild(document.createTextNode(' '));
  if (url) {
    const a = el('a', 'sr-mission__link', source);
    a.href = url;
    a.target = '_blank';
    a.rel = 'noopener noreferrer';
    p.appendChild(a);
  } else p.appendChild(document.createTextNode(source));
  const tail = [];
  if (licence) tail.push(licence);
  if (Number.isFinite(readMs)) {
    const words = via === 'snapshot' ? C.savedCopy : via === 'bundled' ? C.bundledCopy : C.asOf;
    tail.push(t(words, { date: timeText.utcLong(readMs) }));
  }
  if (tail.length) p.appendChild(el('span', 'sr-cat__sourcetail', t(C.sourceTail, { text: tail.join(COPY.punctuation.sentenceJoin) })));
  return p;
}
