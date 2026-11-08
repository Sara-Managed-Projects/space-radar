// tests/test_type_words_langs.mjs -- every deep-sky type phrase the catalogue carries is in every language (2.0.0 polish list).
//
// The German card of a globular cluster read "Kugelsternhaufen" in its lead and "Globular cluster" in its "What it is"
// row (ui/cardfacts.js printed the data's English). And seven languages (ar, es, he, hi, ru, uk, zh) had no table at all,
// so their leads carried the English phrase too ("un globular cluster"). Held here, for each of the ten languages:
// copy/<lang>.js RULES.typeWords turns every distinct `typeText` of site/data/dso.json into something that is not the
// English phrase, and the card's row uses it.
//
//   node tests/test_type_words_langs.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8'));
const phrases = [...new Set(dso.objects.map((o) => o.typeText).filter(Boolean))];
check(phrases.length > 30, `the catalogue's phrases were read (${phrases.length})`);
const LANGS = ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh'];
for (const lang of LANGS) {
  const { RULES } = await import(join(ROOT, `site/js/copy/${lang}.js`));
  check(typeof RULES.typeWords === 'function', `${lang}: no RULES.typeWords`);
  if (typeof RULES.typeWords !== 'function') continue;
  const missing = phrases.filter((p) => String(RULES.typeWords(p)).toLowerCase() === p.toLowerCase());
  check(!missing.length, `${lang}: ${missing.length} type phrase(s) left in English: ${missing.slice(0, 4).join('; ')}`);
}
const facts = readFileSync(join(ROOT, 'site/js/ui/cardfacts.js'), 'utf8');
check(/typeShown = here && here\.toLowerCase\(\) !== String\(type\)\.toLowerCase\(\)/.test(facts) && /\[R\.objectType, String\(typeShown\)/.test(facts), 'the card\'s "What it is" row prints the translated phrase');

if (problems.length) { console.error('type words FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`type words ok: all ${phrases.length} deep-sky type phrases of the catalogue are translated in ${LANGS.length} languages, and the card's row uses them`);
