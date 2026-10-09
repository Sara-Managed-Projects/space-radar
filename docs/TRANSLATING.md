# Translating Space Radar

You do not need to be a programmer. If you can write good prose in two languages, you can
translate Space Radar. This page says what there is to translate, how to start, how to check your
work, and what is not ready yet. Where a step needs a tool you do not have, say so in your issue and
we will do that step for you.

**Status, honestly.** The site speaks English only today. There is no language loader yet: a
translation file you add will be checked by the tools below but will not be shown on the site until
the loader exists (it is filed as its own issue, linked from the translation epic under
[help wanted](https://github.com/Sara-Managed-Projects/space-radar/labels/help%20wanted)). Writing
the text now is not wasted: the loader reads exactly this file.

## What is translated, in order

1. **The interface and the cards** (`site/js/copy/en.js` and `en.later.js`): about 2 300 strings
   across 100 sections (counted 2026-10-09): buttons, menus, panel names, the words on an object's
   card. This is the first milestone, and it is already useful alone.
2. **The glossary** (`GLOSSARY` in the same file, from `registry/glossary.yaml`): 43 short
   explanations, each written for a curious 14-year-old and read aloud to a 9-year-old.
3. **The trips** (`registry/tours.yaml`): 26 trips, about 10 000 words of titles, blurbs and cards.
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

## Rules that matter

- **Names of worlds, moons, spacecraft and catalogue entries stay as the IAU or agency name**
  (Io, Enceladus, Voyager 1, TRAPPIST-1 b). Translate the words around them.
- **Numbers and units are formatted by code**, not typed: leave slots such as `{name}` as they are. Do not turn "1 234 km" into your own digits by hand.
- **Keep the honesty rule.** A card says whether something is measured, modelled or an artist's
  impression; the translation must keep that sentence and its strength (see
  [CONTRIBUTING.md](../CONTRIBUTING.md#the-honesty-rules)). A translation that makes a model sound
  like a photograph is a bug.
- **Write for the ear**, for the trips: short sentences, plain words. The voice reads the card as it
  is, title then body.
- **Plural, "a/an", "3 minutes ago" and the compass words** are grammar written as code in
  `en.js` (`plural`, `article`, `inWords`, `compassWords`). Languages with other plural rules need
  the loader's design to decide where their rules live. Translate the strings now and write your
  language's rule in the pull request description; do not try to change the code.
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
