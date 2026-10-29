// tests/test_navigate.mjs -- where you are, and the way back (internal spec 0076 W3-d; internal #881, #883).
//
// Written from the stage's acceptance, not from the code:
//   - every selectable thing has a parent chain to the Milky Way or the Sun ("Milky Way > Helix", a moon
//     to its planet, a planet of another star to its star), and moons, planets of other stars and stars
//     have a parent button;
//   - Back returns along the visitor's own path, at least ten steps, kept for the session only and
//     never sent;
//   - the rail says which rung of the ladder the camera is on, and a note says the travel is sped up
//     and how far the far side is, once per join;
//   - the words are chrome: one line of at most 60 characters, Back is one word.
//
//   node tests/test_navigate.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { parentChain, parentFor } = await import(join(JS, 'ui/cards.js'));
const trail = await import(join(JS, 'ui/camundo.js'));
const rail = await import(join(JS, 'ui/scalerail.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const { LADDER_RUNGS } = await import(join(JS, 'data/ladder.js'));
const { CHAIN } = await import(join(JS, 'scene/handoff.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const C = COPY.r12Navigate;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --- the records, as the layers make them --------------------------------------------------------
const rec = (id, name, klass, meta = {}, extra = {}) => ({ id, name, klass, meta, ...extra });
const R = [
  rec('sun', 'The Sun', 'world', { parent: null }),
  rec('earth', 'Earth', 'world', { parent: 'sun' }),
  rec('moon', 'The Moon', 'world', { parent: 'earth' }),
  rec('jupiter', 'Jupiter', 'world', { parent: 'sun' }),
  rec('europa', 'Europa', 'world', { parent: 'jupiter' }),
  rec('dso-milky-way', 'Milky Way', 'dso', { kind: 'galaxy' }),
  rec('dso-helix-nebula', 'Helix Nebula', 'dso', { kind: 'nebula', typeCode: 'PN', distLy: 655 }),
  rec('dso-lmc', 'Large Magellanic Cloud', 'dso', { kind: 'galaxy', distLy: 161740 }),
  rec('dso-tarantula-nebula', 'Tarantula Nebula', 'dso', { kind: 'nebula', parent: 'dso-lmc', distLy: 161740 }),
  rec('dso-m31', 'Andromeda Galaxy', 'dso', { kind: 'galaxy', distLy: 2540000 }),
  rec('dso-g1', 'Mayall II', 'dso', { kind: 'cluster', distLy: 2540000 }),
  rec('hip-32349', 'Sirius', 'star', { distLy: 8.6 }, { layer: 'stars' }),
  rec('hip-70890', 'Proxima Centauri', 'star', { distLy: 4.24 }, { layer: 'stars' }),
  rec('exo-proxima-cen-b', 'Proxima Cen b', 'exoplanet', { host: 'Proxima Centauri' }, { layer: 'exoplanets' }),
  rec('star-trappist-1', 'TRAPPIST-1', 'star', {}, { layer: 'systems' }),
  rec('exo-trappist-1-e', 'TRAPPIST-1 e', 'exoplanet', { host: 'TRAPPIST-1' }, { layer: 'systems' }),
  rec('exotic-sgr-a-star', 'Sagittarius A*', 'exotic', { kind: 'blackhole', distLy: 26996 }),
  rec('exotic-m87-star', 'M87*', 'exotic', { kind: 'blackhole', distLy: 53000000 }),
  rec('sat-25544', 'ISS (ZARYA)', 'station', { noradId: 25544 }, { layer: 'stations' }),
  rec('apollo-11', 'Apollo 11 landing site', 'site', {}, { layer: 'hand-kept-sites' }),
  rec('ceres', 'Ceres', 'asteroid', {}, { layer: 'small-bodies' }),
];
const byId = new Map(R.map((r) => [r.id, r]));
const ctx = {
  recordById: (id) => byId.get(id) || null,
  recordsFor: (layer) => R.filter((r) => r.layer === layer),
  select: () => {},
};
const names = (record, m) => parentChain(record, ctx, m).map((s) => s.name);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
// The thing's own name is the card's (displayName: "International Space Station" for "ISS (ZARYA)"),
// so a chain is compared on its parents, and on the last name where the record's own is the card's.
const want = (id, expected, m = null) => {
  const got = names(byId.get(id), m);
  if (expected[expected.length - 1] === '*') { expected = [...expected.slice(0, -1), got[got.length - 1]]; }
  check(same(got, expected), `${id}: the chain is ${JSON.stringify(got)}, not ${JSON.stringify(expected)}`);
};

// The acceptance's own two: the Helix in the Milky Way, Europa round Jupiter.
want('dso-helix-nebula', ['Milky Way', 'Helix Nebula']);
want('europa', ['Sun', 'Jupiter', 'Europa']);
want('jupiter', ['Sun', 'Jupiter']);
want('moon', ['Sun', 'Earth', 'Moon']);
want('sun', ['Milky Way', 'Sun']);
want('hip-32349', ['Milky Way', 'Sirius']);
want('exo-proxima-cen-b', ['Milky Way', 'Proxima Centauri', 'Proxima Cen b']);
want('exo-trappist-1-e', ['Milky Way', 'TRAPPIST-1', 'TRAPPIST-1 e']);
want('exotic-sgr-a-star', ['Milky Way', 'Sagittarius A*']);
// A host star the catalogue has no row for is named, and the chain still reaches the Milky Way.
R.push(rec('exo-kepler-22-b', 'Kepler-22 b', 'exoplanet', { host: 'Kepler-22' }, { layer: 'exoplanets' }));
byId.set('exo-kepler-22-b', R[R.length - 1]);
want('exo-kepler-22-b', ['Milky Way', 'Kepler-22', 'Kepler-22 b']);
// A galaxy is never "in" the Milky Way, and its parents are only what the registries write down.
want('dso-m31', [C.outside, 'Andromeda Galaxy']);
want('dso-tarantula-nebula', [C.outside, 'Large Magellanic Cloud', 'Tarantula Nebula']);
want('dso-g1', [C.outside, 'Mayall II']);
want('exotic-m87-star', [C.outside, 'M87*']);
// Things in the Solar System: round the Earth, on the Moon, round the Sun (the frame decides).
want('sat-25544', ['Sun', 'Earth', '*'], { frame: 'earth-inertial', worldId: null });
want('apollo-11', ['Sun', 'Earth', 'Moon', '*'], { frame: 'moon-fixed', worldId: 'moon' });
want('ceres', ['Sun', '*'], { frame: 'sun-inertial', worldId: null });
// The Milky Way is the top of its own chain.
check(parentChain(byId.get('dso-milky-way'), ctx).length === 1, 'the Milky Way has no parent above it');

// Every chain starts at the Sun, the Milky Way or outside it, and every parent with a card is a button target.
const ROOTS = ['Sun', 'Milky Way', C.outside];
for (const r of R) {
  const m = ['station', 'site', 'asteroid'].includes(r.klass) ? { frame: r.klass === 'site' ? 'moon-fixed' : 'earth-inertial', worldId: r.klass === 'site' ? 'moon' : null } : null;
  const chain = parentChain(r, ctx, m);
  check(ROOTS.includes(chain[0].name), `${r.id}: its chain starts at "${chain[0].name}", not the Sun, the Milky Way or outside it`);
  check(chain[chain.length - 1].here && chain[chain.length - 1].record === r, `${r.id}: the chain ends with the thing itself, marked as here`);
  for (const step of chain.slice(0, -1)) {
    if (step.name === 'Sun' || step.name === 'Milky Way' || step.name === 'Jupiter' || step.name === 'Earth') check(!!step.record, `${r.id}: "${step.name}" has a card and is not a button`);
  }
}

// The parent button: moons, planets of other stars and stars (and the deep sky, as before); not a planet.
const parent = (id) => parentFor(byId.get(id), ctx);
check(parent('europa') && parent('europa').record.id === 'jupiter', 'Europa offers Back to Jupiter');
check(parent('moon') && parent('moon').record.id === 'earth', 'the Moon offers Back to the Earth');
check(parent('hip-32349') && parent('hip-32349').record.id === 'dso-milky-way', 'a star offers Back to the Milky Way');
check(parent('exo-trappist-1-e') && parent('exo-trappist-1-e').record.id === 'star-trappist-1', 'a planet of TRAPPIST-1 offers Back to its star');
check(parent('exo-proxima-cen-b') && parent('exo-proxima-cen-b').record.id === 'hip-70890', 'a planet of the catalogue offers Back to its star');
check(parent('dso-tarantula-nebula') && parent('dso-tarantula-nebula').deep, 'the deep sky keeps its own words (Back to the Large Magellanic Cloud)');
check(parent('jupiter') === null, 'a planet has the chain and no parent button: the Sun is not "back"');
check(parent('dso-m31') === null, 'a galaxy with no parent has no parent button');
check(/^Back to/.test(C.backParent) && C.the.includes('Sun') && C.the.includes('Milky Way'), 'Back to the Sun, Back to the Milky Way, Back to Jupiter');

// --- the way back --------------------------------------------------------------------------------
check(trail.TRAIL_MAX >= 10, `Back keeps at least ten steps, not ${trail.TRAIL_MAX}`);
{
  const steps = [];
  for (let i = 0; i < 30; i += 1) trail.pushStep(steps, { selected: { id: `r${i}` }, stage: 'earth' });
  check(steps.length === trail.TRAIL_MAX && steps[0].selected.id === `r${30 - trail.TRAIL_MAX}`, 'the oldest steps go first past the limit');
  trail.pushStep(steps, { selected: { id: 'r29' }, stage: 'earth', fresh: true });
  check(steps.length === trail.TRAIL_MAX && steps[steps.length - 1].fresh, 'the same place twice in a row is one step (the newer view kept)');
  check(!trail.sameStep({ selected: { id: 'a' }, stage: 'earth' }, { selected: { id: 'a' }, stage: 'sun' }), 'the same thing on another stage is another place');
}

// A visitor's evening on a stand-in app: the camera, the stage and the selection as main.js has them.
function app() {
  const log = [];
  const a = {
    stage: { worldId: 'earth' },
    moment: null,
    clock: { mode: 'live', now: () => 1e12, rate: 1, live() {}, goTo() {}, setRate() {} },
    cameraRig: { state: { flying: false }, pose: 'home', saveState() { return { pose: this.pose }; }, restoreState(s) { this.pose = s.pose; log.push(['pose', s.pose]); } },
    selectedRec: null,
    recordById: (id) => byId.get(id) || null,
    setStage(id) { a.stage.worldId = id; log.push(['stage', id]); },
    deselect() { a.selectedRec = null; log.push(['deselect']); },
    log,
  };
  // main.js select(): the stage first, the card (where the step is noted), then the flight.
  a.select = (r, opts = {}) => {
    a.selectedRec = r;
    trail.noteSelection(r, a, (x) => x.name);
    if (opts.fly !== false) a.cameraRig.pose = `at ${r.id}`;
    log.push(['select', r.id, opts.fly !== false]);
  };
  return a;
}
{
  trail.resetTrail();
  const a = app();
  const path = ['sat-25544', 'moon', 'jupiter', 'europa', 'dso-helix-nebula', 'hip-32349', 'exo-trappist-1-e', 'sun', 'earth', 'dso-m31', 'dso-lmc', 'exotic-sgr-a-star'];
  for (const id of path) {
    a.select(byId.get(id));
    // At rest between choices: the sampler sees the camera where the flight left it.
    await sleep(300);
  }
  check(trail.trailState().size === path.length, `twelve choices leave twelve steps back, not ${trail.trailState().size}`);
  check(rail.backWords(trail.trailState().top).label === 'Back to Andromeda Galaxy'.replace('Andromeda Galaxy', byId.get('dso-lmc').name), `Back names where it goes: ${rail.backWords(trail.trailState().top).label}`);
  const back = [];
  for (let i = 0; i < path.length; i += 1) {
    trail.goBack(a);
    back.push(a.selectedRec ? a.selectedRec.id : null);
  }
  const expected = [...path.slice(0, -1)].reverse().concat([null]);
  check(same(back, expected), `Back walks the visitor's own path in reverse: ${JSON.stringify(back)}`);
  check(a.cameraRig.pose === 'home', `the last Back is where the visit started, the camera as it was: ${a.cameraRig.pose}`);
  check(a.log.some(([k, p]) => k === 'pose' && p === 'at hip-32349'), 'Back puts the camera where the visitor left each place');
  check(!trail.goBack(a), 'with no steps left Back does nothing');
  // Back's own selections are not new steps, and the undo toast is not offered for them.
  check(a.log.filter(([k, , fly]) => k === 'select' && fly === true).length === path.length, 'Back restores the pose; it does not fly a second time where the pose was kept');
  trail.resetTrail();
}
{
  // A choice made while the camera is still flying keeps the place alone: Back flies to it.
  trail.resetTrail();
  const a = app();
  a.select(byId.get('jupiter'));
  a.cameraRig.state.flying = true;
  a.select(byId.get('europa'));
  a.select(byId.get('hip-32349'));
  a.cameraRig.state.flying = false;
  trail.goBack(a);
  check(a.selectedRec && a.selectedRec.id === 'europa' && a.log[a.log.length - 1][0] === 'select' && a.log[a.log.length - 1][2] === true, 'a place never rested at is flown back to');
  trail.resetTrail();
}
{
  // A tab that moves the stage under an open card: Back returns to the thing where it was chosen.
  trail.resetTrail();
  const a = app();
  a.stage.worldId = 'stellar';
  a.select(byId.get('dso-helix-nebula'));
  await sleep(300);
  a.setStage('jupiter');
  a.cameraRig.pose = 'jupiter framed';
  await sleep(300);
  a.select(byId.get('europa'));
  trail.goBack(a);
  check(a.stage.worldId === 'stellar' && a.selectedRec.id === 'dso-helix-nebula' && a.cameraRig.pose === 'at dso-helix-nebula',
    `Back from Europa is the Helix on the stars' stage, as it was left: ${a.stage.worldId}, ${a.selectedRec && a.selectedRec.id}, ${a.cameraRig.pose}`);
  trail.resetTrail();
}
{
  // Inside a trip or under the drift nothing is a step (they choose for the visitor).
  trail.resetTrail();
  const saved = globalThis.document;
  globalThis.document = { documentElement: { classList: { contains: (c) => c === 'sr-trip-mode' } }, hidden: false };
  const a = app();
  a.select(byId.get('jupiter'));
  a.select(byId.get('europa'));
  check(trail.trailState().size === 0, 'a trip\'s stops are not steps of the visitor\'s path');
  if (saved === undefined) delete globalThis.document; else globalThis.document = saved;
  trail.resetTrail();
}

// Kept for the session only, never sent: no storage, no request, no URL in the path's code.
for (const file of ['ui/camundo.js', 'ui/scalerail.js']) {
  const src = readFileSync(join(JS, file), 'utf8').replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '');
  for (const word of ['fetch(', 'sendBeacon', 'XMLHttpRequest', 'localStorage', 'sessionStorage', 'indexedDB', 'history.pushState', 'location.hash', 'document.cookie']) {
    check(!src.includes(word), `${file} uses ${word}: the path is kept in memory for the session and never sent`);
  }
}

// --- the rail: where you are --------------------------------------------------------------------
check(same(CHAIN, ['earth', 'sun', 'stellar', 'galaxy', 'local-group']), `the ladder's rungs are the chain of joins: ${JSON.stringify(CHAIN)}`);
const RUNG = { earth: 'earth', moon: 'earth', sun: 'sun', jupiter: 'sun', europa: 'sun', stellar: 'stellar', galaxy: 'galaxy', 'local-group': 'local-group', 'system-trappist-1': 'stellar' };
for (const [stage, rung] of Object.entries(RUNG)) check(rail.rungOf(stage) === rung, `the stage ${stage} is on the rung ${rung}, not ${rail.rungOf(stage)}`);
for (const id of CHAIN) {
  const rows = rail.railRungs(id);
  check(rows.length === 5 && rows.filter((r) => r.here).length === 1 && rows.find((r) => r.here).id === id, `on ${id} exactly one rung is marked, and it is ${id}`);
}
check(!rail.railShown({ stageId: 'earth', steps: 0 }), 'at home with no path the rail has nothing to say and is not there');
check(rail.railShown({ stageId: 'earth', steps: 1 }), 'at home with a path to walk back the rail is there, with Back');
check(rail.railShown({ stageId: 'stellar', steps: 0 }) && rail.railShown({ stageId: 'jupiter', steps: 0 }), 'off the Earth the rail says where you are');
check(!rail.railShown({ stageId: 'stellar', steps: 3, blocked: true }), 'never in a trip, a clear screen, the drift or the share sheet');

// The note: once per join, the outermost crossed first, the far side's distance from the ladder, never typed.
const shown = new Set();
const n1 = rail.joinNote('earth', 'sun', shown);
check(n1 && n1.key === 'sun', 'out from the Earth to the Solar System: the Solar System\'s note');
const distance = (rung) => LADDER_RUNGS.find((r) => r.id === rung).distance;
check(n1 && n1.text.includes(distance('sun')), `the note names the Sun's distance as registry/ladder.yaml writes it: ${n1 && n1.text}`);
shown.add('sun');
check(rail.joinNote('sun', 'earth', shown) === null, 'the same join crossed back is not said twice in a visit');
const n2 = rail.joinNote('earth', 'local-group', shown);
check(n2 && n2.key === 'local-group' && n2.text.includes(distance('andromeda')), `a long jump out says its outermost join first: ${n2 && n2.text}`);
shown.add('local-group');
check(rail.joinNote('local-group', 'earth', shown) === null, 'a jump whose outermost join was said is not said again for the inner ones');
const n3 = rail.joinNote('galaxy', 'stellar', shown);
check(n3 && n3.key === 'galaxy' && n3.text.includes(distance('galactic-centre')), `in from the Milky Way to the stars: the galaxy's note, once: ${n3 && n3.text}`);
check(rail.joinNote('earth', 'system-trappist-1', new Set(['sun'])).key === 'stellar', 'a jump to a star system is about the stars, not the Sun');
check(rail.joinNote('jupiter', 'sun', new Set()) === null, 'a world\'s stage and the Sun\'s are one rung: no join');
check(rail.joinNote('stellar', 'system-trappist-1', new Set()) === null, 'a star system\'s stage is on the stars\' rung: no join');
for (const key of ['sun', 'stellar', 'galaxy', 'local-group']) {
  const text = rail.noteWords(key);
  check(text && /sped up/i.test(text), `the note at ${key} says the travel is sped up: ${text}`);
  check(text && [...text].length <= 60, `the note at ${key} is one chrome line of 60 at most: ${text}`);
}

// --- the words -----------------------------------------------------------------------------------
const lines = [C.chainLabel, C.chainTitle, C.milkyWay, C.outside, C.backParent, C.backParentTitle, C.legendTitle, C.label, C.title, C.back, C.backTo, ...Object.values(C.rungs)];
for (const s of lines) check(typeof s === 'string' && s && [...s].length <= 90 && !/[!→]|\s--\s/.test(s), `a chrome string is one plain line: ${s}`);
for (const s of [C.chainLabel, C.label, C.back, ...Object.values(C.rungs)]) check([...s].length <= 60, `a drawn chrome string is 60 characters at most: ${s}`);
check(C.back.split(/\s+/).length === 1, 'Back is one word on the button; its name says where');
check(rail.backWords(null).label === C.back && rail.backWords({ name: 'Jupiter' }).label === 'Back to Jupiter', 'Back\'s name: "Back to Jupiter"');
check(rail.backWords({ selected: null, stage: 'earth' }).label === 'Back to Earth', 'Back to a place with nothing chosen names its rung');

// Keyboard: Back and the chain's parents are real buttons, in the order they read.
const railSrc = readFileSync(join(JS, 'ui/scalerail.js'), 'utf8');
const cardSrc = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
check(/el\(doc, 'button', 'sr-scalerail__back'\)/.test(railSrc) && /back\.type = 'button'/.test(railSrc), 'Back is a <button>, reachable by Tab, pressed by Enter or Space');
check(/el\('button', 'sr-card__crumb'/.test(cardSrc) && /aria-current', 'location'/.test(cardSrc), 'a parent in the chain is a <button>; the thing itself is marked aria-current');

// The rail and the badge stand clear of the collapsed sidebar's handle (release 1.5.1: the rail covered the round "S").
const finCss = readFileSync(join(JS, '../css/finishers.css'), 'utf8');
{
  const m = finCss.match(/@media \(min-width: 900px\) \{\s*html\.sr-side-collapsed:not\(\.sr-phone\) \.sr-scalebadge,\s*html\.sr-side-collapsed:not\(\.sr-phone\) \.sr-scalerail \{([^}]*)\}/);
  check(!!m && /left: calc\(var\(--sr-inset\) \+ 64px \+ var\(--sp-2\)\)/.test(m[1]), 'collapsed on a desktop, the rail and the badge start to the right of the 64 px handle (ui.css .sr-side.is-collapsed)');
}

if (problems.length) {
  console.error(`navigate: ${problems.length} problem(s)\n  - ${problems.join('\n  - ')}`);
  process.exit(1);
}
console.log(`navigate ok: ${R.length} records each with a chain from the Sun, the Milky Way or outside it; Back walks ${trail.TRAIL_MAX} steps in reverse and keeps nothing past the session; the rail marks one of ${CHAIN.length} rungs and says each join once`);
