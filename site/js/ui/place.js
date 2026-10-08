// ui/place.js -- where you are, and what comes over it tonight: the Tonight tab (spec 0061 req 3).
//
// Contract: createPlace(ctx) -> { root, refresh() }
// Also exported, pure: findCity(query, cities), observerFor(city)
//
// Moved out of ui/controls.js (its section 4, "Where you are", and the Now moment's first screen)
// when the left panel was taken apart. The behaviour is the panel's, line for line: a city from the
// bundled list or the browser's own answer -- which it cannot give over plain http, and says so --
// the current place rendered from the observer the app HOLDS (so a guess reads as a guess), the next
// twelve hours of bright passes, and a meteor shower peaking tonight. What changed is the setting:
// this is the Tonight tab now, the old Now door, and the page it opens is the sky from here (0051).

import { COPY, CITIES, t, fmt, timeText, compassWords, fistsWords } from '../copy/en.js';
import { predictPasses } from '../sky/passes.js';
import { showerItems, rowText as nextRowText } from './next.js';
import { SHOWERS } from '../data/showers.js';
import { roundPlace } from '../sky/guessplace.js';
import { placeValue, keepPlace, keptPlace, forgetPlace, browserStorage } from '../sky/placelink.js';
import { appBase, toast } from './share.js';
import '../copy/en.later.js';

const DEG_TO_RAD = Math.PI / 180;
const DEG = 180 / Math.PI;

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

export function createPlace(ctx, opts = {}) {
  const root = el('section', 'sr-place');
  root.appendChild(el('h2', 'sr-micro', COPY.controls.locationTitle));

  const current = el('p', 'sr-place__current', COPY.controls.locationNone);
  root.appendChild(current);

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

  // --- tonight ----------------------------------------------------------------------------------
  const tonight = el('section', 'sr-tonight');
  tonight.appendChild(el('h2', 'sr-micro', COPY.controls.tonightTitle));
  const shower = el('p', 'sr-tonight__shower');
  shower.hidden = true;
  const list = el('ul', 'sr-list sr-tonight__list');
  const empty = el('p', 'sr-tonight__note', COPY.controls.tonightNoObserver);
  tonight.append(shower, list, empty);
  // Under ui/tonight.js (opts.placeOnly) the passes are that view's: this list is not built or shown.
  if (!opts.placeOnly) root.appendChild(tonight);

  const observerNow = () => (ctx && ctx.observer ? ctx.observer : null);
  const withRad = (o) => (Number.isFinite(o.latRad) ? o : { ...o, latRad: o.latDeg * DEG_TO_RAD, lonRad: o.lonDeg * DEG_TO_RAD });
  const nowMs = () => (ctx.clock && typeof ctx.clock.now === 'function' ? ctx.clock.now() : Date.now());

  // Rendered from the observer the app holds, whoever set it -- these buttons, the Tonight tab's
  // guess, a shared link -- so the line can never describe a place no longer in use (measured:
  // setting London after a guess used to leave "We guessed Tehran" on screen).
  function renderCurrent() {
    const o = observerNow();
    if (!o) { current.textContent = COPY.controls.locationNone; current.classList.remove('is-guess', 'is-set'); return; }
    const name = o.name || t(COPY.controls.locationCoords, { lat: fmt.num(o.latDeg, 1), lon: fmt.num(o.lonDeg, 1) });
    if (o.source === 'shared') {
      current.textContent = t(K.shared, { name });
      current.classList.remove('is-guess');
      current.classList.add('is-set');
      return;
    }
    if (o.source === 'guess') {
      current.textContent = t(o.how === 'timezone' ? COPY.controls.locationGuessed : COPY.controls.locationGuessedByOffset, { name });
      current.classList.add('is-guess');
      current.classList.remove('is-set');
    } else {
      current.textContent = t(COPY.controls.locationSet, { name });
      current.classList.remove('is-guess');
      current.classList.add('is-set');
    }
  }

  function renderShower(o) {
    shower.hidden = true;
    if (!o) return;
    let item = null;
    try { item = showerItems(nowMs(), 36 * 3600e3, SHOWERS, withRad(o))[0] || null; } catch { item = null; }
    if (!item) return;
    shower.textContent = nextRowText(item, nowMs()) + COPY.punctuation.sentenceJoin + COPY.controls.tonightShowerTail;
    shower.hidden = false;
  }

  function renderTonight() {
    if (opts.placeOnly) return;
    while (list.firstChild) list.removeChild(list.firstChild);
    const o = observerNow();
    renderShower(o);
    if (!o) { empty.textContent = COPY.controls.tonightNoObserver; empty.hidden = false; return; }
    const records = []
      .concat(typeof ctx.recordsFor === 'function' ? ctx.recordsFor('stations') : [])
      .concat(typeof ctx.recordsFor === 'function' ? ctx.recordsFor('visual') : [])
      .filter((r) => r && r.satrec);
    if (!records.length) { empty.textContent = COPY.controls.tonightCouldNotLook; empty.hidden = false; return; }
    let passes = [];
    try { passes = predictPasses(records, withRad(o), nowMs(), 12).filter((p) => p.visible === true).slice(0, 5); } catch { passes = []; }
    if (!passes.length) { empty.textContent = COPY.controls.tonightNone; empty.hidden = false; return; }
    empty.hidden = true;
    for (const p of passes) {
      const li = el('li', 'sr-list__row');
      const b = button('sr-list__btn');
      b.appendChild(el('span', 'sr-list__name', (p.record && p.record.name) || COPY.card.unknownName));
      b.appendChild(el('span', 'sr-list__value', timeText.hhmm(p.startMs)));
      b.setAttribute('aria-label', t(COPY.controls.tonightRow, {
        name: (p.record && p.record.name) || COPY.card.unknownName,
        time: timeText.hhmm(p.startMs),
        dir: compassWords(p.startAz * DEG),
        fists: fistsWords(p.peakEl * DEG),
      }));
      b.title = b.getAttribute('aria-label');
      b.addEventListener('click', () => { if (p.record && typeof ctx.select === 'function') ctx.select(p.record); });
      li.appendChild(b);
      list.appendChild(li);
    }
  }

  const refresh = () => { renderCurrent(); renderKeep(); renderTonight(); };
  window.addEventListener('sr:observer', refresh);
  window.addEventListener('sr:layer', (e) => {
    const id = e.detail && e.detail.id;
    if (id === 'stations' || id === 'visual') renderTonight();
  });
  refresh();
  return { root, refresh };
}
