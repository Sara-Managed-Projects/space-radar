// tests/test_remaining_trips.mjs -- the eight shows of 2026-10-06 (the life of a star, black holes,
// the sky as telescopes see it, a dark sky, asteroids, satellites and junk, comets and meteor
// showers, the birth of the Solar System) and the stop grammar they brought.
//
//   node tests/test_remaining_trips.mjs
//
// What registry/tours.yaml's validator cannot see:
//
//   1. THE EIGHT TRIPS ARE THERE: six to nine stops, 20 to 62 words a stop, a blurb of 70 to 80
//      characters that says "back to Earth" when the trip leaves the Earth's stage, a `next:`.
//   2. NO STOP IS WORDS OVER BLACK, as far as a registry can say it: every stop at a nebula has a
//      photograph and stands on the side it was taken from; every portrait has a picture; every
//      look at the sky draws a figure.
//   3. WHAT IS UP: the Milky Way's best-placed stretch (sky/lookfor.js), the next shower
//      (sky/radiants.js), for a place and a date.
//   4. THE GROUND WEARS THE STOP'S SKY: `darkness:` and the shower's radiant are held on the sky
//      view for the stop and never stored (flown by the real machine with a stand-in sky view).
//   5. THE GENERATED LINES: the next close pass and the catalogue's count are counted from records,
//      a photograph's credit is its row's, a portrait's line says it is drawn larger.
//   6. THE PORTRAIT'S SIZE is a share of the view, whatever the distance (scene/portraits.js).
//   7. A MODEL NOBODY WANTS IS PUT AWAY (scene/heroes.js; internal #400), and in present mode a
//      stop shows its own name only (ui.css).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

let REAL = Date.parse('2026-10-06T10:00:00Z');
Date.now = () => REAL;

const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS, TOUR_GROUPS } = await import(join(JS, 'data/tours.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));
const { EXOTICS } = await import(join(JS, 'data/exotics.js'));
const { SHOWERS } = await import(join(JS, 'data/showers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { clock } = await import(join(JS, 'clock.js'));
const { WORLDS, createWorlds } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createStarfield } = await import(join(JS, 'scene/starfield.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const L = await import(join(JS, 'sky/lookfor.js'));
const R = await import(join(JS, 'sky/radiants.js'));
const P = await import(join(JS, 'scene/portraits.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const HOUR = 3600e3;
const DAY = 24 * HOUR;

const EIGHT = ['life-of-a-star', 'black-holes', 'through-a-telescope', 'a-dark-sky', 'asteroids-that-come-close',
  'satellites-and-junk', 'comets-and-meteors', 'birth-of-the-solar-system'];
const PLACE = { name: 'Testville', latDeg: 32.08, lonDeg: 34.78, altKm: 0, source: 'set' };
const SOUTH = { name: 'Southville', latDeg: -33.9, lonDeg: 18.4, altKm: 0, source: 'set' };

// ------------------------------------------------------------------ 1. the eight trips
{
  const groups = new Set(TOUR_GROUPS.map((g) => g.id));
  for (const id of EIGHT) {
    const trip = TOURS.find((t) => t.id === id);
    check(!!trip, `there is no ${id} trip`);
    if (!trip) continue;
    check(trip.stops.length >= 6 && trip.stops.length <= 9, `${id}: ${trip.stops.length} stops; the brief asked for 6 to 9`);
    check(trip.blurb.length >= 70 && trip.blurb.length <= 80, `${id}: the blurb is ${trip.blurb.length} characters, outside 70 to 80`);
    check(groups.has(trip.group), `${id}: group ${trip.group}`);
    check(TOURS.some((t) => t.id === trip.next) && trip.next !== id, `${id}: next: ${trip.next}`);
    if (trip.stage && trip.stage !== 'earth') check(/back to Earth/.test(trip.blurb), `${id}: leaving changes the stage, and the blurb must say so`);
    check(trip.stops.every((s) => typeof s.chapter === 'string' && s.chapter.length > 0), `${id}: every stop is in a chapter`);
    for (const stop of trip.stops) {
      const words = String(stop.card.body).split(/\s+/).length;
      check(words >= 20 && words <= 62, `${id}/${stop.id}: ${words} words; written for the ear is 20 to 62`);
    }
  }
  // Every trip is reachable from another's end card, so the eight are a programme and not a list.
  for (const id of EIGHT) check(TOURS.some((t) => t.next === id), `${id}: no trip's end card offers it`);
}

// ------------------------------------------------------------------ 2. no stop is words over black
{
  const pictured = new Set(NEBULAE.map((row) => `dso-${row.id}`));
  const portraits = new Set(EXOTICS.filter((x) => x.image && x.image.file).map((x) => `exotic-${x.id}`));
  let photographs = 0;
  for (const id of EIGHT) {
    const trip = TOURS.find((t) => t.id === id);
    if (!trip) continue;
    for (const stop of trip.stops) {
      const where = `${id}/${stop.id}`;
      const rec = stop.target && stop.target.record;
      if (rec && /^dso-/.test(rec) && rec !== 'dso-milky-way') {
        photographs += 1;
        check(pictured.has(rec), `${where}: ${rec} has no photograph in registry/nebulae.yaml, so the stop would be a mark`);
        check(stop.key_light_deg === 0, `${where}: a photograph is drawn only from the side it was taken from (key_light_deg: 0), and this stop stands at ${stop.key_light_deg}`);
        const row = NEBULAE.find((r) => `dso-${r.id}` === rec);
        check(row && row.credit && row.licence === 'CC BY 4.0', `${where}: the picture has no credit to print`);
      }
      if (stop.portrait) check(portraits.has(rec), `${where}: portrait on ${rec}, which has no picture`);
      if (stop.target && stop.target.sky) check(Array.isArray(stop.figures) && stop.figures.length > 0, `${where}: a look at the sky with no figure drawn is a field of dots`);
      if (stop.darkness) check(stop.look && stop.target.observer === true, `${where}: darkness on a stop that is not seen from the ground`);
    }
  }
  check(photographs >= 14, `the eight trips stand at ${photographs} photographs; the star and telescope trips alone need fourteen`);
  const three = TOURS.find((t) => t.id === 'through-a-telescope').stops.slice(0, 3);
  check(three.map((s) => s.exposure).join() === 'eye,camera,deep' && new Set(three.map((s) => s.target.record)).size === 1,
    'the telescope trip opens on one nebula at the three exposures, eye then camera then deep');
  const dark = TOURS.find((t) => t.id === 'a-dark-sky').stops.filter((s) => s.darkness);
  check(dark.map((s) => s.darkness).join() === 'city,town,dark' && new Set(dark.map((s) => JSON.stringify(s.look))).size === 1,
    'the dark-sky trip shows one patch of sky from a city, a town and a dark place, in that order');
  const sats = TOURS.find((t) => t.id === 'satellites-and-junk');
  check(sats.stops.every((s) => s.time === undefined && s.rate === undefined), 'the satellites trip loads the whole catalogue, so no stop of it may move the clock');
  check(sats.stops.some((s) => s.live_note === 'satellites'), 'the satellites trip states its count from the catalogue, not from a typed number');
  for (const stop of sats.stops) check(!/\b\d{2}[   ]?\d{3}\b/.test(stop.card.body), `satellites-and-junk/${stop.id}: a count typed as digits`);
}

// ------------------------------------------------------------------ 3. what is up (pure)
{
  const night = Date.parse('2026-10-06T19:00:00Z'); // 22:00 at PLACE
  const mw = L.bestMilkyWay(PLACE, night);
  check(mw && mw.altDeg >= 20 && typeof mw.name === 'string', `no stretch of the Milky Way is up at 22:00 in October at 32 N (${JSON.stringify(mw)})`);
  // An October evening in the north: the Swan is near the zenith and Sagittarius is setting.
  check(mw && /Swan|Cassiopeia|Eagle/.test(mw.name), `the October evening Milky Way from 32 N is ${mw && mw.name}`);
  const south = L.bestMilkyWay(SOUTH, Date.parse('2026-06-15T20:00:00Z'));
  check(south && /Scorpion|Sagittarius|Cross|Keel/.test(south.name), `a June evening from 34 S faces ${south && south.name}`);
  const aim = L.lookTarget({ best: 'milky-way' }, PLACE, night);
  check(aim && aim.kind === 'milky-way' && aim.up === true && aim.name === mw.name, 'look: {best: milky-way} is that stretch');
  const day = L.lookTarget({ best: 'milky-way' }, PLACE, Date.parse('2026-10-06T10:00:00Z'));
  check(day && day.up === false && day.daylight === true, 'nothing is pointed at in daylight');
  for (const part of L.MILKY_WAY) check(part.ra >= 0 && part.ra < 360 && Math.abs(part.dec) <= 70 && part.rich > 0, `Milky Way stretch ${part.name}`);

  const oct = R.nextShower(Date.parse('2026-10-06T10:00:00Z'), SHOWERS);
  check(oct && oct.shower.id === 'orionids' && new Date(oct.peakMs).getMonth() === 9 && new Date(oct.peakMs).getDate() === 21, `on 6 October the next shower is ${oct && oct.shower.id}`);
  const peakNight = R.nextShower(Date.parse('2026-10-21T23:00:00'), SHOWERS);
  check(peakNight && peakNight.shower.id === 'orionids', 'on the peak night itself it is still the Orionids');
  const morningAfter = R.nextShower(Date.parse('2026-10-22T03:00:00'), SHOWERS);
  check(morningAfter && morningAfter.shower.id === 'orionids', 'and in the small hours after it, which is when the shower is watched');
  const later = R.nextShower(Date.parse('2026-10-24T12:00:00'), SHOWERS);
  check(later && later.shower.id === 'leonids', `three days after, it is ${later && later.shower.id}`);
  const newYear = R.nextShower(Date.parse('2026-12-28T12:00:00'), SHOWERS);
  check(newYear && newYear.shower.id === 'quadrantids' && new Date(newYear.peakMs).getFullYear() === 2027, 'after the last shower of the year the next is January’s, next year');
  check(R.nextShower(REAL, []) === null && R.nextShower(REAL, null) === null, 'no showers: null, not a throw');
}

// ------------------------------------------------------------------ 3b. the bodies a stop names are where they are
{
  // JPL Horizons, heliocentric ecliptic J2000 vectors in km for 2026-10-06 00:00 TDB (JD 2461319.5),
  // CENTER=500@10, read 2026-10-06. Two-body motion from each bundled row must land on them.
  const HORIZONS = {
    'asteroid-4': [348020609, 111373997, -45683955],
    'asteroid-3200': [124921046, 25597071, 50174099],
    'asteroid-65803': [123294821, -160951633, -9842376],
    'asteroid-99942': [-25202011, -122866555, 5962281],
    'asteroid-101955': [-94963187, -177814115, -18437145],
    'comet-1P': [-2895179698, 4109303394, -1474036901],
  };
  const { kepler } = await import(join(JS, 'propagate/index.js'));
  const { namedAsteroids, namedComets, sampleAsteroids } = await import(join(JS, 'data/sample.js'));
  const AU = 149597870.7;
  const tMs = (2461319.5 - 2440587.5) * 86400e3 - 69184; // TDB to UTC, 69.184 s in 2026
  const named = [...namedAsteroids(), ...namedComets()];
  check(named.length === 6 && named.every((r) => r.cls === 'inferred' && r.propagator === 'kepler' && Number.isFinite(r.elements.maRad)), 'six named bodies, each with its phase and classed inferred, never sample');
  for (const r of named) {
    const want = HORIZONS[r.id];
    const p = kepler(r, tMs);
    const miss = want && p ? Math.hypot(p.x - want[0], p.y - want[1], p.z - want[2]) / AU : Infinity;
    check(miss < 0.0002, `${r.id}: ${miss.toFixed(5)} au from JPL Horizons on 2026-10-06; a stop that says "where it is today" needs 0.0002`);
    check(typeof r.meta.why === 'string' && r.meta.why.length > 40 && r.meta.whySource, `${r.id}: no line, or no source for it`);
  }
  // The stand-ins at a placeholder perihelion share these ids; the layer must prefer the real rows.
  const src = readFileSync(join(JS, 'data/layers.js'), 'utf8');
  // What the Moon does on a shower's night (internal #413), from the Moon's own phases that year.
  {
    const { showerMoon } = await import(join(JS, 'sky/lookfor.js'));
    const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
    const from = new Date(Date.UTC(2026, 10, 1));
    const newMoon = Astronomy.SearchMoonPhase(0, from, 40).date.getTime();
    const full = Astronomy.SearchMoonPhase(180, from, 40).date.getTime();
    const quarter = Astronomy.SearchMoonPhase(90, from, 40).date.getTime();
    const a = showerMoon(newMoon), b = showerMoon(full), c = showerMoon(quarter);
    check(a && a.kind === 'dark' && a.percent <= 1, `at new Moon a shower has a dark sky (${JSON.stringify(a)})`);
    check(b && b.kind === 'bright' && b.percent >= 99, `at full Moon it is washed out (${JSON.stringify(b)})`);
    check(c && c.kind === 'some' && Math.abs(c.percent - 50) <= 2, `at first quarter it is half lit (${JSON.stringify(c)})`);
    check(showerMoon(NaN) === null, 'no night, no Moon line');
    const { COPY } = await import(join(JS, 'copy/en.js'));
    check(['dark', 'some', 'bright'].every((k) => /\{pct\}% lit that night/.test(COPY.trip.lookShowerMoon[k])), 'each of the three sentences gives the lit share');
    check(/showerMoon\(found\.peakMs\)/.test(readFileSync(join(JS, 'ui/trip.js'), 'utf8')), 'and the shower stop\'s line asks for it at the peak');
  }
  // The named rows outlive the select and the budget (internal #444: Halley, ranked last of 200).
  {
    const { withinBudget } = await import(join(JS, 'data/layers.js'));
    const rank = (a, b) => a.mag - b.mag;
    const crowd = Array.from({ length: 200 }, (_, i) => ({ id: `comet-${i}`, mag: i / 10 }));
    const halley = { id: 'comet-1P', mag: 28.6 };
    const cut = withinBudget(crowd.concat([halley]), [halley], { maxItems: 60, rank });
    check(cut.length === 60 && cut.includes(halley), `sixty comets of two hundred and one, and Halley among them (${cut.length}, ${cut.includes(halley)})`);
    check(cut.filter((r) => r !== halley).every((r) => r.mag < 5.9), 'the other fifty-nine are the brightest');
    check(withinBudget(crowd.slice(0, 5), [halley], { maxItems: 60, rank }).includes(halley), 'a row the select dropped is put back');
    check(withinBudget(crowd, [], { maxItems: 60, rank }).length === 60 && withinBudget(crowd, null, null).length === 200, 'a layer with no rows of its own is cut as before, and one with no budget not at all');
    check(/selected = withinBudget\(selected, own, layer\.budget\)/.test(src), 'and the loader uses it');
  }
  check(/always: namedAsteroids/.test(src) && /always: namedComets/.test(src) && /parsed\.filter\(\(r\) => !ids\.has\(r\.id\)/.test(src), 'the asteroids and comets layers always carry their named rows, in place of a stand-in of the same id');
  check(sampleAsteroids().some((r) => r.id === 'asteroid-99942' && r.cls === 'sample'), 'the stand-in Apophis still exists, and is still classed sample');
  for (const id of EIGHT) {
    for (const stop of TOURS.find((t) => t.id === id).stops) {
      const rec = stop.target && stop.target.record;
      if (rec && /^(asteroid|comet)-/.test(rec)) check(named.some((r) => r.id === rec), `${id}/${stop.id}: ${rec} is not a row the app always has, so the stop would be dropped on the live site`);
    }
  }
  // Full dark, and the middle of the night.
  const noon = Date.parse('2026-10-06T10:00:00Z');
  const deep = L.deepNightMs(PLACE, noon);
  const sun = L.altAzOfBody('sun', PLACE, deep);
  check(deep > L.tonightMs(PLACE, noon) && sun.altDeg <= -17.5 && sun.altDeg > -24, `full dark from noon: the Sun is ${sun.altDeg.toFixed(1)} degrees up at ${new Date(deep).toISOString()}`);
  const north = { latDeg: 59.9, lonDeg: 30.3, altKm: 0 };
  const white = L.deepNightMs(north, Date.parse('2026-06-21T10:00:00Z'));
  check(Number.isFinite(white), 'where it never gets fully dark the darkest moment is an answer, not a null');
  const mid = L.midnightMs(PLACE, noon);
  const w = L.nightWindow(PLACE, noon);
  check(mid > deep && mid > w.fromMs && mid < w.untilMs && Math.abs(mid - (w.fromMs + w.untilMs) / 2) < 1000, 'midnight is the middle of the dark');
  check(L.deepNightMs(null, noon) === noon && L.midnightMs(null, noon) === noon, 'no place: the instant asked about');
}

// ------------------------------------------------------------------ the machine
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 4) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      try { fn(0); } catch { /* ui/cards.js wants a document; not under test */ }
    }
  }
};
const FOV = 45;
const ASPECT = 1440 / 900;
const listeners = new Map();
globalThis.window = {
  addEventListener: (type, fn) => { if (!listeners.has(type)) listeners.set(type, new Set()); listeners.get(type).add(fn); },
  removeEventListener: (type, fn) => { if (listeners.has(type)) listeners.get(type).delete(fn); },
  dispatchEvent: (e) => { for (const fn of listeners.get(e.type) || []) fn(e); return true; },
  matchMedia: () => ({ matches: false }),
  location: { hash: '' },
  history: { replaceState() {} },
};
const land = (id) => window.dispatchEvent({ type: 'sr:layer', detail: { id, count: 1 } });

function machineFor({ records = {} } = {}) {
  const camera = new THREE.PerspectiveCamera(FOV, ASPECT, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6.371 });
  stage.setWorld('earth');
  stage.setOrigin(null);
  const scene = new THREE.Scene();
  const worlds = createWorlds(scene, { textureBase: null, camera });
  worlds.update(REAL);
  const starfield = createStarfield(scene, { starsBin: new ArrayBuffer(0), linesJson: { features: [] }, namesJson: [], milkyWayTexture: scene });
  const sky = { active: false, entered: 0, exited: 0, looks: [], holds: [], held: null,
    enter(o) { this.active = !!o; this.entered += 1; return this.active; },
    exit() { this.active = false; this.exited += 1; this.held = null; },
    hold(over) { this.held = over && (over.darkness || over.radiant) ? { ...over } : null; this.holds.push(this.held); },
    lookAtDeg(az, alt) { this.looks.push([az, alt]); } };
  const all = Object.values(records).flat();
  const ctx = {
    camera, cameraRig: rig, worlds, clock, starfield, skyView: sky,
    layers: [{ id: 'worlds', propagator: 'body' }, { id: 'asteroids' }, { id: 'active' }, { id: 'comets' }, { id: 'far-bodies' }, { id: 'stars' }, { id: 'deep-sky' }, { id: 'exotics' }],
    recordsFor: (id) => records[id] || [],
    records: () => all,
    recordById: (id) => all.find((r) => r.id === id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    select() {},
    deselect() { rig.stopFollow(); },
    selected: () => null,
    guessPlace: () => PLACE,
    pictureLine: (id) => `PICTURE ${id}`,
    portraitLine: (id) => `PORTRAIT ${id}`,
    setStage(id) {
      if (!STAGES[id] || stage.worldId === id) return false;
      stage.setWorld(id);
      worlds.update(clock.now());
      const w = WORLDS.find((x) => x.id === id);
      const r = w ? w.radiusKm / stage.unitKm : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, FOV, ASPECT) : 5, ms: 0 });
      return true;
    },
  };
  return { ctx, camera, rig, worlds, sky, machine: createTrip(ctx) };
}
function arrive(m) {
  m.rig.finishFlight();
  pump(3);
  m.rig.update(0.016);
  m.worlds.update(clock.now());
  m.camera.updateMatrixWorld(true);
}
async function begin(m, id, lands) {
  clock.live();
  for (const l of lands) land(l);
  const plan = await m.machine.start(id);
  pump();
  return plan;
}
async function throughVeil(m) {
  for (let k = 0; k < 20 && m.machine.state.phase === 'veil'; k += 1) { await new Promise((r) => setImmediate(r)); pump(2); }
}
async function walk(m, trip, plan, each) {
  const dropped = new Set((plan.dropped || []).map((d) => d.id));
  const kept = trip.stops.filter((s) => !dropped.has(s.id));
  m.machine.play();
  pump(1);
  for (let i = 0; i < kept.length; i += 1) {
    await throughVeil(m);
    arrive(m);
    check(m.machine.state.index === i && ['settle', 'dwell'].includes(m.machine.state.phase), `${trip.id}/${kept[i].id}: at stop ${m.machine.state.index}, ${m.machine.state.phase}`);
    each(kept[i], m.machine.state);
    m.machine.next();
    pump(2);
  }
  check(m.machine.state.phase === 'outro', `${trip.id}: after the last stop the trip is in ${m.machine.state.phase}`);
}

// ------------------------------------------------------------------ 4. the ground wears the stop's sky
{
  REAL = Date.parse('2026-10-06T10:00:00Z');
  const trip = TOURS.find((t) => t.id === 'a-dark-sky');
  const m = machineFor();
  const plan = await begin(m, trip.id, ['worlds']);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0, `a-dark-sky: ${plan && plan.count} of ${trip.stops.length} stops, dropped ${plan && JSON.stringify(plan.dropped)}`);
  const worn = [];
  await walk(m, trip, plan, (stop, st) => {
    check(st.ground === !!stop.look && m.sky.active === !!stop.look, `a-dark-sky/${stop.id}: on the ground is ${st.ground}`);
    if (stop.darkness) {
      worn.push(m.sky.held && m.sky.held.darkness);
      check(m.sky.held && m.sky.held.darkness === stop.darkness, `a-dark-sky/${stop.id}: the sky view wears ${JSON.stringify(m.sky.held)}, not ${stop.darkness}`);
      check(typeof st.stopNote === 'string' && /Milky Way/.test(st.stopNote), `a-dark-sky/${stop.id}: the line does not say where the view faces (${st.stopNote})`);
      const at = m.sky.looks[m.sky.looks.length - 1];
      check(at && at[1] >= 6 && at[1] <= 80, `a-dark-sky/${stop.id}: the view turned to ${JSON.stringify(at)}`);
    } else check(m.sky.held === null, `a-dark-sky/${stop.id}: a sky is still held off the ground (${JSON.stringify(m.sky.held)})`);
  });
  check(worn.join() === 'city,town,dark', `the three skies worn were ${worn}`);
  const looks = m.sky.looks.slice(-3);
  check(looks.length === 3 && looks.every((l) => Math.abs(l[0] - looks[0][0]) < 1 && Math.abs(l[1] - looks[0][1]) < 1), `the three skies are one patch of sky (${JSON.stringify(looks)})`);
  m.machine.stop('test');
  check(m.sky.active === false && m.sky.held === null, 'leaving lets the sky go');
}

// ------------------------------------------------------------------ 4b. the next shower, from the ground
{
  REAL = Date.parse('2026-10-06T10:00:00Z');
  const trip = TOURS.find((t) => t.id === 'comets-and-meteors');
  const comet = { id: 'comet-1P', name: '1P/Halley', layer: 'comets', klass: 'comet', propagator: 'static', frame: 'sun-inertial', pos: { x: 2e8, y: 1e8, z: 0 }, meta: {} };
  const rock = (id, name) => ({ id, name, layer: 'asteroids', klass: 'asteroid', propagator: 'static', frame: 'sun-inertial', pos: { x: -2e8, y: 1e8, z: 1e7 }, meta: {} });
  const m = machineFor({ records: { comets: [comet], asteroids: [rock('asteroid-3200', 'Phaethon')], 'far-bodies': [{ ...rock('interstellar-2i', '2I/Borisov'), layer: 'far-bodies' }] } });
  const plan = await begin(m, trip.id, ['worlds', 'comets', 'far-bodies', 'asteroids', 'stars']);
  check(plan && plan.count === trip.stops.length, `comets-and-meteors: ${plan && plan.count} stops resolve (${plan && JSON.stringify(plan.dropped)})`);
  if (plan && plan.count === trip.stops.length) {
    await walk(m, trip, plan, (stop, st) => {
      if (stop.look && stop.look.shower) {
        check(st.ground === true && m.sky.held && m.sky.held.radiant === 'orionids' && m.sky.held.darkness === 'dark', `comets/${stop.id}: the sky view holds ${JSON.stringify(m.sky.held)}`);
        check(/Orionids/.test(st.stopNote || '') && /meteors an hour/.test(st.stopNote || ''), `comets/${stop.id}: the line is "${st.stopNote}"`);
        check(!/2026|21 Oct.*21 Oct/.test(String(stop.card.body)), `comets/${stop.id}: the card names a date the line generates`);
      }
    });
    m.machine.stop('test');
  }
}

// ------------------------------------------------------------------ 5. the generated lines
{
  REAL = Date.parse('2026-10-06T10:00:00Z');
  const trip = TOURS.find((t) => t.id === 'asteroids-that-come-close');
  const at = (id, name, extra = {}) => ({ id, name, layer: 'asteroids', klass: 'asteroid', propagator: 'static', frame: 'sun-inertial', pos: { x: 3e8, y: 1e8, z: 0 }, meta: {}, ...extra });
  const records = {
    asteroids: [
      at('asteroid-99942', 'Apophis'), at('asteroid-65803', 'Didymos'), at('asteroid-101955', 'Bennu'),
      at('neo-a', '2026 TA', { meta: { closeApproachMs: REAL + 9 * DAY, missDistanceLd: 4.26 } }),
      at('neo-b', '2026 TB', { meta: { closeApproachMs: REAL + 2 * DAY, missDistanceKm: 384400 * 1.5 } }),
      at('neo-c', '2026 SZ', { meta: { closeApproachMs: REAL - 1 * DAY, missDistanceLd: 0.3 } }),
    ],
    'far-bodies': [{ ...at('dwarf-ceres', 'Ceres'), layer: 'far-bodies' }],
    'deep-space': [{ ...at('deep-hera', 'Hera'), layer: 'deep-space', klass: 'probe' }],
  };
  const m = machineFor({ records });
  const plan = await begin(m, trip.id, ['worlds', 'asteroids', 'far-bodies', 'deep-space']);
  check(plan && plan.count === trip.stops.length, `asteroids: ${plan && plan.count} of ${trip.stops.length} stops (${plan && JSON.stringify(plan.dropped)})`);
  if (plan && plan.count === trip.stops.length) {
    await walk(m, trip, plan, (stop, st) => {
      if (stop.live_note === 'close-approach') {
        check(/2026 TB/.test(st.stopNote || '') && /1[.,]5 times the Moon/.test(st.stopNote || ''), `asteroids/${stop.id}: the next pass is the soonest one still to come, with its distance: "${st.stopNote}"`);
        check(st.names === true, `asteroids/${stop.id}: a stop about several rocks keeps their names up`);
      } else if (stop.names !== true) check(st.names === false, `asteroids/${stop.id}: names are held up on a stop that did not ask`);
    });
    m.machine.stop('test');
  }
  // With nothing loaded the line says so, and names nothing.
  const bare = machineFor({ records: { asteroids: records.asteroids.slice(0, 3), 'far-bodies': records['far-bodies'], 'deep-space': records['deep-space'] } });
  const plan2 = await begin(bare, trip.id, ['worlds', 'asteroids', 'far-bodies', 'deep-space']);
  bare.machine.jumpTo(trip.stops.findIndex((s) => s.live_note === 'close-approach'));
  bare.machine.play();
  pump(1);
  await throughVeil(bare);
  arrive(bare);
  check(plan2 && bare.machine.state.stopNote === COPY.trip.approachNone, `with no table loaded the line is "${bare.machine.state.stopNote}"`);
  bare.machine.stop('test');
}
{
  const trip = TOURS.find((t) => t.id === 'satellites-and-junk');
  const sat = (i, name) => ({ id: `sat-${i}`, name, noradId: i, layer: 'active', klass: 'satellite', propagator: 'static', frame: 'earth-inertial', pos: { x: 7000, y: 0, z: 0 }, meta: {} });
  const active = [];
  for (let i = 0; i < 1234; i += 1) active.push(sat(50000 + i, i < 800 ? `STARLINK-${i}` : `OTHER ${i}`));
  const m = machineFor({ records: { active } });
  const plan = await begin(m, trip.id, ['worlds', 'stations', 'notable', 'visual']);
  // The station, Hubble, Envisat and a rocket body are not in this stand-in, so those stops drop.
  check(plan && plan.count >= 4, `satellites: ${plan && plan.count} stops without the live catalogues (${plan && JSON.stringify(plan.dropped)})`);
  if (plan && plan.count >= 4) {
    let counted = 0;
    await walk(m, trip, plan, (stop, st) => {
      if (stop.live_note !== 'satellites') return;
      counted += 1;
      check(/1\D?234 working satellites/.test(st.stopNote || '') && /800 of them Starlink/.test(st.stopNote || ''), `satellites/${stop.id}: the count is the catalogue's own: "${st.stopNote}"`);
    });
    check(counted === 2, `${counted} stops state the count`);
    check(clock.mode === 'live', 'the satellites trip never took the clock');
    m.machine.stop('test');
  }
}
{
  // A stop at a photograph prints its credit; a portrait says what it is. Flown on the telescope trip.
  const trip = TOURS.find((t) => t.id === 'black-holes');
  const ex = (id) => ({ id, name: id, layer: 'exotics', klass: 'exotic', propagator: 'static', frame: 'sun-inertial', pos: { x: 1e17, y: 2e17, z: 0 }, meta: { image: { file: 'site/images/x.jpg', credit: 'EHT Collaboration', licence: 'CC BY 4.0' } } });
  const m = machineFor({ records: { exotics: [ex('exotic-cygnus-x-1'), ex('exotic-sgr-a-star'), ex('exotic-m87-star')], galaxy: [{ ...ex('dso-milky-way'), layer: 'galaxy', klass: 'dso' }] } });
  const plan = await begin(m, trip.id, ['worlds', 'stars', 'exotics', 'deep-sky', 'galaxy']);
  check(plan && plan.count === trip.stops.length, `black-holes: ${plan && plan.count} of ${trip.stops.length} stops (${plan && JSON.stringify(plan.dropped)})`);
  check(m.machine.state.wants.portrait === true && m.machine.state.wants.figures === true, 'the intro asks for the portraits and the figures in time');
  if (plan && plan.count === trip.stops.length) {
    await walk(m, trip, plan, (stop, st) => {
      if (stop.portrait) {
        check(st.portrait && st.portrait.id === stop.target.record, `black-holes/${stop.id}: the portrait drawn is ${JSON.stringify(st.portrait)}`);
        check(st.stopNote === `PORTRAIT ${stop.target.record}`, `black-holes/${stop.id}: the line under it is "${st.stopNote}"`);
      } else check(st.portrait === null, `black-holes/${stop.id}: a portrait is still up (${JSON.stringify(st.portrait)})`);
      if (stop.target.record === 'dso-milky-way') check(st.stopNote === 'PICTURE dso-milky-way', `black-holes/${stop.id}: a deep-sky stop asks for its picture's line`);
    });
    m.machine.stop('test');
    check(m.machine.state.portrait === null && m.machine.state.names === false, 'leaving takes the portrait down');
  }
  check(/drawn far larger/.test(COPY.trip.portraitLine) && /\{credit\}/.test(COPY.trip.portraitLine) && /\{licence\}/.test(COPY.trip.portraitLine), 'the portrait’s line says it is drawn larger, and whose picture it is');
  check(/\{credit\}/.test(COPY.trip.pictureLine) && /\{licence\}/.test(COPY.trip.pictureLine), 'a photograph’s line carries its credit and its licence');
}

// ------------------------------------------------------------------ 5b. a photograph is seen from its own side
{
  // Nine pictured objects all round the sky, three of them far north of the ecliptic, where the key
  // light's own search (level with the ecliptic, or above it) could not put the camera.
  const trip = TOURS.find((t) => t.id === 'through-a-telescope');
  const ids = [...new Set(trip.stops.map((s) => s.target.record))];
  const LY = 9460730472580.8;
  const dirs = { 'dso-m51': [-0.63, 0.05, 0.77], 'dso-m31': [0.75, 0.37, 0.55], 'dso-carina-nebula': [-0.3, 0.42, -0.86] };
  const deepSky = ids.map((id, k) => {
    const d = dirs[id] || [Math.cos(k * 1.3), Math.sin(k * 1.3), 0.25 * Math.sin(k * 2.1)];
    const n = Math.hypot(...d);
    const far = (id === 'dso-m51' ? 2.3e7 : id === 'dso-m31' ? 2.5e6 : 1300 + 900 * k) * LY;
    return { id, name: id, layer: 'deep-sky', klass: 'dso', propagator: 'static', frame: 'sun-inertial', pos: { x: (d[0] / n) * far, y: (d[1] / n) * far, z: (d[2] / n) * far }, meta: {} };
  });
  const m = machineFor({ records: { 'deep-sky': deepSky } });
  const plan = await begin(m, trip.id, ['worlds', 'stars', 'deep-sky']);
  check(plan && plan.count === trip.stops.length, `through-a-telescope: ${plan && plan.count} of ${trip.stops.length} stops (${plan && JSON.stringify(plan.dropped)})`);
  if (plan && plan.count === trip.stops.length) {
    const origin = new THREE.Vector3(0, 0, 0);
    await walk(m, trip, plan, (stop, st) => {
      const rec = deepSky.find((r) => r.id === stop.target.record);
      const at = stage.toScene({ ...rec.pos, frame: rec.frame }, rec.frame, clock.now());
      const toCam = m.camera.position.clone().sub(at).normalize();
      const toSun = origin.clone().sub(at).normalize();
      const deg = (Math.acos(Math.min(1, toCam.dot(toSun))) * 180) / Math.PI;
      // scene/nebulae.js viewFade: whole inside 25 degrees of the line, gone by 50. The drift is 4.
      check(deg < 8, `telescope/${stop.id}: the camera is ${deg.toFixed(1)} degrees off the line from ${rec.id} to the Sun, where its photograph fades`);
      check(st.exposure === stop.exposure && st.stopNote === `PICTURE ${rec.id}`, `telescope/${stop.id}: exposure ${st.exposure}, line "${st.stopNote}"`);
    });
    m.machine.stop('test');
  }
}

// ------------------------------------------------------------------ 6. the portrait's size
{
  const s = P.portraitScale(P.PORTRAIT_SHARE, 45);
  check(Math.abs(s / (2 * Math.tan((45 * Math.PI) / 360)) - P.PORTRAIT_SHARE) < 1e-12, 'the picture spans its share of a 45 degree view');
  check(P.PORTRAIT_SHARE > 0.2 && P.PORTRAIT_SHARE <= 0.5, `the share is ${P.PORTRAIT_SHARE}: big enough to read, never the whole view`);
  check(P.feather(0) === 1 && P.feather(0.6) === 1 && P.feather(1) === 0 && P.feather(0.9) > 0 && P.feather(0.9) < 0.5, 'whole in the middle, gone at the rim');
  const portraits = P.createPortraits(new THREE.Scene());
  check(portraits.show({ id: 'x', meta: {} }) === false && portraits.shown() === null, 'a record with no picture shows nothing');
  portraits.update(new THREE.PerspectiveCamera(45, 1.6, 0.1, 10), REAL, 16);
  portraits.dispose();
  const src = readFileSync(join(JS, 'scene/portraits.js'), 'utf8');
  check(/sizeAttenuation: false/.test(src) && /AdditiveBlending/.test(src), 'a constant share of the view, added to the sky like every other light');
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/scene\/portraits\.js'\)/.test(main) && !/^import .*portraits\.js/m.test(main), 'the portraits are a dynamic import: nothing of them at boot');
}

// ------------------------------------------------------------------ 7. models put away; one name in present mode
{
  const heroes = readFileSync(join(JS, 'scene/heroes.js'), 'utf8');
  const update = heroes.slice(heroes.indexOf('function update(tMs'));
  check(/const wanted = new Set\([^\n]+\n(?:\s*\/\/[^\n]*\n)*\s*for \(const id of \[\.\.\.live\.keys\(\)\]\) if \(!wanted\.has\(id\)\) release\(id\);/.test(update),
    'scene/heroes.js update() releases every model that is no longer wanted (the line public #466 lost; internal #400)');
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  check(/html\.sr-present\.sr-trip-mode:not\(\[data-trip-names\]\) #labels \.label:not\(\.is-subject\):not\(\.sr-sky-label\):not\(\[data-kind='selection'\]\) \{\s*opacity: 0;/.test(css),
    'in present mode a stop shows its own name and no other, unless it asks (data-trip-names)');
  const frame = readFileSync(join(JS, 'ui/tripframe.js'), 'utf8');
  check(/NAMES_ATTR = 'data-trip-names'/.test(frame) && /st\.names/.test(frame), 'ui/tripframe.js puts a stop’s `names: true` on <html>');
  const sky = readFileSync(join(JS, 'sky/skyview.js'), 'utf8');
  check(/function hold\(over\)/.test(sky) && !/function hold\(over\) \{[^}]*writeSkyOptions/.test(sky), 'the sky view holds a stop’s sky without storing it');
}

if (problems.length) {
  console.error(`${problems.length} problem(s):`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log('remaining trips ok: eight trips of six to nine stops written for the ear, every nebula stop at a credited photograph seen from its own side, the Milky Way and the next shower found for a place and a date, the ground wearing a city, a town and a dark sky in turn, counts and credits generated, the portrait a share of the view, and models put away when nobody wants them');
