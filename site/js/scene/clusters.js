// scene/clusters.js -- which catalogue stars belong to a nearby open cluster, and where to draw them
// (public #271, 2026-10-08). Pure: no DOM, no three.js, importable in node.
//
// Contract: CLUSTERS, eclDirection(raDeg, decDeg), clusterMembers(posLy, count, cluster) -> number[],
//           drawnPositions(posLy, count) -> { drawLy: Float32Array, moved: Map<index, clusterId> }
//
// WHY. "To the edge" stops 100 light-years from the Pleiades, and the cluster was a mark with a
// label: its stars are in the catalogue this map already ships (HYG v4.4, scene/stars3d.js), but
// Hipparcos's distance to any ONE star at 440 light-years is uncertain by tens of light-years,
// and the cluster is 19 across. Drawn at their catalogue distances the members are a streak 300
// light-years long pointing at the Sun -- measured: the 40 stars within 2 degrees of the centre run
// from 320 to 601 light-years, see tests/test_clusters.mjs -- which is an error bar, not a cluster.
//
// WHAT IS DRAWN. Each member keeps its MEASURED DIRECTION from the Sun (good to a thousandth of a
// degree) and is drawn at the cluster's measured distance, plus a depth inside the cluster's own
// size that is NOT measured: it is a fixed number per star, there so the cluster is a ball from
// the side and not a sheet. The cluster's record says so on its card (data/parsers.js DSO_DRAWN),
// and a member's own card still gives the catalogue's distance. The Hyades, at 153 light-years,
// have parallaxes good to a few light-years, so their stars stay exactly where the catalogue puts
// them; the row is here for the membership count only.
//
// MEMBERSHIP IS A CONE AND A DISTANCE RANGE, not proper motions (the binary carries none): a few
// field stars are inside it, and the card says "a few may be stars in front or behind".

const D2R = Math.PI / 180;
const OBLIQUITY = 23.4392911 * D2R; // J2000 mean obliquity, as scene/nebulae.js

/**
 * raDeg, decDeg, distLy: the row of site/data/dso.json (tests/test_clusters.mjs holds them equal).
 * radiusDeg: the cone. nearLy, farLy: the catalogue distances taken as "in the cluster".
 * depthLy: half the depth the regrouped stars are spread over (0: the stars are left where they are).
 */
export const CLUSTERS = [
  { id: 'm45', raDeg: 56.86917, decDeg: 24.10528, distLy: 425, radiusDeg: 2.0, nearLy: 280, farLy: 620, depthLy: 8 },
  { id: 'hyades', raDeg: 66.75, decDeg: 15.8667, distLy: 153, radiusDeg: 6.0, nearLy: 125, farLy: 185, depthLy: 0 },
];

/** A unit vector on the sun-inertial (ecliptic J2000) axes for an equatorial J2000 direction. */
export function eclDirection(raDeg, decDeg) {
  const ra = raDeg * D2R, dec = decDeg * D2R;
  const x = Math.cos(dec) * Math.cos(ra), y = Math.cos(dec) * Math.sin(ra), z = Math.sin(dec);
  const c = Math.cos(OBLIQUITY), s = Math.sin(OBLIQUITY);
  return [x, y * c + z * s, -y * s + z * c];
}

/** The indices of the catalogue's stars inside a cluster's cone and distance range. */
export function clusterMembers(posLy, count, cluster) {
  const d = eclDirection(cluster.raDeg, cluster.decDeg);
  const cosR = Math.cos(cluster.radiusDeg * D2R);
  const out = [];
  for (let i = 0; i < count; i++) {
    const x = posLy[i * 3], y = posLy[i * 3 + 1], z = posLy[i * 3 + 2];
    const r = Math.hypot(x, y, z);
    if (!(r >= cluster.nearLy && r <= cluster.farLy)) continue;
    if ((x * d[0] + y * d[1] + z * d[2]) / r >= cosR) out.push(i);
  }
  return out;
}

/** A fixed number in -1..1 for star `i`: its drawn depth, the same on every visit. */
export function depthOf(i) {
  const s = Math.sin(i * 12.9898 + 4.1414) * 43758.5453;
  return 2 * (s - Math.floor(s)) - 1;
}

/**
 * Where each star is drawn: the catalogue's place, except a regrouped cluster's members.
 * `moved` maps a star's index to its cluster's id.
 */
export function drawnPositions(posLy, count) {
  const drawLy = new Float32Array(posLy);
  const moved = new Map();
  for (const c of CLUSTERS) {
    if (!(c.depthLy > 0)) continue;
    for (const i of clusterMembers(posLy, count, c)) {
      const x = posLy[i * 3], y = posLy[i * 3 + 1], z = posLy[i * 3 + 2];
      const k = (c.distLy + c.depthLy * depthOf(i)) / Math.hypot(x, y, z);
      drawLy[i * 3] = x * k; drawLy[i * 3 + 1] = y * k; drawLy[i * 3 + 2] = z * k;
      moved.set(i, c.id);
    }
  }
  return { drawLy, moved };
}
