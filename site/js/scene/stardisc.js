// scene/stardisc.js -- a star as a place: a disc of its own size and colour once the camera is near
// enough to see one (public #436).
//
// Contract: createStarDisc(scene) -> { set(record | null, physical | null), update(camera, renderer),
//             state(), dispose(), mesh }
//   physical: { radiusKm, teffK, how }   scene/stars3d.js starPhysical() or the Exoplanet Archive's row
// Pure, for tests/test_stardisc.mjs: limbDarkening(mu), discOpacity(radiusPx), HIDE_POINT_PX
//
// WHY. On the stellar rung a star was a point at any distance: fly to Sirius and the camera parked
// 0.4 light-years off a dot. A star is a ball of gas with a width, and that width is known (or can
// be worked out, which the card says): Sirius is 1.7 Suns across, Betelgeuse several hundred. So
// the selected star, and the host of a selected planet, is drawn as what it is: a sphere of its
// radius at its measured place, in the colour of its temperature, darker toward the limb as every
// star is. main.js flies to twelve radii, where it is a disc a fifth of the screen wide.
//
// WHAT IS MEASURED AND WHAT IS NOT. The place is the catalogue's. The colour is the black-body
// colour of its temperature, the path every star takes (scene/starfield.js). The radius is the
// Archive's for a planet's host; for a catalogue star it is WORKED OUT from its brightness and
// colour (scene/stars3d.js starPhysical), which the card prints as "estimated". The limb darkening
// is the Sun's (a linear law, u = 0.6 in visible light): a model, the same for every star here.
// There is no surface: no spots, no granules, nothing anybody has seen. A star other than the Sun
// has never been photographed as more than a few pixels, and this draws no more than that.
//
// NOTHING AT BOOT: main.js imports this the first time a star or a planet of another star is
// selected. One quad, one draw call, no texture.
//
// PRECISION. On the stellar rung one unit is a light-year and Sirius is 1.3e-7 units across, 8.6
// units from the origin: far below what a float32 vertex can hold. So the quad's corners are built
// in VIEW space, from the model-view matrix three.js multiplies in double precision on the CPU:
// the centre is (camera to star), a small number, and the corners are added to it there. The depth
// is written as zero (the depth test is off) because the star is nearer than the near plane.

import * as THREE from '../../vendor/three.module.min.js';
import { stage } from './stage.js';
import { kelvinToRgb } from './starfield.js';

const SUN_INERTIAL = 'sun-inertial';
// The quad reaches this many radii out: the disc, and a glow that is gone by the edge.
const EXTENT = 3.0;
// Under this many pixels of radius the star is its point (scene/stars3d.js); the disc fades in above.
const SHOW_FROM_PX = 1.5;
const SHOW_FULL_PX = 4;
/** From this radius on screen the catalogue's point for the same star is switched off. */
export const HIDE_POINT_PX = 3;

/** The Sun's limb darkening in visible light, linear law: 1 at the centre, 0.4 at the edge. Pure. */
export function limbDarkening(mu) {
  return 1 - 0.6 * (1 - Math.max(0, Math.min(1, mu)));
}

/** How much of the disc is drawn at a radius on screen: nothing while it would be a speck. Pure. */
export function discOpacity(radiusPx) {
  const k = Math.max(0, Math.min(1, (radiusPx - SHOW_FROM_PX) / (SHOW_FULL_PX - SHOW_FROM_PX)));
  return k * k * (3 - 2 * k);
}

const VERT = /* glsl */ `
uniform float uSize;
varying vec2 vP;
void main() {
  vP = position.xy * ${EXTENT.toFixed(1)};
  vec4 mv = modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0);
  mv.xy += position.xy * uSize;
  gl_Position = projectionMatrix * mv;
  gl_Position.z = 0.0;
}
`;
const FRAG = /* glsl */ `
uniform vec3 uColour;
uniform float uOpacity;
varying vec2 vP;
void main() {
  float r = length(vP);
  float px = fwidth(r) * 1.5;
  float cover = 1.0 - smoothstep(1.0 - px, 1.0, r);
  float mu = sqrt(max(0.0, 1.0 - r * r));
  // Limb darkening, and the limb a little redder than the centre, as cooler gas is.
  vec3 disc = uColour * (1.0 - 0.6 * (1.0 - mu)) * mix(vec3(1.0, 0.86, 0.72), vec3(1.0), mu);
  // The glow: light scattered in the eye or the lens, not a corona anybody measured.
  float glow = 0.22 * exp(-3.2 * max(0.0, r - 1.0)) * (1.0 - smoothstep(${(EXTENT - 0.6).toFixed(1)}, ${EXTENT.toFixed(1)}, r));
  vec3 col = disc * cover + uColour * glow * (1.0 - cover);
  float a = max(cover, glow * 0.0);
  if (cover <= 0.002 && glow <= 0.002) discard;
  // Premultiplied: the disc hides the stars behind it, the glow is added to them.
  gl_FragColor = vec4(col * uOpacity, a * uOpacity);
  #include <colorspace_fragment>
}
`;

export function createStarDisc(scene) {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERT, fragmentShader: FRAG,
    uniforms: { uSize: { value: 0 }, uColour: { value: new THREE.Color(1, 1, 1) }, uOpacity: { value: 0 } },
    transparent: true, depthTest: false, depthWrite: false, toneMapped: false, side: THREE.DoubleSide,
    blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.name = 'star-disc';
  mesh.frustumCulled = false;
  // Over the marks of things far behind it (the glyph layers): twelve radii out nothing is in front of a star.
  mesh.renderOrder = 60;
  mesh.visible = false;
  if (scene) scene.add(mesh);

  let record = null;
  let physical = null;
  let radiusUnits = 0;
  let radiusPx = 0;
  let placedFor = '';
  const _v = new THREE.Vector3();

  function place() {
    const key = `${record ? record.id : ''}:${stage.worldId}`;
    if (key === placedFor) return;
    placedFor = key;
    radiusUnits = 0;
    if (!record || !physical || !record.pos || stage.worldId !== 'stellar') return;
    if (!stage.toSceneInto(record.pos, record.frame || SUN_INERTIAL, _v, stage.tMs)) return;
    mesh.position.copy(_v);
    mesh.updateMatrixWorld(true);
    radiusUnits = physical.radiusKm / stage.unitKm;
    const rgb = kelvinToRgb(physical.teffK);
    material.uniforms.uColour.value.setRGB(rgb[0], rgb[1], rgb[2], THREE.SRGBColorSpace);
    material.uniforms.uSize.value = radiusUnits * EXTENT;
  }

  return {
    mesh,
    /** The selected star (or the star a selected planet goes round), or null. */
    set(next, phys) {
      record = next && phys && phys.radiusKm > 0 ? next : null;
      physical = record ? phys : null;
      placedFor = '';
      if (!record) { mesh.visible = false; radiusPx = 0; }
    },
    update(camera, renderer) {
      radiusPx = 0;
      if (!record) { mesh.visible = false; return; }
      place();
      if (!(radiusUnits > 0)) { mesh.visible = false; return; }
      const d = _v.copy(mesh.position).sub(camera.position).length();
      const h = renderer && renderer.domElement ? (renderer.domElement.clientHeight || 800) : 800;
      radiusPx = d > 0 ? (radiusUnits / d) * camera.projectionMatrix.elements[5] * 0.5 * h : 0;
      const k = d > radiusUnits * 1.05 ? discOpacity(radiusPx) : 0; // and never from inside it
      material.uniforms.uOpacity.value = k;
      mesh.visible = k > 0.003;
    },
    /** Radius on screen in pixels: main.js switches the catalogue's point off past HIDE_POINT_PX. */
    radiusPx: () => radiusPx,
    state: () => ({ id: record ? record.id : null, radiusKm: physical ? physical.radiusKm : null, teffK: physical ? physical.teffK : null, how: physical ? physical.how : null, radiusPx, drawn: mesh.visible, opacity: material.uniforms.uOpacity.value }),
    dispose() {
      if (scene) scene.remove(mesh);
      mesh.geometry.dispose();
      material.dispose();
    },
  };
}
