# Give trip playback pause, back, and progress controls

## Problem

Timed trips such as “A year in a minute” keep advancing while someone is still looking.
The daily improvement card (issue 237, 2026-09-25) asked for pause/resume, previous/next stop,
and a labelled “stop N of M” so a visitor can inspect a moment or recover a missed chapter
without leaving the trip. It claimed the README only documents Start and Escape.

**Measured on `main` (code, 2026-09-28), that claim is wrong about the product.** The letterbox
already ships Pause/Play, Back, Next, Replay, a counter (`{n} of {count}`) with segment dots,
a “Trip paused” chip with Resume, and keyboard Space / ← / → / Escape. Camera drag and a tap
on another object pause; they never exit. Escape still leaves immediately and keeps the view.

What is still short of the exit criterion:

1. **While paused, the progress row is hidden.** The pause chip replaces it, so the visitor who
   stopped to look can no longer see how far through the trip they are.
2. **The counter wording is `{n} of {count}`**, not “stop N of M”.
3. **No automated test locks the control set** the exit criterion names (pause freezes advance;
   back/next move one stop; the labelled count stays readable while paused).

Filed by the daily improvement round of 2026-09-25; nobody clicked, so say so in the implement PR.

## Locked decisions

- Do not rebuild the letterbox control set. Keep the existing Pause/Play, Back, Next, Replay,
  progress strip, and pause chip; change only what the gaps above require.
- While paused, the stop counter stays visible. The pause chip must not replace the progress row.
- Counter copy becomes `stop {n} of {count}` (and the live/doc title lines that share the same
  shape stay consistent with that wording).
- Mouse, touch, and keyboard remain first-class: existing buttons, camera-pause, Space, arrows,
  Escape. No new gesture language.
- No scrubber and no loop. Discrete stops stay discrete (already rejected in the frame’s own
  comments; this spec does not reopen that).
- Do not edit `README.md` or any other markdown outside this `specs/` folder until the standing
  “no new markdown in this public repo” rule is lifted. Documenting the controls in the README
  is a follow-up, not this card.

## Acceptance

- [ ] During a running trip stop, Pause (button, Space, or camera input) stops automatic
      advancement; on a trip that owns the clock, the clock is held while paused.
- [ ] Back moves to the previous stop (disabled on the first); Next moves to the next stop
      (last Next still finishes the trip as today).
- [ ] The labelled counter reads `stop N of M` and remains visible while the trip is paused.
- [ ] Resume / Play continues from the same stop (re-fly after a camera wander, as today).
- [ ] Regression tests cover pause, back, next, and the paused counter text.
- [ ] Headless Chrome check on desktop and phone widths confirms the exit criterion above.

## Not in scope

- New trips, new stop kinds, or sound/share changes.
- A scrubber, loop, or chapter index panel.
- README or other product-doc markdown edits (blocked until the public-repo rule changes).
- Changing Escape / Leave semantics, or making camera input exit the trip.
