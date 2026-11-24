// ui/spacepanel.js -- the space weather on the Earth's and the Sun's cards (forge #548; the awesome-space research of
// 2026-11-23): NOAA's Kp measured now, its forecast for the next three days, what a storm does, and the aurora layer.
//
// Contract: mountSpacePanel(box, ctx, deps?) -> Promise<{ refresh(), destroy() }>   (ui/cards.js, a row that opens in place)
// Also exported, pure, for tests/test_spacepanel.mjs:
//   outlookDays(parsed, nowMs, days = 3) -> [{ dayMs, kp, scale, word }]   the forecast's highest Kp per UTC day
//   panelWords(parsed, result, nowMs, auroraOn) -> { measured, days, noForecast, storm: [...], sources }
//
// ONE SOURCE, ONE TRUTH. The numbers are the `swpc-kp` row of registry/sources.yaml, NOAA SWPC's planetary K-index
// forecast file, which carries the readings of the past days (`observed`, `estimated`) and the forecast of the next three
// (`predicted`) in one table. The page asks OUR SAVED COPY first and NOAA only when there is none (data/sources.js load,
// the clouds' and the aurora's way), through ui/spaceweather.js readSpaceWeather: the same reader as the Sources sheet's
// line, so the two never disagree. MEASURED AND FORECAST ARE KEPT APART AND LABELLED (the issue's watch): the measured
// sentence is spaceWeatherLine's (the reading's own age and where it came from), the days ahead sit under their own
// heading, and a note says which is which. What a storm does is NOAA's own space weather scales, read 2026-11-24
// (https://www.spaceweather.gov/noaa-scales-explanation): G2 drag changes and orbit predictions, G3 more drag on low
// orbits and intermittent satellite navigation, G4 navigation degraded for hours, G5 for days; HF radio fading at G2, gone
// for one to two days at G5; aurora from the high latitudes at G1 to about 40 degrees of magnetic latitude at G5.
//
// THE AURORA LAYER. One button turns the existing aurora layer on and off (scene/aurora.js, NOAA's OVATION forecast);
// its state is the layer's, read from ctx.isLayerOn, and it repaints on sr:layer as the layers panel does.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.live.js';
import { loadCss } from './latercss.js';
import { kpWords, spaceWeatherLine, readSpaceWeather } from './spaceweather.js';

const DAY_MS = 86400e3;
const SCALES_URL = 'https://www.spaceweather.gov/noaa-scales-explanation';
const SCALES_READ = '2026-11-24';

// The platform's queue (site/js/ui/platform-bridge.js, CONTRACT.md) is not on main yet: a no-op until it is.
// TODO(platform-bridge): import { sr } from './platform-bridge.js' and call sr('track', name, params).
const track = () => {};

/** The forecast's highest Kp on each of the next `days` UTC days that have a forecast. Pure. */
export function outlookDays(parsed, nowMs, days = 3) {
  const rows = parsed && Array.isArray(parsed.forecast) ? parsed.forecast : [];
  const today = Math.floor(nowMs / DAY_MS);
  const byDay = new Map();
  for (const r of rows) {
    if (!r || r.observed !== 'predicted' || !Number.isFinite(r.tMs) || !Number.isFinite(r.kp)) continue;
    const d = Math.floor(r.tMs / DAY_MS);
    if (d < today) continue;
    byDay.set(d, Math.max(byDay.has(d) ? byDay.get(d) : -Infinity, r.kp));
  }
  // Today counts only when the forecast still holds a bin of it; the three are the next days NOAA forecasts.
  return [...byDay.keys()].sort((a, b) => a - b).slice(0, days).map((d) => {
    const kp = byDay.get(d);
    const w = kpWords(kp);
    return { dayMs: d * DAY_MS, kp, scale: w.scale, word: w.word };
  });
}

/** Everything the panel says, as words. Pure. */
export function panelWords(parsed, result, nowMs) {
  const P = COPY.spacePanel;
  const measured = parsed ? spaceWeatherLine(parsed, result, nowMs) : null;
  const days = parsed ? outlookDays(parsed, nowMs) : [];
  return {
    measured: measured || P.none,
    days: days.map((d) => ({
      key: t(P.day, { day: timeText.utcDay(d.dayMs) }),
      value: t(P.dayValue, { kp: fmt.smart(d.kp) }),
      words: t(P.dayWords, { word: d.word }),
      scale: d.scale,
      kp: d.kp,
    })),
    noForecast: parsed && !days.length ? P.noForecast : '',
    note: P.kindNote,
    storm: [P.storm.satellites, P.storm.navigation, P.storm.radio, P.storm.aurora],
    sources: t(P.sources, { date: timeText.utcLong(Date.parse(`${SCALES_READ}T12:00:00Z`)) }),
  };
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

export async function mountSpacePanel(box, ctx, deps = { read: readSpaceWeather }) {
  const P = COPY.spacePanel;
  const got = (ctx && ctx.spaceWeather) || await deps.read();
  if (got && ctx && !ctx.spaceWeather) ctx.spaceWeather = got;
  const w = panelWords(got ? got.parsed : null, got ? got.result : null, Date.now());

  loadCss('live');
  const root = el('div', 'sr-spacepanel');
  root.appendChild(el('p', 'sr-micro', P.measuredHead));
  root.appendChild(el('p', 'sr-card__sentence sr-spacepanel__now', w.measured));

  root.appendChild(el('p', 'sr-micro', P.forecastHead));
  if (w.days.length) {
    const dl = el('dl', 'sr-rows sr-spacepanel__days');
    for (const d of w.days) {
      dl.appendChild(el('dt', 'sr-rows__key', d.key));
      const dd = el('dd', 'sr-rows__val');
      // The G-scale, NOAA's own storm level, as a tag; the words beside the number wrap as a sentence does.
      if (d.scale) { dd.appendChild(el('span', 'ui-chip', d.scale)); dd.appendChild(document.createTextNode(' ')); }
      dd.appendChild(el('span', 'sr-rows__num', d.value));
      dd.appendChild(el('span', 'sr-rows__unit', COPY.punctuation.separator + d.words));
      dl.appendChild(dd);
    }
    root.appendChild(dl);
  } else if (w.noForecast) root.appendChild(el('p', 'sr-card__note', w.noForecast));
  root.appendChild(el('p', 'sr-card__note', w.note));

  // The aurora layer, one press away: its state is the layer's own.
  const btn = el('button', 'ui-btn ui-btn--sm sr-spacepanel__aurora', P.aurora);
  btn.type = 'button';
  btn.title = P.auroraTitle;
  const paint = () => btn.setAttribute('aria-pressed', ctx && typeof ctx.isLayerOn === 'function' && ctx.isLayerOn('aurora') ? 'true' : 'false');
  paint();
  btn.addEventListener('click', () => {
    if (!ctx || typeof ctx.setLayerOn !== 'function') return;
    const on = !(typeof ctx.isLayerOn === 'function' && ctx.isLayerOn('aurora'));
    ctx.setLayerOn('aurora', on);
    document.dispatchEvent(new CustomEvent('sr:layer-toggle', { detail: { id: 'aurora', on, handled: true, from: 'space-weather' } }));
    // TODO(platform-bridge): sr('track', 'layer_toggle', { layer: 'aurora', on }).
    track('layer_toggle', { layer: 'aurora', on });
    paint();
  });
  root.appendChild(btn);

  root.appendChild(el('p', 'sr-micro', P.stormHead));
  const ul = el('ul', 'sr-spacepanel__storm');
  for (const line of w.storm) ul.appendChild(el('li', 'sr-card__note', line));
  root.appendChild(ul);

  root.appendChild(el('p', 'sr-card__source', w.sources));
  // NOAA's own page of the scales, as the card's links out are drawn (ui/cardextras.js linkNodes).
  const a = el('a', 'sr-card__page sr-card__out', P.scalesLink);
  a.href = SCALES_URL;
  a.target = '_blank';
  a.rel = 'noopener';
  root.appendChild(a);

  box.appendChild(root);
  // A card that repainted has a new panel: this one stops listening once it is out of the page.
  const onLayer = () => { if (!btn.isConnected) { window.removeEventListener('sr:layer', onLayer); return; } paint(); };
  window.addEventListener('sr:layer', onLayer);
  return { refresh: paint, destroy() { window.removeEventListener('sr:layer', onLayer); root.remove(); } };
}
