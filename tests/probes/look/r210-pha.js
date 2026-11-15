// r210-pha: THE POTENTIALLY HAZARDOUS ASTEROIDS (release 2.1.0, internal #37), the clock held at 2026-11-15 12:00 UTC.
//   1. The Sun's stage, the inner Solar System from above (4.5 AU out), the layer OFF (the BEFORE) and then ON by its box
//      (sr.setLayerOn), waiting for data/pha.js to build its records: 2 500 dots on their orbits, the planets' orbits among them.
//   2. The same place seen at a slant, so the spread above and below the ecliptic shows.
//   3. Four asteroids, each selected as a search row does and read back as card text: Icarus (an Apollo with a 0.8 eccentricity),
//      Midas, 1999 XS35 (a comet-like orbit out to 35 au) and one unnamed one. The card's first sentence, the why line, the source and
//      the honesty line must have no hole in them.
//   4. The bytes the file cost (data/pha.json) and the frame intervals with the layer on.
// Run: gh workflow run look.yml -f probe=r210-pha -f ref=<branch> -f width=1600 -f height=900, and again with -f mobile=true.
look.probe = 'r210-pha';
const out = { counts: {}, cards: {}, files: [], frames: {}, problems: [] };
sr.clock.goTo(Date.UTC(2026, 10, 15, 12, 0, 0));
sr.clock.setPaused(true);
const cardText = () => { const n = [...document.querySelectorAll('[class*="sr-card"]')].find((e) => e.offsetParent && e.innerText && e.innerText.trim().length > 20); return n ? n.innerText.replace(/\s+\n/g, '\n').slice(0, 1600) : null; };
const fileBytes = () => {
  try {
    return performance.getEntriesByType('resource').filter((e) => /\/data\/pha\.json/.test(e.name)).map((e) => ({ file: e.name.split('/').pop(), transfer: e.transferSize, body: e.encodedBodySize, decoded: e.decodedBodySize }));
  } catch { return []; }
};
const frames = (n = 30, capMs = 40000) => new Promise((resolve) => {
  const stamps = [];
  const began = performance.now();
  const step = (t) => {
    stamps.push(t);
    if (stamps.length <= n && performance.now() - began < capMs) { requestAnimationFrame(step); return; }
    const gaps = [];
    for (let i = 1; i < stamps.length; i++) gaps.push(stamps[i] - stamps[i - 1]);
    gaps.sort((a, b) => a - b);
    const at = (q) => (gaps.length ? Math.round(gaps[Math.min(gaps.length - 1, Math.floor(q * gaps.length))] * 10) / 10 : null);
    resolve({ medianMs: at(0.5), p95Ms: at(0.95) });
  };
  requestAnimationFrame(step);
});
await stage('sun', 8000);
const u = sr.stage.unitKm || 1000;
const view = async (offset, au) => {
  const s = sr.worlds.drawnPositionOf('sun');
  rig.flyTo({ targetScene: { x: s.x, y: s.y, z: s.z }, offset: unit(offset), distance: (au * 149597870.7) / u, ms: 0 });
  await sleep(4000);
};
out.fileBefore = fileBytes();
out.counts.before = (sr.recordsFor('pha') || []).length;
await view({ x: 0.02, y: 0.02, z: 1 }, 4.5);
await shot('01-inner-system-off', 'the Sun\'s stage from above, 4.5 AU out, the potentially hazardous asteroids layer OFF');
sr.setLayerOn('pha', true);
const ok = await until(() => (sr.recordsFor('pha') || []).length > 2000, 90000, 500);
out.counts.on = (sr.recordsFor('pha') || []).length;
if (!ok) out.problems.push('the pha layer built no records in 90 s');
await sleep(3000);
out.frames.top = await frames();
await shot('02-inner-system-on', 'the same place with the layer on: ' + out.counts.on + ' records | median ' + out.frames.top.medianMs + ' ms, p95 ' + out.frames.top.p95Ms + ' ms');
await view({ x: 0.9, y: 0.5, z: 0.45 }, 4.5);
await shot('03-inner-system-slant', 'the same, seen at a slant: the spread above and below the ecliptic');
for (const [q, name, note] of [['pha-20001566', '04-icarus', 'Icarus: an Apollo, eccentricity 0.83, passing inside Mercury\'s orbit'], ['pha-20001981', '05-midas', 'Midas: an Apollo asteroid'], ['pha-50024738', '06-1999-xs35', '1999 XS35: a comet-like orbit out to 35 au']]) {
  const ok2 = await go(q, name, 7000, note);
  if (!ok2) { out.problems.push(q + ' is not a record'); continue; }
  const text = cardText();
  out.cards[q] = text;
  if (!text) out.problems.push(q + ': no card');
  else if (/undefined|NaN|\{[a-z]+\}/.test(text)) out.problems.push(q + ': a hole in the card');
}
out.files = fileBytes();
out.firstSentences = Object.fromEntries(Object.entries(out.cards).map(([k, v]) => [k, (v || '').split('\n').slice(0, 6).join(' / ')]));
return finish(out.problems.length ? { fail: out.problems.join('; '), out } : { out });
