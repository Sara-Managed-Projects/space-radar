// tests/test_starholes.mjs -- our stars step aside inside a drawn photograph (internal #344, scene/starholes.js).
//   1. The JS twin: hidden at the picture's centre, whole outside its inscribed circle, soft between, never more than the picture's own strength.
//   2. setHoles writes the cosines the shader reads and caps at MAX_HOLES, strongest first as nebulae.holes() sorts them.
//   3. Both star shaders carry the hole (and break at once with none); nebulae.js feeds main.js; a picture's inscribed circle is inside its rectangle.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const H = await import(join(JS, 'scene/starholes.js'));
const N = await import(join(JS, 'scene/nebulae.js'));
const rot = (deg) => [Math.sin(deg * Math.PI / 180), 0, Math.cos(deg * Math.PI / 180)];
const hole = { dir: [0, 0, 1], radius: 0.05, k: 1 };
check(H.holeFactor([0, 0, 1], [hole]) === 0, 'a star at the centre of a drawn picture is hidden');
check(H.holeFactor(rot(0.05 * 0.69 * 180 / Math.PI), [hole]) < 0.001, 'inside 0.70 of the inscribed radius it is hidden');
check(H.holeFactor(rot(0.05 * 0.96 * 180 / Math.PI), [hole]) === 1, 'outside 0.95 of it every star is drawn');
let mono = true, prev = 0;
for (let a = 0; a <= 0.06; a += 0.0005) { const f = H.holeFactor(rot(a * 180 / Math.PI), [hole]); if (f < prev - 1e-12) mono = false; prev = f; }
check(mono, 'moving out from the centre, stars come back and never go again');
check(Math.abs(H.holeFactor([0, 0, 1], [{ ...hole, k: 0.4 }]) - 0.6) < 1e-12, 'a picture drawn at 0.4 hides 0.4 of the stars under it');
check(H.holeFactor([0, 0, 1], []) === 1 && H.holeFactor([0, 0, 1], null) === 1 && H.holeFactor([0, 0, 1], [{ ...hole, k: 0 }]) === 1, 'no hole, no change');
const two = [hole, { dir: rot(10), radius: 0.05, k: 1 }];
check(H.holeFactor([0, 0, 1], two) === 0 && H.holeFactor(rot(10), two) === 0 && H.holeFactor(rot(5), two) === 1, 'two holes hide two places and nothing between');
// the uniforms
const u = H.holeUniforms();
const list = Array.from({ length: 6 }, (_, i) => ({ dir: rot(i * 3), radius: 0.04, k: 1 - i * 0.1 }));
check(H.setHoles(u, list) === H.MAX_HOLES && u.uHoleCount.value === 4, `${H.MAX_HOLES} holes at most`);
check(Math.abs(u.uHoleE.value[0].x - Math.cos(0.04 * H.OUTER)) < 1e-12 && Math.abs(u.uHoleE.value[0].y - Math.cos(0.04 * H.INNER)) < 1e-12, 'the cosines the shader reads are those of 0.95 and 0.70 of the radius');
check(H.setHoles(u, []) === 0 && u.uHoleCount.value === 0, 'an empty list clears them');
// the inscribed circle sits inside the picture
const rows = (await import(join(JS, 'data/nebulae.js'))).NEBULAE;
let wrong = 0;
for (const row of rows) { const h = N.pictureHalfExtent(row); const r = Math.atan(Math.min(h.x, h.y)); if (!(r <= Math.atan(h.x) + 1e-12 && r <= Math.atan(h.y) + 1e-12)) wrong++; }
check(rows.length > 20 && wrong === 0, `the inscribed circle is inside every one of ${rows.length} pictures`);
// the shaders and the wiring
const sf = readFileSync(join(JS, 'scene/starfield.js'), 'utf8'); const s3 = readFileSync(join(JS, 'scene/stars3d.js'), 'utf8');
const nb = readFileSync(join(JS, 'scene/nebulae.js'), 'utf8'); const main = readFileSync(join(JS, 'main.js'), 'utf8');
for (const [name, src] of [['starfield.js', sf], ['stars3d.js', s3]]) {
  check(/\$\{HOLES_GLSL_HEAD\}/.test(src) && /if \( uHoleCount > 0 \) vAlpha \*= starHole\( normalize\( mv\.xyz \) \);/.test(src), `${name}'s vertex shader steps a star aside inside a picture, and only with a hole`);
  check(/\.\.\.holeUniforms\(\)/.test(src) && /setHoles/.test(src), `${name} exposes setHoles`);
}
check(/holes: \(\) =>/.test(nb) && /pushHole\(p, /.test(nb), 'scene/nebulae.js says where its pictures are');
check(/ctx\.starfield\.setHoles\(holes\)/.test(main) && /ctx\.stars3d\.setHoles\(holes\)/.test(main), 'main.js hands them to both star fields each frame');
check(!/\bhalf\b|\binput\b|\boutput\b|\bsample\b|\bfilter\b/.test(H.HOLES_GLSL_HEAD.replace(/\/\/.*$/gm, '')), 'the GLSL uses no reserved word');
if (problems.length) { console.error('starholes FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('starholes ok: stars hidden inside a drawn picture\'s inscribed circle (0.70 out to 0.95 of its radius), both star shaders, at most 4 pictures, nothing changed with none');
