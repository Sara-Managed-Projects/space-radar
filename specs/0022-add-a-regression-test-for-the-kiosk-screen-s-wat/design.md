# 0022 — The kiosk watchdog restarts a dead picture — design

## What is wrong

The watchdog's crash path is two tests that do not meet.

```
context lost, not restored within 5 s
    -> one reload, hash names the stop that was up     (holds, section 2)
    -> pilot.stop()
    -> (nothing starts again)

a link written by the test, trip + stop
    -> jumpTo that stop, the lap goes on               (stub, section 7h)
```

A wall that loses the picture reloads the same address. The address a person opened already
contains `ambient` and `pace`. `trip.js` then merges `trip` and `stop` and leaves the other keys.
The next load calls `resumeFrom` and `jumpTo`. Section 2 checks the merge. Section 7h checks
`jumpTo` on a link the test typed. The hash stored at reload is what the next page should play,
and no test starts a pilot from that string.

A frozen flight is a different path, and it is already closed. The stub never finishes the
flight, the watchdog calls `next()`, and a later stop plays (section 7c). The real trip lands
an overdue flight itself and the watchdog stays quiet. Leave both of those alone.

## The harness

`reel()` in `tests/test_autopilot_holds.mjs` begins with `location.hash = ''`. Add an optional
`hash` and assign that instead. Callers that omit it still get `''`.

```
function reel(link, { overlay = null, hash = '' } = {}) {
  location.hash = hash;
  ...
  pilot.start(link);
}
```

The crash case passes the kiosk address as both the link and the hash:

```
#ambient=ah-a,ah-b&pace=8
```

`write()` keeps keys it already finds. After the trip has reached its second stop, the hash
should still carry `ambient` and `pace`, plus `trip=ah-a` and `stop=2`.

## The case

One new block in `tests/test_autopilot_holds.mjs`. It does not edit section 2. Section 2 remains
the check that the machine does not advance behind a dead canvas.

1. Start as above. `pass` until `ah-a` is in `dwell` at index 1, with the same bound section 2
   uses at pace 8.
2. Dispatch `sr:webgl` with `lost`. `pass` until `reloads.length > 0`, again as section 2 does.
3. One reload. `what('reload')[0].why === 'context-lost'`. The stored `hash` contains
   `ambient=ah-a,ah-b`, `pace=8`, `trip=ah-a`, `stop=2`. Index is still 1.
4. `done()` on that pilot. It clears the live hash. Keep the string from step 3.
5. `location.hash = stored`. `const link = read()`. `read` is given nothing.
6. `reel(link, { hash: stored })`. `pass` until the first `stop` log exists.
7. `what('start')[0].resume === 'ah-a:2'`. That first `stop` is `{ trip: 'ah-a', n: 2 }`.
   `reloads.length === 0`. `what('watchdog').length === 0`.

Step 7 is the restart. If the second boot plays from stop 1 and merely arrives at stop 2 later,
the first `stop` log is `n: 1` and the case fails. If `resumeFrom` is deleted, `resume` is `''`
and the case fails. If the seeded `ambient` is dropped, `start` does not run a reel and there
is no `stop` log.

`stop=2` has to be digits. `resumeFrom` treats a non-numeric `stop` as the first stop, which
would make a wrong address look like a resume at index 0. The `stop=2` assertion is what
catches that.

## CI

In `.github/workflows/ci.yml`, the step that runs `node tests/test_autopilot_holds.mjs` changes
its name only. The command stays. Suggested name:

```
The reel when the picture is not there: a lost context holds, and if it is not handed back the next page plays that stop (#502)
```

The step that runs `node tests/test_autopilot.mjs` stays worded as it is. The implementation PR
says that step passed, which is R1.

## Risks

- **Pace stripped from the hash.** The second boot would then run at pace 1 and the `pass` bound
  copied from section 2 would give up before stop 2. The `pace=8` assertion fails first, with
  the hash in the message.
- **`done()` clears the hash.** Using `location.hash` after `done()`, or `read(stored)` without
  assigning `location.hash`, reads the wrong address. Step 4 keeps the string. Step 5 assigns it.
- **Section 2's `read(storedHash)`.** That argument is ignored. The new case assigns
  `location.hash`, then calls `read()` with no argument. Section 2 stays as it is.
