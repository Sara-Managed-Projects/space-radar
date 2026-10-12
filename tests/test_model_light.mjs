// tests/test_model_light.mjs -- the model material's small environment terms (public #266):
// the world's phase as a craft sees it, the Sun's rim, the panels' glint, and their tiers.
// Run: node tests/test_model_light.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const M = await import(join(ROOT, 'site/js/scene/models.js'));
const src = readFileSync(join(ROOT, 'site/js/scene/models.js'), 'utf8');
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// The diffuse sphere's phase: full, quarter (1/pi, the figure the cited page states), new.
assert.ok(near(M.lambertPhase(1), 1), 'full phase is all of it');
assert.ok(near(M.lambertPhase(0), 1 / Math.PI), 'quarter phase is 1/pi of full');
assert.ok(near(M.lambertPhase(-1), 0), 'a new world throws nothing back');
let last = 2;
for (let c = 1; c >= -1; c -= 0.05) { const p = M.lambertPhase(c); assert.ok(p <= last + 1e-12, 'the phase only falls as the world wanes'); last = p; }

// Near the ground the local term rules, far out the phase does.
const R = 6371;
const leo = R / (R + 420);
const geo = R / 42164;
assert.ok(near(M.shineDay(1, leo), 1) && near(M.shineDay(-1, leo), 0) && near(M.shineDay(-1, geo), 0), 'noon is full and midnight is none at any height');
assert.ok(M.shineDay(0, 1) < 0.15, `a rover at sunset is lit by ground that is nearly dark (${M.shineDay(0, 1).toFixed(3)})`);
assert.ok(Math.abs(M.shineDay(0, geo) - 1 / Math.PI) < 0.01, 'from geostationary height a half Earth is a quarter-phase sphere');
assert.ok(M.shineDay(0, 6371 / 384400) > M.shineDay(0, leo), 'the far view of a half-lit world is brighter than the ground under a craft at the terminator');
assert.ok(src.includes('mix( phase, smoothstep( -0.15, 0.55, cA ), cover * cover )'), 'the shader blends the same two terms by cover squared');

// The rim: only with the Sun behind the craft, only on an edge, only on faces the Sun reaches.
const edge = { fresnel: 1, intoSun: 1, facingSun: 0.2 };
assert.ok(near(M.sunRimStrength(edge), M.SUN_RIM), 'a back-lit edge gets the whole rim');
assert.equal(M.sunRimStrength({ ...edge, intoSun: -0.5 }), 0, 'none with the Sun behind the camera');
assert.equal(M.sunRimStrength({ ...edge, fresnel: 0 }), 0, 'none on a face square to the eye');
assert.equal(M.sunRimStrength({ ...edge, facingSun: -0.9 }), 0, 'none on a face the Sun cannot reach');
assert.ok(M.sunRimStrength({ ...edge, intoSun: 0.5 }) < M.SUN_RIM / 3, 'and it falls quickly off the line to the Sun');

// The glint: a flash on the mirror direction, half as bright GLINT_HALF_DEG off it, gone at 10.
assert.ok(near(M.glintStrength(0), M.GLINT_GAIN), 'on the mirror direction, all of it');
assert.ok(Math.abs(M.glintStrength(M.GLINT_HALF_DEG) / M.GLINT_GAIN - 0.5) < 0.01, 'half at the half-width');
assert.ok(M.glintStrength(10) < 1e-6 * M.GLINT_GAIN, 'ten degrees off there is no flash');
assert.ok(M.GLINT_POWER > 1000 && M.GLINT_POWER < 1300, `the lobe for a 2 degree half-width (${M.GLINT_POWER})`);
assert.ok(src.includes('`    if ( uGlint > 0.0 && uSpec > 0.3 )'), 'panels only: the foil and the body have no glint');

// The rim's edge is broader than the material's own, so it can be told from it (internal #484 item 2).
assert.ok(M.SUN_RIM_EXPONENT < 2.5 && M.SUN_RIM_EXPONENT >= 1, 'the Sun\'s rim reaches further in than the Fresnel rim');
assert.ok(src.includes('${SUN_RIM_EXPONENT.toFixed(1)}') && src.includes('uRimSun * fr * back * back'), 'the shader uses it');
assert.ok(Math.pow(1 - Math.cos(Math.PI / 4), M.SUN_RIM_EXPONENT) > 3 * Math.pow(1 - Math.cos(Math.PI / 4), 2.5), 'at 45 degrees off the eye the Sun\'s rim is over three times the old one');

// Tiers: none, the rim, the rim and the glint; an out-of-range tier is clamped.
assert.deepEqual(M.setLightTier(0), { rim: 0, glint: 0 });
assert.deepEqual(M.setLightTier(1), { rim: M.SUN_RIM, glint: 0 });
assert.deepEqual(M.setLightTier(2), { rim: M.SUN_RIM, glint: M.GLINT_GAIN });
assert.deepEqual(M.setLightTier(9), M.setLightTier(2));
assert.deepEqual(M.setLightTier(undefined), M.setLightTier(0));
const heroes = readFileSync(join(ROOT, 'site/js/scene/heroes.js'), 'utf8');
assert.ok(/M\.setLightTier\(ctx\.latch && ctx\.latch\.latched \? 0 :/.test(heroes), 'the frame-rate latch takes both away');

// No environment map and no pass after the frame: the terms live in the material.
assert.ok(!/PMREMGenerator|envMap\s*[:=]|scene\.environment/.test(src), 'no image-based lighting in the model material');

console.log(`model light ok: phase 1, ${(1 / Math.PI).toFixed(3)}, 0 at full, quarter and new; the rim ${M.SUN_RIM} only against the Sun; a glint ${M.GLINT_GAIN} wide ${M.GLINT_HALF_DEG} degrees (cos^${M.GLINT_POWER}); three tiers`);
