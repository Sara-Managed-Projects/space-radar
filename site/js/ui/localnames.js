// ui/localnames.js -- the names of things in the page's language: search, card titles, labels and lists (internal #310).
//
// Contract: installLocalNames(ctx, opts?) -> Promise<number>   how many records took a name; 0 in English
// Also exported, pure, for tests/test_local_names.mjs:
//   bareName(name, lang)                 a name without its leading article: "la Luna" is "Luna"
//   applyNames(records, names, lang)     give each record its name in the language; returns how many it changed
//
// WHY (review of 16 Nov 2026). The app's words are in eleven languages, and the names of the things on the map were
// in one: in the Spanish app "Luna" found three Soviet landers, "Marte" and "Sol" found nothing, the Moon's card was
// titled "The Moon" and every layer name stayed English (the layers' names are copy's, COPY.controls.layerName, put
// over each layer's `display` by main.js before any panel is built). The objects' names existed already, translated for the pages a search
// engine reads (registry/seo-i18n/<code>/names.json): scripts/gen_names_i18n.py writes them as one small file per
// language, site/data/names/<code>.json, and this module fetches the one file of the page's language.
//
// NOT AT BOOT, NOT IN ENGLISH. main.js imports this only when the page speaks another language, after the first view
// has landed; an English visit fetches none of it (tests/test_boot_diet.mjs holds the module out of the boot graph).
// Until it lands the names are English, as they were; when it lands the search index is built again (`sr:names`).
//
// WHAT A RECORD GETS. `meta.displayName`, the name its card, its label and its search row are drawn with
// (ui/cardfacts.js displayName, ui/labels.js labelName), `meta.localName`, the same without a leading article, which
// the search index takes as the record's first name (ui/search.js buildIndex), and the English name among
// `meta.aliases`, so "moon" still finds "la Luna" and a link by the English name still opens it. `record.name` and
// `record.id` are never touched: they are the catalogue's, and every link, trip and rule reads them.
// A name the file does not have stays English: nothing is translated here.
import { LANG } from '../copy/lang.js';
import { labelName } from './labels.js';

/** A language's articles, as its names carry them in the catalogs ("la Luna", "el Sol", "le Soleil", "die Sonne", "o Sol"). */
export const ARTICLES = {
  es: ['el', 'la', 'los', 'las'],
  fr: ['le', 'la', 'les', "l'", 'l’'],
  de: ['der', 'die', 'das'],
  pt: ['o', 'a', 'os', 'as'],
  en: ['the'],
};

/** A name without its leading article. Pure. */
export function bareName(name, lang) {
  const text = String(name || '').trim();
  for (const a of ARTICLES[lang] || []) {
    const glued = a.endsWith("'") || a.endsWith('’');
    const head = text.slice(0, a.length + (glued ? 0 : 1)).toLowerCase();
    if (head === (glued ? a : `${a} `) && text.length > head.length) return text.slice(head.length).trim();
  }
  return text;
}

const capFirst = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);

/**
 * Give each record its name in the language. `names` is `{ "<English name>": "<name>" }` (site/data/names/<code>.json).
 * A record is asked for by the name its card shows (the International Space Station, not ISS (ZARYA)), then by the
 * catalogue's own. Already-named records are left alone, so this can run again as layers arrive. Pure on its inputs.
 */
export function applyNames(records, names, lang) {
  if (!names || !Array.isArray(records)) return 0;
  const has = (k) => typeof k === 'string' && k && Object.prototype.hasOwnProperty.call(names, k);
  let n = 0;
  for (const record of records) {
    if (!record || (record.meta && record.meta.localName)) continue;
    let shown = '';
    try { shown = labelName(record); } catch { shown = ''; }
    const english = has(shown) ? shown : has(record.name) ? record.name : '';
    if (!english) continue;
    const local = String(names[english]).trim();
    if (!local) continue;
    const meta = record.meta || (record.meta = {});
    const aliases = Array.isArray(meta.aliases) ? meta.aliases : (meta.aliases = []);
    for (const other of [english, record.name, local]) if (other && !aliases.includes(other)) aliases.push(other);
    meta.englishName = english;
    meta.localName = bareName(local, lang);
    meta.displayName = capFirst(local);
    n += 1;
  }
  return n;
}

/** Where the names file of a language lives. */
export const namesUrl = (lang) => new URL(`../../data/names/${lang}.json`, import.meta.url).href;

/**
 * Fetch the page language's names and keep the records named as layers arrive. Never rejects: with no file the names
 * stay English. `opts`: { lang, fetchImpl } for tests.
 */
export async function installLocalNames(ctx, opts = {}) {
  const lang = opts.lang || LANG;
  if (lang === 'en' || !ctx) return 0;
  const doFetch = opts.fetchImpl || (typeof fetch === 'function' ? fetch : null);
  if (!doFetch) return 0;
  let names = null;
  try {
    const res = await doFetch(namesUrl(lang));
    if (res.ok) names = (await res.json()).names || null;
  } catch (err) {
    console.warn(`The ${lang} names did not load; names stay in English.`, err && err.message);
  }
  if (!names) return 0;
  const all = () => { try { return typeof ctx.records === 'function' ? ctx.records() : []; } catch { return []; } };
  const run = () => {
    const n = applyNames(all(), names, lang);
    if (n && typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('sr:names', { detail: { lang, count: n } }));
    return n;
  };
  if (typeof window !== 'undefined') {
    // Layers land over several seconds, and the far catalogues later still: each arrival is named.
    let timer = 0;
    const later = () => { clearTimeout(timer); timer = setTimeout(run, 400); };
    window.addEventListener('sr:layer', later);
    window.addEventListener('sr:later-layers', later);
  }
  return run();
}
