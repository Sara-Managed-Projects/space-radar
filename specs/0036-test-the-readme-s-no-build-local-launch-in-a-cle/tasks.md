# 0036 — The README's no-build launch, in a clean browser — tasks

Issue: [#1203](https://github.com/Sara-Managed-Projects/space-radar/issues/1203).

- [x] T1. Measure one boot of the README's command in a clean Chromium: every request host, every
  console error, every same-origin status. Paste the table in the implementation PR. It decides
  the first rows of `registry/nobuild-boot.yaml`; a host the page needs only after the first
  visit is not added (R6, R7).
- [x] T2. `tests/test_nobuild_boot.mjs` with the pure rules on fixtures: the README reader, the
  matcher, the stale-row rule. Add its step to `ci.yml` (R7, R9, A5, A6).
- [x] T3. `scripts/check-nobuild-boot.mjs`: spawn the command, clean context, the three phases,
  the records, the comparison, the summary. Add a `data-` hook in the UI only where the UI probe
  has none (R1-R6, A1). No new hook: search options, `#sr-card .sr-card__name` and
  `.sr-tripsheet__start` were enough.
- [x] T4. `registry/nobuild-boot.yaml` with the measured rows, each with `why` and `issue` (R7).
- [x] T5. `screens.yml` `shots`: the unmodified-tree guard and the step; add the script and the
  registry file to `paths:` (R8).
- [x] T6. Prove A2, A3 and A4 on throwaway branches (delete one lazy module; throw in the card;
  fetch an unlisted host) and link the three failing runs in the implementation PR. Do not merge
  them. Closed after proof: A2 [#1359](https://github.com/Sara-Managed-Projects/space-radar/pull/1359)
  [run 41770445210](https://github.com/Sara-Managed-Projects/space-radar/actions/runs/41770445210)
  (`same-origin 404: /js/ui/cards.js`); A3 [#1360](https://github.com/Sara-Managed-Projects/space-radar/pull/1360)
  [run 41770444961](https://github.com/Sara-Managed-Projects/space-radar/actions/runs/41770444961)
  (`pageerror: nobuild-a3 card path`); A4 [#1361](https://github.com/Sara-Managed-Projects/space-radar/pull/1361)
  [run 41770444821](https://github.com/Sara-Managed-Projects/space-radar/actions/runs/41770444821)
  (`unlisted host: evil.example`).
- [x] T7. One line under the README's "Run it locally" section is not needed: the README is the
  promise, the check holds it. Change nothing in the README unless T3 shows the command is wrong.

## Test list

`tests/test_nobuild_boot.mjs` (node, no browser, `ci.yml`)

1. The README block is read to `python3 -m http.server 8177 --directory site`.
2. A README with the block removed or a second command in it is refused.
3. A record set with only same-origin 200s and listed hosts passes.
4. A same-origin 404 fails, naming the URL.
5. An unlisted host fails, naming the host.
6. A `pageerror` fails with its text; a listed console line passes, an unlisted one fails.
7. A list row that matched nothing fails, naming the row.

`scripts/check-nobuild-boot.mjs` (Playwright, `screens.yml` `shots`)

8. Map, card, trip on `main`, each phase timed in the log (A1).
9. The three throwaway branches of T6 fail (A2-A4).
