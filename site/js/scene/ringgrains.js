// scene/ringgrains.js -- Saturn's ring as particles, from very close (internal #890, spec 0077 W1-f).
//
// Contract: createRingGrains(THREE, { root, ringUniforms }) -> { points, update(state) -> stats, dispose() }
// Pure and exported for tests/test_outer_worlds.mjs: RING_PARTICLES, particleRadii(n, seed),
// keptPerSquareMetre(tau), resolvedShare(), slabLight(tau, mu0, mu, sameSide), grainFade(distM)
//
// RINGS NEAR AND FAR. From afar Saturn's ring is a sheet with an optical depth: the map's, Cassini's
// fine structure over it from close (scene/worlds.js RING_FINE), and a sparkle that stands for grains
// too small to draw (RING_GRAIN). Within RING_PARTICLES.fromM of the ring plane the biggest particles
// are big enough on screen to be drawn as what they are: balls of ice.
//
// WHAT IS MEASURED. The sizes: a power law, n(r) ~ r^-q with q = 3, from about a centimetre to about
// five metres (French and Nicholson 2000, Icarus 145, 502; Cuzzi et al. 2009, "Ring particle
// composition and size distribution", in Saturn from Cassini-Huygens). The optical depth, at the
// particle's own radius, from the same map and fine strip the sheet is drawn from. The slab's
// thickness, about ten metres (the A ring's, from its self-gravity wakes; Colwell et al. 2006, GRL 33,
// L07201). From those the NUMBER of particles a square metre holds follows: with q = 3 every factor of
// size carries the same share of the optical depth, so the particles from 1 to 5 m carry ln 5 / ln 500
// = 0.26 of it, and there are tau x 0.0492 of them a square metre (keptPerSquareMetre). Smaller ones
// stay in the sheet, which gives up exactly the share the drawn ones take (resolvedShare, worn by the
// sheet as uResolved), so the ring is no brighter and no darker for being drawn as particles.
//
// WHAT IS NOT. Where each particle is: a seeded hash, stable as the camera moves. The A ring's
// self-gravity wakes, clumps some 80 m apart canted about 21 degrees from the direction of orbit
// (their existence and slant measured by Cassini's stellar occultations, Colwell et al. 2006; no
// camera has resolved one): drawn as a modulation of the particles' number, illustrative. The
// particles' colour is the ring map's at their radius. And they are drawn STILL: the ring goes round
// Saturn at 17 to 21 km a second, and this is the ring as someone riding along with it would see it.
// So under the Measured look none of it is drawn (scene/worlds.js), as the grains are not.
//
// COST. One draw call, points, additive (the sheet under them already hides what is behind the ring,
// and gives up the light they add): an instanced tile of RING_PARTICLES.perTile particles laid on a
// grid of tiles round the point of the ring under the camera, `reach` metres in radius (tier 1 half
// the tiles of tier 2). A particle is kept where its rank is under its share of the local optical
// depth, so the vertex shader runs for every slot and the fragment shader only for the kept ones.
// Fetched with a dynamic import the first time the camera comes this close; 0 bytes at boot.

/** The numbers (see the header for whose). Lengths in metres. */
export const RING_PARTICLES = {
  rMinM: 1,          // the smallest drawn
  rMaxM: 5,          // the largest in the distribution
  rFloorM: 0.01,     // the smallest in it, which the sheet keeps
  q: 3,
  thicknessM: 10,
  tileM: 200,
  tauMax: 2,         // a tile holds enough particles for this optical depth; a thicker ring is drawn as this, as bright
  fromM: 25000,      // the camera's height over the ring plane below which they are drawn
  reach: [0, 800, 1200],   // metres round the camera's foot, by tier (tier 0 draws none)
  fadeFrom: 0.25,    // of `reach`: full nearer, gone at `reach` (0.6 drew the patch's edge as a circle in the first look)
  wakes: { lambdaM: 80, cantDeg: 21, amp: 0.6, fromKm: 122170, toKm: 136775, refM: 1.3e8 },  // the A ring's
  maxPx: 48,
};

/** Particles a square metre at optical depth `tau`, drawn ones only (rMinM to rMaxM). Pure. */
export function keptPerSquareMetre(tau, P = RING_PARTICLES) {
  // n(r) = C r^-3; tau = pi C ln(rMax / rFloor); N(rMin..rMax) = C / 2 (rMin^-2 - rMax^-2).
  const C = tau / (Math.PI * Math.log(P.rMaxM / P.rFloorM));
  return (C / 2) * (P.rMinM ** -2 - P.rMaxM ** -2);
}

/** The share of the optical depth the drawn particles carry. Pure. */
export function resolvedShare(P = RING_PARTICLES) {
  return Math.log(P.rMaxM / P.rMinM) / Math.log(P.rMaxM / P.rFloorM);
}

/**
 * The share of the sheet's light the drawn balls take, `distM` from a camera whose pixel is `pxAngle`
 * radians: with q = 3, ln(rMax / r) / ln(rMax / rFloor) for the balls bigger than r, a third of a pixel
 * there. JS twin of RING_FRAG's uResolved block (scene/worlds.js). Pure.
 */
export function resolvedAt(distM, pxAngle, P = RING_PARTICLES) {
  const rc = Math.max(0.3 * distM * pxAngle, P.rMinM);
  return Math.min(1, Math.max(0, Math.log(P.rMaxM / rc) / Math.log(P.rMaxM / P.rFloorM)));
}

/** The particles' fade with distance from the camera, 1 near and 0 at `reachM`. Pure. */
export function grainFade(distM, reachM, P = RING_PARTICLES) {
  if (!(reachM > 0)) return 0;
  const a = reachM * P.fadeFrom;
  const x = Math.min(1, Math.max(0, (distM - a) / (reachM - a)));
  return 1 - x * x * (3 - 2 * x);
}

/**
 * The slab's light as RING_FRAG works it (scene/worlds.js), without the phase: Chandrasekhar's thin
 * slab, normalised so a thick slab under an overhead Sun is 1. Pure.
 */
export function slabLight(tau, mu0, mu, sameSide) {
  const m0 = Math.max(mu0, 0.02);
  const m = Math.max(mu, 0.02);
  if (sameSide) return (2 * m0 / (m0 + m)) * (1 - Math.exp(-tau * (1 / m0 + 1 / m)));
  if (Math.abs(m - m0) < 1e-4) return (2 * tau / m0) * Math.exp(-tau / m0);
  return (2 * m0 / (m - m0)) * (Math.exp(-tau / m) - Math.exp(-tau / m0));
}

/** Seeded uniform numbers in [0, 1) (mulberry32). */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** `n` radii drawn from n(r) ~ r^-3 between rMinM and rMaxM, by the inverse of its distribution. Pure. */
export function particleRadii(n, seed = 7, P = RING_PARTICLES) {
  const r = rng(seed);
  const a = P.rMinM ** -2;
  const b = P.rMaxM ** -2;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = (a - r() * (a - b)) ** -0.5;
  return out;
}

/** Slots a tile holds: enough for tauMax over the tile. */
export function perTile(P = RING_PARTICLES) {
  return Math.ceil(keptPerSquareMetre(P.tauMax, P) * P.tileM * P.tileM);
}

const VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec4 aGrain;      // x, y in the tile (m), height in the slab (m), radius (m)
attribute float aRank;      // 0..1: kept where under the local optical depth's share
attribute vec3 aTile;       // the tile's corner from the patch origin (m), and its seed
uniform float uMetre;       // scene units a metre (the matrix carries it; kept for tests)
uniform float uPx;          // drawing-buffer pixels per radian of view, at the centre
uniform vec4  uPatch;       // the patch origin's radius (planet radii), the planet's radius (m), the reach (m), the fade's start (m)
uniform vec2  uRadial;      // the outward direction in the patch's x, y
uniform vec4  uWake;        // the wakes: direction in x, y; wavenumber (rad a metre); phase at the origin
uniform float uWakeAmp;     // 0 outside the A ring
uniform vec3  uCam;         // the camera in the patch's axes (m)
uniform vec3  uSunP;        // the Sun's direction in the patch's axes
uniform vec3  uSunV;        // and in view axes
uniform float uLight;       // the ring map's exposure and colour gain, and the globe's shadow
uniform sampler2D uMap;
uniform float uHasMap;
uniform float uOpacity;
uniform vec2  uRingRadii;
uniform vec4  uRingWarp;
uniform sampler2D uFineMap;
uniform float uFine;
uniform float uTauMax;
varying vec3  vColour;
varying float vSizePx;
varying float vKeep;
varying float vPhase;
#RING_U_GLSL#
float hash1( float n ) { return fract( sin( n ) * 43758.5453123 ); }
void main() {
  // A tile turned a quarter, a half or three quarters and shifted, by its seed: no two neighbours alike.
  float s = aTile.z;
  float turn = floor( hash1( s * 1.7 + 0.3 ) * 4.0 ) * 1.5707963;
  vec2 c = vec2( cos( turn ), sin( turn ) );
  vec2 inTile = aGrain.xy - ${RING_PARTICLES.tileM.toFixed(1)} * 0.5;
  inTile = vec2( c.x * inTile.x - c.y * inTile.y, c.y * inTile.x + c.x * inTile.y ) + ${RING_PARTICLES.tileM.toFixed(1)} * 0.5;
  vec3 p = vec3( aTile.xy + inTile, aGrain.z );
  float rank = fract( aRank + hash1( s ) );
  // The optical depth here, as the sheet reads it.
  float rRad = uPatch.x + dot( p.xy, uRadial ) / uPatch.y;
  vec4 ringTex = mix( vec4( 1.0 ), texture2D( uMap, vec2( ringMapU( rRad ), 0.5 ) ), uHasMap );
  float alpha = ringTex.a * uOpacity;
  float tau = -log( 1.0 - clamp( alpha, 0.0, 0.999 ) );
  if ( uFine > 0.0 ) tau *= 1.0 + uFine * ( texture2D( uFineMap, vec2( ( rRad - uRingRadii.x ) / ( uRingRadii.y - uRingRadii.x ), 0.5 ) ).r * #FINE_MAX# - 1.0 );
  if ( rRad < uRingRadii.x || rRad > uRingRadii.y ) tau = 0.0;
  // The wakes: more particles in the crests, fewer between (illustrative).
  float wake = 1.0 + uWakeAmp * cos( dot( p.xy, uWake.xy ) * uWake.z + uWake.w );
  float keepTau = min( tau, uTauMax );
  vKeep = rank * uTauMax < keepTau * wake ? 1.0 : 0.0;
  vec3 toCam = uCam - p;
  float dist = length( toCam );
  float fade = 1.0 - smoothstep( uPatch.w, uPatch.z, length( p.xy - uCam.xy ) );
  vec4 mv = modelViewMatrix * vec4( p, 1.0 );
  float size = 2.0 * aGrain.w * uPx / max( dist, 1.0 );
  vSizePx = size;
  if ( vKeep < 0.5 || fade <= 0.0 || size < 0.6 ) {
    gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 );   // outside the clip volume: not drawn
    gl_PointSize = 0.0;
    vColour = vec3( 0.0 );
    return;
  }
  // Each kept particle's share of the light the sheet gave up here (resolvedShare). Per pixel the
  // kept balls cover share x tau / mu of it (tau the kept optical depth, mu the view's slant) and
  // each is a Lambert ball, its mean the phase law the sheet uses; so a ball's colour is the sheet's
  // light S x mu / tau, and the sum over a pixel is the share of S the sheet gave up.
  float mu0 = max( abs( uSunP.z ), 0.02 );
  float mu = max( abs( toCam.z ) / dist, 0.02 );
  float S = uSunP.z * toCam.z >= 0.0
    ? 2.0 * mu0 / ( mu0 + mu ) * ( 1.0 - exp( -tau * ( 1.0 / mu0 + 1.0 / mu ) ) )
    : 2.0 * mu0 / max( abs( mu - mu0 ), 1e-3 ) * abs( exp( -tau / mu ) - exp( -tau / mu0 ) );
  // Deeper in the slab from the Sun's side, more of the sunlight is taken by the particles above.
  float depth = clamp( 0.5 - sign( uSunP.z ) * aGrain.z / ${RING_PARTICLES.thicknessM.toFixed(1)}, 0.0, 1.0 );
  float under = exp( -tau * depth / mu0 ) / max( ( 1.0 - exp( -tau / mu0 ) ) * mu0 / max( tau, 1e-3 ), 0.05 );
  float cosA = dot( uSunP, toCam / dist );
  float a = acos( clamp( cosA, -1.0, 1.0 ) );
  vPhase = ( sin( a ) + ( PI - a ) * cos( a ) ) / PI;
  vColour = ringTex.rgb * uLight * fade * S * mu / max( keepTau, 1e-3 ) * min( under, 3.0 );
  gl_Position = projectionMatrix * mv;
  gl_PointSize = clamp( size, 1.0, ${RING_PARTICLES.maxPx.toFixed(1)} );
  #include <logdepthbuf_vertex>
}
`;

const FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uSunV;
varying vec3  vColour;
varying float vSizePx;
varying float vKeep;
varying float vPhase;
void main() {
  #include <logdepthbuf_fragment>
  if ( vKeep < 0.5 ) discard;
  vec2 pc = gl_PointCoord * 2.0 - 1.0;
  float r2 = dot( pc, pc );
  float shown = max( vSizePx, 1.0 );
  // The ball's edge, a pixel soft: crisp, not jagged.
  float edge = 1.0 - smoothstep( 1.0 - 2.0 / shown, 1.0, sqrt( r2 ) );
  if ( edge <= 0.0 ) discard;
  vec3 n = vec3( pc.x, -pc.y, sqrt( max( 1.0 - r2, 0.0 ) ) );
  // A Lambert ball: lit from the Sun's side, its night side dark. Under two pixels it is its mean.
  float lit = vSizePx < 2.0 ? vPhase : 1.5 * max( dot( n, uSunV ), 0.0 );
  // A ball under a pixel lights the share of the pixel it covers.
  float cover = min( vSizePx * vSizePx, 1.0 );
  gl_FragColor = vec4( vColour * lit * edge * cover, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The particles. `ringUniforms` is the sheet's material's uniforms (its map, fine strip and warp are
 * read from them every frame, so a strip that arrives later is used). Returns the Points and an update.
 */
export function createRingGrains(THREE, { root, ringUniforms, ringGlsl, fineMax }) {
  const P = RING_PARTICLES;
  const n = perTile(P);
  const radii = particleRadii(n, 11);
  const r = rng(29);
  const grain = new Float32Array(n * 4);
  const rank = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    grain[i * 4] = r() * P.tileM;
    grain[i * 4 + 1] = r() * P.tileM;
    grain[i * 4 + 2] = (r() - 0.5) * P.thicknessM;
    grain[i * 4 + 3] = radii[i];
    rank[i] = r();
  }
  const geo = new THREE.InstancedBufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  geo.setAttribute('aGrain', new THREE.BufferAttribute(grain, 4));
  geo.setAttribute('aRank', new THREE.BufferAttribute(rank, 1));
  const maxSide = 2 * Math.ceil(P.reach[P.reach.length - 1] / P.tileM) + 2;
  const tiles = new Float32Array(maxSide * maxSide * 3);
  const tileAttr = new THREE.InstancedBufferAttribute(tiles, 3);
  tileAttr.setUsage(THREE.DynamicDrawUsage);
  geo.setAttribute('aTile', tileAttr);
  geo.instanceCount = 0;
  const u = {
    uMetre: { value: 1 },
    uPx: { value: 1000 },
    uPatch: { value: new THREE.Vector4(2, 6e7, 1000, 600) },
    uRadial: { value: new THREE.Vector2(1, 0) },
    uWake: { value: new THREE.Vector4(1, 0, 0, 0) },
    uWakeAmp: { value: 0 },
    uCam: { value: new THREE.Vector3() },
    uSunP: { value: new THREE.Vector3(0, 0, 1) },
    uSunV: { value: new THREE.Vector3(0, 0, 1) },
    uLight: { value: 1 },
    uTauMax: { value: P.tauMax },
    uMap: ringUniforms.uMap,
    uHasMap: ringUniforms.uHasMap,
    uOpacity: ringUniforms.uOpacity,
    uRingRadii: ringUniforms.uRingRadii,
    uRingWarp: ringUniforms.uRingWarp,
    uFineMap: ringUniforms.uFineMap,
    uFine: ringUniforms.uFine,
  };
  const material = new THREE.ShaderMaterial({
    name: 'ring-grains',
    vertexShader: VERT.replace('#RING_U_GLSL#', ringGlsl).replace('#FINE_MAX#', Number(fineMax || 4).toFixed(1)),
    fragmentShader: FRAG,
    uniforms: u,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geo, material);
  points.name = 'ring-grains';
  points.frustumCulled = false;
  points.renderOrder = 2;   // after the sheet, which gives up the light they add
  points.visible = false;
  points.matrixAutoUpdate = false;
  const _buf = new THREE.Vector2();
  points.onBeforeRender = (renderer, scene, camera) => {
    renderer.getDrawingBufferSize(_buf);
    u.uPx.value = _buf.y / (2 * Math.tan(((camera.fov || 45) * Math.PI) / 360));
    if (ringUniforms.uResolvedPx) ringUniforms.uResolvedPx.value = 1 / u.uPx.value;
  };
  if (root) root.add(points);

  const stats = { on: false, tiles: 0, slots: 0, reachM: 0, heightM: 0, wakes: false };
  const _o = new THREE.Vector3();
  const _x = new THREE.Vector3();
  const _y = new THREE.Vector3();
  const _z = new THREE.Vector3();
  /**
   * state: { on, tier, ring (the sheet's mesh: its matrixWorld maps planet radii in its plane, z the
   * normal, to the scene), planetM (the planet's radius in metres), cam ([x, y, z] in the ring's axes,
   * planet radii, from doubles), sun ([x, y, z] unit, ring axes), sunView (THREE.Vector3, view axes),
   * light (the sheet's exposure times the globe's shadow here) }
   */
  function update(s) {
    const reach = s && s.on ? P.reach[Math.min(s.tier, P.reach.length - 1)] || 0 : 0;
    stats.on = reach > 0;
    points.visible = stats.on;
    // The sheet gives up the drawn particles' light where they are (scene/worlds.js RING_FRAG uResolved).
    if (ringUniforms.uResolved) ringUniforms.uResolved.value.x = stats.on ? 1 : 0;
    if (!stats.on) { geo.instanceCount = 0; return { ...stats }; }
    const R = s.planetM;
    // The camera over the ring plane in metres, and the patch's origin: the corner of its tile.
    const X = s.cam[0] * R;
    const Y = s.cam[1] * R;
    const tx = Math.floor(X / P.tileM);
    const ty = Math.floor(Y / P.tileM);
    const ox = tx * P.tileM;
    const oy = ty * P.tileM;
    const e = s.ring.matrixWorld.elements;
    _x.set(e[0], e[1], e[2]);
    _y.set(e[4], e[5], e[6]);
    _z.set(e[8], e[9], e[10]);
    const k = _x.length() / R;       // scene units a metre
    _x.normalize(); _y.normalize(); _z.normalize();
    _o.set(ox / R, oy / R, 0).applyMatrix4(s.ring.matrixWorld);
    points.matrix.set(_x.x * k, _y.x * k, _z.x * k, _o.x,
      _x.y * k, _y.y * k, _z.y * k, _o.y,
      _x.z * k, _y.z * k, _z.z * k, _o.z,
      0, 0, 0, 1);
    points.matrixWorldNeedsUpdate = true;   // its parent is the worlds' root, which never moves
    const cam = [X - ox, Y - oy, s.cam[2] * R];
    const side = Math.ceil(reach / P.tileM);
    let count = 0;
    for (let j = -side; j <= side; j++) {
      for (let i = -side; i <= side; i++) {
        const x0 = i * P.tileM;
        const y0 = j * P.tileM;
        const dx = Math.max(x0 - cam[0], 0, cam[0] - (x0 + P.tileM));
        const dy = Math.max(y0 - cam[1], 0, cam[1] - (y0 + P.tileM));
        if (dx * dx + dy * dy > reach * reach) continue;
        tiles[count * 3] = x0;
        tiles[count * 3 + 1] = y0;
        // The seed: the tile's own place in the ring, so it is the same tile however it is reached.
        tiles[count * 3 + 2] = (((tx + i) * 92821 + (ty + j) * 68917) % 100003 + 100003) % 100003;
        count++;
      }
    }
    tileAttr.needsUpdate = true;
    geo.instanceCount = count;
    const rO = Math.hypot(ox, oy);
    const radial = [ox / rO, oy / rO];
    u.uMetre.value = k;
    u.uPatch.value.set(rO / R, R, reach, reach * P.fadeFrom);
    if (ringUniforms.uResolved) ringUniforms.uResolved.value.set(1, R, reach, reach * P.fadeFrom);
    u.uRadial.value.set(radial[0], radial[1]);
    u.uCam.value.set(cam[0], cam[1], cam[2]);
    u.uSunP.value.set(s.sun[0], s.sun[1], s.sun[2]);
    u.uSunV.value.copy(s.sunView);
    u.uLight.value = s.light;
    // The wakes (illustrative): crests `cant` off the direction of orbit. Their phase is a function of
    // the place in the ring (radius, and arc along a fixed radius refM), worked out here in doubles at
    // the origin and carried on linearly across the patch, so they stay put as the camera moves.
    const c = (P.wakes.cantDeg * Math.PI) / 180;
    const az = [-radial[1], radial[0]];
    const kv = [radial[0] * Math.cos(c) - az[0] * Math.sin(c), radial[1] * Math.cos(c) - az[1] * Math.sin(c)];
    const kn = (2 * Math.PI) / P.wakes.lambdaM;
    const arc = P.wakes.refM * Math.atan2(oy, ox);
    const phase = ((rO * Math.cos(c) - arc * Math.sin(c)) % P.wakes.lambdaM) * kn;
    u.uWake.value.set(kv[0], kv[1], kn, phase);
    const rKm = rO / 1000;
    const inA = rKm >= P.wakes.fromKm && rKm <= P.wakes.toKm;
    u.uWakeAmp.value = inA ? P.wakes.amp : 0;
    stats.tiles = count;
    stats.slots = count * n;
    stats.reachM = reach;
    stats.heightM = Math.abs(cam[2]);
    stats.ringKm = Math.round(rKm);
    stats.wakes = inA;
    return { ...stats };
  }

  // The camera over the ring, the Sun in the ring's axes and the view's, and the globe's shadow on the
  // patch (as RING_FRAG works it for the sheet). `a` null: off. scene/worlds.js stepRingGrains calls it.
  const _c = new THREE.Vector3();
  const _inv = new THREE.Matrix4();
  const _s = new THREE.Vector3();
  const _v = new THREE.Vector3();
  function step(a) {
    if (!a) return update(null);
    const { w, ring, camera } = a;
    ring.updateWorldMatrix(true, false);
    camera.getWorldPosition(_c).applyMatrix4(_inv.copy(ring.matrixWorld).invert());
    const planetM = w.radiusKm * 1000;
    const ru = ring.material.uniforms.uRingRadii.value;
    const r = Math.hypot(_c.x, _c.y);
    if (!(Math.abs(_c.z) * planetM < P.fromM && r > ru.x && r < ru.y)) return update(null);
    const sunW = ring.material.uniforms.uSunDir.value;
    _s.copy(sunW).transformDirection(_inv);
    const g = a.oblate || { eq: 1, pol: 1 };
    const gx = _c.x / g.eq;
    const gy = _c.y / g.eq;
    const gs = new THREE.Vector3(_s.x / g.eq, _s.y / g.eq, _s.z / g.pol).normalize();
    const b = gx * gs.x + gy * gs.y;
    const closest = Math.sqrt(Math.max(gx * gx + gy * gy - b * b, 0));
    const shade = b < 0 ? Math.min(1, Math.max(0, (closest - 0.98) / 0.04)) : 1;
    const c = ring.material.uniforms.uColour.value;
    _v.copy(sunW).transformDirection(camera.matrixWorldInverse);
    return update({ on: true, tier: a.tier, ring, planetM, cam: [_c.x, _c.y, _c.z], sun: [_s.x, _s.y, _s.z], sunView: _v, light: ((c.r + c.g + c.b) / 3) * shade });
  }

  function dispose() {
    if (ringUniforms.uResolved) ringUniforms.uResolved.value.x = 0;
    if (points.parent) points.parent.remove(points);
    geo.dispose();
    material.dispose();
  }
  return { points, update, step, dispose, stats: () => ({ ...stats, perTile: n }) };
}
