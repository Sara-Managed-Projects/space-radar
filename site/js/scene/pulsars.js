// scene/pulsars.js -- a pulsar's pulse: a light at its measured place that blinks (public #426).
//
// Contract: createPulsars(scene) -> { setRecords(records), rebuild(), update(camera, renderer,
//   visible, nowMs), state(), dispose(), group }
//
// A pulsar was a mark with a fact sheet. registry/exotics.yaml has carried each one's period since
// the sheet was written, and nothing drew it. This draws a small soft light on every row that has
// a period (eight pulsars and the magnetar), blinking at the period scene/pulse.js gives it: the
// true one multiplied by a power of ten so an eye can follow it, the factor on the card
// (data/layers.js `departure`). The clock is the WALL's, not the map's: at a million times real
// time the Crab still blinks every 3.3 s, because the blink is a picture of a rhythm and not an
// event on the map's timeline.
//
// WHAT IT IS NOT. Not the beam, not its direction, not its brightness: a pulsar this far is a point
// of radio or X-ray light nobody sees by eye. The light's size and colour are chosen.
//
// STILL FOR SOME. With `prefers-reduced-motion: reduce` the light is steady: a blink is motion.
//
// NOTHING AT BOOT. main.js imports this file the first time the exotics are drawn on a rung of the
// ladder. One draw call of nine points.

import * as THREE from '../../vendor/three.module.min.js';
import { stage, isLadderStage } from './stage.js';
import { shownPeriod, PULSE_WIDTH, PULSE_FLOOR } from './pulse.js';

const SUN_INERTIAL = 'sun-inertial';

const VERT = /* glsl */ `
attribute float aPeriod;
uniform float uTime;
uniform float uPixelRatio;
uniform float uSteady;
varying float vPulse;
void main() {
  vec4 mv = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * mv;
  // scene/pulse.js pulseAt(), on the GPU.
  float phase = fract( uTime / aPeriod );
  float d = min( phase, 1.0 - phase ) / ${PULSE_WIDTH.toFixed(3)};
  vPulse = mix( ${PULSE_FLOOR.toFixed(2)} + ${(1 - PULSE_FLOOR).toFixed(2)} * exp( -d * d ), 0.45, uSteady );
  gl_PointSize = ( 9.0 + 25.0 * vPulse ) * uPixelRatio;
}
`;
const FRAG = /* glsl */ `
varying float vPulse;
#include <common>
void main() {
  float r = length( gl_PointCoord - vec2( 0.5 ) ) * 2.0;
  if ( r >= 1.0 ) discard;
  float e = 1.0 - r;
  float a = ( exp( -18.0 * r * r ) + 0.35 * e * e * e ) * vPulse;
  gl_FragColor = vec4( mix( vec3( 0.72, 0.84, 1.0 ), vec3( 1.0 ), exp( -18.0 * r * r ) ), a );
  #include <colorspace_fragment>
}
`;

export function createPulsars(scene) {
  const group = new THREE.Group();
  group.name = 'pulsars';
  if (scene) scene.add(group);
  const steady = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const uniforms = { uTime: { value: 0 }, uPixelRatio: { value: 1 }, uSteady: { value: steady ? 1 : 0 } };
  let rows = [];
  let points = null;
  let builtFor = null;
  const _v = new THREE.Vector3();

  function setRecords(records) {
    rows = [];
    for (const r of records || []) {
      const shown = r && r.klass === 'exotic' && r.pos && r.meta ? shownPeriod(r.meta.periodS) : null;
      if (shown) rows.push({ record: r, ...shown });
    }
    if (points) { group.remove(points); points.geometry.dispose(); points.material.dispose(); points = null; }
    if (rows.length) {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(rows.length * 3), 3));
      geometry.setAttribute('aPeriod', new THREE.BufferAttribute(new Float32Array(rows.map((p) => p.shownS)), 1));
      points = new THREE.Points(geometry, new THREE.ShaderMaterial({
        vertexShader: VERT, fragmentShader: FRAG, uniforms,
        transparent: false, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false,
      }));
      points.name = 'pulsars';
      points.frustumCulled = false;
      points.renderOrder = -1;
      group.add(points);
    }
    builtFor = null;
    rebuild();
  }

  function rebuild() {
    if (!points) return;
    if (!isLadderStage(stage.worldId)) { points.visible = false; return; }
    if (builtFor === stage.worldId) return;
    builtFor = stage.worldId;
    const pos = points.geometry.getAttribute('position').array;
    rows.forEach((p, i) => {
      const ok = stage.toSceneInto(p.record.pos, SUN_INERTIAL, _v, stage.tMs);
      pos[i * 3] = ok ? _v.x : 0; pos[i * 3 + 1] = ok ? _v.y : 0; pos[i * 3 + 2] = ok ? _v.z : 0;
    });
    points.geometry.getAttribute('position').needsUpdate = true;
  }

  /** Per frame. `visible` is the exotics layer's own answer; `nowMs` the wall clock (performance.now()). */
  function update(camera, renderer, visible, nowMs) {
    if (!points) return;
    points.visible = !!visible && isLadderStage(stage.worldId);
    if (!points.visible) return;
    rebuild();
    // Seconds, wrapped every hour so a float32 keeps its milliseconds.
    uniforms.uTime.value = ((Number(nowMs) || 0) / 1000) % 3600;
    if (renderer && typeof renderer.getPixelRatio === 'function') uniforms.uPixelRatio.value = Math.min(2, Math.max(0.5, renderer.getPixelRatio()));
  }

  function dispose() {
    if (points) { points.geometry.dispose(); points.material.dispose(); }
    if (scene) scene.remove(group);
    points = null; rows = [];
  }

  return {
    setRecords, rebuild, update, dispose, group,
    state: () => ({ count: rows.length, visible: !!(points && points.visible), steady, rows: rows.map((p) => ({ id: p.record.id, shownS: p.shownS, slower: p.slower })) }),
  };
}
