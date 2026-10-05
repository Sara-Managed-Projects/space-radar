// data/overlaytime.js -- which day's picture an Earth overlay asks for, and the address it asks.
//
// Pure: no fetch, no DOM, no three.js, so tests/test_overlays.mjs runs it in Node. The registry
// is registry/overlays.yaml (mirrored into data/overlays.js); the drawing is scene/earthoverlay.js.
//
// Contract:
//   overlayDates(rule, nowMs) -> ['YYYY-MM-DD', ...]   newest first, the first try and its fallbacks
//   overlayUrl(service, overlay, date, scale?) -> string
//   dateInWords(iso, rule) -> '3 October 2026' | 'June 2026'
//   overlayById(overlays, id) -> row | null
//
// WHY A LAG. GIBS makes a day's picture from that day's satellite passes, and a day is not over
// until it is over everywhere: asked for today's, most layers answer with an empty picture. So a
// daily layer asks for the day `lag_days` back, in UTC, and a monthly one for the first of the
// month `lag_months` back, each as its registry row measured it. `tries` further steps back are
// offered for the day the newest picture is late.

const DAY_MS = 86400000;
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const pad2 = (n) => String(n).padStart(2, '0');

function isoDay(ms) {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
}

/** The dates to ask for, newest first. An unknown rule yields none: nothing is guessed. */
export function overlayDates(rule, nowMs) {
  if (!rule || !Number.isFinite(nowMs)) return [];
  const tries = Math.max(0, Math.min(6, Number(rule.tries) || 0));
  const out = [];
  if (rule.rule === 'daily') {
    const lag = Math.max(0, Number(rule.lag_days) || 0);
    const day0 = Math.floor(nowMs / DAY_MS) * DAY_MS;
    for (let i = 0; i <= tries; i++) out.push(isoDay(day0 - (lag + i) * DAY_MS));
  } else if (rule.rule === 'monthly') {
    const lag = Math.max(0, Number(rule.lag_months) || 0);
    const d = new Date(nowMs);
    const months = d.getUTCFullYear() * 12 + d.getUTCMonth();
    for (let i = 0; i <= tries; i++) {
      const m = months - lag - i;
      out.push(`${Math.floor(m / 12)}-${pad2((((m % 12) + 12) % 12) + 1)}-01`);
    }
  }
  return out;
}

/**
 * One WMS GetMap of the whole globe, equirectangular, transparent where there is no data.
 * `scale` halves the picture for a small screen or a connection that saves data (0.5).
 */
export function overlayUrl(service, overlay, date, scale = 1) {
  const w = Math.max(256, Math.round((service.width || 2048) * scale));
  const h = Math.max(128, Math.round((service.height || 1024) * scale));
  const q = [
    'SERVICE=WMS', 'REQUEST=GetMap', 'VERSION=1.3.0',
    `LAYERS=${overlay.layer}`, 'STYLES=', 'CRS=EPSG:4326',
    // WMS 1.3.0 with EPSG:4326 takes the box as lat,lon: south, west, north, east.
    'BBOX=-90,-180,90,180',
    `WIDTH=${w}`, `HEIGHT=${h}`, 'FORMAT=image/png', 'TRANSPARENT=TRUE',
    `TIME=${date}`,
  ];
  return `${service.wms}?${q.join('&')}`;
}

/** The date a picture is of, as the card prints it: a day for a daily layer, a month otherwise. */
export function dateInWords(iso, rule) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso || ''));
  if (!m) return '';
  const month = MONTHS[Number(m[2]) - 1];
  if (!month) return '';
  return rule && rule.rule === 'monthly' ? `${month} ${m[1]}` : `${Number(m[3])} ${month} ${m[1]}`;
}

export function overlayById(overlays, id) {
  return (Array.isArray(overlays) ? overlays : []).find((o) => o && o.id === id) || null;
}
