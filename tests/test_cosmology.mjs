// tests/test_cosmology.mjs -- the map's one cosmology (internal spec 0075 task 15, DS-D02, DS-D03).
//
//   node tests/test_cosmology.mjs
//
// site/js/data/cosmology.js integrates Planck 2018's universe in the browser. Astropy computed the same
// numbers once (scripts/cosmology_reference.py -> tests/fixtures/cosmology_astropy.json, with the Astropy
// version and the parameters as it printed them): the comoving distance, the light-travel time and the
// age at z = 0.01 to 1100, and the particle horizon. They must agree to a part in a million (the age at
// z = 1100, a few hundred thousand years, to ten parts in a million). Then the words: the distance now and
// the time the light took are different numbers, never the one read as the other, and the far things on
// the map (TON 618) are placed and described with them.
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const C = await import(join(JS, 'data/cosmology.js'));
const REF = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/cosmology_astropy.json'), 'utf8'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const rel = (a, b) => Math.abs(a / b - 1);

// ---- the parameters are Astropy's Planck18 -------------------------------------------------------
const P = REF.parameters;
check(C.PLANCK18.H0 === P.H0 && C.PLANCK18.Om0 === P.Om0 && C.PLANCK18.Tcmb0 === P.Tcmb0 && C.PLANCK18.Neff === P.Neff, 'H0, matter, the CMB temperature and Neff are Planck18\'s');
check(rel(C.OGAMMA0, P.Ogamma0) < 1e-9 && rel(C.ONU0, P.Onu0) < 1e-9 && rel(C.ODE0, P.Ode0) < 1e-12, `photons, neutrinos and dark energy as Astropy has them (${C.OGAMMA0}, ${C.ONU0}, ${C.ODE0})`);
check(Math.abs(C.E(0) - 1) < 1e-12, 'E(0) = 1: the universe is flat');
check(/Planck 2018/.test(C.PLANCK18.name) && /A&A 641, A6/.test(C.PLANCK18.source), 'the cosmology names itself and its paper');

// ---- the reference values ------------------------------------------------------------------------
const zs = REF.rows.map((r) => r.z);
for (const want of [0.01, 0.1, 0.5, 1, 2, 3, 6, 10, 1100]) check(zs.includes(want), `the fixture has z = ${want}`);
for (const r of REF.rows) {
  const chi = C.comovingMpc(r.z);
  const lb = C.lookbackGyr(r.z);
  const age = C.ageGyr(r.z);
  check(rel(chi, r.comoving_mpc) < 1e-6, `z = ${r.z}: comoving ${chi.toFixed(4)} Mpc, Astropy ${r.comoving_mpc.toFixed(4)}`);
  check(rel(C.comovingLy(r.z) / 1e9, r.comoving_gly) < 1e-6, `z = ${r.z}: comoving ${(C.comovingLy(r.z) / 1e9).toFixed(4)} Gly, Astropy ${r.comoving_gly.toFixed(4)}`);
  check(rel(lb, r.lookback_gyr) < 1e-6, `z = ${r.z}: light-travel time ${lb.toFixed(5)} Gyr, Astropy ${r.lookback_gyr.toFixed(5)}`);
  check(rel(age, r.age_gyr) < (r.z > 100 ? 1e-5 : 1e-6), `z = ${r.z}: age then ${age.toPrecision(6)} Gyr, Astropy ${r.age_gyr.toPrecision(6)}`);
  check(Math.abs(lb + age - C.ageGyr(0)) < 1e-9, `z = ${r.z}: the light-travel time and the age then add up to the age now`);
}
check(rel(C.ageGyr(0), REF.age_now_gyr) < 1e-9, `the age now: ${C.ageGyr(0).toFixed(4)} Gyr (Astropy ${REF.age_now_gyr.toFixed(4)})`);
check(rel(C.horizonLy() / 1e9, REF.horizon_gly) < 1e-6, `the particle horizon: ${(C.horizonLy() / 1e9).toFixed(4)} Gly (Astropy and scipy: ${REF.horizon_gly.toFixed(4)})`);

// ---- what the numbers mean -----------------------------------------------------------------------
{
  const h = C.horizonLy();
  check(h > 46e9 && h < 46.5e9, 'the observable universe is about 46 billion light-years in radius now (NASA: "about 92 billion light-years across")');
  check(C.cmbLy() < h && C.cmbLy() > C.comovingLy(10), 'the microwave background left from just inside the horizon, farther than any galaxy');
  check(C.lookbackGyr(1100) < 13.8 && C.ageGyr(0) > 13.7 && C.ageGyr(0) < 13.85, 'no light has travelled longer than the universe\'s age, 13.8 billion years');
  check(h / 1e9 > 3 * C.ageGyr(0), 'and yet the horizon is more than three times as many light-years away: space stretched meanwhile');
  // Never "redshift times a constant": the distance per unit redshift falls as z grows.
  const k1 = C.comovingLy(0.01) / 0.01, k2 = C.comovingLy(1) / 1, k3 = C.comovingLy(10) / 10;
  check(k1 > k2 && k2 > k3 * 2, `the distance is not proportional to the redshift (${(k1 / 1e9).toFixed(1)}, ${(k2 / 1e9).toFixed(1)}, ${(k3 / 1e9).toFixed(1)} billion ly per unit z)`);
  // Within the local volume the redshift-free distance and the cosmology agree to a few per cent.
  check(rel(C.comovingLy(0.01), C.lookbackGyr(0.01) * 1e9) < 0.01, 'at z = 0.01 (about 140 million light-years) distance and light-travel time agree to 1 %: the near map needs no cosmology');
  const w = C.distanceWords(2.219);
  check(w.cosmology === 'Planck 2018' && Math.abs(w.lookbackGyr - 10.83) < 0.01 && Math.abs(w.comovingGly - 18.31) < 0.01, `the card's two numbers for z = 2.219: light left ${w.lookbackGyr.toFixed(2)} billion years ago, ${w.comovingGly.toFixed(2)} billion light-years away now`);
  check([-1, NaN, Infinity].every((z) => Number.isNaN(C.comovingLy(z))), 'a redshift that is not one is refused (NaN), not guessed');
  const t0 = Date.now();
  for (let i = 0; i < 20; i++) C.comovingLy(1 + i * 0.1);
  const ms = (Date.now() - t0) / 20;
  check(ms < 20, `one conversion takes ${ms.toFixed(2)} ms`);
}

// ---- the far things on the map ---------------------------------------------------------------------
{
  const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
  const withZ = EXOTICS.filter((x) => x.redshift !== undefined);
  check(withZ.length >= 1, 'TON 618 carries its redshift');
  for (const x of withZ) {
    const chi = C.comovingLy(x.redshift);
    check(rel(x.distLy, chi) < 0.005, `${x.name}: placed at ${x.distLy} ly, the comoving distance of z = ${x.redshift} (${chi.toFixed(0)})`);
    check(/comoving/.test(x.distance_note) && /light-travel/.test(x.distance_note) && /Planck 2018/.test(x.distance_note), `${x.name}: its note says which distance, which cosmology, and that we see it as it was`);
  }
  // Nothing at or past a billion light-years is placed without a redshift to say which distance it is.
  for (const x of EXOTICS) check(!(x.distLy >= 1e9) || x.redshift !== undefined, `${x.name} is ${x.distLy} ly out with no redshift`);
  // The card's "light left" row reads the light-travel time from the redshift, never the distance as years.
  const src = readFileSync(join(JS, 'ui/cardfacts.js'), 'utf8');
  check(/lookbackGyr\(z\)/.test(src) && /import \{ lookbackGyr \} from '\.\.\/data\/cosmology\.js'/.test(src), 'ui/cardfacts.js reads the light-travel time from data/cosmology.js for a row with a redshift');
  // And the card's three big numbers never turn that time into "N light-years away" (ui/cards.js heroNumbers).
  const Cards = await import(join(JS, 'ui/cards.js'));
  const { COPY } = await import(join(JS, 'copy/en.js'));
  const R = COPY.card.rows;
  const rows = [[R.distanceFromSun, '18 300 000 000 light-years'], [R.lightLeft, '10.8 billion years ago'], [R.mass, '40.7 billion Suns']];
  const tiles = Cards.heroNumbers({ id: 'exotic-ton-618', klass: 'exotic', meta: { redshift: 2.219, kind: 'blackhole' } }, {}, rows);
  check(!tiles.some((x) => x.key === 'lightLeft'), `a far record's big numbers leave out the light-travel time as a distance (${tiles.map((x) => x.key).join(', ')})`);
  const near = Cards.heroNumbers({ id: 'x', klass: 'exotic', meta: { kind: 'blackhole' } }, {}, rows);
  check(near.some((x) => x.key === 'lightLeft'), 'a near one keeps it (light-years and years of light agree there)');
}

// ---- the horizon's words on the scene ------------------------------------------------------------------
{
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const W = COPY.deepCosmos;
  check(W && /observable universe/.test(W.horizon) && /\{n\} billion light-years away now/.test(W.horizonNow) && /\{age\} billion years ago/.test(W.horizonWhy), 'the horizon\'s label says the distance now and the time the light took');
  check(/Nothing measured lies out here/.test(W.edgeNothing) && /illustration/.test(W.edgeNothing) && /\{h\} billion/.test(W.edgeWhy), 'past the horizon the scene says nothing measured lies there, and that the band is an illustration');
  for (const k of Object.keys(W)) check(W[k].length <= 72, `deepCosmos.${k} fits a phone's width as one line of the scene (${W[k].length} characters)`);
}

if (problems.length) {
  console.error(`cosmology: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`cosmology ok: Planck 2018 agrees with Astropy ${REF.astropy} at ${REF.rows.length} redshifts to a part in a million; the horizon ${(C.horizonLy() / 1e9).toFixed(2)} billion light-years, the age ${C.ageGyr(0).toFixed(2)} billion years; TON 618 placed at its comoving distance`);
