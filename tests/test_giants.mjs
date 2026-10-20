// tests/test_giants.mjs -- internal spec 0076 W2-b (internal #860): the giants' missing details.
//
//   1. the Great Red Spot where it is: the dated System II place from the registry, turned into System
//      III by the two rotations' definitions, lands on Hubble's map of 11 December 2025 within a degree;
//      the shader turns the map by it and nothing else; the card line says when, from whom, and how far
//      either side it may be
//   2. Uranus's rings at their own darkness: the fact sheet's albedo against the planet's, a thirtieth
//      of the clouds, lifted only by the Deep exposure; the radii are unchanged
//   3. Jupiter's faint ring: the fact sheet's four parts and optical depths in the strip, read back as
//      optical depths; from the night side it shows under Camera, from the day side it does not; Deep
//      shows it from both; Eye draws nothing; tier 0 never draws it
//   4. the words: each number the card states is the one drawn

import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const W = await import(join(JS, 'scene/worlds.js'));
const WW = await import(join(JS, 'scene/weather/worldweather.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const measured = [];
const DEG = Math.PI / 180;
const angle = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// --- 1. the Great Red Spot --------------------------------------------------------------------------
const bands = WEATHER.find((r) => r.id === 'jupiter-bands');
const place = bands && bands.spot && bands.spot.place;
{
  check(!!place && place.l2_deg === 79 && place.date === '2025-12-01', 'the row holds the BAA\'s place of 1 December 2025, L2 = 79');
  check(place && place.drift_range[0] === 0.8 && place.drift_range[1] === 1.78 && place.drift_deg_per_30d > 0.8 && place.drift_deg_per_30d < 1.78, 'the drift drawn is between the two the JUPOS team measured');
  check(place && /^https:\/\/britastro\.org\//.test(place.source.url) && /JUPOS/.test(place.source.name), 'and names its source');
  check(bands.class === 'modelled' && bands.measured === 'same', 'the flow and the spot are modelled and drawn the same under Measured');
  // System II to III: the BAA's Report no.2 of 2025/26 gives both for 1 September 2025: L2 = 77, L3 = 292.
  const sep = WW.l2ToL3(77, Date.UTC(2025, 8, 1));
  check(angle(sep, 292) < 1, `L2 77 on 2025-09-01 is L3 ${sep.toFixed(1)}, the BAA says 292`);
  // ... and a feature fixed in System II goes round System III by 8.0 degrees in 30 days.
  const drift = WW.l2ToL3(0, Date.UTC(2026, 0, 31)) - WW.l2ToL3(0, Date.UTC(2026, 0, 1));
  check(near(drift, 7.98, 0.01), `DL3 = DL2 + 8.0 deg/30d (${drift.toFixed(3)})`);
  // Hubble's map of 11 December 2025 (CREDITS.md) has its spot at u 0.6058 (scene/worlds.js faceSpot).
  const dec11 = Date.UTC(2025, 11, 11, 12);
  const g = WW.grsAt(place, dec11);
  const hubbleU = W.WORLDS.find((w) => w.id === 'jupiter').look.faceSpot.hubble.u;
  const offDeg = Math.abs(((WW.meshU(g.l3) - hubbleU + 1.5) % 1) - 0.5) * 360;
  check(offDeg < 1, `on Hubble's day the placed spot is ${offDeg.toFixed(2)} degrees from where Hubble's map has it`);
  measured.push(`Hubble 2025-12-11: placed L3 ${g.l3.toFixed(1)}, Hubble's map ${(360 * (0.5 - hubbleU) + 360).toFixed(1)}; ${offDeg.toFixed(2)} degrees apart`);
  check(near(WW.spotShift(place, hubbleU, dec11), 0, 0.003) || near(WW.spotShift(place, hubbleU, dec11), 1, 0.003), 'so wearing Hubble\'s face that day the map is not turned');
  const at = WW.grsAt(place, Date.parse('2025-12-01T00:00:00Z'));
  check(near(at.l2, 79, 1e-9) && near(at.pm, 1, 1e-9), 'on the day it was measured it is where it was, within the measurement');
  const now = WW.grsAt(place, Date.UTC(2026, 9, 16));
  check(now.l2 > 79 + 8 && now.l2 < 79 + 19 && now.pm > 5 && now.pm < 8, `on 2026-10-16 it is at L2 ${now.l2.toFixed(1)}, between the two drifts, give or take ${now.pm.toFixed(1)}`);
  measured.push(`2026-10-16: L2 ${now.l2.toFixed(1)} +/- ${now.pm.toFixed(1)}, L3 ${now.l3.toFixed(1)}`);
  // The shader: the map's coordinates are the mesh's less the turn, once, in the zonal path only.
  const frag = WW.weatherFragment ? WW.weatherFragment() : null;
  const src = frag || '';
  check(/uniform float uWxShift;/.test(src) && /vec2 uv = vec2\( uvMesh\.x - uWxShift, uvMesh\.y \);/.test(src) && src.split('uWxShift').length - 1 === 3, 'the weather shader turns the map once, by uWxShift');
  // Behaviour: a dressed Jupiter, its own face and Hubble's.
  const { worldMaterial, applyLook } = W;
  const meshes = new Map();
  for (const w of W.WORLDS) { if (w.look.earth || w.look.emissive) continue; const material = worldMaterial(null, w.look.tint); applyLook(material, w.look); meshes.set(w.id, { material, visible: true }); }
  const wx = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null } });
  const u = meshes.get('jupiter').material.uniforms;
  const t = Date.UTC(2026, 9, 16, 6);
  wx.update(t, 0);
  const want = WW.spotShift(place, bands.spot.u, t);
  check(near(u.uWxShift.value, want, 1e-12) && want > 0.01, `the own map is turned by ${(want * 360).toFixed(1)} degrees`);
  const st = wx.state().worlds.find((x) => x.id === 'jupiter').spot;
  check(st && near(st.meshU, WW.meshU(WW.grsAt(place, t).l3), 1e-9), 'the state says where on the mesh the spot is drawn');
  check(!meshes.get('saturn').material.uniforms.uWxShift || meshes.get('saturn').material.uniforms.uWxShift.value === 0, 'no other world is turned');
  u.uWxSpot.value.x = hubbleU; // what scene/worlds.js faceSpot does when Hubble's face is worn
  wx.update(t, 16);           // the same clock: the turn still follows the face
  check(near(u.uWxShift.value, WW.spotShift(place, hubbleU, t), 1e-12), 'with Hubble\'s face worn the turn follows that map\'s spot, on a held clock');
  const line = wx.spotLine('jupiter', t);
  check(typeof line === 'string' && line.includes('1 December 2025') && line.includes('(79°)') && line.includes(`${Math.round(WW.grsAt(place, t).l2)}°`) && line.includes(`${Math.round(WW.grsAt(place, t).pm)}° either side`), `the card line says where, from when and how far either side (${line})`);
  check(!/\{/.test(line || '{'), 'every slot of it is filled');
  // The look probes' before, under ?look=1 only (scene/quality.js lookHeld reads the address).
  globalThis.location = { search: '?look=1' };
  const took = wx.setBeforeGiants(true);
  wx.update(t + 1000, 32);
  check(took && u.uWxShift.value === 0 && wx.spotLine('jupiter', t) === null, 'the probes\' before puts the spot back where the map has it and says nothing');
  wx.setBeforeGiants(false);
  delete globalThis.location;
  wx.latch();
  check(wx.spotLine('jupiter', t) === null, 'after the latch the map is the map, and the card does not claim the spot');
}

// --- 2. Uranus's rings at their own darkness -----------------------------------------------------------
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const lin = WW.hexLinear;
{
  const ur = W.WORLDS.find((w) => w.id === 'uranus');
  const R = W.URANUS_RINGS;
  const G = WW.GIANT_RINGS.uranus;
  check(ur.look.ring === R && G.albedo === 0.015 && G.globeAlbedo === 0.488, 'Uranus\'s rings carry the fact sheets\' albedos: rings 0.015, planet 0.488');
  const want = WW.ringColour(ur.look.tint, G, 'camera');
  const drawn = lin(R.colour);
  const ratio = lum(drawn) / lum(lin(ur.look.tint));
  check(near(lum(drawn), lum(want), 0.03 * lum(want)) && ratio < 1 / 25, `face-on and lit from overhead the rings are ${(ratio * 100).toFixed(2)} % of the clouds' mean (want ${(100 * 0.015 / 0.488).toFixed(2)}): the nearest grey byte`);
  check(drawn[0] === drawn[1] && drawn[1] === drawn[2], 'grey: Uranus\'s rings are spectrally flat');
  check(WW.ringStretch(G, 'deep') === 4 && WW.ringStretch(G, 'camera') === 1 && WW.ringStretch(G, 'eye') === 1, 'only Deep lifts them, four times');
  const was = lum(lin(0x8f9da3));
  check(was / lum(drawn) > 15, `the grey they were drawn in was ${(was / lum(drawn)).toFixed(0)} times brighter`);
  measured.push(`Uranus's rings: ${lum(drawn).toFixed(4)} linear (want ${lum(want).toFixed(4)}; was ${was.toFixed(3)}), clouds ${lum(lin(ur.look.tint)).toFixed(3)}`);
  check(R.bands.length === 10 && R.bands[9][0] === 51149 && R.widen === 10, 'the ten rings at the fact sheet\'s radii, drawn ten times wider');
  check(W.NEPTUNE_RINGS.colour === 0x8f9da3, 'Neptune\'s rings are left as they were');
}

// --- 3. Jupiter's faint ring --------------------------------------------------------------------------
{
  const ju = W.WORLDS.find((w) => w.id === 'jupiter');
  const R = WW.GIANT_RINGS.jupiter;
  const ju_tint = () => ju.look.tint;
  check(!ju.look.ring, 'Jupiter\'s ring is not in the boot module: scene/weather/worldweather.js draws it, from tier 1');
  // The fact sheet's parts and mean depths; the main ring deeper toward its sharp outer edge, the halo fading inward.
  const strip = WW.faintStrip(R);
  const kmPerPx = (R.outerKm - R.innerKm) / WW.FAINT_PX;
  const mean = (a, b) => { let sum = 0; const n = 400; for (let k = 0; k < n; k++) sum += WW.faintTau(R, a + ((k + 0.5) * (b - a)) / n); return sum / n; };
  check(near(mean(123000, 128940), 5e-6, 1e-8), `the main ring, 123 000 to 128 940 km, averages the fact sheet's 5e-6 (${mean(123000, 128940).toExponential(2)})`);
  check(WW.faintTau(R, 128900) > WW.faintTau(R, 123100) && WW.faintTau(R, 129000) === 0, 'deepest at its sharp outer edge, nothing past it');
  check(near(WW.faintTau(R, 122990), 3e-6, 1e-8) && WW.faintTau(R, 89500) < 0.02 * 3e-6 && WW.faintTau(R, 89000) === 0, 'the halo is the fact sheet\'s 3e-6 where it meets the main ring and fades to nothing inward');
  for (const r of [95000, 110000, 124000, 128000]) {
    const got = (strip[Math.floor((r - R.innerKm) / kmPerPx) * 4 + 3] / 255) * R.tauScale;
    check(near(got, WW.faintTau(R, r), 0.012 * R.tauScale + 0.05 * WW.faintTau(R, r)), `the strip gives ${r} km back as ${got.toExponential(2)} (want ${WW.faintTau(R, r).toExponential(2)})`);
  }
  check(strip[3] === 0 && R.outerKm < 130000 && strip[(WW.FAINT_PX - 1) * 4 + 3] === 0, 'the strip runs from the halo\'s inner edge to just past the main ring: the gossamer rings are left out');
  const muMin = R.halo.thickKm / (R.halo.outerKm - R.halo.innerKm);
  check(near(muMin, 10000 / 33600, 1e-12), 'the halo\'s thickness over its width is the fact sheet\'s 10 000 over 33 600 km');
  const lowHalo = WW.ringThinLight(3e-6, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G, muMin);
  const lowMain = WW.ringThinLight(5e-6, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G);
  check(lowMain / lowHalo > 3, `seen 7 degrees from the plane the main ring is ${(lowMain / lowHalo).toFixed(1)} times the halo where they meet`);
  // Under Deep, from the night side, 7 degrees from the plane: the main ring's brightest part near the
  // ceiling and no further; the middle of the halo a faint glow far under it (the review of 2026-10-16).
  const deepK = lum(WW.ringColour(ju_tint(), R, 'deep'));
  const at7 = (tau, mm) => softCeiling(WW.ringThinLight(tau, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G, mm) * deepK, R.ceiling);
  const softCeiling = WW.softCeiling;
  const mainPeak = at7(7.5e-6, 0);
  const haloMid = at7(WW.faintTau(R, 106200), muMin);
  check(mainPeak < R.ceiling && mainPeak > 0.5 * R.ceiling, `under Deep the main ring's edge is ${mainPeak.toFixed(3)} linear, under its ceiling ${R.ceiling}`);
  const raw = (tau, mm) => WW.ringThinLight(tau, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G, mm);
  check(raw(WW.faintTau(R, 106200), muMin) < 0.1 * raw(7.5e-6, 0) && haloMid < 0.05 && haloMid > 0.002, `and the halo's middle a faint glow, ${haloMid.toFixed(4)} linear, a twelfth of the main ring's edge before its ceiling`);
  measured.push(`Deep, night side, 7 degrees: main ring edge ${mainPeak.toFixed(3)}, halo middle ${haloMid.toFixed(4)} linear (ceiling ${R.ceiling})`);
  // The light, through the shader's JS twin: the main ring seen 9 degrees from its plane.
  const colour = (mode) => lum(WW.ringColour(ju.look.tint, R, mode));
  const mu = Math.sin(9 * DEG);
  const day = WW.ringThinLight(5e-6, mu, Math.cos(10 * DEG), R.dust, W.RING_DUST_G);
  const night = WW.ringThinLight(5e-6, mu, Math.cos(170 * DEG), R.dust, W.RING_DUST_G);
  const dayCam = day * colour('camera');
  const nightCam = night * colour('camera');
  const dayDeep = day * colour('deep');
  check(night / day > 8, `from the night side it is ${(night / day).toFixed(1)} times brighter than from the day side`);
  check(nightCam > 0.02, `under Camera, from the night side, it shows (${nightCam.toFixed(4)} linear)`);
  check(dayCam < 0.005, `under Camera, from the day side, it hardly does (${dayCam.toFixed(4)} linear)`);
  check(dayDeep > 0.01, `under Deep it shows from the day side too (${dayDeep.toFixed(4)} linear)`);
  check(colour('eye') === 0 && WW.ringStretch(R, 'eye') === 0, 'under Eye it is drawn as it is: nothing');
  check(near(colour('camera') / WW.ringStretch(R, 'camera'), lum(lin(ju.look.tint)) * 0.015 / 0.538, 1e-9), 'its own brightness is the fact sheet\'s albedo against the planet\'s');
  measured.push(`Jupiter's main ring at 9 degrees: day ${dayCam.toExponential(2)}, night ${nightCam.toExponential(2)} under Camera; day ${dayDeep.toExponential(2)} under Deep`);
  // The shader: RING_FRAG with five lines changed, and nothing else.
  const F = WW.faintFragment();
  check(/float tau = tex\.a \* uThin\.x;\n  alpha = tau;/.test(F) && /float S = 2\.0 \* tau \/ \( rl > uHalo\.x && rl < uHalo\.y \? max\( m, uHalo\.z \) : m \);/.test(F), 'the faint shader reads its strip as optical depth, in the thin-slab limit with the halo\'s cap');
  check(/float dust = uThin\.y;/.test(F) && /dustPhase\( cosAlpha, uThin\.z \)/.test(F) && /vec3 light = uColour \* \( tex\.rgb \* body \+ fine \) \* shade;/.test(F), 'with its own share of dust, in its own colour');
  check(!/-log\( 1\.0 - alpha \)/.test(F) && !/exp\( -tau \/ m0 \)/.test(F) && F.split('{').length === F.split('}').length && F.split('(').length === F.split(')').length, 'the opacity path and the thick slab are gone, and the braces balance');
  check(W.RING_FRAG.includes('float tau = -log( 1.0 - alpha );') && !W.RING_FRAG.includes('uThin'), 'RING_FRAG itself, every other ring\'s, is unchanged');
  // The scene: the worlds and the weather on them, as main.js makes them.
  const THREE = await import(join(JS, '../vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('earth');
  const worlds = W.createWorlds(new THREE.Scene(), { textureBase: null });
  const uRing = worlds.meshFor('uranus').userData.ring;
  const lumU = (m) => lum([m.material.uniforms.uColour.value.r, m.material.uniforms.uColour.value.g, m.material.uniforms.uColour.value.b]);
  check(near(lumU(uRing), lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'on every tier Uranus\'s rings are painted at their darkness, before the weather comes');
  check(!worlds.meshFor('jupiter').getObjectByName('jupiter-faint-ring'), 'and Jupiter has no ring until the weather comes (tier 0 never has it)');
  worlds.setExposure('deep');
  check(W.URANUS_RINGS.deep === 4 && near(lumU(uRing), 4 * lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'with no weather module (tier 0), Deep still lifts Uranus\'s rings four times');
  worlds.setExposure('eye');
  check(near(lumU(uRing), lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'and Eye puts them back at their darkness');
  worlds.setExposure('camera');
  const wx = WW.createWorldWeather({ worlds });
  const ring = worlds.meshFor('jupiter').getObjectByName('jupiter-faint-ring');
  check(ring && ring.material.uniforms.uThin.value.x === 7.5e-6 && near(lum(ring.material.uniforms.uCeil.value.toArray()), 0.3, 1e-9) && ring.material.fragmentShader === F && ring.visible === true, 'with the weather, Jupiter wears its faint ring, drawn under Camera');
  check(near(lumU(ring), colour('camera'), 1e-6 * colour('camera')), 'painted at the albedo and the Camera stretch');
  worlds.setExposure('deep');
  check(near(lumU(ring), colour('deep'), 1e-6 * colour('deep')) && near(lumU(uRing), 4 * lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'the shutter repaints both: Deep lifts Jupiter\'s and four times Uranus\'s');
  worlds.setExposure('eye');
  check(ring.visible === false && near(lumU(uRing), lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'under Eye Jupiter\'s is not drawn and Uranus\'s is as it is');
  worlds.setExposure('deep');
  wx.latch();
  check(ring.visible === false && near(lumU(uRing), 4 * lum(lin(W.URANUS_RINGS.colour)), 1e-6), 'the latch takes Jupiter\'s ring off and leaves Uranus\'s lifted under Deep, as on tier 0');
  wx.unlatch();
  check(ring.visible === true, 'and Low left puts it back');
  check(wx.setBeforeGiants(true) === false && wx.beforeGiants() === false, 'the probes\' before does nothing without ?look=1');
  check(near(ring.material.uniforms.uHalo.value.z, muMin, 1e-12) && near(ring.material.uniforms.uHalo.value.y, 123000 / 69911, 1e-9), 'the halo\'s cap reaches the shader in planet radii');
  worlds.dispose();
}

// --- 4. the words --------------------------------------------------------------------------------------
{
  const G = COPY.r12Giants;
  check(G && /\{l2\}/.test(G.spot) && /\{date\}/.test(G.spot) && /\{pm\}° either side/.test(G.spot) && /JUPOS/.test(G.spot), 'the spot\'s line names the place, the day, the source and the error');
  const U = WW.GIANT_RINGS.uranus;
  const J = WW.GIANT_RINGS.jupiter;
  const nb = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  check(G.rings.uranus.includes(`about ${U.albedo * 100} %`) && G.rings.uranus.includes(`${W.URANUS_RINGS.widen} times wider`) && G.rings.uranus.includes(`lifts them ${U.stretch.deep} times`) && /as dark as they are/.test(G.rings.uranus) && /a thirtieth/.test(G.rings.uranus) && near(U.albedo / U.globeAlbedo, 1 / 30, 0.004), 'Uranus\'s rings say the albedo, the widening and the Deep lift they are drawn with');
  check(G.rings.jupiter.includes(`${nb(J.stretch.camera)} times brighter`) && G.rings.jupiter.includes(`${nb(J.stretch.deep)} times under Deep`) && G.rings.jupiter.includes(`${nb(J.halo.thickKm)} km thick`) && /illustrative/.test(G.rings.jupiter) && /drawn flat/.test(G.rings.jupiter) && /lowest quality/.test(G.rings.jupiter), 'Jupiter\'s ring says its stretch, its halo, what is illustrative and where it is not drawn');
  const { drawingLine } = await import(join(JS, 'ui/cards.js'));
  const recs = new Map(W.worldRecords().map((r) => [r.id, r]));
  check((drawingLine(recs.get('uranus')) || '').includes(G.rings.uranus) && !(drawingLine(recs.get('uranus')) || '').includes('far brighter'), 'Uranus\'s card says its rings are dark, and no longer that they are drawn far brighter');
  check((drawingLine(recs.get('jupiter')) || '').includes(G.rings.jupiter), 'Jupiter\'s card says what its faint ring is');
  check((drawingLine(recs.get('neptune')) || '').includes('far brighter'), 'Neptune\'s card keeps its own line');
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`giants FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('giants ok: the Great Red Spot where JUPOS measured it, carried by its drift and lined up with Hubble\'s map; Uranus\'s rings at their own darkness; Jupiter\'s ring from the fact sheet, seen from the night side or under Deep, never on tier 0');
