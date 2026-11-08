// tests/test_startwin.mjs -- a drawn system's host star and the same star in the catalogue (ui/startwin.js; 2.0.0 final
// look, finding 14: Barnard's Star reached by flying to its system said 5.96 ly and magnitude "-", and drew no AD 12 000
// distance line; on the stars rung it said 5.95 ly and 9.54).
//
//   node tests/test_startwin.mjs
//
// What it holds, on the shipped data (data/systems-index.js's rows through data/layers.js systemHostRecords, and
// data/stars3d.names.json through scene/stars3d.js recordsFromNames):
//   1. Barnard's Star's host record finds HYG's Barnard's Star, and after adoptTwin its card reads 5.95 ly, 9.54, HYG's
//      class, with its own id, place and the archive's radius kept, and both sources cited; a second adoptTwin is a no-op.
//   2. The twin's place matches the motion file (scene/stardeep.js matchStars at its 0.02 degrees), where the host
//      record's own place does not: the reason the line was missing.
//   3. No twin for a name with no catalogue star, for a planet, for a record of another layer, or for the right name
//      on the wrong side of the sky.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { starTwin, adoptTwin, TWIN_DEG } = await import(join(JS, 'ui/startwin.js'));
const { systemHostRecords } = await import(join(JS, 'data/layers.js'));
const { SYSTEM_INDEX } = await import(join(JS, 'data/systems-index.js'));
const { recordsFromNames } = await import(join(JS, 'scene/stars3d.js'));
const D = await import(join(JS, 'scene/stardeep.js'));
const M = await import(join(JS, 'sky/starmotion.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const stars = recordsFromNames(JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8')).rows);
const hosts = systemHostRecords(SYSTEM_INDEX);
const host = hosts.find((r) => r.id === 'star-barnards-star');
check(!!host, 'data/systems-index.js has Barnard\'s Star\'s system');

// 1. the card
if (host) {
  check(host.meta.distLy === 5.96 && host.meta.mag === undefined, `the host record alone is the archive's: ${host.meta.distLy} ly, magnitude ${host.meta.mag}`);
  const twin = starTwin(host, stars);
  check(!!twin && twin.layer === 'stars' && twin.name === "Barnard's Star", `the twin is HYG's Barnard's Star: ${twin && twin.id}`);
  if (twin) {
    const radius = host.meta.radiusSuns;
    adoptTwin(host, twin);
    check(host.meta.distLy === 5.95 && host.meta.mag === 9.54 && host.meta.spect === twin.meta.spect, `the card's facts are the stars rung's: ${host.meta.distLy} ly, ${host.meta.mag}, ${host.meta.spect}`);
    check(host.id === 'star-barnards-star' && host.layer === 'systems' && host.meta.radiusSuns === radius && host.meta.twin === twin.id, 'the host keeps its id, its layer and the archive\'s radius');
    check(/HYG/.test(host.meta.cite) && /Exoplanet Archive/.test(host.meta.cite), `both sources cited: ${host.meta.cite}`);
    const cite = host.meta.cite;
    adoptTwin(host, twin);
    check(host.meta.cite === cite, 'a second adoption changes nothing');

    // 2. the line's match
    const m = M.parseMotion(readFileSync(join(ROOT, 'site/data/starmotion.bin')).buffer.slice(0));
    const dirOf = (r) => { const q = D.eclToEq([r.pos.x, r.pos.y, r.pos.z]); const l = Math.hypot(...q); return new Float32Array([q[0] / l, q[1] / l, q[2] / l]); };
    const jTwin = D.matchStars(dirOf(twin), 1, m.dir, m.count, 0.02)[0];
    const jHost = D.matchStars(dirOf(host), 1, m.dir, m.count, 0.02)[0];
    check(jTwin >= 0 && Math.abs(D.distanceAt(m, jTwin, 11800 - 2000) - 3.77) < 0.1, `the twin has a motion record, 3.77 ly about AD 11 800 (index ${jTwin})`);
    check(jHost < 0, 'the host record\'s own place has none (the cause of the missing line)');
  }
}

// 3. no twin where there is none
const fake = (over) => ({ id: 'star-x', name: "Barnard's Star", klass: 'star', layer: 'systems', pos: host ? { ...host.pos } : { x: 1, y: 0, z: 0 }, meta: { aliases: [] }, ...over });
check(starTwin(fake({ name: 'Nobody 1', meta: { aliases: ['Nobody'] } }), stars) === null, 'a name with no catalogue star has no twin');
check(starTwin(fake({ klass: 'exoplanet' }), stars) === null, 'a planet has no twin');
check(starTwin(fake({ layer: 'stars' }), stars) === null, 'only a systems host looks for one');
check(starTwin(fake({ pos: host ? { x: -host.pos.x, y: -host.pos.y, z: -host.pos.z } : { x: -1, y: 0, z: 0 } }), stars) === null, `the right name on the wrong side of the sky is not a twin (${TWIN_DEG} degrees)`);
check(starTwin(null, stars) === null && starTwin(fake({}), null) === null, 'nothing in, nothing out');
check(adoptTwin(fake({}), null).meta.twin === undefined, 'no twin, no change');

// Every host with a twin is within TWIN_DEG of it by construction; say how many of the shipped systems have one.
const found = hosts.filter((h) => starTwin(h, stars)).length;
check(found >= 5, `at least five of the ${hosts.length} systems' stars are in the catalogue under their name: ${found}`);

if (problems.length) {
  console.error('test_startwin: FAIL');
  for (const p of problems) console.error('  - ' + p);
  process.exit(1);
}
console.log(`test_startwin: ok (${found} of ${hosts.length} system hosts have a catalogue twin)`);
