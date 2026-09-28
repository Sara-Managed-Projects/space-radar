# Design

## What already flies

`site/js/ui/trip.js` is the machine: `pause(reason)`, `resume()`, `back()`, `next()`,
`replay()`, `jumpTo(index)`. Pausable phases are flight, settle, dwell, held. Pause freezes a
running flight in place; resume re-flies after a camera wander (or after a held/flight pause)
and restores the stop’s card if the visitor selected something else. A trip that owns the clock
(spec 0030) pauses and releases that clock with the trip.

`site/js/ui/tripframe.js` is the letterbox: Pause/Play first in tab order, then Back, Next,
Replay, Share, Hide card; Mute and Leave in the top bar; progress count + segments; pause chip
with Resume. Keyboard: Escape leaves, arrows step stops, Space toggles pause, `c` collapses the
card, `r` replays. Copy lives in `site/js/copy/en.js` (`COPY.trip.*`).

## The two seams this card changes

### 1. Progress stays up while paused

Today `render()` does:

- `parts.progress.hidden = showPanel || st.phase === 'paused'`
- `parts.chip.hidden = st.phase !== 'paused'`

So the chip **replaces** the progress row. Change that so `parts.progress` stays visible whenever
controls are visible (hide only on intro/outro panels). Keep the chip; place it so it does not
steal the counter’s row — below or beside the progress strip inside the bottom bar, without
wrapping the control buttons into a second cramped line on a 390 px phone. Measure at
1280×800 and 390×844 after the CSS tweak.

Pause/Play in the control row remains the WCAG pause control; the chip remains the clear
“you paused / Resume” signal after camera input. Both stay.

### 2. Counter wording

`COPY.trip.stopOf` becomes `stop {n} of {count}`. Align `liveLabel` and `docTitle` so a screen
reader and the document title say the same shape (keep the stop title where those strings already
carry it). `check_copy.py` continues to own user-visible strings.

## Tests

Prefer extending an existing trip machine test (for example `tests/test_stop_time.mjs` or
`tests/test_contract.mjs`) rather than a new browser harness:

1. Start a short fixture tour; advance into a dwell; `pause('control')` → phase `paused`; with
   `ownsClock`, clock held; resume → advance continues.
2. `back()` / `next()` move `state.index` by one; back disabled at 0 via the frame’s own flag.
3. After pause, the frame’s count text (or the pure copy helper) is `stop N of M` and the progress
   node is not hidden.

Headless Chrome via `tools/cdp.mjs` (block live feeds as other trip PRs do) is the acceptance
gate for “Ivan can … with mouse, touch, or keyboard” — click Pause/Back/Next, press Space and
arrows, confirm the counter while paused. Phone width included.

## Unchanged on purpose

- Camera input still pauses, never exits.
- Escape still leaves immediately without moving the camera.
- Browser Back is still not Previous Stop (`replaceState` / urlstate contract).
- No README edit in the implement PR.
