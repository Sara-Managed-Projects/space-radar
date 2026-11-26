// ui/toolslot.js -- an empty, hidden place in one of the map's panels where a script on the page may put a button
// (window.srMap.ui.tool, ui/mapapi.js; docs/PLUGINS.md). The slot pattern of the platform bridge (`[data-sr-account]`,
// `[data-sr-passport]`, `[data-sr-tonight]`): the map builds the place and says so, and does nothing else with it.
//
// Contract: toolSlot(where, { contents?, btn? }, doc?) -> HTMLElement `div.sr-tools[data-sr-tools=<where>][hidden]`
//             where: 'earth' (What to show, Earth data) | 'ground' (a landing site's bar) | 'sky' (the sky's controls)
//                    | 'make' (the share sheet's Make row) | 'drift' (the drift's options) | 'device' (What to show, this device)
//             contents: the slot lays its buttons out in its parent's own row (display: contents)
//             btn: the classes of a button put there, the parent's own (`ui-btn` in a row of `ui-btn`s)
//           and, once the element is in the page, `document` event `sr:slot {slot: 'tools', where, el}`.
//
// Imports nothing and draws nothing: with no script on the page (a fork, localhost without one, an embed) the slot stays
// an empty hidden div, and the panel is exactly the panel it was.

export const TOOL_PLACES = ['earth', 'ground', 'sky', 'make', 'drift', 'device'];

export function toolSlot(where, { contents = false, btn = 'ui-btn ui-btn--sm' } = {}, doc = typeof document !== 'undefined' ? document : null) {
  if (!doc || !TOOL_PLACES.includes(where)) return null;
  const el = doc.createElement('div');
  el.className = contents ? 'sr-tools sr-tools--contents' : 'sr-tools';
  el.setAttribute('data-sr-tools', where);
  el.setAttribute('data-sr-tools-btn', btn);
  el.hidden = true;
  // Told after the caller has put it in its panel (the same task), so a listener can find it in the page.
  const tell = () => {
    try { doc.dispatchEvent(new CustomEvent('sr:slot', { detail: { slot: 'tools', where, el } })); } catch { /* an old browser */ }
  };
  if (typeof queueMicrotask === 'function') queueMicrotask(tell); else Promise.resolve().then(tell);
  return el;
}
