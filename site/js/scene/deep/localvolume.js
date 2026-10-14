// scene/deep/localvolume.js -- the local volume's galaxies as one static tile of points at their true
// angular sizes, frustum-culled (internal spec 0075 stage e, #790). A STUB from stage a: the coordinator
// asks DEEP_LAYERS (scene/deep/heroes.js) for it on the local-group stage, and it draws nothing yet.
//   createLayer(THREE, env) -> { group, frame(info), ready(), stats(), dispose() }
export function createLayer(THREE) {
  const group = new THREE.Group();
  group.name = 'deep-localvolume';
  return { group, frame() {}, ready: () => true, stats: () => ({ points: 0, bytes: 0 }), dispose() {} };
}
