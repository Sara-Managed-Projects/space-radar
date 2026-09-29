// ui/tracklabels.js -- "+15 min", "+30 min" ... beside every third tick of the ground track
// (spec 0048 req 3). The track itself is WebGL (scene/groundtrack.js); a number is DOM, like every
// other name over the scene (ui/labels.js), so it is sharp at any pixel ratio and costs no draw call.
//
// Contract: createTrackLabels(ctx, host, track) -> { update(), destroy() }
//
// Six pooled <div>s at most, placed by `transform` once a frame from the track's own points, hidden
// when a point is behind the Earth (ui/labels.js behindWorld) or off screen.

import * as THREE from '../../vendor/three.module.min.js';
import { COPY, t } from '../copy/en.js';
import { behindWorld } from './labels.js';

const POOL = 6;

export function createTrackLabels(ctx, host, track) {
  if (!host || typeof document === 'undefined') return { update() {}, destroy() {} };
  const pool = [];
  for (let i = 0; i < POOL; i++) {
    const node = document.createElement('div');
    node.className = 'label sr-track-label';
    node.hidden = true;
    host.appendChild(node);
    pool.push({ node, text: '', transform: '' });
  }
  const _v = new THREE.Vector3();
  const _c = new THREE.Vector3();

  function update() {
    const pts = track && track.labelPoints ? track.labelPoints() : [];
    const cam = ctx.camera;
    const el = ctx.renderer && ctx.renderer.domElement;
    const w = (el && el.clientWidth) || window.innerWidth;
    const h = (el && el.clientHeight) || window.innerHeight;
    const earth = ctx.worlds && ctx.worlds.drawnPositionOf ? ctx.worlds.drawnPositionOf('earth', _c) : null;
    const spheres = earth ? [{ id: 'earth', x: earth.x, y: earth.y, z: earth.z, r: ctx.worlds.drawnRadiusUnits('earth') }] : [];
    for (let i = 0; i < pool.length; i++) {
      const slot = pool[i];
      const p = pts[i];
      let show = false;
      if (p && cam && !behindWorld(cam.position, p.pos, spheres)) {
        _v.copy(p.pos).project(cam);
        if (_v.z < 1 && Math.abs(_v.x) <= 1 && Math.abs(_v.y) <= 1) {
          show = true;
          const text = t(COPY.groundTrack.tick, { n: p.minutes });
          if (slot.text !== text) { slot.text = text; slot.node.textContent = text; }
          const tr = `translate(${(((_v.x + 1) / 2) * w).toFixed(1)}px, ${(((1 - _v.y) / 2) * h).toFixed(1)}px) translate(6px, -50%)`;
          if (slot.transform !== tr) { slot.transform = tr; slot.node.style.transform = tr; }
        }
      }
      if (slot.node.hidden === show) slot.node.hidden = !show;
    }
  }

  function destroy() {
    for (const slot of pool) slot.node.remove();
    pool.length = 0;
  }

  return { update, destroy };
}
