// r190-moons: SATURN'S SMALL MOONS IN THEIR CASSINI SHAPES (release 1.9.0, internal #1066), the clock held at 2026-10-15 12:00 UTC.
// Eleven records on the moons layer: Pan, Daphnis, Atlas, Prometheus, Pandora, Epimetheus, Janus, Telesto, Calypso, Helene, Hyperion. For each:
//   1. the record selected as a click on its row does, once the file has replaced the procedural stand-in (heroes.js sends
//      `sr:model-upgraded`); the card's text is read into the summary (no picture of its own: a render of this page is slow);
//   2. FOUR SIDES at that distance, each leaning to the Sun so the face seen is lit: 45 degrees to the left of the Sun's side, to the right,
//      135 degrees round, and 225 round (the far side).
// The summary carries, per record: whether the file arrived and how long it took, and the card text. A record that is not up is named in
// `problems`. `-f subject=janus_pan` walks only those records (ids joined by an underscore). Run it at `-f width=1600 -f height=900`.
look.probe = 'r190-moons';
const out = { scenes: [], problems: [] };
const deg = Math.PI / 180;
const add = (a, b, k = 1) => ({ x: a.x + b.x * k, y: a.y + b.y * k, z: a.z + b.z * k });
sr.clock.goTo(Date.UTC(2026, 9, 15, 12, 0, 0));
sr.clock.setPaused(true);
try { if (!sr.isLayerOn('moons')) sr.setLayerOn('moons', true); } catch (e) { look.warns.push('probe: moons layer: ' + e); }
await sleep(5000);

const upgraded = new Map();
window.addEventListener('sr:model-upgraded', (e) => { if (e && e.detail) upgraded.set(e.detail.id, Date.now()); });
const cardText = () => { const n = [...document.querySelectorAll('[class*="sr-card"]')].find((e) => e.offsetParent && e.innerText && e.innerText.trim().length > 20); return n ? n.innerText.replace(/\s+/g, ' ').slice(0, 900) : ''; };
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

const BODIES = ['pan', 'daphnis', 'atlas', 'prometheus', 'pandora', 'epimetheus', 'janus', 'telesto', 'calypso', 'helene', 'hyperion'];
const asked = (new URLSearchParams(location.search).get('lookSubject') || '').split('_').filter(Boolean);
for (const id of BODIES) {
  if (asked.length && !asked.includes(id)) continue;
  if (!sr.recordById(id)) { out.problems.push('no record ' + id); look.missing.push(id); continue; }
  const t0 = Date.now();
  await go(id, null, 3000);
  const arrived = await until(() => upgraded.has(id), 120000, 500);
  await sleep(2500);
  const d = rig.state.distance;
  const sun = toSun(lookingAt());
  const side = unit(cross(sun, { x: 0, y: 1, z: 0 }));
  const entry = { id, arrived, ms: arrived ? upgraded.get(id) - t0 : null, card: cardText(), distance: d };
  for (let k = 0; k < 4; k++) {
    const a = (k * 90 - 45) * deg;
    const off = unit(add({ x: sun.x * Math.cos(a), y: sun.y * Math.cos(a), z: sun.z * Math.cos(a) }, side, Math.sin(a)));
    rig.flyTo({ offset: unit(add(off, { x: 0, y: 1, z: 0 }, k % 2 ? 0.35 : -0.2)), distance: d, ms: 0 });
    await shot(`${id}-${k + 1}`, `${id} from side ${k + 1} of 4 (the camera ${k * 90 - 45} degrees round it from the Sun's side)`, 1500);
  }
  out.scenes.push(entry);
  if (!arrived) out.problems.push(id + ': the model file did not replace the procedural shape in two minutes');
}
sr.clock.live();
const fail = out.problems.length ? out.problems.join('; ') : undefined;
return finish({ ...out, fail });
