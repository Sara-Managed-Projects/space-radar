// ui/chooser.js -- a long press on a crowded spot lists what is under the finger.
//
// Contract: showChooser(items, x, y, onPick) -> { close() }; hideChooser().
// `items` come from scene/pickrank.js rankAll(): {record, kind}. One list, at most six rows,
// positioned at the press, closed by a pick, Escape, or a tap anywhere else. It never selects on
// its own: the caller's onPick receives the record and does what a tap would have done.

import { COPY, t } from '../copy/en.js';

const HOST_ID = 'sr-pick';
let host = null;
let closeCurrent = null;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function hideChooser() {
  if (closeCurrent) closeCurrent();
}

/**
 * @param {Array<{record: Object, kind: string}>} items
 * @param {number} x  client px of the press
 * @param {number} y
 * @param {(record: Object) => void} onPick
 * @param {{layers?: Array<Object>}} [opts]  the layer rows, for the quiet "where" label
 */
export function showChooser(items, x, y, onPick, opts = {}) {
  hideChooser();
  if (!Array.isArray(items) || !items.length || typeof document === 'undefined') return { close() {} };
  host = document.getElementById(HOST_ID);
  if (!host) {
    host = el('ul', 'sr-pick');
    host.id = HOST_ID;
    host.setAttribute('role', 'listbox');
    document.body.appendChild(host);
  }
  host.textContent = '';
  host.setAttribute('aria-label', COPY.chooser.label);
  const layers = Array.isArray(opts.layers) ? opts.layers : [];
  const whereOf = (id) => { const l = layers.find((r) => r.id === id); return l ? l.display || l.id : ''; };

  for (const item of items) {
    const rec = item.record;
    const li = el('li', 'sr-pick__item');
    li.setAttribute('role', 'option');
    const btn = el('button', 'sr-pick__btn');
    btn.type = 'button';
    const dot = el('span', `sr-swatch sr-swatch--${rec.klass || 'satellite'}`);
    dot.setAttribute('aria-hidden', 'true');
    btn.appendChild(dot);
    btn.appendChild(el('span', 'sr-pick__name', rec.name || COPY.card.unknownName));
    const where = whereOf(rec.layer);
    if (where) btn.appendChild(el('span', 'sr-pick__where', where));
    btn.addEventListener('click', (ev) => { ev.stopPropagation(); close(); onPick(rec); });
    li.appendChild(btn);
    host.appendChild(li);
  }
  host.appendChild(el('li', 'sr-pick__hint', t(COPY.chooser.hint, { n: items.length })));

  // Place it at the press, kept inside the viewport.
  host.hidden = false;
  const vw = window.innerWidth, vh = window.innerHeight;
  const w = host.offsetWidth || 240, h = host.offsetHeight || 200;
  host.style.left = `${Math.max(8, Math.min(x + 8, vw - w - 8))}px`;
  host.style.top = `${Math.max(8, Math.min(y + 8, vh - h - 8))}px`;

  const onKey = (ev) => { if (ev.key === 'Escape') close(); };
  const onDown = (ev) => { if (!host.contains(ev.target)) close(); };
  // Deferred so the pointerup that opened it does not close it.
  const arm = setTimeout(() => {
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown, true);
  }, 0);

  function close() {
    clearTimeout(arm);
    document.removeEventListener('keydown', onKey);
    document.removeEventListener('pointerdown', onDown, true);
    if (host) host.hidden = true;
    closeCurrent = null;
  }
  closeCurrent = close;
  return { close };
}
