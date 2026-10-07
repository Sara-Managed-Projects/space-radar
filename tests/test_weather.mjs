// Weather on every world (spec 0066): the arithmetic, the registry's promises, and the door.
//
//   node tests/test_weather.mjs
//
// No browser: the wind profile to an angular rate, the two-phase clock, Mars's season against the
// dates NASA publishes, the lightning decode against a picture saved from NOAA, the flash schedule,
// the shader patch, the card's lines, and that none of it is on the first visit.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { inflateSync } from 'node:zlib';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
let failed = 0;
function check(ok, msg) {
  if (!ok) { failed++; console.log(`  FAIL ${msg}`); }
}
const near = (a, b, tol) => Math.abs(a - b) <= tol;

const F = await import(join(JS, 'scene/weather/flow.js'));
const L = await import(join(JS, 'data/lightning.js'));
const { WEATHER } = await import(join(JS, 'data/weather.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const row = (id) => WEATHER.find((r) => r.id === id);

// --- 1. a wind is an angle ---------------------------------------------------------------------
{
  // 100 m/s at Jupiter's equator: 8 640 km a day round 449 197 km.
  check(near(F.turnsPerDay(100, 0, 71492), 8640 / (2 * Math.PI * 71492), 1e-12), 'turnsPerDay at the equator');
  // The same wind at 60 degrees covers a circle half as long, so twice the angle.
  check(near(F.turnsPerDay(100, 60, 71492) / F.turnsPerDay(100, 0, 71492), 2, 1e-9), 'and twice the angle at 60 degrees');
  check(Number.isFinite(F.turnsPerDay(10, 90, 71492)) && Number.isFinite(F.turnsPerDay(10, -90, 71492)), 'finite at the poles');
  check(F.turnsPerDay(-50, 20, 71492) < 0, 'a westward wind is a negative rate');
  // Planetographic to planetocentric: Saturn's hexagon, 78.1 N graphic, is 75.5 N centric (Sánchez-Lavega 2021).
  check(near(F.planetocentricDeg(78.1, 0.098), 75.5, 0.1), `Saturn 78.1 graphic is 75.5 centric (got ${F.planetocentricDeg(78.1, 0.098).toFixed(2)})`);
  check(F.planetocentricDeg(40, 0) === 40 || near(F.planetocentricDeg(40, 0), 40, 1e-9), 'a sphere has one latitude');
  check(F.planetocentricDeg(90, 0.1) === 90 && F.planetocentricDeg(-90, 0.1) === -90, 'the poles stay the poles');
  check(F.interp([[0, 1], [10, 3]], 5) === 2 && F.interp([[0, 1], [10, 3]], -4) === 1 && F.interp([[0, 1], [10, 3]], 40) === 3, 'interp: straight lines, flat past the ends');
}

// --- 2. the published jets come out where the papers put them ---------------------------------------
{
  const jup = row('jupiter-bands').profile;
  // Tollefson 2017: 150 m/s at 24 N graphic, 150 at 7 S, -50 at 20 S.
  check(near(F.windAt(jup, F.planetocentricDeg(24, jup.flattening)), 150, 1e-6), 'Jupiter: the 24 N jet is 150 m/s');
  check(near(F.windAt(jup, F.planetocentricDeg(-7, jup.flattening)), 150, 1e-6), 'Jupiter: the 7 S jet is 150 m/s');
  check(near(F.windAt(jup, F.planetocentricDeg(-20, jup.flattening)), -50, 1e-6), 'Jupiter: the 20 S jet blows west at 50 m/s');
  // 2026-10-07: THE MAP AND THE WINDS AGREE. The Great Red Spot is an anticyclone caught between the
  // westward jet on its north side and the eastward one on its south, and where it sits in the map
  // offer as Jupiter's second face (Hubble's OPAL map of December 2025, scene/worlds.js `faceSpot`, measured on the picture) is independent of
  // the wind table (Tollefson et al. 2017). If the map's rows were laid out in another latitude than
  // the flow reads them in, the oval would sit inside one jet. It does not: the wind at its centre
  // is near zero, west on its north edge and east on its south.
  {
    const { WORLDS: W_ } = await import(join(JS, 'scene/worlds.js'));
    const spot = W_.find((x) => x.id === 'jupiter').look.faceSpot.hubble;
    const lat = (spot.v - 0.5) * 180;
    const half = spot.half_v * 180;
    const [south, mid, north] = [lat - half, lat, lat + half].map((x) => F.windAt(jup, x));
    check(Math.abs(mid) < 15 && north < -10 && south > 10,
      `Jupiter: the Great Red Spot in the map (${lat.toFixed(1)} planetocentric) sits between the jets of the wind table: ${south.toFixed(0)}, ${mid.toFixed(0)}, ${north.toFixed(0)} m/s`);
    check(lat < -18 && lat > -22, `Jupiter: the spot is at 22.4 S planetographic, 20 S planetocentric, in the map (${lat.toFixed(1)})`);
  }
  const sat = row('saturn-bands').profile;
  check(F.windAt(sat, 0) >= 350 && F.windAt(sat, 0) <= 450, 'Saturn: the equator runs some 400 m/s ahead');
  check(near(F.windAt(sat, F.planetocentricDeg(78.1, sat.flattening)), 104, 1e-6), 'Saturn: the hexagon\'s jet is 104 m/s');
  const nep = row('neptune-drift').profile;
  check(near(F.windAt(nep, 0), -398, 1e-9), 'Neptune: Sromovsky\'s fit at the equator');
  // The fit itself, at the latitudes the table samples it.
  for (const lat of [10, 30, 50, 70]) {
    const fit = -398 + 0.188 * lat * lat - 1.2e-5 * lat ** 4;
    const [, u] = nep.points.find((p) => p[0] === lat);
    check(near(u, fit, 1.5), `Neptune: the table is the fit at ${lat} degrees (${u} vs ${fit.toFixed(1)})`);
  }
  // Venus: about four days at the equator, with the rotation, which under the IAU's north is westward.
  const ven = F.rateTable(row('venus-superrotation').profile);
  const eq = ven[(F.RATE_ROWS - 1) / 2];
  check(eq < 0 && near(1 / Math.abs(eq), 4.4, 0.2), `Venus: once round in ${(1 / Math.abs(eq)).toFixed(2)} days at the equator, westward`);
  check(F.rateTable(row('uranus-drift').profile)[(F.RATE_ROWS - 1) / 2] > 0, 'Uranus turns backwards: its equator\'s wind against the rotation is eastward on the map');
  for (const r of WEATHER.filter((x) => x.kind === 'zonal-flow')) {
    const table = F.rateTable(r.profile);
    check(table.length === F.RATE_ROWS && table.every(Number.isFinite), `${r.id}: ${F.RATE_ROWS} finite rates`);
  }
}

// --- 3. the split and the two-phase clock ------------------------------------------------------
{
  const jup = F.splitFlow(F.rateTable(row('jupiter-bands').profile), true);
  check(jup.rigid === 0, 'Jupiter\'s map does not turn as a whole: the Great Red Spot stays where the map has it');
  const ven = F.splitFlow(F.rateTable(row('venus-superrotation').profile), false);
  check(ven.rigid < 0, 'Venus\'s whole deck turns westward');
  for (const s of [jup, ven]) {
    const peak = Math.max(...Array.from(s.rates, Math.abs));
    // No band is ever more than MAX_SHIFT_TURNS from where the map has it.
    check(peak * s.cycleDays / 2 <= F.MAX_SHIFT_TURNS + 1e-9 || s.cycleDays === F.CYCLE_DAYS.min, `a band slides at most 30 degrees in half a cycle (${(peak * s.cycleDays / 2 * 360).toFixed(1)})`);
    check(s.cycleDays >= F.CYCLE_DAYS.min && s.cycleDays <= F.CYCLE_DAYS.max, 'the cycle is inside its limits');
  }
  const DAY = 86400000;
  const cyc = 5;
  let worst = 0;
  let prev = null;
  for (let ms = 0; ms <= 3 * cyc * DAY; ms += DAY / 96) {
    const p = F.flowPhases(1.7e12 + ms, cyc);
    check(p.w2 >= 0 && p.w2 <= 1, 'a weight is a weight');
    check(Math.abs(p.tau1) <= cyc / 2 + 1e-9 && Math.abs(p.tau2) <= cyc / 2 + 1e-9, 'each copy flows at most half a cycle');
    if (prev) {
      // What the eye follows is each copy weighted: a copy's time may only jump while its weight is ~0.
      const j1 = Math.abs(p.tau1 - prev.tau1) > cyc / 2 ? (1 - p.w2) + (1 - prev.w2) : 0;
      const j2 = Math.abs(p.tau2 - prev.tau2) > cyc / 2 ? p.w2 + prev.w2 : 0;
      worst = Math.max(worst, j1, j2);
      // And between jumps each copy moves forward at the clock's rate.
      if (Math.abs(p.tau1 - prev.tau1) < cyc / 2) check(near(p.tau1 - prev.tau1, 1 / 96, 1e-6), 'a copy flows at the clock\'s rate');
    }
    prev = p;
  }
  check(worst < 0.01, `a copy wraps only at zero weight (worst weight at a wrap ${worst.toFixed(4)})`);
  // Backwards is backwards.
  const a = F.flowPhases(1.7e12, cyc);
  const b = F.flowPhases(1.7e12 - 3600000, cyc);
  check(b.tau1 < a.tau1 || b.tau1 - a.tau1 > cyc / 2, 'scrubbing back moves the copies back');
  check(near(F.rigidTurn(4.4 * DAY, 1 / 4.4), 0, 1e-9) || near(F.rigidTurn(4.4 * DAY, 1 / 4.4), 1, 1e-9), 'a whole turn is no turn');
  check(near(F.rigidTurn(1.1 * DAY, 1 / 4.4), 0.25, 1e-9), 'a quarter of the period is a quarter turn');
  check(F.rigidTurn(1.1 * DAY, -1 / 4.4) === 0.75 || near(F.rigidTurn(1.1 * DAY, -1 / 4.4), 0.75, 1e-9), 'and westward wraps into 0..1');
}

// --- 4. Mars's season from the date ----------------------------------------------------------------
{
  // Allison and McEwen's own worked example: 2000-01-06 00:00 UTC is Ls 277.18.
  check(near(F.marsLs(Date.UTC(2000, 0, 6)), 277.18, 0.05), `Ls on 2000-01-06 is 277.18 (got ${F.marsLs(Date.UTC(2000, 0, 6)).toFixed(2)})`);
  // The first days of Mars years 37 and 38 (Ls 0): 2022-12-26 and 2024-11-12 (Piqueux et al. 2015's calendar).
  for (const iso of ['2022-12-26T12:00:00Z', '2024-11-12T12:00:00Z']) {
    const ls = F.marsLs(Date.parse(iso));
    check(ls < 1 || ls > 359, `Ls is 0 at the start of a Mars year, ${iso} (got ${ls.toFixed(2)})`);
  }
  // The 2018 planet-encircling dust storm began near Ls 185, late May 2018.
  check(near(F.marsLs(Date.parse('2018-05-30T00:00:00Z')), 185, 3), 'the 2018 global storm began near Ls 185');
  const mars = row('mars-season');
  const spring = F.marsSeason(mars, 2);
  const summer = F.marsSeason(mars, 100);
  const dusty = F.marsSeason(mars, 250);
  check(spring.northEdgeDeg < summer.northEdgeDeg, 'the north frost cap is bigger in spring than in summer');
  check(F.marsSeason(mars, 120).southEdgeDeg > F.marsSeason(mars, 300).southEdgeDeg, 'the south frost cap is bigger in its winter than its summer');
  check(dusty.dust > 0.4 && spring.dust < 0.1, 'the air is dusty near perihelion and clear at the northern spring equinox');
  check(near(F.marsSeason(mars, 0).northEdgeDeg, F.marsSeason(mars, 360).northEdgeDeg, 1e-9) && near(F.marsSeason(mars, 0).dust, F.marsSeason(mars, 360).dust, 1e-9), 'the year closes on itself');
}

// --- 5. the lightning map, decoded --------------------------------------------------------------
// A PNG saved from NOAA nowCOAST on 2026-10-03 (the 17:45 UTC slot, 6 452 bytes), decoded here with
// zlib: 8-bit palette, no interlace, which is what the server sends.
function decodePng(buf) {
  let off = 8;
  let w = 0, h = 0, type = 0, depth = 0;
  let plte = null, trns = null;
  const idat = [];
  while (off < buf.length) {
    const len = buf.readUInt32BE(off);
    const name = buf.toString('latin1', off + 4, off + 8);
    const data = buf.subarray(off + 8, off + 8 + len);
    if (name === 'IHDR') { w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; type = data[9]; }
    else if (name === 'PLTE') plte = data;
    else if (name === 'tRNS') trns = data;
    else if (name === 'IDAT') idat.push(data);
    off += 12 + len;
  }
  if (type !== 3 || depth !== 8) throw new Error(`fixture is PNG type ${type} depth ${depth}`);
  const raw = inflateSync(Buffer.concat(idat));
  const out = new Uint8ClampedArray(w * h * 4);
  const line = new Uint8Array(w);
  const prev = new Uint8Array(w);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (w + 1)];
    for (let x = 0; x < w; x++) {
      const v = raw[y * (w + 1) + 1 + x];
      const a = x ? line[x - 1] : 0;
      const b = prev[x];
      const c = x ? prev[x - 1] : 0;
      let p = 0;
      if (f === 1) p = a; else if (f === 2) p = b; else if (f === 3) p = (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); p = pa <= pb && pa <= pc ? a : pb <= pc ? b : c; }
      line[x] = (v + p) & 255;
    }
    for (let x = 0; x < w; x++) {
      const i = line[x];
      out.set([plte[i * 3], plte[i * 3 + 1], plte[i * 3 + 2], trns && i < trns.length ? trns[i] : 255], (y * w + x) * 4);
    }
    prev.set(line);
  }
  return { data: out, width: w, height: h };
}
{
  const img = decodePng(readFileSync(join(ROOT, 'tests/fixtures/weather/nowcoast-lightning-2026-10-03T1745Z.png')));
  check(img.width === L.GRID_W && img.height === L.GRID_H, `the fixture is ${L.GRID_W} x ${L.GRID_H}`);
  const grid = L.decodeGrid(img.data, img.width, img.height);
  // Measured the day it was saved: 2 016 cells, 1 449 strikes a minute.
  check(grid.cells.length === 2016, `2 016 cells with lightning (got ${grid.cells.length})`);
  check(near(grid.perMin, 1449, 15), `1 449 strikes a minute (got ${grid.perMin.toFixed(0)})`);
  check(grid.unknown === 0, 'every opaque pixel is a palette colour');
  check(grid.cells.every((c) => c.latDeg > -25 && c.latDeg < 80), 'every cell is inside NOAA\'s box');
  // The map reaches from 110 E eastward to Greenwich: nothing over Africa east of 0 or Asia west of 110 E.
  check(grid.cells.every((c) => c.lonDeg < 2 || c.lonDeg > 108), 'nothing between Greenwich and 110 E, where the map does not reach');

  const model = L.flashModel(grid.cells, Date.parse('2026-10-03T17:45:00Z'));
  check(near(model.perMin, grid.perMin, 1e-6), 'the model\'s rate is the grid\'s');
  // The schedule: the same second is the same flashes; a minute holds about the measured number.
  const a = L.flashesInSecond(model, 1790000000);
  const b = L.flashesInSecond(model, 1790000000);
  check(JSON.stringify(a) === JSON.stringify(b), 'one second of the clock always holds the same flashes');
  check(JSON.stringify(a) !== JSON.stringify(L.flashesInSecond(model, 1790000001)), 'and the next second holds others');
  let n = 0;
  let inCells = true;
  let inSecond = true;
  for (let s = 0; s < 600; s++) {
    const fl = L.flashesInSecond(model, 1790000000 + s);
    n += fl.length;
    for (const f of fl) {
      if (!(f.tMs >= (1790000000 + s) * 1000 && f.tMs < (1790000001 + s) * 1000)) inSecond = false;
      if (!(f.energy > 0.4 && f.energy <= 1)) inCells = false;
      // Within a pixel of some cell with lightning in it.
      if (!grid.cells.some((c) => Math.abs(c.latDeg - f.latDeg) <= 0.126 && Math.abs(c.lonDeg - f.lonDeg) <= 0.126)) inCells = false;
    }
  }
  const expected = model.perMin * 10;
  check(Math.abs(n - expected) < 4 * Math.sqrt(expected), `ten minutes hold about ${expected.toFixed(0)} flashes (got ${n})`);
  check(inSecond, 'each flash is inside its own second');
  check(inCells, 'each flash is where the map has lightning');
  // The cap: a storm of a million strikes a minute is still not a strobe.
  const heavy = L.flashModel([{ latDeg: 0, lonDeg: -60, perMin: 1e6 }], 0);
  check(L.flashesInSecond(heavy, 5).length === L.MAX_FLASHES_PER_SECOND, 'never more than the cap in a second');
  check(L.flashesInSecond(L.flashModel([], 0), 5).length === 0 && L.flashesInSecond(null, 5).length === 0, 'no map, no flashes');

  // The palette is the SLD's: seventeen classes, each read back as itself, anything else refused.
  check(L.PALETTE.length === 17, 'seventeen classes');
  check(L.PALETTE.every((p) => L.paletteRow(...p.rgb) === p), 'each palette colour reads back as its own class');
  check(L.paletteRow(240, 240, 240) === null && L.paletteRow(10, 80, 200) === null, 'a colour that is not in the palette is not lightning');
  check(L.paletteRow(0xfc, 0xa6, 0x02).lo === 1, 'a colour a few counts off is still its class');
  check(near(L.cellAreaKm2(0), (0.25 * L.KM_PER_DEG) ** 2, 1e-6) && near(L.cellAreaKm2(60) / L.cellAreaKm2(0), 0.5, 1e-9), 'a cell is a quarter degree square, narrower with latitude');

  // The slot's time and the URL.
  const caps = '<Layer><Name>ldn_lightning_strike_density</Name><Dimension name="time" default="2026-10-03T17:45:00Z" units="ISO8601" nearestValue="1">2026-10-03T11:15:00.000Z,2026-10-03T11:30:00.000Z</Dimension></Layer>';
  check(L.parseNewestSlot(caps) === Date.parse('2026-10-03T17:45:00Z'), 'the newest slot is the time dimension\'s default');
  check(Number.isNaN(L.parseNewestSlot('<html>503</html>')) && Number.isNaN(L.parseNewestSlot('')), 'no time, no slot');
  const url = L.mapUrl(Date.parse('2026-10-03T17:45:00Z'));
  check(url.startsWith('https://nowcoast.noaa.gov/geoserver/lightning_detection/wms?') && url.includes('LAYERS=ldn_lightning_strike_density') && url.includes('BBOX=-25,-180,80,180') && url.includes('WIDTH=1440&HEIGHT=420') && url.includes('TIME=2026-10-03T17:45:00.000Z'), `the map URL (${url})`);
  check(!/[?&](email|user|key|token)=/i.test(url) && !/[?&](email|user|key|token)=/i.test(L.CAPS_URL), 'nothing personal in either URL');

  // Live within an hour of the slot, away outside it.
  const slot = Date.parse('2026-10-03T17:45:00Z');
  check(L.lightningMode(slot + 20 * 60000, slot) === 'live' && L.lightningMode(slot - 30 * 60000, slot) === 'live', 'live near the slot');
  check(L.lightningMode(slot + 3 * 3600000, slot) === 'away' && L.lightningMode(slot - 86400000, slot) === 'away', 'away from it, the flashes go');
  check(L.lightningMode(slot, NaN) === 'none', 'no slot, no mode');
}

// --- 6. the registry's promises, as the browser reads them -----------------------------------------
{
  check(WEATHER.length >= 8, `eight effects (got ${WEATHER.length})`);
  for (const r of WEATHER) {
    check(['measured', 'modelled', 'illustrative'].includes(r.class), `${r.id}: class ${r.class}`);
    check(Array.isArray(r.off_at) && r.off_at.includes('tier0') && r.off_at.includes('save_data'), `${r.id}: off at tier 0 and on save-data`);
    check(typeof r.source === 'string' && r.source.length > 10, `${r.id}: names its source`);
    if (r.world !== 'earth') check(typeof COPY.weather.worlds[r.world] === 'string', `${r.world}: has its line in COPY.weather.worlds`);
  }
  check(row('earth-lightning').class === 'measured' && row('earth-lightning').off_at.includes('reduced_motion'), 'lightning is measured, and off under reduced motion');
  check(row('saturn-hexagon').class === 'illustrative' && row('mars-season').class === 'illustrative', 'the hexagon and Mars\'s season are illustrative');
  check(WEATHER.filter((r) => r.kind === 'zonal-flow').every((r) => r.class === 'modelled'), 'every wind profile is modelled');
  // Each line says which of the three it is, in a word a visitor reads.
  for (const [id, line] of Object.entries(COPY.weather.worlds)) {
    const classes = WEATHER.filter((r) => r.world === id).map((r) => r.class);
    for (const c of new Set(classes)) check(line.toLowerCase().includes(c === 'modelled' ? 'modelled' : c), `${id}'s line says "${c}"`);
    check(line.length <= 240, `${id}'s line is one line (${line.length} characters)`);
  }
  check(/measured/.test(COPY.weather.lightning.live) && /drawn/.test(COPY.weather.lightning.live), 'the lightning line says what is measured and what is drawn');
  check(/Americas/.test(COPY.weather.lightning.live), 'and where the map reaches');
  check(COPY.weather.seasons.length === 4, 'four seasons');
}

// --- 7. the shader patch -------------------------------------------------------------------------
{
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  const { WORLD_FRAG, WORLDS, worldMaterial, applyLook } = await import(join(JS, 'scene/worlds.js'));
  check(WORLD_FRAG.split(WW.MAP_LINE).length === 2, 'WORLD_FRAG reads its map on exactly one line');
  const frag = WW.weatherFragment();
  check(!frag.includes(WW.MAP_LINE) && frag.includes('wxBase( vUv )'), 'the patch replaces that line');
  check(frag.includes('#ifdef WX_ZONAL') && frag.includes('#elif defined( WX_MARS )'), 'both kinds are in the one source');
  check(frag.length - WORLD_FRAG.length > 1000 && frag.replace(/\n\/\/ ---- spec 0066[\s\S]*?\/\/ ---- end of weather ----\n\n/, '').replace('wxBase( vUv )', 'texture2D( uMap, vUv ).rgb') === WORLD_FRAG, 'and nothing else of WORLD_FRAG is touched');
  let threw = false;
  try { WW.weatherFragment('void main() {}'); } catch { threw = true; }
  check(threw, 'a WORLD_FRAG without the line is refused, not silently left alone');
  // Braces balance in the inserted block (a typo here is a black planet in the browser).
  const block = frag.slice(frag.indexOf('// ---- spec 0066'), frag.indexOf('// ---- end of weather'));
  check(block.split('{').length === block.split('}').length && block.split('(').length === block.split(')').length, 'the block\'s braces and brackets balance');

  // The controller, against real materials: which worlds wear it, what the clock writes, the latch.
  const meshes = new Map();
  for (const w of WORLDS) {
    if (w.look.earth || w.look.emissive) continue;
    const material = worldMaterial(null, w.look.tint);
    applyLook(material, w.look);
    meshes.set(w.id, { material, visible: true });
  }
  const wx = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null } });
  check(wx.worn().sort().join() === 'jupiter,mars,neptune,saturn,uranus,venus', `six worlds wear weather (${wx.worn().sort().join()})`);
  check(meshes.get('moon').material.fragmentShader === WORLD_FRAG && meshes.get('io').material.fragmentShader === WORLD_FRAG, 'the Moon and Io keep the plain shader');
  const jm = meshes.get('jupiter').material;
  check(jm.defines.WX_ZONAL === 1 && jm.uniforms.uWxRate.value.length === F.RATE_ROWS && jm.uniforms.uWxSpot.value.z > 0, 'Jupiter: the flow and the spot');
  check(meshes.get('saturn').material.uniforms.uWxHex.value.x > 0 && jm.uniforms.uWxHex.value.x === 0, 'Saturn has the hexagon and Jupiter does not');
  // The hexagon's line sits on 75.5 N centric: its mean colatitude is 14.5 degrees.
  check(near(meshes.get('saturn').material.uniforms.uWxHex.value.x * 0.955 * 180 / Math.PI, 14.52, 0.1), 'the hexagon sits at 78.1 N');
  check(meshes.get('mars').material.defines.WX_MARS === 1, 'Mars: the season');
  const t0 = Date.parse('2026-10-03T12:00:00Z');
  wx.update(t0);
  const p0 = { ...jm.uniforms.uWxPhase.value };
  wx.update(t0 + 6 * 3600000);
  const p1 = { ...jm.uniforms.uWxPhase.value };
  check(near(p1.x - p0.x, 0.25, 1e-6) || near(p1.y - p0.y, 0.25, 1e-6), 'six hours of the clock is a quarter day of flow');
  check(Math.abs(p0.x) < 1e3 && Math.abs(p0.w) <= 1, 'the shader is handed small numbers, never a Unix time');
  const cap = meshes.get('mars').material.uniforms.uWxCap.value;
  check(near(cap.x * 180 / Math.PI, 60.3, 1) && cap.z < 0.1, `Mars on 2026-10-03 is at the northern spring equinox: frost to 60 N, clear air (${(cap.x * 180 / Math.PI).toFixed(1)}, ${cap.z.toFixed(2)})`);
  wx.latch();
  check([...meshes.values()].every((m) => m.material.fragmentShader === WORLD_FRAG), 'the latch puts every world back in its own shader');
  check(wx.worn().length === 0 && !meshes.get('jupiter').material.defines.WX_ZONAL, 'and nothing wears weather after it');
}

// --- 8. the door: the card's lines, with a stub for the network ------------------------------------
{
  const { createWeather, seasonName } = await import(join(JS, 'scene/weather/index.js'));
  const { WORLDS, worldMaterial } = await import(join(JS, 'scene/worlds.js'));
  check(seasonName(1.5) === 'northern spring' && seasonName(100) === 'northern summer' && seasonName(250) === 'northern autumn' && seasonName(359) === 'northern winter', 'the season in words');
  const meshes = new Map(WORLDS.filter((w) => !w.look.earth && !w.look.emissive).map((w) => [w.id, { material: worldMaterial(null, w.look.tint), visible: true }]));
  const img = decodePng(readFileSync(join(ROOT, 'tests/fixtures/weather/nowcoast-lightning-2026-10-03T1745Z.png')));
  const slot = Date.parse('2026-10-03T17:45:00Z');
  const asked = [];
  const weather = createWeather({
    worlds: { meshFor: (id) => meshes.get(id) || null },
    now: () => slot + 12 * 60000,
    fetchImpl: async (url) => {
      asked.push(url);
      return url.includes('GetCapabilities')
        ? { ok: true, text: async () => '<Dimension name="time" default="2026-10-03T17:45:00Z" units="ISO8601">x</Dimension>' }
        : { ok: true, blob: async () => ({ size: 6452 }) };
    },
    decodeImage: async () => img,
  });
  check(weather.line('earth', slot) === COPY.weather.lightning.waiting, 'before the map: waiting');
  check(weather.perMinute() === undefined, 'and the panel has no number yet');
  weather.tick(slot, { on: true });
  check(/northern spring/.test(weather.line('mars', slot)) && /illustrative/.test(weather.line('mars', slot)), `Mars's line names the season (${weather.line('mars', slot)})`);
  check(weather.line('jupiter', slot) === COPY.weather.worlds.jupiter, 'Jupiter\'s line');
  check(weather.line('moon', slot) === null && weather.line('io', slot) === null, 'a world with no weather has no line');
  await weather.lookNow();
  check(asked.length === 2 && asked[0].includes('GetCapabilities') && asked[1].includes('TIME=2026-10-03T17:45:00.000Z'), 'two requests: the time, then that slot\'s map');
  weather.tick(slot + 60000, { on: true });
  const live = weather.line('earth', slot + 60000);
  check(/about 1.450 strikes a minute/.test(live) && /17:45 UTC/.test(live), `the live line (${live})`);
  check(weather.perMinute() === 1449 || near(weather.perMinute(), 1449, 15), 'the panel\'s number is the map\'s');
  weather.tick(slot + 5 * 3600000, { on: true });
  check(weather.line('earth', slot + 5 * 3600000) === COPY.weather.lightning.away, 'five hours away: not drawn, and said');
  weather.tick(slot + 60000, { on: false });
  check(weather.line('earth', slot + 60000) === COPY.weather.lightning.switchedOff, 'the box unticked');
  await weather.lookNow();
  check(asked.length === 3, 'a second look with the same slot fetches the time and not the map again');
  // Reduced motion, asked for mid-visit: the flashes stop for good and the line says why.
  weather.tick(slot + 60000, { on: true, reducedMotion: true });
  check(weather.line('earth', slot + 60000) === COPY.weather.lightning.reducedMotion && weather.state().lightning.visible === false, 'reduced motion: no flashes');
  // The latch through the door.
  weather.tick(slot + 60000, { on: true, latched: true });
  check(weather.line('jupiter', slot) === null, 'after the latch a world has no weather line, because it has no weather');

  // A map that cannot be read.
  const broken = createWeather({ worlds: { meshFor: () => null }, fetchImpl: async () => ({ ok: false, status: 503 }), decodeImage: async () => img });
  await broken.lookNow();
  check(broken.line('earth', slot) === COPY.weather.lightning.failed && broken.perMinute() === 0, 'NOAA not answering: said, and nothing drawn');
}

// --- 9. off the first visit, off at tier 0 and on save-data ---------------------------------------
{
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(/import\('\.\/scene\/weather\/index\.js'\)/.test(main), 'main.js imports the weather dynamically');
  check(!/^import .*scene\/weather\//m.test(main) && !/^import .*data\/(weather|lightning)\.js/m.test(main), 'and never statically');
  check(!/modulepreload" href="js\/(scene\/weather\/|data\/weather|data\/lightning)/.test(html), 'index.html does not preload it');
  for (const f of ['scene/worlds.js', 'scene/earth.js', 'ui/cards.js', 'ui/status.js', 'data/layers.js']) {
    check(!/from '[^']*(scene\/weather\/|data\/weather\.js|data\/lightning\.js)/.test(readFileSync(join(JS, f), 'utf8')), `${f} does not import the weather`);
  }
  check(/const off = auroraSaveData \|\| !ctx\.quality \|\| ctx\.quality\.bootTier < 1;/.test(main), 'never at tier 0 or on a connection that saves data');
  check(/weatherStandIn\(true/.test(main), 'there the stand-in stays, and says why');
}

if (failed) {
  console.log(`weather FAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log('weather ok: winds to angles, the two-phase clock, Mars\'s season, NOAA\'s lightning map decoded and scheduled, the shader patch, the card\'s lines, off the first visit');
