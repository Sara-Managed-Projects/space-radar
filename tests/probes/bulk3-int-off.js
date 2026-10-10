// offline, internal #564. Visit 1 (server up, ?sw=1): keep moon-landings with the intro's own button.
// Visit 2 (same --profile, server stopped): the device says it is offline; play the trip; no texture may fail.
return (async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const until = async (fn, ms, step = 250) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); } return null; };
  const out = { controlledAtStart: !!(navigator.serviceWorker && navigator.serviceWorker.controller), onLineReal: navigator.onLine };
  out.server = await fetch('robots.txt?probe=' + Date.now(), { cache: 'no-store' }).then((r) => (r.ok ? 'up' : 'answered ' + r.status), () => 'gone');
  const gone = out.server === 'gone';
  if (gone) { Object.defineProperty(navigator, 'onLine', { configurable: true, get: () => false }); window.dispatchEvent(new Event('offline')); }
  out.booted = !!(await until(() => window.spaceRadar && window.spaceRadar.trip, 120000));
  out.layersReady = !!(await until(() => window.__srLayersReady, 120000));
  const ctx = window.spaceRadar; if (!ctx) return out;
  out.tier0 = ctx.quality && ctx.quality.tier;
  out.controlled = !!(await until(() => navigator.serviceWorker.controller, 60000));
  out.net = await until(() => ctx.net && ctx.net.worker !== 'none' && { ...ctx.net }, 20000);
  const bad = () => performance.getEntriesByType('resource').filter((r) => r.responseStatus === 0 || r.responseStatus >= 400).map((r) => r.name.replace(location.origin, '')).filter((n) => !/robots\.txt\?probe/.test(n));
  const trip = ctx.trip;
  await trip.start('moon-landings'); await until(() => trip.state.phase === 'intro', 20000);
  if (!gone) {
    const btn = await until(() => document.querySelector('.sr-tripsheet__keep'), 20000);
    out.keepButton = btn ? btn.textContent.trim() : null;
    if (btn) { btn.click(); const note = await until(() => { const n = document.querySelector('.sr-tripsheet__keepnote'); return n && !n.hidden && n.textContent; }, 150000, 500); out.keepNote = note; out.keepLabel = btn.textContent.trim(); }
    await window.cdpShot('off-1-kept');
  } else {
    out.keptLabel = ((await until(() => document.querySelector('.sr-tripsheet__keep'), 8000)) || {}).textContent || null;
  }
  trip.play(); const reached = [];
  for (let n = 0; n < 4; n++) {
    await until(() => { const ph = trip.state.phase; if (ph === 'flight') { try { ctx.cameraRig.finishFlight(); } catch { /* fine */ } } return ph === 'dwell' || ph === 'settle' || ph === 'held'; }, 30000, 100);
    reached.push([trip.state.index, trip.state.stopId, trip.state.phase]); await sleep(4000);
    if (n === 1) await window.cdpShot(gone ? 'off-2-stop2' : 'off-1-stop2');
    if (n < 3) trip.next(); await sleep(400);
  }
  out.reached = reached;
  await sleep(gone ? 15000 : 6000);
  out.tierEnd = ctx.quality && ctx.quality.tier; out.ceiling = ctx.quality && ctx.quality.ceiling;
  out.failedOffline = bad(); out.failedTextures = out.failedOffline.filter((n) => /textures\/|\.webp|\.ktx2|\.avif|\.jpg|\.png/.test(n));
  out.textureRequests = performance.getEntriesByType('resource').filter((r) => /textures\//.test(r.name)).map((r) => r.name.split('/').pop() + ':' + r.responseStatus).slice(0, 40);
  if (gone) {
    // informational: the server still gone, but the device now says it is online (a site that is down, not a device offline)
    const n0 = out.failedOffline.length; delete navigator.onLine; window.dispatchEvent(new Event('online')); await sleep(15000);
    out.onLineAgain = navigator.onLine; out.failedWhenOnlineSaysYes = bad().slice(n0);
  }
  try { trip.stop('leave'); } catch { /* none */ }
  return out;
})()
