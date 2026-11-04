// r1720-mars: Spirit's and Opportunity's traverses as a visitor first meets them (release 1.8.0, internal #992).
//
// Internal #992: Spirit's 7.07 km line in Gusev was drawn and no picture showed it legibly, because the stage's
// camera stayed at the Mars stage view; Opportunity's 45 km line read plainly. This photographs both sites the
// way a visitor reaches them, then from the heights a line is read from:
//   1. the site selected and flown to by the app (its ARRIVAL POSE, not set here), the camera's height over
//      the ground and the traverses the tiles say are shown, each with the traverse group hidden for the
//      shot (the before) and drawn (the after);
//   2. from 3 x, 1.2 x and 0.5 x the line's own length straight above its middle, tipped 25 degrees, the Sun
//      35 degrees up, each again with the group hidden;
//   3. a phone (tier 0, no tiles): the state must say no traverse is drawn.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r1720-mars';
const out = { scenes: [], problems: [] };
const deg = Math.PI / 180;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const camKm = (W, RKM) => { const m = sr.worlds.meshFor(W); const c = rig.camera || sr.camera; if (!m || !c) return null; const p = c.position; return Math.round((Math.hypot(p.x - m.position.x, p.y - m.position.y, p.z - m.position.z) / m.scale.x - 1) * RKM); };
const tiled = () => { try { return sr.quality.describe().tier >= 1; } catch { return false; } };
const tilesState = (id) => { try { const t = sr.quality.tiles(); return t && t.sets ? t.sets[id] : null; } catch { return null; } };
const tilesReady = async (id, capMs = 60000) => tiled() && until(() => { const s = tilesState(id); return s && s.showing && s.loading === 0; }, capMs, 500);

/** One world's axes and helpers: the way out at a place, the point under the Sun, the Sun's height there. */
const onWorld = (W) => {
  const mesh = sr.worlds.meshFor(W);
  const axes = () => { mesh.updateMatrixWorld(); const e = mesh.matrixWorld.elements; return { x: unit({ x: e[0], y: e[1], z: e[2] }), y: unit({ x: e[4], y: e[5], z: e[6] }), z: unit({ x: e[8], y: e[9], z: e[10] }) }; };
  const outward = (latDeg, lonDeg) => {
    const a = axes(); const la = latDeg * deg; const lo = lonDeg * deg;
    const l = { x: Math.cos(la) * Math.cos(lo), y: Math.sin(la), z: -Math.cos(la) * Math.sin(lo) };
    return unit({ x: a.x.x * l.x + a.y.x * l.y + a.z.x * l.z, y: a.x.y * l.x + a.y.y * l.y + a.z.y * l.z, z: a.x.z * l.x + a.y.z * l.y + a.z.z * l.z });
  };
  const subsolar = () => { const a = axes(); const s = sunward(W); const lon = Math.atan2(-dot(s, a.z), dot(s, a.x)) / deg; return { lon: (lon + 360) % 360, lat: Math.asin(dot(s, a.y)) / deg }; };
  const sunElev = (latDeg, lonDeg) => Math.round((90 - Math.acos(Math.max(-1, Math.min(1, dot(outward(latDeg, lonDeg), sunward(W))))) / deg) * 100) / 100;
  /** Forward until the Sun stands `elev` degrees over the place's EASTERN horizon (morning); `dayS` is the solar day. */
  const morning = async (latDeg, lonDeg, elev, dayS) => {
    for (let pass = 0; pass < 3; pass++) {
      const ss = subsolar();
      const la = latDeg * deg; const dc = ss.lat * deg;
      const c = (Math.sin(elev * deg) - Math.sin(la) * Math.sin(dc)) / (Math.cos(la) * Math.cos(dc));
      const h = Math.acos(Math.max(-1, Math.min(1, c))) / deg;
      const west = (((ss.lon - (lonDeg + h) % 360) % 360) + 360) % 360;
      if (west < 0.01 || west > 359.99) break;
      sr.clock.goTo(sr.clock.now() + (west / 360) * dayS * 1000);
      await sleep(1500);
    }
    return sunElev(latDeg, lonDeg);
  };
  /** Look at a place from `altKm` above, tipped `tiltDeg` from straight down, the camera `fromAz` degrees east of north of it. */
  const over = (latDeg, lonDeg, altKm, RKM, tiltDeg = 30, fromAz = 180) => {
    try { sr.deselect(); rig.stopFollow(); } catch (e) { look.warns.push('probe: deselect: ' + e); }
    const R = mesh.scale.x;
    const up = outward(latDeg, lonDeg);
    const n0 = axes().y;
    const nn = unit(add(n0, up, -dot(n0, up)));
    const east = unit(cross(nn, up));
    const side = unit(add({ x: nn.x * Math.cos(fromAz * deg), y: nn.y * Math.cos(fromAz * deg), z: nn.z * Math.cos(fromAz * deg) }, east, Math.sin(fromAz * deg)));
    const dir = unit(add({ x: up.x * Math.cos(tiltDeg * deg), y: up.y * Math.cos(tiltDeg * deg), z: up.z * Math.cos(tiltDeg * deg) }, side, Math.sin(tiltDeg * deg)));
    rig.flyTo({ targetScene: add(mesh.position, up, R), offset: dir, distance: (altKm / RKM) * R / Math.cos(tiltDeg * deg), ms: 0 });
  };
  return { mesh, axes, outward, subsolar, sunElev, morning, over };
};

const MARS_KM = 3389.5;
const SOL_S = 88775.244;
sr.clock.goTo(Date.UTC(2026, 9, 15, 12, 0, 0));
sr.clock.setPaused(true);
await stage('mars', 12000);
const MARS = onWorld('mars');
out.tier = tiled() ? 'tiles' : 'no tiles (tier 0)';
const SITES = [
  ['spirit', '1-spirit', -14.585, 175.50, 7.07],
  ['opportunity', '2-opportunity', -2.15, 354.56, 45.1],
];
const setGroup = (on) => { const g = MARS.mesh.getObjectByName('mars-traverses'); if (g) g.visible = on; return !!g; };
const shown = () => { const s = tilesState('mars-themis-day-ir'); return s && s.traverses ? s.traverses.filter((t) => t.shown).map((t) => t.site + ' ' + t.fade) : []; };
for (const [id, name, lat, lon, lengthKm] of SITES) {
  const e = await MARS.morning(lat, lon, 35, SOL_S);
  // 1. the app's own arrival.
  if (!(await go(id, null, 9000))) { out.problems.push('no record ' + id); continue; }
  if (tiled()) await tilesReady('mars-themis-day-ir');
  await sleep(5000);
  const row = { id, sunDeg: e, arrivalKm: camKm('mars', MARS_KM), shown: shown(), tiles: tilesState('mars-themis-day-ir') ? tilesState('mars-themis-day-ir').traverses : null };
  out.scenes.push(row);
  await shot(`${name}-arrival-after`, `${id} selected and flown to by the app (its arrival pose), ${row.arrivalKm} km over the ground, the Sun ${e} degrees up; traverses shown: ${row.shown.join(', ') || 'none'}`);
  if (setGroup(false)) { await sleep(1200); await shot(`${name}-arrival-before`, 'the same pose with the traverse group hidden for the shot'); setGroup(true); }
  // 2. the heights a line is read from.
  try { sr.deselect(); rig.stopFollow(); } catch { /* nothing selected */ }
  for (const [k, tag] of [[3, 'wide'], [1.2, 'mid'], [0.5, 'near']]) {
    const km = Math.max(4, lengthKm * k);
    MARS.over(lat, lon, km, MARS_KM, 25, 180);
    if (tiled()) await tilesReady('mars-themis-day-ir');
    await sleep(5000);
    const at = { id, tag, km: Math.round(km), actualKm: camKm('mars', MARS_KM), distance: +rig.state.distance.toFixed(5), shown: shown() };
    out.scenes.push(at);
    if (tiled() && tag === 'mid' && !at.shown.some((t) => t.startsWith(id))) out.problems.push(`${id}: its traverse is not shown from ${Math.round(km)} km: ${JSON.stringify(shown())}`);
    await shot(`${name}-${tag}-after`, `${id} from ${Math.round(km)} km (${k} x its line's ${lengthKm} km), the Sun ${e} degrees up; traverses shown: ${at.shown.join(', ') || 'none'}`);
    if (setGroup(false)) { await sleep(1200); await shot(`${name}-${tag}-before`, 'the same place with the traverse group hidden for the shot'); setGroup(true); }
    // The rover's model (scene/heroes.js) stands over the path it drove, bigger than the path is wide: once with it hidden.
    const heroes = sr.scene.getObjectByName('heroes');
    if (heroes && tag !== 'wide') { heroes.visible = false; await sleep(1200); await shot(`${name}-${tag}-norover`, `${id} from ${Math.round(km)} km with the traverse drawn and the rover's model hidden for the shot`); heroes.visible = true; }
  }
}
if (!tiled()) {
  const s = tilesState('mars-themis-day-ir');
  out.phone = { traverses: s && s.traverses ? s.traverses : null, group: !!MARS.mesh.getObjectByName('mars-traverses') };
  if (out.phone.group) out.problems.push('a phone (tier 0, no tiles) has a traverse group on Mars');
}
sr.clock.live();
return finish(out);
