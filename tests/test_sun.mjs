// tests/test_sun.mjs -- the Sun close up (spec 0055 task 3, scene/sun.js, data/sunregions.js): the
// limb darkening model against the measurement, today's sunspot groups from NOAA's list onto the
// sphere, the module's switch between the flat disc and the detailed one, and the rule that none of
// it is part of a first visit.
import { fileURLToPath, pathToFileURL } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/sun.js'));
const R = await import(join(JS, 'data/sunregions.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps;

// --- 1. limb darkening: the model, and the measurement it is checked against -------------------------
{
  // Eddington: T(tau) = Teff (3/4 (tau + 2/3))^(1/4); tau = 1 is 6 103 K, the top is 4 854 K.
  check(near(S.limbTemperature(1), 6103, 2) && near(S.limbTemperature(0), 4854, 2), `T(1) ${S.limbTemperature(1).toFixed(0)} K, T(0) ${S.limbTemperature(0).toFixed(0)} K; want 6103 and 4854`);
  check(near(S.T_EFF * Math.pow(0.75 * (2 / 3 + 2 / 3), 0.25), S.T_EFF, 1e-9), 'at tau = 2/3 the temperature is the effective temperature');
  check(S.measuredLimb550(1) === 1 && near(S.measuredLimb550(0), 0.30) && near(S.measuredLimb550(0.5), 0.7075), 'the measured law at 550 nm: 1 at the centre, 0.7075 at mu 0.5, 0.30 at the limb');
  let worst = 0;
  for (let mu = 0; mu <= 1.0001; mu += 0.05) worst = Math.max(worst, Math.abs(S.modelLimb(mu, 550) - S.measuredLimb550(mu)));
  check(worst < 0.05, `the model's green stays within 0.05 of the measurement: worst ${worst.toFixed(3)}`);
  check(near(S.modelLimb(1, 610), 1) && near(S.modelLimb(1, 465), 1), 'every colour is 1 at the centre');
  // The limb is redder: blue falls further than green, green further than red.
  check(S.modelLimb(0.1, 465) < S.modelLimb(0.1, 550) && S.modelLimb(0.1, 550) < S.modelLimb(0.1, 610), 'the limb is redder than the centre');
  check(S.modelLimb(0, 465) > 0.2 && S.modelLimb(0, 610) < 0.45, `the limb is dim, not black: red ${S.modelLimb(0, 610).toFixed(2)}, blue ${S.modelLimb(0, 465).toFixed(2)}`);
  // The shader is the same law.
  check(S.SUN_FRAG.includes(`const float T_EFF = ${S.T_EFF.toFixed(1)};`) && S.SUN_FRAG.includes('pow( 0.75 * ( mu + 2.0 / 3.0 ), 0.25 )') && S.CHANNEL_NM.every((nm) => S.SUN_FRAG.includes(`planck( ${nm.toFixed(1)}, T )`)),
    'the fragment shader computes the same model at the same three wavelengths');
  check(!/\bflat\b|\bhalf\b/.test(S.SUN_FRAG) && !/\bflat\b|\bhalf\b/.test(S.CORONA_FRAG), 'no reserved GLSL word is used as a name');
  check(S.SUN_FRAG.includes('#include <colorspace_fragment>') && S.SUN_FRAG.includes('#include <logdepthbuf_fragment>') && S.CORONA_FRAG.includes('#include <logdepthbuf_fragment>'), 'both shaders write log depth and the output colour space');
}

// --- 2. NOAA's list -----------------------------------------------------------------------------------
const FEED = [
  { observed_date: '2026-10-05', region: 4540, latitude: 5, longitude: 10, area: 300, number_spots: 9 },
  { observed_date: '2026-10-06', region: 4548, latitude: -12, longitude: 24, location: 'S12E24', area: 50, number_spots: 1 },
  { observed_date: '2026-10-06', region: 4547, latitude: 15, longitude: -58, location: 'N15W58', area: 30, number_spots: 8 },
  { observed_date: '2026-10-06', region: 4546, latitude: -19, longitude: -102, area: null, number_spots: null },
  { observed_date: '2026-10-06', region: 4549, latitude: 10, longitude: -10, area: 60, number_spots: 12 },
  { observed_date: '2026-10-06', region: 4550, latitude: null, longitude: 3, area: 20 },
  { observed_date: 'yesterday', region: 1, latitude: 0, longitude: 0, area: 999 },
  null,
];
{
  const list = R.parseSunRegions(FEED);
  check(list.length === 3 && list.map((r) => r.region).join() === '4549,4548,4547', `the newest day's groups that have spots, biggest first: ${list.map((r) => r.region)}`);
  check(list[0].observedMs === Date.UTC(2026, 9, 6) && list[1].latDeg === -12 && list[1].eastDeg === 24 && list[1].areaMsh === 50, 'with the list\'s own day and each group\'s place and area');
  check(R.parseSunRegions('nope').length === 0 && R.parseSunRegions([]).length === 0 && R.parseSunRegions([{ observed_date: '2026-10-06' }]).length === 0, 'a feed that is not a list, or has nothing usable, is no spots');
  const many = Array.from({ length: 30 }, (_, i) => ({ observed_date: '2026-10-06', region: 5000 + i, latitude: 0, longitude: i, area: 10 + i }));
  check(R.parseSunRegions(many).length === R.MAX_SPOTS && R.parseSunRegions(many)[0].areaMsh === 39, `at most ${R.MAX_SPOTS}, the biggest kept`);
  // Area to size: 500 millionths of a hemisphere is a cap of radius sqrt(2 x 500e-6) = 0.0316 rad, 22 000 km.
  check(near(R.spotRadiusRad(500), 0.031623, 1e-5) && near(R.spotRadiusRad(500) * 696340, 22020, 30), `a 500-millionths group is ${(R.spotRadiusRad(500) * 696340).toFixed(0)} km in radius`);
  check(R.spotRadiusRad(1) === R.spotRadiusRad(R.MIN_AREA_MSH), 'a tiny group is drawn at the floor size');
  // The turning: 13.2 degrees a day westward.
  check(near(R.carriedWestDeg(0, 86400000), 360 / 27.2753) && near(360 / R.CARRINGTON_SYNODIC_DAYS, 13.199, 1e-3), 'a day carries a group 13.2 degrees west');
  // Placement. The Earth along +X of the Sun's axes (+Y north): west is n x c = (0, 0, -1).
  const earth = [1, 0, 0];
  const t0 = list[0].observedMs;
  const at = (r, t = t0) => R.spotDirection(r, earth, t).map((v) => +v.toFixed(6));
  check(JSON.stringify(at({ latDeg: 0, eastDeg: 0, observedMs: t0 })) === '[1,0,0]', 'a group on the central meridian at the equator faces the Earth');
  check(JSON.stringify(at({ latDeg: 0, eastDeg: -90, observedMs: t0 })) === '[0,0,-1]', 'ninety degrees WEST (longitude -90) is at n x earth');
  check(JSON.stringify(at({ latDeg: 0, eastDeg: 90, observedMs: t0 })) === '[0,0,1]', 'ninety degrees EAST is opposite: the limb turning into view');
  check(JSON.stringify(at({ latDeg: 90, eastDeg: 33, observedMs: t0 })) === '[0,1,0]', 'latitude 90 is the north pole');
  const later = at({ latDeg: 0, eastDeg: 13.199, observedMs: t0 }, t0 + 86400000);
  check(near(later[0], 1, 1e-4) && near(later[2], 0, 1e-3), `a group 13.2 degrees east reaches the central meridian a day later: ${later}`);
  // The Earth above the Sun's equator (B0): the meridian is still the one through the Earth.
  const tilted = R.spotDirection({ latDeg: 0, eastDeg: 0, observedMs: t0 }, [Math.cos(0.12), Math.sin(0.12), 0], t0);
  check(near(tilted[0], 1, 1e-9) && near(tilted[1], 0, 1e-9), 'with the Earth off the Sun\'s equator the central meridian still passes under it');
  check(R.spotDirection(list[0], [0, 1, 0], t0) === null, 'the Earth over the pole of the axes: no meridian, no spot');
  check(R.regionsFresh(t0, t0 + 6 * 86400000) && !R.regionsFresh(t0, t0 + 8 * 86400000) && !R.regionsFresh(t0, t0 - 30 * 86400000) && !R.regionsFresh(NaN, t0), `a list is drawn within ${R.MAX_AGE_DAYS} days of its own day and not beyond`);
  check(R.SUN_REGIONS_URL === 'https://services.swpc.noaa.gov/json/solar_regions.json', 'the address is SWPC\'s');
  // Our saved copy is the first route (internal #525): registry row, sources.js entry and the reader agree.
  const SRC = await import(join(JS, 'data/sources.js'));
  const regYaml = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
  const row = regYaml.slice(regYaml.indexOf(`  - id: ${R.SUN_REGIONS_SOURCE_ID}\n`));
  check(SRC.SOURCES[R.SUN_REGIONS_SOURCE_ID] && SRC.SOURCES[R.SUN_REGIONS_SOURCE_ID].url === R.SUN_REGIONS_URL && row.includes(`url: ${R.SUN_REGIONS_URL}\n`) && /parser: swpc_solar_regions/.test(row.slice(0, 500)), 'registry row, sources.js entry and the module name the same address');
  const asked = [];
  const copy = await R.readSunRegions({ load: async (id) => { asked.push(id); return { data: [{ observed_date: '2026-10-06', region: 1 }] }; } });
  check(asked.join() === 'swpc-solar-regions' && Array.isArray(copy), 'the page reads the saved copy through load(), by registry id');
  let why = null;
  try { await R.readSunRegions({ load: async () => ({ data: null, error: 'could not look' }) }); } catch (e) { why = e.message; }
  check(why === 'could not look', 'with neither a copy nor SWPC it rejects with the reason');
}

// --- 3. the module: the flat disc far away, the detailed Sun close, the flat disc under the latch -----
{
  const plain = new THREE.MeshBasicMaterial({ color: 0xf18833, toneMapped: false });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), plain);
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ opacity: 1 }));
  mesh.add(sprite);
  mesh.userData.corona = sprite;
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.01, 1e6);
  camera.position.set(0, 0, 5); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  const sun = S.createSunDetail({ mesh, camera, tier: 1 });
  const t0 = Date.UTC(2026, 9, 6, 12);
  const earth = new THREE.Vector3(0, 0, 150);
  sun.update(t0, 0.011, earth);
  check(mesh.material === plain && sun.state().on === false && sprite.material.opacity === 1, 'from the Earth the Sun is the flat disc and its round glow');
  sun.update(t0, 0.5, earth);
  const st = sun.state();
  check(mesh.material !== plain && mesh.material.name === 'sun-photosphere' && st.on && sprite.material.opacity === 0, 'close up it wears the photosphere and the glow gives way to the corona');
  check(mesh.material.toneMapped === false, 'and stays out of the tone mapper, as the flat disc does');
  const corona = mesh.children.find((c) => c.name === 'sun-corona-plane');
  check(corona && corona.visible && corona.material.blending === THREE.AdditiveBlending && corona.material.depthWrite === false && st.corona === 1, 'the corona is an additive plane that writes no depth');
  // The plane faces the camera whatever the Sun's own turn.
  mesh.rotation.set(0.3, 1.1, -0.2); mesh.updateMatrixWorld(true);
  sun.update(t0, 0.5, earth);
  const normal = new THREE.Vector3(0, 0, 1).applyQuaternion(corona.getWorldQuaternion(new THREE.Quaternion()));
  check(near(normal.z, 1, 1e-6), `the corona's plane faces the camera: its normal is ${normal.toArray().map((v) => v.toFixed(3))}`);
  mesh.rotation.set(0, 0, 0); mesh.updateMatrixWorld(true);
  check(st.grain > 0 && st.grain < 1 && sun.state().spots === 0, 'the grain is part-way in at half the view, and there are no spots without a list');
  sun.update(t0, 1.5, earth);
  check(sun.state().grain === 1, 'and full when the Sun fills the view');
  // Today's groups, counted from the Earth's meridian: the Earth is along +Z here.
  sun.setRegions(R.parseSunRegions(FEED));
  sun.update(Date.UTC(2026, 9, 6), 1.5, earth);
  const u = mesh.material.uniforms;
  check(u.uSpotCount.value === 3 && sun.state().spots === 3, 'three groups are drawn');
  const s0 = u.uSpots.value[0]; // region 4549: N10, 10 degrees west
  check(near(s0.y, Math.sin(10 * Math.PI / 180), 1e-6) && s0.z > 0.9 && s0.x > 0 && near(s0.w, R.spotRadiusRad(60), 1e-9), `a group north and west of the centre is up and toward n x earth (+X here): ${s0.toArray().map((v) => v.toFixed(3))}`);

  // A group of several spots with a reported width is drawn as a leading spot to the west and a following spot to the east.
  {
    const wide = R.parseSunRegions([
      { observed_date: '2026-10-06', region: 1, latitude: 10, longitude: -10, area: 290, number_spots: 30, extent: 11 },
      { observed_date: '2026-10-06', region: 2, latitude: -13, longitude: 20, area: 40, number_spots: 1, extent: 2 },
      { observed_date: '2026-10-06', region: 3, latitude: 18, longitude: -46, area: 40, number_spots: 8 },
    ]);
    check(wide[0].extentDeg === 11 && wide[1].extentDeg === 2 && wide[2].extentDeg === 0, 'the feed\'s extent rides through the parser (0 when absent)');
    const two = R.splitRegion(wide[0]);
    check(two.length === 2 && two[0].part === 'leading' && two[1].part === 'following', 'a wide group of many spots is two circles');
    check(two[0].eastDeg < two[1].eastDeg, 'the leading spot is the western one (smaller east)');
    check(Math.abs(two[0].areaMsh + two[1].areaMsh - 290) < 1e-9 && two[0].latDeg === 10 && two[1].latDeg === 10, 'the two share the reported area and latitude');
    const gapDeg = two[1].eastDeg - two[0].eastDeg;
    check(Math.abs((two[0].eastDeg + two[1].eastDeg) / 2 - (-10)) < 1e-9 && gapDeg >= (R.spotRadiusRad(two[0].areaMsh) + R.spotRadiusRad(two[1].areaMsh)) * 180 / Math.PI, `centred on the reported place, apart by ${gapDeg.toFixed(2)} degrees, the circles do not overlap`);
    check(R.splitRegion(wide[1]).length === 1 && R.splitRegion(wide[2]).length === 1, 'a single spot, or a group with no width given, stays one circle');
    sun.setRegions(wide);
    sun.update(Date.UTC(2026, 9, 6), 1.5, earth);
    const ws = sun.state();
    check(u.uSpotCount.value === 4 && ws.spots === 3 && ws.circles === 4 && ws.pairs === 1, `three groups, four circles, one pair (${JSON.stringify({ s: ws.spots, c: ws.circles, p: ws.pairs })})`);
    check(u.uSpots.value[0].x < u.uSpots.value[1].x || Math.abs(u.uSpots.value[0].x - u.uSpots.value[1].x) > 1e-6, 'the two circles stand at different places');
    // a pair is never drawn as half of one when the array is nearly full
    const many = [];
    for (let k = 0; k < 12; k++) many.push({ observed_date: '2026-10-06', region: 100 + k, latitude: 5 + k, longitude: -50 + 8 * k, area: 500 - 10 * k, number_spots: 10, extent: 8 });
    sun.setRegions(R.parseSunRegions(many));
    sun.update(Date.UTC(2026, 9, 6), 1.5, earth);
    const ms = sun.state();
    check(ms.circles <= R.MAX_SPOTS && ms.circles === ms.spots + ms.pairs && u.uSpotCount.value === ms.circles, `twelve wide groups fit the array as whole pairs (${ms.spots} groups, ${ms.circles} circles)`);
    sun.setRegions(R.parseSunRegions(FEED));
    sun.update(Date.UTC(2026, 9, 6), 1.5, earth);
  }
  sun.update(Date.UTC(2026, 9, 20), 1.5, earth);
  check(sun.state().spots === 0, 'two weeks from the list\'s day nothing is drawn');
  // Tier 0: no grain. The latch: everything off, for good.
  const phone = S.createSunDetail({ mesh: new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial()), camera, tier: 0 });
  phone.update(t0, 1.5, earth);
  check(phone.state().on && phone.state().grain === 0, 'a phone gets the limb and the corona and no grain');
  sun.latch();
  sun.update(t0, 1.5, earth);
  check(mesh.material === plain && !corona.visible && sprite.material.opacity === 1 && sun.state().latched, 'under the latch the flat disc and the glow are back and stay');
  check(S.createSunDetail({}) === null, 'no mesh, no detail');
  check(S.carringtonNumber(Date.UTC(2026, 9, 6)) > 2300 && S.carringtonNumber(Date.UTC(2026, 9, 6) + 28 * 86400000) === S.carringtonNumber(Date.UTC(2026, 9, 6)) + 1, 'the corona\'s seed turns over once a rotation');
}

// --- 4. off the first visit, and said on the card -------------------------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(/import\('\.\/scene\/sun\.js'\)/.test(main) && /import\('\.\/data\/sunregions\.js'\)/.test(main), 'main.js imports the Sun\'s modules dynamically');
  for (const f of ['scene/sun.js', 'data/sunregions.js']) {
    const name = f.split('/').pop().replace('.', '\\.');
    check(!new RegExp(`^\\s*import[^;]*from\\s*'[^']*${name}'`, 'm').test(main), `main.js must not import ${f} statically`);
    check(!html.includes(f), `site/index.html must not preload ${f}`);
  }
  const m = main.match(/const SUN_DETAIL_AT = ([\d.]+);/);
  check(m && Number(m[1]) === S.SUN_DETAIL_AT, 'main.js fetches the module at scene/sun.js\'s own SUN_DETAIL_AT');
  // From the Earth the Sun is 0.011 of half the view (0.267 degrees over tan 22.5): five times too small.
  const fromEarth = (696340 / 149597870.7) / Math.tan((45 * Math.PI) / 360);
  check(fromEarth < S.SUN_DETAIL_AT / 5, `a first visit, at the Earth, is far outside the mark: ${fromEarth.toFixed(4)} against ${S.SUN_DETAIL_AT}`);
  check(/tilesSaveData \|\| tiers\.latched\) return;\s*\n\s*import\('\.\/data\/sunregions\.js'\)/.test(main), 'NOAA\'s list is not fetched on a connection that asked to save data');
  check(typeof COPY.drawing.worldSun === 'string' && /model/.test(COPY.drawing.worldSun) && /illustrative/.test(COPY.drawing.worldSun), 'the card says what is modelled and what is illustrative');
  check(/\{n\}/.test(COPY.sun.spotsPaired) && /\{pairs\}/.test(COPY.sun.spotsPaired) && /\{date\}/.test(COPY.sun.spotsPaired) && /illustrative/.test(COPY.sun.spotsPaired) && /illustrative/.test(COPY.sun.spotsPairedOne) && /leading/.test(COPY.sun.spotsPaired), 'the card says which groups are drawn as two and that the gap and the split are illustrative');
  check(COPY.sun && /\{n\}/.test(COPY.sun.spots) && /\{date\}/.test(COPY.sun.spots) && /NOAA/.test(COPY.sun.spots) && /NOAA/.test(COPY.sun.regionsCredit), 'and whose list the spots are');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(credits.includes(COPY.sun.regionsCredit) && credits.includes('solar_regions.json'), 'CREDITS.md carries the sunspot list\'s credit line');
}

// Stars fade near the Sun (scene/starfield.js sunGlare; internal #404, public #412).
{
  const S = await import(pathToFileURL(join(ROOT, 'site/js/scene/starfield.js')).href);
  const T3 = await import(pathToFileURL(join(ROOT, 'site/vendor/three.module.min.js')).href);
  const deg = Math.PI / 180;
  const home = S.sunGlare(0.267 * deg);     // the Sun from the Earth
  check(Math.abs(home.innerRad - 1.5 * deg) < 1e-12 && Math.abs(home.outerRad - 6 * deg) < 1e-12, 'from the Earth: no star within a degree and a half of the Sun, all of them past six');
  const near = S.sunGlare(10 * deg);
  check(Math.abs(near.innerRad - 20 * deg) < 1e-12 && Math.abs(near.outerRad - 60 * deg) < 1e-12, 'close up the glare grows with the disc: gone to twice its radius, whole past six');
  check(S.sunGlare(80 * deg).outerRad <= Math.PI && S.sunGlare(NaN).innerRad === 1.5 * deg, 'and it is bounded');
  const field = S.createStarfield(new T3.Scene(), {
    starsBin: readFileSync(join(ROOT, 'site/data/stars.bin')),
    linesJson: JSON.parse(readFileSync(join(ROOT, 'site/data/constellations.lines.json'), 'utf8')),
    namesJson: JSON.parse(readFileSync(join(ROOT, 'site/data/constellation-names.json'), 'utf8')),
    milkyWayTexture: new T3.Texture(),
  });
  if (field.ready && field.ready.then) await field.ready.catch(() => {});
  const cam = new T3.PerspectiveCamera(45, 1.6, 0.01, 1e7);
  cam.position.set(0, 0, 100); cam.lookAt(0, 0, 0); cam.updateMatrixWorld(); cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
  const g = field.setSun(new T3.Vector3(0, 0, 0), 10, cam);
  field.update(cam);
  let pts = null;
  field.group.traverse((c) => { if (!pts && c.isPoints && c.material.uniforms && c.material.uniforms.uSunGlare) pts = c; });
  const u = pts ? pts.material.uniforms : null;
  check(!!u, 'the star field\'s points carry the glare\'s uniforms');
  if (u) {
    check(Math.abs(u.uSunView.value.z + 1) < 1e-9 && Math.abs(u.uSunView.value.x) < 1e-9, 'the shader is told where the Sun is in the camera\'s own axes (straight ahead is -Z)');
    check(Math.abs(u.uSunGlare.value.x - Math.cos(g.innerRad)) < 1e-12 && u.uSunGlare.value.x > u.uSunGlare.value.y, 'and the two angles as cosines');
    check(/vAlpha \*= 1\.0 - smoothstep\( uSunGlare\.y, uSunGlare\.x, dot\( normalize\( mv\.xyz \), uSunView \) \);/.test(pts.material.vertexShader), 'a star\'s light is multiplied down by its angle from the Sun');
    field.setSun(null);
    check(u.uSunGlare.value.x === 2 && u.uSunView.value.lengthSq() === 0, 'with no Sun given nothing fades');
  }
  const { COPY: C2 } = await import(pathToFileURL(join(ROOT, 'site/js/copy/en.js')).href);
  check(/stars beside it are faded/.test(C2.drawing.worldSun), 'the Sun\'s card says the stars beside it are faded');
}

// THE GRAIN AT TIERS 0 AND 1 (internal #549): it cost 9.5 ms a frame at 1440 x 900 on an Iris Plus 640. Tiers 0 and 1 read the 8
// cells on the point's near side instead of 27; tier 2's source is unchanged. The twin measures what that changes.
{
  const S2 = await import(pathToFileURL(join(ROOT, 'site/js/scene/sun.js')).href);
  check(S2.SUN_FRAG.includes('for ( int z = -1; z <= 1; z++ )') && !S2.SUN_FRAG.includes('step( vec3( 0.5 ), f )'), 'tier 2 keeps the full 27-cell loop');
  check(S2.SUN_FRAG_CHEAP.includes('for ( int z = 0; z <= 1; z++ )') && S2.SUN_FRAG_CHEAP.includes('step( vec3( 0.5 ), f )') && !S2.SUN_FRAG_CHEAP.includes('z = -1'), 'tiers 0 and 1 read 8 cells toward the nearer faces');
  const strip = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/float cells[\s\S]*?\n}\n/, '');
  check(strip(S2.SUN_FRAG) === strip(S2.SUN_FRAG_CHEAP), 'everything but the cell loop is the same source at every tier');
  check(!/\bhalf\b|\binput\b|\boutput\b|\bsample\b|\bfilter\b/.test(S2.SUN_FRAG_CHEAP), 'no reserved GLSL word in the cheap source either');
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  let same = 0, sumAbs = 0, maxLaneDiff = 0, sumFull = 0, sumNear = 0;
  const N = 4000;
  const lane = (c) => { const x = Math.min(1, Math.max(0, c / 0.35)); return x * x * (3 - 2 * x); };
  for (let k = 0; k < N; k++) {
    const p = [rnd() * 80 - 40, rnd() * 80 - 40, rnd() * 80 - 40];
    const t = rnd();
    const a = S2.cellsTwin(p, t, false), b = S2.cellsTwin(p, t, true);
    if (Math.abs(a - b) < 1e-12) same++;
    const dl = Math.abs(lane(a) - lane(b));
    sumAbs += dl; maxLaneDiff = Math.max(maxLaneDiff, dl); sumFull += lane(a); sumNear += lane(b);
  }
  check(same / N > 0.8, `the 8 cells give the very same value at ${(100 * same / N).toFixed(1)} % of points (over 80 % wanted)`);
  check(sumAbs / N < 0.03, `and the lane shade differs by ${(sumAbs / N).toFixed(4)} on average (under 0.03)`);
  check(Math.abs(sumFull - sumNear) / N < 0.02, `the mean lane shade moves by ${(Math.abs(sumFull - sumNear) / N).toFixed(4)} (the picture's overall brightness holds)`);
  console.log(`grain at tiers 0-1: ${(100 * same / N).toFixed(1)} % identical points, mean lane shade difference ${(sumAbs / N).toFixed(4)}, worst ${maxLaneDiff.toFixed(2)}`);
}

if (problems.length) {
  console.error('sun FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`sun ok: limb darkening within 0.05 of the 550 nm measurement, ${R.MAX_SPOTS} groups at most from NOAA's list, the flat disc far away and under the latch, nothing at boot`);
