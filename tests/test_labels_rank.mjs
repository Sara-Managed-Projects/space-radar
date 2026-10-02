// tests/test_labels_rank.mjs -- spec 0061 req 10: at most eight names, ranked, never a rocket body.
//
// MEASURED 2026-10-02 on the default view at 1440x900 (headless Chrome, the saved satellite copy):
// nine names, among them "SL-8 rocket body" and "Envisat", dead since 2012; the live site printed
// "Thor Agena D rocket body" at the top of the first screen. ui/labels.js now ranks the selection,
// the crewed stations, the named storms, the bright planets, then the rest by scene/pickrank.js,
// keeps rocket bodies and debris off the first screen, caps the count at eight after the boxes are
// placed, and holds a name for a while once it is shown. Each of those is held here.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const L = await import(join(JS, 'ui/labels.js'));
const {
  chooseLabels, labelTier, isDerelict, mayNameHere, layerNamedFrom, capKept, keepClearOf, createLabels,
  LABEL_CAP, LABEL_POOL, TRAIN_CAP, HYSTERESIS, TIER, BRIGHT_WORLDS, LAUNCH_SCORE,
} = L;
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const rec = (id, klass = 'satellite', extra = {}) => ({ id, name: id, klass, layer: 'visual', meta: {}, ...extra });
const cand = (record, x, y, dist, kind = 'notable') => ({ record, kind, x, y, dist });

// --- 1. the cap ---------------------------------------------------------------------------------
check(LABEL_CAP === 8, `the cap is eight (${LABEL_CAP})`);
check(LABEL_POOL > LABEL_CAP, 'more candidates are measured than are shown, so one that yields is replaced');
{
  const many = Array.from({ length: 30 }, (_, i) => cand(rec(`s${i}`, 'satellite', { meta: { why: 'x' } }), 40 + i * 45, 300, i + 1));
  check(chooseLabels(many).length === LABEL_CAP, `30 notable in, ${LABEL_CAP} out (${chooseLabels(many).length})`);
  check(chooseLabels(many, { cap: LABEL_POOL }).length === LABEL_POOL, 'the live caller asks for the pool');
  // the boxes: twelve placed, three of them on top of the first; the eight shown are the first eight
  // that did not collide, in rank order
  const box = (x) => ({ left: x - 40, right: x + 40, top: 280, bottom: 296 });
  const xs = [100, 105, 110, 115, 300, 400, 500, 600, 700, 800, 900, 1000];
  const keep = capKept(keepClearOf(xs.map(box)), LABEL_CAP);
  check(keep.filter(Boolean).length === LABEL_CAP, `capKept shows ${LABEL_CAP} of twelve (${keep.filter(Boolean).length})`);
  check(keep.join() === 'true,false,false,false,true,true,true,true,true,true,true,false', `the three that collide yield to the next ones (${keep.join()})`);
  check(capKept(null).length === 0, 'nothing in, nothing out');
}

// --- 2. the rank ---------------------------------------------------------------------------------
{
  const sel = cand(rec('sel', 'satellite'), 50, 50, 900, 'selection');
  const station = cand(rec('iss', 'station', { layer: 'stations' }), 150, 50, 800);
  const storm = cand(rec('rachel', 'storm', { layer: 'storms' }), 250, 50, 700);
  const venus = cand(rec('venus', 'world', { layer: 'worlds' }), 350, 50, 600);
  const near = cand(rec('hubble', 'satellite', { meta: { why: 'x' } }), 450, 50, 5);
  const launch = cand(rec('l1', 'rocket', { layer: 'launches', meta: { why: 'honesty' } }), 550, 50, 3);
  const uranus = cand(rec('uranus', 'world', { layer: 'worlds' }), 650, 50, 100);
  const order = chooseLabels([uranus, launch, near, venus, storm, station, sel]).map((c) => c.record.id).join(',');
  check(order === 'sel,iss,rachel,venus,hubble,l1,uranus', `selection, station, storm, bright planet, then the rest nearest first (${order})`);
  check(LAUNCH_SCORE > 1, 'a launch ranks as though it were farther: its `why` is an honesty note, not a reason to name it');
  check(labelTier(sel) === TIER.selection && labelTier(station) === TIER.station && labelTier(storm) === TIER.storm
    && labelTier(venus) === TIER.planet && labelTier(uranus) === TIER.rest, 'the tiers are what the spec lists');
  check(['sun', 'moon', 'venus', 'mars', 'jupiter', 'saturn'].every((id) => BRIGHT_WORLDS.has(id)) && !BRIGHT_WORLDS.has('uranus'), 'the bright worlds are the naked-eye ones');
  check(labelTier(uranus, { allPlanets: true }) === TIER.planet, 'on the Sun\'s stage every planet is in the planets\' tier');
  check(labelTier(cand(rec('titan', 'world'), 0, 0, 1), { allPlanets: true }) === TIER.rest, 'a moon is not');
  // Inside the tier the Moon and the giants come first, whatever is nearer (the crowded inner system).
  const merc = cand(rec('mercury', 'world', { layer: 'worlds' }), 100, 300, 10);
  const sat = cand(rec('saturn', 'world', { layer: 'worlds' }), 300, 300, 90);
  check(chooseLabels([merc, sat], { allPlanets: true })[0].record.id === 'saturn', 'Saturn is named before a nearer Mercury');
  // The selection keeps its name whatever crowds it: a station 5 px away yields, not the selection.
  const crowd = cand(rec('css', 'station', { layer: 'stations' }), 54, 52, 1);
  check(chooseLabels([crowd, sel])[0].record.id === 'sel' && !chooseLabels([crowd, sel]).some((c) => c.record.id === 'css'), 'the selection always keeps its label; a lower rank yields');
  // The selection's train: a few, not the whole line.
  const train = Array.from({ length: 8 }, (_, i) => cand(rec(`t${i}`), 300 + i * 40, 400, i, 'train'));
  check(chooseLabels([sel, ...train]).filter((c) => c.kind === 'train').length === TRAIN_CAP, `at most ${TRAIN_CAP} of the train`);
}

// --- 3. no rocket bodies or debris by default -----------------------------------------------------
{
  const rb = rec('sat-733', 'rocket', { name: 'THOR AGENA D R/B', meta: { why: 'x', listName: 'Thor Agena D rocket body', noradId: 733 } });
  const deb = rec('sat-1', 'debris', { name: 'COSMOS 2251 DEB' });
  const envisat = rec('sat-27386', 'satellite', { name: 'ENVISAT', meta: { why: 'x', derelict: true, noradId: 27386 } });
  const launch = rec('l1', 'rocket', { layer: 'launches' });
  check(isDerelict(rb) && isDerelict(deb) && isDerelict(envisat), 'a rocket body, a piece of debris and a dead satellite are derelicts');
  check(!isDerelict(launch) && !isDerelict(rec('hubble')) && !isDerelict(null), 'a rocket on its way up is not, nor a working satellite');
  const visual = { id: 'visual', klass: 'satellite' };
  const famous = { id: 'debris-notable', klass: 'debris' };
  check(!mayNameHere(rb, visual) && !mayNameHere(envisat, visual), 'not named from "Bright enough to see"');
  check(mayNameHere(rb, famous), 'named on Famous debris, which the visitor switched on to see them');
  check(mayNameHere(rec('hubble'), visual), 'a working satellite is named anywhere');
}

// --- 4. hysteresis -------------------------------------------------------------------------------
{
  const a = cand(rec('a', 'satellite', { meta: { why: 'x' } }), 100, 100, 10);
  const b = cand(rec('b', 'satellite', { meta: { why: 'x' } }), 400, 100, 11);
  check(chooseLabels([a, b], { cap: 1 })[0].record.id === 'a', 'nearest first with nothing shown');
  check(chooseLabels([a, b], { cap: 1, incumbents: new Set(['b']) })[0].record.id === 'b', 'a name shown last tick keeps its slot against a slightly nearer newcomer');
  const far = cand(rec('b', 'satellite', { meta: { why: 'x' } }), 400, 100, 10 / HYSTERESIS + 1);
  check(chooseLabels([a, far], { cap: 1, incumbents: ['b'] })[0].record.id === 'a', 'and loses it to one clearly nearer');
  // and an incumbent wins the overlap with a newcomer of its own rank
  const c = cand(rec('c', 'satellite', { meta: { why: 'x' } }), 110, 105, 9);
  check(chooseLabels([a, c], { incumbents: ['a'] }).map((x) => x.record.id).join() === 'a', 'among equals the incumbent is the one that stays');
  // the planet's incumbency carries its moon: a moon never jumps ahead of its planet
  const jup = cand(rec('jupiter', 'world', { layer: 'worlds' }), 300, 300, 50);
  const io = { ...cand(rec('io', 'world', { layer: 'worlds' }), 600, 300, 49), parentId: 'jupiter' };
  const order = chooseLabels([io, jup], { incumbents: ['io'] }).map((x) => x.record.id).join();
  check(order === 'jupiter,io', `a moon held from the last tick still ranks behind its planet (${order})`);
}

// --- 5. what is named from where --------------------------------------------------------------------
check(!layerNamedFrom({ frame: 'earth-inertial' }, 'sun') && !layerNamedFrom({ frame: 'earth-fixed' }, 'stellar'), 'the Earth\'s satellites and storms are not named from the Sun\'s stage or the ladder');
check(layerNamedFrom({ frame: 'earth-inertial' }, 'earth') && layerNamedFrom({ frame: 'earth-fixed' }, 'moon'), 'they are from the Earth and the Moon');
check(layerNamedFrom({ frame: 'sun-inertial' }, 'sun') && layerNamedFrom(null, 'sun'), 'everything else is named where it is drawn');

// --- 6. the live labeller: a rocket body on a default layer gets no name, and the eight stay put ---
{
  const THREE = await import(join(JS, '..', 'vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const fakeNode = () => {
    const classes = new Set();
    const kids = [];
    return {
      hidden: false, style: {}, dataset: {}, textContent: '', offsetWidth: 60, offsetHeight: 16,
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((x) => classes.add(x)); },
      get className() { return [...classes].join(' '); },
      classList: {
        add: (x) => classes.add(x), remove: (x) => classes.delete(x), contains: (x) => classes.has(x),
        toggle: (x, on) => { const want = on === undefined ? !classes.has(x) : !!on; if (want) classes.add(x); else classes.delete(x); return want; },
      },
      setAttribute() {}, appendChild(n) { kids.push(n); return n; }, remove() {}, kids,
    };
  };
  const hadDoc = 'document' in globalThis;
  const hadWin = 'window' in globalThis;
  globalThis.document = { createElement: fakeNode, documentElement: { classList: { contains: () => false } } };
  globalThis.window = { innerWidth: 1280, innerHeight: 800 };
  try {
    const tMs = Date.parse('2026-10-02T12:00:00Z');
    stage.setWorld('earth'); stage.setTime(tMs);
    // Fourteen notable satellites 20 000 km out, spread across the view, and one rocket body nearest.
    const at = (i) => [20000, -6000 + i * 900, (i % 2) * 900];
    const sats = Array.from({ length: 14 }, (_, i) => ({
      id: `s${i}`, name: `S${i}`, klass: 'satellite', layer: 'visual', propagator: 'static', frame: 'earth-inertial',
      pos: { x: at(i)[0], y: at(i)[1], z: at(i)[2] }, meta: { why: 'a test' },
    }));
    const rb = { id: 'rb', name: 'THOR AGENA D R/B', klass: 'rocket', layer: 'visual', propagator: 'static', frame: 'earth-inertial', pos: { x: 15000, y: 0, z: 0 }, meta: { why: 'x' } };
    const recs = [rb, ...sats];
    const camera = new THREE.PerspectiveCamera(45, 1280 / 800, 0.001, 1e9);
    camera.position.set(0, 0, 0);
    camera.lookAt(stage.toScene({ x: 20000, y: 0, z: 0 }, 'earth-inertial', tMs));
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    const pool = [];
    const host = { hidden: false, clientWidth: 1280, clientHeight: 800, appendChild: (n) => { pool.push(n); return n; } };
    const ctx = {
      camera, layers: [{ id: 'visual', klass: 'satellite', frame: 'earth-inertial', colour: '#7FD1FF' }], isLayerDrawable: () => true,
      recordsFor: (id) => (id === 'visual' ? recs : []), selected: () => null,
    };
    const labels = createLabels(ctx, host);
    check(pool.length === LABEL_POOL, `the pool is ${LABEL_POOL} nodes (${pool.length})`);
    labels.update(tMs);
    const shown = () => pool.filter((n) => !n.hidden).map((n) => n.kids[1].textContent);
    const first = shown();
    check(first.length > 0 && first.length <= LABEL_CAP, `between one and ${LABEL_CAP} names shown (${first.length})`);
    check(!first.some((n) => /R\/B|rocket body/i.test(n)), `no rocket body named on the default layer (${first.join(', ')})`);
    check(pool.filter((n) => !n.hidden).every((n) => n.kids[0].style.background === '#7FD1FF'), 'each name\'s dot is the colour its dot on the globe is drawn in');
    // Ten more ticks with the camera turning a hair each time: the same names.
    let changed = 0;
    for (let i = 0; i < 10; i++) {
      camera.rotateY(0.0004 * (i % 2 ? -1 : 1));
      camera.updateMatrixWorld();
      labels.update(tMs + i * 100);
      if (shown().slice().sort().join() !== first.slice().sort().join()) changed++;
    }
    check(changed === 0, `the names hold still while the view turns a little (${changed} of 10 ticks changed)`);
  } finally {
    if (!hadDoc) delete globalThis.document;
    if (!hadWin) delete globalThis.window;
  }
}

if (problems.length) { console.error('labels rank FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`labels rank ok: at most ${LABEL_CAP} names; selection, stations, storms, bright planets, then the rest by pickrank; no rocket body or debris on a default layer; a shown name holds its slot until a newcomer is ${Math.round((1 - HYSTERESIS) * 100)} % nearer`);
