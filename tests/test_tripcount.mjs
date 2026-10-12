// tests/test_tripcount.mjs -- the one anonymous count per trip started (ui/tripcount.js).
//
//   node tests/test_tripcount.mjs
//
//   1. A person's trip asks once for c/t.gif?trip=<id>, with no cookie and no referrer, and only
//      once per page load however many times the trip's state changes or the trip is restarted.
//   2. A second trip is a second request; a refused trip (never past `resolving`) is none.
//   3. A reel (autopilot, the ambient screen) and present=auto ask for nothing.
//   4. A fetch that rejects, throws, or is missing changes nothing and throws nothing.
//   5. The file is in the tree, 43 bytes, a GIF; the page wires it; the Sources sheet says so.
import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createTripCount } from '../site/js/ui/tripcount.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const check = (ok, what) => { if (!ok) problems.push(what); };

// 1 and 2
{
  const asked = [];
  const count = createTripCount({ fetch: (url, init) => { asked.push({ url, init }); return Promise.resolve({ ok: true }); } });
  count.seen({ phase: 'idle', tourId: null });
  count.seen({ phase: 'resolving', tourId: 'moon-landings' });
  check(asked.length === 0, 'nothing is asked for while a trip is still resolving');
  check(count.seen({ phase: 'intro', tourId: 'moon-landings' }) === true, 'the first running phase sends the count');
  for (const phase of ['flight', 'settle', 'dwell', 'paused', 'flight', 'outro', 'idle', 'intro']) count.seen({ phase, tourId: 'moon-landings' });
  check(asked.length === 1, `one request per trip per page load, got ${asked.length}`);
  check(asked[0] && asked[0].url === 'c/t.gif?trip=moon-landings', `the address is c/t.gif?trip=<id>, got ${asked[0] && asked[0].url}`);
  const init = (asked[0] && asked[0].init) || {};
  check(init.credentials === 'omit', 'no cookie is sent (credentials: omit)');
  check(init.referrerPolicy === 'no-referrer', 'no referrer is sent');
  check(init.keepalive === true, 'the request outlives a navigation (keepalive)');
  check(Object.keys(init).sort().join() === 'credentials,keepalive,referrerPolicy', 'nothing else rides on the request');
  count.seen({ phase: 'flight', tourId: 'a b&c' });
  check(asked.length === 2 && asked[1].url === 'c/t.gif?trip=a%20b%26c', 'a second trip is a second request, its id encoded');
  count.seen({ phase: 'resolving', tourId: 'refused' });
  count.seen({ phase: 'idle', tourId: null });
  check(asked.length === 2, 'a trip that is refused is not counted');
  check(count.counted().join() === 'moon-landings,a b&c', 'counted() names what was sent');
}

// 3
{
  const asked = [];
  let auto = true;
  const count = createTripCount({ fetch: (url) => { asked.push(url); return Promise.resolve(); }, automatic: () => auto });
  for (const phase of ['intro', 'flight', 'dwell', 'outro']) count.seen({ phase, tourId: 'grand-tour' });
  check(asked.length === 0, 'a reel or present=auto asks for nothing');
  auto = false;
  count.seen({ phase: 'flight', tourId: 'grand-tour' });
  check(asked.length === 1, 'the same trip taken over by a person is counted once');
}

// 4
{
  let unhandled = 0;
  const onUnhandled = () => { unhandled += 1; };
  process.on('unhandledRejection', onUnhandled);
  const rejecting = createTripCount({ fetch: () => Promise.reject(new Error('offline')) });
  let threw = false;
  try { rejecting.seen({ phase: 'flight', tourId: 'x' }); } catch { threw = true; }
  const throwing = createTripCount({ fetch: () => { throw new Error('blocked'); } });
  try { throwing.seen({ phase: 'flight', tourId: 'x' }); } catch { threw = true; }
  const none = createTripCount({ fetch: null });
  try { none.seen({ phase: 'flight', tourId: 'x' }); none.seen(null); none.seen(undefined); } catch { threw = true; }
  const badAuto = createTripCount({ fetch: () => Promise.resolve(), automatic: () => { throw new Error('no'); } });
  try { badAuto.seen({ phase: 'flight', tourId: 'x' }); } catch { threw = true; }
  check(!threw, 'a failing fetch never throws into the trip');
  await new Promise((r) => setTimeout(r, 10));
  process.off('unhandledRejection', onUnhandled);
  check(unhandled === 0, 'a rejected fetch leaves no unhandled rejection');
}

// 5
{
  const gif = readFileSync(join(ROOT, 'site/c/t.gif'));
  check(statSync(join(ROOT, 'site/c/t.gif')).size === 43, 'site/c/t.gif is 43 bytes');
  check(gif.subarray(0, 6).toString('latin1') === 'GIF89a' && gif[gif.length - 1] === 0x3b, 'site/c/t.gif is a GIF');
  const main = readFileSync(join(ROOT, 'site/js/main.js'), 'utf8');
  check(/createTripCount\(\{[\s\S]{0,200}ctx\.autopilot\.active[\s\S]{0,80}present === 'auto'/.test(main), 'main.js tells the count when a reel or present=auto is driving');
  check(/ctx\.trip\.onChange\(\(\) => tripCount\.seen\(ctx\.trip\.state\)\)/.test(main), 'main.js hands the trip\'s state to the count');
  const copy = readFileSync(join(ROOT, 'site/js/copy/en.later.js'), 'utf8');
  check(/one tiny file when a trip starts/.test(copy) && !/no analytics\./.test(copy), 'the Sources sheet says what is counted');
}

if (problems.length) { console.error('trip count FAILED:\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('trip count ok: one request per trip per page load, none for a reel or present=auto, a failed request changes nothing');
