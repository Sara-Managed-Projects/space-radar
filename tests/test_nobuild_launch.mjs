// tests/test_nobuild_launch.mjs -- the README's launch works with nothing built (public #1203).
//
// The README promises: clone it, run `python3 -m http.server 8177 --directory site`, open the page.
// This does the first half of that for real: starts exactly that server on a free port, asks for the
// page, and follows every import the way a browser does. A browser refuses a module script that is
// not served as JavaScript and stops at the first file that is missing, so each file on the way to the
// first frame must come back 200 with a JavaScript type, and nothing may point at a built folder
// (dist, build, node_modules, a hashed bundle). Dynamic imports with a literal path must exist too.
// What it does not do is run the page: the browser walk in screens.yml does that on every pull request.
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (c, m) => { if (!c) problems.push(m); };

// -- the reader, tried on samples -----------------------------------------------------------------
export function specifiers(src) {
  const stat = [];
  const dyn = [];
  for (const m of src.matchAll(/^[ \t]*(?:import|export)\b[^'"`;]*?\bfrom\s*['"]([^'"]+)['"]|^[ \t]*import\s*['"]([^'"]+)['"]/gm)) stat.push(m[1] || m[2]);
  for (const line of src.split('\n')) {
    if (/^\s*(\/\/|\*|\/\*)/.test(line)) continue;
    for (const m of line.matchAll(/\bimport\(\s*['"]([^'"]+)['"]\s*\)/g)) dyn.push(m[1]);
  }
  return { stat, dyn };
}
{
  const s = specifiers("import { a } from './a.js';\nimport * as b from \"../b.js\";\nimport './side.js';\nexport { c } from './c.js';\n// import { z } from './nope.js';\n * import('./nope2.js')\nconst x = await import('./lazy.js');\nimport {\n  d,\n  e,\n} from './multi.js';");
  check(JSON.stringify(s.stat) === JSON.stringify(['./a.js', '../b.js', './side.js', './c.js', './multi.js']), `static specifiers read: ${JSON.stringify(s.stat)}`);
  check(JSON.stringify(s.dyn) === JSON.stringify(['./lazy.js']), `dynamic specifiers read: ${JSON.stringify(s.dyn)}`);
}

// -- the server the README names ------------------------------------------------------------------
const port = await new Promise((resolve) => { const s = createServer(); s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); }); });
const server = spawn('python3', ['-m', 'http.server', String(port), '--directory', 'site', '--bind', '127.0.0.1'], { cwd: ROOT, stdio: 'ignore' });
const stop = () => { try { server.kill('SIGKILL'); } catch { /* already gone */ } };
process.on('exit', stop);
const base = `http://127.0.0.1:${port}`;
const get = async (path) => {
  let last = null;
  for (let attempt = 0; attempt < 4; attempt++) { // a machine under load drops a connection now and then; a missing file is a 404, not a drop
    try { const r = await fetch(base + path); return { status: r.status, type: r.headers.get('content-type') || '', text: await r.text() }; } catch (e) { last = e; await new Promise((r) => setTimeout(r, 300 * (attempt + 1))); }
  }
  return { status: 0, type: '', text: '', error: String(last) };
};
let up = false;
let okLine = '';
for (let i = 0; i < 120 && !up; i++) { up = (await get('/')).status === 200; if (!up) await new Promise((r) => setTimeout(r, 500)); }
check(up, 'python3 -m http.server --directory site did not answer within a minute');

if (up) {
  // the harness sees a missing file as a failure (a 404 here is what a browser would stop at)
  check((await get('/js/no-such-module.js')).status === 404, 'a file that does not exist is not answered 404: the check below could not see a missing module');
  const page = await get('/');
  check(/text\/html/.test(page.type), `the page is served as HTML, not ${page.type}`);
  check(!/(?:src|href)=["'](?:\.?\/)?(?:dist|build|node_modules)\//.test(page.text), 'the page points at a built or installed folder');
  check(!/<script[^>]+src=["'][^"']*\.[0-9a-f]{8,}\.js/.test(page.text), 'the page loads a hashed bundle: that is a build');

  // the page's own module script, its modulepreload list, its stylesheets and icons
  const inline = [...page.text.matchAll(/<script type="module">([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');
  const entry = new Set();
  const first = specifiers(inline);
  for (const s of [...first.stat, ...first.dyn]) entry.add(new URL(s, base + '/').pathname);
  const pre = [...page.text.matchAll(/<link rel="modulepreload" href="([^"]+)"/g)].map((m) => new URL(m[1], base + '/').pathname);
  const assets = [...page.text.matchAll(/<link rel="(?:stylesheet|icon|manifest|apple-touch-icon)"[^>]*?href="([^"#?]+)"/g)].map((m) => m[1]).filter((h) => !/^((https?|data):|\/\/)/.test(h)).map((h) => new URL(h, base + '/').pathname);
  check(entry.size > 0, 'the inline module script imports nothing: the reader found no entry point');
  check(pre.length > 50, `the modulepreload list is the first visit's graph (${pre.length} entries)`);

  const seen = new Map();
  const queue = [...entry, ...pre];
  const dynamicTargets = new Set();
  let files = 0;
  while (queue.length) {
    const batch = queue.splice(0, 6);
    await Promise.all(batch.map(async (p) => {
      if (seen.has(p)) return;
      seen.set(p, null);
      const r = await get(p);
      files++;
      seen.set(p, r.status);
      if (r.status !== 200) { check(false, `${p} came back ${r.status || r.error} (a browser stops at the first missing module)`); return; }
      if (!/javascript|ecmascript/.test(r.type)) { check(false, `${p} is served as "${r.type}": a browser refuses a module that is not JavaScript`); return; }
      const sp = specifiers(r.text);
      for (const s of sp.stat) {
        if (!/^\.{1,2}\//.test(s)) { check(false, `${p} imports "${s}": a bare or absolute specifier needs an import map or a build`); continue; }
        queue.push(new URL(s, base + p).pathname);
      }
      for (const s of sp.dyn) if (/^\.{1,2}\//.test(s)) dynamicTargets.add(new URL(s, base + p).pathname);
    }));
  }
  // lazy modules are not on the way to the first frame, but a literal path must still exist
  let lazy = 0;
  for (const p of [...dynamicTargets].filter((x) => !seen.has(x))) {
    const r = await get(p);
    lazy++;
    check(r.status === 200 && /javascript|ecmascript/.test(r.type), `${p} (a dynamic import) came back ${r.status} as "${r.type}"`);
  }
  for (const p of assets) {
    const r = await get(p);
    check(r.status === 200, `${p} (linked from the page) came back ${r.status}`);
  }
  check(files > 100, `the first visit's graph was followed (${files} files)`);
  okLine = (`ok test_nobuild_launch (the README's server, ${files} modules in the first visit's graph, ${lazy} lazy ones, ${assets.length} linked files: all 200, all JavaScript, nothing built)`);
}
stop();
if (problems.length) {
  console.error('FAIL test_nobuild_launch\n  ' + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(okLine);
