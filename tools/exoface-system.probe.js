// tools/exoface-system.probe.js -- TRAPPIST-1's planets wearing their faces on the system's own stage
// (internal #466 phase B). Open with `#stage=system-trappist-1&at=exo-trappist-1-e`.
//
//   node tools/cdp.mjs 'http://127.0.0.1:<port>/?sw=0#stage=system-trappist-1&at=exo-trappist-1-e' \
//     tools/exoface-system.probe.js --width=1440 --height=900 --gl=gpu --shot-dir=<dir> --block=celestrak.org,ll.thespacedevs.com
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const sr = () => window.spaceRadar;
for (let i = 0; i < 400 && !(sr() && sr().systems && sr().systems.stats().faced); i++) await wait(250);
if (!(sr() && sr().systems)) return { error: 'no systems' };
const out = { tier: sr().quality && sr().quality.describe(), shots: {} };
async function look(id, name) {
  if (id) { location.hash = '#stage=system-trappist-1&at=' + id; }
  await wait(7000);
  const st = sr().systems.stats();
  const card = document.querySelector('.sr-card');
  const text = card ? card.innerText : '';
  const m = text.match(/Artist’s impression[^\n]*/);
  const mesh = sr().systems.group.children.find((o) => o.userData && o.userData.recordId === (id || 'exo-trappist-1-e'));
  const tag = mesh && mesh.children.find((c) => c.name === 'exoface:tag');
  const S = await import('/js/scene/systems.js');
  out.line = out.line || S.faceLineOf('exo-trappist-1-e');
  const C = await import('/js/ui/cards.js');
  out.cardLineE = out.cardLineE || (C.systemLine ? C.systemLine({ id: 'exo-trappist-1-e' }) : null);
  out.shots[name] = { stats: st, cardLine: m ? m[0] : null, tagVisible: !!(tag && tag.visible), calls: sr().renderer.info.render.calls, latched: !!(sr().latch && sr().latch.latched), face: mesh && mesh.userData.exoface ? { cls: mesh.userData.exoface.face.cls, climate: mesh.userData.exoface.face.climate } : null };
  await window.cdpShot(name);
}
await look(null, 'system-e');
await look('exo-trappist-1-b', 'system-b');
await look('exo-trappist-1-h', 'system-h');
await look('star-trappist-1', 'system-all');
// The latch puts the neutral balls back and the card stops saying "Artist's impression".
location.hash = '#stage=system-trappist-1&at=exo-trappist-1-e';
await wait(6000);
sr().latch.force();
await wait(1500);
out.afterLatch = { faced: sr().systems.stats().faced, line: (await import('/js/scene/systems.js')).faceLineOf('exo-trappist-1-e') };
await window.cdpShot('system-e-latched');
return out;
