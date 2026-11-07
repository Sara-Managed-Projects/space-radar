// sky/skyepoch.js -- moves what the sky from the ground draws to another millennium (forge #141).
//
// Contract: createSkyEpoch({ fetchBytes }) -> { ready, apply(years, targets), hidesUnmoved(years), state() }
//   targets: { stars: BufferGeometry | null, lines: [LineSegments], names: [{ name, mag, dir }] }
//   state(): { years, epoch, moved, unmoved, pole: { name, mag, sepDeg } | null, south: ... } | null
// Imported by sky/groundsky.js the first time the clock is more than 50 years from now; data/starmotion.bin
// (275 kB, scripts/build-starmotion.py) is fetched then and never on a visit that stays near today.
//
// HOW A POINT FINDS ITS MOTION. The sky's stars come from two catalogues (d3-celestial's naked-eye file and
// HYG's fainter tiers), its figures from a third, and none of them carries a row number the others share.
// They share the sky: every point is matched once, by its J2000 direction, to the star of starmotion.bin
// within 0.02 degrees of it (sky/starmotion.js createMatcher), and a figure's corner, as sky/figures.js
// does, to the brightest within a third of a degree. A geometry's own arrays are never written: the moved
// positions go in a copy, so the tiers and the trails that share those arrays stay the catalogue's.
//
// WHAT IS NOT MOVED. A star the file does not have (fainter than magnitude 7 and slower than half an
// arcsecond a year) stays where it is for the first thousand years, which moves it less than a typical
// pixel; past that it is not drawn, and neither are the star tiles or the pictures, which are pinned to
// today's stars, so nothing on screen is a star left behind. The IAU borders are lines of the 1875
// equinox and do not move with the stars: that is what they are.

import { parseMotion, moveOne, createMatcher, moveAll, poleStar } from './starmotion.js';

/** Past this many years from J2000 a star with no motion is hidden rather than drawn where it is today. */
export const HIDE_UNMOVED_YEARS = 1000;
/** A star point's own match; a figure corner's, as sky/figures.js CORNER_TOLERANCE_DEG. */
const POINT_TOL_DEG = 0.02;
const CORNER_TOL_DEG = 0.35;
/** Positions are worked out again when the years have changed by this much (a fraction of an arcsecond for the fastest star). */
const REDO_YEARS = 0.05;

export function createSkyEpoch({ fetchBytes }) {
  let m = null;
  let match = null;
  const geos = new WeakMap(); // geometry -> { orig, origMag, idx, moved, mag, at }
  const names = new WeakMap(); // entry -> { dir0, idx }
  let last = null;
  let poleAt = NaN;

  const ready = fetchBytes('../../data/starmotion.bin').then((buf) => {
    m = parseMotion(buf);
    match = createMatcher(m);
    return true;
  });

  function own(geo, corner) {
    let g = geos.get(geo);
    if (g) return g;
    const pos = geo.attributes.position;
    const orig = pos.array;
    const n = pos.count;
    const idx = new Int32Array(n);
    const d = [0, 0, 0];
    let found = 0;
    for (let i = 0; i < n; i += 1) {
      d[0] = orig[i * 3]; d[1] = orig[i * 3 + 1]; d[2] = orig[i * 3 + 2];
      const len = Math.hypot(d[0], d[1], d[2]) || 1;
      d[0] /= len; d[1] /= len; d[2] /= len;
      idx[i] = corner ? match(d, CORNER_TOL_DEG, true) : match(d, POINT_TOL_DEG);
      if (idx[i] >= 0) found += 1;
    }
    const magAttr = geo.attributes.aMag;
    // userData.magBase: the catalogue's magnitudes when sky/skyvariables.js has swapped its own copy in.
    const origMag = magAttr ? (geo.userData.magBase || magAttr.array) : null;
    g = { orig, idx, found, n, scale: Math.hypot(orig[0], orig[1], orig[2]) || 1, origMag, at: NaN, hidden: false };
    geos.set(geo, g);
    return g;
  }

  function moveGeometry(geo, years, corner) {
    const g = own(geo, corner);
    const hide = !corner && Math.abs(years) > HIDE_UNMOVED_YEARS;
    if (years === 0) {
      if (geo.attributes.position.array !== g.orig) { geo.attributes.position.array = g.orig; geo.attributes.position.needsUpdate = true; }
      if (g.origMag && g.hidden) { geo.attributes.aMag.array = g.origMag; geo.attributes.aMag.needsUpdate = true; }
      g.at = 0;
      g.hidden = false;
      return g;
    }
    if (Math.abs(years - g.at) < REDO_YEARS && hide === g.hidden) return g;
    const out = g.moved || (g.moved = new Float32Array(g.orig.length));
    const v = [0, 0, 0];
    for (let i = 0; i < g.n; i += 1) {
      const k = g.idx[i];
      if (k < 0) { out[i * 3] = g.orig[i * 3]; out[i * 3 + 1] = g.orig[i * 3 + 1]; out[i * 3 + 2] = g.orig[i * 3 + 2]; continue; }
      moveOne(m, k, years, v);
      const s = Math.hypot(g.orig[i * 3], g.orig[i * 3 + 1], g.orig[i * 3 + 2]) || g.scale;
      out[i * 3] = v[0] * s; out[i * 3 + 1] = v[1] * s; out[i * 3 + 2] = v[2] * s;
    }
    geo.attributes.position.array = out;
    geo.attributes.position.needsUpdate = true;
    // The magnitudes are swapped only when hiding starts or ends: sky/skyvariables.js owns them near now.
    if (g.origMag && hide !== g.hidden) {
      if (hide) {
        const mag = g.mag || (g.mag = new Float32Array(g.origMag.length));
        for (let i = 0; i < g.n; i += 1) mag[i] = g.idx[i] < 0 ? 99 : g.origMag[i];
        geo.attributes.aMag.array = mag;
      } else geo.attributes.aMag.array = g.origMag;
      geo.attributes.aMag.needsUpdate = true;
    }
    g.at = years;
    g.hidden = hide;
    return g;
  }

  function moveNames(list, years) {
    for (const e of list) {
      if (!e || !e.dir) continue;
      let n = names.get(e);
      if (!n) { n = { dir0: e.dir, idx: match(e.dir, 0.05) }; names.set(e, n); }
      if (n.idx < 0) continue;
      e.dir = years === 0 ? n.dir0 : moveOne(m, n.idx, years, [0, 0, 0]);
    }
  }

  function nameOf(list, k) {
    if (k < 0) return null;
    for (const e of list || []) { const n = e && names.get(e); if (n && n.idx === k) return e.name; }
    return null;
  }

  function apply(years, targets = {}) {
    if (!m) return;
    const y = Number.isFinite(years) ? years : 0;
    let moved = 0;
    let unmoved = 0;
    if (targets.stars) { const g = moveGeometry(targets.stars, y, false); moved += g.found; unmoved += g.n - g.found; }
    for (const obj of targets.lines || []) if (obj && obj.geometry) moveGeometry(obj.geometry, y, true);
    if (targets.names) moveNames(targets.names, y);
    // The pole star: worked out again when the epoch has moved by a year.
    const epj = 2000 + y;
    if (y !== 0 && !(Math.abs(epj - poleAt) < 1)) {
      poleAt = epj;
      const dirs = moveAll(m, y);
      const n = poleStar(m, dirs, epj, false);
      const s = poleStar(m, dirs, epj, true);
      const word = (p) => (p.index < 0 ? null : { name: nameOf(targets.names, p.index), mag: Math.round(m.mag[p.index] * 10) / 10, sepDeg: p.sepDeg });
      last = { years: y, epoch: epj, moved, unmoved, pole: word(n), south: word(s) };
    } else if (last) { last.years = y; last.moved = moved; last.unmoved = unmoved; }
    if (y === 0) last = null;
  }

  return {
    ready,
    apply,
    hidesUnmoved: (years) => !!m && Math.abs(years || 0) > HIDE_UNMOVED_YEARS,
    state: () => (last ? { ...last, pole: last.pole && { ...last.pole }, south: last.south && { ...last.south } } : null),
  };
}
