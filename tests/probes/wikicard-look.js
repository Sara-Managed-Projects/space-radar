// tests/probes/wikicard-look.js -- the look run of forge #151: the card of Starlink-1007, of NGC 7000, of M13 and of the
// station, About it open, the Wikipedia block or our own words, and Read aloud. Run through render.sh with --shot-dir
// (desktop 1440 x 900, then --mobile 390 x 844); it returns what each card showed, and a picture of each.
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.__srLayersReady && window.spaceRadar) && Date.now() - t0 < 240000) await wait(300);
const ctx = window.spaceRadar;
const phone = innerWidth < 768;
const out = { tReady: Date.now() - t0, phone, cards: {} };
// A shot needs a frame (tests/probes/cards2-phone.js): a one-pixel mark keeps them coming.
const mark = document.createElement('div');
mark.style.cssText = 'position:fixed;right:0;bottom:0;width:1px;height:1px;z-index:99999;background:#000';
document.body.appendChild(mark);
let flip = 0; setInterval(() => { flip ^= 1; mark.style.background = flip ? '#010101' : '#000'; }, 100);
const shot = (name) => Promise.race([window.cdpShot(name), wait(25000)]);
const byName = (re) => ctx.records().find((r) => re.test(String(r.name || '')));
const up = async () => {
  const h = document.querySelector('.sr-sheet__handle');
  if (h) for (let i = 0; i < 2; i += 1) { h.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowUp', bubbles: true })); await wait(400); }
};
// The deep sky and the active satellites arrive after the first visit: switch them on and wait for the record.
for (const id of ['deep-sky', 'active']) { try { if (!ctx.isLayerOn(id)) ctx.setLayerOn(id, true); } catch { /* not a layer here */ } }
async function look(key, find) {
  let record = null;
  const f0 = Date.now();
  while (!(record = find()) && Date.now() - f0 < 60000) await wait(500);
  if (!record) { out.cards[key] = { found: false, layers: { deep: ctx.isLayerOn('deep-sky'), active: ctx.isLayerOn('active') } }; return; }
  if (record.layer && !ctx.isLayerOn(record.layer)) ctx.setLayerOn(record.layer, true);
  ctx.select(record, { fly: false });
  await wait(2500);
  if (phone) await up();
  const head = document.querySelector('#sr-disc-about');
  if (head && head.getAttribute('aria-expanded') !== 'true') head.click();
  const w0 = Date.now();
  while (Date.now() - w0 < 15000) {
    const box = document.querySelector('.sr-card__wiki');
    if (box && !box.querySelector('.sr-wiki__loading') && box.dataset.mounted) break;
    await wait(300);
  }
  const wiki = document.querySelector('.sr-wiki');
  const img = wiki && wiki.querySelector('img');
  const i0 = Date.now();
  while (img && !(img.complete && img.naturalWidth > 0) && Date.now() - i0 < 12000) await wait(300); // the picture
  const read = document.querySelector('.sr-wiki__read button');
  const target = document.querySelector('.sr-card__wiki') || document.querySelector('#sr-disc-about');
  if (target) target.scrollIntoView({ block: 'start' });
  await wait(600);
  out.cards[key] = {
    id: record.id, name: record.name, klass: record.klass,
    wiki: !!wiki,
    label: wiki ? wiki.querySelector('.sr-card__label').textContent : null,
    notes: wiki ? [...wiki.querySelectorAll('.sr-wiki__note')].map((n) => n.textContent) : [],
    words: wiki ? wiki.querySelector('.sr-wiki__text').textContent.slice(0, 140) : null,
    lang: wiki ? wiki.querySelector('.sr-wiki__text').lang : null,
    photo: img ? { loaded: img.complete && img.naturalWidth > 0, w: img.naturalWidth, credit: wiki.querySelector('figcaption').textContent } : null,
    credit: wiki ? wiki.querySelector('.sr-wiki__credit').textContent : null,
    why: (document.querySelector('.sr-card__why') || {}).textContent || null,
    readAloud: read ? { text: read.textContent, pressed: read.getAttribute('aria-pressed') } : null,
    wide: document.documentElement.scrollWidth > innerWidth + 1,
  };
  await shot(`${phone ? 'phone' : 'desktop'}-${key}`);
  // The name stays the card's first line: the shot above is scrolled down to About it, so a second one from the top.
  const name = document.querySelector('.sr-card__name');
  const box = document.querySelector('.sr-card__wiki');
  out.cards[key].nameHeading = name ? name.textContent : null;
  out.cards[key].nameBeforeBlock = !!(name && box && (name.compareDocumentPosition(box) & Node.DOCUMENT_POSITION_FOLLOWING));
  if (name) { name.scrollIntoView({ block: 'start' }); await wait(600); }
  await shot(`${phone ? 'phone' : 'desktop'}-${key}-top`);
}
// STARLINK-1007 (NORAD 44713) is no longer in CelesTrak's active list of 2026-11-07: its launch-mate STARLINK-1008 stands in.
await look('starlink-1007', () => byName(/^STARLINK-1007$/));
if (!out.cards['starlink-1007'].id) await look('starlink-1008', () => byName(/^STARLINK-1008$/));
await look('ngc-7000', () => ctx.recordById('dso-north-america-nebula'));
await look('m13', () => ctx.recordById('dso-m13'));
await look('iss', () => ctx.recordById('sat-25544'));
return out;
