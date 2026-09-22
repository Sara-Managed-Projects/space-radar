// tests/test_next.mjs -- spec 0026 req 6: the Next moment lists what is coming, from records already held.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { buildNextItems, rowText, whenText, NEXT_CAP, balance, PASS_ROWS } = await import(join(JS, 'ui/next.js'));
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

// WHICH EIGHT. With a place set, London's list on 2026-09-22 was eight passes in the next ten minutes --
// SL-8 R/B twice -- and not tomorrow's launch nor any comet. At most PASS_ROWS passes, a crewed
// station's first; one of each event kind before the rest fill by time; repeated names numbered.
{
  const pass = (name, min, layer = 'visual', klass = 'rocket', noradId = null) => ({ kind: 'pass', tMs: now + min * 60e3, record: { name, layer, klass, meta: { noradId } } });
  const rows = balance([
    pass('SL-8 R/B', 1, 'visual', 'rocket', 12139), pass('SL-8 R/B', 1.5, 'visual', 'rocket', 11267), pass('CZ-2C R/B', 2), pass('SL-16 R/B', 4),
    pass('SL-14 R/B', 6), pass('SAOCOM 1A', 7, 'visual', 'satellite'), pass('H-2A R/B', 8), pass('SL-3 R/B', 10),
    pass('ISS (ZARYA)', 95, 'stations', 'station'), pass('KNACKSAT-2', 20 * 60, 'stations', 'satellite'),
    { kind: 'launch', tMs: now + 26 * H, record: { name: 'Long March 8A', layer: 'launches', meta: {} } },
    { kind: 'perihelion', tMs: now + 20 * D, record: { name: '123P/West-Hartley', layer: 'comets', meta: {} } },
  ]);
  const kinds = rows.map((r) => r.kind);
  check(rows.length <= NEXT_CAP, 'still capped');
  check(kinds.filter((k) => k === 'pass').length <= PASS_ROWS + (NEXT_CAP - PASS_ROWS - 2), 'passes do not crowd out the events');
  check(kinds.includes('launch') && kinds.includes('perihelion'), `tomorrow's launch and the comet both make the list: ${kinds}`);
  check(rows.some((r) => r.record.name === 'ISS (ZARYA)'), 'the ISS pass makes the list, though eight stages pass sooner');
  const firstPasses = balance([pass('SL-8 R/B', 1), pass('KNACKSAT-2', 20 * 60, 'stations', 'satellite'), pass('SL-16 R/B', 4), pass('SL-3 R/B', 10)]).filter((r) => r.kind === 'pass').slice(0, PASS_ROWS).map((r) => r.record.name);
  check(!firstPasses.includes('KNACKSAT-2') || firstPasses.length > 3, `a CubeSat in the stations layer is not a crewed station: ${firstPasses}`);
  const sl8 = rows.filter((r) => r.record.name === 'SL-8 R/B').map((r) => rowText(r, now));
  check(sl8.length < 2 || new Set(sl8).size === sl8.length, `two stages both called SL-8 R/B read differently: ${sl8}`);
  check(rows.every((r, i) => i === 0 || rows[i - 1].tMs <= r.tMs), 'shown in time order');
  const stationRows = balance([
    { kind: 'pass', tMs: now + 95 * 60e3, record: { name: 'POISK', layer: 'stations', klass: 'station', meta: { noradId: 36086 } } },
    { kind: 'pass', tMs: now + 95 * 60e3 + 5e3, record: { name: 'ISS (ZARYA)', layer: 'stations', klass: 'station', meta: { noradId: 25544, why: 'people live here' } } },
    { kind: 'pass', tMs: now + 95 * 60e3 + 8e3, record: { name: 'ISS (NAUKA)', layer: 'stations', klass: 'station', meta: { noradId: 49044 } } },
  ]).filter((r) => r.kind === 'pass');
  check(stationRows.length === 1 && stationRows[0].record.name === 'ISS (ZARYA)', `one pass for the station and its modules, told as the station: ${stationRows.map((r) => r.record.name)}`);
}

// Meteor showers (2026-09-22): the registry had eight and "Coming up" listed none.
{
  const { showerItems, rowText: rt } = await import(join(JS, 'ui/next.js'));
  const { SHOWERS } = await import(join(JS, 'data/showers.js'));
  const sept22 = new Date(2026, 8, 22, 20, 0).getTime();
  const within = showerItems(sept22, 30 * D, SHOWERS);
  check(within.length === 1 && within[0].showerId === 'orionids', `from 22 September the next month holds the Orionids (${within.map((x) => x.showerId)})`);
  const text = rt(within[0], sept22);
  check(/The Orionids meteor shower peaks around .*21 Oct/.test(text) && /up to 20 an hour/.test(text) && !/\d\d:\d\d/.test(text), `a shower row gives a date, never a time: "${text}"`);
  const onTheDay = showerItems(new Date(2026, 11, 14, 23, 0).getTime(), 30 * D, SHOWERS).map((x) => x.showerId);
  check(onTheDay.includes('geminids') && onTheDay.includes('ursids'), `on the night of the peak it is still listed (${onTheDay})`);
  const wrap = showerItems(new Date(2026, 11, 20).getTime(), 30 * D, SHOWERS).map((x) => x.showerId);
  check(wrap.includes('quadrantids'), `in late December the Quadrantids of next January are listed (${wrap})`);
  const withShowers = buildNextItems([], sept22, { showers: SHOWERS });
  check(withShowers.length === 1 && withShowers[0].kind === 'shower' && withShowers[0].record === null, 'with nothing else loaded the list still has the shower');
}

if (problems.length) { console.error('next FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('next ok: launches, close approaches and perihelia from held records, nearest first, capped, honest about rough dates');
