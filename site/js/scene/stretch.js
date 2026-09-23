// scene/stretch.js -- the star-stretch both star draws share (spec 0034 requirement 2).
//
// Exports: STRETCH_PX, STRETCH_VERT_HEAD, STRETCH_VERT, STRETCH_FRAG_HEAD, STRETCH_FRAG,
//          stretchUniforms(), writeStretch(uniforms, k, dir)
//
// A LADDER FLIGHT CROSSES LIGHT-YEARS IN SIX SECONDS, and until 2026-09-23 nothing on screen said
// so but the numbers: the stars sat still as points while the camera went from the Sun to Proxima.
// While the camera flies on a rung of the ladder each star is drawn as a short capsule along the
// line its image is moving on -- the screen projection of the camera's velocity at that star --
// up to STRETCH_PX long at full strength. The line runs through the point the camera is heading
// for, so the streaks open out from it: the planetarium's "warp", from the real direction of
// travel, on the real stars. It is geometry in the vertex shader and a distance-to-segment in the
// fragment shader; there is no post-processing pass (tests/test_contract.mjs refuses one).
//
// WHY A MODULE OF ITS OWN: scene/stars3d.js imports scene/starfield.js (the colour curve), so
// starfield.js cannot import the constant back from stars3d.js without a cycle whose template
// strings would read it before it exists. Both import it from here; stars3d.js re-exports it.
//
// AT uStretch == 0 THE PICTURE IS TODAY'S TO THE PIXEL. The vertex branch costs one comparison and
// sets a zero-length segment and a scale of one, and the fragment's distance to a zero-length
// segment is the distance to the centre it always was.

import * as THREE from '../../vendor/three.module.min.js';

// The longest a star is drawn, in CSS pixels, at uStretch = 1 (docs/design-language.md, "Cinematic
// language (0034)"). Twelve is long enough to read as motion at a glance and short enough that the
// constellations are still the constellations.
export const STRETCH_PX = 12;

export const STRETCH_VERT_HEAD = /* glsl */ `
#define STRETCH_PX ${STRETCH_PX.toFixed(1)}
uniform float uStretch;
uniform vec3 uVelocityDir;
varying vec2 vStretch;
varying float vStretchScale;
`;

// Reads `mv` (the view-space position) and `sizePx` (the point's size in device pixels without
// the stretch); writes gl_PointSize, vStretch and vStretchScale.
//
// The direction: a point at view-space p moving along view-space v projects to x/z, y/z, whose
// rate of change is (v.x z - p.x v.z, v.y z - p.y v.z) / z^2. The projection's x and y scales cancel
// in pixels (P00 W = P11 H), so the screen direction needs neither the matrix nor the aspect, and
// it is exact for every star however far: no `position + v * epsilon` that float32 would round
// away at a million units.
export const STRETCH_VERT = /* glsl */ `
  if ( uStretch > 0.0 ) {
    vec3 v = ( viewMatrix * vec4( uVelocityDir, 0.0 ) ).xyz;
    vec2 dir = vec2( v.x * mv.z - mv.x * v.z, v.y * mv.z - mv.y * v.z );
    float len = length( dir );
    float lenPx = len > 1e-20 ? uStretch * STRETCH_PX * uPixelRatio : 0.0;
    float total = sizePx + lenPx;
    gl_PointSize = total;
    // Half the segment, in gl_PointCoord units of the enlarged sprite.
    vStretch = len > 1e-20 ? ( dir / len ) * ( 0.5 * lenPx / total ) : vec2( 0.0 );
    vStretchScale = total / max( sizePx, 1e-3 );
  } else {
    gl_PointSize = sizePx;
    vStretch = vec2( 0.0 );
    vStretchScale = 1.0;
  }
`;

export const STRETCH_FRAG_HEAD = /* glsl */ `
varying vec2 vStretch;
varying float vStretchScale;
`;

// Writes `d`: the distance from this fragment to the star's segment, in the units the unstretched
// disc was drawn in (0.5 = the sprite's edge), and `taper`, which thins a streak towards its ends
// so it reads as a star in motion rather than a dash, and spends some of the star's light over its
// length: a faint star's streak fades by the square root of how much longer than the star it is.
// Measured 2026-09-23 on the Sun-to-Proxima flight without that: 109 389 streaks of equal strength
// read as rain on a window, not as stars going past; with it the bright stars carry the motion and
// the faint ones stay a texture. gl_PointCoord's y runs down the screen and the direction was
// worked out with y up, hence the flip.
export const STRETCH_FRAG = /* glsl */ `
  vec2 pc = gl_PointCoord - vec2( 0.5 );
  pc.y = -pc.y;
  float segLen2 = dot( vStretch, vStretch );
  float along = segLen2 > 0.0 ? clamp( dot( pc, vStretch ) / segLen2, -1.0, 1.0 ) : 0.0;
  float d = length( pc - vStretch * along ) * vStretchScale;
  float taper = ( 1.0 - 0.45 * along * along ) * inversesqrt( vStretchScale );
`;

export function stretchUniforms() {
  return {
    uStretch: { value: 0 },
    uVelocityDir: { value: new THREE.Vector3(0, 0, -1) },
  };
}

/**
 * Write the stretch into a uniforms object: `k` clamped to 0..1, `dir` a direction in scene axes
 * (normalised here). A missing or zero direction is no stretch at all -- there is nothing to
 * stretch along.
 */
export function writeStretch(uniforms, k, dir) {
  if (!uniforms || !uniforms.uStretch) return 0;
  let s = Math.min(1, Math.max(0, Number(k) || 0));
  const x = dir ? Number(dir.x) : 0;
  const y = dir ? Number(dir.y) : 0;
  const z = dir ? Number(dir.z) : 0;
  const n = Math.hypot(x, y, z);
  if (!(n > 1e-12) || !Number.isFinite(n)) s = 0;
  uniforms.uStretch.value = s;
  if (s > 0) {
    uniforms.uVelocityDir.value.set(x / n, y / n, z / n);
  }
  return s;
}
