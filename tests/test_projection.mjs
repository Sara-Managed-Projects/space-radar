// tests/test_projection.mjs -- Dome, 360 and skybox (forge #157): scene/projection.js's maths and the link.
//
//   node tests/test_projection.mjs
//
// THE LINK: `#proj=dome`, `dome,30` and `360` read and write back; anything else is no projection. THE DOME is
// azimuthal equidistant over 180 degrees: its middle is straight ahead, its rim square to it, the angle from the
// middle proportional to the radius, nothing outside the disc; a tilt of 30 puts the view direction 30 degrees
// below the middle. THE 360 frame: its middle is ahead, a quarter round is the right, its top is the up, and
// every pixel is a unit direction. THE CUBE FACES: each face's middle is its axis, neighbouring faces meet along
// the same directions, and the shader's table (read from the source) is the JavaScript's. THE DEVICES: a phone
// gets 512 px faces and says so, a desktop 1024 or 2048, a GPU under 512 none. A snapshot's face is a power of
// two big enough for the picture asked for, within the GPU's limit.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(pathToFileURL(join(ROOT, 'site/js/scene/projection.js')).href);
const U = await import(pathToFileURL(join(ROOT, 'site/js/ui/urlstate.js')).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;
const len = (v) => Math.hypot(...v);
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const unit = (v) => v.map((x) => x / len(v));
const deg = (r) => (r * 180) / Math.PI;
const FWD = [0, 0, -1];

// --- the link -------------------------------------------------------------------------------------------------
check(JSON.stringify(P.parseProj('dome')) === '{"kind":"dome","tiltDeg":0}', 'dome');
check(JSON.stringify(P.parseProj('DOME,30')) === '{"kind":"dome","tiltDeg":30}', 'dome,30');
check(JSON.stringify(P.parseProj('360')) === '{"kind":"360","tiltDeg":0}', '360');
for (const bad of ['', '0', 'fish', 'dome,91', 'dome,-5', '180', 'dome,']) check(P.parseProj(bad) === null, `${JSON.stringify(bad)} is no projection`);
for (const v of ['dome', 'dome,30', 'dome,12.5', '360']) check(P.projValue(P.parseProj(v)) === v, `${v} writes back as itself`);
check(P.projValue(null) === '' && P.projValue({ kind: 'cube' }) === '', 'no projection writes nothing');
check(U.KEYS.includes('path') && U.KEYS.includes('proj') && U.KEYS[U.KEYS.length - 1] === 'cam', 'path and proj are keys of the link, before cam');

// --- the dome -------------------------------------------------------------------------------------------------
check(JSON.stringify(P.domeDir(0, 0)) === JSON.stringify([0, 0, -1]), 'the middle of the dome is straight ahead');
check(P.domeDir(0.8, 0.7) === null, 'outside the disc there is nothing');
for (const [u, v] of [[1, 0], [0, 1], [-0.6, -0.8]]) check(near(dot(P.domeDir(u, v), FWD), 0, 1e-12), `the rim (${u}, ${v}) is square to the view`);
for (const r of [0.1, 0.33, 0.5, 0.9]) {
  const d = P.domeDir(r * Math.cos(1), r * Math.sin(1));
  check(near(deg(Math.acos(dot(d, FWD))), r * 90, 1e-9) && near(len(d), 1, 1e-12), `the angle from the middle is ${r * 90} degrees at radius ${r}`);
}
check(P.domeDir(0.5, 0)[0] > 0 && P.domeDir(0, 0.5)[1] > 0, 'right is right and up is up');
const tilted = P.domeDir(0, 0, 30);
check(near(deg(Math.acos(dot(tilted, FWD))), 30, 1e-9) && tilted[1] > 0, 'tilted 30, the middle looks 30 degrees above the view');
const ahead = P.domeDir(0, -30 / 90, 30);
check(near(dot(ahead, FWD), 1, 1e-12), 'tilted 30, the view direction is drawn a third of the way down');

// --- the 360 frame --------------------------------------------------------------------------------------------
check(near(dot(P.equirectDir(0.5, 0.5), FWD), 1, 1e-12), 'the middle of the 360 frame is ahead');
check(near(P.equirectDir(0.75, 0.5)[0], 1, 1e-12), 'a quarter round is the right');
check(near(P.equirectDir(0.25, 0.5)[0], -1, 1e-12), 'and the left');
check(near(P.equirectDir(0.3, 1)[1], 1, 1e-12) && near(P.equirectDir(0.9, 0)[1], -1, 1e-12), 'the top is up, the bottom down, whatever the longitude');
check(near(dot(P.equirectDir(0, 0.5), FWD), -1, 1e-12) && near(dot(P.equirectDir(1, 0.5), FWD), -1, 1e-12), 'both edges are behind');
let units = true;
for (let i = 0; i <= 10; i += 1) for (let j = 0; j <= 10; j += 1) if (!near(len(P.equirectDir(i / 10, j / 10)), 1, 1e-12)) units = false;
check(units, 'every 360 pixel is a unit direction');

// --- the cube faces -------------------------------------------------------------------------------------------
const AXES = [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]];
AXES.forEach((axis, f) => check(JSON.stringify(unit(P.faceDir(f, 0.5, 0.5))) === JSON.stringify(axis.map((x) => x + 0)), `face ${P.FACE_ORDER[f]}'s middle is its axis`));
// +X's left edge meets +Z's right edge; +Y's bottom edge meets +Z's top edge (the OpenGL table's seams).
for (const v of [0.1, 0.5, 0.9]) check(JSON.stringify(P.faceDir(0, 0, v)) === JSON.stringify(P.faceDir(4, 1, v)), `+X and +Z meet at v=${v}`);
for (const u of [0.1, 0.5, 0.9]) check(JSON.stringify(P.faceDir(2, u, 0)) === JSON.stringify(P.faceDir(4, u, 1)), `+Y and +Z meet at u=${u}`);
const src = readFileSync(join(ROOT, 'site/js/scene/projection.js'), 'utf8');
for (const line of ['vec3(1.0, -t, -s)', 'vec3(-1.0, -t, s)', 'vec3(s, 1.0, t)', 'vec3(s, -1.0, -t)', 'vec3(s, -t, 1.0)', 'vec3(-s, -t, -1.0)', 'r * 1.5707963267948966', 'c * d.y - s * d.z, s * d.y + c * d.z', 'cos(lat) * sin(lon), sin(lat), -cos(lat) * cos(lon)']) {
  check(src.includes(line), `the shader says ${line}, as the JavaScript does`);
}

// --- the devices ----------------------------------------------------------------------------------------------
check(JSON.stringify(P.faceSizeFor({ tier: 0, phone: true, maxCube: 4096 })) === '{"size":512,"reason":"phone"}', 'a phone gets 512 px faces, and says so');
check(P.faceSizeFor({ tier: 1, maxCube: 16384 }).size === 1024 && P.faceSizeFor({ tier: 2, maxCube: 16384 }).size === 2048, 'a laptop 1024, a desktop 2048');
check(P.faceSizeFor({ tier: 2, maxCube: 1024 }).size === 1024, 'never more than the GPU holds');
check(JSON.stringify(P.faceSizeFor({ tier: 2, maxCube: 256 })) === '{"size":0,"reason":"gpu"}', 'a GPU under 512 gets none, and says why');
check(JSON.stringify(P.letterbox(1280, 800, 1)) === '{"x":240,"y":0,"w":800,"h":800}', 'a dome is a square in the middle of a wide screen');
check(JSON.stringify(P.letterbox(390, 844, 2)) === '{"x":0,"y":324,"w":390,"h":195}', 'a 360 frame is a band across an upright phone');
check(P.snapshotFace({ kind: 'dome' }, 4096, 16384) === 2048 && P.snapshotFace({ kind: '360' }, 8192, 16384) === 2048, 'a 4096 dome and an 8192 360 frame want 2048 px faces');
check(P.snapshotFace({ kind: 'dome' }, 8192, 4096) === 4096 && P.snapshotFace({ kind: 'dome' }, 100, 4096) === 512, 'within the GPU, and never under 512');

if (problems.length) {
  console.error(`test_projection: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('test_projection: the link, the dome, the 360 frame, the cube faces and the device sizes hold');
