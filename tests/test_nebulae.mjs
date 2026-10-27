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
//   4. NOTHING AT BOOT, AND NO PHOTOGRAPH IN THE SCENE (0078 r14-neb-b). No module the first visit loads
//      imports the pictures' module or their registry, statically; a built layer fetches and draws
//      nothing but the one picture the card's slider asks for, by the slider's share.
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

await import(join(JS, 'copy/en.later.js')); // the sections outside the first visit (internal #405)
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
  check(/^https:\/\/(esahubble\.org|www\.eso\.org|noirlab\.edu)\/public\/images\/|^https:\/\/(esahubble|esawebb)\.org\/images\//.test(r.page), `${where}: links to its archive page (${r.page})`);
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
      check(k > (r.part ? 0.1 : 0.25) && k < 30, `${where}: ${Math.max(r.width_arcmin, r.height_arcmin)} arcmin of picture for an object ${o.majAxArcmin} arcmin across`);
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

  // 0078 r14-neb-b: NO PHOTOGRAPH IN THE SCENE. A built layer fetches and draws nothing -- not on a world's sky, not at a
  // place on the ladder, not for a selection, not on any shutter -- until the card's slider asks for one picture.
  const calls = [];
  const load = (url) => { calls.push(url); return Promise.resolve(new THREE.Texture()); };
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.1, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  stage.setWorld('earth');
  const n = createNebulae(scene, { load, base: 'https://example.invalid/' });
  check(calls.length === 0, 'building the layer fetches nothing');
  check(!('skyGroup' in n) && typeof n.setSkyOpacity !== 'function' && typeof n.prefetch !== 'function', 'no photograph on a world\'s sky and none asked for by a trip: the sky half is gone');
  const m42 = PICTURE_FOR.get('dso-m42');
  stage.setWorld('stellar'); stage.setTime(Date.parse('2026-10-03T12:00:00Z'));
  const o = dsoById.get('m42');
  const LY_KM = 9460730472580.8;
  const rec = { id: 'dso-m42', pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM } };
  n.setRecords([rec]);
  const st = () => n.state().find((p) => p.id === 'm42');
  check(st().placed === true && n.state().filter((p) => p.placed).length === 1, 'the slider\'s picture is placed once its object\'s distance is known, and not before');
  const centreEcl = eqToEcl(pictureBasis(m42).centre);
  const distLy = Math.hypot(...o.posLy);
  const at = stage.toScene({ x: centreEcl[0] * distLy * LY_KM, y: centreEcl[1] * distLy * LY_KM, z: centreEcl[2] * distLy * LY_KM }, 'sun-inertial');
  const sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial');
  const view = (from) => { camera.position.copy(from); camera.lookAt(at); camera.updateMatrixWorld(true); camera.matrixWorldInverse.copy(camera.matrixWorld).invert(); n.update(camera, renderer, true); return st(); };
  n.want('dso-m42');
  view(sun);
  check(calls.length === 0 && n.drawn('dso-m42') === 0 && st().place === false, 'selected and seen from the Sun, along the line it was taken on: still no photograph (the 3D model draws it)');
  check(n.holes().length === 0, 'and no hole in the stars for one');
  // The slider: one picture, at its place, by the slider's share, flat and facing the Sun.
  n.setCompare('dso-m42', 0);
  check(calls.length === 0, 'the slider at the model fetches nothing');
  n.setCompare('dso-m42', 1);
  check(calls.length === 1 && /images\/nebulae\/m42\.webp$/.test(calls[0]), 'moved toward the photograph, it fetches that one picture');
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  view(sun);
  check(st().place === true && near(n.drawn('dso-m42'), 1, 1e-9) && n.compareShare('dso-m42') === n.drawn('dso-m42'), 'from the Sun the slider\'s photograph is drawn whole, and the hero gives way by as much');
  const place = n.group.children.find((c) => c.name === 'nebula-compare-m42');
  const e = place.matrix.elements;
  check(near(Math.hypot(e[12] - at.x, e[13] - at.y, e[14] - at.z), 0, 1e-6), 'it stands on the line to the picture\'s centre, at the object\'s distance');
  const half = pictureHalfExtent(m42);
  check(near(Math.hypot(e[0], e[1], e[2]), distLy * half.x, 1e-6) && near(Math.hypot(e[4], e[5], e[6]), distLy * half.y, 1e-6), `and is ${(2 * distLy * half.x).toFixed(1)} light-years wide there: its angle at its distance`);
  check(place.material.transparent === false && place.material.depthTest === false && place.material.blending === THREE.AdditiveBlending, 'additive, depth test off, in the opaque list');
  check(n.holes().length === 1 && n.holes()[0].id === 'm42', 'our stars step aside inside it while it is drawn');
  n.setCompare('dso-m42', 0.5);
  view(sun);
  check(near(n.drawn('dso-m42'), 0.5, 1e-9), 'half way, half of it');
  n.setCompare('dso-m42', 1);
  check(view(at.clone().multiplyScalar(2)).place === false, 'from behind it is not drawn: the back of a photograph is a mirror image');
  const side = at.clone().add(new THREE.Vector3().crossVectors(at, new THREE.Vector3(0, 1, 0)).normalize().multiplyScalar(300));
  check(view(side).place === false && n.lineShare('dso-m42') === 0, 'nor from the side, where a flat picture of a cloud would be a lie');
  check(n.drawn('dso-m31') === 0, 'drawn() is 0 for every other record');
  n.want('dso-m13');
  view(sun);
  check(n.compareK('dso-m42') === null && n.drawn('dso-m42') === 0 && st().state === 'idle' && n.loaded().length === 0, 'choosing anything else puts the slider back and gives the picture\'s memory back');
  stage.setWorld('earth');
  n.rebuild();
  n.setCompare('dso-m42', 1);
  n.update(camera, renderer, true);
  check(n.state().every((p) => !p.place), 'on a world\'s stage nothing stands at a place');
  n.dispose();
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

// --------------------------------------------- 6. how much the GPU holds (internal #345)
// 0078 r14-neb-b: at most ONE picture, the slider's, and none once the slider is put back.
{
  const { TIER_BUDGET_MB } = await import(join(JS, 'scene/quality.js'));
  const webpSize = (file) => {
    const b = readFileSync(join(ROOT, file));
    const kind = b.toString('ascii', 12, 16);
    if (kind === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
    if (kind === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >> 14) & 0x3fff) + 1]; }
    if (kind === 'VP8X') return [(b.readUIntLE(24, 3)) + 1, (b.readUIntLE(27, 3)) + 1];
    return null;
  };
  const mibs = NEBULAE.map((r) => { const wh = webpSize(r.file); return wh ? (wh[0] * wh[1] * 4 * 4) / 3 / 1048576 : null; });
  check(mibs.every((m) => m > 0 && m < 8), `every picture's size can be read from its header, and none is over 8 MiB (${mibs.map((m) => m && m.toFixed(1))})`);
  check(Math.max(...mibs) <= 0.1 * TIER_BUDGET_MB[0], `the largest picture is ${Math.max(...mibs).toFixed(1)} MiB, a tenth of a phone's ${TIER_BUDGET_MB[0]} MB at most`);
  stage.setWorld('stellar');
  const disposed = [];
  const load = () => { const t = new THREE.Texture(); t.addEventListener('dispose', () => disposed.push(1)); return Promise.resolve(t); };
  const n = createNebulae(new THREE.Scene(), { load, base: 'https://example.invalid/' });
  n.setCompare('dso-lmc', 1);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  check(n.loaded().join() === 'dso-lmc', `the slider's one picture landed (${n.loaded()})`);
  n.setCompare('dso-m42', 1);
  await Promise.resolve(); await Promise.resolve(); await Promise.resolve();
  check(n.loaded().join() === 'dso-m42' && disposed.length === 1, `moved to Orion, the Cloud is let go (${n.loaded()}, ${disposed.length} disposed)`);
  n.clearCompare();
  check(n.loaded().length === 0 && disposed.length === 2, 'put back, nothing is held');
  n.dispose();
  stage.setWorld('earth');
}

// --------------------------------------------- 7. the shutter reaches the 3D stars (internal #343)
{
  const { COPY: _c } = await import(join(JS, 'copy/en.js'));
  const en = await import(join(JS, 'copy/en.js'));
  check(exposureLook('eye').starLimit === en.NAKED_EYE_LIMIT, `the Eye draws stars to the naked-eye limit (${exposureLook('eye').starLimit} = ${en.NAKED_EYE_LIMIT})`);
  check(exposureLook('eye').starLimit < exposureLook('camera').starLimit && exposureLook('camera').starLimit <= exposureLook('deep').starLimit && exposureLook('deep').starLimit <= 7.5, 'a longer exposure shows no fewer stars, and none past the file\'s 7.5');
  const st = readFileSync(join(JS, 'scene/stars3d.js'), 'utf8');
  check(/m > uMagLimit/.test(st) && /uMagLimit: \{ value: 7\.5 \}/.test(st) && !/m > 7\.5/.test(st), 'the vertex shader reads the limit from a uniform whose default is the old 7.5');
  const mn = readFileSync(join(JS, 'main.js'), 'utf8');
  check((mn.match(/stars3d\.setMagLimit\(/g) || []).length === 2, 'main.js hands the limit over at boot and on every change');
}

if (problems.length) { console.error('nebulae FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`nebulae ok: ${NEBULAE.length} licensed pictures inside their objects' fields, the tangent-plane maths, the shutter's three looks, no photograph in the scene but the slider's one, and nothing fetched at boot`);
