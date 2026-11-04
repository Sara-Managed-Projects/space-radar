// The README's no-build launch, in a clean browser (public #1203, spec 0036).
//
//   node scripts/check-nobuild-boot.mjs                         # spawn the README's command, walk
//   node scripts/check-nobuild-boot.mjs --base=http://127.0.0.1:8177   # against a server already up
//   node scripts/check-nobuild-boot.mjs --port=8765              # force the spawned server's port
//
// Reads the command from the README's "Run it in 30 seconds" block (R9), starts it from the repo
// root on a free port (R1), opens a fresh Chromium context with no storage (R2), reaches the map
// (R3), opens the ISS card by searching and clicking (R4), starts a bundled trip the same way (R5),
// and fails on pageerror, unlisted console.error, same-origin 4xx/5xx (except reviewed data/v1
// probes), and unlisted off-origin hosts (R6). The lists live in registry/nobuild-boot.yaml (R7).
//
// CI runs it in the `shots` job of .github/workflows/screens.yml. Pure rules are tested in
// tests/test_nobuild_boot.mjs without a browser.
import { spawn } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { createServer } from 'node:net';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const arg = (n, d) => { const h = process.argv.find((a) => a.startsWith('--' + n + '=')); return h ? h.slice(n.length + 3) : d; };

/** The python3 -m http.server line from the README's "Run it in 30 seconds" block. */
export function readReadmeCommand(md) {
  const section = /## Run it in 30 seconds\r?\n([\s\S]*?)(?=\r?\n## |\r?\n*$)/.exec(md);
  if (!section) throw new Error('README has no "Run it in 30 seconds" section');
  const blocks = [...section[1].matchAll(/```(?:bash|sh)?\r?\n([\s\S]*?)```/g)].map((m) => m[1]);
  if (blocks.length !== 1) {
    throw new Error(`README "Run it in 30 seconds" must have exactly one fenced command block, found ${blocks.length}`);
  }
  const lines = blocks[0].split(/\r?\n/).map((l) => l.replace(/\s+#.*$/, '').trim()).filter(Boolean);
  const cmds = [];
  for (const line of lines) {
    const m = /(?:^|&&\s*)(python3\s+-m\s+http\.server\b.*)$/.exec(line);
    if (m) cmds.push(m[1].trim());
  }
  if (cmds.length !== 1) {
    throw new Error(`README "Run it in 30 seconds" must name exactly one python3 -m http.server command, found ${cmds.length}`);
  }
  return cmds[0];
}

/** Port and --directory from a `python3 -m http.server …` command string. */
export function parseServerCommand(cmd) {
  const parts = cmd.trim().split(/\s+/);
  if (parts[0] !== 'python3' || parts[1] !== '-m' || parts[2] !== 'http.server') {
    throw new Error(`not the README's server command: ${cmd}`);
  }
  let port = null;
  let directory = null;
  for (let i = 3; i < parts.length; i += 1) {
    if (parts[i] === '--directory') { directory = parts[++i]; continue; }
    if (parts[i] === '--bind') { i += 1; continue; }
    if (/^\d+$/.test(parts[i]) && port === null) { port = Number(parts[i]); continue; }
  }
  if (!directory) throw new Error(`README server command names no --directory: ${cmd}`);
  return { port, directory };
}

/** A tiny reader for registry/nobuild-boot.yaml's fixed shape (no YAML library in node). */
export function loadRegistry(text) {
  const hosts = [];
  const consoleRows = [];
  const sameOriginOk = [];
  let section = null;
  let cur = null;
  const flush = () => { if (!cur) return; if (section === 'hosts') hosts.push(cur); else if (section === 'console') consoleRows.push(cur); else if (section === 'same_origin_ok') sameOriginOk.push(cur); cur = null; };
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\s+#.*$/, '');
    if (!line.trim()) continue;
    if (/^hosts:\s*$/.test(line)) { flush(); section = 'hosts'; continue; }
    if (/^console:\s*$/.test(line)) { flush(); section = 'console'; continue; }
    if (/^same_origin_ok:\s*$/.test(line)) { flush(); section = 'same_origin_ok'; continue; }
    if (line.startsWith('#')) continue;
    const item = /^  - (host|match|path):\s*(.+?)\s*$/.exec(line);
    if (item) {
      flush();
      cur = { [item[1]]: stripQuotes(item[2]) };
      continue;
    }
    const field = /^    (why|issue|block|status):\s*(.+?)\s*$/.exec(line);
    if (field && cur) {
      if (field[1] === 'block') cur.block = /^(true|yes)$/i.test(field[2]);
      else if (field[1] === 'status') cur.status = Number(field[2]);
      else cur[field[1]] = stripQuotes(field[2]);
      continue;
    }
  }
  flush();
  return { hosts, console: consoleRows, same_origin_ok: sameOriginOk };
}

function stripQuotes(s) {
  const t = String(s).trim();
  if ((t.startsWith('"') && t.endsWith('"')) || (t.startsWith("'") && t.endsWith("'"))) return t.slice(1, -1);
  return t;
}

/**
 * Compare a run's records with the registry. Returns { findings, used }.
 * A finding is a string; used tracks which registry rows matched (for the stale-row rule).
 */
export function judge(records, registry) {
  const findings = [];
  const used = { hosts: new Set(), console: new Set(), same_origin_ok: new Set() };
  const hostOf = (name) => registry.hosts.find((h) => name === h.host || name.endsWith('.' + h.host));

  for (const err of records.pageerrors || []) findings.push(`pageerror: ${err}`);

  for (const line of records.consoleErrors || []) {
    const row = (registry.console || []).find((r) => new RegExp(r.match).test(line));
    if (row) used.console.add(row);
    else findings.push(`console.error: ${line}`);
  }

  for (const r of records.sameOrigin || []) {
    if (!(r.status >= 400)) continue;
    let path = r.url;
    try { path = new URL(r.url).pathname; } catch { /* keep */ }
    const row = (registry.same_origin_ok || []).find((ok) => path.startsWith(ok.path) && r.status === ok.status);
    if (row) used.same_origin_ok.add(row);
    else findings.push(`same-origin ${r.status}: ${r.url}`);
  }

  for (const host of records.hosts || []) {
    const row = hostOf(host);
    if (row) used.hosts.add(row);
    else findings.push(`unlisted host: ${host}`);
  }

  for (const row of registry.hosts || []) {
    if (!used.hosts.has(row)) findings.push(`stale host row: ${row.host} (${row.issue}) matched nothing`);
  }
  for (const row of registry.console || []) {
    if (!used.console.has(row)) findings.push(`stale console row: /${row.match}/ (${row.issue}) matched nothing`);
  }
  for (const row of registry.same_origin_ok || []) {
    if (!used.same_origin_ok.has(row)) findings.push(`stale same-origin row: ${row.status} ${row.path} (${row.issue}) matched nothing`);
  }
  return { findings, used };
}

/** Hosts the check refuses by route (block: true). */
export function blockedHosts(registry) {
  return (registry.hosts || []).filter((h) => h.block).map((h) => h.host);
}

async function freePort() {
  return new Promise((resolve) => {
    const s = createServer();
    s.listen(0, '127.0.0.1', () => { const p = s.address().port; s.close(() => resolve(p)); });
  });
}

async function waitForServer(base, ms = 60_000) {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    try {
      const r = await fetch(base + '/');
      if (r.status === 200) return;
    } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`server at ${base} never answered`);
}

async function worldDrawnPct(page) {
  return page.evaluate(() => {
    const ctx = window.spaceRadar;
    if (!(ctx && ctx.renderer && ctx.worlds && ctx.stage)) return null;
    const r = ctx.renderer;
    const gl = r.getContext();
    const w = gl.drawingBufferWidth;
    const h = gl.drawingBufferHeight;
    const buf = () => {
      r.render(ctx.scene, ctx.camera);
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      return px;
    };
    const world = ctx.worlds.meshFor(ctx.stage.worldId);
    if (!world) return null;
    const on = buf();
    const was = world.visible;
    world.visible = false;
    const off = buf();
    world.visible = was;
    let differ = 0;
    for (let i = 0; i < on.length; i += 4) {
      if (Math.abs(on[i] - off[i]) + Math.abs(on[i + 1] - off[i + 1]) + Math.abs(on[i + 2] - off[i + 2]) > 12) differ += 1;
    }
    return +((100 * differ) / (w * h)).toFixed(3);
  });
}

async function typeSearch(page, text) {
  const input = page.locator('.sr-search__input').first();
  await input.click({ timeout: 15_000 });
  await input.fill('');
  await input.fill(text);
  await page.waitForSelector('.sr-search__option', { timeout: 30_000 });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const registry = loadRegistry(readFileSync(join(ROOT, 'registry/nobuild-boot.yaml'), 'utf8'));
  const readmeCmd = readReadmeCommand(readFileSync(join(ROOT, 'README.md'), 'utf8'));
  const parsed = parseServerCommand(readmeCmd);
  const baseArg = arg('base', '');
  const portArg = arg('port', '');
  let server = null;
  let base = baseArg;
  let port = null;

  if (!base) {
    port = portArg ? Number(portArg) : await freePort();
    const args = ['-m', 'http.server', String(port), '--directory', parsed.directory, '--bind', '127.0.0.1'];
    server = spawn('python3', args, { cwd: ROOT, stdio: 'ignore' });
    const stop = () => { try { server.kill('SIGKILL'); } catch { /* gone */ } };
    process.on('exit', stop);
    process.on('SIGINT', () => { stop(); process.exit(130); });
    base = `http://127.0.0.1:${port}`;
    await waitForServer(base);
  } else {
    try { port = Number(new URL(base).port) || null; } catch { port = null; }
  }

  const { chromium } = await import('playwright');
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  for (const host of blockedHosts(registry)) {
    await context.route((url) => url.hostname === host || url.hostname.endsWith('.' + host), (route) => route.abort());
  }
  const page = await context.newPage();
  const records = { pageerrors: [], consoleErrors: [], sameOrigin: [], hosts: [] };
  const hostSeen = new Set();
  const origin = (() => { try { return new URL(base).origin; } catch { return ''; } })();

  page.on('pageerror', (e) => records.pageerrors.push(e.message));
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    // CelesTrak's two-hour window answers 403 for this IP; that is the publisher, not the page.
    if (/status of 403/.test(text)) return;
    records.consoleErrors.push(text);
  });
  page.on('request', (req) => {
    try {
      const u = new URL(req.url());
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return;
      if (u.origin === origin) return;
      if (!hostSeen.has(u.hostname)) { hostSeen.add(u.hostname); records.hosts.push(u.hostname); }
    } catch { /* ignore */ }
  });
  page.on('response', (res) => {
    try {
      const u = new URL(res.url());
      if (u.origin === origin && res.status() >= 400) records.sameOrigin.push({ url: u.pathname, status: res.status() });
    } catch { /* ignore */ }
  });

  const phases = [];
  const tAll = Date.now();
  try {
    // --- map ---
    const t0 = Date.now();
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.waitForFunction(() => window.__srLayersReady === true, null, { timeout: 90_000 });
    await page.waitForSelector('#sr-side', { state: 'attached', timeout: 30_000 });
    const pct = await worldDrawnPct(page);
    if (!(pct >= 5)) throw new Error(`the map is an empty frame: stage world covers ${pct} % (floor 5)`);
    phases.push({ name: 'map', ms: Date.now() - t0, detail: `drawn ${pct} %` });

    // --- card ---
    const t1 = Date.now();
    await typeSearch(page, 'ISS');
    // The station row, not the trip about people aboard.
    const cardOpt = page.locator('.sr-search__option:not([data-extra])').first();
    await cardOpt.waitFor({ timeout: 30_000 });
    await cardOpt.click();
    await page.waitForSelector('#sr-card .sr-card__name', { timeout: 60_000 });
    const cardName = (await page.locator('#sr-card .sr-card__name').first().textContent()).trim();
    if (!/ISS|International Space Station/i.test(cardName)) {
      throw new Error(`ISS card did not open with the station's name (got "${cardName}")`);
    }
    phases.push({ name: 'card', ms: Date.now() - t1, detail: cardName });

    // --- trip ---
    const t2 = Date.now();
    await page.evaluate(() => {
      const c = window.spaceRadar;
      if (c.trip && c.trip.state && c.trip.state.phase !== 'idle') c.trip.stop();
      if (c.deselect) c.deselect();
      if (c.shell) {
        while (c.shell.view() !== 'home') {
          const was = c.shell.view();
          c.shell.back();
          if (c.shell.view() === was) break;
        }
      }
    });
    await typeSearch(page, 'Moon landings');
    const tripOpt = page.locator('.sr-search__option[data-extra="trip"]').first();
    await tripOpt.waitFor({ timeout: 30_000 });
    await tripOpt.click();
    await page.waitForSelector('.sr-tripsheet__start', { timeout: 30_000 });
    await page.click('.sr-tripsheet__start');
    await page.waitForFunction(() => {
      const t = window.spaceRadar && window.spaceRadar.trip && window.spaceRadar.trip.state;
      return t && t.phase && t.phase !== 'idle' && t.phase !== 'intro' && (t.stopTitle || ['dwell', 'settle', 'held', 'flight', 'veil'].includes(t.phase));
    }, null, { timeout: 90_000 });
    const trip = await page.evaluate(() => {
      const t = window.spaceRadar.trip.state;
      return { phase: t.phase, stopTitle: t.stopTitle };
    });
    if (!trip.stopTitle) throw new Error(`trip left idle (${trip.phase}) but the first stop's title was not shown`);
    phases.push({ name: 'trip', ms: Date.now() - t2, detail: `${trip.phase}: ${trip.stopTitle}` });
  } catch (e) {
    console.error(`::error::nobuild boot failed: ${e.message}`);
    await browser.close();
    if (server) try { server.kill('SIGKILL'); } catch { /* */ }
    process.exit(1);
  }

  await browser.close();
  if (server) try { server.kill('SIGKILL'); } catch { /* */ }

  const { findings } = judge(records, registry);
  console.log(`nobuild boot on port ${port ?? '?'}: ${phases.map((p) => `${p.name} ${p.ms} ms (${p.detail})`).join('; ')}; total ${Date.now() - tAll} ms`);
  console.log(`off-origin hosts: ${records.hosts.length ? records.hosts.join(', ') : '(none)'}`);
  for (const f of findings) console.error(`::error::${f}`);
  if (findings.length) {
    console.error(`nobuild boot FAILED: ${findings.length} finding(s)`);
    process.exit(1);
  }
  console.log('nobuild boot ok: map, ISS card and a trip on the README\'s server, no unlisted host or error');
}
