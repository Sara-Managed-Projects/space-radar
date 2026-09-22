// tests/test_scenenote.mjs -- the scene says so when no satellite could be read at all.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { refusedEverywhere } = await import(join(JS, 'ui/scenenote.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const refused = ['stations', 'active', 'starlink', 'visual', 'last30'].map((f) => ({ id: `celestrak-${f}`, state: 'could-not-look' }));
const none = new Map([['stations', 0], ['visual', 0]]);
check(refusedEverywhere([...refused, { id: 'swpc-kp', state: 'ok' }], none), 'every CelesTrak file refused and no satellites: the note shows');
check(!refusedEverywhere(refused.map((s, i) => (i === 0 ? { ...s, state: 'ok' } : s)), none), 'one CelesTrak file read: no note');
check(!refusedEverywhere(refused, new Map([['stations', 6], ['visual', 0]])), 'satellites on the map (a cached copy): no note');
check(!refusedEverywhere([{ id: 'swpc-kp', state: 'could-not-look' }], none), 'no CelesTrak rows at all is not "refused"');
check(!refusedEverywhere(null, none), 'nothing known, no note');

if (problems.length) { console.error('scene note FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('scene note ok: shown only when every CelesTrak file was refused and no satellite is on the map');
