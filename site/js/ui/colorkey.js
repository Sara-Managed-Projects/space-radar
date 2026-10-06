// ui/colorkey.js -- "Colour by": one click recolours every dot by a fact it carries, and the legend
// says how many are in each bucket (spec 0026 req 11, the satellitemap.space study's first take).
//
// Contract: createColorKey(ctx) -> { root, refresh(), destroy() }
// The keys are registry/colorkeys.yaml through its mirror; the bucket rules are
// data/colorkeyrules.js. Applying a key is ctx.setColourKey(id) -- main.js hands it to every glyph
// layer -- and the legend counts records over the layers that are on, so it is the same set of dots.

import { COPY, t, fmt } from '../copy/en.js';
import '../copy/en.later.js';
import { COLOR_KEYS } from '../data/colorkeys.js';
import { keyById, legendCounts } from '../data/colorkeyrules.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createColorKey(ctx) {
  const T = COPY.colourKey;
  const root = el('section', 'sr-panel sr-colourkey');
  const title = el('h2', 'sr-panel__title', T.title);
  root.appendChild(title);
  const select = document.createElement('select');
  select.className = 'sr-colourkey__select';
  select.setAttribute('aria-label', T.title);
  for (const k of COLOR_KEYS) {
    const o = document.createElement('option');
    o.value = k.id;
    o.textContent = k.label;
    select.appendChild(o);
  }
  root.appendChild(select);
  const why = el('p', 'sr-colourkey__why');
  root.appendChild(why);
  const legend = el('ul', 'sr-colourkey__legend');
  root.appendChild(legend);
  // The legend counts the drawable layers only, so from Earth "deep-sky: 1" is the Milky Way
  // record while the layer row says 209. The line says which set it is.
  root.appendChild(el('p', 'sr-colourkey__scope', T.scope));
  let current = COLOR_KEYS[0] ? COLOR_KEYS[0].id : 'class';

  function onRecords() {
    const out = [];
    for (const layer of ctx.layers || []) {
      const on = ctx.isLayerDrawable ? ctx.isLayerDrawable(layer) : ctx.isLayerOn && ctx.isLayerOn(layer.id);
      if (!on) continue;
      for (const r of ctx.recordsFor(layer.id) || []) out.push(r);
    }
    return out;
  }

  function refresh() {
    const key = keyById(current) || COLOR_KEYS[0];
    if (!key) return;
    const rows = legendCounts(key, onRecords());
    while (legend.firstChild) legend.removeChild(legend.firstChild);
    // "What it is" draws each dot in its LAYER's colour (scene/glyphs.js colourOf), not its class's:
    // a rocket body on "Bright enough to see" is sky blue. A class swatch here would be a key to
    // colours nobody drew, so those rows are counts, and the line under them says where the key is.
    const byClass = key.by === 'klass';
    why.textContent = byClass ? T.byLayer : '';
    for (const row of rows) {
      if (row.n === 0) continue; // a bucket nothing falls in is not a legend row
      const li = el('li', 'sr-colourkey__row');
      const sw = el('span', byClass ? 'sr-swatch sr-swatch--none' : 'sr-swatch');
      if (!byClass) sw.style.background = row.colour;
      sw.setAttribute('aria-hidden', 'true');
      li.appendChild(sw);
      const label = key.by === 'klass'
        ? (COPY.klass[row.id] || row.label)
        : row.id === 'unknown' ? T.unknown : row.label;
      li.appendChild(el('span', 'sr-colourkey__label', label));
      li.appendChild(el('span', 'sr-colourkey__count sr-num', fmt.int(row.n)));
      legend.appendChild(li);
    }
  }

  select.addEventListener('change', () => {
    current = select.value;
    if (typeof ctx.setColourKey === 'function') ctx.setColourKey(current);
    refresh();
    // What to show's layer swatches stop being the key while another one is (ui/whattoshow.js).
    window.dispatchEvent(new CustomEvent('sr:colour-key', { detail: { id: current } }));
  });
  const onLayer = () => refresh();
  window.addEventListener('sr:layer', onLayer);
  document.addEventListener('sr:layer-toggle', onLayer);
  window.addEventListener('sr:stage', onLayer);
  refresh();

  return {
    root,
    refresh,
    destroy() {
      window.removeEventListener('sr:layer', onLayer);
      document.removeEventListener('sr:layer-toggle', onLayer);
      window.removeEventListener('sr:stage', onLayer);
      root.remove();
    },
  };
}
