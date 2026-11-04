// tests/test_nowebgl.mjs -- a browser with no WebGL 2 gets the readable page, from the real code (public #1243).
//
// tests/test_access.mjs reads renderer.js as text and calls showReadable() on its own. This calls
// createRenderer() itself, the function the page calls first, with a canvas that refuses WebGL 2 in the
// three ways a browser does (no context, a thrown error, a context that is not WebGL 2), and holds what
// the visitor is left with: an error the page knows (code no-webgl2), the readable page put over the
// boot panel with links to every trip, and no half-built renderer. The look probe r12-access.js denies
// WebGL 2 in a browser by hand; this is the same denial on every pull request, with nothing to install.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

const index = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
const src = (index.match(/<noscript id="sr-readable-src">([\s\S]*?)<\/noscript>/) || [])[1] || '';
check(src.includes('data-why="gl"') && src.includes('data-why="js"'), 'index.html carries the readable page with its two reasons (JavaScript off, no WebGL 2)');
const hrefs = [...src.matchAll(/<a [^>]*href="([^"]+)"/g)].map((m) => m[1]);
const trips = hrefs.filter((h) => h.startsWith('t/'));
check(trips.length >= 30, `the readable page links every trip (${trips.length})`);

// a document that holds only what showReadable() touches, and remembers what was done to it
function fakeDocument({ withPage = true } = {}) {
  const log = { appended: [], bootHidden: false, glShown: false, jsRemoved: false };
  const jsLine = { remove() { log.jsRemoved = true; } };
  const glLine = { set hidden(v) { log.glShown = !v; }, get hidden() { return !log.glShown; } };
  const page = { markup: src, querySelector: (q) => (q.includes('"js"') ? jsLine : q.includes('"gl"') ? glLine : null) };
  const boot = { set hidden(v) { log.bootHidden = v; }, get hidden() { return log.bootHidden; }, classList: { add() {} } };
  const doc = {
    getElementById: (id) => (id === 'sr-readable-src' && withPage ? { textContent: src } : id === 'boot' ? boot : null),
    createElement: () => ({ set innerHTML(v) { this.html = v; }, content: { getElementById: (id) => (id === 'sr-readable' ? page : null) } }),
    body: { appendChild: (n) => log.appended.push(n) },
  };
  return { doc, log, page };
}

const { createRenderer } = await import(join(ROOT, 'site/js/scene/renderer.js'));

const refusals = {
  'no context at all': { getContext: () => null },
  'a context call that throws': { getContext: () => { throw new Error('GPU process crashed'); } },
};
for (const [what, canvas] of Object.entries(refusals)) {
  const { doc, log, page } = fakeDocument();
  globalThis.document = doc;
  let err = null;
  try { createRenderer(canvas); } catch (e) { err = e; }
  check(err && err.code === 'no-webgl2', `${what}: createRenderer throws the error the page knows (code no-webgl2), got ${err && (err.code || err.message)}`);
  check(err && err.shown === true, `${what}: the error says the readable page was shown`);
  check(log.appended.length === 1 && log.appended[0] === page, `${what}: the readable page is put on the document`);
  check(log.bootHidden === true && log.glShown === true && log.jsRemoved === true, `${what}: the boot panel goes, the WebGL line shows and the JavaScript line goes`);
}

// no readable page in the document: the same error, but it says nothing was shown, so index.html draws its own failure panel
{
  const { doc, log } = fakeDocument({ withPage: false });
  globalThis.document = doc;
  let err = null;
  try { createRenderer({ getContext: () => null }); } catch (e) { err = e; }
  check(err && err.code === 'no-webgl2' && err.shown === false && log.appended.length === 0, 'with no readable page the error still says no-webgl2 and that nothing was shown');
  check(/err\.code === 'no-webgl2' && err\.shown\)\) fail\(/.test(index), 'index.html shows its failure panel only when the readable page was not shown');
}

// a canvas that does give a context must NOT take the fallback (the fallback is for refusals only)
{
  const { doc, log } = fakeDocument();
  globalThis.document = doc;
  let err = null;
  const keep = console.error;
  console.error = () => {}; // three.js complains about the fake context, as it should
  try { createRenderer({ getContext: () => ({}) }); } catch (e) { err = e; } finally { console.error = keep; }
  check(!(err && err.code === 'no-webgl2') && log.appended.length === 0, 'a canvas that gives a context does not show the readable page');
}

if (problems.length) {
  console.error('FAIL test_nowebgl\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`ok test_nowebgl (createRenderer refused two ways: the readable page with ${trips.length} trip links is shown, the page's failure panel only when it is not)`);
