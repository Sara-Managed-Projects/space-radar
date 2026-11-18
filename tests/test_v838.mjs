// tests/test_v838.mjs -- V838 Monocerotis' light echo (the deep-space review of 2026-11-16, idea 12; internal #428): the paraboloid
// of the light-echo papers cutting a modelled dust, at the app clock's date.
//
//   1. the physics: r - z = ct is the paraboloid z = x^2/(2ct) - ct/2; a ring grows faster than light by Bond et al.'s formula
//   2. the time: the clock's date less HJD 2 452 343 gives the 72, 177, 282 and 1 377 days Sparks et al. quote for their epochs
//   3. the registry: the numbers are the papers', the sources named, the record where its source puts it, at 6.1 kpc
//   4. the dust: a cavity of 0.15 pc, nothing beyond 2 pc, the same every visit
//   5. the hero: built, placed, two additive draw calls, lit only on the paraboloid, none before the outburst, held after mid-2008, off under Measured
//   6. the words: eleven languages, measured / modelled / illustrative named, the papers and the two Hubble pictures credited, nothing shipped
//
//   node tests/test_v838.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const V = await import(join(JS, 'scene/deep/v838.js'));
const { HEROES } = await import(join(JS, 'scene/deep/heroes.js'));
const { BUDGETS } = await import(join(JS, 'data/budgets.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { parseDso } = await import(join(JS, 'data/parsers.js'));
const P = (await import(join(JS, 'data/hero-v838.js'))).HERO;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const part = (k) => P.layers.find((l) => l.part === k);
const dsoAll = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;

// --- 1. the physics ----------------------------------------------------------------------------------------------------------
{
  // a point on the paraboloid at time t (c = 1): x^2 + z^2 = (t + z)^2
  for (const t of [0.2, 0.5, 1.7, 3.8]) for (const x of [0.1, 0.4, 1, 2.5]) {
    const z = V.paraboloidZ(x, t);
    check(near(V.depthOf(x, 0, z), t, 1e-9), `the paraboloid z = x^2/2ct - ct/2 has r - z = ct (x ${x}, t ${t})`);
  }
  check(near(V.paraboloidZ(0.5, 0.5), 0.5 * 0.5 / (2 * 0.5) - 0.25, 1e-12) && V.paraboloidZ(0.3, 1) < 0 && V.paraboloidZ(5, 1) > 0, 'it opens toward us: behind the sky plane near the star, in front of it far out');
  // the rim in the sky plane is at x = ct; Bond et al.'s apparent speed of a ring on a shell of radius r: dx/dt = (r - t) / sqrt(2 r t - t^2)
  const ring = (r, t) => Math.sqrt(2 * r * t - t * t);
  for (const [r, t] of [[2, 0.2], [2, 0.8], [5, 1.5]]) {
    const h = 1e-6, numeric = (ring(r, t + h) - ring(r, t - h)) / (2 * h), formula = (r - t) / Math.sqrt(2 * r * t - t * t);
    check(near(numeric, formula, 1e-5), `a ring on a shell of ${r} ly grows by ${formula.toFixed(3)} c at t ${t}: Bond et al.'s formula`);
    if (t < r / 4) check(formula > 1, `and that is faster than light (${formula.toFixed(2)} c) while the echo is young`);
  }
}

// --- 2. the time -------------------------------------------------------------------------------------------------------------
{
  const days = (iso) => V.echoTime(Date.parse(iso), 2452343) * 365.25;
  check(near(V.outburstMs(), Date.UTC(2002, 2, 9, 12), 3600e3), `the mean date HJD 2 452 343 is 2002 March 9 (${new Date(V.outburstMs()).toISOString()})`);
  // Sparks et al. 2008, section 4.1: the four polarimetric epochs are "about 72, 177, 282 and 1377 days" after the mean date
  for (const [iso, want] of [['2002-05-20T12:00:00Z', 72], ['2002-09-02T12:00:00Z', 177], ['2002-12-17T12:00:00Z', 282], ['2005-12-16T12:00:00Z', 1377]]) {
    check(near(days(iso), want, 1.5), `${iso.slice(0, 10)} is ${days(iso).toFixed(1)} days after the mean date; Sparks et al. say ${want}`);
  }
  const w = { from: -36, to: 61, edge: 6 };
  check(V.windowOf(-40, w) === 0 && V.windowOf(70, w) === 0 && V.windowOf(10, w) === 1 && V.windowOf(-33, w) > 0 && V.windowOf(-33, w) < 1, 'the outburst window: 97 days, soft edges');
  check(V.shownTime(-1, w, 6.4).before === true && V.shownTime(0.1, w, 6.4).before === false && V.shownTime(10, w, 6.4).held === true && V.shownTime(10, w, 6.4).t === 6.4 && V.shownTime(3, w, 6.4).held === false, 'before the outburst: none; after the dust ends: held');
}

// --- 3. the registry ---------------------------------------------------------------------------------------------------------
{
  const echo = part('echo'), dust = part('dust');
  check(echo.t0_hjd === 2452343 && echo.from_days === -36 && echo.to_days === 61, 'the outburst: mean HJD 2452343, the window HJD 2452307 to 2452404 (-36 to +61 days)');
  check(/Sparks et al\. 2008/.test(echo.source) && /Bond et al\. 2003/.test(echo.source) && /0711\.1495/.test(echo.source) && /astro-ph\/0303513/.test(P.sources.join(' ')), 'the papers are named');
  check(dust.cavity_pc === 0.15 && Math.max(...dust.shells_pc) <= 2 && Math.min(...dust.shells_pc) >= 0.15 && /Space Radar's/.test(dust.source), 'the dust: a 0.15 pc cavity, nothing past 2 pc, the shells said to be Space Radar\'s');
  check(P.shipped === true && P.drawn.join() === 'reconstruction,model' && P.review.by && /not yet/.test(P.review.astronomer), 'shipped under the review policy: no astronomer yet, said on the card');
  const row = dsoAll.find((o) => o.id === 'v838-monocerotis');
  check(!!row && row.distLy === 19896 && row.distLyLow === 17939 && row.distLyHigh === 21853, '6.1 +/- 0.6 kpc: 19 896 ly, 17 939 to 21 853');
  check(near(row.raDeg, (7 + 4 / 60 + 4.822 / 3600) * 15, 1e-5) && near(row.decDeg, -(3 + 50 / 60 + 50.53 / 3600), 1e-5), 'the place is the infobox\'s 07h 04m 04.822s, -03 50 50.53');
  check(/Sparks/.test(row.distanceSource) && /Bond/.test(row.distanceSource) && row.typeText === 'light echo round an erupted star' && row.kind === 'nebula', 'the record names its papers and its type phrase');
  const half = Math.tan((row.majAxArcmin / 60 / 2) * Math.PI / 180) * row.distLy;
  check(near(half / 3.261563777, 2, 0.05), `the record is 4 pc across (${(half / 3.261563777).toFixed(2)} pc half)`);
  const h = HEROES.find((x) => x.id === 'v838');
  check(h && h.record === 'dso-v838-monocerotis' && h.stub.shipped === true && h.stub.drawn.join() === 'reconstruction,model', 'heroes.js lists it for the record');
  check(P.record === 'dso-v838-monocerotis' && P.frame.distance_ly === row.distLy, 'the profile\'s frame is the record\'s distance');
}

// --- 4. the dust -------------------------------------------------------------------------------------------------------------
{
  const D = V.dustOf(P), D2 = V.dustOf(P);
  const ly = 3.261563777;
  check(D.n > 12000 && D.n <= 16100, `about 16 000 points (${D.n})`);
  check(Array.from(D.r).every((r) => r >= 0.15 * ly - 1e-4 && r <= 2.0 * ly + 1e-4), 'every point lies between the cavity (0.15 pc) and 2 pc');
  check(Array.from(D.pos).every((v, i) => v === D2.pos[i]), 'the same dust every visit (seeded)');
  const rmax = Math.max(...D.r), rmin = Math.min(...D.r);
  check(rmin >= 0.15 * ly - 1e-4 && rmax < 2.1 * ly, `inner ${(rmin / ly).toFixed(3)} pc, outer ${(rmax / ly).toFixed(3)} pc`);
  // each shell is clumpy: points are not spread evenly over the sphere (the busiest octant holds more than an eighth plus slack)
  const oct = new Array(8).fill(0);
  for (let i = 0; i < D.n; i++) oct[(D.pos[i * 3] > 0 ? 1 : 0) + (D.pos[i * 3 + 1] > 0 ? 2 : 0) + (D.pos[i * 3 + 2] > 0 ? 4 : 0)] += 1;
  check(Math.max(...oct) / D.n > 0.15, 'the dust is clumpy, not an even ball');
  check(near(V.holdYears(P), 6.4, 1e-9) && V.holdYears(P) >= Math.max(...part('dust').shells_pc) * ly - 0.1, 'the echo is held after the widest ring crosses the dust (6.4 years, mid-2008)');
}

// --- 5. the hero -------------------------------------------------------------------------------------------------------------
{
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('stellar');
  const cam = new THREE.PerspectiveCamera(50, 1.6, 1e-4, 1e9);
  const rec = parseDso({ objects: [dsoAll.find((o) => o.id === 'v838-monocerotis')] })[0];
  const hero = V.createHero(THREE, { profile: P, record: rec, quality: () => ({ tier: 1, latched: false }) });
  check(hero.levels.join() === '2,3' && hero.latchSafe === true && hero.card.copy === 'deepV838' && hero.card.drawn['dso-v838-monocerotis'].join() === 'reconstruction,model', 'what a hero answers: its levels and its card block');
  hero.setLevel(2, 1);
  const meshes = [];
  hero.group.traverse((o) => { if (o.isMesh) meshes.push(o); });
  check(meshes.length === 2 && meshes.every((m) => /-shells$/.test(m.name) && m.material.depthWrite === false && m.material.blending === THREE.AdditiveBlending), 'two additive draw calls, named for the contract');
  const lit = (iso) => { stage.tMs = Date.parse(iso); hero.frame({ camera: cam, look: 'film', gain: 1 }); return hero.stats(); };
  const a = lit('2001-06-01T00:00:00Z');
  check(a.before === true && a.lit === 0, 'before the outburst: only the star');
  const b = lit('2002-09-02T12:00:00Z');
  check(b.before === false && b.lit > 100 && b.lit < 6000 && near(b.years * 365.25, 177, 1.5), `2002 September 2: the echo is lit on a skin (${b.lit} of ${b.points - 1} points; ${(b.years * 365.25).toFixed(0)} days)`);
  const c = lit('2005-12-16T12:00:00Z');
  check(c.lit > 100 && near(c.years * 365.25, 1377, 1.5), `2005 December 16: the echo has grown (${c.lit} points lit)`);
  const d = lit('2008-12-01T00:00:00Z'), e = lit('2026-11-18T00:00:00Z');
  check(d.held === true && e.held === true && d.lit === e.lit && e.years === 6.4, `from mid-2008 the echo is held (${e.lit} points lit at 2026-11-18, 6.4 years)`);
  // the lit points ARE the paraboloid's skin: re-derive from the dust and compare the count
  const D = V.dustOf(P);
  const t = 177 / 365.25;
  let want = 0;
  for (let i = 0; i < D.n; i++) if (V.litWeight(D.delay[i], t, { from: -36, to: 61, edge: 6 }) > 0) want += 1;
  check(D.n === b.points - 1 && want === b.lit, `the lit count is what r - z = ct says (${b.lit} vs ${want})`);
  // a point is lit only where (t - (r - z))*365.25 is within the window
  let bad = 0;
  for (let i = 0; i < D.n; i++) { const s = (t - D.delay[i]) * 365.25; const w = V.litWeight(D.delay[i], t); if ((w > 0) !== (s > -36 && s < 61)) bad += 1; }
  check(bad === 0, 'no point is lit off the skin');
  hero.frame({ camera: cam, look: 'measured', gain: 1 });
  check(meshes.filter((m) => m.visible).length === 1 && V.lookFor('measured').echo === 0 && V.lookFor('measured').star === 1, 'under Measured the modelled dust is off, the star stays');
  hero.setLevel(0, 0);
  check(hero.group.visible === false, 'not drawn below level 2');
  check(hero.stats().bytes > 0 && hero.stats().points > 12000, 'its stats');
  hero.dispose();
}
check(BUDGETS.deep_v838_draw_calls === 2 && BUDGETS.deep_v838_bytes >= 15000 && BUDGETS.deep_v838_bytes <= 40000, 'the budgets');
check(readFileSync(join(JS, 'scene/deep/v838.js'), 'utf8').length + readFileSync(join(JS, 'data/hero-v838.js'), 'utf8').length < BUDGETS.deep_v838_bytes, 'the module and its profile are within deep_v838_bytes');
check(!/v838/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'nothing in main.js: not in the boot graph');

// --- 6. the words ------------------------------------------------------------------------------------------------------------
await import(join(JS, 'copy/en.deepdata.js'));
const C = COPY.deepV838, rows = C.rows['dso-v838-monocerotis'];
check(/Sparks and others, 2008/.test(C.card.v838) && /Bond and others, 2003/.test(C.card.v838) && /modelled/.test(C.card.v838) && /illustrative/.test(C.card.v838) && /Not yet reviewed by an astronomer/.test(C.card.v838), 'the card sentence names the papers, what is modelled and illustrative, and the review');
check(rows.length === 7 && /^Physics/.test(rows[0][1]) && rows.some((r) => /^Measured/.test(r[1])) && rows.some((r) => /^Modelled/.test(r[1])) && rows.some((r) => /^Illustrative/.test(r[1])) && /^Not shipped/.test(rows[5][1]), 'the rows: physics, measured, modelled, illustrative, Hubble not shipped');
const hub = rows[5][1];
check(/heic0304a/.test(hub) && /heic0503a/.test(hub) && /H\.E\. Bond \(STScI\)/.test(hub) && /Hubble Heritage Team \(AURA\/STScI\)/.test(hub) && /ESA\/Hubble/.test(hub) && /CC BY 4\.0/.test(hub), 'the two Hubble pictures are referenced with their credit lines and licence');
check(/held/i.test(rows[1][1]) && /6\.1 ± 0\.6/.test(rows[2][1]) && /19 900/.test(rows[2][1]) && /0\.15 parsecs/.test(rows[3][1]) && /2 parsecs/.test(rows[3][1]), 'the time row says the echo is held; the distance row 6.1 ± 0.6 kpc; the dust row its cavity and limit');
for (const lang of ['ar', 'de', 'es', 'fr', 'he', 'hi', 'pt', 'ru', 'uk', 'zh']) {
  const w = (await import(join(JS, `copy/${lang}.js`))).COPY.deepV838;
  const r = w && w.rows && w.rows['dso-v838-monocerotis'];
  check(!!w && !!r && r.length === 7 && w.card.v838 && w.card.v838 !== C.card.v838, `${lang}: the card and seven rows`);
  if (r) check(r.every((x, i) => x[0] !== rows[i][0] && x[1] !== rows[i][1] && x[1].length > 10) && /heic0304a/.test(r[5][1]) && /heic0503a/.test(r[5][1]) && /CC BY 4\.0/.test(r[5][1]) && /6[.,]1/.test(r[2][1]), `${lang}: no row left in English, the pictures and the distance named`);
}
const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
check(/### V838 Monocerotis' light echo \(2026-11-18\)/.test(credits) && /CC BY 4\.0/.test(credits.split("### V838 Monocerotis' light echo")[1].split('\n### ')[0]) && /referenced on the card and not shipped/.test(credits), 'CREDITS.md carries the section, the licence and "not shipped"');
check(!readFileSync(join(JS, 'scene/deep/v838.js'), 'utf8').match(/\.(jpe?g|png|webp|fits?)\b/i), 'no picture is read');

if (problems.length) { console.error('v838 FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('v838 ok: the paraboloid r - z = ct and Bond et al.\'s ring speed, the clock\'s date at the papers\' four epochs, 6.1 kpc, a clumpy modelled dust from 0.15 to 2 pc, lit on a skin only, held after mid-2008, off under Measured, the card in eleven languages with Hubble credited');
