// tests/test_ring_detail.mjs -- Saturn from close (spec 0073 requirement 5, 2026-10-12).
//
// The shaders cannot run here. This holds what can be held without a GPU:
//   1. THE STRIP IS CASSINI'S. site/textures/8k_saturn_ring_fine.png is decoded (a PNG, node's zlib
//      and nothing else) and read at the radii of five named gaps: the Colombo, Maxwell, Huygens,
//      Encke and Keeler gaps are empty there and the ring either side of each is not. A strip made
//      from anything but a measured profile, or laid on the wrong radii, fails here.
//   2. THE RING SHADER reads it once, multiplies the optical depth, and its grains need no texture;
//      the JS twins say the same; a coarse mip of the strip changes nothing.
//   3. IN THE SCENE: nothing of it at boot or on a phone; asked for once when Saturn is large;
//      given back when the camera leaves and at the frame latch.
//   4. THE POLAR VORTEX is a registry row with Cassini's two numbers, worn by Saturn's weather, in
//      from close only, turning with the planet, still where less motion is asked for.
//   5. the card says what is measured and what is drawn.
//   node tests/test_ring_detail.mjs

import { readFileSync, existsSync, statSync } from 'node:fs';
import { inflateSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const W = await import(join(JS, 'scene/worlds.js'));
const { WORLDS, RING_FRAG, RING_FINE, RING_GRAIN, RING_NEAR_FADE_S, ringFineTau, ringFineU, ringGrainGate, createWorlds, worldMaterial, applyLook, WORLD_FRAG } = W;
const { TEXTURES } = await import(join(JS, 'data/textures.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const measured = [];

const saturn = WORLDS.find((w) => w.id === 'saturn');
const ring = saturn.look.ring;

// ---- 1. the strip --------------------------------------------------------------------------------
function decodeGreyPng(buf) {
  let p = 8; let w = 0; let h = 0; const idat = [];
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const kind = buf.toString('latin1', p + 4, p + 8);
    const data = buf.subarray(p + 8, p + 8 + len);
    if (kind === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); if (data[8] !== 8 || data[9] !== 0 || data[12] !== 0) throw new Error('an 8-bit grey PNG, not interlaced, is what the strip is'); }
    if (kind === 'IDAT') idat.push(data);
    if (kind === 'IEND') break;
    p += 12 + len;
  }
  const raw = inflateSync(Buffer.concat(idat));
  const out = Buffer.alloc(w * h);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)];
    for (let x = 0; x < w; x++) {
      const r = raw[y * (w + 1) + 1 + x];
      const a = x >= 1 ? out[y * w + x - 1] : 0;
      const b = y > 0 ? out[(y - 1) * w + x] : 0;
      const c = x >= 1 && y > 0 ? out[(y - 1) * w + x - 1] : 0;
      let v;
      if (f === 0) v = r; else if (f === 1) v = r + a; else if (f === 2) v = r + b; else if (f === 3) v = r + ((a + b) >> 1);
      else { const pp = a + b - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c); v = r + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c); }
      out[y * w + x] = v & 255;
    }
  }
  return { w, h, px: out };
}
const file = join(ROOT, 'site/textures', RING_FINE.map);
check(existsSync(file), `${RING_FINE.map} ships`);
const strip = decodeGreyPng(readFileSync(file));
check(strip.w === RING_FINE.px && strip.h === 1, `the strip is ${RING_FINE.px} x 1 (${strip.w} x ${strip.h})`);
const ratioAt = (i) => (strip.px[Math.max(0, Math.min(strip.w - 1, i))] / 255) * RING_FINE.ratioMax;
const texelOf = (km) => Math.round(ringFineU(km, ring.innerKm, ring.outerKm) * strip.w - 0.5);
const kmPerTexel = (ring.outerKm - ring.innerKm) / strip.w;
// The gaps' radii: the Encke and Keeler gaps' as the task names them (133 589 and 136 505 km, the
// orbits of Pan and Daphnis); the Huygens gap just outside the B ring's edge at 117 580 km; the
// Maxwell gap at 87 491 km and the Colombo gap at 77 870 km in the C ring, as in the Cassini ring
// feature tables (Colwell et al. 2009, in Saturn from Cassini-Huygens, table 13.1 and following).
const GAPS = [['Colombo', 77870], ['Maxwell', 87491], ['Huygens', 117680], ['Encke', 133589], ['Keeler', 136505]];
for (const [name, km] of GAPS) {
  const i = texelOf(km);
  let inGap = Infinity;
  for (let d = -2; d <= 2; d++) inGap = Math.min(inGap, ratioAt(i + d));
  // The ring either side, within 600 km: somewhere it is at least as dense as its neighbourhood.
  let beside = 0;
  for (let d = Math.round(60 / kmPerTexel); d <= Math.round(600 / kmPerTexel); d++) beside = Math.max(beside, ratioAt(i - d), ratioAt(i + d));
  check(inGap < 0.1, `the ${name} gap is empty at ${km} km (ratio ${inGap.toFixed(2)} within 16 km of it)`);
  check(beside > 0.9, `and the ring beside the ${name} gap is there (ratio up to ${beside.toFixed(2)} within 600 km)`);
  measured.push(`${name} gap, ${km} km: texel ${i}, ratio ${inGap.toFixed(2)}; beside it up to ${beside.toFixed(2)}`);
}
{
  // The strip is a refinement: over a wide stretch of ring its mean is near 1, so a coarse mip of it
  // leaves the map's optical depth alone. The A ring between the Cassini Division and the Encke gap.
  let sum = 0; let n = 0;
  for (let i = texelOf(124000); i <= texelOf(132000); i++) { sum += ratioAt(i); n += 1; }
  check(near(sum / n, 1, 0.08), `over the middle of the A ring the strip's mean is 1 (${(sum / n).toFixed(3)})`);
  // And it is fine structure, not a flat line: many texels differ from 1.
  let busy = 0;
  for (let i = 0; i < strip.w; i++) if (Math.abs(ratioAt(i) - 1) > 0.2) busy += 1;
  check(busy > strip.w * 0.1, `the strip holds structure: ${busy} of ${strip.w} texels are more than a fifth from 1`);
  measured.push(`A ring 124 000 to 132 000 km: mean ratio ${(sum / n).toFixed(3)}; ${busy} texels of ${strip.w} more than 0.2 from 1; ${kmPerTexel.toFixed(2)} km a texel`);
}
{
  const row = TEXTURES.find((t) => t.id === 'saturn-ring-fine');
  const f = row && row.files.find((x) => x.tier === 0);
  check(row && row.world === 'saturn' && row.slot === 'ring' && row.when === 'asked', 'registry/textures.yaml has the row, fetched when asked for and never at boot');
  check(f && f.file === `textures/${RING_FINE.map}` && f.px[0] === RING_FINE.px && f.px[1] === 1 && f.format === 'mono', 'the file is the row\'s');
  check(f && f.bytes === statSync(file).size && f.bytes < 20000, `it is small (${f && f.bytes} B)`);
  const yaml = readFileSync(join(ROOT, 'registry/textures.yaml'), 'utf8');
  const mine = yaml.slice(yaml.indexOf('- id: saturn-ring-fine'), yaml.indexOf('- id: uranus'));
  check(/public domain/i.test(mine) && /pds-rings\.seti\.org/.test(mine) && /limits:/.test(mine) && /make:/.test(mine), 'the row has its licence sentence, its source, how it was made and its limits');
  check(mine.includes(`clipped at a ratio of ${RING_FINE.ratioMax}`) && mine.includes(`${RING_FINE.px} texels`), 'and says the byte\'s scale, which is what the shader is told');
  check(ring.innerKm === 74500 && ring.outerKm === 140220 && readFileSync(join(ROOT, 'scripts/build-ring-profile.py'), 'utf8').includes('RING_INNER_KM = 74500.0') && readFileSync(join(ROOT, 'scripts/build-ring-profile.py'), 'utf8').includes('RING_OUTER_KM = 140220.0'), 'the build script lays the strip over the ring mesh\'s own radii');
}

// ---- 2. the shader and its twins ----------------------------------------------------------------
{
  check(RING_FRAG.split('texture2D(').length - 1 === 2, `the ring reads two textures a fragment: its map and the strip (${RING_FRAG.split('texture2D(').length - 1})`);
  check(/if \( uFine > 0\.0 \) \{[\s\S]*?texture2D\( uFineMap/.test(RING_FRAG), 'the strip is read only when the fine structure is in');
  check(RING_FRAG.includes(`.r * ${RING_FINE.ratioMax.toFixed(1)};`) && RING_FRAG.includes('tau *= 1.0 + uFine * ( ratio - 1.0 );'), 'and multiplies the optical depth by the ratio it holds');
  check(RING_FRAG.includes('( length( vPosL.xy ) - uRingRadii.x ) / ( uRingRadii.y - uRingRadii.x )'), 'through no warp: its radii are Cassini\'s own');
  check(ringFineTau(1.2, 1, 1) === 1.2 && ringFineTau(1.2, 0, 1) === 0 && ringFineTau(1.2, 0, 0) === 1.2 && near(ringFineTau(1.2, 2, 0.5), 1.8, 1e-12), 'the twin: a ratio of 1 changes nothing, a gap empties the ring, and it fades in');
  check(near(ringFineU(133589, ring.innerKm, ring.outerKm), 0.899, 0.001), 'the Encke gap is nine tenths of the way out along the strip');
  // The grains: no texture, gated by how much ring a pixel covers, their mean taken off.
  const grain = RING_FRAG.slice(RING_FRAG.indexOf('if ( uGrain > 0.0 )'));
  check(grain.includes('dFdx( vPosL.xy )') && grain.includes('dFdy( vPosL.xy )') && !grain.slice(0, grain.indexOf('float cover')).includes('texture2D'), 'the grains are sized by their screen footprint and read no texture');
  check(grain.includes(`( g - ${RING_GRAIN.mean.toFixed(4)} )`) && grain.includes('( clump - 0.5 )') && grain.includes('body *= k;') && grain.includes('fine *= k;'), 'they scale the backscattered and the forward-thrown light alike, less their own mean');
  check(!/uTime|uClock/.test(RING_FRAG), 'nothing in the ring moves by itself: the grains are a stable hash (less motion is kept for free)');
  check(ringGrainGate(RING_GRAIN.farRadii) === 0 && ringGrainGate(RING_GRAIN.farRadii * 0.5) === 1 && ringGrainGate(RING_GRAIN.farRadii * 10) === 0, 'no grain where a pixel covers more than 30 km of ring, all of it by 15 km');
  // The glints' own mean: one cell in five, a squared ramp (1/3), a Gaussian's share of its cell (pi / 18).
  check(near(0.2 * (1 / 3) * (Math.PI / 18), RING_GRAIN.mean, 0.0005), `the mean taken off is the glints' own (${(0.2 * (1 / 3) * (Math.PI / 18)).toFixed(4)})`);
  check(/if \( h < 0\.8 \) return 0\.0;/.test(RING_FRAG), 'four cells in five hold no glint: not a lattice of dots');
  check(RING_GRAIN.farRadii * saturn.radiusKm < 40, 'and the gate is tens of kilometres a pixel: extreme close range');
  check(RING_FRAG.split('{').length === RING_FRAG.split('}').length && RING_FRAG.split('(').length === RING_FRAG.split(')').length, 'the ring shader\'s braces and brackets balance');
}

// ---- 3. in the scene -----------------------------------------------------------------------------
{
  stage.setWorld('saturn');
  const fetched = [];
  let now = 0;
  const camera = new THREE.PerspectiveCamera(50, 1.6, 1e-9, 1e12);
  const worlds = createWorlds(new THREE.Scene(), {
    camera, now: () => now, reducedMotion: false,
    loadTexture: (url, onLoad) => { fetched.push(url); const t = new THREE.Texture(); if (onLoad) onLoad(t); return t; },
  });
  const t0 = Date.UTC(2026, 9, 12);
  const mesh = worlds.meshFor('saturn');
  worlds.update(t0);
  const stand = (radii) => { camera.position.copy(mesh.position); camera.position.x += mesh.scale.x * radii; camera.updateMatrixWorld(true); worlds.update(t0); };
  const strips = () => fetched.filter((u) => u.endsWith(RING_FINE.map)).length;
  stand(40); now += 100; worlds.update(t0);
  check(strips() === 0, 'at boot, and on a phone (no setRelief), the strip is never asked for');
  stand(3); now += 100; worlds.update(t0);
  check(worlds.discShare('saturn') > RING_FINE.fromShare && strips() === 0 && worlds.ringDetail('saturn').grain === 0, 'not even from close, without the tier\'s leave');
  worlds.setRelief(true);
  stand(40); now += 100; worlds.update(t0);
  check(worlds.discShare('saturn') < RING_FINE.keptShare && strips() === 0, 'allowed but far: still nothing');
  stand(3); now += 100; worlds.update(t0);
  check(strips() === 1 && worlds.ringDetail('saturn').strip, 'allowed and large on screen: asked for once');
  now += 500; worlds.update(t0);
  const half = worlds.ringDetail('saturn');
  check(half.fine > 0.3 && half.fine < 0.9, `it comes in over ${RING_NEAR_FADE_S} s (${half.fine.toFixed(2)} after half of one)`);
  now += 2000; worlds.update(t0); worlds.update(t0);
  const u = mesh.userData.ring.material.uniforms;
  check(u.uFine.value === 1 && u.uGrain.value === 1 && u.uFineMap.value && strips() === 1, 'and stays, fetched once');
  check(u.uFineMap.value.anisotropy === 1 && u.uFineMap.value.generateMipmaps === true, 'the strip is mipmapped and not anisotropic: one row would shimmer');
  stand(40); now += 3000; worlds.update(t0); now += 100; worlds.update(t0);
  check(u.uFine.value === 0 && u.uFineMap.value === null && !worlds.ringDetail('saturn').strip, 'the camera gone, it fades and the strip is given back');
  stand(3); now += 100; worlds.update(t0); now += 3000; worlds.update(t0);
  check(strips() === 2 && u.uFine.value === 1, 'coming back asks again (from the browser\'s cache)');
  // The Measured look (spec 0073 req 8): the grains are generated and go; Cassini's structure stays.
  worlds.setLook('measured');
  now += 3000; worlds.update(t0);
  check(u.uGrain.value === 0 && u.uFine.value === 1, 'Measured: no grains, and the measured ringlets stay');
  worlds.setLook('film');
  now += 3000; worlds.update(t0);
  check(u.uGrain.value === 1, 'Film: the grains are back');
  check(/worlds\.setLook\(drawn\.mode\(\)\);/.test(readFileSync(join(JS, 'main.js'), 'utf8')) && /worlds\.setLook\(mode\);/.test(readFileSync(join(JS, 'main.js'), 'utf8')), 'main.js tells the worlds which look is on, at the start and at every change');
  worlds.setRelief(false);
  check(u.uFine.value === 0 && u.uGrain.value === 0 && u.uFineMap.value === null, 'the frame latch takes both off at once');
  now += 100; worlds.update(t0);
  check(strips() === 2 && u.uGrain.value === 0, 'and nothing asks again under it');
  // The narrow rings have no fine structure and never ask.
  const ur = worlds.meshFor('uranus').userData.ring.material.uniforms;
  check(ur.uFine.value === 0 && ur.uGrain.value === 0, 'Uranus\'s rings are left as they were');
  // Less motion: no fade, the terms are simply there.
  const fetched2 = [];
  const still = createWorlds(new THREE.Scene(), { camera, now: () => now, reducedMotion: true, loadTexture: (url, onLoad) => { fetched2.push(url); const t = new THREE.Texture(); if (onLoad) onLoad(t); return t; } });
  still.setRelief(true);
  still.update(t0); now += 16; still.update(t0);
  check(still.ringDetail('saturn').fine === 1, 'where less motion is asked for there is no fade');
}

// ---- 4. the polar vortex -------------------------------------------------------------------------
{
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  const row = WEATHER.find((r) => r.id === 'saturn-polar-vortex');
  check(row && row.world === 'saturn' && row.kind === 'polar-vortex' && row.class === 'illustrative', 'registry/weather.yaml has the row, illustrative');
  check(row && row.off_at.includes('tier0') && row.off_at.includes('save_data'), 'off on the lowest tier and where data is saved');
  check(row && row.vortex.eye_diameter_km === 2000 && row.vortex.wind_m_s === 150, 'with Cassini\'s two numbers: an eye 2 000 km across, 150 m/s');
  const yaml = readFileSync(join(ROOT, 'registry/weather.yaml'), 'utf8').replace(/\n\s*# /g, ' ');
  check(yaml.includes('1,250 miles (2,000 kilometers) across with cloud speeds as fast as 330 miles per hour (150 meters per second)') && yaml.includes('read 2026-10-12'), 'the registry quotes the sentence it was read in, with the day');
  const days = WW.vortexPeriodDays(row.vortex);
  check(near(days * 24, 11.64, 0.05), `once round the eye's rim at that speed is 11.6 hours (${(days * 24).toFixed(2)})`);
  const meshes = new Map();
  for (const w of WORLDS) {
    if (w.look.earth || w.look.emissive) continue;
    const material = worldMaterial(null, w.look.tint);
    applyLook(material, w.look);
    meshes.set(w.id, { material, visible: true });
  }
  let share = 0.05;
  const worldsStub = { meshFor: (id) => meshes.get(id) || null, discShare: () => share };
  const wx = WW.createWorldWeather({ worlds: worldsStub });
  const sm = meshes.get('saturn').material;
  const v = sm.uniforms.uWxVortex.value;
  check(sm.fragmentShader.includes('uniform vec4  uWxVortex;') && !WORLD_FRAG.includes('uWxVortex'), 'the vortex is in the weather\'s shader and not in the world\'s own');
  check(near(v.x, 1000 / 58232, 1e-9) && v.w === row.vortex.reach_eyes, 'the eye\'s radius is 1 000 km of the globe');
  check(meshes.get('jupiter').material.uniforms.uWxVortex.value.z === 0 && wx.vortex('jupiter') === null && wx.vortex('saturn') === 'moving', 'Saturn wears it and Jupiter does not');
  const t0 = Date.UTC(2026, 9, 12);
  wx.update(t0, 0);
  check(v.z === 0, 'from afar nothing of it is drawn');
  share = 0.6;
  wx.update(t0, 100); wx.update(t0, 600);
  check(v.z > 0.3 && v.z < 0.9, `from close it comes in over a second (${v.z.toFixed(2)} after half of one)`);
  wx.update(t0, 5000);
  check(v.z === 1, 'and is all there');
  const turn0 = v.y;
  wx.update(t0 + 3 * 3600 * 1000, 5100);
  const moved = ((v.y - turn0) % 1 + 1) % 1;
  check(near(moved, 3 / (days * 24), 1e-6), `three hours on it has made ${(3 / (days * 24)).toFixed(3)} of a turn, with the planet (${moved.toFixed(3)})`);
  // The Measured look (spec 0073 req 8): the row is `measured: hidden`, so the drawn spiral goes and its sentence with it.
  check(row.measured === 'hidden', 'under the Measured look the row says it is hidden');
  wx.setLook('measured');
  wx.update(t0 + 3 * 3600 * 1000, 9000);
  check(v.z === 0 && wx.vortex('saturn') === null, 'Measured: nothing of the vortex is drawn or said');
  wx.setLook('film');
  wx.update(t0 + 3 * 3600 * 1000, 12000);
  check(v.z === 1 && wx.vortex('saturn') === 'moving', 'Film: it is back');
  wx.latch();
  check(sm.fragmentShader === WORLD_FRAG && wx.vortex('saturn') === null, 'the frame latch puts Saturn back in its own shader');
  // Less motion: drawn, and still.
  const meshes2 = new Map();
  for (const w of WORLDS) { if (w.look.earth || w.look.emissive) continue; const m = worldMaterial(null, w.look.tint); applyLook(m, w.look); meshes2.set(w.id, { material: m, visible: true }); }
  const calm = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes2.get(id) || null, discShare: () => 0.6 }, reducedMotion: true });
  const v2 = meshes2.get('saturn').material.uniforms.uWxVortex.value;
  calm.update(t0, 0); const y0 = v2.y; calm.update(t0 + 3 * 3600 * 1000, 16);
  check(v2.z === 1 && v2.y === y0 && calm.vortex('saturn') === 'still', 'where less motion is asked for it is drawn at once and does not turn');
}

// ---- 5. the words --------------------------------------------------------------------------------
{
  const { COPY } = await import(join(JS, 'copy/en.js'));
  await import(join(JS, 'copy/en.later.js'));
  const dep = COPY.drawing.worldDeparture.saturn;
  check(/Cassini measured/.test(dep) && /grains[^.]*is drawn/.test(dep), 'Saturn\'s card says the ringlets are measured and the grains are drawn');
  check(/2\u202F000 km/.test(COPY.weatherVortex.turning.saturn) && /150 metres a second/.test(COPY.weatherVortex.turning.saturn) && /illustrative/.test(COPY.weatherVortex.turning.saturn), 'and the vortex\'s line gives Cassini\'s numbers and says the spiral is illustrative');
  check(/illustrative/.test(COPY.weatherVortex.still.saturn) && !/turns/.test(COPY.weatherVortex.still.saturn), 'the still line does not say it turns');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(credits.includes('8k_saturn_ring_fine.png') && credits.includes('Cassini UVIS stellar occultation of Beta Centauri'), 'CREDITS.md carries the strip');
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`ring detail FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('ring detail ok: five named gaps are empty in the strip at Cassini\'s radii, the ring reads it once from close and never at boot, the grains need no texture, and the polar vortex is a registry row with Cassini\'s numbers');
