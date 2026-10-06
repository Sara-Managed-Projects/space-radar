// ui/tripframe.js -- what a visitor sees of a guided trip.
//
// Contract export: createTripFrame(ctx) -> { dispose() }
//                  shapeLine(count, estimateMs) -> "4 stops · 2 min", pure
//                  keyAction(event, state, active) -> what a key does in a trip, pure (spec 0061 task 7)
//                  progressText(state) -> "2 / 4", pure
//                  stopTimeLine(state, clock) -> the "Shown at" line, pure (spec 0030)
//                  eclipseLine(state, drawn) -> the eclipse stops' honesty line, pure (spec 0037)
//                  orbitsLine(state, stageId) -> "drawn larger than they are", pure (2026-09-23)
//
// ui/trip.js flies the camera. This is what a visitor sees of it: the intro sheet, the stop card's
// place, ONE toolbar of icon buttons with the progress inside it, a thin top bar with the trip's
// title and Leave, the end card, the keyboard, and the announcement a screen reader gets instead of
// the picture. It reads the machine through `state` and `onChange(fn)` and drives it through the
// same methods a console can call, so the trip can be measured in a browser with none of this on
// screen -- which is how it was.
//
// ---------------------------------------------------------------------------------------------
// WHY IT LOOKS LIKE THIS (spec 0061 task 7, docs/ui-guide.md). Ivan, 2026-10-01, with screenshots
// of the live trip: "you did great redesign but not everywhere". The trip was the old design whole:
// two black letterbox bars, a row of seven text buttons across the bottom one, a prose card
// floating in the middle of the scene with a second header row under its text, and a centred
// intro card over the globe. Now it speaks the shell's language:
//
//   THE SHEET. The intro, each stop and the end live where the card lives. On a desktop that is
//   the sidebar, which stays up during a trip and shows its `trip` view (ui/shell.js); on a phone
//   it is a sheet at the foot of the screen. The stop card is the object card's anatomy
//   (ui/cards.js renderStop): "STOP 2 OF 4", the stop's title, the subject's three numbers, the
//   stop's words as one paragraph, the honesty line.
//   THE TOOLBAR. One glass bar at the foot of the scene, the time pill's place (the pill goes:
//   a trip sets the clock per stop, and two clock controls would be two answers to "when is this").
//   Icon buttons from the one family with their names as tooltips that say the key; the counter
//   "2 / 4" and its segments in the middle, between previous and next.
//   THE TOP BAR. The trip's title (its chapter above it) and Leave. Nothing else.
//
// The scene keeps the whole window: nothing here is a bar across it any more, and the subject is
// kept in the part nobody covers by scene/viewshift.js (the sidebar on a desktop, the sheet and the
// toolbar on a phone).
//
// ---------------------------------------------------------------------------------------------
// THE CONTROL SET, AND WHY EACH ONE IS HERE (nothing below is taste).
//
//   Play/Pause  We default to `pacing: auto`, so card content auto-updates. WCAG 2.2.2 makes a
//               pause control mandatory for that and the WAI-ARIA carousel pattern requires it
//               FIRST IN TAB ORDER -- which is why it is the toolbar's first button, and why the
//               toolbar is first in this frame's DOM. Paused, it is the one ember button on the
//               screen: the thing to press.
//   Previous    NASA's Eyes gives back equal visual weight to next: a chevron pair, not a next
//   Next        button with an escape hatch (measured in that product, 2026-09-07). The pair sits
//               either side of the counter, so "where am I" and "go on" are one glance.
//   Progress    Google Earth's KML player -- the oldest and by far the most used tour player in
//               this genre -- ships a counter AND a slider. Eyes ships no progress indicator of any
//               kind, which is its clearest gap. Text AND segments: dots alone are unreadable to a
//               screen reader and illegible past about eight.
//   Replay      Eyes ships per-stop REPLAY ANIMATION and it is the right answer to "I looked
//               away". Free here: it is jump(current index).
//   Share       Spec 0033 (2026-09-23): a trip is the thing most worth sending to somebody, and
//               the stop you are looking at is the link (ui/share.js).
//   Hide card   The 3D scene is the product and the card covers it. Eyes ships this as "Expand
//               story panel". Bound to `c`.
//   Sound       Spec 0035: sound is off until chosen on the intro, and a visitor who chose it must
//               be able to take it back without leaving the trip.
//   Voice       Spec 0069: with sound on, each stop is read aloud once the camera has arrived (a
//               synthetic voice, and its tooltip says so). Its own toggle, inside Sound, because
//               music with the words left on the card is a way to watch too (internal #309).
//               Pressed with sound off it turns both on: a control that did nothing until another
//               was found would be a puzzle.
//   Leave       Always visible while a stop is up, never behind a menu -- see GETTING OUT below.
//
// NOT SHIPPED, and why: a SCRUBBER (a KML tour is a continuous timeline; ours is a chain of
// discrete shots, and a scrubber over discrete stops is a worse dot strip) and a LOOP (nothing here
// is attract mode; it arrives with a registry field the day somebody builds a kiosk).
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
// onUserInput hook pauses, and the toolbar's play button turns ember. And you are never captive,
// because the camera is never disabled and Escape never argues. Eyes falls into trap B: during a
// story its camera input is inert and Escape does nothing (measured). WorldWide Telescope resolves
// it the way this does.
//
// WHAT LEAVING LEAVES BEHIND: the camera exactly where it is -- no return flight, because
// returning home throws away what the trip just spent two minutes earning and is a fourth
// unrequested camera move after the visitor stopped asking for camera moves. ui/trip.js restores
// the layers it flipped and the clock it clamped, and re-selects the current object so the card
// becomes the ordinary object card. This file gives back the rail, the pill and the phone's bar,
// the document title, and the focus to the trip card the trip was started from.
//
// ---------------------------------------------------------------------------------------------
// REDUCED MOTION IS A CUT, NEVER A SHORTER MOVE. Compressing a four-second sweep into one raises
// the angular velocity fourfold, and a vestibular trigger scales with the RATE of large-field
// motion rather than its duration -- so the obvious kindness makes it worse. scene/camera.js
// already cuts and cross-fades; ui/trip.js already forces reader pacing and leaves the dwell
// alone. What is here: nothing slides, the card does not rise (css/ui.css turns every chrome
// transition into a 120 ms fade), and the 220 ms cross-fade the rig emits has a consumer -- over
// the CANVAS and never over the card, or the scene appears to teleport under stationary text.
// Since spec 0034 that black is ui/veil.js's, the same node a stage change goes through, and the
// chapter line above the title appears rather than rises.

import { COPY, t, fmt, formatRate, formatShownAt } from '../copy/en.js';
import '../copy/en.later.js';
import { nextTripOrder } from './trippicker.js';
import { read as readUrl, write as writeUrl } from './urlstate.js';
import { openShare } from './share.js';
import { icon } from './cards.js';
import { tripPicture } from './trippics.js';
// Spec 0069. Static imports, and still not on the first visit: this whole module is imported when
// the first trip starts (main.js), and these come with it.
import { createNarration, clipKey } from '../audio/narration.js';
import { NARRATION } from '../data/narration.js';
import { paintCue } from './voicecue.js';
import { shouldSaveData } from '../scene/quality.js';
import { overlayLine, legendNode, paintLegend } from './overlaylegend.js';

const HOST_ID = 'sr-trip';
// NOT 'sr-trip'. The host div carries `.sr-trip`, and `.sr-trip` in ui.css sets
// `position: fixed; inset: 0; pointer-events: none` so the scene under the frame stays
// draggable. Putting the same class on <html> gave the ROOT those declarations, so nothing on
// the page was hit-testable: measured in Chrome, a real wheel over the canvas landed on
// HTML.sr-trip, the rig distance did not move, the trip did not pause, and two thirds of every
// stop's card (scrollHeight 708 against clientHeight 301) could not be scrolled or clicked.
// Both of the traps the frame was designed to avoid -- a locked camera and a captive visitor --
// were live because one class did two jobs.
const MODE_CLASS = 'sr-trip-mode';
const COLLAPSED_CLASS = 'sr-trip-collapsed';
const PRESENT_CLASS = 'sr-present';
const PHASE_ATTR = 'data-trip-phase';
const NAMES_ATTR = 'data-trip-names';

// Everything a trip takes away. ADDING A PIECE OF CHROME IS A ROW HERE -- a control left sitting in
// a corner of a full-screen flight is exactly the kind of thing that gets noticed only in a
// screenshot. `inert` and not merely `opacity: 0` -- see setChromeHidden(). Since spec 0061 task 7
// the sidebar is NOT in the list: it is the trip's own view (ui/shell.js), the sidebar on a desktop
// and the sheet on a phone (task 3). The phone's top bar is: its search and tools are the rail's.
const CHROME = ['sr-rail', 'sr-time', 'sr-top'];
const SIDE_ID = 'sr-side';
// The line between the phone's sheet and the desktop's sidebar, as ui/shell.js draws it, for a frame
// built without a shell (the tests).
const PHONE_QUERY = '(max-width: 899px)';

const MINUTE_MS = 60000;
// Phases in which a stop is up: the toolbar and the top bar show, and the keys step.
const AT_PANEL = ['intro', 'outro'];

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined && text !== null && text !== '') node.textContent = String(text);
  return node;
}

/** An icon button of the toolbar: a name for a screen reader, a tooltip that says the key. */
function iconButton(className, iconName, label, title, onClick) {
  const b = el('button', className);
  b.type = 'button';
  b.setAttribute('aria-label', label);
  b.title = title;
  b.appendChild(icon(iconName));
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/** Swap a button's glyph, keeping the node (and the focus on it). */
function setIcon(b, iconName) {
  const old = b.querySelector ? b.querySelector('svg') : null;
  if (old && old.getAttribute && old.getAttribute('class') === `sr-icon sr-icon--${iconName}`) return;
  if (old) old.remove();
  b.insertBefore ? b.insertBefore(icon(iconName), b.firstChild) : b.appendChild(icon(iconName));
}

function textButton(className, text, title, onClick) {
  const b = el('button', className, text);
  b.type = 'button';
  if (title) b.title = title;
  if (onClick) b.addEventListener('click', onClick);
  return b;
}

/**
 * "5 stops · 2 min" -- and never before the stops have been resolved.
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

/**
 * THE "SHOWN AT" LINE (spec 0030 requirement 5), built from the clock and never from the registry:
 * the numbers are ctx.clock's, so the line cannot disagree with what is drawn. Empty until a stop
 * has taken the clock (`clockOwned`); after that, until leave, it says when the picture is and how
 * fast it is running. Exported so tests/test_stop_time.mjs can read it without a DOM.
 */
export function stopTimeLine(st, clock) {
  if (!st || !st.clockOwned || !clock) return '';
  if (clock.mode === 'live') return COPY.trip.stopTimeNow;
  const rate = Number(clock.rate) || 1;
  const when = formatShownAt(clock.now(), rate);
  if (clock.paused && st.phase === 'paused') return t(COPY.trip.stopTimePaused, { when });
  if (clock.paused || rate === 1) return t(COPY.trip.stopTimeAt, { when });
  return t(COPY.trip.stopTimeRate, { when, rate: formatRate(rate) });
}

/**
 * THE ECLIPSE LINE (spec 0037 requirements 7 and 8), generated and never typed in the registry: on
 * any stop whose instant comes from an eclipse (`state.stopEventType`), what the shadow is made of
 * and how good the timing is -- or, when the frame latch has turned the shader off
 * (ctx.eclipseDrawn() false), that the shadow is not drawn here and the timing still stands. A
 * lunar stop adds that the copper is an illustration. Exported so a test can read it without a DOM.
 */
export function eclipseLine(st, drawn) {
  const type = st && st.stopEventType;
  if (type !== 'solar-eclipse' && type !== 'lunar-eclipse') return '';
  const line = drawn ? COPY.trip.eclipseLine : COPY.trip.eclipseLineLatched;
  return type === 'lunar-eclipse' && drawn ? `${line} ${COPY.trip.eclipseColour}` : line;
}

/**
 * THE ORBITS LINE (2026-09-23): on every stop of a trip that draws the planets' paths and dots on
 * the Sun stage (`orbits:`, scene/orbitrings.js), that the dots are drawn larger than the planets
 * are and the places and paths are computed. Generated, like the eclipse line, so no card can
 * forget it; the house rule is that size may be exaggerated only where the picture says so.
 * Empty off the Sun stage, where nothing is drawn by orbitrings.js. Exported for the test.
 */
export function orbitsLine(st, stageId) {
  if (!st || !Array.isArray(st.orbits) || !st.orbits.length || stageId !== 'sun') return '';
  return COPY.trip.orbitsLine;
}

/**
 * THE FIGURES LINE (2026-10-05): on a stop that draws constellation figures (`figures:`,
 * scene/figures3d.js), that the figures are a convention drawn by us and what the stars under
 * them are -- the sky as seen from Earth, or their measured places when the stop shows the depth
 * -- and what the dashed line is when the ecliptic is drawn. Generated, like the two above.
 */
export function figuresLine(st) {
  const sky = st && st.sky;
  if (!sky || (!(sky.figures || []).length && !sky.ecliptic)) return '';
  const parts = [];
  if ((sky.figures || []).length) parts.push(sky.depth ? COPY.figures.line : COPY.figures.lineSky);
  if (sky.ecliptic) parts.push(COPY.figures.ecliptic);
  return parts.join(' ');
}

/** The counter in the toolbar, "2 / 4": mono, short, and read out as "stop 2 of 4" beside it. */
export function progressText(st) {
  if (!st || !(st.count > 0) || !(st.index >= 0)) return '';
  return t(COPY.trip.progressShort, { n: st.index + 1, count: st.count });
}

function typingIn(node) {
  if (!node) return false;
  const tag = node.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || node.isContentEditable === true;
}

/**
 * What a key does during a trip, or null for "not ours". Pure, so tests/test_tripframe.mjs can hold
 * the whole keyboard without a browser: Escape leaves (but not out of a text field, where it
 * belongs to the field); ←/→ step; Space plays and pauses (but not on a focused button, which Space
 * presses); C hides the card; R replays. Only Escape works on the intro and the end card, where
 * nothing is running; and nothing with a modifier, which is the browser's.
 */
export function keyAction(e, st, active, present = false) {
  if (!e || !st || st.phase === 'idle') return null;
  if (e.metaKey || e.ctrlKey || e.altKey) return null;
  const typing = typingIn(active);
  if (e.key === 'Escape') return typing ? null : 'leave';
  if (typing) return null;
  const onButton = !!(active && active.tagName === 'BUTTON');
  const space = e.key === ' ' || e.key === 'Spacebar';
  // PRESENT MODE (public #441): a presenter's clicker sends Page Down and Page Up, and some send
  // the arrows or Space. On the intro any "forward" key starts the show; F is the full screen and
  // A hands the pacing to the trip's own clock and back.
  if (present) {
    if (e.key === 'f' || e.key === 'F') return 'fullscreen';
    if (e.key === 'a' || e.key === 'A') return 'auto';
    if (st.phase === 'intro' && (e.key === 'PageDown' || e.key === 'ArrowRight' || (space && !onButton))) return 'start';
  }
  const running = !AT_PANEL.includes(st.phase) && st.phase !== 'resolving';
  if (!running) return null;
  if (e.key === 'ArrowRight' || e.key === 'PageDown') return 'next';
  if (e.key === 'ArrowLeft' || e.key === 'PageUp') return 'back';
  // Space pauses a trip that plays itself; in front of a room it is the clicker's "next", and P pauses.
  if (present && space) return onButton ? null : 'next';
  if (present && (e.key === 'p' || e.key === 'P')) return 'toggle';
  if (space) return onButton ? null : 'toggle';
  if (e.key === 'c' || e.key === 'C') return 'collapse';
  if (e.key === 'r' || e.key === 'R') return 'replay';
  // Internal #329: the two sound toggles had no key. M as every player has it; V for the voice.
  if (e.key === 'm' || e.key === 'M') return 'sound';
  if (e.key === 'v' || e.key === 'V') return 'voice';
  return null;
}

export function createTripFrame(ctx) {
  const trip = ctx && ctx.trip;
  if (!trip) return { dispose() {} };
  const rig = ctx.cameraRig;
  const root = document.documentElement;

  let host = null;
  let parts = null;
  let collapsed = false;
  let savedDocTitle = null;
  let savedFocus = null;
  let tourId = null;
  let offFade = null;
  let offSound = null;
  let raf = 0;
  // Set by Next/Back/Replay and by the arrow keys, cleared by the render that consumes it. Focus
  // moves to the stop heading on a jump the VISITOR asked for, and never on an auto-advance:
  // stealing focus mid-sentence interrupts a screen reader and yanks the arrow keys away.
  let userJumped = false;
  // Bumped whenever an end card is rendered, so a plan() that resolves late cannot append a
  // card to a panel that has been rebuilt or torn down since it was asked.
  let outroToken = 0;
  let lastIndex = -1;
  // PRESENT MODE (public #441, 2026-10-06): one trip for a room. `#trip=<id>&present=1` is the
  // whole setup, and the intro has a Present button. The sidebar goes; the stop's words sit in a
  // panel at the foot of the scene in type a back row can read; the presenter paces it (every stop
  // waits for Next) unless `present=auto` or A hands that back to the trip.
  let present = false;
  let presentAuto = false;
  // Present mode carried from a trip to the one its end card started (the teardown between them
  // would otherwise drop it): { auto } or null.
  let carried = null;

  // THE VOICE (spec 0069, audio/narration.js). One for the page, kept on the engine so main.js can
  // ask it whether a stop will be read (the arrival chime stands down for the voice). It holds a
  // stop until its clip has finished through ui/trip.js holdDwell, and on a connection that saves
  // data or the low tier it fetches each clip when its stop arrives, never ahead.
  const voice = !ctx.audio ? null : ctx.audio.narration || (ctx.audio.narration = createNarration(ctx.audio, ctx.audio.beds, NARRATION, {
    hold: (ms) => (typeof trip.holdDwell === 'function' ? trip.holdDwell(ms) : false),
    lean: () => (ctx.quality && ctx.quality.tier === 0)
      || (typeof navigator !== 'undefined' && shouldSaveData(navigator.connection)),
  }));

  /** The clip of the stop after the one that is up, to fetch while this one is read. */
  function nextKey(st) {
    const s = st && Array.isArray(st.stops) ? st.stops[st.index + 1] : null;
    return s ? clipKey(st.tourId, s.id) : '';
  }

  function isPhone() {
    if (ctx.shell && typeof ctx.shell.isPhone === 'function') return ctx.shell.isPhone();
    return typeof matchMedia === 'function' ? matchMedia(PHONE_QUERY).matches : false;
  }

  // ------------------------------------------------------------------------------------ DOM

  function build() {
    if (host) return;
    host = el('div', 'sr-trip');
    host.id = HOST_ID;
    host.setAttribute('role', 'region');
    host.setAttribute('aria-roledescription', COPY.trip.frameLabel);
    const T = COPY.trip;

    // THE TOOLBAR, FIRST IN THE DOM: the APG puts the pause control first in the tab order, and
    // a positive tabindex is a worse bug than the one it would fix. A `group` with a name and not
    // a `toolbar`: the toolbar role promises arrow keys inside it, and here ←/→ are the stops.
    const toolbar = el('div', 'sr-trip__toolbar sr-float');
    toolbar.setAttribute('role', 'group');
    toolbar.setAttribute('aria-label', T.controlsLabel);
    const pause = iconButton('sr-trip__tb sr-trip__tb--play', 'pause', T.pause, T.pauseTitle, togglePause);
    const back = iconButton('sr-trip__tb', 'chevron-left', T.back, T.backTitle, onBack);
    const next = iconButton('sr-trip__tb', 'chevron', T.next, T.nextTitle, onNext);
    const progress = el('div', 'sr-trip__progress');
    progress.setAttribute('role', 'group');
    progress.setAttribute('aria-label', T.progressLabel);
    const count = el('span', 'sr-trip__count');
    count.setAttribute('aria-hidden', 'true'); // "2 / 4" is for the eye; the next line is for a reader
    const countText = el('span', 'sr-trip__live');
    const segs = el('ul', 'sr-trip__segs');
    segs.setAttribute('aria-hidden', 'true');
    progress.appendChild(count);
    progress.appendChild(countText);
    progress.appendChild(segs);
    const replay = iconButton('sr-trip__tb sr-trip__tb--replay', 'rotate-ccw', T.replay, T.replayTitle, onReplay);
    // Share (spec 0033): the link to this stop, or to the trip's own page at stop 1 (onShare).
    const share = iconButton('sr-trip__tb sr-trip__tb--share', 'share', T.share, T.shareTitle, () => onShare(true));
    const collapse = iconButton('sr-trip__tb sr-trip__tb--hide', 'panel-left-close', T.collapse, T.collapseTitle, () =>
      setCollapsed(!collapsed),
    );
    collapse.setAttribute('aria-pressed', 'false');
    const sound = iconButton('sr-trip__tb sr-trip__tb--sound', 'volume-x', T.soundOn, T.soundOffTitle, toggleSound);
    const voiceBtn = iconButton('sr-trip__tb sr-trip__tb--voice sr-trip__voicetoggle', 'speech', T.voice, T.voiceOffTitle, toggleVoice);
    const sep = el('span', 'sr-trip__sep');
    sep.setAttribute('aria-hidden', 'true');
    // Present mode's three: into and out of it, by itself or by the clicker, and the full screen.
    const presentBtn = iconButton('sr-trip__tb sr-trip__tb--present', 'presentation', T.present, T.presentTitle, () => setPresent(!present));
    presentBtn.setAttribute('aria-pressed', 'false');
    const autoBtn = iconButton('sr-trip__tb sr-trip__tb--auto', 'timer', T.presentAuto, T.presentAutoOffTitle, () => setPresent(true, !presentAuto));
    autoBtn.setAttribute('aria-pressed', 'false');
    const fullBtn = iconButton('sr-trip__tb sr-trip__tb--full', 'maximize', T.fullScreen, T.fullScreenTitle, toggleFullScreen);
    fullBtn.setAttribute('aria-pressed', 'false');
    for (const n of [pause, back, progress, next, sep, replay, share, collapse, sound, voiceBtn, autoBtn, fullBtn, presentBtn]) toolbar.appendChild(n);

    // What a screen reader is told. The CARD is the accessible representation of a stop -- we do
    // not describe a live 3D scene, because that would be asserting a description of pixels
    // nobody verified, which is the exact failure the honesty rule exists to prevent. So this
    // region carries the stop's position and title only, and the body stays in the card where it
    // is read once.
    const live = el('div', 'sr-trip__live');
    const group = el('div', null);
    group.setAttribute('role', 'group');
    group.setAttribute('aria-roledescription', T.stopRole);
    const heading = el('h2', 'sr-trip__stopname');
    heading.tabIndex = -1;
    group.appendChild(heading);
    live.appendChild(group);
    // aria-live on a region that changes every twelve seconds floods a reader, so in `auto` the
    // region is silent and the TITLE ALONE is announced through this status. Title in status,
    // body in the document -- exactly as the APG states it.
    const status = el('div', 'sr-trip__live');
    status.setAttribute('role', 'status');

    // THE TOP BAR: the trip's title, its chapter above it (spec 0034 req 3), and Leave.
    const top = el('header', 'sr-trip__top sr-float');
    const titles = el('div', 'sr-trip__titles');
    // Not a live region: the stop title in the status is what a screen reader is told, and a
    // chapter is not news.
    const chapter = el('p', 'sr-trip__chapter');
    chapter.hidden = true;
    const title = el('h1', 'sr-trip__title');
    titles.appendChild(chapter);
    titles.appendChild(title);
    top.appendChild(titles);
    const topLeave = el('button', 'sr-trip__leave');
    topLeave.type = 'button';
    topLeave.title = T.leaveTitle;
    topLeave.appendChild(icon('x', 16));
    topLeave.appendChild(el('span', null, T.leave));
    topLeave.addEventListener('click', leave);
    top.appendChild(topLeave);

    // THE SHEET: the intro, the stop card's slot, the end. Seated in the sidebar's trip view on a
    // desktop and in this frame on a phone (seat()).
    const sheet = el('section', 'sr-tripsheet');
    const panel = el('div', 'sr-tripsheet__panel');
    panel.hidden = true;
    const cardSlot = el('div', 'sr-tripsheet__card');
    sheet.appendChild(panel);
    sheet.appendChild(cardSlot);

    host.appendChild(toolbar);
    host.appendChild(live);
    host.appendChild(status);
    host.appendChild(top);
    document.body.appendChild(host);

    parts = {
      toolbar, pause, back, next, replay, share, collapse, sound, voice: voiceBtn, progress, count, countText, segs,
      presentBtn, autoBtn, fullBtn,
      live, group, heading, status, top, title, chapter, sheet, panel, cardSlot, leaveButtons: [topLeave],
    };
    paintSound();
  }

  function destroy() {
    if (!host) return;
    if (parts && parts.sheet) parts.sheet.remove();
    host.remove();
    host = null;
    parts = null;
  }

  /**
   * Put the sheet where the card lives: the sidebar's trip view, which is the sidebar on a desktop
   * and the one bottom sheet on a phone (spec 0061 task 3: one sheet, not a second one for trips).
   * Without a shell (the tests, an embed) it floats in this frame and wears the glass. The card
   * goes into its slot through the shell, which owns where the card sits.
   */
  function seat() {
    if (!parts) return;
    const shell = ctx.shell;
    // In present mode the sheet leaves the sidebar for the frame: the sidebar is gone, and the
    // words are a caption panel over the scene (ui.css .sr-tripsheet.is-present).
    const sideHost = !present && shell && typeof shell.host === 'function' ? shell.host('trip') : null;
    const want = sideHost || host;
    if (parts.sheet.parentNode !== want) want.appendChild(parts.sheet);
    parts.sheet.classList.toggle('sr-float', want === host);
    parts.sheet.classList.toggle('is-floating', want === host && !present);
    parts.sheet.classList.toggle('is-present', want === host && present);
    if (shell && typeof shell.seatTrip === 'function') shell.seatTrip(parts.cardSlot);
    // The hide-card glyph says which way the card goes: off to the left, or down.
    paintCollapse();
  }

  // --------------------------------------------------------------------------- the chrome

  /**
   * `inert` and not only `opacity: 0`.
   *
   * THE BUG NOBODY SEES COMING: a panel hidden with opacity and pointer-events stays FULLY
   * FOCUSABLE. Tab walks into an invisible rail and the focus ring is off screen with no way to
   * tell where it went. `inert` removes the subtree from the tab order AND from the accessibility
   * tree in one property, which `aria-hidden` alone does not do.
   */
  function setChromeHidden(hidden) {
    for (const id of CHROME) {
      const node = document.getElementById(id);
      if (!node) continue;
      node.inert = hidden;
    }
    if (!hidden) {
      const side = document.getElementById(SIDE_ID);
      if (side) side.inert = false;
    }
    root.classList.toggle(MODE_CLASS, hidden);
  }

  function setCollapsed(on) {
    collapsed = !!on;
    root.classList.toggle(COLLAPSED_CLASS, collapsed);
    if (!parts) return;
    paintCollapse();
    // The card is folded away visually AND left out of the tab order, so the two agree.
    parts.sheet.inert = collapsed;
    const card = document.getElementById('sr-card');
    if (card) card.inert = collapsed;
  }

  function paintCollapse() {
    if (!parts) return;
    const T = COPY.trip;
    const phone = isPhone();
    setIcon(parts.collapse, collapsed ? (phone ? 'panel-bottom-open' : 'panel-left-open') : (phone ? 'panel-bottom-close' : 'panel-left-close'));
    parts.collapse.setAttribute('aria-label', collapsed ? T.expand : T.collapse);
    parts.collapse.title = collapsed ? T.expandTitle : T.collapseTitle;
    parts.collapse.setAttribute('aria-pressed', collapsed ? 'true' : 'false');
  }

  // ---------------------------------------------------------------------------- present mode

  /** `present=1` or `present=auto` in the link, read when a trip's frame goes up. */
  function presentFromUrl() {
    let v = null;
    try { v = readUrl().present; } catch { v = null; }
    return v === 'auto' ? { on: true, auto: true } : v ? { on: true, auto: false } : { on: false, auto: false };
  }

  /**
   * Into present mode, or out of it; `auto` is whether the trip advances by itself. The link says
   * which, so the address bar is what a teacher saves. Leaving present mode leaves the full screen
   * it asked for; a full screen the browser's own key made is the visitor's and is left alone.
   */
  function setPresent(on, auto) {
    present = !!on;
    presentAuto = present && !!auto;
    root.classList.toggle(PRESENT_CLASS, present);
    if (typeof trip.setPacing === 'function') trip.setPacing(present ? (presentAuto ? 'auto' : 'reader') : null);
    try { writeUrl({ present: present ? (presentAuto ? 'auto' : '1') : null }); } catch { /* no address bar: a test */ }
    if (!present && fullAsked) exitFullScreen();
    if (!parts) return;
    if (present && collapsed) setCollapsed(false);
    seat();
    paintPresent();
  }

  function paintPresent() {
    if (!parts) return;
    const T = COPY.trip;
    parts.presentBtn.setAttribute('aria-pressed', present ? 'true' : 'false');
    parts.presentBtn.title = present ? T.presentOffTitle : T.presentTitle;
    parts.autoBtn.hidden = !present;
    parts.autoBtn.setAttribute('aria-pressed', presentAuto ? 'true' : 'false');
    parts.autoBtn.title = presentAuto ? T.presentAutoOnTitle : T.presentAutoOffTitle;
    const full = isFullScreen();
    parts.fullBtn.hidden = !present || !canFullScreen();
    setIcon(parts.fullBtn, full ? 'minimize' : 'maximize');
    parts.fullBtn.setAttribute('aria-pressed', full ? 'true' : 'false');
    parts.fullBtn.title = full ? T.fullScreenOffTitle : T.fullScreenTitle;
    const introBtn = parts.panel.querySelector ? parts.panel.querySelector('.sr-tripsheet__present') : null;
    if (introBtn) {
      introBtn.setAttribute('aria-pressed', present ? 'true' : 'false');
      introBtn.title = present ? T.presentOffTitle : T.presentTitle;
    }
  }

  // The full screen is asked for, never taken: a browser grants it only inside a click or a key.
  let fullAsked = false;
  const canFullScreen = () => typeof root.requestFullscreen === 'function';
  const isFullScreen = () => typeof document !== 'undefined' && !!document.fullscreenElement;
  function exitFullScreen() {
    fullAsked = false;
    if (isFullScreen() && typeof document.exitFullscreen === 'function') {
      try { Promise.resolve(document.exitFullscreen()).catch(() => {}); } catch { /* already out */ }
    }
  }
  function toggleFullScreen() {
    if (isFullScreen()) { exitFullScreen(); return; }
    if (!canFullScreen()) return;
    fullAsked = true;
    try { Promise.resolve(root.requestFullscreen()).catch(() => { fullAsked = false; }); } catch { fullAsked = false; }
  }
  const onFullScreenChange = () => {
    if (!isFullScreen()) fullAsked = false;
    paintPresent();
  };

  // ------------------------------------------------------------------------------ the sound

  function soundOn() {
    return !!(ctx.audio && typeof ctx.audio.isOn === 'function' && ctx.audio.isOn());
  }

  function toggleSound() {
    if (ctx.audio && typeof ctx.audio.toggle === 'function') ctx.audio.toggle();
    paintSound();
  }

  /** Voice lives inside Sound: pressed with sound off, it turns both on (the click is the gesture). */
  function toggleVoice() {
    if (!voice) return;
    if (!soundOn()) {
      voice.setOn(true);
      ctx.audio.enable();
    } else {
      voice.toggle();
    }
    heard();
  }

  /** What the visitor wants to hear changed: repaint the toggles, and start or stop the voice. */
  function heard() {
    paintSound();
    if (voice) voice.refresh(trip.state, nextKey(trip.state));
  }

  /** Every sound toggle the frame has drawn (the toolbar's, the intro's) says the same thing. */
  function paintSound() {
    if (!parts) return;
    const on = soundOn();
    const T = COPY.trip;
    const nodes = [parts.sound, ...(parts.panel.querySelectorAll ? [...parts.panel.querySelectorAll('.sr-trip__soundtoggle')] : [])];
    for (const b of nodes) {
      if (!b) continue;
      setIcon(b, on ? 'volume-2' : 'volume-x');
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.title = on ? T.soundOnTitle : T.soundOffTitle;
      b.disabled = !ctx.audio;
    }
    // The voice is on only when sound is: one glance says what will be heard.
    const speaking = on && !!voice && voice.isOn();
    const voices = [parts.voice, ...(parts.panel.querySelectorAll ? [...parts.panel.querySelectorAll('.sr-trip__voicetoggle')] : [])];
    for (const b of voices) {
      if (!b) continue;
      b.setAttribute('aria-pressed', speaking ? 'true' : 'false');
      b.title = speaking ? T.voiceOnTitle : T.voiceOffTitle;
      b.disabled = !voice;
    }
    // The intro's promise, kept true: a trip that is read aloud runs as long as its clips.
    const meta = parts.panel.querySelector ? parts.panel.querySelector('.sr-tripsheet__meta') : null;
    const st = trip.state;
    if (meta && st.phase === 'intro') {
      meta.textContent = shapeLine(st.count, st.estimateMs + (voice ? voice.extraMs(st.tourId, st.stops) : 0));
    }
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

  /** "Keep flying" at the end of a trip that moved the map's centre: leave, and stay out there
   * (ui/trip.js stop, `stay`). The camera does not move and the map stays on the trip's world. */
  function stay() {
    trip.stop('stayed', { stay: true });
  }

  /** Start the trip from its intro: Start's own click, and the clicker's "forward" in present mode. */
  function startTrip(st) {
    userJumped = true;
    // A visitor who chose sound on an earlier visit hears it from Start: the click is the
    // gesture the stored choice was waiting for (audio/engine.js).
    if (ctx.audio && ctx.audio.isOn()) ctx.audio.enable();
    // The first stop's clip, asked for while the camera flies to it (and not on a lean connection).
    const first = (st.stops || [])[0];
    if (voice && first) voice.preload(clipKey(st.tourId, first.id));
    trip.play();
  }

  /**
   * Share the trip: spec 0061 task 8's one share sheet (ui/share.js openShare installs it if it is
   * not yet), with the trip and, at a stop, the stop's subject.
   */
  function onShare(atStop) {
    const st = trip.state;
    const id = atStop && typeof trip.currentRecordId === 'function' ? trip.currentRecordId() : null;
    const record = id && typeof ctx.recordById === 'function' ? ctx.recordById(id) : null;
    return openShare(ctx, { trip: st.tourId, record: record || null });
  }

  // --------------------------------------------------------------------------- the keyboard

  /**
   * ESCAPE IS REGISTERED IN THE CAPTURE PHASE AND STOPS PROPAGATION.
   *
   * ui/cards.js registers a bubble-phase document keydown at MODULE IMPORT TIME -- before any UI
   * module is constructed -- and on Escape it calls hideCard() and nothing else: the selection
   * stays set, the glyph stays lit and `follow` stays installed. A trip module imported later
   * registers later, so in the bubble phase it would run after the card had already gone. The
   * capture phase is the only place the two can be ordered, and stopPropagation is what makes
   * Escape mean one thing while a trip is running. (A clear screen takes Escape before this:
   * ui/cleanview.js, also capture, registered first.)
   */
  function onKey(e) {
    const what = keyAction(e, trip.state, document.activeElement, present);
    if (!what) return;
    if (what === 'start') { e.preventDefault(); startTrip(trip.state); return; }
    if (what === 'fullscreen') { e.preventDefault(); toggleFullScreen(); return; }
    if (what === 'auto') { e.preventDefault(); setPresent(true, !presentAuto); return; }
    if (what === 'leave') {
      e.stopPropagation();
      e.preventDefault();
      leave();
      return;
    }
    if (what === 'next') { e.preventDefault(); onNext(); }
    else if (what === 'back') { e.preventDefault(); onBack(); }
    else if (what === 'toggle') { e.preventDefault(); togglePause(); }
    else if (what === 'collapse') setCollapsed(!collapsed);
    else if (what === 'replay') onReplay();
    else if (what === 'sound') toggleSound();
    else if (what === 'voice') toggleVoice();
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

  // ---------------------------------------------------------------------------- the sheet

  function tourOf(id) {
    const list = typeof trip.tours === 'function' ? trip.tours() : [];
    return (list || []).find((x) => x && x.id === id) || null;
  }

  /**
   * Focus a control of the sheet once it is on screen. On a desktop the sheet is in the sidebar's
   * trip view, which the shell shows from an observer of <html>'s class (a microtask after the
   * render): a control in a view that is still hidden cannot take focus, and Start went nowhere.
   */
  function focusSoon(node) {
    node.focus();
    setTimeout(() => {
      if (node.isConnected && document.activeElement !== node) node.focus({ preventScroll: true });
    }, 0);
  }

  /** The head every sheet shares: a microlabel and the name (row D's card head). */
  function sheetHead(p, micro, name) {
    const head = el('header', 'sr-tripsheet__head');
    head.appendChild(el('p', 'sr-tripsheet__micro', micro));
    const h = el('h2', 'sr-tripsheet__name', name);
    h.id = 'sr-trip-sheet-title';
    h.tabIndex = -1;
    head.appendChild(h);
    p.appendChild(head);
    parts.sheet.setAttribute('aria-labelledby', h.id);
    return head;
  }

  /**
   * THE INTRO (spec 0061 task 7): the trip's name, its shape in mono, one line of what it is, the
   * one ember Start with sound as a toggle beside it, "Not now" as a quiet text button, and the
   * stops it will visit. The count is the RESOLVED one, so anything missing is said out loud
   * rather than quietly subtracted: a shorter trip is fine; a shorter trip nobody mentioned is not.
   */
  function renderIntro(st) {
    const p = parts.panel;
    const T = COPY.trip;
    p.textContent = '';
    p.dataset.kind = 'intro';
    // Spec 0068: the trip's picture as the sheet's header, the same file as its card, fading into
    // the glass under the microlabel and the name (ui.css .sr-tripsheet__pic).
    if (st.tourId) p.appendChild(tripPicture(st.tourId, 'sr-tripsheet__pic'));
    const head = sheetHead(p, T.introMicro, st.tourTitle);
    head.appendChild(el('p', 'sr-tripsheet__meta', shapeLine(st.count, st.estimateMs)));
    const tour = tourOf(st.tourId);
    const blurb = tour && tour.blurb ? String(tour.blurb) : '';
    if (blurb) p.appendChild(el('p', 'sr-tripsheet__text', blurb));
    const dropped = (st.dropped || []).length;
    if (dropped === 1) p.appendChild(el('p', 'sr-tripsheet__note', T.droppedOne));
    else if (dropped > 1) p.appendChild(el('p', 'sr-tripsheet__note', t(T.droppedMany, { n: dropped })));
    // A trip whose stops set the clock says so in one line, and that line is the one that matters:
    // the stops set their own rate, so "set back to normal speed" would be over by the first stop.
    // A blurb that already says it (two trips' do) is not said twice.
    const clockSaid = /\bclock\b/i.test(blurb);
    if (st.clockMoves && !clockSaid) p.appendChild(el('p', 'sr-tripsheet__note', T.clockMoves));
    else if (st.clockClamped) p.appendChild(el('p', 'sr-tripsheet__note', T.clockClamped));

    const row = el('div', 'sr-tripsheet__row');
    const start = el('button', 'sr-tripsheet__start');
    start.type = 'button';
    start.title = T.startTitle;
    start.appendChild(icon('play'));
    start.appendChild(el('span', null, T.introStart));
    start.addEventListener('click', () => startTrip(st));
    row.appendChild(start);
    // Sound, off until pressed (spec 0035 req 2). Here because this is the one moment a visitor is
    // deciding how to watch, and a click here is the gesture a browser wants first.
    const sound = iconButton('sr-tripsheet__sound sr-trip__soundtoggle', 'volume-x', T.soundOn, T.soundOffTitle, toggleSound);
    row.appendChild(sound);
    // The voice, beside it (spec 0069): the same control as the toolbar's, painted by paintSound.
    row.appendChild(iconButton('sr-tripsheet__sound sr-trip__voicetoggle', 'speech', T.voice, T.voiceOffTitle, toggleVoice));
    p.appendChild(row);
    // Present (public #441): this trip for a room. Beside "Not now", as quiet as it: most visitors
    // are one person at a desk, and the one ember thing here is still Start.
    const quiet = el('div', 'sr-tripsheet__quietrow');
    quiet.appendChild(textButton('sr-tripsheet__quiet', T.introSkip, T.leaveTitle, leave));
    const presentBtn = textButton('sr-tripsheet__quiet sr-tripsheet__present', undefined, T.presentTitle, () => setPresent(!present));
    presentBtn.appendChild(icon('presentation', 16));
    presentBtn.appendChild(el('span', null, T.present));
    presentBtn.setAttribute('aria-pressed', present ? 'true' : 'false');
    quiet.appendChild(presentBtn);
    p.appendChild(quiet);

    // The stops, as a list a visitor can start from: a row starts the trip at that stop (the same
    // jumpTo a deep link into a later stop uses).
    const stops = Array.isArray(st.stops) ? st.stops : [];
    if (stops.length) {
      const list = el('ol', 'sr-tripsheet__stops');
      list.setAttribute('aria-label', T.stopsLabel);
      stops.forEach((stop, i) => {
        const li = el('li', null);
        const b = el('button', 'sr-tripsheet__stop');
        b.type = 'button';
        b.appendChild(el('span', 'sr-tripsheet__stopn', fmt.int(i + 1)));
        b.appendChild(el('span', 'sr-tripsheet__stoptitle', stop.title));
        b.title = t(T.startAtTitle, { n: i + 1 });
        b.addEventListener('click', () => {
          userJumped = true;
          if (ctx.audio && ctx.audio.isOn()) ctx.audio.enable();
          if (i > 0) trip.jumpTo(i);
          trip.play();
        });
        li.appendChild(b);
        list.appendChild(li);
      });
      const label = el('p', 'sr-tripsheet__micro sr-tripsheet__micro--list', T.stopsLabel);
      p.appendChild(label);
      p.appendChild(list);
    }
    p.hidden = false;
    paintSound();
    focusSoon(start);
  }

  /**
   * THE END. An unmarked ending is indistinguishable from a crash. The trip's name again, what
   * leaving does, three actions in the card's action row (Explore is the one ember: it is Leave,
   * named for what comes next), and ONE named next trip as a trip card, never a picker.
   */
  function renderOutro(st) {
    const p = parts.panel;
    const T = COPY.trip;
    p.textContent = '';
    p.dataset.kind = 'outro';
    sheetHead(p, T.endMicro, st.tourTitle);
    // A trip that moved the map's centre cannot promise the camera stays: leaving puts the centre
    // back, and one unit is a different distance there (ui/trip.js `state.stageChanged`).
    p.appendChild(el('p', 'sr-tripsheet__note', st.stageChanged ? T.endBodyStage : T.endBody));
    // The clock is put back on leave, not now: the end card is still inside the trip.
    if (st.clockMoves) p.appendChild(el('p', 'sr-tripsheet__note', T.clockRestored));

    const row = el('div', 'sr-tripsheet__actions');
    row.setAttribute('role', 'group');
    const act = (cls, iconName, label, title, onClick) => {
      const b = el('button', cls);
      b.type = 'button';
      b.title = title;
      b.appendChild(icon(iconName));
      b.appendChild(el('span', 'sr-act__label', label));
      b.addEventListener('click', onClick);
      row.appendChild(b);
      return b;
    };
    // KEEP FLYING IS THE ONE EMBER (public #447). The camera stays where the trip ended and the
    // visitor carries on from there. After a trip that moved the map's centre that means staying on
    // the trip's world (ui/trip.js stop, `stay`), and the way home is its own button beside it; a
    // trip that never left this map has nothing to go back to, so it has the three it always had.
    const explore = act('sr-act sr-act--primary', 'compass', T.endExplore,
      st.stageChanged ? T.endStayTitleStage : T.endExploreTitle, st.stageChanged ? stay : leave);
    if (st.stageChanged) act('sr-act', 'house', T.endHome, T.endExploreTitleStage, leave);
    // Four actions are two rows of two (ui.css): in one row the labels were cut short.
    row.classList.toggle('is-four', !!st.stageChanged);
    act('sr-act', 'rotate-ccw', T.endReplay, T.endReplayTitle, () => trip.start(st.tourId));
    act('sr-act', 'share', T.share, T.endShareTitle, () => onShare(false));
    p.appendChild(row);
    // THE PICTURE TO SEND (public #444). The trip's own picture, the one its card and its page
    // carry, as a button: it opens the share sheet, whose postcard is the view the camera is
    // holding now, the last stop, with the trip's words and the link under it.
    if (st.tourId) {
      const send = el('button', 'sr-tripsheet__send');
      send.type = 'button';
      send.title = T.endSendTitle;
      send.appendChild(tripPicture(st.tourId, 'sr-tripsheet__sendpic'));
      const cap = el('span', 'sr-tripsheet__sendcap');
      cap.appendChild(icon('share', 16));
      cap.appendChild(el('span', null, T.endSend));
      send.appendChild(cap);
      send.addEventListener('click', () => onShare(false));
      p.appendChild(send);
    }
    const nextHost = el('div', 'sr-tripsheet__next');
    p.appendChild(nextHost);
    p.hidden = false;
    focusSoon(explore);

    // ONE named next trip, never a picker: a menu at the end of a trip is a decision nobody asked
    // for, and the name is the whole invitation. But it was picked positionally out of tours()
    // with nothing asked about it, so with CelesTrak unreachable the end card offered "Where
    // people are living in space right now" -- a trip plan() greys out in the Trips panel with
    // its reason -- and pressing it tore the frame down and showed the refusal to nobody. The
    // card is added only once a plan says the trip can actually run.
    //
    // Which trip is asked first is the registry's own `next:` (spec 0029; ui/trippicker.js
    // nextTripOrder), then the positional walk it was before the field existed, so a named
    // follow-on that cannot run today falls back to what the card offered before.
    offerNext(nextTripOrder(trip.tours(), st.tourId), nextHost, st.tourId);
  }

  /**
   * Walk the other trips in order and add a trip card for the first one that can be offered: the
   * home view's own card (ui/explore.js), its group's tint, its title and its shape. Asynchronous
   * because plan() resolves layers, and guarded by `outroToken` so an answer that arrives after
   * the visitor left, replayed, or started something else lands nowhere.
   */
  function offerNext(ordered, nextHost, fromId) {
    const mine = ++outroToken;
    const tryOne = (i) => {
      if (i >= ordered.length) return;
      const tour = ordered[i];
      Promise.resolve(trip.plan(tour.id))
        .catch(() => null)
        .then((plan) => {
          if (mine !== outroToken || !parts || !nextHost.isConnected) return;
          if (trip.state.phase !== 'outro' || trip.state.tourId !== fromId) return;
          if (!plan || !plan.offerable) { tryOne(i + 1); return; }
          nextHost.appendChild(el('p', 'sr-tripsheet__micro sr-tripsheet__micro--list', COPY.trip.endNextMicro));
          const card = el('button', 'sr-tripcard sr-tripsheet__nextcard');
          card.type = 'button';
          card.dataset.trip = tour.id;
          if (tour.group) card.dataset.group = tour.group;
          card.title = t(COPY.trip.endNext, { title: tour.title });
          card.appendChild(tripPicture(tour.id, 'sr-tripcard__pic'));
          card.appendChild(el('span', 'sr-tripcard__title', tour.title));
          card.appendChild(el('span', 'sr-tripcard__meta', shapeLine(plan.count, plan.estimateMs)));
          card.addEventListener('click', () => trip.start(tour.id));
          nextHost.appendChild(card);
        });
    };
    tryOne(0);
  }

  // ---------------------------------------------------------------------------- the render

  function render(st) {
    // Before anything is painted, and for every phase, `idle` included: the voice follows the trip
    // (it starts when a flight lands, pauses with the trip, and stops when the camera leaves).
    if (voice) voice.follow(st, nextKey(st));
    if (st.phase === 'idle') {
      teardown();
      return;
    }
    if (st.phase === 'resolving') return;
    if (!host) setup(st);
    if (!parts) return;

    root.setAttribute(PHASE_ATTR, st.phase);
    // A stop that keeps the other objects' names up in present mode (`names: true`); see ui.css.
    if (st.names) root.setAttribute(NAMES_ATTR, '');
    else root.removeAttribute(NAMES_ATTR);
    // A stop seen from the visitor's own ground (ui/trip.js `ground`): the card says so in its place.
    root.classList.toggle('sr-trip-ground', !!st.ground);
    host.setAttribute('aria-label', st.tourTitle || '');
    parts.sheet.setAttribute('aria-label', st.tourTitle || '');
    parts.title.textContent = st.tourTitle || '';
    parts.title.title = st.tourTitle || '';
    paintChapter(st);
    // The same promise the end card makes, on the button that keeps it.
    const leaveTitle = st.stageChanged ? COPY.trip.leaveTitleStage : COPY.trip.leaveTitle;
    for (const b of parts.leaveButtons) b.title = leaveTitle;

    const showPanel = AT_PANEL.includes(st.phase);
    // The toolbar and the top bar are for a running trip; the intro and the end card carry their
    // own way out (Not now, Explore) and Escape works throughout.
    parts.toolbar.hidden = showPanel;
    parts.top.hidden = showPanel;
    parts.cardSlot.hidden = showPanel;
    if (showPanel) {
      if (collapsed) setCollapsed(false);
      if (parts.panel.hidden || parts.panel.dataset.phase !== st.phase) {
        parts.panel.dataset.phase = st.phase;
        if (st.phase === 'intro') renderIntro(st);
        else renderOutro(st);
      }
      return;
    }
    // Leaving the intro on a phone: the sheet goes back to half, whatever height the intro needed
    // (its Start below half on a 640 px screen raised it to full), because from here the scene is
    // the trip and the stop card's head is what has to be up (spec 0061 task 3).
    const phoneSheet = ctx.shell && typeof ctx.shell.sheet === 'function' ? ctx.shell.sheet() : null;
    if (phoneSheet && !parts.panel.hidden && phoneSheet.detent() !== 'half') phoneSheet.set('half');
    // Emptied as well as hidden: an intro's Start left in the document is an ember button and a tab
    // stop nobody can see.
    if (!parts.panel.hidden || parts.panel.childElementCount) parts.panel.textContent = '';
    parts.panel.hidden = true;
    parts.panel.dataset.phase = '';
    parts.sheet.removeAttribute('aria-labelledby');

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
    const T = COPY.trip;
    parts.count.textContent = progressText(st);
    parts.countText.textContent = t(T.stopOf, { n, count: st.count });
    // Paused, the play button is the one ember thing on screen: what to press to carry on. Its
    // name says what it will do, so a reader hears "Resume" and not a state.
    const paused = st.phase === 'paused';
    setIcon(parts.pause, paused ? 'play' : 'pause');
    parts.pause.setAttribute('aria-label', paused ? T.resume : T.pause);
    parts.pause.title = paused ? T.resumeTitle : T.pauseTitle;
    parts.pause.classList.toggle('is-paused', paused);
    parts.toolbar.classList.toggle('is-paused', paused);
    parts.back.disabled = st.index <= 0;

    const stopTitle = st.held ? T.heldTitle : st.stopTitle || '';
    parts.group.setAttribute('aria-label', t(T.liveLabel, { n, count: st.count, title: stopTitle }));
    parts.heading.textContent = stopTitle;

    // The APG rule, exactly: `off` while auto-advance is running, `polite` when it is not.
    const auto = st.pacing === 'auto' && !paused;
    parts.live.setAttribute('aria-live', auto ? 'off' : 'polite');
    parts.status.textContent = paused ? T.pausedChip : auto ? stopTitle : '';

    if (st.index !== lastIndex) {
      lastIndex = st.index;
      document.title = t(T.docTitle, { title: st.tourTitle, n, count: st.count });
    }
    // OUTSIDE the index check, because the two moves that orphaned keyboard focus do not change
    // the index. Start destroys the intro panel the Start button lives in, and a stop row likewise;
    // both left `document.activeElement` on BODY, and a keyboard visitor had to tab in from the top
    // of the document to reach the controls again. The heading is in this frame, read as
    // "stop 2 of 4: <title>", and the next Tab lands on the toolbar.
    if (userJumped) parts.heading.focus();
    userJumped = false;
  }

  /**
   * The chapter line. Re-announced (the `is-new` rise) only when its words change, so the stops of
   * one chapter share it without it blinking at each; ui.css turns the rise off under reduced
   * motion, where the words simply appear.
   */
  function paintChapter(st) {
    const text = st.chapter || '';
    const node = parts.chapter;
    if (node.textContent === text) return;
    node.textContent = text;
    node.hidden = !text;
    node.classList.remove('is-new');
    if (text) {
      void node.offsetWidth; // restart the animation on a node that already had the class
      node.classList.add('is-new');
    }
  }

  /**
   * The two lines the frame writes into the stop card (ui/cards.js renderStop keeps their places
   * and carries their text across a repaint): when the picture is, under the title, and what an
   * eclipse or a drawn orbit is made of, at the foot beside the honesty line. Written only when
   * they change: at 600x the minutes turn over ten times a second, and a text node rewritten every
   * frame with the same words is layout work for nothing.
   */
  function paintCardLines(st) {
    if (!parts) return;
    const card = document.getElementById('sr-card');
    if (!card || card.hidden) return;
    const whenNode = card.querySelector('.sr-card__when');
    if (whenNode) {
      const text = stopTimeLine(st, ctx.clock);
      if (whenNode.textContent !== text) whenNode.textContent = text;
      whenNode.hidden = !text;
    }
    const lineNode = card.querySelector('.sr-card__tripline');
    if (lineNode) {
      const drawn = typeof ctx.eclipseDrawn === 'function' ? ctx.eclipseDrawn() : true;
      // The eclipse line and the orbits line share the element: no trip has both, and two stacked
      // honesty lines would be read as one anyway.
      const stageId = ctx.stage && ctx.stage.worldId;
      // An Earth overlay's sentence (what the colours are, the day, whose data) and its legend,
      // which sits just above the line: the colours on the globe mean nothing without it.
      const over = st && st.phase !== 'idle' && st.overlay && typeof ctx.overlayState === 'function' ? ctx.overlayState() : null;
      const text = st && st.phase !== 'idle'
        ? [eclipseLine(st, drawn), orbitsLine(st, stageId), figuresLine(st), overlayLine(over)].filter(Boolean).join(' ')
        : '';
      if (lineNode.textContent !== text) lineNode.textContent = text;
      lineNode.hidden = !text;
      let legend = lineNode.previousElementSibling;
      if (legend && !legend.classList.contains('sr-legend')) legend = null;
      const keyed = over && over.status === 'shown' && over.legend ? over : null;
      if (keyed && !legend) {
        legend = legendNode(keyed);
        if (legend) lineNode.parentNode.insertBefore(legend, lineNode);
      } else if (legend) paintLegend(legend, keyed);
    }
  }

  function loop() {
    raf = requestAnimationFrame(loop);
    if (!parts) return;
    const st = trip.state;
    paintCardLines(st);
    // The sentence being said, lit in the card's own paragraph (ui/voicecue.js).
    if (voice) paintCue(document.querySelector('#sr-card .sr-card__leadbody'), voice.cue());
    if (st.phase !== 'dwell' || st.index < 0) return;
    const seg = parts.segs.children[st.index];
    if (!seg) return;
    const f = trip.dwellFraction();
    // Reader-paced stops have nothing counting down, so their segment shows position and no fill.
    seg.style.setProperty('--sr-fill', f === null ? '0' : String(f));
  }

  // ------------------------------------------------------------------------ setup/teardown

  function onShell() {
    if (host) seat();
  }

  function setup(st) {
    build();
    savedDocTitle = document.title;
    tourId = st.tourId;
    const active = document.activeElement;
    savedFocus = active && active !== document.body ? active : null;
    setChromeHidden(true);
    // The link's `present=`, or the mode a trip started from another's end card inherits.
    const asked = presentFromUrl();
    if (asked.on || carried) setPresent(true, asked.on ? asked.auto : carried.auto);
    carried = null;
    seat();
    setCollapsed(false);
    paintPresent();
    if (typeof document !== 'undefined') document.addEventListener('fullscreenchange', onFullScreenChange);
    lastIndex = -1;
    // The cross-fade the rig has emitted since it was written, finally consumed. Subscribed only
    // for the life of a trip, so an ordinary reduced-motion flight outside one does not flash.
    if (rig && rig.onFade) offFade = rig.onFade((ms) => flash(ms));
    if (ctx.audio && typeof ctx.audio.onChange === 'function') offSound = ctx.audio.onChange(heard);
    if (typeof window !== 'undefined' && window.addEventListener) window.addEventListener('sr:shell', onShell);
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
    if (offSound) {
      offSound();
      offSound = null;
    }
    if (typeof window !== 'undefined' && window.removeEventListener) window.removeEventListener('sr:shell', onShell);
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (voice) {
      voice.stop();
      paintCue(null, '');
    }
    setCollapsed(false);
    if (typeof document !== 'undefined') document.removeEventListener('fullscreenchange', onFullScreenChange);
    root.classList.remove('sr-trip-ground');
    // Present mode ends with the trip: the class, the pacing, the link's key and the full screen
    // it asked for. (A trip started from the end card replaces this one without a teardown.)
    carried = present && trip.state.reason === 'replaced' ? { auto: presentAuto } : null;
    if (present) setPresent(false);
    // The card out of the sheet BEFORE the sheet goes: a card left inside a detached node is a card
    // ui/cards.js can no longer find by id, and it would build a second one.
    if (ctx.shell && typeof ctx.shell.seatTrip === 'function') ctx.shell.seatTrip(null);
    setChromeHidden(false);
    root.removeAttribute(PHASE_ATTR);
    root.removeAttribute(NAMES_ATTR);
    if (savedDocTitle !== null) document.title = savedDocTitle;
    savedDocTitle = null;
    destroy();
    lastIndex = -1;
    // Focus goes back to where the visitor was -- not to <body>, which is where a keyboard visitor
    // would otherwise have to start again from the top of the document. AFTER the shell has
    // re-seated the card and popped the trip view (its observers run as microtasks, before this
    // timeout), because a control in a view that is still hidden cannot take focus:
    //
    //   1. the element that had focus when the trip started, if it is on screen again;
    //   2. the card, when leaving left something selected (ui/trip.js re-selects the last stop's
    //      subject): its heading, as the shell does for any view it pushes;
    //   3. the trip card the trip was started from, in the explore view.
    //
    // The saved element is not enough on its own, because a trip can be started by something that
    // never took focus at all: a programmatic click, the console, a deep link. Measured: a click
    // dispatched from JS leaves document.activeElement on <body>, and focus went nowhere.
    const saved = savedFocus;
    const fromTour = tourId;
    savedFocus = null;
    const shown = (n) => !!(n && n.isConnected && typeof n.focus === 'function' && (!n.getClientRects || n.getClientRects().length > 0));
    setTimeout(() => {
      if (document.activeElement && document.activeElement !== document.body && document.activeElement.isConnected) return;
      const card = document.getElementById('sr-card');
      const heading = card && !card.hidden && card.querySelector ? card.querySelector('#sr-card-title') : null;
      const tripCard = fromTour ? document.querySelector(`#sr-side [data-trip="${fromTour}"]`) : null;
      const back = [saved, heading, tripCard].find(shown);
      if (back) {
        back.focus({ preventScroll: true });
        return;
      }
      // Nothing of those on screen (measured 2026-09-23 on the old phone drawer: the [data-trip]
      // button was found, focus() was called, and activeElement stayed on <body>): the phone's
      // sheet handle, which is always on screen and raises the sheet on the trip just left.
      const handle = document.querySelector(`#${SIDE_ID} .sr-sheet__handle`);
      if (handle && typeof handle.focus === 'function') handle.focus();
    }, 0);
    tourId = null;
  }

  /** Cover the canvas instantly, then fade off over the rig's own `ms`. A cut with a fade over it
   * is the whole of "reduced motion" here; the card never moves and never fades. The black is
   * ui/veil.js's since spec 0034: one node, over the canvas and under every panel. */
  function flash(ms) {
    if (!parts || !ctx.veil || typeof ctx.veil.fade !== 'function') return;
    ctx.veil.fade(ms);
  }

  const offChange = trip.onChange(render);
  document.addEventListener('keydown', onKey, true);
  window.addEventListener('sr:select', onSelect);
  // main.js imports this module when the first trip starts, so the trip is already under way when
  // the frame is made: paint what is there now rather than wait for the next change.
  if (trip.state && trip.state.phase !== 'idle') render(trip.state);

  function dispose() {
    offChange();
    document.removeEventListener('keydown', onKey, true);
    window.removeEventListener('sr:select', onSelect);
    teardown();
  }

  return { dispose };
}
