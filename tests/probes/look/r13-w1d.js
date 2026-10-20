// r13-w1d: the small fixes of release 1.3.0 stage W1-d (internal spec 0077 task 4), one walk.
//
//   1. Tonight's place controls (public #579): Change place, the city box, Use my location and the
//      chips under them, with the box open. Written down: each control's height, corner and fill, so
//      the family can be read off numbers as well as the picture.
//   2. The station stop of "Where people are living in space right now" (public #580): stop 2 on
//      arrival, then held for 25 minutes of the clock (a card being read; the station goes a quarter
//      of the way round the Earth) with the trip paused. Written down: whether the line from the
//      camera to the station crosses the Earth, and the HUD tag's words ("behind Earth" or not).
//   3. A craft with a bounded path (public #493): Cassini's card with the clock in 1990 (before its
//      path), the days its path covers, "Go to nearest available date" pressed, and the card at
//      1997 (the first moment of the path).
//   4. The time tape (internal #713): the clock stepped back twice, every mark's box against the Now
//      button's box, in numbers (the gate fails on 2 px of overlap).
//
// It changes nothing in the app. It fails when a control it needs is missing, when the station is
// behind the Earth after the held 25 minutes, or when a mark's box lies under the Now button.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r13-w1d';
const out = { problems: [], tonight: {}, trip: {}, card: {}, tape: {} };
const phone = innerWidth < innerHeight;
const q = (s, root = document) => root.querySelector(s);
const textOf = (sel, cap = 200) => { const n = q(sel); return n ? n.textContent.replace(/\s+/g, ' ').trim().slice(0, cap) : null; };
const full = async () => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set('full'); await sleep(900); } };
const half = async () => { const s = sr.shell && sr.shell.sheet && sr.shell.sheet(); if (s && s.set) { s.set('half'); await sleep(900); } };
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); const cs = getComputedStyle(n); return { w: Math.round(r.width), h: Math.round(r.height), x: Math.round(r.left), y: Math.round(r.top), radius: cs.borderTopLeftRadius, fill: cs.backgroundColor, border: cs.borderTopWidth + ' ' + cs.borderTopColor, size: cs.fontSize }; };

// --- 1. Tonight's place controls ---------------------------------------------------------------------
try {
  sr.deselect();
  await sleep(800);
  { const t = q('[role="tab"][data-tab="tonight"]'); if (t) t.click(); }
  await until(() => q('#sr-tonight-place'), 60000);
  await full();
  const host = q('#sr-tonight-place');
  if (host && host.hidden) { const c = q('.sr-tonight-view__change'); if (c) { c.click(); await sleep(800); } }
  // A place set by the visitor shows the chips (Clear, Remember, Share); a guess does not.
  const DEG = Math.PI / 180;
  try { sr.setObserver({ name: 'Madrid', country: 'Spain', latDeg: 40.4, lonDeg: -3.7, latRad: 40.4 * DEG, lonRad: -3.7 * DEG, altKm: 0, source: 'city' }); } catch (e) { look.errors.push('probe: could not set a place: ' + e); }
  await sleep(1500);
  { const c0 = q('.sr-tonight-view__change'); if (c0 && c0.getAttribute('aria-expanded') !== 'true') { c0.click(); await sleep(600); } }
  const change = q('.sr-tonight-view__change');
  const input = q('.sr-place__input');
  const mine = q('.sr-place__mine');
  const chips = [...document.querySelectorAll('#sr-tonight-place .sr-chip')].filter((c) => c.offsetParent);
  if (change) change.scrollIntoView({ block: 'center' });
  await sleep(700);
  out.tonight = { change: box(change), input: box(input), mine: box(mine), chips: chips.map((c) => ({ text: c.textContent, ...box(c) })), place: textOf('.sr-tonight-view__place', 160) };
  if (!change || !input || !mine) out.problems.push('tonight: a control of the place picker is missing');
  else {
    const radii = new Set([change, input, mine, ...chips].map((n) => getComputedStyle(n).borderTopLeftRadius));
    if (radii.size !== 1) out.problems.push('tonight: the place controls do not share one corner: ' + [...radii].join(' / '));
    // Open, Change place is the selected state (the wash one step up); the box and its button share the rest.
    const fills = new Set([input, mine].map((n) => getComputedStyle(n).backgroundColor));
    if (fills.size !== 1) out.problems.push('tonight: the city box and Use my location do not share one fill: ' + [...fills].join(' / '));
    if (!chips.length) out.problems.push('tonight: no chips under a place the visitor set');
    for (const n of [change, input, mine, ...chips]) if (phone && n.getBoundingClientRect().height < 43.5) out.problems.push('tonight: ' + (n.textContent || n.placeholder) + ' is under 44 px');
    out.tonight.wide = document.documentElement.scrollWidth > innerWidth;
    if (out.tonight.wide) out.problems.push('tonight: the page scrolls sideways');
  }
  await shot('1-tonight-place', `${innerWidth} px: Tonight, Change place open, a place set: the button, the city box, Use my location and the chips as one family`, 600);
  try { sr.setObserver(null); } catch { /* none */ }
} catch (e) { look.errors.push('probe: tonight threw: ' + (e && e.stack || e)); }

// --- 2. the station stop ------------------------------------------------------------------------------
const hiddenFrom = () => {
  // The line from the camera to the trip's target against the Earth as the map draws it.
  try {
    const c = sr.worlds.drawnPositionOf('earth', sr.camera.position.clone());
    const r = sr.worlds.drawnRadiusUnits('earth');
    const cam = sr.camera.position;
    const t = rig.state.target;
    const d = { x: t.x - cam.x, y: t.y - cam.y, z: t.z - cam.z };
    const len = Math.hypot(d.x, d.y, d.z);
    d.x /= len; d.y /= len; d.z /= len;
    const o = { x: c.x - cam.x, y: c.y - cam.y, z: c.z - cam.z };
    const along = o.x * d.x + o.y * d.y + o.z * d.z;
    const off2 = o.x * o.x + o.y * o.y + o.z * o.z - along * along;
    return along > 0 && off2 < r * r && along - Math.sqrt(r * r - off2) < len;
  } catch (e) { return 'unknown: ' + e; }
};
const tagWords = () => { const t = q('#sr-hud .sr-tag:not(.is-off)'); return t ? t.textContent.replace(/\s+/g, ' ').trim().slice(0, 160) : null; };
try {
  try { sr.trip.stop('leave'); } catch { /* none */ }
  sr.deselect();
  await half();
  const plan = await sr.trip.start('people-in-space');
  if (!plan || plan.offerable === false) { out.problems.push('trip: "people-in-space" cannot run: ' + (plan && plan.reason)); }
  else {
    await until(() => sr.trip.state.phase === 'intro', 60000);
    sr.trip.jumpTo(1);
    sr.trip.play();
    const t0 = Date.now();
    const arrived = await until(() => {
      const st = sr.trip.state;
      if (st.phase === 'flight' && Date.now() - t0 > 25000 && rig.finishFlight) rig.finishFlight();
      return (st.phase === 'settle' || st.phase === 'dwell') && st.index === 1;
    }, 120000, 100);
    sr.trip.pause('probe');
    out.trip.arrived = arrived;
    out.trip.arrivedHidden = hiddenFrom();
    out.trip.arrivedTag = tagWords();
    out.trip.arrivedCard = textOf('#sr-card', 240);
    out.trip.distanceKm = Math.round(rig.state.distance * sr.stage.unitKm);
    await shot('2-trip-iss-arrived', `${innerWidth} px: stop 2, the station, on arrival (hidden by the Earth: ${out.trip.arrivedHidden}; tag: ${out.trip.arrivedTag})`, 2500);
    if (!arrived) out.problems.push('trip: stop 2 never arrived');
    // Held 25 minutes of the clock: the station goes a quarter of the way round the planet.
    const az0 = rig.state.azimuth;
    sr.clock.goTo(sr.clock.now() + 25 * 60e3);
    await sleep(6000);
    out.trip.heldHidden = hiddenFrom();
    out.trip.heldTag = tagWords();
    out.trip.turnedDeg = Math.round(Math.abs((((rig.state.azimuth - az0) % (2 * Math.PI)) + 3 * Math.PI) % (2 * Math.PI) - Math.PI) * 1800 / Math.PI) / 10;
    out.trip.distanceHeldKm = Math.round(rig.state.distance * sr.stage.unitKm);
    await shot('3-trip-iss-held', `${innerWidth} px: the same stop 25 minutes of the clock later, trip paused (hidden by the Earth: ${out.trip.heldHidden}; tag: ${out.trip.heldTag}; the camera turned ${out.trip.turnedDeg} degrees)`, 1500);
    if (out.trip.heldHidden === true) out.problems.push('trip: after 25 held minutes the station is behind the Earth');
    if (out.trip.arrivedHidden === true) out.problems.push('trip: on arrival the station is behind the Earth');
    if (/behind/i.test(out.trip.heldTag || '')) out.problems.push('trip: the tag says the station is behind the Earth after 25 held minutes');
    if (Math.abs(out.trip.distanceHeldKm - out.trip.distanceKm) > 5) out.problems.push('trip: the correction changed the distance (' + out.trip.distanceKm + ' to ' + out.trip.distanceHeldKm + ' km)');
  }
  try { sr.trip.stop('leave'); } catch { /* none */ }
  await sleep(2500);
  try { sr.clock.live(); } catch { /* none */ }
} catch (e) { look.errors.push('probe: the trip threw: ' + (e && e.stack || e)); }

// --- 3. a craft with a bounded path -------------------------------------------------------------------
try {
  sr.deselect();
  await sleep(500);
  const cassini = sr.recordById('deep-cassini');
  if (!cassini) { look.missing.push('deep-cassini'); out.problems.push('card: Cassini is not on the map'); }
  else {
    sr.clock.goTo(Date.parse('1990-01-01T00:00:00Z'));
    sr.select(cassini, { fly: false, undo: false });
    await until(() => q('#sr-card .sr-mission__span'), 60000);
    await full();
    const mission = q('#sr-card .sr-card__mission');
    if (mission) mission.scrollIntoView({ block: 'center' });
    await sleep(900);
    out.card.before = { top: textOf('#sr-card .sr-card__ended', 200), rows: textOf('#sr-card .sr-card__rows', 200), spans: [...document.querySelectorAll('#sr-card .sr-mission__span')].map((n) => n.textContent), button: box(q('#sr-card [data-focus="mission-nearest"]')), fly: (q('#sr-card [data-action="fly"]') || {}).title };
    await shot('4-card-before-path', `${innerWidth} px: Cassini's card with the clock in 1990: ${out.card.before.top}`, 600);
    const go = q('#sr-card [data-focus="mission-nearest"]');
    if (!go) out.problems.push('card: no "Go to nearest available date" before the path');
    else {
      if (phone && go.getBoundingClientRect().height < 43.5) out.problems.push('card: the nearest-date button is under 44 px');
      go.click();
      await sleep(2500);
      out.card.nowAt = new Date(sr.clock.now()).toISOString();
      out.card.afterSpans = [...document.querySelectorAll('#sr-card .sr-mission__span')].map((n) => n.textContent);
      out.card.stillButton = !!q('#sr-card [data-focus="mission-nearest"]');
      if (Math.abs(sr.clock.now() - Date.parse('1997-10-15T09:27:00Z')) > 1000) out.problems.push('card: the clock went to ' + out.card.nowAt + ', not the first moment of the path');
      const m2 = q('#sr-card .sr-card__mission');
      if (m2) m2.scrollIntoView({ block: 'center' });
      await shot('5-card-nearest', `${innerWidth} px: Cassini's card after "Go to nearest available date": the clock at ${out.card.nowAt}`, 800);
    }
    sr.clock.goTo(Date.parse('2026-10-15T12:00:00Z'));
    await sleep(2000);
    out.card.after = { top: textOf('#sr-card .sr-card__ended', 200), spans: [...document.querySelectorAll('#sr-card .sr-mission__span')].map((n) => n.textContent) };
    try { sr.clock.live(); } catch { /* none */ }
    sr.deselect();
  }
} catch (e) { look.errors.push('probe: the card threw: ' + (e && e.stack || e)); }

// --- 4. the time tape ---------------------------------------------------------------------------------
try {
  await sleep(1000);
  const back = q('.sr-time__step');
  if (back && back.offsetParent) { back.click(); back.click(); await sleep(1200); }
  const now = q('.sr-tape__now');
  const marks = [...document.querySelectorAll('.sr-tape__mark')].filter((m) => m.offsetParent);
  const nb = now && !now.hidden && now.offsetParent ? now.getBoundingClientRect() : null;
  out.tape = { now: nb && { x: Math.round(nb.left), w: Math.round(nb.width) }, marks: marks.length, overlaps: [] };
  if (nb) for (const m of marks) {
    const r = m.getBoundingClientRect();
    const w = Math.min(r.right, nb.right) - Math.max(r.left, nb.left);
    if (w > 0.5) out.tape.overlaps.push({ mark: m.getAttribute('aria-label'), px: Math.round(w * 10) / 10 });
  }
  if (out.tape.overlaps.length) out.problems.push('tape: ' + out.tape.overlaps.length + ' mark(s) lie under the Now button');
  const live = [...document.querySelectorAll('.sr-time__live, .sr-time button')].find((b) => b.offsetParent && /live/i.test(b.textContent || ''));
  if (live) live.click();
} catch (e) { look.errors.push('probe: the tape threw: ' + (e && e.stack || e)); }

if (out.problems.length) out.fail = out.problems.join(' | ');
return finish(out);
