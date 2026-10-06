// ui/camundo.js -- "the view moved, and here is the way back" (internal #274).
//
// Contract: offerUndo(ctx, { name, undo, ms }) -> the toast's node, or null
// Also exported, pure, for tests/test_camundo.mjs:
//   undoWords(name) -> the toast's line;  sameView(a, b) -> whether an undo would change anything
//
// WHY. Choosing a search result, a row of Coming up, a tab, a mark on the timeline or an event of a
// mission moves the camera for you, often across the Solar System, and sometimes moves the clock
// with it. NASA's Eyes says so each time ("Camera is following Saturn · Undo"), and the way back is
// one tap. Here it is the toast (docs/ui-guide.md §3.14): one line, one text action, gone in six
// seconds, held while the pointer or the focus is on it, and Escape puts it away. It is never the
// only way back: the tab, the card's close and Live are all still there.
//
// main.js takes the picture of the view before the move (ctx.rememberView) and knows how to put
// it back (the `undo` it hands over); this file is only the offer. Fetched the first time a view
// moves, so it is not a first visit's cost.

import { COPY, t } from '../copy/en.js';
import { toast } from './share.js';

export const UNDO_MS = 6000;
let serial = 0;

/** The toast's line. A name too long for one line is cut at a word, with an ellipsis. */
export function undoWords(name) {
  const U = COPY.undo;
  let n = String(name || '').trim();
  if (!n) return U.movedNowhere;
  if ([...n].length > 34) n = `${[...n].slice(0, 33).join('').replace(/\s+\S*$/, '')}${COPY.punctuation.ellipsis}`;
  return t(U.moved, { name: n });
}

/** Are two pictures of the view the same place? Then there is nothing to go back to. */
export function sameView(a, b) {
  if (!a || !b) return false;
  const idOf = (r) => (r ? r.id : null);
  return a.stage === b.stage && a.moment === b.moment && idOf(a.selected) === idOf(b.selected)
    && (!a.clock || !b.clock || (a.clock.mode === b.clock.mode && (a.clock.mode === 'live' || Math.abs(a.clock.t - b.clock.t) < 60e3)));
}

export function offerUndo(ctx, opts = {}) {
  if (typeof document === 'undefined' || typeof opts.undo !== 'function') return null;
  const U = COPY.undo;
  const node = toast(undoWords(opts.name), 0);
  if (!node) return null;
  const mine = String(serial += 1);
  node.dataset.undo = mine;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'sr-toast__action';
  button.textContent = U.back;
  node.appendChild(button);

  let timer = 0;
  const still = () => node.isConnected && node.dataset.undo === mine;
  const close = () => {
    clearTimeout(timer);
    node.removeEventListener('pointerenter', hold);
    node.removeEventListener('pointerleave', run);
    node.removeEventListener('focusin', hold);
    node.removeEventListener('focusout', run);
    node.removeEventListener('keydown', onKey);
    if (!still()) return; // another toast has the node now: it is not ours to hide
    delete node.dataset.undo;
    node.hidden = true;
  };
  function hold() { clearTimeout(timer); }
  function run() { clearTimeout(timer); timer = setTimeout(close, Number.isFinite(opts.ms) ? opts.ms : UNDO_MS); }
  function onKey(e) { if (e.key === 'Escape') { e.stopPropagation(); close(); } }
  node.addEventListener('pointerenter', hold);
  node.addEventListener('pointerleave', run);
  node.addEventListener('focusin', hold);
  node.addEventListener('focusout', run);
  node.addEventListener('keydown', onKey);
  button.addEventListener('click', () => {
    close();
    try { opts.undo(); } catch (e) { console.warn('the view could not be put back', e); }
    toast(U.done);
  });
  run();
  return node;
}
