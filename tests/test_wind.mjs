// tests/test_wind.mjs -- the wind over the Earth (internal #362): NOAA's GFS through PacIOOS ERDDAP.
//   node tests/test_wind.mjs
//
// No network. tests/fixtures/wind/head.json is the head of what the server answered on
// 2026-10-07 (its column names and first four rows, verbatim); the whole grid is built here in
// that shape.
//   1. the request: one URL, both components, every fifth degree, the forecast hour before now;
//   2. the grid: read as asked for or refused (a short answer, a fill value, a hole);
//   3. the arithmetic: bilinear, wrapped in longitude, and a step that moves air the right way;
//   4. the drawing: streaks in the Earth's own frame, on the legend's ramp, moving, or standing
//      still under reduced motion; its state is what the legend prints;
//   5. nothing at boot, and what was tested is written down.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const W = await import(join(JS, 'data/wind.js'));
const S = await import(join(JS, 'scene/wind.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const L = await import(join(JS, 'ui/overlaylegend.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');

// ---- 1. the request ---------------------------------------------------------------------------------
const NOW = Date.parse('2026-10-07T13:47:00Z');
check(W.windHour(NOW) === '2026-10-07T12:00:00Z' && W.windHour(Date.parse('2026-10-07T23:59:59Z')) === '2026-10-07T21:00:00Z', 'the forecast hour at or before now, on the model\'s three-hour step');
const url = W.windUrl(NOW);
check(url === 'https://pae-paha.pacioos.hawaii.edu/erddap/griddap/ncep_global.json?ugrd10m%5B(2026-10-07T12:00:00Z)%5D%5B(-90):10:(90)%5D%5B(0):10:(355)%5D,vgrd10m%5B(2026-10-07T12:00:00Z)%5D%5B(-90):10:(90)%5D%5B(0):10:(355)%5D', `one request for both components (${url})`);

// ---- 2. the grid ------------------------------------------------------------------------------------
const head = JSON.parse(src('tests/fixtures/wind/head.json'));
check(head.table.columnNames.join() === 'time,latitude,longitude,ugrd10m,vgrd10m' && head.table.rows.length === 4 && typeof head.table.rows[0][3] === 'number', 'the fixture is the server\'s own header and rows');
function table(fn) {
  const rows = [];
  // The server's order: north to south, longitude 0 eastward.
  for (let lat = 90; lat >= -90; lat -= 5) for (let lon = 0; lon < 360; lon += 5) { const [u, v] = fn(lat, lon); rows.push(['2026-10-07T12:00:00Z', lat, lon, u, v]); }
  return { table: { columnNames: head.table.columnNames, rows } };
}
// A westerly that grows with latitude, and a northward wind over the western hemisphere only.
const doc = table((lat, lon) => [Math.abs(lat) / 9, lon >= 180 ? 3 : 0]);
const grid = W.parseWind(JSON.stringify(doc));
check(grid && grid.nLat === 37 && grid.nLon === 72 && grid.timeMs === Date.parse('2026-10-07T12:00:00Z') && near(grid.maxSpeed, Math.hypot(10, 3), 1e-4), `37 by 72 points, with the forecast hour and the fastest wind (${grid && grid.maxSpeed})`);
check(grid && near(grid.u[0], 10, 1e-6) && near(grid.u[18 * 72], 0, 1e-6) && grid.v[18 * 72 + 36] === 3 && grid.v[18 * 72 + 35] === 0, 'row 0 is the south pole and column 0 is longitude 0, whatever order the server sent');
check(W.parseWind(head) === null && W.parseWind('nope') === null && W.parseWind({ table: { columnNames: ['time'], rows: [] } }) === null, 'a short answer, a broken one and the wrong columns are refused');
{
  const bad = table((lat, lon) => [1, 1]);
  bad.table.rows[100][3] = -9.99e8;
  const hole = table((lat, lon) => [1, 1]);
  hole.table.rows[7] = hole.table.rows[8].slice();
  const nul = table((lat, lon) => [1, 1]);
  nul.table.rows[5][4] = null;
  check(W.parseWind(bad) === null && W.parseWind(hole) === null && W.parseWind(nul) === null, 'the fill value, a hole and a null are refused: a broken field is not drawn as the world');
}

// ---- 3. the arithmetic ------------------------------------------------------------------------------
check(near(W.sampleWind(grid, 45, 10).u, 5, 1e-5) && near(W.sampleWind(grid, 47.5, 12.5).u, 47.5 / 9, 1e-5), 'at a grid point its value; between four, their bilinear mean');
check(near(W.sampleWind(grid, 0, 177.5).v, 1.5, 1e-5) && near(W.sampleWind(grid, 0, 357.5).v, 1.5, 1e-5) && near(W.sampleWind(grid, 0, -2.5).v, 1.5, 1e-5), 'longitude wraps: 357.5 E is between the last column and the first');
check(Number.isFinite(W.sampleWind(grid, 90, 0).u) && Number.isFinite(W.sampleWind(grid, -90, 359.9).u) && Number.isFinite(W.sampleWind(grid, 95, 0).u), 'the poles are held, not read past the grid');
{
  // 10 m/s eastward at the equator of a uniform field: an hour is 36 km, 0.3238 degrees.
  const flat = W.parseWind(table(() => [10, 0]));
  const a = W.stepWind(flat, 0, 0, 3600);
  check(near(a.lonDeg, 0.32375, 2e-4) && near(a.latDeg, 0, 1e-9), `ten metres a second eastward for an hour is 0.324 degrees at the equator (${a.lonDeg})`);
  const b = W.stepWind(flat, 60, 0, 3600);
  check(near(b.lonDeg, 0.6475, 4e-4), `and twice that in longitude at 60 N (${b.lonDeg})`);
  const c = W.stepWind(W.parseWind(table(() => [0, -10])), 0, 179.9, 3600);
  check(near(c.latDeg, -0.32375, 2e-4) && near(c.lonDeg, 179.9, 1e-6), 'a north wind (v below zero) carries air south');
  const d = W.stepWind(flat, 0, 179.9, 3600);
  check(d.lonDeg < -179 && d.lonDeg > -180, 'across the date line the longitude comes back on the other side');
  check(W.stepWind(W.parseWind(table(() => [0, 50])), 89.4, 0, 1e6).latDeg === 89.5, 'and the pole is not flown through');
}

// ---- 4. the drawing ---------------------------------------------------------------------------------
{
  const p = new Float32Array(3);
  const at = (lat, lon) => Array.from(S.localOf(lat, lon, p)).map((x) => Math.round(x * 1e6) / 1e6 + 0);
  // scene/earth.js: +X at longitude 0, +Y the north pole, -Z at 90 E.
  check(at(0, 0).join() === '1,0,0' && at(90, 0).join() === '0,1,0' && at(0, 90).join() === '0,0,-1' && at(0, -90).join() === '0,0,1', `a place in the Earth mesh's own frame (${at(0, 90)})`);
  check(/-cl \* Math\.sin\(lonRad\)/.test(src('site/js/scene/earth.js')), 'which is the frame scene/earth.js lays its map in');
  const hex = (c) => '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  check(hex(S.rampAt(0)) === S.WIND_LEGEND.stops[0].toUpperCase() && hex(S.rampAt(25)) === S.WIND_LEGEND.stops[3].toUpperCase() && hex(S.rampAt(99)) === S.WIND_LEGEND.stops[3].toUpperCase(), 'a streak\'s colour is its speed on the legend\'s own ramp');
  check(S.WIND_LEGEND.high === '25' && S.WIND_LEGEND.unit === 'm/s' && S.SPEEDUP === 86400, 'the legend runs to 25 m/s, and a second on screen is a day of wind');

  const earth = new THREE.Object3D();
  let n = 0;
  let asked = null;
  const seeded = () => { n += 1; const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  const body = JSON.stringify(doc);
  const told = [];
  const make = (extra = {}) => S.createWind({ earth: () => earth, now: () => NOW, random: seeded, onChange: () => told.push(1), fetch: async (u, init) => { asked = { u, init }; return { ok: true, status: 200, text: async () => body }; }, ...extra });
  const wind = make();
  check(wind.state().id === null && wind.state().status === 'off' && earth.children.length === 0, 'nothing is drawn or asked for until it is set');
  wind.set(true);
  check(wind.state().status === 'loading' && wind.state().id === 'wind', 'asked for: loading');
  await new Promise((r) => setTimeout(r, 20));
  const st = wind.state();
  check(st.status === 'shown' && st.kind === 'wind' && st.cls === 'modelled' && st.date === grid.timeMs && st.legend === S.WIND_LEGEND && near(st.maxSpeed, grid.maxSpeed, 1e-4) && st.speedup === 86400 && st.still === false, `shown, with the forecast hour and what the legend needs (${JSON.stringify({ ...st, legend: undefined })})`);
  check(asked && asked.u === url && asked.init.credentials === 'omit' && asked.init.referrerPolicy === 'no-referrer', 'one request, with no credentials and no referrer');
  const lines = wind.lines();
  const pos = lines.geometry.attributes.position;
  check(earth.children[0] === lines && lines.isLineSegments && pos.count === S.COUNT * S.TRAIL * 2 && lines.geometry.attributes.color.itemSize === 4, `${S.COUNT} streaks of ${S.TRAIL} pieces, children of the Earth's mesh so they turn with it`);
  let onSphere = true;
  for (let i = 0; i < pos.count; i += 97) onSphere = onSphere && near(Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)), 1, 1e-4);
  check(onSphere && lines.scale.x === S.SHELL_SCALE && S.SHELL_SCALE > 1.003, 'every vertex on the unit sphere of the mesh, and the mesh lifted clear of the ground and the data overlays');
  {
    // A streak has length: at a day a second the mean tail is degrees long, not a dot (seen 2026-10-07).
    let long = 0;
    for (let i = 0; i < S.COUNT; i += 1) { const a = i * S.TRAIL * 6; const b = a + (S.TRAIL - 1) * 6 + 3; const d = Math.hypot(pos.array[a] - pos.array[b], pos.array[a + 1] - pos.array[b + 1], pos.array[a + 2] - pos.array[b + 2]); if (d > 0.02) long += 1; }
    check(long > S.COUNT / 2, `most streaks are more than a degree long when they are first drawn (${long} of ${S.COUNT})`);
  }
  const before = Array.from(pos.array.slice(0, 600));
  await new Promise((r) => setTimeout(r, 60));
  wind.update();
  await new Promise((r) => setTimeout(r, 60));
  wind.update();
  const moved = before.filter((x, i) => Math.abs(x - pos.array[i]) > 1e-7).length;
  check(moved > 100 && lines.visible && lines.material.opacity > 0 && lines.material.transparent && lines.material.depthWrite === false, `the streaks move with the wind and fade in (${moved} of 600 numbers changed)`);
  const line = L.overlayLine(wind.state());
  check(/^The wind ten metres above the ground; colour is its speed\. The forecast is for 7 October 2026, 12:00 UTC\. About \d+ m\/s on average, up to 10\. The streaks move a day of wind in a second\. Data: NOAA\/NCEP Global Forecast System, through PacIOOS ERDDAP \(University of Hawaii\)\. A weather model, not a measurement\.$/.test(line), `the legend's sentence: ${line}`);
  check(L.overlayLine({ id: 'wind', kind: 'wind', status: 'loading' }) === COPY.overlay.wind.loading && L.overlayLine({ id: 'wind', kind: 'wind', status: 'failed' }) === COPY.overlay.wind.failed, 'loading and failed have their own words');
  wind.set(false);
  check(wind.state().id === null && wind.state().status === 'off', 'taken away again');
  wind.dispose();
  check(earth.children.length === 0, 'and disposed, it leaves the Earth as it found it');

  // Reduced motion: drawn once, and no frame moves it.
  const calm = make({ reducedMotion: true });
  calm.set(true);
  await new Promise((r) => setTimeout(r, 20));
  const cp = Array.from(calm.lines().geometry.attributes.position.array.slice(0, 600));
  await new Promise((r) => setTimeout(r, 40));
  calm.update();
  check(calm.state().still === true && cp.every((x, i) => x === calm.lines().geometry.attributes.position.array[i]), 'with reduced motion the streaks stand still');
  check(cp.some((x, i) => i >= 3 && i < 6 && Math.abs(x - cp[i - 3]) > 1e-6), 'and are still streaks: each has length');
  check(/still/.test(L.overlayLine(calm.state())) && !/in a second/.test(L.overlayLine(calm.state())), 'and the sentence says so');
  calm.dispose();

  // A server that fails: said, and nothing drawn.
  let tries = 0;
  const broken = S.createWind({ earth: () => earth, now: () => NOW, retryMs: 5, fetch: async () => { tries += 1; return { ok: false, status: 503, text: async () => '' }; } });
  const warn = console.warn; console.warn = () => {};
  broken.set(true);
  await new Promise((r) => setTimeout(r, 60));
  console.warn = warn;
  check(tries === 2, `a server that fails is asked once more, and no more (${tries})`);
  {
    // A slow day at the server (seen 2026-10-07: a 404, then an answer): the second try draws.
    let n = 0;
    const flaky = S.createWind({ earth: () => earth, now: () => NOW, retryMs: 5, fetch: async () => { n += 1; return n === 1 ? { ok: false, status: 404, text: async () => '' } : { ok: true, status: 200, text: async () => body }; } });
    flaky.set(true);
    await new Promise((r) => setTimeout(r, 60));
    check(flaky.state().status === 'shown' && n === 2, 'a 404 and then an answer is the wind, shown');
    flaky.dispose();
    let m = 0;
    let threw = null;
    try { await W.fetchWind({ retryMs: 5, fetch: async () => { m += 1; return { ok: true, status: 200, text: async () => JSON.stringify(head) }; } }); } catch (e) { threw = e; }
    check(threw && m === 1, 'a grid that came and was not the one asked for is not asked for again');
  }
  check(broken.state().status === 'failed' && L.overlayLine({ ...broken.state() }) === COPY.overlay.wind.failed, 'a server that fails is said, in the legend\'s line');
  broken.dispose();
}

// ---- 5. nothing at boot, and the evidence ---------------------------------------------------------------
{
  const main = src('site/js/main.js');
  check(!/^import .*scene\/wind\.js/m.test(main) && /import\('\.\/scene\/wind\.js'\)/.test(main) && /ctx\.wind\.update\(\)/.test(main), 'main.js imports the wind when it is chosen, and steps it each frame');
  check(/id === WIND_OVERLAY/.test(main) && /ctx\.wind\.set\(false\)/.test(main), 'one overlay at a time: a map takes the wind away and the wind a map');
  const panel = src('site/js/ui/overlaypanel.js');
  check(/WIND_OPTION = 'wind'/.test(panel) && /C\.wind\.title/.test(panel) && S.WIND_ID === 'wind', 'the panel offers it under Earth data');
  const data = src('site/js/data/wind.js');
  check(/HOW DEPENDABLE IT IS/.test(data) && /harvester/.test(data), 'and how dependable the server was that day, and what would make it so');
  check(/Access-Control-Allow-Origin:\s*\n?\/\/\s*\*|Access-Control-Allow-Origin: \*/.test(data.replace(/\n\/\/\s+/g, ' ')) && /TESTED ON 2026-10-07/.test(data) && /NOMADS/.test(data) && /CoastWatch/.test(data) && /Open-Meteo/.test(data) && /may be used and redistributed for free/.test(data), 'data/wind.js says what was tested, what was kept, what was not and the terms');
  const credits = src('CREDITS.md');
  check(/pae-paha\.pacioos\.hawaii\.edu/.test(credits) && /Global Forecast System/.test(credits), 'CREDITS.md names the model and the server');
}

if (problems.length) { console.error('wind FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`wind ok: one request for 37 x 72 points, refused unless whole; 10 m/s for an hour is 0.324 degrees; ${S.COUNT} streaks on the Earth's frame, still under reduced motion; nothing at boot`);
