// r15-b1: THE SMALL BODIES IN THEIR MEASURED SHAPES (release 1.5.0 stage B1, internal spec 0079, internal #1065).
//
// Eleven records, one after another with the clock held at 2026-10-15 12:00 UTC: Lutetia, Steins, Donaldjohanson, Arrokoth, the
// radar-shaped Toutatis, Geographos, Kleopatra, Mithra, Golevka and 1996 HW1, and comet 67P. For each:
//   1. the record selected as a click on its row does, and the picture AS THE APP FRAMES IT WITH ITS CARD (the card's "drawn as" line
//      is read into the summary), once the file has replaced the procedural stand-in (heroes.js sends `sr:model-upgraded`);
//   2. FOUR SIDES at that distance, each leaning to the Sun so the face seen is lit: 45 degrees to the left of the Sun's side, to
//      the right, 135 degrees round, and 225 round (the far side);
//   3. for the three whose shapes carry a baked relief (Lutetia, Donaldjohanson, 67P), once more from 0.4 of the distance, so the
//      normal map is what the picture is of.
// The summary carries, per record: whether the file arrived and how long it took, the card text, and the model's meshes, triangles
// and the colour of its material. A record that is not up today (the comets layer without 67P) is named in `problems`.
//   4. each record's card with "About it" opened (`${name}-card`): the line that says how the shape was made.
// `-f subject=asteroid-486958_comet-67P` walks only those records (ids joined by an underscore; the workflow's `subject` input).
// Run it at `-f width=1600 -f height=900` and again with `-f mobile=true`.
look.probe = 'r15-b1';
const out = { scenes: [], problems: [] };
const deg = Math.PI / 180;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
const AT = Date.UTC(2026, 9, 15, 12, 0, 0);
sr.clock.goTo(AT);
sr.clock.setPaused(true);
for (const layer of ['asteroids', 'comets']) {
  try { if (!sr.isLayerOn(layer)) sr.setLayerOn(layer, true); } catch (e) { look.warns.push('probe: ' + layer + ' layer: ' + e); }
}
await sleep(5000);

const upgraded = new Map();
window.addEventListener('sr:model-upgraded', (e) => { if (e && e.detail) upgraded.set(e.detail.id, Date.now()); });
const cardText = () => { const n = [...document.querySelectorAll('[class*="sr-card"]')].find((e) => e.offsetParent && e.innerText && e.innerText.trim().length > 20); return n ? n.innerText.replace(/\s+/g, ' ').slice(0, 900) : null; };
const camera = () => rig.camera || sr.camera;
/** Where the camera is looking at: its position plus its forward axis times the rig's distance. */
const lookingAt = () => {
  const c = camera();
  c.updateMatrixWorld();
  const e = c.matrixWorld.elements;
  const f = unit({ x: -e[8], y: -e[9], z: -e[10] });
  const d = rig.state.distance;
  return { x: c.position.x + f.x * d, y: c.position.y + f.y * d, z: c.position.z + f.z * d };
};
const toSun = (from) => { const s = sr.worlds.meshFor('sun').position; return unit({ x: s.x - from.x, y: s.y - from.y, z: s.z - from.z }); };

const BODIES = [
  ['asteroid-21', '01-lutetia', true],
  ['asteroid-2867', '02-steins', false],
  ['asteroid-52246', '03-donaldjohanson', true],
  ['asteroid-486958', '04-arrokoth', false],
  ['asteroid-4179', '05-toutatis', false],
  ['asteroid-1620', '06-geographos', false],
  ['asteroid-216', '07-kleopatra', false],
  ['asteroid-4486', '08-mithra', false],
  ['asteroid-6489', '09-golevka', false],
  ['asteroid-8567', '10-hw1', false],
  ['comet-67P', '11-67p', true],
];
const asked = (new URLSearchParams(location.search).get('lookSubject') || '').split('_').filter(Boolean);
/** The card's "About it" row, opened: the line that says how the shape was made is under it. */
const openAbout = async () => {
  const row = [...document.querySelectorAll('button, [role="button"], summary, a, div')].filter((e) => e.offsetParent && /^About it$/i.test((e.innerText || '').trim().split('\n')[0]))
    .sort((a, b) => a.querySelectorAll('*').length - b.querySelectorAll('*').length)[0];
  if (!row) return false;
  row.scrollIntoView({ block: 'center' });
  row.click();
  await sleep(1500);
  return true;
};
for (const [id, name, relief] of BODIES) {
  if (asked.length && !asked.includes(id)) continue;
  if (!sr.recordById(id)) { out.problems.push('no record ' + id); look.missing.push(id); continue; }
  const t0 = Date.now();
  await go(id, null, 3000);
  const arrived = await until(() => upgraded.has(id), 120000, 500);
  await sleep(2500);
  const d = rig.state.distance;
  const target = lookingAt();
  const sun = toSun(target);
  const side = unit(cross(sun, { x: 0, y: 1, z: 0 }));
  await shot(`${name}-0-framed`, `${id} as the app frames it, with its card; the file ${arrived ? 'arrived after ' + (upgraded.get(id) - t0) + ' ms' : 'did NOT arrive in two minutes'}`, 2500);
  const entry = { id, arrived, ms: arrived ? upgraded.get(id) - t0 : null, card: cardText(), distance: d };
  if (await openAbout()) { entry.about = cardText(); await shot(`${name}-card`, `${id}: the card with "About it" opened`, 1500); }
  else out.problems.push(id + ': no "About it" row to open');
  for (let k = 0; k < 4; k++) {
    const a = (k * 90 - 45) * deg;
    const off = unit(add({ x: sun.x * Math.cos(a), y: sun.y * Math.cos(a), z: sun.z * Math.cos(a) }, side, Math.sin(a)));
    rig.flyTo({ offset: unit(add(off, { x: 0, y: 1, z: 0 }, k % 2 ? 0.35 : -0.2)), distance: d, ms: 0 });
    await shot(`${name}-${k + 1}`, `${id} from side ${k + 1} of 4 (the camera ${k * 90 - 45} degrees round it from the Sun's side)`, 3000);
  }
  if (relief) {
    rig.flyTo({ offset: unit(add(sun, side, 0.6)), distance: d * 0.4, ms: 0 });
    await shot(`${name}-close`, `${id} from 0.4 of the distance, lit from the side: the baked relief`, 3500);
  }
  entry.render = frameCost();
  out.scenes.push(entry);
  if (!arrived) out.problems.push(id + ': the model file did not replace the procedural shape in two minutes');
}
sr.clock.live();
const fail = out.problems.length ? out.problems.join('; ') : undefined;
return finish({ ...out, fail });
