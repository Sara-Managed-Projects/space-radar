// tests/test_gasmat.mjs -- the gas material of internal spec 0075 (task 8, design section 7):
// the steps by tier, the march's arithmetic mirrored in JS, the densities the GLSL and the JS share,
// the seeded noise, and THE COLOUR AND ALPHA POLICY held for every deep material (task 9, DS-A08).
//
//   node tests/test_gasmat.mjs
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const G = await import(join(JS, 'scene/deep/gasmat.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- the steps (design section 5) ---------------------------------------------------------------
{
  const s = (o) => G.marchSteps(o);
  check(s({ tier: 0, rPx: 400 }) === 0, 'T0 marches nothing: shells');
  check(s({ tier: 2, latched: true, rPx: 400 }) === 0, 'the latch marches nothing');
  check(s({ tier: 1, rPx: 400 }) === 16 && s({ tier: 1, rPx: 60 }) === 12, `T1 is 12 to 16 steps (${s({ tier: 1, rPx: 400 })}, ${s({ tier: 1, rPx: 60 })})`);
  check(s({ tier: 2, rPx: 400 }) === 32 && s({ tier: 2, rPx: 100 }) === 24, 'T2 is 24 to 32 steps');
  check(s({ tier: 2, top: true, selected: true, rPx: 320 }) === 48, 'Ultra marches 48 for the selected hero at 300 px or more');
  check(s({ tier: 2, top: true, selected: false, rPx: 320 }) === 32 && s({ tier: 2, top: true, selected: true, rPx: 200 }) === 24, 'and only then');
  check(s({ tier: 2, rPx: 400, frameMs: 30 }) < 24 && s({ tier: 2, rPx: 400, scaleStep: 1 }) < 24, 'slow frames or a governor step lower the steps first (requirement 18)');
  check(s({ tier: 2, rPx: 400, scaleStep: 3 }) >= 6, 'never below six');
  check(G.holderSteps({ tier: 0 }) === 0 && G.holderSteps({ tier: 1, latched: true }) === 0 && G.holderSteps({ tier: 1 }) > 0, 'a holder is shells on T0 and under the latch');
}

// --- the march, mirrored ------------------------------------------------------------------------
{
  // constant density over a chord L: C = (1 - exp(-sigma rho L)) / sigma, T = exp(-sigma rho L)
  const n = 400, L = 2, rho = 0.7, sigma = 0.9;
  const { C, T } = G.marchJs({ rho: new Array(n).fill(rho), sigma, ds: L / n });
  check(near(T, Math.exp(-sigma * rho * L), 1e-9), `transmittance is exp(-sigma rho L) (${T})`);
  check(near(C, (1 - Math.exp(-sigma * rho * L)) / sigma, 4e-3), `emission is integrated under its own absorption (${C})`);
  const thin = G.marchJs({ rho: new Array(n).fill(rho), sigma: 0, ds: L / n });
  check(near(thin.C, rho * L, 1e-9) && thin.T === 1, 'pure emission adds its column and absorbs nothing');
  const thick = G.marchJs({ rho: new Array(n).fill(50), sigma: 1, ds: L / n });
  check(thick.T < 0.02, 'a march exits once transmittance is under 2 %');
}

// --- the densities: JS and GLSL are one table ---------------------------------------------------
{
  for (const k of Object.values(G.KINDS)) {
    check(G.densityJs(k, 1) === 0 && G.densityJs(k, 0.999) >= 0, `kind ${k} is zero at its edge`);
    check(G.columnJs(k) > 0, `kind ${k} has a column`);
  }
  const src = G.SHADERS.density;
  for (const c of ['-5.0 * r', '-70.0 * r2', '0.22 * exp( -3.2 * r2 )', '1.0 + r2 / 0.03', '( r - 0.62 ) / 0.17', '( r - 0.8 ) / 0.07']) check(src.includes(c), `the GLSL density holds "${c}" as densityJs does`);
  const jsSrc = readFileSync(join(JS, 'scene/deep/gasmat.js'), 'utf8');
  for (const c of ['-70 * r2', '0.22 * Math.exp(-3.2 * r2)', '(1 + r2 / 0.03)', '(r - 0.62) / 0.17', '(r - 0.8) / 0.07']) check(jsSrc.includes(c), `densityJs holds "${c}"`);
  // The shader "compiles" as far as node can tell: braces balance, the loop bound is a constant,
  // every uniform it reads is declared, and no pass-only word is in it.
  for (const [name, s] of Object.entries(G.SHADERS)) {
    let depth = 0; for (const ch of s) { if (ch === '{') depth++; if (ch === '}') depth--; if (depth < 0) break; }
    check(depth === 0, `the ${name} shader's braces balance`);
  }
  const frag = G.SHADERS.march;
  check(/for \( int i = 0; i < 48; i\+\+ \)/.test(frag), 'the march loop has a constant bound (MAX_STEPS)');
  for (const u of [...frag.matchAll(/\b(u[A-Z]\w*)\b/g)].map((m) => m[1])) check(new RegExp(`uniform \\w+ ${u};`).test(frag), `the march declares ${u}`);
  check(!/colorspace_fragment|tonemapping_fragment/.test(frag + G.SHADERS.shell), 'the gas shades in display values: no colour-space or tone-mapping chunk (COLOUR_POLICY)');
}

// --- T0 has no layers, and a holder never veils the view (internal #845; review of #1178) ---------
{
  // The closed form is the soft profile's own column: against a fine numerical integral of densityJs.
  for (const [b2, s0, s1] of [[0, -1, 1], [0.25, -0.866, 0.866], [0.5, 0, 0.7071], [0.81, -0.2, 0.4359]]) {
    let num = 0; const n = 4000;
    for (let i = 0; i < n; i++) { const sx = s0 + ((i + 0.5) / n) * (s1 - s0); num += G.densityJs(0, Math.sqrt(b2 + sx * sx)) * ((s1 - s0) / n); }
    check(Math.abs(G.softColumnJs(b2, s0, s1) - num) < 2e-4, `the T0 column in closed form matches the integral (b2 ${b2}: ${G.softColumnJs(b2, s0, s1).toFixed(5)} vs ${num.toFixed(5)})`);
  }
  // Seen from outside, across the disc, the column falls smoothly from the centre to the rim: no step.
  let prev = Infinity, smooth = true, maxJump = 0;
  for (let i = 0; i <= 400; i++) {
    const b2 = (i / 400) * 0.999, h = Math.sqrt(1 - b2);
    const c = G.softColumnJs(b2, -h, h);
    if (c > prev + 1e-9) smooth = false;
    if (Number.isFinite(prev)) maxJump = Math.max(maxJump, prev - c);
    prev = c;
  }
  check(smooth && maxJump < 0.01, `the T0 column falls monotonically and without a step across the object (largest step ${maxJump.toFixed(4)})`);
  check(!/uShellDr|Icosahedron/.test(G.SHADERS.soft) && /softColumn\( b2, s0, h \)/.test(G.SHADERS.soft), 'the T0 shader integrates once per pixel: no shells to show');
  const t0mesh = G.createGasMesh(THREE, { kind: 0, march: false });
  check(t0mesh.mesh.geometry.getAttribute('position').count <= 1000 && t0mesh.material.side === THREE.BackSide, 'the T0 holder is one bounding sphere drawn by its back faces, not nested spheres');
  t0mesh.dispose();
  // From inside, only rays near the centre carry light; from outside, the outskirts fall away (E²).
  const ro = [0.5, 0, 0];
  const toCentre = G.holderShapeJs(1, ro, [-1, 0, 0]);
  const away = G.holderShapeJs(1, ro, [1, 0, 0]);
  const sideways = G.holderShapeJs(1, ro, [0, 1, 0]);
  check(toCentre > 0.99 && away < 0.02, `inside, a ray through the centre keeps its light (${toCentre.toFixed(2)}) and one away from it has none (${away.toFixed(3)})`);
  check(sideways < 0.3, `inside, a ray that misses the centre by half a radius is dim (${sideways.toFixed(2)})`);
  check(Math.abs(G.holderShapeJs(0.3, [0, 0, 3], [0, 0, -1]) - 0.09) < 1e-9, 'outside, a holder\'s light is the column squared: its outskirts fall away');
  check(/if \( uHolder > 0\.5 \) E = holderShape\( E, ro, rd \);/.test(G.SHADERS.march) && /holderShape/.test(G.SHADERS.soft), 'both holder shaders shape the light the same way');
  const h = G.createGasMesh(THREE, { kind: 0, holder: true }), hero = G.createGasMesh(THREE, { kind: 0 });
  check(h.material.uniforms.uHolder.value === 1 && hero.material.uniforms.uHolder.value === 0, 'a holder is shaped; a hero\'s own gas is not');
  h.dispose(); hero.dispose();
}

// --- the noise: baked, seeded, the same every run -----------------------------------------------
{
  const a = G.noiseVolume(16, 7), b = G.noiseVolume(16, 7), c = G.noiseVolume(16, 8);
  check(a.length === 16 ** 3 && a.every((v, i) => v === b[i]), 'the noise volume is the same for the same seed');
  check(a.some((v, i) => v !== c[i]), 'and another for another seed');
  const mean = a.reduce((x, y) => x + y, 0) / a.length;
  check(mean > 60 && mean < 200, `its values spread over the byte (${mean.toFixed(0)})`);
}

// --- THE COLOUR AND ALPHA POLICY, for every deep material (task 9) ------------------------------
{
  const P = G.COLOUR_POLICY;
  check(P.values === 'display' && P.toneMapped === false && P.transparent === false && P.depthWrite === false, 'the policy is written down: display values, no tone mapping, opaque list, no depth write');
  const mats = [];
  const emit = G.createGasMaterial(THREE, { kind: 1 });
  const dust = G.createGasMaterial(THREE, { kind: 0, absorbing: true, sigma: 2 });
  const shells = G.createShellMaterial(THREE, { kind: 5 });
  const mesh = G.createGasMesh(THREE, { kind: 2, march: true, noise: G.noiseTexture(THREE, 8) });
  const shellMesh = G.createGasMesh(THREE, { kind: 2, march: false });
  mats.push(['emission', emit], ['absorbing', dust], ['shells', shells], ['mesh', mesh.material], ['shell mesh', shellMesh.material]);
  // and every hero module's materials, built from a profile with one gas layer
  for (const f of readdirSync(join(JS, 'scene/deep')).filter((n) => n.endsWith('.js'))) {
    const mod = await import(join(JS, 'scene/deep', f));
    if (typeof mod.createHero !== 'function') continue;
    const hero = mod.createHero(THREE, { profile: { id: 'test', layers: [{ kind: 'gas', what: 'shell', profile: 5 }] }, gas: G });
    hero.group.traverse((o) => { if (o.material) mats.push([`${f} ${o.name}`, o.material]); });
    hero.dispose();
  }
  check(mats.length >= 8, `every deep material was built (${mats.length})`);
  for (const [name, m] of mats) {
    check(m.transparent === false && m.toneMapped === false && m.depthWrite === false, `${name}: transparent false, toneMapped false, depthWrite false`);
    const add = m.blending === THREE.AdditiveBlending;
    const over = m.blending === THREE.CustomBlending && m.blendSrc === THREE.OneFactor && m.blendDst === THREE.OneMinusSrcAlphaFactor;
    check(add || over, `${name}: additive for emission or premultiplied "over" for absorbing gas, nothing else`);
  }
  check(dust.blending === THREE.CustomBlending, 'absorbing gas is premultiplied over: it darkens what is behind it');
  // Additive blending multiplies by the source alpha: emission must write alpha 1, absorbing gas 1 - T.
  check(/#ifdef GAS_ABSORB[\s\S]*1\.0 - T[\s\S]*#else[\s\S]*vec4\( col, 1\.0 \)/.test(G.SHADERS.march), 'the gas writes alpha 1 when it adds light and 1 - T when it absorbs');
  for (const [name, m] of mats) {
    const absorbs = m.blending === THREE.CustomBlending;
    check(absorbs === ('GAS_ABSORB' in (m.defines || {})), `${name}: its alpha matches its blend (GAS_ABSORB ${absorbs ? 'on' : 'off'})`);
  }
  check(emit.side === THREE.BackSide, 'the march draws back faces, so the camera may be inside');
  emit.dispose(); dust.dispose(); shells.dispose(); mesh.dispose(); shellMesh.dispose(); G.disposeNoise();
}

// --- under the Measured look ---------------------------------------------------------------------
{
  check(G.UNDER_MEASURED.noise === 'hidden' && G.UNDER_MEASURED.drift === 'still', 'under Measured the noise goes and the gas is held still');
  const v = G.createGasMesh(THREE, { kind: 1, noisy: true, march: true });
  v.setLook('measured', { dtMs: 60000 });
  check(v.material.uniforms.uNoiseAmp.value === 0 && v.material.uniforms.uTime.value === 0, 'Measured: no noise, no time');
  v.setLook('film', { dtMs: 60000 });
  check(v.material.uniforms.uNoiseAmp.value === 1 && v.material.uniforms.uTime.value > 0 && v.material.uniforms.uTime.value <= 0.0101, 'Film: noise, and at most 1 % of a feature a minute');
  v.setLook('film', { dtMs: 60000, frozen: true });
  const t = v.material.uniforms.uTime.value;
  v.setLook('film', { dtMs: 60000, reduced: true });
  check(v.material.uniforms.uTime.value === t, 'frozen under ?look=1 and under reduced motion');
  v.dispose();
}

if (problems.length) {
  console.error('gasmat FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('gasmat ok: steps by tier and governor, the march mirrored (transmittance and emission), one density table in JS and GLSL, seeded noise, the colour and alpha policy on every deep material, and the Measured rules');
