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
    /** What a frame costs when the GPU is made to finish it: every render() of one animation frame, summed. */
    h.cost = async (frames = 120, capMs = 15000) => {
      const r = h.ctx.renderer; const gl = r.getContext(); const render = r.render; const per = []; let acc = 0; let on = true;
      r.render = function timed(...a) { const b = performance.now(); const v = render.apply(r, a); gl.finish(); acc += performance.now() - b; return v; };
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
    const mesh = ctx.worlds.meshFor('sun'); const U = mesh.material && mesh.material.uniforms ? mesh.material.uniforms.uGrain : null;
    if (U) {
      let v = U.value; Object.defineProperty(U, 'value', { get: () => 0, set: (x) => { v = x; }, configurable: true });
      await sleep(400);
      res.noGrain = await h.cost();
      delete U.value; U.value = v;
    }
    await h.shot(`${name}-sun`, 800);
    const card = h.card();
    res.cardSpots = (card.match(/[^.]*sunspot[^.]*\.(?:[^.]*(?:leading|illustrative)[^.]*\.)*/gi) || []).join(' ').slice(0, 520);
    res.regionsFrom = h.resources(/solar[-_]regions/);
    // Close on the widest pair, if one is drawn: the disc's centre is the sub-camera point, so step back to the whole disc.
    for (let i = 0; i < 12 && ctx.worlds.discShare('sun') > 0.85; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 1.15, ms: 0 }); await sleep(100); }
    await h.shot(`${name}-sun-whole`, 1200);
  }
  if (mode === 'sun') {
    return run(async () => {
      await job('int-t1', './?sw=0&tier=1', (h, r) => sunJob(h, r, 'int-t1'));
      await job('main-t1', '../main/?sw=0&tier=1', (h, r) => sunJob(h, r, 'main-t1'));
      await job('int-t2', './?sw=0&tier=2', (h, r) => sunJob(h, r, 'int-t2'));
      await job('main-t2', '../main/?sw=0&tier=2', (h, r) => sunJob(h, r, 'main-t2'));
    });
  }

  // --------------------------------------------------------------------------------------------- air
  async function windJob(h, res, name) {
    const ctx = h.ctx;
    ctx.frameEarth(0); await sleep(3000);
    res.off = await h.cost(90, 10000);
    ctx.setOverlay('wind');
    await until(() => ctx.wind, 20000);
    await until(() => { const s = ctx.overlayState(); return s && s.status && !/loading/.test(s.status); }, 25000, 400);
    await sleep(5000);
    res.state = JSON.stringify(ctx.overlayState()).slice(0, 420);
    let streaks = null;
    ctx.scene.traverse((o) => { if (/wind/i.test(o.name || '') && o.geometry) { const g = o.geometry; streaks = { name: o.name, instances: g.instanceCount, pos: g.attributes.position ? g.attributes.position.count : null, draw: g.drawRange ? g.drawRange.count : null, type: o.type }; } });
    res.streaks = streaks;
    res.on = await h.cost(90, 10000);
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
  if (mode === 'air') {
    return run(async () => {
      await job('debris-worker', './?sw=0&tier=1', (h, r) => debrisJob(h, r, 'worker'));
      await job('debris-inpage', './?sw=0&tier=1&worker=0', (h, r) => debrisJob(h, r, 'inpage'));
      for (const t of [2, 1, 0]) await job(`wind-t${t}`, `./?sw=0&tier=${t}`, (h, r) => windJob(h, r, `t${t}`));
    });
  }

  // -------------------------------------------------------------------------------------------- deep
  if (mode === 'deep') {
    return run(async () => {
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
    });
  }

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
    for (let i = 0; i < 40 && ctx.worlds.discShare('sun') < 0.7; i++) { ctx.cameraRig.flyTo({ distance: ctx.cameraRig.state.distance * 0.85, ms: 0 }); await sleep(120); }
    await until(() => ctx.sunDetail && ctx.sunRegions, 20000);
    await sleep(2000);
    res.sun = { state: ctx.sunDetail ? ctx.sunDetail.state() : null, from: h.resources(/solar[-_]regions/), card: (h.card().match(/[^.]*sunspot[^.]*\.(?:[^.]*(?:leading|illustrative)[^.]*\.)*/gi) || []).join(' ').slice(0, 520) };
    await h.shot('ui-sun-spots', 800);
  }
  if (mode === 'ui') {
    return run(async () => {
      await job('ui', './?sw=0&tier=1', async (h, res) => {
        const ctx = h.ctx;
        ctx.setObserver(PLACE);
        if (ctx.loadAfterFirstVisit) await Promise.race([ctx.loadAfterFirstVisit().catch(() => {}), sleep(15000)]);
        for (const [n, f] of [['search', () => searchJob(h, res, 'ui')], ['tonight', () => tonightJob(h, res, 'ui')], ['follow', () => followJob(h, res, 'ui')], ['copies', () => copiesJob(h, res)]]) {
          try { await f(); } catch (e) { res[n + 'Error'] = String(e && e.stack || e).slice(0, 260); }
        }
      });
    });
  }

  // ----------------------------------------------------------------------------- keep, kept, phone
  const cacheCounts = async () => { const o = {}; for (const name of await caches.keys()) o[name] = (await (await caches.open(name)).keys()).length; return o; };
  const TRIP = q.get('trip') || 'moon-landings';
  async function keepRow(h, res, tag, waitMs) {
    const ctx = h.ctx; const doc = h.doc;
    res.controlled = !!(await until(() => navigator.serviceWorker && navigator.serviceWorker.controller, 60000));
    res.net = await until(() => ctx.net && ctx.net.worker !== 'none' && { ...ctx.net }, 20000);
    const plan = await ctx.trip.start(TRIP);
    await until(() => ctx.trip.state.phase === 'intro', 20000);
    res.count = plan && plan.count;
    const btn = await until(() => doc.querySelector('.sr-tripsheet__keep'), 20000);
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
        const rec = await until(() => h.byName(/^Proxima Cen\w* b$/i), 20000, 500);
        if (rec) {
          await h.goTo(rec, 25000);
          let host = null; try { host = ctx.systems.hostRecordFor(rec) || ctx.systems.hostRecordFor(ctx.stage.worldId); } catch { /* another signature */ }
          if (host) ctx.select(host);
          await sleep(3000);
          const card = doc.querySelector('#sr-card, .sr-card');
          const rowEl = card ? [...card.querySelectorAll('*')].find((n) => n.children.length === 0 && /^\s*Glow\s*$/.test(n.textContent || '')) : null;
          if (rowEl && rowEl.scrollIntoView) rowEl.scrollIntoView({ block: 'center' });
          const val = rowEl && rowEl.parentElement ? rowEl.parentElement : null;
          res.glow = { row: !!rowEl, text: val ? text(val).slice(0, 140) : (text(card).match(/Glow.{0,110}/) || [''])[0], overflow: val ? val.scrollWidth > val.clientWidth + 1 : null, cardOverflow: card ? card.scrollWidth > card.clientWidth + 1 : null };
          await h.shot('phone-glow-row', 600);
          ctx.select(null);
        } else res.glow = 'no record';
      } catch (e) { res.glowError = String(e && e.stack || e).slice(0, 260); }
      try { await tonightJob(h, res, 'phone'); await followJob(h, res, 'phone'); } catch (e) { res.followError = String(e && e.stack || e).slice(0, 260); }
      res.pageOverflow = doc.documentElement.scrollWidth > innerWidth + 1;
      res.errors = h.errors.slice(0, 8); res.warns = h.warns.slice(0, 8);
    });
  }
  out.errors.push('unknown probe ' + mode);
  return out;
})()
