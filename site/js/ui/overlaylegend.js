// ui/overlaylegend.js -- an Earth overlay's legend and its one honest sentence.
//
// Contract: overlayLine(state) -> string                 pure; '' when no overlay is asked for
//           legendNode(state) -> HTMLElement | null      the ramp, its two ends and the unit
//           paintLegend(node, state) -> void             rewrite a legend made by legendNode
//
// `state` is scene/earthoverlay.js state(). No registry import here: the stop card
// (ui/tripframe.js) and What to show (ui/overlaypanel.js) both print from the state they are
// handed, so the two can never disagree about what is on the globe.

import { COPY, t } from '../copy/en.js';

/** What the colours are, which day they are of, how they were got and whose they are. */
export function overlayLine(state) {
  const C = COPY.overlay;
  if (!state || !state.id) return '';
  if (state.status === 'loading') return C.loading;
  if (state.status === 'failed') return C.failed;
  if (state.status === 'no-earth') return C.noEarth;
  if (state.status !== 'shown') return '';
  const dated = state.dateWords ? t(C.dated[state.rule] || C.dated.daily, { date: state.dateWords }) : '';
  return t(C.line, {
    what: state.what,
    dated,
    made: C.made[state.cls] || '',
    credit: t(C.credit, { credit: state.credit }),
  }).replace(/\s+/g, ' ').trim();
}

function sig(state) {
  const l = state && state.legend;
  return l ? `${state.id}|${l.low}|${l.high}|${l.unit}|${(l.stops || []).join(',')}` : '';
}

export function paintLegend(node, state) {
  if (!node) return;
  const key = sig(state);
  if (node.dataset.sig === key) return;
  node.dataset.sig = key;
  const l = state && state.legend;
  node.hidden = !l;
  if (!l) return;
  const [title, ramp, low, high] = node.children;
  title.textContent = state.title;
  // The ramp is the registry's own colours (GIBS's colormap), which is why it is a style here.
  ramp.style.background = `linear-gradient(to right, ${(l.stops || []).join(', ')})`;
  low.textContent = l.low;
  high.textContent = t(COPY.overlay.legendHigh, { high: l.high, unit: l.unit });
  node.setAttribute('aria-label', t(COPY.overlay.legendAria, { title: state.title, low: l.low, high: l.high, unit: l.unit }));
}

export function legendNode(state) {
  if (typeof document === 'undefined') return null;
  const node = document.createElement('div');
  node.className = 'sr-legend';
  node.setAttribute('role', 'img');
  for (const cls of ['sr-legend__title', 'sr-legend__ramp', 'sr-legend__low', 'sr-legend__high']) {
    const part = document.createElement('span');
    part.className = cls;
    node.appendChild(part);
  }
  paintLegend(node, state);
  return node;
}
