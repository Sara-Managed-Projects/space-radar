// ui/place.js -- where you are: the city box, "Use my location", Remember and Share this place.
//
// Contract: createPlace(ctx) -> { root, refresh(), focus() }
// Also exported, pure: findCity(query, cities), observerFor(city), placeFromPosition, placeLink
//
// The controls that set a place, and nothing else. They live INSIDE the Tonight view (ui/tonight.js
// builds them under its place line, behind "Change place"; internal #455, spec 0051 task 3). Until
// 2026-10-08 this file was a panel of its own with a second list of passes: the Tonight view took
// the tab, the panel was hidden, and for a while nobody could set a place at all. The list of
// passes is the view's now, and the line that says which place is in use is the view's too
// (sky/tonight.js placeWords), so a guess reads as a guess in one place only.

import { COPY, CITIES } from '../copy/en.js';
import { roundPlace } from '../sky/guessplace.js';
import { placeValue, keepPlace, keptPlace, forgetPlace, browserStorage } from '../sky/placelink.js';
import { appBase, toast } from './share.js';
import '../copy/en.later.js';

const DEG_TO_RAD = Math.PI / 180;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  return b;
}

/**
 * The place the browser answered with, rounded to 0.1 degree before it becomes anything else. This
 * is the ONLY function that reads `position.coords` (tests/test_place_privacy.mjs holds that), and
 * it keeps neither the accuracy nor the altitude, heading or speed the browser may also send.
 */
export function placeFromPosition(position, name) {
  const c = (position && position.coords) || {};
  const { latDeg, lonDeg } = roundPlace({ latDeg: c.latitude, lonDeg: c.longitude });
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  return { name, country: '', latDeg, lonDeg, source: 'geolocation' };
}

export function observerFor(city) {
  return {
    latRad: city.latDeg * DEG_TO_RAD,
    lonRad: city.lonDeg * DEG_TO_RAD,
    altKm: 0,
    latDeg: city.latDeg,
    lonDeg: city.lonDeg,
    name: city.name,
    source: city.source || 'city',
  };
}

/**
 * The link "Share this place" copies: the app's address with `p` and nothing else; '' without a
 * value. Built here and not by ui/share.js shareUrl, which has no place key at all: an ordinary
 * share can never carry a place, even from a tab that was opened on somebody's place link.
 */
export function placeLink(value, base = appBase()) {
  if (!value) return '';
  const root = String(base).endsWith('/') ? String(base) : `${base}/`;
  return `${root}#p=${encodeURIComponent(value)}`;
}

/** A city from the bundled list: exact, then prefix, then "name, country", then contains. Pure. */
export function findCity(query, cities = CITIES) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return null;
  let best = null;
  for (const city of cities) {
    const name = city.name.toLowerCase();
    if (name === needle) return city;
    if (!best && name.startsWith(needle)) best = city;
    if (!best && `${name}, ${String(city.country || '').toLowerCase()}` === needle) best = city;
  }
  if (best) return best;
  for (const city of cities) if (city.name.toLowerCase().includes(needle)) return city;
  return null;
}

export function createPlace(ctx) {
  const root = el('div', 'sr-place');
  root.setAttribute('role', 'group');
  root.setAttribute('aria-label', COPY.placeKeep.group);

  const row = el('div', 'sr-place__row');
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'sr-field sr-place__input';
  input.placeholder = COPY.controls.locationPlaceholder;
  input.setAttribute('aria-label', COPY.controls.locationSearchLabel);
  input.setAttribute('list', 'sr-cities');
  input.autocomplete = 'off';
  const datalist = document.createElement('datalist');
  datalist.id = 'sr-cities';
  for (const city of CITIES) {
    const option = document.createElement('option');
    option.value = city.name;
    option.label = city.country;
    datalist.appendChild(option);
  }
  const useMine = button('sr-chip', COPY.controls.locationUseMine, COPY.controls.locationUseMineTitle);
  const clearBtn = button('sr-chip sr-chip--quiet', COPY.controls.locationClear);
  row.append(input, datalist);
  root.appendChild(row);
  // Remember this place, and share it (internal #137). Both act on the place in use, rounded to
  // 0.1 degree by sky/placelink.js, and neither is offered for a place that was only guessed.
  const K = COPY.placeKeep;
  const keepBtn = button('sr-chip sr-chip--quiet', K.remember, K.rememberTitle);
  const shareBtn = button('sr-chip sr-chip--quiet', K.share, K.shareTitle);
  const chips = el('div', 'sr-place__chips');
  chips.append(useMine, clearBtn, keepBtn, shareBtn);
  root.appendChild(chips);
  const note = el('p', 'sr-place__note', '');
  note.hidden = true;
  root.appendChild(note);

  const secure = typeof window !== 'undefined' && window.isSecureContext === true;
  const hasGeo = typeof navigator !== 'undefined' && !!navigator.geolocation;
  const warn = (text) => { note.textContent = text; note.hidden = !text; note.classList.toggle('is-warning', !!text); };
  if (!secure) { useMine.disabled = true; useMine.title = COPY.controls.locationInsecure; }
  else if (!hasGeo) { useMine.disabled = true; useMine.title = COPY.controls.locationUnsupported; }

  const setPlace = (city) => {
    try { if (ctx && typeof ctx.setObserver === 'function') ctx.setObserver(observerFor(city)); } catch { /* the line says what was chosen */ }
  };
  const commit = () => {
    const city = findCity(input.value);
    if (!city) { warn(COPY.controls.locationNoMatch); return; }
    warn('');
    setPlace(city);
  };
  input.addEventListener('change', commit);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') commit(); });
  useMine.addEventListener('click', () => {
    if (useMine.disabled) return;
    warn(COPY.controls.locationAsking);
    note.classList.remove('is-warning');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const place = placeFromPosition(position, COPY.controls.locationUseMine);
        if (!place) { warn(COPY.controls.locationFailed); return; }
        warn('');
        setPlace(place);
      },
      (error) => warn(error && error.code === 1 ? COPY.controls.locationDenied : COPY.controls.locationFailed),
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 600000 },
    );
  });
  const isKept = () => { const k = keptPlace(browserStorage()); const o = ctx && ctx.observer; return !!k && !!o && placeValue(k) === placeValue(o); };
  const renderKeep = () => {
    const value = placeValue(ctx && ctx.observer);
    const kept = !!value && isKept();
    keepBtn.hidden = !value;
    shareBtn.hidden = !value;
    keepBtn.textContent = kept ? K.forget : K.remember;
    keepBtn.title = kept ? K.forgetTitle : K.rememberTitle;
    keepBtn.setAttribute('aria-pressed', kept ? 'true' : 'false');
  };
  keepBtn.addEventListener('click', () => {
    if (isKept()) { forgetPlace(browserStorage()); warn(''); }
    else if (keepPlace(browserStorage(), ctx.observer)) { warn(K.kept); note.classList.remove('is-warning'); }
    renderKeep();
  });
  shareBtn.addEventListener('click', () => {
    const url = placeLink(placeValue(ctx && ctx.observer));
    if (!url) return;
    const done = (ok) => toast(ok ? K.copied : K.copyFailed, 3000);
    try { navigator.clipboard.writeText(url).then(() => done(true), () => done(false)); } catch { done(false); }
  });
  clearBtn.addEventListener('click', () => {
    input.value = '';
    try { if (ctx && typeof ctx.setObserver === 'function') ctx.setObserver(null); } catch { /* nothing else to try */ }
  });

  // Clear is offered only when there is a place to clear; the field empties when the place is one
  // somebody else set (a shared link, the guess), so it never shows a city that is not in use.
  const refresh = () => {
    const o = ctx && ctx.observer;
    clearBtn.hidden = !o || o.source === 'guess';
    if (!o || (o.source !== 'city' && input.value)) input.value = '';
    renderKeep();
  };
  window.addEventListener('sr:observer', refresh);
  refresh();
  return { root, refresh, focus() { try { input.focus(); } catch { /* not in the page yet */ } } };
}
