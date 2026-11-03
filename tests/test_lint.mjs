// tests/test_lint.mjs -- the unused-names rule, in CI with nothing to install (public #1229).
//
// The rule ESLint calls no-unused-vars, in the part that costs people time: a name that an import, a
// const, let, var, function or class declares and that its file never mentions again. Such a name is
// dead weight in a file the visitor downloads, and an unused import is how a module stays loaded after
// the last thing that used it was deleted.
//
// It is not ESLint and does not pretend to be: no parser, no scopes. It reads each file as tokens
// (comments, strings, regular expressions and template text set aside; `${...}` kept as code) and
// counts how often each declared name appears. A name that appears once is never used. Shadowing and
// a name used only as a property key can hide an unused name from it (it is deliberately blind rather
// than wrong), and nothing it reports is a false alarm: a second mention anywhere clears a name.
// Parameters, catch bindings and destructured names are out of its reach.
//
//   node tests/test_lint.mjs            the whole tree, as CI runs it
//   node tests/test_lint.mjs a.js b.js  only these files
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// -- the scanner --------------------------------------------------------------------------------
const ID_START = /[A-Za-z_$]/;
const ID_PART = /[A-Za-z0-9_$]/;
// After one of these a `/` begins a regular expression; after a name, a number or `)` `]` it divides.
const REGEX_AFTER_WORD = new Set(['return', 'typeof', 'instanceof', 'in', 'of', 'new', 'delete', 'void', 'throw', 'case', 'do', 'else', 'yield', 'await']);

// tokens(src) -> [{ t: 'id' | 'p', v, i }]; strings, regexes and template text are dropped.
export function tokens(src) {
  const out = [];
  const n = src.length;
  const braces = []; // for `${` inside a template: the depth to come back to
  let depth = 0;
  let i = 0;
  const last = () => out[out.length - 1];
  const regexAllowed = () => {
    const l = last();
    if (!l) return true;
    if (l.t === 'id') return REGEX_AFTER_WORD.has(l.v);
    if (l.t === 'n') return false;
    return !(l.v === ')' || l.v === ']' || l.v === '}');
  };
  // a template literal's text, up to a `${` (returns true, a hole is open) or the closing backtick
  const template = () => {
    while (i < n) {
      const c = src[i];
      if (c === '\\') { i += 2; continue; }
      if (c === '`') { i++; return false; }
      if (c === '$' && src[i + 1] === '{') { i += 2; braces.push(depth); depth++; return true; }
      i++;
    }
    return false;
  };
  while (i < n) {
    const c = src[i];
    if (c === ' ' || c === '\t' || c === '\n' || c === '\r') { i++; continue; }
    if (c === '/' && src[i + 1] === '/') { while (i < n && src[i] !== '\n') i++; continue; }
    if (c === '/' && src[i + 1] === '*') { const e = src.indexOf('*/', i + 2); i = e < 0 ? n : e + 2; continue; }
    if (c === '"' || c === "'") {
      i++;
      while (i < n && src[i] !== c && src[i] !== '\n') i += src[i] === '\\' ? 2 : 1;
      i++;
      out.push({ t: 's', v: c, i });
      continue;
    }
    if (c === '`') { i++; template(); out.push({ t: 's', v: '`', i }); continue; }
    if (c === '/' && regexAllowed()) {
      i++;
      let cls = false;
      while (i < n && src[i] !== '\n' && (cls || src[i] !== '/')) {
        if (src[i] === '\\') i++;
        else if (src[i] === '[') cls = true;
        else if (src[i] === ']') cls = false;
        i++;
      }
      i++;
      while (i < n && ID_PART.test(src[i])) i++;
      out.push({ t: 's', v: '/', i });
      continue;
    }
    if (ID_START.test(c)) {
      const s = i;
      while (i < n && ID_PART.test(src[i])) i++;
      out.push({ t: 'id', v: src.slice(s, i), i: s });
      continue;
    }
    if (c >= '0' && c <= '9') {
      while (i < n && /[0-9A-Za-z_.]/.test(src[i])) i++;
      out.push({ t: 'n', v: '0', i });
      continue;
    }
    if (c === '{') depth++;
    if (c === '}') {
      depth--;
      if (braces.length && braces[braces.length - 1] === depth) { braces.pop(); template(); out.push({ t: 'p', v: '}', i }); continue; }
    }
    out.push({ t: 'p', v: c, i });
    i++;
  }
  return out;
}

// declared(tokens) -> [{ name, how, i }]: the names this file declares with import, const, let, var,
// function or class, minus the ones it exports and the ones destructuring or lists make unreadable.
export function declared(tk) {
  const found = [];
  const at = (k) => tk[k] || { t: '', v: '' };
  for (let k = 0; k < tk.length; k++) {
    const { t, v } = tk[k];
    if (t !== 'id') continue;
    const prev = at(k - 1);
    const dotted = prev.t === 'p' && prev.v === '.'; // obj.function, obj.import
    if (dotted) continue;
    if (v === 'import' && at(k + 1).v !== '(' && at(k + 1).v !== '.') {
      // import a, { b, c as d } from 'x'; import * as e from 'x'; import 'x'
      let j = k + 1;
      while (j < tk.length && !(tk[j].t === 'id' && tk[j].v === 'from') && tk[j].t !== 's') {
        const x = tk[j];
        if (x.t === 'id' && x.v !== 'as' && x.v !== 'type') {
          const nextAs = at(j + 1).t === 'id' && at(j + 1).v === 'as';
          if (!nextAs) found.push({ name: x.v, how: 'import', i: x.i });
        }
        j++;
      }
      k = j;
      continue;
    }
    if (v === 'function' || v === 'class') {
      let j = k + 1;
      if (v === 'function' && at(j).v === '*') j++;
      const nm = at(j);
      if (nm.t === 'id' && nm.v !== 'extends' && at(j + 1).v !== ':') {
        // a declaration starts a statement; a named function expression (`x = function f() {}`) does not
        const before = at(k - 1).v === 'async' ? at(k - 2) : at(k - 1);
        const statement = before.t === '' || (before.t === 'p' && ';{})'.includes(before.v));
        if (statement) found.push({ name: nm.v, how: v, i: nm.i });
      }
      continue;
    }
    if ((v === 'const' || v === 'let' || v === 'var') && at(k + 1).t === 'id') {
      const first = at(k + 1);
      const exported = at(k - 1).v === 'export';
      // the for-in/of head and a name followed by a comma are left alone; `const a = 1, b = 2` reads b too
      let j = k + 1;
      let level = 0;
      const names = [first];
      for (; j < tk.length; j++) {
        const x = tk[j];
        if (x.t === 'p' && '([{'.includes(x.v)) level++;
        else if (x.t === 'p' && ')]}'.includes(x.v)) { level--; if (level < 0) break; }
        else if (level === 0 && x.t === 'p' && x.v === ';') break;
        else if (level === 0 && x.t === 'p' && x.v === ',' && at(j + 1).t === 'id' && (at(j + 2).v === '=' || at(j + 2).v === ',' || at(j + 2).v === ';')) names.push(at(j + 1));
        else if (level === 0 && x.t === 'id' && (x.v === 'of' || x.v === 'in')) { names.length = 0; break; }
        if (j - k > 4000) break;
      }
      if (!exported) for (const nm of names) found.push({ name: nm.v, how: v, i: nm.i });
    }
  }
  return found;
}

// unused(src) -> [{ name, how, line }]
export function unused(src) {
  const tk = tokens(src);
  const count = new Map();
  for (const x of tk) if (x.t === 'id') count.set(x.v, (count.get(x.v) || 0) + 1);
  // `export { a, b }` and `export default a` mention a name; so does `module.exports`. Those are tokens too.
  const seen = new Set();
  const out = [];
  for (const d of declared(tk)) {
    if (count.get(d.name) !== 1 || seen.has(d.name)) continue;
    seen.add(d.name);
    out.push({ ...d, line: src.slice(0, d.i).split('\n').length });
  }
  return out;
}

// -- the self-test: the rule must refuse what it is for, and let the rest alone -----------------
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };
const names = (s) => unused(s).map((u) => `${u.how}:${u.name}`).sort().join(' ');

check(names("import { a, b as c } from './x.js';\nuse(a);") === 'import:c', 'an import that is never used is named (b as c)');
check(names("import d, * as e from './x.js';\nd();") === 'import:e', 'a namespace import that is never used is named');
check(names("import './x.js';\nimport { f } from './y.js'; f();") === '', 'a side-effect import and a used one are left alone');
check(names('const q = 1;\nlet r = 2, s = 3;\nconsole.log(r);') === 'const:q let:s', 'unused const and let are named, one in a list too');
check(names('function dead() {}\nfunction live() {}\nlive();') === 'function:dead', 'an unused function is named');
check(names('export function pub() {}\nexport const k = 1;\nexport default class Z {}') === '', 'exports are never unused');
check(names("const t = 1; const s = `x ${t} y`; log(s);") === '', 'a name used only inside a template hole is used');
check(names("const t = 1; const s = `x t y`; log(s);") === 'const:t', 'a name only in template text is not used');
check(names("const w = 1; // w again\nconst z = 'w'; log(z);") === 'const:w', 'a comment or string mentioning a name does not use it');
check(names('const h = 2; const r = a / h / 3; log(r, /h\\//);') === '', 'a division is not a regular expression, and a regex is not code');
check(names('for (const k of xs) { go(); }\nfor (const [a, b] of ys) go(a, b);') === '', 'a for-of head and a destructured name are out of reach, not wrong');
check(names('const { a, b } = o; log(a);') === '', 'destructuring is out of reach');
check(names('const o = { function: 1 }; log(o.function);') === '', 'a property named like a keyword declares nothing');
check(names('const a = `${`${x}`}`; const b = 1; log(a);') === 'const:b', 'templates nest');
check(names('async function main() {}\nexport { main };') === '', 'a name in an export list is used');

// -- the tree -----------------------------------------------------------------------------------
// vendor/ is other people's code; probes/ are page-side snippets joined into one scope by the look
// tool's prelude (a name one file declares is another's to use); edge/ holds the CloudFront handlers,
// whose entry point the platform calls by name.
const SKIP = new Set(['node_modules', '.git', 'vendor', 'screens', 'probes', 'edge']);
function walk(dir, out = []) {
  for (const f of readdirSync(dir)) {
    if (SKIP.has(f)) continue;
    const p = join(dir, f);
    const s = statSync(p);
    if (s.isDirectory()) walk(p, out);
    else if (/\.(m?js)$/.test(f)) out.push(p);
  }
  return out;
}
const argv = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const files = argv.length ? argv : ['site/js', 'tools', 'tests', 'scripts'].flatMap((d) => { try { return walk(join(ROOT, d)); } catch { return []; } });

// Names known and not yet removed, per file. A new entry is a failure to ask for: the list may only
// shrink (a stale entry fails too), so the day it is empty the rule has no exceptions.
const ALLOWED = {
  'scripts/apollo/build-csm.mjs': ['clipY', 'frustum', 'flip', 'SM_GREY', 'GOLDF'],
  'scripts/apollo/build-saturn-v.mjs': ['shade', 'V'],
  'scripts/artemis-models/assemble.mjs': ['sc'],
  'scripts/repaint-array-face.mjs': ['N'],
  'tests/test_audio.mjs': ['flush'],
  'tests/test_confidence.mjs': ['events'],
  'tests/test_hero_spiral.mjs': ['nb', 'nd', 'Rd'],
  'tests/test_localvolume.mjs': ['MLY_KM', 'ids'],
  'tests/test_missions.mjs': ['wantId'],
  'tests/test_share.mjs': ['setNavigator'],
  'tests/test_trip_playback.mjs': ['AT'],
  'tests/test_wind.mjs': ['e0'],
  'tests/test_worlds_films.mjs': ['LATER'],
  'tests/test_year_trip.mjs': ['MERCURY_ORBIT_KM'],
  'scripts/shuttle/build-sts1.mjs': ['recolour', 'require', 'TILE', 'body', 'DOORIN'], // 1.7.1, merged while this test was in review
  'tests/test_moments_voskhod_sts1.mjs': ['T_E'],
  'tools/moments-build/sts1.mjs': ['T_HAC0'],
  'tools/exoface.probe.js': ['s'],
  'tools/moments-build/apollo11.mjs': ['moonRel', 'nearAt'],
  'tools/moments-build/artemis2.mjs': ['rEI', 'fairings'],
  'tools/moments-build/vostok1.mjs': ['g', 'entryGround'],
};


const seenAllowed = new Set();
let reported = 0;
for (const f of files.sort()) {
  const rel = relative(ROOT, f).split('\\').join('/');
  let src;
  try { src = readFileSync(f, 'utf8'); } catch { continue; }
  for (const u of unused(src)) {
    const key = `${rel}:${u.name}`;
    if ((ALLOWED[rel] || []).includes(u.name)) { seenAllowed.add(key); continue; }
    reported++;
    if (reported <= 60) problems.push(`${rel}:${u.line} ${u.how} ${u.name} is declared and never used`);
  }
}
if (!argv.length) {
  for (const [rel, list] of Object.entries(ALLOWED)) for (const nm of list) check(seenAllowed.has(`${rel}:${nm}`), `${rel}: ${nm} is listed as allowed but is no longer unused; delete the entry`);
}
if (reported > 60) problems.push(`... and ${reported - 60} more`);

if (problems.length) {
  console.error('FAIL test_lint\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`ok test_lint (${files.length} files, the unused-names rule holds, ${Object.values(ALLOWED).flat().length} known exceptions)`);
