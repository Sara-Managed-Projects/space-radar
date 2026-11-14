// c2-drawing: the sky and stage drawing fixes of batch C2 (internal #273 to #288, #325), one picture each where there is
// a thing to see. Each state is wrapped, so one that cannot be reached is a line in `missing`/`errors` and not the end.
//   1  the daytime crescent Moon from Madrid, 13 November 2026 14:00 UTC (16 % lit, 19 degrees up, the Sun 25 up)  #273
//   2  the constellation names in the night sky of the same place                                                  #288
//   3  Betelgeuse close, with the far names that were printed across its disc                                      #275 #277
//   4  the stellar rung from Betelgeuse: the names chosen, the host swarm                                          #284 #285
//   5  the Milky Way from outside, then the Local Group                                                            #283 #285
//   6  Andromeda close, the hero model                                                                             #282
//   7  TRAPPIST-1 e                                                                                                #286
//   8  stages changed faster than a compile finishes: no page error                                                #325
look.probe = 'c2-drawing';
const out = { step: {}, trappist: null };
const find = (ids) => { for (const id of ids) { const r = sr.recordById(id); if (r) return r; } look.missing.push(ids[0]); return null; };
const guard = async (name, fn) => { try { await fn(); out.step[name] = 'ok'; } catch (e) { out.step[name] = 'threw'; look.errors.push('probe: ' + name + ' threw: ' + (e && e.stack || e)); } };
const DEG = Math.PI / 180;

await guard('moon-by-day', async () => {
  sr.setObserver({ name: 'Madrid', country: 'Spain', latDeg: 40.4, lonDeg: -3.7, latRad: 40.4 * DEG, lonRad: -3.7 * DEG, altKm: 0.6, source: 'city' });
  sr.clock.goTo(Date.UTC(2026, 10, 13, 14, 0, 0));
  sr.clock.setPaused(true);
  sr.skyView.enter(sr.skyView.observer || { latRad: 40.4 * DEG, lonRad: -3.7 * DEG, altKm: 0.6 });
  await sleep(9000);
  sr.skyView.lookAtDeg(160, 19);
  await shot('c2-1-moon-by-day', 'Madrid 13 Nov 2026 14:00 UTC, looking SSE: the Moon 16 % lit, 19 degrees up, the Sun 25 degrees up', 6000);
});
await guard('constellation-names', async () => {
  sr.clock.goTo(Date.UTC(2026, 10, 13, 22, 0, 0));
  await sleep(4000);
  sr.skyView.lookAtDeg(180, 35);
  await shot('c2-2-constellation-names', 'the same place at 22:00 UTC, looking south: the constellation names', 6000);
  out.skyLabels = [...document.querySelectorAll('.sr-skylabel--con')].slice(0, 6).map((n) => ({ text: n.textContent, font: getComputedStyle(n).fontFamily.slice(0, 40), size: getComputedStyle(n).fontSize }));
  sr.skyView.exit();
  sr.clock.live();
  await sleep(2000);
});
const bet = find(['exotic-betelgeuse', 'betelgeuse', 'hip-27989']);
await guard('betelgeuse', async () => {
  if (!bet) return;
  sr.setStage('stellar'); await sleep(12000);
  sr.select(bet, { fly: true, undo: false });
  await sleep(20000);
  out.starDisc = sr.starDisc ? sr.starDisc.state() : null;
  await shot('c2-3-betelgeuse-close', 'Betelgeuse close: the disc, its limb, and which names are printed on it', 4000);
  out.labels = [...document.querySelectorAll('#labels .label:not([hidden]) .label__text')].map((n) => n.textContent);
});
await guard('stellar-from-betelgeuse', async () => {
  if (!bet) return;
  rig.flyTo({ distance: rig.state.distance * 400, ms: 0 });
  await sleep(10000);
  await shot('c2-4-stellar-from-betelgeuse', 'the stellar rung from far out: the names chosen and the planet-host swarm', 3000);
  out.labelsFar = [...document.querySelectorAll('#labels .label:not([hidden]) .label__text')].map((n) => n.textContent);
});
await guard('galaxy-rung', async () => {
  sr.deselect(); sr.setStage('galaxy'); await sleep(20000);
  await shot('c2-5-galaxy-rung', 'the Milky Way from outside: the model and what is drawn over it', 4000);
  out.galaxyDist = rig.state.distance;
  out.labelsGalaxy = [...document.querySelectorAll('#labels .label:not([hidden]) .label__text')].map((n) => n.textContent);
  sr.setStage('local-group'); await sleep(20000);
  await shot('c2-6-local-group', 'the Local Group rung: the background points and the markers', 4000);
});
await guard('andromeda', async () => {
  const m31 = find(['dso-m31']);
  if (!m31) return;
  sr.select(m31, { fly: true, undo: false });
  await sleep(25000);
  out.m31 = { level: sr.deep && sr.deep.level ? sr.deep.level('dso-m31') : null, px: sr.deep && sr.deep.radiusPx ? sr.deep.radiusPx('dso-m31') : null };
  await shot('c2-7-andromeda', 'Andromeda on arrival: the hero model', 4000);
  rig.flyTo({ distance: rig.state.distance * 0.35, ms: 0 });
  await sleep(12000);
  await shot('c2-8-andromeda-closer', 'Andromeda closer', 4000);
});
await guard('trappist-1-e', async () => {
  const e = find(['exo-trappist-1-e']);
  if (!e) return;
  sr.select(e, { fly: true, undo: false });
  await sleep(30000);
  out.trappist = { stage: sr.stage && sr.stage.worldId };
  await shot('c2-9-trappist-1-e', 'TRAPPIST-1 e', 5000);
});
await guard('fast-stage-changes', async () => {
  const before = look.errors.length;
  for (const s of ['galaxy', 'earth', 'local-group', 'stellar', 'galaxy', 'sun', 'stellar', 'earth']) { sr.setStage(s); await sleep(350); }
  await sleep(8000);
  const mine = look.errors.slice(before).filter((e) => /isReady|classList|boot/i.test(e));
  out.fastStageErrors = mine;
  if (mine.length) out.fail = 'a stage change disposed a warm-up mid-compile and the page threw: ' + mine[0];
  out.bootFailed = !!document.querySelector('#boot.boot-failed');
});
return finish(out);
