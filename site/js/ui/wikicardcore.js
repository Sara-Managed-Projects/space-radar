// ui/wikicardcore.js -- the Wikipedia block of a card: which article, which words, which photograph (forge #151).
//
// Contract, all pure (ui/wikicard.js draws with them, scripts/build-wikicards.mjs bakes with them, and
// tests/test_wikicard.mjs holds them):
//   WIKI_LANGS                        the app's languages (copy/lang.js) as Wikipedia's subdomains
//   wikiLang(appLang)                 -> the Wikipedia to ask first, 'en' for anything unknown
//   restSummaryUrl(lang, title), langLinksUrl(title, lang), commonsInfoUrl(file)   the three addresses, no cookies needed
//   summaryOf(rest)                   a REST page summary -> {title, url, extract, qid, image} | null (a plain article only)
//   clipExtract(text, max)            whole sentences, at most `max` characters
//   plainText(html)                   Commons' credit fields are HTML: the words, no markup
//   commonsFile(url)                  the File: name of a Wikimedia Commons picture, or null for anything else
//   cleanUrl(url)                     the address without the utm_* parameters the API adds
//   photoFile(file)                   is it a picture of the thing, not a logo, an emblem, a chart or a drawing (SVG)
//   creditOf(extmetadata)             -> {artist, licence, licenceUrl, free}: Commons' own fields
//   freeLicence(shortName)            CC0, public domain, CC BY, CC BY-SA: the licences a card may show
//   dsoTitle(record)                  "NGC_7000", "Messier_31", "IC_434" from the catalogue designation, or null
//   familyOf(record)                  -> {id, title} for a satellite of a named fleet (data/clouds.js CONSTELLATIONS), or null
//   mentions(extract, record)         does a summary found by designation name the thing (the guard on dsoTitle)
//   langLinkOf(json)                  the title in the other language from a langlinks answer, or null
//   noradOf(record)                   a satellite's NORAD number, or null
//   sentencesOf(text)                 the text in sentences, the unit Read aloud speaks and captions
//   readingParts(words)               -> [{text, lang}]: what Read aloud says, in order, each in the language it is written in
//
// WHERE AN ARTICLE COMES FROM, in this order (ui/wikicard.js articleFor):
//   1. the baked cards, site/data/wikicards/<lang>.json, written by scripts/build-wikicards.mjs for the objects that have
//      a page of their own (scripts/object_pages.mjs: the ones people find and share) and no hand-written words;
//   2. the hand table and the record's own source lines (data/wikititles.js wikiTitleOf);
//   3. a deep-sky object's designation (NGC, IC, Messier), kept only when the summary names it (mentions);
//   4. a satellite's NORAD number, through Wikidata's "satellite catalog number" (P377), baked into
//      site/data/wikicards/norad.json;
//   5. the fleet's article for a satellite that has none of its own (Starlink-1007 has no article; Starlink has), and the
//      card says that the words are about the fleet.
// None of these is a guess from the name: "Juno" is a goddess and "Swift" a bird (data/wikititles.js).
//
// WHY ONLY FREE PICTURES FROM COMMONS. An English article's lead image can be a local "non-free" file used under fair use,
// which Wikipedia may show and we may not. So a photograph is shown only when it is a Commons file whose own description
// page gives a free licence, and the credit and licence it gives are printed with it, as CC BY and CC BY-SA ask.

import { CONSTELLATIONS, recordInConstellation } from '../data/clouds.js';

/** The app's languages (copy/lang.js LANGUAGES) and the Wikipedia that speaks each. They are the same codes today. */
export const WIKI_LANGS = { en: 'en', es: 'es', fr: 'fr', de: 'de', pt: 'pt', ru: 'ru', uk: 'uk', zh: 'zh', hi: 'hi', he: 'he', ar: 'ar' };

export function wikiLang(appLang) {
  const k = String(appLang || '').toLowerCase().split(/[-_]/)[0];
  return Object.prototype.hasOwnProperty.call(WIKI_LANGS, k) ? WIKI_LANGS[k] : 'en';
}

const enc = (title) => encodeURIComponent(String(title || '').replace(/ /g, '_'));

/** The REST page summary. It follows redirects itself ("NGC_7000" answers with the North America Nebula). */
export function restSummaryUrl(lang, title) {
  return `https://${wikiLang(lang)}.wikipedia.org/api/rest_v1/page/summary/${enc(title)}`;
}

/** The English article's title in another language, from the action API (`origin=*`: an anonymous CORS read). */
export function langLinksUrl(title, lang) {
  return `https://en.wikipedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&redirects=1&prop=langlinks&lllang=${wikiLang(lang)}&titles=${enc(title)}`;
}

/** A Commons file's credit, licence and a 640 px copy. */
export function commonsInfoUrl(file) {
  const fields = 'LicenseShortName|LicenseUrl|Artist|Credit|AttributionRequired|NonFree';
  return `https://commons.wikimedia.org/w/api.php?action=query&format=json&formatversion=2&origin=*&prop=imageinfo&iiprop=url|extmetadata&iiurlwidth=640&iiextmetadatafilter=${fields}&titles=${encodeURIComponent(`File:${file}`)}`;
}

/** The address without the utm_* parameters Wikimedia's APIs append: they are a campaign tag, and we add none. */
export function cleanUrl(url) {
  const s = String(url || '');
  if (!s) return '';
  const [head, query = ''] = s.split('?');
  const kept = query.split('&').filter((p) => p && !/^utm_/i.test(p));
  return kept.length ? `${head}?${kept.join('&')}` : head;
}

/**
 * The File: name of a picture kept on Wikimedia Commons, from an upload.wikimedia.org or thumb.wikimedia.org address, or
 * null: a file under /wikipedia/en/ is the English Wikipedia's own, often non-free, and is never shown.
 */
export function commonsFile(url) {
  const m = /^https:\/\/(?:upload|thumb)\.wikimedia\.org\/wikipedia\/commons\/(?:thumb\/)?[0-9a-f]\/[0-9a-f]{2}\/([^/?#]+)/.exec(String(url || ''));
  if (!m) return null;
  try { return decodeURIComponent(m[1]); } catch { return m[1]; }
}

/**
 * Is a Commons file a picture of the thing? An article's lead image is often its subject's logo, emblem or mission badge
 * (Starlink, TESS, the ISS), or a drawn star chart: drawings are SVG files, and the rest say what they are in their name.
 * A logo is also a trademark, and black on a transparent ground it is a black blot on the card's dark glass.
 */
export function photoFile(file) {
  const f = String(file || '');
  return !!f && !/\.svg$/i.test(f) && !/logo|wordmark|emblem|insignia|coat[ _]of[ _]arms|flag[ _]of|seal[ _]of/i.test(f);
}

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: '\u00a0', '#39': "'" };

/** The words of an HTML fragment: tags dropped, the common entities read, white space joined. Never markup. */
export function plainText(html) {
  return String(html == null ? '' : html)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[0-9a-f]+|#\d+|[a-z0-9]+);/gi, (all, e) => {
      const k = e.toLowerCase();
      if (k.startsWith('#x')) return String.fromCodePoint(parseInt(k.slice(2), 16));
      if (k.startsWith('#') && k !== '#39') return String.fromCodePoint(Number(k.slice(1)));
      return Object.prototype.hasOwnProperty.call(ENTITIES, k) ? ENTITIES[k] : all;
    })
    .replace(/\s+/g, ' ')
    .trim();
}

/** The licences a card may show a picture under: public domain, CC0, CC BY and CC BY-SA in any version. */
export function freeLicence(shortName) {
  const s = String(shortName || '').trim();
  if (!s || /fair use|non-?free/i.test(s)) return false;
  return /^(cc0|cc[ -]by(?:[ -]sa)?(?:[ -]\d(?:\.\d)?)?(?:\s|$)|public domain|pd\b|pd-)/i.test(s);
}

/** Commons' own credit fields for a file (`extmetadata`): who made it and under what licence. */
export function creditOf(ext) {
  const v = (k) => (ext && ext[k] && ext[k].value != null ? String(ext[k].value) : '');
  const licence = plainText(v('LicenseShortName'));
  const artist = plainText(v('Artist')) || plainText(v('Credit'));
  const licenceUrl = cleanUrl(v('LicenseUrl').replace(/^http:/, 'https:'));
  const nonFree = /^true$/i.test(v('NonFree'));
  return { artist: artist.slice(0, 160), licence, licenceUrl, free: !nonFree && freeLicence(licence) };
}

// A full stop after these is not the end of a sentence ("St. Petersburg", "approx. 5 km", "ca. 1900", "Jr.", an initial).
const ABBREV = /(?:\b(?:St|Mt|Dr|Mr|Mrs|Ms|Jr|Sr|No|approx|ca|e\.g|i\.e|vs|etc|al|Fig|Vol|U\.S)|\b[A-Z])$/;

/** Whole sentences of `text`, at most `max` characters; a first sentence longer than that is cut at a word with an ellipsis. */
export function clipExtract(text, max = 600) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  let best = 0;
  const re = /[.!?\u3002\u0964\u061f](?=\s|$)|[\u3002\uff01\uff1f]/g;
  let m;
  while ((m = re.exec(s)) && m.index < max) {
    if (s[m.index] === '.' && ABBREV.test(s.slice(0, m.index))) continue;
    best = m.index + 1;
  }
  if (best > 0) return s.slice(0, best).trim();
  const cut = s.slice(0, max - 1);
  const space = cut.lastIndexOf(' ');
  return `${(space > max / 2 ? cut.slice(0, space) : cut).trimEnd()}\u2026`;
}

/**
 * A REST page summary as the card uses it, or null: a disambiguation page, a missing page or one with no words is not an
 * article about the thing. The picture is kept only as a Commons file name and a size here; its credit comes from Commons.
 */
export function summaryOf(rest, max = 600) {
  if (!rest || rest.type !== 'standard' || !rest.extract) return null;
  const title = String(rest.title || (rest.titles && rest.titles.canonical) || '').trim();
  if (!title) return null;
  const page = rest.content_urls && rest.content_urls.desktop && rest.content_urls.desktop.page;
  const lang = /^[a-z-]+$/.test(String(rest.lang || '')) ? rest.lang : 'en';
  const pic = rest.thumbnail || rest.originalimage || null;
  const found = pic ? commonsFile(pic.source) : null;
  const file = photoFile(found) ? found : null;
  return {
    title,
    url: cleanUrl(page || `https://${lang}.wikipedia.org/wiki/${enc(title)}`),
    extract: clipExtract(rest.extract, max),
    qid: /^Q\d+$/.test(String(rest.wikibase_item || '')) ? rest.wikibase_item : null,
    lang,
    dir: rest.dir === 'rtl' ? 'rtl' : 'ltr',
    file,
  };
}

/** The title in the asked language from a langlinks answer (formatversion=2), or null when there is no such article. */
export function langLinkOf(json) {
  const pages = json && json.query && Array.isArray(json.query.pages) ? json.query.pages : [];
  for (const p of pages) {
    const l = Array.isArray(p.langlinks) ? p.langlinks[0] : null;
    if (l && l.title) return String(l.title);
  }
  return null;
}

/**
 * The article for a deep-sky object, from its catalogue designation: Messier 31, NGC 7000, IC 434. Wikipedia keeps each
 * as an article or a redirect to the named one, and mentions() checks that the summary that comes back names it.
 */
export function dsoTitle(record) {
  if (!record || record.klass !== 'dso') return null;
  const md = record.meta || {};
  if (Number.isInteger(md.messier) && md.messier > 0) return `Messier_${md.messier}`;
  const m = /^(NGC|IC)\s*(\d{1,4})$/i.exec(String(md.designation || '').trim());
  return m ? `${m[1].toUpperCase()}_${Number(m[2])}` : null;
}

const squash = (s) => String(s || '').toLowerCase().replace(/[\s\u00a0\u202f_-]+/g, '');

/** Does a summary name the record, by its designation, its Messier number or its name? */
export function mentions(extract, record) {
  const text = squash(extract);
  if (!text || !record) return false;
  const md = record.meta || {};
  const names = [md.designation, md.messier ? `M${md.messier}` : null, md.messier ? `Messier ${md.messier}` : null, md.common, record.name];
  return names.some((n) => {
    const k = squash(n);
    if (k.length < 2) return false;
    // "M3" must not be found inside "M31": the next character after a short designation is not a digit.
    const at = text.indexOf(k);
    return at >= 0 && !/\d/.test(text[at + k.length] || '') && (/\d$/.test(k) ? !/\d/.test(text[at - 1] || '') : true);
  });
}

/** The fleets a satellite of no article of its own is described by, read on the REST summary on 2026-11-07. */
export const FAMILY_TITLES = {
  starlink: 'Starlink',
  oneweb: 'Eutelsat_OneWeb',
  kuiper: 'Amazon_Leo',
  qianfan: 'Qianfan',
  gps: 'Global_Positioning_System',
  glonass: 'GLONASS',
  galileo: 'Galileo_(satellite_navigation)',
  beidou: 'BeiDou',
  iridium: 'Iridium_satellite_constellation',
};

/** The fleet a satellite belongs to, by the name its operator gives it, and the fleet's article. */
export function familyOf(record) {
  if (!record || !['satellite', 'station', 'debris'].includes(String(record.klass || ''))) return null;
  for (const c of CONSTELLATIONS) {
    if (FAMILY_TITLES[c.id] && recordInConstellation(record, c)) return { id: c.id, title: FAMILY_TITLES[c.id] };
  }
  return null;
}

/** A satellite's NORAD number from its record (`sat-<n>` or meta.noradId), or null. */
export function noradOf(record) {
  if (!record) return null;
  const md = record.meta || {};
  const n = md.noradId != null ? Number(md.noradId) : record.norad != null ? Number(record.norad) : Number((/^sat-(\d+)$/.exec(String(record.id || '')) || [])[1]);
  return Number.isInteger(n) && n > 0 ? n : null;
}

/** The text in sentences: Read aloud speaks one at a time, so the caption under the button can show the one being said. */
export function sentencesOf(text) {
  const s = String(text || '').replace(/\s+/g, ' ').trim();
  if (!s) return [];
  const out = [];
  let from = 0;
  const re = /[.!?\u3002\u0964\u061f](?=\s|$)|[\u3002\uff01\uff1f]/g;
  let m;
  while ((m = re.exec(s))) {
    if (s[m.index] === '.' && ABBREV.test(s.slice(0, m.index))) continue;
    const one = s.slice(from, m.index + 1).trim();
    if (one) out.push(one);
    from = m.index + 1;
  }
  const rest = s.slice(from).trim();
  if (rest) out.push(rest);
  return out;
}

/**
 * What Read aloud says: the name, the card's first sentence and its hand-written line in the page's language, then the
 * Wikipedia lead in the language it was written in (the English one, when the page's language has no article). Each
 * part is a sentence, so a voice for that language can be chosen and the caption can follow.
 */
export function readingParts({ name, sentence, why, wiki, pageLang } = {}) {
  const lang = String(pageLang || 'en');
  const parts = [];
  const add = (text, l) => { for (const one of sentencesOf(text)) parts.push({ text: one, lang: l }); };
  const said = String(sentence || '');
  if (name && !said.includes(String(name))) add(String(name), lang);
  add(said, lang);
  if (why) add(why, lang);
  else if (wiki && wiki.extract) add(wiki.extract, wiki.lang || 'en');
  return parts;
}
