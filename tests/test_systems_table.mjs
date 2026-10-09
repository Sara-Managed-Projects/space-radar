// tests/test_systems_table.mjs -- the star systems nobody typed (internal #466, 2026-10-08).
//
//   node tests/test_systems_table.mjs
//
// registry/systems-list.yaml names thirty-nine hosts; scripts/build-systems.py writes every number
// from the NASA Exoplanet Archive's table. What this holds, in the browser's own code:
//
//   1. KEPLER'S THIRD LAW on every generated row, within 5 % (a planet of two stars: its orbit
//      implies more than the one star the table describes and less than two of it).
//   2. THE HABITABLE ZONE. Kopparapu et al. 2014 written out again HERE, in JavaScript, from the
//      paper's coefficient table: for the Sun (0.950 and 1.676 au, which is 1/sqrt of the paper's
//      own S_eff of 1.107 and 0.356) and for an M dwarf of 3 400 K, the temperature of the paper's
//      M star (the paper prints no M-dwarf distance; the four values are worked from its table and
//      pinned). Then every generated band against this second implementation, and every "inside"
//      against its band.
//   3. THE PLANETS ARE THE TABLE'S RECORDS; a number the Archive estimated is marked as one.
//   4. NOT ON THE FIRST VISIT: the index registers stages of 100 000 km and nothing to draw; the
//      rows arrive on demand; every one of the thirty-nine then builds.
//   5. SEARCH ranks a planet first for its own name, and the star first for the star's.
//   6. THE DEEP LINK `#go=`: read as `at`, never written back, and every planet and system id
//      resolves to a record by the two prefixes main.js tries.
//   7. THE CARD says what is measured, from the row.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/systems.js'));
const { SYSTEMS } = await import(join(JS, 'data/systems.js'));
const { SYSTEM_INDEX } = await import(join(JS, 'data/systems-index.js'));
const { SYSTEMS_TABLE, SYSTEMS_ALBEDO, SYSTEMS_AS_OF } = await import(join(JS, 'data/systems-table.js'));
const { stage, STAGES, isSystemStage, systemOriginOf, SYSTEM_UNIT_KM } = await import(join(JS, 'scene/stage.js'));
const { parseExoplanets } = await import(join(JS, 'data/parsers.js'));
const { systemHostRecords, addSystemRows, LAYERS } = await import(join(JS, 'data/layers.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const X = await import(join(JS, 'scene/systemextras.js'));
const C = await import(join(JS, 'ui/systemcard.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

check(SYSTEMS_TABLE.length === 39 && SYSTEM_INDEX.length === 39 && SYSTEMS.length === 1, `thirty-nine generated systems beside TRAPPIST-1 (${SYSTEMS_TABLE.length}, index ${SYSTEM_INDEX.length}, typed ${SYSTEMS.length})`);
const planets = SYSTEMS_TABLE.flatMap((s) => s.planets.map((p) => ({ s, p })));

// ---------------------------------------------------------------------- 1. Kepler's third law
let worst = 0, computed = 0, two = 0;
for (const { s, p } of planets) {
  const m = S.keplerMismatch(p, s.star.massSuns);
  if (p.circumbinary) {
    two += 1;
    check(m > 0 && m < 1, `${p.id} goes round two stars: a^3/P^2 is ${(1 + m).toFixed(2)} of the one star the table describes, and must be between 1 and 2`);
    check(p.equilibriumK === undefined && p.zone === undefined, `${p.id}: nothing is computed from one of its two suns`);
    continue;
  }
  worst = Math.max(worst, Math.abs(m));
  check(Math.abs(m) <= 0.05, `${p.id}: a^3/P^2 is ${(m * 100).toFixed(2)} % from the star's mass`);
  if (p.aFrom === 'kepler') computed += 1;
  check(p.aFrom === 'table' || p.aFrom === 'kepler', `${p.id} says where its orbit's size is from (${p.aFrom})`);
}
check(two === 2, `two planets of two stars, Kepler-16 b and Kepler-1647 b (${two})`);
{
  const f = planets.find((x) => x.p.id === 'exo-kepler-186-f');
  check(f && Math.abs(S.keplerMismatch({ ...f.p, aAu: f.p.aAu * 1.1 }, f.s.star.massSuns)) > 0.05, 'an orbit 10 % too wide is refused by the same rule');
}

// ---------------------------------------------------------------------- 2. the habitable zone
// Kopparapu et al. 2014 (ApJ Letters 787, L29), the table for equation 4: S_sun, a, b, c, d.
const K14 = {
  recentVenus: [1.776, 2.136e-4, 2.533e-8, -1.332e-11, -3.097e-15],
  runaway: [1.107, 1.332e-4, 1.580e-8, -8.308e-12, -1.931e-15],
  maximum: [0.356, 6.171e-5, 1.698e-9, -3.198e-12, -5.575e-16],
  earlyMars: [0.320, 5.547e-5, 1.526e-9, -2.874e-12, -5.011e-16],
};
const flux = (k, teff) => { const t = teff - 5780; return k[0] + k[1] * t + k[2] * t * t + k[3] * t ** 3 + k[4] * t ** 4; };
const au = (k, teff, lum) => Math.sqrt(lum / flux(k, teff));
const near = (a, b, tol) => Math.abs(a - b) <= tol * Math.abs(b);
check(near(au(K14.runaway, 5780, 1), 0.950, 0.001) && near(au(K14.maximum, 5780, 1), 1.676, 0.001), `the Sun's zone is 0.950 to 1.676 au (${au(K14.runaway, 5780, 1).toFixed(3)}, ${au(K14.maximum, 5780, 1).toFixed(3)})`);
check(near(au(K14.recentVenus, 5780, 1), 0.750, 0.001) && near(au(K14.earlyMars, 5780, 1), 1.768, 0.001), 'the Sun\'s wider limits are 0.750 and 1.768 au');
// The 2013 paper's own coefficients give its printed 0.97 and 1.70 au for the Sun: the same method.
check(near(Math.sqrt(1 / 1.0512), 0.97, 0.006) && near(Math.sqrt(1 / 0.3438), 1.70, 0.006), 'the 2013 paper\'s solar limits, 0.97 and 1.70 au, follow from its S_eff the same way');
// An M dwarf: 3 400 K, a hundredth of the Sun's light. Worked from the table (see the header).
{
  const got = [au(K14.recentVenus, 3400, 0.01), au(K14.runaway, 3400, 0.01), au(K14.maximum, 3400, 0.01), au(K14.earlyMars, 3400, 0.01)];
  const want = [0.08189, 0.10372, 0.20245, 0.21354];
  check(got.every((g, i) => near(g, want[i], 0.0005)), `an M dwarf of 3 400 K and 0.01 Suns: ${got.map((g) => g.toFixed(5)).join(', ')} au`);
  check(near(flux(K14.runaway, 3400), 0.92953, 0.0001) && near(flux(K14.maximum, 3400), 0.24397, 0.0001), 'its two fluxes are 0.92953 and 0.24397 of the Earth\'s');
}
let banded = 0, inside = 0;
for (const s of SYSTEMS_TABLE) {
  // Two suns (registry/systems-binaries.yaml): the summed luminosity at the luminosity-weighted temperature.
  const t = s.binary ? s.binary.teffWeightedK : s.star.teffK, l = s.binary ? s.binary.lumTotalSuns : s.star.lumSuns;
  const covered = Number.isFinite(t) && Number.isFinite(l) && t >= 2600 && t <= 7200;
  check(!!s.zone === covered, `${s.id}: a band exactly when the formula covers the star (${t} K, ${l} Suns)`);
  if (!s.zone) { check(typeof s.zoneMissing === 'string' && !!COPY.starSystem.zoneNone[s.zoneMissing], `${s.id} says why it has no band (${s.zoneMissing})`); continue; }
  banded += 1;
  check(near(s.zone.innerAu, au(K14.runaway, t, l), 0.001) && near(s.zone.outerAu, au(K14.maximum, t, l), 0.001)
    && near(s.zone.wideInnerAu, au(K14.recentVenus, t, l), 0.001) && near(s.zone.wideOuterAu, au(K14.earlyMars, t, l), 0.001), `${s.id}: the generated band is the paper's formula (${s.zone.innerAu} to ${s.zone.outerAu} au)`);
  for (const p of s.planets) {
    if (p.circumbinary) continue;
    const want = p.aAu >= s.zone.innerAu && p.aAu <= s.zone.outerAu ? 'inside' : p.aAu >= s.zone.wideInnerAu && p.aAu <= s.zone.wideOuterAu ? 'edge' : p.aAu < s.zone.innerAu ? 'hotter' : 'colder';
    check(p.zone === want, `${p.id}: "${p.zone}" and its orbit says "${want}"`);
    if (p.zone === 'inside') inside += 1;
  }
}
for (const { s, p } of planets) if (!s.zone) check(p.zone === undefined, `${p.id} has a verdict and its star has no band`);
// The equilibrium temperature: the Earth at 1 au from one Sun with albedo 0.3 is 255 K.
{
  const SB = 5.670374419e-8, LSUN = 3.828e26, AU = 149597870700;
  const teq = (l, a) => (l * LSUN * (1 - SYSTEMS_ALBEDO) / (16 * Math.PI * SB * (a * AU) ** 2)) ** 0.25;
  check(Math.abs(teq(1, 1) - 255) < 1, `the Earth comes out at 255 K (${teq(1, 1).toFixed(1)})`);
  for (const { s, p } of planets) if (p.equilibriumK !== undefined) check(Math.abs(p.equilibriumK - teq(s.star.lumSuns, p.aAu)) <= 1, `${p.id}: ${p.equilibriumK} K is the formula's ${teq(s.star.lumSuns, p.aAu).toFixed(1)}`);
}

// ---------------------------------------------------------------------- 3. the table's records
const csv = readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8');
const exo = parseExoplanets(csv);
const exoById = new Map(exo.map((r) => [r.id, r]));
check(exo[0].meta.asOf === SYSTEMS_AS_OF, `the systems and the table are one pull (${SYSTEMS_AS_OF}, ${exo[0].meta.asOf})`);
for (const { s, p } of planets) {
  const r = exoById.get(p.id);
  check(!!r && r.meta.host === s.host, `${p.id} is a record of ${s.host}`);
  if (!r) continue;
  check(near(p.periodDays, r.meta.periodDays, 1e-6), `${p.id}: the year is the table's`);
  check((p.radiusEarths ?? null) === r.meta.radiusEarths, `${p.id}: the radius is the table's (${p.radiusEarths}, ${r.meta.radiusEarths})`);
  check((p.radiusEarths === undefined) === (p.radiusFrom === undefined), `${p.id}: a radius says whether it is measured`);
}
check(planets.find((x) => x.p.id === 'exo-proxima-cen-b').p.radiusFrom === 'estimated', 'Proxima b was found by its star\'s wobble: its radius is the Archive\'s estimate, and says so');
check(planets.find((x) => x.p.id === 'exo-kepler-186-f').p.radiusFrom === 'measured' && planets.find((x) => x.p.id === 'exo-kepler-186-f').p.massFrom === 'estimated', 'Kepler-186 f transits: its radius is measured and its mass is the estimate');

// ---------------------------------------------------------------------- 4. not on the first visit
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(45, 1.6, 0.01, 1e9);
const hostsBefore = systemHostRecords();
check(hostsBefore.length === 1 && !STAGES['system-kepler-186'], 'at boot there is one system and no stage for Kepler-186');
const rows = await S.loadIndex();
addSystemRows(rows);
const hosts = systemHostRecords();
const records = [...exo, ...hosts];
const byId = new Map(records.map((r) => [r.id, r]));
const ctx = { camera, recordById: (id) => byId.get(id) || null };
const systems = S.createSystems(scene, ctx);
check(rows.length === 39 && hosts.length === 40, `the index adds thirty-nine host stars (${rows.length}, ${hosts.length})`);
for (const s of SYSTEM_INDEX) {
  check(isSystemStage(s.stage) && STAGES[s.stage].unitKm === 100000 && SYSTEM_UNIT_KM === 100000, `${s.stage} is a system stage of exactly 100 000 km a unit`);
  check(!!systemOriginOf(s.stage), `${s.stage} has its origin`);
}
{
  const f = byId.get('exo-kepler-186-f');
  check(systems.pending(f) && systems.stageOfRecord(f) === null, 'before its rows land Kepler-186 f waits, and has no stage to go to');
  check(await systems.load() === true, 'the rows load');
  check(!systems.pending(f) && systems.stageOfRecord(f) === 'system-kepler-186', 'after, its stage is system-kepler-186');
}
let most = 0;
for (const s of SYSTEMS_TABLE) {
  stage.setWorld(s.stage);
  stage.setTime(Date.parse('2026-10-08T12:00:00Z'));
  check(systems.enter(s.stage) === true, `${s.id} builds`);
  const dist = systems.framingDistanceUnits(s.stage);
  camera.position.set(0, dist * 0.7, dist * 0.7);
  systems.update(stage.tMs, camera);
  const st = systems.stats();
  most = Math.max(most, st.triangles);
  check(st.active && st.rings === s.planets.length && st.triangles < 12000, `${s.id}: ${st.rings} orbits, ${st.triangles} triangles`);
  check(Number.isFinite(dist) && dist > 0, `${s.id}: a finite framing distance (${dist})`);
  for (const p of s.planets) {
    const at = systems.drawnPositionOf(p.id);
    check(at && Number.isFinite(at.x) && near(at.length(), p.aAu * S.AU_KM / 100000, 1e-6), `${p.id} is drawn on its orbit`);
  }
  check(!!scene.getObjectByName('systems:zone') === !!s.zone, `${s.id}: the band is drawn exactly when one is computed`);
  check(systems.subjectFor(byId.get(s.hostId)).radiusKm >= 0 && Number.isFinite(systems.arrivalDistanceUnits(byId.get(s.planets[0].id))), `${s.id}: finite sizes for the camera, measured or not`);
}
stage.setWorld('earth'); systems.leave();
// The rings of ours drawn for scale follow a rule, not a choice per system.
const ringsOf = (id) => X.scaleOrbits(SYSTEMS_TABLE.find((s) => s.id === id)).map((o) => o.id).join(',');
check(ringsOf('lhs-1140') === 'mercury', `LHS 1140 fits inside Mercury's orbit (${ringsOf('lhs-1140')})`);
check(ringsOf('kepler-452') === 'mercury,earth', `Kepler-452 b is beside the Earth's orbit (${ringsOf('kepler-452')})`);
check(ringsOf('kepler-186') === 'mercury' && ringsOf('proxima-cen') === '', `Kepler-186 f is at Mercury's distance; Proxima's planets are too close in for any ring of ours (${ringsOf('kepler-186')}; ${ringsOf('proxima-cen')})`);
check(ringsOf('hr-8799') === 'neptune', `HR 8799's planets lie beyond Neptune's orbit (${ringsOf('hr-8799')})`);
// A star of the catalogue that is a host stands for the system's own star.
check(systems.hostRecordFor({ id: 'hyg-1', klass: 'star', name: 'Proxima Centauri' }) === byId.get('star-proxima-cen'), 'the catalogue\'s Proxima Centauri stands for the system\'s star');
check(systems.hostRecordFor({ id: 'hyg-2', klass: 'star', name: 'Sirius' }) === null, 'Sirius stands for itself');

// ---------------------------------------------------------------------- 5. search
const index = buildIndex(records, LAYERS);
let firsts = 0;
for (const { p } of planets) {
  const hit = findMatches(index, p.name).hits[0];
  check(hit && hit.record.id === p.id, `"${p.name}" finds ${p.id} first (${hit && hit.record.id})`);
  if (hit && hit.record.id === p.id) firsts += 1;
}
for (const s of SYSTEMS_TABLE) {
  const hit = findMatches(index, s.display).hits[0];
  check(hit && hit.record.id === s.hostId, `"${s.display}" finds its star first (${hit && hit.record.id})`);
}
check(findMatches(index, 'Kepler-90').hits[0]?.record.id === 'star-kepler-90' && findMatches(index, 'KOI-351', 12).hits.some((h) => h.record.id === 'star-kepler-90'), 'Kepler-90 is found by its name and by the table\'s KOI-351');

// ---------------------------------------------------------------------- 6. the deep link
{
  const U = await import(join(JS, 'ui/urlstate.js'));
  let written = null;
  globalThis.location = { hash: '#go=kepler-186-f', pathname: '/', search: '' };
  globalThis.history = { replaceState: (a, b, target) => { written = target; globalThis.location.hash = target.startsWith('#') ? target : ''; } };
  const link = U.read();
  check(link.at === 'kepler-186-f' && link.go === undefined, `#go=kepler-186-f reads as at=kepler-186-f (${JSON.stringify(link)})`);
  U.write({ at: 'exo-kepler-186-f', stage: 'system-kepler-186' });
  check(written === '#at=exo-kepler-186-f&stage=system-kepler-186', `the app's own write drops go= (${written})`);
  globalThis.location.hash = '#go=kepler-186&at=iss';
  check(U.read().at === 'iss', 'an `at` beside it wins');
  delete globalThis.location; delete globalThis.history;
  // What main.js resolveAt tries for a bare id: the record, then exo-<id>, then star-<id>.
  const resolve = (id) => byId.get(id) || byId.get(`exo-${id}`) || byId.get(`star-${id}`) || null;
  for (const { p } of planets) check(resolve(p.id.slice(4)) === byId.get(p.id), `#go=${p.id.slice(4)} is ${p.id}`);
  for (const s of [...SYSTEMS, ...SYSTEMS_TABLE]) check(resolve(s.id) === byId.get(s.hostId), `#go=${s.id} is the star of ${s.host}`);
}

// ---------------------------------------------------------------------- 7. the card
{
  const of = (id) => planets.find((x) => x.p.id === id);
  const f = of('exo-kepler-186-f');
  check(C.knownLine(f.p) === 'Nobody has seen its surface. Its size and year are measured. Its mass is an estimate.', `Kepler-186 f: ${C.knownLine(f.p)}`);
  check(C.knownLine(of('exo-lhs-1140-b').p) === 'Nobody has seen its surface. Its size, year and mass are measured.', `LHS 1140 b: ${C.knownLine(of('exo-lhs-1140-b').p)}`);
  check(C.knownLine(of('exo-proxima-cen-b').p) === 'Nobody has seen its surface. Its year and least possible mass are measured. Its size is an estimate.', `Proxima b: ${C.knownLine(of('exo-proxima-cen-b').p)}`);
  check(C.knownLine(of('exo-hd-10180-c').p).endsWith('Its size is not measured.'), `HD 10180 c: ${C.knownLine(of('exo-hd-10180-c').p)}`);
  const R = COPY.starSystem.rows;
  const facts = C.planetFacts(f.s, f.p, SYSTEMS_ALBEDO);
  const row = (label, list = facts.rows) => (list.find((r) => r[0] === label) || [])[1];
  check(row(R.zone) === COPY.starSystem.zone.inside && /computed/.test(R.zone) && /computed/.test(R.temperature), 'Kepler-186 f is inside the band, and the rows that are computed say "computed" in their labels');
  check(/computed from its year/.test(row(R.orbit)), `its orbit's size says it is computed (${row(R.orbit)})`);
  check(new RegExp(`^${f.p.equilibriumK} K`).test(row(R.temperature)) && /30 %/.test(row(R.temperature)), `its temperature names the assumption (${row(R.temperature)})`);
  check(facts.radius === null && /estimate from its size/.test(facts.mass), 'a measured radius is printed plainly; the estimated mass says so');
  const hab = planets.filter(({ s, p }) => C.planetFacts(s, p).rows.some((r) => r[1] === COPY.starSystem.zone.inside));
  check(hab.length === inside && hab.every(({ p }) => p.zone === 'inside'), `"Inside it" is printed for the ${inside} planets inside their computed band and no other (${hab.length})`);
  const k16 = of('exo-kepler-16-b');
  check(row(R.zone, C.planetFacts(k16.s, k16.p).rows) === COPY.starSystem.zoneNone.twoStars && row(R.temperature, C.planetFacts(k16.s, k16.p).rows) === undefined, 'Kepler-16 b: no verdict and no temperature from one of two suns');
  const psr = SYSTEMS_TABLE.find((s) => s.id === 'psr-b1257-12');
  const star = C.starRows(psr);
  check(row(R.starWidth, star) === COPY.starSystem.starPoint && row(R.starTemperature, star) === COPY.starSystem.starWhite && row(R.zone, star) === COPY.starSystem.zoneNone['no-temperature'], 'the pulsar\'s card says what is not measured and how it is drawn');
  const kelt = SYSTEMS_TABLE.find((x) => x.id === 'kelt-9');
  check(kelt && !kelt.binary && /2 in the catalogue/.test(row(R.stars, C.starRows(kelt))), 'KELT-9\'s star card says the catalogue lists two stars and one is drawn');
  check(row(R.stars, C.starRows(k16.s)) === COPY.starSystem.starsBoth, 'Kepler-16\'s star card says both suns are drawn (tests/test_systems_binaries.mjs holds the rest)');
  const line = C.generatedLine(f.s);
  check(line.includes(SYSTEMS_AS_OF) && /5 of them sized from the year/.test(line) && /illustrative/.test(line), `the drawing line: ${line}`);
}

if (problems.length) { console.error(`systems table FAILED (${problems.length}):\n  ` + problems.slice(0, 40).join('\n  ')); process.exit(1); }
console.log(`systems table ok: 39 systems, ${planets.length} planets; Kepler's law within ${(worst * 100).toFixed(1)} % (${computed} orbits computed from the year, ${two} of two stars); ${banded} bands, ${inside} planets inside one; ${firsts} planets found first by name; at most ${most} triangles`);
