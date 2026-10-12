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
const A = await import(join(JS, 'data/sunactivity.js'));
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
  const strip = (s) => s.replace(/\/\/[^\n]*/g, '').replace(/vec2 cells[\s\S]*?\n}\n/, '');
  check(strip(S2.SUN_FRAG) === strip(S2.SUN_FRAG_CHEAP) && strip(S2.SUN_FRAG) !== S2.SUN_FRAG.replace(/\/\/[^\n]*/g, ''), 'everything but the cell loop is the same source at every tier');
  check(!/\bhalf\b|\binput\b|\boutput\b|\bsample\b|\bfilter\b/.test(S2.SUN_FRAG_CHEAP), 'no reserved GLSL word in the cheap source either');
  let seed = 12345;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  let same = 0, sumAbs = 0, maxLaneDiff = 0, sumFull = 0, sumNear = 0;
  const N = 4000;
  for (let k = 0; k < N; k++) {
    const p = [rnd() * 80 - 40, rnd() * 80 - 40, rnd() * 80 - 40];
    const t = rnd() * S2.GRAIN_WRAP;
    const flow = [rnd() - 0.5, rnd() - 0.5, rnd() - 0.5].map((v) => v * 2 * S2.GRAIN_DRIFT);
    const a = S2.cellsTwin(p, t, false, flow), b = S2.cellsTwin(p, t, true, flow);
    if (Math.abs(a[0] - b[0]) < 1e-12) same++;
    const la = S2.grainShade(a[0], a[1]), lb = S2.grainShade(b[0], b[1]);
    const dl = Math.abs(la - lb);
    sumAbs += dl; maxLaneDiff = Math.max(maxLaneDiff, dl); sumFull += la; sumNear += lb;
  }
  check(same / N > 0.8, `the 8 cells give the very same value at ${(100 * same / N).toFixed(1)} % of points (over 80 % wanted)`);
  check(sumAbs / N < 0.03, `and the lane shade differs by ${(sumAbs / N).toFixed(4)} on average (under 0.03)`);
  check(Math.abs(sumFull - sumNear) / N < 0.02, `the mean lane shade moves by ${(Math.abs(sumFull - sumNear) / N).toFixed(4)} (the picture's overall brightness holds)`);
  check(Math.abs(sumFull / N - S2.GRAIN_MEAN) < 0.02 && Math.abs(sumNear / N - S2.GRAIN_MEAN) < 0.02, `the shade's mean is the GRAIN_MEAN the shader takes off: ${(sumFull / N).toFixed(3)} and ${(sumNear / N).toFixed(3)} against ${S2.GRAIN_MEAN}`);
  console.log(`grain at tiers 0-1: ${(100 * same / N).toFixed(1)} % identical points, mean lane shade difference ${(sumAbs / N).toFixed(4)}, worst ${maxLaneDiff.toFixed(2)}`);
}

// --- GRANULES THAT LIVE (spec 0073 requirement 2): born, bright, gone, born again elsewhere; nothing jumps; drifting outward ---
{
  // One point of the photosphere over the whole of the shader's clock, in steps of 1/500 of a life (0.09 s at 45 s a life).
  const p = [3.3, 7.1, -2.4];
  let worst = 0, lo = 1, hi = 0, last = S.grainShade(...S.cellsTwin(p, 0, false));
  const dt = 0.002;
  for (let t = dt; t <= S.GRAIN_WRAP + 1e-9; t += dt) {
    const now = S.grainShade(...S.cellsTwin(p, t % S.GRAIN_WRAP, false));
    worst = Math.max(worst, Math.abs(now - last)); lo = Math.min(lo, now); hi = Math.max(hi, now); last = now;
  }
  check(worst < 0.06, `the shade at a point never jumps, across rebirths and across the clock's wrap: worst step ${worst.toFixed(3)} in 1/500 of a life`);
  check(lo < 0.05 && hi > 0.75, `and over ${S.GRAIN_WRAP} lives the point is both a dark lane and a bright granule: ${lo.toFixed(2)} to ${hi.toFixed(2)}`);
  // A granule owns no ground when it is reborn: at weight 0 its point is pushed GRAIN_YIELD away, past any second neighbour.
  let weak = 0, n = 0, seed = 99;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
  for (let k = 0; k < 3000; k++) { const w = S.cellsTwin([rnd() * 60, rnd() * 60, rnd() * 60], rnd() * S.GRAIN_WRAP, false)[1]; n++; if (w < 0.07) weak++; }
  check(weak / n < 0.002, `a granule at the very start or end of its life is the nearest at ${(100 * weak / n).toFixed(2)} % of points (it has shrunk away)`);
  // The drift: zero at a larger cell's middle and on its border, outward between.
  const mid = S.superFlow([0, 0, 0]);
  check(mid.flow.every((v) => Math.abs(v) < 1e-9), 'at a larger cell\'s middle there is no drift');
  const out = S.superFlow([0.1 / S.SUPER_CELLS, 0, 0]);
  check(out.flow[0] > 0.3, `a little way out along x the drift is outward: ${out.flow[0].toFixed(2)}`);
  check(S.SUN_FRAG.includes(`cells( p * ${S.GRAIN_CELLS.toFixed(1)}, uTime, ${S.GRAIN_DRIFT.toFixed(2)} * sin( 6.2831853 * q ) )`) && (S.SUN_FRAG.match(/cells\(/g) || []).length === 2, 'the shader advects ONE octave of cells by that flow (the definition and one call)');
  check(/towardLimb = \( 1\.0 - smoothstep\( 0\.4, 0\.72, mu \) \)/.test(S.SUN_FRAG) && S.SUN_FRAG.includes(`${S.FACULA_GAIN.toFixed(2)} * uGrain * towardLimb`), 'faculae are bright only toward the limb and only where the grain is drawn');
  check(S.GRAIN_LIFE_S >= 20 && S.GRAIN_LIFE_S <= 120 && S.CORONA_BREATH_S >= 30 && S.PROM_SWAY_S >= 10, 'lives, breaths and sways are slow');
}

// --- NO PASS, NO BLOOM: every shader of the Sun is a material of its own ------------------------------------
{
  const all = [S.SUN_VERT, S.SUN_FRAG, S.SUN_FRAG_CHEAP, S.CORONA_FRAG, S.PROM_FRAG, S.CME_FRAG];
  const text = readFileSync(join(JS, 'scene/sun.js'), 'utf8') + readFileSync(join(JS, 'data/sunactivity.js'), 'utf8');
  for (const word of ['EffectComposer', 'RenderPass', 'UnrealBloomPass', 'ShaderPass', 'BloomPass', 'LensflareElement', 'Lensflare', 'WebGLRenderTarget', 'FullScreenQuad', 'OrthographicCamera'])
    check(!text.includes(word) && all.every((g) => !g.includes(word)), `neither module nor any shader names ${word}`);
  check(all.every((g) => !/\b(flat|half|input|output|sample|filter|active|smooth|patch|common|fixed|superp|partition|centroid|noise[1-4])\b/.test(g.replace(/#include <common>/g, '').replace(/\/\/[^\n]*/g, ''))), 'no reserved GLSL word is a name in any of them (comments aside)');
  check([S.PROM_FRAG, S.CME_FRAG].every((g) => g.includes('#include <logdepthbuf_fragment>') && g.includes('#include <colorspace_fragment>')), 'the prominence and the CME write log depth and the output colour space');
  // Every uniform and varying a shader declares it also uses, and braces balance (the least a compiler would say).
  for (const [name, g] of [['SUN_FRAG', S.SUN_FRAG], ['SUN_FRAG_CHEAP', S.SUN_FRAG_CHEAP], ['CORONA_FRAG', S.CORONA_FRAG], ['PROM_FRAG', S.PROM_FRAG], ['CME_FRAG', S.CME_FRAG]]) {
    const code = g.replace(/\/\/[^\n]*/g, '');
    const count = (ch) => code.split(ch).length - 1;
    check(count('{') === count('}') && count('(') === count(')') && count('[') === count(']'), `${name}: braces, brackets and parentheses balance`);
    for (const m of code.matchAll(/^\s*(?:uniform|varying)\s+\w+\s+(\w+)/gm)) check(code.split(new RegExp(`\\b${m[1]}\\b`)).length > 2, `${name} declares ${m[1]} and uses it`);
  }
  const varyings = (g) => [...g.matchAll(/^\s*varying\s+(\w+)\s+(\w+)/gm)].map((m) => `${m[1]} ${m[2]}`).sort().join();
  check(varyings(S.CME_FRAG) === varyings(S.CORONA_FRAG) && varyings(S.CME_FRAG) === 'vec2 vP', 'the CME\'s sheet reads the varying the corona\'s vertex shader writes');
  check(varyings(S.SUN_VERT) === varyings(S.SUN_FRAG) && varyings(S.SUN_FRAG) === varyings(S.SUN_FRAG_CHEAP), 'the photosphere\'s two shaders declare the same varyings');
}

// --- THE LISTS: NOAA's flares and NASA's CMEs, each against what was captured from its publisher ------------
const EVENTS = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/swpc_edited_events.json'), 'utf8'));
const CMES = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/donki_cme_analysis.json'), 'utf8'));
{
  const flares = A.parseFlares(EVENTS);
  const xra = EVENTS.filter((r) => r.type === 'XRA');
  const usable = xra.filter((r) => /^[CMX]/.test(r.particulars1) && r.region);
  check(EVENTS.length === 16 && xra.length < EVENTS.length && usable.length < xra.length, 'the captured list holds flares with and without a region, smaller ones, and other events');
  check(flares.length > 0 && flares.length <= usable.length && flares.every((f) => f.flux >= A.FLARE_MIN_FLUX && Number.isInteger(f.region) && f.beginMs <= f.maxMs && f.halfLifeMs >= A.FLARE_MIN_HALF_LIFE_MS), `only X-ray flares of class C and above with a region are kept: ${flares.length} of ${EVENTS.length} rows`);
  const m64 = flares.filter((f) => f.maxMs === Date.UTC(2026, 9, 10, 15, 10) && f.region === 4549);
  check(m64.length === 1 && m64[0].cls === 'M6.6' && near(m64[0].flux, 6.6e-5, 1e-12) && m64[0].halfLifeMs === 600000, `two satellites' rows for one flare are one flare, the larger reading, halving in the ten minutes NOAA gives from peak to end: ${JSON.stringify(m64)}`);
  check(flares.every((f, i) => i === 0 || f.maxMs >= flares[i - 1].maxMs), 'oldest first');
  check(A.parseFlares('nope').length === 0 && A.parseFlares([{ type: 'XRA', particulars1: 'M1.0', max_datetime: 'soon', region: 1 }, { type: 'XRA', particulars1: 'B9.9', max_datetime: '2026-10-12T02:02:00', region: 1 }, { type: 'RBR', particulars1: 'M1.0', max_datetime: '2026-10-12T02:02:00', region: 1 }, null]).length === 0, 'a feed that is not a list, a bad time, a class B flare and an event that is not an X-ray flare are no flares');
  check(near(A.flareFlux('C1.1'), 1.1e-6, 1e-15) && near(A.flareFlux('X12'), 1.2e-3, 1e-12) && Number.isNaN(A.flareFlux('Q3')) && Number.isNaN(A.flareFlux(null)), 'a class is a decade and a multiplier');
  // The curve.
  const t0 = Date.UTC(2026, 9, 10, 15, 0);
  const mk = (cls) => A.parseFlares([{ type: 'XRA', particulars1: cls, begin_datetime: '2026-10-10T15:00:00', max_datetime: '2026-10-10T15:10:00', end_datetime: '2026-10-10T15:20:00', region: 4549 }])[0];
  const c = mk('C1.0'), m = mk('M1.0'), x = mk('X1.0');
  const peak = t0 + 600000;
  check(A.flareBrightness(m, t0 - 1) === 0 && A.flareBrightness(m, t0) === 0, 'nothing before it begins');
  let top = 0, when = 0;
  for (let t = t0; t <= t0 + 7200000; t += 30000) { const b = A.flareBrightness(m, t); if (b > top) { top = b; when = t; } }
  check(when === peak && near(top, A.flareGain(1e-5)) && near(top, 0.65), `it is brightest at its peak time, at its class's gain: ${top.toFixed(3)}`);
  check(A.flareBrightness(m, t0 + 300000) > 0 && A.flareBrightness(m, t0 + 300000) < top, 'and rising before it');
  check(near(A.flareBrightness(m, peak + 600000), top / 2) && near(A.flareBrightness(m, peak + 1200000), top / 4), 'it halves in the time from peak to NOAA\'s end, and again');
  check(A.flareBrightness(m, peak + A.FLARE_HALF_LIVES * 600000) === 0 && A.flareBrightness(m, peak + 86400000) === 0, `and is gone after ${A.FLARE_HALF_LIVES} half-lives`);
  check(A.flareBrightness(x, peak) > A.flareBrightness(m, peak) && A.flareBrightness(m, peak) > A.flareBrightness(c, peak) && A.flareBrightness(c, peak) > 0, 'class X is brighter than M, M than C');
  check(A.flareGain(1e-2) === A.FLARE_GAIN_MAX && A.flareGain(5e-7) === 0, 'the gain is capped, and nothing under C1 is drawn');
  const showing = A.flaresAt([c, m, x, mk('C2.0'), mk('C3.0'), { ...m, region: 7 }], peak, new Set([4549]));
  check(showing.length === A.MAX_FLARES && showing[0].flare.cls === 'X1.0' && showing.every((f) => f.flare.region === 4549), `at most ${A.MAX_FLARES} at once, the brightest first, only at regions that have a place`);

  const cmes = A.parseCmes(CMES);
  const fast = CMES.filter((r) => r.speed >= A.CME_MIN_SPEED);
  check(CMES.length === 7 && fast.length === 5 && cmes.length === new Set(fast.map((r) => r.associatedCMEID)).size, `of 7 captured analyses the ${fast.length} of ${A.CME_MIN_SPEED} km/s and faster are kept, one per CME: ${cmes.length}`);
  const last = cmes[cmes.length - 1];
  check(last.startMs === Date.UTC(2026, 9, 11, 23, 12) && last.latDeg === -1 && last.eastDeg === 28 && last.halfAngleDeg === 36 && last.speedKmS === 618, `DONKI's longitude -28 (west positive) is 28 degrees EAST here: ${JSON.stringify(last)}`);
  check(A.parseCmes({}).length === 0 && A.parseCmes([{ associatedCMEstartTime: '2026-10-11T23:12Z', latitude: null, longitude: 3, halfAngle: 20, speed: 900 }, { associatedCMEstartTime: 'x', latitude: 1, longitude: 3, halfAngle: 20, speed: 900 }, { associatedCMEstartTime: '2026-10-11T23:12Z', latitude: 1, longitude: 3, halfAngle: 20, speed: 900, isMostAccurate: false }]).length === 0, 'no direction, no start or a superseded analysis: no CME');
  // The flight: the reported speed, held; 695.7 km/s is one radius in a thousand seconds.
  const one = { id: 'x', startMs: t0, latDeg: 0, eastDeg: 90, halfAngleDeg: 30, speedKmS: A.SUN_RADIUS_KM / 1000 };
  check(A.cmeShell(one, t0 - 1) === null && near(A.cmeShell(one, t0).radii, 1) && A.cmeShell(one, t0).opacity === 0, 'before its start there is no front; at its start it is on the surface and not yet lit');
  check(near(A.cmeShell(one, t0 + 1000000).radii, 2) && near(A.cmeShell(one, t0 + 4000000).radii, 5), 'the front moves at the reported speed: one radius a thousand seconds at 695.7 km/s');
  check(A.cmeShell(one, t0 + 1000000).opacity > A.cmeShell(one, t0 + 6000000).opacity && A.cmeShell(one, t0 + 6000000).opacity > 0, 'and thins as it goes');
  check(A.cmeShell(one, t0 + 9000000) === null && near(A.cmeFlightMs(one), 9000000, 1e-6), `it is gone at ${A.CME_REACH_RADII} radii`);
  check(A.cmesAt([one, { ...one, id: 'y', startMs: t0 + 60000 }, { ...one, id: 'z', startMs: t0 + 120000 }], t0 + 1000000).map((x2) => x2.cme.id).join() === 'z,y', `at most ${A.MAX_CMES} at once, the newest`);

  // Registry rows, the page's source entries and the module name the same addresses; NASA is never asked by a browser.
  const SRC = await import(join(JS, 'data/sources.js'));
  const regYaml = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
  for (const [id, url, parser, browser] of [[A.SUN_EVENTS_SOURCE_ID, A.SUN_EVENTS_URL, 'swpc_edited_events', true], [A.CME_SOURCE_ID, A.CME_URL, 'donki_cme_analysis', false]]) {
    const row = regYaml.slice(regYaml.indexOf(`  - id: ${id}\n`)).slice(0, 700);
    check(SRC.SOURCES[id] && SRC.SOURCES[id].url === url && SRC.SOURCES[id].browser === browser && row.includes(`url: ${url}\n`) && row.includes(`parser: ${parser}\n`) && row.includes(`browser: ${browser}\n`) && /licence: "/.test(row) && /terms_recorded: 2026-10-12/.test(row), `${id}: registry row, sources.js entry and the module agree, with a licence line`);
  }
  const asked = [];
  await A.readSunEvents({ load: async (id) => { asked.push(id); return { data: [] }; } });
  await A.readCmes({ load: async (id) => { asked.push(id); return { data: [] }; } });
  check(asked.join() === 'swpc-edited-events,donki-cme-analysis', 'both lists are read through load(), by registry id');
  let why = null;
  try { await A.readCmes({ load: async () => ({ data: null, error: 'could not look' }) }); } catch (e) { why = e.message; }
  check(why === 'could not look', 'with no saved copy the CME list rejects with the reason, and nothing is drawn');
}

// --- PROMINENCES, FLARES AND CME FRONTS IN THE SCENE ---------------------------------------------------------
{
  const deg = Math.PI / 180;
  // The limb the camera sees: from far away ninety degrees from the line to the camera, closer in less.
  check(near(A.limbOffsetDeg([1, 0, 0], [0, 0, 1], 1e9), 0, 1e-6) && near(A.limbOffsetDeg([0, 0, 1], [0, 0, 1], 1e9), 90, 1e-6) && near(A.limbOffsetDeg([0, 0, 1], [0, 0, 1], 2), 60, 1e-9), 'the limb is at acos(1 / distance) from the camera\'s direction');
  check(A.limbOffsetDeg([Math.cos(100 * deg), 0, Math.sin(100 * deg)].reverse(), [0, 0, 1], 1e9) < 0, 'and a place past it is behind');
  check(A.prominenceFade(0) === 1 && A.prominenceFade(A.PROM_FULL_DEG) === 1 && A.prominenceFade(-A.PROM_FULL_DEG) === 1 && A.prominenceFade(A.PROM_LIMB_DEG) === 0 && A.prominenceFade(-16) === 0 && A.prominenceFade(40) === 0 && A.prominenceFade(12.5) > 0 && A.prominenceFade(12.5) < 1, `whole within ${A.PROM_FULL_DEG} degrees of the limb, nothing at ${A.PROM_LIMB_DEG} and beyond, on either side`);
  check(A.PROM_LIMB_DEG === 15 && A.PROM_MIN_RADII === 0.02 && A.PROM_MAX_RADII === 0.15 && A.PROM_ERUPTIVE_RADII === 0.4 && A.PROM_CAP.join() === '2,8,8', 'the stated range and caps');
  let kinds = new Set();
  for (let region = 4000; region < 4300; region++) for (const areaMsh of [0, 10, 120, 600, 3000]) for (const hot of [0, 0.3, 1]) {
    const sh = A.prominenceShape({ region, areaMsh, extentDeg: region % 12 }, hot);
    kinds.add(sh.kind);
    const ok = hot === 0 ? sh.height >= A.PROM_MIN_RADII && sh.height <= A.PROM_MAX_RADII : sh.height >= A.PROM_MIN_RADII && sh.height <= A.PROM_ERUPTIVE_RADII;
    if (!ok || !(sh.width > 0 && sh.width < 0.75) || !(sh.seed >= 0 && sh.seed < 1)) { check(false, `region ${region}, area ${areaMsh}, flare ${hot}: ${JSON.stringify(sh)}`); break; }
  }
  check(kinds.size === 2, 'some regions wear loops and some a hedgerow');
  check(near(A.prominenceShape({ region: 4549, areaMsh: 300 }, 1).height, A.PROM_ERUPTIVE_RADII) && A.prominenceShape({ region: 4549, areaMsh: 300 }, 0).height <= A.PROM_MAX_RADII, 'only a region flaring at M or X stands past 0.15 radii, to 0.4');

  const scene = (tier) => {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 8, 6), new THREE.MeshBasicMaterial({ color: 0xf18833 }));
    const camera = new THREE.PerspectiveCamera(45, 1.6, 0.01, 1e6);
    camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    return { mesh, camera, sun: S.createSunDetail({ mesh, camera, tier }) };
  };
  const earth = new THREE.Vector3(0, 0, 150);
  const day = Date.UTC(2026, 9, 6);
  const row = (region, longitude, latitude = 5, area = 200) => ({ observed_date: '2026-10-06', region, latitude, longitude, area, number_spots: 4, extent: 6 });
  // The camera is on the Earth's side, far off: the limb is 89.4 degrees from the central meridian.
  const { mesh, camera, sun } = scene(1);
  sun.setRegions(R.parseSunRegions([row(1, 0), row(2, 60), row(3, 85, 0, 400), row(4, -80, -10, 300), row(5, 77), row(6, -110)]));
  sun.update(day, 1.2, earth);
  let st = sun.state();
  check(st.prominences.map((p) => p.region).join() === '3,4,5', `only the groups within ${A.PROM_LIMB_DEG} degrees of the limb stand a prominence: ${st.prominences.map((p) => p.region)} of 6 groups`);
  check(st.prominences.every((p) => Math.abs(p.offsetDeg) < A.PROM_LIMB_DEG && p.height >= A.PROM_MIN_RADII && p.height <= A.PROM_MAX_RADII && p.fade > 0 && p.fade <= 1), `each inside the stated range of heights: ${st.prominences.map((p) => p.height.toFixed(3))}`);
  check(st.prominences[0].fade === 1 && st.prominences[2].fade < 1, 'whole near the limb, fading toward fifteen degrees');
  const sheets = mesh.children.filter((c) => c.name === 'sun-prominence');
  check(sheets.length === 8 && sheets.filter((c) => c.visible).length === 3, 'three of the eight sheets are shown');
  check(sheets.every((c) => c.material.blending === THREE.AdditiveBlending && c.material.depthWrite === false && c.material.transparent && c.material.toneMapped === false && c.material.depthTest === true), 'each an additive sheet that writes no depth and is hidden by the Sun\'s own sphere where it is behind the limb');
  {
    // Region 3: on the equator, 85 degrees east; with the Earth along +Z, east is -X.
    const m4 = sheets[0].matrix.elements;
    const up = new THREE.Vector3(m4[4], m4[5], m4[6]), across = new THREE.Vector3(m4[0], m4[1], m4[2]), at = new THREE.Vector3(m4[12], m4[13], m4[14]);
    const want = new THREE.Vector3(-Math.sin(85 * deg), 0, Math.cos(85 * deg));
    check(up.clone().normalize().distanceTo(want) < 1e-6 && Math.abs(across.dot(up)) < 1e-9, `the sheet stands along the radius at its region: ${up.clone().normalize().toArray().map((v) => v.toFixed(3))}`);
    check(near(at.length() - up.length() / 2, 0.985, 1e-9) && near(up.length(), st.prominences[0].height / 0.9 + 0.015, 1e-9) && near(across.length(), st.prominences[0].width, 1e-9), 'its foot is just under the surface, its height and width the shape\'s');
    const toCam = camera.position.clone().sub(at).normalize();
    const face = new THREE.Vector3(m4[8], m4[9], m4[10]).normalize();
    check(Math.abs(face.dot(toCam)) > 0.99, `and it faces the camera about that radius: ${Math.abs(face.dot(toCam)).toFixed(4)}`);
  }
  // Far away they are not drawn; from the side another set of regions is on the limb.
  sun.update(day, 0.07, earth);
  check(sun.state().on && sun.state().prominences.length === 0 && sheets.every((c) => !c.visible), 'with the Sun small on screen no prominence is drawn');
  camera.position.set(-100, 0, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  sun.update(day, 1.2, earth);
  check(sun.state().prominences.map((p) => p.region).join() === '1', `seen from over the east limb it is the group on the central meridian that stands on the edge: ${sun.state().prominences.map((p) => p.region)}`);
  camera.position.set(0, 0, 100); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
  // The caps.
  const crowd = R.parseSunRegions(Array.from({ length: 12 }, (_, k) => row(100 + k, k % 2 ? 84 : -84, -33 + 6 * k, 500 - 10 * k)));
  sun.setRegions(crowd);
  sun.update(day, 1.2, earth);
  check(sun.state().prominences.length === 8 && sheets.filter((c) => c.visible).length === 8, `twelve groups on the limb: ${sun.state().prominences.length} prominences, the cap`);
  const phone = scene(0);
  phone.sun.setRegions(crowd);
  phone.sun.update(day, 1.2, earth);
  check(phone.sun.state().prominences.length === 2 && phone.mesh.children.filter((c) => c.name === 'sun-prominence').length === 2 && phone.mesh.children.filter((c) => c.name === 'sun-cme-front').length === 1, 'at tier 0 two prominences and one CME front at most');
  check(phone.sun.state().prominences[0].region === 100, 'the biggest groups first');
  sun.update(day + 20 * 86400000, 1.2, earth);
  check(sun.state().prominences.length === 0, 'three weeks from the list\'s day no prominence is drawn either');

  // Flares at the regions.
  const flares = A.parseFlares([
    { type: 'XRA', particulars1: 'M5.0', begin_datetime: '2026-10-06T10:00:00', max_datetime: '2026-10-06T10:10:00', end_datetime: '2026-10-06T10:20:00', region: 3 },
    { type: 'XRA', particulars1: 'C2.0', begin_datetime: '2026-10-06T10:05:00', max_datetime: '2026-10-06T10:10:00', end_datetime: '2026-10-06T10:15:00', region: 1 },
    { type: 'XRA', particulars1: 'X9.0', begin_datetime: '2026-10-06T10:05:00', max_datetime: '2026-10-06T10:10:00', end_datetime: '2026-10-06T10:15:00', region: 999 },
  ]);
  sun.setRegions(R.parseSunRegions([row(1, 0), row(2, 60), row(3, 85, 0, 400), row(4, -80, -10, 300)]));
  const peak = Date.UTC(2026, 9, 6, 10, 10);
  sun.update(peak, 1.2, earth);
  const u = mesh.material.uniforms;
  check(u.uFlareCount.value === 0 && sun.state().flares.length === 0, 'with no list no flare is drawn');
  sun.setFlares(flares);
  sun.update(peak, 1.2, earth);
  st = sun.state();
  check(u.uFlareCount.value === 2 && st.flares.map((f) => f.region).join() === '3,1', `at their peak two flares show, the M before the C; the X at a region with no place today does not: ${JSON.stringify(st.flares.map((f) => [f.region, f.cls]))}`);
  check(near(u.uFlares.value[0].w, A.flareGain(5e-5)) && near(u.uFlares.value[1].w, A.flareGain(2e-6)) && u.uFlares.value[0].w > u.uFlares.value[1].w, 'each as bright as its class');
  {
    const carried = R.spotDirection({ latDeg: 0, eastDeg: 85, observedMs: day }, [0, 0, 1], peak);
    check(near(u.uFlares.value[0].x, carried[0], 1e-9) && near(u.uFlares.value[0].z, carried[2], 1e-9), 'at its region\'s place, carried by the turning since the list\'s day');
  }
  const tallNow = st.prominences.find((p) => p.region === 3);
  check(tallNow && tallNow.hot > 0 && tallNow.height > A.PROM_MAX_RADII && tallNow.height <= A.PROM_ERUPTIVE_RADII, `the region flaring at class M stands a taller prominence: ${tallNow && tallNow.height.toFixed(3)} radii`);
  sun.update(peak - 3600000, 1.2, earth);
  check(u.uFlareCount.value === 0, 'an hour before, nothing');
  sun.update(peak + 6 * 600000, 1.2, earth);
  check(u.uFlareCount.value === 0 && sun.state().prominences.find((p) => p.region === 3).height <= A.PROM_MAX_RADII, 'and after six half-lives the flare is gone and the prominence is its ordinary height');
  check(sun.activity() !== '' && typeof sun.activity() === 'string', 'activity() names what is drawn');

  // A CME front.
  const cme = { id: 'c1', startMs: peak, latDeg: 0, eastDeg: 90, halfAngleDeg: 30, speedKmS: A.SUN_RADIUS_KM / 1000 };
  sun.setCmes([cme, { ...cme, id: 'c0', startMs: peak - 86400000 }]);
  sun.update(peak + 2000000, 1.2, earth);
  const fronts = mesh.children.filter((c) => c.name === 'sun-cme-front');
  st = sun.state();
  check(fronts.length === 2 && fronts[0].visible && !fronts[1].visible && st.cmes.length === 1 && st.cmes[0].id === 'c1', 'two thousand seconds after its start one front is in flight; yesterday\'s is long gone');
  check(near(fronts[0].material.uniforms.uR.value, 3) && near(st.cmes[0].radii, 3) && near(fronts[0].material.uniforms.uCosHalf.value, Math.cos(30 * deg)), 'three radii out at one radius a thousand seconds, as wide as reported');
  const heading = fronts[0].material.uniforms.uDir.value;
  check(heading.distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-6, `heading ninety degrees east of the Sun-Earth line, which from the Earth's side is to the left in the plane of the sky: ${heading.toArray().map((v) => v.toFixed(3))}`);
  const faces = new THREE.Vector3(0, 0, 1).applyQuaternion(fronts[0].getWorldQuaternion(new THREE.Quaternion()));
  check(near(faces.z, 1, 1e-6), 'its sheet faces the camera, as the corona\'s does');
  {
    // The same CME seen from over the Sun's north pole is still heading the same way in space.
    camera.position.set(0, 100, 0); camera.up.set(0, 0, -1); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    sun.update(peak + 2000000, 1.2, earth);
    const inSpace = fronts[0].material.uniforms.uDir.value.clone().applyQuaternion(fronts[0].quaternion);
    check(inSpace.distanceTo(new THREE.Vector3(-1, 0, 0)) < 1e-6 && Math.abs(fronts[0].material.uniforms.uDir.value.z) < 1e-6, `from another side its direction in space is the same: ${inSpace.toArray().map((v) => v.toFixed(3))}`);
    camera.position.set(0, 0, 100); camera.up.set(0, 1, 0); camera.lookAt(0, 0, 0); camera.updateMatrixWorld(true);
    sun.update(peak + 2000000, 1.2, earth);
  }
  check(fronts[0].material.blending === THREE.AdditiveBlending && fronts[0].material.depthWrite === false && fronts[0].material.uniforms.uOpacity.value > 0 && fronts[0].material.uniforms.uOpacity.value < 1, 'an additive shell that writes no depth');
  sun.update(peak + 9500000, 1.2, earth);
  check(!fronts[0].visible && sun.state().cmes.length === 0, 'past ten radii it is gone');

  // Reduced motion: a still picture of the same Sun.
  const corona = mesh.children.find((c) => c.name === 'sun-corona-plane');
  sun.setRegions(R.parseSunRegions([row(3, 85, 0, 400)]));
  const read = () => [u.uTime.value, corona.material.uniforms.uTime.value, sheets[0].material.uniforms.uTime.value];
  sun.update(day + 1000, 1.2, earth); const a1 = read();
  sun.update(day + 8000, 1.2, earth); const a2 = read();
  check(a1.every((v, i) => v !== a2[i]) && a1[1] >= 0 && a1[1] < 1 && a2[0] >= 0 && a2[0] < S.GRAIN_WRAP, 'the grain, the corona and a prominence move with the clock');
  sun.update(day + 1000, 1.2, earth, { still: true }); const b1 = read();
  sun.update(day + 8000, 1.2, earth, { still: true }); const b2 = read();
  check(b1.join() === b2.join() && b1.join() === [S.STILL.grain * S.GRAIN_WRAP, S.STILL.breath, S.STILL.sway].join() && sheets[0].visible, 'under reduced motion none of them moves, and the same things are drawn');
  // The latch takes all of it off.
  sun.setCmes([{ ...cme, startMs: day }]);
  sun.setFlares(A.parseFlares([{ type: 'XRA', particulars1: 'M5.0', begin_datetime: '2026-10-06T00:00:00', max_datetime: '2026-10-06T00:10:00', end_datetime: '2026-10-06T00:40:00', region: 3 }]));
  sun.update(day + 900000, 1.2, earth);
  check(sun.state().cmes.length === 1 && sun.state().flares.length === 1 && sun.state().prominences.length === 1, 'a prominence, a flare and a CME at once');
  sun.latch();
  sun.update(day + 900000, 1.2, earth);
  st = sun.state();
  check(sheets.every((c) => !c.visible) && fronts.every((c) => !c.visible) && st.prominences.length === 0 && st.flares.length === 0 && st.cmes.length === 0 && sun.activity() === '', 'under the latch no prominence, flare or front is drawn');
  sun.dispose();
  check(!mesh.children.some((c) => /^sun-/.test(c.name)), 'dispose() takes every mesh off the Sun');

  // Off the first visit, fetched after the spots' list, said on the card.
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(/import\('\.\/data\/sunactivity\.js'\)/.test(main) && !/^\s*import[^;]*from\s*'[^']*sunactivity\.js'/m.test(main) && !html.includes('sunactivity.js'), 'main.js imports data/sunactivity.js dynamically and nothing preloads it');
  check(main.indexOf("import('./data/sunactivity.js')") > main.indexOf('if (tilesSaveData || tiers.latched) return;\n      import(\'./data/sunregions.js\')'), 'and never on a connection that asked to save data, or under the latch');
  check(/still: !!\(reducedMotionQuery && reducedMotionQuery\.matches\)/.test(main), 'main.js tells the Sun when the visitor asked for reduced motion');
  await import(join(JS, 'copy/en.later.js'));
  const W = COPY.sunAlive;
  check(W && /\{n\}/.test(W.prominences) && /illustrative/.test(W.prominences) && /illustrative/.test(W.prominencesOne) && /NOAA/.test(W.prominences), 'the card says the prominences\' places are NOAA\'s and their shapes illustrative');
  check(/\{cls\}/.test(W.flare) && /\{region\}/.test(W.flare) && /\{time\}/.test(W.flare) && /NOAA/.test(W.flare) && /illustrative/.test(W.flare), 'a flare\'s line gives its class, region and time, and says its brightness is illustrative');
  check(/\{speed\}/.test(W.cme) && /\{time\}/.test(W.cme) && /DONKI/.test(W.cme) && /illustrative/.test(W.cme), 'a CME\'s line gives its start and speed, and whose catalogue it is');
  check(/prominences|loops/.test(COPY.drawing.worldSun) && /born/.test(COPY.drawing.worldSun), 'the Sun\'s drawing line says the granules live and the loops are illustrative');
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(credits.includes(COPY.sun.flaresCredit) && credits.includes(COPY.sun.cmeCredit) && credits.includes('edited_events.json') && credits.includes('DONKI-API/get/CMEAnalysis'), 'CREDITS.md carries both lists\' credit lines and addresses');
}

if (problems.length) {
  console.error('sun FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log(`sun ok: limb darkening within 0.05 of the 550 nm measurement, ${R.MAX_SPOTS} groups at most from NOAA's list, granules that live, prominences only near the limb (${A.PROM_CAP.join('/')} by tier), flares and CMEs from their lists, the flat disc far away and under the latch, nothing at boot`);
