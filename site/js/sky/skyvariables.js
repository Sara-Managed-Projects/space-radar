// sky/skyvariables.js -- the famous variable stars, drawn at the brightness the clock gives them (forge #142).
//
// Contract: createSkyVariables({ root, fetchJson, material, renderOrder, radecDir }) -> Promise<{ update(tMs, starsGeometry), state(), dispose() }>
// Imported by sky/groundsky.js once the sky's stars are up; data/variables.json is 14 kB.
//
// HOW. Each of the 58 stars of data/variables.json is found among the sky's own points by its J2000 place
// (within 0.05 degrees, the brightest there), takes that point's colour, and puts the point out (its colour
// to black, which an additive point draws as nothing: the catalogue's magnitudes, which the draw range is
// sorted by, are not touched). Its own point, in one small Points of the same shader, is drawn at
// sky/variables.js magAt() of the clock. A star the clock cannot say (an irregular one) is left as the
// catalogue has it. Further than VAR_YEARS from now nothing is carried and every star is the catalogue's.
//
// REDUCED MOTION. Nothing here animates: the brightness is a function of the clock alone, and the twinkle
// the shared shader adds is already off under prefers-reduced-motion (sky/groundsky.js uTwinkle).

import * as THREE from '../../vendor/three.module.min.js';
import { magAt, VAR_YEARS } from './variables.js';

const MATCH_COS = Math.cos(0.05 * Math.PI / 180);
const YEAR_MS = 365.25 * 86400e3;

export async function createSkyVariables({ root, fetchJson, material, renderOrder, radecDir }) {
  const doc = await fetchJson('../../data/variables.json');
  const rows = (doc && Array.isArray(doc.rows) ? doc.rows : []).filter((r) => Number.isFinite(r.ra) && Number.isFinite(r.dec));
  const n = rows.length;
  const dirs = rows.map((r) => radecDir(r.ra, r.dec));
  const pos = new Float32Array(n * 3);
  dirs.forEach((d, i) => { pos[i * 3] = d[0]; pos[i * 3 + 1] = d[1]; pos[i * 3 + 2] = d[2]; });
  const col = new Float32Array(n * 3).fill(1);
  const mag = new Float32Array(n).fill(99);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('aColour', new THREE.BufferAttribute(col, 3));
  geo.setAttribute('aMag', new THREE.BufferAttribute(mag, 1));
  geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 1e9);
  const points = new THREE.Points(geo, material());
  points.name = 'ground-variables';
  points.frustumCulled = false;
  points.renderOrder = renderOrder;
  root.add(points);

  let host = null; // { geo, idx, base, orig, dark, out }: the sky's points this is bound to
  let shown = 0;

  function bind(target) {
    if (host && host.geo === target) return;
    if (host) restore();
    const p = target.attributes.position.array;
    const m = target.attributes.aMag.array;
    const count = target.attributes.position.count;
    const idx = new Int32Array(n).fill(-1);
    const best = new Float32Array(n).fill(99);
    // One pass over the sky's points, which are thousands: each is tested against the 58.
    for (let k = 0; k < count; k += 1) {
      const x = p[k * 3]; const y = p[k * 3 + 1]; const z = p[k * 3 + 2];
      const len = Math.hypot(x, y, z) || 1;
      for (let i = 0; i < n; i += 1) {
        const d = dirs[i];
        if ((x * d[0] + y * d[1] + z * d[2]) / len < MATCH_COS) continue;
        if (m[k] < best[i]) { best[i] = m[k]; idx[i] = k; }
      }
    }
    const c = target.attributes.aColour.array;
    for (let i = 0; i < n; i += 1) {
      const k = idx[i];
      if (k >= 0) { col[i * 3] = c[k * 3]; col[i * 3 + 1] = c[k * 3 + 1]; col[i * 3 + 2] = c[k * 3 + 2]; }
    }
    geo.attributes.aColour.needsUpdate = true;
    // The put-out copy: the sky's own magnitudes are shared with its tiers and sorted for the draw range, so
    // they are never written; a copy with the 58 at 99 (too faint for any sky) is swapped in, and the base is
    // left on the geometry for sky/skyepoch.js, which swaps the same attribute far from now.
    const orig = target.userData.magBase || m;
    const dark = orig.slice();
    for (let i = 0; i < n; i += 1) if (idx[i] >= 0) dark[idx[i]] = 99;
    target.userData.magBase = orig;
    host = { geo: target, idx, base: best, orig, dark, out: false };
  }

  function putOut(on) {
    if (!host || host.out === on) return;
    host.out = on;
    // Off: put the base back only if the copy is still the one in; sky/skyepoch.js may have swapped its own in.
    if (!on && host.geo.attributes.aMag.array !== host.dark) return;
    host.geo.attributes.aMag.array = on ? host.dark : host.orig;
    host.geo.attributes.aMag.needsUpdate = true;
  }
  function restore() { putOut(false); host = null; }

  return {
    update(tMs, target) {
      const near = Math.abs(tMs - Date.now()) <= VAR_YEARS * YEAR_MS;
      // Bound only near now: far out the sky's points have moved (sky/skyepoch.js) and would not be found.
      if (near && target && target.attributes.aMag) bind(target);
      const on = !!host && near && host.geo === target;
      points.visible = on;
      putOut(on);
      if (!on) return;
      shown = 0;
      for (let i = 0; i < n; i += 1) {
        const v = magAt(rows[i], tMs);
        // Irregular, or a star with no point to take over: the catalogue's own magnitude, or nothing.
        mag[i] = v !== null ? v : host.idx[i] >= 0 ? host.base[i] : 99;
        if (host.idx[i] >= 0 || v !== null) shown += 1;
        // Moved with the sky's own point (sky/skyepoch.js writes the moved place there), so the two never part.
        const k = host.idx[i];
        if (k >= 0) {
          const p = host.geo.attributes.position.array;
          pos[i * 3] = p[k * 3]; pos[i * 3 + 1] = p[k * 3 + 1]; pos[i * 3 + 2] = p[k * 3 + 2];
        }
      }
      geo.attributes.aMag.needsUpdate = true;
      geo.attributes.position.needsUpdate = true;
    },
    state: () => ({ stars: n, matched: host ? host.idx.filter((k) => k >= 0).length : 0, shown }),
    dispose() { if (host) restore(); geo.dispose(); points.material.dispose(); root.remove(points); },
  };
}
