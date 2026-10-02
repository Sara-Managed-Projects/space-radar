// tests/test_framing.mjs -- spec 0061 req 9: an Earth orbiter arrives with the limb in view, a small
// body is never framed from closer than a floor, the reticle is drawn at every distance, and the
// Planets tab is solved to hold every planet (scene/framing.js, ui/hud.js reticleFit).
//
// MEASURED 2026-10-02 at 1440x900 before this: the ISS arrival filled 95 % of the screen with the
// Earth and put 14 % of its limb on screen, in the corners; the Planets tab left Jupiter, Saturn,
// Uranus and Neptune off the screen. The numbers below are the stage's units (1 = 1 000 km on the
// Earth's stage), a 45 degree field of view, and the distances main.js hands in.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const JS = join(dirname(fileURLToPath(import.meta.url)), '..', 'site/js');
const F = await import(join(JS, 'scene/framing.js'));
const { limbFraming, limbAt, fitDistance, discDistance, DISC_FILL, MIN_RADII, LIMB_MAX_SHARE, LIMB_MARGIN_PX, MIN_UP_ANGLE, LIMB_RANGE_RADII, DEFAULT_TILT } = F;
const { reticleFit } = await import(join(JS, 'ui/hud.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

const EARTH_R = 6.371; // the Earth, in 1 000 km
const R = EARTH_R;
const FOV = 45;
const tanHalf = Math.tan((FOV * Math.PI) / 360);
const shareOf = (g) => Math.tan(Math.abs(g)) / tanHalf;
const deg = (x) => ((x * 180) / Math.PI).toFixed(1);

// The old arrival, for the record: FRAMING_TILT toward the up at heroes.js closeUpDistance.
{
  const old = limbAt(R + 0.42, R, 1.407, DEFAULT_TILT);
  check(old && old.g < 0 && shareOf(old.g) > LIMB_MAX_SHARE, `the old ISS arrival had its limb off the screen (share ${old && shareOf(old.g).toFixed(2)})`);
}

/** Every pose limbFraming returns must hold all of these. */
function holds(name, f, { r, h = 900, subjectPx = 260, upDot = 0, room = null, distance, R = EARTH_R }) {
  if (!f) { problems.push(`${name}: no framing found`); return; }
  const t = Math.abs(f.tilt);
  const at = limbAt(r, Math.min(R, r), f.distance, t);
  check(!!at, `${name}: the pose is allowed (camera outside the world, subject in front of it)`);
  if (!at) return;
  const px = shareOf(at.g) * (h / 2);
  const side = room ? Math.min(room.above, room.below) : h / 2;
  check(px >= Math.min(subjectPx / 2 + LIMB_MARGIN_PX, 0.6 * side) - 0.5, `${name}: the limb clears the model, or as much of it as the band allows (${px.toFixed(0)} px from the subject)`);
  check(px <= LIMB_MAX_SHARE * (h / 2) + 0.5, `${name}: the limb is on the screen (${px.toFixed(0)} px of ${h / 2})`);
  if (room) check(px <= 0.85 * Math.max(room.above, room.below) + 0.5, `${name}: the limb is inside the free band`);
  check(at.cameraR > R * 1.02, `${name}: the camera is outside the world`);
  check(f.distance >= distance - 1e-9 && f.distance >= R * MIN_RADII - 1e-9, `${name}: never nearer than asked, nor than the small-body floor`);
  // the view keeps MIN_UP_ANGLE off the camera's up, where the picture has no roll
  const a = upDot;
  const b = -Math.sqrt(1 - a * a);
  const tt = -f.tilt; // framing.js's plane runs away from the up
  const along = -(Math.cos(tt) * a + Math.sin(tt) * b);
  check(Math.acos(Math.min(1, Math.abs(along))) >= MIN_UP_ANGLE - 1e-6, `${name}: the view is ${deg(Math.acos(Math.abs(along)))} deg off the up`);
}

// --- the ISS, 420 km up, from the distance its model is drawn at full size -----------------------
{
  const iss = { r: R + 0.42, distance: 1.407 };
  const f = limbFraming({ ...iss, R, fovDeg: FOV, heightPx: 900 });
  holds('ISS 1440x900', f, iss);
  check(f && f.distance === 1.407, `the ISS keeps its full-size distance (${f && f.distance})`);
  check(f && f.worldBelow, 'and the Earth is below it on the screen');
  const north = limbFraming({ ...iss, R, fovDeg: FOV, heightPx: 900, upDot: 0.6 });
  holds('ISS over the north', north, { ...iss, upDot: 0.6 });
  check(north && north.worldBelow && north.limb > 0, 'over the northern half: against space, the Earth below');
  const south = limbFraming({ ...iss, R, fovDeg: FOV, heightPx: 900, upDot: -0.6 });
  holds('ISS over the south', south, { ...iss, upDot: -0.6 });
  check(south && south.distance === 1.407, 'over the southern half it stays at its distance, the world above (no roll)');
  // A phone with the card up: 169 px above the subject, 151 below.
  const room = { above: 169, below: 151 };
  const phone = limbFraming({ r: R + 0.42, distance: 1.32, R, fovDeg: FOV, heightPx: 844, room });
  holds('ISS 390x844, card up', phone, { r: R + 0.42, distance: 1.32, h: 844, room });
  check(phone && shareOf(limbAt(R + 0.42, R, phone.distance, Math.abs(phone.tilt)).g) * 422 <= 0.85 * 169 + 0.5, 'with the card up the limb stays in the band above it');
}

// --- higher, lower and on the ground -------------------------------------------------------------
{
  const geo = { r: R + 35.786, distance: 0.7 };
  const f = limbFraming({ ...geo, R, fovDeg: FOV, heightPx: 900 });
  holds('a geostationary satellite', f, geo);
  check(f && Math.abs(f.tilt) < 1, 'from 36 000 km the whole Earth is under it: a small tilt does it');
  const pad = { r: R, distance: 0.7 };
  const p = limbFraming({ ...pad, R, fovDeg: FOV, heightPx: 900 });
  holds('a launch pad', p, pad);
  check(p && p.limb < 0, 'a pad is on the ground: the limb is beyond it, never under it');
  const low = { r: R + 0.05, distance: 0.163 }; // 50 km up: closeUpDistance is 163 km
  const l = limbFraming({ ...low, R, fovDeg: FOV, heightPx: 900 });
  holds('a thing 50 km up', l, low);
  check(l && l.distance >= R * MIN_RADII, `a small body is framed from at least ${MIN_RADII} radii (${l && (l.distance * 1000).toFixed(0)} km)`);
  const moonSite = { r: 1.7374, distance: 1.05 };
  holds('a site on the Moon', limbFraming({ ...moonSite, R: 1.7374, fovDeg: FOV, heightPx: 900 }), { ...moonSite, R: 1.7374 });
  check(limbFraming({ r: R * (LIMB_RANGE_RADII + 1), R, distance: 1, fovDeg: FOV, heightPx: 900 }) === null, 'far from any world there is no limb to frame');
  check(limbFraming({ r: 0, R, distance: 1 }) === null && limbFraming({}) === null, 'nonsense in, null out');
}

// --- the reticle at every distance (ui/hud.js reticleFit) --------------------------------------------
{
  check(reticleFit(40, 1440, 900).framing && reticleFit(40, 1440, 900).side === 40, 'a small box is drawn as it is');
  const big = reticleFit(2000, 1440, 900, false);
  check(big.framing && big.side <= 900, `a model zoomed past the screen keeps its brackets, held inside it (${big.side})`);
  check(!reticleFit(2000, 1440, 900, true).framing, 'a world filling the screen does not');
}

// --- a world's disc fits the free band (the Moon on a phone was twice as wide as the phone) --------
{
  const desk = discDistance(1, { fovDeg: FOV, aspect: 1440 / 900, shareH: (1440 - 380) / 1440 });
  check(desk < 3.5, `on a desktop 3.5 radii already fits, so main.js keeps it (${desk.toFixed(2)})`);
  const phone = discDistance(1, { fovDeg: FOV, aspect: 390 / 844, shareV: 0.52 });
  const halfWidthTan = tanHalf * (390 / 844);
  const discTan = Math.tan(Math.asin(1 / phone));
  check(discTan <= halfWidthTan * DISC_FILL + 1e-9, `on a phone the disc spans at most ${DISC_FILL} of the width (${(discTan / halfWidthTan).toFixed(2)})`);
  check(phone > 3.5, `so the Moon is framed from farther than 3.5 radii (${phone.toFixed(2)})`);
  check(discDistance(0) === 0, 'no radius, no distance');
}

// --- the Planets tab: fitDistance on a plain pinhole -----------------------------------------------
{
  // Looking straight down at a ring of radius 30 from distance d: a point at x lands at x / (d tan).
  const aspect = 1440 / 900;
  const project = (p, d) => ({ x: p.x / (d * tanHalf * aspect), y: p.y / (d * tanHalf) });
  const ring = Array.from({ length: 24 }, (_, i) => ({ x: 30 * Math.cos((i * Math.PI) / 12), y: 30 * Math.sin((i * Math.PI) / 12) }));
  const band = { w: (1440 - 2 * 190) / 1440, h: 1 };
  const d = fitDistance(ring, project, { lo: 1, hi: 1e5, band });
  const inside = (dd) => ring.every((p) => { const q = project(p, dd); return Math.abs(q.x) <= band.w * 0.88 && Math.abs(q.y) <= 0.88; });
  check(inside(d), `every point fits at the solved distance (${d && d.toFixed(1)})`);
  check(!inside(d * 0.99), 'and not much nearer: the system fills the band, it is not a dot in it');
  check(fitDistance([], project) === null, 'no points, no distance');
}

if (problems.length) { console.error('framing FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('framing ok: the ISS, a geostationary satellite, a pad, a thing 50 km up and a site on the Moon all arrive with the limb on screen and clear of the model; small bodies from at least 5 % of a radius; the reticle held at every distance; the Planets tab fitted to its band');
