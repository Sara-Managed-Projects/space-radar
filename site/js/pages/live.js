// pages/live.js -- the browser half of the crawlable pages under /iss/, /starlink/, /satellites/,
// /planets-tonight/, /events/ and /sources/ (scripts/seo_pages.py builds them).
//
// WHAT A PAGE IS. Static HTML that already answers the question in a dated sentence (a crawler, a
// no-script reader and a link preview see only that), plus this module, which replaces the numbers
// in `[data-slot]` elements with ones worked out in the visitor's own browser for the instant it is
// opened. Nothing here runs a clock the app does not: the maths are the app's own modules
// (propagate/sgp4.js, sky/passes.js, sky/tonightbest.js, sky/radiants.js, sky/overplace.js).
//
// NO LOCATION PROMPT ON LOAD. The place is, in order: the one the visitor kept in the app
// (sky/placelink.js, this origin's own storage), a city guessed from the browser's time zone
// (sky/guessplace.js: never an IP lookup), and says which. A typed city is a choice from the bundled
// list (copy/en.js CITIES). The browser's own position is asked for only when the visitor presses
// "Use my location", rounded to 0.1 degree (11 km) before anything uses it, and never kept.
//
// SAVED ELEMENTS ONLY. The ISS's position comes from data/v1/celestrak-stations.json, the harvester's
// saved copy (beside the page, on this origin), and the page says how old its elements are. The page
// asks CelesTrak for nothing: its usage policy allows one download per update and a page that
// every search result opens would be a client of it from every visitor's address (CREDITS.md 4.1).
//
// Pure functions are exported for tests/test_pagelive.mjs; `boot()` is the only code that touches
// the document, and it does nothing outside a page that carries `data-live`.

import * as satellite from '../../vendor/satellite.esm.js';
import { satrecFrom } from '../propagate/sgp4.js';
import { placeAt } from '../sky/overplace.js';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
export const ISS_NORAD = 25544;
export const SNAPSHOT_BASE = '../data/v1/';
export const STARLINK_SOURCE = 'celestrak-supplemental-starlink';
export const ACTIVE_SOURCE = 'celestrak-active';
export const STATIONS_SOURCE = 'celestrak-stations';
export const LL2_STATIONS_SOURCE = 'll2-stations';

// --- saved copies --------------------------------------------------------------------------------

/** {items, fetchedAt, validUntil, status} of one source from data/v1/index.json, or null. */
export function snapshotRow(index, id) {
  const row = index && index.snapshots && index.snapshots[id];
  if (!row || !Number.isFinite(row.items) || !row.fetched_at) return null;
  return { items: row.items, fetchedAt: row.fetched_at, validUntil: row.valid_until || null, status: row.status || null };
}

/** The ISS's element set (CelesTrak OMM JSON) out of the stations snapshot's body, or null. */
export function issElements(snapshot) {
  const body = snapshot && snapshot.body;
  if (!Array.isArray(body)) return null;
  const row = body.find((o) => o && Number(o.NORAD_CAT_ID) === ISS_NORAD);
  return row || null;
}

/** "4 October 2026" in English, from an ISO instant, in UTC. */
export function dateWords(iso) {
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return '';
  return `${d.getUTCDate()} ${['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'][d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

/** 11129 -> "11,129" (the page's own format; no locale, so a crawler and a browser agree). */
export function groups(n) {
  return String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

// --- the ISS ---------------------------------------------------------------------------------------

/** Where the station is below, and how fast, at an instant. Null when the elements cannot be used. */
export function subpoint(omm, ms) {
  const rec = satrecFrom(omm);
  if (!rec || !Number.isFinite(ms)) return null;
  const when = new Date(ms);
  const pv = satellite.propagate(rec, when);
  if (!pv || !pv.position || typeof pv.position === 'boolean') return null;
  const gmst = satellite.gstime(when);
  const geo = satellite.eciToGeodetic(pv.position, gmst);
  const v = pv.velocity;
  return {
    latDeg: geo.latitude * DEG,
    lonDeg: ((((geo.longitude * DEG) + 180) % 360) + 360) % 360 - 180,
    altKm: geo.height,
    speedKmh: v && typeof v !== 'boolean' ? Math.hypot(v.x, v.y, v.z) * 3600 : null,
  };
}

/** "51.2° N", "0.4° W": a coordinate as a sentence reads it. */
export function degWords(v, pos, neg) {
  return `${(Math.round(Math.abs(v) * 10) / 10).toFixed(1)}° ${v >= 0 ? pos : neg}`;
}

/** "over Brazil", "over the Pacific Ocean", "near the border of Chad and Sudan"; '' without a table. */
export function overWords(place) {
  if (!place) return '';
  const name = (i) => (place.the && place.the[i] ? `the ${place.names[i]}` : place.names[i]);
  if (place.kind === 'border') return `near the border of ${name(0)} and ${name(1)}`;
  if (place.kind === 'land') return 'over land';
  if (place.kind === 'water' || !place.names.length) return 'over open water';
  return `over ${name(0)}`;
}

/** The ISS sentence the page prints once the browser has worked it out. */
export function issSentence(sub, place) {
  if (!sub) return '';
  const over = overWords(place);
  return `The International Space Station is now at ${degWords(sub.latDeg, 'N', 'S')}, ${degWords(sub.lonDeg, 'E', 'W')}${over ? `, ${over}` : ''}, ${groups(sub.altKm)} km up and moving at ${groups(sub.speedKmh || 0)} km/h.`;
}

/** The next pass worth looking for from a place: [{startMs, peakMs, endMs, peakEl, visible}], first visible, else first. */
export function nextPassOf(passes) {
  const list = Array.isArray(passes) ? passes.slice().sort((a, b) => a.startMs - b.startMs) : [];
  return list.find((p) => p.visible === true) || null;
}

export function clockWords(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-GB', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timeZone || undefined }).format(new Date(ms));
  } catch {
    return new Date(ms).toISOString().slice(0, 16).replace('T', ' ') + ' UT';
  }
}

export function compass(azRad) {
  const names = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
  return names[Math.round((((azRad * DEG) % 360) + 360) % 360 / 22.5) % 16];
}

export function hhmm(ms, timeZone) {
  try {
    return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: timeZone || undefined }).format(new Date(ms));
  } catch {
    return `${new Date(ms).toISOString().slice(11, 16)} UT`;
  }
}

export function passWords(pass, timeZone) {
  if (!pass) return '';
  return `${clockWords(pass.startMs, timeZone)}, rising in the ${compass(pass.startAz)}, highest ${Math.round(pass.peakEl * DEG)}° up at ${hhmm(pass.peakMs, timeZone)}, setting in the ${compass(pass.endAz)}.`;
}

// --- planets and events ------------------------------------------------------------------------------

/** What a place sees tonight, as the planets page prints it. `T` is sky/tonightbest.js. */
export function planetsTonight(T, observer, nowMs) {
  const win = T.nightWindow(observer, nowMs);
  if (!win) return { win: null, up: [], down: [], moon: null };
  const names = { mercury: 'Mercury', venus: 'Venus', mars: 'Mars', jupiter: 'Jupiter', saturn: 'Saturn' };
  const up = [];
  const down = [];
  for (const id of T.NAKED_EYE_PLANETS) {
    const p = T.planetTonight(id, observer, win);
    if (p) up.push({ id, name: names[id], bestMs: p.bestMs, altDeg: Math.round(p.altDeg), azDeg: Math.round(p.azDeg), compass: T.compassShort(p.azDeg), mag: Math.round(p.mag * 10) / 10 });
    else down.push(names[id]);
  }
  up.sort((a, b) => a.mag - b.mag);
  return { win, up, down, moon: T.moonTonight(observer, win) };
}

/** "Venus, magnitude −4.1, highest at 18:20 UT, 31° up in the SSW" per row. */
export function planetRowWords(row, timeZone) {
  const mag = (row.mag < 0 ? '\u2212' : '') + Math.abs(row.mag).toFixed(1);
  return `${row.name}, magnitude ${mag}: highest at ${hhmm(row.bestMs, timeZone)}, ${row.altDeg}° up in the ${row.compass}.`;
}

/**
 * What one dated event looks like from a place. `A` is Astronomy Engine, `R` is sky/radiants.js.
 * A shower: the radiant's height and the Moon's at the peak; an eclipse: the local circumstances;
 * a planet: its height then. A mission has nothing to see from the ground: null.
 */
export function eventFromPlace(A, R, ev, observer) {
  const obs = new A.Observer(observer.latDeg, observer.lonDeg, 0);
  const out = {};
  const peakMs = Date.parse(ev.instant);
  if (ev.kind === 'meteor-shower' && ev.shower) {
    const radiant = R.radiantAltAz({ ra_h: ev.shower.raH, dec: ev.shower.decDeg }, peakMs, observer);
    const eq = A.Equator('Moon', new Date(peakMs), obs, true, true);
    const moon = A.Horizon(new Date(peakMs), obs, eq.ra, eq.dec, 'normal');
    out.radiantAltDeg = Math.round(radiant.altDeg);
    out.moonAltDeg = Math.round(moon.altitude);
  } else if (ev.kind === 'eclipse') {
    const local = A.SearchLocalSolarEclipse(new Date(Date.parse(ev.instant) - 3 * 86400e3), obs);
    const near = Math.abs(local.peak.time.date.getTime() - peakMs) < 86400e3;
    if (near && local.peak.altitude > 0) {
      out.eclipse = { kind: local.kind, obscuration: Math.round((local.obscuration || 0) * 100), maxMs: local.peak.time.date.getTime(), altDeg: Math.round(local.peak.altitude) };
    } else {
      out.eclipse = { kind: 'none', obscuration: 0, maxMs: null, altDeg: null };
    }
  }
  for (const a of ev.also || []) {
    const name = a.body[0].toUpperCase() + a.body.slice(1);
    const eq = A.Equator(name, new Date(a.instantMs), obs, true, true);
    const h = A.Horizon(new Date(a.instantMs), obs, eq.ra, eq.dec, 'normal');
    (out.also = out.also || []).push({ body: a.body, altDeg: Math.round(h.altitude), azDeg: Math.round(h.azimuth) });
  }
  return out;
}

// --- the place ---------------------------------------------------------------------------------------

export function cityObserver(city) {
  return { name: city.name, country: city.country, latDeg: city.latDeg, lonDeg: city.lonDeg, altKm: 0, latRad: city.latDeg * RAD, lonRad: city.lonDeg * RAD, source: 'city', zone: city.zone || null };
}

/** Kept place, else the time zone's guess; null if neither (the static answer then stands). */
export function firstObserver({ kept, guess }) {
  if (kept) return { ...kept, how: 'kept' };
  return guess || null;
}

export function placeLabel(o) {
  if (!o) return '';
  if (o.source === 'guess') return `${o.name} (a guess from your time zone)`;
  if (o.source === 'kept') return o.name ? `${o.name} (the place you set in the map)` : 'the place you set in the map';
  if (o.source === 'geo') return 'your position (rounded to 11 km, not kept)';
  return o.name || '';
}

// --- the document -----------------------------------------------------------------------------------------

const slot = (name) => (typeof document === 'undefined' ? [] : [...document.querySelectorAll(`[data-slot="${name}"]`)]);
const say = (name, text) => { for (const el of slot(name)) el.textContent = text; };
const show = (name, on) => { for (const el of slot(name)) el.hidden = !on; };
async function getJson(url) {
  const r = await fetch(url);
  if (!r.ok) throw new Error(String(r.status));
  return r.json();
}

async function placePicker(onChange) {
  const { CITIES } = await import('../copy/en.js');
  const { guessObserver } = await import('../sky/guessplace.js');
  const { keptPlace, browserStorage } = await import('../sky/placelink.js');
  const select = document.querySelector('[data-slot="place-select"]');
  let observer = firstObserver({ kept: keptPlace(browserStorage()), guess: guessObserver(CITIES) });
  if (select) {
    const opt = (v, t) => { const o = document.createElement('option'); o.value = v; o.textContent = t; return o; };
    select.append(opt('', 'Choose a city'));
    CITIES.slice().sort((a, b) => a.name.localeCompare(b.name)).forEach((c, i) => select.append(opt(String(CITIES.indexOf(c)), `${c.name}, ${c.country}`)));
    select.addEventListener('change', () => {
      if (select.value === '') return;
      observer = cityObserver(CITIES[Number(select.value)]);
      say('place', placeLabel(observer));
      onChange(observer);
    });
  }
  say('place', placeLabel(observer));
  return observer;
}

function readJsonSlot(id) {
  const el = document.getElementById(id);
  try { return el ? JSON.parse(el.textContent) : null; } catch { return null; }
}

async function bootIss() {
  const [snap, index] = await Promise.all([
    getJson(`${SNAPSHOT_BASE}${STATIONS_SOURCE}.json`).catch(() => null),
    getJson(`${SNAPSHOT_BASE}index.json`).catch(() => null),
  ]);
  const omm = issElements(snap);
  if (!omm) return; // the static answer stands, and says it is a saved sentence
  const { loadPlaces } = await import('../sky/overplace.js');
  const places = await loadPlaces({ base: '../data/' });
  const epochIso = omm.EPOCH ? `${omm.EPOCH}Z`.replace(/ZZ$/, 'Z') : null;
  const draw = () => {
    const sub = subpoint(omm, Date.now());
    if (!sub) return;
    const place = places ? placeAt(places, sub.latDeg, sub.lonDeg) : null;
    say('iss-sentence', issSentence(sub, place));
    say('iss-lat', degWords(sub.latDeg, 'N', 'S'));
    say('iss-lon', degWords(sub.lonDeg, 'E', 'W'));
    say('iss-over', overWords(place) || '');
    say('iss-alt', `${groups(sub.altKm)} km`);
    say('iss-speed', `${groups(sub.speedKmh || 0)} km/h`);
  };
  draw();
  setInterval(draw, 5000);
  const age = epochIso ? Math.max(0, Math.round((Date.now() - Date.parse(epochIso)) / 86400e3)) : null;
  say('iss-age', age === null ? '' : `Worked out now from orbital elements ${age === 0 ? 'from today' : age === 1 ? 'a day old' : `${age} days old`}, saved ${dateWords(snap.fetched_at)}. The position is a calculation, not a live photograph.`);
  show('iss-live', true);
  getJson(`${SNAPSHOT_BASE}${LL2_STATIONS_SOURCE}.json`).then(async (b) => {
    const { parseStations } = await import('../data/crew.js');
    const st = parseStations(b.body)['sat-25544'];
    if (st && st.crewCount !== null) say('iss-crew', `${st.crewCount} people aboard, by the Launch Library's own count of ${dateWords(b.fetched_at)}`);
  }).catch(() => {});
  const passesFor = async (observer) => {
    if (!observer) return;
    const { predictPasses } = await import('../sky/passes.js');
    const rec = { satrec: satrecFrom(omm) };
    const next = nextPassOf(predictPasses([rec], observer, Date.now(), 72));
    say('iss-pass', next ? `From ${placeLabel(observer)}: ${passWords(next, observer.zone)}` : `From ${placeLabel(observer)}: no visible pass in the next three days (visible means above 10°, in sunlight, with the sky dark).`);
  };
  const observer = await placePicker(passesFor);
  passesFor(observer);
}

async function bootCounts() {
  const index = await getJson(`${SNAPSHOT_BASE}index.json`).catch(() => null);
  for (const [id, name] of [[STARLINK_SOURCE, 'starlink'], [ACTIVE_SOURCE, 'active']]) {
    const row = snapshotRow(index, id);
    if (!row) continue;
    say(`count-${name}`, groups(row.items));
    say(`count-${name}-date`, dateWords(row.fetchedAt));
  }
}

async function bootPlanets() {
  const T = await import('../sky/tonightbest.js');
  const draw = (observer) => {
    if (!observer) return;
    const r = planetsTonight(T, observer, Date.now());
    const list = document.querySelector('[data-slot="planets-list"]');
    if (!list || !r.win) return;
    list.textContent = '';
    for (const row of r.up) { const li = document.createElement('li'); li.textContent = planetRowWords(row, observer.zone); list.append(li); }
    say('planets-summary', r.up.length ? `From ${placeLabel(observer)} tonight, ${r.up.length === 1 ? 'one planet is' : `${r.up.length} planets are`} worth looking for.` : `From ${placeLabel(observer)} no bright planet is well up while the sky is dark tonight.`);
    say('planets-down', r.down.length ? `Not well placed tonight: ${r.down.join(', ')}.` : '');
    say('moon-line', r.moon ? `The Moon is ${r.moon.percent} percent lit (${r.moon.phase})${r.moon.upTonight ? ' and is up in the dark.' : ' and is not up in the dark.'}` : '');
    show('planets-live', true);
  };
  draw(await placePicker(draw));
}

async function bootEvent() {
  const ev = readJsonSlot('event-data');
  if (!ev) return;
  const A = await import('../../vendor/astronomy.js');
  const R = await import('../sky/radiants.js');
  const draw = (observer) => {
    if (!observer) return;
    let r;
    try { r = eventFromPlace(A, R, ev, observer); } catch { return; }
    const parts = [];
    if (r.radiantAltDeg !== undefined) {
      parts.push(r.radiantAltDeg > 0 ? `At the peak the radiant is ${r.radiantAltDeg}° above the horizon` : 'At the peak the radiant is below the horizon');
      parts.push(r.moonAltDeg > 0 ? `and the Moon is up (${r.moonAltDeg}°)` : 'and the Moon is down');
    }
    if (r.eclipse) {
      if (r.eclipse.kind === 'none') parts.push('No part of this eclipse is visible from there');
      else parts.push(`From there it is ${r.eclipse.kind === 'partial' ? 'a partial eclipse' : r.eclipse.kind === 'annular' ? 'an annular eclipse' : 'a total eclipse'}, ${r.eclipse.obscuration} percent of the Sun covered at most, the Sun ${r.eclipse.altDeg}° up at the greatest`);
    }
    for (const a of r.also || []) parts.push(`${a.body[0].toUpperCase() + a.body.slice(1)} is ${a.altDeg > 0 ? `${a.altDeg}° up` : 'below the horizon'} at its greatest elongation`);
    if (!parts.length) return;
    say('event-local', `From ${placeLabel(observer)}: ${parts.join(', ')}.`);
    show('event-local', true);
  };
  draw(await placePicker(draw));
}

async function bootSources() {
  const index = await getJson(`${SNAPSHOT_BASE}index.json`).catch(() => null);
  for (const el of slot('source-read')) {
    const row = snapshotRow(index, el.dataset.source);
    if (row) el.textContent = dateWords(row.fetchedAt);
  }
}

export function boot() {
  if (typeof document === 'undefined') return;
  const host = document.querySelector('[data-live]');
  if (!host) return;
  const kind = host.dataset.live;
  const run = { iss: [bootIss, bootCounts], counts: [bootCounts], planets: [bootPlanets], event: [bootEvent], sources: [bootSources] }[kind] || [];
  for (const fn of run) fn().catch(() => { /* the static answer stands */ });
}

boot();
