// tests/test_subscribe.mjs -- "Email me what's coming up", the row under Coming up (ui/subscribe.js; issue #251, close
// approaches #377). Since 2026-11-10 it holds the email updates' form (ui/subscribepop.js) with the one list it is about:
//
//   - the row is a disclosure row, shut at first; the form is built on its first opening, not before;
//   - it is the kit's single-purpose form: the list `sky` as a hidden field, no box to tick, the button naming the list;
//   - pressing it posts to the subscription service (the popover's address) the address, ['sky'], `app:coming-up` as
//     the source and the empty honeypot, and nothing else; the answers are the popover's states and words;
//   - the old notifier (notify/, never deployed) is not asked for anything.
//
//   node tests/test_subscribe.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { install, fire, N } from './helpers/fakedom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const document = install();
document.head = new N('head');
document.querySelectorAll = (sel) => document.head.querySelectorAll(sel); // ui/latercss.js asks the document for its stylesheets
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const { createSubscribe } = await import(join(ROOT, 'site/js/ui/subscribe.js'));
const pop = await import(join(ROOT, 'site/js/ui/subscribepop.js'));
const w = COPY.emailUpdates;

check(w.comingUp === "Email me what's coming up", 'the heading names what is coming up');
check(!/two|launches and showers/i.test(w.comingUp), 'the heading does not say two');
check(w.skyButton === 'Get sky alerts' && w.skyButton.split(/\s+/).length <= 3, 'the button names the list it offers');

const parent = document.createElement('div');
document.body.appendChild(parent);
const sent = [];
let reply = { ok: true, status: 202, body: { ok: true, status: 'check-inbox' } };
const ui = createSubscribe({
  parent,
  fetchImpl: (url, opts) => {
    sent.push({ url, body: JSON.parse(opts.body) });
    return Promise.resolve({ ok: reply.ok, json: () => Promise.resolve(reply.body) });
  },
});
check(ui && ui.root, 'the row mounts');
const head = parent.querySelector('button.sr-disc__head');
check(head && head.getAttribute('aria-expanded') === 'false', 'the row starts shut and says so');
check(!parent.querySelector('form'), 'no form is built before the row is opened');
fire(head, 'click');
check(head.getAttribute('aria-expanded') === 'true', 'opening it says so');
const form = parent.querySelector('form');
check(!!form, 'opening the row builds the form');
check(form && form.getAttribute('aria-labelledby') === head.id, 'the form is named by the row\'s heading');
const inputs = parent.querySelectorAll('input');
check(inputs.filter((n) => n.type === 'checkbox').length === 0, 'no box to tick: one list');
check(inputs.some((n) => n.type === 'hidden' && n.name === 'lists' && n.value === 'sky'), 'the list is sky, as a hidden field');
check(inputs.some((n) => n.type === 'hidden' && n.name === 'source' && n.value === 'app:coming-up'), 'the source says where the form was');
const web = inputs.find((n) => n.name === 'website');
check(web && web.value === '' && web.tabIndex === -1, 'the honeypot is empty and out of the tab order');
const bl = parent.querySelector('.sub__b').querySelector('span');
check(bl.textContent === w.skyButton, 'the button says Get sky alerts');

const email = inputs.find((n) => n.type === 'email');
email.value = ' reader@example.org ';
fire(form, 'submit');
await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));
check(sent.length === 1, `one request, got ${sent.length}`);
check(sent[0] && sent[0].url === `${pop.SUBSCRIBE_URL}subscribe`, `it posts to the subscription service, not the old notifier (${sent[0] && sent[0].url})`);
check(sent[0] && JSON.stringify(sent[0].body) === JSON.stringify({ email: 'reader@example.org', lists: ['sky'], source: 'app:coming-up', website: '' }),
  `the request is the address, ['sky'], the source and the empty honeypot: ${JSON.stringify(sent[0] && sent[0].body)}`);
const status = parent.querySelector('.sub__s');
check(form.getAttribute('data-state') === 'check' && status.textContent === pop.answerFor(true, { ok: true }, 'reader@example.org').text, `a reached service says check your inbox, as the popover does (${status.textContent})`);

reply = { ok: false, status: 429, body: { ok: false, error: 'rate_limited', message: 'x' } };
fire(form, 'submit');
await new Promise((resolve) => setImmediate(resolve));
await new Promise((resolve) => setImmediate(resolve));
check(form.getAttribute('data-state') === 'error' && status.textContent === w.rateLimited, 'an error is the popover\'s sentence');

fire(head, 'click');
check(head.getAttribute('aria-expanded') === 'false' && parent.querySelector('.sr-disc__panel').hidden, 'pressing the heading again shuts it');

const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
check(!/SPACE_RADAR_NOTIFY_URL/.test(main) && /import\('\.\/ui\/subscribe\.js'\)/.test(main), 'main.js fetches the row after the first visit, with no notifier switch');

if (problems.length) {
  console.error('subscribe FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('subscribe ok: the row under Coming up opens the email updates\' form with the sky alerts list, posts it to the subscription service and answers in the popover\'s words');
