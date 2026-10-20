// tests/test_language_loader.mjs -- the page can speak a language file, and English costs nothing (public #524, spec 0077 W1-e).
//
// What is held, and why:
//   1. WHICH language: ?lang= first, then the browser's own list but only for a language marked `reviewed` (the review rule in
//      docs/TRANSLATING.md), else English; an unknown code is English. `pickLanguage` is pure, so each rule is broken on purpose here.
//   2. THE WORDS GO IN PLACE: index.html's module prepares the language, then with ?lang=es the objects every module holds (COPY, GLOSSARY) carry Spanish, including the sections
//      copy/en.later.js and en.facts.js add when they load, and the formatting helpers (comparisons, compass, time words, the "un/una"
//      rule) speak it. A key a language file lacks stays English. Each run is its own process, because the choice is made when
//      copy/lang.js is first evaluated.
//   3. ENGLISH IS FREE: no module in the boot graph imports copy/index.js or a language file (the boot diet holds the same), copy/lang.js
//      is small, and a page with no language asked for fetches nothing more.
//   4. THE SPANISH is sound, and honest about itself: its slots intact and nearly every string present (the checker lists the rest), `META.review` says machine-drafted,
//      the page does not offer it from the browser's language, and the progress table in docs/TRANSLATING.md is current.
//   node tests/test_language_loader.mjs
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const href = (f) => pathToFileURL(join(JS, f)).href;
const { pickLanguage, LANGUAGES } = await import(href('copy/lang.js'));
const { overlay } = await import(href('copy/index.js'));

// --- 1. which language ----------------------------------------------------------------------------------
const table = { en: { reviewed: true }, es: { reviewed: false }, fr: { reviewed: true }, 'pt-BR': { reviewed: true } };
assert.equal(pickLanguage('', [], table), 'en', 'nothing asked, nothing offered: English');
assert.equal(pickLanguage('?lang=es', [], table), 'es', '?lang= picks a language, reviewed or not');
assert.equal(pickLanguage('?sw=0&lang=es&x=1', [], table), 'es', 'among other keys');
assert.equal(pickLanguage('?lang=es-MX', [], table), 'es', 'a regional form is read by its first part');
assert.equal(pickLanguage('?lang=ES', [], table), 'es', 'in any case');
assert.equal(pickLanguage('?lang=en', ['fr'], table), 'en', '?lang=en forces English over the browser');
assert.equal(pickLanguage('?lang=xx', ['fr'], table), 'en', 'a code nobody has written is English, and the browser is not asked');
assert.equal(pickLanguage('?lang=constructor', [], table), 'en', 'a code that is a property of Object is not a language');
assert.equal(pickLanguage('', ['fr-CA', 'en'], table), 'fr', 'the browser: the first language that is written and reviewed');
assert.equal(pickLanguage('', ['es-ES', 'fr'], table), 'fr', 'the browser skips a language that has not been reviewed');
assert.equal(pickLanguage('', ['es'], table), 'en', 'and a browser that only offers an unreviewed language gets English');
assert.equal(pickLanguage('?lang=%E0%A4%A', [], table), 'en', 'garbage in the query does not throw');
assert.equal(pickLanguage('?lang=', ['fr'], table), 'en', 'an empty ?lang= is an unknown code, not "no choice"');

// --- a language file that lacks keys falls back to English, key by key -----------------------------------
const english = { a: 'Hello', b: { c: 'Close', d: 'Open {n}', e: ['one', 'two'] }, f: 'Fixed' };
const held = english.b; // a module's `const T = COPY.b` taken before the language arrived
assert.equal(overlay(english, { a: 'Hola', b: { c: 'Cerrar', e: ['uno'], z: 'extra' }, f: '', g: 'unknown', h: { i: 1 } }), 3, 'three strings replaced');
assert.deepEqual(english, { a: 'Hola', b: { c: 'Cerrar', d: 'Open {n}', e: ['uno', 'two'] }, f: 'Fixed' }, 'a missing key, an empty string and an unknown key leave English alone');
assert.equal(held.c, 'Cerrar', 'the object a module already holds sees the translation: it goes over the English in place');
assert.equal(overlay({ a: 'x', b: { c: 'y' } }, { a: { z: 1 }, b: 'text' }), 0, 'a group where English has text, or text where it has a group, is ignored');

// --- 2. the words go in place -----------------------------------------------------------------------------
function run(globals, body) {
  const code = `${Object.entries(globals).map(([k, v]) => `Object.defineProperty(globalThis, ${JSON.stringify(k)}, { value: ${JSON.stringify(v)}, configurable: true, writable: true });`).join('\n')}
    if (globalThis.document) globalThis.document = { documentElement: {} };
    // what index.html's own module does before it imports main.js (and so copy/en.js)
    const { LANG } = await import(${JSON.stringify(href('copy/lang.js'))});
    if (LANG !== 'en') await (await import(${JSON.stringify(href('copy/index.js'))})).prepare();
    const m = await import(${JSON.stringify(href('copy/en.js'))});
    await import(${JSON.stringify(href('copy/en.later.js'))});
    const out = (v) => console.log(JSON.stringify(v));
    ${body}`;
  return JSON.parse(execFileSync(process.execPath, ['--input-type=module', '-e', code], { encoding: 'utf8' }).trim().split('\n').pop());
}
const probe = `out({
  lang: globalThis.document ? globalThis.document.documentElement.lang || '' : null,
  dir: globalThis.document ? globalThis.document.documentElement.dir || '' : null,
  tonight: m.COPY.tabs.tonight, later: m.COPY.templates.storm.lead, facts: m.COPY.klass.station, glossary: m.GLOSSARY.orbit.slice(0, 20),
  size: m.compare('sizeM', 3), driving: m.compare('distanceKm', 500), speed: m.compare('speedKmh', 5000),
  compass: m.compassWords(45), fists: m.fistsWords(25), ago: m.ageInWords(3 * 3600e3), inx: m.inWords(2 * 3600e3),
  num: m.fmt.int(1234567), one: m.COPY.numberWords[1],
  articles: [m.article('galaxia'), m.article('cúmulo estelar'), m.article('depresión tropical'), m.article('nave espacial'), m.article('planeta'), m.article('azul')],
});`;
const en = run({}, probe);
assert.equal(en.tonight, 'Tonight', 'no language asked: English');
assert.equal(en.lang, null, 'and no document to touch (copy/lang.js writes <html lang> only for another language)');
assert.equal(en.size, 'about the size of a car');
assert.equal(en.compass, 'north-east');
assert.equal(en.ago, '3 hours ago');
assert.deepEqual(en.articles, ['a', 'a', 'a', 'a', 'a', 'an'], 'the English article rule is untouched');

const es = run({ location: { search: '?lang=es' }, document: {} }, probe);
assert.equal(es.lang, 'es', '<html lang> follows the language');
assert.equal(es.dir, '', 'and Spanish is left to right');
assert.equal(es.tonight, 'Esta noche', 'copy/en.js sections are Spanish');
assert.match(es.later, /^\{name\} es \{a\} \{status\} cuyo centro/, 'the sections copy/en.later.js adds are Spanish too, with their slots');
assert.equal(es.facts, 'Estación', 'and the ones copy/en.facts.js adds');
assert.match(es.glossary, /^Un camino alrededor/, 'the glossary');
assert.equal(es.size, 'más o menos del tamaño de un coche', 'the comparisons are COPY.compareText, not English in code');
assert.match(es.driving, /^a 500 km de altura, unas 5 horas de coche/, 'including the one with a plural in it');
assert.match(es.speed, /^5\u202f000 km\/h, unos 83 km cada minuto$/);
assert.equal(es.compass, 'noreste');
assert.equal(es.fists, 'a unos tres puños sobre el horizonte');
assert.equal(es.ago, 'hace 3 horas');
assert.equal(es.inx, 'dentro de 2 horas');
assert.equal(es.num, '1 234 567', 'numbers keep the app\'s own grouping');
assert.equal(es.one, 'un');
assert.deepEqual(es.articles, ['una', 'un', 'una', 'una', 'un', 'una'], 'RULES.article: the gender of a type word');

assert.equal(run({ location: { search: '?lang=xx' }, document: {} }, probe).tonight, 'Tonight', 'an unknown ?lang= is English');
const fromBrowser = run({ location: { search: '' }, navigator: { languages: ['es-MX', 'es'], language: 'es-MX' }, document: {} }, probe);
assert.equal(fromBrowser.tonight, 'Tonight', 'a Spanish browser is NOT given the machine-drafted Spanish by itself');
assert.equal(fromBrowser.lang, '', 'and <html lang> stays as the page wrote it');
assert.equal(run({ location: { search: '?lang=es&from=ig' } , document: {} }, probe).tonight, 'Esta noche', 'other query keys do not matter');

// --- 3. English is free, and nothing here needs more than es2020 ---------------------------------------------
const walk = (dir) => readdirSync(dir).flatMap((f) => (statSync(join(dir, f)).isDirectory() ? walk(join(dir, f)) : f.endsWith('.js') ? [join(dir, f)] : []));
const STATIC = /^\s*(?:import|export)\b[^'"\n]*?(?:from\s*)?['"]([^'"]+)['"]/gm;
for (const file of walk(JS)) {
  const code = readFileSync(file, 'utf8');
  for (const [, target] of code.matchAll(STATIC)) {
    if (/(^|\/)(index|es|fr|de|pt|pt-BR|ru|uk|zh-Hans|he|ar|hi)\.js$/.test(target) && /copy\//.test(target + file)) { // 0077 W2-f: pt added
      assert.fail(`${file} imports ${target} statically: a language file or copy/index.js would be part of every first visit`);
    }
  }
}
for (const file of ['copy/en.js', 'copy/en.later.js', 'copy/en.facts.js']) {
  const code = readFileSync(join(JS, file), 'utf8');
  assert.ok(/if \(HOOK\.localise\) HOOK\.localise\(/.test(code), `${file} ends by asking the hook to localise, and does nothing when no language was prepared`);
  assert.ok(!/\bimport\s*\(/.test(code.replace(/\/\/.*$/gm, '')), `${file} has no dynamic import: the language is prepared by index.html, before the app`);
}
const page = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
assert.ok(/if \(LANG !== 'en'\) await \(await import\('\.\/js\/copy\/index\.js'\)\)\.prepare\(\);/.test(page), 'index.html prepares a language that is not English');
assert.ok(page.indexOf('prepare();') < page.indexOf("import('./js/main.js')") && page.indexOf('prepare();') < page.indexOf("import('./js/embedlite.js')"), 'and does it before it imports the app, or the light embed');
// No top-level await anywhere in the app: the deploy compiles for es2020 (scripts/minify_site.py --target=es2020), which has none.
for (const file of walk(JS)) {
  const code = readFileSync(file, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  assert.ok(!/^(?:await\b|(?:const|let|var)\s+[^=\n]+=\s*await\b)/m.test(code), `${file} has a top-level await: the deploy's es2020 target refuses it`);
}
const langBytes = statSync(join(JS, 'copy/lang.js')).size;
assert.ok(langBytes < 3500, `copy/lang.js is in the boot graph and must stay small (${langBytes} B as written, comments included)`); // 0077 W2-f: 3200 to 3500, three rows for fr, de, pt
assert.ok(!/import\s*\(/.test(readFileSync(join(JS, 'copy/lang.js'), 'utf8').replace(/\/\/.*$/gm, '')), 'copy/lang.js only decides: it fetches nothing');

// --- 4. the Spanish --------------------------------------------------------------------------------------
const { check, status, docWithTable } = await import(pathToFileURL(join(ROOT, 'scripts/check-translation.mjs')).href);
const { out } = await check(join(JS, 'copy/es.js'));
// A string another stage adds to copy/en.js is English in Spanish until a top-up (the checker lists it, the page shows English):
// that is not a failure here. A slot lost or invented, or text where English has a group, is: it prints a hole on the screen.
assert.deepEqual([out.placeholder, out.kind], [[], []], `copy/es.js loses or invents a {slot}, or has the wrong kind of value:\n${JSON.stringify(out, null, 1).slice(0, 600)}`);
const es_ = await import(href('copy/es.js'));
assert.equal(es_.META.review.status, 'machine-drafted', 'the Spanish says what it is until two native speakers have read it');
assert.equal(LANGUAGES.es.reviewed, false, 'and the browser\'s language does not bring it in');
assert.ok(LANGUAGES.es.locale === 'es-ES', 'its dates are written in Spanish');
const st = await status();
assert.deepEqual(st.problems, [], `the translation table has problems:\n${st.problems.join('\n')}`);
const row = st.rows.find((r) => r.code === 'es');
assert.ok(row && row.present / row.total > 0.9, `at least nine in ten strings of the English have a Spanish (${row && row.present} of ${row && row.total}); node scripts/check-translation.mjs site/js/copy/es.js lists the rest`);
assert.ok(row.changed / row.total > 0.9, `at least nine in ten strings differ from the English (${row.changed} of ${row.total})`);
const doc = await docWithTable();
assert.equal(doc.stale, false, 'the table in docs/TRANSLATING.md is current: node scripts/check-translation.mjs --write-doc');
// A language that breaks the review rule is named (the rule is held, not only written down).
const bad = await (async () => {
  const fake = { rows: [{ code: 'zz', name: 'Zed', english: 'Zed', total: 10, present: 10, changed: 10, slotProblems: 0, extra: 0, review: 'machine-drafted', by: [], registered: true, offered: true }] };
  const { table: render } = await import(pathToFileURL(join(ROOT, 'scripts/check-translation.mjs')).href);
  return render({ total: 10, rows: fake.rows }, true);
})();
assert.match(bad, /\| Zed \(Zed\) \| `zz\.js` \|/, 'the table prints a row for each language');
// 0077 W2-f: begin
// --- 5. French, German, Brazilian Portuguese (public #526, #527, #528) ------------------------------------------
const probe2 = `out({
  lang: globalThis.document.documentElement.lang || '', tonight: m.COPY.tabs.tonight, later: m.COPY.templates.storm.lead, facts: m.COPY.klass.station,
  glossary: m.GLOSSARY.orbit.slice(0, 24), ago: m.ageInWords(3 * 3600e3), num: m.fmt.num(1234.5, 1), int: m.fmt.int(1234567),
  plural: [m.fmt.plural(0, 'one', 'many'), m.fmt.plural(1, 'one', 'many'), m.fmt.plural(1.5, 'one', 'many'), m.fmt.plural(2, 'one', 'many')],
  article: [m.article('galaxy'), m.article('nebula')], compass: m.compassWords(45),
});`;
const WANT = {
  fr: { lang: 'fr', tonight: 'Ce soir', ago: 'il y a 3 heures', num: '1 234,5', plural: ['one', 'one', 'one', 'many'] },
  de: { lang: 'de', tonight: 'Heute Nacht', ago: 'vor 3 Stunden', num: '1 234,5', plural: ['many', 'one', 'many', 'many'] },
  pt: { lang: 'pt', tonight: 'Esta noite', ago: 'há 3 horas', num: '1 234,5', plural: ['one', 'one', 'one', 'many'] },
};
for (const [code, want] of Object.entries(WANT)) {
  const got = run({ location: { search: `?lang=${code}` }, document: {} }, probe2);
  assert.equal(got.lang, want.lang, `${code}: <html lang> follows the language`);
  assert.equal(got.tonight, want.tonight, `${code}: copy/en.js sections are in the language`);
  assert.match(got.later, /\{name\}/, `${code}: the sections copy/en.later.js adds are translated, with their slots`);
  assert.notEqual(got.facts, 'Space station', `${code}: and the ones copy/en.facts.js adds`);
  assert.notEqual(got.glossary, 'A path around a world or a star'.slice(0, 24), `${code}: the glossary`);
  assert.equal(got.ago, want.ago, `${code}: the time words`);
  assert.equal(got.num, want.num, `${code}: the decimal is a comma, the groups are narrow no-break spaces (RULES.decimal)`);
  assert.deepEqual(got.plural, want.plural, `${code}: RULES.plural`);
  assert.deepEqual(got.article.map((a) => typeof a), ['string', 'string'], `${code}: RULES.article answers`);
  const mod = await import(href(`copy/${code}.js`));
  assert.equal(mod.META.review.status, 'machine-drafted', `${code}: it says what it is until two native speakers have read it`);
  assert.equal(LANGUAGES[code].reviewed, false, `${code}: and the browser's language does not bring it in`);
  const { out: o2 } = await check(join(JS, `copy/${code}.js`));
  // Release 1.3.0 wave 2 integration: four English sections landed in the same wave as the drafts; until they are
  // translated they fall back to English (docs/TRANSLATING.md), and are listed here so nothing else goes missing.
  const WAVE2_ENGLISH_ONLY = ['COPY.r13Deep', 'COPY.compare', 'COPY.passportKinds', 'COPY.photoCompare'];
  assert.deepEqual([o2.missing.filter((k) => !WAVE2_ENGLISH_ONLY.includes(k)).length, o2.placeholder, o2.kind, o2.extra], [0, [], [], []], `copy/${code}.js lacks a key, loses or invents a {slot}, or has the wrong kind of value:\n${JSON.stringify(o2, null, 1).slice(0, 600)}`);
}
assert.equal(pickLanguage('?lang=pt-BR', [], LANGUAGES), 'pt', '?lang=pt-BR is read as pt: the file is copy/pt.js');
assert.equal(run({ location: { search: '?lang=pt-BR' }, document: {} }, probe2).tonight, 'Esta noite');
assert.equal(run({ location: { search: '' }, navigator: { languages: ['fr-FR', 'de', 'pt-BR'], language: 'fr-FR' }, document: {} }, probe2).tonight, 'Tonight', 'a machine-drafted language is never taken from the browser');
// 0077 W2-f: end

console.log(`language loader ok: ?lang= and the browser's list, English for a missing key, ${row.present} strings of Spanish in place (${langBytes} B of boot code), the table current`);
