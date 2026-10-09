// tests/test_sky_follow.mjs -- the telescope field keeps a planet in the middle (internal #547, "the view
// does not follow a planet": at 0.1 degree Saturn left in under half a minute). sky/skyview.js follow().
//   TZ=UTC node tests/test_sky_follow.mjs
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

process.env.TZ = 'UTC';
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const A = await import(join(ROOT, 'site/vendor/astronomy.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const { stage } = await import(join(JS, 'scene/stage.js'));
const { createSkyView } = await import(join(JS, 'sky/skyview.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const place = { latDeg: 40, lonDeg: 0, altKm: 0 };
const obs = new A.Observer(40, 0, 0);
const altAz = (name, ms) => {
  const d = new Date(ms);
  const eq = A.Equator(name, d, obs, true, true);
  const h = A.Horizon(d, obs, eq.ra, eq.dec, 'normal');
  return { az: h.azimuth, alt: h.altitude };
};
const angDiff = (a, b) => Math.abs(((a - b + 540) % 360) - 180);

// A moment with Saturn well up, and the hour it sets after that, found with the same maths.
let t0 = Date.parse('2026-10-20T16:00:00Z');
while (altAz('Saturn', t0).alt < 25 && t0 < Date.parse('2026-10-22T00:00:00Z')) t0 += 15 * 60e3;
check(altAz('Saturn', t0).alt >= 25, 'the test finds a time with Saturn up');
let tSet = t0;
while (altAz('Saturn', tSet).alt > -3 && tSet < t0 + 36 * 3600e3) tSet += 10 * 60e3;

let now = t0;
const clock = { now: () => now };
const camera = new THREE.PerspectiveCamera(50, 1.6, 0.001, 1e9);
const sky = createSkyView({ camera, scene: new THREE.Scene(), stage, clock });
sky.enter(place);
sky.update(now);

check(sky.following === null && sky.followEnded === null, 'nothing is followed to begin with');
check(sky.follow('saturn') === true && sky.following === 'saturn', 'asking to follow a planet that is up follows it');
sky.update(now);
let look = sky.look;
let want = altAz('Saturn', now);
check(angDiff(look.azimuthDeg, want.az) < 0.01 && Math.abs(look.altitudeDeg - want.alt) < 0.01, `the middle of the view is Saturn (${look.azimuthDeg.toFixed(3)}, ${look.altitudeDeg.toFixed(3)} against ${want.az.toFixed(3)}, ${want.alt.toFixed(3)})`);

// An hour on the sky has turned 15 degrees; the view went with it, with no hand on it.
now = t0 + 40 * 60e3;
sky.update(now);
look = sky.look;
want = altAz('Saturn', now);
check(angDiff(look.azimuthDeg, want.az) < 0.01 && Math.abs(look.altitudeDeg - want.alt) < 0.01, `forty minutes later it is still Saturn (${look.azimuthDeg.toFixed(3)} against ${want.az.toFixed(3)})`);
check(angDiff(want.az, altAz('Saturn', t0).az) > 1, 'and that was a move of more than a degree: a fixed view would have lost it');
check(sky.following === 'saturn', 'still following');

// The visitor's hand ends it.
sky.lookBy(0.2, 0);
check(sky.following === null && sky.followEnded === 'moved', 'turning the view by hand lets go, and says so');
now = t0 + 60 * 60e3;
sky.update(now);
check(angDiff(sky.look.azimuthDeg, altAz('Saturn', now).az) > 0.5, 'and the view stays where the visitor put it');

// Following from pointAt (the Tonight view's Telescope button passes follow: true).
now = t0;
check(sky.pointAt({ body: 'saturn' }, { follow: true, mark: false }) === true && sky.following === 'saturn', 'pointAt with follow: true follows');
check(sky.pointAt({ azDeg: 90, altDeg: 30 }, { mark: false }) === true && sky.following === null && sky.followEnded === 'moved', 'turning to anything else ends it');
check(sky.pointAt({ body: 'saturn' }, { mark: false }) === true && sky.following === null, 'pointAt without follow: true does not');

// It lets go when the planet sets.
sky.follow('saturn');
now = tSet;
sky.update(now);
check(sky.following === null && sky.followEnded === 'set', `the planet sets and the follow ends, saying 'set' (${sky.followEnded})`);

// A planet under the horizon cannot be followed.
now = tSet + 3 * 3600e3;
check(altAz('Saturn', now).alt < 0 && sky.follow('saturn') === false && sky.following === null, 'a planet under the horizon is refused');
check(sky.follow('nonsense') === false, 'and so is something that is not a body');

// Asking to stop, and leaving the view.
now = t0;
sky.follow('saturn');
check(sky.follow(null) === true && sky.following === null && sky.followEnded === 'asked', 'follow(null) stops');
sky.follow('saturn');
sky.exit();
check(sky.following === null && sky.followEnded === 'left', 'leaving the sky view ends it');

if (problems.length) { console.error('sky follow FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('sky follow ok: the middle of the view stays on a planet while the sky turns, ends at a hand, at its setting, on request or on leaving, and is refused below the horizon');
