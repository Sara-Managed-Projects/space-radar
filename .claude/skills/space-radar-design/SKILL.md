---
name: space-radar-design
description: Load before any UI, page, panel, control or CSS work on a Space Radar site — the map at www.spaceradar.ai and its static pages, the journal (blog.spaceradar.ai), games.spaceradar.ai, models.spaceradar.ai or video.spaceradar.ai — and before writing a brief for such work. It gives the shared control set, the rules every page is held to, what to read first, and the pictures and tests to run before reporting.
---

# Space Radar design

Every Space Radar site has one look: the journal's. Its tokens are `site/css/tokens.css` (public repo, the
canonical copy; the kit vendors it byte for byte) and its controls are `site/css/controls.css`, which is the
same file as the controls block of the kit's `web-kit/css/components.css` (internal repo). Build with them
from the start: a page that invents its own button is sent back.

## Read first

1. `docs/UI_COMPONENTS.md` (public): every control, when to use it, its markup, do and don't, pictures.
2. `docs/DESIGN_PRINCIPLES.md` (public): the ten interface rules, honesty about data, the budgets.
3. `web-kit/DESIGN.md` and `web-kit/README.md` (internal): the kit, page layouts, type scale, SEO checklists.
4. The specimen, `tools/ui-specimen.html` (public): serve the repo (`python3 tools/serve.py . 8190`) and open
   `http://127.0.0.1:8190/tools/ui-specimen.html`.

## The rules

- **Use the shared control set; never invent a one-off.** `.ui-btn` (`--primary`, `--secondary`, `--ghost`,
  `--quiet`, `--icon`, `--sm`, `--tile`, `--block`), `.ui-seg` + `.ui-seg__btn`, `.ui-select`, `.ui-radio`,
  `.ui-check` in `.ui-opt`, `.ui-range`, `.ui-close`, `.ui-pop` (`__head`, `__title`, `__body`, `__sect`,
  `__eyebrow`, `__note`, `__foot`), `.ui-row`, `.ui-chip`. A page lays them out with its own classes (grid,
  flex, margins, width); it never changes their colours, corners, heights or type. A control the set lacks is
  added to the set (controls.css, the kit, the specimen, UI_COMPONENTS.md and the tests), never beside it.
- **One ember action per view.** `.ui-btn--primary` is the view's one main action. Blue (`--atm`) is for
  links, the focus ring and what is selected. No corner brackets, no second orange button.
- **Selected state is an attribute.** `aria-pressed`, `aria-checked`, `aria-selected`, `aria-expanded` or
  `:checked`, set by the script and read by the CSS. Never an `is-on` class for the look.
- **Tokens only.** Colours, sizes, corners and durations come from tokens (`--sr-*` on the map, the kit's
  names elsewhere). No hex, rgba or named colour in a rule; no literal font size, radius or duration.
- **The 4 px grid.** Spacing is 4, 8, 12, 16, 24, 32 (`--sp-1` to `--sp-6`); controls are 40 and 32 px.
- **44 px touch targets** on `pointer: coarse` (the set does it: a small control gets a hit area).
- **Visible focus.** The 2 px blue ring on every focusable thing; never `outline: none` without a replacement.
- **Reduced motion.** Nothing moves under `prefers-reduced-motion`. Nothing loops, bounces or glows; the two
  named exceptions are the rail's Games breath (`.sr-rail__btn--games::before`) and the Buy Me a Coffee cup's
  tilt and coin hop (`css/coffee.css`, under 1 s of every 8), both the maintainer's requests.
- **The Buy Me a Coffee link is one shared piece:** `templates/partials/coffee.html` (markup) and
  `site/css/coffee.css` (public), the kit's `COFFEE` and the "coffee" block of `components.css` (internal), byte
  for byte. Never a second copy, never a widget or script from the service.
- **Dark only.** No light theme, no `prefers-color-scheme` branch.
- **Words** live in the copy files (`site/js/copy/en.js` on the map), in all its languages; no literal
  strings in `site/js/ui`. Sentence case, no exclamation marks, a line of chrome is 60 characters or fewer.
- **Icons** are the one family (`site/js/ui/icons.js`, Lucide on the 24 box, stroke 1.75, `aria-hidden`);
  an icon-only button has an `aria-label` and a `title`. A close is `.ui-close` with `icon('x')`, never `×`.
- **The map's boot graph is a budget** (`registry/budgets.yaml` `deployed_boot_js_bytes`). New UI loads with
  `import()` on first use; measure with
  `T=$(mktemp -d) && python3 scripts/minify_site.py --site site --out $T/min --node node --esbuild auto && node scripts/check_built_tree.mjs --built $T/min`
  and raise a cap only with a measured reason in the file's style.

## Before reporting

1. Render the change at **desktop 1440 × 900** and **phone 390 × 844**, before and after, with headless
   Chrome: `node tools/cdp.mjs <url> <probe.js> --width=1440 --height=900 --shot-dir=<dir>` (and `--mobile
   --width=390 --height=844`); `tests/probes/look/ui-system.js` after `_prelude.js` walks the app's panels.
   On a loaded machine run one render at a time, in the background, capped at 30 minutes.
2. Look at every picture next to the specimen: the same pills, heights, line, type and focus ring; one ember
   action; nothing cut, wrapped badly or overlapping. Fix what is off and render again.
3. Run, and say the results: `node tests/test_controls.mjs`, `node tests/test_tokens.mjs`,
   `node tests/test_touch_targets.mjs`, `node tests/test_a11y_static.mjs`, `node tests/test_guide_rails.mjs`
   (public repo; node is `$HOME/space-radar-handoff/seed/bin/node` on the maintainer's laptop). In the
   internal repo also `node web-kit/tests/test_webkit.mjs --public <public checkout>` and the site's own tests.
4. Put the pictures in the report, with what was left inconsistent and why.

## Process

- Work in a git worktree from `origin/main`; commit locally and often with a neutral identity, plain
  messages, no attribution lines and no personal names in files.
- **Kill only processes you started, by the PID you recorded.** Never by name or pattern (`pkill`,
  `killall`, `ps | grep | kill`): a pattern once killed a live deploy.
- No push, deploy or package install unless the brief says so. Never print a secret.
