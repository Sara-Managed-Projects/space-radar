# Add a simulator to the Space Radar Lab

The [Lab](https://www.spaceradar.ai/lab/index.html) is a shelf of small space simulators: one page, one idea, one file
(`site/lab/<name>/index.html`). You can add one in about ten minutes, with no install and no build step. It is the easiest
first contribution to Space Radar, and you will be named in the release notes for it.

## In ten minutes

1. **Pick one idea** a 12-year-old can understand from one picture and one slider. Not sure what? Take a task from
   [the open ones](https://github.com/Sara-Managed-Projects/space-radar/labels/track%3Alab): each has the formula, its source and
   what "done" looks like. Or [propose your own](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=simulator.yml).
2. **Copy the starter.** `site/lab/_template/index.html` is a working simulator (the same jump on Earth and on the Moon).

   ```bash
   git clone https://github.com/Sara-Managed-Projects/space-radar.git && cd space-radar
   cp -r site/lab/_template site/lab/my-idea          # the folder name is the address: lowercase words and hyphens
   python3 -m http.server 8177 --directory site       # open http://localhost:8177/lab/my-idea/index.html
   ```

   No terminal? On GitHub press Add file, Create new file, type `site/lab/my-idea/index.html` and paste in the starter's text.
   Say so in your pull request and a maintainer regenerates the list for you (see "The index builds itself").
3. **Change section 1 of the file** (the first half of the `<script>`): the numbers, the words and the drawing. Leave section 2
   (the page) alone. Change the `<title>`, the lesson (`<meta name="description">`), the category, and the `Sources` comment.
4. **Run the checks** (below), then **open a pull request**. A person answers within 48 hours.

## The rules

They are few, and `tests/test_lab.mjs` reads your file to hold the ones that can be checked by reading.

- **One file.** `site/lab/<name>/index.html`, nothing beside it: no image, no second script. Inline CSS and JavaScript.
- **No libraries and no network.** No `fetch`, no `<script src>`, no CDN, no web fonts of your own, no analytics. The only thing a page may
  link is the site's own stylesheet `../../css/fonts.css` (it brings the site's Inter and Barlow faces, and the page works without it).
  A web address may appear in code only as a link a visitor can click (`<a href="https://...">`); sources go in the comment.
- **Small.** Under about 200 lines and 26 000 bytes in all. If it does not fit, it is two ideas: make two simulators.
- **One lesson**, in one sentence a 12-year-old understands, in `<meta name="description" content="...">`. It is also the card on the list.
- **Every constant has a source, and the date you read it.** In the HTML comment that starts with `Sources, read on YYYY-MM-DD:`
  write the page address (`https://...`), the table or row, and the number you took, as it is written there. Nothing from memory.
  Show a check: the formula worked by hand for one value, so a reviewer can see the page computes what the source says.
  That comment becomes the visitor's "How this was made and sources" panel.
- **An honesty line**: `honest:` in section 1 says what is and is not to scale ("Sizes are to scale, distances are not."). It is shown under the picture.
- **Works by touch and keyboard.** The page already has a Pause button, a time slider and (if you set `param`) a value slider, all of them native
  controls. Do not add a control that needs a mouse or a hover. Text on the picture stays at 34 units or more; the page scales it.
- **Honours reduced motion.** The page does (it starts paused on the answer); keep that when you change it.
- **Measured, computed or imagined**: say which, in the honesty line. A model is a model.

## What the page gives you

Section 2 draws a 1080 unit wide stage (you see the band `y` 270 to 1470), loops `t` over `dur` seconds, and calls your code:

| You write (`const SIM = {...}`) | It is |
|---|---|
| `dur`, `reveal` | seconds in the loop; the second at which the point of the animation shows |
| `hook` | the headline drawn on the picture: one or two lines of at most 24 characters, split with `\|` |
| `honest` | the honesty line |
| `param` | optional slider `{label, min, max, step, value}`; its value arrives as the third argument of `draw` |
| `line(P, t)` | the caption under the picture: a sentence with the live numbers in it |
| `draw(c, t, P)` | draws on the 2D context `c`; helpers: `text(s, x, y, size, colour, weight, align)`, `wrap(...)`, `disc(c, x, y, r, colour)`, `glow(...)`, `stars(c)`, `ease`, `seg`, `lerp`, `clamp` |

Colours: `EMBER` `#ff9f43` for what the lesson is about, `INK` for text, `DIM` for the quiet. They are the site's.

## The index builds itself

You never edit the list. [`scripts/gen_lab_index.py`](../scripts/gen_lab_index.py) reads the head of every
`site/lab/*/index.html` (title, lesson, category) and writes `site/lab/index.html`; the sitemap lists your page by itself,
and the deploy ships the folder. So after you add or rename a simulator, run:

```bash
python3 scripts/gen_lab_index.py        # rewrites site/lab/index.html; commit it with your file
```

The category is one of the names at the top of that script (add one in the same pull request if yours is new).

## The checks to run

```bash
node tests/test_lab.mjs                  # your file obeys the rules above; it also RUNS draw() on a recording canvas
python3 scripts/gen_lab_index.py --check # the list is current
```

Both are in CI. `test_lab.mjs` tells you which rule and which line of thought failed, in plain words. Then open the page at a
phone width (about 390 px) and at a laptop width, press Tab through the controls, and drag both sliders: nothing should overlap,
no number should read `NaN`, and the caption should say what the picture shows.

## Pull request

Title: `Lab: <name>`. Say in the description what the lesson is and where the numbers came from. A new simulator does not need any
other file to change. If you used an AI assistant, that is welcome: you still own the sources, so open each source page and check the number.

Questions: [Discussions](https://github.com/Sara-Managed-Projects/space-radar/discussions), or comment on the task you picked.
