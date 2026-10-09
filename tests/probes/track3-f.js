// Tracker pass, run F (1440 x 900, GPU): an edge-on galaxy drawn as the ellipse OpenNGC measures; Kepler-186 f's face near; the tile stars and the haze beside Sirius.
// Pasted after tests/probes/sky3-common.js.
const step = async (name, fn) => { try { await fn(); } catch (e) { out[name + '-err'] = String(e && e.message || e).slice(0, 200); } };
const shotPlain = async (name) => { await wait(900); await window.cdpShot(name); };
await step('m98', async () => {
  const rec = ctx.recordById('dso-m98'); out.m98 = !!rec;
  ctx.select(rec, { from: 'search' }); await wait(9000);
  await shotPlain('g1-m98-ellipse');
  out.m98glow = ctx.dsoGlow ? { shaped: ctx.dsoGlow.shaped && ctx.dsoGlow.shaped().length } : null;
});
await step('k186', async () => {
  if (ctx.systems && ctx.systems.load) await ctx.systems.load();
  let rec = null; const w0 = Date.now();
  while (!rec && Date.now() - w0 < 40000) { rec = ctx.recordById('exo-kepler-186-f'); if (!rec) await wait(500); }
  ctx.select(rec, { from: 'search' }); await wait(12000);
  const mesh = ctx.scene.getObjectByName('systems:exo-kepler-186-f');
  const d0 = ctx.camera.position.distanceTo(mesh.position);
  out.k186 = { arrival: d0, material: mesh.material && mesh.material.type, name: mesh.material && mesh.material.name, children: mesh.children.length, faceUniforms: mesh.material && mesh.material.uniforms ? Object.keys(mesh.material.uniforms).slice(0, 8) : null };
  await shotPlain('g2-k186f-arrival');
  ctx.cameraRig.stopFollow();
  ctx.cameraRig.flyTo({ targetScene: mesh.position.clone(), distance: d0 * 0.15, ms: 0 });
  await wait(4000);
  out.k186near = { d: ctx.camera.position.distanceTo(mesh.position), scale: mesh.scale.x, material: mesh.material && mesh.material.type };
  await shotPlain('g3-k186f-0.15');
});
await step('k16pair', async () => {
  if (ctx.systems && ctx.systems.load) await ctx.systems.load();
  let rec = null; const w0 = Date.now();
  while (!rec && Date.now() - w0 < 40000) { rec = ctx.recordById('exo-kepler-16-b'); if (!rec) await wait(500); }
  ctx.select(rec, { from: 'search' }); await wait(10000);
  const A = ctx.scene.getObjectByName('systems:star-kepler-16'), B = ctx.scene.getObjectByName('systems:companion:star-kepler-16');
  ctx.cameraRig.stopFollow();
  const ab = B.position.clone().sub(A.position);
  const mid = A.position.clone().add(B.position).multiplyScalar(0.5);
  const V = ctx.camera.position.constructor;
  const off = new V(0, 1, 0).cross(ab).normalize().add(new V(0, 0.3, 0));
  for (const [tag, k] of [['near', 1.0], ['wide', 3.0]]) {
    ctx.cameraRig.flyTo({ targetScene: mid, distance: ab.length() * k, ms: 0, offset: off }); await wait(3500);
    const pa = A.position.clone().project(ctx.camera), pb = B.position.clone().project(ctx.camera);
    out['pair-' + tag] = { sep: ab.length(), screenA: [pa.x, pa.y], screenB: [pb.x, pb.y], scaleA: A.scale.x, scaleB: B.scale.x, camDist: ctx.camera.position.distanceTo(mid) };
    await shotPlain('g7-kepler16-pair-' + tag);
  }
  ctx.clock.goTo(ctx.clock.now() + 10 * 86400000); await wait(3000);
  await shotPlain('g8-kepler16-pair-10d-later');
  out.pair10 = { sepAfter: A.position.distanceTo(B.position) };
  ctx.clock.goTo(Date.now());
});
await step('haze', async () => {
  const flagstaff = place('Flagstaff', 35.2, -111.65);
  await stand(flagstaff);
  ctx.skyView.setOption('darkness', 'dark');
  ctx.clock.goTo(Date.UTC(2026, 9, 9, 10, 30)); await wait(1500);
  ctx.skyView.setOption('art', true);
  ctx.skyView.pointAt({ raDeg: 83.8, decDeg: -3.0 }, { fovDeg: 100, instant: true, mark: false }); await wait(7000);
  out.art100 = ctx.skyView.groundStats().art; await shot('g9-art-100');
  await wait(3000); out.art100b = ctx.skyView.groundStats().art;
  ctx.skyView.setOption('art', false);
  ctx.skyView.pointAt({ raDeg: 101.287, decDeg: -16.716 }, { fovDeg: 14, instant: true, mark: false }); await wait(4000);
  await shot('g4-sirius-base');
  const root = ctx.scene.getObjectByName('ground-sky');
  const tiles = []; root.traverse((o) => { if (/^ground-stars-n/.test(o.name)) tiles.push(o); });
  out.tileLayers = tiles.length;
  tiles.forEach((o) => { o.visible = false; }); await wait(900); await shot('g5-sirius-no-tile-layers');
  tiles.forEach((o) => { o.visible = true; });
  const stars = root.getObjectByName('ground-stars'); stars.visible = false; await wait(900); await shot('g6-sirius-no-hyg-stars');
  stars.visible = true;
  out.starMaterial = { type: stars.material.type, blending: stars.material.blending, depthTest: stars.material.depthTest, transparent: stars.material.transparent, sizeAttenuation: stars.material.sizeAttenuation };
  const gl = ctx.renderer.getContext(); out.pointSizeRange = Array.from(gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE));
});
return out;
