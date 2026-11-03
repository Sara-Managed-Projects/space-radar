// A page whose language file fails, or lacks a key, still reads as English: never a hole, never a key name.
//
//   node scripts/check-language-fallback.mjs --base=http://127.0.0.1:8177 [--lang=de] [--mobile]
//
// WHY THIS EXISTS (public #1265, release 1.6.3). tests/test_language_loader.mjs proves in node that copy/index.js `overlay` leaves a
// missing key to English and that prepare() never throws. That is a unit. Nothing asked a real page, so a change to index.html's
// own module, to a first-paint string read before the language arrived, or to a place that reads a key straight from the language
// file could break the promise ("a half-finished translation is a working page with some English in it") and every test stay green.
// This boots the real app three times in Playwright, each time with ?lang=<code> and one thing wrong with that language's file:
//
//   1. rejected   the request for copy/<code>.js is refused (a network error, a blocked file, a 404 after a deploy);
//   2. broken     the file arrives but does not parse (a deploy cut in half);
//   3. omitted    the file is fine except that one key is not in it (a string added to the English that no language has yet).
//
// Each must boot the app, put no key name, `{slot}`, "undefined" or "[object" on the screen, and say so in <html>: 1 and 2 are
// English (lang="en", no dir), and 3 is the language with that one string in English. Nothing here asks for the network but this
// server; CelesTrak and Launch Library are refused as everywhere else. CI runs it in screens.yml with the browser that job has.
import { chromium } from 'playwright';

const arg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const BASE = arg('base', 'http://127.0.0.1:8177');
const CODE = arg('lang', 'de');
const MOBILE = process.argv.includes('--mobile');
const VIEWPORT = MOBILE ? { width: 390, height: 844 } : { width: 1280, height: 800 };
const UP = MOBILE ? '#sr-side .sr-sheet__handle' : '#sr-side';
const TAB = '#sr-tab-tonight';

const problems = [];
const fail = (msg) => { problems.push(msg); console.error(`::error::${msg}`); };
const browser = await chromium.launch();

async function boot(label, route) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: MOBILE ? 3 : 1, isMobile: MOBILE, hasTouch: MOBILE });
  const warnings = [];
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'warning') warnings.push(m.text()); });
  page.on('pageerror', (e) => errors.push(e.message));
  await page.route(/celestrak\.org|ll\.thespacedevs\.com/, (r) => r.abort());
  await page.route(new RegExp(`/js/copy/${CODE}\\.js(\\?.*)?$`), route);
  await page.goto(`${BASE}/index.html?sw=0&lang=${CODE}`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  await page.waitForSelector(UP, { state: 'attached', timeout: 90_000 });
  await page.waitForSelector(TAB, { state: 'attached', timeout: 30_000 });
  const seen = await page.evaluate(() => ({
    lang: document.documentElement.lang,
    dir: document.documentElement.getAttribute('dir') || '',
    tab: document.querySelector('#sr-tab-tonight').textContent.trim(),
    planets: (document.querySelector('#sr-tab-planets') || {}).textContent || '',
    text: document.body.innerText,
  }));
  await page.close();
  // A hole is a slot, a key path or a JavaScript word on the screen.
  const holes = [...seen.text.matchAll(/\{\w+\}|undefined|\[object|\bNaN\b|\b(?:COPY|GLOSSARY)\.\w+|\b(?:tabs|templates|card|klass)\.[a-z]\w+/g)].map((m) => m[0]).slice(0, 8);
  if (holes.length) fail(`${label}: the screen shows ${JSON.stringify(holes)}`);
  if (errors.length) fail(`${label}: page errors ${JSON.stringify(errors.slice(0, 3))}`);
  return { ...seen, warnings };
}

try {
  // The English the page should fall back to, read from a boot with no language at all.
  const en = await (async () => {
    const page = await browser.newPage({ viewport: VIEWPORT });
    await page.route(/celestrak\.org|ll\.thespacedevs\.com/, (r) => r.abort());
    await page.goto(`${BASE}/index.html?sw=0&lang=en`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForSelector(TAB, { state: 'attached', timeout: 90_000 });
    const out = await page.evaluate(() => ({ tab: document.querySelector('#sr-tab-tonight').textContent.trim(), planets: document.querySelector('#sr-tab-planets').textContent.trim() }));
    await page.close();
    return out;
  })();

  // 1. the request is refused
  const rejected = await boot('rejected', (r) => r.abort('failed'));
  if (rejected.tab !== en.tab || rejected.planets !== en.planets) fail(`rejected: the tabs read "${rejected.tab}" and "${rejected.planets}", English is "${en.tab}" and "${en.planets}"`);
  if (rejected.lang !== 'en' || rejected.dir !== '') fail(`rejected: <html lang="${rejected.lang}" dir="${rejected.dir}"> for a page that is English`);
  if (!rejected.warnings.some((w) => /did not load/.test(w))) fail('rejected: prepare() should say in the console that the words did not load');

  // 2. the file arrives and is not a module
  const broken = await boot('broken', (r) => r.fulfill({ status: 200, contentType: 'text/javascript', body: 'export const COPY = { tabs: {' }));
  if (broken.tab !== en.tab) fail(`broken: the Tonight tab reads "${broken.tab}", English is "${en.tab}"`);
  if (broken.lang !== 'en' || broken.dir !== '') fail(`broken: <html lang="${broken.lang}" dir="${broken.dir}"> for a page that is English`);

  // 3. one key is not in the file (the key behind the Tonight tab); the rest of the language is
  let removed = '';
  const omitted = await boot('omitted', async (r) => {
    const res = await r.fetch();
    const body = await res.text();
    const at = body.search(/"?tabs"?\s*:\s*\{/);
    const m = at < 0 ? null : /\n\s*"?tonight"?\s*:\s*"([^"\n]*)",?/.exec(body.slice(at));
    if (m) removed = m[1];
    const cut = m ? body.slice(0, at) + body.slice(at).replace(m[0], '') : body;
    await r.fulfill({ response: res, body: cut, headers: { ...res.headers(), 'content-length': String(Buffer.byteLength(cut)) } });
  });
  if (!removed) fail('omitted: the check could not find the Tonight tab in the language file to leave out (the file changed shape)');
  if (omitted.tab !== en.tab) fail(`omitted: the tab whose key is gone reads "${omitted.tab}", English is "${en.tab}"`);
  if (omitted.planets === en.planets) fail(`omitted: the Planets tab is "${omitted.planets}" in English too, so the rest of the language did not arrive`);
  if (omitted.lang !== CODE) fail(`omitted: <html lang="${omitted.lang}"> but the language is ${CODE}`);
  console.log(JSON.stringify({ en, rejected: { tab: rejected.tab, lang: rejected.lang }, broken: { tab: broken.tab, lang: broken.lang }, omitted: { tab: omitted.tab, planets: omitted.planets, lang: omitted.lang, left_out: removed } }));
} catch (e) {
  fail(`the check itself failed: ${e && e.message}`);
} finally {
  await browser.close();
}
if (problems.length) process.exit(1);
console.log('language fallback ok: a refused file, a broken file and a missing key each leave a working page in English, with no key name on it');
