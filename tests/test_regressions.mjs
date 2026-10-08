// tests/test_regressions.mjs -- four regressions the daily rounds asked to have pinned down, each
// at node level, each seen failing with its fix taken out (round three, package 8):
//
//   1. BACK AND FORWARD OVER SHARED VIEWS (public #331). A link that arrives in a running tab is
//      the whole view: the selection, the stage, the clock, the trip and its stop. Before this,
//      only the selection was applied.
//   2. A TRACKED OBJECT WHOSE POSITION GOES INVALID (public #348): the ground track is taken down,
//      a ride along ends at a finite camera pose and gives the follow back, the HUD hides; and all
//      of it comes back when the position does.
//   3. OLD COMET LINKS (public #367): an `#at=comet-…` made while the comets came from the Minor
//      Planet Center opens the same comet now that they come from JPL's Small-Body Database.
//   4. THE LAUNCH CARD'S MISSION NAME (public #378): never lost, never cut inside a word.
//
// The fifth named regression, the release zip (public #471), is tests/test_release_zip.py.
//
//   node tests/test_regressions.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const load = (rel) => import(pathToFileURL(join(JS, rel)).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

// =================================================================================================
// 1. Back and Forward over shared views
// =================================================================================================
{
  globalThis.location = { hash: '' };
  globalThis.history = { replaceState() {} };
  const { read, linkChange, stopIndex } = await load('ui/urlstate.js');
  const { TOURS } = await load('data/tours.js');
  check(typeof linkChange === 'function', 'ui/urlstate.js exports linkChange');
  // A model of the app, small enough to read: it carries out a plan exactly as main.js does.
  const app = { at: null, stage: 'earth', clock: { live: true, ms: null, rate: 1 }, trip: null, stop: -1, calls: [] };
  const arrive = (hash) => {
    location.hash = hash;
    const link = read();
    const plan = typeof linkChange === 'function' ? linkChange(link, { at: app.at, trip: app.trip, live: app.clock.live }) : null;
    if (!plan) return null;
    if (plan.clock && plan.clock.live) app.clock = { live: true, ms: null, rate: 1 };
    else if (plan.clock) app.clock = { live: false, ms: plan.clock.goTo, rate: plan.clock.rate };
    if (plan.stage) app.stage = plan.stage;
    if (plan.trip && plan.trip.start) { app.trip = plan.trip.start; app.stop = Math.max(0, stopIndex(TOURS.find((t) => t.id === app.trip), plan.trip.stop)); app.at = null; return plan; }
    if (plan.trip && plan.trip.jump) { app.stop = stopIndex(TOURS.find((t) => t.id === app.trip), plan.trip.jump); return plan; }
    if (plan.trip) { app.trip = null; app.stop = -1; }
    if (plan.at && plan.at.open) app.at = plan.at.open;
    else if (plan.at) app.at = null;
    return plan;
  };
  const view = () => `${app.at || '-'} | ${app.stage} | ${app.clock.live ? 'live' : new Date(app.clock.ms).toISOString() + ' x' + app.clock.rate} | ${app.trip ? app.trip + ' #' + (app.stop + 1) : '-'}`;
  // Two shared views, as the app writes them: the ISS, live; the Moon on its own stage at a dated
  // instant running fast. Then a trip at its third stop.
  const A = '#at=sat-25544';
  const B = '#at=moon&t=2027-08-02T10%3A00%3A00Z&rate=60&stage=moon';
  const C = '#trip=moon-landings&stop=3';
  const wantA = 'sat-25544 | earth | live | -';
  const wantB = 'moon | moon | 2027-08-02T10:00:00.000Z x60 | -';
  const wantC = '- | moon | 2027-08-02T10:00:00.000Z x60 | moon-landings #3';
  arrive(A);
  check(view() === wantA, `the first link: ${view()}`);
  arrive(B);
  check(view() === wantB, `a second link pasted over it changes the selection, the stage, the clock and its rate: ${view()}`);
  arrive(A); // Back
  // The stage is not in A: the app writes `stage` only off the default, and openAt flies to the
  // ISS's own stage. What A does carry is the clock, by NOT carrying it: `t` absent means now.
  check(app.at === 'sat-25544' && app.clock.live === true && app.clock.rate === 1, `Back to the first: the ISS again, and the clock is NOW again, at 1x (it used to stay in 2027): ${view()}`);
  arrive(B); // Forward
  check(view() === wantB, `Forward: the Moon, its stage, its instant and its rate again: ${view()}`);
  arrive(C);
  check(view() === wantC, `a link into a trip's third stop starts that trip there, and a trip owns its clock and its selection: ${view()}`);
  const jump = arrive('#trip=moon-landings&stop=5');
  check(jump && jump.trip && jump.trip.jump === '5' && app.stop === 4 && !jump.at && !jump.clock, `another stop of the SAME trip is a jump, not a restart: ${JSON.stringify(jump)}`);
  arrive(C); // Back
  check(app.stop === 2, `Back inside the trip returns to stop 3 (${app.stop + 1})`);
  const out = arrive(A); // Back, out of the trip
  check(out && out.trip && out.trip.stop === true && app.trip === null && app.at === 'sat-25544', `Back out of the trip stops it and selects what the link names: ${view()}`);
  const none = arrive('#stage=moon');
  check(none && none.at && none.at.none === true && app.at === null && app.stage === 'moon', `a view with nothing selected puts the selection down: ${view()}`);
  // What is NOT a view is left alone: an anchor, a moment alone, a format from the future.
  const before = view();
  for (const hash of ['#sources', '', '#m=wonder', '#now', '#v=9&at=moon', '#exp=deep']) {
    check(arrive(hash) === null && view() === before, `"${hash}" names no view and touches nothing`);
  }
  check(linkChange({ at: 'moon' }, { at: 'moon', trip: null, live: true }).at === null, 'the selection already up is not opened again');
  check(linkChange({ t: 'not a date', at: 'moon' }, { at: null, trip: null, live: false }).clock.live === true, 'an instant that does not parse is no instant: the clock goes back to now');
  // Seen in a real tab, 2026-10-08 (internal #460): the empty address.
  check(linkChange({ at: 'phobos' }, { at: 'deimos', trip: null, live: true, stage: 'mars' }).stage === null, 'a link that names an object and no stage leaves the map where it is: the app never writes `stage=`');
  check(linkChange({ at: 'moon', stage: 'moon' }, { at: null, trip: null, live: true, stage: 'mars' }).stage === 'moon', 'a link that names its stage keeps it');
  check(linkChange({ trip: 'moon-landings' }, { at: null, trip: null, live: true, stage: 'moon' }).stage === null, 'a trip sets its own stage');
  {
    const home = linkChange({}, { at: 'sat-25544', trip: null, live: false, stage: 'moon' });
    check(home && home.at.none === true && home.stage === 'earth' && home.clock.live === true && home.trip === null, 'Back to an address with no keys is the default view: nothing selected, the Earth, now');
    check(linkChange({}, { at: null, trip: null, live: true, stage: 'earth' }) === null, 'which is nothing to do when it is what is showing');
    check(linkChange({ m: 'now' }, { at: 'moon', trip: null, live: true, stage: 'earth' }) === null, 'a moment alone still names no view');
  }
  // main.js carries the plan out, in this order, on hashchange.
  const main = code(readFileSync(join(JS, 'main.js'), 'utf8'));
  const h = (/window\.addEventListener\('hashchange', \(\) => \{\s*setMoment\(([\s\S]*?)\n  \}\);/.exec(main) || [])[1] || '';
  check(/const plan = linkChange\(keys, \{ at: current \? current\.id : null, trip: running \? running\.tourId : null, live: clock\.mode === 'live', stage: stage\.worldId \}\);/.test(h), 'main.js asks linkChange on hashchange, with what is selected, the trip running and whether the clock is live');
  const order = ['clock.live()', 'clock.goTo(plan.clock.goTo)', 'ctx.setStage(plan.stage)', 'openTrip(ctx, keys)', 'ctx.trip.jumpTo(index)', 'ctx.trip.stop()', 'openEvent(ctx, plan.event)', 'openAt(ctx, plan.at.open)', 'ctx.deselect()'];
  const at = order.map((s) => h.indexOf(s));
  check(at.every((i) => i >= 0) && at.every((i, k) => k === 0 || i > at[k - 1]), `and carries out the clock, the stage, the trip, the event and the selection, in that order (${at})`);
}

// =================================================================================================
// 2. A tracked object whose position goes invalid, and comes back
// =================================================================================================
{
  const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
  const { parseCelestrakGP } = await load('data/parsers.js');
  const { sgp4, sgp4State, MAX_AGE_MS } = await load('propagate/sgp4.js');
  const { subPoint, trackPoints, wantsTrack, createGroundTrack } = await load('scene/groundtrack.js');
  const { stage } = await load('scene/stage.js');
  const { createCameraRig } = await load('scene/camera.js');
  const gp = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/celestrak_gp.json'), 'utf8'));
  const [iss] = parseCelestrakGP(gp, { layer: 'stations', source: 'celestrak-stations' });
  // Elements older than thirty days place nothing (propagate/sgp4.js MAX_AGE_MS): one clock, three
  // instants -- valid, invalid, valid again -- with nothing mocked.
  const GOOD = iss.epoch + 3 * 3600e3;
  const BAD = iss.epoch + MAX_AGE_MS + 3600e3;
  const AGAIN = iss.epoch + 5 * 3600e3;
  check(!!sgp4(iss, GOOD) && sgp4(iss, BAD) === null && sgp4State(iss, BAD) === null && !!sgp4(iss, AGAIN), 'the fixture: the ISS is placed, then not (elements over 30 days old), then placed again');

  // --- the ground track ---
  check(subPoint(iss, GOOD) !== null && subPoint(iss, BAD) === null, 'no sub-satellite point for a position that is not there');
  check(wantsTrack(iss, GOOD) === true && wantsTrack(iss, BAD) === false && wantsTrack(iss, AGAIN) === true, 'a track is wanted, then not, then again');
  const edge = trackPoints(iss, iss.epoch + MAX_AGE_MS - 30 * 60e3);
  check(edge.length > 0 && edge.length < 271 && edge.every((p) => Number.isFinite(p.latDeg) && Number.isFinite(p.lonDeg)), `a track across the edge of validity keeps only the points that exist (${edge.length} of 271), none of them NaN`);
  const rigState = { following: true, riding: false };
  const scene = new THREE.Scene();
  stage.setTime(GOOD);
  const track = createGroundTrack(scene, { cameraRig: { state: rigState }, worlds: null });
  track.set(iss);
  track.update(GOOD);
  check(track.group.visible === true, 'followed and valid: the track is drawn');
  track.update(BAD);
  check(track.group.visible === false, 'the position goes invalid: the track is taken down, not left where it last was');
  check(track.labelPoints().length === 0, 'and its ticks with it');
  track.update(AGAIN);
  check(track.group.visible === true && track.labelPoints().every((l) => Number.isFinite(l.pos.x)), 'valid again: drawn again, every tick finite');

  // --- the ride along, and the follow under it ---
  const cam = new THREE.PerspectiveCamera(45, 1.5, 1e-5, 1e9);
  cam.position.set(0, 0, 30);
  const rig = createCameraRig(cam, null);
  rig.setWorldCentre({ x: 0, y: 0, z: 0 });
  rig.setWorldRadius(6.371);
  let now = GOOD;
  const U = 1000; // km per scene unit on the Earth stage
  const getPos = () => { const s = sgp4State(iss, now); return s ? new THREE.Vector3(s.x / U, s.z / U, -s.y / U) : null; };
  const getVel = () => { const s = sgp4State(iss, now); return s ? new THREE.Vector3(s.vx / U, s.vz / U, -s.vy / U) : null; };
  const finite = (v) => [v.x, v.y, v.z].every(Number.isFinite);
  rig.follow(getPos);
  check(rig.rideAlong(getPos, getVel, { back: 0.06, up: 0.02, lookAhead: 0.4, ms: 0 }) === true, 'the ride starts on a valid position');
  rig.update(0.016);
  const pose = cam.position.clone();
  check(rig.state.riding === true && finite(pose) && pose.distanceTo(getPos()) < 0.2, 'riding: the camera is beside the station');
  now = BAD;
  for (let i = 0; i < 5; i += 1) rig.update(0.016);
  check(rig.state.riding === false && rig.state.lastRideEnd === 'lost', `the position goes invalid: the ride ends, and says it lost the object (${rig.state.lastRideEnd})`);
  check(finite(cam.position) && finite(cam.up) && cam.position.distanceTo(pose) < 1e-6, 'the camera stays where the ride left it, finite: no NaN pose, no jump to the origin');
  check(Number.isFinite(rig.state.distance) && rig.state.following === true, 'the ordinary follow is given back, at a finite distance');
  now = AGAIN;
  for (let i = 0; i < 3; i += 1) rig.update(0.016);
  check(finite(cam.position), 'valid again: following goes on with a finite camera');
  check(rig.rideAlong(getPos, getVel, { ms: 0 }) === true, 'and a ride can start again');
  rig.update(0.016);
  check(rig.state.riding === true && cam.position.distanceTo(getPos()) < 0.2, 'beside the station again');

  // --- the HUD: read as text (it needs a document); the rule is one line ---
  const hud = code(readFileSync(join(JS, 'ui/hud.js'), 'utf8'));
  check(/const p = ctx\.positionOfRecord \? ctx\.positionOfRecord\(sel\) : null;\s*if \(!p \|\| !Number\.isFinite\(p\.x\)\) \{ hideAll\(\); return; \}/.test(hud), 'ui/hud.js hides the reticle, the tag and the chevron when the selection has no finite position');
  check(/if \(!applyRide\(dts\)\) stopRide\('lost'\)/.test(code(readFileSync(join(JS, 'scene/camera.js'), 'utf8'))), 'scene/camera.js ends a ride it cannot place');
}

// =================================================================================================
// 3. Old comet links still resolve
// =================================================================================================
{
  const { parseComets, splitCometName } = await load('data/parsers.js');
  const cut = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/snapshots/jpl-sbdb-comets-cut.json'), 'utf8'));
  const records = parseComets(cut);
  const byId = new Map(records.map((r) => [r.id, r]));
  check(records.length >= 12, `the cut of JPL's table parses (${records.length} comets from ${cut.data.length} rows)`);
  // The ids the Minor Planet Center parser made, by its own rule (the parser of before #360, kept
  // here as it was): the designation from the name field with the number and orbit type beside
  // it, else the packed designation, else the whole name; spaces out.
  const oldId = (raw) => {
    const numberField = raw.slice(0, 4).trim();
    const orbitType = raw.slice(4, 5).trim() || null;
    const packed = raw.slice(5, 12).trim() || null;
    const full = raw.slice(102, 158).trim();
    const { designation } = splitCometName(full, numberField, orbitType);
    return { id: `comet-${(designation || packed || full).replace(/\s+/g, '')}`, full };
  };
  const mpc = readFileSync(join(ROOT, 'tests/fixtures/harvest/mpc_comets.txt'), 'utf8').split(/\r?\n/).filter((l) => l.length >= 100).map(oldId);
  check(mpc.length === 5, `the Minor Planet Center lines kept from before the switch were read (${mpc.length})`);
  for (const old of mpc) {
    const now = byId.get(old.id);
    check(!!now, `a link made before the switch, #at=${old.id} (${old.full}), opens a comet today`);
    if (now) check(now.meta && String(now.meta.fullName || now.name).replace(/\s+/g, ' ').includes(old.full.split(' (')[0]), `and it is the same comet: ${old.full} -> ${now.meta && now.meta.fullName} / ${now.name}`);
  }
  // The links people actually share: the numbered periodic comets and the great ones, as the old
  // ids were (the old parser's verified line was `1P/Halley`).
  const SHARED = { 'comet-1P': /Halley/, 'comet-2P': /Encke/, 'comet-12P': /Pons-Brooks/, 'comet-67P': /Churyumov/, 'comet-73P': /Schwassmann/, 'comet-308P': /Lagerkvist/, 'comet-C/1995O1': /Hale-Bopp/, 'comet-C/2023A3': /Tsuchinshan/ };
  for (const [id, name] of Object.entries(SHARED)) {
    const r = byId.get(id);
    check(!!r && name.test(`${r.name} ${r.meta && r.meta.fullName}`), `#at=${id} opens ${name.source} (${r ? r.name : 'nothing'})`);
  }
  // Fragments share their parent's designation: the id goes to the comet, once, and nothing is doubled.
  check(records.filter((r) => r.id === 'comet-73P').length === 1 && new Set(records.map((r) => r.id)).size === records.length, 'no two records share an id');
  check(records.every((r) => /^comet-[0-9A-Z]/.test(r.id) && !/\s/.test(r.id) && !/\(/.test(r.id)), `every id is "comet-" and a designation, no spaces and no name in brackets: ${records.map((r) => r.id).join(' ')}`);
}

// =================================================================================================
// 4. The launch card keeps its mission
// =================================================================================================
{
  const { firstSentence } = await load('ui/cards.js');
  const { COPY } = await load('copy/en.js');
  const text = (x) => (Array.isArray(x) ? x.map((p) => (typeof p === 'string' ? p : (p && (p.text || p.value)) || '')).join(' ') : String(x));
  // A launch as data/parsers.js parseLaunches makes it: an ascent block, the pad, LL2's mission type.
  const NOW = Date.UTC(2026, 9, 7, 12);
  const launch = (name) => ({ id: 'launch-x', name, layer: 'launches', klass: 'rocket', frame: 'earth-fixed', propagator: 'ascent', ascent: { t0Ms: NOW + 86400e3 }, meta: { netMs: NOW + 86400e3, pad: 'SLC-40', padName: 'Space Launch Complex 40', missionType: 'Communications' } });
  const m = { ok: true, tMs: NOW, altKm: null, distSunKm: null, distEarthKm: null, speedKmh: null };
  const said = (name) => text(firstSentence(launch(name), { clock: { now: () => NOW } }, m, { state: 'none' })).replace(/\s+/g, ' ');
  const ell = COPY.punctuation.ellipsis;
  // The case of #361: the rocket's variant used to push the mission off the end.
  const t18 = said('Falcon 9 Block 5 | Transporter 18 (Dedicated SSO Rideshare)');
  check(/Falcon 9 · Transporter 18\b/.test(t18) && !t18.includes(ell), `"Falcon 9 Block 5 | Transporter 18 (...)" keeps its mission, whole: ${t18}`);
  // A long mission, inside the limit: in full.
  const long = 'Falcon 9 Block 5 | Space Development Agency Tranche 2 Transport Layer B';
  const s2 = said(long);
  check(s2.includes('Falcon 9 · Space Development Agency Tranche 2 Transport Layer B') && !s2.includes(ell), `a long mission inside the limit is shown in full: ${s2}`);
  // Longer than any limit: cut, but between words, and never down to the rocket alone.
  const words = ['National', 'Reconnaissance', 'Office', 'Launch', 'Proliferated', 'Architecture', 'Demonstration', 'Rideshare', 'Seventeen', 'Bravo'];
  for (let n = 5; n <= words.length; n += 1) {
    const mission = words.slice(0, n).join(' ');
    const s = said(`Falcon Heavy | ${mission}`);
    const m = new RegExp(`Falcon Heavy · ([^${ell}]*)${ell}`).exec(s);
    if (!s.includes(ell)) { check(s.includes(`Falcon Heavy · ${mission}`), `${n} words fit and are all there: ${s}`); continue; }
    check(!!m, `${n} words: the name is cut with an ellipsis after the rocket and its mission: ${s}`);
    if (!m) continue;
    const kept = m[1].trim().split(' ');
    check(kept.length >= 3 && kept.every((w, i) => w === words[i]), `${n} words: every word kept is a WHOLE word of the mission, in order (${kept.join(' ')})`);
    check(!/[\s·,;:&|(/-]$/.test(m[1]), `${n} words: nothing dangles before the ellipsis ("${m[1].slice(-12)}${ell}")`);
  }
  const noSpace = said(`Electron | ${'A'.repeat(120)}`);
  check(noSpace.includes(ell) && /Electron · A{30,}/.test(noSpace), 'a name that is one unbroken word is still cut, where it must be');
}

if (problems.length) { console.error('regressions FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('regressions ok: Back and Forward apply the whole view (selection, stage, clock, trip and stop); a tracked object that loses its position loses its track and its ride at a finite pose and gets them back; comet links from before the JPL switch open the same comets; a launch card keeps its mission in whole words');
