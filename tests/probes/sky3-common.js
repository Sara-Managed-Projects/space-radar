// The sky from the ground, round three: what the three probes share (pasted in front of each by
// the run line in tests/probes/sky3-README.txt). Runs inside the page, through tools/cdp.mjs.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar;
const out = { tReady: Date.now() - t0, errors: [] };
window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
const A = await import('/vendor/astronomy.js');
const DEG = Math.PI / 180;
const place = (name, latDeg, lonDeg) => ({ name, latDeg, lonDeg, latRad: latDeg * DEG, lonRad: lonDeg * DEG, altKm: 0, source: 'manual' });
const sunAt = (p, ms) => { const o = new A.Observer(p.latDeg, p.lonDeg, 0); const d = new Date(ms); const eq = A.Equator('Sun', d, o, true, true); const h = A.Horizon(d, o, eq.ra, eq.dec, 'normal'); return { alt: h.altitude, az: h.azimuth }; };
/** The first instant after `fromMs` when the Sun is at `alt` degrees going down. */
const sunDown = (p, fromMs, alt) => A.SearchAltitude('Sun', new A.Observer(p.latDeg, p.lonDeg, 0), -1, new Date(fromMs), 2, alt).date.getTime();
async function stand(p) {
  ctx.setObserver(p);
  ctx.setMoment('now');
  await wait(300);
  if (!ctx.skyView.active) ctx.skyView.enter(p);
  const s0 = Date.now();
  while (!ctx.skyView.ownsSky && Date.now() - s0 < 20000) await wait(200);
  await wait(1500);
}
const stats = () => { const g = ctx.skyView.groundStats() || {}; return { stars: g.stars, drawn: g.drawn, limit: g.limit && +g.limit.toFixed(2), tileStars: g.tileStars, tiles: g.tiles, landscape: g.landscape, sea: g.sea, con: g.con, trails: g.trails, meteorNote: g.meteorNote && { showers: g.meteorNote.showers, perHour: g.meteorNote.perHour, sources: g.meteorNote.sources }, sun: ctx.skyView.sun, look: ctx.skyView.look, fov: ctx.skyView.fovDeg }; };
const shot = async (name) => { await wait(900); out[name] = stats(); await window.cdpShot(name); };
