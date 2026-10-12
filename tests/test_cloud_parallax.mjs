// tests/test_cloud_parallax.mjs -- the Earth's clouds standing up, by parallax in the surface shader
// (scene/earth.js CLOUD_PARALLAX; 2026-10-13, after public #1027's marched shell was parked).
//
//   node tests/test_cloud_parallax.mjs
//
// The pure parts, on a synthetic height field: straight down the ray meets the ground point itself,
// the lean grows with the view's angle and stops, a top hides what is behind it and never what is in
// front, the search converges with its steps; the drawn thickness (where, from how high, how much);
// the last light's angle; the heights' numbers against scene/cloudcompose.js; and that the shader
// carries the same search, costs nothing where it is off, and is off on tier 0, under the latch, on
// a connection that saves data and under the Measured look.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const E = await import(join(ROOT, 'site/js/scene/earth.js'));
const CC = await import(join(ROOT, 'site/js/scene/cloudcompose.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const P = E.CLOUD_PARALLAX;
const near = (a, b, tol) => Math.abs(a - b) <= tol;

// --- 1. the search, on a synthetic field: one tower 0.8 of the slab high between x = 10 and 12 --------
{
  const tower = (x) => (x >= 10 && x <= 12 ? 0.8 : 0);
  for (const n of [4, 8]) {
    // Straight down the place is the ground point's own (the offset is lean x t = 0), and t is the top's height over it.
    check(E.cloudSeek(tower, 5, 0, n) === 0 && 0 * E.cloudSeek(tower, 11, 0, n) === 0 && Math.abs(E.cloudSeek(tower, 11, 0, n) - 0.8) < 1e-3, `${n} steps: straight down the ray meets the cloud over the ground point itself, at its top's height`);
    check(E.cloudSeek(tower, 5, 3, n) === 0, `${n} steps: a ray that passes over clear ground meets the ground`);
    // The ground point is 2 behind the tower (x = 8) and the ray leans 5 toward it: it crosses the
    // tower between t = 0.4 and 0.8, under its top, so the tower hides the ground behind it.
    const t = E.cloudSeek(tower, 8, 5, n);
    check(t > 0.3 && t <= 0.8 && tower(8 + 5 * t) > 0, `${n} steps: a tower hides the ground behind it (met ${t.toFixed(3)} of the way up)`);
    // In front of the tower the ray rises away from it: nothing is hidden.
    check(E.cloudSeek(tower, 13, 5, n) === 0, `${n} steps: and nothing in front of it`);
  }
  // A smooth hill: the search lands on the surface, nearer with more steps and near with few.
  const hill = (x) => 0.9 * Math.exp(-((x - 10) ** 2) / 8);
  const exact = (() => { let lo = 0, hi = 1; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (hill(6 + 6 * m) - m >= 0) lo = m; else hi = m; } return lo; })();
  const e4 = Math.abs(E.cloudSeek(hill, 6, 6, 4) - exact);
  const e8 = Math.abs(E.cloudSeek(hill, 6, 6, 8) - exact);
  check(e4 < 0.08 && e8 < 0.04, `on a smooth hill 4 steps and the secant land within 0.08 of the slab of the surface and 8 within 0.04 (${e4.toFixed(4)}, ${e8.toFixed(4)})`);
  // Where the ray meets the hill moves monotonically away from the ground point as it leans further.
  let last = -1;
  let mono = true;
  for (let lean = 0; lean <= 6; lean += 0.5) { const x = lean * E.cloudSeek(hill, 6, lean, 8); if (x < last - 1e-9) mono = false; last = x; }
  check(mono && last > 1, 'the further the ray leans, the further from the ground point it meets the cloud');
}

// --- 2. the lean: zero straight down, monotonic with the view's angle, capped ----------------------------
{
  check(E.cloudLeanKm(48, 1) === 0, 'straight down the lean is zero');
  let last = -1;
  let mono = true;
  for (let deg = 0; deg <= 89; deg += 1) { const l = E.cloudLeanKm(48, Math.cos((deg * Math.PI) / 180)); if (l < last) mono = false; last = l; }
  check(mono, 'the lean grows with the view\'s angle from straight down');
  check(near(E.cloudLeanKm(48, Math.cos(Math.PI / 4)), 48, 1e-9), 'at 45 degrees it is the drawn thickness');
  check(near(E.cloudLeanKm(48, 0), 48 * P.tanMax, 1e-6) && near(E.cloudLeanKm(48, 0.01), 48 * P.tanMax, 1e-6), 'and at the limb it has stopped at tanMax times it');
}

// --- 3. the drawn thickness: where, from how high, how much ----------------------------------------------
{
  const full = P.realKm * P.thicker;
  check(P.realKm === 12 && P.thicker >= 1, 'the slab is the real 12 km, times a stated factor');
  check(P.thicker === 3 && E.cloudDrawnKm(420, 0.2, 0.9) === full && E.cloudDrawnKm(420, 1, 0.05) === full, 'from the station\'s height: all of it toward the limb, and all of it under a low Sun');
  check(E.cloudDrawnKm(420, 1, 0.9) === 0 && E.cloudDrawnKm(420, P.view[1], P.sun[1]) === 0, 'looking down under a high Sun: none, the flat layer exactly');
  check(E.cloudDrawnKm(P.nearKm[1], 0.1, 0.1) === 0 && E.cloudDrawnKm(16600, 0.1, 0.1) === 0, 'from far (the whole Earth in view): none');
  check(E.cloudDrawnKm(420, 0.2, 0.9, 1) === P.realKm, 'and the factor is the only thing between the two thicknesses');
  // Continuous: no step larger than a small share of the whole between neighbours on a fine grid.
  let worst = 0;
  for (let alt = 0; alt <= 5000; alt += 25) worst = Math.max(worst, Math.abs(E.cloudDrawnKm(alt + 25, 0.3, 0.9) - E.cloudDrawnKm(alt, 0.3, 0.9)));
  for (let mu = 0; mu < 1; mu += 0.01) worst = Math.max(worst, Math.abs(E.cloudDrawnKm(420, mu + 0.01, 0.9) - E.cloudDrawnKm(420, mu, 0.9)), Math.abs(E.cloudDrawnKm(420, 1, mu + 0.01) - E.cloudDrawnKm(420, 1, mu)));
  check(worst < full * 0.06, `the thickness is continuous in the camera's height, the view and the Sun (largest step ${(worst / full).toFixed(3)} of it)`);
  let mono = true;
  for (let alt = 0; alt < 6000; alt += 50) if (E.cloudDrawnKm(alt + 50, 0.3, 0.9) > E.cloudDrawnKm(alt, 0.3, 0.9)) mono = false;
  check(mono, 'and never grows as the camera leaves');
}

// --- 4. the last light: acos( R / ( R + h ) ) ------------------------------------------------------------
{
  check(E.litTopDip(0) === 0, 'the ground loses the Sun at its own horizon');
  check(near(E.litTopDip(12), Math.acos(6371 / 6383), 1e-12) && near((E.litTopDip(12) * 180) / Math.PI, 3.51, 0.01), 'a top 12 km up keeps it 3.5 degrees longer');
  check(near((E.litTopDip(P.realKm * P.thicker) * 180) / Math.PI, 6.08, 0.02), 'and one drawn at 36 km, 6 degrees');
  let mono = true;
  for (let h = 0; h < 60; h += 1) if (E.litTopDip(h + 1) <= E.litTopDip(h)) mono = false;
  check(mono, 'higher tops keep the light longer');
  // The shader's sqrt( 2 h / R ) is that angle to a part in a hundred over the whole drawn slab.
  for (const h of [2, 12, 36]) check(near(Math.sqrt((2 * h) / 6371), E.litTopDip(h), E.litTopDip(h) * 0.01), `sqrt( 2 h / R ) is the angle at ${h} km`);
  const frag = E.SURFACE_FRAG;
  check(frag.includes('topDot = max( topDot, sunDot + sqrt( 2.0 * cTop * cDrawn ) );'), 'the shader lifts a top\'s Sun by its DRAWN height, and never below the storm top\'s own dip');
  check(/vec3 cloudSun = aerSunAbove\( tintDot,/.test(frag), 'and colours it by the air at the ground\'s own Sun, as the deck always was');
}

// --- 5. the heights are scene/cloudcompose.js's numbers ---------------------------------------------------
{
  check(near(P.liveKm[0], CC.CLEAR_SPAN_C / 6.5, 1e-9), 'a full opacity is CLEAR_SPAN_C of cooling, at 6.5 C a kilometre');
  check(near(P.liveKm[1], (CC.CLEAR_AT_EQUATOR_C - CC.CLEAR_SPAN_C - CC.STORM_TOP.fullC) / 6.5, 1e-9), 'and a full storm top goes on to STORM_TOP.fullC');
  check(E.cloudTopFromLive(0, 0) === 0 && near(E.cloudTopFromLive(1, 0), 70 / 6.5 / 12, 1e-9) && E.cloudTopFromLive(1, 1) === 1, 'no cloud is no height; an opaque deck 10.8 km; a storm top fills the slab');
  check(E.SURFACE_FRAG.includes(`min( ${(P.liveKm[0] / P.realKm).toFixed(4)} * l.r + ${(P.liveKm[1] / P.realKm).toFixed(4)} * l.b, 1.0 )`), 'the shader reads the same height from today\'s picture');
}

// --- 6. the shader: one search, off where it must be, nothing new drawn ----------------------------------
{
  const frag = E.SURFACE_FRAG;
  check(frag.includes('uniform vec3  uCloudPar;') && E.SURFACE_VERT.includes('vCamL = ( cameraPosition - modelMatrix[3].xyz ) * mat3( modelMatrix ) / dot( modelMatrix[0].xyz, modelMatrix[0].xyz );'), 'the uniform and the camera in the Earth\'s own axes are there');
  check(/if \( uCloudPar\.x > 0\.0 \) \{[^}]*\n    cDrawn = /.test(frag) && /if \( cDrawn > 0\.0 \) \{/.test(frag) && /lod = cloudLod\( dFdx\( vUv \), dFdy\( vUv \) \);\n    cDrawn = /.test(frag), 'the search is behind the uniform and behind the drawn thickness: off, it is a compare');
  check(frag.includes('float cloud  = cloudCover( vUv );') && frag.includes('float shade  = cloudCover( vUv + shadowStep );'), 'the flat layer\'s single lookup and its shadow are still what is drawn where the thickness is 0');
  check(frag.includes('tHit = t + ( tp - t ) * clamp( f / max( f - fp, 1e-4 ), 0.0, 1.0 ); break;'), 'the shader\'s search ends with the same secant as cloudSeek');
  const at = frag.slice(frag.indexOf('vec3 cloudAt('), frag.indexOf('float cloudLod('));
  check((at.match(/textureLod\(/g) || []).length === 3 && !/texture2D\(|textureGrad\(/.test(at), 'every read inside the loops is at a stated mip level');
  check(/if \( l\.g < 0\.999 \) \{\s+float m = textureLod\( uClouds,/.test(at), 'and the static map is not read where today\'s picture covers');
  check(frag.includes('if ( i == 1 ) fp = f + t - 1.0;') && frag.includes('if ( c.x < 0.97 ) shade = mix( shade, cloudShadow( vUv, 0.0, sunLean, lod ), k );'), 'the top of the slab costs no read, and under solid cloud the ground\'s shadow is not looked for');
  // The uniform by tier, latch, saveData and look.
  const mesh = E.createEarth({});
  const u = mesh.material.uniforms.uCloudPar.value;
  check(u.x === 0 && u.y === 0 && near(u.z, (P.realKm * P.thicker) / E.WGS84_A_KM, 1e-12), 'a new Earth has the flat layer and the stated thickness');
  check(E.setEarthCloudHeight(mesh, { tier: 0 }) === 0 && u.x === 0, 'tier 0: the flat layer');
  check(E.setEarthCloudHeight(mesh, { tier: 1 }) === 4 && u.x === 4 && u.y === P.sunSteps[1], 'tier 1: 4 steps');
  check(E.setEarthCloudHeight(mesh, { tier: 2 }) === 8 && u.y === P.sunSteps[2] && P.sunSteps[2] <= 4 && P.sunSteps[1] >= 2, 'tier 2: 8 steps, and 2 to 4 toward the Sun');
  check(E.setEarthCloudHeight(mesh, { tier: 5 }) === 8, 'a tier past the list is its last');
  check(E.setEarthCloudHeight(mesh, { look: 'measured' }) === 0 && u.x === 0, 'the Measured look: true thickness, the flat layer');
  check(E.setEarthCloudHeight(mesh, { look: 'film' }) === 8, 'Film again: back, the tier remembered');
  check(E.setEarthCloudHeight(mesh, { off: true }) === 0 && E.setEarthCloudHeight(mesh, { tier: 2 }) === 0, 'the latch or saveData: off, whatever tier is told later');
  check(E.setEarthCloudHeight(mesh, { tier: 1, off: false }) === 4, 'Low left again: back');
  check(E.setEarthCloudHeight(null, { tier: 1 }) === 0, 'no mesh is no error');
  // No new mesh: the Earth still has its one child, the air.
  check(mesh.children.length === 1 && mesh.children[0] === mesh.userData.atmosphere, 'no new mesh');
  const main = read('site/js/main.js');
  check(/setEarthCloudHeight\(earthMesh\(\), \{ tier, off: plan\.stripped \|\| cloudsSaveData \}\)/.test(main) && /const cloudsSaveData = shouldSaveData\(nav\.connection\);/.test(main), 'main.js tells it the tier, the latch\'s removals and saveData');
  check(/setEarthAirQuality\(earthMesh\(\), 0, true\); setEarthCloudHeight\(earthMesh\(\), \{ off: true \}\);/.test(main), 'and the latch');
  check(/setLook: \(mode\) => \{ lookMeasured = mode === 'measured'; setEarthCloudHeight\(meshes\.get\('earth'\), \{ look: mode \}\); \}/.test(read('site/js/scene/worlds.js')), 'scene/worlds.js tells it the look');
  // The tiles wear the same shader with the globe's own uniform objects.
  const T = await import(join(ROOT, 'site/js/scene/tiles.js'));
  check(T.earthTileFragment().includes('uCloudPar') && T.earthTileVertex().includes('vCamL'), 'the Earth\'s close-up tiles carry the same search');
}

// --- 7. the card says the factor --------------------------------------------------------------------------
{
  const s = COPY.drawing.worldDeparture.earth;
  check(/drawn \{clouds\} times thicker than they are/.test(s) && /true thickness in the Measured look/.test(s) && /measured temperature/.test(s) && /brightness elsewhere/.test(s), 'the Earth\'s card says the factor, the Measured look, and where each height is from');
  const { worldRecords } = await import(join(ROOT, 'site/js/scene/worlds.js'));
  const earth = worldRecords().find((r) => r.id === 'earth');
  const said = JSON.stringify(earth);
  check(said.includes(`drawn ${P.thicker} times thicker than they are`) && !said.includes('{clouds}'), 'and the number in it is CLOUD_PARALLAX.thicker');
}

if (problems.length) { console.error('test_cloud_parallax: FAIL\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('test_cloud_parallax: ok');
