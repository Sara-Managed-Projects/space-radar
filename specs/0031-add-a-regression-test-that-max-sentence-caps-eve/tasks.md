# 0031 — Every card sentence stays within 160 characters — tasks

Issue: [#915](https://github.com/Sara-Managed-Projects/space-radar/issues/915). Spec only in this
PR. The test is a later turn.

- [ ] T1. Leave the seven existing sentence cases in `tests/test_refusals.py` as they are (R1).
- [ ] T2. Rewrite the eight exotic `why` lines and `ngc-2419` so each is at most 160 characters.
  Keep a second sentence that corrects the first. `ngc-2419` still says it is not leaving.
  Run `python3 scripts/gen_exotics_js.py` and `python3 scripts/build-dso.py --refresh`. Both
  `--check` runs exit 0 (R3, A3). The PR quotes each old line and the new one.
- [ ] T3. `scripts/check_registry.py`: hold `exotics.yaml` `why` and `dso-hand.yaml` `why` to
  `MAX_SENTENCE` with `>`. The deep-sky length check runs in the same pass as the JSON
  comparison (R2).
- [ ] T4. One loop in `tests/test_refusals.py` with the ten rows in the design. Each lengthens
  the named sentence to 161 characters and requires the file name and `160` in the output
  (R4, A2).
- [ ] T5. The same glossary row, with a `say` of length 160, is accepted (R5, A4).
- [ ] T6. Count `> MAX_SENTENCE` in `scripts/check_registry.py`. The count equals the loop
  length, 10 (R6, A5).
- [ ] T7. `.github/workflows/ci.yml`: rename the `test_refusals.py` step as in the design. Same
  `run` (R7). Do not add a job.
- [ ] T8. Run and report, in the implementation PR: `python3 scripts/check_registry.py`,
  `python3 tests/test_refusals.py`, `python3 scripts/gen_exotics_js.py --check`,
  `python3 scripts/build-dso.py --check`.

## Test list

`tests/test_refusals.py`

1. The seven existing sentence cases, unchanged. Tour body, star `why`, oddity `fact`, `cite`,
   `departure`, site `doing`, glossary `say`.
2. New loop, ten rows, "161 is refused". One per field in the design table. The output names
   the file and contains `160`.
3. New case, "160 is accepted". One glossary `say` of length 160. The checker exits 0.

`.github/workflows/ci.yml` gains no step (R7).
