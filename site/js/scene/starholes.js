// scene/starholes.js -- our stars step aside where a photograph is drawn (internal #344, bulk 3).
//
// WHY. Every nebula picture carries its own stars, so inside one the field showed the photograph's stars AND ours,
// a little apart (the archives' published centres are up to 43 arcminutes off; registry/nebulae.yaml). Starless
// processing would have meant new pictures; hiding OUR stars where the picture is on screen costs a few uniforms.
//
// HOW. scene/nebulae.js says, each frame, where each drawn picture is and how strongly (holesOf there); both star
// shaders (scene/stars3d.js, scene/starfield.js) fade a point whose view-space direction lies within the picture's
// INSCRIBED CIRCLE: fully gone inside 0.70 of its radius, whole again outside 0.95 (the picture's own edge is
// feathered, so the stars come back as its light does). At most MAX_HOLES pictures at once, the strongest; with none
// the loop breaks at once and the shaders are what they were. The circle is inside the rectangle, never outside it,
// so no star is hidden where there is no photograph. ILLUSTRATIVE OF NOTHING: this changes what is drawn, not a
// number the card says.
//
// `holeFactor` is the shader's arithmetic in JS, for tests/test_starholes.mjs.

import * as THREE from '../../vendor/three.module.min.js';

export const MAX_HOLES = 4;
export const INNER = 0.70; // of the picture's inscribed-circle radius: no star of ours inside this
export const OUTER = 0.95; // ...and all of them outside this

/** GLSL for a star vertex shader: the uniforms and `starHole( vec3 viewDir )`, 1 = drawn, 0 = hidden. */
export const HOLES_GLSL_HEAD = /* glsl */ `
uniform vec3 uHoleDir[ ${MAX_HOLES} ];   // each hole's centre, a unit direction from the camera in view space
uniform vec3 uHoleE[ ${MAX_HOLES} ];     // cosine of the outer angle, cosine of the inner angle, strength 0 to 1
uniform int uHoleCount;
float starHole( vec3 d ) {
  float k = 1.0;
  for ( int i = 0; i < ${MAX_HOLES}; i++ ) {
    if ( i >= uHoleCount ) break;
    k *= 1.0 - uHoleE[ i ].z * smoothstep( uHoleE[ i ].x, uHoleE[ i ].y, dot( d, uHoleDir[ i ] ) );
  }
  return k;
}
`;

/** The uniform objects a material adds. */
export function holeUniforms() {
  return {
    uHoleDir: { value: Array.from({ length: MAX_HOLES }, () => new THREE.Vector3(0, 0, 1)) },
    uHoleE: { value: Array.from({ length: MAX_HOLES }, () => new THREE.Vector3(1, 1, 0)) },
    uHoleCount: { value: 0 },
  };
}

/** Writes a list of { dir:[x,y,z], radius (radians), k } into those uniforms. Returns how many holes are set. */
export function setHoles(uniforms, list) {
  const rows = (Array.isArray(list) ? list : []).filter((h) => h && h.k > 0.003 && h.radius > 0).slice(0, MAX_HOLES);
  rows.forEach((h, i) => {
    uniforms.uHoleDir.value[i].set(h.dir[0], h.dir[1], h.dir[2]);
    uniforms.uHoleE.value[i].set(Math.cos(h.radius * OUTER), Math.cos(h.radius * INNER), Math.min(1, h.k));
  });
  uniforms.uHoleCount.value = rows.length;
  return rows.length;
}

/** The shader's starHole() for one view-space unit direction and the list setHoles was given. */
export function holeFactor(dir, list) {
  const rows = (Array.isArray(list) ? list : []).filter((h) => h && h.k > 0.003 && h.radius > 0).slice(0, MAX_HOLES);
  let k = 1;
  const sstep = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  for (const h of rows) {
    const c = dir[0] * h.dir[0] + dir[1] * h.dir[1] + dir[2] * h.dir[2];
    k *= 1 - Math.min(1, h.k) * sstep(Math.cos(h.radius * OUTER), Math.cos(h.radius * INNER), c);
  }
  return k;
}
