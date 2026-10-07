// tests/test_sky_round3.mjs -- the sky from the ground, round three: the deep sky in Tonight's best
// (internal #358), the night's three moments and the time strip (check 15), one apparent place for
// a satellite's name and pick (internal #418), and no label twice (internal #372).
//   TZ=UTC node tests/test_sky_round3.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

process.env.TZ = 'UTC';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const T = await import(join(JS, 'sky/tonightbest.js'));
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const { distinctNames } = await import(join(JS, 'ui/labels.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createSkyView, SKY_OPTION_DEFAULTS } = await import(join(JS, 'sky/skyview.js'));
const { refractionDeg } = await import(join(JS, 'sky/skymath.js'));
const { NEBULAE } = await import(join(JS, 'data/nebulae.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const here = { latDeg: 40, lonDeg: 0 };
const obs = new A.Observer(40, 0, 0);
const sunAlt = (ms) => { const d = new Date(ms); const eq = A.Equator('Sun', d, obs, true, true); return A.Horizon(d, obs, eq.ra, eq.dec, null).altitude; };

// --- the night's three moments -----------------------------------------------------------------------
const afternoon = Date.parse('2026-10-20T15:00:00Z');
const m = T.nightMoments(here, afternoon);
check(m && Math.abs(sunAlt(m.duskMs) + 6) < 0.05 && Math.abs(sunAlt(m.dawnMs) + 6) < 0.05 && m.duskMs > afternoon, 'from the afternoon: dusk is this evening\'s end of civil twilight, dawn the morning\'s start');
check(m && m.midnightMs === (m.duskMs + m.dawnMs) / 2 && sunAlt(m.midnightMs) < -30, 'midnight is the middle of the night');
const small = Date.parse('2026-10-21T02:00:00Z');
const m2 = T.nightMoments(here, small);
check(m2 && Math.abs(m2.duskMs - m.duskMs) < 60e3 && Math.abs(m2.dawnMs - m.dawnMs) < 60e3 && m2.duskMs < small, 'in the small hours "tonight" is the night under way: the same dusk, behind us');
check(T.nightMoments({ latDeg: 78, lonDeg: 15 }, Date.parse('2026-06-21T12:00:00Z')) === null, 'no night, no moments');

// --- the deep sky tonight ----------------------------------------------------------------------------
const win = T.nightWindow(here, afternoon);
const objects = [
  { id: 'm31', name: 'Andromeda Galaxy', raDeg: 10.68, decDeg: 41.27, mag: 3.4, sizeDeg: 3, kind: 'galaxy' },
  { id: 'm42', name: 'Orion Nebula', raDeg: 83.82, decDeg: -5.39, mag: 4.0, sizeDeg: 1, kind: 'nebula' },
  { id: 'm45', name: 'Pleiades', raDeg: 56.75, decDeg: 24.12, mag: 1.6, sizeDeg: 1.8, kind: 'cluster' },
  { id: 'm1', name: 'Crab Nebula', raDeg: 83.63, decDeg: 22.01, mag: 8.4, sizeDeg: 0.1, kind: 'nebula' },
  { id: 'm8', name: 'Lagoon Nebula', raDeg: 270.9, decDeg: -24.38, mag: 6.0, sizeDeg: 1.5, kind: 'nebula' },
  { id: 'lmc', name: 'Large Magellanic Cloud', raDeg: 80.9, decDeg: -69.75, mag: 0.9, sizeDeg: 10, kind: 'galaxy' },
  { id: 'faint', name: 'Faint thing', raDeg: 10, decDeg: 60, mag: 11.5, sizeDeg: 0.1, kind: 'galaxy' },
];
const dark = T.deepSkyTonight({ observer: here, win, objects, darkness: 'dark' });
check(dark.length === T.MAX_DSO && dark[0].id === 'm45' && dark.map((r) => r.id).includes('m31'), `in a dark place in October: the Pleiades first, Andromeda among them (${dark.map((r) => r.id)})`);
check(dark.every((r) => r.kind === 'dso' && r.altDeg >= T.DSO_MIN_ALT_DEG && r.bestMs >= win.startMs && r.bestMs <= win.endMs), 'each is at least 25 degrees up at its best, in the dark hours');
check(!dark.some((r) => r.id === 'lmc' || r.id === 'm8' || r.id === 'faint'), 'never one that does not rise here, has set by dark, or needs a telescope');
const m31 = dark.find((r) => r.id === 'm31');
check(m31 && m31.altDeg > 85 && m31.needs === 'eye', `Andromeda passes overhead at 40 north, an eye's object in a dark place (${m31 && m31.altDeg.toFixed(0)} degrees)`);
const city = T.deepSkyTonight({ observer: here, win, objects, darkness: 'city' });
check(city.length >= 1 && city[0].id === 'm45' && city.find((r) => r.id === 'm31') && city.find((r) => r.id === 'm31').needs === 'binoculars' && !city.some((r) => r.id === 'm1'), `from a city: the Pleiades by eye, Andromeda with binoculars, no Crab (${city.map((r) => `${r.id}:${r.needs}`)})`);
const fullMoon = T.deepSkyTonight({ observer: here, win, objects, darkness: 'town', moon: { upTonight: true, percent: 100 } });
const noMoon = T.deepSkyTonight({ observer: here, win, objects, darkness: 'town', moon: null });
check(fullMoon.filter((r) => r.needs === 'eye').length <= noMoon.filter((r) => r.needs === 'eye').length, 'a full Moon never makes the deep sky easier');
check(T.deepSkyTonight({ observer: here, win: null, objects }).length === 0 && T.deepSkyTonight({}).length === 0, 'no night or no place: no rows');
// In the list: places are kept for two of them, and the list is still at most seven.
const passes = [1, 2, 3, 4].map((i) => ({ recordId: `p${i}`, record: { id: `p${i}`, name: `SAT ${i}` }, visible: true, startMs: win.startMs + i * 600e3, peakMs: win.startMs + i * 600e3 + 120e3, endMs: win.startMs + i * 600e3 + 240e3, startAz: 0, peakAz: 1, endAz: 2, peakEl: 1, magnitude: -2 }));
const best = T.tonightBest({ observer: here, nowMs: afternoon, passes, deepSky: objects, darkness: 'dark' });
const kinds = best.rows.map((r) => r.kind);
check(best.rows.length <= T.MAX_ROWS && kinds.filter((k) => k === 'dso').length >= 2 && kinds.filter((k) => k === 'dso').length <= 3, `Tonight's best names two or three deep-sky objects in its seven rows (${kinds})`);
check(kinds.filter((k) => k === 'pass').length <= T.MAX_PASSES && best.rows.every((r, i) => i === 0 || best.rows[i - 1].score >= r.score), 'still at most three passes, and in one order');
const none = T.tonightBest({ observer: here, nowMs: afternoon, passes });
check(none.rows.every((r) => r.kind !== 'dso'), 'with no objects handed in the list is what it was');
const w = T.bestWords(dark[0]);
check(w && w.title === 'Pleiades' && /^best \d\d:\d\d · \d+° up, [NESW]+ · by eye$/.test(w.line) && /^mag /.test(w.side), `a deep-sky row is one mono line (${w && w.line})`);
// --- my view faces west (internal #300) -------------------------------------------------------------------
check(T.inView({ kind: 'planet', azDeg: 250, altDeg: 30 }, 'w', 0) && !T.inView({ kind: 'planet', azDeg: 250, altDeg: 30 }, 'e', 0), 'west-south-west is in a west view and not in an east one');
check(T.inView({ kind: 'planet', azDeg: 350, altDeg: 30 }, 'n', 0) && T.inView({ kind: 'planet', azDeg: 20, altDeg: 30 }, 'n', 0), 'north wraps through zero');
check(!T.inView({ kind: 'planet', azDeg: 180, altDeg: 12 }, 's', 15) && T.inView({ kind: 'planet', azDeg: 180, altDeg: 12 }, 's', 0), 'a minimum height is a roofline');
check(T.inView({ kind: 'dso', azDeg: 10, altDeg: 88 }, 's', 30), 'straight overhead is in every view that reaches it');
check(T.inView({ kind: 'pass', pass: passes[0] }, 'any', 30) && T.rowWhere({ kind: 'pass', pass: passes[0] }).altDeg === 57, 'a pass is judged where it is highest');
const south = T.tonightBest({ observer: here, nowMs: afternoon, passes: [], deepSky: objects, darkness: 'dark', facing: 's', minAltDeg: 15 });
const north = T.tonightBest({ observer: here, nowMs: afternoon, passes: [], deepSky: objects, darkness: 'dark', facing: 'n', minAltDeg: 15 });
check(south.rows.length > 0 && south.rows.every((r) => T.inView(r, 's', 15)) && south.rows.some((r) => r.id === 'saturn'), `facing south: Saturn and what else is best there (${south.rows.map((r) => r.id)})`);
check(north.rows.every((r) => T.inView(r, 'n', 15)) && !north.rows.some((r) => r.id === 'saturn'), `facing north: no Saturn (${north.rows.map((r) => r.id)})`);
{
  const { readView, VIEW_KEY } = await import(join(JS, 'ui/tonight.js'));
  const store = (v) => ({ getItem: (k) => (k === VIEW_KEY ? v : null) });
  check(readView(store('{"facing":"w","minAltDeg":15}')).facing === 'w' && readView(store('{"facing":"w","minAltDeg":15}')).minAltDeg === 15, 'the view is kept between visits');
  check(readView(store('{"facing":"up","minAltDeg":7}')).facing === 'any' && readView(store('nonsense')).minAltDeg === 0 && readView(null).facing === 'any', 'and anything unknown is the whole sky');
}
// Every photograph has a place and a size the Tonight view can frame.
check(NEBULAE.length >= 20 && NEBULAE.every((n) => Number.isFinite(n.ra_deg) && Number.isFinite(n.dec_deg) && n.width_arcmin > 0 && n.height_arcmin > 0), 'every photograph has a place and a size');

// --- one apparent place (internal #418) -----------------------------------------------------------------
{
  const camera = new THREE.PerspectiveCamera(50, 1.6, 0.001, 1e9);
  const scene = new THREE.Scene();
  const sky = createSkyView({ camera, scene, stage });
  sky.enter({ latDeg: 51.5, lonDeg: -0.13, altKm: 0 });
  sky.update(Date.parse('2026-01-10T02:00:00Z'));
  const p = new THREE.Vector3(1, 2, 3);
  check(sky.apparent(p.clone()).equals(p) && sky.trueNdc(0.2, -0.1).join() === '0.2,-0.1', 'before the ground sky is up nothing is lifted: the scene\'s own places stand');
  sky.exit();
}
const view = read('site/js/sky/skyview.js');
check(/function airShift\(p, sign\)/.test(view) && /refractionDeg\(alt \* RAD2DEG\)/.test(view) && /apparent: \(p\) => \(isActive && ground \? airShift\(p, 1\) : p\)/.test(view), 'sky/skyview.js lifts a scene position by the stars\' own refraction');
check(/ctx\.skyView\.apparent\(pos\)/.test(read('site/js/ui/labels.js')), 'a satellite\'s name is placed where the air puts its dot');
check(/ctx\.skyView\.trueNdc\(ndcX, ndcY\)/.test(read('site/js/main.js')) && /pick\(pickX, pickY, rect\)/.test(read('site/js/main.js')), 'and the pick looks where the thing is before the air');
check(refractionDeg(0) > 0.45, 'which on the horizon is nearly half a degree');

// --- no label twice (internal #372) -------------------------------------------------------------------------
const goes = (n) => ({ id: `4${n}`, name: `GOES ${n}`, meta: { displayName: 'GOES weather satellite' } });
check(distinctNames([goes(16), goes(18)]).join('|') === 'GOES 16|GOES 18', `two satellites named alike are told apart by the catalogue's name (${distinctNames([goes(16), goes(18)])})`);
check(distinctNames([{ id: 'a', name: 'TWIN' }, { id: 'b', name: 'TWIN' }, { id: 'c', name: 'OTHER' }]).join('|') === 'TWIN||OTHER', 'two with nothing to tell them apart: the second is not labelled');
check(distinctNames([{ id: 'a', name: 'ISS (ZARYA)' }, { id: 'c', name: 'TIANHE' }]).every((n) => typeof n === 'string' && n.length > 0), 'names that differ are left alone');
check(distinctNames([]).length === 0, 'no records, no names');
check(/distinctNames\(chosen\.map/.test(read('site/js/ui/labels.js')), 'the labels use it');

// --- the controls -------------------------------------------------------------------------------------------
const ui = read('site/js/ui/tonight.js');
const K = COPY.tonight.skybar;
check(SKY_OPTION_DEFAULTS.trails === false && /'trails'\]/.test(ui) && K.toggles.trails && K.toggleTitles.trails, 'star trails are a choice, and off until made');
check(/nightMoments\(ctx\.observer, ctx\.clock\.now\(\)\)/.test(ui) && K.timeDusk && K.timeMidnight && K.timeDawn && K.timeNow, 'Dusk, Midnight and Dawn go to tonight\'s own');
check(/role', 'slider'/.test(ui) && /STRIP_MIN_PER_PX \* 60e3/.test(ui) && /ArrowRight/.test(ui) && /ctx\.clock\.goTo\(ms\)/.test(ui), 'the strip is a slider: a drag or an arrow key moves the one clock');
check(/ctx\.clock\.live\(\)/.test(ui), 'and Now goes back to the present');
check(/EYEPIECES = \{ low: 1, medium: 0\.5, high: 0\.2 \}/.test(ui) && Object.keys(K.eyepieces).join() === 'low,medium,high', 'three eyepieces');
check(/s\.tapSky\(r\.left \+ r\.width \/ 2, r\.top \+ r\.height \/ 2\)/.test(ui) && /tag\.focus\(\)/.test(ui) && K.centre, 'the tag can be asked for from the keyboard, and takes the focus');
check(/deepSky: deepObjects\(\)/.test(ui) && /r\.kind === 'dso' \? \(\) => showDeep\(r\)/.test(ui), 'the Tonight view hands the photographs to the list and frames one on a press');
check(K.landscape.city && K.landscape.hills && /\{dir\}/.test(K.landscape.coast) && /drawn/.test(K.landscape.hills), 'the land says which of three it is, and that it is drawn');
check(/modelled/.test(K.honesty) && /drawn/.test(K.honesty), 'the honesty line: the air is a model, the skyline a drawing');
const groundJs = read('site/js/sky/groundsky.js');
check(/kind: 'sky', id: con/.test(groundJs) && K.con.inside.includes('{name}') && /what\.words/.test(view), 'a tap on empty sky names its constellation, and a thing\'s tag says which one it is in');
check(/env\.pointAt\(\{ raDeg: f\.raDeg, decDeg: f\.decDeg \}/.test(groundJs) && /frameOf\(id\)/.test(read('site/js/sky/groundpictures.js')), 'a tap on a picture frames it');

if (problems.length) { console.error('sky round three FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`sky round three ok: dusk, midnight and dawn of tonight; ${dark.map((r) => r.name).join(', ')} offered in a dark place and ${city.length} of them from a city; one apparent place; no label twice`);
