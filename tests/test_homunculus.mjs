// tests/test_homunculus.mjs -- the Homunculus Nebula from its published 3D model (the deep-space review of 2026-11-16):
// the mesh file is the source's mesh (every vertex and triangle, in the paper's un-tilted frame, in polar radii); its
// registry row names the source, the licence and the credit; it is placed by the measured tilt and position angle (the
// far lobe north-west and away from us, the near one toward us), sized by the measured polar radius at the measured
// distance and grown on the clock; the card says what is measured and what is illustrative and carries the credit;
// the Measured look takes the generated mottling off; nothing of it is in the boot graph; its budget.
//
//   node tests/test_homunculus.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { MeshoptDecoder } = await import(join(ROOT, 'site/vendor/meshopt_decoder.module.js'));
const H = await import(join(JS, 'scene/deep/homunculus.js'));
const S = await import(join(JS, 'scene/deep/skyplace.js'));
const M = await import(join(JS, 'scene/deep/meshfile.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const P = (await import(join(JS, 'data/hero-homunculus.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D2R = Math.PI / 180;
await MeshoptDecoder.ready;

// --- 1. the registry: the source, the licence and the credit; shipped under the review policy -------------------------
const sh = P.layers.find((l) => l.part === 'shell');
check(/3dmodel_004/.test(sh.from) && /sha256 [0-9a-f]{64}/.test(sh.from), 'the mesh\'s source file is named with its checksum');
check(sh.credit === "NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen", 'the credit line is ESO\'s, word for word');
check(/CC BY 4\.0/.test(sh.licence) && /read 2026-11-16/.test(sh.licence), 'the licence is quoted with the day it was read');
check(/Steffen/.test(sh.source) && /Smith, N\. 2006/.test(sh.source), 'the shape and the numbers each have their paper');
check(P.shipped === true && P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || ''), 'signed under the lead\'s policy, no astronomer\'s review claimed');
check(P.drawn.includes('reconstruction') && P.drawn.includes('illustration') && /ILLUSTRATIVE/.test(P.colours.note), 'drawn as a reconstruction with an illustrative surface, and the profile says so');
const def = HEROES.find((h) => h.id === 'homunculus');
check(def && def.record === 'dso-homunculus-nebula' && def.stub.shipped === P.shipped && /hero-homunculus/.test(String(def.build)) && !/hero-/.test(String(def.profile)), 'its line in the hero list: a stub now, the profile and the module when it is near');
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'homunculus-nebula');
const eta = (await import(join(JS, 'data/exotics.js'))).EXOTICS.find((e) => e.id === 'eta-carinae');
check(dso && dso.parent === 'carina-nebula' && dso.distLy === 7665 && dso.distLyLow === 7502 && dso.distLyHigh === 7828, 'the record: inside the Carina Nebula, 2 350 +/- 50 pc');
check(dso && eta && near(dso.raDeg, eta.raDeg, 1e-4) && near(dso.decDeg, eta.decDeg, 1e-4) && near(dso.distLy, eta.distLy, 0.5), 'the record is where its star is (registry/exotics.yaml eta-carinae)');
check(near(P.frame.ra_deg, dso.raDeg, 1e-6) && near(P.frame.dec_deg, dso.decDeg, 1e-6) && P.frame.distance_ly === dso.distLy, 'the profile\'s frame is the record\'s place');

// --- 2. the mesh file: the source's own counts, in polar radii, in the paper's un-tilted frame ------------------------
const file = join(ROOT, sh.file);
const buf = readFileSync(file);
const parsed = M.parseMeshFile(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), MeshoptDecoder);
const mesh = parsed.meshes[0];
const nv = mesh.positions.length / 3, nt = mesh.indices.length / 3;
check(parsed.meshes.length === 1 && nv === 8552 && nt === 17101, `the mesh is the source's: 8 552 vertices and 17 101 triangles (${nv}, ${nt})`);
check(parsed.extras && parsed.extras.credit === sh.credit && /CC BY 4\.0/.test(parsed.extras.licence), 'the file carries its own credit and licence');
let yMin = Infinity, yMax = -Infinity, bad = 0;
for (let i = 0; i < nv; i++) { const y = mesh.positions[i * 3 + 1]; if (y < yMin) yMin = y; if (y > yMax) yMax = y; if (!Number.isFinite(mesh.positions[i * 3]) || !Number.isFinite(y) || !Number.isFinite(mesh.positions[i * 3 + 2])) bad++; }
check(bad === 0 && near((yMax - yMin) / 2, 1, 1e-3), `lengths are in polar radii: the two poles are ${(yMax - yMin).toFixed(4)} apart`);
check(near(yMax, parsed.extras.far_pole, 1e-3) && near(-yMin, parsed.extras.near_pole, 1e-3) && near(yMax, 0.9935, 2e-3), 'the far (receding) pole is up the y axis, the near one down it, as the build measured them');
let maxIndex = 0, degenerate = 0;
for (let i = 0; i < nt; i++) { const a = mesh.indices[i * 3], b = mesh.indices[i * 3 + 1], c = mesh.indices[i * 3 + 2]; maxIndex = Math.max(maxIndex, a, b, c); if (a === b || b === c || a === c) degenerate++; }
check(maxIndex === nv - 1 && degenerate === 0, 'every triangle names three different vertices of the file');
// The waist: the star is at the origin, where the two lobes meet (the vertices nearest the equator's plane are close to the axis).
let waist = 0, waistN = 0;
for (let i = 0; i < nv; i++) { const x = mesh.positions[i * 3], y = mesh.positions[i * 3 + 1], z = mesh.positions[i * 3 + 2]; if (Math.abs(y) < 0.03) { waist += Math.hypot(x, z); waistN++; } }
check(waistN > 20 && waist / waistN < 0.45, `the lobes pinch at the origin (mean radius ${(waist / waistN).toFixed(2)} polar radii at the waist, ${waistN} vertices)`);
// The lobes' widest radius: a fat hourglass, not a sphere and not a stick (figure 4 of the paper).
let wide = 0;
for (let i = 0; i < nv; i++) { const y = mesh.positions[i * 3 + 1]; if (Math.abs(y) > 0.3 && Math.abs(y) < 0.7) wide = Math.max(wide, Math.hypot(mesh.positions[i * 3], mesh.positions[i * 3 + 2])); }
check(wide > 0.45 && wide < 0.75, `each lobe is about half as wide as it is long (${wide.toFixed(2)})`);

// --- 3. placement: the measured tilt and position angle --------------------------------------------------------------
const shell = H.shellOf(P);
check(shell.incl === 41 && shell.pa === 310, 'the tilt and the position angle are Smith 2006\'s: 41.0 and 310 degrees');
const far = shell.farPole; // (west, north, toward the Sun)
check(near(Math.hypot(...far), 1, 1e-12), 'the pole\'s direction is a unit vector');
check(far[0] > 0 && far[1] > 0 && far[2] < 0, 'the far lobe points north-west and away from us');
check(near(Math.acos(-far[2]) / D2R, 41, 1e-9), 'its axis is 41 degrees from our line of sight (49 from the plane of the sky)');
const paOf = (v) => ((Math.atan2(-v[0], v[1]) / D2R) + 360) % 360; // north through east; east is minus west
check(near(paOf(far), 310, 1e-9), 'its far end is at position angle 310 degrees');
const t = shell.tilt;
const apply = (v) => [t[0] * v[0] + t[1] * v[1] + t[2] * v[2], t[3] * v[0] + t[4] * v[1] + t[5] * v[2], t[6] * v[0] + t[7] * v[1] + t[8] * v[2]];
const up = apply([0, 1, 0]);
check(near(up[0], far[0], 1e-12) && near(up[1], far[1], 1e-12) && near(up[2], far[2], 1e-12), 'the turn carries the mesh\'s y axis onto that direction');
const det = t[0] * (t[4] * t[8] - t[5] * t[7]) - t[1] * (t[3] * t[8] - t[5] * t[6]) + t[2] * (t[3] * t[7] - t[4] * t[6]);
check(near(det, 1, 1e-12), 'the turn is a rotation (no mirror: the protrusions stay on their sides)');
check(near(apply([1, 0, 0])[2], 0, 1e-12), 'the mesh\'s x axis stays in the plane of the sky (the tilt is about it)');
// Seen from the Sun the near lobe covers the south-east and the far one the north-west: the mesh's own vertices.
let nearSE = 0, nearN = 0, farNW = 0, farN = 0;
const lo = { along: Infinity, across: Infinity }, hi = { along: -Infinity, across: -Infinity };
const ax = [far[0], far[1]].map((v) => v / Math.hypot(far[0], far[1]));
for (let i = 0; i < nv; i++) {
  const p = [mesh.positions[i * 3], mesh.positions[i * 3 + 1], mesh.positions[i * 3 + 2]], s = apply(p);
  const along = s[0] * ax[0] + s[1] * ax[1], across = s[0] * ax[1] - s[1] * ax[0];
  lo.along = Math.min(lo.along, along); hi.along = Math.max(hi.along, along); lo.across = Math.min(lo.across, across); hi.across = Math.max(hi.across, across);
  if (p[1] < -0.3) { nearN++; if (s[0] < 0 && s[1] < 0) nearSE++; if (!(s[2] > 0)) nearSE -= 0; }
  if (p[1] > 0.3) { farN++; if (s[0] > 0 && s[1] > 0) farNW++; }
}
check(nearSE / nearN > 0.75 && farNW / farN > 0.75, `on the sky the near lobe lies south-east of the star and the far one north-west (${(nearSE / nearN * 100).toFixed(0)} % and ${(farNW / farN * 100).toFixed(0)} % of their vertices)`);
check(near(lo.along, sh.extent.along[0], 2e-3) && near(hi.along, sh.extent.along[1], 2e-3) && near(lo.across, sh.extent.across[0], 2e-3) && near(hi.across, sh.extent.across[1], 2e-3), `the registry's outline is the mesh's (along ${lo.along.toFixed(4)} to ${hi.along.toFixed(4)}, across ${lo.across.toFixed(4)} to ${hi.across.toFixed(4)})`);

// --- 4. size and growth: the measured polar radius, the measured age -------------------------------------------------
const AU_LY = 1 / 63241.077;
check(near(H.polarRadiusLy(shell, 2005.17), 21690 * AU_LY, 1e-9), 'in March 2005 each pole is 21 690 au from the star');
check(near(shell.erupted, 1846.37, 0.01), 'the age Smith 2006 gives puts the eruption in 1846');
check(H.polarRadiusLy(shell, 1840) === 0 && H.polarRadiusLy(shell, shell.erupted) === 0, 'before the eruption there is no nebula');
check(near(H.polarRadiusLy(shell, 2005.17 + 158.8) / H.polarRadiusLy(shell, 2005.17), 2, 1e-9), 'twice the age, twice the size');
// The pole's speed this implies is the one the paper lists for it (648 km/s at latitude 89 degrees).
const kmPerS = 21690 * 149597870.7 / (158.8 * 365.25 * 86400);
check(near(kmPerS, 648, 3), `the growth is the paper's own speed at the pole (${kmPerS.toFixed(0)} km/s)`);
const now = H.sizeAt(shell, 2026.88, dso.distLy, sh.extent);
check(near(now.along, 18.7, 0.15) && near(now.across, 11.1, 0.15), `on the sky in late 2026: ${now.along.toFixed(1)} by ${now.across.toFixed(1)} arcseconds`);
check(near(dso.majAxArcmin * 60, now.along, 0.5) && near(dso.minAxArcmin * 60, now.across, 0.5) && dso.posAngDeg === 130, 'the record\'s size and angle on the sky are the model\'s');
const in2012 = H.sizeAt(shell, 2012.2, dso.distLy, sh.extent);
check(in2012.along > 16.5 && in2012.along < 18.5, `in 2012, when the model's data were taken, about 17.5 arcseconds long (${in2012.along.toFixed(1)}): the size the photographs show`);

// --- 5. the hero: built from the file, placed in the scene, two draw calls, the Measured look --------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('stellar');
  const { parseDso } = await import(join(JS, 'data/parsers.js'));
  const rec = parseDso({ objects: [dso] })[0];
  const hero = H.createHero(THREE, { profile: P, record: rec, mesh: parsed });
  check(hero.levels.join() === '2,3' && hero.latchSafe === true && hero.card.copy === 'deepHomunculus', 'what a hero answers: its levels, its card block');
  check(hero.card.drawn['dso-homunculus-nebula'].join() === 'reconstruction,illustration', 'the card is told it is a reconstruction with an illustrative surface');
  hero.setLevel(2, 1);
  const cam = new THREE.PerspectiveCamera(50, 1.6, 0.1, 1e9);
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  const shellMesh = hero.group.getObjectByName('deep-hero-homunculus-shells');
  check(shellMesh && shellMesh.material.depthWrite === true && shellMesh.material.transparent === false, 'the shell is one opaque mesh with depth: dust hides what is behind it');
  check(hero.stats().meshes === 2 && hero.stats().triangles === 17101, 'two draw calls: the shell and the star');
  check(shellMesh.material.uniforms.uMottle.value === 1 && shellMesh.material.uniforms.uShare.value === 1, 'under Film the mottling is drawn');
  hero.frame({ camera: cam, look: 'measured', gain: 1 });
  check(shellMesh.material.uniforms.uMottle.value === 0 && shellMesh.visible, 'under Measured the generated mottling is off and the reconstruction stays');
  check(H.UNDER_MEASURED.shell === 'same' && H.UNDER_MEASURED.mottle === 'hidden' && H.UNDER_MEASURED.growth === 'same', 'the module answers the Measured look for each thing it draws');
  // The far pole in the scene: from the record's place, away from the Sun and to the north-west.
  hero.group.updateMatrixWorld(true);
  const body = hero.group.getObjectByName('deep-hero-homunculus-body');
  const tip = new THREE.Vector3(0, 1, 0).applyMatrix4(body.matrixWorld), origin = new THREE.Vector3(0, 0, 0).applyMatrix4(body.matrixWorld);
  const centre = new THREE.Vector3(), sun = new THREE.Vector3();
  stage.toSceneInto(rec.pos, 'sun-inertial', centre, stage.tMs);
  stage.toSceneInto({ x: 0, y: 0, z: 0 }, 'sun-inertial', sun, stage.tMs);
  const axis = tip.clone().sub(origin), len = axis.length();
  const awayFromSun = centre.clone().sub(sun).normalize();
  check(near(Math.acos(axis.clone().normalize().dot(awayFromSun)) / D2R, 41, 0.01), 'in the scene the far pole is 41 degrees from the line from the Sun through the star');
  check(near(len, hero.stats().polarLy, 1e-3) && near(hero.stats().polarLy, H.polarRadiusLy(shell, S.yearOf(stage.tMs)), 1e-3), `the mesh's unit is the polar radius at the clock's date (${hero.stats().polarLy} ly)`);
  // The clock: a century on, larger; before the eruption, nothing.
  const t0 = stage.tMs;
  stage.setTime(Date.UTC(1800, 0, 1));
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  check(shellMesh.visible === false && hero.stats().polarLy === 0, 'in 1800 nothing is drawn');
  stage.setTime(Date.UTC(2126, 0, 1));
  hero.frame({ camera: cam, look: 'film', gain: 1 });
  check(shellMesh.visible && hero.stats().polarLy > H.polarRadiusLy(shell, 2026) * 1.5, 'in 2126 it is half as large again');
  stage.setTime(t0);
  hero.dispose();
}
check(/logdepthbuf_fragment/.test(H.SHADERS.frag) && /logdepthbuf_vertex/.test(H.SHADERS.vertex), 'the shell writes the renderer\'s logarithmic depth');
check(/uMottle/.test(H.SHADERS.frag) && !/texture2D|sampler2D/.test(H.SHADERS.frag), 'no texture: the surface is computed, and its generated part has a switch');

// --- 6. the card's words: measured and illustrative named, the credit on the card ------------------------------------
await import(join(JS, 'copy/en.deepdata.js'));
const C = COPY.deepHomunculus;
const rows = C.rows['dso-homunculus-nebula'];
check(/Steffen and others, 2014/.test(C.card.homunculus) && /Smith/.test(C.card.homunculus) && /illustrative/.test(C.card.homunculus) && /Not yet reviewed by an astronomer/.test(C.card.homunculus), 'the card\'s sentence names the model, the measurements, what is illustrative and that no astronomer reviewed it');
check(C.card.homunculus.includes('NASA’s Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen'), 'the credit is on the card');
check(rows.some((r) => /^Measured/.test(r[1])) && rows.some((r) => /^Illustrative/.test(r[1])), 'its rows say which part is measured and which illustrative');
check(rows.some((r) => r[1].includes('NASA’s Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen') && /CC BY 4\.0/.test(r[1])), 'a row carries the credit line and the licence');
check(rows.some((r) => /41°/.test(r[1]) && /21 690/.test(r[1])), 'the tilt and the size on the card are the registry\'s numbers');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(credits.includes("NASA's Goddard Space Flight Center/Ed Campion & UNAM/W. Steffen") && /3dmodel_004/.test(credits), 'CREDITS.md carries the credit line and the source');

// --- 7. bytes: small, and not in the boot graph ----------------------------------------------------------------------
const bytes = statSync(file).size;
const cap = BUDGETS.deep_homunculus_bytes;
check(cap > 0 && bytes <= cap, `the mesh is within its budget (${bytes} B of ${cap})`);
check(BUDGETS.deep_homunculus_draw_calls === 2, 'its draw calls have a budget: the shell and the star');
for (const f of ['main.js', 'scene/deep/deepsky.js', 'scene/deep/heroes.js']) {
  const src = readFileSync(join(JS, f), 'utf8');
  check(!/^import[^'"]*['"][^'"]*(homunculus|meshfile|skyplace|en\.deepdata)[^'"]*['"]/m.test(src), `${f} does not import it statically`);
}

if (problems.length) { console.error(problems.map((p) => 'FAIL ' + p).join('\n')); console.error(`\n${problems.length} problem(s)`); process.exit(1); }
console.log('ok: tests/test_homunculus.mjs');
