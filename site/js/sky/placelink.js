// sky/placelink.js -- a place kept in this browser, and a place carried in a link (spec 0051
// requirement 3, internal #137).
//
// THE PROMISE. A visitor's place never leaves the browser, except in a link they make on purpose
// with "Share this place"; and that link, like the copy "Remember this place" keeps, carries the
// place rounded to 0.1 degree (about 11 km) and nothing else: no name typed by anybody, no
// accuracy, no height, no time. Both are refused for a place that was only guessed.
//
//   placeValue(observer)        "52.5,13.4" for the `p` key, or '' (no place, or a guess)
//   parsePlaceValue(text)       an observer { latDeg, lonDeg, latRad, lonRad, altKm, source: 'shared' },
//                               or null; anything finer than 0.1 degree is refused, not rounded,
//                               because this app never writes one
//   keepPlace(storage, o)       remember it (rounded); true when it was kept
//   keptPlace(storage)          the kept place as an observer with source 'kept', or null
//   forgetPlace(storage)        remove it
//   browserStorage()            this browser's localStorage, or null where there is none
//
// Pure but for the storage handed in. tests/test_place_privacy.mjs holds that this is the only
// file that stores a place and the only one that writes one into an address.

import { roundPlace } from './guessplace.js';

export const PLACE_KEY = 'sr.place';
const RAD = Math.PI / 180;

const usable = (o) => !!o && o.source !== 'guess' && Number.isFinite(o.latDeg) && Number.isFinite(o.lonDeg)
  && Math.abs(o.latDeg) <= 90 && Math.abs(o.lonDeg) <= 180;

const tenth = (v) => String(Math.round(v * 10) / 10);

export function placeValue(observer) {
  if (!usable(observer)) return '';
  const r = roundPlace(observer);
  return `${tenth(r.latDeg)},${tenth(r.lonDeg)}`;
}

function observerAt(latDeg, lonDeg, source, name) {
  const o = { latDeg, lonDeg, latRad: latDeg * RAD, lonRad: lonDeg * RAD, altKm: 0, source };
  if (name) o.name = name;
  return o;
}

export function parsePlaceValue(text) {
  const m = /^(-?\d{1,2}(?:\.\d)?),(-?\d{1,3}(?:\.\d)?)$/.exec(String(text == null ? '' : text).trim());
  if (!m) return null;
  const latDeg = Number(m[1]);
  const lonDeg = Number(m[2]);
  if (Math.abs(latDeg) > 90 || Math.abs(lonDeg) > 180) return null;
  return observerAt(latDeg, lonDeg, 'shared');
}

export function browserStorage() {
  try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; }
}

export function keepPlace(storage, observer) {
  const value = placeValue(observer);
  if (!storage || !value) return false;
  // A city's name comes from the bundled list; the browser's own answer has no name worth keeping.
  const name = observer.source === 'city' && typeof observer.name === 'string' ? observer.name : '';
  try { storage.setItem(PLACE_KEY, JSON.stringify({ p: value, name })); return true; } catch { return false; }
}

export function keptPlace(storage) {
  if (!storage) return null;
  try {
    const raw = JSON.parse(storage.getItem(PLACE_KEY) || 'null');
    const o = raw ? parsePlaceValue(raw.p) : null;
    if (!o) return null;
    return observerAt(o.latDeg, o.lonDeg, 'kept', typeof raw.name === 'string' ? raw.name.slice(0, 60) : '');
  } catch {
    return null;
  }
}

export function forgetPlace(storage) {
  try { if (storage) storage.removeItem(PLACE_KEY); } catch { /* nothing kept, nothing to forget */ }
}
