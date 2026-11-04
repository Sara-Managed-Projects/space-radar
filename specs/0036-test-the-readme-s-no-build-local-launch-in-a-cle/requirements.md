# 0036 — The README's no-build launch, in a clean browser — requirements

Card: [#1203](https://github.com/Sara-Managed-Projects/space-radar/issues/1203). The README says a
fresh clone runs with Python's built-in server and nothing else. The exit criterion is that CI
serves an unmodified checkout with that exact command, opens it in a clean browser profile with no
build step, reaches the map, opens an object card and starts a bundled trip, and fails on uncaught
errors. Filed by the daily improvement round of 16 Oct 2026. Nobody clicked it.

## What is true today

Measured in this checkout (`84ae6fb2`), Wed 4 Nov 2026, by reading the tree. No browser was run.

- **The server half is done.** [#1342](https://github.com/Sara-Managed-Projects/space-radar/pull/1342)
  (release 1.7.4) added `tests/test_nobuild_launch.mjs`, run in `ci.yml` on every pull request. It
  starts `python3 -m http.server --directory site` on a free port, follows every import from the
  page (125 modules to the first frame) and requires 200 with a JavaScript type, no bare specifier,
  no built folder. Its own header says: "What it does not do is run the page".
- **No browser runs the README's command and then uses the app.** `screens.yml` has three jobs:
  - `shots` serves `site/` with `python3 -m http.server 8177 --directory site` (the README's
    command) and takes screenshots and the byte and drawn checks. It never opens a card or a trip.
  - `ui` and `trips` serve with `tools/serve.py`, not the README's command. `trips` runs only on a
    dispatch or when the trips change.
- `scripts/check-ui.mjs` and `scripts/check-drawn.mjs` already collect `pageerror`. Nothing
  collects a same-origin 404 or a request to a deployment-only host.
- Share links that already exist: `?at=25544` (the ISS card) and `?trip=moon-landings`
  (`site/js/ui/share.js`, `EMBED_KEYS` in `site/js/ui/embed.js`). Search lists trips as rows with a
  play action (`site/js/ui/searchrows.js`).
- Every browser job pins `mcr.microsoft.com/playwright:v1.49.1-jammy` and `playwright@1.49.1`.

Could not look: which hosts a real boot of `site/` contacts. `harvest/` saves public sources on the
project's own storage "for the site to read first", so a local boot may read the live storage.
Task T1 measures it before anything is refused.

## Requirements

1. **R1 — the README's command, verbatim.** The check starts `python3 -m http.server <port>
   --directory site` from the repository root of the checkout CI cloned. No `tools/serve.py`, no
   build, no `npm` step that writes into `site/`, no generator run first.
2. **R2 — a clean browser.** A fresh Chromium context with no storage state, no service worker
   kept from a previous page (`?sw=0` is not used: a visitor does not type it), default
   permissions.
3. **R3 — the map.** The page reaches `window.__srLayersReady` within 90 s and the canvas is not
   an empty frame (the rule `check-drawn.mjs` already uses).
4. **R4 — a card, by clicking.** Search for "ISS" through the UI, pick the row, and the object
   card opens with the object's name in it.
5. **R5 — a trip, by clicking.** Search for a bundled trip, press its play row, and the trip
   reaches its first stop (the trip state leaves `idle` and the first stop's title is shown).
6. **R6 — what fails it.** Any `pageerror`; any `console.error` not on a reviewed list; any
   same-origin response of 400 or more; any request to a host that is not same-origin and not on
   the reviewed list of hosts a local copy may reach.
7. **R7 — the lists are data.** The allowed console lines and hosts live in one registry file,
   each row with a reason and an issue. A row that matched nothing in the run fails, as
   `ui_probe.known.json` does, so the list cannot outlive what it excuses.
8. **R8 — it runs on every pull request that touches `site/`.** A step in an existing
   `screens.yml` job, not a new workflow and not a dispatch-only job.
9. **R9 — the README stays the source.** The check reads the command from the README's "Run it in
   30 seconds" block and refuses if it changes without the check, so the two cannot drift.

## Acceptance criteria

- **A1.** On `main` the step passes, and its log names the port, the 3 phases (map, card, trip)
  with the time each took, and the off-origin hosts it saw.
- **A2.** A branch that deletes one module the page imports lazily fails the step with the URL and
  404.
- **A3.** A branch that throws in a card's code path fails the step with the error text.
- **A4.** A branch that adds a fetch to a host not in the list fails with the host named.
- **A5.** Changing the README's command to another port or folder fails the step until the check
  agrees.
- **A6.** A list row that matches nothing fails with that row named.

## Out of scope

Firefox and WebKit (`look.yml` covers them on dispatch). Offline running (`docs/RUN_LOCALLY.md`
and the release zip check in `release.yml`). Windows' `py` command. Performance budgets.
