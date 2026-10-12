// ui/subscribe.js -- the smallest subscribe form: an email and two checkboxes, posting to the
// notifier's Function URL (notify/lambda_handler.py's handler_subscribe, issue #251).
//
// WHERE IT SITS (spec 0061 task 5). It arrived as a form appended to <body> with no styles: a
// grey browser button over the globe on every visit. The guide's second principle is that nothing
// new docks: so it is a row that opens in place under Coming up, the list it is about
// (docs/ui-guide.md section 3.5 and the card's disclosure rows), in the sidebar on a desktop and
// in the sheet on a phone, never over the scene. Inside: the field as the search's well, the two
// boxes as What to show's, one quiet button, a one-line status. What it does is unchanged: the
// same payload to the same endpoint, and with no endpoint (the default: a human runs
// scripts/provision-notifier.sh) pressing Subscribe says it could not reach the service.
// main.js imports this module once the layers have settled, so a first visit does not pay for it.

import { COPY } from '../copy/en.js';
import '../copy/en.later.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text) node.textContent = text;
  return node;
}

/** The notifier's Function URL. Empty by default: scripts/provision-notifier.sh documents how a
 * human deploys and points this at a real one; this build ships with nothing live, by design. */
export function notifyEndpoint() {
  return (typeof window !== 'undefined' && window.SPACE_RADAR_NOTIFY_URL) || '';
}

export function subscribePayload(email, wantLaunches, wantShowers) {
  const categories = [];
  if (wantLaunches) categories.push('launches');
  if (wantShowers) categories.push('meteor-showers');
  return { email: (email || '').trim(), categories };
}

let seq = 0;

export function createSubscribe({ parent, fetchImpl } = {}) {
  const sender = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);
  if (!parent) return null;
  const T = COPY.subscribe;
  seq += 1;
  const id = `sr-subscribe-${seq}`;

  const root = el('section', 'sr-disc sr-subscribe');
  const head = el('button', 'sr-disc__head');
  head.type = 'button';
  head.id = `${id}-head`;
  head.setAttribute('aria-expanded', 'false');
  head.setAttribute('aria-controls', id);
  head.appendChild(el('span', 'sr-disc__label', T.heading));
  const chev = el('span', 'sr-subscribe__chev', COPY.shell.openChevron);
  chev.setAttribute('aria-hidden', 'true');
  head.appendChild(chev);

  const form = el('form', 'sr-disc__panel sr-subscribe__form');
  form.id = id;
  form.setAttribute('aria-labelledby', head.id);
  form.hidden = true;

  const email = el('input', 'sr-subscribe__email');
  email.type = 'email';
  email.required = true;
  email.autocomplete = 'email';
  email.placeholder = T.emailPlaceholder;
  email.setAttribute('aria-label', T.emailLabel);

  const check = (text) => {
    const box = el('input', 'sr-show__box');
    box.type = 'checkbox';
    box.checked = true;
    const row = el('label', 'sr-subscribe__row');
    row.append(box, el('span', '', text));
    return { box, row };
  };
  const launches = check(T.launchesLabel);
  const showers = check(T.showersLabel);

  const submit = el('button', 'sr-btn sr-subscribe__submit', T.submit);
  submit.type = 'submit';

  const status = el('p', 'sr-subscribe__status', '');
  status.setAttribute('role', 'status');
  status.hidden = true;
  const say = (text) => { status.textContent = text; status.hidden = !text; };

  form.append(email, launches.row, showers.row, submit, status);
  root.append(head, form);
  parent.appendChild(root);

  head.addEventListener('click', () => {
    const on = head.getAttribute('aria-expanded') !== 'true';
    head.setAttribute('aria-expanded', on ? 'true' : 'false');
    form.hidden = !on;
  });

  form.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const payload = subscribePayload(email.value, launches.box.checked, showers.box.checked);
    if (!payload.email) return;
    if (payload.categories.length === 0) { say(T.pickOne); return; }
    const endpoint = notifyEndpoint();
    if (!endpoint || !sender) { say(T.couldNotReach); return; }
    say(T.sending);
    sender(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => say(res.ok ? T.pending : T.couldNotReach))
      .catch(() => say(T.couldNotReach));
  });

  return { root, destroy: () => root.remove() };
}
