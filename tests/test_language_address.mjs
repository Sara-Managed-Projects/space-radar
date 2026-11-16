// tests/test_language_address.mjs -- a visit under /es/, /fr/ ... stays there: the address, a reload, the copied link and Share.
//
// WHY (review of 2026-11-16). The app shell of a language is the English shell with <base href="../"> (scripts/seo_i18n.py
// home_shell), so that every relative address the app fetches is the root's. A URL given to history.replaceState is resolved
// against that base too, and ui/urlstate.js wrote the fragment alone ('#at=moon'): the first selection rewrote
// https://www.spaceradar.ai/es/ to https://www.spaceradar.ai/#at=moon. copy/lang.js reads the language from the path, so a
// reload came back in English, and ui/share.js (which builds its links from the path) shared an English link.
//
// The browser here is two objects that do what a browser does with a base: `history.replaceState(_, _, url)` resolves
// `url` against document.baseURI and moves location to it. Every language the app has is walked.
//   node tests/test_language_address.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const ORIGIN = 'https://www.spaceradar.ai';

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

/** Put the browser at `path` (+ `search`, `hash`) with the document's base at `baseHref` (resolved against the page). */
function visit(path, { search = '', hash = '', baseHref = '' } = {}) {
  const page = `${ORIGIN}${path}${search}${hash}`;
  const base = baseHref ? new URL(baseHref, page).href : page;
  globalThis.document = { baseURI: base };
  globalThis.location = { origin: ORIGIN, pathname: path, search, hash, get href() { return `${ORIGIN}${this.pathname}${this.search}${this.hash}`; } };
  globalThis.history = {
    state: null,
    replaceState(_state, _title, url) {
      // What a browser does: the URL is resolved against the document's base URL, not against the address bar.
      const u = new URL(String(url), globalThis.document.baseURI);
      if (u.origin !== ORIGIN) throw new Error('SecurityError');
      globalThis.location.pathname = u.pathname;
      globalThis.location.search = u.search;
      globalThis.location.hash = u.hash;
    },
  };
}

visit('/');
const U = await import(join(JS, 'ui/urlstate.js'));
const { shareUrl, shareState, appBase } = await import(join(JS, 'ui/share.js'));
const { placeLink } = await import(join(JS, 'ui/place.js'));
const L = await import(join(JS, 'copy/lang.js'));

const codes = Object.keys(L.LANGUAGES).filter((c) => c !== 'en' && /^[a-z]{2}$/.test(c));
check(codes.length >= 9, `the app has at least nine languages with a shell of their own (${codes.join(' ')})`);

for (const code of codes) {
  const home = `/${code}/`;
  // ---- the first selection, the clock, a stage: every write keeps the folder ----
  visit(home, { baseHref: '../' });
  check(globalThis.document.baseURI === `${ORIGIN}/`, `${code}: the shell's base is the root (the stub does what home_shell's <base href="../"> does)`);
  U.write({ at: 'moon' });
  check(location.pathname === home && location.hash === '#at=moon', `${code}: selecting the Moon leaves the address at ${home}#at=moon (it is ${location.pathname}${location.hash})`);
  check(L.pickLanguage(location.search, ['en-US'], L.LANGUAGES, location.pathname) === code, `${code}: a reload of that address still speaks ${code}`);
  U.write({ t: '2026-11-18T00:00:00Z', stage: 'solar' });
  check(location.pathname === home && /at=moon/.test(location.hash) && /stage=solar/.test(location.hash), `${code}: the clock and the stage are written under ${home} too (${location.pathname}${location.hash})`);

  // ---- Share: the link opens in the same language, and reads back as the same view ----
  const link = shareUrl(shareState(null, 'moon'));
  check(link.startsWith(`${ORIGIN}${home}#`), `${code}: Share gives a link under ${home} (${link})`);
  check(appBase() === `${ORIGIN}${home}`, `${code}: appBase() is the language's folder after a write (${appBase()})`);
  const back = new URL(link);
  check(L.pickLanguage(back.search, ['en-US'], L.LANGUAGES, back.pathname) === code, `${code}: the shared link is read as ${code} by copy/lang.js`);
  visit(back.pathname, { hash: back.hash, baseHref: '../' });
  check(U.read().at === 'moon' && U.read().stage === 'solar', `${code}: the shared link reads back as the same view (${JSON.stringify(U.read())})`);
  // a trip's link, and a place's, start in the language's folder as well
  check(shareUrl({ trip: 'moon-landings', stop: 0 }) === `${ORIGIN}${home}t/moon-landings.html`, `${code}: a trip's page is shared as ${home}t/<trip>.html`);
  check(String(placeLink('48.85,2.35') || '').startsWith(`${ORIGIN}${home}`), `${code}: a place's link starts under ${home}`);

  // ---- clearing every key drops the '#' and keeps the folder (and the query) ----
  visit(home, { search: '?tier=1', hash: '#at=moon', baseHref: '../' });
  U.write({ at: null });
  check(location.pathname === home && location.search === '?tier=1' && location.hash === '', `${code}: clearing the selection leaves ${home}?tier=1 (${location.pathname}${location.search}${location.hash})`);

  // ---- a deep link from a page of the language (an event page's "Open the map at that moment") ----
  const deep = new URL(`../#t=2026-11-18T00:00:00Z&at=moon`, `${ORIGIN}/${code}/events/leonids-2026.html`);
  check(deep.pathname === home, `${code}: ../#t=... on /${code}/events/x.html names ${home}`);
  visit(deep.pathname, { hash: deep.hash, baseHref: '../' });
  U.write({ rate: 60 });
  check(location.pathname === home && /t=2026-11-18T00%3A00%3A00Z|t=2026-11-18T00:00:00Z/.test(location.hash) && /at=moon/.test(location.hash),
    `${code}: a write after a deep link keeps the folder and the link's keys (${location.pathname}${location.hash})`);

  // ---- ?from= is taken off without leaving the folder ----
  visit(home, { search: '?from=ig', hash: '#at=mars', baseHref: '../' });
  check(U.dropFrom() === true && location.pathname === home && location.search === '' && location.hash === '#at=mars', `${code}: ?from= is dropped in place (${location.pathname}${location.search}${location.hash})`);

  // ---- /es/index.html is the same shell ----
  visit(`${home}index.html`, { baseHref: '../' });
  U.write({ at: 'io' });
  check(location.pathname === `${home}index.html` && L.pathLanguage(location.pathname) === code, `${code}: ${home}index.html keeps its own address`);
}

// ---- English, and a local server in a folder: as before ----
visit('/');
U.write({ at: 'moon' });
check(location.pathname === '/' && location.hash === '#at=moon' && shareUrl(shareState(null, 'moon')).startsWith(`${ORIGIN}/#`), 'the English root still writes /#at=moon and shares it');
U.write({ at: null });
check(location.pathname === '/' && location.hash === '' && location.search === '', 'clearing the last key leaves the bare root, with no "#"');
visit('/site/index.html', { search: '?sw=0' });
U.write({ at: 'mars' });
check(location.pathname === '/site/index.html' && location.search === '?sw=0' && location.hash === '#at=mars', 'a local server in a folder keeps its path and its query');

if (problems.length) { console.error('language address FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`language address ok: under ${codes.map((c) => `/${c}/`).join(' ')} a selection, the clock, a cleared key and ?from= all keep the folder; Share, a trip and a place link start in it and read back as the same view in the same language`);
