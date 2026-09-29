// tests/test_air.mjs -- spec 0054 task 3: the air on Mars, Venus and Titan (scene/atmosphere.js).
//
// The shell's shader cannot run here, so this holds its JS twin (scatter) to what photographs show
// and to the physics it claims, the GLSL to the same formula, and the worlds to the rules for when a
// shell is drawn:
//
//   1. the rows: each world's radius is its worlds.js row's; the drawn height changes, the measured
//      optical depth does not
//   2. the light path: chapman() against a brute-force integration
//   3. the colours: Mars butterscotch by day and blue toward the Sun; Venus pale; Titan orange with a
//      bluer top; nothing on the night side; over the disc only the slant dims
//   4. the GLSL carries the same formula and the two bounded hit tests
//   5. in the scene: no shell from the default view, one when the disc is big, the rim back when it is
//      off, and off for good under the frame latch

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const A = await import(join(JS, 'scene/atmosphere.js'));
const { ATMO_PARAMS, atmosphereCoefficients, verticalDepth, scatter, chapman, createAirShell, AIR_SHELL_FRAG, VIEW_STEPS } = A;
const { WORLDS, createWorlds, AIR_AT_HALF_VIEW, TEXTURE_AT_HALF_VIEW } = await import(join(JS, 'scene/worlds.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const measured = [];
const f3 = (v) => v.map((x) => x.toFixed(3)).join(' ');
const norm = (v) => { const l = Math.hypot(...v); return v.map((x) => x / l); };

// ---- 1. the rows --------------------------------------------------------------------------------
const byId = new Map(WORLDS.map((w) => [w.id, w]));
check(Object.keys(ATMO_PARAMS).sort().join() === 'mars,titan,venus', `ATMO_PARAMS holds Mars, Venus and Titan (${Object.keys(ATMO_PARAMS).join(', ')})`);
for (const [key, p] of Object.entries(ATMO_PARAMS)) {
  const w = byId.get(key);
  check(w && w.look.air === key, `${key}'s worlds.js row names its air`);
  check(w && p.radiusKm === w.radiusKm, `${key}'s air is on its own radius (${p.radiusKm} against ${w && w.radiusKm})`);
  const c = atmosphereCoefficients(p);
  // tau straight up through the particles is the row's measured one, whatever the drawn height.
  const tauUp = c.extM[1] * c.hM * (1 - Math.exp(-(c.top - 1) / c.hM));
  check(near(tauUp, p.dustTau, 0.01 * p.dustTau), `${key}: the particles' vertical optical depth is the row's ${p.dustTau} at the drawn height (${tauUp.toFixed(3)})`);
  const g2 = atmosphereCoefficients({ ...p, heightGain: (p.heightGain || 1) * 2 });
  const tau2 = g2.extM[1] * g2.hM * (1 - Math.exp(-(g2.top - 1) / g2.hM));
  check(near(tau2, tauUp, 0.01 * tauUp), `${key}: drawing the air twice as thick does not make it twice as dense`);
  check(p.dustAlbedo.every((a) => a > 0 && a <= 1) && p.dustG.every((g) => g >= 0 && g < 0.9), `${key}: albedos in (0, 1], asymmetries in [0, 0.9)`);
  check(near(verticalDepth(c, 1), c.betaR[1] * c.hR * (1 - Math.exp(-(c.top - 1) / c.hR)) + tauUp, 1e-9), `${key}: verticalDepth is gas plus particles, straight up`);
}
check(ATMO_PARAMS.mars.gasHKm === 11.1, 'Mars: the fact sheet\'s 11.1 km scale height');
check(ATMO_PARAMS.titan.heightGain === 1, 'Titan\'s haze is drawn at its measured height');
check(!byId.get('uranus').look.air && !byId.get('neptune').look.air && byId.get('uranus').look.rim && byId.get('neptune').look.rim,
  'Uranus and Neptune keep #318\'s rim and have no shell');

// ---- 2. the light path --------------------------------------------------------------------------
{
  function brute(H, hAlt, c) {
    const d = [Math.sqrt(1 - c * c), c];
    let tau = 0; const N = 20000; const L = 3;
    for (let i = 0; i < N; i++) {
      const s = ((i + 0.5) * L) / N;
      const r = Math.hypot(d[0] * s, 1 + hAlt + d[1] * s);
      if (r < 1) return Infinity;
      tau += (Math.exp(-(r - 1) / H) * L) / N;
    }
    return tau;
  }
  let worst = 0; let worstHigh = 0;
  for (const H of [0.0098, 0.0175, 0.031]) {
    for (const hk of [0, 1, 3, 6]) {
      for (const c of [1, 0.7, 0.5, 0.3, 0.1, 0.03, 0, -0.03, -0.1]) {
        const b = brute(H, hk * H, c);
        if (!Number.isFinite(b)) continue;
        const e = Math.abs((H * chapman(1 / H, hk, c)) / b - 1);
        worst = Math.max(worst, e);
        if (c >= 0.5) worstHigh = Math.max(worstHigh, e);
      }
    }
  }
  check(worst < 0.13, `chapman() is within 13 % of a 20 000-step integration from overhead to below the horizon (worst ${(worst * 100).toFixed(1)} %)`);
  check(worstHigh < 0.06, `and within 6 % with the Sun above 30 degrees (worst ${(worstHigh * 100).toFixed(1)} %)`);
  check(near(chapman(100, 0, 1), 1, 1e-12), 'straight up it is exactly one scale height of air');
  measured.push(`chapman() against brute force: worst ${(worst * 100).toFixed(1)} %, ${(worstHigh * 100).toFixed(1)} % above 30 degrees`);
}

// ---- 3. the colours -----------------------------------------------------------------------------
// A limb ray: the camera 10 radii out on +z, looking along -z past the limb at height k scale heights.
function limb(key, k, sun) {
  const p = ATMO_PARAMS[key];
  const h = (k * p.dustHKm * (p.heightGain || 1)) / p.radiusKm;
  return scatter(p, [0, 1 + h, 10], [0, 0, -1], norm(sun));
}
{
  const OVERHEAD = [0, 1, 0]; const BEHIND = [0, 0.05, -1];
  const m = limb('mars', 1, OVERHEAD).rgb;
  check(m[0] > m[1] && m[1] > m[2] && m[2] / m[0] > 0.35 && m[2] / m[0] < 0.6, `Mars's sunlit limb is butterscotch (${f3(m)})`);
  const mb = limb('mars', 1, BEHIND).rgb;
  check(mb[2] > mb[0], `Mars's limb with the Sun behind it is blue: the forward lobe narrower in blue (${f3(mb)})`);
  const v = limb('venus', 1, OVERHEAD).rgb;
  check(Math.max(...v) / Math.min(...v) < 1.2, `Venus's sunlit haze is pale, near white (${f3(v)})`);
  const vb = limb('venus', 2, BEHIND).rgb;
  check(vb[0] >= vb[2] && vb[1] > 1, `and backlit it is a bright warm ring (${f3(vb)})`);
  const t = limb('titan', 1, OVERHEAD).rgb;
  check(t[0] > t[1] && t[1] > t[2] && t[2] / t[0] < 0.7, `Titan's sunlit haze is orange (${f3(t)})`);
  const tTop = limb('titan', 8, OVERHEAD).rgb;
  check(tTop[2] / tTop[0] > t[2] / t[0], `and its top is bluer than its body (B/R ${(tTop[2] / tTop[0]).toFixed(2)} against ${(t[2] / t[0]).toFixed(2)})`);
  const tb = limb('titan', 3, BEHIND).rgb;
  check(tb[0] > 1 && tb[0] > tb[2], `backlit, Titan's haze is a bright orange ring (${f3(tb)})`);
  for (const key of Object.keys(ATMO_PARAMS)) {
    // The tangent point on +y with the Sun straight below it: all of that air is in the shadow.
    const night = limb(key, 1, [0, -1, 0]).rgb;
    check(Math.max(...night) < 1e-3, `${key}: nothing glows in the world's shadow (${f3(night)})`);
    const centre = scatter(ATMO_PARAMS[key], [0, 0, 4], [0, 0, -1], [0, 0, 1]);
    check(near(centre.T, 1, 1e-6), `${key}: at the disc's centre only the slant dims, and there is none (T ${centre.T.toFixed(3)})`);
    const edge = scatter(ATMO_PARAMS[key], [0, 0, 4], norm([0, 0.97, -4]), [0, 0, 1]);
    check(edge.T < 1 && edge.T > 0, `${key}: toward the limb the slant dims the map (T ${edge.T.toFixed(3)})`);
    const above = limb(key, 60, OVERHEAD);
    check(above.T === 1 && Math.max(...above.rgb) === 0, `${key}: above the shell nothing is drawn`);
    const low = limb(key, 0.5, OVERHEAD);
    check(low.T < 0.5, `${key}: a star behind the low air is dimmed (T ${low.T.toFixed(3)})`);
  }
  measured.push(`Mars limb by day ${f3(m)}, Sun behind ${f3(mb)}; Venus ${f3(v)}, backlit ${f3(vb)}; Titan ${f3(t)}, top ${f3(tTop)}, backlit ${f3(tb)}`);
}

// ---- 4. the GLSL --------------------------------------------------------------------------------
{
  check(new RegExp(`const int VIEW_STEPS = ${VIEW_STEPS};`).test(AIR_SHELL_FRAG) && VIEW_STEPS === 12, 'the shell marches 12 view steps, as the Earth\'s');
  check(!/LIGHT_STEPS/.test(AIR_SHELL_FRAG) && /float lR = uHR \* chapman\( 1\.0 \/ uHR, h \/ uHR, cosChi \);/.test(AIR_SHELL_FRAG), 'the light path is chapman(), not a march');
  check(/float c = sqrt\( 0\.5 \* PI \* \( X \+ h \) \);/.test(AIR_SHELL_FRAG) && /return c \/ \( \( c - 1\.0 \) \* cosChi \+ 1\.0 \);/.test(AIR_SHELL_FRAG), 'the GLSL chapmanUp is the twin\'s');
  check(/if \( sh > 0\.0 && sh < 1e8 \) continue;/.test(AIR_SHELL_FRAG), 'the shadow test does not count a miss (1e9) as a hit');
  check(/ground\.x > 0\.0 && ground\.x < 1e8 \? uVertical/.test(AIR_SHELL_FRAG), 'nor does the over-the-disc test');
  check(/gl_FragColor = vec4\( colour, \( T\.r \+ T\.g \+ T\.b \) \/ 3\.0 \);/.test(AIR_SHELL_FRAG), 'alpha is the grey transmittance');
  const shell = createAirShell('mars');
  const m = shell.material;
  check(m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.SrcAlphaFactor && m.depthWrite === false,
    'blending is src + dst x T, and the shell writes no depth');
  check(near(shell.scale.x, atmosphereCoefficients(ATMO_PARAMS.mars).top, 1e-12) && shell.userData.top === shell.scale.x, 'the shell is scaled to the drawn top of the air');
  check(createAirShell('pluto') === null, 'a world with no row gets no shell');
}

// ---- 5. in the scene ----------------------------------------------------------------------------
{
  stage.setWorld('earth');
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.001, 1e9);
  camera.position.set(0, 6, 22);
  camera.updateMatrixWorld();
  const scene = new THREE.Scene();
  scene.add(camera);
  const worlds = createWorlds(scene, { textureBase: null, camera });
  const t = Date.parse('2026-09-29T12:00:00Z');
  worlds.update(t);
  check(AIR_AT_HALF_VIEW === TEXTURE_AT_HALF_VIEW, 'the air turns on at the map\'s own threshold');
  for (const id of ['mars', 'venus', 'titan']) {
    const mesh = worlds.meshFor(id);
    check(mesh.userData.air && mesh.userData.air.visible === false, `from the default Earth view ${id}'s shell is off (disc ${worlds.discShare(id).toFixed(4)} of half the view): no draw call`);
    check(mesh.material.uniforms.uRimGain.value === byId.get(id).look.rim.gain, `and ${id} wears #318's rim meanwhile`);
  }
  // Fly to Mars: 3.4 drawn radii out, on the Sun's side.
  const mars = worlds.meshFor('mars');
  const sun = mars.material.uniforms.uSunDir.value;
  camera.position.copy(mars.position).addScaledVector(sun, mars.scale.x * 3.4);
  camera.lookAt(mars.position);
  camera.updateMatrixWorld();
  worlds.update(t);
  const air = mars.userData.air;
  check(air.visible === true, `close to Mars (disc ${worlds.discShare('mars').toFixed(2)} of half the view) its shell is on`);
  check(mars.material.uniforms.uRimGain.value === 0, 'and #318\'s rim is off, so the air is not drawn twice');
  check(air.material.side === THREE.FrontSide, 'from outside the shell draws its front, so the haze in front of the disc is drawn');
  check(air.material.uniforms.uSunDir.value.distanceTo(sun) < 1e-9, 'the shell is lit from the Sun\'s direction at Mars');
  camera.position.copy(mars.position).addScaledVector(sun, mars.scale.x * 1.02);
  camera.updateMatrixWorld();
  worlds.update(t);
  check(air.material.side === THREE.BackSide, 'inside the shell it draws its back');
  // The frame latch: the shell goes for good and the rim comes back.
  camera.position.copy(mars.position).addScaledVector(sun, mars.scale.x * 3.4);
  camera.updateMatrixWorld();
  worlds.setLatched(true);
  worlds.update(t);
  check(air.visible === false && mars.material.uniforms.uRimGain.value === byId.get('mars').look.rim.gain, 'under the frame latch the shell is off and #318\'s rim is back');
  worlds.dispose();
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`air FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('air ok: Mars, Venus and Titan wear single-scattering shells with their measured depths, in the colours photographs show, drawn only when the disc can show them and never under the latch');
