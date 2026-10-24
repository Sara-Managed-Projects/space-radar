# 0011 — Email subscription: close approaches — design

## Data path

```
harvester (jpl-cad, 24 h) -> s3://<bucket>/<harvest prefix>/close-approaches.json
                                   |  envelope: {fetched_at, valid_until, body: CAD verbatim}
notify digest Lambda --------------+  reads it next to launches.json (no new fetch, no new IAM:
                                      the Lambda already reads the harvest prefix)
```

CAD's body is columnar: `{"fields": [...], "data": [[...], ...]}`. `harvest/parsers/jpl_cad.py`
already guarantees `des`, `cd`, `dist`, `v_rel` are in `fields`; `fullname` and `diameter` are
present because the query asks for them, but the digest treats both as optional.

## Code changes

### `notify/digest.py`

- `APPROACH_WINDOW_DAYS = 14`, `APPROACH_MAX_LD = 5.0`, `APPROACH_LIMIT = 5`,
  `APPROACH_FRESHNESS_MAX_H = 72` — module constants beside the existing `limit=5` default for
  launches (the notifier has no registry of its own; a constant next to its peers is this
  package's convention). `LD_KM = 384_400`; `dist` is in au (`AU_KM = 149_597_870.7`).
- `next_approaches(snapshot: dict, now) -> list[dict] | None`:
  - None when the snapshot is missing/unparseable or `now - fetched_at > 72 h` (R6). None means
    "could not look"; `[]` means "looked, nothing qualifies".
  - zips `fields` with each row, parses `cd` (`"2026-Nov-03 14:22"`, UTC) and `dist` (au),
    keeps rows inside `[now, now + 14 d]` with `dist_ld <= 5`, sorts by `dist_ld`, cuts to 5.
  - each item: `{des, name, when (ISO UTC), dist_ld (1 dp), dist_km (rounded to 1 000),
    diameter_m | None}`. Rows that do not parse are skipped, not fatal.
- `ledger_key_approach(a) -> f"approach:{a['des']}:{a['when']}"` (R7).
- `build_digest(categories, launches, showers, approaches=())`: a third block
  `"Close approaches (nominal, JPL CNEOS):"`, one line per item, then the fixed honesty line (R5).
  Defaulted argument, so every existing caller and test is untouched (R2, R9).

### `notify/subscriptions.py`

`VALID_CATEGORIES = ("launches", "meteor-showers", "close-approaches")`. Record shape unchanged.

### `notify/lambda_handler.py`

`handler_digest` reads `CLOSE_APPROACHES_SOURCE_KEY = "close-approaches.json"` from
`harvest_store`, calls `next_approaches` once per run, and per subscriber applies `unsent` +
ledger exactly as launches do. When `next_approaches` returns None the run's return value gains
`"approaches": "could not look"` so the CloudWatch line says so instead of a quiet zero.
`/subscribe` docstring lists the new category.

### Site

- `site/js/ui/subscribe.js`: `subscribePayload(email, wantLaunches, wantShowers, wantApproaches)`;
  a third `check(T.approachesLabel)` row. The form stays one column at 320 px.
- Copy (`en.later.js` and de/es/fr/pt): `approachesLabel: 'Close approaches'`;
  `heading: 'Email me what\'s coming up'`; `pickOne: 'Tick at least one.'`. The translations are
  written by the implementer, not machine-filled silently; `check_translation` keeps them honest.

## Email shape (example)

```
Close approaches (nominal, JPL CNEOS):
  - (2026 UA3): 2026-11-03 14:22 UTC, 0.8 LD (310,000 km), about 20 m across
These pass by; none is on a collision course. Distances are nominal from JPL CNEOS.
```

The line "none is on a collision course" is only true for the rows CAD returns (CAD lists
approaches, not impacts); the implementer keeps the line generic if review finds it overclaims —
the alternative wording is "These are close passes, not collisions."

## Risks

- **CAD time format.** `cd` is `YYYY-Mon-DD HH:MM`; a parse failure skips the row, a test pins
  the format with a fixture captured from the live snapshot.
- **Empty windows.** Some fortnights have nothing under 5 LD; then the section is absent, which is
  correct. The ledger keeps us from re-sending a long-announced approach every day.
- **Lambda size.** No new dependency; pure stdlib.
