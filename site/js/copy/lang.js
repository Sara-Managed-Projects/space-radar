// copy/lang.js -- which language the page speaks (public #524, spec 0077 W1-e). In the boot graph, so it
// is small: it only DECIDES. The words of another language are copy/<code>.js, fetched by
// copy/index.js when this says anything but English; a first visit in English fetches nothing more.
// HOW THE WORDS ARRIVE (no top-level await: scripts/minify_site.py compiles for es2020, which has none).
// index.html's own module asks copy/index.js to `prepare()` BEFORE it imports main.js: that fetches the
// language file and sets HOOK.localise. Then main.js's graph evaluates, and copy/en.js (and en.later.js,
// en.facts.js) end by calling HOOK.localise, which puts the words over the English in place -- before any
// module that imports them has run. Where nothing prepared (English, a lab page, a test) HOOK is empty.
//
// THE ORDER. `?lang=<code>` first (a regional form is read by its first part: es-MX is es). Else the
// browser's own list (navigator.languages), but only a language marked `reviewed`: docs/TRANSLATING.md
// ("Review") says a text is not offered to everyone until a second native speaker has read it, so a
// machine-drafted language is reached by ?lang= alone. Else English. `?lang=en` forces English.
// An unknown code is English too: a wrong address never breaks the page.
// The list below is where a language is registered (0077 anchor: languages).
export const LANGUAGES = {
  en: { locale: 'en-GB', pill: 'en-US', reviewed: true },
  // 0077 W1-e: begin
  es: { locale: 'es-ES', pill: 'es-ES', reviewed: false }, // machine-drafted: flip `reviewed` when a native speaker has read copy/es.js
  // 0077 W1-e: end
  // 0077 W2-f: begin
  fr: { locale: 'fr-FR', pill: 'fr-FR', reviewed: false }, // machine-drafted
  de: { locale: 'de-DE', pill: 'de-DE', reviewed: false }, // machine-drafted
  pt: { locale: 'pt-BR', pill: 'pt-BR', reviewed: false }, // Brazil; ?lang=pt-BR is read as pt
  // 0077 W2-f: end
  // 1.6.3 (public #529 to #534): machine-drafted, hidden: reached by ?lang= alone (reviewed stays false until a native reader signs off) and
  // listed by no picker. zh is Simplified (the maintainer has not chosen yet); `tag` is what <html lang> says when it is not the code. For Traditional
  // add `'zh-Hant': { locale: 'zh-TW', pill: 'zh-TW', tag: 'zh-Hant', reviewed: false }` and a copy/zh-Hant.js: pickLanguage already reads
  // zh-TW, zh-HK, zh-MO and zh-Hant as that entry once it exists, and zh-CN, zh-SG and zh-Hans as zh.
  // 1.6.3: begin
  ru: { locale: 'ru-RU', pill: 'ru-RU', reviewed: false },
  uk: { locale: 'uk-UA', pill: 'uk-UA', reviewed: false },
  zh: { locale: 'zh-CN', pill: 'zh-CN', tag: 'zh-Hans', reviewed: false },
  hi: { locale: 'hi-IN', pill: 'hi-IN', reviewed: false },
  he: { locale: 'he-IL', pill: 'he-IL', reviewed: false }, // right to left: <html dir="rtl"> and css/rtl.css
  ar: { locale: 'ar-u-nu-latn', pill: 'ar-u-nu-latn', reviewed: false }, // right to left; Latin digits, as the app's numbers are
  // 1.6.3: end
};
const RTL = ['he', 'ar'];
const TRADITIONAL = ['hant', 'tw', 'hk', 'mo']; // the second part of zh-Hant, zh-TW, zh-HK, zh-MO

/** Filled by copy/index.js `prepare()` with { localise(target, keys) }. Empty in English. */
export const HOOK = {};

const base = (tag, languages) => {
  const [first, second] = String(tag || '').toLowerCase().split(/[-_]/);
  // 1.6.3: Chinese in the traditional script is its own file once one is registered; until then zh-TW is read as zh.
  return first === 'zh' && TRADITIONAL.includes(second) && languages && Object.prototype.hasOwnProperty.call(languages, 'zh-Hant') ? 'zh-Hant' : first;
};

/** The language to speak. Pure: `search` is location.search, `preferred` navigator.languages. */
export function pickLanguage(search, preferred, languages = LANGUAGES) {
  const asked = /[?&]lang=([^&#]*)/.exec(String(search || ''));
  if (asked) {
    let code = '';
    try { code = base(decodeURIComponent(asked[1]), languages); } catch { /* a stray % in the address: no such language */ }
    return Object.prototype.hasOwnProperty.call(languages, code) ? code : 'en';
  }
  for (const tag of preferred || []) {
    const code = base(tag, languages);
    if (Object.prototype.hasOwnProperty.call(languages, code) && languages[code].reviewed) return code;
  }
  return 'en';
}

export const LANG = pickLanguage(
  typeof location !== 'undefined' ? location.search : '',
  typeof navigator !== 'undefined' ? navigator.languages || [navigator.language] : [],
);
/** The locale the date and time formats are written in; the pill's is separate (its month is set in capitals). */
export const LOCALE = LANGUAGES[LANG].locale;
export const PILL_LOCALE = LANGUAGES[LANG].pill;

if (LANG !== 'en' && typeof document !== 'undefined') {
  document.documentElement.lang = LANGUAGES[LANG].tag || LANG;
  if (RTL.includes(LANG)) document.documentElement.dir = 'rtl';
}
