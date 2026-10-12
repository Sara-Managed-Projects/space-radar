// The planets' paths are drawn some pixels wide, not one (internal #444, #454).
//
//   node tests/test_fat_paths.mjs
//
// What is held:
//   1. scene/fatline.js shares the caller's points (no copy: the path cannot drift from the line it
//      replaces), draws one quad per segment, and its shader keeps the logarithmic depth the scene
//      is drawn with, so a world in front of its path still hides it.
//   2. scene/orbitrings.js asks for it by a dynamic import, never a static one, and the page keeps
//      the one-pixel line when the module does not arrive.
//   3. The width is a number of CSS pixels with a name, and wider than the device pixel it replaces
//      at a phone's ratio: PATH_PX * 3 device pixels against 1.
//   4. The share picture of "A year in a minute" asks for its paths wider still
//      (tools/trip-frames.probe.js), as the constellations' picture does for its figure.
// This test reads source files as text, so it is NOT in scripts/check_built_tree.mjs TESTS.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site', 'js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const fat = await import(join(JS, 'scene/fatline.js'));
const rings = await import(join(JS, 'scene/orbitrings.js'));

// 1. The module.
check(fat.segmentCount(241) === 240 && fat.segmentCount(1) === 0 && fat.segmentCount(0) === 0, 'n points are n - 1 segments, and never a negative count');
const pts = new Float32Array(5 * 3).map((_, i) => i);
const mesh = fat.createFatLine(pts, { colour: 0x336699, opacity: 0.55, renderOrder: 1 });
check(mesh.geometry.getAttribute('iA').data.array === pts && mesh.geometry.getAttribute('iB').data.array === pts, 'both ends of a segment are read from the caller\'s own array');
check(mesh.geometry.getAttribute('iA').offset === 0 && mesh.geometry.getAttribute('iB').offset === 3 && mesh.geometry.getAttribute('iA').data.stride === 3, 'segment i runs from point i to point i + 1');
check(mesh.geometry.instanceCount === 0, 'nothing is drawn before the path is built');
mesh.setCount(5);
check(mesh.geometry.instanceCount === 4, `five points draw four quads (${mesh.geometry.instanceCount})`);
mesh.setWidth(6, 1170, 2532);
check(mesh.material.uniforms.uWidth.value === 6 && mesh.material.uniforms.uResolution.value.x === 1170, 'the width and the buffer size reach the shader');
check(mesh.material.depthTest === true && mesh.material.depthWrite === false && mesh.material.transparent === true, 'depth-tested and not written, as the line it replaces was');
check(/logdepthbuf_vertex/.test(mesh.material.vertexShader) && /logdepthbuf_fragment/.test(mesh.material.fragmentShader), 'the shader keeps the scene\'s logarithmic depth');
check(mesh.material.uniforms.uOpacity.value === 0.55, 'the path keeps the line\'s opacity');
// A NAME THE LANGUAGE KEEPS. A variable called `half` was in the vertex shader for an hour on
// 2026-10-09: it does not compile, and two frames of "A year in a minute" had no paths at all.
// Node cannot compile a shader, so the names are checked, and the renderer's verdict is read.
check(fat.reservedWordsIn('float half = 1.0; vec2 ok = vec2(0.0);').join() === 'half', 'the check itself finds a reserved name');
check(fat.reservedWordsIn(mesh.material.vertexShader + mesh.material.fragmentShader).length === 0, `no variable of either shader has a reserved name (${fat.reservedWordsIn(mesh.material.vertexShader + mesh.material.fragmentShader).join()})`);
check(/varying float vDist;/.test(mesh.material.vertexShader) && /varying float vDist;/.test(mesh.material.fragmentShader), 'the varying is declared in both shaders');
check(mesh.broken(null) === null, 'before the renderer has tried the shader nothing is known');
check(mesh.broken({ properties: { get: () => ({ currentProgram: { diagnostics: { runnable: false } } }) } }) === true, 'a program that did not link is broken');
check(mesh.broken({ properties: { get: () => ({ currentProgram: { diagnostics: { runnable: true } } }) } }) === false, 'a program that linked is not');
// A 240-segment path 2 px wide across a 1200 x 504 picture: the share lit, against one pixel.
const one = fat.coveredShare(2000, 1, 1200, 504);
const wide = fat.coveredShare(2000, rings.PATH_PX, 1200, 504);
check(Math.abs(wide / one - rings.PATH_PX) < 1e-9, 'the lit share grows with the width');

// 2. Lazy, and the line stays without it.
const src = readFileSync(join(JS, 'scene/orbitrings.js'), 'utf8');
check(/import\('\.\/fatline\.js'\)/.test(src) && !/^import[^\n]*fatline/m.test(src), 'scene/orbitrings.js imports scene/fatline.js dynamically only');
check(/\.catch\(/.test(src.slice(src.indexOf("import('./fatline.js')"), src.indexOf("import('./fatline.js')") + 300)), 'a failed import is caught: the one-pixel lines stay');
const made = rings.createOrbitRings(null, {});
check(typeof made.setLineScale === 'function' && typeof made.lines === 'function', 'orbitRings has setLineScale and lines');
const { stage } = await import(join(JS, 'scene/stage.js'));
stage.setWorld('sun');
stage.setOrigin(null);
made.update(Date.UTC(2026, 9, 9), ['earth', 'mars']);
const drawn = made.lines();
check(drawn.length === 2 && drawn.every((l) => l.by === 'line' && l.points === rings.RING_SAMPLES + 1), `in node, with no window, the one-pixel lines are what is drawn (${JSON.stringify(drawn)})`);

// 3. The width.
check(Number.isFinite(rings.PATH_PX) && rings.PATH_PX >= 2 && rings.PATH_PX <= 3, `PATH_PX is ${rings.PATH_PX}: wide enough to see, not a ribbon`);
check(/PATH_PX \* lineScale \* dpr/.test(src), 'the width is in CSS pixels: multiplied by the device pixel ratio');
check(/r\.fat\.broken\(renderer\) === true/.test(src) && /group\.remove\(r\.fat\)/.test(src), 'a wide path whose shader did not compile is taken away and the line shown again');

// 4. The picture.
const probe = readFileSync(join(ROOT, 'tools', 'trip-frames.probe.js'), 'utf8');
check(/'a-year-in-a-minute':\s*[\d.]+/.test(probe) && /orbitRings\.setLineScale/.test(probe), 'the year trip\'s share picture asks for wider paths');

if (problems.length) {
  console.error(`fat paths FAILED (${problems.length}):`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`fat paths ok: a path is ${rings.PATH_PX} CSS px wide (${rings.PATH_PX * 3} device px on a phone at 3x, against 1), drawn from the line's own ${rings.RING_SAMPLES + 1} points by a module that is fetched when a path is first asked for`);
