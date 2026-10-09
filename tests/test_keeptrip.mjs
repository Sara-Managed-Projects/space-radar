// tests/test_keeptrip.mjs -- "Keep for offline" on a trip's intro (internal #551, from #390).
//   node tests/test_keeptrip.mjs
//
//   1. THE LIST IS THE TRIP'S. For every trip in data/tours.js: every address is a file that exists
//      in site/, in a folder the service worker keeps (sw.js ASSET_DIRS, which keeptrip.js's
//      KEPT_DIRS must equal), with no query, no template, no duplicate; the voice is one clip and
//      one caption per narrated stop; the music is the rungs the trip visits; the trip's picture is in.
//   2. A KNOWN TRIP: strangest-things asks for Voyager's model, the Moon's map, six clips.
//   3. THE FETCHING: three at a time, a failure is counted and does not stop the rest, a short
//      read is not a keep, and progress is told after each.
//   4. WHAT IS REMEMBERED: written and read back, refused storage is no error.
//   5. NOTHING AT BOOT: the intro reaches the module by a dynamic import only.
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const SITE = join(ROOT, 'site');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const K = await import(join(JS, 'ui/keeptrip.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { NARRATION } = await import(join(JS, 'data/narration.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { AUDIO } = await import(join(JS, 'data/audio.js'));
const { realModelFor } = await import(join(JS, 'scene/realmodels.js'));
const { isLadderStage } = await import(join(JS, 'scene/stage.js'));
const S = await import(join(JS, 'data/sample.js'));

const all = [...S.sampleOddities(), ...S.sampleDeepSpace(), ...S.handKeptSites(), ...S.sampleAsteroids(), ...S.farBodies(), ...S.namedComets(), ...S.namedAsteroids()];
const recordById = (id) => all.find((r) => r.id === id) || null;
const env = (over = {}) => ({
  narration: NARRATION, textures: TEXTURES, audioRows: AUDIO, recordById, realModelFor,
  canPlay: (type) => (/opus/.test(type) ? 'probably' : ''), tier: 1, isLadder: isLadderStage, ...over,
});

// --- 1. every trip -----------------------------------------------------------------------------
const sw = readFileSync(join(SITE, 'sw.js'), 'utf8');
const dirs = /const ASSET_DIRS = \[([^\]]*)\]/.exec(sw);
const swDirs = dirs ? [...dirs[1].matchAll(/'([^']+)'/g)].map((m) => m[1]) : [];
check(JSON.stringify(swDirs) === JSON.stringify(K.KEPT_DIRS), `KEPT_DIRS ${JSON.stringify(K.KEPT_DIRS)} is not the worker's ASSET_DIRS ${JSON.stringify(swDirs)}`);

let biggest = { id: '', bytes: 0, n: 0 };
let withModels = 0;
for (const tour of TOURS) {
  const plan = K.tripAssets(tour, env());
  check(plan.urls.length > 0, `${tour.id}: nothing to keep`);
  check(new Set(plan.urls).size === plan.urls.length, `${tour.id}: an address twice`);
  let bytes = 0;
  for (const u of plan.urls) {
    check(!/[?#{}]/.test(u), `${tour.id}: ${u} has a query or a template`);
    check(K.KEPT_DIRS.some((d) => u.startsWith(d)), `${tour.id}: ${u} is in a folder the worker does not keep`);
    const file = join(SITE, decodeURIComponent(u));
    if (!existsSync(file)) { problems.push(`${tour.id}: ${u} is not a file in site/`); continue; }
    bytes += readFileSync(file).length;
  }
  const clips = tour.stops.filter((s) => Object.prototype.hasOwnProperty.call(NARRATION.clips, `${tour.id}/${s.id}`)).length;
  check(plan.voice === clips * 2, `${tour.id}: ${plan.voice} voice files for ${clips} narrated stops (a clip and its captions each)`);
  check(plan.urls.includes(`images/trips/${tour.id}.webp`), `${tour.id}: its picture is not in the list`);
  check(plan.urls.length === plan.voice + plan.models + plan.maps + plan.beds + plan.other, `${tour.id}: the counts do not add up`);
  if (plan.models) withModels++;
  if (bytes > biggest.bytes) biggest = { id: tour.id, bytes, n: plan.urls.length };
}
check(withModels >= 5, `only ${withModels} trips keep a model: the records are not being found`);
check(biggest.bytes < 40e6, `${biggest.id} keeps ${(biggest.bytes / 1e6).toFixed(1)} MB: more than a classroom's connection should be asked for`);

// --- 2. a known trip ---------------------------------------------------------------------------
{
  const tour = TOURS.find((x) => x.id === 'strangest-things');
  const plan = K.tripAssets(tour, env());
  check(plan.urls.includes('models/voyager.glb'), 'strangest-things does not keep Voyager’s model');
  check(plan.urls.includes('textures/2k_moon.webp'), 'strangest-things does not keep the Moon’s map');
  check(plan.urls.includes('audio/narration/strangest-things/duke-photo.opus') && plan.urls.includes('audio/narration/strangest-things/duke-photo.vtt'), 'the first stop’s clip (Opus here) and captions are not in');
  check(plan.urls.some((u) => u.startsWith('audio/bed-')) && plan.urls.some((u) => u.startsWith('audio/sting-')), 'no music or stings');
  const aac = K.tripAssets(tour, env({ canPlay: () => '' }));
  check(aac.urls.includes('audio/narration/strangest-things/duke-photo.m4a'), 'a browser with no Opus is not given the AAC twin');
  const mute = K.tripAssets(tour, env({ voice: false }));
  check(mute.voice === 0, 'voice: false still keeps clips');
  check(K.tripAssets(null, env()).urls.length === 0, 'no trip, no list');
  // The 4k map only for a device that earns it.
  const phone = K.tripAssets(tour, env({ tier: 0 }));
  check(!phone.urls.some((u) => u.startsWith('textures/4k/')), 'a tier-0 device is asked for a 4k map');
}

// --- 3. the fetching ---------------------------------------------------------------------------
{
  let live = 0; let peak = 0;
  const seen = [];
  const urls = Array.from({ length: 10 }, (_, i) => `models/f${i}.glb`);
  const doFetch = async (u) => {
    live++; peak = Math.max(peak, live);
    await new Promise((r) => setTimeout(r, 5));
    live--;
    if (u.endsWith('f3.glb')) return { ok: false, status: 404 };
    if (u.endsWith('f4.glb')) throw new Error('offline');
    return { ok: true, arrayBuffer: async () => new ArrayBuffer(1000) };
  };
  const r = await K.keepTrip(urls, { fetch: doFetch, onProgress: (p) => seen.push(p.done + p.failed) });
  check(peak <= K.AT_ONCE && peak >= 2, `${peak} at once, expected 2 to ${K.AT_ONCE}`);
  check(r.done === 8 && r.failed === 2 && r.bytes === 8000, `kept ${r.done}, failed ${r.failed}, ${r.bytes} bytes`);
  check(seen.length === 10 && seen[9] === 10, 'progress is not told after each file');
  const none = await K.keepTrip([], { fetch: doFetch });
  check(none.done === 0 && none.failed === 0, 'an empty list keeps nothing and fails nothing');
}

// --- 4. what is remembered ---------------------------------------------------------------------
{
  const mem = new Map();
  const storage = { getItem: (k) => (mem.has(k) ? mem.get(k) : null), setItem: (k, v) => mem.set(k, String(v)) };
  K.writeKept(storage, 'a', { n: 3, bytes: 99, at: 1 });
  K.writeKept(storage, 'b', { n: 4, bytes: 100, at: 2 });
  check(K.readKept(storage).a.n === 3 && K.readKept(storage).b.bytes === 100, 'kept trips are not read back');
  const refusing = { getItem() { throw new Error('no'); }, setItem() { throw new Error('no'); } };
  check(Object.keys(K.readKept(refusing)).length === 0, 'a browser that refuses storage is an error');
  K.writeKept(refusing, 'a', { n: 1 });
  mem.set(K.KEPT_KEY, '[1,2]');
  check(Object.keys(K.readKept(storage)).length === 0, 'a list where a map should be is believed');
  check(K.sizeWords(6.1e6) === '6.1 MB' && K.sizeWords(480e3) === '480 kB' && K.sizeWords(10) === '1 kB', `sizeWords: ${K.sizeWords(6.1e6)}, ${K.sizeWords(480e3)}, ${K.sizeWords(10)}`);
  check(K.workerKeeps({ net: { worker: 'register' } }, { serviceWorker: { controller: {} } }) === true, 'a worker in charge is not seen');
  check(K.workerKeeps({ net: { worker: 'none' } }, { serviceWorker: { controller: {} } }) === false, 'no worker wanted, yet a row');
  check(K.workerKeeps({ net: { worker: 'register' } }, { serviceWorker: { controller: null } }) === false, 'a page no worker controls yet gets a row');
  check(K.workerKeeps({}, null) === false, 'no net, no row');
}

// --- 5. nothing at boot ------------------------------------------------------------------------
{
  const frame = readFileSync(join(JS, 'ui/tripframe.js'), 'utf8');
  check(/import\('\.\/keeptrip\.js'\)/.test(frame) && !/^import[^\n]*keeptrip/m.test(frame), 'tripframe.js reaches keeptrip.js other than by a dynamic import');
  const copy = readFileSync(join(JS, 'copy/en.later.js'), 'utf8');
  check(/keepTrip: \{/.test(copy), 'the words are not in en.later.js');
}

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log(`ok: ${TOURS.length} trips each keep a real, kept-folder file list (the biggest, ${biggest.id}, ${biggest.n} files, ${(biggest.bytes / 1e6).toFixed(1)} MB); ${withModels} with models`);
