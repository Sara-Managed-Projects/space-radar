// tests/test_exoface.mjs -- a face for a planet nobody has seen (internal #466 phase B, 2026-10-08).
//
// scene/exoface.js draws surfaces no telescope has resolved, so what it may claim is the test:
//   1. THE CLASSIFIER, on planets whose answer is known from their rows in site/data/exoplanets.csv:
//      55 Cnc e is molten, LHS 1140 b and Kepler-452 b are mild, HD 189733 b is a gas giant, GJ 1214 b
//      a mini-Neptune, TRAPPIST-1 e a mild world that keeps one face to its star.
//   2. PURE AND STABLE: the same row gives the same face, a different name a different seed.
//   3. THE LABEL is made from the row: "Measured: 1.7 Earth radii, a 25-day year. The surface is
//      imagined." A forecast mass is not printed as measured and does not decide the class.
//   4. IMAGINED WORLDS are named "An imagined world no. N", never a real planet, and claim nothing.
//   5. THE SHADER: three tiers, the phone's is one draw call, no texture is sampled, no city lights.
//   6. THE WIRING: nothing at boot, the light embed never names it, the card and the canvas say
//      "Artist's impression" wherever a face is drawn.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const read = (p) => readFileSync(join(ROOT, p), 'utf8');

const X = await import(join(JS, 'scene/exoface.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { SYSTEMS } = await import(join(JS, 'data/systems.js'));

// --- 1. the classifier, from the table's own rows ------------------------------------------------
const csv = read('site/data/exoplanets.csv').split('\n').filter((l) => l && !l.startsWith('#'));
const head = csv[0].split(',');
const col = (n) => head.indexOf(n);
function rowOf(name) {
  const line = csv.find((l) => l.startsWith(name + ','));
  if (!line) return null;
  const f = line.split(',');
  const n = (i) => { const v = Number(f[i]); return f[i] !== '' && Number.isFinite(v) ? v : null; };
  return { name, radiusEarths: n(col('pl_rade')), massEarths: n(col('pl_bmasse')), periodDays: n(col('pl_orbper')), starTeffK: n(col('st_teff')), starRadiusSuns: n(col('st_rad')), method: f[col('discoverymethod')] };
}
const WANT = [
  ['55 Cnc e', { climate: 'lava', kind: 'rocky', locked: true }],
  ['LHS 1140 b', { climate: 'temperate', kind: 'rocky', eyeball: true }],
  ['Kepler-452 b', { climate: 'temperate', kind: 'rocky', eyeball: false, locked: false }],
  ['HD 189733 b', { cls: 'gasGiant', kind: 'giant', climate: null, deck: 'alkali' }],
  ['GJ 1214 b', { cls: 'miniNeptune', kind: 'giant' }],
  ['GJ 1132 b', { climate: 'desert', kind: 'rocky' }],
];
for (const [name, want] of WANT) {
  const row = rowOf(name);
  check(!!row, `${name} is in site/data/exoplanets.csv`);
  if (!row) continue;
  const f = X.faceFor(row);
  for (const k of Object.keys(want)) check(f[k] === want[k], `${name}: ${k} is ${JSON.stringify(f[k])}, expected ${JSON.stringify(want[k])}`);
  check(X.CLASSES.includes(f.cls), `${name}: class ${f.cls} is one of the six`);
  check(f.teqK > 30 && f.teqK < 5000 && f.albedo === 0.3, `${name}: an equilibrium temperature at the stated albedo (${f.teqK})`);
}
// The Earth and its neighbours, as rows: the limits have to put them where they are.
const sol = (name, r, m, p, a) => X.faceFor({ name, radiusEarths: r, massEarths: m, periodDays: p, aAu: a, starTeffK: 5772, starRadiusSuns: 1, starMassSuns: 1 });
const earth = sol('Earth', 1, 1, 365.256, 1);
check(earth.cls === 'rock' && earth.climate === 'temperate' && !earth.locked && Math.abs(earth.teqK - 255) < 2 && Math.abs(earth.fluxEarths - 1) < 0.01, `the Earth is a mild rock at 255 K (${earth.cls}, ${earth.climate}, ${earth.teqK.toFixed(1)} K, ${earth.fluxEarths.toFixed(3)})`);
check(sol('Venus', 0.949, 0.815, 224.7, 0.723).climate === 'desert', 'Venus is past the inner edge: hot and dry');
check(sol('Europa-like', 0.245, 0.008, 4333, 5.2).climate === 'snowball', 'at Jupiter\'s distance a small world is frozen over');
check(sol('Neptune', 3.88, 17.15, 60190, 30.07).cls === 'iceGiant' && sol('Jupiter', 11.2, 317.8, 4333, 5.2).cls === 'gasGiant' && sol('Jupiter', 11.2, 317.8, 4333, 5.2).deck === 'ammonia', 'Neptune is an ice giant, Jupiter a gas giant under ammonia cloud');
// TRAPPIST-1, the system that ships with faces: e, f and g mild, h frozen, b and c hot; all locked.
const T1 = Object.fromEntries(SYSTEMS[0].planets.map((p) => [p.name.slice(-1), X.faceFor(X.rowOf(p, SYSTEMS[0].star))]));
check(['e', 'f', 'g'].every((k) => T1[k].climate === 'temperate' && T1[k].eyeball), 'TRAPPIST-1 e, f and g are mild and keep one face to the star');
check(T1.h.climate === 'snowball' && T1.b.climate === 'desert' && T1.c.climate === 'desert', `TRAPPIST-1 h is frozen, b and c hot (${T1.h.climate}, ${T1.b.climate}, ${T1.c.climate})`);
check(Object.values(T1).every((f) => f.locked && f.kind === 'rocky' && !f.estimated.orbit && !f.estimated.radius), 'all seven are rock, locked, and drawn from measured sizes and orbits');
check(T1.e.star.light[0] > T1.e.star.light[1] && T1.e.star.light[1] > T1.e.star.light[2] && T1.e.star.light[2] > 0.3, `a red dwarf lights its planets orange, part balanced (${T1.e.star.light.map((v) => v.toFixed(2))})`);
check(earth.star.light.every((v) => v > 0.85), 'a Sun-like star lights them near white');

// --- 2. pure and stable --------------------------------------------------------------------------
{
  const row = rowOf('LHS 1140 b');
  const a = JSON.stringify(X.faceFor(row)), b = JSON.stringify(X.faceFor({ ...row }));
  check(a === b, 'the same row gives the same face');
  check(X.faceFor(row).seed !== X.faceFor({ ...row, name: 'LHS 1140 c' }).seed, 'the seed is the name\'s');
  check(X.seedOf('TRAPPIST-1 e') === X.seedOf(' trappist-1 E '), 'the seed does not care about case or stray spaces');
  const frozen = JSON.stringify(row);
  X.faceFor(row);
  check(JSON.stringify(row) === frozen, 'faceFor() does not write to its row');
}

// --- 3. the label --------------------------------------------------------------------------------
{
  const L = X.faceLabel(X.faceFor(rowOf('LHS 1140 b')));
  check(L.tag === 'Artist’s impression' && L.tag === COPY.exoface.tag, 'the tag is "Artist’s impression"');
  check(L.measured === 'Measured: 1.7 Earth radii, a 25-day year.' && L.imagined === 'The surface is imagined.', `LHS 1140 b's line is the plan's own: ${L.measured} ${L.imagined}`);
  check(L.line === 'Artist’s impression. Measured: 1.7 Earth radii, a 25-day year. The surface is imagined.', `the card's line: ${L.line}`);
  check(X.faceLabel(X.faceFor(rowOf('55 Cnc e'))).measured === 'Measured: 1.9 Earth radii, an 18-hour year.', 'a year under two days is said in hours, and "an 18-hour"');
  check(X.faceLabel(X.faceFor(rowOf('HD 189733 b'))).imagined === 'The cloud tops are imagined.', 'a giant has cloud tops, not a surface');
  // Kepler-452 b's mass in the composite table is a forecast from its radius: not measured, not used.
  const k = X.faceFor(rowOf('Kepler-452 b'));
  check(k.measured.massEarths === null && k.packing === null && k.cls === 'superEarth', `a forecast mass decides nothing (Kepler-452 b: ${k.cls}, mass ${k.measured.massEarths})`);
  // A planet with a mass and no radius is sized by a relation and says so.
  const rv = X.faceFor({ name: 'A planet with no radius', massEarths: 300, periodDays: 400, starTeffK: 5800, starRadiusSuns: 1 });
  check(rv.estimated.radius && rv.cls === 'gasGiant' && /^Measured: 300 Earth masses, a 400-day year\.$/.test(X.faceLabel(rv).measured), `a worked-out radius is not printed as measured: ${X.faceLabel(rv).measured}`);
  for (const [, , line] of [...WANT.map(([n]) => [n, 0, X.faceLabel(X.faceFor(rowOf(n)))])].flatMap((x) => [[0, 0, x[2].measured], [0, 0, x[2].imagined], [0, 0, x[2].tag]])) {
    check(line.length <= 60, `a label line fits a chrome line (${line.length}): ${line}`);
  }
  check(/worked out, not seen\.$/.test(X.faceWhy(X.faceFor(rowOf('LHS 1140 b')))), 'why it is drawn so is said as worked out');
}

// --- 4. imagined worlds --------------------------------------------------------------------------
{
  const realNames = new Set(csv.slice(1).map((l) => l.split(',')[0].toLowerCase()));
  const kinds = new Set();
  let mild = 0;
  for (let n = 1; n <= 300; n++) {
    const w = X.imaginedWorld(n);
    check(w.name === `An imagined world no. ${n}` && !realNames.has(w.name.toLowerCase()), `no. ${n} is named as imagined: ${w.name}`);
    check(w.face.imagined === true && w.face.measured.radiusEarths === null && w.face.measured.periodDays === null, `no. ${n} claims no measurement`);
    const L = X.faceLabel(w.face);
    check(L.measured === 'Nothing here is measured.' && L.imagined === 'The whole world is imagined.' && !/Measured:/.test(L.line), `no. ${n}'s label: ${L.line}`);
    kinds.add(w.face.kind === 'giant' ? w.face.cls : w.face.climate);
    if (w.face.climate === 'temperate') mild += 1;
  }
  check(JSON.stringify(X.imaginedWorld(214)) === JSON.stringify(X.imaginedWorld('214')), 'the same number is the same world');
  check(X.imaginedWorld('nonsense').n === 1 && X.imaginedWorld(-5).n === 1 && X.imaginedWorld(1e9).n === 99999, 'a bad number is held to 1..99 999');
  check(mild >= 180, `most imagined worlds are the mild, blue kind (${mild} of 300)`);
  check(['temperate', 'snowball', 'lava', 'desert', 'gasGiant', 'miniNeptune'].every((k) => kinds.has(k)), `the generator reaches every look (${[...kinds]})`);
}

// --- 5. the shader -------------------------------------------------------------------------------
{
  const src = read('site/js/scene/exoface.js');
  check(X.FACE_TIERS.length === 3 && X.FACE_TIERS[0].drawCalls === 1 && X.FACE_TIERS[0].halo === false, 'three tiers, and the phone\'s is one draw call');
  check(X.FACE_TIERS[0].octaves < X.FACE_TIERS[1].octaves && X.FACE_TIERS[1].octaves < X.FACE_TIERS[2].octaves, 'each tier adds octaves');
  for (const frag of [X.ROCKY_FRAG, X.GIANT_FRAG, X.HALO_FRAG]) {
    check(!/sampler2D|texture2D/.test(frag), 'no picture is sampled: the only texture is the noise lattice built at run time');
    check(/#include <tonemapping_fragment>/.test(frag) && /#include <colorspace_fragment>/.test(frag) && /#include <logdepthbuf_fragment>/.test(frag), 'the object\'s own material tone-maps, converts and writes the log depth');
  }
  check(!/city|night ?lights/i.test(X.ROCKY_FRAG), 'the night side has no city lights');
  check(!/EffectComposer|RenderPass|UnrealBloomPass|ShaderPass|BloomPass|LensflareElement/.test(src + read('site/js/scene/exostage.js')), 'no post-processing pass');
  check(!/TextureLoader|\.(png|jpg|jpeg|webp|ktx2)['"`]/.test(src), 'no texture file is fetched');
  // The uniforms a face fills are the uniforms its shader declares.
  for (const row of [rowOf('LHS 1140 b'), rowOf('HD 189733 b')]) {
    const f = X.faceFor(row);
    const u = X.faceUniforms(f);
    const frag = f.kind === 'giant' ? X.GIANT_FRAG : X.ROCKY_FRAG;
    for (const name of Object.keys(u)) check(new RegExp(`uniform [a-zA-Z0-9]+ ${name}\\b`).test(frag), `${f.kind}: the shader declares ${name}`);
    for (const m of frag.matchAll(/uniform [a-zA-Z0-9]+ (u[A-Za-z]+)/g)) check(m[1] in u, `${f.kind}: ${m[1]} is filled`);
    for (const [k, v] of Object.entries(u)) {
      if (k === 'uNoise') { check(v.value.isData3DTexture && v.value.image.data.length === 64 * 64 * 64 * 4, 'the noise lattice is 64 cubed, four channels, built here'); continue; }
      const flat = Array.isArray(v.value) ? v.value.flatMap((x) => x.toArray()) : v.value && v.value.toArray ? v.value.toArray() : v.value && v.value.elements ? [...v.value.elements] : [v.value];
      check(flat.every((x) => Number.isFinite(x)), `${f.kind}: ${k} is all numbers`);
    }
  }
  check(X.seaLevelFor(0) === 0 && X.seaLevelFor(0.7) > 0.5 && X.seaLevelFor(1) < 1, 'the sea level follows the share of the globe under water');
}

// --- 6. the wiring -------------------------------------------------------------------------------
{
  const main = read('site/js/main.js');
  const systems = read('site/js/scene/systems.js');
  const cards = read('site/js/ui/cards.js');
  check(!/from '\.\/scene\/exo(face|stage)\.js'/.test(main) && /import\('\.\/scene\/exostage\.js'\)/.test(main), 'main.js fetches the stage by dynamic import only');
  check(!/from '\.\/exoface\.js'/.test(systems) && /import\('\.\/exoface\.js'\)/.test(systems), 'scene/systems.js fetches the faces by dynamic import only');
  check(!/exoface|exostage/.test(read('site/js/embedlite.js')), 'the light embed never names it');
  check(/faceLineOf\(record\.id\)/.test(cards), 'the card asks whether the planet is drawn with a face');
  check(/latch\.latched\) dropFaces\(current, true\)/.test(systems), 'the frame latch puts the neutral balls back');
  const { KEYS } = await import(join(JS, 'ui/urlstate.js'));
  check(KEYS.includes('imagine'), 'the link key `imagine` is known, so the app\'s own writes keep it');
  // No faces in node (no document): the card's line for a system planet is the plain one.
  const S = await import(join(JS, 'scene/systems.js'));
  check(S.faceLineOf('exo-trappist-1-e') === null, 'no face drawn, no "Artist\'s impression" on the card');
  const css = read('site/css/exoface.css').replace(/\/\*[\s\S]*?\*\//g, '');
  check(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css), 'css/exoface.css uses tokens, no colour literal');
  const E = COPY.exoface;
  for (const k of ['another', 'back']) check(E[k].split(' ').length <= 4 && E[k].length <= 20, `button label: ${E[k]}`);
  for (const k of ['tag', 'surface', 'clouds', 'nothingMeasured', 'whole', 'stageLabel']) check(E[k].length <= 60 && !/!| -- /.test(E[k]), `chrome line: ${E[k]}`);
}

if (problems.length) {
  console.error(`exoface: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log('exoface ok: six known planets classed from the table\'s own rows, the Solar System placed by the same limits, TRAPPIST-1\'s seven faced; the same row the same face; the label made from the row and a forecast never printed as measured; 300 imagined worlds named as imagined; three tiers, one draw call on a phone, no texture and no post-processing; nothing at boot');
