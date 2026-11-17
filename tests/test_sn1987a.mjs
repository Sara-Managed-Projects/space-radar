// tests/test_sn1987a.mjs -- SN 1987A's three rings at their measured size and tilt (internal #429, the deep-space review of
// 2026-11-16): the registry names each paper and its numbers; the equatorial ring's angular radius is the published 0.81
// arcseconds (Panagia's 808 +/- 17 mas) at 51.4 kpc and its radius 6.23e17 cm; the ring is tilted 43 degrees with its north
// edge toward us; the outer rings are larger, one on each side, with Table 3's axis ratios; one draw call, nothing at boot,
// the card's words in English and on the card, the budget.
//
//   node tests/test_sn1987a.mjs
import { readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/deep/sn1987a.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const P = (await import(join(JS, 'data/hero-sn1987a.js'))).HERO;
const { stage } = await import(join(JS, 'scene/stage.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const ARCSEC = 206264.806247, KPC_LY = 3261.5637769, CM_LY = 9.4607304725808e17;
const D2R = Math.PI / 180;
const rings = S.ringsOf(P);
const [er, nor, sor] = rings;

// --- 1. the registry: the papers and their numbers -----------------------------------------------------------------------
check(rings.length === 3 && rings.map((r) => r.part).join() === 'equatorial-ring,north-outer-ring,south-outer-ring', 'three rings');
check(rings.every((r) => r.source && r.what && r.points > 100), 'every ring says what it is, where it is from, and is marked by points');
check(P.sources.some((s) => /Sugerman/.test(s) && /astro-ph\/0502378/.test(s) && /Table 3/.test(s)) && P.sources.some((s) => /Panagia/.test(s) && /astro-ph\/0309416/.test(s)) && P.sources.some((s) => /Tziamtzis/.test(s) && /1008\.3387/.test(s)), 'Sugerman et al. 2005, Panagia 2003 and Tziamtzis et al. 2011 are named with their arXiv numbers');
// Sugerman et al. 2005 Table 3: ER a 0.647 b/a 0.98 PA 81.1; NOR 1.42 0.94 70.5 height 1.36; SOR 1.59 0.92 -1.1 height 1.00
check(er.a_ly === 0.647 && er.ratio_ba === 0.98 && er.pa_deg === 81.1 && er.x0_ly === 0.015, 'the equatorial ring is Table 3\'s row');
check(nor.a_ly === 1.42 && nor.ratio_ba === 0.94 && nor.pa_deg === 70.5 && nor.height_ly === 1.36 && nor.x0_ly === 0.26 && nor.y0_ly === 0.04, 'the northern outer ring is Table 3\'s row');
check(sor.a_ly === 1.59 && sor.ratio_ba === 0.92 && sor.pa_deg === -1.1 && Math.abs(sor.height_ly) === 1.00 && sor.x0_ly === 0.19 && sor.y0_ly === 0.06, 'the southern outer ring is Table 3\'s row');
check(er.incl_deg === 43 && nor.incl_deg === 45 && sor.incl_deg === 38, 'the tilts: 43 (Plait, Burrows, Tziamtzis), 45 and 38 degrees (Tziamtzis et al.)');
check(P.frame.at_kpc === 50 && P.frame.distance_kpc === 51.4 && Math.abs(P.frame.distance_ly - 51.4 * KPC_LY) < 100, 'the paper\'s 50 kpc and the record\'s 51.4 kpc (167 600 ly)');
check(P.shipped === true && P.review.by === 'Space Radar maintainers' && /not yet/.test(P.review.astronomer || ''), 'signed under the lead\'s policy, no astronomer\'s review claimed');
check(/ILLUSTRATIVE/.test(P.colours.note) && /Not drawn/.test(P.review.data_vs_model), 'illustrative colour and what is not drawn are declared');
const def = HEROES.find((h) => h.id === 'sn1987a');
check(def && def.record === 'dso-sn-1987a' && def.stub.shipped === P.shipped && /hero-sn1987a/.test(String(def.build)) && !/hero-/.test(String(def.profile)), 'its line in the hero list: a stub now, the profile with the build');
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects.find((o) => o.id === 'sn-1987a');
check(dso && dso.typeCode === 'SNR' && dso.parent === 'lmc' && Math.abs(dso.distLy - 167600) < 1 && near(dso.raDeg, 83.8667917, 1e-6) && near(dso.decDeg, -69.2699417, 1e-6), 'the record: a remnant in the LMC at 51.4 kpc, at 05h 35m 28.03s -69 16 11.79');

// --- 2. published numbers --------------------------------------------------------------------------------------------------
// Panagia 2003: R = 808 +/- 17 mas (angular), 6.23 +/- 0.08 e17 cm, d = 51.4 +/- 1.2 kpc. The ring's radius over the distance is its angle.
{
  const arcsec = S.angularRadiusArcsec(P, 'equatorial-ring');
  check(near(arcsec, 0.808, 0.017) && near(arcsec, 0.82, 0.01), `the equatorial ring's angular radius is ${arcsec.toFixed(3)} arcseconds (Panagia 2003: 0.808 +/- 0.017; about 0.8)`);
  const ly = er.a_ly * S.scaleOf(P);
  const cm = 6.23e17 / CM_LY; // Panagia's absolute radius in ly: 0.659
  check(near(ly, cm, 0.02), `its radius at 51.4 kpc is ${ly.toFixed(3)} ly; Panagia's 6.23e17 cm is ${cm.toFixed(3)} ly`);
  const angleCheck = 6.23e17 / CM_LY / (51.4 * KPC_LY) * ARCSEC;
  check(near(angleCheck, 0.808, 0.005), `Panagia's radius over his distance is ${angleCheck.toFixed(3)} arcseconds (his 808 mas)`);
  check(S.angularRadiusArcsec(P, 'north-outer-ring') > 1.7 && S.angularRadiusArcsec(P, 'north-outer-ring') < 1.85, `the northern outer ring: ${S.angularRadiusArcsec(P, 'north-outer-ring').toFixed(2)} arcseconds (Sugerman et al.: 1.77)`);
  check(S.angularRadiusArcsec(P, 'south-outer-ring') > S.angularRadiusArcsec(P, 'north-outer-ring'), 'the southern outer ring is the larger');
}

// --- 3. the geometry in the sky frame (x west, y north, z toward the Sun) ----------------------------------------------------
{
  const k = S.scaleOf(P);
  const E = S.ringPoints(P, er, 720), N = S.ringPoints(P, nor, 720), Sx = S.ringPoints(P, sor, 720);
  const ext = (a, j) => { let lo = Infinity, hi = -Infinity; for (let i = 0; i < a.length / 3; i++) { lo = Math.min(lo, a[3 * i + j]); hi = Math.max(hi, a[3 * i + j]); } return [lo, hi]; };
  const mean = (a, j) => { let s = 0; for (let i = 0; i < a.length / 3; i++) s += a[3 * i + j]; return s / (a.length / 3); };
  // a circle tilted 43 degrees from face-on is 1/cos(43) = 1.37 times longer than it is wide on the sky
  const [w0, w1] = ext(E, 0), [n0, n1] = ext(E, 1), [t0, t1] = ext(E, 2);
  const wide = w1 - w0, tall = n1 - n0;
  check(near(wide / 2, er.a_ly * k, 0.02) && near(tall / wide, 0.98 * Math.cos(43 * D2R), 0.05), `the equatorial ring spans ${wide.toFixed(3)} by ${tall.toFixed(3)} ly on the sky (a ${(tall / wide).toFixed(2)} ellipse: 0.98 cos 43 degrees = ${(0.98 * Math.cos(43 * D2R)).toFixed(2)})`);
  // the northern edge is nearest us
  const atNorth = (a) => { let k2 = 0; for (let i = 0; i < a.length / 3; i++) if (a[3 * i + 1] > a[3 * k2 + 1]) k2 = i; return a[3 * k2 + 2]; };
  const atSouth = (a) => { let k2 = 0; for (let i = 0; i < a.length / 3; i++) if (a[3 * i + 1] < a[3 * k2 + 1]) k2 = i; return a[3 * k2 + 2]; };
  check(atNorth(E) > atSouth(E) && near(t1 - t0, 2 * er.a_ly * k * Math.sin(43 * D2R) * 0.98 * 1, 0.1), `the equatorial ring's north edge is nearer us (${atNorth(E).toFixed(2)} against ${atSouth(E).toFixed(2)} ly toward the Sun)`);
  // the centres: the northern ring sits toward the far end of the axis (north and away), the southern toward the near end (south, toward us)
  check(mean(N, 1) > mean(Sx, 1) && mean(N, 2) < mean(Sx, 2), `the outer rings are on opposite sides: centres at y ${mean(N, 1).toFixed(2)} and ${mean(Sx, 1).toFixed(2)}, z ${mean(N, 2).toFixed(2)} and ${mean(Sx, 2).toFixed(2)} ly`);
  const along = (m) => Math.hypot(m[0], m[1], m[2]);
  check(near(along([mean(N, 0), mean(N, 1), mean(N, 2)]), 1.36 * k, 0.12) && near(along([mean(Sx, 0), mean(Sx, 1), mean(Sx, 2)]), 1.00 * k, 0.12), `the outer rings' centres are ${along([mean(N, 0), mean(N, 1), mean(N, 2)]).toFixed(2)} and ${along([mean(Sx, 0), mean(Sx, 1), mean(Sx, 2)]).toFixed(2)} ly from the supernova (Table 3: 1.36 and 1.00, scaled by ${k.toFixed(3)})`);
  // the equatorial ring is centred on the supernova (0.015 ly west)
  check(near(mean(E, 0), 0.015 * k, 0.003) && near(mean(E, 1), 0, 0.01), 'the equatorial ring is centred on the supernova, 0.015 ly west');
  // deterministic
  const E2 = S.ringPoints(P, er, 720);
  check(E.every((v, i) => v === E2[i]), 'the points are the same every run');
}

// --- 4. in a scene --------------------------------------------------------------------------------------------------------------
{
  stage.setWorld('local-group');
  const records = parseDso(JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')));
  const rec = records.find((r) => r.id === 'dso-sn-1987a');
  check(!!rec, 'the record is in the parsed catalogue');
  const hero = S.createHero(THREE, { profile: P, record: rec });
  check(hero.ready() && hero.levels.join() === '2,3' && hero.card.copy === 'deepSn1987a', 'ready at once (nothing to fetch), on levels 2 and 3');
  const scene = new THREE.Scene(); scene.add(hero.group);
  const camera = new THREE.PerspectiveCamera(45, 16 / 9, 1e-9, 1e12);
  camera.position.set(0, 0, 10); camera.updateMatrixWorld();
  hero.setLevel(2, 1);
  hero.frame({ camera, look: 'film', gain: 1 });
  const body = hero.group.getObjectByName('deep-hero-sn1987a-shells');
  check(body && body.visible && hero.stats().points === 961 && hero.stats().meshes === 1, 'one draw call: 360 + 300 + 300 points and the mark, visible');
  hero.group.traverse((o) => { if (o.material && o.material.fragmentShader) for (const src of [o.material.vertexShader, o.material.fragmentShader]) for (const m of src.matchAll(/^uniform \w+ (\w+);/gm)) check(m[1] in o.material.uniforms, `${o.name}: the shader's uniform ${m[1]} is given`); });
  hero.setLevel(1, 1); hero.frame({ camera, look: 'film', gain: 1 });
  check(!hero.group.visible, 'not drawn on level 1');
  for (const [name, src] of Object.entries(S.SHADERS)) check(!/bloom|EffectComposer|WebGLRenderTarget/i.test(src), `${name}: no bloom, no pass, no render target`);
  hero.dispose();
}

// --- 5. the card, the budget, the boot graph ----------------------------------------------------------------------------------------
{
  await import(join(JS, 'copy/en.deepdata.js'));
  const B = COPY.deepSn1987a;
  check(B && /Sugerman/.test(B.card.sn1987a) && /illustrative/.test(B.card.sn1987a) && /Not yet reviewed by an astronomer/.test(B.card.sn1987a), 'the card names the papers, says what is illustrative and that no astronomer has reviewed it');
  const rows = B.rows['dso-sn-1987a'];
  check(rows.length === 6 && rows.some(([a, b]) => /Measured/.test(b)) && rows.some(([a, b]) => /51\.4/.test(b) && /Panagia/.test(b)), 'six rows: the measured rings, the distance, what is not drawn');
  check(/cardfacts/.test('') || readFileSync(join(JS, 'ui/cardfacts.js'), 'utf8').includes("'deepSn1987a'"), 'the card reads the block');
  const bytes = statSync(join(JS, 'scene/deep/sn1987a.js')).size + statSync(join(JS, 'data/hero-sn1987a.js')).size;
  check(bytes <= BUDGETS.deep_sn1987a_bytes, `the module and its profile are ${bytes} B, within ${BUDGETS.deep_sn1987a_bytes}`);
  check(BUDGETS.deep_sn1987a_draw_calls === 1, 'one draw call in the budget');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/deep\/sn1987a\.js|hero-sn1987a/.test(main), 'nothing at boot: only scene/deep/heroes.js names its modules');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(credits.includes("### SN 1987A's rings, at their measured size and tilt (2026-11-17)") && /Panagia/.test(credits) && /Tziamtzis/.test(credits), 'CREDITS.md has the section the hero\'s credit points to');
}

if (problems.length) {
  console.error(`test_sn1987a: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('test_sn1987a: ok (the papers\' numbers, the ring\'s 0.82 arcseconds at 51.4 kpc against Panagia\'s 808 mas, the 43 degree tilt with its north edge near, the outer rings, one draw call, the card, the budget)');
