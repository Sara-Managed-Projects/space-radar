// internal #325: a material disposed while its compile is polled must not throw from a timer.
import { compileSafe } from '../site/js/scene/safecompile.js';
let fails = 0;
const check = (ok, what) => { if (!ok) { fails++; console.error('FAIL', what); } else console.log('ok  ', what); };
const errors = [];
process.on('uncaughtException', (e) => errors.push(String(e)));
const mats = [{ id: 'a' }, { id: 'b' }, { id: 'c' }];
let readyAt = 0;
const props = new Map(mats.map((m) => [m, { currentProgram: { isReady: () => Date.now() >= readyAt } }]));
const renderer = { properties: { get: (m) => props.get(m) }, compile: () => new Set(mats) };
// 1. the stage change disposes a material mid-compile: three would throw reading undefined.isReady
readyAt = Date.now() + 80;
const p = compileSafe(renderer, {}, {}, null);
props.delete(mats[1]); // properties.remove on dispose
props.set(mats[2], {}); // a disposed material whose program is gone
const done = await Promise.race([p.then(() => 'done'), new Promise((r) => setTimeout(() => r('hung'), 2000))]);
check(done === 'done', 'resolves when materials are disposed during the poll');
// 2. a program that never links ends at the cap
const never = { properties: { get: () => ({ currentProgram: { isReady: () => false } }) }, compile: () => new Set([{}]) };
const t0 = Date.now();
await compileSafe(never, {}, {}, null, 60);
check(Date.now() - t0 < 1000, 'a program that never links ends at the cap');
// 3. a stand-in renderer with only compileAsync is used as is
let used = false;
await compileSafe({ compileAsync: () => { used = true; return Promise.resolve(); } }, {}, {}, null);
check(used, 'falls back to compileAsync without a property map');
await new Promise((r) => setTimeout(r, 50));
check(errors.length === 0, 'no uncaught error from a timer');
process.exit(fails ? 1 : 0);
