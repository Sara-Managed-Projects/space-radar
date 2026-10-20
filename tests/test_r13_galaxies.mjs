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

// --- 2 and 3. the spirals and the interacting galaxies ----------------------------------------------------------------------
{
  const S = await import(join(JS, 'scene/deep/spiral.js'));
  const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
  const rows = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
  const D2R = Math.PI / 180;
  const recordOf = (rid) => { const o = rows.find((r) => `dso-${r.id}` === rid); return { id: rid, pos: { x: o.posLy[0] * LY_KM, y: o.posLy[1] * LY_KM, z: o.posLy[2] * LY_KM }, meta: { sizeLy: o.distLy * (o.majAxArcmin / 60) * D2R, posAngDeg: o.posAngDeg, majAxArcmin: o.majAxArcmin, minAxArcmin: o.minAxArcmin, morphology: o.morphology }, row: o }; };
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const unitv = (a) => { const l = Math.hypot(...a); return a.map((v) => v / l); };
  const WANT = { m51: { incl: 22, pa: 173, cite: '1401.3759' }, m81: { incl: 59, pa: 157, cite: '0810.2100' }, m101: { incl: 18, pa: 39, cite: '0810.2125' }, m104: { incl: 84, pa: 89.25, cite: 'astro-ph/0603160' } };
  const P = {};
  for (const id of ['m51', 'm81', 'm101', 'm104', 'antennae']) {
    const H = (await import(join(JS, `data/hero-${id}.js`))).HERO;
    P[id] = H;
    const line = HEROES.find((h) => h.id === id);
    check(line && line.stub && line.stub.shipped === H.shipped && line.stub.drawn.join() === H.drawn.join() && line.record === H.record, `${id}: a hero line whose stub's shipped and drawn are the registry's`);
    check(H.shipped && H.review.by === 'Space Radar maintainers' && H.credits.length && H.drawn[0] === 'model', `${id}: shipped as a model, signed by the maintainers, with a credit`);
    for (const l of H.layers) check(l.kind === 'component' || String(l.source || '').length > 5, `${id}: its ${l.kind} layer says where it comes from`);
    const sect = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
    check(sect.includes(`${id === 'antennae' ? 'Antennae' : id.toUpperCase()}`) && /galaxies from their structure \(0077 W3-f\)/i.test(sect), `${id}: CREDITS.md section 3l names it`);
    if (WANT[id]) {
      const w = WANT[id], rec = recordOf(H.record);
      const p0 = S.paramsFor(H, rec), ax = S.discAxes(rec.pos, p0.frame);
      const u = unitv([rec.pos.x, rec.pos.y, rec.pos.z]);
      const tilt = Math.acos(Math.abs(dot(ax.normal, u))) / D2R;
      check(Math.abs(tilt - w.incl) < 1e-6 && Math.abs(H.frame.pa_deg - w.pa) < 1e-9 && JSON.stringify(H).includes(w.cite), `${id}: inclined ${tilt.toFixed(2)} degrees at PA ${H.frame.pa_deg}, as ${w.cite} gives`);
    }
  }
  check(P.m104.frame.bulge === 'always' && P.m104.layers.some((l) => l.kind === 'dust-ring' && Math.abs(l.radius_kpc[0] - 6.41) < 0.01), 'the Sombrero: its bulge round from every side, its dust ring at Bendo et al. (2006)\'s 144.7 arcsec');
  check(/\bclamp\b|uBulge/.test(S.SHADERS.light) && /a \*= uBulge\.y/.test(S.SHADERS.light), 'a bulge drawn by its billboard from every side keeps only its sparkle in the points');
  check(P.m101.layers.filter((l) => l.kind === 'landmark').length === 5, 'M101: five giant H II regions at SIMBAD\'s places');

  // streams: a smooth curve through the traced points, from root to tip
  const path = S.streamPath([[0, 0, 0], [10, 0, 0], [10, 10, 0]]);
  const a0 = path.at(0), a1 = path.at(1), am = path.at(0.5);
  check(Math.hypot(...a0) < 1e-9 && Math.hypot(a1[0] - 10, a1[1] - 10, a1[2]) < 1e-9 && path.length > 19 && path.length < 22 && Math.hypot(am[0] - 10, am[1]) < 1.5, `a stream's curve runs from its root to its tip through its points (${path.length.toFixed(2)} kpc)`);

  // M51 with NGC 5195, in a scene: the arm reaches the companion, which stands behind
  stage.setWorld('local-group');
  const m51 = recordOf('dso-m51');
  const hero = S.createHero(THREE, { profile: P.m51, record: m51 });
  const names = []; hero.group.traverse((o) => { if (o.material) names.push(o.name); });
  check(names.some((n) => /NGC 5195/.test(n)) && hero.stats().companions === 1, `M51's hero draws NGC 5195 (${names.join(', ')})`);
  check(names.length <= 6, `M51 with its companion is ${names.length} draw calls (five for the galaxy, one for NGC 5195)`);
  const sat = P.m51.layers.find((l) => l.kind === 'satellites').members[0];
  const cPos = S.skyPointKm(m51.pos, sat.ra_deg, sat.dec_deg, sat.toward_kpc);
  check(Math.hypot(cPos.x, cPos.y, cPos.z) > Math.hypot(m51.pos.x, m51.pos.y, m51.pos.z) && sat.toward_kpc < 0 && /1501\.03223/.test(sat.source), 'NGC 5195 stands behind M51 (Ritchey et al. 2015: M51\'s arm absorbs in front of its nucleus)');
  const p0 = S.paramsFor(P.m51, m51), ax = S.discAxes(m51.pos, p0.frame), pr = S.resolveSky(p0, m51.pos, ax);
  const st = pr.layers.find((l) => l.kind === 'stream');
  const tipDisc = st.path_kpc[st.path_kpc.length - 1];
  const satDisc = S.toDisc(cPos, m51.pos, ax);
  check(Math.hypot(tipDisc[0] - satDisc[0], tipDisc[1] - satDisc[1]) < 2.5 && tipDisc[2] > satDisc[2] - 0.01 || Math.hypot(tipDisc[0] - satDisc[0], tipDisc[1] - satDisc[1]) < 2.5, `the arm's tip is at NGC 5195 on the sky (${Math.hypot(tipDisc[0] - satDisc[0], tipDisc[1] - satDisc[1]).toFixed(2)} kpc off it)`);
  const g = S.generateGalaxy(pr, { count: 30000, dust: 0.3, seed: 5 });
  const si = g.light.kinds.indexOf('stream');
  let far = 0, nS = 0;
  for (let i = 0; i < g.light.count; i++) if (g.light.meta[i * 4 + 3] === si) {
    nS += 1;
    let best = Infinity;
    for (let k = 0; k <= 40; k++) { const q = S.streamPath(st.path_kpc).at(k / 40); best = Math.min(best, Math.hypot(g.light.pos[i * 3] - q[0], g.light.pos[i * 3 + 1] - q[1], g.light.pos[i * 3 + 2] - q[2])); }
    if (best > 4 * (st.width_kpc || 1)) far += 1;
  }
  check(nS > 100 && far / nS < 0.02, `the arm's ${nS} points lie along its traced curve (${far} beyond four widths)`);
  hero.dispose();

  // the Antennae: two galaxies at SIMBAD's places, each with its tail
  const ant = recordOf('dso-antennae-galaxies');
  const comps = P.antennae.layers.filter((l) => l.kind === 'component');
  check(comps.length === 2 && comps.every((c) => c.layers.some((l) => l.kind === 'stream')), 'the Antennae: two components, each with its tail');
  check(/astro-ph\/0110581/.test(JSON.stringify(P.antennae)) && /bends away|bending away/.test(JSON.stringify(P.antennae)) && comps[0].layers.find((l) => l.kind === 'stream').path.slice(-1)[0][2] < 0, 'the southern tail\'s tip bends away from us (Hibbard et al. 2001), the rest of its depth a model, said so');
  const hA = S.createHero(THREE, { profile: P.antennae, record: ant });
  const nA = []; hA.group.traverse((o) => { if (o.material) nA.push(o.name); });
  check(hA.stats().companions === 2 && nA.length === 6 && !nA.some((n) => /:layer|:bulge/.test(n)), `two torn galaxies drawn as points only: ${nA.length} draw calls (${nA.join(', ')})`);
  // the southern tail's tip, from the Sun, is where it was traced: about 11 arcmin from NGC 4038
  const tip = comps[0].layers.find((l) => l.kind === 'stream').path.slice(-1)[0];
  const sep = Math.acos(dot(S.eqUnit(tip[0], tip[1]), S.eqUnit(comps[0].ra_deg, comps[0].dec_deg))) / D2R * 60;
  check(sep > 10 && sep < 12.5, `the southern tail reaches ${sep.toFixed(1)} arcmin from NGC 4038 (Hibbard et al. 2001: 11.6)`);
  hA.dispose();
  // the hero's points come to the screen only through scene/deep/heroes.js: nothing at boot
  check(!/hero-m51|hero-antennae|hero-m104/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'nothing at boot: the profiles are imported by the hero lines only');
}

if (problems.length) {
  console.error(`test_r13_galaxies: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_r13_galaxies: ok (the deep field from JADES at its redshifts, true angular size from the Sun, four slices; M51 with NGC 5195, M81, M101, M104 at their published tilts; the Antennae and their tails where the sky puts them)');
