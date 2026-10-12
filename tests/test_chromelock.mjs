// tests/test_chromelock.mjs -- one headless Chrome on the machine at a time (tools/chromelock.mjs,
// internal #460).
//
//   node tests/test_chromelock.mjs
//
// The lock was written for tools/walk.mjs and had never met a second Chrome. On 2026-10-08 it did
// (a probe held the shared lock through the agents' wrapper, which never touches it, while
// `node tools/chromelock.mjs` waited on it: the PR that added this file has the numbers), and two
// things came out: a live owner was robbed after six untouched minutes, and a walk that gave up
// on the lock left its server running. This holds the rule with real directories and no Chrome.
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, utimesSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { createChromeLock, readLock, staleness, STALE_MS, HARD_MS } = await import(join(ROOT, 'tools/chromelock.mjs'));
const problems = [];
const check = (ok, msg) => { if (!ok) problems.push(msg); };
const dir = mkdtempSync(join(tmpdir(), 'sr-lock-test-'));
const fast = { pollMs: 5, waitMs: 60 };
const held = (name, pid, ageMs = 0) => {
  const path = join(dir, name);
  mkdirSync(path);
  if (pid !== null) writeFileSync(join(path, 'pid'), String(pid));
  if (ageMs) { const then = new Date(Date.now() - ageMs); utimesSync(path, then, then); }
  return path;
};
// A pid that is certainly gone: a child that has already exited.
const gone = spawnSync(process.execPath, ['-e', '0']).pid;

// --- the rule, pure ---------------------------------------------------------------------------------
check(STALE_MS === 6 * 60e3 && HARD_MS === 30 * 60e3, 'six minutes untouched with no owner written; thirty for a live one');
check(staleness(null) === '', 'no lock is not a stale lock');
check(staleness({ pid: 5, alive: false, ageMs: 0 }) !== '', 'an owner that is gone: at once');
check(staleness({ pid: 5, alive: true, ageMs: 0 }) === '' && staleness({ pid: 5, alive: true, ageMs: STALE_MS + 60e3 }) === '' && staleness({ pid: 5, alive: true, ageMs: 9 * 60e3 }) === '', 'A LIVE OWNER IS NOT ROBBED at seven or nine untouched minutes (a nine-minute probe run that never touches the lock)');
check(staleness({ pid: 5, alive: true, ageMs: HARD_MS + 1 }) !== '', 'a live owner past the hard cap is');
check(staleness({ pid: NaN, alive: false, ageMs: 1000 }) === '' && staleness({ pid: NaN, alive: false, ageMs: STALE_MS + 1 }) !== '', 'no pid written: only after six untouched minutes');

// --- with directories -------------------------------------------------------------------------------
{
  const path = join(dir, 'free');
  const a = createChromeLock({ path, ...fast });
  check(await a.take() && a.holding && Number(readFileSync(join(path, 'pid'), 'utf8')) === process.pid && a.tookOver === '', 'a free lock is taken and names its owner');
  const b = createChromeLock({ path, ...fast, pid: 999999 });
  const t = Date.now();
  check(!(await b.take()) && !b.holding && Date.now() - t >= 60 && Number(readFileSync(join(path, 'pid'), 'utf8')) === process.pid, 'a second taker waits its wait out, gets false, and has changed nothing');
  b.release();
  check(existsSync(path), 'releasing a lock one does not hold removes nothing');
  a.release();
  check(!existsSync(path) && !a.holding, 'the owner\'s release removes it');
}
{
  const path = held('live-old', process.pid, 9 * 60e3);
  const b = createChromeLock({ path, ...fast, pid: 999999 });
  check(!(await b.take()) && readLock(path).pid === process.pid, 'a live owner nine untouched minutes in keeps the lock');
}
{
  const path = held('dead', gone);
  const b = createChromeLock({ path, ...fast });
  check(await b.take() && b.tookOver === 'its owner is gone' && readLock(path).pid === process.pid, `a dead owner's lock is taken over at once (${b.tookOver})`);
  b.touch();
  check(readLock(path).ageMs < 5000, 'touch() makes it fresh');
  b.release();
}
{
  const fresh = held('nopid-fresh', null);
  check(!(await createChromeLock({ path: fresh, ...fast }).take()), 'a lock with no pid yet is somebody making it: waited for');
  const old = held('nopid-old', null, STALE_MS + 5000);
  const b = createChromeLock({ path: old, ...fast });
  check(await b.take() && b.tookOver !== '', 'one with no pid for over six minutes is taken over');
  b.release();
}
{
  const path = held('hard', process.pid, HARD_MS + 5000);
  const b = createChromeLock({ path, ...fast });
  check(await b.take() && b.tookOver === 'held past the hard cap', 'and a live owner past thirty minutes');
  b.release();
}
// --- the walk uses it, and stops its servers on every way out ---------------------------------------
{
  const walk = readFileSync(join(ROOT, 'tools/walk.mjs'), 'utf8');
  check(/import \{ createChromeLock \} from '\.\/chromelock\.mjs';/.test(walk) && !/mkdirSync\(LOCK\)/.test(walk), 'tools/walk.mjs takes the lock through tools/chromelock.mjs, not with a copy of the rule');
  check(/process\.on\('exit', \(\) => \{ unlock\(\); for \(const s of servers\) s\.stop\(\); \}\);/.test(walk), 'leaving by any door releases the lock and stops the servers it started');
}
rmSync(dir, { recursive: true, force: true });

if (problems.length) { console.error('chrome lock FAILED (' + problems.length + '):\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('chrome lock ok: taken by mkdir with its owner\'s pid, waited for and left alone while its owner lives (nine untouched minutes included), taken over when the owner is gone, when no owner was written for six minutes, or past thirty; the walk stops its servers on the way out');
