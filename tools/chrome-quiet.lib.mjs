// tools/chrome-quiet.lib.mjs -- is another project's headless Chrome running? (internal #460 item 3)
//
// tools/walk.mjs's one-Chrome lock covers only the Chromes THIS project starts. On 2026-10-08 a headless
// Chrome of another project ran beside a probe, took no lock of ours, and the probe's Chrome did not
// reach its page in four minutes. So before a walk starts a Chrome it also looks at the process list: any
// headless Chrome whose profile directory is not one of ours (`cdp-*` in the temp folder, from
// tools/cdp.mjs) is "foreign", and the walk waits for a quiet machine up to --quiet-wait seconds, then
// goes on and SAYS it measured beside one. Pure functions, so tests/test_chrome_quiet.mjs needs no Chrome.
import { execFileSync } from 'node:child_process';

/** The headless Chromes in `ps -axo pid=,args=` output that this project did not start: [{pid, args}]. */
export function foreignHeadless(psText, selfPid = process.pid) {
  const out = [];
  for (const line of String(psText).split('\n')) {
    const m = /^\s*(\d+)\s+(.*)$/.exec(line);
    if (!m) continue;
    const pid = Number(m[1]);
    const args = m[2];
    if (pid === selfPid || !/--headless\b/.test(args)) continue;
    if (!/(chrome|chromium)/i.test(args.split(/\s--/)[0])) continue;       // the program, not a flag that mentions one
    if (/--type=(renderer|gpu-process|utility|zygote|crashpad-handler)/.test(args)) continue;   // children of a Chrome we already count
    if (/--user-data-dir=\S*[\\/]cdp-[A-Za-z0-9]+/.test(args)) continue;   // tools/cdp.mjs's profile: ours, under the lock
    out.push({ pid, args: args.slice(0, 160) });
  }
  return out;
}

/** `ps` for this machine; an empty string where there is none (the walk then waits for nothing). */
export function psText() {
  try { return execFileSync('ps', ['-axo', 'pid=,args='], { encoding: 'utf8', maxBuffer: 16e6 }); } catch { return ''; }
}

/**
 * Wait until no foreign headless Chrome runs, for at most `waitMs`. Returns the ones still running when it
 * stopped looking ([] = a quiet machine). `ps` and `sleep` are injected for the test.
 */
export async function waitForQuiet(waitMs, { ps = psText, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), stepMs = 5000 } = {}) {
  let waited = 0;
  for (;;) {
    const others = foreignHeadless(ps());
    if (!others.length || waited >= waitMs) return others;
    await sleep(stepMs);
    waited += stepMs;
  }
}
