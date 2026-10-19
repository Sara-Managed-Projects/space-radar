// scene/traverse.js -- where the rovers drove on the Moon (release 1.2.0 stage W2-a, internal #868).
//
// Contract: createTraverses({ world }) -> { group, frame(camLocal, viewportPx, pixelRatio), state(), credits(), dispose() }
//
// WHAT IS DRAWN. Apollo 15's and Apollo 17's rover traverses, each a line TRACED from the tracks the
// Lunar Reconnaissance Orbiter's narrow-angle camera sees (registry/sites.yaml `traverses:` says who
// traced which, and from what). Only documented paths: a landing with no traced line has none (the
// package's LANDING_SITE guardrail). A walk away from the rover, which leaves no track a camera in
// orbit resolves, is not in any of them.
//
// HOW. A ribbon a constant number of screen pixels wide (TRAVERSE_LOOK.widthPx), one mesh a traverse,
// a CHILD of the world's mesh like a map tile (scene/tiles.js), so it turns with the Moon for free.
// It lies ON THE DRAWN GROUND -- the 1737.4 km sphere the tiles are painted on, which is where the
// landing sites stand too -- and, like a tile, never writes depth and is pulled a little toward the
// camera in the depth it is tested with (DEPTH_PULL: twice a tile's, so it is drawn over the tile it
// lies on and still behind the limb and behind a lander's model). The traced line's own frame and
// the sites' agree to metres (scripts/build_traverses.py).
//
// WHEN. scene/tiles.js imports this module the first time the Moon's tiles are on screen (so never at
// boot, never on tier 0), and shows a traverse as the camera comes within TRAVERSE_LOOK.farKm of it,
// fully inside nearKm: a fade, not a pop. Measured and Film alike: it is a record, and it does not
// move.

import * as THREE from '../../vendor/three.module.min.js';
import { TRAVERSES } from '../data/traverses.js';
import { unitFromLonLat } from './tilemath.js';

export const TRAVERSE_LOOK = { widthPx: 2.25, colour: 0xffcf7a, alpha: 0.9, nearKm: 120, farKm: 320 };
/** A tile is pulled 0.001 of its distance toward the camera in its depth test; a traverse twice that. */
export const DEPTH_PULL = 0.002;

/** A path's "lon,lat lon,lat ..." string as [lon, lat] pairs in degrees. Pure. */
export function parsePath(str) {
  const out = [];
  for (const pair of String(str || '').trim().split(/\s+/)) {
    const [lon, lat] = pair.split(',').map(Number);
    if (Number.isFinite(lon) && Number.isFinite(lat)) out.push([lon, lat]);
  }
  return out;
}

/** The length of a path of [lon, lat] pairs over a sphere of `radiusKm`, along great circles. Pure. */
export function pathLengthKm(pairs, radiusKm) {
  let km = 0;
  const a = [0, 0, 0];
  const b = [0, 0, 0];
  for (let i = 1; i < pairs.length; i++) {
    unitFromLonLat(pairs[i - 1][0], pairs[i - 1][1], a);
    unitFromLonLat(pairs[i][0], pairs[i][1], b);
    const d = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]));
    km += Math.acos(d) * radiusKm;
  }
  return km;
}

/** How much of a traverse is drawn with the camera `distKm` from its middle: 1 inside nearKm, 0 past farKm. Pure. */
export function traverseFade(distKm, look = TRAVERSE_LOOK) {
  const x = Math.min(1, Math.max(0, (look.farKm - distKm) / (look.farKm - look.nearKm)));
  return x * x * (3 - 2 * x);
}

/**
 * The ribbon of a set of paths, on the unit sphere: each point twice (one each side), with the
 * points before and after it (extrapolated at the ends, so the shader has no special case), the
 * side (-1 or +1), and two triangles a segment. Pure.
 */
export function ribbonArrays(paths) {
  let n = 0;
  let segs = 0;
  for (const p of paths) { if (p.length >= 2) { n += p.length; segs += p.length - 1; } }
  const position = new Float32Array(n * 2 * 3);
  const prev = new Float32Array(n * 2 * 3);
  const next = new Float32Array(n * 2 * 3);
  const side = new Float32Array(n * 2);
  const index = new Uint32Array(segs * 6);
  let v = 0;
  let k = 0;
  for (const p of paths) {
    if (p.length < 2) continue;
    const pts = p.map(([lon, lat]) => unitFromLonLat(lon, lat, [0, 0, 0]));
    const base = v;
    for (let i = 0; i < pts.length; i++) {
      const c = pts[i];
      const a = i > 0 ? pts[i - 1] : [2 * c[0] - pts[1][0], 2 * c[1] - pts[1][1], 2 * c[2] - pts[1][2]];
      const b = i < pts.length - 1 ? pts[i + 1] : [2 * c[0] - pts[i - 1][0], 2 * c[1] - pts[i - 1][1], 2 * c[2] - pts[i - 1][2]];
      for (let s = 0; s < 2; s++) {
        position.set(c, v * 3);
        prev.set(a, v * 3);
        next.set(b, v * 3);
        side[v] = s ? 1 : -1;
        v += 1;
      }
    }
    for (let i = 0; i < pts.length - 1; i++) {
      const q = base + i * 2;
      index.set([q, q + 1, q + 2, q + 1, q + 3, q + 2], k);
      k += 6;
    }
  }
  return { position, prev, next, side, index };
}

const VERT = /* glsl */`
#include <common>
#include <logdepthbuf_pars_vertex>
attribute vec3 prev;
attribute vec3 next;
attribute float side;
uniform vec2 uHalfPx;    // half the drawing buffer, in device pixels
uniform float uWidthPx;  // the ribbon's whole width, device pixels
varying float vSide;

vec2 toPx( vec4 clip ) { return clip.xy / clip.w * uHalfPx; }

void main() {
  mat4 mvp = projectionMatrix * modelViewMatrix;
  vec4 c = mvp * vec4( position, 1.0 );
  vec2 cp = toPx( c );
  vec2 a = cp - toPx( mvp * vec4( prev, 1.0 ) );
  vec2 b = toPx( mvp * vec4( next, 1.0 ) ) - cp;
  if ( dot( a, a ) < 1e-8 ) a = b;
  if ( dot( b, b ) < 1e-8 ) b = a;
  vec2 dir = normalize( a ) + normalize( b );
  if ( dot( dir, dir ) < 1e-8 ) dir = vec2( 1.0, 0.0 );
  dir = normalize( dir );
  vec2 nrm = vec2( -dir.y, dir.x );
  c.xy += nrm * side * 0.5 * uWidthPx / uHalfPx * c.w;
  gl_Position = c;
  vSide = side;
  #include <logdepthbuf_vertex>
  #ifdef USE_LOGARITHMIC_DEPTH_BUFFER
    vFragDepth = 1.0 + gl_Position.w * ${(1 - DEPTH_PULL).toFixed(4)};
  #endif
}
`;

const FRAG = /* glsl */`
#include <common>
#include <logdepthbuf_pars_fragment>
uniform vec3 uColour;
uniform float uAlpha;
uniform float uWidthPx;
varying float vSide;
void main() {
  #include <logdepthbuf_fragment>
  // The last device pixel on each side fades: an edge, not a staircase.
  float edge = 1.0 - smoothstep( 1.0 - 2.0 / max( uWidthPx, 2.0 ), 1.0, abs( vSide ) );
  gl_FragColor = vec4( uColour, uAlpha * edge );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

export function createTraverses({ world = 'moon' } = {}) {
  const rows = TRAVERSES.filter((t) => t.world === world);
  const group = new THREE.Group();
  group.name = world + '-traverses';
  const halfPx = new THREE.Vector2(400, 400);
  const items = rows.map((t) => {
    const paths = t.paths.map(parsePath);
    const arr = ribbonArrays(paths);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(arr.position, 3));
    geo.setAttribute('prev', new THREE.BufferAttribute(arr.prev, 3));
    geo.setAttribute('next', new THREE.BufferAttribute(arr.next, 3));
    geo.setAttribute('side', new THREE.BufferAttribute(arr.side, 1));
    geo.setIndex(new THREE.BufferAttribute(arr.index, 1));
    // The middle of the traverse: the camera's distance to it sets the fade.
    let mx = 0, my = 0, mz = 0, m = 0;
    for (let i = 0; i < arr.position.length; i += 6) { mx += arr.position[i]; my += arr.position[i + 1]; mz += arr.position[i + 2]; m += 1; }
    const mid = new THREE.Vector3(mx / m, my / m, mz / m).normalize();
    const material = new THREE.ShaderMaterial({
      name: 'traverse',
      vertexShader: VERT,
      fragmentShader: FRAG,
      uniforms: {
        uColour: { value: new THREE.Color(TRAVERSE_LOOK.colour) },
        uAlpha: { value: 0 },
        uWidthPx: { value: TRAVERSE_LOOK.widthPx },
        uHalfPx: { value: halfPx },
      },
      transparent: true,
      depthWrite: false,
      // BOTH FACES. ribbonArrays winds each quad clockwise on screen (side -1 is the right of the way
      // travelled), and where a traced line turns back on itself a quad folds over: with three's
      // default FrontSide 85 % of Apollo 15's triangles and 96 % of Apollo 17's were culled, which
      // the first pictures showed as a few yellow dots (tests/test_traverse.mjs counts them).
      side: THREE.DoubleSide,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.name = 'traverse:' + t.site;
    mesh.frustumCulled = false;
    mesh.renderOrder = 0.9; // after the tiles (0.5 and up), before the air (1) and the marks (5+)
    mesh.visible = false;
    mesh.userData.kind = 'traverse';
    group.add(mesh);
    return { row: t, mesh, mid, fade: 0, points: arr.position.length / 6 };
  });
  return {
    group,
    /**
     * Every frame the Moon's tiles are up: `camLocal` the camera in the world mesh's own axes (the
     * ball is radius 1), `radiusKm` the world's, `viewportPx` [width, height] of the drawing buffer.
     */
    frame(camLocal, radiusKm, viewportPx, pixelRatio = 1) {
      halfPx.set(Math.max(1, viewportPx[0] / 2), Math.max(1, viewportPx[1] / 2));
      for (const it of items) {
        const d = Math.hypot(camLocal.x - it.mid.x, camLocal.y - it.mid.y, camLocal.z - it.mid.z) * radiusKm;
        it.fade = traverseFade(d);
        it.mesh.visible = it.fade > 0.001;
        it.mesh.material.uniforms.uAlpha.value = TRAVERSE_LOOK.alpha * it.fade;
        it.mesh.material.uniforms.uWidthPx.value = TRAVERSE_LOOK.widthPx * Math.max(1, pixelRatio);
      }
    },
    /** Off at once (the layer has gone). */
    hide() { for (const it of items) { it.fade = 0; it.mesh.visible = false; } },
    credits() { return items.filter((it) => it.mesh.visible && it.row.credit).map((it) => it.row.credit); },
    state() { return items.map((it) => ({ site: it.row.site, shown: it.mesh.visible, fade: Math.round(it.fade * 1000) / 1000, points: it.points, lengthKm: it.row.lengthKm })); },
    dispose() {
      for (const it of items) { it.mesh.geometry.dispose(); it.mesh.material.dispose(); }
      if (group.parent) group.parent.remove(group);
    },
  };
}
