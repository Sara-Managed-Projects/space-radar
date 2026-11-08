// tests/test_heliosphere.mjs -- the heliosphere (forge #148, scene/heliosphere.js).
//
// Asserted, with no browser:
//   THE CROSSINGS ARE THE VOYAGERS' OWN: each is where the bundled JPL track (site/data/eph) has the craft at
//     noon on NASA's crossing date (registry/missions.yaml), to 0.05 AU and 0.05 degrees.
//   THE SURFACES PASS THROUGH THEM: surfaceAu() at each crossing's direction is that crossing's distance;
//     the termination shock lies inside the heliopause and the heliopause inside the bow wave everywhere
//     drawn; the nose is nearer than the flanks.
//   THE NUMBERS: the nose at 255.7, 5.1 and 25.4 km/s; the arrow 20 years of it; the ribbon 74.5 degrees
//     round 219.2, 39.9; the fade from 40 to 60 AU.
//   THE WORDS: every legend row names its class (modelled, measured or illustrative) or its source; lazy.
//
//   node tests/test_heliosphere.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const { COPY } = await mod('copy/en.js');
await mod('copy/en.later.js');
const H = await mod('scene/heliosphere.js');
const eph = await mod('propagate/ephemeris.js');

// --- the crossings --------------------------------------------------------------------------------
const missions = readFileSync(join(ROOT, 'registry/missions.yaml'), 'utf8');
for (const c of H.HELIO.crossings) {
  const buf = readFileSync(join(ROOT, `site/data/eph/${c.craft}.bin`));
  const e = eph.decode(buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength));
  const s = eph.stateAt(e, Date.parse(`${c.date}T12:00:00Z`));
  const r = Math.hypot(s.x, s.y, s.z) / H.KM_PER_AU;
  const lon = ((Math.atan2(s.y, s.x) * 180) / Math.PI + 360) % 360;
  const lat = (Math.asin(s.z / (r * H.KM_PER_AU)) * 180) / Math.PI;
  check(s.centre === 'sun' && Math.abs(r - c.au) < 0.05 && Math.abs(lon - c.lonDeg) < 0.05 && Math.abs(lat - c.latDeg) < 0.05,
    `${c.craft} ${c.surface} on ${c.date} is where JPL has it (${r.toFixed(2)} AU, ${lon.toFixed(2)}, ${lat.toFixed(2)})`);
  const event = c.surface === 'ts' ? 'termination-shock' : 'interstellar';
  const block = missions.slice(missions.indexOf(`record: ${c.craft}`));
  const row = block.split('\n').find((l) => l.includes(`id: ${event},`));
  check(row && row.includes(`date: "${c.date}"`), `${c.craft}'s ${event} date is NASA's, as registry/missions.yaml has it`);
}

// --- the surfaces -------------------------------------------------------------------------------------
for (const c of H.HELIO.crossings) {
  const got = H.surfaceAu(c.surface, H.eclDir(c.lonDeg, c.latDeg));
  check(Math.abs(got - c.au) < 1e-6, `the ${c.surface} passes through ${c.craft}'s crossing (${got.toFixed(3)} vs ${c.au})`);
}
const nose = H.eclDir(H.HELIO.nose.lonDeg, H.HELIO.nose.latDeg);
{
  let ok = true; let order = true;
  for (let i = 0; i < 400; i++) {
    const lon = (i * 137.5) % 360; const lat = -80 + ((i * 53) % 160);
    const d = H.eclDir(lon, lat);
    const psi = (H.angle(d, nose) * 180) / Math.PI;
    if (psi > H.HELIO.bow.tailDeg) continue;
    const ts = H.surfaceAu('ts', d); const hp = H.surfaceAu('hp', d); const bow = H.surfaceAu('bow', d);
    if (!(ts > 50 && hp > ts && bow > hp)) ok = false;
    if (psi > 60 && H.surfaceAu('hp', d) < H.surfaceAu('hp', nose)) order = false;
  }
  check(ok, 'everywhere drawn: termination shock inside the heliopause, the heliopause inside the bow wave');
  check(order, 'the flanks are farther than the nose');
}
check(Math.abs(H.hpShape(0) - 1) < 1e-12 && Math.abs(H.hpShape(Math.PI / 2) - Math.SQRT2) < 1e-12, 'Parker\'s heliopause: 1 at the nose, root 2 at the flank');
check(Math.abs(H.bowShape(1e-6) - 1) < 1e-6 && Math.abs(H.tsShape(Math.PI) - 1.3 / 0.7) < 1e-12, 'Wilkin\'s bow at its apex, the shock\'s tail 1.86 times its nose');

// --- the numbers --------------------------------------------------------------------------------------
check(H.HELIO.nose.lonDeg === 255.7 && H.HELIO.nose.latDeg === 5.1 && H.HELIO.nose.speedKmS === 25.4, 'the nose and the speed are IBEX\'s (McComas et al. 2015)');
check(Math.abs(H.travelAu(25.4, 20) - 107.2) < 0.2, `twenty years at 25.4 km/s is 107 AU (${H.travelAu(25.4, 20).toFixed(1)})`);
check(H.HELIO.ribbon.halfDeg === 74.5 && H.HELIO.ribbon.lonDeg === 219.2 && H.HELIO.ribbon.latDeg === 39.9, 'the ribbon is Funsten et al. 2013\'s circle');
check(H.fadeFor(30) === 0 && H.fadeFor(40) === 0 && H.fadeFor(60) === 1 && H.fadeFor(300) === 1 && H.fadeFor(50) > 0.4 && H.fadeFor(50) < 0.6, 'it shows from about 50 AU out');
check(/view\.trueKm\(drawnKm\)/.test(readFileSync(join(JS, 'scene/heliosphere.js'), 'utf8')), 'the 50 AU rule reads the camera\'s TRUE distance when the Distance slider squeezes the picture');
check(H.ARROW_PX.shaft <= 3 && H.ARROW_PX.head <= 12, 'the Sun\'s arrow is a thin arrow on the screen, never a beam');
check(H.toScene([1, 2, 3]).join() === '1,3,-2', 'ecliptic to scene axes as stage.js maps them');

// --- the words ------------------------------------------------------------------------------------------
const W = COPY.helio;
check(/modelled/.test(W.chip), 'the chip on the screen says modelled');
check(/Modelled/.test(W.rowTs) && /measured/.test(W.rowTs) && /Parker/.test(W.rowHp) && /Illustrative/.test(W.rowBow) && /not measured/.test(W.rowRibbon) && /IBEX/.test(W.rowMotion), 'each legend row says how it is known');
const main = readFileSync(join(JS, 'main.js'), 'utf8');
check(/import\('\.\/scene\/heliosphere\.js'\)/.test(main) && !/^import[^\n]*heliosphere/m.test(main), 'main.js fetches it dynamically');
const src = readFileSync(join(JS, 'scene/heliosphere.js'), 'utf8');
check(/depthTest: true/.test(src) && /depthWrite: false/.test(src), 'translucent, depth-tested, writes no depth');

if (problems.length) {
  console.error('heliosphere FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`heliosphere ok: four Voyager crossings on JPL's tracks, both fitted surfaces through them; heliopause nose ${H.surfaceAu('hp', nose).toFixed(1)} AU, termination shock nose ${H.surfaceAu('ts', nose).toFixed(1)} AU`);
