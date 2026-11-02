// moments/shelf.js -- where the Moments are offered (release 1.6.0, internal spec 0079 stage C8, internal #1057).
//
// Three doors, one list:
//   THE SHELF   a "Moments" section on the Earth pane, under the trips, built here after the first visit has settled
//               (ui/explore.js imports this file on `sr:layers-ready`, in an idle moment; never at boot).
//   THE CARDS   "Replay this moment" on the card of every pad, landing site or craft a story is about (ui/cards.js
//               asks `momentFor(record id)`; cards are never on a first visit either).
//   THE LINK    `#moment=<id>&t=<seconds>`, which `replayHash` writes and the player's own Share button copies.
// The words are COPY.momentShelf (copy/en.moments.js). The list is the stories' ids, how long each takes to watch
// and the records each is about: a pad, a landing site, the craft's rocket.

import { COPY } from '../copy/en.js';
import '../copy/en.moments.js';
import { shareHash } from './format.js';

/** The stories, in the order the shelf shows them. `minutes` is the play time; `records` are the ids a card can carry the story on. */
export const SHELF = [
  { id: 'apollo-11', minutes: 11, records: ['saturn-v-lc-39a', 'apollo-11'], hue: '96, 64, 30', models: ['saturn-v', 'apollo-csm', 'lunar-module'] },
  { id: 'artemis-ii', minutes: 11, records: ['shuttle-lc-39b'], hue: '36, 64, 100', models: ['sls-block1', 'orion-esm'] },
  { id: 'vostok-1', minutes: 5, records: [], hue: '100, 50, 40', models: ['r7-8k72k', 'vostok-3ka', 'vostok-seat'] },
];

/** The story a card for record `id` can replay, or null. */
export function momentFor(id) {
  return SHELF.find((s) => s.records.includes(id)) || null;
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
  for (const s of SHELF) {
    const words = W.cards[s.id];
    if (!words) continue;
    const card = document.createElement('button');
    card.type = 'button';
    card.className = 'sr-tripcard sr-momentcard';
    card.dataset.moment = s.id;
    card.dataset.group = 'moments';
    card.style.setProperty('--sr-trip-hue', s.hue);
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
  }
  host.append(grid, note);
  host.hidden = false;
}
