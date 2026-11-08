// tests/test_sky_shaders_src.mjs -- the sky from the ground's shader text, read as source (internal #547).
// Reads site/js as text, so it is NOT in scripts/check_built_tree.mjs TESTS (the built tree's templates differ).
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(ROOT, 'site/js/sky/groundsky.js'), 'utf8');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const frag = src.slice(src.indexOf('const MW_FRAG'), src.indexOf('// One body as a sphere seen from far away'));
check(/uniform vec2 uTexel;/.test(frag), 'the Milky Way fragment shader declares uTexel');
check(/if \(uTexel\.x > 0\.0\) \{/.test(frag), 'and opens the panorama only when it is set (the star-free 4k map is left as it is)');
check(/c = min\(c, 0\.25 \* \(cl \+ cr \+ cu \+ cd\) \+ 0\.015\);/.test(frag), 'a spike is cut to the mean of four neighbours plus 0.015');
// Since 2.0.0 (forge #14, b200-s1-fixes) each sample is read through mapValue(), which puts the sRGB sampler's linear
// value back into the map's own values before the cut; it must still be the map, read in that one helper.
check(/vec3 mapValue\(vec2 uv\) \{ return pow\(texture2D\(uMap, uv\)\.rgb, vec3\(1\.0 \/ 2\.2\)\); \}/.test(frag), 'the samples are the map in its own values (mapValue)');
check(/mapValue\(vUv \+ vec2\(0\.0, 3\.0 \* uTexel\.y\)\)/.test(frag) && /mapValue\(vUv - vec2\(3\.0 \* uTexel\.x, 0\.0\)\)/.test(frag), 'three texels either way, both axes');
check(/max\(c - 0\.012, 0\.0\)/.test(frag), 'the floor is taken off after the opening, as before');
check(!/\b(half|input|output|sample|filter)\b\s*[=;(]/.test(frag.replace(/\/\/.*$/gm, '')), 'no reserved GLSL word is used as a name');
check(/uTexel: \{ value: new THREE\.Vector2\(0, 0\) \}/.test(src) && /openingTexel\(img && img\.width, img && img\.height\)/.test(src), 'the uniform is made and set each frame from the map in use');
if (problems.length) { console.error('sky shaders (source) FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('sky shaders (source) ok: the Milky Way opening is in the shader and wired to the map in use');
