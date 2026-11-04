// tests/test_keeptrip_world_of_target.mjs -- worldOfTarget says which world a trip stop stands on, for the files a trip needs offline: a world, or a record in a <world>-fixed frame, else null (public #839).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { worldOfTarget } = await import(join(JS, 'ui/keeptrip.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const rows = { iss: { frame: 'earth-fixed' }, apollo11: { frame: 'moon-fixed' }, moonsat: { frame: 'moon-inertial' }, nof: {} };
const byId = (id) => rows[id];
check(worldOfTarget({ world: 'mars' }, byId) === 'mars', 'a target with its own world');
check(worldOfTarget({ record: 'apollo11' }, byId) === 'moon', 'a record in a moon-fixed frame');
check(worldOfTarget({ site: 'apollo11' }, byId) === 'moon', 'a site is read like a record');
check(worldOfTarget({ record: 'iss' }, byId) === 'earth', 'a record in an earth-fixed frame');
check(worldOfTarget({ record: 'moonsat' }, byId) === null, 'an inertial frame is not a place on a world');
check(worldOfTarget({ record: 'nof' }, byId) === null, 'a record with no frame');
check(worldOfTarget({ record: 'zzz' }, byId) === null, 'an unknown record');
check(worldOfTarget({ record: 'iss' }, null) === null, 'no lookup');
check(worldOfTarget(null, byId) === null, 'no target');

if (problems.length) { console.error('worldOfTarget FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('worldOfTarget ok: a world, or a fixed-frame record or site, gives its world; an inertial or missing frame, an unknown record, no lookup and no target give null');
