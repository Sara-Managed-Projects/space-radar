#!/usr/bin/env node
// scripts/build-wikicards.mjs -- bake the Wikipedia block of the cards people open most (forge #151).
//
//   node scripts/build-wikicards.mjs                 fetch and write site/data/wikicards/{<lang>,norad}.json
//   node scripts/build-wikicards.mjs --dry           fetch, print the counts, write nothing
//   node scripts/build-wikicards.mjs --only=en,de    only these languages (the NORAD table is written either way)
//   node scripts/build-wikicards.mjs --help
//
// WHAT IT BAKES. "Most viewed" is not a number we have: Space Radar counts no visits (#104 waits for that). The nearest
// honest list is the objects with a page of their own, which is a rule and not a hand list (scripts/object_pages.mjs:
// the worlds, the famous stars and deep-sky objects, the craft, the stations and the satellites worth knowing, about
// 310). Of those, the ones whose card has no hand-written words (no `why` the card prints, no registry photograph) and
// that name their English article (`sameAs`) get a baked card in each of the app's eleven languages where Wikipedia has
// the article. Every other card asks Wikipedia itself when it is opened (ui/wikicard.js).
//
// AND ONE TABLE FOR EVERY SATELLITE: Wikidata's items with a satellite catalog number (P377) and an English article,
// as {NORAD number: English title}. It is how a card of one of the 17 000 satellites finds its article without a name
// guess. Wikidata is CC0.
//
// WHAT EACH CARD KEEPS: the article's title and address, its lead in whole sentences (at most 600 characters), its
// Wikidata item, and its lead picture only when the picture is a Commons file under a free licence, with the artist and
// licence Commons gives. The picture itself is not copied: the card loads Commons' 640 px copy when it is opened.
//
// Politeness: one request at a time per host family, a User-Agent that names the project and where to reach it (the
// Wikimedia API rules ask for it), and no personal name anywhere. About 1 300 requests; a few minutes.

import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'site/data/wikicards');
const core = await import(join(ROOT, 'site/js/ui/wikicardcore.js'));

const HELP = `usage: node scripts/build-wikicards.mjs [--dry] [--only=en,de,...]
Bakes site/data/wikicards/<lang>.json (the Wikipedia lead and Commons photo of the cards with a page of their own and
no hand-written words) and site/data/wikicards/norad.json (Wikidata P377: NORAD number -> English article).`;
if (process.argv.includes('--help') || process.argv.includes('-h')) { console.log(HELP); process.exit(0); }
const DRY = process.argv.includes('--dry');
const onlyArg = (process.argv.find((a) => a.startsWith('--only=')) || '').slice(7);
const LANGS = onlyArg ? onlyArg.split(',').map((s) => s.trim()).filter((l) => core.WIKI_LANGS[l]) : Object.keys(core.WIKI_LANGS);

const UA = 'SpaceRadar-build/2.0 (https://github.com/Sara-Managed-Projects/space-radar)';
const today = new Date().toISOString().slice(0, 10);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, tries = 3) {
  for (let i = 0; i < tries; i += 1) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': UA, Accept: 'application/json' } });
      if (r.status === 404) return null;
      if (r.status === 429 || r.status >= 500) { await sleep(2000 * (i + 1)); continue; }
      if (!r.ok) return null;
      return await r.json();
    } catch { await sleep(1000 * (i + 1)); }
  }
  return null;
}

// --- which cards ---------------------------------------------------------------------------------------------------

/** Pure: the pages to bake from scripts/object_pages.mjs's output. Exported for tests/test_wikicard.mjs. */
export function bakeList(pages) {
  const out = [];
  for (const p of pages || []) {
    // The card prints `why` for stars, exotics and deep-sky objects and `note` for craft (ui/cardfacts.js whyLine);
    // object_pages.mjs adds a satellite's NOTABLE line to `why` for its own page, which the card does not print.
    const printed = p.why && !['satellite', 'station', 'debris'].includes(p.klass);
    if (printed || p.image || !p.sameAs) continue;
    const m = /^https:\/\/en\.wikipedia\.org\/wiki\/(.+)$/.exec(String(p.sameAs));
    if (!m) continue;
    let title = m[1];
    try { title = decodeURIComponent(title); } catch { /* as is */ }
    out.push({ id: p.id, klass: p.klass, title });
  }
  return out;
}

const commons = new Map(); // file -> credit | null
async function pictureOf(file) {
  if (!file) return null;
  if (!commons.has(file)) {
    const d = await getJson(core.commonsInfoUrl(file));
    const page = d && d.query && Array.isArray(d.query.pages) ? d.query.pages[0] : null;
    const info = page && Array.isArray(page.imageinfo) ? page.imageinfo[0] : null;
    const credit = info ? core.creditOf(info.extmetadata) : null;
    commons.set(file, credit && credit.free && info.thumburl ? {
      src: core.cleanUrl(info.thumburl), w: info.thumbwidth || null, h: info.thumbheight || null,
      page: core.cleanUrl(info.descriptionurl), artist: credit.artist, licence: credit.licence, licenceUrl: credit.licenceUrl,
    } : null);
  }
  return commons.get(file);
}

async function cardIn(lang, title) {
  const s = core.summaryOf(await getJson(core.restSummaryUrl(lang, title)));
  if (!s) return null;
  const img = await pictureOf(s.file);
  const card = { t: s.title, u: s.url, x: s.extract };
  if (s.qid) card.q = s.qid;
  if (s.dir === 'rtl') card.d = 'rtl';
  if (img) card.i = img;
  return card;
}

async function norads() {
  const q = 'SELECT ?n ?t WHERE { ?i wdt:P377 ?n . ?a schema:about ?i; schema:isPartOf <https://en.wikipedia.org/>; schema:name ?t }';
  const d = await getJson(`https://query.wikidata.org/sparql?format=json&query=${encodeURIComponent(q)}`);
  const rows = d && d.results && Array.isArray(d.results.bindings) ? d.results.bindings : [];
  const out = {};
  for (const b of rows) {
    const n = Number(String(b.n && b.n.value || '').trim());
    const t = String(b.t && b.t.value || '').trim();
    // One number, one article: where two items claim a number (a satellite and its mission), the shorter title wins
    // and is usually the craft's own.
    if (Number.isInteger(n) && n > 0 && t && (!out[n] || t.length < out[n].length)) out[n] = t;
  }
  return out;
}

async function main() {
  const pages = JSON.parse(execFileSync(process.execPath, [join(ROOT, 'scripts/object_pages.mjs')], { encoding: 'utf8', maxBuffer: 64 << 20 })).pages;
  const list = bakeList(pages);
  console.error(`${list.length} cards to bake, from ${pages.length} object pages`);
  const head = (lang) => ({
    schema: 1,
    lang,
    built: today,
    builtBy: 'scripts/build-wikicards.mjs',
    source: `https://${lang}.wikipedia.org/api/rest_v1/page/summary/ (the lead), Wikimedia Commons extmetadata (the picture's credit)`,
    licence: 'Text: Wikipedia contributors, CC BY-SA 4.0. Pictures: each as its Commons page says, free licences only.',
  });
  const english = {};
  for (const row of list) {
    const c = await cardIn('en', row.title);
    if (c) english[row.id] = c;
  }
  const files = { en: { ...head('en'), cards: english } };
  for (const lang of LANGS.filter((l) => l !== 'en')) {
    const cards = {};
    for (const [id, c] of Object.entries(english)) {
      const there = core.langLinkOf(await getJson(core.langLinksUrl(c.t, lang)));
      if (!there) continue;
      const card = await cardIn(lang, there);
      if (card) cards[id] = card;
    }
    files[lang] = { ...head(lang), cards };
    console.error(`${lang}: ${Object.keys(cards).length}`);
  }
  const sats = await norads();
  console.error(`en: ${Object.keys(english).length}; NORAD numbers with an English article: ${Object.keys(sats).length}`);
  if (DRY) return;
  mkdirSync(OUT, { recursive: true });
  for (const [lang, body] of Object.entries(files)) {
    if (!LANGS.includes(lang)) continue;
    writeFileSync(join(OUT, `${lang}.json`), JSON.stringify(body));
  }
  if (Object.keys(sats).length) {
    writeFileSync(join(OUT, 'norad.json'), JSON.stringify({
      schema: 1, built: today, builtBy: 'scripts/build-wikicards.mjs',
      source: 'Wikidata query service: items with P377 (satellite catalog number) and an English Wikipedia article',
      licence: 'CC0 1.0 (Wikidata)', titles: sats,
    }));
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
