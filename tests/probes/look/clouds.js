// clouds: the Earth's clouds standing up, by parallax inside the surface shader (scene/earth.js
// CLOUD_PARALLAX; after public #1027's marched shell was parked). Every view is taken twice from the
// same place at the same clock: with the parallax as the app has it, and with its steps set to 0,
// which is main's flat layer exactly. The whole Earth and straight down (both must be the same
// picture twice); 420 km up with the day's tallest storm on the horizon and 1 000 km to its side;
// the tallest cloud in the last light, on the horizon and along the terminator; the same as tier 2
// steps it; the Measured look (true thickness: the flat layer); following the station itself as it
// crosses the terminator; the night side. Each picture's note says which it is, the steps, the camera's height and which
// clouds (today's composite or the static map).
look.probe = 'clouds';
const out = { views: [] };
const E = 'earth';
const earth = sr.worlds.meshFor(E);
const R = sr.worlds.drawnRadiusUnits(E);
const R_KM = 6378.137;
const centre = () => ({ x: earth.position.x, y: earth.position.y, z: earth.position.z });
/** From the Earth's centre toward a place, in the scene, now (scene/earth.js: +X is longitude 0, +Y north, -Z 90 E). */
const over = (latDeg, lonDeg) => {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  const l = [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
  earth.updateMatrixWorld();
  const e = earth.matrixWorld.elements;
  return unit({ x: e[0] * l[0] + e[4] * l[1] + e[8] * l[2], y: e[1] * l[0] + e[5] * l[1] + e[9] * l[2], z: e[2] * l[0] + e[6] * l[1] + e[10] * l[2] });
};
/** The nearest moment to now when it is `hourUtc` o'clock: never more than twelve hours off, so today's clouds stay on. */
const nearest = (hourUtc) => {
  const now = Date.now();
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(hourUtc), Math.round((hourUtc % 1) * 60));
  return [t - 86400000, t, t + 86400000].sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0];
};
const cloudsNow = () => { try { return sr.liveClouds.state().mode; } catch { return 'unknown'; } };
const par = () => earth.material.uniforms.uCloudPar.value;
/** The camera's height over the ground, km. */
const heightKm = () => { const c = centre(); const p = sr.camera.position; return Math.round((Math.hypot(p.x - c.x, p.y - c.y, p.z - c.z) / R - 1) * R_KM); };
/** Wait for frames that were really drawn: a software renderer may take seconds over one, and a sleep alone photographs the frame before. */
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
/** The parallax as the app set it (`null`), in so many view and Sun steps, or off (0): the flat layer of main. */
let appSteps = null;
const steps = (view, sun) => { if (!appSteps) appSteps = [par().x, par().y]; par().x = view === null ? appSteps[0] : view; par().y = view === null ? appSteps[1] : sun; };
const picture = async (name, what, settleMs = 6000) => {
  await frames(3);
  await sleep(settleMs);
  await frames(2);
  const row = { name, km: heightKm(), viewSteps: par().x, sunSteps: par().y, clouds: cloudsNow(), ...frameCost() };
  out.views.push(row);
  await shot(name, `${what} | ${row.viewSteps ? 'PARALLAX, ' + row.viewSteps + ' view steps and ' + row.sunSteps + ' toward the Sun' : 'FLAT LAYER (main)'} | camera ${row.km} km up | clouds: ${row.clouds}`);
};
/** A view with the parallax and then the same with the flat layer it replaces. */
const pair = async (name, what, settleMs = 6000) => {
  steps(null);
  await picture(name + '-after', what, settleMs);
  steps(0, 0);
  await picture(name + '-before', what + ' (the flat layer, as on main)', settleMs);
  steps(null);
};
/** The median of six frame intervals, ms. IN SOFTWARE THE NUMBERS ONLY COMPARE WITH EACH OTHER. */
const frameMs = async () => {
  const stamps = [];
  for (let i = 0; i < 7; i++) stamps.push(await new Promise((r) => requestAnimationFrame(r)));
  const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
  return Math.round(gaps[3]);
};
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
/**
 * `altKm` over `here`, looking along the ground toward `toward` at a point `aheadDeg` of arc on,
 * which from 420 km puts the horizon (20 degrees of arc off) a little above the middle of the picture.
 */
const lowOrbit = (here, toward, altKm = 420, aheadDeg = 14) => {
  const k = dot(here, toward);
  const tangent = unit({ x: toward.x - here.x * k, y: toward.y - here.y * k, z: toward.z - here.z * k });
  const a = (aheadDeg * Math.PI) / 180;
  const c = centre();
  const camR = R * (1 + altKm / R_KM);
  const cam = { x: here.x * camR, y: here.y * camR, z: here.z * camR };
  const tgt = { x: (here.x * Math.cos(a) + tangent.x * Math.sin(a)) * R, y: (here.y * Math.cos(a) + tangent.y * Math.sin(a)) * R, z: (here.z * Math.cos(a) + tangent.z * Math.sin(a)) * R };
  const off = { x: cam.x - tgt.x, y: cam.y - tgt.y, z: cam.z - tgt.z };
  rig.flyTo({ targetScene: { x: c.x + tgt.x, y: c.y + tgt.y, z: c.z + tgt.z }, offset: unit(off), distance: Math.hypot(off.x, off.y, off.z), ms: 0 });
};
/**
 * Where the tallest cloud is, from today's composite itself (its third channel is how far a top is
 * into the cold of deep convection): the 3-degree box with the most of it whose Sun stands between
 * `muLo` and `muHi` (cosine of its zenith angle). A view aimed at clear sea shows nothing of a
 * cloud's height, and the first low-orbit run was aimed at two.
 */
const tallestCloud = (muLo, muHi) => {
  try {
    const img = earth.material.uniforms.uLiveB.value.image;
    const W = img.width;
    const H = img.height;
    const d = img.data;
    if (!(W > 64) || !d || d.length < W * H * 4) return null;
    const sun = sunward(E);
    let best = null;
    const half = Math.round((1.5 / 360) * W);
    for (let lat = -50; lat <= 50; lat += 2) {
      for (let lon = -180; lon < 180; lon += 2) {
        const mu = dot(over(lat, lon), sun);
        if (mu < muLo || mu > muHi) continue;
        const cx = Math.floor(((lon + 180) / 360) * W);
        const cy = Math.floor(((lat + 90) / 180) * H);   // rows south first
        let tops = 0;
        let cover = 0;
        for (let y = cy - half; y <= cy + half; y += 2) {
          if (y < 0 || y >= H) continue;
          for (let x = cx - half; x <= cx + half; x += 2) {
            const i = (y * W + ((x + W) % W)) * 4;
            tops += d[i + 2];
            cover += d[i];
          }
        }
        const score = tops * 4 + cover;
        if (!best || score > best.score) best = { lat, lon, score, tops, cover, mu: Math.round(mu * 100) / 100 };
      }
    }
    return best;
  } catch (e) { look.warns.push('probe: the composite could not be read for its tallest cloud: ' + e); return null; }
};
/** A unit vector `deg` of arc from `from` toward `toward`. */
const arcToward = (from, toward, deg) => {
  const k = dot(from, toward);
  const t = unit({ x: toward.x - from.x * k, y: toward.y - from.y * k, z: toward.z - from.z * k });
  const a = (deg * Math.PI) / 180;
  return unit(mix(from, Math.cos(a), t, Math.sin(a)));
};
// Two thirds of the view's height: the disc's radius is two thirds of half the view.
const TWO_THIRDS = R / ((2 / 3) * Math.tan((22.5 * Math.PI) / 180));

await go(E, null, 5000);
// The card closed and the camera's own follow off: the picture is centred, and a view may look at
// a point on the surface instead of the Earth's centre.
try { sr.deselect(); } catch (e) { look.warns.push('probe: deselect threw: ' + e); }
try { rig.stopFollow(); } catch (e) { look.warns.push('probe: stopFollow threw: ' + e); }
await frames(2);
if (!earth.material.uniforms.uCloudPar) { out.fail = 'the surface has no uCloudPar: this branch has no parallax'; return finish(out); }
out.appSteps = [par().x, par().y];
out.tier = sr.quality && sr.quality.describe ? sr.quality.describe().tier : null;
if (!(par().x > 0)) { out.fail = 'the parallax is off as the app booted (tier ' + out.tier + ', latched ' + sr.latch.latched + '): nothing to look at'; return finish(out); }
// Today's composite takes its first look some seconds after the layers land; wait for it, and say if it never came.
out.liveClouds = await until(() => cloudsNow() === 'live', 90000, 1000);
if (!out.liveClouds) look.missing.push('today\'s cloud composite (the static map is what the pictures show): ' + cloudsNow());

// ---- the whole Earth: must be the flat layer's picture ---------------------------------------------
sr.clock.goTo(nearest(14));
await frames(3);
rig.flyTo({ targetScene: centre(), offset: over(15, -35), distance: TWO_THIRDS, ms: 0 });
await pair('1-whole-earth', 'the whole Earth, the disc two thirds of the view: the two must be one picture', 7000);
out.frameMs = { wholeEarth: await frameMs() };

// ---- the station's height, by day: the tallest cloud in daylight ------------------------------------
const dayStorm = tallestCloud(0.45, 0.95) || { lat: 8, lon: -30, fallback: true };
out.dayStorm = dayStorm;
{
  const S0 = over(dayStorm.lat, dayStorm.lon);
  const side = unit(cross(S0, sunward(E)));          // across the Sun's light: the storm is lit from one side
  const from = (deg) => arcToward(S0, side, deg);
  const where = `the tallest cloud in daylight (${dayStorm.lat}, ${dayStorm.lon}${dayStorm.fallback ? ', a fixed place: no composite' : ''})`;
  // 19 degrees of arc back from it: from 420 km the horizon is 20 off, so the storm stands ON it.
  lowOrbit(from(19), S0);
  await pair('2-limb-day', `420 km up, ${where} on the horizon`, 8000);
  steps(null); await frames(3); out.frameMs.limbParallax = await frameMs();
  steps(8, 4); await frames(3); out.frameMs.limbParallaxTier2 = await frameMs();
  steps(0, 0); await frames(3); out.frameMs.limbFlat = await frameMs();
  steps(null);
  // Nearer: 9 degrees back, looking at it. The storm fills the middle distance, seen from the side.
  lowOrbit(from(9), S0, 420, 9);
  await pair('3-storm-day', `420 km up, 1 000 km from ${where}: the oblique day view, where the flat layer's shadow was already good`, 8000);
  steps(8, 4);
  await picture('3-storm-day-tier2', 'the same as tier 2 steps it', 7000);
  steps(null);
  // Straight down on it.
  rig.flyTo({ targetScene: centre(), offset: S0, distance: R * (1 + 420 / R_KM), ms: 0 });
  await pair('4-straight-down', '420 km up, straight down on it: the two must be one picture', 8000);
  steps(null); await frames(3); out.frameMs.straightDownParallax = await frameMs();
  steps(0, 0); await frames(3); out.frameMs.straightDownFlat = await frameMs();
  steps(null);
}

// ---- a low Sun: the tallest cloud in the last light ----------------------------------------------------
{
  const duskStorm = tallestCloud(0.0, 0.14) || tallestCloud(-0.05, 0.25);
  out.duskStorm = duskStorm;
  const sun = sunward(E);
  const n = north(E);
  const S1 = duskStorm ? over(duskStorm.lat, duskStorm.lon) : unit(mix(unit(cross(n, sun)), 0.997, sun, 0.07));
  const where = duskStorm ? `the tallest cloud in the last light (${duskStorm.lat}, ${duskStorm.lon}, Sun's zenith cosine ${duskStorm.mu})` : 'a point 4 degrees on the day side of the terminator (no composite)';
  // From the day side, 19 degrees back toward the Sun, looking into the night: the storm on the horizon.
  lowOrbit(arcToward(S1, sun, 19), S1);
  await pair('5-dusk-horizon', `420 km up on the day side, ${where} on the horizon: tops lit over ground in shadow`, 8000);
  // Nearer, and from the side: 9 degrees north of it looking south along the terminator.
  lowOrbit(arcToward(S1, n, 9), S1, 420, 9);
  await pair('6-dusk-storm', `420 km up, 1 000 km north of ${where}, looking along the terminator: long shadows, the last light on the tops`, 8000);
  out.frameMs.duskParallax = await frameMs();
  // Over it, looking down: a low Sun from above, where only the shadows and the light can show height.
  rig.flyTo({ targetScene: centre(), offset: S1, distance: R * (1 + 420 / R_KM), ms: 0 });
  await pair('7-dusk-straight-down', `420 km up, straight down on ${where}: long shadows across lower cloud`, 8000);
  // The Measured look: true thickness, which is the flat layer. Same view as 6.
  lowOrbit(arcToward(S1, n, 9), S1, 420, 9);
  try { sr.drawn.set('measured'); } catch (e) { look.warns.push('probe: the Measured look could not be set: ' + e); }
  await frames(2);
  out.measuredSteps = par().x;
  if (out.measuredSteps !== 0) out.fail = 'under the Measured look the clouds are still drawn thicker than they are (view steps ' + out.measuredSteps + ')';
  await picture('8-dusk-storm-measured', 'the Measured look, same view as 6: the clouds at their true thickness', 7000);
  try { sr.drawn.set('film'); } catch { /* said above */ }
  await frames(2);
  appSteps = null;
}

// ---- following the station itself, wherever it is now ---------------------------------------------------
sr.clock.live();
await frames(3);
{
  const iss = ['25544', 'sat-25544', 'norad-25544', 'iss'].map((id) => sr.recordById(id)).find(Boolean);
  if (iss) {
    sr.select(iss, { fly: true, undo: false });
    await sleep(8000);
    // The station crosses the terminator twice a lap: step the clock on, two minutes at a time, to the
    // first moment the Sun is within a few degrees of its horizon (the camera follows it, so the
    // camera's own place over the Earth is the station's to within a degree).
    const t0 = Date.now();
    const sunHere = () => { const c = centre(); const p = sr.camera.position; return dot(unit({ x: p.x - c.x, y: p.y - c.y, z: p.z - c.z }), sunward(E)); };
    let crossing = null;
    for (let m = 0; m <= 96 && crossing === null; m += 2) {
      sr.clock.goTo(t0 + m * 60000);
      await frames(2);
      const mu = sunHere();
      if (mu > -0.02 && mu < 0.12) crossing = { minutesOn: m, mu: Math.round(mu * 100) / 100 };
    }
    out.stationCrossing = crossing;
    if (!crossing) look.warns.push('probe: the station did not come to the terminator in a lap: the picture is where it is now');
    await pair('9-following-the-station', `following the International Space Station, as a click on it does, ${crossing ? 'as it crosses the terminator ' + crossing.minutesOn + ' minutes from now (Sun\'s zenith cosine ' + crossing.mu + ')' : 'where it is now'}`, 7000);
    try { sr.deselect(); rig.stopFollow(); } catch { /* the next view sets its own target */ }
  } else look.missing.push('the International Space Station\'s record (the satellite catalogue is not among the saved files this tool serves)');
}

// ---- night ----------------------------------------------------------------------------------------------
sr.clock.goTo(nearest(14));
await frames(3);
lowOrbit(over(25, 105), over(35, 125));
await pair('10-night-asia', '420 km up over Asia at night: city lights, clouds dark over them', 7000);
sr.clock.live();
out.info = frameCost();
return finish(out);
