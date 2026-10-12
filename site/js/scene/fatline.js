// scene/fatline.js -- a path drawn some pixels wide: one screen-facing quad per segment.
//
// Contract: createFatLine(positions, { colour, opacity, renderOrder }) -> THREE.Mesh with
//   .setCount(points)             how many points of `positions` are the path (0: nothing)
//   .touch()                      `positions` was rewritten
//   .setWidth(px, widthPx, heightPx)   the line's width in device pixels, and the drawing buffer's size
//   .broken(renderer)             true once the renderer has tried the shader and it did not compile
// Pure and exported for the test: segmentCount(points), coveredShare(lengthPx, widthPx, w, h),
// reservedWordsIn(glsl)
//
// WHY (internal #444, #454). THREE.Line is one device pixel wide on every WebGL there is
// (`lineWidth` is ignored), and "A year in a minute" is five such lines on black: 1.1 % of its
// share picture was lit, and on a phone at three device pixels to one the paths were a third of a
// CSS pixel. This draws the SAME points -- `positions` is the caller's own array, shared, not a
// copy -- as quads turned to the screen, so the path is where it was and only its width changed.
// Width is a drawing choice, not a measurement: nothing here moves a point.
//
// Never at boot: scene/orbitrings.js imports it the first time a path is asked for, and draws
// its one-pixel line until this lands (tests/test_boot_diet.mjs holds it out).

import * as THREE from '../../vendor/three.module.min.js';

export const segmentCount = (points) => Math.max(0, Math.floor(points) - 1);
/** The share of a `w` x `h` frame a path `lengthPx` long and `widthPx` wide covers. */
export const coveredShare = (lengthPx, widthPx, w, h) => (lengthPx * widthPx) / (w * h);

const VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 iA;
attribute vec3 iB;
uniform vec2 uResolution;
uniform float uWidth;
varying float vDist;
void main() {
  vec4 a = projectionMatrix * modelViewMatrix * vec4( iA, 1.0 );
  vec4 b = projectionMatrix * modelViewMatrix * vec4( iB, 1.0 );
  // A pixel wider on each side than the line, so the edge can be a coverage ramp one pixel deep:
  // a quad exactly as wide as the line is one pixel wide where it lies on a pixel row and two where
  // it lies between rows, and the path beads (seen in the first frame, 2026-10-09).
  // (The word for one of two equal parts is reserved by the shading language: a variable of that
  // name does not compile, and a path whose shader does not compile is not drawn. Seen 2026-10-09.)
  float reach = uWidth * 0.5 + 1.0;
  vDist = position.y * reach;
  float near = 1e-6;
  if ( a.w <= near && b.w <= near ) { gl_Position = vec4( 2.0, 2.0, 2.0, 1.0 ); return; }
  // One end behind the camera: bring it to the near side along the segment.
  if ( a.w <= near ) a = mix( a, b, ( near - a.w ) / ( b.w - a.w ) );
  if ( b.w <= near ) b = mix( b, a, ( near - b.w ) / ( a.w - b.w ) );
  vec2 d = ( b.xy / b.w - a.xy / a.w ) * uResolution;
  float len = length( d );
  vec2 dir = len > 1e-4 ? d / len : vec2( 1.0, 0.0 );
  vec2 nrm = vec2( -dir.y, dir.x );
  vec4 c = mix( a, b, position.x );
  // Half the width across, and half the width past each end so two segments meet without a notch.
  vec2 px = nrm * vDist + dir * ( position.x * 2.0 - 1.0 ) * uWidth * 0.5;
  c.xy += px / uResolution * 2.0 * c.w;
  gl_Position = c;
  #include <logdepthbuf_vertex>
}
`;
const FRAG = /* glsl */`
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uOpacity;
uniform float uWidth;
varying float vDist;
void main() {
  #include <logdepthbuf_fragment>
  // Coverage: full inside the line, a ramp one pixel deep across its edge.
  float a = uOpacity * clamp( uWidth * 0.5 + 0.5 - abs( vDist ), 0.0, 1.0 );
  if ( a <= 0.003 ) discard;
  gl_FragColor = vec4( uColour, a );
  #include <colorspace_fragment>
}
`;

/**
 * Words the shading language keeps for itself and that read like ordinary names (GLSL ES 3.00,
 * section 3.7, reserved for future use). A declaration that uses one does not compile. Returns the
 * ones `glsl` declares as a variable, for the test that reads both shaders.
 */
const RESERVED = ['half', 'fixed', 'input', 'output', 'filter', 'common', 'partition', 'active', 'sample', 'resource', 'template', 'this', 'packed', 'interface', 'long', 'short', 'double', 'unsigned', 'superp', 'external', 'namespace', 'using', 'cast', 'sizeof', 'union', 'enum', 'typedef', 'class', 'goto', 'inline', 'noinline', 'public', 'static', 'extern', 'volatile', 'asm'];
export function reservedWordsIn(glsl) {
  const found = [];
  for (const m of String(glsl).matchAll(/\b(?:float|int|bool|vec[234]|mat[234])\s+([A-Za-z_]\w*)/g)) if (RESERVED.includes(m[1])) found.push(m[1]);
  return found;
}

export function createFatLine(positions, { colour = 0xffffff, opacity = 1, renderOrder = 0 } = {}) {
  const geometry = new THREE.InstancedBufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, -1, 0, 1, -1, 0, 0, 1, 0, 1, 1, 0]), 3));
  geometry.setIndex([0, 1, 2, 2, 1, 3]);
  // Both ends of segment i are read from the one array: point i and point i + 1.
  const buffer = new THREE.InstancedInterleavedBuffer(positions, 3, 1);
  geometry.setAttribute('iA', new THREE.InterleavedBufferAttribute(buffer, 3, 0));
  geometry.setAttribute('iB', new THREE.InterleavedBufferAttribute(buffer, 3, 3));
  geometry.instanceCount = 0;
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uWidth: { value: 2 },
      uColour: { value: new THREE.Color(colour) },
      uOpacity: { value: opacity },
    },
    transparent: true,
    depthTest: true, // a world in front of its path hides it, as it hid the one-pixel line
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = renderOrder;
  mesh.setCount = (points) => { geometry.instanceCount = segmentCount(points); };
  mesh.touch = () => { buffer.needsUpdate = true; };
  mesh.setWidth = (px, w, h) => { material.uniforms.uWidth.value = px; material.uniforms.uResolution.value.set(w, h); };
  mesh.dispose = () => { geometry.dispose(); material.dispose(); };
  // Did the shader compile? Null until the renderer has tried it (the first frame it is drawn in).
  // three.js keeps the answer with the program when it checks shaders, which it does by default.
  mesh.broken = (renderer) => {
    try {
      const program = renderer && renderer.properties ? renderer.properties.get(material).currentProgram : null;
      const d = program && program.diagnostics;
      return d ? d.runnable === false : null;
    } catch { return null; }
  };
  return mesh;
}
