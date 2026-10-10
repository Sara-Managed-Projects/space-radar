// tests/test_figures.mjs -- the constellation figures as strokes, and the stars at their corners
// (site/js/sky/figures.js, drawn by scene/figures3d.js for registry/tours.yaml's `figures:`).
//
//   node tests/test_figures.mjs
//
// What it holds:
//   1. THE FILE PARSES INTO 88 FIGURES (89 features: the Serpent is two) and the validator's own list of ids is that list, so a
//      `figures:` id check_registry.py accepts is one the browser can draw.
//   2. THE STROKE: every segment of a figure once, in an order a pen could follow, each given the
//      share of the stroke its length on the sky earns it, ending at exactly 1.
//   3. THE STARS ARE THE MEASURED ONES: with the real 3D catalogue every corner of Orion is a star,
//      Betelgeuse and Rigel among them at the distances the trip's card states, and across the
//      whole sky at most a dozen corners are bends in a line and not stars.
//   4. SEEN FROM THE SUN THE 3D FIGURE IS THE SKY'S: each placed corner lies within a third of a
//      degree of the direction the line file gives.
//   5. THE TIMING: figures start in turn, never run backwards, and reduced motion draws them whole.
//   6. THE ECLIPTIC is a great circle tilted by the obliquity.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const F = await import(join(ROOT, 'site/js/sky/figures.js'));
const { TOURS } = await import(join(ROOT, 'site/js/data/tours.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const DEG = Math.PI / 180;

const lines = JSON.parse(readFileSync(join(ROOT, 'site/data/constellations.lines.json'), 'utf8'));
const names = JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8'));
const figures = F.parseFigures(lines, names);

// ---------------------------------------------------------------- 1. the figures and their ids
check(figures.size === 88, `${figures.size} figures parsed; the file has 88 (89 features, the Serpent twice)`);
check(figures.get('Ser').lines.length === 2, 'the Serpent is not its head and its tail together');
check(figures.get('Ori') && figures.get('Ori').name === 'Orion', 'Ori is named Orion');
const py = readFileSync(join(ROOT, 'scripts/check_registry.py'), 'utf8');
const listed = /TOUR_FIGURES = frozenset\("""([^"]*)"""/.exec(py);
check(!!listed, 'scripts/check_registry.py has no TOUR_FIGURES list');
if (listed) {
  const ids = [...new Set(listed[1].trim().split(/\s+/))].sort();
  check(JSON.stringify(ids) === JSON.stringify([...figures.keys()].sort()),
    'check_registry.py TOUR_FIGURES is not the ids of site/data/constellations.lines.json');
}
let asked = 0;
for (const tour of TOURS) for (const stop of tour.stops) for (const id of stop.figures || []) {
  asked++;
  check(figures.has(id), `${tour.id}/${stop.id} asks for figure ${id}, which the file does not have`);
}
check(asked >= 12, `only ${asked} figures are asked for by the trips; the constellations trip alone names more`);
check(F.parseFigures(null, null).size === 0 && F.parseFigures({ features: [{ id: 'X', geometry: { type: 'MultiLineString', coordinates: [[[1, 2]]] } }] }, []).size === 0,
  'a missing file, or a figure with no line of two points, yields no figure');

// ---------------------------------------------------------------- 2. the stroke
for (const fig of figures.values()) {
  const want = fig.lines.reduce((n, l) => n + l.length - 1, 0);
  const s = F.strokeSchedule(fig.lines);
  check(s.segments.length === want, `${fig.id}: ${s.segments.length} segments scheduled of ${want}`);
  let prev = 0;
  let total = 0;
  for (const seg of s.segments) {
    check(seg.t0 >= prev - 1e-12 && seg.t1 >= seg.t0, `${fig.id}: the stroke runs backwards (${seg.t0}, ${seg.t1})`);
    const len = F.angleBetween(F.dirOf(seg.a[0], seg.a[1]), F.dirOf(seg.b[0], seg.b[1]));
    total += len;
    if (s.lengthRad > 0 && len > 1e-9) check(Math.abs((seg.t1 - seg.t0) - len / s.lengthRad) < 1e-9, `${fig.id}: a segment's share is not its length's`);
    prev = seg.t1;
  }
  check(s.segments.length === 0 || s.segments[s.segments.length - 1].t1 === 1, `${fig.id}: the stroke does not end at 1`);
  check(Math.abs(total - s.lengthRad) < 1e-9, `${fig.id}: lengthRad is not the sum of the segments`);
  // Every input segment is there, either way round.
  const key = (a, b) => [a.join(','), b.join(',')].sort().join('|');
  const have = new Map();
  for (const seg of s.segments) have.set(key(seg.a, seg.b), (have.get(key(seg.a, seg.b)) || 0) + 1);
  for (const l of fig.lines) for (let i = 0; i + 1 < l.length; i++) {
    const k = key(l[i], l[i + 1]);
    check(have.get(k) > 0, `${fig.id}: a segment of the file is missing from the stroke`);
    have.set(k, have.get(k) - 1);
  }
}
// The pen goes to the nearest unused end, entering a polyline from that end.
const pen = F.strokeSchedule([[[0, 0], [10, 0]], [[40, 0], [30, 0]], [[12, 0], [20, 0]]]);
check(pen.segments.map((s) => `${s.a[0]}>${s.b[0]}`).join(' ') === '0>10 12>20 30>40',
  `the pen took ${pen.segments.map((s) => `${s.a[0]}>${s.b[0]}`).join(' ')}, not the nearest end each time`);
check(F.strokeSchedule([]).segments.length === 0 && F.strokeSchedule(null).lengthRad === 0, 'nothing to draw is an empty stroke');

// ---------------------------------------------------------------- 3 and 4. the measured stars
const buf = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
const count = dv.getUint32(8, true);
const posLy = new Float32Array(count * 3);
const appMag = new Float32Array(count);
for (let i = 0; i < count; i++) {
  const o = 16 + i * 24;
  posLy[i * 3] = dv.getFloat32(o, true);
  posLy[i * 3 + 1] = dv.getFloat32(o + 4, true);
  posLy[i * 3 + 2] = dv.getFloat32(o + 8, true);
  appMag[i] = dv.getFloat32(o + 16, true);
}
const candidates = F.brightIndex({ count, posLy, appMag });
check(candidates.length > 8000 && candidates.length < 12000, `${candidates.length} stars brighter than ${F.CORNER_MAG_LIMIT}; about 9 700 are`);
const orion = F.placeFigure(figures.get('Ori'), candidates);
check(orion.unplaced === 0, `${orion.unplaced} of Orion's corners are not a star`);
const lyOf = (mag) => orion.stars.find((s) => Math.abs(s.mag - mag) < 0.02);
check(lyOf(0.18) && Math.abs(lyOf(0.18).ly - 863) < 5, 'Rigel (mag 0.18) is not at about 863 light-years in Orion\'s stars');
check(lyOf(0.45) && Math.abs(lyOf(0.45).ly - 498) < 5, 'Betelgeuse (mag 0.45) is not at about 498 light-years: the card says five hundred');
check(lyOf(1.64) && Math.abs(lyOf(1.64).ly - 252) < 5, 'Bellatrix (mag 1.64) is not at about 252 light-years: the card says two hundred and fifty');
check(lyOf(1.69) && Math.abs(lyOf(1.69).ly - 1977) < 10, 'Alnilam (mag 1.69) is not at about 1 977 light-years: the card says nearly two thousand');
check(orion.stars[0].mag <= orion.stars[1].mag, 'a figure\'s stars are brightest first');
// ---- seen from the side (scene/figures3d.js, internal #387): drop lines to the plane of the sky and a distance on each star
{
  const { dropSegments, distanceText } = await import(join(ROOT, 'site/js/scene/figures3d.js'));
  const c = F.eqToEcl(F.dirOf(orion.centre[0], orion.centre[1]));
  const drops = dropSegments(orion);
  check(drops.length === orion.stars.length, `Orion gets one drop line a star (${drops.length} of ${orion.stars.length})`);
  let worstPlane = 0, worstAlong = 0, signs = 0;
  for (const d of drops) {
    // every foot is ON the plane through the median distance...
    worstPlane = Math.max(worstPlane, Math.abs(d.b[0] * c[0] + d.b[1] * c[1] + d.b[2] * c[2] - orion.medianLy));
    // ...and the line is along the line of sight, so it is square to the plane: (a - b) is parallel to c
    const v = [d.a[0] - d.b[0], d.a[1] - d.b[1], d.a[2] - d.b[2]];
    const l = Math.hypot(...v);
    if (l > 1e-6) worstAlong = Math.max(worstAlong, Math.hypot(v[1] * c[2] - v[2] * c[1], v[2] * c[0] - v[0] * c[2], v[0] * c[1] - v[1] * c[0]) / l);
    if (Math.abs(d.depthLy - l) < 1e-6 * Math.max(1, l)) signs++;
  }
  check(worstPlane < 1e-6 * orion.medianLy, `every drop line ends on the plane of the sky (worst ${worstPlane.toExponential(1)} ly)`);
  check(worstAlong < 1e-9, `every drop line is square to the plane, along the line of sight (${worstAlong.toExponential(1)})`);
  check(drops.some((d) => d.depthLy > 100) && drops.some((d) => d.depthLy < -100), 'Orion has stars well in front of and well behind its median distance (Bellatrix 252, Alnilam 1 977 ly)');
  check(drops.every((d) => d.t0 === 0.9 && d.t1 === 1), 'the drop lines come after the pen');
  const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
  check(distanceText(null, 863.4) === `${(await import(join(ROOT, 'site/js/copy/en.js'))).fmt.int(863)} ly` && /^Betelgeuse, .* ly$/.test(distanceText('Betelgeuse', 498.2)) && COPY.figures.distance === '{n} ly', 'the distance label is "863 ly", or "Betelgeuse, 498 ly" for a named star');
}
let corners = 0;
let unplaced = 0;
let worst = 0;
for (const fig of figures.values()) {
  const p = F.placeFigure(fig, candidates);
  corners += p.stars.length + p.unplaced;
  unplaced += p.unplaced;
  const sched = F.strokeSchedule(fig.lines);
  p.segments.forEach((seg, i) => {
    for (const [ly, radec] of [[seg.a, sched.segments[i].a], [seg.b, sched.segments[i].b]]) {
      const r = Math.hypot(ly[0], ly[1], ly[2]);
      const eq = F.eclToEq([ly[0] / r, ly[1] / r, ly[2] / r]);
      worst = Math.max(worst, F.angleBetween(eq, F.dirOf(radec[0], radec[1])) / DEG);
    }
  });
}
check(unplaced <= 12, `${unplaced} of ${corners} corners are not a star; a dozen at most are bends in a line`);
check(worst <= F.CORNER_TOLERANCE_DEG + 1e-3, `a placed corner is ${worst.toFixed(3)} degrees from where the file draws it`);
const lone = F.placeFigure({ id: 'X', name: 'X', centre: [0, 0], lines: [[[10, 10], [20, 20]]] }, []);
check(lone.unplaced === 2 && lone.segments[0].measured === false && lone.medianLy === 100, 'with no stars to find, both corners are counted unplaced and put at a stated distance');
const round = F.eclToEq(F.eqToEcl([0.3, -0.5, 0.81]));
check(Math.hypot(round[0] - 0.3, round[1] + 0.5, round[2] - 0.81) < 1e-12, 'eqToEcl and eclToEq are not each other\'s inverse');

// ---------------------------------------------------------------- 5. the timing
const opts = { drawMs: 1000, staggerMs: 400 };
check(F.figureProgress(0, 0, opts) === 0 && F.figureProgress(1000, 0, opts) === 1, 'a stroke runs from 0 at its start to 1 at its end');
check(F.figureProgress(399, 1, opts) === 0 && F.figureProgress(600, 1, opts) > 0, 'the second figure waits for its turn');
let last = 0;
for (let t = 0; t <= 1500; t += 50) {
  const p = F.figureProgress(t, 0, opts);
  check(p >= last && p >= 0 && p <= 1, `the stroke went backwards at ${t} ms`);
  last = p;
}
check(F.figureProgress(500, 0, opts) > 0.5, 'the pen slows INTO its last star: past half way at half time');
check(F.figureProgress(0, 3, { ...opts, reduced: true }) === 1, 'reduced motion draws every figure whole at once');

// ---------------------------------------------------------------- 6. the ecliptic
const ring = F.eclipticRing(360);
check(ring.length === 360 && ring.every((v) => Math.abs(Math.hypot(v[0], v[1], v[2]) - 1) < 1e-12), 'the ecliptic is 360 unit vectors');
const maxDec = Math.max(...ring.map((v) => Math.asin(v[2]) / DEG));
check(Math.abs(maxDec - F.OBLIQUITY_DEG) < 1e-6, `the ecliptic reaches declination ${maxDec.toFixed(4)}, not the obliquity`);
check(Math.abs(ring[0][0] - 1) < 1e-12 && Math.abs(ring[90][1] - Math.cos(F.OBLIQUITY_DEG * DEG)) < 1e-12, 'the ecliptic starts at the March equinox and climbs north');

if (problems.length) {
  console.error(`figures FAILED (${problems.length}):\n  ` + problems.slice(0, 30).join('\n  '));
  process.exit(1);
}
console.log(`figures ok: 88 figures, each one stroke; ${corners - unplaced} of ${corners} corners are measured stars (Orion all 23), within ${worst.toFixed(2)} degrees of the line file; the trips ask for ${asked}`);
