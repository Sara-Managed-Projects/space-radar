// tests/test_mars_relief.mjs -- Mars's relief from MOLA's heights, and the shadows it casts
// (spec 0073 requirement 5, 2026-10-12). The heights themselves are held to the source by
// tests/test_mars_heights.py (a WebP needs Pillow); this holds everything else:
//   1. THE MARCH. The JS twin of the shader's cast shadow: a 21 km mountain shades the ground behind
//      it at a low Sun and not at a high one, a plain never shades itself, a ball's curve is in it;
//      eight steps and sixteen reach the same distance.
//   2. THE SHADER carries the same numbers, reads the heights once and once a step and only where
//      the Sun is up and low, and a close-up tile reads the globe's relief at the globe's place.
//   3. IN THE SCENE: nothing at boot or on a phone; both maps with Mars's own map on tier 1 and up;
//      the steps follow the tier; the latch and the map-release rule give both back.
//   4. the registry rows, the words on the card, and that no dust storm is drawn.
//   node tests/test_mars_relief.mjs

import { readFileSync, existsSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const { WORLDS, WORLD_FRAG, MARS_RELIEF, RELIEF_STEEP, marchGrowth, terrainUniforms, castShadow, reliefUniform, createWorlds, worldRecords } = W;
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const TILES = await import(join(JS, 'scene/tiles.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const measured = [];
const DEG = Math.PI / 180;

const mars = WORLDS.find((w) => w.id === 'mars');
const r = mars.look.relief;
const R_M = mars.radiusKm * 1000;
const X = MARS_RELIEF.exaggeration;

// ---- 1. the march ---------------------------------------------------------------------------------
{
  check(near(MARS_RELIEF.firstRad * Math.pow(marchGrowth(8), 7), MARS_RELIEF.reachRad, 1e-9) && near(MARS_RELIEF.firstRad * Math.pow(marchGrowth(16), 15), MARS_RELIEF.reachRad, 1e-9), 'eight steps and sixteen both end at the reach');
  check(MARS_RELIEF.firstRad * mars.radiusKm > 2 * Math.PI * mars.radiusKm / r.height.px, `the first step (${(MARS_RELIEF.firstRad * mars.radiusKm).toFixed(1)} km) is over a texel of the height map (${(2 * Math.PI * mars.radiusKm / r.height.px).toFixed(1)} km)`);
  // A mountain 21 km high and 300 km in radius, drawn X times taller, on a plain: a cone, heights in radii.
  const cone = (centreRad) => (s) => X * 21000 / R_M * Math.max(0, 1 - Math.abs(s - centreRad) * mars.radiusKm / 300);
  const behind = 400 / mars.radiusKm;   // the point is 400 km down-Sun of the summit
  for (const steps of [8, 16]) {
    const low = castShadow(cone(behind), Math.tan(5 * DEG), steps);
    const high = castShadow(cone(behind), Math.tan(40 * DEG), steps);
    check(low < 0.3, `${steps} steps: 400 km behind Olympus Mons with the Sun 5 degrees up the ground is in its shadow (${low.toFixed(2)} of the light left)`);
    check(high === 1, `${steps} steps: with the Sun 40 degrees up it is not (${high.toFixed(2)})`);
    check(castShadow(() => 0, Math.tan(1 * DEG), steps) === 1, `${steps} steps: a plain does not shade itself, even with the Sun 1 degree up`);
    // The map's own noise, one byte either way at every step (116 m, times the exaggeration): no shadow at 3 degrees.
    const noisy = (s) => (s === 0 ? -1 : 1) * X * 115.7 / R_M;
    check(castShadow(noisy, Math.tan(3 * DEG), steps) > 0.9, `${steps} steps: a byte of noise does not draw a shadow at 3 degrees (${castShadow(noisy, Math.tan(3 * DEG), steps).toFixed(2)})`);
    if (steps === 8) measured.push(`400 km behind a 21 km cone drawn ${X} times taller: ${low.toFixed(2)} of the light at 5 degrees, ${high.toFixed(2)} at 40`);
  }
  // The ball's curve: a wall as high as the horizon's drop hides nothing. At the reach (0.15 rad) the ground has fallen 0.5 s^2.
  const wallAt = MARS_RELIEF.reachRad;
  const drop = 0.5 * wallAt * wallAt;
  check(castShadow((s) => (Math.abs(s - wallAt) < 1e-9 ? drop * 0.9 : 0), Math.tan(0.5 * DEG), 8) === 1, 'a far wall lower than the curve of the ball is under the horizon and shades nothing');
  check(castShadow((s) => (Math.abs(s - wallAt) < 1e-9 ? drop + wallAt * Math.tan(10 * DEG) : 0), Math.tan(2 * DEG), 8) < 0.3, 'and one that stands 10 degrees over the horizon shades a Sun 2 degrees up');
  // The shadow's depth: not black.
  check(MARS_RELIEF.depth > 0.7 && MARS_RELIEF.depth < 0.95, `a shadow keeps some light, as under Mars's bright sky (${(1 - MARS_RELIEF.depth).toFixed(2)})`);
  const t = terrainUniforms(r.height, mars.radiusKm, 8);
  check(near(t.terrain[0], X * (r.height.maxM - r.height.minM) / R_M, 1e-12) && t.terrain[1] === 8 && t.march[0] === r.height.px, 'the uniforms: a full byte is the whole span in radii, exaggerated');
  measured.push(`a full byte is ${(t.terrain[0] * mars.radiusKm).toFixed(1)} km as drawn; steps grow by ${marchGrowth(8).toFixed(3)} (8) and ${marchGrowth(16).toFixed(3)} (16), from ${(MARS_RELIEF.firstRad * mars.radiusKm).toFixed(1)} to ${(MARS_RELIEF.reachRad * mars.radiusKm).toFixed(0)} km`);
}

// ---- 2. the shader --------------------------------------------------------------------------------
{
  const block = WORLD_FRAG.slice(WORLD_FRAG.indexOf('if ( uTerrain.x > 0.0'), WORLD_FRAG.indexOf('// The ring between this point and the Sun'));
  check(block.length > 200, 'WORLD_FRAG has the march');
  check(block.includes(`dGeo > 0.0 && dGeo < ${MARS_RELIEF.maxSun.toFixed(2)}`), 'only where the Sun is up, and low enough for anything to reach it');
  check(block.includes(`for ( int j = 0; j < ${MARS_RELIEF.steps[2]}; j++ )`) && block.includes('if ( float( j ) >= uTerrain.y ) break;'), 'at most sixteen steps, as many as the tier is given');
  check(block.split('textureLod( uHeightMap').length - 1 === 2 && !block.includes('texture2D'), 'the heights are read once here and once a step, each from a named mip');
  check(block.includes('horizon = max( horizon, ( h - h0 ) / s - 0.5 * s );'), 'the horizon is the twin\'s: the ball\'s curve taken off');
  check(block.includes('smoothstep( tanSun, tanSun + 2.0 * uTerrainMarch.y, horizon - uTerrainMarch.z )'), 'and the edge, the bias and the depth are the uniforms\'');
  check(WORLD_FRAG.includes('vec2 reliefUv = vUv; float slopeShare = 1.0;') && WORLD_FRAG.includes('n = normalize( n - uReliefK.x * slopeShare * ( hE * east + hN * north ) );'), 'the slope is Mercury\'s term, read at the world\'s own place on its map');
  check(WORLD_FRAG.split('{').length === WORLD_FRAG.split('}').length && WORLD_FRAG.split('(').length === WORLD_FRAG.split(')').length, 'the shader\'s braces and brackets balance');
  // Fetches a fragment: the slope's four, and for the shadow one and one a step.
  check(WORLD_FRAG.includes('float duE = uReliefK.y / cosLat;'), 'east and west the slope\'s two reads are the same distance apart on the ground at every latitude: no rays round a pole');
  const slope = WORLD_FRAG.split('texture2D( uGlobeRelief').length - 1;
  check(slope === 4, `the slope is four reads (${slope})`);
  measured.push(`texture reads a fragment of Mars beyond its map: ${slope} for the slope everywhere; where the Sun is up and under ${Math.round(Math.asin(MARS_RELIEF.maxSun) / DEG)} degrees high, 1 + ${MARS_RELIEF.steps[1]} more on tier 1 and 1 + ${MARS_RELIEF.steps[2]} on tier 2`);
  // No render target, no pass: the shadow is in the one material.
  const worldsSrc = readFileSync(join(JS, 'scene/worlds.js'), 'utf8');
  check(!/WebGLRenderTarget|EffectComposer|ShadowMap|castShadow\s*=\s*true/.test(worldsSrc), 'no render target and no shadow map: the shadow is worked out in the world\'s own shader');
  // A tile over the globe (Mars close up): the globe's relief at the globe's uv, its slope giving way to the tile's.
  const tile = TILES.tileFragment();
  check(tile.includes('vec2 reliefUv = vUvGlobe; float slopeShare = 1.0 - uRelief.x;') && !tile.includes('vec2 reliefUv = vUv;'), 'a close-up tile reads the globe\'s relief and heights at the globe\'s place, and its own relief replaces the globe\'s slope');
  check(tile.includes('textureLod( uHeightMap, reliefUv'), 'and keeps the cast shadow, which no tile brings');
  let threw = false;
  try { TILES.tileFragment(WORLD_FRAG.replace('vec2 reliefUv = vUv; float slopeShare = 1.0;', '')); } catch { threw = true; }
  check(threw, 'a WORLD_FRAG without that line is refused by the tiles, not silently drawn wrong');
  // The weather's Mars wears the same shader with one line changed: the relief is in it.
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  check(WW.weatherFragment().includes('textureLod( uHeightMap, reliefUv'), 'the season\'s frost and dust are drawn in the same shader, shadows and all');
}

// ---- 3. in the scene ------------------------------------------------------------------------------
{
  stage.setWorld('mars');
  const fetched = [];
  const made = [];
  const camera = new THREE.PerspectiveCamera(50, 1.6, 1e-6, 1e12);
  const worlds = createWorlds(new THREE.Scene(), {
    camera,
    loadTexture: (url, onLoad) => { fetched.push(url); const t = new THREE.Texture(); t.name = url; made.push(t); if (onLoad) onLoad(t); return t; },
  });
  const n = (name) => fetched.filter((u) => u.endsWith(name)).length;
  const u = worlds.meshFor('mars').material.uniforms;
  check(n(r.map) === 0 && n(r.height.map) === 0 && n(mars.look.map) === 0, 'nothing of Mars is fetched at construction: zero bytes on a first visit');
  worlds.preload('mars');
  check(n(mars.look.map) === 1 && n(r.map) === 0 && n(r.height.map) === 0 && !worlds.hasRelief('mars') && worlds.castsShadows('mars') === 0, 'on a phone (no setRelief) the map comes and neither relief map does');
  worlds.setReliefTier(1);
  worlds.setRelief(true);
  check(n(r.map) === 1 && n(r.height.map) === 1 && worlds.hasRelief('mars'), 'tier 1: both maps are fetched once, with the map');
  check(worlds.castsShadows('mars') === MARS_RELIEF.steps[1], `and the shadow is marched in ${MARS_RELIEF.steps[1]} steps (${worlds.castsShadows('mars')})`);
  check(near(u.uReliefK.value.x, reliefUniform(r.px, r.rangeM, mars.radiusKm, X)[0], 1e-12) && r.steep === X, `the slope is drawn ${X} times steeper, as the heights are taller`);
  check(u.uHeightMap.value && u.uHeightMap.value.format === THREE.RedFormat && u.uGlobeRelief.value.format === THREE.RedFormat, 'both are one channel on the GPU, which is what the budget counts');
  check(u.uHeightMap.value.wrapS === THREE.RepeatWrapping && u.uHeightMap.value.generateMipmaps !== false, 'the height map wraps round the planet and has the mips the march reads');
  worlds.setReliefTier(2);
  check(worlds.castsShadows('mars') === MARS_RELIEF.steps[2] && near(u.uTerrain.value.w, marchGrowth(16), 1e-6), 'tier 2: sixteen steps, without fetching again');
  worlds.setRelief(true);
  check(n(r.map) === 1 && n(r.height.map) === 1, 'asking twice fetches nothing twice');
  worlds.setRelief(false);
  check(!worlds.hasRelief('mars') && worlds.castsShadows('mars') === 0 && u.uHeightMap.value === null, 'the frame latch takes the slope and the shadow off');
  worlds.setRelief(true);
  check(worlds.castsShadows('mars') === 16 && n(r.height.map) === 2, 'a tier that may wears them again');
  check(worlds.releaseMap('mars') && !worlds.hasRelief('mars') && worlds.castsShadows('mars') === 0, 'giving the map back gives both back');
  // Mercury is as it was: a slope and no shadow.
  worlds.preload('mercury');
  check(worlds.hasRelief('mercury') && worlds.castsShadows('mercury') === 0, 'Mercury keeps its slope and casts nothing: it has no height map');
  check(worlds.meshFor('moon').material.uniforms.uTerrain.value.x === 0, 'and the Moon has neither');
}

// ---- 4. the registry and the words -----------------------------------------------------------------
{
  const rel = TEXTURES.find((t) => t.id === 'mars-relief');
  const hgt = TEXTURES.find((t) => t.id === 'mars-height');
  for (const [row, file, px] of [[rel, r.map, r.px], [hgt, r.height.map, r.height.px]]) {
    const f = row && row.files.find((x) => x.tier === 0);
    check(row && row.world === 'mars' && row.slot === 'relief' && row.when === 'asked', `${file}: registry/textures.yaml has the row, fetched when asked for and never at boot`);
    check(f && f.file === `textures/${file}` && f.px[0] === px && f.px[1] * 2 === px && f.format === 'mono', `${file}: one grey channel, as wide as the shader is told`);
    check(existsSync(join(ROOT, 'site/textures', file)) && f && f.bytes === statSync(join(ROOT, 'site/textures', file)).size, `${file} ships at the bytes the row says`);
  }
  const yaml = readFileSync(join(ROOT, 'registry/textures.yaml'), 'utf8');
  check(yaml.includes(`+-${r.rangeM} m`) && yaml.includes(`from ${r.height.minM} m (0) to ${r.height.maxM} m (255)`), 'the rows say what a byte spans, which is what the shader is told');
  check(yaml.includes(`Drawn ${X} times steeper than measured`) && yaml.includes(`${X} times too long`), 'and by how much the drawing exaggerates');
  const { COPY, t } = await import(join(JS, 'copy/en.js'));
  const dep = COPY.drawing.worldDeparture.mars;
  check(/laser altimeter measured/.test(dep) && /\{mola\}/.test(dep) && /shadows/.test(dep), 'Mars\'s card says the relief is measured and how much it is exaggerated');
  const rec = worldRecords().find((x) => x.id === 'mars');
  const said = JSON.stringify(rec);
  check(said.includes(`drawn ${X} times steeper and taller`), `the record carries the sentence with the number in it (${X})`);
  check(RELIEF_STEEP === 4, 'Mercury\'s own number is untouched');
  // NO DUST STORM. The only public text source found (Malin Space Science Systems' MARCI weekly
  // reports) stopped in February 2022; nothing dated is published, so nothing is drawn beyond the
  // season's typical dust, and that row stays illustrative.
  const marsRows = WEATHER.filter((x) => x.world === 'mars');
  check(marsRows.length === 1 && marsRows[0].kind === 'mars-season' && marsRows[0].class === 'illustrative', 'Mars\'s only weather row is the season: no storm is drawn that nobody reported');
  check(/not today/.test(COPY.weather.worlds.mars), 'and its weather line still says it is not today\'s');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(credits.includes('2k_mars_relief.webp') && credits.includes('1k_mars_height.webp') && credits.includes('Mars Orbiter Laser Altimeter'), 'CREDITS.md carries both maps');
  void t;
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`mars relief FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('mars relief ok: a mountain shades the ground behind it at a low Sun and a plain never shades itself, the shader marches the heights only where the Sun is low, nothing is fetched at boot or on a phone, and no dust storm is drawn');
