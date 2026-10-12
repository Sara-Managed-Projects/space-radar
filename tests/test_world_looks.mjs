// Three worlds' own looks (public #404, #411, #417): Mercury's relief, Saturn's bands, Venus's soft
// terminator -- the shader carries each behind a uniform that is off everywhere else, the rows and
// the card say what is adjusted, and the relief is worn only where the tier allows.
// Run: node tests/test_world_looks.mjs
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { WORLDS, WORLD_FRAG, WORLD_VERT, worldMaterial, applyLook, reliefUniform, worldRecords, createWorlds, RELIEF_STEEP, SATURN_CONTRAST } = await import(join(JS, 'scene/worlds.js'));
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));

const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };
const byId = new Map(WORLDS.map((w) => [w.id, w]));

// ---- 1. off everywhere else -------------------------------------------------------------------
for (const w of WORLDS) {
  if (w.look.earth || w.look.emissive) continue;
  const m = worldMaterial(null, w.look.tint);
  applyLook(m, w.look);
  const u = m.uniforms;
  check((u.uWrap.value > 0) === (w.id === 'venus'), `${w.id}: the soft terminator is Venus's alone`);
  check((u.uContrast.value !== 1) === (w.id === 'saturn'), `${w.id}: the contrast is Saturn's alone`);
  check(u.uReliefK.value.x === 0, `${w.id}: no relief until its map has been fetched`);
}
check(byId.get('venus').look.wrap > 0.05 && byId.get('venus').look.wrap < 0.3, 'Venus: light reaches 3 to 17 degrees past the terminator');
check(byId.get('saturn').look.contrast.gain === SATURN_CONTRAST && SATURN_CONTRAST > 1 && SATURN_CONTRAST <= 2, 'Saturn: the contrast is over 1 and at most 2');

// ---- 2. the shader ----------------------------------------------------------------------------
check(/if \( uContrast != 1\.0 \) base = clamp\( uMapMean \+ \( base - uMapMean \) \* uContrast, 0\.0, 1\.0 \);/.test(WORLD_FRAG), 'the contrast is about the map\'s own mean, and clamped');
check(/float dLit = uWrap > 0\.0 \? \( d \+ uWrap \) \/ \( 1\.0 \+ uWrap \) : d;/.test(WORLD_FRAG), 'the wrap is (d + w) / (1 + w): full at the sub-solar point, 0 at asin(w) past the terminator');
check(/if \( uReliefK\.x > 0\.0 \) \{[\s\S]*?texture2D\( uGlobeRelief/.test(WORLD_FRAG) && (WORLD_FRAG.match(/texture2D\( uGlobeRelief/g) || []).length === 4, 'the relief is four reads behind its uniform: none without it');
check(/direct \*= smoothstep\( -0\.03, 0\.05, dGeo \)/.test(WORLD_FRAG), 'a slope facing the Sun beyond the ball\'s terminator stays dark');
check(/varying vec3 vEastW;/.test(WORLD_VERT) && /varying vec3 vEastW;/.test(WORLD_FRAG), 'east on the ground comes from the vertex shader');

// ---- 3. Saturn's mean is the file's (the generator of the number, done again in JS, is the build's) ----
{
  const m = byId.get('saturn').look.contrast.mean;
  const lum = 0.2126 * m[0] + 0.7152 * m[1] + 0.0722 * m[2];
  check(m.length === 3 && lum > 0.55 && lum < 0.68 && m[0] > m[1] && m[1] > m[2], `Saturn's mean colour is a pale tan in linear light (luminance ${lum.toFixed(3)})`);
  // The worst case stays a colour: a texel at the map's brightest and darkest rows (0.88, 0.29 luminance).
  for (const y of [0.29, 0.88]) {
    const out = lum + (y - lum) * SATURN_CONTRAST;
    check(out > 0.05 && out < 1.05, `a row of luminance ${y} is drawn at ${out.toFixed(2)}: not black, barely clipped`);
  }
}

// ---- 4. the relief's arithmetic ---------------------------------------------------------------
{
  const r = byId.get('mercury').look.relief;
  const [k, du, dv] = reliefUniform(r.px, r.rangeM, 2439.7, 1);
  // One texel on the equator: 2 pi R / px = 7.485 km. A 1 km rise across two texels is a slope of 0.0668.
  const texelM = (2 * Math.PI * 2439.7e3) / r.px;
  const difference = 1000 / (2 * r.rangeM); // a kilometre, as a share of the byte's span
  check(Math.abs(k * difference - 1000 / (2 * texelM)) < 1e-9, `a kilometre across two texels is a slope of ${(1000 / (2 * texelM)).toFixed(4)} (${(k * difference).toFixed(4)})`);
  check(du === 1 / r.px && dv === 2 / r.px, 'the samples are one texel either side, east-west and north-south');
  check(reliefUniform(r.px, r.rangeM, 2439.7, RELIEF_STEEP)[0] === k * RELIEF_STEEP, `and it is drawn ${RELIEF_STEEP} times steeper`);
  const row = TEXTURES.find((t) => t.id === 'mercury-relief');
  const f = row && row.files.find((x) => x.tier === 0);
  check(row && row.world === 'mercury' && row.slot === 'relief' && row.when === 'asked', 'registry/textures.yaml has the row, counted with the faces a card can ask for');
  check(f && f.file === `textures/${r.map}` && f.px[0] === r.px && f.format === 'mono', 'the file is the row\'s: one grey channel, as wide as the shader is told');
  check(existsSync(join(ROOT, 'site/textures', r.map)), 'the file ships');
  const make = readFileSync(join(ROOT, 'registry/textures.yaml'), 'utf8');
  check(make.includes(`+-${r.rangeM} m`), `the row says the byte spans +-${r.rangeM} m, which is what the shader is told`);
}

// ---- 5. in the scene: fetched with the map, on the tiers that may, given back with it ----------
{
  stage.setWorld('mercury');
  const fetched = [];
  const camera = new THREE.PerspectiveCamera(50, 1.6, 1e-6, 1e12);
  const worlds = createWorlds(new THREE.Scene(), {
    camera,
    loadTexture: (url, onLoad) => { fetched.push(url); const t = new THREE.Texture(); if (onLoad) onLoad(t); return t; },
  });
  worlds.preload('mercury');
  check(fetched.some((u) => u.endsWith('2k_mercury_messenger.webp')) && !fetched.some((u) => u.includes('relief')), 'on a phone (no setRelief) the map comes and the relief does not');
  check(!worlds.hasRelief('mercury'), 'and Mercury is lit as a ball');
  worlds.setRelief(true);
  check(fetched.filter((u) => u.endsWith('2k_mercury_relief.webp')).length === 1 && worlds.hasRelief('mercury'), 'allowed, the relief is fetched once and worn');
  worlds.setRelief(true);
  check(fetched.filter((u) => u.endsWith('2k_mercury_relief.webp')).length === 1, 'asking again does not fetch it again');
  worlds.setRelief(false);
  check(!worlds.hasRelief('mercury'), 'the frame latch takes it off');
  worlds.setRelief(true);
  check(worlds.hasRelief('mercury'), 'and a tier that may wears it again');
  check(worlds.releaseMap('mercury') && !worlds.hasRelief('mercury'), 'giving the map back gives the relief back');
  // Saturn's Hubble face is not adjusted.
  worlds.preload('saturn');
  const sat = worlds.meshFor('saturn').material.uniforms;
  check(sat.uContrast.value === SATURN_CONTRAST, 'Saturn\'s own map wears the contrast');
  worlds.setFace('saturn', 'hubble');
  check(sat.uContrast.value === 1, '"As Hubble saw it" does not');
  worlds.setFace('saturn', null);
  check(sat.uContrast.value === SATURN_CONTRAST, 'and back');
  worlds.preload('venus');
  const ven = worlds.meshFor('venus').material.uniforms;
  worlds.setFace('venus', 'surface');
  check(ven.uWrap.value === 0, 'Venus\'s radar ground has a terminator');
  worlds.setFace('venus', null);
  check(ven.uWrap.value > 0, 'and its clouds do not');
}

// ---- 6. the card says so ----------------------------------------------------------------------
const recs = new Map(worldRecords().map((r) => [r.id, r]));
check(/steeper than measured/.test(recs.get('mercury').meta.departure || '') && recs.get('mercury').meta.departure.includes(`${RELIEF_STEEP} times`), 'Mercury\'s card says its relief is steepened, and by how much');
check(/adjustment of ours/.test(recs.get('saturn').meta.departure || '') && recs.get('saturn').meta.departure.includes(`${SATURN_CONTRAST} times`), 'Saturn\'s card says its bands are adjusted, and by how much');
check(/illustrative/.test(recs.get('venus').meta.departure || ''), 'Venus\'s card says its glow is illustrative');
check(!recs.get('mars').meta.departure && !recs.get('jupiter').meta.departure, 'no other world gains a sentence');

// The two worlds with ground sites are cut finely: a lander on the true radius must not float over the drawn ground
// (internal #565, public #406: "stars visible below the horizon", the shell under the surface).
{
  const { segmentsFor, sagKm, SITE_BODIES } = await import(join(JS, 'scene/worlds.js'));
  const sites = readFileSync(join(ROOT, 'registry/sites.yaml'), 'utf8');
  const bodies = new Set([...sites.matchAll(/\bworld:\s*([a-z]+)/g)].map((m) => m[1]));
  bodies.delete('earth'); // the Earth's sphere is scene/earth.js's own, cut by its own SEGMENTS
  check(bodies.has('moon') && bodies.has('mars') && bodies.size === 2, `registry/sites.yaml puts ground sites on the Moon and Mars only (${[...bodies]})`);
  for (const b of bodies) check(SITE_BODIES.has(b), `${b} has ground sites in registry/sites.yaml, so its sphere is cut finely`);
  const moonR = WORLDS.find((w) => w.id === 'moon').radiusKm;
  check(sagKm(moonR, 64) > 2 && sagKm(moonR, 64) < 2.3, `at 64 segments the Moon's facets sag ${sagKm(moonR, 64).toFixed(2)} km (the old shell)`);
  const seg = segmentsFor('moon');
  check(sagKm(moonR, seg.width) < 0.25, `the Moon's facets now sag ${sagKm(moonR, seg.width).toFixed(3)} km`);
  const marsR = WORLDS.find((w) => w.id === 'mars').radiusKm;
  check(sagKm(marsR, segmentsFor('mars').width) < 0.5, `Mars's facets sag ${sagKm(marsR, segmentsFor('mars').width).toFixed(3)} km`);
  check(segmentsFor('jupiter').width === 64 && segmentsFor('earth').width === 64, 'every other world keeps its 64 x 48');
  // The fine cut is worn near only (CI's trips walk, 2026-10-10: two dots cost 61 000 triangles at every stop).
  const { fineCutWanted, FINE_CUT_AT } = await import(join(JS, 'scene/worlds.js'));
  check(fineCutWanted(0) === false && fineCutWanted(FINE_CUT_AT / 2) === false && fineCutWanted(FINE_CUT_AT) === true && fineCutWanted(40) === true && fineCutWanted(NaN) === false, 'a dot wears the 64 x 48 sphere, a disc the fine one');
  // 35 km over the Moon (the nearest the camera goes) is a disc many times the view: the fine cut is on there.
  check(fineCutWanted(1737.4 / (1737.4 + 35) / Math.tan(22.5 * Math.PI / 180)), 'at a ground site the fine cut is worn');
}

if (problems.length) { console.error(`world looks: ${problems.length} problem(s)\n  - ` + problems.join('\n  - ')); process.exit(1); }
console.log('world looks ok: Venus\'s soft terminator, Saturn\'s contrast (not on the Hubble face) and Mercury\'s relief (tier 1 up, given back with the map) are each behind their own uniform, and each card says what is adjusted');
