// sky/landscape.js -- the land under the sky: a sea horizon, hills or a city skyline, chosen from
// the place (check 1 against Stellarium).
//
// Contract:
//   landscapeKind({ darkness, sea })     -> 'city' | 'coast' | 'hills'              (pure)
//   seaSectors(sample, latDeg, lonDeg)   -> 16 numbers, 0 land to 1 water, north first, clockwise (pure)
//   seaWords(sea)                        -> the middle of the sea's arc as a compass index 0..15, or -1 (pure)
//   makeProfile(kind, seed, sea)         -> { far(azRad), near(azRad), seaAt(azRad), columns() } radians (pure)
//   sampleSea(url, latDeg, lonDeg)       -> Promise<number[16] | null>
//   createLandscape(env)                 -> { set(kind, seed, sea), update(frame), state(), dispose() }
//     env:   { root, radius, glsl }      glsl is sky/skyair.js GLSL_SKY
//     frame: { sun: [x, y, z], exposure, floorHorizon: [3], day, glow, haze }
// Loaded with sky/groundsky.js; the water mask is fetched only when the sky view opens (it is the
// map the Earth already wears, textures/4k/earth_water.webp, and nothing about the place is sent).
//
// WHAT IS REAL AND WHAT IS DRAWN. Two things are read from maps: whether the place is a city (the
// night lights, sky/skyglow.js, through the kind of sky) and in which directions there is open
// water within about 25 km (the water mask, a pixel of which is 10 km: enough to say "the sea is
// to the west", not to draw a bay). Everything else is DRAWN: the hills and the roofs are generated
// from the place's coordinates, so a place always has the same skyline and two places differ, but
// they are nobody's real hills. There is no terrain model here; the controls say "skyline drawn".
//
// The far ground is the colour of the sky just above it, mostly: that is what distance does (the
// air between scatters the same light), and it is why the far ridge is paler than the near one. A
// thin band of the same colour lies over the horizon: the haze stars sink into.

import * as THREE from '../../vendor/three.module.min.js';

const DEG = Math.PI / 180;
const TAU = Math.PI * 2;
export const SEA_SECTORS = 16;
/** How far out the water mask is read, in kilometres: two rings. */
export const SEA_RINGS_KM = [12, 25];

export function landscapeKind({ darkness, sea } = {}) {
  if (darkness === 'city') return 'city';
  if (Array.isArray(sea) && sea.some((v) => v >= 0.5)) return 'coast';
  return 'hills';
}

/**
 * Where the water is, around a place. `sample(latDeg, lonDeg)` returns 0 (land) to 1 (water);
 * each of the 16 directions is the mean of the mask at 12 and 25 km that way.
 */
export function seaSectors(sample, latDeg, lonDeg) {
  const out = [];
  const lat = latDeg * DEG;
  for (let i = 0; i < SEA_SECTORS; i += 1) {
    const az = (i / SEA_SECTORS) * TAU;
    let sum = 0;
    for (const km of SEA_RINGS_KM) {
      const d = km / 6371;
      const la = Math.asin(Math.sin(lat) * Math.cos(d) + Math.cos(lat) * Math.sin(d) * Math.cos(az));
      const lo = lonDeg * DEG + Math.atan2(Math.sin(az) * Math.sin(d) * Math.cos(lat), Math.cos(d) - Math.sin(lat) * Math.sin(la));
      sum += Math.max(0, Math.min(1, Number(sample(la / DEG, lo / DEG)) || 0));
    }
    out.push(sum / SEA_RINGS_KM.length);
  }
  return out;
}

/** The middle of the widest run of sea, as one of 16 compass points (0 north, 4 east), or -1 with no sea. */
export function seaWords(sea) {
  if (!Array.isArray(sea) || sea.length !== SEA_SECTORS) return -1;
  const wet = sea.map((v) => v >= 0.5);
  if (!wet.includes(true)) return -1;
  if (!wet.includes(false)) return 0;
  let best = { len: 0, start: 0 };
  for (let s = 0; s < SEA_SECTORS; s += 1) {
    if (!wet[s] || wet[(s + SEA_SECTORS - 1) % SEA_SECTORS]) continue;
    let len = 0;
    while (wet[(s + len) % SEA_SECTORS]) len += 1;
    if (len > best.len) best = { len, start: s };
  }
  return Math.round(best.start + (best.len - 1) / 2) % SEA_SECTORS;
}

/** A number in [0, 1) from two integers: the same roofs for the same place, every visit. */
export function hash2(a, b) {
  let h = (Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

export function seedOf(latDeg, lonDeg) {
  return (Math.round((latDeg + 90) * 50) * 36000 + Math.round((((lonDeg % 360) + 360) % 360) * 50)) | 0;
}

/**
 * The skyline of a place: two ridges, the far one and the near one, as altitudes in radians by
 * azimuth, and how much of each direction is open water. Deterministic in `seed`.
 */
export function makeProfile(kind, seed = 0, sea = null) {
  const ph = (k) => hash2(seed, k) * TAU;
  const amp = (k, lo, hi) => lo + (hi - lo) * hash2(seed, 100 + k);
  const wet = Array.isArray(sea) && sea.length === SEA_SECTORS ? sea : null;
  const seaAt = (az) => {
    if (!wet || kind !== 'coast') return 0;
    const x = ((((az % TAU) + TAU) % TAU) / TAU) * SEA_SECTORS;
    const i = Math.floor(x) % SEA_SECTORS;
    const k = x - Math.floor(x);
    const a = wet[i] >= 0.5 ? 1 : 0;
    const b = wet[(i + 1) % SEA_SECTORS] >= 0.5 ? 1 : 0;
    const s = k * k * (3 - 2 * k);
    return a + (b - a) * s;
  };
  const hills = (az, base, scale, k0) => base + scale * (
    amp(k0, 0.5, 1.0) * Math.sin(az * 2 + ph(k0)) + amp(k0 + 1, 0.3, 0.7) * Math.sin(az * 3 + ph(k0 + 1))
    + 0.45 * Math.sin(az * 5 + ph(k0 + 2)) + 0.25 * Math.sin(az * 9 + ph(k0 + 3)) + 0.12 * Math.sin(az * 17 + ph(k0 + 4)));
  const trees = (az) => 0.18 * Math.abs(Math.sin(az * 41 + ph(9))) * (0.5 + 0.5 * Math.sin(az * 3 + ph(10))) + 0.05 * Math.sin(az * 113 + ph(11));
  // A city's lots: a quarter of a degree wide, grouped into buildings one to five lots wide.
  const LOTS = 1440;
  let roofs = null;
  if (kind === 'city') {
    roofs = new Float32Array(LOTS);
    let i = 0;
    while (i < LOTS) {
      const w = 1 + Math.floor(hash2(seed, 2000 + i) * 5);
      const r = hash2(seed, 5000 + i);
      const downtown = 0.5 + 0.5 * Math.sin((i / LOTS) * TAU + ph(20));
      // Mostly low blocks; a few towers, more of them towards one side of town; a gap now and then.
      let h = r < 0.12 ? 0.35 : 0.8 + 1.5 * hash2(seed, 7000 + i);
      if (r > 0.9 - 0.12 * downtown) h = 2.6 + 3.2 * hash2(seed, 9000 + i) * (0.4 + 0.6 * downtown);
      for (let k = 0; k < w && i < LOTS; k += 1, i += 1) roofs[i] = h;
    }
  }
  const far = (az) => {
    const s = seaAt(az);
    const land = kind === 'city' ? Math.max(0.3, hills(az, 0.7, 0.35, 30)) : Math.max(0.35, hills(az, 1.5, 0.9, 30));
    return (land * (1 - s)) * DEG;
  };
  const near = (az) => {
    const s = seaAt(az);
    let land;
    if (kind === 'city') {
      const lot = Math.floor(((((az % TAU) + TAU) % TAU) / TAU) * LOTS) % LOTS;
      land = roofs[lot];
    } else {
      land = Math.max(0.15, hills(az, 0.55, 0.5, 60) + trees(az));
    }
    // Towards the water the near ground drops under the sea's horizon: a shore, not a wall.
    return (land * (1 - s) - 7 * s) * DEG;
  };
  return {
    kind, far, near, seaAt, lots: roofs ? LOTS : 0,
    /** Where the mesh needs a column: every quarter degree, and both sides of every wall. */
    columns() {
      const n = 1440;
      const out = [];
      for (let i = 0; i <= n; i += 1) {
        const az = (i / n) * TAU;
        if (roofs) {
          // Two columns at one azimuth: the roof to the left and the roof to the right.
          const e = TAU / n * 1e-3;
          out.push({ az, far: far(az), near: i === 0 ? near(az + e) : near(az - e), sea: seaAt(az) });
          if (i < n) out.push({ az, far: far(az), near: near(az + e), sea: seaAt(az) });
        } else {
          out.push({ az, far: far(az), near: near(az), sea: seaAt(az) });
        }
      }
      return out;
    },
  };
}

/** Read the water mask around a place: 16 numbers, or null when it cannot be read. */
export async function sampleSea(url, latDeg, lonDeg) {
  if (typeof document === 'undefined' || typeof createImageBitmap !== 'function') return null;
  if (!Number.isFinite(latDeg) || !Number.isFinite(lonDeg)) return null;
  try {
    const r = await fetch(url);
    if (!r.ok) return null;
    const bitmap = await createImageBitmap(await r.blob());
    const W = bitmap.width;
    const H = bitmap.height;
    // The mask is read one pixel at a time through a one-pixel canvas: 32 reads, no 4k canvas.
    const canvas = document.createElement('canvas');
    canvas.width = 1;
    canvas.height = 1;
    const g = canvas.getContext('2d', { willReadFrequently: true });
    const sample = (la, lo) => {
      const x = Math.floor((((lo + 180) % 360 + 360) % 360) / 360 * W) % W;
      const y = Math.max(0, Math.min(H - 1, Math.floor((90 - la) / 180 * H)));
      g.clearRect(0, 0, 1, 1);
      g.drawImage(bitmap, x, y, 1, 1, 0, 0, 1, 1);
      return g.getImageData(0, 0, 1, 1).data[0] / 255;
    };
    const out = seaSectors(sample, latDeg, lonDeg);
    if (typeof bitmap.close === 'function') bitmap.close();
    return out;
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------------------------ the mesh

const VERT = (glsl) => /* glsl */ `
attribute float aAz;
attribute float aDown;
attribute float aTop;
attribute float aSea;
attribute float aAlpha;
uniform vec3 uSun;
uniform float uExposure;
uniform vec3 uFloor;
varying vec3 vSky;
varying float vDown;
varying float vTop;
varying float vSea;
varying float vAlpha;
varying float vAz;
${glsl}
void main() {
  // The sky a degree and a half over the horizon, this way: what distance turns the land into.
  vec3 view = vec3(sin(aAz) * 0.99966, 0.0262, -cos(aAz) * 0.99966);
  vec3 sR; vec3 sM;
  skyScatter(view, uSun, sR, sM);
  vSky = skyShade(sR, sM, dot(view, uSun), uExposure) + uFloor;
  vDown = aDown;
  vTop = aTop;
  vSea = aSea;
  vAlpha = aAlpha;
  vAz = aAz;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;
const FRAG = /* glsl */ `
uniform vec3 uLand;
uniform vec3 uSeaColour;
uniform vec3 uLights;
uniform float uHaze;
uniform float uWindows;
uniform float uBand;
uniform float uGlow;
varying vec3 vSky;
varying float vDown;
varying float vTop;
varying float vSea;
varying float vAlpha;
varying float vAz;
float h21(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
void main() {
  if (uBand > 0.5) {
    // The haze over the horizon: the sky's own colour there, thinning upwards.
    gl_FragColor = vec4(vSky + uLights * uGlow * 0.25, vAlpha * uBand);
    #include <colorspace_fragment>
    return;
  }
  vec3 land = mix(uLand, vSky, uHaze);
  // Water takes the sky's colour, darker: more of it the nearer the horizon.
  vec3 sea = mix(uSeaColour, vSky, 0.62 * exp(-vDown * 0.9));
  vec3 c = mix(land, sea, clamp(vSea, 0.0, 1.0));
  if (uWindows > 0.0 && vTop > 0.6) {
    // Lit windows: a grid on each wall, one in six alight. Drawn, like the walls.
    vec2 cell = vec2(floor(degrees(vAz) * 11.0), floor(vDown * 9.0));
    vec2 in01 = fract(vec2(degrees(vAz) * 11.0, vDown * 9.0));
    float wall = step(0.12, vDown) * step(vDown, vTop - 0.3);
    float lit = step(0.84, h21(cell)) * step(0.25, in01.x) * step(in01.x, 0.75) * step(0.3, in01.y) * step(in01.y, 0.8);
    c += uLights * uWindows * wall * lit * (0.5 + 0.5 * h21(cell + 7.0));
  }
  gl_FragColor = vec4(c, vAlpha);
  #include <colorspace_fragment>
}
`;

export function createLandscape(env) {
  const R = env.radius;
  const root = env.root;
  const shared = {
    uSun: { value: new THREE.Vector3(0, 1, 0) },
    uExposure: { value: 1 },
    uFloor: { value: new THREE.Vector3() },
    uLand: { value: new THREE.Color(0x05070a) },
    uSeaColour: { value: new THREE.Color(0x03060c) },
    uLights: { value: new THREE.Color().setRGB(1, 0.79, 0.54, THREE.SRGBColorSpace) },
    uGlow: { value: 0 },
  };
  const material = (over) => new THREE.ShaderMaterial({
    vertexShader: VERT(env.glsl), fragmentShader: FRAG,
    uniforms: { ...shared, uHaze: { value: 0 }, uWindows: { value: 0 }, uBand: { value: 0 }, ...over },
    transparent: true, depthTest: false, depthWrite: false, side: THREE.DoubleSide, toneMapped: false,
  });
  let meshes = [];
  let now = { kind: null, seed: null, seaKey: '' };
  let profile = null;

  const dirOf = (az, alt, out, at) => {
    const c = Math.cos(alt);
    out[at] = Math.sin(az) * c * R;
    out[at + 1] = Math.sin(alt) * R;
    out[at + 2] = -Math.cos(az) * c * R;
  };

  /** A cap from a ridge down to the nadir: rings of (offset below the ridge in radians, alpha). */
  function cap(cols, topOf, rings, seaOf) {
    const n = cols.length;
    const rows = rings.length + 2;
    const pos = new Float32Array(n * rows * 3);
    const az = new Float32Array(n * rows);
    const down = new Float32Array(n * rows);
    const top = new Float32Array(n * rows);
    const sea = new Float32Array(n * rows);
    const alpha = new Float32Array(n * rows);
    for (let r = 0; r < rows; r += 1) {
      for (let i = 0; i < n; i += 1) {
        const c = cols[i];
        const t = topOf(c);
        const k = r * n + i;
        const alt = r < rings.length ? t + rings[r].d : r === rings.length ? -30 * DEG : -Math.PI / 2;
        dirOf(c.az, alt, pos, k * 3);
        az[k] = c.az;
        down[k] = (t - alt) / DEG;
        top[k] = t / DEG;
        sea[k] = seaOf ? seaOf(c) : 0;
        alpha[k] = r < rings.length ? rings[r].a : 1;
      }
    }
    const index = [];
    for (let r = 0; r + 1 < rows; r += 1) {
      for (let i = 0; i + 1 < n; i += 1) {
        const a = r * n + i;
        const b = (r + 1) * n + i;
        index.push(a, b, a + 1, a + 1, b, b + 1);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aAz', new THREE.BufferAttribute(az, 1));
    geo.setAttribute('aDown', new THREE.BufferAttribute(down, 1));
    geo.setAttribute('aTop', new THREE.BufferAttribute(top, 1));
    geo.setAttribute('aSea', new THREE.BufferAttribute(sea, 1));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(alpha, 1));
    geo.setIndex(index);
    return geo;
  }

  function clear() {
    for (const m of meshes) { m.geometry.dispose(); m.material.dispose(); root.remove(m); }
    meshes = [];
  }

  function add(name, geo, mat, order) {
    const mesh = new THREE.Mesh(geo, mat);
    mesh.name = name;
    mesh.frustumCulled = false;
    mesh.renderOrder = order;
    root.add(mesh);
    meshes.push(mesh);
    return mesh;
  }

  function set(kind, seed, sea) {
    const seaKey = Array.isArray(sea) ? sea.map((v) => (v >= 0.5 ? 1 : 0)).join('') : '';
    if (now.kind === kind && now.seed === seed && now.seaKey === seaKey) return;
    now = { kind, seed, seaKey };
    clear();
    profile = makeProfile(kind, seed, sea);
    const cols = profile.columns();
    const soft = [{ d: 0.06 * DEG, a: 0 }, { d: 0, a: 1 }, { d: -1.6 * DEG, a: 1 }];
    // The haze band: from under the far ridge to four degrees over the horizon.
    const band = cap(cols.filter((_, i) => i % 4 === 0 || i === cols.length - 1), () => 0, [{ d: 4.5 * DEG, a: 0 }, { d: 2.2 * DEG, a: 0.22 }, { d: 0.9 * DEG, a: 0.6 }, { d: 0, a: 1 }, { d: -1 * DEG, a: 1 }]);
    add('sky-haze', band, material({ uBand: { value: 1 } }), 99.2);
    add('sky-land-far', cap(cols, (c) => c.far, soft, (c) => c.sea), material({ uHaze: { value: 0.55 } }), 99.5);
    add('sky-land-near', cap(cols, (c) => c.near, soft, null), material({ uHaze: { value: 0.1 } }), 100);
  }

  const _day = new THREE.Color(0x26331f);
  const _night = new THREE.Color(0x05070a);
  const _seaDay = new THREE.Color(0x0c2238);
  const _seaNight = new THREE.Color(0x03060c);

  function update(frame) {
    if (!meshes.length) return;
    shared.uSun.value.set(frame.sun[0], frame.sun[1], frame.sun[2]);
    shared.uExposure.value = frame.exposure;
    shared.uFloor.value.set(frame.floorHorizon[0], frame.floorHorizon[1], frame.floorHorizon[2]);
    shared.uLand.value.copy(_night).lerp(_day, frame.day);
    shared.uSeaColour.value.copy(_seaNight).lerp(_seaDay, frame.day);
    shared.uGlow.value = frame.glow;
    const [band, , near] = meshes;
    band.material.uniforms.uBand.value = Math.max(0.02, frame.haze);
    // Windows are lit from dusk; by day a wall is a wall.
    near.material.uniforms.uWindows.value = now.kind === 'city' ? Math.max(0, 1 - frame.day * 2.5) * 0.9 : 0;
  }

  return {
    set,
    update,
    /** The height of the skyline at an azimuth, in degrees: what hides a low star. */
    skylineDeg: (azRad) => (profile ? Math.max(profile.far(azRad), profile.near(azRad)) / DEG : 0),
    state: () => ({ kind: now.kind, seed: now.seed, sea: now.seaKey, meshes: meshes.length }),
    dispose() { clear(); },
  };
}
