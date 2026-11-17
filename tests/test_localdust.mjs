// The Sun's neighbourhood as real 3D dust (internal #423): scene/deep/localdust.js and its two files
// (scripts/build_deep_localdust.py; Edenhofer et al. 2024, Zenodo 8187943, CC BY 4.0).
// Run: node tests/test_localdust.mjs
//
// 1. The files: the bin as its manifest says, the budget, the source and both licences written, what is measured and what is not.
// 2. The data show the Local Bubble: the cube's mean density by shell of distance is near nothing inside 40 pc and rises to
//    a wall round 120 to 200 pc (O'Neill et al. 2024: 170 pc on average); the points are spread over the whole box, not a few clouds.
// 3. The axes: Galactic X is the direction of the Galactic centre (RA 266.405, Dec -28.936) in the sun-inertial frame, and the
//    frame turn keeps lengths; the Galactic plane's thickness shows in the points (Z spread narrower than X and Y).
// 4. The layer with a real three.js: one draw call, off with the camera at home, whole when the camera has left the neighbourhood,
//    off again far out, off under Eye and for a probe's before shot, the layer is listed in DEEP_LAYERS on the stellar rung only.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const D = await import(join(JS, 'scene/deep/localdust.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const X = await import(join(JS, 'scene/exposure.js'));
const { DEEP_LAYERS } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const LY_KM = 9460730472580.8;

const manBytes = readFileSync(join(ROOT, 'site/data/deep/localdust.json'));
const MAN = JSON.parse(manBytes.toString('utf8'));
const binBuf = readFileSync(join(ROOT, 'site/data/deep/localdust.bin'));
const BIN = binBuf.buffer.slice(binBuf.byteOffset, binBuf.byteOffset + binBuf.byteLength);

// 1. The files.
const file = D.parseDust(BIN);
check(file.count === MAN.count && BIN.byteLength === MAN.bin.bytes && file.stride === MAN.stride, `the bin holds the manifest's ${MAN.count} points`);
const fileBytes = manBytes.length + BIN.byteLength;
check(fileBytes <= BUDGETS.deep_localdust_bytes, `the two files are within the budget (${fileBytes} B of ${BUDGETS.deep_localdust_bytes}; registry/budgets.yaml deep_localdust_bytes)`);
check(/Edenhofer/.test(MAN.sources.map) && /8187943/.test(MAN.sources.map) && /CC BY 4\.0/.test(MAN.sources.map) && /CC BY-NC 3\.0 IGO/.test(MAN.licence) && /O'Neill/.test(MAN.sources.bubble), 'the manifest names the map, the Local Bubble paper and both licences');
check(MAN.grid.cellPc === 8 && MAN.grid.boxPc === 640, `the resolution is stated: ${MAN.grid.cellPc} pc cells within ${MAN.grid.boxPc} pc`);
check(/capped/.test(MAN.sampling.weight) && MAN.sampling.samples === MAN.count, 'the sampling law is stated');
let threw = false; try { D.parseDust(new ArrayBuffer(20)); } catch { threw = true; }
check(threw, 'a file that is not the dust file is refused');

// 2. The Local Bubble in the data.
const shell = (r0) => MAN.shells.find((s) => s.fromPc === r0).meanDensity;
check(shell(0) < 1e-5 && shell(120) > 20 * Math.max(shell(0), 1e-6) && shell(120) > shell(0) * 10 && shell(40) < shell(120) / 5, `the cube's mean density: ${shell(0)} within 40 pc, ${shell(40)} at 40 to 80, ${shell(120)} at 120 to 160 pc (the Sun is in a cavity, its wall round 120 to 200 pc)`);
const p = D.pointsOf(file, MAN);
let near = 0, far = 0;
for (let i = 0; i < p.count; i++) {
  const r = Math.hypot(p.pos[i * 3], p.pos[i * 3 + 1], p.pos[i * 3 + 2]);
  if (r < 60) near += 1;
  if (r > 400) far += 1;
}
const share60 = near / p.count, volume60 = (60 / 640) ** 3 * (4 / 3) * Math.PI / 8; // the share of the box a 60 pc sphere is
check(share60 < volume60 * 0.5, `the Sun's own cavity is nearly empty of points (${(share60 * 100).toFixed(2)}% within 60 pc; an even spread would put ${(volume60 * 100).toFixed(2)}%)`);
check(far / p.count > 0.15, `the box is spread, not a few clouds (${(100 * far / p.count).toFixed(0)}% beyond 400 pc)`);
check(Math.max(...MAN.shells.map((s) => s.meanDensity)) === shell(120) || shell(160) > shell(0) * 10, 'the densest shell is a wall beyond the cavity');

// 3. The axes.
const gc = D.galToEcl([1, 0, 0]);
const eqGc = [Math.cos(-28.936 * Math.PI / 180) * Math.cos(266.405 * Math.PI / 180), Math.cos(-28.936 * Math.PI / 180) * Math.sin(266.405 * Math.PI / 180), Math.sin(-28.936 * Math.PI / 180)];
const e = 23.4392911 * Math.PI / 180;
const eclGc = [eqGc[0], eqGc[1] * Math.cos(e) + eqGc[2] * Math.sin(e), -eqGc[1] * Math.sin(e) + eqGc[2] * Math.cos(e)];
check(gc.every((v, i) => Math.abs(v - eclGc[i]) < 5e-3) && Math.abs(Math.hypot(...D.galToEcl([0.3, -0.5, 0.8])) - Math.hypot(0.3, 0.5, 0.8)) < 1e-9, `Galactic X is the direction of the Galactic centre on the sun-inertial axes (${gc.map((v) => v.toFixed(3))} against ${eclGc.map((v) => v.toFixed(3))}), lengths kept`);
{
  // the Galactic Z spread, from the file's own bytes: the dust lies in the disc
  const q = (2 * MAN.grid.boxPc) / 255; let zz = 0, xx = 0;
  for (let i = 0; i < file.count; i++) { const o = i * file.stride; zz += (file.rows[o + 2] * q - 640) ** 2; xx += (file.rows[o] * q - 640) ** 2; }
  check(zz < xx * 0.85, `the dust lies in the Galactic disc (Z rms ${Math.sqrt(zz / file.count).toFixed(0)} pc against X ${Math.sqrt(xx / file.count).toFixed(0)} pc)`);
}

// 4. The layer.
const listed = DEEP_LAYERS.find((l) => l.id === 'localdust');
check(listed && listed.stages.length === 1 && listed.stages[0] === 'stellar', 'a deep layer on the stellar rung only, fetched when it is entered (heroes.js DEEP_LAYERS)');
check(!D.lookFor(X.exposureLook('eye').milkyWay).on && D.lookFor(X.exposureLook('camera').milkyWay).on, 'none under Eye: no eye sees dust');
check(D.fadeFor(0) === 0 && D.fadeFor(1500) > 0.99 && D.fadeFor(5000) > 0.99 && D.fadeFor(30000) === 0, 'faded in as the camera leaves the neighbourhood, whole, then out again far away');
check(/smoothstep\( 20\.0, 90\.0, dpc \)/.test(D.SHADERS.vertex) && !/uTime/.test(D.SHADERS.vertex + D.SHADERS.fragment), 'a point nearer than 20 pc to the camera fades; nothing moves');
stage.setWorld('stellar');
const L = D.createLayer(THREE, { load: async () => ({ manifest: MAN, buffer: BIN }) });
await L.loading;
check(L.stats().loaded && L.stats().points === MAN.count && L.group.children.length === 1, 'the layer builds one Points object from the file');
const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-5, 1e12);
const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial', stage.tMs);
camera.position.set(sun.x, sun.y, sun.z);
L.frame({ camera, stage, gain: 1, visible: true });
check(!L.group.visible, 'off with the camera at home (the sky is the stars\' and the Milky Way\'s)');
camera.position.x = sun.x + 3000 * LY_KM / stage.unitKm;
L.frame({ camera, stage, gain: 1, visible: true });
check(L.group.visible && L.stats().calls === 1 && L.stats().calls <= BUDGETS.deep_localdust_draw_calls, `one draw call, seen from 3 000 ly out (budget ${BUDGETS.deep_localdust_draw_calls})`);
L.group.traverse((o) => { if (o.material && o.material.fragmentShader) for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const m of src.matchAll(/^uniform \w+ (\w+);/gm)) if (!(m[1] in o.material.uniforms) && !/^(modelViewMatrix|projectionMatrix|normalMatrix|viewMatrix|modelMatrix|cameraPosition)$/.test(m[1])) problems.push(`the shader's uniform ${m[1]} is not set`); });
L.frame({ camera, stage, gain: 1, visible: true, before: true });
check(!L.group.visible, 'off for a probe\'s before shot');
L.frame({ camera, stage, gain: X.exposureLook('eye').milkyWay, visible: true });
check(!L.group.visible, 'off under Eye');
camera.position.x = sun.x + 100000 * LY_KM / stage.unitKm;
L.frame({ camera, stage, gain: 1, visible: true });
check(!L.group.visible, 'off again 100 000 ly out');
L.dispose();
check(L.group.children.length === 0, 'dispose gives the buffers back');
const bad = D.createLayer(THREE, { load: async () => { throw new Error('x'); } });
const warn = console.warn; console.warn = () => {};
await bad.loading; console.warn = warn;
check(bad.stats().failed && !bad.stats().loaded, 'a failed fetch is a stat, not a crash');

if (problems.length) { console.error(`localdust: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(`localdust ok: ${MAN.count} points of the Edenhofer 2024 dust map (${MAN.grid.cellPc} pc cells within ${MAN.grid.boxPc} pc), ${fileBytes} B, one draw call; cavity ${shell(0)} within 40 pc against ${shell(120)} at 120 to 160 pc`);
