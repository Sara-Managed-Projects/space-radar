// The small-issues package, desktop walk A (1440 x 900, --gl=gpu): measurements and cards.
//   internal #175  the home view's frame time on this machine's GPU
//   internal #460  the skip links and where focus lands; Back and Forward in a real tab
//   internal #155  a KTX2 file loaded through scene/ktx2.js and drawn; nothing of it asked at boot
//   internal #167, #250, #280, #478  the nebula's photograph, the honest answer, a system's overlays, a pad's card
// Fixture for #155: the `ktx2-probe` artefact of textures.yml as site/data/v1/ktx2-fixture.ktx2.
const q = (a, p) => (a.length ? a[Math.min(a.length - 1, Math.floor(a.length * p))] : null);
const stats = (a) => { const s = a.slice().sort((x, y) => x - y); const r = (v) => (v == null ? null : Math.round(v * 100) / 100); return { n: s.length, median: r(q(s, 0.5)), p95: r(q(s, 0.95)), p99: r(q(s, 0.99)), max: r(s[s.length - 1]), mean: r(s.reduce((x, y) => x + y, 0) / (s.length || 1)) }; };
const bootRequests = () => performance.getEntriesByType('resource').map((e) => e.name.replace(location.origin, ''));

await run('gpu', async () => {
  const gl = ctx.renderer.getContext();
  const ext = gl.getExtension('WEBGL_debug_renderer_info');
  return { renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER), vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR), canvas: [ctx.renderer.domElement.width, ctx.renderer.domElement.height], quality: ctx.quality && ctx.quality.describe ? ctx.quality.describe() : null, ua: navigator.userAgent.slice(0, 140) };
});
out.bootBasis = bootRequests().filter((u) => /basis|ktx2/i.test(u));

// #175: the home view, untouched, after the after-the-first-visit work has settled.
await run('frameTime', async () => {
  await wait(6000);
  const frames = []; let last = 0; let on = true;
  const f = (now) => { if (!on) return; if (last) frames.push(now - last); last = now; requestAnimationFrame(f); };
  requestAnimationFrame(f);
  const w = Date.now(); while (frames.length < 600 && Date.now() - w < 40000) await wait(200);
  on = false;
  const interval = stats(frames);
  // What a frame costs when the GPU is made to finish it: render() and gl.finish(), 120 frames.
  const r = ctx.renderer; const gl = r.getContext(); const render = r.render; const cost = [];
  r.render = function timed(...a) { const b = performance.now(); const v = render.apply(r, a); gl.finish(); cost.push(performance.now() - b); return v; };
  const w2 = Date.now(); while (cost.length < 240 && Date.now() - w2 < 20000) await wait(200);
  r.render = render;
  return { seconds: Math.round((Date.now() - w) / 100) / 10, interval, over33: frames.filter((d) => d > 33).length, over50: frames.filter((d) => d > 50).length, renderAndFinish: stats(cost), info: { calls: r.info.render.calls, triangles: r.info.render.triangles }, latched: !!(ctx.latch && ctx.latch.latched), stage: ctx.stage.worldId, view: ctx.shell.view(), clock: { mode: ctx.clock.mode, rate: ctx.clock.rate }, hidden: document.hidden };
});
await shot('a1-home');

// #460 item 1: the skip links, with real Tab and Enter, and where focus lands.
await run('skip', async () => {
  const o = {};
  document.activeElement && document.activeElement.blur();
  await window.cdpInput('key', 'Tab'); await wait(250);
  o.firstTab = { el: say(document.activeElement), text: text(document.activeElement), box: box(document.activeElement), visible: (() => { const r = document.activeElement.getBoundingClientRect(); return r.width > 20 && r.height > 20 && r.top >= 0; })() };
  await shot('a2-skip-first');
  await window.cdpInput('key', 'Enter'); await wait(400);
  o.afterSkipSearch = { el: say(document.activeElement), isSearch: !!document.activeElement && document.activeElement.classList.contains('sr-search__input'), view: ctx.shell.view() };
  document.activeElement && document.activeElement.blur();
  await window.cdpInput('key', 'Tab'); await wait(150); await window.cdpInput('key', 'Tab'); await wait(250);
  o.secondTab = { el: say(document.activeElement), text: text(document.activeElement) };
  await window.cdpInput('key', 'Enter'); await wait(400);
  o.afterSkipMap = { el: say(document.activeElement), isMain: !!document.activeElement && document.activeElement.id === 'map', tabindex: document.activeElement && document.activeElement.getAttribute('tabindex') };
  await window.cdpInput('key', 'Tab'); await wait(250);
  o.tabAfterMap = { el: say(document.activeElement), mapKeepsTabindex: $('#map').hasAttribute('tabindex') };
  // From a card, "Skip to search" puts the selection down and lands in the field.
  await pick('mars'); 
  o.cardFocus = { el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 40) };
  $('#sr-skip-search').click(); await wait(500);
  o.skipFromCard = { el: say(document.activeElement), view: ctx.shell.view(), selected: ctx.selected() ? ctx.selected().id : null };
  // A sidebar view changes: Sources opened, then Back: focus lands on the view now showing.
  document.activeElement && document.activeElement.blur();
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status'), 8000); await wait(500);
  o.sourcesFocus = { el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 40) };
  const back = $$('.sr-side__back').find((n) => n.getBoundingClientRect().height > 0);
  back.focus(); await window.cdpInput('key', 'Enter'); await wait(600);
  o.afterBack = { el: say(document.activeElement), text: (text(document.activeElement) || '').slice(0, 40), view: ctx.shell.view(), onBody: document.activeElement === document.body };
  return o;
});

// #460 item 2: Back and Forward in a real tab.
await run('history', async () => {
  const read = () => ({ hash: location.hash, at: ctx.selected() ? ctx.selected().id : null, stage: ctx.stage.worldId, clock: new Date(ctx.clock.now()).toISOString().slice(0, 16), mode: ctx.clock.mode, view: ctx.shell.view() });
  const o = { start: read() };
  location.hash = 'at=sat-25544'; await wait(2500); o.iss = read();
  location.hash = 'at=moon&stage=moon&t=2026-07-04T12:00:00Z'; await wait(3500); o.moon = read();
  history.back(); await wait(3500); o.back = read();
  history.forward(); await wait(3500); o.forward = read();
  history.back(); await wait(2500); history.back(); await wait(3000); o.backTwice = read();
  await shot('a3-history-back');
  return o;
});
await home();
if (ctx.stage.worldId !== 'earth') { ctx.setStage('earth'); await wait(1500); }
ctx.clock.live();

// #155: a KTX2 file through scene/ktx2.js, drawn by the app's own renderer.
await run('ktx2', async () => {
  const before = bootRequests().filter((u) => /basis|ktx2/i.test(u));
  const THREE = await import('/vendor/three.module.min.js');
  const { createKtx2 } = await import('/js/scene/ktx2.js');
  const k = createKtx2({ renderer: ctx.renderer, present: (u) => /ktx2-fixture/.test(u) });
  const o = { before };
  for (const name of ['ktx2-fixture', 'ktx2-fixture-uastc']) {
    const t = performance.now();
    const got = await k.load(`data/v1/${name}.webp`, async () => { throw new Error('the WebP was asked for'); }).catch((e) => ({ error: String(e.message) }));
    const tex = got.texture;
    const row = { format: got.format, why: got.why, error: got.error, ms: Math.round(performance.now() - t) };
    if (tex) {
      Object.assign(row, { compressed: !!tex.isCompressedTexture, glFormat: tex.format, w: tex.image && tex.image.width, h: tex.image && tex.image.height, mips: tex.mipmaps ? tex.mipmaps.length : 0, colorSpace: tex.colorSpace, gpuBytes: (tex.mipmaps || []).reduce((s, m) => s + (m.data ? m.data.byteLength : 0), 0) });
      // Drawn: a quad wearing it, into a 64 x 32 target, read back.
      const rt = new THREE.WebGLRenderTarget(64, 32);
      const scene = new THREE.Scene(); const cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), new THREE.MeshBasicMaterial({ map: tex }));
      scene.add(mesh);
      const r = ctx.renderer; const keep = r.getRenderTarget();
      r.setRenderTarget(rt); r.render(scene, cam);
      const px = new Uint8Array(64 * 32 * 4); r.readRenderTargetPixels(rt, 0, 0, 64, 32, px);
      r.setRenderTarget(keep);
      let sr = 0, sg = 0, sb = 0, lit = 0; const seen = new Set();
      for (let i = 0; i < px.length; i += 4) { sr += px[i]; sg += px[i + 1]; sb += px[i + 2]; if (px[i] + px[i + 1] + px[i + 2] > 24) lit += 1; seen.add((px[i] >> 3) << 10 | (px[i + 1] >> 3) << 5 | (px[i + 2] >> 3)); }
      const n = px.length / 4;
      row.drawn = { mean: [Math.round(sr / n), Math.round(sg / n), Math.round(sb / n)], litShare: Math.round((lit / n) * 100) / 100, colours: seen.size };
      mesh.geometry.dispose(); mesh.material.dispose(); rt.dispose(); tex.dispose();
    }
    o[name] = row;
  }
  o.stats = k.stats();
  o.after = bootRequests().filter((u) => /basis|ktx2/i.test(u)).map((u) => u.split('?')[0]);
  o.sizes = performance.getEntriesByType('resource').filter((e) => /basis|ktx2/i.test(e.name)).map((e) => [e.name.split('/').pop(), e.transferSize, e.decodedBodySize]);
  const caps = ctx.renderer.extensions; o.gpuFormats = ['WEBGL_compressed_texture_astc', 'EXT_texture_compression_bptc', 'WEBGL_compressed_texture_s3tc', 'WEBGL_compressed_texture_etc', 'WEBGL_compressed_texture_etc1', 'WEBGL_compressed_texture_pvrtc'].filter((e) => caps.has(e));
  k.dispose();
  return o;
});

// #167: M42's card with its own photograph.
await run('nebula', async () => {
  const o = { rec: !!(await pick('dso-m42')) };
  if (!o.rec) return o;
  o.requestedBeforeOpen = bootRequests().filter((u) => /images\/nebulae\/m42/.test(u)).length;
  await openSection('about');
  const fig = await until(() => $('#sr-card .sr-card__exposure .sr-card__figure'), 8000);
  if (!fig) return { ...o, figure: false };
  fig.scrollIntoView({ block: 'center' });
  const img = fig.querySelector('img');
  await until(() => img.complete && img.naturalWidth > 0, 8000);
  await wait(400);
  Object.assign(o, { figure: true, src: img.getAttribute('src'), natural: [img.naturalWidth, img.naturalHeight], attrs: [img.width, img.height], alt: img.alt, loading: img.loading, drawn: box(img), caption: text(fig.querySelector('figcaption')), note: text($('#sr-card .sr-card__picture .sr-card__note')), credit: text($('#sr-card .sr-card__picture .sr-card__photo-credit')), creditHref: ($('#sr-card .sr-card__picture a') || {}).href, sideways: document.documentElement.scrollWidth > innerWidth + 1 });
  await shot('a4-m42-card');
  return o;
});
await home();

// #250: the honest answer in the Sources sheet.
await run('look', async () => {
  ctx.shell.openSources(); await until(() => ctx.shell.view() === 'sources' && $('#sr-side .sr-status__look'), 8000);
  const b = $('#sr-side .sr-status__look');
  if (!b) return { block: false };
  b.scrollIntoView({ block: 'start' }); await wait(500);
  const o = { title: text(b.querySelector('h3')), kinds: $$('dt', b).map(text), words: text(b).split(' ').length, box: box(b), fontPx: $$('dt, dd, p', b).map((n) => parseFloat(getComputedStyle(n).fontSize)).filter((v, i, a) => a.indexOf(v) === i), next: say(b.nextElementSibling) };
  await shot('a5-sources-look');
  return o;
});
await home();

// #478: the pad's card on a day the rocket is put away.
await run('pad', async () => {
  const o = {};
  for (const id of ['saturn-v-lc-39a', 'shuttle-lc-39b']) {
    const rec = await pick(id);
    if (!rec) { o[id] = null; continue; }
    await openSection('sources');
    o[id] = { title: text($('#sr-card .sr-card__name')), sentence: text($('#sr-card .sr-card__sentence')) || text($('#sr-card .sr-card__lead')), drawn: text($('#sr-card .sr-card__drawn')), label: $$('#labels .label').map(text).filter((t) => /Complex|Saturn|Shuttle/.test(t || '')).slice(0, 3) };
    if (id === 'saturn-v-lc-39a') await shot('a6-pad-card');
  }
  return o;
});
await home();

// #280: a generated system: nothing laid over it until asked, the distance on the card.
await run('system', async () => {
  location.hash = 'go=lhs-1140';
  const ok = await until(() => ctx.systems && ctx.systems.active && ctx.shell.view() === 'card', 20000);
  await wait(3500);
  const o = { active: !!ok, stage: ctx.stage.worldId, selected: ctx.selected() ? ctx.selected().id : null };
  const parts = () => { const g = ctx.systems.group; const seen = {}; g.traverse((n) => { if (/^systems:(zone|scale|label)/.test(n.name || '')) { const key = n.name.split(':').slice(0, 2).join(':'); seen[key] = (seen[key] || 0) + (n.visible ? 1 : 0); } }); return seen; };
  o.off = { overlay: ctx.systems.overlay(), drawn: parts() };
  await shot('a7-system-plain');
  await openSection('about');
  const rows = $$('#sr-card .sr-facts__row, #sr-card dt').map(text).filter((t) => /Earth/.test(t || ''));
  o.fromEarthRow = (text($('#sr-card')) || '').match(/From Earth\s*([\d.,]+ light-years)/);
  o.rowsNamingEarth = rows.slice(0, 4);
  const btns = $$('#sr-card [data-overlay]');
  o.buttons = btns.map((b) => ({ text: text(b), pressed: b.getAttribute('aria-pressed'), box: box(b), title: b.title }));
  o.noteOff = text($('#sr-card [data-overlay]') && $('#sr-card [data-overlay]').closest('section').querySelector('.sr-density__note'));
  for (const b of btns) b.click();
  await wait(900);
  o.on = { overlay: ctx.systems.overlay(), drawn: parts(), pressed: btns.map((b) => b.getAttribute('aria-pressed')), note: text(btns[0] && btns[0].closest('section').querySelector('.sr-density__note')) };
  if (btns[0]) btns[0].scrollIntoView({ block: 'center' });
  await wait(600);
  await shot('a8-system-overlaid');
  // The planet's card says the distance too, and the choice is kept.
  const planet = ctx.recordById('exo-lhs-1140-b') || (ctx.systems.records ? ctx.systems.records().find((r) => /lhs-1140-b/.test(r.id)) : null);
  if (planet) { ctx.select(planet, { fly: false }); await wait(1500); await openSection('about'); o.planet = { id: planet.id, fromEarth: (text($('#sr-card')) || '').match(/From Earth\s*([\d.,]+ light-years)/), pressed: $$('#sr-card [data-overlay]').map((b) => b.getAttribute('aria-pressed')) }; }
  return o;
});
return out;
