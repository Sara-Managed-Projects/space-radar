#!/usr/bin/env node
// tests/test_moments_pose.mjs -- the part poses and the carried riders of release 1.7.7 (site/js/moments/pose.js; internal #1058).
// A part's keyframes scale, turn and move it about a point; a rider's keyframes move it about its host; the validator knows both; the player uses both
// (read as text: the player is a browser module, so what it must call is checked in its source).
//   node tests/test_moments_pose.mjs
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import assert from 'node:assert/strict';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const P = await import(pathToFileURL(join(ROOT, 'site/js/moments/pose.js')).href);
const F = await import(pathToFileURL(join(ROOT, 'site/js/moments/format.js')).href);
const near = (a, b, e = 1e-9) => a.every((x, i) => Math.abs(x - b[i]) < e);

// quaternions
const qz90 = P.quatAxis([0, 0, 1], 90);
assert.ok(near(qz90, [0, 0, Math.SQRT1_2, Math.SQRT1_2]), 'a quarter turn about Z');
const cols = P.quatColumns(qz90);
assert.ok(near(cols[0], [0, 1, 0]) && near(cols[1], [-1, 0, 0]) && near(cols[2], [0, 0, 1]), 'a quarter turn about Z sends X to Y and Y to -X');
assert.ok(near(P.slerp([0, 0, 0, 1], qz90, 0), [0, 0, 0, 1]) && near(P.slerp([0, 0, 0, 1], qz90, 1), qz90), 'slerp keeps its ends');
assert.ok(near(P.slerp([0, 0, 0, 1], qz90, 0.5), P.quatAxis([0, 0, 1], 45)), 'slerp half-way is the half turn');
assert.ok(near(P.quatMul(qz90, qz90), P.quatAxis([0, 0, 1], 180)), 'two quarter turns are a half turn');

// a part pose: scale along the vehicle's axes about a point, then turn, then move
const key = (t, o) => ({ t, action: 'pose', about: [1, 2, 3], ...o });
const keys = [key(0, { scale: [1, 0.1, 1] }), key(10, { scale: [1, 1, 1] })];
const centre = [1, 5, 3];                                                   // 3 m along Y from the point
assert.ok(near(P.partPoseAt(keys, centre, 0).centre, [1, 2.3, 3]) && near(P.partPoseAt(keys, centre, 10).centre, centre), 'the part\'s centre follows the scale about the point');
assert.ok(near(P.partPoseAt(keys, centre, 5).centre, [1, 2 + 3 * 0.55, 3]), 'half-way is half-way (linear)');
assert.ok(near(P.partPoseAt(keys, centre, -50).cols[1], [0, 0.1, 0]) && near(P.partPoseAt(keys, centre, 99).cols[1], [0, 1, 0]), 'before the first key and after the last it holds');
const ease = [key(0, {}), key(10, { pos: [10, 0, 0], ease: 'smooth' })];
assert.ok(P.partPoseAt(ease, [0, 0, 0], 2.5).centre[0] < 2.5 && Math.abs(P.partPoseAt(ease, [0, 0, 0], 5).centre[0] - 5) < 1e-9, 'a smooth key eases in and out');
const turn = [key(0, {}), key(1, { quat: qz90 })];
assert.ok(near(P.partPoseAt(turn, [2, 2, 3], 1).centre, [1, 3, 3]), 'a quarter turn about the point (1, 2, 3) sends a centre 1 m along X to 1 m along Y');
assert.ok(near(P.partPoseAt(turn, [2, 2, 3], 1).cols[0], [0, 1, 0]), 'and turns the part\'s own axis X to Y');
assert.equal(P.partPoseAt([], centre, 0), null, 'no keys, no pose');
assert.deepEqual(P.poseKeys([{ action: 'hide' }, key(1, {})]).length, 1, 'only the pose events are keyframes');

// a carried rider
const car = [{ t: 0, at: [0, 0, 0], quat: [0, 0, 0, 1] }, { t: 10, at: [10, 0, 0], quat: qz90 }];
const c5 = P.carrierAt(car, 5);
assert.ok(near(c5.at, [5, 0, 0]) && near(c5.quat, P.quatAxis([0, 0, 1], 45)), 'a rider is half-way and half-turned at half-time');
assert.equal(P.carrierAt([], 5), null, 'no keys, no carrier');

// the validator
const base = JSON.parse(readFileSync(join(ROOT, 'site/data/moments/hubble-deployment.json'), 'utf8'));
const copy = () => JSON.parse(JSON.stringify(base));
const words = new Proxy({}, { get: () => 'a word' });
const problems = (m) => F.validateMoment(m, { words });
assert.ok(F.ACTIONS.includes('pose'), 'pose is an action');
let m = copy(); m.tracks.parts.find((e) => e.action === 'pose').quat = [0, 0, 1];
assert.ok(problems(m).some((p) => /pose is/.test(p)), 'a pose quaternion must have four numbers');
m = copy(); m.tracks.parts.find((e) => e.action === 'pose').ease = 'cubic';
assert.ok(problems(m).some((p) => /ease is smooth/.test(p)), 'only smooth is an ease');
m = copy(); m.vehicles.find((v) => v.rideOn && v.rideOn.keys).rideOn.keys[3].quat = [1, 2];
assert.ok(problems(m).some((p) => /rideOn.keys/.test(p)), 'a carrier key needs at, quat and a time');
m = copy(); m.vehicles.find((v) => v.rideOn && v.rideOn.keys).rideOn.keys.reverse();
assert.ok(problems(m).some((p) => /rideOn.keys/.test(p)), 'carrier keys are in time order');

// the player calls them
const player = readFileSync(join(ROOT, 'site/js/moments/player.js'), 'utf8');
assert.ok(/partPoseAt\(/.test(player) && /carrierAt\(/.test(player) && /poseKeys\(/.test(player), 'the player asks pose.js for a part\'s pose and a rider\'s place');
assert.ok(/lookAt/.test(readFileSync(join(ROOT, 'site/js/moments/director.js'), 'utf8')), 'the director reads a shot\'s lookAt');
console.log('moments pose ok: quaternions, a part\'s keyframes (scale, turn, move, ease, hold), a rider\'s keyframes, the validator, the player and the director use them');
