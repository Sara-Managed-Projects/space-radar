// tests/test_cardmedia.mjs -- a card's "Pictures and news" (forge internal #556): ui/cardmedia.js and its data.
//
//   node tests/test_cardmedia.mjs
//
// Holds: the mirror is the registries' (scripts/gen_media.py --check is CI's own step); every item has a credit and a
// licence; no picture is anybody else's server's; a Journal post finds its object by tag and not a wrong one; the
// archives are links only; an object we hold nothing about says so and still offers the archives; the row is fetched
// only when it opens (not in the boot graph, not before the click); the event is one of the contract's; and the words
// are in all eleven languages.
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(ROOT, p), 'utf8');
const D = await import(join(ROOT, 'site/js/data/media.js'));
const M = await import(join(ROOT, 'site/js/ui/cardmedia.js'));
const { COPY } = await import(join(ROOT, 'site/js/copy/en.js'));
await import(join(ROOT, 'site/js/copy/en.later.js'));

// --- the data: credited, licensed, ours ---------------------------------------------------------------------------
const pictures = Object.values(D.PICTURES).flat();
assert.ok(pictures.length >= 30, `the nebulae's and the black holes' photographs (${pictures.length})`);
for (const p of pictures) {
  assert.ok(p.credit && p.licence, `a picture without credit or licence: ${JSON.stringify(p)}`);
  assert.match(p.licence, /^(CC BY 4\.0|Public domain)/, `${p.file}: a licence the section may show`);
  assert.ok(M.ownSrc(p.file) && existsSync(join(ROOT, 'site', p.file)), `${p.file} is a file of this site`);
  assert.match(p.page, /^https:\/\//, `${p.file}: its archive page`);
}
assert.ok(D.PICTURES['dso-m1'] && D.PICTURES['dso-m1'][0].licence === 'CC BY 4.0', 'the Crab has its ESA/Hubble photograph');
assert.ok(D.PICTURES['exotic-m87-star'] && D.PICTURES['exotic-sgr-a-star'], 'the two EHT images');
for (const r of Object.values(D.READS).flat()) {
  assert.ok(r.credit && r.licence && r.title && /^read\/[a-z0-9-]+\.html$/.test(r.page), `a long read: ${JSON.stringify(r)}`);
  if (r.hero) assert.ok(existsSync(join(ROOT, 'site', r.hero)), `${r.hero} is in site/`);
}
for (const p of Object.values(D.PAGES).flat()) assert.ok(p.credit && /^https:\/\//.test(p.url), `a page: ${JSON.stringify(p)}`);
assert.ok(D.JOURNAL.length > 0, 'the Journal snapshot');
for (const p of D.JOURNAL) {
  assert.ok(p.credit && p.licence && /^https:\/\/blog\.spaceradar\.ai\//.test(p.url), `a post: ${p.url}`);
  if (p.image) assert.ok(M.ownSrc(p.image), `${p.image}: the Journal's own picture`);
}
const dates = D.JOURNAL.map((p) => p.date);
assert.deepEqual(dates, [...dates].sort().reverse(), 'the Journal newest first');

// --- addresses -----------------------------------------------------------------------------------------------------
assert.ok(M.ownSrc('images/nebulae/m1.webp'));
assert.ok(M.ownSrc('https://blog.spaceradar.ai/media/x/share.jpg'));
for (const no of ['https://cdn.esahubble.org/archives/images/screen/heic0515a.jpg', 'https://images-assets.nasa.gov/x.jpg', '//evil.example/x.png', 'data:image/png;base64,x', '/etc/x', '']) assert.ok(!M.ownSrc(no), `not ours: ${no}`);

// --- names and the Journal's tags ---------------------------------------------------------------------------------
assert.equal(M.norm('ISS (ZARYA)'), 'iss');
assert.equal(M.norm('Júpiter'), 'jupiter');
assert.equal(M.norm('Sagittarius A*'), 'sagittarius a*');
const journal = [
  { title: 'Old Voyager', url: 'https://blog.spaceradar.ai/a/', date: '2026-10-01', tags: ['Voyager 1', 'heliosphere'] },
  { title: 'New Voyager', url: 'https://blog.spaceradar.ai/b/', date: '2026-11-01', tags: ['voyager 1'] },
  { title: 'Hubble', url: 'https://blog.spaceradar.ai/c/', date: '2026-11-02', tags: ['Hubble'] },
  { title: 'Moon', url: 'https://blog.spaceradar.ai/d/', date: '2026-11-03', tags: ['Moon', 'Solar System'] },
];
const v1 = M.postsFor(M.namesOf({ id: 'deep-voyager-1', name: 'Voyager 1' }, 'Voyager 1'), journal);
assert.deepEqual(v1.map((p) => p.title), ['New Voyager', 'Old Voyager'], 'by tag, any case, newest first');
assert.equal(M.postsFor(M.namesOf({ id: 'deep-voyager-2', name: 'Voyager 2' }, 'Voyager 2'), journal).length, 0, 'Voyager 2 is not Voyager 1');
const hst = M.postsFor(M.namesOf({ id: 'sat-20580', name: 'HST' }, 'Hubble Space Telescope'), journal);
assert.deepEqual(hst.map((p) => p.title), ['Hubble'], 'through the search\'s aliases (hubble = hst)');
assert.deepEqual(M.postsFor(M.namesOf({ id: 'moon', name: 'Moon' }, 'Moon'), journal).map((p) => p.title), ['Moon']);
assert.equal(M.postsFor(M.namesOf({ id: 'sat-99999', name: 'MOONLIGHT 1' }, 'MOONLIGHT 1'), journal).length, 0, 'a tag never matches inside another name');
assert.ok(!M.namesOf({ id: 'sat-25544', name: '25544' }, '').has('25544'), 'a bare number is no name');
// The real snapshot: Voyager 1 and the Moon have posts.
assert.ok(M.postsFor(M.namesOf({ id: 'deep-voyager-1', name: 'Voyager 1' }, 'Voyager 1')).length >= 1, 'the Journal has written about Voyager 1');

// --- the archives: links, nothing fetched ---------------------------------------------------------------------------
assert.deepEqual(M.archiveLinks('Crab Nebula', 'dso').map((a) => a.id), ['nasa', 'esahubble', 'esawebb']);
assert.deepEqual(M.archiveLinks('ISS', 'station').map((a) => a.id), ['nasa']);
assert.equal(M.archiveLinks('Crab Nebula', 'dso')[0].url, 'https://images.nasa.gov/search?q=Crab%20Nebula');
assert.deepEqual(M.archiveLinks('', 'dso'), []);

// --- what the section holds -----------------------------------------------------------------------------------------
const crab = M.mediaFor({ id: 'dso-m1', name: 'Crab Nebula' }, 'Crab Nebula', 'dso');
assert.ok(crab.pictures.length === 1 && !crab.empty && crab.archives.length === 3);
const none = M.mediaFor({ id: 'sat-12345', name: 'COSMOS 1234' }, 'Cosmos 1234', 'satellite');
assert.ok(none.empty && none.archives.length === 1, 'nothing held: empty, and still the archive');
const voy = M.mediaFor({ id: 'deep-voyager-1', name: 'Voyager 1' }, 'Voyager 1', 'probe');
assert.ok(voy.pages.length >= 1 && voy.posts.length >= 1, 'Voyager 1: NASA\'s page and the Journal');
const foreign = M.mediaFor({ id: 'x' }, 'X', 'dso', { PICTURES: { x: [{ file: 'https://cdn.example/x.jpg', credit: 'a', licence: 'CC BY 4.0' }] }, READS: {}, PAGES: {}, JOURNAL: [] });
assert.equal(foreign.pictures.length, 0, 'a picture on another server is never shown');

// --- the DOM, in a small fake document -------------------------------------------------------------------------------
class Node {
  constructor(tag) { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.className = ''; this._text = ''; this.classList = { add: (c) => { this.className += ` ${c}`; } }; }
  appendChild(c) { this.children.push(c); return c; }
  set textContent(v) { this._text = v; this.children = []; }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener() {}
  querySelector(sel) { const cls = sel.replace(/^\./, ''); const walk = (n) => { for (const c of n.children) { if (String(c.className).split(' ').includes(cls)) return c; const f = walk(c); if (f) return f; } return null; }; return walk(this); }
  all(pred, out = []) { for (const c of this.children) { if (pred(c)) out.push(c); c.all(pred, out); } return out; }
}
globalThis.document = { createElement: (t) => new Node(t), documentElement: { lang: 'en' }, head: new Node('head'), querySelectorAll: () => [] };
globalThis.srq = [];
globalThis.window = globalThis; // the platform bridge queues on window.srq (ui/platform-bridge.js)
const box = new Node('div');
M.mountMedia(box, { id: 'dso-m1', name: 'Crab Nebula' }, { name: 'Crab Nebula', klass: 'dso' });
const imgs = box.all((n) => n.tagName === 'img');
assert.ok(imgs.length >= 1 && imgs.every((i) => M.ownSrc(i.src) && i.loading === 'lazy' && typeof i.alt === 'string' && i.alt), 'the photograph: ours, lazy, with alt text');
const links = box.all((n) => n.tagName === 'a');
assert.ok(links.every((a) => a.target === '_blank' && a.rel === 'noopener'), 'every link opens in a new tab, no opener');
assert.ok(box.textContent.includes('CC BY 4.0'), 'the credit and licence are printed, not hidden');
assert.ok(box.all((n) => String(n.className).includes('ui-btn--quiet')).length === 3, 'the archives are the set\'s quiet buttons');
assert.deepEqual(globalThis.srq, [['track', 'tab_open', { tab: 'media' }]], 'one contract event, no personal data');
M.mountMedia(box, { id: 'dso-m1' }, { name: 'Crab Nebula', klass: 'dso' });
const again = new Node('div');
M.mountMedia(again, { id: 'dso-m1', name: 'Crab Nebula' }, { name: 'Crab Nebula', klass: 'dso' });
assert.equal(globalThis.srq.length, 1, 'once a record a visit, however often the card is drawn again');
const empty = new Node('div');
M.mountMedia(empty, { id: 'sat-12345', name: 'COSMOS 1234' }, { name: 'Cosmos 1234', klass: 'satellite' });
assert.ok(empty.textContent.includes(COPY.media.empty.replace('{name}', 'Cosmos 1234').slice(0, 40)), 'the empty line names the object');

// --- fetched only when it opens --------------------------------------------------------------------------------------
const cards = read('site/js/ui/cards.js');
assert.ok(!/from '\.\/cardmedia\.js'/.test(cards) && /import\('\.\/cardmedia\.js'\)/.test(cards), 'ui/cards.js imports ui/cardmedia.js only with import()');
assert.ok(/disclosure\('media', COPY\.mediaRow\.row/.test(cards), 'the row is a disclosure of the card');
const diet = read('tests/test_boot_diet.mjs');
for (const f of ['js/ui/cardmedia.js', 'js/data/media.js', 'js/copy/en.media.js']) assert.ok(diet.includes(`'${f}'`), `the boot diet keeps ${f} out of the first visit`);
assert.ok(!/en\.media\.js/.test(cards), 'the card carries only the row\'s name (copy/en.later.js mediaRow), not the section\'s words');
const css = read('site/css/cardmedia.css');
assert.ok(!/#[0-9a-f]{3,8}\b|rgba?\(/i.test(css.replace(/\/\*[\s\S]*?\*\//g, '')), 'css/cardmedia.css uses tokens only');

// --- the words, in every language ------------------------------------------------------------------------------------
const slots = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort().join(',');
for (const code of ['es', 'fr', 'de', 'pt', 'ru', 'uk', 'zh', 'hi', 'he', 'ar']) {
  const L = await import(join(ROOT, `site/js/copy/${code}.js`));
  for (const sect of ['media', 'mediaRow']) {
    const tr = L.COPY[sect];
    assert.ok(tr, `${code}: COPY.${sect}`);
    for (const [k, v] of Object.entries(COPY[sect])) {
      assert.ok(typeof tr[k] === 'string' && tr[k].trim(), `${code}: ${sect}.${k}`);
      assert.equal(slots(tr[k]), slots(v), `${code}: ${sect}.${k} keeps its slots`);
    }
  }
}

console.log(`cardmedia: ok (${pictures.length} pictures, ${Object.values(D.READS).flat().length} long reads, ${Object.values(D.PAGES).flat().length} pages, ${D.JOURNAL.length} posts)`);
