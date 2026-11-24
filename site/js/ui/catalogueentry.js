// ui/catalogueentry.js -- the ways into the catalogues from the explore view's tabs (research train "catalogues"; forge #551,
// #553, #560, #564).
//
// Contract: mountCatalogueEntry(ctx) -> boolean (whether the explore view was there to take them)
//
// One short section in four tabs, in the explore view's own row style (as ui/findentry.js), each row a door into one
// catalogue: Earth gets the launches, Planets the near-Earth asteroids, Stars the exoplanet explorer, Tonight the sky
// calendar and the eclipse of 2027. Fetched after the first visit has settled (main.js), the view itself on the first press.

import { COPY } from '../copy/en.js';
import '../copy/en.catalogues.js';

function row(text, which, ctx) {
  const li = document.createElement('li');
  li.className = 'sr-list__row';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ui-row ui-row--plain';
  b.dataset.cat = which;
  const name = document.createElement('span');
  name.className = 'sr-list__name';
  name.textContent = text;
  const chev = document.createElement('span');
  chev.className = 'sr-list__value';
  chev.textContent = COPY.shell.openChevron;
  chev.setAttribute('aria-hidden', 'true');
  b.append(name, chev);
  b.addEventListener('click', () => ctx.wantCatalogue().then((c) => c && c.open(which)));
  li.appendChild(b);
  return li;
}

/** Which catalogue rows each explore tab carries. Pure, for tests/test_catalogue.mjs. */
export const ENTRY_ROWS = {
  earth: ['launches'],
  planets: ['asteroids'],
  stars: ['exoplanets'],
  tonight: ['calendar', 'eclipse'],
};

export function mountCatalogueEntry(ctx) {
  const ex = ctx && ctx.explore;
  if (!ex || typeof ex.mountTab !== 'function' || typeof ctx.wantCatalogue !== 'function') return false;
  const E = COPY.catalogueEntry;
  for (const [tab, list] of Object.entries(ENTRY_ROWS)) {
    ex.mountTab(tab, (host) => {
      host.classList.add('sr-findentry', 'sr-catentry');
      const h = document.createElement('h2');
      h.className = 'sr-micro';
      h.textContent = E.title;
      const ul = document.createElement('ul');
      ul.className = 'sr-list';
      for (const which of list) ul.appendChild(row(E[which], which, ctx));
      host.append(h, ul);
    });
  }
  return true;
}
