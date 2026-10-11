// tests/test_lab.mjs -- every simulator in site/lab/ obeys the rules that can be checked by reading its file (docs/ADD_A_SIMULATOR.md).
//
// The Space Radar Lab is a folder of small stand-alone pages, one idea each, that anyone can add to with one file. The rules are
// what keeps a hundred of them honest without a reviewer reading every line: ONE file, no library, no network request, a dated
// source for the numbers, an honesty line, a lesson, small, and listed in the index (which scripts/gen_lab_index.py writes from the
// simulators' own heads). The simulator part is also RUN against a recording canvas so a NaN, a throw or a picture outside the stage
// fails here instead of on a visitor's phone. site/lab/_template/ is held to the same rules; it is just not listed.
//   node tests/test_lab.mjs
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const LAB = join(ROOT, 'site', 'lab');
const MAX_BYTES = 26000, MAX_LINES = 240;
const problems = [];
const bad = (where, msg) => problems.push(`${where}: ${msg}`);
const decode = (s) => s.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

// --- the folder: one file per simulator --------------------------------------------------------
const walk = (d) => readdirSync(d, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]));
const folders = readdirSync(LAB, { withFileTypes: true }).filter((e) => e.isDirectory()).map((e) => e.name).sort();
const listed = folders.filter((f) => !f.startsWith('_'));
if (!folders.includes('_template')) bad('site/lab', 'the starter site/lab/_template/index.html is missing');
if (listed.length < 5) bad('site/lab', `only ${listed.length} simulators`);
if (!existsSync(join(LAB, 'index.html'))) bad('site/lab', 'index.html (the list) is missing: python3 scripts/gen_lab_index.py');
for (const f of readdirSync(LAB, { withFileTypes: true })) if (f.isFile() && f.name !== 'index.html') bad(`site/lab/${f.name}`, 'only index.html (the list) sits directly in site/lab/');
const index = existsSync(join(LAB, 'index.html')) ? readFileSync(join(LAB, 'index.html'), 'utf8') : '';

// --- the simulator part, run against a recording canvas ------------------------------------------
const clamp = (x, a, b) => Math.min(b, Math.max(a, x)), seg = (t, a, b) => clamp((t - a) / (b - a), 0, 1);
const ease = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); }, lerp = (a, b, x) => a + (b - a) * x;
function smoke(where, simSrc) {
  let texts = [], draws = 0;
  const num = (name, args) => { for (const v of args) if (typeof v === 'number' && !Number.isFinite(v)) bad(where, `draw() passed ${v} to ${name}`); };
  const stub = { text: (s, x, y, size) => { texts.push({ s: String(s), x, y }); num('text', [x, y, size]); }, wrap: (s, x, y, size, c, w, lh) => { texts.push({ s: String(s), x, y }); num('wrap', [x, y]); return y + (lh || 40); }, glow: () => { draws++; }, disc: (c, x, y, r) => { draws++; num('disc', [x, y, r]); }, stars: () => { draws++; } };
  const ctx = new Proxy({}, { get: (_, k) => {
    if (k === 'measureText') return (s) => ({ width: String(s).length * 20 });
    if (k === 'createRadialGradient' || k === 'createLinearGradient') return (...a) => { num(String(k), a); return { addColorStop() {} }; };
    if (['fillRect', 'strokeRect', 'arc', 'ellipse', 'moveTo', 'lineTo', 'rect', 'translate', 'scale', 'rotate', 'quadraticCurveTo', 'bezierCurveTo', 'arcTo', 'clearRect', 'setTransform', 'drawImage'].includes(k)) return (...a) => { draws++; num(String(k), a); };
    if (k === 'fillText' || k === 'strokeText') return (s, x, y) => { texts.push({ s: String(s), x, y }); num(String(k), [x, y]); };
    return () => {};
  }, set: () => true });
  let SIM;
  try {
    SIM = new Function('clamp', 'seg', 'ease', 'lerp', 'rev', 'text', 'wrap', 'glow', 'disc', 'stars', 'EMBER', 'INK', 'DIM', 'FONT', 'Y0', 'Y1', 'MINPX', 'cx', 'cv', 'S', 'P', 'T',
      simSrc + '\n;return SIM')(clamp, seg, ease, lerp, (t) => 1, stub.text, stub.wrap, stub.glow, stub.disc, stub.stars, '#ff9f43', '#e8ecf4', '#a3adc0', 'sans-serif', 430, 1440, 34, ctx, { width: 1080, height: 1200 }, 1, 0, 0);
  } catch (e) { bad(where, `the simulator part does not run: ${e.message}`); return null; }
  if (!SIM || typeof SIM !== 'object') { bad(where, 'the simulator part must define const SIM = {...}'); return null; }
  for (const k of ['dur', 'reveal', 'hook', 'honest', 'line', 'draw']) if (SIM[k] == null) bad(where, `SIM.${k} is missing`);
  if (!(SIM.dur >= 6 && SIM.dur <= 40)) bad(where, `SIM.dur ${SIM.dur} is not 6..40 seconds`);
  if (!(SIM.reveal >= 1 && SIM.reveal <= SIM.dur)) bad(where, `SIM.reveal ${SIM.reveal} is not within 1..dur`);
  if (typeof SIM.hook !== 'string' || SIM.hook.split('|').some((l) => !l || l.length > 24) || SIM.hook.split('|').length > 2) bad(where, `SIM.hook ${JSON.stringify(SIM.hook)}: one or two lines (split with |) of 1..24 characters`);
  if (typeof SIM.honest !== 'string' || SIM.honest.length < 30 || SIM.honest.length > 160) bad(where, `SIM.honest (the honesty line) must be 30..160 characters: say what is and is not to scale`);
  const p = SIM.param;
  if (p && !(p.min < p.max && p.step > 0 && p.value >= p.min && p.value <= p.max && typeof p.label === 'string')) bad(where, 'SIM.param needs label, min < max, step > 0 and a value inside');
  const P0 = p ? p.value : 0, ps = p ? [p.min, P0, p.max] : [0];
  for (const P of ps) for (const t of [0, SIM.dur * 0.25, SIM.reveal, SIM.dur * 0.9, SIM.dur]) {
    texts = []; draws = 0;
    try { SIM.draw(ctx, t, P); } catch (e) { bad(where, `draw(ctx, ${t}, ${P}) threw: ${e.message}`); continue; }
    if (draws < 3) bad(where, `draw(ctx, ${t}, ${P}) drew almost nothing`);
    for (const x of texts) if (!(x.y >= 280 && x.y <= 1470 && x.x >= 0 && x.x <= 1080)) bad(where, `text ${JSON.stringify(x.s.slice(0, 24))} at (${Math.round(x.x)}, ${Math.round(x.y)}) is outside the stage band (x 0..1080, y 280..1470)`);
    let line; try { line = SIM.line(P, t); } catch (e) { bad(where, `line(${P}, ${t}) threw: ${e.message}`); continue; }
    if (typeof line !== 'string' || line.length < 40) bad(where, `line(${P}, ${t}) must return a sentence (40+ characters)`);
    else if (/NaN|undefined|Infinity|\[object/.test(line)) bad(where, `line(${P}, ${t}) says ${JSON.stringify(line.slice(0, 80))}`);
  }
  return SIM;
}

// --- each file -----------------------------------------------------------------------------------
const WINDOW_NAMES = new Set('top name status parent self length location origin event closed frames opener screen history stop find print open close focus blur scroll document window navigator performance'.split(' '));
const NETWORK = [[/\bfetch\s*\(/, 'fetch()'], [/XMLHttpRequest/, 'XMLHttpRequest'], [/WebSocket|EventSource|sendBeacon|importScripts|serviceWorker/, 'a network or worker API'], [/\bimport\s*\(|^\s*import\s|\bexport\s/m, 'a module import/export'],
  [/<script[^>]*\ssrc\s*=/i, '<script src>'], [/<(iframe|object|embed|form|video|audio|source|base)\b/i, 'an <iframe>/<object>/<embed>/<form>/<video>/<audio>/<base> element'], [/@import|\burl\(\s*(?!["']?data:)/, 'a CSS @import or a url() that is not a data: URI'],
  [/\s(?:src|href|action|poster)\s*=\s*["']\s*\/\//i, 'a protocol-relative address'], [/<img\b[^>]*\ssrc\s*=\s*["'](?!data:)/i, 'an <img> that is not a data: URI'], [/\bnew\s+Worker\b|Image\s*\(/, 'new Worker / new Image']];
let n = 0;
for (const slug of folders) {
  const dir = join(LAB, slug), where = `site/lab/${slug}`;
  const files = walk(dir).map((f) => relative(dir, f));
  if (files.length !== 1 || files[0] !== 'index.html') { bad(where, `must hold exactly one file, index.html (found: ${files.join(', ')}): one simulator, one file`); continue; }
  const file = join(dir, 'index.html'), text = readFileSync(file, 'utf8');
  n++;
  // A top-level const or let named like something the browser window already owns (top, name, status ...) is a
  // SyntaxError there and the whole page stays blank; node does not mind, so the drawing check below cannot see it.
  for (const ln of text.split('\n')) if (/^(?:const|let)\s/.test(ln)) for (const m of ln.matchAll(/(?:^(?:const|let)\s+|,\s*)([A-Za-z_$][\w$]*)\s*=(?![=>])/g)) if (WINDOW_NAMES.has(m[1])) bad(where, `declares "${m[1]}" at the top of its script: the browser window already has that name, so the page fails to start. Pick another name`);
  const size = statSync(file).size, lines = text.split('\n').length;
  if (size > MAX_BYTES) bad(where, `${size} bytes, over the ${MAX_BYTES} byte budget`);
  if (lines > MAX_LINES) bad(where, `${lines} lines, over ${MAX_LINES}`);
  if (!/^<!doctype html>/i.test(text) || !/<html lang="[a-z-]+"/.test(text) || !/<meta name="viewport"/.test(text)) bad(where, 'needs <!doctype html>, <html lang="en"> and the viewport meta');
  // title, lesson, category
  const title = /<title>(.*?)<\/title>/s.exec(text)?.[1], desc = /<meta name="description" content="(.*?)">/s.exec(text)?.[1], cat = /<meta name="sr-lab-category" content="(.*?)">/s.exec(text)?.[1];
  if (!title || !/^.{3,40} \| Space Radar Lab$/.test(decode(title))) bad(where, `<title> must be "Name | Space Radar Lab" (name 3..40 characters), found ${JSON.stringify(title)}`);
  if (!desc || desc.length < 40 || desc.length > 220) bad(where, '<meta name="description"> is the lesson: ONE sentence, 40..220 characters');
  else if (decode(desc).split(/[.!?]\s+(?=[A-Z])/).length > 1) bad(where, 'the lesson (<meta name="description">) is more than one sentence');
  if (!cat) bad(where, '<meta name="sr-lab-category" content="..."> is missing');
  // the rules about requests: read with comments removed
  const code = text.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const [re, what] of NETWORK) if (re.test(code)) bad(where, `uses ${what}: a simulator is one file that makes no request (the page's one allowed neighbour is ../../css/fonts.css)`);
  const links = [...code.matchAll(/<link\b[^>]*>/gi)].map((m) => m[0]);
  for (const l of links) if (!/rel="stylesheet"/.test(l) || !/href="(\.\.\/\.\.\/css\/fonts\.css)"/.test(l)) bad(where, `${l} : the only <link> allowed is the stylesheet ../../css/fonts.css (the site's own faces)`);
  const urls = [...code.matchAll(/https?:\/\/[^\s"'<>)]+/g)].length, anchors = [...code.matchAll(/<a\b[^>]*\shref="https?:\/\//g)].length;
  if (urls !== anchors) bad(where, `${urls - anchors} web address(es) outside an <a href>: put sources in the "Sources" comment, not in code`);
  // the source comment: a URL and the date it was read
  const sources = [...text.matchAll(/<!--([\s\S]*?)-->/g)].map((m) => m[1]).find((c) => /^\s*sources?\b/i.test(c));
  if (!sources) bad(where, 'needs an HTML comment that starts with "Sources" quoting where each number came from');
  else {
    if (!/https:\/\/[^\s)]+/.test(sources)) bad(where, 'the Sources comment has no https:// address');
    if (!/\b20\d\d-\d\d-\d\d\b/.test(sources)) bad(where, 'the Sources comment has no date read (YYYY-MM-DD)');
  }
  // the simulator part
  const open = text.indexOf('<script>'), mark = text.search(/^\/\/ =+ 2\. THE PAGE/m);
  if (open < 0 || mark < 0 || text.indexOf('<script', open + 8) >= 0) { bad(where, 'needs one <script> with the "// ==== 2. THE PAGE" marker after the simulator part (copy site/lab/_template/)'); continue; }
  const simSrc = text.slice(open + 8, mark);
  if (!/\bconst\s+SIM\s*=/.test(simSrc)) bad(where, 'the simulator part must declare const SIM');
  if (!/honest\s*:\s*["'`]/.test(simSrc)) bad(where, 'no honesty line: SIM.honest says what is and is not to scale');
  smoke(where, simSrc);
  // the page: controls by touch and keyboard, the way back, the way in
  if (!/<button\b/.test(text) || !/type="range"/.test(text)) bad(where, 'needs its controls: a <button> and range inputs (they work by touch and keyboard)');
  if (!text.includes('href="../../index.html"')) bad(where, 'needs a link back to the map (href="../../index.html")');
  if (!text.includes('href="../index.html"')) bad(where, 'needs a link to the list (href="../index.html")');
  if (!/Add your own simulator<\/a>/.test(text) || !text.includes('docs/ADD_A_SIMULATOR.md')) bad(where, 'needs the "Add your own simulator" link to docs/ADD_A_SIMULATOR.md');
  if (!/How this was made and sources/.test(text)) bad(where, 'needs the "How this was made and sources" panel');
  if (!/prefers-reduced-motion/.test(text)) bad(where, 'must honour prefers-reduced-motion');
  // the index lists it
  if (!slug.startsWith('_')) {
    if (!index.includes(`href="${slug}/index.html"`)) bad(where, 'is not in site/lab/index.html: run python3 scripts/gen_lab_index.py');
    if (title && !index.includes(`<h3>${decode(title).replace(/ \| Space Radar Lab$/, '').replace(/&/g, '&amp;')}</h3>`)) bad(where, 'its title in site/lab/index.html is out of date: run python3 scripts/gen_lab_index.py');
  }
}
// the index lists only what exists
for (const m of index.matchAll(/class="card" href="([^"]+)\/index\.html"/g)) if (!listed.includes(m[1])) bad('site/lab/index.html', `lists ${m[1]}, which is not a simulator folder`);
if (index && !index.includes('docs/ADD_A_SIMULATOR.md')) bad('site/lab/index.html', 'needs the "Add your own simulator" link');

// --- the Lab stays out of the app, and into the deploy and the sitemap ---------------------------
const app = [join(ROOT, 'site', 'index.html'), join(ROOT, 'site', 'sw.js'), ...walk(join(ROOT, 'site', 'js')).filter((f) => /\.(js|html)$/.test(f))];
for (const f of app) if (/["'`(]\.{0,2}\/?lab\/(?:index\.html|[a-z0-9-]+\/)/.test(readFileSync(f, 'utf8'))) bad(relative(ROOT, f), 'refers to the Lab: nothing in site/lab/ is loaded by the app');
const deploy = readFileSync(join(ROOT, 'scripts', 'deploy.sh'), 'utf8');
if (!/KNOWN="[^"]*\blab\b/.test(deploy)) bad('scripts/deploy.sh', 'KNOWN does not list lab, so a deploy refuses site/lab/');
if (!/"\$SITE\/lab" "s3:\/\/\$BUCKET\/lab"[^\n]*\\?\n?[^\n]*--delete/.test(deploy) || !/--exclude "_template\/\*"/.test(deploy)) bad('scripts/deploy.sh', 'does not sync site/lab/ (without _template/) to the bucket');
if (!/"\/lab\/\*"/.test(deploy)) bad('scripts/deploy.sh', 'does not invalidate /lab/*');
const seo = readFileSync(join(ROOT, 'scripts', 'build_seo.py'), 'utf8');
if (!/def lab_pages\(/.test(seo) || !/\+ lab_pages\(\)/.test(seo)) bad('scripts/build_seo.py', 'does not put the Lab into the sitemap');
const sw = readFileSync(join(ROOT, 'site', 'sw.js'), 'utf8');
if (!/req\.mode === 'navigate'\) return \{ kind: 'pass'/.test(sw)) bad('site/sw.js', "a navigation must pass through the worker untouched (the Lab's pages are navigations)");

const uniq = [...new Set(problems)];
if (uniq.length) { console.error(`lab FAILED (${uniq.length}):\n  ` + uniq.join('\n  ')); process.exit(1); }
console.log(`lab ok: ${n} folders (${listed.length} simulators + the starter) are one file each with no request, a dated source, an honesty line, a lesson, a small size and a place in the index; the Lab stays out of the app and into the deploy and the sitemap`);
