// scene/dsnlines.js -- who is talking to whom: a line from each Deep Space Network complex to the craft it is in contact
// with now (research train "ops", forge #562; the list is ui/opsdsn.js, the feed data/opsdata.js dsnContacts).
//
// Contract: createDsnLines(ctx, { scene }) -> { set(contacts), setVisible(on), visible(), update(tMs), dispose() }
// Pure, for tests/test_research_ops.mjs: segmentEnds(dish, craft, maxLen) -> {a, b, clamped} | null
//
// WHAT IS DRAWN. One straight segment per contact (a craft and a complex: Goldstone, Madrid or Canberra) whose craft the
// map draws, from the complex's place on the turning Earth (NASA's DSN Now configuration gives the three) to where the
// map puts the craft at this instant. A craft the map does not draw gets no line: the list still names it. On the Earth's
// stage the far end is out of the picture anyway, so the segment stops MAX_EARTH_KM out along the true direction (the
// line points where the dish points, to within the map's error); on the Sun's stage it reaches the craft. The light
// takes minutes to hours along it and the list says how long; the line itself is the direction, not a moving signal.
// One draw call for every line together (registry/budgets.yaml dsn_lines_draw_calls).

import * as THREE from '../../vendor/three.module.min.js';
import { DSN_SITES } from '../data/opsdata.js';

const DEG = Math.PI / 180;
const COLOUR = 0xc3a6ff;            // the probes' class colour, data/layers.js C.probe
const MAX_EARTH_KM = 40000;         // about six Earth radii: past the frame of the Earth's stage at its home distance
const MAX_LINES = 32;

/** The two ends of a contact's segment, the far one brought in to `maxLen` along the same direction when it is farther. */
export function segmentEnds(dish, craft, maxLen) {
  if (!dish || !craft) return null;
  const dx = craft.x - dish.x;
  const dy = craft.y - dish.y;
  const dz = craft.z - dish.z;
  const len = Math.hypot(dx, dy, dz);
  if (!(len > 0) || !Number.isFinite(len)) return null;
  const k = Number.isFinite(maxLen) && maxLen > 0 && len > maxLen ? maxLen / len : 1;
  return { a: { x: dish.x, y: dish.y, z: dish.z }, b: { x: dish.x + dx * k, y: dish.y + dy * k, z: dish.z + dz * k }, clamped: k < 1 };
}

/** A complex as a record the app's own propagate and stage can place: a fixed point on the turning Earth. */
function siteRecord(id) {
  const s = DSN_SITES[id];
  return s ? { id: `dsn-site-${id}`, name: s.name, propagator: 'fixed', frame: 'earth-fixed', cls: 'measured', fixed: { latRad: s.latDeg * DEG, lonRad: s.lonDeg * DEG, altKm: 1 } } : null;
}

export function createDsnLines(ctx, { scene } = {}) {
  const positions = new Float32Array(MAX_LINES * 6);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setDrawRange(0, 0);
  const material = new THREE.LineBasicMaterial({ color: COLOUR, transparent: true, opacity: 0.85, depthWrite: false });
  const lines = new THREE.LineSegments(geometry, material);
  lines.name = 'dsn-lines';
  lines.frustumCulled = false;
  lines.renderOrder = 2;
  lines.visible = false;
  (scene || (ctx && ctx.scene)).add(lines);
  const sites = new Map(Object.keys(DSN_SITES).map((id) => [id, siteRecord(id)]));
  let pairs = [];
  let on = false;

  function set(contacts) {
    pairs = (Array.isArray(contacts) ? contacts : []).filter((c) => c && c.recordId && sites.has(c.stationId)).slice(0, MAX_LINES)
      .map((c) => ({ site: sites.get(c.stationId), recordId: c.recordId }));
  }

  function update() {
    if (!on || !ctx || typeof ctx.positionOfRecord !== 'function') { geometry.setDrawRange(0, 0); return; }
    const unitKm = ctx.stage && ctx.stage.unitKm ? ctx.stage.unitKm : 1;
    const maxLen = ctx.stage && ctx.stage.worldId === 'earth' ? MAX_EARTH_KM / unitKm : Infinity;
    let n = 0;
    for (const p of pairs) {
      const record = ctx.recordById ? ctx.recordById(p.recordId) : null;
      const dish = ctx.positionOfRecord(p.site);
      const craft = record ? ctx.positionOfRecord(record) : null;
      const seg = segmentEnds(dish, craft, maxLen);
      if (!seg) continue;
      const k = n * 6;
      positions[k] = seg.a.x; positions[k + 1] = seg.a.y; positions[k + 2] = seg.a.z;
      positions[k + 3] = seg.b.x; positions[k + 4] = seg.b.y; positions[k + 5] = seg.b.z;
      n += 1;
    }
    geometry.setDrawRange(0, n * 2);
    geometry.attributes.position.needsUpdate = true;
    lines.visible = n > 0;
  }

  return {
    set,
    setVisible(v) { on = !!v; if (!on) { lines.visible = false; geometry.setDrawRange(0, 0); } },
    visible: () => on,
    update,
    dispose() { lines.removeFromParent(); geometry.dispose(); material.dispose(); },
  };
}
