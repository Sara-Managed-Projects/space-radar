// tests/probes/track1.js -- the looks of the two tracking issues (internal #546 trips and autopilot,
// #548 worlds, air and weather), 2026-10-09. For tools/cdp.mjs with `--gl=gpu`.
//
// SEVERAL APPS IN ONE CHROME. The browser rule is one Chrome at a time and ten runs a package, and a
// walk of 205 trip stops is half an hour of flights. So the page is `/robots.txt?probe=<mode>` and
// the app runs in two or three iframes side by side (the window is 2880 or 4320 px wide, each frame
// 1440 x 900); every frame has its own job, a screenshot is of the whole page and is named
// `f<frame>-<name>.png`, and tests/probes/track1_sheet.py cuts each to its own frame.
//
//   walk     '/robots.txt?probe=walk&run=0|1'  --width=4320 --height=900   every trip, every stop
//   worlds   '/robots.txt?probe=worlds'        --width=4320 --height=900   look-w/b, look-a, and extras
//            (the run line pastes `const SRC = {...}` with the look probes' text in front of this file)
//   ambient  '/robots.txt?probe=ambient'       --width=2880 --height=900   two reels, online
//   flight   '/robots.txt?probe=flight'        --width=1440 --height=900   the roof trip, timed frames
//   phone    '/robots.txt?probe=phone' --mobile --width=390 --height=844   a reel at real speed, an overlay at peek
//   relook   '/robots.txt?probe=relook&stops=trip:n,trip:n,...'  --width=4320   named stops again
return (async () => {
  const q = new URLSearchParams(location.search);
  const mode = q.get('probe') || 'walk';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const T0 = Date.now();
  // The run is killed 540 s after Chrome was started and a killed run prints nothing: every job
  // stops by CAP, and `finish` returns what there is a little after it whatever a job is doing.
  const CAP = T0 + Number(q.get('cap') || 370) * 1000;
  const out = { mode, frames: [], errors: [] };
  const live = [];
  const finish = (jobs) => Promise.race([Promise.all(jobs), new Promise((r) => setTimeout(r, CAP - Date.now() + 25000))]).then(() => {
    for (const h of live) if (!out.frames.some((f) => f.frame === h.i)) out.frames.push({ frame: h.i, cut: true, shots: h.shots, errors: h.errors, ...h.res });
    out.s = Math.round((Date.now() - T0) / 1000);
    return out;
  });
  const until = async (fn, ms, step = 150) => {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); }
    return null;
  };
  // One screenshot at a time: two frames asking at once would share a token queue, not a picture.
  let chain = Promise.resolve();
  const shotTop = (name) => { chain = chain.then(() => (window.cdpShot ? window.cdpShot(name) : null)).catch(() => {}); return chain; };
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const DEG = Math.PI / 180;
  const V = (x, y, z) => ({ x, y, z });
  const norm = (a) => { const l = Math.hypot(a.x, a.y, a.z) || 1; return V(a.x / l, a.y / l, a.z / l); };
  const cross = (a, b) => V(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
  const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
  const mix = (a, ka, b, kb) => V(a.x * ka + b.x * kb, a.y * ka + b.y * kb, a.z * ka + b.z * kb);

  // `self=1`: the app is the page itself and there are no frames. A PHONE NEEDS IT: /robots.txt has
  // no viewport meta, so under --mobile it is laid out 980 px wide and an app framed in it is not on
  // a phone at all (the first phone run, 2026-10-09: innerWidth 980 where 390 was asked).
  const SELF = q.has('self');
  await until(() => document.body, 10000);
  if (!SELF) {
    document.body.textContent = '';
    document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
  }

  /** An app in frame `i` of `n`, and the helpers a job needs, all on that frame's window. */
  async function open(i, n, hash = '', query = 'sw=0') {
    let f = null;
    if (!SELF) {
      f = document.createElement('iframe');
      f.style.cssText = `position:fixed;top:0;left:${(i * 100) / n}vw;width:${100 / n}vw;height:100vh;border:0;background:#000`;
      f.src = new URL(`./?${query}${hash ? '#' + hash : ''}`, location.href).href;
      document.body.appendChild(f);
    }
    const w = () => (f ? f.contentWindow : window);
    await until(() => w().__srLayersReady && w().spaceRadar, 90000, 300);
    const h = { i, w, frame: f, shots: [], errors: [], res: {} };
    live.push(h);
    Object.defineProperty(h, 'ctx', { get: () => w().spaceRadar });
    if (!h.ctx) { h.errors.push('the app never came up'); return h; }
    w().addEventListener('error', (e) => h.errors.push(String(e.message).slice(0, 160)));
    h.visible = (sel) => [...w().document.querySelectorAll(sel)].filter((el) => {
      const cs = w().getComputedStyle(el); const r = el.getBoundingClientRect();
      return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
    });
    h.closeHelp = () => {
      for (const el of w().document.querySelectorAll('section, aside, div[role="dialog"], div')) {
        if (el.children.length > 12 || !/^\s*controls/i.test(el.textContent || '')) continue;
        const b = el.querySelector('button[aria-label*="lose"], button');
        if (b) { b.click(); return true; }
      }
      return false;
    };
    h.shot = async (name, settle = 1200) => { await sleep(settle); h.closeHelp(); await sleep(120); await shotTop(`f${i}-${name}`); h.shots.push(name); };
    if (f) w().cdpShot = (name) => shotTop(`f${i}-${name}`);
    h.km = () => { try { return Math.round(h.ctx.cameraRig.state.distance * ((h.ctx.stage || {}).unitKm || 1)); } catch { return null; } };
    h.goTo = async (id, capMs = 22000) => {
      const ctx = h.ctx; const rec = ctx.recordById(id);
      if (!rec) { h.errors.push(`no record ${id}`); return null; }
      ctx.select(rec, { fly: true });
      const f0 = Date.now(); await sleep(2500);
      while ((ctx.cameraRig.state.flying || (ctx.worlds.meshFor(id) && ctx.worlds.hasMap && !ctx.worlds.hasMap(id))) && Date.now() - f0 < capMs) await sleep(400);
      await sleep(1500);
      return rec;
    };
    h.poleOf = (id) => { const m = h.ctx.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return norm(V(e[4], e[5], e[6])); };
    h.standAt = (id, phaseDeg, upDeg = 0, k = 1) => {
      const ctx = h.ctx; const mesh = ctx.worlds.meshFor(id);
      const sun = norm(mesh.material.uniforms.uSunDir.value);
      const pole = h.poleOf(id);
      const side = norm(cross(pole, sun));
      let dir = mix(sun, Math.cos(phaseDeg * DEG), side, Math.sin(phaseDeg * DEG));
      dir = norm(mix(dir, 1, pole, -dot(dir, pole)));
      const lit = dot(sun, pole) >= 0 ? 1 : -1;
      dir = norm(mix(dir, Math.cos(upDeg * DEG), pole, lit * Math.sin(upDeg * DEG)));
      ctx.cameraRig.flyTo({ offset: dir, distance: ctx.cameraRig.state.distance * k, ms: 0 });
      return dir;
    };
    /** A point of a world's surface as a scene direction from its centre. */
    h.surfaceDir = (id, latDeg, lonDeg) => {
      const m = h.ctx.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements;
      const cl = Math.cos(latDeg * DEG);
      const l = V(cl * Math.cos(lonDeg * DEG), Math.sin(latDeg * DEG), -cl * Math.sin(lonDeg * DEG));
      return { dir: norm(V(e[0] * l.x + e[4] * l.y + e[8] * l.z, e[1] * l.x + e[5] * l.y + e[9] * l.z, e[2] * l.x + e[6] * l.y + e[10] * l.z)), scale: Math.hypot(e[0], e[1], e[2]) };
    };
    h.over = (id, latDeg, lonDeg, k) => { const s = h.surfaceDir(id, latDeg, lonDeg); h.ctx.cameraRig.flyTo({ offset: s.dir, distance: s.scale * k, ms: 0 }); return s; };
    h.sunUp = (id, latDeg, lonDeg) => dot(h.surfaceDir(id, latDeg, lonDeg).dir, norm(h.ctx.worlds.meshFor(id).material.uniforms.uSunDir.value));
    return h;
  }
  const done = (h, extra) => out.frames.push({ frame: h.i, shots: h.shots, errors: h.errors, ...extra });

  // ------------------------------------------------------------------------------------------ walk
  const TRIPS = [['people-in-space', 4], ['journey-to-the-station', 4], ['strangest-things', 6], ['to-the-edge', 8], ['roof-to-the-edge', 10], ['travel-to-exoplanets', 11], ['moon-landings', 10], ['outer-solar-system', 10], ['a-year-in-a-minute', 4], ['chasing-the-solar-eclipse', 5], ['the-constellations', 12], ['the-living-earth', 12], ['tonight-from-your-street', 7], ['moon-phases', 7], ['the-sun-today', 7], ['planets-tonight', 9], ['mars-where-we-have-driven', 10], ['life-of-a-star', 9], ['black-holes', 6], ['through-a-telescope', 9], ['a-dark-sky', 7], ['asteroids-that-come-close', 8], ['satellites-and-junk', 8], ['comets-and-meteors', 8], ['birth-of-the-solar-system', 9], ['back-to-the-moon', 5]];
  const PLACE = { name: 'Lisbon', latDeg: 38.72, lonDeg: -9.14, latRad: 38.72 * DEG, lonRad: -9.14 * DEG, altKm: 0, source: 'manual' };
  /** Walk `list` = [[tripId, [stop indices] | null]]: every stop arrived, one frame each, and what the page says there. */
  async function walk(h, list, settle = 1800) {
    const rows = [];
    h.res.rows = rows;
    const ctx = h.ctx;
    try { ctx.setObserver(PLACE); } catch (e) { h.errors.push('observer: ' + e.message); }
    if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
    for (const [id, only] of list) {
      if (Date.now() > CAP) { rows.push({ trip: id, cut: 'not started' }); continue; }
      try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
      await sleep(400);
      const t0 = Date.now();
      const plan = await ctx.trip.start(id);
      if (!plan || plan.offerable === false) { rows.push({ trip: id, error: (plan && plan.reason) || 'no plan' }); continue; }
      await until(() => ctx.trip.state.phase === 'intro', 20000);
      rows.push({ trip: id, count: plan.count, dropped: (plan.dropped || []).map((d) => d.id), intro_ms: Date.now() - t0 });
      const stops = only || [...Array(plan.count).keys()];
      let first = true;
      for (const n of stops) {
        if (Date.now() > CAP) { rows.push({ trip: id, cut: n }); break; }
        if (first) { if (n > 0) ctx.trip.jumpTo(n); ctx.trip.play(); first = false; } else ctx.trip.jumpTo(n);
        const st = ctx.trip.state;
        const t1 = Date.now();
        const ok = await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 40000, 100);
        const name = `${id}--${String(n + 1).padStart(2, '0')}-${ctx.trip.state.stopId || 'x'}`;
        await h.shot(name, settle);
        // A screenshot waits its turn behind the other frames', and a short stop can be over by then
        // (seen in the first run: the first stop of each frame's first trip was a picture of its second).
        let again = 0;
        while (ctx.trip.state.index !== n && again < 2) {
          again += 1;
          ctx.trip.jumpTo(n);
          await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 40000, 100);
          await h.shot(name, 900);
        }
        const labels = h.visible('#labels .label').map(text).filter(Boolean);
        // A stop that was held ("We could not find this one just now"): what the page knows of its subject.
        let held = null;
        if (ctx.trip.state.phase === 'held' || ctx.trip.state.held) {
          held = { state: ctx.trip.state.held || null };
          for (const rid of (q.get('debug') || 'exo-proxima-cen-b').split(',')) {
            try {
              const rec = ctx.recordById(rid);
              const pos = rec ? ctx.positionOfRecord(rec) : null;
              held[rid] = rec ? { layer: rec.layer, frame: rec.frame, propagator: rec.propagator, keys: Object.keys(rec).slice(0, 24), pos: pos ? [pos.x, pos.y, pos.z].map((v) => Number(v.toPrecision(4))) : null, layerOn: ctx.isLayerOn(rec.layer), drawable: ctx.isLayerDrawable ? ctx.isLayerDrawable(rec.layer) : null, n: ctx.recordsFor(rec.layer).length } : { missing: true, exoplanets: ctx.recordsFor('exoplanets').length, like: ctx.records().filter((r) => /proxima/i.test(r.id)).map((r) => r.id).slice(0, 6) };
            } catch (e) { held[rid] = { error: String(e && e.message) }; }
          }
        }
        rows.push({
          trip: id, n: n + 1, id: ctx.trip.state.stopId, ok: !!ok && ctx.trip.state.index === n, again, fly_ms: Date.now() - t1 - settle, phase: st.phase,
          caption: text(h.w().document.querySelector('.sr-tripsheet')).slice(0, 520),
          labels: labels.length, names: labels.slice(0, 10), clock: new Date(ctx.clock.now()).toISOString().slice(0, 16),
          stage: (ctx.stage || {}).worldId || (ctx.stage || {}).id || null, km: h.km(), ...(held ? { held } : {}),
        });
      }
    }
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
    return rows;
  }
  if (mode === 'walk') {
    const N = 3;
    const buckets = [...Array(2 * N)].map(() => ({ sum: 0, list: [] }));
    for (const [id, c] of [...TRIPS].sort((a, b) => b[1] - a[1])) { const b = buckets.reduce((m, x) => (x.sum < m.sum ? x : m)); b.sum += c; b.list.push([id, null]); }
    const run = Number(q.get('run') || 0);
    return finish([...Array(N).keys()].map(async (i) => {
      const h = await open(i, N);
      const rows = h.ctx ? await walk(h, buckets[run * N + i].list) : [];
      done(h, { rows });
    }));
  }
  /** A trip's last stop left to end by itself: the flight home (`return: true`), then the end card. */
  async function homeOf(h, id) {
    const ctx = h.ctx; const row = { trip: id };
    h.res.home = h.res.home || []; h.res.home.push(row);
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
    await sleep(500);
    const plan = await ctx.trip.start(id);
    if (!plan || plan.offerable === false) { row.error = (plan && plan.reason) || 'no plan'; return; }
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    ctx.trip.jumpTo(plan.count - 1); ctx.trip.play();
    await until(() => ctx.trip.state.phase === 'dwell' && ctx.trip.state.index === plan.count - 1, 60000, 100);
    row.lastStop = ctx.trip.state.stopId; row.lastKm = h.km(); row.lastStage = (ctx.stage || {}).worldId;
    const t0 = Date.now();
    const began = await until(() => ctx.trip.state.returning === true || ctx.trip.state.phase === 'outro', Math.max(1000, Math.min(150000, CAP - Date.now())), 50);
    row.dwell_ms = Date.now() - t0; row.returning = ctx.trip.state.returning === true; row.shots = [];
    if (!began) { row.error = 'the last stop never ended'; return; }
    const t1 = Date.now();
    for (const at of [1500, 6000, 11000]) {
      await sleep(Math.max(0, at - (Date.now() - t1)));
      if (!ctx.trip.state.returning) break;
      await h.shot(`home-${id}-${row.shots.length + 1}`, 0);
      row.shots.push({ at_ms: Date.now() - t1, stage: (ctx.stage || {}).worldId, km: h.km(), sheet: h.visible('.sr-tripsheet').length });
    }
    await until(() => ctx.trip.state.phase === 'outro', 45000, 50);
    row.flight_ms = Date.now() - t1;
    await sleep(900);
    row.end = { phase: ctx.trip.state.phase, stage: (ctx.stage || {}).worldId, km: h.km(), card: text(h.w().document.querySelector('.sr-tripsheet')).slice(0, 220) };
    await h.shot(`home-${id}-end`, 200);
    try { ctx.trip.stop('leave'); } catch { /* gone */ }
  }
  /** A storm on the night side, arrived at (internal #432): the clock is moved by whole hours until one is in the dark. */
  async function stormNight(h) {
    const ctx = h.ctx; const res = h.res;
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
    ctx.clock.goTo(Date.now()); ctx.clock.setRate(1);
    await h.goTo('earth');
    try { ctx.setLayerOn('storms', true); } catch { /* on already */ }
    const list = () => { const a = ctx.recordsFor('storms'); return a.length ? a : ctx.records().filter((r) => r.klass === 'storm' || r.layer === 'storms'); };
    await until(() => list().length > 0, 25000, 500);
    res.storms = list().map((r) => ({ id: r.id, name: r.name, layer: r.layer }));
    if (!res.storms.length) return;
    const c = () => { const m = ctx.worlds.meshFor('earth'); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return V(e[12], e[13], e[14]); };
    const up = (r) => { const p = ctx.positionOfRecord(r); const o = c(); return dot(norm(V(p.x - o.x, p.y - o.y, p.z - o.z)), norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value)); };
    const t = ctx.clock.now(); let pick = null;
    for (let k = 0; k < 13 && !pick; k++) {
      ctx.clock.goTo(t + k * 3600000); await sleep(450);
      const dark = list().find((r) => { try { return up(r) < -0.25; } catch { return false; } });
      if (dark) pick = { rec: dark, k, up: Math.round(up(dark) * 100) / 100 };
    }
    res.stormNight = pick ? { id: pick.rec.id, name: pick.rec.name, hoursAhead: pick.k, sunUp: pick.up } : { none: 'no storm in the dark within 12 hours' };
    if (!pick) return;
    ctx.select(pick.rec, { fly: true }); await sleep(9000);
    res.stormNight.km = h.km();
    res.stormNight.card = text(h.w().document.querySelector('.sr-card')).slice(0, 260);
    await h.shot('storm-night-arrival', 2500);
    ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 3, ms: 0 });
    await h.shot('storm-night-wider', 2000);
    ctx.clock.goTo(Date.now());
  }
  /** Iapetus close up, its equator across the frame, with its axis against its orbit's normal. */
  async function iapetusLook(h) {
    const ctx = h.ctx; const res = h.res;
    try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
    ctx.clock.goTo(Date.now()); ctx.clock.setRate(1);
    if (!(await h.goTo('iapetus'))) return;
    const posOf = (id) => { const m = ctx.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return V(e[12], e[13], e[14]); };
    const rel = () => { const a = posOf('iapetus'); const b = posOf('saturn'); return V(a.x - b.x, a.y - b.y, a.z - b.z); };
    const t = ctx.clock.now();
    const r1 = rel(); ctx.clock.goTo(t + 5 * 86400000); await sleep(900);
    const r2 = rel(); ctx.clock.goTo(t); await sleep(900);
    const sat = h.poleOf('saturn'); const pole = h.poleOf('iapetus');
    let nrm = norm(cross(r1, r2)); if (dot(nrm, sat) < 0) nrm = V(-nrm.x, -nrm.y, -nrm.z);
    const ang = (a, b) => Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / DEG * 10) / 10;
    res.iapetus = { stage: (ctx.stage || {}).worldId, poleToSaturnPole_deg: ang(pole, sat), poleToOrbitNormal_deg: ang(pole, nrm), orbitNormalToSaturnPole_deg: ang(nrm, sat) };
    h.standAt('iapetus', 35, 0, 0.55); await h.shot('iapetus-equator-on-after', 2500);
  }
  if (mode === 'relook') {
    // `stops=trip:3,trip:4;trip2:1` -- frames are separated by `;`, stops are 1-based.
    const groups = (q.get('stops') || '').split(';');
    return finish(groups.map(async (g, i) => {
      // `reel!<trip>`: that frame is a reel of one trip, with the renderer's geometries written down.
      if (g.startsWith('reel!')) { await leakJob(i, groups.length, g.slice(5)); return; }
      const by = new Map();
      // `present!trip:n,...`: that frame in present mode (the caption across the foot of the scene).
      const present = g.startsWith('present!');
      if (present) g = g.slice(8);
      for (const s of g.split(',').filter(Boolean)) { const [id, n] = s.split(':'); if (!by.has(id)) by.set(id, []); by.get(id).push(Number(n) - 1); }
      const h = await open(i, groups.length, present ? 'present=1' : '');
      // `home=a,b;c` (frames by `;`, as `stops`): after the stops, those trips' flights home.
      const homes = ((q.get('home') || '').split(';')[i] || '').split(',').filter(Boolean);
      const rows = h.ctx && by.size ? await walk(h, [...by.entries()], Number(q.get('settle') || 2500)) : [];
      if (h.ctx && homes.length) { try { h.ctx.setObserver(PLACE); } catch { /* no place */ } for (const id of homes) { if (Date.now() < CAP - 60000) await homeOf(h, id); } }
      // `extra=storm,iapetus;...` (frames by `;`): the looks that are not trip stops.
      const extra = ((q.get('extra') || '').split(';')[i] || '').split(',').filter(Boolean);
      if (h.ctx && extra.includes('iapetus')) { try { await iapetusLook(h); } catch (e) { h.errors.push('iapetus: ' + e.message); } }
      if (h.ctx && extra.includes('storm')) { try { await stormNight(h); } catch (e) { h.errors.push('storm: ' + e.message); } }
      done(h, { rows, ...h.res });
    }));
  }

  // ---------------------------------------------------------------------------------------- worlds
  if (mode === 'worlds') {
    const src = typeof SRC === 'undefined' ? {} : SRC;   // eslint-disable-line no-undef
    const inFrame = async (h, code) => {
      const W = h.w();
      try { return await new W.Function(`return (async () => {\n${code}\n})();`)(); } catch (e) { h.errors.push('look probe: ' + String(e && e.message)); return null; }
    };
    const jobs = [];
    // Frame 0: Saturn, Neptune, Venus, Mercury, then deep space (look-w.js + look-b.js as they are).
    jobs.push((async () => { const h = await open(0, 3); const look = h.ctx && src.wb ? await inFrame(h, src.wb) : null; done(h, { look }); })());
    // Frame 1: the eclipse, the Moon's horizon, the Earth's limb (look-a.js), then Iapetus and Mars by night.
    jobs.push((async () => {
      const h = await open(1, 3);
      const ctx = h.ctx; const res = h.res;
      if (!ctx) { done(h, {}); return; }
      res.look = src.a ? await inFrame(h, src.a) : null;
      try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
      ctx.clock.goTo(Date.now()); ctx.clock.setRate(1);
      // Iapetus close up: its own pole against Saturn's and against its orbit's normal (a day apart).
      try {
        if (await h.goTo('iapetus')) {
          await h.shot('iapetus-arrival');
          const pole = h.poleOf('iapetus'); const sat = h.poleOf('saturn');
          const posOf = (id) => { const m = ctx.worlds.meshFor(id); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return V(e[12], e[13], e[14]); };
          const rel = () => { const a = posOf('iapetus'); const b = posOf('saturn'); return V(a.x - b.x, a.y - b.y, a.z - b.z); };
          const t = ctx.clock.now();
          const r1 = rel(); ctx.clock.goTo(t + 5 * 86400000); await sleep(600);
          const r2 = rel(); ctx.clock.goTo(t); await sleep(600);
          let nrm = norm(cross(r1, r2)); if (dot(nrm, sat) < 0) nrm = V(-nrm.x, -nrm.y, -nrm.z);
          const ang = (a, b) => Math.round(Math.acos(Math.max(-1, Math.min(1, dot(a, b)))) / DEG * 10) / 10;
          res.iapetus = { poleToSaturnPole_deg: ang(pole, sat), poleToOrbitNormal_deg: ang(pole, nrm), orbitNormalToSaturnPole_deg: ang(nrm, sat) };
          h.standAt('iapetus', 35, 0, 0.55); await h.shot('iapetus-equator-on', 2500);
          h.standAt('iapetus', 80, 0, 1); await h.shot('iapetus-ridge-side', 2000);
        }
      } catch (e) { h.errors.push('iapetus: ' + e.message); }
      // Mars by night, close in at a site: the lander's mark.
      try {
        const sites = [...ctx.recordsFor('hand-kept-sites'), ...ctx.recordsFor('ground-sites')];
        const site = sites.find((r) => /viking 1/i.test(r.name || '')) || sites.find((r) => /curiosity|perseverance/i.test(r.name || ''));
        res.marsSite = site ? { id: site.id, name: site.name } : null;
        if (site) {
          const mars = () => { const m = ctx.worlds.meshFor('mars'); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return V(e[12], e[13], e[14]); };
          const up = () => { const p = ctx.positionOfRecord(site); const c = mars(); const sun = norm(ctx.worlds.meshFor('mars').material.uniforms.uSunDir.value); return dot(norm(V(p.x - c.x, p.y - c.y, p.z - c.z)), sun); };
          ctx.select(site, { fly: true }); await sleep(9000);
          const t = ctx.clock.now(); let day = null; let night = null;
          for (let k = 0; k < 26 && (day === null || night === null); k++) {
            ctx.clock.goTo(t + k * 3600000); await sleep(350);
            const u = up();
            if (u > 0.5 && day === null) day = k; if (u < -0.4 && night === null) night = k;
          }
          res.marsSite.hours = { day, night };
          if (day !== null) { ctx.clock.goTo(t + day * 3600000); await sleep(500); ctx.select(site, { fly: true }); await sleep(7000); res.marsSite.dayKm = h.km(); await h.shot('mars-site-day', 2500); }
          if (night !== null) { ctx.clock.goTo(t + night * 3600000); await sleep(500); ctx.select(site, { fly: true }); await sleep(7000); res.marsSite.sunUp = Math.round(up() * 100) / 100; await h.shot('mars-site-night', 2500); }
          ctx.clock.goTo(Date.now());
        }
      } catch (e) { h.errors.push('mars site: ' + e.message); }
      done(h, res);
    })());
    // Frame 2: the aurora's southern oval by night, a storm on the night side, the Sun's grain.
    jobs.push((async () => {
      const h = await open(2, 3);
      const ctx = h.ctx; const res = h.res;
      if (!ctx) { done(h, {}); return; }
      try { const gl = ctx.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); res.gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; } catch { /* no name */ }
      if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
      ctx.renderMode = ctx.renderMode || { probe: 'track1' };
      ctx.clock.goTo(Date.now()); ctx.clock.setRate(1);
      try {
        ctx.setLayerOn('aurora', true);
        await h.goTo('earth');
        await until(() => ctx.aurora && ctx.aurora.state && ctx.aurora.state().phase === 'live', 40000, 500);
        const a = ctx.aurora.state();
        res.aurora = { phase: a.phase, mode: a.mode, visible: a.visible, reason: a.reason, summary: a.summary, line: ctx.aurora.line(ctx.clock.now()), kp: typeof ctx.spaceWeatherLine === 'function' ? ctx.spaceWeatherLine() : null };
        // Local midnight's meridian now, and the southern oval on it.
        const d = new Date(ctx.clock.now()); const utc = d.getUTCHours() + d.getUTCMinutes() / 60;
        const midnightLon = ((((0 - utc) * 15) + 540) % 360) - 180;
        res.aurora.midnightLon = Math.round(midnightLon);
        res.aurora.sunAt = { s65: Math.round(h.sunUp('earth', -65, midnightLon) * 100) / 100, s75: Math.round(h.sunUp('earth', -75, midnightLon) * 100) / 100 };
        h.over('earth', -58, midnightLon, 2.6); await h.shot('aurora-south-night', 3500);
        h.over('earth', -45, midnightLon, 1.45); await h.shot('aurora-south-night-close', 3000);
        res.aurora.after = { visible: ctx.aurora.state().visible, steps: ctx.aurora.state().steps, folds: ctx.aurora.state().folds };
        h.over('earth', -28, midnightLon, 1.09); await h.shot('aurora-south-limb-low', 3000);
        h.over('earth', 62, midnightLon, 2.6); await h.shot('aurora-north-night', 3000);
      } catch (e) { h.errors.push('aurora: ' + e.message); }
      // A storm on the night side: an arrival.
      try {
        ctx.setLayerOn('storms', true); await sleep(2500);
        const storms = ctx.recordsFor('storms');
        res.storms = storms.map((r) => ({ id: r.id, name: r.name }));
        const c = () => { const m = ctx.worlds.meshFor('earth'); m.updateMatrixWorld(); const e = m.matrixWorld.elements; return V(e[12], e[13], e[14]); };
        const up = (r) => { const p = ctx.positionOfRecord(r); const o = c(); return dot(norm(V(p.x - o.x, p.y - o.y, p.z - o.z)), norm(ctx.worlds.meshFor('earth').material.uniforms.uSunDir.value)); };
        if (storms.length) {
          const t = ctx.clock.now(); let pick = null;
          for (let k = 0; k < 13 && !pick; k++) {
            ctx.clock.goTo(t + k * 3600000); await sleep(400);
            const now = ctx.recordsFor('storms');
            const dark = now.find((r) => { try { return up(r) < -0.25; } catch { return false; } });
            if (dark) pick = { rec: dark, k, up: Math.round(up(dark) * 100) / 100 };
          }
          res.stormNight = pick ? { id: pick.rec.id, name: pick.rec.name, hoursAhead: pick.k, sunUp: pick.up } : null;
          if (pick) {
            ctx.select(pick.rec, { fly: true }); await sleep(9000);
            res.stormNight.km = h.km();
            res.stormNight.card = text(h.w().document.querySelector('.sr-card, [class*="card"]')).slice(0, 200);
            await h.shot('storm-night-arrival', 2500);
          }
          ctx.clock.goTo(Date.now());
        }
      } catch (e) { h.errors.push('storm: ' + e.message); }
      // The Sun's grain: the same frame drawn with it and without, timed on this GPU (gl.finish by a one-pixel read).
      try {
        ctx.deselect && ctx.deselect();
        await h.goTo('sun'); await sleep(1500);
        ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.6, ms: 0 }); await sleep(2500);
        let mat = null;
        ctx.scene.traverse((o) => { if (!mat && o.material && o.material.uniforms && o.material.uniforms.uGrain) mat = o.material; });
        if (mat) {
          const gl = ctx.renderer.getContext(); const px = new Uint8Array(4);
          const time = (g, n = 40) => { mat.uniforms.uGrain.value = g; const t = performance.now(); for (let k = 0; k < n; k++) { ctx.renderer.render(ctx.scene, ctx.camera); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); } return (performance.now() - t) / n; };
          const live = mat.uniforms.uGrain.value;
          const on = []; const off = [];
          time(1, 5); time(0, 5);
          for (let r = 0; r < 7; r++) { on.push(time(1)); off.push(time(0)); }
          const med = (a) => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)];
          res.sunGrain = { liveGrain: Math.round(live * 100) / 100, on_ms: Math.round(med(on) * 100) / 100, off_ms: Math.round(med(off) * 100) / 100, cost_ms: Math.round((med(on) - med(off)) * 100) / 100, rounds: 7, framesEach: 40, size: [ctx.renderer.domElement.width, ctx.renderer.domElement.height], tier: ctx.quality && ctx.quality.tier };
          mat.uniforms.uGrain.value = live;
          await h.shot('sun-grain-close', 1500);
        } else h.errors.push('no grain uniform found');
      } catch (e) { h.errors.push('sun: ' + e.message); }
      done(h, res);
    })());
    return finish(jobs);
  }

  // --------------------------------------------------------------------------------------- ambient
  if (mode === 'ambient') {
    const jobs = [];
    const pilotOf = (h) => h.ctx && h.ctx.autopilot && h.ctx.autopilot.engaged && h.ctx.autopilot;
    // Frame 0: the names between two trips, online (the storms are named over the Earth).
    jobs.push((async () => {
      const h = await open(0, 2, q.get('pair') || 'ambient=the-living-earth,a-year-in-a-minute&pace=3');
      const res = h.res;
      const pilot = await until(() => pilotOf(h), 60000);
      if (!pilot) { h.errors.push('the reel never started'); done(h, res); return; }
      const seen = []; let last = '';
      const card = await until(() => {
        const st = h.ctx.trip.state;
        if (st.tourId === 'the-living-earth' && st.phase === 'dwell' && st.stopId !== last) {
          last = st.stopId;
          const row = { id: st.stopId, names: h.visible('#labels .label').map(text).slice(0, 6), caption: text(h.w().document.querySelector('.sr-tripsheet.is-present, .sr-tripsheet')).slice(0, 200) };
          seen.push(row);
          // The aurora stop's note: the forecast's sentence, then today's Kp (internal #385). Read two
          // seconds in, when the note has been painted, with what the page holds of NOAA's reading.
          if (st.stopId === 'aurora') {
            setTimeout(() => {
              try {
                row.note = st.stopNote || null;
                row.kpLine = typeof h.ctx.spaceWeatherLine === 'function' ? h.ctx.spaceWeatherLine() : 'no function';
                row.kpHeld = h.ctx.spaceWeather ? { kp: h.ctx.spaceWeather.parsed && h.ctx.spaceWeather.parsed.kp, observed: h.ctx.spaceWeather.parsed && h.ctx.spaceWeather.parsed.observedKp, via: h.ctx.spaceWeather.result && h.ctx.spaceWeather.result.via } : null;
                row.sheet = text(h.w().document.querySelector('.sr-tripsheet.is-present, .sr-tripsheet')).slice(0, 900);
              } catch (e) { row.noteError = String(e && e.message); }
            }, 2000);
          }
          if (['aurora', 'weather', 'plankton'].includes(st.stopId)) h.shot(`reel-living-earth-${st.stopId}`, 900);
        }
        const c = h.visible('.sr-ambient__card')[0];
        return c && c.dataset.kind === 'title' && seen.length > 3 && c;
      }, CAP - Date.now() - 20000, 60);
      res.stops = seen;
      if (card) {
        await sleep(300);
        const all = [...h.w().document.querySelectorAll('#labels .label')].filter((n) => text(n));
        res.between = { card: text(card), namesVisible: h.visible('#labels .label').map(text).slice(0, 8), namesInDom: all.length, tripMode: h.w().document.documentElement.classList.contains('sr-trip-mode'), next: h.ctx.trip.state.tourId };
        await h.shot('reel-between-two-trips', 200);
      } else res.between = null;
      res.log = pilot.log().filter((l) => ['stop-passed', 'trip-start', 'trip-end', 'skip', 'watchdog'].includes(l.what));
      done(h, res);
    })());
    // Frame 1: laps of a short reel, and what the renderer holds after every trip.
    jobs.push((async () => {
      const h = await open(1, 2, q.get('laps') || 'ambient=strangest-things,through-a-telescope,black-holes&pace=8');
      const res = h.res;
      const pilot = await until(() => pilotOf(h), 60000);
      if (!pilot) { h.errors.push('the reel never started'); done(h, res); return; }
      await until(() => false, Math.max(1000, CAP - Date.now() - 5000), 2000);
      const log = pilot.log();
      res.kinds = [...new Set(log.map((l) => l.what))];
      res.trips = log.filter((l) => l.what === 'trip-end' || l.what === 'trip-start').map((l) => ({ what: l.what, trip: l.trip, at_s: l.up_s || l.at || null, mem: l.memory || l.mem || null }));
      try { const m = h.ctx.renderer.info; res.end = { geo: m.memory.geometries, tex: m.memory.textures, prog: m.programs ? m.programs.length : null, heapMb: performance.memory ? Math.round(h.w().performance.memory.usedJSHeapSize / 1048576) : null }; } catch { /* none */ }
      res.raw = log.slice(-6);
      await h.shot('reel-laps-end', 200);
      done(h, res);
    })());
    return finish(jobs);
  }

  /** One frame, one reel round and round: every geometry the renderer takes up, and what is still held at the end. */
  async function leakJob(i, frames, reel) {
    const h = await open(i, frames, `ambient=${reel}&pace=${q.get('pace') || 8}`);
    {
      const ctx = h.ctx; const res = h.res;
      if (!ctx) { done(h, {}); return; }
      let proto = null;
      ctx.scene.traverse((o) => {
        if (proto || !o.geometry) return;
        let p = Object.getPrototypeOf(o.geometry);
        while (p && !(Object.prototype.hasOwnProperty.call(p, 'dispose') && Object.prototype.hasOwnProperty.call(p, 'setAttribute'))) p = Object.getPrototypeOf(p);
        proto = p;
      });
      if (!proto) { h.errors.push('no geometry class found'); done(h, res); return; }
      const alive = new Map(); let pass = 0; let lastTrip = '';
      const where = () => { const st = ctx.trip.state; return `${st.tourId || '-'}:${st.stopId || st.phase}`; };
      const listen = proto.addEventListener; const dispose = proto.dispose;
      proto.addEventListener = function (type, l) { if (type === 'dispose' && !alive.has(this.uuid)) alive.set(this.uuid, { g: new (h.w().WeakRef)(this), at: where(), pass, type: this.type, n: this.attributes && this.attributes.position ? this.attributes.position.count : 0, attrs: Object.keys(this.attributes || {}).join(','), name: this.name || '' }); return listen.call(this, type, l); };
      proto.dispose = function () { alive.delete(this.uuid); return dispose.call(this); };
      const info = () => { const m = ctx.renderer.info; return { geo: m.memory.geometries, tex: m.memory.textures, prog: m.programs ? m.programs.length : null }; };
      res.passes = [];
      ctx.trip.onChange((st) => {
        const key = `${st.tourId}:${st.phase}`;
        if (st.phase === 'intro' && key !== lastTrip) { pass += 1; res.passes.push({ pass, trip: st.tourId, t: Math.round((Date.now() - T0) / 1000), ...info(), tracked: alive.size }); }
        lastTrip = key;
        // The caption of the longest stop a reel shows, once: is its note whole?
        if (st.phase === 'dwell' && st.stopId === 'aurora' && !res.caption) {
          res.caption = { at: st.stopId };
          setTimeout(() => {
            const el = h.w().document.querySelector('.sr-tripsheet.is-present');
            if (el) { const r = el.getBoundingClientRect(); res.caption.box = [Math.round(r.top), Math.round(r.height)]; res.caption.scroll = [el.scrollHeight, el.clientHeight]; res.caption.window = h.w().innerHeight; }
            h.shot('reel-aurora-caption', 0);
          }, 2500);
        }
      });
      await until(() => false, Math.max(1000, CAP - Date.now() - 8000), 2000);
      // Who wears what is still held.
      const worn = new Map();
      ctx.scene.traverse((o) => { if (o.geometry) { const path = []; for (let p = o; p && path.length < 4; p = p.parent) path.push(p.name || p.type); worn.set(o.geometry.uuid, path.join(' < ')); } });
      const groups = new Map();
      for (const [id, a] of alive) {
        if (a.pass <= reel.split(',').length) continue;   // the first lap fills the caches: not a leak
        const k = `${a.at} | ${a.type} ${a.n}v [${a.attrs}] ${a.name} | ${worn.has(id) ? 'worn by ' + worn.get(id) : (a.g.deref() ? 'in no scene object' : 'collected, never disposed')}`;
        const gr = groups.get(k) || { n: 0, passes: new Set() }; gr.n += 1; gr.passes.add(a.pass); groups.set(k, gr);
      }
      res.end = { ...info(), tracked: alive.size, passes: pass };
      res.held = [...groups.entries()].map(([k, v]) => ({ k, n: v.n, passes: [...v.passes] })).sort((x, y) => y.n - x.n).slice(0, 40);
      done(h, res);
    }
  }
  // ------------------------------------------------------------------------------------------ leak
  // `probe=leak&reels=strangest-things;moon-landings` -- one frame a reel, each a single trip round
  // and round at pace 8. Every geometry the renderer takes up (it listens for `dispose` on it) is
  // written down with the stop it appeared at, and crossed off when it is disposed: what is still
  // held after the first pass, and whether anything in the scene still wears it, is the leak.
  if (mode === 'leak') {
    const reels = (q.get('reels') || 'strangest-things').split(';').filter(Boolean);
    // `stops=trip:n,...`: one more frame, an ordinary walk of those stops (a fix looked at again).
    const also = (q.get('stops') || '').split(',').filter(Boolean);
    const frames = reels.length + (also.length ? 1 : 0);
    const jobs = [];
    if (also.length) {
      jobs.push((async () => {
        const by = new Map();
        for (const s of also) { const [id, n] = s.split(':'); if (!by.has(id)) by.set(id, []); by.get(id).push(Number(n) - 1); }
        const h = await open(reels.length, frames);
        const rows = h.ctx ? await walk(h, [...by.entries()], 2500) : [];
        done(h, { rows });
      })());
    }
    return finish(jobs.concat(reels.map(async (reel, i) => {
      await leakJob(i, frames, reel);
    })));
  }

  // ---------------------------------------------------------------------------------------- flight
  if (mode === 'flight') {
    const h = await open(0, 1);
    const ctx = h.ctx; const res = { joins: [] };
    try { const gl = ctx.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); res.gpu = e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; } catch { /* no name */ }
    ctx.setObserver(PLACE);
    if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
    // Every animation frame's length, with the stage it was drawn on.
    const W = h.w(); let prev = 0; let cur = null; let go = true;
    const tick = (t) => { if (!go) return; if (prev && cur) { cur.dt.push(t - prev); const s = (ctx.stage || {}).id || (ctx.stage || {}).worldId || '?'; if (cur.stages[cur.stages.length - 1] !== s) cur.stages.push(s); } prev = t; W.requestAnimationFrame(tick); };
    W.requestAnimationFrame(tick);
    const sum = (j) => { const d = [...j.dt].sort((a, b) => a - b); const n = d.length; const total = d.reduce((a, b) => a + b, 0); return { join: j.name, frames: n, s: Math.round(total / 100) / 10, fps: Math.round((n / total) * 10000) / 10, p50_ms: Math.round(d[Math.floor(n / 2)] || 0), p95_ms: Math.round(d[Math.floor(n * 0.95)] || 0), max_ms: Math.round(d[n - 1] || 0), over50ms: d.filter((x) => x > 50).length, over100ms: d.filter((x) => x > 100).length, stages: j.stages }; };
    const plan = await ctx.trip.start('roof-to-the-edge');
    if (!plan || plan.offerable === false) { h.errors.push('roof trip: ' + ((plan && plan.reason) || 'no plan')); done(h, res); return out; }
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    res.count = plan.count;
    const cast = new Set((q.get('cast') || '8').split(',').map(Number));
    ctx.trip.play();
    for (let n = 0; n < plan.count; n++) {
      cur = { name: `to-${n + 1}`, dt: [], stages: [] };
      if (cast.has(n) && window.cdpCast) await window.cdpCast('start', `cast-to-${n + 1}`);
      if (n > 0) ctx.trip.next();
      await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 60000, 50);
      if (cast.has(n) && window.cdpCast) await window.cdpCast('stop');
      const j = sum(cur); j.stop = ctx.trip.state.stopId; j.km = h.km(); res.joins.push(j);
      cur = null;
      await h.shot(`flight-${String(n + 1).padStart(2, '0')}-${ctx.trip.state.stopId}`, 1200);
    }
    // The last stop left to end: the flight home.
    cur = { name: 'home', dt: [], stages: [] };
    ctx.trip.next();
    const began = await until(() => ctx.trip.state.returning === true || ctx.trip.state.phase === 'outro', 30000, 50);
    res.home = { began: !!began, returning: ctx.trip.state.returning === true, shots: [] };
    const t0 = Date.now();
    for (const at of [2000, 6000, 10000]) { await sleep(Math.max(0, at - (Date.now() - t0))); if (!ctx.trip.state.returning) break; await h.shot(`home-${res.home.shots.length + 1}`, 0); res.home.shots.push({ at_ms: Date.now() - t0, km: h.km(), stage: (ctx.stage || {}).id || null }); }
    await until(() => ctx.trip.state.phase === 'outro', 40000, 50);
    res.joins.push(sum(cur)); cur = null; go = false;
    res.home.ms = Date.now() - t0;
    await sleep(900);
    res.home.end = { phase: ctx.trip.state.phase, km: h.km(), card: text(W.document.querySelector('.sr-tripsheet')).slice(0, 240) };
    await h.shot('home-end-card', 300);
    // The trip's volume against the panel's (internal #432): one engine volume, two sliders.
    try {
      const sliders = [...W.document.querySelectorAll('input[type="range"]')].map((s) => ({ cls: (s.className || '') + ' ' + ((s.closest('[class]') || {}).className || ''), label: s.getAttribute('aria-label'), value: s.value }));
      res.sliders = sliders.slice(0, 6);
    } catch { /* none */ }
    done(h, res);
    out.s = Math.round((Date.now() - T0) / 1000);
    return out;
  }

  // ----------------------------------------------------------------------------------------- phone
  if (mode === 'phone') {
    const h = await open(0, 1, q.get('reel') || 'ambient=a-year-in-a-minute,moon-phases&sound=1');
    const ctx = h.ctx; const res = { width: h.w().innerWidth, height: h.w().innerHeight, phone: h.w().document.documentElement.classList.contains('sr-phone') };
    const W = h.w();
    const pilot = await until(() => ctx.autopilot && ctx.autopilot.engaged && ctx.autopilot, 60000);
    const card = (kind) => { const c = h.visible('.sr-ambient__card')[0]; return c && (!kind || c.dataset.kind === kind) ? c : null; };
    const box = (el) => (({ left, top, width, height }) => [left, top, width, height].map(Math.round))(el.getBoundingClientRect());
    if (pilot) {
      const gate = await until(() => card('gate'), 15000, 50);
      if (gate) { res.soundCard = { text: text(gate), box: box(gate) }; await h.shot('phone-1-sound-card', 300); }
      const lapT0 = Date.now(); const seen = []; let last = ''; const cards = [];
      let lastCard = '';
      await until(() => {
        const st = ctx.trip.state;
        const c = card('title');
        if (c && text(c) !== lastCard) { lastCard = text(c); cards.push({ at_s: Math.round((Date.now() - lapT0) / 1000), text: lastCard, box: box(c), names: h.visible('#labels .label').length }); h.shot(`phone-2-card-${cards.length}`, 250); }
        const key = `${st.tourId}:${st.stopId}`;
        if (st.phase === 'dwell' && key !== last) { last = key; seen.push({ at_s: Math.round((Date.now() - lapT0) / 1000), trip: st.tourId, stop: st.stopId }); if (seen.length === 2 || seen.length === 6) h.shot(`phone-3-stop-${seen.length}`, 1500); }
        // A lap: the first trip is on again after the second ended.
        return seen.length > 4 && st.tourId === seen[0].trip && seen.some((s) => s.trip !== seen[0].trip) && st.phase === 'dwell';
      }, Math.max(1000, CAP - Date.now() - 110000), 80);
      res.lap = { s: Math.round((Date.now() - lapT0) / 1000), stops: seen, cards, complete: seen.length > 4 && seen[seen.length - 1].trip === seen[0].trip && seen.some((s) => s.trip !== seen[0].trip) };
      res.log = pilot.log().filter((l) => ['trip-start', 'trip-end', 'watchdog', 'skip', 'sound'].includes(l.what)).map((l) => ({ what: l.what, trip: l.trip }));
      if (window.cdpInput) { await window.cdpInput('key', 'Escape'); await sleep(1200); }
      try { if (ctx.autopilot.engaged) ctx.autopilot.stop(); } catch { /* gone */ }
      try { ctx.trip.stop('leave'); } catch { /* nothing ran */ }
      await sleep(1200);
    } else h.errors.push('the reel never started');
    W.document.documentElement.classList.remove('sr-ambient');
    // "Play on its own", on a phone, with the sheet open.
    try {
      const sheet = ctx.shell && typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
      if (sheet && sheet.set) sheet.set('full');
      await sleep(700);
      const own = [...W.document.querySelectorAll('.sr-more')].find((b) => /Play on its own/.test(b.textContent));
      if (own) { own.scrollIntoView({ block: 'center' }); await sleep(300); res.ownRow = { text: text(own), box: box(own) }; await h.shot('phone-4-play-on-its-own', 300); own.click(); await sleep(900); await h.shot('phone-5-just-watch', 300); }
      else res.ownRow = null;
      if (sheet && sheet.set) sheet.set('peek');
      await sleep(700);
    } catch (e) { h.errors.push('row: ' + e.message); }
    // An Earth overlay with the sheet at its peek: does anything say what the colours are?
    try {
      await h.goTo('earth'); ctx.deselect && ctx.deselect(); await sleep(800);
      res.overlayBefore = ctx.overlayState ? ctx.overlayState() : null;
      await ctx.setOverlay('sea-temperature');
      await until(() => { const s = ctx.overlayState && ctx.overlayState(); return s && (s.shown || s.ready || s.id === 'sea-temperature'); }, 20000);
      await sleep(4000);
      const sheet = ctx.shell && typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
      if (sheet && sheet.set) sheet.set('peek');
      await sleep(900);
      await until(() => ctx.overlayState().status === 'shown', 20000, 300);
      await sleep(1500);
      const keyOf = () => h.visible('.sr-overlaykey__top').map((n) => ({ text: text(n).slice(0, 120), box: box(n), font: W.getComputedStyle(n).fontFamily.slice(0, 40) }));
      res.overlay = { status: ctx.overlayState().status, legend: ctx.overlayState().legend, sheet: sheet && sheet.detent ? sheet.detent() : W.document.documentElement.dataset.sheet || null, keyed: W.document.documentElement.classList.contains('sr-overlay-keyed'), key: keyOf(), top: box(W.document.querySelector('#sr-top')), overflowX: W.document.documentElement.scrollWidth > W.innerWidth };
      await h.shot('phone-6-overlay-at-peek', 500);
      if (sheet && sheet.set) { sheet.set('half'); await sleep(900); res.overlay.atHalf = keyOf().length; await h.shot('phone-7-overlay-at-half', 300); sheet.set('full'); await sleep(900); res.overlay.atFull = keyOf().length; await h.shot('phone-8-overlay-at-full', 300); sheet.set('peek'); await sleep(700); }
      await ctx.setOverlay(null); await sleep(900);
      res.overlay.afterOff = { keyed: W.document.documentElement.classList.contains('sr-overlay-keyed'), key: keyOf().length };
    } catch (e) { h.errors.push('overlay: ' + e.message); }
    done(h, res);
    out.s = Math.round((Date.now() - T0) / 1000);
    return out;
  }
  return out;
})();
