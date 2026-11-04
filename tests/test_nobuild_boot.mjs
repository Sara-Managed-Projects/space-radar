// tests/test_nobuild_boot.mjs -- pure rules of the README's no-build browser check (spec 0036).
//
//   node tests/test_nobuild_boot.mjs
//
// The browser walk itself is scripts/check-nobuild-boot.mjs in screens.yml. This holds what node
// can: reading the README command, matching records against the registry, and the stale-row rule.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const { readReadmeCommand, parseServerCommand, loadRegistry, judge, blockedHosts } = await import(
  pathToFileURL(join(ROOT, 'scripts', 'check-nobuild-boot.mjs')).href
);

const README = readFileSync(join(ROOT, 'README.md'), 'utf8');
const REGISTRY_TEXT = readFileSync(join(ROOT, 'registry', 'nobuild-boot.yaml'), 'utf8');

// 1. The README block is read to the documented command.
{
  const cmd = readReadmeCommand(README);
  assert.equal(cmd, 'python3 -m http.server 8177 --directory site');
  assert.deepEqual(parseServerCommand(cmd), { port: 8177, directory: 'site' });
}

// 2. A README with the block removed or a second command in it is refused.
{
  assert.throws(() => readReadmeCommand('# Hi\n\nNo section.\n'), /Run it in 30 seconds/);
  const two = README.replace(
    '```bash\ngit clone https://github.com/Sara-Managed-Projects/space-radar.git\ncd space-radar && python3 -m http.server 8177 --directory site      # then open http://localhost:8177\n```',
    '```bash\npython3 -m http.server 8177 --directory site\npython3 -m http.server 9999 --directory other\n```',
  );
  assert.throws(() => readReadmeCommand(two), /exactly one python3/);
  const gone = README.replace(/## Run it in 30 seconds[\s\S]*?(?=\n## )/, '## Run it in 30 seconds\n\nNothing here.\n\n');
  assert.throws(() => readReadmeCommand(gone), /exactly one fenced|exactly one python3/);
}

const registry = loadRegistry(REGISTRY_TEXT);
assert.ok(registry.hosts.some((h) => h.host === 'celestrak.org'));
assert.ok(blockedHosts(registry).includes('ll.thespacedevs.com'));
assert.ok(!blockedHosts(registry).includes('celestrak.org'), 'the ISS card needs CelesTrak on a clean clone');

const clean = {
  pageerrors: [],
  consoleErrors: [
    'Failed to load resource: the server responded with a status of 404 (File not found)',
    'Failed to load resource: net::ERR_FAILED',
  ],
  sameOrigin: [
    { url: '/data/v1/index.json', status: 404 },
    { url: '/data/v1/gibs-clouds.json', status: 404 },
    { url: '/js/main.js', status: 200 },
  ],
  hosts: ['celestrak.org', 'gibs.earthdata.nasa.gov', 'services.swpc.noaa.gov', 'll.thespacedevs.com', 'www.gdacs.org'],
};

// 3. A record set with only same-origin 200s and listed hosts passes.
{
  const { findings } = judge(clean, registry);
  assert.deepEqual(findings, [], findings.join('\n'));
}

// 4. A same-origin 404 fails, naming the URL.
{
  const { findings } = judge({ ...clean, sameOrigin: [...clean.sameOrigin, { url: '/js/missing.js', status: 404 }] }, registry);
  assert.ok(findings.some((f) => /same-origin 404: \/js\/missing\.js/.test(f)), findings.join('\n'));
}

// 5. An unlisted host fails, naming the host.
{
  const { findings } = judge({ ...clean, hosts: [...clean.hosts, 'evil.example'] }, registry);
  assert.ok(findings.some((f) => f === 'unlisted host: evil.example'), findings.join('\n'));
}

// 6. A pageerror fails with its text; a listed console line passes, an unlisted one fails.
{
  const withPage = judge({ ...clean, pageerrors: ['boom in card'] }, registry);
  assert.ok(withPage.findings.some((f) => f === 'pageerror: boom in card'), withPage.findings.join('\n'));
  const withConsole = judge({ ...clean, consoleErrors: [...clean.consoleErrors, 'unexpected noise'] }, registry);
  assert.ok(withConsole.findings.some((f) => f === 'console.error: unexpected noise'), withConsole.findings.join('\n'));
}

// 7. A list row that matched nothing fails, naming the row.
{
  const missingHost = judge({ ...clean, hosts: clean.hosts.filter((h) => h !== 'www.gdacs.org') }, registry);
  assert.ok(missingHost.findings.some((f) => /stale host row: www\.gdacs\.org/.test(f)), missingHost.findings.join('\n'));
  const missingConsole = judge({ ...clean, consoleErrors: clean.consoleErrors.filter((l) => !/ERR_/.test(l)) }, registry);
  assert.ok(missingConsole.findings.some((f) => /stale console row:.*ERR_/.test(f)), missingConsole.findings.join('\n'));
}

// screens.yml runs the check on every pull request that touches site/, and names the script.
{
  const yml = readFileSync(join(ROOT, '.github/workflows/screens.yml'), 'utf8');
  assert.ok(yml.includes('scripts/check-nobuild-boot.mjs'), 'screens.yml runs the nobuild boot check');
  assert.ok(yml.includes('registry/nobuild-boot.yaml'), 'a change to the registry runs screens.yml');
  assert.ok(/git status --porcelain/.test(yml), 'the step refuses a dirty tree');
}

console.log('ok test_nobuild_boot (README reader, matcher, stale-row rule, screens.yml wiring)');
