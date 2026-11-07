// ui/findentry.js -- the ways into Find from the explore view's tabs (forge #150, #152, #153).
//
// Contract: mountFindEntry(ctx) -> boolean (whether the explore view was there to take them)
//
// One short section at the top of three tabs, in the explore view's own row style, each row a door into the
// panel at the right tab: Earth gets "Satellites by country", "By operator", "Debris clouds" and
// "Constellations"; Planets "Our planets side by side"; Stars the look run's question and "Find by property".
// Fetched after the first visit has settled (main.js), with the panel itself fetched on the first press.

import { COPY } from '../copy/en.js';
import '../copy/en.find.js';

function row(text, onClick) {
  const li = document.createElement('li');
  li.className = 'sr-list__row';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'sr-list__btn';
  const name = document.createElement('span');
  name.className = 'sr-list__name';
  name.textContent = text;
  const chev = document.createElement('span');
  chev.className = 'sr-list__value';
  chev.textContent = COPY.shell.openChevron;
  chev.setAttribute('aria-hidden', 'true');
  b.append(name, chev);
  b.addEventListener('click', onClick);
  li.appendChild(b);
  return li;
}

export function mountFindEntry(ctx) {
  const ex = ctx && ctx.explore;
  if (!ex || typeof ex.mountTab !== 'function' || typeof ctx.wantFind !== 'function') return false;
  const E = COPY.findEntry;
  const go = (tab, opts) => () => ctx.wantFind().then((f) => f && f.open(tab, opts));
  const fill = (rows) => (host) => {
    host.classList.add('sr-findentry');
    const h = document.createElement('h2');
    h.className = 'sr-micro';
    h.textContent = E.title;
    const list = document.createElement('ul');
    list.className = 'sr-list';
    for (const [text, tab, opts] of rows) list.appendChild(row(text, go(tab, opts)));
    host.append(h, list);
  };
  ex.mountTab('earth', fill([
    [E.countries, 'country', { mode: 'countries' }],
    [E.operators, 'country', { mode: 'operators' }],
    [E.clouds, 'clouds', {}],
  ]));
  ex.mountTab('planets', fill([[E.chartOurs, 'property', { chart: 'sun', run: false }]]));
  ex.mountTab('stars', fill([
    [COPY.find.presets.rockyHz50, 'property', { find: 'exo_ly50_hz_rocky' }],
    [E.property, 'property', {}],
  ]));
  return true;
}
