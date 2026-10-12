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
await import(join(JS, 'copy/en.later.js'));
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
    // The line, and the sentences that may follow it (what else is drawn; the lightning where it is drawn).
    const parts = [line, COPY.weather.also[id], COPY.weatherStorms.turning[id], COPY.weatherStorms.poles[id], COPY.weather.flashes[id]].filter(Boolean);
    for (const c of new Set(classes)) check(parts.join(' ').toLowerCase().includes(c === 'modelled' ? 'modelled' : c), `${id}'s line says "${c}"`);
    for (const part of parts) check(part.length <= 240, `${id}'s line is one line (${part.length} characters)`);
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
  check(frag.length - WORLD_FRAG.length > 1000 && frag.replace(/\n\/\/ ---- spec 0066[\s\S]*?\/\/ ---- end of weather ----\n\n/, '').replace('wxBase( vUv )', 'texture2D( uMap, vUv ).rgb').replace('colour += wxFlash( vPosL, d );\n  ', '') === WORLD_FRAG, 'and nothing else of WORLD_FRAG is touched');
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
  check(wx.worn().sort().join() === 'jupiter,mars,neptune,saturn,titan,uranus,venus', `seven worlds wear weather (${wx.worn().sort().join()})`);
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
  check(weather.line('jupiter', slot) === [COPY.weather.worlds.jupiter, COPY.weatherStorms.turning.jupiter, COPY.weatherStorms.poles.jupiter, COPY.weather.flashes.jupiter].join(' '), 'Jupiter\'s line, its storms\', its poles\' and its lightning\'s');
  check(weather.line('venus', slot).endsWith(COPY.weather.also.venus) && /reported and is still debated; none is drawn/.test(weather.line('venus', slot)), 'Venus\'s line says its lightning is debated and not drawn');
  check(/seasonal and illustrative, not today/.test(weather.line('mars', slot)) && /optical depth near 0\.\d/.test(weather.line('mars', slot)), `Mars's line gives the season's dust and says it is not today's (${weather.line('mars', slot)})`);
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

// --- 10. 2026-10-08: the season's dust as an optical depth, the dark Y, the giants' lightning, Titan's clouds
{
  const mars = row('mars-season');
  const clear = F.marsSeason(mars, 60);
  const peak = F.marsSeason(mars, 245);
  const pause = F.marsSeason(mars, 275);
  const late = F.marsSeason(mars, 325);
  check(near(clear.tau, 0.25, 1e-9) && clear.dust === 0, 'northern spring and summer: an optical depth of 0.25 (Gusev\'s 0.2 to 0.3) and the map as it is');
  check(near(peak.tau, 0.9, 1e-9) && near(peak.dust, 1 - Math.exp(-0.65), 1e-9), `Ls 245: 0.9 (Meridiani's 0.35 in the infrared, times 2.6), which takes ${(peak.dust * 100).toFixed(0)} % of the ground's light`);
  check(pause.tau < peak.tau && pause.tau < late.tau && late.tau < peak.tau, 'a fall after Ls 260 and a late peak after 320, as Montabone et al. describe');
  check(mars.dust_north > 0 && mars.dust_north < 1 && mars.class === 'illustrative', 'the dusty season\'s haze is thinner in the north, and the row is illustrative');

  // The flashes: where, how often, how bright.
  const jl = row('jupiter-lightning').lightning;
  const sl = row('saturn-lightning').lightning;
  let seed = 12345;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  let north = 0; let south = 0; let equator = 0; let wait = 0;
  const N = 4000;
  for (let i = 0; i < N; i++) {
    const f = F.nextFlash(jl, rand);
    if (f.latDeg >= 40 && f.latDeg <= 80) north++; else if (f.latDeg <= -40 && f.latDeg >= -80) south++; else equator++;
    wait += f.waitS;
    if (!(f.lonDeg >= -180 && f.lonDeg < 180 && f.waitS >= 0 && f.lifeS === jl.life_s)) equator++;
  }
  check(equator === 0, 'Jupiter\'s flashes are poleward of 40 degrees, never near the equator (Brown et al. 2018)');
  check(near(north / south, 2, 0.25), `and twice as many in the north as the south (${north} to ${south})`);
  check(near(wait / N, jl.mean_gap_s, 0.6), `a slot waits ${jl.mean_gap_s} s on average (${(wait / N).toFixed(2)})`);
  for (let i = 0; i < 200; i++) { const f = F.nextFlash(sl, rand); check(f.latDeg >= -38 && f.latDeg <= -34.8, `Saturn's flashes are at Cassini's 36 S (${f.latDeg.toFixed(1)})`); }
  check(F.flashLight(-0.1, 0.4) === 0 && F.flashLight(0.4, 0.4) === 0 && F.flashLight(0.1, 0.4) > 0.4 && F.flashLight(0.1, 0.4) <= 1, 'a flash is dark before and after its life, and at most 1 inside it');
  const dir = F.bodyDirection(90, 0);
  check(near(dir[1], 1, 1e-12) && near(F.bodyDirection(0, 90)[2], -1, 1e-12) && near(F.bodyDirection(0, 0)[0], 1, 1e-12), 'a place in a world\'s axes: north is +Y, longitude 0 is +X, 90 east is -Z (scene/worlds.js)');
  for (const id of ['jupiter-lightning', 'saturn-lightning']) check(row(id).class === 'illustrative' && row(id).off_at.includes('reduced_motion') && row(id).lightning.mean_gap_s >= 3, `${id}: illustrative, rare, off under reduced motion`);

  // The Y: once round in four days, the way Venus's clouds go.
  const day = 86400000;
  check(near(F.wavePhase(0, 4, -1), 0, 1e-12) && near(F.wavePhase(day, 4, -1), 0.75, 1e-9) && near(F.wavePhase(4 * day, 4, -1), 0, 1e-9) && near(F.wavePhase(day, 4, 1), 0.25, 1e-9), 'the wave is a quarter turn a day, westward on Venus');
  check(row('venus-y').wave.depth <= 0.2 && row('venus-y').class === 'illustrative', 'the Y is drawn a fifth dark at most, and is illustrative');

  // The controller: uniforms, the wall clock, reduced motion, the latch.
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  const { WORLDS, worldMaterial, applyLook } = await import(join(JS, 'scene/worlds.js'));
  const dress = () => {
    const m = new Map();
    for (const w of WORLDS) { if (w.look.earth || w.look.emissive) continue; const material = worldMaterial(null, w.look.tint); applyLook(material, w.look); m.set(w.id, { material, visible: true }); }
    return m;
  };
  const meshes = dress();
  const wx = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null }, rand });
  const ju = meshes.get('jupiter').material;
  const sa = meshes.get('saturn').material;
  const ve = meshes.get('venus').material;
  const ti = meshes.get('titan').material;
  check(ju.defines.WX_FLASH === 1 && sa.defines.WX_FLASH === 1 && !ve.defines.WX_FLASH && !meshes.get('uranus').material.defines.WX_FLASH, 'Jupiter and Saturn flash; no other world does');
  check(ju.uniforms.uWxFlash.value.length === WW.FLASH_SLOTS * 4 && near(ju.uniforms.uWxFlashSize.value, 1.6 * Math.PI / 180, 1e-9), 'a flash is a place, a light and a size');
  check(ve.uniforms.uWxWave.value.x === 0.2 && near(ve.uniforms.uWxWave.value.z, Math.PI / 4, 1e-9) && ju.uniforms.uWxWave.value.x === 0, 'Venus has the Y and Jupiter does not');
  check(ti.defines.WX_PATCH === 1 && ti.uniforms.uWxPatch.value.length === WW.PATCH_SLOTS * 4 && near(ti.uniforms.uWxPatch.value[0], 62 * Math.PI / 180, 1e-6) && ti.uniforms.uWxPatch.value[14] === 0, 'Titan: three clouds in the north, the fourth slot empty');
  const t0 = Date.parse('2026-10-08T12:00:00Z');
  let litFrames = 0; let nightOnly = true; let maxLit = 0;
  for (let ms = 0; ms < 120000; ms += 50) {
    wx.update(t0, ms);   // the clock held still: the flashes still run, on wall time
    const f = ju.uniforms.uWxFlash.value;
    const lit = (f[3] > 0 ? 1 : 0) + (f[7] > 0 ? 1 : 0);
    if (lit) litFrames++;
    maxLit = Math.max(maxLit, f[3], f[7]);
    for (const k of [0, 4]) if (f[k + 3] > 0 && !(Math.abs(f[k + 1]) >= Math.sin(40 * Math.PI / 180) - 1e-6)) nightOnly = false;
  }
  check(litFrames > 20 && litFrames < 0.2 * 2400, `over two minutes with the clock held, Jupiter flashes now and then (${litFrames} of 2400 frames lit)`);
  check(nightOnly && maxLit <= 1, 'each at a latitude the row allows');
  check(wx.flashing('jupiter') && !wx.flashing('venus') && wx.state().worlds.find((w) => w.id === 'jupiter').flashes.slots === 2, 'and the state says who flashes');
  wx.update(t0 + day, 130000);
  check(near(ve.uniforms.uWxWave.value.y, F.wavePhase(t0 + day, 4, -1), 1e-9), 'the Y follows the clock');
  const frag = ju.fragmentShader;
  check(/float night = 1\.0 - smoothstep\( -0\.12, 0\.0, sunDot \);/.test(frag) && /colour \+= wxFlash\( vPosL, d \);/.test(frag), 'a flash is added last and only where the Sun is down');
  wx.latch();
  check(!ju.defines.WX_FLASH && !ti.defines.WX_PATCH && !wx.flashing('jupiter'), 'the latch takes the flashes and the clouds off with the rest');
  const still = dress();
  const calm = WW.createWorldWeather({ worlds: { meshFor: (id) => still.get(id) || null }, reducedMotion: true });
  check(!still.get('jupiter').material.defines.WX_FLASH && still.get('jupiter').material.defines.WX_ZONAL === 1 && !calm.flashing('jupiter'), 'where less motion is asked for there are no flashes, and the bands still move');
  const { createWeather } = await import(join(JS, 'scene/weather/index.js'));
  const fresh = dress();
  const quiet = createWeather({ worlds: { meshFor: (id) => fresh.get(id) || null }, reducedMotion: true, fetchImpl: async () => ({ ok: false }) });
  check(quiet.line('jupiter', t0) === COPY.weather.worlds.jupiter + ' ' + COPY.weatherStorms.poles.jupiter, `and Jupiter's card claims neither them nor anything that turns (${quiet.line('jupiter', t0)})`);
  check(/Webb and Keck/.test(COPY.weather.worlds.titan) && /Illustrative/.test(COPY.weather.worlds.titan) && /2022/.test(COPY.weather.worlds.titan), 'Titan\'s line dates its clouds and says they are illustrative');
}

// --- 11. 2026-10-12, spec 0073 requirement 4: Jupiter's storms ----------------------------------------
// Eddies where the measured shear is, the ovals where the pictures have them, the cyclones Juno
// counted, a deck with depth: the registry's promises, the pure arithmetic, the shader's text, and
// that all of it is off until the disc is large, still where less motion is asked for, and gone
// under the latch.
{
  const DEG = Math.PI / 180;
  const jup = row('jupiter-bands');
  const ed = row('jupiter-eddies');
  const ov = row('jupiter-ovals');
  const cy = row('jupiter-polar-cyclones');
  const dp = row('jupiter-depth');
  check(ed && ov && cy && dp, 'four rows: the eddies, the ovals, the polar cyclones, the depth');
  check(ed.class === 'illustrative' && dp.class === 'illustrative' && ov.class === 'modelled' && cy.class === 'modelled', 'what is generated is illustrative; what is computed from published numbers is modelled');
  for (const r of [ed, ov, cy, dp]) check(r.off_at.includes('tier0') && r.off_at.includes('save_data'), `${r.id}: off at tier 0 and on save-data`);

  // The shear lines: where the profile is steepest, turning the way the measured winds shear the air.
  const lines = F.shearLines(jup.profile, ed.eddies);
  check(lines.length === ed.eddies.lines && lines.length < F.EDDY_SLOTS, `${ed.eddies.lines} shear lines, and a slot left for the wake`);
  check(lines.every((l) => Math.abs(l.latDeg) <= ed.eddies.lat_max_deg && l.halfDeg > 0 && l.halfDeg <= ed.eddies.half_deg_max && Math.abs(l.turnsPerDay) <= ed.eddies.max_turns_per_day + 1e-12), 'each inside its latitude, its size and its rate');
  for (const l of lines) {
    const du = F.windAt(jup.profile, l.latDeg + 0.3) - F.windAt(jup.profile, l.latDeg - 0.3);
    check(Math.sign(l.turnsPerDay) === -Math.sign(du), `at ${l.latDeg.toFixed(1)} the eddies turn with the shear (wind rising northward turns them clockwise)`);
  }
  // The steepest stretch of Tollefson's profile is the flank of the 24 N jet: it is among them.
  check(lines.some((l) => Math.abs(l.latDeg - F.planetocentricDeg(22.5, jup.profile.flattening)) < 1.5 || Math.abs(l.latDeg - F.planetocentricDeg(25.5, jup.profile.flattening)) < 1.5), 'the 24 N jet\'s flanks are shear lines');
  const rows = lines.map((l) => F.eddyRow(l));
  check(rows.every((r) => Number.isInteger(r.e[3]) && r.e[3] >= 1), 'a whole number of eddies goes round the planet: the seam is no seam');
  check(rows.every((r) => r.win[2] / r.e[3] >= 2.4 * r.e[1] - 1e-12), 'and each has a cell to itself');

  // The wake: downstream of the spot in the jet on its equator side, which the winds say is west.
  const { WORLDS: W_ } = await import(join(JS, 'scene/worlds.js'));
  const hubbleSpot = W_.find((x) => x.id === 'jupiter').look.faceSpot.hubble;
  for (const [name, spot] of [['the first map', jup.spot], ['Hubble\'s map', hubbleSpot]]) {
    const wake = F.wakeLine(spot, jup.profile, ed.eddies.wake);
    check(wake && wake.dir === -1 && wake.windMs < -30, `${name}: the jet beside the spot blows west (${wake && wake.windMs.toFixed(0)} m/s), so the wake is west of it`);
    const dU = ((wake.win.u - spot.u + 1.5) % 1) - 0.5;
    check(dU < 0 && wake.line.latDeg > (spot.v - 0.5) * 180 && wake.line.turnsPerDay < 0, `${name}: west and toward the equator, north-west, its eddies cyclonic`);
    check(Math.abs(dU) - wake.win.half >= spot.half_u, `${name}: and it starts outside the spot`);
    rows.length = lines.length; rows.push(F.eddyRow(wake.line, wake.win));
  }

  // THE BOUND, FOR ALL TIME. However long the clock has run, no point of the map is read from
  // further away than one eddy's diameter, and nothing outside a shear line is moved at all.
  {
    let seed = 99;
    const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
    let worst = 0; let moved = 0; let outside = 0; let nan = 0;
    const cycle = F.splitFlow(F.rateTable(jup.profile), true).cycleDays;
    for (let i = 0; i < 60000; i++) {
      const u = rand(); const v = 0.1 + 0.8 * rand();
      // Any clock: from 1970 to the year 5000, and a tau far past the two-phase one for good measure.
      const tMs = rand() * 9.5e13;
      const ph = F.flowPhases(tMs, cycle);
      const tau = i % 7 === 0 ? (rand() - 0.5) * 1e6 : (i % 2 ? ph.tau1 : ph.tau2);
      const [pu, pv] = F.eddyDisplace(u, v, tau, rows, 1);
      if (!(Number.isFinite(pu) && Number.isFinite(pv))) { nan++; continue; }
      const line = rows.find((r) => Math.abs(v - r.e[0]) < r.e[1]);
      const d = Math.hypot((pu - u) * 2 * Math.cos((v - 0.5) * Math.PI), pv - v);
      if (d > 1e-12) { moved++; if (!line) outside++; }
      // In units of v: twice the largest eddy's radius, 0.9 of a line's half-height.
      const bound = 2 * 0.9 * Math.max(...rows.map((r) => r.e[1])) * 1.06;
      if (d > worst) worst = d;
      if (d > bound) outside++;
    }
    check(nan === 0 && outside === 0, `60 000 points at any clock: none read from further than an eddy's diameter, none moved outside a shear line (worst ${(worst * 180).toFixed(2)} degrees)`);
    check(moved > 500, `and inside the lines they do move (${moved})`);
    check(worst * 180 <= 2 * 0.9 * ed.eddies.half_deg_max * 1.06, 'the bound is the registry\'s largest eddy');
    // Nothing at time zero, nothing at strength zero, nothing with the rates taken away (reduced motion).
    let still = 0;
    const stopped = rows.map((r) => ({ e: [r.e[0], r.e[1], 0, r.e[3]], win: r.win }));
    for (let i = 0; i < 4000; i++) {
      const u = rand(); const v = 0.1 + 0.8 * rand(); const tau = (rand() - 0.5) * 6;
      for (const [pu, pv] of [F.eddyDisplace(u, v, 0, rows, 1), F.eddyDisplace(u, v, tau, rows, 0), F.eddyDisplace(u, v, tau, stopped, 1), F.eddyDisplace(u, v, tau, [], 1)]) {
        if (Math.abs(pu - u) > 1e-12 || Math.abs(pv - v) > 1e-12) still++;
      }
    }
    check(still === 0, 'no displacement at the instant a copy matches the map, at a small disc, with no rows, or where less motion is asked for');
    // Smooth across an eddy's edge: the turn is nothing there.
    const r0 = rows[0];
    const a = F.eddyDisplace(0.5 / r0.e[3], r0.e[0] + r0.e[1] * 0.999, 2, rows, 1);
    check(Math.abs(a[1] - (r0.e[0] + r0.e[1] * 0.999)) < 1e-3 * r0.e[1], 'and at a line\'s edge the map is where it was');
  }

  // The ovals: inside the map, in the southern belts where the pictures have them, anticyclones.
  for (const face of ['own', 'hubble']) {
    const tab = ov.ovals[face];
    check(tab.length >= 3 && tab.length <= F.OVAL_SLOTS, `${face}: Oval BA and the largest white ovals (${tab.length})`);
    for (const o of tab) {
      const lat = (o[1] - 0.5) * 180;
      check(o[0] - o[2] >= 0 && o[0] + o[2] <= 1 && o[1] - o[3] > 0 && o[1] + o[3] < 1, `${face}: the oval at u ${o[0]} is inside the map`);
      check(lat < -25 && lat > -45 && o[2] * 360 < 8 && o[3] * 180 < 5 && o[4] >= 1 && o[4] <= 6, `${face}: at ${lat.toFixed(1)} in the south temperate belts, a few degrees across, turning in days`);
    }
    // Oval BA is at 33 S planetographic; the chain of white ovals at 40 S.
    check(near(tab[0][1], 0.5 + F.planetocentricDeg(-33, jup.profile.flattening) / 180, 0.012) && tab[0][4] === 1.5, `${face}: the first is Oval BA, at 33 S, once round in 36 hours (9.9 degrees an hour)`);
  }
  check(ov.ovals.hubble.slice(1).every((o) => near((o[1] - 0.5) * 180, F.planetocentricDeg(-40, jup.profile.flattening), 1)), 'in Hubble\'s map the white ovals are on 40 S planetographic');
  // None sits on the Great Red Spot or on another.
  for (const [face, spot] of [['own', jup.spot], ['hubble', hubbleSpot]]) {
    const all = [[spot.u, spot.v, spot.half_u, spot.half_v], ...ov.ovals[face]];
    for (let i = 0; i < all.length; i++) for (let j = i + 1; j < all.length; j++) {
      const du = Math.abs(((all[i][0] - all[j][0] + 1.5) % 1) - 0.5);
      const dv = Math.abs(all[i][1] - all[j][1]);
      check(du > 1.8 * (all[i][2] + all[j][2]) * 0.5 || dv > 1.8 * (all[i][3] + all[j][3]) * 0.5, `${face}: ovals ${i} and ${j} do not share their air`);
    }
  }

  // The poles Juno saw: nine in the north, six in the south, at the cited latitudes.
  const c = cy.cyclones;
  const P = F.polarCyclones(c);
  check(P.north.length === 9 && P.south.length === 6 && F.CYCLONE_NORTH === 9 && F.CYCLONE_SOUTH === 6, `nine cyclones in the north and six in the south (${P.north.length}, ${P.south.length})`);
  check(P.north[0].central && near(P.north[0].latDeg, 90, 1e-9), 'the north\'s central cyclone is at the pole');
  const ring = P.north.slice(1);
  check(ring.filter((x) => near(x.latDeg, 83.4, 1e-6)).length === 4 && ring.filter((x) => near(x.latDeg, 82.7, 1e-6)).length === 4, 'eight round it, at 83.4 and 82.7 north in turn (Rogers et al. 2018)');
  check(ring.every((x, i) => near(((x.lonDeg - ring[(i + 7) % 8].lonDeg) + 360) % 360, 45, 1e-6)), 'an octagon: 45 degrees apart');
  const sc = P.south[0];
  check(sc.central && near(sc.latDeg, -(90 - c.south.centre_offset_deg), 1e-6) && c.south.centre_offset_deg >= 1 && c.south.centre_offset_deg <= 2.5, `the south's central cyclone is ${c.south.centre_offset_deg} degrees off the pole (1.0 to 2.5 measured)`);
  const ang = (a, b) => Math.acos(Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))) / DEG;
  const pent = P.south.slice(1);
  check(pent.every((x) => near(ang(x.dir, sc.dir), c.south.ring_from_centre_deg, 1e-6)), 'five round it, each 6 degrees from it');
  check(pent.every((x, i) => near(ang(x.dir, pent[(i + 1) % 5].dir), ang(pent[0].dir, pent[1].dir), 1e-6)) && pent.every((x) => x.latDeg < -80 && x.latDeg > -87), 'a pentagon, all of it between 80 and 87 south');
  for (const x of [...P.north, ...P.south]) {
    check(near(Math.hypot(...x.dir), 1, 1e-9), 'each place is a unit vector');
    // 4 000 to 7 000 km across (one degree at the pole is 1 167 km on Jupiter's polar radius of 66 854 km).
    const km = 2 * x.radiusDeg * (Math.PI / 180) * 66854;
    check(km >= 4000 && km <= 8200, `a cyclone is ${km.toFixed(0)} km across`);
  }
  // None overlaps its neighbour's core, and the cap covers them all.
  const capColat = 90 - c.cap_lat_deg;
  for (const set of [P.north, P.south]) {
    for (let i = 0; i < set.length; i++) {
      check(90 - Math.abs(set[i].latDeg) + set[i].radiusDeg * 1.5 <= capColat + 0.01, 'every cyclone is inside the cap');
      for (let j = i + 1; j < set.length; j++) check(ang(set[i].dir, set[j].dir) >= 0.8 * (set[i].radiusDeg + set[j].radiusDeg), `cyclones ${i} and ${j} are apart`);
    }
  }
  check(/2017/.test(c.state) && c.period_days >= 0.8 && c.period_days <= 2.5, 'the state drawn is dated (before the sixth southern cyclone of 2019), and they turn in a day or two (0.1 to 0.3 degrees a minute)');

  // At what disc size each starts.
  check(F.nearShare(0.05, 0.2) === 0 && F.nearShare(0.2, 0.2) === 0 && near(F.nearShare(0.3, 0.2), 1, 1e-9) && near(F.nearShare(0.25, 0.2), 0.5, 1e-9) && F.nearShare(9, 0.2) === 1, 'nothing under its size, all of it at one and a half times that');
  check([ed.eddies, ov.ovals, cy.cyclones].every((x) => x.from_share >= 0.1 && x.from_share < 0.4) && dp.depth.from_share >= 0.4, 'the eddies, ovals and poles start in the orbit view (level B); the depth in the close-up (level C)');

  // The shader's text: one more fetch, no refused class.
  const WW = await import(join(JS, 'scene/weather/worldweather.js'));
  const { WORLDS, worldMaterial, applyLook, WORLD_FRAG } = await import(join(JS, 'scene/worlds.js'));
  const frag = WW.weatherFragment();
  const storms = frag.slice(frag.indexOf('#ifdef WX_STORMS'), frag.indexOf('#endif', frag.indexOf('vec3 wxDeep')));
  check(storms.length > 2000, 'the storms are one block of the weather\'s own source');
  const fetches = (text) => (text.match(/\b(texture2D|textureGrad|textureLod|texture)\s*\(/g) || []).length;
  check(fetches(storms) === 1 && /textureGrad\( uMap,/.test(storms), `the storms read the map once more, for the under-deck (${fetches(storms)})`);
  const zonal = frag.slice(frag.indexOf('#ifdef WX_ZONAL'), frag.indexOf('#elif defined( WX_MARS )'));
  check(fetches(zonal) === 2, `and the flow still reads it once per copy: two fetches before, three at most now (${fetches(zonal)} in the source, the under-deck's among them)`);
  for (const refused of ['EffectComposer', 'RenderPass', 'WebGLRenderTarget', 'ShaderPass', 'BloomPass', 'gl_FragData', 'tDiffuse', 'uPrevFrame', 'sampler3D']) {
    check(!frag.includes(refused), `the shader has no ${refused}`);
  }
  for (const f of ['scene/weather/worldweather.js', 'scene/weather/flow.js']) {
    const src = readFileSync(join(JS, f), 'utf8');
    check(!/WebGLRenderTarget|EffectComposer|readPixels|getImageData|new Worker/.test(src), `${f}: no render target, no pass, no pixels read back`);
  }
  check((frag.match(/#ifdef WX_STORMS/g) || []).length === 4 && (frag.match(/for \( int i = 0;/g) || []).length >= 3, 'every storm term is behind WX_STORMS, which only Jupiter defines');

  // The controller: off until the disc is large, the face, reduced motion, the latch.
  const dress = () => {
    const m = new Map();
    for (const w of WORLDS) { if (w.look.earth || w.look.emissive) continue; const material = worldMaterial(null, w.look.tint); applyLook(material, w.look); m.set(w.id, { material, visible: true }); }
    return m;
  };
  let share = 0.01;
  const meshes = dress();
  const wx = WW.createWorldWeather({ worlds: { meshFor: (id) => meshes.get(id) || null, discShare: () => share } });
  const ju = meshes.get('jupiter').material;
  check(ju.defines.WX_STORMS === 1 && !meshes.get('saturn').material.defines.WX_STORMS && !meshes.get('venus').material.defines.WX_STORMS, 'only Jupiter wears the storms');
  const u = ju.uniforms;
  check(u.uWxEddy.value.length === F.EDDY_SLOTS * 4 && u.uWxEddyWin.value.length === F.EDDY_SLOTS * 3 && u.uWxOval.value.length === F.OVAL_SLOTS * 4 && u.uWxCyc.value.length === F.CYCLONE_SLOTS * 4, 'the tables are the sizes the shader declares');
  const t0 = Date.parse('2026-10-12T12:00:00Z');
  wx.update(t0, 0);
  const nearOf = () => ({ ...u.uWxNear.value });
  check(Object.values(nearOf()).every((x) => x === 0), 'seen small (level A), nothing of it is drawn: every term is skipped');
  share = 0.5;
  wx.update(t0, 16);
  check(Object.values(nearOf()).every((x) => x > 0 && x < 0.05), 'the disc grown: it starts to come in, not all at once');
  wx.update(t0, 600);
  check(nearOf().x > 0.4 && nearOf().x < 0.8, `half way in after half a second (${nearOf().x.toFixed(2)})`);
  wx.update(t0, 1700);
  check(nearOf().x === 1 && nearOf().y === 1 && nearOf().z === 1 && nearOf().w > 0.4, 'all in after a second; the depth only as far as its own, larger, size');
  share = 0.25;
  wx.update(t0, 5000);
  check(near(nearOf().x, 0.5, 1e-9) && nearOf().y === 1 && nearOf().z === 1 && nearOf().w === 0, `drawn back (level B): the poles and ovals stay, the eddies are half out, the depth is off (${JSON.stringify(nearOf())})`);
  check(near(u.uWxPole.value.x, 15 * DEG, 1e-9) && near(u.uWxPole.value.y, F.wavePhase(t0, cy.cyclones.period_days, 1), 1e-9) && u.uWxPole.value.y >= 0 && u.uWxPole.value.y < 1, 'the cap begins at 75 degrees and the cyclones\' turn is the clock\'s, wrapped: a small number');
  check(near(u.uWxOvalRate.value[0], 1 / 1.5, 1e-6) && near(u.uWxOval.value[0], ov.ovals.own[0][0], 1e-6) && near(u.uWxDeep.value.x, dp.depth.gap_lum.own[0], 1e-9), 'the first map\'s ovals and gaps');
  check(u.uWxEddy.value[7 * 4 + 1] > 0 && u.uWxEddyWin.value[7 * 3 + 1] < 0.5 && u.uWxEddy.value.slice(0, 28).every(Number.isFinite), 'seven lines all round the planet and the wake in its window');
  check(wx.storms('jupiter') === 'moving' && wx.storms('saturn') === null && wx.state().worlds.find((w) => w.id === 'jupiter').storms.face === 'own', 'and the state says so');
  // "As Hubble saw it": scene/worlds.js moves the spot; the ovals, the gaps and the wake follow.
  Object.assign(u.uWxSpot.value, { x: hubbleSpot.u, y: hubbleSpot.v, z: hubbleSpot.half_u, w: hubbleSpot.half_v });
  wx.update(t0, 5016);
  check(near(u.uWxOval.value[0], ov.ovals.hubble[0][0], 1e-6) && near(u.uWxDeep.value.x, dp.depth.gap_lum.hubble[0], 1e-9) && wx.state().worlds.find((w) => w.id === 'jupiter').storms.face === 'hubble', 'Hubble\'s face: its own ovals and gaps');
  const wakeU = u.uWxEddyWin.value[7 * 3];
  check(wakeU < hubbleSpot.u && wakeU > hubbleSpot.u - 0.2, 'and the wake is west of the spot where Hubble has it');
  wx.latch();
  check(!ju.defines.WX_STORMS && ju.fragmentShader === WORLD_FRAG && wx.storms('jupiter') === null, 'the latch takes the storms off with the rest');

  // Reduced motion: still. Nothing turns; the cap is drawn where it stands.
  const stillMeshes = dress();
  const calm = WW.createWorldWeather({ worlds: { meshFor: (id) => stillMeshes.get(id) || null, discShare: () => 0.6 }, reducedMotion: true });
  const su = stillMeshes.get('jupiter').material.uniforms;
  calm.update(t0, 0);
  calm.update(t0 + 86400000, 16);
  check(su.uWxOvalRate.value.every((x) => x === 0) && [0, 1, 2, 3, 4, 5, 6, 7].every((i) => su.uWxEddy.value[i * 4 + 2] === 0), 'where less motion is asked for no eddy and no oval turns');
  check(su.uWxPole.value.y === 0 && su.uWxNear.value.z === 1 && calm.storms('jupiter') === 'still', 'and the cyclones stand still, drawn');

  // The card: what is generated is said to be, the poles are a reconstruction, and nothing is today's.
  check(/generated/.test(COPY.weatherStorms.turning.jupiter) && /measured/.test(COPY.weatherStorms.turning.jupiter) && /illustrative/.test(COPY.weatherStorms.turning.jupiter), 'the card says the eddies are generated at measured places');
  check(/modelled from Juno’s observations/.test(COPY.weatherStorms.poles.jupiter) && /not a photograph/.test(COPY.weatherStorms.poles.jupiter) && /2017/.test(COPY.weatherStorms.poles.jupiter), 'and that the poles are modelled from Juno\'s observations, dated, not a photograph');
}

if (failed) {
  console.log(`weather FAILED: ${failed} check(s)`);
  process.exit(1);
}
console.log('weather ok: winds to angles, the two-phase clock, Mars\'s season and its dust, NOAA\'s lightning map decoded and scheduled, the shader patch, the giants\' flashes, Venus\'s Y, Titan\'s clouds, Jupiter\'s storms (eddies bounded for all time, the ovals, Juno\'s cyclones, the depth), the card\'s lines, off the first visit');
