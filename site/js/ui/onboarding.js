// ui/onboarding.js -- the tour: a hand-drawn ring and arrow on the real controls, one step at a
// time, and on a first visit an arrow at the rail's button (internal spec 0074).
//
// Contract: createOnboarding(ctx, opts) ->
//   { start(from), stop(why), next(), toggle(from), isOn(), state(), step(),
//     maybeInvite(), invite(), dismissInvite(), isInviting(), setVoice(on), voiceOn() }
//   opts: { deepLink, embed, automated, storage, win, now, steps, voice }   the last five for a test
//
// Ivan, 2026-10-14: "these nice animated onboardings in many apps, where arrows and handwritten
// arrows highlight things asking to click, so it is a tour of all the most important features of
// our project where the user should click on them and go to next."
//
// WHAT IT IS. Eight steps (data/onboarding.js, generated from registry/onboarding.yaml). Each
// rings a real control, says one sentence and asks for one thing; doing the thing is the way on,
// and Next, Skip and Escape are always there. The arithmetic (which step, where the caption goes,
// the ink's paths) is ui/onboardingplan.js; this file owns the document, the listeners and the
// timers.
//
// IT BLOCKS NOTHING. The scrim and the ink take no pointer event; only the caption does. A
// visitor can ignore the tour and use the map: a panel that opens or closes moves the ring or
// takes it away, and the caption stays with its Next.
//
// NEVER A BROKEN OVERLAY. A step's target is the first of its `data-tour` hooks that is on screen.
// A step with none is passed over (after its ground was prepared and WAIT_TARGET_MS given: the
// card is fetched on the first selection). A target that goes away mid-step takes the ring with it.
//
// A MODE THAT OWNS THE SCREEN ENDS IT: a trip (the last step starts one), the clear screen, a reel,
// the drift, an imagined world.
//
// THE VOICE is the trips' (scripts/narrate.py, trip `onboarding`): OFF until the visitor turns it
// on in the caption, then remembered, and no clip is fetched before that press (spec 0035 req 1).
// The caption is always shown.
//
// THE FIRST VISIT'S ARROW. main.js asks maybeInvite() some seconds after the scene has settled, for
// a visitor not seen before: the ring and the arrow at the rail's button with one line, INVITE_MS
// long, and then gone. It never starts the tour, takes no focus and has no scrim. Remembered in
// localStorage['sr:tour'] the moment it shows; a browser that keeps nothing gets no arrow.
//
// Fetched when the rail's button is pressed or for that first visit, never at boot (main.js
// ctx.wantOnboarding; tests/test_boot_diet.mjs).

import { COPY, t } from '../copy/en.js';
import '../copy/en.later.js';
import { loadCss } from './latercss.js';
import { icon } from './icons.js';
import { pickFormat } from '../audio/pick.js';
import { STEPS, VOICE } from '../data/onboarding.js';
import * as P from './onboardingplan.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
/** The classes on <html> that mean something else owns the screen. */
export const MODES = ['sr-trip-mode', 'sr-clean', 'sr-hud', 'sr-ambient', 'sr-imagine-on', 'sr-drift'];
/** The thing the card step selects when nothing is selected: the station everybody knows. */
export const SHOW_ME = 'sat-25544';
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';
const TRACK_MS = 200;

function storageOf(win) {
  try { return win.localStorage; } catch { return null; }
}

export function createOnboarding(ctx, opts = {}) {
  const win = opts.win || window;
  const doc = win.document;
  const C = COPY.tour;
  const storage = 'storage' in opts ? opts.storage : storageOf(win);
  const steps = opts.steps || STEPS;
  const voice = opts.voice || VOICE;
  const hasVoice = !!(voice && voice.clips && Object.keys(voice.clips).length);
  const now = typeof opts.now === 'function' ? opts.now : () => Date.now();

  let state = P.IDLE;
  let built = false;
  let root; let holeEl; let ink; let card; let countEl; let sayEl; let askEl; let voiceBtn; let skipBtn; let nextBtn; let chip;
  const paths = {};
  let target = null;
  let described = null;
  let lastSig = '';
  let token = 0;
  let trackTimer = 0;
  let beatTimer = 0;
  let inviteTimer = 0;
  let inviting = false;
  let offAction = null;
  let modeWatch = null;
  let reopened = false;
  let speaking = 0;
  let audio = null;
  let voiceOnNow = hasVoice && P.readVoice(storage);
  const unavailable = new Set();

  // --- the elements, built once ------------------------------------------------------------------
  function inkPath(name, extra) {
    const halo = doc.createElementNS(SVG_NS, 'path');
    halo.setAttribute('class', `sr-tour__halo ${extra}`);
    halo.setAttribute('pathLength', '1');
    const line = doc.createElementNS(SVG_NS, 'path');
    line.setAttribute('class', `sr-tour__line ${extra}`);
    line.setAttribute('pathLength', '1');
    ink.append(halo, line);
    paths[name] = [halo, line];
  }

  function button(className, words, title) {
    const b = doc.createElement('button');
    b.type = 'button';
    b.className = className;
    if (words) b.textContent = words;
    if (title) b.title = title;
    return b;
  }

  function build() {
    if (built) return;
    built = true;
    root = doc.createElement('div');
    root.className = 'sr-tour';
    root.hidden = true;

    holeEl = doc.createElement('div');
    holeEl.className = 'sr-tour__hole';
    holeEl.hidden = true;

    ink = doc.createElementNS(SVG_NS, 'svg');
    ink.setAttribute('class', 'sr-tour__ink');
    ink.setAttribute('aria-hidden', 'true');
    ink.setAttribute('focusable', 'false');
    inkPath('ring', 'sr-tour__ring');
    inkPath('shaft', 'sr-tour__shaft');
    inkPath('head', 'sr-tour__head');

    card = doc.createElement('section');
    card.className = 'sr-tour__card sr-float';
    card.setAttribute('role', 'region');
    card.setAttribute('aria-label', C.label);
    const head = doc.createElement('div');
    head.className = 'sr-tour__top';
    const micro = doc.createElement('h2');
    micro.className = 'sr-micro';
    micro.textContent = C.micro;
    countEl = doc.createElement('span');
    countEl.className = 'sr-tour__count';
    head.append(micro, countEl);
    // The words are a polite live region: a screen reader says each step as it comes.
    const words = doc.createElement('div');
    words.className = 'sr-tour__words';
    words.setAttribute('aria-live', 'polite');
    words.setAttribute('aria-atomic', 'true');
    sayEl = doc.createElement('p');
    sayEl.className = 'sr-tour__say';
    sayEl.id = 'sr-tour-say';
    askEl = doc.createElement('p');
    askEl.className = 'sr-tour__ask';
    askEl.id = 'sr-tour-ask';
    words.append(sayEl, askEl);
    const row = doc.createElement('div');
    row.className = 'sr-tour__row';
    voiceBtn = button('sr-tour__voice', '', C.voiceTitle);
    voiceBtn.setAttribute('aria-label', C.voice);
    voiceBtn.setAttribute('aria-pressed', String(voiceOnNow));
    voiceBtn.appendChild(icon('speech', 20));
    voiceBtn.hidden = !hasVoice;
    skipBtn = button('sr-btn sr-btn--quiet sr-tour__skip', C.skip, C.skipTitle);
    nextBtn = button('sr-btn sr-tour__next', C.next, C.nextTitle);
    row.append(voiceBtn, skipBtn, nextBtn);
    card.append(head, words, row);

    // The first visit's line: a button, so the arrow's words are also a way in.
    chip = button('sr-tour__invite sr-float', C.invite, C.inviteTitle);
    chip.hidden = true;

    root.append(holeEl, ink, card, chip);
    doc.body.appendChild(root);

    voiceBtn.addEventListener('click', () => setVoice(!voiceOnNow));
    skipBtn.addEventListener('click', () => send({ type: 'skip' }));
    nextBtn.addEventListener('click', () => next());
    chip.addEventListener('click', () => start('invite'));
    chip.addEventListener('pointerenter', () => win.clearTimeout(inviteTimer));
    chip.addEventListener('pointerleave', () => { if (inviting) inviteTimer = win.setTimeout(dismissInvite, P.INVITE_MS / 3); });
  }

  // --- targets -----------------------------------------------------------------------------------
  /** The element's box on screen, clipped to the sidebar when it is inside it; null when it does not show. */
  function shown(el) {
    if (!el || !el.isConnected || el.closest('[hidden], [inert]')) return null;
    const cs = win.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return null;
    const r = el.getBoundingClientRect();
    let x0 = Math.max(0, r.left); let y0 = Math.max(0, r.top);
    let x1 = Math.min(win.innerWidth, r.right); let y1 = Math.min(win.innerHeight, r.bottom);
    const side = el.closest('#sr-side');
    if (side) {
      const s = side.getBoundingClientRect();
      x0 = Math.max(x0, s.left); y0 = Math.max(y0, s.top); x1 = Math.min(x1, s.right); y1 = Math.min(y1, s.bottom);
    }
    if (x1 - x0 < 8 || y1 - y0 < 8) return null;
    return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
  }

  /** The first of the hooks that is on screen: [element, rect] or null. */
  function firstShown(hooks) {
    for (const hook of hooks || []) {
      for (const el of doc.querySelectorAll(`[data-tour~="${hook}"]`)) {
        const rect = shown(el);
        if (rect) return [el, rect];
      }
    }
    return null;
  }

  /**
   * A target that is in the page but scrolled out of the sidebar's view (the Trips section sits
   * under the home's first screen; seen on a runner, 2026-10-14: the last step was passed over):
   * bring it in. A tall one by its head, where it is ringed.
   */
  function reveal(hooks) {
    for (const hook of hooks || []) {
      for (const el of doc.querySelectorAll(`[data-tour~="${hook}"]`)) {
        if (!el.isConnected || el.closest('[hidden], [inert]') || typeof el.scrollIntoView !== 'function') continue;
        const r = el.getBoundingClientRect();
        if (!(r.width > 0 && r.height > 0)) continue;
        try { el.scrollIntoView({ block: r.height > P.HEAD_MAX ? 'start' : 'nearest' }); } catch { /* an old browser */ }
        return true;
      }
    }
    return false;
  }

  const rectOf = (id) => {
    const el = doc.getElementById(id);
    if (!el || el.closest('[hidden]')) return null;
    const cs = win.getComputedStyle(el);
    if (cs.visibility === 'hidden' || cs.display === 'none') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  };
  /** What a step's own press may have opened: What to show, the phone's menu, the share sheet. */
  const panels = () => [...doc.querySelectorAll('#sr-show, #sr-more, .sr-share')].map((el) => {
    if (el.hidden || el.closest('[hidden]')) return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
  }).filter(Boolean);
  const band = (view) => P.freeBand(view, { side: rectOf('sr-side'), top: rectOf('sr-top'), pill: rectOf('sr-time'), panels: panels() });
  const modeOn = () => MODES.some((m) => doc.documentElement.classList.contains(m));
  const px = (v) => `${Math.round(v)}px`;

  // --- drawing -----------------------------------------------------------------------------------
  function setInk(hole, cap, side, seedText, view) {
    const seed = P.seedOf(seedText);
    const ends = P.arrowEnds(cap, hole, side, view);
    const arrow = P.arrowPath(ends.from, ends.to, seed);
    const d = { ring: hole ? P.ringPath(hole, seed, view) : '', shaft: arrow.shaft, head: arrow.head };
    for (const name of Object.keys(paths)) for (const p of paths[name]) p.setAttribute('d', d[name] || 'M0 0');
    ink.classList.toggle('has-ring', !!hole);
  }

  /** Draw the ink on once: the class comes off, the browser is made to notice, and it goes back. */
  function redraw() {
    root.classList.remove('is-drawn');
    void root.offsetWidth;
    root.classList.add('is-drawn');
  }

  function place(box, hole, view, seedText, withInk) {
    const size = { w: box.offsetWidth, h: box.offsetHeight };
    const at = P.placeCaption(hole, view, size, band(view));
    box.style.left = px(at.x);
    box.style.top = px(at.y);
    if (hole) {
      holeEl.style.left = px(hole.x); holeEl.style.top = px(hole.y);
      holeEl.style.width = px(hole.w); holeEl.style.height = px(hole.h);
    }
    ink.style.display = withInk ? '' : 'none';
    if (withInk) setInk(hole, { x: at.x, y: at.y, w: size.w, h: size.h }, at.side, seedText, view);
    return at;
  }

  function layout(fresh) {
    const step = current();
    if (!step || !built) return;
    const view = { w: win.innerWidth, h: win.innerHeight };
    const scene = step.look === 'scene';
    // Done and waiting for Next: the ring and the scrim are gone, so what the press opened is not
    // dimmed. Done and about to go on by itself: they stay for the beat, or the caption would jump.
    const waiting = state.phase === 'done' && step.then === 'wait';
    let hole = null;
    if (!scene && !waiting) {
      const hit = firstShown(step.hooks);
      target = hit ? hit[0] : null;
      hole = hit ? P.holeFor(hit[1], view) : null;
    }
    const withInk = !waiting && (scene || !!hole);
    const sig = JSON.stringify([state.phase, state.index, hole, view, card.offsetWidth, card.offsetHeight, band(view)]);
    if (!fresh && sig === lastSig) return;
    lastSig = sig;
    holeEl.hidden = !hole;
    place(card, hole, view, step.id, withInk);
  }

  function layoutInvite(fresh) {
    const hit = firstShown(['tour', 'more']);
    if (!hit) { dismissInvite(); return; }
    const view = { w: win.innerWidth, h: win.innerHeight };
    const hole = P.holeFor(hit[1], view);
    const sig = JSON.stringify(['invite', hole, view]);
    if (!fresh && sig === lastSig) return;
    lastSig = sig;
    holeEl.hidden = true;
    place(chip, hole, view, 'invite', !!hole);
  }

  // --- a step comes up ---------------------------------------------------------------------------
  const current = () => (state.phase === 'step' || state.phase === 'done' ? steps[state.index] : null);
  const available = (step) => !unavailable.has(step.id);

  function tidy() {
    try { if (ctx.rail && typeof ctx.rail.closeShow === 'function') ctx.rail.closeShow(); } catch { /* not built yet */ }
    try { if (ctx.rail && typeof ctx.rail.closeMore === 'function') ctx.rail.closeMore(); } catch { /* not built yet */ }
    try { if (ctx.share && typeof ctx.share.close === 'function') ctx.share.close(); } catch { /* not built yet */ }
  }

  function prepare(step) {
    for (const what of step.prepare || []) {
      try {
        if (what === 'home' && ctx.shell) {
          if (ctx.shell.view() !== 'home') {
            if (typeof ctx.selected === 'function' && ctx.selected() && typeof ctx.deselect === 'function') ctx.deselect();
            if (ctx.shell.view() !== 'home') ctx.shell.show('home');
          }
          if (ctx.shell.collapsed()) { ctx.shell.collapse(false); reopened = true; }
        } else if (what === 'card') {
          const has = typeof ctx.selected === 'function' && ctx.selected();
          const record = !has && typeof ctx.recordById === 'function' ? ctx.recordById(SHOW_ME) : null;
          if (record && typeof ctx.select === 'function') ctx.select(record, { fly: true, undo: false });
        } else if (what === 'sheet' && ctx.shell) {
          const sheet = typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
          if (sheet && typeof sheet.detent === 'function' && sheet.detent() === 'peek') sheet.set('half');
        } else if (what === 'peek' && ctx.shell) {
          // ON A PHONE ONLY (a desktop has no sheet and keeps its card): the time pill is hidden
          // while a card is open and under a sheet at full height (ui.css, `sr-card-open`; seen on
          // a runner, 2026-10-14: the clock's step was passed over). The card is put down and
          // the sheet lowered.
          const sheet = typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
          if (sheet && typeof sheet.detent === 'function') {
            if (ctx.shell.view() !== 'home') {
              if (typeof ctx.selected === 'function' && ctx.selected() && typeof ctx.deselect === 'function') ctx.deselect();
              if (ctx.shell.view() !== 'home') ctx.shell.show('home');
            }
            if (sheet.detent() !== 'peek') sheet.set('peek');
          }
        }
      } catch (e) { console.warn('the tour could not prepare', what, e); }
    }
  }

  function listenFor(step) {
    const did = () => { if (state.phase === 'step') send({ type: 'action' }); };
    const offs = [];
    const on = (node, type, fn, capture) => { node.addEventListener(type, fn, capture); offs.push(() => node.removeEventListener(type, fn, capture)); };
    const inside = (e) => !!(target && e.target && target.contains(e.target));
    if (step.awaits === 'camera') {
      const rig = ctx.cameraRig;
      if (rig && typeof rig.onUserInput === 'function') offs.push(rig.onUserInput(() => did()));
    } else if (step.awaits === 'select') {
      on(win, 'sr:select', (e) => { if (e.detail) did(); }, false);
    } else if (step.awaits === 'press') {
      on(doc, 'pointerdown', (e) => { if (inside(e)) did(); }, true);
      // A keyboard's Enter or Space is a click with no pointer before it.
      on(doc, 'click', (e) => { if (e.detail === 0 && inside(e)) did(); }, true);
    } else if (step.awaits === 'type') {
      on(doc, 'input', (e) => { if (inside(e)) did(); }, true);
    }
    offAction = () => { for (const off of offs) { try { if (typeof off === 'function') off(); } catch { /* gone already */ } } };
  }

  function undescribe() {
    if (described) { described.removeAttribute('aria-describedby'); described = null; }
  }

  /** Focus goes to the control being taught, which is described by the caption. Never a phone's text field: it would raise the keyboard. */
  function focusTarget() {
    undescribe();
    if (!target) return;
    const f = target.matches(FOCUSABLE) ? target : target.querySelector(FOCUSABLE);
    if (!f || f.hasAttribute('aria-describedby')) return;
    let coarse = false;
    try { coarse = win.matchMedia('(pointer: coarse)').matches; } catch { coarse = false; }
    if (coarse && /^(INPUT|TEXTAREA)$/.test(f.tagName)) return;
    f.setAttribute('aria-describedby', 'sr-tour-say sr-tour-ask');
    described = f;
    try { f.focus({ preventScroll: true }); } catch { /* not focusable after all */ }
  }

  function paintWords(step) {
    countEl.textContent = t(C.count, { n: String(state.index + 1), of: String(steps.length) });
    sayEl.textContent = step.say;
    askEl.textContent = state.phase === 'done' && step.then === 'wait' ? C.waited : step.ask;
    const last = P.reduce(state, { type: 'next' }, steps, available).phase === 'over';
    nextBtn.textContent = last ? C.done : C.next;
    nextBtn.title = last ? C.doneTitle : C.nextTitle;
  }

  function enter() {
    const mine = ++token;
    const step = current();
    win.clearTimeout(beatTimer);
    if (offAction) { offAction(); offAction = null; }
    undescribe();
    hush();
    tidy();
    target = null;
    card.hidden = true;
    holeEl.hidden = true;
    ink.style.display = 'none';
    prepare(step);
    const t0 = now();
    const settle = () => {
      if (mine !== token) return;
      let hit = step.look === 'scene' ? [doc.body] : firstShown(step.hooks);
      if (!hit && reveal(step.hooks)) hit = firstShown(step.hooks);
      if (!hit) {
        if (now() - t0 < P.WAIT_TARGET_MS) { win.setTimeout(settle, 120); return; }
        unavailable.add(step.id);
        send({ type: 'missing' });
        return;
      }
      target = step.look === 'scene' ? null : hit[0];
      // On screen, but perhaps only by an edge: all of it (a tall one by its head).
      if (target) reveal(step.hooks);
      card.hidden = false;
      paintWords(step);
      layout(true);
      redraw();
      listenFor(step);
      focusTarget();
      speak(step);
    };
    settle();
  }

  /** The awaited thing happened: go on after a beat, or take the ring away and wait for Next. */
  function onDone() {
    const step = current();
    if (offAction) { offAction(); offAction = null; }
    if (step.then === 'wait') { paintWords(step); layout(true); return; }
    const mine = token;
    beatTimer = win.setTimeout(() => { if (mine === token) send({ type: 'next' }); }, P.BEAT_MS);
  }

  function send(event) {
    const before = state;
    state = P.reduce(state, event, steps, available);
    if (state === before) return state;
    if (state.phase === 'step') enter();
    else if (state.phase === 'done') onDone();
    else if (state.phase === 'over') finish(state.why);
    return state;
  }

  // --- the voice ---------------------------------------------------------------------------------
  function hush() {
    speaking += 1;
    if (audio) { try { audio.pause(); } catch { /* nothing was playing */ } }
  }

  function speak(step) {
    hush();
    if (!voiceOnNow || !step) return;
    const row = P.clipFiles(voice, step.id);
    if (!row) return;
    if (!audio) audio = new win.Audio();
    const urls = pickFormat(row, (type) => audio.canPlayType(type)).map((u) => new URL(`../../${u}`, import.meta.url).href);
    const mine = speaking;
    let i = 0;
    const tryNext = () => {
      if (mine !== speaking || i >= urls.length) return;
      audio.src = urls[i++];
      let p = null;
      try { p = audio.play(); } catch { p = null; }
      // A clip that will not play is a step without a voice: the caption is the words.
      if (p && typeof p.catch === 'function') p.catch(() => tryNext());
    };
    tryNext();
  }

  function setVoice(on) {
    voiceOnNow = hasVoice && !!on;
    P.writeVoice(storage, voiceOnNow);
    if (voiceBtn) voiceBtn.setAttribute('aria-pressed', String(voiceOnNow));
    if (voiceOnNow) speak(current()); else hush();
  }

  // --- the tour's own keys, the screen's modes, and where the target is --------------------------
  function onKey(e) {
    if (!isOn() || e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey) return;
    const a = doc.activeElement;
    const typing = !!a && (/^(INPUT|TEXTAREA|SELECT)$/.test(a.tagName) || a.isContentEditable);
    if (typing) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); send({ type: 'escape' }); } else if (e.key === 'n' || e.key === 'N') { e.preventDefault(); e.stopPropagation(); next(); }
  }
  const onResize = () => { if (isOn()) layout(true); else if (inviting) layoutInvite(true); };

  function watch(on) {
    win.clearInterval(trackTimer);
    if (modeWatch) { modeWatch.disconnect(); modeWatch = null; }
    doc.removeEventListener('keydown', onKey, true);
    win.removeEventListener('resize', onResize);
    if (!on) return;
    trackTimer = win.setInterval(() => { if (isOn()) layout(false); else if (inviting) layoutInvite(false); }, TRACK_MS);
    win.addEventListener('resize', onResize);
    if (isOn()) doc.addEventListener('keydown', onKey, true);
    if (typeof win.MutationObserver === 'function') {
      modeWatch = new win.MutationObserver(() => {
        if (!modeOn()) return;
        if (inviting) dismissInvite();
        if (isOn()) send({ type: 'mode' });
      });
      modeWatch.observe(doc.documentElement, { attributes: true, attributeFilter: ['class'] });
    }
  }

  const railButton = () => doc.querySelector('[data-tour~="tour"]');

  // --- the tour's life ---------------------------------------------------------------------------
  const isOn = () => state.phase === 'step' || state.phase === 'done';

  async function start() {
    if (isOn()) return state;
    if (modeOn()) return state;
    dismissInvite();
    P.markSeen(storage);
    await loadCss('onboarding', doc);
    if (isOn()) return state;
    build();
    unavailable.clear();
    reopened = false;
    root.hidden = false;
    root.classList.remove('is-invite');
    chip.hidden = true;
    const b = railButton();
    if (b) b.setAttribute('aria-pressed', 'true');
    state = P.IDLE;
    send({ type: 'start' });
    watch(isOn());
    return state;
  }

  function finish(why) {
    token += 1;
    win.clearTimeout(beatTimer);
    if (offAction) { offAction(); offAction = null; }
    undescribe();
    hush();
    watch(false);
    const hadFocus = !!(root && root.contains(doc.activeElement));
    if (root) { root.hidden = true; root.classList.remove('is-drawn'); }
    target = null;
    lastSig = '';
    const b = railButton();
    if (b) b.setAttribute('aria-pressed', 'false');
    if (why !== 'mode') {
      tidy();
      // The sidebar the tour opened goes back to how the visitor had it.
      if (reopened && ctx.shell && typeof ctx.shell.collapse === 'function') { try { ctx.shell.collapse(true); } catch { /* the shell is gone */ } }
      if (b && (hadFocus || doc.activeElement === doc.body) && shown(b)) { try { b.focus({ preventScroll: true }); } catch { /* not focusable */ } }
    }
    reopened = false;
  }

  const stop = (why) => send({ type: why === 'escape' ? 'escape' : 'skip' });
  const next = () => send({ type: 'next' });
  const toggle = (from) => (isOn() ? stop('skip') : start(from));

  // --- the first visit's arrow -------------------------------------------------------------------
  async function invite() {
    if (isOn() || inviting) return;
    await loadCss('onboarding', doc);
    if (isOn() || inviting || modeOn()) return;
    build();
    inviting = true;
    root.hidden = false;
    root.classList.add('is-invite');
    card.hidden = true;
    chip.hidden = false;
    layoutInvite(true);
    if (!inviting) return;
    redraw();
    watch(true);
    win.clearTimeout(inviteTimer);
    inviteTimer = win.setTimeout(dismissInvite, P.INVITE_MS);
  }

  function dismissInvite() {
    if (!inviting) return;
    inviting = false;
    win.clearTimeout(inviteTimer);
    if (chip) chip.hidden = true;
    if (root) root.classList.remove('is-invite', 'is-drawn');
    if (!isOn()) { watch(false); if (root) root.hidden = true; lastSig = ''; }
  }

  /** For a first visit: point at the button unless there is a reason not to. Returns the reason, or null when it points. */
  function maybeInvite() {
    const reason = P.decideInvite(storage, {
      deepLink: !!opts.deepLink,
      embed: !!opts.embed,
      automated: !!opts.automated,
      mode: modeOn() || !!(ctx.trip && ctx.trip.state && ctx.trip.state.phase && ctx.trip.state.phase !== 'idle'),
      running: isOn(),
      target: !!firstShown(['tour', 'more']),
    });
    if (reason) return reason;
    invite();
    return null;
  }

  return {
    start, stop, next, toggle, isOn,
    state: () => state,
    step: () => current(),
    maybeInvite, invite, dismissInvite,
    isInviting: () => inviting,
    setVoice, voiceOn: () => voiceOnNow,
    /** For a probe: where the pieces are, so a picture can be checked against numbers. */
    measure() {
      if (!built) return null;
      const box = (el) => { if (!el || el.hidden) return null; const r = el.getBoundingClientRect(); return r.width ? [Math.round(r.left), Math.round(r.top), Math.round(r.width), Math.round(r.height)] : null; };
      return { card: box(card), hole: box(holeEl), chip: box(chip), ink: ink.style.display !== 'none', step: current() ? current().id : null, phase: state.phase };
    },
  };
}
