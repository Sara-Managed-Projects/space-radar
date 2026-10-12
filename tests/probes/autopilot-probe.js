// Probe for tools/cdp.mjs: a screen that plays on its own (ui/autopilot.js, spec 0036).
//
// Three runs, chosen by `?probe=` in the address (the app ignores it). Serve site/ first
// (`python3 tools/serve.py site 8377`), then, one Chrome at a time:
//
//   1. THE WALK: three trips and twelve stops of the lobby reel at the test pace, a frame at every
//      stop, the watchdog's log, the renderer's counts after each trip, the kiosk's manners.
//        node tools/cdp.mjs 'http://localhost:8377/?sw=0&probe=walk#ambient=lobby&pace=8' \
//          tests/probes/autopilot-probe.js --width=1440 --height=900 --gl=gpu --net=4g \
//          --block=celestrak.org,ll.thespacedevs.com --shot-dir=/tmp/autopilot
//   2. NO INTERNET: the same walk with every outside host unresolvable (`--only-local`): trips
//      whose data is not there are left out, and nothing is said on screen.
//        ... 'http://localhost:8377/?sw=0&probe=offline#ambient=classroom-45&pace=8' ... --only-local
//   3. A LOST CONTEXT: the app in a frame of this probe's own page, so the probe outlives the
//      app's reload. The context is lost and handed back (no reload), then lost and kept (the page
//      reloads and goes on from the same stop).
//        ... 'http://localhost:8377/robots.txt?probe=lost' ...
//
// Returns JSON (tools/cdp.mjs runs this file as a function body).
return (async () => {
  const mode = new URLSearchParams(location.search).get('probe') || 'walk';
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 200) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { const v = await fn(); if (v) return v; } catch { /* not yet */ }
      await sleep(step);
    }
    return null;
  };
  const shot = async (name) => { if (window.cdpShot) await window.cdpShot(name); };
  const t0 = Date.now();
  const secs = () => Math.round((Date.now() - t0) / 100) / 10;
  const out = { mode, url: location.href };
  const shown = (w, sel) => [...w.document.querySelectorAll(sel)].filter((n) => {
    const cs = w.getComputedStyle(n);
    const r = n.getBoundingClientRect();
    return cs.display !== 'none' && cs.visibility !== 'hidden' && Number(cs.opacity) > 0.05 && r.width > 0 && r.height > 0;
  }).length;
  /** What is on screen that should not be, and what should be. */
  const manners = (w) => ({
    ambientClass: w.document.documentElement.classList.contains('sr-ambient'),
    present: w.document.documentElement.classList.contains('sr-present'),
    side: shown(w, '#sr-side'), rail: shown(w, '#sr-rail'), pill: shown(w, '#sr-time'), top: shown(w, '#sr-top'),
    toolbar: shown(w, '.sr-trip__toolbar'), tripTop: shown(w, '.sr-trip__top'), toast: shown(w, '.sr-toast'),
    note: shown(w, '.sr-scenenote'), hint: shown(w, '.sr-keyhint'), panel: shown(w, '.sr-tripsheet__panel'),
    caption: shown(w, '.sr-tripsheet.is-present'), mark: shown(w, '.sr-ambient__mark'),
    card: shown(w, '.sr-ambient__card'), take: shown(w, '.sr-ambient__take'),
    captionText: ((w.document.querySelector('.sr-tripsheet.is-present') || {}).innerText || '').replace(/\s+/g, ' ').slice(0, 90),
    cursor: (() => { const s = w.document.querySelector('.sr-ambient__shield'); return s ? w.getComputedStyle(s).cursor : null; })(),
  });

  /** Follow a reel in window `w` until `wantTrips` trips and `wantStops` stops, or `budgetMs`. */
  async function walk(w, tag, wantTrips, wantStops, budgetMs) {
    const pilot = await until(() => w.spaceRadar && w.spaceRadar.autopilot && w.spaceRadar.autopilot.engaged && w.spaceRadar.autopilot, 120000);
    const res = { engagedAt_s: secs(), frames: [], manners: null };
    if (!pilot) { res.failed = 'the autopilot never started'; return res; }
    const trip = w.spaceRadar.trip;
    let seen = '';
    const end = Date.now() + budgetMs;
    while (Date.now() < end) {
      const st = trip.state;
      const key = `${st.tourId}:${st.index}`;
      if (st.phase === 'dwell' && key !== seen) {
        seen = key;
        const name = `${tag}-${String(res.frames.length + 1).padStart(2, '0')}-${st.tourId}-${st.index + 1}`;
        await shot(name);
        res.frames.push({ name, at_s: secs(), memory: pilot.state().memory });
        if (res.frames.length === 2) res.manners = manners(w);
      }
      const log = pilot.log();
      const ends = log.filter((l) => l.what === 'trip-end' || l.what === 'skip').length;
      if (ends >= wantTrips && res.frames.length >= wantStops) break;
      await sleep(100);
    }
    return res;
  }
  const summary = (pilot) => {
    const log = pilot.log();
    return {
      state: pilot.state(),
      trips: log.filter((l) => l.what === 'trip-end').map((l) => ({ trip: l.trip, stops: l.stops, s: l.s, mem: l.mem })),
      skips: log.filter((l) => l.what === 'skip'),
      watchdog: log.filter((l) => l.what === 'watchdog'),
      stops: log.filter((l) => l.what === 'stop').length,
      other: log.filter((l) => !['stop', 'trip-end', 'trip-start', 'skip', 'watchdog'].includes(l.what)),
    };
  };

  if (mode === 'walk' || mode === 'offline') {
    out.outside = await fetch('https://www.spaceradar.ai/robots.txt', { mode: 'no-cors', cache: 'no-store' }).then(() => 'reachable', () => 'unreachable');
    out.bootChromeHidden = await until(() => document.documentElement.classList.contains('sr-ambient') && { side: shown(window, '#sr-side'), rail: shown(window, '#sr-rail') }, 30000);
    const res = await walk(window, mode, 3, 12, 170000);
    Object.assign(out, res);
    const pilot = window.spaceRadar && window.spaceRadar.autopilot;
    if (!pilot) return out;
    Object.assign(out, summary(pilot));
    out.walked_s = secs();
    // The pointer hides after three seconds still (the probe has not moved it).
    out.cursorAfterStill = manners(window).cursor;
    // A key offers the controls; the reel goes on behind the offer.
    if (window.cdpInput) {
      await window.cdpInput('key', 'x');
      await sleep(400);
      out.afterKey = { take: shown(window, '.sr-ambient__take'), mode: pilot.state().mode, phase: window.spaceRadar.trip.state.phase };
      await shot(`${mode}-offer`);
      // Escape takes them: the panels come back and the trip stops where it is.
      await window.cdpInput('key', 'Escape');
      await sleep(1500);
      out.afterEscape = { mode: pilot.state().mode, active: pilot.active, tripPhase: window.spaceRadar.trip.state.phase, side: shown(window, '#sr-side'), ambientClass: document.documentElement.classList.contains('sr-ambient'), hash: location.hash };
      await shot(`${mode}-taken`);
    }
    out.wakeLock = 'wakeLock' in navigator;
    return out;
  }

  // --- a lost context: the app in a frame, so this probe outlives the app's reload ---------------------
  await until(() => document.body, 10000);
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;background:#000';
  frame.src = new URL('./?sw=0#ambient=lobby&pace=4', location.href).href;
  document.body.textContent = '';
  document.body.appendChild(frame);
  const W = () => frame.contentWindow;
  const pilotOf = () => W().spaceRadar && W().spaceRadar.autopilot && W().spaceRadar.autopilot.engaged && W().spaceRadar.autopilot;
  const lose = () => {
    const gl = W().spaceRadar.renderer.getContext();
    const ext = gl.getExtension('WEBGL_lose_context');
    ext.loseContext();
    return ext;
  };
  let pilot = await until(pilotOf, 150000);
  if (!pilot) { out.failed = 'the autopilot never started in the frame'; return out; }
  // Part 1: at the second stop, lose the context and hand it back after two seconds.
  await until(() => W().spaceRadar.trip.state.index >= 1 && W().spaceRadar.trip.state.phase === 'dwell', 60000);
  await shot('lost-1-before');
  const ext = lose();
  await sleep(2000);
  out.lostSeen = pilot.log().some((l) => l.what === 'context-lost');
  await shot('lost-2-lost');
  ext.restoreContext();
  await sleep(3000);
  out.restoredSeen = pilot.log().some((l) => l.what === 'context-restored');
  out.reloadsAfterRestore = pilot.log().filter((l) => l.what === 'reload').length;
  await shot('lost-3-restored');
  // Part 2: at the next stop, lose it and keep it. The page reloads and goes on from that stop.
  const at = await until(() => { const st = W().spaceRadar.trip.state; return st.phase === 'dwell' && st.index >= 2 && { trip: st.tourId, stop: st.index + 1, hash: W().location.hash }; }, 60000);
  out.lostAt = at;
  const before = W().spaceRadar;
  lose();
  const reloaded = await until(() => W().spaceRadar && W().spaceRadar !== before && pilotOf(), 90000);
  out.reloaded = !!reloaded;
  out.reload_s = secs();
  if (!reloaded) { out.logAtFailure = (() => { try { return JSON.parse(W().sessionStorage.getItem('sr:ambient:log')); } catch { return null; } })(); return out; }
  pilot = reloaded;
  const resumed = await until(() => { const st = W().spaceRadar.trip.state; return st.phase === 'dwell' && { trip: st.tourId, stop: st.index + 1 }; }, 60000);
  out.resumedAt = resumed;
  await sleep(600);
  await shot('lost-4-resumed');
  const log = pilot.log();
  out.log = log.filter((l) => ['context-lost', 'context-restored', 'reload', 'reload-held', 'start', 'trip-start', 'watchdog'].includes(l.what));
  out.manners = manners(W());
  return out;
})();
