// clouds: the Earth's clouds with height, from low orbit (scene/cloudshell.js, spec 0072 requirement 6).
// The whole-Earth view, where the shell must be OFF; then the station's height, 420 km: along the
// limb by day with the shell, with the flat layer it replaces, and with the limb's own rays left
// out (what of the horizon is cloud and what is the air's glow); straight down; across the
// terminator into the night, along it, and back toward the Sun; the Measured look's true
// thickness; the night side; following the station itself when its record is there; 1 300 km up;
// and far off again. Every picture's note says whether the shell was on, in how many steps, how
// thick, the camera's height, and which clouds (today's composite or the static map).
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
const shellNow = () => (sr.cloudShell ? sr.cloudShell.state() : null);
/** Wait for frames that were really drawn: a software renderer may take seconds over one, and a sleep alone photographs the frame before. */
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
const picture = async (name, what, settleMs = 7000) => {
  await frames(3);
  await sleep(settleMs);
  await frames(2);
  const s = shellNow();
  const row = { name, km: s ? s.altitudeKm : null, shell: s ? Math.round(s.shell * 100) / 100 : null, steps: s ? s.steps : 0, thicker: s ? s.thicker : null, uShell: earth.material.uniforms.uShell.value, clouds: cloudsNow(), ...frameCost() };
  out.views.push(row);
  await shot(name, `${what} | shell ${s ? (s.on ? 'ON ' + row.shell + ', ' + s.steps + ' steps, drawn ' + s.thicker + 'x' : 'off') : 'not loaded'} | camera ${row.km} km up | clouds: ${row.clouds}`);
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
// Today's composite takes its first look some seconds after the layers land; wait for it, and say if it never came.
out.liveClouds = await until(() => cloudsNow() === 'live', 90000, 1000);
if (!out.liveClouds) look.missing.push('today\'s cloud composite (the static map is what the pictures show): ' + cloudsNow());

// ---- the whole Earth: the flat layer's -------------------------------------------------------------
sr.clock.goTo(nearest(14));
await frames(3);
rig.flyTo({ targetScene: centre(), offset: over(15, -35), distance: TWO_THIRDS, ms: 0 });
await picture('1-whole-earth', 'the whole Earth, the disc two thirds of the view: the flat layer, the shell must be off', 8000);
out.frameMs = { wholeEarth: await frameMs() };
if (earth.material.uniforms.uShell.value !== 0) out.fail = 'the shell is in on the whole-Earth view (uShell ' + earth.material.uniforms.uShell.value + ')';

// ---- the station's height, by day: aimed at the tallest cloud in daylight ------------------------------
const dayStorm = tallestCloud(0.45, 0.95) || { lat: 8, lon: -30, fallback: true };
out.dayStorm = dayStorm;
{
  const S0 = over(dayStorm.lat, dayStorm.lon);
  const side = unit(cross(S0, sunward(E)));          // across the Sun's light: the storm is lit from one side
  const from = (deg) => arcToward(S0, side, deg);
  // 19 degrees of arc back from it: from 420 km the horizon is 20 off, so the storm stands ON it.
  lowOrbit(from(19), S0);
  out.shellLoaded = await until(() => sr.cloudShell && sr.cloudShell.state().shell >= 1, 150000, 1000);
  if (!out.shellLoaded) {
    out.fail = 'the cloud shell never came on from 420 km (tier ' + (sr.quality && sr.quality.tier) + ', latched ' + sr.latch.latched + ', first visit over ' + !!window.__srFirstVisitOver + ', disc ' + sr.worlds.discShare(E) + ', shell ' + JSON.stringify(shellNow()) + ')';
    await shot('0-no-shell', 'the shell never came on');
    return finish(out);
  }
  const where = `the tallest cloud in daylight (${dayStorm.lat}, ${dayStorm.lon}${dayStorm.fallback ? ', a fixed place: no composite' : ''})`;
  await picture('2-limb-day-shell', `420 km up, ${where} on the horizon: do its tops stand in profile`, 9000);
  out.frameMs.limbShell8 = await frameMs();
  sr.cloudShell.probe({ noLimb: true });
  await picture('2b-limb-day-no-limb-rays', 'the same without the rays that miss the ground: what of the horizon was cloud', 7000);
  sr.cloudShell.probe({ noLimb: false, tier: 2 });
  await picture('2c-limb-day-12-steps', 'the same marched as tier 2 does, in 12 steps', 7000);
  out.frameMs.limbShell12 = await frameMs();
  sr.cloudShell.probe({ tier: null, off: true });
  await picture('2d-limb-day-flat', 'the same with the flat layer the shell replaces', 9000);
  out.frameMs.limbFlat = await frameMs();
  sr.cloudShell.probe({ off: false });
  // Nearer: 9 degrees back, looking at it. The storm fills the middle distance, seen from the side.
  lowOrbit(from(9), S0, 420, 9);
  await picture('3-storm-day-shell', `420 km up, 1 000 km from ${where}: its sides and its shadow`, 9000);
  sr.cloudShell.probe({ off: true });
  await picture('3b-storm-day-flat', 'the same with the flat layer', 9000);
  sr.cloudShell.probe({ off: false });
  // Straight down on it: the flat layer's share, and the shell throws its pixels away.
  rig.flyTo({ targetScene: centre(), offset: S0, distance: R * (1 + 420 / R_KM), ms: 0 });
  await picture('4-straight-down', '420 km up, straight down on it: the flat layer draws this, the shell nothing', 9000);
  out.frameMs.straightDownShell = await frameMs();
  sr.cloudShell.probe({ off: true });
  await frames(3);
  out.frameMs.straightDownFlat = await frameMs();
  sr.cloudShell.probe({ off: false });
  // 1 300 km up, the storm on that horizon (34 degrees of arc off).
  lowOrbit(from(31), S0, 1300, 26);
  await picture('4b-limb-day-1300km', `1 300 km up, ${where} toward the horizon`, 9000);
}

// ---- the terminator: aimed at the tallest cloud in the last light ----------------------------------------
{
  const duskStorm = tallestCloud(0.0, 0.14) || tallestCloud(-0.05, 0.25);
  out.duskStorm = duskStorm;
  const sun = sunward(E);
  const n = north(E);
  const S1 = duskStorm ? over(duskStorm.lat, duskStorm.lon) : unit(mix(unit(cross(n, sun)), 0.997, sun, 0.07));
  const where = duskStorm ? `the tallest cloud in the last light (${duskStorm.lat}, ${duskStorm.lon}, Sun's zenith cosine ${duskStorm.mu})` : 'a point 4 degrees on the day side of the terminator (no composite)';
  // From the day side, 19 degrees back toward the Sun, looking into the night: the storm on the horizon.
  lowOrbit(arcToward(S1, sun, 19), S1);
  await picture('5-dusk-horizon-shell', `420 km up on the day side, ${where} on the horizon: tops lit over ground in shadow`, 9000);
  sr.cloudShell.probe({ off: true });
  await picture('5b-dusk-horizon-flat', 'the same with the flat layer', 9000);
  sr.cloudShell.probe({ off: false });
  // Nearer, and from the side: 9 degrees north of it looking south along the terminator.
  lowOrbit(arcToward(S1, n, 9), S1, 420, 9);
  await picture('6-dusk-storm-shell', `420 km up, 1 000 km north of ${where}, looking along the terminator: side-lit tops, long shadows`, 9000);
  sr.cloudShell.probe({ off: true });
  await picture('6b-dusk-storm-flat', 'the same with the flat layer', 9000);
  sr.cloudShell.probe({ off: false });
  // From the night side back toward the Sun: the storm against the bright limb.
  lowOrbit(arcToward(S1, sun, -19), S1);
  await picture('7-toward-the-sun', '420 km up on the night side, the same storm on the horizon with the Sun behind it', 9000);
  // The Measured look: true thickness, same view as 6.
  lowOrbit(arcToward(S1, n, 9), S1, 420, 9);
  try { sr.drawn.set('measured'); } catch (e) { look.warns.push('probe: the Measured look could not be set: ' + e); }
  await picture('8-dusk-storm-measured', 'the Measured look, same view as 6: the clouds at their true thickness', 9000);
  try { sr.drawn.set('film'); } catch { /* said above */ }
}

// ---- following the station itself, wherever it is now ---------------------------------------------------
sr.clock.live();
await frames(3);
{
  const iss = ['25544', 'sat-25544', 'norad-25544', 'iss'].map((id) => sr.recordById(id)).find(Boolean);
  if (iss) {
    sr.select(iss, { fly: true, undo: false });
    await picture('9-following-the-station', 'following the International Space Station, as a click on it does, where it is now', 14000);
    try { sr.deselect(); rig.stopFollow(); } catch { /* the next view sets its own target */ }
  } else look.missing.push('the International Space Station\'s record (the satellite catalogue is not among the saved files this tool serves)');
}

// ---- night, and far off again ---------------------------------------------------------------------------
sr.clock.goTo(nearest(14));
await frames(3);
lowOrbit(over(25, 105), over(35, 125));
await picture('10-night-asia', '420 km up over Asia at night: city lights, clouds dark over them, no glow', 9000);
rig.flyTo({ targetScene: centre(), offset: over(15, -35), distance: R * 12, ms: 0 });
await picture('11-far', 'far off: the shell must be off and the flat layer whole', 9000);
out.farShell = shellNow();
out.farUShell = earth.material.uniforms.uShell.value;
if (out.farUShell !== 0 || (out.farShell && out.farShell.on)) out.fail = 'far from the Earth the shell is still on: ' + JSON.stringify(out.farShell) + ', uShell ' + out.farUShell;
sr.clock.live();
out.info = frameCost();
return finish(out);
