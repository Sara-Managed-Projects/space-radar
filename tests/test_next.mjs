// tests/test_next.mjs -- spec 0026 req 6: the Next moment lists what is coming, from records already held.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { buildNextItems, rowText, whenText, NEXT_CAP } = await import(join(JS, 'ui/next.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const now = Date.parse('2026-09-08T12:00:00Z');
const H = 3600e3, D = 24 * H;
const launch = (id, dt, extra = {}) => ({ id, name: id, layer: 'launches', klass: 'rocket', meta: { netMs: now + dt, ...extra } });
const neo = (id, dt, ld) => ({ id, name: id, layer: 'asteroids', klass: 'asteroid', meta: { closeApproachMs: now + dt, missDistanceLd: ld } });
const comet = (id, dt) => ({ id, name: id, layer: 'comets', klass: 'comet', meta: { perihelionMs: now + dt } });

const items = buildNextItems([launch('Falcon 9', 5 * H), neo('2026 AB', 2 * H, 3.2), comet('C/2026 X', 10 * D), launch('Past', -2 * H), launch('Far', 60 * D)], now);
check(items.map((i) => i.record.id).join(',') === '2026 AB,Falcon 9,C/2026 X', `nearest first, past and beyond-horizon dropped (${items.map((i) => i.record.id)})`);
check(items[0].kind === 'approach' && items[1].kind === 'launch' && items[2].kind === 'perihelion', 'kinds are recognised');
check(rowText(items[0], now).startsWith('2026 AB passes Earth in 2 hours, 3.2') && rowText(items[0], now).endsWith('the Moon’s distance away'), `an approach row reads right: ${rowText(items[0], now)}`);
check(rowText(items[1], now) === 'Falcon 9 lifts off in 5 hours', `a launch row reads right: ${rowText(items[1], now)}`);
check(rowText({ kind: 'launch', record: { name: 'Vague' }, tMs: now + 3 * D, precision: 'Month' }, now).includes('not fixed yet'), 'a launch with a rough date says so');
check(whenText(now + 30e3, now) === 'about now' && whenText(now + 40 * 60e3, now) === 'in 40 minutes', 'minutes and about-now');
const many = Array.from({ length: 20 }, (_, i) => launch(`L${i}`, (i + 1) * H));
check(buildNextItems(many, now).length === NEXT_CAP, `capped at ${NEXT_CAP}`);
check(buildNextItems(null, now).length === 0 && buildNextItems([{ id: 'x' }, null], now).length === 0, 'bad input gives an empty list, never a throw');
// passes need an observer AND orbit-bearing records; without either, nothing is added and nothing throws
check(buildNextItems([launch('A', H)], now, { observer: { latRad: 0.9, lonRad: 0 } }).length === 1, 'an observer with no orbits adds no passes and breaks nothing');

if (problems.length) { console.error('next FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('next ok: launches, close approaches and perihelia from held records, nearest first, capped, honest about rough dates');
