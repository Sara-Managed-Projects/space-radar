// tests/test_ephemerides.mjs -- a craft's own path, read in the browser (internal #277, #406).
//
//   1. THE BOUND ON THE CARD HOLDS. For every craft, the browser's reader (propagate/ephemeris.js)
//      is asked for each held-out time of tests/fixtures/eph_heldout.json: positions JPL Horizons
//      gave at times the file was NOT built from, a third of them within hours of a close pass.
//      The worst miss must be within `goodToKm`, the figure the card prints.
//   2. THE READER: a sample's own time gives the sample, a segment boundary is continuous to the
//      map's eye, outside the span it answers null, a damaged file is refused.
//   3. PROPAGATE: nothing changes until a file is here; then the file answers inside its span, in
//      the frame of the world it is kept round, `inferred`, and the record answers outside it.
//   4. WHAT THE FILES SAY, against the figures NASA gives for the same moments.
//   5. THE EVENTS: which may move the clock, the stage a moment is seen from, the framing, the words.
//   6. NOT AT BOOT: no static import reaches the reader, its index or the line.
//
//   node tests/test_ephemerides.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
globalThis.location = { hash: '', pathname: '/', search: '' };
globalThis.history = { replaceState() {} };
const E = await import(join(JS, 'propagate/ephemeris.js'));
const { propagate, EPHEMERIS_OF } = await import(join(JS, 'propagate/index.js'));
const { sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { worldRadiusKm } = await import(join(JS, 'propagate/frames.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const read = (file) => {
  const b = readFileSync(join(ROOT, 'site/data/eph', file));
  return Promise.resolve(b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength));
};
const at = (iso) => Date.parse(iso);
const norm = (p) => Math.hypot(p.x, p.y, p.z);

const deep = sampleDeepSpace();
const rec = (id) => deep.find((r) => r.id === id);
const ids = Object.keys(E.EPHEMERIDES);
check(ids.length >= 10, `at least ten craft have a path file (${ids.length})`);

// --- 3a. before any file is here ------------------------------------------------------------------
check(EPHEMERIS_OF.size === 0, 'no file answers for any record until one is fetched');
const v1 = rec('deep-voyager-1');
const jupiter1979 = at('1979-03-05T12:05:00Z');
check(propagate(v1, jupiter1979) === null, 'Voyager 1 in 1979, without its file: the stand-in does not answer (today\'s behaviour)');
const before = propagate(v1, at('2026-10-06T00:00:00Z'));
check(before && before.cls === 'sample' && !before.eph, 'and today it is the bundled stand-in, classed sample');
check(E.covers('deep-voyager-1', jupiter1979) && !E.covers('deep-voyager-1', at('1970-01-01T00:00:00Z')) && !E.covers('nobody', jupiter1979), 'the index alone says whether a file spans a date');
check(E.loaded('deep-voyager-1') === null, 'and that the file is not here yet');
check(await E.ensure('nobody', { read }) === null, 'a record with no file resolves to nothing');
{
  const warn = console.warn; console.warn = () => {};
  check(await E.ensure('deep-voyager-2', { read: () => Promise.reject(new Error('offline')) }) === null && EPHEMERIS_OF.size === 0, 'a file that does not load leaves the record as it was');
  check(await E.ensure('deep-voyager-2', { read: () => read('deep-voyager-1.bin') }) === null, 'a file of the wrong length is not read as this craft\'s');
  console.warn = warn;
}

// --- 1. the bound ---------------------------------------------------------------------------------
const held = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/eph_heldout.json'), 'utf8'));
const manifest = JSON.parse(readFileSync(join(ROOT, 'site/data/eph/manifest.json'), 'utf8'));
const rows = [];
let total = 0;
for (const id of ids) {
  const row = E.EPHEMERIDES[id];
  const eph = await E.ensure(id, { read });
  check(!!eph, `${id}: its file reads`);
  if (!eph) continue;
  total += row.bytes;
  check(eph.fromMs === at(row.from) && eph.toMs === at(row.to), `${id}: the file spans what the index says (${row.from} to ${row.to})`);
  const pts = held[id] || [];
  check(pts.length >= 40, `${id}: at least forty held-out Horizons positions (${pts.length})`);
  let worst = 0;
  let near = 0;
  for (const [tS, centre, x, y, z] of pts) {
    const st = E.stateAt(eph, tS * 1000);
    if (!st || st.centre !== centre) { check(false, `${id}: a held-out time is outside the file or round another centre`); continue; }
    worst = Math.max(worst, Math.hypot(st.x - x, st.y - y, st.z - z));
    if (centre !== 'sun') near += 1;
  }
  check(worst <= row.goodToKm, `${id}: the card says good to ${row.goodToKm} km and the file misses a Horizons position by ${worst.toFixed(1)} km`);
  const m = manifest.craft.find((c) => c.id === id);
  check(m && Math.abs(m.heldout.max_km - worst) < 0.01, `${id}: the browser's reader and the build script measure the same worst miss (${worst.toFixed(3)} against ${m && m.heldout.max_km})`);
  check(typeof row.solution === 'string' && row.solution.length > 3 && /^\d{4}-\d\d-\d\d$/.test(row.retrieved) && /^-?\d+;?$/.test(row.horizonsId), `${id}: the index names the Horizons id, the solution and the day retrieved`);
  if (m && m.segments.some((s) => s.centre !== 'sun')) check(near >= 8, `${id}: held-out positions inside its windows (${near})`);
  rows.push(`${row.name} ${row.bytes} B, ${worst.toFixed(1)} of ${row.goodToKm} km`);
}
check(total <= 2e6, `the files are ${total} bytes in all, over 2 MB`);

// --- 2. the reader --------------------------------------------------------------------------------
{
  const eph = E.loaded('deep-voyager-1');
  const seg = eph.segments[2];
  const st = E.stateAt(eph, seg.t[5] * 1000);
  check(st.x === seg.p[15] && st.y === seg.p[16] && st.z === seg.p[17] && Math.abs(st.vx - seg.v[15]) < 1e-9, 'at a sample\'s own time the answer is the sample, and its velocity');
  // the velocity is the slope of the positions
  const t = (seg.t[5] + seg.t[6]) * 500;
  const a = E.stateAt(eph, t - 500);
  const b = E.stateAt(eph, t + 500);
  const mid = E.stateAt(eph, t);
  check(Math.abs((b.x - a.x) - mid.vx) < 1e-3 && Math.abs((b.y - a.y) - mid.vy) < 1e-3, 'between samples the velocity is the slope of the curve');
  check(E.stateAt(eph, eph.fromMs - 1) === null && E.stateAt(eph, eph.toMs + 1) === null && E.stateAt(eph, NaN) === null, 'outside the file, or with no time, it answers null');
  check(E.stateAt(eph, eph.fromMs).centre === 'earth' && E.stateAt(eph, eph.toMs).centre === 'sun', 'the first and last instants are inside');
  const edge = eph.segments[1].t[0] * 1000;
  check(E.stateAt(eph, edge).centre === eph.segments[1].centre && E.stateAt(eph, edge - 1).centre === eph.segments[0].centre, 'at a boundary the later segment answers');
  const bytes = readFileSync(join(ROOT, 'site/data/eph/deep-voyager-1.bin'));
  const buf = (b2) => b2.buffer.slice(b2.byteOffset, b2.byteOffset + b2.byteLength);
  const bad = Buffer.from(bytes); bad[0] = 0x58;
  const refuses = (b2) => { try { E.decode(buf(b2)); return false; } catch { return true; } };
  check(refuses(bad) && refuses(bytes.subarray(0, bytes.length - 4)) && refuses(Buffer.concat([bytes, Buffer.from([0])])), 'a file with another magic, or shorter or longer than its header says, is refused');
  const path = E.pathOf(eph);
  check(path.t.length === eph.segments.reduce((n, s) => n + s.t.length, 0) && path.xyz.length === path.t.length * 3, 'the line has every kept sample');
  let ordered = true;
  for (let i = 1; i < path.t.length; i++) if (path.t[i] < path.t[i - 1]) ordered = false;
  check(ordered, 'in order of time');
  // a sample round Jupiter, moved by the drawn Jupiter, is about Jupiter's distance from the Sun
  const k = eph.segments[0].t.length + eph.segments[1].t.length + 5;
  const rAu = Math.hypot(path.xyz[k * 3], path.xyz[k * 3 + 1], path.xyz[k * 3 + 2]) / 149597870.7;
  check(rAu > 4.9 && rAu < 5.5, `a sample kept round Jupiter is drawn round the Sun where Jupiter was (${rAu.toFixed(2)} au)`);
}

// --- 3b. propagate, with the files here -----------------------------------------------------------
{
  const p = propagate(v1, jupiter1979);
  check(p && p.eph === true && p.frame === 'jupiter-inertial' && p.cls === 'inferred', `Voyager 1 at Jupiter is now drawn from its file, round Jupiter, inferred (${p && p.frame}, ${p && p.cls})`);
  const far = propagate(v1, at('2040-01-01T00:00:00Z'));
  check(far && !far.eph && far.cls === 'sample', 'beyond the file the stand-in answers, as before');
  const juno = rec('deep-juno');
  const now = propagate(juno, at('2026-10-06T00:00:00Z'));
  check(now && !now.eph && now.frame === 'jupiter-inertial', 'Juno after its file ends (24 August 2026) is the map\'s own stand-in');
  const then = propagate(juno, at('2016-07-05T03:53:00Z'));
  check(then && then.eph && then.frame === 'jupiter-inertial', 'and on its arrival day it is the file\'s');
  // round the Earth the answer is in the Earth's own inertial frame (TEME), the same length
  const jwst = rec('deep-jwst');
  const l2 = at('2022-07-12T12:00:00Z');
  const pj = propagate(jwst, l2);
  const sj = E.stateAt(E.loaded('deep-jwst'), l2);
  // round the Earth the answer goes out round the Sun, moved by the Earth this map draws, so the
  // stage's own subtraction of that Earth gives back JPL's offset to within metres
  const { worldHelioEclKm, toStage } = await import(join(JS, 'propagate/frames.js'));
  const earth = worldHelioEclKm('earth', l2);
  const back = { x: pj.x - earth.x, y: pj.y - earth.y, z: pj.z - earth.z };
  check(pj && pj.frame === 'sun-inertial' && pj.centre === 'earth' && Math.hypot(back.x - sj.x, back.y - sj.y, back.z - sj.z) < 0.01, 'a position kept round the Earth is given round the Sun, and comes back to within ten metres');
  const onStage = toStage(jwst, pj, { worldId: 'earth' }, l2);
  check(onStage && Math.abs(norm(onStage) - norm(sj)) < 0.01, 'on the Earth\'s stage it is as far from the Earth as JPL has it');
  check(norm(sj) > 1.2e6 && norm(sj) < 1.8e6, `Webb at L2 is about 1.5 million km from Earth (${Math.round(norm(sj))} km)`);
  // an ended mission: nothing today, the file inside its years
  const cassini = rec('deep-cassini');
  check(cassini && propagate(cassini, at('2026-10-06T00:00:00Z')) === null, 'Cassini is nowhere today, and nothing is drawn');
  const soi = propagate(cassini, at('2004-07-01T03:00:00Z'));
  check(soi && soi.eph && soi.frame === 'saturn-inertial' && norm(soi) < 200000, `on 1 July 2004 it is at Saturn (${soi && Math.round(norm(soi))} km from its centre)`);
  // Mars 2020's cruise is a craft of its own; the Jezero site stays a place on Mars
  const { SITES } = await import(join(JS, 'data/sites.js'));
  check(SITES.some((s) => s.id === 'jezero') && !E.indexOf('jezero'), 'the Jezero site has no path file: it is a place');
  const m2020 = rec('deep-mars-2020');
  const cruise = propagate(m2020, at('2020-10-01T00:00:00Z'));
  check(cruise && cruise.eph && cruise.frame === 'sun-inertial' && propagate(m2020, at('2021-03-01T00:00:00Z')) === null, 'in October 2020 Mars 2020 is between the planets; after the landing nothing is drawn');
  const arr = propagate(m2020, at('2021-02-18T20:00:00Z'));
  check(arr && arr.frame === 'mars-inertial' && norm(arr) < 20000, `half an hour before entry it is ${arr && Math.round(norm(arr))} km from the centre of Mars`);
}

// --- 4. against NASA's figures ---------------------------------------------------------------------
const closest = (id, fromIso, hours, stepS = 20) => {
  const eph = E.loaded(id);
  let best = { km: Infinity };
  for (let k = 0; k <= hours * 3600; k += stepS) {
    const st = E.stateAt(eph, at(fromIso) + k * 1000);
    if (st && norm(st) < best.km) best = { km: norm(st), centre: st.centre, tMs: at(fromIso) + k * 1000 };
  }
  return best;
};
{
  const j = closest('deep-voyager-1', '1979-03-05T00:00:00Z', 24);
  check(j.centre === 'jupiter' && Math.abs(j.km - worldRadiusKm('jupiter') - 280000) < 10000 && Math.abs(j.tMs - jupiter1979) < 30 * 60e3,
    `Voyager 1 passes ${Math.round(j.km - worldRadiusKm('jupiter'))} km over Jupiter at ${new Date(j.tMs).toISOString()} (NASA: 280 000 km, 12:05)`);
  const n = closest('deep-voyager-2', '1989-08-25T00:00:00Z', 24);
  check(n.centre === 'neptune' && Math.abs(n.km - worldRadiusKm('neptune') - 4800) < 600 && Math.abs(n.tMs - at('1989-08-25T03:56:00Z')) < 30 * 60e3,
    `Voyager 2 passes ${Math.round(n.km - worldRadiusKm('neptune'))} km over Neptune at ${new Date(n.tMs).toISOString()} (NASA: 4 800 km, 03:56)`);
  const u = closest('deep-voyager-2', '1986-01-24T00:00:00Z', 24);
  check(u.centre === 'uranus' && Math.abs(u.km - worldRadiusKm('uranus') - 81500) < 3000, `Voyager 2 passes ${Math.round(u.km - worldRadiusKm('uranus'))} km over Uranus (NASA: 81 500 km)`);
  const pl = closest('deep-new-horizons', '2015-07-14T00:00:00Z', 24);
  check(pl.centre === 'pluto' && Math.abs(pl.km - worldRadiusKm('pluto') - 12500) < 600, `New Horizons passes ${Math.round(pl.km - worldRadiusKm('pluto'))} km over Pluto (NASA: 12 500 km)`);
  const ap = closest('asteroid-99942', '2029-04-13T00:00:00Z', 24);
  check(ap.centre === 'earth' && ap.km - 6378 > 30500 && ap.km - 6378 < 33000 && new Date(ap.tMs).toISOString().startsWith('2029-04-13T21:4'),
    `Apophis passes ${Math.round(ap.km - 6378)} km over the ground at ${new Date(ap.tMs).toISOString()} (NASA: about 32 000 km, 13 April 2029)`);
  rows.push(`Apophis ${Math.round(ap.km - 6378)} km up at ${new Date(ap.tMs).toISOString().slice(11, 16)} UTC on 13 April 2029`);
}

// --- 5. the events ---------------------------------------------------------------------------------
const M = await import(join(JS, 'ui/missions.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
{
  let moving = 0;
  let pathEvents = 0;
  for (const m of M.MISSIONS) {
    for (const e of m.events) {
      const record = { id: M.subjectId(m, e) };
      const where = `${m.id}.${e.id}`;
      const place = M.placement(e, record, M.eventMs(e));
      if (place.moves) moving += 1;
      if (e.place !== 'path') { check(e.path_at === undefined, `${where}: path_at without a path`); continue; }
      pathEvents += 1;
      check(place.kind === 'path' && place.moves, `${where}: says the map holds the craft's path and the file does not span ${e.path_at || e.date}`);
      const clock = M.eventClockMs(e);
      const eph = E.loaded(record.id);
      const st = eph ? E.stateAt(eph, clock) : null;
      check(!!st, `${where}: the file answers at the moment the clock is set to`);
      // where the event happened is where the file has the craft: round that world, or the Sun
      if (st && e.world) check(st.centre === e.world || (e.world === 'titan' && st.centre === 'saturn'), `${where}: happened at ${e.world} and the file has the craft round ${st.centre}`);
      if (e.path_at) {
        const late = clock - M.eventMs(e);
        check(e.precision === 'day' ? new Date(clock).toISOString().slice(0, 10) === e.date : late >= 0 && late <= 3 * 3600e3, `${where}: path_at is a moment of the event's own day, or within three hours after it`);
      }
    }
  }
  check(pathEvents >= 30, `at least thirty events are drawn from a path file (${pathEvents})`);
  rows.push(`${moving} events move the clock, ${pathEvents} of them on a path file`);
  const jup = M.findEvent('voyager-1.jupiter').event;
  check(M.placement(jup, { id: 'deep-voyager-1' }, M.eventMs(jup)).kind === 'path', 'Voyager 1 at Jupiter moves the clock');
  check(M.placement(jup, { id: 'deep-nobody' }, M.eventMs(jup)).moves === false, 'the same event on a record with no file does not');
  check(M.placement({ ...jup, date: '1969-03-05T12:05:00Z' }, { id: 'deep-voyager-1' }, 0).moves === false, 'nor a date before the file begins');
  const launch = M.findEvent('voyager-1.launch').event;
  check(launch.path_at && M.eventClockMs(launch) > M.eventMs(launch) && M.eventClockMs(jup) === M.eventMs(jup), 'a launch sets the clock to where JPL\'s track begins; a flyby to its own minute');
  const v1m = M.MISSIONS.find((m) => m.id === 'voyager-1');
  const note = M.eventNote(v1m, launch, { kind: 'path', moves: true });
  check(/JPL/.test(note) && /minutes after/.test(note) && /10 km/.test(note), `the launch's note says the track begins later, and how good it is (${note})`);
  check(/JPL Horizons/.test(M.eventNote(v1m, jup, { kind: 'path', moves: true })) && /10 km/.test(M.eventNote(v1m, jup, { kind: 'path', moves: true })), 'a flyby\'s note names JPL Horizons and the bound');
  // the stage
  check(M.stageForPath('jupiter', 'earth') === 'jupiter' && M.stageForPath('earth', 'jupiter') === 'earth', 'a moment round a world is seen from that world\'s stage');
  check(M.stageForPath('sun', 'earth') === 'earth' && M.stageForPath('sun', 'sun') === 'sun' && M.stageForPath('sun', 'saturn') === 'sun', 'a moment between the planets keeps the Earth\'s or the Sun\'s stage, and leaves another world\'s');
  // the framing: the world's disc stays in the picture behind the craft
  for (const [d, R] of [[349000, 69911], [29000, 24622], [10e6, 69911], [1.2e5, 1188]]) {
    const D = M.withWorldDistance(d, R);
    const halfAngle = Math.asin(Math.min(1, R / (D + d)));
    check(D >= 0.6 * d - 1e-9 && halfAngle < 0.26, `framing ${d} km from a world of ${R} km: the camera ${Math.round(D)} km behind, the disc ${(halfAngle * 57.3).toFixed(1)} degrees in radius`);
  }
  check(Number.isNaN(M.withWorldDistance(0, 1)) && Number.isNaN(M.withWorldDistance(1, NaN)), 'no distance, no framing');
  // the words on the card
  const w = M.pathWords('deep-voyager-1', jupiter1979);
  check(w && w.length === 2 && /within about 10 km of JPL/.test(w[0]) && /rough accuracy/.test(w[1]), `in 1979 the card says how closely the file follows JPL, and what JPL says of that track (${w && w.join(' | ')})`);
  const w2 = M.pathWords('deep-voyager-1', at('2012-08-25T12:00:00Z'));
  check(w2 && w2.length === 1, 'after 1981 only the first sentence');
  check(M.pathWords('deep-voyager-1', at('2040-01-01T00:00:00Z')) === null && M.pathWords('nobody', jupiter1979) === null, 'outside the file, or with no file, the card says nothing of it');
  const wa = M.pathWords('asteroid-99942', at('2029-04-13T21:46:00Z'));
  check(wa && /prediction/.test(wa[1]), 'Apophis in 2029 is said to be a prediction');
  check(COPY.ephemeris && !/!| -- |→/.test(Object.values(COPY.ephemeris).join(' ')), 'the words are plain');
}
{
  const { countUpTo } = await import(join(JS, 'scene/ephpath.js')).catch(() => ({}));
  if (countUpTo) check(countUpTo([1, 2, 3, 5], 0) === 0 && countUpTo([1, 2, 3, 5], 3) === 3 && countUpTo([1, 2, 3, 5], 9) === 4, 'the line ends at the clock');
}

// --- 6. not at boot --------------------------------------------------------------------------------
{
  const STATIC = /(?:\bimport|\bexport)\s*(?:[^'";()]*?\bfrom\s*)?['"](\.{1,2}\/[^'"]+)['"]/g;
  const seen = new Set();
  const todo = [join(JS, 'main.js')];
  while (todo.length) {
    const path = todo.pop();
    if (seen.has(path)) continue;
    let text;
    try { text = readFileSync(path, 'utf8'); } catch { continue; }
    seen.add(path);
    for (const m of text.matchAll(STATIC)) todo.push(join(dirname(path), m[1]));
  }
  for (const f of ['propagate/ephemeris.js', 'data/ephemerides.js', 'scene/ephpath.js', 'ui/missions.js']) check(!seen.has(join(JS, f)), `${f} is in the boot graph: a first visit would fetch it`);
  for (const path of seen) check(!/data\/eph\//.test(readFileSync(path, 'utf8').split('\n').filter((l) => !/^\s*(\/\/|\*|\/\*)/.test(l)).join('\n')), `${path} names a path file at boot`);
  const diet = readFileSync(join(ROOT, 'tests/test_boot_diet.mjs'), 'utf8');
  check(/js\/propagate\/ephemeris\.js/.test(diet) && /js\/data\/ephemerides\.js/.test(diet), 'tests/test_boot_diet.mjs holds the reader and its index out of the boot graph too');
}

if (problems.length) { console.error('ephemerides FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`ephemerides ok: ${ids.length} craft, ${total} bytes; every held-out Horizons position within the bound on the card. ${rows.join('; ')}`);
