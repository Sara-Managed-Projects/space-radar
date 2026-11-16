// tests/test_language_menu.mjs -- the language menu (ui/languagepop.js, internal #310; review of 16 Nov 2026).
// Eleven languages by their own names, each a link to the same view in that language; the choice is kept; the
// menu works from the bare page, from ?lang= and from a language's own folder (/es/ ...).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (rel) => readFileSync(join(ROOT, rel), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const L = await import(join(JS, 'copy/lang.js'));
const P = await import(join(JS, 'ui/languagepop.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const codes = Object.keys(L.LANGUAGES);

// ---- the names: every language of the app, each as its own file names itself ----
check(codes.length === 11 && JSON.stringify(Object.keys(P.LANGUAGE_NAMES)) === JSON.stringify(codes), `the menu lists the eleven languages copy/lang.js registers, in its order (${Object.keys(P.LANGUAGE_NAMES)})`);
check(P.LANGUAGE_NAMES.en === 'English', 'English by its own name');
for (const code of codes.filter((c) => c !== 'en')) {
  const file = await import(join(JS, `copy/${code}.js`));
  check(file.META && file.META.name === P.LANGUAGE_NAMES[code], `${code}: the menu says "${P.LANGUAGE_NAMES[code]}", the name the language's own file gives ("${file.META && file.META.name}")`);
  const C = file.COPY;
  check(C.rail && typeof C.rail.language === 'string' && C.rail.language && C.language && ['title', 'close', 'listLabel', 'note'].every((k) => typeof C.language[k] === 'string' && C.language[k]), `${code}: the menu's own words are translated`);
}
check(COPY.rail.language === 'Language', 'the rail has a word for it');

// ---- the visitor's choice is kept, between the address and the browser's list ----
const pick = L.pickLanguage;
check(pick('', ['de-DE'], L.LANGUAGES, '/', 'en') === 'en', 'English chosen on a German browser stays English');
check(pick('', ['en-US'], L.LANGUAGES, '/', 'hi') === 'hi', 'a chosen language is spoken at the bare address');
check(pick('?lang=fr', ['en-US'], L.LANGUAGES, '/', 'hi') === 'fr' && pick('', ['en-US'], L.LANGUAGES, '/es/', 'hi') === 'es', 'the address still wins: ?lang= and a language\'s folder');
check(pick('', ['de-DE'], L.LANGUAGES, '/', 'xx') === 'de' && pick('', ['de-DE'], L.LANGUAGES, '/', '') === 'de' && pick('', ['de-DE'], L.LANGUAGES, '/') === 'de', 'no choice, or one that is no language, is the browser\'s list as before');
check(L.LANG_KEY === 'sr:lang' && /localStorage\.getItem\(LANG_KEY\)/.test(read('site/js/copy/lang.js')) && /try \{ return localStorage\.getItem/.test(read('site/js/copy/lang.js')), 'it is read from this browser\'s storage, inside a try');

// ---- the address of the same view in another language ----
const href = P.languageHref;
const hash = '#at=moon&t=2027-08-02T10%3A00%3A00Z&stage=earth';
const none = new Set();
const shells = new Set(['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']);
const en = ['en-US'];
// a local copy, or a language with no folder: ?lang=
check(href('es', { pathname: '/', search: '', hash }, { shells: none, preferred: en }) === `/?lang=es${hash}`, `no folders: ?lang=es (${href('es', { pathname: '/', search: '', hash }, { shells: none, preferred: en })})`);
check(href('hi', { pathname: '/', search: '', hash }, { shells: new Set(['es']), preferred: en }) === `/?lang=hi${hash}`, 'a language without a folder of its own is reached by ?lang=');
// the built site: the folder
check(href('es', { pathname: '/', search: '', hash }, { shells, preferred: en }) === `/es/${hash}`, 'with a folder: /es/ and the same view');
check(href('fr', { pathname: '/es/', search: '', hash }, { shells, preferred: en }) === `/fr/${hash}`, 'from /es/ to /fr/');
check(href('fr', { pathname: '/es/index.html', search: '', hash }, { shells, preferred: en }) === `/fr/${hash}`, 'from /es/index.html too');
check(href('en', { pathname: '/es/', search: '', hash }, { shells, preferred: en }) === `/${hash}`, 'from /es/ back to English: the bare page');
check(href('en', { pathname: '/es/', search: '', hash }, { shells, preferred: ['es-ES', 'en'] }) === `/?lang=en${hash}`, 'English on a Spanish browser says ?lang=en, or the bare page would speak Spanish again');
check(href('en', { pathname: '/', search: '?lang=de', hash }, { shells: none, preferred: en }) === `/${hash}`, 'English from ?lang=de drops the key');
// other query keys stay, lang is replaced
check(href('fr', { pathname: '/', search: '?sw=0&lang=es&tier=1', hash }, { shells: none, preferred: en }) === `/?sw=0&tier=1&lang=fr${hash}`, 'the other query keys are kept and lang= is replaced');
check(href('es', { pathname: '/', search: '?sw=0', hash }, { shells, preferred: en }) === `/es/?sw=0${hash}`, 'and they ride into a folder too');
check(href('es', { pathname: '/site/index.html', search: '?sw=0', hash: '' }, { shells: none, preferred: en }) === '/site/index.html?sw=0&lang=es', 'a local server in a folder keeps its own page');
check(href('es', { pathname: '/', search: '', hash: '#at=moon' }, { shells: none, preferred: en, hash: '#at=moon&cam=40,62,26540' }) === '/?lang=es#at=moon&cam=40,62,26540', 'the view handed in (with the camera) is the one linked');
// every link, read back by copy/lang.js, speaks the language it names: from every kind of address, for every language
let trips = 0;
for (const from of [{ pathname: '/', search: '' }, { pathname: '/', search: '?lang=ru' }, { pathname: '/es/', search: '' }, { pathname: '/he/index.html', search: '?tier=1' }, { pathname: '/site/index.html', search: '?sw=0' }]) {
  for (const have of [none, shells, new Set(['es', 'fr'])]) {
    for (const preferred of [['en-US'], ['de-DE', 'en'], ['ar'], []]) {
      for (const code of codes) {
        const to = new URL(href(code, { ...from, hash }, { shells: have, preferred }), 'https://www.spaceradar.ai');
        const spoken = pick(to.search, preferred, L.LANGUAGES, to.pathname, '');
        check(spoken === code && to.hash === hash, `${from.pathname}${from.search} -> ${code} (browser ${preferred}) gives ${to.pathname}${to.search}, which speaks ${spoken}`);
        trips += 1;
      }
    }
  }
}
// the view's fragment, with the camera
check(P.viewHash('', '40,62,26540') === '#cam=40,62,26540' && P.viewHash('#at=moon', '40,62,26540') === '#at=moon&cam=40,62,26540', 'the camera rides in the fragment');
check(P.viewHash('#trip=moon-landings&stop=3', '1,2,3') === '#trip=moon-landings&stop=3' && P.viewHash('#at=moon&cam=1,2,3', '4,5,6') === '#at=moon&cam=1,2,3' && P.viewHash('#at=moon', '') === '#at=moon', 'but not into a trip, over a pose already there, or when there is none');
// which languages have a folder: the page's own alternates
{
  const links = [['es', 'https://www.spaceradar.ai/es/'], ['zh-Hans', 'https://www.spaceradar.ai/zh/'], ['x-default', 'https://www.spaceradar.ai/'], ['en', 'https://www.spaceradar.ai/'], ['fr', 'https://www.spaceradar.ai/fr/index.html']]
    .map(([hreflang, h]) => ({ getAttribute: (k) => (k === 'href' ? h : hreflang) }));
  const got = P.shellsOf({ querySelectorAll: () => links });
  check(got.size === 3 && got.has('es') && got.has('zh') && got.has('fr'), `the folders are read from the page's hreflang links (${[...got]})`);
  check(P.shellsOf({ querySelectorAll: () => [] }).size === 0 && P.shellsOf(null).size === 0, 'a page with none has none');
}

// ---- the popover itself, with a document of our own ----
{
  const made = [];
  const node = (tag) => {
    const n = { tag, className: '', children: [], attrs: {}, dataset: {}, listeners: {}, hidden: false, textContent: '',
      setAttribute(k, v) { this.attrs[k] = String(v); }, getAttribute(k) { return this.attrs[k]; },
      appendChild(k) { this.children.push(k); return k; }, append(...k) { this.children.push(...k); },
      addEventListener(type, fn) { (this.listeners[type] = this.listeners[type] || []).push(fn); },
      contains(x) { return x === this || this.children.some((c) => c.contains && c.contains(x)); },
      focus() { globalThis.document.activeElement = this; } };
    made.push(n);
    return n;
  };
  const saved = { document: globalThis.document, location: globalThis.location, navigator: globalThis.navigator, localStorage: globalThis.localStorage };
  const stored = {};
  globalThis.document = { createElement: node, createElementNS: node, body: node('body'), addEventListener() {}, querySelectorAll: () => [], activeElement: null };
  globalThis.location = { pathname: '/', search: '', hash: '#at=moon' };
  Object.defineProperty(globalThis, 'navigator', { value: { languages: ['en-US'] }, configurable: true });
  globalThis.localStorage = { setItem: (k, v) => { stored[k] = v; }, getItem: (k) => stored[k] || null };
  try {
    const button = node('button');
    let closed = 0;
    const pop = P.mountLanguage({ camPose: () => ({ azimuthDeg: 40, polarDeg: 62, distanceKm: 26540 }), rail: { closeShow() { closed += 1; }, closeMore() { closed += 1; } } }, button, null);
    const root = made.find((n) => n.id === 'sr-lang');
    const rows = made.filter((n) => n.tag === 'a');
    check(root && /\bsr-pop\b/.test(root.className) && /\bui-pop\b/.test(root.className) && root.hidden === true && root.attrs.role === 'dialog', 'the popover is the rail\'s kind, with the shared set\'s parts, closed until asked');
    check(rows.length === 11 && rows.every((a) => /\bui-row\b/.test(a.className)), `eleven rows of the shared set (${rows.length})`);
    check(rows.map((a) => a.children[0].textContent).join('|') === codes.map((c) => P.LANGUAGE_NAMES[c]).join('|'), 'each language by its own name');
    check(rows.filter((a) => a.attrs['aria-current'] === 'true').length === 1 && rows.find((a) => a.attrs['aria-current'] === 'true').dataset.lang === L.LANG, 'the language in use is the one marked current, by an attribute');
    check(rows.every((a) => a.children[0].lang && a.hreflang), 'each name carries its own language, for a screen reader');
    pop.open(button);
    check(root.hidden === false && button.attrs['aria-expanded'] === 'true' && closed === 2, 'opening it closes What to show and More');
    const es = rows.find((a) => a.dataset.lang === 'es');
    check(es.href === '/?lang=es#at=moon&cam=40,62,26540', `a row links to the same view in its language, camera and all (${es.href})`);
    globalThis.location.hash = '#at=mars';
    root.children[1].children[0].listeners.pointerdown[0]();
    check(es.href === '/?lang=es#at=mars&cam=40,62,26540', 'and to the view as it is when the row is pressed');
    es.listeners.click[0]();
    check(stored['sr:lang'] === 'es', 'following a row keeps the choice in this browser');
    pop.close(true);
    check(root.hidden === true && button.attrs['aria-expanded'] === 'false' && globalThis.document.activeElement === button, 'closing it hands the focus back to the button');
  } finally {
    for (const k of ['document', 'location', 'localStorage']) { if (saved[k] === undefined) delete globalThis[k]; else globalThis[k] = saved[k]; }
    Object.defineProperty(globalThis, 'navigator', { value: saved.navigator, configurable: true });
  }
}

// ---- the rail's button and the phone's row; nothing of the menu at boot ----
const rail = read('site/js/ui/rail.js');
check(/className = 'sr-rail__btn sr-rail__btn--lang'/.test(rail) && /langBtn\.setAttribute\('aria-label', COPY\.rail\.language\)/.test(rail) && /langBtn\.title = COPY\.rail\.language/.test(rail) && /langBtn\.setAttribute\('aria-haspopup', 'dialog'\)/.test(rail), 'the rail has a language button with a name, a tooltip and its popover announced');
check(/import\('\.\/languagepop\.js'\)\.then\(\(m\) => m\.mountLanguage\(ctx, langBtn, moreBtn\)\)/.test(rail) && !/^import [^\n]*languagepop/m.test(rail), 'the menu is fetched on the first press, never at boot');
check(/menuRow\('button', icon\(LANG_PATH\), COPY\.rail\.language, \(\) => language\(\)\.then\(\(s\) => s && s\.open\(moreBtn\)\)\)/.test(rail), 'on a phone it is a row of More');
check(rail.indexOf('sr-rail__btn--lang') < rail.indexOf('createGitHubMark(root'), 'the tool comes before the link out');
check(/html\.sr-phone \.sr-rail__btn--lang,/.test(read('site/css/ui.css')), 'ui.css folds the button away on a phone, with the other tools');
check(/surfaces: \["rail:lang"\]/.test(read('registry/onboarding.yaml')), 'the tour\'s registry knows the button, and why it has no step');
const pop = read('site/js/ui/languagepop.js');
check(!/innerHTML/.test(pop) && /a\.setAttribute\('aria-current', 'true'\)/.test(pop) && /el\('a', 'ui-row ui-row--plain'\)/.test(pop) && /el\('button', 'ui-close'\)/.test(pop) && /x\.appendChild\(icon\('x'\)\)/.test(pop), 'the popover is built from the shared set: rows, the close with the icon set\'s x, current by attribute');

if (problems.length) {
  console.error(`language menu FAILED (${problems.length}):\n  ${problems.slice(0, 30).join('\n  ')}`);
  process.exit(1);
}
console.log(`language menu ok: eleven languages by their own names; ${trips} links from the bare page, ?lang=, a language's folder and a local server each read back as the language they name, on the same view; the choice is kept and English stays English on another browser`);
