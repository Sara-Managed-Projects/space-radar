// pages/subscribe.js -- the states of the subscribe form on the static pages (scripts/seo_subscribe.py makes the markup).
//
// The form works without this file: it is a plain <form method="post"> to the subscription service, which answers a
// form post with its own "check your inbox" page. This upgrades it to fetch(), as the design kit's js/subscribe.js does:
// idle -> sending (the button disabled, aria-busy) -> check your inbox | error (the typed address stays). "Already
// subscribed" is answered 202 like a new address, so it shows "check your inbox" too: the service never says whether
// an address is known. The request carries the address, the lists, this page's address without its fragment and the
// empty honeypot, and nothing else; nothing is asked of the service before the button is pressed.
//
// Its sentences are pinned by tests/test_subscribe_form.mjs (scripts/check_copy.py PAGE_SENTENCE_FILES).

export const MSG = {
  invalid_email: 'That address does not look right.',
  rate_limited: 'Too many tries from here. Try again in a few minutes.',
  busy: 'Lots of sign-ups today. Please try again tomorrow.',
  send_failed: 'We could not send the email. Please try again later.',
  invalid_lists: 'Pick at least one list.',
  other: 'Something went wrong. Please try again.',
  unreachable: 'Could not reach the server.',
  sending: 'Sending…',
  retry: 'Try again',
};

/** The "check your inbox" sentence, with the address when there is one. */
export const checkText = (addr) => `Check your inbox${addr ? `: we sent a link to ${addr}` : ''}. Nothing is sent until you click it.`;

/** What an answer of the service means to the form: { state, text }. Pure, for the test. */
export function answer(ok, body, email) {
  const o = body || {};
  if (ok && o.ok) return { state: 'check', text: checkText(email) };
  return { state: 'error', text: MSG[o.error] || o.message || MSG.other };
}

/** The lists a form sends: its hidden one, or the boxes ticked. */
export const listsOf = (form) => [...form.querySelectorAll('[name=lists]')].filter((i) => i.type === 'hidden' || i.checked).map((i) => i.value);

function wire(f) {
  const s = f.querySelector('.sub__s');
  const b = f.querySelector('.sub__b');
  const bl = b.querySelector('span');
  const e = f.querySelector('.sub__e');
  const label = bl.textContent;
  const state = (st, text) => {
    f.setAttribute('data-state', st);
    s.textContent = text || '';
    const busy = st === 'sending';
    b.disabled = busy;
    f.setAttribute('aria-busy', String(busy));
    bl.textContent = busy ? MSG.sending : st === 'retry' ? MSG.retry : label;
  };
  if (/[?&]subscribe=check\b/.test(location.search) && f.id === 'subscribe') state('check', checkText(''));
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (f.getAttribute('data-state') === 'sending') return;
    const lists = listsOf(f);
    if (!lists.length) {
      state('error', MSG.invalid_lists);
      const c = f.querySelector('[name=lists]');
      if (c) c.focus();
      return;
    }
    const email = e.value.trim();
    state('sending');
    fetch(f.action, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, lists, source: location.href.split('#')[0], website: f.querySelector('[name=website]').value }),
    })
      .then((r) => r.json().catch(() => ({})).then((o) => ({ r, o })))
      .then(({ r, o }) => {
        const a = answer(r.ok, o, email);
        state(a.state, a.text);
        if (o.error === 'invalid_email') e.focus();
      }, () => state('retry', MSG.unreachable));
  });
}

if (typeof document !== 'undefined') document.querySelectorAll('form[data-sub]').forEach(wire);
