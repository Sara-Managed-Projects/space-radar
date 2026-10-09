// tests/test_spread.mjs -- the galaxy rung's three-second stall (internal #549): heavy builds run one step per turn.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const { spread } = await import(join(JS, 'scene/spread.js'));

// 1. one step per turn, in order, the promise after the last
{
  const log = [];
  let turns = 0;
  const queue = [];
  const schedule = (fn) => { turns++; queue.push(fn); };
  const done = spread([() => log.push('a'), () => log.push('b'), () => log.push('c')], schedule);
  check(log.length === 0, 'nothing runs before the first turn');
  let drained = 0;
  while (queue.length) { const fn = queue.shift(); fn(); drained++; if (drained === 1) check(log.join('') === 'a', 'the first turn runs one step'); }
  const n = await done;
  check(log.join('') === 'abc' && n === 3, `all three ran in order (${log.join('')})`);
  check(turns === 4, `one turn per step and one to finish (${turns})`);
}
// 2. a step that throws rejects and stops the rest
{
  const log = [];
  let rejected = null;
  await spread([() => log.push(1), () => { throw new Error('boom'); }, () => log.push(3)], (fn) => setTimeout(fn, 0)).catch((e) => { rejected = e; });
  check(rejected && rejected.message === 'boom' && log.join('') === '1', 'a throwing step rejects and the later ones do not run');
}
// 3. an empty list resolves
check((await spread([], (fn) => setTimeout(fn, 0))) === 0, 'an empty list resolves');

// 4. the Milky Way: built in pieces, the stage not blocked, prewarmed on the stellar rung
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const { createGalaxy } = await import(join(JS, 'scene/galaxy.js'));
  const raw = readFileSync(join(ROOT, 'site/data/galaxy.bin'));
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const scene = new THREE.Scene();
  let turns = 0;
  const g = createGalaxy(scene, { binBuffer: buffer, schedule: (fn) => { turns++; setTimeout(fn, 0); } });
  stage.setWorld('stellar'); stage.setTime(Date.UTC(2026, 9, 9));
  g.setOpacity(1);
  const p = g.ensureGeometry();
  check(g.group.children.length === 0, 'the call itself builds nothing: the points come in a later turn');
  await p;
  check(g.group.children.length === 3 && turns >= 4, `points, dust and twin, each in its own turn (${g.group.children.length} children, ${turns} turns)`);
  check(g.mode() === 'drawn' && g.dustCount() > 0, 'and the result is the same as before: drawn on the rung, with its dust');
  // prewarm shows every part for the compile and puts the visibility back
  stage.setWorld('earth');
  let sawVisible = null;
  const renderer = { compileAsync: (s) => { sawVisible = g.group.children.map((c) => c.visible); return Promise.resolve(); } };
  await g.prewarm(renderer, {});
  check(sawVisible && sawVisible.length === 3 && sawVisible.every(Boolean), 'prewarm shows all three parts for the compile');
  check(g.group.children.every((c) => !c.visible) && g.mode() === 'hidden', 'and hides them again on a world stage');
  g.dispose();
}
// 5. main.js asks for it on the stellar rung, and not on a metered connection
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  check(/id === 'stellar' && !galaxyPrewarm/.test(main) && /galaxy\.prewarm\(renderer, ctx\.camera\)/.test(main) && /saveData/.test(main), 'main.js prewarms the galaxy on the stellar rung unless data saving is on');
}
// 6. MANY POINTS AT ONCE (internal #549): one matrix for a frame change, equal to the exact call, and the exact call is made 20 times not 109 000
{
  const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
  const { stage } = await import(join(JS, 'scene/stage.js'));
  const tMs = Date.UTC(2026, 9, 9, 12);
  let worstRel = 0;
  for (const world of ['earth', 'sun', 'stellar', 'galaxy', 'local-group']) {
    stage.setWorld(world); stage.setTime(tMs);
    const A = stage.affineFrom('sun-inertial', tMs);
    check(A !== null, `${world}: the frame change is affine for far points`);
    if (!A) continue;
    let seed = 7;
    const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296; };
    const v = new THREE.Vector3();
    for (let k = 0; k < 200; k++) {
      const km = { x: (rnd() - 0.5) * 2e15, y: (rnd() - 0.5) * 2e15, z: (rnd() - 0.5) * 2e15 };
      stage.toSceneInto(km, 'sun-inertial', v, tMs);
      const g = [A.o[0] + A.x[0] * km.x + A.y[0] * km.y + A.z[0] * km.z, A.o[1] + A.x[1] * km.x + A.y[1] * km.y + A.z[1] * km.z, A.o[2] + A.x[2] * km.x + A.y[2] * km.y + A.z[2] * km.z];
      const scale = Math.max(1, Math.abs(v.x), Math.abs(v.y), Math.abs(v.z));
      worstRel = Math.max(worstRel, Math.abs(g[0] - v.x) / scale, Math.abs(g[1] - v.y) / scale, Math.abs(g[2] - v.z) / scale);
    }
  }
  check(worstRel < 1e-9, `the matrix agrees with the exact call to ${worstRel.toExponential(2)} of the point's size (under 1e-9)`);
  // a stage that bends positions is refused
  stage.setWorld('earth'); stage.setTime(tMs);
  stage.setViewAdjust((out) => out.multiplyScalar(1 + 1e-3 * Math.sin(out.x)));
  check(stage.affineFrom('sun-inertial', tMs) === null, 'a stage with a viewAdjust that bends positions gets no matrix');
  stage.setViewAdjust(null);
  // stars3d.rebuild on the Earth\'s stage asks the exact call only a handful of times
  const { createStars3d } = await import(join(JS, 'scene/stars3d.js'));
  const raw = readFileSync(join(ROOT, 'site/data/stars3d.bin'));
  const buffer = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
  const namesDoc = JSON.parse(readFileSync(join(ROOT, 'site/data/stars3d.names.json'), 'utf8'));
  const stars = createStars3d(new THREE.Scene(), { binBuffer: buffer, namesDoc });
  await stars.load();
  stage.setWorld('stellar'); stage.setTime(tMs);
  stars.setOpacity(1);
  await stars.ensureGeometry();
  let calls = 0;
  const real = stage.toSceneInto;
  stage.toSceneInto = function (...a) { calls++; return real.apply(this, a); };
  stage.setWorld('earth'); stage.setTime(tMs);
  stars.rebuild();
  stage.toSceneInto = real;
  check(calls < 100, `rebuilding 109 000 stars on the Earth's stage made ${calls} exact conversions (was 109 000)`);
  check(stars.mode() === 'shell', 'and the stars are the shell again');
  stage.setWorld('earth');
}
if (problems.length) { console.error('spread FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('spread ok: steps run one per turn in order, the galaxy builds in pieces and is prewarmed on the stellar rung');
