// tests/test_ground.mjs -- standing on a landing site (forge #146): scene/groundmath.js, the built ground files and the
// stage's wiring.
//
// Asserted, with no browser:
//   THE ARITHMETIC: decodeHeights undoes build-ground.py's packing (16-bit steps, rows delta-coded, empty posts);
//     gridHeight is bilinear and NaN off the grid; tangentXZ is the inverse of the build's tangent plane (a point
//     1 km east is x = 1000 m, z = 0); the joystick has its dead zone and its unit circle; a second of walking north
//     is 1.4 m of -z, a run three times that; a rover does not strafe; the walker stops at the edge and on an empty
//     post; the skyline of a wall to the south stands up in the south only; the Sun's share over a skyline is 0,
//     a half and 1 across its disc; `#ground=` takes an id and nothing else.
//   THE FILES, for every row of site/data/ground/index.json: site.json names its sources with a licence each and
//     every file it lists exists and is under 2 MB; the near heights decode to a full grid with the lander's own
//     ground at 0 (within 0.3 m); the relief is a real place's (between 5 and 400 m within a kilometre; Mount Sharp
//     and the Apennines put more than 3 000 m into the far ground at Gale and Hadley); the world's curvature is in
//     the far ground (Utopia's plain falls away by about d^2 / 2R at its edges).
//   THE SOURCES: every registry/ground.yaml DTM, orthoimage and global model has a licence, and each URL is covered by
//     a registry/asset_sources.yaml row.
//   LAZY: main.js imports scene/groundstage.js only dynamically, and no boot module imports the stage, the math or
//     the frame; ui/urlstate.js carries `ground` and `sky` before `cam`.
//   THE WORDS: every COPY.ground key the stage reads is in copy/en.ground.js.
//   EIGHT SITES, AND OPPORTUNITY SAYS WHERE IT IS: Opportunity's ground stands at the last point of its traverse
//     (registry/traverses/opportunity.json), not at its landing row, and its model line says so on screen.
//   THE TRIPS (forge #146, #147): "Walk the landing sites" stands on all eight grounds and "Skies of other worlds" under
//     seven skies, every `stand:` naming a ground the index has or a world sky/worldframe.js knows; ui/trip.js opens
//     them through scene/groundstage.js standFor (a dynamic import), closes them on leave, and nothing of it is static.
//   THE BOOT LINE: main.js's whole wiring is one dynamic import in one block.
//
//   node tests/test_ground.mjs
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const mod = (rel) => import(pathToFileURL(join(JS, rel)).href);
const G = await mod('scene/groundmath.js');

// --- the arithmetic -------------------------------------------------------------------------------------------
{
  // Pack a 3 x 4 grid the way build-ground.py does (without the deflate), with one empty post.
  const q = [[5, 7, 6, 65535], [100, 90, 95, 96], [0, 65534, 1, 2]];
  const bytes = new Uint8Array(24);
  let i = 0;
  for (const row of q) {
    let prev = 0;
    row.forEach((v, c) => { const d = c === 0 ? v : (v - prev + 65536) % 65536; bytes[i++] = d & 255; bytes[i++] = d >> 8; prev = v; });
  }
  const h = G.decodeHeights(bytes, 4, -10, 0.5);
  check(h[0] === -7.5 && h[1] === -6.5 && Number.isNaN(h[3]) && h[4] === 40 && h[9] === -10 + 65534 * 0.5, `decodeHeights (${[...h].join(' ')})`);
  const grid = { size: 3, step: 10, h: Float32Array.from([0, 0, 0, 0, 10, 20, 0, 0, 0]) };
  check(Math.abs(G.gridHeight(grid, 5, 0) - 15) < 1e-6 && Number.isNaN(G.gridHeight(grid, 11, 0)), 'gridHeight is bilinear and NaN off the grid');
  const [x, z] = G.tangentXZ(0, (1000 / (3396190 * Math.PI)) * 180, 0, 0, 3396.19);
  check(Math.abs(x - 1000) < 0.2 && Math.abs(z) < 1e-6, `tangentXZ: 1 km east (${x.toFixed(3)}, ${z.toFixed(3)})`);
  const [, zn] = G.tangentXZ(0.01, 0, 0, 0, 1737.4);
  check(zn < 0, 'tangentXZ: north is -z');
  check(G.joystick(3, 3, 64).x === 0 && Math.abs(Math.hypot(G.joystick(200, 0, 64).x, G.joystick(200, 0, 64).y) - 1) < 1e-9 && G.joystick(0, -64, 64).y > 0.99, 'the joystick: a dead zone, the unit circle, up is forward');
  const s0 = { x: 0, z: 0, yawDeg: 0, pitchDeg: 0 };
  const walk = G.stepWalker(s0, { forward: 1 }, 0.1, {});
  check(Math.abs(walk.z + 0.14) < 1e-9 && Math.abs(walk.x) < 1e-9, `a tenth of a second north (${walk.x}, ${walk.z})`);
  const run = G.stepWalker(s0, { forward: 1, run: true }, 0.1, {});
  check(Math.abs(run.z + 0.42) < 1e-9, 'a run is three times a walk');
  const east = G.stepWalker({ ...s0, yawDeg: 90 }, { forward: 1 }, 0.1, {});
  check(Math.abs(east.x - 0.14) < 1e-9, 'facing east, forward is +x');
  const drive = G.stepWalker(s0, { strafe: 1 }, 0.1, { mode: 'drive' });
  check(drive.x === 0 && drive.z === 0, 'a rover does not strafe');
  const edge = G.stepWalker({ ...s0, z: -99.95 }, { forward: 1 }, 0.1, { limitM: 100 });
  check(edge.z === -100, 'the walker stops at the edge');
  const hole = G.stepWalker(s0, { forward: 1 }, 0.1, { height: () => NaN });
  check(hole.z === 0, 'the walker does not step onto an empty post');
  // A wall 400 m high across the south, 2 km off.
  const size = 101, step = 100, far = { size, step, h: new Float32Array(size * size) };
  for (let r = 0; r < size; r += 1) for (let c = 0; c < size; c += 1) far.h[r * size + c] = (r - 50) * step >= 2000 ? 400 : 0;
  const prof = G.horizonProfile(far, 0, 0, 1.7, 72);
  check(G.horizonAt(prof, 180) > 10 && G.horizonAt(prof, 0) < 1, `the skyline of a southern wall (${G.horizonAt(prof, 180).toFixed(2)} south, ${G.horizonAt(prof, 0).toFixed(2)} north)`);
  check(G.sunlitShare(-1, 0, 0.5) === 0 && Math.abs(G.sunlitShare(0, 0, 0.5) - 0.5) < 1e-9 && G.sunlitShare(1, 0, 0.5) === 1, 'the Sun over a skyline: none, a half, all');
  check(G.parseGroundLink('apollo-15') === 'apollo-15' && G.parseGroundLink('../x') === null && G.parseGroundLink('') === null, '`#ground=` takes an id only');
}

// --- the files ------------------------------------------------------------------------------------------------
const GROUND = join(ROOT, 'site/data/ground');
const index = JSON.parse(readFileSync(join(GROUND, 'index.json'), 'utf8'));
check(index.grounds.length >= 4, `at least four sites are built (${index.grounds.length})`);
const reliefFar = {};
for (const row of index.grounds) {
  const dir = join(GROUND, row.id);
  const m = JSON.parse(readFileSync(join(dir, 'site.json'), 'utf8'));
  check(m.sources && m.sources.length >= 3 && m.sources.every((s) => s.licence && s.credit && s.what), `${row.id}: three sources, each with a licence and a credit`);
  const files = [...m.near.files, m.far.file, ...m.orthoNear.files, m.orthoFar.file];
  for (const f of files) {
    const p = join(dir, f);
    check(existsSync(p) && statSync(p).size < 2 * 1024 * 1024, `${row.id}/${f} exists and is under 2 MB`);
  }
  const bands = m.near.files.map((f) => G.decodeHeights(new Uint8Array(inflateSync(readFileSync(join(dir, f)))), m.near.size, m.near.min, m.near.q));
  const h = new Float32Array(m.near.size * m.near.size);
  let o = 0;
  for (const b of bands) { h.set(b, o); o += b.length; }
  const near = { size: m.near.size, step: m.near.stepM, h };
  const finite = h.reduce((n, v) => n + (Number.isFinite(v) ? 1 : 0), 0);
  check(finite === h.length, `${row.id}: the near grid is full (${finite} of ${h.length})`);
  const at0 = G.gridHeight(near, 0, 0);
  check(Math.abs(at0) < 0.3, `${row.id}: the lander's ground is 0 (${at0.toFixed(3)} m)`);
  let lo = Infinity, hi = -Infinity;
  for (const v of h) { if (v < lo) lo = v; if (v > hi) hi = v; }
  check(hi - lo > 5 && hi - lo < 400, `${row.id}: near relief ${(hi - lo).toFixed(1)} m`);
  const fh = G.decodeHeights(new Uint8Array(inflateSync(readFileSync(join(dir, m.far.file)))), m.far.size, m.far.min, m.far.q);
  let flo = Infinity, fhi = -Infinity, edge = 0, en = 0;
  const S = m.far.size;
  for (let r = 0; r < S; r += 1) for (let c = 0; c < S; c += 1) {
    const v = fh[r * S + c];
    if (!Number.isFinite(v)) continue;
    if (v < flo) flo = v; if (v > fhi) fhi = v;
    if (r === 0 || c === 0 || r === S - 1 || c === S - 1) { edge += v; en += 1; }
  }
  reliefFar[row.id] = { relief: fhi - flo, edge: edge / Math.max(1, en), radiusKm: m.radiusKm, halfM: ((S - 1) / 2) * m.far.stepM };
}
for (const id of ['gale', 'apollo-15']) if (reliefFar[id]) check(reliefFar[id].relief > 3000, `${id}: the far ground holds its mountains (${reliefFar[id] && reliefFar[id].relief.toFixed(0)} m)`);
if (reliefFar.utopia) {
  const u = reliefFar.utopia;
  // The square's edge is 30.7 to 43.4 km out: the curvature alone lowers it by 139 to 277 m on Mars.
  const drop = (u.halfM * 1.15) ** 2 / (2 * u.radiusKm * 1000);
  check(u.edge < -drop * 0.4 && u.edge > -drop * 2.5, `utopia: the plain falls away with the curvature (edge mean ${u.edge.toFixed(0)} m, curvature ${(-drop).toFixed(0)} m)`);
}

// --- the sources ----------------------------------------------------------------------------------------------
{
  const yaml = readFileSync(join(ROOT, 'registry/ground.yaml'), 'utf8');
  const sources = readFileSync(join(ROOT, 'registry/asset_sources.yaml'), 'utf8');
  const matches = [...sources.matchAll(/match:\s*\[([^\]]*)\]/g)].flatMap((m) => [...m[1].matchAll(/"([^"]+)"/g)].map((x) => x[1]));
  const urls = [...yaml.matchAll(/^\s+url:\s*"([^"]+)"/gm)].map((m) => m[1]);
  check(urls.length >= 12, `registry/ground.yaml lists its sources (${urls.length})`);
  for (const u of urls) check(matches.some((p) => u.startsWith(p)), `registry/asset_sources.yaml covers ${u}`);
  const blocks = yaml.split(/\n\s{4}(?=dtm:|ortho:|global:)/).slice(1);
  for (const b of blocks) if (!/^global: \*/.test(b)) check(/licence:/.test(b.split(/\n\s{4}\w/)[0]), `a source block has a licence: ${b.slice(0, 60)}`);
}

// --- lazy, and the keys ---------------------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/import\('\.\/scene\/groundstage\.js'\)/.test(main), 'main.js fetches scene/groundstage.js with a dynamic import');
  const staticImports = [...main.matchAll(/^import[^;]+from '([^']+)'/gm)].map((m) => m[1]);
  for (const bad of ['./scene/groundstage.js', './scene/groundmath.js', './sky/worldframe.js', './sky/worldair.js']) check(!staticImports.includes(bad), `main.js does not import ${bad} at boot`);
  const { KEYS } = await mod('ui/urlstate.js');
  check(KEYS.includes('ground') && KEYS.includes('sky') && KEYS[KEYS.length - 1] === 'cam', 'ui/urlstate.js carries `ground` and `sky`, and `cam` stays last');
}

// --- the words ------------------------------------------------------------------------------------------------
{
  const { COPY } = await mod('copy/en.js');
  await mod('copy/en.ground.js');
  const src = readFileSync(join(JS, 'scene/groundstage.js'), 'utf8');
  const used = new Set([...src.matchAll(/\bT\.([a-zA-Z]+)/g)].map((m) => m[1]));
  for (const k of used) check(COPY.ground && COPY.ground[k] !== undefined, `COPY.ground.${k} is written`);
}

// --- eight sites, Opportunity --------------------------------------------------------------------------------
{
  check(index.grounds.length === 8, `eight sites are built (${index.grounds.length})`);
  const m = JSON.parse(readFileSync(join(GROUND, 'opportunity', 'site.json'), 'utf8'));
  const trav = JSON.parse(readFileSync(join(ROOT, 'registry/traverses/opportunity.json'), 'utf8'));
  const last = trav.paths[trav.paths.length - 1].slice(-1)[0];
  check(Math.abs(m.latDeg - last[1]) < 1e-6 && Math.abs(m.lonDeg - last[0]) < 1e-6, `Opportunity stands at its traverse's last point (${m.latDeg}, ${m.lonDeg})`);
  check(/Not where it landed/.test(m.model.what) && /Eagle crater/.test(m.model.what), 'Opportunity\'s line on screen says it is not the landing site, and why');
}

// --- the trips ------------------------------------------------------------------------------------------------
{
  const { TOURS } = await mod('data/tours.js');
  const W = await mod('sky/worldframe.js');
  const ids = new Set(index.grounds.map((g) => g.id));
  const walk = TOURS.find((t) => t.id === 'walk-the-landing-sites');
  const skies = TOURS.find((t) => t.id === 'skies-of-other-worlds');
  check(walk && walk.stops.length === 8 && walk.stops.every((s) => s.stand && ids.has(s.stand.ground)), 'Walk the landing sites stands on the eight grounds');
  check(skies && skies.stops.length >= 7 && skies.stops.every((s) => s.stand && s.stand.sky && W.parseSkyLink(s.stand.sky)), 'Skies of other worlds stands under seven skies the frame can parse');
  check(skies && ['proxima-b', 'trappist-1e', 'titan', 'europa'].every((w) => skies.stops.some((s) => s.stand.sky.startsWith(w))), 'Skies of other worlds visits Titan, Europa, Proxima b and TRAPPIST-1 e');
  const trip = readFileSync(join(JS, 'ui/trip.js'), 'utf8');
  check(/import\('\.\.\/scene\/groundstage\.js'\)\.then\(\(m\) => m\.standFor\(ctx, stand\)\)/.test(trip), 'ui/trip.js opens a `stand:` stop through standFor, fetched when needed');
  check(/standOn\(null\)/.test(trip), 'leaving a trip closes the stage');
  check(!/^import[^;]+groundstage/m.test(trip), 'ui/trip.js does not import the stage statically');
  const stage = await mod('scene/groundstage.js');
  check(typeof stage.standFor === 'function' && typeof stage.boot === 'function', 'scene/groundstage.js exports boot and standFor');
  for (const f of ['site/og/walk-the-landing-sites.png', 'site/og/skies-of-other-worlds.png', 'site/images/trips/walk-the-landing-sites.webp', 'site/images/trips/skies-of-other-worlds.webp']) check(existsSync(join(ROOT, f)), `${f} is made`);
}

// --- the boot line ----------------------------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const block = main.slice(main.indexOf('// b200-f7-ground: begin'), main.indexOf('// b200-f7-ground: end'));
  const code = block.split('\n').filter((l) => l.trim() && !l.trim().startsWith('//'));
  check(code.length <= 2 && !/ctx\.ground\b/.test(block), `main.js's wiring is one lazy line (${code.length} lines of code)`);
  check(main.split('b200-f7-ground: begin').length === 2, 'main.js has one block of this batch');
}

if (problems.length) {
  console.error(`test_ground: ${problems.length} problem(s)\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log(`test_ground: ok (the arithmetic, ${index.grounds.length} sites' files, the sources, lazy loading, the words, Opportunity, the two trips, the boot line)`);
