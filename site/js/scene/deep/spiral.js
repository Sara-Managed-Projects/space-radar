// scene/deep/spiral.js -- Andromeda and the Triangulum Galaxy from the morphology generator (internal spec 0075 stage d, #789).
// A STUB from stage a, the same as scene/deep/helix.js's (whose head says what every hero answers):
// nothing is drawn by it until registry/deepsky-heroes/m31.yaml and m33.yaml says `shipped: true`. Kept self-contained
// so the stage that owns this file replaces it whole without touching another stage's module.
export function createHero(THREE, env = {}) {
  const group = new THREE.Group();
  group.name = `deep-hero-${(env.profile && env.profile.id) || 'stub'}`;
  const parts = [];
  for (const layer of (env.profile && env.profile.layers) || []) {
    if (!layer || layer.kind !== 'gas' || !env.gas) continue;
    const v = env.gas.createGasMesh(THREE, { name: `${group.name}-${layer.what || 'gas'}`, kind: Number(layer.profile) || 0, colour: layer.colour || [1, 1, 1], noisy: !!layer.noisy });
    group.add(v.mesh);
    parts.push(v);
  }
  let level = 0;
  return {
    group,
    levels: [2, 3],
    setLevel(n, share = 1) { level = n; for (const v of parts) v.material.uniforms.uShare.value = n >= 2 ? share : 0; group.visible = n >= 2 && share > 0; },
    frame(info = {}) {
      for (const v of parts) {
        if (info.camera) v.setCamera(info.camera, 1);
        v.setLook(info.look, info);
        if (Number.isFinite(info.steps)) v.setSteps(info.steps);
      }
    },
    ready: () => true,
    stats: () => ({ level, meshes: parts.length, points: 0, textures: 0, bytes: 0 }),
    dispose() { for (const v of parts) v.dispose(); parts.length = 0; },
  };
}
