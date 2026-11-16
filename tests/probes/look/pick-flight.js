// pick-flight: what a pointer gets on a drawn model and on a small icon over the Earth, and how big a
// selected model is drawn while the camera flies to it (internal #340, #341, #342). Run the same probe on
// two refs and read the two answers side by side (tools/README.md, "A look from a machine that has time"):
//   gh workflow run look.yml --ref <branch> -f probe=pick-flight -f ref=main -f subject=sat-25544
//   gh workflow run look.yml --ref <branch> -f probe=pick-flight -f ref=<branch> -f subject=sat-25544
// and again with -f mobile=true. `subject` is only there so the run saves the catalogue of every active
// satellite, which the crowded view needs. The pointer is REAL (tools/cdp.mjs cdpInput): a mouse at
// desktop sizes, a finger (touchStart, touchEnd) on a phone.
//
//   models   the ISS and Hubble, flown to as a click does and the clock paused. Points ON the drawn model
//            (its own vertices, spread from the middle to the tips of the panels) are tapped while it is
//            selected and again after it is put down (the 84 px model): a hit is the model's own record.
//   icons    the home view of the Earth with the layers a visitor has, then with every active satellite on
//            (the crowded view). For every dot drawn in front of the Earth, three points on its icon are
//            asked through the app's own decision (`sr.decisionAt`, the one a click uses): the icon, the
//            Earth, or a list. A sample of them is tapped for real, lone and crowded, in the middle and on
//            the icon's edge; and spots of the Earth with no icon near are tapped: they must be the Earth.
//   flights  from the home view to a rover on the Moon, a rover on Mars, a lander, the ISS and Voyager 1,
//            as the drift flies (select with a long cruise): every frame's flight share, camera distance and
//            the model's size on screen (`sr.heroes.drawnPx`). A picture on the way (past the flight's first
//            third, when the camera looks where it is going) and on arrival.
look.probe = 'pick-flight';
const el = sr.renderer.domElement;
const V3 = sr.camera.position.constructor;
const phone = innerWidth < 600;
const pointer = phone ? 'touch' : 'mouse';
const LOCAL = phone ? 24 : 10; // scene/pickrank.js REACH.*.local: what the app counts a crowd in
const P = await import(new URL('./js/propagate/index.js', document.baseURI).href);
const G = await import(new URL('./js/scene/glyphs.js', document.baseURI).href);
const out = { pointer, problems: [], models: {}, icons: {}, flights: [] };
const rect = () => el.getBoundingClientRect();
const frame = () => new Promise((r) => requestAnimationFrame(r));
const settle = async (cap = 30000) => { await until(() => !rig.state.flying, cap, 150); await frame(); await frame(); };
const onCanvas = (x, y) => document.elementFromPoint(x, y) === el;
const pct = (n, d) => (d ? Math.round((1000 * n) / d) / 10 : null);

let lastSel;
window.addEventListener('sr:select', (e) => { lastSel = e.detail || null; });
const chooserOpen = () => { const c = document.getElementById('sr-pick'); return !!(c && !c.hidden && c.children.length); };
const closeChooser = () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
/** One real tap: down and up in one go, right after a frame, so a slow renderer does not make it a long press. */
const tap = async (x, y) => {
  lastSel = undefined;
  await frame();
  if (phone) { const a = window.cdpInput('touchStart', x, y); const b = window.cdpInput('touchEnd', x, y); await a; await b; }
  else { await window.cdpInput('mouseMoved', x, y); const a = window.cdpInput('mousePressed', x, y); const b = window.cdpInput('mouseReleased', x, y); await a; await b; }
  await sleep(350); await frame();
  if (chooserOpen()) { closeChooser(); await sleep(100); return 'list'; }
  return lastSel === undefined ? 'nothing' : lastSel === null ? 'empty' : lastSel.id;
};

const scenePos = (rec) => {
  if (rec.klass === 'world') { const m = sr.worlds.meshFor(rec.id); return m ? m.position : null; }
  const t = sr.clock.now(); const p = P.propagate(rec, t); return p ? sr.stage.toScene(p, p.frame, t) : null;
};
const toScreen = (pos) => { const v = new V3(pos.x, pos.y, pos.z).project(sr.camera); const r = rect(); return { x: r.left + ((v.x + 1) / 2) * r.width, y: r.top + ((1 - v.y) / 2) * r.height, z: v.z }; };

// ---------------------------------------------------------------- models
const heroObj = (id) => { const root = sr.scene.getObjectByName('heroes'); return root ? root.children.find((c) => c.userData && c.userData.recordId === id) || null : null; };
/** Points on the drawn model, on screen: its own vertices, spread from the middle out to the farthest tips. */
const modelPoints = (id, n) => {
  const obj = heroObj(id);
  if (!obj || !obj.visible) return [];
  obj.updateMatrixWorld(true); sr.camera.updateMatrixWorld();
  const r = rect(); const pts = [];
  obj.traverse((m) => {
    if (!m.isMesh || !m.visible || (m.userData && m.userData.noReach) || !m.geometry) return;
    for (let p = m; p && p !== obj; p = p.parent) if (!p.visible) return;
    const pos = m.geometry.getAttribute('position');
    if (!pos) return;
    const step = Math.max(1, Math.floor(pos.count / 80));
    for (let i = 0; i < pos.count; i += step) {
      const v = new V3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld).project(sr.camera);
      if (!(v.z > -1 && v.z < 1)) continue;
      const x = r.left + ((v.x + 1) / 2) * r.width, y = r.top + ((1 - v.y) / 2) * r.height;
      if (x > r.left + 4 && x < r.right - 4 && y > r.top + 4 && y < r.bottom - 4 && onCanvas(x, y)) pts.push({ x, y });
    }
  });
  if (!pts.length) return [];
  const c = toScreen(obj.position);
  for (const p of pts) p.d = Math.hypot(p.x - c.x, p.y - c.y);
  const picked = [pts.reduce((a, b) => (b.d > a.d ? b : a))];
  while (picked.length < n) {
    let best = null, bestGap = 5;
    for (const p of pts) { const gap = Math.min(...picked.map((q) => Math.hypot(p.x - q.x, p.y - q.y))); if (gap > bestGap) { bestGap = gap; best = p; } }
    if (!best) break;
    picked.push(best);
  }
  return picked.map((p) => ({ x: Math.round(p.x * 10) / 10, y: Math.round(p.y * 10) / 10, d: Math.round(p.d) }));
};
const tally = (rows, id) => ({ taps: rows.length, hits: rows.filter((q) => q.got === id).length, rate: pct(rows.filter((q) => q.got === id).length, rows.length), got: rows.map((q) => `${q.d}px:${q.got === id ? 'hit' : q.got}`) });

const modelTest = async (id, label) => {
  const rec = sr.recordById(id);
  if (!rec) { look.missing.push(id); return; }
  sr.clock.live();
  sr.select(rec, { fly: true, undo: false });
  await settle();
  await until(() => sr.heroes.drawnPx(id) > 60, 40000, 250);
  await until(() => { const o = heroObj(id); return o && o.userData.realModel; }, 15000, 250);
  await sleep(1500);
  sr.clock.setPaused(true);
  await sleep(600);
  const view = rig.saveState();
  const m = { px: Math.round(sr.heroes.drawnPx(id)), real: !!(heroObj(id) && heroObj(id).userData.realModel), docked: sr.heroes.hidden().filter((h) => h.insideOf && h.insideOf.id === id).length };
  await shot(`${label}-selected`, `${rec.name} selected, its model ${m.px} px across`);
  const hold = async (selected) => {
    if (selected) { if (sr.selected() !== rec) sr.select(rec, { fly: false, undo: false }); } else if (sr.selected()) sr.deselect({ stay: true });
    await settle(8000);
    rig.restoreState(view, 0);
    await sleep(250); await frame(); await frame();
  };
  // Selected: the middle, then points out to the tips.
  const sel = [];
  const c = toScreen(scenePos(rec));
  sel.push({ d: 0, got: await tap(c.x, c.y) });
  await hold(true);
  for (const p of modelPoints(id, phone ? 9 : 12)) { sel.push({ d: p.d, got: await tap(p.x, p.y) }); await hold(true); }
  m.selected = tally(sel, id);
  m.selectedOffCentre = tally(sel.filter((q) => q.d > (phone ? 24 : 10)), id);
  // Put down: the model every near craft has (84 px).
  await hold(false);
  await sleep(600);
  m.plainPx = Math.round(sr.heroes.drawnPx(id));
  const plain = [];
  if (m.plainPx > 0) {
    await shot(`${label}-plain`, `${rec.name} put down, its model ${m.plainPx} px across`);
    for (const p of modelPoints(id, phone ? 6 : 8)) { plain.push({ d: p.d, got: await tap(p.x, p.y) }); await hold(false); }
  }
  m.plain = tally(plain, id);
  m.plainOffCentre = tally(plain.filter((q) => q.d > (phone ? 24 : 10)), id);
  out.models[label] = m;
  sr.deselect({ stay: true });
  sr.clock.live();
};

// ---------------------------------------------------------------- icons over the Earth
const earthDisc = () => { const r = rect(); const d = sr.worlds.pickAll(0, 0, sr.camera, { w: r.width, h: r.height }, 1e7).find((q) => q.record.id === 'earth'); return d ? { cx: r.left + d.cx, cy: r.top + d.cy, r: d.r } : null; };
const iconR = (rec) => (Math.min(14, Math.max(4, rec.sizePx || G.GLYPH_SIZE_PX[rec.klass] || 8)) * (rec.klass === 'debris' ? 0.6 : 1)) / 2;
/** Every dot the app's own layers find within `reach` px of a point, in front of the Earth. */
const marksAt = (x, y, reach, front) => {
  const r = rect(); const nx = ((x - r.left) / r.width) * 2 - 1, ny = -((y - r.top) / r.height) * 2 + 1; const list = [];
  for (const [id, gl] of sr.glyphLayers) {
    if (!sr.isLayerOn(id) || !gl.pickAll) continue;
    for (const q of gl.pickAll(nx, ny, 60, reach, sr.camera, { w: r.width, h: r.height })) if (!front || front.has(q.record.id)) list.push(q);
  }
  return list;
};
const iconTest = async (label) => {
  sr.deselect({ stay: true });
  await settle();
  sr.clock.setPaused(true);
  await sleep(800); await frame(); await frame();
  const view = rig.saveState();
  const disc = earthDisc();
  if (!disc) { out.problems.push(`${label}: no Earth disc`); return; }
  const earthMesh = sr.worlds.meshFor('earth');
  const dc = sr.camera.position.distanceTo(earthMesh.position);
  const horizon = Math.sqrt(Math.max(0, dc * dc - earthMesh.scale.x * earthMesh.scale.x));
  // The dots in front of the Earth, inside its outline, on the canvas.
  const marks = []; const front = new Set();
  for (const [id] of sr.glyphLayers) {
    if (!sr.isLayerOn(id)) continue;
    for (const rec of sr.recordsFor(id)) {
      let pos = null; try { pos = scenePos(rec); } catch { pos = null; }
      if (!pos) continue;
      if (sr.camera.position.distanceTo(pos) >= horizon) continue;
      const s = toScreen(pos);
      if (!(s.z > -1 && s.z < 1) || Math.hypot(s.x - disc.cx, s.y - disc.cy) > disc.r - 8 || !onCanvas(s.x, s.y)) continue;
      front.add(rec.id);
      marks.push({ rec, x: s.x, y: s.y, r: iconR(rec) });
    }
  }
  // Keep those the layers really offer under their own middle (a dot faded out or filtered is not a target).
  const live = [];
  for (const mk of marks.slice(0, 4000)) {
    const near = marksAt(mk.x, mk.y, LOCAL, front);
    if (!near.some((q) => q.record.id === mk.rec.id && q.px < 1.5)) continue;
    mk.crowd = near.length;
    mk.nearest = Math.min(Infinity, ...near.filter((q) => q.record.id !== mk.rec.id).map((q) => Math.hypot(q.sx + rect().left - mk.x, q.sy + rect().top - mk.y)));
    live.push(mk);
  }
  const res = { disc: Math.round(disc.r * 2), dots: live.length, crowded: live.filter((q) => q.crowd >= 3).length };
  // 1. The app's own decision at three points on every icon: the middle, half way out, the edge.
  const ask = { points: 0, icon: 0, earth: 0, list: 0, other: 0, nothing: 0 };
  const askCrowd = { points: 0, icon: 0, earth: 0, list: 0, other: 0, nothing: 0 };
  const askLone = { points: 0, icon: 0, earth: 0, list: 0, other: 0, nothing: 0 };
  const stride = Math.max(1, Math.floor(live.length / 500));
  for (const mk of live.filter((_, i) => i % stride === 0)) {
    // Not two icons drawn on one spot (the app lists those). An icon that another overlaps is asked in its middle only,
    // where it is the nearest; one that stands clear also half way out and on its edge.
    if (mk.nearest < 4) continue;
    for (const [dx, dy] of mk.nearest < mk.r * 2 + 1 ? [[0, 0]] : [[0, 0], [mk.r * 0.5, 0], [0, -mk.r * 0.9]]) {
      const d = sr.decisionAt(mk.x + dx, mk.y + dy, pointer);
      const w = d && d.winner;
      const key = d && d.ambiguous && d.list.length > 1 ? 'list' : !w ? 'nothing' : w.id === mk.rec.id ? 'icon' : w.id === 'earth' ? 'earth' : 'other';
      for (const t of [ask, mk.crowd >= 3 ? askCrowd : askLone]) { t.points++; t[key]++; }
    }
  }
  for (const t of [ask, askCrowd, askLone]) t.iconRate = pct(t.icon, t.points);
  res.onIcon = ask; res.onIconCrowd = askCrowd; res.onIconLone = askLone;
  // 2. The Earth between the icons: a grid over the disc, where no icon is under the pointer and where one is.
  const grid = { points: 0, noIcon: 0, noIconEarth: 0, noIconMark: 0, underIcon: 0, underIconMark: 0, underIconEarth: 0 };
  const free = [];
  for (let j = 0; j < 25; j++) for (let i = 0; i < 25; i++) {
    const x = disc.cx + disc.r * 0.9 * ((i / 12) - 1), y = disc.cy + disc.r * 0.9 * ((j / 12) - 1);
    if (Math.hypot(x - disc.cx, y - disc.cy) > disc.r * 0.88 || !onCanvas(x, y)) continue;
    const near = marksAt(x, y, LOCAL + 6, front);
    const under = near.some((q) => q.px <= iconR(q.record));
    const d = sr.decisionAt(x, y, pointer);
    const w = d && d.winner;
    grid.points++;
    if (under) { grid.underIcon++; if (w && w.id === 'earth') grid.underIconEarth++; else if (w) grid.underIconMark++; }
    else { grid.noIcon++; if (w && w.id === 'earth') grid.noIconEarth++; else if (w) grid.noIconMark++; if (!near.length) free.push({ x, y }); }
  }
  grid.earthShare = pct(grid.noIconEarth + grid.underIconEarth, grid.points);
  grid.emptyEarthRate = pct(grid.noIconEarth, grid.noIcon);
  res.grid = grid;
  // 3. Real taps: lone and crowded icons, in the middle and near the edge; then empty Earth.
  const pickSome = (list, n) => { const step = Math.max(1, Math.floor(list.length / n)); return list.filter((_, i) => i % step === 0).slice(0, n); };
  const clear = live.filter((q) => q.nearest >= q.r * 2 + 1);
  res.frameMs = await (async () => { const t = performance.now(); for (let i = 0; i < 5; i++) await frame(); return Math.round((performance.now() - t) / 5); })();
  const reset = async () => { if (sr.selected()) sr.deselect({ stay: true }); await settle(8000); if (sr.stage.worldId !== 'earth') { sr.setStage('earth'); await sleep(2500); } rig.restoreState(view, 0); await sleep(200); await frame(); await frame(); };
  const taps = { lone: [], crowd: [], earth: [] };
  const n = phone ? 6 : 8;
  for (const [key, list] of [['lone', pickSome(clear.filter((q) => q.crowd < 3), n)], ['crowd', pickSome(clear.filter((q) => q.crowd >= 3), n)]]) {
    for (const mk of list) {
      for (const [name, dx, dy] of [['mid', 0, 0], ['edge', mk.r * 0.6, -mk.r * 0.6]]) {
        const got = await tap(mk.x + dx, mk.y + dy);
        taps[key].push({ at: name, r: mk.r, crowd: mk.crowd, got: got === mk.rec.id ? 'icon' : got });
        await reset();
      }
    }
  }
  for (const p of pickSome(free, n)) { taps.earth.push({ got: await tap(p.x, p.y) }); await reset(); }
  const sumTaps = (rows, want) => ({ taps: rows.length, hits: rows.filter((q) => q.got === want).length, rate: pct(rows.filter((q) => q.got === want).length, rows.length), got: rows.map((q) => q.got).join(',') });
  res.tapLone = sumTaps(taps.lone, 'icon');
  res.tapCrowd = sumTaps(taps.crowd, 'icon');
  res.tapEarth = sumTaps(taps.earth, 'earth');
  out.icons[label] = res;
  await shot(`icons-${label}`, `${label}: ${res.dots} dots in front of the Earth, ${res.crowded} of them in a crowd for a ${pointer}`);
  sr.clock.live();
};

// ---------------------------------------------------------------- flights
const flightLog = async (id, label, home) => {
  const rec = sr.recordById(id) || sr.records().find((q) => q.name === id);
  if (!rec) { look.missing.push(id); return; }
  sr.deselect();
  await settle();
  if (sr.stage.worldId !== 'earth') { sr.setStage('earth'); await sleep(3000); }
  rig.restoreState(home, 0);
  sr.clock.live();
  await sleep(1500); await frame(); await frame();
  const rows = [];
  let early = false, arrivedAt = null;
  const t0 = performance.now();
  // As the drift flies (ui/drift.js): select, with a long flight on the cruise ease.
  sr.select(rec, { fly: true, undo: false, flyMs: 12000, flight: { ease: 'cruise' } });
  while (performance.now() - t0 < 120000) {
    await frame();
    const pos = scenePos(rec);
    const flying = !!rig.state.flying;
    const k = rig.flightProgress ? rig.flightProgress() : null;
    rows.push({ ms: Math.round(performance.now() - t0), k: k == null ? null : Math.round(k * 1000) / 1000, flying, d: pos ? sr.camera.position.distanceTo(pos) : null, px: Math.round(sr.heroes.drawnPx(rec.id) * 10) / 10 });
    // Past the flight's first third the camera is looking at where it is going (the rig's targetDelay): the subject is in the picture.
    if (!early && flying && k != null && k >= 0.6) { early = true; await shot(`flight-${label}-midway`, `${rec.name}: on the way (${Math.round(k * 100)} % of the flight, ${pos && rows[0].d ? Math.round((100 * rows[rows.length - 1].d) / rows[0].d) : '?'} % of the distance left), its model ${rows[rows.length - 1].px} px`); }
    if (!flying && arrivedAt == null) arrivedAt = performance.now();
    if (arrivedAt != null && performance.now() - arrivedAt > 5000) break;
  }
  await shot(`flight-${label}-arrival`, `${rec.name}: arrived, its model ${rows[rows.length - 1].px} px`);
  const fl = rows.filter((q) => q.flying);
  const arrival = rows[rows.length - 1];
  const atK = (k) => { const q = fl.find((x) => x.k != null && x.k >= k); return q ? { k: q.k, px: q.px, timesArrivalDistance: q.d && arrival.d ? Math.round((q.d / arrival.d) * 10) / 10 : null } : null; };
  const firstDrawn = fl.find((q) => q.px > 0) || null;
  out.flights.push({
    id: rec.id, name: rec.name, label, frames: fl.length, arrivalPx: arrival.px,
    first: fl[0] ? { px: fl[0].px, timesArrivalDistance: fl[0].d && arrival.d ? Math.round((fl[0].d / arrival.d) * 10) / 10 : null } : null,
    firstDrawn: firstDrawn ? { k: firstDrawn.k, px: firstDrawn.px, timesArrivalDistance: firstDrawn.d && arrival.d ? Math.round((firstDrawn.d / arrival.d) * 10) / 10 : null } : null,
    at10: atK(0.1), at25: atK(0.25), at50: atK(0.5), at75: atK(0.75), at90: atK(0.9), at97: atK(0.97),
    // The share of the flight's frames in which the model was within a tenth of its arrival size while the camera was more than three arrival distances away.
    fullSizeFar: pct(fl.filter((q) => arrival.px > 0 && q.px >= 0.9 * arrival.px && q.d > 3 * arrival.d).length, fl.length),
    maxPx: Math.max(0, ...fl.map((q) => q.px)),
    log: fl.filter((_, i) => i % Math.max(1, Math.floor(fl.length / 16)) === 0).map((q) => `${q.k}:${q.px}px@${q.d && arrival.d ? Math.round((q.d / arrival.d) * 10) / 10 : '?'}x`),
  });
};

const section = async (name, fn) => { try { await fn(); } catch (e) { look.errors.push(`probe: ${name} threw: ${(e && e.stack) || e}`); } };
await settle(90000);
await sleep(2000);
const home = rig.saveState();
const only = new URLSearchParams(location.search).get('lookOnly');
const want = (name) => !only || only.split('_').includes(name);
if (want('icons')) await section('icons, the home view', () => iconTest('home'));
if (want('models')) {
  await section('the ISS', () => modelTest('sat-25544', 'iss'));
  await section('Hubble', () => modelTest('sat-20580', 'hubble'));
}
if (want('flights')) {
  for (const id of ['landing-sites', 'deep-space']) { try { if (!sr.isLayerOn(id)) sr.setLayerOn(id, true); } catch (e) { look.missing.push('layer ' + id); } }
  // The card's lamp ("Light it"), so a model on a night side is not black on black in the pictures.
  const lamp = await import(new URL('./js/scene/models.js', document.baseURI).href).catch(() => null);
  try { if (lamp && lamp.setFloodLight) lamp.setFloodLight(true); } catch { /* a ref without the lamp */ }
  await sleep(4000);
  await section('flight: Moon rover', () => flightLog('yutu', 'moon-rover', home));
  await section('flight: Mars rover', () => flightLog('gale', 'mars-rover', home));
  await section('flight: lander', () => flightLog('apollo-11', 'lander', home));
  await section('flight: the ISS', () => flightLog('sat-25544', 'iss', home));
  await section('flight: Voyager 1', () => flightLog('deep-voyager-1', 'voyager', home));
  try { if (lamp && lamp.setFloodLight) lamp.setFloodLight(false); } catch { /* a ref without the lamp */ }
  for (const id of ['landing-sites', 'deep-space']) { try { sr.setLayerOn(id, false); } catch { /* as it was */ } }
}
if (want('crowd')) {
  await section('icons, every active satellite', async () => {
    sr.deselect(); await settle();
    if (sr.stage.worldId !== 'earth') { sr.setStage('earth'); await sleep(3000); }
    rig.restoreState(home, 0);
    sr.setLayerOn('active', true);
    const had = await until(() => sr.recordsFor('active').length > 1000, 90000, 500);
    if (!had) { out.problems.push(`the crowded view: the active layer has ${sr.recordsFor('active').length} records (run with -f subject=sat-25544 so the catalogue is saved)`); return; }
    await sleep(6000);
    await iconTest('crowded');
    sr.setLayerOn('active', false);
  });
}
return finish(out);
