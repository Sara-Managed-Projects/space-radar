// ui/tripframe.js -- the cinematic frame around a guided trip.
//
// Contract export: createTripFrame(ctx) -> { dispose() }
//
// ui/trip.js flies the camera. This is what a visitor sees of it: the letterbox, the controls in
// the letterbox, the progress row, the intro and end cards, the keyboard, and the announcement a
// screen reader gets instead of the picture. It reads the machine through `state` and
// `onChange(fn)` and drives it through the same methods a console can call, so the trip can be
// measured in a browser with none of this on screen -- which is how it was.
//
// ---------------------------------------------------------------------------------------------
// THE LETTERBOX IS WHERE THE CONTROLS LIVE, AND THAT IS THE WHOLE IDEA.
//
// Two bars are the cheapest thing in the world that says "film". Put every control inside them
// and the controls cost NOTHING from the picture: the scene keeps its full width and loses about
// an eighth of its height to furniture that is supposed to be there. A control floating over the
// sky is a control sitting on the thing the visitor came for.
//
// ---------------------------------------------------------------------------------------------
// THE CONTROL SET, AND WHY EACH ONE IS HERE (nothing below is taste).
//
//   Pause/Play  We default to `pacing: auto`, so card content auto-updates. WCAG 2.2.2 makes a
//               pause control mandatory for that and the WAI-ARIA carousel pattern requires it
//               FIRST IN TAB ORDER -- which is why the bottom bar is before the top bar in the
//               DOM and put in place by CSS. Tab therefore reaches
//               Pause, Back, Next, Replay, Hide card, Leave, then the card.
//   Back        NASA's Eyes gives back equal visual weight to next: a chevron pair, not a next
//               button with an escape hatch. Measured in that product, 2026-09-07.
//   Next        See onNext: it collapses the running flight rather than starting a new one.
//   Progress    Google Earth's KML player -- the oldest and by far the most used tour player in
//               this genre -- ships a counter AND a slider. Twenty years of user pressure. Eyes
//               ships no progress indicator of any kind, which is its clearest gap and not a
//               choice worth copying. Text AND segments: dots alone are unreadable to a screen
//               reader and illegible past about eight.
//   Replay      Eyes ships per-stop REPLAY ANIMATION and it is the right answer to "I looked
//               away". Free here: it is jump(current index).
//   Hide card   The 3D scene is the product and the card covers it. Eyes ships this as "Expand
//               story panel". Bound to `c`.
//   Leave       Always visible, never behind a menu -- see GETTING OUT below.
//
// NOT SHIPPED, and why: a SCRUBBER (Google Earth needs one because a KML tour is a continuous
// timeline; ours is a chain of discrete shots, and a scrubber over discrete stops is a worse dot
// strip) and a LOOP (nothing here is attract mode; it arrives with a registry field the day
// somebody builds a kiosk).
//
// ---------------------------------------------------------------------------------------------
// GETTING OUT -- the two traps, and one rule that defeats both.
//
//   Trap A, the accidental exit: a stray drag ends a two-minute experience and there is no way
//   back. Trap B, feeling captive: the camera is locked, dragging does nothing, and a modal asks
//   whether you are sure.
//
//   > USER CAMERA INPUT PAUSES THE TRIP. IT NEVER EXITS IT. Escape exits, immediately, with no
//   > confirmation, and leaves the camera exactly where it is.
//
// You cannot lose the trip by accident, because grabbing the camera never ends it -- ui/trip.js's
// onUserInput hook pauses, and the chip in the bottom bar offers Resume. And you are never
// captive, because the camera is never disabled and Escape never argues. Eyes falls into trap B:
// during a story its camera input is inert and Escape does nothing (measured). WorldWide
// Telescope resolves it the way this does.
//
// WHAT LEAVING LEAVES BEHIND: the camera exactly where it is -- no return flight, because
// returning home throws away what the trip just spent two minutes earning and is a fourth
// unrequested camera move after the visitor stopped asking for camera moves. ui/trip.js restores
// the layers it flipped and the clock it clamped, and re-selects the current object so the card
// becomes the ordinary object card. This file restores the panel, the mobile bar, the document
// title, and the focus to the row the trip was started from.
//
// ---------------------------------------------------------------------------------------------
// REDUCED MOTION IS A CUT, NEVER A SHORTER MOVE. Compressing a four-second sweep into one raises
// the angular velocity fourfold, and a vestibular trigger scales with the RATE of large-field
// motion rather than its duration -- so the obvious kindness makes it worse. scene/camera.js
// already cuts and cross-fades; ui/trip.js already forces reader pacing and leaves the dwell
// alone. What is here: the letterbox does not slide, the card does not rise, and the 220 ms
// cross-fade the rig has been emitting since it was written finally has a consumer -- over the
// CANVAS and never over the card, or the scene appears to teleport under stationary text.

import { COPY, t } from '../copy/en.js';

const HOST_ID = 'sr-trip';
const MODE_CLASS = 'sr-trip';
const COLLAPSED_CLASS = 'sr-trip-collapsed';
const PHASE_ATTR = 'data-trip-phase';

// The panels that must not be reachable while the picture is the point. `inert` and not merely
// `opacity: 0` -- see setChromeHidden().
const CHROME = ['sr-controls', 'sr-status'];
const MOBILE_BAR = '.sr-mobilebar';

const MINUTE_MS = 60000;

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

function button(className, text, title, onClick) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/**
 * "5 stops, about two minutes" -- and never before the stops have been resolved.
 *
 * ROUNDED UP, deliberately. The estimate is a floor already: it counts the flights and the dwells
 * and cannot count the time somebody spends paused, or reading, or looking around. Rounding down
 * would make a promise the trip then breaks, and this is an app whose whole argument is that a
 * number you cannot support is worse than no number.
 */
export function shapeLine(count, estimateMs) {
  const mins = Math.max(1, Math.ceil((estimateMs || 0) / MINUTE_MS));
  if (mins <= 1) return t(COPY.trip.shapeOneMinute, { count });
  return t(COPY.trip.shape, { count, mins });
}

export function createTripFrame(ctx) {
  const trip = ctx && ctx.trip;
  if (!trip) return { dispose() {} };
  const rig = ctx.cameraRig;

  let host = null;
  let parts = null;
  let collapsed = false;
  let savedDocTitle = null;
  let savedFocus = null;
  let tourId = null;
  let offFade = null;
  let raf = 0;
  // Set by Next/Back/Replay and by the arrow keys, cleared by the render that consumes it. Focus
  // moves to the stop heading on a jump the VISITOR asked for, and never on an auto-advance:
  // stealing focus mid-sentence interrupts a screen reader and yanks the arrow keys away.
  let userJumped = false;
  let lastIndex = -1;

  // ------------------------------------------------------------------------------------ DOM

  function build() {
    if (host) return;
    host = el('div', 'sr-trip');
    host.id = HOST_ID;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-roledescription', COPY.trip.frameLabel);

    // BOTTOM BAR FIRST IN THE DOM. CSS puts it at the foot; the APG puts its pause control first
    // in the tab order. This is the only way to have both without a tabindex, and a positive
    // tabindex is a worse bug than the one it would fix.
    const bottom = el('section', 'sr-trip__bar sr-trip__bar--bottom');

    const controls = el('div', 'sr-trip__controls');
    controls.setAttribute('aria-label', COPY.trip.controlsLabel);
    const pause = button('sr-trip__btn sr-trip__btn--pause', COPY.trip.pause, COPY.trip.pauseTitle, togglePause);
    const back = button('sr-trip__btn', COPY.trip.back, COPY.trip.backTitle, onBack);
    const next = button('sr-trip__btn', COPY.trip.next, COPY.trip.nextTitle, onNext);
    const replay = button('sr-trip__btn', COPY.trip.replay, COPY.trip.replayTitle, onReplay);
    const collapse = button('sr-trip__btn', COPY.trip.collapse, COPY.trip.collapseTitle, () =>
      setCollapsed(!collapsed),
    );
    for (const b of [pause, back, next, replay, collapse]) controls.appendChild(b);

    const progress = el('div', 'sr-trip__progress');
    const count = el('span', 'sr-trip__count');
    const segs = el('ul', 'sr-trip__segs');
    segs.setAttribute('aria-hidden', 'true'); // the counter beside it is the readable one
    progress.appendChild(count);
    progress.appendChild(segs);
    progress.setAttribute('aria-label', COPY.trip.progressLabel);

    // The chip REPLACES the progress row rather than adding furniture, and it is not a modal.
    const chip = el('div', 'sr-trip__chip');
    chip.appendChild(el('span', 'sr-trip__chiptext', COPY.trip.pausedChip));
    chip.appendChild(button('sr-trip__btn sr-trip__btn--ember', COPY.trip.resume, COPY.trip.resumeTitle, onResume));
    chip.appendChild(button('sr-trip__btn', COPY.trip.leave, COPY.trip.leaveTitle, leave));
    chip.hidden = true;

    // What a screen reader is told. The CARD is the accessible representation of a stop -- we do
    // not describe a live 3D scene, because that would be asserting a description of pixels
    // nobody verified, which is the exact failure the honesty rule exists to prevent. So this
    // region carries the stop's position and title only, and the body stays in the card where it
    // is read once.
    const live = el('div', 'sr-trip__live');
    const group = el('div', null);
    group.setAttribute('role', 'group');
    group.setAttribute('aria-roledescription', COPY.trip.stopRole);
    const heading = el('h2', 'sr-trip__stopname');
    heading.tabIndex = -1;
    group.appendChild(heading);
    live.appendChild(group);
    // aria-live on a region that changes every twelve seconds floods a reader, so in `auto` the
    // region is silent and the TITLE ALONE is announced through this status. Title in status,
    // body in the document -- exactly as the APG states it.
    const status = el('div', 'sr-trip__live');
    status.setAttribute('role', 'status');

    bottom.appendChild(controls);
    bottom.appendChild(progress);
    bottom.appendChild(chip);
    bottom.appendChild(live);
    bottom.appendChild(status);

    const top = el('header', 'sr-trip__bar sr-trip__bar--top');
    const title = el('h1', 'sr-trip__title');
    top.appendChild(title);
    top.appendChild(button('sr-trip__btn sr-trip__btn--leave', COPY.trip.leave, COPY.trip.leaveTitle, leave));

    // The intro and the end card. An unmarked ending is indistinguishable from a crash.
    const panel = el('div', 'sr-trip__panel');
    panel.hidden = true;

    // The 220 ms cross-fade under reduced motion: over the canvas, under the card.
    const fade = el('div', 'sr-trip__fade');
    fade.setAttribute('aria-hidden', 'true');

    host.appendChild(bottom);
    host.appendChild(top);
    host.appendChild(panel);
    host.appendChild(fade);
    document.body.appendChild(host);

    parts = {
      pause, back, next, replay, collapse, controls,
      progress, count, segs, chip, live, group, heading, status,
      title, panel, fade, bottom, top,
    };
  }

  function destroy() {
    if (!host) return;
    host.remove();
    host = null;
    parts = null;
  }

  // --------------------------------------------------------------------------- the chrome

  /**
   * `inert` and not only `opacity: 0`.
   *
   * THE BUG NOBODY SEES COMING: a panel hidden with opacity and pointer-events stays FULLY
   * FOCUSABLE. Tab walks into an invisible sidebar and the focus ring is off screen with no way
   * to tell where it went. `inert` removes the subtree from the tab order AND from the
   * accessibility tree in one property, which `aria-hidden` alone does not do.
   *
   * The mobile bar is the easy one to miss: ui/mobile.js appends it to document.body, not to
   * #sr-controls, so hiding the panel alone leaves a two-button bar sitting over the picture on
   * a phone.
   */
  function setChromeHidden(hidden) {
    for (const id of CHROME) {
      const node = document.getElementById(id);
      if (!node) continue;
      node.inert = hidden;
    }
    const bar = document.querySelector(MOBILE_BAR);
    if (bar) bar.inert = hidden;
    document.documentElement.classList.toggle(MODE_CLASS, hidden);
  }

  function setCollapsed(on) {
    collapsed = !!on;
    document.documentElement.classList.toggle(COLLAPSED_CLASS, collapsed);
    if (!parts) return;
    parts.collapse.textContent = collapsed ? COPY.trip.expand : COPY.trip.collapse;
    parts.collapse.title = collapsed ? COPY.trip.expandTitle : COPY.trip.collapseTitle;
    // The card is folded away visually AND left out of the tab order, so the two agree.
    const card = document.getElementById('sr-card');
    if (card) card.inert = collapsed;
  }

  // --------------------------------------------------------------------------- the actions

  function togglePause() {
    const phase = trip.state.phase;
    if (phase === 'paused') onResume();
    else trip.pause('control');
  }

  function onResume() {
    userJumped = true;
    trip.resume();
  }

  // A video player's seek, not a fifth half-finished sweep from wherever the camera happens to
  // be: ui/trip.js collapses the running flight onto its end state and then starts the next.
  function onNext() {
    userJumped = true;
    trip.next();
  }

  function onBack() {
    userJumped = true;
    trip.back();
  }

  function onReplay() {
    userJumped = true;
    trip.replay();
  }

  function leave() {
    trip.stop('left');
  }

  // --------------------------------------------------------------------------- the keyboard

  function typingIn(node) {
    if (!node) return false;
    const tag = node.tagName;
    return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
  }

  /**
   * ESCAPE IS REGISTERED IN THE CAPTURE PHASE AND STOPS PROPAGATION.
   *
   * ui/cards.js registers a bubble-phase document keydown at MODULE IMPORT TIME -- before any UI
   * module is constructed -- and on Escape it calls hideCard() and nothing else: the selection
   * stays set, the glyph stays lit and `follow` stays installed. A trip module imported later
   * registers later, so in the bubble phase it would run after the card had already gone. The
   * capture phase is the only place the two can be ordered, and stopPropagation is what makes
   * Escape mean one thing while a trip is running.
   */
  function onKey(e) {
    const st = trip.state;
    if (st.phase === 'idle') return;
    const ae = document.activeElement;
    const typing = typingIn(ae);

    if (e.key === 'Escape') {
      // Escape inside a text field belongs to that field: ui/search.js preventDefaults it but
      // does not stop it propagating, so without this guard clearing a search would end a trip.
      if (typing) return;
      e.stopPropagation();
      e.preventDefault();
      leave();
      return;
    }
    if (typing) return;
    const running = st.phase !== 'intro' && st.phase !== 'outro' && st.phase !== 'resolving';

    if (e.key === 'ArrowRight' && running) {
      e.preventDefault();
      onNext();
    } else if (e.key === 'ArrowLeft' && running) {
      e.preventDefault();
      onBack();
    } else if ((e.key === ' ' || e.key === 'Spacebar') && running) {
      // Space activates a focused button, and every control in this frame is one. Do not steal
      // it from a button the visitor has deliberately tabbed to.
      if (ae && ae.tagName === 'BUTTON') return;
      e.preventDefault();
      togglePause();
    } else if ((e.key === 'c' || e.key === 'C') && running) {
      setCollapsed(!collapsed);
    } else if ((e.key === 'r' || e.key === 'R') && running) {
      onReplay();
    }
  }

  // A tap on a different object is the most likely accidental exit in the product, and it is also
  // the moment a beginner found the thing they actually wanted. So it PAUSES and selects -- and
  // Resume flies back to the stop it left. The trip's own select of the stop's own record is not
  // that, which is what currentRecordId() is for.
  function onSelect(e) {
    const st = trip.state;
    if (st.phase === 'idle' || st.phase === 'intro' || st.phase === 'outro') return;
    const record = e && e.detail;
    if (!record) return;
    if (record.id && record.id === trip.currentRecordId()) return;
    trip.pause('input');
  }

  // ---------------------------------------------------------------------------- the panel

  function renderIntro(st) {
    const p = parts.panel;
    p.textContent = '';
    p.appendChild(el('h2', 'sr-trip__paneltitle', st.tourTitle));
    p.appendChild(el('p', 'sr-trip__panelshape', shapeLine(st.count, st.estimateMs)));
    const dropped = (st.dropped || []).length;
    // The count above is the resolved one, so anything missing is said out loud rather than
    // quietly subtracted. A shorter trip is fine; a shorter trip nobody mentioned is not.
    if (dropped === 1) p.appendChild(el('p', 'sr-trip__panelnote', COPY.trip.droppedOne));
    else if (dropped > 1) p.appendChild(el('p', 'sr-trip__panelnote', t(COPY.trip.droppedMany, { n: dropped })));
    if (st.clockClamped) p.appendChild(el('p', 'sr-trip__panelnote', COPY.trip.clockClamped));
    const row = el('div', 'sr-trip__panelrow');
    const start = button('sr-trip__btn sr-trip__btn--ember', COPY.trip.introStart, COPY.trip.startTitle, () =>
      trip.play(),
    );
    row.appendChild(start);
    row.appendChild(button('sr-trip__btn', COPY.trip.introSkip, null, leave));
    p.appendChild(row);
    p.hidden = false;
    start.focus();
  }

  function renderOutro(st) {
    const p = parts.panel;
    p.textContent = '';
    p.appendChild(el('h2', 'sr-trip__paneltitle', COPY.trip.endTitle));
    p.appendChild(el('p', 'sr-trip__panelnote', COPY.trip.endBody));
    const row = el('div', 'sr-trip__panelrow');
    const explore = button('sr-trip__btn sr-trip__btn--ember', COPY.trip.endExplore, COPY.trip.endExploreTitle, leave);
    row.appendChild(explore);
    row.appendChild(button('sr-trip__btn', COPY.trip.endReplay, null, () => trip.start(st.tourId)));
    // ONE named next trip, never a picker: a menu at the end of a trip is a decision nobody asked
    // for, and the name is the whole invitation.
    const all = trip.tours();
    const here = all.findIndex((tour) => tour.id === st.tourId);
    const nextTour = all.length > 1 ? all[(here + 1) % all.length] : null;
    if (nextTour) {
      row.appendChild(
        button('sr-trip__btn', t(COPY.trip.endNext, { title: nextTour.title }), null, () =>
          trip.start(nextTour.id),
        ),
      );
    }
    p.appendChild(row);
    p.hidden = false;
    explore.focus();
  }

  // ---------------------------------------------------------------------------- the render

  function render(st) {
    if (st.phase === 'idle') {
      teardown();
      return;
    }
    if (st.phase === 'resolving') return;
    if (!host) setup(st);
    if (!parts) return;

    document.documentElement.setAttribute(PHASE_ATTR, st.phase);
    host.setAttribute('aria-label', st.tourTitle || '');
    parts.title.textContent = st.tourTitle || '';

    const showPanel = st.phase === 'intro' || st.phase === 'outro';
    parts.controls.hidden = showPanel;
    parts.progress.hidden = showPanel || st.phase === 'paused';
    parts.chip.hidden = st.phase !== 'paused';
    if (showPanel) {
      if (parts.panel.hidden || parts.panel.dataset.phase !== st.phase) {
        parts.panel.dataset.phase = st.phase;
        if (st.phase === 'intro') renderIntro(st);
        else renderOutro(st);
      }
      return;
    }
    parts.panel.hidden = true;
    parts.panel.dataset.phase = '';

    // Segments: one per stop, position always, and a fill only where something is counting down.
    if (parts.segs.childElementCount !== st.count) {
      parts.segs.textContent = '';
      for (let i = 0; i < st.count; i += 1) parts.segs.appendChild(el('li', 'sr-trip__seg'));
    }
    for (let i = 0; i < parts.segs.children.length; i += 1) {
      const seg = parts.segs.children[i];
      seg.classList.toggle('is-done', i < st.index);
      seg.classList.toggle('is-here', i === st.index);
      if (i !== st.index) seg.style.removeProperty('--sr-fill');
    }

    const n = st.index + 1;
    parts.count.textContent = t(COPY.trip.stopOf, { n, count: st.count });
    parts.pause.textContent = st.phase === 'paused' ? COPY.trip.play : COPY.trip.pause;
    parts.pause.title = st.phase === 'paused' ? COPY.trip.playTitle : COPY.trip.pauseTitle;
    parts.pause.setAttribute('aria-pressed', st.phase === 'paused' ? 'true' : 'false');
    parts.back.disabled = st.index <= 0;

    const stopTitle = st.held ? COPY.trip.heldTitle : st.stopTitle || '';
    parts.group.setAttribute('aria-label', t(COPY.trip.liveLabel, { n, count: st.count, title: stopTitle }));
    parts.heading.textContent = stopTitle;

    // The APG rule, exactly: `off` while auto-advance is running, `polite` when it is not.
    const auto = st.pacing === 'auto' && st.phase !== 'paused';
    parts.live.setAttribute('aria-live', auto ? 'off' : 'polite');
    parts.status.textContent = auto ? stopTitle : '';

    if (st.index !== lastIndex) {
      lastIndex = st.index;
      document.title = t(COPY.trip.docTitle, { title: st.tourTitle, n, count: st.count });
      if (userJumped) parts.heading.focus();
    }
    userJumped = false;
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!parts) return;
    const st = trip.state;
    if (st.phase !== 'dwell' || st.index < 0) return;
    const seg = parts.segs.children[st.index];
    if (!seg) return;
    const f = trip.dwellFraction();
    // Reader-paced stops have nothing counting down, so their segment shows position and no fill.
    seg.style.setProperty('--sr-fill', f === null ? '0' : String(f));
  }

  // ------------------------------------------------------------------------ setup/teardown

  function setup(st) {
    build();
    savedDocTitle = document.title;
    tourId = st.tourId;
    const active = document.activeElement;
    savedFocus = active && active !== document.body ? active : null;
    if (ctx.mobile && ctx.mobile.close) ctx.mobile.close();
    setChromeHidden(true);
    setCollapsed(false);
    lastIndex = -1;
    // The cross-fade the rig has emitted since it was written, finally consumed. Subscribed only
    // for the life of a trip, so an ordinary reduced-motion flight outside one does not flash.
    if (rig && rig.onFade) offFade = rig.onFade((ms) => flash(ms));
    if (!raf) raf = requestAnimationFrame(loop);
    // No render() here on purpose: the only caller is render() itself, and painting from inside
    // setup would paint the same state twice.
  }

  function teardown() {
    if (!host) return;
    if (offFade) {
      offFade();
      offFade = null;
    }
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    setCollapsed(false);
    setChromeHidden(false);
    document.documentElement.removeAttribute(PHASE_ATTR);
    if (savedDocTitle !== null) document.title = savedDocTitle;
    savedDocTitle = null;
    destroy();
    lastIndex = -1;
    // Focus goes back to the row the trip was started from -- not to <body>, which is where a
    // keyboard visitor would otherwise have to start again from the top of the document.
    //
    // The saved element is the first choice and the row is the fallback, because a trip can be
    // started by something that never took focus at all: a programmatic click, the console, or
    // whatever entry point arrives next. Measured: a click dispatched from JS leaves
    // document.activeElement on <body>, and focus went nowhere.
    let back = savedFocus && savedFocus.isConnected ? savedFocus : null;
    savedFocus = null;
    if (!back && tourId) back = document.querySelector(`#sr-controls [data-trip="${tourId}"]`);
    if (back && typeof back.focus === 'function') back.focus();
    tourId = null;
  }

  /** Cover the canvas instantly, then fade off over the rig's own `ms`. A cut with a fade over it
   * is the whole of "reduced motion" here; the card underneath never moves and never fades. */
  function flash(ms) {
    if (!parts) return;
    const node = parts.fade;
    const dur = Math.max(0, Number(ms) || 0);
    node.style.transition = 'none';
    node.classList.add('is-on');
    void node.offsetWidth; // commit the cover before the fade is armed
    node.style.transition = `opacity ${dur}ms linear`;
    node.classList.remove('is-on');
  }

  const offChange = trip.onChange(render);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('sr:select', onSelect);

  function dispose() {
    offChange();
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('sr:select', onSelect);
    teardown();
  }

  return { dispose };
}
