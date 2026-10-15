// tests/test_sunimage.mjs -- the Sun's face of the day (internal spec 0076 W1-d, #916): SDO's picture laid
// on the half of the Sun that faced the Earth, dated on the card; under Measured only the observed
// picture there; loops over today's NOAA regions under Film only; offline, the modelled disc as before.
//   node tests/test_sunimage.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, readdirSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const S = await import(join(JS, 'scene/sun.js'));
const I = await import(join(JS, 'scene/sunimage.js'));
const R = await import(join(JS, 'data/sunregions.js'));
const A = await import(join(JS, 'data/sunactivity.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
await import(join(JS, 'copy/en.later.js'));
const { sunImageLine, sunLine } = await import(join(JS, 'ui/cards.js'));
const { SOURCES } = await import(join(JS, 'data/sources.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps = 1e-6) => Math.abs(a - b) <= eps;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const DAY = 86400000;
const FIX = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/sdo_aia.json'), 'utf8'));
const OBS = Date.parse('2026-10-15T16:56:58Z');

// --- 1. the saved copy: its date read, its picture checked ---------------------------------------------
{
  const pic = A.parseSunImage(FIX);
  check(pic && pic.observedMs === OBS && pic.wavelengthA === 171 && pic.instrument === 'SDO/AIA' && pic.sizePx === 1024, 'the saved picture\'s moment, wavelength and instrument are read from it');
  check(A.parseSunImage({ ...FIX, observed: 'yesterday' }) === null && A.parseSunImage({ ...FIX, base64: 'PGh0bWw+' }) === null && A.parseSunImage(null) === null, 'a picture with no moment, or not a JPEG, is no picture');
  const got = await A.readSunImage({ load: async (id) => ({ data: id === A.SUN_IMAGE_SOURCE_ID ? FIX : null }) });
  check(got === FIX, 'readSunImage reads the saved copy sdo-aia-171');
  let refused = false;
  try { await A.readSunImage({ load: async () => ({ data: null, error: 'could not look' }) }); } catch { refused = true; }
  check(refused, 'no saved copy: the read is refused, and the caller draws the modelled disc');
  // The picture's scale: the Sun's radius that day over AIA's plate scale.
  const au = A.earthSunAu(OBS);
  check(au > 0.9955 && au < 0.9985, `the Earth is ${au.toFixed(4)} au from the Sun on 2026-10-15 (0.997 by the Almanac)`);
  const r = A.imageRadiusPx(OBS, 1024);
  check(r > 398 && r < 404, `the Sun's radius in the 1 024-pixel picture is ${r.toFixed(1)} px (measured: the limb's ring at 402 to 405 px from the middle)`);
  check(A.imageFade(OBS, OBS) === 1 && A.imageFade(OBS, OBS + 2 * DAY) === 1 && A.imageFade(OBS, OBS - 3 * DAY) === 0 && A.imageFade(OBS, OBS + 2.5 * DAY) > 0 && A.imageFade(OBS, OBS + 2.5 * DAY) < 1,
    'drawn fully within two days of its moment, fading to nothing at three, either way of the clock');
}

// --- 2. where a place on the sphere is in the picture -----------------------------------------------------
{
  const earth = [0, 0, 1];
  const f = I.imageFrame(OBS, earth, OBS);
  check(f && near(f.c[2], 1) && near(f.n[1], 1) && near(f.w[0], 1), 'at its moment, from the Earth on +Z: the middle is the sub-Earth point, north up, west to the right');
  const uv = I.imageUv(f.c, f, 0.48);
  check(near(uv[0], 0.5) && near(uv[1], 0.5), 'the sub-Earth point is the picture\'s middle');
  const east = R.spotDirection({ observedMs: OBS, latDeg: 0, eastDeg: 30 }, earth, OBS);
  const north = R.spotDirection({ observedMs: OBS, latDeg: 50, eastDeg: 0 }, earth, OBS);
  check(I.imageUv(east, f, 0.48)[0] < 0.5 && I.imageUv(north, f, 0.48)[1] < 0.5, 'a region east of the meridian is left of the middle and a northern one above it (the top row is v 0), as SDO shows them');
  const limbW = R.spotDirection({ observedMs: OBS, latDeg: 0, eastDeg: -90 }, earth, OBS);
  check(near(I.imageUv(limbW, f, 0.48)[0], 0.98), 'the west limb is the Sun\'s radius right of the middle');
  // A day on, the picture has turned with the Sun: what was its middle is where NOAA's turning carries a place.
  const later = OBS + DAY;
  const f1 = I.imageFrame(OBS, earth, later);
  const carried = R.spotDirection({ observedMs: OBS, latDeg: 0, eastDeg: 0 }, earth, later);
  check(f1 && near(f1.c[0], carried[0]) && near(f1.c[2], carried[2]) && Math.acos(f1.c[2]) * 180 / Math.PI > 13 && Math.acos(f1.c[2]) * 180 / Math.PI < 13.4,
    'a day later the picture has turned 13.2 degrees west with the Sun, as the spots do');
  // The Earth seven degrees north of the Sun's equator (September): the middle is under it.
  const tilted = [0, Math.sin(7 * Math.PI / 180), Math.cos(7 * Math.PI / 180)];
  const ft = I.imageFrame(OBS, tilted, OBS);
  check(near(ft.c[1], tilted[1], 1e-9) && near(ft.c[2], tilted[2], 1e-9) && near(ft.n[0] * ft.c[0] + ft.n[1] * ft.c[1] + ft.n[2] * ft.c[2], 0, 1e-9), 'the picture\'s middle has the Earth\'s latitude on the Sun, and its up is square to its middle');
  check(near(I.imageWeight(f.c, f), 1) && I.imageWeight(limbW, f) === 0 && I.imageWeight([0, 0, -1], f) === 0, 'the picture covers its middle, fades over its own limb and never reaches the far side');
  check(S.SUN_FRAG.includes('0.5 + uImageR * dot( p, uImageW ), 0.5 - uImageR * dot( p, uImageN )') && S.SUN_FRAG.includes('float sdo = dot( p, uImageC );') && S.SUN_FRAG.includes('smoothstep( uImageEdge.x, uImageEdge.y, sdo ) * smoothstep( ' + S.IMAGE_STRETCH[0].toFixed(2) + ', ' + S.IMAGE_STRETCH[1].toFixed(2) + ', sdo / max( mu, 0.02 ) )') && S.SUN_FRAG_CHEAP.includes('uImageOn'),
    'the shader at every tier reads the picture where imageUv and imageWeight say');
}

// --- 3. the texture: cropped to the disc, within the GPU budget ---------------------------------------------
{
  const crop = I.cropOf(1024, 401, 1);
  check(crop.side === 830 && crop.sx === 97 && crop.out === 830, `cropped to the disc and its margin: ${JSON.stringify(crop)}`);
  check(I.cropOf(1024, 401, 0).out === I.IMAGE_PHONE_PX, 'tier 0 draws it 512 square');
  check(I.textureBytes(830) <= 4 * 1024 * 1024 && I.textureBytes(512) < 1.5 * 1024 * 1024, `GPU memory ${(I.textureBytes(830) / 1048576).toFixed(2)} MiB at tiers 1 and 2, ${(I.textureBytes(512) / 1048576).toFixed(2)} at tier 0: within design section 4's +4 MB for a hero`);
  const decoded = [];
  const decode = async (bytes, type, c) => { decoded.push({ n: bytes.length, type, c }); return { width: c.out, height: c.out, close() { this.closed = true; } }; };
  const load = async () => ({ data: FIX });
  const img = await I.loadSunImage({ tier: 1, load, decode, saveData: false });
  check(img && img.observedMs === OBS && img.texture.flipY === false && img.texture.colorSpace === THREE.SRGBColorSpace && near(img.radiusUv, A.imageRadiusPx(OBS, 1024) / 830, 1e-9),
    'the saved copy becomes a texture in sRGB, its top row at v 0, with the Sun\'s radius as a share of its side');
  check(decoded.length === 1 && decoded[0].n === FIX.bytes && decoded[0].type === 'image/jpeg' && decoded[0].c.side === 830, 'the picture\'s own bytes are decoded, cropped once');
  check(await I.loadSunImage({ tier: 1, load, decode, saveData: true }) === null, 'a connection that saves data reads no picture');
  check(await I.loadSunImage({ tier: 1, load: async () => ({ data: null }), decode, saveData: false }) === null, 'offline, or no saved copy: no picture, no error');
  check(await I.loadSunImage({ tier: 1, load, decode: async () => null, saveData: false }) === null, 'a browser that cannot decode it: no picture');
  check(await I.loadSunImage({ tier: 1, load: async () => ({ data: { ...FIX, base64: 'PGh0bWw+' } }), decode, saveData: false }) === null, 'an error page where the picture should be: no picture');
  img.dispose();
}

// --- 4. on the Sun: Measured shows only the observed picture; loops under Film; offline as before ------------
function fakeImage(observedMs = OBS) {
  const texture = new THREE.Texture();
  let gone = false;
  return { texture, observedMs, wavelengthA: 171, instrument: 'SDO/AIA', file: FIX.file, radiusUv: 0.483, side: 830, bytes: FIX.bytes, gpuBytes: I.textureBytes(830), dispose() { gone = true; }, get gone() { return gone; } };
}
function makeSun(img, tier = 1) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), new THREE.MeshBasicMaterial({ color: 0xf18833 }));
  const camera = new THREE.PerspectiveCamera(45, 1.6, 0.01, 1e6);
  camera.position.set(0, 0, 3.2);
  camera.lookAt(0, 0, 0);
  camera.updateMatrixWorld();
  const sun = S.createSunDetail({ mesh, camera, tier, imageLoader: async () => ({ mod: I, img }) });
  return { mesh, camera, sun };
}
const earth = new THREE.Vector3(0, 0, 150);
const day = '2026-10-15';
const regionsRaw = [
  { observed_date: day, region: 4250, latitude: 10, longitude: 5, area: 400, number_spots: 12 },
  { observed_date: day, region: 4251, latitude: -18, longitude: -30, area: 120, number_spots: 4 },
  { observed_date: day, region: 4252, latitude: 22, longitude: 60, area: 30, number_spots: 1 },
];
const regions = R.parseSunRegions(regionsRaw);
const T = OBS + 3600e3;
const flares = A.parseFlares([{ type: 'XRA', particulars1: 'M2.0', region: 4250, begin_datetime: '2026-10-15T17:40', max_datetime: '2026-10-15T17:50', end_datetime: '2026-10-15T18:20' }]);
{
  const img = fakeImage();
  const { mesh, sun } = makeSun(img);
  sun.setRegions(regions);
  sun.setFlares(flares);
  sun.update(T, 1, earth, { look: 'film' });
  await sleep(0);
  await sleep(S.IMAGE_ARRIVE_MS + 100); // the picture fades in over a second of the wall clock
  sun.update(T, 1, earth, { look: 'film' });
  const u = mesh.material.uniforms;
  let st = sun.state();
  const loops = mesh.children.filter((c) => c.name === 'sun-loops');
  check(st.image && st.image.observedMs === OBS && st.image.shown > 0.99 && u.uImageOn.value > 0.99 && u.uImage.value === img.texture, `Film: the picture is drawn on the face toward the Earth (${JSON.stringify(st.image)})`);
  check(u.uImageC.value.z > 0.99 && near(u.uImageGain.value, I.IMAGE_GAIN), 'its middle is toward the Earth, an hour after its moment');
  check(loops.length === 1 && loops[0].visible && st.loops === 3, `Film: loops over each of today's three regions, in one mesh (${st.loops})`);
  const axis = loops[0].material.uniforms.uLoopAxis.value;
  check(axis.slice(0, 3).every((a) => a.w > 0) && axis.slice(3).every((a) => a.w === 0), 'three slots lit, the rest draw nothing');
  check(st.flares.length === 1 && u.uFlareCount.value === 1, 'Film: the M2.0 flare\'s kernel is drawn at its region');
  check(!/uTime/.test(S.LOOP_VERT(8)) && !/uTime/.test(S.LOOP_FRAG), 'the loops do not move: nothing for reduced motion or Measured to hold still');
  const ctx = { sunDetail: sun };
  const line = sunImageLine(ctx);
  check(line && line.includes('16:56 UTC on 2026-10-15') && line.includes('171 ångström') && /false colour/.test(line) && line.includes('Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams') && /far side[^.]*drawn/.test(line),
    `the card dates the picture, says it is ultraviolet false colour, that the far side is drawn, and whose it is: ${line}`);
  check(/illustrative/.test(line) && /NOAA/.test(line) && line.includes('3 of today'), 'and that the loops over three regions are illustrative at NOAA\'s places');
  check(sunLine(ctx).includes(line), 'the line is part of the Sun\'s note on its card');

  // MEASURED: only the observed picture on the face it covers.
  sun.update(T, 1, earth, { look: 'measured' });
  st = sun.state();
  check(u.uImageOn.value > 0.99 && st.image.shown > 0.99, 'Measured: the picture is drawn');
  check(st.loops === 0 && !loops[0].visible, 'Measured: no loops');
  check(u.uGrain.value === 0, 'Measured: no grain (and so no faculae)');
  check(st.flares.length === 0 && u.uFlareCount.value === 0, 'Measured: no flare kernel of ours on the face the picture covers, and the card claims none');
  const mline = sunImageLine(ctx);
  check(mline && mline.includes('2026-10-15') && !/active regions are illustrative|illustrative/.test(mline), 'Measured: the card dates the picture and says nothing of loops');
  // The shader mixes the picture over everything drawn before it, and the flare kernels come after.
  const f = S.SUN_FRAG;
  check(f.indexOf('colour = mix( colour, texture2D( uImage, iuv ).rgb * uImageGain, seen );') > f.indexOf('float plage') && f.indexOf('texture2D( uImage') < f.indexOf('// Flares: a white kernel'), 'in the shader the picture replaces the spots, grain and limb darkening on its face, before the flares');

  // The clock three days on: no picture, the modelled disc.
  sun.update(OBS + 3.2 * DAY, 1, earth, { look: 'film' });
  check(mesh.material.uniforms.uImageOn.value === 0, 'three days from its moment the picture is not drawn');
  // The tool switch (the probe's before), and nothing else.
  sun.debug({ image: false, loops: false });
  sun.update(T, 1, earth, { look: 'film' });
  check(mesh.material.uniforms.uImageOn.value === 0 && sun.state().loops === 0, 'debug({ image: false, loops: false }) is main\'s Sun, for the before');
  sun.debug({ image: true, loops: true });
  // Far away: the flat disc, no loops.
  sun.update(T, 0.01, earth, { look: 'film' });
  check(mesh.material.type === 'MeshBasicMaterial' && !loops[0].visible, 'far away: the flat disc, no loops');
  sun.update(T, 1, earth, { look: 'film' });
  sun.latch();
  check(mesh.material.type === 'MeshBasicMaterial' && !loops[0].visible, 'under the latch: the flat disc, no loops');
  sun.dispose();
  check(img.gone && !mesh.children.some((c) => c.name === 'sun-loops'), 'disposed: the picture\'s texture is given back and the loops are gone');
}
{
  // OFFLINE: no saved copy. The disc is what it was; the card says no picture could be read.
  const { mesh, sun } = makeSun(null);
  sun.setRegions(regions);
  sun.update(T, 1, earth, { look: 'measured' });
  await sleep(10);
  sun.update(T, 1, earth, { look: 'measured' });
  const st = sun.state();
  check(st.image && st.image.failed && mesh.material.uniforms.uImageOn.value === 0, 'offline: no picture is drawn, and the detail knows it');
  check(st.spots === 3 && mesh.material.uniforms.uSpotCount.value > 0, 'offline: the modelled disc with today\'s spots, as before');
  check(sunImageLine({ sunDetail: sun }) === COPY.r12Sun.none, 'and the card says the whole disc is drawn');
  sun.dispose();
}
{
  // Tier 0: half the slots and loops, still one mesh.
  const { mesh, sun } = makeSun(fakeImage(), 0);
  const loops = mesh.children.filter((c) => c.name === 'sun-loops');
  check(loops.length === 1 && loops[0].material.uniforms.uLoopAt.value.length === S.LOOP_SLOTS[0], 'tier 0: one mesh of fewer loops');
  sun.dispose();
}

// --- 5. the loops' shape -------------------------------------------------------------------------------------
{
  const north = R.spotDirection({ observedMs: OBS, latDeg: 20, eastDeg: 0 }, [0, 0, 1], OBS);
  const fr = S.loopFrame(north, 20, 400);
  const dot = fr.axis[0] * north[0] + fr.axis[1] * north[1] + fr.axis[2] * north[2];
  check(near(dot, 0, 1e-9) && near(Math.hypot(...fr.axis), 1, 1e-9), 'a group\'s axis lies along the surface');
  check(fr.axis[0] > 0.9 && fr.axis[1] < 0, 'in the north its leading (west) end leans toward the equator, by Joy\'s law');
  const south = R.spotDirection({ observedMs: OBS, latDeg: -20, eastDeg: 0 }, [0, 0, 1], OBS);
  check(S.loopFrame(south, -20, 400).axis[1] > 0, 'and in the south too');
  check(S.loopFrame(north, 20, 1).span === S.LOOP_SPAN_MIN && S.loopFrame(north, 20, 1e6).span === S.LOOP_SPAN_MAX && near(fr.span, S.LOOP_SPAN_K * R.spotRadiusRad(400)), 'a loop spans a few times its group\'s drawn radius, within bounds');
  const shape = S.loopShape(0, 0);
  const a = S.loopPoint(shape, 0), b = S.loopPoint(shape, 1), top = S.loopPoint(shape, 0.5);
  check(near(a.at[2], 0) && near(b.at[2], 0, 1e-9) && top.at[2] > 0.3 && near(b.at[0] - a.at[0], 1), 'a loop stands on two feet one span apart and rises between them');
  const g = S.loopGeometry(2);
  check(g.geometry.getAttribute('aSlot').count === S.LOOP_SLOTS[2] * S.LOOPS_PER[2] * (S.LOOP_STEPS + 1) * 2 && g.geometry.boundingSphere.radius > 1.1, 'the geometry holds every slot\'s ribbons, with a sphere round them all');
}

// --- 6. truth, credits, the source row, budgets, boot ---------------------------------------------------------
{
  const credit = 'Courtesy of NASA/SDO and the AIA, EVE, and HMI science teams';
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  const section = credits.slice(credits.indexOf('### SDO image of the day (0076 W1-d)'));
  check(section.includes(credit) && section.includes('sdo.gsfc.nasa.gov/data/rules.php') && /not copyrighted unless/.test(section), 'CREDITS.md quotes SDO\'s terms and its credit line');
  check(COPY.r12Sun.image.includes(credit), 'the card gives SDO\'s credit line word for word');
  const reg = readFileSync(join(ROOT, 'registry/sources.yaml'), 'utf8');
  const row = reg.slice(reg.indexOf('- id: sdo-aia-171'));
  check(/browser: false/.test(row.slice(0, 400)) && /parser: sdo_aia/.test(row.slice(0, 400)), 'the source row: the harvester only (no CORS header)');
  const s = SOURCES['sdo-aia-171'];
  const att = /attribution: "([^"]+)"/.exec(row);
  check(s && s.browser === false && s.registryId === 'sdo-aia-171' && att && s.attribution === att[1], 'data/sources.js carries it as browser: false, with the registry\'s credit line');
  const budgets = readFileSync(join(ROOT, 'registry/budgets.yaml'), 'utf8');
  check(/\{id: sun_image_bytes, value: 400000,/.test(budgets) && FIX.bytes <= 400000, 'registry/budgets.yaml sun_image_bytes: at most 400 kB');
  const calls = /\{id: sun_loops_draw_calls, value: (\d+),/.exec(budgets);
  check(calls && Number(calls[1]) === 1, 'registry/budgets.yaml sun_loops_draw_calls: the loops are one draw call');
  // Nothing at boot: nobody imports scene/sunimage.js statically; scene/sun.js asks for it with import().
  const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.js') ? [p] : []; });
  const statics = walk(JS).filter((p) => /^\s*import\s[^(]*['"][./]*(scene\/)?sunimage\.js['"]/m.test(readFileSync(p, 'utf8')));
  check(statics.length === 0, `no module imports scene/sunimage.js at load: ${statics.join(', ')}`);
  check(/import\('\.\/sunimage\.js'\)/.test(readFileSync(join(JS, 'scene/sun.js'), 'utf8')), 'scene/sun.js fetches it when its detail first comes on');
}

if (problems.length) {
  console.error('sunimage FAILED:\n  ' + problems.join('\n  '));
  process.exit(1);
}
console.log('sunimage ok: SDO\'s picture of the day read with its date, laid on the face toward the Earth and turned with the Sun, the only thing drawn there under Measured, loops over NOAA\'s regions under Film only (one mesh), the modelled disc when there is no copy, nothing at boot');
