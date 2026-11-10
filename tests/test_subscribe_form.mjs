// tests/test_subscribe_form.mjs -- the email updates' forms: the static pages' (scripts/seo_subscribe.py, its states in
// site/js/pages/subscribe.js) and the map's popover (ui/subscribepop.js, words in copy/en.subscribe.js), against the design
// kit's rules (internal web-kit/DESIGN.md section 3) and the subscription service's contract (internal
// infra/subscribe/README.md, "Client contract").
//
//   1. THE MARKUP works with no script: a POST form to <service>/subscribe with the fields the service reads (email,
//      lists, source) and the honeypot `website` (empty, off screen, tabindex -1, autocomplete off); several lists
//      start with NONE ticked; a status line that is announced; the privacy line with its link under the form.
//   2. ONE SERVICE: the page form, the page script and the popover name the same address.
//   3. THE SENTENCES of the page script are pinned here (scripts/check_copy.py PAGE_SENTENCE_FILES), and they are the
//      popover's English words: one form, one voice.
//   4. THE ANSWERS: 202 {ok} is "check your inbox" (also for an address already subscribed: nothing tells them apart),
//      an error code gives its sentence, an unknown one the service's own message.
//   5. ONE LOOK: css/static.css and css/subscribe.css carry the same form rules between their "subscribe" markers.
//
//   node tests/test_subscribe_form.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

// --- 1. the markup -----------------------------------------------------------------------------------------------
const py = (code) => execFileSync('python3', ['-c', `import sys; sys.path.insert(0, 'scripts')\n${code}`], { cwd: ROOT, encoding: 'utf8' });
const endpoint = py('import seo_subscribe; print(seo_subscribe.ENDPOINT)').trim();
const band = py('import seo_subscribe; print(seo_subscribe.subscribe_form("../", "https://www.spaceradar.ai/about/index.html"))');
const one = py('import seo_subscribe; print(seo_subscribe.subscribe_form("../../", "https://www.spaceradar.ai/x/", lists=("journal",), form_id="updates", button="Get the journal"))');
check(/^https:\/\/[^/]+\/$/.test(endpoint), `the service address is an https origin ending in / (${endpoint})`);
check(band.includes(`method="post" action="${endpoint}subscribe"`), 'the form posts to <service>/subscribe, so it works with no script');
check(/<input class="sub__e" id="subscribe-e" type="email" name="email" autocomplete="email"[^>]* required[^>]*>/.test(band), 'the address field is a required email field with autocomplete');
check(/<label class="sub__lb" for="subscribe-e">Email address<\/label>/.test(band), 'the address field has a visible label');
check(/<input id="subscribe-w" type="text" name="website" tabindex="-1" autocomplete="off" value="">/.test(band) && /<div class="sub__hp" aria-hidden="true">/.test(band), 'the honeypot `website` is empty, out of the tab order and hidden from a screen reader');
check(/name="source" value="https:\/\/www\.spaceradar\.ai\/about\/index\.html"/.test(band), 'the page says where it is (source)');
const boxes = [...band.matchAll(/<input type="checkbox" name="lists" value="([a-z:-]+)"([^>]*)>/g)];
check(boxes.map((m) => m[1]).join() === 'news,journal,games,sky', `the static pages offer news, journal, games and sky (${boxes.map((m) => m[1])})`);
check(boxes.every((m) => !/checked/.test(m[2])), 'no list starts ticked');
check(/data-multi/.test(band) && !/data-multi/.test(one) && /<input type="hidden" name="lists" value="journal">/.test(one) && !/type="checkbox"/.test(one), 'one list is a hidden field and no box; several are boxes');
check(/<p class="sub__s" role="status" aria-live="polite"><\/p>/.test(band), 'the state is announced politely');
check(/<p class="sub__p">We keep your address and the lists you pick, nothing else\. No tracking pixels, no rewritten links\. Every email has a one-click unsubscribe\. <a href="\.\.\/privacy\/index\.html">Privacy<\/a>\.<\/p>/.test(band), 'the privacy line is under the form and links the privacy page, relatively');
check(one.includes('href="../../privacy/index.html"'), 'the privacy link follows the page\'s depth');

// --- 2. one service ----------------------------------------------------------------------------------------------
const page = await import(join(ROOT, 'site/js/pages/subscribe.js'));
const pop = await import(join(ROOT, 'site/js/ui/subscribepop.js'));
check(pop.SUBSCRIBE_URL === endpoint, `the popover posts to the same service (${pop.SUBSCRIBE_URL})`);
check(pop.LISTS.join() === 'news,journal,games,sky', 'the popover offers the same four lists');
const popSrc = read('site/js/ui/subscribepop.js');
check(/source = 'app:rail'/.test(popSrc) && /JSON\.stringify\(\{ email, lists, source, website: web\.value \}\)/.test(popSrc) && !/location\.(href|hash)/.test(popSrc), 'the popover says it is the app (app:rail, or app:coming-up for the row) and sends no page address or view');
check(/website: web\.value/.test(popSrc) && /tabIndex = -1/.test(popSrc), 'the popover carries the honeypot too');
check(!/checked = true/.test(popSrc), 'no list starts ticked in the popover');

// --- 3. the sentences --------------------------------------------------------------------------------------------
const PINNED = {
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
check(JSON.stringify(page.MSG) === JSON.stringify(PINNED), 'the page script\'s sentences are the pinned ones');
check(page.checkText('a@example.org') === 'Check your inbox: we sent a link to a@example.org. Nothing is sent until you click it.', 'check your inbox, with the address');
check(page.checkText('') === 'Check your inbox. Nothing is sent until you click it.', 'check your inbox, after a form post');
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const w = COPY.emailUpdates;
check(!!w, 'copy/en.subscribe.js adds COPY.emailUpdates');
if (w) {
  const same = [['invalidEmail', 'invalid_email'], ['rateLimited', 'rate_limited'], ['busy', 'busy'], ['sendFailed', 'send_failed'], ['invalidLists', 'invalid_lists'], ['other', 'other'], ['unreachable', 'unreachable'], ['sending', 'sending'], ['retry', 'retry']];
  for (const [a, b] of same) check(w[a] === PINNED[b], `the popover's ${a} is the page's ${b}`);
  check(w.privacy === py('import seo_subscribe; print(seo_subscribe.PRIVACY_LINE)').trim(), 'the popover\'s privacy line is the pages\' one');
}

// --- 4. the answers ----------------------------------------------------------------------------------------------
check(page.answer(true, { ok: true, status: 'check-inbox' }, 'b@example.org').state === 'check', '202 ok is check your inbox');
check(page.answer(false, { ok: false, error: 'rate_limited', message: 'x' }).text === PINNED.rate_limited, 'a known code gives its sentence');
check(page.answer(false, { ok: false, error: 'new_code', message: 'The service says so.' }).text === 'The service says so.', 'an unknown code gives the service\'s message');
check(page.answer(false, null).text === PINNED.other, 'no body gives the plain sentence');
check(pop.answerFor(true, { ok: true }, 'c@example.org').text === 'Check your inbox: we sent a link to c@example.org. Nothing is sent until you click it.', 'the popover says the same');
check(pop.answerFor(false, { error: 'busy' }).text === PINNED.busy, 'the popover maps the codes the same');

// --- 5. one look -------------------------------------------------------------------------------------------------
const block = (css) => { const m = /\/\* subscribe: begin[^*]*\*\/([\s\S]*?)\/\* subscribe: end \*\//.exec(css); return m ? m[1].trim() : null; };
const a = block(read('site/css/static.css')), b = block(read('site/css/subscribe.css'));
check(a && b && a === b, 'css/static.css and css/subscribe.css carry the same form rules');

if (problems.length) { console.error(`subscribe form FAILED (${problems.length}):\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log('subscribe form ok: a plain POST form with the service\'s fields and an empty honeypot, no list ticked, the privacy line under it; the pages, their script and the map\'s popover name one service and say the same sentences; one look in both stylesheets');
