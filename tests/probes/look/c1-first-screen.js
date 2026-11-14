// c1-first-screen: the arrival of a deep-sky object from the Local Group rung (internal #264, #266), the search box after a
// selection it did not make (#317), and the frame latch's counters (#265). Pictures: Andromeda and M13 as the app frames
// them on arrival from `stage=local-group`, where a stage unit is a million light-years.
look.probe = 'c1-first-screen';
const out = { arrivals: {}, search: {}, latch: sr.latch && sr.latch.stats ? sr.latch.stats() : null };
const arrive = async (id, name) => {
  sr.setStage('local-group');
  await sleep(6000);
  const r = sr.recordById(id);
  if (!r) { look.missing.push(id); return; }
  sr.select(r, { fly: true, undo: false });
  await sleep(9000);
  const lv = sr.deep && sr.deep.level ? sr.deep.level(id) : null;
  const px = sr.deep && sr.deep.radiusPx ? sr.deep.radiusPx(id) : null;
  out.arrivals[id] = { stage: sr.stage && sr.stage.worldId, level: lv, radiusPx: px };
  await shot(name, `${id} on arrival from the Local Group rung: model level ${lv}, radius ${px} px`);
};
await arrive('dso-m31', 'c1-1-andromeda-from-local-group');
await arrive('dso-m13', 'c1-2-m13-from-local-group');
const box = document.querySelector('.sr-search input, input[type="search"]');
if (box) {
  box.value = 'Betelgeuse';
  const earth = sr.recordById('earth');
  if (earth) { sr.select(earth, { fly: false, undo: false }); await sleep(500); }
  out.search = { afterSelectingEarth: box.value };
  if (box.value) out.fail = 'the search box still reads ' + box.value + ' after another selection';
}
return finish(out);
