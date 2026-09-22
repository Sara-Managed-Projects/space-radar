// tests/test_moon_trip.mjs -- "Where we have landed on the Moon": ten stops, each on a real landing
// site, each framed from outside the Moon with the site on the side facing the camera.
//
// Three things a validator reading registry/tours.yaml cannot see:
//
//   1. THE STOP IS A RECORD, ON THE MOON. A stop is resolved in the browser through
//      ctx.recordById(), and a site id the generator never emitted is a stop dropped without a
//      word. Every one of these must be a lunar site data/sample.js actually emits.
//   2. THE WORDS HOLD. Each card within the caps check_registry.py and ui/cards.js measure, with no
//      " -- " and no word that goes stale, and the last card's count is the registry's own count.
//   3. THE CAMERA CAN SEE IT. Before PR #210 a selected near-side site parked the camera 231 km
//      under the lunar surface. ui/trip.js re-teaches the rig the Moon at every stop, and this runs
//      the real trip machine -- composeShot, the key-light search, the rig -- at four instants a
//      week apart, because the Sun moves the chosen angle, and holds each stop's end pose and its
//      drift to two rules: the camera is outside the Moon, and it is above the site's horizon, so
//      the lander is not behind the limb.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { SITES } = await import(join(JS, 'data/sites.js'));
const { handKeptSites } = await import(join(JS, 'data/sample.js'));
const { createCameraRig } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { positionOf, WORLDS } = await import(join(JS, 'scene/worlds.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const TRIP_ID = 'moon-landings';
const trip = TOURS.find((t) => t.id === TRIP_ID);
if (!trip) {
  console.error(`moon trip FAILED: there is no '${TRIP_ID}' in data/tours.js`);
  process.exit(1);
}

const records = handKeptSites();
// data/sites.js ships what the browser draws, and a landing date is not that; the registry has it.
// Rows are written two ways there, `{id: x, ..., landed: d}` on one line and `id: x` over a block.
const landedOf = new Map();
{
  let id = null;
  for (const line of readFileSync(join(ROOT, 'registry/sites.yaml'), 'utf8').split('\n')) {
    const m = line.match(/^\s*-\s*\{?\s*id:\s*([\w-]+)/);
    if (m) id = m[1];
    const d = line.match(/\blanded:\s*(\d{4}-\d{2}-\d{2})/);
    if (id && d) landedOf.set(id, d[1]);
  }
}
const byId = new Map(records.map((r) => [r.id, r]));
const rowById = new Map(SITES.map((row) => [row.id, row]));
const MOON = WORLDS.find((w) => w.id === 'moon');

// ---------------------------------------------------------------- 1. every stop is on the Moon
check(trip.stops.length >= 8 && trip.stops.length <= 10, `${trip.stops.length} stops; the brief is eight to ten`);
check(trip.stage === 'moon', `stage ${trip.stage}: the trip is centred on the Moon (see its comment in tours.yaml)`);
check(/back to Earth/.test(trip.blurb), 'leaving a trip on another stage moves the camera home, and the blurb must say so');
check((trip.requires || []).includes('hand-kept-sites') && (trip.requires || []).includes('worlds'),
  'the trip must switch on the sites and the worlds, or a lander stands on nothing');
let lastLanded = '';
for (const stop of trip.stops) {
  const t = stop.target || {};
  if (t.world !== undefined) {
    check(t.world === 'moon', `${stop.id}: a world stop on this trip is the Moon, not ${t.world}`);
    continue;
  }
  check(t.site !== undefined, `${stop.id}: names its subject with ${Object.keys(t)}; the landings are \`site:\` rows`);
  const rec = byId.get(t.site);
  const row = rowById.get(t.site);
  if (!rec || !row) { problems.push(`${stop.id}: '${t.site}' is not a record data/sample.js emits, so the stop would be dropped`); continue; }
  check(rec.frame === 'moon-fixed' && row.world === 'moon', `${stop.id}: ${t.site} is on ${row.world}, not the Moon`);
  const landed = landedOf.get(t.site);
  check(Boolean(landed), `${stop.id}: ${t.site} has no landing date in registry/sites.yaml`);
  // The story is told in the order it happened.
  check(String(landed) >= lastLanded, `${stop.id}: landed ${landed}, before the stop ahead of it (${lastLanded})`);
  lastLanded = String(landed);
}
check(trip.stops[trip.stops.length - 1].target.world === 'moon', 'the trip ends pulled back on the whole Moon');

// ------------------------------------------------------------------------- 2. the words hold
// The same caps check_registry.py applies where the words are written, read from it rather than
// copied, so the two cannot drift apart.
const checker = readFileSync(join(ROOT, 'scripts/check_registry.py'), 'utf8');
const MAX_SENTENCE = Number((checker.match(/^MAX_SENTENCE\s*=\s*(\d+)/m) || [])[1]);
const MAX_TITLE = Number((checker.match(/^TOUR_MAX_TITLE\s*=\s*(\d+)/m) || [])[1]);
const timeBlock = (checker.match(/^TIME_RELATIVE\s*=\s*\(([\s\S]*?)\)/m) || [])[1] || '';
const TIME_RELATIVE = [...timeBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
check(MAX_SENTENCE > 0 && MAX_TITLE > 0 && TIME_RELATIVE.length > 3, 'could not read the caps from scripts/check_registry.py');
check(trip.title.length <= MAX_TITLE, `the trip title is ${trip.title.length} characters`);
for (const stop of trip.stops) {
  const { title, body } = stop.card || {};
  check(Boolean(title) && title.length <= MAX_TITLE, `${stop.id}: card title ${JSON.stringify(title)} is over ${MAX_TITLE}`);
  const first = String(body || '').split('. ')[0];
  check(first.length <= MAX_SENTENCE, `${stop.id}: the first sentence is ${first.length} characters, over ${MAX_SENTENCE}`);
  for (const text of [title, body]) {
    check(!String(text).includes('--'), `${stop.id}: "--" reaches the screen as two hyphens`);
    const low = String(text).toLowerCase();
    for (const phrase of TIME_RELATIVE) check(!low.includes(phrase), `${stop.id}: "${phrase}" goes stale the day after it is written`);
  }
  check(stop.dwell_ms >= 8000 && stop.dwell_ms <= 20000, `${stop.id}: dwell ${stop.dwell_ms} ms is outside 8-20 s`);
}
// The last card counts the map's own lunar landing sites, the way test_ladder_ui holds the edge
// trip's last card to the star count: add a lunar row and this says which sentence to change.
// A landing row is one with a shape to draw; Beresheet's crash is a coordinate, not a record.
const lunarOnMap = SITES.filter((row) => row.world === 'moon' && row.shape && row.record !== false).length;
const lastBody = trip.stops[trip.stops.length - 1].card.body;
check(lastBody.includes(`marks ${lunarOnMap} of them`),
  `the last card says how many lunar landing sites this map marks, and the registry has ${lunarOnMap}: "${lastBody}"`);
const rovers = SITES.filter((row) => row.world === 'moon' && row.shape === 'rover' && row.record !== false).length;
check(rovers === 2 && /two by where their rovers stopped/.test(lastBody), `the last card says two sites are rovers; the registry has ${rovers}`);

// ----------------------------------------------------------- 3. the camera can see every site
// rAF as a queue drained by hand, the way test_contract.mjs drives the same machine.
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 6) => {
  for (let i = 0; i < n; i += 1) {
    const due = frames.splice(0, frames.length);
    // paintCard reaches ui/cards.js, which wants a document; the pose is what is under test.
    for (const fn of due) { try { fn(Date.now()); } catch { /* not under test */ } }
  }
};

const R = MOON.radiusKm / stage.unitKm;
const START = Date.parse('2026-09-22T00:00:00Z');
let poses = 0;
let worst = { margin: Infinity, where: '' };
for (let week = 0; week < 4; week += 1) {
  const tMs = START + week * 7 * 86400000;
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  const ctx = {
    camera,
    cameraRig: rig,
    clock: { mode: 'live', rate: 1, paused: false, now: () => tMs, goTo() {}, setRate() {}, setPaused() {}, live() {} },
    layers: [{ id: 'hand-kept-sites', nearKm: 900 }, { id: 'worlds' }],
    recordsFor: (id) => (id === 'hand-kept-sites' ? records : []),
    recordById: (id) => byId.get(id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() {},
    selected: () => null,
    // main.js ctx.setStage, less the renderer: recentre, and put the floating origin where
    // scene/worlds.js update() would put it on the next frame.
    setStage(id) {
      stage.setWorld(id);
      const o = id === 'earth' ? null : positionOf(id, tMs);
      stage.setOrigin(o);
      const w = WORLDS.find((x) => x.id === id);
      rig.setWorldRadius(w ? w.radiusKm / stage.unitKm : 0);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? (w.radiusKm / stage.unitKm) * 4 : 5, ms: 0 });
      return true;
    },
  };
  // What leaving does to the selection, and so to `follow`, is part of where the camera ends up.
  const selects = [];
  // As main.js: a select installs `follow` on the record, a deselect takes it off.
  ctx.select = (record) => { selects.push(record && record.id); if (record) rig.follow(() => { const p = propagate(record, tMs); return stage.toScene(p, p.frame, tMs); }); };
  let deselected = 0;
  ctx.deselect = () => { deselected += 1; rig.stopFollow(); };
  const machine = createTrip(ctx);
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0,
    `${new Date(tMs).toISOString().slice(0, 10)}: ${plan ? plan.count : 0} of ${trip.stops.length} stops resolved (${plan ? plan.dropped.map((d) => d.id) : ''})`);
  await machine.start(TRIP_ID);
  pump();
  check(stage.worldId === 'moon', `the trip began on the ${stage.worldId} stage`);
  machine.play();
  pump(2);
  const moonKm = positionOf('moon', tMs);
  const moonAt = stage.toScene(moonKm, moonKm.frame, tMs);
  check(moonAt.length() < 1e-6, `on the Moon's stage the Moon is the origin, and it is ${moonAt.length()} units off`);
  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    check(machine.state.index === i, `${stop.id}: the trip is at stop ${machine.state.index}, not ${i}`);
    // Collapse the flight, let the arrival run (it settles the camera's up on the site's
    // vertical), then one frame of the rig to draw the pose in that basis.
    rig.finishFlight();
    pump(2);
    rig.update(0.016);
    const day = new Date(tMs).toISOString().slice(0, 10);
    const where = `${day} ${stop.id}`;
    const onSite = stop.target.site;
    let normal = null;
    let site = null;
    if (onSite) {
      const rec = byId.get(onSite);
      const p = propagate(rec, tMs);
      site = stage.toScene(p, p.frame, tMs);
      normal = site.clone().sub(moonAt).normalize();
      check(Math.abs(site.distanceTo(moonAt) - R) < 1e-3, `${where}: the site is ${(site.distanceTo(moonAt) * 1000).toFixed(0)} km from the Moon's centre`);
      const d = camera.position.distanceTo(site) * stage.unitKm;
      check(Math.abs(d - stop.distance_km) < 1, `${where}: the camera is ${d.toFixed(0)} km from the site, the stop asks for ${stop.distance_km}`);
      // The sky is up: the camera's up is the site's own vertical, so the ground is at the bottom
      // of the frame and not hanging over the lander (Chang'e 4, headless Chrome, 2026-09-22).
      check(camera.up.clone().normalize().dot(normal) > 0.9999, `${where}: the camera's up is ${(Math.acos(Math.min(1, camera.up.clone().normalize().dot(normal))) * 180 / Math.PI).toFixed(1)} degrees off the site's vertical`);
    } else {
      const d = camera.position.distanceTo(moonAt) / R;
      check(Math.abs(d - stop.frame_radii) < 0.01, `${where}: the camera is ${d.toFixed(2)} lunar radii out, the stop asks for ${stop.frame_radii}`);
      check(camera.up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9, `${where}: off the ground, the camera's up is the visitor's again`);
    }
    // The pose, then the drift the dwell would run, sampled all the way round its arc.
    const sample = (phase) => {
      poses += 1;
      const out = camera.position.distanceTo(moonAt) - R;
      check(out > 0.02 * R - 1e-6, `${where} (${phase}): the camera is ${(out * 1000).toFixed(0)} km above the Moon's surface, inside the rig's clearance`);
      if (normal) {
        const toCam = camera.position.clone().sub(site).normalize();
        const up = normal.dot(toCam); // sine of the camera's elevation above the site's horizon
        if (up < worst.margin) worst = { margin: up, where: `${where} (${phase})` };
        check(up > 0, `${where} (${phase}): the camera is ${(Math.asin(Math.min(1, -up)) * 180 / Math.PI).toFixed(1)} degrees below the site's horizon, so the Moon hides the lander`);
      }
    };
    sample('arrival');
    const deg = Number(stop.drift_deg) || 0;
    for (const sign of [1, -1]) {
      if (!deg) break;
      rig.orbit({ deg: sign * deg, degPerSec: stop.drift_rate_deg_s || 6 });
      for (let k = 0; k < 400 && rig.state.orbiting; k += 1) {
        rig.update(0.05);
        if (k % 10 === 0) sample(`drift ${sign > 0 ? '+' : '-'}${deg}`);
      }
      sample(`end of drift ${sign > 0 ? '+' : '-'}${deg}`);
      rig.orbit({ deg: -sign * deg, degPerSec: 1000 });
      for (let k = 0; k < 20 && rig.state.orbiting; k += 1) rig.update(0.05);
    }
    if (i + 1 < trip.stops.length) { machine.next(); pump(2); }
  }
  // Leave from a landing site, not from the last stop: the case where the last subject is a record.
  machine.back();
  pump(2);
  rig.finishFlight();
  pump(2);
  selects.length = 0;
  deselected = 0;
  machine.stop('test');
  pump();
  for (let k = 0; k < 5; k += 1) rig.update(0.016);
  check(stage.worldId === 'earth', `leaving put the map back on the ${stage.worldId} stage, not the Earth's`);
  check(camera.up.distanceTo(new THREE.Vector3(0, 1, 0)) < 1e-9, 'leaving gives the visitor their own up back');
  // The blurb says leaving brings you back to Earth, and it has to: the camera within a few Earth
  // radii of home, not following the last lander out to the Moon (headless Chrome, 2026-09-22).
  const home = camera.position.length() * stage.unitKm;
  check(home < 100000, `after leaving, the camera is ${Math.round(home)} km from the Earth, not back home`);
  check(selects.every((id) => !id), `leaving across a stage change re-selected ${selects.filter(Boolean)}, and follow took the camera with it`);
  check(deselected > 0, 'leaving across a stage change keeps the last lander selected, highlighted on a world out of shot');
  stage.setOrigin(null);
}

if (problems.length) {
  console.error(`moon trip FAILED (${problems.length}):\n  ` + problems.join('\n  '));
  process.exit(1);
}
const lowest = (Math.asin(worst.margin) * 180) / Math.PI;
console.log(
  `moon trip ok: ${trip.stops.length} stops in landing order, every one a lunar site the app emits, every card within ` +
    `its caps; ${poses} camera poses at four instants a week apart, all outside the Moon, the lowest ` +
    `${lowest.toFixed(1)} degrees above its site's horizon (${worst.where})`,
);
