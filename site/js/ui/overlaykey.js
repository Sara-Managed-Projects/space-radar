// ui/overlaykey.js -- the key of the map laid over the Earth, in the sidebar's Earth tab.
//
// Contract: mountOverlayKey(ctx) -> { paint(), state() } | null
//
// WHY (internal #386 item 1). A NASA GIBS map or the wind can be on the globe with What to show
// shut, no trip running and no card open, and then nothing on screen said what the colours were:
// the legend lived in the popover, the trip's stop card and the Earth's own card. The sidebar is
// the host that is on screen then (docs/ui-guide.md principle 2: new content goes into an existing
// host, never a new floating panel), so the key is a section at the top of its Earth tab: the
// ramp with its two ends and unit, the sentence that says what it is, of which day and whose, and
// one quiet button that takes the map off. Hidden while no map is up.
//
// Never at boot: main.js imports this on the first `sr:overlay` that has a map to name.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { legendNode, paintLegend, overlayLine } from './overlaylegend.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** Is there a map to key? `state` is ctx.overlayState(). Pure. */
export function keyShown(state, tripPhase) {
  if (!state || !state.id) return false;
  // A trip's stop card carries the key of the map the trip laid on: not twice.
  return !tripPhase || tripPhase === 'idle';
}

export function mountOverlayKey(ctx) {
  if (typeof document === 'undefined' || !ctx || !ctx.explore || typeof ctx.explore.mountTab !== 'function') return null;
  const C = COPY.overlay;
  let host = null;
  let legend = null;
  let line = null;
  const read = () => { try { return ctx.overlayState(); } catch { return null; } };
  const phase = () => (ctx.trip && ctx.trip.state ? ctx.trip.state.phase : null);
  const paint = () => {
    if (!host) return;
    const st = read();
    const on = keyShown(st, phase());
    paintLegend(legend, on ? st : null);
    const words = on ? overlayLine(st) : '';
    if (line.textContent !== words) line.textContent = words;
    line.hidden = !words;
    host.hidden = !on;
  };
  ctx.explore.mountTab('earth', (mount) => {
    host = mount;
    host.classList.add('sr-overlaykey');
    host.appendChild(el('h2', 'sr-micro', C.keyTitle));
    legend = legendNode(null);
    line = el('p', 'sr-overlaykey__line');
    const off = el('button', 'sr-more', C.keyOff);
    off.type = 'button';
    off.title = C.keyOffTitle;
    off.addEventListener('click', () => { if (typeof ctx.setOverlay === 'function') ctx.setOverlay(null); paint(); });
    host.append(legend, line, off);
    paint();
  });
  window.addEventListener('sr:overlay', paint);
  if (ctx.trip && typeof ctx.trip.onChange === 'function') ctx.trip.onChange(paint);
  return { paint, state: () => ({ shown: !!host && !host.hidden, words: line ? line.textContent : '' }) };
}
