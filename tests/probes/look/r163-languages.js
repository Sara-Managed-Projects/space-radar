// r163-languages: the page in German, Russian, Chinese and Arabic (release 1.6.3, public #529 to #534), the panel and a card in each, and for Arabic
// where the chrome sits (dir=rtl: the sidebar on the right, the rail on the left, numbers and the clock left to right).
// ONE run per width walks all three: for each language a same-origin frame, as big as the window, loads this app with
// `?lang=<code>` (the page behind it stays English and is not photographed), and the probe reads and photographs the FRAME:
// home, the Planets, Stars and Tonight tabs, the Moon's card and Jupiter's, What to show with its foot. After each picture a
// census of what the language does to the layout: every element whose own text is cut off, ends in an ellipsis, or is drawn
// outside the window (a long German compound is the usual one). The job fails when a frame did not take its language
// (`<html lang>`, a tab's name) or when a raw `{slot}`, "undefined", "[object" or "NaN" is on screen. A cut line is a finding
// to read in the pictures, not by itself a failure.
look.probe = 'r163-languages';
const out = { languages: {} };
const LANGS = [{ code: 'de' }, { code: 'ru' }, { code: 'zh' }, { code: 'ar' }];
const cut = (doc, win) => {
  const bad = [];
  for (const e of doc.querySelectorAll('body *')) {
    const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = win.getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const wide = e.scrollWidth > e.clientWidth + 1;
    const clipped = wide && /hidden|clip/.test(cs.overflowX);
    const ellipsis = wide && cs.textOverflow === 'ellipsis';
    const outside = r.right > win.innerWidth + 2 || r.left < -2;
    if (clipped || ellipsis || outside) bad.push({ el: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''), text: own.slice(0, 70), clipped, ellipsis, outside, w: Math.round(r.width), scrollW: e.scrollWidth });
  }
  return bad.slice(0, 40);
};
for (const L of LANGS) {
  const rec = { census: {}, texts: {} };
  out.languages[L.code] = rec;
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;border:0;z-index:2147483647;background:#000';
  frame.src = `/?sw=0&look=1&lang=${L.code}`;
  document.body.appendChild(frame);
  const w = () => frame.contentWindow;
  const ok = await until(() => { try { return w() && w().__srLayersReady && w().spaceRadar; } catch { return false; } }, 600000, 500);
  if (!ok) { out.fail = `the ${L.code} frame never said its layers were ready`; break; }
  await sleep(6000);
  const d = w().document;
  const fsr = w().spaceRadar;
  rec.htmlLang = d.documentElement.lang;
  const tab = (id) => d.getElementById('sr-tab-' + id);
  rec.tabNames = ['earth', 'planets', 'stars', 'tonight'].map((id) => (tab(id) ? tab(id).textContent : null));
  if (!rec.htmlLang.startsWith(L.code) || rec.tabNames.every((n) => /^(Earth|Planets|Stars|Tonight)$/.test(n || ''))) { out.fail = `the ${L.code} frame did not take the language: <html lang="${rec.htmlLang}">, tabs ${JSON.stringify(rec.tabNames)}`; break; }
  const here = (label) => {
    rec.texts[label] = (d.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1800);
    rec.census[label] = cut(d, w());
    const holes = [...(d.body.innerText || '').matchAll(/\{\w+\}|undefined|\[object|NaN/g)].map((m) => m[0]).slice(0, 10);
    if (holes.length) (rec.holes = rec.holes || {})[label] = holes;
  };
  const pic = async (name, note, settle = 0) => { await shot(`${L.code}-${name}`, `${L.code}: ${note}`, settle); here(name); };
  await pic('1-home', 'home: the tabs, the sentence, the footer', 1500);
  if (tab('tonight')) tab('tonight').click();
  await sleep(2500);
  await pic('2-tab-tonight', 'the Tonight tab', 500);
  if (tab('earth')) tab('earth').click();
  await sleep(800);
  for (const [id, nm, note] of [['moon', '3-card-moon', 'the Moon: its card'], ['jupiter', '4-card-jupiter', 'Jupiter: its card, its weather and drawing lines']]) {
    const r = fsr.recordById(id);
    if (!r) { look.missing.push(id); continue; }
    fsr.select(r, { fly: true, undo: false });
    await sleep(6000);
    await pic(nm, note);
  }
  // where the chrome sits, from the DOM: the rule is that the sidebar and the rail swap sides in a right-to-left language
  const box = (q) => { const n = d.querySelector(q); if (!n) return null; const r = n.getBoundingClientRect(); return { left: Math.round(r.left), right: Math.round(r.right), top: Math.round(r.top), width: Math.round(r.width) }; };
  rec.dir = d.documentElement.dir || 'ltr';
  rec.chrome = { side: box('#sr-side'), rail: box('#sr-rail, .sr-rail'), time: box('#sr-time, .sr-time'), win: w().innerWidth };
  const timeEl = d.querySelector('#sr-time, .sr-time');
  rec.timeDirection = timeEl ? w().getComputedStyle(timeEl).direction : null;
  rec.rtlCss = [...d.querySelectorAll('link[rel=stylesheet]')].some((l) => /css\/rtl\.css/.test(l.href));
  rec.cutIn = Object.entries(rec.census).filter(([, list]) => list.length).map(([k, list]) => `${k}: ${list.length}`);
  frame.remove();
  await sleep(1500);
}
const ar = out.languages.ar;
if (!out.fail && ar && ar.chrome && ar.chrome.side && ar.chrome.rail && ar.win !== 0) {
  const phone = ar.chrome.win < 900;
  if (ar.dir !== 'rtl' || !ar.rtlCss) out.fail = 'Arabic did not turn the page round: dir=' + ar.dir + ', rtl.css linked: ' + ar.rtlCss;
  else if (!phone && !(ar.chrome.side.left > ar.chrome.win / 2 && ar.chrome.rail.right < ar.chrome.win / 2)) out.fail = 'the sidebar is not on the right and the rail on the left: ' + JSON.stringify(ar.chrome);
}
const holes = Object.entries(out.languages).filter(([, r]) => r.holes).map(([c, r]) => [c, r.holes]);
if (!out.fail && holes.length) out.fail = 'a raw {slot}, "undefined" or "[object" is on screen: ' + JSON.stringify(holes);
return finish(out);
