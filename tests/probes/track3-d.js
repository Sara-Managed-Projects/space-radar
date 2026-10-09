// Tracker pass, run D (1440 x 900, GPU): the two suns of Kepler-16, an edge-on galaxy, and "An imagined world" and its way back.
// Pasted after tests/probes/sky3-common.js (its wait, ctx, out, place, stand, sunDown, stats).
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const shotPlain = async (name) => { await wait(900); await window.cdpShot(name); };
const cardText = () => { const c = document.querySelector('.sr-card'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 1400) : null; };
await step('k16', async () => {
  if (ctx.systems && ctx.systems.load) await ctx.systems.load();
  let host = null; const w0 = Date.now();
  while (!host && Date.now() - w0 < 40000) { host = ctx.recordById('star-kepler-16') || ctx.recordById('exo-kepler-16-b'); if (!host) await wait(500); }
  out.hostFound = !!host;
  ctx.select(host, { from: 'search' });
  const w = Date.now(); while (!(ctx.scene.getObjectByName('systems:companion:star-kepler-16')) && Date.now() - w < 30000) await wait(400);
  await wait(6000);
  const A = ctx.scene.getObjectByName('systems:star-kepler-16'), B = ctx.scene.getObjectByName('systems:companion:star-kepler-16');
  out.pair = A && B && { a: A.position.toArray(), b: B.position.toArray(), sepUnits: A.position.distanceTo(B.position), unitKm: ctx.stage ? null : undefined, scaleA: A.scale.x, scaleB: B.scale.x, camDist: ctx.camera.position.distanceTo(A.position) };
  out.card = cardText();
  await shotPlain('d1-kepler16-system');
  // Close: put the camera a few separations from the pair, looking at it, and let the loop draw.
  if (A && B) {
    const mid = A.position.clone().add(B.position).multiplyScalar(0.5);
    const sep = A.position.distanceTo(B.position);
    const dir = ctx.camera.position.clone().sub(mid).normalize();
    ctx.camera.position.copy(mid).addScaledVector(dir, sep * 4); ctx.camera.lookAt(mid);
    await shotPlain('d2-kepler16-pair-close');
    out.pairClose = { scaleA: A.scale.x, scaleB: B.scale.x, sep, camDist: ctx.camera.position.distanceTo(mid) };
  }
});
await step('m104', async () => {
  const rec = ctx.recordById('dso-m104'); out.m104 = !!rec;
  ctx.select(rec, { from: 'search' }); await wait(9000);
  out.m104card = cardText();
  await shotPlain('d3-m104-ellipse');
});
await step('imagine', async () => {
  location.hash = '#imagine=3'; await wait(9000);
  await shotPlain('d4-imagine-3');
  const b = [...document.querySelectorAll('button')].find((x) => /Back to the map/.test(x.innerText)); out.backButton = !!b;
  out.imagineCard = cardText();
  if (b) { b.click(); await wait(5000); out.afterBack = { hash: location.hash, imagineOn: document.documentElement.classList.contains('sr-imagine-on'), stage: ctx.stage && ctx.stage.worldId }; }
  await shotPlain('d5-after-back');
});
await step('cultures', async () => {
  // A southern sky, for Boorong and Samoan figures; and Sirius with and without the HTML labels over the canvas.
  const alice = place('Alice Springs', -23.7, 133.88);
  await stand(alice);
  ctx.skyView.setOption('darkness', 'dark');
  const night = Date.UTC(2026, 9, 9, 15, 0); // 00:30 local next day
  ctx.clock.goTo(night); await wait(1500);
  for (const c of ['boorong', 'samoan', 'tongan', 'norse']) {
    ctx.skyView.setOption('culture', c); ctx.skyView.pointAt({ azDeg: 180, altDeg: 45 }, { fovDeg: 100, instant: true, mark: false }); await wait(2500);
    out['culture-' + c] = { culture: ctx.skyView.groundStats().culture, look: ctx.skyView.look };
    await shot('e-' + c);
  }
  ctx.skyView.setOption('culture', 'western');
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false }); await wait(3500);
  await shot('f1-sirius-labels-on');
  document.querySelectorAll('.sr-skylabel, .sr-skytag, .sr-skymark').forEach((n) => { n.dataset.was = n.style.visibility; n.style.visibility = 'hidden'; });
  await wait(600); await shot('f2-sirius-labels-hidden');
  document.querySelectorAll('.sr-skylabel, .sr-skytag, .sr-skymark').forEach((n) => { n.style.visibility = n.dataset.was || ''; });
});
return out;
