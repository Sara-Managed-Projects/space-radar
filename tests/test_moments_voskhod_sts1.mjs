#!/usr/bin/env node
// tests/test_moments_voskhod_sts1.mjs -- the Moments of release 1.7.1 (internal #1058): Voskhod 2 and STS-1, and the three fixes from the 1.7.0 review.
// For each story: its event order and times against the published ones (UTC, from the moment's own epoch), every part event naming a node of the model
// file it is for, the paths' rows sorted, finite and at believable speeds, the orbit's elements, the landing where the sources put it, what is
// drawn and not measured said so, the audio said to be none (and why), the shelf and the cards. And: the night pad's lamp, the marker's floor, the
// tilt of an attitude, the Apollo 13 and Sputnik 1 words in four languages.
//   node tests/test_moments_voskhod_sts1.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const mod = (p) => import(pathToFileURL(join(ROOT, 'site/js', p)).href);
const F = await mod('moments/format.js');
const TR = await mod('moments/trajectory.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');
const src = (p) => readFileSync(join(ROOT, p), 'utf8');
const registry = src('registry/models.yaml');
const rowOf = (id) => registry.split('\n').find((l) => l.startsWith(`  - {id: ${id},`)) || '';
const partsOf = (id) => { const m = /parts: \[([^\]]*)\]/.exec(rowOf(id)); return (m ? m[1] : '').split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean); };
const nodesOf = (id) => { const b = readFileSync(join(ROOT, `site/models/${id}.glb`)); return JSON.parse(b.slice(20, 20 + b.readUInt32LE(12)).toString('utf8')).nodes.map((n) => n.name); };
const load = async (id) => {
  const m = JSON.parse(src(`site/data/moments/${id}.json`));
  if (m.wordsFile) await mod(`copy/${m.wordsFile}`);
  return { m, words: COPY.momentStories[m.words || m.id] };
};
const clock = (m, iso) => (Date.parse(iso) - Date.parse(m.epoch)) / 1000;
const first = (m, part, action, vehicle) => (m.tracks.parts.find((e) => e.part === part && e.action === action && (!vehicle || e.vehicle === vehicle)) || {}).t;
const rowsOf = (m, name) => JSON.parse(src(`site/data/moments/${m.trajectories[name].file}`)).rows;
const rowAt = (rows, t) => { let i = rows.findIndex((r) => r[0] >= t); if (i < 1) i = 1; const a = rows[i - 1], b = rows[i], u = (t - a[0]) / (b[0] - a[0]); return [1, 2, 3, 4, 5, 6].map((k) => a[k] + (b[k] - a[k]) * u); };
const rowNear = (rows, t) => { let b = rows[0]; for (const r of rows) if (Math.abs(r[0] - t) < Math.abs(b[0] - t)) b = r; return b.slice(1); };   // the rows are arcs apart: elements are read at a row, not between two
const MUm = 398600.4418;
const altKm = (s) => { const r = Math.hypot(...s.slice(0, 3)), z = s[2] / r; return r - 6378.137 * (1 - z * z / 298.257); };
const elements = (s) => {
  const r = s.slice(0, 3), v = s.slice(3, 6), rn = Math.hypot(...r), vn = Math.hypot(...v), a = 1 / (2 / rn - vn * vn / MUm);
  const h = [r[1] * v[2] - r[2] * v[1], r[2] * v[0] - r[0] * v[2], r[0] * v[1] - r[1] * v[0]], hn = Math.hypot(...h), e = Math.sqrt(Math.max(0, 1 - hn * hn / (MUm * a)));
  return { per: a * (1 - e) - 6378.137, apo: a * (1 + e) - 6378.137, incl: Math.acos(h[2] / hn) * 180 / Math.PI, period: 2 * Math.PI * Math.sqrt(a ** 3 / MUm) / 60 };
};
// the ground point under an inertial state at mission second t
const ground = (m, s, t) => {
  const g = TR.siderealAt(Date.parse(m.epoch), t), r = s.slice(0, 3), th = Math.atan2(r[1], r[0]) - g;
  return { lat: Math.atan(Math.tan(Math.asin(r[2] / Math.hypot(...r))) / 0.99330562) * 180 / Math.PI, lon: ((((th * 180 / Math.PI) % 360) + 540) % 360) - 180 };
};
const km = (a, b) => { const R = Math.PI / 180; return 6371.0088 * Math.acos(Math.min(1, Math.sin(a.lat * R) * Math.sin(b.lat * R) + Math.cos(a.lat * R) * Math.cos(b.lat * R) * Math.cos((b.lon - a.lon) * R))); };

const common = async (id, cover, models) => {
  const { m, words } = await load(id);
  check(!!words && F.validateMoment(m, { words }).length === 0, `${id}: valid, with its words (${words ? F.validateMoment(m, { words }).join('; ') : 'no words'})`);
  const byVehicle = new Map(m.vehicles.map((v) => [v.id, v]));
  for (const e of m.tracks.parts) {
    const v = byVehicle.get(e.vehicle);
    check(!!v, `${id}: the event at ${e.t} names a vehicle`);
    if (!v) continue;
    check(nodesOf(v.model).includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} at ${e.t} is a node of ${v.model}.glb`);
    check(!v.parts || v.parts.includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} is in vehicle ${v.id}'s own parts list`);
    if (v.window && e.action !== 'hide' && e.action !== 'show') check(e.t >= v.window[0] - 1e-6 && e.t <= v.window[1] + 1e-6, `${id}: ${v.id} ${e.part} ${e.action} at ${e.t} is inside its window ${v.window}`);
  }
  for (const v of m.vehicles) {
    const names = nodesOf(v.model);
    check((v.parts || []).every((p) => names.includes(p)), `${id}: every part of ${v.id} is a node of ${v.model}.glb`);
    // a model with named parts: every top-level node is listed, or it would be drawn with the rest all the time
    const top = partsOf(v.model);
    check(top.every((p) => (v.parts || []).includes(p)) || v.id.endsWith('-up') === false, `${id}: ${v.id} lists the parts of its model`);
    for (const [p, list] of Object.entries(v.engines || {})) check(list.length >= 1 && list.every((q) => q.every(Number.isFinite)), `${id}: ${v.id} engines on ${p}`);
  }
  for (const v of m.vehicles) for (const p of new Set(m.tracks.parts.filter((e) => e.vehicle === v.id).map((e) => e.part))) {
    const list = m.tracks.parts.filter((e) => e.vehicle === v.id && e.part === p);
    const ig = list.find((e) => e.action === 'ignite'), co = list.find((e) => e.action === 'cutoff'), se = list.find((e) => e.action === 'separate');
    if (ig && co) check(co.t > ig.t, `${id}: ${v.id} ${p} cuts off after it ignites`);
    if (co && se) check(se.t >= co.t, `${id}: ${v.id} ${p} separates after it cuts off`);
  }
  for (const name of Object.keys(m.trajectories)) {
    const tr = m.trajectories[name];
    if (tr.kind !== 'vectors') continue;
    const rows = rowsOf(m, name);
    check(rows.length > 200 && rows.every((r, i) => r.length === 7 && r.every(Number.isFinite) && (i === 0 || r[0] > rows[i - 1][0])), `${id}: path ${name} has sorted, finite rows`);
    check(rows.every((r) => Math.hypot(r[4], r[5], r[6]) < 8.6), `${id}: path ${name} never faster than 8.6 km/s`);
    check(rows.every((r) => Math.hypot(r[1], r[2], r[3]) > 6350), `${id}: path ${name} never under the Earth's surface`);
    const c = cover[name] || [0, 0];
    check(rows[0][0] <= c[0] && rows[rows.length - 1][0] >= c[1], `${id}: path ${name} covers its part of the span (${rows[0][0]} to ${rows[rows.length - 1][0]})`);
    // no hole: the largest gap between rows
    let gap = 0; for (let i = 1; i < rows.length; i += 1) gap = Math.max(gap, rows[i][0] - rows[i - 1][0]);
    check(gap <= 160, `${id}: path ${name} has no gap over 160 s (${gap})`);
  }
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 300 && play < 1000, `${id}: ${Math.round(play)} s of play time`);
  check(m.pace[0].from === m.span[0] && m.pace[m.pace.length - 1].to === m.span[1] && m.pace.every((q, i) => i === 0 || q.from === m.pace[i - 1].to), `${id}: the pace is contiguous over the span`);
  check(m.sources.length >= 2 && m.sources.every((s) => /^https:\/\//.test(s.url)), `${id}: sources`);
  check(m.sources.every((s) => (words[s.say] || '').length > 10), `${id}: every source has its words`);
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 360 && c.t >= m.span[0] && c.t <= m.span[1]), `${id}: every caption is a sentence or two, inside the span`);
  check(m.tracks.captions.every((c, i) => i === 0 || c.t >= m.tracks.captions[i - 1].t), `${id}: captions in time order`);
  check(Object.values(m.trajectories).every((t) => t.truth === 'reconstructed' || t.truth === 'illustrative'), `${id}: no path claims to be measured`);
  check(m.chapters.every((c) => !!words[c.say]), `${id}: every chapter has its words`);
  check(m.tracks.audio.length === 0 && typeof m.audio_note === 'string' && m.audio_note.length > 60, `${id}: no recording plays, and the file says what was looked for`);
  for (const id2 of models) check(existsSync(join(ROOT, `site/models/${id2}.glb`)) && !!rowOf(id2), `${id}: model ${id2} has its file and its registry row`);
  return { m, words };
};

// --- Voskhod 2 -------------------------------------------------------------------------------------------------------------------
{
  const { m, words } = await common('voskhod-2', { orbit: [545, 93700] }, ['r7-8k72k', 'voskhod-3kd', 'leonov-eva']);
  const t = (p, a, v) => first(m, p, a, v);
  const c = (iso) => clock(m, iso);
  check(m.epoch === '1965-03-18T07:00:00Z', 'Voskhod 2: T-0 is 07:00:00 UTC on 18 March 1965');
  check(t('booster-b', 'cutoff') === 119 && t('fairing', 'separate') === 150 && t('core-stage', 'cutoff') === 301, 'Voskhod 2: strap-ons 119 s, shroud 150 s, core 301 s');
  const eva = m.vehicles.find((v) => v.id === 'leonov'), back = m.vehicles.find((v) => v.id === 'leonov-in');
  check(eva.window[0] === c('1965-03-18T08:34:51Z'), 'Voskhod 2: Leonov leaves the airlock at 08:34:51 UTC');
  check(back.window[1] === c('1965-03-18T08:47:00Z') && back.window[1] > eva.window[1], 'Voskhod 2: he is back in at 08:47:00 UTC, head first, after the pose at the tether\'s end');
  check(back.window[1] - eva.window[0] === 729, 'Voskhod 2: 12 minutes 9 seconds outside');
  check(t('umbilical', 'show', 'ship') === c('1965-03-18T08:32:54Z'), 'Voskhod 2: the umbilical appears with the hatch at 08:32:54');
  check(t('volga', 'show', 'ship') < t('umbilical', 'show', 'ship') && t('volga-stowed', 'hide', 'ship') === t('volga', 'show', 'ship'), 'Voskhod 2: the airlock is out before the hatch opens, in the place of the folded one');
  check(t('volga', 'separate', 'ship') > c('1965-03-18T08:51:54Z'), 'Voskhod 2: the airlock is let go after the repressurisation at 08:51:54');
  check(t('vk-im', 'ignite', 'ship') < t('vk-im', 'cutoff', 'ship') && t('vk-im', 'cutoff', 'ship') - t('vk-im', 'ignite', 'ship') > 30 && t('vk-im', 'separate', 'ship') > t('vk-im', 'cutoff', 'ship'), 'Voskhod 2: the retro burn of tens of seconds, then the instrument module goes');
  const cap = Object.fromEntries(m.tracks.captions.map((x) => [x.say, x.t]));
  check(cap.manual === c('1965-03-19T07:16:00Z') && cap.auto < cap.manual && cap.manual < t('vk-im', 'ignite', 'ship'), 'Voskhod 2: the automatic burn that did not happen comes first, the manual call is at 07:16 UT, the burn after it');
  check(Math.abs(m.span[1] - 40 - c('1965-03-19T09:02:17Z')) < 1, 'Voskhod 2: the story ends 40 s after the landing at 09:02:17 UT');
  // the orbit at the insertion: 167 by 475 km, 64.8 degrees, 90.9 minutes
  const rows = rowsOf(m, 'orbit'), e = elements(rows[0].slice(1));
  check(Math.abs(e.apo - 475) < 12 && e.per > 150 && e.per < 185, `Voskhod 2: the orbit is ${e.per.toFixed(0)} by ${e.apo.toFixed(0)} km (167 by 475)`);
  check(Math.abs(e.incl - 64.8) < 0.7 && Math.abs(e.period - 90.9) < 0.8, `Voskhod 2: ${e.incl.toFixed(2)} degrees and ${e.period.toFixed(1)} minutes (64.8 and 90.9)`);
  // the landing: at the published place, on the ground, at rest
  const T_LAND = c('1965-03-19T09:02:17Z'), last = rowAt(rows, T_LAND), g = ground(m, last, T_LAND);
  check(km(g, { lat: 59.5667, lon: 55.4667 }) < 3, `Voskhod 2: the landing is ${km(g, { lat: 59.5667, lon: 55.4667 }).toFixed(1)} km from 59.57 N 55.47 E`);
  check(Math.abs(altKm(last)) < 3, `Voskhod 2: it ends on the ground (${altKm(last).toFixed(1)} km)`);
  // the retrofire: a burn of about 150 m/s or less, a long coast home and the entry through 100 km
  const T_R = t('vk-im', 'ignite', 'ship'), T_E = t('vk-im', 'cutoff', 'ship');
  check(T_LAND - T_R > 1500 && T_LAND - T_R < 3600, `Voskhod 2: the manual retrofire is ${((T_LAND - T_R) / 60).toFixed(0)} minutes before the landing`);
  const alt = (t2) => altKm(rowAt(rows, t2));
  check(alt(T_LAND - 1000) < 125 && alt(T_LAND - 1000) > 90 && alt(T_LAND - 500) < 30, 'Voskhod 2: 100 km up 1000 s before the landing and low 500 s before it');
  // the honesty: what is ours is said where it is shown
  check(/ours/.test(words.volga) && /ours/.test(words.retro) && /ours/.test(words.auto) && /read off a frame/.test(words.tether) && /46 seconds/.test(words.late) && /386 km/.test(words.entry), 'Voskhod 2: what is ours, and the 46 seconds and 386 km, are said in the captions');
  check(/Vostok-K/.test(words.ready), 'Voskhod 2: the caption says the rocket drawn is the Vostok-K\'s');
  check(/Perm/.test(m.places[0].place.name) && m.places[0].from < T_LAND - 900, 'Voskhod 2: the ground at the end is the taiga near Perm');
  // the models
  const sh = partsOf('voskhod-3kd');
  check(['vk-im', 'vk-sphere', 'vk-hatch', 'vk-antennas', 'vk-retro', 'volga-stowed', 'volga', 'umbilical'].every((p) => sh.includes(p)), 'Voskhod 2: the spacecraft model has the airlock folded and out, the umbilical and the spare retro rocket as parts');
  check(['leonov-suit', 'leonov-pack'].every((p) => partsOf('leonov-eva').includes(p)), 'Voskhod 2: Leonov has his suit and his backpack');
  for (const v of m.vehicles.filter((x) => x.model === 'voskhod-3kd' || x.model === 'leonov-eva')) check(v.keepXZ === true, `Voskhod 2: ${v.id} keeps the file's own axis (the airlock is to one side)`);
  check(m.vehicles.filter((v) => v.rideOn && v.rideOn.vehicle === 'ship').every((v) => Array.isArray(v.rideOn.spin)), 'Voskhod 2: Leonov is turned along the airlock\'s axis');
}

// --- STS-1 -----------------------------------------------------------------------------------------------------------------------
{
  const { m, words } = await common('sts-1', { orbit: [534, 195700] }, ['shuttle-sts-stack', 'shuttle-orbiter']);
  const t = (p, a, v) => first(m, p, a, v);
  const T_LAND = 54 * 3600 + 20 * 60 + 53;
  check(m.epoch === '1981-04-12T12:00:04Z' && clock(m, '1981-04-14T18:20:57Z') === T_LAND, 'STS-1: T-0 is 12:00:04 UTC on 12 April 1981 and the field is reached at 18:20:57 UTC (54 h 20 m 53 s)');
  check(t('srb-l', 'separate', 'stack') === 132 && t('srb-r', 'separate', 'stack') === 132, 'STS-1: the boosters are let go at 2 min 12 s');
  check(t('orbiter-body', 'cutoff', 'columbia-up') === 514 && t('tank', 'separate', 'stack') === 514 + 18, 'STS-1: main engine cut-off at 8 min 34 s, the tank 18 s later');
  check(t('orbiter-body', 'throttle', 'columbia-up') < 56 && m.tracks.parts.some((e) => e.action === 'throttle' && e.level === 0.65 && e.t < 56) && m.tracks.parts.some((e) => e.action === 'throttle' && e.level === 1 && e.t > 56), 'STS-1: the main engines are at 65 percent through Max Q at 56 s');
  check(t('orbiter-body', 'ignite', 'columbia-up') === -6.6 && t('srb-l', 'ignite', 'stack') === 0, 'STS-1: the main engines at T-6.6 s, the boosters at T-0');
  check(t('gear-nose', 'show', 'columbia') > T_LAND - 30 && t('gear-nose', 'show', 'columbia') < T_LAND && t('gear-main-l', 'show', 'columbia') === t('gear-nose', 'show', 'columbia'), 'STS-1: the gear comes down seconds before the touchdown');
  const ev = (part, action) => m.tracks.parts.filter((e) => e.vehicle === 'columbia' && e.part === part && e.action === action).map((e) => e.t);
  check(ev('bay-door-l-open', 'show')[0] > 1000 && ev('bay-door-l-open', 'hide').pop() > ev('bay-door-l-open', 'show')[0] && ev('bay-door-l', 'show').pop() > ev('bay-door-l', 'hide').pop() && ev('bay-door-l', 'hide').pop() === ev('bay-door-l-open', 'show')[0], 'STS-1: the doors open in orbit, in the place of the shut ones, and are shut again for the way home');
  check(m.vehicles.find((v) => v.id === 'columbia-up').rideOn.vehicle === 'stack' && m.vehicles.find((v) => v.id === 'columbia-up').rideOn.at.length === 3, 'STS-1: Columbia rides the stack');
  // the orbits
  const rows = rowsOf(m, 'orbit');
  const e1 = elements(rowNear(rows, 3300)), e3 = elements(rowNear(rows, 30000)), e0 = elements(rowNear(rows, 5000));
  check(Math.abs((e1.per + e1.apo) / 2 - 247) < 40, `STS-1: after the second burn the orbit is ${e1.per.toFixed(0)} by ${e1.apo.toFixed(0)} km, about 247 (246 by 248; the drawn path is within a few tens of km of the circle: its node and clock are nudged to meet the field)`);
  check(Math.abs(e0.incl - 40.3) < 0.5, `STS-1: ${e0.incl.toFixed(2)} degrees (40.30)`);
  check(Math.abs((e3.per + e3.apo) / 2 - 274) < 40, `STS-1: after the third and fourth burns the orbit is ${e3.per.toFixed(0)} by ${e3.apo.toFixed(0)} km, about 274`);
  check(Math.abs(e3.period - 89.9) < 2.5, `STS-1: ${e3.period.toFixed(1)} minutes a lap (89.88)`);
  // the entry and the field: Edwards, to 3 km; at rest; interface about 8 110 km and 30 minutes before; speed there 7.8 km/s
  const last = rowAt(rows, T_LAND), g = ground(m, last, T_LAND);
  check(km(g, { lat: 34.9, lon: -117.883 }) < 3, `STS-1: touchdown is ${km(g, { lat: 34.9, lon: -117.883 }).toFixed(1)} km from Edwards`);
  const T_EI = m.places[0].from + 60;
  const gEI = ground(m, rowAt(rows, T_EI), T_EI), dEI = km(gEI, { lat: 34.9, lon: -117.883 });
  check(dEI > 7600 && dEI < 8700, `STS-1: the entry interface is ${dEI.toFixed(0)} km from the field (8 110)`);
  const hEI = altKm(rowAt(rows, T_EI));
  check(hEI > 105 && hEI < 135 && T_LAND - T_EI > 1650 && T_LAND - T_EI < 1950, `STS-1: ${hEI.toFixed(0)} km up and ${T_LAND - T_EI} s from touchdown at the interface (120 km, about 1 800 s)`);
  const vEI = Math.hypot(...rowAt(rows, T_EI).slice(3));
  check(vEI > 7.5 && vEI < 8.3, `STS-1: ${vEI.toFixed(2)} km/s at the interface (28 240 km/h is 7.84)`);
  // the deorbit burn: tens of m/s, over the southern Indian Ocean, an hour before
  const bT = t('x', 'x') || null;
  let best = { v: 0, t: 0 }; for (let tt = T_LAND - 4500; tt < T_LAND - 2000; tt += 20) { const a = Math.hypot(...rowAt(rows, tt).slice(3)), b = Math.hypot(...rowAt(rows, tt + 20).slice(3)); if (a - b > best.v) best = { v: a - b, t: tt }; }
  const gb = ground(m, rowAt(rows, best.t), best.t);
  check(gb.lat < -20 && gb.lon > 40 && gb.lon < 110, `STS-1: the deorbit burn is over the southern Indian Ocean (${gb.lat.toFixed(0)}, ${gb.lon.toFixed(0)})`);
  check(!bT, 'STS-1: (no stray event)');
  // the field's ground: the lakebed and runway 23
  const gp = m.places[0].place.ground;
  check(gp.lakebed === true && gp.runway && gp.runway.bearing === 230 && m.places[0].place.azimuth === 230, 'STS-1: the ground at Edwards is a lakebed with runway 23 on bearing 230');
  // the vehicle's attitude at the field: nose up 8 degrees at the touch, level a few seconds later, dorsal side up
  const col = m.vehicles.find((v) => v.id === 'columbia');
  check(col.phases.some((q) => q.pitchDeg === 40) && col.phases.some((q) => q.rollDeg === -90) && col.phases.find((q) => q.t === T_LAND + 12).pitchDeg === 0, 'STS-1: 40 degrees nose-high in the entry, level on the runway, the top of the orbiter up');
  // the words: what is ours is said
  check(/ours/.test(words.entry) === false && /western Pacific/.test(words.entry) && /ours/.test(words.deorbit) && /ours/.test(words.doors) && /ours/.test(words.hac), 'STS-1: what is ours, and where this reconstruction differs from the report, are said');
  check(/white/.test(words.ready) && /STS-2/.test(words.ready), 'STS-1: the white tank is said, and that STS-2 flew it too');
  check(/Wikipedia/.test(words.srcWiki), 'STS-1: the source says it is Wikipedia, from NASA\'s documents');
  // the models: the stack in parts and the orbiter with its doors and gear
  check(['srb-l', 'srb-r', 'tank'].every((p) => partsOf('shuttle-sts-stack').includes(p)) && ['orbiter-body', 'bay-door-l', 'bay-door-r', 'bay-door-l-open', 'bay-door-r-open', 'gear-nose', 'gear-main-l', 'gear-main-r'].every((p) => partsOf('shuttle-orbiter').includes(p)), 'STS-1: the stack comes apart in three parts; the orbiter has its doors shut and open and its gear');
  check(/NASA/.test(rowOf('shuttle-orbiter')) && /Public domain/.test(rowOf('shuttle-orbiter')) && /white/.test(rowOf('shuttle-sts-stack')), 'STS-1: the rows say NASA, public domain, and the white tank');
}

// --- the shelf, the pads, the landing sites and the cards -----------------------------------------------------------------------
{
  const shelf = await mod('moments/shelf.js');
  const sites = await mod('data/sites.js');
  const ids = (sites.SITES || sites.default || []).map ? (sites.SITES || sites.default).map((s) => s.id) : [];
  const siteSrc = src('registry/sites.yaml');
  for (const id of ['voskhod-2', 'sts-1']) {
    check(shelf.SHELF.some((s) => s.id === id && existsSync(join(ROOT, 'site/data/moments', `${id}.json`))), `the shelf lists ${id}`);
    check(!!COPY.momentShelf.cards[id] && COPY.momentShelf.cards[id].title && COPY.momentShelf.cards[id].blurb && COPY.momentShelf.cards[id].when, `the shelf has the words of ${id}`);
    for (const rec of shelf.SHELF.find((s) => s.id === id).records) check(rec === 'saturn-v-lc-39a' || rec === 'baikonur-site-1' || new RegExp(`id: ${rec},`).test(siteSrc), `${id}: the record ${rec} is a site row`);
    for (const mdl of shelf.SHELF.find((s) => s.id === id).models) check(!!rowOf(mdl), `${id}: the shelf's model ${mdl} has a registry row`);
  }
  check(shelf.momentsFor('baikonur-site-1').map((s) => s.id).join() === 'vostok-1,sputnik-1,voskhod-2', 'Baikonur Site 1 carries Vostok 1, Sputnik 1 and Voskhod 2, Vostok first');
  check(shelf.momentsFor('voskhod-2-landing').map((s) => s.id).join() === 'voskhod-2' && shelf.momentsFor('edwards-afb-runway-23').map((s) => s.id).join() === 'sts-1', 'the two landing sites carry their story');
  check(shelf.momentsFor('saturn-v-lc-39a').map((s) => s.id).join() === 'apollo-11,apollo-13,sts-1', 'Launch Complex 39A carries Apollo 11, Apollo 13 and STS-1, in that order');
  const want = (rec, id, why) => check(shelf.momentsForRecord(rec).map((s) => s.id).includes(id), why);
  want({ id: 'launch-v', layer: 'launches', name: 'Voskhod | Voskhod 2', meta: { rocket: 'Voskhod', rocketFamily: 'R-7' } }, 'voskhod-2', 'a Voskhod rocket card offers Voskhod 2');
  want({ id: 'sat-v2', layer: 'notable', name: 'Voskhod 2' }, 'voskhod-2', 'the card of Voskhod 2 offers its story');
  want({ id: 'launch-s', layer: 'launches', name: 'Space Shuttle | STS-1', meta: { rocket: 'Space Shuttle', rocketFamily: 'Space Shuttle' } }, 'sts-1', 'a Space Shuttle card offers STS-1');
  want({ id: 'sat-c', layer: 'notable', name: 'Columbia' }, 'sts-1', 'the card of Columbia offers STS-1');
  check(shelf.momentsForRecord({ id: 'launch-z', layer: 'launches', name: 'Soyuz 2.1a | x', meta: { rocket: 'Soyuz 2.1a', rocketFamily: 'Soyuz', rocketFamilyPath: ['R-7', 'Soyuz'] } }).length === 0, 'a Soyuz-2 still offers nothing');
  check(/voskhod-2-landing/.test(siteSrc) && /edwards-afb-runway-23/.test(siteSrc) && /wikipedia-voskhod-2/.test(siteSrc) && /wikipedia-edwards-afb/.test(siteSrc), 'the two landing sites and their sources are in registry/sites.yaml');
  check(/\bvoskhod-2-landing\b/.test(src('site/js/data/sites.js')) && /\bedwards-afb-runway-23\b/.test(src('site/js/data/sites.js')), 'the generated sites carry them');
  void ids;
}

// --- the three fixes of the 1.7.0 review ---------------------------------------------------------------------------------------
{
  const stage = src('site/js/moments/stage.js'), player = src('site/js/moments/player.js');
  const { airAt } = await mod('moments/stage.js').catch(() => ({}));
  if (airAt) {
    check(airAt(2000, -0.5).night > 0.6 && airAt(2000, 0.9).night === 0 && airAt(200000, -0.5).night < 0.01, 'a night pad is lit (the Sun down, the camera in the air); by day, and from orbit, it is not');
  } else check(/night: \(1 - day\) \* Math\.min\(1, density \* 2\)/.test(stage), 'the air says how much of a night pad lamp is wanted');
  check(/uLift\.value = 0\.05 \* air\.sky \+ 0\.05 \* air\.night/.test(stage) && /swapLight\(sunDir, air\.capCentre, origin, NIGHT_PAD_LAMP \* air\.air\.night\)/.test(player) && /if \(lightU\.uFlood\) lightU\.uFlood\.value = flood/.test(player), 'the lamp lifts the rocket and the ground at a night pad (Sputnik 1\'s launch was at night)');
  check(/MARKER_BELOW_PX = 40/.test(player) && /lengthM \* pxPerM < MARKER_BELOW_PX/.test(player), 'every vehicle shorter than 40 px on the screen gets the ringed marker (Sputnik 1 over the Earth)');
  const s1 = JSON.parse(src('site/data/moments/sputnik-1.json'));
  check(s1.vehicles.find((v) => v.id === 'sat').marker !== false, 'Sputnik 1\'s satellite has the marker');
  // the tilt
  const b = TR.attitude('prograde', { up: [0, 0, 1], vel: [1, 0, 0], ref: [0, 1, 0] });
  const tl = TR.tilt(b, 40, 0), up = tl[1][2];
  check(Math.abs(up - Math.sin(40 * Math.PI / 180)) < 1e-9 && Math.abs(TR.tilt(b, 0, 0)[1][0] - 1) < 1e-9, 'tilt: 40 degrees of pitch lifts the nose 40 degrees above the flight path');
  const rl = TR.tilt(b, 0, -90);
  check(Math.abs(rl[2][2] - 1) < 1e-9 && Math.abs(rl[1][0] - 1) < 1e-9, 'tilt: a roll of -90 turns the dorsal axis up and keeps the nose on the flight path');
  check(F.validateMoment({ ...JSON.parse(src('site/data/moments/sts-1.json')) }, { words: COPY.momentStories['sts-1'] }).length === 0, 'format: pitchDeg and rollDeg in phases are valid');
  // the words of Apollo 13 and Sputnik 1 in four languages
  await mod('copy/en.moments.apollo13.js'); await mod('copy/en.moments.sputnik.js');
  const slots = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
  for (const code of ['es', 'fr', 'de', 'pt']) {
    const lang = await mod(`copy/${code}.js`);
    for (const id of ['apollo-13', 'sputnik-1']) {
      const en = COPY.momentStories[id], tr = lang.COPY.momentStories[id];
      check(!!tr, `${code}: has the words of ${id}`);
      if (!tr) continue;
      check(Object.keys(en).every((k) => typeof tr[k] === 'string' && tr[k].trim()) && Object.keys(tr).every((k) => k in en), `${code}: ${id} has every key of the English, and no other`);
      check(Object.keys(en).every((k) => slots(tr[k]) === slots(en[k])), `${code}: ${id} keeps every {slot}`);
      check(Object.keys(en).filter((k) => en[k].split(/\s+/).length >= 6 && !/Houston/.test(en[k])).every((k) => tr[k] !== en[k]), `${code}: ${id} has no long sentence left in English`);
    }
    check(/Houston, we've had a problem/.test(lang.COPY.momentStories['apollo-13'].problem || lang.COPY.momentStories['apollo-13'].problem1 || JSON.stringify(lang.COPY.momentStories['apollo-13'])), `${code}: the radio lines of Apollo 13 stay as said`);
    check(/Machine-drafted like the rest of this file/.test(src(`site/js/copy/${code}.js`)) && lang.META.review.status === 'machine-drafted', `${code}: still marked machine-drafted`);
    check(['voskhod-2', 'sts-1'].every((id) => lang.COPY.momentShelf.cards[id] && lang.COPY.momentShelf.cards[id].title), `${code}: the shelf cards of the two new stories are translated`);
  }
}

if (problems.length) { for (const p of problems) console.error(`::error::${p}`); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log('voskhod and sts-1 ok: Voskhod 2 (the airlock, the walk from 08:34:51 to 08:47:00, the failed automatic descent, the manual burn, the landing near Perm) and STS-1 (the boosters at 2:12, the tank at 8:52, 246 and 274 km, the deorbit over the Indian Ocean, Edwards runway 23), the shelf and the cards, the night lamp, the marker floor, the tilt, and Apollo 13 and Sputnik 1 in four languages');
