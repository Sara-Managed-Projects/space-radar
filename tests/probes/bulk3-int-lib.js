// bulk3 integration probes: the page is /robots.txt; apps run in same-origin iframes (int at ./, main at m/).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const out = { errors: [] };
const JOBS = (new URLSearchParams(location.search).get('jobs') || '').split(',').filter(Boolean);
const until = async (fn, ms, step = 200) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); } return null; };
const shot = async (name, settle = 800) => { await sleep(settle); try { await Promise.race([window.cdpShot(name), sleep(30000)]); } catch { /* none */ } };
document.body.textContent = ''; document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
const tasks = [];
try { new PerformanceObserver((l) => { for (const e of l.getEntries()) tasks.push({ at: Math.round(e.startTime), dur: Math.round(e.duration), who: e.name }); }).observe({ type: 'longtask', buffered: true }); } catch { /* none */ }
async function open(src, { needCtx = true, before = null } = {}) {
  const f = document.createElement('iframe');
  f.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:0;background:#000';
  f.src = new URL(src, location.href).href; const born = performance.now(); document.body.appendChild(f);
  const w = () => f.contentWindow;
  if (before) before(w);
  if (needCtx) { const ok = await until(() => w().__srLayersReady && w().spaceRadar, 90000, 250); if (!ok) out.errors.push('never ready: ' + src); else w().addEventListener('error', (e) => out.errors.push(src + ': ' + String(e.message).slice(0, 160))); }
  const h = { f, w, born, ctx: () => w().spaceRadar, doc: () => w().document, close: () => f.remove() };
  h.goTo = async (id, cap = 25000) => { const ctx = h.ctx(); const rec = ctx.recordById(id); if (!rec) { out.errors.push('no record ' + id); return null; } ctx.select(rec, { fly: true }); const t = Date.now(); await sleep(2500); while (ctx.cameraRig.state.flying && Date.now() - t < cap) await sleep(300); await sleep(1500); return rec; };
  h.frames = async (ms = 3000) => { const W = w(); const a = []; let last = 0, on = true; const raf = (t) => { if (last) a.push(t - last); last = t; if (on) W.requestAnimationFrame(raf); }; W.requestAnimationFrame(raf); await sleep(ms); on = false; a.sort((x, y) => x - y); return a.length ? { n: a.length, p50: +a[a.length >> 1].toFixed(1), p95: +a[Math.floor(a.length * 0.95)].toFixed(1), max: +a[a.length - 1].toFixed(1) } : null; };
  return h;
}
const job = async (name, fn) => { if (JOBS.length && !JOBS.includes(name)) return; const res = {}; out[name] = res; const t = Date.now(); try { await fn(res); } catch (e) { res.error = String(e && e.stack || e).slice(0, 500); } res.s = Math.round((Date.now() - t) / 1000); };
const DEG = Math.PI / 180;
const place = (name, latDeg, lonDeg) => ({ name, latDeg, lonDeg, latRad: latDeg * DEG, lonRad: lonDeg * DEG, altKm: 0, source: 'manual' });
const text = (n) => (n ? (n.innerText || n.textContent || '').replace(/\s+/g, ' ').trim() : '');
const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)]; };
