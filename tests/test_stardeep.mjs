// tests/test_stardeep.mjs -- the 3D star map and the orbital sky over deep time, and their variables (forge #141,
// #142; release 2.0.0 batch c2-deep): scene/stardeep.js's pure parts.
//
//   node tests/test_stardeep.mjs
//
// What it holds:
//   1. THE SHADER: both star shaders still carry the line the motion is put in at (scene/stars3d.js's VERT, and
//      scene/starfield.js's STAR_VERT read from the file); the patched 3D shader moves the point, adds the variables'
//      magnitude in both modes, measures the distance from the moved place, and hides an unmoved star; an unknown
//      shader is refused rather than drawn unmoved.
//   2. THE MOTION ON THE GPU IS THE GROUND SKY'S: normalize(dir + years * driftOf) is sky/starmotion.js moveOne's
//      direction for Barnard's Star in the year 12 000 (to a hundredth of an arcsecond, float64), and its place then
//      is within the literature's tolerance of the f3 test's (3.75 ly from the Sun near AD 11 800).
//   2b. THE MATCH: every motion star but a few doubles at one point finds itself (matchStars of the file against itself), a direction 0.05 degrees off
//      finds nothing, and 109 389 drawn stars are matched in well under a second here.
//   3. THE AXES: eqToEcl and eclToEq undo each other and put the celestial pole at the obliquity from the ecliptic's.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = await import(join(ROOT, 'site/js/scene/stardeep.js'));
const S3 = await import(join(ROOT, 'site/js/scene/stars3d.js'));
const M = await import(join(ROOT, 'site/js/sky/starmotion.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const ANCHOR = 'vec4 mv = modelViewMatrix * vec4( position, 1.0 );';

// 1. the shaders
check(S3.STARS3D_VERT.includes(ANCHOR), 'scene/stars3d.js VERT has the line the motion goes in at');
check(readFileSync(join(ROOT, 'site/js/scene/starfield.js'), 'utf8').includes(ANCHOR), 'scene/starfield.js STAR_VERT has it too');
const p3 = D.patchStarShader(S3.STARS3D_VERT, 'stars3d');
check(/attribute vec4 aMove;/.test(p3) && /attribute float aDMag;/.test(p3) && /uniform float uYears;/.test(p3), 'the 3D shader declares the motion, the variables and the clock');
check(p3.includes('position + aMove.xyz * uYears') && p3.includes('vec4( srP, 1.0 )'), 'the 3D shader draws the moved place');
check(p3.includes('m = aAppMag + aDMag;') && p3.includes('m = aAbsMag + aDMag + 5.0'), 'the variables brighten and fade in both modes');
check(p3.includes('length( srP - cameraPosition )'), 'on a rung the brightness is from the moved place');
check(/uHideUnmoved > 0\.5 && aMove\.w < 0\.5 \) vAlpha = 0\.0;\s*}\s*$/.test(p3), 'an unmoved star is hidden, at the end of main()');
const pf = D.patchStarShader(`void main() {\n  vAlpha = 1.0;\n  ${ANCHOR}\n}\n`, 'starfield');
check(pf.includes('normalize( position + aMove.xyz * uYears )'), 'the orbital sky is moved on its unit sphere');
let refused = false;
try { D.patchStarShader('void main() { gl_Position = vec4(0.0); }', 'stars3d'); } catch { refused = true; }
check(refused, 'a shader without the anchor is refused');

// 2. Barnard's Star: the GPU's formula against moveOne
const m = M.parseMotion(readFileSync(join(ROOT, 'site/data/starmotion.bin')).buffer.slice(0));
let barnard = -1;
for (let i = 0; i < m.count; i += 1) if (m.dist[i] < 6.2 && (barnard < 0 || Math.hypot(m.vel[i * 3], m.vel[i * 3 + 1], m.vel[i * 3 + 2]) / m.dist[i] > Math.hypot(m.vel[barnard * 3], m.vel[barnard * 3 + 1], m.vel[barnard * 3 + 2]) / m.dist[barnard])) barnard = i;
const years = 12000 - 2000;
const d = D.driftOf(m, barnard);
const g = [m.dir[barnard * 3] + d[0] * years, m.dir[barnard * 3 + 1] + d[1] * years, m.dir[barnard * 3 + 2] + d[2] * years];
const gl = Math.hypot(...g);
const c = M.moveOne(m, barnard, years);
const sepAs = Math.acos(Math.min(1, (g[0] * c[0] + g[1] * c[1] + g[2] * c[2]) / gl)) * 206264.8;
check(sepAs < 0.01, `the shell's formula is moveOne's: ${sepAs.toFixed(4)}" apart`);
const placeLy = Math.hypot(...[0, 1, 2].map((k) => m.dir[barnard * 3 + k] * m.dist[barnard] + m.vel[barnard * 3 + k] * (11800 - 2000)));
check(Math.abs(D.distanceAt(m, barnard, 11800 - 2000) - placeLy) < 1e-9 && Math.abs(D.distanceAt(m, barnard, 0) - m.dist[barnard]) < 1e-5, 'distanceAt is the same straight line (the line under the time bar for a selected star)');
check(Math.abs(placeLy - 3.77) < 0.1, `the fastest nearby star (Barnard's) passes at ${placeLy.toFixed(2)} ly about AD 11 800`);

// 2b. the match
const self = D.matchStars(m.dir, m.count, m.dir, m.count, 0.02);
let same = 0;
for (let i = 0; i < m.count; i += 1) if (self[i] === i) same += 1;
check(same / m.count > 0.998, `the file matched against itself: ${same} of ${m.count} find themselves`);
const off = new Float32Array([Math.cos(0.05 * Math.PI / 180), Math.sin(0.05 * Math.PI / 180), 0]);
const one = new Float32Array([1, 0, 0]);
check(D.matchStars(off, 1, one, 1, 0.02)[0] === -1 && D.matchStars(off, 1, one, 1, 0.1)[0] === 0, '0.05 degrees off: outside 0.02, inside 0.1');
const big = new Float32Array(109389 * 3);
for (let i = 0; i < 109389; i += 1) { const k = i % m.count; const n = 1e-5 * ((i * 7919) % 13 - 6); big[i * 3] = m.dir[k * 3] + n; big[i * 3 + 1] = m.dir[k * 3 + 1] - n; big[i * 3 + 2] = m.dir[k * 3 + 2]; }
const tm = Date.now();
D.matchStars(big, 109389, m.dir, m.count, 0.02);
const matchMs = Date.now() - tm;
check(matchMs < 3000, `109 389 drawn stars matched in ${matchMs} ms`);

// 3. the axes
const v = [0.3, -0.5, 0.81];
const back = D.eclToEq(D.eqToEcl(v));
check(Math.hypot(back[0] - v[0], back[1] - v[1], back[2] - v[2]) < 1e-12, 'eqToEcl and eclToEq undo each other');
const pole = D.eqToEcl([0, 0, 1]);
check(Math.abs(Math.acos(pole[2]) * 180 / Math.PI - 23.4392911) < 1e-9, 'the celestial pole is the obliquity from the ecliptic\'s');
check(D.SHELL_UNITS === 1e8 && /const SHELL_UNITS = 1e8;/.test(readFileSync(join(ROOT, 'site/js/scene/stars3d.js'), 'utf8')), 'the shell radius is scene/stars3d.js\'s');

if (problems.length) { console.error(`stardeep: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`); process.exit(1); }
console.log(`stardeep ok: both star shaders patched; 109 389 stars matched in ${matchMs} ms; Barnard's Star by the GPU's formula ${sepAs.toFixed(4)}" from moveOne, ${placeLy.toFixed(2)} ly in AD 11 800`);
