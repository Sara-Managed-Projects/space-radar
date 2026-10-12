// Probe for tools/cdp.mjs: trips, round five (internal #322, #448, #304, #119). Chosen by `?probe=`.
// Serve site/ first (`python3 tools/serve.py site 8455`), one Chrome at a time, `--gl=gpu --net=4g
// --block=celestrak.org,ll.thespacedevs.com --shot-dir=<dir>`:
//
//   flight   '/?sw=0&probe=flight'  1440x900
//            SLOW FRAMES ON A FAST MACHINE: an animation-frame callback that burns `busy` ms makes
//            every frame that long, which is what a slow device (or SwiftShader) does. Trips are
//            started one on the heels of another and each first flight is timed by the wall:
//            fast frames, then 3 fps, then one-second frames. Run it on the commit before the fix
//            and after it; the same file works on both. With `&extras=1` (after the fix): the Trips
//            section with "Just watch" open, and the roof trip's flight home.
//   lost     '/robots.txt?probe=lost' --only-local  1440x900
//            The app in a frame, with no internet. The sound card; a context lost at a stop and
//            kept (the page reloads: at which stop does it go on?); the card between two trips and
//            what is named under it; the living Earth's map stops with no maps to fetch.
//   phone    '/?sw=0&probe=phone' --mobile --width=390 --height=844
//            "Just watch" on a phone, the card between two trips, a trip's end card with its stamp,
//            the passport and Forget me.
return (async () => {
  const q = new URLSearchParams(location.search);
  const mode = q.get('probe') || 'flight';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 100) => {
    const t0 = performance.now();
    while (performance.now() - t0 < ms) {
      try { const v = await fn(); if (v) return v; } catch { /* not yet */ }
      await sleep(step);
    }
    return null;
  };
  const shot = async (name) => { if (window.cdpShot) await window.cdpShot(name); };
  const T0 = performance.now();
  const secs = () => Math.round((performance.now() - T0) / 100) / 10;
  const out = { mode, url: location.href };
  const visible = (w, sel) => [...w.document.querySelectorAll(sel)].filter((n) => {
    const cs = w.getComputedStyle(n);
    const r = n.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
  });
  const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');

  // ------------------------------------------------------------------------------------------ flight
  if (mode === 'flight') {
    await until(() => window.__srLayersReady === true, 120000);
    const sr = window.spaceRadar;
    if (sr.loadAfterFirstVisit) await Promise.race([sr.loadAfterFirstVisit().catch(() => {}), sleep(20000)]);
    await sleep(1500);
    out.ready_s = secs();
    if (q.get('extras')) {
      const own = [...document.querySelectorAll('.sr-more')].find((b) => /Play on its own/.test(b.textContent) && b.getBoundingClientRect().width > 0);
      if (own) {
        own.scrollIntoView({ block: 'center' });
        own.click();
        const rows = await until(() => visible(window, '.sr-reels .sr-list__btn').length >= 3 && visible(window, '.sr-reels .sr-list__btn'), 8000);
        out.justWatch = { heading: text(document.querySelector('.sr-reels .sr-micro')), rows: (rows || []).map(text), expanded: own.getAttribute('aria-expanded') };
        await sleep(300);
        await shot('picker-1440');
      } else out.justWatch = 'no button';
    }
    let busy = 0;
    let frames = 0;
    (function spin() {
      requestAnimationFrame(spin);
      frames += 1;
      if (busy > 0) { const t = performance.now(); while (performance.now() - t < busy) { /* a slow frame */ } }
    })();
    const phases = [];
    sr.trip.onChange((st) => {
      const k = `${st.tourId || '-'}:${st.phase}:${st.index}`;
      if (!phases.length || phases[phases.length - 1].k !== k) phases.push({ k, id: st.tourId, phase: st.phase, index: st.index, at: performance.now() });
    });
    const spent = (id, phase, since) => {
      let ms = 0;
      phases.forEach((p, i) => { if (p.id === id && p.phase === phase && p.at >= since) ms += (phases[i + 1] ? phases[i + 1].at : performance.now()) - p.at; });
      return Math.round(ms);
    };
    /** Start `id` (leaving whatever runs), fly to its stop `n`, and time the flight by the wall. */
    async function first(id, n, frameMs, capMs) {
      const row = { id, stop: n + 1, frameMs };
      const left = performance.now();
      try { sr.trip.stop('leave'); } catch { /* nothing ran */ }
      busy = frameMs;
      const plan = await sr.trip.start(id);
      if (!plan || plan.offerable === false) { busy = 0; row.error = `cannot run: ${(plan && plan.reason) || 'no plan'}`; return row; }
      await until(() => sr.trip.state.phase === 'intro', 20000);
      if (n > 0) sr.trip.jumpTo(n);
      const f0 = frames;
      const t0 = performance.now();
      row.startedAfterLeave_ms = Math.round(t0 - left);
      sr.trip.play();
      const ok = await until(() => ['settle', 'dwell', 'held'].includes(sr.trip.state.phase), capMs, 50);
      row.arrived = !!ok;
      row.toArrive_ms = Math.round(performance.now() - t0);
      row.flight_ms = spent(id, 'flight', t0);
      row.veil_ms = spent(id, 'veil', t0);
      row.fps = Math.round(((frames - f0) / Math.max(1, performance.now() - t0)) * 10000) / 10;
      const dw = await until(() => sr.trip.state.phase === 'dwell' || sr.trip.state.phase === 'held', 20000, 50);
      row.settle_ms = dw ? spent(id, 'settle', t0) : null;
      row.phaseAtEnd = sr.trip.state.phase;
      busy = 0;
      return row;
    }
    out.rows = [];
    // Fast frames first: what each flight takes when nothing is slow.
    out.rows.push(await first('strangest-things', 0, 0, 30000));
    out.rows.push(await first('a-year-in-a-minute', 0, 0, 30000));
    out.rows.push(await first('moon-landings', 0, 0, 30000));
    // Three frames a second, each trip started on the heels of the last.
    out.rows.push(await first('strangest-things', 0, 300, 60000));
    out.rows.push(await first('a-year-in-a-minute', 0, 300, 60000));
    out.rows.push(await first('moon-landings', 0, 300, 60000));
    // One-second frames.
    out.rows.push(await first('a-year-in-a-minute', 0, 1000, 90000));
    out.rows.push(await first('strangest-things', 0, 1000, 90000));
    out.flights_s = secs();
    try { sr.trip.stop('leave'); } catch { /* nothing ran */ }
    if (q.get('extras')) {
      // The roof trip's last stop, left to end by itself: the flight home, then the end card.
      await sleep(800);
      const plan = await sr.trip.start('roof-to-the-edge');
      if (!plan || plan.offerable === false) out.home = { error: `cannot run: ${(plan && plan.reason) || 'no plan'}` };
      else {
        await until(() => sr.trip.state.phase === 'intro', 20000);
        sr.trip.jumpTo(plan.count - 1);
        sr.trip.play();
        const home = { count: plan.count, stageAtLast: null, shots: [] };
        await until(() => sr.trip.state.phase === 'dwell', 40000);
        home.stageAtLast = (sr.stage || {}).worldId;
        await shot('home-0-last-stop');
        const began = await until(() => sr.trip.state.returning === true, 90000, 50);
        home.returning = !!began;
        const t0 = performance.now();
        if (began) {
          for (const at of [1500, 5000, 9000, 13000]) {
            await sleep(Math.max(0, at - (performance.now() - t0)));
            if (!sr.trip.state.returning) break;
            await shot(`home-${home.shots.length + 1}`);
            home.shots.push({ at_ms: Math.round(performance.now() - t0), stage: (sr.stage || {}).worldId, km: Math.round(sr.cameraRig.state.distance * ((sr.stage || {}).unitKm || 1)), caption: visible(window, '.sr-tripsheet').length });
          }
          await until(() => sr.trip.state.phase === 'outro', 40000, 50);
          home.flight_ms = Math.round(performance.now() - t0);
        }
        await sleep(900);
        home.end = { phase: sr.trip.state.phase, stage: (sr.stage || {}).worldId, km: Math.round(sr.cameraRig.state.distance * ((sr.stage || {}).unitKm || 1)) };
        await shot('home-9-end-card');
        out.home = home;
        try { sr.trip.stop('leave'); } catch { /* gone */ }
      }
    }
    return out;
  }

  // ------------------------------------------------------------------------------------------ phone
  if (mode === 'phone') {
    await until(() => window.__srLayersReady === true, 120000);
    const sr = window.spaceRadar;
    await sleep(2500);
    out.ready_s = secs();
    out.width = innerWidth;
    const own = await until(() => [...document.querySelectorAll('.sr-more')].find((b) => /Play on its own/.test(b.textContent)), 10000);
    if (own) {
      // The sheet is at its peek on a phone: the Trips section is reached by opening it.
      const sheet = sr.mobile && sr.mobile.sheet;
      try { if (sheet && sheet.setDetent) sheet.setDetent('full'); } catch { /* no sheet */ }
      await sleep(700);
      own.scrollIntoView({ block: 'center' });
      await sleep(300);
      own.click();
      const rows = await until(() => visible(window, '.sr-reels .sr-list__btn').length >= 3 && visible(window, '.sr-reels .sr-list__btn'), 8000);
      const last = rows && rows[rows.length - 1];
      if (last) last.scrollIntoView({ block: 'center' });
      await sleep(400);
      out.justWatch = {
        rows: (rows || []).map((b) => ({ text: text(b), h: Math.round(b.getBoundingClientRect().height), right: Math.round(b.getBoundingClientRect().right) })),
        overflowX: document.documentElement.scrollWidth > innerWidth,
      };
      await shot('phone-1-just-watch');
      // The second row: a reel that asks for sound, so the sound card is the first thing up.
      const lesson = (rows || []).find((b) => b.dataset.reel === 'classroom-45');
      if (lesson) {
        lesson.click();
        const gate = await until(() => visible(window, '.sr-ambient__card')[0], 20000);
        out.soundCard = gate ? { kind: gate.dataset.kind, text: text(gate).slice(0, 160), box: (({ left, top, width, height }) => [left, top, width, height].map(Math.round))(gate.getBoundingClientRect()) } : null;
        await sleep(300);
        await shot('phone-2-sound-card');
        const next = await until(() => { const c = visible(window, '.sr-ambient__card')[0]; return c && c.dataset.kind === 'title' && c; }, 30000, 50);
        out.betweenCard = next ? { text: text(next).slice(0, 200), names: visible(window, '#labels .label').length, box: (({ left, top, width, height }) => [left, top, width, height].map(Math.round))(next.getBoundingClientRect()) } : null;
        await shot('phone-3-next-trip-card');
        // Escape: started from the row, taking the controls ends the mode.
        if (window.cdpInput) { await window.cdpInput('key', 'Escape'); await sleep(1500); }
        out.afterEscape = { engaged: !!(sr.autopilot && sr.autopilot.engaged), ambient: document.documentElement.classList.contains('sr-ambient'), trip: sr.trip.state.phase };
        if (sr.autopilot && sr.autopilot.engaged) sr.autopilot.stop();
        try { sr.trip.stop('leave'); } catch { /* nothing ran */ }
        await sleep(800);
      }
    } else out.justWatch = 'no button';
    // A trip to its end card, on a phone: the stamp (spec 0041).
    const plan = await sr.trip.start('a-year-in-a-minute');
    if (plan && plan.offerable !== false) {
      await until(() => sr.trip.state.phase === 'intro', 20000);
      sr.trip.jumpTo(plan.count - 1);
      sr.trip.play();
      await until(() => sr.trip.state.phase === 'dwell', 40000);
      sr.trip.next();
      await until(() => sr.trip.state.phase === 'outro', 10000);
      await sleep(1500);
      const sheet = visible(window, '.sr-tripsheet')[0];
      out.endCard = { phase: sr.trip.state.phase, text: text(sheet).slice(0, 400), stamp: text(document.querySelector('[class*="stamp"]')).slice(0, 160), overflowX: document.documentElement.scrollWidth > innerWidth };
      await shot('phone-4-end-card');
      try { sr.trip.stop('leave'); } catch { /* gone */ }
      await sleep(800);
    } else out.endCard = { error: plan && plan.reason };
    // The passport and Forget me.
    const passport = sr.wantPassport ? await sr.wantPassport() : null;
    if (passport && passport.open) {
      passport.open();
      await sleep(1200);
      const forget = visible(window, '.sr-passport__forget')[0];
      if (forget) forget.scrollIntoView({ block: 'center' });
      await sleep(300);
      out.passport = { forget: forget ? { text: text(forget), h: Math.round(forget.getBoundingClientRect().height), disabled: forget.disabled } : null, page: text(document.querySelector('.sr-passport')).slice(0, 300) };
      await shot('phone-5-passport');
      if (forget && !forget.disabled) {
        forget.click();
        await sleep(300);
        out.passport.confirm = text(forget);
        await shot('phone-6-forget-confirm');
        forget.click();
        await sleep(600);
        out.passport.after = { stored: localStorage.getItem('sr:passport'), page: text(document.querySelector('.sr-passport')).slice(0, 160) };
      }
    } else out.passport = 'no passport';
    return out;
  }

  // ------------------------------------------------------------------------------------------ lost
  await until(() => document.body, 10000);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#000';
  frame.src = new URL('./?sw=0#ambient=a-year-in-a-minute,the-living-earth&pace=3&sound=1', location.href).href;
  document.body.textContent = '';
  document.body.appendChild(frame);
  const W = () => frame.contentWindow;
  const pilotOf = () => W().spaceRadar && W().spaceRadar.autopilot && W().spaceRadar.autopilot.engaged && W().spaceRadar.autopilot;
  const cardOf = (kind) => { const c = visible(W(), '.sr-ambient__card')[0]; return c && (!kind || c.dataset.kind === kind) ? c : null; };
  out.outside = await fetch('https://www.spaceradar.ai/robots.txt', { mode: 'no-cors', cache: 'no-store' }).then(() => 'reachable', () => 'unreachable');
  let pilot = await until(pilotOf, 150000);
  if (!pilot) { out.failed = 'the autopilot never started in the frame'; return out; }
  // 1. The sound card.
  const gate = await until(() => cardOf('gate'), 20000, 50);
  out.soundCard = gate ? text(gate) : null;
  if (gate) await shot('lost-1-sound-card');
  // 2. At the second stop of the first trip: lose the context and keep it.
  const at = await until(() => { const st = W().spaceRadar.trip.state; return st.phase === 'dwell' && st.index >= 1 && { trip: st.tourId, stop: st.index + 1, hash: W().location.hash }; }, 90000, 50);
  out.lostAt = at;
  await shot('lost-2-before');
  const before = W().spaceRadar;
  before.renderer.getContext().getExtension('WEBGL_lose_context').loseContext();
  await sleep(1200);
  out.whileLost = { phase: before.trip.state.phase, pausedBy: before.trip.state.pausedBy, stop: before.trip.state.index + 1, hash: W().location.hash };
  const reloaded = await until(() => W().spaceRadar && W().spaceRadar !== before && pilotOf(), 90000);
  out.reloaded = !!reloaded;
  out.reload_s = secs();
  if (!reloaded) return out;
  pilot = reloaded;
  const resumed = await until(() => { const st = W().spaceRadar.trip.state; return st.phase === 'dwell' && { trip: st.tourId, stop: st.index + 1 }; }, 90000, 50);
  out.resumedAt = resumed;
  await shot('lost-3-resumed');
  // 3. The card between two trips, and what is named under it.
  const next = await until(() => cardOf('title') && W().spaceRadar.trip.state.tourId === 'the-living-earth' && cardOf('title'), 120000, 40);
  if (next) {
    await sleep(250);
    out.betweenCard = { text: text(next), names: visible(W(), '#labels .label').map(text).slice(0, 8), tripMode: W().document.documentElement.classList.contains('sr-trip-mode') };
    await shot('lost-4-next-trip-card');
  } else out.betweenCard = null;
  // 4. The living Earth with no internet: the map stops are passed over.
  const seen = [];
  let last = '';
  await until(() => {
    const st = W().spaceRadar.trip.state;
    if (st.tourId === 'the-living-earth' && st.phase === 'dwell' && st.stopId !== last) { last = st.stopId; seen.push({ n: st.index + 1, id: st.stopId, caption: text(W().document.querySelector('.sr-tripsheet.is-present')).slice(0, 110) }); }
    const log = pilot.log();
    return log.some((l) => l.what === 'trip-end' && l.trip === 'the-living-earth') || seen.length >= 9;
  }, 200000, 100);
  out.livingEarth = seen;
  await shot('lost-5-living-earth-after-the-maps');
  const log = pilot.log();
  out.passed = log.filter((l) => l.what === 'stop-passed');
  out.notArrived = seen.filter((s) => /did not arrive/.test(s.caption)).length;
  out.log = log.filter((l) => ['context-lost', 'context-restored', 'reload', 'reload-held', 'start', 'trip-start', 'trip-end', 'skip', 'watchdog', 'sound'].includes(l.what));
  out.done_s = secs();
  return out;
})();
