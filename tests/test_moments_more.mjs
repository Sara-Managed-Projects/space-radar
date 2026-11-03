#!/usr/bin/env node
// tests/test_moments_more.mjs -- the Moments of release 1.7.0 (internal #1058): Apollo 13. For each: its event order and its times against the
// Mission Report's (UTC, from the moment's own epoch), every part event naming a part of the model it is for, every vehicle event inside the
// vehicle's window, the paths' rows sorted, finite and at believable speeds, the flyby where the Report puts it, the return to the entry point
// and the landing, what is drawn and not measured said so, the radio clips' size and credit, the shelf and the cards.
//   node tests/test_moments_more.mjs
import { readFileSync, existsSync, statSync } from 'node:fs';
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
const at = (rows, t) => { let i = rows.findIndex((r) => r[0] >= t); if (i < 1) i = 1; const a = rows[i - 1], b = rows[i], u = (t - a[0]) / (b[0] - a[0]); return [1, 2, 3, 4, 5, 6].map((k) => a[k] + (b[k] - a[k]) * u); };
const G = (h, m, s) => h * 3600 + m * 60 + s;

// the checks every story of this file shares (the same as test_moment_stories.mjs makes of the first three)
const common = async (id, cover) => {
  const { m, words } = await load(id);
  check(!!words && F.validateMoment(m, { words }).length === 0, `${id}: valid, with its words (${words ? F.validateMoment(m, { words }).join('; ') : 'no words'})`);
  const byVehicle = new Map(m.vehicles.map((v) => [v.id, v]));
  for (const e of m.tracks.parts) {
    const v = byVehicle.get(e.vehicle);
    check(!!v, `${id}: the event at ${e.t} names a vehicle`);
    if (!v) continue;
    const parts = partsOf(v.model);
    check(parts.includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} at ${e.t} is a part of ${v.model} (${parts.join(', ')})`);
    check(!v.parts || v.parts.includes(e.part) || (v.chutes && e.part in v.chutes), `${id}: ${e.part} is in vehicle ${v.id}'s own parts list`);
    if (v.window && e.action !== 'hide' && e.action !== 'show') check(e.t >= v.window[0] - 1e-6 && e.t <= v.window[1] + 1e-6, `${id}: ${v.id} ${e.part} ${e.action} at ${e.t} is inside its window ${v.window}`);
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
    check(rows.length > 50 && rows.every((r, i) => r.length === 7 && r.every(Number.isFinite) && (i === 0 || r[0] > rows[i - 1][0])), `${id}: path ${name} has sorted, finite rows`);
    check(rows.every((r) => Math.hypot(r[4], r[5], r[6]) < 13.5), `${id}: path ${name} never faster than 13.5 km/s`);
    check(rows.every((r) => Math.hypot(r[1], r[2], r[3]) > 6360), `${id}: path ${name} never under the Earth's surface`);
    check(rows.every((r) => Math.hypot(r[1], r[2], r[3]) < 420000), `${id}: path ${name} never farther than 420 000 km from the Earth`);
    const c = cover[name] || [0, 0];
    check(rows[0][0] <= c[0] && rows[rows.length - 1][0] >= c[1], `${id}: path ${name} covers its part of the span (${rows[0][0]} to ${rows[rows.length - 1][0]})`);
  }
  let play = 0; for (const q of m.pace) play += (q.to - q.from) / q.rate;
  check(play > 150 && play < 900, `${id}: ${Math.round(play)} s of play time`);
  check(m.sources.length >= 2 && m.sources.every((s) => /^https:\/\//.test(s.url)), `${id}: sources`);
  check(m.sources.every((s) => (words[s.say] || '').length > 10), `${id}: every source has its words`);
  check(m.tracks.captions.every((c) => (words[c.say] || '').length > 20 && words[c.say].length < 330), `${id}: every caption is a sentence or two`);
  check(Object.values(m.trajectories).every((t) => t.truth === 'reconstructed' || t.truth === 'illustrative'), `${id}: no path claims to be measured`);
  check(m.chapters.every((c) => !!words[c.say]), `${id}: every chapter has its words`);
  return { m, words };
};

// --- Apollo 13 -------------------------------------------------------------------------------------------------------------------
{
  const T = { ins: 750, tli0: G(2, 35, 46.4), boom: G(55, 54, 53), mcc2: G(61, 29, 43.5), tei0: G(79, 27, 39), smsep: G(138, 1, 48), undock: G(141, 30, 0), ei: G(142, 40, 46), splash: G(142, 54, 41) };
  const { m, words } = await common('apollo-13', { ivb: [800, 15000], csm: [15000, T.splash], lm: [15000, T.ei], sm: [T.smsep, T.smsep + 3000] });
  const t = (p, a, v) => first(m, p, a, v);
  const tMain = (p, a) => (m.tracks.parts.find((e) => e.part === p && e.action === a && !e.engines && e.vehicle === 'saturn') || {}).t;   // the stage's own cut-off, not an engine's
  check(iso(m, 0) === '1970-04-11T19:13:00Z', 'Apollo 13: T-0 is 19:13:00 UTC on 11 April 1970 (range zero)');
  // the launch, in the Mission Report's order and to the second
  const order = [t('s-ic', 'cutoff'), t('s-ii', 'ignite'), t('les-tower', 'separate'), tMain('s-ii', 'cutoff'), t('s-ivb', 'ignite', 'saturn'), t('s-ivb', 'cutoff', 'saturn'), t('s-ivb', 'ignite', 'ivb'), t('sla-1', 'separate'), t('sm-panel-4', 'separate'), t('descent-stage', 'ignite', 'lm'), t('service-module', 'hide', 'csm'), t('drogue', 'deploy'), t('main', 'deploy')];
  check(order.every((x, i) => Number.isFinite(x) && (i === 0 || x >= order[i - 1])), `Apollo 13: the events come in flight order (${order.join(', ')})`);
  check(t('s-ic', 'cutoff') === 164 && t('s-ii', 'ignite') === 165 && t('les-tower', 'separate') === 201, 'Apollo 13: S-IC cut-off 2:44, S-II ignition 2:45, escape tower 3:21');
  const ceco = m.tracks.parts.find((e) => e.part === 's-ii' && e.action === 'cutoff' && e.engines);
  check(ceco && Math.abs(ceco.t - 330.6) < 0.01, 'Apollo 13: the S-II centre engine cuts off early, at 330.6 s');
  check(tMain('s-ii', 'cutoff') === 593 && t('s-ivb', 'ignite', 'saturn') === 594 && t('s-ivb', 'cutoff', 'saturn') === 750, 'Apollo 13: S-II cut-off 9:53, S-IVB 9:54 to 12:30');
  check(t('s-ivb', 'ignite', 'ivb') === G(2, 35, 46.4) && Math.abs(t('s-ivb', 'cutoff', 'ivb') - G(2, 41, 47.2)) < 11, 'Apollo 13: the translunar burn from 2:35:46');
  check(t('sla-1', 'separate') === G(3, 6, 39), 'Apollo 13: the adapter opens at 3:06:39');
  // the incident, the radio and the lifeboat
  check(iso(m, t('sm-panel-4', 'separate')) === '1970-04-14T03:07:53Z', `Apollo 13: the panel goes at 55:54:53, 03:07:53 UTC on 14 April (${iso(m, t('sm-panel-4', 'separate'))})`);
  check(t('sm-bay-foil', 'show') === t('sm-panel-4', 'separate') && m.tracks.parts.some((e) => e.part === 'sm-bay-foil' && e.action === 'hide' && e.t < t('sm-panel-4', 'separate')), 'Apollo 13: the torn foil is hidden until the panel goes, and shown with it');
  check(m.tracks.parts.find((e) => e.part === 'sm-panel-4' && e.action === 'separate').puffs, 'Apollo 13: the bay vents when the panel goes');
  check(t('sm-panel-4', 'hide') > t('sm-panel-4', 'separate') && t('sm-panel-4', 'hide') - t('sm-panel-4', 'separate') < 200, 'Apollo 13: the panel is gone from view within minutes (it is a straight-line fall, not worth following for hours)');
  const clips = m.tracks.audio.filter((a) => a.src);
  check(clips.length === 2 && clips.every((c) => existsSync(join(ROOT, 'site', c.src)) && statSync(join(ROOT, 'site', c.src)).size < 60000), 'Apollo 13: the two radio lines are under 60 kB each');
  check(iso(m, clips[0].t) === '1970-04-14T03:08:20Z' && iso(m, clips[1].t) === '1970-04-14T03:08:42Z', `Apollo 13: the lines are cued at 55:55:20 and 55:55:42 (${clips.map((c) => iso(m, c.t)).join(', ')})`);
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(/a13-problem-1/.test(credits) && /a13-problem-2/.test(credits) && /Houston_problem/.test(credits), 'Apollo 13: the radio clips have CREDITS.md lines');
  const audioYaml = readFileSync(join(ROOT, 'registry/audio.yaml'), 'utf8');
  check(/id: a13-problem-1/.test(audioYaml) && /id: a13-problem-2/.test(audioYaml), 'Apollo 13: the radio clips are rows of registry/audio.yaml');
  check(t('descent-stage', 'ignite', 'lm') === T.mcc2, 'Apollo 13: the lunar module\'s descent engine lights for the 61:29:43 burn');
  const burn = m.tracks.parts.filter((e) => e.part === 'descent-stage' && e.vehicle === 'lm');
  const tei0 = burn.find((e) => e.action === 'ignite' && Math.abs(e.t - T.tei0) < 1), tei1 = burn.find((e) => e.action === 'cutoff' && e.t > T.tei0 && e.t < T.tei0 + 400);
  check(tei0 && tei1 && Math.abs(tei1.t - tei0.t - 263.8) < 0.2, 'Apollo 13: the trans-earth burn is 263.8 s long, from 79:27:39');
  check(iso(m, T.smsep) === '1970-04-17T13:14:48Z' && t('service-module', 'hide', 'csm') === T.smsep, 'Apollo 13: the service module is let go at 138:01:48');
  check(m.vehicles.some((v) => v.id === 'sm' && v.window[0] === T.smsep) && t('command-module', 'hide', 'sm') === T.smsep, 'Apollo 13: the spent module is a vehicle of its own, without the command module');
  check(iso(m, T.ei) === '1970-04-17T17:53:46Z', `Apollo 13: entry interface at 142:40:46 (${iso(m, T.ei)})`);
  check(iso(m, m.span[1]) === '1970-04-17T18:07:41Z', 'Apollo 13: it ends at the landing, 18:07:41 UTC on 17 April');
  // the paths
  const csm = rowsOf(m, 'csm');
  const rAt = (tt) => { const p = at(csm, tt); return Math.hypot(p[0], p[1], p[2]); };
  // the farthest and the nearest to the Moon
  let far = 0, near = 1e9, tNear = 0;
  for (const r of csm) { if (r[0] < G(70, 0, 0) || r[0] > G(85, 0, 0)) continue; far = Math.max(far, Math.hypot(r[1], r[2], r[3])); const mo = moonKm(m, r[0]); const d = Math.hypot(r[1] - mo[0], r[2] - mo[1], r[3] - mo[2]) - 1737.4; if (d < near) { near = d; tNear = r[0]; } }
  check(Math.abs(far - 406542) < 1500, `Apollo 13: the greatest distance from the Earth's centre is ${far.toFixed(0)} km (400 171 reported from the surface: 406 542)`);
  check(near > 200 && near < 330 && Math.abs(tNear - G(77, 28, 0)) < 900, `Apollo 13: the Moon is passed ${near.toFixed(0)} km up at ${((tNear) / 3600).toFixed(2)} h (the Report: about 254 km at about 77:28)`);
  check(Math.abs(rAt(T.boom) - 328230) < 12000, `Apollo 13: at the incident the craft is ${rAt(T.boom).toFixed(0)} km from the Earth's centre (about 200 000 miles from the surface, said by the recording's archive)`);
  // the trans-earth burn changes the velocity by about the reported 262 m/s (the path's own is a little more)
  const v0 = at(csm, T.tei0 - 20).slice(3), v1 = at(csm, T.tei0 + 263.8 + 20).slice(3);
  const dv = Math.hypot(v1[0] - v0[0], v1[1] - v0[1], v1[2] - v0[2]) * 1000;
  check(dv > 200 && dv < 380, `Apollo 13: the burn at the Moon changes the velocity by ${dv.toFixed(0)} m/s (262 reported; the path is a reconstruction)`);
  // the entry: 122 km up at the entry interface, and the capsule at 21 38 S 165 22 W at the end
  const eiP = at(csm, T.ei), g1 = TR.siderealAt(Date.parse(m.epoch), T.ei);
  check(Math.abs(Math.hypot(eiP[0], eiP[1], eiP[2]) - 6371 - 122) < 12, `Apollo 13: 122 km up at the entry interface (${(Math.hypot(eiP[0], eiP[1], eiP[2]) - 6371).toFixed(0)})`);
  const lat1 = Math.asin(eiP[2] / Math.hypot(eiP[0], eiP[1], eiP[2])) * 180 / Math.PI, lon1 = (((Math.atan2(eiP[1], eiP[0]) - g1) * 180 / Math.PI + 540) % 360) - 180;
  check(Math.abs(lat1 + 28.23) < 0.4 && Math.abs(((lon1 - 173.44 + 540) % 360) - 180) < 0.6, `Apollo 13: entry at 28.2 S 173.4 E (${lat1.toFixed(2)}, ${lon1.toFixed(2)})`);
  const end = csm[csm.length - 1], g = TR.siderealAt(Date.parse(m.epoch), end[0]);
  const lat = Math.asin(end[3] / Math.hypot(end[1], end[2], end[3])) * 180 / Math.PI, lon = (((Math.atan2(end[2], end[1]) - g) * 180 / Math.PI + 540) % 360) - 180;
  check(Math.abs(lat + 21.64) < 0.2 && Math.abs(lon + 165.36) < 0.3, `Apollo 13: the capsule is at 21.64 S 165.36 W at the end (${lat.toFixed(2)}, ${lon.toFixed(2)})`);
  // the lunar module is docked to the capsule until it is let go
  const lm = rowsOf(m, 'lm');
  const gap = (tt) => { const a = at(lm, tt), b = at(csm, tt); return Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]) * 1000; };
  check(Math.abs(gap(T.boom) - 16.1) < 1.5 && Math.abs(gap(T.mcc2 + 4000) - 16.1) < 1.5 && gap(T.ei) > 200, 'Apollo 13: the lunar module is docked, 16 m from the capsule\'s origin, until 141:30 and drifts off after');
  // what is drawn and not measured, said so
  check(/trim/.test(words.pathTrip) && /illustrative/.test(words.pathSm) && /not drawn|drawn, not measured/.test(`${words.mcc4} ${words.bang}`), 'Apollo 13: the trim of the injection speed, the drift of the module and the panel\'s flight are said to be ours');
  check(/Wikimedia Commons/.test(words.srcClip) && /public domain/.test(words.srcClip) && /AS13-59-8500/.test(words.srcPhoto), 'Apollo 13: the clips and the photograph are credited in the story\'s own words');
  check(/Mission Report/.test(m.trajectories.csm.source) && /trim|Lambert/.test(`${m.trajectories.csm.source} ${words.pathTrip}`), 'Apollo 13: the track cites the Mission Report');
  // the model's new parts
  const cparts = partsOf('apollo-csm');
  check(cparts.includes('sm-panel-4') && cparts.includes('sm-bay-foil'), 'Apollo 13: the CSM model has the panel and the foil as parts');
  const csmv = m.vehicles.find((v) => v.id === 'csm');
  check(csmv.parts.includes('sm-panel-4') && csmv.parts.includes('sm-bay-foil'), 'Apollo 13: the capsule vehicle lists them');
  // Apollo 11 must keep the foil hidden: the bay is not its story
  const a11 = JSON.parse(readFileSync(join(ROOT, 'site/data/moments/apollo-11.json'), 'utf8'));
  check(a11.tracks.parts.some((e) => e.part === 'sm-bay-foil' && e.action === 'hide' && e.vehicle === 'csm'), 'Apollo 11: the torn foil of bay 4 is hidden (it is the story of Apollo 13)');
}

// --- the shelf and the cards ------------------------------------------------------------------------------------------------
{
  const shelf = await mod('moments/shelf.js');
  for (const id of ['apollo-13']) {
    check(shelf.SHELF.some((s) => s.id === id && existsSync(join(ROOT, 'site/data/moments', `${id}.json`))), `the shelf lists ${id}`);
    check(!!COPY.momentShelf.cards[id] && COPY.momentShelf.cards[id].title && COPY.momentShelf.cards[id].blurb, `the shelf has the words of ${id}`);
  }
  const both = shelf.momentsFor('saturn-v-lc-39a').map((s) => s.id);
  check(both.includes('apollo-11') && both.includes('apollo-13'), `Launch Complex 39A carries Apollo 11 and Apollo 13 (${both.join(', ')})`);
  const rocket = { id: 'launch-x', layer: 'launches', name: 'Saturn V | something', meta: { rocket: 'Saturn V', rocketFamily: 'Saturn', rocketFamilyPath: ['Saturn'] } };
  check(shelf.momentsForRecord(rocket).map((s) => s.id).join() === 'apollo-11,apollo-13', 'a Saturn V card offers both Apollo stories, Apollo 11 first');
  check(shelf.momentsForRecord({ id: 'csm-1', layer: 'stations', name: 'Apollo CSM Odyssey' }).map((s) => s.id).includes('apollo-13'), 'the Apollo command and service module card offers Apollo 13');
  check(shelf.momentsForRecord({ id: 'lm-1', layer: 'notable', name: 'Lunar Module Aquarius' }).map((s) => s.id).includes('apollo-13'), 'the lunar module card offers Apollo 13');
  check(shelf.momentsForRecord({ id: 'sat-1', layer: 'active', name: 'STARLINK-1234' }).length === 0 && shelf.momentsForRecord(null).length === 0, 'a Starlink and no record offer nothing');
  check(shelf.momentForRecord(rocket)?.id === 'apollo-11', 'the single-story door still gives the first');
  const cards = readFileSync(join(ROOT, 'site/js/ui/cards.js'), 'utf8');
  check(/momentsForRecord\(record\)/.test(cards) && /for \(const story of stories\)/.test(cards), 'the card builds one Replay row a story');
}

if (problems.length) { for (const p of problems) console.error(`::error::${p}`); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log('more moments ok: Apollo 13 (event order and times, the incident and the two radio lines, the Moon passed at 254 km on the far side, the burn home, entry and landing at 21.6 S 165.4 W), the shelf and the cards');
