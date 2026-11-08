// moments/shelf.js -- where the Moments are offered (release 1.6.0, internal spec 0079 stage C8, internal #1057).
//
// Three doors, one list:
//   THE SHELF   a "Moments" section on the Earth pane, under the trips, built here after the first visit has settled
//               (ui/explore.js imports this file on `sr:layers-ready`, in an idle moment; never at boot).
//   THE CARDS   "Replay this moment" on the card of every pad, landing site or craft a story is about (ui/cards.js
//               asks `momentFor(record id)`; cards are never on a first visit either).
//   THE LINK    `#moment=<id>&t=<seconds>`, which `replayHash` writes and the player's own Share button copies.
// The words are COPY.momentShelf (copy/en.moments.js). The list is the stories' ids, how long each takes to watch
// and the records each is about: a pad, a landing site, the craft's rocket. The shelf looks like the trips above it
// (ui/explore.js paintTrips): a picture under every card (site/images/moments/<id>.webp, fetched lazily and after the first
// visit, ui/trippics.js), four cards, then "All {n} moments" / "Fewer moments".

import { COPY } from '../copy/en.js';
import '../copy/en.moments.js';
import { shareHash } from './format.js';
import { momentPicture } from '../ui/trippics.js';

/** How many cards the shelf shows before "All {n} moments" (the trips show four too). */
export const MOMENTS_SHOWN = 4;

/**
 * The stories, in the order the shelf shows them. `minutes` is the play time; `records` are the ids a card can carry the story on;
 * `picture` is the mission second its card's picture is rendered at (tools/moment-pictures.probe.js, scripts/build_trip_thumbs.py
 * --moments): a story added here names its second and is rendered by the same command.
 */
export const SHELF = [
  { id: 'apollo-11', minutes: 11, picture: 370200, records: ['saturn-v-lc-39a', 'apollo-11'], hue: '96, 64, 30', models: ['saturn-v', 'apollo-csm', 'lunar-module'] },
  { id: 'apollo-13', minutes: 14, picture: 286300, records: ['saturn-v-lc-39a'], hue: '210, 40, 70', models: ['saturn-v', 'apollo-csm', 'lunar-module'] },
  { id: 'sts-1', minutes: 15, picture: 60, records: ['saturn-v-lc-39a', 'edwards-afb-runway-23'], hue: '36, 12, 90', models: ['shuttle-sts-stack', 'shuttle-orbiter'] },
  { id: 'artemis-ii', minutes: 11, picture: 20, records: ['shuttle-lc-39b'], hue: '36, 64, 100', models: ['sls-block1', 'orion-esm'] },
  { id: 'curiosity-edl', minutes: 6, picture: 420, records: ['gale'], hue: '18, 62, 48', models: ['msl-entry', 'msl-descent-stage', 'curiosity'] },
  { id: 'new-horizons-pluto', minutes: 6, picture: -12, pictureTop: 0.5, records: ['pluto', 'charon', 'deep-new-horizons'], hue: '224, 28, 46', models: ['new-horizons'] },
  { id: 'vostok-1', minutes: 5, picture: 4700, records: ['baikonur-site-1', 'vostok-1-landing'], hue: '100, 50, 40', models: ['r7-8k72k', 'vostok-3ka', 'vostok-seat'] },
  { id: 'sputnik-1', minutes: 4, picture: 1500, records: ['baikonur-site-1'], hue: '210, 14, 60', models: ['r7-8k72k', 'sputnik-1'] },
  { id: 'hubble-deployment', minutes: 7, picture: 111909, records: ['shuttle-lc-39b', 'sat-20580'], hue: '40, 56, 96', models: ['hubble-sts31', 'shuttle-orbiter', 'shuttle-rms'] },
  { id: 'falcon9-og2-2', minutes: 3, picture: 592, pictureTop: 0.45, records: ['spacex-slc-40', 'falcon-lz-1'], hue: '30, 36, 60', models: ['falcon9-stage1', 'falcon9-upper'] },
  { id: 'voskhod-2', minutes: 15, picture: 5900, pictureTop: 0.25, records: ['baikonur-site-1', 'voskhod-2-landing'], hue: '24, 40, 70', models: ['r7-8k72k', 'voskhod-3kd', 'leonov-eva'] },
  // b200-c3-learn: begin -- forge #153: a told story, no vehicle model (the satellite is the ringed mark, its pieces the cloud)
  { id: 'fengyun-1c', minutes: 4, picture: 250000000, pictureTop: 0.5, records: ['sat-25730'], hue: '14, 58, 52', models: [] },
  // b200-c3-learn: end
];

/** The story a card for record `id` can replay, or null (the first, when several are about it: see `momentsFor`). */
export function momentFor(id) {
  return SHELF.find((s) => s.records.includes(id)) || null;
}

/** Every story a card for record `id` can replay, in the shelf's order: Launch Complex 39A is the pad of Apollo 11 and of Apollo 13. */
export function momentsFor(id) {
  return SHELF.filter((s) => s.records.includes(id));
}

/**
 * THE VEHICLES (internal #1057, release 1.6.2). A card of a craft a story flies offers the story too: the R-7 of Vostok,
 * the Saturn V, the Apollo CSM and LM, the SLS and Orion. The craft are matched by the words a record carries for them
 * (a launch's `meta.rocket` and nearest family, a spacecraft's name), never by a guess: a Soyuz-2 is a descendant
 * of the R-7 and is not Vostok's rocket, so it does not match. Orion is only a craft on the layers that hold craft,
 * because Orion is also a constellation and a nebula.
 */
const VEHICLES = [
  { id: 'hubble-deployment', rocket: /(?!)/, craft: /^(hst|hubble space telescope)\b/i },
  // the launch of this one flight (a launch record's name carries its mission), never every Falcon 9
  { id: 'falcon9-og2-2', rocket: /(?!)/, craft: /\borbcomm[ -]og-?2 (mission|flight) 2\b/i },
  { id: 'sts-1', rocket: /^(space shuttle|shuttle)\b/i, craft: /^(space shuttle )?columbia\b/i },
  { id: 'sputnik-1', rocket: /^(sputnik 8k71ps|8k71ps|r-7(\b|$))/i, craft: /^(sputnik[ -]?1|ps-1)\b/i },
  { id: 'voskhod-2', rocket: /^(voskhod(-3kd)?|11a57)\b/i, craft: /^voskhod( ?2| 3k[dv]|\b)/i },
  { id: 'vostok-1', rocket: /^(vostok(-k|-2m)?|r-7(\b|$)|8k72k)/i, craft: /^vostok( ?1| 3ka|\b)/i },
  { id: 'apollo-11', rocket: /^saturn ?(v|5)\b/i, craft: /^(apollo[ -](cs?m|command|service)|lunar module|apollo lunar module)/i },
  { id: 'apollo-13', rocket: /^saturn ?(v|5)\b/i, craft: /^(apollo[ -](cs?m|command|service)|lunar module|apollo lunar module)/i },
  { id: 'curiosity-edl', rocket: /(?!)/, craft: /^(curiosity|mars science laboratory|msl)\b/i },
  { id: 'new-horizons-pluto', rocket: /(?!)/, craft: /^new horizons\b/i },
  { id: 'artemis-ii', rocket: /^(space launch system|sls)\b/i, craft: /^orion\b/i },
];
// b200-c3-learn: the satellite's own card (FENGYUN 1C, 1999-025A) offers its story; its pieces are FENGYUN 1C DEB and are not offered it
VEHICLES.push({ id: 'fengyun-1c', rocket: /(?!)/, craft: /^fengyun[ -]?1c$/i });
const CRAFT_LAYERS = new Set(['launches', 'stations', 'notable', 'active', 'deep-space', 'just-launched']);

/**
 * Every story a card for `record` can replay: by its id (a pad, a landing site) or by the craft it is (above), in the shelf's
 * order, without repeats. A Saturn V, the Apollo CSM and the lunar module are in more than one story (Apollo 11 and Apollo 13).
 */
export function momentsForRecord(record) {
  if (!record) return [];
  const out = momentsFor(record.id);
  const meta = record.meta || {};
  // The rocket's own name and its nearest family only: the family PATH runs up to the root (Soyuz-2's root is R-7).
  const rocketWords = [meta.rocket, meta.rocketFamily].filter((x) => typeof x === 'string');
  const name = typeof record.name === 'string' ? record.name.trim() : '';
  for (const v of VEHICLES) {
    const hit = rocketWords.some((w) => v.rocket.test(w.trim()))
      || (CRAFT_LAYERS.has(record.layer) && name && (v.craft.test(name) || (record.layer !== 'launches' && v.rocket.test(name))));
    const story = hit ? SHELF.find((s) => s.id === v.id) : null;
    if (story && !out.includes(story)) out.push(story);
  }
  return SHELF.filter((s) => out.includes(s));
}

/** The first story a card for `record` can replay, or null. */
export function momentForRecord(record) {
  return momentsForRecord(record)[0] || null;
}

/** The link to a story at a mission second (or its start). */
export function replayHash(id, t) {
  return t === undefined || t === null ? `#moment=${id}` : shareHash(id, t);
}

/**
 * Fill `host` (a section with an h2) with the shelf: one card per story, a tap opens it. `ctx.wantMoment` is main.js's
 * door to the player. Safe to call twice.
 */
export function mountShelf(host, ctx) {
  const W = COPY.momentShelf;
  if (!host || !W || host.dataset.mounted) return;
  host.dataset.mounted = '1';
  const h = host.querySelector('h2');
  if (h) h.textContent = W.title;
  const note = document.createElement('p');
  note.className = 'sr-sect__note';
  note.textContent = W.note;
  const grid = document.createElement('div');
  grid.className = 'sr-tripgrid sr-momentgrid';
  // Like the trips: four, then the rest behind one button, the same .sr-more with aria-expanded.
  const more = document.createElement('button');
  more.type = 'button';
  more.className = 'sr-more';
  more.hidden = true;
  const rows = SHELF.filter((s) => W.cards[s.id]);
  let expanded = false;
  function paint() {
    const active = document.activeElement;
    const focused = active && grid.contains(active) && active.dataset ? active.dataset.moment : null;
    while (grid.firstChild) grid.removeChild(grid.firstChild);
    for (const s of expanded ? rows : rows.slice(0, MOMENTS_SHOWN)) {
      const words = W.cards[s.id];
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'sr-tripcard sr-momentcard';
      card.dataset.moment = s.id;
      card.dataset.group = 'moments';
      card.style.setProperty('--sr-trip-hue', s.hue);
      // The story's own frame under the glass, fading out under the title; the hue is the card until it arrives (or if it never does).
      card.appendChild(momentPicture(s.id, 'sr-tripcard__pic'));
      const title = document.createElement('span');
      title.className = 'sr-tripcard__title';
      title.textContent = words.title;
      const meta = document.createElement('span');
      meta.className = 'sr-tripcard__meta';
      meta.textContent = `${words.when} · ${W.minutes.replace('{m}', String(s.minutes))}`;
      card.title = words.blurb;
      card.append(title, meta);
      card.addEventListener('click', () => { if (typeof ctx.wantMoment === 'function') ctx.wantMoment(s.id, null); });
      grid.appendChild(card);
      if (focused && s.id === focused) card.focus({ preventScroll: true });
    }
    more.hidden = rows.length <= MOMENTS_SHOWN;
    more.textContent = expanded ? W.fewer : W.all.replace('{n}', String(rows.length));
    more.setAttribute('aria-expanded', expanded ? 'true' : 'false');
  }
  more.addEventListener('click', () => { expanded = !expanded; paint(); });
  paint();
  host.append(grid, more, note);
  host.hidden = false;
}
