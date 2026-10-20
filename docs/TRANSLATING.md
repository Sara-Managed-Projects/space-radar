# Translating Space Radar

You do not need to be a programmer. If you can write good prose in two languages, you can
translate Space Radar. This page says what there is to translate, how to start, how to check your
work, and what is not ready yet. Where a step needs a tool you do not have, say so in your issue and
we will do that step for you.

**Status, honestly.** The site can now speak another language: `?lang=es` shows Spanish (public
[#524](https://github.com/Sara-Managed-Projects/space-radar/issues/524) and
[#525](https://github.com/Sara-Managed-Projects/space-radar/issues/525)). That Spanish was drafted
by a program from the English and **no native speaker has read it yet**: the table below
says so, and until two people have, the page offers it only to a visitor who asks for it (see
"Review"). The words of the interface, the cards and the glossary are translated; the trips, the
spoken voice and the pages a search engine reads are not yet, and a string that is not translated
shows in English rather than as a gap. Writing a language now is not wasted: the loader reads exactly
the file you write.

<!-- translation-status:begin (node scripts/check-translation.mjs --write-doc) -->
| Language | File | Strings present | Changed from English | Review | Shown from the browser’s language |
| --- | --- | --- | --- | --- | --- |
| English | `en.js` | 2 867 (the source) | - | the source | yes |
| Español (Spanish) | `es.js` | 2 867 of 2 867 (100 %) | 2 758 (96.1 %) | machine-drafted | no: `?lang=es` only |
<!-- translation-status:end -->

## What is translated, in order

1. **The interface and the cards** (`site/js/copy/en.js` and `en.later.js`): about 2 300 strings
   across 100 sections (counted 2026-10-09): buttons, menus, panel names, the words on an object's
   card. This is the first milestone, and it is already useful alone.
2. **The glossary** (`GLOSSARY` in the same file, from `registry/glossary.yaml`): 43 short
   explanations, each written for a curious 14-year-old and read aloud to a 9-year-old.
   Keep each key as it is (`"low Earth orbit"`): the card finds a term by its key, so a translated
   explanation shows on a card whose own text contains that English key; matching terms in your language is
   a separate piece of work.
3. **The trips** (`registry/tours.yaml`): 30 trips, about 11 000 words of titles, blurbs and cards.
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
- **Right-to-left languages** (Hebrew, Arabic) need the layout checked too. Say you can test it.

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
