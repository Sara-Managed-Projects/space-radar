// tests/test_far_bodies.mjs -- the dwarf planets and the two interstellar visitors (2026-09-22).
//
// What this holds, each against something outside this repository:
//   - WHERE: two-body motion from the bundled SBDB elements against JPL Horizons' own vectors for
//     2026-09-22 00:00 TDB. The reference numbers below were read from
//       https://ssd.jpl.nasa.gov/api/horizons.api?format=json&COMMAND='136199;'&EPHEM_TYPE=VECTORS
//         &CENTER='500@10'&REF_PLANE=ECLIPTIC&START_TIME='2026-09-22'&STOP_TIME='2026-09-23'
//         &STEP_SIZE='1d'&OUT_UNITS=AU-D&VEC_TABLE=2
//     with each row's own COMMAND ('1;', '136108;', ... 'DES=A/2017 U1;', 'DES=C/2019 Q4;'),
//     read 2026-09-22. Heliocentric ecliptic J2000, au.
//   - e > 1: 'Oumuamua and Borisov are hyperbolic. The propagator's hyperbolic branch reaches
//     perihelion at q, is symmetric about it, and has positive orbital energy.
//   - WHAT THE CARD SAYS: "dwarf planet" for the eight, the region from the orbit itself, "from
//     another star" and which way it is going for the two, and no "near-Earth" anywhere.
//   - FOUND: search finds each by the name people type, the old designation and "dwarf planet".
//   - DRAWN: the whole orbit (or the passage) is the line, and it passes through the dot.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { farBodies, sampleAsteroids, sampleDeepSpace, sampleOddities } = await import(join(JS, 'data/sample.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));
const { elementsToState, solveKeplerHyperbolic } = await import(join(JS, 'propagate/kepler.js'));
const { LAYERS, loadLayer } = await import(join(JS, 'data/layers.js'));
const { firstSentence, whyLine, rightNowFor, drawingLine, orbitLineLine, farRegion, klassLabel } = await import(join(JS, 'ui/cards.js'));
const { buildIndex, findMatches } = await import(join(JS, 'ui/search.js'));
const { wholePathTimes, wholePathKind, createOrbitLine, SAMPLES } = await import(join(JS, 'scene/orbitline.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { modelFor, disposeModels } = await import(join(JS, 'scene/models.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const AU = 149597870.7;
const GM = 1.32712440018e11;

const records = farBodies();
const byId = new Map(records.map((r) => [r.id, r]));
const DWARFS = ['dwarf-ceres', 'dwarf-eris', 'dwarf-haumea', 'dwarf-makemake', 'dwarf-sedna', 'dwarf-gonggong', 'dwarf-quaoar', 'dwarf-orcus'];
const VISITORS = ['interstellar-1i', 'interstellar-2i'];

// ------------------------------------------------------------------------------ the records
check(records.length === 10, `ten far bodies (${records.length})`);
for (const id of [...DWARFS, ...VISITORS]) check(byId.has(id), `${id} is among them`);
for (const r of records) {
  check(r.layer === 'far-bodies' && r.propagator === 'kepler' && r.frame === 'sun-inertial', `${r.id}: far-bodies / kepler / sun-inertial`);
  // Not a stand-in: a real phase and no dashed "not a live position" halo.
  check(r.cls === 'inferred', `${r.id} is inferred, not ${r.cls}`);
  check(Number.isFinite(r.elements.maRad) && Number.isFinite(r.elements.epochMs), `${r.id} carries its phase (mean anomaly at an epoch)`);
  check(r.meta.cite && /JPL Small-Body Database/.test(r.meta.cite), `${r.id} cites the SBDB on its card`);
  check(r.meta.why && r.meta.whySource && /Wikipedia/.test(r.meta.whySource), `${r.id} has a sourced line`);
  check(Number.isFinite(r.epoch) && r.epoch <= Date.UTC(2026, 8, 22), `${r.id}: the age is of the last observation, which is in the past`);
}
// Ceres moved; it is not on the map twice on the day the NEO snapshot is missing.
const asteroidNames = new Set(sampleAsteroids().map((r) => r.name));
for (const r of records) check(!asteroidNames.has(r.name), `${r.name} is in the far-bodies layer AND the asteroid stand-ins`);

// The layer: bundled, in the registry, loads its ten records with nothing to fetch.
const layer = LAYERS.find((l) => l.id === 'far-bodies');
check(layer && layer.source === 'bundled' && layer.enabled !== false, 'the far-bodies layer exists, bundled and enabled');
if (layer) {
  const loaded = await loadLayer(layer, Date.UTC(2026, 8, 22));
  check(loaded.length === 10 && loaded.every((r) => r.layer === 'far-bodies'), `loadLayer gives the ten (${loaded.length})`);
  const borisov = loaded.find((r) => r.id === 'interstellar-2i');
  check(borisov && borisov.klass === 'comet' && borisov.colour === '#D9F3FF', 'Borisov is a comet and wears the comet colour');
}

// ------------------------------------------------------------------------------ where, vs Horizons
// 2026-09-22 00:00 TDB is 69.184 s before 00:00 UTC (TT - UTC).
const T_HZ = Date.UTC(2026, 8, 22) - 69184;
const HORIZONS = {
  'dwarf-ceres': [0.375786, 2.653941, 0.014791],
  'dwarf-eris': [85.086931, 39.689081, -17.252014],
  'dwarf-haumea': [-36.654875, -24.068821, 23.512812],
  'dwarf-makemake': [-45.932247, -9.615695, 24.055033],
  'dwarf-sedna': [38.741004, 71.226936, -16.997945],
  'dwarf-gonggong': [81.839796, -37.083634, -1.139958],
  'dwarf-quaoar': [8.482338, -41.329208, 5.916707],
  'dwarf-orcus': [-43.962290, 9.718536, -16.581578],
  'interstellar-1i': [49.677021, 7.899514, 21.030300],
  'interstellar-2i': [0.549359, -41.784924, -24.537127],
};
for (const [id, ref] of Object.entries(HORIZONS)) {
  const r = byId.get(id);
  const p = r && propagate(r, T_HZ);
  if (!p) { problems.push(`${id}: no position at 2026-09-22`); continue; }
  const miss = Math.hypot(p.x / AU - ref[0], p.y / AU - ref[1], p.z / AU - ref[2]);
  // Two-body from JPL's own osculating elements: 0.0001 au for the dwarf planets. The visitors'
  // elements are eight and six years old and leave out the planets and the non-gravitational push:
  // measured 0.028 and 0.018 au, so 0.05 au, which is still under 0.1 % of their distance.
  const tol = VISITORS.includes(id) ? 0.05 : 0.001;
  check(miss < tol, `${id} is ${miss.toFixed(5)} au from where Horizons puts it (tolerance ${tol})`);
}
const rAu = (id, t = T_HZ) => { const p = propagate(byId.get(id), t); return Math.hypot(p.x, p.y, p.z) / AU; };
check(rAu('dwarf-eris') > 95 && rAu('dwarf-eris') < 96, `Eris is 95 to 96 au out in September 2026 (${rAu('dwarf-eris').toFixed(2)})`);
check(rAu('dwarf-sedna') > 82.5 && rAu('dwarf-sedna') < 83.5, `Sedna is about 83 au out (${rAu('dwarf-sedna').toFixed(2)}; Horizons 82.84)`);
check(rAu('dwarf-ceres') > 2.5 && rAu('dwarf-ceres') < 3.0, `Ceres is in the asteroid belt (${rAu('dwarf-ceres').toFixed(2)} au)`);

// ------------------------------------------------------------------------------ e > 1
for (const id of VISITORS) {
  const r = byId.get(id);
  const el = r.elements;
  check(el.e > 1 && el.aKm < 0 && el.qKm > 0, `${id} is on a hyperbola (e ${el.e}, a < 0, q > 0)`);
  // Perihelion as the ELEMENTS put it (mean anomaly zero). JPL's published tp agrees to seconds;
  // its rounding to 1e-4 day is 4 s for Borisov, enough to tilt a 1e-6 au symmetry test.
  const nEl = Math.sqrt(GM / Math.abs(el.aKm) ** 3);
  const tp = el.epochMs - (el.maRad / nEl) * 1000;
  check(Math.abs(tp - r.meta.perihelionMs) < 60e3, `${id}: JPL's tp and the mean anomaly agree to a minute`);
  const atPeri = rAu(id, tp);
  check(Math.abs(atPeri - el.qKm / AU) < 1e-4, `${id} is at q (${(el.qKm / AU).toFixed(4)} au) at perihelion, not ${atPeri.toFixed(4)}`);
  const year = 365.25 * 86400000;
  check(Math.abs(rAu(id, tp - year) - rAu(id, tp + year)) < 1e-6, `${id}: a hyperbola is symmetric about perihelion`);
  // Positive energy: unbound, and the speed far out is the speed it arrived with.
  const s = elementsToState(el, T_HZ);
  const v2 = s.vx * s.vx + s.vy * s.vy + s.vz * s.vz;
  const energy = v2 / 2 - GM / s.r;
  check(energy > 0 && Math.abs(energy - GM / (2 * Math.abs(el.aKm))) / energy < 1e-6, `${id}: orbital energy is +mu/2|a| (${energy.toFixed(3)} km2/s2)`);
  // Its hyperbolic anomaly solves Kepler's equation, not just approximately.
  const n = Math.sqrt(GM / Math.abs(el.aKm) ** 3);
  const M = n * (T_HZ - tp) / 1000;
  const H = solveKeplerHyperbolic(M, el.e);
  check(Math.abs(el.e * Math.sinh(H) - H - M) < 1e-8 * Math.max(1, Math.abs(M)), `${id}: e sinh H - H = M`);
}
// Which way the visitors are going: out in 2026, and ('Oumuamua) in, before 9 September 2017.
check(rAu('interstellar-1i', T_HZ + 86400000 * 365) > rAu('interstellar-1i'), 'ʻOumuamua is moving away from the Sun in 2026');

// ------------------------------------------------------------------------------ the card
const ctx = (t) => ({ clock: { now: () => t }, worlds: null, selected: () => null });
const mAt = (r, t) => { const p = propagate(r, t); return { ok: true, tMs: t, altKm: null, distSunKm: Math.hypot(p.x, p.y, p.z), distEarthKm: null, speedKmh: null }; };
const say = (r, t = T_HZ) => String(firstSentence(r, ctx(t), mAt(r, t), { state: 'none' }));
for (const id of DWARFS) {
  const r = byId.get(id);
  const s = say(r);
  check(/ is a dwarf planet /.test(s), `${r.name}'s card says it is a dwarf planet: "${s}"`);
  check(!/near-Earth|main belt|comet/.test(s), `${r.name} is none of the other things: "${s}"`);
  check(/astronomical units from the Sun/.test(s), `${r.name}'s sentence says how far out it is: "${s}"`);
  check(whyLine(r) === r.meta.why, `${r.name}'s sourced line is printed under the sentence`);
  const rows = rightNowFor(r, ctx(T_HZ));
  check(rows.some(([k]) => k === 'Moons') && rows.some(([k]) => k === 'Why it is known, read from'), `${r.name}: moons and the line's source are rows (${rows.map(([k]) => k).join(', ')})`);
  check(/plain round body/.test(drawingLine(r)), `${r.name} is drawn as a round body, not "a generic asteroid": "${drawingLine(r)}"`);
  check(orbitLineLine(r) && /whole orbit/.test(orbitLineLine(r)), `${r.name}'s line is its whole orbit`);
  // The badge: "Asteroid" beside "is a dwarf planet" was the first thing read in the browser.
  check(klassLabel(r) === 'Dwarf planet', `${r.name}'s badge says Dwarf planet, not ${klassLabel(r)}`);
}
for (const id of VISITORS) check(klassLabel(byId.get(id)) === 'Interstellar object', `${id}'s badge`);
check(klassLabel({ klass: 'asteroid', meta: {} }) === 'Asteroid', 'every other asteroid keeps its badge');
check(/6 June 2026/.test(byId.get('dwarf-eris').meta.cite), `the source line writes its date in words: ${byId.get('dwarf-eris').meta.cite}`);
check(/in the asteroid belt, between Mars and Jupiter/.test(say(byId.get('dwarf-ceres'))), `Ceres: "${say(byId.get('dwarf-ceres'))}"`);
check(/ far beyond Neptune/.test(say(byId.get('dwarf-sedna'))), `Sedna: "${say(byId.get('dwarf-sedna'))}"`);
for (const id of ['dwarf-eris', 'dwarf-haumea', 'dwarf-makemake', 'dwarf-gonggong', 'dwarf-quaoar', 'dwarf-orcus']) {
  const s = say(byId.get(id));
  check(/ is a dwarf planet beyond Neptune/.test(s), `${id}: "${s}"`);
}
check(/95\.5 astronomical units/.test(say(byId.get('dwarf-eris'))), `Eris's distance on its card: "${say(byId.get('dwarf-eris'))}"`);
// The region is the orbit's own: an orbit that dips inside Neptune's is not "beyond Neptune".
check(farRegion({ meta: { qAu: 29.7, aphelionAu: 49.3 } }) === null, 'a Pluto-like orbit, crossing Neptune\'s, is not called beyond it');
check(/Sedna/.test(byId.get('dwarf-sedna').name) && rightNowFor(byId.get('dwarf-sedna'), ctx(T_HZ)).some(([k, v]) => k === 'Across' && /648 to 1 ?\s?220 km/.test(v)),
  'Sedna, which nobody has resolved, gets the range and not a middle');
check(/egg/.test(drawingLine(byId.get('dwarf-haumea'))), 'Haumea says it is not round');
check(/tails are part of the drawing/.test(drawingLine(byId.get('interstellar-2i'))), 'Borisov says its drawn tails are not seen');
for (const id of VISITORS) {
  const r = byId.get(id);
  const s = say(r);
  check(/another star/.test(s) && /on its way out of the Solar System/.test(s), `${r.name} came from another star and is leaving: "${s}"`);
  check(!/long loop|dwarf planet|near-Earth/.test(s), `${r.name} is on no loop: "${s}"`);
  check(/one pass through the Solar System/.test(orbitLineLine(r)), `${r.name}'s line is its passage`);
}
const before = Date.UTC(2017, 5, 1);
check(/falling in towards the Sun/.test(say(byId.get('interstellar-1i'), before)), `wound back to June 2017, ʻOumuamua is on its way in: "${say(byId.get('interstellar-1i'), before)}"`);

// ------------------------------------------------------------------------------ search
{
  const all = [...records, ...sampleAsteroids(), ...sampleDeepSpace(), ...sampleOddities()];
  const index = buildIndex(all, LAYERS);
  const first = (q) => { const m = findMatches(index, q); return m.hits[0] ? m.hits[0].record.id : null; };
  check(first('Eris') === 'dwarf-eris', `"Eris" finds Eris (${first('Eris')})`);
  check(first('Sedna') === 'dwarf-sedna', `"Sedna" finds Sedna (${first('Sedna')})`);
  check(first('Oumuamua') === 'interstellar-1i', `"Oumuamua", typed without the okina, finds it (${first('Oumuamua')})`);
  check(first('2003 UB313') === 'dwarf-eris', `the old designation finds Eris (${first('2003 UB313')})`);
  check(first('136199') === 'dwarf-eris', `the minor-planet number finds Eris (${first('136199')})`);
  check(first('borisov') === 'interstellar-2i', `"borisov" finds 2I/Borisov (${first('borisov')})`);
  check(first('ceres') === 'dwarf-ceres', `"ceres" finds Ceres (${first('ceres')})`);
  const dp = findMatches(index, 'dwarf planet', 20);
  check(dp.hits.length === 8 && dp.hits.every((h) => DWARFS.includes(h.record.id)), `"dwarf planet" lists the eight (${dp.hits.map((h) => h.record.name).join(', ')})`);
}

// ------------------------------------------------------------------------------ the line
{
  const toHelio = (r, times) => Array.from(times, (t) => { const p = propagate(r, t); return p ? [p.x / AU, p.y / AU, p.z / AU] : null; }).filter(Boolean);
  const radii = (pts) => pts.map((p) => Math.hypot(...p));
  // The distance from a point to the polyline: the dot must sit ON its own line.
  const offLine = (pts, q) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const ab = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], aq = [q[0] - a[0], q[1] - a[1], q[2] - a[2]];
      const L = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
      const u = L > 0 ? Math.min(1, Math.max(0, (aq[0] * ab[0] + aq[1] * ab[1] + aq[2] * ab[2]) / L)) : 0;
      best = Math.min(best, Math.hypot(aq[0] - u * ab[0], aq[1] - u * ab[1], aq[2] - u * ab[2]));
    }
    return best;
  };
  const sedna = byId.get('dwarf-sedna');
  const st = wholePathTimes(sedna, T_HZ);
  check(wholePathKind(sedna) === 'orbit' && st && st.length === SAMPLES + 1, 'Sedna asks for its whole orbit, plus today');
  check(st.every((t, i) => i === 0 || t >= st[i - 1]), 'the sample times are in order');
  const periodMs = sedna.meta.periodDays * 86400000;
  check(Math.abs((st[st.length - 1] - st[0]) - periodMs * (SAMPLES - 1) / SAMPLES) / periodMs < 0.01, 'the samples span one lap');
  const sp = toHelio(sedna, st);
  const sr = radii(sp);
  check(Math.abs(Math.min(...sr) - sedna.meta.qAu) < 0.5, `the line reaches in to Sedna's perihelion, ${sedna.meta.qAu.toFixed(1)} au (${Math.min(...sr).toFixed(1)})`);
  check(Math.abs(Math.max(...sr) - sedna.meta.aphelionAu) < 1, `and out to its aphelion, ${sedna.meta.aphelionAu.toFixed(0)} au (${Math.max(...sr).toFixed(0)})`);
  const sNow = propagate(sedna, T_HZ);
  // Evenly in E, the chord near perihelion is short; 83 au out it is well under an au from the arc.
  // The line passes THROUGH the dot: today is one of its vertices (the 2026-09-22 browser fix).
  check(offLine(sp.concat([sp[0]]), [sNow.x / AU, sNow.y / AU, sNow.z / AU]) < 1e-9, 'Sedna\'s dot is a vertex of its line');

  const oum = byId.get('interstellar-1i');
  const ot = wholePathTimes(oum, T_HZ);
  check(wholePathKind(oum) === 'passage' && ot && ot.length === SAMPLES + 1, 'ʻOumuamua asks for its passage, plus today');
  const op = toHelio(oum, ot);
  const or = radii(op);
  const oNow = rAu('interstellar-1i');
  check(Math.abs(Math.min(...or) - oum.meta.qAu) < 0.01, `the passage goes through perihelion, ${oum.meta.qAu.toFixed(3)} au (${Math.min(...or).toFixed(3)})`);
  check(or[0] > oNow && or[or.length - 1] > oNow, `and comes in from, and runs on past, where it is now (${or[0].toFixed(0)} and ${or[or.length - 1].toFixed(0)} au; now ${oNow.toFixed(1)})`);
  const oPos = propagate(oum, T_HZ);
  check(offLine(op, [oPos.x / AU, oPos.y / AU, oPos.z / AU]) < 1e-9, 'ʻOumuamua\'s dot is a vertex of its line');

  // Through the scene: the line is built, closed for an orbit and open for a passage, and its
  // vertices are offsets from the dot (the float32 fix) -- so the dot is at the line's own origin.
  stage.setWorld('sun');
  stage.setTime(T_HZ);
  const scene = new THREE.Scene();
  const ol = createOrbitLine(scene, {});
  ol.setRecord(byId.get('dwarf-eris'));
  ol.update(T_HZ);
  check(ol.hasLine() && ol.line.geometry.drawRange.count === SAMPLES + 2, `Eris gets a closed line through today (${ol.line.geometry.drawRange.count} points)`);
  const erisNow = stage.toScene(propagate(byId.get('dwarf-eris'), T_HZ), 'sun-inertial', T_HZ);
  check(erisNow && ol.line.position.distanceTo(erisNow) < 1e-6, 'the line\'s origin is the dot');
  // ...and one vertex is AT that origin, so near the dot the float32 offsets are tiny and exact.
  {
    const a = ol.line.geometry.attributes.position.array;
    let nearest = Infinity;
    for (let i = 0; i < ol.line.geometry.drawRange.count; i++) nearest = Math.min(nearest, Math.hypot(a[i * 3], a[i * 3 + 1], a[i * 3 + 2]));
    check(nearest < 1e-6, `a vertex of Eris's line sits on the dot (${nearest})`);
  }
  const pos = ol.line.geometry.attributes.position.array;
  let far = 0;
  for (let i = 0; i < ol.line.geometry.drawRange.count; i++) far = Math.max(far, Math.hypot(pos[i * 3] + ol.line.position.x, pos[i * 3 + 1] + ol.line.position.y, pos[i * 3 + 2] + ol.line.position.z));
  const erisQ = byId.get('dwarf-eris').meta.aphelionAu * AU / stage.unitKm;
  check(Math.abs(far - erisQ) / erisQ < 0.01, `Eris's line reaches its aphelion, ${byId.get('dwarf-eris').meta.aphelionAu.toFixed(1)} au`);
  ol.setRecord(byId.get('interstellar-2i'));
  ol.update(T_HZ);
  check(ol.hasLine() && ol.line.geometry.drawRange.count === SAMPLES + 1, `Borisov gets an open line through today (${ol.line.geometry.drawRange.count} points)`);
  ol.dispose();
  stage.setWorld('earth');
}

// ------------------------------------------------------------------------------ the model
// Every dwarf planet is 900 km or more across, and the asteroid builder draws that size round.
for (const id of DWARFS) {
  const r = byId.get(id);
  const obj = modelFor('asteroid', undefined, { record: r });
  obj.updateMatrixWorld(true);
  const size = new THREE.Box3().setFromObject(obj).getSize(new THREE.Vector3());
  const roundness = Math.min(size.x, size.y, size.z) / Math.max(size.x, size.y, size.z);
  check(roundness > 0.99, `${r.name} is drawn round (${roundness.toFixed(3)})`);
  check(Math.abs(obj.userData.realSizeM - r.meta.diameterKm * 1000) < 1, `${r.name}'s model declares ${r.meta.diameterKm} km`);
  disposeModels(obj);
}

if (problems.length) { console.error('far bodies FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`far bodies ok: ${records.length} bodies within 0.001 au of Horizons (the two visitors within 0.05), `
  + `8 cards say "dwarf planet", 2 say "from another star", search finds each, and the line is the whole path through the dot`);
