// tests/test_blog_list.mjs -- the "From the journal" lists redrawn at runtime (site/js/pages/blog.js, internal #102).
// Held without a browser: the pick rule equals scripts/seo_common.py from_blog's, a bad feed leaves the baked list alone,
// only the journal's own addresses are linked, and a good feed redraws a list from the page's data-blog-* attributes.
//   node tests/test_blog_list.mjs
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const B = await import(join(ROOT, 'site/js/pages/blog.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const H = 'https://blog.spaceradar.ai/';
const body = { items: [
  { title: 'Old ISS', url: `${H}old-iss/`, date: '2026-10-01', summary: 'About the ISS.', tags: ['ISS'] },
  { title: 'Newest', url: `${H}newest/`, date: '2026-11-14', summary: 'Nothing special.', tags: [] },
  { title: 'Elsewhere', url: 'https://example.com/x/', date: '2026-11-15', summary: 'Not ours.', tags: [] },
  { title: 'Bad day', url: `${H}bad/`, date: 'yesterday', summary: 's', tags: [] },
  { title: 'Middle', url: `${H}middle/`, date: '2026-10-20', summary: 'Mentions the iss again.', tags: ['skywatching'] },
  null,
] };
const stories = B.storiesOf(body);
check(stories.length === 3, 'a foreign address, a bad day and a null row are dropped');
check(stories.map((s) => s.title).join() === 'Newest,Middle,Old ISS', 'newest first');
check(B.dayWords('2026-11-04') === '4 November 2026', 'the day is written as the build writes it');
check(B.dayWords('nope') === '', 'a bad day is empty');
check(B.pick(stories, ['iss'], 2, '').map((s) => s.title).join() === 'Middle,Old ISS', 'keyword hits first, newest first');
check(B.pick(stories, ['iss'], 3, `${H}middle/`).map((s) => s.title).join() === 'Old ISS,Newest', 'the page\'s own story is skipped, others top up');
check(B.pick(stories, [], 2, '').map((s) => s.title).join() === 'Newest,Middle', 'no keyword: the newest');
check(B.storiesOf({}).length === 0 && B.storiesOf(null).length === 0, 'a body of the wrong shape has no stories');

// a minimal DOM: a section with one list, enough for redraw()
function el(tag) {
  const e = { tag, children: [], dataset: {}, className: '', href: '', textContent: '', ownerDocument: null };
  e.append = (...k) => { e.children.push(...k); };
  e.replaceChildren = (...k) => { e.children = k; };
  e.querySelector = (q) => (q === 'ul' ? e.ul : null);
  return e;
}
const doc = { createElement: el };
const section = el('section');
section.ownerDocument = doc;
section.ul = el('ul');
section.ul.children = [el('li')];
section.dataset = { blogLimit: '2', blogKeywords: 'iss', blogSkip: '' };
check(B.redraw(section, stories) === true && section.ul.children.length === 2, 'a list is redrawn to its limit');
const first = section.ul.children[0];
check(first.children[0].children[0].href === `${H}middle/` && first.children[2].textContent === '20 October 2026', 'a card links the story and shows its day');
const before = section.ul.children;
check(B.redraw(section, []) === false && section.ul.children === before, 'no story: the baked list stays');

// run(): a failing or odd feed changes nothing
const holder = { querySelectorAll: () => [section] };
check(await B.run(holder, async () => { throw new Error('offline'); }) === 0, 'offline: nothing changes');
check(await B.run(holder, async () => ({ ok: false })) === 0, 'an error status: nothing changes');
check(await B.run(holder, async () => ({ ok: true, json: async () => { throw new Error('not json'); } })) === 0, 'not JSON: nothing changes');
check(await B.run(holder, async () => ({ ok: true, json: async () => body })) === 1, 'a good feed redraws the list');
let asked = null;
await B.run(holder, async (u, o) => { asked = [u, o]; return { ok: false }; });
check(asked && asked[0] === B.FEED && asked[1].credentials === 'omit', 'one GET of the feed, without credentials');
check(await B.run({ querySelectorAll: () => [] }, async () => { throw new Error('must not be asked'); }) === 0, 'a page with no list asks for nothing');

if (problems.length) { console.error(problems.map((p) => `FAIL ${p}`).join('\n')); process.exit(1); }
console.log('ok: the journal lists are redrawn from the feed and survive a bad one');
