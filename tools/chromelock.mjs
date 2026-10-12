// tools/chromelock.mjs -- ONE HEADLESS CHROME ON THE MACHINE AT A TIME (tools/walk.mjs, internal #460).
//
//   import { createChromeLock } from './chromelock.mjs';
//   const lock = createChromeLock({ waitMs: 1800e3 });
//   if (!(await lock.take())) process.exit(2);   // somebody held it for the whole wait
//   ... start Chrome; call lock.touch() every 30 s ...
//   lock.release();
//
// THE LOCK is a directory, made with mkdir (which is atomic), holding a file `pid` with the pid of
// its owner. Its place is $SR_CHROME_LOCK, or `space-radar-chrome.lock` in the system's temp
// folder. Anything on the machine that starts a headless Chrome for this project takes the same
// lock the same way and removes it when done.
//
// WHEN A LOCK IS SOMEBODY ELSE'S TO TAKE (staleness(), pure):
//   - its pid is gone: at once. The owner died without removing it.
//   - its pid cannot be read: once the directory has not been touched for `staleMs` (six minutes).
//     A lock being made has no pid for a moment, and one half removed has none either.
//   - ITS PID IS ALIVE: NOT UNTIL `hardMs` (thirty minutes), however long it has gone untouched.
//     This was "six minutes untouched" for every case until 2026-10-08, when the lock was first
//     exercised against a second Chrome: the shared wrapper the agents run probes through holds the
//     lock for a nine-minute run and never touches it, so from its seventh minute a walk would have
//     taken the lock from a live owner and started a second Chrome beside it, which is the one
//     thing the lock exists to prevent. A live owner that has hung is caught by its own caps (a
//     walk's load is killed at --timeout), and thirty minutes is longer than any of them.
//
// A pid that is alive but is no longer the process that made the lock (the number was reused) is
// read as alive: the wait is then the hard cap, not forever.
import { mkdirSync, writeFileSync, readFileSync, statSync, rmSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const STALE_MS = 6 * 60e3;
export const HARD_MS = 30 * 60e3;
export const defaultLockPath = () => process.env.SR_CHROME_LOCK || join(tmpdir(), 'space-radar-chrome.lock');

const pidAlive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };

/** What is at `path` now: { pid (NaN when unreadable), alive, ageMs } or null when there is no lock. */
export function readLock(path, nowMs = Date.now(), alive = pidAlive) {
  let ageMs;
  try { ageMs = nowMs - statSync(path).mtimeMs; } catch { return null; }
  let pid = NaN;
  try { pid = Number(readFileSync(join(path, 'pid'), 'utf8')); } catch { /* being made, or being removed */ }
  const known = Number.isFinite(pid) && pid > 0;
  return { pid: known ? pid : NaN, alive: known ? alive(pid) : false, ageMs };
}

/** May a lock in this state be taken from its owner? Pure. Returns the reason, or '' for no. */
export function staleness(state, staleMs = STALE_MS, hardMs = HARD_MS) {
  if (!state) return '';
  if (Number.isFinite(state.pid)) {
    if (!state.alive) return 'its owner is gone';
    return state.ageMs > hardMs ? 'held past the hard cap' : '';
  }
  return state.ageMs > staleMs ? 'no owner written and not touched' : '';
}

/**
 * @param {{ path?: string, waitMs?: number, staleMs?: number, hardMs?: number, pollMs?: number,
 *           pid?: number, alive?: (pid: number) => boolean, sleep?: (ms: number) => Promise<void> }} opts
 */
export function createChromeLock(opts = {}) {
  const path = opts.path || defaultLockPath();
  const waitMs = opts.waitMs ?? 1800e3;
  const staleMs = opts.staleMs ?? STALE_MS;
  const hardMs = opts.hardMs ?? HARD_MS;
  const pollMs = opts.pollMs ?? 5000;
  const pid = opts.pid ?? process.pid;
  const alive = opts.alive || pidAlive;
  const sleep = opts.sleep || ((ms) => new Promise((r) => setTimeout(r, ms)));
  let holding = false;
  let waitedMs = 0;
  let tookOver = '';

  /** Take the lock, waiting for whoever has it. False when the wait ran out: nothing was changed. */
  async function take() {
    const t0 = Date.now();
    tookOver = '';
    for (;;) {
      try {
        mkdirSync(path);
        writeFileSync(join(path, 'pid'), String(pid));
        holding = true;
        waitedMs = Date.now() - t0;
        return true;
      } catch (e) { if (e.code !== 'EEXIST') throw e; }
      const why = staleness(readLock(path, Date.now(), alive), staleMs, hardMs);
      if (why) { tookOver = why; rmSync(path, { recursive: true, force: true }); continue; }
      waitedMs = Date.now() - t0;
      if (waitedMs > waitMs) return false;
      await sleep(pollMs);
    }
  }
  function touch() { if (!holding) return; try { const now = new Date(); utimesSync(path, now, now); } catch { /* gone: the next take() makes it */ } }
  function release() { if (holding) { holding = false; rmSync(path, { recursive: true, force: true }); } }

  return { take, touch, release, path, get holding() { return holding; }, get waitedMs() { return waitedMs; }, get tookOver() { return tookOver; } };
}

// `node tools/chromelock.mjs [--wait=20]`: say who holds the lock, wait that long for it, and give
// it straight back. Starts no Chrome. Exit 0 had it, 2 the wait ran out. For checking the lock
// against whatever is running (internal #460).
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const wait = Number((process.argv.find((a) => a.startsWith('--wait=')) || '--wait=20').slice(7)) * 1000;
  const lock = createChromeLock({ waitMs: wait, pollMs: 1000 });
  const before = readLock(lock.path);
  console.log(`lock ${lock.path}: ${before ? `held by pid ${before.pid} (${before.alive ? 'alive' : 'gone'}), untouched for ${Math.round(before.ageMs / 1000)} s` : 'free'}`);
  const got = await lock.take();
  const after = readLock(lock.path);
  console.log(got ? `taken after ${Math.round(lock.waitedMs / 1000)} s${lock.tookOver ? ` (taken over: ${lock.tookOver})` : ''}; released` : `not taken in ${Math.round(lock.waitedMs / 1000)} s: still pid ${after ? after.pid : 'nobody'}, nothing changed`);
  lock.release();
  process.exit(got ? 0 : 2);
}
