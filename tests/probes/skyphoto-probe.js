// tests/probes/skyphoto-probe.js -- "Name the stars in your photo" (/sky-photo/, forge #572), looked at in a real Chrome.
// A standalone tools/cdp.mjs probe, not a look-workflow one: the page is a static tool, not the app the prelude drives.
//
//   node tools/cdp.mjs http://127.0.0.1:<port>/sky-photo/index.html tests/probes/skyphoto-probe.js --shot-dir=DIR --bytes=req.json
//
// No photo of anyone's is used: the probe DRAWS one, the Orion area from our own named stars through a known camera
// (60 degrees wide, turned 12 degrees, with a little noise and a glow at the bottom edge), hands it to the page's file
// input as a File, taps Betelgeuse and Rigel where the camera put them and names them, snaps, and saves. Pictures:
// skyphoto-empty, skyphoto-named, skyphoto-export (the PNG the page made, drawn back). It returns what the page
// fetched after the photo was given, so the run shows the photo itself went nowhere (--bytes lists every request).
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const until = async (f, ms = 60000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { const v = f(); if (v) return v; await sleep(200); } return null; };
const out = { fail: [] };
const root = await until(() => { const el = document.querySelector('[data-skyphoto]'); return el && el.skyphoto ? el : null; });
if (!root) return { fail: ['the tool did not start'] };
await sleep(400);
if (window.cdpShot) await window.cdpShot('skyphoto-empty');
const SRC = document.querySelector('script[src*="skyphoto.js"]').src; // the page's own script: paths from it work under /<lang>/ too
const core = await import(new URL('skyphoto-core.js', SRC).href);
const names = (await (await fetch(new URL('../../data/skystars.names.json', SRC))).json()).rows;
const lines = (await (await fetch(new URL('../../data/constellations.lines.json', SRC))).json()).features;
const W = 2400, H = 1600;
const up = core.roughSolution({ centreDir: core.radecDir(92, 8), upDir: core.radecDir(92, 9), hfovDeg: 60, width: W, height: H });
const roll = 12 * Math.PI / 180;
const cam = { ...up, A: [up.A[0] * Math.cos(roll) - up.A[1] * Math.sin(roll), up.A[0] * Math.sin(roll) + up.A[1] * Math.cos(roll)] };
const c = document.createElement('canvas');
c.width = W; c.height = H;
const g = c.getContext('2d');
const grad = g.createLinearGradient(0, 0, 0, H);
grad.addColorStop(0, '#04060c'); grad.addColorStop(0.8, '#0a1222'); grad.addColorStop(1, '#2a2416');
g.fillStyle = grad; g.fillRect(0, 0, W, H);
const img = g.getImageData(0, 0, W, H);
let seed = 3;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
for (let i = 0; i < img.data.length; i += 4) { const n = rnd() * 10; img.data[i] += n; img.data[i + 1] += n; img.data[i + 2] += n; }
g.putImageData(img, 0, 0);
const pos = {};
for (const r of names) {
  const p = core.project(cam, core.radecDir(r[1], r[2]));
  if (!p || p[0] < 0 || p[1] < 0 || p[0] > W || p[1] > H) continue;
  pos[r[0]] = p;
  const rad = Math.max(1.2, 5.5 - r[3]);
  const b = g.createRadialGradient(p[0], p[1], 0, p[0], p[1], rad * 2.2);
  const tint = r[0] === 'Betelgeuse' ? '255,200,160' : r[0] === 'Rigel' ? '200,220,255' : '240,240,255';
  b.addColorStop(0, `rgba(${tint},1)`); b.addColorStop(0.4, `rgba(${tint},0.6)`); b.addColorStop(1, `rgba(${tint},0)`);
  g.fillStyle = b; g.beginPath(); g.arc(p[0], p[1], rad * 2.2, 0, Math.PI * 2); g.fill();
}
const blob = await new Promise((r) => c.toBlob(r, 'image/jpeg', 0.92));
const file = new File([blob], 'orion-test.jpg', { type: 'image/jpeg' });
const before = performance.getEntriesByType('resource').length;
await root.skyphoto.takeFile(file);
await sleep(600);
const canvas = document.querySelector('.skyphoto__canvas');
const tap = async (p) => {
  const r = canvas.getBoundingClientRect();
  canvas.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + p[0] * r.width / W, clientY: r.top + p[1] * r.height / H }));
  await sleep(300);
};
const pick = async (starName) => {
  const row = [...document.querySelectorAll('.skyphoto__chooser .ui-row')].find((b) => b.querySelector('.ui-row__t').textContent === starName);
  if (row) { row.click(); await sleep(300); return true; }
  const sel = document.querySelector('.skyphoto__chooser select');
  sel.value = starName; sel.dispatchEvent(new Event('change')); await sleep(300); return !!sel.value;
};
await tap(pos.Betelgeuse); if (!(await pick('Betelgeuse'))) out.fail.push('Betelgeuse not offered');
await tap(pos.Rigel); if (!(await pick('Rigel'))) out.fail.push('Rigel not offered');
await tap(pos.Bellatrix); if (!(await pick('Bellatrix'))) out.fail.push('Bellatrix not offered');
const snap = [...document.querySelectorAll('.skyphoto__side > .ui-btn--secondary')].find((b) => !b.hidden); // the snap button (the rough box's own is inside it)
if (snap) { snap.click(); await sleep(400); }
// a time and a city: the planets and the Moon (Jupiter is in Gemini, at the photo's left edge, in January 2026; the
// synthetic photo has no planet drawn in it, so its mark sits on dark sky: the picture shows the overlay, not a match)
const when = document.querySelector('#skyphoto-when');
when.value = '2026-01-10T21:00'; when.dispatchEvent(new Event('change'));
const where = document.querySelector('#skyphoto-where');
where.value = [...where.options].find((o) => /^London/.test(o.textContent)).value; where.dispatchEvent(new Event('change'));
await until(() => root.skyphoto.state.bodies.length, 30000);
await sleep(400);
const st = root.skyphoto.state;
out.bodies = st.bodies.map((b) => b.id);
const d = st.sol ? core.describe(st.sol, W, H) : null;
out.fov = d && +d.fovDeg[0].toFixed(2);
out.fit = document.querySelector('.skyphoto__fit').textContent;
out.status = document.querySelector('.skyphoto__status').textContent;
out.snapped = st.snapped.length;
const sm = core.residuals(st.sol, [{ dir: core.radecDir(names.find((r) => r[0] === 'Saiph')[1], names.find((r) => r[0] === 'Saiph')[2]), px: pos.Saiph }])[0];
out.saiphMissPx = +sm.toFixed(2);
if (!(sm < 3)) out.fail.push(`Saiph, never tapped, lands ${sm} px from where the camera drew it`);
window.scrollTo(0, canvas.getBoundingClientRect().top + window.scrollY - (innerWidth < 600 ? 140 : 90)); // clear of the sticky header
await sleep(300);
if (window.cdpShot) await window.cdpShot('skyphoto-named');
// save: catch the PNG the page hands to a link, draw it back
let saved = null;
const orig = URL.createObjectURL;
URL.createObjectURL = (b) => { if (b && b.type === 'image/png') saved = b; return orig.call(URL, b); };
const HA = HTMLAnchorElement.prototype.click;
HTMLAnchorElement.prototype.click = function () { if (!this.download) HA.call(this); };
[...document.querySelectorAll('.skyphoto__side .ui-btn--primary')][0].click();
await until(() => saved, 20000);
HTMLAnchorElement.prototype.click = HA;
URL.createObjectURL = orig;
if (!saved) out.fail.push('no PNG was made');
else {
  const bmp = await createImageBitmap(saved);
  out.export = [bmp.width, bmp.height, saved.size];
  document.body.innerHTML = '';
  document.body.style.margin = '0';
  const v = document.createElement('img');
  v.src = URL.createObjectURL(saved);
  v.style.cssText = 'display:block;width:100vw;height:auto';
  document.body.append(v);
  await v.decode();
  await sleep(300);
  if (window.cdpShot) await window.cdpShot('skyphoto-export');
}
out.afterPhoto = performance.getEntriesByType('resource').slice(before).map((e) => new URL(e.name).pathname);
if (out.afterPhoto.some((p) => !/\/(data|js|vendor|css|fonts)\//.test(p))) out.fail.push('a request after the photo that is not one of our own files');
return out;
