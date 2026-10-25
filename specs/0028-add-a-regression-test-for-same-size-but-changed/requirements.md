# 0028 — A same-size change is still uploaded — requirements

Card: [#576](https://github.com/Sara-Managed-Projects/space-radar/issues/576).
[#566](https://github.com/Sara-Managed-Projects/space-radar/pull/566) made a Brotli copy that is
as big as its file keep the time it was written. `aws s3 sync` skips an object of the same size
unless the local file is newer, and it cannot see `Content-Encoding`. The exit criterion on the
card is a test that changes an asset's content, keeps the compressed size the same, and shows the
deploy would serve the new bytes rather than the copy already stored.

Filed by the daily improvement round of 10 Oct 2026. Nobody clicked it.

## What is true today

Measured in this checkout (`2ffd2ea5`), Sun 25 Oct 2026, Node v24.22.1. `aws s3 sync help` from
aws-cli 2.33.15 on this host. No bucket was synced.

- `scripts/precompress.mjs` writes the compressed copy, then gives it the source file's time only
  when the two lengths differ. A copy of equal length keeps the time of that write.
- `scripts/deploy.sh` syncs the Brotli data tree with no `--size-only`. The comment above that
  sync names the same size-and-time rule, and the 18 star tiles.
- `aws s3 sync help`, upload direction: a local file is copied when its size differs from the
  object, or its last-modified time is newer than the object's, or the object is absent.
  `--size-only` drops the time check. The `--exact-timestamps` paragraph describes the download
  default as ignoring same-sized items unless the local version is newer.
- `site/data/startiles/n8/` has 768 `.bin` files. 18 of them compress with Brotli 11 to their own
  byte count. None of those 18 share a length, so two tiles are not a pair.
- `site/data/startiles/n8/174.bin` is 3932 bytes. Brotli 11 of it is 3932 bytes. Gzip 9 of it is
  3955 bytes. Flipping byte 97 with xor `0xff` changes the file and changes the Brotli bytes, and
  the Brotli length stays 3932. Gzip stays 3955, so that gzip copy still takes the source time.
  `0.bin` beside it is 2762 bytes and its Brotli 11 is 2754, so it is the smaller copy.
- `tests/test_precompress.mjs` already finds one tying tile, checks that copy's time is new,
  checks that `0.bin` keeps the source time, and checks that `deploy.sh` has no `--size-only`.
  It does not change a file. It does not decide what a sync would leave stored.
- CI runs that file as one step (`node tests/test_precompress.mjs`). The step name cites internal
  #514. There is no second job.

Could not look: a bucket. The sync rule above is the help text.

## Requirements

1. **R1 — the existing tie check stays.** The block that uses a real n8 tile, a new time on a
   tying copy, the source time on `0.bin`, and the absence of `--size-only` stays. No second copy
   of that block.
2. **R2 — one content change, same Brotli length, old time on the source.** In
   `tests/test_precompress.mjs`, start from `174.bin`. Flip byte 97 with xor `0xff`. Brotli 11 of
   the flipped file is still 3932 bytes, and those compressed bytes differ from Brotli of the
   original. After the flip, set the source time to `2026-01-02T03:04:05Z`, the same instant the
   stale object carries. A source time of "now" is uploaded even if the equal-length exception is
   deleted, and the case stays green on the bug.
3. **R3 — the bucket already holds the previous copy.** The stale object is Brotli 11 of the
   unflipped tile: 3932 bytes, last modified `2026-01-02T03:04:05Z`. The decision is the upload
   rule from `aws s3 sync help`: copy when the size differs, or the local file is newer, or there
   is no object. Same size and a local time that is not newer: skip. Equal times skip. The test
   applies that decision in process. It does not call `aws`.
4. **R4 — what would be stored decodes to the flipped file.** After `run()`, R3 uploads the
   Brotli copy, and decompressing it yields the flipped file. Deleting the exception in
   `precompress.mjs` (always copying the source time) fails this case: the copy's time is then
   the stale time, the decision skips, and the stored body is still the original.
5. **R5 — an unchanged smaller file is not sent.** `0.bin` from the same directory, source time
   left at that same old instant, remote object the Brotli of that file at that time and that
   size: the decision skips. That is why the other copies still take the source time.
6. **R6 — CI runs the same file.** The step that runs `node tests/test_precompress.mjs` keeps
   that command. Its name also says a same-size content change is uploaded
   ([#576](https://github.com/Sara-Managed-Projects/space-radar/issues/576)). No new job.

## Acceptance criteria

- A1. The existing tie block still passes (R1).
- A2. The new case fails if the flipped Brotli length is not 3932, or the compressed bytes match
  the original (R2).
- A3. The new case fails if the decision does not upload, or the uploaded bytes do not decompress
  to the flipped file (R3, R4).
- A4. The new case fails if `0.bin` would be uploaded (R5).
- A5. `node tests/test_precompress.mjs` exits 0, and the CI step name matches R6.

## Out of scope

- Editing `scripts/precompress.mjs` or `scripts/deploy.sh`. The exception R4 holds is already there.
- A live sync, a bucket, or CloudFront. A full deploy invalidates `/data/*`. The skip #566 fixed
  happens in the sync, before that. This card does not deploy.
- Gzip for this tile. It measured 3955 bytes, so it already takes the source time.
- Re-sending the 18 tiles. #566 left that to the next deploy.
- The planet-face wording that shipped in the same pull request.
