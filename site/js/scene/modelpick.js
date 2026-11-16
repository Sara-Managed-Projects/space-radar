// scene/modelpick.js -- a craft drawn as its 3D model is one pick target, as big as it looks (internal #341).
//
// The owner, 2026-11-16: "When satellites or other objects appear in 3D next to another object they should
// be clickable as a whole; now I must click a specific part." A pick was the screen distance to the craft's
// centre point: 10 px for a mouse, under a model 260 px across. A click on the solar panels got nothing, the
// planet behind, or a neighbour.
//
// The target is now the model's OUTLINE: the boxes of its drawn parts as they stand this frame (a wing that
// has turned to the Sun included), projected to the screen, and the convex hull round them. Gaps between the
// trusses are inside it on purpose: a click between two struts means the station. scene/heroes.js fetches
// this file with the model shapes (warmModels), so it is not in the boot graph: no model is drawn, and so
// none can be pointed at, before the shapes are here. scene/pickrank.js decides who wins.
import * as THREE from '../../vendor/three.module.min.js';

const _v = new THREE.Vector3();
const _eye = new THREE.Vector3();

/**
 * How far a point is from the outline of a set of screen points, 0 anywhere inside it: the convex hull, so
 * a model is hit on its panels as on its middle. Pure.
 * @param {Array<[number, number]>} points
 * @returns {number} CSS px; Infinity with no points
 */
export function hullDistance(points, x, y) {
  const p = (Array.isArray(points) ? points : []).filter((q) => q && Number.isFinite(q[0]) && Number.isFinite(q[1]))
    .slice().sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));
  if (!p.length) return Infinity;
  const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const chain = (list) => {
    const h = [];
    for (const q of list) { while (h.length >= 2 && cross(h[h.length - 2], h[h.length - 1], q) <= 0) h.pop(); h.push(q); }
    h.pop();
    return h;
  };
  const hull = p.length > 1 ? chain(p).concat(chain(p.slice().reverse())) : p;
  let inside = hull.length >= 3;
  let best = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    if (inside && cross(a, b, [x, y]) < 0) inside = false;
    const ux = b[0] - a[0], uy = b[1] - a[1];
    const len = ux * ux + uy * uy;
    const t = len > 0 ? Math.min(1, Math.max(0, ((x - a[0]) * ux + (y - a[1]) * uy) / len)) : 0;
    best = Math.min(best, Math.hypot(x - a[0] - ux * t, y - a[1] - uy * t));
  }
  return inside ? 0 : best;
}

/**
 * Every drawn model near the pointer: {record, kind: 'model', px, score, sx, sy, r, depth, span}. `px` is the
 * distance to the model's outline in CSS px, zero anywhere on it; sx/sy its centre on screen; r half its
 * measured circle; depth the straight-line distance from the camera and span how far it reaches from its
 * centre, in scene units.
 * @param {Iterable<{obj, record, px, reach}>} entries heroes.js's live models
 * @param {function(object): boolean} pickable which of them may be pointed at (drawn in, not smaller than a dot)
 */
export function pickModels(entries, pickable, ndcX, ndcY, camera, vp, reachPx = 24) {
  const out = [];
  if (!camera || !vp || !(vp.w > 0) || !(vp.h > 0)) return out;
  const halfW = vp.w * 0.5;
  const halfH = vp.h * 0.5;
  const tapX = (ndcX + 1) * halfW;
  const tapY = (1 - ndcY) * halfH;
  camera.updateMatrixWorld();
  camera.getWorldPosition(_eye);
  for (const entry of entries) {
    const obj = entry.obj;
    if (!obj || !obj.visible || !pickable(entry)) continue;
    _v.copy(obj.position).project(camera);
    if (!(_v.z > -1 && _v.z < 1)) continue;
    const sx = (_v.x + 1) * halfW;
    const sy = (1 - _v.y) * halfH;
    const r = entry.px / 2; // its circle as measured at rest; a part that moves may reach a little past it
    const off = Math.hypot(sx - tapX, sy - tapY);
    if (off > r * 1.5 + reachPx) continue;
    const pts = [];
    obj.updateMatrixWorld(true);
    obj.traverse((n) => {
      if (!n.isMesh || !n.geometry || n.userData.noReach) return; // the parts heroes.js unitReachOf counts: no contact shadow, no ground patch
      for (let p = n; p && p !== obj; p = p.parent) if (!p.visible) return;
      if (!n.geometry.boundingBox) n.geometry.computeBoundingBox();
      const b = n.geometry.boundingBox;
      if (!b || b.isEmpty()) return;
      for (let i = 0; i < 8; i++) {
        _v.set(i & 1 ? b.max.x : b.min.x, i & 2 ? b.max.y : b.min.y, i & 4 ? b.max.z : b.min.z).applyMatrix4(n.matrixWorld).project(camera);
        pts.push([(_v.x + 1) * halfW, (1 - _v.y) * halfH]);
      }
    });
    const px = pts.length ? hullDistance(pts, tapX, tapY) : Math.max(0, off - r);
    if (px > reachPx) continue;
    out.push({ record: entry.record, kind: 'model', px, score: px, sx, sy, r, depth: obj.position.distanceTo(_eye), span: (entry.reach || 0.5) * obj.scale.x });
  }
  return out;
}
