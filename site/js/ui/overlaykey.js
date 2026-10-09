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
// ON A PHONE (internal #386, decided 2026-10-09). The sidebar is the sheet there, and at its peek
// only the tabs show: the map was on the globe and nothing said what the colours were until the
// sheet was raised. So the same legend (title, ramp, its two ends and the unit) is also one line
// in the phone's top bar, under the search, the host the launch chip already uses: an existing
// host again, not a new floating panel. It is the legend alone, no sentence and no button (the
// sentence and "Take it off" are one drag up, in the sheet), and it goes when the sheet is full,
// when a trip runs (its stop card carries the key) and when the map goes.
//
// Never at boot: main.js imports this on the first `sr:overlay` that has a map to name.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { legendNode, paintLegend, overlayLine } from './overlaylegend.js';
import { loadCss } from './latercss.js';

/** The class on <html> while the phone's top bar carries the key (css/finishers.css shows the line). */
export const TOP_KEY_CLASS = 'sr-overlay-keyed';

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
  // The phone's line: made once, in the shell's own host under the search.
  let top = null;
  const topHost = document.querySelector('#sr-top .sr-top__line');
  if (topHost) {
    top = legendNode(null);
    if (top) { top.classList.add('sr-overlaykey__top'); top.hidden = true; topHost.appendChild(top); loadCss('finishers'); }
  }
  const paintTop = (st, on) => {
    if (!top) return;
    paintLegend(top, on ? st : null);
    const shown = on && !!(st && st.legend);
    top.hidden = !shown;
    document.documentElement.classList.toggle(TOP_KEY_CLASS, shown);
  };
  const paint = () => {
    const st0 = read();
    paintTop(st0, keyShown(st0, phase()));
    if (!host) return;
    const st = st0;
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
  paint();
  return { paint, state: () => ({ shown: !!host && !host.hidden, words: line ? line.textContent : '', top: !!top && !top.hidden }) };
}
