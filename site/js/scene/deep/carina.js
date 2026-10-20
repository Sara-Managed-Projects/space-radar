// scene/deep/carina.js -- the Carina Nebula (NGC 3372) as a hero: its bipolar cavity, the V-shaped dust lane, Eta
// Carinae and the clusters Trumpler 14 and 16 (internal spec 0077 stage W2-e, internal #782; DS-04). Fetched by
// scene/deep/deepsky.js when the nebula is near (scene/deep/heroes.js); never at boot. scene/deep/helix.js says what a
// hero answers:
//   createHero(THREE, env) -> { group, levels, setLevel(level, share), frame(info), ready(), stats(), card, dispose() }
// Pure, for tests/test_hero_carina.mjs: geometryOf, clustersOf, paletteFor, DRAWN, COPY_BLOCK, UNDER_MEASURED, and
// (re-exported from orion.js, the same arithmetic) columnJs, readFront, sampleFront, coverAt, samplesFor, sharesFor.
//
// WHAT IT IS. A giant H II region: the clusters Trumpler 14 and 16, about 65 O stars among them and Eta Carinae, have
// blown a cavity in the molecular cloud they formed from, and its walls glow where their light eats into the cloud. On
// the largest scale the cavity is BIPOLAR, its axis perpendicular to the Galactic plane (Smith et al. 2000; Smith &
// Brooks 2008), and a dark V-shaped lane of dust and molecular gas lies across its waist IN FRONT of the glowing gas
// (Smith & Brooks 2008: obscuration, the nebula's highest column on our line). Eta Carinae is inside the nebula: its
// light is reflected across the Keyhole, and the Homunculus hides gas behind it but not in front.
//
// ITS SHAPE IS RECONSTRUCTED; ITS LIGHT IS THE PHOTOGRAPH'S. scripts/build_deep_carina.py bakes, on the photograph's
// own (u, v), the WALL's height z (light-years toward the Sun, the record's place at 0): the far side of two lobes along
// the bipolar axis, with a relief from the photograph's brightness (illustrative); the CLOUD's column behind it; and the
// dust lane's optical depth on our line. The wall glows with ESO's photograph (eso1250a, its stars removed) at the
// place it covers on the sky as seen from the Sun, ONCE where a view ray crosses it: from our side the model IS the
// photograph (tests/test_hero_carina.mjs holds the column to 5 %), and turned it is that light on the reconstructed
// wall, crisp at any number of steps because the crossing is found exactly.
//
// HOW IT IS DRAWN. Orion's machinery (scene/deep/orion.js): the same three shaders and their JS mirror, read from
// uniforms, so the two heroes are one technique with two profiles. Three draw calls, in the SKY FRAME (x west, y
// north, z toward the Sun, light-years about the record's place):
//   gas    a box round the photograph's footprint, drawn by its back faces; a few coarse steps through the wall's slab
//          of heights (8 on T0, 12 at level 2, half the coordinator's at level 3) and the exact crossing by bisection;
//          behind the wall the cloud absorbs; the dust lane is a plane 20 ly in front of the clusters that absorbs
//          where the photograph is dark along the lane, and the wall behind it was given that light back, so on our
//          line the two cancel and turned the lane stands in front of the glow.
//   sheet  the same wall as a mesh on T0 and under the frame latch (one texture read a pixel).
//   stars  one Points draw: Eta Carinae and fourteen O and Wolf-Rayet stars at SIMBAD's places, by the catalogue
//          stars' own curve; and a seeded sample of Trumpler 14 (its measured core and halo) and Trumpler 16 as
//          pinpoints whose summed light is the same at every tier and which get smaller, never larger, close up.
// The photograph is the truth from our side: the gas and the stars give way to it by its own share (info.photo); the
// point glow gives way to the hero (deepsky.js heroShares). As the nebula fills the view its light is scaled down
// (orion.js SHAPE.adapt), the eye's adaptation, in the material.
//
// LOOKS. Nothing in it moves. The light has the exposure's own stretch, as the photograph has (Deep is ENHANCED and
// the registry says so). Under Measured nothing changes: every part is a reconstruction or a seeded sample of
// measured numbers, and the card says which.

import { stage } from '../stage.js';
import { exposureLook, EXPOSURES, drawnUnder } from '../exposure.js';
import { HERO as PROFILE } from '../../data/hero-carina.js';
import { NEBULAE } from '../../data/nebulae.js';
import '../../copy/en.deepheroes.js'; // the card's words (deepCarina, deepSmc), fetched with the hero
import { SHADERS, SHAPE, skyFrame, uvOf, coverAt, readFront, sampleFront, columnJs, samplesFor, sharesFor, tintOf, sheetOf, pixelHash } from './orion.js';

export { coverAt, readFront, sampleFront, columnJs, samplesFor, sharesFor, pixelHash, SHAPE };
export const UNDER_MEASURED = { front: 'same', cluster: 'same', motion: 'still' };
// The card's words block (copy/en.later.js deepCarina) and what is drawn for the record.
export const COPY_BLOCK = 'deepCarina';
export const DRAWN = { 'dso-carina-nebula': ['reconstruction'] };

const D2R = Math.PI / 180;
const LIGHT_URL = '../../../images/deep/carina/carina-light.webp';
const FRONT_URL = '../../../data/deep/carina-front.bin';
const DETAIL_URL = '../../../images/deep/carina/carina-detail.webp';
const CLUSTER_BY_TIER = [600, 1400, 2600];
const LY_PER_PC = 3.26156;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
const part = (P, k) => (P.layers || []).find((l) => l && l.part === k) || {};
const isOurs = (p) => p && Array.isArray(p.layers) && p.layers.some((l) => l && l.part === 'front' && Array.isArray(l.lobes));
const offset = (ra0, dec0, ra, dec) => [-(ra - ra0) * Math.cos(dec0 * D2R) * 60, (dec - dec0) * 60];

/** The profile's numbers in light-years, about the record's place, in the sky frame (orion.js geometryOf's shape). Pure. */
export function geometryOf(profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const dist = (P.frame && P.frame.distance_ly) || 7665;
  const lyA = dist * Math.PI / (180 * 60);
  const origin = [Number(P.frame.ra_deg), Number(P.frame.dec_deg)];
  const row = NEBULAE.find((r) => r.id === 'carina-nebula') || { ra_deg: 161.2882, dec_deg: -59.86687, width_arcmin: 61.82, height_arcmin: 66.34, north_deg: 0.09 };
  const uv = uvOf(row, origin, dist);
  const front = part(P, 'front'), cloud = part(P, 'cloud'), dust = part(P, 'dust'), list = part(P, 'stars'), cl = part(P, 'clusters');
  const deepest = Math.max(...(front.lobes || [{ depth_ly: 55 }]).map((l) => Number(l.depth_ly) || 0));
  const relief = Number(front.relief && front.relief.max_ly) || 0;
  const corners = [[0, 0], [1, 0], [1, 1], [0, 1]].map(([u, v]) => uv.xyOf(u, v));
  const xs = corners.map((c) => c[0]), ys = corners.map((c) => c[1]);
  const at = (s, z = 0) => { const [w, n] = offset(origin[0], origin[1], s.ra_deg, s.dec_deg); return [w * lyA, n * lyA, z]; };
  const stars = (list.stars || []).map((s) => ({ id: s.id, pos: at(s, Number(s.z_ly) || 0), v: s.v_mag, temp: s.temp_k }));
  const cloudLy = Number(cloud.thickness_ly) || 12;
  // the sharp map's square in the photograph's (u, v), round Eta Carinae (the bake's own arithmetic)
  const D = part(P, 'light').detail || null;
  let detailBox = null;
  const eta = (list.stars || [])[0];
  if (D && eta) {
    const [ew, en] = offset(origin[0], origin[1], eta.ra_deg, eta.dec_deg);
    const x = (ew + Number(D.centre_west_arcmin)) * lyA, y = (en + Number(D.centre_north_arcmin)) * lyA;
    const uc = uv.u0 + x * uv.ux[0] + y * uv.uy[0], vc = uv.v0 + x * uv.ux[1] + y * uv.uy[1];
    const du = D.size_arcmin / 2 / row.width_arcmin, dv = D.size_arcmin / 2 / row.height_arcmin;
    detailBox = [uc - du, vc - dv, uc + du, vc + dv];
  }
  const veilZ = Number(dust.z_ly) || 20;
  return {
    detailBox,
    distanceLy: dist, lyPerArcmin: lyA, uv, origin,
    // the box reaches up to the dust lane's plane (so a view through it is drawn); the march's slab from the cloud's
    // back to just over the wall's highest point (the clusters' plane: the bake keeps the wall at z <= 0)
    box: { min: [Math.min(...xs), Math.min(...ys), -deepest - relief - cloudLy - 1], max: [Math.max(...xs), Math.max(...ys), veilZ + 1] },
    slabTop: relief + SHAPE.slabPad + 1,
    cloudLy, sigma: Number(cloud.sigma_per_ly) || 0.8,
    veilZ,
    stars,
    clusters: (cl.clusters || []).map((c) => ({
      name: c.name, centre: at(c), core: Number(c.core_arcmin) * lyA, radius: Number(c.radius_arcmin) * lyA,
      members: Number(c.members) || 1000, summedV: Number(c.summed_v) || 6,
    })),
    count: cl.count_drawn || CLUSTER_BY_TIER,
  };
}

/**
 * The clusters, seeded: n stars shared between them by their members, each a Plummer sphere of its core radius cut at
 * its radius, round its catalogued place, in the clusters' plane on average. Each cluster's fluxes (relative to a
 * V = 6.5 star seen from here, times 0.35, scene/stars3d.js's faintest alpha) sum to its `summed_v` at every n, so the
 * light does not change with the tier. {pos: Float32Array(3n), flux: Float32Array(n), temp: Float32Array(n)}. Pure.
 */
export function clustersOf(g, n, seed = 1843) {
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const pos = new Float32Array(3 * n), flux = new Float32Array(n), temp = new Float32Array(n);
  const total = g.clusters.reduce((s, c) => s + c.members, 0) || 1;
  let i = 0;
  g.clusters.forEach((K, k) => {
    const m = k === g.clusters.length - 1 ? n - i : Math.round(n * K.members / total);
    const from = i;
    let sum = 0;
    for (let j = 0; j < m; j++, i++) {
      let r;
      do { r = K.core / Math.sqrt(rand() ** (-2 / 3) - 1); } while (!(r < K.radius));
      const ct = 2 * rand() - 1, st = Math.sqrt(1 - ct * ct), ph = 2 * Math.PI * rand();
      pos.set([K.centre[0] + r * st * Math.cos(ph), K.centre[1] + r * st * Math.sin(ph), K.centre[2] + r * ct], 3 * i);
      // a young cluster's stars: most are faint and red, a few bright and blue (a drawn luminosity function)
      const u = rand();
      const L = 0.02 * Math.pow(1 - 0.999 * u, -1.1);
      flux[i] = L; sum += L;
      temp[i] = 3100 + 9000 * Math.min(1, Math.pow(L / 5, 0.5)) * (0.7 + 0.3 * rand());
    }
    const want = Math.pow(10, -0.4 * (K.summedV - 6.5)) * 0.35;
    for (let j = from; j < i; j++) flux[j] *= want / (sum || 1);
  });
  return { pos, flux, temp };
}

/** The exposure (scene/exposure.js) from the coordinator's gain: the photograph's stretch. Pure. */
export function paletteFor(gain = 1, profile = PROFILE) {
  const P = isOurs(profile) ? profile : PROFILE;
  const mode = EXPOSURES.find((m) => Math.abs(exposureLook(m).milkyWay - gain) < 1e-6) || 'camera';
  const L = exposureLook(mode);
  return { mode, enhanced: mode === 'deep' && !!(P.colours && P.colours.enhanced), gain: L.nebulaGain, gamma: L.nebulaGamma, saturation: L.nebulaSaturation };
}

// -------------------------------------------------------------------------------------- the hero

function material(THREE, { vertexShader, fragmentShader, uniforms, absorbing, side }) {
  // gasmat.js COLOUR_POLICY: display values, opaque list, no depth write; additive for light and premultiplied "over"
  // (GAS_ABSORB) for what absorbs (orion.js material, the same).
  const m = new THREE.ShaderMaterial({ vertexShader, fragmentShader, uniforms, transparent: false, depthTest: false, depthWrite: false, toneMapped: false, side: side || THREE.DoubleSide });
  if (absorbing) {
    m.defines = { GAS_ABSORB: '' };
    m.blending = THREE.CustomBlending;
    m.blendSrc = THREE.OneFactor;
    m.blendDst = THREE.OneMinusSrcAlphaFactor;
  } else m.blending = THREE.AdditiveBlending;
  return m;
}

export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = 'deep-hero-carina';
  const profile = isOurs(env.profile) ? env.profile : PROFILE;
  const g = geometryOf(profile);
  const sky = new THREE.Group();
  sky.name = `${group.name}-sky`;
  sky.matrixAutoUpdate = false;
  group.add(sky);
  let basisFor = null;
  function placeSky() {
    const rec = env.record;
    basisFor = stage.worldId;
    if (!rec || !rec.pos) return;
    const f = skyFrame(rec.pos);
    const c = new THREE.Vector3(), tip = new THREE.Vector3();
    if (!stage.toSceneInto(rec.pos, 'sun-inertial', c, stage.tMs)) return;
    const k = 1e12;
    const dir = (v) => {
      stage.toSceneInto({ x: rec.pos.x + v[0] * k, y: rec.pos.y + v[1] * k, z: rec.pos.z + v[2] * k }, 'sun-inertial', tip, stage.tMs);
      return tip.clone().sub(c).normalize();
    };
    const x = dir(f.west), y = dir(f.north);
    const z = new THREE.Vector3().crossVectors(x, y).normalize();
    y.crossVectors(z, x).normalize();
    sky.matrix.makeBasis(x, y, z);
    sky.matrixWorldNeedsUpdate = true;
  }

  // --- what it fetches: the light map, the sharp map round the clusters, and the wall's map
  let lightTex = null, lightState = 'none', detailTex = null, detailState = 'none', frontTex = null, frontState = 'none', frontBytes = 0;
  const browser = typeof document !== 'undefined';
  const loadTex = (url, mip, done) => {
    const t = new THREE.TextureLoader().load(new URL(url, import.meta.url).href, () => done('ready'), undefined, (e) => { done('failed'); console.warn('deep: a Carina map did not load', url, e); });
    t.colorSpace = THREE.NoColorSpace; // display values, as the photographs (gasmat.js COLOUR_POLICY)
    t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping;
    t.generateMipmaps = mip;
    t.minFilter = mip ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
    t.magFilter = THREE.LinearFilter;
    return t;
  };
  if (browser && THREE.TextureLoader) {
    lightState = 'loading';
    lightTex = loadTex(LIGHT_URL, true, (st) => { lightState = st; });
    // the sharp map has no mipmaps (GPU memory): the shader uses it only where its texels are at least half a pixel
    detailState = 'loading';
    detailTex = loadTex(DETAIL_URL, false, (st) => { detailState = st; for (const m of [gasMat, sheetMat]) m.uniforms.uDetOn.value = st === 'ready' ? 1 : 0; });
  }
  const DET = part(profile, 'light').detail || {};
  const blank = new THREE.DataTexture(new Uint16Array([0, 0, 0, 0x3c00]), 1, 1, THREE.RGBAFormat, THREE.HalfFloatType);
  blank.needsUpdate = true;

  const pal0 = paletteFor(1, profile);
  const V3 = (v) => new THREE.Vector3(...v);
  const V2 = (v) => new THREE.Vector2(...v);
  const front = () => ({
    uFront: { value: blank }, uUv0: { value: new THREE.Vector2(g.uv.u0, g.uv.v0) }, uUx: { value: V2(g.uv.ux) }, uUy: { value: V2(g.uv.uy) },
    uSigma: { value: g.sigma }, uCloudLy: { value: g.cloudLy }, uBoxMin: { value: V3(g.box.min) }, uBoxMax: { value: V3(g.box.max) },
  });
  const camU = { value: new THREE.Vector3(0, 0, 400) };
  const lightU = () => ({
    uLight: { value: lightTex }, uDetail: { value: detailTex }, uDetBox: { value: new THREE.Vector4(...(g.detailBox || [0, 0, 1, 1])) }, uDetOn: { value: 0 }, uDetPx: { value: Number(DET.px) || 576 },
    uGamma: { value: pal0.gamma }, uSat: { value: pal0.saturation },
  });
  // --- the gas: the box round the footprint, by its back faces (T1 and up)
  const size = g.box.max.map((v, i) => v - g.box.min[i]);
  const gasGeo = new THREE.BoxGeometry(size[0], size[1], size[2]);
  gasGeo.translate(...g.box.max.map((v, i) => (v + g.box.min[i]) / 2));
  const gasMat = material(THREE, {
    vertexShader: SHADERS.gasVertex, fragmentShader: SHADERS.gas, absorbing: true, side: THREE.BackSide,
    uniforms: {
      ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uSlabTop: { value: g.slabTop }, uCell: { value: 0.7 }, uN: { value: 12 },
      uPixAng: { value: 0.001 }, uShare: { value: 0 }, uGain: { value: 1 },
    },
  });
  gasMat.name = 'deep-carina-gas';
  const gas = new THREE.Mesh(gasGeo, gasMat);
  gas.name = `${group.name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  gas.renderOrder = -1;
  sky.add(gas);
  // --- the sheet: the same wall as a mesh (T0 and the latch), built once the wall's map has landed
  const sheetMat = material(THREE, {
    vertexShader: SHADERS.sheetVertex, fragmentShader: SHADERS.sheet, absorbing: true, side: THREE.DoubleSide,
    uniforms: { ...front(), ...lightU(), uCam: camU, uVeilZ: { value: g.veilZ }, uPixAng: gasMat.uniforms.uPixAng, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  sheetMat.name = 'deep-carina-sheet';
  let sheet = null, sheetBytes = 0;

  const useFront = (f) => {
    frontTex = new THREE.DataTexture(f.half, f.nx, f.ny, THREE.RGBAFormat, THREE.HalfFloatType);
    frontTex.minFilter = frontTex.magFilter = THREE.LinearFilter;
    frontTex.wrapS = frontTex.wrapT = THREE.ClampToEdgeWrapping;
    frontTex.generateMipmaps = false;
    frontTex.needsUpdate = true;
    frontBytes = f.half.byteLength;
    for (const m of [gasMat, starMat, sheetMat]) m.uniforms.uFront.value = frontTex;
    gasMat.uniforms.uCell.value = 1 / f.nx / Math.hypot(g.uv.ux[0], g.uv.ux[1]);
    frontMap = f;
    frontState = 'ready';
  };
  // The sheet is built the first time the cheap path is wanted (T0, the latch): on T1 and T2 its 0.6 MB is never spent.
  let frontMap = null;
  const buildSheet = () => {
    if (sheet || !frontMap) return;
    const sh = sheetOf(g, frontMap);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(sh.pos, 3));
    geo.setAttribute('aUv', new THREE.Float32BufferAttribute(sh.uv, 2));
    geo.setAttribute('aNormal', new THREE.Float32BufferAttribute(sh.nrm, 3));
    geo.setIndex(sh.index);
    sheet = new THREE.Mesh(geo, sheetMat);
    sheet.name = `${group.name}-sheet`;
    sheet.renderOrder = -1;
    sheet.visible = false;
    sky.add(sheet);
    sheetBytes = sh.pos.byteLength + sh.uv.byteLength + sh.nrm.byteLength + sh.index.length * 4;
  };
  if (browser || env.fetchBin) {
    frontState = 'loading';
    const load = env.fetchBin || ((url) => fetch(url).then((r) => (r.ok ? r.arrayBuffer() : Promise.reject(new Error(`${r.status}`)))));
    Promise.resolve().then(() => load(new URL(FRONT_URL, import.meta.url).href)).then((buf) => useFront(readFront(buf)))
      .catch((e) => { frontState = 'failed'; console.warn('deep: the Carina wall did not load', e); });
  }

  // --- the stars: Eta Carinae and the O stars, and the two clusters (built for the tier)
  const starMat = material(THREE, {
    vertexShader: SHADERS.starVertex, fragmentShader: SHADERS.star,
    uniforms: { ...front(), uCam: camU, uDistLy: { value: g.distanceLy }, uPixelRatio: { value: 1 }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  starMat.name = 'deep-carina-stars';
  let stars = null, starTier = -1, starCount = 0, starBytes = 0;
  function buildStars(tier) {
    if (stars && starTier === tier) return;
    if (stars) { sky.remove(stars); stars.geometry.dispose(); }
    const n = (Array.isArray(g.count) ? g.count : CLUSTER_BY_TIER)[clamp(tier | 0, 0, 2)] | 0;
    const cl = clustersOf(g, n);
    const m = g.stars.length;
    const pos = new Float32Array(3 * (m + n)), star = new Float32Array(4 * (m + n)), kind = new Float32Array(m + n);
    g.stars.forEach((s, i) => { pos.set(s.pos, 3 * i); star.set([...tintOf(s.temp), s.v], 4 * i); });
    for (let i = 0; i < n; i++) {
      pos.set(cl.pos.subarray(3 * i, 3 * i + 3), 3 * (m + i));
      star.set([...tintOf(cl.temp[i]), cl.flux[i]], 4 * (m + i));
      kind[m + i] = 1;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aStar', new THREE.Float32BufferAttribute(star, 4));
    geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
    stars = new THREE.Points(geo, starMat);
    stars.name = `${group.name}-stars`;
    stars.frustumCulled = false;
    stars.renderOrder = -0.96;
    sky.add(stars);
    starTier = tier; starCount = m + n; starBytes = pos.byteLength + star.byteLength + kind.byteLength;
  }
  buildStars(1);

  let level = 0, levelShare = 0, samples = 12, tierNow = 1, slowMs = 0, cheap = false, last = { gas: 0, stars: 0, photo: 0, light: 1 }, palette = pal0;
  const _inv = new THREE.Matrix4();
  const _id = new THREE.Matrix4();
  const _cam = new THREE.Vector3();

  return {
    group,
    levels: [2, 3],
    // The cheap path (the sheet) costs about what the holder it replaces does (orion.js's, spec 0076 W1-a).
    latchSafe: true,
    card: { copy: COPY_BLOCK, drawn: DRAWN },
    setLevel(n, share = 1) {
      level = n;
      levelShare = n >= 2 ? clamp(share, 0, 1) : 0;
      group.visible = levelShare > 0;
    },
    frame(info = {}) {
      if (basisFor !== stage.worldId) placeSky();
      const tier = Number.isFinite(info.tier) ? info.tier : 1;
      if (tier !== tierNow || !stars) { tierNow = tier; buildStars(tier); }
      const q = typeof env.quality === 'function' ? env.quality() || {} : {};
      cheap = !(tier >= 1) || !!q.latched;
      if (cheap) buildSheet();
      const vh = (typeof globalThis.innerHeight === 'number' && globalThis.innerHeight) || 800;
      const sh = sharesFor({ level: levelShare, rPx: info.rPx, photo: info.photo, viewH: vh });
      last = { ...sh, photo: Number(info.photo) || 0 };
      // slow frames halve the coarse steps before the governor would lower the pixel ratio (spec 0075 task 44)
      const dt = Number(info.dtMs) || 0;
      if (!(info.frozen || info.reduced)) slowMs = slowMs * 0.9 + dt * 0.1;
      samples = cheap ? 0 : samplesFor({ tier, steps: level >= 3 ? info.steps : 0, slow: slowMs > 24 });
      const gain = Number.isFinite(info.gain) ? info.gain : 1;
      if (gain !== palette.gainIn) {
        palette = { ...paletteFor(gain, profile), gainIn: gain };
        for (const m of [gasMat, sheetMat]) { m.uniforms.uGamma.value = palette.gamma; m.uniforms.uSat.value = palette.saturation; }
      }
      // Under Measured nothing changes and nothing moves (UNDER_MEASURED): every part is measured, reconstructed or seeded.
      const look = info.look || 'film';
      const keep = drawnUnder(look, UNDER_MEASURED.front) ? 1 : 0;
      const lit = lightState === 'ready' && frontState === 'ready';
      const gu = gasMat.uniforms, su = sheetMat.uniforms;
      gu.uShare.value = lit && !cheap ? sh.gas * keep : 0;
      su.uShare.value = lit && cheap ? sh.gas * keep : 0;
      gu.uN.value = Math.max(1, samples);
      gu.uGain.value = su.uGain.value = palette.gain * sh.light;
      starMat.uniforms.uShare.value = frontState === 'ready' ? sh.stars : 0;
      starMat.uniforms.uPixelRatio.value = (typeof globalThis.devicePixelRatio === 'number' && globalThis.devicePixelRatio) || 1;
      gas.visible = gu.uShare.value > 0.002;
      if (sheet) sheet.visible = su.uShare.value > 0.002;
      stars.visible = starMat.uniforms.uShare.value > 0.002;
      if (info.camera) {
        if (group.parent) group.parent.updateWorldMatrix(true, false);
        _inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : _id, group.matrix).multiply(sky.matrix).invert();
        _cam.copy(info.camera.position).applyMatrix4(_inv);
        camU.value.copy(_cam);
        const P = info.camera.projectionMatrix.elements;
        gu.uPixAng.value = 2 / Math.max(1, P[5] * vh);
      }
    },
    ready: () => lightState !== 'loading' && frontState !== 'loading' && detailState !== 'loading',
    stats: () => ({
      level, share: Math.round(last.gas * 100) / 100, photo: Math.round(last.photo * 100) / 100, stars: Math.round(last.stars * 100) / 100,
      light: lightState, detail: detailState, front: frontState, path: cheap ? 'sheet' : 'march', samples, tier: tierNow, palette: palette.mode, points: starCount, meshes: 3,
      textures: (lightTex ? 1 : 0) + (detailTex ? 1 : 0) + (frontTex ? 1 : 0),
      bytes: starBytes + sheetBytes + gasGeo.getAttribute('position').array.byteLength + frontBytes + (lightTex ? Math.round(596 * 640 * 4 * 4 / 3) : 0) + (detailTex ? (Number(DET.px) || 576) ** 2 * 4 : 0),
      camLy: [Math.round(_cam.x * 10) / 10, Math.round(_cam.y * 10) / 10, Math.round(_cam.z * 10) / 10],
    }),
    dispose() {
      if (stars) stars.geometry.dispose();
      if (sheet) sheet.geometry.dispose();
      gasGeo.dispose();
      gasMat.dispose(); starMat.dispose(); sheetMat.dispose();
      for (const t of [lightTex, detailTex, frontTex]) if (t) t.dispose();
      blank.dispose();
      stars = null; sheet = null;
      if (group.parent) group.parent.remove(group);
    },
  };
}
