# Translating Space Radar

You do not need to be a programmer. If you can write good prose in two languages, you can
translate Space Radar. This page says what there is to translate, how to start, how to check your
work, and what is not ready yet. Where a step needs a tool you do not have, say so in your issue and
we will do that step for you.

**Status, honestly.** The site can speak ten other languages: `?lang=es`, `fr`, `de`, `pt` (Brazilian), `ru`, `uk`, `zh` (Simplified),
`hi`, `he` and `ar` (public #525 to
#534). Every one was drafted by a program from the English and
**no native speaker has read any of them yet**: the table below says so, and until two people have, the page offers a language only to a
visitor who asks for it (see "Review"); there is no language picker yet. Each file has every string of the interface, the cards, the glossary,
the trips' stops that are in `en.js` and the Moments. What is not translated in the app: the 30 trips' longer texts in `registry/tours.yaml` (their pages are, below), the spoken
voice, and the type phrases of the catalogue (a galaxy's "barred spiral galaxy" comes from the data in
English; only French has a table for them). A string that is not translated shows in English rather than as a gap. Writing a language now
is not wasted: the loader reads exactly the file you write.

<!-- translation-status:begin (node scripts/check-translation.mjs --write-doc) -->
| Language | File | Strings present | Changed from English | Review | Shown from the browser’s language |
| --- | --- | --- | --- | --- | --- |
| English | `en.js` | 4 529 (the source) | - | the source | yes |
| العربية (Arabic) | `ar.js` | 4 529 of 4 529 (100 %) | 4 178 (92.2 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Deutsch (German) | `de.js` | 4 527 of 4 529 (99.9 %) | 4 307 (95 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Español (Spanish) | `es.js` | 4 529 of 4 529 (100 %) | 4 344 (95.9 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Français (French) | `fr.js` | 4 528 of 4 529 (99.9 %) | 4 298 (94.8 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| עברית (Hebrew) | `he.js` | 4 529 of 4 529 (100 %) | 4 147 (91.5 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| हिन्दी (Hindi) | `hi.js` | 4 529 of 4 529 (100 %) | 4 384 (96.7 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Português (Brasil) (Portuguese (Brazil)) | `pt.js` | 4 528 of 4 529 (99.9 %) | 4 334 (95.6 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Русский (Russian) | `ru.js` | 4 529 of 4 529 (100 %) | 4 392 (96.9 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| Українська (Ukrainian) | `uk.js` | 4 529 of 4 529 (100 %) | 4 230 (93.3 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
| 简体中文 (Chinese (Simplified)) | `zh.js` | 4 529 of 4 529 (100 %) | 4 188 (92.4 %) | machine-translated, agent-reviewed (not native-reviewed) | yes |
<!-- translation-status:end -->

## What is translated, in order

1. **The interface and the cards** (`site/js/copy/en.js` and `en.later.js`): about 2 300 strings
   across 100 sections (counted 2026-10-09): buttons, menus, panel names, the words on an object's
   card. This is the first milestone, and it is already useful alone.
2. **The glossary** (`GLOSSARY` in the same file, from `registry/glossary.yaml`): the short
   explanations, each written for a curious 14-year-old and read aloud to a 9-year-old.
   Keep each key as it is (`"low Earth orbit"`): the card finds a term by its key, so a translated
   explanation shows on a card whose own text contains that English key; matching terms in your language is
   a separate piece of work.
3. **The trips** (`registry/tours.yaml`): 33 trips, about 11 000 words of titles, blurbs and cards.
   Each stop's words are what the voice reads. Do these after 1 and 2, one trip at a time.
4. **The pages a search engine reads** (the home page, the static pages, the trips, the Lab, the object, country and event pages): a
   catalog of their own, `registry/seo-i18n/`, and its own section below, ["The pages a search engine reads"](#the-pages-a-search-engine-reads).

## Start

```bash
git clone https://github.com/<you>/space-radar.git && cd space-radar
node scripts/check-translation.mjs --skeleton fr > site/js/copy/fr.js     # Node 22 or newer
```

(Use your own language code: `es`, `pt-BR`, `he`, `ar`, `zh-Hans`, `hi`, `ru`, `uk`, ...) If you
cannot run that, ask in the issue and a maintainer will send you the file; you can also edit on
GitHub with the pencil.

The file lists every key with the English text as its value. Replace the **values**. Never change a
key, never remove one, and never remove or rename a `{slot}`:

```js
"tagline": "Everything in motion around Earth, where it really is, right now.",   // translate
"sceneSelected": "A map of space drawn at real positions, with {name} selected: its card ...",
                                        // {name} is filled in by code: keep it, move it where your grammar wants it
```

(These two are in the `app` section of the file.)

## Working in pieces

`node scripts/translation-flat.mjs --out DIR` writes the whole English as small JSON files (`{"COPY.card.lead": "..."}`), twelve thousand
characters each, so a translator or a program can work a piece at a time and leave out what must stay. `--new <code> DIR "<own name>" <English name>`
builds `copy/<code>.js` from `DIR/<code>-NN.json` (and a `<code>-rules.js` and `<code>-notes.txt` if there are any); `--topup <code> DIR` adds the keys
an existing file lacks, as a block before its glossary. `--out DIR --missing <code>` lists only those keys.

## Check your work

```bash
node scripts/check-translation.mjs site/js/copy/fr.js            # lists missing keys, extra keys, lost {slots}
node scripts/check-translation.mjs site/js/copy/fr.js --strict   # also lists strings still identical to English
```

It reads only your file and the English. Names, numbers and "OK" may rightly be identical; the
list is for you to look through. A pull request is welcome even when it is not complete: say which
sections are done, and the checker's output will show the rest.

## Show it on the site

Three steps, and the first you already have.

1. Your file is `site/js/copy/<code>.js` (`es.js`, `pt-BR.js`). Fill in its `META`: your language's own name,
   the English name, and `review.status`: `human-drafted` if a person wrote it, `machine-drafted` if a program did.
2. Register the code in `LANGUAGES` in `site/js/copy/lang.js`: `{ locale: 'es-ES', pill: 'es-ES', reviewed: false }`.
   `locale` is the one dates and times are written in. `reviewed` stays `false` until the review below is done.
3. Open the map with `?lang=<code>` at the end of the address (`http://localhost:8000/?lang=es`) and look through it at a
   phone's width and a desktop's. A string you did not translate shows in English: the checker lists them.

Then `node scripts/check-translation.mjs --write-doc` puts your language into the table above. The same command with
`--check-doc` runs for every pull request and fails when a language is missing from the table or its review status has
changed (the counts move whenever the English does, so they are refreshed with `--write-doc`, not held).

How the page chooses (`site/js/copy/lang.js`): `?lang=` first (`es-MX` is read as `es`; `?lang=en` forces English; a
code nobody has written is English); else the browser's own list of languages, but only for a language marked
`reviewed`; else English. `<html lang>` follows (and `dir="rtl"` for Hebrew and Arabic). A first visit in English
fetches nothing extra: the language file loads only when a language is chosen, and it is never part of the first screen.

## Review

A translation is not offered from a visitor's browser language until **a second native speaker, or a named teacher,
has read all of it**, which is how the project keeps a model's or a newcomer's mistake from being what a family or a
classroom meets first. The rule, as the checker holds it:

- `META.review.status` is `machine-drafted` (a program wrote it) or `human-drafted` (one person did) until the second reader
  has finished; then it is `reviewed` and `META.review.by` lists both names (the author and the reader), and only then may
  `reviewed` in `LANGUAGES` be `true`. `node scripts/check-translation.mjs --check-doc` fails when `reviewed: true` has fewer
  than two names.
- A reviewer reads the **whole file as it appears on the screen** (`?lang=<code>`), not the list of strings, and says in the pull
  request what they changed. The honesty words (measured, worked out, modelled, illustrative, reconstructed, an artist's
  impression) must each mean the same, everywhere, as in English.
- Machine-drafted text is welcome: it is a head start for the people who can say which sentences no one would say.

## Rules that matter

- **Spacecraft, stars, catalogue entries and agencies keep the name they have** (Voyager 1, TRAPPIST-1 b, NASA JPL).
  The Sun, the Moon, the planets and the big moons keep the name your language has always given them (Júpiter, Ío, Titán in
  Spanish): that is what a reader of your language knows them by. Translate the words around the names.
- **Numbers and units are formatted by code**, not typed: leave slots such as `{name}` as they are. Do not turn "1 234 km" into your own digits by hand.
- **Keep the honesty rule.** A card says whether something is measured, modelled or an artist's
  impression; the translation must keep that sentence and its strength (see
  [CONTRIBUTING.md](../CONTRIBUTING.md#the-honesty-rules)). A translation that makes a model sound
  like a photograph is a bug.
- **Write for the ear**, for the trips: short sentences, plain words. The voice reads the card as it
  is, title then body.
- **Plural, "a/an", "3 minutes ago" and the compass words.** The comparison sentences, the compass points and the time words
  are strings like any other (`COPY.compareText`, `COPY.time`, `COPY.numberWords`): translate them and keep the length of each
  list. What cannot be a string is a function, and a language file may export them as `RULES` (see `site/js/copy/es.js`):
  `article(phrase)` for the "a/an" of a type word (Spanish needs the gender), `typeWords(text)`, and `plural(n, one, many)`
  for a language whose plural is not "one, else many". Write the rule in your pull request; copy/en.js asks `RULES` first.
- **Right-to-left languages** (Hebrew, Arabic): `?lang=he` and `?lang=ar` set `<html dir="rtl">` and link `css/rtl.css`, which only they
  fetch. It puts the sidebar on the right and the tool rail on the left, turns round the margins, rules and aligned text that
  `ui.css` wrote with a physical side, and moves the globe to the middle of what the sidebar leaves. Numbers, the clock pill and the time
  tape stay left to right. A right-to-left reader should look at the card, the Tonight tab, What to show and a trip at a phone's width and at a
  desktop's, and say what is still the wrong way round.
- **Chinese** is Simplified (`zh.js`, `<html lang="zh-Hans">`) until the script is chosen. A Traditional file is `zh-Hant.js` plus one row
  in `LANGUAGES` (the comment there says which); the page then reads `zh-TW`, `zh-HK` and `zh-Hant` as that file and `zh-CN` as Simplified.
  [docs/zh-hant-terms.txt](zh-hant-terms.txt) lists the mainland-only words to change.
- **Plurals with more than two forms** (Russian, Ukrainian, Arabic, Hebrew): the pair `plural(n, one, many)` is called with two strings, so
  a language puts the extra forms in the second string joined by `|` and its `RULES.plural` picks (`COPY.cls.minutesWord` is "минуты|минут" in Russian).
  A word that has no article in your language (`{a}`, `card.articles`, `r12Navigate.theWord`) is a zero-width space, `\u200b`: an empty string
  means "not translated" and shows the English.

## The pages a search engine reads

Every page in `sitemap-pages.xml` (about 650: the home page, the static pages, the 33 trips, the 106 Lab pages, the 354 object
pages, the 102 country pages and the 29 events) can be published again under `/<code>/` (`/es/`, `/es/iss/index.html`,
`/es/o/jupiter.html`, `/es/t/a-dark-sky.html`, `/es/lab/orbit-painter/index.html`), with `<html lang dir>`, a canonical of its
own, hreflang both ways and its own sitemap, `sitemap-pages-<code>.xml`, in the index. `scripts/seo_i18n.py` does it at every
deploy, from **one catalog of the English the pages say**:

- `registry/seo-i18n/en/<area>.json`: `{key: English}`, written by `python3 scripts/seo_i18n.py extract --built DIR --also DIR2,DIR3`
  from builds (`python3 scripts/build_seo.py --out DIR --no-share`), never by hand. A few sentences differ between a deploy's build
  and CI's: give `--also` a build made with `--snapshot-index` (the saved copies' sources and days) and one made without numpy (CI
  draws no paper globes), so the catalog holds both. Areas: `common` (on pages of several kinds: the header, the
  footer, the subscribe card), `home`, `static`, `trips`, `lab`, `objects`, `countries`, `events`, `names` (the names of the pages'
  subjects). `_context.json` says where each string is first seen. CI rebuilds the pages and runs `extract --check`: a sentence the
  pages say and the catalog lacks fails the build, so the catalog is never behind the pages.
- `registry/seo-i18n/<code>/<area>.json`: `{key: translation}`, the same keys, only the ones done. `<code>/_meta.json`: how the
  language writes numbers and dates, and the one line every translated page opens with.

**What a string looks like.** A string is one block of a page (a paragraph, a heading, a list item, a title, a description, an
alt text, a JSON-LD name) with its markup and its data taken out:

```json
"3f9a2c81d0": "It is <1>about {n1} km/h</1> on {d1}, {n2}° up.",
"77b10e4f2a": "{name} is a world in the solar system, about {n1} km across."
```

- `<1>…</1>` is a link or an emphasis around words; `<2/>` is a picture or a piece of code, which is never translated. Keep every
  one, move them where your sentence needs them.
- `{n1}`, `{n2}` are numbers and times, `{d1}` a date: code writes them in your language's style (`_meta.json`: `numbers` group and
  decimal marks, `groupMin` the shortest number that is grouped; `months`, `date`, `monthYear`, `dayMonth`; `monthsStandalone`
  where a month alone takes another form). Never type a number in.
- `{name}` is the page's own subject (Jupiter, France, an eclipse), translated once in `names.json`. Most spacecraft, stars and
  catalogue names keep their name (copy them); the Sun, the Moon, the planets and the big moons take your language's
  ("Júpiter", "Ío"); countries and events are translated. A `{name}` that opens a sentence is given a capital by code.
- The key is a hash of the English. When the English of a sentence changes, it is a new key: the old translation is no longer used.

**The rule of publishing.** A page is built in a language only when **every** string of its own text is translated (its head
and everything outside the header, nav and footer). Then it is in that language's sitemap and in every version's hreflang. One
missing sentence and the page is not built in that language at all; a missing footer string shows in English. The trips (which
send a browser on to the app) are built only where the home page is. These pages stay in English, each for its reason:

- `planets-tonight/index.html`: its sentences are worked out for the night of each build, so they cannot be a catalog.

A translated page opens with one line in its language saying it was machine-translated, linking the English original
(`_meta.json` `notice`). Its share picture is the English one, and so is that picture's alt text. It does not run
`js/pages/live.js` yet (that script writes its live sentences in English), so the place picker of the ISS, Starlink and event
pages is hidden there and the page keeps its dated sentences.

**Limits a translation must keep** (`scripts/check_seo.py` refuses the build otherwise): a title, with its ` | Space Radar`, of at
most 60 characters; a meta description of 70 to 160. The checker tells you which page.

### A translator's work, one language

You touch only `registry/seo-i18n/<code>/` (and, once it is reviewed, one line each in `site/js/copy/lang.js` and this file).
Nothing else, so ten translators can work at once.

```bash
python3 scripts/seo_i18n.py flat --out /tmp/fr --missing fr      # what French lacks, in pieces of about 12 000 characters:
                                                               # NNN-<area>.json (translate the values) and NNN-<area>.context.json
python3 scripts/seo_i18n.py merge fr /tmp/fr                     # back into registry/seo-i18n/fr/*.json; a lost {slot} or <tag> is refused
python3 scripts/seo_i18n.py check fr                             # lost or extra slots and tags, keys the English no longer has, _meta.json
python3 scripts/build_seo.py --out /tmp/seo --no-share && python3 scripts/check_seo.py --out /tmp/seo
python3 scripts/seo_i18n.py coverage --built /tmp/seo            # pages published per language; /tmp/seo/i18n-report.json lists what each page lacks
```

1. Fill `_meta.json`: `numbers`, `months`, the date patterns, `notice` (its link as `<1>…</1>`). They are drafted for every language.
2. Translate every piece, in context: `_context.json` names the page where each string is first seen. Keep names, numbers and
   the honesty words (measured, computed, modelled, illustrative, an artist's impression) as strong as the English.
3. `merge`, then `check`, then the build and `check_seo.py`; fix what they name (titles over 60 characters, most often).
4. The review pass, a fresh read against the English, string by string: terms, numbers, units, proper names, slots, and for `he`
   and `ar` a look at a page at 390 px, right to left. Then set `_meta.json` `status` to `machine-translated, agent-reviewed`.
5. Once reviewed, the language is shown from the browser's language: `reviewed: true` for it in `site/js/copy/lang.js`,
   `META.review.status: 'agent-reviewed'` in `site/js/copy/<code>.js`, and `node scripts/check-translation.mjs --write-doc`, which
   says "machine-translated, agent-reviewed (not native-reviewed)" in the table above.

## The narration (205 clips)

The trips are read aloud by a synthetic English voice (see `scripts/narrate.py` and the credit in
[CREDITS.md](../CREDITS.md)). **Text first, voice later:** a translated trip is shown with captions
and no voice until a voice for that language has been chosen, its licence read and its
pronunciation checked by a native speaker. If you speak the language well, your review of a
candidate voice is the most useful thing you can add.

## Who is working on what

Each language has an issue (label `translation`). Comment on it to say you are on it, so nobody
does the same work twice. Offering a language that has no issue yet:
[open the translation form](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=translation.yml).
Every translator is named in the release notes of the release that carries their language.
We answer within 48 hours.

## A phrase is wrong

Every language here is a draft, so a wrong phrase is expected. To report one without writing any code,
[open the form for a wrong phrase](https://github.com/Sara-Managed-Projects/space-radar/issues/new?template=mistranslation.yml):
pick the language, paste what it says now and, if you can, what a person would say. One phrase is enough, and a report in your own
language is fine. Fixing it yourself is one line in `site/js/copy/<code>.js` and a pull request.
