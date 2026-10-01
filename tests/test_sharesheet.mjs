// tests/test_sharesheet.mjs -- the share sheet's words, links and cost (spec 0061 task 8).
//
//   node tests/test_sharesheet.mjs
//
// Four claims. THE TEXT: the post for each network fits that network (X: 280 with a link counted
// as 23 and U+202F counted twice), the link is always last and never cut, the Wikipedia excerpt
// travels only with its attribution, and with no excerpt there is no attribution either. THE
// EXCERPT: whole sentences, at most 280 characters. THE LINK: objectPageUrl() names exactly the
// pages scripts/object_pages.mjs builds (run here, as build_seo.py runs it), and object-pages.json,
// which build_seo.py writes for the sheet, is that same map; everything else falls back to the app
// at `#at=<id>`. THE COST: nothing about sharing is fetched or loaded at boot (a source check; the
// headless half is tests/probes/share-probe.js), and the sheet is one dynamic import.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// Enough of a browser for the modules to import: nothing here is drawn.
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
let fetched = [];
globalThis.fetch = async (url) => { fetched.push(String(url)); return { ok: false, json: async () => null }; };

const sheet = await import(join(JS, 'ui/sharesheet.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { shareText, xLength, excerptOf, wikiTitleOf, objectPageUrl, networkUrl, mailtoUrl, NETWORKS, LIMITS } = sheet;
check(fetched.length === 0, `importing the sheet fetches nothing: ${fetched.join(', ')}`);

const BASE = 'https://www.spaceradar.ai/';
const ATTR = COPY.share.attribution;
const LINK = `${BASE}o/international-space-station.html`;
const NNBSP = ' ';
const ISS = {
  name: 'International Space Station',
  line: `International Space Station is a crewed space station circling Earth, 422 km up, going round once every 93 minutes at 27${NNBSP}567 km/h.`,
  excerpt: 'The International Space Station (ISS) is a space station in low Earth orbit (LEO). It is the product of the International Space Station program and is operated by five partner space agencies: NASA, Roscosmos (Russia), ESA (Europe), JAXA (Japan), and CSA (Canada).',
  attribution: ATTR,
  link: LINK,
};

// ------------------------------------------------------------------------------------ the text
check(ATTR === 'From Wikipedia, CC BY-SA 4.0', `the attribution names the source and the licence: ${ATTR}`);
for (const net of [...Object.keys(LIMITS)]) {
  const text = shareText(ISS, net);
  check(text.endsWith(`\n\n${LINK}`), `${net}: the link is last, after a blank line`);
  check(text.split(LINK).length === 2, `${net}: the link appears once`);
  const lim = LIMITS[net];
  const len = net === 'x' ? xLength(text) - LINK.length + 23 : text.length;
  check(len <= lim.max, `${net}: ${len} is within ${lim.max}`);
  if (text.includes(ISS.excerpt)) check(text.includes(`${ISS.excerpt}\n${ATTR}`), `${net}: the excerpt carries its attribution on the next line`);
  check(!text.includes(ATTR) || text.includes(ISS.excerpt), `${net}: no attribution without an excerpt`);
}
const copy = shareText(ISS, 'copy');
check(copy === `${ISS.line}\n\n${ISS.excerpt}\n${ATTR}\n\n${LINK}`, `the full post: sentence, excerpt, attribution, link (the name opens the sentence, so it is not said twice):\n${copy}`);
const x = shareText(ISS, 'x');
check(!x.includes(ISS.excerpt) && x.includes(ISS.line), `X drops the excerpt before it touches the sentence:\n${x}`);
check(xLength(`a${NNBSP}b`) === 4 && xLength('abc') === 3 && xLength('é') === 1, 'X counts U+202F as two and Latin as one');
// A sentence too long for X is cut at a word with an ellipsis; the link survives whole.
const long = { ...ISS, line: Array.from({ length: 80 }, (_, i) => `word${i}`).join(' ') };
const xl = shareText(long, 'x');
check(xLength(xl) - LINK.length + 23 <= 280 && xl.endsWith(LINK) && /…\n\n/.test(xl), `a long sentence is cut for X, the link kept (${xLength(xl) - LINK.length + 23})`);
// No excerpt: no attribution, no gap where it was.
const bare = shareText({ ...ISS, excerpt: '', attribution: ATTR }, 'copy');
check(bare === `${ISS.line}\n\n${LINK}` && !bare.includes(ATTR), `no excerpt, no attribution:\n${bare}`);
// A name the sentence does not open with is its heading.
const named = shareText({ name: 'Space Radar', line: COPY.app.tagline, link: BASE }, 'copy');
check(named === `Space Radar\n${COPY.app.tagline}\n\n${BASE}`, `the view with nothing selected: name, tagline, link:\n${named}`);
check(shareText({ name: 'The Moon', line: 'The Moon is a world.', link: BASE }) === `The Moon is a world.\n\n${BASE}`, '"The Moon" opens "The Moon is…": not said twice');
// Without a link there is nothing after the text (Telegram and Reddit take the link apart).
check(!shareText({ ...ISS, link: '' }, 'telegram').endsWith('\n'), 'no link, no trailing gap');

// --------------------------------------------------------------------------------- the excerpt
const ex = excerptOf(`${ISS.excerpt} It is the first space station built, maintained and crewed through international cooperation and the largest human spacecraft ever constructed.`);
check(ex.length <= 280 && ex.endsWith('(Canada).'), `the excerpt ends at a sentence within 280 characters (${ex.length}): ${ex}`);
check(excerptOf('Short. Done.') === 'Short. Done.', 'a short summary is kept whole');
check(excerptOf('Mars is red. It has two moons, Phobos and Deimos. It is the fourth planet.', 40) === 'Mars is red.', 'cut at the last sentence that fits');
check(excerptOf('Named for J. R. R. Tolkien. The rest of it goes on and on.', 40) === 'Named for J. R. R. Tolkien.', 'an initial is not a sentence end');
const run = excerptOf(Array.from({ length: 90 }, (_, i) => `w${i}`).join(' ') + '.', 100);
check(run.length <= 100 && run.endsWith('…'), `one sentence longer than the limit is cut at a word: ${run}`);
check(excerptOf('') === '' && excerptOf(null) === '', 'nothing in, nothing out');

// ------------------------------------------------------------------------------ the article
check(wikiTitleOf({ id: 'sat-25544' }) === 'International_Space_Station', 'the ISS names its article (data/wikititles.js)');
check(wikiTitleOf({ id: 'mercury' }) === 'Mercury_(planet)', 'Mercury is the planet, not the element');
check(wikiTitleOf({ id: 'hip-32349', meta: { whySource: 'https://en.wikipedia.org/wiki/Sirius (read 2026-09-22)' } }) === 'Sirius', 'a star names its article in its own source line');
check(wikiTitleOf({ id: 'x', meta: { source: 'https://en.wikipedia.org/wiki/Io_(moon) (infobox)' } }) === 'Io_(moon)', 'a title\'s own brackets are kept, the note\'s are not');
check(wikiTitleOf({ id: 'x', meta: { source: 'https://en.wikipedia.org/wiki/PSR_B1919%2B21 (infobox)' } }) === 'PSR_B1919+21', 'an encoded title is decoded');
check(wikiTitleOf({ id: 'dso-m42', meta: { cite: 'distance: https://en.wikipedia.org/wiki/List_of_Messier_objects' } }) === null, 'a list is a source for a number, not the thing\'s article');
check(wikiTitleOf({ id: 'sat-99999', name: 'Juno' }) === null, 'no article named, no excerpt: never a guess from the name');
check(wikiTitleOf(null) === null, 'no record, no article');

// ------------------------------------------------------------------------------- the page link
// The pages exactly as scripts/build_seo.py gets them, and the index it writes for the sheet.
const pagesJson = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'scripts/object_pages.mjs')], { cwd: ROOT, maxBuffer: 64 << 20 }).toString());
const index = Object.fromEntries(pagesJson.pages.map((p) => [p.id, p.slug]));
let wrong = 0;
for (const p of pagesJson.pages) if (objectPageUrl({ id: p.id }, index, BASE) !== `${BASE}o/${p.slug}.html`) wrong += 1;
check(pagesJson.pages.length > 200 && wrong === 0, `every one of ${pagesJson.pages.length} object pages is linked by its own slug (${wrong} wrong)`);
check(objectPageUrl({ id: 'sat-25544' }, index, BASE) === LINK, `the ISS links to its page: ${objectPageUrl({ id: 'sat-25544' }, index, BASE)}`);
check(objectPageUrl({ id: 'mars' }, index, BASE) === `${BASE}o/mars.html`, 'Mars links to its page');
check(objectPageUrl({ id: 'sat-44713' }, index, BASE) === `${BASE}#at=sat-44713`, 'a record without a page is the app at #at=<id>');
check(objectPageUrl({ id: 'mars' }, null, BASE) === `${BASE}#at=mars`, 'no index (a local server, offline): #at=<id>, never a guessed page');
check(objectPageUrl({ id: 'x' }, { x: '../evil' }, BASE) === `${BASE}#at=x`, 'a slug that is not a safe path segment is refused');
check(objectPageUrl({ id: 'mars' }, index, 'http://127.0.0.1:8416/site/') === 'http://127.0.0.1:8416/site/o/mars.html', 'relative to where the app lives');
{
  const out = mkdtempSync(join(tmpdir(), 'sr-share-seo-'));
  try {
    execFileSync('python3', [join(ROOT, 'scripts/build_seo.py'), '--out', out], { cwd: ROOT, stdio: 'pipe' });
    const built = JSON.parse(readFileSync(join(out, 'object-pages.json'), 'utf8'));
    check(JSON.stringify(Object.entries(built).sort()) === JSON.stringify(Object.entries(index).sort()), 'build_seo.py writes object-pages.json, the same id-to-slug map');
    for (const [id, slug] of Object.entries(built).slice(0, 400)) check(existsSync(join(out, 'o', `${slug}.html`)), `object-pages.json names o/${slug}.html (${id}), which was built`);
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
}
const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
check(/"\$BUILT\/object-pages\.json:application\/json; charset=utf-8"/.test(deploy) && /"\/object-pages\.json"/.test(deploy), 'deploy.sh uploads object-pages.json as JSON and invalidates it');

// ------------------------------------------------------------------------------ the networks
const parts = { ...ISS };
const hosts = { x: 'https://x.com/intent/post?', facebook: 'https://www.facebook.com/sharer/sharer.php?', linkedin: 'https://www.linkedin.com/sharing/share-offsite/?', whatsapp: 'https://wa.me/?', telegram: 'https://t.me/share/url?', reddit: 'https://www.reddit.com/submit?' };
check(NETWORKS.join() === 'x,facebook,linkedin,whatsapp,telegram,reddit', `six networks in order: ${NETWORKS}`);
for (const n of NETWORKS) {
  const url = networkUrl(n, parts);
  check(url.startsWith(hosts[n]), `${n}: its public share page (${url.slice(0, 50)})`);
  check(!/utm_|fbclid|ref=|via=|related=/.test(url), `${n}: no tracking parameter`);
  const q = new URL(url).searchParams;
  const link = q.get('u') || q.get('url') || null;
  if (link) check(link === LINK, `${n}: the link is the object's page`);
  const text = q.get('text');
  if (text && n !== 'telegram') check(text.endsWith(LINK), `${n}: the text ends with the link`);
}
const xUrl = new URL(networkUrl('x', parts)).searchParams.get('text');
check(xLength(xUrl) - LINK.length + 23 <= 280, `X gets a post it accepts (${xLength(xUrl) - LINK.length + 23})`);
const reddit = new URL(networkUrl('reddit', parts)).searchParams.get('title');
check(reddit.length <= 300 && !reddit.includes('\n') && !reddit.includes('http'), `Reddit: a one-line title, the link apart: ${reddit}`);
const tg = new URL(networkUrl('telegram', parts)).searchParams.get('text');
check(!tg.includes(LINK), 'Telegram: the link once, in its own field');
const mail = mailtoUrl('International Space Station, on Space Radar', shareText(parts, 'email'));
check(mail.startsWith('mailto:?subject=International%20Space%20Station%2C%20on%20Space%20Radar&body='), `the email has a subject: ${mail.slice(0, 80)}`);
check(mail.includes('%0D%0A') && !/%0A(?<!%0D%0A)/.test(mail.replace(/%0D%0A/g, '')), 'line breaks as CRLF (RFC 6068)');
check(decodeURIComponent(mail.split('&body=')[1]).replace(/\r\n/g, '\n') === shareText(parts, 'email'), 'the body is the post, the link last');
check(mail.length < 2000, `the mailto: fits every mail client (${mail.length} < 2000)`);
check(/Share…/.test(COPY.share.emailNote) && /picture/.test(COPY.share.emailNote) && COPY.share.emailNote.length <= 60, `the sheet says email cannot carry the picture, in one line: "${COPY.share.emailNote}"`);

// ------------------------------------------------------------------- nothing before the sheet
const src = (f) => readFileSync(join(JS, f), 'utf8');
const shareSrc = src('ui/share.js');
const sheetSrc = src('ui/sharesheet.js');
const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
check(!/\bfetch\s*\(/.test(shareSrc), 'ui/share.js, loaded with every card, fetches nothing');
check(/import\('\.\/sharesheet\.js'\)/.test(shareSrc) && !/from '\.\/sharesheet\.js'/.test(shareSrc), 'the sheet is a dynamic import on the first open');
for (const f of ['sharesheet.js', 'printcompose.js', 'wikititles.js', 'share.css']) check(!html.includes(f), `index.html neither preloads nor links ${f}`);
for (const f of ['main.js', 'ui/cards.js', 'ui/rail.js', 'ui/shell.js']) check(!/from '[^']*(sharesheet|printcompose|wikititles)\.js'/.test(src(f)), `${f} does not import the sheet, the composer or the titles statically`);
// The only fetch in the sheet is fetchJson, and its only callers are the two look-ups, which only
// lookUp() calls, which only open() calls.
check((sheetSrc.match(/\bfetch\(/g) || []).length === 1 && /return fetch\(url, \{ \.\.\.opts, signal/.test(sheetSrc), 'one fetch in the sheet, in fetchJson');
check((sheetSrc.match(/fetchJson\(/g) || []).length === 3, 'fetchJson is called twice (the summary, the index)');
check((sheetSrc.match(/\blookUp\(/g) || []).length === 2 && /const looked = w\.record \? lookUp\(/.test(sheetSrc), 'the look-ups run from open() only');
check(/credentials: 'omit'/.test(sheetSrc) && /referrerPolicy: 'no-referrer'/.test(sheetSrc), 'Wikipedia is asked with no cookies and no referrer');
check(/rest_v1\/page\/summary\//.test(sheetSrc), 'the REST summary endpoint');
check(!/<script|createElement\('script'\)|connect\.facebook\.net|platform\.twitter|platform\.linkedin|widgets\.js/i.test(sheetSrc), 'no network SDK: no script of theirs is ever loaded');

// ------------------------------------------------------------------------- the contract
check(/ctx\.share\.open\(\{ record, trip, opener \}\)/.test(shareSrc), 'ui/share.js documents ctx.share.open({ record, trip, opener })');
const { installShare } = await import(join(JS, 'ui/share.js'));
const ctx = {};
const api = installShare(ctx);
check(ctx.share === api && typeof api.open === 'function' && typeof api.close === 'function' && typeof api.isOpen === 'function' && api.isOpen() === false, 'installShare puts open, close and isOpen on ctx.share, closed');
check(fetched.length === 0, `nothing was fetched by any of this: ${fetched.join(', ')}`);

if (problems.length) {
  console.error(`sharesheet: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`sharesheet ok: the post fits all ${Object.keys(LIMITS).length} limits with the link last, X at 280 with the link as 23, excerpts whole sentences with their attribution and none without; ${pagesJson.pages.length} object pages linked by slug, the rest at #at=; six networks, mailto in CRLF; nothing fetched or loaded before the sheet opens`);
