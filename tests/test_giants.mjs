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
  let before = false;
  const wx = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null, beforeGiants: () => before } });
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
  before = true;
  wx.update(t + 1000, 32);
  check(u.uWxShift.value === 0 && wx.spotLine('jupiter', t) === null, 'the probes\' before puts the spot back where the map has it and says nothing');
  before = false;
  wx.latch();
  check(wx.spotLine('jupiter', t) === null, 'after the latch the map is the map, and the card does not claim the spot');
}

// --- 2. Uranus's rings at their own darkness -----------------------------------------------------------
const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const lin = (hex) => [(hex >> 16) & 255, (hex >> 8) & 255, hex & 255].map((v) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); });
{
  const ur = W.WORLDS.find((w) => w.id === 'uranus');
  const R = W.URANUS_RINGS;
  check(ur.look.ring === R && R.albedo === 0.015 && R.globeAlbedo === 0.488, 'Uranus wears its rings with the fact sheets\' albedos: rings 0.015, planet 0.488');
  const cam = W.ringColour(ur, 'camera');
  const ratio = lum(cam) / lum(lin(ur.look.tint));
  check(near(ratio, 0.015 / 0.488, 1e-6) && ratio < 1 / 25, `face-on and lit from overhead the rings are ${(ratio * 100).toFixed(1)} % of the clouds' mean`);
  check(cam[0] === cam[1] && cam[1] === cam[2], 'grey: Uranus\'s rings are spectrally flat');
  check(near(lum(W.ringColour(ur, 'deep')), 4 * lum(cam), 1e-9) && near(lum(W.ringColour(ur, 'eye')), lum(cam), 1e-12), 'only Deep lifts them, four times');
  const was = lum(lin(W.URANUS_RINGS_BEFORE));
  check(was / lum(cam) > 15, `the grey they were drawn in was ${(was / lum(cam)).toFixed(0)} times brighter`);
  measured.push(`Uranus's rings: ${lum(cam).toFixed(4)} linear under Camera (was ${was.toFixed(3)}), clouds ${lum(lin(ur.look.tint)).toFixed(3)}`);
  // The radii and widths are the same rows as before (tests/test_rings.mjs holds them against the strip).
  check(R.bands.length === 10 && R.bands[9][0] === 51149 && R.widen === 10, 'the ten rings at the fact sheet\'s radii, drawn ten times wider');
  // Neptune's are as they were.
  check(!W.NEPTUNE_RINGS.albedo && W.ringColour(W.WORLDS.find((w) => w.id === 'neptune'), 'deep').every((v, i) => near(v, lin(W.NEPTUNE_RINGS.colour)[i], 1e-12)), 'Neptune\'s rings are left as they were');
}

// --- 3. Jupiter's faint ring --------------------------------------------------------------------------
{
  const ju = W.WORLDS.find((w) => w.id === 'jupiter');
  const R = W.JUPITER_RINGS;
  check(ju.look.ring === R && R.faint === true && R.tauScale === 5e-6, 'Jupiter wears a faint ring, tier 1 and up');
  // The fact sheet's parts: [inner, outer, tau].
  const parts = [['halo', 89400, 123000, 3e-6], ['main', 123000, 128940, 5e-6]];
  const strip = W.ringBandsStrip(R);
  const kmPerPx = (R.outerKm - R.innerKm) / W.RING_BANDS_PX;
  for (const [name, a, b, tau] of parts) {
    const band = R.bands.find((x) => near(x[0] - x[1] / 2, a, 1) && near(x[0] + x[1] / 2, b, 1));
    check(band && band[2] === tau, `the ${name} ring is ${a} to ${b} km at optical depth ${tau}`);
    const mid = Math.floor(((a + b) / 2 - R.innerKm) / kmPerPx);
    const got = (strip[mid * 4 + 3] / 255) * R.tauScale;
    check(near(got, tau, Math.max(0.03 * tau, R.tauScale / 510)), `and the strip gives it back as ${got.toExponential(2)}`);
  }
  check(strip[3] > 0 && R.outerKm < 130000 && R.bands.length === 2, 'the strip runs from the halo\'s inner edge to just past the main ring: the gossamer rings are left out');
  // The halo is thick: seen low, no brighter than its width over its thickness allows.
  const muMin = R.halo.thickKm / (R.halo.outerKm - R.halo.innerKm);
  check(near(muMin, 10000 / 33600, 1e-12), 'the halo\'s thickness over its width is the fact sheet\'s 10 000 over 33 600 km');
  const lowHalo = W.ringThinLight(3e-6, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G, muMin);
  const lowMain = W.ringThinLight(5e-6, Math.sin(7 * DEG), Math.cos(173 * DEG), R.dust, W.RING_DUST_G);
  check(lowMain / lowHalo > 3, `seen 7 degrees from the plane the main ring is ${(lowMain / lowHalo).toFixed(1)} times the halo`);
  check(/S = 2\.0 \* tau \/ \( rl > uHalo\.x && rl < uHalo\.y \? max\( m, uHalo\.z \) : m \);/.test(W.RING_FRAG), 'and RING_FRAG holds the same cap');
  // The light, through the shader's JS twin: the main ring seen 9 degrees from its plane.
  const colour = (mode) => lum(W.ringColour(ju, mode));
  const mu = Math.sin(9 * DEG);
  const day = W.ringThinLight(5e-6, mu, Math.cos(10 * DEG), R.dust, W.RING_DUST_G);
  const night = W.ringThinLight(5e-6, mu, Math.cos(170 * DEG), R.dust, W.RING_DUST_G);
  const dayCam = day * colour('camera');
  const nightCam = night * colour('camera');
  const dayDeep = day * colour('deep');
  check(night / day > 8, `from the night side it is ${(night / day).toFixed(1)} times brighter than from the day side`);
  check(nightCam > 0.02, `under Camera, from the night side, it shows (${nightCam.toFixed(4)} linear)`);
  check(dayCam < 0.005, `under Camera, from the day side, it hardly does (${dayCam.toFixed(4)} linear)`);
  check(dayDeep > 0.01, `under Deep it shows from the day side too (${dayDeep.toFixed(4)} linear)`);
  check(colour('eye') === 0 && W.ringStretch(R, 'eye') === 0, 'under Eye it is drawn as it is: nothing');
  check(near(colour('camera') / W.ringStretch(R, 'camera'), lum(lin(ju.look.tint)) * 0.015 / 0.538, 1e-9), 'its own brightness is the fact sheet\'s albedo against the planet\'s');
  measured.push(`Jupiter's main ring at 9 degrees: day ${dayCam.toExponential(2)}, night ${nightCam.toExponential(2)} under Camera; day ${dayDeep.toExponential(2)} under Deep`);
  // The shader: optical depth from the strip, the thin-slab limit, its dust in its own colour.
  const F = W.RING_FRAG;
  check(/if \( uThin\.x > 0\.0 \) \{ tau = tex\.a \* uThin\.x; alpha = tau; \}/.test(F) && /S = 2\.0 \* tau \/ \( rl > uHalo/.test(F), 'RING_FRAG reads a faint ring\'s strip as optical depth, in the thin-slab limit');
  check(/float dust = \( uThin\.x > 0\.0 \? uThin\.y : RING_DUST \)/.test(F), 'with its own share of dust');
  // The scene: built, painted by the exposure, hidden on tier 0.
  const THREE = await import(join(JS, '../vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  stage.setWorld('earth');
  const worlds = W.createWorlds(new THREE.Scene(), { textureBase: null });
  const ring = worlds.meshFor('jupiter').userData.ring;
  const uRing = worlds.meshFor('uranus').userData.ring;
  check(ring && ring.material.uniforms.uThin.value.x === 5e-6 && ring.material.uniforms.uDustColour.value.x === 1, 'Jupiter\'s ring mesh reads optical depth and colours its dust as itself');
  const sat = worlds.meshFor('saturn').userData.ring.material.uniforms;
  check(sat.uThin.value.x === 0 && near(sat.uDustColour.value.x, W.RING_DUST_COLOUR[0], 1e-9), 'Saturn\'s ring is as it was');
  const lumU = (m) => lum([m.material.uniforms.uColour.value.r, m.material.uniforms.uColour.value.g, m.material.uniforms.uColour.value.b]);
  check(near(lumU(uRing), lum(W.ringColour(W.WORLDS.find((w) => w.id === 'uranus'), 'camera')), 1e-6), 'Uranus\'s ring mesh is painted at its albedo');
  worlds.setExposure('deep');
  check(near(lumU(ring), colour('deep'), 1e-6 * colour('deep')) && worlds.exposure() === 'deep', 'the shutter repaints the rings');
  worlds.setExposure('eye');
  check(lumU(ring) === 0, 'and under Eye Jupiter\'s has no light');
  worlds.setExposure('camera');
  check(worlds.setBeforeGiants(true) === false && worlds.beforeGiants() === false, 'the probes\' before does nothing without ?look=1');
  worlds.update(Date.UTC(2026, 9, 16), null);
  check(ring.visible === false, 'tier 0 (no relief allowed): Jupiter\'s ring is not drawn, so it costs nothing');
  worlds.setRelief(true);
  worlds.update(Date.UTC(2026, 9, 16, 1), null);
  check(ring.visible === true, 'tier 1 and up: it is');
  worlds.setExposure('eye');
  worlds.update(Date.UTC(2026, 9, 16, 2), null);
  check(ring.visible === false, 'and not under Eye');
  worlds.dispose();
}

// --- 4. the words --------------------------------------------------------------------------------------
{
  const G = COPY.r12Giants;
  check(G && /\{l2\}/.test(G.spot) && /\{date\}/.test(G.spot) && /\{pm\}° either side/.test(G.spot) && /JUPOS/.test(G.spot), 'the spot\'s line names the place, the day, the source and the error');
  check(/\{a\} %/.test(G.rings.uranus) && /\{w\} times wider/.test(G.rings.uranus) && /\{d\} times/.test(G.rings.uranus) && /as dark as they are/.test(G.rings.uranus), 'Uranus\'s rings say their albedo, the widening and the Deep lift');
  check(/\{c\} times brighter/.test(G.rings.jupiter) && /\{d\} times under Deep/.test(G.rings.jupiter) && /illustrative/.test(G.rings.jupiter) && /drawn flat/.test(G.rings.jupiter), 'Jupiter\'s ring says its stretch, what is illustrative and that the halo is flattened');
  const recs = new Map(W.worldRecords().map((r) => [r.id, r]));
  const ju = recs.get('jupiter').meta;
  const ur = recs.get('uranus').meta;
  check(ju.ringsWords === 'jupiter' && ju.ringsCamera === 8000 && ju.ringsDeep === 40000, 'Jupiter\'s card carries the stretch it is drawn with');
  check(ur.ringsWords === 'uranus' && ur.ringsAlbedo === 0.015 && ur.ringsDeep === 4 && ur.ringsWiden === 10, 'Uranus\'s card carries the albedo and the lift it is drawn with');
  check(!recs.get('neptune').meta.ringsWords, 'Neptune\'s card keeps its own line');
}

console.log('measured:');
for (const m of measured) console.log(`  ${m}`);
if (problems.length) {
  console.log(`giants FAILED:\n  ${problems.join('\n  ')}`);
  process.exit(1);
}
console.log('giants ok: the Great Red Spot where JUPOS measured it, carried by its drift and lined up with Hubble\'s map; Uranus\'s rings at their own darkness; Jupiter\'s ring from the fact sheet, seen from the night side or under Deep, never on tier 0');
