// tests/test_riseany.mjs -- rises, highest and sets for a thing the astronomy library has no name
// for (sky/riseany.js, internal #299's remainder: comets and asteroids).
//
// The check is against the library itself: hand the scanner Mars's and Jupiter's own geocentric
// vectors as if they were a rock's, and its answers must agree with the library's named search
// (SearchRiseSet, SearchHourAngle) to two minutes and half a degree, from three places.
//
//   node tests/test_riseany.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const Astronomy = await import(join(ROOT, 'site/vendor/astronomy.js'));
const { riseHighestSetOf } = await import(join(ROOT, 'site/js/sky/riseany.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const NOW = Date.UTC(2026, 9, 8, 12, 0, 0);
const PLACES = [['London', 51.5, -0.1], ['Sydney', -33.9, 151.2], ['Quito', -0.2, -78.5]];
let worst = 0;
let cases = 0;

for (const body of ['Mars', 'Jupiter']) {
  const eqjAt = (ms) => { const v = Astronomy.GeoVector(body, new Date(ms), true); return { x: v.x, y: v.y, z: v.z }; };
  for (const [name, latDeg, lonDeg] of PLACES) {
    const obs = new Astronomy.Observer(latDeg, lonDeg, 0);
    const r = riseHighestSetOf(eqjAt, { latDeg, lonDeg }, NOW);
    check(r !== null, `${body} from ${name}: an answer`);
    if (!r) continue;
    const eq = Astronomy.Equator(body, new Date(NOW), obs, true, true);
    const hor = Astronomy.Horizon(new Date(NOW), obs, eq.ra, eq.dec, 'normal');
    // Geocentric against topocentric: a planet's parallax is seconds of arc.
    check(Math.abs(r.altDeg - hor.altitude) < 0.1 && Math.abs(((r.azDeg - hor.azimuth + 540) % 360) - 180) < 0.2, `${body} from ${name}: where it is now (${r.altDeg.toFixed(2)} against ${hor.altitude.toFixed(2)})`);
    check(r.upNow === (hor.altitude > 0), `${body} from ${name}: up or down`);
    let from = new Date(NOW);
    if (!r.upNow) {
      const rise = Astronomy.SearchRiseSet(body, obs, +1, from, 1.5);
      const off = Math.abs(r.riseMs - rise.date.getTime());
      worst = Math.max(worst, off); cases += 1;
      check(off < 120e3, `${body} from ${name}: rises within two minutes of the library's search (${Math.round(off / 1000)} s)`);
      from = rise.date;
    } else check(r.riseMs === null, `${body} from ${name}: up now, so no rise time`);
    const set = Astronomy.SearchRiseSet(body, obs, -1, from, 1.5);
    const offSet = Math.abs(r.setMs - set.date.getTime());
    worst = Math.max(worst, offSet); cases += 1;
    check(offSet < 120e3, `${body} from ${name}: sets within two minutes (${Math.round(offSet / 1000)} s)`);
    const high = Astronomy.SearchHourAngle(body, obs, 0, from);
    const highMs = high.time.date.getTime();
    if (highMs < set.date.getTime()) {
      check(r.highMs !== null && Math.abs(r.highMs - highMs) < 240e3, `${body} from ${name}: highest within four minutes (${r.highMs === null ? 'none' : Math.round((r.highMs - highMs) / 1000)} s)`);
      check(r.highAltDeg !== null && Math.abs(r.highAltDeg - high.hor.altitude) < 0.5, `${body} from ${name}: and how high (${r.highAltDeg} against ${high.hor.altitude})`);
    } else check(r.highMs === null, `${body} from ${name}: past its highest this time up`);
    check(r.setMs > (r.riseMs || NOW) && (r.highMs === null || (r.highMs >= (r.riseMs || NOW) && r.highMs <= r.setMs)), `${body} from ${name}: rise, highest and set are in order`);
  }
}

// The pole star's direction from 60 north never sets; from 60 south it never rises.
const polaris = () => ({ x: 0.01, y: 0.005, z: 1 });
const north = riseHighestSetOf(polaris, { latDeg: 60, lonDeg: 0 }, NOW);
const south = riseHighestSetOf(polaris, { latDeg: -60, lonDeg: 0 }, NOW);
check(north && north.upNow && north.always && north.setMs === null, 'a thing near the pole does not set from 60 north');
check(south && !south.upNow && south.never && south.riseMs === null, 'and does not rise from 60 south');
// No place, no direction, a propagator that gives nothing: null, never a made-up time.
check(riseHighestSetOf(polaris, null, NOW) === null && riseHighestSetOf(polaris, { latDeg: NaN, lonDeg: 0 }, NOW) === null, 'no place is null');
check(riseHighestSetOf(() => null, { latDeg: 51.5, lonDeg: 0 }, NOW) === null && riseHighestSetOf(null, { latDeg: 51.5, lonDeg: 0 }, NOW) === null, 'no direction is null');
const t0 = performance.now();
riseHighestSetOf((ms) => { const v = Astronomy.GeoVector('Mars', new Date(ms), true); return { x: v.x, y: v.y, z: v.z }; }, { latDeg: 51.5, lonDeg: -0.1 }, NOW);
const ms = performance.now() - t0;
check(ms < 400, `one solve stays cheap (${ms.toFixed(0)} ms)`);

if (problems.length) { console.error('riseany FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`riseany ok: ${cases} rise and set times for Mars and Jupiter from London, Sydney and Quito agree with the astronomy library's own search (worst ${Math.round(worst / 1000)} s); a thing near the pole never sets or never rises; ${ms.toFixed(0)} ms a solve`);
