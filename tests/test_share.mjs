// tests/test_share.mjs -- the Share control and the postcard's words (spec 0033).
//
//   node tests/test_share.mjs
//
// Three claims. The LINK is the state: four forms from a fixed state, each read back through
// ui/urlstate.js to the same values, and no field outside the known keys -- the visitor's own
// place above all -- can ever reach it. The FALLBACK works: with no share sheet the clipboard gets
// the URL and a toast says so for two seconds, a dismissed sheet is not an error, and a refused
// clipboard puts the link itself in the toast. And the postcard's CAPTION is the card's own
// strings: the card is rendered into a small DOM stub and its lines are compared with
// postcardCaption() for the same record at the same instant, so the picture cannot drift from it.
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

const { shareUrl, shareState, shareLink, appBase, tripWords, toast } = await import(join(JS, 'ui/share.js'));
const { read } = await import(join(JS, 'ui/urlstate.js'));
const { showCard } = await import(join(JS, 'ui/cards.js'));
const { postcardCaption } = await import(join(JS, 'ui/postcard.js'));
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

// ----------------------------------------------------------------------- the fallback path
{
  location.hash = '#at=europa';
  const copied = [];
  setNavigator({ clipboard: { writeText: async (s) => { copied.push(s); } } });
  const ctx = {};
  const out = await shareLink(ctx, { title: 'Europa', text: 'Europa is a moon.' }, 'europa');
  check(out.via === 'clipboard' && copied[0] === `${BASE}#at=europa`, `no share sheet: the clipboard gets the URL (${out.via}, ${copied[0]})`);
  check(ctx.lastShare === out, 'what happened is left on ctx.lastShare for a browser check');
  const node = document.body.all().find((n) => n.className === 'sr-toast');
  check(node && node.textContent === COPY.share.copied && node.hidden === false, 'the toast says "Link copied"');
  check(node && node.getAttribute('role') === 'status', 'the toast is a status, so a screen reader hears it');
  await new Promise((r) => setTimeout(r, 1900));
  check(node.hidden === false, 'the toast is still up just under two seconds later');
  await new Promise((r) => setTimeout(r, 250));
  check(node.hidden === true, 'the toast is gone after two seconds');
  toast('one');
  toast('two');
  check(document.body.all().filter((n) => n.className === 'sr-toast').length === 1 && node.textContent === 'two', 'one toast at a time');
}
{
  const calls = [];
  setNavigator({ share: async (arg) => { calls.push(arg); }, clipboard: { writeText: async () => { calls.push('clipboard'); } } });
  const out = await shareLink(tripCtx('dwell', 2), { title: 'ignored', text: 'ignored' });
  check(calls.length === 1 && calls[0].url === `${BASE}#trip=${tour.id}&stop=3`, `the sheet gets the stop URL: ${JSON.stringify(calls[0])}`);
  check(calls[0].title === tour.title && calls[0].text === tour.blurb, 'during a trip the sheet gets the trip\'s title and blurb');
  check(out.via === 'share', 'shared through the sheet');
}
{
  const calls = [];
  const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
  setNavigator({ share: async () => { throw abort; }, clipboard: { writeText: async () => { calls.push('clipboard'); } } });
  const out = await shareLink({}, { title: 'Europa', text: '' }, 'europa');
  check(out.via === 'dismissed' && calls.length === 0, 'a dismissed sheet is an answer: nothing is copied behind the visitor\'s back');
}
{
  setNavigator({ clipboard: { writeText: async () => { throw new Error('not focused'); } } });
  const out = await shareLink({}, null, 'europa');
  const node = document.body.all().find((n) => n.className === 'sr-toast');
  check(out.via === 'none' && node.textContent === `${BASE}#at=europa`, 'a refused clipboard puts the link itself in the toast');
}

// ----------------------------------------------------- the caption is the card, string for string
{
  const { worldRecords } = await import(join(JS, 'scene/worlds.js'));
  const now = Date.UTC(2026, 8, 23, 14, 5);
  const ctx = { clock: { now: () => now, onChange: () => () => {} }, worlds: null, selected: () => null, sources: null };
  for (const id of ['europa', 'io', 'moon']) {
    const record = worldRecords().find((r) => r.id === id);
    if (!record) { problems.push(`no ${id} record to test the caption against`); continue; }
    showCard(record, ctx);
    const card = document.getElementById('sr-card');
    const text = (cls) => { const n = card && card.all().find((x) => x.className === cls); return n ? n.textContent : null; };
    const cap = postcardCaption(record, ctx, null);
    check(cap.name === `${text('sr-card__name')}${COPY.punctuation.separator}${text('sr-card__klass')}`, `${id}: the name line is the card's name and badge: "${cap.name}"`);
    check(cap.sentence === text('sr-card__sentence'), `${id}: the sentence is the card's first sentence: "${cap.sentence}"`);
    check(cap.honesty === text('sr-card__cls') && cap.honesty.length > 0, `${id}: the honesty line is the card's class-and-age line: "${cap.honesty}" vs "${text('sr-card__cls')}"`);
    check(cap.sources === text('sr-card__source'), `${id}: the sources line is the card's: "${cap.sources}"`);
    const key = card.all().find((x) => x.className === 'sr-rows__key');
    const val = card.all().find((x) => x.className === 'sr-rows__val');
    check(key && cap.where.startsWith(`${key.textContent}: ${val.textContent}`), `${id}: the place line starts with the card's first "right now" row: "${cap.where}"`);
    // en-GB prints September as "Sep" or "Sept" depending on the ICU; either is the instant.
    check(/23 Sept? 2026, 14:05 UTC$/.test(cap.where), `${id}: and ends with the instant: "${cap.where}"`);
    check(Object.keys(cap).join() === 'name,where,sentence,honesty,sources,mark' && cap.mark === COPY.share.mark, `${id}: five lines and the mark, in order`);
    // The card's action row: Fly to it, See it from here, Share. The postcard sits under it.
    const row = card.all().find((x) => x.className === 'sr-card__actions' && x.getAttribute('aria-label'));
    const labels = row ? row.children.map((b) => b.textContent) : [];
    check(labels.length === 3 && labels[2] === COPY.share.link, `${id}: the action row has three buttons, Share third: ${labels}`);
    const pic = card.all().find((x) => x.className === 'sr-card__picture');
    check(pic && pic.children[0] && pic.children[0].textContent === COPY.share.picture, `${id}: "Save a picture" sits under the actions`);
  }
  const place = postcardCaption(null, ctx, { tourTitle: 'A trip', stopTitle: 'A place' });
  check(place.name === 'A trip' && place.sentence === 'A place' && place.honesty === '' && place.sources === '', 'a stop with no record claims nothing it could be wrong about');
}

// ------------------------------------------------------------------------------------ bytes
const bytes = statSync(join(JS, 'ui/share.js')).size;
check(bytes < 6144, `ui/share.js loads with every card and stays under 6 kB: ${bytes} bytes`);
const src = readFileSync(join(JS, 'ui/share.js'), 'utf8');
check(!/import\s*\(\s*['"][^.]/.test(src) && !/from\s+['"][^.]/.test(src), 'ui/share.js imports nothing from outside site/js');
check(/import\(\s*'\.\/postcard\.js'\s*\)/.test(src) && !/from\s+'\.\/postcard\.js'/.test(src), 'the postcard is a dynamic import on first use, never a static one');

if (problems.length) {
  console.error(`share: ${problems.length} problem(s)`);
  for (const p of problems) console.error(`  - ${p}`);
  process.exit(1);
}
console.log(`share ok: four link forms, no observer field, the clipboard fallback and its toast, the caption is the card's own lines for 3 worlds; share.js ${bytes} bytes`);
