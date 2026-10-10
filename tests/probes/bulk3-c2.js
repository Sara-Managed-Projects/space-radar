// tests/probes/bulk3-c2.js -- bulk round three, agent c, second pass: apps in iframes of a plain page.
//   node tools/cdp.mjs 'http://127.0.0.1:PORT/robots.txt?jobs=mw,render,present,event' tests/probes/bulk3-c2.js \
//        --width=1440 --height=900 --gl=gpu --block=celestrak.org,ll.thespacedevs.com --shot-dir=DIR
// mw: the 2k Milky Way panorama in the sky from the ground, beside the star-free 4k one (the haze beside Sirius);
// render: ?render=1 frames in order; present: #present=1 with the arrow keys; event: #event=.
return (async () => {
  const q = new URLSearchParams(location.search);
  const JOBS = (q.get('jobs') || 'mw,render,present,event').split(',');
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const out = { jobs: {}, errors: [] };
  const until = async (fn, ms, step = 200) => { const t = Date.now(); while (Date.now() - t < ms) { try { const v = await fn(); if (v) return v; } catch { /* not yet */ } await sleep(step); } return null; };
  const shot = async (name) => { try { if (window.cdpShot) await Promise.race([window.cdpShot(name), sleep(30000)]); } catch { /* none */ } };
  document.body.textContent = ''; document.body.style.cssText = 'margin:0;background:#000;overflow:hidden';
  async function open(src, needCtx = true) {
    const f = document.createElement('iframe');
    f.style.cssText = 'position:fixed;top:0;left:0;width:100vw;height:100vh;border:0;background:#000';
    f.src = new URL(src, location.href).href; document.body.appendChild(f);
    const w = () => f.contentWindow;
    if (needCtx) await until(() => w().__srLayersReady && w().spaceRadar, 90000, 300);
    return { f, w, ctx: () => w().spaceRadar, doc: () => w().document, close: () => f.remove() };
  }
  const job = async (name, fn) => {
    if (!JOBS.includes(name)) return;
    const res = {}; out.jobs[name] = res; const t = Date.now();
    try { await fn(res); } catch (e) { res.error = String(e && e.stack || e).slice(0, 400); }
    res.s = Math.round((Date.now() - t) / 1000);
  };

  await job('mw', async (res) => {
    const h = await open('./?sw=0&tier=1');
    const ctx = h.ctx(); const w = h.w();
    const DEG = Math.PI / 180;
    const A = await w.eval("import('/vendor/astronomy.js')");
    const london = { name: 'London', latDeg: 51.5, lonDeg: -0.12, latRad: 51.5 * DEG, lonRad: -0.12 * DEG, altKm: 0, source: 'manual' };
    ctx.setObserver(london);
    let when = Date.UTC(2026, 11, 15, 20, 0);
    const altAt = (ms) => A.Horizon(new w.Date(ms), new A.Observer(51.5, -0.12, 0), 6.7525, -16.7161, 'normal').altitude;
    for (let k = 0; k < 14 && !(altAt(when) > 20); k++) when += 3600e3;
    ctx.clock.goTo(when); await sleep(600);
    ctx.skyView.enter(london);
    await until(() => ctx.skyView.ownsSky, 20000);
    await sleep(2500);
    ctx.skyView.setOption('darkness', 'dark');
    ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false });
    await sleep(6000);
    const root = ctx.scene.getObjectByName('ground-sky');
    const mw = root.getObjectByName('ground-milkyway');
    const u = mw.material.uniforms;
    const gl = ctx.renderer.getContext();
    const lum = () => {
      ctx.rendererApi.render();
      const W = gl.drawingBufferWidth, H = gl.drawingBufferHeight; const R = 260; const px = new Uint8Array(4 * R * R);
      gl.readPixels((W - R) >> 1, (H - R) >> 1, R, R, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let sum = 0, lit = 0;
      for (let y = 0; y < R; y++) for (let x = 0; x < R; x++) { const i = 4 * (y * R + x); const l = 0.3 * px[i] + 0.59 * px[i + 1] + 0.11 * px[i + 2]; if (Math.hypot(x - R / 2, y - R / 2) < 16) continue; sum += l; if (l > 14) lit++; }
      return { sum: Math.round(sum), lit };
    };
    res.current = { map: [u.uMap.value.image.width, u.uMap.value.image.height], gain: +u.uGain.value.toFixed(3), ring: lum(), withoutMw: null };
    mw.visible = false; res.current.withoutMw = lum(); mw.visible = true;
    await shot('m1-4k-map');
    // The 2k panorama a phone boots with (and a laptop until its 4k map lands), put in by hand.
    const T = await w.eval("import('/vendor/three.module.min.js')");
    const tex = await new Promise((ok, no) => new T.TextureLoader().load('/textures/2k_stars_milky_way.webp', ok, undefined, no));
    tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 4;
    const old = u.uMap.value; u.uMap.value = tex;
    res.map2k = { size: [tex.image.width, tex.image.height], ring: lum(), withoutMw: null };
    mw.visible = false; res.map2k.withoutMw = lum(); mw.visible = true;
    await sleep(900); await shot('m2-2k-map');
    // Wider fields with the 2k map, where the haze should thin out.
    for (const fov of [24, 40]) {
      ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: fov, instant: true, mark: false }); await sleep(2500);
      const a = lum(); mw.visible = false; const b = lum(); mw.visible = true;
      res['fov' + fov] = { with: a, without: b, gain: +u.uGain.value.toFixed(3) };
    }
    u.uMap.value = old;
    h.close();
  });

  await job('render', async (res) => {
    const h = await open('./?sw=0&render=1#trip=moon-landings', false);
    const r = await until(() => h.w().__srRender, 90000, 300);
    if (!r) { res.state = 'no __srRender'; h.close(); return; }
    const d0 = await Promise.race([r.ready.then(() => r.describe()), sleep(120000).then(() => null)]);
    res.describe = d0 ? { title: d0.title, epoch: d0.epochMs && new Date(d0.epochMs).toISOString(), keys: Object.keys(d0).slice(0, 14) } : 'not ready in 120 s';
    if (d0) {
      const log = []; const t0 = Date.now();
      for (let n = 0; n < 60 && Date.now() - t0 < 150000; n++) {
        const o = await r.frame(n);
        if (n < 4 || n % 12 === 0 || o.done) log.push({ n, phase: o.phase, index: o.index, stop: o.stopId, done: o.done, pending: o.pending });
        if (n === 30) await shot('r1-frame-30');
        if (o.done) break;
      }
      res.frames = log; res.total = r.totalFrames; res.fps = Math.round(60000 / Math.max(1, Date.now() - t0) * 10) / 10;
      let bad = null; try { await r.frame(999); } catch (e) { bad = String(e.message).slice(0, 80); } res.outOfOrder = bad;
    }
    h.close();
  });

  await job('present', async (res) => {
    const h = await open('./?sw=0#trip=moon-phases&present=1');
    const ctx = h.ctx(); const doc = h.doc();
    res.presentClass = doc.documentElement.classList.contains('sr-present');
    await until(() => ctx.trip && ctx.trip.state && ctx.trip.state.phase !== 'idle', 30000);
    await sleep(2500);
    const st = () => { const s = ctx.trip.state; return `${s.phase}/${s.index}/${s.stopId || ''}/${s.pacing || ''}`; };
    const key = (k) => doc.dispatchEvent(new (h.w().KeyboardEvent)('keydown', { key: k, bubbles: true, cancelable: true }));
    res.seq = [st()];
    for (const k of ['ArrowRight', 'ArrowRight', 'ArrowRight', 'ArrowLeft', 'PageDown']) { key(k); await sleep(2500); res.seq.push(`${k}: ${st()}`); }
    res.presentClassAfter = doc.documentElement.classList.contains('sr-present');
    res.pacing = ctx.trip.state.pacing;
    await shot('t1-present');
    h.close();
  });

  await job('event', async (res) => {
    const h = await open('./?sw=0#event=apollo-11.landing');
    const ctx = h.ctx();
    await sleep(6000);
    res.clock = new Date(ctx.clock.now()).toISOString(); res.stage = ctx.stage && ctx.stage.worldId; res.selected = ctx.selected() && ctx.selected().name;
    await shot('e1-event');
    h.close();
  });
  return out;
})()
