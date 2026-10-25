# 0022 — The kiosk watchdog restarts a dead picture — requirements

Card: [#502](https://github.com/Sara-Managed-Projects/space-radar/issues/502). #498 added the
watchdog for a screen that plays on its own. The exit criterion is a test that freezes or crashes
playback and shows the watchdog starting it again, with CI green.

## What is true today

Measured in this checkout (`2a9e9aff`), 25 Oct 2026. `node tests/test_autopilot.mjs`,
`node tests/test_autopilot_holds.mjs` and `node tests/test_autopilot_trip.mjs` all exited 0.

- A frozen flight on the stub trip is already recovered. In `tests/test_autopilot.mjs` section 7c
  a flight that never lands is left alone until `BUDGET.flight` (60 s). The next tick logs
  `action: 'next'`, `why: 'flight-never-arrived'`, calls `next()`, and a later stop is reached.
  A second stuck stop in that trip and the reel still reaches the next trip. CI runs this file
  as "A screen that plays on its own: the reel, the watchdog, the take-over (spec 0036)".
- On the real trip machine a flight whose arrival never comes is landed by the trip's own timer.
  `tests/test_autopilot_trip.mjs` section 4 expects the watchdog to stay silent there. The freeze
  regression is the stub in section 7c: the stub does not land itself, so the watchdog is what
  moves it.
- A WebGL context that stays lost is reloaded, and the address names the stop that was up.
  `tests/test_autopilot_holds.mjs` section 2 (pace 8, fixture `ah-a`, second stop) waits past
  `BUDGET.contextLost` (5 s), expects one reload, and expects `resumeFrom` to read trip `ah-a`
  at stop index 1. The pilot is then stopped. Nothing calls `start` with that address.
- A hand-written link with `trip` and `stop` does resume, on the stub, in
  `tests/test_autopilot.mjs` section 7h. That link is not the hash a crash just wrote.
- `read()` in `site/js/ui/urlstate.js` takes no argument. It reads `location.hash`. The call
  `read(storedHash)` in section 2 ignores `storedHash` and happens to work because the hash is
  still the one on `location`.
- `reel()` in the holds test sets `location.hash = ''` before `start`. `start()` writes
  `ambient` into the hash only when the reel was opened from the Trips row (`origin === 'row'`).
  A wall opens a link that already contains `ambient`. The holds harness does not.
- `watchdog()` itself, including `reload` / `context-lost` and `reload` / `trips-abandoned`, is
  decided in section 4 of `tests/test_autopilot.mjs`. Section 4 checks the action the function
  returns. The holds file is where `reload()` runs.

Live site, fetched Sun 25 Oct 2026 05:19 UTC. Both files last-modified Mon 12 Oct 2026 15:41 UTC,
gzip, served from CloudFront:

- `https://www.spaceradar.ai/js/ui/autopilotplan.js` contains `contextLost: 5000` and
  `why: "context-lost"`.
- `https://www.spaceradar.ai/js/ui/autopilot.js` contains `between-stuck`, `context-lost`, and
  the start path that resumes from the link.

The live files are minified. They were not diffed against this checkout.

Could not look: a browser on a wall. No kiosk was booted. The tests above are the measurement.

## Requirements

1. **R1 — the freeze stays the test it already is.** No second copy of section 7c. No change
   to the real trip so that a lost arrival waits for the watchdog. The implementation PR names
   the existing CI step and says it passed.
2. **R2 — a crashed picture reloads with a kiosk address.** One new case in
   `tests/test_autopilot_holds.mjs`. The hash before `start` is
   `#ambient=ah-a,ah-b&pace=8`, the way a wall opens. After the context has been lost long
   enough for one reload, the stored hash still contains `ambient=ah-a,ah-b`, `pace=8`,
   `trip=ah-a` and `stop=2`. `stop` is the digits `2` (1-based, the second stop). The reload
   log's `why` is `context-lost`. The machine has not moved to another stop.
3. **R3 — the next page plays that stop.** The first pilot is stopped. `location.hash` is set
   to the stored string, then `read()` is called with no argument. A new pilot is started with
   that object. The start log's `resume` is `ah-a:2`. The first `stop` log is stop 2 of `ah-a`.
   That boot does not reload, and its watchdog log is empty.
4. **R4 — CI runs the same file under a name that says so.** The existing step
   `node tests/test_autopilot_holds.mjs` keeps that command. Its name says that a context which
   is not handed back reloads, and the next start plays the stop that was on screen. No new job.

## Acceptance criteria

- A1. `node tests/test_autopilot.mjs` still exits 0, including section 7c (R1).
- A2. The new holds case fails if the stored hash drops `ambient`, `pace`, `trip` or `stop`,
  or if `stop` is not `2` (R2).
- A3. The new holds case fails if the second start's first stop is not stop 2 of `ah-a`, or
  if that boot reloads or logs a watchdog line (R3).
- A4. `node tests/test_autopilot_holds.mjs` exits 0, and the CI step name matches R4.
- A5. `node tests/test_autopilot_trip.mjs` still exits 0. Section 4 still expects a silent
  watchdog when the trip lands its own overdue flight.

## Out of scope

- Changing `BUDGET`, the watchdog's actions, or when a lost context reloads.
- `between-stuck` (90 s with no trip and no timer). No test reaches it. This card does not add one.
- The catch that skips a trip when `play`, `next` or `resume` throws.
- A browser, a screenshot, or a machine in a room.
- Writing `ambient` into the hash from `start()` for a link. The wall's own address already has it.
  The test seeds that address. It does not ask the product to invent one.
