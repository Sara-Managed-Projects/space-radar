// The words of the email updates' popover (ui/subscribepop.js, behind the rail's envelope; 2026-11-10), and of the row
// under Coming up that holds the same form with the sky alerts list (ui/subscribe.js).
//
// WHY A FILE OF ITS OWN. The popover is built on the first press of its button, and most visitors never press it:
// its words are not a first visit's bytes, as copy/en.later.js's are not. ADDED TO THE SAME `COPY` OBJECT, imported by
// ui/subscribepop.js alone; no module in the boot graph imports it (tests/test_boot_diet.mjs). The sentences are the
// design kit's (internal web-kit/src/subscribe.mjs and js/subscribe.js), the same as the static pages' form says
// (scripts/seo_subscribe.py, site/js/pages/subscribe.js).
import { COPY } from './en.js';
import { HOOK } from './lang.js';
const KEYS_BEFORE = HOOK.localise ? new Set(Object.keys(COPY)) : null;

Object.assign(COPY, {
  emailUpdates: {
    title: 'Free email updates',
    text: 'Pick what you want to hear about. Nothing is sent until you confirm.',
    pick: 'Pick at least one',
    news: 'Space Radar news',
    journal: 'The Journal',
    games: 'Space games',
    sky: 'Sky alerts',
    models: 'Space Radar models',
    video: 'Space Radar video',
    email: 'Email address',
    placeholder: 'you@example.org',
    button: 'Subscribe',
    sending: 'Sending…',
    retry: 'Try again',
    check: 'Check your inbox: we sent a link to {email}. Nothing is sent until you click it.',
    invalidEmail: 'That address does not look right.',
    rateLimited: 'Too many tries from here. Try again in a few minutes.',
    busy: 'Lots of sign-ups today. Please try again tomorrow.',
    sendFailed: 'We could not send the email. Please try again later.',
    invalidLists: 'Pick at least one list.',
    other: 'Something went wrong. Please try again.',
    unreachable: 'Could not reach the server.',
    privacy: 'We keep your address and the lists you pick, nothing else. No tracking pixels, no rewritten links. Every email has a one-click unsubscribe.',
    privacyLink: 'Privacy',
    honeypot: 'Leave this empty',
    close: 'Close',
    // The row under Coming up (ui/subscribe.js): its heading, and its button, which names the one list it offers.
    comingUp: 'Email me what\'s coming up',
    skyButton: 'Get sky alerts',
  },
});

// The section this file added, in the visitor's language when a translation has it (copy/lang.js, as en.later.js does).
if (HOOK.localise) HOOK.localise({ COPY }, Object.keys(COPY).filter((k) => !KEYS_BEFORE.has(k)));
