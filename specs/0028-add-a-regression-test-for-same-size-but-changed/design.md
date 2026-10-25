# 0028 — A same-size change is still uploaded — design

## What is wrong

The check that shipped in #566 proves a tying copy gets a new time. It never changes the file,
and it never asks what sync would store.

```
source bytes, time T
    packed length == source length
        -> copy keeps the write time (now)          precompress.mjs
    packed length != source length
        -> copy takes time T

aws s3 sync, no --size-only
    size differs, or local time is newer, or no object   -> upload
    same size, local time not newer                       -> skip
```

`174.bin` is the fixture. 3932 bytes, Brotli 11 also 3932, and a one-byte flip stays 3932 while
the compressed bytes change. Gzip 9 of the same file is 3955, so only the Brotli copy is on the
exception.

A test that flips the byte and leaves the source time at "now" passes with the exception deleted.
Sync would see a newer source time and upload anyway. The case has to put the new bytes down and
then put the old time back, so the only thing that makes the copy newer is the exception.

## The case

One new block in `tests/test_precompress.mjs`, after the existing tie block. That block stays.

1. Copy `site/data/startiles/n8/174.bin` into a temp tree at `data/startiles/n8/174.bin`.
   Copy `0.bin` beside it.
2. Remember Brotli 11 of the original `174.bin`. That buffer is the stale object.
3. Flip byte 97 of the temp `174.bin` (`byte ^= 0xff`). Brotli 11 of the result is still 3932
   bytes and is not the buffer from step 2. If either check fails, stop. Do not search for
   another offset. The numbers were measured on Node v24.22.1; a different zlib that misses the
   tie should fail the test.
4. Set both temp files' times to `2026-01-02T03:04:05Z` after the flip.
5. `run({ from, dirs: ['data'], out, quality: 11, cache: null })`, the same shape the existing
   block uses.
6. Decide with the help text, in the test, not via `aws`:

```
function uploads(local, remote) {
  if (!remote) return true;
  if (local.size !== remote.size) return true;
  return local.mtimeMs > remote.mtimeMs;
}
```

7. Remote for `174.bin`: size 3932, mtime that January instant, body the step-2 buffer.
   `uploads` is true. The local file is the Brotli copy `run` wrote. Decompressing it yields the
   flipped file.
8. Remote for `0.bin`: size 2754, body Brotli 11 of that file (the file is 2762 bytes), mtime
   the same January instant. `uploads` is false.

Step 7 is the regression. With the exception removed, step 5 stamps the January time onto the
tying copy, step 7 skips, and the body left stored is step 2.

`0.bin` is the control. Its Brotli is smaller than the file (the existing block already requires
a tying tile and treats `0.bin` as the smaller one; keep that). It must not be uploaded just
because the tying file was.

## CI

In `.github/workflows/ci.yml`, the step that runs `node tests/test_precompress.mjs` changes its
name only. The command stays. Suggested name:

```
stored at Brotli 11: one rule in deploy.sh, verify-deploy.sh and the edge function; copies decode byte for byte; a same-size content change is still uploaded (internal #514, #576)
```

## Risks

- **A newer source time hides the bug.** Step 4 is after the flip. `writeFile` and `cp` both
  stamp "now". Putting the old time on first and writing the byte after would undo it.
- **Equal times skip.** The help says newer, not newer-or-equal. `mtimeMs > remote` is the
  comparison. `>=` would upload the unchanged `0.bin` when the clock rounds to the same second.
- **The January instant is far from "now".** A one-second filesystem is enough. The existing
  "within 60 s of `Date.now`" check can sit next to this; the new case compares against January,
  so it does not depend on that window.
- **The help is not a sync.** This was read from `aws s3 sync help` on aws-cli 2.33.15. Nothing
  was uploaded. If a later CLI skips a newer same-sized file, R3's predicate is the thing to
  change, and this case is how that shows up.
