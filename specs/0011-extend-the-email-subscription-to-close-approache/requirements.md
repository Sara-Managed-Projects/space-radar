# 0011 — Email subscription: close approaches — requirements

Card: [#377](https://github.com/Sara-Managed-Projects/space-radar/issues/377). Today the email
digest (`notify/`, issue #251) offers two categories, `launches` and `meteor-showers`. This spec
adds a third, `close-approaches`: asteroid and comet close approaches to Earth, from the JPL CNEOS
close-approach snapshot the harvester already writes (`close-approaches.json`, source `jpl-cad`).

## Scope

Same rule as the rest of the digest (`notify/digest.py` docstring): only events that are the same
for every subscriber. No per-location visibility, no "you can see it tonight".

## Requirements

1. **R1 — a third category.** `notify.subscriptions.VALID_CATEGORIES` gains `close-approaches`.
   `POST /subscribe` accepts it alone or with the other two; an unknown category is still dropped
   and an empty list is still a 400.
2. **R2 — existing subscribers are unchanged.** Nobody is opted in silently. A record without
   `close-approaches` in `categories` receives exactly the digest it receives today.
3. **R3 — the data is read, never fetched.** The digest Lambda reads the harvester's
   `close-approaches.json` snapshot from the harvest prefix, the same way it reads
   `launches.json`. The notifier makes no call to `ssd-api.jpl.nasa.gov`.
4. **R4 — a short, honest list.** An approach is mailed when it is within the next
   `APPROACH_WINDOW_DAYS` (default 14) and its nominal distance is at most `APPROACH_MAX_LD`
   (default 5 lunar distances); at most `APPROACH_LIMIT` (default 5) per digest, nearest first.
   Each line names the object (`fullname`, else `des`), the date (UTC, from `cd`), the nominal
   distance in lunar distances and km, and the diameter when CAD gives one.
5. **R5 — no alarm words.** The copy never says "hazard", "threat", "impact" or "danger"; one fixed
   line says these are close approaches, not collisions, and that distances are nominal (JPL CNEOS).
6. **R6 — stale data sends nothing.** If the snapshot is missing, unparseable, or its `fetched_at` is
   older than the source's `freshness_max` (72 h), the close-approach section is omitted for this
   run (other sections still go). "Could not look" is not "none coming".
7. **R7 — never twice.** Each approach is ledgered per subscriber as `approach:<des>:<cd>`; an
   approach already sent is not sent again, as launches and shower-years are not today.
8. **R8 — the signup row offers it.** `site/js/ui/subscribe.js` shows a third checkbox,
   "Close approaches"; the heading and the "tick at least one" line stop saying "two"/"launches
   and showers". Every language file carrying the `subscribe` block gets the new strings
   (en, de, es, fr, pt); `tests/test_check_translation.mjs` passes.
9. **R9 — the digest subject stays one subject.** `Space Radar: what's coming up`, whatever mix of
   sections a subscriber gets; `build_digest` still returns None when every section is empty.

## Acceptance criteria

- A1. Subscribing with `["close-approaches"]` creates a pending record with that category only.
- A2. A confirmed subscriber with only `launches` gets a byte-identical digest before and after.
- A3. With a fixture CAD body holding approaches at 0.8 LD (day 3), 4.9 LD (day 10), 6 LD (day 5)
  and 2 LD (day 20), the digest lists the first two, nearest first, and nothing else.
- A4. Running the digest twice on the same snapshot sends the approach lines once.
- A5. A snapshot whose `fetched_at` is 80 h old yields no close-approach section and no exception;
  a launches section for the same subscriber still goes out.
- A6. The signup form posts `close-approaches` when its box is ticked; posting none still says
  "pick one".
- A7. No string in the close-approach copy matches `/hazard|threat|impact|danger/i`.
- A8. `uv run pytest -q tests/test_notify.py` and the site's `npm test` pass.

## Out of scope

- Per-location visibility, magnitudes or "look here" directions.
- The ESA NEOCC source (`esa-neocc-close`, disabled) — a second source can join later as a merge.
- Any change to the harvester's CAD query or refresh.
