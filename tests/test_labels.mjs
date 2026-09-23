// tests/test_labels.mjs -- spec 0026 req 5: a few names over the scene, never the catalogue.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { chooseLabels, labelName, labelParentId, isNotable, isOwnPlaceOnLadder, clampLabelX, keepClearOf, behindWorld, LABEL_EDGE_PAD, LABEL_CAP, NOTABLE_CAP } = await import(join(JS, 'ui/labels.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const rec = (id, klass = 'satellite', meta = {}) => ({ id, name: id.toUpperCase(), klass, layer: 'x', meta });
// the selection always comes first, even when it is farthest
const sel = { record: rec('sel'), kind: 'selection', x: 100, y: 100, dist: 99 };
const near = { record: rec('n1', 'satellite', { why: 'x' }), kind: 'notable', x: 300, y: 300, dist: 1 };
check(chooseLabels([near, sel])[0].record.id === 'sel', 'the selection is first');
// a train follows the selection, before notable
const train = { record: rec('t1'), kind: 'train', x: 500, y: 500, dist: 50 };
check(chooseLabels([near, train, sel]).map((c) => c.record.id).join(',') === 'sel,t1,n1', 'selection, train, notable');
// 24 px dedupe: a notable 10 px from the selection is dropped
const clash = { record: rec('c'), kind: 'notable', x: 108, y: 104, dist: 2 };
check(!chooseLabels([sel, clash]).some((c) => c.record.id === 'c'), 'a label within 24 px of another is dropped');
// the caps: 40 notable in -> 10 out; 40 notable + selection + 5 train -> 12 total
const many = Array.from({ length: 40 }, (_, i) => ({ record: rec(`m${i}`), kind: 'notable', x: 50 + i * 40, y: 400, dist: i }));
check(chooseLabels(many).length === NOTABLE_CAP, `at most ${NOTABLE_CAP} notable labels (${chooseLabels(many).length})`);
// Spec 0030: on a trip on the Sun's stage the worlds are the picture, and take the notable slots
// before a nearer asteroid or probe (headless Chrome, 2026-09-23: none of the planets was named).
{
  const rock = { record: { id: 'apophis', klass: 'asteroid' }, kind: 'notable', x: 100, y: 100, dist: 10 };
  const mars = { record: { id: 'mars', klass: 'world' }, kind: 'notable', x: 400, y: 100, dist: 90 };
  check(chooseLabels([rock, mars], { notableCap: 1 })[0].record.id === 'apophis', 'nearest-first stands everywhere else');
  check(chooseLabels([rock, mars], { notableCap: 1, worldsFirst: true })[0].record.id === 'mars', 'with worldsFirst a world takes the slot before a nearer asteroid');
  const sel2 = { record: { id: 'sel', klass: 'probe' }, kind: 'selection', x: 700, y: 100, dist: 50 };
  check(chooseLabels([rock, mars, sel2], { worldsFirst: true })[0].record.id === 'sel', 'the selection still leads');
}
const trains = Array.from({ length: 5 }, (_, i) => ({ record: rec(`tr${i}`), kind: 'train', x: 50 + i * 40, y: 700, dist: i }));
const all = chooseLabels([...many, ...trains, sel]);
check(all.length === LABEL_CAP && all[0].kind === 'selection' && all.filter((c) => c.kind === 'train').length === 5, `the cap is ${LABEL_CAP} with the selection and the whole train kept (${all.length})`);
// nearest notable first
const far = { record: rec('far'), kind: 'notable', x: 10, y: 10, dist: 500 };
const close = { record: rec('close'), kind: 'notable', x: 700, y: 10, dist: 5 };
check(chooseLabels([far, close])[0].record.id === 'close', 'notable labels are nearest first');
// bad input never throws
check(chooseLabels(null).length === 0 && chooseLabels([{ record: null }, { record: rec('q'), kind: 'notable', x: NaN, y: 1 }]).length === 0, 'bad candidates are dropped, not thrown on');
// names and notability
check(labelName({ id: 'sat-25544', name: 'ISS (ZARYA)', klass: 'station', meta: { noradId: 25544 } }) === 'International Space Station', 'the ISS is named as people name it');
check(labelName({ id: 'x', name: 'SOME CUBESAT', klass: 'satellite', meta: {} }) === 'SOME CUBESAT', 'a plain record keeps its catalogue name');
check(isNotable({ klass: 'satellite', meta: { why: 'because' } }) && isNotable({ klass: 'world', meta: {} }) && isNotable({ klass: 'station', meta: {} }) && !isNotable({ klass: 'debris', meta: {} }), 'notable = a hand-kept reason, a world, or a station');
check(labelName({ name: 'A'.repeat(60), meta: {} }).length <= 34, 'a long name is cut for the label');

// A LABEL IS CENTRED ON WHAT IT NAMES, so half of it hangs past that point, and only the anchor
// used to be kept on screen. Measured on a 375 px phone, 2026-09-20: a label ran 311..407 -- a
// third of the name off the right edge. The numbers below are that case and its mirror.
{
  const W = 375;
  const box = 96; // the label that overflowed
  const at = (x) => clampLabelX(x, box, W);
  check(at(359) === W - box / 2 - LABEL_EDGE_PAD, `a label anchored near the right edge slides in: ${at(359)}`);
  check(at(359) + box / 2 <= W, `the whole box fits: right edge at ${at(359) + box / 2} of ${W}`);
  check(at(2) - box / 2 >= 0, `a label at the left edge fits too: left edge at ${at(2) - box / 2}`);
  check(at(180) === 180, 'a label with room on both sides is not moved');
  // Wider than the window: it cannot fit, so it starts at the left edge -- the beginning of a name
  // is the part worth keeping.
  check(clampLabelX(300, 500, W) - 250 <= LABEL_EDGE_PAD, 'a label wider than the window starts at the left edge');
  // Garbage in: the caller has a NaN projection now and then, and this must not turn it into 4.
  check(Number.isNaN(clampLabelX(NaN, box, W)), 'a NaN anchor stays NaN rather than being placed at the edge');
  check(Number.isFinite(clampLabelX(100, undefined, W)), 'a label whose width is not known yet is still placed');
}

// BOXES, NOT ANCHORS. Seen on the live site on a 390 px phone, 2026-09-21: two payloads from one
// launch, anchors ~30 px apart on the same row -- both pass the 24 px anchor test -- and their
// 230 px names printed as one unreadable line.
{
  const box = (x, y, w = 230, h = 20) => ({ left: x - w / 2, right: x + w / 2, top: y - 1.4 * h, bottom: y - 0.4 * h });
  const a = { record: rec('p1'), kind: 'notable', x: 200, y: 260, dist: 1 };
  const b = { record: rec('p2'), kind: 'notable', x: 232, y: 262, dist: 2 };
  check(chooseLabels([a, b]).length === 2, 'the reproduction: both anchors pass the 24 px test');
  const keep = keepClearOf([box(200, 260), box(232, 262)]);
  check(keep[0] === true && keep[1] === false, `two names on one row overprint; the second must go (got ${keep})`);
  // the first in priority order survives, whichever is on the left
  check(keepClearOf([box(232, 262), box(200, 260)])[0] === true, 'the higher-priority label is the one kept');
  // rows far enough apart both stay: a label is ~20 px tall
  check(keepClearOf([box(200, 200), box(200, 240)]).every(Boolean), 'labels on separate rows are both kept');
  // side by side with room between them both stay
  check(keepClearOf([box(100, 200, 150), box(300, 200, 150)]).every(Boolean), 'labels side by side with a gap are both kept');
  // a kept box blocks everything overlapping it, not only its neighbour in the list
  check(keepClearOf([box(200, 200), box(600, 200), box(210, 205)]).join() === 'true,true,false', 'an overlap with ANY kept box drops the label');
  // garbage: a box not yet measured is not placed over anything
  check(keepClearOf([box(200, 200), { left: NaN, right: 10, top: 0, bottom: 1 }]).join() === 'true,false', 'an unmeasured box is dropped, not drawn');
  check(keepClearOf(undefined).length === 0, 'no boxes, no labels');
}

// A GENERIC SHAPE IS NOT A GENERIC NAME. Tiangong is drawn from a representative build, and the
// flag that says so also stopped its name being used: the second crewed station in orbit was
// labelled "CSS (TIANHE)" beside "International Space Station". A route's own displayName wins.
{
  const station = (name) => ({ id: 'sat-48274', name, klass: 'station', layer: 'stations', meta: {} });
  check(labelName(station('CSS (TIANHE)')) === 'Tiangong space station', `Tianhe is labelled ${labelName(station('CSS (TIANHE)'))}`);
  check(/Wentian/.test(labelName(station('CSS (WENTIAN)'))) && /Tiangong/.test(labelName(station('CSS (WENTIAN)'))), 'Wentian names itself and its station');
  // ... and a generic route WITHOUT one still does not rename: "a Starlink" is a class, and the
  // catalogue's STARLINK-31234 is the more specific thing to print over one particular satellite.
  const sl = { id: 'sat-1', name: 'STARLINK-31234', klass: 'satellite', layer: 'visual', meta: {} };
  check(labelName(sl) === 'STARLINK-31234', `a Starlink keeps its designation, got ${labelName(sl)}`);
}

// THE HAND-KEPT LIST'S NAME, before the catalogue's -- but never over a route's. Seen on a phone,
// 2026-09-21: ENVISAT, THOR AGENA D R/B and SL-8 R/B in capitals, while data/layers.js had
// "Envisat", "Thor Agena D rocket body" and "SL-8 rocket body" written out by hand beside them.
{
  const row = (name, klass, noradId, listName) => ({ id: `sat-${noradId}`, name, klass, layer: 'debris-notable', meta: { noradId, listName } });
  check(labelName(row('ENVISAT', 'satellite', 27386, 'Envisat')) === 'Envisat', 'Envisat is written as a name, not shouted');
  check(labelName(row('THOR AGENA D R/B', 'rocket', 733, 'Thor Agena D rocket body')) === 'Thor Agena D rocket body', 'the list names a rocket body in words');
  // the list says "ISS (Zarya)" and "CSS (Tianhe)"; the routes are better and must win
  check(labelName(row('ISS (ZARYA)', 'station', 25544, 'ISS (Zarya)')) === 'International Space Station', 'the list must not outrank the ISS route');
  check(labelName(row('CSS (TIANHE)', 'station', 48274, 'CSS (Tianhe)')) === 'Tiangong space station', 'the list must not outrank the Tiangong route');
  // and a record the list does not know keeps the catalogue's string
  check(labelName(row('COSMOS 1933', 'satellite', 18187, undefined)) === 'COSMOS 1933', 'no list name, no rename');
}

// On a ladder stage the Solar System is one pixel, and the Sun names it (measured 2026-09-22: the
// Sun from the Pleiades was labelled "Uranus", from a light-year out "Voyager 1").
check(isOwnPlaceOnLadder({ klass: 'world', id: 'sun' }), 'the Sun is its own place on the ladder');
check(!isOwnPlaceOnLadder({ klass: 'world', id: 'uranus' }), 'Uranus is inside the Sun\'s pixel on the ladder');
check(!isOwnPlaceOnLadder({ klass: 'probe', id: 'deep-voyager-1' }), 'Voyager 1 is inside the Sun\'s pixel on the ladder');
check(['star', 'exoplanet', 'dso', 'exotic'].every((klass) => isOwnPlaceOnLadder({ klass, id: 'x' })), 'stars, exoplanets, deep-sky objects and exotics are places on the ladder');
check(!isOwnPlaceOnLadder(null), 'nothing is not a place');

// A WORLD HIDES THE NAMES BEHIND IT. On the Moon trip's first stop (headless Chrome, 2026-09-22)
// seven deep-space names were printed across the lunar surface. The Moon here is the real one: a
// 1.7374-unit sphere with the camera 900 km (0.9 units) above a site on it.
{
  const moon = { id: 'moon', x: 0, y: 0, z: 0, r: 1.7374 };
  const site = { x: 0, y: 1.7374, z: 0 };                  // on the surface, facing the eye
  const eye = { x: 0.3, y: 1.7374 + 0.85, z: 0 };
  const farBehind = { x: -30, y: -250, z: 0 };               // a probe far beyond, straight through the Moon
  const beside = { x: 400, y: 2.6, z: 0 };                   // off to the side, clear of the limb
  const farSide = { x: 0, y: -1.7374, z: 0 };                // a site on the far side of the Moon
  check(behindWorld(eye, farBehind, [moon]), 'a thing behind the Moon has no label over the Moon');
  check(!behindWorld(eye, site, [moon]), 'a site on the near surface keeps its label: its own ground does not hide it');
  check(behindWorld(eye, farSide, [moon]), 'a site on the far side is hidden by the Moon');
  check(!behindWorld(eye, beside, [moon]), 'a thing clear of the limb keeps its label');
  check(!behindWorld(eye, { x: 0, y: 0, z: 0 }, [moon], 'moon'), "a world's own label, on its own centre, is not hidden by itself");
  check(!behindWorld({ x: 0, y: 5, z: 0 }, { x: 0, y: 10, z: 0 }, [moon]), 'a sphere behind the eye hides nothing');
  check(!behindWorld(eye, farBehind, [{ id: 'x', x: 0, y: 0, z: 0, r: 0 }]) && !behindWorld(eye, farBehind, null), 'no sphere, nothing hidden');
}

// A MOON NEVER OUTRANKS ITS PLANET, AND NO TWO NAMES OF DISTANT WORLDS PRINT ON ONE ANOTHER.
//
// From a stage that is not Earth every other world is drawn on one compressed shell a few degrees
// wide, so which of a planet and its moon came out nearer the camera was a coin toss. MEASURED on
// the live app from Saturn, 2026-09-22, 1280x800, camera aimed at the Sun: the names printed were
// "4 Vesta, Titan, Earth, Deimos, Phaethon, Ganymede, Callisto". Mars was drawn 11 px from Deimos,
// Jupiter 5 px from Ganymede, each of them ten times the wider disc, and neither was named. The
// anchors below are those pixel positions, and the box widths are what the app measured for those
// names at 13 px (ui/site.css .label).
{
  const world = (id, name) => ({ id, name, klass: 'world', layer: 'worlds', meta: {} });
  // {id, x, y, drawn distance in scene units, the world it goes round}
  const SATURN_VIEW = [
    ['earth', 619, 395, 341.1, null], ['moon', 618, 395, 313.9, 'earth'],
    ['mercury', 605, 403, 353.1, null], ['venus', 602, 402, 344.6, null],
    ['mars', 789, 395, 346.8, null], ['phobos', 792, 398, 344.2, 'mars'], ['deimos', 779, 403, 350.3, 'mars'],
    ['jupiter', 987, 404, 379.2, null], ['io', 972, 405, 387.0, 'jupiter'],
    ['ganymede', 982, 402, 360.2, 'jupiter'], ['callisto', 1069, 398, 355.1, 'jupiter'],
  ];
  // labelParentId is what ui/labels.js itself asks, so the rows above are checked against it
  // rather than trusted: a moon's is its planet, a planet's is nothing.
  for (const [id, , , , parentId] of SATURN_VIEW) {
    check(labelParentId(world(id, id)) === parentId, `labelParentId(${id}) is ${parentId} (got ${labelParentId(world(id, id))})`);
  }
  check(labelParentId(rec('sat-1')) === null && labelParentId(null) === null, 'a satellite goes round nothing a label cares about');
  const cands = SATURN_VIEW.map(([id, x, y, dist]) => ({
    record: world(id, id), kind: 'notable', x, y, dist, parentId: labelParentId(world(id, id)),
  }));
  const chosen = chooseLabels(cands);
  const names = chosen.map((c) => c.record.id);
  for (const planet of ['mars', 'jupiter']) {
    const moons = SATURN_VIEW.filter(([, , , , p]) => p === planet).map(([id]) => id);
    const named = moons.filter((m) => names.includes(m));
    check(names.includes(planet) || named.length === 0,
      `${planet} is named before any of its moons (got ${names.join(', ')})`);
    check(names.indexOf(planet) < 0 || named.every((m) => names.indexOf(m) > names.indexOf(planet)),
      `${planet} comes before ${named.join(', ')} in the list`);
  }
  check(names.includes('earth') && names.includes('mars') && names.includes('jupiter'),
    `the three planets in this view are named (${names.join(', ')})`);
  // ... and the boxes those names need do not print over each other.
  const WIDE = { earth: 42, moon: 74, mercury: 62, venus: 46, mars: 40, phobos: 56, deimos: 56, jupiter: 56, io: 22, ganymede: 74, callisto: 56 };
  const H = 19;
  const boxes = chosen.map((c) => {
    const w = WIDE[c.record.id] || 50;
    const x = clampLabelX(c.x, w, 1280);
    return { id: c.record.id, left: x - w / 2, right: x + w / 2, top: c.y - 1.4 * H, bottom: c.y - 0.4 * H };
  });
  const keep = keepClearOf(boxes);
  const printed = boxes.filter((_, i) => keep[i]);
  let over = [];
  for (let i = 0; i < printed.length; i++) {
    for (let j = i + 1; j < printed.length; j++) {
      const a = printed[i], b = printed[j];
      if (a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top) over.push(`${a.id}/${b.id}`);
    }
  }
  check(over.length === 0, `no two printed names of distant worlds overlap (${over.join(' ')})`);
  check(printed.some((b) => b.id === 'mars') && printed.some((b) => b.id === 'jupiter'),
    `Mars and Jupiter survive the box test too (${printed.map((b) => b.id).join(', ')})`);

  // A planet's own parent is the Sun, and ui/labels.js passes null rather than 'sun' for it -- with
  // 'sun' every planet would rank at the Sun's distance, which from Earth is 150 000 scene units
  // and would put the whole solar system behind every satellite in low orbit.
  const far = { record: world('sun', 'The Sun'), kind: 'notable', x: 640, y: 400, dist: 150000, parentId: null };
  const near = { record: world('venus', 'Venus'), kind: 'notable', x: 100, y: 100, dist: 344, parentId: null };
  check(chooseLabels([far, near])[0].record.id === 'venus', 'a planet is not ranked at the Sun\'s distance');
  // a parentId nobody projected this frame falls back to the candidate's own distance
  const orphan = { record: world('titan', 'Titan'), kind: 'notable', x: 300, y: 300, dist: 5, parentId: 'saturn' };
  check(chooseLabels([near, orphan])[0].record.id === 'titan', 'a moon whose planet is not on screen keeps its own place');
}

// SPEC 0034 REQ 4: THE RACK-FOCUS SUBSTITUTE. emphasise(id) puts `is-subject` on the slot that
// names `id` and `is-dimmed` on every other visible slot, from the next update(); clearEmphasis()
// takes both off at once. The numbers the CSS draws are these constants, read back out of ui.css.
{
  const { createLabels, EMPHASIS_MS, EMPHASIS_FROM, DIM_OPACITY, SUBJECT_CLASS, DIMMED_CLASS } = await import(join(JS, 'ui/labels.js'));
  check(EMPHASIS_MS === 300 && EMPHASIS_FROM === 0.92 && DIM_OPACITY === 0.6, `the emphasis numbers are 300 ms, 0.92, 0.6 (${EMPHASIS_MS}, ${EMPHASIS_FROM}, ${DIM_OPACITY})`);
  const css = readFileSync(join(JS, '..', 'css/ui.css'), 'utf8');
  const kf = (css.match(/@keyframes sr-label-in \{([\s\S]*?)\n\}/) || [])[1] || '';
  check(new RegExp(`from \\{\\s*transform: scale\\(${EMPHASIS_FROM}\\)`).test(kf), 'ui.css scales the subject from EMPHASIS_FROM');
  check(new RegExp(`\\.is-subject \\.label__text \\{[^}]*animation: sr-label-in ${EMPHASIS_MS}ms`).test(css), 'over EMPHASIS_MS');
  check(new RegExp(`\\.label\\.is-dimmed \\{[^}]*opacity: ${DIM_OPACITY};`).test(css), 'and dims the rest to DIM_OPACITY');
  check(/@media \(prefers-reduced-motion: reduce\) \{\s*#labels \.label\.is-subject \.label__text \{\s*animation: none;/.test(css), 'reduced motion drops the scale and keeps the dim');

  // No DOM: the stub has both calls, and neither throws.
  const bare = createLabels({}, null);
  let threw = false;
  try { bare.emphasise('x'); bare.update(0); bare.clearEmphasis(); } catch { threw = true; }
  check(!threw && typeof bare.emphasise === 'function' && typeof bare.clearEmphasis === 'function', 'with no DOM emphasise() and clearEmphasis() exist and do not throw');

  // A small fake DOM: enough for createLabels to pool its twelve slots and write their classes.
  const THREE = await import(join(JS, '..', 'vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const fakeNode = () => {
    const classes = new Set();
    const kids = [];
    return {
      hidden: false, style: {}, dataset: {}, textContent: '', offsetWidth: 60, offsetHeight: 16,
      set className(v) { classes.clear(); String(v).split(/\s+/).filter(Boolean).forEach((c) => classes.add(c)); },
      get className() { return [...classes].join(' '); },
      classList: {
        add: (c) => classes.add(c), remove: (c) => classes.delete(c), contains: (c) => classes.has(c),
        toggle: (c, on) => { const want = on === undefined ? !classes.has(c) : !!on; if (want) classes.add(c); else classes.delete(c); return want; },
      },
      setAttribute() {}, appendChild(n) { kids.push(n); return n; }, remove() {}, kids,
    };
  };
  const hadDoc = 'document' in globalThis;
  const hadWin = 'window' in globalThis;
  globalThis.document = { createElement: fakeNode, documentElement: { classList: { contains: () => false } } };
  globalThis.window = { innerWidth: 1280, innerHeight: 800 };
  try {
    const tMs = Date.parse('2026-09-23T12:00:00Z');
    stage.setWorld('earth'); stage.setTime(tMs);
    // Three stations 20 000 km out, spread across the view; `why` makes each one notable.
    const recs = [[20000, 0, 0], [20000, 3000, 0], [20000, -3000, 1500]].map(([x, y, z], i) => ({
      id: `s${i}`, name: `S${i}`, klass: 'station', layer: 'x', propagator: 'static', frame: 'earth-inertial',
      pos: { x, y, z }, meta: { why: 'a test' },
    }));
    const scenePos = recs.map((r) => stage.toScene(r.pos, r.frame, tMs));
    const centre = scenePos.reduce((a, v) => a.add(v), new THREE.Vector3()).multiplyScalar(1 / 3);
    const camera = new THREE.PerspectiveCamera(45, 1280 / 800, 0.001, 1e9);
    camera.position.set(0, 0, 0);
    camera.lookAt(centre);
    camera.updateMatrixWorld(); camera.updateProjectionMatrix();
    // The pool is the twelve nodes createLabels appends to its host; the host keeps them to read.
    const pool = [];
    const host = { hidden: false, clientWidth: 1280, clientHeight: 800, appendChild: (n) => { pool.push(n); return n; } };
    const ctx = {
      camera, layers: [{ id: 'x' }], isLayerDrawable: () => true,
      recordsFor: (id) => (id === 'x' ? recs : []), selected: () => null,
    };
    const labels = createLabels(ctx, host);
    labels.update(tMs);
    const shown = () => pool.filter((n) => !n.hidden);
    check(shown().length === 3, `three stations are labelled (${shown().length})`);
    check(shown().every((n) => !n.classList.contains(SUBJECT_CLASS) && !n.classList.contains(DIMMED_CLASS)), 'with nothing emphasised, no label is marked');
    labels.emphasise('s1');
    labels.update(tMs);
    const subj = shown().filter((n) => n.classList.contains(SUBJECT_CLASS));
    const dim = shown().filter((n) => n.classList.contains(DIMMED_CLASS));
    check(subj.length === 1 && subj[0].kids[1].textContent === 'S1', `after emphasise('s1') and one update, S1 is the subject (${subj.map((n) => n.kids[1].textContent)})`);
    check(dim.length === 2 && !dim.includes(subj[0]), `and the other two are dimmed (${dim.length})`);
    labels.clearEmphasis();
    check(pool.every((n) => !n.classList.contains(SUBJECT_CLASS) && !n.classList.contains(DIMMED_CLASS)), 'clearEmphasis() takes both off at once, before the next update');
    labels.update(tMs);
    check(shown().every((n) => !n.classList.contains(SUBJECT_CLASS) && !n.classList.contains(DIMMED_CLASS)), 'and the next update leaves them off');
  } finally {
    if (!hadDoc) delete globalThis.document;
    if (!hadWin) delete globalThis.window;
  }
}

if (problems.length) { console.error('labels FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`labels ok: selection, then its train, then at most ${NOTABLE_CAP} nearest notable; 24 px dedupe; never the catalogue; the box stays on screen; no two boxes overprint, and a moon never takes the name a planet should have had`);
