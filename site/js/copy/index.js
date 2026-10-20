// copy/index.js -- puts a language's words over the English ones (public #524, spec 0077 W1-e).
//
// Fetched by dynamic import, only when copy/lang.js has chosen a language other than English:
// copy/en.js, en.later.js and en.facts.js each end by calling `localise`. It imports nothing
// (not copy/en.js: that file is waiting for this one), and receives the objects to change.
//
// THE RULE. The English object stays the object every module holds; this goes over it IN PLACE,
// key by key, so `const T = COPY.templates` taken before or after still sees the translation.
// A key the language file does not have, or has empty, stays English: a half-finished translation
// is a working page with some English in it, never a hole. A key of another kind (a group where
// English has text) is ignored, and so is one English does not have.
// WHERE A LANGUAGE'S OWN GRAMMAR LIVES (public #524 item 3). Plural, "a/an", the compass, the
// comparisons' sentences and the time words are words, and are keys of COPY like any other
// (COPY.compareText, COPY.time). What cannot be a string is a function, and a language file exports
// those as `RULES` ({ article(phrase), typeWords(text) }, see copy/en.js): the one place a
// language writes code, kept to the rules English had as code.
import { LANG } from './lang.js';

const kind = (v) => (typeof v === 'string' ? 'text' : Array.isArray(v) ? 'list' : v && typeof v === 'object' ? 'group' : typeof v);

/** Copy `from` over `into` where both have the same kind of thing. Returns the number of strings replaced. */
export function overlay(into, from) {
  let n = 0;
  for (const key of Object.keys(from || {})) {
    if (!(key in into)) continue;
    const a = into[key], b = from[key];
    if (kind(a) !== kind(b)) continue;
    if (kind(a) === 'text') {
      if (b !== '') { into[key] = b; n += 1; }
    } else if (kind(a) !== 'text') {
      n += overlay(a, b);
    }
  }
  return n;
}

let loading = null;
/** The language file, once. A failed fetch is English for the whole visit (and nothing is thrown at a module). */
function language() {
  if (!loading) loading = import(`./${LANG}.js`).catch(() => null);
  return loading;
}

/**
 * `target` is { COPY, GLOSSARY, RULES } (copy/en.js) or { COPY } (the files that add sections);
 * `keys` the top-level sections of COPY to translate (default: every section the language has).
 */
export async function localise(target, keys = null) {
  const lang = await language();
  if (!lang) return 0;
  let n = 0;
  if (target.COPY && lang.COPY) {
    const from = keys ? Object.fromEntries(keys.filter((k) => k in lang.COPY).map((k) => [k, lang.COPY[k]])) : lang.COPY;
    n += overlay(target.COPY, from);
  }
  if (target.GLOSSARY && lang.GLOSSARY) n += overlay(target.GLOSSARY, lang.GLOSSARY);
  if (target.RULES && lang.RULES) Object.assign(target.RULES, lang.RULES);
  return n;
}
