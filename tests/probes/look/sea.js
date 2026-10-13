// sea: open ocean from close, where the Earth's map tiles are on (scene/tiles.js THE SEA). The
// mid-Atlantic's fracture zones and the north-east Pacific's, each by day, straight down from
// 2 000 km and from 600 km: as the app draws it, and with the clouds taken off so that the water
// itself is in the picture. Then a coast with shallows (the Bahamas) and one with land beside deep
// water (West Africa), from 600 km, clouds off: the sea must be blue, the shallows not burnt, the
// land as it was; and the Alps, where a shadowed valley must not be taken for water. The same probe on main is the "before" (dispatch it with -f ref=main).
// Each picture's note says the tile layer's address, how many tiles were on screen and at what fade.
look.probe = 'sea';
const out = { views: [] };
const E = 'earth';
const earth = sr.worlds.meshFor(E);
const R = sr.worlds.drawnRadiusUnits(E);
const R_KM = 6378.137;
const U = earth.material.uniforms;
const centre = () => ({ x: earth.position.x, y: earth.position.y, z: earth.position.z });
/** From the Earth's centre toward a place, in the scene, now (scene/earth.js: +X is longitude 0, +Y north, -Z 90 E). */
const over = (latDeg, lonDeg) => {
  const la = (latDeg * Math.PI) / 180;
  const lo = (lonDeg * Math.PI) / 180;
  const l = [Math.cos(la) * Math.cos(lo), Math.sin(la), -Math.cos(la) * Math.sin(lo)];
  earth.updateMatrixWorld();
  const e = earth.matrixWorld.elements;
  return unit({ x: e[0] * l[0] + e[4] * l[1] + e[8] * l[2], y: e[1] * l[0] + e[5] * l[1] + e[9] * l[2], z: e[2] * l[0] + e[6] * l[1] + e[10] * l[2] });
};
/** The nearest moment to now when it is `hourUtc` o'clock: never more than twelve hours off, so today's clouds stay on. */
const nearest = (hourUtc) => {
  const now = Date.now();
  const d = new Date(now);
  const t = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), Math.floor(hourUtc), Math.round((hourUtc % 1) * 60));
  return [t - 86400000, t, t + 86400000].sort((a, b) => Math.abs(a - now) - Math.abs(b - now))[0];
};
const frames = async (n) => { for (let i = 0; i < n; i++) await new Promise((r) => requestAnimationFrame(r)); };
/** The Earth's tile patches on screen: how many, the least fade among them, and where the first one's picture is from. */
const tilesNow = () => {
  const g = earth.children.find((c) => /-tiles$/.test(c.name || ''));
  const on = g ? g.children.filter((c) => c.visible) : [];
  let fade = on.length ? 1 : 0;
  let src = null;
  for (const m of on) {
    const u = m.material.uniforms;
    if (u.uFade) fade = Math.min(fade, u.uFade.value);
    const img = u.uTile && u.uTile.value && u.uTile.value.image;
    if (!src && img && img.src) src = img.src;
  }
  return { group: g ? g.name : null, patches: g ? g.children.length : 0, on: on.length, fade: Math.round(fade * 100) / 100, src };
};
/** The layer the registry of the served branch names: its address says whether the sea floor is in it. */
const layerUrl = async () => { try { const m = await import('/js/data/tilesets.js'); return m.TILESETS.find((s) => s.world === 'earth').url.replace(/^.*\/best\/([^/]+)\/.*$/, '$1'); } catch (e) { return 'unknown (' + e + ')'; } };
/** The clouds off (their coverage raised to a power that leaves none) and back. Their shadows go with them. */
const gamma0 = U.uCloudGamma.value;
const clouds = (on) => { U.uCloudGamma.value = on ? gamma0 : 80; };
const down = (latDeg, lonDeg, altKm) => rig.flyTo({ targetScene: centre(), offset: over(latDeg, lonDeg), distance: R * (1 + altKm / R_KM), ms: 0 });
const picture = async (name, what) => {
  // The tiles of a new view: asked for, landed, faded in. A software frame is slow, so wait on the state, not the clock.
  await frames(3);
  await until(() => { const t = tilesNow(); return t.on > 0 && t.fade >= 1; }, 60000, 1000);
  await sleep(6000);
  await frames(3);
  const t = tilesNow();
  const row = { name, tiles: t.on, fade: t.fade, ...frameCost() };
  out.views.push(row);
  if (!t.on) look.warns.push(`probe: ${name}: no map tile is on screen, the picture is the globe's own map`);
  await shot(name, `${what} | ${out.layer}, ${t.on} tiles on screen, fade ${t.fade}`);
};
const place = async (key, title, latDeg, lonDeg, hourUtc, heights) => {
  sr.clock.goTo(nearest(hourUtc));
  await frames(3);
  for (const km of heights) {
    down(latDeg, lonDeg, km);
    clouds(true);
    await picture(`${key}-${km}km`, `${title}, straight down from ${km} km, by day, as the app draws it`);
    clouds(false);
    await picture(`${key}-${km}km-no-clouds`, `${title}, straight down from ${km} km, the clouds taken off: the water itself`);
    clouds(true);
  }
};

await go(E, null, 5000);
try { sr.deselect(); } catch (e) { look.warns.push('probe: deselect threw: ' + e); }
try { rig.stopFollow(); } catch (e) { look.warns.push('probe: stopFollow threw: ' + e); }
await frames(2);
// The tile module is fetched when the Earth is first large on screen: come close and wait for a patch.
down(2, -25, 2000);
out.tilesCame = await until(() => tilesNow().on > 0, 150000, 1000);
if (!out.tilesCame) { out.fail = 'no map tile of the Earth came on from 2 000 km (tier ' + JSON.stringify(sr.quality && sr.quality.describe && sr.quality.describe().tier) + ', latched ' + sr.latch.latched + ')'; await shot('0-no-tiles', 'no tile came'); return finish(out); }
out.layer = await layerUrl();
// The mid-Atlantic at the equator: the Romanche and St Paul fracture zones. Local noon at 25 W is 13:40 UTC.
await place('1-atlantic', 'the mid-Atlantic at the equator (2 N, 25 W)', 2, -25, 13.67, [2000, 600]);
// The north-east Pacific: the Mendocino, Murray and Molokai fracture zones. Local noon at 140 W is 21:20 UTC.
await place('2-pacific', 'the north-east Pacific (30 N, 140 W)', 30, -140, 21.33, [2000, 600]);
// Shallows and land: the Bahama banks (local noon 17:10 UTC) and Cape Verde to Senegal (local noon 13:10 UTC).
sr.clock.goTo(nearest(17.17));
await frames(3);
down(24.5, -77.5, 600);
clouds(false);
await picture('3-bahamas-600km-no-clouds', 'the Bahama banks from 600 km, the clouds taken off: shallows must be bright and not burnt');
sr.clock.goTo(nearest(13.17));
await frames(3);
down(14, -17, 600);
await picture('4-senegal-600km-no-clouds', 'the coast of Senegal from 600 km, the clouds taken off: land as it was beside deep water');
down(14, -17, 2000);
await picture('4-senegal-2000km-no-clouds', 'the same from 2 000 km');
// Dark land with shaded relief (the Alps; local noon 11:20 UTC): the test that finds water must not find it in a valley's shadow.
sr.clock.goTo(nearest(11.33));
await frames(3);
down(46.3, 9.5, 600);
await picture('5-alps-600km-no-clouds', 'the Alps from 600 km, the clouds taken off: no blue in the shadows of the valleys');
clouds(true);
sr.clock.live();
out.info = frameCost();
return finish(out);
