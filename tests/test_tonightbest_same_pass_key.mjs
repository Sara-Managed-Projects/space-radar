// tests/test_tonightbest_same_pass_key.mjs -- samePassKey makes two passes the same pass when the plain name and the minute they start are the same (public #833).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { samePassKey } = await import(join(JS, 'sky/tonightbest.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const iss = (startMs) => ({ record: { name: 'ISS (ZARYA)' }, startMs });
check(samePassKey(iss(120000)) === 'ISS (ZARYA)@2', `two minutes in (${samePassKey(iss(120000))})`);
check(samePassKey(iss(130000)) === 'ISS (ZARYA)@2', 'ten seconds later is the same minute');
check(samePassKey(iss(150000)) === 'ISS (ZARYA)@3', 'half a minute rounds up');
check(samePassKey({ record: { name: 'CZ-4C R/B', klass: 'rocket' }, startMs: 60000 }) === 'Rocket body · CZ-4C@1', `a rocket body gets its plain name (${samePassKey({ record: { name: 'CZ-4C R/B', klass: 'rocket' }, startMs: 60000 })})`);
check(samePassKey(null) === 'Unnamed object@0', 'nothing at all still gives a key');

if (problems.length) { console.error('samePassKey FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('samePassKey ok: name@minute, nearby start times collide, the next minute does not, and no pass still gives a key');
