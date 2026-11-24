// ui/opsentry.js -- the ways into live operations from the explore view's tabs (research train "ops"; forge #558, #561, #562, #563).
//
// Contract: mountOpsEntry(ctx) -> boolean (whether the explore view was there to take them)
//
// One short section, "Live", in the explore view's own row style (as ui/findentry.js): the Earth tab gets State of Space,
// re-entries and close calls, and Earth events; the Planets tab the Deep Space Network, whose craft are out there. Fetched
// after the first visit has settled (main.js), the view itself on the first press.

import { COPY } from '../copy/en.js';
import '../copy/en.ops.js';

/** Which rows each explore tab carries. Pure, for tests/test_research_ops.mjs. */
export const ENTRY_ROWS = {
  earth: ['state', 'reentry', 'events'],
  planets: ['dsn'],
};

function row(text, which, ctx) {
  const li = document.createElement('li');
  li.className = 'sr-list__row';
  const b = document.createElement('button');
  b.type = 'button';
  b.className = 'ui-row ui-row--plain';
  b.dataset.ops = which;
  const name = document.createElement('span');
  name.className = 'sr-list__name';
  name.textContent = text;
  const chev = document.createElement('span');
  chev.className = 'sr-list__value';
  chev.textContent = COPY.shell.openChevron;
  chev.setAttribute('aria-hidden', 'true');
  b.append(name, chev);
  b.addEventListener('click', () => ctx.wantOps().then((o) => o && o.open(which)));
  li.appendChild(b);
  return li;
}

export function mountOpsEntry(ctx) {
  const ex = ctx && ctx.explore;
  if (!ex || typeof ex.mountTab !== 'function' || typeof ctx.wantOps !== 'function') return false;
  const E = COPY.ops.entry;
  for (const [tab, list] of Object.entries(ENTRY_ROWS)) {
    ex.mountTab(tab, (host) => {
      host.classList.add('sr-findentry', 'sr-opsentry');
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
