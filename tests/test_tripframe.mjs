// tests/test_tripframe.mjs -- the trip in the new language (spec 0061 task 7, ui/tripframe.js).
//
//   node tests/test_tripframe.mjs
//
// Ivan, 2026-10-01: the trips were the one place the old design survived -- two letterbox bars, a
// row of seven text buttons, a prose card floating mid-scene. What this holds, without a browser:
//   - THE TOOLBAR: one glass group, first in the frame's DOM (the APG puts Pause first), icon
//     buttons in the order play, previous, the counter, next, replay, share, hide card, sound; each
//     with a name from copy/en.js, a tooltip that names its key, and a Lucide icon hidden from a
//     screen reader; previous off on the first stop; each button drives the machine.
//   - THE PROGRESS inside it: "2 / 5" for the eye, "stop 2 of 5" for a reader, one segment a stop.
//   - PAUSED: the play button is the one ember thing and says Resume; the counter stays.
//   - THE KEYBOARD: ←/→ step, Space plays and pauses (not on a focused button), C hides the card,
//     R replays, Escape leaves (not out of a text field), nothing with a modifier, and on the intro
//     and the end card only Escape.
//   - THE INTRO: microlabel, the trip's name, its shape in mono, one ember Start, sound as a toggle,
//     "Not now" quiet, the stops as rows that start there. THE END: Explore (the one ember), Watch
//     again, Share, and one next trip as a trip card once its plan says it can run.
//   - THE TOP BAR: the trip's title and Leave, nothing else; hidden on the intro and the end.
//   - The CSS: 44 px targets on a phone, the reduced-motion fade, no letterbox left.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readFileSync } from 'node:fs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const JS = join(ROOT, 'site/js');

const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };

// ------------------------------------------------------------------------------- a small DOM
class Node {
  constructor(tag) {
    this.tagName = String(tag).toUpperCase();
    this._kids = [];
    this.parentNode = null;
    this.attrs = {};
    this.dataset = {};
    this.style = { setProperty() {}, removeProperty() {} };
    this.hidden = false;
    this.disabled = false;
    this.inert = false;
    this.className = '';
    this.id = '';
    this.type = '';
    this.title = '';
    this._text = '';
    this.offsetWidth = 1;
    this.isContentEditable = false;
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
  get firstChild() { return this._kids[0] || null; }
  get childElementCount() { return this._kids.length; }
  get children() { return this._kids; }
  appendChild(c) { if (c.parentNode) c.parentNode.removeChild(c); c.parentNode = this; this._kids.push(c); return c; }
  insertBefore(c, ref) {
    if (c.parentNode) c.parentNode.removeChild(c);
    c.parentNode = this;
    const i = this._kids.indexOf(ref);
    if (i < 0) this._kids.push(c); else this._kids.splice(i, 0, c);
    return c;
  }
  removeChild(c) { this._kids = this._kids.filter((x) => x !== c); c.parentNode = null; return c; }
  remove() { if (this.parentNode) this.parentNode.removeChild(this); }
  set textContent(v) { this._kids = []; this._text = String(v ?? ''); }
  get textContent() { return this._text + this._kids.map((c) => c.textContent).join(''); }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'id') this.id = String(v); if (k === 'class') this.className = String(v); }
  getAttribute(k) { return k === 'class' ? this.className : k in this.attrs ? this.attrs[k] : null; }
  removeAttribute(k) { delete this.attrs[k]; }
  addEventListener(type, fn) { (this.listeners[type] ||= []).push(fn); }
  removeEventListener() {}
  click() { if (this.disabled) return; for (const fn of this.listeners.click || []) fn({ target: this }); }
  focus() { document.activeElement = this; }
  closest() { return null; }
  contains(n) { for (let x = n; x; x = x.parentNode) if (x === this) return true; return false; }
  all() { return [this, ...this._kids.flatMap((c) => c.all())]; }
  matches(sel) {
    if (sel.startsWith('#')) return this.id === sel.slice(1);
    if (sel.startsWith('.')) return sel.slice(1).split('.').every((c) => this.classList.contains(c));
    return this.tagName === sel.toUpperCase();
  }
  querySelector(sel) { return this.all().slice(1).find((n) => n.matches(sel)) || null; }
  querySelectorAll(sel) { return this.all().slice(1).filter((n) => n.matches(sel)); }
}

globalThis.document = {
  body: new Node('body'),
  documentElement: new Node('html'),
  title: 'Space Radar',
  activeElement: null,
  createElement: (tag) => new Node(tag),
  createElementNS: (_ns, tag) => new Node(tag),
  getElementById: (id) => document.body.all().find((n) => n.id === id) || null,
  querySelector: (sel) => document.body.querySelector(sel),
  addEventListener(type, fn) { (docListeners[type] ||= []).push(fn); },
  removeEventListener() {},
};
const docListeners = {};
document.activeElement = document.body;
globalThis.window = globalThis;
globalThis.location = { origin: 'https://www.spaceradar.ai', pathname: '/', hash: '', search: '' };
globalThis.history = { replaceState() {} };
globalThis.addEventListener = () => {};
globalThis.removeEventListener = () => {};
globalThis.requestAnimationFrame = () => 1;
globalThis.cancelAnimationFrame = () => {};
Object.defineProperty(globalThis, 'navigator', { value: { clipboard: { writeText: async () => {} } }, configurable: true });

const { createTripFrame, keyAction, progressText, shapeLine } = await import(join(JS, 'ui/tripframe.js'));
const { COPY, t } = await import(join(JS, 'copy/en.js'));
const T = COPY.trip;

// ------------------------------------------------------------------------------ pure parts
{
  const run = { phase: 'dwell', index: 1, count: 4 };
  const body = { tagName: 'BODY' };
  const key = (k, extra = {}) => ({ key: k, ...extra });
  check(keyAction(key('ArrowRight'), run, body) === 'next', '→ is the next stop');
  check(keyAction(key('ArrowLeft'), run, body) === 'back', '← is the stop before');
  check(keyAction(key(' '), run, body) === 'toggle', 'Space plays and pauses');
  check(keyAction(key(' '), run, { tagName: 'BUTTON' }) === null, 'Space on a focused button presses the button, not the trip');
  check(keyAction(key('c'), run, body) === 'collapse' && keyAction(key('C'), run, body) === 'collapse', 'C hides the card');
  check(keyAction(key('r'), run, body) === 'replay', 'R replays the stop');
  // Internal #329: Voice and Sound have a key, named in their tooltips, and a narrow phone keeps Voice.
  check(keyAction(key('m'), run, body) === 'sound' && keyAction(key('M'), run, body) === 'sound', 'M is Sound');
  check(keyAction(key('v'), run, body) === 'voice' && keyAction(key('V'), run, body) === 'voice', 'V is Voice');
  check(keyAction(key('v'), run, { tagName: 'INPUT' }) === null && keyAction({ key: 'v', ctrlKey: true }, run, body) === null, 'not while typing, and Ctrl+V is the browser\'s');
  {
    const T2 = COPY.trip;
    check(/\(M\)/.test(T2.soundOnTitle) && /\(M\)/.test(T2.soundOffTitle) && /\(V\)/.test(T2.voiceOnTitle) && /\(V\)/.test(T2.voiceOffTitle), 'the tooltips name the keys');
    const { readFileSync: rf } = await import('node:fs');
    const css = rf(join(JS, '../css/ui.css'), 'utf8');
    const hiddenAt = (cls, when = '') => { const m = new RegExp(`@media \\(max-width: (\\d+)px\\) \\{\\s*html\\.sr-phone${when} \\.sr-trip__tb--${cls} \\{\\s*display: none;`).exec(css); return m ? Number(m[1]) : -1; };
    check(hiddenAt('voice') < 360 && hiddenAt('voice') >= 320, `Voice stays on the toolbar on a 360 px phone (hidden at ${hiddenAt('voice')} and under)`);
    const present = hiddenAt('present', ':not\\(\\.sr-present\\)');
    check(hiddenAt('replay') > hiddenAt('share') && hiddenAt('share') > present && present > hiddenAt('voice'), 'Replay goes first, then Share, then Present, Voice last');
    // What is left must fit: n targets of 44, the 48 px counter and 16 px of padding. NINE targets
    // since Present joined the bar (public #441): the steps were still cut for eight, and on a
    // 390 px phone the ninth hung off the right edge (the walk of 2026-10-06).
    const fits = (n, w) => n * 44 + 48 + 16 <= w;
    check(!fits(9, hiddenAt('replay')) && fits(9, hiddenAt('replay') + 1), `all nine targets show only where they fit (Replay goes at ${hiddenAt('replay')})`);
    check(fits(8, hiddenAt('share') + 1) && fits(7, present + 1) && fits(6, hiddenAt('voice') + 1) && fits(5, 320), 'what is left fits at the top of each step, down to 320 px');
    check(fits(7, 390) && hiddenAt('share') >= 390 && present < 390 && fits(6, 360) && present >= 360, 'a 390 px phone shows seven with Present among them, and a 360 px one six');
    // Present mode: no Replay, Share or Hide card; Auto and Full screen instead. Eight targets.
    const full = hiddenAt('full', '\\.sr-present'); const auto = hiddenAt('auto', '\\.sr-present');
    check(fits(8, full + 1) && fits(7, auto + 1) && full > auto && fits(6, hiddenAt('voice') + 1), `present mode fits too: Full screen goes at ${full}, Auto at ${auto}`);
    check(!/html\.sr-phone \.sr-trip__tb--present \{\s*display: none/.test(css), 'Present is never hidden in present mode: it is the way out');
    // The end card's four actions (Keep flying, Go home, Watch again, Share) are two rows of two:
    // in one row "Keep flying" and "Watch again" were cut to "Keep fly..." and "Watch a...".
    check(/\.sr-tripsheet__actions\.is-four \{[^}]*grid-template-columns: repeat\(2, minmax\(0, 1fr\)\);[^}]*grid-auto-flow: row;/.test(css), 'four end actions are two rows of two');
    check(/row\.classList\.toggle\('is-four', !!st\.stageChanged\)/.test(rf(join(JS, 'ui/tripframe.js'), 'utf8')), 'and the end card says when it has four');
  }
  check(keyAction(key('Escape'), run, body) === 'leave', 'Escape leaves');
  check(keyAction(key('Escape'), run, { tagName: 'INPUT' }) === null, 'Escape in a text field is the field\'s');
  check(keyAction(key('ArrowRight'), run, { tagName: 'INPUT' }) === null, 'arrows in a text field are the field\'s');
  check(keyAction(key('ArrowRight', { metaKey: true }), run, body) === null && keyAction(key('r', { ctrlKey: true }), run, body) === null, 'nothing with a modifier: those are the browser\'s');
  check(keyAction(key('ArrowRight'), { ...run, phase: 'paused' }, body) === 'next', 'the arrows step while paused too');
  for (const phase of ['intro', 'outro']) {
    check(keyAction(key('ArrowRight'), { ...run, phase }, body) === null && keyAction(key(' '), { ...run, phase }, body) === null, `on the ${phase} nothing is running, so the arrows and Space are not the trip's`);
    check(keyAction(key('Escape'), { ...run, phase }, body) === 'leave', `and Escape still leaves from the ${phase}`);
  }
  check(keyAction(key('ArrowRight'), { phase: 'idle' }, body) === null && keyAction(key('Escape'), { phase: 'idle' }, body) === null, 'with no trip, no key is the trip\'s');

  check(progressText({ index: 1, count: 4 }) === '2 / 4', `the counter reads "2 / 4": "${progressText({ index: 1, count: 4 })}"`);
  check(progressText({ index: -1, count: 4 }) === '', 'no counter before the first stop');
  check(shapeLine(4, 62028) === '4 stops · 2 min', `the intro's mono shape: "${shapeLine(4, 62028)}"`);
  check(shapeLine(4, 60000) === '4 stops · 1 min' && shapeLine(10, 181000) === '10 stops · 4 min', 'minutes rounded UP: the line never promises less time than the trip takes');
}

// ---------------------------------------------------------------------- the frame, a stub trip
const calls = [];
const listeners = [];
let state = {
  phase: 'idle', index: -1, count: 0, tourId: 'fx-a', tourTitle: 'Where people are living in space right now',
  stopTitle: '', pacing: 'auto', estimateMs: 0, dropped: [], clockMoves: false, clockClamped: false,
  clockOwned: false, held: null, chapter: null, stageChanged: false, stops: [],
};
const notify = (patch) => { state = { ...state, ...patch }; for (const fn of listeners) fn(state); };
const TOURS = [
  { id: 'fx-a', title: 'Where people are living in space right now', blurb: 'The only two places above you tonight with people inside them.', group: 'earth-orbit', next: 'fx-b', stops: [] },
  { id: 'fx-b', title: 'The strangest things we have ever sent', blurb: 'A photograph, a car.', group: 'solar-system', stops: [] },
];
const trip = {
  get state() { return state; },
  onChange(fn) { listeners.push(fn); return () => { const i = listeners.indexOf(fn); if (i >= 0) listeners.splice(i, 1); }; },
  pause(reason) { calls.push(`pause:${reason}`); notify({ phase: 'paused', pausedBy: reason }); },
  resume() { calls.push('resume'); notify({ phase: 'dwell', pausedBy: null }); },
  next() { calls.push('next'); },
  back() { calls.push('back'); },
  replay() { calls.push('replay'); },
  play() { calls.push('play'); },
  jumpTo(i) { calls.push(`jumpTo:${i}`); },
  stop(why, opts) { calls.push(`stop:${why}${opts && opts.stay ? ':stay' : ''}`); notify({ phase: 'idle' }); },
  setPacing(mode) { calls.push(`pacing:${mode}`); },
  start(id) { calls.push(`start:${id}`); },
  plan: async (id) => ({ id, count: 6, estimateMs: 125000, offerable: true }),
  tours: () => TOURS,
  dwellFraction: () => 0.4,
  currentRecordId: () => null,
};
let soundIsOn = false;
const audioListeners = [];
const ctx = {
  trip,
  cameraRig: null,
  clock: { mode: 'live', rate: 1, paused: false, now: () => Date.now(), onChange: () => () => {} },
  audio: {
    isOn: () => soundIsOn,
    toggle() { soundIsOn = !soundIsOn; for (const fn of audioListeners) fn(); },
    enable() { if (!soundIsOn) { soundIsOn = true; for (const fn of audioListeners) fn(); } },
    onChange(fn) { audioListeners.push(fn); return () => {}; },
  },
  mobile: null,
  veil: null,
  stage: { worldId: 'earth' },
};
const frame = createTripFrame(ctx);
const q = (sel) => document.body.querySelector(sel);
const qa = (sel) => document.body.querySelectorAll(sel);
const primaries = () => qa('.sr-act--primary').filter((n) => !n.hidden).length
  + qa('.sr-tripsheet__start').length + qa('.sr-trip__tb--play').filter((n) => n.classList.contains('is-paused')).length;

// --- the intro
notify({
  phase: 'intro', count: 4, estimateMs: 62028,
  stops: [{ id: 'far', title: 'Two places, and only two' }, { id: 'iss', title: 'The International Space Station' }, { id: 'tiangong', title: 'Tiangong' }, { id: 'both', title: 'Two specks, one planet' }],
});
{
  const host = q('#sr-trip');
  check(!!host, 'the frame is built when a trip starts');
  const toolbar = q('.sr-trip__toolbar');
  check(host && host.children[0] === toolbar, 'the toolbar is first in the frame\'s DOM, so its play button is first in the tab order (APG)');
  check(toolbar.hidden === true && q('.sr-trip__top').hidden === true, 'the toolbar and the top bar are not up on the intro: it carries its own way out');
  const panel = q('.sr-tripsheet__panel');
  check(panel && panel.hidden === false, 'the intro is the sheet\'s panel');
  check(q('.sr-tripsheet__micro').textContent === T.introMicro, 'the intro has its microlabel');
  check(q('.sr-tripsheet__name').textContent === state.tourTitle, 'and the trip\'s name as the sheet\'s heading');
  check(q('.sr-tripsheet__meta').textContent === '4 stops · 2 min', `and its shape in mono: "${q('.sr-tripsheet__meta').textContent}"`);
  check(q('.sr-tripsheet__text').textContent === TOURS[0].blurb, 'and one line of what it is, the trip\'s own blurb');
  const start = q('.sr-tripsheet__start');
  check(start && /Start/.test(start.textContent) && start.querySelector('svg'), 'one ember Start with the play icon');
  check(primaries() === 1, `exactly one ember button on the intro (${primaries()})`);
  check(document.activeElement === start, 'focus lands on Start');
  const sound = q('.sr-tripsheet__sound');
  check(sound && sound.getAttribute('aria-label') === T.soundOn && sound.getAttribute('aria-pressed') === 'false', 'sound is a toggle with a name, off until pressed');
  sound.click();
  check(sound.getAttribute('aria-pressed') === 'true' && soundIsOn, 'pressed, sound is on and the toggle says so');
  check(q('.sr-trip__tb--sound').getAttribute('aria-pressed') === 'true', 'and the toolbar\'s sound button agrees');
  // Spec 0069: the voice, beside sound and inside it (internal #309: music only is a way to watch).
  const voices = qa('.sr-trip__voicetoggle');
  const pressed = () => voices.map((b) => b.getAttribute('aria-pressed')).join();
  check(voices.length === 2 && voices.every((b) => b.getAttribute('aria-label') === T.voice), 'Voice is a toggle on the intro and in the toolbar');
  check(voices.every((b) => /synthetic/.test(b.title)), `its tooltip says the voice is synthetic: "${voices[0].title}"`);
  check(pressed() === 'true,true', 'with sound on the voice is on until it is turned off');
  voices[0].click();
  check(pressed() === 'false,false' && soundIsOn && voices[0].title === T.voiceOffTitle, 'Voice off leaves the music on: both toggles say so');
  voices[0].click();
  check(pressed() === 'true,true' && voices[0].title === T.voiceOnTitle, 'and back on');
  sound.click();
  check(pressed() === 'false,false' && !soundIsOn, 'sound off: nothing will be read, and the Voice toggle says so');
  voices[0].click();
  check(soundIsOn && pressed() === 'true,true' && sound.getAttribute('aria-pressed') === 'true', 'Voice pressed with sound off turns both on');
  const quiet = q('.sr-tripsheet__quiet');
  check(quiet && quiet.textContent === T.introSkip, '"Not now" is a quiet text button');
  const rows = qa('.sr-tripsheet__stop');
  check(rows.length === 4 && rows[1].textContent.includes('The International Space Station'), 'the stops are listed under Start');
  rows[2].click();
  check(calls.join() === 'jumpTo:2,play', `a stop row starts the trip there: ${calls.join()}`);
  calls.length = 0;
  start.click();
  check(calls.join() === 'play', 'Start plays');
  calls.length = 0;
}

// --- a stop
notify({ phase: 'dwell', index: 0, count: 4, stopTitle: 'Two places, and only two', chapter: 'Chapter one: the stations' });
{
  const toolbar = q('.sr-trip__toolbar');
  check(toolbar.hidden === false, 'the toolbar is up while a stop is');
  check(toolbar.getAttribute('role') === 'group' && toolbar.getAttribute('aria-label') === T.controlsLabel, 'it is a named group of controls');
  const order = toolbar.children.map((n) => (n.classList.contains('sr-trip__progress') ? 'progress' : n.classList.contains('sr-trip__sep') ? 'sep' : n.getAttribute('aria-label')));
  const want = [T.pause, T.back, 'progress', T.next, 'sep', T.replay, T.share, T.collapse, T.soundOn, T.voice, T.presentAuto, T.fullScreen, T.present];
  check(order.join('|') === want.join('|'), `the toolbar's order: ${order.join(', ')}`);
  const buttons = qa('.sr-trip__tb');
  check(buttons.length === 11, `eleven icon buttons: the eight, then present mode's three (public #441) (${buttons.length})`);
  for (const b of buttons) {
    const svg = b.querySelector('svg');
    check(b.tagName === 'BUTTON' && b.type === 'button', `${b.getAttribute('aria-label')} is a real button`);
    check(!!b.getAttribute('aria-label') && b.textContent === '', `${b.getAttribute('aria-label')} is icon-only, named by aria-label`);
    check(svg && svg.getAttribute('aria-hidden') === 'true' && svg.getAttribute('viewBox') === '0 0 24 24' && svg.getAttribute('stroke-width') === '1.75', `${b.getAttribute('aria-label')} draws a Lucide icon, hidden from a screen reader`);
    check(!!b.title, `${b.getAttribute('aria-label')} has a tooltip`);
    check(b.getAttribute('aria-label').split(/\s+/).length <= 2, `"${b.getAttribute('aria-label')}" is two words at most`);
  }
  const byLabel = (l) => buttons.find((b) => b.getAttribute('aria-label') === l);
  check(/\(Space\)/.test(byLabel(T.pause).title), 'Pause\'s tooltip names Space');
  check(/\(←\)/.test(byLabel(T.back).title) && /\(→\)/.test(byLabel(T.next).title), 'previous and next name their arrows');
  check(/\(R\)/.test(byLabel(T.replay).title) && /\(C\)/.test(byLabel(T.collapse).title), 'Replay names R, Hide card names C');
  check(/\(Escape\)/.test(q('.sr-trip__leave').title), 'Leave names Escape');
  check(byLabel(T.back).disabled === true, 'previous is off on the first stop');

  // the progress
  check(q('.sr-trip__count').textContent === '1 / 4', `the counter: "${q('.sr-trip__count').textContent}"`);
  check(q('.sr-trip__count').getAttribute('aria-hidden') === 'true' && q('.sr-trip__progress').children.some((n) => n.classList.contains('sr-trip__live') && n.textContent === 'stop 1 of 4'), 'a reader hears "stop 1 of 4", not "1 slash 4"');
  const segs = qa('.sr-trip__seg');
  check(segs.length === 4 && segs[0].classList.contains('is-here') && !segs[1].classList.contains('is-done'), 'one segment a stop, the first one here');

  // the top bar
  const top = q('.sr-trip__top');
  check(top.hidden === false && q('.sr-trip__title').textContent === state.tourTitle, 'the top bar shows the trip\'s title');
  check(q('.sr-trip__chapter').textContent === 'Chapter one: the stations', 'with its chapter above it');
  check(top.querySelectorAll('button').length === 1 && q('.sr-trip__leave').textContent === T.leave, 'and one button, Leave');
  check(primaries() === 0, `no ember on screen while a stop plays (${primaries()})`);
}

// --- the buttons drive the machine
notify({ phase: 'dwell', index: 1, count: 4, stopTitle: 'The International Space Station' });
{
  const buttons = qa('.sr-trip__tb');
  const byLabel = (l) => buttons.find((b) => b.getAttribute('aria-label') === l);
  check(byLabel(T.back).disabled === false, 'previous is on from the second stop');
  check(q('.sr-trip__count').textContent === '2 / 4' && qa('.sr-trip__seg')[0].classList.contains('is-done'), 'the counter and the segments follow');
  byLabel(T.next).click();
  byLabel(T.back).click();
  byLabel(T.replay).click();
  check(calls.join() === 'next,back,replay', `next, previous and replay drive the trip: ${calls.join()}`);
  calls.length = 0;
  // Share: spec 0061 task 8's sheet where it exists, with the trip and the stop's subject.
  ctx.share = { open: (o) => calls.push(`share:${o.trip}:${o.record && o.record.id}`) };
  ctx.recordById = (id) => ({ id });
  trip.currentRecordId = () => 'sat-25544';
  byLabel(T.share).click();
  check(calls.join() === 'share:fx-a:sat-25544', `Share opens the share sheet with the trip and the stop's subject: ${calls.join()}`);
  delete ctx.share;
  trip.currentRecordId = () => null;
  calls.length = 0;
  byLabel(T.pause).click();
  check(calls.join() === 'pause:control' && state.phase === 'paused', 'Pause pauses');
  const play = q('.sr-trip__tb--play');
  check(play.classList.contains('is-paused') && play.getAttribute('aria-label') === T.resume && /\(Space\)/.test(play.title), 'paused, the button says Resume and names Space');
  check(primaries() === 1, `paused, the play button is the one ember thing (${primaries()})`);
  check(q('.sr-trip__count').textContent === '2 / 4' && q('.sr-trip__toolbar').hidden === false, 'the counter stays while paused (spec 0003)');
  const status = document.body.all().find((n) => n.getAttribute('role') === 'status');
  check(status && status.textContent === T.pausedChip, `a reader is told the trip paused: "${status && status.textContent}"`);
  calls.length = 0;
  play.click();
  check(calls.join() === 'resume' && !play.classList.contains('is-paused'), 'pressed again it resumes');
  calls.length = 0;
  const hide = q('.sr-trip__tb--hide');
  hide.click();
  check(document.documentElement.classList.contains('sr-trip-collapsed') && hide.getAttribute('aria-label') === T.expand && hide.getAttribute('aria-pressed') === 'true', 'Hide card folds the card away and becomes Show card');
  check(q('.sr-tripsheet').inert === true, 'and the folded sheet is out of the tab order');
  hide.click();
  check(!document.documentElement.classList.contains('sr-trip-collapsed') && hide.getAttribute('aria-label') === T.collapse, 'and back');

  // the keyboard reaches the same methods through the capture-phase listener
  const press = (k) => { const e = { key: k, preventDefault() {}, stopPropagation() {} }; for (const fn of docListeners.keydown || []) fn(e); };
  document.activeElement = document.body;
  press('ArrowRight'); press('ArrowLeft'); press('r');
  check(calls.join() === 'next,back,replay', `→, ← and R drive the trip: ${calls.join()}`);
  calls.length = 0;
  press(' ');
  check(calls.join() === 'pause:control', 'Space pauses');
  press(' ');
  calls.length = 0;
  press('c');
  check(document.documentElement.classList.contains('sr-trip-collapsed'), 'C hides the card');
  press('c');
}

// --- the end
notify({ phase: 'outro', index: 3 });
await new Promise((r) => setTimeout(r, 0));
await new Promise((r) => setTimeout(r, 0));
{
  check(q('.sr-trip__toolbar').hidden === true && q('.sr-trip__top').hidden === true, 'the end card replaces the toolbar and the top bar');
  check(q('.sr-tripsheet__micro').textContent === T.endMicro && q('.sr-tripsheet__name').textContent === state.tourTitle, 'the end has its microlabel and the trip\'s name');
  const acts = q('.sr-tripsheet__actions').querySelectorAll('.sr-act');
  check(acts.length === 3 && acts.map((a) => a.textContent).join('|') === [T.endExplore, T.endReplay, T.share].join('|'), `three actions: ${acts.map((a) => a.textContent).join(', ')}`);
  check(acts[0].classList.contains('sr-act--primary') && primaries() === 1, 'Explore is the one ember');
  check(acts.every((a) => a.querySelector('svg') && a.title), 'each with an icon and a tooltip');
  const card = q('.sr-tripsheet__nextcard');
  check(card && card.dataset.trip === 'fx-b' && card.dataset.group === 'solar-system', 'one next trip, the registry\'s own `next:`, as a trip card in its group\'s tint');
  check(card && card.textContent.includes('6 stops · 3 min'), `with its shape: "${card && card.textContent}"`);
  calls.length = 0;
  acts[1].click();
  card.click();
  check(calls.join() === 'start:fx-a,start:fx-b', `Watch again restarts, the card starts the next: ${calls.join()}`);
  calls.length = 0;
  acts[0].click();
  check(calls.join() === 'stop:left', 'Explore leaves');
  check(q('#sr-trip') === null && !document.documentElement.classList.contains('sr-trip-mode'), 'leaving takes the frame down');
}
frame.dispose();

// A frame made while a trip is already under way (main.js imports it when the first trip starts)
// paints the state it finds, without waiting for the next change.
{
  state = { ...state, phase: 'intro', index: -1, count: 4, estimateMs: 62028, tourId: 'fx-a' };
  const late = createTripFrame(ctx);
  check(q('#sr-trip') !== null && q('.sr-tripsheet__start') !== null, 'a frame made mid-trip paints the intro it finds');
  notify({ phase: 'idle' });
  check(q('#sr-trip') === null, 'and takes itself down when the trip ends');
  late.dispose();
}

// --- present mode (public #441), and the end of a trip that moved the map's centre (#447, #444)
{
  const root = document.documentElement;
  state = { ...state, phase: 'intro', index: -1, count: 4, estimateMs: 62028, tourId: 'fx-a', stageChanged: true };
  calls.length = 0;
  const f = createTripFrame(ctx);
  const press = (k) => { const e = { key: k, preventDefault() {}, stopPropagation() {} }; for (const fn of docListeners.keydown || []) fn(e); };
  const intro = q('.sr-tripsheet__present');
  check(intro && intro.textContent === T.present && intro.getAttribute('aria-pressed') === 'false' && intro.title === T.presentTitle && intro.querySelector('svg'), 'the intro offers Present, a quiet button with an icon, off');
  check(primaries() === 1, 'Start is still the one ember button on the intro');
  check(!root.classList.contains('sr-present') && !q('.sr-tripsheet').classList.contains('is-present'), 'nothing is in present mode until it is asked for');
  intro.click();
  check(root.classList.contains('sr-present') && q('.sr-tripsheet').classList.contains('is-present') && !q('.sr-tripsheet').classList.contains('is-floating'), 'pressed, the sheet is the room\'s caption panel');
  check(calls.join() === 'pacing:reader', `and the presenter paces the trip: ${calls.join()}`);
  check(q('.sr-tripsheet').parentNode === q('#sr-trip'), 'the sheet sits in the frame, not in a sidebar that is gone');
  calls.length = 0;
  document.activeElement = document.body;
  press('PageDown');
  check(calls.join() === 'play', `the clicker's forward key starts the show from the intro: ${calls.join()}`);
  calls.length = 0;
  notify({ phase: 'dwell', index: 0, stopTitle: 'Two places, and only two' });
  const auto = q('.sr-trip__tb--auto');
  const present = q('.sr-trip__tb--present');
  check(auto.hidden === false && auto.getAttribute('aria-pressed') === 'false' && auto.title === T.presentAutoOffTitle, 'the toolbar shows Autoplay in present mode, off');
  check(present.getAttribute('aria-pressed') === 'true' && present.title === T.presentOffTitle, 'and Present, pressed, is the way out of the mode');
  // (The frames made earlier in this file still hear the keys, this stub's removeEventListener
  // being a no-op, and they are not in present mode: they answer Space with a pause. So the checks
  // are on what THIS frame adds.)
  press(' ');
  check(calls.includes('next'), `Space is the clicker's Next in present mode: ${calls.join()}`);
  calls.length = 0;
  if (state.phase === 'paused') notify({ phase: 'dwell', pausedBy: null });
  press('PageUp'); press('PageDown');
  check(calls.includes('back') && calls.includes('next') && calls.indexOf('back') < calls.lastIndexOf('next'), `Page Up and Page Down step the stops: ${calls.join()}`);
  calls.length = 0;
  auto.click();
  check(calls.join() === 'pacing:auto' && auto.getAttribute('aria-pressed') === 'true' && auto.title === T.presentAutoOnTitle, `Autoplay hands the pacing back to the trip: ${calls.join()}`);
  press('a');
  check(calls.filter((c) => c.startsWith('pacing:')).join() === 'pacing:auto,pacing:reader' && auto.getAttribute('aria-pressed') === 'false', 'and A takes it again');
  calls.length = 0;
  present.click();
  check(!root.classList.contains('sr-present') && calls.join() === 'pacing:null' && auto.hidden === true, 'leaving present mode gives the pacing back and puts the panels back');
  present.click();
  calls.length = 0;

  notify({ phase: 'outro', index: 3 });
  await new Promise((r) => setTimeout(r, 0));
  const acts = q('.sr-tripsheet__actions').querySelectorAll('.sr-act');
  check(acts.map((a) => a.textContent).join('|') === [T.endExplore, T.endHome, T.endReplay, T.share].join('|'), `after a trip on another world: Keep flying, Go home, Watch again, Share (${acts.map((a) => a.textContent).join(', ')})`);
  check(acts[0].classList.contains('sr-act--primary') && primaries() === 1 && acts[0].title === T.endStayTitleStage, 'Keep flying is the one ember, and says it stays out there');
  const send = q('.sr-tripsheet__send');
  check(send && send.title === T.endSendTitle && send.textContent.includes(T.endSend), 'the end card has a picture to send');
  acts[0].click();
  check(calls[0] === 'stop:stayed:stay', `Keep flying leaves and stays: ${calls.join()}`);
  check(!root.classList.contains('sr-present'), 'present mode ends with the trip');
  calls.length = 0;
  notify({ phase: 'outro', index: 3 });
  q('.sr-tripsheet__actions').querySelectorAll('.sr-act')[1].click();
  check(calls.includes('stop:left'), `Go home is the ordinary leave: ${calls.join()}`);
  f.dispose();
  state = { ...state, stageChanged: false };
}

// ------------------------------------------------------------------------------ the CSS
{
  const css = readFileSync(join(ROOT, 'site/css/ui.css'), 'utf8');
  check(!/--sr-letterbox|sr-trip__bar/.test(css), 'no letterbox is left in the CSS');
  check(/\.sr-trip__tb \{[^}]*width: 40px;[^}]*height: 40px;/.test(css), 'a toolbar button is 40 px on a desktop');
  check(/html\.sr-phone \.sr-trip__tb \{[^}]*width: 44px;[^}]*height: 44px;/.test(css), 'and 44 px on a phone (docs/ui-guide.md principle 9)');
  check(/\.sr-trip__toolbar \{[^}]*left: calc\(50% \+ var\(--sr-scene-left\) \/ 2\)/.test(css), 'the toolbar is centred on the scene the sidebar leaves, as the pill is');
  check(/\.sr-trip__tb--play\.is-paused \{[^}]*background: var\(--sr-ember\)/.test(css), 'paused, the play button is ember');
  const reduced = css.slice(css.indexOf('REDUCED MOTION IS A CUT, NEVER A SHORTER MOVE: compressing'));
  check(/\.sr-trip__toolbar\.sr-float,[\s\S]*?transition: opacity 120ms linear;/.test(reduced), 'under reduced motion the trip\'s chrome fades in 120 ms and slides nowhere');
  check(/html\.sr-trip-mode #sr-rail,\s*html\.sr-trip-mode #sr-time,/.test(css), 'a trip takes the rail and the pill away');
  check(/html\.sr-present #sr-side \{\s*display: none;/.test(css) && /html\.sr-present \{[^}]*--sr-scene-left: 0px;/.test(css), 'present mode takes the sidebar away and centres the bars on the whole window');
  check(/\.sr-tripsheet\.is-present \.sr-card__leadbody,[^{]*\{[^}]*var\(--sr-fs-present\)/.test(css) && /--sr-fs-present: 32px/.test(css), 'a stop\'s words are 32 px in present mode, from a token');
  check(/html\.sr-present \.sr-trip__tb \{[^}]*width: 56px;[^}]*height: 56px;/.test(css), 'and its targets are 56 px');
  // The frame is 50 kB that a visitor who never takes a trip does not download: main.js imports it
  // when the first trip starts, and index.html does not preload it (the first-visit budget).
  const main = readFileSync(join(JS, 'main.js'), 'utf8');
  const html = readFileSync(join(ROOT, 'site/index.html'), 'utf8');
  check(/import\('\.\/ui\/tripframe\.js'\)/.test(main) && !/^import[^\n]*tripframe/m.test(main), 'main.js imports the trip frame when the first trip starts, not at boot');
  check(!/ui\/tripframe\.js/.test(html), 'and index.html does not preload it');
  const view = readFileSync(join(JS, 'scene/viewshift.js'), 'utf8');
  check(/'#sr-trip \.sr-trip__toolbar'/.test(view) && /'#sr-trip \.sr-tripsheet'/.test(view), 'the view shift keeps the subject out from under the trip\'s sheet and toolbar on a phone');
}

if (problems.length) {
  console.error(`tripframe FAILED (${problems.length}):`);
  for (const p of problems) console.error('  -', p);
  process.exit(1);
}
console.log('tripframe ok: one toolbar of named icon buttons with keys in their tooltips, the progress inside it, the keyboard, an intro with one ember Start and sound as a toggle, an end with one next trip, a top bar of title and Leave, 44 px on a phone');
