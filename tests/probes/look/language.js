// language: the page in Spanish (public #524, #525, spec 0077 W1-e). The workflow adds `&lang=es` for this probe, so the page
// wears js/copy/es.js. One walk, at 1440 x 900 and again with `-f mobile=true`: home, the other three tabs, a card of the Moon and
// one of Jupiter, What to show. After each picture a census of what the Spanish does to the layout: every element whose own text
// is cut off (its content is wider than its box and it hides the rest, or it ends in an ellipsis), or drawn outside the window.
// The job fails when the page did not take the language (`<html lang>`, the tab's name) or when a string is plainly missing
// (a `{slot}` printed raw, "undefined", "[object").
look.probe = 'language';
const out = { census: {}, texts: {} };
out.htmlLang = document.documentElement.lang;
out.htmlDir = document.documentElement.dir;
out.search = location.search;
const tab = (id) => document.getElementById('sr-tab-' + id);
out.tabNames = ['earth', 'planets', 'stars', 'tonight'].map((id) => (tab(id) ? tab(id).textContent : null));
if (out.htmlLang !== 'es' || out.tabNames[3] !== 'Esta noche') return finish({ ...out, fail: `the page did not take the language: <html lang="${out.htmlLang}">, tabs ${JSON.stringify(out.tabNames)}` });

/** Elements whose own text is cut, ends in an ellipsis, or is drawn outside the window. */
const census = (label) => {
  const bad = [];
  for (const e of document.querySelectorAll('body *')) {
    const own = [...e.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim()).map((n) => n.textContent.trim()).join(' ');
    if (!own) continue;
    const r = e.getBoundingClientRect();
    if (!r.width || !r.height) continue;
    const cs = getComputedStyle(e);
    if (cs.visibility === 'hidden' || cs.display === 'none' || Number(cs.opacity) === 0) continue;
    const wide = e.scrollWidth > e.clientWidth + 1;
    const cut = wide && /hidden|clip/.test(cs.overflowX);
    const ellipsis = wide && cs.textOverflow === 'ellipsis';
    const outside = r.right > innerWidth + 2 || r.left < -2;
    if (cut || ellipsis || outside) bad.push({ el: e.tagName.toLowerCase() + (e.className && typeof e.className === 'string' ? '.' + e.className.split(' ')[0] : ''), text: own.slice(0, 70), cut, ellipsis, outside, w: Math.round(r.width), scrollW: e.scrollWidth });
  }
  out.census[label] = bad.slice(0, 40);
  return bad.length;
};
/** A raw slot, "undefined" or "[object" in what is on screen is a hole in a template. */
const holes = () => {
  const text = document.body.innerText || '';
  return [...text.matchAll(/\{\w+\}|undefined|\[object|NaN/g)].map((m) => m[0]).slice(0, 10);
};
const here = (label) => { out.texts[label] = (document.body.innerText || '').replace(/\n{2,}/g, '\n').slice(0, 1800); census(label); const h = holes(); if (h.length) (out.holes = out.holes || {})[label] = h; };

await shot('1-home', 'home in Spanish: the tabs, the sentence, the footer', 1500);
here('home');
for (const id of ['planets', 'stars', 'tonight']) {
  if (tab(id)) tab(id).click();
  await sleep(2500);
  await shot(`2-tab-${id}`, `the ${id} tab`, 500);
  here(`tab-${id}`);
}
if (tab('earth')) tab('earth').click();
await sleep(800);
await go('moon', '3-card-moon', 6000, 'the Moon: its card in Spanish');
here('card-moon');
await go('jupiter', '4-card-jupiter', 6000, 'Jupiter: its card, its weather and drawing lines');
here('card-jupiter');
document.dispatchEvent(new KeyboardEvent('keydown', { key: 'l', bubbles: true }));
await sleep(1200);
if (!document.getElementById('sr-show') || document.getElementById('sr-show').hidden) sr.rail.openShow();
await sleep(1200);
await shot('5-what-to-show', 'What to show: layers, Quality and Look in Spanish', 800);
here('what-to-show');
const sheet = document.getElementById('sr-show');
if (sheet) { sheet.scrollTop = sheet.scrollHeight; await sleep(500); await shot('6-what-to-show-foot', 'the foot of What to show', 500); here('what-to-show-foot'); }
sr.rail.closeShow();
const worst = Object.entries(out.census).filter(([, list]) => list.length);
out.cutIn = worst.map(([k, list]) => `${k}: ${list.length}`);
// A cut line is a finding to read in the pictures, not by itself a failure: the summary lists them. A hole is a failure.
if (out.holes) out.fail = 'a raw {slot}, "undefined" or "[object" is on screen: ' + JSON.stringify(out.holes);
return finish(out);
