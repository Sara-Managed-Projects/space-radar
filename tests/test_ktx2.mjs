// tests/test_ktx2.mjs -- the KTX2 loader and the Basis transcoder, vendored and lazy (spec 0056
// task 1, internal #155).
//
//   node tests/test_ktx2.mjs
//
// What a browser run proved once (a 2048 x 1024 ETC1S file of the Earth, built by textures.yml,
// drawn by headless Chrome on a GPU; the PR that added this file says how) cannot be re-run here:
// node has no WebGL. This holds everything round it that can silently rot:
//   1. the vendored files are the release's: five byte for byte (SHA-256), two with their import
//      lines and nothing else pointing at this tree;
//   2. nothing on a first visit reaches them: not the boot graph, not the light embed, not the
//      service worker's precached shell; and the deploy sends the WebAssembly as WebAssembly;
//   3. scene/ktx2.js: the twin's address, a map with no twin never asks for the transcoder, a map
//      with one is loaded compressed, and every failure ends in the WebP with the reason kept.
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = join(ROOT, 'site');
const BASIS = join(SITE, 'vendor/basis');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const sha = (p) => createHash('sha256').update(readFileSync(p)).digest('hex');

// --- 1. the files ---------------------------------------------------------------------------------
// SHA-256 of three.js r185's own files (raw.githubusercontent.com/mrdoob/three.js/r185/examples/jsm/,
// read 2026-10-08): utils/WorkerPool.js, libs/ktx-parse.module.js, libs/zstddec.module.js,
// libs/basis/basis_transcoder.js and .wasm.
const RELEASE = {
  'WorkerPool.js': '5ac7095fd566bc9ae48376055fd66edf27cb9ebbf9e1269dc206bfd4933ae9eb',
  'ktx-parse.module.js': 'f40c491f6c44dde511268121f778a0050e73b1a15fd844c1ae2c78c73213eafc',
  'zstddec.module.js': '5cbf818e842628a4464e748594a6deae18ceddda3c2f541e7b3a0ff5fc7611e2',
  'basis_transcoder.js': '8478b5b6d6b74e7d3082b89f6417321d8d1dc0307f2b30d4484bb11b441696a1',
  'basis_transcoder.wasm': '6cf17dc889352c42e9acf8897107978d127005fe3386c36a0e3845e27967630a',
};
const have = readdirSync(BASIS).sort();
check(have.join() === ['ColorSpaces.js', 'KTX2Loader.js', ...Object.keys(RELEASE)].sort().join(), `site/vendor/basis/ holds ${have.join(', ')}: seven files, and nothing the deploy would serve as JavaScript by mistake`);
for (const [name, want] of Object.entries(RELEASE)) check(sha(join(BASIS, name)) === want, `vendor/basis/${name} is not three.js r185's file (SHA-256 differs)`);
let bytes = 0;
for (const name of have) bytes += readFileSync(join(BASIS, name)).length;
{
  const loader = readFileSync(join(BASIS, 'KTX2Loader.js'), 'utf8');
  const spaces = readFileSync(join(BASIS, 'ColorSpaces.js'), 'utf8');
  const specs = (src) => [...src.matchAll(/from\s+'([^']+)'/g)].map((m) => m[1]).filter((s) => !s.startsWith('three/addons'));
  check(specs(loader).sort().join() === ['../three.module.min.js', './ColorSpaces.js', './WorkerPool.js', './ktx-parse.module.js', './zstddec.module.js'].sort().join(), `KTX2Loader.js imports ${specs(loader).join(', ')}`);
  check(specs(spaces).join() === '../three.module.min.js', `ColorSpaces.js imports ${specs(spaces).join(', ')}`);
  check(!/from 'three'/.test(loader + spaces), 'no bare specifier is left: there is no import map');
  check(/new URL\( '\.\/basis_transcoder\.wasm', import\.meta\.url \)/.test(loader) && /new URL\( '\.\/basis_transcoder\.js', import\.meta\.url \)/.test(loader), 'the loader finds its transcoder beside itself');
  // Every name KTX2Loader takes from three is one this build of three exports.
  const names = /import \{([^}]+)\} from '\.\.\/three\.module\.min\.js'/.exec(loader)[1].split(',').map((s) => s.trim()).filter(Boolean);
  const THREE = await import(join(SITE, 'vendor/three.module.min.js'));
  const missing = names.filter((n) => !(n in THREE));
  check(names.length > 30 && !missing.length, `three.module.min.js lacks ${missing.join(', ')} that KTX2Loader imports`);
}

// --- 2. nothing on a first visit ------------------------------------------------------------------
{
  const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
  const graph = (entry) => {
    const seen = new Set();
    const todo = [entry];
    while (todo.length) {
      const path = todo.pop();
      if (seen.has(path)) continue;
      let text;
      try { text = readFileSync(path, 'utf8'); } catch { continue; }
      seen.add(path);
      for (const m of text.matchAll(STATIC)) todo.push(join(dirname(path), m[1]));
    }
    return [...seen].map((p) => relative(SITE, p).split('\\').join('/'));
  };
  for (const entry of ['js/main.js', 'js/embedlite.js']) {
    const reach = graph(join(SITE, entry));
    check(!reach.some((p) => p.startsWith('vendor/basis/') || p === 'js/scene/ktx2.js'), `${entry} reaches the transcoder statically: ${reach.filter((p) => p.includes('basis') || p.endsWith('ktx2.js')).join(', ')}`);
  }
  const mod = readFileSync(join(SITE, 'js/scene/ktx2.js'), 'utf8');
  check(!/^import\s/m.test(mod) && /import\('\.\.\/\.\.\/vendor\/basis\/KTX2Loader\.js'\)/.test(mod), 'scene/ktx2.js imports nothing statically and the loader dynamically');
  check(!/basis|ktx2/i.test(readFileSync(join(SITE, 'index.html'), 'utf8')), 'index.html preloads none of it');
  const shell = execFileSync('python3', ['-c', 'import sys; sys.path.insert(0, "scripts"); import stamp_sw, pathlib; print("\\n".join(stamp_sw.shell_files(pathlib.Path("site"))))'], { cwd: ROOT, encoding: 'utf8' }).split('\n');
  check(shell.includes('vendor/three.module.min.js') && !shell.some((f) => f.startsWith('vendor/basis/')), 'the offline shell precaches three and not the transcoder');
  const deploy = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8');
  check(/--include "\*\.wasm"[\s\\]+--cache-control "\$LONG" --content-type "application\/wasm"/.test(deploy) && /--exclude "\*\.wasm"/.test(deploy), 'deploy.sh sends the .wasm as application/wasm, apart from the JavaScript');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  for (const word of ['Basis Universal transcoder', 'ktx-parse', 'zstddec', 'Apache License', 'Binomial LLC', 'Don McCurdy']) check(credits.includes(word), `CREDITS.md does not name ${word}`);
}

// --- 3. scene/ktx2.js -----------------------------------------------------------------------------
{
  const { createKtx2, ktx2UrlFor } = await import(join(SITE, 'js/scene/ktx2.js'));
  check(ktx2UrlFor('textures/8k_earth_daymap.webp') === 'textures/8k_earth_daymap.ktx2' && ktx2UrlFor('a/b.PNG?v=3') === 'a/b.ktx2?v=3' && ktx2UrlFor('a/b.jpeg') === 'a/b.ktx2', 'the twin of a .webp, .png or .jpeg');
  check(ktx2UrlFor('a/b.glb') === null && ktx2UrlFor('') === null && ktx2UrlFor(null) === null, 'nothing else has a twin');
  const webp = (log) => async (url) => { log.push(url); return { is: 'webp', url }; };
  const renderer = {};
  // No twin: the WebP, and the transcoder is never asked for.
  {
    let imports = 0;
    const k = createKtx2({ renderer, present: [], importLoader: async () => { imports += 1; return {}; } });
    const log = [];
    const got = await k.load('textures/moon.webp', webp(log));
    check(got.format === 'webp' && got.why === undefined && log.join() === 'textures/moon.webp' && imports === 0 && k.stats().transcoder === 'never', `a map with no twin is the WebP and costs no import (${JSON.stringify(k.stats())})`);
  }
  // A twin: loaded through the loader, support detected against the renderer, once.
  {
    let made = 0;
    const asked = [];
    class KTX2Loader {
      constructor() { made += 1; }
      detectSupport(r) { this.r = r; return this; }
      async loadAsync(url) { asked.push([url, this.r === renderer]); return { isCompressedTexture: true, url }; }
      dispose() { this.gone = true; }
    }
    const k = createKtx2({ renderer, present: ['textures/earth.ktx2'], importLoader: async () => ({ KTX2Loader }) });
    const log = [];
    const a = await k.load('textures/earth.webp', webp(log));
    const b = await k.load('textures/earth.webp', webp(log));
    const c = await k.load('textures/moon.webp', webp(log));
    check(a.format === 'ktx2' && a.texture.isCompressedTexture && b.format === 'ktx2' && made === 1 && asked.every(([u, ok]) => u === 'textures/earth.ktx2' && ok), `a map with a twin is loaded compressed, with one loader that was shown the renderer (${made} made)`);
    check(c.format === 'webp' && log.join() === 'textures/moon.webp' && k.has('textures/earth.webp') && !k.has('textures/moon.webp'), 'and the map beside it without one is still the WebP');
    check(JSON.stringify(k.stats()) === JSON.stringify({ ktx2: 2, webp: 1, fellBack: 0, transcoder: 'asked' }), `the count: ${JSON.stringify(k.stats())}`);
  }
  // The file does not parse: the WebP, with the reason. The transcoder is still good for the next.
  {
    let n = 0;
    class KTX2Loader { detectSupport() {} async loadAsync() { n += 1; if (n === 1) throw new Error('not a KTX2 file'); return { ok: true }; } }
    const k = createKtx2({ renderer, present: (u) => u.endsWith('.ktx2'), importLoader: async () => ({ KTX2Loader }) });
    const log = [];
    const a = await k.load('a.webp', webp(log));
    const b = await k.load('b.webp', webp(log));
    check(a.format === 'webp' && a.why === 'not a KTX2 file' && a.texture.url === 'a.webp' && b.format === 'ktx2' && k.stats().fellBack === 1, `a file that does not parse falls back, and the next is tried (${JSON.stringify(k.stats())})`);
  }
  // The transcoder does not arrive (offline): the WebP, and it is not asked for again.
  {
    let imports = 0;
    const k = createKtx2({ renderer, present: () => true, importLoader: async () => { imports += 1; throw new Error('offline'); } });
    const log = [];
    const a = await k.load('a.webp', webp(log));
    const b = await k.load('b.webp', webp(log));
    check(a.format === 'webp' && a.why === 'offline' && b.format === 'webp' && b.why === 'offline' && imports === 1 && k.stats().transcoder === 'failed' && log.join() === 'a.webp,b.webp', `a transcoder that does not load is asked for once (${imports})`);
  }
  // No renderer (a test, a page with no WebGL): the WebP.
  {
    const k = createKtx2({ present: () => true, importLoader: async () => { throw new Error('never'); } });
    const got = await k.load('a.webp', webp([]));
    check(got.format === 'webp' && got.why === undefined, 'with no renderer the WebP is loaded and nothing is tried');
  }
}

if (problems.length) { console.error('ktx2 FAILED (' + problems.length + '):\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ktx2 ok: seven vendored files (${bytes} B, five byte-identical to three.js r185, two with their import lines), out of the boot graph, the light embed and the offline shell; a map with no twin costs nothing, one with a twin is loaded compressed, and every failure ends in the WebP`);
