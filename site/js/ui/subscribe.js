// ui/subscribe.js -- the smallest subscribe form: an email and two checkboxes, posting to the
// notifier's Function URL (notify/lambda_handler.py's handler_subscribe, issue #251).
//
// Mounted once from main.js, independent of the sidebar/shell layout -- spec 0061's shell.js and
// rail.js are untouched, so closing #251 does not risk the contract tests that pin their shape.
// Appends its own root, like every other UI module (see main.js's revealUI comment: "The UI
// modules append their own roots when they are constructed").

import { COPY } from '../copy/en.js';

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

export function createSubscribe({ parent, fetchImpl } = {}) {
  const host = parent || document.body;
  const sender = fetchImpl || (typeof fetch !== 'undefined' ? fetch : null);

  const root = el('form', 'subscribe-panel');
  root.setAttribute('aria-label', COPY.subscribe.heading);

  const heading = el('p', 'subscribe-heading', COPY.subscribe.heading);

  const email = el('input', 'subscribe-email');
  email.type = 'email';
  email.required = true;
  email.placeholder = COPY.subscribe.emailPlaceholder;

  const launchesBox = el('input', '');
  launchesBox.type = 'checkbox';
  launchesBox.checked = true;
  const launchesRow = el('label', 'subscribe-row');
  launchesRow.append(launchesBox, el('span', '', COPY.subscribe.launchesLabel));

  const showersBox = el('input', '');
  showersBox.type = 'checkbox';
  showersBox.checked = true;
  const showersRow = el('label', 'subscribe-row');
  showersRow.append(showersBox, el('span', '', COPY.subscribe.showersLabel));

  const submit = el('button', 'subscribe-submit', COPY.subscribe.submit);
  submit.type = 'submit';

  const status = el('p', 'subscribe-status', '');
  status.setAttribute('role', 'status');

  root.append(heading, email, launchesRow, showersRow, submit, status);
  host.appendChild(root);

  root.addEventListener('submit', (ev) => {
    ev.preventDefault();
    const endpoint = notifyEndpoint();
    const payload = subscribePayload(email.value, launchesBox.checked, showersBox.checked);
    if (!payload.email || payload.categories.length === 0 || !endpoint || !sender) {
      status.textContent = COPY.subscribe.couldNotReach;
      return;
    }
    status.textContent = COPY.subscribe.sending;
    sender(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
      .then((res) => {
        status.textContent = res.ok ? COPY.subscribe.pending : COPY.subscribe.couldNotReach;
      })
      .catch(() => {
        status.textContent = COPY.subscribe.couldNotReach;
      });
  });

  return { root, destroy: () => root.remove() };
}
