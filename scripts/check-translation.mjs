#!/usr/bin/env node
// Does a translation carry every string of the English copy? (docs/TRANSLATING.md)
//
//   node scripts/check-translation.mjs --skeleton fr > site/js/copy/fr.js   # a starting file
//   node scripts/check-translation.mjs site/js/copy/fr.js                    # what is still missing
//
// A translation is an ES module that exports `COPY` and `GLOSSARY` with the same shape as
// site/js/copy/en.js and site/js/copy/en.later.js together. This lists, and fails on:
//   missing      a key English has and the translation lacks
//   extra        a key the translation has and English lacks (a typo, or a string that was removed)
//   kind         a key that is text in one and a list or group in the other
//   placeholder  a {name} slot that English has and the translation lacks, or the reverse. A slot is
//                filled by code; a translation that loses one prints a hole, one that invents one
//                prints nothing.
//   untouched    only reported with --strict: a string identical to the English (fine for a name,
//                a number or "OK"; a translator should have looked at it)
// It reads only the two files. No network, no browser, no install.
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const slots = (s) => new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]));

export function compare(en, tr, path = '', out = { missing: [], extra: [], kind: [], placeholder: [], untouched: [] }) {
  const kindOf = (v) => (typeof v === 'string' ? 'text' : Array.isArray(v) ? 'list' : v && typeof v === 'object' ? 'group' : typeof v);
  for (const key of Object.keys(en)) {
    const here = path ? `${path}.${key}` : key;
    if (!(key in tr)) { out.missing.push(here); continue; }
    const a = en[key], b = tr[key];
    if (kindOf(a) !== kindOf(b)) { out.kind.push(`${here} (English ${kindOf(a)}, translation ${kindOf(b)})`); continue; }
    if (typeof a === 'string') {
      const sa = slots(a), sb = slots(b);
      for (const s of sa) if (!sb.has(s)) out.placeholder.push(`${here}: {${s}} is missing`);
      for (const s of sb) if (!sa.has(s)) out.placeholder.push(`${here}: {${s}} is not in the English`);
      if (a === b && /[a-z]{3}/i.test(a)) out.untouched.push(here);
    } else if (kindOf(a) !== 'text' && a && typeof a === 'object') {
      compare(a, b, here, out);
    }
  }
  for (const key of Object.keys(tr)) if (!(key in en)) out.extra.push(path ? `${path}.${key}` : key);
  return out;
}

async function english() {
  const base = await import(pathToFileURL(resolve(HERE, '../site/js/copy/en.js')).href);
  await import(pathToFileURL(resolve(HERE, '../site/js/copy/en.later.js')).href); // adds its sections to base.COPY
  return { COPY: base.COPY, GLOSSARY: base.GLOSSARY };
}

export async function check(file, strict = false) {
  const en = await english();
  const tr = await import(pathToFileURL(resolve(file)).href);
  const out = { missing: [], extra: [], kind: [], placeholder: [], untouched: [] };
  if (!tr.COPY || !tr.GLOSSARY) throw new Error(`${file} must export COPY and GLOSSARY`);
  compare(en.COPY, tr.COPY, 'COPY', out);
  compare(en.GLOSSARY, tr.GLOSSARY, 'GLOSSARY', out);
  const failing = ['missing', 'extra', 'kind', 'placeholder'].concat(strict ? ['untouched'] : []);
  return { out, failed: failing.some((k) => out[k].length > 0) };
}

export async function skeleton(lang) {
  const en = await english();
  const body = (o) => JSON.stringify(o, null, 2);
  return `// ${lang}: translation of site/js/copy/en.js and en.later.js (docs/TRANSLATING.md).\n`
    + `// Every value below is still the English text: replace it, keep the keys and every {slot}.\n`
    + `// Check your work: node scripts/check-translation.mjs site/js/copy/${lang}.js\n`
    + `export const COPY = ${body(en.COPY)};\n\nexport const GLOSSARY = ${body(en.GLOSSARY)};\n`;
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  if (args[0] === '--skeleton') {
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(args[1] || '')) { console.error('usage: --skeleton <language code, e.g. fr or pt-BR>'); process.exit(2); }
    process.stdout.write(await skeleton(args[1]));
    process.exit(0);
  }
  const file = args.find((a) => !a.startsWith('--'));
  if (!file) { console.error('usage: node scripts/check-translation.mjs site/js/copy/<lang>.js [--strict]'); process.exit(2); }
  const { out, failed } = await check(file, strict);
  for (const [k, list] of Object.entries(out)) {
    if (!list.length) continue;
    console.log(`${k}: ${list.length}`);
    for (const x of list.slice(0, 25)) console.log(`  ${x}`);
    if (list.length > 25) console.log(`  ... and ${list.length - 25} more`);
  }
  console.log(failed ? 'translation: NOT complete' : 'translation: every string present, every slot kept');
  process.exit(failed ? 1 : 0);
}
