// Tracker pass, run D (1440 x 900, GPU): the two suns of Kepler-16, an edge-on galaxy, and "An imagined world" and its way back.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 60000) await wait(300);
const ctx = window.spaceRadar;
const out = { errors: [] };
window.addEventListener('error', (e) => out.errors.push(String(e.message).slice(0, 160)));
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const shot = async (name) => { await wait(900); await window.cdpShot(name); };
const cardText = () => { const c = document.querySelector('.sr-card'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 1400) : null; };
await step('k16', async () => {
  const host = ctx.recordById('star-kepler-16') || ctx.recordById('exo-kepler-16-b');
  out.hostFound = !!host;
  ctx.select(host, { from: 'search' });
  const w = Date.now(); while (!(ctx.scene.getObjectByName('systems:companion:star-kepler-16')) && Date.now() - w < 30000) await wait(400);
  await wait(6000);
  const A = ctx.scene.getObjectByName('systems:star-kepler-16'), B = ctx.scene.getObjectByName('systems:companion:star-kepler-16');
  out.pair = A && B && { a: A.position.toArray(), b: B.position.toArray(), sepUnits: A.position.distanceTo(B.position), unitKm: ctx.stage ? null : undefined, scaleA: A.scale.x, scaleB: B.scale.x, camDist: ctx.camera.position.distanceTo(A.position) };
  out.card = cardText();
  await shot('d1-kepler16-system');
  // Close: put the camera a few separations from the pair, looking at it, and let the loop draw.
  if (A && B) {
    const mid = A.position.clone().add(B.position).multiplyScalar(0.5);
    const sep = A.position.distanceTo(B.position);
    const dir = ctx.camera.position.clone().sub(mid).normalize();
    ctx.camera.position.copy(mid).addScaledVector(dir, sep * 4); ctx.camera.lookAt(mid);
    await shot('d2-kepler16-pair-close');
    out.pairClose = { scaleA: A.scale.x, scaleB: B.scale.x, sep, camDist: ctx.camera.position.distanceTo(mid) };
  }
});
await step('m104', async () => {
  const rec = ctx.recordById('dso-m104'); out.m104 = !!rec;
  ctx.select(rec, { from: 'search' }); await wait(9000);
  out.m104card = cardText();
  await shot('d3-m104-ellipse');
});
await step('imagine', async () => {
  location.hash = '#imagine=3'; await wait(9000);
  await shot('d4-imagine-3');
  const b = [...document.querySelectorAll('button')].find((x) => /Back to the map/.test(x.innerText)); out.backButton = !!b;
  out.imagineCard = cardText();
  if (b) { b.click(); await wait(5000); out.afterBack = { hash: location.hash, imagineOn: document.documentElement.classList.contains('sr-imagine-on'), stage: ctx.stage && ctx.stage.worldId }; }
  await shot('d5-after-back');
});
return out;
