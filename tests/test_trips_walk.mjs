// tests/test_trips_walk.mjs -- the trips walk, the half a node process can do (spec 0044 task 3,
// internal #123). Every stop of every trip, read the way the walk reads it:
//
//   1. ITS TARGET RESOLVES. A world is a world the scene builds, a site is in data/sites.js, a
//      layer is a layer the trip asks for, a sky target is a real direction, and a record is found
//      in the catalogue that makes it -- the bundled ones exactly (deep-sky objects, exotics, the
//      named stars, the systems, the exoplanet table, the oddities, the missions' own records,
//      the files of measured paths). No stop names a record that does not exist.
//   2. IT HAS ITS NARRATION: a clip of a real length in data/narration.js and the three files of it
//      on disc (opus, m4a, captions), or the trip is one the manifest says is spoken as a whole.
//   3. IT HAS A PICTURE OR A DEFAULT: the trip has its card picture, and a stop at a deep-sky object
//      either has a picture in data/nebulae.js or is drawn by the glow every deep-sky record has
//      (it is in the bundled catalogue with a size), never words over black.
//
// WHAT THIS CANNOT DO, AND WHO DOES. Records that only exist once a live or saved catalogue has
// loaded (comets, asteroids, far bodies, some probes) are checked here for the layer that carries
// them being asked for by the trip, and COUNTED in the last line. Whether a stop then DRAWS --
// its draw calls and triangles against registry/budgets.yaml's `draw_calls_per_stop` and
// `triangles_per_stop`, and that the frame is not one colour -- needs a GPU and the catalogues:
// that is the local tool, `node tools/walk.mjs --only=trips` (tools/README.md), which reads both
// rows from data/budgets.js and reports a stop over either.
//
//   node tests/test_trips_walk.mjs
import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const load = (rel) => import(pathToFileURL(join(JS, rel)).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { TOURS } = await load('data/tours.js');
const { NARRATION } = await load('data/narration.js');
const { clipKey, clipRow } = await load('audio/narration.js');
const { LAYERS } = await load('data/layers.js');
const { SITES } = await load('data/sites.js');
const { EXOTICS } = await load('data/exotics.js');
const { STARS_NOTABLE } = await load('data/starsnotable.js');
const { SYSTEMS } = await load('data/systems.js');
const { ODDITIES } = await load('data/oddities.js');
const { EPHEMERIDES } = await load('data/ephemerides.js');
const { NEBULAE } = await load('data/nebulae.js');
const { BUDGETS } = await load('data/budgets.js');
const { WORLDS } = await load('scene/worlds.js');
const dso = JSON.parse(readFileSync(join(ROOT, 'site/data/dso.json'), 'utf8')).objects;
const exoNames = readFileSync(join(ROOT, 'site/data/exoplanets.csv'), 'utf8').split('\n').filter((l) => l && !l.startsWith('#')).slice(1).map((l) => l.split(',')[0]);
const exoId = (name) => 'exo-' + name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); // data/parsers.js, word for word

const worldIds = new Set((Array.isArray(WORLDS) ? WORLDS : Object.values(WORLDS)).map((w) => w.id));
const layerIds = new Set(LAYERS.map((l) => l.id));
const siteIds = new Set(SITES.map((s) => s.id));
// The bundled catalogues, by the id each gives its records.
const BUNDLED = new Map();
const put = (id, from) => { if (!BUNDLED.has(id)) BUNDLED.set(id, from); };
for (const o of dso) put(`dso-${o.id}`, 'site/data/dso.json');
for (const e of EXOTICS) put(`exotic-${e.id}`, 'data/exotics.js');
for (const s of STARS_NOTABLE) put(`hip-${s.hip}`, 'data/starsnotable.js');
for (const s of SYSTEMS) { put(s.hostId, 'data/systems.js'); for (const p of s.planets || []) if (p && p.id) put(p.id, 'data/systems.js'); }
for (const n of exoNames) put(exoId(n), 'site/data/exoplanets.csv');
for (const o of ODDITIES) put(o.id, 'data/oddities.js');
for (const s of SITES) put(s.id, 'data/sites.js');
for (const id of Object.keys(EPHEMERIDES)) put(id, 'data/ephemerides.js');
for (const w of worldIds) put(w, 'scene/worlds.js');
// The galaxy layer's one record is written by hand in data/layers.js, and drawn by the galaxy model.
const GALAXY = 'dso-milky-way';
if (readFileSync(join(JS, 'data/layers.js'), 'utf8').includes(`id: '${GALAXY}'`)) put(GALAXY, 'data/layers.js');
// The catalogues that are fetched, live or from the saved copy: the id's first word says which
// layer carries it, and a trip that visits one must ask for that layer.
const LIVE = { asteroid: 'asteroids', comet: 'comets', dwarf: 'far-bodies', interstellar: 'far-bodies', deep: 'deep-space' };

check(TOURS.length >= 26, `the trips were read (${TOURS.length})`);
check(dso.length > 100 && exoNames.length > 1000 && worldIds.size > 20, `the catalogues were read (${dso.length} deep-sky, ${exoNames.length} exoplanets, ${worldIds.size} worlds)`);
check(Number.isFinite(BUDGETS.draw_calls_per_stop) && Number.isFinite(BUDGETS.triangles_per_stop), 'registry/budgets.yaml has draw_calls_per_stop and triangles_per_stop (read by tools/walk.probe.js at every stop)');

// The other half is wired: the local walk reads both rows at every stop, holds the machine's one
// Chrome lock, and does not call a walk that timed out a pass.
{
  const probe = readFileSync(join(ROOT, 'tools/walk.probe.js'), 'utf8');
  check(/d\.calls > BUDGETS\.draw_calls_per_stop/.test(probe) && /d\.triangles > BUDGETS\.triangles_per_stop/.test(probe), 'tools/walk.probe.js compares each stop with draw_calls_per_stop and triangles_per_stop');
  check((probe.match(/\.\.\.\(await stopCost\(id\)\)/g) || []).length >= 3, 'at the first stop, each next stop and the last');
  check(/info\.autoReset = false;[\s\S]{0,200}info\.reset\(\);[\s\S]{0,300}finally \{ info\.autoReset = auto; \}/.test(probe), 'the counters are taken over for the frames measured and handed back');
  const walk = readFileSync(join(ROOT, 'tools/walk.mjs'), 'utf8');
  const lockSrc = readFileSync(join(ROOT, 'tools/chromelock.mjs'), 'utf8');
  check(/process\.env\.SR_CHROME_LOCK \|\| join\(tmpdir\(\), 'space-radar-chrome\.lock'\)/.test(lockSrc) && /mkdirSync\(path\)/.test(lockSrc) && /createChromeLock\(\{ waitMs: LOCK_WAIT_MS \}\)/.test(walk), 'tools/walk.mjs takes the one-Chrome lock by mkdir (tools/chromelock.mjs)');
  check(/async function chrome\([^)]*\) \{\s*await lock\(\);/.test(walk) && /clearInterval\(touch\);\s*unlock\(\);/.test(walk), 'every Chrome it starts is started holding the lock, and gives it back');
  check(/if \(!state\.alive\) return 'its owner is gone';/.test(lockSrc) && /state\.ageMs > staleMs/.test(lockSrc), 'a lock whose owner is gone, or that has no owner and nobody touched for six minutes, is taken over (tests/test_chromelock.mjs holds the rule)');
  check(/const PORT = Number\(arg\('port'/.test(walk) && /arg\('timeout', '840'\)/.test(walk), 'it takes --port and --timeout');
  check(/process\.exit\(timedOut \? 2 : failed \? 1 : 0\)/.test(walk) && /timedOut \+= 1/.test(walk), 'a load that ran out of time makes the exit status 2');
  const readme = readFileSync(join(ROOT, 'tools/README.md'), 'utf8');
  check(/Only one headless Chrome may run on a machine at a time/.test(readme) && /SR_CHROME_LOCK/.test(readme) && /--timeout=840/.test(readme), 'tools/README.md says so, and names the lock and the flags');
}

let stops = 0; let live = 0; let clips = 0; let pictured = 0; let glows = 0;
const spokenWhole = new Set((NARRATION.scripted || []).map((k) => String(k).split('/')[0]));
const picIds = new Set(NEBULAE.map((n) => `dso-${n.id}`));
for (const tour of TOURS) {
  const where = (stop) => `${tour.id}/${stop.id}`;
  const asks = new Set([...(tour.requires || []), ...tour.stops.flatMap((s) => [s.needs_layer, s.target && s.target.layer].filter(Boolean))]);
  check(new Set(tour.stops.map((s) => s.id)).size === tour.stops.length, `${tour.id}: two stops share an id`);
  for (const id of asks) check(layerIds.has(id), `${tour.id}: asks for the layer "${id}", which data/layers.js does not have`);
  // The trip's own picture: the card, the intro sheet and the end card draw it.
  const pic = join(ROOT, 'site/images/trips', `${tour.id}.webp`);
  check(existsSync(pic) && statSync(pic).size > 1000, `${tour.id}: no card picture at site/images/trips/${tour.id}.webp`);
  for (const stop of tour.stops) {
    stops += 1;
    const t = stop.target;
    check(stop.card && typeof stop.card.title === 'string' && stop.card.title.trim() && typeof stop.card.body === 'string' && stop.card.body.trim().length > 20, `${where(stop)}: a stop is a title and a sentence`);
    // --- 1. the target -----------------------------------------------------------------------
    if (!t || typeof t !== 'object') { problems.push(`${where(stop)}: no target`); continue; }
    if (t.world) check(worldIds.has(t.world), `${where(stop)}: the world "${t.world}" is not one scene/worlds.js builds`);
    else if (t.site) check(siteIds.has(t.site), `${where(stop)}: the site "${t.site}" is not in data/sites.js`);
    else if (t.sky) check(Array.isArray(t.sky) && t.sky.length === 2 && t.sky[0] >= 0 && t.sky[0] < 360 && Math.abs(t.sky[1]) <= 90, `${where(stop)}: sky ${JSON.stringify(t.sky)} is not a right ascension and a declination in degrees`);
    else if (t.observer) check(t.observer === true, `${where(stop)}: observer is true or absent`);
    else if (t.layer) {
      check(layerIds.has(t.layer), `${where(stop)}: the layer "${t.layer}" is not in data/layers.js`);
      check(typeof t.catalog === 'string' ? /^\d+$/.test(t.catalog) : !!(t.query && t.pick), `${where(stop)}: a layer target names a catalogue number, or a query and which to pick`);
      live += 1;
    } else if (t.record) {
      const id = String(t.record);
      const first = id.split('-')[0];
      if (BUNDLED.has(id)) { /* found, exactly */ }
      else if (LIVE[first]) {
        live += 1;
        check(asks.has(LIVE[first]), `${where(stop)}: "${id}" comes with the layer "${LIVE[first]}", which the trip does not ask for (requires / needs_layer): the stop would be dropped`);
      } else problems.push(`${where(stop)}: the record "${id}" is in no bundled catalogue and is not a live catalogue's kind of id: the stop refers to a missing record`);
      // --- 3. a picture or a default, for a thing that is only light --------------------------
      if (id.startsWith('dso-') && id !== GALAXY) {
        const row = dso.find((o) => `dso-${o.id}` === id);
        if (picIds.has(id)) pictured += 1;
        else { glows += 1; check(!!row && Number(row.majAxArcmin) > 0, `${where(stop)}: "${id}" has no picture in data/nebulae.js and no size in the catalogue for its glow: words over black`); }
      }
    } else problems.push(`${where(stop)}: a target of no known kind: ${JSON.stringify(t)}`);
    // --- 2. the narration ----------------------------------------------------------------------
    const key = clipKey(tour.id, stop.id);
    const seconds = Number(NARRATION.clips[key]);
    if (spokenWhole.has(tour.id) && !Number.isFinite(seconds)) continue;
    check(seconds > 1 && seconds < 120, `${where(stop)}: no narration clip in data/narration.js (${NARRATION.clips[key]})`);
    const row = clipRow(NARRATION.base, key);
    for (const f of [row.file, row.twin, row.vtt]) check(existsSync(join(ROOT, 'site', f)), `${where(stop)}: the narration file site/${f} is not on disc`);
    clips += 1;
  }
}

if (problems.length) { console.error('trips walk FAILED:\n  ' + problems.slice(0, 40).join('\n  ') + (problems.length > 40 ? `\n  ... and ${problems.length - 40} more` : '')); process.exit(1); }
console.log(`trips walk ok: ${stops} stops of ${TOURS.length} trips each have a target that resolves, ${clips} their narration on disc in three files, every trip its picture, ${pictured} deep-sky stops a picture and ${glows} their glow; ${live} stops resolve only with a fetched catalogue, and those and the drawing (${BUDGETS.draw_calls_per_stop} draw calls, ${BUDGETS.triangles_per_stop} triangles a stop) are tools/walk.mjs --only=trips`);
