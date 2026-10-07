// data/eonet.js -- what is happening on the Earth's surface now, from NASA's EONET (internal #281).
//
// Contract: EONET_URLS, parseEonet(docs, {nowMs}) -> records, fetchEarthEvents({fetch, nowMs}) ->
//           Promise<records>, eventKind(event) -> 'wildfire' | 'volcano' | 'iceberg' | null,
//           sizeKm2(value, unit) -> number | null
//
// NOTHING HERE IS IN THE FIRST VISIT. data/layers.js imports this file when the `earth-events`
// box is ticked (`load: 'on-demand'`), and only then are the two requests below made.
//
// THE SOURCE, READ AND MEASURED ON 2026-10-07 (registry/weather.yaml `earth-events` carries the
// same): the Earth Observatory Natural Event Tracker, https://eonet.gsfc.nasa.gov/docs/v3. No key.
// Both URLs answered `Access-Control-Allow-Origin: *` to `Origin: https://www.spaceradar.ai`.
// Its one condition is a disclaimer, quoted from https://eonet.gsfc.nasa.gov/what-is-eonet:
// "All EONET metadata and services are intended to be used for visualization and general
// information purposes only and should not be construed as 'official' with regards to spatial or
// temporal extent." The card says so in its own words (COPY.cls.earthevent).
//
// WHY TWO REQUESTS, AND WHY THESE.
//   * `status=open` alone is 7 204 events, 7 132 of them wildfires that a US agency opened and
//     nobody closed. So fires are asked for by date: the open ones with a report in the last 30
//     days (50 that day, 130 kB with the icebergs).
//   * A volcano's one report is the day its eruption began, which may be years ago (32 open, the
//     oldest from 2002), and an iceberg's latest position may be months old. A date window would
//     drop them, so they are asked for whole (22 kB and 137 kB). Severe storms are not asked for:
//     the `storms` layer draws those from GDACS, with their status.
//   * Whose fires: IRWIN (US federal incidents) and GDACS (large fires worldwide). It is not every
//     fire on Earth, and the layer's sentence says so.
//
// A RECORD IS A POINT AND A DATE. EONET gives a fire or a volcano as one point and an iceberg as a
// track of points; the record stands at the LATEST and carries its date, which the card prints.
// It is drawn from its first report until three days past the moment it was fetched: scrubbed a
// month on, nobody knows whether the fire still burns.

const DEG = Math.PI / 180;
const DAY_MS = 86400e3;
const BASE = 'https://eonet.gsfc.nasa.gov/api/v3/events';

export const EONET_URLS = [
  `${BASE}?status=open&category=wildfires&days=30`,
  `${BASE}?status=open&category=volcanoes,seaLakeIce`,
];
/** How long after it was read an event is still drawn. */
export const EVENT_KEPT_MS = 3 * DAY_MS;
const FETCH_TIMEOUT_MS = 20000;

const KIND_OF = { wildfires: 'wildfire', volcanoes: 'volcano', seaLakeIce: 'iceberg' };

/** What kind of event this is, or null for a category the layer does not draw. */
export function eventKind(event) {
  const cats = event && Array.isArray(event.categories) ? event.categories : [];
  for (const c of cats) if (c && KIND_OF[c.id]) return KIND_OF[c.id];
  return null;
}

/** A reported size in square kilometres: EONET gives acres for a fire and square nautical miles for an iceberg. */
export function sizeKm2(value, unit) {
  const v = Number(value);
  if (!Number.isFinite(v) || v <= 0) return null;
  const u = String(unit || '').toLowerCase();
  if (u === 'acres') return v * 0.0040468564224;
  if (u === 'nm^2') return v * 3.429904; // 1.852 km squared
  if (u === 'hectare' || u === 'hectares' || u === 'ha') return v / 100;
  if (u === 'km^2' || u === 'sq km') return v;
  return null;
}

function pointOf(g) {
  if (!g || g.type !== 'Point' || !Array.isArray(g.coordinates)) return null;
  const lonDeg = Number(g.coordinates[0]);
  const latDeg = Number(g.coordinates[1]);
  const tMs = Date.parse(g.date);
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg) || Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 360 || !Number.isFinite(tMs)) return null;
  return { latDeg, lonDeg: ((lonDeg + 540) % 360) - 180, tMs, value: g.magnitudeValue, unit: g.magnitudeUnit };
}

/**
 * @param {Array<Object|string>|Object|string} docs  one EONET answer or several (text or parsed)
 * @param {{nowMs?: number}} [opts]  WALL time when it was read: the end of each record's window
 * @returns {Array<Object>} records: klass 'earthevent', propagator 'fixed', frame 'earth-fixed'
 */
export function parseEonet(docs, opts = {}) {
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const out = [];
  const seen = new Set();
  for (let doc of Array.isArray(docs) ? docs : [docs]) {
    if (typeof doc === 'string') { try { doc = JSON.parse(doc); } catch { doc = null; } }
    const events = doc && Array.isArray(doc.events) ? doc.events : [];
    for (const e of events) {
      const kind = eventKind(e);
      if (!kind || !e || !e.id || e.closed) continue;
      const points = (Array.isArray(e.geometry) ? e.geometry : []).map(pointOf).filter(Boolean).sort((a, b) => a.tMs - b.tMs);
      if (!points.length) continue;
      const last = points[points.length - 1];
      // A report dated after it was read is a mistake upstream, not a forecast.
      if (last.tMs > nowMs + DAY_MS) continue;
      const id = `event-eonet-${String(e.id).replace(/^EONET_/, '')}`;
      if (seen.has(id)) continue;
      seen.add(id);
      const sources = (Array.isArray(e.sources) ? e.sources : []).filter((s) => s && s.id);
      const first = sources[0] || null;
      const https = first && /^https:\/\//.test(String(first.url || '')) ? String(first.url) : null;
      out.push({
        id,
        name: String(e.title || '').trim() || id,
        layer: 'earth-events',
        klass: 'earthevent',
        propagator: 'fixed',
        frame: 'earth-fixed',
        cls: 'measured',
        epoch: last.tMs,
        source: 'weather',
        fixed: { latRad: last.latDeg * DEG, lonRad: last.lonDeg * DEG, altKm: 0 },
        validFromMs: points[0].tMs,
        validToMs: nowMs + EVENT_KEPT_MS,
        meta: {
          kind,
          latDeg: last.latDeg,
          lonDeg: last.lonDeg,
          reportedMs: last.tMs,
          firstMs: points[0].tMs,
          reports: points.length,
          sizeKm2: sizeKm2(last.value, last.unit),
          agencies: sources.map((s) => String(s.id)),
          reportUrl: https,
          eonetId: String(e.id),
          readMs: nowMs,
        },
      });
    }
  }
  return out;
}

async function getText(url, fetchImpl) {
  const ctl = typeof AbortController === 'function' ? new AbortController() : null;
  const timer = ctl ? setTimeout(() => ctl.abort(), FETCH_TIMEOUT_MS) : null;
  try {
    // No credentials and no referrer: the request says nothing about who asks or from which page.
    const r = await fetchImpl(url, { credentials: 'omit', referrerPolicy: 'no-referrer', signal: ctl ? ctl.signal : undefined });
    if (!r.ok) throw new Error(`EONET answered ${r.status}`);
    return await r.text();
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * Both lists, read now. One of the two failing still gives the other's events; both failing
 * rejects, and the layer says it could not look (main.js `one`).
 */
export async function fetchEarthEvents(opts = {}) {
  const fetchImpl = opts.fetch || globalThis.fetch;
  const nowMs = Number.isFinite(opts.nowMs) ? opts.nowMs : Date.now();
  const got = await Promise.allSettled(EONET_URLS.map((u) => getText(u, fetchImpl)));
  const bodies = got.filter((g) => g.status === 'fulfilled').map((g) => g.value);
  if (!bodies.length) throw new Error(String((got[0].reason && got[0].reason.message) || 'EONET could not be read'));
  return parseEonet(bodies, { nowMs });
}
