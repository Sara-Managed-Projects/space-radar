// scene/cutaway.js -- one shader that opens any world to its layers (forge #144).
//
// Contract: createCut(THREE, mesh, { layers, radiusKm, colours, tint, emissive }) -> { group, update(camPos, sunPos),
//                                   setProbe(share), setHighlight(i), setOpen(u), dispose() }
// Pure, for tests/test_cutaway.mjs: CUT_HALF, MAX_LAYERS, wedgeAzimuth(x, z), inWedge(az, centre, half),
//   layerTops(layers, radiusKm) -> Float32Array of radius shares, layerIndexAt(tops, share)
//
// WHAT IS DRAWN. A quarter of the world is taken away -- the wedge of CUT_HALF either side of the
// direction the camera is in, pole to pole round the world's own axis -- and the two faces it leaves are
// painted with the layers at their measured depths (registry/interiors.yaml through ui/cutaway.js). The
// wedge turns with the camera, so the opening always faces the viewer, as Cosmoscope's does; the world
// under it keeps turning on its own clock.
//
// ONE SHADER FOR EVERY WORLD. CUT_VERT and CUT_FRAG are one program in two modes: the SHELL (uMode 0),
// the world's own surface map lit by the Sun with the wedge discarded, and the FACES (uMode 1), coloured
// by the distance from the centre. three.js compiles the program once for every world and the Sun, since
// the source is the same; a world differs only in uniforms: its map or flat tint, its layer tops and
// colours, whether it shines (the Sun) or is lit. The world's own mesh is not drawn while it is open (its
// layer mask is cleared, ui/cutaway.js), so no world's shader had to learn about the cut.
//
// THE LAYERS ON THE FACE. A face is a half-disc through the axis; at a point on it the distance from the
// centre over the radius is r, and the layer is the deepest one whose top is at or above r. A thin dark
// line marks each boundary, a pixel wide whatever the distance (fwidth), and the depth probe is an ember
// line at its own r. The colours are a choice, by kind (ui/cutaway.js KIND_COLOUR: iron warm, rock
// brown, ice pale, water blue, hydrogen violet, the Sun's zones by heat); the depths are the data's.
//
// AN OBLATE WORLD (Jupiter, Saturn: worlds.js oblateGeometry) is wider at the equator than at the poles;
// the faces take the mesh geometry's own bounding box, so they meet the shell's edge all round.

export const CUT_HALF = Math.PI / 4;
/**
 * How far round from the camera the wedge's middle is turned, radians. Opened straight at the viewer the two
 * faces are seen equally edge-on and their half-circles stack into heart shapes (looked at 2026-11-07); turned
 * a quarter of the wedge away, one face is seen nearly square on and the other at a slant, which reads as a
 * solid cut open.
 */
export const CUT_TURN = 0.45;
export const MAX_LAYERS = 8;

/** The azimuth of a point round the world's axis (+Y), in radians, -PI..PI. Pure. */
export function wedgeAzimuth(x, z) {
  return Math.atan2(z, x);
}

/** Is an azimuth inside the wedge of `half` either side of `centre`? Pure. The shader does this per pixel. */
export function inWedge(az, centre, half = CUT_HALF) {
  let d = (az - centre) % (2 * Math.PI);
  if (d > Math.PI) d -= 2 * Math.PI;
  if (d < -Math.PI) d += 2 * Math.PI;
  return Math.abs(d) < half;
}

/** Each layer's top as a share of the radius (1 at the surface), top down, MAX_LAYERS long. Pure. */
export function layerTops(layers, radiusKm) {
  const out = new Float32Array(MAX_LAYERS).fill(-1);
  const list = Array.isArray(layers) ? layers.slice(0, MAX_LAYERS) : [];
  list.forEach((l, i) => { out[i] = radiusKm > 0 ? 1 - l.top_km / radiusKm : -1; });
  return out;
}

/** The index of the layer a radius share is in: the deepest one whose top is at or above it. Pure. */
export function layerIndexAt(tops, share) {
  let idx = -1;
  for (let i = 0; i < tops.length; i++) if (tops[i] >= 0 && share <= tops[i] + 1e-9) idx = i;
  return idx;
}

export const CUT_VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying vec3 vPosL;
varying vec3 vNormalW;
varying vec3 vFromCamW;
void main() {
  vUv = uv;
  vPosL = position;
  // Camera-relative, for the reason scene/worlds.js WORLD_VERT gives: far out on the Sun's stage a
  // float cannot hold a world's place and its surface at once.
  vec4 mvPos = modelViewMatrix * vec4( position, 1.0 );
  vFromCamW = transpose( mat3( viewMatrix ) ) * mvPos.xyz;
  vNormalW = normalize( mat3( modelMatrix ) * normal );
  gl_Position = projectionMatrix * mvPos;
  #include <logdepthbuf_vertex>
}
`;

export const CUT_FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform int uMode;          // 0 the shell, 1 the faces
uniform sampler2D uMap;
uniform float uHasMap;
uniform vec3 uTint;
uniform float uEmissive;    // 1 for the Sun: it shines, nothing lights it
uniform vec3 uSunDir;       // towards the Sun, world axes
uniform float uCutAz;       // the wedge's centre, radians round +Y in the mesh's own axes
uniform float uHalf;        // half its width; 0 while it is closed
uniform float uTop[${MAX_LAYERS}];
uniform vec3 uCol[${MAX_LAYERS}];
uniform float uProbe;       // the probe's radius share, or -1
uniform float uHi;          // the highlighted layer, or -1
varying vec2 vUv;
varying vec3 vPosL;
varying vec3 vNormalW;
varying vec3 vFromCamW;
void main() {
  #include <logdepthbuf_fragment>
  vec3 n = normalize( vNormalW );
  vec3 colour;
  if ( uMode == 0 ) {
    float az = atan( vPosL.z, vPosL.x );
    float d = abs( mod( az - uCutAz + PI, 2.0 * PI ) - PI );
    if ( d < uHalf ) discard;
    vec3 base = mix( uTint, texture2D( uMap, vUv ).rgb, uHasMap );
    if ( uEmissive > 0.5 ) {
      float mu = clamp( dot( n, normalize( -vFromCamW ) ), 0.0, 1.0 );
      colour = base * ( 0.45 + 0.55 * mu );
    } else {
      colour = base * ( 0.06 + 0.94 * max( dot( n, uSunDir ), 0.0 ) );
    }
  } else {
    float r = length( vPosL );
    vec3 c = uCol[ 0 ];
    float idx = 0.0;
    float edge = 1e3;
    for ( int i = 0; i < ${MAX_LAYERS}; i++ ) {
      if ( uTop[ i ] < 0.0 ) continue;
      if ( r <= uTop[ i ] + 1e-6 ) { c = uCol[ i ]; idx = float( i ); }
      edge = min( edge, abs( r - uTop[ i ] ) );
    }
    float fw = max( fwidth( r ), 1e-5 );
    // Deeper is a little brighter within a layer: the eye reads it as heat, and it parts two layers of
    // one colour family. The faces are lit softly by the Sun so the cut reads as a solid.
    float lit = 0.72 + 0.28 * abs( dot( n, uSunDir ) );
    if ( uEmissive > 0.5 ) lit = 1.0;
    colour = c * lit * ( 0.92 + 0.12 * ( 1.0 - r ) );
    if ( abs( idx - uHi ) < 0.5 ) colour = mix( colour, vec3( 1.0 ), 0.18 );
    colour = mix( colour, colour * 0.35, 1.0 - smoothstep( 0.6 * fw, 1.6 * fw, edge ) );
    if ( uProbe >= 0.0 ) {
      float p = 1.0 - smoothstep( 0.8 * fw, 2.2 * fw, abs( r - uProbe ) );
      colour = mix( colour, vec3( 1.0, 0.62, 0.26 ), p ); // --sr-ember, the probe is the control
    }
  }
  gl_FragColor = vec4( colour, 1.0 );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/** A half-disc through +Y in the plane z = 0, on the +X side, radius 1. Each face of the cut is one, turned. */
function halfDiscGeometry(THREE, segments = 96) {
  const pos = [0, 0, 0];
  const idx = [];
  for (let k = 0; k <= segments; k++) {
    const b = -Math.PI / 2 + (Math.PI * k) / segments;
    pos.push(Math.cos(b), Math.sin(b), 0);
    if (k > 0) idx.push(0, k, k + 1);
  }
  const n = pos.length / 3;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(new Array(n).fill([0, 0, 1]).flat(), 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(new Array(n * 2).fill(0), 2));
  g.setIndex(idx);
  return g;
}

/** The map a world wears now, from whichever material it has (the world shader, the Earth's, a basic one). */
function mapOf(material) {
  const u = material && material.uniforms;
  if (u && u.uDay && u.uDay.value) return u.uDay.value;
  if (u && u.uMap && u.uMap.value && (!u.uHasMap || u.uHasMap.value > 0)) return u.uMap.value;
  if (material && material.map) return material.map;
  return null;
}

/**
 * @param THREE  the vendored three.js
 * @param mesh   the world's mesh (scene/worlds.js meshFor), a unit sphere scaled by its radius
 * @param opts   { layers: [{ top_km }], radiusKm, colours: [hex], tint: hex, emissive: bool }
 */
export function createCut(THREE, mesh, opts = {}) {
  const tops = layerTops(opts.layers, opts.radiusKm);
  const cols = [];
  for (let i = 0; i < MAX_LAYERS; i++) cols.push(new THREE.Color(opts.colours && opts.colours[i] !== undefined ? opts.colours[i] : 0x808080));
  const uniforms = () => ({
    uMode: { value: 0 },
    uMap: { value: null },
    uHasMap: { value: 0 },
    uTint: { value: new THREE.Color(opts.tint !== undefined ? opts.tint : 0xb0b0b0) },
    uEmissive: { value: opts.emissive ? 1 : 0 },
    uSunDir: { value: new THREE.Vector3(1, 0, 0) },
    uCutAz: { value: 0 },
    uHalf: { value: 0 },
    uTop: { value: tops },
    uCol: { value: cols },
    uProbe: { value: -1 },
    uHi: { value: -1 },
  });
  const make = (mode, side) => {
    const m = new THREE.ShaderMaterial({ name: 'world-cutaway', vertexShader: CUT_VERT, fragmentShader: CUT_FRAG, uniforms: uniforms(), side });
    m.uniforms.uMode.value = mode;
    return m;
  };
  const shellMat = make(0, THREE.FrontSide);
  const faceMat = make(1, THREE.DoubleSide);
  const group = new THREE.Group();
  group.name = 'world-cutaway';
  const shell = new THREE.Mesh(mesh.geometry, shellMat);
  shell.name = 'world-cutaway-shell';
  shell.frustumCulled = false;
  const discGeo = halfDiscGeometry(THREE);
  const faces = [0, 1].map((i) => {
    const f = new THREE.Mesh(discGeo, faceMat);
    f.name = `world-cutaway-face-${i}`;
    f.frustumCulled = false;
    return f;
  });
  group.add(shell, ...faces);
  mesh.add(group);

  // The faces fit the shell's own shape: an oblate geometry is wider than it is tall.
  const fit = () => {
    const g = mesh.geometry;
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox;
    for (const f of faces) f.scale.set(b.max.x || 1, b.max.y || 1, b.max.x || 1);
  };
  fit();

  const _cam = new THREE.Vector3();
  const _sun = new THREE.Vector3();
  const _w = new THREE.Vector3();
  let open = 0;

  /** Once a frame while open: the camera's and the Sun's places, world axes. */
  function update(camWorld, sunWorld) {
    if (shell.geometry !== mesh.geometry) { shell.geometry = mesh.geometry; fit(); }
    const map = mapOf(mesh.material);
    shellMat.uniforms.uMap.value = map;
    shellMat.uniforms.uHasMap.value = map ? 1 : 0;
    // The wedge faces the camera: its azimuth in the mesh's own axes.
    mesh.updateMatrixWorld();
    _cam.copy(camWorld);
    mesh.worldToLocal(_cam);
    const az = wedgeAzimuth(_cam.x, _cam.z) + CUT_TURN;
    const half = CUT_HALF * open;
    shellMat.uniforms.uCutAz.value = az;
    shellMat.uniforms.uHalf.value = half;
    // An object turned by `angle` about +Y moves azimuth a to a - angle, so a face at azimuth az +- half
    // is the half-disc (at azimuth 0) turned by -(az +- half). Opening swings them apart from the middle.
    faces[0].rotation.y = -(az + half);
    faces[1].rotation.y = -(az - half);
    for (const f of faces) f.visible = open > 0.01;
    mesh.getWorldPosition(_w);
    _sun.copy(sunWorld).sub(_w);
    if (_sun.lengthSq() > 0) _sun.normalize(); else _sun.set(1, 0, 0);
    shellMat.uniforms.uSunDir.value.copy(_sun);
    faceMat.uniforms.uSunDir.value.copy(_sun);
  }

  return {
    group,
    update,
    setProbe(share) { faceMat.uniforms.uProbe.value = Number.isFinite(share) ? share : -1; },
    setHighlight(i) { faceMat.uniforms.uHi.value = Number.isInteger(i) ? i : -1; },
    /** How far open, 0 shut to 1 a full quarter. */
    setOpen(u) { open = Math.min(1, Math.max(0, Number(u) || 0)); },
    dispose() {
      mesh.remove(group);
      discGeo.dispose();
      shellMat.dispose();
      faceMat.dispose();
    },
  };
}
