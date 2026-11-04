# 0035 — Deep-space baseline captures are wired in CI — tasks

Issue: [#1189](https://github.com/Sara-Managed-Projects/space-radar/issues/1189). Spec only in this
PR. The wiring guard already landed in [#1342](https://github.com/Sara-Managed-Projects/space-radar/pull/1342).
The later turn re-checks it and closes the issue. Nobody clicked the card; say that in the close.

- [ ] T1. From current `main`: `node tests/test_baselines.mjs` (A1). On Wed 4 Nov 2026, at
  `84ae6fb2`, it exited 0 with 21 deep-space scene groups, 7 blocks, 17 poses.
- [ ] T2. Confirm `.github/workflows/ci.yml`'s `rails` job still runs
  `node tests/test_baselines.mjs` (A2, R1). On that same day, run `41761214425` on `main` had
  that step green.
- [ ] T3. In a scratch tree only: break one pose or block name (or drop the README `deepspace`
  row) and show the command exits non-zero (A3, R2). Discard the scratch; do not commit it.
- [ ] T4. If T1 and T2 still hold: change nothing under `tests/`, `.github/`, or `tools/`. Close
  #1189. The comment has the counts, the green run (or a fresh one), that nobody clicked, and
  that CI does not diff deep-space pictures (R3, R4, A4, A5).
- [ ] T5. If the file or the `rails` step is gone: restore from `e37743a9` (#1342). Re-run T1.
  Do not add golden images. Then close #1189 (R5).

## Test list

No new test. The guard is already:

`tests/test_baselines.mjs` (rails job in `.github/workflows/ci.yml`)

1. Sample reader finds groups, blocks and poses.
2. Every deep-space block and pose name resolves to a scene group.
3. Every scene group sits in a block.
4. Package poses DS-01, DS-02, DS-05–DS-11, DS-17, DS-18 each still list a group.
5. Heroes probe still lists worlds; look workflow and `tools/README.md` still name both captures.
