#!/usr/bin/env node
// Does a translation carry every string of the English copy? (docs/TRANSLATING.md)
//
//   node scripts/check-translation.mjs --skeleton fr > site/js/copy/fr.js   # a starting file
//   node scripts/check-translation.mjs site/js/copy/fr.js                    # what is still missing
//   node scripts/check-translation.mjs --table                               # every language: coverage, review, whether the page offers it
//   node scripts/check-translation.mjs --write-doc                           # put that table into docs/TRANSLATING.md
//   node scripts/check-translation.mjs --check-doc                           # fail if the table there is stale or a language breaks the review rule
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
import { readdirSync, readFileSync, writeFileSync } from 'node:fs'; // 0077 W1-e

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
    + `// To show it on the site: register ${lang} in LANGUAGES in site/js/copy/lang.js (docs/TRANSLATING.md, "Show it on the site").\n`
    + `// 0077 W1-e: begin\n`
    + `// Who has read it. Say 'machine-drafted' if a program wrote it, 'human-drafted' if a person did; 'reviewed' only when a\n`
    + `// SECOND native speaker has read all of it, and then put both names in \`by\` (docs/TRANSLATING.md, "Review").\n`
    + `export const META = { code: ${JSON.stringify(lang)}, name: '', english: '', review: { status: 'human-drafted', by: [], note: '' } };\n`
    + `// If the language needs code for what English did with code (the \"a/an\" of article()), export RULES here: see site/js/copy/es.js.\n`
    + `// 0077 W1-e: end\n`
    + `export const COPY = ${body(en.COPY)};\n\nexport const GLOSSARY = ${body(en.GLOSSARY)};\n`;
}

// 0077 W1-e: begin
// ---- the progress table (internal i#688): every language file, how complete it is, who has read it -------------
const COPY_DIR = resolve(HERE, '../site/js/copy');
const DOC = resolve(HERE, '../docs/TRANSLATING.md');
const DOC_BEGIN = '<!-- translation-status:begin (node scripts/check-translation.mjs --write-doc) -->';
const DOC_END = '<!-- translation-status:end -->';
const REVIEW_STATUSES = ['machine-drafted', 'human-drafted', 'reviewed'];
const hasLetters = (s) => /[a-z]{3}/i.test(s);

/** Count the text leaves of an English tree, and how many of them a translation tree has, and changed. */
export function leaves(en, tr, out = { total: 0, present: 0, changed: 0 }) {
  for (const key of Object.keys(en)) {
    const a = en[key], b = tr ? tr[key] : undefined;
    if (typeof a === 'string') {
      if (a === '') continue; // an empty string is a deliberate blank (moonPhases), nothing to translate
      out.total += 1;
      if (typeof b === 'string' && b !== '') {
        out.present += 1;
        if (b !== a || !hasLetters(a)) out.changed += 1;
      }
    } else if (a && typeof a === 'object') {
      leaves(a, b && typeof b === 'object' ? b : null, out);
    }
  }
  return out;
}

/** One row per language: from the files in site/js/copy and the LANGUAGES list of copy/lang.js. */
export async function status() {
  const en = await english();
  const { LANGUAGES } = await import(pathToFileURL(resolve(COPY_DIR, 'lang.js')).href);
  const files = readdirSync(COPY_DIR).filter((f) => /^[a-z]{2,3}(-[A-Za-z]{2,4})?\.js$/.test(f) && f !== 'en.js').sort();
  const rows = [];
  const problems = [];
  const baseline = leaves(en.COPY, null);
  const glossary = leaves(en.GLOSSARY, null);
  const total = baseline.total + glossary.total;
  for (const file of files) {
    const code = file.replace(/\.js$/, '');
    const tr = await import(pathToFileURL(resolve(COPY_DIR, file)).href);
    const a = leaves(en.COPY, tr.COPY);
    const b = leaves(en.GLOSSARY, tr.GLOSSARY);
    const { out } = await check(resolve(COPY_DIR, file));
    const meta = tr.META || {};
    const review = meta.review || {};
    const reg = LANGUAGES[code];
    const row = {
      code, name: meta.name || code, english: meta.english || code, total,
      present: a.present + b.present, changed: a.changed + b.changed,
      slotProblems: out.placeholder.length, extra: out.extra.length + out.kind.length,
      review: REVIEW_STATUSES.includes(review.status) ? review.status : 'unknown',
      by: Array.isArray(review.by) ? review.by : [], registered: !!reg, offered: !!(reg && reg.reviewed),
    };
    rows.push(row);
    if (!reg) problems.push(`${file} is not registered in LANGUAGES in site/js/copy/lang.js, so the page cannot show it`);
    if (row.review === 'unknown') problems.push(`${file} must export META.review.status: one of ${REVIEW_STATUSES.join(', ')}`);
    if (row.offered && !(row.review === 'reviewed' && row.by.length >= 2)) problems.push(`${code} is offered from the browser's language (reviewed: true in lang.js) but META.review is not 'reviewed' with two names in \`by\`: the review rule (docs/TRANSLATING.md) is not met`);
    if (row.review === 'reviewed' && row.by.length < 2) problems.push(`${file} says reviewed with fewer than two names in META.review.by: the author and a second native speaker`);
    if (row.slotProblems) problems.push(`${file} has ${row.slotProblems} lost or invented {slot}s: node scripts/check-translation.mjs site/js/copy/${file}`);
  }
  for (const code of Object.keys(LANGUAGES)) if (code !== 'en' && !files.includes(`${code}.js`)) problems.push(`LANGUAGES lists ${code} but site/js/copy/${code}.js does not exist`);
  return { total, rows, problems };
}

const spaced = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f');
const pct = (n, t) => `${Math.floor((n / t) * 1000) / 10} %`;

/** The table, as markdown (for docs/TRANSLATING.md) or as plain text. */
export function table(st, markdown = true) {
  const head = ['Language', 'File', 'Strings present', 'Changed from English', 'Review', 'Shown from the browser\u2019s language'];
  const body = [['English', '`en.js`', `${spaced(st.total)} (the source)`, '-', 'the source', 'yes']];
  for (const r of st.rows) {
    const review = r.review === 'reviewed' ? `reviewed by ${r.by.join(' and ')}` : r.review;
    body.push([`${r.name} (${r.english})`, `\`${r.code}.js\``, `${spaced(r.present)} of ${spaced(r.total)} (${pct(r.present, r.total)})`, `${spaced(r.changed)} (${pct(r.changed, r.total)})`, review, r.offered ? 'yes' : `no: \`?lang=${r.code}\` only`]);
  }
  if (markdown) return [head, head.map(() => '---'), ...body].map((row) => `| ${row.join(' | ')} |`).join('\n');
  const widths = head.map((h, i) => Math.max(h.length, ...body.map((row) => row[i].replace(/`/g, '').length)));
  return [head, ...body.map((row) => row.map((c) => c.replace(/`/g, '')))].map((row) => row.map((c, i) => c.padEnd(widths[i])).join('  ')).join('\n');
}

/** docs/TRANSLATING.md with the table between its two markers made current. Returns { text, stale }. */
export async function docWithTable() {
  const st = await status();
  const doc = readFileSync(DOC, 'utf8');
  const from = doc.indexOf(DOC_BEGIN), to = doc.indexOf(DOC_END);
  if (from < 0 || to < from) throw new Error(`docs/TRANSLATING.md needs the markers ${DOC_BEGIN} ... ${DOC_END}`);
  const text = `${doc.slice(0, from)}${DOC_BEGIN}\n${table(st, true)}\n${doc.slice(to)}`;
  return { text, stale: text !== doc, st };
}
// 0077 W1-e: end

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const strict = args.includes('--strict');
  if (args[0] === '--skeleton') {
    if (!/^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(args[1] || '')) { console.error('usage: --skeleton <language code, e.g. fr or pt-BR>'); process.exit(2); }
    process.stdout.write(await skeleton(args[1]));
    process.exit(0);
  }
  // 0077 W1-e: begin
  if (args.includes('--table')) {
    const st = await status();
    console.log(table(st, args.includes('--markdown')));
    for (const p of st.problems) console.log(`problem: ${p}`);
    process.exit(st.problems.length ? 1 : 0);
  }
  if (args.includes('--write-doc') || args.includes('--check-doc')) {
    const { text, stale, st } = await docWithTable();
    for (const p of st.problems) console.log(`problem: ${p}`);
    if (args.includes('--write-doc')) { if (stale) writeFileSync(DOC, text); console.log(stale ? 'docs/TRANSLATING.md: table refreshed' : 'docs/TRANSLATING.md: table already current'); process.exit(st.problems.length ? 1 : 0); }
    if (stale) console.log('docs/TRANSLATING.md: the translation table is stale: run node scripts/check-translation.mjs --write-doc');
    process.exit(stale || st.problems.length ? 1 : 0);
  }
  // 0077 W1-e: end
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
