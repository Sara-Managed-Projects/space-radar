// r13-w3d: the Moon's named places, Spirit's and Opportunity's traverses, Huygens on Titan, and the small
// bodies' measured shapes and spins (release 1.3.0 stage W3-d, internal spec 0077, internal #864, #866, #868).
//
// 1. THE MOON'S NAMED PLACES (#864). "Tycho" typed into the search field the visitor has (the list, with
//    the place in it), then each of Copernicus, Tycho, Shackleton and the south pole selected and flown to
//    as a click on its row does: the ARRIVAL POSE is the app's own, not set here. The clock is set first so
//    the Sun is low over the two craters (a morning Sun 8 and 6 degrees up), where the shadows cast from
//    LOLA's heights draw them; the pole has the Sun it has. Beside each: the card's lines and the camera's
//    height over the ground.
// 2. THE TRAVERSES ON MARS (#868). Spirit in Gusev and Opportunity on Meridiani, by day (the clock set so
//    the Sun is 35 degrees up there), from 60 km and closer, each twice from the same place: with the line
//    (after) and with the traverse group hidden for the shot (before: main has no line on Mars).
// 3. HUYGENS ON TITAN (#868): selected and flown to, then from 600 km over the site: the mark on Titan's
//    map where the probe came down (main could not place it: Titan had no fixed frame).
// 4. THE SMALL BODIES (#866): Ryugu, Itokawa and Didymos with Dimorphos, each selected and close, from
//    four sides, then a quarter of its measured turn later from the first side (the spin, with the clock).
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r13-w3d';
const out = { scenes: [], problems: [] };
const deg = Math.PI / 180;
const dot = (a, b) => a.x * b.x + a.y * b.y + a.z * b.z;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const tilesMod = await import('/js/scene/tiles.js');
const tiled = () => { try { return sr.quality.describe().tier >= 1; } catch { return false; } };
const tilesState = (id) => { try { const t = sr.quality.tiles(); return t && t.sets ? t.sets[id] : null; } catch { return null; } };
const tilesReady = async (id, capMs = 60000) => tiled() && until(() => { const s = tilesState(id); return s && s.showing && s.loading === 0; }, capMs, 500);
const camKm = (W, RKM) => { const m = sr.worlds.meshFor(W); const c = rig.camera || sr.camera; if (!m || !c) return null; const p = c.position; return Math.round((Math.hypot(p.x - m.position.x, p.y - m.position.y, p.z - m.position.z) / m.scale.x - 1) * RKM); };
const cardText = () => { const n = [...document.querySelectorAll('[class*="sr-card"]')].find((e) => e.offsetParent && e.innerText && e.innerText.trim().length > 20); return n ? n.innerText.replace(/\s+/g, ' ').slice(0, 400) : null; };

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

// --- 1. the Moon's named places ---------------------------------------------------------------------------
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
sr.clock.goTo(AT);
sr.clock.setPaused(true);
await stage('moon', 12000);
const MOON = onWorld('moon');
const SYNODIC_S = 29.530589 * 86400;
{
  // The search field, as the visitor has it: "Tycho" lists the crater.
  const field = [...document.querySelectorAll('.sr-search__input')].find((n) => n.offsetParent);
  if (field) {
    field.focus();
    field.value = 'Tycho';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    await sleep(2500);
    const rows = [...document.querySelectorAll('.sr-search__list [role="option"]')].map((n) => n.textContent.replace(/\s+/g, ' ').trim()).slice(0, 8);
    out.searchTycho = rows;
    if (!rows.some((r) => /Tycho crater/.test(r))) out.problems.push('search "Tycho" does not list Tycho crater: ' + JSON.stringify(rows));
    await shot('00-search-tycho', 'the search field with "Tycho" typed: ' + rows.join(' | '));
    field.value = '';
    field.dispatchEvent(new Event('input', { bubbles: true }));
    field.blur();
    await sleep(800);
  } else out.problems.push('no search field shown');
}
for (const [id, name, lat, lon, elev] of [
  ['copernicus', '01-copernicus', 9.62, 339.92, 8],
  ['tycho', '02-tycho', -43.30, 348.78, 6],
  ['shackleton', '03-shackleton', -89.67, 129.78, null],
  ['moon-south-pole', '04-south-pole', -90, 0, null],
]) {
  const e = elev == null ? MOON.sunElev(lat, lon) : await MOON.morning(lat, lon, elev, SYNODIC_S);
  if (!(await go(id, null, 9000))) { out.problems.push('no record ' + id); continue; }
  await tilesReady('moon-lro-wac');
  await sleep(4000);
  const s = tilesState('moon-lro-wac');
  const row = { id, sunDeg: e, altKm: camKm('moon', 1737.4), card: cardText(), cast: s && s.cast ? { showing: s.cast.showing, level: s.cast.level } : null };
  out.scenes.push(row);
  await shot(name + '-arrive', `${id} selected and flown to by the app (its arrival pose): camera ${row.altKm} km over the ground, the Sun ${e} degrees up there, cast shadows ${row.cast && row.cast.showing ? 'on' : 'off'}`);
}
try { sr.deselect(); } catch { /* nothing selected */ }

// --- 2. the traverses on Mars -----------------------------------------------------------------------------
await stage('mars', 12000);
const MARS = onWorld('mars');
const SOL_S = 88775.244;
for (const [id, name, lat, lon, near] of [
  ['spirit', '05-spirit-gusev', -14.585, 175.50, 9],
  ['opportunity', '06-opportunity-meridiani', -2.15, 354.56, 70],
]) {
  const e = await MARS.morning(lat, lon, 35, SOL_S);
  for (const [km, tag] of [[near * 2.4, 'wide'], [near, 'near']]) {
    MARS.over(lat, lon, km, 3389.5, 25, 180);
    await tilesReady('mars-themis-day-ir');
    await sleep(5000);
    const s = tilesState('mars-themis-day-ir');
    const trav = s && s.traverses ? s.traverses.filter((t) => t.shown).map((t) => `${t.site} ${t.fade}`) : [];
    if (tag === 'near' && !trav.some((t) => t.startsWith(id))) out.problems.push(`${id}: its traverse is not shown from ${km} km: ${JSON.stringify(s && s.traverses)}`);
    out.scenes.push({ id, tag, km, sunDeg: e, traverses: s ? s.traverses : null, level: s ? s.level : null });
    await shot(`${name}-${tag}-after`, `${id} from ${Math.round(km)} km, the Sun ${e} degrees up; traverses shown: ${trav.join(', ') || 'none'}`);
    const g = MARS.mesh.getObjectByName('mars-traverses');
    if (g) { g.visible = false; await sleep(1500); await shot(`${name}-${tag}-before`, 'the same place and clock with the traverse group hidden for the shot (main: no line on Mars)'); g.visible = true; }
  }
}

// --- 3. Huygens on Titan ----------------------------------------------------------------------------------
await stage('titan', 12000);
const TITAN = onWorld('titan');
{
  const ok = await go('huygens', '07-huygens-arrive', 9000, 'Huygens selected and flown to by the app');
  if (!ok) out.problems.push('no record huygens');
  out.huygensCard = cardText();
  out.huygensSun = TITAN.sunElev(-10.573, 167.665);
  // Still selected: from 6 000 km out over the site, so the mark and its label sit on Titan's disc.
  rig.flyTo({ offset: unit(add(TITAN.outward(-10.573, 167.665), sunward('titan'), 0.6)), distance: (6000 / 2574.76) * TITAN.mesh.scale.x, ms: 0 });
  await sleep(6000);
  await shot('08-huygens-over', `the Huygens site, still selected, from about 6 000 km out over Adiri, leaning to the Sun (Sun ${out.huygensSun} degrees up there): the mark is the probe's coordinate on Titan's fixed frame`);
}

// --- 4. the small bodies ----------------------------------------------------------------------------------
sr.clock.goTo(AT);
try { if (!sr.isLayerOn('asteroids')) sr.setLayerOn('asteroids', true); } catch (e) { look.warns.push('probe: asteroids layer: ' + e); }
await sleep(5000);
for (const [id, name, periodH, wide] of [['asteroid-162173', '09-ryugu', 7.632625, 1], ['asteroid-25143', '10-itokawa', 12.13238, 1], ['asteroid-65803', '11-didymos', 2.26, 2.2]]) {
  if (!(await go(id, null, 12000))) { out.problems.push('no record ' + id); continue; }
  // The file arrives after the procedural stand-in: wait for the swap (heroes.js sends sr:model-upgraded).
  await sleep(6000);
  const d = rig.state.distance;
  const t0 = sr.clock.now();
  const sun = sunward('earth');
  const side = unit(cross(sun, { x: 0, y: 1, z: 0 }));
  // Four sides round it, each leaning to the Sun so the face seen is lit.
  for (let k = 0; k < 4; k++) {
    const a = (k * 90 - 45) * deg;
    const off = unit(add({ x: sun.x * Math.cos(a), y: sun.y * Math.cos(a), z: sun.z * Math.cos(a) }, side, Math.sin(a)));
    rig.flyTo({ offset: unit(add(off, { x: 0, y: 1, z: 0 }, k % 2 ? 0.35 : -0.2)), distance: d * wide, ms: 0 });
    await shot(`${name}-${k + 1}`, `${id} from side ${k + 1} of 4 (the camera ${k * 90 - 45} degrees round it from the Sun's side)`, 3500);
  }
  rig.flyTo({ offset: unit(add(sun, side, 0.5)), distance: d * wide, ms: 0 });
  await shot(`${name}-spin-0`, `${id} at the clock's instant, from the Sun's side`, 3000);
  sr.clock.goTo(t0 + periodH * 3600e3 / 4);
  await shot(`${name}-spin-quarter`, `${id} a quarter of its measured ${periodH} h turn later, from the same place: it has turned${id === 'asteroid-65803' ? ', and Dimorphos has gone round a little' : ''}`, 3500);
  sr.clock.goTo(t0);
  out.scenes.push({ id, card: cardText() });
}
sr.clock.goTo(AT);
sr.clock.live();
return finish(out);
