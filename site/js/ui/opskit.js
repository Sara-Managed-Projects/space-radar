// ui/opskit.js -- what the four panes of the live operations view share (research train "ops"; forge #558, #561, #562, #563).
//
// Contract (DOM, built from the shared control set only: tests/test_controls.mjs):
//   el(tag, className, text), button(className, text, title)
//   filterRow({label, options: [[value, words]], value, onChange}) -> {el, value(), set(v)}   chips with aria-pressed
//   rowButton({name, meta, value, onClick, title}) -> <li>                                     an explore-view row (.ui-row)
//   sourceLine(text) -> <p class="sr-card__source">
//   ago(ms, nowMs) -> words ("12 minutes ago"), from copy/en.js ageInWords
//   track(name, params)  the contract's queue, ui/platform-bridge.js sr('track', ...) (CONTRACT.md: names from its list, flat params)
//   reduced() -> whether the visitor asked for less motion

import { COPY, ageInWords } from '../copy/en.js';
import { sr } from './platform-bridge.js';

export function el(tag, className, text) {
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

/** The platform's queue (ui/platform-bridge.js, CONTRACT.md): names from its list, flat params, nothing personal. */
export function track(name, params) { sr('track', name, params || {}); }

export const reduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

export function ago(ms, nowMs = Date.now()) {
  return Number.isFinite(ms) ? ageInWords(Math.max(0, nowMs - ms)) : '';
}

/** A row of filter chips, one pressed: the Lab's and Find's chips (css/controls.css .ui-chip, aria-pressed). */
export function filterRow({ label, options, value, onChange }) {
  const row = el('div', 'sr-ops__filters');
  row.setAttribute('role', 'group');
  if (label) row.setAttribute('aria-label', label);
  let now = value;
  const btns = new Map();
  for (const [v, words] of options) {
    const b = button('ui-chip', words);
    b.dataset.value = v;
    b.addEventListener('click', () => { if (now === v) return; set(v); onChange(v); });
    btns.set(v, b);
    row.appendChild(b);
  }
  function set(v) {
    now = v;
    for (const [k, b] of btns) b.setAttribute('aria-pressed', k === v ? 'true' : 'false');
  }
  set(value);
  return { el: row, value: () => now, set };
}

/** One row of a list in the explore view's style: a name and a line under it, a value at the right. With no `onClick` it is
 *  a plain row (.sr-list__static), not a button that does nothing. */
export function rowButton({ name, meta, value, onClick, title }) {
  const li = el('li', 'sr-list__row');
  const live = typeof onClick === 'function';
  const b = live ? button('ui-row ui-row--plain sr-ops__row', null, title) : el('div', 'sr-list__static sr-ops__row');
  if (!live && title) b.title = title;
  const text = el('span', 'sr-ops__rowtext');
  text.appendChild(el('span', 'sr-list__name', name));
  if (meta) text.appendChild(el('span', 'sr-ops__meta', meta));
  b.appendChild(text);
  if (value) b.appendChild(el('span', 'sr-list__value', value));
  if (live) b.addEventListener('click', onClick);
  li.appendChild(b);
  return li;
}

export function sourceLine(text) {
  return el('p', 'sr-card__source sr-ops__source', text);
}

export function waitLine() {
  return el('p', 'sr-ops__wait', COPY.ops.loading);
}
