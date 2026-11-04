# Translating Space Radar

You do not need to be a programmer. If you can write good prose in two languages, you can
translate Space Radar. This page says what there is to translate, how to start, how to check your
work, and what is not ready yet. Where a step needs a tool you do not have, say so in your issue and
we will do that step for you.

**Status, honestly.** The site can speak ten other languages: `?lang=es`, `fr`, `de`, `pt` (Brazilian), `ru`, `uk`, `zh` (Simplified),
`hi`, `he` and `ar` (public [#525](https://github.com/Sara-Managed-Projects/space-radar/issues/525) to
[#534](https://github.com/Sara-Managed-Projects/space-radar/issues/534)). Every one was drafted by a program from the English and
**no native speaker has read any of them yet**: the table below says so, and until two people have, the page offers a language only to a
visitor who asks for it (see "Review"); there is no language picker yet. Each file has every string of the interface, the cards, the glossary,
the trips' stops that are in `en.js` and the Moments. What is not translated: the 30 trips' longer texts in `registry/tours.yaml`, the spoken
voice, the pages a search engine reads, and the type phrases of the catalogue (a galaxy's "barred spiral galaxy" comes from the data in
English; only French has a table for them). A string that is not translated shows in English rather than as a gap. Writing a language now
is not wasted: the loader reads exactly the file you write.

<!-- translation-status:begin (node scripts/check-translation.mjs --write-doc) -->
| Language | File | Strings present | Changed from English | Review | Shown from the browser’s language |
| --- | --- | --- | --- | --- | --- |
| English | `en.js` | 3 325 (the source) | - | the source | yes |
| العربية (Arabic) | `ar.js` | 3 325 of 3 325 (100 %) | 3 247 (97.6 %) | machine-drafted | no: `?lang=ar` only |
| Deutsch (German) | `de.js` | 3 323 of 3 325 (99.9 %) | 3 176 (95.5 %) | machine-drafted | no: `?lang=de` only |
| Español (Spanish) | `es.js` | 3 325 of 3 325 (100 %) | 3 202 (96.3 %) | machine-drafted | no: `?lang=es` only |
| Français (French) | `fr.js` | 3 321 of 3 325 (99.8 %) | 3 162 (95 %) | machine-drafted | no: `?lang=fr` only |
| עברית (Hebrew) | `he.js` | 3 325 of 3 325 (100 %) | 3 233 (97.2 %) | machine-drafted | no: `?lang=he` only |
| हिन्दी (Hindi) | `hi.js` | 3 325 of 3 325 (100 %) | 3 236 (97.3 %) | machine-drafted | no: `?lang=hi` only |
| Português (Brasil) (Portuguese (Brazil)) | `pt.js` | 3 324 of 3 325 (99.9 %) | 3 194 (96 %) | machine-drafted | no: `?lang=pt` only |
| Русский (Russian) | `ru.js` | 3 325 of 3 325 (100 %) | 3 237 (97.3 %) | machine-drafted | no: `?lang=ru` only |
| Українська (Ukrainian) | `uk.js` | 3 325 of 3 325 (100 %) | 3 236 (97.3 %) | machine-drafted | no: `?lang=uk` only |
| 简体中文 (Chinese (Simplified)) | `zh.js` | 3 325 of 3 325 (100 %) | 3 259 (98 %) | machine-drafted | no: `?lang=zh` only |
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
3. **The trips** (`registry/tours.yaml`): 31 trips, about 11 000 words of titles, blurbs and cards.
   Each stop's words are what the voice reads. Do these after 1 and 2, one trip at a time.
4. **The pages a search engine reads and the press page**: later, from the same text.

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
