// tests/test_heliorung.mjs -- the distance ladder's heliosphere rung (forge #148, ui/heliorung.js).
//
// Asserted, with no browser:
//   THE PLACE. 300 AU out is outside both fitted surfaces in the rung's direction (the termination shock and
//     the heliopause, which the camera would otherwise be inside) and inside the illustrative bow wave; and the
//     direction is square to IBEX's nose, raised 30 degrees north, with the nose on the LEFT of a camera that
//     keeps the ecliptic's north up.
//   THE FLIGHT. goHeliosphere() lets the selection go, turns the Deep space layer on, asks for the bubble's
//     module, climbs to 300 AU on the Sun's stage, and on arrival turns round the Sun to that side, at the same
//     distance; it does nothing without a climb, and the turn is not made when the climb was cut short.
//   THE WIRING. The ladder names the place, the pad's ladder step and the Stars tab's row fetch this module on
//     the press, and nothing in the boot graph imports it.
//
//   node tests/test_heliorung.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const H = await import(join(JS, 'scene/heliosphere.js'));
const R = await import(join(JS, 'ui/heliorung.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { LADDER_RUNGS } = await import(join(JS, 'data/ladder.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));

// --- the place --------------------------------------------------------------------------------------------
const nose = H.eclDir(H.HELIO.nose.lonDeg, H.HELIO.nose.latDeg);
const d = R.rungDirEcl();
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
check(Math.abs(Math.hypot(...d) - 1) < 1e-12, 'the direction is a unit vector');
check(Math.abs(dot(d, nose)) < 1e-12, `the camera stands square to the nose (cos ${dot(d, nose)})`);
const northPerp = (() => { const v = [-nose[2] * nose[0], -nose[2] * nose[1], 1 - nose[2] * nose[2]]; const m = Math.hypot(...v); return v.map((x) => x / m); })();
check(Math.abs(Math.asin(dot(d, northPerp)) * 180 / Math.PI - R.HELIO_RUNG.upDeg) < 1e-9, 'raised upDeg towards the ecliptic north');
// Looking at the Sun from d with north up: right = forward x up. The nose is on the left.
const right = (() => { const v = cross(d.map((x) => -x), [0, 0, 1]); const m = Math.hypot(...v); return v.map((x) => x / m); })();
check(dot(right, nose) < -0.9, `the nose is on the left of the picture (${dot(right, nose).toFixed(3)})`);
const au = R.HELIO_RUNG.au;
const ts = H.surfaceAu('ts', d); const hp = H.surfaceAu('hp', d); const bow = H.surfaceAu('bow', d);
check(ts < hp && hp < au, `300 AU is outside the termination shock (${ts.toFixed(0)}) and the heliopause (${hp.toFixed(0)}) on this side`);
check(bow > au, `and inside the illustrative bow wave (${bow.toFixed(0)} AU), which is the shell round the picture`);
check(au > H.FADE_AU[1], 'and past the distance at which the bubble is drawn whole');
const ds = R.rungDirScene();
const back = H.toScene(d);
check(ds.x === back[0] && ds.y === back[1] && ds.z === back[2], 'the scene direction is the ecliptic one through toScene');

check(R.rungAu(1440 / 900) === au && R.rungAu(2) === au && R.rungAu(undefined) === au, 'a landscape screen stands 300 AU out');
check(Math.abs(R.rungAu(390 / 844) - 844) < 1 && R.rungAu(0.2) === R.HELIO_RUNG.maxAu, `a phone upright stands back by its narrowness (${R.rungAu(390 / 844).toFixed(0)} AU), to at most ${R.HELIO_RUNG.maxAu}`);
check(H.surfaceAu('hp', nose) < R.rungAu(390 / 844) * Math.tan((22.5 * Math.PI) / 180) * (390 / 844), 'and from there the heliopause\'s nose is inside the width of the screen');

// --- the flight ---------------------------------------------------------------------------------------------
function fakeCtx({ climbOk = true, layerOn = false } = {}) {
  const log = { deselected: 0, layers: [], wanted: 0, climbs: [], flights: [] };
  const ctx = {
    selected: () => ({ id: 'iss' }),
    deselect: () => { log.deselected += 1; },
    isLayerOn: (id) => (id === 'deep-space' ? layerOn : true),
    setLayerOn: (id, on) => log.layers.push([id, on]),
    wantHeliosphere: () => { log.wanted += 1; },
    clock: { now: () => Date.parse('2026-11-07T12:00:00Z') },
    cameraRig: { flyTo: (o) => log.flights.push(o) },
    wantClimb: async () => (climbOk ? { to: (o) => { log.climbs.push(o); return true; } } : null),
  };
  return { ctx, log };
}
stage.setWorld('sun');
{
  const { ctx, log } = fakeCtx();
  const ok = await R.goHeliosphere(ctx);
  check(ok === true, 'the flight starts');
  check(log.deselected === 1, 'the selection is let go, or the rig would follow it back');
  check(log.layers.length === 1 && log.layers[0][0] === 'deep-space' && log.layers[0][1] === true, 'the Deep space layer is turned on: the bubble is drawn with it');
  check(log.wanted === 1, 'the bubble\'s module is asked for before the flight');
  const c = log.climbs[0];
  check(c && c.stage === 'sun' && Math.abs(c.distanceKm - au * H.KM_PER_AU) < 1, `one climb, to 300 AU on the Sun's stage (${c && c.distanceKm})`);
  const p = c && c.toPos();
  check(p && Math.hypot(p.x, p.y, p.z) < 1e-6, 'towards the Sun');
  c.onArrive('done');
  const f = log.flights[0];
  check(f && Math.abs(f.distance * stage.unitKm - au * H.KM_PER_AU) < 1 && f.offset && f.offset.y === ds.y && f.ms === R.HELIO_RUNG.turnMs,
    'on arrival one turn round the Sun to the rung\'s side, at the same distance');
  log.flights.length = 0;
  c.onArrive('cancelled');
  check(log.flights.length === 0, 'a climb the visitor cut short is not followed by the turn');
}
{
  const { ctx, log } = fakeCtx({ climbOk: false, layerOn: true });
  check(await R.goHeliosphere(ctx) === false && log.layers.length === 0, 'no climb module, no flight; a layer already on is left alone');
  check(await R.goHeliosphere(null) === false, 'no context, nothing');
}

// --- the wiring ---------------------------------------------------------------------------------------------
const rung = LADDER_RUNGS.find((r) => r.target && r.target.place === 'heliosphere');
check(!!rung && LADDER_RUNGS.indexOf(rung) === LADDER_RUNGS.findIndex((r) => r.id === 'neptune') + 1, 'the rung is the one after Neptune');
const read = (rel) => readFileSync(join(JS, rel), 'utf8');
check(/tg\.place === 'heliosphere'\) import\('\.\/heliorung\.js'\)/.test(read('ui/gamepad.js')), 'the pad\'s ladder step fetches the flight on the press');
check(/import\('\.\/heliorung\.js'\)/.test(read('ui/explore.js')) && !/^import .*heliorung/m.test(read('ui/explore.js')), 'the Stars tab\'s row fetches it on the press, never at boot');
check(!/^import .*heliorung/m.test(read('main.js')), 'main.js does not import it');

// --- the trip stop: `narrow_fit` stands it back on an upright phone as the rung does ----------------------------
{
  const { narrowFitScale } = await import(join(JS, 'ui/trip.js'));
  check(narrowFitScale(1.3, 1.6) === 1 && narrowFitScale(1.3, 1.3) === 1, 'a landscape screen keeps the stop\'s distance');
  check(Math.abs(narrowFitScale(1.3, 390 / 844) * 300 - R.rungAu(390 / 844)) < 1e-6, 'an upright phone stands the stop back exactly as far as the rung');
  check(narrowFitScale(1.3, 0.1) === 4 && narrowFitScale(1.3, NaN) === 1, 'never more than four times; no aspect, no change');
  const stop = TOURS.find((x) => x.id === 'outer-solar-system').stops.find((x) => x.id === 'heliosphere');
  check(stop && stop.narrow_fit === R.HELIO_RUNG.aspectFull, 'the heliosphere stop carries the rung\'s aspect');
}

if (problems.length) { console.error('heliosphere rung FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`heliosphere rung ok: 300 AU out, square to the nose and ${R.HELIO_RUNG.upDeg} degrees up, outside the heliopause (${hp.toFixed(0)} AU) and inside the bow wave (${bow.toFixed(0)} AU); one climb and one turn; fetched on the press`);
