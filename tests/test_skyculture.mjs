// tests/test_skyculture.mjs -- the sky from the ground, round two (internal #351, #352, #354 to #357,
// #383, #393): other peoples' figures, the IAU borders, the constellation pictures, meteors at a
// shower's rate, satellites in the air and the shadow, the kind of sky read off the night lights.
//
//   node tests/test_skyculture.mjs
//
// No browser: the pure halves of sky/skyculture.js, sky/meteors.js, sky/skyglow.js and
// scene/shadow.js against numbers a person can check, the data files against the script that
// writes them, and the licences against the notices they ask for.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const buf = (p) => { const b = readFileSync(join(ROOT, p)); return b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength); };
const DEG = Math.PI / 180;
const dir = (ra, dec) => [Math.cos(dec * DEG) * Math.cos(ra * DEG), Math.cos(dec * DEG) * Math.sin(ra * DEG), Math.sin(dec * DEG)];
const sep = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;

const { parseBounds, cultureFigures, cultureLabel, artQuad } = await import(join(ROOT, 'site/js/sky/skyculture.js'));
const { visibleRate, drawMagnitude, meteorPath, POPULATION_INDEX } = await import(join(ROOT, 'site/js/sky/meteors.js'));
const { darknessFromLights, lightsPixel, lightsValue, CITY_FROM, TOWN_FROM } = await import(join(ROOT, 'site/js/sky/skyglow.js'));
const { earthShadowLit, inEarthShadow } = await import(join(ROOT, 'site/js/scene/shadow.js'));
const { CULTURE_IDS } = await import(join(ROOT, 'site/js/sky/skymath.js'));
const { readSkyOptions, SKY_OPTION_DEFAULTS, SKY_OPTIONS_KEY } = await import(join(ROOT, 'site/js/sky/skyview.js'));
const { SHOWERS } = await import(join(ROOT, 'site/js/data/showers.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.later.js'));

// --- the files are what the script writes, and the licences are where they are owed ---------------
try { execFileSync('python3', [join(ROOT, 'scripts/build-skycultures.py'), '--check'], { stdio: 'pipe' }); }
catch (e) { check(false, `scripts/build-skycultures.py --check: ${String(e.stdout || e.message).trim()}`); }

// --- the borders ----------------------------------------------------------------------------------
const bounds = parseBounds(buf('site/data/constellation-bounds.bin'));
check(bounds.length % 6 === 0 && bounds.length / 6 > 3000 && bounds.length / 6 < 12000, `the borders are ${bounds.length / 6} segments; about 5 000 of a degree or less are expected`);
let longest = 0;
for (let i = 0; i < bounds.length; i += 6) longest = Math.max(longest, sep([bounds[i], bounds[i + 1], bounds[i + 2]], [bounds[i + 3], bounds[i + 4], bounds[i + 5]]));
check(longest <= 1.05, `a border segment is ${longest.toFixed(2)} degrees long: over a degree it would cut the corner of a curved border`);
// Betelgeuse is in Orion and Aldebaran in Taurus, so the arc between them crosses a border: some
// border vertex is within a segment's length of that arc. And Orion's belt is well inside Orion.
const slerp = (p, q, k) => { const v = [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k, p[2] + (q[2] - p[2]) * k]; const n = Math.hypot(...v); return v.map((x) => x / n); };
const nearestBorder = (p) => { let best = 9; for (let i = 0; i < bounds.length; i += 3) best = Math.min(best, sep(p, [bounds[i], bounds[i + 1], bounds[i + 2]])); return best; };
let crossing = 9;
for (let k = 0; k <= 1; k += 1 / 80) crossing = Math.min(crossing, nearestBorder(slerp(dir(88.793, 7.407), dir(68.98, 16.509), k)));
check(crossing < 0.6, `no border crosses the way from Betelgeuse to Aldebaran (nearest vertex ${crossing.toFixed(2)} degrees)`);
check(nearestBorder(dir(84.05, -1.2)) > 3, 'a border runs within 3 degrees of Orion\'s belt, which is in the middle of Orion');
check(statSync(join(ROOT, 'site/data/constellation-bounds.bin')).size < 40000, 'the borders file is under 40 kB');

// --- the pictures -----------------------------------------------------------------------------------
const art = JSON.parse(read('site/data/skyart/index.json'));
check(art.author === 'Johan Meuris' && /Free Art License/.test(art.licence) && /artlibre\.org/.test(art.licenceUrl), 'the pictures\' index names their author and their licence');
const pictures = readdirSync(join(ROOT, 'site/data/skyart')).filter((f) => f.endsWith('.webp'));
const artBytes = pictures.reduce((n, f) => n + statSync(join(ROOT, 'site/data/skyart', f)).size, 0);
check(pictures.length === 85 && artBytes < 2_500_000, `${pictures.length} pictures, ${artBytes} bytes: 85 inside 2.5 MB are expected`);
const orion = art.figures.find((f) => f.id === 'Ori');
const quad = orion && artQuad(orion, 8);
check(!!quad, 'Orion has a picture and three stars to pin it by');
if (quad) {
  // The three anchors land on their stars: a vertex of the grid nearest each anchor's (u, v) is within
  // the grid's own step of that star, and the picture's centre is in Orion.
  for (const [u, v, ra, dec] of orion.anchors) {
    const i = Math.round(u * 8);
    const j = Math.round(v * 8);
    const k = (j * 9 + i) * 3;
    const p = [quad.positions[k], quad.positions[k + 1], quad.positions[k + 2]];
    check(sep(p, dir(ra, dec)) < 2.5, `Orion's picture: the grid point nearest an anchor is ${sep(p, dir(ra, dec)).toFixed(2)} degrees from its star`);
  }
  check(sep(quad.centre, dir(83.8, 3)) < 6, `Orion's picture is centred ${sep(quad.centre, dir(83.8, 3)).toFixed(1)} degrees from Orion`);
  check(quad.radiusRad / DEG > 8 && quad.radiusRad / DEG < 25, `Orion's picture is ${(quad.radiusRad / DEG).toFixed(1)} degrees from centre to corner`);
  check(quad.index.length === 8 * 8 * 6 && quad.uvs.length === 81 * 2, 'a picture is an 8 by 8 grid');
}
// An exact check of the mapping: a picture whose anchors are three of its corners puts the fourth
// corner on the line through the plane of the three, and each anchor exactly on its star.
const flat = artQuad({ anchors: [[0, 0, 10, 10], [1, 0, 20, 10], [0, 1, 10, 0]] }, 2);
check(sep([flat.positions[0], flat.positions[1], flat.positions[2]], dir(10, 10)) < 0.05, 'an anchor at a corner is on its star');
check(sep([flat.positions[6], flat.positions[7], flat.positions[8]], dir(20, 10)) < 0.05, 'and so is the second');
check(artQuad({ anchors: [[0, 0, 1, 1], [0.5, 0.5, 2, 2], [1, 1, 3, 3]] }) === null, 'three anchors in a line pin nothing: no picture, not a wrong one');
for (const f of art.figures) check(!!artQuad(f), `${f.id}: the picture cannot be pinned by its three stars`);
const notice = read('site/data/skyart/LICENSE.txt');
for (const needle of ['Johan Meuris', 'Free Art License', 'https://artlibre.org/licence/lal/en/', 're-encoded', 'Originals:']) check(notice.includes(needle), `data/skyart/LICENSE.txt does not say "${needle}"`);

// --- the cultures -----------------------------------------------------------------------------------
check(CULTURE_IDS[0] === 'western' && CULTURE_IDS.length >= 3, 'the western figures and at least two more peoples\' skies');
const registry = read('registry/skycultures.yaml');
const K = COPY.tonight.skybar;
for (const id of CULTURE_IDS) {
  check(new RegExp(`^  - id: ${id}$`, 'm').test(registry), `registry/skycultures.yaml has no row for ${id}`);
  check(typeof K.cultures[id] === 'string' && typeof K.cultureNotes[id] === 'string' && typeof K.cultureCredits[id] === 'string', `the controls have no name, note and credit for ${id}`);
  if (id === 'western') continue;
  const doc = JSON.parse(read(`site/data/skycultures/${id}.json`));
  check(doc.licence === 'CC BY-SA 4.0', `${id}: the file says ${doc.licence}; only CC BY-SA 4.0 cultures are shipped`);
  check(/CC BY-SA 4\.0/.test(K.cultureCredits[id]) && /Stellarium/.test(K.cultureCredits[id]), `${id}: the credit in the controls names Stellarium and the licence`);
  const f = cultureFigures(doc);
  check(f.verts.length % 6 === 0 && f.verts.length > 0 && f.names.length === doc.figures.length, `${id}: every figure has lines and a name`);
  for (let i = 0; i < f.verts.length; i += 3) {
    const n = Math.hypot(f.verts[i], f.verts[i + 1], f.verts[i + 2]);
    if (!near(n, 1, 1e-6)) { check(false, `${id}: a line end is not a direction`); break; }
  }
}
check((registry.match(/^  - id: /gm) || []).length === CULTURE_IDS.length, 'registry/skycultures.yaml and sky/skymath.js CULTURE_IDS list the same cultures');
// The Chinese Net (毕宿) is the Hyades: its name is drawn within a few degrees of Aldebaran.
const chinese = cultureFigures(JSON.parse(read('site/data/skycultures/chinese.json')));
const net = chinese.names.find((n) => n.name.startsWith('毕宿'));
check(net && sep(net.dir, dir(68.98, 16.51)) < 6, 'the Chinese Net is at the Hyades');
check(cultureLabel({ name: 'Net', native: '毕宿' }) === '毕宿 Net', 'a name in another script is drawn with its English beside it');
check(cultureLabel({ name: 'The Great Boat of Tama Rereti', native: 'Te-Waka-o-Tama-Rereti' }) === 'Te-Waka-o-Tama-Rereti', 'a name in Latin letters is drawn as the people write it');
check(cultureLabel({ name: 'Orion' }) === 'Orion', 'a figure with one name keeps it');
// A living tradition, said so: every culture but the western one says whose reading it is.
for (const id of CULTURE_IDS.slice(1)) check(/living|still/.test(K.cultureNotes[id]), `${id}: the note does not say the tradition is a living one`);

// --- meteors ----------------------------------------------------------------------------------------
check(near(visibleRate({ zhr: 100, radiantAltDeg: 90, limitMag: 6.5 }), 100, 1e-9), 'the ZHR is what is seen with the radiant overhead under a 6.5 sky');
check(near(visibleRate({ zhr: 100, radiantAltDeg: 30, limitMag: 6.5 }), 50, 1e-9), 'half of it with the radiant 30 degrees up');
check(near(visibleRate({ zhr: 100, radiantAltDeg: 90, limitMag: 5.5 }), 100 / POPULATION_INDEX, 1e-9), 'a magnitude of sky lost divides it by the population index');
check(visibleRate({ zhr: 100, radiantAltDeg: -5, limitMag: 6.5 }) === 0 && visibleRate({ zhr: 0, radiantAltDeg: 50, limitMag: 6.5 }) === 0, 'none with the radiant down, none from no shower');
check(visibleRate({ zhr: 150, radiantAltDeg: 60, limitMag: 4.0 }) < 15, 'a city sees a tenth of the Geminids');
check(near(drawMagnitude(6.5, 1), 6.5, 1e-9) && drawMagnitude(6.5, 0.01) < 2, 'most meteors are at the limit; one in a hundred is five magnitudes brighter');
const radiant = [0, 1, 0];
const start = [Math.sin(60 * DEG), Math.cos(60 * DEG), 0]; // 60 degrees from an overhead radiant, 30 up
const path = meteorPath(radiant, start, 35);
check(path && near(sep(path.from, path.to), path.lengthDeg, 1e-6), 'a track is as long as it says');
check(path && sep(radiant, path.to) > sep(radiant, path.from), 'a meteor runs away from its radiant');
check(path && near(path.seconds, 22 / 35, 1e-9), 'falling straight down through 22 km at 35 km/s takes 0.63 s');
check(path && path.lengthDeg > 3 && path.lengthDeg < 12, `a Geminid 60 degrees from the radiant is ${path && path.lengthDeg.toFixed(1)} degrees long`);
const nearRadiant = meteorPath(radiant, [Math.sin(10 * DEG), Math.cos(10 * DEG), 0], 35);
check(nearRadiant && nearRadiant.lengthDeg < path.lengthDeg, 'a meteor near the radiant is foreshortened');
check(meteorPath(radiant, [Math.sin(1 * DEG), Math.cos(1 * DEG), 0], 35) === null, 'one coming straight at the watcher is not a streak');
for (const sh of SHOWERS) check(sh.v_kms >= 11 && sh.v_kms <= 72, `${sh.id}: an entry speed of ${sh.v_kms} km/s is not one a meteor can have`);
const meteorsJs = read('site/js/sky/meteors.js');
check(/prefers-reduced-motion/.test(meteorsJs) && /reducedMotion/.test(read('site/js/sky/groundsky.js').split('function askMeteors')[1].slice(0, 200)), 'no meteors are drawn under reduced motion');
check(/illustrat/i.test(K.meteorHonest), 'the controls say the streaks are illustrative');

// --- satellites in the same air, and in the shadow ---------------------------------------------------
const E = { x: 0, y: 0, z: 0 };
const SUN = { x: 1e8, y: 0, z: 0 };
check(earthShadowLit({ x: 7000, y: 0, z: 0 }, E, SUN, 6371) === 1, 'on the Sun\'s side: lit');
check(earthShadowLit({ x: -7000, y: 0, z: 0 }, E, SUN, 6371) === 0, 'straight behind the Earth: dark');
check(near(earthShadowLit({ x: -7000, y: 6371, z: 0 }, E, SUN, 6371), 0.5, 1e-6), 'on the edge of the cylinder: half the Sun');
const band = 7000 * 0.00465;
check(earthShadowLit({ x: -7000, y: 6371 + band * 1.01, z: 0 }, E, SUN, 6371) === 1 && earthShadowLit({ x: -7000, y: 6371 - band * 1.01, z: 0 }, E, SUN, 6371) === 0, `the penumbra is ${(2 * band).toFixed(0)} km deep at 7 000 km`);
let prev = 0; let rising = true;
for (let y = 6371 - band; y <= 6371 + band; y += band / 10) { const v = earthShadowLit({ x: -7000, y, z: 0 }, E, SUN, 6371); if (v < prev) rising = false; prev = v; }
check(rising, 'through the penumbra the light only grows');
for (const p of [{ x: -7000, y: 100, z: 0 }, { x: -7000, y: 9000, z: 0 }, { x: 7000, y: 0, z: 0 }]) check((earthShadowLit(p, E, SUN, 6371) === 0) === inEarthShadow(p, E, SUN, 6371), 'away from the edge the fade and the hard test agree');
const glyphs = read('site/js/scene/glyphs.js');
check(/uniform float uSky/.test(glyphs) && /airRefractionDeg\( altDeg \)/.test(glyphs) && /airMass\(/.test(glyphs) && /GLSL_AIR/.test(glyphs), 'the dots are lifted and dimmed by the formulas the stars use (sky/skymath.js GLSL_AIR)');
check(/setSky\(up\)/.test(glyphs) && /skyGlyphs\(false\)/.test(read('site/js/sky/skyview.js')), 'the view from the ground hands the dots back when it closes');

// --- how dark the sky is ----------------------------------------------------------------------------
check(darknessFromLights(0.93) === 'city' && darknessFromLights(0.3) === 'town' && darknessFromLights(0.02) === 'dark' && darknessFromLights(NaN) === null, 'three kinds of sky from the lights, and none from no reading');
check(darknessFromLights(CITY_FROM) === 'city' && darknessFromLights(TOWN_FROM) === 'town', 'the thresholds belong to the brighter side');
const px = lightsPixel(51.5, 0, 4096, 2048);
check(px.x === 2048 && px.y === 438, `Greenwich is pixel ${px.x}, ${px.y} of a 4096 x 2048 map`);
check(lightsPixel(0, 180, 4096, 2048).x === 0 && lightsPixel(-90, 0, 4096, 2048).y === 2047, 'the date line wraps and the pole is clamped');
check(near(lightsValue([0, 0, 0, 0, 255, 0, 0, 0, 0]), 0.5, 1e-9) && near(lightsValue([255, 255, 255, 255, 255, 255, 255, 255, 255]), 1, 1e-9), 'half the pixel, half its ring');
check(SKY_OPTION_DEFAULTS.darknessBy === 'place' && SKY_OPTION_DEFAULTS.culture === 'western' && SKY_OPTION_DEFAULTS.art === false && SKY_OPTION_DEFAULTS.meteors === true, 'the defaults: the map chooses the sky, western figures, no pictures until asked, meteors on');
const store = (v) => ({ getItem: (k) => (k === SKY_OPTIONS_KEY ? JSON.stringify(v) : null) });
check(readSkyOptions(store({ darkness: 'city' })).darknessBy === 'you', 'a kind of sky chosen before there was a map is still the visitor\'s choice');
check(readSkyOptions(store({ darkness: 'dark' })).darknessBy === 'place', 'the old default is not a choice');
check(readSkyOptions(store({ culture: 'klingon', darknessBy: 'nobody' })).culture === 'western' && readSkyOptions(store({ culture: 'maori' })).culture === 'maori', 'an unknown culture is the western one');
check(/sampleNightLights/.test(read('site/js/sky/skyview.js')) && !/fetch\(/.test(read('site/js/sky/skyglow.js').replace(/await fetch\(url\)/, '')), 'the place is never sent anywhere: one fetch, of the site\'s own map');

// --- the small things -------------------------------------------------------------------------------
const { tonightWords } = await import(join(ROOT, 'site/js/sky/tonight.js'));
const words = tonightWords({ observer: { name: 'Use my location', latDeg: 10, lonDeg: 10, source: 'geolocation' }, nowMs: Date.UTC(2026, 9, 6), ready: true, pass: null, later: null, dark: null });
check(words.place === COPY.tonight.placeMine && !/Use my location/.test(words.place), `a place the browser gave is "${words.place}"`);
check(typeof COPY.sky.lines.poleNorth === 'string' && typeof COPY.sky.lines.poleSouth === 'string', 'the pole of the sky has a name on either side of the equator');
const ground = read('site/js/sky/groundsky.js');
check(/sr-skyeyepiece/.test(ground) && /\.sr-skyeyepiece/.test(read('site/css/ui.css')), 'a telescope\'s field is seen through an eyepiece circle');
check(/whatAt/.test(ground) && /tapSky/.test(read('site/js/main.js')), 'a tap on the sky asks what is there');

if (problems.length) {
  console.error('sky culture FAILED:');
  for (const p of problems) console.error('  ' + p);
  process.exit(1);
}
console.log(`sky culture ok: ${bounds.length / 6} border segments none over a degree, ${pictures.length} pictures in ${artBytes} bytes pinned by three stars each, ${CULTURE_IDS.length} skies with their credits, a shower's rate from its ZHR, the radiant's height and the sky, a penumbra ${(2 * band).toFixed(0)} km deep, three kinds of sky from the night lights`);
