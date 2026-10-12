// scene/quality.js -- data-saver and a frame-rate latch (spec 0026 req 18).
//
// Pure. Exported:
//   createFrameLatch(opts) -> { push(frameMs, nowMs) -> boolean, latched, median(), force() }
//   shouldSaveData(connection) -> boolean
//   chooseTier(device), createTierPromoter(opts) -- device tiers, at the bottom of this file
//   QUALITY_CHOICES, offeredQualities(ceiling, latched), qualityPlan(choice, device, latched),
//   readQualityChoice(storage), writeQualityChoice(storage, choice), qualityAfterLatch(choice),
//   qualityNote(plan, words) -- the setting a visitor can choose (spec 0073 req 6), at the very bottom
//
// satellitemap.space's eighth take. Two decisions the app used to leave to hope:
//   - On a slow or metered connection the two heavy catalogue files (6.9 MB active, 5.1 MB Starlink)
//     are DEFERRED: the layer stays in the panel, off, with a line saying why, and loads when the
//     visitor switches it on. `navigator.connection.saveData`, or an effective type of 2g/3g, is the
//     signal; a browser without the API (Safari, Firefox) is treated as fast, which is what it says.
//   - When the median of the last twenty frame times stays over 33 ms for three seconds, the scene
//     drops to one device pixel per CSS pixel and hides the Milky Way picture and the constellation
//     lines -- once, latched, and said in the panel. It never climbs back by itself: a latch that
//     flaps is worse than either state.

/** `src` sorted ascending into the reused array `out` (insertion: the window is 20 numbers). */
function sortedInto(out, src) {
  out.length = src.length;
  for (let i = 0; i < src.length; i++) {
    const v = src[i];
    let j = i - 1;
    while (j >= 0 && out[j] > v) { out[j + 1] = out[j]; j--; }
    out[j + 1] = v;
  }
  return out;
}

export function createFrameLatch(opts = {}) {
  const windowFrames = opts.windowFrames || 20;
  const thresholdMs = opts.thresholdMs || 33;
  const holdMs = opts.holdMs || 3000;
  const frames = [];
  const scratch = [];
  let overSince = null;
  let latched = false;

  function median() {
    if (!frames.length) return 0;
    const a = sortedInto(scratch, frames);
    const h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  /** Feed one frame's duration. Returns true exactly once, on the frame that trips the latch. */
  function push(frameMs, nowMs) {
    if (latched) return false;
    if (!Number.isFinite(frameMs) || frameMs <= 0) return false;
    frames.push(Math.min(frameMs, 1000));
    if (frames.length > windowFrames) frames.shift();
    if (frames.length < windowFrames) return false;
    if (median() > thresholdMs) {
      if (overSince === null) overSince = nowMs;
      if (nowMs - overSince >= holdMs) { latched = true; return true; }
    } else {
      overSince = null;
    }
    return false;
  }

  /**
   * Latch now, as a slow device would (spec 0034's acceptance: "with the latch forced, uStretch
   * reads 0 through a flight"). One-way like the real thing. Returns true when this call latched,
   * so main.js can run the same degrade a tripped latch runs and the two paths cannot differ.
   */
  function force() {
    if (latched) return false;
    latched = true;
    return true;
  }

  return { push, median, force, get latched() { return latched; } };
}

// --- the resolution scale before the latch (internal #521, 2026-10-10) -----------------------------------
//
// THE MEASURED PROBLEM (docs/performance-research-2026-10-09.md section 4): one stall, another tab loading,
// tripped the latch for good, and the visit lost relief, earthshine, the tiles and the 4k maps. THE STEP
// IN BETWEEN: a ladder of pixel ratios, 2, 1.5, 1.25, 1 (never above the device's own, nor above
// MAX_DPR in scene/renderer.js). The same test that trips the latch (a 20-frame median over 33 ms for
// three seconds) now takes one step DOWN the ladder, at least three seconds after the last step, and the
// window starts empty after a step so the new resolution is measured on its own frames. The median under
// 12 ms (the tier promoter's test) for ten seconds takes one step UP, only while the picture is calm (no
// trip, no camera move). At the bottom step the latch is fed as before and stays the last resort: it is
// still one-way, and once it has tripped the ladder is frozen at 1. A device whose ratio is already 1
// has a ladder of one step, so for it nothing changes: the latch is fed from the first frame.
//
// THE STEP UP ON A 60 Hz SCREEN (integration pass, 2026-10-10). The frame length fed here is the gap between two
// animation frames, which a 60 Hz screen never lets under 16.7 ms: with the test at 12 ms the ladder climbed on a
// 120 Hz screen only, and everyone else kept the soft picture for the visit. The test is 20 ms now (the screen's
// own rhythm, or better). What that test cannot know is whether the next step up will hold, so a step down that
// comes within fifteen seconds of a step up DOUBLES the wait before the next try (10 s, 20 s ... 320 s): a
// device that cannot hold the higher ratio is asked rarely, not every thirteen seconds. And the resting home
// view draws at twenty frames a second by choice (the idle cap below), frames the loop keeps away from here:
// rest(now) counts that time as quick, so a visit left alone comes back up too.

/** The pixel ratios the scale may take, highest first (the device's own ratio is put on top, capped at 2). */
export const SCALE_STEPS = [2, 1.5, 1.25, 1];

export function createScaleGovernor(opts = {}) {
  const dpr = Math.min(2, Number.isFinite(opts.deviceRatio) && opts.deviceRatio > 0 ? opts.deviceRatio : 1);
  const steps = [dpr, ...SCALE_STEPS.filter((x) => x < dpr)];
  const windowFrames = opts.windowFrames || 20;
  const downMs = opts.downMs || 33;
  const upMs = opts.upMs || 20;
  const downHoldMs = opts.downHoldMs || 3000;
  const upHoldMs = opts.upHoldMs || 10000;
  const minGapMs = opts.minGapMs || 3000;
  const frames = [];
  const scratch = [];
  let i = 0;
  let overSince = null;
  let underSince = null;
  let changedAt = -Infinity;
  let frozen = false;
  let held = false;
  let upHold = upHoldMs;
  let lastUpAt = -Infinity;
  const bounceMs = opts.bounceMs || 15000;
  const maxUpHoldMs = opts.maxUpHoldMs || 320000;

  function median() {
    if (!frames.length) return 0;
    const a = sortedInto(scratch, frames);
    const h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }
  function stepTo(next, nowMs) {
    if (next < i) lastUpAt = nowMs;
    else if (nowMs - lastUpAt < bounceMs) upHold = Math.min(maxUpHoldMs, upHold * 2); // the step up did not hold
    i = next;
    changedAt = nowMs;
    frames.length = 0;
    overSince = null;
    underSince = null;
  }

  /**
   * Feed one frame. `calm` is false while a trip runs or the camera moves (a step UP waits for it;
   * a step down does not, because a stalling picture is worse than a softer one). `patient` is true when
   * the only thing against calm is a moving camera: the step up then comes, three times later. Returns true on the
   * frame that changed the step, and `scale` is then the new ratio.
   */
  function push(frameMs, nowMs, calm = true, patient = false) {
    if (frozen || held || !Number.isFinite(frameMs) || frameMs <= 0) return false;
    frames.push(Math.min(frameMs, 1000));
    if (frames.length > windowFrames) frames.shift();
    if (frames.length < windowFrames) return false;
    const m = median();
    if (m > downMs) {
      underSince = null;
      if (overSince === null) overSince = nowMs;
      if (i < steps.length - 1 && nowMs - overSince >= downHoldMs && nowMs - changedAt >= minGapMs) { stepTo(i + 1, nowMs); return true; }
    } else if (m < upMs && i > 0) {
      overSince = null;
      if (underSince === null) underSince = nowMs;
      // Not calm but `patient` (nothing is being SHOWN -- no trip, no reel, no climb -- yet the camera is not
      // still: it follows a body, or the stage turns under it): the step comes after three times the wait.
      // Seen 2026-10-10 on a phone-sized canvas with Saturn followed: seventy quick seconds and no step up,
      // because a camera that follows something is never still.
      const wait = calm ? upHold : patient ? upHold * 3 : Infinity;
      if (nowMs - underSince >= wait && nowMs - changedAt >= minGapMs) { stepTo(i - 1, nowMs); return true; }
    } else {
      // Between the two tests (or quick at the top): not slow, so the count toward a step down starts again; not
      // quick, so this time does not count toward a step up -- but it does not throw the quick seconds away
      // either. A page has a busy half second now and then (a catalogue landing, a list rebuilt), and ten
      // UNBROKEN quick seconds were rare enough that the ratio stayed down for a minute in a real browser.
      overSince = null;
      if (underSince !== null) underSince += frameMs;
    }
    return false;
  }

  /**
   * A frame the loop drew slowly BY CHOICE (the idle cap: nothing is moving). Its length says nothing about
   * the device, so it is not in the window; the time counts as quick. Returns true on a step up.
   */
  function rest(nowMs) {
    if (frozen || held || i === 0) return false;
    overSince = null;
    frames.length = 0;
    if (underSince === null) underSince = nowMs;
    if (nowMs - underSince >= upHold && nowMs - changedAt >= minGapMs) { stepTo(i - 1, nowMs); return true; }
    return false;
  }

  return {
    push,
    rest,
    median,
    /** How long the frames must be quick before a step up, now (it doubles when a step up does not hold). */
    get upHoldMs() { return upHold; },
    /** The latch has tripped: the ladder stops where it is (the latch itself takes the ratio to 1). */
    freeze() { frozen = true; },
    /**
     * The quality setting's Ultra (qualityPlan below): the ratio goes to the top of the ladder and stays
     * there, frames are not counted, and `atFloor` is false so the latch is not fed from here. Let go,
     * the ladder starts from the top with an empty window. Nothing after the latch. Returns true when
     * the ratio changed.
     */
    hold(on) {
      const want = !!on;
      if (frozen || want === held) return false;
      held = want;
      const was = i;
      i = 0;
      frames.length = 0;
      overSince = null;
      underSince = null;
      return was !== 0;
    },
    get held() { return held; },
    get scale() { return steps[i]; },
    get step() { return i; },
    get steps() { return steps.slice(); },
    /** On the lowest step: the frame latch is fed from here, and only from here. */
    get atFloor() { return !held && i === steps.length - 1; },
  };
}

// --- the idle frame rate (internal #520, 2026-10-09) ---------------------------------------------
//
// The loop in main.js drew every animation frame, sixty a second, whatever was on screen. With the
// page left open on the Earth at the live clock, nothing selected and nobody touching it, the dots
// are recomputed ten times a second and the Earth turns four thousandths of a degree in one: five
// frames of every six were the same picture, drawn again. So when NOTHING IS MOVING the loop draws
// at IDLE_FRAME_MS (twenty a second: two frames per glyph tick, so the tick keeps its tenth of a
// second exactly) and goes back to every frame the moment something does.
//
// IT IS A CAP, NOT A STOP, and that is the safety: the picture is never frozen, so the worst a
// motion this file has not heard of can do is run at twenty frames a second until the next thing
// wakes the loop. And "nothing is moving" is deliberately narrow. movingReasons() names every
// state in which the cap must not apply; the cap is for the one state left over, the home view at
// rest. A film (render mode) is never capped and neither is an automated browser, so a probe that
// counts frames or waits two of them measures what it always did (`?idle=1` asks for the cap
// there, `?idle=0` switches it off for anyone).

/** Twenty frames a second while idle: two per glyph tick (100 ms at the live clock). */
export const IDLE_FRAME_MS = 50;
/** How long everything must have been still before the cap applies. */
export const IDLE_AFTER_MS = 2000;

/**
 * Why the picture is changing right now, as names. Empty means nothing is, and only then may the
 * loop draw less often. Pure: main.js fills `s` at the end of every drawn frame.
 *
 * Every field is a reason NOT to idle, and tests/test_idle.mjs holds each one on its own:
 *   film        tools/render-trip.mjs is stepping the clock; its frames are its own
 *   clock       anything but the live clock at rate 1: a scrub, a fast clock, a paused instant
 *   trip        a trip is running (a flight, a hold, its captions)
 *   autopilot   the reel has the screen
 *   sky         the sky from the ground is up
 *   stage       any stage but the Earth's: the Sun close up, a star system, a drawn world, the ladder
 *   climb       a climb between stages, or the opening, is running
 *   selection   something is selected: its pulse, its brackets, its orbit line, a model fading in
 *   camera      the camera's matrices are not last frame's (a drag, a flight, inertia, a zoom, a resize)
 *   layer       a layer that animates by itself is doing so now: the aurora's folds on screen,
 *               lightning with strikes in its map, the wind, a data overlay (main.js layerAnimating)
 *   loading     the first visit is not over, or the GPU has a texture or a geometry it did not have
 *               last frame (a map landing with its cross-fade, a model, a new layer)
 * @returns {string[]}
 */
export function movingReasons(s = {}) {
  const why = [];
  if (s.film) why.push('film');
  if (s.clockMode !== 'live' || s.clockRate !== 1) why.push('clock');
  if (s.trip) why.push('trip');
  if (s.autopilot) why.push('autopilot');
  if (s.sky) why.push('sky');
  if (s.stage !== 'earth') why.push('stage');
  if (s.climb) why.push('climb');
  if (s.selected) why.push('selection');
  if (s.cameraMoved) why.push('camera');
  if (s.animatedLayer) why.push('layer');
  if (s.loading) why.push('loading');
  return why;
}

/**
 * `?look=1`: a tool is looking (tools/README.md, "A look from a machine that has time"). The frame
 * latch and the pixel-ratio governor are then not fed, so a software renderer keeps every effect it
 * was asked to photograph; every loader, the tier and the clock run as they do for a visitor. A
 * query key for tools: never in the hash (ui/urlstate.js KEYS), and never beside `embed=1`, whose
 * address is written by someone else's page. Pure: `{search}` in, a boolean out.
 */
export function lookHeld(d = {}) {
  const search = d.search || '';
  return /[?&]look=1(?:&|$)/.test(search) && !/[?&]embed=1(?:&|$)/.test(search);
}

/** Who gets the cap at all. Pure: `{search, webdriver, film}` in, a boolean out. */
export function idleCapWanted(d = {}) {
  const asked = /[?&]idle=([01])(?:&|$)/.exec(d.search || '');
  if (d.film) return false;
  if (asked) return asked[1] === '1';
  // An automated browser is a probe or a screenshot: it gets every frame unless it asks.
  return !d.webdriver;
}

/**
 * The gate the loop asks at the top of every animation frame.
 *   skip(now)            true: do nothing this frame (the cap is on and the last drawn frame is recent)
 *   capped(now)          the cap is on at this instant (the loop then keeps this frame's length
 *                        away from the frame latch: fifty milliseconds by choice is not a slow device)
 *   drew(now, reasons)   after a drawn frame, with movingReasons(): any reason restarts the wait
 *   wake(now)            something the loop cannot see coming: a key, a pointer, a resize
 */
export function createIdleGate(opts = {}) {
  const frameMs = opts.frameMs || IDLE_FRAME_MS;
  const afterMs = opts.afterMs || IDLE_AFTER_MS;
  const enabled = opts.enabled !== false;
  let lastMoving = null;
  let lastDrawn = -Infinity;
  let lastReasons = ['start'];
  const stats = { drawn: 0, skipped: 0, capped: 0 };
  const capped = (now) => enabled && lastMoving !== null && now - lastMoving >= afterMs;
  return {
    capped,
    skip(now) {
      // Two milliseconds of give: a display's frames are 16.67 ms apart, and the third one after a
      // drawn frame arrives at 50.0 give or take the timer.
      if (!capped(now) || now - lastDrawn >= frameMs - 2) return false;
      stats.skipped += 1;
      return true;
    },
    drew(now, reasons) {
      if (capped(now)) stats.capped += 1;
      stats.drawn += 1;
      lastDrawn = now;
      lastReasons = reasons;
      if (lastMoving === null || reasons.length) lastMoving = now;
    },
    wake(now) { lastMoving = now; },
    get enabled() { return enabled; },
    /** For probes and tests: counts since the page began, and why the last drawn frame was not idle. */
    state() { return { ...stats, enabled, reasons: lastReasons.slice() }; },
  };
}

const SLOW = new Set(['slow-2g', '2g', '3g']);

export function shouldSaveData(connection) {
  if (!connection) return false;
  if (connection.saveData === true) return true;
  return SLOW.has(String(connection.effectiveType || '').toLowerCase());
}

// --- device tiers (2026-09-28) -------------------------------------------------------------------
//
//   chooseTier(device) -> { tier, ceiling, reasons }
//   createTierPromoter({ tier, ceiling }) -> { push(frameMs, nowMs, latched) -> number|null, tier, promoted }
//
// Ivan, 2026-09-28: "the most realistic on capable devices ... high quality everywhere". Before this
// every device got the same 2k maps, so a desktop drew the Earth at the resolution a phone can afford.
// Three tiers, each a GPU budget first (docs/toolkit.md) and a picture second:
//   T0  phones, data-saver, small GPUs: the 2k maps every visitor boots with. <= 150 MB of textures.
//   T1  laptops and tablets: 4k Earth, night lights, a real water mask, a 4k Milky Way, and a 4k map
//       for the one world that is close or selected. <= 250 MB.
//   T2  capable desktops: the same 4k set today, with more worlds kept at 4k at once. 8k waits for
//       KTX2 (an 8k RGBA map with mipmaps is ~171 MB on its own: the study's arithmetic, section 1).
//
// WHY NO DETECTION LIBRARY. detect-gpu fetches its benchmark table from unpkg at run time (a third
// party on the boot path) and answers tier 0 for Firefox, whose renderer string is masked. What a
// browser tells us for free is enough to pick a budget: the largest texture the GPU takes, the memory
// Chromium admits to, the connection, and whether the pointer is a finger on a small screen.
//
// WHY THE TIER CAN RISE ONLY ONCE AND FALL ONLY THROUGH THE LATCH. A promotion is a download and a
// GPU upload; a demotion is a picture getting worse in front of the visitor. The frame latch above
// is already the one way down, and "a latch that flaps is worse than either state" applies here too.

/** GPU-texture budgets in MB, per tier (docs/toolkit.md: 150 phone, 400 desktop; T1 between). */
export const TIER_BUDGET_MB = [150, 250, 400];

/**
 * How many worlds other than the Earth may hold a 4k map at once, per tier: 44.7 MiB each with
 * mipmaps (RGBA8). T1's Earth and sky are ~70 MiB of 4k already (day RGBA, night and water R8, the
 * Milky Way RGBA) on top of the boot set, so T1 holds ONE planet at 4k until KTX2 cuts every map by
 * 4-8x (spec 0056); T2's 400 MB holds three.
 */
export const TIER_PLANET_SLOTS = [0, 1, 3];

/** The smallest-screen side, in CSS pixels, below which a touch device is a phone. */
export const PHONE_MIN_SIDE_PX = 600;

/**
 * The tier a device boots at, and the highest it may ever be promoted to.
 *
 * @param {object} d
 * @param {number} [d.maxTextureSize]       renderer.capabilities.maxTextureSize
 * @param {number} [d.deviceMemory]         navigator.deviceMemory (Chromium only; GB, capped at 8)
 * @param {number} [d.hardwareConcurrency]  navigator.hardwareConcurrency
 * @param {object} [d.connection]           navigator.connection
 * @param {boolean} [d.coarsePointer]       matchMedia('(pointer: coarse)') with no fine pointer
 * @param {number} [d.screenW] [d.screenH]  screen.width / screen.height, CSS pixels
 * @returns {{tier: number, ceiling: number, reasons: string[]}}
 */
export function chooseTier(d = {}) {
  const reasons = [];
  const maxTex = Number(d.maxTextureSize) || 0;
  const mem = Number(d.deviceMemory);
  const hasMem = Number.isFinite(mem) && mem > 0;
  const cores = Number(d.hardwareConcurrency) || 0;
  const minSide = Math.min(Number(d.screenW) || Infinity, Number(d.screenH) || Infinity);
  const phone = !!d.coarsePointer && minSide < PHONE_MIN_SIDE_PX;

  // Each of these pins the device at T0 for good: frame time says nothing about memory or money.
  // A 120 Hz phone draws frames under 12 ms and still has a phone's 150 MB.
  if (shouldSaveData(d.connection)) reasons.push('data-saver');
  if (maxTex && maxTex < 4096) reasons.push('max-texture ' + maxTex);
  if (hasMem && mem < 4) reasons.push('memory ' + mem + ' GB');
  if (phone) reasons.push('phone');
  if (reasons.length) return { tier: 0, ceiling: 0, reasons };

  // A tablet, or a GPU that cannot take 8k, stays at T1: T2 only adds 4k slots today, and a tablet's
  // memory is shared with everything else it runs.
  const ceiling = d.coarsePointer || (maxTex && maxTex < 8192) ? 1 : 2;
  // T2 at boot needs every signal to agree. Safari and Firefox do not report memory; there the cores
  // and the texture size decide, and a promotion by frame time can still get there.
  const strong = maxTex >= 16384 && cores >= 8 && (!hasMem || mem >= 8);
  if (ceiling >= 2 && strong) {
    reasons.push('max-texture ' + maxTex, cores + ' cores' + (hasMem ? ', ' + mem + ' GB' : ''));
    return { tier: 2, ceiling, reasons };
  }
  reasons.push(maxTex ? 'max-texture ' + maxTex : 'no texture limit reported');
  return { tier: 1, ceiling, reasons };
}

/**
 * One promotion, earned by frames: the twenty-frame median under `thresholdMs` for `holdMs` without
 * a break, and never once the latch has tripped. On a 60 Hz display frames are paced at 16.7 ms and
 * this never fires; that is deliberate. A fast frame INTERVAL is the one signal that includes the
 * GPU, and a device that holds 120 fps with the scene on screen has headroom a 60 Hz one cannot show.
 */
export function createTierPromoter(opts = {}) {
  const windowFrames = opts.windowFrames || 20;
  const thresholdMs = opts.thresholdMs || 12;
  const holdMs = opts.holdMs || 3000;
  const ceiling = Number.isFinite(opts.ceiling) ? opts.ceiling : 2;
  let tier = Number.isFinite(opts.tier) ? opts.tier : 0;
  let promoted = false;
  let dead = false;
  const frames = [];
  const scratch = [];
  let underSince = null;

  function median() {
    if (!frames.length) return 0;
    const a = sortedInto(scratch, frames);
    const h = a.length >> 1;
    return a.length % 2 ? a[h] : (a[h - 1] + a[h]) / 2;
  }

  /** Feed one frame. Returns the new tier on the one frame that promotes, else null. */
  function push(frameMs, nowMs, latched) {
    if (latched) { dead = true; tier = 0; return null; }
    if (dead || promoted || tier >= ceiling) return null;
    if (!Number.isFinite(frameMs) || frameMs <= 0) return null;
    frames.push(Math.min(frameMs, 1000));
    if (frames.length > windowFrames) frames.shift();
    if (frames.length < windowFrames) return null;
    if (median() < thresholdMs) {
      if (underSince === null) underSince = nowMs;
      if (nowMs - underSince >= holdMs) {
        promoted = true;
        tier += 1;
        return tier;
      }
    } else {
      underSince = null;
    }
    return null;
  }

  return {
    push,
    median,
    get tier() { return tier; },
    get promoted() { return promoted; },
    get ceiling() { return ceiling; },
  };
}

/**
 * The one line the layers panel and the Sources panel print about the tier: what the device wears
 * and the one reason that decided it. Pure; `q` is COPY.quality, passed in so this file stays free
 * of the copy module.
 */
export function tierLine(d, q) {
  const why = (d && d.reasons) || [];
  let line;
  if (d.latched) line = q.tierLatched;
  else if (d.choice === 'low') line = q.tierLow;
  else if (d.tier >= 2) line = q.tier2;
  else if (d.tier === 1) line = q.tier1;
  else if (why.includes('data-saver')) line = q.tierSaver;
  else if (why.includes('phone')) line = q.tierPhone;
  else line = q.tierSmall;
  return d.promoted && !d.latched ? line + ' ' + q.promoted : line;
}

// --- the setting a visitor can choose (spec 0073 requirement 6, 2026-10-12) ------------------------
//
// Auto is everything above, unchanged, and the default. The other four are a visitor saying what the
// device should spend:
//   low     tier 0 WITH EVERYTHING THE FRAME LATCH TAKES OFF ALREADY OFF: one device pixel per CSS
//           pixel, no Milky Way picture, no relief, no weather shader, the Sun a flat disc. A battery
//           or old-laptop mode, chosen and not fallen into, so it can be left again.
//   medium  tier 1.   high  tier 2.
//   ultra   tier 2 with the close-up effects at their top step counts (`steps: 'top'`) and the pixel
//           ratio held at the top of its ladder (`scale: 'held'`).
// THE DEVICE'S CEILING IS NEVER PASSED (chooseTier's `ceiling`: memory, the largest texture, a phone).
// A choice is offered only where it is what it says: Medium needs a ceiling of 1, High and Ultra of
// 2, and after the frame latch has tripped only Auto and Low are left, because the latch is one-way
// for the visit. A stored choice that is not offered here is Auto. The promoter leaves every manual
// choice alone (`promote` is true for Auto only), so Low is never raised by fast frames.
//
// THE LATCH STILL PROTECTS. When it trips under Medium, High or Ultra the setting goes back to Auto
// (qualityAfterLatch) and main.js says so once. Under Ultra the governor is held, so the latch's own
// test is run on every frame by a guard (main.js): slow frames for three seconds end Ultra the same
// way, before anything is taken off for good.

/** The choices, in the order the row shows them. */
export const QUALITY_CHOICES = ['auto', 'low', 'medium', 'high', 'ultra'];
export const DEFAULT_QUALITY = 'auto';
/** One key, read before the first tier pick. It describes the device, so it is never in the address. */
export const QUALITY_KEY = 'sr.quality';
/** The tier a manual choice asks for. */
const CHOICE_TIER = { low: 0, medium: 1, high: 2, ultra: 2 };

/** The choices this device is offered: a choice above its ceiling is absent, not disabled. */
export function offeredQualities(ceiling, latched = false) {
  const top = latched ? 0 : Math.max(0, Math.min(2, Number(ceiling) || 0));
  return QUALITY_CHOICES.filter((c) => c === 'auto' || CHOICE_TIER[c] <= top);
}

/**
 * What a choice means on this device, now. Pure.
 * @param {string} choice               one of QUALITY_CHOICES (anything else, or one not offered, is Auto)
 * @param {{tier:number, ceiling:number}} device  Auto's tier now (chooseTier's, or the promoted one) and the ceiling
 * @param {boolean} [latched]           the frame latch has tripped
 * @returns {{choice:string, tier:number, stripped:boolean, ultra:boolean, promote:boolean, steps:string, scale:string}}
 *   stripped  the latch's removals are on (the latch itself, or Low)
 *   steps     'floor' (the latch's counts), 'tier' (the tier's own) or 'top' (each effect's most)
 *   scale     'one' (one device pixel per CSS pixel), 'governed' (the ladder) or 'held' (its top step)
 */
export function qualityPlan(choice, device = {}, latched = false) {
  const ceiling = Math.max(0, Math.min(2, Number(device.ceiling) || 0));
  const auto = Math.max(0, Math.min(ceiling, Number(device.tier) || 0));
  const c = offeredQualities(ceiling, latched).includes(choice) ? choice : DEFAULT_QUALITY;
  if (latched) return { choice: c, tier: 0, stripped: true, ultra: false, promote: false, steps: 'floor', scale: 'one' };
  if (c === 'auto') return { choice: c, tier: auto, stripped: false, ultra: false, promote: true, steps: 'tier', scale: 'governed' };
  if (c === 'low') return { choice: c, tier: 0, stripped: true, ultra: false, promote: false, steps: 'floor', scale: 'one' };
  const ultra = c === 'ultra';
  return { choice: c, tier: CHOICE_TIER[c], stripped: false, ultra, promote: false, steps: ultra ? 'top' : 'tier', scale: ultra ? 'held' : 'governed' };
}

/** The choice after the latch (or Ultra's guard) fired: a choice above Low is Auto again; `told` says whether to say so. */
export function qualityAfterLatch(choice) {
  const told = choice === 'medium' || choice === 'high' || choice === 'ultra';
  return { choice: told ? DEFAULT_QUALITY : choice === 'low' ? 'low' : DEFAULT_QUALITY, told };
}

/** The stored choice, or Auto: nothing stored, something unknown, or a storage that throws. */
export function readQualityChoice(storage) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return DEFAULT_QUALITY;
    const v = s.getItem(QUALITY_KEY);
    return QUALITY_CHOICES.includes(v) ? v : DEFAULT_QUALITY;
  } catch {
    return DEFAULT_QUALITY;
  }
}

export function writeQualityChoice(storage, choice) {
  try {
    const s = storage === undefined ? globalThis.localStorage : storage;
    if (!s) return false;
    if (choice === DEFAULT_QUALITY || !QUALITY_CHOICES.includes(choice)) s.removeItem(QUALITY_KEY);
    else s.setItem(QUALITY_KEY, choice);
    return true;
  } catch {
    return false;
  }
}

/**
 * The short note beside the row: on Auto, what Auto is wearing now ("Auto: High"); on a manual
 * choice nothing, because the pressed button already says it. `words` is COPY.quality.
 */
export function qualityNote(plan, words) {
  if (!plan || plan.choice !== 'auto') return '';
  const name = plan.stripped || plan.tier <= 0 ? words.choices.low : plan.tier === 1 ? words.choices.medium : words.choices.high;
  return words.autoNow.replace('{tier}', name);
}
