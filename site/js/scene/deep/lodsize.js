// scene/deep/lodsize.js -- a deep-sky object's level of detail by its SIZE ON SCREEN, not its distance
// (internal spec 0075 task 7, requirement 6, design section 5). Pure; node-tested (tests/test_deepsky.mjs).
//
// Contract:
//   LEVELS                                   0 mark, 1 silhouette, 2 structure, 3 hero close-up, 4 fly-through
//   THRESHOLDS[cls] = {fetch, 1, 2, 3}       radius in CSS px at which each level starts (going up)
//   DOWN = 0.8                               a level is left at 0.8 of the radius it was entered at
//   FADE_MS = 300                            the cross-fade between two levels
//   PHOTO_FETCH_PX                           a photograph is fetched from this radius (scene/nebulae.js)
//   radiusPx(radius, distance, fovYRad, viewH) -> projected radius, CSS px (Infinity inside it)
//   classOf(record) -> 'galaxy' | 'nebula' | 'planetary' | 'cluster' | 'other'
//   levelFor(rPx, previous, cls) -> 0..3     with hysteresis; level 4 is authored, never automatic
//   createFader(ms) -> {to(id, target, nowMs) -> share now, share(id)}   a 300 ms ease per object
//
// The numbers are the package's (§9A "Reveal": fetch at 30-80 px, mid detail at 120-200 px, the hero's
// volumes at a few hundred), calibrated per class: a planetary nebula is small and wants its structure
// earlier than a galaxy whose photograph carries it further.

export const LEVELS = ['mark', 'silhouette', 'structure', 'hero', 'flythrough'];
export const THRESHOLDS = {
  galaxy: { fetch: 60, 1: 12, 2: 180, 3: 320 },
  nebula: { fetch: 40, 1: 10, 2: 140, 3: 300 },
  planetary: { fetch: 30, 1: 8, 2: 120, 3: 260 },
  cluster: { fetch: 60, 1: 12, 2: 200, 3: Infinity },
  other: { fetch: 80, 1: 14, 2: Infinity, 3: Infinity },
};
export const DOWN = 0.8;
export const FADE_MS = 300;
// The photographs' own fetch, unchanged from scene/nebulae.js's 32 px WIDE (16 px in radius): at 10 px a
// sweep across Orion fetched three pictures nobody could see (measured 2026-10-03).
export const PHOTO_FETCH_PX = 16;

/** The projected radius of a sphere of `radius` seen from `distance` (same units). Pure. */
export function radiusPx(radius, distance, fovYRad, viewH) {
  if (!(radius > 0) || !(viewH > 0) || !(fovYRad > 0)) return 0;
  if (!(distance > radius)) return Infinity;
  return (Math.asin(radius / distance) / (fovYRad / 2)) * (viewH / 2);
}

/** Which threshold row a deep-sky record uses. Pure. */
export function classOf(record) {
  const md = (record && record.meta) || {};
  const code = md.typeCode || '';
  if (md.kind === 'galaxy') return 'galaxy';
  if (code === 'PN') return 'planetary';
  if (md.kind === 'cluster' || code === 'GCl' || code === 'OCl') return 'cluster';
  if (md.kind === 'nebula') return 'nebula';
  return 'other';
}

/**
 * The level for a radius, given the level held last time: up at a threshold, down only at DOWN of it,
 * so a camera resting on a threshold does not flicker between two levels. Never 4 (authored). Pure.
 */
export function levelFor(rPx, previous = 0, cls = 'other') {
  const t = THRESHOLDS[cls] || THRESHOLDS.other;
  const px = Number(rPx) || 0;
  let up = 0;
  for (const n of [1, 2, 3]) if (px >= t[n]) up = n;
  const prev = Math.min(3, Math.max(0, Math.trunc(previous) || 0));
  if (up >= prev) return up;
  // going down: stay at `prev` while the radius is above DOWN of its threshold
  let level = prev;
  while (level > 0 && px < t[level] * DOWN) level -= 1;
  return Math.max(up, level);
}

/** A per-object ease toward a target share over `ms` (no pop at a threshold). */
export function createFader(ms = FADE_MS) {
  const st = new Map();
  return {
    to(id, target, nowMs) {
      const s = st.get(id) || { v: target, t: nowMs };
      const dt = Math.max(0, nowMs - s.t);
      const step = ms > 0 ? dt / ms : 1;
      s.v = s.v < target ? Math.min(target, s.v + step) : Math.max(target, s.v - step);
      s.t = nowMs;
      st.set(id, s);
      return s.v;
    },
    share: (id) => (st.has(id) ? st.get(id).v : 0),
    forget: (id) => st.delete(id),
  };
}
