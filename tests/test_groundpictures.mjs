// tests/test_groundpictures.mjs -- the nebulae's photographs in the sky from the ground
// (sky/groundpictures.js; internal #393 finding 6, #345).
//
//   node tests/test_groundpictures.mjs
//
// Held: how faint a picture is (the sky, the size, the air: a model with an order a person can
// check), that a tap finds the picture it is on, that nothing is fetched until a picture is wide
// enough in view, and that no more than the cap are ever held.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { createGroundPictures, pictureThreshold, pictureStrength, pictureHit } = await import(join(JS, 'sky/groundpictures.js'));
const { limitingMagnitude } = await import(join(JS, 'sky/skymath.js'));
const { exposureLook } = await import(join(JS, 'scene/exposure.js'));
const D = Math.PI / 180;
const radec = (ra, dec) => [Math.cos(dec * D) * Math.cos(ra * D), Math.cos(dec * D) * Math.sin(ra * D), Math.sin(dec * D)];

// 1. How faint. Andromeda (3.4) and the Orion Nebula (4.0) show in a dark sky before any zoom
//    would be needed for a star; the Crab (8.4) needs binoculars' field; nothing shows in a city
//    at a wide field, by day, under the horizon, or under ten pixels.
{
  const s = (o) => pictureStrength({ widthPx: 200, altDeg: 60, ...o });
  const dark = (fov) => limitingMagnitude({ fovDeg: fov, darkness: 'dark', sunAltDeg: -40, moon: 0 });
  const city = (fov) => limitingMagnitude({ fovDeg: fov, darkness: 'city', sunAltDeg: -40, moon: 0 });
  check(pictureThreshold(4) === 5.5 && pictureThreshold(8.4) === 9.4 && pictureThreshold(NaN) === 9.5 && pictureThreshold(12) === 10, 'the threshold: a magnitude past the catalogue number, between 5.5 and 10');
  check(s({ limit: dark(30), vmag: 4.0 }) > 0.9, `the Orion Nebula in a dark 30 degree field: ${s({ limit: dark(30), vmag: 4.0 }).toFixed(2)}`);
  check(s({ limit: dark(30), vmag: 8.4 }) === 0 && s({ limit: dark(5), vmag: 8.4 }) > 0.15 && s({ limit: dark(1), vmag: 8.4 }) > 0.9, 'the Crab: not in a wide field, coming in binoculars, whole in a telescope');
  check(s({ limit: city(60), vmag: 4.0 }) === 0 && s({ limit: city(3), vmag: 4.0 }) > 0.9, 'a city sky hides the Orion Nebula until the field is a telescope\'s');
  check(s({ limit: limitingMagnitude({ fovDeg: 10, sunAltDeg: 5 }), vmag: 3.4 }) === 0, 'nothing by day');
  check(s({ limit: limitingMagnitude({ fovDeg: 10, sunAltDeg: -40, moon: 1 }), vmag: 6 }) < s({ limit: dark(10), vmag: 6 }), 'a full Moon takes the faint ones');
  check(pictureStrength({ limit: 12, vmag: 4, widthPx: 8, altDeg: 60 }) === 0 && pictureStrength({ limit: 12, vmag: 4, widthPx: 25, altDeg: 60 }) > 0, 'a picture appears as you zoom: nothing under ten pixels');
  check(pictureStrength({ limit: 12, vmag: 4, widthPx: 200, altDeg: -2 }) === 0, 'nothing under the horizon');
  const up = pictureStrength({ limit: 12, vmag: 4, widthPx: 200, altDeg: 80 });
  const low = pictureStrength({ limit: 12, vmag: 4, widthPx: 200, altDeg: 5 });
  check(low < up * 0.5 && low > 0, `the air dims it near the horizon (${low.toFixed(2)} against ${up.toFixed(2)})`);
}

// 2. A tap: on the Orion Nebula's own place it is the Orion Nebula; two degrees off it is nothing.
{
  const m42 = NEBULAE.find((r) => r.id === 'm42');
  check(!!pictureHit(m42, radec(m42.ra_deg, m42.dec_deg)), 'the centre of a picture is on it');
  check(pictureHit(m42, radec(m42.ra_deg + 2, m42.dec_deg)) === null, 'two degrees east is not');
  check(pictureHit(m42, radec(m42.ra_deg + 180, -m42.dec_deg)) === null, 'nor the far side of the sky');
  const h = pictureHit(m42, radec(m42.ra_deg, m42.dec_deg + 0.2));
  check(h && h.v > 0.3 && Math.abs(h.u) < 0.1, `north is up in a picture with north up (${h && h.v.toFixed(2)})`);
}

// 3. The layer: nothing fetched at a wide field, the picture in view fetched when it is wide
//    enough, the shutter worn, the cap held.
{
  const root = new THREE.Group();
  const view = new THREE.Group();
  const asked = [];
  const eqToLocal = new THREE.Matrix3();
  const layer = createGroundPictures({
    root, radius: 100, eqToLocal, renderOrder: -98.5, cap: 2,
    load: (url) => { asked.push(url); return Promise.resolve({ dispose() {} }); },
    exposure: () => exposureLook('eye'), magOf: () => 4, nameOf: (id) => id.toUpperCase(),
  });
  check(root.children.length === 1 && root.children[0].children.length === NEBULAE.length, `one mesh per picture (${NEBULAE.length})`);
  // A ground frame in which the Orion Nebula is 60 degrees up in the south: local = M * eq.
  const m42 = NEBULAE.find((r) => r.id === 'm42');
  const c = radec(m42.ra_deg, m42.dec_deg);
  const up = [0, 1, 0];
  const target = [0, Math.sin(60 * D), Math.cos(60 * D)]; // +Z is south
  // Build an orthonormal frame around c and around target, and map one to the other.
  const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
  const unit = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const e1 = unit(cross(c, [0, 0, 1])); const e2 = cross(c, e1);
  const f1 = unit(cross(target, up)); const f2 = cross(target, f1);
  const m9 = [0, 1, 2].flatMap((r) => [0, 1, 2].map((k) => target[r] * c[k] + f1[r] * e1[k] + f2[r] * e2[k]));
  const camera = new THREE.PerspectiveCamera(60, 1.6, 0.1, 1000);
  camera.lookAt(new THREE.Vector3(target[0], target[1], target[2]));
  camera.updateMatrixWorld(true);
  const frame = (fov) => ({ camera, fovDeg: fov });
  layer.update(frame(60), m9, 6.5, 900 / 60, view);
  check(asked.length === 0, `a wide field fetches nothing (${asked.length})`);
  const st0 = layer.state().find((p) => p.id === 'm42');
  check(st0.inView && Math.abs(st0.altDeg - 60) < 0.1, `the Orion Nebula is in view, 60 degrees up (${st0.altDeg.toFixed(2)})`);
  layer.update(frame(3), m9, 10.4, 900 / 3, view);
  check(asked.some((u) => /images\/nebulae\/m42\.webp$/.test(u)), 'closed to 3 degrees, its picture is asked for');
  check(asked.length <= 2, `at most two at a time (${asked.length})`);
  await new Promise((r) => setTimeout(r, 0));
  layer.update(frame(3), m9, 10.4, 900 / 3, view);
  const st = layer.state().find((p) => p.id === 'm42');
  check(st.drawn && st.strength > 0.8, `and drawn once it has landed (${st.strength.toFixed(2)})`);
  const u = root.children[0].children[NEBULAE.indexOf(m42)].material.uniforms;
  check(u.uSaturation.value === exposureLook('eye').nebulaSaturation && u.uGain.value === exposureLook('eye').nebulaGain, 'it wears the shutter: Eye is grey and faint');
  const out = [];
  layer.labels(out, 10.4, 300);
  check(out.some((l) => l.kind === 'dso' && l.text === 'M42'), 'and is named');
  check(layer.pickEq(c) === 'dso-m42', `a tap on it is its record (${layer.pickEq(c)})`);
  check(layer.held() <= 2, `no more than the cap are held (${layer.held()})`);
  // Data saver: nothing is fetched for the view.
  const frugal = [];
  const saver = createGroundPictures({ root, radius: 100, eqToLocal, renderOrder: -98.5, saveData: true, load: (url) => { frugal.push(url); return Promise.resolve({ dispose() {} }); }, magOf: () => 4 });
  saver.update(frame(3), m9, 10.4, 300, view);
  check(frugal.length === 0, 'on a data-saving connection no picture is fetched for the view');
  layer.dispose(); saver.dispose();
  check(root.children.length === 0, 'dispose takes the layer out of the sky');
}

if (problems.length) { console.error('ground pictures FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`ground pictures ok: ${NEBULAE.length} photographs in the sky from the ground, as faint as the sky, the size and the air make them, wearing the shutter; fetched only when wide enough in view, two at a time, never past the cap; a tap finds the one it is on`);
