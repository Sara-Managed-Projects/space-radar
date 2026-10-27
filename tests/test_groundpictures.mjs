// tests/test_groundpictures.mjs -- the nebulae and galaxies in the sky from the ground, as soft glows
// (sky/groundpictures.js; internal #393 finding 6, #345; no photographs since release 1.4.0 stage r14-neb-b).
//
//   node tests/test_groundpictures.mjs
//
// Held: how faint a glow is (the sky, the size, the air: a model with an order a person can
// check), that a tap finds the object it is on, that its shape is the catalogue's, and that no file
// is ever fetched: the photographs are gone from the sky.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { createGroundPictures, pictureThreshold, pictureStrength, pictureHit, glowShape } = await import(join(JS, 'sky/groundpictures.js'));
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

// 3. The layer: no file fetched at any field, the glow drawn when the sky, the size and the air allow, its shape
//    and colour the record's, the shutter worn, a dark nebula dark.
{
  const root = new THREE.Group();
  const view = new THREE.Group();
  const eqToLocal = new THREE.Matrix3();
  const m42 = NEBULAE.find((r) => r.id === 'm42');
  const c = radec(m42.ra_deg, m42.dec_deg);
  const OBL = 23.4392911 * D;
  const ecl = (v) => [v[0], v[1] * Math.cos(OBL) + v[2] * Math.sin(OBL), -v[1] * Math.sin(OBL) + v[2] * Math.cos(OBL)];
  const e = ecl(c);
  const record = { id: 'dso-m42', klass: 'dso', pos: { x: e[0] * 1e16, y: e[1] * 1e16, z: e[2] * 1e16 }, meta: { kind: 'nebula', typeCode: 'Cl+N', sizeLy: 24, majAxArcmin: 65, minAxArcmin: 60, posAngDeg: 0, mag: 4 } };
  const fetched = [];
  const realFetch = globalThis.fetch;
  globalThis.fetch = (u) => { fetched.push(String(u)); return Promise.reject(new Error('no')); };
  const layer = createGroundPictures({
    root, radius: 100, eqToLocal, renderOrder: -98.5,
    exposure: () => exposureLook('eye'), magOf: () => 4, nameOf: (id) => id.toUpperCase(), recordOf: (id) => (id === 'm42' ? record : null),
  });
  check(root.children.length === 1 && root.children[0].children.length === NEBULAE.length, `one glow per object (${NEBULAE.length})`);
  const up = [0, 1, 0];
  const target = [0, Math.sin(60 * D), Math.cos(60 * D)]; // +Z is south
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
  const st0 = layer.state().find((p) => p.id === 'm42');
  check(st0.inView && Math.abs(st0.altDeg - 60) < 0.1, `the Orion Nebula is in view, 60 degrees up (${st0.altDeg.toFixed(2)})`);
  layer.update(frame(3), m9, 10.4, 900 / 3, view);
  const st = layer.state().find((p) => p.id === 'm42');
  check(st.drawn && st.strength > 0.8 && st.shaped, `closed to 3 degrees it is drawn, shaped by its record (${st.strength.toFixed(2)})`);
  const mesh = root.children[0].children[NEBULAE.indexOf(m42)];
  const u = mesh.material.uniforms;
  check(!('map' in u) && !/texture2D/.test(mesh.material.fragmentShader), 'a glow, not a picture: the shader reads no texture');
  check(fetched.length === 0 && layer.held() === 0, 'and no file is fetched or held');
  check(u.uSaturation.value === exposureLook('eye').nebulaSaturation && u.uGain.value === exposureLook('eye').milkyWay, 'it wears the shutter as the glows in space do: Eye is grey and faint');
  check(Math.abs(u.uColour.value.x - 1.0) < 1e-6 && u.uColour.value.y < 0.8, `an emission nebula glows hydrogen pink (${u.uColour.value.toArray().map((v) => v.toFixed(2))})`);
  const out = [];
  layer.labels(out, 10.4, 300);
  check(out.some((l) => l.kind === 'dso' && l.text === 'M42'), 'and is named');
  check(layer.pickEq(c) === 'dso-m42', `a tap on it is its record (${layer.pickEq(c)})`);
  layer.dispose();
  check(root.children.length === 0, 'dispose takes the layer out of the sky');
  globalThis.fetch = realFetch;
  // The shape: the catalogue's ellipse in the frame's own coordinates (1 at its edge), round before the record lands.
  const sh = glowShape(m42, record);
  const r = (du, dv) => Math.hypot(sh.ell.x[0] * du + sh.ell.x[1] * dv, sh.ell.y[0] * du + sh.ell.y[1] * dv);
  const half = 65 / 2 / m42.width_arcmin;
  check(Math.abs(sh.ell.u - 0.5) < 0.1 && Math.abs(sh.ell.v - 0.5) < 0.1, `its middle is the record's place (${sh.ell.u.toFixed(2)}, ${sh.ell.v.toFixed(2)})`);
  check(Math.abs(r(half, 0) - 1) < 0.15 || Math.abs(r(0, 65 / 2 / m42.height_arcmin) - 1) < 0.15, 'its edge is the catalogue\'s size');
  const dark = glowShape(NEBULAE.find((x) => x.id === 'horsehead-nebula'), { id: 'dso-horsehead-nebula', klass: 'dso', pos: record.pos, meta: { typeCode: 'DrkN', kind: 'nebula', majAxArcmin: 8 } });
  check(dark.colour.every((v) => v === 0), 'a dark nebula gives off no light: no glow');
}

if (problems.length) { console.error('ground pictures FAILED:\n  - ' + problems.join('\n  - ')); process.exit(1); }
console.log(`ground pictures ok: ${NEBULAE.length} soft glows in the sky from the ground, no photographs, as faint as the sky, the size and the air make them, wearing the shutter, shaped by the catalogue; a tap finds the one it is on`);
