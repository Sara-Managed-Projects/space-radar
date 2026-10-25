# 0030 — One page for the cited figures — design

## What is wrong

`/sources/` answers "which feeds does the map read?". The H1 says "Where every number comes
from", and the table is `registry/sources.yaml`. A reader who wants the page behind Earth's
6,371 km, or behind the ladder's "2.5 million light-years", does not get it there.

The planet radii from #890–#897 are comments. `check_registry.py` does not read comments, and
the card does not either. The ladder's `distance_source` is a field, and five of the nine
rungs have a URL and a day in that string. Nothing collects either list onto a page.

```
registry/worlds.yaml
    facts.{key} = {source, read, says}     121 today, on 22 worlds
    nine citation comments                 Sun … Uranus, not fields yet

registry/ladder.yaml
    distance + distance_source             9 rungs, 5 with a URL and a day

        citation_rows()
                |
                v
        citations/index.html               two tables
                ^
                |
        about, sources, accuracy           each adds one link
        templates/sitelinks.html           unchanged
```

## What the next turn does

Move the nine comments into `facts`, then build the page from the fields.

1. On each of the nine worlds, add the fact or facts in R2. Copy the URL and the day from
   the comment. Use the `says` sentences in R2, which are the claim the comment already
   makes. Delete the citation comment. Do not delete a ring comment. Neptune stays as it is,
   `facts.seen` only.
2. Add `citation_rows()` in `scripts/seo_pages.py`, next to `sources_rows()`.
   - One world row per fact, in file order, then key order. The id is `world-{world}-{key}`.
     The cells are the world's display name, the fact key, `says`, a link to `source`, and
     `date_words(read)` inside `<time datetime="YYYY-MM-DD">`. For `radius`, the "what was
     read" cell also shows `radius_km`. For `rotation`, it also shows `period_h`.
   - One ladder row per rung, in file order. The id is `ladder-{id}`. The cells are the
     label, `distance`, and the source. When `distance_source` matches an `https://` URL and
     `(read YYYY-MM-DD)`, the source cell is that link and the day cell is `date_words`.
     Otherwise the source cell is the string as stored, with no link, and the day cell is
     "No page and no read date."
3. Add `citations_page()`. H1: "Where each cited figure was read". The lead says the rows are
   the worlds' facts and the ladder's distances, and points at `/sources/` for the feeds.
   Two tables, worlds then ladder. `CollectionPage` JSON-LD, and a share `Spec`, same door
   as `sources_page()`. The share's number is the row count from `citation_rows()`, not a
   second literal. `build_pages()` includes the page. The module docstring names
   `/citations/`.
4. Add the three links in R4. Visible words: "The cited figures". Paths are
   `../citations/index.html` from those pages.
5. In `check_world_look_and_facts`, after the existing fact walk, require `facts.radius` on
   `sun`, `earth`, `moon`, `mercury`, `venus`, `mars`, `jupiter`, `saturn`, `uranus`, and
   `facts.rotation` on the last six. A missing one calls `fail` with the world id and the
   key. Absence is the failure. An empty `facts:` is the failure. The old early return when
   `facts` is missing must not skip this.
6. Extend `tests/test_seo_pages.py` for A2 and A3, and add the refusal in A4.
7. Open the implementation PR with `Closes #914`. Do not deploy.

## Risks

- **The lead can overclaim.** "Every number on the site" would be false. Satellites, stars
  and deep-sky rows stay off this page. The H1 and the lead name the two lists.
- **A comment and a field will drift.** R2 deletes the nine citation comments so the URL
  lives in one place. The ring comments are a different citation and stay.
- **The four thin ladder rows look unfinished.** They are. R3 prints the gap in words. A
  made-up Wikipedia URL would be a worse page.
- **The footer is the wrong door.** Adding a sitelinks item also means the home page's
  generated footer, the no-script list, and `tests/test_access.mjs`. About, Sources and
  Accuracy are already in that footer, and each will link here.
- **Neptune's radius is still a bare number.** 24622.0 has no fact. The page will not show
  a radius row for it. That is the registry, not a dropped row.
