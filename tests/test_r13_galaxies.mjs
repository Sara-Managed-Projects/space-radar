// tests/test_r13_galaxies.mjs -- release 1.3.0 stage W3-f (internal spec 0077 task 20): galaxy classes in deep space.
//   1. A DEEP FIELD (internal #784): the Hubble Ultra Deep Field as JWST's JADES catalogued it, each galaxy at the comoving
//      distance of its redshift (data/cosmology.js), as wide from the Sun as Webb saw it; four slices, one draw call each.
//   2. SPIRALS FROM THEIR OWN NUMBERS (internal #873): M51, M81, M101 and M104 as heroes of scene/deep/spiral.js, each profile's
//      orientation and structure sourced, a hero line each, read lazily.
//   3. INTERACTING GALAXIES (internal #875): M51 with NGC 5195 and the arm that reaches it; the Antennae, two galaxies and
//      their tails, each where the sky puts it and at a modelled depth, labelled.
//
//   node tests/test_r13_galaxies.mjs
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const G = await import(join(JS, 'scene/deep/galclusters.js'));
const C = await import(join(JS, 'data/cosmology.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const LY_KM = 9460730472580.8;
const ARCSEC = Math.PI / 648000;
const fileBuf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };

// --- 1. the deep field ---------------------------------------------------------------------------------------------------
{
  const MAN = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/deepfield.json'), 'utf8'));
  const bin = readFileSync(join(ROOT, 'site/data/deep/deepfield.bin'));
  check(bin.length === MAN.bin.bytes && createHash('sha256').update(bin).digest('hex') === MAN.bin.sha256, 'the field\'s bin is the bake\'s (size and hash as the manifest says; scripts/build_deep_field.py --check)');
  check(bin.length + JSON.stringify(MAN).length < 250000, `the field is ${bin.length} B of rows: small, and fetched only on the Local Group's stage`);
  check(JSON.stringify(MAN.slices.map((s) => s.id)) === JSON.stringify(['hudf-1', 'hudf-2', 'hudf-3', 'hudf-4']) && MAN.slices.reduce((n, s) => n + s.count, 0) === MAN.count && MAN.count > 5000, `four slices by redshift, ${MAN.count} galaxies`);
  check(/CC BY 4\.0/.test(MAN.licence) && /V\/159/.test(MAN.field.catalogue) && /JADES/.test(MAN.field.catalogue), 'JADES (VizieR V/159), CC BY 4.0');
  const tile = G.parseMembers(fileBuf('site/data/deep/deepfield.bin'));
  const box = MAN.field.box;
  const OB = 23.4392911 * Math.PI / 180;
  let outside = 0, wide = 0, near = 0, far = 0, spec = 0, sized = 0, worstZ = 0;
  for (const s of MAN.slices) {
    const r0 = s.distMly;
    for (let i = 0; i < s.count; i++) {
      const row = G.rowOf(tile, s.offset + i);
      const p = [s.centre.dir[0] * r0 + row.off[0], s.centre.dir[1] * r0 + row.off[1], s.centre.dir[2] * r0 + row.off[2]];
      const d = Math.hypot(...p);
      // back to RA, Dec (ecliptic J2000 -> equatorial)
      const x = p[0] / d, y = p[1] / d, z = p[2] / d;
      const ye = y * Math.cos(OB) - z * Math.sin(OB), ze = y * Math.sin(OB) + z * Math.cos(OB);
      const ra = ((Math.atan2(ye, x) * 180 / Math.PI) + 360) % 360, dec = Math.asin(ze) * 180 / Math.PI;
      if (ra < box.ra_min - 1e-4 || ra > box.ra_max + 1e-4 || dec < box.dec_min - 1e-4 || dec > box.dec_max + 1e-4) outside += 1;
      if (d < 250 || d > 32500) (d < 250 ? near++ : far++);
      if (row.reMly > 0) { sized += 1; const arc = row.reMly / d / ARCSEC; if (arc < 0.03 || arc > 3) wide += 1; }
      const flags = new DataView(tile.view.buffer, tile.view.byteOffset + 16 + (s.offset + i) * 20 + 19, 1).getUint8(0);
      if (flags & 4) spec += 1;
      // its distance is the comoving distance of a redshift inside its slice's range
      const zLo = s.z[0], zHi = s.z[1];
      const dLo = C.comovingLy(zLo) / 1e6, dHi = C.comovingLy(zHi) / 1e6;
      if (d < dLo * 0.999 || d > dHi * 1.001) worstZ += 1;
    }
  }
  check(outside === 0, `every galaxy is inside the Ultra Deep Field's box on the sky (${outside} outside)`);
  check(near === 0 && far === 0, `between 250 million and 32.5 billion light-years: nothing at the horizon or nearer than the field's nearest galaxies (${near} near, ${far} far)`);
  check(worstZ === 0, `each galaxy stands at the comoving distance of a redshift in its slice's range, by data/cosmology.js (${worstZ} off)`);
  check(sized > 0.95 * MAN.count && wide === 0, `seen from the Sun each galaxy is as wide as Webb measured it, 0.03 to 3 arcseconds in half-light radius (${sized} sized, ${wide} outside that)`);
  check(spec > 200 && spec === MAN.slices.reduce((n, s) => n + s.spectroscopic, 0), `${spec} redshifts are NIRSpec's (flag A or B), the rest photometric estimates, and the manifest says which`);
  check(/estimate/.test(MAN.rules.distance) && /exposure, not photometry/.test(MAN.rules.brightness) && /illustrative/.test(MAN.rules.colour), 'the manifest says what is measured, estimated and illustrative');

  // the layer: a slice per draw call, on the Local Group's stage
  stage.setWorld('local-group');
  const CL = JSON.parse(readFileSync(join(ROOT, 'site/data/deep/galclusters.json'), 'utf8'));
  const layer = G.createLayer(THREE, { load: async () => ({ manifest: CL, buffer: fileBuf('site/data/deep/galclusters.bin') }), loadField: async () => ({ manifest: MAN, buffer: fileBuf('site/data/deep/deepfield.bin') }), recordById: () => null });
  await layer.whenLoaded();
  const st0 = layer.stats();
  check(st0.field.length === 4 && !st0.fieldFailed && st0.clusters.length === CL.clusters.length, `the layer holds the four slices beside the ${st0.clusters.length} clusters (${st0.fieldFailed || 'ok'})`);
  const cam = new THREE.PerspectiveCamera(50, 16 / 9, 1e-5, 1e9);
  const renderer = { domElement: { clientHeight: 900 } };
  const s2 = MAN.slices[2];
  const at = (mly) => stage.toScene({ x: s2.centre.dir[0] * mly * 1e6 * LY_KM, y: s2.centre.dir[1] * mly * 1e6 * LY_KM, z: s2.centre.dir[2] * mly * 1e6 * LY_KM }, 'sun-inertial');
  // inside the needle, 19 billion light-years out, looking further out along it
  cam.position.copy(at(19000)); cam.lookAt(at(21000)); cam.updateMatrixWorld(true);
  layer.frame({ camera: cam, renderer, stage, gain: 1, visible: true });
  const st = layer.stats();
  const drawn = st.field.filter((f) => f.culled === null);
  check(drawn.some((f) => f.id === 'hudf-3') && drawn.every((f) => f.fade > 0.5), `inside the field, looking out along it, its slices are drawn (${JSON.stringify(st.field.map((f) => [f.id, f.culled, f.fade]))})`);
  check(st.calls >= drawn.length, `one draw call a slice (${st.calls} calls, ${drawn.length} slices drawn)`);
  // from beside it, 12 billion light-years off its line: a needle across the view, drawn
  const mid = at(16000), sun = stage.toScene({ x: 0, y: 0, z: 0 }, 'sun-inertial');
  const along = mid.clone().sub(sun).normalize();
  const side = new THREE.Vector3(0, 1, 0).cross(along).normalize();
  cam.position.copy(mid).addScaledVector(side, 12000 * 1e6 * LY_KM / stage.unitKm); cam.lookAt(mid); cam.updateMatrixWorld(true);
  layer.frame({ camera: cam, renderer, stage, gain: 1, visible: true });
  check(layer.stats().field.filter((f) => f.culled === null).length >= 3, `from 12 billion light-years beside it, the needle is drawn (${JSON.stringify(layer.stats().field.map((f) => f.culled))})`);
  check(layer.describe('hudf-1') === null && layer.describe('virgo') !== null, 'a slice is not a cluster: describe() names clusters only');
  layer.dispose();
  const src = readFileSync(join(JS, 'scene/deep/galclusters.js'), 'utf8');
  check(/deepfield\.json/.test(src) && !/deepfield/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'the field is fetched by the layer, never at boot');
}

if (problems.length) {
  console.error(`test_r13_galaxies: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_r13_galaxies: ok (the deep field from JADES at its redshifts, true angular size from the Sun, four slices)');
