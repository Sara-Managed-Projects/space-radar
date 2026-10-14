// tests/test_worlds_films.mjs -- the last four worlds made films (spec 0073 requirement 5, 2026-10-14):
//   1. MERCURY is left as it was (its shadows were tried and were not clearer than its slopes).
//   2. VENUS's radar ground is one channel worn in an added colour, with Magellan's relief under it
//      (and only under it), and the cloud deck's wind does not carry it; its ultraviolet bands are
//      the Film look's alone.
//   3. URANUS wears Hubble's measured polar cap on the artist's map, the north only, not on Hubble's face.
//   4. NEPTUNE: Voyager's 1989 spot is taken out under the Measured look; the ring arcs go round at
//      the measured rate and are not drawn under Measured; the cirrus is illustrative and hidden there.
//   5. the honesty: each card says what is measured, what is illustrative and when it was seen.
//   node tests/test_worlds_films.mjs

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const { WORLDS, WORLD_FRAG, RING_FRAG, createWorlds, worldRecords, heightRowOf, terrainUniforms, VENUS_GROUND, VENUS_GROUND_RELIEF, VENUS_UV, URANUS_CAP, NEPTUNE_SPOT, NEPTUNE_ARCS, NEPTUNE_RINGS, arcTurnRad, arcUniform } = W;
const WW = await import(join(JS, 'scene/weather/worldweather.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const LATER = await import(join(JS, 'copy/en.later.js'));
const { worstCaseGpu } = await import(join(JS, 'scene/texturetiers.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const row = (id) => WORLDS.find((w) => w.id === id);

const camera = new THREE.PerspectiveCamera(45, 1.6, 1e-6, 1e12);
const fetched = [];
const worlds = createWorlds(new THREE.Scene(), {
  camera,
  loadTexture: (url, onLoad) => { fetched.push(url); const t = new THREE.Texture(); t.name = url; if (onLoad) onLoad(t); return t; },
});
const n = (re) => fetched.filter((u) => re.test(u)).length;
const U = (id) => worlds.meshFor(id).material.uniforms;

// ---- 1. Mercury: unchanged (the look of 2026-10-14 found its marched shadows no clearer than its slopes) --
{
  check(!row('mercury').look.relief.height, 'Mercury marches no shadows: at 7.5 km a texel they were not clearer than its slopes (look of 2026-10-14)');
  const h = heightRowOf(VENUS_GROUND_RELIEF);
  check(h.px === 2048 && h.minM === -VENUS_GROUND.rangeM && h.maxM === VENUS_GROUND.rangeM && h.depth === VENUS_GROUND.depth, 'a relief map read as its own heights: +-rangeM, its own width, its row\'s shadow depth');
  check(near(terrainUniforms(h, 6051.8, 8, 6).march[3], VENUS_GROUND.depth, 1e-9) && terrainUniforms({ px: 1, minM: 0, maxM: 1 }, 1, 8).march[3] === W.MARS_RELIEF.depth, 'the depth is the row\'s, and Mars keeps its own');
  worlds.setReliefTier(1);
  worlds.setRelief(true);
}

// ---- 2. Venus ----------------------------------------------------------------------------------------
{
  const look = row('venus').look;
  check(look.faces.surface === '2k_venus_radar.webp' && look.faceMono.surface === VENUS_GROUND.tint && look.groundFaces.includes('surface'), 'the radar face is one channel worn in an added colour, and it is ground');
  check(look.faceRelief.surface.height.self && look.faceRelief.surface.steep === VENUS_GROUND.exaggeration, 'its relief is Magellan\'s, marched for shadows, at the stated exaggeration');
  worlds.preload('venus');
  const u = U('venus');
  check(!worlds.hasRelief('venus') && n(/venus_relief/) === 0, 'the clouds wear no relief and fetch none');
  check(u.uContrast.value === VENUS_UV.gain, 'in Film the cloud bands carry the ultraviolet contrast');
  worlds.setLook('measured');
  check(u.uContrast.value === 1, 'and under Measured the map is as it is');
  worlds.setLook('film');
  const ww = WW.createWorldWeather({ worlds });
  const t0 = Date.UTC(2026, 9, 14, 12);
  ww.update(t0);
  const ph = () => ({ ...u.uWxPhase.value });
  check(ph().x !== 0 || ph().w !== 0, 'the cloud deck flows');
  worlds.setFace('venus', 'surface');
  check(worlds.groundFace('venus') && worlds.hasRelief('venus') && worlds.castsShadows('venus') === 8 && n(/venus_relief/) === 1, 'Ground: the relief comes with it, shadows marched');
  check(u.uMono.value.w === 1 && near(u.uMono.value.x, VENUS_GROUND.tint[0], 1e-9) && u.uWrap.value === 0 && u.uContrast.value === 1, 'worn in its colour, with a hard terminator and no ultraviolet bands');
  const radar = fetched.find((x) => /venus_radar/.test(x));
  check(!!radar, 'the radar face is fetched when asked for');
  ww.update(t0 + 3600e3);
  const g = ph();
  check(g.x === 0 && g.y === 0 && g.z === 0 && g.w === 0 && u.uWxWave.value.x === 0, 'no wind carries the ground, and the cloud deck\'s dark Y is not on it');
  ww.update(t0 + 7200e3);
  check(ph().x === 0 && ph().w === 0, 'whatever the clock does');
  worlds.setFace('venus', null);
  ww.update(t0 + 10800e3);
  check(!worlds.groundFace('venus') && !worlds.hasRelief('venus') && u.uMono.value.w === 0 && (ph().x !== 0 || ph().w !== 0) && u.uWxWave.value.x > 0, 'back to the clouds: the relief off, the colours the map\'s, the deck flowing and the Y back');
  check(ww.state().worlds.find((e) => e.id === 'venus').ground === false, 'the weather says whether it stands still');
  const rel = TEXTURES.find((t) => t.id === 'venus-relief');
  const sur = TEXTURES.find((t) => t.id === 'venus-surface');
  check(rel && rel.when === 'asked' && rel.files[0].format === 'mono' && /2k_venus_relief\.webp$/.test(rel.files[0].file), 'venus-relief: asked for, one channel (its licence and source are held by scripts/check_registry.py)');
  check(sur && sur.files[0].format === 'mono' && /2k_venus_radar\.webp$/.test(sur.files[0].file), 'venus-surface is the one-channel radar map');
  ww.latch();
}

// ---- 3. Uranus ---------------------------------------------------------------------------------------
{
  check(URANUS_CAP.length === 10 && URANUS_CAP.every((c) => c.length === 3 && c.every((x) => x > 0.8 && x < 1.8)), 'the cap is ten rows of three gains, none wild');
  check(URANUS_CAP[0].every((x) => x === 1) && URANUS_CAP[9][0] > 1.5, 'nothing at the equator, the pole whiter (red raised most)');
  check(/vUv\.y > 0\.5/.test(WORLD_FRAG) && /uCap\[ ci \]/.test(WORLD_FRAG), 'the shader changes the north only: Hubble did not see the south');
  worlds.preload('uranus');
  check(U('uranus').uCapOn.value === 1, 'the artist\'s map wears the cap');
  worlds.setFace('uranus', 'hubble');
  check(U('uranus').uCapOn.value === 0, 'Hubble\'s own face has its own and is not changed');
  worlds.setFace('uranus', null);
  check(U('uranus').uCapOn.value === 1, 'and the artist\'s map wears it again');
  check(WORLDS.filter((w) => w.look.cap).map((w) => w.id).join() === 'uranus', 'the cap is Uranus\'s alone');
}

// ---- 4. Neptune --------------------------------------------------------------------------------------
{
  worlds.preload('neptune');
  const u = U('neptune');
  check(u.uSpotOut.value.z === 0, 'Film: the artist\'s map with Voyager\'s spot');
  worlds.setLook('measured');
  check(u.uSpotOut.value.z === NEPTUNE_SPOT.half_u && u.uSpotOut.value.x === NEPTUNE_SPOT.u, 'Measured: the spot is taken out');
  worlds.setFace('neptune', 'hubble');
  check(u.uSpotOut.value.z === 0, 'but not from Hubble\'s map, which has none');
  worlds.setFace('neptune', null);
  worlds.setLook('film');
  check(u.uSpotOut.value.z === 0, 'Film puts it back');
  check(/texel = spotOut\( texel, p \)/.test(WW.weatherFragment()), 'the flowing map takes it out where the flow has carried it');
  // The arcs.
  const au = arcUniform();
  check(au.length === NEPTUNE_ARCS.spans.length * 4 && near(au[0], (252 * Math.PI) / 180, 1e-6) && near(au[1], (5 * Math.PI) / 180, 1e-6), 'Fraternite is centred at 252 and ten degrees long');
  check(NEPTUNE_RINGS.arcs === NEPTUNE_ARCS && NEPTUNE_RINGS.bands.some((b) => b[0] === NEPTUNE_ARCS.ringKm && b[2] === 0.011), 'the arcs are in the Adams ring, whose depth between them is 0.011');
  const d1 = arcTurnRad(Date.UTC(2026, 0, 2, 0)) - arcTurnRad(Date.UTC(2026, 0, 1, 0));
  check(near(((d1 * 180) / Math.PI + 360) % 360, (820.1194 - 541.1397757) % 360, 1e-4), 'a day turns them by the ring\'s rate less the planet\'s');
  const ring = worlds.meshFor('neptune').userData.ring.material.uniforms;
  check(ring.uArcBand.value.w === 1 && near(ring.uArcBand.value.x, 62933 / 24622, 1e-6), 'the arcs are drawn, at the Adams ring\'s radius');
  check(/uArcBand\.w > 0\.0/.test(RING_FRAG) && /uArcs\[ i \]/.test(RING_FRAG), 'the ring shader reads them');
  check(worlds.meshFor('uranus').userData.ring.material.uniforms.uArcBand.value.w === 0, 'Uranus has none');
  try {
    worlds.setLook('measured');
    worlds.update(Date.UTC(2026, 9, 14));
    check(ring.uArcBand.value.w === 0, 'Measured: the arcs (illustrative in place) are not drawn');
    worlds.setLook('film');
    worlds.update(Date.UTC(2026, 9, 14, 1));
    check(ring.uArcBand.value.w === 1 && near(ring.uArcBand.value.z, arcTurnRad(Date.UTC(2026, 9, 14, 1)), 1e-9), 'Film: drawn, turned to the clock');
  } catch (e) { check(false, 'worlds.update could not be run here: ' + e.message); }
  // The cirrus.
  const ci = WEATHER.find((r) => r.id === 'neptune-cirrus');
  check(ci && ci.class === 'illustrative' && ci.measured === 'hidden' && ci.off_at.includes('tier0') && ci.cirrus.height_km === 50 && ci.cirrus.widen === 6, 'the cirrus is illustrative, hidden under Measured, off on tier 0, Voyager\'s 50 km drawn six times higher and wider');
  const cu = WW.cirrusUniforms(ci.cirrus);
  check(near(cu.bands[0], 0.5 + 29 / 180, 1e-6) && near(cu.cirrus.x, (6 * 50) / 24622, 1e-9) && /six times wider and higher/.test(COPY.weather.also.neptune), 'the first band is Voyager\'s 29 N; the drawn height is in radii, and the card says how much it is widened');
  const ww = WW.createWorldWeather({ worlds });
  const nu = U('neptune');
  check(nu.uWxCirrusBand && nu.uWxCirrus && /WX_CIRRUS/.test(Object.keys(worlds.meshFor('neptune').material.defines).join()), 'Neptune wears the cirrus');
  ww.setLook('measured');
  ww.update(Date.UTC(2026, 9, 14), 1000);
  check(nu.uWxCirrus.value.w === 0, 'and under Measured not one streak');
  ww.latch();
}

// ---- 5. the cards ------------------------------------------------------------------------------------
{
  const rec = Object.fromEntries(worldRecords().map((r) => [r.id, r]));
  const dep = (id) => (rec[id] && rec[id].meta && rec[id].meta.departure) || '';
  check(dep('venus').includes(`${VENUS_UV.gain} times the contrast`) && /ultraviolet/.test(dep('venus')) && /Measured look shows the map as it is/.test(dep('venus')) && dep('venus').includes(`${VENUS_GROUND.exaggeration} times steeper`), 'Venus\'s card says the bands are the Film look\'s and how strong, and the ground\'s exaggeration');
  check(/1989/.test(dep('neptune')) && /not computed/.test(dep('neptune')), 'Neptune\'s card says the arcs are as Voyager saw them and not where they are');
  const also = COPY.weather.also;
  check(!/no spot is drawn/.test(also.neptune) && /1989/.test(also.neptune) && /illustrative/.test(also.neptune) && /Measured/.test(also.neptune), 'Neptune\'s card no longer says no spot is drawn: it says whose spot, when, and that Measured leaves it out');
  check(/October 2025/.test(also.uranus) && /Hubble/.test(also.uranus), 'Uranus\'s card says its cap is Hubble\'s of October 2025');
  check(/radar/.test(COPY.worldFace.venus.notes.surface) && /does not move with the clouds/.test(COPY.worldFace.venus.notes.surface), 'the Ground face says it is radar, in relief, and still');
}

// ---- the budget -------------------------------------------------------------------------------------
{
  const t1 = worstCaseGpu(1, { mapsHeld: 5 });
  check(t1.faces < 40, `the faces a card can ask for fit (T1 ${t1.faces.toFixed(1)} MiB)`);
}

if (problems.length) {
  console.error(`worlds films: ${problems.length} problem(s)`);
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log('worlds films ok: Venus\'s radar ground is one channel in an added colour, in relief, still under the moving clouds, and its ultraviolet bands are Film\'s alone; Uranus wears Hubble\'s cap of 2025 in the north only; Neptune\'s 1989 spot leaves under Measured, its arcs turn at the measured rate in Film only, and its cirrus is illustrative; every card says so');
