// saturn: the rings from close (spec 0073 requirement 5). The stage; the rings wide; over the A
// ring's outer edge, where the Encke and Keeler gaps are, at three distances (the fine structure,
// then the grains); edge-on; the unlit side; and the north pole with its vortex.
//
// TWO CLOCKS. Today (2026) the Sun is a few degrees south of Saturn's ring plane: the rings are lit
// dimly and from the south, and the north pole is in its winter night. So the wide, edge-on and
// unlit views are taken at the page's own time, and the close views and the pole are taken again at
// the northern summer solstice of May 2017, when Cassini was there and both were in full light.
//
// THE CLOSE VIEWS aim the camera at a point ON the ring (`targetScene`), not at the planet: from a
// camera that looks at the planet's centre the near ring is under the bottom of the window.
look.probe = 'saturn';
const out = {};
const S = 'saturn';
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
await stage(S, 12000);
const d0 = rig.state.distance;
const mesh = sr.worlds.meshFor(S);
const R = mesh.scale.x;                       // the mean radius, in scene units: the ring's own unit
const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
// The lit face's normal, and the direction in the ring plane toward the Sun (the near, lit ansa).
const frame = () => {
  const n = north(S); const s = sunward(S);
  const side = dot(n, s) >= 0 ? 1 : -1;
  const e = unit(mix(s, 1, n, -dot(n, s)));
  return { n, s, e, lit: mix(n, side, n, 0), sunElevationDeg: Math.asin(Math.abs(dot(n, s))) * 180 / Math.PI, side };
};
const detail = () => (sr.worlds.ringDetail ? sr.worlds.ringDetail(S) : null);
// Over a point of the ring `radii` out along `e`, from `height` radii away, leaning `lean` toward the planet.
const overRing = (f, radii, height, lean, sideSign = 1) => {
  const c = centre();
  const p = { x: c.x + f.e.x * radii * R, y: c.y + f.e.y * radii * R, z: c.z + f.e.z * radii * R };
  rig.flyTo({ targetScene: p, offset: mix(f.lit, sideSign, f.e, lean), distance: height * R, ms: 0 });
};
await shot('01-stage', 'Saturn on its stage, as framed; weather module ' + (out.weatherLoaded ? 'on' : 'OFF'));
let f = frame();
out.now = { sunElevationDeg: f.sunElevationDeg, litSide: f.side > 0 ? 'north' : 'south', discShare: sr.worlds.discShare(S), d0, R };
rig.flyTo({ offset: mix(f.e, 1, f.lit, 0.55), distance: d0 * 0.8, ms: 0 });
await shot('02-rings-wide-now', 'the rings wide, from the lit side, today\'s Sun (' + f.sunElevationDeg.toFixed(1) + ' degrees off the ring plane)', 7000);
out.detailWide = detail();
rig.flyTo({ offset: mix(f.e, 1, f.lit, 0.012), distance: d0 * 0.8, ms: 0 });
await shot('03-edge-on-now', 'nearly edge-on (0.7 degrees above the plane): moire or sparkle here is a fault', 7000);
rig.flyTo({ offset: mix(f.e, 1, f.lit, -0.5), distance: d0 * 0.8, ms: 0 });
await shot('04-unlit-side-now', 'the unlit side: the thin C ring and the Cassini Division should glow, the B ring be dark', 7000);
overRing(f, 2.30, 0.35, 0.5);
await shot('05-a-ring-edge-now', 'over the A ring\'s outer edge today, 0.35 radii up: the Encke gap', 8000);
out.detailNow = detail();

// The solstice of 24 May 2017: the Sun 26.7 degrees north of the ring plane.
sr.clock.goTo(Date.UTC(2017, 4, 24, 12));
await sleep(5000);
f = frame();
out.solstice = { sunElevationDeg: f.sunElevationDeg, litSide: f.side > 0 ? 'north' : 'south' };
rig.flyTo({ targetScene: centre(), offset: mix(f.e, 1, f.lit, 0.55), distance: d0 * 0.8, ms: 0 });
await shot('06-rings-wide-2017', 'the rings wide at the 2017 solstice (' + f.sunElevationDeg.toFixed(1) + ' degrees): no moire, the Cassini Division where it was', 7000);
rig.flyTo({ targetScene: centre(), offset: mix(f.e, 1, f.lit, 0.45), distance: R * 3.4, ms: 0 });
await shot('07-rings-large-2017', 'closer: the rings fill the window, fine structure in (' + JSON.stringify(detail()) + ')', 8000);
overRing(f, 2.30, 0.35, 0.5);
await shot('08-a-ring-edge-2017', 'over the A ring\'s outer edge, 0.35 radii up (about 19 km a pixel): the Encke gap, the edge', 8000);
overRing(f, 2.32, 0.12, 0.35);
await shot('09-encke-keeler-2017', '0.12 radii up (about 6 km a pixel): Encke wide, the Keeler gap a thin line just inside the edge, grains', 8000);
out.detailClose = detail();
out.rigClose = { distance: rig.state.distance, wanted: 0.12 * R };
overRing(f, 2.20, 0.05, 0.2);
await shot('10-grains-2017', '0.05 radii up (under 3 km a pixel): the ring is not a smooth sheet', 8000);
overRing(f, 1.45, 0.3, 0.4);
await shot('11-c-ring-2017', 'over the C ring and the B ring\'s inner edge, 0.3 radii up: the Maxwell gap, plateaus', 8000);
overRing(f, 2.0, 0.3, 0.4);
await shot('12-cassini-division-2017', 'over the Cassini Division, 0.3 radii up: the Huygens gap at the B ring\'s edge', 8000);
overRing(f, 2.30, 0.35, 0.5, -1);
await shot('13-a-ring-unlit-2017', 'the same place as 08 from the unlit side', 8000);
// The pole: from over it, leaning to the Sun, close enough for the vortex (disc share past 0.45).
rig.flyTo({ targetScene: centre(), offset: mix(f.n, 1, f.s, 0.35), distance: R * 2.6, ms: 0 });
await shot('14-north-pole-2017', 'over the north pole: the hexagon, and the vortex inside it', 8000);
const cap = { x: centre().x + f.n.x * R * 0.9, y: centre().y + f.n.y * R * 0.9, z: centre().z + f.n.z * R * 0.9 };
rig.flyTo({ targetScene: cap, offset: mix(f.n, 1, f.s, 0.3), distance: R * 0.45, ms: 0 });
await shot('15-polar-vortex-2017', 'close over the pole: the eye, its wall and the arms', 8000);
out.poleShare = sr.worlds.discShare(S);
out.vortex = (() => { try { return sr.weather.state().air.worlds.find((w) => w.id === S).vortex; } catch { return null; } })();
try {
  const rates = sr.clock.rates();
  sr.clock.setRate(rates[rates.length - 3] || rates[rates.length - 1]);
  out.rate = sr.clock.rate;
} catch (e) { look.warns.push('probe: the clock could not be sped up: ' + e); }
await shot('16-polar-vortex-later', 'the same view six seconds on with the clock at ' + out.rate + 'x: the arms should have turned', 6000);
out.vortexLater = (() => { try { return sr.weather.state().air.worlds.find((w) => w.id === S).vortex; } catch { return null; } })();
sr.clock.live();
if (!out.weatherLoaded) out.fail = 'the weather module never loaded (tier ' + (sr.quality && sr.quality.bootTier) + ')';
else if (!out.detailClose || !(out.detailClose.fine > 0.99) || !out.detailClose.strip) out.fail = 'the rings\' fine structure never came in from close: ' + JSON.stringify(out.detailClose);
return finish(out);
