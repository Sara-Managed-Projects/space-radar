// tests/test_searchrows.mjs -- public #312 and internal #131, #419 item 10: what a search row says,
// one row for a station's modules, a planet's moons after it, and the trips, missions and events a
// query names (ui/searchrows.js, ui/search.js).
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { buildIndex, findMatches, closest, MOONS_AFTER } = await import(join(JS, 'ui/search.js'));
const R = await import(join(JS, 'ui/searchrows.js'));
const { LAYERS } = await import(join(JS, 'data/layers.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const sat = (id, name, layer = 'active', meta = {}, klass = 'satellite') => ({ id, name, klass, layer, propagator: 'sgp4', meta });
const world = (id, name) => ({ id, name, klass: 'world', layer: 'planets', meta: {} });
const recs = [
  sat('sat-25544', 'ISS (ZARYA)', 'stations', { noradId: 25544, why: 'x', displayName: 'International Space Station' }, 'station'),
  sat('sat-49044', 'ISS (NAUKA)', 'stations', { noradId: 49044 }, 'station'),
  sat('sat-56757', 'JUPITER 3 (ECHOSTAR 24)', 'active', { noradId: 56757 }),
  world('jupiter', 'Jupiter'), world('io', 'Io'), world('europa', 'Europa'), world('ganymede', 'Ganymede'), world('callisto', 'Callisto'), world('amalthea', 'Amalthea'),
  world('mars', 'Mars'), world('saturn', 'Saturn'),
  { id: 'star-1', name: 'Betelgeuse', klass: 'star', layer: 'stars', pos: { x: 1, y: 0, z: 0 }, meta: {} },
];
const index = buildIndex(recs, LAYERS);

// A planet's moons after it, before a satellite that shares its name.
{
  const j = findMatches(index, 'jupiter').hits.map((h) => h.record.id);
  check(j[0] === 'jupiter', `"jupiter" is the planet first (${j[0]})`);
  check(j.slice(1, 1 + MOONS_AFTER).join() === 'io,europa,ganymede,callisto', `then its first four moons, in the registry's order (${j.slice(1, 5).join()})`);
  check(j.indexOf('sat-56757') === 1 + MOONS_AFTER, `and only then the satellite called JUPITER 3 (at ${j.indexOf('sat-56757')})`);
  check(!j.includes('amalthea'), 'a fifth moon is not brought in: the list is eight rows');
  check(findMatches(index, 'jupit').hits.every((h) => h.record.klass !== 'world' || h.record.id === 'jupiter'), 'a prefix brings no moons: only the whole name does');
}
// A typo still finds it.
check((closest(index, 'jupitr')[0] || {}).record === recs[3], '"jupitr" offers Jupiter');
check((closest(index, 'satrun')[0] || {}).record.id === 'saturn', '"satrun" offers Saturn');

// The row: the name people use, what it is, the catalogue's string, where it is now.
{
  const up = { observer: { latRad: 0.9, lonRad: 0 }, satAltAz: () => ({ altDeg: 41, azDeg: 225 }), bodyAltAz: () => ({ altDeg: -20, azDeg: 10 }), skyAltAz: () => ({ altDeg: 9, azDeg: 90 }) };
  const iss = R.describe(recs[0], up);
  check(iss.title === 'International Space Station' && iss.also === 'ISS (ZARYA)' && iss.kind === COPY.searchRows.kinds.station, `the station's row: ${JSON.stringify(iss)}`);
  check(iss.where === 'up now, south-west', `and where it is: "${iss.where}"`);
  const jup = R.describe(recs[3], up);
  check(jup.kind === 'Planet' && jup.also === '' && jup.where === COPY.searchRows.downNow, `Jupiter under the horizon: ${JSON.stringify(jup)}`);
  check(R.describe(recs[4], null).kind === 'Moon' && R.describe(recs[4], null).where === '', 'Io is a moon, and with no place set there is no "where"');
  check(R.describe(recs[11], up).where === 'low in the east now', `nine degrees up is "low", not "up": the same ten degrees a pass must clear (${R.describe(recs[11], up).where})`);
  check(R.describe({ id: 'x', name: 'Betelgeuse', klass: 'exotic', meta: { kind: 'star' } }, null).kind === 'Star' && R.describe({ id: 'y', name: 'Sgr A*', klass: 'exotic', meta: { kind: 'blackhole' } }, null).kind === 'Black hole', 'a famous star and a black hole say which they are');
  check(R.describe({ id: 'a11', name: 'Apollo 11', klass: 'site', frame: 'moon-fixed', meta: {} }, null).kind === COPY.searchRows.kinds.landing && R.describe({ id: 'ksc', name: 'KSC', klass: 'site', frame: 'earth-fixed', meta: {} }, null).kind === 'Place', 'a site on the Moon is a landing site');
  check(R.whereNow(recs[0], { observer: null }) === null && R.whereNow({ id: 'earth', klass: 'world' }, up) === null, 'no place, or the Earth itself: nothing said');
  check(R.whereNow(recs[0], { ...up, satAltAz: () => { throw new Error('x'); } }) === null, 'a position that cannot be worked out says nothing');
  // One row for the station's modules.
  const hits = findMatches(index, 'iss').hits.map((h) => ({ ...h, row: R.describe(h.record, null) }));
  check(hits.length === 2 && R.mergeSame(hits).length === 1 && R.mergeSame(hits)[0].record.id === 'sat-25544', '"iss" is one row, the hand-picked record standing for its modules');
}

// Trips, missions, events, and the suggestion.
{
  const apollo = R.findExtras('apollo', 6);
  const kinds = apollo.map((x) => x.extra);
  check(kinds.includes('trip') && kinds.includes('mission') && kinds.includes('event'), `"apollo" finds a trip, the mission and an event (${kinds.join()})`);
  check(apollo.filter((x) => x.extra === 'event' && x.id.startsWith('apollo-11.')).length === 1, 'one event of Apollo 11, not all of them');
  check((apollo.find((x) => x.extra === 'event') || {}).id === 'apollo-11.landing', `and it is the landing (${(apollo.find((x) => x.extra === 'event') || {}).id})`);
  check(R.findExtras('apollo').length <= R.EXTRA_ROWS, 'never more than three extra rows by default');
  check(R.findExtras('apolo', 6).some((x) => x.extra === 'mission'), 'a letter short still finds the mission');
  check(R.findExtras('eagle', 6).some((x) => x.id === 'apollo-11.landing'), 'an event is found by its own title');
  check(R.findExtras('near me')[0].extra === 'suggest' && R.findExtras('tonight')[0].id === 'near-me-tonight', '"near me" and "tonight" lead with the suggestion');
  check(R.findExtras('ap').length === 0 && R.findExtras('25544').length === 0, 'two letters, or a number, find no extras');
  check(R.suggestions().length === 1 && R.suggestions()[0].name === COPY.searchRows.nearMe, 'before anything is typed: Near me tonight');
  const voy = R.findExtras('voyager', 6);
  check(voy.filter((x) => x.extra === 'mission').length === 2, `"voyager" finds both missions (${voy.map((x) => x.id).join()})`);
  // What a row does.
  const calls = [];
  const ctx = { trip: { start: (id) => calls.push(['trip', id]) }, explore: { setTab: (id) => calls.push(['tab', id]) }, recordById: (id) => ({ id }), select: (r) => calls.push(['select', r.id]), wantMissions: () => ({ then: (fn) => fn({ openEvent: (c, id) => { calls.push(['event', id]); return true; } }) }) };
  for (const x of [apollo.find((e) => e.extra === 'trip'), apollo.find((e) => e.extra === 'mission'), apollo.find((e) => e.extra === 'event'), R.suggestions()[0]]) check(R.runExtra(ctx, x) === true, `the ${x.extra} row is followed`);
  check(calls.map((c) => c[0]).join() === 'trip,select,event,tab' && calls[3][1] === 'tonight', `each in its own way (${JSON.stringify(calls)})`);
  check(R.runExtra({}, apollo[0]) === false, 'and a row that cannot be followed says so');
}

// --- a class icon for a row, and a constellation as one row (internal #432) -------------------------
{
  const name = (r) => R.rowIconName({ record: r });
  check(name({ id: 'sat-1', klass: 'satellite' }) === 'satellite' && name({ id: 'sat-25544', klass: 'station' }) === 'satellite' && name({ id: 'x', klass: 'telescope' }) === 'telescope' && name({ id: 'l', klass: 'rocket' }) === 'rocket', 'a satellite, a station, a telescope and a rocket have their icons');
  check(name({ id: 'sun', klass: 'world' }) === 'sun' && name({ id: 'mars', klass: 'world' }) === 'globe' && name({ id: 'moon', klass: 'world', meta: { parent: 'earth' } }) === 'moon', `the Sun, a planet and a moon differ (${name({ id: 'moon', klass: 'world', meta: { parent: 'earth' } })})`);
  check(name({ id: 's', klass: 'star' }) === 'star' && name({ id: 'm31', klass: 'dso' }) === 'sparkles' && name({ id: 'p', klass: 'site' }) === 'map-pin' && name({ id: 'st', klass: 'storm' }) === 'tornado', 'a star, a deep-sky object, a place and a storm');
  check(name({ id: 'd', klass: 'debris' }) === null && name({ id: 'a', klass: 'asteroid' }) === null && name({ id: 'c', klass: 'comet' }) === null && name({ id: 'e', klass: 'exotic' }) === null, 'the classes with no honest icon keep the dot');
  check(R.rowIconName({ extra: 'trip' }) === 'play' && R.rowIconName({ extra: 'event' }) === 'flag' && R.rowIconName({ extra: 'suggest' }) === 'compass' && R.rowIconName({ extra: 'group' }) === 'satellite', 'a trip, an event, the suggestion and a constellation have theirs');
  const src = readFileSync(join(ROOT, 'site/js/ui/searchrows.js'), 'utf8');
  const kept = [...src.matchAll(/^  '?([a-z-]+)'?: \[$/gm)].map((m) => m[1]);
  check(kept.join() === 'satellite,rocket,globe,moon,star,sun,sparkles,map-pin,tornado,flag', `the icons this module keeps are the ten CREDITS.md names (${kept})`);
  const credits = readFileSync(join(ROOT, 'CREDITS.md'), 'utf8');
  check(kept.every((k) => credits.includes('`' + k + '`')) && /site\/js\/ui\/searchrows\.js/.test(credits), 'each is named in CREDITS.md under Lucide');
  check(!/^import .*searchrows/m.test(readFileSync(join(ROOT, 'site/js/ui/search.js'), 'utf8')), 'and none of them is in the boot graph');

  const sat = (n, name) => ({ record: { id: `sat-${n}`, name, klass: 'satellite' }, row: { title: name } });
  const hits = [sat(1, 'STARLINK-1008'), sat(2, 'STARLINK-31234'), { record: { id: 'x', name: 'STARLETTE', klass: 'satellite' }, row: { title: 'Starlette' } }, sat(3, 'STARLINK-5'), sat(4, 'STARLINK-77')];
  const g = R.groupRows(hits, () => 6123, null);
  check(g.length === 2 && g[0].extra === 'group' && g[0].id === 'starlink' && g[0].name === 'Starlink' && g[1].record.id === 'x', `four Starlinks are one row, where the first stood, and Starlette is still itself (${g.map((h) => h.name || h.record.name)})`);
  check(/^Constellation · 6\s123 satellites on the map · press to list them$/u.test(g[0].sub) && !g[0].sub.includes('6123'), `the row says how many the map holds, thousands grouped (${g[0].sub})`);
  check(R.groupRows(hits, () => 6123, 'starlink').length === 5, 'pressed, the constellation is listed as before');
  check(R.groupRows(hits.slice(0, 2), () => 6123, null).length === 2, 'two of a kind are not folded');
  {
    // The field writes the answer back over the list it passed in (ui/search.js): with nothing to
    // fold, the answer must not be that same list, or emptying one empties both ("mars" lost Mars).
    const plain = [{ record: { id: 'mars', name: 'Mars', klass: 'world' }, row: { title: 'Mars' } }];
    const same = R.groupRows(plain, () => 0, null);
    check(same !== plain && same.length === 1 && same[0] === plain[0], 'with nothing to fold the rows come back as they were, in a list of their own');
    const rows = plain.slice();
    rows.splice(0, rows.length, ...R.groupRows(rows, () => 0, null));
    check(rows.length === 1 && rows[0].record.id === 'mars', 'and written back over the list they came from, Mars is still there');
  }
  check(R.groupRows(hits, () => 0, null)[0].sub.includes('4 satellites'), 'the count is never less than the rows it replaces');
  const search = readFileSync(join(ROOT, 'site/js/ui/search.js'), 'utf8');
  check(/hit\.extra === 'group'/.test(search) && /m\.groupRows\(/.test(search) && /rows\.splice\(0, rows\.length, \.\.\.grouped\)/.test(search) && !/rows\.length = 0/.test(search) && /state\.more\.rowIcon\(hit\)/.test(search), 'the field folds the rows, opens the group on a press, and draws the icon');
}

if (problems.length) { console.error('searchrows FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('searchrows ok: a planet then its moons, one row for a station, the name people use with what it is and where it is now, and trips, missions, events and Near me tonight found by name');
