// scene/deep/softpoints.js -- one draw call of soft, additive points with an optional Doppler boost, shared by the
// objects built from published geometry that are made of light more than of surface: the Vela pulsar wind nebula
// (scene/deep/vela.js) and the Cat's Eye (scene/deep/catseye.js). Fetched with them; never at boot.
//
//   pointsMesh(THREE, set, { name, minPx }) -> { mesh, material, geometry, count }
//     set: { pos[3n] (light-years about the object), vel[3n] (the flow's direction, unit), size[n] (ly), beta[n] (the flow's
//            speed in units of c, 0 = no boost), amp[n], col[3n] (display colour) }
//   uniforms the caller sets each frame: uShare, uGain, uViewH, uCam (the camera in the points' own frame), uIndex
//
// A point is a square facing the camera, as wide as its size and never under `minPx` pixels (its light is kept: a point
// too small to see dims by the difference). The boost is Ng & Romani's: (1 - n.beta)^-(1+Gamma), n the direction to the
// camera (scene/deep/crab.js uses the same factor). gasmat.js COLOUR_POLICY: display values, additive, no depth write.
export const SOFT_VERT = /* glsl */ `
attribute vec3 iPos;
attribute vec3 iVel;
attribute vec4 iLook;     // x: size, ly; y: the flow's speed (of light's); z: brightness; w: unused
attribute vec3 iCol;
uniform vec3 uCam;
uniform float uViewH;
uniform float uMinPx;
uniform float uIndex;     // 1 + the photon index
uniform float uMono;      // 1: every colour to its own grey (the Measured look, where the colours are illustrative)
varying vec2 vQ;
varying vec3 vCol;
void main() {
  vec4 mv = modelViewMatrix * vec4( iPos, 1.0 );
  float unit = length( ( modelViewMatrix * vec4( 1.0, 0.0, 0.0, 0.0 ) ).xyz );
  float pxPerRad = projectionMatrix[ 1 ][ 1 ] * uViewH * 0.5;
  float dist = max( length( mv.xyz ), 1e-20 );
  float px = iLook.x * unit * pxPerRad / dist;
  float usePx = max( px, uMinPx );
  float kept = clamp( ( px * px ) / ( uMinPx * uMinPx ), 0.0, 1.0 );
  mv.xy += position.xy * usePx * dist / pxPerRad;
  gl_Position = projectionMatrix * mv;
  float dop = 1.0;
  if ( iLook.y > 0.0 ) dop = pow( max( 1.0 - dot( normalize( uCam - iPos ), iVel ) * iLook.y, 0.05 ), -uIndex );
  vCol = mix( iCol, vec3( dot( iCol, vec3( 0.3333 ) ) * 1.15 ), uMono ) * iLook.z * dop * kept;
  vQ = position.xy;
}
`;
export const SOFT_FRAG = /* glsl */ `
uniform float uShare;
uniform float uGain;
varying vec2 vQ;
varying vec3 vCol;
void main() {
  float r2 = dot( vQ, vQ );
  if ( uShare <= 0.0 || r2 > 1.0 ) discard;
  gl_FragColor = vec4( vCol * exp( -4.5 * r2 ) * uShare * uGain, 1.0 );   // additive
}
`;
export const SOFT_SHADERS = { vertex: SOFT_VERT, frag: SOFT_FRAG };

/** The Doppler factor the vertex shader applies (for the tests): a flow of speed `beta` at cosine `c` to the eye. Pure. */
export const boostOf = (beta, c, gamma = 1.5) => Math.max(0.05, 1 - c * beta) ** -(1 + gamma);

/** A set's arrays from a list of points, each { p:[x,y,z], v:[x,y,z], size, beta, amp, col:[r,g,b] }. Pure. */
export function packPoints(list) {
  const n = list.length;
  const pos = new Float32Array(n * 3), vel = new Float32Array(n * 3), size = new Float32Array(n), beta = new Float32Array(n), amp = new Float32Array(n), col = new Float32Array(n * 3);
  list.forEach((q, i) => {
    pos.set(q.p, i * 3); vel.set(q.v || [0, 0, 1], i * 3);
    size[i] = q.size; beta[i] = q.beta || 0; amp[i] = q.amp; col.set(q.col, i * 3);
  });
  return { pos, vel, size, beta, amp, col, count: n };
}

export function pointsMesh(THREE, set, { name = 'points', minPx = 1.6 } = {}) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 1, -1, 0, -1, 1, 0, 1, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  const look = new Float32Array(set.count * 4);
  for (let i = 0; i < set.count; i++) { look[i * 4] = set.size[i]; look[i * 4 + 1] = set.beta[i]; look[i * 4 + 2] = set.amp[i]; }
  geometry.setAttribute('iPos', new THREE.InstancedBufferAttribute(set.pos, 3));
  geometry.setAttribute('iVel', new THREE.InstancedBufferAttribute(set.vel, 3));
  geometry.setAttribute('iLook', new THREE.InstancedBufferAttribute(look, 4));
  geometry.setAttribute('iCol', new THREE.InstancedBufferAttribute(set.col, 3));
  geometry.instanceCount = set.count;
  const material = new THREE.ShaderMaterial({
    vertexShader: SOFT_VERT, fragmentShader: SOFT_FRAG, side: THREE.DoubleSide,
    transparent: false, depthTest: false, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending,
    uniforms: { uCam: { value: new THREE.Vector3(0, 0, 50) }, uViewH: { value: 800 }, uMinPx: { value: minPx }, uIndex: { value: 2.5 }, uMono: { value: 0 }, uShare: { value: 0 }, uGain: { value: 1 } },
  });
  material.name = `deep-${name}`;
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `deep-hero-${name}-shells`; // the contract's draw-order check knows a deep mesh by `-shells`
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  return { mesh, material, geometry, count: set.count, bytes: set.pos.byteLength * 2 + set.col.byteLength + look.byteLength };
}

/** A small seeded generator (mulberry32), so the same points on every visit. Pure. */
export function seeded(seed) {
  let a = (seed >>> 0) || 1;
  return () => {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** The camera's place in a group's own frame, from the scene camera (as scene/deep/remnant.js cameraInSky). */
export function cameraIn(group, sky, camera, out, inv, id) {
  if (group.parent) group.parent.updateWorldMatrix(true, false);
  inv.multiplyMatrices(group.parent ? group.parent.matrixWorld : id, group.matrix).multiply(sky.matrix).invert();
  return out.copy(camera.position).applyMatrix4(inv);
}
