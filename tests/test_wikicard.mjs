// tests/test_wikicard.mjs -- the cards' Wikipedia block and Read aloud (forge #151).
//
//   node tests/test_wikicard.mjs
//
// Holds the pure half (ui/wikicardcore.js), the order an article is looked for in (ui/wikicard.js articleFor, with the
// network replaced), the rule that our own words win, the baked files (site/data/wikicards/), the baker's selection
// (scripts/build-wikicards.mjs bakeList), every language's words, and the sources page's paragraph.
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const core = await import(join(ROOT, 'site/js/ui/wikicardcore.js'));
const W = await import(join(ROOT, 'site/js/ui/wikicard.js'));
const { bakeList } = await import(join(ROOT, 'scripts/build-wikicards.mjs'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));

// --- the languages
assert.equal(core.wikiLang('de-AT'), 'de');
assert.equal(core.wikiLang('zh_CN'), 'zh');
assert.equal(core.wikiLang('xx'), 'en', 'an unknown language asks the English Wikipedia');
assert.equal(Object.keys(core.WIKI_LANGS).length, 11, 'the app\'s eleven languages');
assert.match(core.restSummaryUrl('fr', 'Nébuleuse de la Tête de Cheval'), /^https:\/\/fr\.wikipedia\.org\/api\/rest_v1\/page\/summary\/N%C3%A9buleuse_de_la_T%C3%AAte_de_Cheval$/);
assert.match(core.langLinksUrl('North America Nebula', 'de'), /origin=\*/, 'an anonymous CORS read of the action API');
assert.match(core.commonsInfoUrl('A b.jpg'), /titles=File%3AA%20b\.jpg$/);

// --- addresses and pictures
assert.equal(core.cleanUrl('https://thumb.wikimedia.org/x.jpg?utm_source=en.wikipedia.org&utm_campaign=api&utm_content=thumbnail'), 'https://thumb.wikimedia.org/x.jpg');
assert.equal(core.cleanUrl('https://a.org/p?x=1&utm_source=z'), 'https://a.org/p?x=1');
assert.equal(core.commonsFile('https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/NGC_7000_%2B_IC_5070.jpg/330px-NGC_7000_%2B_IC_5070.jpg?utm_source=x'), 'NGC_7000_+_IC_5070.jpg');
assert.equal(core.commonsFile('https://upload.wikimedia.org/wikipedia/commons/1/1e/Earth.png'), 'Earth.png');
assert.equal(core.commonsFile('https://upload.wikimedia.org/wikipedia/en/4/4a/Poster.jpg'), null, 'a file of one Wikipedia (often fair use) is never shown');
assert.equal(core.commonsFile('https://example.org/wikipedia/commons/a/ab/x.jpg'), null);
for (const ok of ['CC0', 'CC BY 4.0', 'CC BY-SA 2.0', 'CC BY-SA 3.0 igo', 'CC BY-SA 2.0 fr', 'Public domain', 'PD-USGov']) assert.ok(core.freeLicence(ok), ok);
for (const no of ['Fair use', 'CC BY-NC 2.0', 'CC BY-ND 4.0', 'All rights reserved', '', 'Non-free']) assert.ok(!core.freeLicence(no), no);
assert.equal(core.plainText('<a href="x">Jane &amp; Co</a>&#160;<b>x</b> &lt;y&gt;'), 'Jane & Co x <y>', 'white space, a no-break one too, is one space');
const credit = core.creditOf({ Artist: { value: '<a href="//x">NASA/JPL</a>' }, LicenseShortName: { value: 'Public domain' }, LicenseUrl: { value: 'http://example.org/pd' } });
assert.deepEqual(credit, { artist: 'NASA/JPL', licence: 'Public domain', licenceUrl: 'https://example.org/pd', free: true });
assert.equal(core.creditOf({ LicenseShortName: { value: 'CC BY 4.0' }, NonFree: { value: 'true' } }).free, false, 'NonFree wins over a licence name');

// --- the words
assert.equal(core.clipExtract('One two. Three four five six. Seven.', 12), 'One two.');
assert.equal(core.clipExtract('It is approx. 5 km wide. Then more words here.', 28), 'It is approx. 5 km wide.', 'an abbreviation is not the end of a sentence');
assert.equal(core.clipExtract('Short.', 600), 'Short.');
assert.match(core.clipExtract('a'.repeat(30) + ' ' + 'b'.repeat(30), 40), /…$/, 'a first sentence too long is cut at a word');
assert.deepEqual(core.sentencesOf('Hi there. It is approx. 5 km. 中文。好'), ['Hi there.', 'It is approx. 5 km.', '中文。', '好']);
assert.deepEqual(core.sentencesOf(''), []);
const parts = core.readingParts({ name: 'Mars', sentence: 'Mars is a planet. It is red.', why: null, wiki: { extract: 'Mars is the fourth planet.', lang: 'de' }, pageLang: 'en-GB' });
assert.deepEqual(parts, [{ text: 'Mars is a planet.', lang: 'en-GB' }, { text: 'It is red.', lang: 'en-GB' }, { text: 'Mars is the fourth planet.', lang: 'de' }],
  'the name is not said twice, and the quoted lead is read in its own language');
assert.deepEqual(core.readingParts({ name: 'X', sentence: 'A thing.', why: 'Ours.', wiki: { extract: 'Theirs.' } }).map((p) => p.text), ['X', 'A thing.', 'Ours.'], 'our own line is read, not the quote');

// --- the summary
const rest = {
  type: 'standard', title: 'North America Nebula', lang: 'en', dir: 'ltr', wikibase_item: 'Q265515',
  extract: 'The North America Nebula (NGC 7000 or Caldwell 20) is an emission nebula in the constellation Cygnus.',
  content_urls: { desktop: { page: 'https://en.wikipedia.org/wiki/North_America_Nebula?utm_source=x' } },
  thumbnail: { source: 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a8/NGC_7000_%2B_IC_5070.jpg/330px-NGC_7000_%2B_IC_5070.jpg' },
};
const s = core.summaryOf(rest);
assert.equal(s.title, 'North America Nebula');
assert.equal(s.url, 'https://en.wikipedia.org/wiki/North_America_Nebula');
assert.equal(s.qid, 'Q265515');
assert.equal(s.file, 'NGC_7000_+_IC_5070.jpg');
assert.equal(core.summaryOf({ ...rest, type: 'disambiguation' }), null, 'a disambiguation page is not an article about the thing');
assert.equal(core.summaryOf({ ...rest, extract: '' }), null);
assert.equal(core.langLinkOf({ query: { pages: [{ langlinks: [{ lang: 'de', title: 'Nordamerikanebel' }] }] } }), 'Nordamerikanebel');
assert.equal(core.langLinkOf({ query: { pages: [{ title: 'X' }] } }), null);

// --- the titles
const ngc = { id: 'dso-ngc7000', klass: 'dso', name: 'North America Nebula', meta: { designation: 'NGC 7000' } };
assert.equal(core.dsoTitle(ngc), 'NGC_7000');
assert.equal(core.dsoTitle({ klass: 'dso', meta: { messier: 31, designation: 'NGC 224' } }), 'Messier_31');
assert.equal(core.dsoTitle({ klass: 'dso', meta: { designation: 'IC 434' } }), 'IC_434');
assert.equal(core.dsoTitle({ klass: 'dso', meta: { designation: 'Barnard 33' } }), null);
assert.equal(core.dsoTitle({ klass: 'star', meta: { designation: 'NGC 1' } }), null);
assert.ok(core.mentions(rest.extract, ngc));
assert.ok(!core.mentions('Messier 31 is a galaxy.', { klass: 'dso', name: 'M3', meta: { messier: 3 } }), 'M3 is not found inside Messier 31');
assert.ok(!core.mentions('A galaxy far away.', ngc));
const starlink = { id: 'sat-44238', klass: 'satellite', name: 'STARLINK-1007', meta: {} };
assert.deepEqual(core.familyOf(starlink), { id: 'starlink', title: 'Starlink' });
assert.equal(core.familyOf({ klass: 'satellite', name: 'IRIDIUM 33 DEB' }), null, 'debris of an Iridium is not described as the fleet');
assert.equal(core.familyOf({ klass: 'star', name: 'STARLINK' }), null);
assert.equal(core.noradOf(starlink), 44238);
assert.equal(core.noradOf({ meta: { noradId: '25544' } }), 25544);
assert.equal(core.noradOf({ id: 'mars' }), null);

// --- the order articleFor looks in, with the network replaced
const calls = [];
const deps = (bakedBy = {}, liveBy = {}, links = {}, norad = {}) => ({
  baked: async (l) => (bakedBy[l] ? { built: '2026-11-07', cards: bakedBy[l] } : null),
  live: async (l, title, rec, need) => { calls.push([l, title, need]); return liveBy[`${l}:${title}`] || null; },
  langLink: async (title, l) => links[`${title}:${l}`] || null,
  norad: async () => norad,
});
const card = (t) => ({ t, u: `https://x/${t}`, x: `${t} words.` });
let got = await W.articleFor({ id: 'mars', klass: 'world', name: 'Mars' }, 'de', deps({ de: { mars: card('Mars (Planet)') } }));
assert.equal(got.card.t, 'Mars (Planet)'); assert.equal(got.lang, 'de'); assert.equal(got.baked, '2026-11-07'); assert.equal(got.fallback, false);
got = await W.articleFor({ id: 'mars', klass: 'world', name: 'Mars' }, 'hi', deps({ en: { mars: card('Mars') } }));
assert.equal(got.lang, 'en'); assert.equal(got.fallback, true, 'baked in English only: the card says it is the English one');
calls.length = 0;
got = await W.articleFor(ngc, 'en', deps({}, { 'en:NGC_7000': card('North America Nebula') }));
assert.deepEqual(calls, [['en', 'NGC_7000', true]], 'a title made from a designation must be named by its summary');
got = await W.articleFor(starlink, 'en', deps({}, { 'en:Starlink': card('Starlink') }));
assert.equal(got.family.id, 'starlink', 'Starlink-1007 has no article: the fleet\'s, and the card says so');
// A satellite outside the hand table (data/wikititles.js) is found by its NORAD number, then in the page's language.
got = await W.articleFor({ id: 'sat-27386', klass: 'satellite', name: 'ENVISAT' }, 'fr', deps({}, { 'fr:Envisat (satellite)': card('Envisat (satellite)') }, { 'Envisat:fr': 'Envisat (satellite)' }, { 27386: 'Envisat' }));
assert.equal(got.card.t, 'Envisat (satellite)'); assert.equal(got.lang, 'fr');
got = await W.articleFor({ id: 'sat-27386', klass: 'satellite', name: 'ENVISAT' }, 'fr', deps({}, { 'en:Envisat': card('Envisat') }, {}, { 27386: 'Envisat' }));
assert.equal(got.lang, 'en'); assert.equal(got.fallback, true, 'no French article: the English one, and the card says so');
got = await W.articleFor({ id: 'sat-99999', klass: 'satellite', name: 'OBJECT X' }, 'en', deps());
assert.equal(got, null, 'no article, no guess from the name');
// Our own words win: a hand-written line, or a registry photograph, and there is no block at all.
const own = { id: 'dso-north-america-nebula', klass: 'dso', name: 'North America Nebula', meta: { designation: 'NGC 7000', why: 'Shaped like the continent.' } };
assert.ok(W.hasOwnWords(own));
assert.equal(await W.articleFor(own, 'en', deps({ en: { 'dso-north-america-nebula': card('x') } })), null);
assert.ok(W.hasOwnWords({ id: 'm87', klass: 'exotic', meta: { image: { file: 'site/images/m87.jpg' } } }));
assert.ok(!W.hasOwnWords(starlink));

// --- the baked files
const DIR = join(ROOT, 'site/data/wikicards');
const files = readdirSync(DIR).filter((f) => f.endsWith('.json'));
for (const lang of Object.keys(core.WIKI_LANGS)) assert.ok(files.includes(`${lang}.json`), `site/data/wikicards/${lang}.json`);
for (const f of files) {
  const raw = readFileSync(join(DIR, f), 'utf8');
  assert.ok(raw.length < 200_000, `${f} stays small (${raw.length} B)`);
  assert.ok(!/utm_/.test(raw), `${f}: no campaign tags`);
  const d = JSON.parse(raw);
  assert.equal(d.schema, 1);
  assert.match(String(d.built), /^\d{4}-\d{2}-\d{2}$/);
  assert.ok(d.licence || d.source, `${f} says where it is from`);
  if (f === 'norad.json') { assert.ok(Object.keys(d.titles).length > 1000); assert.equal(d.licence, 'CC0 1.0 (Wikidata)'); continue; }
  for (const [id, c] of Object.entries(d.cards)) {
    assert.ok(c.t && c.u && c.x, `${f} ${id}: title, address and words`);
    assert.ok(c.x.length <= 600, `${f} ${id}: at most 600 characters`);
    assert.match(c.u, /^https:\/\/[a-z]+\.wikipedia\.org\/wiki\//, `${f} ${id}: an article`);
    if (c.i) {
      assert.ok(core.freeLicence(c.i.licence), `${f} ${id}: a free licence (${c.i.licence})`);
      assert.ok(core.commonsFile(c.i.src), `${f} ${id}: a Commons picture`);
      assert.match(c.i.page, /^https:\/\/commons\.wikimedia\.org\/wiki\/File:/);
    }
  }
}
const en = JSON.parse(readFileSync(join(DIR, 'en.json'), 'utf8'));
assert.ok(en.cards['sat-25544'], 'the station is baked');
assert.ok(!en.cards['dso-north-america-nebula'], 'a card with our own words is not baked');

// --- the baker's selection
const list = bakeList([
  { id: 'a', klass: 'world', why: null, image: null, sameAs: 'https://en.wikipedia.org/wiki/Io_(moon)' },
  { id: 'b', klass: 'star', why: 'Ours.', image: null, sameAs: 'https://en.wikipedia.org/wiki/Sirius' },
  { id: 'c', klass: 'satellite', why: 'A NOTABLE line the card does not print.', image: null, sameAs: 'https://en.wikipedia.org/wiki/Hubble_Space_Telescope' },
  { id: 'd', klass: 'exotic', why: null, image: { file: 'x' }, sameAs: 'https://en.wikipedia.org/wiki/M87' },
  { id: 'e', klass: 'site', why: null, image: null, sameAs: null },
]);
assert.deepEqual(list.map((r) => [r.id, r.title]), [['a', 'Io_(moon)'], ['c', 'Hubble_Space_Telescope']]);

// --- the words, in every language
for (const k of ['label', 'quotedLive', 'quotedBaked', 'textCredit', 'readArticle', 'inEnglish', 'family', 'photo', 'photoNoArtist', 'photoAlt', 'loading', 'read', 'readTitle', 'stop', 'reading']) {
  assert.ok(typeof COPY.wikiCard[k] === 'string' && COPY.wikiCard[k], `COPY.wikiCard.${k}`);
}
for (const lang of Object.keys(core.WIKI_LANGS).filter((l) => l !== 'en')) {
  const src = readFileSync(join(ROOT, `site/js/copy/${lang}.js`), 'utf8');
  const block = src.slice(src.indexOf('// b200-f4-cards: begin'), src.indexOf('// b200-f4-cards: end'));
  assert.ok(block.includes('"wikiCard"'), `${lang}: the card's Wikipedia words`);
  for (const slot of ['{date}', '{fleet}', '{artist}', '{licence}', '{title}']) assert.ok(block.includes(slot), `${lang}: ${slot}`);
  assert.ok((block.match(/Wikimedia Commons/g) || []).length >= 2, `${lang}: "Wikimedia Commons" kept as a name, so the caption can link it`);
}

// --- the sources page says what the browser asks, and when
const seo = readFileSync(join(ROOT, 'scripts/seo_pages.py'), 'utf8');
assert.match(seo, /Asked by your browser when you open a card/);
assert.match(seo, /no cookie in either direction and no referrer/);

console.log('test_wikicard: ok');
