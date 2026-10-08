// tests/test_atmo_lut.mjs -- the Earth's air (spec 0053 tasks 1, 2 and 5; internal #143, #144, #147)
// and its storm tops (spec 0066 task 2, internal #241). Pure maths, no browser.
//
//   1. THE TABLE of the light's path (scene/atmosphere.js EARTH_LUT): built the same twice, read as
//      the GPU reads it, within 2 % of a 20 000-step integration at five angles and more; zero light
//      behind the planet.
//   2. THE SHELL: where #317's formula lit the air (the limb toward the Sun) the new one draws the
//      same light; where it did not (the limb beside the terminator's poles) there is light now;
//      steps by tier and the latch's six, for good.
//   3. AERIAL PERSPECTIVE: the map untouched straight down under a high Sun, a low Sun red, the limb
//      pale and brighter than the middle, nothing lit at night; the shader is the twin.
//   4. RELIEF: level ground and water unchanged, a slope toward a low Sun brighter and one away
//      darker, the map a slot of its own that gives itself back; the shader is the twin.
//   5. STORM TOPS: -52 C starts one and -75 C is all of one; the composite's third channel.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const load = (rel) => import(pathToFileURL(join(JS, rel)).href);
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const A = await load('scene/atmosphere.js');
const E = await load('scene/earth.js');
const C = await load('scene/cloudcompose.js');
const THREE = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
const { EARTH_AIR, EARTH_LUT, AERIAL } = A;

// --- 1. the table ----------------------------------------------------------------------------
const lut = A.buildEarthLut();
check(lut.length === EARTH_LUT.width * EARTH_LUT.height * 2 && lut === A.buildEarthLut(), 'the table is built once, two columns a texel');
{
  // Deterministic: the same numbers from the same formula, texel by texel.
  let same = true;
  for (const [i, j] of [[0, 0], [40, 3], [95, 47], [17, 30]]) {
    const span = EARTH_AIR.shellScale - 1;
    const h = (j / (EARTH_LUT.height - 1)) ** 2 * span;
    const f0 = -Math.sqrt(-EARTH_LUT.muMin);
    const f = f0 + (i / (EARTH_LUT.width - 1)) * (1 - f0);
    const c = A.earthColumn(h, Math.sign(f) * f * f);
    if (lut[(j * EARTH_LUT.width + i) * 2] !== Math.fround(c[0]) || lut[(j * EARTH_LUT.width + i) * 2 + 1] !== Math.fround(c[1])) same = false;
  }
  check(same, 'every texel is earthColumn() at its own height and angle');
}
const bR = EARTH_AIR.betaR.map((b) => b * EARTH_AIR.radiusKm * 1000);
const bM = EARTH_AIR.betaM * EARTH_AIR.radiusKm * 1000 * EARTH_AIR.mieExt;
const trans = (c) => bR.map((b) => Math.exp(-(b * c[0] + bM * c[1])));
let worst = 0;
const five = [[0, 1], [0, 0.3], [5, 0.1], [20, -0.02], [50, -0.1]];
const more = [[0, 0.05], [0, 0], [3, 0.6], [10, 0.02], [1, 0], [40, -0.05], [100, -0.15], [140, 0.5], [70, -0.2]];
for (const [hKm, mu] of [...five, ...more]) {
  const h = hKm / EARTH_AIR.radiusKm;
  const ref = trans(A.earthColumn(h, mu, 20000));
  const got = trans(A.lutColumns(lut, h, mu));
  const d = Math.max(...ref.map((x, k) => Math.abs(x - got[k])));
  worst = Math.max(worst, d);
  check(d <= 0.02, `the table at ${hKm} km, cos ${mu}: transmittance ${got.map((x) => x.toFixed(3))} against ${ref.map((x) => x.toFixed(3))}`);
}
{
  const up = trans(A.lutColumns(lut, 0, 1));
  // The shell's air is drawn 2.5 times as tall as it is with the real coefficients (#317): straight up,
  // blue loses about half and red a sixth.
  check(up[0] > 0.8 && up[2] > 0.4 && up[2] < 0.55 && up[0] > up[1] && up[1] > up[2], `straight up from the ground: ${up.map((x) => x.toFixed(3))}`);
  const behind = trans(A.lutColumns(lut, 20 / 6371, -0.5));
  check(Math.max(...behind) < 1e-6, 'a ray that goes well under the ground lets nothing through');
  const graze = trans(A.lutColumns(lut, 0, -0.01));
  const horizon = trans(A.lutColumns(lut, 0, 0));
  check(graze[0] <= horizon[0] + 1e-9 && graze[0] > 0, 'and just under the horizon the light dies smoothly, not at an edge');
}

// --- 2. the shell ----------------------------------------------------------------------------
const cam = [0, 0, 4];
const limb = (tKm, side) => {
  const a = Math.asin((1 + tKm / 6371) / 4);
  return side === 'pole' ? [0, Math.sin(a), -Math.cos(a)] : [(side === 'sun' ? 1 : -1) * Math.sin(a), 0, -Math.cos(a)];
};
const quarter = [1, 0, 0];
let shellWorst = 0;
for (const tKm of [10, 30, 60]) {
  const was = A.earthShell(cam, limb(tKm, 'sun'), quarter, { light: 'old', sun: 14 });
  const now = A.earthShell(cam, limb(tKm, 'sun'), quarter, { lut });
  const d = Math.abs(now[1] - was[1]) / was[1];
  shellWorst = Math.max(shellWorst, d);
  check(d < 0.25, `toward the Sun at ${tKm} km the shell's green is within a quarter of #317's (${now.map((x) => x.toFixed(3))} against ${was.map((x) => x.toFixed(3))})`);
}
let stepsWorst = 0;
for (const sun of [quarter, [0, 0, 1], [0.5, 0, -0.866]]) for (const tKm of [2, 10, 30, 60, 100]) {
  const fine = A.earthShell(cam, limb(tKm, 'sun'), sun, { lut, steps: 400 });
  for (const n of [EARTH_AIR.latchedSteps, ...EARTH_AIR.steps]) {
    const got = A.earthShell(cam, limb(tKm, 'sun'), sun, { lut, steps: n });
    // Green and blue: the backlit red at 2 km is the forward glare through 30 optical depths, and 6 steps overshoot it.
    const d = Math.max(Math.abs(got[1] - fine[1]) / fine[1], Math.abs(got[2] - fine[2]) / fine[2]);
    if (n >= 8) stepsWorst = Math.max(stepsWorst, d);
    check(d < (n >= 8 ? 0.08 : 0.2), `${n} steps at ${tKm} km draw what 400 do (${got.map((x) => x.toFixed(3))} against ${fine.map((x) => x.toFixed(3))})`);
  }
}
{
  const was = A.earthShell(cam, limb(10, 'pole'), quarter, { light: 'old', sun: 14 });
  const now = A.earthShell(cam, limb(10, 'pole'), quarter, { lut });
  check(Math.max(...was) === 0, '#317 drew no air on the limb beside the terminator\'s pole (its shadow test took a miss for a hit)');
  check(now[1] > 0.1, `and there is air there now (${now.map((x) => x.toFixed(3))})`);
  const night = A.earthShell(cam, limb(10, 'anti'), quarter, { lut });
  check(Math.max(...night) < 1e-4, 'and none on the night limb');
  const old6 = A.earthShell(cam, limb(10, 'sun'), quarter, { light: 'old', sun: 14, steps: 6 });
  const old64 = A.earthShell(cam, limb(10, 'sun'), quarter, { light: 'old', sun: 14, steps: 64 });
  check(old64[1] / old6[1] > 1.6, `#317's sum moved with its step count: ${old6[1].toFixed(3)} at 6 steps, ${old64[1].toFixed(3)} at 64`);
}
{
  const shell = A.createEarthAir();
  const u = shell.material.uniforms;
  check(shell.material.side === THREE.BackSide && shell.material.blending === THREE.AdditiveBlending && shell.material.depthWrite === false, 'the shell is drawn from its back, added, without depth');
  check(u.uLut.value.isDataTexture && u.uLut.value.image.width === EARTH_LUT.width && u.uLut.value.type === THREE.HalfFloatType && u.uLut.value.userData.filled, 'it carries the table as a half-float texture');
  check(shell.visible === false && u.uIntensity.value === 0, 'and is not drawn until the table is there');
  A.settleEarthAir(shell, 1000);
  A.settleEarthAir(shell, 1000 + A.EARTH_AIR_FADE_MS / 2);
  check(shell.visible && Math.abs(u.uIntensity.value - 0.5) < 1e-6, 'then it comes up over the fade');
  A.settleEarthAir(shell, 1000 + A.EARTH_AIR_FADE_MS + 1);
  check(u.uIntensity.value === 1, 'to its full light');
  check(A.setEarthAirSteps(shell, 0) === 8 && A.setEarthAirSteps(shell, 1) === 12 && A.setEarthAirSteps(shell, 2) === 16, 'steps by tier: 8, 12, 16');
  check(A.setEarthAirSteps(shell, 2, true) === 6 && A.setEarthAirSteps(shell, 2) === 6, 'six under the latch, and for good');
  check(Math.max(...EARTH_AIR.steps) <= EARTH_AIR.maxSteps, 'the loop\'s bound covers every tier');
  const f = A.EARTH_AIR_FRAG;
  check(/texture2D\( uLut, lutUv\( h, dot\( p, uSunDir \) \/ r \) \)/.test(f) && !/LIGHT_STEPS/.test(f), 'the shader reads the light\'s path from the table and marches none of it');
  check(!/sphere\( p, uSunDir, 1\.0 \)/.test(f), 'and the shadow test that took a miss for a hit is gone');
  const earth = E.createEarth({});
  check(earth.userData.atmosphere && earth.userData.atmosphere.material.fragmentShader === f, 'the Earth wears it');
  check(E.setEarthAirQuality(earth, 1) === 12 && E.setEarthAirQuality(earth, 1, true) === 6, 'and scene/earth.js passes the tier on');
}

// --- 3. aerial perspective -------------------------------------------------------------------
{
  const mid = A.aerial(1, 1, -1);
  check(mid.T.every((x) => x === 1), 'straight down the map is seen as it is');
  check(mid.L[2] > mid.L[1] && mid.L[1] > mid.L[0] && mid.L[2] > 0.03 && mid.L[2] < 0.08, `over the middle of the disc the air adds a little blue (${mid.L.map((x) => x.toFixed(3))})`);
  const edge = A.aerial(0.03, 0.6, 0);
  check(edge.T[2] < 0.02 && edge.T[0] < 0.4, 'at the limb the ground is all but gone');
  check(edge.L.every((x, k) => x > 3 * mid.L[k] || k === 2 && x > 2 * mid.L[k]) && edge.L[2] / edge.L[0] < mid.L[2] / mid.L[0], `and the air there is brighter and paler (${edge.L.map((x) => x.toFixed(3))})`);
  check(A.aerial(0.5, 0.5, 0, 0).L.every((x) => x === 0), 'air that sees no Sun adds nothing');
  const high = A.aerialSun(1);
  const low = A.aerialSun(0.1);
  const set = A.aerialSun(0);
  check(high.every((x) => x === 1), 'an overhead Sun is white');
  check(low[0] > low[1] && low[1] > low[2] && low[0] > 0.5 && low[2] < 0.25, `six degrees up it is orange (${low.map((x) => x.toFixed(2))})`);
  check(set[0] < 0.15 && set[0] > 10 * set[2], `and on the horizon a dim red (${set.map((x) => x.toFixed(3))})`);
  const gold = A.aerialDaylight(0.1);
  const dusk = A.aerialDaylight(0);
  check(A.aerialDaylight(1).every((x) => x === 1), 'daylight under an overhead Sun is the map\'s own');
  check(gold[0] > gold[1] && gold[1] > gold[2] && gold[2] > 2 * low[2] && gold[0] < 0.8, `six degrees up the daylight is gold, not the beam's orange: the sky gives blue back (${gold.map((x) => x.toFixed(2))})`);
  check(dusk[0] > set[0] && dusk[0] < 0.25 && dusk[2] > 0.05, `and at the horizon a dim warm grey (${dusk.map((x) => x.toFixed(3))})`);
  const deck = A.aerialSun(0, AERIAL.deckShare);
  const top = A.aerialSun(0, AERIAL.topShare);
  check(deck[0] > set[0] && top[0] > deck[0] && top[2] > deck[2], 'a cloud deck sees a less reddened Sun than the ground, a storm top less again');
  check(Math.abs(A.aerialAirmass(1) - 1) < 1e-9 && A.aerialAirmass(0) > 34 && A.aerialAirmass(0) < 38 && A.aerialAirmass(-0.2) === A.aerialAirmass(0), 'the airmass is 1 overhead and about 35 at the horizon');
  // The published Rayleigh optical depths (Bodhaine et al. 1999: 0.243 at 440 nm, 0.097 at 550, 0.041 at 680).
  check(Math.abs(AERIAL.tauR[2] - 0.243) < 0.03 && Math.abs(AERIAL.tauR[1] - 0.097) < 0.015 && Math.abs(AERIAL.tauR[0] - 0.041) < 0.008, `the gas's optical depths are the published ones (${AERIAL.tauR.map((x) => x.toFixed(3))})`);
  const f = E.SURFACE_FRAG;
  check(f.includes(A.EARTH_AERIAL_GLSL) && /colour = aerial\( colour, clamp\( dot\( n, viewDir \), 0\.0, 1\.0 \), sunDot, dot\( -viewDir, uSunDir \), airLit,/.test(f), 'the surface shader carries the chunk and calls it last, over the clouds');
  check(/vec3 sunTint = aerDaylight\( sunDot \);/.test(f) && !/vec3\( 1\.0, 0\.62, 0\.42 \)/.test(f), '#301\'s fixed low-sun tint is gone: the air reddens the light');
  check(!/uAtmoTint \* rim/.test(f), 'and so is the one-colour rim');
  check(/eclLight = eclShade;/.test(f) && /airLit = smoothstep\( -0\.14, 0\.02, sunDot \) \* eclLight/.test(f), 'the air under the Moon\'s shadow goes dark with the ground');
  const g = A.EARTH_AERIAL_GLSL;
  check(g.includes(AERIAL.tauM.toFixed(5)) && g.includes(Math.sqrt((Math.PI / 2) * AERIAL.X).toFixed(4)), 'the chunk is written from the same numbers as the twin');
}

// --- 4. relief ---------------------------------------------------------------------------------
{
  const K = E.reliefGain(2048);
  const lowSunEast = [Math.cos(0.15), 0, Math.sin(0.15)];   // 8.6 degrees up, in the east
  check(E.reliefLight(0.5, 0.5, 0.5, 0.5, 1, lowSunEast, K) === 1, 'level ground is lit as before');
  // 2000 m rising to 3000 m toward the east over two texels (39 km): a slope that faces away from an eastern Sun.
  const v = (m) => Math.sqrt(m / E.EARTH_RELIEF.maxMetres);
  const away = E.reliefLight(v(3000), v(2000), v(2500), v(2500), 1, lowSunEast, K);
  const toward = E.reliefLight(v(2000), v(3000), v(2500), v(2500), 1, lowSunEast, K);
  check(toward > 1.3 && away < 0.7, `a slope toward a low Sun is brighter and one away from it darker (${toward.toFixed(2)}, ${away.toFixed(2)})`);
  check(toward <= E.EARTH_RELIEF.max && away >= E.EARTH_RELIEF.min, 'both held inside the limits');
  const noon = E.reliefLight(v(2000), v(3000), v(2500), v(2500), 1, [0, 0, 1], K);
  check(Math.abs(noon - 1) < 0.06, `under a high Sun the same slope barely shows (${noon.toFixed(3)})`);
  check(E.reliefLight(v(2000), v(3000), v(2500), v(2500), 1, lowSunEast, K, 0) === 1, 'water is level');
  check(E.reliefLight(v(2000), v(3000), v(2500), v(2500), 1, [1, 0, 0], K) === 1, 'and at the terminator itself nothing is multiplied');
  check(Math.abs(E.reliefGain(1024) * 2 - K) < 1e-9, 'a map half as wide has half the gain: the same slope from either');
  const mesh = E.createEarth({});
  const u = mesh.material.uniforms;
  check(u.uHeightK.value.x === 0, 'no relief until a map arrives (tier 0 never fetches one)');
  const tex = new THREE.Texture();
  E.setEarthMap(mesh, 'relief', tex, { mono: true, px: [1024, 512] });
  check(u.uHeight.value === tex && Math.abs(u.uHeightK.value.x - E.reliefGain(1024)) < 1e-9 && u.uHeightK.value.y === 1 / 1024 && u.uHeightK.value.z === 1 / 512, 'the tier loader\'s map takes its slot with its own gain and texel');
  check(u.uNightMono.value === 0, 'and does not touch the night map\'s flag');
  E.setEarthMap(mesh, 'relief', null);
  check(u.uHeightK.value.x === 0 && u.uHeight.value !== tex, 'given back (the frame latch), the relief is off');
  const f = E.SURFACE_FRAG;
  check(/if \( uHeightK\.x > 0\.0 \) \{/.test(f) && /float land = 1\.0 - mix\( oceanGuess, texture2D\( uWater, vUv \)\.r, uHasWater \);/.test(f), 'the shader skips it whole without a map, and levels the water with the mask');
  check(f.includes('vec3 ground = dayTex * ( lambert * reliefLit * sunTint'), 'it multiplies the ground\'s daylight and nothing else');
  const { TEXTURES } = await load('data/textures.js');
  const row = TEXTURES.find((r) => r.id === 'earth-relief');
  check(row && row.world === 'earth' && row.slot === 'relief' && row.when === 'idle' && row.files.every((x) => x.tier >= 1 && x.format === 'mono'), 'registry/textures.yaml: the relief is one channel, and no phone fetches it');
  const { WORLDS, worldRecords } = await load('scene/worlds.js');
  const rec = worldRecords ? worldRecords().find((r) => r.id === 'earth') : null;
  if (rec) check(/5 times steeper/.test(rec.meta.departure || '') && /2\.5 times taller/.test(rec.meta.departure || ''), `the Earth's card says both adjustments (${rec.meta.departure})`);
  else check(WORLDS.some((w) => w.id === 'earth'), 'the Earth is a world');
}

// --- 5. storm tops ---------------------------------------------------------------------------
{
  check(C.stormTop(-40) === 0 && C.stormTop(C.STORM_TOP.startC) === 0 && C.stormTop(-63.5) === 0.5 && C.stormTop(-80) === 1, 'a storm top starts at -52 C and is whole at -75 C');
  const W = 64; const H = 32;
  const opacity = new Uint8Array(W * H).fill(200);
  const tops = new Uint8Array(W * H);
  tops[10 * W + 20] = 255;
  const four = C.composeClouds([{ opacity, tops, subLonDeg: -67.5 }], W, H, 4);
  const two = C.composeClouds([{ opacity, tops, subLonDeg: -67.5 }], W, H);
  const at = (x, y) => ((H - 1 - y) * W + x) * 4;
  check(four.length === W * H * 4 && two.length === W * H * 2, 'four bytes a pixel for the Earth, two as before for who asks');
  check(four[at(20, 10) + 2] === 255 && four[at(21, 10) + 2] === 0 && four[at(20, 10) + 3] === 255, 'the third channel is the storm top, where the satellite sees');
  check(four[at(20, 10)] === two[((H - 1 - 10) * W + 20) * 2] && four[at(20, 10) + 1] === two[((H - 1 - 10) * W + 20) * 2 + 1], 'opacity and coverage are what they were');
  const f = E.SURFACE_FRAG;
  check(/gTops = l\.b \* l\.g \* uLive;/.test(f) && /float topDot = sunDot \+ 0\.069 \* tops;/.test(f), 'the shader reads it, and the Sun sets later on a top by the horizon\'s dip from 15 km');
  check(Math.abs(E.STORM_TOPS.dip - Math.sqrt((2 * 15) / 6371)) < 0.001 && Math.abs(E.STORM_TOPS.shadow - 15 / 8) < 0.05, 'the dip and the shadow\'s reach are 15 km\'s');
  const { COPY } = await load('copy/en.js');
  check(/coldest tops/.test(COPY.clouds.live), 'the Earth\'s card says the coldest tops are drawn higher and whiter');
}

if (problems.length) {
  console.error('atmo lut FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`atmo lut ok: the table within ${(worst * 100).toFixed(1)} % of a 20 000-step integration, the shell within ${(shellWorst * 100).toFixed(0)} % of #317's green toward the Sun, the same to ${(stepsWorst * 100).toFixed(1)} % from 8 steps to 400, and lit beside the terminator's poles, aerial perspective, relief and storm tops as their twins say`);
