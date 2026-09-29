import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseCelestrakGP } from '../site/js/data/parsers.js';
import { sgp4, sgp4State, epochMs, MAX_AGE_MS } from '../site/js/propagate/sgp4.js';

const rows = JSON.parse(readFileSync(new URL('./fixtures/harvest/celestrak_gp.json', import.meta.url)));
const [iss] = parseCelestrakGP(rows);
assert.equal(iss.id, 'sat-25544');
const epoch = epochMs(iss);
const p = sgp4(iss, epoch);
const next = sgp4(iss, epoch + 60000);
assert.ok(Math.hypot(p.x, p.y, p.z) > 6700);
assert.ok(Math.hypot(p.x, p.y, p.z) < 7000);
const distance = Math.hypot(next.x - p.x, next.y - p.y, next.z - p.z);
assert.ok(distance > 400 && distance < 500, `ISS travels ${distance} km in a minute`);
const state = sgp4State(iss, epoch);
assert.deepEqual({ x: state.x, y: state.y, z: state.z, frame: state.frame, cls: state.cls }, p);
assert.ok(Math.hypot(state.vx, state.vy, state.vz) > 7);
assert.ok(Math.hypot(state.vx, state.vy, state.vz) < 8);
for (const t of [epoch - MAX_AGE_MS - 1, epoch + MAX_AGE_MS + 1, NaN, Infinity]) {
  assert.equal(sgp4(iss, t), null);
  assert.equal(sgp4State(iss, t), null);
}
assert.equal(sgp4State({}, epoch), null);
// The same live-position path also accepts CelesTrak's two-line format.
const tle = { tle: [
  '1 25544U 98067A   26250.49846501  .00005306  00000-0  10435-3 0  9998',
  '2 25544  51.6306 252.7093 0004984 115.8922 244.2580 15.49018229584510',
] };
const tlePosition = sgp4(tle, epoch);
assert.ok(tlePosition);
assert.ok(Math.hypot(tlePosition.x - p.x, tlePosition.y - p.y, tlePosition.z - p.z) < 1);
console.log('sgp4 ok: CelesTrak OMM and TLE move in orbit; positions and velocities reject stale data');
