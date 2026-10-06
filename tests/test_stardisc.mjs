// tests/test_stardisc.mjs -- a star as a disc of its own size (scene/stardisc.js, public #436), and
// the arithmetic that gives a catalogue star a width (scene/stars3d.js starPhysical).
//
//   node tests/test_stardisc.mjs
//
// The width is an ESTIMATE from two catalogue numbers, so it is held against stars whose radius
// has been measured, with the tolerance the method deserves: a few per cent for white and yellow
// stars, a factor of two for the reddest. The disc itself: where it is, how big, when it shows.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { starPhysical, bolometricCorrection, SUN_RADIUS_KM, SUN_TEFF_K, LY_KM } = await import(join(JS, 'scene/stars3d.js'));
const { createStarDisc, limbDarkening, discOpacity, HIDE_POINT_PX } = await import(join(JS, 'scene/stardisc.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

// 1. The bolometric correction at its published fixed points (Torres 2010, table 1 and section 2).
check(Math.abs(bolometricCorrection(5772) + 0.08) < 0.02, `the Sun's is -0.08 (${bolometricCorrection(5772).toFixed(3)})`);
check(Math.abs(bolometricCorrection(10000) + 0.25) < 0.05, `at 10 000 K it is about -0.25 (${bolometricCorrection(10000).toFixed(3)})`);
check(bolometricCorrection(7000) > -0.05 && bolometricCorrection(7000) < 0.1, 'near 7 000 K it is nearly nothing');
check(bolometricCorrection(2000) === bolometricCorrection(3300), 'held under 3 300 K, where the polynomial runs away');

// 2. Widths against measured ones: [name, absolute V magnitude, B-V, measured radius in Suns, tolerance].
const suns = (m, bv) => starPhysical(m, bv).radiusKm / SUN_RADIUS_KM;
for (const [name, absMag, bv, measured, tol] of [
  ['the Sun', 4.83, 0.65, 1.0, 0.05],
  ['Sirius', 1.43, 0.0, 1.71, 0.1],
  ['Vega', 0.58, 0.0, 2.6, 0.15],
  ['Procyon', 2.66, 0.42, 2.05, 0.15],
  ['Arcturus', -0.30, 1.23, 25.4, 0.2],
  ['Aldebaran', -0.64, 1.54, 45, 0.5],
]) {
  const got = suns(absMag, bv);
  check(Math.abs(got / measured - 1) <= tol, `${name}: ${got.toFixed(2)} Suns wide, measured ${measured} (within ${tol * 100} %)`);
}
// The reddest: the right order of size, and the card says "estimated".
check(suns(-5.85, 1.85) > 300 && suns(-5.85, 1.85) < 1600, `Betelgeuse is hundreds of Suns wide (${suns(-5.85, 1.85).toFixed(0)}; measured 640 to 760)`);
check(suns(15.6, 1.82) > 0.05 && suns(15.6, 1.82) < 0.3, `Proxima is a small fraction of a Sun (${suns(15.6, 1.82).toFixed(3)}; measured 0.15)`);
check(starPhysical(NaN, 0.5) === null, 'no magnitude, no width');
check(starPhysical(4.83, NaN).teffK > 5600 && starPhysical(4.83, NaN).teffK < 5900, 'no colour: taken as Sun-like, as the points are drawn');
check(starPhysical(1, 0.2).how === 'estimated' && /estimated/.test(COPY.card.values ? JSON.stringify(COPY.card) : JSON.stringify(COPY)), 'the method is named, and the card\'s word for it exists');

// 3. The look: the Sun's limb, and when a disc is drawn at all.
check(limbDarkening(1) === 1 && Math.abs(limbDarkening(0) - 0.4) < 1e-12 && limbDarkening(0.5) > 0.6, 'limb darkening: whole at the centre, 0.4 at the edge');
check(discOpacity(1) === 0 && discOpacity(HIDE_POINT_PX) > 0.5 && discOpacity(10) === 1, 'a speck is the catalogue\'s point; from a few pixels the disc is the star');

// 4. The disc on the stellar rung: at the star's place, its true size, and never from inside.
{
  const scene = new THREE.Scene();
  const disc = createStarDisc(scene);
  const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-5, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  const was = stage.worldId;
  stage.setWorld('stellar');
  const sirius = { id: 'hip-32349', klass: 'star', frame: 'sun-inertial', pos: { x: -1.6 * LY_KM, y: 8.1 * LY_KM, z: -2.5 * LY_KM } };
  const phys = starPhysical(1.43, 0.0);
  disc.set(sirius, phys);
  const rUnits = phys.radiusKm / LY_KM;
  const at = (radii) => { camera.position.copy(disc.mesh.position).add(new THREE.Vector3(0, 0, rUnits * radii)); camera.updateMatrixWorld(true); camera.updateProjectionMatrix(); disc.update(camera, renderer); return disc.state(); };
  camera.position.set(0, 0, 0); camera.updateMatrixWorld(true); disc.update(camera, renderer);
  check(!disc.state().drawn && disc.state().radiusPx < 0.01, 'from the Sun, Sirius is a point: no disc');
  check(Math.abs(disc.mesh.position.length() - Math.hypot(1.6, 8.1, 2.5)) < 1e-9, 'the disc stands at the star\'s place, in light-years');
  const twelve = at(12);
  // radius on screen = (R / d) * f * h / 2, f = 1 / tan(22.5 degrees)
  const want = (1 / 12) * (1 / Math.tan((22.5 * Math.PI) / 180)) * 450;
  check(twelve.drawn && Math.abs(twelve.radiusPx - want) < 0.5, `twelve radii out the disc is ${twelve.radiusPx.toFixed(1)} px in radius (${want.toFixed(1)})`);
  check(Math.abs(disc.mesh.material.uniforms.uSize.value / rUnits - 3) < 1e-9, 'the quad reaches three radii: the disc and its glow');
  check(!at(0.9).drawn, 'never drawn from inside the star');
  stage.setWorld('earth');
  disc.set(sirius, phys);
  disc.update(camera, renderer);
  check(!disc.state().drawn, 'on a world\'s stage a star is a direction on a shell: no disc');
  disc.set(null, null);
  check(!disc.state().drawn && disc.state().id === null, 'no selection, no disc');
  stage.setWorld(was);
  disc.dispose();
  check(scene.children.length === 0, 'dispose takes it out of the scene');
}

// 5. Nothing at boot.
{
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    const re = /^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(text))) { const spec = m[1] || m[2]; if (spec.startsWith('.')) walk(resolve(dirname(file), spec)); }
  };
  walk(join(JS, 'main.js'));
  check(!seen.has(join(JS, 'scene/stardisc.js')), 'scene/stardisc.js is not on the first visit\'s static import path');
  check(SUN_TEFF_K === 5772 && SUN_RADIUS_KM === 695700, 'the IAU 2015 nominal Sun');
}

if (problems.length) { console.error('star disc FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`star disc ok: widths from magnitude and colour within tolerance of six measured stars (Sirius ${suns(1.43, 0).toFixed(2)}, Arcturus ${suns(-0.3, 1.23).toFixed(1)} Suns), the reddest to a factor of two; the disc at the star's place and true size, a point until it is a few pixels, never from inside, never at boot`);
