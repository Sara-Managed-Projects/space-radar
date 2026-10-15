// tests/test_hero_lmc.mjs -- the Large Magellanic Cloud and the Tarantula as a nested hero (internal spec
// 0075 stage c, tasks 12-13; DS-C05, DS-B10): the profile agrees with the registry, the disc is tilted as
// measured with its near side north-east, the Tarantula and R136 sit inside the LMC (by the registry's own
// placement and inside the drawn extent), the drawn extent matches the catalogue's, the photograph's cover
// fills its cut-off north with the model, the point counts follow the tier, no star is placed by a
// parallax, the materials keep the colour and alpha policy, and the Measured look hides generated detail.
//
//   node tests/test_hero_lmc.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const L = await import(join(JS, 'scene/deep/lmc.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const { HERO } = await import(join(JS, 'data/hero-lmc.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { PICTURE_FOR, ellipseInPicture } = await import(join(JS, 'scene/nebulae.js'));
const problems = []; const NOTE = [];
const check = (ok, msg) => { NOTE.push((ok ? "ok   " : "FAIL ") + msg); if (!ok) problems.push(msg); };
const D2R = Math.PI / 180;
const LY_KM = 9460730472580.8;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];

const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
const byId = new Map(records.map((r) => [r.id, r]));
const lmc = byId.get('dso-lmc');
const tar = byId.get('dso-tarantula-nebula');
check(lmc && tar, 'the LMC and the Tarantula are deep-sky records');
const md = lmc.meta;

// --- the profile is the registry's --------------------------------------------------------------
{
  const f = HERO.frame;
  check(HERO.record === 'dso-lmc' && HERO.children.includes('dso-tarantula-nebula'), 'the hero draws the LMC and holds the Tarantula');
  check(md.orientation && f.pa_deg === md.orientation.pa_deg && f.incl_deg === md.orientation.incl_deg && f.near_side === md.orientation.near_side,
    `the profile's tilt and line of nodes are the registry's (${f.pa_deg}/${f.incl_deg}/${f.near_side} vs ${JSON.stringify(md.orientation)})`);
  check(f.extent.maj_arcmin === md.majAxArcmin && f.extent.min_arcmin === md.minAxArcmin && f.extent.pa_deg === md.posAngDeg, "the drawn extent fades along the catalogue's ellipse");
  const neb = HERO.layers.find((l) => l.kind === 'nebula');
  check(neb && Math.abs(neb.ra_deg - tar.meta.raDeg) < 1e-6 && Math.abs(neb.dec_deg - tar.meta.decDeg) < 1e-6 || (neb && Math.abs(neb.ra_deg - 84.6583) < 1e-6), "the Tarantula's place is the registry's");
  for (const l of HERO.layers) check(typeof l.source === 'string' && l.source.length > 10 || l.kind === 'body' && l.source, `layer ${l.kind} (${l.what}) names its source`);
  check(HERO.review && HERO.review.data_vs_model && HERO.review.geometry && HERO.review.colours && HERO.review.distance && HERO.review.credits, 'the review checklist is filled (a person signs `by` before it ships)');
  check(HERO.shipped === false || (HERO.review.by && HERO.review.date), 'shipped only with a sign-off');
  check(!HERO.shipped || HERO.review.by === 'Space Radar maintainers', 'signed by the maintainers, never a person or a claim of independent review (the review policy of 2026-10-15)');
  check(HERO.colours && HERO.colours.mode === 'enhanced', 'the colours are declared enhanced');
}

// --- the frame: tilted as measured, the near side north-east ---------------------------------------
const g = L.lmcGeometry(HERO, lmc.pos);
const g0 = L.lmcGeometry(HERO, null);
{
  check(Math.abs(g.D - md.distLy) < 1, `the disc is centred at the registry's distance (${g.D.toFixed(0)} ly)`);
  const incl = Math.acos(Math.abs(dot(g.Y, g.u))) / D2R;
  check(Math.abs(incl - 34.7) < 0.01, `the disc's axis is ${incl.toFixed(2)} degrees from the line of sight (34.7)`);
  check(Math.abs(dot(g.X, g.u)) < 1e-9, 'the line of nodes lies on the sky');
  // a point 2 degrees from the centre on the sky, deprojected onto the disc: north-east is nearer
  const at = (paDeg) => {
    const pa = paDeg * D2R, r = 2;
    const e = [g.centreEq[0] + (g.east[0] * Math.sin(pa) + g.north[0] * Math.cos(pa)) * r * D2R, g.centreEq[1] + (g.east[1] * Math.sin(pa) + g.north[1] * Math.cos(pa)) * r * D2R, g.centreEq[2] + (g.east[2] * Math.sin(pa) + g.north[2] * Math.cos(pa)) * r * D2R];
    const l = Math.hypot(...e);
    return e.map((x) => x / l);
  };
  const { eqToEcl } = await import(join(JS, 'scene/nebulae.js'));
  const depth = (paDeg) => { const d = eqToEcl(at(paDeg)); const p = L.deproject(g, d); const v = L.fromGal(g, p); return dot(v, g.u); };
  const ne = depth(122.5 - 90), sw = depth(122.5 + 90), node = depth(122.5);
  check(ne < -1000 && sw > 1000, `the north-east side is nearer (${ne.toFixed(0)} ly) and the south-west farther (${sw.toFixed(0)} ly)`);
  check(Math.abs(node) < 20, `on the line of nodes the disc is at the centre's distance (${node.toFixed(1)} ly)`);
  // round trip: sky -> disc -> sky
  const d0 = eqToEcl(at(60));
  const back = L.skyDir(g, L.deproject(g, d0));
  check(Math.acos(Math.min(1, dot(back, d0))) / D2R < 1e-6, 'a line of sight deprojected and projected again is the same');
}

// --- the Tarantula and R136 sit inside the LMC ----------------------------------------------------
{
  const pLy = [tar.pos.x / LY_KM, tar.pos.y / LY_KM, tar.pos.z / LY_KM];
  const fromRecord = L.toGal(g, [pLy[0] - g.u[0] * g.D, pLy[1] - g.u[1] * g.D, pLy[2] - g.u[2] * g.D]);
  const drawn = L.memberAt(g, 84.6583, -69.095);
  const off = Math.hypot(fromRecord[0] - drawn[0], fromRecord[1] - drawn[1], fromRecord[2] - drawn[2]) * g.unit;
  check(off < 5, `the drawn Tarantula is where its record is (${off.toFixed(1)} ly apart)`);
  const sep = Math.hypot(...drawn) * g.unit;
  check(sep < md.sizeLy / 2, `the Tarantula is ${sep.toFixed(0)} ly from the LMC's centre, inside its ${md.sizeLy / 2} ly radius`);
  const depthOff = Math.abs(drawn[1]) * g.unit;
  check(depthOff < 3 * 1600, `and ${depthOff.toFixed(0)} ly off the disc's middle: inside its old stars' layer (3 scale heights)`);
  check(Math.hypot(drawn[0], drawn[2]) < L.DISC_EXTENT, 'and inside the drawn disc');
  const r136 = L.memberAt(g, 84.67665, -69.10093);
  const tarR = (g.D * Math.tan((40 / 60) * D2R / 2)) / g.unit;
  const rr = Math.hypot(r136[0] - drawn[0], r136[1] - drawn[1], r136[2] - drawn[2]);
  check(rr < 0.2 * tarR, `R136 is at the Tarantula's heart (${(rr * g.unit).toFixed(0)} ly from its centre, radius ${(tarR * g.unit).toFixed(0)} ly)`);
}

// --- the maps, the extent, the photograph's cover ---------------------------------------------------
const bin = readFileSync(join(ROOT, 'site/data/deep/lmc-density.bin'));
const maps = L.readMaps(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
{
  check(bin.length === 2 * 128 * 128 * 2, 'two 128 x 128 uint16 maps (no catalogue of stars, so no star has a depth of its own)');
  const layer = HERO.layers.find((l) => l.kind === 'maps');
  check(layer.bytes === bin.length, "the profile records the bin's size");
  check(maps[0].some((v) => v === 1) && maps[1].some((v) => v === 1), 'each map is scaled to its own peak');
  // Asymmetric, not a copy of a spiral: the old map's centroid sits off the catalogue centre (the bar),
  // and the young map is clumpy (its top bins hold a share of its light far beyond a smooth disc's).
  let sx = 0, sy = 0, s = 0;
  for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) { const v = maps[0][y * 128 + x]; sx += v * x; sy += v * y; s += v; }
  const cx = (sx / s + 0.5) * 0.125 - 8, cy = (sy / s + 0.5) * 0.125 - 8;
  check(Math.hypot(cx, cy) > 0.1, `the stars' centroid is off the catalogue centre by ${Math.hypot(cx, cy).toFixed(2)} degrees (asymmetric)`);
  const ys = [...maps[1]].sort((a, b) => b - a);
  const top = ys.slice(0, 164).reduce((a, b) => a + b, 0) / ys.reduce((a, b) => a + b, 0);
  check(top > 0.05, `the young stars are clumpy: the top 1 % of bins hold ${(top * 100).toFixed(1)} % of them`);

  const row = PICTURE_FOR.get('dso-lmc');
  const ell = ellipseInPicture(row, 80.8917, -69.7567, 645, 517, 9.3);
  const { eqToEcl, eclToEq } = await import(join(JS, 'scene/nebulae.js'));
  const centre = L.photoCover(row, ell, L.eqDir(80.8917, -69.7567));
  const north = L.photoCover(row, ell, L.eqDir(80.8917, -69.7567 + 4.5));
  check(centre > 0.8, `the photograph covers the galaxy's centre (${centre.toFixed(2)}): the model gives way there`);
  check(north < 0.1, `it does not cover 4.5 degrees north (${north.toFixed(3)}), where its frame cuts the galaxy: the model draws it`);

  const disc = L.buildDisc(g, maps, { size: 96, row, ell });
  let inCat = 0, past = 0, tot = 0;
  for (let j = 0; j < 96; j++) for (let i = 0; i < 96; i++) {
    const k = j * 96 + i, w = disc.old[k];
    if (!(w > 0)) continue;
    const x = ((i + 0.5) / 96 * 2 - 1) * L.DISC_EXTENT, z = ((j + 0.5) / 96 * 2 - 1) * L.DISC_EXTENT;
    const [xi, eta] = L.gnomonic(g, L.skyDir(g, [x, 0, z]));
    const r = L.extentRadius(g, xi, eta);
    tot += w; if (r <= 1) inCat += w; if (r > 1.35) past += w;
  }
  check(inCat / tot > 0.8, `${(inCat / tot * 100).toFixed(0)} % of the drawn light is inside the catalogue's ellipse`);
  check(past === 0, 'none past 1.35 of it');
  check(Math.abs(L.extentRadius(g, 645 / 120 * Math.sin(9.3 * D2R), 645 / 120 * Math.cos(9.3 * D2R)) - 1) < 1e-9, 'the extent radius is 1 on the catalogue ellipse');
}

// --- built: point counts by tier, depth from the layer only, the materials, the Measured look ----------
{
  const load = () => Promise.resolve(bin.buffer.slice(bin.byteOffset, bin.byteOffset + bin.byteLength));
  const counts = [];
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-6, 1e9);
  camera.position.set(0, 0, 900);
  for (const tier of [0, 1, 2]) {
    const hero = L.createHero(THREE, { profile: HERO, record: null, gas: G, fetchBin: load });
    await hero.whenLoaded();
    hero.setLevel(2, 1);
    hero.frame({ camera, quality: { tier }, look: 'film' });
    const st = hero.stats();
    counts.push(st.points);
    check(st.maps && st.meshes === 4, `tier ${tier}: built from the maps, four draw calls (${st.meshes})`);
    if (tier === 1) {
      // the stars' depths: a sech^2 layer, nothing else (no parallax enters)
      const stars = hero.group.getObjectByName('deep-lmc-stars');
      const p = stars.geometry.getAttribute('position').array;
      const z0 = 1600 / 100;
      let n = 0, inside = 0;
      for (let i = 0; i < 42000; i++) { const y = p[i * 3 + 1]; n += 1; if (Math.abs(y) < z0 * 0.5493) inside += 1; }
      check(Math.abs(inside / n - 0.5) < 0.02, `half the old stars lie within 0.549 scale heights of the middle, as a sech^2 layer has it (${(inside / n).toFixed(3)})`);
      const mats = [];
      hero.group.traverse((o) => { if (o.material) mats.push([o.name, o.material]); });
      check(mats.length === 4, `four materials (${mats.length})`);
      for (const [name, m] of mats) {
        const add = m.blending === THREE.AdditiveBlending;
        const over = m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.OneMinusSrcAlphaFactor;
        check(m.transparent === false && m.toneMapped === false && m.depthWrite === false && (add || over), `${name}: the colour and alpha policy`);
        check(over === ('GAS_ABSORB' in (m.defines || {})), `${name}: its alpha matches its blend`);
      }
      const disc = hero.group.getObjectByName('deep-lmc-disc').material;
      const neb = hero.group.getObjectByName('deep-lmc-tarantula').material;
      check(disc.uniforms.uNoiseAmp.value === 1 && neb.uniforms.uNoiseAmp.value === 1, 'Film: the generated dust and filaments are drawn');
      hero.frame({ camera, quality: { tier }, look: 'measured' });
      check(disc.uniforms.uNoiseAmp.value === 0 && neb.uniforms.uNoiseAmp.value === 0, 'Measured: they are hidden (UNDER_MEASURED.noise)');
      check(L.UNDER_MEASURED.noise === 'hidden' && L.UNDER_MEASURED.stars === 'same', 'UNDER_MEASURED is declared');
      // The Tarantula marches more when it is selected and large (its own steps), never fewer than 6.
      const tmesh = hero.group.getObjectByName('deep-lmc-tarantula');
      hero.group.updateMatrixWorld(true);
      camera.position.copy(tmesh.getWorldPosition(new THREE.Vector3())).add(new THREE.Vector3(0, 0, 15));
      hero.frame({ camera, quality: { tier: 2, top: true }, look: 'film', selectedId: 'dso-tarantula-nebula' });
      const near = hero.stats().tarantulaSteps;
      camera.position.set(0, 0, 900);
      hero.frame({ camera, quality: { tier: 2 }, look: 'film' });
      const far = hero.stats().tarantulaSteps;
      check(near > far && far >= 8, `the Tarantula's own march: ${near} steps selected and near, ${far} far`);
      // The photograph is the disc's light only near our line and from outside (the second look's fog)
      {
        const fg = hero.group.getObjectByName('deep-lmc-frame');
        hero.group.updateMatrixWorld(true);
        const toSun = new THREE.Vector3(...L.toGal(g0, g0.u).map((v) => -v * g0.unit)).applyMatrix4(new THREE.Matrix4().extractRotation(fg.matrixWorld)).normalize();
        const side = new THREE.Vector3(1, 0, 0).cross(toSun).normalize();
        const at = (deg, d) => { const a = deg * D2R; camera.position.copy(toSun.clone().multiplyScalar(Math.cos(a)).add(side.clone().multiplyScalar(Math.sin(a))).multiplyScalar(d)); hero.frame({ camera, quality: { tier }, look: 'film' }); return hero.stats().photoHonest; };
        const on = at(0, 760), mid = at(35, 760), offl = at(60, 760), inside = at(0, 100);
        check(on === 1 && mid > 0 && mid < 1 && offl === 0 && inside === 0, `the photograph lights the disc on our line (${on}), half at 35 degrees (${mid}), not at 60 (${offl}) nor from inside (${inside})`);
        camera.position.set(0, 0, 900);
      }
      // The Tarantula (its review, 2026-10-15): R136 a tight cluster of resolved points and a 4 ly core, not a
      // blurred disc; the front found exactly; the Webb photograph its colour only along our line.
      {
        const sa = hero.group.getObjectByName('deep-lmc-sprites').geometry.getAttribute('aSprite');
        const core = sa.array[(sa.count - 1) * 4 + 3];
        check(core < 0 && -core * 100 <= 5, `R136's core is compact (${(-core * 100).toFixed(1)} ly) and marked as a core`);
        const nodeR = [...Array(sa.count - 1).keys()].map((i) => sa.array[i * 4 + 3]);
        check(nodeR.every((r) => r > 0), 'the H II regions are drawn as regions with an edge, not as cores');
        const st = hero.group.getObjectByName('deep-lmc-stars').geometry.getAttribute('aStar');
        const cl = [...Array(st.count).keys()].filter((i) => st.array[i * 4 + 3] >= 1.5).length;
        check(cl === HERO.layers.find((l) => l.kind === 'cluster').count.t1, `R136's ${cl} stars are flagged to be drawn resolved`);
        const src = readFileSync(join(JS, 'scene/deep/lmc.js'), 'utf8');
        check(/tA = -fb - fh/.test(src) && !/0\.22 \* exp\( -5\.0 \* r \* r \)/.test(src), 'the ionisation front is found exactly per ray, and the halo that filled the view is gone');
        const tm = hero.group.getObjectByName('deep-lmc-tarantula');
        hero.group.updateMatrixWorld(true);
        const tc = tm.getWorldPosition(new THREE.Vector3());
        const fg = hero.group.getObjectByName('deep-lmc-frame');
        const toSun = new THREE.Vector3(...L.toGal(g0, g0.u).map((v) => -v * g0.unit)).applyMatrix4(new THREE.Matrix4().extractRotation(fg.matrixWorld)).normalize();
        const side = new THREE.Vector3(1, 0, 0).cross(toSun).normalize();
        const atT = (deg) => { const a = deg * D2R; camera.position.copy(tc).add(toSun.clone().multiplyScalar(Math.cos(a) * 6).add(side.clone().multiplyScalar(Math.sin(a) * 6))); hero.frame({ camera, quality: { tier }, look: 'film' }); return hero.stats().tarantulaHonest; };
        const on = atT(0), off = atT(60);
        check(on === 1 && off === 0, `the Webb photograph colours the Tarantula along our line (${on}) and not 60 degrees off it (${off})`);
        camera.position.set(0, 0, 900);
      }
      const card = hero.card;
      check(card && card.copy === L.COPY_BLOCK && card.drawn['dso-tarantula-nebula'], 'the hero names its words block and what it draws for each record');
    }
    hero.dispose();
  }
  check(counts[0] < counts[1] && counts[1] < counts[2], `points by tier: ${counts.join(' < ')}`);
  check(counts[2] <= 120000, `at most 120 000 points on the top tier (${counts[2]})`);
}

// --- no parallax anywhere in the hero, and no fetch at boot -------------------------------------------
{
  const src = readFileSync(join(JS, 'scene/deep/lmc.js'), 'utf8');
  check(!/parallax\s*[:=]|\.parallax\b/.test(src), 'scene/deep/lmc.js reads no parallax');
  const bake = readFileSync(join(ROOT, 'scripts/build_deep_lmc.py'), 'utf8');
  check(/SIGN\(parallax - 5 \* parallax_error - 0\.05\)/.test(bake), 'the bake uses parallax only to ask that it be consistent with zero');
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const w = COPY.deepLmc;
  check(w && w.rows && w.rows['dso-lmc'] && w.rows['dso-tarantula-nebula'], 'the card carries the distance caveats for both');
  check(w && w.card && /photograph and Gaia/.test(w.card.lmc), "and says what the model is built from (stage b's card[heroId] sentence)");
  for (const id of ['dso-lmc', 'dso-tarantula-nebula']) check(w.rows[id].some(([k, v]) => /not yet been reviewed by an astronomer/.test(v)), `${id}'s card says the model has not yet been reviewed by an astronomer`);
}

if (process.env.VERBOSE) console.log(NOTE.join("\n"));
if (problems.length) {
  console.error('hero_lmc FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('hero_lmc ok: the registry\'s tilt with the north-east near, the Tarantula and R136 inside the LMC, the catalogue extent, the photograph\'s cut filled, points by tier, depth from the layer only, the colour policy, Measured hides generated detail, the card\'s caveats');
