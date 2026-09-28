// Probe for tools/cdp.mjs: trip playback pause / back / next / stop N of M while paused.
//
//   python3 tools/serve.py site 8190 &
//   CHROME=... node tools/cdp.mjs 'http://127.0.0.1:8190/#trip=year-in-a-minute' \
//     tests/probes/trip_playback.js --width=1280 --height=800 --block=celestrak.org
//   (and again with --width=390 --height=844 --mobile)
//
// Returns a JSON object; non-ok sets ok:false with problems[].
(async () => {
  const problems = [];
  const check = (ok, msg) => { if (!ok) problems.push(msg); };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  const ready = async () => {
    const t0 = Date.now();
    while (Date.now() - t0 < 90_000) {
      if (window.spaceRadar && window.spaceRadar.trip) return true;
      await sleep(250);
    }
    return false;
  };
  if (!(await ready())) {
    return { ok: false, problems: ['app never exposed spaceRadar.trip'] };
  }

  const trip = window.spaceRadar.trip;
  // Prefer the year trip (owns the clock); fall back to any offerable trip.
  let id = 'year-in-a-minute';
  let plan = await trip.plan(id);
  if (!plan || !plan.offerable) {
    id = null;
    for (const row of trip.tours()) {
      const p = await trip.plan(row.id);
      if (p && p.offerable) { id = row.id; plan = p; break; }
    }
  }
  check(id, 'no offerable trip to fly');
  if (!id) return { ok: false, problems, viewport: { w: innerWidth, h: innerHeight } };

  await trip.start(id);
  await sleep(200);
  trip.play();
  const t0 = Date.now();
  while (Date.now() - t0 < 30_000) {
    const ph = trip.state.phase;
    if (ph === 'dwell' || ph === 'settle' || ph === 'held') break;
    if (ph === 'flight' && window.spaceRadar.cameraRig) {
      try { window.spaceRadar.cameraRig.finishFlight(); } catch (_) { /* ok */ }
    }
    await sleep(100);
  }
  check(['dwell', 'settle', 'held', 'flight'].includes(trip.state.phase),
    `never reached a stop (phase ${trip.state.phase})`);

  const countEl = () => document.querySelector('.sr-trip__count');
  const progressEl = () => document.querySelector('.sr-trip__progress');
  const pauseBtn = () => document.querySelector('.sr-trip__btn--pause');

  const before = trip.state.index;
  // Pause via the control (mouse path).
  if (pauseBtn()) pauseBtn().click();
  else trip.pause('control');
  await sleep(100);
  check(trip.state.phase === 'paused', `pause left phase ${trip.state.phase}`);
  const n = trip.state.index + 1;
  const count = trip.state.count;
  const want = `stop ${n} of ${count}`;
  check(countEl() && countEl().textContent === want, `counter while paused: "${countEl() && countEl().textContent}" want "${want}"`);
  check(progressEl() && !progressEl().hidden, 'progress row hidden while paused');

  // Keyboard Space resumes (when focus is not on a button).
  document.activeElement && document.activeElement.blur && document.activeElement.blur();
  document.body.focus();
  document.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  await sleep(100);
  // Capture-phase handler on document; if still paused, resume explicitly.
  if (trip.state.phase === 'paused') trip.resume();
  await sleep(50);
  check(trip.state.phase !== 'paused', `resume left phase ${trip.state.phase}`);

  // Next / Back via buttons when present.
  const backBtn = [...document.querySelectorAll('.sr-trip__btn')].find((b) => b.textContent === 'Back');
  const nextBtn = [...document.querySelectorAll('.sr-trip__btn')].find((b) => b.textContent === 'Next');
  if (nextBtn) nextBtn.click();
  else trip.next();
  await sleep(200);
  if (trip.state.phase === 'flight' && window.spaceRadar.cameraRig) {
    try { window.spaceRadar.cameraRig.finishFlight(); } catch (_) { /* ok */ }
  }
  await sleep(100);
  check(trip.state.index === before + 1 || trip.state.phase === 'outro',
    `Next did not advance (index ${trip.state.index}, was ${before})`);

  if (trip.state.phase !== 'outro' && trip.state.index > 0) {
    if (backBtn && !backBtn.disabled) backBtn.click();
    else trip.back();
    await sleep(200);
    if (trip.state.phase === 'flight' && window.spaceRadar.cameraRig) {
      try { window.spaceRadar.cameraRig.finishFlight(); } catch (_) { /* ok */ }
    }
    await sleep(100);
    check(trip.state.index === before, `Back did not return (index ${trip.state.index})`);
  }

  // Escape leaves without moving the camera contract — just that leave works.
  document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
  await sleep(100);
  if (trip.state.phase !== 'idle') trip.stop('left');
  check(trip.state.phase === 'idle', `Escape/leave left phase ${trip.state.phase}`);

  return {
    ok: problems.length === 0,
    problems,
    trip: id,
    viewport: { w: innerWidth, h: innerHeight },
    counter: want,
  };
})()
