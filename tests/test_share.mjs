// tests/test_share.mjs -- the link rules and the one way in to sharing (spec 0033, 0061 task 8).
//
//   node tests/test_share.mjs
//
// Three claims. The LINK is the state: four forms from a fixed state, each read back through
// ui/urlstate.js to the same values, and no field outside the known keys -- the visitor's own
// place above all -- can ever reach it. The TOAST says one line at a time, for two seconds. And
// every Share is the ONE sheet: the card's Share, the trip bar's and the rail's all open it
// (ui/sharesheet.js, whose words tests/test_sharesheet.mjs holds), the card's Postcard saves the
// print picture, and nothing of the old two paths (the copied link, the 1080 x 1350 picture) is
// left.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync, statSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

// ------------------------------------------------------------------------------- a small DOM
// Enough of one for ui/cards.js to render a card and ui/share.js to put up a toast: elements
// with children, text, classes and attributes. Nothing here lays anything out.
class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this.children = [];
    this.parentNode = null;
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.hidden = false;
    this.className = '';
    this.id = '';
    this._text = '';
    const self = this;
    this.classList = {
      add: (...c) => { const s = new Set(self.className.split(/\s+/).filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { self.className = self.className.split(/\s+/).filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { const has = self.classList.contains(c); const want = on === undefined ? !has : !!on; if (want && !has) self.classList.add(c); if (!want && has) self.classList.remove(c); return want; },
      contains: (c) => self.className.split(/\s+/).includes(c),
    };
    this.listeners = {};
  }
  get isConnected() { let n = this; while (n.parentNode) n = n.parentNode; return n === document.body || n === document.documentElement; }
  get firstChild() { return this.children[0] || null; }
  get childElementCount() { return this.children.length; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this.children.push(c); return c; }
  removeChild(c) { this.children = this.children.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(v) { this.children = []; this._text = String(v ?? ''); }
  get textContent() { return this._text + this.children.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); }
  getAttribute(k) { return k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  click() { for (const fn of this.listeners.click || []) fn({ target: this }); }
  focus() { document.activeElement = this; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this.children.flatMap((c) => c.all())]; }
  querySelector(sel) { return sel.startsWith('#') ? this.all().find((n) => n.id === sel.slice(1)) || null : null; }
  querySelectorAll() { return []; }
}
globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  activeElement: null,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
  addEventListener() {},
  removeEventListener() {},
};
document.activeElement = document.body;
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
globalThis.history = { replaceState(_s, _t, url) { const i = url.indexOf('#'); location.hash = i >= 0 ? url.slice(i) : ''; } };
const setNavigator = (value) => Object.defineProperty(globalThis, 'navigator', { value, configurable: true, writable: true });

const shareMod = await import(join(JS, 'ui/share.js'));
const { shareUrl, shareState, appBase, tripWords, toast, shareButton } = shareMod;
const { read } = await import(join(JS, 'ui/urlstate.js'));
const { showCard } = await import(join(JS, 'ui/cards.js'));
const { COPY } = await import(join(JS, 'copy/en.js'));
const { TOURS } = await import(join(JS, 'data/tours.js'));

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const BASE = 'https://www.spaceradar.ai/';
// What the app would read back from a link: its fragment through urlstate's own reader.
const readBack = (url) => { location.hash = url.includes('#') ? url.slice(url.indexOf('#')) : ''; return read(); };

// ------------------------------------------------------------------------------ the four forms
check(shareUrl({ trip: 'moon-landings', stop: 1 }, BASE) === `${BASE}t/moon-landings.html`, 'a trip at stop 1 is its short page');
check(shareUrl({ trip: 'moon-landings' }, BASE) === `${BASE}t/moon-landings.html`, 'a trip on its intro (no stop) is its short page');
check(shareUrl({ trip: 'moon-landings', stop: 0, t: '2027-01-01T00:00:00Z' }, BASE) === `${BASE}t/moon-landings.html`, 'the short page carries nothing else');

const atStop = shareUrl({ trip: 'moon-landings', stop: 3, m: 'wonder' }, BASE);
check(atStop === `${BASE}#trip=moon-landings&stop=3`, `a trip at stop 3 is the hash form: ${atStop}`);
const back = readBack(atStop);
check(back.trip === 'moon-landings' && back.stop === '3', 'the stop link reads back through urlstate');

const at = shareUrl({ at: 'europa' }, BASE);
check(at === `${BASE}#at=europa`, `a selection is the hash with at: ${at}`);

const scrubbed = shareUrl({ at: 'europa', t: '2027-08-02T10:00:00Z', rate: '60' }, BASE);
const sb = readBack(scrubbed);
check(sb.at === 'europa' && sb.t === '2027-08-02T10:00:00Z' && sb.rate === '60', `a scrubbed selection carries at, t and rate: ${scrubbed}`);
check(/#at=europa&t=[^&]+&rate=60$/.test(scrubbed), `keys in the order the app writes them: ${scrubbed}`);
check(shareUrl({ at: 'europa', t: 'now', rate: '1' }, BASE) === `${BASE}#at=europa`, 't=now and rate=1 are the defaults and are left out');

// m: wonder is the default and is left out; now is kept.
check(!shareUrl({ at: 'iss', m: 'wonder' }, BASE).includes('m='), 'm=wonder is omitted');
check(shareUrl({ at: 'iss', m: 'now' }, BASE) === `${BASE}#m=now&at=iss`, 'm=now is kept');
check(shareUrl({ at: 'titan', stage: 'saturn' }, BASE) === `${BASE}#at=titan&stage=saturn`, 'the stage rides with a selection');
check(!shareUrl({ trip: 'outer-solar-system', stop: 4, stage: 'jupiter' }, BASE).includes('stage='), 'a trip picks its own stage, so a trip link carries none');
check(shareUrl({}, BASE) === BASE, 'nothing to say is the root');

// No observer field can appear, whatever the state holds.
const leaky = {
  at: 'iss', observer: { latDeg: 51.5, lonDeg: -0.1 }, lat: '51.5', lon: '-0.1', latDeg: 51.5, lonDeg: -0.1,
  place: 'London', obs: 'x', v: '1', unknownVersion: true, name: 'somewhere',
};
const leak = shareUrl(leaky, BASE);
check(leak === `${BASE}#at=iss`, `only known keys reach a link: ${leak}`);
check(!/51\.5|London|lat|lon|obs|place/i.test(leak), `no trace of the visitor's place: ${leak}`);
for (const k of Object.keys(readBack(leak))) check(['m', 'trip', 'stop', 'at', 't', 'rate', 'stage'].includes(k), `a shared link read back has only link keys, not ${k}`);

check(appBase({ origin: 'http://127.0.0.1:8416', pathname: '/site/index.html' }) === 'http://127.0.0.1:8416/site/', 'the base under a local prefix keeps the prefix');
check(shareUrl({ trip: 'moon-landings', stop: 1 }, 'http://127.0.0.1:8416/site/') === 'http://127.0.0.1:8416/site/t/moon-landings.html', 'the short page is relative to where the app lives');

// The shutter (public #460): a post's picture is drawn from the live scene, so the link beside it
// names the exposure the scene wears when that is not the default, and never the address bar's echo.
check(shareUrl({ at: 'dso-m42', exp: 'deep' }, 'https://x.test/') === 'https://x.test/#at=dso-m42&exp=deep', 'a Deep sky is in the link');
check(shareUrl({ at: 'dso-m42', exp: 'camera' }, 'https://x.test/') === 'https://x.test/#at=dso-m42' && shareUrl({ at: 'dso-m42', exp: 'x' }, 'https://x.test/') === 'https://x.test/#at=dso-m42', 'the default and an unknown mode are not');
check(shareState({ exposure: { mode: () => 'eye' } }, 'dso-m42').exp === 'eye' && shareUrl(shareState({ exposure: { mode: () => 'eye' } }, 'dso-m42'), 'https://x.test/').endsWith('&exp=eye'), 'shareState reads the live shutter');
check(!shareUrl(shareState({ exposure: { mode: () => 'camera' } }, 'mars'), 'https://x.test/').includes('exp='), 'and at Camera the link is as it was');
// ---------------------------------------------------------------------------- shareState()
const tour = TOURS[0];
const tripCtx = (phase, index) => ({
  trip: { state: { phase, tourId: tour.id, tourTitle: tour.title, index }, tours: () => TOURS },
});
location.hash = '#at=iss&t=2027-01-01T00%3A00%3A00Z';
check(shareState(tripCtx('dwell', 2)).stop === 3 && shareState(tripCtx('dwell', 2)).trip === tour.id, 'a trip at its third stop shares stop 3');
check(shareState(tripCtx('intro', -1)).stop === 0, 'a trip on its intro shares no stop (the short page)');
check(shareState(tripCtx('outro', 4)).stop === 0, 'a trip on its end card shares its short page');
check(shareState({ trip: { state: { phase: 'idle' } } }, 'europa').at === 'europa', 'with no trip the card\'s own record is `at`');
check(shareState({}, null).t === '2027-01-01T00:00:00Z', 'the hash keys ride along');
const tw = tripWords(tripCtx('dwell', 0));
check(tw && tw.title === tour.title && tw.text === tour.blurb, 'a trip shares its title and blurb');

// ------------------------------------------------------------------------------------ the toast
{
  const node = toast('Link copied');
  check(node && node.textContent === 'Link copied' && node.hidden === false, 'the toast says its line');
  check(node && node.getAttribute('role') === 'status', 'the toast is a status, so a screen reader hears it');
  await new Promise((r) => setTimeout(r, 1900));
  check(node.hidden === false, 'the toast is still up just under two seconds later');
  await new Promise((r) => setTimeout(r, 250));
  check(node.hidden === true, 'the toast is gone after two seconds');
  toast('one');
  toast('two');
  check(document.body.all().filter((n) => n.className.split(' ').includes('sr-toast')).length === 1 && node.textContent === 'two', 'one toast at a time');
}

// ------------------------------------------------------------------------- one way in, not three
check(!('shareLink' in shareMod) && !('savePicture' in shareMod) && !('pictureButton' in shareMod), 'the copied-link and save-a-picture paths are gone: one sheet');
{
  const ctx = {};
  const b = shareButton(ctx, 'sr-trip__btn sr-trip__btn--share');
  check(b.textContent === COPY.share.link && b.title === COPY.share.linkTitle && b.getAttribute('aria-haspopup') === 'dialog', 'the trip bar\'s Share opens a dialog: the sheet');
  const src = readFileSync(join(JS, 'ui/share.js'), 'utf8');
  check(/openShare\(ctx, \{ trip: true, opener: b \}\)/.test(src), 'and it shares the running trip where it is');
}
{
  const { worldRecords } = await import(join(JS, 'scene/worlds.js'));
  const now = Date.UTC(2026, 8, 23, 14, 5);
  const ctx = { clock: { now: () => now, onChange: () => () => {} }, worlds: null, selected: () => null, sources: null };
  for (const id of ['europa', 'moon']) {
    const record = worldRecords().find((r) => r.id === id);
    if (!record) { problems.push(`no ${id} record to show`); continue; }
    showCard(record, ctx);
    const card = document.getElementById('sr-card');
    // The card's action row (spec 0061 §4): Fly to it, See it, Postcard, Share -- one row of four.
    const row = card.all().find((x) => x.className === 'sr-card__actions' && x.getAttribute('aria-label'));
    const labels = row ? row.children.map((b) => b.textContent) : [];
    const A = COPY.card.actions;
    check(labels.join() === [A.flyTo, A.seeShort, A.postcard, A.share].join(), `${id}: the action row is Fly to it, See it, Postcard, Share: ${labels}`);
    check(row && row.children[2].title === COPY.print.title, `${id}: Postcard saves the print picture, by its title`);
    check(row && row.children[3].title === COPY.share.linkTitle && row.children[3].getAttribute('aria-haspopup') === 'dialog', `${id}: Share opens the sheet`);
  }
  const cards = readFileSync(join(JS, 'ui/cards.js'), 'utf8');
  check(/openShare\(ctx, \{ record, opener: share \}\)/.test(cards), 'the card\'s Share opens the sheet for its own record');
  check(/savePostcard\(ctx, record\)/.test(cards), 'the card\'s Postcard saves the print picture with its tag');
  const rail = readFileSync(join(JS, 'ui/rail.js'), 'utf8');
  check(/installShare\(ctx\)/.test(rail) && /share\.open\(\{ opener: shareBtn \}\)/.test(rail), 'the rail\'s Share opens the same sheet');
}

// ------------------------------------------------------------------------------------ bytes
const bytes = statSync(join(JS, 'ui/share.js')).size;
check(bytes < 6144, `ui/share.js loads with every card and stays under 6 kB: ${bytes} bytes`);
const src = readFileSync(join(JS, 'ui/share.js'), 'utf8');
check(!/import\s*\(\s*['"][^.]/.test(src) && !/from\s+['"][^.]/.test(src), 'ui/share.js imports nothing from outside site/js');
check(/import\('\.\/sharesheet\.js'\)/.test(src) && /import\('\.\/printcompose\.js'\)/.test(src) && !/from\s+'\.\/(sharesheet|printcompose|postcard)\.js'/.test(src), 'the sheet and the picture are dynamic imports on first use, never static ones');

if (problems.length) {
  console.error(`share: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`share ok: four link forms, no observer field, one toast at a time, every Share opens the one sheet and Postcard saves the print; share.js ${bytes} bytes`);
