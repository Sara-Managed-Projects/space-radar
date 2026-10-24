// tests/test_subscribe.mjs -- the email signup offers close approaches (public #377).
//
// subscribePayload includes close-approaches only when that box is ticked. With none ticked the
// form says to pick one and posts nothing. The heading no longer says the list is two kinds.
//
//   node tests/test_subscribe.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { install, fire } from './helpers/fakedom.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

install();
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.later.js'));
const { subscribePayload, createSubscribe } = await import(join(ROOT, 'site/js/ui/subscribe.js'));

check(same(subscribePayload(' A@B.com ', true, false, false), { email: 'A@B.com', categories: ['launches'] }), 'launches only when that box is ticked');
check(same(subscribePayload('a@b.com', false, true, false), { email: 'a@b.com', categories: ['meteor-showers'] }), 'showers only when that box is ticked');
check(same(subscribePayload('a@b.com', false, false, true), { email: 'a@b.com', categories: ['close-approaches'] }), 'close approaches only when that box is ticked');
check(same(subscribePayload('a@b.com', true, true, true).categories, ['launches', 'meteor-showers', 'close-approaches']), 'all three when all three are ticked');
check(subscribePayload('a@b.com', false, false, false).categories.length === 0, 'none ticked is an empty list');

check(COPY.subscribe.heading === "Email me what's coming up", 'the heading names what is coming up');
check(!/two|launches and showers/i.test(COPY.subscribe.heading + COPY.subscribe.pickOne), 'the heading and the empty line no longer say two');
check(COPY.subscribe.pickOne === 'Tick at least one.', 'none ticked says to pick one');
check(COPY.subscribe.approachesLabel === 'Close approaches', 'the third box is labelled Close approaches');

globalThis.window.SPACE_RADAR_NOTIFY_URL = 'https://example.test/subscribe';
const parent = document.createElement('div');
document.body.appendChild(parent);
const sent = [];
const ui = createSubscribe({
  parent,
  fetchImpl: (_url, opts) => {
    sent.push(JSON.parse(opts.body));
    return Promise.resolve({ ok: true });
  },
});
check(ui && ui.root, 'the form mounts');
const boxes = parent.querySelectorAll('input').filter((n) => n.type === 'checkbox');
check(boxes.length === 3, `three checkboxes, got ${boxes.length}`);
check(boxes.every((b) => b.checked), 'each box starts ticked, as the two already did');
const labels = parent.querySelectorAll('label').map((n) => n.textContent);
check(labels.includes('Close approaches'), 'the third row reads Close approaches');

const email = parent.querySelectorAll('input').find((n) => n.type === 'email');
const form = parent.querySelector('form');
email.value = 'a@b.com';
for (const box of boxes) box.checked = false;
fire(form, 'submit');
const status = parent.querySelector('.sr-subscribe__status');
check(status.textContent === COPY.subscribe.pickOne, 'none ticked says pick one and does not post');
check(sent.length === 0, 'none ticked posts nothing');

boxes[2].checked = true;
fire(form, 'submit');
await new Promise((resolve) => setImmediate(resolve));
check(sent.length === 1 && same(sent[0], { email: 'a@b.com', categories: ['close-approaches'] }), `ticking only close approaches posts that category, got ${JSON.stringify(sent[0])}`);
check(status.textContent === COPY.subscribe.pending, 'a reached service says to check email');

if (problems.length) {
  console.error('subscribe FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('subscribe ok');
