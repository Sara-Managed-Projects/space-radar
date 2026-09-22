// tests/test_outer_trip.mjs -- "Out past Jupiter": ten stops, each on the stage where its subject
// is drawn where it really is.
//
// Four things a validator reading registry/tours.yaml cannot see:
//
//   1. THE STOP IS A RECORD THE BROWSER HAS. Every stop is resolved through ctx.recordById(), and
//      an id no layer emits is a stop dropped without a word, before the count is shown. These ten
//      come from three layers that need no network -- the worlds, the bundled far bodies and the
//      bundled deep-space craft -- so the trip must resolve whole at any date, CelesTrak or no
//      CelesTrak.
//   2. THE WORDS HOLD. Each card within the caps scripts/check_registry.py and ui/cards.js
//      measure, read from the checker rather than copied, with no " -- " and no word that goes
//      stale.
//   3. THE NUMBERS ARE THE RECORDS' OWN. Where a card states a distance or a date that this
//      repository also computes -- Eris at ninety-five times the Earth's distance, Sedna's
//      seventy-six, Voyager 1 past a hundred and seventy, Europa Clipper's April 2030 and its 49
//      flybys -- the card is checked against the record, at four dates. A card that drifts from
//      the data under it is the failure this section exists for.
//   4. THE CAMERA CAN SEE IT. This runs the real machine -- ui/trip.js, the key-light search, the
//      rig, scene/worlds.js -- at four instants three months apart, because the Sun and the moons
//      move the shot. At every stop: the map is centred where the stop asked, the subject is drawn
//      at its true size and place from there (viewScale), the camera is outside it, it is framed
//      between a pixel and the whole screen, and the planet a moon goes round is in the picture
//      true as well.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { farBodies, sampleDeepSpace } = await import(join(JS, 'data/sample.js'));
const { worldRecords, WORLDS, createWorlds, positionOf } = await import(join(JS, 'scene/worlds.js'));
const { stage, STAGES } = await import(join(JS, 'scene/stage.js'));
const { createCameraRig, worldFramingDistance } = await import(join(JS, 'scene/camera.js'));
const { createTrip } = await import(join(JS, 'ui/trip.js'));
const { propagate } = await import(join(JS, 'propagate/index.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const notes = [];

const TRIP_ID = 'outer-solar-system';
const trip = TOURS.find((t) => t.id === TRIP_ID);
if (!trip) {
  console.error(`outer trip FAILED: there is no '${TRIP_ID}' in data/tours.js`);
  process.exit(1);
}

const KM_PER_AU = 1.495978707e8;
const records = [...worldRecords(), ...farBodies(), ...sampleDeepSpace()];
const byId = new Map(records.map((r) => [r.id, r]));
const rowOf = (id) => WORLDS.find((w) => w.id === id);

// ------------------------------------------------------- 1. every stop is a record that exists
check(trip.stops.length >= 8 && trip.stops.length <= 10, `${trip.stops.length} stops; the brief is eight to ten`);
check(trip.stage === 'jupiter', `the trip starts on Jupiter's stage, not ${trip.stage}`);
check(/back to Earth/.test(trip.blurb), 'a trip that changes stage moves the camera on leave, and the blurb must say so');
for (const layer of ['worlds', 'deep-space', 'far-bodies']) {
  check((trip.requires || []).includes(layer), `the trip must require the ${layer} layer, or a stop stands on nothing`);
  check(LAYERS.some((l) => l.id === layer), `${layer} is a real layer`);
}
for (const stop of trip.stops) {
  const target = stop.target || {};
  check(target.record !== undefined, `${stop.id}: names its subject with ${Object.keys(target)}; every stop here is a \`record:\``);
  const record = byId.get(target.record);
  if (!record) {
    problems.push(`${stop.id}: '${target.record}' is not a record any bundled layer emits, so the stop would be dropped`);
    continue;
  }
  check((trip.requires || []).includes(record.layer) || stop.needs_layer === record.layer,
    `${stop.id}: ${record.id} is on the ${record.layer} layer, which this stop neither requires nor asks for`);
  const on = stop.stage || trip.stage;
  check(STAGES[on] && STAGES[on].unitKm > 0, `${stop.id}: \`stage: ${on}\` is not a stage the browser has`);
}
// The order is the distance from the Sun, which is also the order the story happened in.
{
  const t = Date.parse('2026-09-22T12:00:00Z');
  let last = 0;
  for (const stop of trip.stops) {
    const p = propagate(byId.get(stop.target.record), t);
    const au = p ? Math.hypot(p.x, p.y, p.z) / KM_PER_AU : 0;
    // A moon is its planet's distance to within a tenth of a percent (Titan is 0.09 % of Saturn's
    // 9.4 au from it), so the rule is "no nearer than the stop before", and every step between two
    // systems clears that by a factor.
    check(au > last * 0.99, `${stop.id} is ${au.toFixed(1)} au from the Sun, nearer than the stop before it (${last.toFixed(1)} au)`);
    last = Math.max(last, au);
  }
  notes.push(`ten stops from ${(() => { const p = propagate(byId.get(trip.stops[0].target.record), t); return (Math.hypot(p.x, p.y, p.z) / KM_PER_AU).toFixed(1); })()} au out to ${last.toFixed(0)} au`);
}

// ----------------------------------------------------------------------------- 2. the words
// The caps are read from the checker that holds them, so the two cannot drift apart.
const checker = readFileSync(join(ROOT, 'scripts/check_registry.py'), 'utf8');
const MAX_SENTENCE = Number((checker.match(/^MAX_SENTENCE\s*=\s*(\d+)/m) || [])[1]);
const MAX_TITLE = Number((checker.match(/^TOUR_MAX_TITLE\s*=\s*(\d+)/m) || [])[1]);
const timeBlock = (checker.match(/^TIME_RELATIVE\s*=\s*\(([\s\S]*?)\n\)/m) || [])[1] || '';
const TIME_RELATIVE = [...timeBlock.matchAll(/"([^"]+)"/g)].map((m) => m[1]);
check(MAX_SENTENCE > 0 && MAX_TITLE > 0 && TIME_RELATIVE.length > 3, 'could not read the caps from scripts/check_registry.py');
check(trip.title.length <= MAX_TITLE, `the trip title is ${trip.title.length} characters, over ${MAX_TITLE}`);
for (const stop of trip.stops) {
  const { title, body } = stop.card || {};
  check(Boolean(title) && title.length <= MAX_TITLE, `${stop.id}: card title ${JSON.stringify(title)} is over ${MAX_TITLE}`);
  const first = String(body || '').split('. ')[0];
  check(first.length <= MAX_SENTENCE, `${stop.id}: the first sentence is ${first.length} characters, over ${MAX_SENTENCE}`);
  for (const text of [title, body, trip.title, trip.blurb]) {
    check(!String(text).includes('--'), `${stop.id}: "--" reaches the screen as two hyphens: ${JSON.stringify(text)}`);
    const low = String(text).toLowerCase();
    for (const phrase of TIME_RELATIVE) {
      check(!low.includes(phrase), `${stop.id}: "${phrase}" is a claim about the day it was written: ${JSON.stringify(text)}`);
    }
  }
  check(stop.dwell_ms >= 8000 && stop.dwell_ms <= 20000, `${stop.id}: dwell ${stop.dwell_ms} ms is outside 8 to 20 s`);
}

// --------------------------------------------- 3. the numbers the cards state, against the data
const cardOf = (id) => (trip.stops.find((s) => s.id === id) || { card: {} }).card.body || '';
{
  const DATES = ['2026-09-22T12:00:00Z', '2026-12-22T12:00:00Z', '2027-03-22T12:00:00Z', '2027-09-22T12:00:00Z'].map(Date.parse);
  const auOf = (id, t) => {
    const p = propagate(byId.get(id), t);
    return p ? Math.hypot(p.x, p.y, p.z) / KM_PER_AU : NaN;
  };
  for (const t of DATES) {
    const day = new Date(t).toISOString().slice(0, 10);
    const eris = auOf('dwarf-eris', t);
    check(eris >= 94.5 && eris < 96.5 && /ninety five times as far from the Sun/.test(cardOf('eris')),
      `${day}: Eris is ${eris.toFixed(1)} au out and its card says ninety five`);
    const voyager = auOf('deep-voyager-1', t);
    check(voyager > 170 && /more than 170 times the Earth's distance/.test(cardOf('voyager-1')),
      `${day}: Voyager 1 is ${voyager.toFixed(1)} au out and its card says more than 170`);
  }
  // Eris near the far end of a 560-year lap: JPL's own elements, through the record.
  const eris = byId.get('dwarf-eris');
  const lapYears = eris.meta.periodDays / 365.25;
  check(Math.round(lapYears / 10) * 10 === 560 && /560-year lap/.test(cardOf('eris')),
    `Eris's lap is ${lapYears.toFixed(0)} years and the card says 560`);
  check(auOf('dwarf-eris', DATES[0]) / eris.meta.aphelionAu > 0.95, 'Eris is within 5 % of its aphelion, so "near the far end" holds');
  // Sedna: the perihelion distance and the year are the record's; the aphelion the card gives is
  // the BARYCENTRIC 937 au, for the same reason data/sample.js's own line quotes the barycentric
  // 11 400-year lap rather than the 12 700 that falls out of the heliocentric elements below.
  const sedna = byId.get('dwarf-sedna');
  check(Math.round(sedna.meta.qAu) === 76 && /seventy-six times the Earth's distance/.test(cardOf('sedna')),
    `Sedna's closest approach is ${sedna.meta.qAu.toFixed(1)} au and the card says seventy-six`);
  check(new Date(sedna.meta.perihelionMs).getUTCFullYear() === 2075 && /around 2076/.test(cardOf('sedna')),
    `JPL's perihelion date is ${new Date(sedna.meta.perihelionMs).toISOString().slice(0, 7)}; the card says around 2076 (Wikipedia's figure)`);
  check(sedna.meta.aphelionAu > 900 && /nine hundred and thirty-seven times/.test(cardOf('sedna')),
    `Sedna's aphelion from the heliocentric elements is ${sedna.meta.aphelionAu.toFixed(0)} au; the card gives the barycentric 937`);
  // Europa's card promises what two spacecraft will do; the records that draw them say the same.
  const clipper = byId.get('deep-europa-clipper');
  check(/April 2030/.test(clipper.meta.note) && /49 times/.test(clipper.meta.note)
    && /April 2030/.test(cardOf('europa')) && /49 times/.test(cardOf('europa')),
    `the Europa card and Europa Clipper's own line must agree: "${clipper.meta.note}"`);
  const juice = byId.get('deep-juice');
  check(/2031/.test(juice.meta.note) && /2031/.test(cardOf('europa')) && /Ganymede/.test(cardOf('europa')),
    `the Europa card and JUICE's own line must agree: "${juice.meta.note}"`);
}

// --------------------------------------------------- 4. the camera can see every one of them
// rAF as a queue drained by hand, the way test_contract.mjs drives the same machine.
const frames = [];
globalThis.requestAnimationFrame = (fn) => { frames.push(fn); return frames.length; };
const pump = (n = 6) => {
  for (let i = 0; i < n; i += 1) {
    for (const fn of frames.splice(0, frames.length)) {
      // paintCard reaches ui/cards.js, which wants a document; the pose is what is under test.
      try { fn(Date.now()); } catch { /* not under test */ }
    }
  }
};

const VIEW_H = 800;
const FOV = 45;
const START = Date.parse('2026-09-22T12:00:00Z');
let poses = 0;
for (let q = 0; q < 4; q += 1) {
  const tMs = START + q * 91 * 86400000;
  const day = new Date(tMs).toISOString().slice(0, 10);
  const camera = new THREE.PerspectiveCamera(FOV, 1280 / VIEW_H, 1e-5, 1e9);
  camera.position.set(0, 0, 22);
  const rig = createCameraRig(camera, null, { worldRadius: 6371 / 1000 });
  stage.setWorld('earth');
  stage.setTime(tMs);
  const worlds = createWorlds(new THREE.Scene(), { textureBase: null, camera });
  worlds.update(tMs);
  const ctx = {
    camera,
    cameraRig: rig,
    worlds,
    clock: { mode: 'live', rate: 1, paused: false, now: () => tMs, goTo() {}, setRate() {}, setPaused() {}, live() {} },
    layers: LAYERS,
    recordsFor: (id) => records.filter((r) => r.layer === id),
    recordById: (id) => byId.get(id) || null,
    isLayerOn: () => true,
    setLayerOn() {},
    selected: () => null,
    // main.js ctx.setStage, less the renderer: recentre, redraw the worlds (which is what puts the
    // floating origin on the new centre), re-teach the rig and frame the new world.
    setStage(id) {
      if (!STAGES[id] || stage.worldId === id) return false;
      stage.setWorld(id);
      worlds.update(tMs);
      const w = rowOf(id);
      const r = w ? w.radiusKm / stage.unitKm : 0;
      rig.setWorldRadius(r);
      rig.setWorldCentre({ x: 0, y: 0, z: 0 });
      rig.stopFollow();
      rig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: w ? worldFramingDistance(r, FOV, 1280 / VIEW_H) : 5, ms: 0 });
      return true;
    },
  };
  // As main.js: a select installs `follow` on the record, a deselect takes it off.
  let deselected = 0;
  ctx.select = (record) => {
    if (record) rig.follow(() => (record.klass === 'world' ? worlds.drawnPositionOf(record.id) : (() => { const p = propagate(record, tMs); return p ? stage.toScene(p, p.frame, tMs) : null; })()));
  };
  ctx.deselect = () => { deselected += 1; rig.stopFollow(); };

  const machine = createTrip(ctx);
  const plan = await machine.plan(TRIP_ID);
  check(plan && plan.count === trip.stops.length && plan.dropped.length === 0,
    `${day}: ${plan ? plan.count : 0} of ${trip.stops.length} stops resolved (${plan ? plan.dropped.map((d) => d.id) : ''})`);
  await machine.start(TRIP_ID);
  pump();
  check(stage.worldId === trip.stage, `${day}: the trip began on the ${stage.worldId} stage, not ${trip.stage}`);
  machine.play();
  pump(2);

  for (let i = 0; i < trip.stops.length; i += 1) {
    const stop = trip.stops[i];
    const where = `${day} ${stop.id}`;
    check(machine.state.index === i, `${where}: the trip is at stop ${machine.state.index}, not ${i}`);
    rig.finishFlight();          // as Next does: collapse the flight onto its end
    pump(3);
    rig.update(0.016);           // one frame of the rig, so the pose is the drawn one
    worlds.update(tMs);

    const wanted = stop.stage || trip.stage;
    check(stage.worldId === wanted, `${where}: the map is centred on ${stage.worldId}, not ${wanted}`);

    const record = byId.get(stop.target.record);
    const world = rowOf(record.id);
    let subject = null;
    let radiusUnits = 0;
    if (world) {
      // Drawn true, or the trip is flying to a place the screen does not draw.
      const view = worlds.viewScale(world.id);
      check(view && !view.exaggerated, `${where}: ${world.id} is drawn squeezed from the ${stage.worldId} stage`);
      subject = worlds.drawnPositionOf(world.id);
      radiusUnits = worlds.drawnRadiusUnits(world.id);
      check(Math.abs(radiusUnits * stage.unitKm - world.radiusKm) < 1e-6 * world.radiusKm,
        `${where}: ${world.id} is drawn ${(radiusUnits * stage.unitKm).toFixed(0)} km in radius, not its ${world.radiusKm}`);
      // The planet a moon goes round is in the same picture, and true as well.
      if (world.parent && world.parent !== 'sun') {
        const parent = worlds.viewScale(world.parent);
        check(parent && !parent.exaggerated, `${where}: ${world.parent} is drawn squeezed behind ${world.id}`);
      }
    } else {
      const p = propagate(record, tMs);
      subject = p ? stage.toScene(p, p.frame, tMs) : null;
      const layer = LAYERS.find((l) => l.id === record.layer);
      const km = subject ? camera.position.distanceTo(subject) * stage.unitKm : Infinity;
      check(km < (layer.nearKm || 0), `${where}: the camera is ${(km / 1000).toFixed(0)} thousand km out, past the ${record.layer} layer's ${layer.nearKm} km, so no model is drawn`);
    }
    if (!subject) { problems.push(`${where}: the subject has no position on this stage`); continue; }

    const toSubject = camera.position.distanceTo(subject);
    check(rig.state.target.distanceTo(subject) < Math.max(1e-6, toSubject * 1e-3),
      `${where}: the camera is aimed ${(rig.state.target.distanceTo(subject) * stage.unitKm).toFixed(0)} km off the subject`);
    if (radiusUnits > 0) {
      check(toSubject > radiusUnits * 1.02, `${where}: the camera is inside ${record.id} (${toSubject.toFixed(4)} units from its centre, radius ${radiusUnits.toFixed(4)})`);
      // Framed: at least one pixel of radius on an 800-pixel view, and not overflowing it.
      const halfHeights = (radiusUnits / toSubject) / Math.tan((FOV * Math.PI) / 360);
      const px = halfHeights * (VIEW_H / 2);
      check(px >= 1 && halfHeights <= 1, `${where}: ${record.id} is drawn ${px.toFixed(1)} px in radius (${(halfHeights * 100).toFixed(0)} % of half the view)`);
    }
    // `behind:`: the world the stop asked to keep in the picture is in it, disc and all. The
    // frame is 45 degrees tall, so half of it is 22.5 from the middle; a disc counts as in shot
    // when its own half-angle reaches that far in.
    if (stop.behind) {
      const at = worlds.drawnPositionOf(stop.behind);
      const view = new THREE.Vector3().subVectors(rig.state.target, camera.position).normalize();
      const toBackdrop = new THREE.Vector3().subVectors(at, camera.position);
      const range = toBackdrop.length();
      const off = (Math.acos(Math.max(-1, Math.min(1, view.dot(toBackdrop.normalize())))) * 180) / Math.PI;
      const half = (Math.asin(Math.min(1, worlds.drawnRadiusUnits(stop.behind) / range)) * 180) / Math.PI;
      check(off - half < FOV / 2, `${where}: ${stop.behind} is ${off.toFixed(0)} degrees off the middle of the frame with a ${half.toFixed(1)} degree disc, so the stop's \`behind:\` is out of shot`);
      const view2 = worlds.viewScale(stop.behind);
      check(view2 && !view2.exaggerated, `${where}: ${stop.behind} is drawn squeezed, so the direction the camera took to it is not where it is drawn`);
    }
    poses += 1;
    if (i < trip.stops.length - 1) { machine.next(); pump(2); }
  }
  // The end card may not promise the camera stays where it is: this trip moved the map's centre
  // five times, and leaving puts it back.
  check(machine.state.stageChanged === true, `${day}: the trip changed stage and does not say so, so the end card offers the wrong promise`);
  // Leaving puts the visitor's own stage back and lets the last stop go, or `follow` would carry
  // the camera 170 au after it.
  machine.stop('left');
  pump(2);
  check(stage.worldId === 'earth', `${day}: leaving left the map on ${stage.worldId}`);
  check(deselected > 0 && !rig.state.following, `${day}: leaving across a stage change must let the subject go`);
  machine.dispose();
  worlds.dispose();
}
check(poses === 4 * trip.stops.length, `${poses} poses measured, expected ${4 * trip.stops.length}`);

const { COPY } = await import(join(JS, 'copy/en.js'));
for (const [a, b] of [['endBody', 'endBodyStage'], ['leaveTitle', 'leaveTitleStage'], ['endExploreTitle', 'endExploreTitleStage']]) {
  check(typeof COPY.trip[b] === 'string' && COPY.trip[b] && COPY.trip[b] !== COPY.trip[a],
    `copy/en.js needs a ${b} that is not ${a}: on a trip that moved the map's centre the camera does not stay where it is`);
  check(!/stays where it is|stays exactly where it is|Keep this view/.test(COPY.trip[b] || ''),
    `COPY.trip.${b} still promises the camera stays: "${COPY.trip[b]}"`);
}

if (problems.length) {
  console.error('outer trip FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`outer trip ok: ${trip.stops.length} stops, each a bundled record, each centred where it is drawn true, at four dates (${notes.join('; ')})`);
