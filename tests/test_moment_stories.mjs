#!/usr/bin/env node
// tests/test_moment_stories.mjs -- the three stories of the Moments (release 1.6.0, internal spec 0079 stages C5 to C7,
// internal #1054, #1055, #1056): Vostok 1, Apollo 11, Artemis II. For each: its event order and its times against the
// published ones (UTC, from the moment's own epoch), every part event naming a part of the model it is for, every vehicle
// event inside the vehicle's window, the paths' rows sorted, finite and at believable speeds, the landing on the Moon's
// own ground, the flyby at the far side's distance, what is planned said to be planned, the audio's size and credit.
//   node tests/test_moment_stories.mjs
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const mod = (p) => import(pathToFileURL(join(ROOT, 'site/js', p)).href);
const F = await mod('moments/format.js');
const TR = await mod('moments/trajectory.js');
const { worldPositionKm } = await mod('propagate/body.js');
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');

const registry = readFileSync(join(ROOT, 'registry/models.yaml'), 'utf8');
const partsOf = (id) => {
  const line = registry.split('\n').find((l) => l.startsWith(`  - {id: ${id},`)) || '';
  const m = /parts: \[([^\]]*)\]/.exec(line);
  const sub = /subparts: \{([^}]*)\}/.exec(line);
  const names = (m ? m[1] : '').split(',').map((s) => s.trim().replace(/"/g, '')).filter(Boolean);
  if (sub) for (const g of sub[1].matchAll(/\[([^\]]*)\]/g)) names.push(...g[1].split(',').map((s) => s.trim()));
  return names;
};
const load = async (id) => {
  const m = JSON.parse(readFileSync(join(ROOT, `site/data/moments/${id}.json`), 'utf8'));
  if (m.wordsFile) await mod(`copy/${m.wordsFile}`);
  return { m, words: COPY.momentStories[m.words || m.id] };
};
const iso = (m, t) => new Date(Date.parse(m.epoch) + t * 1000).toISOString().replace('.000Z', 'Z');
const first = (m, part, action, vehicle) => (m.tracks.parts.find((e) => e.part === part && e.action === action && (!vehicle || e.vehicle === vehicle)) || {}).t;
const rowsOf = (m, name) => JSON.parse(readFileSync(join(ROOT, 'site/data/moments', m.trajectories[name].file), 'utf8')).rows;
const moonKm = (m, t) => { const q = worldPositionKm('moon', Date.parse(m.epoch) + t * 1000, 'earth-inertial'); return [q.x, q.y, q.z]; };
const interp = (rows, t) => { let i = rows.findIndex((r) => r[0] >= t); if (i < 1) i = 1; const a = rows[i - 1], b = rows[i], u = (t - a[0]) / (b[0] - a[0]); return [1, 2, 3].map((k) => a[k] + (b[k] - a[k]) * u); };

for (const id of ['vostok-1', 'apollo-11', 'artemis-ii']) {
  const { m, words } = await load(id);
  check(!!words && F.validateMoment(m, { words }).length === 0, `${id}: valid, with its words`);
  // part events: a part of the vehicle's model (or a canopy the vehicle declares), inside the vehicle's window, in time order
  const byVehicle = new Map(m.vehicles.map((v) => [v.id, v]));
  for (const e of m.tracks.parts) {
    const v = byVehicle.get(e.vehicle);
    check(!!v, `${id}: the event at ${e.t} names a vehicle`);
    if (!v) continue;
    const parts = partsOf(v.model);
    check(parts.includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} at ${e.t} is a part of ${v.model} (${parts.join(', ')})`);
    check(!v.parts || v.parts.includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} is in vehicle ${v.id}'s own parts list`);
    if (v.window && e.action !== 'hide') check(e.t >= v.window[0] - 1e-6 && e.t <= v.window[1] + 1e-6, `${id}: ${v.id} ${e.part} ${e.action} at ${e.t} is inside its window ${v.window}`);
  }
  // each part that ignites cuts off after, and separates after it cut off (where it cut off)
  for (const v of m.vehicles) for (const p of new Set(m.tracks.parts.filter((e) => e.vehicle === v.id).map((e) => e.part))) {
    const list = m.tracks.parts.filter((e) => e.vehicle === v.id && e.part === p);
    const ig = list.find((e) => e.action === 'ignite'), co = list.find((e) => e.action === 'cutoff'), se = list.find((e) => e.action === 'separate');
    if (ig && co) check(co.t > ig.t, `${id}: ${v.id} ${p} cuts off after it ignites`);
    if (co && se) check(se.t >= co.t, `${id}: ${v.id} ${p} separates after it cuts off`);
  }
  // paths: sorted, finite, believable speeds
  for (const name of Object.keys(m.trajectories)) {
    const tr = m.trajectories[name];
    if (tr.kind !== 'vectors') continue;
    const rows = rowsOf(m, name);
    check(rows.length > 50 && rows.every((r, i) => r.length === 7 && r.every(Number.isFinite) && (i === 0 || r[0] > rows[i - 1][0])), `${id}: path ${name} has sorted, finite rows`);
    check(rows.every((r) => Math.hypot(r[4], r[5], r[6]) < 13.5), `${id}: path ${name} never faster than 13.5 km/s`);
    check(rows.every((r) => Math.hypot(r[1], r[2], r[3]) > 6360), `${id}: path ${name} never under the Earth's surface`);
    check(rows.every((r) => Math.hypot(r[1], r[2], r[3]) < 420000), `${id}: path ${name} never farther than 420 000 km from the Earth`);
    const cover = { orbit: [700, 6400], pilot: [6000, 6400], ivb: [800, 14000], csm: [15000, 703000], lm: [15000, 460000], lmasc: [448000, 468000], trip: [600, 783000], icps: [600, 9000] }[name] || [0, 0];
    check(rows[0][0] <= cover[0] && rows[rows.length - 1][0] >= cover[1], `${id}: path ${name} covers its part of the span (${rows[0][0]} to ${rows[rows.length - 1][0]})`);
  }
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 150 && play < 900, `${id}: ${Math.round(play)} s of play time`);
  check(m.sources.length >= 2 && m.sources.every((s) => /^https:\/\//.test(s.url)), `${id}: sources`);
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 330), `${id}: every caption is a sentence or two`);
  check(Object.values(m.trajectories).every((t) => t.truth === 'reconstructed' || t.truth === 'illustrative'), `${id}: no path claims to be measured`);
}

// --- Vostok 1
{
  const { m } = await load('vostok-1');
  check(iso(m, 0) === '1961-04-12T06:07:00Z', 'Vostok 1: T-0 is 06:07:00 UTC');
  const t = (p, a, v) => first(m, p, a, v);
  check(t('booster-b', 'separate') === 119.4 && t('fairing', 'separate') === 156 && t('core-stage', 'separate') === 300.5, 'Vostok 1: strap-ons at T+119 s, shroud at T+156 s, core at T+300 s');
  check(iso(m, t('vostok-im', 'ignite')) === '1961-04-12T07:25:00Z', 'Vostok 1: retrofire at 07:25 UTC');
  check(t('vostok-im', 'cutoff') - t('vostok-im', 'ignite') === 42, 'Vostok 1: the retro burn lasts 42 s');
  check(t('vostok-hatch', 'separate') < t('vostok-seat', 'ignite') + 3 && t('vostok-seat', 'ignite') < t('main', 'deploy'), 'Vostok 1: the hatch, then the seat, then the main canopy');
  check(iso(m, m.span[1]) === '1961-04-12T07:55:00Z', 'Vostok 1: it ends at the landing, 108 minutes after the launch (07:55 UTC)');
  check(Math.abs(first(m, 'main', 'deploy', 'ship') - m.tracks.parts.find((e) => e.action === 'ignite' && e.part === 'vostok-seat').t - 120) < 5, 'Vostok 1: the main canopy about two minutes after the ejection (7 km to 2.5 km)');
  // the capsule lands at the landing field, and the retro is over Africa's west coast
  const rows = rowsOf(m, 'orbit'), end = rows[rows.length - 1];
  const g = TR.siderealAt(Date.parse(m.epoch), end[0]);
  const lat = Math.asin(end[3] / Math.hypot(end[1], end[2], end[3])) * 180 / Math.PI;
  const lon = (Math.atan2(end[2], end[1]) - g) * 180 / Math.PI;
  const norm = (x) => ((x + 540) % 360) - 180;
  check(Math.abs(lat - 51.27) < 0.4 && Math.abs(norm(lon) - 46.0) < 0.5, `Vostok 1: the capsule is at 51.27 N 46.0 E at the end (${lat.toFixed(2)}, ${norm(lon).toFixed(2)})`);
  const r0 = interp(rows, first(m, 'vostok-im', 'ignite', 'ship'));
  const lat0 = Math.asin(r0[2] / Math.hypot(...r0)) * 180 / Math.PI, lon0 = norm((Math.atan2(r0[1], r0[0]) - TR.siderealAt(Date.parse(m.epoch), 4680)) * 180 / Math.PI);
  check(lat0 < 5 && lat0 > -20 && lon0 > 5 && lon0 < 25, `Vostok 1: retrofire is over the west coast of Africa (${lat0.toFixed(1)}, ${lon0.toFixed(1)})`);
}
// --- Apollo 11
{
  const { m } = await load('apollo-11');
  const t = (p, a, v) => first(m, p, a, v);
  check(iso(m, 0) === '1969-07-16T13:32:00Z', 'Apollo 11: T-0 is 13:32:00 UTC');
  const order = [t('s-ic', 'separate'), t('s-ii', 'ignite'), t('interstage-ic-ii', 'separate'), t('les-tower', 'separate'), t('s-ii', 'separate'), t('s-ivb', 'ignite', 'saturn'), t('s-ivb', 'ignite', 'ivb'), t('sla-1', 'separate'), t('service-module', 'ignite', 'csm'), t('descent-stage', 'ignite', 'lm'), t('ascent-stage', 'ignite', 'lm-asc'), t('service-module', 'separate', 'csm'), t('drogue', 'deploy'), t('main', 'deploy')];
  check(order.every((x, i) => Number.isFinite(x) && (i === 0 || x > order[i - 1])), `Apollo 11: the events come in flight order (${order.join(', ')})`);
  const at = (p, a, v) => iso(m, t(p, a, v));
  check(Math.abs(Date.parse(at('descent-stage', 'cutoff', 'lm')) - Date.parse('1969-07-20T20:17:40Z')) <= 200, 'Apollo 11: the descent engine stops at touchdown, 20:17:40 UTC (' + at('descent-stage', 'cutoff', 'lm') + ')');
  check(at('ascent-stage', 'ignite', 'lm-asc') === '1969-07-21T17:54:00Z', 'Apollo 11: the ascent engine lights at 17:54:00 UTC on 21 July');
  check(at('service-module', 'ignite', 'csm') === '1969-07-19T17:21:50Z', 'Apollo 11: the lunar-orbit burn at 17:21:50 UTC on 19 July');
  check(iso(m, m.span[1]) === '1969-07-24T16:50:35Z', 'Apollo 11: splashdown at 16:50:35 UTC on 24 July');
  const step = m.tracks.captions.find((c) => c.say === 'step').t;
  check(iso(m, step) === '1969-07-21T02:56:15Z', 'Apollo 11: the first step at 02:56:15 UTC on 21 July');
  const clip = m.tracks.audio.find((a) => /a11-small-step/.test(a.src || ''));
  check(clip && existsSync(join(ROOT, 'site', clip.src)) && statSync(join(ROOT, 'site', clip.src)).size < 120000 && clip.t > step && clip.t < step + 60, 'Apollo 11: the NASA clip is under 120 kB and plays within a minute of the first step');
  check(/a11-small-step/.test(readFileSync(join(ROOT, 'CREDITS.md'), 'utf8')), 'Apollo 11: the clip has a CREDITS.md line');
  // 1.7.22: the landing call at 102:45:40, the caption's own second; the 1202 alarms and the launch have no clip with a stated licence
  const call = m.tracks.audio.find((a) => /a11-landed/.test(a.src || '')), landed = m.tracks.captions.find((c) => c.say === 'landed').t;
  check(call && call.t === landed && iso(m, call.t) === '1969-07-20T20:17:40Z' && existsSync(join(ROOT, 'site', call.src)) && statSync(join(ROOT, 'site', call.src)).size < 60000, 'Apollo 11: the landing call is under 60 kB and cued at 20:17:40 UTC with the caption');
  const credits11 = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8'), audioYaml11 = readFileSync(join(ROOT, 'registry/audio.yaml'), 'utf8');
  check(/a11-landed\.m4a/.test(credits11) && /Apollo_11_Eagle_Has_Landed/.test(credits11) && /id: a11-landed/.test(audioYaml11) && /PD-USGov-NASA/.test(audioYaml11), 'Apollo 11: the landing call has its CREDITS.md line and its row in registry/audio.yaml, licence stated');
  check(m.sources.some((x) => x.say === 'srcLanding'), 'Apollo 11: the Moment lists the landing call among its sources');
  // the landing is on the Moon's ground at Tranquility Base
  const lm = rowsOf(m, 'lm'), tLand = m.tracks.parts.find((e) => e.part === 'descent-stage' && e.action === 'cutoff').t + 0.1;
  for (let tt of [tLand + 300, tLand + 40000]) {
    const row = lm.find((r) => r[0] >= tt), p = row.slice(1), mo = moonKm(m, row[0]), rel = [p[0] - mo[0], p[1] - mo[1], p[2] - mo[2]];
    tt = row[0];
    const ax = TR.moonAxes(mo), dir = TR.moonSurfaceDir(ax, m.moonSite.lat, m.moonSite.lon);
    const d = Math.hypot(...rel) * 1000;
    const ang = Math.acos(Math.min(1, (rel[0] * dir[0] + rel[1] * dir[1] + rel[2] * dir[2]) / Math.hypot(...rel)));
    check(Math.abs(d - TR.MOON_R) < 80 && ang < 2e-3, `Apollo 11: the lander stands on the site at +${Math.round(tt - tLand)} s (${(d - TR.MOON_R).toFixed(0)} m, ${(ang * 1737).toFixed(2)} km off)`);
  }
  const csm = rowsOf(m, 'csm');
  let lowest = 1e9; for (const r of csm) { const t = r[0]; if (t < 272900 || t > 487500) continue; const mo = moonKm(m, t); lowest = Math.min(lowest, Math.hypot(r[1] - mo[0], r[2] - mo[1], r[3] - mo[2]) - 1737.4); }
  check(lowest > 40 && lowest < 140, `Apollo 11: the CSM never nearer the Moon's surface than 40 km in lunar orbit (${lowest.toFixed(0)} km)`);
}
// --- Artemis II
{
  const { m, words } = await load('artemis-ii');
  const t = (p, a, v) => first(m, p, a, v);
  check(iso(m, 0) === '2026-04-01T22:35:12Z', 'Artemis II: T-0 is 22:35:12 UTC on 1 April 2026');
  check(iso(m, m.span[1]) === '2026-04-11T00:07:27Z', 'Artemis II: splashdown at 00:07:27 UTC on 11 April');
  const ca = m.tracks.captions.find((c) => c.say === 'closest').t;
  check(iso(m, ca) === '2026-04-06T23:00:00Z', 'Artemis II: closest approach at 23:00 UTC on 6 April');
  check(iso(m, m.tracks.captions.find((c) => c.say === 'far').t) === '2026-04-06T23:02:00Z', 'Artemis II: the greatest distance at 23:02 UTC');
  const order = [t('srb-left', 'separate'), t('las', 'separate'), t('core-stage', 'separate'), t('fairing-1', 'separate'), t('icps', 'ignite'), t('esm', 'ignite'), t('esm', 'separate'), t('drogue', 'deploy'), t('main', 'deploy')];
  check(order.every((x, i) => Number.isFinite(x) && (i === 0 || x > order[i - 1])), `Artemis II: the events come in flight order (${order.join(', ')})`);
  const rows = rowsOf(m, 'trip');
  let nearest = 1e9, at = 0; for (const r of rows) { if (r[0] < ca - 20000 || r[0] > ca + 20000) continue; const mo = moonKm(m, r[0]); const d = Math.hypot(r[1] - mo[0], r[2] - mo[1], r[3] - mo[2]); if (d < nearest) { nearest = d; at = r[0]; } }
  check(Math.abs(nearest - 1737.4 - 6545) < 200 && Math.abs(at - ca) < 700, `Artemis II: the closest approach is ${(nearest - 1737.4).toFixed(0)} km above the Moon at ${at - ca} s from the published time`);
  let far = 0; for (const r of rows) far = Math.max(far, Math.hypot(r[1], r[2], r[3])); check(Math.abs(far - 406771) < 5000, `Artemis II: the greatest distance from the Earth is ${far.toFixed(0)} km (406 771 reported)`);
  // planned is said to be planned; flown is said to be flown
  for (const k of ['las', 'meco', 'fairings', 'sep', 'esmsep']) check(/lanned/.test(words[k]), `Artemis II: "${k}" says it is planned`);
  for (const k of ['liftoff', 'srb', 'closest', 'far', 'splash']) check(/Flown/.test(words[k]), `Artemis II: "${k}" says it was flown`);
}
// --- Curiosity's entry, descent and landing (release 1.7.9): the published clock, the heights and speeds, the place on Mars
{
  const { m, words } = await load('curiosity-edl');
  const W = await mod('moments/world.js');
  const ms = (t) => Date.parse(m.epoch) + t * 1000;
  check(m.world === 'mars' && F.validateMoment(m, { words }).length === 0, `Curiosity: valid, with its words (${F.validateMoment(m, { words }).join('; ')})`);
  check(F.validateMoment({ ...m, world: 'venus' }, { words }).some((x) => /world/.test(x)), 'Curiosity: a world that is not on the list is refused');
  // JPL's timeline, PDT + 7 h: entry 10:10:45.7 PM, parachute 10:15:04.9, heat shield 10:15:24.6, rover separation 10:17:38.6, touchdown 10:17:57.3
  const at = (t) => new Date(ms(t)).toISOString();
  check(m.epoch === '2012-08-06T05:10:45.7Z', 'Curiosity: T-0 is the entry, 05:10:45.7 UTC');
  const ev = (p, a, v) => first(m, p, a, v);
  check(at(ev('main', 'deploy', 'entry')) === '2012-08-06T05:15:04.900Z', `Curiosity: the parachute at 05:15:04.9 UTC (${at(ev('main', 'deploy', 'entry'))})`);
  check(at(ev('msl-heat-shield', 'separate', 'entry')) === '2012-08-06T05:15:24.600Z', 'Curiosity: the heat shield at 05:15:24.6 UTC');
  const crane = m.tracks.effects.find((e) => e.effect === 'tether');
  check(at(crane.t) === '2012-08-06T05:17:38.600Z', 'Curiosity: the rover leaves the stage at 05:17:38.6 UTC');
  const tdT = m.vehicles.find((v) => v.id === 'rover').window[0] + (431.6 - 412.9);
  check(at(tdT) === '2012-08-06T05:17:57.300Z', 'Curiosity: touchdown at 05:17:57.3 UTC, seven minutes and eleven seconds after the entry');
  check(Math.abs((Date.parse('2012-08-06T05:31:45.4Z') - Date.parse('2012-08-06T05:17:57.3Z')) / 1000 - 828.1) < 0.01, 'Curiosity: the signal takes 13 min 48 s to reach the Earth (JPL: 10:31:45.4 PM)');
  check(ev('msl-descent-stage', 'ignite', 'ds') > 358.9 && ev('msl-descent-stage', 'ignite', 'ds') < 360, 'Curiosity: the eight landing engines light as the back shell lets go, 80 s after the shield');
  const cut = m.tracks.parts.find((e) => e.part === 'msl-descent-stage' && e.action === 'cutoff' && e.engines);
  check(cut && cut.engines.length === 4 && cut.t < crane.t, 'Curiosity: four of the eight engines go out just before the rover is lowered');
  const re = m.tracks.parts.filter((e) => e.part === 'msl-descent-stage' && e.action === 'ignite');
  check(re.length === 2 && re[1].t === crane.until, 'Curiosity: the stage lights its four again when the cords are cut');
  check(Math.abs(crane.until - 433.6) < 1e-9 && crane.until - tdT === 2.0, 'Curiosity: the cords are cut two seconds after touchdown');
  // the models: parts, engines, the chute
  const byId = new Map(m.vehicles.map((v) => [v.id, v]));
  for (const e of m.tracks.parts) {
    const v = byId.get(e.vehicle), parts = partsOf(v.model);
    check(parts.includes(e.part) || (v.chutes && e.part in v.chutes), `Curiosity: ${e.part} at ${e.t} is a part of ${v.model} or a chute of ${v.id}`);
  }
  for (const v of m.vehicles) check(new RegExp(`id: ${v.model},`).test(registry) && existsSync(join(ROOT, `site/models/${v.model}.glb`)), `Curiosity: ${v.id}'s model ${v.model} is a registry row with a file`);
  check(byId.get('ds').engines['msl-descent-stage'].length === 8 && /engines: \{msl-descent-stage: \[\[/.test(registry), 'Curiosity: eight engine mouths on the stage');
  check(byId.get('entry').chutes.main.diameterM === 16 && byId.get('entry').chutes.main.lineM >= 50, 'Curiosity: the parachute is 16 m across on lines of 50 m or more');
  check(crane.from.vehicle === 'ds' && crane.to.vehicle === 'rover' && crane.from.at.length === 3 && crane.to.at.length === 3, 'Curiosity: the bridle is three cords from the stage to the rover');
  // the paths: sorted, finite; the heights and speeds the press kit gives; the landing on Gale; the bridle's length
  TR.setWorld('mars');
  const tracks = Object.fromEntries(Object.entries(m.trajectories).map(([k, tr]) => [k, TR.profileTrack(tr, m.place)]));
  for (const [k, tr] of Object.entries(m.trajectories)) {
    check(tr.points.every((r, i) => r.every(Number.isFinite) && (i === 0 || r[0] > tr.points[i - 1][0])), `Curiosity: path ${k} has sorted, finite points`);
    check(tr.truth !== 'measured', `Curiosity: path ${k} does not claim to be measured`);
  }
  const sp = (k, t) => tracks[k].stateAt(t);
  const e0 = sp('edl', 0);
  check(Math.abs(e0.altM - 131100) < 400 && Math.abs(Math.hypot(e0.v[0], e0.v[1], e0.v[2]) - 5900) < 120, `Curiosity: at the entry interface 131 km up at 5.9 km/s (${(e0.altM / 1000).toFixed(1)} km, ${Math.hypot(...e0.v).toFixed(0)} m/s)`);
  const c0 = sp('edl', 259.2), h0 = sp('edl', 278.9), b0 = sp('edl', 358.9);
  check(Math.abs(c0.altM - 11000) < 300 && Math.abs(Math.hypot(...c0.v) - 405) < 12, `Curiosity: the parachute opens at 11 km and 405 m/s (${(c0.altM / 1000).toFixed(2)} km, ${Math.hypot(...c0.v).toFixed(0)} m/s)`);
  check(Math.abs(h0.altM - 8000) < 250 && Math.abs(Math.hypot(...h0.v) - 125) < 25, `Curiosity: the heat shield goes at 8 km and about 125 m/s (${(h0.altM / 1000).toFixed(2)} km, ${Math.hypot(...h0.v).toFixed(0)} m/s)`);
  check(Math.abs(b0.altM - 1600) < 60 && Math.hypot(...b0.v) < 100, `Curiosity: the back shell goes at 1.6 km and under 100 m/s (${b0.altM.toFixed(0)} m, ${Math.hypot(...b0.v).toFixed(0)} m/s)`);
  const pts = m.trajectories.edl.points;
  check(pts.filter((r) => r[0] >= 0).every((r, i, a) => i === 0 || r[1] < a[i - 1][1]), 'Curiosity: from the entry the height only falls');
  check(m.facts.peakAtS > 75 && m.facts.peakAtS < 100 && m.facts.peakG > 6 && m.facts.peakG < 16, `Curiosity: the reconstruction's deceleration peaks near the press kit's +90 s (${m.facts.peakAtS} s, ${m.facts.peakG} g)`);
  const rv = sp('rover-path', 431.6), rvA = sp('rover-path', 431.1), rv2 = sp('rover-path', 431.6 - 1), d0 = sp('ds-path', 412.9), d1 = sp('ds-path', 431.6), r0 = sp('rover-path', 412.9);
  const vTouch = (rvA.altM - rv.altM) / 0.5;
  check(rv.altM < 0.05 && vTouch > 0.4 && vTouch < 1.0, `Curiosity: the rover reaches the ground at under a metre a second (${vTouch.toFixed(2)} m/s; JPL: 0.75)`);
  check(Math.abs(r0.altM - 20) < 0.2 && Math.abs(d0.altM - 22.4) < 0.3, `Curiosity: at separation the rover is 20 m up (${r0.altM.toFixed(1)} m), its stage 22.4 m (${d0.altM.toFixed(1)} m)`);
  const bridle = d1.altM - rv.altM - 1.3;
  check(bridle > 7.2 && bridle < 7.9, `Curiosity: at touchdown the cords are 7.6 m long between the stage and the rover's deck (${bridle.toFixed(2)} m)`);
  check(rv2.altM > 0 && rv2.altM < 2, 'Curiosity: a second before touchdown the wheels are about a metre up');
  const crash = sp('ds-path', 433.6 + 17.5), land = sp('ds-path', 433.6);
  const away = Math.hypot(crash.p[0] - land.p[0], crash.p[1] - land.p[1]);
  check(crash.altM < 1 && away > 600 && away < 700, `Curiosity: the stage comes down some 650 m from the landing (${away.toFixed(0)} m)`);
  // the end of the path is on Gale crater's Bradbury Landing (4.5895 S, 137.4417 E)
  const fr = TR.placeFrame(m.place), end = sp('rover-path', 431.6);
  const ecef = TR.enuToEcef(fr, end.p), lat = Math.asin(ecef[2] / Math.hypot(...ecef)) * 180 / Math.PI, lon = Math.atan2(ecef[1], ecef[0]) * 180 / Math.PI;
  const dkm = Math.hypot((lat + 4.5895) * 59.2, (lon - 137.4417) * 59.2 * Math.cos(4.5895 * Math.PI / 180));
  check(dkm < 0.3, `Curiosity: the path ends within 300 m of Bradbury Landing (${lat.toFixed(4)}, ${lon.toFixed(4)}: ${(dkm * 1000).toFixed(0)} m off)`);
  const landed = m.places[0].place;
  check(Math.abs(landed.lat + 4.5895) < 1e-4 && Math.abs(landed.lon - 137.4417) < 1e-4 && landed.alt === 0, 'Curiosity: the drawn ground from 200 s is Bradbury Landing');
  // Mars as a place: its radius and pull, its day, the Sun in mid-afternoon at the site
  check(TR.EARTH_R === 3391100 && Math.abs(TR.gravity([TR.EARTH_R, 0, 0])[0] + 3.72) < 0.02 && Math.abs(TR.OMEGA - 7.088e-5) < 1e-8, `Curiosity: Mars's radius and its pull (${TR.gravity([TR.EARTH_R, 0, 0])[0].toFixed(2)} m/s^2)`);
  const lt = W.localSolarHours('mars', ms(431.6), 137.4417);
  check(lt > 14.4 && lt < 16.4, `Curiosity: mid-afternoon at Gale at touchdown (the press kit: about 3 p.m. local mean solar time; ${lt.toFixed(1)} h true solar time here)`);
  const sun = W.sunFromWorld('mars', ms(431.6)), ax = W.worldAxes('mars', ms(431.6));
  const ang = (ax.w + 137.4417 * Math.PI / 180), up = [Math.cos(-4.5895 * Math.PI / 180) * (Math.cos(ang)), Math.cos(-4.5895 * Math.PI / 180) * Math.sin(ang), Math.sin(-4.5895 * Math.PI / 180)];
  const elev = Math.asin(sun[0] * up[0] + sun[1] * up[1] + sun[2] * up[2]) * 180 / Math.PI;
  check(elev > 20 && elev < 55, `Curiosity: the Sun is ${elev.toFixed(0)} degrees up at the site at touchdown`);
  check(Math.abs(Math.hypot(...sun) - 1) < 1e-9 && Math.abs(W.sunDistanceAu('mars', ms(431.6)) - 1.536) < 0.01, 'Curiosity: Mars was 1.54 au from the Sun');
  TR.setWorld('earth');
  check(TR.EARTH_R > 6.3e6 && Math.abs(TR.gravity([TR.EARTH_R, 0, 0])[0] + 9.82) < 0.05, 'Curiosity: setWorld puts the Earth back');
  const { airAt } = await mod('moments/stage.js');
  TR.setWorld('mars'); const mars = TR.WORLD; TR.setWorld('earth');
  check(Math.abs(airAt(11100, 1, mars.airH).density - Math.exp(-1)) < 1e-9 && airAt(8000, 1).density < airAt(8000, 1, mars.airH).density, 'Curiosity: the stage reads the world\'s scale height of its air');
  // the story is long enough to watch and short enough not to tire; the words
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 150 && play < 900, `Curiosity: ${Math.round(play)} s of play time`);
  check(m.sources.length >= 3 && m.sources.every((q) => /^https:\/\//.test(q.url) && words[q.say]), 'Curiosity: sources, each with its words');
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 330), 'Curiosity: every caption is a sentence or two');
  check(/Touchdown confirmed\. We're safe on Mars!/.test(words.earth) && /Allen Chen/.test(words.earth) && /13 min 48 s/.test(words.earth), 'Curiosity: the closing caption quotes the line, says who and the 13 min 48 s');
  check(!!COPY.momentPlayer.groundNoteMars && /Mars map/.test(COPY.momentPlayer.groundNoteMars), 'Curiosity: the foot line names the Mars map');
  for (const k of ['pathEdl', 'pathDescent', 'pathBackshell', 'pathRover']) check(!!words[k], `Curiosity: words for ${k}`);
  const shelf = await mod('moments/shelf.js');
  check(shelf.momentsFor('gale').some((x) => x.id === 'curiosity-edl') && shelf.SHELF.every((x) => !x.models || x.models.every((id) => new RegExp(`id: ${id},`).test(registry))), 'Curiosity: the card of Gale crater offers the replay; every model the shelf names is a registry row');
  check(!!COPY.momentShelf.cards['curiosity-edl'], 'Curiosity: the shelf has its card');
}
// --- New Horizons at Pluto (release 1.7.9): JPL's track, the pass at 12 500 km, the approach on the lit side, Charon about fourteen minutes later
{
  const { m, words } = await load('new-horizons-pluto');
  const W = await mod('moments/world.js');
  const A = await import(pathToFileURL(join(ROOT, 'site/vendor/astronomy.js')).href);
  const ms = (t) => Date.parse(m.epoch) + t * 1000;
  check(m.world === 'pluto' && F.validateMoment(m, { words }).length === 0, `New Horizons: valid, with its words (${F.validateMoment(m, { words }).join('; ')})`);
  check(m.trajectories.path.frame === 'world' && m.vehicles.length === 1 && m.vehicles[0].model === 'new-horizons' && new RegExp('id: new-horizons,').test(registry), 'New Horizons: one vehicle, the craft\'s own model, on a path in Pluto\'s frame');
  const rows = rowsOf(m, 'path');
  check(rows.length > 100 && rows.every((r, i) => r.length === 7 && r.every(Number.isFinite) && (i === 0 || r[0] > rows[i - 1][0])), 'New Horizons: the path has sorted, finite rows');
  check(rows[0][0] === m.span[0] && rows[rows.length - 1][0] >= m.span[1], 'New Horizons: the path covers the span');
  // the pass: the nearest second is T-0, JPL Horizons' own (the range rate changes sign between 11:48:00 and 11:49:00 UT), 13.8 km/s, about 12 500 km up
  let near = null; for (let t = -120; t <= 120; t += 0.25) { const r = interp(rows, t); const d = Math.hypot(r[0], r[1], r[2]); if (!near || d < near.d) near = { d, t }; }
  check(Math.abs(near.t) <= 1 && m.epoch === '2015-07-14T11:48:29Z', `New Horizons: T-0 is the nearest second in JPL's track, 11:48:29 UT (${near.t} s)`);
  check(Math.abs(near.d - 1188.3 - 12500) < 60, `New Horizons: ${Math.round(near.d - 1188.3)} km over Pluto's surface at the nearest second (NASA: about 12 500)`);
  const row0 = rows.reduce((a, r) => (Math.abs(r[0]) < Math.abs(a[0]) ? r : a));
  check(Math.abs(Math.hypot(row0[4], row0[5], row0[6]) - 13.78) < 0.05, `New Horizons: ${Math.hypot(row0[4], row0[5], row0[6]).toFixed(2)} km/s at the pass (NASA: 30 800 mph, 13.8 km/s)`);
  check(/11:48:29/.test(words.closest) && /11:49:57/.test(words.closest) && /not reconciled/.test(words.closest), 'New Horizons: the words give both clocks and say they are not reconciled');
  // Pluto's frame: its pole is the IAU's (right ascension 132.993, declination -6.163 degrees)
  const ax = W.worldAxes('pluto', ms(0));
  check(Math.abs(ax.z[2] - Math.sin(-6.163 * Math.PI / 180)) < 0.005 && Math.abs(Math.atan2(ax.z[1], ax.z[0]) * 180 / Math.PI - 132.993) < 0.2, 'New Horizons: Pluto\'s pole is at right ascension 133 degrees, declination -6.2');
  // the geometry the captions rest on: the approach over the lit side, the craft on the night side from the pass, a thin crescent when it looks back
  const phase = (t) => { const r = interp(rows, t), s = W.sunFromWorld('pluto', ms(t)); return Math.acos((r[0] * s[0] + r[1] * s[1] + r[2] * s[2]) / Math.hypot(...r)) * 180 / Math.PI; };
  check(phase(-900) < 80 && phase(0) > 95 && phase(300) > 115 && phase(2000) > 160, `New Horizons: lit side on the approach (${phase(-900).toFixed(0)}), night side from the pass (${phase(0).toFixed(0)}), looking back at a crescent (${phase(2000).toFixed(0)} degrees from the Sun)`);
  // Charon above longitude 0 on the equator at 19 591 km: nearest the craft about 14 minutes after the pass, within about 28 860 km
  let ch = null; for (let t = 400; t <= 1300; t += 1) { const w = W.worldAxes('pluto', ms(t)).w, r = interp(rows, t), q = [19591 * Math.cos(w), 19591 * Math.sin(w), 0]; const d = Math.hypot(r[0] - q[0], r[1] - q[1], r[2] - q[2]); if (!ch || d < ch.d) ch = { d, t }; }
  check(Math.abs(ch.t - 14 * 60) < 60 && Math.abs(ch.d - 28860) < 1000 && Math.abs(ch.t - m.facts.charonNearS) < 1.5, `New Horizons: Charon is nearest ${Math.round(ch.d)} km at ${ch.t} s, about 14 minutes after the pass (NASA: within 28 860 km)`);
  check(TR.WORLDS.pluto.moon.aM === 19591000 && TR.WORLDS.pluto.moon.R === 606000 && Math.abs(TR.WORLDS.pluto.R - 1188300) < 1, 'New Horizons: Pluto\'s radius, Charon\'s radius and the distance between them');
  // the radio: Earth to Pluto that day, 4.77 billion km, 4 h 25 min
  const pl = A.HelioVector(A.Body.Pluto, new Date('2015-07-15T00:53:00Z')), ea = A.HelioVector(A.Body.Earth, new Date('2015-07-15T00:53:00Z'));
  const au = Math.hypot(pl.x - ea.x, pl.y - ea.y, pl.z - ea.z);
  check(Math.abs(au * 1.495978707e8 / 1e9 - 4.77) < 0.03 && Math.abs(au * 499.00478 / 60 - 265) < 4 && /4\.77 billion km/.test(words.away) && /4 hours 25 minutes/.test(words.away), 'New Horizons: the Earth was 4.77 billion km away, 4 hours 25 minutes by radio');
  check(/00:53 UTC on 15 July/.test(words.home) && /8:53 pm EDT/.test(words.home), 'New Horizons: the "phone home" signal at 00:53 UTC (8:53 pm EDT)');
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 150 && play < 900, `New Horizons: ${Math.round(play)} s of play time`);
  check(m.sources.length >= 3 && m.sources.every((q) => /^https:\/\//.test(q.url) && words[q.say]), 'New Horizons: sources, each with its words');
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 330), 'New Horizons: every caption is a sentence or two');
  const shelf = await mod('moments/shelf.js');
  check(['pluto', 'charon', 'deep-new-horizons'].every((id) => shelf.momentsFor(id).some((x) => x.id === 'new-horizons-pluto')) && shelf.momentsForRecord({ id: 'x', name: 'New Horizons', layer: 'deep-space' }).some((x) => x.id === 'new-horizons-pluto'), 'New Horizons: the cards of Pluto, Charon and the craft offer the replay');
  check(!!COPY.momentShelf.cards['new-horizons-pluto'], 'New Horizons: the shelf has its card');
}
// --- Hubble's deployment from Discovery (1.7.7, internal #1058)
{
  const { m, words } = await load('hubble-deployment');
  const POSE = await mod('moments/pose.js');
  const byId = new Map(m.vehicles.map((v) => [v.id, v]));
  check(!!words && F.validateMoment(m, { words }).length === 0, `Hubble: valid, with its words (${words ? F.validateMoment(m, { words }).join('; ') : 'no words'})`);
  check(iso(m, 0) === '1990-04-24T12:33:51Z', 'Hubble: T-0 is the lift-off, 12:33:51 UTC on 24 April 1990');
  const rel = byId.get('hubble').window[0];
  check(iso(m, rel) === '1990-04-25T19:38:00Z', `Hubble: the telescope leaves the arm at 19:38:00 UTC on 25 April (${iso(m, rel)})`);
  check(byId.get('hubble-berthed').window[1] === rel, 'Hubble: the carried telescope and the free one swap at the release, on the same second');
  for (const e of m.tracks.parts) {
    const v = byId.get(e.vehicle);
    check(!!v && partsOf(v.model).includes(e.part) && (v.parts || []).includes(e.part), `Hubble: ${e.part} at ${e.t} is a part of ${v && v.model}, in its vehicle's list`);
    if (e.action === 'pose') check(Array.isArray(e.quat) && e.quat.length === 4 && Math.abs(Math.hypot(...e.quat) - 1) < 1e-3 && Array.isArray(e.about), `Hubble: the pose of ${e.part} at ${e.t} is a unit quaternion about a point`);
  }
  // the arm holds the telescope: the end effector's tip, by the poses of the three links, is where the grapple fixture's probe is, at every carried second
  const rms = byId.get('rms'), host = byId.get('discovery'), hub = byId.get('hubble-berthed');
  const keys = hub.rideOn.keys;
  check(keys.length > 50 && keys.every((k, i) => i === 0 || k.t > keys[i - 1].t), `Hubble: the carrier has ${keys.length} keyframes in time order`);
  const L1 = 6.0, L2 = 6.8, L3 = 2.4, P0 = [-2.62, 27.0, -0.8], minY = rms.rideOn.at[1];
  const evOf = (part) => m.tracks.parts.filter((e) => e.part === part && e.action === 'pose');
  const link = { upper: evOf('rms-upper'), lower: evOf('rms-lower'), wrist: evOf('rms-wrist') };
  const mul = (c, v) => [0, 1, 2].map((r) => c[0][r] * v[0] + c[1][r] * v[1] + c[2][r] * v[2]);
  const posed = (list, t, p) => { const i = list.findIndex((e) => e.t >= t); const a = list[Math.max(0, i - 1)], b = list[i < 0 ? list.length - 1 : i]; const u = b.t > a.t ? Math.min(1, Math.max(0, (t - a.t) / (b.t - a.t))) : 0;
    const q = POSE.slerp(a.quat, b.quat, u), pos = [0, 1, 2].map((k) => a.pos[k] + (b.pos[k] - a.pos[k]) * u), ab = a.about; const d = [p[0] - ab[0], p[1] - ab[1], p[2] - ab[2]], r = mul(POSE.quatColumns(q), d);
    return [ab[0] + r[0] + pos[0], ab[1] + r[1] + pos[1], ab[2] + r[2] + pos[2]]; };
  const GRAPPLE = [0.62, -0.5, 1.8], mH = [0, -7.21, 0];
  let worst = 0;
  const held = m.tracks.captions.find((c) => c.say === 'umbilical').t;                  // from the grapple on the end effector is on the probe (before it, it hovers over it)
  for (const k of keys.filter((x) => x.t >= held)) {
    const R = POSE.quatColumns(k.quat), g = [GRAPPLE[0] - mH[0], GRAPPLE[1] - mH[1], GRAPPLE[2] - mH[2]], tip = mul(R, g).map((x, i) => x + k.at[i]);
    const tip0 = [P0[0], P0[1] - minY - (L1 + L2 + L3), P0[2]];                          // the stowed tip, in the arm's vehicle frame
    const got = posed(link.wrist, k.t, tip0), want = [tip[0], tip[1] - minY, tip[2]];
    worst = Math.max(worst, Math.hypot(got[0] - want[0], got[1] - want[1], got[2] - want[2]));
  }
  check(worst < 0.2, `Hubble: the arm's tip is at the grapple fixture at every carried second, to ${worst.toFixed(3)} m (the links are rigid and 15.2 m long in all)`);
  const elbowGap = (t) => Math.hypot(...[0, 1, 2].map((k) => posed(link.lower, t, [P0[0], P0[1] - minY - L1, P0[2]])[k] - posed(link.upper, t, [P0[0], P0[1] - minY - L1, P0[2]])[k]));
  check([rel - 7600, rel - 7000, rel - 1000, rel - 500, rel - 10].every((t) => elbowGap(t) < 0.05), 'Hubble: the elbow stays whole (the lower arm turns about the same point the upper arm ends at)');
  // the arrays: one comes out whole, the other stops part-way and waits, then finishes; the booms unfold; before the release, none of it is out at the start
  const sc = (part, t) => { const ks = evOf(part).filter((e) => e.vehicle === 'hubble-berthed'); let v = null; for (const e of ks) if (e.t <= t) v = e.scale; return v ? v[1] : null; };
  check(sc('array-l', m.span[0]) < 0.1 && sc('array-r', m.span[0]) < 0.1, 'Hubble: both arrays are rolled up at the start');
  const jam = evOf('array-r').find((e) => e.scale && Math.abs(e.scale[1] - 0.38) < 1e-6);
  check(!!jam && sc('array-l', jam.t) === 1 && sc('array-r', rel - 3000) < 0.5, 'Hubble: the first array is out and the second stopped part-way, hours before the release');
  check(sc('array-r', rel - 5) === 1 && sc('array-l', rel - 5) === 1, 'Hubble: both arrays are out at the release');
  check(m.tracks.parts.some((e) => e.part === 'hga-l' && e.action === 'pose') && m.tracks.parts.some((e) => e.part === 'hga-r' && e.action === 'pose'), 'Hubble: both antenna booms unfold');
  // the orbit: a circle of 613 km at 28.45 degrees, 96.9 minutes round; the telescope and Discovery leave each other
  const orb = rowsOf(m, 'orbit'), hst = rowsOf(m, 'hst');
  const el = (r) => { const rr = r.slice(1, 4), v = r.slice(4, 7), rn = Math.hypot(...rr), a = 1 / (2 / rn - Math.hypot(...v) ** 2 / 398600.4418), h = [rr[1] * v[2] - rr[2] * v[1], rr[2] * v[0] - rr[0] * v[2], rr[0] * v[1] - rr[1] * v[0]]; return { alt: rn - 6371.0088, a, incl: Math.acos(h[2] / Math.hypot(...h)) * 180 / Math.PI, period: 2 * Math.PI * Math.sqrt(a ** 3 / 398600.4418) / 60 }; };
  const e0 = el(orb[0]);
  check(Math.abs(e0.alt - 613) < 3 && Math.abs(e0.incl - 28.45) < 0.01 && Math.abs(e0.period - 96.9) < 0.6, `Hubble: Discovery starts on a circle of 613 km at 28.45 degrees, ${e0.period.toFixed(1)} minutes round (${e0.alt.toFixed(1)} km, ${e0.incl.toFixed(2)} degrees)`);
  check(orb.every((r, i) => i === 0 || r[0] > orb[i - 1][0]) && hst.every((r, i) => i === 0 || r[0] > hst[i - 1][0]) && orb.concat(hst).every((r) => r.length === 7 && r.every(Number.isFinite)), 'Hubble: both paths have sorted, finite rows');
  const near = (rows, t) => { let b = rows[0]; for (const r of rows) if (Math.abs(r[0] - t) < Math.abs(b[0] - t)) b = r; return b; };
  const herm = (rows, t) => { let i = rows.findIndex((r) => r[0] >= t); if (i < 1) i = 1; const a = rows[i - 1], b = rows[i], h = b[0] - a[0], u = (t - a[0]) / h, u2 = u * u, u3 = u2 * u;
    return [1, 2, 3].map((k) => (2 * u3 - 3 * u2 + 1) * a[k] + (u3 - 2 * u2 + u) * h * a[k + 3] + (-2 * u3 + 3 * u2) * b[k] + (u3 - u2) * h * b[k + 3]); };
  const gap = (t) => { const a = herm(orb, t), b = herm(hst, t); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000; };
  check(gap(rel + 60) < 60 && gap(m.span[1]) > 1000, `Hubble: Discovery is within 60 m of the telescope a minute after the release (${gap(rel + 60).toFixed(0)} m) and more than a kilometre off at the end (${gap(m.span[1]).toFixed(0)} m)`);
  // the sun is on the telescope when it unrolls and when it is let go (the place along the orbit was chosen for that, and is said to be ours)
  const litAt = (t) => { const r = TR.add ? null : null; const row = near(orb, t), q = worldPositionKm('sun', Date.parse(m.epoch) + t * 1000, 'earth-inertial'), sn = Math.hypot(q.x, q.y, q.z), s = [q.x / sn, q.y / sn, q.z / sn], p = row.slice(1, 4), d = p[0] * s[0] + p[1] * s[1] + p[2] * s[2];
    return d > 0 || Math.hypot(p[0] - d * s[0], p[1] - d * s[1], p[2] - d * s[2]) > 6378.137; };
  const unrollL = m.tracks.parts.find((e) => e.part === 'array-l' && e.ease === 'smooth' && e.scale && e.scale[1] === 1).t;
  check([rel - 7400, unrollL - 120, jam.t - 60, rel - 1800, rel - 100, rel + 60, m.span[1] - 100].every(litAt), 'Hubble: Discovery is in sunlight at the lift out, the unrolling, the stop, the freeing, the release and the end');
  // honest about what is ours
  check(Object.values(m.trajectories).every((t) => t.truth === 'illustrative' && /ours/.test(t.source)), 'Hubble: the paths are illustrative and say what is ours');
  check(/\bours?\b/i.test(words.ready) && /ours/.test(words.release + words.pulses), 'Hubble: the first caption says the clocks are ours; the release and the pulses say where ours begins');
  check(m.tracks.audio.length === 0 && /No radio recording/.test(m.audio_note), 'Hubble: no audio plays, and the file says why');
  check(m.sources.length >= 3 && m.sources.every((x) => /^https:\/\//.test(x.url)), 'Hubble: sources');
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 360), 'Hubble: every caption is a sentence or two');
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 150 && play < 600, `Hubble: ${Math.round(play)} s of play time`);
  check(host.keepXZ && rms.keepXZ && hub.keepXZ && rms.rideOn.vehicle === 'discovery', 'Hubble: the arm and the telescope ride the orbiter in its own file frame');
}
// --- The first Falcon 9 landing (1.7.7, internal #1058 and #867): flight 20, ORBCOMM OG2 Mission 2
{
  const { m, words } = await load('falcon9-og2-2');
  const t = (p, a, v) => first(m, p, a, v);
  check(!!words && F.validateMoment(m, { words }).length === 0, `Falcon 9: valid, with its words (${words ? F.validateMoment(m, { words }).join('; ') : 'no words'})`);
  check(iso(m, 0) === '2015-12-22T01:29:00Z', 'Falcon 9: T-0 is the lift-off, 01:29:00 UTC on 22 December 2015 (8:29 p.m. EST on the 21st)');
  check(m.floodlit === true, 'Falcon 9: it flew in the dark, and the file says the rocket is lit by a lamp');
  // the published clock (SpaceX's press kit, and the reconstruction of the webcast): separation 2:25, second stage 2:34, fairing 2:48, boostback 3:47, entry burn 8:01 to 8:21, landing burn 9:11, landing 9:44
  const ig = (veh, from) => m.tracks.parts.filter((e) => e.vehicle === veh && e.part === 'booster' && e.action === 'ignite' && e.t > from).map((e) => e.t);
  check(t('stage2', 'ignite') === 154 && t('fairing-a', 'separate') === 168 && t('fairing-b', 'separate') === 168, 'Falcon 9: the second stage lights at T+2:34 and the fairing goes at T+2:48');
  check(m.vehicles.find((v) => v.id === 'booster').window[0] === 145 && m.vehicles.find((v) => v.id === 'booster-up').window[1] === 145, 'Falcon 9: the stages part at T+2:25');
  const bb = m.tracks.parts.filter((e) => e.vehicle === 'booster' && e.part === 'booster' && e.action === 'ignite');
  check(bb.length === 3 && Math.abs(bb[0].t + 1.5 - 227) < 1e-9 && bb[1].t === 481 && bb[2].t === 551, `Falcon 9: the boostback at T+3:47, the entry burn at T+8:01, the landing burn at T+9:11 (${bb.map((e) => e.t).join(', ')})`);
  const cut = m.tracks.parts.filter((e) => e.vehicle === 'booster' && e.part === 'booster' && e.action === 'cutoff');
  check(cut.length === 3 && cut[1].t === 501 && cut[0].t > 227 && cut[0].t < 270, `Falcon 9: the boostback burns less than a minute and the entry burn ends at T+8:21 (${cut.map((e) => e.t).join(', ')})`);
  check(bb[0].engines.length === 3 && bb[2].engines.length === 1 && bb.every((e) => e.engines.every((i) => i >= 0 && i < 9)), 'Falcon 9: three engines for the boostback and the entry burn, one for the landing, of nine');
  check(iso(m, 584) === '2015-12-22T01:38:44Z' && m.tracks.captions.some((c) => c.say === 'touch' && c.t >= 580 && c.t <= 584), 'Falcon 9: touchdown at T+9:44, 01:38:44 UTC');
  const poses = m.tracks.parts.filter((e) => e.action === 'pose');
  const legs = poses.filter((e) => /^leg-/.test(e.part)), fins = poses.filter((e) => /^fin-/.test(e.part));
  check(legs.length === 8 && legs.every((e) => e.t >= 551 && e.t <= 584) && fins.length === 8 && fins.every((e) => e.t > cut[0].t && e.t < 481), 'Falcon 9: four fins swing out after the boostback, four legs swing down in the landing burn');
  // the paths: the booster's ends where it should, the stage never under the ground, the apogee where the physics says, the speeds believable
  const rows = rowsOf(m, 'booster'), rows2 = rowsOf(m, 'stage2');
  check(rows.length > 200 && rows.every((r, i) => r.length === 7 && r.every(Number.isFinite) && (i === 0 || r[0] > rows[i - 1][0])), 'Falcon 9: the booster path has sorted, finite rows');
  const fixed = (r) => { const g = TR.siderealAt(Date.parse(m.epoch), r[0]), c = Math.cos(g), s_ = Math.sin(g); return [(r[1] * c + r[2] * s_) * 1000, (-r[1] * s_ + r[2] * c) * 1000, r[3] * 1000]; };
  const lz = TR.placeFrame({ lat: 28.48583, lon: -80.54444, alt: 3 }).ecef;
  const end = rows[rows.length - 1], fe = fixed(end);
  check(end[0] === 584 && Math.hypot(fe[0] - lz[0], fe[1] - lz[1], fe[2] - lz[2]) < 80, `Falcon 9: the last row is the touchdown, on Landing Zone 1 (${Math.hypot(fe[0] - lz[0], fe[1] - lz[1], fe[2] - lz[2]).toFixed(0)} m off)`);
  const rel = (r) => { const v = [r[4] * 1000 + 7.2921159e-5 * r[2] * 1000, r[5] * 1000 - 7.2921159e-5 * r[1] * 1000, r[6] * 1000]; return Math.hypot(...v); };
  check(rel(end) < 3, `Falcon 9: it is at rest at touchdown (${rel(end).toFixed(2)} m/s against the ground)`);
  const rLoc = Math.hypot(...TR.placeFrame({ lat: 28.5619, lon: -80.5772, alt: 0 }).ecef) / 1000;
  const hts = rows.map((r) => Math.hypot(r[1], r[2], r[3]) - rLoc);
  const apo = Math.max(...hts);
  check(apo > 150 && apo < 260 && Math.min(...hts) > -4, `Falcon 9: the stage tops out at ${apo.toFixed(0)} km and is never below the ground`);
  check(Math.max(...rows.map(rel)) < 2500, 'Falcon 9: never faster than 2.5 km/s against the ground');
  // MECO is where the published numbers put it: 75 km and 1.67 km/s (the ascent is a profile: its own track says)
  const ascent = m.trajectories.ascent, pts = ascent.points, tr = TR.profileTrack({ points: pts, azimuth: ascent.azimuth }, { azimuth: ascent.azimuth });
  const sm = tr.stateAt(143);
  check(Math.abs(sm.altM - 75000) < 600 && Math.abs(Math.hypot(...sm.v) - 1670) < 25, `Falcon 9: main engine cut-off at ${(sm.altM / 1000).toFixed(1)} km and ${Math.hypot(...sm.v).toFixed(0)} m/s (75 km and 1.67 km/s published)`);
  check(rows[0][0] === 145 && rows2[0][0] === 145 && Math.abs(Math.hypot(rows[0][1] - rows2[0][1], rows[0][2] - rows2[0][2], rows[0][3] - rows2[0][3]) * 1000 - 41.65) < 0.5, 'Falcon 9: the second stage leaves 41.65 m up the stack from the first stage, at the same second');
  check(Math.max(...rows2.map((r) => Math.hypot(r[4], r[5], r[6]))) < 8, 'Falcon 9: the second stage stays under orbital speed within the picture');
  check(m.tracks.audio.length === 0 && /No recording/.test(m.audio_note), 'Falcon 9: no audio plays, and the file says why');
  check(Object.values(m.trajectories).every((x) => x.truth === 'illustrative' && /ours/.test(x.source)), 'Falcon 9: every path is illustrative and says what is ours');
  check(m.places && m.places.length === 1 && Math.abs(m.places[0].place.lat - 28.48583) < 1e-4 && m.places[0].place.ground.pad === 'landing', 'Falcon 9: the ground changes to Landing Zone 1 before the landing');
  check(m.sources.length >= 3 && m.sources.every((x) => /^https:\/\//.test(x.url)), 'Falcon 9: sources');
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 360), 'Falcon 9: every caption is a sentence or two');
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 120 && play < 400, `Falcon 9: ${Math.round(play)} s of play time`);
  // the reusable part: another flight is a record and its words
  const gen = readFileSync(join(ROOT, 'tools/moments-build/falcon9-flight.mjs'), 'utf8');
  check(/export function buildFalcon9Moment\(/.test(gen) && /buildFalcon9Moment\(flight/.test(readFileSync(join(ROOT, 'tools/moments-build/falcon9-og2-2.mjs'), 'utf8')), 'Falcon 9: the builder takes a flight record (the next flight is a record and its words)');
}
// --- the shelf and the entry points (C8): read from the data, so the test names what is missing
{
  const shelf = await mod('moments/shelf.js');
  for (const id of ['vostok-1', 'apollo-11', 'artemis-ii', 'hubble-deployment', 'falcon9-og2-2']) check(shelf.SHELF.some((s) => s.id === id && existsSync(join(ROOT, 'site/data/moments', `${id}.json`))), `the shelf lists ${id}`);
  for (const rec of ['saturn-v-lc-39a', 'apollo-11', 'shuttle-lc-39b', 'sat-20580', 'spacex-slc-40', 'falcon-lz-1']) check(!!shelf.momentFor(rec), `the card of ${rec} offers its moment`);
}
// --- the shelf looks and behaves like the trips (release 1.7.7): a picture under every card, four shown, "All {n} moments" / "Fewer moments"
{
  const shelf = await mod('moments/shelf.js');
  const { BUDGETS } = await mod('data/budgets.js');
  const webpSize = (b) => {
    if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') return null;
    const kind = b.toString('ascii', 12, 16), body = b.subarray(20);
    if (kind === 'VP8 ') return [body.readUInt16LE(6) & 0x3fff, body.readUInt16LE(8) & 0x3fff];
    if (kind === 'VP8L') { const v = body.readUInt32LE(1); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1]; }
    if (kind === 'VP8X') return [body.readUIntLE(4, 3) + 1, body.readUIntLE(7, 3) + 1];
    return null;
  };
  // THE FILES: every SHELF story has its picture, a WebP of 640 x 360 within the trip pictures' budget, and names the second it was taken at.
  const dir = join(ROOT, 'site/images/moments');
  for (const s of shelf.SHELF) {
    const path = join(dir, `${s.id}.webp`);
    check(Number.isFinite(s.picture), `the shelf row of ${s.id} names its picture second (\`picture\`), so the same command can render it again`);
    if (!existsSync(path)) { check(false, `site/images/moments/${s.id}.webp is missing: its card would have no picture`); continue; }
    const b = readFileSync(path), wh = webpSize(b);
    check(!!wh && wh[0] === 640 && wh[1] === 360, `${s.id}.webp is ${wh && wh.join(' x ')}, not a WebP of 640 x 360`);
    check(b.length <= BUDGETS.trip_picture_bytes, `${s.id}.webp is ${b.length} B, over trip_picture_bytes (${BUDGETS.trip_picture_bytes})`);
  }
  if (existsSync(dir)) for (const f of readdirSync(dir)) check(shelf.SHELF.some((s) => `${s.id}.webp` === f), `site/images/moments/${f} belongs to no story on the shelf`);
  // THE SHELF, drawn into a minimal document: four cards each with its picture, the button shows them all and back.
  class El {
    constructor(tag) { this.tagName = tag.toUpperCase(); this.children = []; this.dataset = {}; this.attrs = {}; this.listeners = {}; this.hidden = false; this.textContent = ''; this.className = ''; this.style = { setProperty() {} }; this.isConnected = false; }
    get firstChild() { return this.children[0] || null; }
    append(...n) { this.children.push(...n); }
    appendChild(n) { this.children.push(n); return n; }
    removeChild(n) { this.children.splice(this.children.indexOf(n), 1); return n; }
    contains(n) { return n === this || this.children.some((c) => c.contains && c.contains(n)); }
    setAttribute(k, v) { this.attrs[k] = String(v); }
    getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
    addEventListener(t, f) { (this.listeners[t] ||= []).push(f); }
    click() { for (const f of this.listeners.click || []) f(); }
    querySelector(sel) { return this.children.find((c) => c.tagName === sel.toUpperCase()) || null; }
    focus() {}
  }
  globalThis.document = { createElement: (t) => new El(t), activeElement: null };
  const host = new El('section');
  host.appendChild(new El('h2'));
  const opened = [];
  shelf.mountShelf(host, { wantMoment: (id) => opened.push(id) });
  const grid = host.children.find((c) => /sr-momentgrid/.test(c.className));
  const more = host.children.find((c) => c.tagName === 'BUTTON');
  const words = COPY.momentShelf;
  const all = shelf.SHELF.filter((s) => words.cards[s.id]);
  check(shelf.MOMENTS_SHOWN === 4 && all.length > 4, `the shelf shows ${shelf.MOMENTS_SHOWN} of ${all.length} stories (the trips show 4)`);
  check(!!grid && grid.children.length === 4, `closed, the shelf shows 4 cards, not ${grid && grid.children.length}`);
  check(!!more && more.className === 'sr-more' && !more.hidden, 'the button is the trips\' .sr-more and is shown');
  check(more && more.textContent === `All ${all.length} moments` && more.getAttribute('aria-expanded') === 'false', `closed, the button says "All ${all.length} moments" with aria-expanded=false (it says "${more && more.textContent}")`);
  const cardIds = () => grid.children.map((c) => c.dataset.moment);
  check(cardIds().join() === all.slice(0, 4).map((s) => s.id).join(), 'the first four are the first four of the shelf, in its order');
  for (const c of grid.children) {
    const pic = c.children[0];
    check(pic && pic.tagName === 'IMG' && pic.className === 'sr-tripcard__pic' && pic.alt === '' && pic.getAttribute('aria-hidden') === 'true' && pic.dataset.src === `images/moments/${c.dataset.moment}.webp`, `${c.dataset.moment}: the card has its picture first, decorative, from images/moments/${c.dataset.moment}.webp`);
    check(pic && !pic.getAttribute('src'), `${c.dataset.moment}: the picture is not fetched when the card is drawn (it waits for the gate and the screen)`);
  }
  more.click();
  check(grid.children.length === all.length && cardIds().join() === all.map((s) => s.id).join(), `opened, the shelf shows all ${all.length} cards in the shelf's order`);
  check(more.textContent === 'Fewer moments' && more.getAttribute('aria-expanded') === 'true', 'opened, the button says "Fewer moments" with aria-expanded=true');
  check(grid.children.every((c) => c.children[0].tagName === 'IMG'), 'every opened card has its picture');
  more.click();
  check(grid.children.length === 4 && more.textContent === `All ${all.length} moments` && more.getAttribute('aria-expanded') === 'false', 'pressed again, the shelf is back to 4 and the button to "All n moments"');
  grid.children[1].click();
  check(opened.join() === all[1].id, 'a card still opens its Moment');
  // THE WORDS: the copy carries the two lines, and the four translated files carry them too.
  check(words.all === 'All {n} moments' && words.fewer === 'Fewer moments', 'COPY.momentShelf has all and fewer');
  for (const code of ['es', 'fr', 'de', 'pt']) {
    const lang = await mod(`copy/${code}.js`);
    const w = lang.COPY.momentShelf;
    check(w && /\{n\}/.test(w.all || '') && typeof w.fewer === 'string' && w.fewer.trim() !== '' && w.fewer !== words.fewer, `${code}: the shelf's "all {n} moments" and "fewer" are translated`);
  }
  delete globalThis.document;
}
if (problems.length) { for (const p of problems) console.error(`::error::${p}`); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log('moment stories ok: Curiosity\'s entry (the JPL clock, 131 km and 5.9 km/s, the parachute at 11 km, the 7.6 m bridle, the landing on Bradbury Landing, the Martian Sun), New Horizons\' pass of Pluto (JPL\'s track, 12 500 km, the lit side, Charon 14 minutes later), then Vostok 1, Apollo 11 and Artemis II: event order and times, parts of their models, the landing on the Moon\'s ground, the flyby at 6 545 km, planned times said to be planned');
console.log('moment stories ok: the first Falcon 9 landing (the clock, MECO at 75 km and 1.67 km/s, the landing on Landing Zone 1 at rest, the fins and legs), Hubble\'s deployment (the arm holds the telescope, the arrays, the orbit, the sun, the release at 19:38:00), Vostok 1, Apollo 11 and Artemis II: event order and times, parts of their models, the landing on the Moon\'s ground, the flyby at 6 545 km, planned times said to be planned');
