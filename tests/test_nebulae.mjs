// tests/test_nebulae.mjs -- spec 0067: real photographs of the nebulae, pinned where they are, and
// the shutter that says how long the camera looked.
//
//   node tests/test_nebulae.mjs
//
// Four things are held here, each because it can go wrong without anything on screen saying so:
//   1. THE MIRROR. Every picture has a licence, a credit and a page, belongs to a deep-sky object
//      the map draws, and its object's catalogue position falls INSIDE the picture -- a centre
//      copied from the wrong row puts Orion's photograph on empty sky and nothing else notices.
//   2. THE MATHS that lays a flat picture on the celestial sphere: the basis is orthonormal, north
//      and east are where the convention says, the corners span the picture's own angles, and
//      known neighbours land on the right side (M32 below Andromeda's core, M110 above it).
//   3. THE SHUTTER. Eye < Camera < Deep on every brightness, Camera is the sky as it was, the
//      choice survives a storage that throws.
//   4. NOTHING AT BOOT. No module the first visit loads imports the pictures' module or their
//      registry, statically; a built layer fetches nothing until a picture is wide enough in view
//      or its object is selected; and on a data-saving connection only the selected one.
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { readFileSync, existsSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const {
  createNebulae, pictureBasis, pictureCorners, pictureHalfExtent, skyToPicture, eqToEcl, viewFade, nearFade, PICTURE_FOR,
} = await import(join(JS, 'scene/nebulae.js'));
const { EXPOSURES, DEFAULT_EXPOSURE, EXPOSURE_KEY, exposureLook, readExposure, writeExposure, createExposure } = await import(join(JS, 'scene/exposure.js'));
const { skyToSunInertialKm } = await import(join(JS, 'data/parsers.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const D2R = Math.PI / 180;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const angle = (a, b) => Math.acos(Math.min(1, Math.max(-1, dot(a, b)))) / D2R;

// ---------------------------------------------------------------------------------- 1. the mirror
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const dsoById = new Map(dso.map((o) => [o.id, o]));
check(NEBULAE.length >= 15 && NEBULAE.length <= 30, `15 to 30 pictures (${NEBULAE.length})`);
check(new Set(NEBULAE.map((r) => r.id)).size === NEBULAE.length, 'one picture per object');
for (const want of ['m42', 'm8', 'm20', 'm16', 'm17', 'north-america-nebula', 'rosette-nebula', 'carina-nebula', 'm31', 'm33', 'm45', 'helix-nebula', 'm57', 'm27', 'm1', 'veil-nebula', 'lmc', 'smc']) {
  check(PICTURE_FOR.has(`dso-${want}`), `the famous ones are there: ${want}`);
}
let total = 0;
for (const r of NEBULAE) {
  const where = `nebulae[${r.id}]`;
  const o = dsoById.get(r.id);
  check(!!o, `${where}: is a deep-sky object in site/data/dso.json`);
  check(r.licence === 'CC BY 4.0', `${where}: licence is CC BY 4.0 (${r.licence})`);
  check(typeof r.credit === 'string' && r.credit.length > 2, `${where}: has a credit`);
  check(!/digitized sky survey|\bDSS\b|mellinger/i.test(r.credit), `${where}: the credit does not name a survey we may not ship`);
  check(/^https:\/\/(esahubble\.org|www\.eso\.org|noirlab\.edu)\/public\/images\/|^https:\/\/esahubble\.org\/images\//.test(r.page), `${where}: links to its archive page (${r.page})`);
  check(Object.keys(COPY.exposure.colours).includes(r.colours), `${where}: colours is one of the card's sentences (${r.colours})`);
  check(r.colours === 'unstated' ? !r.filters : typeof r.filters === 'string' && r.filters.length > 0, `${where}: names its filters, unless it says they are unstated`);
  check(r.width_arcmin > 0.5 && r.width_arcmin < 900 && r.height_arcmin > 0.5 && r.height_arcmin < 900, `${where}: a sane size (${r.width_arcmin} x ${r.height_arcmin} arcmin)`);
  check(r.north_deg >= -180 && r.north_deg <= 180, `${where}: north_deg in [-180, 180]`);
  const file = join(ROOT, r.file);
  check(existsSync(file), `${where}: ${r.file} is in the tree`);
  if (existsSync(file)) {
    const bytes = readFileSync(file).length;
    total += bytes;
    check(bytes <= BUDGETS.nebula_picture_bytes, `${where}: ${bytes} B is inside nebula_picture_bytes (${BUDGETS.nebula_picture_bytes})`);
  }
  if (o) {
    const at = skyToPicture(r, o.raDeg, o.decDeg);
    check(!!at && at.u > 0.02 && at.u < 0.98 && at.v > 0.02 && at.v < 0.98, `${where}: the object's catalogue position is inside its picture (u ${at && at.u.toFixed(2)}, v ${at && at.v.toFixed(2)})`);
    // ...and the picture is of a size that could be this object: not a tenth of it, not thirty times it.
    if (o.majAxArcmin > 0) {
      const k = Math.max(r.width_arcmin, r.height_arcmin) / o.majAxArcmin;
      check(k > 0.25 && k < 30, `${where}: ${Math.max(r.width_arcmin, r.height_arcmin)} arcmin of picture for an object ${o.majAxArcmin} arcmin across`);
    }
  }
}
check(total <= BUDGETS.nebulae_total_bytes, `all the pictures are inside nebulae_total_bytes (${total} of ${BUDGETS.nebulae_total_bytes})`);

// ----------------------------------------------------------------------------------- 2. the maths
for (const r of NEBULAE) {
  const b = pictureBasis(r);
  const ortho = Math.abs(dot(b.centre, b.right)) < 1e-12 && Math.abs(dot(b.centre, b.up)) < 1e-12 && Math.abs(dot(b.right, b.up)) < 1e-12;
  const unit = near(dot(b.centre, b.centre), 1, 1e-12) && near(dot(b.right, b.right), 1, 1e-12) && near(dot(b.up, b.up), 1, 1e-12);
  check(ortho && unit, `${r.id}: centre, right and up are orthonormal`);
  // Seen from inside the sphere: right x up points back at the viewer, not out through the picture.
  const cross = [b.right[1] * b.up[2] - b.right[2] * b.up[1], b.right[2] * b.up[0] - b.right[0] * b.up[2], b.right[0] * b.up[1] - b.right[1] * b.up[0]];
  check(dot(cross, b.centre) < -0.999999, `${r.id}: the picture faces the viewer (east is to the left of north)`);
  const c = pictureCorners(r);
  const mid = (p, q) => { const m = [p[0] + q[0], p[1] + q[1], p[2] + q[2]]; const l = Math.hypot(...m); return m.map((x) => x / l); };
  check(near(angle(mid(c[0], c[3]), mid(c[1], c[2])) * 60, r.width_arcmin, r.width_arcmin * 1e-6 + 1e-6), `${r.id}: the corners span its width`);
  check(near(angle(mid(c[0], c[1]), mid(c[2], c[3])) * 60, r.height_arcmin, r.height_arcmin * 1e-6 + 1e-6), `${r.id}: the corners span its height`);
  const mid0 = skyToPicture(r, r.ra_deg, r.dec_deg);
  check(near(mid0.u, 0.5, 1e-9) && near(mid0.v, 0.5, 1e-9), `${r.id}: its own centre is its middle`);
}
{
  // The convention, on a picture made for the purpose: north up, on the equator at RA 90.
  const flat = { ra_deg: 90, dec_deg: 0, width_arcmin: 60, height_arcmin: 60, north_deg: 0 };
  const b = pictureBasis(flat);
  check(near(b.up[2], 1, 1e-12), 'north_deg 0: up is celestial north');
  check(near(b.right[0], 1, 1e-12), 'north_deg 0: right is west (toward smaller right ascension)');
  const east = skyToPicture(flat, 90.25, 0), north = skyToPicture(flat, 90, 0.25);
  check(east.u < 0.5 && near(east.v, 0.5, 1e-9), `a point to the east is on the left (u ${east.u.toFixed(3)})`);
  check(north.v > 0.5 && near(north.u, 0.5, 1e-9), `a point to the north is above (v ${north.v.toFixed(3)})`);
  check(near(east.u, 0.25, 1e-3) && near(north.v, 0.75, 1e-3), 'a quarter of a degree is a quarter of a 60-arcminute picture');
  // north_deg 90: north is turned a quarter turn to the LEFT of up, so east is down.
  const turned = { ...flat, north_deg: 90 };
  const n2 = skyToPicture(turned, 90, 0.25), e2 = skyToPicture(turned, 90.25, 0);
  check(n2.u < 0.5 && near(n2.v, 0.5, 1e-9), `north_deg 90: north is on the left (u ${n2.u.toFixed(3)})`);
  check(e2.v < 0.5 && near(e2.u, 0.5, 1e-9), `north_deg 90: east is down (v ${e2.v.toFixed(3)})`);
  check(skyToPicture(flat, 270, 0) === null, 'the far side of the sky is behind the picture, not on it');
}
{
  // Real neighbours, from the catalogue: the Trapezium in Orion's picture, the two companions in
  // Andromeda's. A mirrored or upside-down placement fails these and passes everything above.
  const m42 = PICTURE_FOR.get('dso-m42');
  const trap = skyToPicture(m42, 83.8186, -5.3897); // theta-1 Orionis C
  check(trap.u > 0.42 && trap.u < 0.5 && trap.v > 0.58 && trap.v < 0.66, `the Trapezium is just up and to the left of the middle of Orion's picture (u ${trap.u.toFixed(3)}, v ${trap.v.toFixed(3)})`);
  const m43 = skyToPicture(m42, dsoById.get('m43').raDeg, dsoById.get('m43').decDeg);
  check(m43.v > trap.v && m43.u < trap.u, 'M43 is north-east of the Trapezium: above it and to its left');
  const m31 = PICTURE_FOR.get('dso-m31');
  const m32 = skyToPicture(m31, dsoById.get('m32').raDeg, dsoById.get('m32').decDeg);
  const m110 = skyToPicture(m31, dsoById.get('m110').raDeg, dsoById.get('m110').decDeg);
  check(m32.v < 0.5 && m32.u > 0.3 && m32.u < 0.7, `M32 is south of Andromeda's core, in the picture (u ${m32.u.toFixed(2)}, v ${m32.v.toFixed(2)})`);
  check(m110.v > 0.5 && m110.u > 0.5 && m110.u < 1, `M110 is north-west of it: above and to the right (u ${m110.u.toFixed(2)}, v ${m110.v.toFixed(2)})`);
}
{
  const e = eqToEcl([Math.cos(-5 * D2R) * Math.cos(84 * D2R), Math.cos(-5 * D2R) * Math.sin(84 * D2R), Math.sin(-5 * D2R)]);
  const p = skyToSunInertialKm(84, -5, 1);
  const l = Math.hypot(p.x, p.y, p.z);
  check(near(e[0], p.x / l, 1e-9) && near(e[1], p.y / l, 1e-9) && near(e[2], p.z / l, 1e-9), 'the pictures and the deep-sky records share one equatorial-to-ecliptic rotation');
  check(viewFade(1) === 1 && viewFade(Math.cos(20 * D2R)) === 1 && viewFade(Math.cos(55 * D2R)) === 0 && viewFade(-1) === 0, 'a picture is whole on its line of sight and gone from the side and from behind');
  const f40 = viewFade(Math.cos(40 * D2R));
  check(f40 > 0 && f40 < 1, 'and fades in between');
  check(nearFade(2) === 1 && nearFade(0.1) === 0, 'and is gone before the camera is inside it');
}

// ---------------------------------------------------------------------------------- 3. the shutter
{
  check(EXPOSURES.join() === 'eye,camera,deep' && DEFAULT_EXPOSURE === 'camera', 'three exposures; Camera by default');
  const eye = exposureLook('eye'), cam = exposureLook('camera'), deep = exposureLook('deep');
  check(cam.nebulaGain === 1 && cam.nebulaGamma === 1 && cam.nebulaSaturation === 1 && cam.milkyWay === 1, 'Camera is the picture as taken and the Milky Way as it always was');
  // What a mid-grey of the picture comes out as: gain * 0.5^gamma.
  const out = (l, v) => l.nebulaGain * Math.pow(v, l.nebulaGamma);
  for (const v of [0.1, 0.3, 0.5, 0.8]) check(out(eye, v) < out(cam, v) && out(cam, v) < out(deep, v), `eye < camera < deep at picture value ${v}`);
  check(out(eye, 0.3) < 0.05, `to the eye the faint gas is all but gone (${out(eye, 0.3).toFixed(3)})`);
  check(eye.nebulaSaturation < 0.2 && deep.nebulaSaturation >= 1, 'the night eye sees no colour');
  check(eye.milkyWay < 1 && deep.milkyWay > 1, 'the Milky Way follows the shutter');
  check(JSON.stringify(exposureLook('nonsense')) === JSON.stringify(cam), 'an unknown mode is Camera');
  const mem = (init = {}) => { const m = { ...init }; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, m }; };
  const throwing = { getItem() { throw new Error('private mode'); }, setItem() { throw new Error('private mode'); }, removeItem() { throw new Error('private mode'); } };
  check(readExposure(mem()) === 'camera' && readExposure(mem({ [EXPOSURE_KEY]: 'eye' })) === 'eye' && readExposure(mem({ [EXPOSURE_KEY]: 'x' })) === 'camera', 'the stored choice is read; an unknown one is Camera');
  check(readExposure(throwing) === 'camera' && writeExposure(throwing, 'deep') === false, 'a storage that throws gives Camera and does not throw');
  const s = mem();
  const ex = createExposure({ storage: s });
  const heard = [];
  ex.onChange((mode, look, byVisitor) => heard.push([mode, look.milkyWay, byVisitor]));
  check(ex.set('deep') === true && s.m[EXPOSURE_KEY] === 'deep' && ex.mode() === 'deep', 'a choice is kept and remembered');
  check(ex.set('deep') === false && ex.set('hubble') === false && heard.length === 1 && heard[0][0] === 'deep' && heard[0][2] === true, 'the same choice and an unknown one change nothing');
  ex.set('camera');
  check(!(EXPOSURE_KEY in s.m), 'the default is stored as nothing');
  // Public #460: a shared link's shutter is worn for the page and never stored.
  {
    const kept = new Map([[EXPOSURE_KEY, 'eye']]);
    const st = { getItem: (k) => (kept.has(k) ? kept.get(k) : null), setItem: (k, v) => kept.set(k, v), removeItem: (k) => kept.delete(k) };
    const linked = createExposure({ storage: st, initial: 'deep' });
    check(linked.mode() === 'deep' && kept.get(EXPOSURE_KEY) === 'eye', 'a link\'s exposure is worn and the visitor\'s own choice stays stored');
    check(createExposure({ storage: st, initial: 'nonsense' }).mode() === 'eye' && createExposure({ storage: st, initial: undefined }).mode() === 'eye', 'an unknown or missing one is the stored choice');
  }
  const ex2 = createExposure({ storage: throwing });
  check(ex2.set('eye') === true && ex2.mode() === 'eye', 'with no storage the choice still holds for the page');
  for (const m of EXPOSURES) {
    check(COPY.exposure.modes[m] && COPY.exposure.modes[m].split(' ').length <= 2, `the ${m} button has a label of two words or fewer`);
    check(COPY.exposure.notes[m] && COPY.exposure.notes[m].length <= 60, `the ${m} line is one line of chrome (${(COPY.exposure.notes[m] || '').length} characters)`);
  }
}

// ----------------------------------------------------------------------------- 4. nothing at boot
{
  // Every module main.js reaches through STATIC imports: the first visit's JavaScript.
  const seen = new Set();
  const walk = (file) => {
    if (seen.has(file) || !existsSync(file)) return;
    seen.add(file);
    const text = readFileSync(file, 'utf8');
    const re = /^\s*(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm;
    let m;
    while ((m = re.exec(text))) {
      const spec = m[1] || m[2];
      if (spec.startsWith('.')) walk(resolve(dirname(file), spec));
    }
  };
  walk(join(JS, 'main.js'));
  check(seen.size > 60, `the walk saw the app (${seen.size} modules)`);
  for (const lazy of ['scene/nebulae.js', 'data/nebulae.js']) {
    check(!seen.has(join(JS, lazy)), `${lazy} is not on the first visit's static import path`);
  }
  check(seen.has(join(JS, 'scene/exposure.js')), 'scene/exposure.js is: the Milky Way wears the shutter from the first frame');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(!/nebulae/.test(html), 'index.html preloads neither the module nor a picture');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/scene\/nebulae\.js'\)/.test(main), 'main.js imports the pictures dynamically');

  // A built layer, a camera looking at Orion from the Earth's stage, and a loader that counts.
  stage.setWorld('earth');
  const calls = [];
  const load = (url) => { calls.push(url); return Promise.resolve(new THREE.Texture()); };
  const scene = new THREE.Scene();
  const skyGroup = new THREE.Group();
  skyGroup.scale.setScalar(1000);
  scene.add(skyGroup);
  skyGroup.updateMatrixWorld(true);
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  const lookAt = (row) => { const c = pictureBasis(row).centre; camera.position.set(0, 0, 0); camera.lookAt(c[0], c[1], c[2]); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); };

  const n = createNebulae(scene, { skyGroup, load, base: 'https://example.invalid/' });
  check(calls.length === 0, 'building the layer fetches nothing');
  const m42 = PICTURE_FOR.get('dso-m42');
  lookAt(m42);
  n.update(camera, renderer, true, false);
  check(calls.length === 0, `Orion's picture is 1 degree wide: at a 45 degree view it is not fetched (${calls.length})`);
  const lmc = PICTURE_FOR.get('dso-lmc');
  lookAt(lmc);
  n.update(camera, renderer, true, false);
  // The Small Cloud is 21 degrees from the Large one and 5 degrees wide: in the same view, and fetched with it.
  check(calls.some((u) => /images\/nebulae\/lmc\.webp$/.test(u)) && calls.every((u) => /nebulae\/(lmc|smc)\.webp$/.test(u)), `the Large Magellanic Cloud, 9 degrees wide and in view, is (${calls.join(', ')})`);
  const inView = calls.length;
  n.update(camera, renderer, true, false);
  check(calls.length === inView, 'once');
  n.want('dso-m42');
  check(calls.length === inView + 1 && /images\/nebulae\/m42\.webp$/.test(calls[inView]), 'a selected object\'s picture is fetched whatever its size');
  n.want('dso-m13');
  check(calls.length === inView + 1, 'an object with no picture asks for nothing');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  n.update(camera, renderer, true, false);
  check(n.loaded().includes('dso-lmc') && n.state().find((p) => p.id === 'lmc').sky === true, 'a landed picture in view is drawn on the sky');
  n.update(camera, renderer, false, false);
  check(n.state().every((p) => !p.sky && !p.place), 'the deep-sky layer\'s switch hides the pictures');
  n.setSkyOpacity(0);
  n.update(camera, renderer, true, false);
  check(n.state().every((p) => !p.sky), 'the sky\'s pictures go when the sky does (registry/lod.yaml sky-panorama)');
  for (const p of [n.skyGroup, n.group]) p.traverse((o) => {
    if (!o.material) return;
    check(o.material.transparent === false && o.material.depthTest === false && o.material.blending === THREE.AdditiveBlending, `${o.name}: additive, depth test off, in the opaque list`);
  });

  // On a data-saving connection: only what is selected.
  const saved = [];
  const n2 = createNebulae(scene, { skyGroup, load: (url) => { saved.push(url); return Promise.resolve(new THREE.Texture()); }, base: 'https://example.invalid/', saveData: true });
  n2.update(camera, renderer, true, false);
  check(saved.length === 0, 'saving data: a picture in view is not fetched');
  n2.want('dso-lmc');
  check(saved.length === 1, 'saving data: the selected one is');

  // At their places, on the stellar rung: Orion's picture stands 1 344 light-years out, as wide
  // as its angle makes it there, and is drawn from the Sun's side only.
  stage.setWorld('stellar'); stage.setTime(Date.parse('2026-10-03T12:00:00Z'));
  const o = dsoById.get('m42');
  const LY_KM = 9460730472580.8;
  const rec = { id: 'dso-m42', pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM } };
  n.setSkyOpacity(0);
  n.setRecords([rec]);
  const st = () => n.state().find((p) => p.id === 'm42');
  check(st().placed === true && n.state().filter((p) => p.placed).length === 1, 'a picture is placed once its object\'s distance is known, and not before');
  const centreEcl = eqToEcl(pictureBasis(m42).centre);
  const distLy = Math.hypot(...o.posLy); // the record's own distance: the file rounds posLy to 0.01 ly
  const at = stage.toScene({ x: centreEcl[0] * distLy * LY_KM, y: centreEcl[1] * distLy * LY_KM, z: centreEcl[2] * distLy * LY_KM }, 'sun-inertial');
  const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial');
  const place = n.group.children.find((c) => c.name === 'nebula-m42');
  const e = place.matrix.elements;
  check(near(Math.hypot(e[12] - at.x, e[13] - at.y, e[14] - at.z), 0, 1e-6), 'it stands on the line to the picture\'s centre, at the object\'s distance');
  const half = pictureHalfExtent(m42);
  check(near(Math.hypot(e[0], e[1], e[2]), distLy * half.x, 1e-6) && near(Math.hypot(e[4], e[5], e[6]), distLy * half.y, 1e-6), `and is ${(2 * distLy * half.x).toFixed(1)} light-years wide there: its angle at its distance`);
  const view = (from) => { camera.position.copy(from); camera.lookAt(at); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); n.update(camera, renderer, true, true); return st(); };
  check(view(sun).place === true && st().alpha === 1, 'from the Sun it is drawn whole');
  check(view(at.clone().multiplyScalar(2)).place === false, 'from behind it is not drawn: the back of a photograph is a mirror image');
  const side = at.clone().add(new THREE.Vector3().crossVectors(at, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(300));
  check(view(side).place === false, 'nor from the side, where a flat picture of a cloud would be a lie');
  check(n.drawn('dso-m42') === 0 && view(sun) && n.drawn('dso-m42') === 1 && n.drawn('dso-m31') === 0, 'drawn() says how much of a photograph is on screen, for Andromeda\'s model to step back by');
  stage.setWorld('earth');
  n.rebuild();
  n.update(camera, renderer, true, false);
  check(n.state().every((p) => !p.place), 'on a world\'s stage nothing stands at a place');
  n.dispose(); n2.dispose();
}

// --------------------------------------------- 5. the shutter moves the other faint light too
// Internal #343: Eye, Camera and Deep moved the pictures and the panorama and nothing else. The
// Milky Way model and the deep-sky glows are the same faint light and wear the same number.
{
  const { createGalaxy } = await import(join(JS, 'scene/galaxy.js'));
  const { createDsoGlow } = await import(join(JS, 'scene/dsoglow.js'));
  const galaxy = createGalaxy(null);
  const glow = createDsoGlow(null);
  check(typeof galaxy.setExposure === 'function' && typeof glow.setExposure === 'function', 'the galaxy model and the glows take the shutter');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check((main.match(/galaxy\.setExposure\(/g) || []).length === 2 && (main.match(/dsoGlow\.setExposure\(/g) || []).length === 2, 'main.js hands both the shutter at boot and on every change');
  check(exposureLook('eye').milkyWay < 1 && exposureLook('deep').milkyWay > 1, 'and the number they are handed is under 1 for Eye, over 1 for Deep');
}

if (problems.length) { console.error('nebulae FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`nebulae ok: ${NEBULAE.length} licensed pictures inside their objects' fields, the tangent-plane maths, the shutter's three looks, and nothing fetched at boot`);
