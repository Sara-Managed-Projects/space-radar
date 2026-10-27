// tests/test_sky_shaders_src.mjs -- the sky's shader text, read as source (internal #547; release 1.4.0, r14-mw-bh).
// Reads site/js as text, so it is NOT in scripts/check_built_tree.mjs TESTS (the built tree's templates differ).
//
// Until release 1.4.0 the ground sky opened a 2k panorama whose stars were baked in (a spike cut in MW_FRAG). There is
// no panorama now: the ground sky draws scene/milkyway.js's band from the galaxy's model, with the air's term, and the
// shaders that do it (and the black holes') must not use a word GLSL reserves as a name.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'site/js/sky/groundsky.js'), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
check(!/const MW_FRAG|uniform vec2 uTexel|openingTexel/.test(src), 'the panorama\'s opening is gone with the panorama');
check(/MW\.createMilkyWay\(\{ tier, ground: true, radius: R \* 0\.99/.test(src) && /milkyWay\.setRotation\(/.test(src) && /milkyWay\.setGain\(/.test(src), 'the ground sky draws the model\'s band, turned into its own axes, at its own gain');
const MW = await import(pathToFileURL(join(ROOT, 'site/js/scene/milkyway.js')).href);
const BH = await import(pathToFileURL(join(ROOT, 'site/js/scene/blackhole.js')).href);
const RESERVED = /\b(half|input|output|sample|filter|active|common|partition|superp|namespace|using|cast|union|template|this|goto|inline|noinline|volatile|public|static|extern|external|interface|long|short|double|fixed|unsigned|sizeof|packed)\b\s*[=;(,)]/;
for (const [name, text] of [...Object.entries(MW.SHADERS).map(([k, v]) => [`milkyway ${k}`, v]), ...Object.entries(BH.SHADERS).map(([k, v]) => [`blackhole ${k}`, v])]) {
  const code = text.replace(/\/\/.*$/gm, '');
  check(!RESERVED.test(code), `${name}: no reserved GLSL word is used as a name`);
  check((code.match(/\{/g) || []).length === (code.match(/\}/g) || []).length && (code.match(/\(/g) || []).length === (code.match(/\)/g) || []).length, `${name}: its braces and brackets balance`);
  check(!/\$\{/.test(code), `${name}: every template value was filled in`);
  check(!/pow\(\s*\(\s*[^()]*-[^()]*\)\s*\/[^,]*,\s*2\.0\s*\)/.test(code), `${name}: no pow() of a base that can be negative (undefined in GLSL)`);
}
if (problems.length) { console.error('sky shaders (source) FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('sky shaders (source) ok: the ground sky wears the model\'s band; the band\'s and the black holes\' shaders are filled in, balanced and free of reserved words');
