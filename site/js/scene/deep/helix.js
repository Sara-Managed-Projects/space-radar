// scene/deep/helix.js -- the Helix Nebula as a hero (internal spec 0075 stage b, #787). A STUB from
// stage a: it proves the seam (scene/deep/heroes.js -> scene/deep/deepsky.js) and nothing is drawn by it
// until registry/deepsky-heroes/helix.yaml says `shipped: true`.
//
// WHAT A HERO ANSWERS (every hero module, the same shape; stage a's coordinator calls nothing else):
//   createHero(THREE, env) -> {
//     group,                    a THREE.Group in OBJECT UNITS, centred on the object; the coordinator
//                               places and scales it (stage.toScene of its centre, design section 6)
//     levels,                   the levels it draws, of 2 (structure), 3 (close-up), 4 (fly-through)
//     setLevel(level, share),   which level now, and how much of it (the 300 ms cross-fade)
//     frame(info),              per frame while drawn: {camera, rPx, steps, look, reduced, frozen, dtMs}
//     ready(),                  true once every asset it fetched has landed (sr.deep.ready())
//     stats(),                  {points, textures, bytes, meshes}
//     dispose(),                give every geometry, material and texture back
//   }
//   env = { profile, record, gas }   gas: scene/deep/gasmat.js, so a hero's gas is the shared material
//
// The stub builds one gas volume per `layers:` row of kind `gas` (none in the empty profile): enough for
// tests/test_contract.mjs to check a hero's materials stay in the opaque list.
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
