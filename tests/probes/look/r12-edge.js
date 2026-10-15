// r12-edge: the way out to the edge, and the microwave background's map at the horizon (internal spec
// 0076 stage W1-b, internal #781). On the Local Group's stage, the camera round the Sun: the local
// volume from 25 Mly, 1, 20 and 40 billion light-years (the map from inside, with its scale), the
// horizon from just outside with the map on its near wall, the same turned 60 degrees, and the map's
// edge at 50 billion light-years as the climb flies there (the Stars tab's "The edge of the map").
//
// THE BEFORE IN THE SAME RUN. Where the map is drawn the scene is photographed twice from the same
// place: first with the map held off (`sr.shells.debug({ cmb: false })`, which only a page opened with
// ?look=1 obeys: main's picture of that place), then with it on. The other scenes are the same either
// way, and their numbers say so (the shells' state: `cmb.drawn` false).
//
// Beside every picture: the camera's distance from the Sun, the shells' state (the horizon's wire, the
// words at the foot, the map's status, opacity and side), the words the screen reader is given
// (#sr-shells-words), the renderer's counts and the median and 95th percentile of 30 frame intervals,
// and the bytes the map's picture took over the network. Fails when the map never came, when it is
// drawn from 20 billion light-years, when it is not drawn from 40 or from outside, or when its words
// are not in the live region.
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r12-edge';
const out = { scenes: [], problems: [] };
const LY_KM = 9.4607304725808e12;

/** 30 frame intervals: the median and the 95th percentile, in ms (SwiftShader's: relative only). */
const frames = (n = 30, capMs = 60000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    resolve({ frames: gaps.length, p50Ms: at(0.5), p95Ms: at(0.95) });
  };
  requestAnimationFrame(step);
});
const mapBytes = () => {
  const e = performance.getEntriesByType('resource').filter((r) => /wmap-ilc-9yr\.webp/.test(r.name));
  return e.length ? { requests: e.length, transferSize: e[0].transferSize, decodedBodySize: e[0].decodedBodySize } : null;
};
const cmbOf = () => (sr.shells && sr.shells.state ? sr.shells.state().find((s) => s.id === 'cmb') : null);
const fromSunGly = () => Math.round((sr.camera.position.length() * sr.stage.unitKm / LY_KM / 1e9) * 100) / 100;

const snap = async (name, note, settleMs = 4000) => {
  await sleep(settleMs);
  const f = await frames();
  const live = document.getElementById('sr-shells-words');
  const row = {
    name, note,
    stage: sr.stage.worldId,
    fromSunGly: fromSunGly(),
    shells: sr.shells && sr.shells.state ? sr.shells.state() : null,
    spoken: live ? live.textContent : null,
    liveRegion: live ? { role: live.getAttribute('role'), ariaLive: live.getAttribute('aria-live') } : null,
    cost: frameCost(),
    mapBytes: mapBytes(),
    ...f,
  };
  out.scenes.push(row);
  const c = row.shells ? row.shells.find((s) => s.id === 'cmb') : null;
  await shot(name, `${note} | ${row.fromSunGly} Gly from the Sun; map ${c ? `${c.status}, ${c.drawn ? `drawn ${c.side} at ${Math.round(c.opacity * 100)} %` : 'not drawn'}` : 'none'}; ${row.cost ? row.cost.calls : '?'} calls; p50 ${f.p50Ms} ms, p95 ${f.p95Ms} ms`);
  return row;
};
/** One place, twice: main's picture (the map held off) and this stage's. */
const pair = async (name, note) => {
  sr.shells.debug({ cmb: false });
  const before = await snap(`${name}-before`, `BEFORE (the map held off, as on main): ${note}`);
  sr.shells.debug({ cmb: true });
  const after = await snap(`${name}-after`, `AFTER: ${note}`);
  return { before, after };
};

try {
  sr.deselect();
  await stage('local-group', 9000);
  if (!sr.shells) await until(() => !!sr.shells, 20000);
  if (!sr.shells || !sr.shells.debug) { out.problems.push('no sr.shells.debug: the shells did not load, or this is a ref from before W1-b'); }
  const glyU = (n) => (n * 1e9 * LY_KM) / sr.stage.unitKm;
  const sun = { x: 0, y: 0, z: 0 };
  // A little above the ecliptic, toward the Galactic north: the same side of the Sun for every scene.
  const side = unit({ x: 0.55, y: 0.5, z: 0.67 });
  const put = (gly, offset = side) => rig.flyTo({ targetScene: sun, offset, distance: glyU(gly), ms: 0 });

  put(0.025);
  await snap('e01-local-volume', 'the local volume from 25 Mly: nothing of the map is fetched');
  out.fetchedAt1 = !!mapBytes();
  put(1);
  await snap('e02-one-gly', 'a billion light-years from the Sun');
  put(20);
  const s20 = await snap('e03-twenty-gly', '20 billion light-years: the map\'s picture is fetched, and not drawn: from in here the deep sky keeps its dark sky', 6000);
  const c20 = s20.shells && s20.shells.find((s) => s.id === 'cmb');
  if (c20 && c20.drawn) out.problems.push('the map is drawn from 20 billion light-years');
  put(40);
  const p40 = await pair('e04-forty-gly-inside', '40 billion light-years, looking back past the Sun: the far side of the map from inside, its words and colour scale at the foot');
  const c40 = p40.after.shells && p40.after.shells.find((s) => s.id === 'cmb');
  if (!c40 || c40.status !== 'ready') out.problems.push(`the map never came (${c40 && c40.status})`);
  else if (!c40.drawn || c40.side !== 'inside') out.problems.push('the map is not drawn from inside at 40 billion light-years');
  if (!/oldest light/.test(p40.after.spoken || '') || !/Colour scale/.test(p40.after.spoken || '')) out.problems.push(`the live region does not hold the map's words: ${p40.after.spoken}`);
  put(47.5);
  const p47 = await pair('e05-horizon-outside', 'the horizon from just outside, 47.5 billion light-years: the map on its near wall, the horizon\'s words with the map\'s and its scale');
  const c47 = p47.after.shells && p47.after.shells.find((s) => s.id === 'cmb');
  if (!c47 || !c47.drawn || c47.side !== 'outside') out.problems.push('the map is not drawn from outside the horizon');
  // Turned 60 degrees round the Sun at the same distance: another part of the sky's map on the wall.
  rig.flyTo({ azimuth: rig.state.azimuth + Math.PI / 3, polar: rig.state.polar, ms: 0 });
  await pair('e06-horizon-turned60', 'the same distance, turned 60 degrees round the Sun: another part of our sky on the near wall');
  // The map's edge as a visitor gets there: the Stars tab's row, one flight from a billion light-years.
  put(1);
  await sleep(2500);
  const climb = sr.wantClimb ? await sr.wantClimb() : null;
  if (climb) {
    await new Promise((resolve) => { climb.toEdge({ onArrive: resolve }); setTimeout(resolve, 45000); });
    await pair('e07-edge-by-the-climb', '"The edge of the map": 50 billion light-years, flown there by the climb; the horizon\'s near wall with the map, the band past it said to be an illustration');
  } else out.problems.push('no climb to fly to the edge');
  out.mapBytes = mapBytes();
  if (out.mapBytes && out.mapBytes.requests !== 1) out.problems.push(`the map's picture was asked for ${out.mapBytes.requests} times`);
  out.edgeRung = (await import('/js/data/ladder.js')).LADDER_RUNGS.slice(-1)[0];
} catch (e) { look.errors.push('probe: r12-edge threw: ' + (e && e.stack || e)); }

if (out.problems.length) out.fail = out.problems.join('; ');
return finish(out);
