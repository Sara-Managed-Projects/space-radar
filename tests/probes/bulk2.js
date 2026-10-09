// tests/probes/bulk2.js -- the one browser pass over the three blind branches of 2026-10-09 (internal
// #546 to #556). For tools/cdp.mjs with `--gl=gpu --shot-dir=<dir>`.
//
// ONE CHROME, SEVERAL APPS, ONE AFTER ANOTHER. The served root holds two trees side by side,
// `int/` (this branch's site/) and `main/` (origin/main's), so one run can time the same view in both.
// The page is `/int/robots.txt?probe=<mode>`; each job opens the app in a full-size iframe with its own
// query (`tier=1`, `worker=0`), does its work, and removes it. `self=1`: the page IS the app (a phone,
// and the offline proof, need that; see tests/probes/track1.js on why).
//
//   sun      int tier 1, main tier 1, int tier 2: the Sun filling the frame, cost with and without grain
//   air      wind at tiers 0, 1, 2 (streaks, cost on and off); the debris view at a fast clock, worker on and off
//   deep     star cards, Orion's figure, a red dwarf's system and its Glow row
//   ui       search with a place, Coming up, the telescope's follow, Earth events and sunspots from our copy
//   keep     (self, ?sw=1, --profile) Keep this trip for offline: press it, wait for "kept"
//   kept     (self, ?sw=1, same --profile, SERVER STOPPED) the trip plays
//   phone    (self, --mobile 390x844, ?sw=1) the keep row, search, the Glow row, the Following line
return (async () => {
  const q = new URLSearchParams(location.search);
  const mode = q.get('probe') || 'sun';
  const SELF = q.has('self');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const T0 = Date.now();
  const CAP = T0 + Number(q.get('cap') || 420) * 1000;
  const left = () => CAP - Date.now();
  const out = { mode, jobs: {}, errors: [] };
  const until = async (fn, ms, step = 150) => {
    const t = Date.now();
    while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); }
    return null;
  };
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
  const stats = (a) => { const d = [...a].sort((x, y) => x - y); const n = d.length; const r = (x) => Math.round(x * 100) / 100; return n ? { n, mean: r(d.reduce((s, x) => s + x, 0) / n), p50: r(d[Math.floor(n / 2)]), p95: r(d[Math.floor(n * 0.95)]), max: r(d[n - 1]) } : { n: 0 }; };
  const shotTop = async (name) => { try { if (window.cdpShot) await Promise.race([window.cdpShot(name), sleep(30000)]); } catch { /* no picture */ } };
  const PLACE = { name: 'London', latDeg: 51.5, lonDeg: -0.12, latRad: 51.5 * Math.PI / 180, lonRad: -0.12 * Math.PI / 180, altKm: 0, source: 'manual' };

  await until(() => document.body, 10000);
  if (!SELF) { document.body.textContent = ''; document.body.style.cssText = 'margin:0;background:#000;overflow:hidden'; }

  /** The app, in a frame of its own (`src` relative to this page) or as this page. */
  async function open(src) {
    let f = null;
    if (!SELF) {
      f = document.createElement('iframe');
      f.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:0;background:#000';
      f.src = new URL(src, location.href).href;
      document.body.appendChild(f);
    }
    const w = () => (f ? f.contentWindow : window);
    await until(() => w().__srLayersReady && w().spaceRadar, 90000, 300);
    const h = { w, errors: [], warns: [] };
    Object.defineProperty(h, 'ctx', { get: () => w().spaceRadar });
    Object.defineProperty(h, 'doc', { get: () => w().document });
    if (!h.ctx) { h.errors.push('the app never came up'); return h; }
    w().addEventListener('error', (e) => h.errors.push(String(e.message).slice(0, 160)));
    w().addEventListener('unhandledrejection', (e) => h.errors.push('rejection: ' + String(e.reason && e.reason.message || e.reason).slice(0, 160)));
    const cw = w().console.warn; w().console.warn = (...a) => { if (h.warns.length < 12) h.warns.push(a.map((x) => String(x && x.message || x)).join(' ').slice(0, 160)); return cw.apply(w().console, a); };
    h.close = () => { if (f) f.remove(); };
    h.closeHelp = () => {
      for (const el of h.doc.querySelectorAll('section, aside, div[role="dialog"], div')) {
        if (el.children.length > 12 || !/^\s*controls/i.test(el.textContent || '')) continue;
        const b = el.querySelector('button[aria-label*="lose"], button');
        if (b) { b.click(); return true; }
      }
      return false;
    };
    h.shot = async (name, settle = 1000) => { await sleep(settle); h.closeHelp(); await sleep(120); await shotTop(name); };
    h.card = () => text(h.doc.querySelector('#sr-card, .sr-card'));
    h.goTo = async (id, capMs = 22000) => {
      const ctx = h.ctx; const rec = typeof id === 'string' ? ctx.recordById(id) : id;
      if (!rec) { h.errors.push(`no record ${id}`); return null; }
      ctx.select(rec, { fly: true });
      const f0 = Date.now(); await sleep(2500);
      while (ctx.cameraRig.state.flying && Date.now() - f0 < capMs) await sleep(300);
      await sleep(1500);
      return rec;
    };
    /** What a frame costs when the GPU is made to finish it (one pixel read back: gl.finish() returns at once under ANGLE on Metal): every render() of one animation frame, summed. */
    h.cost = async (frames = 120, capMs = 15000) => {
      const r = h.ctx.renderer; const gl = r.getContext(); const render = r.render; const per = []; let acc = 0; let on = true; const px = new Uint8Array(4);
      r.render = function timed(...a) { const b = performance.now(); const v = render.apply(r, a); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, px); acc += performance.now() - b; return v; };
      const raf = () => { if (!on) return; if (acc > 0) per.push(acc); acc = 0; w().requestAnimationFrame(raf); };
      w().requestAnimationFrame(raf);
      const t = Date.now(); while (per.length < frames && Date.now() - t < capMs) await sleep(100);
      on = false; r.render = render;
      return stats(per.slice(5));
    };
    /** Every animation frame's length for `ms`, and the long tasks in it. */
    h.frames = async (ms) => {
      const dt = []; let prev = 0; let on = true; const long = [];
      let po = null; try { po = new (w().PerformanceObserver)((l) => { for (const e of l.getEntries()) long.push(e.duration); }); po.observe({ entryTypes: ['longtask'] }); } catch { /* no observer */ }
      const raf = (t) => { if (!on) return; if (prev) dt.push(t - prev); prev = t; w().requestAnimationFrame(raf); };
      w().requestAnimationFrame(raf);
      await sleep(ms); on = false; if (po) po.disconnect();
      return { frame: stats(dt), over50: dt.filter((x) => x > 50).length, over100: dt.filter((x) => x > 100).length, longtasks: stats(long), longSum: Math.round(long.reduce((s, x) => s + x, 0)) };
    };
    /** The canvas as drawn this frame, small: for "did the picture change". */
    h.snap = () => new Promise((res) => {
      const c = h.ctx.renderer.domElement; const k = h.doc.createElement('canvas'); k.width = 360; k.height = 225;
      w().requestAnimationFrame(() => w().requestAnimationFrame(() => { try { const g = k.getContext('2d'); g.drawImage(c, 0, 0, 360, 225); res(g.getImageData(0, 0, 360, 225).data); } catch (e) { res(null); } }));
    });
    h.diff = (a, b) => { if (!a || !b) return null; let n = 0; let lit = 0; for (let i = 0; i < a.length; i += 4) { if (a[i] + a[i + 1] + a[i + 2] > 40) lit++; if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 45) n++; } return { changed: n, lit }; };
    h.byName = (re) => h.ctx.records().find((r) => re.test(r.name || ''));
    h.resources = (re) => w().performance.getEntriesByType('resource').filter((e) => re.test(e.name)).map((e) => `${e.name.replace(location.origin, '').slice(0, 90)} ${e.responseStatus || ''}`);
    try { h.gpu = (() => { const gl = h.ctx.renderer.getContext(); const e = gl.getExtension('WEBGL_debug_renderer_info'); return e ? gl.getParameter(e.UNMASKED_RENDERER_WEBGL) : null; })(); } catch { /* no name */ }
    return h;
  }
  const job = async (name, src, fn) => {
    if (left() < 25000) { out.jobs[name] = { cut: 'not started' }; return; }
    const res = {}; out.jobs[name] = res; let h = null;
    try {
      h = await open(src);
      if (h.ctx) { res.tier = h.ctx.quality ? h.ctx.quality.tier : null; res.gpu = h.gpu; await fn(h, res); }
    } catch (e) { res.error = String(e && e.stack || e).slice(0, 300); }
    if (h) { if (h.errors.length) res.errors = h.errors.slice(0, 8); if (h.warns.length) res.warns = h.warns.slice(0, 8); if (h.close) h.close(); }
    await sleep(600);
  };
  const run = async (body) => { await Promise.race([body(), sleep(Math.max(1000, left() + 20000))]); out.s = Math.round((Date.now() - T0) / 1000); return out; };

  const MODES = {};
  // --------------------------------------------------------------------------------------------- sun
  async function sunJob(h, res, name) {
    const ctx = h.ctx;
    await h.goTo('sun');
    // The disc past every corner of the window: its radius 1.9 half-heights.
    for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 1.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.85, ms: 0 }); await sleep(120); }
    res.share = Math.round(ctx.worlds.discShare('sun') * 100) / 100;
    await until(() => ctx.sunDetail && (ctx.quality.tier === 0 || ctx.sunDetail.state().grain > 0.95), 20000);
    await until(() => ctx.sunRegions, 8000);
    await sleep(1500);
    res.state = ctx.sunDetail ? ctx.sunDetail.state() : null;
    res.withGrain = await h.cost();
    let U = null; ctx.scene.traverse((o) => { if (!U && o.material && o.material.uniforms && o.material.uniforms.uGrain) U = o.material.uniforms.uGrain; });
    if (U) {
      let v = U.value; Object.defineProperty(U, 'value', { get: () => 0, set: (x) => { v = x; }, configurable: true });
      await sleep(400);
      res.noGrain = await h.cost();
      delete U.value; U.value = v;
      await sleep(300);
      res.withGrainAgain = await h.cost(90);
    } else res.noGrain = 'no uGrain uniform found';
    await h.shot(`${name}-sun`, 800);
    try { ctx.refreshCard(); } catch { /* no card */ }
    await sleep(600);
    const line = h.doc.querySelector('.sr-card__sunspots');
    res.cardSpots = line ? { hidden: line.hidden, text: (line.textContent || '').slice(0, 520) } : 'no .sr-card__sunspots line';
    res.regionsFrom = h.resources(/solar[-_]regions/);
    // The face the Earth sees, whole: every group NOAA lists is on it.
    try {
      const e = ctx.worlds.meshFor('earth').position; const sp = ctx.worlds.meshFor('sun').position;
      const d = { x: e.x - sp.x, y: e.y - sp.y, z: e.z - sp.z }; const l = Math.hypot(d.x, d.y, d.z) || 1;
      ctx.cameraRig.flyTo({ offset: { x: d.x / l, y: d.y / l, z: d.z / l }, distance: ctx.cameraRig.state.distance, ms: 0 });
      await sleep(300);
      for (let i = 0; i < 30 && ctx.worlds.discShare('sun') > 0.92; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 1.08, ms: 0 }); await sleep(100); }
      res.earthSide = { share: Math.round(ctx.worlds.discShare('sun') * 100) / 100, state: ctx.sunDetail ? ctx.sunDetail.state() : null };
    } catch (e) { res.earthSideError = String(e.message || e); }
    await h.shot(`${name}-sun-earthside`, 1500);
  }
  MODES.sun = async () => {
      await job('int-t1', './?sw=0&tier=1', (h, r) => sunJob(h, r, 'int-t1'));
      await job('main-t1', '../main/?sw=0&tier=1', (h, r) => sunJob(h, r, 'main-t1'));
  };

  // The Sun filling the frame, nothing made to wait: what the frames are, and whether the frame latch trips.
  MODES.sunfps = async () => {
    for (const [name, src] of [['int-t1', './?sw=0&tier=1'], ['main-t1', '../main/?sw=0&tier=1']]) {
      await job(`fps-${name}`, src, async (h, res) => {
        const ctx = h.ctx;
        await h.goTo('sun');
        // Before the disc is large: the frames with the flat Sun far off, as the machine's own floor.
        res.far = await h.frames(4000);
        for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 1.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.85, ms: 0 }); await sleep(120); }
        await until(() => ctx.sunDetail && ctx.sunDetail.state().grain > 0.95, 15000);
        res.share = Math.round(ctx.worlds.discShare('sun') * 100) / 100;
        res.before = ctx.sunDetail ? { on: ctx.sunDetail.state().on, latched: ctx.sunDetail.state().latched } : null;
        res.close = await h.frames(9000);
        res.after = ctx.sunDetail ? { on: ctx.sunDetail.state().on, latched: ctx.sunDetail.state().latched } : null;
        res.quality = ctx.quality && ctx.quality.describe ? ctx.quality.describe() : null;
      });
    }
  };

  // -------------------------------------------------------------------------------------------- edge
  // The roof trip, every join timed frame by frame, then "Go home" from the end card: each gap over
  // 300 ms with the stage it fell on and what the renderer held before and after it.
  async function edgeJob(h, res, name) {
    const ctx = h.ctx; const W = h.w(); const doc = h.doc;
    ctx.setObserver(PLACE);
    if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
    const info = () => { const m = ctx.renderer.info; return `g${m.memory.geometries} t${m.memory.textures} p${m.programs ? m.programs.length : 0}`; };
    let prev = 0; let cur = null; let go = true; let last = info();
    const tick = (t) => {
      if (!go) return;
      if (prev && cur) {
        const dt = t - prev; cur.dt.push(dt);
        const now = info();
        if (dt > 300) cur.gaps.push({ ms: Math.round(dt), at: Math.round(performance.now() - cur.t0), stage: ctx.stage.worldId, before: last, after: now });
        last = now;
      }
      prev = t; W.requestAnimationFrame(tick);
    };
    W.requestAnimationFrame(tick);
    const begin = (n) => { cur = { name: n, dt: [], gaps: [], t0: performance.now() }; };
    const end = () => { const j = cur; cur = null; const st = stats(j.dt); return { join: j.name, frames: st.n, p50: st.p50, p95: st.p95, max: st.max, over100: j.dt.filter((x) => x > 100).length, gaps: j.gaps }; };
    const plan = await ctx.trip.start('roof-to-the-edge');
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    res.joins = [];
    ctx.trip.play();
    for (let n = 0; n < plan.count; n++) {
      begin(`to-${n + 1}`);
      if (n > 0) ctx.trip.next();
      await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 60000, 50);
      await sleep(n === 6 ? 4500 : 1500);   // on the stellar rung long enough for the Milky Way's prewarm
      const j = end(); j.stop = ctx.trip.state.stopId; j.stage = ctx.stage.worldId; res.joins.push(j);
      if (['milky-way', 'local-group'].includes(ctx.trip.state.stopId)) { res[`galaxy@${ctx.trip.state.stopId}`] = { visible: ctx.galaxy.group ? ctx.galaxy.group.visible : null, children: ctx.galaxy.group ? ctx.galaxy.group.children.map((c) => `${c.name || c.type}:${c.visible}:${c.geometry && c.geometry.attributes.position ? c.geometry.attributes.position.count : 0}`) : null }; await h.shot(`${name}-${ctx.trip.state.stopId}`, 600); }
    }
    ctx.trip.next();
    await until(() => ctx.trip.state.phase === 'outro', 30000, 50);
    await sleep(1200);
    const home = [...doc.querySelectorAll('.sr-tripsheet button')].find((b) => /go home/i.test(b.textContent || ''));
    res.homeButton = home ? text(home) : [...doc.querySelectorAll('.sr-tripsheet button')].map((b) => text(b)).join(' | ');
    if (home) {
      begin('home');
      home.click();
      const t0 = Date.now();
      await until(() => ctx.stage.worldId === 'earth', 40000, 50);
      const arrived = Date.now() - t0;
      await sleep(600);
      await h.shot(`${name}-home-arriving`, 0);
      await until(() => !ctx.cameraRig.state.flying, 20000, 100);
      await sleep(4000);
      const j = end(); j.earthAfterMs = arrived; j.stage = ctx.stage.worldId; j.stars = ctx.stars3d && ctx.stars3d.count ? ctx.stars3d.count() : null; res.joins.push(j);
      await h.shot(`${name}-home-earth`, 300);
      // Out again to the stars from the Earth: the 3D stars are where the sky sphere's are.
      try { ctx.setStage('stellar'); await sleep(3500); await h.shot(`${name}-stellar-again`, 300); } catch { /* stays */ }
    }
    go = false;
  }
  MODES.edge = async () => {
      for (const who of (q.get('who') || 'int,main').split(',')) await job(who, who === 'main' ? '../main/?sw=0&tier=1' : './?sw=0&tier=1', (h, r) => edgeJob(h, r, who));
  };

  // --------------------------------------------------------------------------------------------- air
  async function windJob(h, res, name) {
    const ctx = h.ctx;
    ctx.frameEarth(0); await sleep(3000);
    res.framesOff = (await h.frames(5000)).frame;
    ctx.setOverlay('wind');
    await until(() => ctx.wind, 20000);
    await until(() => { const s = ctx.overlayState(); return s && s.status && !/loading/.test(s.status); }, 25000, 400);
    await sleep(5000);
    res.state = JSON.stringify(ctx.overlayState()).slice(0, 420);
    let streaks = null;
    ctx.scene.traverse((o) => { if (/wind/i.test(o.name || '') && o.geometry) { const g = o.geometry; streaks = { name: o.name, instances: g.instanceCount, pos: g.attributes.position ? g.attributes.position.count : null, draw: g.drawRange ? g.drawRange.count : null, type: o.type }; } });
    res.streaks = streaks;
    res.quality = ctx.quality.describe ? ctx.quality.describe() : null;
    res.framesOn = (await h.frames(5000)).frame;
    await h.shot(`${name}-wind`, 500);
    ctx.setOverlay(null);
  }
  async function debrisJob(h, res, name) {
    const ctx = h.ctx;
    const layer = ctx.layers.find((l) => l.id === 'debris-field');
    ctx.frameEarth(0);
    if (ctx.loadLayerNow) ctx.loadLayerNow(layer);
    ctx.setLayerOn('debris-field', true);
    await until(() => ctx.recordsFor('debris-field').length > 5000, 70000, 400);
    res.records = ctx.recordsFor('debris-field').length;
    if (!res.records) return;
    await sleep(4000);
    const gl = ctx.glyphLayers && ctx.glyphLayers.get('debris-field');
    const rates = ctx.clock.rates ? ctx.clock.rates() : [];
    res.rates = rates;
    res.calm = await h.frames(8000);
    const fast = Number(q.get('rate')) || 600;
    ctx.clock.setRate(fast);
    res.rate = ctx.clock.rate;
    await sleep(2500);
    const a = await h.snap();
    res.fast = await h.frames(15000);
    const b = await h.snap();
    res.moved = h.diff(a, b);
    try { res.pool = gl && gl.poolStats ? gl.poolStats() : null; } catch { /* none */ }
    await h.shot(`${name}-debris`, 200);
    ctx.clock.setRate(1);
  }
  MODES.air = async () => {
      await job('debris-worker', './?sw=0&tier=1', (h, r) => debrisJob(h, r, 'worker'));
      await job('debris-inpage', './?sw=0&tier=1&worker=0', (h, r) => debrisJob(h, r, 'inpage'));
      for (const t of [2, 1, 0]) await job(`wind-t${t}`, `./?sw=0&tier=${t}`, (h, r) => windJob(h, r, `t${t}`));
  };

  MODES.wind = async () => { for (const t of [2, 1, 0]) await job(`wind-t${t}`, `./?sw=0&tier=${t}`, (h, r) => windJob(h, r, `t${t}`)); };

  // -------------------------------------------------------------------------------------------- deep
  MODES.deep = async () => {
      await job('stars', './?sw=0&tier=1', async (h, res) => {
        const ctx = h.ctx;
        if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
        res.cards = {};
        for (const n of ['Sirius', 'Arcturus', 'Deneb']) {
          const rec = await until(() => h.byName(new RegExp(`^${n}$`)), 20000, 400);
          if (!rec) { res.cards[n] = 'no record'; continue; }
          await h.goTo(rec, 16000);
          const card = h.card();
          res.cards[n] = { stage: ctx.stage.worldId, lines: (card.match(/[^.]*(?:measured|arXiv|times the Sun|wide|across)[^.]*\./gi) || []).join(' ').slice(0, 420) };
          if (n !== 'Arcturus') await h.shot(`deep-card-${n.toLowerCase()}`, 600);
        }
        // Orion, and Orion from the side.
        try { ctx.select(null); } catch { /* nothing chosen */ }
        const plan = await ctx.trip.start('the-constellations');
        await until(() => ctx.trip.state.phase === 'intro', 20000);
        res.figure = [{ at: 'before', scale: ctx.stars3d.pointScale ? ctx.stars3d.pointScale() : null }];
        if (plan && plan.offerable !== false) {
          ctx.trip.play();
          for (const n of [0, 1]) {
            if (n > 0) ctx.trip.jumpTo(n);
            await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 40000, 100);
            await sleep(2500);
            res.figure.push({ at: ctx.trip.state.stopId, stage: ctx.stage.worldId, scale: ctx.stars3d.pointScale ? ctx.stars3d.pointScale() : null, figures: ctx.figures && ctx.figures.state ? JSON.stringify(ctx.figures.state()).slice(0, 160) : null });
            await h.shot(`deep-figure-${ctx.trip.state.stopId}`, 300);
          }
          // The same view with the figure gone: the stars settle back.
          if (ctx.figures && ctx.figures.clear) ctx.figures.clear();
          await sleep(4000);
          res.figure.push({ at: 'figure cleared', scale: ctx.stars3d.pointScale ? ctx.stars3d.pointScale() : null });
          await h.shot('deep-figure-cleared', 200);
          try { ctx.trip.stop('leave'); } catch { /* gone */ }
          await sleep(3000);
          res.figure.push({ at: 'left', scale: ctx.stars3d.pointScale ? ctx.stars3d.pointScale() : null });
        } else res.figure.push({ error: (plan && plan.reason) || 'no plan' });
      });
      await job('systems', './?sw=0&tier=1', async (h, res) => {
        const ctx = h.ctx;
        if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
        await until(() => h.byName(/^Proxima Cen/i), 30000, 500);
        res.found = ctx.records().filter((r) => /^(Proxima Cen|TRAPPIST-1)/i.test(r.name || '')).map((r) => `${r.id}|${r.name}|${r.layer}`).slice(0, 14);
        for (const [key, re] of [['proxima', /^Proxima Cen\w* b$/i], ['trappist', /^TRAPPIST-1 ?e$/i]]) {
          const rec = h.byName(re);
          if (!rec) { res[key] = 'no record'; continue; }
          await h.goTo(rec, 25000);
          const o = { stage: ctx.stage.worldId, planetCard: /Glow/.test(h.card()) };
          // Whole-system scale: every orbit in the picture.
          try {
            const d = ctx.systems.framingDistanceUnits(ctx.stage.worldId);
            ctx.cameraRig.stopFollow && ctx.cameraRig.stopFollow();
            ctx.cameraRig.flyTo({ targetScene: { x: 0, y: 0, z: 0 }, distance: d, ms: 0 });
            o.framing = d;
          } catch (e) { o.framingError = String(e.message || e); }
          let host = null;
          try { host = ctx.systems.hostRecordFor(rec) || ctx.systems.hostRecordFor(ctx.stage.worldId); } catch { /* another signature */ }
          if (host) { try { ctx.select(host); } catch { /* no card */ } }
          await sleep(3500);
          const card = h.card();
          o.host = host ? host.name : null;
          o.glowRow = (card.match(/Glow\s*[^.]{0,110}/) || [''])[0];
          o.cardStart = card.slice(0, 200);
          try { o.stats = JSON.stringify(ctx.systems.stats()).slice(0, 300); } catch { /* none */ }
          // The star's glow on the screen: the halo sprite's width in pixels.
          try {
            let halo = null; ctx.systems.group.traverse((x) => { if (x.userData && x.userData.halo && !halo) halo = x; });
            if (halo) {
              const s = halo.userData.halo; const W = new (halo.position.constructor)(); const SC = new (halo.position.constructor)();
              s.getWorldPosition(W); s.getWorldScale(SC);
              const dist = ctx.camera.position.distanceTo(W); const c = ctx.renderer.domElement;
              o.glowPx = Math.round((SC.x / dist) / (2 * Math.tan((ctx.camera.fov * Math.PI / 180) / 2)) * c.clientHeight * 10) / 10;
            }
          } catch (e) { o.glowError = String(e.message || e); }
          res[key] = o;
          await h.shot(`deep-system-${key}`, 500);
        }
      });
  };

  // ---------------------------------------------------------------------------------------------- ui
  async function searchJob(h, res, tag) {
    const ctx = h.ctx; const doc = h.doc;
    let input = [...doc.querySelectorAll('.sr-search__input')].find((n) => n.getBoundingClientRect().width > 0);
    if (!input) {
      const b = [...doc.querySelectorAll('button')].find((n) => /search/i.test((n.getAttribute('aria-label') || '') + ' ' + n.textContent) && n.getBoundingClientRect().width > 0);
      if (b) { b.click(); await sleep(800); }
      input = [...doc.querySelectorAll('.sr-search__input')].find((n) => n.getBoundingClientRect().width > 0) || doc.querySelector('.sr-search__input');
    }
    if (!input) { res.search = 'no search box'; return; }
    res.search = {};
    for (const word of ['voyager', 'ceres']) {
      input.focus(); input.value = word; input.dispatchEvent(new (h.w().Event)('input', { bubbles: true }));
      await sleep(2500);
      const rows = [...doc.querySelectorAll('.sr-search__list li')].filter((n) => n.getBoundingClientRect().height > 0);
      res.search[word] = rows.slice(0, 5).map((n) => text(n).slice(0, 110));
      const wide = rows.filter((n) => n.scrollWidth > n.clientWidth + 1).length;
      if (wide) res.search[word + 'Overflow'] = wide;
      await h.shot(`${tag}-search-${word}`, 300);
    }
    input.value = ''; input.dispatchEvent(new (h.w().Event)('input', { bubbles: true })); input.blur();
    try { doc.dispatchEvent(new (h.w().KeyboardEvent)('keydown', { key: 'Escape', bubbles: true })); } catch { /* fine */ }
  }
  async function tonightJob(h, res, tag) {
    const ctx = h.ctx; const doc = h.doc;
    const tab = [...doc.querySelectorAll('[role="tab"], button')].find((b) => /^\s*tonight\s*$/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0);
    if (tab) tab.click();
    const view = await until(() => doc.querySelector('.sr-tonight-view'), 30000);
    // The pairings are found in the background: wait for a row with "and" in it.
    await until(() => /Moon and (Regulus|Spica|Antares|Aldebaran|Pollux)/.test(text(view)), 25000, 500);
    const tv = text(view);
    res.pairings = [...new Set(tv.match(/(?:Moon|Mercury|Venus|Mars|Jupiter|Saturn) and (?:Regulus|Spica|Antares|Aldebaran|Pollux)[^.]{0,70}/g) || [])].slice(0, 4);
    res.comingUp = (tv.match(/Coming up.{0,420}/i) || [''])[0];
    const row = [...(view ? view.querySelectorAll('li, button, a, div') : [])].find((n) => n.children.length < 6 && /Moon and (Regulus|Spica|Antares|Aldebaran|Pollux)/.test(n.textContent || ''));
    if (row && row.scrollIntoView) row.scrollIntoView({ block: 'center' });
    await h.shot(`${tag}-coming-up`, 600);
  }
  async function followJob(h, res, tag) {
    const ctx = h.ctx; const doc = h.doc; const sky = ctx.skyView;
    // An evening with Saturn up at this place.
    ctx.clock.goTo(Date.parse('2026-10-10T21:30:00Z'));
    await sleep(600);
    sky.enter(PLACE);
    await until(() => sky.active, 15000);
    await sleep(3500);
    const o = { active: !!sky.active };
    o.pointed = sky.pointAt({ body: 'saturn' }, { instant: true });
    await sleep(2500);
    o.centreBefore = sky.bodyAtCentre ? sky.bodyAtCentre() : null;
    const btn = [...doc.querySelectorAll('.sr-skybar button')].find((b) => /^\s*telescope\s*$/i.test(b.textContent || ''));
    o.button = !!btn;
    if (btn) { if (btn.scrollIntoView) btn.scrollIntoView({ block: 'center' }); btn.click(); }
    await sleep(3000);
    o.following = sky.following; o.fovDeg = Math.round(sky.fovDeg * 1000) / 1000;
    const note = [...doc.querySelectorAll('.sr-skybar .sr-density__note')].find((n) => /Following/.test(n.textContent || ''));
    o.note = note ? { text: text(note), hidden: note.hidden, w: Math.round(note.getBoundingClientRect().width), fits: note.scrollWidth <= note.clientWidth + 1 } : null;
    await h.shot(`${tag}-follow-start`, 500);
    // Forty minutes of sky later: still in the middle.
    ctx.clock.goTo(ctx.clock.now() + 40 * 60e3);
    await sleep(2500);
    o.after40min = { following: sky.following, centre: sky.bodyAtCentre ? sky.bodyAtCentre() : null };
    await h.shot(`${tag}-follow-40min`, 300);
    // A wider field lets go.
    const eye = [...doc.querySelectorAll('.sr-skybar button')].find((b) => /^\s*eye\s*$/i.test(b.textContent || ''));
    if (eye) eye.click();
    await sleep(1200);
    o.afterEye = { following: sky.following, ended: sky.followEnded, noteHidden: note ? note.hidden : null };
    res.follow = o;
    try { sky.exit(); } catch { /* stays */ }
    ctx.clock.live();
    await sleep(1500);
  }
  /** The Coming up list (ui/next.js), whole: its rows of two bodies close together, a star among them. */
  async function pairsJob(h, res, tag) {
    const doc = h.doc;
    const tab = [...doc.querySelectorAll('[role="tab"], button')].find((b) => /^\s*earth\s*$/i.test(b.textContent || '') && b.getBoundingClientRect().width > 0);
    if (tab) tab.click();
    await sleep(800);
    const STAR = /(Regulus|Spica|Antares|Aldebaran|Pollux)/;
    const rows = () => [...doc.querySelectorAll('.sr-next__row')];
    const open = () => { const m = doc.querySelector('.sr-next [aria-expanded="false"]'); if (m && !m.hidden) m.click(); };
    let got = await until(() => { open(); return rows().some((r) => STAR.test(r.textContent || '')); }, 12000, 1000);
    if (!got) {
      // None is due in the thirty days from today (node: sky/findworker.js runFind): a clock on 1 December 2026 has two.
      res.nextToday = { rows: rows().length, kinds: [...new Set(rows().map((r) => r.dataset.kind))].join(',') };
      h.ctx.clock.goTo(Date.parse('2026-12-01T12:00:00Z'));
      await sleep(500);
      h.ctx.setObserver({ ...PLACE });
      got = await until(() => { open(); return rows().some((r) => STAR.test(r.textContent || '')); }, 40000, 1000);
      res.clockAt = new Date(h.ctx.clock.now()).toISOString().slice(0, 16);
    }
    const all = rows();
    res.next = { rows: all.length, kinds: [...new Set(all.map((r) => r.dataset.kind))].join(','), pairs: all.filter((r) => / and /.test(r.textContent || '') && r.dataset.kind !== 'pass').map((r) => text(r).slice(0, 110)).slice(0, 6), star: !!got };
    const row = all.find((r) => STAR.test(r.textContent || ''));
    if (row) { row.scrollIntoView({ block: 'center' }); const b = row.getBoundingClientRect(); res.next.starRow = { text: (row.textContent || '').replace(/\s+/g, ' ').slice(0, 140), box: [Math.round(b.left), Math.round(b.width)], overflow: row.scrollWidth > row.clientWidth + 1 }; }
    await h.shot(`${tag}-coming-up-pair`, 500);
    if (res.clockAt) { h.ctx.clock.live(); await sleep(800); }
  }
  MODES.fin = async () => {
    await job('fin', './?sw=0&tier=1', async (h, res) => {
      const ctx = h.ctx; const doc = h.doc;
      ctx.setObserver(PLACE);
      if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
      try { await pairsJob(h, res, 'fin'); } catch (e) { res.pairsError = String(e && e.stack || e).slice(0, 260); }
      // The Earth's events and the Sun's spots: which copy each came from.
      const layer = ctx.layers.find((l) => l.id === 'earth-events');
      ctx.frameEarth(0);
      if (ctx.loadLayerNow) ctx.loadLayerNow(layer);
      ctx.setLayerOn('earth-events', true);
      await until(() => ctx.recordsFor('earth-events').length > 0, 30000, 400);
      res.events = ctx.recordsFor('earth-events').length;
      await h.goTo('sun');
      try {
        const e = ctx.worlds.meshFor('earth').position; const sp = ctx.worlds.meshFor('sun').position;
        const d = { x: e.x - sp.x, y: e.y - sp.y, z: e.z - sp.z }; const l = Math.hypot(d.x, d.y, d.z) || 1;
        ctx.cameraRig.flyTo({ offset: { x: d.x / l, y: d.y / l, z: d.z / l }, distance: ctx.cameraRig.state.distance, ms: 0 });
      } catch { /* the side it arrived on */ }
      await sleep(300);
      for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await sleep(120); }
      await until(() => ctx.sunDetail && ctx.sunRegions, 20000);
      await sleep(2500);
      res.sun = { share: Math.round(ctx.worlds.discShare('sun') * 100) / 100, state: ctx.sunDetail ? ctx.sunDetail.state() : null, quality: ctx.quality.describe ? ctx.quality.describe() : null };
      await h.shot('fin-sun-spots', 600);
      try { res.sources = ctx.sources.status().filter((r) => /eonet|solar-regions|^wind$/.test(r.id)).map((r) => `${r.id}:${r.via || 'none'}:${r.state}`); } catch (e) { res.sourcesError = String(e.message || e); }
      // TRAPPIST-1's own card: the Glow row, at once and after the card is drawn again.
      const whole = () => { const c = doc.querySelector('#sr-card, .sr-card'); return c ? (c.textContent || '').replace(/\s+/g, ' ') : ''; };
      const rec = ctx.recordById('star-trappist-1');
      if (rec) {
        await h.goTo(rec, 25000);
        const a = whole(); await sleep(4000); const b = whole();
        try { ctx.refreshCard(); } catch { /* none */ }
        await sleep(800); const c = whole();
        res.trappist = { stage: ctx.stage.worldId, atOnce: [/Glow/.test(a), /Width/.test(a), /Mass/.test(a)], after4s: [/Glow/.test(b), /Width/.test(b)], redrawn: [/Glow/.test(c), /Width/.test(c)], text: c.slice(0, 300) };
        const about = [...doc.querySelectorAll('.sr-card button, .sr-card summary')].find((x) => /^\s*About it\s*$/.test(x.textContent || ''));
        if (about) about.click();
        await h.shot('fin-trappist-card', 800);
      }
    });
  };
  async function cardsJob(h, res) {
    const ctx = h.ctx; const doc = h.doc;
    const whole = () => { const c = doc.querySelector('#sr-card, .sr-card'); return c ? (c.textContent || '').replace(/\s+/g, ' ') : ''; };
    res.cards = {};
    for (const n of ['Sirius', 'Arcturus', 'Deneb']) {
      const rec = await until(() => ctx.records().find((r) => r.name === n && r.layer === 'stars') || h.byName(new RegExp(`^${n}$`)), 20000, 400);
      if (!rec) { res.cards[n] = 'no record'; continue; }
      ctx.select(rec); await sleep(1500);
      res.cards[n] = (whole().match(/[^.]*(?:measured|arXiv)[^.]*\.?/gi) || []).join(' | ').slice(0, 420);
      if (n === 'Sirius') {
        const about = [...doc.querySelectorAll('.sr-card button, .sr-card summary')].find((b) => /^\s*About it\s*$/.test(b.textContent || ''));
        if (about) about.click();
        await h.shot('ui-card-sirius-about', 700);
      }
    }
    for (const id of ['star-proxima-cen', 'star-trappist-1']) {
      const rec = ctx.recordById(id);
      if (!rec) { res.cards[id] = 'no record'; continue; }
      await h.goTo(rec, 25000);
      await sleep(1500);
      const card = doc.querySelector('#sr-card, .sr-card');
      const rowEl = card ? [...card.querySelectorAll('*')].find((x) => x.children.length === 0 && /^\s*Glow\s*$/.test(x.textContent || '')) : null;
      res.cards[id] = { stage: ctx.stage.worldId, glow: (whole().match(/Glow\s*[^.]{0,110}/) || [''])[0], rowVisible: rowEl ? rowEl.getBoundingClientRect().height > 0 : false, km: Math.round(ctx.cameraRig.state.distance * (ctx.stage.unitKm || 1)) };
      if (rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({ block: 'center' });
      await h.shot(`ui-system-${id}`, 700);
    }
    try { ctx.select(null); ctx.setStage('earth'); } catch { /* stays */ }
    await sleep(1500);
  }
  async function copiesJob(h, res) {
    const ctx = h.ctx;
    const layer = ctx.layers.find((l) => l.id === 'earth-events');
    if (ctx.skyView.active) ctx.skyView.exit();
    ctx.frameEarth(0);
    if (ctx.loadLayerNow) ctx.loadLayerNow(layer);
    ctx.setLayerOn('earth-events', true);
    await until(() => ctx.recordsFor('earth-events').length > 0, 30000, 400);
    res.events = { records: ctx.recordsFor('earth-events').length, from: h.resources(/eonet/) };
    await h.shot('ui-earth-events', 2500);
    await h.goTo('sun');
    try {
      const e = ctx.worlds.meshFor('earth').position; const sp = ctx.worlds.meshFor('sun').position;
      const d = { x: e.x - sp.x, y: e.y - sp.y, z: e.z - sp.z }; const l = Math.hypot(d.x, d.y, d.z) || 1;
      ctx.cameraRig.flyTo({ offset: { x: d.x / l, y: d.y / l, z: d.z / l }, distance: ctx.cameraRig.state.distance, ms: 0 });
    } catch { /* the side it arrived on */ }
    await sleep(300);
    for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.9; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.9, ms: 0 }); await sleep(120); }
    await until(() => ctx.sunDetail && ctx.sunRegions, 20000);
    await sleep(2000);
    res.sun = { state: ctx.sunDetail ? ctx.sunDetail.state() : null, from: h.resources(/solar[-_]regions/), card: (() => { try { ctx.refreshCard(); } catch { /* none */ } const l = h.doc.querySelector('.sr-card__sunspots'); return l ? (l.textContent || '').slice(0, 520) : 'no line'; })() };
    await h.shot('ui-sun-spots', 800);
  }
  MODES.ui = async () => {
      await job('ui', './?sw=0&tier=1', async (h, res) => {
        const ctx = h.ctx;
        ctx.setObserver(PLACE);
        if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
        for (const [n, f] of [['search', () => searchJob(h, res, 'ui')], ['tonight', () => tonightJob(h, res, 'ui')], ['follow', () => followJob(h, res, 'ui')], ['copies', () => copiesJob(h, res)], ['cards', () => cardsJob(h, res)]]) {
          try { await f(); } catch (e) { res[n + 'Error'] = String(e && e.stack || e).slice(0, 260); }
        }
      });
  };

  // Several of the modes above in one Chrome: `probe=sun,deep`.
  if (mode.split(',').every((m) => MODES[m])) return run(async () => { for (const m of mode.split(',')) await MODES[m](); });

  // ----------------------------------------------------------------------------- keep, kept, phone
  const cacheCounts = async () => { const o = {}; for (const name of await caches.keys()) o[name] = (await (await caches.open(name)).keys()).length; return o; };
  const TRIP = q.get('trip') || 'moon-landings';
  async function keepRow(h, res, tag, waitMs) {
    const ctx = h.ctx; const doc = h.doc;
    // `early=1`: the intro is opened before the worker is registered (a link straight to a trip): the row comes when it is.
    const early = q.has('early');
    if (!early) {
      res.controlled = !!(await until(() => navigator.serviceWorker && navigator.serviceWorker.controller, 60000));
      res.net = await until(() => ctx.net && ctx.net.worker !== 'none' && { ...ctx.net }, 20000);
    } else res.atIntro = { net: ctx.net ? { ...ctx.net } : null, controlled: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
    const plan = await ctx.trip.start(TRIP);
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    res.count = plan && plan.count;
    const tb = Date.now();
    const btn = await until(() => doc.querySelector('.sr-tripsheet__keep'), early ? 60000 : 20000);
    res.buttonAfterMs = Date.now() - tb;
    if (!btn) { res.keep = 'no button'; await h.shot(`${tag}-intro-no-button`, 300); return null; }
    const r = btn.getBoundingClientRect(); const sheet = doc.querySelector('.sr-tripsheet'); const sr = sheet ? sheet.getBoundingClientRect() : null;
    res.keep = { label: text(btn), box: [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)], window: [innerWidth, innerHeight], inside: r.left >= 0 && r.right <= innerWidth + 0.5, sheet: sr ? [Math.round(sr.left), Math.round(sr.width)] : null, pageOverflow: doc.documentElement.scrollWidth > innerWidth + 1, sheetOverflow: sheet ? sheet.scrollWidth > sheet.clientWidth + 1 : null };
    const row = btn.parentElement; res.keep.row = row ? [...row.children].map((c) => { const b = c.getBoundingClientRect(); return `${text(c).slice(0, 26)}@${Math.round(b.left)},${Math.round(b.top)}+${Math.round(b.width)}`; }) : null;
    await h.shot(`${tag}-keep-before`, 400);
    const said = []; const note = () => text(doc.querySelector('.sr-tripsheet__keepnote'));
    const t = Date.now();
    btn.click();
    let shotBusy = false;
    while (Date.now() - t < waitMs) {
      const s = `${text(btn)} | ${note()}`.replace(/\d[\d\s.,]*/g, '#');
      if (said[said.length - 1] !== s) said.push(s);
      if (!shotBusy && Date.now() - t > 1500) { shotBusy = true; res.keep.busyNote = note().slice(0, 160); await h.shot(`${tag}-keep-busy`, 0); }
      if (btn.getAttribute('aria-busy') !== 'true' && Date.now() - t > 2500) break;
      await sleep(500);
    }
    res.keep.ms = Date.now() - t; res.keep.said = said.slice(0, 10); res.keep.end = { label: text(btn), note: note().slice(0, 220), busy: btn.getAttribute('aria-busy'), disabled: btn.disabled };
    const n = doc.querySelector('.sr-tripsheet__keepnote');
    if (n) { const b = n.getBoundingClientRect(); res.keep.noteBox = [Math.round(b.left), Math.round(b.width), n.scrollWidth > n.clientWidth + 1]; }
    await h.shot(`${tag}-keep-after`, 300);
    res.caches = await cacheCounts();
    return btn;
  }
  if (mode === 'keep') {
    return run(async () => {
      const h = await open(''); const res = {}; out.jobs.keep = res;
      try { await keepRow(h, res, 'keep', Math.max(20000, left() - 60000)); } catch (e) { res.error = String(e && e.stack || e).slice(0, 300); }
      // The worker is given time to settle what it wrote.
      await sleep(4000);
      res.errors = h.errors.slice(0, 8); res.warns = h.warns.slice(0, 8);
    });
  }
  if (mode === 'kept') {
    return run(async () => {
      out.server = await fetch('robots.txt?alive=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? 'up' : 'answered ' + r.status), () => 'gone');
      const h = await open(''); const res = {}; out.jobs.kept = res;
      if (!h.ctx) { res.error = 'the app did not boot'; return; }
      const ctx = h.ctx; const doc = h.doc;
      res.controlled = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
      const plan = await ctx.trip.start(TRIP);
      await until(() => ctx.trip.state.phase === 'intro', 20000);
      res.count = plan && plan.count; res.dropped = plan && (plan.dropped || []).map((d) => d.id);
      const btn = await until(() => doc.querySelector('.sr-tripsheet__keep'), 15000);
      await sleep(1500);
      res.row = btn ? { label: text(btn), note: text(doc.querySelector('.sr-tripsheet__keepnote')).slice(0, 200) } : 'no button';
      await h.shot('kept-intro', 300);
      ctx.trip.play();
      res.stops = [];
      for (let n = 0; n < (plan ? plan.count : 0) && left() > 40000; n++) {
        if (n > 0) ctx.trip.next();
        const ok = await until(() => ['dwell', 'held'].includes(ctx.trip.state.phase) && ctx.trip.state.index === n, 45000, 100);
        await sleep(2500);
        const heroes = ctx.heroes && ctx.heroes.count ? ctx.heroes.count() : null;
        res.stops.push(`${n}:${ctx.trip.state.stopId}:${ok ? 'ok' : ctx.trip.state.phase}:h${heroes}`);
        if (n === 1 || n === 4 || n === (plan.count - 1)) await h.shot(`kept-stop-${n + 1}`, 1500);
      }
      const ents = performance.getEntriesByType('resource');
      res.requests = ents.length;
      res.failed = ents.filter((e) => e.responseStatus === 0 || e.responseStatus >= 400).map((e) => `${e.name.replace(location.origin, '').slice(0, 80)} ${e.responseStatus}`).slice(0, 25);
      res.errors = h.errors.slice(0, 8); res.warns = h.warns.slice(0, 12);
    });
  }
  if (mode === 'phone') {
    return run(async () => {
      const h = await open(''); const res = {}; out.jobs.phone = res;
      if (!h.ctx) { res.error = 'the app did not boot'; return; }
      const ctx = h.ctx; const doc = h.doc;
      res.window = [innerWidth, innerHeight, devicePixelRatio];
      ctx.setObserver(PLACE);
      try { await keepRow(h, res, 'phone', 45000); } catch (e) { res.keepError = String(e && e.stack || e).slice(0, 260); }
      try { ctx.trip.stop('leave'); } catch { /* none ran */ }
      await sleep(2500);
      if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
      try { await searchJob(h, res, 'phone'); } catch (e) { res.searchError = String(e && e.stack || e).slice(0, 260); }
      try {
        const rec = await until(() => ctx.recordById('star-proxima-cen'), 20000, 500);
        if (rec) {
          await h.goTo(rec, 25000);
          await sleep(2500);
          const about = [...doc.querySelectorAll('.sr-card button, .sr-card summary')].find((x) => /^\s*About it\s*$/.test(x.textContent || ''));
          if (about) { about.click(); await sleep(600); }
          const card = doc.querySelector('#sr-card, .sr-card');
          const rowEl = card ? [...card.querySelectorAll('*')].find((n) => n.children.length === 0 && /^\s*Glow\s*$/.test(n.textContent || '')) : null;
          if (rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({ block: 'center' });
          const val = rowEl && rowEl.parentElement ? rowEl.parentElement : null;
          res.glow = { row: !!rowEl, text: val ? text(val).slice(0, 140) : (text(card).match(/Glow.{0,110}/) || [''])[0], overflow: val ? val.scrollWidth > val.clientWidth + 1 : null, cardOverflow: card ? card.scrollWidth > card.clientWidth + 1 : null };
          await h.shot('phone-glow-row', 600);
          ctx.select(null);
        } else res.glow = 'no record';
      } catch (e) { res.glowError = String(e && e.stack || e).slice(0, 260); }
      try { await pairsJob(h, res, 'phone'); } catch (e) { res.pairsError = String(e && e.stack || e).slice(0, 260); }
      try { await followJob(h, res, 'phone'); } catch (e) { res.followError = String(e && e.stack || e).slice(0, 260); }
      res.pageOverflow = doc.documentElement.scrollWidth > innerWidth + 1;
      res.errors = h.errors.slice(0, 8); res.warns = h.warns.slice(0, 8);
    });
  }
  out.errors.push('unknown probe ' + mode);
  return out;
})()
