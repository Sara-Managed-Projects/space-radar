// tests/test_spaceweather.mjs -- spec 0026 req 16: one honest line of space weather.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const { kpWords, spaceWeatherLine } = await import(join(JS, 'ui/spaceweather.js'));
const { parseSpaceWeather } = await import(join(JS, 'data/parsers.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

check(kpWords(1).word === 'quiet' && kpWords(3.3).word === 'unsettled' && kpWords(4).word === 'active', 'quiet, unsettled, active');
check(kpWords(5).scale === 'G1' && kpWords(6.7).scale === 'G2' && kpWords(9).scale === 'G5' && kpWords(2).scale === null, 'G1 from Kp 5, G5 at 9, none below 5');
check(kpWords(NaN).word === 'no reading', 'no number, no word invented');

// the real fixture the harvester captured from NOAA
const fx = JSON.parse(readFileSync(join(ROOT, 'tests/fixtures/harvest/swpc.json'), 'utf8'));
const parsed = parseSpaceWeather(fx);
check(Number.isFinite(parsed.kp), `the fixture parses to a Kp (${parsed.kp})`);
const observedRows = parsed.forecast.filter((r) => r.observed === 'observed' || r.observed === 'estimated');
const readingMs = observedRows.length ? observedRows[observedRows.length - 1].tMs : parsed.forecast[0].tMs;
const now = readingMs + 25 * 60e3;
const line = spaceWeatherLine(parsed, { fetchedAt: now - 60e3, via: 'live', stale: false }, now);
check(typeof line === 'string' && line.startsWith('Space weather: Kp '), `a line starting with the number: ${line}`);
check(line.includes('NOAA SWPC'), 'it names the source');
if (observedRows.length) check(line.includes('measured') && line.includes('minutes ago'), `an observed reading says measured and how old (${line})`);
else check(line.includes('forecast, not a measurement'), 'a forecast-only feed says so');
// stale is said
const staleLine = spaceWeatherLine(parsed, { fetchedAt: now, via: 'snapshot', stale: true }, now);
check(staleLine.includes('older than NOAA promises') && staleLine.includes('from our copy'), 'a stale snapshot reading says both');
// a forecast-only parse says so and does not claim a measurement
const fcOnly = { kp: 4, observedKp: null, maxForecastKp: 6, forecast: [{ tMs: now, kp: 4, observed: 'predicted', cls: 'inferred' }] };
const fcLine = spaceWeatherLine(fcOnly, { fetchedAt: now, via: 'live', stale: false }, now);
check(fcLine.includes('a forecast, not a measurement') && fcLine.includes('rising to Kp 6'), `forecast-only: ${fcLine}`);
check(spaceWeatherLine(null, null, now) === null && spaceWeatherLine({ kp: null }, null, now) === null, 'nothing parsed, nothing said');

if (problems.length) { console.error('space weather FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('space weather ok: Kp, the word, the G scale, the age and the source; forecasts and stale readings say so');
