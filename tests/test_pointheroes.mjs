// tests/test_pointheroes.mjs -- the Vela pulsar wind nebula (Ng & Romani's fitted tori) and the Cat's Eye (Clairmont, Steffen &
// Koning's morpho-kinematic model), the deep-space review of 2026-11-16 (ideas 8 and 14; internal #426, #430): every shape
// number is the paper's (registry/deepsky-heroes/vela.yaml, catseye.yaml name the table or section), the record is where
// its source puts it, the geometry the module draws is the geometry the paper fits (radius, tilt, position angle, the
// co-latitude the paper itself computes, the cones' angles), the near side of a flow is the bright one, the Measured look
// drops what is modelled or illustrative, the card says what is measured and that no astronomer reviewed it, nothing is
// in the boot graph, and the budgets hold.
//
//   node tests/test_pointheroes.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const V = await import(join(JS, 'scene/deep/vela.js'));
const K = await import(join(JS, 'scene/deep/catseye.js'));
const SP = await import(join(JS, 'scene/deep/softpoints.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const PV = (await import(join(JS, 'data/hero-vela.js'))).HERO;
const PK = (await import(join(JS, 'data/hero-catseye.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const D2R = Math.PI / 180, ARCSEC = D2R / 3600;
const part = (P, k) => P.layers.find((l) => l.part === k);
const dsoAll = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;

// --- 1. the registry: the papers' numbers, the sources named, shipped under the review policy ---------------------------
const tori = part(PV, 'tori');
check(tori.pa_deg === 130.63 && tori.incl_deg === 63.6 && tori.r_arcsec === 21.25 && tori.blur_arcsec === 3.0 && tori.beta === 0.44 && tori.sep_arcsec === 11.61, 'Vela: the tori are Ng & Romani 2004 Table 1\'s row (130.63, 63.60, 21.25, 3.0, 0.44, 11.61)');
check(/Ng, C\.-Y\. & Romani, R\. W\. 2004/.test(tori.source) && /Table 1/.test(tori.source) && /2008/.test(tori.source), 'Vela: the fit\'s papers are named');
check(part(PV, 'jets').beta === 0.45 && /Pavlov/.test(part(PV, 'jets').source) && /Space Radar's/.test(part(PV, 'jets').source), 'Vela: the jets\' speed is cited, their length is said to be Space Radar\'s');
const pr = part(PK, 'partial_rings');
check(pr.half_opening_deg === 38 && pr.tilt_deg === 17 && pr.span_deg === 300 && part(PK, 'jets').tilt_deg === 26 && part(PK, 'jets').to_arcsec === 19, 'Cat\'s Eye: the cones (38, 17, 300 degrees) and the jets (26 degrees, 19 arcseconds) are Clairmont et al. 2022\'s');
check(part(PK, 'outer').speed_kms.pole === 33.5 && part(PK, 'outer').speed_kms.waist === 25 && part(PK, 'ansae').speed_kms === 44 && part(PK, 'jets').speed_kms === 72 && part(PK, 'equatorial').speed_kms === 24, 'Cat\'s Eye: the speeds are the paper\'s');
check(/Clairmont/.test(PK.sources[0]) && /2209\.01313/.test(PK.sources[0]), 'Cat\'s Eye: the paper is named with its arXiv number');
check(/heic0414a/.test(part(PK, 'axis').source) && /[Rr]ead off/.test(PK.review.data_vs_model), 'Cat\'s Eye: what is read off Hubble\'s picture is said to be, and which picture');
for (const [P, name] of [[PV, 'Vela'], [PK, 'Cat\'s Eye']]) {
  check(P.shipped === true && P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || ''), `${name}: signed under the lead's policy, no astronomer's review claimed`);
  check(P.drawn.includes('reconstruction') && P.drawn.includes('model') && /ILLUSTRATIVE/.test(P.colours.note), `${name}: drawn as a reconstruction and a model, with illustrative colours, and the profile says so`);
  check(/Modelled/.test(P.review.data_vs_model) && /Illustrative/.test(P.review.data_vs_model) && /Measured/.test(P.review.data_vs_model), `${name}: the review row names measured, modelled and illustrative`);
}

// --- 2. the records: where the sources put them ---------------------------------------------------------------------------
const vela = dsoAll.find((o) => o.id === 'vela-pulsar-wind-nebula');
const psr = EXOTICS.find((e) => e.id === 'vela-pulsar');
check(vela && psr && near(vela.raDeg, psr.raDeg, 1e-4) && near(vela.decDeg, psr.decDeg, 1e-4) && near(vela.distLy, psr.distLy, 0.5), 'Vela: the record is at its pulsar (registry/exotics.yaml vela-pulsar), as far');
check(vela && near(vela.majAxArcmin * 60, 2 * tori.r_arcsec, 0.5), 'Vela: its size is the fitted torus\' diameter');
check(near(PV.frame.ra_deg, vela.raDeg, 1e-5) && PV.frame.distance_ly === vela.distLy, 'Vela: the profile\'s frame is the record\'s place');
const cat = dsoAll.find((o) => o.id === 'cats-eye-nebula');
check(cat && near(cat.distLy, 1310 * 3.261563777, 1) && cat.distance && cat.distance.method === 'parallax' && /Chornay/.test(cat.distance.source), 'Cat\'s Eye: the record\'s distance is 1.31 kpc, Gaia, Chornay & Walton 2021 as the paper uses it');
check(PK.frame.distance_ly === cat.distLy && near(PK.frame.ra_deg, cat.raDeg, 1e-4), 'Cat\'s Eye: the profile\'s frame is the record\'s place');
for (const [id, rec, P] of [['vela', 'dso-vela-pulsar-wind-nebula', PV], ['catseye', 'dso-cats-eye-nebula', PK]]) {
  const def = HEROES.find((h) => h.id === id);
  check(def && def.record === rec && def.stub.shipped === P.shipped && JSON.stringify(def.stub.drawn) === JSON.stringify(P.drawn) && /hero-/.test(String(def.build)) && !/hero-/.test(String(def.profile)), `${id}: its line in the hero list carries a stub, and its profile is read with the module`);
}

// --- 3. Vela's geometry is the fit's ------------------------------------------------------------------------------------------
const T = V.torusOf(PV);
const ly = (a) => a * ARCSEC * 959;
check(near(T.rLy, ly(21.25), 1e-9) && near(T.blurLy, ly(3.0), 1e-9), 'the torus radius and thickness are 21.25 and 3.0 arcseconds at 959 ly');
const tilt = Math.acos(T.axis[2]) / D2R;
const paOnSky = (Math.atan2(-T.axis[0], T.axis[1]) / D2R + 360) % 360;
check(near(tilt, 63.6, 1e-6) && near(paOnSky, 130.63, 1e-6), `the axis is 63.6 degrees from our line and at position angle 130.63 on the sky (${tilt.toFixed(2)}, ${paOnSky.toFixed(2)})`);
check(near(Math.abs(T.axis[0] * T.e1[0] + T.axis[1] * T.e1[1] + T.axis[2] * T.e1[2]), 0, 1e-9) && near(T.axis[0] * T.e2[0] + T.axis[1] * T.e2[1] + T.axis[2] * T.e2[2], 0, 1e-9), 'the torus\' plane is square to its axis');
check(near(V.thetaTorus(PV), 74, 1.5), `the tori's co-latitude from the pulsar is ${V.thetaTorus(PV).toFixed(1)} degrees; Ng & Romani 2004 compute "approximately 74"`);
// the two tori, seen from us, are 11.61 arcseconds apart: their centres differ by 2 x halfSep along the axis, whose sky part is x sin(tilt)
check(near(2 * T.halfSepLy * Math.sin(tilt * D2R), ly(11.61), 1e-9), 'the sky separation of the two tori is 11.61 arcseconds');
const S1 = V.setOf(PV, { detail: 1 }), S2 = V.setOf(PV, { detail: 1 });
check(S1.count > 1500 && S1.count < 4000 && S1.pos.every((x, i) => x === S2.pos[i]), `Vela: ${S1.count} points, the same on every visit`);
let up = 0, down = 0, off = 0, torusN = 0;
S1.kinds.forEach((k, i) => {
  if (k !== 'torus') return;
  torusN++;
  const p = [S1.pos[i * 3], S1.pos[i * 3 + 1], S1.pos[i * 3 + 2]];
  const z = p[0] * T.axis[0] + p[1] * T.axis[1] + p[2] * T.axis[2];
  if (z > 0) up++; else down++;
  const across = Math.hypot(p[0] - z * T.axis[0], p[1] - z * T.axis[1], p[2] - z * T.axis[2]);
  if (Math.abs(across - T.rLy) > 5 * T.blurLy || Math.abs(Math.abs(z) - T.halfSepLy) > 5 * T.blurLy) off++;
});
check(up === down && torusN === 2 * up && off === 0, 'the torus points lie on two circles of the fitted radius, one each side of the pulsar, within five thicknesses');
check(S1.kinds.filter((k) => k === 'pulsar').length === 1 && S1.pos[S1.kinds.indexOf('pulsar') * 3] === 0, 'one pulsar, at the origin');
// the near side is the bright one: from the camera's side a ring point's flow toward us is boosted, the opposite is dimmed
check(SP.boostOf(0.44, 1) > 4 * SP.boostOf(0.44, -1) && near(SP.boostOf(0, 0.3), 1, 1e-12), 'a flow at 0.44 c toward the camera is more than four times as bright as one away (Gamma = 1.5)');
check(near(SP.boostOf(0.44, 1), 0.56 ** -2.5, 1e-9), 'the factor is Ng & Romani\'s (1 - beta cos)^-(1+Gamma)');
const lv = V.lookFor('measured'), lf = V.lookFor('film');
check(lv.jets === 0 && lv.tori === 1 && lv.pulsar === 1 && lf.jets === 1, 'under Measured the modelled jets go and the fitted tori stay');

// --- 4. the Cat's Eye's geometry is the model's ---------------------------------------------------------------------------------
const F = K.frameOf(PK);
const upSky = F.up;
const incl = Math.acos(upSky[2]) / D2R;
check(near(incl, 80, 1e-6) && upSky[1] > 0.9, `the north end of the axis is the near one: it is ${incl.toFixed(0)} degrees from the line toward us (the axis is 80 from our line) and points up the sky`);
check(Math.abs(F.e1[0] * upSky[0] + F.e1[1] * upSky[1] + F.e1[2] * upSky[2]) < 1e-9 && near(Math.hypot(...F.e2), 1, 1e-9), 'the frame is orthonormal');
const KS = K.setOf(PK, { detail: 1 }), KS2 = K.setOf(PK, { detail: 1 });
check(KS.count > 4000 && KS.count < 9000 && KS.pos.every((x, i) => x === KS2.pos[i]), `Cat's Eye: ${KS.count} points, the same on every visit`);
const kly = K.arcsecLy(cat.distLy);
const along = (i) => (KS.pos[i * 3] * F.up[0] + KS.pos[i * 3 + 1] * F.up[1] + KS.pos[i * 3 + 2] * F.up[2]) / kly;
const reach = (kind) => Math.max(...KS.kinds.map((k, i) => (k === kind ? Math.abs(along(i)) : 0)));
check(reach('outer') > 14 && reach('outer') < 16.5, `the outer shell reaches ${reach('outer').toFixed(1)} arcseconds along the axis (the two lobes' 4.7 + 10.7)`);
check(reach('inner') < 6.1 && reach('inner') > 5.5, `the inner shell is a prolate ellipsoid: ${reach('inner').toFixed(1)} arcseconds along the axis`);
check(reach('ansa') > 21.5 && reach('ansa') < 30, 'the ansae lie beyond the outer shell, on the axis');
check(reach('jet') < 19.5 && reach('jet') > 10, 'the jets reach no further than the paper\'s 19 arcseconds');
// point symmetry: every partial-ring point has its partner through the star
const pi = KS.kinds.map((k, i) => (k === 'partial' ? i : -1)).filter((i) => i >= 0);
let asym = 0;
for (let j = 0; j < pi.length; j += 2) { const a = pi[j], b = pi[j + 1]; for (let c = 0; c < 3; c++) if (!near(KS.pos[a * 3 + c], -KS.pos[b * 3 + c], 1e-9)) asym++; }
check(pi.length >= 600 && pi.length % 2 === 0 && asym === 0, 'the two partial rings are point-symmetric: each point has its partner through the star');
// the cone: a ring's points lie 38 degrees from the cone's axis, which is 17 degrees from the nebula's
{
  const arc = K.ringArc(F, { L: 12, alphaDeg: 38, betaDeg: 17, spanDeg: 300, tiltAzDeg: 0, startDeg: 0 }, 60);
  const mean = arc.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0]);
  const dotUp = (p) => Math.acos((p[0] * F.up[0] + p[1] * F.up[1] + p[2] * F.up[2]) / Math.hypot(...p)) / D2R;
  const angs = arc.map(dotUp);
  // seen from the nebula's axis the points stay within beta +/- alpha of it, and reach alpha + beta at most and alpha - beta at least
  check(near(Math.max(...angs), 38 + 17, 1.5) && near(Math.min(...angs), 38 - 17, 1.5), `the ring's points are ${Math.min(...angs).toFixed(0)} to ${Math.max(...angs).toFixed(0)} degrees from the nebula's axis (a 38-degree cone leaning 17)`);
  check(arc.every((p) => near(Math.hypot(...p), 12, 0.3)) && Math.hypot(...mean) > 0, 'every point of the ring is at the slant length');
}
check(K.lookFor('measured').mono === 1 && K.lookFor('film').mono === 0 && K.UNDER_MEASURED.colour === 'hidden' && K.UNDER_MEASURED.shells === 'same', 'under Measured the colours (illustrative) go to grey, the shapes stay');

// --- 5. the heroes: built, placed, one or two draw calls, the Measured look --------------------------------------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('stellar');
  const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-4, 1e9);
  for (const [mod, P, dsoRow, calls, block, id] of [[V, PV, vela, 2, 'deepVela', 'vela'], [K, PK, cat, 1, 'deepCatsEye', 'catseye']]) {
    const rec = parseDso({ objects: [dsoRow] })[0];
    const hero = mod.createHero(THREE, { profile: P, record: rec });
    check(hero.levels.join() === '2,3' && hero.latchSafe === true && hero.card.copy === block, `${id}: what a hero answers: its levels, its card block`);
    check(hero.card.drawn[dsoRow.id ? `dso-${dsoRow.id}` : ''].join() === 'reconstruction,model', `${id}: the card is told it is a reconstruction and a model`);
    hero.setLevel(2, 1);
    hero.frame({ camera: cam, look: 'film', gain: 1 });
    const meshes = [];
    hero.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
    check(meshes.length === calls && meshes.every((m) => /-shells$/.test(m.name) && m.material.depthWrite === false && m.material.blending === THREE.AdditiveBlending), `${id}: ${calls} additive draw call(s), named for the contract's draw-order check`);
    check(meshes.every((m) => m.material.uniforms.uShare.value === 1 && m.visible), `${id}: drawn at level 2`);
    hero.frame({ camera: cam, look: 'measured', gain: 1 });
    if (id === 'vela') check(meshes.filter((m) => m.visible).length === 1, 'Vela under Measured: the jets are off, the fitted tori on');
    else check(meshes[0].material.uniforms.uMono.value === 1 && meshes[0].visible, 'the Cat\'s Eye under Measured: grey, still drawn');
    hero.setLevel(0, 0);
    check(hero.group.visible === false, `${id}: not drawn below level 2`);
    check(hero.stats().bytes > 0 && hero.stats().points > 500, `${id}: its stats`);
    hero.dispose();
  }
}
check(/uMono/.test(SP.SOFT_SHADERS.vertex) && !/texture2D|sampler2D/.test(SP.SOFT_SHADERS.frag) && /iLook\.y > 0\.0/.test(SP.SOFT_SHADERS.vertex), 'the shader has no texture, a switch for grey and a boost only where a flow speed is given');

// --- 6. the cards' words: measured, modelled and illustrative named, no astronomer's review claimed, the sources named -------------
await import(join(JS, 'copy/en.deepdata.js'));
const CV = COPY.deepVela, CK = COPY.deepCatsEye;
const rv = CV.rows['dso-vela-pulsar-wind-nebula'], rk = CK.rows['dso-cats-eye-nebula'];
check(/Ng and Romani/.test(CV.card.vela) && /modelled/.test(CV.card.vela) && /illustrative/.test(CV.card.vela) && /Not yet reviewed by an astronomer/.test(CV.card.vela), 'Vela: the card\'s sentence names the paper, what is modelled and illustrative and that no astronomer reviewed it');
check(/Clairmont, Steffen and Koning, 2022/.test(CK.card.catseye) && /read off Hubble/.test(CK.card.catseye) && /illustrative/.test(CK.card.catseye) && /Not yet reviewed by an astronomer/.test(CK.card.catseye), 'Cat\'s Eye: the card\'s sentence names the paper, what is read off Hubble\'s picture and that no astronomer reviewed it');
check(rv.some((r) => /^Measured/.test(r[1])) && rv.some((r) => /^Modelled/.test(r[1])) && rv.some((r) => /^Illustrative/.test(r[1])) && rk.some((r) => /^Measured/.test(r[1])) && rk.some((r) => /^Modelled/.test(r[1])) && rk.some((r) => /^Illustrative/.test(r[1])), 'the rows say which part is measured, modelled and illustrative');
check(rv.some((r) => /21\.25 arcseconds/.test(r[1]) && /63\.6°/.test(r[1]) && /130\.6°/.test(r[1]) && /11\.61/.test(r[1]) && /0\.44/.test(r[1] + ' ' + rv.map((x) => x[1]).join(' '))), 'Vela: the numbers on the card are the registry\'s');
check(rk.some((r) => /38°/.test(r[1]) && /17°/.test(r[1]) && /300°/.test(r[1])) && rk.some((r) => /2 136/.test(r[1]) && /4 272/.test(r[1])), 'Cat\'s Eye: the cone and the age on the card are the registry\'s');
check(rv.some((r) => /not yet been reviewed by an astronomer/.test(r[1])) && rk.some((r) => /not yet been reviewed by an astronomer/.test(r[1])), 'each card has a Review row');
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(/Pulsar wind nebulae and the Cat's Eye \(2026-11-17\)/.test(credits) && /arXiv:astro-ph\/0310155/.test(credits) && /arXiv:2209\.01313/.test(credits) && /heic0414a/.test(credits), 'CREDITS.md names both papers and the Hubble picture');

// --- 7. bytes: small, and not in the boot graph ------------------------------------------------------------------------------------
const bytes = ['scene/deep/vela.js', 'scene/deep/catseye.js', 'scene/deep/softpoints.js', 'data/hero-vela.js', 'data/hero-catseye.js'].reduce((n, f) => n + readFileSync(join(JS, f)).length, 0);
check(BUDGETS.deep_pointheroes_bytes > 0 && bytes <= BUDGETS.deep_pointheroes_bytes, `the modules and profiles are within their budget (${bytes} B of ${BUDGETS.deep_pointheroes_bytes})`);
check(BUDGETS.deep_vela_draw_calls === 2 && BUDGETS.deep_catseye_draw_calls === 1, 'their draw calls have budgets');
for (const f of ['main.js', 'scene/deep/deepsky.js', 'scene/deep/heroes.js']) {
  const src = readFileSync(join(JS, f), 'utf8');
  check(!/^import[^'"]*['"][^'"]*(vela|catseye|softpoints|en\.deepdata)[^'"]*['"]/m.test(src), `${f} does not import them statically`);
}

if (problems.length) { console.error(problems.map((p) => 'FAIL ' + p).join('\n')); console.error(`\n${problems.length} problem(s)`); process.exit(1); }
console.log('ok: tests/test_pointheroes.mjs');
