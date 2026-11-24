// ui/eclipsecheck.js -- "will I see it": the total solar eclipse of 2 August 2027 from one place, a catalogue of ui/catalogue.js
// (research train "catalogues", forge #553).
//
// Contract: mountEclipseCheck(pane, ctx, api) -> { show(arg), hide() }   arg: a place's name from our own lists (`#cat=eclipse:Luxor`)
// Also exported, pure (tests/test_eclipse_2027.mjs):
//   placeList(cities, rows) -> [{name, country, latDeg, lonDeg}]   the map's cities, then Natural Earth's places of the eclipse
//   matchPlaces(list, query, n = 6) -> [place]                       by name, accents and case ignored, starts before contains
//   durationParts(seconds) -> {m, s}                                 "6 min 21 s", the seconds rounded, never "60 s"
//   answerFor(place) -> localCircumstances(...) for 2 August 2027
//
// THE ARITHMETIC is sky/besselian.js: NASA GSFC's Besselian elements of this eclipse, the local circumstances method of the
// Explanatory Supplement. tests/test_eclipse_2027.mjs holds it to NASA's own central-line table and to the minute-rounded times
// published for four cities.
//
// NOTHING LEAVES THE PAGE. A typed name is looked up in two lists the map ships (copy/en.js CITIES and
// data/eclipse-2027-places.json, Natural Earth's places that see the eclipse); "Use my location" asks the browser only when it
// is pressed, through ui/place.js askPosition (the one place that asks), rounded to 0.1 degree before it is used, and kept by no one.
// A place from the lists may go in the address by its NAME (`#cat=eclipse:Luxor`); a position never does.

import { COPY, CITIES, t, fmt, timeText } from '../copy/en.js';
import '../copy/en.skycalendar.js';
import { el, button, sourceLine, readJsonCopy } from './catalogkit.js';
import { ECLIPSE_2027_08_02, localCircumstances } from '../sky/besselian.js';
import { askPosition } from './place.js';
import { icon } from './icons.js';

const PLACES_URL = new URL('../../data/eclipse-2027-places.json', import.meta.url).href;

/** The map's own cities first, then the places of the eclipse that are not already among them. Pure. */
export function placeList(cities = CITIES, rows = []) {
  const out = (cities || []).map((c) => ({ name: c.name, country: c.country || '', latDeg: c.latDeg, lonDeg: c.lonDeg }));
  const have = new Set(out.map((p) => fold(p.name)));
  for (const [name, country, lat, lon] of rows || []) {
    if (have.has(fold(name))) continue;
    out.push({ name, country, latDeg: lat, lonDeg: lon });
  }
  return out;
}

const fold = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();

/** Places whose name starts with the query, then those that contain it; "name, country" works too. Pure. */
export function matchPlaces(list, query, n = 6) {
  const q = fold(query);
  if (q.length < 2) return [];
  const exact = [], starts = [], has = [];
  for (const p of list) {
    const name = fold(p.name);
    const full = `${name}, ${fold(p.country)}`;
    if (name === q || full === q) exact.push(p);
    else if (name.startsWith(q) || full.startsWith(q)) starts.push(p);
    else if (name.includes(q)) has.push(p);
  }
  return exact.concat(starts, has).slice(0, n);
}

/** Seconds as whole minutes and seconds. Pure. */
export function durationParts(seconds) {
  let m = Math.floor(seconds / 60);
  let s = Math.round(seconds - m * 60);
  if (s === 60) { m += 1; s = 0; }
  return { m, s };
}

/** What a place sees of 2 August 2027. */
export function answerFor(place) {
  return localCircumstances(ECLIPSE_2027_08_02, place.latDeg, place.lonDeg, 0);
}

export function mountEclipseCheck(pane, ctx, api) {
  const W = COPY.eclipseCheck;
  const box = el('div', 'sr-ecl');
  pane.appendChild(box);
  box.appendChild(el('p', 'sr-cat__lead', W.lead));

  const form = el('form', 'sr-ecl__form');
  form.setAttribute('role', 'search');
  const label = el('label', 'sr-cat__filterlabel', W.placeLabel);
  label.htmlFor = 'sr-ecl-place';
  const field = el('div', 'sr-cat__field');
  const input = document.createElement('input');
  input.className = 'sr-cat__input';
  input.id = 'sr-ecl-place';
  input.type = 'search';
  input.autocomplete = 'off';
  input.spellcheck = false;
  input.placeholder = W.placeholder;
  const check = button('ui-btn ui-btn--primary ui-btn--sm', W.check);
  check.type = 'submit';
  field.append(input, check);
  const mine = button('ui-btn ui-btn--secondary ui-btn--sm sr-ecl__mine', '', W.useMine);
  mine.appendChild(icon('navigation', 16));
  mine.appendChild(el('span', 'ui-btn__label', W.useMine));
  form.append(label, field, mine);
  box.appendChild(form);
  const hint = el('p', 'sr-cat__count');
  hint.setAttribute('role', 'status');
  const sugg = el('ul', 'sr-list sr-ecl__sugg');
  sugg.setAttribute('aria-label', W.suggestions);
  box.append(hint, sugg);

  const result = el('section', 'sr-cat__sect sr-ecl__result');
  result.setAttribute('aria-live', 'polite');
  result.hidden = true;
  box.appendChild(result);

  box.appendChild(el('p', 'sr-sect__note sr-ecl__safety', W.safety));
  box.appendChild(el('p', 'sr-sect__note', W.method));
  const src = ECLIPSE_2027_08_02.source;
  box.appendChild(sourceLine({ source: W.sourceName, url: src.url, licence: W.licence, readMs: Date.parse(`${src.read}T00:00:00Z`), via: 'read' }));
  box.appendChild(el('p', 'sr-sect__note', W.placesNote));

  let list = placeList(CITIES, []);
  const ready = readJsonCopy([{ url: PLACES_URL, via: 'bundled' }]).then((got) => {
    if (got && got.data && Array.isArray(got.data.rows)) list = placeList(CITIES, got.data.rows);
    return list;
  });

  const both = (ms) => (ms === null ? COPY.catalogue.unknown : t(W.time, { utc: timeText.utcHm(ms), local: timeText.hhmm(ms) }));
  const dur = (sec) => { const p = durationParts(sec); return t(W.dur, { m: fmt.int(p.m), s: fmt.int(p.s) }); };

  function paint(place, fromName) {
    const r = answerFor(place);
    result.textContent = '';
    result.hidden = false;
    let head;
    if (r.kind === 'total') head = t(W.total, { dur: dur(r.durationS) });
    else if (r.kind === 'annular') head = t(W.annular, { dur: dur(r.durationS) });
    else if (r.kind === 'partial') head = t(W.partial, { pct: t(W.pct, { n: fmt.int(Math.round(r.obscuration * 100)) }) });
    else head = r.magnitude > 0 && !r.visible ? W.below : W.none;
    const h = el('h3', 'sr-ecl__head', head);
    h.dataset.kind = r.kind;
    result.append(h, el('p', 'sr-ecl__at', t(W.at, { place: place.country ? t(W.placeRow, { name: place.name, country: place.country }) : place.name })));
    if (r.kind !== 'none') {
      const R = { ...W.rows, ...(r.kind === 'annular' ? W.rowsAnnular : {}) };
      const facts = [
        [R.obscuration, t(W.pct, { n: fmt.num(r.obscuration * 100, r.obscuration > 0.995 && r.obscuration < 1 ? 1 : 0) })],
        [R.magnitude, fmt.num(r.magnitude, 3)],
        [R.c1, both(r.c1)],
      ];
      if (r.c2 !== null) facts.push([R.c2, both(r.c2)]);
      facts.push([R.max, both(r.max)]);
      if (r.c3 !== null) facts.push([R.c3, both(r.c3)]);
      facts.push([R.c4, both(r.c4)]);
      if (r.durationS > 0) facts.push([R.duration, dur(r.durationS)]);
      facts.push([R.sunAlt, t(W.deg, { n: fmt.int(Math.round(r.sunAltDeg)) })]);
      const dl = el('dl', 'sr-ecl__facts');
      for (const [k, v] of facts) { const d = el('div'); d.append(el('dt', '', k), el('dd', '', v)); dl.appendChild(d); }
      result.appendChild(dl);
      if (r.sunAltAt.c1 !== null && r.sunAltAt.c1 <= 0) result.appendChild(el('p', 'sr-sect__note', W.rises));
      if (r.sunAltAt.c4 !== null && r.sunAltAt.c4 <= 0) result.appendChild(el('p', 'sr-sect__note', W.sets));
      else if (r.sunAltDeg > 0 && r.sunAltDeg < 15) result.appendChild(el('p', 'sr-sect__note', W.low));
      const see = button('ui-btn ui-btn--secondary ui-btn--sm sr-ecl__see', W.openMap, W.openTitle);
      see.addEventListener('click', () => openMax(r.max));
      result.appendChild(see);
    }
    if (api && api.writeLink) api.writeLink(fromName ? place.name : '');
  }

  function openMax(ms) {
    if (!ctx.clock) return;
    if (typeof ctx.rememberView === 'function') ctx.rememberView();
    ctx.clock.goTo(ms);
    const earth = typeof ctx.recordById === 'function' ? ctx.recordById('earth') : null;
    if (!earth) return;
    const fly = () => ctx.select(earth, { undo: false });
    if (typeof ctx.afterClockJump === 'function') ctx.afterClockJump(fly); else fly();
  }

  function suggest() {
    sugg.textContent = '';
    hint.textContent = '';
    for (const p of matchPlaces(list, input.value)) {
      const li = el('li', 'sr-list__row');
      const b = button('ui-row ui-row--plain');
      b.append(el('span', 'ui-row__t', p.name), el('span', 'ui-row__meta', p.country));
      b.addEventListener('click', () => { input.value = p.name; sugg.textContent = ''; paint(p, true); });
      li.appendChild(b);
      sugg.appendChild(li);
    }
  }
  input.addEventListener('input', () => { ready.then(suggest); });
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    ready.then(() => {
      const p = matchPlaces(list, input.value, 1)[0];
      sugg.textContent = '';
      if (p) { hint.textContent = ''; paint(p, true); } else { hint.textContent = W.noMatch; }
    });
  });
  mine.addEventListener('click', () => {
    hint.textContent = W.locating;
    askPosition(W.yours, (got) => {
      hint.textContent = got.place ? '' : W.denied;
      if (got.place) paint(got.place, false);
    });
  });

  function fromObserver() {
    const o = ctx.observer;
    if (o && Number.isFinite(o.latDeg) && Number.isFinite(o.lonDeg)) paint({ name: o.name || W.yours, country: '', latDeg: o.latDeg, lonDeg: o.lonDeg }, false);
  }

  function show(arg) {
    const name = String(arg || '').trim();
    if (name) {
      ready.then(() => {
        const p = matchPlaces(list, name, 1)[0];
        if (p) { input.value = p.name; paint(p, true); } else fromObserver();
      });
    } else if (result.hidden) fromObserver();
  }

  return { show, hide() {} };
}
