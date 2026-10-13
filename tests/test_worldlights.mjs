// Planets and moons shine by their real brightness (spec 0072 requirement 1, scene/worldlights.js):
// the magnitudes against published ones, the fade with the disc's size, the stars' own sprite, and
// the lights in a headless scene from the Earth, from Mars and close to Jupiter.
// Run: node tests/test_worldlights.mjs
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const L = await import(join(JS, 'scene/worldlights.js'));
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { STAR_LIGHT_GLSL } = await import(join(JS, 'scene/stretch.js'));
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const table = [];
const DEG = Math.PI / 180;
const KM_PER_AU = Astronomy.KM_PER_AU;

// --- 1. the planets, from the Earth, against published magnitudes (within 0.3) ------------------
// The geometry (Sun distance, Earth distance, phase angle) is astronomy-engine's for the date; the
// magnitude is ours. Saturn's and Uranus's tilts use the poles Skyfield's magnitudelib.py prints
// (ICRF unit vectors), so the test does not lean on the scene's own orientation code.
const POLE = { saturn: [0.08547883, 0.07323576, 0.99364475], uranus: [-0.21199958, -0.94155916, -0.26176809] };
const subLat = (pole, v) => Math.acos((pole[0] * v.x + pole[1] * v.y + pole[2] * v.z) / Math.hypot(v.x, v.y, v.z)) / DEG - 90;
function fromEarth(id, iso) {
  const date = new Date(iso);
  const body = Astronomy.Body[id[0].toUpperCase() + id.slice(1)];
  const il = Astronomy.Illumination(body, date);
  const opts = { year: date.getUTCFullYear() };
  if (POLE[id]) {
    const sunToPlanet = Astronomy.HelioVector(body, date);
    const obsToPlanet = Astronomy.GeoVector(body, date, false);
    opts.subSunLatDeg = subLat(POLE[id], sunToPlanet);
    opts.subObsLatDeg = subLat(POLE[id], obsToPlanet);
  }
  return { mag: L.planetMagnitude(id, il.helio_dist, il.geo_dist, il.phase_angle, opts), il, opts };
}
const PUBLISHED = [
  // id, date, published magnitude, what, where it is published
  ['venus', '2025-02-16T12:00:00Z', -4.75, 'Venus at greatest brilliancy (published -4.6 to -4.9)'],
  ['jupiter', '2022-09-26T20:00:00Z', -2.9, 'Jupiter at the opposition of 2022'],
  ['mars', '2003-08-28T18:00:00Z', -2.9, 'Mars at the close opposition of 2003'],
  ['mars', '2019-09-02T11:00:00Z', 1.8, 'Mars near the conjunction of 2019'],
  ['saturn', '2017-06-15T10:00:00Z', 0.0, 'Saturn at opposition, rings open 26.6 degrees (rings in: equation 10)'],
  ['saturn', '2025-09-21T06:00:00Z', 0.6, 'Saturn at opposition, rings 1.8 degrees from edge on (rings in: equation 10)'],
  ['mercury', '2025-03-08T06:00:00Z', -0.4, 'Mercury at its greatest eastern elongation of March 2025'],
  ['uranus', '2024-11-17T03:00:00Z', 5.6, 'Uranus at the opposition of 2024 (about +5.7)'],
  ['neptune', '2024-09-21T00:00:00Z', 7.8, 'Neptune at the opposition of 2024'],
];
for (const [id, iso, published, what] of PUBLISHED) {
  const { mag, il } = fromEarth(id, iso);
  table.push(`${what}: ${mag.toFixed(2)} (published ${published > 0 ? '+' : ''}${published})`);
  check(Math.abs(mag - published) <= 0.3, `${what}: computed ${mag.toFixed(2)}, published ${published}, at r ${il.helio_dist.toFixed(3)} au, d ${il.geo_dist.toFixed(3)} au, phase ${il.phase_angle.toFixed(1)} deg`);
}
// Venus really is in the glare tier and Jupiter is not far into it; Sirius (-1.46) has none.
{
  const venus = L.starSprite(fromEarth('venus', '2025-02-16T12:00:00Z').mag);
  const jupiter = L.starSprite(fromEarth('jupiter', '2022-09-26T20:00:00Z').mag);
  const sirius = L.starSprite(-1.46);
  check(venus.glare > 0.4 && venus.glow === 1 && venus.alpha === 1, `Venus has the glare a star past -1.5 has: ${JSON.stringify(venus)}`);
  check(jupiter.glow === 1 && jupiter.glare > 0 && jupiter.glare < venus.glare, 'Jupiter has the full glow and less glare than Venus');
  check(sirius.glare === 0 && venus.sizePx > jupiter.sizePx && jupiter.sizePx > sirius.sizePx, `Venus is drawn larger than Jupiter and Jupiter than Sirius: ${venus.sizePx.toFixed(1)}, ${jupiter.sizePx.toFixed(1)}, ${sirius.sizePx.toFixed(1)} px`);
}
// Without the tilt Saturn is the globe alone, and that is fainter than with the rings open.
{
  const s = fromEarth('saturn', '2017-06-15T10:00:00Z');
  const globe = L.planetMagnitude('saturn', s.il.helio_dist, s.il.geo_dist, s.il.phase_angle);
  check(globe > s.mag + 0.5 && globe < s.mag + 1.3, `Saturn's globe alone is ${globe.toFixed(2)}, with rings ${s.mag.toFixed(2)}`);
  const far = L.planetMagnitude('saturn', 9.5, 9.5, 60, s.opts);
  check(Number.isFinite(far), 'Saturn at a phase angle the Earth never sees is the globe alone, not NaN');
}
// Every polynomial stays finite and gets fainter towards the back, out to 180 degrees.
for (const id of ['mercury', 'venus', 'earth', 'mars', 'jupiter', 'saturn', 'uranus', 'neptune']) {
  let ok = true;
  for (let a = 0; a <= 180; a += 1) if (!Number.isFinite(L.planetMagnitude(id, 1, 1, a))) ok = false;
  check(ok, `${id}: finite at every phase angle`);
  check(L.planetMagnitude(id, 1, 1, 120) > L.planetMagnitude(id, 1, 1, 10), `${id}: fainter at 120 degrees than at 10`);
  check(Math.abs(L.planetMagnitude(id, 2, 3, 20) - L.planetMagnitude(id, 1, 1, 20) - 5 * Math.log10(6)) < 1e-9, `${id}: the inverse squares of both distances`);
}
check(Number.isNaN(L.planetMagnitude('sun', 1, 1, 0)) && Number.isNaN(L.apparentMagnitude('sun', { rKm: 1, dKm: 1, alphaDeg: 0 })), 'the Sun is not part of this');

// --- 2. the Moon from the Earth, and the Earth and the Moon from Mars ---------------------------
{
  const date = new Date('2025-01-13T22:27:00Z'); // a full Moon that is not an eclipse
  const il = Astronomy.Illumination(Astronomy.Body.Moon, date);
  const mag = L.apparentMagnitude('moon', { rKm: il.helio_dist * KM_PER_AU, dKm: il.geo_dist * KM_PER_AU, alphaDeg: il.phase_angle });
  table.push(`the full Moon of 2025-01-13 from the Earth: ${mag.toFixed(2)} (published -12.7)`);
  check(Math.abs(mag - -12.7) <= 0.3, `the full Moon: ${mag.toFixed(2)}`);
  const quarter = L.moonMagnitude(1, 384400, 90);
  check(quarter > -10.6 && quarter < -9.6, `the quarter Moon is about -10, a tenth of the full one: ${quarter.toFixed(2)}`);
}
{
  // The day in 2026 to 2028 on which the Earth stands farthest from the Sun in Mars's sky.
  let best = null;
  for (let day = 0; day < 1000; day += 2) {
    const date = new Date(Date.UTC(2026, 0, 1) + day * 86400e3);
    const e = Astronomy.HelioVector(Astronomy.Body.Earth, date);
    const m = Astronomy.HelioVector(Astronomy.Body.Mars, date);
    const toSun = { x: -m.x, y: -m.y, z: -m.z };
    const toEarth = { x: e.x - m.x, y: e.y - m.y, z: e.z - m.z };
    const d = Math.hypot(toEarth.x, toEarth.y, toEarth.z);
    const elong = Math.acos((toSun.x * toEarth.x + toSun.y * toEarth.y + toSun.z * toEarth.z) / (Math.hypot(m.x, m.y, m.z) * d)) / DEG;
    if (!best || elong > best.elong) {
      const r = Math.hypot(e.x, e.y, e.z);
      // the phase angle: Sun, Earth, Mars
      const alpha = Math.acos((-e.x * (m.x - e.x) - e.y * (m.y - e.y) - e.z * (m.z - e.z)) / (r * d)) / DEG;
      best = { elong, date, r, d, alpha };
    }
  }
  const earth = L.apparentMagnitude('earth', { rKm: best.r * KM_PER_AU, dKm: best.d * KM_PER_AU, alphaDeg: best.alpha });
  const moon = L.apparentMagnitude('moon', { rKm: best.r * KM_PER_AU, dKm: best.d * KM_PER_AU, alphaDeg: best.alpha });
  table.push(`the Earth from Mars at its greatest elongation (${best.elong.toFixed(0)} degrees, ${best.date.toISOString().slice(0, 10)}): ${earth.toFixed(2)} (published about -1 to -2.5), the Moon beside it ${moon.toFixed(2)}`);
  check(earth <= -1 && earth >= -2.6, `the Earth from Mars at ${best.elong.toFixed(1)} degrees of elongation: ${earth.toFixed(2)}`);
  check(moon > earth + 2.5 && moon < earth + 5.5 && moon < 6.5, `the Moon beside it is a star an eye could see: ${moon.toFixed(2)}`);
}

// --- 3. the moons and Pluto: a Lambert sphere of the registry's albedo ---------------------------
check(L.lambertPhase(0) === 1 && Math.abs(L.lambertPhase(Math.PI / 2) - 1 / Math.PI) < 1e-12 && L.lambertPhase(Math.PI) < 1e-12, 'the Lambert phase function: 1 face on, 1/pi at the quarter, 0 from behind');
check(L.reflectedMagnitude(1000, 0.5, 1, 1e8, 180) === Infinity, 'from exactly behind there is no light, and no NaN');
check(Math.abs(L.SUN_APPARENT_MAG - -26.74) < 0.01, `the Sun at 1 au is ${L.SUN_APPARENT_MAG.toFixed(3)}`);
const MOONS = [
  // id, Sun distance au, observer distance au, published mean opposition magnitude
  ['io', 5.2, 4.2, 5.0], ['europa', 5.2, 4.2, 5.3], ['ganymede', 5.2, 4.2, 4.6], ['callisto', 5.2, 4.2, 5.7],
  ['titan', 9.55, 8.55, 8.3], ['rhea', 9.55, 8.55, 9.7], ['triton', 30.07, 29.07, 13.5], ['pluto', 39.5, 38.5, 15.1],
];
for (const [id, r, d, published] of MOONS) {
  const mag = L.apparentMagnitude(id, { rKm: r * KM_PER_AU, dKm: d * KM_PER_AU, alphaDeg: 0 });
  table.push(`${id} at a mean opposition (Lambert sphere): ${mag.toFixed(2)} (published about ${published})`);
  check(Math.abs(mag - published) <= 0.6, `${id} as a Lambert sphere at opposition: ${mag.toFixed(2)}, published about ${published}`);
}
{
  const yaml = readFileSync(join(ROOT, 'registry/worlds.yaml'), 'utf8');
  for (const [id, p] of Object.entries(L.GEOMETRIC_ALBEDO)) {
    const row = new RegExp(`\\n  - id: ${id}\\n[\\s\\S]*?\\n      albedo: \\{[^\\n]*says: "([^"]*)"`).exec(yaml);
    if (!row) { problems.push(`${id}: registry/worlds.yaml has no facts.albedo for it`); continue; }
    const said = (row[1].match(/\d+(?:\.\d+)?/g) || []).map(Number);
    const ok = id === 'iapetus' ? Math.abs(p - (0.05 + 0.5) / 2) < 1e-9 && said.includes(0.05) && said.includes(0.5) : said.includes(p);
    check(ok, `${id}: the albedo here is ${p} and the registry's page says "${row[1]}"`);
  }
}

// --- 4. the fade with the disc's size ---------------------------------------------------------------
{
  const [full, none] = L.LIGHT_FADE_PX;
  check(full === 8 && none === 16, `the light fades between 8 and 16 px of disc: ${full}, ${none}`);
  check(L.discFade(0) === 1 && L.discFade(7.6) === 1 && L.discFade(8) === 1, 'full light at 8 px and under');
  check(L.discFade(16) === 0 && L.discFade(40) === 0 && L.discFade(1e6) === 0, 'none at 16 px and over');
  let last = 1;
  let falls = true;
  for (let px = 8; px <= 16; px += 0.05) { const v = L.discFade(px); if (v > last + 1e-12 || v < 0 || v > 1) falls = false; last = v; }
  check(falls && Math.abs(L.discFade(12) - 0.5) < 1e-12, 'monotonic between, half at 12 px');
  check(L.discCover(0.02, 0.003, 0.01) === 1 && L.discCover(0.005, 0.003, 0.01) === 0 && Math.abs(L.discCover(0.01, 0.003, 0.01) - 0.5) < 1e-9, 'a world behind a nearer disc loses its light with the share of it that is hidden');
}

// --- 5. the stars' own sprite ---------------------------------------------------------------------
{
  const stars = readFileSync(join(JS, 'scene/stars3d.js'), 'utf8');
  for (const piece of ['( 6.5 - m ) / 8.0', '1.0 + 5.0 * pow( tt, 1.6 )', '( -1.5 - m ) / 6.0', '( 2.5 - m ) / 4.0', 'core *= 1.0 + 0.8 * glow', 'core * ( 1.0 + 4.0 * glow ) + 26.0 * glare', '( 0.35 + 0.65 * tt )', 'a = max( a, vGlare * 0.8 * e * e )', 'mix( vColour, vec3( 1.0 ), 0.4 * light.x * max( vGlow, vGlare ) )']) {
    check(stars.includes(piece), `scene/stars3d.js no longer says "${piece}": starSprite() in scene/worldlights.js is its twin and must follow`);
  }
  // The same numbers, worked by hand from that shader for three magnitudes.
  const near = (a, b) => Math.abs(a - b) < 1e-9;
  const v = L.starSprite(-4.5);
  check(near(v.sizePx, 6 * 1.8 * 5 + 26 * 0.5) && near(v.core, 10.8 / 67) && v.glow === 1 && near(v.glare, 0.5) && v.alpha === 1, `a star of -4.5: ${JSON.stringify(v)}`);
  const f = L.starSprite(4.5);
  check(near(f.sizePx, 1 + 5 * Math.pow(0.25, 1.6)) && f.core === 1 && f.glow === 0 && f.glare === 0 && near(f.alpha, 0.35 + 0.65 * 0.25), `a star of 4.5: ${JSON.stringify(f)}`);
  check(L.starSprite(7.8, 7.5).alpha === 0 && L.starSprite(7.0, 6.5).alpha === 0 && L.starSprite(7.0, 7.5).alpha > 0, 'nothing past the exposure\'s faintest star');
  check(L.starSprite(NaN).alpha === 0 && L.starSprite(Infinity).alpha === 0, 'no magnitude, no light');
  const src = readFileSync(join(JS, 'scene/worldlights.js'), 'utf8');
  check(src.includes('${STAR_LIGHT_GLSL}') && L.WORLDLIGHT_FRAG.includes(STAR_LIGHT_GLSL) && /starLight\( d, vCore, vGlow \)/.test(L.WORLDLIGHT_FRAG), 'the fragment shader draws with the stars\' own starLight()');
  check(L.WORLDLIGHT_FRAG.includes('a = max( a, vGlare * 0.8 * e * e )') && L.WORLDLIGHT_FRAG.includes('mix( vColour, vec3( 1.0 ), 0.4 * light.x * max( vGlow, vGlare ) )'), 'and the same glare and the same white core');
  check(!/spike/i.test(L.WORLDLIGHT_FRAG + L.WORLDLIGHT_VERT), 'no diffraction spikes');
  for (const word of ['EffectComposer', 'RenderPass', 'BloomPass', 'ShaderPass', 'LensflareElement', 'WebGLRenderTarget', 'OrthographicCamera']) check(!src.includes(word), `scene/worldlights.js names ${word}`);
  check((src.match(/new THREE\.Points\(/g) || []).length === 1 && /blending: THREE\.AdditiveBlending/.test(src), 'one Points, additive: one draw call');
  check(/depthTest: true/.test(src) && /depthWrite: false/.test(src) && L.WORLDLIGHT_VERT.includes('#include <logdepthbuf_vertex>') && L.WORLDLIGHT_FRAG.includes('#include <logdepthbuf_fragment>'), 'depth-tested in the logarithmic buffer, writing none');
}

// --- 6. in a scene, without a browser ---------------------------------------------------------------
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createWorlds } = await import(join(JS, 'scene/worlds.js'));
  const tMs = Date.parse('2025-02-16T12:00:00Z');
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(45, 1440 / 900, 1e-5, 1e9);
  const renderer = { domElement: { clientHeight: 900, height: 900 }, getPixelRatio: () => 1 };
  const worlds = createWorlds(scene, { textureBase: null, camera });
  const lights = L.createWorldLights({ scene, worlds, camera, renderer });
  const look = (stageId, pos) => {
    stage.setWorld(stageId);
    stage.setTime(tMs);
    camera.position.set(pos[0], pos[1], pos[2]);
    camera.lookAt(0, 0, 0);
    camera.updateMatrixWorld(true);
    worlds.update(tMs);
    worlds.update(tMs); // the crowding pre-pass reads the camera: twice, as two frames would
    return lights.update(tMs);
  };

  // From the Earth, 25 000 km out: Venus at its computed magnitude from HERE, on its drawn disc.
  let count = look('earth', [0, 8, 25]);
  let s = lights.state();
  const almanac = fromEarth('venus', '2025-02-16T12:00:00Z').mag;
  check(count >= 8 && lights.points.visible, `from the Earth ${count} worlds have a light`);
  check(s.venus && Math.abs(s.venus.mag - almanac) < 0.05 && s.venus.fade === 1 && s.venus.discPx < 8, `Venus from a camera 26 000 km from the Earth is the almanac's Venus (${almanac.toFixed(2)}): ${JSON.stringify(s.venus)}`);
  check(s.jupiter && s.jupiter.mag < -2 && s.jupiter.mag > -3 && s.mars && s.saturn && s.saturn.mag > 0 && s.saturn.mag < 1.6, `Jupiter and Saturn too: ${s.jupiter && s.jupiter.mag.toFixed(2)}, ${s.saturn && s.saturn.mag.toFixed(2)}`);
  check(!s.earth, 'the stage\'s own world, filling the view, has none');
  check(s.neptune && s.neptune.alpha === 0, 'Neptune is past the faintest star drawn and has none');
  check(s.io && s.io.mag > 4 && s.io.mag < 6.5, `Io is a faint star beside Jupiter: ${s.io && s.io.mag.toFixed(2)}`);
  table.push(`in the scene, from 26 000 km above the Earth on 2025-02-16: Venus ${s.venus.mag.toFixed(2)}, Jupiter ${s.jupiter.mag.toFixed(2)}, Mars ${s.mars.mag.toFixed(2)}, Saturn ${s.saturn.mag.toFixed(2)}, the Moon ${s.moon ? s.moon.mag.toFixed(2) : 'a disc'}`);
  // The sprite sits on the line from the camera to the drawn disc, a little nearer than its centre.
  {
    const p = lights.points.geometry.attributes.position.array;
    const cam = camera.getWorldPosition(new THREE.Vector3());
    let onDisc = 0;
    for (const id of ['venus', 'jupiter', 'mars']) {
      const drawn = worlds.drawnPositionOf(id).sub(cam);
      const r = worlds.drawnRadiusUnits(id);
      for (let i = 0; i < count; i++) {
        const v = new THREE.Vector3(p[i * 3], p[i * 3 + 1], p[i * 3 + 2]).sub(cam);
        if (v.angleTo(drawn) < 1e-5 && v.length() < drawn.length() - r && v.length() > drawn.length() - 1.2 * r) onDisc += 1;
      }
    }
    check(onDisc === 3, `each light is on its own drawn disc, just in front of it (${onDisc} of 3)`);
  }
  // Hidden behind the Earth: the camera on the far side from Venus.
  {
    const dir = worlds.drawnPositionOf('venus').normalize();
    look('earth', [-dir.x * 20, -dir.y * 20, -dir.z * 20]);
    const hidden = lights.state().venus;
    check(hidden && hidden.cover === 0 && hidden.alpha === 0, `Venus behind the Earth throws no light past its limb: ${JSON.stringify(hidden)}`);
  }
  // The exposure's limit.
  lights.setMagLimit(-3);
  look('earth', [0, 8, 25]);
  check(lights.state().jupiter.alpha === 0 && lights.state().venus.alpha > 0, 'the faintest magnitude drawn is the exposure\'s');
  lights.setMagLimit(7.5);

  // From Mars: the Earth is a bright star with the Moon beside it.
  count = look('mars', [0, 4, 14]);
  s = lights.state();
  check(s.earth && s.earth.mag < 0 && s.earth.mag > -2.7 && s.earth.fade === 1, `the Earth from Mars: ${JSON.stringify(s.earth)}`);
  check(s.moon && s.moon.mag > s.earth.mag + 2.5 && s.moon.mag < 6.5 && s.moon.alpha > 0, `and the Moon beside it: ${JSON.stringify(s.moon)}`);
  check(!s.mars, 'Mars itself has none');
  table.push(`in the scene, from Mars on 2025-02-16: the Earth ${s.earth.mag.toFixed(2)}, the Moon ${s.moon.mag.toFixed(2)}, Jupiter ${s.jupiter.mag.toFixed(2)}`);

  // Close to Jupiter: no light on Jupiter, whose disc is big.
  look('jupiter', [0, 6, 28]);
  s = lights.state();
  check(!s.jupiter, 'Jupiter close up is its own lit surface and nothing else');
  check(s.saturn && s.saturn.alpha > 0, 'while Saturn, far off, is a light');

  // The Sun's stage: true places, and the lights are there. A ladder rung: none.
  count = look('sun', [0, 300, 900]);
  check(count >= 5 && lights.state().jupiter && lights.state().jupiter.alpha > 0, `on the Sun's stage ${count} worlds have a light`);
  const { STAGES } = await import(join(JS, 'scene/stage.js')).catch(() => ({}));
  const { isLadderStage } = await import(join(JS, 'scene/stage.js'));
  const rung = STAGES ? Object.keys(STAGES).find((id) => isLadderStage(id)) : null;
  if (rung) {
    count = look(rung, [0, 1, 3]);
    check(count === 0 && !lights.points.visible, `on the ladder (${rung}) no world has a light`);
  } else problems.push('no ladder stage was found to test');
  // The layer's switch.
  worlds.setVisible(false);
  count = look('earth', [0, 8, 25]);
  check(count === 0, `with the worlds layer off there are no lights (${count})`);
  worlds.setVisible(true);
  lights.setVisible(false);
  check(look('earth', [0, 8, 25]) === 0 && !lights.points.visible, 'and setVisible(false) hides them');
}

if (problems.length) { console.error(table.join('\n')); console.error(`world lights: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log(table.join('\n'));
console.log('world lights ok: Mallama and Hilton\'s magnitudes within 0.3 of the published ones, the stars\' own sprite, gone at 16 px of disc, hidden behind a nearer world');
