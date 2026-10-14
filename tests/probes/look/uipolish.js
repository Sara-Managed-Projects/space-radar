// uipolish: Ivan's four of 2026-10-14, looked at and measured in the app.
//   0. an object's card: the quiet row ("Light it", "Seen it") under the four actions, at rest and pressed
//   1. Explore > Tonight > Change place: the city box and "Use my location"
//   2. "Follow", "Ride along" and "Fly to it" pressed from the ground: is the ground left, and does the rig fly
//   3. a selected object's steadiness, in numbers: the dot as the GPU places it against the brackets'
//      own arithmetic, frame by frame, for a low craft and a geostationary one followed in space,
//      a geostationary one from the ground (on the Earth's stage, and entered from the Sun's by
//      "See it" on a planet's card), and the Moon followed at an hour a second
// Run at 1440 x 900 and again with -f width=360 -f height=780 (the phone layout: under 900 px wide).
// With -f ref=main it measures main: the same probe is the "before".
// ON A SOFTWARE RENDERER a frame is 100 to 400 ms: the numbers of part 3 that come from a late
// clock are LARGER here than on a visitor's machine by that ratio (each row carries its frame
// length); the float32 and the frame-order ones do not depend on it.
look.probe = 'uipolish';
const out = { rows: {}, sky: {}, steady: {} };
const q = (s, root = document) => root.querySelector(s);
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return { x: Math.round(r.left), y: Math.round(r.top), w: Math.round(r.width), h: Math.round(r.height) }; };
const css = (n, k) => (n ? getComputedStyle(n)[k] : null);
const phone = innerWidth < 900;
const full = async () => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set('full'); await sleep(900); } };
const press = async (n, waitMs = 1200) => { if (!n) return false; n.click(); await sleep(waitMs); return true; };

// --- 0. the card's quiet row -------------------------------------------------------------------------
const iss = sr.recordById('sat-25544') || sr.recordsFor('stations')[0];
if (!iss) look.missing.push('a station for the card');
else {
  sr.select(iss, { fly: true, undo: false });
  await until(() => q('#sr-card [data-action="flood"]') && q('#sr-card [data-action="seen"]'), 30000);
  await sleep(4000);
  await full();
  const lamp = q('#sr-card [data-action="flood"]');
  const seen = q('#sr-card [data-action="seen"]');
  const acts = q('#sr-card .sr-card__actions');
  if (lamp) lamp.scrollIntoView({ block: 'center' });
  await sleep(600);
  const row = () => ({
    actions: box(acts), lamp: box(lamp), seen: box(seen),
    lampWords: lamp && lamp.textContent, seenWords: seen && seen.textContent,
    lampFill: css(lamp, 'backgroundColor'), lampEdge: css(lamp, 'borderTopColor'), lampRadius: css(lamp, 'borderTopLeftRadius'),
    actFill: css(q('#sr-card .sr-act:not(.sr-act--primary)'), 'backgroundColor'), actRadius: css(q('#sr-card .sr-act'), 'borderTopLeftRadius'),
    oneRow: !!(lamp && seen && Math.abs(lamp.getBoundingClientRect().top - seen.getBoundingClientRect().top) < 1),
    sameSize: !!(lamp && seen && Math.abs(lamp.getBoundingClientRect().width - seen.getBoundingClientRect().width) < 1.5 && Math.abs(lamp.getBoundingClientRect().height - seen.getBoundingClientRect().height) < 1),
    wide: document.documentElement.scrollWidth > innerWidth,
  });
  out.rows.rest = row();
  await shot('0-card-row', 'the card of ' + iss.name + ': the quiet row under the four actions, at rest');
  await press(lamp, 1500);
  await press(seen, 5000); // a software frame is seconds long: the pressed look needs one
  out.rows.pressed = { ...row(), lampPressed: lamp && lamp.getAttribute('aria-pressed'), seenPressed: seen && seen.getAttribute('aria-pressed'), note: (q('#sr-card .sr-card__sky + .sr-card__note') || q('#sr-card .sr-card__note:not([hidden])') || {}).textContent || null };
  await shot('0-card-row-pressed', 'both pressed: the lamp is on (its note under the row) and the tick is set');
  await press(lamp, 600);
  await press(seen, 400);
}

// --- 1. Tonight: the place controls ------------------------------------------------------------------
sr.deselect();
await sleep(800);
await press(q('[role="tab"][data-tab="tonight"]'), 6000);
await until(() => q('#sr-tonight-place'), 30000);
await full();
{
  const host = q('#sr-tonight-place');
  if (host && host.hidden) await press(q('.sr-tonight-view__change'), 800);
  const input = q('.sr-place__input');
  const mine = [...document.querySelectorAll('#sr-tonight-place button')].find((b) => b.textContent === 'Use my location');
  if (input) input.scrollIntoView({ block: 'center' });
  await sleep(600);
  const a = input && input.getBoundingClientRect();
  const b = mine && mine.getBoundingClientRect();
  out.place = {
    input: box(input), mine: box(mine),
    oneLine: !!(a && b && Math.abs((a.top + a.height / 2) - (b.top + b.height / 2)) < 1.5 && b.left >= a.right),
    sameHeight: !!(a && b && Math.abs(a.height - b.height) < 1),
    inputFill: css(input, 'backgroundColor'), mineFill: css(mine, 'backgroundColor'), inputRadius: css(input, 'borderTopLeftRadius'), mineRadius: css(mine, 'borderTopLeftRadius'),
    chipsShown: [...document.querySelectorAll('.sr-place__chips > button')].filter((n) => n.offsetParent).map((n) => n.textContent),
    wide: document.documentElement.scrollWidth > innerWidth,
    place: (q('.sr-tonight-view__place') || {}).textContent || null,
  };
  await shot('1-place', 'Tonight, Change place open: the city box and Use my location');
}

// --- 2. Follow, Ride along and Fly to it, pressed from the ground ------------------------------------
const skyState = () => ({ ground: !!(sr.skyView && sr.skyView.active), moment: sr.moment, stage: sr.stage.worldId, following: !!rig.state.following, riding: !!rig.state.riding, flying: !!rig.state.flying, toast: (q('.sr-toast') || {}).textContent || null });
const camKm = () => { const p = sr.camera.position; return Math.round(Math.hypot(p.x, p.y, p.z) * sr.stage.unitKm); };
const fromGround = async (record, action, name) => {
  if (!sr.skyView.active) { sr.setMoment('now'); await sleep(5000); }
  sr.select(record, { undo: false });
  await until(() => q(`#sr-card [data-action="${action}"]`), 20000);
  await sleep(1500);
  const before = { ...skyState(), camKm: camKm() };
  const btn = q(`#sr-card [data-action="${action}"]`);
  const disabled = !!(btn && btn.disabled);
  await press(btn, 5000);
  const after = { ...skyState(), camKm: camKm() };
  out.sky[name] = { button: !!btn, disabled, title: btn && btn.title, before, after, leftTheGround: before.ground && !after.ground, cameraMovedKm: Math.abs(after.camKm - before.camKm) };
  await shot('2-' + name, `"${btn ? btn.textContent : action}" pressed from the ground: ${after.ground ? 'still on the ground' : 'the ground is left'}`);
};
if (iss) {
  await fromGround(iss, 'follow', 'follow');
  await fromGround(iss, 'ride', 'ride');
}
{
  const jupiter = sr.recordById('jupiter');
  if (jupiter) await fromGround(jupiter, 'fly', 'fly');
}
if (sr.skyView.active) { sr.setMoment('wonder'); await sleep(2500); }

// --- 3. steadiness -------------------------------------------------------------------------------------
// A geostationary craft of our own on the stations layer (the saved files a runner has carry none):
// real SGP4, the real layer, the real brackets.
const geo = {
  id: 'probe-geo', name: 'Probe GEO', klass: 'satellite', layer: 'stations', propagator: 'sgp4', frame: 'earth-inertial', meta: { noradId: 90001 },
  omm: { OBJECT_NAME: 'PROBE GEO', OBJECT_ID: '2020-001A', EPOCH: new Date(Date.now() - 6 * 3600e3).toISOString().slice(0, 23), MEAN_MOTION: 1.00271, ECCENTRICITY: 0.0003, INCLINATION: 0.05, RA_OF_ASC_NODE: 80, ARG_OF_PERICENTER: 120, MEAN_ANOMALY: 200, EPHEMERIS_TYPE: 0, CLASSIFICATION_TYPE: 'U', NORAD_CAT_ID: 90001, ELEMENT_SET_NO: 999, REV_AT_EPOCH: 100, BSTAR: 0, MEAN_MOTION_DOT: 0, MEAN_MOTION_DDOT: 0 },
};
const stations = sr.glyphLayers.get('stations');
if (stations) stations.setRecords([...sr.recordsFor('stations'), geo]);
const f32 = (e) => Array.from(new Float32Array(e));
const mul = (e, x, y, z) => [e[0] * x + e[4] * y + e[8] * z + e[12], e[1] * x + e[5] * y + e[9] * z + e[13], e[2] * x + e[6] * y + e[10] * z + e[14]];
const angle = (a, b) => { const d = (a[0] * b[0] + a[1] * b[1] + a[2] * b[2]) / (Math.hypot(...a) * Math.hypot(...b)); const c = [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]; return Math.atan2(Math.hypot(...c) / (Math.hypot(...a) * Math.hypot(...b)), d); };
/** The drawn place of a record's dot: the layer's own answer, or (on a ref without it) the nearest instance. */
const drawnOf = (record, exact) => {
  const gl = sr.glyphLayers.get(record.layer);
  if (!gl || !gl.mesh) return null;
  if (typeof gl.selectedOffset === 'function') return gl.selectedOffset();
  const a = gl.mesh.geometry.getAttribute('iOffset');
  let best = null; let bd = Infinity;
  for (let i = 0; i < gl.mesh.geometry.instanceCount; i++) {
    const d = Math.hypot(a.array[i * 3] - exact.x, a.array[i * 3 + 1] - exact.y, a.array[i * 3 + 2] - exact.z);
    if (d < bd) { bd = d; best = [a.array[i * 3], a.array[i * 3 + 1], a.array[i * 3 + 2]]; }
  }
  return best;
};
/**
 * `frames` frames, sampled where the brackets are placed (ui/hud.js frame(), after the picture):
 * the angle at the eye between the dot as the GPU has it (float32 position, float32 view matrix)
 * and the place the brackets work from (ctx.positionOfRecord, float64), and the angle between the
 * camera's aim and that place. In arcseconds, and in pixels at this field and at a telescope's.
 */
const steady = (name, record, { frames = 36, world = null } = {}) => new Promise((resolve) => {
  const rows = [];
  const stamps = [];
  const real = sr.hud.frame;
  const done = () => {
    sr.hud.frame = real;
    const focal = (innerHeight / 2) / Math.tan((sr.camera.fov * Math.PI / 180) / 2);
    const focalScope = (innerHeight / 2) / Math.tan((1 * Math.PI / 180) / 2);
    const max = (k) => (rows.length ? Math.max(...rows.map((r) => r[k])) : null);
    const min = (k) => (rows.length ? Math.min(...rows.map((r) => r[k])) : null);
    const gaps = stamps.slice(1).map((t, i) => t - stamps[i]).sort((a, b) => a - b);
    const row = {
      frames: rows.length, frameMs: gaps.length ? Math.round(gaps[gaps.length >> 1]) : null, fovDeg: Math.round(sr.camera.fov * 100) / 100,
      stage: sr.stage.worldId, ground: !!sr.skyView.active, eyeUnits: Math.round(Math.hypot(sr.camera.position.x, sr.camera.position.y, sr.camera.position.z) * 1000) / 1000,
      rangeKm: rows.length ? Math.round(rows[rows.length - 1].rangeKm) : null,
      // the dot against the brackets
      dotOffArcsec: max('dot') === null ? null : Math.round(max('dot') * 206265 * 10) / 10,
      dotOffPx: max('dot') === null ? null : Math.round(max('dot') * focal * 100) / 100,
      dotOffPxTelescope: max('dot') === null ? null : Math.round(max('dot') * focalScope * 10) / 10,
      // the camera's aim against the thing it follows: how far off, and how much that changes
      aimOffPx: Math.round(max('aim') * focal * 100) / 100,
      aimWanderPx: Math.round((max('aim') - min('aim')) * focal * 100) / 100,
    };
    out.steady[name] = row;
    resolve(row);
  };
  sr.hud.frame = function (t) {
    const r = real.call(this, t);
    try {
      const cam = sr.camera;
      const exact = world ? sr.worlds.drawnPositionOf(world) : sr.positionOfRecord(record);
      if (exact) {
        const e = cam.matrixWorldInverse.elements;
        const ev = mul(e, exact.x, exact.y, exact.z);
        const drawn = world ? null : drawnOf(record, exact);
        const dv = drawn ? mul(f32(e), drawn[0], drawn[1], drawn[2]) : null;
        rows.push({ dot: dv ? angle(dv, ev) : 0, hasDot: !!dv, aim: angle([0, 0, -1], ev), rangeKm: Math.hypot(...ev) * sr.stage.unitKm });
        stamps.push(performance.now());
      }
    } catch (err) { look.warns.push('steady ' + name + ': ' + err); }
    if (rows.length >= frames) done();
    return r;
  };
  setTimeout(() => { if (sr.hud.frame !== real) done(); }, 120000);
});

// a. followed in space, the live clock
if (iss) {
  sr.select(iss, { fly: true, undo: false });
  await sleep(9000);
  await steady('space-low-followed', iss);
}
sr.select(geo, { fly: true, undo: false });
await sleep(9000);
await steady('space-geo-followed', geo);
await shot('3-space-geo', 'a geostationary craft followed in space (its dot, its model, the brackets)');

// b. from the ground on the Earth's stage (the Tonight tab's way in)
sr.deselect();
sr.setMoment('now');
await sleep(6000);
sr.select(geo, { undo: false });
await sleep(3000);
await steady('ground-geo-earth-stage', geo);
sr.setMoment('wonder');
await sleep(2500);

// c. from the ground, entered by "See it" on a planet's card on the Sun's stage (the Planets tab)
sr.deselect();
await stage('sun', 9000);
{
  const jupiter = sr.recordById('jupiter');
  if (jupiter) {
    sr.select(jupiter, { fly: false, undo: false });
    await until(() => q('#sr-card [data-action="see"]'), 20000);
    await sleep(1500);
    await press(q('#sr-card [data-action="see"]'), 7000);
    out.seeIt = skyState();
    sr.select(geo, { undo: false });
    await sleep(3000);
    await steady('ground-geo-after-see-it', geo);
    await shot('3-ground-after-see-it', 'the ground, entered by See it on Jupiter\'s card from the Sun\'s stage; the stage is now ' + sr.stage.worldId);
    sr.setMoment('wonder');
    await sleep(2500);
  }
}

// d. the Moon followed at an hour a second, on the Earth's stage
sr.deselect();
if (sr.stage.worldId !== 'earth') await stage('earth', 9000);
{
  const moon = sr.recordById('moon');
  if (moon) {
    sr.select(moon, { fly: true, undo: false });
    await sleep(9000);
    sr.clock.setRate(3600);
    await sleep(3000);
    await steady('space-moon-followed-3600x', moon, { world: 'moon', frames: 30 });
    sr.clock.live();
    await sleep(1500);
  }
}
sr.deselect();
return finish(out);
