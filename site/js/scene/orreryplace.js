// scene/orreryplace.js -- the Size and Distance sliders applied to the scene (forge #145).
//
// Contract: createPlacer(view, { THREE, stage, note }) -> { place(kit, w, mesh, trueDistKm, trueRadiusUnits),
//                                                          placeStage(kit, w, mesh, trueRadiusUnits), remap(out), view }
// `view` is scene/orrery.js viewOf(); `note(w, info)` writes a world's card note (ui/orrery.js noteFor).
// scene/worlds.js calls place() for each world on the Sun's stage while the sliders are off the truth, and
// remap() from its viewAdjust for every other position converted on that stage; `kit` is worlds.js's own
// { meshes, viewState, trueCentres, describe, byId, pos } -- pos() the world's TRUE scene position on the
// way in, which place() turns into its drawn one.
//
// WHY A MODULE OF ITS OWN. scene/worlds.js is in the first frame; this is not. What worlds.js keeps is the
// hook (setOrrery and three calls), and everything a visitor who never opens the Planets tab does not need
// arrives with ui/orrery.js.
//
// WHAT IT DOES, by the rules scene/orrery.js explains:
//   a planet (and Pluto): its drawn distance from the Sun is view.radialKm(true), along its true direction,
//     and its radius k times the true one;
//   a moon: round its planet's DRAWN centre, in its true direction from the planet's TRUE centre, at
//     view.moonOffsetKm(...), so it stays outside the enlarged planet (or its rings);
//   the Sun, the stage's own centre: view.sunK times its radius;
//   everything else on the stage (craft, asteroids, comets, the paths): the same radial squeeze about the
//     Sun, so a probe at Jupiter is drawn by the drawn Jupiter. Past 50 AU the squeeze is the identity.
// Each placed world's viewScale(id) is marked exaggerated and carries the note, so the card says how it
// was drawn (ui/cards.js prints viewScale(id).note).

export function createPlacer(view, { THREE, stage, note } = {}) {
  const trueAt = new Map(); // id -> this frame's true scene position, for the moons that follow
  const off = new THREE.Vector3();

  function describeInto(kit, w, trueDistKm, drawnDistKm, radiusKm, around) {
    const st = kit.describe(w, trueDistKm, drawnDistKm, radiusKm);
    st.exaggerated = radiusKm > w.radiusKm * (1 + 1e-9) || !!around || st.exaggerated;
    st.withParent = !!around;
    st.cls = st.exaggerated ? 'illustrative' : 'measured';
    const words = typeof note === 'function' ? note(w, { k: radiusKm / w.radiusKm, trueDistKm, drawnDistKm, around }) : '';
    if (words) st.note = words;
    kit.viewState.set(w.id, st);
  }

  function place(kit, w, mesh, trueDistKm, trueRadiusUnits) {
    const pos = kit.pos();
    if (!trueAt.has(w.id)) trueAt.set(w.id, new THREE.Vector3());
    trueAt.get(w.id).copy(pos);
    const k = view.sizeK;
    let around = null;
    if (w.parent && w.parent !== 'sun') {
      const pm = kit.meshes.get(w.parent);
      const pt = trueAt.get(w.parent);
      const pw = kit.byId(w.parent);
      if (!pm || !pt || !pw) return false;
      off.copy(pos).sub(pt);
      const offKm = off.length() * stage.unitKm;
      if (!(offKm > 0)) return false;
      const envKm = pw.look && pw.look.ring && pw.look.ring.outerKm ? pw.look.ring.outerKm : pw.radiusKm;
      const drawnOffKm = view.moonOffsetKm(offKm, envKm, w.radiusKm);
      off.setLength(drawnOffKm / stage.unitKm);
      if (!kit.trueCentres.has(w.id)) kit.trueCentres.set(w.id, new THREE.Vector3());
      kit.trueCentres.get(w.id).copy(pos);
      pos.copy(pm.position).add(off);
      around = { parent: pw, offKm, drawnOffKm };
    } else if (trueDistKm > 0) {
      pos.setLength(view.radialKm(trueDistKm) / stage.unitKm);
    }
    mesh.position.copy(pos);
    mesh.scale.setScalar(trueRadiusUnits * k);
    describeInto(kit, w, trueDistKm, pos.length() * stage.unitKm, w.radiusKm * k, around);
    return true;
  }

  function placeStage(kit, w, mesh, trueRadiusUnits) {
    if (!trueAt.has(w.id)) trueAt.set(w.id, new THREE.Vector3());
    trueAt.get(w.id).set(0, 0, 0);
    if (!(view.sunK > 1)) return;
    mesh.scale.setScalar(trueRadiusUnits * view.sunK);
    describeInto(kit, w, 0, 0, w.radiusKm * view.sunK, null);
  }

  function remap(out) {
    if (stage.worldId !== 'sun' || !(view.dist > 0)) return out;
    const rKm = out.length() * stage.unitKm;
    if (rKm > 0) out.multiplyScalar(view.radialKm(rKm) / rKm);
    return out;
  }

  return { place, placeStage, remap, view };
}
