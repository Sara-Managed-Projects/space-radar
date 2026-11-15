// tests/test_rotators.mjs -- the stars drawn flattened by their spin (scene/stardisc.js, registry/stars-notable.yaml `rotator:`,
// internal #276): that the numbers a card prints and the disc is drawn from are the papers', that the darkening law reproduces the
// papers' equator temperatures, that the spheroid is as good as a Roche surface, and that the axis points where the paper says.
//
//   node tests/test_rotators.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { rotatorLaw, rotatorPoint, poleDirection } = await import(join(JS, 'scene/stardisc.js'));
const { STARS_NOTABLE } = await import(join(JS, 'data/starsnotable.js'));
const { STAR_ROTATORS } = await import(join(JS, 'data/starrotators.js'));
const { recordsFromNames, SUN_RADIUS_KM } = await import(join(JS, 'scene/stars3d.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.stars.js'));
const DEG = Math.PI / 180;

// What each paper prints, typed again here from the table rows (not read from the registry), so a slip in the registry shows.
// [hip, name, Req, Rpol, Tpole, Teq, inclination, position angle, the paper's own beta or null]
const PAPERS = [
  [91262, 'Vega', 2.726, 2.418, 10070, 8910, 6.2, -58, 0.231],        // Monnier et al. 2012 (arXiv:1211.6055) Table 2, Model 3
  [97649, 'Altair', 2.008, 1.565, 8621, 6780, 50.65, 301.13, null],   // Bouchaud et al. 2019 (arXiv:1912.03138) Table 5, "This work"
  [49669, 'Regulus', 4.21, 3.22, 14520, 11010, 86.3, 258, 0.188],     // Che et al. 2011 (arXiv:1105.0740) Table 4, beta-free
  [86032, 'Rasalhague', 2.871, 2.390, 9300, 7460, 87.70, -53.88, 0.25], // Zhao et al. 2009 (arXiv:0906.2241) Table 4, standard
];

const rows = new Map(STARS_NOTABLE.map((r) => [r.hip, r]));
for (const [hip, name, req, rpol, tp, te, inc, pa, beta] of PAPERS) {
  const r = rows.get(hip);
  check(r && r.name === name, `${name}: the row exists`);
  const o = STAR_ROTATORS[String(hip)];
  if (!r || r.rotator !== true || !o) { check(false, `${name} has a rotator block (the row says so, the module has it)`); continue; }
  check(r.radius_suns === req, `${name}: the equatorial width is the paper's ${req} (${r.radius_suns})`);
  check(o.polar_radius_suns === rpol, `${name}: the polar radius is the paper's ${rpol} (${o.polar_radius_suns})`);
  check(o.teff_pole_k === tp && o.teff_eq_k === te, `${name}: the temperatures are the paper's ${tp} and ${te}`);
  check(o.inclination_deg === inc && o.pole_pa_deg === pa, `${name}: the angles are the paper's ${inc} and ${pa}`);
  check(/arxiv\.org\/abs\//.test(r.physical_source) && /\(read 2026-\d\d-\d\d\)$/.test(r.physical_source), `${name}: the paper and the day are named`);
  check(o.note === undefined && o.model === undefined && typeof r.rotator === 'boolean', `${name}: the paper's note stays in the YAML, and the first visit holds a flag, not the numbers`);

  // the law reproduces the equator, and agrees with the paper's own exponent where it gives one
  const law = rotatorLaw(rpol / req, tp, te);
  check(law.beta > 0.1 && law.beta < 0.4, `${name}: beta ${law.beta.toFixed(3)} is a gravity-darkening exponent`);
  if (beta !== null) check(near(law.beta, beta, 0.02), `${name}: beta ${law.beta.toFixed(3)} agrees with the paper's ${beta}`);
  const pole = [0, 0, 1];
  const atPole = rotatorPoint(0, 0, pole, law, tp);
  check(atPole && near(atPole.z, law.k, 1e-9) && near(atPole.mu, 1, 1e-9) && near(atPole.g, 1, 1e-9) && near(atPole.teffK, tp, 1e-6), `${name}: the pole seen from above is at the pole's temperature`);
  const edge = rotatorPoint(0.9999, 0, pole, law, tp);
  check(edge !== null && rotatorPoint(1.0001, 0, pole, law, tp) === null, `${name}: seen from the pole, the star is a disc of the equatorial radius`);
  const side = [0, 1, 0]; // axis in the picture: up
  const eq = rotatorPoint(0.9999, 0, side, law, tp);
  check(eq && near(eq.teffK, te, te * 0.002), `${name}: seen from the side, the limb at the equator is at the equator's temperature (${eq && eq.teffK.toFixed(0)} vs ${te})`);
  check(rotatorPoint(0, law.k * 0.9999, side, law, tp) !== null && rotatorPoint(0, law.k * 1.0001, side, law, tp) === null, `${name}: seen from the side, the star is as tall as its polar radius`);
  // monotonic: from the pole to the equator the temperature falls
  let last = Infinity, mono = true;
  for (let th = 0; th <= 90; th += 5) { const x = Math.sin(th * DEG) * 0.999, y = Math.cos(th * DEG) * law.k * 0.999; const p = rotatorPoint(x, y, side, law, tp); if (p.teffK > last + 1e-6) mono = false; last = p.teffK; }
  check(mono, `${name}: darker from the pole to the equator`);

  // The spheroid against a Roche surface, in the pole's units: how far the drawn edge is from the model the papers fitted.
  const q = req / rpol, c = (1 - 1 / q) / (q * q);
  let worst = 0;
  for (let th = 5; th <= 90; th += 5) {
    const s = Math.sin(th * DEG);
    let rr = 1; for (let i = 0; i < 60; i++) { const f = 1 / rr + c * rr * rr * s * s - 1; const df = -1 / (rr * rr) + 2 * c * rr * s * s; rr -= f / df; }
    const spher = 1 / Math.sqrt(s * s / (q * q) + (1 - s * s));
    worst = Math.max(worst, Math.abs(rr - spher) / rr);
  }
  check(worst < 0.04, `${name}: the spheroid is within 4 % of the Roche surface (${(worst * 100).toFixed(2)} %)`);

  // the record carries the block and the disc gets the ratio
  const rec = recordsFromNames([[1, name, '', '', hip, 'A0', 25, 1, 1, 1, 1, 1]])[0];
  check(rec && rec.meta.rotates === true && rec.meta.rotator === undefined, `${name}: the star record says it rotates and holds no numbers until they are fetched`);
}

// The axis. Vega is at RA 18h 36m 56.3s, Dec +38d 47m 01s (SIMBAD ICRS, J2000). Independent check: build the sky north and east in
// EQUATORIAL axes, take the ecliptic pole answer back to equatorial, and read the position angle and the tilt from the line of sight.
{
  const ra = (18 + 36 / 60 + 56.3 / 3600) * 15 * DEG, dec = (38 + 47 / 60 + 1 / 3600) * DEG;
  const star = [Math.cos(dec) * Math.cos(ra), Math.cos(dec) * Math.sin(ra), Math.sin(dec)];
  const eps = 23.4392911 * DEG;
  const eclFromEq = (v) => [v[0], Math.cos(eps) * v[1] + Math.sin(eps) * v[2], -Math.sin(eps) * v[1] + Math.cos(eps) * v[2]];
  const eqFromEcl = (v) => [v[0], Math.cos(eps) * v[1] - Math.sin(eps) * v[2], Math.sin(eps) * v[1] + Math.cos(eps) * v[2]];
  const u = eclFromEq(star);
  for (const [inc, pa] of [[6.2, -58], [50.65, 301.13], [86.3, 258], [0, 0], [90, 90]]) {
    const p = poleDirection({ x: u[0] * 1e14, y: u[1] * 1e14, z: u[2] * 1e14 }, inc, pa);
    const pe = eqFromEcl([p.x, p.y, p.z]);
    check(near(Math.hypot(pe[0], pe[1], pe[2]), 1, 1e-9), `pole (${inc}, ${pa}): a unit vector`);
    const north = [-Math.sin(dec) * Math.cos(ra), -Math.sin(dec) * Math.sin(ra), Math.cos(dec)];
    const east = [-Math.sin(ra), Math.cos(ra), 0];
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
    const tilt = Math.acos(-dot(pe, star)) / DEG; // the pole faces the Sun: against the direction from the Sun to the star
    check(near(tilt, inc, 1e-6), `pole (${inc}, ${pa}): ${tilt.toFixed(4)} degrees from the line of sight`);
    if (inc > 0.5 && inc < 89.5) {
      let got = Math.atan2(dot(pe, east), dot(pe, north)) / DEG; got = ((got - pa) % 360 + 540) % 360 - 180;
      check(near(got, 0, 1e-6), `pole (${inc}, ${pa}): position angle off by ${got.toFixed(5)} degrees`);
    }
  }
}

// The card: the words exist in every language, and the copy has the fields the card prints.
for (const k of ['widthEq', 'widthPole', 'spin']) check(typeof COPY.rotators[k] === 'string' && COPY.rotators[k].length > 3, `copy: rotators.${k}`);
check(/\{pole\}/.test(COPY.rotators.spinShape) && /\{eq\}/.test(COPY.rotators.spinShape) && /model/.test(COPY.rotators.spinShape), 'copy: the spin line names both temperatures and says it is a model');
// and the boot keeps nothing of it: no rotator number in the boot modules' data, the module is fetched on demand
const main = (await import('node:fs')).readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/data\/starrotators\.js'\)/.test(main) && !/from '\.\/data\/starrotators\.js'/.test(main), 'main.js fetches data/starrotators.js on demand and never imports it statically');
check(SUN_RADIUS_KM > 6e5, 'sanity: the Sun');

if (problems.length) { console.error('test_rotators: FAIL\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`test_rotators: ok (${PAPERS.length} stars)`);
