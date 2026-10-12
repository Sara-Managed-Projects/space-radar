// tests/test_cloudshell.mjs -- the Earth's clouds with height (spec 0072 requirement 6, scene/cloudshell.js).
//
// No network, no GPU. What is checked is every rule that decides what a visitor sees from low orbit:
//   1. a cloud top's height from its temperature: cold tops high, 2 to 12 km, and the live picture's
//      two channels read back to the same height the temperature gives;
//   2. WHEN: by the camera's height over the ground, with hysteresis, the shell and the flat layer
//      always summing to one; WHERE: toward the limb and under a low Sun, the flat layer elsewhere;
//   3. the steps by tier, none at tier 0 and none under the latch; the two meshes built, driven and
//      removed; the Measured look's true thickness;
//   4. a ray through a column is exactly as opaque as the flat layer there, in any number of steps
//      and at any slant; a level deck does not shade itself;
//   5. the shadow's reach grows as the Sun lowers and is bounded;
//   6. the light past the terminator: white, gold, orange, red, out; a high top after a low one;
//   7. the shaders: every uniform declared on both sides, the refused classes absent, no reserved
//      word, the surface's flat cloud term fading where the shell draws;
//   8. off the first visit, and the card says by how much the clouds are drawn thicker.

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const S = await import(join(JS, 'scene/cloudshell.js'));
const E = await import(join(JS, 'scene/earth.js'));
const C = await import(join(JS, 'scene/cloudcompose.js'));
const A = await import(join(JS, 'scene/atmosphere.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// ---- 1. height from temperature -------------------------------------------------------------------
const K = E.CLOUD_SHELL;
check(K.baseKm === 2 && K.topKm === 12 && K.thicker === 4 && S.CLOUD_THICKER === K.thicker, 'a slab from 2 to 12 km, drawn 4 times thicker');
check(E.cloudTopKmFromTemperature(30, 0) === 2 && E.cloudTopKmFromTemperature(-90, 0) === 12, 'the height is held between 2 and 12 km');
check(near(E.cloudTopKmFromTemperature(24 - 6.5 * 7, 0), 7, 1e-9), 'a top 45.5 C colder than clear sky at the equator is 7 km up (6.5 C a km)');
{
  let mono = true;
  let prev = -Infinity;
  for (let t = 30; t >= -90; t -= 1) { const h = E.cloudTopKmFromTemperature(t, 20); if (h < prev) mono = false; prev = h; }
  check(mono, 'colder is never lower');
  // What the live picture holds is the temperature in two channels: read back, it is the same height.
  let worst = 0;
  for (const lat of [0, 25, 45, 60]) {
    for (let t = 20; t >= -85; t -= 2.5) {
      const viaLive = E.cloudTopKmFromLive(C.irOpacity(t, lat), C.stormTop(t), lat);
      worst = Math.max(worst, Math.abs(viaLive - E.cloudTopKmFromTemperature(t, lat)));
    }
  }
  check(worst < 1.0, `the live picture's opacity and storm channel give the temperature's height within a km (worst ${worst.toFixed(2)})`);
  check(E.cloudTopKmFromLive(0, 0, 0) === 2 && E.cloudTopKmFromLive(1, 1, 0) === 12, 'no cloud is the base, a full storm top the top');
  check(E.cloudTopKmFromBrightness(0) === 2 && E.cloudTopKmFromBrightness(1) === 12 && E.cloudTopKmFromBrightness(0.5) === 7, 'without a temperature the brighter cloud is the higher');
}

// ---- 2. when and where ----------------------------------------------------------------------------------
{
  const F = S.SHELL_FADE;
  check(F.inKm[0] <= 2600 && F.inKm[1] >= 1500 && F.inKm[0] > F.inKm[1], 'the shell comes in as the camera comes down through about 2 000 km');
  check(F.outKm[0] > F.inKm[0] && F.outKm[1] > F.inKm[1], 'going up it leaves higher than it came (hysteresis)');
  let monoIn = true;
  let monoOut = true;
  let later = true;
  for (let h = 100; h < 5000; h += 20) {
    if (S.shellCurve(h + 20, true) > S.shellCurve(h, true)) monoIn = false;
    if (S.shellCurve(h + 20, false) > S.shellCurve(h, false)) monoOut = false;
    if (S.shellCurve(h, false) < S.shellCurve(h, true)) later = false;
  }
  check(monoIn && monoOut, 'each curve is monotonic in the camera\'s height');
  check(later, 'at any height the leaving curve holds at least as much shell as the arriving one');
  check(S.shellCurve(420, true) === 1 && S.shellCurve(420, false) === 1 && S.shellCurve(4000, true) === 0 && S.shellCurve(4000, false) === 0, 'all of it from the station\'s height, none from 4 000 km, on both');
  // The whole-Earth view: the home view's camera is tens of thousands of km up.
  check(S.shellCurve(20000, true) === 0 && S.shellCurve(20000, false) === 0, 'the whole-Earth view is the flat layer\'s');

  const fade = S.createShellFade();
  let sums = true;
  let jump = 0;
  let prev = 0;
  const walk = (from, to, n) => {
    for (let i = 0; i <= n; i++) {
      const r = fade.push(from + ((to - from) * i) / n, 16, true);
      if (!near(r.shell + r.flat, 1, 1e-12) || r.shell < 0 || r.shell > 1) sums = false;
      jump = Math.max(jump, Math.abs(r.shell - prev));
      prev = r.shell;
    }
  };
  walk(5000, 400, 600);
  check(fade.shell === 1 && fade.rising === false, 'low down it is all in, and now on the leaving curve');
  const mid = (F.inKm[1] + F.outKm[0]) / 2;
  walk(400, mid, 300);
  const held = fade.shell;
  walk(mid, 5000, 300);
  check(fade.shell === 0 && fade.rising === true, 'high up it is all flat layer again');
  walk(5000, mid, 300);
  check(held > fade.shell + 0.05, `at the same height there is more shell on the way up (${held.toFixed(2)}) than on the way down (${fade.shell.toFixed(2)})`);
  check(sums, 'the shell and the flat layer always sum to one');
  check(jump <= 16 / F.ms + 1e-9, `no frame changes the mix by more than its share of ${F.ms} ms (${jump.toFixed(4)})`);
  const cut = S.createShellFade();
  check(near(cut.push(420, 100, true).shell, 100 / F.ms, 1e-9), 'a cut to a low view fades, it does not pop');
  const off = S.createShellFade();
  for (let i = 0; i < 100; i++) off.push(420, 16, false);
  check(off.shell === 0, 'not allowed: no shell at any height');
  for (let i = 0; i < 100; i++) cut.push(420, 16, true);
  check(cut.shell === 1 && near(cut.push(420, 250, false).shell, 0.75, 1e-9), 'and taken away it fades out as it came');

  // WHERE: toward the limb and under a low Sun; straight down under a high Sun, the flat layer.
  const V = K.view;
  const U = K.sun;
  check(E.cloudShellShare(1, 1) === 0 && E.cloudShellShare(V[1], U[1]) === 0, 'straight down under a high Sun the flat layer draws the cloud, all of it');
  check(E.cloudShellShare(0.1, 1) === 1 && E.cloudShellShare(V[0], 1) === 1, 'toward the limb the shell draws it, whatever the Sun');
  check(E.cloudShellShare(1, 0.05) === 1 && E.cloudShellShare(1, -0.1) === 1, 'and under a low Sun, whatever the view');
  let mono = true;
  for (let m = 0; m < 1; m += 0.01) {
    if (E.cloudShellShare(m + 0.01, 1) > E.cloudShellShare(m, 1) + 1e-12 || E.cloudShellShare(1, m + 0.01) > E.cloudShellShare(1, m) + 1e-12) mono = false;
    const sh = E.cloudShellShare(m, 0.7);
    if (sh < 0 || sh > 1) mono = false;
  }
  check(mono, 'between, the share falls smoothly and stays within 0 and 1');
  check(V[0] < V[1] && V[1] <= 0.7 && U[0] < U[1] && U[1] <= 0.5, 'the bands: a view more than about 50 degrees from straight down, a Sun under about 20 degrees');
}

// ---- 3. steps, and the shell built and removed -----------------------------------------------------------
check(S.stepsFor(0) === 0 && S.stepsFor(1) === 8 && S.stepsFor(2) === 12 && S.stepsFor(7) === 12, 'no steps at tier 0, 8 at tier 1, 12 at tier 2');
check(S.stepsFor(1, true) === 0 && S.stepsFor(2, true) === 0, 'no steps under the latch');
check(S.LIGHT_STEPS === 2, 'two reads toward the Sun');
check(S.thickerFor('film') === K.thicker && S.thickerFor('measured') === 1 && S.thickerFor(undefined) === K.thicker, 'four times thicker under Film, true thickness under Measured');
check(S.UNDER_MEASURED && S.UNDER_MEASURED.thicker === 'hidden' && S.UNDER_MEASURED.shell === 'same', 'the module says what the Measured look does to it');
{
  const earth = E.createEarth({});
  const u = earth.material.uniforms;
  check(u.uShell && u.uShell.value === 0 && u.uCloudThick.value === K.thicker, 'the Earth starts with its flat cloud layer whole');
  const shell = S.createCloudShell({ earth });
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 2000 });
  check(u.uShell.value === 0 && !shell.state().on && !earth.userData.cloudShell, 'no cloud map: no shell');
  u.uHasClouds.value = 1;
  shell.tick({ tier: 0, altitudeKm: 420, dtMs: 2000 });
  check(u.uShell.value === 0 && !earth.userData.cloudShell, 'tier 0: nothing is built');
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 2000, saveData: true });
  check(u.uShell.value === 0 && !earth.userData.cloudShell, 'a connection that saves data: nothing is built');
  shell.tick({ tier: 1, altitudeKm: 20000, dtMs: 2000 });
  check(u.uShell.value === 0 && !earth.userData.cloudShell, 'the whole-Earth view: nothing is built');
  shell.tick({ tier: 1, dtMs: 2000 });
  check(u.uShell.value === 0 && !earth.userData.cloudShell, 'no camera to measure from: nothing is built');
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 500 });
  const mesh = earth.userData.cloudShell;
  const limb = earth.userData.cloudShellLimb;
  check(!!mesh && mesh.visible && !!limb && limb.visible && near(u.uShell.value, 0.5, 1e-9) && shell.state().steps === 8, 'from the station\'s height at tier 1: the shell, 8 steps, half way in after half a second');
  shell.tick({ tier: 2, altitudeKm: 420, dtMs: 2000 });
  check(u.uShell.value === 1 && mesh.material.uniforms.uSteps.value === 12 && limb.material.uniforms.uSteps.value === 12, 'tier 2: 12 steps in both meshes');
  const mu = mesh.material.uniforms;
  for (const name of ['uClouds', 'uLiveA', 'uLiveB', 'uLive', 'uLiveFade', 'uCloudOffset', 'uSunDirLocal', 'uShell', 'uCloudThick', 'uEclipse']) {
    check(mu[name] === u[name] && limb.material.uniforms[name] === u[name], `both meshes read the Earth's own ${name}, not a copy`);
  }
  check(mu.uCamLocal === limb.material.uniforms.uCamLocal && mu.uLimb.value === 0 && limb.material.uniforms.uLimb.value === 1, 'the two meshes differ only in which rays they draw');
  check(mesh.geometry === limb.geometry, 'and are one geometry');
  for (const m of [mesh, limb]) check(m.material.transparent && m.material.depthWrite === false && m.material.depthTest !== false, 'see-through, tested against the globe\'s depth, writing none');
  const air = earth.userData.atmosphere.renderOrder;
  check(mesh.renderOrder < 0 && mesh.renderOrder < air, 'the rays that reach the ground: drawn before the lines, the marks and the air');
  check(limb.renderOrder > air && limb.renderOrder < 2, 'the rays that miss it: drawn AFTER the air\'s glow, which a cloud on the horizon covers (under it, the limb was a white band)');
  const g = mesh.geometry;
  check(!g.attributes.normal && !g.attributes.uv && shell.state().gpuBytes < 200000, 'positions and an index only, under 200 kB');
  shell.tick({ tier: 2, altitudeKm: 420, dtMs: 16, look: 'measured' });
  check(u.uCloudThick.value === 1 && shell.state().thicker === 1, 'the Measured look: true thickness, in the shell and in its shadow');
  shell.tick({ tier: 2, altitudeKm: 420, dtMs: 16, look: 'film' });
  check(u.uCloudThick.value === K.thicker, 'and Film puts the factor back');
  shell.probe({ noLimb: true });
  shell.tick({ tier: 2, altitudeKm: 420, dtMs: 16 });
  check(mesh.visible && !limb.visible, 'a probe may leave the limb\'s rays out');
  shell.probe({ noLimb: false });
  shell.tick({ tier: 0, altitudeKm: 420, dtMs: 2000 });
  check(u.uShell.value === 0 && !mesh.visible && !limb.visible, 'demoted to tier 0: the flat layer is back');
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 2000 });
  shell.tick({ tier: 1, altitudeKm: 5000, dtMs: 2000 });
  check(u.uShell.value === 0 && !mesh.visible, 'climbed away: the flat layer is back');
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 2000 });
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 16, latched: true });
  check(u.uShell.value === 0 && !earth.userData.cloudShell && !earth.userData.cloudShellLimb && shell.state().steps === 0 && shell.state().latched, 'the latch takes the shell away and puts the flat layer back');
  shell.tick({ tier: 2, altitudeKm: 420, dtMs: 2000 });
  check(u.uShell.value === 0 && !earth.userData.cloudShell, 'and for good');
}

// ---- 4. as opaque as the flat layer, in any number of steps -----------------------------------------------
{
  let worst = 0;
  for (const n of [3, 8, 12, 400]) for (const alpha of [0.02, 0.1, 0.35, 0.7, 0.95]) for (const top of [2, 2.6, 4, 7, 12]) worst = Math.max(worst, Math.abs(S.columnAlpha(alpha, top, n) - alpha));
  check(worst < 1e-9, `a vertical ray through a column has the flat layer's opacity, in 3 steps or 400 (worst ${worst.toExponential(1)})`);
  check(S.stepTau(0.5, 6, 1.9, 1.5) === 0 && S.stepTau(0.5, 6, 6.5, 6.1) === 0 && S.stepTau(0.5, 6, 4.5, 4) > 0, 'cloud between the base and its top, none outside');
  check(S.stepTau(0, 6, 5, 4) === 0 && E.cloudSigma(0, 6) === 0, 'no coverage, no cloud');
  // The slab's mean between two heights is its shape's, by quadrature.
  let off = 0;
  for (const top of [2, 3.5, 5, 9, 12]) {
    for (const [ha, hb] of [[1, 13], [2.2, 2.9], [4, 4.4], [8.9, 9.6], [11, 3], [5, 5.01]]) {
      let sum = 0;
      const N = 4000;
      for (let i = 0; i < N; i++) { const h = ha + ((hb - ha) * (i + 0.5)) / N; sum += E.cloudSlabMean(h, h, top); }
      off = Math.max(off, Math.abs(sum / N - E.cloudSlabMean(ha, hb, top)));
    }
  }
  check(off < 1e-4, `the mean of the slab between two heights is exact (worst ${off.toExponential(1)})`);
  check(E.cloudSlabMean(5, 6, 9) === 1 && E.cloudSlabMean(12.5, 13, 12) === 0 && E.cloudSlabMean(1, 1.9, 9) === 0, 'whole inside, nothing above the top or under the base');
  // The limb: a step counts the HEIGHT it crosses, so a ray at any slant crosses what a vertical one would,
  // and a ray along the limb, down into the slab and out again, crosses each cloud at most twice.
  const down = S.stepTau(0.6, 9, 12, 2);
  check(Math.abs(1 - Math.exp(-down) - 0.6) < 1e-9, 'top to bottom through a column is the flat layer\'s opacity, whatever the length of the path');
  check(Math.abs(S.stepTau(0.6, 9, 12, 7) + S.stepTau(0.6, 9, 7, 12) - 2 * S.stepTau(0.6, 9, 12, 7)) < 1e-12 && 2 * S.stepTau(0.6, 9, 12, 7) < 2 * down, 'a ray that dips to 7 km and climbs out crosses less than twice the column');
  check(S.stepTau(0.6, 9, 8, 8) === 0 && S.stepTau(0.6, 9, 11, 10) === 0, 'a ray running level inside a cloud, or above its top, adds nothing: no white wall on the limb');
  // Self-shadow: a level deck shades itself by nothing; more cloud toward the Sun darkens, less brightens a little.
  check(S.selfShade(2, 2) === 1, 'a level deck is not shaded by itself');
  check(S.selfShade(3, 1) < 1 && S.selfShade(1e6, 0) > S.LIGHT.shadeFloor - 1e-3 && S.selfShade(1e6, 0) >= S.LIGHT.shadeFloor && S.LIGHT.shadeFloor >= 0.3, 'a higher neighbour toward the Sun throws a shadow, never to black');
  check(S.selfShade(0, 3) > 1 && S.selfShade(0, 1e6) <= S.LIGHT.lift && S.LIGHT.lift <= 1.15, 'the side that faces the Sun is a little brighter, never by more than 15 %');
  {
    let mono = true;
    let step = 0;
    let prev = S.selfShade(-20, 0);
    for (let t = -20; t <= 20; t += 0.05) { const v = S.selfShade(t, 0); if (v > prev + 1e-12) mono = false; step = Math.max(step, prev - v); prev = v; }
    // The steepest it may be is its slope at nothing in the way: (1 - floor) x gain per unit of optical depth.
    check(mono && step <= (1 - S.LIGHT.shadeFloor) * S.LIGHT.shadeGain * 0.05 + 1e-9 && S.LIGHT.shadeGain <= 1, `more cloud in the way is never brighter, and the shade has no step in it (largest ${step.toFixed(4)} per 0.05 of optical depth)`);
  }
}

// ---- 5. the shadow's reach -----------------------------------------------------------------------------------
{
  let grows = true;
  let prev = -1;
  for (let mu = 1; mu >= -0.2; mu -= 0.01) { const d = E.cloudShadowOffsetKm(8, mu); if (d < prev - 1e-9) grows = false; prev = d; }
  const cap = K.topKm * K.thicker * K.shadowTanMax;
  check(grows, 'the shadow falls further from its cloud as the Sun lowers');
  check(E.cloudShadowOffsetKm(8, 1) === 0, 'and under it at noon');
  check(near(E.cloudShadowOffsetKm(8, Math.SQRT1_2), 8 * K.thicker, 1e-6), 'at 45 degrees it is as far off as the drawn top is high');
  check(E.cloudShadowOffsetKm(K.topKm, 0) === cap && E.cloudShadowOffsetKm(K.topKm, -1) === cap && cap <= 400, `and never further than ${cap} km`);
  check(E.cloudShadowOffsetKm(10, 0.3) > E.cloudShadowOffsetKm(4, 0.3), 'a higher top throws it further');
  check(near(E.cloudShadowOffsetKm(8, 0.3, 1) * K.thicker, E.cloudShadowOffsetKm(8, 0.3), 1e-9), 'and at true thickness it is that many times shorter');
}

// ---- 6. the light past the terminator ---------------------------------------------------------------------------
{
  const noon = S.cloudSunColour(1, 8);
  check(noon.every((x) => near(x, 1, 1e-9)), 'white under an overhead Sun');
  const above = A.aerialSun(0.2, Math.exp(-8 / 8));
  check(S.cloudSunColour(0.2, 8).every((x, i) => near(x, above[i], 1e-9)), 'above the horizon it is the air\'s own colour above the cloud (atmosphere.js aerialSun)');
  const gold = S.cloudSunColour(0.03, 10);
  const orange = S.cloudSunColour(-0.01, 10);
  const red = S.cloudSunColour(-0.035, 10);
  check(gold[0] > gold[1] && gold[1] > gold[2] && gold[1] / gold[0] > 0.6, 'gold a little above the horizon');
  check(orange[1] / orange[0] < gold[1] / gold[0] && orange[1] / orange[0] > red[1] / red[0], 'then orange, then red: the green goes after the blue');
  check(red[0] > 0.1 && red[2] < 0.01, 'a high top is still lit red where the ground is in twilight');
  check(S.cloudSunColour(-0.035, 3).every((x) => x < 0.01), 'a low top there is already dark');
  check(S.cloudSunColour(-0.07, 12).every((x) => x === 0), 'and the highest is dark once the Earth is in the way');
  let mono = true;
  let prev = Infinity;
  for (let mu = 0.5; mu >= -0.1; mu -= 0.005) { const r = S.cloudSunColour(mu, 10)[0]; if (r > prev + 1e-9) mono = false; prev = r; }
  check(mono, 'it only dims as the Sun goes down');
  const skyNoon = S.cloudSkyColour(1);
  const skyDusk = S.cloudSkyColour(0);
  check(skyNoon.every((x) => Math.abs(x) < 1e-12), 'the sky adds nothing under an overhead Sun');
  check(skyDusk[2] > skyDusk[0] && skyDusk.every((x) => x > 0.02 && x < 0.15), 'in twilight it is a dim blue-grey: a cloud the beam has left is not a black hole');
  // No cliff at a storm's edge: the height is a slope in both of the picture's channels.
  let cliff = 0;
  for (let o = 0; o <= 1; o += 0.05) for (let st = 0; st < 1; st += 0.01) cliff = Math.max(cliff, Math.abs(E.cloudTopKmFromLive(o, st + 0.01, 10) - E.cloudTopKmFromLive(o, st, 10)));
  check(cliff < 0.06, `a storm top's edge is a slope (${cliff.toFixed(3)} km per hundredth of the storm channel)`);
}

// ---- 7. the shaders ---------------------------------------------------------------------------------------------
{
  const F = S.CLOUD_FRAG;
  const code = F.replace(/\/\/.*$/gm, '');
  const earth = E.createEarth({});
  earth.material.uniforms.uHasClouds.value = 1;
  const shell = S.createCloudShell({ earth });
  shell.tick({ tier: 1, altitudeKm: 420, dtMs: 100 });
  const mat = earth.userData.cloudShell.material;
  const declared = [...code.matchAll(/^uniform\s+\w+\s+(\w+)\s*;/gm)].map((m) => m[1]);
  const given = Object.keys(mat.uniforms);
  check(declared.length >= 18 && new Set(declared).size === declared.length, `the shader declares its uniforms once each (${declared.length})`);
  for (const name of declared) check(given.includes(name), `the shader's ${name} is not among the material's uniforms`);
  for (const name of given) check(declared.includes(name), `the material's ${name} is not declared in the shader`);
  for (const name of given) check(mat.uniforms[name] && mat.uniforms[name].value !== undefined, `the material's ${name} has no value (the Earth no longer has that uniform)`);
  for (const name of declared) check(new RegExp(`\\b${name}\\b`).test(code.replace(/^uniform.*$/gm, '')), `the shader declares ${name} and never reads it`);
  check(/logdepthbuf_fragment/.test(F) && /tonemapping_fragment/.test(F) && /colorspace_fragment/.test(F), 'log depth, tone mapping and the output colour space, as every material here');
  const src = readFileSync(join(JS, 'scene/cloudshell.js'), 'utf8');
  for (const word of ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'BloomPass', 'LensflareElement', 'WebGLRenderTarget', 'FullScreenQuad', 'OrthographicCamera', 'Data3DTexture', 'sampler3D', 'TextureLoader', 'fetch(']) {
    check(!src.includes(word), `scene/cloudshell.js names ${word}: no post pass, no render target, no texture of its own`);
  }
  for (const word of ['patch', 'sample', 'half', 'filter', 'input', 'output', 'flat', 'smooth', 'common', 'partition', 'active', 'noise', 'fixed', 'packed', 'resource', 'external', 'interface', 'using', 'cast']) {
    check(!new RegExp(`(float|vec2|vec3|vec4|int)\\s+${word}\\b`).test(code), `a GLSL reserved word names a variable: ${word}`);
  }
  check(!/texture2D\(/.test(code) && /textureLod\( uLiveB/.test(code) && /textureLod\( uClouds/.test(code), 'every read in the loop names its mip level (no derivative inside a branch)');
  check(/float kx = x \/ \( 1\.0 \+ abs\( x \) \);/.test(code) && F.includes(`const float SHADE_GAIN = ${S.LIGHT.shadeGain.toFixed(3)};`), 'the shader shades as selfShade() does');
  check(new RegExp(`const int\\s+MAX_STEPS = ${Math.max(...S.TIER_STEPS)};`).test(F), 'the loop is bounded by the highest tier\'s steps');
  check(F.includes(`const float BASE_KM = ${K.baseKm.toFixed(2)};`) && F.includes(`const float TOP_KM = ${K.topKm.toFixed(2)};`) && /float rTop = 1\.0 \+ TOP_KM \* uCloudThick \/ A_KM;/.test(F) && !/THICKER/.test(F), 'the shader carries the slab\'s numbers, and its thickness is the uniform\'s');
  check(F.includes('cloudTopLiveKm( l.r, l.b, sinLat )') && F.includes('cloudTopMapKm( m )'), 'heights from the live picture\'s temperature where it covers, from the map\'s brightness elsewhere');
  check(/jitter/.test(code) && /gl_FragCoord/.test(code), 'each pixel starts its steps at its own depth');
  check(/float tau = sig \* cloudSlabMean\( ha, hb, col\.y \) \* abs\( hb - ha \);/.test(code) && !/dsKm/.test(code), 'the shader counts the height a step crosses, as stepTau() does, not the length of its path');
  check(/< CLEAR_BELOW \) discard;/.test(code) && S.CLEAR_BELOW <= 0.002, 'a pixel over clear sky is thrown away after one coarse read');
  check(!/uTime|uDrift/.test(code), 'nothing in the shell moves by itself: it reads the surface\'s drift');
  check(/\* uShell \* share \)/.test(code) && /float share = reaches \? cloudShellShare\( muV, muIn \) : 1\.0;\s*if \( share <= 0\.0 \) discard;/.test(code), 'the shell\'s alpha is times uShell and its share of the cloud there; where it has none the pixel is thrown away before a texture is read');
  check(code.indexOf('if ( share <= 0.0 ) discard;') < code.indexOf('cloudColumn( uvMid'), 'and that is before the first read');
  check(/bool reaches = ground\.x > 0\.0 && ground\.x < 1e8;\s*if \( reaches == \( uLimb > 0\.5 \) \) discard;/.test(code), 'a ray that reaches the ground is one mesh\'s, a ray that misses it the other\'s');
  check(/aerial\( acc \/ alpha, muV, muIn, cosVS, airLit/.test(code), 'a cloud toward the limb is seen through the same air the surface\'s is');
  check(F.includes(`const float LIMB_GAIN = ${(A.AERIAL.limbGain - 1).toFixed(3)};`) && F.includes(`const float LIMB_FROM = ${A.AERIAL.limbFrom.toFixed(2)};`) && /airAdds \/ \( 1\.0 \+ LIMB_GAIN \* smoothstep\( LIMB_FROM, 0\.0, muV \) \)/.test(code), 'a cloud on the horizon leaves out exactly the limb gain the surface\'s air has, so it can be seen against the glow');
  // The surface: its flat cloud term fades as the shell comes, and its shadow becomes the shell's.
  const G = E.SURFACE_FRAG;
  check(/uniform float uShell;/.test(G) && /float shellW = uShell > 0\.0 \? uShell \* cloudShellShare\( clamp\( dot\( n, viewDir \), 0\.0, 1\.0 \), sunDot \) : 0\.0;/.test(G) && /cloudAlpha \*= 1\.0 - shellW;/.test(G), 'the surface\'s flat cloud term is times one minus the shell\'s share there');
  check(/float cloudAir = cloudAlpha;\s*cloudAlpha \*= 1\.0 - shellW;/.test(G) && /1\.0 - 0\.6 \* cloudAir \)/.test(G), 'and the air over a cloud stays the air above it when the shell draws the cloud');
  check(/if \( shellW > 0\.0 \) \{[\s\S]{0,1400}shade = mix\( shade, 1\.0 - exp\( -tauSh[^;]*, shellW \);/.test(G), 'the ground\'s cloud shadow moves to the shell\'s, by the same number');
  check(/cloudSlabMean\( ha, hb, col\.y \)/.test(F) && /cloudSigma\( c \* uCloudGain, top \) \* cloudSlabMean\( ha, hb, top \)/.test(G), 'each step, in the shell and in its shadow, takes the slab\'s mean over the heights it crosses');
  check(G.includes(E.CLOUD_HEIGHT_GLSL) && F.includes(E.CLOUD_HEIGHT_GLSL), 'both shaders read a top\'s height with the same function');
  check(G.includes(`reach * uCloudThick * ${(1 / 6371).toFixed(8)}`) && G.includes(`min( sqrt( 1.0 - sunUp * sunUp ) / sunUp, ${K.shadowTanMax.toFixed(1)} )`), 'the shadow\'s reach in the shader is cloudShadowOffsetKm\'s');
  check(G.includes(`${C.CLEAR_SPAN_C.toFixed(1)} * o - max( 0.0, clearC - ${(C.CLEAR_SPAN_C + C.STORM_TOP.fullC).toFixed(1)} ) * storm`), 'and its temperatures are the composite\'s own numbers');
  check(/aerDaylight\( mu \) - aerSun\( mu \)/.test(F), 'a cloud takes the sky\'s light as the ground does');
}

// ---- 8. the boot path and the card ---------------------------------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(!/^import[^;]*from '\.\/scene\/cloudshell\.js'/m.test(main), 'main.js has no static import of scene/cloudshell.js');
  check(/function cloudShellWanted\(\) \{[\s\S]{0,400}tiers\.latched \|\| tiers\.tier < 1[\s\S]{0,300}__srFirstVisitOver[\s\S]{0,300}import\('\.\/scene\/cloudshell\.js'\)/.test(main), 'it is fetched after the first visit, at tier 1 and up, never under the latch');
  check(/cloudShellAsked \|\| tilesSaveData/.test(main), 'and never on a connection that saves data');
  check(/ctx\.cloudShell\.tick\(\{[\s\S]{0,200}latched: latch\.latched[\s\S]{0,200}look: ctx\.look/.test(main), 'the frame passes the tier, the latch and the look');
  check(/if \(ctx\.cloudShell\) ctx\.cloudShell\.latch\(\)/.test(main), 'the latch removes it');
  // main.js fetches it by the disc's size: at the map's lens that must be above where the fade begins.
  const at = Number((main.match(/const CLOUD_SHELL_AT = ([\d.]+);/) || [])[1]);
  const R = await import(join(JS, 'scene/renderer.js'));
  const fetchedAtKm = (1 / (at * Math.tan((R.CAMERA_FOV_DEG * Math.PI) / 360)) - 1) * E.WGS84_A_KM;
  check(fetchedAtKm > S.SHELL_FADE.outKm[0] && fetchedAtKm < 2 * S.SHELL_FADE.outKm[0], `main.js fetches it a little above where its fade begins (${Math.round(fetchedAtKm)} km against ${S.SHELL_FADE.outKm[0]})`);
  const html = readFileSync(join(JS, '../index.html'), 'utf8');
  check(!/modulepreload" href="js\/scene\/cloudshell\.js"/.test(html), 'and index.html does not preload it');
  const line = COPY.drawing.worldDeparture.earth;
  check(/\{clouds\} times thicker than they are/.test(line) && /low orbit/.test(line) && /true thickness under the Measured look/.test(line) && /measured temperature/.test(line) && /brightness elsewhere/.test(line), 'the Earth\'s card says from where the clouds have height, by how much they are drawn thicker, what Measured does, and where their heights come from');
  const W = await import(join(JS, 'scene/worlds.js'));
  const recs = typeof W.worldRecords === 'function' ? W.worldRecords() : null;
  const earthRec = recs && (Array.isArray(recs) ? recs.find((r) => r.id === 'earth' || (r.meta && r.meta.worldId === 'earth')) : null);
  if (earthRec) check(String(earthRec.meta.departure || '').includes(`drawn ${K.thicker} times thicker`), 'and by how much');
  else check(/clouds: String\(CLOUD_SHELL\.thicker\)/.test(readFileSync(join(JS, 'scene/worlds.js'), 'utf8')), 'and by how much');
}

if (problems.length) {
  console.error('cloud shell FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`cloud shell ok: heights 2 to 12 km from temperature, drawn ${K.thicker}x (1x under Measured); steps ${S.TIER_STEPS.join('/')}; in below ${S.SHELL_FADE.inKm.join('-')} km, out above ${S.SHELL_FADE.outKm.join('-')} km; toward the limb and under a low Sun only; shadow to ${K.topKm * K.thicker * K.shadowTanMax} km; shader uniforms and refusals`);
