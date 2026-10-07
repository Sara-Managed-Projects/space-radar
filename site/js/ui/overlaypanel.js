// ui/overlaypanel.js -- "Earth data" in What to show: pick one measured map to lay over the globe.
//
// Contract: overlayPanel(ctx) -> HTMLElement (with .destroy())
//
// A settings row like "Colour by" above it (ui/colorkey.js), and for the same reason it prints its
// own legend: the colours on the globe mean nothing without one. The list is registry/overlays.yaml
// (data/overlays.js); choosing one calls ctx.setOverlay(id), which is where the scene module and
// the one picture are fetched (main.js). Nothing is remembered between visits: an overlay asks
// another host for half a megabyte, and that is the visitor's choice each time.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';
import { OVERLAYS } from '../data/overlays.js';
import { legendNode, paintLegend, overlayLine } from './overlaylegend.js';

/** The overlay id main.js hands to scene/wind.js instead of scene/earthoverlay.js. */
export const WIND_OPTION = 'wind';
/** Whether the panel lists the wind (see the note where the option is built). */
export const WIND_OFFERED = false;

export function overlayPanel(ctx) {
  const C = COPY.overlay;
  const wrap = document.createElement('section');
  wrap.className = 'sr-panel sr-colourkey sr-overlay';
  const title = document.createElement('h2');
  title.className = 'sr-panel__title';
  title.textContent = C.panelTitle;
  wrap.appendChild(title);
  const select = document.createElement('select');
  select.className = 'sr-colourkey__select';
  select.setAttribute('aria-label', C.panelTitle);
  const none = document.createElement('option');
  none.value = '';
  none.textContent = C.none;
  select.appendChild(none);
  for (const row of OVERLAYS) {
    const o = document.createElement('option');
    o.value = row.id;
    o.textContent = row.title;
    select.appendChild(o);
  }
  // The wind is not a GIBS picture: scene/wind.js draws it from NOAA's model (ctx.setOverlay knows the id).
  // NOT OFFERED YET (2026-10-07). The field comes from one university server that, the day it was
  // measured, answered in 2 s twice and then took 35 s, returned 404 and timed out. A row that fails
  // half the time is worse than no row: it comes back when the harvester writes /data/v1/wind.json
  // (internal #362). scene/wind.js and ctx.setOverlay('wind') stay, so a link or a trip stop can use it.
  if (WIND_OFFERED) {
    const wind = document.createElement('option');
    wind.value = WIND_OPTION;
    wind.textContent = C.wind.title;
    select.appendChild(wind);
  }
  wrap.appendChild(select);
  const legend = legendNode(null);
  wrap.appendChild(legend);
  const why = document.createElement('p');
  why.className = 'sr-colourkey__why';
  wrap.appendChild(why);

  const paint = () => {
    const st = typeof ctx.overlayState === 'function' ? ctx.overlayState() : null;
    const id = st && st.id ? st.id : '';
    if (select.value !== id) select.value = id;
    paintLegend(legend, st && st.id ? st : null);
    const text = overlayLine(st);
    if (why.textContent !== text) why.textContent = text;
  };
  select.addEventListener('change', () => {
    if (typeof ctx.setOverlay === 'function') ctx.setOverlay(select.value || null);
    paint();
  });
  window.addEventListener('sr:overlay', paint);
  paint();
  wrap.destroy = () => window.removeEventListener('sr:overlay', paint);
  return wrap;
}
