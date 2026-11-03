#!/usr/bin/env node
// Work a translation in flat pieces (release 1.6.3, internal #995, public #525 to #534).
//
//   node scripts/translation-flat.mjs --out DIR [--missing es]      write DIR/en-NN.json: {"COPY.card.lead": "English text", ...}
//                                                                   (--missing: only the strings copy/es.js lacks)
//   node scripts/translation-flat.mjs --new he DIR "עברית" Hebrew   build copy/he.js from DIR/he-NN.json (+ DIR/he-rules.js)
//   node scripts/translation-flat.mjs --topup es DIR                add what copy/es.js lacks, from DIR/es-NN.json, as a block before GLOSSARY
//
// A piece is a plain JSON object from a path to a text, so a translator (or a program) can work on a few thousand
// characters at a time, in any order, and leave out what must stay as it is. Nothing here chooses words: it only moves them.
// A path whose translation is missing or empty stays English in the new file (the loader shows English for it anyway).
import { pathToFileURL } from 'node:url';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { skeleton, check } from './check-translation.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const COPY_DIR = resolve(HERE, '../site/js/copy');
const CHUNK = 12000; // characters of English per piece

/** Every text leaf of { COPY, GLOSSARY } as [dotted path, text]; lists use their index. Throws if two paths read the same. */
export function flatten(tree) {
  const out = new Map();
  const walk = (v, path) => {
    if (typeof v === 'string') { if (v !== '') { if (out.has(path)) throw new Error(`two keys read ${path}`); out.set(path, v); } return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`);
  };
  for (const top of Object.keys(tree)) walk(tree[top], top);
  return out;
}

/** Put flat { path: text } over `into` (a tree with the same shape): only where `into` already has a text there. Returns the count. */
export function pour(into, flat) {
  const index = new Map();
  const walk = (v, path, parent, key) => {
    if (typeof v === 'string') { index.set(path, [parent, key]); return; }
    if (v && typeof v === 'object') for (const k of Object.keys(v)) walk(v[k], `${path}.${k}`, v, k);
  };
  for (const top of Object.keys(into)) walk(into[top], top, into, top);
  let n = 0;
  for (const [path, text] of Object.entries(flat)) {
    const at = index.get(path);
    if (!at || typeof text !== 'string' || text === '') continue;
    at[0][at[1]] = text; n += 1;
  }
  return n;
}

/** A nested tree holding only the given flat paths (for the top-up block). */
export function nest(flat) {
  const root = {};
  for (const [path, text] of Object.entries(flat)) {
    const keys = path.split('.');
    let at = root;
    keys.forEach((k, i) => {
      if (i === keys.length - 1) at[k] = text;
      else {
        const nextIsIndex = /^\d+$/.test(keys[i + 1]);
        at[k] = at[k] || (nextIsIndex ? [] : {});
        at = at[k];
      }
    });
  }
  return root;
}

async function englishTree() {
  const sk = await skeleton('xx');
  const dir = resolve(process.env.TMPDIR || '/tmp', `translation-flat-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const f = resolve(dir, 'xx.js');
  writeFileSync(f, sk);
  return import(pathToFileURL(f).href);
}

function pieces(flat) {
  const out = [];
  let cur = {}, size = 0, last = '';
  for (const [path, text] of flat) {
    const top = path.split('.').slice(0, 2).join('.');
    if (size > CHUNK && top !== last) { out.push(cur); cur = {}; size = 0; }
    cur[path] = text; size += text.length + path.length; last = top;
  }
  if (size) out.push(cur);
  return out;
}

const readPieces = (dir, code) => {
  const flat = {};
  for (const f of readdirSync(dir).filter((x) => new RegExp(`^${code}-\\d+\\.json$`).test(x)).sort()) Object.assign(flat, JSON.parse(readFileSync(resolve(dir, f), 'utf8')));
  return flat;
};

const args = process.argv.slice(2);
if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const en = await englishTree();
  if (args[0] === '--out') {
    const dir = resolve(args[1]);
    mkdirSync(dir, { recursive: true });
    let flat = flatten({ COPY: en.COPY, GLOSSARY: en.GLOSSARY });
    if (args[2] === '--missing') {
      const { out } = await check(resolve(COPY_DIR, `${args[3]}.js`));
      const lacking = out.missing;
      flat = new Map([...flat].filter(([p]) => lacking.some((m) => p === m || p.startsWith(`${m}.`))));
    }
    const list = pieces(flat);
    list.forEach((piece, i) => writeFileSync(resolve(dir, `en-${String(i + 1).padStart(2, '0')}.json`), JSON.stringify(piece, null, 1)));
    console.log(`${flat.size} strings in ${list.length} pieces in ${dir}`);
  } else if (args[0] === '--new') {
    const [, code, dirArg, name, english] = args;
    const dir = resolve(dirArg);
    const flat = readPieces(dir, code);
    const tree = { COPY: structuredClone(en.COPY), GLOSSARY: structuredClone(en.GLOSSARY) };
    const poured = pour(tree, flat);
    const rulesFile = resolve(dir, `${code}-rules.js`);
    const rules = existsSync(rulesFile) ? readFileSync(rulesFile, 'utf8').trim() + '\n' : '';
    const noteFile = resolve(dir, `${code}-notes.txt`);
    const notes = existsSync(noteFile) ? readFileSync(noteFile, 'utf8').trim().split('\n').map((l) => `//   * ${l}`).join('\n') : '//   * (none recorded)';
    const text = `// ${code}: ${english}, the words of site/js/copy/en.js, en.later.js, en.facts.js and the Moments files (release 1.6.3, public translation issues).\n`
      + `// Fetched by copy/index.js only when the page speaks ${english} (?lang=${code}); hidden until a native reader has signed off (docs/TRANSLATING.md).\n`
      + `//\n// STATUS: MACHINE-DRAFTED. Every string was drafted by a program from the English and has NOT been read by a native speaker.\n`
      + `// Until a second native speaker has read it and put their name in \`review.by\`, copy/lang.js keeps \`reviewed: false\`, so the page\n`
      + `// speaks ${english} only to a visitor who asks for it (?lang=${code}), and the language picker does not list it.\n`
      + `//\n// CHOICES, so a reviewer can disagree with them:\n${notes}\n\n`
      + `export const META = {\n  code: ${JSON.stringify(code)},\n  name: ${JSON.stringify(name)},\n  english: ${JSON.stringify(english)},\n`
      + `  review: { status: 'machine-drafted', by: [], note: 'Needs a native reader and a second reader (docs/TRANSLATING.md, Review).' },\n};\n\n`
      + rules + (rules ? '\n' : '')
      + `export const COPY = ${JSON.stringify(tree.COPY, null, 2)};\n\nexport const GLOSSARY = ${JSON.stringify(tree.GLOSSARY, null, 2)};\n`;
    writeFileSync(resolve(COPY_DIR, `${code}.js`), text);
    console.log(`${code}.js written, ${poured} strings poured of ${flatten({ COPY: en.COPY, GLOSSARY: en.GLOSSARY }).size}; rules ${rules ? 'yes' : 'no'}`);
  } else if (args[0] === '--topup') {
    const [, code, dirArg] = args;
    const flat = readPieces(resolve(dirArg), code);
    const file = resolve(COPY_DIR, `${code}.js`);
    const old = readFileSync(file, 'utf8');
    const copyPart = {}, glossPart = {};
    for (const [p, t] of Object.entries(flat)) (p.startsWith('GLOSSARY.') ? glossPart : copyPart)[p.startsWith('GLOSSARY.') ? p.slice(9) : p.slice(5)] = t;
    if (Object.keys(glossPart).length) throw new Error('the top-up block holds COPY strings; the glossary is not missing from ' + code);
    const block = `// 1.6.3 (internal #995): the sections and strings this file did not have yet (r13Deep, compare, passportKinds, photoCompare, entrances,\n`
      + `// the 1.5 strings and the gaps in card, drawing, cls, templates and the rest), ${code}. Machine-drafted like the rest of this file (docs/TRANSLATING.md):\n`
      + `// drafted by a program from the English, NOT read by a native speaker. A key this file already has is left as it is.\n`
      + `{\n  const topUp = (dst, src) => {\n    for (const k of Object.keys(src)) {\n`
      + `      if (src[k] && typeof src[k] === 'object' && !Array.isArray(src[k]) && dst[k] && typeof dst[k] === 'object') topUp(dst[k], src[k]);\n`
      + `      else if (!(k in dst)) dst[k] = src[k];\n    }\n  };\n  topUp(COPY, ${JSON.stringify(nest(copyPart), null, 2).replace(/\n/g, '\n  ')});\n`
      + `}\n// 1.6.3: end\n\n`;
    const at = old.indexOf('export const GLOSSARY = ');
    if (at < 0) throw new Error('no GLOSSARY in ' + file);
    writeFileSync(file, old.slice(0, at) + block + old.slice(at));
    console.log(`${code}.js: top-up block with ${Object.keys(copyPart).length} strings`);
  } else {
    console.error('usage: see the head of this file');
    process.exit(2);
  }
}
