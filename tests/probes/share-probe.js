// Probe for tools/cdp.mjs: the share sheet (spec 0061 task 8), and nothing fetched before it opens.
//
//   python3 tools/serve.py . 8406 &
//   node tools/cdp.mjs 'http://127.0.0.1:8406/site/#at=sat-25544' tests/probes/share-probe.js \
//     --width=1440 --height=900 --net=4g --block=celestrak.org,ll.thespacedevs.com --shot=share.png
//
// Boots the app, waits for the layers and a few quiet seconds, and lists every request made so
// far: none may be the sheet's module, its stylesheet, its Wikipedia table, the print composer,
// the object-page index or Wikipedia itself. Then it opens the sheet the way a visitor does (the
// rail's Share, or `?share=card` for the card's) and waits for the picture and, where the record
// names an article, the excerpt. It returns what the sheet shows and what was fetched after.
// With `#at=` absent it is the sheet with nothing selected. The --shot is taken after it returns.
//
// A ISS selection needs stations: with CelesTrak blocked, serve a saved copy at /data/v1 (see the
// snapshots note in docs) or pick a world (`#at=mars`).
if (!location.href.startsWith('http')) return { href: location.href };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const t0 = Date.now();
while (!(window.spaceRadar && window.spaceRadar.explore) && Date.now() - t0 < 150000) await wait(300);
await new Promise((r) => { if (window.__srLayersReady) r(); window.addEventListener('sr:layers-ready', r, { once: true }); setTimeout(r, 90000); });
// The flight to a `#at=` selection and the first textures settle before the picture is taken.
await wait(Number((/[?&]settle=(\d+)/.exec(location.search) || [0, 15000])[1]));
const ctx = window.spaceRadar;
const SHARE_ONLY = /sharesheet\.js|share\.css|wikititles\.js|printcompose\.js|object-pages\.json|wikipedia\.org/;
const names = () => performance.getEntriesByType('resource').map((e) => e.name);
const before = names().filter((n) => SHARE_ONLY.test(n));
const selected = ctx.selected() ? ctx.selected().id : null;

const fromCard = /[?&]share=card/.test(location.search);
const opener = fromCard ? document.querySelector('#sr-card [data-action="share"]') : document.querySelector('.sr-rail__btn--share');
if (!opener) return { error: 'no Share control', fromCard, selected, before };
opener.click();
const sheet = () => document.getElementById('sr-share');
const t1 = Date.now();
while (!(sheet() && !sheet().hidden) && Date.now() - t1 < 20000) await wait(100);
// The picture, then the excerpt if the record has an article (Wikipedia gives up after 4 s).
while (!(ctx.lastShare && ctx.lastShare.picture) && Date.now() - t1 < 240000) await wait(250);
const wants = ctx.selected() && document.querySelector('.sr-share__wiki');
while (wants && !(ctx.lastShare && ctx.lastShare.excerpt) && Date.now() - t1 < 8000) await wait(250);
await wait(600);
const s = sheet();
const r = s ? s.getBoundingClientRect() : null;
const small = [...(s ? s.querySelectorAll('button, a[href], input') : [])]
  .filter((n) => n.offsetParent !== null)
  .map((n) => { const b = n.getBoundingClientRect(); return { what: n.textContent.trim() || n.getAttribute('aria-label') || n.type, w: Math.round(b.width), h: Math.round(b.height) }; })
  .filter((b) => b.h < 44 && b.what !== 'checkbox');
return {
  selected,
  before,
  after: names().filter((n) => SHARE_ONLY.test(n)).map((n) => n.replace(/^.*\/\/[^/]+/, '')),
  open: !!s && !s.hidden,
  rect: r && { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) },
  focusInside: !!s && s.contains(document.activeElement),
  share: ctx.lastShare,
  img: s && s.querySelector('.sr-share__img') ? { hidden: s.querySelector('.sr-share__img').hidden, w: s.querySelector('.sr-share__img').naturalWidth, h: s.querySelector('.sr-share__img').naturalHeight } : null,
  nets: [...(s ? s.querySelectorAll('.sr-share__net') : [])].map((a) => a.href.slice(0, 60)),
  mail: s && s.querySelector('a[href^="mailto:"]') ? s.querySelector('a[href^="mailto:"]').href.length : 0,
  under44: small,
  scrollH: s ? s.scrollHeight : 0,
  wikiTiming: performance.getEntriesByType('resource').filter((e) => /wikipedia/.test(e.name)).map((e) => ({ start: Math.round(e.startTime), end: Math.round(e.responseEnd), opened: Math.round(t1 - performance.timeOrigin) })),
  ms: Date.now() - t1,
  // `?jpeg=1`: the postcard itself, base64, to look at.
  jpeg: /[?&]jpeg=1/.test(location.search) && s && s.querySelector('.sr-share__img').src
    ? await fetch(s.querySelector('.sr-share__img').src).then((x) => x.arrayBuffer()).then((b) => { const u = new Uint8Array(b); let t = ''; for (let i = 0; i < u.length; i += 0x8000) t += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(t); })
    : undefined,
};
