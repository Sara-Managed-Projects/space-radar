# 0022 — The kiosk watchdog restarts a dead picture — tasks

Issue: [#502](https://github.com/Sara-Managed-Projects/space-radar/issues/502). Spec only in this
PR. The test is a later turn.

- [ ] T1. `tests/test_autopilot_holds.mjs`: optional `hash` on `reel()`, default `''` (design).
  Existing cases omit it.
- [ ] T2. One new case in that file, self-contained, section 2 left as it is. Seed
  `#ambient=ah-a,ah-b&pace=8`, lose the context, keep the reload hash, stop the pilot, `read()`
  from that string, start again. Cover A2 and A3 (R2, R3).
- [ ] T3. `.github/workflows/ci.yml`: rename the holds step as in the design. Same `run` (R4).
  Do not add a job. Do not rename the `test_autopilot.mjs` step.
- [ ] T4. Run and report, in the implementation PR:
  `node tests/test_autopilot.mjs`, `node tests/test_autopilot_holds.mjs`,
  `node tests/test_autopilot_trip.mjs`. All three exited 0 on 25 Oct 2026 at `2a9e9aff`
  before this test existed. A1 and A5 are those commands still exiting 0.

## Test list

`tests/test_autopilot_holds.mjs`

1. Existing "lost for good, at pace 8" case, unchanged. One reload, address names the second
   stop, the machine did not advance.
2. New case, "the next page plays that stop" — A2, A3. First `stop` on the second boot is
   `ah-a` stop 2. `resume` is `ah-a:2`. No watchdog line, no reload, on that boot.

`tests/test_autopilot.mjs` and `tests/test_autopilot_trip.mjs` gain no cases (R1, A5).
