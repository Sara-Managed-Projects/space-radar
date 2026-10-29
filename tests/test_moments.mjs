#!/usr/bin/env node
// tests/test_moments.mjs -- the Moment engine (internal spec 0079 stage C1, internal i#1050): every file under
// site/data/moments/ is a valid moment, and the arithmetic every picture of one depends on holds.
//
//   1. EVERY MOMENT FILE validates (moments/format.js validateMoment): its pace, its trajectories, its vehicles and
//      their parts, every track in time order inside the span, every word it names present in its story's copy,
//      every model a row of registry/models.yaml with its file on disk, and sources.
//   2. THE CLOCK: play time and mission time round-trip through the pace; the compression printed is the rate in
//      force; the mission clock prints a real minus; a share link carries the second and reads back inside the span.
//   3. THE PATHS: a published profile never overshoots between its points, stands on the pad before its first, is
//      laid along its azimuth; state vectors are Hermite-exact on a straight line and good on an orbit; a Horizons
//      table reads back as rows; a separated part falls.
//   4. THE DIRECTOR: a shot is a function of the second alone; reduced motion makes every blend a cut and holds
//      every drift; the tracking camera narrows its lens as the vehicle climbs away.
//   5. THE PLAYER'S EVENTS: engines light and go out as the part events say (one engine alone when named); a canopy
//      pays out, reefs and opens.
//   6. THE DEMONSTRATION, demo-saturn: about 40 s, Apollo 11's own event times, the staging at the height it was.
//   7. INSIDE THE CONTRACT and THE DIET: no post-processing, render target or flare in site/js/moments/; nothing of
//      it in the boot graph (tests/test_boot_diet.mjs holds the graph; here, that main.js only imports it).
//   8. THE FORMAT IS DOCUMENTED: docs/MOMENTS.md names every field the demonstration uses.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const mod = (p) => import(pathToFileURL(join(JS, p)).href);

const F = await mod('moments/format.js');
const T = await mod('moments/trajectory.js');
const D = await mod('moments/director.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');

// --- 1. every moment file --------------------------------------------------------------------------------------------
const models = [...readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8').matchAll(/^\s*- \{id: ([\w-]+), file: (site\/models\/[\w.-]+)/gm)].map((m) => ({ id: m[1], file: m[2] }));
check(models.length > 50 && models.some((m) => m.id === 'saturn-v'), `registry/models.yaml was not read (${models.length} rows)`);
const dir = join(ROOT, 'site/data/moments');
const files = readdirSync(dir).filter((f) => f.endsWith('.json'));
check(files.includes('demo-saturn.json'), 'the demonstration moment site/data/moments/demo-saturn.json is there');
const moments = {};
for (const f of files) {
  let m = null;
  try { m = JSON.parse(readFileSync(join(dir, f), 'utf8')); } catch (e) { problems.push(`${f}: not JSON (${e.message})`); continue; }
  moments[m.id] = m;
  check(`${m.id}.json` === f, `${f}: its id is ${m.id}`);
  if (m.wordsFile) await mod(`copy/${m.wordsFile}`);
  const words = COPY.momentStories && COPY.momentStories[m.words || m.id];
  check(!!words, `${f}: no words in COPY.momentStories.${m.words || m.id}`);
  for (const p of F.validateMoment(m, { models: models.map((x) => x.id), words: words || {} })) problems.push(`${f}: ${p}`);
  for (const v of m.vehicles || []) {
    const row = models.find((x) => x.id === v.model);
    check(row && existsSync(join(ROOT, row.file)), `${f}: the model file of ${v.model} is on disk`);
  }
}
// The validator refuses what it should (each of these is one mistake in an otherwise valid file).
{
  const base = moments['demo-saturn'];
  const bad = (edit, what) => { const m = JSON.parse(JSON.stringify(base)); edit(m); check(F.validateMoment(m, {}).length > 0, `the validator refuses ${what}`); };
  bad((m) => { m.pace[1].from += 1; }, 'a gap in the pace');
  bad((m) => { m.tracks.parts[0].action = 'explode'; }, 'an unknown part action');
  bad((m) => { m.tracks.parts[0].part = 'no-such-part'; }, 'a part the vehicle does not have');
  bad((m) => { m.tracks.camera[0].shot = 'drone'; }, 'an unknown shot');
  bad((m) => { m.tracks.captions.reverse(); }, 'captions out of time order');
  bad((m) => { m.trajectories.ascent.truth = 'exact'; }, 'a trajectory that is not measured, reconstructed or illustrative');
  bad((m) => { m.epoch = '1969-07-16 13:32'; }, 'an epoch that is not UTC');
  bad((m) => { m.sources = []; }, 'a moment that names no source');
  check(F.validateMoment(base, { words: {} }).some((p) => /no words/.test(p)), 'the validator asks for the words a moment names');
}

// --- 2. the clock ----------------------------------------------------------------------------------------------------
{
  const table = F.paceTable([{ from: -10, to: 10, rate: 1 }, { from: 10, to: 110, rate: 20 }, { from: 110, to: 120, rate: 0.5 }]);
  check(near(table.total, 20 + 5 + 20, 1e-9), `the pace's play time is the sum of its segments (${table.total})`);
  for (const t of [-10, -3.3, 10, 47, 110, 115.5, 120]) check(near(F.missionOf(table, F.playOf(table, t)), t, 1e-9), `mission ${t} s round-trips through play time`);
  check(F.rateAt(table, 50) === 20 && F.rateAt(table, 0) === 1 && F.rateAt(table, 112) === 0.5, 'the rate in force is the segment\'s');
  check(F.compressionText(20) === '×20' && F.compressionText(1) === '×1' && F.compressionText(0.5) === '×0.5' && F.compressionText(600) === '×600', 'the compression prints as ×N');
  check(F.formatMet(-8.9) === 'T−00:00:08' && F.formatMet(161.7) === 'T+00:02:41' && F.formatMet(102 * 3600 + 45 * 60 + 40) === 'T+102:45:40', `the mission clock (${F.formatMet(-8.9)}, ${F.formatMet(161.7)})`);
  check(F.shareHash('demo-saturn', 162.34) === '#moment=demo-saturn&t=162.3', 'a share link carries the second to a tenth');
  check(F.parseT('162.3', table) === null && F.parseT('100', table) === 100 && F.parseT('x', table) === null && F.parseT(undefined, table) === null, 'a link\'s t is read inside the span only');
  const caps = [{ t: 0, say: 'a' }, { t: 50, say: 'b', until: 60 }, { t: 100, say: 'c' }];
  check(F.captionAt(caps, 5, table).say === 'a' && F.captionAt(caps, 55, table).say === 'b' && F.captionAt(caps, 70, table) === null, 'a caption holds until its own end or the next');
  check(F.crossed([{ t: 1 }, { t: 2 }, { t: 3 }], 1, 2.5).length === 1 && F.crossed([{ t: 1 }], 2, 1).length === 0, 'a cue fires once, going forward');
  const f = F.monotoneCubic([0, 1, 2, 3], [0, 0, 10, 10]);
  let over = false;
  for (let x = 0; x <= 3; x += 0.01) { const y = f(x).y; if (y < -1e-9 || y > 10 + 1e-9) over = true; }
  check(!over, 'the monotone cubic never overshoots its points');
}

// --- 3. the paths ----------------------------------------------------------------------------------------------------
{
  const place = { lat: 28.60825, lon: -80.60412, azimuth: 72.058 };
  const tr = T.profileTrack({ points: [[-10, 0, 0], [0.6, 0, 0], [12, 0.13, 0], [161.7, 66.8, 93], [200, 92.7, 176]] }, place);
  const s0 = tr.stateAt(-5);
  check(Math.hypot(...s0.p) < 1e-6 && Math.hypot(...s0.v) < 1e-9, 'before lift-off the vehicle stands on the pad');
  const s1 = tr.stateAt(161.7);
  check(near(s1.altM, 66800, 1) && near(s1.downrangeM, 93000, 1), `at a published point the profile is that point (${s1.altM}, ${s1.downrangeM})`);
  check(near(Math.atan2(s1.p[0], s1.p[1]) * 180 / Math.PI, 72.058, 0.01), 'the path is laid along the flight azimuth');
  check(s1.p[2] < 66800 && s1.p[2] > 66800 - 1000, 'over a round Earth: 93 km downrange the local up is below the pad\'s');
  const frame = T.placeFrame(place);
  check(near(T.len(frame.ecef), 6373300, 2000) && near(T.dot(frame.u, frame.n), 0, 1e-12) && near(T.dot(frame.e, frame.u), 0, 1e-12), 'the place frame is on the ellipsoid and square');
  // State vectors: a circular orbit sampled each minute, read back between samples.
  const R = 6578e3, w = Math.sqrt(T.MU / R ** 3);
  const rows = [];
  for (let t = 0; t <= 600; t += 60) rows.push([t, R * Math.cos(w * t) / 1000, R * Math.sin(w * t) / 1000, 0, -R * w * Math.sin(w * t) / 1000, R * w * Math.cos(w * t) / 1000, 0]);
  const vt = T.vectorTrack(rows, 'earth-teme', 0);
  const mid = vt.stateAt(330);
  const err = Math.hypot(mid.r[0] - R * Math.cos(w * 330), mid.r[1] - R * Math.sin(w * 330), mid.r[2]);
  check(err < 15, `state vectors a minute apart are read back to ${err.toFixed(1)} m on a low orbit (under 15 m)`);
  const line = T.vectorTrack([[0, 0, 0, 7000, 1, 2, 0], [10, 10, 20, 7000, 1, 2, 0]], 'earth-teme', 0).stateAt(4);
  check(near(line.r[0], 4000, 1e-6) && near(line.r[1], 8000, 1e-6), 'Hermite is exact on a straight line');
  const text = ['JDUT, Calendar Date (UT), X, Y, Z, VX, VY, VZ,', '$$SOE',
    '2440419.064583333, A.D. 1969-Jul-16 13:33:00.0000, 6578.0, 0.0, 0.0, 0.0, 7.8, 0.0,',
    '2440419.065277778, A.D. 1969-Jul-16 13:34:00.0000, 6576.0, 468.0, 0.0, -0.05, 7.8, 0.0,', '$$EOE'].join('\n');
  const hz = T.fromHorizons(text, Date.parse('1969-07-16T13:32:00Z'));
  check(hz.length === 2 && near(hz[0][0], 60, 0.01) && near(hz[1][0], 120, 0.01) && hz[0][1] === 6578, `a Horizons table reads as rows in mission seconds (${JSON.stringify(hz[0])})`);
  const fall = T.ballistic([0, 0, 6471e3], [0, 0, 0], [0, 0, 0], 10);
  check(near(fall[2], 6471e3 - 0.5 * 9.52 * 100, 5), `a part let go falls under the Earth's pull (${(6471e3 - fall[2]).toFixed(0)} m in 10 s from 100 km)`);
  const b = T.attitude('ascent', { up: [0, 0, 1], vel: [1, 0, 0], ref: [1, 0, 0], t: 0, pitchStart: 10 });
  check(near(b[1][2], 1, 1e-12), 'the stack stands up the local vertical before its pitch programme');
  const b2 = T.attitude('ascent', { up: [0, 0, 1], vel: [1, 0, 0.2], ref: [1, 0, 0], t: 100, pitchStart: 10 });
  check(near(T.dot(b2[1], T.norm([1, 0, 0.2])), 1, 1e-9) && near(T.dot(b2[0], b2[1]), 0, 1e-12) && near(T.dot(b2[1], b2[2]), 0, 1e-12), 'and along its flight path after it, square');
}

// --- 4. the director -------------------------------------------------------------------------------------------------
{
  const table = F.paceTable([{ from: 0, to: 100, rate: 1 }]);
  const veh = (h) => ({ pos: [0, 6371e3 + h, 0], basis: [[1, 0, 0], [0, 1, 0], [0, 0, 1]], vel: [0, 100, 0], up: [0, 1, 0], lengthM: 110 });
  let h = 0;
  const world = {
    lead: 'v', vehicle: () => veh(h), place: { toWorld: (e) => [e[0], 6371e3 + e[2], -e[1]], up: [0, 1, 0] },
    earth: { centre: [0, 0, 0], radius: 6371e3 }, moon: null, dirToWorld: (v) => v,
  };
  const cam = [{ t: 0, shot: 'track', at: [-1000, 0, 10], fill: 0.5 }, { t: 50, shot: 'orbit', az: 0, el: 10, dist: 300, spin: 10, blend: 4 }];
  h = 100;
  const a = D.directAt(cam, world, 10, table).pose;
  h = 20000;
  const c = D.directAt(cam, world, 40, table).pose;
  check(c.fov < a.fov, `the tracking camera narrows its lens as the vehicle climbs (${a.fov.toFixed(1)} -> ${c.fov.toFixed(1)} degrees)`);
  const again = D.directAt(cam, world, 40, table).pose;
  check(JSON.stringify(again) === JSON.stringify(c), 'a shot is a function of the second alone');
  const blended = D.directAt(cam, world, 51, table, false).pose;
  const cut = D.directAt(cam, world, 51, table, true).pose;
  const orbit = D.evalShot(cam[1], world, 1, true);
  check(JSON.stringify(cut.pos) === JSON.stringify(orbit.pos) && JSON.stringify(blended.pos) !== JSON.stringify(cut.pos), 'reduced motion makes a blend a cut');
  const still1 = D.evalShot(cam[1], world, 1, true), still2 = D.evalShot(cam[1], world, 9, true);
  check(JSON.stringify(still1.pos) === JSON.stringify(still2.pos), 'and holds a drifting shot still');
  const fp = D.freePose([0, 0, 0], [0, 1, 0], 0.4, 0.3, 100);
  const ang = D.poseAngles(fp, [0, 0, 0], [0, 1, 0]);
  check(near(ang.az, 0.4, 1e-9) && near(ang.el, 0.3, 1e-9) && near(ang.dist, 100, 1e-9), 'a visitor\'s camera starts from where the director left it');
}

// --- 5. engines and canopies ---------------------------------------------------------------------------------------
{
  const { engineLevel, chuteLevel } = await mod('moments/player.js');
  const ev = [{ t: 0, action: 'ignite', engines: [0], rampS: 1 }, { t: 0.5, action: 'ignite', rampS: 1 }, { t: 10, action: 'cutoff', engines: [0] }, { t: 20, action: 'cutoff' }];
  check(engineLevel(ev, 0, -1) === 0 && engineLevel(ev, 0, 0.5) > 0 && engineLevel(ev, 1, 0.4) === 0 && engineLevel(ev, 1, 2) === 1, 'engines light in the order the events say');
  check(engineLevel(ev, 0, 11) === 0 && engineLevel(ev, 1, 11) === 1 && engineLevel(ev, 1, 21) === 0, 'one engine goes out alone when named, the rest at the next cut-off');
  const ch = [{ t: 100, action: 'deploy', reefS: 4, openS: 3 }, { t: 200, action: 'hide' }];
  check(chuteLevel(ch, 99) === 0 && chuteLevel(ch, 100.6) > 0 && chuteLevel(ch, 100.6) < 0.3 && near(chuteLevel(ch, 104), 0.6, 1e-9) && chuteLevel(ch, 120) === 1 && chuteLevel(ch, 201) === 0, 'a canopy pays out, reefs, opens and is cut away');
}

// --- 6. the demonstration --------------------------------------------------------------------------------------------
{
  const m = moments['demo-saturn'];
  if (m) {
    const table = F.paceTable(m.pace);
    check(table.total >= 38 && table.total <= 44, `demo-saturn plays in about 40 s (${table.total.toFixed(1)} s)`);
    const ev = (part, action) => m.tracks.parts.find((e) => e.part === part && e.action === action);
    check(ev('s-ic', 'ignite').t === -8.9 && ev('s-ic', 'separate') && ev('les', 'separate').t === 197.9, 'Apollo 11\'s own times: ignition T-8.9 s, the tower at T+197.9 s (Mission Report, Table 3-I)');
    check(m.tracks.parts.some((e) => e.part === 's-ic' && e.action === 'cutoff' && e.t === 161.7) && m.tracks.parts.some((e) => e.part === 'upper' && e.action === 'ignite' && e.t === 163.0), 'S-IC cut-off at T+161.7 s, S-II ignition at T+163.0 s');
    const tr = T.profileTrack(m.trajectories.ascent, m.place);
    check(near(tr.stateAt(161.7).altM / 1000, 67, 1.5), 'the staging is about 67 km up');
    check(F.rateAt(table, -5) === 1 && F.rateAt(table, 1) === 1 && F.rateAt(table, 162) <= 2, 'ignition, lift-off and staging play at (or near) mission pace');
    check(m.chapters.length >= 4 && m.tracks.camera.length >= 6, 'chapters and shots enough to show the engine');
    check(m.vehicles[0].model === 'saturn-v' && Object.keys(m.vehicles[0].cuts).length === 4, 'the existing saturn-v model, cut into four parts until the split model lands');
  }
}

// --- 7. inside the contract, and off the boot graph -----------------------------------------------------------------
{
  const FORBIDDEN = ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'BloomPass', 'LensflareElement', 'Lensflare', 'WebGLRenderTarget', 'OrthographicCamera', 'FullScreenQuad'];
  for (const f of readdirSync(join(JS, 'moments'))) {
    const src = readFileSync(join(JS, 'moments', f), 'utf8').split('\n').filter((l) => !/^\s*\/\//.test(l)).join('\n');
    for (const word of FORBIDDEN) check(!src.includes(word), `moments/${f} names ${word}: no post-processing, render target or flare (tests/test_contract.mjs)`);
    check(!/PlaneGeometry\s*\(\s*2\s*,\s*2/.test(src), `moments/${f}: no full-screen quad`);
  }
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/moments\/player\.js'\)/.test(main) && !/^import[^\n]*moments\//m.test(main), 'main.js fetches the player by dynamic import only');
  const url = readFileSync(join(JS, 'ui/urlstate.js'), 'utf8');
  check(/'imagine', 'moment', 'cam'\]/.test(url), 'the link key `moment` is known, so the app\'s own writes keep it');
}

// --- 8. the format is documented -----------------------------------------------------------------------------------
{
  const doc = existsSync(join(ROOT, 'docs/MOMENTS.md')) ? readFileSync(join(ROOT, 'docs/MOMENTS.md'), 'utf8') : '';
  check(doc.length > 2000, 'docs/MOMENTS.md documents the Moment format');
  const m = moments['demo-saturn'] || {};
  const fields = new Set(Object.keys(m));
  for (const v of m.vehicles || []) for (const k of Object.keys(v)) fields.add(k);
  for (const list of Object.values(m.tracks || {})) for (const e of list) for (const k of Object.keys(e)) fields.add(k);
  for (const tr of Object.values(m.trajectories || {})) for (const k of Object.keys(tr)) fields.add(k);
  for (const k of fields) check(doc.includes(`\`${k}\``), `docs/MOMENTS.md names the field \`${k}\``);
  for (const a of F.ACTIONS) check(doc.includes(`\`${a}\``), `docs/MOMENTS.md describes the part action \`${a}\``);
  for (const s of F.SHOTS) check(doc.includes(`\`${s}\``), `docs/MOMENTS.md describes the shot \`${s}\``);
}

if (problems.length) {
  for (const p of problems) console.log(`::error::${p}`);
  process.exit(1);
}
console.log(`moments ok: ${files.length} moment file(s) valid, the clock, the paths, the director, the engines and the canopies hold, nothing of it at boot`);
