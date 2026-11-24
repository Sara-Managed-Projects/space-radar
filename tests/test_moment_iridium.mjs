// tests/test_moment_iridium.mjs -- the Moment "2009: Iridium 33 and Kosmos 2251" (research train (ops), forge internal #561).
//
//   node tests/test_moment_iridium.mjs
//
//   the place    both satellites' paths are at the one point of the collision at the event (72.5 N 97.9 E at the Earth's turn of that
//                second, 789 km up), Iridium 33 northbound at 86.4 degrees, Kosmos 2251 southbound at 74.0, closing at about 11.7 km/s
//   the clouds   moments/debriscloud.js cloudFor gives each cloud its parent's plane at the event, so every piece is born near that
//                point; without the plane (Fengyun-1C, the Find view) data/clouds.js spreadAt is exactly what it was
//   the shape    a vehicle with `model: null` and `shape` is the app's procedural Iridium (scene/models.js), at its real size; the
//                validator refuses a shape beside a model file and a plane that is not a number
//   the words    every count a caption says is its source's (CelesTrak's of June 2012; the pieces files' of the catalogue of 2026-11-23)
//   the file     scripts/build_moment_iridium_cosmos.py --check: the moment and its paths are what the builder writes
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (p) => import(pathToFileURL(join(ROOT, 'site', 'js', p)).href);
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;

const { readPieces, fillCloud, cloudFor } = await mod('moments/debriscloud.js');
const { cloudById, spreadAt, R_EARTH_KM } = await mod('data/clouds.js');
const { gmst } = await mod('propagate/frames.js');
const F = await mod('moments/format.js');
const V = await mod('moments/vehicles.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);

const ID = 'iridium-cosmos-2009';
const moment = json(`site/data/moments/${ID}.json`);
const epochMs = Date.parse(moment.epoch);

// --- the place: both paths meet at the point of the collision -------------------------------------------------------------
const lat = 72.5 * DEG, ra = gmst(new Date(epochMs)) + 97.9 * DEG, r = R_EARTH_KM + 789;
const hit = [r * Math.cos(lat) * Math.cos(ra), r * Math.cos(lat) * Math.sin(ra), r * Math.sin(lat)];
check(Math.abs(epochMs - cloudById('iridium33').eventMs) < 60000 && Math.abs(epochMs - Date.UTC(2009, 1, 10, 16, 55, 59, 806)) < 1000, 'the moment starts at CelesTrak\'s second, within the minute data/clouds.js gives');
const rows = {};
for (const v of moment.vehicles) rows[v.id] = json(`site/data/moments/${moment.trajectories[v.path].file}`).rows.find((x) => x[0] === 0);
const I = rows['iridium-33'], K = rows['kosmos-2251'];
for (const [name, s] of [['Iridium 33', I], ['Kosmos 2251', K]]) {
  check(s && Math.hypot(s[1] - hit[0], s[2] - hit[1], s[3] - hit[2]) < 0.01, `${name} is at the point of the collision at the event`);
}
const incOf = (s) => { const h = [s[2] * s[6] - s[3] * s[5], s[3] * s[4] - s[1] * s[6], s[1] * s[5] - s[2] * s[4]]; return Math.acos(h[2] / Math.hypot(...h)) / DEG; };
check(Math.abs(incOf(I) - 86.4) < 0.01 && Math.abs(incOf(K) - 74.0) < 0.01, `tilts 86.4 and 74.0 degrees (${incOf(I).toFixed(2)}, ${incOf(K).toFixed(2)})`);
check(I[6] > 0 && K[6] < 0, 'Iridium 33 northbound, Kosmos 2251 southbound (CelesTrak, Figure 7)');
const dv = Math.hypot(I[4] - K[4], I[5] - K[5], I[6] - K[6]);
const ang = Math.acos((I[4] * K[4] + I[5] * K[5] + I[6] * K[6]) / Math.hypot(I[4], I[5], I[6]) / Math.hypot(K[4], K[5], K[6])) / DEG;
check(Math.abs(dv - 11.7) < 0.3 && ang > 95 && ang < 110, `closing at about 11.7 km/s at nearly a right angle (${dv.toFixed(2)} km/s, ${ang.toFixed(1)} degrees)`);

// --- the clouds: born at that point, and the old behaviour kept -------------------------------------------------------------
const fx = Object.fromEntries(moment.tracks.effects.map((e) => [e.cloud, e]));
for (const id of ['iridium33', 'cosmos2251']) {
  const e = fx[id];
  check(e && e.effect === 'debris-cloud' && Number.isFinite(e.nodeDeg) && Number.isFinite(e.argLatDeg), `${id}: a debris-cloud with its plane at the event`);
  const doc = json(`site/data/moments/${e.file}`);
  const pieces = readPieces(doc);
  check(pieces.length === doc.pieces.length / 3 && pieces.length > 100, `${id}: ${pieces.length} pieces read`);
  const cloud = cloudFor(cloudById(id), e);
  const out = new Float32Array(pieces.length * 3);
  check(fillCloud(out, pieces, cloud, cloud.eventMs - 1000, [0, 0, 0]) === 0, `${id}: no piece before the event`);
  const n = fillCloud(out, pieces, cloud, epochMs, [0, 0, 0]);
  check(n === pieces.length, `${id}: every piece drawn at the event`);
  // Each piece starts at its own perigee of today on its own tilt, so near the point, not on it: the median within 150 km.
  const d = [];
  for (let i = 0; i < n; i += 1) d.push(Math.hypot(out[i * 3] / 1000 - hit[0], -out[i * 3 + 2] / 1000 - hit[1], out[i * 3 + 1] / 1000 - hit[2]));
  d.sort((a, b) => a - b);
  check(d[d.length >> 1] < 150, `${id}: the pieces are born at the point of the collision (median ${d[d.length >> 1].toFixed(0)} km from it)`);
}
const fy = cloudById('fy1c');
check(cloudFor(fy, {}) === fy && cloudFor(fy, { effect: 'debris-cloud' }) === fy, 'cloudFor without a plane is the row itself');
const piece = { meta: { apogeeKm: 870, perigeeKm: 840, inclinationDeg: 98.6 } };
const a0 = spreadAt(piece, fy, fy.eventMs + 3600e3, {});
const a1 = spreadAt(piece, { ...fy, nodeRad: 0, argLatRad: 0 }, fy.eventMs + 3600e3, {});
check(a0 && a1 && a0.x === a1.x && a0.y === a1.y && a0.z === a1.z, 'spreadAt with no plane is spreadAt with a plane of zeros (Fengyun-1C and the Find view unchanged)');
const turned = spreadAt(piece, { ...fy, nodeRad: Math.PI / 2, argLatRad: 0 }, fy.eventMs, {});
check(turned && Math.abs(turned.x) < 1e-6 && turned.y > 7000, 'a node of 90 degrees turns the birth point onto +Y');

// --- the shape, and the validator ---------------------------------------------------------------------------------------------
const iri = moment.vehicles.find((v) => v.id === 'iridium-33');
check(iri.model === null && JSON.stringify(iri.shape) === '["satellite","iridium"]' && iri.marker === undefined, 'Iridium 33 wears the procedural Iridium shape');
const loaded = await V.loadVehicle(iri, []);
const box = new THREE.Box3().setFromObject(loaded.root);
const size = box.getSize(new THREE.Vector3());
check(loaded.ok && loaded.parts.has('whole'), 'the shape loads as one part');
check(Math.abs(Math.max(size.x, size.y, size.z) - 9.4) < 0.05 && Math.abs(size.y - iri.lengthM) < 0.05, `at its real size: 9.4 m across, ${iri.lengthM} m along its flight (${size.x.toFixed(2)} x ${size.y.toFixed(2)} x ${size.z.toFixed(2)})`);
check(box.min.y > -1e-6, 'stood on y = 0, as every Moment vehicle is');
const kos = moment.vehicles.find((v) => v.id === 'kosmos-2251');
check(kos.model === null && kos.marker === true, 'Kosmos 2251 is the ringed mark: no model of it exists here');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');
await mod(`copy/${moment.wordsFile}`);
const words = COPY.momentStories[ID];
const models = [...readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8').matchAll(/^\s+- id: ([\w-]+)/gm)].map((m) => m[1]);
check(F.validateMoment(moment, { models, words }).length === 0, `the moment is valid: ${F.validateMoment(moment, { models, words }).join('; ')}`);
const edit = (fn) => { const m = JSON.parse(JSON.stringify(moment)); fn(m); return F.validateMoment(m, { words }); };
check(edit((m) => { m.vehicles[0].model = 'saturn-v'; }).some((s) => /shape/.test(s)), 'a shape beside a model file is refused');
check(edit((m) => { m.vehicles[0].shape = ['satellite']; }).some((s) => /model null/.test(s)), 'a shape that is not [klass, variant] is refused');
check(edit((m) => { m.tracks.effects[0].nodeDeg = 'north'; }).some((s) => /nodeDeg/.test(s)), 'a plane that is not a number is refused');
check(!moment.tracks.audio || !moment.tracks.audio.some((a) => a.voice), 'captions only: no voice is claimed');
check(moment.floodlit === true && moment.drawn === 'drawnNoteLamp' && /shadow/.test(words.drawnNoteLamp) && /lamp/.test(words.drawnNoteLamp), 'in the Earth\'s shadow, the lamp is said on the foot line');
check(/family/.test(words.drawnNoteLamp) && /differed/.test(words.drawnNoteLamp), 'the foot line says the shape is the family\'s, not the first generation\'s own');

// --- the words: every count is its source's ---------------------------------------------------------------------------------
const doc = (id) => json(`site/data/moments/${fx[id].file}`);
const g = (n) => String(n).replace(/\B(?=(\d{3})+$)/g, ' ');
const I33 = doc('iridium33'), K2251 = doc('cosmos2251');
const has = (key, ...xs) => { for (const x of xs) check(words[key].includes(x), `${key} says ${x}`); };
has('c1a', '556 kg', '789 km');                        // CelesTrak Table 1 (dry mass); NASA ODQN 13(2)
has('c1b', '900 kg', '74 degrees', '1995');            // CelesTrak Table 1; SATCAT 74.04; JSR 606
has('c2a', 'Taymyr', '584 m');                         // JSR 606; CelesTrak
has('c2b', '3.1 m', '9.4 m');                          // scene/models.js buildIridium, Iridium's fact sheet
has('c3a', '16:55:59 UTC', '11.7 km/s');               // CelesTrak 16:55:59.806; Wikipedia
has('c7a', '598', '93', '1 603', '222', '22 June 2012'); // CelesTrak, as of 2012 June 22
has('c8a', g(I33.catalogued), g(K2251.catalogued), g(I33.pieces.length / 3), g(K2251.pieces.length / 3));
check(words.cloudNote.includes(g(I33.pieces.length / 3)) && words.cloudNote.includes(g(K2251.pieces.length / 3)), 'the foot line counts the pieces the files hold');
check(COPY.momentShelf.cards[ID] && COPY.momentShelf.cards[ID].blurb.includes(g(I33.catalogued + K2251.catalogued)), 'the shelf card counts the pieces ever catalogued');
for (const c of moment.tracks.captions) check(c.say in words, `caption ${c.say} has words`);
for (const c of moment.chapters) check(c.say in words, `chapter ${c.say} has words`);
const { momentsForRecord } = await mod('moments/shelf.js');
for (const [name, layer] of [['IRIDIUM 33', 'active'], ['COSMOS 2251', 'active']]) {
  check(momentsForRecord({ id: 'sat-x', layer, name }).some((s) => s.id === ID), `${name}'s card offers the story`);
}
check(!momentsForRecord({ id: 'sat-y', layer: 'active', name: 'IRIDIUM 33 DEB' }).some((s) => s.id === ID), 'a piece of it is not offered the story');
const table = F.paceTable(moment.pace);
check(table.total > 120 && table.total < 240, `the story plays ${table.total.toFixed(0)} s, about the shelf's three minutes`);
check(F.rateAt(table, 0) === 1, 'the collision itself plays at x1');

// --- the builder ---------------------------------------------------------------------------------------------------------------
try { execFileSync('python3', [join(ROOT, 'scripts/build_moment_iridium_cosmos.py'), '--check'], { stdio: 'pipe' }); } catch (e) { problems.push(`build_moment_iridium_cosmos.py --check: ${String(e.stdout || e.message).trim()}`); }

if (problems.length) { console.error(`moment iridium FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`moment iridium ok: both satellites at the point above the Taymyr Peninsula at 16:56 UTC, ${dv.toFixed(2)} km/s at ${ang.toFixed(1)} degrees; ${I33.pieces.length / 3} and ${K2251.pieces.length / 3} pieces born there; the Iridium shape at 9.4 m; every count its source's`);
