// ui/subscribe.js -- "Email me what's coming up": a row under Coming up that opens in place, holding the email updates'
// form (ui/subscribepop.js) with the one list the row is about, sky alerts (issue #251, close approaches #377).
//
// WHERE IT SITS (spec 0061 task 5). Nothing new docks: it is a row that opens in place under Coming up, the list it is
// about (docs/ui-guide.md section 3.5 and the card's disclosure rows), in the sidebar on a desktop and in the sheet on a
// phone, never over the scene.
//
// ONE FORM, NOT TWO (2026-11-10). Until then this row posted three categories to the notifier of notify/, which was
// never deployed, so main.js did not even fetch it. Now it is the same form as the rail's envelope: the same states,
// the same words (copy/en.subscribe.js), the same request to the subscription service, with `lists: ['sky']` (launches,
// meteor showers and close approaches: what Coming up lists) and `source: 'app:coming-up'`. The kit's single-purpose
// form: no box to tick, the button names the list. The form, its sheet (css/subscribe.css) and its words are built on
// the row's first opening; main.js imports this module once the layers have settled, so a first visit pays for none of it.
//
// Contract: createSubscribe({ parent, fetchImpl? }) -> { root, open(), form() }

import { COPY } from '../copy/en.js';
import { createSubscribe as createForm } from './subscribepop.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

let seq = 0;

export function createSubscribe({ parent, fetchImpl } = {}) {
  if (!parent) return null;
  seq += 1;
  const id = `sr-subscribe-${seq}`;

  const root = el('section', 'sr-disc sr-subscribe');
  const head = el('button', 'sr-disc__head');
  head.type = 'button';
  head.id = `${id}-head`;
  head.setAttribute('aria-expanded', 'false');
  head.setAttribute('aria-controls', id);
  head.appendChild(el('span', 'sr-disc__label', COPY.emailUpdates.comingUp));
  const chev = el('span', 'sr-subscribe__chev', COPY.shell.openChevron);
  chev.setAttribute('aria-hidden', 'true');
  head.appendChild(chev);

  // The panel takes the popover's tokens (.sr-subpop, css/subscribe.css) so the form looks the same in both places.
  const panel = el('div', 'sr-disc__panel sr-subscribe__form sr-subpop');
  panel.id = id;
  panel.hidden = true;
  root.append(head, panel);
  parent.appendChild(root);

  let form = null;
  const open = (on = true) => {
    head.setAttribute('aria-expanded', on ? 'true' : 'false');
    panel.hidden = !on;
    if (on && !form) {
      form = createForm(null, { id, list: 'sky', button: COPY.emailUpdates.skyButton, source: 'app:coming-up', labelledBy: head.id, fetchImpl });
      panel.appendChild(form.root);
    }
  };
  head.addEventListener('click', () => open(head.getAttribute('aria-expanded') !== 'true'));

  return { root, open, form: () => form, destroy: () => root.remove() };
}
