# 0035 — Deep-space baseline captures are wired in CI — requirements

Card: [#1189](https://github.com/Sara-Managed-Projects/space-radar/issues/1189).
Filed by the daily improvement round of 15 Oct 2026. Nobody clicked it. Say that in the PR.

The exit criterion on the card is: a pull request that visibly changes a deep-space render fails
CI against a stored baseline picture. The source named was
[#1174](https://github.com/Sara-Managed-Projects/space-radar/pull/1174), which added the
`deepspace` look probe. That PR's own note says the pictures of `main` are kept in the
**internal** spec 0075, not in this public repository.

## What is true today

Measured in this checkout (`84ae6fb2`) and against a green `rails` job on `main`
(workflow run `41761214425`, Wed 4 Nov 2026 ~02:30 UTC). Times are UTC.

- No reference PNG of a deep-space baseline lives in this repository. A search for baseline /
  golden / deepspace PNGs under the tree finds only the probe source and
  `tests/test_baselines.mjs`. There is nothing here for a pixel diff to compare against.
- [#1342](https://github.com/Sara-Managed-Projects/space-radar/pull/1342) (merged Tue 3 Nov 2026,
  release 1.7.4) added `tests/test_baselines.mjs` and a `rails` step that runs it on every push
  and every pull request (`ci.yml` has no path filter on the workflow). The PR and the issue
  comment already said it does **not** diff pictures.
- On this host, `node tests/test_baselines.mjs` exited 0 and printed:
  `21 deep-space scene groups in 7 blocks, 17 poses, every name resolves, the DS poses of the
  package are all there`. The sample reader self-test inside the file also passed.
- The same step concluded `success` on `main` in run `41761214425` (step name names public
  #1189).
- What the test holds: every block and every pose in `tests/probes/look/deepspace.js` names a
  real scene group; every group sits in some block; the package poses `DS-01`, `DS-02`,
  `DS-05`–`DS-11`, `DS-17`, `DS-18` each still list at least one group; the heroes probe still
  lists worlds; `.github/workflows/look.yml` still points at `tests/probes/look/`;
  `tools/README.md` still has the `deepspace` and `heroes` rows.
- `look.yml` on a pull request runs only the `smoke` probe in Chromium. The `deepspace` capture
  is `workflow_dispatch` (and named in the README). It is not a required status check, and it
  does not compare pixels to a stored file.
- `tools/look-summary.mjs` fails a look job on a logged page error or a probe `fail`. It writes
  scene numbers (p50/p95, draw calls, and so on) into the summary and `scenes.csv`. It does not
  load a reference picture or a reference CSV and refuse a changed render.

Could not look: the pictures kept under internal spec 0075 (outside this public repo), and
whether a Chromium bump on the look runner would move those pixels if they were ever committed
here.

## Requirements

1. **R1 — the wiring guard stays the check for this card.** `tests/test_baselines.mjs` keeps
   holding the deep-space blocks, poses and package DS ids, the heroes list, the look workflow
   path, and the two README rows. The `rails` job keeps the step that runs it. No second walker.
2. **R2 — a broken capture list fails a pull request.** A block or pose that names a missing
   scene group, a group that sits in no block, a dropped package DS pose, or the look workflow
   losing `tests/probes/look/`, must make `node tests/test_baselines.mjs` exit non-zero. The
   sample reader case already in the file stays.
3. **R3 — this card does not store or diff pictures.** No golden PNG, no pixelmatch, no
   committed reference CSV of scene numbers, and no new required look job that compares
   artefacts. The filed exit criterion asked for that; the repository has nowhere to point it,
   and #1342 already named that gap as a decision. Closing this card does not claim pixel
   comparison.
4. **R4 — an empty product diff closes the card.** The implementation turn re-runs the test on
   current `main`, confirms the `rails` step is still there, and closes
   [#1189](https://github.com/Sara-Managed-Projects/space-radar/issues/1189). If R1 still holds,
   it changes nothing under `tests/`, `.github/`, or `tools/`. The close comment states the
   measured group/block/pose counts, the run that last showed the step green on `main`, that
   nobody clicked the card, and that picture comparison stays out (R3).
5. **R5 — a missing guard is restored, not redesigned.** If the file or the `rails` step is
   gone, put back the copy from `e37743a9` (#1342). Do not invent a pixel comparison in that
   repair. Then close #1189.

## Acceptance criteria

- A1. `node tests/test_baselines.mjs` exits 0. On 4 Nov 2026 at `84ae6fb2` that was 21 groups,
  7 blocks, 17 poses.
- A2. `.github/workflows/ci.yml` still has a `rails` step that runs
  `node tests/test_baselines.mjs` (R1).
- A3. A deliberate break (a pose naming a group that does not exist, or the README row for
  `deepspace` removed in a scratch tree) makes the same command exit non-zero (R2).
- A4. If A1 and A2 hold, no file under `tests/`, `.github/`, or `tools/` changes, and #1189 is
  closed with the comment in R4 (R3, R4).
- A5. The close comment does not say CI diffs deep-space pictures. It names the wiring guard
  and the open decision on golden images.

## Out of scope

- Committing baseline PNGs (or any reference render) into this public repository.
- Making `look.yml` run `deepspace` on every pull request, or adding it as a required check.
- A tolerance that survives a Chromium or SwiftShader bump.
- Comparing `scenes.csv` numbers across runs.
- The heroes gallery's own pictures, beyond the existing "still lists its worlds" line.
- Editing `/opt/sara` or any internal sara spec folder from this turn.
