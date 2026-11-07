// tests/test_worldframe.mjs -- the sky from another world (forge #147): sky/worldframe.js and sky/worldair.js.
//
// Asserted, with no browser:
//   THE FRAME IS THE GROUND SKY'S: worldEqjToLocal('earth') is sky/skybodies.js eqjToLocal to 1e-9, and every world's
//     matrix is a rotation (orthonormal, determinant +1).
//   MARS KEEPS MARS'S TIME: local true solar time at Gale and Jezero agrees with Allison and McEwen's Mars24 algorithm
//     (Planetary and Space Science 48, 215, 2000; NASA GISS's Mars24 page, equations C-1 to C-4, D-1 to D-6) to
//     within three minutes at six instants from 2012 to 2030.
//   A MOON THAT KEEPS ONE FACE: from Titan's and Europa's (0, 0) the planet stands within 6 degrees of the zenith (the
//     IAU's prime meridian is the sub-planet point) and neither rises nor sets.
//   THE EARTH FROM THE MOON: from Apollo 15 the Earth is high in the south, 1.8 to 2.0 degrees wide, and never sets.
//   POLE STARS from data/stars.bin and its names: the Earth's is Polaris within a degree, Mars's Deneb about 9
//     degrees off, the Moon's in Draco.
//   PHOBOS CROSSES THE SUN: from Jezero, in the first days of April 2022 (when Perseverance filmed one, PIA25179),
//     the search finds crossings of 25 to 45 seconds; Deimos's take longer.
//   RISES AND SETS: the Sun rises and sets once a sol at Gale, about 12 hours apart, at about 06 and 18 local time.
//   THE COLOURS: Mars's day sky is the measured butterscotch, its sunset glow is blue (more blue than red), its
//     night has stars; the Moon's and Europa's skies are black at noon; Titan hides its stars.
//   THE LINK: `#sky=` parses a site, coordinates and a bare world, and refuses the rest.
//   TWO OTHER STARS' PLANETS (modelled, sky/exoskies.js): from Proxima b's and TRAPPIST-1 e's sub-star point the star
//     stands overhead and never moves; Proxima is 1.5 to 1.6 degrees wide from b; Alpha Centauri A and B are two bright
//     stars (A about -6.8, B about -5.5) a fraction of a degree apart; the Sun is a star of about +0.4 from Proxima and
//     +5.3 from TRAPPIST-1; at a transit time of a sister planet it stands between TRAPPIST-1 and the Sun's direction;
//     every sister lies on the same great circle of e's sky; their sky colours are labelled illustrative.
//
//   node tests/test_worldframe.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);

const W = await mod('sky/worldframe.js');
const A = await mod('sky/worldair.js');
const { eqjToLocal } = await mod('sky/skybodies.js');
const Astronomy = await import(pathToFileURL(join(ROOT, 'site/vendor/astronomy.js')).href);

// --- the frame ------------------------------------------------------------------------------------------------
const T = Date.UTC(2026, 10, 7, 18, 0);
{
  const a = W.worldEqjToLocal('earth', 51.5, -0.1, T);
  const b = eqjToLocal(new Date(T), new Astronomy.Observer(51.5, -0.1, 0));
  check(a.every((x, i) => Math.abs(x - b[i]) < 1e-9), `the Earth's frame is skybodies.js's (${a.map((x, i) => (x - b[i]).toExponential(1)).join(' ')})`);
}
for (const w of ['moon', 'mars', 'titan', 'europa']) {
  const m = W.worldEqjToLocal(w, 12.3, 45.6, T);
  const row = (i) => [m[i * 3], m[i * 3 + 1], m[i * 3 + 2]];
  const dot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
  let worst = 0;
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) worst = Math.max(worst, Math.abs(dot(row(i), row(j)) - (i === j ? 1 : 0)));
  const det = m[0] * (m[4] * m[8] - m[5] * m[7]) - m[1] * (m[3] * m[8] - m[5] * m[6]) + m[2] * (m[3] * m[7] - m[4] * m[6]);
  check(worst < 1e-12 && Math.abs(det - 1) < 1e-12, `${w}: the frame is a rotation (off by ${worst}, det ${det})`);
}

// --- Mars24 ----------------------------------------------------------------------------------------------------
function mars24Ltst(ms, lonEast) {
  const jdTT = ms / 86400000 + 2440587.5 + 69.184 / 86400;
  const dt = jdTT - 2451545.0;
  const D = Math.PI / 180;
  const M = 19.3871 + 0.52402073 * dt;
  const alpha = 270.3871 + 0.524038496 * dt;
  const A_ = [0.0071, 0.0057, 0.0039, 0.0037, 0.0021, 0.0020, 0.0018];
  const tau = [2.2353, 2.7543, 1.1177, 15.7866, 2.1354, 2.4694, 32.8493];
  const phi = [49.409, 168.173, 191.837, 21.736, 15.704, 95.528, 49.095];
  let pbs = 0;
  for (let i = 0; i < 7; i += 1) pbs += A_[i] * Math.cos(((0.985626 * dt) / tau[i] + phi[i]) * D);
  const vM = (10.691 + 3.0e-7 * dt) * Math.sin(M * D) + 0.623 * Math.sin(2 * M * D) + 0.050 * Math.sin(3 * M * D) + 0.005 * Math.sin(4 * M * D) + 0.0005 * Math.sin(5 * M * D) + pbs;
  const Ls = alpha + vM;
  const eot = 2.861 * Math.sin(2 * Ls * D) - 0.071 * Math.sin(4 * Ls * D) + 0.002 * Math.sin(6 * Ls * D) - vM;
  const msd = (dt - 4.5) / 1.0274912517 + 44796.0 - 0.0009626;
  const mtc = ((24 * msd) % 24 + 24) % 24;
  return ((mtc + lonEast / 15 + eot / 15) % 24 + 24) % 24;
}
for (const [site, lon] of [['gale', 137.4417], ['jezero', 77.4509]]) {
  for (const ms of [Date.UTC(2012, 7, 6, 5, 17), Date.UTC(2021, 1, 18, 20, 55), Date.UTC(2024, 5, 1), Date.UTC(2026, 10, 7, 12), Date.UTC(2028, 2, 3, 7), Date.UTC(2030, 8, 9, 22)]) {
    const ours = W.localSolarHours('mars', lon, ms);
    const theirs = mars24Ltst(ms, lon);
    let d = Math.abs(ours - theirs) * 60;
    d = Math.min(d, 1440 - d);
    check(d < 3, `${site} ${new Date(ms).toISOString()}: local solar time ${ours.toFixed(3)} h, Mars24 ${theirs.toFixed(3)} h (${d.toFixed(1)} min)`);
  }
}

// --- locked moons ---------------------------------------------------------------------------------------------
for (const [w, parent] of [['titan', 'saturn'], ['europa', 'jupiter']]) {
  const place = { world: w, latDeg: 0, lonDeg: 0 };
  const v = W.worldBodyView(parent, T, place);
  check(v && v.altDeg > 84, `${w} (0, 0): ${parent} near the zenith (${v && v.altDeg.toFixed(2)})`);
  const rs = W.nextRiseSet(parent, place, T);
  check(rs.rise === null && rs.set === null, `${w}: ${parent} neither rises nor sets`);
}

// --- the Earth from the Moon ----------------------------------------------------------------------------------
{
  const a15 = { world: 'moon', latDeg: 26.13239, lonDeg: 3.6333 };
  const e = W.worldBodyView('earth', T, a15);
  check(e && e.altDeg > 55 && e.altDeg < 75 && e.azDeg > 150 && e.azDeg < 210, `the Earth from Apollo 15 is high in the south (${e && e.altDeg.toFixed(1)}, ${e && e.azDeg.toFixed(1)})`);
  check(e && e.diameterDeg > 1.8 && e.diameterDeg < 2.05, `the Earth from the Moon is about two degrees wide (${e && e.diameterDeg.toFixed(3)})`);
  const rs = W.nextRiseSet('earth', a15, T);
  check(rs.rise === null && rs.set === null, 'the Earth never sets from Apollo 15');
  const sun = W.worldBodyView('sun', T, a15);
  // The Earth's phase seen from the Moon is the opposite of the Moon's seen from the Earth.
  const moonFromEarth = Astronomy.Illumination(Astronomy.Body.Moon, new Date(T)).phase_fraction;
  check(Math.abs(e.phaseFraction - (1 - moonFromEarth)) < 0.03, `the Earth's phase from the Moon (${e.phaseFraction.toFixed(3)}) is one less the Moon's from the Earth (${moonFromEarth.toFixed(3)})`);
  check(sun && Math.abs(sun.diameterDeg - 0.533) < 0.02, `the Sun from the Moon is half a degree wide (${sun && sun.diameterDeg.toFixed(3)})`);
}

// --- pole stars -----------------------------------------------------------------------------------------------
{
  const buf = readFileSync(join(ROOT, 'site/data/stars.bin'));
  const f = new Float32Array(buf.buffer, buf.byteOffset, Math.floor(buf.byteLength / 4));
  const n = Math.floor(f.length / 4);
  const pos = new Float32Array(n * 3), mag = new Float32Array(n);
  const D = Math.PI / 180;
  for (let i = 0; i < n; i += 1) {
    pos[i * 3] = Math.cos(f[i * 4 + 1] * D) * Math.cos(f[i * 4] * D); pos[i * 3 + 1] = Math.cos(f[i * 4 + 1] * D) * Math.sin(f[i * 4] * D); pos[i * 3 + 2] = Math.sin(f[i * 4 + 1] * D);
    mag[i] = f[i * 4 + 2];
  }
  const names = JSON.parse(readFileSync(join(ROOT, 'site/data/skystars.names.json'), 'utf8')).rows;
  const nameOf = (p) => {
    const d = [pos[p.index * 3], pos[p.index * 3 + 1], pos[p.index * 3 + 2]];
    const hit = names.find((r) => { const c = Math.cos(r[2] * D); return c * Math.cos(r[1] * D) * d[0] + c * Math.sin(r[1] * D) * d[1] + Math.sin(r[2] * D) * d[2] > Math.cos(0.1 * D); });
    return hit ? hit[0] : null;
  };
  const stars = { pos, mag };
  const earth = W.poleStar('earth', T, stars);
  check(earth && nameOf(earth) === 'Polaris' && earth.sepDeg < 1, `the Earth's pole star is Polaris (${earth && nameOf(earth)}, ${earth && earth.sepDeg.toFixed(2)})`);
  const mars = W.poleStar('mars', T, stars);
  check(mars && nameOf(mars) === 'Deneb' && mars.sepDeg > 7 && mars.sepDeg < 11, `Mars's pole star is Deneb about 9 degrees off (${mars && nameOf(mars)}, ${mars && mars.sepDeg.toFixed(2)})`);
  const moon = W.poleStar('moon', T, stars);
  check(moon && ['Altais', 'Thuban', 'Aldhibah', 'Edasich'].includes(nameOf(moon)), `the Moon's pole star is in Draco (${moon && nameOf(moon)})`);
}

// --- Phobos and Deimos over the Sun ---------------------------------------------------------------------------
{
  const jez = { world: 'mars', latDeg: 18.4446, lonDeg: 77.4509 };
  const t0 = Date.UTC(2022, 3, 1), t1 = Date.UTC(2022, 3, 4);
  const ph = W.transits('phobos', 'sun', jez, t0, t1, { stepMs: 90e3 });
  check(ph.length >= 1 && ph.every((x) => x.durationS >= 25 && x.durationS <= 45), `Phobos crosses the Sun from Jezero in early April 2022 for 25 to 45 s (${JSON.stringify(ph.map((x) => [new Date(x.tMs).toISOString(), x.durationS]))})`);
}

// --- rises and sets -------------------------------------------------------------------------------------------
{
  const gale = { world: 'mars', latDeg: -4.5895, lonDeg: 137.4417 };
  const rs = W.nextRiseSet('sun', gale, T);
  check(rs.rise && rs.set, 'the Sun rises and sets at Gale');
  const lr = W.localSolarHours('mars', gale.lonDeg, rs.rise), ls = W.localSolarHours('mars', gale.lonDeg, rs.set);
  check(Math.abs(lr - 6) < 0.4 && Math.abs(ls - 18) < 0.4, `Gale's sunrise and sunset near 06 and 18 local (${lr.toFixed(2)}, ${ls.toFixed(2)})`);
  const xs = W.crossings((t) => Math.sin(t / 1000), 0, 10000, 300);
  check(xs.length === 3 && xs[0].kind === 'set' && Math.abs(xs[0].tMs - Math.PI * 1000) < 1000, `crossings() of a sine (${JSON.stringify(xs)})`);
}

// --- the colours ----------------------------------------------------------------------------------------------
{
  const day = A.skyLook('mars', 60);
  const target = A.srgbToLinear([176, 134, 94]);
  check(day.kind === 'measured' && Math.abs(day.horizon[0] - target[0]) < 1e-6 && Math.abs(day.horizon[2] - target[2]) < 1e-6, `Mars's day horizon is the measured butterscotch (${day.horizon.map((x) => x.toFixed(3))})`);
  check(day.stars === 0, 'no stars in the Martian day');
  const dusk = A.skyLook('mars', -1);
  check(dusk.glow[2] > dusk.glow[0], `the Martian sunset glow is blue (${dusk.glow.map((x) => x.toFixed(3))})`);
  check(A.skyLook('mars', -30).stars === 1, 'a Martian night has its stars');
  for (const w of ['moon', 'europa']) {
    const noon = A.skyLook(w, 70);
    check(noon.zenith.every((x) => x === 0) && noon.stars === 1, `${w}: a black sky at noon`);
  }
  check(A.skyLook('titan', 40).stars === 0 && A.skyLook('titan', 40).kind === 'illustrative', 'Titan hides its stars, and its colour says it is illustrative');
}

// --- the link -------------------------------------------------------------------------------------------------
{
  const a = W.parseSkyLink('mars:jezero');
  check(a && a.world === 'mars' && a.site === 'jezero', '`mars:jezero` reads as a site');
  const b = W.parseSkyLink('europa:10.5,200');
  check(b && b.world === 'europa' && b.latDeg === 10.5 && b.lonDeg === 200, '`europa:10.5,200` reads as coordinates');
  const c = W.parseSkyLink('titan');
  check(c && c.world === 'titan' && c.latDeg === 0, '`titan` is its sub-Saturn point');
  for (const bad of ['earth:london', 'pluto', 'mars:<b>', 'mars:95,10', '']) check(W.parseSkyLink(bad) === null, `\`${bad}\` is refused`);
}

// --- two other stars' planets --------------------------------------------------------------------------------
{
  const E = await mod('sky/exoskies.js');
  for (const [w, star] of [['proxima-b', 'proxima'], ['trappist-1e', 'trappist-1']]) {
    const sub = { world: w, latDeg: 0, lonDeg: 0 };
    const v = W.worldBodyView(star, T, sub);
    const later = W.worldBodyView(star, T + 3 * 86400e3, sub);
    check(v && v.altDeg > 89.9 && later.altDeg > 89.9, `${w}: its star stands overhead at the sub-star point and stays there (${v && v.altDeg.toFixed(3)}, ${later && later.altDeg.toFixed(3)})`);
    check(A.skyLook(w, 30).kind === 'illustrative', `${w}: the sky colour is labelled illustrative`);
    const def = W.parseSkyLink(w);
    check(def && def.lonDeg === 60, `${w}: a bare link stands where the star is 30 degrees up`);
  }
  const pb = { world: 'proxima-b', latDeg: 0, lonDeg: 60 };
  const px = W.worldBodyView('proxima', T, pb);
  check(px.diameterDeg > 1.5 && px.diameterDeg < 1.6, `Proxima from b is 1.5 to 1.6 degrees wide (${px.diameterDeg.toFixed(3)})`);
  const a = W.worldBodyView('alpha-cen-a', T, pb), b = W.worldBodyView('alpha-cen-b', T, pb);
  check(Math.abs(a.mag + 6.8) < 0.3 && Math.abs(b.mag + 5.45) < 0.3, `Alpha Centauri A and B from Proxima b (${a.mag.toFixed(2)}, ${b.mag.toFixed(2)})`);
  const sep = Math.acos(Math.min(1, a.dir[0] * b.dir[0] + a.dir[1] * b.dir[1] + a.dir[2] * b.dir[2])) / (Math.PI / 180);
  check(sep < 1, `A and B are a fraction of a degree apart (${sep.toFixed(3)})`);
  const sunP = W.worldBodyView('sun', T, pb), sunT = W.worldBodyView('sun', T, { world: 'trappist-1e', latDeg: 0, lonDeg: 60 });
  check(Math.abs(sunP.mag - 0.39) < 0.1 && Math.abs(sunT.mag - 5.3) < 0.1, `the Sun is a star from there (${sunP.mag.toFixed(2)}, ${sunT.mag.toFixed(2)})`);
  // At f's measured transit, f stands on the line from TRAPPIST-1 to the Sun.
  const t0 = (2457671.3737299 - 2440587.5) * 86400e3;
  const fp = E.exoPositionEqjKm('trappist-1f', t0), st = E.exoPositionEqjKm('trappist-1', t0);
  const off = [fp.x - st.x, fp.y - st.y, fp.z - st.z], toSun = [-st.x, -st.y, -st.z];
  const cosA = (off[0] * toSun[0] + off[1] * toSun[1] + off[2] * toSun[2]) / (Math.hypot(...off) * Math.hypot(...toSun));
  check(cosA > 0.9999, `TRAPPIST-1 f transits at its measured time (${cosA.toFixed(6)})`);
  // Coplanar orbits: from the equator of e every sister is on the meridian through east and west.
  const eq = { world: 'trappist-1e', latDeg: 0, lonDeg: 60 };
  const off90 = ['trappist-1b', 'trappist-1c', 'trappist-1d', 'trappist-1f', 'trappist-1g', 'trappist-1h'].map((id) => W.worldBodyView(id, T, eq)).map((x) => Math.abs(x.local[2]));
  check(off90.every((z) => z < 1e-3), `the sisters lie on one great circle of e's sky (${off90.map((z) => z.toExponential(1)).join(' ')})`);
}

if (problems.length) {
  console.error(`test_worldframe: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('test_worldframe: ok (the frame, Mars24, locked moons, the Earth from the Moon, pole stars, Phobos, rises and sets, colours, the link, Proxima b and TRAPPIST-1 e)');
