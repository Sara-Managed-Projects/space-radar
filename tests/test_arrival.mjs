// A SELECTED STATION ARRIVES CLOSE ENOUGH TO BE DRAWN AT FULL SIZE.
//
// Clicking Tiangong parked the camera 7 000 km away -- 35 % of the stations layer's nearKm -- and at
// that distance scene/heroes.js's altitude cap (a model never larger than its height above the
// ground, so it cannot reach into the planet) shrank the selection to 76 px, smaller than the
// unselected satellites around it. Measured in a browser, 2026-09-21. closeUpDistance() solves the
// arrival from the cap itself, and main.js takes the nearer of the two.
//
// heroScale is restated here rather than imported: it is private to heroes.js, and the numbers ARE
// the point -- if its arithmetic changes, this is meant to break and be re-derived.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const THREE = await import(join(JS, '../vendor/three.module.min.js'));
const { closeUpDistance, ARRIVAL_REACH } = await import(join(JS, 'scene/heroes.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const SELECTED_PX = 260, CLEARANCE = 0.9, EARTH_KM = 6371;
const f = 1 / Math.tan((45 / 2) * Math.PI / 180);
const u = (km) => km / stage.unitKm;
// the diameter heroScale draws, in pixels, for a model of this reach at distance d (scene units)
const drawnPx = (altKm, d, h, reach) => {
  const want = (SELECTED_PX * 2 * d) / (h * f);
  const scale = Math.min(want, (u(altKm) * CLEARANCE) / reach);
  return (scale * h * f) / (2 * d);
};
const at = (altKm) => new THREE.Vector3(u(EARTH_KM + altKm), 0, 0);

check(stage.worldId === 'earth', `this test assumes the Earth stage, got ${stage.worldId}`);
for (const [name, altKm] of [['Tiangong', 395], ['ISS', 431], ['Hubble', 530], ['a Starlink', 550]]) {
  for (const h of [568, 750, 1200]) {
    const d = closeUpDistance(at(altKm), h, f);
    check(Number.isFinite(d) && d > 0, `${name} at h=${h}: no finite arrival (${d})`);
    // the whole point: every model up to the widest one shipped is drawn at its full size there
    const px = drawnPx(altKm, d, h, ARRIVAL_REACH);
    check(px >= SELECTED_PX - 0.5, `${name} at h=${h}: arrives ${Math.round(d * stage.unitKm)} km out and draws ${px.toFixed(0)} px, not ${SELECTED_PX}`);
    // ... and it is not pointlessly close: a little farther and the cap would bite
    check(drawnPx(altKm, d * 1.1, h, ARRIVAL_REACH) < SELECTED_PX - 1, `${name} at h=${h}: the arrival is closer than it needs to be`);
  }
}
// the reproduction: the old 7 000 km arrival draws Tiangong far below the selection size
const old = drawnPx(395, u(7000), 750, 0.698);
check(old < 100, `the old arrival must reproduce the bug (Tiangong at 7 000 km drew ${old.toFixed(0)} px)`);
// nothing to clamp: at or below the ground, and garbage, do not constrain the arrival
check(closeUpDistance(at(0), 750, f) === Infinity, 'a ground site is not constrained by an altitude cap');
check(closeUpDistance(new THREE.Vector3(u(1000), 0, 0), 750, f) === Infinity, 'a point inside the planet is not constrained');
check(closeUpDistance(null, 750, f) === Infinity, 'no position, no constraint');
check(closeUpDistance(at(400), 0, f) === Infinity, 'no viewport, no constraint');

if (problems.length) { console.error('arrival FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
const d = closeUpDistance(at(395), 750, f) * stage.unitKm;
console.log(`arrival ok: Tiangong is reached from ${Math.round(d)} km at 750 px tall (was 7 000), drawn at the full ${SELECTED_PX} px; the old arrival drew ${old.toFixed(0)} px`);
