// tests/test_trips_panel.mjs -- the Trips panel leads with the trips that can run.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { tripOrder } = await import(join(JS, 'ui/controls.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// 2026-09-22, CelesTrak refusing the IP: the headline trip, greyed with "Only 1 of the stops on this
// trip can be found right now", led the panel above two that would have run.
const refused = tripOrder([
  { id: 'people-in-space', index: 0, off: true },
  { id: 'strangest-things', index: 1, off: false },
  { id: 'to-the-edge', index: 2, off: false },
]);
check(refused.join() === 'strangest-things,to-the-edge,people-in-space', `runnable trips first, the refused one last and still there (${refused})`);
const allRun = tripOrder([{ id: 'a', index: 0, off: false }, { id: 'b', index: 1, off: false }, { id: 'c', index: 2, off: false }]);
check(allRun.join() === 'a,b,c', 'with everything runnable the registry order stands');
const noneRun = tripOrder([{ id: 'a', index: 0, off: true }, { id: 'b', index: 1, off: true }]);
check(noneRun.join() === 'a,b', 'with nothing runnable the registry order stands');
check(tripOrder(null).length === 0, 'nothing in, nothing out');

if (problems.length) { console.error('trips panel FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trips panel ok: the trips that can run lead; a refused one stays, with its reason, at the end');
