// Tracker pass, run E (390 x 844, a phone, GPU): the star systems' labels on a phone, and how many constellation pictures a phone holds at once.
// Pasted after tests/probes/sky3-common.js.
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const shotPlain = async (name) => { await wait(900); await window.cdpShot(name); };
const cardText = () => { const c = document.querySelector('.sr-card'); return c ? c.innerText.replace(/\s+/g, ' ').slice(0, 900) : null; };
const labelsNow = () => [...document.querySelectorAll('.sr-tag, .sr-chevron, .sr-label, .sr-maplabel')].filter((n) => n.getBoundingClientRect().width > 0 && !n.classList.contains('is-off')).map((n) => ({ c: n.className.slice(0, 40), t: n.innerText.replace(/\s+/g, ' ').slice(0, 40), r: ['left', 'top', 'width', 'height'].map((k) => Math.round(n.getBoundingClientRect()[k])) }));
const open = async (hostId, planetId, name) => {
  if (ctx.systems && ctx.systems.load) await ctx.systems.load();
  let rec = null; const w0 = Date.now();
  while (!rec && Date.now() - w0 < 40000) { rec = ctx.recordById(planetId) || ctx.recordById(hostId); if (!rec) await wait(500); }
  ctx.select(rec, { from: 'search' }); await wait(9000);
  out[name + '-labels'] = labelsNow(); out[name + '-card'] = cardText();
  await shotPlain(name);
};
await step('k186', async () => { await open('star-kepler-186', 'exo-kepler-186-f', 'p1-kepler186f'); });
await step('k16', async () => {
  await open('star-kepler-16', 'exo-kepler-16-b', 'p2-kepler16b');
  const A = ctx.scene.getObjectByName('systems:star-kepler-16'), B = ctx.scene.getObjectByName('systems:companion:star-kepler-16');
  if (A && B) {
    ctx.cameraRig.stopFollow();
    const mid = A.position.clone().add(B.position).multiplyScalar(0.5);
    const ab = B.position.clone().sub(A.position);
    const off = new ctx.camera.position.constructor(0, 1, 0).cross(ab).normalize().add(new ctx.camera.position.constructor(0, 0.35, 0));
    ctx.cameraRig.flyTo({ targetScene: mid, distance: ab.length() * 2.6, ms: 0, offset: off });
    await wait(2500);
    out.pair = { sep: ab.length(), scaleA: A.scale.x, scaleB: B.scale.x };
    await shotPlain('p2b-kepler16-pair');
    // The same pair two minutes of a day later on the clock, to see them move: ten days on.
    ctx.clock.goTo(ctx.clock.now() + 10 * 86400000); await wait(2500);
    out.pair10d = { a: A.position.toArray(), b: B.position.toArray() };
    await shotPlain('p2c-kepler16-pair-10d');
  }
});
await step('lhs1140', async () => { await open('star-lhs-1140', 'exo-lhs-1140-b', 'p3-lhs1140b'); });
await step('art', async () => {
  const flagstaff = place('Flagstaff', 35.2, -111.65);
  await stand(flagstaff);
  ctx.skyView.setOption('darkness', 'dark');
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); await wait(1500);
  ctx.skyView.setOption('art', true);
  ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 70, instant: true, mark: false }); await wait(6000);
  out.art70 = ctx.skyView.groundStats().art;
  await shot('p4-phone-art-70');
  for (const c of ['samoan', 'norse']) { ctx.skyView.setOption('art', false); ctx.skyView.setOption('culture', c); ctx.skyView.pointAt({ azDeg: 160, altDeg: 40 }, { fovDeg: 100, instant: true, mark: false }); await wait(2500); await shot('p5-phone-' + c); }
});
return out;
