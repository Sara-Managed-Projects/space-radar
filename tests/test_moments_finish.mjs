#!/usr/bin/env node
// tests/test_moments_finish.mjs -- what release 1.6.2 added to the Moments (internal #1054 to #1057, public #548):
//   * Gagarin's Start (Baikonur Site 1) is a hand-kept pad and the Vostok 1 landing site a named place, each with a cited
//     position that agrees with the Moment's own to 30 m, and each offers the Replay row;
//   * a vehicle's card offers its story (the SLS, the Saturn V, the Apollo CSM and LM, Orion, the R-7 of Vostok), by the words
//     the record carries and never by a guess: a Soyuz-2, the constellation Orion and a Starlink do not;
//   * the Moments' words exist in es, fr, de and pt, with the same {slots} as the English, and say they are machine-drafted;
//   * the three story files hand their words to the language hook;
//   * the onboarding row names the new doors; the Kennedy trip exists and its stops are on the pads they name.
//   node tests/test_moments_finish.mjs
import { readFileSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const mod = (p) => import(pathToFileURL(join(ROOT, 'site/js', p)).href);
const src = (p) => readFileSync(join(ROOT, p), 'utf8');

// --- the two places ---------------------------------------------------------------------------------------------------
const { SITES } = await mod('data/sites.js');
const shelf = await mod('moments/shelf.js');
const km = (a, b) => {
  const r = Math.PI / 180, dl = (b.lon - a.lon) * r, p1 = a.lat * r, p2 = b.lat * r;
  return 6371.0088 * Math.acos(Math.min(1, Math.sin(p1) * Math.sin(p2) + Math.cos(p1) * Math.cos(p2) * Math.cos(dl)));
};
const vostok = JSON.parse(src('site/data/moments/vostok-1.json'));
const pad = SITES.find((s) => s.id === 'baikonur-site-1');
const landing = SITES.find((s) => s.id === 'vostok-1-landing');
check(pad && pad.class === 'pad' && pad.world === 'earth' && !pad.liftoffs, 'baikonur-site-1 is a pad on Earth with no vehicle standing on it');
check(landing && landing.class === 'feature' && landing.world === 'earth' && !landing.shape && !landing.landed, 'vostok-1-landing is a named place on Earth (a feature), not a machine');
const yaml = src('registry/sites.yaml');
check(/wikipedia-vostok-1:\n\s+url: "https:\/\/en\.wikipedia\.org\/wiki\/Vostok_1"\n\s+read: 2026-11-03/.test(yaml), 'the two places cite one reference with a URL and the date it was read');
check(/id: baikonur-site-1[^\n]*source: wikipedia-vostok-1/.test(yaml) && /id: vostok-1-landing[^\n]*source: wikipedia-vostok-1/.test(yaml), 'each row names that source');
// the reference's own digits: 45.920278 N 63.342222 E and 51.270682 N 45.99727 E
if (pad) check(km(pad, { lat: 45.920278, lon: 63.342222 }) < 0.03, 'the pad is where the cited reference puts it (to 30 m)');
if (landing) check(km(landing, { lat: 51.270682, lon: 45.99727 }) < 0.03, 'the landing site is where the cited reference puts it (to 30 m)');
// ... and where the Moment draws them
const engineLand = (vostok.places || []).map((p) => p.place).find((p) => /Smelovka/.test(p.name));
if (landing && engineLand) check(km(landing, engineLand) < 0.05, `the landing site agrees with the Moment's own field (${km(landing, engineLand).toFixed(3)} km apart)`);
const start = vostok.place;
check(start && /Site 1/.test(start.name), 'the Moment starts on Site 1');
if (pad && start) check(km(pad, start) < 0.05, `the pad agrees with the Moment's own start (${km(pad, start).toFixed(3)} km apart)`);
for (const id of ['baikonur-site-1', 'vostok-1-landing']) {
  const s = shelf.momentFor(id);
  check(s && s.id === 'vostok-1', `the card of ${id} offers Vostok 1`);
  check(shelf.momentForRecord({ id, layer: 'hand-kept-sites' })?.id === 'vostok-1', `momentForRecord finds it for ${id}`);
}

// --- the vehicles' cards ----------------------------------------------------------------------------------------------
const launch = (rocket, family, path) => ({ id: 'launch-x', layer: 'launches', name: `${rocket} | something`, meta: { rocket, rocketFamily: family || null, rocketFamilyPath: path || (family ? [family] : []) } });
const want = (rec, id, what) => { const s = shelf.momentForRecord(rec); check((s ? s.id : null) === id, `${what}: wanted ${id}, got ${s ? s.id : null}`); };
want(launch('Space Launch System Block 1', 'Space Launch System'), 'artemis-ii', 'an SLS launch card');
want(launch('SLS Block 1B Crew', null), 'artemis-ii', 'an SLS Block 1B launch card by its name');
want(launch('Saturn V', 'Saturn'), 'apollo-11', 'a Saturn V card');
want(launch('Vostok-K', 'Vostok'), 'vostok-1', 'a Vostok-K card');
want(launch('R-7 Semyorka', 'R-7'), 'vostok-1', 'an R-7 card');
want({ id: 'orion-1', layer: 'deep-space', name: 'Orion Artemis II' }, 'artemis-ii', 'the Orion capsule on the deep-space layer');
want({ id: 'csm-1', layer: 'stations', name: 'Apollo CSM Columbia' }, 'apollo-11', 'the Apollo command and service module');
want({ id: 'lm-1', layer: 'notable', name: 'Lunar Module Eagle' }, 'apollo-11', 'the lunar module');
want({ id: 'saturn-v-lc-39a', layer: 'hand-kept-sites', name: 'x' }, 'apollo-11', 'the Saturn V pad (by id)');
want(launch('Soyuz 2.1a', 'Soyuz', ['R-7', 'Soyuz']), null, 'a Soyuz-2 is a descendant of the R-7, not Vostok\'s rocket: no replay');
want(launch('Falcon 9 Block 5', 'Falcon'), null, 'a Falcon 9');
want({ id: 'sat-1', layer: 'active', name: 'STARLINK-1234' }, null, 'a Starlink');
want({ id: 'dso-orion', layer: 'deep-sky', name: 'Orion Nebula' }, null, 'the Orion Nebula (a layer that holds no craft)');
want({ id: 'con-ori', layer: 'stars', name: 'Orion' }, null, 'a star or constellation called Orion');
want(null, null, 'no record');
const cards = src('site/js/ui/cards.js');
check(/momentsForRecord\(record\)/.test(cards) && /import \{ momentsForRecord \}/.test(cards), 'the card asks momentsForRecord with the record, not only its id');

// --- the words in four languages ----------------------------------------------------------------------------------------
const { COPY } = await mod('copy/en.js');
await mod('copy/en.moments.js');
for (const f of ['vostok', 'apollo11', 'artemis2', 'apollo13', 'sputnik']) await mod(`copy/en.moments.${f}.js`);   // 1.7.2: Apollo 13 and Sputnik 1 are translated too (Voskhod 2 and STS-1 are English only for now)
const slots = (s) => (String(s).match(/\{[a-zA-Z]+\}/g) || []).sort().join(',');
const leaves = (o, path = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[path + k, v]] : leaves(v, `${path}${k}.`)));
for (const code of ['es', 'fr', 'de', 'pt']) {
  const lang = await mod(`copy/${code}.js`);
  check(lang.META && lang.META.review && lang.META.review.status === 'machine-drafted', `${code}: the file still says it is machine-drafted`);
  check(/Machine-drafted like the rest of this file/.test(src(`site/js/copy/${code}.js`)), `${code}: the Moments block says it was machine-drafted`);
  let n = 0;
  for (const section of ['momentPlayer', 'momentShelf', 'momentStories']) {
    const en = COPY[section], tr = lang.COPY[section];
    check(!!tr, `${code}: has COPY.${section}`);
    if (!tr) continue;
    const have = new Map(leaves(tr, `${section}.`));
    for (const [path, text] of leaves(en, `${section}.`)) {
      n += 1;
      const t = have.get(path);
      check(typeof t === 'string' && t.trim() !== '', `${code}: ${path} is missing`);
      if (typeof t === 'string') {
        check(slots(t) === slots(text), `${code}: ${path} loses or invents a {slot}`);
        // a long sentence identical to the English was not translated (single words such as Moment, Pause and Director may agree)
        const same = t === text && text.split(/\s+/).length >= 5 && !/Houston|one small step/.test(text) && !/^\{truth\}/.test(text);
        check(!same, `${code}: ${path} is still English`);
      }
    }
    for (const [path] of have) if (!leaves(en, `${section}.`).some(([p]) => p === path)) check(false, `${code}: ${path} has no English`);
  }
  check(n === 283, `${code}: all 283 strings of the Moments are covered (${n})`);
}
// The stories hand their words to the language hook once they are in COPY; the lines said in the recordings stay in their own language.
for (const f of ['vostok', 'apollo11', 'artemis2', 'apollo13', 'sputnik', 'voskhod', 'sts1']) {
  const t = src(`site/js/copy/en.moments.${f}.js`);
  check(/HOOK\.localise\(\{ COPY \}, \['momentStories'\]\)/.test(t), `en.moments.${f}.js calls HOOK.localise for momentStories`);
}
for (const code of ['es', 'fr', 'de', 'pt']) {
  const tr = (await mod(`copy/${code}.js`)).COPY.momentStories['apollo-11'];
  check(/Tranquility Base here\. The Eagle has landed\./.test(tr.landed), `${code}: Armstrong's words stay as he said them`);
}
// The language hook, end to end: a Spanish visit gets Spanish after the story file loads.
{
  const lang = await mod('copy/lang.js');
  const idx = await mod('copy/index.js');
  const es = await mod('copy/es.js');
  const fake = { momentStories: { 'vostok-1': { title: 'Vostok 1: the first person in space', unknownKey: 'x' } } };
  const n = idx.overlay(fake, { momentStories: es.COPY.momentStories });
  check(n >= 1 && /Vostok 1: la primera persona/.test(fake.momentStories['vostok-1'].title) && fake.momentStories['vostok-1'].unknownKey === 'x', 'overlay puts Spanish over a story and leaves what English only has');
  check(typeof lang.HOOK === 'object', 'copy/lang.js has its HOOK');
}

// --- the onboarding row and the Kennedy trip --------------------------------------------------------------------------
const onboarding = src('registry/onboarding.yaml');
const row = onboarding.slice(onboarding.indexOf('  - id: moments'), onboarding.indexOf('# 0079 C1: end'));
check(/Baikonur Site 1/.test(row) && /Saturn V/.test(row) && /Orion/.test(row), 'the onboarding row for Moments names the pads and the craft that carry the Replay row');
const tours = src('registry/tours.yaml');
const trip = tours.slice(tours.indexOf('  - id: two-pads-at-kennedy'));
check(/target: \{site: saturn-v-lc-39a\}/.test(trip) && /target: \{site: shuttle-lc-39b\}/.test(trip), 'the Kennedy trip stands on both pads');
const times = [...trip.matchAll(/target: \{site: ([a-z0-9-]+)\}\n\s+distance_km: \d+\n\s+time: "([^"]+)"/g)].map((m) => [m[1], Date.parse(m[2])]);
check(times.length === 5, `five stops, each with a time (${times.length})`);
const { handKeptSites } = await mod('data/sample.js');
const { padVehicleShown } = await mod('scene/realmodels.js');
const pads = handKeptSites().filter((r) => Array.isArray(r.meta.liftoffs));
for (const [id, t] of times) {
  const p = pads.find((r) => r.id === id);
  check(p && padVehicleShown(p, t), `the stop on ${id} at ${new Date(t).toISOString()} has its vehicle drawn on the pad`);
}
check(existsSync(join(ROOT, 'site/audio/narration/two-pads-at-kennedy/sts-116.m4a')), 'the trip is voiced (its clips are rendered)');

if (problems.length) { for (const p of problems) console.error(`::error::${p}`); console.error(`${problems.length} problem(s)`); process.exit(1); }
console.log('moments finish ok: Gagarin\'s Start and the landing site cited and agreeing with the Moment, the Replay row on vehicle cards by their words, the Moments\' words in four languages, the onboarding row, the Kennedy trip on its pads');
