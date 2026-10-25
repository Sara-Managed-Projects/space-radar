# 0028 — A same-size change is still uploaded — tasks

Issue: [#576](https://github.com/Sara-Managed-Projects/space-radar/issues/576).

- [x] T1. Leave the existing tie block in `tests/test_precompress.mjs` as it is (R1). It already
  requires a real n8 tile, a new time on that copy, the source time on `0.bin`, and no
  `--size-only` in `scripts/deploy.sh`.
- [x] T2. One new case in that file, self-contained. Flip byte 97 of `174.bin`, keep Brotli 11 at
  3932 bytes with different compressed bytes, put `2026-01-02T03:04:05Z` back on the source,
  and run `precompress` at quality 11 with no cache (R2, design steps 1–5).
- [x] T3. In that case, apply `uploads` from the design. The stale object is Brotli of the
  unflipped tile at that January time. The copy `run` wrote is uploaded and decompresses to the
  flipped file (R3, R4, A2, A3).
- [x] T4. Same decision for `0.bin`: remote is its own Brotli at that time, and it is not
  uploaded (R5, A4).
- [x] T5. `.github/workflows/ci.yml`: rename the `test_precompress.mjs` step as in the design.
  Same `run` (R6). Do not add a job.
- [x] T6. Run `node tests/test_precompress.mjs` and report the exit in the implementation PR
  (A1, A5).

## Test list

`tests/test_precompress.mjs`

1. Existing tie block, unchanged. A real n8 tile that compresses to its own size gets a new
   time. `0.bin` keeps the file's time. `deploy.sh` has no `--size-only`.
2. New case, "a same-size change is uploaded". Flipped `174.bin`, source time held in January,
   stale object the previous Brotli. The decision uploads, and the stored bytes decompress to
   the flipped file. `0.bin` is skipped.

`.github/workflows/ci.yml` gains no step (R6).
