// Probe for tools/cdp.mjs: the offline proof for site/sw.js (issues #290, #453; docs/RUN_LOCALLY.md).
//
//   # a stamped copy in a SUBFOLDER, with a saved data copy in it
//   mkdir -p /tmp/proof/classroom && cp -R site /tmp/proof/classroom/space-radar
//   python3 scripts/save_offline_data.py --out /tmp/proof/classroom/space-radar/data/v1   (or copy one)
//   python3 scripts/stamp_sw.py --site /tmp/proof/classroom/space-radar
//   python3 tools/serve.py /tmp/proof 8391 &
//   U='http://localhost:8391/classroom/space-radar/?sw=1'
//   node tools/cdp.mjs "$U" tests/probes/offline-probe.js --profile=/tmp/proof-profile --only-local --autoplay   # visit 1
//   kill %1                                                                                                    # the server is gone
//   node tools/cdp.mjs "$U" tests/probes/offline-probe.js --profile=/tmp/proof-profile --only-local --autoplay --shot=offline.png
//
// Both runs do the same things and report what they found; the second run's `controlled: true` and
// `server: 'gone'` are what make it the proof. Returns JSON (tools/cdp.mjs runs this file as a function body).
return (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 250) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) {
      try { const v = await fn(); if (v) return v; } catch { /* not yet */ }
      await sleep(step);
    }
    return null;
  };
  const out = { url: location.href, controlledAtStart: !!(navigator.serviceWorker && navigator.serviceWorker.controller) };
  const t0 = performance.now();
  out.server = await fetch('robots.txt?probe=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? 'up' : 'answered ' + r.status), () => 'gone');

  out.booted = !!(await until(() => window.spaceRadar && window.spaceRadar.trip, 120_000));
  out.layersReady = !!(await until(() => window.__srLayersReady, 180_000));
  out.layersReadyMs = Math.round(performance.now() - t0);
  const ctx = window.spaceRadar;
  if (!ctx) return out;

  // The worker: registered six seconds after the layers, then it takes this page and is told what to keep.
  out.controlled = !!(await until(() => navigator.serviceWorker.controller, 60_000));
  out.net = await until(() => ctx.net && ctx.net.worker !== 'none' && { ...ctx.net }, 20_000);
  const cacheCounts = async () => {
    const o = {};
    for (const name of await caches.keys()) o[name] = (await (await caches.open(name)).keys()).length;
    return o;
  };

  // A trip: start it, play, and walk three stops with the voice on (the clips are fetched, kept, and decoded).
  const trip = ctx.trip;
  out.trip = { id: 'moon-landings' };
  try {
    const plan = await trip.plan(out.trip.id);
    out.trip.offerable = !!(plan && plan.offerable);
    // The plan's stop count is `count` (ui/trip.js plannedShape); `stops` was never a field of it (internal #415 item 9).
    out.trip.stops = plan && Number.isFinite(plan.count) ? plan.count : plan && plan.stops ? plan.stops.length : null;
    if (ctx.audio && ctx.audio.setEnabled) { try { await ctx.audio.setEnabled(true); } catch { /* no sound API here */ } }
    await trip.start(out.trip.id);
    await sleep(300);
    trip.play();
    const reached = [];
    for (let n = 0; n < 3; n += 1) {
      await until(() => {
        const ph = trip.state.phase;
        if (ph === 'flight' && ctx.cameraRig) { try { ctx.cameraRig.finishFlight(); } catch { /* fine */ } }
        return ph === 'dwell' || ph === 'settle' || ph === 'held';
      }, 30_000, 100);
      reached.push({ index: trip.state.index, phase: trip.state.phase });
      await sleep(2500);
      if (n < 2 && trip.next) trip.next();
      await sleep(400);
    }
    out.trip.reached = reached;
    // The stop's title in the trip frame as it is built today (ui/tripframe.js `.sr-trip__title`); the older names stay for an older build.
    out.trip.card = (document.querySelector('.sr-trip__title, .sr-trip__titles, .sr-trip__text, .sr-trip__body, .sr-tripframe__text') || {}).textContent || null;
    if (out.trip.card) out.trip.card = out.trip.card.slice(0, 90);
    if (trip.stop) trip.stop(); else if (trip.leave) trip.leave();
  } catch (e) {
    out.trip.error = String((e && e.message) || e);
  }
  await sleep(1500);

  // Tonight: the tab, its view, and what it says.
  try {
    const tab = [...document.querySelectorAll('[role="tab"]')].find((b) => /tonight/i.test(b.textContent || ''));
    if (tab) tab.click();
    const view = await until(() => document.querySelector('.sr-tonight-view'), 30_000);
    await sleep(6000);
    out.tonight = view ? { rendered: true, text: (view.innerText || view.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 260) } : { rendered: false };
  } catch (e) {
    out.tonight = { error: String((e && e.message) || e) };
  }

  out.statusLine = (document.querySelector('.sr-statusline__text') || {}).textContent || null;
  out.satellites = ctx.recordsFor ? ['stations', 'active', 'starlink', 'gps'].map((l) => { try { return [l, ctx.recordsFor(l).length]; } catch { return [l, null]; } }) : null;
  out.sources = ctx.sources && ctx.sources.status ? ctx.sources.status().filter((r) => r.attempted || r.fetchedAt).map((r) => `${r.id}:${r.via || 'none'}:${r.state}`) : null;
  // Give the worker time to keep what this visit used, then count.
  await sleep(8000);
  out.caches = await cacheCounts();
  const res = performance.getEntriesByType('resource');
  out.requests = res.length;
  out.failed = res.filter((r) => r.responseStatus === 0 && r.transferSize === 0 && r.decodedBodySize === 0 && !r.name.startsWith(location.origin)).length;
  out.totalMs = Math.round(performance.now() - t0);
  return out;
})()
