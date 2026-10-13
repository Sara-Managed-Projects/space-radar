// tests/test_currents.mjs -- the sea's currents over the Earth, coloured by its temperature.
//   node tests/test_currents.mjs
//
// No network. tests/fixtures/harvest/sea_grid.json is what NOAA CoastWatch answered on 2026-10-12
// for the 56 points round Florida; the whole globe is built here in the harvester's packed shape.
//   1. the grid: the packed copy read as asked for, or refused (a piece, a wrong step, a broken row);
//   2. the arithmetic: bilinear over the corners that are sea, null on land, a step that moves water
//      the right way and stops at a shore, even a thin one a fast current could have leapt;
//   3. the drawing: streaks on the Earth's frame, on the legend's ramp, never over land, moving, or
//      standing still under reduced motion; its state is what the legend prints;
//   4. only our saved copies, offered only when both exist, nothing at boot, and the evidence.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');
const D = await import(join(JS, 'data/currents.js'));
const S = await import(join(JS, 'scene/currents.js'));
const THREE = await import(join(ROOT, 'site/vendor/three.module.min.js'));
const L = await import(join(JS, 'ui/overlaylegend.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const near = (a, b, eps) => Math.abs(a - b) <= eps;
const src = (rel) => readFileSync(join(ROOT, rel), 'utf8');
// Not a fixed wait: two grids of 64 800 cells are parsed, and a loaded machine takes its time.
const settled = async (o) => { for (let i = 0; i < 3000 && o.state().status === 'loading'; i += 1) await new Promise((r) => setTimeout(r, 10)); };

// ---- 1. the grid ------------------------------------------------------------------------------------
// The packed shape harvest/parsers/sea_grid.py writes: a string a latitude, nothing where there is no sea.
function packed(names, scale, lon0, fn, time = '2026-10-10T00:00:00Z') {
  const fields = {};
  for (const [n, name] of names.entries()) {
    const rows = [];
    for (let j = 0; j < 180; j += 1) {
      const cells = [];
      for (let i = 0; i < 360; i += 1) {
        const lon = lon0 + i;
        const v = fn(-89.875 + j, lon > 180 ? lon - 360 : lon);
        cells.push(v === null ? '' : String(Math.round(v[n] * scale)));
      }
      rows.push(cells.join(','));
    }
    fields[name] = { scale, rows };
  }
  return { grid: 'sea-grid/1', time, lat0: -89.875, lon0, stepDeg: 1, nLat: 180, nLon: 360, fields };
}
// A world with one continent (20 S to 20 N, 30 E to 60 E) and a wall of land one cell thick at 100 E.
// The water runs east at 1 m/s south of the equator and at 0.2 m/s north of it, and north at 0.5 m/s
// in the western hemisphere only.
const land = (lat, lon) => (lat > -20 && lat < 20 && lon > 30 && lon < 60) || (lon > 100 && lon < 101);
const flowDoc = packed(['u_current', 'v_current'], 100, -179.875, (lat, lon) => (land(lat, lon) ? null : [lat < 0 ? 1 : 0.2, lon < 0 ? 0.5 : 0]));
// The sea warms from -2 C at the poles to 30 C at the equator; its own grid starts at 0.125 E, as OISST's does.
const tempOf = (lat) => 30 - 32 * Math.abs(lat) / 90;
const tempDoc = packed(['sst'], 10, 0.125, (lat, lon) => (land(lat, lon) ? null : [tempOf(lat)]), '2026-10-10T12:00:00Z');
const flow = D.parseFlow(JSON.stringify(flowDoc));
const temp = D.parseTemp(tempDoc);
check(flow && flow.nLat === 180 && flow.nLon === 360 && flow.timeMs === Date.parse('2026-10-10T00:00:00Z') && flow.lon0 === -179.875 && flow.cells > 60000, `180 by 360 points with the day they are of (${flow && flow.cells} sea cells)`);
check(flow && near(flow.u_current[0], 1, 1e-6) && Number.isNaN(flow.u_current[90 * 360 + 180 + 40]) && near(flow.v_current[90 * 360 + 10], 0.5, 1e-6), 'row 0 is the southernmost and column 0 the westernmost; nothing in the copy is NaN here, never zero');
check(flow && flow.meanSpeed > 0.3 && flow.meanSpeed < 1.2, `the mean speed is over the sea only (${flow && flow.meanSpeed})`);
check(temp && temp.lon0 === 0.125 && temp.timeMs === Date.parse('2026-10-10T12:00:00Z'), 'the temperature keeps its own first longitude and its own day');
{
  const clone = (d) => JSON.parse(JSON.stringify(d));
  const piece = clone(flowDoc); piece.nLat = 90; piece.fields.u_current.rows.length = 90;
  const coarse = clone(flowDoc); coarse.stepDeg = 2;
  const shortRow = clone(flowDoc); shortRow.fields.v_current.rows[7] = '1,2,3';
  const word = clone(flowDoc); word.fields.u_current.rows[3] = word.fields.u_current.rows[3].replace(/^[^,]*/, 'x');
  const oneField = clone(flowDoc); delete oneField.fields.v_current;
  const empty = packed(['u_current', 'v_current'], 100, -179.875, (lat) => (lat > 80 ? [1, 0] : null));
  const erddap = JSON.parse(src('tests/fixtures/harvest/sea_grid.json'));
  check(erddap.table.columnNames.join() === 'time,latitude,longitude,u_current,v_current' && erddap.table.rows.length === 56, 'the fixture is the server\'s own table');
  check([piece, coarse, shortRow, word, oneField, empty, erddap, 'nope', null, { grid: 'sea-grid/2' }].every((d) => D.parseFlow(d) === null), 'a piece of the globe, another step, a short row, a word, one component, a blank day and the unpacked table are all refused');
  check(D.parseTemp(flowDoc) === null, 'and the currents are not read as a temperature');
}

// ---- 2. the arithmetic ------------------------------------------------------------------------------
check(near(D.sampleCurrent(flow, -40.375, 10.125).u, 1, 1e-6) && near(D.sampleCurrent(flow, -0.375, 10).u, 0.6, 1e-4), 'at a grid point its value; halfway between two rows their mean');
check(near(D.sampleCurrent(flow, 30, -0.375).v, 0.25, 0.01) && near(D.sampleCurrent(flow, 30, 179.9).v, 0.25, 0.26) && Number.isFinite(D.sampleCurrent(flow, 30, 180).v) && Number.isFinite(D.sampleCurrent(flow, 30, -180).v), 'longitude wraps: the last column and the first are neighbours');
check(D.sampleCurrent(flow, 0, 45) === null && D.sampleCurrent(flow, 10, 100.5) === null, 'on land there is no current: null, not zero');
check(near(D.sampleCurrent(flow, -0.375, 29.5).u, 0.6, 1e-4) && D.sampleCurrent(flow, -0.375, 29.7) === null, 'beside a coast the water keeps its own speed: the land\'s corners are left out of the mean, not counted as still water, up to the cell that is land');
check(Number.isFinite(D.sampleCurrent(flow, -89.99, 0).u) && Number.isFinite(D.sampleCurrent(flow, 95, 0).u), 'the poles are held, not read past the grid');
check(near(D.sampleTemp(temp, 0.125, 0.125), tempOf(0.125), 0.06) && near(D.sampleTemp(temp, 45.125, -120.875), tempOf(45.125), 0.06) && near(D.sampleTemp(temp, 45.125, 359.625), tempOf(45.125), 0.06), 'the temperature is read on its own grid, which starts at another longitude');
check(Number.isNaN(D.sampleTemp(temp, 0, 45)), 'and is NaN where none of the four points round a place has one');
{
  // 1 m/s eastward for a day is 86.4 km: 0.777 degrees on the equator, more in longitude further south.
  const a = D.stepCurrent(flow, -40.375, 10, 86400);
  check(a && near(a.latDeg, -40.375, 1e-6) && near(a.lonDeg - 10, 0.777 / Math.cos(40.375 * Math.PI / 180), 2e-3), `a metre a second eastward for a day is 0.777 degrees of arc (${a && a.lonDeg})`);
  const b = D.stepCurrent(flow, 40, -60, 86400);
  check(b && near(b.latDeg - 40, 0.777 * 0.5, 2e-3) && b.lonDeg > -60, 'northward by v, eastward by u');
  const c = D.stepCurrent(flow, -40, 179.9, 86400);
  check(c && c.lonDeg < -179 && c.lonDeg > -180, 'across the date line the longitude comes back on the other side');
  check(D.stepCurrent(flow, 0, 45, 60) === null, 'a step that starts on land is none');
  check(D.stepCurrent(flow, -10, 28, 10 * 86400) === null, 'water that would run into the continent stops: no step ends on land');
  // 1 m/s for 40 days is 31 degrees: from 85 E it would end at 116 E, in open water past the wall at 100 E.
  check(D.sampleCurrent(flow, -40, 116) !== null && D.stepCurrent(flow, -40, 85, 40 * 86400) === null, 'and a long step cannot leap a wall of land one cell thick');
  check(D.stepCurrent(flow, -40, 62, 10 * 86400) !== null, 'while the same step over open water is taken');
}

// ---- 3. the drawing ---------------------------------------------------------------------------------
{
  const hex = (c) => '#' + c.map((x) => Math.round(x * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  const stops = S.CURRENTS_LEGEND.stops;
  check(hex(S.rampAt(-2)) === stops[0] && hex(S.rampAt(-9)) === stops[0] && hex(S.rampAt(30)) === stops[6] && hex(S.rampAt(40)) === stops[6] && hex(S.rampAt(14)) === stops[3], 'a streak\'s colour is the water\'s temperature on the legend\'s own ramp, held at its ends');
  check(S.rampAt(NaN) === S.NO_TEMP && S.rampAt(undefined) === S.NO_TEMP, 'water with no temperature is the grey that is on no part of the ramp');
  {
    // Cold is blue and warm is red, and it is not a rainbow: blue only falls and red only rises until the last, darker red.
    const rgb = stops.map((h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)));
    check(rgb[0][2] > rgb[0][0] + 60 && rgb[6][0] > rgb[6][2] + 150, 'the cold end is blue and the warm end red');
    check(rgb.slice(3).every((c, i, a) => i === 0 || c[2] < a[i - 1][2]) && rgb.slice(0, 4).every((c, i, a) => i === 0 || c[0] > a[i - 1][0]), 'red rises to the middle and blue falls from it: two hues through a pale middle, no green band');
    // Told apart without red-green vision: the two ends differ in blue-yellow and the middle is the lightest.
    const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
    check(lum(rgb[3]) > lum(rgb[0]) + 80 && lum(rgb[3]) > lum(rgb[6]) + 80 && Math.abs((rgb[0][2] - (rgb[0][0] + rgb[0][1]) / 2) - (rgb[6][2] - (rgb[6][0] + rgb[6][1]) / 2)) > 150, 'the ends differ in blue against yellow, not only in red against green');
  }
  check(S.CURRENTS_LEGEND.low === '−2' && S.CURRENTS_LEGEND.high === '30' && S.CURRENTS_LEGEND.unit === '°C' && S.SPEEDUP === 864000, 'the legend runs from -2 to 30 degrees C, and a second on screen is ten days of drift');

  const earth = new THREE.Object3D();
  let n = 0;
  const asked = [];
  const seeded = () => { n += 1; const x = Math.sin(n * 12.9898) * 43758.5453; return x - Math.floor(x); };
  // The harvester's wrapper round each copy.
  const bodies = { 'data/v1/ocean-currents.json': JSON.stringify({ schema: 1, source: 'ocean-currents', fetched_at: '2026-10-12T10:00:00Z', body: flowDoc }), 'data/v1/ocean-temperature.json': JSON.stringify({ schema: 1, source: 'ocean-temperature', fetched_at: '2026-10-12T10:00:00Z', body: tempDoc }) };
  const NOW = Date.parse('2026-10-12T10:30:00Z');
  const make = (extra = {}) => S.createCurrents({ earth: () => earth, now: () => NOW, random: seeded, fetch: async (u, init) => { asked.push({ u, init }); return { ok: u in bodies, status: u in bodies ? 200 : 404, text: async () => bodies[u] || '' }; }, ...extra });
  const sea = make();
  check(sea.state().id === null && sea.state().status === 'off' && earth.children.length === 0 && asked.length === 0, 'nothing is drawn or asked for until it is set');
  sea.set(true);
  check(sea.state().status === 'loading' && sea.state().id === 'currents', 'asked for: loading');
  await settled(sea);
  const st = sea.state();
  check(st.status === 'shown' && st.kind === 'currents' && st.cls === 'analysed' && st.date === flow.timeMs && st.tempDate === temp.timeMs && st.legend === S.CURRENTS_LEGEND && st.speedup === 864000 && st.still === false && st.count === S.COUNT, `shown, with both days and what the legend needs (${JSON.stringify({ ...st, legend: undefined })})`);
  check(asked.length === 2 && asked.map((a) => a.u).sort().join() === 'data/v1/ocean-currents.json,data/v1/ocean-temperature.json' && asked.every((a) => a.init.credentials === 'omit' && a.init.referrerPolicy === 'no-referrer'), `two requests, for our saved copies, with no credentials and no referrer (${asked.map((a) => a.u)})`);
  const lines = sea.lines();
  // The two ends of every piece and their inks, as the CPU writes them and the ribbon's shader reads
  // them: six numbers and eight numbers a piece. Read here end by end, as the vertices they were.
  const endsOf = (mesh) => { const array = mesh.geometry.attributes.segA.data.array; return { array, count: array.length / 3, getX: (i) => array[i * 3], getY: (i) => array[i * 3 + 1], getZ: (i) => array[i * 3 + 2] }; };
  const inksOf = (mesh) => { const array = mesh.geometry.attributes.inkA.data.array; return { array, itemSize: 4, getX: (i) => array[i * 4], getY: (i) => array[i * 4 + 1], getZ: (i) => array[i * 4 + 2], getW: (i) => array[i * 4 + 3] }; };
  const pos = endsOf(lines);
  const col = inksOf(lines);
  const ga = lines.geometry.attributes;
  check(earth.children[0] === lines && lines.isMesh && lines.geometry.isInstancedBufferGeometry && lines.geometry.instanceCount === S.COUNT * S.TRAIL && lines.name === 'earth:currents' && pos.count === S.COUNT * S.TRAIL * 2 && col.itemSize === 4, `${S.COUNT} streaks of ${S.TRAIL} pieces, one quad drawn once a piece, children of the Earth's mesh so they turn with it`);
  check(ga.segA.data === ga.segB.data && ga.segA.offset === 0 && ga.segB.offset === 3 && ga.segA.data.stride === 6 && ga.inkA.data === ga.inkB.data && ga.inkB.offset === 4 && ga.inkA.data.stride === 8 && ga.segA.data.isInstancedInterleavedBuffer, 'the ends and the inks are read from the two arrays as they lie, once a piece');
  {
    // THE RIBBON: wide enough to be seen on a sunlit sea, cased in dark, and so many PIXELS wide.
    const u = lines.material.uniforms;
    check(S.RIBBON_PX >= 1.2 && S.RIBBON_PX <= 2.5 && S.CASING_PX >= 0.75 && S.CASING_PX <= 2 && S.CASING.alpha >= 0.4 && S.CASING.alpha <= 0.8 && Math.max(...S.CASING.rgb) < 0.12, `a core about a pixel and a half wide inside a dark casing (${S.RIBBON_PX} px, ${S.CASING_PX} px a side, ${JSON.stringify(S.CASING)})`);
    const fake = { getDrawingBufferSize: (v) => v.set(2880, 1800), getPixelRatio: () => 2 };
    lines.material.opacity = 0.5;
    lines.onBeforeRender(fake);
    check(u.uRes.value.x === 2880 && near(u.uCorePx.value, S.RIBBON_PX, 1e-9) && near(u.uHalfPx.value, (S.RIBBON_PX / 2 + S.CASING_PX) * 2, 1e-9) && u.uOpacity.value === 0.5, 'its width follows the canvas and the pixel ratio, and its fade the material\'s opacity');
    const vs = lines.material.vertexShader; const fs = lines.material.fragmentShader;
    check(/logdepthbuf_vertex/.test(vs) && /logdepthbuf_fragment/.test(fs) && /colorspace_fragment/.test(fs), 'the shader keeps the logarithmic depth and the output colour space');
    check(/uHalfPx \/ half_ \* p\.w/.test(vs) && /mix\( uCasing, vInk\.rgb, core \)/.test(fs), 'it widens each piece on the screen, and draws a core inside a casing');
  }
  // Every vertex that can be seen, back to a place: on the sphere, and over water.
  const placeOf = (i) => ({ lat: Math.asin(Math.max(-1, Math.min(1, pos.getY(i)))) * 180 / Math.PI, lon: Math.atan2(-pos.getZ(i), pos.getX(i)) * 180 / Math.PI });
  const census = () => {
    let dry = 0; let seen = 0; let off = 0;
    for (let i = 0; i < pos.count; i += 1) {
      if (!(col.getW(i) > 0)) continue;
      seen += 1;
      if (!near(Math.hypot(pos.getX(i), pos.getY(i), pos.getZ(i)), 1, 1e-4)) off += 1;
      const p = placeOf(i);
      // The mask is the data's: a vertex is dry when the grid has no current where it stands.
      if (D.sampleCurrent(flow, p.lat, p.lon) === null) dry += 1;
    }
    return { dry, seen, off };
  };
  const first = census();
  check(first.seen > pos.count / 4 && first.dry === 0 && first.off === 0, `every visible vertex is on the sphere and over the sea when first drawn (${JSON.stringify(first)})`);
  check(lines.scale.x > 1.003, 'lifted clear of the ground and the data overlays');
  {
    // Colour is temperature: a streak near the equator is on the warm side of the ramp, one near a pole on the cold.
    let warmOk = 0; let warm = 0; let coldOk = 0; let cold = 0;
    for (let s = 0; s < S.COUNT; s += 1) {
      const i = s * S.TRAIL * 2;
      if (!(col.getW(i) > 0)) continue;
      const p = placeOf(i);
      if (Math.abs(p.lat) < 12) { warm += 1; if (col.getX(i) > col.getZ(i)) warmOk += 1; }
      if (Math.abs(p.lat) > 70) { cold += 1; if (col.getZ(i) > col.getX(i)) coldOk += 1; }
    }
    check(warm > 20 && warmOk === warm && cold > 5 && coldOk === cold, `warm water is drawn red and cold water blue (${warmOk}/${warm} near the equator, ${coldOk}/${cold} near the poles)`);
  }
  {
    // A streak's length is its speed: the 1 m/s water of the south draws longer tails than the 0.2 m/s of the north-east.
    const len = (s) => { const a = s * S.TRAIL * 6; const b = a + (S.TRAIL - 1) * 6 + 3; return Math.hypot(pos.array[a] - pos.array[b], pos.array[a + 1] - pos.array[b + 1], pos.array[a + 2] - pos.array[b + 2]); };
    let fast = 0; let nf = 0; let slow = 0; let ns = 0;
    for (let s = 0; s < S.COUNT; s += 1) {
      const p = placeOf(s * S.TRAIL * 2);
      if (p.lat < -25 && p.lat > -60 && p.lon > 0 && p.lon < 90) { fast += len(s); nf += 1; }
      if (p.lat > 25 && p.lat < 60 && p.lon > 0 && p.lon < 90) { slow += len(s); ns += 1; }
    }
    check(nf > 10 && ns > 10 && fast / nf > 3 * (slow / ns) && fast / nf > 0.05, `fast water draws a longer streak (${(fast / nf).toFixed(3)} against ${(slow / ns).toFixed(3)} of the Earth's radius)`);
  }
  const before = Array.from(pos.array.slice(0, 1200));
  let dryLater = 0;
  for (let f = 0; f < 12; f += 1) { await new Promise((r) => setTimeout(r, 30)); sea.update(); dryLater += census().dry; }
  const moved = before.filter((x, i) => Math.abs(x - pos.array[i]) > 1e-7).length;
  check(moved > 200 && lines.visible && lines.material.opacity > 0 && lines.material.transparent && lines.material.depthWrite === false, `the streaks move with the water and fade in (${moved} of 1200 numbers changed)`);
  check(dryLater === 0, `and in twelve frames of motion no visible vertex was ever over land (${dryLater})`);
  const line = L.overlayLine(sea.state());
  check(line === 'Currents at the sea’s surface; colour is the water’s temperature. Worked out from the height of the sea that satellites measured on 10 October 2026: the steady flow, with no tides or wind drift, least sure on the equator. Temperature measured on 10 October 2026, gaps filled. The streaks move 10 days of drift in a second; a long streak is fast water. Data: NOAA CoastWatch (Sentinel data courtesy of the Copernicus Programme; generated using AVISO+ products) and NOAA NCEI OISST v2.1.', `the sentence says what it is, of which days, what it leaves out, how fast and whose: ${line}`);
  check(sea.state().tempGaps === 0 && L.overlayLine({ ...sea.state(), tempGaps: 3 }).includes(COPY.overlay.currents.tempMissing), 'and when some water has no temperature, that its streaks are grey');
  check(L.overlayLine({ id: 'currents', kind: 'currents', status: 'loading' }) === COPY.overlay.currents.loading && L.overlayLine({ id: 'currents', kind: 'currents', status: 'failed' }) === COPY.overlay.currents.failed, 'loading and failed have their own words');
  check(COPY.overlay.currents.title.split(' ').length <= 2, 'its name is two words');
  // Asked for again within the day: the fields here are kept, and nobody is asked.
  sea.set(false);
  check(sea.state().id === null && sea.state().status === 'off', 'taken away again');
  sea.set(true);
  check(sea.state().status === 'shown' && asked.length === 2, 'and shown again from the fields it holds, with no new request');
  sea.dispose();
  check(earth.children.length === 0, 'and disposed, it leaves the Earth as it found it');

  // Reduced motion: drawn once, and no frame moves it.
  const calm = make({ reducedMotion: true });
  calm.set(true);
  await settled(calm);
  const cp = Array.from(endsOf(calm.lines()).array.slice(0, 1200));
  await new Promise((r) => setTimeout(r, 40));
  calm.update();
  check(calm.state().still === true && cp.every((x, i) => x === endsOf(calm.lines()).array[i]), 'with reduced motion the streaks stand still');
  check(/standing still/.test(L.overlayLine(calm.state())) && !/in a second/.test(L.overlayLine(calm.state())), 'and the sentence says so');
  calm.dispose();

  // The device tiers, and data saving.
  check(JSON.stringify(S.COUNT_BY_TIER) === '[1200,2500,5000]' && S.COUNT_BY_TIER[1] === S.COUNT && S.streakCount(0) === 1200 && S.streakCount(2) === 5000 && S.streakCount(undefined) === 2500 && S.streakCount(9) === 5000 && S.streakCount(-3) === 1200 && S.streakCount(2, true) === 2500 && S.streakCount(0, true) === 600, 'tiers 0, 1 and 2 draw 1200, 2500 and 5000 streaks, and data saving halves each');
  const small = make({ tier: 0, saveData: true });
  small.set(true);
  check(small.lines().geometry.instanceCount === 600 * S.TRAIL && endsOf(small.lines()).count === 600 * S.TRAIL * 2, 'a phone that saves data allocates 600 streaks');
  small.dispose();

  // No copy of one of the two: said, and nothing drawn.
  let tries = 0;
  const warn = console.warn; console.warn = () => {};
  const half = S.createCurrents({ earth: () => earth, now: () => NOW, retryMs: 5, fetch: async (u) => { tries += 1; return /temperature/.test(u) ? { ok: false, status: 404, text: async () => '' } : { ok: true, status: 200, text: async () => bodies[u] }; } });
  half.set(true);
  await settled(half);
  console.warn = warn;
  check(half.state().status === 'failed' && tries === 4 && L.overlayLine(half.state()) === COPY.overlay.currents.failed && half.lines().visible === false, `with the temperature missing the pair is asked for once more and then said to be not here (${tries} requests)`);
  half.dispose();
  let m = 0;
  let threw = null;
  try { await D.fetchCurrents({ retryMs: 5, fetch: async () => { m += 1; return { ok: true, status: 200, text: async () => src('tests/fixtures/harvest/sea_grid.json') }; } }); } catch (e) { threw = e; }
  check(threw && /not the grid/.test(threw.message) && m === 2, 'a copy that came and was not the grid asked for is not asked for again');
}

// ---- 4. only the saved copies, nothing at boot, and the evidence ----------------------------------------
{
  const data = src('site/js/data/currents.js');
  check(!/https?:\/\//.test(data.split('export async function fetchCurrents')[1] || 'x') && D.CURRENTS.flowUrl === 'data/v1/ocean-currents.json' && D.CURRENTS.tempUrl === 'data/v1/ocean-temperature.json', 'fetchCurrents names our own folder, relative to the page, and no other host');
  const row = src('registry/sources.yaml');
  check(/- id: ocean-currents\n\s+url: https:\/\/coastwatch\.noaa\.gov\/erddap\/griddap\/noaacwBLENDEDNRTcurrentsDaily\.json\?u_current%5B\(last\)%5D[^\n]*:4:[^\n]*v_current[^\n]*\n\s+auth: none\n\s+browser: false\n\s+cadence: 24h\n\s+freshness_max: 96h\n\s+parser: sea_grid\n\s+outputs: \[ocean-currents\.json\]/.test(row), 'the registry row for the currents is the harvester\'s daily, browser: false, packed');
  check(/- id: ocean-temperature\n\s+url: https:\/\/coastwatch\.pfeg\.noaa\.gov\/erddap\/griddap\/ncdcOisst21NrtAgg\.json\?sst%5B\(last\)%5D[^\n]*:4:[^\n]*\n\s+auth: none\n\s+browser: false\n\s+cadence: 24h\n\s+freshness_max: 96h\n\s+parser: sea_grid\n\s+outputs: \[ocean-temperature\.json\]/.test(row), 'and so is the temperature\'s');
  const SRC = await import(join(JS, 'data/sources.js'));
  for (const id of ['ocean-currents', 'ocean-temperature']) {
    const s = SRC.SOURCES[id];
    const att = new RegExp(`- id: ${id}\\n[^]*?attribution: "([^"]+)"`).exec(row);
    check(s && s.browser === false && s.registryId === id && att && s.attribution === att[1], `data/sources.js carries ${id} with the registry's own credit line`);
    check(src('CREDITS.md').includes(att ? att[1] : '\u0000'), `and CREDITS.md carries that line (${id})`);
    check(new RegExp('default: "[^"]* ' + id + '( [^"]*)?"').test(src('.github/workflows/harvest.yml')), `the harvest workflow reads ${id} by default`);
  }
  const panel = src('site/js/ui/overlaypanel.js');
  check(/CURRENTS_OPTION = 'currents'/.test(panel) && /snapshotAvailable\('ocean-currents'\), m\.snapshotAvailable\('ocean-temperature'\)/.test(panel) && /if \(!flow \|\| !temp/.test(panel) && /C\.currents\.title/.test(panel) && S.CURRENTS_ID === 'currents', 'the panel offers Ocean currents only when the manifest lists both copies');
  const main = src('site/js/main.js');
  check(!/^import .*scene\/currents\.js/m.test(main) && !/^import .*data\/currents\.js/m.test(main) && /import\('\.\/scene\/currents\.js'\)/.test(main) && /ctx\.currents\.update\(\)/.test(main), 'main.js imports the currents when they are chosen, and steps them each frame');
  check(/id === CURRENTS_OVERLAY\) wantCurrents\(\)/.test(main) && /ctx\.currents\.set\(false\)/.test(main) && /isStreaks\(overlayAsked\) \? null : overlayAsked/.test(main), 'one overlay at a time: a map or the wind takes the currents away, and the currents them');
  const scene = src('site/js/scene/currents.js');
  check(/InstancedBufferGeometry/.test(scene) && !/WebGLRenderTarget|PlaneGeometry|OrthographicCamera|FullScreenQuad/.test(scene) && (scene.match(/new THREE\.Mesh\(/g) || []).length === 1, 'the streaks are thin ribbons on the Earth\'s frame in one draw call: no full-screen pass, no render target');
  {
    // Where a streak starts: fast water far oftener than slow, and never never.
    check(S.spawnChance(1.5) === 1 && S.spawnChance(S.FAST_MS) === 1 && S.spawnChance(0) === S.SLOW_CHANCE && S.spawnChance(NaN) === S.SLOW_CHANCE && S.SLOW_CHANCE > 0, 'water at the fast speed and over always takes a streak; still water seldom, and not never');
    check(S.spawnChance(0.3) / S.spawnChance(0.13) > 3 && S.spawnChance(0.3) >= 0.4 && S.spawnChance(1) / S.spawnChance(0.13) > 7, `a jet at 0.3 m/s holds over three times the streaks of the median sea, a western boundary current over seven (${S.spawnChance(0.3).toFixed(2)}, ${S.spawnChance(0.13).toFixed(2)})`);
  }
  check(/TESTED ON 2026-10-12/.test(data) && /GEOSTROPHIC/.test(data) && /may be used and redistributed for free/.test(data.replace(/\n\/\/\s+/g, ' ')) && /Earthdata login/.test(data) && /Copernicus Marine/.test(data) && /NO Access-Control-Allow-Origin/.test(data), 'data/currents.js says what was tested, what the current is and is not, the terms, and what was not used');
  const credits = src('CREDITS.md');
  check(/coastwatch\.noaa\.gov/.test(credits) && /10\.25921\/RE9P-PT57/.test(credits) && /Huang, Boyin/.test(credits) && /AVISO\+/.test(credits) && /ColorBrewer/.test(credits), 'CREDITS.md names both datasets, the citation NCEI asks for, AVISO+ and Copernicus, and the colour ramp');
}

if (problems.length) { console.error('currents FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log(`currents ok: two saved copies of 180 x 360 points, refused unless whole; a metre a second for a day is 0.777 degrees; ${S.COUNT} streaks on the Earth's frame, coloured by the sea's temperature, never over land, still under reduced motion; nothing at boot`);
