// ui/spaceweather.js -- one line of space weather, measured just now (spec 0026 req 16).
//
// Contract: createSpaceWeather(ctx, host) -> { refresh(), destroy() }
// Pure and exported for the test:
//   kpWords(kp) -> the word a beginner needs ('quiet' .. 'severe storm'), and the G-scale
//   spaceWeatherLine(parsed, result, nowMs) -> the sentence, or null when there is nothing to say
//
// orbitalradar's best beginner hook: a line that says why the sky is odd tonight. One free NOAA
// SWPC feed the app already has a source row and a parser for (swpc-kp, parseSpaceWeather). The
// line names the number, the word, how old the reading is and where it came from -- and when NOAA
// gave only a forecast, or the reading is stale, it says that instead of dressing it up.

import { COPY, t, fmt, timeText } from '../copy/en.js';
import { load } from '../data/sources.js';
import { parseSpaceWeather } from '../data/parsers.js';

const SOURCE_ID = 'swpc-kp';
const REFRESH_MS = 5 * 60e3;

/** NOAA's G scale from Kp: G1 at Kp 5 .. G5 at Kp 9. Below 5 there is no storm and no G. */
export function kpWords(kp) {
  const W = COPY.spaceWeather.words;
  if (!Number.isFinite(kp)) return { word: W.unknown, scale: null };
  if (kp < 3) return { word: W.quiet, scale: null };
  if (kp < 4) return { word: W.unsettled, scale: null };
  if (kp < 5) return { word: W.active, scale: null };
  if (kp < 6) return { word: W.minorStorm, scale: 'G1' };
  if (kp < 7) return { word: W.moderateStorm, scale: 'G2' };
  if (kp < 8) return { word: W.strongStorm, scale: 'G3' };
  if (kp < 9) return { word: W.severeStorm, scale: 'G4' };
  return { word: W.extremeStorm, scale: 'G5' };
}

function agoText(ms) {
  const T = COPY.spaceWeather;
  if (!Number.isFinite(ms) || ms < 0) return T.justNow;
  if (ms < 90e3) return T.justNow;
  if (ms < 3600e3) return t(T.minutesAgo, { n: Math.round(ms / 60e3) });
  if (ms < 48 * 3600e3) return t(T.hoursAgo, { n: Math.round(ms / 3600e3) });
  return t(T.daysAgo, { n: Math.round(ms / 86400e3) });
}

/**
 * The sentence. `parsed` is parseSpaceWeather's output, `result` the LoadResult it came from (for
 * the reading's age and provenance), `nowMs` the wall clock.
 */
export function spaceWeatherLine(parsed, result, nowMs) {
  const T = COPY.spaceWeather;
  if (!parsed || !Number.isFinite(parsed.kp)) return null;
  const observed = Number.isFinite(parsed.observedKp);
  const kp = observed ? parsed.observedKp : parsed.kp;
  const { word, scale } = kpWords(kp);
  const level = scale ? t(T.levelWithScale, { kp: fmt.smart(kp), word, scale }) : t(T.level, { kp: fmt.smart(kp), word });
  // The reading's own time beats the fetch time: NOAA's rows are stamped, and a three-hour bin read
  // five minutes ago is still up to three hours old.
  const rows = Array.isArray(parsed.forecast) ? parsed.forecast.filter((r) => r.observed === 'observed' || r.observed === 'estimated') : [];
  const readingMs = rows.length ? rows[rows.length - 1].tMs : result && Number.isFinite(result.fetchedAt) ? result.fetchedAt : null;
  const age = Number.isFinite(readingMs) ? agoText(nowMs - readingMs) : T.ageUnknown;
  const via = result && result.via === 'snapshot' ? T.viaSnapshot : T.viaLive;
  let line = observed ? t(T.measured, { level, age, via }) : t(T.forecastOnly, { level, via });
  if (result && result.stale) line += ' ' + T.stale;
  if (Number.isFinite(parsed.maxForecastKp) && parsed.maxForecastKp >= 5 && (!observed || parsed.maxForecastKp > kp + 0.5)) {
    line += ' ' + t(T.stormComing, { kp: fmt.smart(parsed.maxForecastKp) });
  }
  return line;
}

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function createSpaceWeather(ctx, host) {
  if (!host || typeof document === 'undefined') return { refresh() {}, destroy() {} };
  const T = COPY.spaceWeather;
  const line = el('p', 'sr-status__weather');
  line.hidden = true;
  host.appendChild(line);
  let timer = null;
  let last = null;

  async function refresh() {
    let result;
    try { result = await load(SOURCE_ID); } catch { result = null; }
    if (!result || result.data == null) {
      line.textContent = result && result.error ? t(T.couldNotLook, { why: result.error }) : T.couldNotLook0;
      line.hidden = false;
      return;
    }
    let parsed = null;
    try { parsed = parseSpaceWeather(result.data); } catch { parsed = null; }
    const text = spaceWeatherLine(parsed, result, Date.now());
    if (!text) { line.textContent = T.couldNotLook0; line.hidden = false; return; }
    line.textContent = text;
    line.hidden = false;
    last = { parsed, result };
    if (ctx) ctx.spaceWeather = last;
  }

  refresh();
  timer = window.setInterval(refresh, REFRESH_MS);
  return {
    refresh,
    destroy() { window.clearInterval(timer); line.remove(); },
  };
}
