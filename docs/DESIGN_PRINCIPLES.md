# Design principles

One page on the bar a change has to clear. It is short on purpose; when it does not answer your
question, open an issue and ask.

## 1. Honesty about data

Space Radar is used to learn, so what it shows has to be either true or plainly labelled.

- **Three kinds of drawing, always named.** *Measured*: a position worked out from a publisher's
  data of a stated age. *Modelled*: computed from physics or a fitted orbit, with the error
  measured where we could. *Illustrative*: a picture built to explain (the Milky Way's spiral, a
  procedural satellite shape). A card says which, in one small line at its foot.
- **Age is part of the number.** "Position propagated from elements 6 days old" stays on
  the card. A saved copy is drawn at once and labelled as a copy.
- **Scale lies are admitted.** A satellite drawn at true size would be invisible; where something
  is drawn larger than life, the app says so.
- **Missing is shown as missing.** "Could not look", "—", or the line left out. Never a guess
  dressed as a reading, never an empty layer presented as an empty sky.
- **Every fact has a source and a read date in its registry row. Every asset has a licence and a
  line in [CREDITS.md](../CREDITS.md).** CI refuses a row without them.
- **Publishers are treated with respect.** Their rate limits are honoured by a cache (CelesTrak
  allows one download per file per two hours); nothing is hot-linked without CORS and terms that
  allow it.
- **Nobody is tracked.** No accounts, no analytics cookies, no personal data in any request.

## 2. The interface, in brief

Ten rules, in priority order. When two collide, the earlier one wins.

1. **The scene is sovereign.** Panels float over it and never resize, crop or tint it.
2. **One place for everything.** One sidebar, one object card, one tool rail, one time pill. New
   content goes into one of those, not into a new floating panel.
3. **One primary action per view.** At most one filled accent button on screen.
4. **Numbers are the hero.** A card leads with the three values that matter, large, in the
   monospace face, units small beneath.
5. **No prose in chrome.** A line of interface is one line long (60 characters or fewer).
   Explanations live in the card's "About it" and in the sources sheet.
6. **Show the state of the system, quietly.** Live or not, fresh or stale: always visible, never
   loud.
7. **Honesty lines stay, and stay small.**
8. **Legible over the brightest cloud.** Text 4.5:1, controls 3:1 (WCAG 2.2 AA), measured over
   white, not over black space.
9. **Easy to hit, easy to reach.** 44 px targets on touch, 24 px minimum anywhere; everything
   reachable by keyboard, with a visible focus ring.
10. **Calm motion with a reason.** Motion shows where something came from. Nothing loops, bounces
    or glows, and `prefers-reduced-motion` turns it into a fade.

In practice:

- **Colours, sizes, radii and durations come from the tokens** in `site/css/` (the `--sr-*`
  custom properties). No new hex value, pixel size or easing curve in a component.
- **One accent colour**, two greys, three typefaces (Inter for text, Barlow Semi Condensed for
  small labels, JetBrains Mono for numbers). Names and titles are set in the sans faces.
- **Words**: plain, present tense, sentence case. "Height", not "apogee", in a label. No
  exclamation marks, no emoji, no marketing adjectives. Numbers group in threes with a thin space
  (`27 576`), kilometres first, UTC in the interface. All of it lives in `site/js/copy/en.js`.
- **The phone is not a small desktop.** Below 900 px the sidebar becomes one sheet with three
  heights. Check both before you call a visual change done.

## 3. Performance budgets

Budgets live in [`registry/budgets.yaml`](../registry/budgets.yaml), each with a reason and a
date, and tests hold them. A budget may be raised only by a change that says why.

| Budget | Value | Why |
|---|---|---|
| Bytes on a first visit | 5.6 MB | It has to open on a school connection. |
| Audio and share pictures at boot | 0 bytes | Nothing is fetched before a visitor asks for it. |
| Fonts at boot | 90 kB | Latin subsets of the faces the first screen uses. |
| Map tiles on a first visit | 0 requests | Tiles load only when the camera is close. |
| Draw calls at a trip stop | 120 | 30 frames a second on a mid-range phone. |
| Triangles at a trip stop | 250 000 | The same. |
| One trip's narration | 1.2 MB | What a visitor who hears a whole trip downloads. |

What follows from them:

- **New features load with a dynamic `import()`** when they are first used, never at boot. After
  changing a static import, run `python3 scripts/gen_modulepreload.py`.
- **Thousands of objects are a handful of instanced meshes.** A new layer joins an existing
  instanced glyph; it does not add a mesh per object.
- **The app protects slow devices by itself**: it measures frame time and lowers detail. Do not
  add an effect that cannot be switched off by that mechanism.
- **Assets are sized for where they are seen**: WebP pictures, Opus audio, meshopt-compressed
  models, decimated to the triangle budget in their `registry/models.yaml` row.
