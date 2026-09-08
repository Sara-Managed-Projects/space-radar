// tests/test_colorkeys.mjs -- spec 0026 req 11: colour keys bucket records by fields they already hold.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const { COLOR_KEYS } = await import(join(JS, 'data/colorkeys.js'));
const { keyById, bucketOf, legendCounts, fieldOf, UNKNOWN_ID } = await import(join(JS, 'data/colorkeyrules.js'));
const { CLASS_COLOURS } = await import(join(JS, 'scene/glyphatlas.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(COLOR_KEYS[0].id === 'class' && COLOR_KEYS.length >= 4, `class first, several keys (${COLOR_KEYS.map((k) => k.id)})`);
const sat = (meta, klass = 'satellite') => ({ id: 'x', name: 'X', klass, meta });
const alt = keyById('altitude');
check(bucketOf(alt, sat({ perigeeKm: 410 })).id === 'low', 'ISS height is "low"');
check(bucketOf(alt, sat({ perigeeKm: 35786 })).id === 'geo', 'a geostationary height is "geo"');
check(bucketOf(alt, sat({ perigeeKm: 399.9 })).id === 'very-low' && bucketOf(alt, sat({ perigeeKm: 400 })).id === 'low', 'bounds are [min, max)');
check(bucketOf(alt, sat({})).id === UNKNOWN_ID, 'no perigee -> unknown, not a guess');
const inc = keyById('inclination');
check(bucketOf(inc, sat({ inclinationDeg: 51.6 })).id === 'mid' && bucketOf(inc, sat({ inclinationDeg: 97.5 })).id === 'retrograde', 'inclination buckets');
const age = keyById('launch-age');
check(fieldOf(sat({ intlDesignator: '1998-067A' }), 'launch_year') === 1998 && bucketOf(age, sat({ intlDesignator: '1998-067A' })).id === 'old', 'the launch year comes from the designator');
check(bucketOf(age, sat({ netMs: Date.UTC(2026, 8, 8) })).id === 'this-year', 'a launch with a net time uses its year');
const cls = keyById('class');
check(bucketOf(cls, sat({}, 'station')).colour === CLASS_COLOURS.station, 'the class key is the class colour');
const legend = legendCounts(alt, [sat({ perigeeKm: 410 }), sat({ perigeeKm: 420 }), sat({ perigeeKm: 35786 }), sat({})]);
check(legend.find((r) => r.id === 'low').n === 2 && legend.find((r) => r.id === 'geo').n === 1 && legend.find((r) => r.id === UNKNOWN_ID).n === 1, `the legend counts, unknown included (${legend.map((r) => r.id + ':' + r.n).join(' ')})`);
check(legend[legend.length - 1].id === UNKNOWN_ID && legend.find((r) => r.id === 'medium').n === 0, 'bucket order is the registry\'s, zeroes kept, unknown last');
check(legendCounts(alt, null).every((r) => r.n === 0), 'no records, all zero, no throw');

if (problems.length) { console.error('colour keys FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`colour keys ok: ${COLOR_KEYS.length} keys from the registry; altitude, tilt and launch year bucket from fields the records hold; unknown is counted`);
