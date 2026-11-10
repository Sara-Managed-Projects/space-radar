// ui/subscribepop.js -- the email updates' popover, behind the tool rail's envelope (2026-11-10).
//
// Contract: mountSubscribe(ctx, button, more) -> { open(from), close(returnFocus), toggle(from) }   (ui/rail.js)
//           createSubscribe(ctx, { close }) -> { root, focus() }                                  (the form alone)
// Also exported, pure, for tests/test_subscribe_form.mjs: answerFor(ok, body, email) -> { state, text },
//   SUBSCRIBE_URL, LISTS
//
// Fetched by ui/rail.js on the first press of the envelope, with its words (copy/en.subscribe.js) and its look
// (css/subscribe.css): none of it is a first visit's bytes. (Not ui/subscribe.js: that is the older row under Coming
// up, which posts to notify/'s notifier.) It is the design kit's subscribe component (internal
// web-kit/src/subscribe.mjs and js/subscribe.js), the one the static pages carry in their footers
// (scripts/seo_subscribe.py, site/js/pages/subscribe.js), drawn with the same classes and the same states:
// idle -> sending (the button disabled, aria-busy) -> check your inbox | error (the typed address stays).
//
// THE POPOVER IS BUILT HERE, NOT IN THE RAIL. ui/rail.js makes the envelope button and nothing else (the boot graph had
// about 300 B of room): this module makes #sr-sub, the What to show popover's twin (.sr-pop, ui.css), and owns its
// closing. Opening it closes What to show, More and the share sheet; Escape (in the capture phase, as the rail's own
// popovers do, so the card underneath does not hear it), Close and a press outside close it.
//
// THE KIT'S RULES (web-kit/DESIGN.md section 3). It opens only on a click, never by itself. Four lists, none ticked,
// one needed. "Already subscribed" looks exactly like "check your inbox": the service never says whether it knows an
// address. The privacy line, with its link, is under the form. Escape and Close dismiss it, and the focus goes back
// to the envelope (ui/rail.js).
//
// WHAT IS SENT, AND WHEN. Nothing until the button is pressed. Then one POST to the subscription service: the address,
// the lists, `source: 'app:rail'` (the service's own word for the app; no page address, no place, no hash of the view)
// and the empty honeypot `website`. The service sends one confirmation mail; nothing else is sent until its link is
// clicked. Its mails carry no pixel and no rewritten link (the privacy page, /privacy/).

import { COPY, t } from '../copy/en.js';
import '../copy/en.subscribe.js';
import { icon, iconFrom } from './icons.js';
import { loadCss } from './latercss.js';

// The deployed service (internal infra/subscribe/README.md, stack space-radar-subscribe): POST <url>subscribe.
export const SUBSCRIBE_URL = 'https://xc6vgkqu32sjm6cu4wqgvzrmsa0ytybx.lambda-url.eu-north-1.on.aws/';
export const LISTS = ['news', 'journal', 'games', 'sky'];
const PRIVACY = 'privacy/index.html';
// Lucide `mail` (ISC): the envelope of the rail's button, at the button's size.
const MAIL = [['rect', { width: 20, height: 16, x: 2, y: 4, rx: 2 }], ['path', { d: 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7' }]];
const ERRORS = { invalid_email: 'invalidEmail', rate_limited: 'rateLimited', busy: 'busy', send_failed: 'sendFailed', invalid_lists: 'invalidLists' };

/** What an answer of the service means to the form. Pure. */
export function answerFor(ok, body, email) {
  const w = COPY.emailUpdates;
  const o = body || {};
  if (ok && o.ok) return { state: 'check', text: t(w.check, { email }) };
  return { state: 'error', text: (ERRORS[o.error] && w[ERRORS[o.error]]) || o.message || w.other };
}

function el(tag, cls, text) {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  if (text != null) n.textContent = text;
  return n;
}

function input(type, name, value) {
  const i = el('input');
  i.type = type;
  i.name = name;
  if (value != null) i.value = value;
  return i;
}

export function createSubscribe(ctx, { close } = {}) {
  const w = COPY.emailUpdates;
  loadCss('subscribe');
  const root = el('div', 'sr-subpop__in');

  const top = el('div', 'sr-subpop__top');
  const h = el('h2', 'sub__h', w.title);
  h.id = 'sr-sub-h';
  top.appendChild(h);
  const x = el('button', 'sr-subpop__x');
  x.type = 'button';
  x.setAttribute('aria-label', w.close);
  x.title = w.close;
  x.appendChild(icon('x', 18));
  x.addEventListener('click', () => { if (close) close(true); });
  top.appendChild(x);
  root.appendChild(top);

  const f = el('form', 'sub sub--pop');
  f.method = 'post';
  f.action = `${SUBSCRIBE_URL}subscribe`;
  f.acceptCharset = 'utf-8';
  f.setAttribute('aria-labelledby', h.id);
  f.noValidate = false;
  f.appendChild(el('p', 'sub__x', w.text));

  const set = el('fieldset', 'sub__l');
  set.appendChild(el('legend', null, w.pick));
  for (const id of LISTS) {
    const lab = el('label');
    lab.appendChild(input('checkbox', 'lists', id));
    lab.appendChild(el('span', null, w[id]));
    set.appendChild(lab);
  }
  f.appendChild(set);
  f.appendChild(input('hidden', 'source', 'app:rail'));

  const row = el('div', 'sub__r');
  const lb = el('label', 'sub__lb', w.email);
  lb.htmlFor = 'sr-sub-e';
  row.appendChild(lb);
  const e = input('email', 'email');
  e.className = 'sub__e';
  e.id = 'sr-sub-e';
  e.autocomplete = 'email';
  e.inputMode = 'email';
  e.required = true;
  e.spellcheck = false;
  e.setAttribute('autocapitalize', 'off');
  e.maxLength = 254;
  e.placeholder = w.placeholder;
  row.appendChild(e);
  const b = el('button', 'btn sub__b');
  b.type = 'submit';
  b.appendChild(iconFrom('mail', MAIL, 18));
  const bl = el('span', null, w.button);
  b.appendChild(bl);
  row.appendChild(b);
  f.appendChild(row);

  // The honeypot: a field no person sees or reaches. A filled one is answered as a success and does nothing.
  const hp = el('div', 'sub__hp');
  hp.setAttribute('aria-hidden', 'true');
  const hl = el('label', null, w.honeypot);
  hl.htmlFor = 'sr-sub-w';
  hp.appendChild(hl);
  const web = input('text', 'website', '');
  web.id = 'sr-sub-w';
  web.tabIndex = -1;
  web.autocomplete = 'off';
  hp.appendChild(web);
  f.appendChild(hp);

  const s = el('p', 'sub__s');
  s.setAttribute('role', 'status');
  s.setAttribute('aria-live', 'polite');
  f.appendChild(s);
  const p = el('p', 'sub__p', w.privacy);
  const a = el('a', null, w.privacyLink);
  a.href = PRIVACY;
  a.target = '_blank';
  a.rel = 'noopener';
  p.append(' ', a);
  f.appendChild(p);
  root.appendChild(f);

  const state = (st, text) => {
    f.setAttribute('data-state', st);
    s.textContent = text || '';
    const busy = st === 'sending';
    b.disabled = busy;
    f.setAttribute('aria-busy', String(busy));
    bl.textContent = busy ? w.sending : st === 'retry' ? w.retry : w.button;
  };
  f.addEventListener('submit', (ev) => {
    ev.preventDefault();
    if (f.getAttribute('data-state') === 'sending') return;
    const lists = [...set.querySelectorAll('input:checked')].map((i) => i.value);
    if (!lists.length) { state('error', w.invalidLists); set.querySelector('input').focus(); return; }
    const email = e.value.trim();
    state('sending');
    fetch(f.action, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email, lists, source: 'app:rail', website: web.value }),
    })
      .then((r) => r.json().catch(() => ({})).then((o) => ({ r, o })))
      .then(({ r, o }) => {
        const out = answerFor(r.ok, o, email);
        state(out.state, out.text);
        if (o.error === 'invalid_email') e.focus();
      }, () => state('retry', w.unreachable));
  });

  return { root, focus: () => (f.getAttribute('data-state') === 'check' ? x : set.querySelector('input')).focus({ preventScroll: true }) };
}

/** The popover of the rail's envelope: built on the first press, then opened and closed in place. */
export function mountSubscribe(ctx, button, more) {
  const pop = el('div', 'sr-pop sr-subpop sr-float');
  pop.id = 'sr-sub';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-labelledby', 'sr-sub-h');
  pop.hidden = true;
  document.body.appendChild(pop);
  let from = button;
  const close = (returnFocus) => {
    if (pop.hidden) return;
    pop.hidden = true;
    button.setAttribute('aria-expanded', 'false');
    if (returnFocus && from) from.focus({ preventScroll: true });
  };
  const form = createSubscribe(ctx, { close });
  pop.appendChild(form.root);
  const open = (opener) => {
    if (!pop.hidden) return;
    const rail = ctx && ctx.rail;
    if (rail) { rail.closeShow(); rail.closeMore(); }
    if (ctx && ctx.share) ctx.share.close();
    from = opener || button;
    pop.hidden = false;
    button.setAttribute('aria-expanded', 'true');
    form.focus();
  };
  document.addEventListener('pointerdown', (e) => {
    if (!pop.hidden && !pop.contains(e.target) && !button.contains(e.target) && !(more && more.contains(e.target))) close(false);
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !pop.hidden) { e.preventDefault(); e.stopPropagation(); close(true); }
  }, true);
  return { open, close, toggle: (opener) => (pop.hidden ? open(opener) : close(false)) };
}
