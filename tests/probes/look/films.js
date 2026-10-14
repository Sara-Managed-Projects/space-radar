// films: Mercury, Venus, Uranus and Neptune from close (spec 0073 requirement 5, the four that came
// last). For each: its stage as "Go there" frames it; the whole disc from the side, a gibbous phase
// as the famous photographs show it; then straight down on its evening terminator from a quarter of
// a radius up, in the Film look and again in the Measured one at the same moment. Venus again
// wearing its radar ground, from the side and on the terminator; Uranus and Neptune again from
// above their lit ring face. Runs on a ref from before the change too (the "before" pictures):
// what it asks of the page that a ref may not have, it asks with a guard.
//
// THE TERMINATOR. cross(sunward, north) points at a place on the terminator on the equator (or, on
// Uranus, whose pole is near the Sun, wherever the Sun's line is square to the axis); leaning a
// little to the Sun keeps the camera over the lit side of it.
look.probe = 'films';
const out = { worlds: {} };
out.weatherLoaded = await until(() => sr.weather && typeof sr.weather.state === 'function', 30000);
const setLook = (mode) => { try { if (sr.drawn && sr.drawn.set) sr.drawn.set(mode); } catch (e) { look.errors.push('probe: look ' + mode + ': ' + e); } };
const facts = (id) => {
  const f = { share: sr.worlds.discShare(id) };
  try { f.relief = sr.worlds.hasRelief ? sr.worlds.hasRelief(id) : null; } catch { /* older ref */ }
  try { f.shadowSteps = sr.worlds.castsShadows ? sr.worlds.castsShadows(id) : null; } catch { /* older ref */ }
  try { f.face = sr.worlds.faceOf ? sr.worlds.faceOf(id) : null; } catch { /* older ref */ }
  try { const s = sr.weather && sr.weather.state ? sr.weather.state() : null; const w = s && s.worlds ? s.worlds[id] : null; if (w) f.weather = w; } catch { /* older ref */ }
  return f;
};
for (const id of ['mercury', 'venus', 'uranus', 'neptune']) {
  if (!sr.recordById(id)) { look.missing.push(id); continue; }
  setLook('film');
  sr.clock.live();
  await stage(id, 10000);
  const row = { stageDistance: rig.state.distance };
  await shot(id + '-1-stage', id + ': its stage as "Go there" frames it');
  const mesh = sr.worlds.meshFor(id);
  const R = mesh.scale.x;
  const centre = () => ({ x: mesh.position.x, y: mesh.position.y, z: mesh.position.z });
  const s = sunward(id);
  const side = unit(cross(s, north(id)));
  // A gibbous disc: the camera 55 degrees from the Sun's line, three radii out.
  rig.flyTo({ targetScene: centre(), offset: unit(mix(s, 0.57, side, 0.82)), distance: R * 3.0, ms: 0 });
  await shot(id + '-2-disc', id + ': the whole disc from the side, the terminator on the right or left', 9000);
  row.disc = facts(id);
  // Straight down on the terminator, a quarter of a radius up, leaning a little into the light.
  const onTerminator = unit(mix(side, 1, s, 0.12));
  rig.flyTo({ targetScene: centre(), offset: onTerminator, distance: R * 1.25, ms: 0 });
  await shot(id + '-3-terminator', id + ': straight down on the terminator from a quarter of a radius up, Film', 10000);
  row.terminatorFilm = facts(id);
  setLook('measured');
  await shot(id + '-4-terminator-measured', id + ': the same place and moment, Measured', 6000);
  row.terminatorMeasured = facts(id);
  setLook('film');
  // The terminator from farther off and on the side of the screen the sidebar does not cover: the
  // camera 70 degrees from the Sun's line, on the other side of it from the gibbous view.
  rig.flyTo({ targetScene: centre(), offset: unit(mix(s, 0.34, side, -0.94)), distance: R * 2.2, ms: 0 });
  await shot(id + '-6-terminator-wide', id + ': the terminator from 2.2 radii, on the open side of the screen, Film', 9000);
  row.terminatorWide = facts(id);
  if (id === 'neptune') {
    // Straight down on the 29 N band (Voyager's streaks, PIA00058) where it meets the terminator.
    const nn = north(id);
    const u1 = side;
    const u2 = unit(cross(nn, u1));
    const lat = 29 * Math.PI / 180;
    let best = null;
    for (let k = 0; k < 360; k++) {
      const a = k * Math.PI / 180;
      const p = unit(mix(nn, Math.sin(lat), mix(u1, Math.cos(a), u2, Math.sin(a)), Math.cos(lat)));
      const lit = p.x * s.x + p.y * s.y + p.z * s.z;
      if (!best || Math.abs(lit - 0.15) < Math.abs(best.lit - 0.15)) best = { p, lit };
    }
    rig.flyTo({ targetScene: centre(), offset: best.p, distance: R * 1.2, ms: 0 });
    await shot('neptune-7-band-29n', 'neptune: straight down on 29 N where it meets the terminator, a fifth of a radius up (the Sun ' + (Math.asin(best.lit) * 180 / Math.PI).toFixed(0) + ' degrees up)', 10000);
    row.band29 = facts(id);
    // The Adams ring where Voyager's arcs are: their place in the ring's own axes is the scene's
    // NEPTUNE_ARCS turn (worked out here as scene/worlds.js arcTurnRad does, so an older ref is
    // photographed at the same place) plus the middle of their spans, 266 degrees.
    const ringMesh = mesh.userData && mesh.userData.ring;
    if (ringMesh) {
      const days = (sr.clock.now() - Date.UTC(2000, 0, 1, 12)) / 86400000;
      const phi = ((((820.1194 - 541.1397757) * days) % 360 + 360) % 360 + 266) * Math.PI / 180;
      ringMesh.updateMatrixWorld();
      const e = ringMesh.matrixWorld.elements;
      const rl = 62933 / 24622;
      const lx = Math.cos(phi) * rl, ly = Math.sin(phi) * rl;
      const wx = e[0] * lx + e[4] * ly + e[12], wy = e[1] * lx + e[5] * ly + e[13], wz = e[2] * lx + e[6] * ly + e[14];
      const toArc = unit({ x: wx - mesh.position.x, y: wy - mesh.position.y, z: wz - mesh.position.z });
      const lit2 = Math.sign(nn.x * s.x + nn.y * s.y + nn.z * s.z) || 1;
      // From a quarter turn round the ring and a little above it, so the arcs stand at the side of
      // the planet and not under the camera (the first try of 2026-10-14 had them out of the frame).
      rig.flyTo({ targetScene: centre(), offset: unit(mix(unit(cross(nn, toArc)), 1, nn, 0.3 * lit2)), distance: R * 5.5, ms: 0 });
      await shot('neptune-8-arcs', 'neptune: the part of the Adams ring where Voyager\'s five arcs are drawn, seen from a quarter turn round, Film', 9000);
      setLook('measured');
      await shot('neptune-9-arcs-measured', 'neptune: the same, Measured (the arcs are illustrative in place and not drawn)', 6000);
      setLook('film');
    }
  }
  if (id === 'venus' && sr.worlds.setFace) {
    sr.worlds.setFace('venus', 'surface');
    await until(() => sr.worlds.faceOf('venus') === 'surface', 20000);
    rig.flyTo({ targetScene: centre(), offset: unit(mix(s, 0.57, side, 0.82)), distance: R * 3.0, ms: 0 });
    await shot('venus-5-ground', 'venus: the radar ground from the side, Film', 12000);
    row.ground = facts(id);
    rig.flyTo({ targetScene: centre(), offset: onTerminator, distance: R * 1.25, ms: 0 });
    await shot('venus-6-ground-terminator', 'venus: the radar ground straight down on the terminator', 10000);
    row.groundTerminator = facts(id);
    sr.worlds.setFace('venus', null);
  }
  if (id === 'uranus' || id === 'neptune') {
    // Above the lit face of the rings: the ring plane is the equator, its normal the pole.
    const n = north(id);
    const lit = Math.sign(n.x * s.x + n.y * s.y + n.z * s.z) || 1;
    rig.flyTo({ targetScene: centre(), offset: unit(mix(n, 0.45 * lit, mix(s, 0.6, side, 0.8), 1)), distance: R * 4.5, ms: 0 });
    await shot(id + '-5-rings', id + ': from above the lit face of its rings, four and a half radii out', 9000);
    row.rings = facts(id);
  }
  out.worlds[id] = row;
}
setLook('film');
sr.clock.live();
return finish(out);
