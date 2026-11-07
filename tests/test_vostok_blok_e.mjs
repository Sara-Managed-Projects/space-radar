// tests/test_vostok_blok_e.mjs -- SL-3 R/B is the Vostok third stage, Blok E, and wears its own file (release 2.0.0, batch m2-buses; forge #60).
//   1. A rocket named SL-3 R/B gets vostok-blok-e.glb (made from dimensions, not generic); its debris and a satellite of that name do not.
//   2. The generic stage still answers every other stage name, and the six stages that are held (Zenit-2, Tsyklon-3, Long March 4B and 2C, Ariane 40, Blok DM, Breeze-M) keep it:
//      a held family never wears a guess.
//   node tests/test_vostok_blok_e.mjs
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const { realModelFor } = await import(pathToFileURL(join(ROOT, 'site/js/scene/realmodels.js')).href);
const rec = (name, klass) => ({ id: `x-${name}`, name, klass, layer: 'active', meta: {} });

const e = realModelFor(rec('SL-3 R/B', 'rocket'));
check(e && e.file === 'vostok-blok-e.glb' && e.made === 'dimensions' && !e.generic, `SL-3 R/B wears ${e && (e.file || e.build)}`);
check(existsSync(join(ROOT, 'site/models/vostok-blok-e.glb')), 'vostok-blok-e.glb is not on disc');
check(!realModelFor(rec('SL-3 DEB', 'debris')) || realModelFor(rec('SL-3 DEB', 'debris')).file !== 'vostok-blok-e.glb', 'SL-3 debris wears the stage');
check(!realModelFor(rec('SL-3 R/B', 'satellite')) || realModelFor(rec('SL-3 R/B', 'satellite')).file !== 'vostok-blok-e.glb', 'a satellite named SL-3 R/B wears the stage');
for (const held of ['SL-16 R/B', 'SL-14 R/B', 'CZ-4B R/B', 'CZ-4C R/B', 'CZ-2C R/B', 'ARIANE 40 R/B', 'SL-12 R/B(2)', 'BREEZE-M R/B']) {
  const g = realModelFor(rec(held, 'rocket'));
  check(g && g.build === 'stage' && !g.file && g.generic === true, `${held} is held and must keep the generic stage (got ${g && (g.file || g.build)})`);
}
if (problems.length) { console.error('vostok blok e FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('vostok blok e ok: SL-3 R/B wears the Blok E file; its debris does not; the held stages keep the generic stage');
