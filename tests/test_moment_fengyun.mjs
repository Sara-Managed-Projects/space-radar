// tests/test_moment_fengyun.mjs -- the Moment "2007: Fengyun-1C" (forge #153): the cloud, the voice and the honesty of its words.
//
//   node tests/test_moment_fengyun.mjs
//
//   the cloud    moments/debriscloud.js readPieces and fillCloud: nothing before the event, every piece on one line at it (its
//                own perigee of today, on the +X axis), spread out a year on, in three.js axes about the floating origin
//   the start    the satellite's path (paths/fengyun-1c-orbit.json) is at that point at the event, so the cloud is born on it
//   the voice    moments/voice.js voiceAt: the clip being said at a play second and how far in; nothing between clips
//   the file     the validator holds the moment, refuses a model-less vehicle that is not a mark and a debris-cloud with no file
//   the pace     every chapter plays at least as long as its clip, so the voice never runs past it
//   the words    every count a caption says is the one its source gives (NASA ODQN; the catalogue of 2026-11-07, which is the
//                pieces file's own count), and the captions are the clips' sentences (scripts/narrate-moments.py --check)
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mod = (p) => import(pathToFileURL(join(ROOT, 'site', 'js', p)).href);
const json = (p) => JSON.parse(readFileSync(join(ROOT, p), 'utf8'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// The cloud module imports three.js; node has no WebGL but the vendored module loads without one.
const { readPieces, fillCloud } = await mod('moments/debriscloud.js');
const { cloudById, R_EARTH_KM } = await mod('data/clouds.js');
const { voiceAt } = await mod('moments/voice.js');
const F = await mod('moments/format.js');

const moment = json('site/data/moments/fengyun-1c.json');
const piecesDoc = json('site/data/moments/paths/fengyun-1c-pieces.json');
const cloud = cloudById('fy1c');
const epochMs = Date.parse(moment.epoch);

// --- the cloud --------------------------------------------------------------------------------------------------
const pieces = readPieces(piecesDoc);
check(pieces.length === piecesDoc.pieces.length / 3 && pieces.length > 2000, `readPieces: ${pieces.length} pieces`);
check(readPieces({ pieces: [800, 790, 988, 'x', 1, 2] }).length === 1, 'readPieces skips a row that is not numbers');
check(moment.epoch === '2007-01-11T22:26:10Z' && Math.abs(epochMs - cloud.eventMs) < 60000, 'the moment starts within the minute data/clouds.js gives the event');
const out = new Float32Array(pieces.length * 3);
check(fillCloud(out, pieces, cloud, cloud.eventMs - 1000, [0, 0, 0]) === 0, 'no piece before the event');
const atEvent = epochMs >= cloud.eventMs ? epochMs : cloud.eventMs;
const n0 = fillCloud(out, pieces, cloud, atEvent, [0, 0, 0]);
check(n0 === pieces.length, `every piece is drawn at the event (${n0})`);
let bad = 0;
for (let i = 0; i < n0; i += 1) {
  const x = out[i * 3], y = out[i * 3 + 1], z = out[i * 3 + 2];
  const p = pieces[i].meta;
  const a = R_EARTH_KM + (p.apogeeKm + p.perigeeKm) / 2, e = (p.apogeeKm - p.perigeeKm) / (2 * a);
  // three.js axes: (x, z, -y) of the Earth-inertial frame; the event point is the perigee on the +X axis (seconds after it, within a few km).
  if (!(Math.abs(x / 1000 - a * (1 - e)) < 100 && Math.abs(y) < 1e5 * 1.0 && Math.abs(z) < 2e5)) bad += 1;
}
check(bad === 0, `${bad} pieces are not at the event's one point on the +X axis`);
const later = new Float32Array(pieces.length * 3);
fillCloud(later, pieces, cloud, cloud.eventMs + 365.25 * 86400e3, [1e6, 2e6, 3e6]);
let spreadKm = 0, finite = true;
for (let i = 0; i < pieces.length; i += 1) {
  const r = Math.hypot(later[i * 3] + 1e6, later[i * 3 + 1] + 2e6, later[i * 3 + 2] + 3e6) / 1000;
  if (!Number.isFinite(r)) finite = false;
  spreadKm = Math.max(spreadKm, Math.hypot(later[i * 3] - later[0], later[i * 3 + 1] - later[1], later[i * 3 + 2] - later[2]) / 1000);
  if (r < R_EARTH_KM + 100) finite = false;
}
check(finite, 'a year on, every piece is a finite point above the Earth (the origin is taken off and put back)');
check(spreadKm > 10000, `a year on the pieces are spread round the Earth (${spreadKm.toFixed(0)} km apart at most)`);

// --- the satellite reaches the cloud's starting point ---------------------------------------------------------------
const orbit = json('site/data/moments/paths/fengyun-1c-orbit.json').rows;
const r0 = orbit.find((r) => r[0] === 0);
check(r0 && Math.abs(r0[1] - (R_EARTH_KM + 845)) < 0.01 && Math.abs(r0[2]) < 1e-6 && Math.abs(r0[3]) < 1e-6, 'the satellite is at the 845 km perigee on +X at the event');
check(r0 && Math.abs(Math.hypot(r0[4], r0[5], r0[6]) - 7.43) < 0.03, 'and moving at the orbit\'s perigee speed (about 7.43 km/s)');
check(r0 && Math.abs(Math.atan2(r0[6], r0[5]) * 180 / Math.PI - 98.6) < 0.01, 'on a plane tilted 98.6 degrees (ODQN 11(2))');

// --- the voice ----------------------------------------------------------------------------------------------------
const table = F.paceTable(moment.pace);
const voices = moment.tracks.audio.filter((a) => a.voice);
check(voices.length === 7, `seven voiced chapters (${voices.length})`);
const toy = F.paceTable([{ from: 0, to: 100, rate: 1 }]);
const entries = [{ t: 10, s: 5, voice: true, src: 'a' }, { t: 20, s: 30, voice: true, src: 'b' }, { t: 0, src: 'beep' }];
check(voiceAt(entries, 5, toy) === null, 'voiceAt: nothing before the first clip');
check(voiceAt(entries, 12, toy)?.entry.src === 'a' && Math.abs(voiceAt(entries, 12, toy).offset - 2) < 1e-9, 'voiceAt: two seconds into the first clip');
check(voiceAt(entries, 16, toy) === null, 'voiceAt: nothing after it has ended');
check(voiceAt(entries, 49, toy)?.entry.src === 'b', 'voiceAt: the second clip');
check(voiceAt([{ t: 10, voice: true, src: 'x' }], 11, toy) === null, 'voiceAt: a voice with no length is not played');
for (let i = 0; i < voices.length; i += 1) {
  const p0 = F.playOf(table, voices[i].t), p1 = i + 1 < voices.length ? F.playOf(table, voices[i + 1].t) : table.total;
  check(p1 - p0 >= voices[i].s, `${voices[i].src}: its chapter plays ${(p1 - p0).toFixed(1)} s, the clip lasts ${voices[i].s} s`);
}
check(table.total > 150 && table.total < 300, `the story plays ${table.total.toFixed(0)} s, a few minutes as the shelf says`);

// --- the file -----------------------------------------------------------------------------------------------------
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');
await mod('copy/en.moments.fengyun.js');
const words = COPY.momentStories['fengyun-1c'];
const models = [...readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8').matchAll(/^\s+- id: ([\w-]+)/gm)].map((m) => m[1]);
check(F.validateMoment(moment, { models, words }).length === 0, `the moment is valid: ${F.validateMoment(moment, { models, words }).join('; ')}`);
const broken = JSON.parse(JSON.stringify(moment));
broken.vehicles[0].marker = false;
check(F.validateMoment(broken, { words }).some((s) => /model null/.test(s)), 'a model-less vehicle that is not a mark is refused');
const noFile = JSON.parse(JSON.stringify(moment));
delete noFile.tracks.effects[0].file;
check(F.validateMoment(noFile, { words }).some((s) => /debris-cloud/.test(s)), 'a debris-cloud with no file is refused');
check(F.formatMet(124000000) === 'T+3 y 339 d' && F.formatMet(45 * 86400 + 3600) === 'T+45 d' && F.formatMet(102 * 3600 + 45 * 60 + 40) === 'T+102:45:40', `the clock counts years and days past 30 days (${F.formatMet(124000000)})`);
check(moment.drawn === 'drawnNote' && !/flame|parachute|entry/i.test(words.drawnNote) && moment.footFold === true && words.footMore && words.footLess, 'the foot line says only what this story draws, and folds on a phone');
const noDrawn = JSON.parse(JSON.stringify(moment));
noDrawn.drawn = 'nope';
check(F.validateMoment(noDrawn, { words }).some((s) => /drawn/.test(s)), 'a drawn note with no words is refused');
check(COPY.momentShelf.cards['fengyun-1c'] && /3 531/.test(COPY.momentShelf.cards['fengyun-1c'].blurb), 'the shelf card has its words');

// --- the words: every count is its source's ---------------------------------------------------------------------------
const up = piecesDoc.pieces.length / 3;
const has = (key, ...xs) => { for (const x of xs) check(words[key].includes(x), `${key} says ${x}`); };
has('v1a', '845 to 865 km', '960 kg');                 // ODQN 11(2), April 2007, p. 2
has('v2a', '22:26 UTC', '8 km/s');                     // CelesTrak 22:26:10 UTC; Wikipedia: closing at about 8 km/s
has('v4b', '1 200', '400');                            // ODQN 11(2): more than 1200 catalogued, nearly 400 more tracked
has('v5a', '2 317', '22', '150 000');                  // ODQN 12(1): 2317 catalogued by the end of 2007, 22 reentered; at least 150,000 of 1 cm
has('v6a', '3 378', '3 076');                          // ODQN 17(1): 3378 catalogued, 3076 in orbit, January 2013
has('v6b', 'January 2012');                            // ODQN 18(1): the station's manoeuvre
has('v7a', '3 531', `${String(up).replace(/\B(?=(\d{3})+$)/g, ' ')}`, '10 November 2021'); // the catalogue of 2026-11-07; ODQN 26(1)
check(words.cloudNote.includes(String(up).replace(/\B(?=(\d{3})+$)/g, ' ')), 'the foot line counts the pieces the file holds');
for (const c of moment.tracks.captions) check(c.say in words, `caption ${c.say} has words`);

// --- the clips and the moment are current ---------------------------------------------------------------------------
for (const [script, args] of [['scripts/narrate-moments.py', ['--check']], ['scripts/build_moment_fengyun1c.py', ['--check']]]) {
  try { execFileSync('python3', [join(ROOT, script), ...args], { stdio: 'pipe' }); } catch (e) { problems.push(`${script} --check: ${String(e.stdout || e.message).trim()}`); }
}

if (problems.length) { console.error(`moment fengyun FAILED (${problems.length}):\n  ` + problems.join('\n  ')); process.exit(1); }
console.log(`moment fengyun ok: ${pieces.length} pieces born on one line at the event and spread round the Earth, the satellite on its 845 by 865 km orbit at the event, seven clips each inside its chapter, every count its source's`);
