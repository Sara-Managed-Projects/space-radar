#!/usr/bin/env node
// tests/test_moment_stories.mjs -- the three stories of the Moments (release 1.6.0, internal spec 0079 stages C5 to C7,
// internal #1054, #1055, #1056): Vostok 1, Apollo 11, Artemis II. For each: its event order and its times against the
// published ones (UTC, from the moment's own epoch), every part event naming a part of the model it is for, every vehicle
// event inside the vehicle's window, the paths' rows sorted, finite and at believable speeds, the landing on the Moon's
// own ground, the flyby at the far side's distance, what is planned said to be planned, the audio's size and credit.
//   node tests/test_moment_stories.mjs
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
  const clip = m.tracks.audio.find((a) => a.src);
  check(clip && existsSync(join(ROOT, 'site', clip.src)) && statSync(join(ROOT, 'site', clip.src)).size < 120000 && clip.t > step && clip.t < step + 60, 'Apollo 11: the NASA clip is under 120 kB and plays within a minute of the first step');
  check(/a11-small-step/.test(readFileSync(join(ROOT, 'CREDITS.md'), 'utf8')), 'Apollo 11: the clip has a CREDITS.md line');
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
// --- the shelf and the entry points (C8): read from the data, so the test names what is missing
{
  const shelf = await mod('moments/shelf.js');
  for (const id of ['vostok-1', 'apollo-11', 'artemis-ii']) check(shelf.SHELF.some((s) => s.id === id && existsSync(join(ROOT, 'site/data/moments', `${id}.json`))), `the shelf lists ${id}`);
  for (const rec of ['saturn-v-lc-39a', 'apollo-11', 'shuttle-lc-39b']) check(!!shelf.momentFor(rec), `the card of ${rec} offers its moment`);
}
if (problems.length) { for (const p of problems) console.error(`::error::${p}`); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log('moment stories ok: Vostok 1, Apollo 11 and Artemis II: event order and times, parts of their models, the landing on the Moon\'s ground, the flyby at 6 545 km, planned times said to be planned');
