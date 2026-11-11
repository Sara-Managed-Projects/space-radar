# UI components: the control set

Every button, choice, field and panel part on every Space Radar site comes from one stylesheet,
[`site/css/controls.css`](../site/css/controls.css). It is the design kit's control set, the same file
byte for byte as the controls block of the kit (`web-kit/css/components.css`, internal repository), and it
is written in the kit's token names (`site/css/tokens.css`: `--tx`, `--dim`, `--line`, `--panel`, `--atm`,
`--ember`, `--ink`, `--ink-ember`, `--sans`, `--cap`, `--mono`). The map defines those names in
`site/css/ui.css` `:root` as its own `--sr-*` values, so the same classes look the same on the map, the
static pages, the journal and games.

Read this with [DESIGN_PRINCIPLES.md](DESIGN_PRINCIPLES.md). The specimen of every control in every state is
[`tools/ui-specimen.html`](../tools/ui-specimen.html) (`python3 tools/serve.py . 8190`, then
`http://127.0.0.1:8190/tools/ui-specimen.html`):

| desktop, 1440 × 900 | phone, 390 × 844 |
|---|---|
| ![The control set at 1440 px](images/ui/specimen-desktop.png) | ![The control set at 390 px](images/ui/specimen-phone.png) |

## The rules, in one place

- **One ember action per view.** `.ui-btn--primary` fills one button on a view: Start recording, Save
  picture, Guided trip, a card's first action. A second one on the same surface is two primaries.
- **Blue is links, focus and what is selected.** Every control draws the same 2 px `--atm` focus ring
  (`:focus-visible`); a selected segment, a pressed toggle, an open menu, a ticked box and the current
  row all wear the same blue wash. The ember corner brackets are gone.
- **Pills.** Buttons, segments, selects and chips are fully round; rows take 12 px corners, a plain
  popover 20 px, a checkbox 6 px.
- **The 4 px grid.** Heights 40 and 32 px, paddings 16, 12, 8 and 4, gaps 8 and 4.
- **44 px to a finger.** On `pointer: coarse` the 40 px controls grow to 44; the small ones (32 px) and
  the close button keep their look and reach 44 with a hit area (`::after`, `inset: -8px`).
- **Tokens only.** No colour, size, corner or duration is written in a control; a page that needs a new
  look adds it to the set (this file, the kit, the specimen and the tests), never beside it.
- **Lay out, never restyle.** A page places controls with its own classes (`.sr-make__acts`,
  `.sr-share__acts > .ui-btn`): grid, flex, margins, a width. It does not change their colours, corners,
  heights or type.
- **Reduced motion and dark only.** Under `prefers-reduced-motion` nothing in the set transitions. There
  is no light theme.

`tests/test_controls.mjs` refuses a `<select>`, a radio, a checkbox, a slider or a close button built in
`site/js/ui` without its class, a `×` typed as a button's text, and every retired class (the brackets,
`.sr-btn`, `.sr-make__btn`, `.sr-act`, `.sr-chip`, `.sr-density__btn` and the rest). `test_tokens`,
`test_guide_rails`, `test_touch_targets` and `test_a11y_static` read `controls.css` with the other sheets.

## The controls

### Button: `.ui-btn`

When: any action. A link that is an action can wear it too (`<a class="ui-btn">`).

```html
<button class="ui-btn ui-btn--primary" type="button">Start recording</button>  <!-- the one ember action -->
<button class="ui-btn" type="button">Save</button>                            <!-- the default, a quiet pill -->
<button class="ui-btn ui-btn--secondary" type="button">Back to where you were</button>  <!-- blue: a toast's action -->
<button class="ui-btn ui-btn--ghost" type="button">All</button>                <!-- an outline: bulk and minor actions -->
<button class="ui-btn ui-btn--quiet" type="button">Sources</button>            <!-- words only -->
<button class="ui-btn ui-btn--icon" type="button" aria-label="Share" title="Share"><svg …/></button>
<button class="ui-btn ui-btn--sm" type="button">Small</button>                 <!-- 32 px -->
<button class="ui-btn" type="button" aria-pressed="true">Sound: on</button>     <!-- a toggle, on -->
<button class="ui-btn ui-btn--tile" type="button"><svg …/><span class="ui-btn__label">Fly to</span></button>
```

| class | what |
|---|---|
| `.ui-btn` | 40 px pill, Inter 600 14 px, a faint wash and a hairline; hover rings it blue |
| `--primary` | ember fill, dark ink: the view's one main action |
| `--secondary` | blue wash and ring |
| `--ghost` / `--quiet` | outline only / words only, in the dim grey |
| `--icon` | round, as wide as it is tall; give it `aria-label` and `title` |
| `--sm` | 32 px, 13 px type |
| `--tile` | an icon over a short label, 56 px, 12 px corners: a card's row of actions, the welcome's three ways in |
| `--block` | the row's whole width |
| `__label` | the words, cut with an ellipsis when the button is narrow |
| `aria-pressed="true"`, `aria-expanded="true"` | the selected look |

Do: one `--primary` per view; an icon from the app's set (`ui/icons.js`, the 24 box, stroke 1.75); a name
on every icon-only button. Don't: a second ember button; an underlined text button posing as a link; a
button that changes its own colours for one page.

### Segmented choice: `.ui-seg` and `.ui-seg__btn`

When: one choice of a few, always visible (Eye / Camera / Deep, On / Off, a panel's tabs).

```html
<div class="ui-seg ui-seg--block" role="group" aria-label="Exposure">
  <button class="ui-seg__btn" type="button" aria-pressed="true">Eye</button>
  <button class="ui-seg__btn" type="button" aria-pressed="false">Camera</button>
</div>
<div class="ui-seg ui-seg--block" role="tablist"><button class="ui-seg__btn" role="tab" aria-selected="true">Explore</button>…</div>
```

The selected one is the one with `aria-pressed`, `aria-checked` (`role="radio"`) or `aria-selected`
(`role="tab"`) set to `true`: the script sets the attribute, the CSS reads it, so what a screen reader is
told and what is drawn cannot disagree. `--block` spreads the pills across the row; `--wrap` lets a long set
wrap (12 px corners). Don't: a class like `is-on` for the selected look; more than about five choices (use a
select).

### Select: `.ui-select`

When: one choice of many, or a choice that does not need to be visible all the time.

```html
<label class="sr-make__field"><span class="ui-pop__eyebrow">Length</span>
  <select class="ui-select ui-select--block">…</select></label>
```

A native `<select>` with `appearance: none`, a chevron, the pill, the hairline and the focus ring, so a
phone draws it the same as a desktop (it did not before). 16 px type on touch, so iOS does not zoom.
`--sm` is 32 px; `--block` fills the row. The options are dark where the browser allows. Don't: a custom
listbox; a select without a visible label or an `aria-label`.

### Radio and checkbox: `.ui-radio`, `.ui-check`, in `.ui-opt`

When: a radio for one of a list read top to bottom (Record's source), a checkbox for on or off.

```html
<div role="radiogroup" aria-label="What to record">
  <label class="ui-opt"><input class="ui-radio" type="radio" name="src" checked> This view</label>
</div>
<label class="ui-opt"><input class="ui-check" type="checkbox"> Smooth (frame by frame)</label>
```

Native inputs, drawn: the keyboard, the screen reader and form posting are the browser's own. Ticked is the
blue fill; `indeterminate` is a dash. The `<label class="ui-opt">` is the target (44 px on touch). Don't: a
`div` with `role="checkbox"`; `accent-color` on a bare input.

### Slider: `.ui-range`

When: a quantity that answers as it moves (volume, the lens, a scrub).

```html
<input class="ui-range" type="range" min="0" max="100" aria-label="Volume">
```

A 4 px track and a 16 px blue thumb, 44 px tall on touch, `touch-action: pan-y` so a sheet still scrolls.
A slider that draws its own track (the photo compare) keeps the set's thumb. Give it `aria-label` and,
when the number needs words, `aria-valuetext`.

### Close: `.ui-close`

When: every close of a panel, popover, sheet, card, hint or note.

```html
<button class="ui-close" type="button" aria-label="Close Record" title="Close Record"><!-- icon('x') --></button>
```

32 px round, the icon set's `x` (`icon('x')` from `ui/icons.js`), a 44 px hit area on touch. Don't: a
typed `×`; a close that is a text link.

### Popover and panel: `.ui-pop`

When: a popover or a panel's parts: its head, its sections, its actions.

```html
<section class="sr-make sr-float ui-pop">            <!-- the surface is the host's: the map's glass -->
  <div class="ui-pop__head"><h2 class="ui-pop__title">Record</h2><button class="ui-close">…</button></div>
  <div class="ui-pop__body">
    <div class="ui-pop__sect"><p class="ui-pop__eyebrow">Shape</p>…</div>
    <div class="ui-pop__sect"><p class="ui-pop__eyebrow">Length</p>…<p class="ui-pop__note">…</p></div>
  </div>
  <div class="ui-pop__foot"><button class="ui-btn ui-btn--primary">Start recording</button></div>
</section>
```

The title is Barlow Semi Condensed 600 at 16 px; an eyebrow is the caps label (13 px, 0.14 em) in the dim
grey; sections after the first are split by a hairline. `--surface` gives a plain panel background where
there is no glass (a static page). Don't: an eyebrow over every line; a second close.

### Row: `.ui-row`

When: a row of a list that goes somewhere or opens something (Keys, a pass, an object under the pointer).

```html
<button class="ui-row" type="button"><span class="ui-row__t">Keys</span></button>
<button class="ui-row ui-row--plain" type="button"><span class="ui-row__t">ISS</span><span class="ui-row__meta">419 km</span></button>
```

44 px, 12 px corners, a wash on hover, a chevron (`--plain` for none, as the explore lists are: their value
is at the right). `aria-current` or `aria-selected` marks the current one.

### Chip: `.ui-chip`

When: a status or a tag (a span), or a filter you press (a button with `aria-pressed`, or `role="radio"` with
`aria-checked`).

```html
<span class="ui-chip">Measured</span> <span class="ui-chip ui-chip--atm">Live</span>
<button class="ui-chip" type="button" aria-pressed="true">Stars</button>
```

`--accent` tints it with the thing's own `--a`. Don't: a chip as an action button (use `.ui-btn--sm`).

## In the app

| | before | after |
|---|---|---|
| the rail, the head, the Games breath (two moments) | ![before](images/ui/before-desktop-rail-a.png) | ![after](images/ui/after-desktop-rail-a.png) ![after, 1.8 s later](images/ui/after-desktop-rail-b.png) |
| What to show | ![before](images/ui/before-desktop-whattoshow-foot.png) | ![after](images/ui/after-desktop-whattoshow-foot.png) |
| Record | ![before](images/ui/before-desktop-record.png) | ![after](images/ui/after-desktop-record.png) |
| Dome and 360 | ![before](images/ui/before-desktop-dome.png) | ![after](images/ui/after-desktop-dome.png) |
| a phone, the More menu | ![before](images/ui/before-phone-more.png) | ![after](images/ui/after-phone-more.png) |

The full set of pictures, desktop and phone, before and after (What to show, Record, Dome and 360, Share,
Find, a card, the email updates popover), is made by `tests/probes/look/ui-system.js` with `tools/cdp.mjs`.
