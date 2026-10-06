// The regression walk: every flow of the product in a real headless Chrome, at a desktop and at a
// phone size, with a contact sheet of what each step looked like and a JSON of what it measured.
//
//   python3 scripts/minify_site.py --out /tmp/served --tree      # the tree a deploy serves
//   (mirror the saved catalogues into /tmp/served/data/v1: tools/README.md says how)
//   node tools/walk.mjs --dir=/tmp/served                        # both sizes, ~25 min on a laptop
//   node tools/walk.mjs --dir=/tmp/served --phone --only=home,trips
//   node tools/walk.mjs --dir=site --desktop --only=link         # the deep links, from the sources
//
// Writes <out>/desktop/*.png, <out>/phone/*.png, <out>/walk-desktop.json, <out>/walk-phone.json,
// <out>/sheet-desktop-NN.png and <out>/sheet-phone-NN.png (default --out=out/walk, gitignored), prints
// one line per finding, and exits 1 if any step found a dead control, a page error or a failed
// request. LOOK AT THE SHEETS: a black view passes every measurement here.
//
// It serves --dir itself (tools/serve.py) on --port (default 8760; its Chromes take the ports from
// --port + 80 up), and blocks CelesTrak and Launch Library so a walk never spends the per-IP budget
// a real visit needs.
//
// ONE HEADLESS CHROME ON THE MACHINE AT A TIME, NOT ONE PER WALK. Software GL is slow, and two at
// once starve each other into timeouts that read as dead controls. Every Chrome this starts is
// started holding a lock: a directory, made with mkdir (which is atomic), holding the pid of its
// owner. Its place is $SR_CHROME_LOCK, or `space-radar-chrome.lock` in the system's temp folder;
// anything else on the machine that starts a headless Chrome for this project takes the same lock
// the same way (wait while the directory exists; take it over when its pid is gone or it has not
// been touched for six minutes; remove it when done). The holder touches it every 30 s.
//
// EXIT STATUS: 0 nothing measured as broken; 1 findings; 2 a load ran out of time (--timeout,
// seconds a load, default 840) or the lock could not be had in --lock-wait seconds (default 1800).
// A walk that timed out has not passed, whatever else it found. The page half is
// tools/walk.probe.js; the offline step reuses tests/probes/offline-probe.js against a stamped
// copy of --dir with the server stopped.
import { spawn, execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync, cpSync, rmSync, existsSync, readFileSync, statSync, utimesSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };
const has = (n) => process.argv.includes('--' + n);
const DIR = resolve(arg('dir', join(here, '..', 'site')));
const OUT = resolve(arg('out', join(here, '..', 'out', 'walk')));
const PORT = Number(arg('port', '8760'));
const ONLY = arg('only', '').split(',').filter(Boolean);
const SIZES = [
  ...(has('phone') ? [] : [{ name: 'desktop', w: 1440, h: 900, flags: [] }]),
  ...(has('desktop') ? [] : [{ name: 'phone', w: 390, h: 844, flags: ['--mobile', '--dpr=' + arg('dpr', '2')] }]),
];
const BLOCK = '--block=celestrak.org,ll.thespacedevs.com';
// The GPU where there is one to be had headless (a Mac); software where there is not (CI's container).
const GL = '--gl=' + arg('gl', process.platform === 'darwin' ? 'gpu' : 'swiftshader');

// One load per entry: a flow walks from a boot of its own, so one that breaks takes nothing with it.
const LOADS = [
  { flow: 'first', name: 'first-trip', url: '?walk=first&first=trip' },
  { flow: 'first', name: 'first-card', url: '?walk=first&first=card' },
  { flow: 'home', url: '?walk=home' },
  { flow: 'search', url: '?walk=search' },
  { flow: 'tabs', url: '?walk=tabs' },
  { flow: 'cards', url: '?walk=cards' },
  { flow: 'show', url: '?walk=show' },
  { flow: 'share', url: '?walk=share' },
  { flow: 'trips', name: 'trips-old', url: '?walk=trips&walktrip=moon-landings' },
  { flow: 'trips', name: 'trips-new', url: '?walk=trips&walktrip=the-living-earth,life-of-a-star' },
  { flow: 'present', url: '?walk=present#trip=the-living-earth&present=1' },
  { flow: 'link', name: 'link-iss', url: '?walk=link&walkname=iss#at=25544' },
  { flow: 'link', name: 'link-m42-deep', url: '?walk=link&walkname=m42-deep#at=dso-m42&exp=deep' },
  { flow: 'link', name: 'link-event', url: '?walk=link&walkname=event#event=apollo-11.landing' },
  { flow: 'link', name: 'link-trip', url: '?walk=link&walkname=trip#trip=the-constellations' },
  { flow: 'link', name: 'link-embed', url: '?embed=1&at=moon&walk=link&walkname=embed' },
  { flow: 'trips', name: 'trips-street', url: '?walk=trips&walktrip=tonight-from-your-street' },
  // The film camera's own link shape (tools/render-trip.mjs): the trip is in the hash.
  { flow: 'link', name: 'link-render', url: '?render=1&fps=30&walk=link&walkname=render#trip=people-in-space' },
].filter((l) => !ONLY.length || ONLY.includes(l.flow) || ONLY.includes(l.name));
const OFFLINE = !has('no-offline') && (!ONLY.length || ONLY.includes('offline'));

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const TIMEOUT_MS = Number(arg('timeout', '840')) * 1000;
const LOCK = process.env.SR_CHROME_LOCK || join(tmpdir(), 'space-radar-chrome.lock');
const LOCK_WAIT_MS = Number(arg('lock-wait', '1800')) * 1000;
const STALE_MS = 6 * 60e3;
let timedOut = 0;
let holding = false;
const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e.code === 'EPERM'; } };
/** Take the machine's one-Chrome lock (see the head of this file), waiting for whoever has it. */
async function lock() {
  const t0 = Date.now();
  for (;;) {
    try { mkdirSync(LOCK); writeFileSync(join(LOCK, 'pid'), String(process.pid)); holding = true; return; } catch (e) { if (e.code !== 'EEXIST') throw e; }
    let pid = NaN; let age = 0;
    try { pid = Number(readFileSync(join(LOCK, 'pid'), 'utf8')); } catch { /* being made, or being removed */ }
    try { age = Date.now() - statSync(LOCK).mtimeMs; } catch { continue; }
    if ((Number.isFinite(pid) && pid > 0 && !alive(pid)) || age > STALE_MS) { rmSync(LOCK, { recursive: true, force: true }); continue; }
    if (Date.now() - t0 > LOCK_WAIT_MS) { console.error(`WALK: another headless Chrome has held ${LOCK} for ${Math.round((Date.now() - t0) / 1000)} s; giving up`); process.exit(2); }
    await sleep(5000);
  }
}
function unlock() { if (holding) { holding = false; rmSync(LOCK, { recursive: true, force: true }); } }
process.on('exit', unlock);
for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => { unlock(); process.exit(130); });
function serve(dir, port) {
  const p = spawn('python3', [join(here, 'serve.py'), dir, String(port)], { stdio: 'ignore' });
  return { stop: () => { try { p.kill('SIGKILL'); } catch { /* gone */ } } };
}
async function up(port) {
  for (let i = 0; i < 80; i += 1) { try { const r = await fetch(`http://127.0.0.1:${port}/index.html`); if (r.ok) return true; } catch { /* not yet */ } await sleep(150); }
  throw new Error('the server never answered on ' + port);
}
/** One Chrome, one probe; resolves to { value, logs } and never rejects. */
async function chrome(url, probe, flags, ms = TIMEOUT_MS) {
  await lock();
  const touch = setInterval(() => { try { const now = new Date(); utimesSync(LOCK, now, now); } catch { /* gone: the next lock() makes it */ } }, 30e3);
  return new Promise((done) => {
    const p = spawn(process.execPath, [join(here, 'cdp.mjs'), url, probe, ...flags], { env: { ...process.env, CDP_LOGS: '1' } });
    let out = ''; let err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    const timer = setTimeout(() => { timedOut += 1; err += '\nWALK: timed out after ' + ms / 1000 + ' s'; p.kill('SIGKILL'); }, ms);
    p.on('close', () => {
      clearTimeout(timer);
      clearInterval(touch);
      unlock();
      let value = null;
      try { value = JSON.parse(out); } catch { /* the probe threw, or the driver did */ }
      const logs = err.split('\n').filter((l) => /^\[(error|pageerror|assert)\]|PAGE THREW|DRIVER FAILED|WALK:/.test(l)).map((l) => l.slice(0, 300));
      done({ value, logs: [...new Set(logs)], raw: value ? '' : (out + err).slice(-600) });
    });
  });
}

/**
 * Every picture of one size on contact sheets, in walk order, each with its name: twelve to a
 * sheet, so a sheet is a picture a person can read (and one tall sheet of ninety 1440 px shots
 * never came back from the screenshot: three minutes, then nothing).
 */
async function sheets(size, dir) {
  const shots = readdirSync(dir).filter((f) => f.endsWith('.png')).sort();
  const per = size.name === 'phone' ? 6 : 3;
  const rows = size.name === 'phone' ? 2 : 4;
  const tileW = size.name === 'phone' ? 240 : 480;
  const tileH = Math.round(tileW * size.h / size.w);
  const probe = join(dir, '..', 'sheet.probe.js');
  writeFileSync(probe, 'await Promise.all([...document.images].map((i) => (i.complete ? 0 : new Promise((r) => { i.onload = i.onerror = r; })))); return document.images.length;');
  const out = [];
  for (let p = 0; p * per * rows < shots.length; p += 1) {
    const chunk = shots.slice(p * per * rows, (p + 1) * per * rows);
    const html = `<!doctype html><meta charset="utf-8"><style>body{margin:0;background:#111;color:#fd7;font:12px/16px ui-monospace,Menlo,monospace}
figure{float:left;margin:8px 0 0 8px;width:${tileW}px}img{display:block;width:${tileW}px;height:${tileH}px;background:#000}figcaption{height:16px;overflow:hidden;white-space:nowrap}</style>
${chunk.map((f) => `<figure><figcaption>${f.replace(/\.png$/, '').replace(/^\d+-/, '').replace(/__\d+-[a-z]+-/, ' · ')}</figcaption><img src="${pathToFileURL(join(dir, f)).href}"></figure>`).join('')}`;
    const page = join(dir, '..', `sheet-${size.name}-${String(p + 1).padStart(2, '0')}.html`);
    const png = page.replace(/\.html$/, '.png');
    writeFileSync(page, html);
    await chrome(pathToFileURL(page).href, probe, [`--width=${per * (tileW + 8) + 8}`, `--height=${Math.ceil(chunk.length / per) * (tileH + 24) + 8}`, `--shot=${png}`, GL], 2 * 60e3); // no --port: cdp.mjs picks a free-ish one, and a fixed one was once somebody else's
    rmSync(page, { force: true });
    if (existsSync(png)) out.push(png);
  }
  rmSync(probe, { force: true });
  return out;
}

let failed = 0;
mkdirSync(OUT, { recursive: true });
for (const size of SIZES) {
  const shots = join(OUT, size.name);
  if (!ONLY.length) rmSync(shots, { recursive: true, force: true });
  mkdirSync(shots, { recursive: true });
  const server = serve(DIR, PORT);
  const results = [];
  try {
    await up(PORT);
    let n = 0;
    for (const load of LOADS) {
      n += 1;
      const name = load.name || load.flow;
      const sub = join(shots, name);
      rmSync(sub, { recursive: true, force: true }); mkdirSync(sub, { recursive: true });
      const t = Date.now();
      // A new query per load keeps the page out of the HTTP cache's way; the modules are shared.
      const r = await chrome(`http://127.0.0.1:${PORT}/index.html${load.url}`, join(here, 'walk.probe.js'),
        [`--width=${size.w}`, `--height=${size.h}`, ...size.flags, '--net=4g', BLOCK, GL, `--shot-dir=${sub}`, `--port=${PORT + 100 + n}`]);
      // Flatten: <size>/<load>__<step>.png sorts in walk order.
      for (const f of readdirSync(sub)) cpSync(join(sub, f), join(shots, `${String(n).padStart(2, '0')}-${name}__${f}`));
      rmSync(sub, { recursive: true, force: true });
      results.push({ load: name, url: load.url, seconds: Math.round((Date.now() - t) / 1000), logs: r.logs, ...(r.value || { broke: r.raw }) });
      const v = r.value || {};
      const lines = [];
      if (!r.value) lines.push(`BROKE: ${r.raw.replace(/\s+/g, ' ').slice(-240)}`);
      for (const d of v.dead || []) lines.push(`dead: ${d}`);
      for (const s of v.states || []) {
        for (const e of s.errors || []) lines.push(`${s.name}: ${e}`);
        for (const b of s.bad || []) lines.push(`${s.name}: request ${b}`);
        for (const w of s.wide || []) lines.push(`${s.name}: wider than the window: ${w}`);
        if (s.sideways) lines.push(`${s.name}: the page scrolls sideways (${s.sideways} px)`);
      }
      for (const l of r.logs) lines.push(`console: ${l}`);
      failed += lines.length;
      console.log(`[${size.name}] ${name}: ${(v.states || []).length} steps in ${Math.round((Date.now() - t) / 1000)} s${lines.length ? '\n  ' + [...new Set(lines)].join('\n  ') : ', clean'}`);
    }
  } finally { server.stop(); }

  if (OFFLINE) {
    // Offline: a stamped copy (the worker precaches only a stamped build), visited once with the
    // server up and once with it gone, from the same browser profile.
    const copy = join(OUT, 'offline-site'); const profile = join(OUT, `offline-profile-${size.name}`);
    rmSync(copy, { recursive: true, force: true }); rmSync(profile, { recursive: true, force: true });
    cpSync(DIR, copy, { recursive: true });
    try {
      execFileSync('python3', [join(here, '..', 'scripts', 'stamp_sw.py'), '--site', copy], { stdio: 'ignore' });
      const s2 = serve(copy, PORT + 1);
      const U = `http://localhost:${PORT + 1}/?sw=1`;
      const probe = join(here, '..', 'tests', 'probes', 'offline-probe.js');
      const flags = [`--width=${size.w}`, `--height=${size.h}`, ...size.flags, `--profile=${profile}`, '--only-local', '--autoplay', GL];
      let first; let second;
      try { await up(PORT + 1); first = await chrome(U, probe, [...flags, `--port=${PORT + 80}`]); } finally { s2.stop(); }
      await sleep(800);
      second = await chrome(U, probe, [...flags, `--port=${PORT + 81}`, `--shot=${join(shots, '99-offline__second-visit.png')}`]);
      const v = second.value || {};
      const ok = v.server === 'gone' && v.booted && v.trip && Array.isArray(v.trip.reached) && v.trip.reached.length >= 1 && !v.trip.error;
      results.push({ load: 'offline', first: first.value || first.raw, second: second.value || second.raw, logs: second.logs, ok });
      if (!ok) failed += 1;
      console.log(`[${size.name}] offline: ${ok ? 'boots with the server gone and a trip reaches ' + v.trip.reached.length + ' stops' : 'FAILED ' + JSON.stringify(v).slice(0, 300)}`);
    } catch (e) { failed += 1; console.log(`[${size.name}] offline: could not run: ${e.message}`); }
    rmSync(copy, { recursive: true, force: true }); rmSync(profile, { recursive: true, force: true });
  }
  const json = join(OUT, `walk-${size.name}${ONLY.length ? '-' + ONLY.join('+') : ''}.json`);
  writeFileSync(json, JSON.stringify(results, null, 1));
  const pngs = await sheets(size, shots);
  console.log(`[${size.name}] ${json}\n[${size.name}] ${pngs.length ? pngs.length + ' contact sheets: ' + pngs[0].replace(/01\.png$/, '*.png') : 'no pictures'}`);
}
console.log(failed ? `${failed} findings: read them, then read the sheets` : 'nothing measured as broken: now read the sheets');
if (timedOut) console.log(`${timedOut} load(s) ran out of time (--timeout=${TIMEOUT_MS / 1000}): this walk has not passed`);
process.exit(timedOut ? 2 : failed ? 1 : 0);
