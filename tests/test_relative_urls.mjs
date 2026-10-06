// tests/test_relative_urls.mjs -- no path in the app starts at the root of the host (internal issue 369).
//
//   node tests/test_relative_urls.mjs
//
// A school serves the folder at http://server/space-radar/. Every path the app asks for must then
// be beside the page, not at the top of the server: `/data/v1/` was the one that was not, and that
// copy drew an Earth with no satellites. This scans the code that runs in the browser (site/js,
// site/css, index.html, the worker, the manifest) for a string, a url() or an href/src that starts
// with `/` and one of the site's own folders, and refuses it by file and line. Comments are not
// code and are skipped; a full https:// address is somebody else's server and is fine; a
// Cache Storage key that is never fetched is named in ALLOWED with its reason.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
// Every directory under site/, read from the tree: a new one is covered the day it is added.
const DIRS = readdirSync(SITE).filter((n) => statSync(join(SITE, n)).isDirectory());
const ROOT_FILES = ['index.html', 'sw.js', 'manifest.webmanifest', 'robots.txt', 'sitemap.xml'];
const ALLOWED = [
  // data/sources.js bulkKey(): the NAME of a Cache Storage entry, built with new URL() so the
  // Cache API accepts it. It is never requested from any server.
  { file: 'js/data/sources.js', has: "'/__sr-bulk/'" },
];

/** JS or CSS with its comments blanked (same length, same line numbers). Strings are left alone. */
export function stripComments(text) {
  let out = '';
  let i = 0;
  let quote = null;
  while (i < text.length) {
    const c = text[i];
    const two = text.slice(i, i + 2);
    if (quote) {
      out += c;
      if (c === '\\') { out += text[i + 1] ?? ''; i += 2; continue; }
      if (c === quote || (quote !== '`' && c === '\n')) quote = null;
      i += 1;
    } else if (two === '/*') {
      const end = text.indexOf('*/', i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop).replace(/[^\n]/g, ' ');
      i = stop;
    } else if (two === '//' && text[i - 1] !== ':' && text[i - 1] !== '\\') {
      const end = text.indexOf('\n', i);
      const stop = end < 0 ? text.length : end;
      out += ' '.repeat(stop - i);
      i = stop;
    } else {
      if (c === '"' || c === "'" || c === '`') quote = c;
      out += c;
      i += 1;
    }
  }
  return out;
}

const names = [...DIRS.map((d) => d + '/'), ...ROOT_FILES].map((n) => n.replace(/[.]/g, '\\.')).join('|');
// A quote, a url( or an = sign's quote, then `/` and one of the site's own names.
const ABSOLUTE = new RegExp(`(["'\`]|url\\(\\s*["']?)/(?:${names})`, 'g');

/** @returns {{line:number, text:string}[]} */
export function absolutePaths(text, { comments = true } = {}) {
  const code = comments ? stripComments(text) : text;
  const hits = [];
  const lines = code.split('\n');
  lines.forEach((line, i) => {
    ABSOLUTE.lastIndex = 0;
    if (ABSOLUTE.test(line)) hits.push({ line: i + 1, text: line.trim().slice(0, 140) });
  });
  return hits;
}

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const problems = [];
// The scanner must see what it claims to see, or a green run proves nothing.
const SELF = [
  ["const B = '/data/v1/';", 1], ['fetch("/textures/a.jpg")', 1], ['x = `/models/${f}`', 1],
  ['a { background: url(/images/a.png) }', 1], ["a { src: url('/fonts/a.woff2') }", 1], ['<link href="/css/ui.css">', 1],
  ['<a href="/index.html">', 1], ["const B = 'data/v1/';", 0], ["// read from '/data/v1/' once", 0],
  ["/* '/data/v1/' */ const a = 1;", 0], ["const u = 'https://www.spaceradar.ai/data/v1/x.json';", 0],
  ["const r = /^site\\//;", 0], ["new URL('../../data/galaxy.bin', here)", 0], ["const s = 'a // b'; const t = '/js/x.js';", 1],
];
for (const [text, want] of SELF) {
  const got = absolutePaths(text).length;
  if (got !== want) problems.push(`the scanner itself: ${JSON.stringify(text)} gave ${got} hit(s), expected ${want}`);
}

const files = [
  ...walk(join(SITE, 'js')).filter((p) => p.endsWith('.js')),
  ...walk(join(SITE, 'css')).filter((p) => p.endsWith('.css')),
  join(SITE, 'index.html'), join(SITE, 'sw.js'), join(SITE, 'manifest.webmanifest'),
];
let scanned = 0;
for (const file of files) {
  const rel = relative(SITE, file).split('\\').join('/');
  const text = readFileSync(file, 'utf8');
  scanned += 1;
  // HTML and JSON have no // comments to strip (and `https://` would be mistaken for one).
  const plain = rel.endsWith('.html') || rel.endsWith('.webmanifest');
  const source = plain ? text.replace(/<!--[\s\S]*?-->/g, (m) => m.replace(/[^\n]/g, ' ')) : text;
  for (const hit of absolutePaths(source, { comments: !plain })) {
    if (ALLOWED.some((a) => a.file === rel && hit.text.includes(a.has))) continue;
    problems.push(`site/${rel}:${hit.line}: a path from the root of the host, which a copy in a subfolder cannot find: ${hit.text}`);
  }
}
for (const a of ALLOWED) {
  if (!readFileSync(join(SITE, a.file), 'utf8').includes(a.has)) problems.push(`ALLOWED names ${a.has} in ${a.file}, which is no longer there: drop the row`);
}

if (problems.length) {
  for (const p of problems) console.error('FAIL ' + p);
  console.error(`\n${problems.length} problem(s). Write the path relative to the page ('data/v1/') or to the module (new URL('../../data/x', import.meta.url)).`);
  process.exit(1);
}
console.log(`relative urls ok: ${scanned} files under site/ ask for nothing from the root of the host (${DIRS.length} folders watched)`);
