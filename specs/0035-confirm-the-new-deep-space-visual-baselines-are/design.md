# 0035 — Deep-space baseline captures are wired in CI — design

## What is wrong

The card asked for a live picture comparison. The capture list is already guarded; the pictures
are not.

```
#1174 deepspace probe
    photographs scenes + writes numbers beside them
    baseline pictures kept in internal spec 0075
    (not in this public repo)

look.yml
    pull_request -> smoke only (Chromium)
    workflow_dispatch -> any probe, including deepspace
    look-summary fails on page errors / probe fail
    no reference picture, no pixel diff

#1342 test_baselines.mjs  (rails, every PR)
    blocks/poses -> real scene groups
    every group in a block
    package DS poses still listed
    heroes still lists worlds
    look.yml and tools/README.md still name the captures
    does not open a PNG
```

On Wed 4 Nov 2026, at `84ae6fb2`, the wiring test exited 0 (21 / 7 / 17). The same step was
green on `main` in run `41761214425`. A pixel gate cannot fire: there is no stored image here
to fail against.

## What the next turn does

Confirm the guard, then close. No new comparison engine.

1. On current `main`: `node tests/test_baselines.mjs`. Exit 0 and record the printed
   group / block / pose counts (A1).
2. Read the `rails` job in `.github/workflows/ci.yml`. The step that runs that file must still
   be there (A2). Optionally name the latest green `main` run that shows it.
3. In a scratch copy only: rename one pose target to a name that is not a scene group, or
   delete the `| \`deepspace\` |` row from a temp `tools/README.md` and point the test at it if
   the harness allows — or simply edit the scratch probe. Expect a non-zero exit (A3). Discard
   the scratch. Do not push it.
4. If steps 1–2 still hold: change nothing under `tests/`, `.github/`, or `tools/`. Close #1189
   with the counts, the run id or date, that nobody clicked the card, and that picture
   comparison was not added (R3, R4, A4, A5).
5. If the file or the step is missing: restore from `e37743a9` (#1342). Re-run step 1. Then
   close (R5). Do not add golden images while repairing.

The filed exit criterion stays unmet as written. Closing this card means the **wiring** is
checked on every PR, which is what #1342 shipped and what this repository can hold without a
separate decision to keep reference renders in a public tree.

## Risks

- **Closing looks like the pixel gate shipped.** The close comment must say it did not. A5 is
  that sentence.
- **A green count is not a green list.** Matching "21 groups" after someone swapped two names
  would hide a dead pose. Step 3 breaks a name on purpose; the everyday guard compares names,
  not only counts.
- **`look` on a PR is still smoke.** Someone reading "baselines are checked in CI" might think
  every PR draws deep space. It does not. The rails step reads the probe source; it does not
  boot the page.
